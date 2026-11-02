import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const slug='shower-reconstruction';
test('every shower estimate path preserves bathroom service, source and contact preference without recording a lead',t=>{
 const landing=new JSDOM(fs.readFileSync(slug+'.html','utf8'),{url:'https://bentos-group.com/'+slug});t.after(()=>landing.window.close());
 const links=[...landing.window.document.querySelectorAll('a[href*="/free-quote"]')];assert.ok(links.length>=4);
 for(const a of links){
  const form=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:a.href,runScripts:'outside-only'});t.after(()=>form.window.close());
  for(const s of form.window.document.querySelectorAll('script:not([src])'))form.window.eval(s.textContent);
  const d=form.window.document;assert.equal(d.querySelector('input[name="Service"]:checked').value,'Bathroom Remodeling');
  assert.equal(d.querySelector('input[name="Inquiry Source Page"]').value,'/'+slug);
  const pref=d.querySelector('#contact-preference');pref.value='Email';pref.dispatchEvent(new form.window.Event('change',{bubbles:true}));
  assert.equal(d.querySelector('#client-phone').required,false);assert.equal(d.querySelector('#client-email').required,true);
  assert.ok(!(form.window.dataLayer||[]).some(x=>x.event==='generate_lead'));
 }
 for(const a of landing.window.document.querySelectorAll('a[href^="tel:"],a[href^="sms:"]'))assert.equal(new URL(a.href).pathname,'+16785717028');
 assert.equal(landing.window.document.querySelectorAll('h1').length,1);
 assert.equal(landing.window.document.querySelector('link[rel="canonical"]').href,'https://bentos-group.com/'+slug);
 JSON.parse(landing.window.document.querySelector('script[type="application/ld+json"]').textContent);
});
