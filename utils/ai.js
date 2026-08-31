'use strict';

const axios = require('axios');
const config = require('../config');
const logger = require('./logger');
const helpers = require('./helpers');

/**
 * AI is fully configured through environment variables.
 * Key is never logged, never stored and never sent to chat.
 */

async function chatCompletion(prompt, options = {}) {
  const apiKey = config.ai.apiKey;
  if (!apiKey) throw new Error('AI_API_KEY belum dikonfigurasi di .env.');

  const messages = [];
  messages.push({
    role: 'system',
    content: 'You are a helpful, concise WhatsApp bot assistant. Answer in the same language as the user unless asked otherwise.'
  });
  if (options.system) messages.push({ role: 'system', content: options.system });
  if (options.history && Array.isArray(options.history)) messages.push(...options.history.slice(-10));
  messages.push({ role: 'user', content: helpers.sanitizeText(prompt, 4000) });

  try {
    const res = await axios.post(
      config.ai.baseUrl,
      {
        model: config.ai.model,
        messages,
        max_tokens: config.ai.maxTokens,
        temperature: config.ai.temperature
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );
    const data = res.data;
    const text = data?.choices?.[0]?.message?.content || 'AI tidak mengembalikan jawaban.';
    return String(text).trim();
  } catch (err) {
    logger.error('AI request failed', err.message || '');
    const detail = String(err?.response?.data?.error?.message || err.message || 'Unknown AI error');
    throw new Error(`AI error: ${detail}`);
  }
}

async function summarize(text) {
  return chatCompletion(`Ringkas teks berikut dengan jelas, poin per poin:\n\n${text}`, { system: 'You are a summarizer.' });
}

async function askAssistant(question) {
  return chatCompletion(question);
}

async function aiTranslate(text, lang = 'id') {
  return chatCompletion(`Translate the following text to ${lang}. Return only the translation.\n\n${text}`, { system: 'You are a translator.' });
}

module.exports = { chatCompletion, summarize, askAssistant, aiTranslate };
