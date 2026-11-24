import test from 'node:test';import assert from 'node:assert/strict';import {estimate} from '../js/punch-pricing.js';import {handler} from '../netlify/functions/punch-list.mjs';
const request={name:'Website QA test',email:'charlesbgroup@gmail.com',phone:'6785717028',zip:'30005',consent:'yes',timing:'Flexible',contactMethod:'Email',items:[{id:'recoat',quantity:400},{id:'deck',quantity:1}],photos:[]};
const event=d=>({httpMethod:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});
test('reference subtotal excludes reviewed work and rejects invalid quantities',()=>{assert.deepEqual(estimate(request.items),{low:800,high:800,review:1});assert.throws(()=>estimate([{id:'recoat',quantity:-1}]));});
test('missing email configuration never reports success',async()=>{assert.equal((await handler(event(request),{}, {env:{}})).statusCode,503);});
test('provider rejection preserves failure',async()=>{assert.equal((await handler(event(request),{}, {env:{RESEND_API_KEY:'test'},fetch:async()=>({ok:false})})).statusCode,502);});
test('photos and all items reach owner; prices recomputed server side',async()=>{const outbound=[];const d={...request,photos:[{content:Buffer.from([255,216,255,0,255,217]).toString('base64')}],low:1};const r=await handler(event(d),{},{env:{RESEND_API_KEY:'test'},fetch:async(url,init)=>{outbound.push(JSON.parse(init.body));return {ok:true,json:async()=>({id:'qa'})};}});assert.equal(r.statusCode,201);const [payload,ack]=outbound;assert.equal(ack.subject,'Bento’s Group received your Punch List');assert.match(payload.text,/\$800/);assert.match(payload.text,/Deck repairs/);assert.equal(payload.attachments.length,1);assert.deepEqual(payload.to,['charlesbgroup@gmail.com']);});
test('malformed, duplicate and disguised files rejected before sending',async()=>{for(const d of [{...request,items:[...request.items,request.items[0]]},{...request,photos:[{content:Buffer.from('<script>').toString('base64')}]}])assert.equal((await handler(event(d),{},{env:{}})).statusCode,400);});

test('owner acceptance survives an acknowledgment failure and preserves campaign labels', async () => {
  const sent = [];
  const result = await handler(event({ ...request, campaignTag: 'holiday-home-refresh', campaign: 'holiday_home_refresh' }), {}, {
    env: { RESEND_API_KEY: 'test' },
    fetch: async (_url, init) => {
      sent.push(JSON.parse(init.body));
      return sent.length === 1 ? { ok: true, json: async () => ({ id: 'owner-fixture' }) } : { ok: false, status: 422 };
    }
  });
  assert.equal(result.statusCode, 201);
  assert.match(sent[0].text, /Campaign link \(unverified\): holiday-home-refresh/);
  assert.match(sent[0].text, /holiday_home_refresh/);
  assert.equal(sent[1].attachments, undefined);
});

test('punch list rejects missing consent, truncated images and oversized images', async () => {
  const deps = { env: { RESEND_API_KEY: 'test' }, fetch: async () => assert.fail('Unexpected notification') };
  for (const data of [
    { ...request, consent: '' },
    { ...request, photos: [null] },
    { ...request, photos: [{ content: '/9j/' }] },
    { ...request, photos: [{ content: Buffer.alloc(600_001).toString('base64') }] }
  ]) assert.equal((await handler(event(data), {}, deps)).statusCode, 400);
});
