// background.js – ANOMCAST Chrome Extension service worker
// Handles context menu, keyboard shortcut, and share dispatch.

const BRIDGE_URL = 'http://127.0.0.1:3847/share';

// ── Setup ────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'anomcast-share-link',
    title: 'Jaa linkki telkkariin',
    contexts: ['link']
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Send a share payload to the local bridge.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function sendShare(payload) {
  try {
    const response = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Build a share payload from a Chrome tab object.
 */
function payloadFromTab(tab) {
  return {
    url: tab.url || '',
    title: tab.title || tab.url || '',
    favicon: tab.favIconUrl || null,
    timestamp: Date.now()
  };
}

/**
 * Get the active tab in the current window and send it to the bridge.
 * Logs success or failure to the service-worker console.
 */
async function shareActiveTab() {
  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    console.error('[ANOMCAST] Could not query tabs:', err.message);
    return;
  }

  const tab = tabs && tabs[0];
  if (!tab || !tab.url) {
    console.warn('[ANOMCAST] No shareable tab found.');
    return;
  }

  // chrome:// and edge:// pages cannot meaningfully be shared
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
    console.warn('[ANOMCAST] Tab URL is not http/https – skipping.');
    return;
  }

  const result = await sendShare(payloadFromTab(tab));
  if (result.ok) {
    console.log('[ANOMCAST] Shared:', result.share && result.share.url);
  } else {
    console.error('[ANOMCAST] Share failed:', result.error);
  }
}

// ── Keyboard shortcut ────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === 'share-tab') {
    shareActiveTab();
  }
});

// ── Context menu ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'anomcast-share-link') return;

  const url = info.linkUrl || '';
  if (!url) {
    console.warn('[ANOMCAST] Context menu: no link URL found.');
    return;
  }

  const payload = {
    url,
    title: url,  // link text not available via contextMenus in MV3
    favicon: null,
    timestamp: Date.now()
  };

  sendShare(payload).then((result) => {
    if (result.ok) {
      console.log('[ANOMCAST] Link shared:', url);
    } else {
      console.error('[ANOMCAST] Link share failed:', result.error);
    }
  });
});

// ── Message from popup ───────────────────────────────────────────────────────
// The popup sends a message asking background to share the active tab,
// so it benefits from service-worker tab permissions.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'share-active-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url) {
        sendResponse({ ok: false, error: 'Välilehteä ei voitu jakaa' });
        return;
      }
      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        sendResponse({ ok: false, error: 'Välilehteä ei voitu jakaa' });
        return;
      }
      sendShare(payloadFromTab(tab)).then((result) => {
        sendResponse(result);
      });
    });
    // Return true to keep the message channel open for async sendResponse
    return true;
  }
});
