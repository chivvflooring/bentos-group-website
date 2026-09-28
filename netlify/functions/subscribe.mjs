// Server-side Resend bridge. Deliberately not called by the public form until
// the account, topic IDs, and automation are configured and tested.
const allowedTopics = new Set([
  'new-construction', 'renovations', 'site-development', 'flooring',
  'bathrooms', 'kitchens', 'home-care'
]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export default async function subscribe(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Invalid origin' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid content type' }, 415);

  let data;
  try { data = await request.json(); }
  catch { return json({ error: 'Invalid request' }, 400); }
  if (data?.honey) return json({ ok: true });
  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !allowedTopics.has(data?.topic) || data?.consent !== true) {
    return json({ error: 'A valid email, topic, and consent are required' }, 400);
  }

  const key = process.env.RESEND_API_KEY;
  let topicIds;
  try { topicIds = JSON.parse(process.env.RESEND_TOPIC_IDS_JSON || '{}'); }
  catch { topicIds = {}; }
  const topicId = topicIds[data.topic];
  if (!key || typeof topicId !== 'string' || !/^[a-f0-9-]{36}$/i.test(topicId)) {
    return json({ error: 'Email signup is not configured' }, 503);
  }

  try {
    const response = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, unsubscribed: false, topics: [{ id: topicId, subscription: 'opt_in' }] })
    });
    if (!response.ok) return json({ error: 'Email signup was not confirmed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: 'Email signup was not confirmed' }, 502);
  }
}
