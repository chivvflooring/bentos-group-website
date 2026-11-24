import { createHmac } from 'node:crypto';

export const ownerEmail = 'charlesbgroup@gmail.com';
const sender = "Bento's Group Website <leads@bentos-group.com>";

export function clean(value, max = 2_000) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
    : '';
}

export function validEmail(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && value.length <= 254;
}

export function validPhone(value) {
  return /^[+()\d.\s-]+$/.test(value) && /^1?\d{10}$/.test(value.replace(/\D/g, ''));
}

// Campaign tags describe public links. They are not verified referral sources.
export function campaignValue(value) {
  return typeof value === 'string' && /^[a-z\d_-]{1,100}$/i.test(value) ? value : '';
}

export function looksLikePromotion(value) {
  return /(?:https?:\/\/|www\.|<\/?(?:a|script|iframe|img)\b)/i.test(value);
}

export async function sendLead(kind, message, { env = process.env, fetch: fetchImpl = fetch }) {
  const body = JSON.stringify({ from: sender, ...message });
  const idempotencyKey = createHmac('sha256', env.RESEND_API_KEY).update(body).digest('hex');
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${kind}/${idempotencyKey}`
    },
    body,
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
    console.warn('lead_provider_rejected', { kind, status: response.status });
    return '';
  }
  const result = await response.json();
  return typeof result?.id === 'string' ? result.id : '';
}
