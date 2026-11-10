import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test('one contact panel replaces the overlapping local chat, routes service intent and never claims a lead', () => {
  for (const [path, service] of [['/flooring', 'flooring'], ['/custom-homes', 'new-construction'], ['/kitchen-remodeling-service', 'kitchen'], ['/cabinet-renovation', 'kitchen'], ['/bathroom-remodeling-alpharetta-ga', 'bathroom']]) {
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

test('new service pages preserve shower and basement intent in desktop and mobile estimate links', () => {
  for (const [path, service] of [['/shower-reconstruction', 'bathroom'], ['/basement-remodeling', 'basement'], ['/cabinet-renovation', 'kitchen']]) {
    const dom = new JSDOM('<head></head><body></body>', { url: 'https://bentos-group.com' + path, runScripts: 'outside-only' });
    const w = dom.window;
    w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    for (const link of w.document.querySelectorAll('a[href^="/free-quote"]')) {
      assert.equal(new URL(link.href).searchParams.get('service'), service, path);
    }
    dom.window.close();
  }
});

test('site-wide planner records the actual referring page without inventing a source', () => {
  for (const [referrer, expected] of [
    ['https://bentos-group.com/kitchen-remodeling-service?email=private@example.com', '/kitchen-remodeling-service'],
    ['https://bentos-group.com/bathroom-remodeling-alpharetta-ga', '/bathroom-remodeling-alpharetta-ga'],
    ['https://bentos-group.com/', '/'],
    ['https://elsewhere.example/services', 'Direct or unreported'],
    ['', 'Direct or unreported'],
  ]) {
    const dom = new JSDOM(fs.readFileSync('free-quote.html', 'utf8'), {
      url: 'https://bentos-group.com/free-quote?source=project-helper&service=bathroom',
      ...(referrer ? {referrer} : {}), runScripts: 'outside-only',
    });
    const w = dom.window;
    for (const script of w.document.querySelectorAll('script:not([src])')) w.eval(script.textContent);
    assert.equal(w.document.querySelector('input[name="Inquiry Source Page"]').value, expected);
    assert.equal(w.document.querySelector('input[name="Campaign Source"]').value, 'Website project helper');
    assert.equal(w.document.querySelector('input[name="Service"]:checked').value, 'Bathroom Remodeling');
    assert.ok(!w.document.querySelector('input[name="Inquiry Source Page"]').value.includes('private'));
    w.close();
  }
});
