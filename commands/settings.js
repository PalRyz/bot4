'use strict';

module.exports = [
  {
    command: 'setprefix',
    description: 'Ubah prefix bot',
    category: 'SETTINGS',
    scope: 'owner',
    usage: '.setprefix !',
    run: async (ctx) => {
      const prefix = (ctx.args || '').trim();
      if (!prefix || prefix.length > 3) {
        return ctx.reply('Prefix harus 1-3 karakter. Contoh: .setprefix !');
      }
      ctx.store.updateSettings({ prefix });
      return ctx.reply(`✅ Prefix diubah menjadi *${prefix}*`);
    }
  },
  {
    command: 'setbotname',
    description: 'Ubah nama bot',
    category: 'SETTINGS',
    scope: 'owner',
    usage: '.setbotname Nama Bot',
    run: async (ctx) => {
      const name = (ctx.args || '').trim();
      if (!name) return ctx.reply('Penggunaan: .setbotname Nama Bot');
      ctx.store.updateSettings({ botName: name.slice(0, 64) });
      try {
        await ctx.sock.updateProfileName(name.slice(0, 64));
      } catch {
        // Some accounts do not allow changing profile name; local config still applies.
      }
      return ctx.reply(`✅ Nama bot diubah menjadi *${name}*`);
    }
  },
  {
    command: 'setppbot',
    description: 'Ganti foto profil bot (balas gambar)',
    category: 'SETTINGS',
    scope: 'owner',
    usage: '.setppbot (balas gambar)',
    run: async (ctx) => {
      const { buffer } = await ctx.media.getMediaFromQuoted(ctx.sock, ctx.msg);
      const pp = await ctx.media.makeProfilePicture(buffer);
      await ctx.sock.updateProfilePicture(ctx.sock.user?.id, pp);
      return ctx.reply('✅ Foto profil bot diperbarui.');
    }
  }
];
