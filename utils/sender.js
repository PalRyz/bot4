'use strict';

const { proto, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const logger = require('./logger');
const config = require('../config');
const style = require('./style');

/**
 * Safe message sender with native Button / List fallback.
 *
 * `sendWhatsAppMessage` is used by every command. It will:
 * 1. try to send a native List Message / Buttons Message
 * 2. if the protocol/phone rejects it, fall back to a clean text menu
 *
 * It never prints credentials or raw contents to logs.
 */

async function rawSend(sock, jid, content, options = {}) {
  return sock.sendMessage(jid, content, options);
}

function getErrorText(err) {
  return String(err?.message || err || 'Unknown error').slice(0, 300);
}

/**
 * Send a text message.
 */
async function sendText(sock, jid, text, options = {}) {
  const content = { text: String(text || '').slice(0, 64000) };
  if (options.mentions && options.mentions.length) content.mentions = options.mentions;
  return rawSend(sock, jid, content, { quoted: options.quoted || null });
}

/**
 * Try to send a List Message. Uses the legacy ListMessage proto format so it
 * works on most WhatsApp versions (normal + Business).
 */
async function sendList(sock, jid, {
  title,
  description,
  buttonText = '• MENU',
  sections,
  footerText = '',
  quoted = null
}) {
  try {
    const content = proto.Message.fromObject({
      listMessage: {
        title,
        description,
        buttonText,
        listType: 1,
        sections,
        footerText
      }
    });
    const msg = generateWAMessageFromContent(jid, content, { userJid: jid });
    await sock.sendMessage(jid, msg.message, { quoted });
    return { ok: true, fallback: false };
  } catch (err) {
    logger.debug('List message failed, falling back to text', getErrorText(err));
    return { ok: false, fallback: true };
  }
}

/**
 * Try to send a Buttons Message.
 */
async function sendButtons(sock, jid, {
  contentText,
  footerText = '',
  buttons = [],
  quoted = null
}) {
  try {
    const content = proto.Message.fromObject({
      buttonsMessage: {
        contentText,
        footerText,
        buttons: buttons.map((b) => ({
          buttonId: b.buttonId || b.id,
          buttonText: { displayText: b.text },
          type: 1
        })),
        headerType: 1
      }
    });
    const msg = generateWAMessageFromContent(jid, content, { userJid: jid });
    await sock.sendMessage(jid, msg.message, { quoted });
    return { ok: true, fallback: false };
  } catch (err) {
    logger.debug('Buttons message failed, falling back to text', getErrorText(err));
    return { ok: false, fallback: true };
  }
}

/**
 * Send a menu with native list/buttons if possible, otherwise plain text.
 */
async function sendMenu(sock, jid, {
  title,
  description,
  menuItems,
  quoted = null
}) {
  const sections = [
    {
      title: '┌─ ✦ NOPALRYZ MENU ✦ ─┐',
      rows: menuItems.map((item, index) => ({
        title: `${index + 1}. ${item.title}`,
        description: item.description,
        rowId: `menu_${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
      }))
    }
  ];

  const listResult = await sendList(sock, jid, {
    title,
    description,
    buttonText: 'Buka Menu',
    sections,
    footerText: style.footer(),
    quoted
  });

  if (!listResult.fallback) return { ok: true, kind: 'list' };

  const buttonResult = await sendButtons(sock, jid, {
    contentText: `${title}\n\n${description}`,
    footerText: style.footer(),
    buttons: menuItems.slice(0, 3).map((item) => ({
      id: `menu_${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      text: item.title
    })),
    quoted
  });

  if (!buttonResult.fallback) return { ok: true, kind: 'buttons' };

  const body = menuItems.map((item, index) => `${index + 1}. ${item.title} — ${item.description}`).join('\n');
  await sendText(sock, jid, `${title}\n\n${body}\n\n${style.footer()}`, { quoted });
  return { ok: true, kind: 'text' };
}

/**
 * React to a message (a small status signal, not the content).
 */
async function react(sock, msg, emoji = '✅') {
  try {
    const key = msg?.key;
    if (!key) return;
    await sock.sendMessage(key.remoteJid, {
      react: { text: emoji, key }
    });
  } catch (err) {
    logger.debug('Reaction failed', getErrorText(err));
  }
}

async function reply(sock, jid, text, quoted) {
  return sendText(sock, jid, text, { quoted });
}

async function safeImage(sock, jid, { buffer, caption = '', quoted = null, mentions = [] }) {
  try {
    await rawSend(sock, jid, {
      image: buffer,
      caption
    }, { quoted, mentions });
    return true;
  } catch (err) {
    logger.debug('Image send failed', getErrorText(err));
    await sendText(sock, jid, `Gagal mengirim media: ${getErrorText(err)}`, { quoted });
    return false;
  }
}

async function safeSticker(sock, jid, buffer, quoted = null) {
  try {
    await rawSend(sock, jid, { sticker: buffer }, { quoted });
    return true;
  } catch (err) {
    logger.debug('Sticker send failed', getErrorText(err));
    await sendText(sock, jid, `Gagal mengirim sticker: ${getErrorText(err)}`, { quoted });
    return false;
  }
}

async function safeVideo(sock, jid, buffer, quoted = null, caption = '') {
  try {
    await rawSend(sock, jid, { video: buffer, caption, gifPlayback: false }, { quoted });
    return true;
  } catch (err) {
    logger.debug('Video send failed', getErrorText(err));
    await sendText(sock, jid, `Gagal mengirim video: ${getErrorText(err)}`, { quoted });
    return false;
  }
}

module.exports = {
  rawSend,
  sendText,
  sendList,
  sendButtons,
  sendMenu,
  react,
  reply,
  safeImage,
  safeSticker,
  safeVideo
};
