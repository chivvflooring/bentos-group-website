import { authorized, json, ledger, stages, updateLead } from '../lib/lead-ledger.mjs';

const monthFormat = new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', timeZone: 'America/New_York'});
const monthOf = value => monthFormat.format(new Date(value)).slice(0, 7);
const targets = {qualified: 20, estimate: 12, signed: 4};
const channels = ['unknown', 'organic-search', 'organic-social', 'referral', 'realtor-referral', 'neighborhood-referral', 'email', 'paid', 'direct', 'other'];
const stageCounts = () => ({received: 0, qualified: 0, appointment: 0, estimate: 0, signed: 0});
const mailTypes = ['sent', 'delivered', 'bounced', 'complained', 'clicked', 'failed', 'suppressed'];
const isSuppressed = types => types.some(type => ['bounced', 'complained', 'suppressed', 'failed'].includes(type));
const canFollowUp = (lead, types) => {
  const age = Date.now() - Date.parse(lead.receivedAt);
  return !lead.test && !lead.excluded && lead.followUpConsent && !lead.followUpStopped && !lead.lastFollowUpAt &&
    lead.contact === 'Email' && !lead.milestones.appointment && !lead.milestones.estimate && !lead.milestones.signed &&
    age >= 2 * 86_400_000 && age < 15 * 86_400_000 && types.includes('delivered') && !isSuppressed(types);
};
const newCounts = () => Object.fromEntries(mailTypes.map(type => [type, 0]));

async function listRecords(store) {
  const records = [];
  for await (const page of store.list({prefix: 'leads/', paginate: true})) {
    for (let index = 0; index < page.blobs.length; index += 12) {
      const batch = page.blobs.slice(index, index + 12);
      records.push(...await Promise.all(batch.map(({key}) => store.get(key, {type: 'json'}))));
    }
  }
  return records.filter(Boolean);
}

async function emailEvents(store, id) {
  if (!id) return [];
  const {blobs} = await store.list({prefix: `mail/${id}/`});
  return blobs.map(({key}) => key.split('/').at(-1));
}

export async function report(store, month, now = Date.now()) {
  const cutoff = now - 30 * 86_400_000;
  const withinWindow = value => Date.parse(value) >= cutoff && Date.parse(value) <= now;
  const rolling30Days = {...stageCounts(), qualifiedOrganic: 0, repeatCustomers: 0, revenueCents: 0,
    pendingNotification: 0, notification: newCounts(), acknowledgment: newCounts()};
  const breakdowns = {byChannel: new Map(), byService: new Map(), byCampaign: new Map()};
  const addBreakdown = (group, label, stages, revenueCents) => {
    const counts = group.get(label) || {...stageCounts(), cohortEstimate: 0, cohortSigned: 0};
    for (const stage of stages) counts[stage]++;
    if (revenueCents !== undefined) counts.revenueCents = (counts.revenueCents || 0) + revenueCents;
    group.set(label, counts);
  };
  const result = {month, timeZone: 'America/New_York', targets, received: 0, pendingNotification: 0,
    qualified: 0, appointment: 0, estimate: 0, signed: 0, revenueCents: 0, sources: [], rolling30Days,
    notification: newCounts(), acknowledgment: newCounts(), emailFollowUpEligible: 0};
  const sources = new Map();
  for (const lead of await listRecords(store)) {
    if (lead.test || lead.excluded) continue;
    const stagesInWindow = [];
    let revenueInWindow = 0;
    const recent = withinWindow(lead.receivedAt);
    const channel = lead.channel || 'unknown';
    if (recent) {
      rolling30Days.received++;
      if (lead.repeatCustomer) rolling30Days.repeatCustomers++;
      if (!lead.notificationId) rolling30Days.pendingNotification++;
      stagesInWindow.push('received');
      if (lead.milestones.estimate && Date.parse(lead.milestones.estimate) <= now) stagesInWindow.push('cohortEstimate');
      if (lead.milestones.signed && Date.parse(lead.milestones.signed) <= now) stagesInWindow.push('cohortSigned');
    }
    if (lead.notificationId) {
      for (const stage of stages.slice(0, -1)) {
        const at = lead.milestones[stage];
        if (at && monthOf(at) === month) result[stage]++;
        if (withinWindow(at)) {
          stagesInWindow.push(stage);
          rolling30Days[stage]++;
          if (stage === 'qualified' && !lead.repeatCustomer && channel === 'organic-search') rolling30Days.qualifiedOrganic++;
        }
      }
      for (const payment of Object.values(lead.payments || {})) {
        if (monthOf(payment.at) === month) result.revenueCents += payment.cents;
        if (withinWindow(payment.at)) revenueInWindow += payment.cents;
      }
    }
    rolling30Days.revenueCents += revenueInWindow;
    if (stagesInWindow.length || revenueInWindow) {
      addBreakdown(breakdowns.byChannel, channel, stagesInWindow, revenueInWindow);
      if (lead.campaign) addBreakdown(breakdowns.byCampaign, lead.campaign, stagesInWindow, revenueInWindow);
      for (const service of new Set(lead.categories)) addBreakdown(breakdowns.byService, service, stagesInWindow);
    }
    const inMonth = monthOf(lead.receivedAt) === month;
    if (!inMonth && !recent) continue;
    if (inMonth) result.received++;
    if (inMonth && !lead.notificationId) result.pendingNotification++;
    const source = lead.utmSource || lead.campaign || lead.source || lead.kind;
    if (inMonth) sources.set(source, (sources.get(source) || 0) + 1);
    for (const [name, id] of [['notification', lead.notificationId], ['acknowledgment', lead.acknowledgmentId]]) {
      if (!id) continue;
      const types = await emailEvents(store, id);
      for (const type of types) {
        if (!mailTypes.includes(type)) continue;
        if (inMonth) result[name][type]++;
        if (recent) rolling30Days[name][type]++;
      }
      if (inMonth && name === 'acknowledgment' && canFollowUp(lead, types)) {
        result.emailFollowUpEligible++;
      }
    }
  }
  for (const [key, group] of Object.entries(breakdowns)) {
    rolling30Days[key] = [...group].map(([label, counts]) => ({label, ...counts}));
  }
  result.sources = [...sources].map(([source, received]) => ({source, received}));
  return result;
}

