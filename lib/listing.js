// Which list of cats the /cats/ page shows.
//   "editor"    the cats typed into the Cats section of the page editor (src/cats/items/). The default.
//   "pawlytics" the listing widget that Pawlytics provides, pasted into src/_includes/pawlytics-widget.html.
//   "sync"      the cats the Pawlytics sync writes to src/_data/cats.json (not switched on yet).
// The choice is the one word in src/_data/catsListing.json. The editor can change it too.

const MODES = ['editor', 'pawlytics', 'sync'];
const WIDGET_FILE = 'src/_includes/pawlytics-widget.html';
const PAWLYTICS_HOST = 'api.pawlytics.com';

const hostOf = (url) => {
  try { return new URL(url.startsWith('//') ? `https:${url}` : url).hostname; } catch { return ''; }
};

// Returns { widget: boolean, html: string }. Throws a plain-English error when the setting and the
// embed code do not agree, so a mistake stops the build and the live site stays as it was.
function buildListing(mode, embedHtml) {
  if (!MODES.includes(mode)) {
    throw new Error(`src/_data/catsListing.json: mode is "${mode}". It must be "editor", "pawlytics" or "sync".`);
  }
  if (mode !== 'pawlytics') return { mode, widget: false, html: '' };

  // Comments do not count as code.
  const html = String(embedHtml || '').replace(/<!--[\s\S]*?-->/g, '').trim();

  // Every address in the snippet, wherever it appears (the iframe address, a script tag, or the
  // address the loader script builds), must be on Pawlytics' own host.
  const urls = [...html.matchAll(/(?:https?:)?\/\/[^\s"'<>\\)]+/gi)].map((m) => m[0]);
  const stray = [...new Set(urls.filter((u) => hostOf(u) !== PAWLYTICS_HOST))];
  // A script with a relative address would run a file from this site, so it is refused too.
  const relativeScripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]).filter((src) => !/^(https?:)?\/\//i.test(src));

  const hasScript = /<script\b/i.test(html);
  const hasPawlytics = urls.some((u) => hostOf(u) === PAWLYTICS_HOST);
  if (!hasScript || !hasPawlytics) {
    throw new Error(`The cat list is set to "pawlytics" but ${WIDGET_FILE} has no Pawlytics embed code in it. Paste the code Pawlytics sent, or choose another list.`);
  }
  if (stray.length || relativeScripts.length) {
    throw new Error(`${WIDGET_FILE} refers to somewhere other than ${PAWLYTICS_HOST} (${[...stray, ...relativeScripts].join(', ')}). Only Pawlytics' own embed code is allowed there.`);
  }
  return { mode, widget: true, html };
}

module.exports = { buildListing, MODES, WIDGET_FILE, PAWLYTICS_HOST };
