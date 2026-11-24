import { campaignValue, clean, looksLikePromotion, ownerEmail, sendLead, validEmail, validPhone } from '../lib/lead-delivery.mjs';

export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip'] } };

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

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

const localCity = /^(?:acworth|alpharetta|atlanta|brookhaven|buckhead|canton|cumming|decatur|dunwoody|east cobb|johns creek|kennesaw|lawrenceville|marietta|milton|norcross|peachtree corners|roswell|sandy springs|smyrna|suwanee|woodstock)(?:[, ]|$)/i;
const georgiaZip = /\b(?:3[01]\d|39[89])\d{2}(?:-\d{4})?\b/;
const contactOptions = ['No preference', 'Phone call', 'Text message', 'Email'];
const serviceOptions = [
  'Decks & Porches', 'New Construction', 'Site Development', 'Home Addition', 'Roofing',
  'Basement Remodeling', 'Full Renovation', 'Kitchen Remodeling', 'Bathroom Remodeling',
  'Flooring', 'outdoor', 'painting', 'Handyman / Repair', 'Deck'
];

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
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

  if (!data || typeof data !== 'object' || Array.isArray(data)) return response(400, { error: 'Invalid request.' });
  if (data._honey) {
    console.info('spam_rejected', { kind: 'quote', reason: 'honeypot' });
    return response(202, { ok: true });
  }

  const name = clean(data.Name, 120).replace(/\s+/g, ' ');
  const location = clean(data.Location, 160).replace(/\s+/g, ' ');
  const phone = clean(data.Phone, 60);
  const email = clean(data.Email, 254).toLowerCase();
  const contact = clean(data['Preferred Contact Method']);
  if (name.length < 2 || location.length < 2 || (!phone && !email) || (email && !validEmail(email)) ||
      (phone && !validPhone(phone)) || (contact && !contactOptions.includes(contact)) ||
      (contact === 'Email' && !email) || (['Phone call', 'Text message'].includes(contact) && !phone)) {
    return response(400, { error: 'Please provide a name, project city or ZIP, and valid contact details.' });
  }
  const date = clean(data['Preferred Showroom Date']);
  const time = clean(data['Preferred Showroom Time (America/New_York)']);
  const selectedServices = clean(data.Service).split(/\r?\n/).filter(Boolean);
  if ((date && !validDate(date)) || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
      selectedServices.some(service => !serviceOptions.some(option => option.toLowerCase() === service.toLowerCase()))) {
    return response(400, { error: 'Check your selected services and preferred showroom date or time.' });
  }
  if (!localCity.test(location) && !georgiaZip.test(location) && !/(?:,|\s)\s*(?:GA|Georgia)$/i.test(location)) {
    return response(400, { error: 'Enter a Georgia project city with GA, or a Georgia ZIP code.' });
  }
  if (submittedFields(data).some(([label, value]) => label !== 'Email' && looksLikePromotion(value))) {
    console.info('spam_rejected', { kind: 'quote', reason: 'links' });
    return response(400, { error: 'Please remove website links from your request.' });
  }

  const env = dependencies.env || process.env;
  if (!env.RESEND_API_KEY) return response(503, { error: 'Quote delivery is temporarily unavailable.' });

  const fields = submittedFields(data);
  const tag = campaignValue(data['Campaign Tag']);
  if (tag) fields.push(['Campaign link (unverified)', tag]);
  const services = selectedServices.join('\n') || 'Project consultation';
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
    to: [ownerEmail],
    subject,
    text,
    html: `<h1>New website quote request</h1><table style="border-collapse:collapse">${htmlRows}</table><p>Source: Bento’s Group estimate form</p>`
  };
  if (email) payload.reply_to = email;

  try {
    const reference = await sendLead('quote', payload, dependencies);
    if (reference) {
      console.info('submission_received', { kind: 'quote', reference, qa: email === ownerEmail });
      return response(201, { ok: true });
    }
  } catch {
    console.warn('lead_provider_unavailable', { kind: 'quote' });
  }
  return response(502, { error: 'Quote delivery is temporarily unavailable.' });
}
