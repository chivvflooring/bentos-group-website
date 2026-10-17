import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSubmissionGuard } from '../js/form-submit.js';

const html = fs.readFileSync('free-quote.html', 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 10));

async function setup(t, moduleEnabled) {
  const dom = new JSDOM(html, { url: 'https://bentos-group.com/free-quote?service=flooring', runScripts: 'outside-only' });
  const w = dom.window;
  t.after(() => w.close());
  await new Promise(resolve => w.addEventListener('load', resolve));
  const d = w.document, delivered = [];
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.console.error = () => {};
  w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
  for (const script of d.querySelectorAll('script:not([src])')) w.eval(script.textContent);
  const capture = data => { delivered.push(Object.fromEntries(data)); };
  w.fetch = async (_url, options) => { capture(options.body); return { ok: true, json: async () => ({ success: true }) }; };
  if (moduleEnabled) {
    w.createSubmissionGuard = createSubmissionGuard;
    w.sendFormSubmit = async (_action, data) => { capture(data); };
    w.eval(fs.readFileSync('js/free-quote-form.js', 'utf8').replace(/^import .*;\n/, ''));
  }
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  d.getElementById('client-name').value = 'Private Example';
  d.getElementById('location').value = 'Alpharetta';
  const preference = value => {
    d.getElementById('contact-preference').value = value;
    d.getElementById('contact-preference').dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const submit = () => d.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  return { w, d, delivered, preference, submit };
}

for (const moduleEnabled of [true, false]) {
  test(`${moduleEnabled ? 'module' : 'fallback'}: email-only customer can request a quote with no phone`, async t => {
    const { w, d, delivered, preference, submit } = await setup(t, moduleEnabled);
    preference('Email');
    d.getElementById('client-email').value = 'private@example.com';
    assert.equal(d.querySelector('form').checkValidity(), true);
    submit(); await tick();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].Phone, '');
    assert.equal(delivered[0]['Preferred Contact Method'], 'Email');
    assert.equal(delivered[0]._replyto, 'private@example.com');
    assert.equal(w.dataLayer.filter(e => e.event === 'generate_lead').length, 1);
    assert.ok(!JSON.stringify(w.dataLayer).includes('private@example.com'));
    // A successful reset restores the default phone path for another request.
    assert.equal(d.getElementById('client-phone').required, true);
    assert.equal(d.getElementById('client-email').required, false);
  });

  for (const method of ['Phone call', 'Text message', 'No preference']) {
    test(`${moduleEnabled ? 'module' : 'fallback'}: ${method} works without email and needs a phone`, async t => {
      const { d, delivered, preference, submit } = await setup(t, moduleEnabled);
      preference(method);
      submit(); await tick();
      assert.equal(delivered.length, 0);
      d.getElementById('client-phone').value = '6785550123';
      submit(); await tick();
      assert.equal(delivered.length, 1);
      assert.equal(delivered[0]['Preferred Contact Method'], method);
      assert.equal(delivered[0]._replyto, undefined);
    });
  }

  for (const email of ['', 'invalid', 'private@example']) {
    test(`${moduleEnabled ? 'module' : 'fallback'}: email preference rejects missing or unusable email (${email || 'empty'})`, async t => {
      const { w, d, delivered, preference, submit } = await setup(t, moduleEnabled);
      preference('Email');
      d.getElementById('client-email').value = email;
      submit(); await tick();
      assert.equal(delivered.length, 0);
      assert.equal(w.dataLayer.filter(e => e.event === 'generate_lead').length, 0);
    });
  }

  test(`${moduleEnabled ? 'module' : 'fallback'}: changing from email to text cannot bypass phone validation`, async t => {
    const { d, delivered, preference, submit } = await setup(t, moduleEnabled);
    preference('Email');
    d.getElementById('client-email').value = 'private@example.com';
    preference('Text message');
    submit(); await tick();
    assert.equal(delivered.length, 0);
    assert.equal(d.getElementById('client-phone').required, true);
  });
}
