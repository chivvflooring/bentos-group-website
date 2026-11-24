import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Webhook} from 'svix';
import {handler as quote} from '../netlify/lib/quote-intake.mjs';
import {handler as punch} from '../netlify/lib/punch-list-intake.mjs';
import {handler as events} from '../netlify/functions/resend-events.mjs';
import {handler as operations} from '../netlify/functions/lead-operations.mjs';
import {recordLead, updateLead} from '../netlify/lib/lead-ledger.mjs';
import quoteRoute, {config as quoteConfig} from '../netlify/functions/quote.mjs';
import punchRoute, {config as punchConfig} from '../netlify/functions/punch-list.mjs';

const env = {
  RESEND_API_KEY: 'test-api',
  LEAD_LEDGER_KEY: 'test-ledger',
  LEAD_OPERATIONS_TOKEN: 'a'.repeat(40),
  LEAD_OPERATIONS_READ_TOKEN: 'b'.repeat(40),
  RESEND_WEBHOOK_SECRET: 'whsec_' + Buffer.alloc(24, 7).toString('base64')
};

class MemoryStore {
  rows = new Map();
  version = 0;

  async setJSON(key, data, {onlyIfNew, onlyIfMatch} = {}) {
    const current = this.rows.get(key);
    if ((onlyIfNew && current) || (onlyIfMatch && current?.etag !== onlyIfMatch)) return {modified: false};
    this.rows.set(key, {data: structuredClone(data), etag: String(++this.version)});
    return {modified: true};
  }
  async get(key) { return structuredClone(this.rows.get(key)?.data ?? null); }
  async getWithMetadata(key) { return structuredClone(this.rows.get(key) ?? null); }
  list({prefix, paginate}) {
    const page = {blobs: [...this.rows.keys()].filter(key => key.startsWith(prefix)).map(key => ({key}))};
    return paginate ? (async function* () { yield page; })() : Promise.resolve(page);
  }
}

const providerReference = 'provider-notification-111';
const operation = (method, query = {}, payload, token = env.LEAD_OPERATIONS_TOKEN) => ({
  httpMethod: method, headers: {authorization: 'Bearer ' + token},
  queryStringParameters: query, body: payload && JSON.stringify(payload)
});
const body = response => JSON.parse(response.body);
function mailEvent(type, id = providerReference, webhookId = 'msg_123456') {
  const timestamp = new Date();
  const raw = JSON.stringify({type: 'email.' + type, created_at: timestamp.toISOString(),
    data: {email_id: id, to: ['private@example.com'], click: {link: 'https://example.com/private'}}});
  const signature = new Webhook(env.RESEND_WEBHOOK_SECRET).sign(webhookId, timestamp, raw);
  return {httpMethod: 'POST', body: raw, headers: {
    'svix-id': webhookId, 'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)), 'svix-signature': signature
  }};
}

test('native intake routes preserve endpoint contracts and declare hosting rate limits', async () => {
  for (const [handler, config, path] of [[quoteRoute, quoteConfig, 'quote'], [punchRoute, punchConfig, 'punch-list']]) {
    assert.equal(config.path, '/.netlify/functions/' + path);
    assert.equal(config.rateLimit.windowLimit, 10);
    const url = 'https://example.com' + config.path;
    assert.equal((await handler(new Request(url))).status, 405);
    const request = new Request(url, {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(path === 'quote' ? {_honey:'bot'} : {website:'bot'})});
    assert.equal((await handler(request)).status, 202);
  }
});

