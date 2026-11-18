import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);
const htmlFiles = fs.readdirSync(root).filter(file => file.endsWith('.html'));
const expectedPlaceId = 'ChIJMZqmpDSd9YgRtpdKVZnWEsc';

test('customer review links use one mobile-compatible Google Maps destination', () => {
  let visibleReviewLinks = 0;

  for (const file of htmlFiles) {
    const html = fs.readFileSync(new URL(file, root), 'utf8');
    assert.doesNotMatch(html, /google\.com\/maps\/place\/\?q=place_id:/, `${file} still uses the unreliable legacy Google Maps URL`);

    const dom = new JSDOM(html);
    for (const link of dom.window.document.querySelectorAll('a[href*="google.com/maps"]')) {
      const label = link.textContent.toLowerCase();
      if (!label.includes('review') && !label.includes('google')) continue;

      visibleReviewLinks += 1;
      const url = new URL(link.href);
      assert.equal(url.pathname, '/maps/search/', `${file} uses the supported Maps search path`);
      assert.equal(url.searchParams.get('api'), '1', `${file} includes the Maps URL API flag`);
      assert.equal(url.searchParams.get('query_place_id'), expectedPlaceId, `${file} preserves the verified business place ID`);
      assert.ok(url.searchParams.get('query')?.includes('Bento'), `${file} includes a readable business-name fallback`);
      assert.equal(link.target, '_blank', `${file} opens reviews without replacing the quote page`);
      assert.match(link.rel, /noopener/, `${file} protects the new-tab link`);
      assert.match(link.rel, /noreferrer/, `${file} protects the new-tab link`);
    }

    dom.window.close();
  }

  assert.ok(visibleReviewLinks >= 10, 'the review-link check must cover all service-page proof links');
});
