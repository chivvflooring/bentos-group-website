const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const OWNER_EMAIL = 'charlesbgroup@gmail.com';
const SENDER = "Bento's Group Website <leads@bentos-group.com>";
const MAX_BODY_BYTES = 20_000;
const ALLOWED_FIELDS = [
  'Name', 'Location', 'Phone', 'Email', 'Preferred Contact Method', 'Best Contact Time',
  'Customer Reported Discovery', 'Service', 'Square Footage', 'Project Description',
  'Estimated Budget', 'Timeline', 'Financing Interest', 'Flooring Interest',
  'Flooring Project Type', 'Existing Flooring', 'Flooring Rooms or Areas',
  'Flooring Stairs Included', 'Flooring Material Status', 'Project Stage',
  'Showroom Appointment Request', 'Preferred Showroom Date',
  'Preferred Showroom Time (America/New_York)', 'Showroom Alternative Times and Notes',
  'Custom Home Lot Status', 'Custom Home Plans Status', 'Custom Home Size Sq Ft',
  'Custom Home Budget Scope'
];

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function clean(value, max = 2_000) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
    : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseBody(event) {
  if (!event.body || Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Invalid request size.'), { status: 400 });
  }
  const type = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').split(';')[0];
  if (type === 'application/json') {
    try { return JSON.parse(event.body); }
    catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
  }
  if (type === 'application/x-www-form-urlencoded') {
    return Object.fromEntries(new URLSearchParams(event.body));
  }
  throw Object.assign(new Error('Unsupported request format.'), { status: 415 });
}

function submittedFields(data) {
  return ALLOWED_FIELDS
    .map(label => [label, clean(data[label])])
    .filter(([, value]) => value);
}

export async function handler(event, _context, dependencies = {}) {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });

  let data;
  try { data = parseBody(event); }
  catch (error) { return response(error.status || 400, { error: error.message }); }

  // Do not reveal the honeypot to automated senders and never email its contents.
  if (clean(data._honey)) return response(202, { ok: true });

  const name = clean(data.Name, 120);
  const location = clean(data.Location, 160);
  const phone = clean(data.Phone, 60);
  const email = clean(data.Email, 254).toLowerCase();
  if (name.length < 2 || location.length < 2 || (!phone && !email) || (email && !validEmail(email))) {
    return response(400, { error: 'Please provide a name, project city or ZIP, and valid contact details.' });
  }
  if (phone && phone.replace(/\D/g, '').length < 7) {
    return response(400, { error: 'Please provide a valid phone number.' });
  }

  const env = dependencies.env || process.env;
  const fetchImpl = dependencies.fetch || fetch;
  if (!env.RESEND_API_KEY) {
    console.error('Quote notification is missing Resend configuration.');
    return response(503, { error: 'Quote delivery is temporarily unavailable.' });
  }

  const fields = submittedFields(data);
  const services = clean(data.Service, 300) || 'Project consultation';
  const subject = `Website quote request — ${services.split('\n')[0].slice(0, 80)} — ${location}`;
  const text = [
    'New website quote request', '',
    ...fields.map(([label, value]) => `${label}: ${value}`), '',
    'Source: Bento’s Group estimate form'
  ].join('\n');
  const htmlRows = fields.map(([label, value]) =>
    `<tr><th align="left" style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(label)}</th>` +
    `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`
  ).join('');

  const payload = {
    from: SENDER,
    to: [OWNER_EMAIL],
    subject,
    text,
    html: `<h1>New website quote request</h1><table style="border-collapse:collapse">${htmlRows}</table><p>Source: Bento’s Group estimate form</p>`
  };
  if (email) payload.reply_to = email;

  let providerResponse;
  try {
    providerResponse = await fetchImpl(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Quote notification could not connect to email provider.', { message: error.message });
    return response(502, { error: 'Quote delivery is temporarily unavailable.' });
  }

  if (!providerResponse.ok) {
    const requestId = providerResponse.headers?.get?.('x-request-id') || null;
    console.error('Quote notification provider rejected request.', { status: providerResponse.status, requestId });
    return response(502, { error: 'Quote delivery is temporarily unavailable.' });
  }

  console.info('Website quote notification accepted.', { service: services.slice(0, 100), hasEmail: Boolean(email) });
  return response(201, { ok: true });
}
