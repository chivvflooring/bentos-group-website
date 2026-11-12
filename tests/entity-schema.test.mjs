import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)]
    .map(([, value]) => JSON.parse(value));
}

test('service schemas do not claim Bento’s Group is a licensed general contractor', async () => {
  const files = ['decks.html', 'painting.html'];
  for (const file of files) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    const serialized = JSON.stringify(jsonLdBlocks(html));
    assert.ok(!serialized.includes('GeneralContractor'), `${file} must not use GeneralContractor schema`);
  }
});

test('painting schema matches the visible Sandy Springs and Dunwoody coverage', async () => {
  const html = await readFile(new URL('../painting.html', import.meta.url), 'utf8');
  const service = jsonLdBlocks(html).find(block => block['@type'] === 'Service');
  assert.ok(service, 'painting Service schema must exist');
  assert.ok(service.areaServed.includes('Sandy Springs'));
  assert.ok(service.areaServed.includes('Dunwoody'));
  assert.equal(service.provider['@type'], 'Organization');
  assert.equal(service.provider.alternateName, 'CHIVV Flooring');
});
