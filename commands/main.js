'use strict';

const config = require('../config');
const registry = require('./registry');

const CATEGORIES = {
  OWNER: '1',
  GROUP: '2',
  ADMIN: '3',
  DOWNLOADER: '4',
  TOOLS: '5',
  FUN: '6',
  AI: '7',
  SETTINGS: '8',
  HELP: '9'
};

function categoryFor(def) {
  return def.category || 'TOOLS';
}

function buildCategoryText(category, prefix) {
  const list = registry.getAllCommands()
    .filter((c) => categoryFor(c) === category)
    .map((c) => `• ${prefix}${c.command} — ${c.description || '...'}`)
    .join('\n');
  return list || 'Belum ada perintah.';
}

function buildMainDescription(prefix, botName) {
  return [
    `*${botName || config.botName}*`,
    '',
    'Modern WhatsApp Bot',
    'Pairing Code + QR',
    '',
    'Pilih menu:',
    ...Object.entries(CATEGORIES).map(([name, idx]) => `${idx} ${name}`)
  ].join('\n');
}

async function sendCategoryMenu(ctx, name) {
  const prefix = ctx.store.getSettings().prefix;
  const text = `*${name}*\n\n${buildCategoryText(name, prefix)}\n\n${ctx.style.footer()}`;
  await ctx.sender.sendText(ctx.sock, ctx.remoteJid, text, { quoted: ctx.msg });
}

async function sendMainMenu(ctx) {
  const settings = ctx.store.getSettings();
  const prefix = settings.prefix;
  const description = buildMainDescription(prefix, settings.botName);
  const menuItems = Object.entries(CATEGORIES).map(([name, idx]) => ({
    title: `${name} (${idx})`,
    description: `Perintah ${name.toLowerCase()}`
  }));
  await ctx.sender.sendMenu(ctx.sock, ctx.remoteJid, {
    title: '╭─ ✦ NOPALRYZ MENU ✦ ─╮',
    description,
    menuItems,
    quoted: ctx.msg
  });
}

module.exports = [
  {
    command: 'menu',
    description: 'Tampilkan menu utama (button/list/text)',
    category: 'HELP',
    scope: 'all',
    run: sendMainMenu
  },
  // Category shortcut menus. `menu<name>` avoids conflicts with real commands
  // such as `.ai` and `.help`.
  ...Object.keys(CATEGORIES).map((name) => ({
    command: `menu${name.toLowerCase()}`,
    description: `Menu kategori ${name}`,
    category: 'HELP',
    scope: 'all',
    run: async (ctx) => sendCategoryMenu(ctx, name)
  })),
  // Friendly aliases for category names that do not collide with real commands.
  { command: 'owner', description: 'Menu owner', category: 'HELP', scope: 'all', run: (ctx) => sendCategoryMenu(ctx, 'OWNER') },
  { command: 'group', description: 'Menu grup', category: 'HELP', scope: 'all', run: (ctx) => sendCategoryMenu(ctx, 'GROUP') },
  { command: 'admin', description: 'Menu admin', category: 'HELP', scope: 'all', run: (ctx) => sendCategoryMenu(ctx, 'ADMIN') },
  { command: 'downloader', description: 'Menu downloader', category: 'HELP', scope: 'all', run: (ctx) => sendCategoryMenu(ctx, 'DOWNLOADER') },
  { command: 'tools', description: 'Menu tools', category: 'HELP', scope: 'all', run: (ctx) => sendCategoryMenu(ctx, 'TOOLS') },
  { command: 'fun', description: 'Menu fun', category: 'HELP', scope: 'all', run: (ctx) => sendCategoryMenu(ctx, 'FUN') },
  { command: 'settings', description: 'Menu settings', category: 'HELP', scope: 'all', run: (ctx) => sendCategoryMenu(ctx, 'SETTINGS') },
  {
    command: 'help',
    description: 'Tampilkan bantuan semua perintah',
    category: 'HELP',
    scope: 'all',
    run: async (ctx) => {
      const prefix = ctx.store.getSettings().prefix;
      const lines = registry.getAllCommands()
        .sort((a, b) => (a.category || '').localeCompare(b.category || ''))
        .map((c) => `[${c.category || 'X'}] *${prefix}${c.command}* — ${c.description || ''}${c.usage ? `\n   Usage: ${c.usage}` : ''}`)
        .join('\n');
      await ctx.sender.sendText(ctx.sock, ctx.remoteJid, `*HELP MENU*\n\n${lines}\n\n${ctx.style.footer()}`, { quoted: ctx.msg });
    }
  },
  {
    command: 'ping',
    description: 'Cek bot masih hidup',
    category: 'HELP',
    scope: 'all',
    run: async (ctx) => {
      const start = Date.now();
      await ctx.sender.reply(ctx.sock, ctx.remoteJid, '🚀 Ping...', ctx.msg);
      const ms = Date.now() - start;
      await ctx.sender.sendText(ctx.sock, ctx.remoteJid, `✅ Bot aktif.\nPing: ${ms}ms`, { quoted: ctx.msg });
    }
  },
  {
    command: 'runtime',
    description: 'Waktu aktif bot',
    category: 'HELP',
    scope: 'all',
    run: async (ctx) => {
      const uptime = Math.floor(process.uptime());
      await ctx.sender.sendText(ctx.sock, ctx.remoteJid, `⏱️ Runtime: ${ctx.helpers.formatSeconds(uptime)}`, { quoted: ctx.msg });
    }
  },
  {
    command: 'info',
    description: 'Informasi bot',
    category: 'HELP',
    scope: 'all',
    run: async (ctx) => {
      const battery = ctx.helpers.getBattery(ctx.sock);
      const text = [
        `*${ctx.store.getSettings().botName || ctx.config.botName}*`,
        '',
        `Prefix    : *${ctx.store.getSettings().prefix}*`,
        `Mode    : ${ctx.config.loginMethod.toUpperCase()}`,
        `Owner    : ${ctx.store.getOwners().map((j) => ctx.helpers.jidToNumber(j)).join(', ') || '-'}`,
        `Runtime : ${ctx.helpers.formatSeconds(process.uptime())}`,
        `Battery : ${battery || 'n/a'}`,
        '',
        'Support   : WhatsApp & WhatsApp Business (sebisa mungkin)',
        ctx.style.footer()
      ].join('\n');
      await ctx.sender.sendText(ctx.sock, ctx.remoteJid, text, { quoted: ctx.msg });
    }
  }
];
