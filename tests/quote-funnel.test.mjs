import { JSDOM } from 'jsdom';
import fs from 'node:fs'; import assert from 'node:assert/strict';
(async()=>{
 const helper=await import(process.cwd()+'/js/form-submit.js');
 {
  const dom=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:'http://localhost/free-quote.html?service=flooring',runScripts:'outside-only'});
  const w=dom.window; await new Promise(r=>w.addEventListener('load',r));
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.createSubmissionGuard=helper.createSubmissionGuard;
  w.sendFormSubmit=()=>{throw new Error('invalid form must not submit')};
  w.eval(fs.readFileSync('js/free-quote-form.js','utf8').replace(/^import .*;\n/,''));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.eval(fs.readFileSync('js/lead-events.js','utf8'));
  w.document.querySelector('#reformaForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
  const contextScript=Array.from(w.document.querySelectorAll('script:not([src])')).find(s=>s.textContent.includes("params.get('appointment')"));
  w.eval(contextScript.textContent);
  const first=w.document.querySelector('#client-name');
  assert.equal(w.document.activeElement,first);
  assert.equal(first.getAttribute('aria-invalid'),'true');
  assert.equal(w.dataLayer.filter(x=>x.event==='estimate_form_error' && x.error_type==='validation').length,1);
  assert.equal(w.document.querySelector('#project-details').open,false);
    assert.equal(w.document.querySelector('#showroom-options').open,false);
  first.value='Private Customer';
  first.dispatchEvent(new w.Event('input',{bubbles:true}));
  first.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(w.dataLayer.filter(x=>x.event==='estimate_form_start').length,1);
  const optional=w.document.querySelector('#floor-area');
  optional.dispatchEvent(new w.Event('invalid'));
  assert.equal(w.document.querySelector('#project-details').open,true);
  assert.ok(!JSON.stringify(w.dataLayer).includes('Private Customer'));
  w.bentosTrack('estimate_form_error',{error_type:'Private Customer'});
  assert.equal(w.dataLayer.at(-1).error_type,undefined);
  assert.equal(first.getAttribute('aria-describedby'),'client-name-error');
  assert.equal(w.document.querySelector('#client-name-error').className,'error-message');
  dom.window.close();
 }
 for(const moduleEnabled of [true,false]) for(const accepted of [true,false]) {
  const dom=new JSDOM(fs.readFileSync('free-quote.html','utf8'),{url:'http://localhost/free-quote.html?service=flooring&city=johns-creek&appointment=showroom&source=johns-creek-flooring',runScripts:'outside-only'});
  const w=dom.window; await new Promise(r=>w.addEventListener('load',r));
  let requests=0;
  let deliveredServices;
  w.fetch=async(url, options)=>{requests++;deliveredServices=options.body.getAll('Service');return {ok:true,status:200,json:async()=>({success:accepted?'true':'false'})}};
  w.console.error=()=>{};
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  const ga4Events=[];
  w.bentosAnalyticsReady=true;
  w.gtag=(...args)=>ga4Events.push(args);
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
  d.querySelector('input[name="Service"][value="Bathroom Remodeling"]').checked=true;
  d.querySelector('#reformaForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
  await new Promise(r=>setTimeout(r,20));
  assert.equal((w.dataLayer||[]).filter(x=>x.event==='estimate_form_error' && x.error_type==='delivery').length,accepted?0:1);
  assert.equal(requests,1,`one request: module=${moduleEnabled}`);
  assert.equal(deliveredServices.length,1,`provider receives one combined Service field: module=${moduleEnabled}`);
  assert.ok(deliveredServices[0].includes('Flooring'));
  assert.ok(deliveredServices[0].includes('Bathroom Remodeling'));
  assert.equal((w.dataLayer||[]).filter(x=>x.event==='generate_lead').length,accepted?1:0);
  assert.equal(ga4Events.filter(x=>x[0]==='event'&&x[1]==='ads_conversion_Request_quote_1').length,accepted?1:0);
  assert.ok(!JSON.stringify(w.dataLayer).includes('Test Homeowner'));
  assert.ok(!JSON.stringify(ga4Events).includes('Test Homeowner'));
  assert.ok(!JSON.stringify(ga4Events).includes('6785551234'));
  if(accepted){
   assert.equal(w.location.search,'?success=1');
   assert.equal(d.activeElement.id,'success-title');d.querySelector('.btn-reset').click();
   assert.equal(w.location.search,'');
   assert.equal(d.querySelector('.btn-submit').disabled,false);
  } else { assert.equal(d.querySelector('#client-name').value,'Test Homeowner'); assert.equal(d.querySelector('.btn-submit').disabled,false); }
  dom.window.close();
 }
 console.log('PASS: accessible validation, main + fallback, one request, accepted/rejected responses, preserved failure entries, context, modal reset, privacy.');
})();
