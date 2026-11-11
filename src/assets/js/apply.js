/* Happy Paws Cat Rescue: the adoption application page.
   When the address is /apply/?cat=Name (the Apply button on a cat's page sends people here), show
   a short note with that cat's name above the form, so people know what to type in it.
   The name is put in with textContent, never as HTML, so nothing in the address can add markup. */
(function () {
  'use strict';
  var banner = document.querySelector('[data-cat-banner]');
  var holder = banner && banner.querySelector('[data-cat-name]');
  if (!banner || !holder) return;
  var name = '';
  try { name = new URLSearchParams(window.location.search).get('cat') || ''; } catch (e) { return; }
  name = name.replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!name) return;
  holder.textContent = name;
  banner.hidden = false;
})();
