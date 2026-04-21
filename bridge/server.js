// server.js – ANOMCAST bridge main entry point

'use strict';

const express = require('express');
const path = require('path');
const logger = require('./utils/logger');
const { getLocalIPv4 } = require('./utils/network');
const { validateAndNormalizeShare } = require('./utils/validateShare');
const shareStore = require('./services/shareStore');
const samsungRemote = require('./services/samsungRemote');

const PORT = 3847;
const app = express();

// ── Simple rate limiter ───────────────────────────────────────────────────────
// Guards file-serving and API routes against accidental or malicious flooding.
// Uses an in-memory sliding window; no external package required.

const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 minute
const RATE_LIMIT_MAX = 120;              // requests per window per IP

const rateLimitMap = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({ ok: false, error: 'Too many requests' });
    return;
  }

  next();
}

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());

// Allow cross-origin requests from the Chrome extension (127.0.0.1)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Serve static files from /public (tv.html, tv.css, tv.js)
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: 'ANOMCAST',
    status: 'healthy',
    now: new Date().toISOString()
  });
});

// Current share
app.get('/api/current', (req, res) => {
  res.json({
    ok: true,
    share: shareStore.getCurrent()
  });
});

// Share history
app.get('/api/history', (req, res) => {
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = isNaN(rawLimit) || rawLimit <= 0 ? undefined : rawLimit;
  res.json({
    ok: true,
    items: shareStore.getHistory(limit)
  });
});

// Receive a new share from the Chrome extension
app.post('/share', rateLimit, (req, res) => {
  const validation = validateAndNormalizeShare(req.body);

  if (!validation.ok) {
    logger.warn('BRIDGE', `Invalid share payload: ${validation.error}`);
    return res.status(400).json({ ok: false, error: validation.error });
  }

  const share = validation.data;
  shareStore.setShare(share);
  logger.info('BRIDGE', `Share stored: ${share.title} — ${share.url}`);

  // Attempt Samsung integration asynchronously; never block the response
  const localIP = getLocalIPv4();
  const receiverUrl = `http://${localIP}:${PORT}/tv`;
  setImmediate(() => {
    samsungRemote.notifyShare(receiverUrl, share).catch((err) => {
      logger.error('SAMSUNG', `notifyShare error: ${err.message}`);
    });
  });

  res.json({ ok: true, share });
});

// TV receiver page – served via static middleware above (public/tv.html)
// Explicit route for /tv in case someone navigates there without a filename
app.get('/tv', rateLimit, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  logger.error('BRIDGE', `Unhandled error: ${err.message}`);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const localIP = getLocalIPv4();
  logger.info('BRIDGE', `Server listening on http://127.0.0.1:${PORT}`);
  logger.info('BRIDGE', `Receiver page: http://${localIP}:${PORT}/tv`);
  logger.info('BRIDGE', `Health check:  http://127.0.0.1:${PORT}/health`);
  logger.info('SAMSUNG', 'Configure TV_IP in bridge/services/samsungRemote.js');
});
