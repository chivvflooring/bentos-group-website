import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSubmissionGuard, sendFormSubmit } from '../js/form-submit.js';

async function quote(service = 'new-construction', moduleEnabled = true) {
  const dom = new JSDOM(fs.readFileSync('free-quote.html', 'utf8'), {
    url: `https://bentos-group.com/free-quote?service=${service}&source=custom-homes`, runScripts: 'outside-only'
  });
  const w = dom.window;
  await new Promise(resolve => w.addEventListener('load', resolve));
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const requests = [];
  w.fetch = async (_, options) => {
    requests.push(Object.fromEntries(options.body));
    return { ok: true, json: async () => ({ success: true }) };
  };
  w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
  for (const s of w.document.querySelectorAll('script:not([src])')) w.eval(s.textContent);
  if (moduleEnabled) {
    w.createSubmissionGuard = createSubmissionGuard;
    w.sendFormSubmit = (action, data) => sendFormSubmit(action, data, w.fetch);
    w.eval(fs.readFileSync('js/free-quote-form.js', 'utf8').replace(/^import .*;\n/, ''));
  }
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  for (const [id, value] of Object.entries({ 'client-name': 'Private Homeowner', 'client-phone': '6785550123', location: 'Norcross' })) w.document.getElementById(id).value = value;
  return { dom, w, d: w.document, requests };
}

for (const moduleEnabled of [true, false]) for (const includeDetails of [true, false]) {
  test(`custom-home inquiry retains optional planning details: module=${moduleEnabled}, filled=${includeDetails}`, async () => {
    const { dom, w, d, requests } = await quote('new-construction', moduleEnabled);
    try {
      assert.equal(d.querySelector('#custom-home-options').open, true);
      assert.equal(d.querySelector('#floor-area').disabled, true);
      assert.equal(d.querySelector('#showroom-options').open, false);
      const details = { 'lot-status': 'Lot under contract', 'plans-status': 'Preliminary drawings available', 'home-size': '3200', 'budget-scope': 'Excludes land purchase' };
      if (includeDetails) for (const [id, value] of Object.entries(details)) d.getElementById(id).value = value;
      assert.equal(d.querySelector('#reformaForm').checkValidity(), true);
      d.querySelector('#reformaForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 25));
      assert.equal(requests.length, 1);
      assert.equal(requests[0]._subject, 'New Custom Home Consultation Request');
      assert.equal(requests[0]['Inquiry Source Page'], '/custom-homes');
      for (const [id, value] of Object.entries(details)) assert.equal(requests[0][d.getElementById(id).name], includeDetails ? value : '');
      assert.equal(requests[0]['Square Footage'], undefined);
      assert.equal(d.querySelector('input[name="_subject"]').value, 'New Custom Home Consultation Request', 'reset preserves routing');
      assert.equal(d.querySelector('#home-size').value, '');
      assert.equal(w.dataLayer.filter(x => x.event === 'generate_lead').length, 1);
      assert.doesNotMatch(JSON.stringify(w.dataLayer), /Private Homeowner|6785550123|3200|Lot under contract/);
    } finally { dom.window.close(); }
  });
}

test('flooring keeps compact form; changing services excludes stale home details from submission', async () => {
  const { dom, w, d } = await quote('flooring');
  try {
    const box = d.querySelector('input[value="New Construction"]');
    const home = d.querySelector('#custom-home-options');
    assert.equal(home.hidden, true);
    assert.equal(d.querySelector('#project-details').open, false);
    box.checked = true; box.dispatchEvent(new w.Event('change'));
    assert.equal(home.hidden, false);
    d.querySelector('#home-size').value = '3200';
    box.checked = false; box.dispatchEvent(new w.Event('change'));
    const data = new w.FormData(d.querySelector('form'));
    assert.equal(home.hidden, true);
    assert.equal(data.has('Custom Home Size Sq Ft'), false);
    assert.equal(d.querySelector('#floor-area').disabled, false);
    assert.equal(data.get('_subject'), 'New Flooring Estimate Request');
  } finally { dom.window.close(); }
});

test('booking clicks are separate from leads and do not send destination or customer data', () => {
  const dom = new JSDOM(fs.readFileSync('custom-homes.html', 'utf8'), { url: 'https://bentos-group.com/custom-homes', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
  w.document.addEventListener('click', event => event.preventDefault());
  const link = w.document.querySelector('[data-booking-service]');
  link.click();
  assert.deepEqual(JSON.parse(JSON.stringify(w.dataLayer)), [{ event: 'booking_click', page_path: '/custom-homes', project_service: 'new-construction' }]);
  link.href = 'https://example.com/?phone=6785550123'; link.click();
  assert.equal(w.dataLayer.length, 1, 'unapproved booking destinations are not tracked');
  dom.window.close();
});
