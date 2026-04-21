// logger.js – ANOMCAST simple console logger
// Format: [ANOMCAST][SCOPE] message  {optional meta}

'use strict';

function format(scope, message, meta) {
  const prefix = `[ANOMCAST][${scope.toUpperCase()}]`;
  if (meta !== undefined) {
    return `${prefix} ${message} ${typeof meta === 'object' ? JSON.stringify(meta) : meta}`;
  }
  return `${prefix} ${message}`;
}

function info(scope, message, meta) {
  console.log(format(scope, message, meta));
}

function warn(scope, message, meta) {
  console.warn(format(scope, message, meta));
}

function error(scope, message, meta) {
  console.error(format(scope, message, meta));
}

module.exports = { info, warn, error };
