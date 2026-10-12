import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const slug = 'hardwood-floor-refinishing';
const html = fs.readFileSync(`${slug}.html`, 'utf8');
const events = fs.readFileSync('js/lead-events.js', 'utf8');

test('refinishing visitors retain their project, landing page and campaign through the quote path', t => {
  const landing = new JSDOM(html, {url:`https://bentos-group.com/${slug}?campaign=flooring-google-business&email=private@example.com`,runScripts:'outside-only'});
  t.after(() => landing.window.close());
  landing.window.eval(events);
  landing.window.document.dispatchEvent(new landing.window.Event('DOMContentLoaded'));
  const links = Array.from(landing.window.document.querySelectorAll('main a[href*="/free-quote"], .mobile-lead-actions a[href*="/free-quote"], footer a[href*="/free-quote"]'));
  assert.ok(links.length >= 4, 'hero, body, closing and mobile estimate paths are present');
  for (const link of links) {
    const quote = new JSDOM(fs.readFileSync('free-quote.html', 'utf8'), {url:link.href,runScripts:'outside-only'});
    t.after(() => quote.window.close());
    const w = quote.window, d = w.document;
    const context = Array.from(d.querySelectorAll('script:not([src])')).find(s => s.textContent.includes('prepareQuoteContext'));
    w.eval(context.textContent);
    w.eval(events);
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    const data = new w.FormData(d.querySelector('form'));
    assert.equal(data.get('Service'), 'Flooring');
    assert.equal(data.get('Flooring Project Type'), 'Hardwood refinishing');
    assert.equal(data.get('Inquiry Source Page'), `/${slug}`);
    assert.equal(data.get('Campaign Tag'), 'flooring-google-business');
    assert.equal(data.get('_subject'), 'New Flooring Estimate Request');
    assert.equal(d.querySelector('h1').textContent, 'Hardwood Refinishing Estimate');
    assert.equal(d.querySelector('#project-details').open, false);
    assert.ok(!JSON.stringify([...data]).includes('private@example.com'));
    assert.ok(!(w.dataLayer || []).some(e => e.event === 'generate_lead'));
  }
});

test('refinishing service is discoverable and reuses reachable site paths and existing gallery photos', t => {
  const dom = new JSDOM(html, {url:`https://bentos-group.com/${slug}`});
  const d = dom.window.document;
  t.after(() => dom.window.close());
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.match(d.querySelector('h1').textContent, /Hardwood floor refinishing/i);
  assert.equal(d.querySelector('link[rel="canonical"]').href, `https://bentos-group.com/${slug}`);
  assert.equal(d.querySelector('meta[name="robots"]').content, 'index, follow');
  const service = JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(service.url, `https://bentos-group.com/${slug}`);
  assert.equal(service.provider.telephone, '+16785717028');
  assert.match(fs.readFileSync('sitemap.xml','utf8'), new RegExp(`<loc>https://bentos-group.com/${slug}</loc>`));
  assert.ok(fs.readFileSync('flooring.html','utf8').includes(`href="/${slug}"`));
  assert.ok(fs.readFileSync('_redirects','utf8').includes(`/${slug}.html /${slug} 301!`));
  const gallery = fs.readFileSync('gallery.html','utf8');
  for (const img of d.querySelectorAll('main img')) assert.ok(gallery.includes(img.src), 'photo already belongs to the published gallery');
  for (const a of d.querySelectorAll('main a, .mobile-lead-actions a')) {
    const url = new URL(a.href);
    if (url.protocol === 'tel:' || url.protocol === 'sms:') {
      assert.equal(url.pathname, '+16785717028');
    } else if (url.origin === 'https://bentos-group.com') {
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1) + '.html';
      assert.ok(fs.existsSync(file), `${url.pathname} exists`);
    }
  }
});
