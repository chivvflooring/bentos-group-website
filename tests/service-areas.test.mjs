import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('service-areas.html', 'utf8');

test('priority service areas expose contextual estimate paths', async () => {
  const dom = new JSDOM(html, { url: 'https://bentos-group.com/service-areas', runScripts: 'outside-only' });
  global.document = dom.window.document;
  await import(`../js/service-areas.js?test=${Date.now()}`);

  const expected = ['alpharetta', 'johns-creek', 'sandy-springs', 'dunwoody', 'buckhead', 'atlanta', 'marietta', 'woodstock', 'acworth'];
  for (const city of expected) {
    const links = [...document.querySelectorAll(`[data-city="${city}"] .card-actions a`)];
    assert.equal(links.length, 3);
    for (const link of links) {
      const url = new URL(link.href);
      assert.equal(url.searchParams.get('city'), city);
      assert.equal(url.searchParams.get('source'), `service-areas-${city}`);
    }
  }
  delete global.document;
});

test('service areas page is discoverable in the sitemap', () => {
  assert.match(fs.readFileSync('sitemap.xml', 'utf8'), /https:\/\/bentos-group\.com\/service-areas/);
});

test('priority city context is accepted by the quote form', () => {
  const quote = fs.readFileSync('free-quote.html', 'utf8');
  for (const city of ['sandy-springs', 'dunwoody', 'buckhead', 'atlanta', 'marietta', 'woodstock', 'acworth']) {
    assert.match(quote, new RegExp(`(?:'${city}'|${city}):`));
  }
  assert.match(quote, /service-areas\(\?:-\[a-z\]\+\)\*/);
});
