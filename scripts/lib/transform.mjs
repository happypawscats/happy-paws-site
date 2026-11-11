// Turns Pawlytics pets (already in the simple shape described in scripts/README.md) into the cats
// the site shows. Pure functions: no network, no files. Everything the site must never publish
// (above all the foster carer's name, which Pawlytics keeps in "Location") is dropped here.

export const AREAS = ['Stockton', 'Birmingham', 'Banbury'];
export const MAX_PHOTOS = 6;

const norm = (s) => String(s ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

// ---- status -------------------------------------------------------------------------------
// Adoptable shows normally. Pending adoption shows as Reserved. Anything else (In foster,
// Adopted, and so on) is not published.
const STATUS = { 'adoptable': { reserved: false }, 'pending adoption': { reserved: true } };
export function statusInfo(status) {
  const key = norm(status);
  return Object.hasOwn(STATUS, key) ? { publish: true, ...STATUS[key] } : { publish: false, reserved: false };
}

// ---- age ----------------------------------------------------------------------------------
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
// Ages count in whole days, so the time of day never tips a cat into the next band.
const dayStart = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
function wholeMonths(from, to) {
  let m = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) m -= 1;
  return m;
}
// The client's rule: kitten up to a year, senior over 10 years, adult in between.
const plusYears = (d, n) => new Date(Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate()));
export function ageBand(dateOfBirth, stage, nowIn) {
  const now = dayStart(nowIn);
  const dob = parseDate(dateOfBirth);
  if (dob && dob <= now) {
    if (now < plusYears(dob, 1)) return 'Kitten';
    if (now > plusYears(dob, 10)) return 'Senior';
    return 'Adult';
  }
  // No usable date of birth: fall back on Pawlytics' own stage if there is one, otherwise Adult.
  const s = norm(stage);
  if (/^(baby|kitten)/.test(s)) return 'Kitten';
  if (/^senior/.test(s)) return 'Senior';
  return 'Adult';
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export function ageText(dateOfBirth, fallbackText, nowIn) {
  const now = dayStart(nowIn);
  const dob = parseDate(dateOfBirth);
  if (!dob || dob > now) return fallbackText ? String(fallbackText).trim() : 'Age not known';
  const months = wholeMonths(dob, now);
  if (months < 1) {
    const days = Math.floor((now - dob) / 86400000);
    return days < 7 ? 'Under 1 week' : plural(Math.floor(days / 7), 'week');
  }
  if (months < 12) return plural(months, 'month');
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years < 3 && rest > 0 ? `${plural(years, 'year')} ${plural(rest, 'month')}` : plural(years, 'year');
}

// ---- small text helpers ---------------------------------------------------------------------
function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
const capFirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plainText = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\r/g, '').trim();
const aOrAn = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

export function slugify(name) {
  const s = String(name ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'cat';
}
const shortId = (id) => String(id ?? '').replace(/[^a-z0-9]/gi, '').slice(-5).toLowerCase() || 'x';

export function colourText(colours) {
  const list = (Array.isArray(colours) ? colours : String(colours ?? '').split(/[,/]/)).map((c) => String(c).trim()).filter(Boolean);
  if (!list.length) return 'Not recorded';
  return capFirst(joinList(list.map((c) => c.toLowerCase())));
}
export function sexText(sex) {
  const s = norm(sex);
  if (s.startsWith('f')) return 'Female';
  if (s.startsWith('m')) return 'Male';
  return 'Not recorded';
}
export function goodWithText(g) {
  const names = [['dogs', 'dogs'], ['cats', 'cats'], ['children', 'children']];
  const yes = names.filter(([k]) => g && g[k] === true).map(([, n]) => n);
  const no = names.filter(([k]) => g && g[k] === false).map(([, n]) => n);
  const parts = [];
  if (yes.length) parts.push(capFirst(joinList(yes)));
  if (no.length) parts.push(`Not suited to ${joinList(no)}`);
  return parts.length ? parts.join('. ') : 'Ask us';
}
export function healthText(h) {
  const bits = [];
  if (h && h.altered === true) bits.push('neutered');
  if (h && h.vaccinated === true) bits.push('vaccinated');
  if (h && h.microchipped === true) bits.push('microchipped');
  return bits.length ? capFirst(bits.join(', ')) : 'Ask us';
}
export function donationText(fee) {
  const n = Number(fee);
  if (!Number.isFinite(n) || n <= 0) return 'Ask us';
  return `£${Number.isInteger(n) ? n : n.toFixed(2)}`;
}
export function storyParagraphs(description, name) {
  const text = plainText(description);
  const paras = text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean).slice(0, 8);
  return paras.length ? paras : [`${name} is looking for a loving home. Get in touch to find out more about ${name}.`];
}
function taglineFrom(story, band) {
  const first = story[0] || '';
  const sentence = first.match(/^.*?[.!?](\s|$)/)?.[0].trim() || first;
  const cut = sentence.length > 150 ? `${sentence.slice(0, 147).trimEnd()}…` : sentence;
  return cut || `A ${band.toLowerCase()} looking for a loving home.`;
}

