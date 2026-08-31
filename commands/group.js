'use strict';

const helpers = require('../utils/helpers');

async function requireAuthorizedActor(ctx) {
  const { senderJid, remoteJid, sock, store } = ctx;
  const isOwner = store.isOwner(senderJid);
  const isAdmin = await helpers.isUserAdmin(sock, remoteJid, senderJid);
  if (!isOwner && !isAdmin) return false;
  if (store.getSettings().safeAdminMode && !isOwner && !isAdmin) return false;
  return true;
}

async function getMeta(sock, jid) {
  const meta = await helpers.getGroupMetadata(sock, jid);
  if (!meta) throw new Error('Gagal mengambil metadata grup.');
  return meta;
}

async function sendMentions(ctx, participants, showNumbers = true) {
  const mentions = participants.map((p) => p.id);
  const lines = participants.slice(0, 600).map((p) => {
    if (showNumbers) return `@${helpers.jidToNumber(p.id)}`;
    return '‎'; // invisible char, keeps mention without showing list
  });
  const text = showNumbers
    ? `*TAG ALL*\n\n${lines.join(' ')}`
    : `*HIDETAG*\n\n${lines.join(' ')}`;
  await ctx.sock.sendMessage(ctx.remoteJid, { text, mentions }, { quoted: ctx.msg });
}

