// Checks that keep the page editor (/admin/) and the site in step with each other.
// Run with `npm run test:cms`. They catch the usual slips: a field added to a template but not to the editor's
// settings, a page wording file the editor does not know about, or a template pointing at wording that is not there.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const { rich, markdown, fill } = require('../../lib/rich.js');
const root = path.resolve(new URL('../..', import.meta.url).pathname);

async function walkFiles(dir, ext, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walkFiles(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

const config = yaml.load(await readFile(path.join(root, 'src/static/admin/config.yml'), 'utf8'));
const textDir = path.join(root, 'src/_data/text');
const texts = {};
for (const f of await readdir(textDir)) if (f.endsWith('.json')) texts[f.slice(0, -5)] = JSON.parse(await readFile(path.join(textDir, f), 'utf8'));
const fileEntries = config.collections.flatMap((c) => c.files || []);

test('rich: links, bold, colour and line breaks keep the design attributes from the template', () => {
  const html = rich('Hello **there**, ==pink== [click](https://a.example/x?y=1&z=2)\nnext', {
    a: { class: 'link-u', style: 'color:#1F3158' }, strong: { style: 'font-weight:500' }, hl: 'color:#ED217C',
  });
  assert.match(html, /<strong style="font-weight:500">there<\/strong>/);
  assert.match(html, /<span style="color:#ED217C">pink<\/span>/);
  assert.match(html, /<a href="https:\/\/a\.example\/x\?y=1&amp;z=2" class="link-u" style="color:#1F3158">click<\/a>/);
  assert.match(html, /<br>/);
});

test('rich: typed HTML and scripts are shown as text, never run', () => {
  const html = rich('<script>alert(1)</script> <b>x</b> [bad](javascript:alert(1))');
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('<b>'));
  assert.ok(!/href="javascript:/i.test(html));
});

test('rich: a literal double equals sign can be written', () => {
  assert.equal(rich('a =\\= b'), 'a == b');
});

test('markdown: paragraphs, headings and lists', () => {
  const html = markdown('Para\n\n### Head\n\n- one\n- two');
  assert.match(html, /<p>Para<\/p>/);
  assert.match(html, /<h3>Head<\/h3>/);
  assert.match(html, /<li>two<\/li>/);
});

test('fill: puts a safe value into a marker', () => {
  assert.equal(fill('Apply for {name}', { name: 'Tom & <Jerry>' }), 'Apply for Tom &amp; &lt;Jerry&gt;');
  assert.equal(fill('Keep {other}', { name: 'x' }), 'Keep {other}');
});

test('every wording file is in the editor settings once, and every editor file exists', () => {
  const inConfig = fileEntries.map((f) => path.basename(f.file, '.json'));
  assert.equal(new Set(inConfig).size, inConfig.length, 'a file is listed twice in config.yml');
  for (const name of Object.keys(texts)) assert.ok(inConfig.includes(name), `src/_data/text/${name}.json is not in the editor settings`);
  for (const name of inConfig) assert.ok(name in texts, `config.yml lists src/_data/text/${name}.json, which does not exist`);
});

function checkFields(fields, data, where, problems) {
  const byName = new Map(fields.map((f) => [f.name, f]));
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of Object.keys(data)) {
      const f = byName.get(key);
      if (!f) { problems.push(`${where}.${key} has no field in the editor settings`); continue; }
      const v = data[key];
      if (f.widget === 'object') checkFields(f.fields, v, `${where}.${key}`, problems);
      else if (f.widget === 'list') {
        if (!Array.isArray(v)) { problems.push(`${where}.${key} should be a list`); continue; }
        if (f.field) v.forEach((x, i) => { if (typeof x !== 'string') problems.push(`${where}.${key}[${i}] should be text`); });
        else v.forEach((x, i) => checkFields(f.fields, x, `${where}.${key}[${i}]`, problems));
      } else if (typeof v !== 'string') problems.push(`${where}.${key} should be text`);
    }
    for (const f of fields) if (!(f.name in data) && f.required !== false) problems.push(`${where}.${f.name} is in the editor settings but not in the wording file`);
  }
}

test('the editor settings describe exactly the fields in each wording file', () => {
  const problems = [];
  for (const entry of fileEntries) checkFields(entry.fields, texts[path.basename(entry.file, '.json')], path.basename(entry.file), problems);
  assert.deepEqual(problems, []);
});

test('templates only ask for wording that exists', async () => {
  const problems = [];
  const files = await walkFiles(path.join(root, 'src'), '.njk');
  for (const file of files) {
    const src = await readFile(file, 'utf8');
    for (const m of src.matchAll(/\btext\.([a-z_]+)((?:\.[A-Za-z0-9_]+)+)/g)) {
      const [, name, rest] = m;
      let v = texts[name];
      if (v === undefined) { problems.push(`${path.relative(root, file)}: text.${name} does not exist`); continue; }
      for (const part of rest.slice(1).split('.')) {
        if (v === undefined || v === null) break;
        v = v[part];
      }
      if (v === undefined) problems.push(`${path.relative(root, file)}: text.${name}${rest} does not exist`);
    }
  }
  assert.deepEqual([...new Set(problems)], []);
});

test('every news story has what the news pages need', async () => {
  const dir = path.join(root, 'src/news/items');
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.md'))) {
    const src = await readFile(path.join(dir, f), 'utf8');
    const fm = yaml.load(src.split('---')[1]);
    for (const k of ['title', 'date', 'date_text', 'summary', 'image', 'image_alt']) assert.ok(fm[k], `${f} has no ${k}`);
  }
});
