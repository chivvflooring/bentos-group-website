import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSubmissionGuard } from '../js/form-submit.js';

function installSignup(dom, send) {
  const { window: w } = dom;
  w.HTMLFormElement.prototype.reportValidity = function () { return this.checkValidity(); };
  w.createSubmissionGuard = createSubmissionGuard;
  w.sendInterestSignup = send;
  const script = fs.readFileSync('js/interest-signup.js', 'utf8')
    .replace(/^import .*;\n/, '')
    .replace(/export /g, '')
    .replace('async function sendInterestSignup(payload, fetchImpl = fetch)', 'async function unusedSendInterestSignup(payload, fetchImpl = fetch)')
    .replace('await sendInterestSignup(payload);', 'await window.sendInterestSignup(payload);');
  w.eval(script);
}

test('interest signup requires consent and sends only an approved topic to the bridge', async () => {
  const dom = new JSDOM(fs.readFileSync('floor-care-guide.html', 'utf8'), {
    url: 'https://bentos-group.com/floor-care-guide?email=private@example.com', runScripts: 'outside-only'
  });
  const { window: w } = dom;
  const form = w.document.querySelector('[data-interest-signup]');
  const events = [];
  const payloads = [];
  w.bentosTrack = (...args) => events.push(args);
  installSignup(dom, async payload => payloads.push(payload));

  form.elements.email.value = 'test@example.com';
  form.querySelector('[value="flooring"]').checked = true;
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.equal(payloads.length, 0);

  form.elements.consent.checked = true;
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(payloads.length, 1);
  assert.deepEqual({ ...payloads[0], startedAt: 0 }, {
    email: 'test@example.com', interest: 'flooring', consent: true,
    consentVersion: 'email-marketing-v1-2026-09-29', source: '/floor-care-guide', website: '', startedAt: 0
  });
  assert.ok(!JSON.stringify(payloads[0]).includes('private@example.com'));
  assert.equal(events[0][0], 'interest_signup');
  dom.window.close();
});

test('rejected signup leaves values available for retry', async () => {
  const dom = new JSDOM(fs.readFileSync('floor-care-guide.html', 'utf8'), {
    url: 'https://bentos-group.com/floor-care-guide', runScripts: 'outside-only'
  });
  const form = dom.window.document.querySelector('[data-interest-signup]');
  installSignup(dom, async () => { const error = new Error('Rejected'); error.status = 502; throw error; });
  form.elements.email.value = 'test@example.com';
  form.querySelector('[value="bathrooms"]').checked = true;
  form.elements.consent.checked = true;
  form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(form.elements.email.value, 'test@example.com');
  assert.equal(form.querySelector('button[type="submit"]').disabled, false);
  assert.match(form.querySelector('[role="status"]').textContent, /could not save/i);
  dom.window.close();
});

test('incomplete signup explains missing fields without creating a subscription', () => {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { url: 'https://bentos-group.com/', runScripts: 'outside-only' });
  installSignup(dom, () => assert.fail('invalid form must not send'));
  const form = dom.window.document.querySelector('[data-interest-signup]');
  form.reportValidity();
  assert.match(form.querySelector('[role="status"]').textContent, /valid email address, choose one topic, and check the consent box/);
  dom.window.close();
});

test('unconfirmed signup responses never claim success or discard entries', async () => {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { url: 'https://bentos-group.com/', runScripts: 'outside-only' });
  const w = dom.window;
  w.AbortController = AbortController;
  w.createSubmissionGuard = createSubmissionGuard;
  w.HTMLFormElement.prototype.reportValidity = function () { return this.checkValidity(); };
  w.eval(fs.readFileSync('js/interest-signup.js', 'utf8').replace(/^import .*;\n/, '').replace(/export /g, ''));
  for (const reply of [
    { ok: true, status: 200, json: async () => { throw new Error('HTML response'); } },
    { ok: true, status: 200, json: async () => ({}) },
    { ok: true, status: 200, json: async () => ({ ok: false }) }
  ]) {
    await assert.rejects(w.sendInterestSignup({}, async () => reply));
  }
  assert.equal((await w.sendInterestSignup({}, async () => ({ ok: true, status: 201, json: async () => ({ ok: true }) }))).ok, true);
  w.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
  w.bentosTrack = () => assert.fail('unconfirmed signup must not track a conversion');
  const form = w.document.querySelector('[data-interest-signup]');
  form.elements.email.value = 'bento-qa@example.com';
  form.querySelector('[value="kitchens"]').checked = true;
  form.elements.consent.checked = true;
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(form.elements.email.value, 'bento-qa@example.com');
  assert.equal(form.querySelector('button[type="submit"]').disabled, false);
  assert.equal(form.querySelector('[role="status"] a').getAttribute('href'), '/free-quote');
  assert.equal(form.querySelector('[role="status"] a:last-of-type').getAttribute('href'), 'tel:+16785717028');
  dom.window.close();
});
