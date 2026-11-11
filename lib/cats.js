// The cats the site shows, depending on which list /cats/ is set to use (see lib/listing.js).
//
//   editor    cats typed in the page editor: one small JSON file each in src/cats/items/
//   sync      src/_data/cats.json, written by the Pawlytics sync (scripts/)
//   pawlytics the Pawlytics widget. The site makes no pages of its own, so the list is empty.
//
// Whatever the source, a cat comes out in the same shape, so the cats page and the cat pages
// do not care where it came from.
const fs = require('fs');
const path = require('path');

const BANDS = ['Kitten', 'Adult', 'Senior'];
// Where in a photo to keep the focus when it is cropped to the card's shape.
const FOCUS = { top: '50% 20%', middle: '50% 40%', bottom: '50% 75%' };
const MAX_PHOTOS = 6;

const aOrAn = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const text = (v) => String(v ?? '').trim();

// A cat with no photo chosen at all is a draft: someone has started it (for example from Pawlytics'
// pet list) and it is waiting for a photo and a story. That is normal, so it is left out quietly.
function isDraft(data) {
  return !(Array.isArray(data.photos) && data.photos.some((p) => text(p && p.image)));
}

// Turns what the editor saved for one cat (src/cats/items/<name>.json) into the site's cat shape.
// Returns null for a draft (and calls onDraft), or, with a warning, for a cat that cannot be shown
// (no name, or photos that are no longer in the photo folder).
function catFromEditorFile(slug, data, { imagesDir, warn, transform, onDraft = () => {} }) {
  const name = text(data.name);
  if (!name) { warn(`${slug}.json has no name, so it is not shown.`); return null; }
  if (isDraft(data)) { onDraft(name); return null; }

  let band = text(data.age_band);
  if (!BANDS.includes(band)) { warn(`${name}: age group "${band}" is not Kitten, Adult or Senior. Showing Adult.`); band = 'Adult'; }
  const colour = text(data.colour);

  const photos = [];
  for (const p of Array.isArray(data.photos) ? data.photos : []) {
    // The editor saves a photo as /images/<folder>/<file>. The templates add /images/ themselves.
    const src = text(p && p.image).replace(/^\/?images\//, '').replace(/^\/+/, '');
    if (!src) continue;
    if (!fs.existsSync(path.join(imagesDir, src))) { warn(`${name}: the photo "${src}" is not in the photo folder, so it is left out.`); continue; }
    const alt = text(p.alt) || (colour ? `${name}, ${aOrAn(colour)} ${colour.toLowerCase()} cat` : `${name}, a cat looking for a home`);
    photos.push({ src, alt, pos: FOCUS[text(p.focus)] || FOCUS.middle });
    if (photos.length === MAX_PHOTOS) break;
  }
  if (!photos.length) { warn(`${name} has no photo that can be shown, so the cat is not listed.`); return null; }

  const story = transform.storyParagraphs(data.story, name);
  return {
    id: slug,
    slug,
    name,
    age_band: band,
    age_text: text(data.age_text) || 'Age not known',
    sex: text(data.sex) || 'Not recorded',
    reserved: data.reserved === true,
    colour: colour || 'Not recorded',
    tagline: text(data.tagline) || transform.taglineFrom(story, band),
    good_with: text(data.good_with) || 'Ask us',
    health: text(data.health) || 'Ask us',
    donation: text(data.donation) || 'Ask us',
    story,
    photos,
    listedAt: text(data.listed),
    bg: '#EAD3C9',
  };
}

// The same order the sync uses: reserved cats last, then newest first, then by name.
function sortCats(cats) {
  return cats.sort((a, b) => (Number(a.reserved) - Number(b.reserved)) || String(b.listedAt).localeCompare(String(a.listedAt)) || a.name.localeCompare(b.name));
}

async function loadEditorCats({ dir, imagesDir, warn = (m) => console.warn(`[cats] ${m}`), info = (m) => console.log(`[cats] ${m}`) }) {
  const transform = await import('../scripts/lib/transform.mjs');
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch { /* no cats added yet */ }
  const cats = [];
  const waiting = [];
  for (const f of files) {
    const slug = f.slice(0, -'.json'.length);
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { warn(`${f} could not be read, so it is not shown.`); continue; }
    const cat = catFromEditorFile(slug, data, { imagesDir, warn, transform, onDraft: (n) => waiting.push(n) });
    if (cat) cats.push(cat);
  }
  if (waiting.length) info(`${waiting.length} ${waiting.length === 1 ? 'cat is' : 'cats are'} waiting for a photo and not listed yet: ${waiting.join(', ')}.`);
  return sortCats(cats);
}

// The list for the site. `mode` comes from lib/listing.js.
async function loadSiteCats({ mode, root, warn }) {
  if (mode === 'sync') return JSON.parse(fs.readFileSync(path.join(root, 'src/_data/cats.json'), 'utf8'));
  if (mode === 'editor') return loadEditorCats({ dir: path.join(root, 'src/cats/items'), imagesDir: path.join(root, 'src/images'), warn });
  return [];
}

module.exports = { loadSiteCats, loadEditorCats, catFromEditorFile, isDraft, sortCats, FOCUS, BANDS };