test('ledger deduplicates equivalent quotes and reports signed, paid and delivered work without exposing contact data', async () => {
  const store = new MemoryStore();
  let sends = 0;
  const deps = {env, store, fetch: async () => {
    sends++;
    return Response.json({id: providerReference});
  }};
  const data = {Name:'Internal Control', Location:'Roswell, GA', Email:'private@example.com',
    Service:'Flooring', 'Project Description':'Replace the entry floor', 'Preferred Contact Method':'Email',
    'Inquiry Source Page':'/gallery'};
  const request = {httpMethod:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data)};
  assert.equal((await quote(request, {}, deps)).statusCode, 201);
  assert.equal((await quote({...request, body:JSON.stringify({...data, Location:'roswell, GA'})}, {}, deps)).statusCode, 202);
  assert.equal(sends, 1);
  const id = [...store.rows.keys()][0].split('/')[1];
  assert.equal((await operations(operation('GET', {id}, null, env.LEAD_OPERATIONS_READ_TOKEN), {}, deps)).statusCode, 401);
  assert.equal((await operations(operation('PATCH', {}, {id, stage:'qualified'}, env.LEAD_OPERATIONS_READ_TOKEN), {}, deps)).statusCode, 401);
  for (const stage of ['qualified','appointment','estimate','signed']) {
    assert.equal((await operations(operation('PATCH', {}, {id, stage}), {}, deps)).statusCode, 200);
  }
  const payment = operation('PATCH', {}, {id, stage:'revenue', cents:152000, paymentId:'invoice-1'});
  for (let repeat=0; repeat<2; repeat++) assert.equal((await operations(payment, {}, deps)).statusCode, 200);
  assert.equal((await events(mailEvent('delivered'), {}, deps)).statusCode, 204);
  assert.equal((await events(mailEvent('clicked'), {}, deps)).statusCode, 204);
  assert.equal((await events(mailEvent('clicked', providerReference, 'msg_234567'), {}, deps)).statusCode, 204);
  const badSignature = mailEvent('bounced');
  badSignature.body += ' ';
  assert.equal((await events(badSignature, {}, deps)).statusCode, 400);
  const result = await operations(operation('GET', {}, null, env.LEAD_OPERATIONS_READ_TOKEN), {}, deps);
  assert.equal(result.statusCode, 200);
  assert.ok(!result.body.includes('private@example.com'));
  const report = body(result);
  assert.deepEqual([report.received, report.qualified, report.appointment, report.estimate, report.signed, report.revenueCents], [1,1,1,1,1,152000]);
  assert.equal(report.notification.delivered, 1);
  assert.equal(report.notification.clicked, 1);
  assert.equal(report.notification.bounced, 0);
  assert.deepEqual(report.sources, [{source:'/gallery', received:1}]);
  assert.ok(!JSON.stringify([...store.rows]).includes('https://example.com/private'));
  assert.equal((await operations(operation('PATCH', {}, {id, stage:'exclude'}), {}, deps)).statusCode, 200);
  assert.equal(body(await operations(operation('GET'), {}, deps)).received, 0);
});

test('follow-up queue requires contact consent and delivered acknowledgment, and removes bounces and owner tests', async () => {
  const store = new MemoryStore();
  const deps = {env, store};
  const lead = await recordLead(store, env.LEAD_LEDGER_KEY, {kind:'punch-list', name:'Control',
    email:'private@example.com', phone:'6785717028', location:'30004', categories:['paint'], scope:'Entry',
    contact:'Email', test:false, followUpConsent:true});
  await updateLead(store, lead.path, current => ({...current, acknowledgmentId:'provider-ack-123',
    receivedAt:new Date(Date.now() - 3 * 86_400_000).toISOString()}));
  const queue = () => operations(operation('GET', {view:'follow-up'}), {}, deps).then(body);
  assert.deepEqual(await queue(), []);
  assert.equal((await events(mailEvent('delivered','provider-ack-123'), {}, deps)).statusCode, 204);
  assert.equal((await queue()).length, 1);
  assert.equal((await events(mailEvent('bounced','provider-ack-123'), {}, deps)).statusCode, 204);
  assert.deepEqual(await queue(), []);
  await updateLead(store, lead.path, current => ({...current, test:true}));
  assert.equal(body(await operations(operation('GET'), {}, deps)).received, 0);
});

