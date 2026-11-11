/* Happy Paws Cat Rescue: the age filter on the cats page.
   Every cat is in the page already, so without this script the page simply shows all of them. */
(function () {
  'use strict';
  var tilesWrap = document.querySelector('[data-tiles]');
  if (!tilesWrap) return;

  var ON = 'background:#1F3158;color:#E8EEF7;border:1.5px solid #1F3158';
  var OFF = 'background:#ffffff;color:#333333;border:1.5px solid #6D788F';
  var tiles = Array.prototype.slice.call(tilesWrap.children);
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter]'));
  var count = document.querySelector('[data-count]');
  var show = document.querySelector('[data-show-label]');
  var empty = document.querySelector('[data-empty]');
  var clears = Array.prototype.slice.call(document.querySelectorAll('[data-clear]'));
  var state = { age: 'Any' };

  function valid(kind, value) {
    return chips.some(function (c) { return c.getAttribute('data-filter') === kind && c.getAttribute('data-value') === value; });
  }
  function style(el, css) {
    css.split(';').forEach(function (d) {
      var i = d.indexOf(':');
      if (i > 0) el.style.setProperty(d.slice(0, i).trim(), d.slice(i + 1).trim());
    });
  }

  // Start from the address, so a link such as /cats/?age=Kitten opens already filtered.
  var params = new URLSearchParams(window.location.search);
  if (valid('age', params.get('age'))) state.age = params.get('age');

  function render(updateAddress) {
    var n = 0;
    tiles.forEach(function (t) {
      var ok = state.age === 'Any' || t.getAttribute('data-age') === state.age;
      t.hidden = !ok;
      if (ok) n++;
    });
    chips.forEach(function (c) {
      var on = state[c.getAttribute('data-filter')] === c.getAttribute('data-value');
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      style(c, on ? ON : OFF);
    });
    var filtered = state.age !== 'Any';
    if (count) count.textContent = n === 0 ? 'No cats match your choices' : (n === 1 ? '1 cat' : n + ' cats') + ' looking for a home';
    if (show) show.textContent = n === 0 ? 'See all cats' : 'Show ' + n + (n === 1 ? ' cat' : ' cats');
    if (empty) empty.hidden = n !== 0;
    clears.forEach(function (c) { if (!(empty && empty.contains(c))) c.hidden = !filtered; });
    if (updateAddress && window.history && history.replaceState) {
      var q = new URLSearchParams();
      if (state.age !== 'Any') q.set('age', state.age);
      var s = q.toString();
      history.replaceState(null, '', window.location.pathname + (s ? '?' + s : '') + window.location.hash);
    }
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      state[c.getAttribute('data-filter')] = c.getAttribute('data-value');
      render(true);
    });
  });
  clears.forEach(function (c) {
    c.addEventListener('click', function () { state.age = 'Any'; render(true); });
  });
  var showLink = document.querySelector('[data-show]');
  if (showLink) {
    showLink.addEventListener('click', function () {
      if (tiles.every(function (t) { return t.hidden; })) { state.age = 'Any'; render(true); }
    });
  }
  render(false);
})();
