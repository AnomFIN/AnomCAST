// validateShare.js – validate and normalize incoming share payloads

'use strict';

const crypto = require('crypto');

/**
 * Validate and normalize a raw share payload received from the extension.
 *
 * @param {object} raw - The parsed JSON body from the POST /share request.
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
function validateAndNormalizeShare(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid share payload' };
  }

  // url is required and must be a string
  if (!raw.url || typeof raw.url !== 'string') {
    return { ok: false, error: 'Invalid share payload' };
  }

  // url must begin with http:// or https://
  if (!raw.url.startsWith('http://') && !raw.url.startsWith('https://')) {
    return { ok: false, error: 'Invalid share payload' };
  }

  // Normalize title: use provided string, or fall back to url
  const title =
    raw.title && typeof raw.title === 'string' && raw.title.trim().length > 0
      ? raw.title.trim()
      : raw.url;

  // favicon: must be string if present, otherwise null
  const favicon =
    raw.favicon && typeof raw.favicon === 'string' ? raw.favicon : null;

  // timestamp: must be a finite number if present, otherwise use server time
  const timestamp =
    typeof raw.timestamp === 'number' && isFinite(raw.timestamp)
      ? raw.timestamp
      : Date.now();

  // Generate a simple unique ID
  const id = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  const data = {
    id,
    url: raw.url,
    title,
    favicon,
    timestamp,
    receivedAt: new Date().toISOString()
  };

  return { ok: true, data };
}

module.exports = { validateAndNormalizeShare };
