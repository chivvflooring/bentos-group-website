import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'kitchen-cabinet-remodeling-sandy-springs-ga.html';
const html = fs.readFileSync(path, 'utf8');

function jsonLdBlocks(source) {
  return [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, value]) => JSON.parse(value));
}

test('Sandy Springs kitchen page is indexable and locally specific', () => {
  assert.match(html, /<title>Kitchen &amp; Cabinet Remodeling in Sandy Springs, GA/);
  assert.match(html, /rel="canonical" href="https:\/\/bentos-group\.com\/kitchen-cabinet-remodeling-sandy-springs-ga"/);
  assert.doesNotMatch(html, /GeneralContractor/);
  const graph = jsonLdBlocks(html)[0]['@graph'];
  const service = graph.find(item => item['@type'] === 'Service');
  assert.ok(service, 'Service schema must exist');
  assert.equal(service.areaServed.name, 'Sandy Springs');
  assert.ok(service.serviceType.includes('Kitchen remodeling'));
  assert.ok(service.serviceType.includes('Cabinet renovation'));
});

test('Sandy Springs kitchen page qualifies three scopes and preserves contact intent', () => {
  assert.match(html, /Cabinet finish update/);
  assert.match(html, /Replacement cabinetry/);
  assert.match(html, /Complete kitchen renovation/);
  assert.match(html, /service=kitchen&amp;city=sandy-springs/);
  assert.match(html, /source=sandy-springs-kitchen/);
  assert.match(html, /href="tel:\+16785717028"/);
  assert.match(html, /href="sms:\+16785717028"/);
  assert.match(html, /property status/i);
  assert.match(html, /licensed partner/i);
});

test('Sandy Springs kitchen proof is accurately labeled', () => {
  assert.match(html, /kitchen-island\.jpg/);
  assert.match(html, /project location is not represented as Sandy Springs/i);
  assert.match(html, /kitchen-cabinet-project-progress\.webp/);
  assert.match(html, /not a finished-room rendering or a Sandy Springs location claim/i);
});

test('Sandy Springs kitchen page is connected to navigation, sitemap and attribution', () => {
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const areas = fs.readFileSync('service-areas.html', 'utf8');
  const cabinets = fs.readFileSync('cabinet-renovation.html', 'utf8');
  const kitchen = fs.readFileSync('kitchen-remodeling-service.html', 'utf8');
  const moveIn = fs.readFileSync('hardwood-refinishing-painting-sandy-springs-ga.html', 'utf8');
  const quote = fs.readFileSync('free-quote.html', 'utf8');
  for (const source of [sitemap, areas, cabinets, kitchen, moveIn]) {
    assert.match(source, /kitchen-cabinet-remodeling-sandy-springs-ga/);
  }
  assert.match(quote, /'sandy-springs-kitchen': '\/kitchen-cabinet-remodeling-sandy-springs-ga'/);
});
