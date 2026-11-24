import { Webhook } from 'svix';
import { json, ledger } from '../lib/lead-ledger.mjs';

const eventTypes = new Set(['sent', 'delivered', 'bounced', 'complained', 'clicked', 'failed', 'suppressed']);
const providerId = /^[a-z0-9_-]{8,100}$/i;

export async function handler(event, _context, deps = {}) {
  if (event.httpMethod !== 'POST') return json(405, {error: 'Method not allowed'});
  const env = deps.env || process.env;
  if (!env.RESEND_WEBHOOK_SECRET) return json(503, {error: 'Webhook unavailable'});
  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
  if (Buffer.byteLength(body) > 65_536) return json(413, {error: 'Payload too large'});
  const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
  let payload;
  try {
    new Webhook(env.RESEND_WEBHOOK_SECRET).verify(body, headers);
    payload = JSON.parse(body);
  } catch {
    return json(400, {error: 'Invalid signature'});
  }
  const type = typeof payload?.type === 'string' && payload.type.startsWith('email.') ? payload.type.slice(6) : '';
  if (!eventTypes.has(type)) return {statusCode: 204, headers: {'Cache-Control': 'no-store'}, body: ''};
  const id = payload.data?.email_id;
  const timestamp = Date.parse(payload.created_at);
  if (typeof id !== 'string' || !providerId.test(id) || !Number.isFinite(timestamp)) {
    return json(400, {error: 'Invalid event'});
  }
  try {
    const store = ledger(event, deps);
    if (!store) return json(503, {error: 'Webhook unavailable'});
    // Per-message/type keys count unique clicks and make delivery retries harmless.
    // Recipient addresses, content, and clicked URLs stay with the provider.
    await store.setJSON(`mail/${id}/${type}`, {at: new Date(timestamp).toISOString()}, {onlyIfNew: true});
    return {statusCode: 204, headers: {'Cache-Control': 'no-store'}, body: ''};
  } catch {
    return json(503, {error: 'Event persistence unavailable'});
  }
}
