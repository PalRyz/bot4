'use strict';

const path = require('path');
const fs = require('fs');

const config = require('../config');
const store = require('../database/Store');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const security = require('../utils/security');
const senderUtils = require('../utils/sender');
const media = require('../utils/media');
const ai = require('../utils/ai');
const style = require('../utils/style');
const DOWNLOADER = require('../utils/downloader');
const registry = require('../commands/registry');

/**
 * Command handler / router.
 *
 * All commands are registered here with permission metadata. Commands never
 * receive the full raw message content for logging; they only get validated
 * args and a safe context.
 */

function register(def) {
  registry.register(def);
}

function loadCommandFiles() {
  const dir = path.join(__dirname, '..', 'commands');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'registry.js');
  for (const file of files) {
    const defs = require(path.join(dir, file));
    if (Array.isArray(defs)) defs.forEach(register);
    else if (defs) register(defs);
  }
  logger.info(`Loaded ${registry.count()} command(s).`);
}

function getCommand(name) {
  return registry.getCommand(name);
}

function getAllCommands() {
  return registry.getAllCommands();
}

function buildContext(sock, msg) {
  const remoteJid = msg?.key?.remoteJid || '';
  const senderJid = helpers.getSenderFromMessage(msg) || remoteJid;
  return {
    sock,
    msg,
    remoteJid,
    sender: senderUtils,
    senderJid,
    store,
    config,
    helpers,
    security,
    media,
    ai,
    style,
    logger,
    DOWNLOADER,
    bot: global.bot || {},
    isGroup: helpers.isGroupJid(remoteJid)
  };
}

function getTextBody2(msg) {
  return helpers.getTextBody(msg);
}

function resolveMenuCategory(value) {
  const v = String(value || '').toLowerCase();
  const map = [
    ['owner', 'owner'], ['group', 'group'], ['admin', 'admin'], ['downloader', 'downloader'],
    ['tools', 'tools'], ['fun', 'fun'], ['ai', 'ai'], ['settings', 'settings'], ['help', 'help']
  ];
  for (const [key, cat] of map) {
    if (v.includes(key)) return cat;
  }
  return null;
}

async function handleInteraction(sock, msg, interaction) {
  const category = resolveMenuCategory(interaction.value);
  if (!category) return;
  const def = getCommand(`menu${category}`);
  if (!def) return;
  try {
    await runCommand(buildContext(sock, msg), def, '', '');
  } catch (err) {
    logger.error('Interaction handler failed', err?.message || String(err));
  }
}

async function runCommand(ctx, command, body, text) {
  const { msg, sock, remoteJid, sender: senderUtils, senderJid } = ctx;

  await senderUtils.react(msg, '⚡');

  const perm = await security.assertPermission({
    command,
    sender: senderJid,
    remoteJid,
    sock,
    store,
    chatType: helpers.isGroupJid(remoteJid) ? 'group' : 'private'
  });

  if (!perm.ok) {
    await senderUtils.reply(sock, remoteJid, `⛔ ${perm.reason}`, msg);
    return false;
  }

  const result = await command.run({
    ...ctx,
    args: body,
    text,
    commandName: command.command,
    reply: (text, opts = {}) => senderUtils.reply(sock, remoteJid, text, opts.quoted || msg),
    sendText: (text, opts = {}) => senderUtils.sendText(sock, remoteJid, text, { quoted: opts.quoted || msg }),
    sendImage: async (buffer, caption) => senderUtils.safeImage(sock, remoteJid, { buffer, caption, quoted: msg }),
    sendSticker: async (buffer) => senderUtils.safeSticker(sock, remoteJid, buffer, msg)
  });

  if (result) await senderUtils.react(msg, '✅');
  return true;
}

async function handleMessage(sock, msg) {
  if (!msg || !msg.message) return;
  if (msg.key.fromMe) return;

  const remoteJid = msg?.key?.remoteJid || '';
  if (!remoteJid) return;
  const senderJid = helpers.getSenderFromMessage(msg) || remoteJid;

  const text = getTextBody2(msg);
  const interaction = helpers.getMessageInteraction(msg);

  if (!text) {
    if (interaction) await handleInteraction(sock, msg, interaction);
    return;
  }

  const parsed = helpers.splitCommandText(text, store.getSettings().prefix);
  if (!parsed) {
    if (interaction) await handleInteraction(sock, msg, interaction);
    return;
  }

  const { command, args: body } = parsed;
  if (!command) return;

  const forbidden = /(API_KEY|apiKey|AI_API_KEY|PAIRING_PHONE|OWNER_NUMBER|session|BOT_TOKEN)/i;
  if (forbidden.test(text)) {
    await senderUtils.reply(sock, remoteJid, '⚠️ Command ini menolak membocorkan credential/session. Detailnya tidak akan ditampilkan.', msg);
    return;
  }

  const cooldown = await security.checkCooldown(senderJid, command);
  if (!cooldown.allowed) {
    await senderUtils.reply(sock, remoteJid, `⏳ Cooldown: tunggu ${cooldown.wait}s.`, msg);
    return;
  }
  const rate = security.checkRateLimit(senderJid);
  if (!rate.allowed) {
    await senderUtils.reply(sock, remoteJid, '🚫 Rate limit: terlalu banyak perintah, coba lagi nanti.', msg);
    return;
  }

  const def = getCommand(command);
  if (!def) {
    await senderUtils.reply(sock, remoteJid, `❓ Perintah *${command}* tidak ditemukan. Ketik ${store.getSettings().prefix}menu`, msg);
    return;
  }

  try {
    await runCommand(buildContext(sock, msg), def, body, text);
  } catch (err) {
    logger.error(`Command ${command} failed`, err?.stack || err?.message || String(err));
    await senderUtils.react(msg, '❌');
    await senderUtils.reply(sock, remoteJid, `⚠️ Terjadi error: ${helpers.errorMessage(err)}`, msg);
  }
}

async function handleMessagesUpsert(sock, { messages, type }) {
  if (type !== 'notify') return;
  for (const msg of messages) {
    if (!msg?.message) continue;
    if (msg.message?.protocolMessage) continue;
    try {
      await handleMessage(sock, msg);
    } catch (err) {
      logger.error('Upsert handler failed', err.message || String(err));
    }
  }
}

loadCommandFiles();

module.exports = {
  register,
  loadCommandFiles,
  getCommand,
  getAllCommands,
  handleMessage,
  handleMessagesUpsert,
  buildContext,
  getRegistry: () => registry
};
