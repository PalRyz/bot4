'use strict';

const config = require('../config');

/**
 * Modern / glitch visual styling helpers.
 * These are safe (Unicode only), no ANSI codes are sent to WhatsApp chats.
 */

const FONT_MAPS = {
  bold: {
    A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇',
    I: '𝐈', J: '𝐉', K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏',
    Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓', U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗',
    Y: '𝐘', Z: '𝐙', a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟',
    g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣', k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧',
    o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭', u: '𝐮', v: '𝐯',
    w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳'
  }
};

function mapText(text, map) {
  return String(text || '')
    .split('')
    .map((ch) => map[ch] || ch)
    .join('');
}

function boldStyle(text) {
  return mapText(text, FONT_MAPS.bold);
}

function glitch(text) {
  return `∥ ${text} ∥`;
}

function header(text) {
  return `▞▞▞ ${text} ▞▞▞`;
}

function section(title, lines) {
  const inner = lines.map((line) => `   ${line}`).join('\n');
  return `${header(title)}\n${inner}`;
}

function separator(char = '━') {
  return `${char.repeat(38)}`;
}

function footer() {
  return `< ${config.botName} • POWERED BY NOPALRYZ >`;
}

function modernCard(title, body) {
  return [
    '┌──────────────────────────┐',
    `│   ${String(title).padEnd(26)}│`,
    '├──────────────────────────┤',
    ...body.map((line) => `│ ${line}`),
    '└──────────────────────────┘'
  ].join('\n');
}

function statusEmoji(status) {
  const map = {
    connected: '🟢',
    connecting: '🟡',
    connecting_qr: '🟡',
    disconnected: '🔴',
    waiting: '⏳'
  };
  return map[status] || '🔘';
}

module.exports = {
  mapText,
  boldStyle,
  glitch,
  header,
  section,
  separator,
  footer,
  modernCard,
  statusEmoji
};
