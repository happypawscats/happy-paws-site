// Eleventy configuration for the Happy Paws Cat Rescue website.
// Run `npm start` to work on the site locally, and `npm run build` to make the finished site in _site/.
const fs = require('fs');
const path = require('path');

module.exports = function (eleventyConfig) {
  // Files copied as they are (styles, scripts, fonts, photos).
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/images': 'images' });
  eleventyConfig.addPassthroughCopy({ 'src/static': '/' });
  // Files in src/static are copied as they are, never built as pages (the editor screen in src/static/admin is one).
  eleventyConfig.ignores.add('src/static/**');

  // Reload the browser when styles or scripts change during `npm start`.
  eleventyConfig.addWatchTarget('src/assets/');

  // "More cats looking for a home" on a cat's page: the next few cats in the list, wrapping round,
  // skipping the one being viewed and any marked as reserved.
  eleventyConfig.addFilter('othersThan', function (cats, slug, count) {
    const list = Array.isArray(cats) ? cats : [];
    const start = list.findIndex((c) => c.slug === slug);
    const ordered = start < 0 ? list : list.slice(start + 1).concat(list.slice(0, start));
    const open = ordered.filter((c) => !c.reserved);
    return (open.length >= count ? open : ordered).slice(0, count);
  });

  // Page text written in the editor (see lib/rich.js). Used as {{ content.page.text | rich | safe }}.
  const { rich, markdown, fill } = require('./lib/rich.js');
  eleventyConfig.addFilter('rich', rich);
  eleventyConfig.addFilter('markdown', markdown);
  eleventyConfig.addFilter('fill', fill);

  // News stories (src/news/items/*.md), newest first.
  eleventyConfig.addCollection('newsLatest', (api) => api.getFilteredByTag('news').sort((a, b) => b.date - a.date));

  // "More news" under a story: the other stories, newest first, up to `count`.
  eleventyConfig.addFilter('otherNews', (items, url, count) => (Array.isArray(items) ? items : []).filter((i) => i.url !== url).slice(0, count));

  // A value as JSON that is safe inside a <script> block.
  eleventyConfig.addFilter('json', (v) => JSON.stringify(v).replace(/</g, '\\u003c'));

  // "1 cat" or "12 cats".
  eleventyConfig.addFilter('catCount', (n) => (n === 1 ? '1 cat' : n + ' cats'));

  // A reminder in the build output while the site is still using stand-ins.
  eleventyConfig.on('eleventy.before', () => {
    try {
      const site = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/_data/site.json'), 'utf8'));
      const links = (site.donate && site.donate.links) || {};
      const all = Object.values(links.monthly || {}).concat(Object.values(links.oneoff || {}));
      const missing = all.filter((v) => !v).length;
      if (!all.length || missing) {
        const what = all.length ? missing + ' of ' + all.length + ' Stripe payment links in src/_data/site.json are still empty' : 'The Stripe payment links are missing from src/_data/site.json';
        console.warn('[happy-paws] ' + what + ', so those gifts show a "not switched on yet" message.');
      }
      if (!site.forms || !site.forms.endpoint) {
        console.warn('[happy-paws] forms.endpoint is empty in src/_data/site.json, so the contact and newsletter forms go straight to the thank-you page and send nothing.');
      }
    } catch (e) {
      /* the site data is read again by Eleventy, which will report any real problem */
    }
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    templateFormats: ['njk', 'html', 'md'],
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
};
