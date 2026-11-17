import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'bathroom-shower-remodeling-sandy-springs-ga.html';
const html = fs.readFileSync(path, 'utf8');

function jsonLdBlocks(source) {
  return [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, value]) => JSON.parse(value));
}

test('Sandy Springs bathroom page is indexable and locally specific', () => {
  assert.match(html, /<title>Bathroom &amp; Shower Remodeling in Sandy Springs, GA/);
  assert.match(html, /rel="canonical" href="https:\/\/bentos-group\.com\/bathroom-shower-remodeling-sandy-springs-ga"/);
  assert.doesNotMatch(html, /GeneralContractor/);
  const graph = jsonLdBlocks(html)[0]['@graph'];
  const service = graph.find(item => item['@type'] === 'Service');
  assert.ok(service, 'Service schema must exist');
  assert.equal(service.areaServed.name, 'Sandy Springs');
  assert.ok(service.serviceType.includes('Bathroom remodeling'));
  assert.ok(service.serviceType.includes('Tub-to-shower conversion'));
});

test('Sandy Springs bathroom page has qualified contact paths and accurate proof', () => {
  assert.match(html, /service=bathroom&amp;city=sandy-springs/);
  assert.match(html, /source=sandy-springs-bathroom/);
  assert.match(html, /href="tel:\+16785717028"/);
  assert.match(html, /href="sms:\+16785717028"/);
  assert.match(html, /bathroom-black-tub\.jpg/);
  assert.match(html, /project location is not represented as Sandy Springs/i);
  assert.match(html, /property status/i);
  assert.match(html, /expected access date/i);
  assert.match(html, /licensed partner/i);
});

test('Sandy Springs bathroom page is connected to navigation, sitemap and attribution', () => {
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const areas = fs.readFileSync('service-areas.html', 'utf8');
  const shower = fs.readFileSync('shower-reconstruction.html', 'utf8');
  const moveIn = fs.readFileSync('hardwood-refinishing-painting-sandy-springs-ga.html', 'utf8');
  const quote = fs.readFileSync('free-quote.html', 'utf8');
  for (const source of [sitemap, areas, shower, moveIn]) {
    assert.match(source, /bathroom-shower-remodeling-sandy-springs-ga/);
  }
  assert.match(quote, /'sandy-springs-bathroom': '\/bathroom-shower-remodeling-sandy-springs-ga'/);
});
