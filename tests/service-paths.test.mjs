import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
for (const [slug, service, value] of [['flooring','flooring','Flooring'],['painting','painting','painting'],['custom-homes','new-construction','New Construction']]) {
 test(`${slug} inquiry preserves service selection and source`, () => {
  const page = new JSDOM(fs.readFileSync(`${slug}.html`,'utf8'),{url:`https://bentos-group.com/${slug}`});
  const href=page.window.document.querySelector('.hub-actions a').href;
  const form=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:href,runScripts:'outside-only'});
  for(const script of form.window.document.querySelectorAll('script:not([src])')) form.window.eval(script.textContent);
  assert.equal(form.window.document.querySelector('input[name="Service"]:checked').value,value);
  assert.equal(form.window.document.querySelector('input[name="Inquiry Source Page"]').value,`/${slug}`);
  assert.equal(new URL(href).searchParams.get('service'),service);
  assert.equal(page.window.document.querySelectorAll('h1').length,1);
  JSON.parse(page.window.document.querySelector('script[type="application/ld+json"]').textContent);
  form.window.close();page.window.close();
 });
}

test('roofing inquiry preserves service selection and source', () => {
 const page = new JSDOM(fs.readFileSync('roofing.html','utf8'),{url:'https://bentos-group.com/roofing'});
 const href=page.window.document.querySelector('.actions a').href;
 const form=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:href,runScripts:'outside-only'});
 for(const script of form.window.document.querySelectorAll('script:not([src])')) form.window.eval(script.textContent);
 assert.equal(form.window.document.querySelector('input[name="Service"]:checked').value,'Roofing');
 assert.equal(form.window.document.querySelector('input[name="Inquiry Source Page"]').value,'/roofing');
 assert.equal(page.window.document.querySelectorAll('h1').length,1);
 JSON.parse(page.window.document.querySelector('script[type="application/ld+json"]').textContent);
 form.window.close();page.window.close();
});

test('flooring campaign source is preserved without accepting arbitrary labels', () => {
 const tracked=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:'https://bentos-group.com/free-quote?service=flooring&source=google-business-flooring',runScripts:'outside-only'});
 for(const script of tracked.window.document.querySelectorAll('script:not([src])')) tracked.window.eval(script.textContent);
 assert.equal(tracked.window.document.querySelector('input[name="Inquiry Source Page"]').value,'/flooring');
 assert.equal(tracked.window.document.querySelector('input[name="Campaign Source"]').value,'Google Business Profile – Flooring');
 tracked.window.close();

 const untrusted=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:'https://bentos-group.com/free-quote?service=flooring&source=made-up-campaign',runScripts:'outside-only'});
 for(const script of untrusted.window.document.querySelectorAll('script:not([src])')) untrusted.window.eval(script.textContent);
 assert.equal(untrusted.window.document.querySelector('input[name="Inquiry Source Page"]').value,'Direct or unreported');
 assert.equal(untrusted.window.document.querySelector('input[name="Campaign Source"]'),null);
 untrusted.window.close();
});
