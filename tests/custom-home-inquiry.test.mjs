import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

for (const service of ['new-construction', 'flooring']) {
  test(`custom home qualification and form payload: ${service}`, () => {
    const dom = new JSDOM(fs.readFileSync('free-quote.html', 'utf8'), {
      url: `https://bentos-group.com/free-quote?service=${service}&source=custom-homes`,
      runScripts: 'outside-only'
    });
    const w = dom.window;
    for (const script of w.document.querySelectorAll('script:not([src])')) w.eval(script.textContent);
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    const d = w.document;
    assert.equal(d.querySelector('#custom-home-options').open, service === 'new-construction');
    d.querySelector('#lot-status').value = 'I own a lot';
    d.querySelector('#plans-status').value = 'Preliminary drawings available';
    d.querySelector('#home-size').value = '3500';
    d.querySelector('#budget-scope').value = 'Excludes land purchase';
    const data = new w.FormData(d.querySelector('form'));
    assert.equal(data.get('Custom Home Lot Status'), 'I own a lot');
    assert.equal(data.get('Custom Home Plans Status'), 'Preliminary drawings available');
    assert.equal(data.get('Custom Home Size Sq Ft'), '3500');
    assert.equal(data.get('Custom Home Budget Scope'), 'Excludes land purchase');
    assert.equal(d.querySelectorAll('#custom-home-options [required]').length, 0);
    const box = d.querySelector('input[value="New Construction"]');
    box.checked = true;
    box.dispatchEvent(new w.Event('change'));
    assert.equal(d.querySelector('#custom-home-options').open, true);
    dom.window.close();
  });
}
