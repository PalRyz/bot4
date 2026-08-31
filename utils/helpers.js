'use strict';

const config = require('../config');

const JID_SUFFIX = '@s.whatsapp.net';

function normalizeNumber(value) {
  return String(value || '').replace(/\D+/g, '');
}

function toJid(value) {
  const digits = normalizeNumber(value);
  if (!digits) return null;
  return `${digits}${JID_SUFFIX}`;
}

function jidToNumber(jid) {
  return String(jid || '').split('@')[0];
}

function isGroupJid(jid) {
  return String(jid || '').endsWith('@g.us');
}

function isOwnerJid(jid) {
  return config.owner.includes(String(jid || ''));
}

function getSenderFromMessage(msg) {
  const key = msg?.key || {};
  const participant = msg?.participant || key.participant || key.remoteJid;
  if (participant && participant.endsWith(JID_SUFFIX)) return participant;
  if (key.remoteJid && key.remoteJid.endsWith(JID_SUFFIX) && !isGroupJid(key.remoteJid)) {
    return key.remoteJid;
  }
  return null;
}

function unwrapMessageContent(m) {
  if (!m) return null;
  if (m.ephemeralMessage?.message) return unwrapMessageContent(m.ephemeralMessage.message);
  if (m.viewOnceMessage?.message) return unwrapMessageContent(m.viewOnceMessage.message);
  if (m.documentWithCaptionMessage?.message) return unwrapMessageContent(m.documentWithCaptionMessage.message);
  return m;
}

function getQuotedExt(msg) {
  const m = unwrapMessageContent(msg?.message);
  return m?.extendedTextMessage || null;
}

function getQuotedJid(msg) {
  const quoted = getQuotedExt(msg);
  const participant = quoted?.participant || quoted?.contextInfo?.participant;
  return participant || null;
}

function quotedText(msg) {
  const ext = getQuotedExt(msg);
  return ext?.text || '';
}

function getTextBody(msg) {
  if (!m) return null;
  if (m.ephemeralMessage?.message) return unwrapMessageContent(m.ephemeralMessage.message);
  if (m.viewOnceMessage?.message) return unwrapMessageContent(m.viewOnceMessage.message);
  if (m.documentWithCaptionMessage?.message) return unwrapMessageContent(m.documentWithCaptionMessage.message);
  return m;
}

function getTextBody(msg) {
  const m = unwrapMessageContent(msg?.message);
  if (!m) return '';
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.documentMessage?.caption) return m.documentMessage.caption;
  if (m.templateMessage?.hydratedTemplate?.hydratedContentText) return m.templateMessage.hydratedTemplate.hydratedContentText;
  if (m.listResponseMessage?.title) return m.listResponseMessage.title;
  return '';
}

function getMessageInteraction(msg) {
  const m = unwrapMessageContent(msg?.message);
  if (!m) return null;
  if (m.listResponseMessage?.title) {
    return { type: 'list', value: m.listResponseMessage.title };
  }
  const btn = m.buttonsResponseMessage;
  if (btn) {
    return { type: 'button', value: btn.selectedButtonId || btn.selectedDisplayText || '' };
  }
  const tpl = m.templateButtonReplyMessage;
  if (tpl) {
    return { type: 'button', value: tpl.selectedId || tpl.selectedDisplayText || '' };
  }
  return null;
}

function isQuotedMedia(msg) {
  const ext = getQuotedExt(msg);
  const q = ext?.contextInfo?.quotedMessage;
  if (!q) return false;
  const inner = unwrapMessageContent(q);
  return Boolean(inner?.imageMessage || inner?.videoMessage || inner?.documentMessage || inner?.audioMessage || inner?.stickerMessage);
}

function extractJidsFromText(text) {
  const matches = String(text || '').match(/@?(\d{8,15})/g) || [];
  return [...new Set(matches.map((m) => toJid(m.replace('@', ''))).filter(Boolean))];
}

function extractMentions(text) {
  return String(text || '').match(/@(\d{8,15})/g) || [];
}

function parseJidArg(value, quotedSender) {
  let input = String(value || '').trim();
  if (!input && quotedSender) return quotedSender;
  if (/^@?(\d{8,15})$/.test(input)) return toJid(input.replace('@', ''));
  if (input.endsWith('@g.us') || input.endsWith(JID_SUFFIX)) return input;
  return null;
}

function firstGroupArg(text) {
  const args = (text || '').replace(/^\s*[.!]\S+/, '').split(/\s+/).filter(Boolean);
  return args[0] || '';
}

function splitCommandText(text, prefix) {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith(prefix)) return null;
  const body = trimmed.slice(prefix.length).trim();
  if (!body) return { command: '', args: '' };
  const idx = body.indexOf(' ');
  if (idx === -1) return { command: body.toLowerCase(), args: '' };
  return { command: body.slice(0, idx).toLowerCase(), args: body.slice(idx + 1).trim() };
}

function getQuotedMedia(msg) {
  const ext = getQuotedExt(msg);
  return ext?.contextInfo?.quotedMessage || null;
}

async function getGroupMetadata(sock, groupJid) {
  try {
    return await sock.groupMetadata(groupJid);
  } catch (err) {
    return null;
  }
}

async function isUserAdmin(sock, groupJid, userJid) {
  try {
    const meta = await getGroupMetadata(sock, groupJid);
    if (!meta) return false;
    const p = meta.participants.find((x) => x.id === userJid);
    return Boolean(p && (p.admin === 'admin' || p.admin === 'superadmin'));
  } catch {
    return false;
  }
}

async function isBotAdmin(sock, groupJid) {
  try {
    const meta = await getGroupMetadata(sock, groupJid);
    if (!meta) return false;
    const botJid = sock.user?.id;
    return meta.participants.some((x) => x.id === botJid && (x.admin === 'admin' || x.admin === 'superadmin'));
  } catch {
    return false;
  }
}

function formatSeconds(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function getBattery(conn) {
  const b = conn?.batteries?.[conn.user?.id]?.batteries?.[0];
  if (!b) return null;
  const plugged = b.plugged ? 'Charging' : 'Battery';
  return `${b.level}% (${plugged})`;
}

function randomString(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len) + Date.now().toString(36).slice(-4);
}

function errorMessage(err) {
  return String(err?.message || err || 'Unknown error');
}

function sanitizeText(str, max = 1000) {
  return String(str || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

module.exports = {
  JID_SUFFIX,
  normalizeNumber,
  toJid,
  jidToNumber,
  isGroupJid,
  isOwnerJid,
  getSenderFromMessage,
  getQuotedJid,
  quotedText,
  getTextBody,
  getMessageInteraction,
  isQuotedMedia,
  extractJidsFromText,
  extractMentions,
  parseJidArg,
  firstGroupArg,
  splitCommandText,
  getQuotedMedia,
  getGroupMetadata,
  isUserAdmin,
  isBotAdmin,
  formatSeconds,
  getBattery,
  randomString,
  errorMessage,
  sanitizeText
};
