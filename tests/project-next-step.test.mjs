import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

for (const [page,source] of [['index','home'],['gallery','gallery']]) {
  test(`${page} project choices lead to the correct service and preserve origin`, () => {
    const dom = new JSDOM(fs.readFileSync(`${page}.html`,'utf8'));
    const links = [...dom.window.document.querySelectorAll('.project-choice')];
    assert.equal(links.length,4);
    assert.equal(new URL(links[0].getAttribute('href'),'https://bentos-group.com').searchParams.get('service'),'new-construction');
    for (const link of links) {
      const href = new URL(link.getAttribute('href'),'https://bentos-group.com');
      assert.equal(href.pathname,'/free-quote');
      assert.equal(href.searchParams.get('source'),source);
      const form = new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:href.href,runScripts:'outside-only'});
      for (const script of form.window.document.querySelectorAll('script:not([src])')) form.window.eval(script.textContent);
      const expected = {'new-construction':'New Construction',flooring:'Flooring',kitchen:'Kitchen Remodeling',bathroom:'Bathroom Remodeling'}[href.searchParams.get('service')];
      assert.equal(form.window.document.querySelector('input[name="Service"]:checked').value,expected);
      assert.equal(form.window.document.querySelector('input[name="Inquiry Source Page"]').value,page==='index'?'/':'/gallery');
      assert.equal(form.window.document.querySelectorAll('input[required]').length,3);
      form.window.close();
    }
    dom.window.close();
  });
}
