import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test('Buckhead service choices preserve location and source without requiring discovery disclosure', () => {
  const page = new JSDOM(fs.readFileSync('remodeling-buckhead-atlanta.html', 'utf8'), {url:'https://bentos-group.com/remodeling-buckhead-atlanta'});
  const links = [...page.window.document.querySelectorAll('a[href*="service="]')];
  assert.equal(links.length,3);
  for(const link of links){
    const form = new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:link.href,runScripts:'outside-only'});
    for(const script of form.window.document.querySelectorAll('script:not([src])')) form.window.eval(script.textContent);
    const d=form.window.document;
    assert.equal(d.querySelector('#location').value,'Buckhead, Atlanta, GA');
    assert.equal(d.querySelector('input[name="Inquiry Source Page"]').value,'/remodeling-buckhead-atlanta');
    const service=new URL(link.href).searchParams.get('service');
    assert.equal(d.querySelector('input[name="Service"]:checked').value,{flooring:'Flooring',kitchen:'Kitchen Remodeling',bathroom:'Bathroom Remodeling'}[service]);
    const discovery=d.querySelector('#discovery-source');
    assert.equal(discovery.required,false);
    assert.equal(discovery.value,'');
    discovery.value='AI assistant (ChatGPT, Gemini, Perplexity or another)';
    const data=new form.window.FormData(d.querySelector('form'));
    assert.equal(data.get('Customer Reported Discovery'),discovery.value);
    assert.equal(data.get('Campaign Source'),null,'self-reported AI discovery must not become paid campaign attribution');
    form.window.close();
  }
  page.window.close();
});
