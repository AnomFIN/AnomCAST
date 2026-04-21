// samsungRemote.js – ANOMCAST Samsung TV WebSocket integration
//
// IMPORTANT: Samsung TV remote-control via WebSocket is model-dependent and
// undocumented. This implementation is best-effort.
//
// The rest of the ANOMCAST application works correctly regardless of whether
// this module succeeds or fails. Never let Samsung errors affect the share
// pipeline.
//
// Tested against: Tizen-based Samsung TVs (2016+) using the unofficial
// Samsung SmartThings remote-control WebSocket API.
// Not guaranteed to work on all models or firmware versions.

'use strict';

const WebSocket = require('ws');
const logger = require('../utils/logger');

// ── Configuration ─────────────────────────────────────────────────────────────
// Edit TV_IP to match your Samsung TV's local IP address.
// You can usually find it in Settings → General → Network → Network Status.

const TV_IP = '192.168.1.50';          // TODO: change to your TV's IP
const TV_PORT = 8001;
const TV_NAME = 'ANOMCAST';            // Friendly name shown in TV pairing dialog
const TV_NAME_B64 = Buffer.from(TV_NAME).toString('base64');
const WS_URL = `ws://${TV_IP}:${TV_PORT}/api/v2/channels/samsung.remote.control?name=${TV_NAME_B64}`;
const CONNECT_TIMEOUT_MS = 4000;

// ── State ─────────────────────────────────────────────────────────────────────

let ws = null;  // Active WebSocket connection, or null

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Attempt to connect to the Samsung TV WebSocket endpoint.
 * Resolves with the WebSocket instance on success, or null on failure.
 * Never rejects.
 */
function connect() {
  return new Promise((resolve) => {
    // If already connected and open, reuse it
    if (ws && ws.readyState === WebSocket.OPEN) {
      resolve(ws);
      return;
    }

    logger.info('SAMSUNG', `Connecting to ${WS_URL}`);

    let done = false;
    let socket;

    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      logger.warn('SAMSUNG', `Connection timed out after ${CONNECT_TIMEOUT_MS}ms`);
      try { socket.terminate(); } catch (_) {}
      ws = null;
      resolve(null);
    }, CONNECT_TIMEOUT_MS);

    try {
      socket = new WebSocket(WS_URL);
    } catch (err) {
      clearTimeout(timeout);
      logger.error('SAMSUNG', `Could not create WebSocket: ${err.message}`);
      ws = null;
      resolve(null);
      return;
    }

    socket.on('open', () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      logger.info('SAMSUNG', 'Connected to TV');
      ws = socket;
      resolve(ws);
    });

    socket.on('error', (err) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      logger.warn('SAMSUNG', `WebSocket error: ${err.message}`);
      ws = null;
      resolve(null);
    });

    socket.on('close', () => {
      if (ws === socket) {
        ws = null;
      }
    });

    // Log any messages from the TV (e.g. pairing confirmation)
    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        logger.info('SAMSUNG', 'Message from TV', msg.event || data.toString());
      } catch (_) {
        logger.info('SAMSUNG', 'Raw message from TV:', data.toString());
      }
    });
  });
}

/**
 * Send a remote-control key command to the TV.
 * Returns true on success, false if the key could not be sent.
 *
 * @param {string} key - Samsung key name, e.g. 'KEY_HOME', 'KEY_ENTER'
 */
async function sendKey(key) {
  const socket = ws && ws.readyState === WebSocket.OPEN ? ws : await connect();
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.warn('SAMSUNG', `sendKey(${key}) – not connected`);
    return false;
  }

  const payload = JSON.stringify({
    method: 'ms.remote.control',
    params: {
      Cmd: 'Click',
      DataOfCmd: key,
      Option: 'false',
      TypeOfRemote: 'SendRemoteKey'
    }
  });

  return new Promise((resolve) => {
    socket.send(payload, (err) => {
      if (err) {
        logger.warn('SAMSUNG', `sendKey(${key}) failed: ${err.message}`);
        resolve(false);
      } else {
        logger.info('SAMSUNG', `sendKey(${key}) sent`);
        resolve(true);
      }
    });
  });
}

/**
 * Attempt to open the ANOMCAST receiver page in the TV's built-in browser.
 *
 * NOTE: Reliably launching a specific URL in the Samsung TV browser via
 * WebSocket remote control is highly model-dependent and not universally
 * supported. This is a best-effort placeholder.
 *
 * If automatic launch does not work for your model, open the receiver page
 * manually in the TV browser:  http://<PC_LOCAL_IP>:3847/tv
 *
 * @param {string} receiverUrl - The URL to open on the TV
 */
async function openReceiver(receiverUrl) {
  logger.info('SAMSUNG', `openReceiver requested for: ${receiverUrl}`);

  // TODO: Some Tizen TVs expose a 'ms.channel.emit' or app-launch mechanism.
  // This is model-specific and not implemented reliably here.
  // For now, log a helpful message and return false so the caller knows
  // the TV was not automated.

  logger.warn(
    'SAMSUNG',
    'Automatic receiver page launch is not implemented reliably for all models. ' +
    `Open this URL manually in your TV browser: ${receiverUrl}`
  );

  return false;
}

/**
 * Convenience function called by the bridge after a successful share.
 * Attempts Samsung integration without blocking the response pipeline.
 * Swallows all errors.
 *
 * @param {string} receiverUrl
 * @param {object} share
 */
async function notifyShare(receiverUrl, share) {
  try {
    logger.info('SAMSUNG', `New share received: ${share.title}`);
    await openReceiver(receiverUrl);
  } catch (err) {
    // Never let Samsung errors propagate
    logger.error('SAMSUNG', `notifyShare error (non-fatal): ${err.message}`);
  }
}

module.exports = { connect, sendKey, openReceiver, notifyShare };
