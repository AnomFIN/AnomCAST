// shareStore.js – in-memory share state for ANOMCAST bridge
// No database, no filesystem, just module-level state.

'use strict';

const MAX_HISTORY = 20;

let currentShare = null;
const history = [];

/**
 * Store a new share as the current share and prepend it to history.
 * Trims history to MAX_HISTORY entries.
 *
 * @param {object} share - A normalized share object from validateShare.js
 */
function setShare(share) {
  currentShare = share;
  history.unshift(share);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
}

/**
 * Return the most recently shared item, or null if nothing has been shared.
 */
function getCurrent() {
  return currentShare;
}

/**
 * Return recent share history, newest first.
 *
 * @param {number} [limit] - Max number of items to return (default: all)
 * @returns {object[]}
 */
function getHistory(limit) {
  if (typeof limit === 'number' && limit > 0) {
    return history.slice(0, limit);
  }
  return history.slice();
}

module.exports = { setShare, getCurrent, getHistory };
