// logger.js – ANOMCAST simple console logger
// Format: [ANOMCAST][SCOPE] message  {optional meta}

'use strict';

function format(level, scope, message, meta) {
  const prefix = `[ANOMCAST][${scope.toUpperCase()}]`;
  if (meta !== undefined) {
    return `${prefix} ${message} ${typeof meta === 'object' ? JSON.stringify(meta) : meta}`;
  }
  return `${prefix} ${message}`;
}

function info(scope, message, meta) {
  console.log(format('INFO', scope, message, meta));
}

function warn(scope, message, meta) {
  console.warn(format('WARN', scope, message, meta));
}

function error(scope, message, meta) {
  console.error(format('ERROR', scope, message, meta));
}

module.exports = { info, warn, error };
