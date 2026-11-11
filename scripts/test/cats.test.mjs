// Checks the Cats section of the page editor: what an editor-saved cat becomes on the site, and that
// the editor's settings and the loader (lib/cats.js) agree. Run with `npm run test:cats` or `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, cp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const { loadEditorCats, catFromEditorFile, isDraft, FOCUS, BANDS } = require('../../lib/cats.js');
const { MODES } = require('../../lib/listing.js');
const root = path.resolve(new URL('../..', import.meta.url).pathname);
const fixtures = path.join(root, 'scripts/fixtures/editor-cats');

const config = yaml.load(await readFile(path.join(root, 'src/static/admin/config.yml'), 'utf8'));
const catsCollection = config.collections.find((c) => c.name === 'cats');
const settingCollection = config.collections.find((c) => c.name === 'cats_list');

// A scratch photo folder holding the photos the fixtures name.
async function photoFolder() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hp-cats-'));
  await mkdir(path.join(dir, 'cat-photos'));
  for (const f of ['poppy-1.jpg', 'poppy-2.jpg', 'smokey.jpg', 'mittens.jpg']) await writeFile(path.join(dir, 'cat-photos', f), 'x');
  return dir;
}
const quiet = () => { const warnings = []; return { warnings, warn: (m) => warnings.push(m) }; };

test('the editor saves cats as JSON files in the folder the loader reads, with photos in their own folder', () => {
  assert.equal(catsCollection.folder, 'src/cats/items');
  assert.equal(catsCollection.format, 'json');
  assert.equal(catsCollection.extension, 'json');
  assert.equal(catsCollection.create, true);
  assert.equal(catsCollection.delete, true);
  assert.equal(catsCollection.media_folder, '/src/images/cat-photos');
  assert.equal(catsCollection.public_folder, '/images/cat-photos');
});

test('every field in the editor reaches the site, and a cat needs only the basics', async () => {
  const names = catsCollection.fields.map((f) => f.name);
  assert.deepEqual(names.sort(), ['age_band', 'age_text', 'colour', 'donation', 'good_with', 'health', 'listed', 'name', 'photos', 'reserved', 'sex', 'story', 'tagline'].sort());
  const dir = await photoFolder();
  const { warnings, warn } = quiet();
  const [poppy] = await loadEditorCats({ dir: fixtures, imagesDir: dir, warn }).then((l) => l.filter((c) => c.name === 'Poppy'));
  assert.deepEqual(warnings, []);
  assert.equal(poppy.slug, 'poppy');
  assert.equal(poppy.age_band, 'Kitten');
  assert.equal(poppy.age_text, '8 months');
  assert.equal(poppy.sex, 'Female');
  assert.equal(poppy.colour, 'Tortoiseshell');
  assert.equal(poppy.reserved, false);
  assert.equal(poppy.good_with, 'Children and other cats');
  assert.equal(poppy.health, 'Neutered, vaccinated and microchipped');
  assert.equal(poppy.donation, '£60');
  assert.equal(poppy.listedAt, '2026-11-05');
  assert.deepEqual(poppy.story, ['Poppy came to us as a stray. She is playful and loves a lap.', 'She would suit a family with other cats.']);
  assert.equal(poppy.tagline, 'Poppy came to us as a stray.', 'an empty one-line summary falls back to the story');
});

test('photos: the editor path becomes a site path, the focus becomes a crop, and a missing alt gets a sensible one', async () => {
  const dir = await photoFolder();
  const list = await loadEditorCats({ dir: fixtures, imagesDir: dir, warn: () => {} });
  const poppy = list.find((c) => c.name === 'Poppy');
  assert.deepEqual(poppy.photos[0], { src: 'cat-photos/poppy-1.jpg', alt: 'Poppy asleep on a blanket', pos: FOCUS.top });
  assert.equal(poppy.photos[1].alt, 'Poppy, a tortoiseshell cat');
  assert.equal(poppy.photos[1].pos, FOCUS.middle);
  const mittens = list.find((c) => c.name === 'Mittens');
  assert.equal(mittens.photos[0].pos, FOCUS.bottom);
  const smokey = list.find((c) => c.name === 'Old Smokey');
  assert.equal(smokey.photos[0].alt, 'Old Smokey, a cat looking for a home');
});

