import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const quoteHtml = fs.readFileSync('free-quote.html', 'utf8');
const events = fs.readFileSync('js/lead-events.js', 'utf8');
function quoteAt(url) {
  const dom = new JSDOM(quoteHtml, {url, runScripts:'outside-only'});
  const script = Array.from(dom.window.document.querySelectorAll('script:not([src])')).find(s => s.textContent.includes('prepareQuoteContext'));
  dom.window.eval(script.textContent);
  dom.window.eval(events);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}

test('flooring project cards preserve the selected project and campaign in the submitted fields', t => {
  const page = new JSDOM(fs.readFileSync('flooring.html','utf8'), {url:'https://bentos-group.com/flooring?campaign=flooring-instagram-organic',runScripts:'outside-only'});
  t.after(() => page.window.close());
  page.window.eval(events);
  page.window.document.dispatchEvent(new page.window.Event('DOMContentLoaded'));
  const links = Array.from(page.window.document.querySelectorAll('.flooring-project-grid a'));
  assert.equal(links.length, 4);
  const expected = new Map([
    ['refinishing', ['Hardwood refinishing', 'Hardwood Refinishing Estimate']],
    ['replacement', ['Replace existing flooring', 'Flooring Replacement Estimate']],
    ['stairs', ['Stairs and railings', 'Stairs & Railings Estimate']],
    ['guidance', ['Not sure / Need guidance', 'Explore Your Flooring Options']]
  ]);
  for (const link of links) {
    const [value, title] = expected.get(new URL(link.href).searchParams.get('flooring_project'));
    const dom = quoteAt(link.href);
    t.after(() => dom.window.close());
    const w = dom.window, d = w.document;
    const form = d.querySelector('form');
    const data = new w.FormData(form);
    assert.equal(data.get('Flooring Project Type'), value);
    assert.equal(data.get('Service'), 'Flooring');
    assert.equal(data.get('Inquiry Source Page'), '/flooring');
    assert.equal(data.get('Campaign Tag'), 'flooring-instagram-organic');
    assert.equal(d.querySelector('h1').textContent, title);
    assert.equal(d.querySelector('#project-details').open, false, 'extra questions remain optional');
    assert.equal(d.querySelector('#flooring-project-type').required, false);
    assert.equal(data.get('_subject'), 'New Flooring Estimate Request');
    assert.equal((w.dataLayer || []).filter(e => e.event === 'generate_lead').length, 0);
    form.reset();
    assert.equal(new w.FormData(form).get('Flooring Project Type'), value);
  }
});

test('visitors can change the suggested flooring project before submission', t => {
  const dom = quoteAt('https://bentos-group.com/free-quote?service=flooring&flooring_project=refinishing');
  t.after(() => dom.window.close());
  const w = dom.window, d = w.document;
  const select = d.querySelector('#flooring-project-type');
  select.value = 'Replace existing flooring';
  select.dispatchEvent(new w.Event('change', {bubbles:true}));
  assert.equal(d.querySelector('h1').textContent, 'Flooring Replacement Estimate');
  assert.equal(new w.FormData(d.querySelector('form')).get('Flooring Project Type'), 'Replace existing flooring');
});

test('unknown, ambiguous and non-flooring URL choices cannot populate project fields or analytics', t => {
  for (const query of [
    'service=flooring&flooring_project=private%40example.com',
    'service=flooring&flooring_project=constructor',
    'service=flooring&flooring_project=refinishing&flooring_project=stairs',
    'service=flooring&service=kitchen&flooring_project=refinishing',
    'service=kitchen&flooring_project=refinishing',
    'flooring_project=refinishing'
  ]) {
    const dom = quoteAt('https://bentos-group.com/free-quote?' + query);
    t.after(() => dom.window.close());
    const w = dom.window, d = w.document;
    assert.equal(d.querySelector('#flooring-project-type').value, '');
    const data = JSON.stringify(Array.from(new w.FormData(d.querySelector('form')).entries()));
    assert.ok(!data.includes('private@example.com'));
    w.bentosTrack('estimate_form_start');
    assert.ok(!JSON.stringify(w.dataLayer).includes('private'));
    assert.ok(!JSON.stringify(w.dataLayer).includes('flooring_project'));
  }
});
