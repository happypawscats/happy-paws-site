// Checks the switch between the cat lists /cats/ can show: the cats typed in the editor, the Pawlytics
// widget, and (later) the cats the Pawlytics sync writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access, cp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { buildListing } = require('../../lib/listing.js');
const run = promisify(execFile);
const root = path.resolve(new URL('../..', import.meta.url).pathname);

const REAL_SHAPE = `<div class="pawlytics-embed-container" data-pawlytics-embed="true"
  data-embed="https://api.pawlytics.com/public/pet-iframe?token=abc123&amp;iv=def456" data-title="Adoptable Pets" style="width:100%"></div>
<script>(function(w,d,s,id){if(d.getElementById(id))return;var js=d.createElement(s);js.id=id;js.src="https://api.pawlytics.com/embed.js";var fjs=d.getElementsByTagName(s)[0];fjs.parentNode.insertBefore(js,fjs);})(window,document,'script','pawlytics-embedjs');</script>`;
const SNIPPET = '<div id="pawlytics-test" data-x="1"></div>\n<script src="https://api.pawlytics.com/embed.js" async></script>';

test('the editor and sync lists need no embed code and are not the widget', () => {
  assert.deepEqual(buildListing('editor', ''), { mode: 'editor', widget: false, html: '' });
  assert.deepEqual(buildListing('sync', SNIPPET), { mode: 'sync', widget: false, html: '' });
});

test('an unknown mode stops the build with a clear message', () => {
  assert.throws(() => buildListing('own', SNIPPET), /must be "editor", "pawlytics" or "sync"/);
});

test('pawlytics mode needs the embed code, and a comment alone is not code', () => {
  assert.throws(() => buildListing('pawlytics', ''), /no Pawlytics embed code/);
  assert.throws(() => buildListing('pawlytics', '<!-- paste the <script src="https://api.pawlytics.com/x.js"> here -->'), /no Pawlytics embed code/);
});

test('pawlytics mode accepts the snippet and keeps it as written', () => {
  const r = buildListing('pawlytics', `<!-- note -->\n${SNIPPET}\n`);
  assert.equal(r.widget, true);
  assert.equal(r.mode, 'pawlytics');
  assert.equal(r.html, SNIPPET);
});

test('pawlytics mode accepts the form of snippet Pawlytics really sent (a loader script)', () => {
  const r = buildListing('pawlytics', REAL_SHAPE);
  assert.equal(r.widget, true);
  assert.equal(r.html, REAL_SHAPE);
});

test('the embed file in the project is accepted as it stands', async () => {
  const html = await readFile(path.join(root, 'src/_includes/pawlytics-widget.html'), 'utf8');
  assert.equal(buildListing('pawlytics', html).widget, true);
});

test('pawlytics mode refuses an address on any other host, wherever it appears', () => {
  assert.throws(() => buildListing('pawlytics', REAL_SHAPE.replace('https://api.pawlytics.com/public', 'https://evil.example/public')), /somewhere other than/);
  assert.throws(() => buildListing('pawlytics', REAL_SHAPE.replace('js.src="https://api.pawlytics.com/embed.js"', 'js.src="https://evil.example/embed.js"')), /somewhere other than/);
  assert.throws(() => buildListing('pawlytics', `${REAL_SHAPE}<script src="/assets/js/site.js"></script>`), /somewhere other than/);
  assert.throws(() => buildListing('pawlytics', `${SNIPPET}<script src="https://evil.example/a.js"></script>`), /somewhere other than/);
  assert.throws(() => buildListing('pawlytics', '<script src="//cdn.example/a.js"></script>'), /somewhere other than|no Pawlytics embed code/);
});

// Builds a scratch copy of the site with the chosen list and returns the built folder.
async function build(mode, { embed, cats } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hp-listing-'));
  await run('cp', ['-r', path.join(root, 'src'), path.join(root, 'lib'), path.join(root, 'scripts'), path.join(root, 'eleventy.config.js'), path.join(root, 'package.json'), path.join(root, 'netlify.toml'), dir]);
  await run('ln', ['-s', path.join(root, 'node_modules'), path.join(dir, 'node_modules')]);
  await writeFile(path.join(dir, 'src/_data/catsListing.json'), JSON.stringify({ mode }));
  if (embed != null) await writeFile(path.join(dir, 'src/_includes/pawlytics-widget.html'), embed);
  // Start with no cats typed in, then add the ones the test asks for (with the photos they name).
  await rm(path.join(dir, 'src/cats/items'), { recursive: true, force: true });
  await mkdir(path.join(dir, 'src/cats/items'), { recursive: true });
  if (cats) {
    await mkdir(path.join(dir, 'src/images/cat-photos'), { recursive: true });
    for (const f of ['poppy-1.jpg', 'poppy-2.jpg', 'smokey.jpg', 'mittens.jpg']) await cp(path.join(root, 'src/images/kitten-ginger-white.jpg'), path.join(dir, 'src/images/cat-photos', f));
    const only = Array.isArray(cats) ? cats : ['poppy', 'mittens', 'old-smokey'];
    for (const stem of only) await cp(path.join(root, 'scripts/fixtures/editor-cats', `${stem}.json`), path.join(dir, 'src/cats/items', `${stem}.json`));
  }
  const out = path.join(dir, '_out');
  try {
    await run('node', [path.join(root, 'node_modules/@11ty/eleventy/cmd.cjs'), '--output', out], { cwd: dir });
  } catch (err) { return { error: `${err.stdout}\n${err.stderr}` }; }
  return { html: await readFile(path.join(out, 'cats/index.html'), 'utf8'), out };
}
const exists = (p) => access(p).then(() => true, () => false);

