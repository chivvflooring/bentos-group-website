import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/subscribe.mjs';

const validPayload = {
  email: '  HomeOwner@Example.com ',
  interest: 'flooring',
  consent: true,
  consentVersion: 'email-marketing-v1-2026-09-29',
  source: '/floor-care-guide',
  website: '',
  startedAt: Date.now() - 5000
};

function event(payload = validPayload) {
  return { httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) };
}

test('subscriber bridge creates a normalized contact in the dedicated segment and selected topic', async () => {
  let request;
  const result = await handler(event(), {}, {
    env: { RESEND_API_KEY: 'secret-test-key', RESEND_SEGMENT_ID: 'seg_test' },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201, headers: new Headers() };
    }
  });
  assert.equal(result.statusCode, 201);
  assert.equal(request.url, 'https://api.resend.com/contacts');
  assert.equal(request.options.headers.Authorization, 'Bearer secret-test-key');
  assert.deepEqual(JSON.parse(request.options.body), {
    email: 'homeowner@example.com', unsubscribed: false,
    segments: [{ id: 'seg_test' }],
    topics: [{ id: '5e762e5e-d1b7-4065-82dd-f96ad7c96d14', subscription: 'opt_in' }]
  });
});

test('consent, topic, completion time, and configuration are required', async () => {
  for (const change of [
    { consent: false },
    { interest: 'anything' },
    { startedAt: Date.now() },
    { consentVersion: 'old-version' }
  ]) {
    const result = await handler(event({ ...validPayload, ...change }), {}, { env: {}, fetch: () => assert.fail('must not call Resend') });
    assert.equal(result.statusCode, 400);
  }
  const unconfigured = await handler(event(), {}, { env: {}, fetch: () => assert.fail('must not call Resend') });
  assert.equal(unconfigured.statusCode, 503);
});

test('honeypot is silently accepted without adding a Resend contact', async () => {
  const result = await handler(event({ ...validPayload, website: 'https://spam.example' }), {}, {
    env: { RESEND_API_KEY: 'unused', RESEND_SEGMENT_ID: 'unused' },
    fetch: () => assert.fail('must not call Resend')
  });
  assert.equal(result.statusCode, 202);
});

test('provider and malformed requests return safe errors', async () => {
  const rejected = await handler(event(), {}, {
    env: { RESEND_API_KEY: 'secret-test-key', RESEND_SEGMENT_ID: 'seg_test' },
    fetch: async () => ({ ok: false, status: 429, headers: new Headers({ 'x-request-id': 'req_test' }) })
  });
  assert.equal(rejected.statusCode, 502);
  assert.equal(JSON.parse(rejected.body).error, 'Email signup is temporarily unavailable.');

  const malformed = await handler({ httpMethod: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
  assert.equal(malformed.statusCode, 415);
  assert.ok(!rejected.body.includes('secret-test-key'));
});

test('an existing contact is not silently resubscribed', async () => {
  const result = await handler(event(), {}, {
    env: { RESEND_API_KEY: 'secret-test-key', RESEND_SEGMENT_ID: 'seg_test' },
    fetch: async () => ({ ok: false, status: 409, headers: new Headers() })
  });
  assert.equal(result.statusCode, 409);
  assert.match(JSON.parse(result.body).error, /already registered/i);
});
