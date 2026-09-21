import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test('custom-home page publishes privacy-safe Norcross project proof', () => {
  const dom = new JSDOM(fs.readFileSync('custom-homes.html', 'utf8'));
  const document = dom.window.document;
  const section = document.querySelector('.project-progress');
  assert.ok(section);
  assert.match(section.textContent, /Project in progress/i);
  assert.match(section.textContent, /Norcross, Georgia/i);
  assert.equal(section.querySelectorAll('figure').length, 4);
  for (const image of section.querySelectorAll('img')) {
    assert.ok(image.getAttribute('alt').length > 20);
    assert.equal(image.getAttribute('loading'), 'lazy');
    assert.ok(fs.existsSync(image.getAttribute('src').replace(/^\//, '')));
  }
  assert.doesNotMatch(section.textContent, /Hammond|5206|Arthur/i);
});