test('anything left empty gets the same plain defaults the Pawlytics sync uses', async () => {
  const dir = await photoFolder();
  const list = await loadEditorCats({ dir: fixtures, imagesDir: dir, warn: () => {} });
  const smokey = list.find((c) => c.name === 'Old Smokey');
  assert.equal(smokey.colour, 'Not recorded');
  assert.equal(smokey.good_with, 'Ask us');
  assert.equal(smokey.health, 'Ask us');
  assert.equal(smokey.donation, 'Ask us');
  assert.equal(smokey.reserved, true);
  const mittens = list.find((c) => c.name === 'Mittens');
  assert.match(mittens.story[0], /Mittens is looking for a loving home/);
});

test('the order matches the sync: reserved cats last, then newest first', async () => {
  const dir = await photoFolder();
  const list = await loadEditorCats({ dir: fixtures, imagesDir: dir, warn: () => {} });
  assert.deepEqual(list.map((c) => c.name), ['Poppy', 'Mittens', 'Old Smokey']);
});

test('a cat that cannot be shown is left out with a plain warning, and the rest still show', async () => {
  const dir = await photoFolder();
  const work = await mkdtemp(path.join(os.tmpdir(), 'hp-cats-in-'));
  await cp(fixtures, work, { recursive: true });
  await writeFile(path.join(work, 'no-photo.json'), JSON.stringify({ name: 'No Photo', age_band: 'Adult', sex: 'Male', story: 'x', photos: [] }));
  await writeFile(path.join(work, 'lost-photo.json'), JSON.stringify({ name: 'Lost Photo', age_band: 'Adult', sex: 'Male', story: 'x', photos: [{ image: '/images/cat-photos/deleted.jpg' }] }));
  await writeFile(path.join(work, 'no-name.json'), JSON.stringify({ age_band: 'Adult', photos: [{ image: '/images/cat-photos/smokey.jpg' }] }));
  await writeFile(path.join(work, 'broken.json'), '{ not json');
  const { warnings, warn } = quiet();
  const notes = [];
  const list = await loadEditorCats({ dir: work, imagesDir: dir, warn, info: (m) => notes.push(m) });
  assert.deepEqual(list.map((c) => c.name), ['Poppy', 'Mittens', 'Old Smokey']);
  assert.equal(warnings.length, 4);               // the lost photo (twice), the nameless cat, the broken file
  assert.ok(warnings.some((w) => /deleted\.jpg/.test(w)));
  assert.ok(warnings.some((w) => /broken\.json could not be read/.test(w)));
  assert.ok(!warnings.some((w) => /No Photo/.test(w)), 'a cat with no photo yet is a draft, not a problem');
  assert.equal(notes.length, 1);
  assert.match(notes[0], /1 cat is waiting for a photo and not listed yet: No Photo\./);
});

test('a draft (a cat with no photo yet, such as one started from the pet list) is left out quietly', async () => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'hp-cats-drafts-'));
  await writeFile(path.join(work, 'roxy.json'), JSON.stringify({ name: 'Roxy', age_band: '', age_text: '', sex: 'Female', reserved: false, story: '', listed: '2026-07-02', photos: [] }));
  await writeFile(path.join(work, 'jesse.json'), JSON.stringify({ name: 'Jesse', age_band: 'Kitten', age_text: '7 months', sex: 'Female', reserved: true, story: '', listed: '2026-06-05', photos: [] }));
  const { warnings, warn } = quiet();
  const notes = [];
  const list = await loadEditorCats({ dir: work, imagesDir: '/nonexistent', warn, info: (m) => notes.push(m) });
  assert.deepEqual(list, []);
  assert.deepEqual(warnings, []);
  assert.match(notes[0], /2 cats are waiting for a photo and not listed yet: Jesse, Roxy\./);
  assert.equal(isDraft({ photos: [] }), true);
  assert.equal(isDraft({ photos: [{ image: '' }] }), true);
  assert.equal(isDraft({}), true);
  assert.equal(isDraft({ photos: [{ image: '/images/cat-photos/a.jpg' }] }), false);
});

