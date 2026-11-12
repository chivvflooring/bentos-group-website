import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/quote.mjs';

function event(params, contentType = 'application/x-www-form-urlencoded') {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': contentType },
    body: contentType === 'application/json' ? JSON.stringify(params) : new URLSearchParams(params).toString()
  };
}

test('valid quote emails only the owner and keeps the verified customer reply address', async () => {
  let outbound;
  const result = await handler(event({
    Name: 'QA Website Test', Location: 'Alpharetta 30005', Phone: '678-555-0100',
    Email: 'qa@example.com', Service: 'Flooring\nPainting',
    'Customer Reported Discovery': 'AI assistant (ChatGPT, Gemini, Perplexity or another)'
  }), {}, {
    env: { RESEND_API_KEY: 'test-key' },
    fetch: async (_url, options) => {
      outbound = JSON.parse(options.body);
      return { ok: true, status: 200, headers: { get: () => null } };
    }
  });
  assert.equal(result.statusCode, 201);
  assert.deepEqual(outbound.to, ['charlesbgroup@gmail.com']);
  assert.equal(outbound.reply_to, 'qa@example.com');
  assert.match(outbound.subject, /Flooring/);
  assert.match(outbound.text, /Painting/);
  assert.doesNotMatch(outbound.text, /test-key/);
});

test('phone-only quote is accepted without inventing a reply email', async () => {
  let outbound;
  const result = await handler(event({ Name: 'Phone Lead', Location: 'Roswell', Phone: '(678) 555-0199', Service: 'Deck' }), {}, {
    env: { RESEND_API_KEY: 'test-key' },
    fetch: async (_url, options) => {
      outbound = JSON.parse(options.body);
      return { ok: true, status: 200, headers: { get: () => null } };
    }
  });
  assert.equal(result.statusCode, 201);
  assert.equal('reply_to' in outbound, false);
});

test('invalid contact data is rejected before email delivery', async () => {
  let calls = 0;
  const result = await handler(event({ Name: 'A', Location: '', Phone: '12', Email: 'bad' }), {}, {
    env: { RESEND_API_KEY: 'test-key' }, fetch: async () => { calls += 1; }
  });
  assert.equal(result.statusCode, 400);
  assert.equal(calls, 0);
});

test('honeypot submission is quietly accepted without sending', async () => {
  let calls = 0;
  const result = await handler(event({ Name: 'Bot', Location: 'Atlanta', Phone: '6785550100', _honey: 'filled' }), {}, {
    env: { RESEND_API_KEY: 'test-key' }, fetch: async () => { calls += 1; }
  });
  assert.equal(result.statusCode, 202);
  assert.equal(calls, 0);
});

test('provider failure cannot be presented as a successful quote', async () => {
  const result = await handler(event({ Name: 'QA Test', Location: 'Johns Creek', Phone: '6785550100' }), {}, {
    env: { RESEND_API_KEY: 'test-key' },
    fetch: async () => ({ ok: false, status: 500, headers: { get: () => 'request-id' } })
  });
  assert.equal(result.statusCode, 502);
  assert.equal(JSON.parse(result.body).ok, undefined);
});
