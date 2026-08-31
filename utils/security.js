'use strict';

const config = require('../config');
const helpers = require('./helpers');

/**
 * In-memory security layer.
 *
 * - owner protection
 * - admin protection
 * - group protection
 * - cooldown / rate limit
 * - anti-command spam
 */

class RateLimiter {
  constructor() {
    this.hits = new Map(); // key -> { count, start }
  }

  _now() {
    return Date.now();
  }

  _cleanup(key, windowMs) {
    const row = this.hits.get(key);
    if (!row) return;
    if (this._now() - row.start > windowMs) this.hits.delete(key);
  }

  consume(key, { limit = config.rateLimitMax, windowMs = config.rateLimitWindowMs } = {}) {
    this._cleanup(key, windowMs);
    const now = this._now();
    const row = this.hits.get(key) || { count: 0, start: now };
    row.count += 1;
    if (this._now() - row.start > windowMs) {
      row.count = 1;
      row.start = now;
    }
    this.hits.set(key, row);
    const remaining = row.count <= limit ? limit - row.count : 0;
    return { allowed: row.count <= limit, remaining, resetInMs: Math.max(0, row.start + windowMs - now) };
  }

  reset(key) {
    this.hits.delete(key);
  }
}

class Security {
  constructor() {
    this.cooldowns = new Map();
    this.rate = new RateLimiter();
  }

  async checkCooldown(user, command) {
    const key = `${user}:${command}`;
    const last = this.cooldowns.get(key) || 0;
    const now = Date.now();
    if (now - last < config.cooldownMs) {
      const wait = Math.ceil((config.cooldownMs - (now - last)) / 1000);
      return { allowed: false, wait };
    }
    this.cooldowns.set(key, now);
    return { allowed: true, wait: 0 };
  }

  checkRateLimit(user) {
    const res = this.rate.consume(user);
    return res;
  }

  /**
   * Returns { ok: boolean, reason: string }
   */
  async assertPermission({ command, sender, remoteJid, sock, store, chatType }) {
    const isOwner = store.isOwner(sender);
    const isGroup = helpers.isGroupJid(remoteJid);

    // Commands can specify which scope they need.
    const required = command.scope || 'all';

    if (required === 'owner' && !isOwner) {
      return { ok: false, reason: 'Owner-only command. You are not my owner.' };
    }

    if (required === 'admin') {
      if (!isGroup) return { ok: false, reason: 'This command is only available in groups.' };
      const userAdmin = await helpers.isUserAdmin(sock, remoteJid, sender);
      if (!userAdmin && !isOwner) return { ok: false, reason: 'Admin-only command. You are not a group admin.' };
    }

    if (required === 'group' || required === 'group-any') {
      if (!isGroup) return { ok: false, reason: 'This command is only available in groups.' };
      if (required === 'group' && !(await helpers.isBotAdmin(sock, remoteJid))) {
        return { ok: false, reason: 'Bot is not an admin of this group. I need admin to run this command.' };
      }
    }

    return { ok: true, reason: '' };
  }
}

module.exports = new Security();
module.exports.RateLimiter = RateLimiter;
