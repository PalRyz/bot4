'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config');
const { MEDIA_DIR } = require('./media');

async function fetchBuffer(url, options = {}) {
  const res = await axios.get(String(url), {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxContentLength: 50 * 1024 * 1024,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; NOPALRYZbot) AppleWebKit/537.36'
    },
    ...options
  });
  return Buffer.from(res.data);
}

async function shortUrl(url) {
  const res = await axios.get('https://is.gd/create.php', {
    params: { format: 'json', url: String(url) }
  });
  if (!res.data || !res.data.shorturl) throw new Error('Short URL gagal.');
  return res.data.shorturl;
}

async function downloadViaYtdlp(url) {
  return new Promise((resolve, reject) => {
    const out = path.join(MEDIA_DIR, `dl-${Date.now()}.mp4`);
    const child = spawn(config.ytdlpPath, ['-o', out, '-f', 'mp4', '--no-playlist', '--max-filesize', '49m', url]);
    let stderr = '';
    child.on('error', (err) => reject(new Error(`yt-dlp tidak ditemukan: ${err.message}`)));
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp gagal: ${stderr.slice(-300)}`));
        return;
      }
      try {
        const buf = fs.readFileSync(out);
        fs.unlinkSync(out);
        resolve(buf);
      } catch (err) {
        reject(err);
      }
    });
  });
}

function isUrl(text) {
  return /^https?:\/\/[^\s]+$/i.test(String(text || '').trim());
}

async function extractUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

module.exports = { fetchBuffer, shortUrl, downloadViaYtdlp, isUrl, extractUrl };
