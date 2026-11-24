import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { connectLambda, getStore } from '@netlify/blobs';

export const stages = ['qualified', 'appointment', 'estimate', 'signed', 'revenue'];

export function ledger(event, {env = process.env, store} = {}) {
  if (store) return store;
  if (!env.LEAD_LEDGER_KEY) {
    if (env.LEAD_LEDGER_NAMESPACE === 'production') throw new Error('Production lead storage is not configured');
    return null;
  }
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

const retryWindowMs = 24 * 60 * 60 * 1000;

export async function recordLead(store, key, input, revision = [], now = Date.now()) {
  const identity = [input.kind, input.email, input.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''),
    normalize(input.location), [...input.categories].map(normalize).sort(), normalize(input.scope)];
  if (revision.length) identity.push(revision);
  const fingerprint = createHmac('sha256', key).update(JSON.stringify(identity)).digest('hex');
  const claimPath = 'retry/' + fingerprint;

  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await store.getWithMetadata(claimPath, {type: 'json'});
    let claim = current?.data;
    if (!claim || now - Date.parse(claim.receivedAt) >= retryWindowMs) {
      claim = {id: randomBytes(32).toString('hex'), receivedAt: new Date(now).toISOString()};
      const precondition = current ? {onlyIfMatch: current.etag} : {onlyIfNew: true};
      const result = await store.setJSON(claimPath, claim, precondition);
      if (!result.modified) continue;
    }
    const path = 'leads/' + claim.id;
    const record = {...input, ...claim, milestones: {}, followUpStopped: false};
    await store.setJSON(path, record, {onlyIfNew: true});
    const stored = await store.get(path, {type: 'json'});
    if (!stored) throw new Error('Lead record unavailable');
    return {path, record: stored};
  }
  throw new Error('Lead retry claim conflict');
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
