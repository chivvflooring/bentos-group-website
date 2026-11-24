import { services, estimate } from '../../js/punch-pricing.js';
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from '../../js/repair-photos.js';
import { campaignValue, clean, looksLikePromotion, ownerEmail, sendLead, validEmail, validPhone } from '../lib/lead-delivery.mjs';

export const config = {
  path: '/.netlify/functions/punch-list',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip'] }
};

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});
const timingOptions = ['Flexible', 'Before the holidays', 'Within 2 weeks', 'Within a month'];
const contactOptions = ['No preference', 'Phone call', 'Text message', 'Email'];

function parsePhotos(photos) {
  if (!Array.isArray(photos) || photos.length > MAX_PHOTOS) throw new Error('Choose up to 5 photos.');
  return photos.map((photo, index) => {
    const content = photo?.content;
    if (typeof content !== 'string' || content.length > 4 * Math.ceil(MAX_PHOTO_BYTES / 3)) {
      throw new Error('One photo is too large. Please reselect it or send your list without photos.');
    }
    const bytes = Buffer.from(content, 'base64');
    if (bytes.toString('base64') !== content ||
        !bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
        !bytes.subarray(-2).equals(Buffer.from([255, 217]))) {
      throw new Error('A photo could not be read. Please reselect it or send your list without photos.');
    }
    return { filename: `repair-${index + 1}.jpg`, content };
  });
}

export async function handler(event, _context, deps = {}) {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed.' });
  if (!event.body || Buffer.byteLength(event.body) > 4_500_000) {
    return reply(413, { error: 'Request too large. Try again with fewer photos.' });
  }

  let data;
  try { data = JSON.parse(event.body); }
  catch { return reply(400, { error: 'Invalid request.' }); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400, { error: 'Invalid request.' });
  if (data.website) {
    console.info('spam_rejected', { kind: 'punch-list', reason: 'honeypot' });
    return reply(202, { ok: true });
  }

  const name = clean(data.name, 120).replace(/\s+/g, ' ');
  const email = clean(data.email, 254).toLowerCase();
  const zip = clean(data.zip, 10);
  const phone = clean(data.phone, 40);
  const timing = clean(data.timing, 40);
  const contact = clean(data.contactMethod, 40);
  const details = clean(data.details, 3000);
  if (name.length < 2 || !validEmail(email) || !validPhone(phone) || !/^3\d{4}(?:-\d{4})?$/.test(zip) ||
      data.consent !== 'yes' || !timingOptions.includes(timing) || !contactOptions.includes(contact)) {
    return reply(400, { error: 'Check your contact information, Georgia property ZIP and agreement to be contacted.' });
  }
  if (looksLikePromotion([name, details].join(' '))) {
    console.info('spam_rejected', { kind: 'punch-list', reason: 'links' });
    return reply(400, { error: 'Please remove website links from your request.' });
  }

  let totals;
  try {
    if (!Array.isArray(data.items) || !data.items.length || data.items.length > services.length ||
        new Set(data.items.map(item => item.id)).size !== data.items.length) throw new Error();
    totals = estimate(data.items);
  } catch {
    return reply(400, { error: 'Select at least one repair and check the quantities.' });
  }
  let attachments;
  try { attachments = parsePhotos(data.photos); }
  catch (error) { return reply(400, { error: error.message }); }

  const env = deps.env || process.env;
  if (!env.RESEND_API_KEY) return reply(503, { error: 'Delivery is unavailable. Please call (678) 571-7028.' });
  const items = data.items.map(item => {
    const service = services.find(candidate => candidate.id === item.id);
    const price = service.min ? `$${service.min * item.quantity}–$${service.max * item.quantity} reference labor` : 'Scope review needed';
    return `${service.name}: ${item.quantity} ${service.unit || 'item(s)'} — ${price}`;
  });
  const interest = services.some(service => service.id === data.interest) ? data.interest : '';
  const text = [
    'New Punch List request', `Name: ${name}`, `Email: ${email}`, `Phone: ${phone}`, `ZIP: ${zip}`,
    ...items, `Reference labor subtotal: $${totals.low}–$${totals.high}; ${totals.review} service(s) need review. Not a final quote.`,
    `Details: ${details}`, `Timing: ${timing}`, `Contact preference: ${contact}`, 'Contact consent: yes',
    `Campaign link (unverified): ${campaignValue(data.campaignTag) || campaignValue(data.campaign)}`,
    `UTM source / medium / campaign: ${[data.source, data.medium, data.campaign].map(campaignValue).join(' / ')}`,
    `Service link: ${interest}`, `Photos: ${attachments.length}`
  ].join('\n');

  try {
    const reference = await sendLead('punch-list', {
      to: [ownerEmail], reply_to: email, subject: `Website Punch List — ${zip}`, text, attachments
    }, deps);
    if (reference) {
      console.info('submission_received', { kind: 'punch-list', reference, qa: email === ownerEmail });
      try {
        const acknowledgment = await sendLead(`punch-list-ack-${reference}`, {
          to: [email], reply_to: ownerEmail, subject: 'Bento’s Group received your Punch List',
          text: 'Thank you for sending us your Punch List. Our team will review the details and contact you to confirm the scope and pricing. You can reply to this email or call (678) 571-7028.'
        }, deps);
        console.info('punch_list_acknowledgment', { reference, accepted: Boolean(acknowledgment) });
      } catch {
        // The provider already accepted the owner notification. Keep the lead successful.
        console.warn('punch_list_acknowledgment_failed', { reference });
      }
      return reply(201, { ok: true, reference });
    }
  } catch {
    console.warn('lead_provider_unavailable', { kind: 'punch-list' });
  }
  return reply(502, { error: 'Delivery could not be confirmed. Please retry or call (678) 571-7028.' });
}
