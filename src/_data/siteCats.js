// The cats the site shows and makes a page for, from whichever list /cats/ is set to use.
// See lib/cats.js and lib/listing.js. Not edited by hand.
const path = require('path');
const listing = require('./listing.js');
const { loadSiteCats } = require('../../lib/cats.js');

module.exports = () => loadSiteCats({ mode: listing().mode, root: path.join(__dirname, '../..') });
