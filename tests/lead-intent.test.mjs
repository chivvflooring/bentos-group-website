import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

test('contact intent and service selection are measured without contact data or false leads', () => {
  const dom = new JSDOM(`<body>
    <a href="mailto:private@example.com?subject=Private"><span>Email</span></a>
    <a href="/free-quote?service=kitchen&email=private@example.com">Kitchen</a>
    <a href="/free-quote?service=private@example.com">Invalid</a>
    <a href="/free-quote?service=bathroom&service=kitchen">Ambiguous</a>
    <a href="https://example.com/free-quote?service=flooring">External</a>
  </body>`, { url: 'https://bentos-group.com/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
  for (const target of w.document.querySelectorAll('span,a:not(:has(span))')) {
    target.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  }
  const events = w.dataLayer.filter(x => x.event);
  assert.deepEqual(Array.from(events, x => x.event), ['email_click', 'estimate_cta_click', 'estimate_cta_click', 'estimate_cta_click']);
  assert.equal(events[1].project_service, 'kitchen');
  assert.equal(events[2].project_service, undefined);
  assert.equal(events[3].project_service, undefined);
  assert.ok(!JSON.stringify(events).includes('private'));
  assert.ok(!events.some(x => x.event === 'generate_lead'));
  dom.window.close();
});
