import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runSync } from '../lib/sync.mjs';

const run = promisify(execFile);
const root = path.resolve(new URL('../..', import.meta.url).pathname);
const NOW = new Date('2026-11-10T12:00:00Z');
const pets = JSON.parse(await readFile(path.join(root, 'scripts/fixtures/pets.sample.json'), 'utf8'));
const areas = JSON.parse(await readFile(path.join(root, 'scripts/fixtures/areas.sample.json'), 'utf8'));
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { /* photo tests are skipped without it */ }

async function workspace() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hp-sync-'));
  await mkdir(path.join(dir, 'data')); await mkdir(path.join(dir, 'images'));
  return { dir, catsJsonPath: path.join(dir, 'data/cats.json'), imagesDir: path.join(dir, 'images') };
}
const fakeProcess = async (buf) => Buffer.from(`webp:${buf.toString()}`);
const fakeDownload = async (url) => { if (url.includes('broken')) throw new Error('HTTP 404'); return Buffer.from(url); };
const base = (w, extra = {}) => ({ fetchPets: async () => pets, downloadPhoto: fakeDownload, processImage: fakeProcess, areaLookup: areas, now: NOW, catsJsonPath: w.catsJsonPath, imagesDir: w.imagesDir, ...extra });

test('a first run writes cats.json and the photos, leaves out cats with no photo', async () => {
  const w = await workspace();
  const report = await runSync(base(w));
  const cats = JSON.parse(await readFile(w.catsJsonPath, 'utf8'));
  assert.equal(cats.length, 5);                               // 7 pets, minus In foster, minus no photo
  assert.deepEqual(report.noPhoto, ['Camera Shy']);
  assert.ok(report.changed);
  for (const c of cats) {
    assert.ok(c.photos.length >= 1 && c.photos.every((p) => /^cats\/.+\.webp$/.test(p.src) && p.alt));
    for (const p of c.photos) assert.ok((await readdir(path.join(w.imagesDir, 'cats'))).includes(path.basename(p.src)));
  }
  assert.ok(!JSON.stringify(cats).toLowerCase().includes('foster'), 'no foster name or field in cats.json');
  assert.ok(!('location' in cats[0]) && !('photoUrls' in cats[0]));
  await rm(w.dir, { recursive: true });
});
test('a second run changes nothing and downloads nothing', async () => {
  const w = await workspace();
  await runSync(base(w));
  let downloads = 0;
  const report = await runSync(base(w, { downloadPhoto: async (u) => { downloads += 1; return fakeDownload(u); } }));
  assert.equal(report.changed, false);
  assert.equal(downloads, 0);
  assert.equal(report.imagesAdded, 0);
  await rm(w.dir, { recursive: true });
});
test('when a cat goes, its photos go and the others are untouched', async () => {
  const w = await workspace();
  await runSync(base(w));
  const fewer = pets.filter((p) => p.id !== 'fx-1003');
  const report = await runSync(base(w, { fetchPets: async () => fewer }));
  assert.equal(report.imagesRemoved, 1);
  const cats = JSON.parse(await readFile(w.catsJsonPath, 'utf8'));
  assert.ok(!cats.some((c) => c.name === 'Old Smokey'));
  assert.equal((await readdir(path.join(w.imagesDir, 'cats'))).length, cats.reduce((n, c) => n + c.photos.length, 0));
  await rm(w.dir, { recursive: true });
});
test('a photo that cannot be fetched is reported, and the cat still shows with its other photos', async () => {
  const w = await workspace();
  const withBroken = pets.map((p) => (p.id === 'fx-1002' ? { ...p, photos: ['file:a.jpg', 'https://broken.example/b.jpg'] } : p));
  const report = await runSync(base(w, { fetchPets: async () => withBroken }));
  assert.equal(report.photoProblems.length, 1);
  assert.match(report.photoProblems[0], /^Bramble \(photo 2\)/);
  const cats = JSON.parse(await readFile(w.catsJsonPath, 'utf8'));
  assert.equal(cats.find((c) => c.name === 'Bramble').photos.length, 1);
  await rm(w.dir, { recursive: true });
});
test('an empty result never wipes the site', async () => {
  const w = await workspace();
  await runSync(base(w));
  const before = await readFile(w.catsJsonPath, 'utf8');
  await assert.rejects(runSync(base(w, { fetchPets: async () => [] })), /no cats to publish/);
  assert.equal(await readFile(w.catsJsonPath, 'utf8'), before);
  const ok = await runSync(base(w, { fetchPets: async () => [], options: { allowEmpty: true } }));
  assert.equal(ok.published, 0);
  await rm(w.dir, { recursive: true });
});
test('a collapse in the list is refused unless forced', async () => {
  const w = await workspace();
  const many = Array.from({ length: 10 }, (_, i) => ({ ...pets[0], id: `m-${i}`, name: `Cat ${i}` }));
  await runSync(base(w, { fetchPets: async () => many }));
  const few = many.slice(0, 3);
  await assert.rejects(runSync(base(w, { fetchPets: async () => few })), /cut the list from 10 cats to 3/);
  const forced = await runSync(base(w, { fetchPets: async () => few, options: { force: true } }));
  assert.equal(forced.published, 3);
  await rm(w.dir, { recursive: true });
});
test('the sample cats that ship with the site do not trigger the safety checks', async () => {
  const w = await workspace();
  await writeFile(w.catsJsonPath, JSON.stringify(Array.from({ length: 11 }, (_, i) => ({ slug: `sample-cat-${i}`, name: '[Cat name]' }))));
  const report = await runSync(base(w, { fetchPets: async () => pets.slice(0, 2) }));
  assert.equal(report.published, 2);
  await rm(w.dir, { recursive: true });
});
test('a failed fetch stops the sync before anything is written', async () => {
  const w = await workspace();
  await runSync(base(w));
  const before = await readFile(w.catsJsonPath, 'utf8');
  await assert.rejects(runSync(base(w, { fetchPets: async () => { throw new Error('Pawlytics request failed (HTTP 502).'); } })), /HTTP 502/);
  assert.equal(await readFile(w.catsJsonPath, 'utf8'), before);
  await rm(w.dir, { recursive: true });
});
test('a dry run writes nothing', async () => {
  const w = await workspace();
  const report = await runSync(base(w, { options: { dryRun: true } }));
  assert.ok(report.changed);
  await assert.rejects(readFile(w.catsJsonPath, 'utf8'));
  assert.deepEqual(await readdir(w.imagesDir), []);
  await rm(w.dir, { recursive: true });
});
test('the command line works end to end on the sample data, with real image conversion', { skip: !sharp && 'sharp is not installed' }, async () => {
  const w = await workspace();
  // Copy the project's script folder to a scratch project so the real cats.json is never touched.
  await mkdir(path.join(w.dir, 'src/_data'), { recursive: true }); await mkdir(path.join(w.dir, 'src/images'), { recursive: true });
  await run('cp', ['-r', path.join(root, 'scripts'), path.join(w.dir, 'scripts')]);
  await run('cp', [path.join(root, 'src/images/kitten-ginger-white.jpg'), path.join(root, 'src/images/kitten-silver-tabby.jpg'), path.join(w.dir, 'src/images/')]);
  await run('ln', ['-s', path.join(root, 'node_modules'), path.join(w.dir, 'node_modules')]);
  const cli = ['scripts/sync-pawlytics.mjs', '--fixture', 'scripts/fixtures/pets.sample.json', '--area-file', 'scripts/fixtures/areas.sample.json'];
  const first = await run('node', cli, { cwd: w.dir });
  assert.match(first.stdout, /Published 5 \(1 reserved\)/);
  assert.match(first.stdout, /No photo, so not published: Camera Shy/);
  assert.match(first.stdout, /Area not worked out: Mystery/);
  assert.ok(!/test foster/i.test(first.stdout + first.stderr), 'the output names no foster carer');
  const files = await readdir(path.join(w.dir, 'src/images/cats'));
  assert.ok(files.length >= 5 && files.every((f) => f.endsWith('.webp')));
  const meta = await sharp(path.join(w.dir, 'src/images/cats', files[0])).metadata();
  assert.equal(meta.format, 'webp');
  const second = await run('node', cli, { cwd: w.dir });
  assert.match(second.stdout, /cats\.json unchanged/);
  await rm(w.dir, { recursive: true });
});
test('without the Pawlytics mapping the live sync stops with a clear message', async () => {
  const w = await workspace();
  await mkdir(path.join(w.dir, 'src/_data'), { recursive: true });
  await run('cp', ['-r', path.join(root, 'scripts'), path.join(w.dir, 'scripts')]);
  await run('ln', ['-s', path.join(root, 'node_modules'), path.join(w.dir, 'node_modules')]);
  await assert.rejects(run('node', ['scripts/sync-pawlytics.mjs', '--dry-run', '--no-photos'], { cwd: w.dir, env: { ...process.env, AUTH0_DOMAIN: '' } }),
    (err) => /Sync stopped: The Pawlytics query is not written yet/.test(err.stderr) && err.code === 1);
  await rm(w.dir, { recursive: true });
});