// ---- area ---------------------------------------------------------------------------------
// Where a cat is looked after. Never the foster's name. Order: an area Pawlytics gives us (a tag or
// field), then a private lookup from the foster's name to an area, otherwise no area.
export function buildAreaLookup(raw) {
  const map = new Map();
  let invalid = 0;
  for (const [fosterName, area] of Object.entries(raw || {})) {
    const match = AREAS.find((a) => norm(a) === norm(area));
    if (match) map.set(norm(fosterName), match); else invalid += 1;
  }
  return { map, invalid };
}
export function areaFor(pet, lookup) {
  const direct = AREAS.find((a) => norm(a) === norm(pet.area));
  if (direct) return direct;
  return (lookup && lookup.get(norm(pet.location))) || '';
}

// ---- slugs --------------------------------------------------------------------------------
// A cat keeps its address once it has one. A new cat gets its name, and the name plus a few
// letters of its Pawlytics id only if that name is already taken.
export function assignSlugs(pets, previous = []) {
  const byId = new Map(previous.filter((c) => c.id).map((c) => [String(c.id), c.slug]));
  const used = new Set();
  const out = new Map();
  for (const p of pets) {
    const kept = byId.get(String(p.id));
    if (kept && !used.has(kept)) { used.add(kept); out.set(p.id, kept); }
  }
  for (const p of [...pets].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (out.has(p.id)) continue;
    const base = slugify(p.name);
    const slug = used.has(base) ? `${base}-${shortId(p.id)}` : base;
    used.add(slug); out.set(p.id, slug);
  }
  return out;
}

// ---- the whole transform ------------------------------------------------------------------
export function transformPets(pets, { now = new Date(), areaLookup = {}, previous = [] } = {}) {
  const { map: lookup, invalid } = buildAreaLookup(areaLookup);
  const report = { received: pets.length, notPublished: 0, published: 0, reserved: 0, areaUnknown: [], ageUnknown: [], noPhotoUrls: [], invalidAreaEntries: invalid };
  const eligible = [];
  for (const p of pets) {
    const st = statusInfo(p.status);
    if (!st.publish) { report.notPublished += 1; continue; }
    eligible.push({ pet: p, reserved: st.reserved });
  }
  const slugs = assignSlugs(eligible.map((e) => e.pet), previous);
  const cats = eligible.map(({ pet, reserved }) => {
    const name = plainText(pet.name) || 'Unnamed cat';
    const band = ageBand(pet.dateOfBirth, pet.stage, now);
    const colour = colourText(pet.colours);
    const area = areaFor(pet, lookup);
    const story = storyParagraphs(pet.description, name);
    const photoUrls = (pet.photos || []).map((p) => (typeof p === 'string' ? p : p && p.url)).filter(Boolean).slice(0, MAX_PHOTOS);
    if (!area) report.areaUnknown.push(name);
    if (!parseDate(pet.dateOfBirth)) report.ageUnknown.push(name);
    if (!photoUrls.length) report.noPhotoUrls.push(name);
    const altBase = colour === 'Not recorded' ? `${name}, a cat looking for a home` : `${name}, ${aOrAn(colour)} ${colour.toLowerCase()} cat`;
    return {
      id: String(pet.id),
      slug: slugs.get(pet.id),
      name,
      age_band: band,
      age_text: ageText(pet.dateOfBirth, pet.ageText, now),
      sex: sexText(pet.sex),
      area,
      reserved,
      colour,
      tagline: taglineFrom(story, band),
      good_with: goodWithText(pet.goodWith),
      health: healthText(pet.health),
      donation: donationText(pet.adoptionFee),
      story,
      photoUrls,
      altBase,
      listedAt: pet.listedAt || '',
      bg: '#EAD3C9',
    };
  });
  // Newest first, with reserved cats after the others.
  cats.sort((a, b) => (a.reserved - b.reserved) || String(b.listedAt).localeCompare(String(a.listedAt)) || a.name.localeCompare(b.name));
  report.published = cats.length;
  report.reserved = cats.filter((c) => c.reserved).length;
  return { cats, report };
}
