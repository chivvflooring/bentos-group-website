import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
test('modern-home galleries separate original foundation evidence from design concepts and route inquiries', () => {
  for (const page of ['custom-homes.html', 'gallery.html']) {
    const doc = new JSDOM(readFileSync(page, 'utf8')).window.document;
    const section = doc.querySelector(page === 'custom-homes.html' ? '[aria-labelledby="modern-home-design"]' : '[aria-labelledby="modern-home-gallery"]');
    assert.ok(section);
    assert.doesNotMatch(section.textContent, /Brazil/);
    assert.match(section.textContent, /same house/);
    assert.match(section.textContent, /not completed-project photographs or construction drawings/);
    assert.equal(section.querySelectorAll('img').length, 5);
    for (const img of section.querySelectorAll('img')) {
      assert.ok(existsSync('.' + img.getAttribute('src')));
      assert.ok(img.getAttribute('alt'));
      assert.equal(img.getAttribute('loading'), 'lazy');
      assert.ok(Number(img.getAttribute('width')) > 0);
    }
    const foundation = section.querySelector('img[src$="foundation-progress-approved.webp"]').closest('article');
    assert.match(foundation.textContent, /digitally retouched/);
    assert.match(foundation.textContent, /not a construction drawing/);
    const inquiry = section.querySelector('a[href^="/free-quote"]');
    assert.equal(new URL(inquiry.href, 'https://bentos-group.com').searchParams.get('service'), 'new-construction');
  }
});
