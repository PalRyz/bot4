'use strict';

const fs = require('fs');
const path = require('path');
const DOWNLOADER = require('../utils/downloader');
const { MEDIA_DIR } = require('../utils/media');

module.exports = [
  {
    command: 'sticker',
    description: 'Gambar/Video → Sticker',
    category: 'DOWNLOADER',
    scope: 'all',
    usage: '.sticker (balas gambar/video)',
    run: async (ctx) => {
      const { type, buffer } = await ctx.media.getMediaFromQuoted(ctx.sock, ctx.msg);
      if (type === 'imageMessage' || type === 'stickerMessage') {
        const st = await ctx.media.imageToSticker(buffer);
        return ctx.sendSticker(st);
      }
      if (type === 'videoMessage') {
        const st = await ctx.media.videoToSticker(buffer);
        return ctx.sendSticker(st);
      }
      return ctx.reply('Format belum didukung. Balas gambar atau video.');
    }
  },
  {
    command: 's',
    description: 'Alias sticker (gambar/video → sticker)',
    category: 'DOWNLOADER',
    scope: 'all',
    usage: '.s (balas media)',
    run: async (ctx) => {
      const { type, buffer } = await ctx.media.getMediaFromQuoted(ctx.sock, ctx.msg);
      const st = type === 'videoMessage'
        ? await ctx.media.videoToSticker(buffer)
        : await ctx.media.imageToSticker(buffer);
      return ctx.sendSticker(st);
    }
  },
  {
    command: 'dl',
    description: 'Download media dari URL (butuh yt-dlp)',
    category: 'DOWNLOADER',
    scope: 'all',
    usage: '.dl https://...',
    run: async (ctx) => {
      const url = await DOWNLOADER.extractUrl(ctx.args || '');
      if (!url) return ctx.reply('Penggunaan: .dl https://...');
      const buf = await DOWNLOADER.downloadViaYtdlp(url);
      await ctx.sender.safeVideo(ctx.sock, ctx.remoteJid, buf, ctx.msg);
    }
  },
  {
    command: 'image',
    description: 'Unduh gambar dari URL',
    category: 'DOWNLOADER',
    scope: 'all',
    usage: '.image https://...gambar.jpg',
    run: async (ctx) => {
      const url = await DOWNLOADER.extractUrl(ctx.args || '');
      if (!url) return ctx.reply('Penggunaan: .image https://...gambar.jpg');
      const buf = await DOWNLOADER.fetchBuffer(url);
      await ctx.sendImage(buf, '');
    }
  },
  {
    command: 'tomp3',
    description: 'Konversi audio/video balasan menjadi MP3',
    category: 'DOWNLOADER',
    scope: 'all',
    usage: '.tomp3 (balas audio/video)',
    run: async (ctx) => {
      const { type, buffer } = await ctx.media.getMediaFromQuoted(ctx.sock, ctx.msg);
      if (!['audioMessage', 'videoMessage', 'documentMessage'].includes(type)) {
        return ctx.reply('Balas pesan audio atau video.');
      }
      const input = path.join(MEDIA_DIR, `in-${Date.now()}.bin`);
      const output = path.join(MEDIA_DIR, `out-${Date.now()}.mp3`);
      fs.writeFileSync(input, buffer);
      await new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg(input)
          .toFormat('mp3')
          .audioBitrate('128k')
          .output(output)
          .on('end', resolve)
          .on('error', reject);
      });
      const out = fs.readFileSync(output);
      try { fs.unlinkSync(input); } catch {}
      try { fs.unlinkSync(output); } catch {}
      await ctx.sock.sendMessage(ctx.remoteJid, { audio: out, mimetype: 'audio/mpeg', fileName: 'audio.mp3' }, { quoted: ctx.msg });
    }
  }
];
