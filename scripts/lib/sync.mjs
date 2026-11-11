// The sync pipeline: pets in, cats.json and cat photos out. Nothing is written unless every
// safety check passes, and files are only touched when something actually changed.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { transformPets } from './transform.mjs';

const exists = (p) => access(p).then(() => true, () => false);
async function readJson(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; }
}
const hash8 = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 8);

export async function runSync({
  fetchPets,            // async () => pets (the simple shape in scripts/README.md)
  downloadPhoto,        // async (url) => Buffer
  processImage,         // async (Buffer) => Buffer (resize, convert to WebP)
  catsJsonPath,         // src/_data/cats.json
  imagesDir,            // src/images
  now = new Date(),
  options = {},         // { allowEmpty, force, dryRun, skipPhotos }
  log = () => {},
}) {
  const previous = await readJson(catsJsonPath, []);
  const pets = await fetchPets();
  if (!Array.isArray(pets)) throw new Error('Pawlytics did not return a list of pets. Nothing was changed.');

  const { cats, report } = transformPets(pets, { now, previous });

  // ---- photos ---------------------------------------------------------------------------
  const wanted = new Map();       // relative path -> Buffer | null (null: already on disk)
  const published = [];
  const photoProblems = [];
  const noPhoto = [];
  for (const cat of cats) {
    const photos = [];
    for (let i = 0; i < cat.photoUrls.length && !options.skipPhotos; i += 1) {
      const url = cat.photoUrls[i];
      const rel = `cats/${cat.slug}-${i + 1}-${hash8(url)}.webp`;
      try {
        if (await exists(path.join(imagesDir, rel))) wanted.set(rel, null);
        else wanted.set(rel, await processImage(await downloadPhoto(url)));
        photos.push({ src: rel, alt: i === 0 ? cat.altBase : `${cat.altBase}, photo ${i + 1}`, pos: '50% 50%' });
      } catch (err) {
        photoProblems.push(`${cat.name} (photo ${i + 1}): ${String(err.message).slice(0, 120)}`);
      }
    }
    const { photoUrls, altBase, listedAt, ...rest } = cat;
    if (!photos.length && !options.skipPhotos) { noPhoto.push(cat.name); continue; }
    published.push({ ...rest, photos });
  }
  report.noPhoto = noPhoto;
  report.photoProblems = photoProblems;
  report.published = published.length;
  report.reserved = published.filter((c) => c.reserved).length;

  // ---- safety checks: never publish an empty or collapsed list by mistake ------------------------
  // The sample cats that ship with the site have no Pawlytics id, so they never trigger these checks.
  const before_n = previous.filter((c) => c.id).length;
  if (!options.allowEmpty && published.length === 0 && before_n > 0) {
    throw new Error(`The sync found no cats to publish, but the site shows ${before_n}. Nothing was changed. If this is right, run it again with --allow-empty.`);
  }
  if (!options.force && before_n >= 6 && published.length < before_n / 2) {
    throw new Error(`The sync would cut the list from ${before_n} cats to ${published.length}. Nothing was changed. If this is right, run it again with --force.`);
  }

  // ---- write only what changed ---------------------------------------------------------------
  const json = `${JSON.stringify(published, null, 2)}\n`;
  const before = await readFile(catsJsonPath, 'utf8').catch(() => '');
  report.changed = json !== before;
  const catsDir = path.join(imagesDir, 'cats');
  const existingFiles = (await exists(catsDir)) ? await readdir(catsDir) : [];
  const keep = new Set([...wanted.keys()].map((r) => path.basename(r)));
  const stale = existingFiles.filter((f) => f.endsWith('.webp') && !keep.has(f));
  const fresh = [...wanted].filter(([, buf]) => buf);
  report.imagesAdded = fresh.length;
  report.imagesRemoved = options.skipPhotos ? 0 : stale.length;

  if (!options.dryRun) {
    if (fresh.length) await mkdir(catsDir, { recursive: true });
    for (const [rel, buf] of fresh) await writeFile(path.join(imagesDir, rel), buf);
    if (!options.skipPhotos) for (const f of stale) await rm(path.join(catsDir, f));
    if (report.changed) await writeFile(catsJsonPath, json);
  }
  log(report);
  return report;
}