export async function handler(event, _context, deps = {}) {
  const env = deps.env || process.env;
  const query = event.queryStringParameters || {};
  const admin = authorized(event, env.LEAD_OPERATIONS_TOKEN);
  const readOnly = event.httpMethod === 'GET' && !query.id && !query.view &&
    authorized(event, env.LEAD_OPERATIONS_READ_TOKEN);
  if (!admin && !readOnly) return json(401, {error: 'Unauthorized'});
  try {
    const store = ledger(event, deps);
    if (!store) return json(503, {error: 'Lead storage unavailable'});
    if (event.httpMethod === 'GET') {
      if (query.id) {
        if (!/^[a-f0-9]{64}$/.test(query.id)) return json(400, {error: 'Invalid lead ID'});
        const lead = await store.get('leads/' + query.id, {type: 'json'});
        return lead ? json(200, lead) : json(404, {error: 'Lead not found'});
      }
      if (query.view === 'follow-up') {
        const eligible = [];
        for (const lead of await listRecords(store)) {
          if (lead.acknowledgmentId && canFollowUp(lead, await emailEvents(store, lead.acknowledgmentId))) {
            eligible.push({id: lead.id, receivedAt: lead.receivedAt});
          }
        }
        return json(200, eligible);
      }
      const month = query.month || monthOf(new Date());
      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) return json(400, {error: 'Invalid month'});
      if (query.view === 'pipeline') {
        const records = (await listRecords(store)).filter(lead => monthOf(lead.receivedAt) === month);
        return json(200, records.map(({id, receivedAt, kind, categories, location, channel, repeatCustomer, milestones, test, excluded, notificationId}) =>
          ({id, receivedAt, kind, categories, location, channel, repeatCustomer, milestones, test, excluded, notified: Boolean(notificationId)})));
      }
      return json(200, await report(store, month));
    }
    if (event.httpMethod !== 'PATCH') return json(405, {error: 'Method not allowed'});
    if (Buffer.byteLength(event.body || '') > 4_096) return json(413, {error: 'Payload too large'});
    let data;
    try { data = JSON.parse(event.body || ''); } catch { return json(400, {error: 'Invalid JSON'}); }
    if (typeof data?.id !== 'string' || !/^[a-f0-9]{64}$/.test(data.id)) return json(400, {error: 'Invalid lead ID'});
    const validStage = stages.includes(data.stage);
    if (!validStage && !['exclude', 'stop-follow-up', 'classify', 'followed-up'].includes(data.stage)) return json(400, {error: 'Invalid stage'});
    if (data.stage === 'classify' && (!channels.includes(data.channel) || typeof data.repeatCustomer !== 'boolean')) {
      return json(400, {error: 'Select a channel and customer type'});
    }
    const now = new Date();
    const at = data.at === undefined ? now : new Date(data.at);
    if (data.at !== undefined && (typeof data.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(data.at))) return json(400, {error: 'Use an ISO timestamp'});
    if (!Number.isFinite(at.valueOf()) || at > now) return json(400, {error: 'Invalid timestamp'});
    if (data.stage === 'revenue' && (typeof data.paymentId !== 'string' || !/^[a-z\d_-]{1,64}$/i.test(data.paymentId) ||
      !Number.isSafeInteger(data.cents) || data.cents < 1 || data.cents > 1_000_000_000)) return json(400, {error: 'Invalid payment'});
    const updated = await updateLead(store, 'leads/' + data.id, lead => {
      if (data.stage === 'exclude') return {...lead, excluded: true};
      if (data.stage === 'stop-follow-up') return {...lead, followUpStopped: true};
      if (lead.test || lead.excluded || !lead.notificationId || at < new Date(lead.receivedAt)) return lead;
      if (data.stage === 'classify') return {...lead, channel: data.channel, repeatCustomer: data.repeatCustomer};
      if (data.stage === 'followed-up') return {...lead, lastFollowUpAt: at.toISOString()};
      if (data.stage === 'revenue') {
        if (!lead.milestones.signed || at < new Date(lead.milestones.signed)) return lead;
        return {...lead, payments: {...lead.payments, [data.paymentId]: lead.payments?.[data.paymentId] || {at: at.toISOString(), cents: data.cents}}};
      }
      return {...lead, milestones: {...lead.milestones, [data.stage]: lead.milestones[data.stage] || at.toISOString()}};
    });
    if (!updated) return json(404, {error: 'Lead not found'});
    const recorded = data.stage === 'classify' ? updated.channel === data.channel && updated.repeatCustomer === data.repeatCustomer :
      data.stage === 'followed-up' ? updated.lastFollowUpAt === at.toISOString() : data.stage === 'exclude' ? updated.excluded : data.stage === 'stop-follow-up' ? updated.followUpStopped :
      data.stage === 'revenue' ? updated.payments?.[data.paymentId]?.cents === data.cents : updated.milestones[data.stage];
    return recorded ? json(200, {id: updated.id, stage: data.stage}) : json(409, {error: 'Stage or payment could not be recorded'});
  } catch {
    return json(503, {error: 'Lead operations unavailable'});
  }
}
