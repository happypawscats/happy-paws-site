// Tells the cats page which list to show (see lib/listing.js). Not edited by hand.
const fs = require('fs');
const path = require('path');
const { buildListing, WIDGET_FILE } = require('../../lib/listing.js');

module.exports = () => {
  const setting = JSON.parse(fs.readFileSync(path.join(__dirname, 'catsListing.json'), 'utf8'));
  let embed = '';
  try { embed = fs.readFileSync(path.join(__dirname, '../../', WIDGET_FILE), 'utf8'); } catch { /* only needed for the Pawlytics list */ }
  return buildListing(setting.mode, embed);
};
