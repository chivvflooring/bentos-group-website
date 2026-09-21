import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
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
 assert.equal(commands.filter(x=>x[0]==='event').length,1);
 assert.ok(!JSON.stringify(w.dataLayer).includes('private@example.com'));
 dom.window.close();
});
test('preview domains do not send analytics',()=>{
 const dom=new JSDOM('<head></head>',{url:'https://deploy-preview-14--bentos-group-test.netlify.app',runScripts:'outside-only'});
 dom.window.eval(fs.readFileSync('js/analytics.js','utf8'));
 assert.equal(dom.window.document.querySelectorAll('script').length,0);
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
