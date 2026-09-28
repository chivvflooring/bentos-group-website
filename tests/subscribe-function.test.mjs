import test from 'node:test';
import assert from 'node:assert/strict';
import subscribe from '../netlify/functions/subscribe.mjs';

const endpoint = 'https://bentos-group.com/.netlify/functions/subscribe';
const request = (body, origin = 'https://bentos-group.com') => new Request(endpoint, {
  method: 'POST',
  headers: { origin, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const signup = { email: 'charlesbgroup@gmail.com', topic: 'new-construction', consent: true };

test('requires explicit email consent and a matching origin', async () => {
  assert.equal((await subscribe(request({ ...signup, consent: false }))).status, 400);
  assert.equal((await subscribe(request(signup, 'https://elsewhere.example'))).status, 403);
});

test('fails closed before Resend configuration and sends no request', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Should not send'); };
  try {
    assert.equal((await subscribe(request(signup))).status, 503);
  } finally { globalThis.fetch = original; }
});

test('passes only a consented address and selected topic to Resend', async () => {
  const oldKey = process.env.RESEND_API_KEY;
  const oldTopics = process.env.RESEND_TOPIC_IDS_JSON;
  const original = globalThis.fetch;
  process.env.RESEND_API_KEY = 'test-secret';
  process.env.RESEND_TOPIC_IDS_JSON = JSON.stringify({ 'new-construction': '11111111-1111-4111-8111-111111111111' });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/contacts');
    assert.deepEqual(JSON.parse(options.body), {
      email: signup.email,
      unsubscribed: false,
      topics: [{ id: '11111111-1111-4111-8111-111111111111', subscription: 'opt_in' }]
    });
    return new Response('{}', { status: 201 });
  };
  try {
    assert.equal((await subscribe(request(signup))).status, 200);
  } finally {
    globalThis.fetch = original;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
    if (oldTopics === undefined) delete process.env.RESEND_TOPIC_IDS_JSON;
    else process.env.RESEND_TOPIC_IDS_JSON = oldTopics;
  }
});
