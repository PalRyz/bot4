'use strict';

/**
 * Admin-safe controls.
 *
 * IMPORTANT:
 * - `.lockadmin` does NOT take over a group.
 * - It never automatically kicks, demotes, or removes the real group owner.
 * - Sensitive actions are only performed when an authorized owner/admin sends
 *   an explicit command.
 */

module.exports = [
  {
    command: 'lockadmin',
    description: 'Aktifkan/nonaktifkan mode admin aman (tanpa take-over)',
    category: 'ADMIN',
    scope: 'owner',
    usage: '.lockadmin on | off',
    run: async (ctx) => {
      const mode = (ctx.args || 'on').trim().toLowerCase();
      if (!['on', 'off', 'enable', 'disable'].includes(mode)) {
        return ctx.reply('Penggunaan: .lockadmin on | off');
      }
      const enabled = mode === 'on' || mode === 'enable';
      if (enabled && !ctx.store.getSettings().safeAdminMode) {
        ctx.store.updateSettings({ safeAdminMode: true });
      } else if (!enabled && ctx.store.getSettings().safeAdminMode) {
        ctx.store.updateSettings({ safeAdminMode: false });
      }
      return ctx.reply(
        enabled
          ? '🛡️ Mode ADMIN AMAN aktif.\nBot TIDAK mengambil alih grup. Bot tidak melakukan kick/demote otomatis dan hanya menjalankan perintah owner/admin yang sah.'
          : '⚠️ Mode ADMIN AMAN nonaktif.\nPerintah sensitif tetap membutuhkan izin eksplisit dari owner/admin grup yang sah.'
      );
    }
  }
];
