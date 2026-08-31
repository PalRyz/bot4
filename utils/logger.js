'use strict';

/**
 * Safe logger.
 *
 * - Never logs raw message body / private chat content.
 * - Redacts anything that looks like a credential, token or session key.
 * - Keeps the console output useful for Termux users without leaking secrets.
 */

const SENSITIVE_PATTERNS = [
  /(api[_-]?key\s*[=:]\s*\S+)/i,
  /(token\s*[=:]\s*\S+)/i,
  /(password\s*[=:]\s*\S+)/i,
  /(secret\s*[=:]\s*\S+)/i,
  /(key\s*[=:]\s*\S+)/i,
  /sk-[a-zA-Z0-9_-]{16,}/,
  /Bearer\s+[a-zA-Z0-9._~+/=-]+/i,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/
];

function redact(value) {
  let out = String(value);
  for (const re of SENSITIVE_PATTERNS) {
    out = out.replace(re, '<redacted>');
  }
  return out;
}

function ts() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function format(level, message, meta) {
  const base = `[${ts()}] [${level.toUpperCase()}] ${redact(message)}`;
  if (!meta) return base;
  return `${base} ${redact(typeof meta === 'string' ? meta : JSON.stringify(meta))}`;
}

const logger = {
  info: (msg, meta) => console.log(format('info', msg, meta)),
  warn: (msg, meta) => console.warn(format('warn', msg, meta)),
  error: (msg, meta) => console.error(format('error', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.DEBUG === 'true') console.log(format('debug', msg, meta));
  }
};

module.exports = logger;
