import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test('HTML aliases permanently redirect to existing canonical pages without shadowing or loops',()=>{
 const rules=fs.readFileSync('_redirects','utf8').split('\n').filter(line=>line && !line.startsWith('#')).map(line=>line.split(/\s+/));
 for(const [source,target,status] of rules){
  assert.equal(status,'301!');
  assert.notEqual(source,target);
  assert.ok(!target.endsWith('.html'));
  assert.ok(fs.existsSync(source.slice(1)));
  assert.ok(fs.existsSync(target==='/'?'index.html':target.slice(1)+'.html'));
  const dom=new JSDOM(fs.readFileSync(source.slice(1),'utf8'));
  assert.equal(new URL(dom.window.document.querySelector('link[rel=canonical]').href).pathname,target);
  dom.window.close();
 }
 assert.ok(rules.some(([source,target])=>source==='/full-home-renovation-cumming-ga.html' && target==='/full-home-renovation-cumming-ga'));
 assert.ok(rules.some(([source,target])=>source==='/blog.html' && target==='/blog'));
});
