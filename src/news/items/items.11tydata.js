// Settings shared by every news story in this folder.
module.exports = {
  layout: 'news-article.njk',
  tags: 'news',
  current: 'about',
  appeal: true,
  css: ['pages/news-article'],
  js: [],
  // The story text is plain markdown: nothing typed in it is treated as template code.
  templateEngineOverride: 'md',
  eleventyComputed: {
    permalink: (data) => '/news/' + data.page.fileSlug + '/',
    description: (data) => data.summary,
  },
};
