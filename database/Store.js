'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Tiny JSON-backed store.
 *
 * We intentionally do NOT store private message contents. This database only
 * stores the minimum required metadata: owner jids and bot settings.
 */

class Store {
  constructor() {
    this.dir = path.join(__dirname);
    this.file = path.join(this.dir, 'bot-db.json');
    this.db = {
      owners: [...config.owner],
      settings: {
        prefix: config.prefix,
        botName: config.botName,
        safeAdminMode: config.safeAdminMode,
        welcome: false,
        antiSpam: true
      }
    };
    this._load();
  }

  _defaults() {
    return {
      owners: [...config.owner],
      settings: {
        prefix: config.prefix,
        botName: config.botName,
        safeAdminMode: config.safeAdminMode,
        welcome: false,
        antiSpam: true
      }
    };
  }

  _load() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        const mergedOwners = [...new Set([...config.owner, ...(Array.isArray(raw.owners) ? raw.owners : [])])];
        this.db = {
          ...this._defaults(),
          ...raw,
          settings: { ...this._defaults().settings, ...(raw.settings || {}) },
          owners: mergedOwners
        };
      }
    } catch (err) {
      logger.error('Failed to load database, using defaults', err.message);
      this.db = this._defaults();
    }
    this._ensureFile();
  }

  _ensureFile() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.db, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to write database file', err.message);
    }
  }

  get(key) {
    return this.db[key];
  }

  set(key, value) {
    this.db[key] = value;
    this._ensureFile();
    return value;
  }

  updateSettings(patch) {
    this.db.settings = { ...this.db.settings, ...patch };
    this._ensureFile();
    return this.db.settings;
  }

  getSettings() {
    return this.db.settings;
  }

  getOwners() {
    return Array.isArray(this.db.owners) ? [...this.db.owners] : [];
  }

  isOwner(jid) {
    return this.getOwners().includes(jid);
  }

  addOwner(jid) {
    if (!jid || this.isOwner(jid)) return false;
    this.db.owners.push(jid);
    this._ensureFile();
    return true;
  }

  removeOwner(jid) {
    const prev = this.db.owners.length;
    this.db.owners = this.db.owners.filter((x) => x !== jid);
    this._ensureFile();
    return this.db.owners.length < prev;
  }
}

module.exports = new Store();
