import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSubmissionGuard, sendFormSubmit } from '../js/form-submit.js';

async function fixture(fetchResponse) {
 const dom = new JSDOM(fs.readFileSync('cabinetry.html','utf8'), {url:'https://bentos-group.com/cabinetry', runScripts:'outside-only'});
 const w=dom.window;
 await new Promise(resolve=>w.addEventListener('load',resolve));
 w.createSubmissionGuard=createSubmissionGuard;
 const requests=[];
 w.sendFormSubmit=(action,data)=>sendFormSubmit(action,data,async(url,options)=>{requests.push({url,data:options.body});return fetchResponse();});
 w.fetch=async()=>({ok:true,json:async()=>({series_list:[{series_name:'Test series',cabinets:[{id:'sample',name:'Sample cabinet',pricePerFoot:175,image:'/sample.jpg'}]}]})});
 const events=[];
 w.bentosTrack=(...args)=>events.push(args);
 w.eval(fs.readFileSync('js/cabinetry.js','utf8').replace(/^import .*;\n/,''));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 const d=w.document;
 d.querySelector('.cabinet-card').click();
 for(const [id,value] of Object.entries({linearFeet:'20',fullName:'Test Homeowner',email:'test@example.com',phone:'6785551234',zipCode:'30005'})) d.getElementById(id).value=value;
 return {dom,w,d,requests,events,submit:()=>d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}))};
}

test('cabinet request waits for acceptance, prevents duplicates and sends selected style',async()=>{
 let accept;
 const f=await fixture(()=>new Promise(resolve=>{accept=()=>resolve({ok:true,json:async()=>({success:true})});}));
 f.submit();f.submit();
 assert.equal(f.requests.length,1);
 assert.equal(f.d.querySelector('button[type=submit]').disabled,true);
 assert.equal(f.d.querySelector('#success-screen').getAttribute('aria-hidden'),'true');
 assert.equal(f.requests[0].url,'https://formsubmit.co/ajax/charlesbgroup@gmail.com');
 assert.equal(f.requests[0].data.get('Cabinet Style'),'Sample cabinet');
 assert.equal(f.requests[0].data.get('linearFeet'),'20');
 assert.equal(f.requests[0].data.get('fullName'),'Test Homeowner');
 accept();await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(f.d.querySelector('#success-screen').getAttribute('aria-hidden'),'false');
 assert.equal(f.events.filter(([event])=>event==='generate_lead').length,1);
 assert.ok(!JSON.stringify(f.events).includes('Test Homeowner'));
 assert.ok(!JSON.stringify(f.events).includes('6785551234'));
 assert.equal(f.d.activeElement.tagName,'H2');
 f.dom.window.close();
});

for(const failure of ['rejection','network']) test(`cabinet ${failure} preserves entries and does not claim a lead`,async()=>{
 const f=await fixture(()=>{if(failure==='network')throw new TypeError('offline');return {ok:true,json:async()=>({success:false})};});
 f.submit();await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(f.d.querySelector('#success-screen').getAttribute('aria-hidden'),'true');
 assert.equal(f.d.querySelector('#fullName').value,'Test Homeowner');
 assert.equal(f.d.querySelector('button[type=submit]').disabled,false);
 assert.match(f.d.querySelector('#form-error').textContent,/not confirmed/);
 assert.equal(f.events.filter(([event])=>event==='generate_lead').length,0);
 assert.equal(f.events.filter(([event])=>event==='estimate_form_error').length,1);
 f.submit();await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(f.requests.length,2);
 f.dom.window.close();
});
