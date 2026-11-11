#!/usr/bin/env node
// Updates the site's cats from Pawlytics. Run by the scheduled GitHub workflow, or by hand:
//   node --env-file=.env scripts/sync-pawlytics.mjs [--dry-run] [--allow-empty] [--force]
//   node scripts/sync-pawlytics.mjs --fixture scripts/fixtures/pets.sample.json --dry-run
// See scripts/README.md. This script never prints a password, a token or a foster carer's name.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { graphqlClient, login, settingsFromEnv } from './lib/pawlytics.mjs';
import { PETS_QUERY, petsFromResponse } from './lib/mapping.mjs';
import { runSync } from './lib/sync.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

const fixture = valueOf('--fixture');
const options = { allowEmpty: flag('--allow-empty'), force: flag('--force'), dryRun: flag('--dry-run'), skipPhotos: flag('--no-photos') };
if (options.skipPhotos && !options.dryRun) { console.error('--no-photos only works together with --dry-run.'); process.exit(1); }

async function loadSharp() {
  try { return (await import('sharp')).default; } catch {
    throw new Error('The image library is missing. Run `npm install --no-save sharp` and try again.');
  }
}

async function main() {
  let areaLookup = {};
  try { areaLookup = process.env.AREA_LOOKUP_JSON ? JSON.parse(process.env.AREA_LOOKUP_JSON) : {}; } catch {
    throw new Error('AREA_LOOKUP_JSON is not valid JSON. It should look like {"Name of foster": "Stockton"}.');
  }
  const areaFile = valueOf('--area-file');
  if (areaFile) areaLookup = JSON.parse(await readFile(areaFile, 'utf8'));

  let fetchPets;
  let downloadPhoto;
  if (fixture) {
    const pets = JSON.parse(await readFile(fixture, 'utf8'));
    fetchPets = async () => pets;
    // In fixture mode a photo address of the form file:relative/path reads a local file.
    downloadPhoto = async (url) => {
      if (!url.startsWith('file:')) throw new Error('fixture photos must be file: addresses');
      return readFile(path.join(root, url.slice(5)));
    };
  } else {
    fetchPets = async () => {
      if (!PETS_QUERY) petsFromResponse(); // throws a clear message while the mapping is unwritten
      const token = await login(settingsFromEnv());
      const data = await graphqlClient({ token })(PETS_QUERY);
      return petsFromResponse(data);
    };
    downloadPhoto = async (url) => {
      if (!url.startsWith('https://')) throw new Error('photo address is not https');
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!/^image\//.test(res.headers.get('content-type') || '')) throw new Error('not an image');
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 25 * 1024 * 1024) throw new Error('image is over 25 MB');
      return buf;
    };
  }

  const sharp = options.skipPhotos ? null : await loadSharp();
  const processImage = async (buf) => sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();

  const report = await runSync({
    fetchPets, downloadPhoto, processImage, areaLookup, options,
    catsJsonPath: path.join(root, 'src/_data/cats.json'),
    imagesDir: path.join(root, 'src/images'),
  });

  // Cat names are public. Foster names never appear here.
  const list = (label, names) => names.length && console.log(`${label}: ${names.join(', ')}`);
  console.log(`Pawlytics sent ${report.received} pets. Published ${report.published} (${report.reserved} reserved). Not published (other statuses): ${report.notPublished}.`);
  list('No photo, so not published', report.noPhoto);
  list('Could not use a photo', report.photoProblems);
  list('Area not worked out', report.areaUnknown);
  list('No date of birth', report.ageUnknown);
  if (report.invalidAreaEntries) console.log(`${report.invalidAreaEntries} entries in the area lookup do not name Stockton, Birmingham or Banbury and were ignored.`);
  console.log(options.dryRun ? `Dry run: nothing was written. cats.json ${report.changed ? 'would change' : 'would stay the same'}.` : `cats.json ${report.changed ? 'updated' : 'unchanged'}. Photos added: ${report.imagesAdded}, removed: ${report.imagesRemoved}.`);
}

main().catch((err) => { console.error(`Sync stopped: ${err.message}`); process.exit(1); });
