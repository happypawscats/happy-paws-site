/* Happy Paws Cat Rescue: the "Give to Happy Paws" box on the homepage and the donate page.
   The pages already show a monthly gift of £5, so they make sense before this script runs. */
(function () {
  'use strict';
  var ladder = document.querySelector('[data-ladder]');
  if (!ladder) return;

  var root = document.documentElement;
  // One Stripe payment link per amount, from site.json (the page carries them in data-give-links).
  // The amounts on offer are the numbers listed there, so every choice has a link to go to.
  var LINKS = {};
  try { LINKS = JSON.parse(root.getAttribute('data-give-links') || '{}') || {}; } catch (err) { LINKS = {}; }
  function amountsFor(freq, fallback) {
    var group = LINKS[freq];
    if (!group) return fallback;
    var list = Object.keys(group).filter(function (k) { return k !== 'other' && parseFloat(k) > 0; })
      .map(parseFloat).sort(function (a, b) { return a - b; });
    return list.length ? list : fallback;
  }
  var MONTHLY = amountsFor('monthly', [3, 5, 10]);
  var ONEOFF = amountsFor('oneoff', [10, 25, 50, 200]);
  var START_MONTHLY = MONTHLY.indexOf(5) >= 0 ? 5 : MONTHLY[0];
  var START_ONEOFF = ONEOFF.indexOf(25) >= 0 ? 25 : ONEOFF[0];
  var FIELD_ON = 'background:#1F3158;border:1.5px solid #1F3158;color:#E8EEF7';
  var FIELD_OFF = 'background:#ffffff;border:1.5px solid #76829A;color:#333333';
  var CHIP_ON = 'background:#1F3158;color:#E8EEF7;border:1.5px solid #1F3158';
  var CHIP_OFF = 'background:#ffffff;color:#333333;border:1.5px solid #76829A';
  var TAB_ON = 'color:#1F3158;border-bottom:4px solid #1F3158';
  var TAB_OFF = 'color:#4F596B;border-bottom:4px solid transparent';
  var DOT_ON = 'width:20px;height:20px;flex:none;border-radius:50%;border:6px solid #E8EEF7;background:#1F3158';
  var DOT_OFF = 'width:20px;height:20px;flex:none;border-radius:50%;border:2px solid #76829A;background:#ffffff';
  var IMPACT_BASE = 'flex:1; min-width:0; font-size:14px; line-height:1.5;';

  var isDonatePage = !!ladder.querySelector('[data-row-label]');
  var template = ladder.firstElementChild.cloneNode(true);
  var freqButtons = Array.prototype.slice.call(document.querySelectorAll('[data-freq]'));
  var input = document.querySelector('[data-custom]');
  var field = document.querySelector('[data-custom-field]');
  var errorEl = document.querySelector('[data-custom-err]');
  var impactBox = document.querySelector('[data-impact]');
  var cta = document.querySelector('[data-cta]');
  var ctaLabel = document.querySelector('[data-cta-label]');
  var sumSub = document.querySelector('[data-summary-sub]');
  var sumAmount = document.querySelector('[data-summary-amount]');
  var sumPeriod = document.querySelector('[data-summary-period]');
  var customWrap = document.querySelector('[data-custom-wrap]');
  var monthlyNote = document.querySelector('[data-monthly-note]');
  var otherNote = document.querySelector('[data-other-note]');
  var notice = null;

  var state = { freq: 'monthly', amount: START_MONTHLY, custom: '' };

  function money(n) { return '£' + (Number.isInteger(n) ? String(n) : n.toFixed(2)); }
  function style(el, css) {
    css.split(';').forEach(function (d) {
      var i = d.indexOf(':');
      if (i > 0) el.style.setProperty(d.slice(0, i).trim(), d.slice(i + 1).trim());
    });
  }
  function clean(v) { return String(v || '').replace(/[^0-9.]/g, ''); }
  function effective() {
    var parsed = state.custom !== '' ? parseFloat(state.custom) : state.amount;
    return parsed && parsed >= 1 ? parsed : null;
  }
  // The Stripe link for the current choice, or '' while it has not been added. Only https links are used.
  // A custom amount is possible for a one-off gift only: Stripe cannot take a custom monthly amount on a payment link.
  function linkFor() {
    var group = LINKS[state.freq] || {};
    var url = state.custom !== '' ? (state.freq === 'oneoff' ? group.other : '') : group[String(state.amount)];
    return typeof url === 'string' && /^https:\/\//.test(url) ? url : '';
  }

  // Start from the address, so the homepage box can hand over to the donate page.
  var q = new URLSearchParams(window.location.search);
  if (q.get('freq') === 'oneoff') { state.freq = 'oneoff'; state.amount = START_ONEOFF; }
  if (q.get('amount')) {
    var a = clean(q.get('amount'));
    var list = state.freq === 'monthly' ? MONTHLY : ONEOFF;
    if (a && list.indexOf(parseFloat(a)) >= 0) state.amount = parseFloat(a);
    else if (a && state.freq === 'oneoff') { state.custom = a; state.amount = null; }
  }

  function syncLadder() {
    var values = state.freq === 'monthly' ? MONTHLY : ONEOFF;
    while (ladder.children.length > values.length) ladder.removeChild(ladder.lastElementChild);
    while (ladder.children.length < values.length) ladder.appendChild(template.cloneNode(true));
    var monthly = state.freq === 'monthly';
    var selected = -1;
    values.forEach(function (v, i) {
      var el = ladder.children[i];
      var on = state.custom === '' && state.amount === v;
      if (on) selected = i;
      el.setAttribute('data-amount', v);
      if (isDonatePage) {
        el.setAttribute('aria-checked', on ? 'true' : 'false');
        style(el, on ? FIELD_ON : FIELD_OFF);
        el.querySelector('[data-row-label]').textContent = money(v);
        var impact = el.querySelector('[data-row-impact]');
        if (!monthly && v === 200) {
          impact.textContent = 'About the average cost of rehoming one cat.';
          impact.setAttribute('style', IMPACT_BASE);
        } else {
          impact.textContent = '[What ' + money(v) + (monthly ? ' a month' : '') + ' covers: add a real cost from Happy Paws]';
          impact.setAttribute('style', IMPACT_BASE + ' font-style:italic; opacity:.85');
        }
        el.querySelector('[data-row-dot]').setAttribute('style', on ? DOT_ON : DOT_OFF);
      } else {
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
        el.textContent = money(v);
        style(el, on ? CHIP_ON : CHIP_OFF);
      }
    });
    if (isDonatePage) {
      // Radio buttons are reached with Tab once, then the arrow keys.
      var stop = selected >= 0 ? selected : 0;
      for (var i = 0; i < ladder.children.length; i++) ladder.children[i].setAttribute('tabindex', i === stop ? '0' : '-1');
    }
  }

  function homeImpact(eff) {
    if (eff === null) return ['Choose an amount to see what it can do.', '#4F596B', 'normal'];
    if (state.freq === 'oneoff' && state.custom === '' && eff === 200) return ['That is about the average cost of rehoming one cat.', '#333333', 'normal'];
    if (state.custom !== '') return ['Every pound makes a difference, even £1 can help us save a life.', '#333333', 'normal'];
    return ['[What ' + money(eff) + (state.freq === 'monthly' ? ' a month' : '') + ' covers: add a real cost from Happy Paws]', '#4F596B', 'italic'];
  }

  function render() {
    var monthly = state.freq === 'monthly';
    var eff = effective();
    var hasError = state.custom !== '' && eff === null;

    freqButtons.forEach(function (b) {
      var on = b.getAttribute('data-freq') === state.freq;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      style(b, isDonatePage ? (on ? FIELD_ON : FIELD_OFF) : (on ? TAB_ON : TAB_OFF));
    });
    syncLadder();

    // Other amounts are for one-off gifts only, so a monthly gift shows a short note instead.
    if (customWrap) customWrap.hidden = monthly;
    if (monthlyNote) monthlyNote.hidden = !monthly;

    if (input && input.value !== state.custom) input.value = state.custom;
    if (input) input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    if (field) {
      var active = state.custom !== '';
      style(field, active ? FIELD_ON : FIELD_OFF);
      if (input) input.style.color = active ? '#E8EEF7' : '#333333';
      var pound = field.querySelector('span[aria-hidden]');
      if (pound) pound.style.color = active ? '#E8EEF7' : '#1F3158';
    }
    if (errorEl) errorEl.hidden = !hasError;

    if (impactBox) {
      var im = homeImpact(eff);
      impactBox.textContent = im[0];
      impactBox.style.color = im[1];
      impactBox.style.fontStyle = im[2];
    }
    if (sumSub) sumSub.textContent = monthly ? 'Taken every month' : 'One payment, taken today';
    if (sumAmount) sumAmount.textContent = eff ? money(eff) : '-';
    if (sumPeriod) sumPeriod.textContent = eff ? (monthly ? 'a month' : 'one-off') : '';

    if (ctaLabel) {
      ctaLabel.textContent = eff ? 'Give ' + money(eff) + (monthly ? ' a month' : ' once')
                                 : (isDonatePage ? 'Enter an amount' : 'Choose an amount');
    }
    if (cta) {
      cta.setAttribute('aria-disabled', eff === null ? 'true' : 'false');
      if (eff === null) { cta.style.setProperty('background', '#B7C0D0'); cta.style.setProperty('pointer-events', 'none'); }
      else { cta.style.removeProperty('background'); cta.style.removeProperty('pointer-events'); }
      // The homepage box hands the choice over to the donate page.
      if (!isDonatePage && eff !== null) cta.setAttribute('href', '/donate/?freq=' + state.freq + '&amount=' + eff);
      // On the donate page the button is a real link to the matching Stripe page.
      if (isDonatePage) cta.setAttribute('href', (eff !== null && linkFor()) || '#top');
    }
    if (otherNote) {
      // Stripe's "choose what to pay" page does not know the amount typed here, so say it will be asked again.
      var again = isDonatePage && !monthly && state.custom !== '' && eff !== null;
      otherNote.hidden = !again;
      if (again) otherNote.textContent = "You'll be asked to enter " + money(eff) + ' again on the next page.';
    }
    if (notice) notice.hidden = true;
  }

  // ---- Events -------------------------------------------------------------
  freqButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.getAttribute('data-freq');
      if (next === state.freq) return;
      state.freq = next;
      state.amount = next === 'monthly' ? START_MONTHLY : START_ONEOFF;
      state.custom = '';
      render();
    });
  });
  ladder.addEventListener('click', function (e) {
    var el = e.target.closest('[data-amount]');
    if (!el || !ladder.contains(el)) return;
    state.amount = parseFloat(el.getAttribute('data-amount'));
    state.custom = '';
    render();
  });
  ladder.addEventListener('keydown', function (e) {
    if (!isDonatePage) return;
    var keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    var rows = Array.prototype.slice.call(ladder.children);
    var at = rows.indexOf(document.activeElement);
    if (at < 0) return;
    var to = null;
    if (e.key in keys) to = (at + keys[e.key] + rows.length) % rows.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = rows.length - 1;
    if (to === null) return;
    e.preventDefault();
    rows[to].focus();
    rows[to].click();
    rows[to].focus();
  });
  if (input) {
    input.addEventListener('input', function () {
      if (state.freq !== 'oneoff') { input.value = ''; return; }
      var v = clean(input.value);
      state.custom = v;
      state.amount = null;
      input.value = v;
      render();
    });
  }
  if (cta) {
    cta.addEventListener('click', function (e) {
      if (effective() === null) { e.preventDefault(); return; }
      if (!isDonatePage) return;
      if (linkFor()) return; // the button is already a link to Stripe's page
      e.preventDefault();
      if (!notice) {
        notice = document.createElement('p');
        notice.setAttribute('role', 'status');
        notice.style.cssText = 'margin:0; font-size:14px; line-height:1.6; padding:12px 16px; background:#F5CDD6; color:#333333';
        notice.textContent = 'Online giving is not switched on yet. When it is, this button opens our secure payment page.';
        cta.parentNode.insertBefore(notice, cta.nextSibling);
      }
      notice.hidden = false;
    });
  }

  render();
})();
