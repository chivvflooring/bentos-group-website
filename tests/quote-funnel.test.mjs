import { JSDOM } from 'jsdom';
import fs from 'node:fs'; import assert from 'node:assert/strict';
(async()=>{
 const helper=await import(process.cwd()+'/js/form-submit.js');
 for(const moduleEnabled of [true,false]) for(const accepted of [true,false]) {
  const dom=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:'http://localhost/free-quote.html?service=flooring&city=johns-creek&appointment=showroom&source=johns-creek-flooring',runScripts:'outside-only'});
  const w=dom.window; await new Promise(r=>w.addEventListener('load',r));
  let requests=0;
  w.fetch=async()=>{requests++;return {ok:true,status:200,json:async()=>({success:accepted?'true':'false'})}};
  w.console.error=()=>{};
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.eval(fs.readFileSync('js/lead-events.js','utf8'));
  for(const s of w.document.querySelectorAll('script:not([src])')) w.eval(s.textContent);
  if(moduleEnabled){
   w.createSubmissionGuard=helper.createSubmissionGuard;
   w.sendFormSubmit=(action,data)=>helper.sendFormSubmit(action,data,w.fetch);
   w.eval(fs.readFileSync('js/free-quote-form.js','utf8').replace(/^import .*;\n/,''));
  }
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const d=w.document;
  assert.equal(d.querySelector('#location').value,'Johns Creek, GA');
  assert.equal(d.querySelector('#showroom-options').open,true);
  assert.equal(d.querySelector('#flooring-details').hidden,false);
  assert.equal(d.querySelector('input[name="_subject"]').value,'New Flooring Estimate Request');
  assert.match(d.querySelector('#success-text-link').href,/submitted%20a%20flooring%20estimate/);
  d.querySelector('#client-name').value='Test Homeowner';d.querySelector('#client-phone').value='6785551234';
  d.querySelector('#reformaForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
  await new Promise(r=>setTimeout(r,20));
  assert.equal(requests,1,`one request: module=${moduleEnabled}`);
  assert.equal((w.dataLayer||[]).filter(x=>x.event==='generate_lead').length,accepted?1:0);
  assert.ok(!JSON.stringify(w.dataLayer).includes('Test Homeowner'));
  if(accepted){
   assert.equal(w.location.search,'?success=1');
   assert.equal(d.activeElement.id,'success-title');d.querySelector('.btn-reset').click();
   assert.equal(w.location.search,'');
   assert.equal(d.querySelector('.btn-submit').disabled,false);
  } else { assert.equal(d.querySelector('#client-name').value,'Test Homeowner'); assert.equal(d.querySelector('.btn-submit').disabled,false); }
  dom.window.close();
 }
 console.log('PASS: main + fallback, one request, accepted/rejected responses, preserved failure entries, context, modal reset, privacy.');
})();