test('additional and replacement photos reach the owner while equivalent retries stay deduplicated', async () => {
  const store = new MemoryStore();
  const notifications = [];
  const deps = {env, store, fetch: async (_url, {body: raw}) => {
    const payload = JSON.parse(raw);
    if (payload.attachments) notifications.push(payload);
    return Response.json({id: 'message-' + notifications.length});
  }};
  const data = {
    name: 'Photo QA', email: 'charlesbgroup@gmail.com', phone: '6785717028', zip: '30004',
    timing: 'Flexible', contactMethod: 'Email', consent: 'yes', items: [{id: 'paint', quantity: 1}]
  };
  const photo = value => ({content: Buffer.from([255,216,255,value,255,217]).toString('base64')});
  const first = photo(1);
  const second = photo(2);
  const third = photo(3);
  const submit = (photos, updates = {}) => punch({
    httpMethod: 'POST', body: JSON.stringify({...data, photos, ...updates})
  }, {}, deps);
  for (const [photos, expected, updates] of [
    [[], 201], [[first], 201], [[first], 202], [[first, second], 201],
    [[second, first], 202], [[first, third], 201], [[first, third], 201, {timing: 'Within a month'}]
  ]) {
    assert.equal((await submit(photos, updates)).statusCode, expected);
  }
  assert.deepEqual(notifications.map(({attachments}) => attachments.map(({content}) => content)), [
    [], [first.content], [first.content, second.content], [first.content, third.content], [first.content, third.content]
  ]);
  assert.equal(body(await operations(operation('GET'), {}, deps)).received, 0);
  assert.ok(!JSON.stringify([...store.rows]).includes(first.content));
});

test('rolling organic reporting requires staff classification and separates returning customers', async () => {
  const store = new MemoryStore();
  const deps = {env, store, fetch: async () => Response.json({id: providerReference})};
  const data = {Name: 'Project QA', Location: 'Roswell, GA', Email: 'private@example.com',
    Service: 'Flooring', 'Project Description': 'Replace entry floor', 'Customer Reported Discovery': 'Google Search or Maps'};
  const request = details => ({httpMethod: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({...data, ...details})});
  assert.equal((await quote(request({}), {}, deps)).statusCode, 201);
  const [, first] = [...store.rows.keys()][0].split('/');
  const patch = (id, stage, details) => operations(operation('PATCH', {}, {id, stage, ...details}), {}, deps);
  await patch(first, 'qualified');
  const rolling = async () => body(await operations(operation('GET'), {}, deps)).rolling30Days;
  assert.equal((await rolling()).qualifiedOrganic, 0);
  await patch(first, 'classify', {channel: 'organic-search', repeatCustomer: false});
  await patch(first, 'estimate');
  assert.equal((await rolling()).qualifiedOrganic, 1);

  assert.equal((await quote(request({'Project Description': 'Refinish second floor'}), {}, deps)).statusCode, 201);
  assert.equal((await quote(request({'Project Description': 'Refinish second floor'}), {}, deps)).statusCode, 202);
  const [, repeat] = [...store.rows.keys()][1].split('/');
  await patch(repeat, 'classify', {channel: 'direct', repeatCustomer: true});
  await patch(repeat, 'qualified');
  await patch(repeat, 'followed-up');
  const report = await rolling();
  assert.deepEqual([report.qualifiedOrganic, report.repeatCustomers, report.qualified, report.estimate], [1, 1, 2, 1]);
  assert.deepEqual(report.byService[0], {label: 'Flooring', received: 2, qualified: 2, appointment: 0,
    estimate: 1, signed: 0, cohortEstimate: 1, cohortSigned: 0});
});

test('the production ledger configuration cannot silently fall back to email-only intake', async () => {
  const data = {Name: 'Project QA', Location: 'Roswell, GA', Email: 'private@example.com',
    Service: 'Flooring'};
  const request = {httpMethod: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)};
  const result = await quote(request, {}, {env: {RESEND_API_KEY: 'control', LEAD_LEDGER_NAMESPACE: 'production'},
    fetch: async () => assert.fail('Must not call the provider without production storage')});
  assert.equal(result.statusCode, 502);
});