test('editor list: the cats typed in show, each with a page of its own, in the right order', async () => {
  const { html, out, error } = await build('editor', { cats: true });
  assert.ok(html, error);
  assert.match(html, /data-tiles/);
  assert.match(html, /data-filter="age"/);
  assert.match(html, /3 cats looking for a home/);
  const names = [...html.matchAll(/class="l-tn">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(names, ['Poppy', 'Mittens', 'Old Smokey']);
  assert.match(html, /class="l-flag">Reserved</);
  assert.match(html, /transport a cat anywhere/);
  for (const slug of ['poppy', 'mittens', 'old-smokey']) assert.ok(await exists(path.join(out, 'cats', slug, 'index.html')), `${slug} has no page`);
  const sitemap = await readFile(path.join(out, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /\/cats\/poppy\//);
  assert.doesNotMatch(sitemap, /sample-cat/);
  const page = await readFile(path.join(out, 'cats/poppy/index.html'), 'utf8');
  assert.match(page, /<h1[^>]*>Poppy<\/h1>/);
  assert.match(page, /\/images\/cat-photos\/poppy-1\.jpg/);
  assert.match(page, /Tortoiseshell/);
  assert.match(page, /href="\/apply\/\?cat=Poppy"/);
  assert.match(page, /id="more-h"/, 'a cat page lists other cats');
});

test('editor list: with no cats the page says so plainly instead of showing an empty list', async () => {
  const { html, out, error } = await build('editor');
  assert.ok(html, error);
  assert.match(html, /No cats are listed here right now/);
  assert.match(html, /href="\/news\/#news-email"/);
  assert.doesNotMatch(html, /data-tiles/);
  assert.doesNotMatch(html, /data-filter="age"/);
  assert.doesNotMatch(html, /0 cats looking for a home/);
  assert.doesNotMatch(html, /Can't see the right cat|Can&#39;t see the right cat/);
  assert.match(html, /id="how"/);
  assert.ok(!(await exists(path.join(out, 'cats/poppy/index.html'))));
});

test('editor list: a cat page with no other cats leaves out the "more cats" strip', async () => {
  const one = await build('editor', { cats: ['mittens'] });
  assert.ok(one.out, one.error);
  assert.match(one.html, /1 cat looking for a home/);
  const page = await readFile(path.join(one.out, 'cats/mittens/index.html'), 'utf8');
  assert.doesNotMatch(page, /id="more-h"/);
  assert.match(page, /<h1[^>]*>Mittens<\/h1>/);
});

test('pawlytics list: the widget replaces the filter and tiles, the rest of the page stays, and no cat pages are made', async () => {
  const { html, out, error } = await build('pawlytics', { embed: SNIPPET, cats: true });
  assert.ok(html, error);
  assert.match(html, /<div class="l-widget" data-pawlytics-list>\s*<div id="pawlytics-test"/);
  assert.match(html, /<script src="https:\/\/api\.pawlytics\.com\/embed\.js" async><\/script>/);
  assert.match(html, /This list comes live from Pawlytics/);
  assert.doesNotMatch(html, /data-tiles/);
  assert.doesNotMatch(html, /data-filter="age"/);
  assert.match(html, /transport a cat anywhere/);
  assert.match(html, /id="how"/);
  assert.match(html, /Can't see the right cat\?|Can&#39;t see the right cat\?/);
  assert.ok(!(await exists(path.join(out, 'cats/poppy/index.html'))), 'cats typed in must not get pages while the Pawlytics list is chosen');
  assert.doesNotMatch(await readFile(path.join(out, 'sitemap.xml'), 'utf8'), /\/cats\/poppy\//);
});

test('sync list: the cats the sync writes (cats.json) show', async () => {
  const { html, out, error } = await build('sync', { cats: true });
  assert.ok(html, error);
  assert.match(html, /11 cats looking for a home/);
  assert.ok(await exists(path.join(out, 'cats/sample-cat-1/index.html')));
  assert.ok(!(await exists(path.join(out, 'cats/poppy/index.html'))), 'cats typed in are ignored once the sync list is chosen');
});

test('switching to the Pawlytics list without the code fails the build, so the live site is untouched', async () => {
  const { html, error } = await build('pawlytics', { embed: '<!-- nothing pasted yet -->' });
  assert.equal(html, undefined);
  assert.match(error, /no Pawlytics embed code/);
});
