/* Happy Paws Cat Rescue: scripts used on every page (menu, forms, small extras).
   Plain JavaScript, no libraries. The pages still work, with fewer extras, if this file does not load. */
(function () {
  'use strict';
  var root = document.documentElement;

  // ---- Mobile menu --------------------------------------------------------
  var button = document.querySelector('[data-menu-button]');
  var panel = document.getElementById('mobile-menu');
  if (button && panel) {
    var iconOpen = button.querySelector('[data-icon="open"]');
    var iconClose = button.querySelector('[data-icon="close"]');
    var setMenu = function (open) {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (iconOpen) iconOpen.style.display = open ? 'none' : 'flex';
      if (iconClose) iconClose.style.display = open ? 'flex' : 'none';
    };
    button.addEventListener('click', function () { setMenu(panel.hidden); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { setMenu(false); button.focus(); }
    });
    // If the window is widened past the phone layout, put the menu away.
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 981px)');
      var onChange = function () { if (wide.matches) setMenu(false); };
      if (wide.addEventListener) wide.addEventListener('change', onChange);
    }
  }

  // ---- Links that are still waiting for a real address ---------------------
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-placeholder]');
    if (a) e.preventDefault();
  });

  // ---- Copy link (news article) -------------------------------------------
  document.querySelectorAll('a[data-copy-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var label = null;
      for (var i = 0; i < a.childNodes.length; i++) {
        if (a.childNodes[i].nodeType === 3 && a.childNodes[i].nodeValue.trim()) { label = a.childNodes[i]; break; }
      }
      var original = label ? label.nodeValue : '';
      var done = function () {
        if (!label) return;
        label.nodeValue = 'Link copied';
        setTimeout(function () { label.nodeValue = original; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(done, function () {});
      }
    });
  });

  // ---- Forms ---------------------------------------------------------------
  // site.json "forms.endpoint" is empty while testing: the form then goes straight to the thank-you
  // page and sends nothing. When it has an address, the answers are posted there (Netlify Forms,
  // Formspree and similar services all accept this) before the thank-you page opens.
  var THANKS = '/enquiry-sent/';
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.getAttribute('data-sending')) return;
      var endpoint = root.getAttribute('data-form-endpoint');
      if (!endpoint) {
        if (window.console) console.info('[happy-paws] Test mode: the "' + form.getAttribute('data-form') + '" form was not sent.');
        window.location.href = THANKS;
        return;
      }
      var submit = form.querySelector('[type="submit"]');
      var message = form.querySelector('[data-form-error]');
      if (message) message.remove();
      form.setAttribute('data-sending', '1');
      if (submit) submit.disabled = true;
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: body
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        window.location.href = THANKS;
      }).catch(function () {
        form.removeAttribute('data-sending');
        if (submit) {
          submit.disabled = false;
          var p = document.createElement('p');
          p.setAttribute('role', 'alert');
          p.setAttribute('data-form-error', '');
          p.style.cssText = 'margin:0; font-size:15px; line-height:1.6; font-weight:500';
          p.textContent = 'Sorry, that did not send. Please try again, or email info@happypawscatrescue.org.';
          submit.parentNode.insertBefore(p, submit);
        }
      });
    });
  });
})();
