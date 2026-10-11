import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('free-quote.html', 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

async function fallbackForm(t) {
  const dom = new JSDOM(html, { url: 'https://example.test/free-quote?service=flooring', runScripts: 'outside-only' });
  const w = dom.window;
  t.after(() => w.close());
  await new Promise(resolve => w.addEventListener('load', resolve));
  w.console.error = () => {};
  w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
  for (const script of w.document.querySelectorAll('script:not([src])')) w.eval(script.textContent);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const d = w.document;
  d.querySelector('#client-name').value = 'Test Homeowner';
  d.querySelector('#client-phone').value = '6785551234';
  d.querySelector('#location').value = '30004';
  return { w, d, submit: () => d.querySelector('#reformaForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })) };
}

for (const stalledBody of [false, true]) {
  test(`fallback releases a stalled ${stalledBody ? 'response body' : 'request'} and ignores late acceptance`, async t => {
    const { w, d, submit } = await fallbackForm(t);
    let expire, timerCleared = false, signal, requests = 0, finishProvider;
    w.setTimeout = callback => { expire = callback; return 123; };
    w.clearTimeout = id => { if (id === 123) timerCleared = true; };
    const pending = new Promise(resolve => { finishProvider = resolve; });
    w.fetch = async (_url, options) => {
      requests++; signal = options.signal;
      return stalledBody ? { ok: true, json: () => pending } : pending;
    };
    submit(); submit();
    await tick();
    assert.equal(requests, 1, 'double submit must not send twice');
    assert.equal(d.querySelector('.btn-submit').disabled, true);
    expire();
    await tick();
    assert.equal(signal.aborted, true);
    assert.equal(d.querySelector('.btn-submit').disabled, false, 'visitor must regain control after the deadline');
    assert.equal(d.querySelector('#client-name').value, 'Test Homeowner');
    assert.match(d.querySelector('#formStatus').textContent, /could not confirm/i);
    assert.equal(w.dataLayer.filter(e => e.event === 'estimate_form_error').length, 1);
    assert.equal(timerCleared, true);

    finishProvider(stalledBody ? { success: true } : { ok: true, json: async () => ({ success: true }) });
    await tick();
    assert.equal(w.dataLayer.filter(e => e.event === 'generate_lead').length, 0, 'late acceptance must not turn an uncertain attempt into a tracked lead');
    assert.notEqual(d.querySelector('#successModal').style.display, 'flex');
    assert.equal(d.querySelector('#client-name').value, 'Test Homeowner');
    assert.equal(w.location.search, '?service=flooring');
  });
}

test('direct contact recovery works without form submission and tracks clicks separately', async t => {
  const { w, d } = await fallbackForm(t);
  const links = Array.from(d.querySelectorAll('.quote-contact-options a'));
  assert.deepEqual(links.map(link => link.getAttribute('href')), ['tel:+16785717028', 'sms:+16785717028']);
  w.fetch = () => { throw new Error('contact buttons must not submit the form'); };
  for (const link of links) {
    link.addEventListener('click', e => e.preventDefault());
    link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  }
  assert.equal(w.dataLayer.filter(e => e.event === 'phone_click').length, 1);
  assert.equal(w.dataLayer.filter(e => e.event === 'text_click').length, 1);
  assert.equal(w.dataLayer.filter(e => e.event === 'generate_lead').length, 0);
  assert.ok(!JSON.stringify(w.dataLayer).includes('Test Homeowner'));
  assert.ok(!JSON.stringify(w.dataLayer).includes('6785551234'));
});
