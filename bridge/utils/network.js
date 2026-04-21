// network.js – detect local LAN IPv4 address
// Used to print the TV receiver URL that the TV can actually reach.

'use strict';

const os = require('os');

/**
 * Return the most likely local (non-loopback) IPv4 address.
 * Falls back to 127.0.0.1 if nothing useful is found.
 */
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return '127.0.0.1';
}

module.exports = { getLocalIPv4 };
