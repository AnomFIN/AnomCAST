// tv.js – ANOMCAST TV receiver page logic
// Fetches the current share from the bridge and renders it.
// Polls every 4 seconds for updates.

(function () {
  'use strict';

  var POLL_INTERVAL_MS = 4000;
  var API_URL = '/api/current';

  // ── DOM references ──────────────────────────────────────────────────────────
  var stateEmpty  = document.getElementById('state-empty');
  var stateShare  = document.getElementById('state-share');
  var stateError  = document.getElementById('state-error');
  var shareTitle  = document.getElementById('share-title');
  var shareUrl    = document.getElementById('share-url');
  var shareTime   = document.getElementById('share-time');
  var faviconWrap = document.getElementById('favicon-wrap');
  var favicon     = document.getElementById('favicon');
  var footerStatus = document.getElementById('footer-status');

  // Track the ID of the last rendered share to avoid unnecessary redraws
  var lastRenderedId = null;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function showOnly(el) {
    [stateEmpty, stateShare, stateError].forEach(function (s) {
      if (s === el) {
        s.classList.remove('hidden');
      } else {
        s.classList.add('hidden');
      }
    });
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
      var d = new Date(timestamp);
      return d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (e) {
      return '';
    }
  }

  function setFooterStatus(text) {
    if (footerStatus) footerStatus.textContent = text || '';
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  function renderShare(share) {
    if (!share) {
      showOnly(stateEmpty);
      setFooterStatus('Odottaa jakoa…');
      lastRenderedId = null;
      return;
    }

    // Skip unnecessary redraws
    if (share.id === lastRenderedId) return;
    lastRenderedId = share.id;

    shareTitle.textContent = share.title || share.url || '';

    shareUrl.textContent = share.url || '';
    shareUrl.href = share.url || '#';

    var timeLabel = share.timestamp
      ? 'Jaettu klo ' + formatTime(share.timestamp)
      : '';
    shareTime.textContent = timeLabel;

    if (share.favicon && typeof share.favicon === 'string') {
      favicon.src = share.favicon;
      favicon.alt = '';
      faviconWrap.classList.remove('hidden');

      // Hide favicon container if image fails to load
      favicon.onerror = function () {
        faviconWrap.classList.add('hidden');
      };
    } else {
      faviconWrap.classList.add('hidden');
    }

    showOnly(stateShare);
    setFooterStatus('Päivitetty klo ' + formatTime(Date.now()));
  }

  function renderError() {
    showOnly(stateError);
    setFooterStatus('Yhteys katkesi');
    lastRenderedId = null;
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────

  function fetchCurrentShare() {
    fetch(API_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok !== undefined) {
          renderShare(data.share || null);
        } else {
          renderShare(null);
        }
      })
      .catch(function () {
        renderError();
      });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  fetchCurrentShare();
  setInterval(fetchCurrentShare, POLL_INTERVAL_MS);

})();
