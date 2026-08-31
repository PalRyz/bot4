'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load .env only if it exists; do not crash when running with system env vars.
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

const JID_SUFFIX = '@s.whatsapp.net';

function toDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizePhone(value) {
  const digits = toDigits(value);
  return digits;
}

function toJid(value) {
  const digits = normalizePhone(value);
  if (!digits) return null;
  return `${digits}${JID_SUFFIX}`;
}

function parseOwners(value) {
  const raw = String(value || '')
    .split(/[;, ]+/)
    .map(toJid)
    .filter(Boolean);
  return [...new Set(raw)];
}

function envBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function envInt(value, fallback) {
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  botName: process.env.BOT_NAME || 'NOPALRYZ.exe',
  prefix: process.env.BOT_PREFIX || '.',
  owner: parseOwners(process.env.OWNER_NUMBER),
  loginMethod: (process.env.LOGIN_METHOD || 'pairing').toLowerCase(),
  pairingPhone: normalizePhone(process.env.PAIRING_PHONE),
  sessionDir: process.env.SESSION_DIR || 'session',
  theme: process.env.THEME || 'glitch',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  safeAdminMode: envBool(process.env.SAFE_ADMIN_MODE, true),
  cooldownMs: envInt(process.env.COOLDOWN_MS, 3000),
  rateLimitMax: envInt(process.env.RATE_LIMIT_MAX, 20),
  rateLimitWindowMs: envInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  maxBroadcastGroups: envInt(process.env.MAX_BROADCAST_GROUPS, 200),
  ai: {
    baseUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    maxTokens: envInt(process.env.AI_MAX_TOKENS, 700),
    temperature: 0.7
  }
};

config.jidSuffix = JID_SUFFIX;
config.toJid = toJid;
config.normalizePhone = normalizePhone;

// Make sure owners are always persisted as jids.
config.defaultOwner = config.owner;

module.exports = config;
