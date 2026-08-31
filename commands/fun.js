'use strict';

const QUOTES = [
  'Hidup itu seperti naik sepeda. Kalau ingin seimbang, teruslah bergerak.',
  'Kamu tidak harus menjadi sempurna, kamu hanya harus menjadi versi terbaikmu.',
  'Satu langkah kecil hari ini adalah lompatan besar esok hari.',
  'Jangan bandingkan babak satu-mu dengan babak akhir orang lain.',
  'Mimpi besar dimulai dari keberanian untuk mencoba.'
];

const JOKES = [
  'Kenapa raja tidak pernah update software? Karena dia takut kehilangan taKHTA.',
  'Kenapa pohon bisa bahagia? Karena akarnya kuat dan daunnya selalu tersenyum.',
  'Guru: "Kenapa kamu tidak masuk?" Murid: "Karena saya pilih sore saja."',
  'Kenapa komputer tidak pernah lapar? Karena dia selalu punya RAM.',
  'Saya baca dari buku: jangan lupa baca buku.'
];

module.exports = [
  {
    command: 'joke',
    description: 'Joke acak',
    category: 'FUN',
    scope: 'all',
    run: async (ctx) => {
      const text = JOKES[Math.floor(Math.random() * JOKES.length)];
      return ctx.reply(`😆 ${text}`);
    }
  },
  {
    command: 'kata',
    description: 'Kata-kata / quote acak',
    category: 'FUN',
    scope: 'all',
    run: async (ctx) => {
      const text = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      return ctx.reply(`💬 ${text}`);
    }
  },
  {
    command: 'dice',
    description: 'Lempar dadu',
    category: 'FUN',
    scope: 'all',
    run: async (ctx) => {
      const n = Math.floor(Math.random() * 6) + 1;
      return ctx.reply(`🎲 Dadu: *${n}*`);
    }
  },
  {
    command: 'pick',
    description: 'Pilih salah satu opsi',
    category: 'FUN',
    scope: 'all',
    usage: '.pick a|b|c',
    run: async (ctx) => {
      const opts = (ctx.args || '').split('|').map((x) => x.trim()).filter(Boolean);
      if (!opts.length) return ctx.reply('Penggunaan: .pick pizza|burger|nasi');
      const pick = opts[Math.floor(Math.random() * opts.length)];
      return ctx.reply(`🎯 Pilihan saya: *${pick}*`);
    }
  },
  {
    command: 'truth',
    description: 'Jujur atau? (truth)',
    category: 'FUN',
    scope: 'all',
    run: async (ctx) => {
      const q = 'Apa hal kecil yang paling kamu syukuri hari ini?';
      return ctx.reply(`🎤 Truth: ${q}`);
    }
  }
];
