'use strict';

module.exports = [
  {
    command: 'ai',
    description: 'Tanya AI (gratis/berbayar via env)',
    category: 'AI',
    scope: 'all',
    usage: '.ai pertanyaan',
    run: async (ctx) => {
      const q = (ctx.args || '').trim();
      if (!q) return ctx.reply('Penggunaan: .ai pertanyaan');
      await ctx.reply('🧠 Memproses...');
      const answer = await ctx.ai.askAssistant(q);
      return ctx.reply(`🧠 *AI*\n\n${answer}`);
    }
  },
  {
    command: 'ask',
    description: 'Tanya AI (alias .ai)',
    category: 'AI',
    scope: 'all',
    usage: '.ask pertanyaan',
    run: async (ctx) => {
      const q = (ctx.args || '').trim();
      if (!q) return ctx.reply('Penggunaan: .ask pertanyaan');
      await ctx.reply('🧠 Memproses...');
      const answer = await ctx.ai.askAssistant(q);
      return ctx.reply(`🧠 *AI*\n\n${answer}`);
    }
  },
  {
    command: 'summarize',
    description: 'Ringkas teks dengan AI',
    category: 'AI',
    scope: 'all',
    usage: '.summarize teks',
    run: async (ctx) => {
      const q = (ctx.args || '').trim();
      if (!q) return ctx.reply('Penggunaan: .summarize teks');
      await ctx.reply('🧠 Merangkas...');
      const answer = await ctx.ai.summarize(q);
      return ctx.reply(`📝 *RINGKASAN*\n\n${answer}`);
    }
  },
  {
    command: 'translate',
    description: 'Terjemahkan teks dengan AI',
    category: 'AI',
    scope: 'all',
    usage: '.translate en teks',
    run: async (ctx) => {
      const raw = (ctx.args || '').trim();
      if (!raw) return ctx.reply('Penggunaan: .translate en teks');
      const words = raw.split(/\s+/);
      const lang = words[0] && /^[a-z]{2,5}$/i.test(words[0]) ? words.shift() : 'en';
      const text = words.join(' ').trim();
      if (!text) return ctx.reply('Teks kosong.');
      const answer = await ctx.ai.aiTranslate(text, lang);
      return ctx.reply(`🌐 *AI Terjemah (${lang})*\n\n${answer}`);
    }
  }
];
