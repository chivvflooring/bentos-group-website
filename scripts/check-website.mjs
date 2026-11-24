import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const origin = 'https://bentos-group.com';
const parse = (text, type = 'text/html') => new JSDOM(text, {contentType: type}).window;
const locs = file => {
  const window = parse(readFileSync(file, 'utf8'), 'application/xml');
  const values = Array.from(window.document.querySelectorAll('loc'), element => element.textContent.trim());
  window.close();
  return values;
};
const sitemapFiles = locs('sitemap-index.xml').map(url => new URL(url).pathname.slice(1));
const routes = sitemapFiles.flatMap(locs);
assert.equal(new Set(routes).size, routes.length, 'Sitemap entries must be unique');
const issues = new Set();
const check = (condition, problem) => { if (!condition) issues.add(problem); };
const fileFor = path => path === '/' ? 'index.html' : decodeURIComponent(path).replace(/^\//, '');
const routeExists = path => {
  const file = fileFor(path);
  return existsSync(file) || existsSync(file + '.html') || existsSync(file.replace(/\/$/, '') + '/index.html');
};
const redirects = new Set(readFileSync('_redirects', 'utf8').split('\n')
  .map(line => line.trim().split(/\s+/)[0]).filter(line => line.startsWith('/')));
for (const route of routes) {
  const url = new URL(route);
  check(url.origin === origin && !url.hash && !url.search, `Invalid sitemap URL ${route}`);
  const file = fileFor(url.pathname);
  const page = [file, file + '.html', file + '/index.html'].find(candidate => existsSync(candidate) && candidate.endsWith('.html'));
  check(page, `Missing sitemap page ${route}`);
  if (!page) continue;
  const window = parse(readFileSync(page, 'utf8'));
  const doc = window.document;
  check(doc.querySelector('link[rel=canonical]')?.getAttribute('href') === route, `Canonical mismatch in ${page}`);
  check(!doc.querySelector('meta[name=robots]')?.content.includes('noindex'), `Sitemap page noindexed in ${page}`);
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(script.textContent); } catch { issues.add(`Invalid structured data in ${page}`); }
  }
  for (const element of doc.querySelectorAll('img[src], a[href]')) {
    const image = element.localName === 'img';
    const target = new URL(element.getAttribute(image ? 'src' : 'href'), route);
    if (!image && ['tel:', 'sms:'].includes(target.protocol)) {
      check(target.pathname === '+16785717028', `Unexpected phone or text destination in ${page}`);
    }
    if (!image && target.protocol === 'mailto:') {
      check(target.pathname.toLowerCase() === 'charlesbgroup@gmail.com', `Unexpected email destination in ${page}`);
    }
    if (image && element.hasAttribute('srcset')) {
      for (const candidate of element.getAttribute('srcset').split(',')) {
        const imageUrl = new URL(candidate.trim().split(/\s+/)[0], route);
        if (imageUrl.origin === origin) check(routeExists(imageUrl.pathname), `Missing responsive image ${imageUrl.pathname} from ${page}`);
      }
    }
    if (target.origin !== origin) continue;
    check(routeExists(target.pathname) || (!image && redirects.has(target.pathname)),
      `Missing ${image ? 'image' : 'link'} ${target.pathname} from ${page}`);
  }
  window.close();
}
assert.equal(issues.size, 0, [...issues].sort().join('\n'));
console.log(`Checked ${routes.length} sitemap pages, canonicals, structured data, links and images.`);

if (process.env.HEALTH_SITE) {
  const site = new URL(process.env.HEALTH_SITE);
  assert.equal(site.protocol, 'https:');
  for (const path of ['/', '/gallery', '/free-quote', '/punch-list', '/robots.txt', '/sitemap-index.xml']) {
    const response = await fetch(new URL(path, site), {signal: AbortSignal.timeout(10_000)});
    assert.equal(response.status, 200, path);
    await response.body?.cancel();
  }
  for (const path of ['quote', 'punch-list']) {
    const response = await fetch(new URL('/.netlify/functions/' + path, site), {signal: AbortSignal.timeout(10_000)});
    assert.equal(response.status, 405, path);
    await response.body?.cancel();
  }
  if (process.env.REQUIRE_LEAD_HEALTH === 'true') {
    assert.ok(process.env.LEAD_OPERATIONS_TOKEN, 'Lead health is required but the read token is missing');
  }
  if (process.env.LEAD_OPERATIONS_TOKEN) {
    const response = await fetch(new URL('/.netlify/functions/lead-operations', site), {
      headers: {Authorization: 'Bearer ' + process.env.LEAD_OPERATIONS_TOKEN},
      redirect: 'error',
      signal: AbortSignal.timeout(20_000)
    });
    assert.equal(response.status, 200, 'Lead operations health');
    const {rolling30Days: report} = await response.json();
    assert.equal(report.pendingNotification, 0, 'Pending owner notifications');
    assert.equal(report.notification.bounced + report.notification.failed + report.notification.complained + report.notification.suppressed,
      0, 'Failed owner notifications');
  }
  console.log('Hosted read-only health checks passed.');
}
