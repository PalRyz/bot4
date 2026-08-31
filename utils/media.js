'use strict';

const fs = require('fs');
const path = require('path');
const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const QRCode = require('qrcode');
const jsQR = require('jsqr');

const MEDIA_DIR = path.join(__dirname, '..', 'media');

function ensureMediaDir() {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

/**
 * Download an incoming WhatsApp media message as a Buffer.
 */
async function downloadMedia(sock, msg) {
  try {
    const type = getContentType(msg?.message);
    if (!type) throw new Error('No media content found');
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger: require('./logger'), reuploadRequest: sock.updateMediaMessage.bind(sock) }
    );
    return { type, buffer };
  } catch (err) {
    throw new Error(`Gagal mengunduh media: ${err.message}`);
  }
}

function extractQuotedMessage(msg) {
  const m = msg?.message || {};
  const ext = m.extendedTextMessage || m.ephemeralMessage?.message?.extendedTextMessage || m.viewOnceMessage?.message?.extendedTextMessage;
  return ext?.contextInfo?.quotedMessage || null;
}

async function getMediaFromQuoted(sock, msg) {
  const quoted = extractQuotedMessage(msg);
  if (!quoted) throw new Error('Balas pesan yang berisi media (gambar/video/dokumen).');
  return downloadMedia(sock, {
    key: { remoteJid: msg?.key?.remoteJid || '' },
    message: quoted
  });
}

/**
 * Convert image buffer to sticker (webp) with a cute padding.
 */
async function imageToSticker(buffer) {
  try {
    const image = sharp(buffer);
    const meta = await image.metadata();
    const width = meta.width || 512;
    const height = meta.height || 512;
    const max = 512;
    const ratio = Math.min(max / width, max / height, 1);
    const nw = Math.max(1, Math.round(width * ratio));
    const nh = Math.max(1, Math.round(height * ratio));

    return await sharp(buffer)
      .resize(nw, nh, { fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (err) {
    throw new Error(`Sticker gagal: ${err.message}`);
  }
}

/**
 * Convert video to animated sticker using ffmpeg (if available).
 */
async function videoToSticker(buffer) {
  const ffmpeg = require('fluent-ffmpeg');
  ensureMediaDir();
  const input = path.join(MEDIA_DIR, `vid-${Date.now()}.mp4`);
  const output = path.join(MEDIA_DIR, `vid-${Date.now()}.webp`);
  fs.writeFileSync(input, buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease',
        '-loop', '0',
        '-preset', 'ultrafast',
        '-c:v', 'libwebp',
        '-lossless', '0',
        '-q:v', '60',
        '-an',
        '-vcodec', 'libwebp',
        '-r', '12',
        '-f', 'webp'
      ])
      .output(output)
      .on('end', resolve)
      .on('error', reject);
  });

  try {
    return fs.readFileSync(output);
  } finally {
    try { fs.unlinkSync(input); } catch {}
    try { fs.unlinkSync(output); } catch {}
  }
}

/**
 * Generate a QR code PNG buffer.
 */
async function generateQr(text) {
  return QRCode.toBuffer(String(text || ''), {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M'
  });
}

/**
 * Decode a QR code from an image buffer.
 */
async function readQr(buffer) {
  const image = await sharp(buffer).ensureAlpha().resize({ width: 1024 }).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = image;
  const code = jsQR(new Uint8Array(data), info.width, info.height);
  if (!code || !code.data) throw new Error('QR tidak terbaca. Pastikan foto QR jelas.');
  return code.data;
}

/**
 * Resize / convert image for profile picture.
 */
async function makeProfilePicture(buffer) {
  return sharp(buffer)
    .resize(640, 640, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();
}

module.exports = {
  MEDIA_DIR,
  ensureMediaDir,
  downloadMedia,
  getMediaFromQuoted,
  imageToSticker,
  videoToSticker,
  generateQr,
  readQr,
  makeProfilePicture
};
