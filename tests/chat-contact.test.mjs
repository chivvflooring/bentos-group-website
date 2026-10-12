import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const script = fs.readFileSync('js/chat.js', 'utf8').replace("import { scrollToChatBottom } from './utils.js';", 'function scrollToChatBottom() {}');
function helper(path = '/flooring', setup = () => {}) {
  const dom = new JSDOM(`<body><button class="chat-fab">Open chat</button>
    <div class="chat-container" hidden><div class="chat-header"><button class="close-chat-btn">Close</button></div>
    <div class="chat-messages"></div><div class="chat-input"><input><button>Send</button></div></div></body>`,
    {url: 'https://bentos-group.com' + path, runScripts: 'outside-only'});
  setup(dom.window);
  dom.window.eval(script);
  return dom;
}

test('helper provides real contact paths and routes project intent without sending private messages or false leads', () => {
  const dom = helper('/custom-homes?email=private@example.com');
  const w = dom.window;
  w.eval(fs.readFileSync('js/lead-events.js', 'utf8'));
  const actions = w.document.querySelector('.chat-contact-actions');
  const request = actions.querySelector('a');
  assert.equal(new URL(request.href).searchParams.get('service'), 'new-construction');
  assert.equal(actions.querySelector('a[href^="tel:"]').getAttribute('href'), 'tel:+16785717028');
  assert.equal(actions.querySelector('a[href^="sms:"]').getAttribute('href'), 'sms:+16785717028');
  w.document.querySelector('.chat-fab').click();
  assert.equal(w.document.querySelector('.chat-container').hidden, false);
  w.document.querySelector('.chat-input input').value = 'Hardwood flooring estimate for private@example.com';
  w.document.querySelector('.chat-input button').click();
  assert.equal(new URL(request.href).searchParams.get('service'), 'flooring');
  assert.equal(new URL(request.href).searchParams.get('source'), 'project-helper');
  assert.ok(!request.href.includes('private'));
  assert.match(w.document.querySelector('.chat-messages').textContent, /not sent to the team/);
  request.addEventListener('click', event => event.preventDefault());
  request.click();
  assert.equal(w.dataLayer.filter(event => event.event === 'estimate_cta_click').length, 1);
  assert.equal(w.dataLayer.filter(event => event.event === 'generate_lead').length, 0);
  assert.ok(!JSON.stringify(w.dataLayer).includes('private'));
  w.document.querySelector('.close-chat-btn').click();
  assert.equal(w.document.querySelector('.chat-container').hidden, true);
  dom.window.close();
});

test('corrupt or unavailable browser storage does not disable contact paths or the helper', () => {
  for (const setup of [
    w => w.sessionStorage.setItem('bentos_project_helper_history', '{broken'),
    w => w.sessionStorage.setItem('bentos_project_helper_history', JSON.stringify([{role:'assistant', sender: {}, content: null}])),
    w => Object.defineProperty(w, 'sessionStorage', {get() { throw new Error('Storage unavailable'); }})
  ]) {
    const dom = helper('/kitchen-remodeling-service', setup);
    const w = dom.window;
    assert.equal(w.document.querySelector('.chat-contact-actions a').search, '?source=project-helper&service=kitchen');
    w.document.querySelector('.chat-fab').click();
    w.document.querySelector('.chat-input input').value = 'I want a bathroom renovation';
    w.document.querySelector('.chat-input button').click();
    assert.match(w.document.querySelector('.chat-contact-actions a').href, /service=bathroom/);
    assert.equal(w.document.querySelectorAll('.message-wrapper').length, 3);
    dom.window.close();
  }
});
