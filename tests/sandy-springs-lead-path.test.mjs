import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'hardwood-refinishing-painting-sandy-springs-ga.html';
const html = fs.readFileSync(path, 'utf8');

function jsonLdBlocks(source) {
  return [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, value]) => JSON.parse(value));
}

test('Sandy Springs move-in page is indexable and locally specific', () => {
  assert.match(html, /<title>Hardwood Refinishing &amp; Interior Painting in Sandy Springs, GA/);
  assert.match(html, /rel="canonical" href="https:\/\/bentos-group\.com\/hardwood-refinishing-painting-sandy-springs-ga"/);
  assert.doesNotMatch(html, /GeneralContractor/);

  const graph = jsonLdBlocks(html)[0]['@graph'];
  const service = graph.find(item => item['@type'] === 'Service');
  assert.ok(service, 'Service schema must exist');
  assert.equal(service.areaServed.name, 'Sandy Springs');
  assert.ok(service.serviceType.includes('Hardwood floor sanding and refinishing'));
  assert.ok(service.serviceType.includes('Interior painting'));
});

test('Sandy Springs page separates four qualified project paths', () => {
  for (const service of ['flooring', 'painting', 'kitchen', 'bathroom']) {
    assert.match(html, new RegExp(`service=${service}&amp;city=sandy-springs`));
  }
  assert.match(html, /flooring_project=refinishing/);
  assert.match(html, /property status/i);
  assert.match(html, /access date/i);
  assert.match(html, /listing photos can start/i);
});

test('Sandy Springs page is connected to the site and attribution map', () => {
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const areas = fs.readFileSync('service-areas.html', 'utf8');
  const flooring = fs.readFileSync('hardwood-floor-refinishing.html', 'utf8');
  const painting = fs.readFileSync('painting.html', 'utf8');
  const quote = fs.readFileSync('free-quote.html', 'utf8');

  for (const source of [sitemap, areas, flooring, painting]) {
    assert.match(source, /hardwood-refinishing-painting-sandy-springs-ga/);
  }
  assert.match(quote, /'sandy-springs-move-in': '\/hardwood-refinishing-painting-sandy-springs-ga'/);
});
