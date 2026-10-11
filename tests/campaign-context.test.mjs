import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const events = fs.readFileSync('js/lead-events.js', 'utf8');
function page(file, url) {
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { url, runScripts: 'outside-only' });
  if (file === 'free-quote.html') {
    for (const script of dom.window.document.querySelectorAll('script:not([src])')) dom.window.eval(script.textContent);
  }
  dom.window.eval(events);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}

test('a tagged social visit survives flooring, gallery and quote navigation in the submitted payload', () => {
  const landing = page('flooring.html', 'https://bentos-group.com/flooring?campaign=flooring-instagram-organic&email=private@example.com');
  const galleryLink = landing.window.document.querySelector('a[href^="/gallery"], a[href*="gallery.html"]');
  assert.equal(new URL(galleryLink.href).searchParams.get('campaign'), 'flooring-instagram-organic');
  assert.ok(!galleryLink.href.includes('private'));
  const gallery = page('gallery.html', galleryLink.href);
  const quoteLink = gallery.window.document.querySelector('a[href*="free-quote"]');
  const quote = page('free-quote.html', quoteLink.href);
  const w = quote.window;
  const data = new w.FormData(w.document.getElementById('reformaForm'));
  assert.equal(data.get('Campaign Tag'), 'flooring-instagram-organic');
  assert.equal(data.get('Campaign Label'), 'Instagram organic — Flooring');
  assert.equal(data.getAll('Campaign Tag').length, 1);
  assert.equal(data.get('Inquiry Source Page'), '/gallery');
  w.bentosTrack('generate_lead');
  assert.equal(w.dataLayer.at(-1).bentos_campaign, 'flooring-instagram-organic');
  assert.equal(w.localStorage.length, 0);
  assert.equal(w.sessionStorage.length, 0);
  assert.equal(w.document.cookie, '');
  for (const dom of [landing, gallery, quote]) dom.window.close();
});

test('campaign links preserve service, city, source and anchor while excluding external and contact links', () => {
  const dom = new JSDOM('<body><a id="quote" href="/free-quote?service=flooring&city=roswell&source=flooring#details">Quote</a><a id="outside" href="https://example.com/">Outside</a><a id="phone" href="tel:+16785717028">Call</a><a id="file" href="/assets/example.pdf">PDF</a><a id="anchor" href="#details">Jump</a></body>', {url:'https://bentos-group.com/flooring?campaign=flooring-meta-retargeting', runScripts:'outside-only'});
  const w = dom.window;
  w.eval(events); w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const url = new URL(w.document.getElementById('quote').href);
  assert.equal(url.searchParams.get('campaign'), 'flooring-meta-retargeting');
  assert.equal(url.searchParams.get('service'), 'flooring');
  assert.equal(url.searchParams.get('city'), 'roswell');
  assert.equal(url.searchParams.get('source'), 'flooring');
  assert.equal(url.hash, '#details');
  for (const id of ['outside', 'phone', 'file', 'anchor']) assert.ok(!w.document.getElementById(id).getAttribute('href').includes('campaign='));
  assert.ok(w.document.querySelector('.mobile-estimate').href.includes('campaign=flooring-meta-retargeting'));
  assert.ok(w.document.querySelector('.project-planner__panel>a').href.includes('campaign=flooring-meta-retargeting'));
  dom.window.close();
});

test('unknown and ambiguous tags never enter inquiry fields or events', () => {
  for (const query of ['campaign=private%40example.com', 'campaign=constructor', 'campaign=flooring-instagram-organic&campaign=flooring-meta-retargeting', '']) {
    const dom = page('free-quote.html', 'https://bentos-group.com/free-quote?' + query);
    const w = dom.window;
    assert.equal(w.document.querySelector('[name="Campaign Tag"]'), null);
    w.bentosTrack('estimate_form_start', {bentos_campaign:'private@example.com'});
    assert.equal(w.dataLayer.at(-1).bentos_campaign, undefined);
    assert.ok(!JSON.stringify(w.dataLayer).includes('private'));
    dom.window.close();
  }
});
