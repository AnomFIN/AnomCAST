// popup.js – ANOMCAST popup UI logic

const shareBtn = document.getElementById('share-btn');
const statusEl = document.getElementById('status');

const STATUS_TIMEOUT_MS = 3000;
let statusTimer = null;

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.className = 'status ' + (isError ? 'status--error' : 'status--ok');

  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status';
  }, STATUS_TIMEOUT_MS);
}

function setLoading(loading) {
  shareBtn.disabled = loading;
  shareBtn.textContent = loading ? 'Lähetetään…' : 'Jaa telkkariin';
}

shareBtn.addEventListener('click', () => {
  setLoading(true);
  setStatus('');

  // Ask the background service worker to share the active tab.
  // Background has reliable access to tab info in MV3.
  chrome.runtime.sendMessage({ action: 'share-active-tab' }, (response) => {
    setLoading(false);

    if (chrome.runtime.lastError) {
      setStatus('Bridge ei vastaa', true);
      return;
    }

    if (!response) {
      setStatus('Bridge ei vastaa', true);
      return;
    }

    if (response.ok) {
      setStatus('Jaettu telkkariin ✓', false);
    } else {
      const msg = response.error || 'Välilehteä ei voitu jakaa';
      setStatus(msg, true);
    }
  });
});
