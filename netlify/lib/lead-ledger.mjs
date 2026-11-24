import { createHmac, timingSafeEqual } from 'node:crypto';
import { connectLambda, getStore } from '@netlify/blobs';

export const stages = ['qualified', 'appointment', 'estimate', 'signed', 'revenue'];

export function ledger(event, {env = process.env, store} = {}) {
  if (store) return store;
  if (!env.LEAD_LEDGER_KEY) return null;
  if (event.blobs) connectLambda(event);
  return getStore({
    name: env.LEAD_LEDGER_NAMESPACE === 'production' ? 'lead-ledger-v1' : 'lead-ledger-preview-v1',
    consistency: 'strong'
  });
}

export function authorized(request, token) {
  if (typeof token !== 'string' || token.length < 32) return false;
  const expected = Buffer.from('Bearer ' + token);
  const supplied = Buffer.from(request.headers?.authorization || request.headers?.Authorization || '');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

const normalize = value => value.trim().replace(/\s+/g, ' ').toLowerCase();

export async function recordLead(store, key, input) {
  const identity = [input.kind, input.email, input.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''),
    normalize(input.location), [...input.categories].map(normalize).sort(), normalize(input.scope)];
  const id = createHmac('sha256', key).update(JSON.stringify(identity)).digest('hex');
  const path = 'leads/' + id;
  const record = { ...input, id, receivedAt: new Date().toISOString(), milestones: {}, followUpStopped: false };
  await store.setJSON(path, record, {onlyIfNew: true});
  return {path, record: await store.get(path, {type: 'json'})};
}

export async function updateLead(store, path, transform) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await store.getWithMetadata(path, {type: 'json'});
    if (!current) return null;
    const next = transform(current.data);
    if (next === current.data) return current.data;
    const result = await store.setJSON(path, next, {onlyIfMatch: current.etag});
    if (result.modified) return next;
  }
  throw new Error('Lead update conflict');
}

export async function deliverRecordedLead({store, lead, notify, acknowledge}) {
  const record = lead?.record;
  let reference = record?.notificationId;
  let duplicate = Boolean(reference);
  if (!reference) {
    reference = await notify(lead?.path);
    if (!reference) return {reference: '', duplicate: false};
    if (store) {
      let claimed;
      const stored = await updateLead(store, lead.path, current => {
        claimed = !current.notificationId;
        return claimed ? {...current, notificationId: reference} : current;
      });
      if (!stored) throw new Error('Lead record unavailable');
      reference = stored.notificationId;
      duplicate = !claimed;
    }
  }
  if (acknowledge && !record?.acknowledgmentId) {
    try {
      const id = await acknowledge(reference);
      if (id && store) await updateLead(store, lead.path, current =>
        current.acknowledgmentId ? current : {...current, acknowledgmentId: id});
    } catch {
      console.warn('punch_list_acknowledgment_failed', {reference});
    }
  }
  return {reference, duplicate};
}

export function sourcePath(value) {
  return typeof value === 'string' && /^\/(?:[a-z0-9_/-]*)(?:#[a-z0-9_-]+)?$/i.test(value) && !value.startsWith('//')
    ? value.slice(0, 160) : '';
}

export function json(statusCode, data) {
  return {statusCode, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify(data)};
}
