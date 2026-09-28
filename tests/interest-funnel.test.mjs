import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSubmissionGuard, sendFormSubmit } from '../js/form-submit.js';

test('interest signup requires consent and records only an approved topic after provider acceptance', async () => {
  const dom = new JSDOM(fs.readFileSync('floor-care-guide.html', 'utf8'), {
    url: 'https://bentos-group.com/floor-care-guide?email=private@example.com', runScripts: 'outside-only'
  });
  const { window: w } = dom;
  const form = w.document.querySelector('[data-interest-signup]');
  const events = [];
  let sends = 0;
  w.bentosTrack = (...args) => events.push(args);
  w.HTMLFormElement.prototype.reportValidity = function () { return this.checkValidity(); };
  w.createSubmissionGuard = createSubmissionGuard;
  w.sendFormSubmit = async (action, data) => {
    sends++;
    assert.equal(data.get('email'), 'test@example.com');
    assert.equal(data.get('Interest'), 'flooring');
    assert.equal(data.get('Email marketing consent'), 'Yes');
    assert.equal(data.get('Source page'), '/floor-care-guide');
    assert.ok(!JSON.stringify([...data]).includes('private@example.com'));
    return { ok: true };
  };
  w.eval(fs.readFileSync('js/interest-signup.js', 'utf8').replace(/^import .*;\n/, ''));
  form.querySelector('[name="email"]').value = 'test@example.com';
  form.querySelector('[value="flooring"]').checked = true;
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.equal(sends, 0);
  form.querySelector('[name="Email marketing consent"]').checked = true;
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(sends, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'interest_signup');
  assert.equal(events[0][1].interest_topic, 'flooring');
  dom.window.close();
});

test('rejected signup does not report success and leaves values for retry', async () => {
  const dom = new JSDOM(fs.readFileSync('floor-care-guide.html', 'utf8'), {
    url: 'https://bentos-group.com/floor-care-guide', runScripts: 'outside-only'
  });
  const { window: w } = dom;
  const form = w.document.querySelector('[data-interest-signup]');
  const events = [];
  w.bentosTrack = (...args) => events.push(args);
  w.HTMLFormElement.prototype.reportValidity = function () { return this.checkValidity(); };
  w.createSubmissionGuard = createSubmissionGuard;
  w.sendFormSubmit = async () => { throw new Error('Provider rejected'); };
  w.eval(fs.readFileSync('js/interest-signup.js', 'utf8').replace(/^import .*;\n/, ''));
  form.querySelector('[name="email"]').value = 'test@example.com';
  form.querySelector('[value="bathrooms"]').checked = true;
  form.querySelector('[name="Email marketing consent"]').checked = true;
  form.dispatchEvent(new w.Event('submit', { cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(events.length, 0);
  assert.equal(form.querySelector('[name="email"]').value, 'test@example.com');
  assert.equal(form.querySelector('button[type="submit"]').disabled, false);
  dom.window.close();
});
