import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test('approved construction images disclose retouching without implying one project', () => {
  const document = new JSDOM(fs.readFileSync('custom-homes.html', 'utf8')).window.document;
  const section = document.querySelector('[aria-labelledby="more-construction-progress"]');
  assert.match(section.textContent, /separate residential projects/);
  assert.match(section.textContent, /not finished-home photographs or a timeline of one home/);
  const photos = section.querySelectorAll('img[src*="ai-retouched"]');
  assert.equal(photos.length, 2);
  for (const photo of photos) {
    assert.match(photo.alt, /AI-retouched/);
    assert.match(photo.closest('figure').textContent, /AI-retouched/);
    assert.equal(photo.loading || photo.getAttribute('loading'), 'lazy');
    assert.ok(fs.existsSync(photo.getAttribute('src').slice(1)));
  }
  assert.equal(section.querySelectorAll('img[src*="stone-estate-progress"]').length, 0);
});
