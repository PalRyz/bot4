'use strict';

const helpers = require('../utils/helpers');

async function getAllGroupJids(sock) {
  try {
    const groups = await sock.groupFetchAllParticipating();
    return Object.keys(groups || {});
  } catch (err) {
    throw new Error(`Tidak bisa mengambil daftar grup: ${err.message}`);
  }
}

module.exports = [
  {
    command: 'addowner',
    description: 'Tambah owner baru',
    category: 'OWNER',
    scope: 'owner',
    usage: '.addowner 628xxxxxxxx',
    run: async (ctx) => {
      const input = (ctx.args || '').split(/[\s,]+/)[0];
      if (!input) return ctx.reply('Penggunaan: .addowner 628xxxxxxxx');
      const jid = ctx.helpers.toJid(input.replace('@', ''));
      if (!jid) return ctx.reply('Nomor tidak valid. Contoh: .addowner 6281234567890');
      const ok = ctx.store.addOwner(jid);
      ctx.reply(ok ? `✅ Owner ditambahkan: ${ctx.helpers.jidToNumber(jid)}` : '⚠️ Nomor sudah menjadi owner.');
    }
  },
  {
    command: 'delowner',
    description: 'Hapus owner',
    category: 'OWNER',
    scope: 'owner',
    usage: '.delowner 628xxxxxxxx',
    run: async (ctx) => {
      const input = (ctx.args || '').split(/[\s,]+/)[0];
      if (!input) return ctx.reply('Penggunaan: .delowner 628xxxxxxxx');
      const jid = ctx.helpers.toJid(input.replace('@', ''));
      const owners = ctx.store.getOwners();
      if (!jid || !owners.includes(jid)) return ctx.reply('Nomor tersebut bukan owner.');
      if (owners.length <= 1 && owners[0] === jid) return ctx.reply('⚠️ Tidak bisa menghapus owner terakhir.');
      ctx.store.removeOwner(jid);
      ctx.reply(`🗑️ Owner dihapus: ${ctx.helpers.jidToNumber(jid)}`);
    }
  },
  {
    command: 'listowner',
    description: 'Daftar semua owner',
    category: 'OWNER',
    scope: 'owner',
    run: async (ctx) => {
      const owners = ctx.store.getOwners();
      const text = owners.length
        ? `*DAFTAR OWNER*\n\n${owners.map((j) => `• ${ctx.helpers.jidToNumber(j)}`).join('\n')}`
        : 'Belum ada owner. Set OWNER_NUMBER di .env.';
      return ctx.reply(text);
    }
  },
  {
    command: 'broadcast',
    description: 'Kirim pesan ke semua grup',
    category: 'OWNER',
    scope: 'owner',
    usage: '.broadcast [teks]',
    run: async (ctx) => {
      const text = (ctx.args || '').trim();
      if (!text) return ctx.reply('Penggunaan: .broadcast pesan yang ingin disebar');
      const jids = await getAllGroupJids(ctx.sock);
      if (!jids.length) return ctx.reply('Tidak ada grup yang bisa di-broadcast.');
      const limit = ctx.config.maxBroadcastGroups;
      const target = jids.slice(0, limit);
      let ok = 0;
      let fail = 0;
      for (const jid of target) {
        try {
          await ctx.sock.sendMessage(jid, { text }, {});
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      return ctx.reply(`✅ Broadcast ke ${ok} grup. Gagal: ${fail}.`);
    }
  },
  {
    command: 'restart',
    description: 'Restart bot',
    category: 'OWNER',
    scope: 'owner',
    run: async (ctx) => {
      await ctx.reply('🔁 Bot akan restart...');
      setTimeout(() => process.exit(99), 800);
    }
  },
  {
    command: 'shutdown',
    description: 'Matikan bot',
    category: 'OWNER',
    scope: 'owner',
    run: async (ctx) => {
      await ctx.reply('🛑 Bot dimatikan...');
      setTimeout(() => process.exit(0), 800);
    }
  },
  {
    command: 'status',
    description: 'Status koneksi bot',
    category: 'OWNER',
    scope: 'owner',
    run: async (ctx) => {
      const status = ctx.bot?.status || 'unknown';
      const note = ctx.bot?.note || '';
      const battery = helpers.getBattery(ctx.sock);
      return ctx.reply(`*STATUS BOT*\n\nStatus : ${ctx.style.statusEmoji(status)} ${status}\nCatatan: ${note || '-'}\nBattery : ${battery || 'n/a'}`);
    }
  }
];
