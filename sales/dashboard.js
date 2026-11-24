const $ = id => document.getElementById(id);
const access = $('access');
const update = $('update');
const stage = update.elements.stage;

let token = '';
let selectedId = '';
let session = new AbortController();

function reset() {
  session.abort();
  session = new AbortController();
  token = '';
  selectedId = '';
  $('dashboard').hidden = true;
  $('detail').hidden = true;
  $('lock').hidden = true;
  for (const id of ['metrics', 'breakdowns', 'projects', 'lead', 'status']) $(id).replaceChildren();
  update.reset();
}

async function api(query = {}, data) {
  const response = await fetch('/.netlify/functions/lead-operations?' + new URLSearchParams(query), {
    headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
    method: data ? 'PATCH' : 'GET',
    body: data && JSON.stringify(data),
    cache: 'no-store',
    redirect: 'error',
    signal: session.signal
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

function textElement(tag, value) {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
}

function displayPairs(target, pairs) {
  target.replaceChildren(...pairs.flatMap(([label, value]) =>
    [textElement('dt', label), textElement('dd', value ?? 'Unknown')]));
}

const dollars = cents => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(cents / 100);

async function load() {
  const month = $('period').elements.month.value;
  const [report, projects, eligible] = await Promise.all([
    api({month}), api({view: 'pipeline', month}), api({view: 'follow-up'})
  ]);
  const due = new Set(eligible.map(({id}) => id));
  const rolling = report.rolling30Days;
  displayPairs($('metrics'), [
    ['Qualified organic search leads', rolling.qualifiedOrganic + ' / ' + report.targets.qualified],
    ['Appointments', rolling.appointment], ['Estimates', rolling.estimate + ' / ' + report.targets.estimate],
    ['Signed jobs', rolling.signed + ' / ' + report.targets.signed], ['Revenue received', dollars(rolling.revenueCents)],
    ['Repeat-customer projects', rolling.repeatCustomers], ['Follow-ups eligible', eligible.length],
    ['Notifications pending', rolling.pendingNotification],
    ['Owner emails delivered', rolling.notification.delivered], ['Customer acknowledgments delivered', rolling.acknowledgment.delivered],
    ['Acknowledgments with recorded clicks', rolling.acknowledgment.clicked]
  ]);
  $('breakdowns').replaceChildren(...[
    ['By marketing channel', rolling.byChannel], ['By service', rolling.byService]
  ].map(([title, rows]) => {
    const section = document.createElement('section');
    const list = document.createElement('ul');
    for (const row of rows) {
      const rates = row.received ? (100 * row.cohortEstimate / row.received).toFixed(0) + '% estimated, ' +
        (100 * row.cohortSigned / row.received).toFixed(0) + '% signed' : 'no new projects in period';
      list.append(textElement('li', row.label + ' · ' + row.received + ' received · ' + rates));
    }
    section.append(textElement('h3', title), list);
    return section;
  }));
  $('projects').replaceChildren(...projects.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map(project => {
    const item = document.createElement('li');
    const button = textElement('button', 'Open project');
    button.type = 'button';
    button.addEventListener('click', () => run(() => openProject(project.id)));
    const flags = [project.test && 'Test', project.excluded && 'Excluded', due.has(project.id) && 'Follow-up eligible'].filter(Boolean);
    item.append(textElement('span', [project.receivedAt.slice(0, 10), project.location, project.categories.join(', '), ...flags].join(' · ') + ' '), button);
    return item;
  }));
  $('dashboard').hidden = false;
  $('lock').hidden = false;
}

async function openProject(id) {
  const lead = await api({id});
  selectedId = lead.id;
  displayPairs($('lead'), [
    ['Project', lead.categories.join(', ')], ['Location', lead.location], ['Customer', lead.name],
    ['Email', lead.email], ['Phone', lead.phone], ['Preferred contact', lead.contact], ['Scope', lead.scope],
    ['Source page or campaign', lead.utmSource || lead.campaign || lead.source || lead.reportedSource],
    ['Staff-classified channel', lead.channel], ['Last follow-up', lead.lastFollowUpAt],
    ...Object.entries(lead.milestones), ...Object.entries(lead.projectDetails || {})
  ]);
  update.reset();
  update.elements.channel.value = lead.channel || 'unknown';
  update.elements.repeat.checked = Boolean(lead.repeatCustomer);
  toggleAction();
  $('detail').hidden = false;
  $('detail').scrollIntoView({block: 'nearest'});
}

function toggleAction() {
  $('classification').hidden = stage.value !== 'classify';
  $('payment').hidden = stage.value !== 'revenue';
}

async function run(action) {
  try {
    $('status').textContent = 'Working…';
    await action();
    $('status').textContent = '';
  } catch (error) {
    if (error.name !== 'AbortError') $('status').textContent = error.message;
  }
}

access.addEventListener('submit', event => {
  event.preventDefault();
  reset();
  token = access.elements.token.value;
  access.reset();
  run(load);
});
$('lock').addEventListener('click', reset);
window.addEventListener('pagehide', reset);
$('period').elements.month.value = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', timeZone: 'America/New_York'
}).format(new Date());
$('period').addEventListener('submit', event => {
  event.preventDefault();
  $('detail').hidden = true;
  run(load);
});
stage.addEventListener('change', toggleAction);
update.addEventListener('submit', event => {
  event.preventDefault();
  const {channel, repeat, amount, paymentId} = update.elements;
  const data = {id: selectedId, stage: stage.value};
  if (stage.value === 'classify') Object.assign(data, {channel: channel.value, repeatCustomer: repeat.checked});
  if (stage.value === 'revenue') Object.assign(data, {cents: Math.round(Number(amount.value) * 100), paymentId: paymentId.value});
  if (stage.value === 'exclude' && !window.confirm('Exclude this project from sales reporting?')) return;
  run(async () => {
    await api({}, data);
    await load();
    await openProject(data.id);
  });
});