test('an unknown age group is shown as Adult rather than losing the cat', async () => {
  const dir = await photoFolder();
  const warnings = [];
  const transform = { storyParagraphs: () => ['x'], taglineFrom: () => 'x' };
  const cat = catFromEditorFile('a', { name: 'A', age_band: 'Teen', photos: [{ image: '/images/cat-photos/smokey.jpg' }] }, { imagesDir: dir, warn: (m) => warnings.push(m), transform });
  assert.equal(cat.age_band, 'Adult');
  assert.match(warnings.join(' '), /age group "Teen"/);
});

test('the editor offers exactly the choices the site understands', () => {
  const band = catsCollection.fields.find((f) => f.name === 'age_band');
  assert.deepEqual(band.options.map((o) => o.value), BANDS);
  const sex = catsCollection.fields.find((f) => f.name === 'sex');
  assert.deepEqual(sex.options, ['Female', 'Male']);
  const photos = catsCollection.fields.find((f) => f.name === 'photos');
  const focus = photos.fields.find((f) => f.name === 'focus');
  assert.deepEqual(focus.options.map((o) => o.value).sort(), Object.keys(FOCUS).sort());
  assert.deepEqual(photos.fields.map((f) => f.name), ['image', 'alt', 'focus']);
  assert.equal(photos.min, 1);
  assert.equal(photos.max, 6);
});

test('the setting that chooses the cat list: the shipped value is allowed, and the editor offers only lists that work', async () => {
  const shipped = JSON.parse(await readFile(path.join(root, 'src/_data/catsListing.json'), 'utf8'));
  assert.ok(MODES.includes(shipped.mode), `catsListing.json says "${shipped.mode}"`);
  const field = settingCollection.files[0].fields[0];
  assert.equal(settingCollection.files[0].file, 'src/_data/catsListing.json');
  assert.equal(field.name, 'mode');
  for (const o of field.options) assert.ok(MODES.includes(o.value), `the editor offers "${o.value}", which the site does not know`);
  assert.ok(field.options.some((o) => o.value === shipped.mode), 'the shipped setting is one the editor can show');
});

test('every cat file shipped in the project either loads or is a draft, without a warning', async () => {
  const dir = path.join(root, 'src/cats/items');
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith('.json')); } catch { /* none yet */ }
  const drafts = [];
  for (const f of files) if (isDraft(JSON.parse(await readFile(path.join(dir, f), 'utf8')))) drafts.push(f);
  const { warnings, warn } = quiet();
  const list = await loadEditorCats({ dir, imagesDir: path.join(root, 'src/images'), warn, info: () => {} });
  assert.deepEqual(warnings, []);
  assert.equal(list.length, files.length - drafts.length);
});

test('every shipped draft is something the editor can open and finish: only fields it has, nothing private', async () => {
  const dir = path.join(root, 'src/cats/items');
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith('.json')); } catch { /* none yet */ }
  const fieldNames = catsCollection.fields.map((f) => f.name);
  const bands = new Set(['', ...BANDS]);
  for (const f of files) {
    const data = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
    for (const k of Object.keys(data)) assert.ok(fieldNames.includes(k), `${f} has "${k}", which the editor does not have`);
    assert.ok(bands.has(data.age_band ?? ''), `${f}: age group "${data.age_band}"`);
    assert.ok(['', 'Female', 'Male'].includes(data.sex ?? ''), `${f}: sex "${data.sex}"`);
    assert.ok(String(data.name || '').trim(), `${f} has no name`);
  }
});
