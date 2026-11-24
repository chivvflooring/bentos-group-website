import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Webhook} from 'svix';
import {handler as quote} from '../netlify/lib/quote-intake.mjs';
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
