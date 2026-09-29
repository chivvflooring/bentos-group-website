const RESEND_CONTACTS_URL = 'https://api.resend.com/audiences';
const ALLOWED_TOPICS = new Set(['new-construction', 'renovations', 'site-development', 'flooring', 'bathrooms', 'kitchens', 'home-care']);
const CONSENT_VERSION = 'email-marketing-v1-2026-09-29';
const MIN_COMPLETION_MS = 2500;
const MAX_BODY_BYTES = 8_000;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Origin'
    },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  const type = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').split(';')[0];
  if (type !== 'application/json') throw Object.assign(new Error('Expected JSON.'), { status: 415 });
  if (!event.body || Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Invalid request size.'), { status: 400 });
  }
  try { return JSON.parse(event.body); }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function handler(event, _context, dependencies = {}) {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });

  let data;
  try { data = parseBody(event); }
  catch (error) { return response(error.status || 400, { error: error.message }); }

  // Silently accept honeypot submissions so automated senders get no useful signal.
  if (typeof data.website === 'string' && data.website.trim()) return response(202, { ok: true });

  const elapsed = Date.now() - Number(data.startedAt);
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const source = typeof data.source === 'string' && /^\/[a-z0-9/_-]*$/i.test(data.source) ? data.source.slice(0, 200) : null;
  if (!validEmail(email) || !ALLOWED_TOPICS.has(data.interest) || data.consent !== true ||
      data.consentVersion !== CONSENT_VERSION || !source || !Number.isFinite(elapsed) || elapsed < MIN_COMPLETION_MS || elapsed > 86_400_000) {
    return response(400, { error: 'Please complete the email, topic, and consent fields and try again.' });
  }

  const env = dependencies.env || process.env;
  const fetchImpl = dependencies.fetch || fetch;
  if (!env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) {
    console.error('Subscriber bridge is missing Resend configuration.');
    return response(503, { error: 'Email signup is temporarily unavailable.' });
  }

  const consentRecord = {
    event: 'email_marketing_consent',
    email,
    interest: data.interest,
    source,
    consentVersion: CONSENT_VERSION,
    recordedAt: new Date().toISOString()
  };

  let resendResponse;
  try {
    resendResponse = await fetchImpl(`${RESEND_CONTACTS_URL}/${encodeURIComponent(env.RESEND_AUDIENCE_ID)}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ email, unsubscribed: false })
    });
  } catch (error) {
    console.error('Resend contact request failed to connect.', { message: error.message, consent: consentRecord });
    return response(502, { error: 'Email signup is temporarily unavailable.' });
  }

  if (!resendResponse.ok) {
    const providerRequestId = resendResponse.headers?.get?.('x-request-id') || null;
    console.error('Resend rejected contact request.', { status: resendResponse.status, providerRequestId, consent: consentRecord });
    return response(502, { error: 'Email signup is temporarily unavailable.' });
  }

  // Netlify function logs retain the exact consent version, topic, source and timestamp;
  // the Resend audience stores only people who passed the explicit-consent checks above.
  console.info('Email marketing consent recorded.', consentRecord);
  return response(201, { ok: true });
}
