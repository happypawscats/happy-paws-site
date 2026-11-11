import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ageBand, ageText, colourText, donationText, goodWithText, healthText,
  slugify, statusInfo, storyParagraphs, transformPets, assignSlugs,
} from '../lib/transform.mjs';

const NOW = new Date('2026-11-10T12:00:00Z');
const fixture = async () => JSON.parse(await readFile(new URL('../fixtures/pets.sample.json', import.meta.url), 'utf8'));

test('age bands follow the client\'s rule: kitten under a year, senior over ten', () => {
  assert.equal(ageBand('2026-06-02', null, NOW), 'Kitten');
  assert.equal(ageBand('2025-11-11', null, NOW), 'Kitten');      // one day short of a year
  assert.equal(ageBand('2025-11-10', null, NOW), 'Adult');       // exactly a year
  assert.equal(ageBand('2016-11-10', null, NOW), 'Adult');       // exactly ten years
  assert.equal(ageBand('2016-11-09', null, NOW), 'Senior');      // a day over ten
  assert.equal(ageBand('2014-02-20', null, NOW), 'Senior');
});
test('with no date of birth the stage is used, otherwise Adult', () => {
  assert.equal(ageBand(null, 'Baby', NOW), 'Kitten');
  assert.equal(ageBand(null, 'Senior', NOW), 'Senior');
  assert.equal(ageBand(null, 'Young', NOW), 'Adult');
  assert.equal(ageBand(null, null, NOW), 'Adult');
  assert.equal(ageBand('not a date', null, NOW), 'Adult');
  assert.equal(ageBand('2030-01-01', null, NOW), 'Adult');       // a date in the future is ignored
});
test('age text reads naturally', () => {
  assert.equal(ageText('2026-11-05', null, NOW), 'Under 1 week');
  assert.equal(ageText('2026-10-27', null, NOW), '2 weeks');
  assert.equal(ageText('2026-10-09', null, NOW), '1 month');
  assert.equal(ageText('2026-06-02', null, NOW), '5 months');
  assert.equal(ageText('2025-06-10', null, NOW), '1 year 5 months');
  assert.equal(ageText('2022-11-10', null, NOW), '4 years');
  assert.equal(ageText('2014-02-20', null, NOW), '12 years');
  assert.equal(ageText(null, '2 years', NOW), '2 years');
  assert.equal(ageText(null, null, NOW), 'Age not known');
});
test('only Adoptable and Pending adoption are published', () => {
  assert.deepEqual(statusInfo('Adoptable'), { publish: true, reserved: false });
  assert.deepEqual(statusInfo(' pending ADOPTION '), { publish: true, reserved: true });
  for (const s of ['In foster', 'Adopted', 'Died in care', '', null, undefined, 'constructor']) assert.equal(statusInfo(s).publish, false, String(s));
});
test('text helpers', () => {
  assert.equal(colourText(['Ginger', 'White']), 'Ginger and white');
  assert.equal(colourText(['Black', 'white', 'TABBY']), 'Black, white and tabby');
  assert.equal(colourText([]), 'Not recorded');
  assert.equal(goodWithText({ dogs: null, cats: true, children: true }), 'Cats and children');
  assert.equal(goodWithText({ dogs: false, cats: true, children: null }), 'Cats. Not suited to dogs');
  assert.equal(goodWithText({}), 'Ask us');
  assert.equal(healthText({ altered: true, vaccinated: null, microchipped: true }), 'Neutered, microchipped');
  assert.equal(healthText({}), 'Ask us');
  assert.equal(donationText(85), '£85');
  assert.equal(donationText(72.5), '£72.50');
  assert.equal(donationText(0), 'Ask us');
  assert.equal(donationText(null), 'Ask us');
  assert.equal(slugify('Old Smokey!'), 'old-smokey');
  assert.equal(slugify('Zoë'), 'zoe');
  assert.equal(slugify('???'), 'cat');
});
test('story is split into paragraphs and stripped of markup', () => {
  assert.deepEqual(storyParagraphs('One.\n\nTwo <b>bold</b>.\nStill two.', 'X'), ['One.', 'Two bold . Still two.']);
  assert.match(storyParagraphs('', 'Mia')[0], /Mia is looking for a loving home/);
});
test('slugs: a cat keeps its address, a clash gets a suffix', () => {
  const pets = [{ id: 'a-11111', name: 'Poppy' }, { id: 'b-22222', name: 'Poppy' }];
  const first = assignSlugs(pets, []);
  assert.equal(first.get('a-11111'), 'poppy');
  assert.equal(first.get('b-22222'), 'poppy-22222');
  // Poppy B arrived first before; now Poppy A arrives. B must keep its address.
  const kept = assignSlugs(pets, [{ id: 'b-22222', slug: 'poppy' }]);
  assert.equal(kept.get('b-22222'), 'poppy');
  assert.equal(kept.get('a-11111'), 'poppy-11111');
});
test('the whole transform: statuses, reserved, no area, no foster names anywhere', async () => {
  const pets = await fixture();
  const { cats, report } = transformPets(pets, { now: NOW });
  assert.equal(report.received, 7);
  assert.equal(report.notPublished, 1);                          // Ghost, "In foster"
  assert.equal(cats.length, 6);
  assert.equal(report.reserved, 1);
  const bramble = cats.find((c) => c.name === 'Bramble');
  assert.equal(bramble.reserved, true);
  assert.equal(cats.at(-1).name, 'Bramble');                      // reserved cats come last
  assert.equal(cats.find((c) => c.name === 'Old Smokey').age_band, 'Senior');
  assert.ok(cats.every((c) => !('area' in c)), 'no cat carries an area');
  assert.deepEqual(report.noPhotoUrls, ['Camera Shy']);
  assert.equal(new Set(cats.map((c) => c.slug)).size, cats.length);
  // The foster carers' names (and the raw location field) must not appear in anything published.
  const published = JSON.stringify(cats);
  for (const name of ['Test Foster', 'test foster', 'A Foster Nobody Listed', 'location']) {
    assert.ok(!published.toLowerCase().includes(name.toLowerCase()), `leaked: ${name}`);
  }
  // ...and the report never names a foster either.
  const rep = JSON.stringify(report).toLowerCase();
  for (const name of ['test foster', 'a foster nobody listed']) assert.ok(!rep.includes(name), `report leaked: ${name}`);
});
