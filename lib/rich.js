// Page text from the CMS.
//
// The editor writes a little markdown in a text field: [words](https://address) for a link, **bold**, *italic*,
// ==words== for coloured words, and a new line for a line break. This turns that into the site's own markup.
// The look of each kind of tag (its class or style) comes from the template, so the design stays in the template
// and the editor can never break it. HTML typed into a field is shown as plain text, never run.
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: false, breaks: true, linkify: false, typographer: false });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const attrs = (o) =>
  o && typeof o === 'object'
    ? Object.entries(o)
        .map(([k, v]) => ' ' + k + '="' + esc(v) + '"')
        .join('')
    : '';

function render(text, opts, block) {
  const o = opts || {};
  // "=\=" is how a literal "==" is written in a field; keep it out of the way of the highlight rule.
  const src = String(text == null ? '' : text).replace(/=\\=/g, '\uE000');
  let html = block ? md.render(src) : md.renderInline(src);
  html = html.replace(/<a href="([^"]*)">/g, (m, href) => '<a href="' + href + '"' + attrs(o.a) + '>');
  html = html.replace(/<strong>/g, '<strong' + attrs(o.strong) + '>');
  html = html.replace(/<em>/g, '<em' + attrs(o.em) + '>');
  html = html.replace(/==([^=]+?)==/g, (m, t) => '<span' + (o.hl ? ' style="' + esc(o.hl) + '"' : '') + '>' + t + '</span>');
  return html.replace(/\uE000/g, '==');
}

// Puts values into {name}-style markers in a field, after the text has been made safe. Used where the page
// inserts something of its own, such as a cat's name: "Apply to adopt {name}".
function fill(html, values) {
  const v = values || {};
  const safe = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return String(html).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(v, k) ? safe(v[k]) : m));
}

const rich = (text, opts) => render(text, opts, false);
// The same, for text with paragraphs, headings and lists (the long pages written in the editor).
const markdown = (text, opts) => render(text, opts, true);

module.exports = { rich, markdown, fill };
