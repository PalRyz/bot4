'use strict';

const fs = require('fs');
const path = require('path');
const qrcodeTerminal = require('qrcode-terminal');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');

const config = require('./config');
const store = require('./database/Store');
const logger = require('./utils/logger');
const handler = require('./handler');

const BOT_NAME = 'NOPALRYZ.exe';

global.bot = {
  status: 'starting',
  note: 'Starting...',
  startedAt: Date.now()
};

let pairingRequested = false;
let lastQr = null;
let saveCreds = null;
let sock = null;

function logSafe(msg, meta) {
  logger.info(msg, meta);
}

async function loadSession() {
  ensureDir(config.sessionDir);
  return useMultiFileAuthState(config.sessionDir);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function showQr(qr) {
  lastQr = qr;
  logSafe('Scan QR pada terminal (QR login):', '');
  qrcodeTerminal.generate(qr, { small: true });
}

function pairingCodeMessage(code) {
  const pretty = code.includes('-') ? code : `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12)}`;
  logSafe(`Pairing code: ${pretty}`, '');
  logSafe('1. Buka WhatsApp > Perangkat Tertaut > Hubungkan. 2. Masukkan kode di atas.', '');
}

function handleDisconnect(update) {
  const { lastDisconnect } = update;
  const statusCode = lastDisconnect?.error?.output?.statusCode || 0;
  const reason = statusCode || 0;

  logger.warn(`Connection closed. Code=${reason}`, '');
  if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
    global.bot.status = 'logged_out';
    global.bot.note = 'Session invalid. Delete session folder and login again.';
    logSafe('Session tidak valid/logged out. Hapus folder "session" lalu login ulang.', '');
    return false;
  }
  if (reason === DisconnectReason.restartRequired) return true;
  return true;
}

async function startBot() {
  ensureDir(config.sessionDir);
  pairingRequested = false;
  lastQr = null;

  let session;
  try {
    session = await loadSession();
  } catch (err) {
    logger.error('Gagal memuat session', err?.message || String(err));
    return false;
  }
  saveCreds = session.saveCreds;

  let version;
  try {
    version = await fetchLatestBaileysVersion();
  } catch (err) {
    logger.warn('Gagal fetch versi, memakai 2.3000.23', '');
    version = { version: [2, 3000, 23] };
  }

  logSafe(`Connecting ${BOT_NAME}... method=${config.loginMethod}`, '');
  if (!config.owner.length) {
    logger.warn('OWNER_NUMBER belum diset. Set di .env agar owner commands aktif.', '');
  }

  sock = makeWASocket({
    version: version.version,
    logger: pino({ level: process.env.DEBUG === 'true' ? 'debug' : 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('NOPALRYZ'),
    auth: {
      creds: session.state.creds,
      keys: makeCacheableSignalKeyStore(session.state.keys, logger)
    },
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: true,
    emitOwnEvents: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    global.bot.status = connection === 'open' ? 'connected' : connection === 'connecting' ? 'connecting' : 'disconnected';
    global.bot.note = connection === 'open' ? 'Online' : 'Connecting...';

    if (update.qr) {
      if (config.loginMethod === 'pairing') {
        if (!pairingRequested && config.pairingPhone && !session.state.creds.registered) {
          pairingRequested = true;
          try {
            const code = await sock.requestPairingCode(config.pairingPhone);
            pairingCodeMessage(code);
          } catch (err) {
            logger.error('Gagal membuat pairing code', err?.message || String(err));
            showQr(update.qr);
          }
        } else {
          showQr(update.qr);
        }
      } else {
        showQr(update.qr);
      }
    }

    if (connection === 'close') {
      const shouldRestart = handleDisconnect(update);
      if (shouldRestart) {
        const delay = 5000;
        logSafe(`Auto reconnect dalam ${delay / 1000}s...`, '');
        setTimeout(() => {
          startBot().catch((err) => logger.error('Reconnect gagal', err?.message || String(err)));
        }, delay);
      } else {
        logSafe('Bot berhenti.', '');
      }
    }

    if (connection === 'open') {
      global.bot.status = 'connected';
      logSafe(`Connected as ${sock.user?.id || '-'}`, '');
      global.bot.note = 'Online';
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      await handler.handleMessagesUpsert(sock, { messages, type });
    } catch (err) {
      logger.error('Message handler error', err?.message || String(err));
    }
  });

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    logSafe(`Group update ${action}: ${participants?.length || 0} member(s) in ${id}`, '');
  });

  return sock;
}

async function run() {
  const maxRestarts = 20;
  let attempts = 0;
  while (attempts < maxRestarts) {
    attempts += 1;
    try {
      await startBot();
      logSafe(`Bot started. Restart attempt ${attempts}.`, '');
      // Keep process alive; startBot's async reconnect loop handles restarts.
      await new Promise((resolve) => {
        process.once('SIGTERM', resolve);
        process.once('SIGINT', resolve);
      });
    } catch (err) {
      logger.error(`Fatal error ${err?.message || String(err)}`, '');
      global.bot.status = 'error';
    }
  }
  logSafe('Bot stopped.', '');
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err?.message || String(err));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', String(reason?.message || reason));
});

process.on('SIGTERM', () => {
  logSafe('SIGTERM received. Shutting down...', '');
  try { if (sock) sock.end(new Error('Shutdown')); } catch {}
  process.exit(0);
});

process.on('SIGINT', () => {
  logSafe('SIGINT received. Shutting down...', '');
  try { if (sock) sock.end(new Error('Shutdown')); } catch {}
  process.exit(0);
});

// `.restart` exits with 99.
process.on('exit', (code) => {
  if (code === 99) {
    logger.info('Restarting bot...', '');
    // Re-run from a fresh worker in the same shell when run manually.
    console.log('Restart requested. Bot akan otomatis reconnect jika dijalankan dengan `while` script.');
  }
});

run();
