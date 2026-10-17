import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
test('a success URL alone never records a quote or opens a confirmation', async t => {
 const dom = new JSDOM(fs.readFileSync('free-quote.html', 'utf8'), {url:'https://bentos-group.com/free-quote?success=1',runScripts:'outside-only'});
 t.after(() => dom.window.close());
 const w = dom.window;
 await new Promise(resolve => w.addEventListener('load', resolve));
 const helper = await import('../js/form-submit.js');
 w.createSubmissionGuard = helper.createSubmissionGuard;
 w.sendFormSubmit = () => { throw new Error('page load cannot submit'); };
 w.eval(fs.readFileSync('js/analytics.js', 'utf8'));
 w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
 w.eval(fs.readFileSync('js/free-quote-form.js','utf8').replace(/^import .*;\n/,''));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.notEqual(w.document.querySelector('#successModal').style.display, 'flex');
 assert.equal(w.dataLayer.filter(x=>x[0]==='event' && ['generate_lead','ads_conversion_Request_quote_1'].includes(x[1])).length,0);
 assert.equal(w.dataLayer.find(x=>x[0]==='config')[2].page_location,'https://bentos-group.com/free-quote');
});

test('QA exclusion requires both the explicit test label and owner address', t => {
 for (const [name, email, expected] of [
  ['SYSTEM TEST NOT A CUSTOMER BENTO-QA-FRESH', ' CharlesBGroup@gmail.com ', 'quote_test_success'],
  ['SYSTEM TEST — NOT A CUSTOMER — BENTO-QA-20261012-1651', 'charlesbgroup@gmail.com', 'quote_test_success'],
  ['Charles Silva', 'charlesbgroup@gmail.com', 'generate_lead'],
  ['SYSTEM TEST NOT A CUSTOMER BENTO-QA-FRESH', 'customer@example.com', 'generate_lead']
 ]) {
  const dom = new JSDOM('<form><input id="client-name"><input id="client-email"></form>',{url:'https://bentos-group.com/free-quote',runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  const w=dom.window;
  w.eval(fs.readFileSync('js/lead-events.js','utf8'));
  w.document.querySelector('#client-name').value=name;
  w.document.querySelector('#client-email').value=email;
  w.bentosTrackQuote(w.document.querySelector('form'));
  assert.equal(w.dataLayer.at(-1).event,expected);
  assert.ok(!JSON.stringify(w.dataLayer).includes(email.trim()));
  assert.ok(!JSON.stringify(w.dataLayer).includes(name));
 }
});

test('production GA4 initializes once and forwards approved events without URL queries', () => {
 const dom = new JSDOM('<head></head><body></body>', {url:'https://bentos-group.com/free-quote?email=private@example.com',runScripts:'outside-only'});
 const w=dom.window;
 const script=fs.readFileSync('js/analytics.js','utf8');
 w.eval(script); w.eval(script); w.eval(fs.readFileSync('js/lead-events.js','utf8'));
 w.bentosTrack('generate_lead'); w.bentosTrack('unknown');
 assert.equal(w.document.querySelectorAll('script').length,1);
 const commands=w.dataLayer.filter(x=>x[0]);
 assert.equal(commands.filter(x=>x[0]==='config').length,1);
 assert.equal(commands.find(x=>x[0]==='config')[1],'G-XRBMTBNP58');
 assert.deepEqual(Array.from(commands.filter(x=>x[0]==='event'),x=>x[1]),[
  'generate_lead','ads_conversion_Request_quote_1'
 ]);
 assert.ok(!JSON.stringify(w.dataLayer).includes('private@example.com'));
 dom.window.close();
});
test('preview domains do not send analytics',()=>{
 const dom=new JSDOM('<head></head>',{url:'https://deploy-preview-14--bentos-group-test.netlify.app',runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync('js/analytics.js','utf8'));
 assert.equal(dom.window.document.querySelectorAll('script').length,0);
 dom.window.close();
});

test('paid attribution survives while contact queries and fragments are excluded',()=>{
 const dom=new JSDOM('<head></head><body></body>',{url:'https://bentos-group.com/flooring?gclid=Test_click-123&gbraid=Test_braid&wbraid=Web_braid&dclid=Display_click&gclsrc=aw.ds&utm_source=google&utm_medium=cpc&utm_campaign=flooring-north-atlanta&utm_id=123&email=private@example.com&phone=1234567890&name=Private&utm_term=private@example.com&utm_content=private@example.com#private-details',runScripts:'outside-only'});
 const w=dom.window;
 w.eval(fs.readFileSync('js/analytics.js','utf8'));
 const config=w.dataLayer.find(x=>x[0]==='config')[2];
 const page=new URL(config.page_location);
 assert.equal(page.searchParams.get('gclid'),'Test_click-123');
 assert.equal(page.searchParams.get('gbraid'),'Test_braid');
 assert.equal(page.searchParams.get('wbraid'),'Web_braid');
 assert.equal(page.searchParams.get('dclid'),'Display_click');
 assert.equal(page.searchParams.get('gclsrc'),'aw.ds');
 assert.equal(page.searchParams.get('utm_source'),'google');
 assert.equal(page.searchParams.get('utm_medium'),'cpc');
 assert.equal(page.searchParams.get('utm_campaign'),'flooring-north-atlanta');
 assert.equal(page.searchParams.get('utm_id'),'123');
 assert.equal([...page.searchParams].length,9);
 assert.equal(page.hash,'');
 assert.ok(!JSON.stringify(w.dataLayer).includes('private'));
 assert.equal(w.dataLayer[0][2].analytics_storage,'denied');
 assert.equal(w.dataLayer[0][2].ad_user_data,'denied');
 dom.window.close();
});

test('ambiguous, malformed and oversized attribution values are discarded',()=>{
 const dom=new JSDOM('<head></head><body></body>',{url:'https://bentos-group.com/flooring?gclid=one&gclid=two&gbraid=private%40example.com&wbraid='+ 'a'.repeat(257)+'&utm_source=&utm_campaign=private%20name',runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync('js/analytics.js','utf8'));
 assert.equal(dom.window.dataLayer.find(x=>x[0]==='config')[2].page_location,'https://bentos-group.com/flooring');
 dom.window.close();
});

test('cookie choice defaults to denied and can be changed later',()=>{
 const dom=new JSDOM('<head></head><body></body>',{url:'https://bentos-group.com/',runScripts:'outside-only'});
 const w=dom.window;
 const script=fs.readFileSync('js/analytics.js','utf8');
 w.eval(script);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const commands=w.dataLayer.filter(x=>x[0]);
 assert.equal(commands[0][0],'consent');
 assert.equal(commands[0][1],'default');
 assert.equal(commands[0][2].analytics_storage,'denied');
 assert.equal(commands[0][2].ad_storage,'denied');
 assert.equal(w.document.querySelectorAll('.bentos-cookie-banner').length,1);
 w.document.querySelector('[data-choice="accept"]').click();
 assert.equal(w.localStorage.getItem('bentos_cookie_choice'),'accept');
 assert.equal(w.dataLayer.at(-1)[1],'update');
 assert.equal(w.dataLayer.at(-1)[2].analytics_storage,'granted');
 assert.equal(w.dataLayer.at(-1)[2].ad_personalization,'denied');
 w.document.querySelector('.bentos-cookie-settings').click();
 w.document.querySelector('[data-choice="reject"]').click();
 assert.equal(w.localStorage.getItem('bentos_cookie_choice'),'reject');
 assert.equal(w.dataLayer.at(-1)[2].analytics_storage,'denied');
 dom.window.close();
});

test('stored cookie rejection remains denied on return',()=>{
 const dom=new JSDOM('<head></head><body></body>',{url:'https://bentos-group.com/',runScripts:'outside-only'});
 dom.window.localStorage.setItem('bentos_cookie_choice','reject');
 dom.window.eval(fs.readFileSync('js/analytics.js','utf8'));
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 assert.equal(dom.window.dataLayer[0][2].analytics_storage,'denied');
 assert.equal(dom.window.document.querySelector('.bentos-cookie-banner'),null);
 assert.ok(dom.window.document.querySelector('.bentos-cookie-settings'));
 dom.window.close();
});

test('content pages receive a service-aware mobile lead path',()=>{
 const dom=new JSDOM('<head></head><body></body>',{url:'https://bentos-group.com/bathroom-remodeling-alpharetta-ga',runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync('js/lead-events.js','utf8'));
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 const bar=dom.window.document.querySelector('.mobile-lead-actions');
 const quote=new URL(bar.querySelector('.mobile-estimate').href);
 assert.equal(quote.pathname,'/free-quote');
 assert.equal(quote.searchParams.get('service'),'bathroom');
 assert.equal(quote.searchParams.get('source'),'bathroom-remodeling-alpharetta-ga');
 assert.equal(bar.querySelector('a[href^="tel:"]').getAttribute('href'),'tel:+16785717028');
 dom.window.close();
});

test('content pages receive an optional, accessible desktop project planner',()=>{
 const dom=new JSDOM('<head></head><body></body>',{url:'https://bentos-group.com/services?email=private@example.com',runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync('js/lead-events.js','utf8'));
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 const planner=dom.window.document.querySelector('.project-planner');
 const toggle=planner.querySelector('.project-planner__toggle');
 const panel=planner.querySelector('.project-planner__panel');
 assert.equal(panel.hidden,true);
 toggle.click();
 assert.equal(panel.hidden,false);
 assert.equal(toggle.getAttribute('aria-expanded'),'true');
 const quote=new URL(panel.querySelector('a[href^="/free-quote"]').href);
 assert.equal(quote.searchParams.get('source'),'project-helper');
 assert.ok(!planner.textContent.includes('private@example.com'));
 planner.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(panel.hidden,true);
 dom.window.close();
});

test('quote page does not add competing lead tools',()=>{
 const dom=new JSDOM('<head></head><body></body>',{url:'https://bentos-group.com/free-quote',runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync('js/lead-events.js','utf8'));
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 assert.equal(dom.window.document.querySelector('.project-planner'),null);
 assert.equal(dom.window.document.querySelector('.mobile-lead-actions'),null);
 dom.window.close();
});

test('every top-level phone and text link is instrumented and keeps the approved number',()=>{
 const pages=fs.readdirSync('.').filter(name=>name.endsWith('.html'));
 let actionCount=0;
 for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  const actions=[...html.matchAll(/href="(tel|sms):([^"]+)"/g)];
  if(!actions.length) continue;
  assert.match(html,/js\/lead-events\.js/,`${page} loads lead event instrumentation`);
  for(const action of actions){
   assert.match(action[2],/^\+16785717028(?:\?|$)/,`${page} keeps the approved business number`);
  }
  actionCount+=actions.length;
 }
 assert.ok(actionCount>0);
});