module.exports = [
  {
    command: 'setname',
    description: 'Ubah nama grup',
    category: 'GROUP',
    scope: 'group',
    usage: '.setname Nama baru',
    run: async (ctx) => {
      const name = (ctx.args || '').trim();
      if (!name) return ctx.reply('Penggunaan: .setname Nama baru');
      if (!(await requireAuthorizedActor(ctx))) return ctx.reply('⛔ Perlu izin owner/admin grup untuk mengubah nama.');
      await ctx.sock.groupUpdateSubject(ctx.remoteJid, name.slice(0, 100));
      return ctx.reply(`✅ Nama grup diubah menjadi:\n${name}`);
    }
  },
  {
    command: 'setdesc',
    description: 'Ubah deskripsi grup',
    category: 'GROUP',
    scope: 'group',
    usage: '.setdesc Deskripsi baru',
    run: async (ctx) => {
      const desc = (ctx.args || '').trim();
      if (!desc) return ctx.reply('Penggunaan: .setdesc Deskripsi baru');
      if (!(await requireAuthorizedActor(ctx))) return ctx.reply('⛔ Perlu izin owner/admin grup untuk mengubah deskripsi.');
      await ctx.sock.groupUpdateDescription(ctx.remoteJid, desc.slice(0, 2000));
      return ctx.reply('✅ Deskripsi grup diperbarui.');
    }
  },
  {
    command: 'tagall',
    description: 'Mention semua anggota',
    category: 'GROUP',
    scope: 'group-any',
    run: async (ctx) => {
      const meta = await getMeta(ctx.sock, ctx.remoteJid);
      await sendMentions(ctx, meta.participants, true);
    }
  },
  {
    command: 'hidetag',
    description: 'Mention semua tanpa menampilkan nomor',
    category: 'GROUP',
    scope: 'group-any',
    run: async (ctx) => {
      const meta = await getMeta(ctx.sock, ctx.remoteJid);
      await sendMentions(ctx, meta.participants, false);
    }
  },
  {
    command: 'promote',
    description: 'Jadikan admin',
    category: 'ADMIN',
    scope: 'group',
    usage: '.promote @user / nomor',
    run: async (ctx) => {
      if (!(await requireAuthorizedActor(ctx))) return ctx.reply('⛔ Perlu izin owner/admin grup untuk promote.');
      const target = ctx.helpers.parseJidArg(ctx.args, ctx.helpers.getQuotedJid(ctx.msg));
      if (!target) return ctx.reply('Penggunaan: .promote @user atau .promote 628xxxxxxxx');
      const res = await ctx.sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'promote');
      const note = res?.[0]?.status?.msg || res?.[0]?.status || 'sukses';
      return ctx.reply(`✅ Promote ${ctx.helpers.jidToNumber(target)}\nStatus: ${String(note)}`);
    }
  },
  {
    command: 'demote',
    description: 'Turunkan admin',
    category: 'ADMIN',
    scope: 'group',
    usage: '.demote @user',
    run: async (ctx) => {
      if (!(await requireAuthorizedActor(ctx))) return ctx.reply('⛔ Perlu izin owner/admin grup untuk demote.');
      const target = ctx.helpers.parseJidArg(ctx.args, ctx.helpers.getQuotedJid(ctx.msg));
      if (!target) return ctx.reply('Penggunaan: .demote @user atau .demote 628xxxxxxxx');
      const meta = await getMeta(ctx.sock, ctx.remoteJid);
      const participant = meta.participants.find((p) => p.id === target);
      if (participant?.admin === 'superadmin') {
        return ctx.reply('⚠️ Bang ini adalah pemilik grup. Saya tidak akan menurunkan pemilik asli grup secara paksa.');
      }
      const res = await ctx.sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'demote');
      const note = res?.[0]?.status?.msg || res?.[0]?.status || 'sukses';
      return ctx.reply(`✅ Demote ${ctx.helpers.jidToNumber(target)}\nStatus: ${String(note)}`);
    }
  },
  {
    command: 'kick',
    description: 'Keluarkan anggota',
    category: 'ADMIN',
    scope: 'group',
    usage: '.kick @user',
    run: async (ctx) => {
      if (!(await requireAuthorizedActor(ctx))) return ctx.reply('⛔ Perlu izin owner/admin grup untuk kick.');
      const target = ctx.helpers.parseJidArg(ctx.args, ctx.helpers.getQuotedJid(ctx.msg));
      if (!target) return ctx.reply('Penggunaan: .kick @user atau .kick 628xxxxxxxx');
      const meta = await getMeta(ctx.sock, ctx.remoteJid);
      const participant = meta.participants.find((p) => p.id === target);
      if (participant?.admin) {
        return ctx.reply('⚠️ Target adalah admin. Kick admin/pemilik grup tidak dilakukan tanpa izin eksplisit.');
      }
      // Never kick bot itself or the group owner silently.
      if (target === ctx.sock.user?.id) return ctx.reply('⚠️ Saya tidak akan menendang diri sendiri.');
      const res = await ctx.sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'remove');
      const note = res?.[0]?.status?.msg || res?.[0]?.status || 'sukses';
      return ctx.reply(`✅ Kick ${ctx.helpers.jidToNumber(target)}\nStatus: ${String(note)}`);
    }
  },
  {
    command: 'add',
    description: 'Tambah anggota',
    category: 'ADMIN',
    scope: 'group',
    usage: '.add 628xxxxxxxx',
    run: async (ctx) => {
      if (!(await requireAuthorizedActor(ctx))) return ctx.reply('⛔ Perlu izin owner/admin grup untuk menambah anggota.');
      const target = ctx.helpers.parseJidArg(ctx.args, ctx.helpers.getQuotedJid(ctx.msg));
      if (!target) return ctx.reply('Penggunaan: .add 628xxxxxxxx');
      const exists = await ctx.sock.onWhatsApp(target);
      const found = Array.isArray(exists) && exists.length && exists[0].exists;
      if (!found) return ctx.reply('⚠️ Nomor tidak terdaftar di WhatsApp.');
      const res = await ctx.sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'add');
      const note = res?.[0]?.status?.msg || res?.[0]?.status || 'sukses';
      return ctx.reply(`✅ Add ${ctx.helpers.jidToNumber(target)}\nStatus: ${String(note)}`);
    }
  },
  {
    command: 'linkgc',
    description: 'Ambil link grup',
    category: 'GROUP',
    scope: 'group',
    run: async (ctx) => {
      const code = await ctx.sock.groupInviteCode(ctx.remoteJid);
      if (!code) return ctx.reply('Gagal mengambil link grup. Pastikan bot admin.');
      return ctx.reply(`🔗 Link grup:\nhttps://chat.whatsapp.com/${code}`);
    }
  },
  {
    command: 'revoke',
    description: 'Reset link grup',
    category: 'GROUP',
    scope: 'group',
    run: async (ctx) => {
      if (!(await requireAuthorizedActor(ctx))) return ctx.reply('⛔ Perlu izin owner/admin grup untuk reset link.');
      const code = await ctx.sock.groupRevokeInvite(ctx.remoteJid);
      return ctx.reply(code ? `✅ Link di-reset. Link baru:\nhttps://chat.whatsapp.com/${code}` : 'Gagal reset link.');
    }
  },
  {
    command: 'groupinfo',
    description: 'Informasi grup',
    category: 'GROUP',
    scope: 'group-any',
    run: async (ctx) => {
      const meta = await getMeta(ctx.sock, ctx.remoteJid);
      const owner = meta.owner || '-';
      return ctx.reply([
        `*INFO GRUP*`,
        '',
        `Nama : ${meta.subject}`,
        `ID   : ${meta.id}`,
        `Owner: ${ctx.helpers.jidToNumber(String(owner).split('@')[0])}`,
        `Anggota: ${meta.participants.length}`,
        `Admin: ${meta.participants.filter((p) => p.admin).length}`,
        `Desc : ${meta.desc || '-'}`
      ].join('\n'));
    }
  },
  {
    command: 'admins',
    description: 'Tampilkan daftar admin',
    category: 'GROUP',
    scope: 'group-any',
    run: async (ctx) => {
      const meta = await getMeta(ctx.sock, ctx.remoteJid);
      const admins = meta.participants.filter((p) => p.admin);
      const labels = admins.map((p) => `${p.admin === 'superadmin' ? '👑' : '⭐'} @${ctx.helpers.jidToNumber(p.id)}`);
      await ctx.sock.sendMessage(ctx.remoteJid, {
        text: `*ADMIN GRUP*\n\n${labels.join('\n') || 'Tidak ada admin.'}`,
        mentions: admins.map((p) => p.id)
      }, { quoted: ctx.msg });
    }
  },

];
