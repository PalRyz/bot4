'use strict';

const { evaluate } = require('mathjs');
const DOWNLOADER = require('../utils/downloader');

const LANG_CODES = new Set([
  'id', 'en', 'ms', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'th', 'vi', 'tr'
]);

module.exports = [
  {
    command: 'qr',
    description: 'Buat QR Code',
    category: 'TOOLS',
    scope: 'all',
    usage: '.qr teks',
    run: async (ctx) => {
      const text = (ctx.args || '').trim();
      if (!text) return ctx.reply('Penggunaan: .qr teks / url');
      const buf = await ctx.media.generateQr(text);
      await ctx.sendImage(buf, `QR: ${text.slice(0, 100)}`);
    }
  },
  {
    command: 'qrread',
    description: 'Baca QR dari gambar',
    category: 'TOOLS',
    scope: 'all',
    usage: '.qrread (balas gambar QR)',
    run: async (ctx) => {
      const { buffer } = await ctx.media.getMediaFromQuoted(ctx.sock, ctx.msg);
      const result = await ctx.media.readQr(buffer);
      return ctx.reply(`*HASIL QR*\n\n${result}`);
    }
  },
  {
    command: 'shorturl',
    description: 'Perpendek URL',
    category: 'TOOLS',
    scope: 'all',
    usage: '.shorturl https://...',
    run: async (ctx) => {
      const url = await DOWNLOADER.extractUrl(ctx.args || '');
      if (!url) return ctx.reply('Penggunaan: .shorturl https://...');
      const short = await DOWNLOADER.shortUrl(url);
      return ctx.reply(`🔗 URL pendek: ${short}`);
    }
  },
  {
    command: 'short',
    description: 'Alias perpendek URL',
    category: 'TOOLS',
    scope: 'all',
    usage: '.short https://...',
    run: async (ctx) => {
      const url = await DOWNLOADER.extractUrl(ctx.args || '');
      if (!url) return ctx.reply('Penggunaan: .short https://...');
      const short = await DOWNLOADER.shortUrl(url);
      return ctx.reply(`🔗 URL pendek: ${short}`);
    }
  },
  {
    command: 'calc',
    description: 'Kalkulator',
    category: 'TOOLS',
    scope: 'all',
    usage: '.calc 2+2*3',
    run: async (ctx) => {
      const expr = (ctx.args || '').trim();
      if (!expr) return ctx.reply('Penggunaan: .calc 2+2*3');
      const result = evaluate(expr);
      return ctx.reply(`🧮 ${expr} = ${result}`);
    }
  },
  {
    command: 'tr',
    description: 'Alias terjemahkan (Google Translate)',
    category: 'TOOLS',
    scope: 'all',
    usage: '.tr en teks',
    run: async (ctx) => {
      const raw = (ctx.args || '').trim();
      const [maybeLang, ...rest] = raw.split(/\s+/);
      const lang = LANG_CODES.has(maybeLang.toLowerCase()) ? maybeLang.toLowerCase() : 'en';
      const text = LANG_CODES.has(maybeLang.toLowerCase()) ? rest.join(' ') : raw;
      const mod = require('@vitalets/google-translate-api');
      const res = await mod.translate(text, { to: lang });
      return ctx.reply(`*TERJEMAH (${lang})*\n\n${res.text}`);
    }
  }
];
