import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test('one contact panel replaces the overlapping local chat, routes service intent and never claims a lead', () => {
  for (const [path, service] of [['/flooring', 'flooring'], ['/custom-homes', 'new-construction'], ['/kitchen-remodeling-service', 'kitchen'], ['/bathroom-remodeling-alpharetta-ga', 'bathroom']]) {
    const dom = new JSDOM('<head></head><body><button class="chat-fab">Open chat</button><div class="chat-container"><input></div></body>',
      {url:'https://bentos-group.com' + path + '?email=private@example.com',runScripts:'outside-only'});
    const w = dom.window;
    w.eval(fs.readFileSync('js/lead-events.js','utf8'));
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    assert.equal(w.document.querySelector('.chat-fab'), null);
    assert.equal(w.document.querySelector('.chat-container'), null);
    assert.equal(w.document.querySelectorAll('.project-planner').length, 1);
    const panel = w.document.querySelector('.project-planner__panel');
    w.document.querySelector('.project-planner__toggle').click();
    assert.equal(panel.hidden, false);
    const request = panel.querySelector('a[href^="/free-quote"]');
    assert.equal(new URL(request.href).searchParams.get('service'), service);
    assert.equal(new URL(request.href).searchParams.get('source'), 'project-helper');
    assert.equal(panel.querySelector('a[href^="sms:"]').getAttribute('href'), 'sms:+16785717028');
    request.addEventListener('click', event => event.preventDefault());
    request.click();
    assert.equal(w.dataLayer.filter(item => item.event === 'estimate_cta_click').length, 1);
    assert.ok(!w.dataLayer.some(item => item.event === 'generate_lead'));
    assert.ok(!JSON.stringify(w.dataLayer).includes('private'));
    w.document.querySelector('.project-planner__close').click();
    assert.equal(panel.hidden, true);
    dom.window.close();
  }
});
