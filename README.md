# NOPALRYZ.exe

Bot WhatsApp berbasis **Node.js + Baileys** yang modern, stabil, ramah **Termux**, dan mendukung **Pairing Code** maupun **QR Code**.

- Nama bot : `NOPALRYZ.exe`
- Prefix default : `.`
- Owner : dikonfigurasi lewat nomor WhatsApp (env)
- Tampilan : gaya modern/glitch
- Support : WhatsApp biasa & (sebisa mungkin) WhatsApp Business

> ⚠️ **Peringatan**: Gunakan bot ini hanya untuk akun yang kamu miliki atau dengan izin resmi. Bot ini **tidak** menyediakan fitur take-over grup, auto-kick, atau menghapus owner/admin asli grup secara paksa.

---

## Fitur

- Login **Pairing Code**
- Login **QR Code** (alternatif)
- Session tersimpan otomatis → tidak perlu pairing ulang tiap restart
- **Auto reconnect** jika koneksi putus
- Status koneksi bot ditampilkan
- Session/credential/API key **tidak pernah dicetak ke chat**
- Menu interaktif dengan **native List/Button** + **fallback list/text**
- Owner protection + Admin protection + Group protection
- Cooldown / rate limit / anti-command spam
- Error handler & logging aman

### Kategori Menu

1. OWNER
2. GROUP
3. ADMIN
4. DOWNLOADER
5. TOOLS
6. FUN
7. AI
8. SETTINGS
9. HELP

---

## Struktur Project

```
NOPALRYZ.exe/
├── index.js              # Koneksi Baileys (pairing + QR + reconnect)
├── config.js             # Baca .env / environment variables
├── package.json
├── .env.example
├── README.md
├── handler/
│   └── index.js          # Router perintah, permission, cooldown, error handler
├── commands/
│   ├── registry.js
│   ├── main.js           # menu, help, ping, runtime, info
│   ├── owner.js          # addowner, delowner, listowner, broadcast, restart, shutdown, status
│   ├── group.js          # setname, setdesc, tagall, hidetag, linkgc, revoke, groupinfo, admins
│   ├── admin.js          # lockadmin (mode admin aman)
│   ├── downloader.js     # sticker, dl, tomp3, dsb
│   ├── tools.js          # qr, qrread, shorturl, calc, tr
│   ├── fun.js            # joke, kata, dice, pick, truth
│   ├── ai.js             # ai, ask, summarize, translate (AI)
│   └── settings.js       # setprefix, setbotname, setppbot
├── database/
│   └── Store.js          # penyimpanan owner/setting (JSON lokal, bukan isi chat)
├── utils/
│   ├── logger.js         # logging aman (redact credential)
│   ├── helpers.js        # helper JID, metadata, permission
│   ├── security.js       # cooldown, rate limit, permission check
│   ├── sender.js         # kirim list/button/text + fallback
│   ├── media.js          # download media, sticker, QR, pp
│   ├── ai.js             # AI via env (OpenAI-compatible)
│   ├── downloader.js     # URL helper, short URL, yt-dlp
│   └── style.js          # gaya modern/glitch
└── media/                # file sementara hasil konversi
```

---

## Cara Install di Termux

### 1. Update & install package dasar

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs-lts git ffmpeg wget nano
```

> ffmpeg dipakai untuk sticker video / konversi media.
> Optional untuk `dl` (download video):
> ```bash
> pkg install -y python
> pip install yt-dlp
> ```

### 2. Clone repository

```bash
cd
git clone https://github.com/PalRyz/bot4.git nopalryz-bot
cd nopalryz-bot
```

### 3. Install dependencies

```bash
npm install
```

> Jika ada error sertifikat saat install (umum di beberapa jaringan), jalankan:
> ```bash
> npm_config_strict_ssl=false npm install
> ```

### 4. Buat file `.env`

```bash
cp .env.example .env
nano .env
```

Isi minimal:

```env
BOT_NAME=NOPALRYZ.exe
BOT_PREFIX=.
OWNER_NUMBER=6281234567890
LOGIN_METHOD=pairing
PAIRING_PHONE=6281234567890
```

---

## Cara Login dengan Pairing Code

1. Pastikan `.env` berisi:
   ```env
   LOGIN_METHOD=pairing
   PAIRING_PHONE=6281234567890
   ```
2. Jalankan bot:
   ```bash
   npm start
   # atau
   npm run start:pairing
   ```
3. Terminal akan menampilkan **Pairing Code**, contoh:
   ```
   [INFO] Pairing code: 1234-5678-9001-2345
   ```
4. Buka **WhatsApp** → **Perangkat Tertaut** → **Hubungkan Perangkat**.
5. Masukkan **Pairing Code** di layar.

> Jangan pernah menyebarkan QR/session/kode pairing. Kode ini hanya untuk memasukkan ke aplikasi WhatsApp yang kamu kontrol.

---

## Cara Login dengan QR Code

1. Ubah `.env`:
   ```env
   LOGIN_METHOD=qr
   PAIRING_PHONE=
   ```
2. Jalankan:
   ```bash
   npm start
   # atau
   npm run start:qr
   # atau
   bash run.sh qr
   ```
3. QR akan tampil di terminal.
4. Buka **WhatsApp** → **Perangkat Tertaut** → **Hubungkan Perangkat** → scan QR.

---

## Cara Menjalankan Bot

### Normal

```bash
npm start
```

### Auto-restart (berguna di Termux)

```bash
npm run start:restart
```

### Dengan helper script

```bash
bash run.sh           # pairing
bash run.sh qr        # QR
bash run.sh restart   # loop restart
```

### Session

Folder `session/` dibuat otomatis. Session **disimpan** agar tidak perlu pairing ulang saat restart.

- Jangan hapus `session/` kecuali untuk login ulang.
- Jangan bagikan isi folder `session/` ke siapa pun.

---

## Cara Menambahkan Owner

### Lewat `.env`

```env
OWNER_NUMBER=6281234567890,6289876543210
```

### Lewat bot (setelah bot online)

Dari akun owner, kirim:

```
.addowner 6289876543210
```

Perintah lain:

```
.delowner 6289876543210
.listowner
```

---

## Contoh Penggunaan Semua Command

### OWNER

```
.addowner 628xxxxxxxx
.delowner 628xxxxxxxx
.listowner
.broadcast Pesan untuk semua grup
.restart
.shutdown
.status
```

### GROUP

```
.setname 𝙉𝙊𝙋𝘼𝙇𝙍𝙔𝙕.exe
.setdesc Deskripsi grup baru
.tagall
.hidetag
.linkgc
.revoke
.groupinfo
.admins
```

### ADMIN

> `promote`, `demote`, `kick`, `add` hanya berjalan ketika bot adalah admin grup dan perintah datang dari member admin/owner.

```
.promote @user
.demote @user
.kick @user
.add 628xxxxxxxx
.lockadmin on
.lockadmin off
```

### DOWNLOADER

```
.sticker            (balas gambar/video)
.s                  (alias sticker)
.tomp3              (balas audio/video)
.image https://...gambar.jpg
.dl https://...video
```

### TOOLS

```
.qr https://example.com
.qrread             (balas gambar QR)
.shorturl https://long-url
.short https://long-url
.calc 22*7+3
.tr en Halo dunia
```

### FUN

```
.joke
.kata
.dice
.pick pizza|burger|nasi
.truth
```

### AI

API dibaca dari environment variable. **Jangan hardcode API key**.

```
.ai Mengapa langit berwarna biru?
.ask Apa itu Node.js?
.summarize [teks panjang]
.translate en [teks]
```

### SETTINGS

```
.setprefix !
.setbotname NopaLBot
.setppbot           (balas gambar)
```

### HELP

```
.menu
.owner / .group / .admin / .downloader / .tools / .fun / .settings / .menuai
.help
.ping
.runtime
.info
```

---

## Fallback Button / List Message

Bot menggunakan `ListMessage` / `ButtonsMessage` native jika didukung oleh library & versi WhatsApp.

Jika versi WhatsApp / koneksi menolak native buttons/list, bot **otomatis fallback ke teks polos**:

- `.menu` akan menampilkan teks daftar kategori
- Kategori menu juga bisa dipanggil langsung: `.menuowner`, `.menugroup`, `.menuadmin`, `.menudownloader`, `.menutools`, `.menufun`, `.menuai`, `.menusettings`, `.menuhelp`

Jadi user tetap bisa menggunakan semua perintah meskipun tidak melihat tombol interaktif.

---

## Mode Admin Aman (`.lockadmin`)

Perintah:

```
.lockadmin on
.lockadmin off
```

- Bot **TIDAK** mengambil alih grup secara paksa.
- Bot **TIDAK** otomatis menghapus, meng-kick, atau menghapus status admin pemilik asli grup.
- Untuk `kick` / `demote` / `promote` / `add` / `revoke`, wajib ada **perintah eksplisit** dari admin/owner yang berwenang.
- Bot tidak menendang/menurunkan admin (misal `superadmin`) tanpa perintah explicit dan konfirmasi.
- `.setname 𝙉𝙊𝙋𝘼𝙇𝙍𝙔𝙕.exe` mengubah nama grup hanya jika bot admin **dan** pengirim adalah owner/admin grup yang sah.

---

## Security

- **Owner-only command** : `addowner`, `delowner`, `listowner`, `broadcast`, `restart`, `shutdown`, `setprefix`, `setbotname`, `setppbot`, `status`, `lockadmin`
- **Admin-only command** : aksi group seperti `promote`, `demote`, `kick`, `add`, `revoke`
- **Group-only command** : command grup
- **Cooldown** : default 3 detik / user / command (ubah di `.env`)
- **Rate limit** : default 20 perintah / menit / user
- **Anti spam** : mencegah flood command
- **Validasi nomor & mention**
- **Error handler** global
- **Logging aman**: credential/token/password/session di-redact
- **Tidak menyimpan isi pesan pribadi secara permanen**; database hanya menyimpan owner & settings
- **Tidak membocorkan** session, token, API key, atau credential ke chat

Konfigurasi security di `.env`:

```env
COOLDOWN_MS=3000
RATE_LIMIT_MAX=20
RATE_LIMIT_WINDOW_MS=60000
SAFE_ADMIN_MODE=true
```

---

## Konfigurasi AI

Gunakan API apapun yang kompatibel dengan `POST /chat/completions` (OpenAI-compatible).

```env
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=700
```

Bot **tidak menyimpan API key** di database dan **tidak menampilkan** key ke chat.

---

## Troubleshooting

### 1. `Connection closed code 408`
Biasanya jaringan/Internet lambat atau WhatsApp memblokir. Coba:
- Ganti jaringan (Wi-Fi → mobile data, atau sebaliknya)
- `npm run start:restart`
- Tunggu beberapa menit karena WhatsApp kadang membatasi login berulang

### 2. Pairing code tidak muncul
- Pastikan `.env` berisi `PAIRING_PHONE` dengan format internasional tanpa `+`, `-`, atau spasi.
- Pastikan nomor **bukan** sudah terpair di device lain secara berlebihan.
- Hapus folder `session/` lalu coba lagi.

### 3. QR tidak muncul
- Set `LOGIN_METHOD=qr`
- Jika terminal tidak menampilkan QR, pastikan terminal menggunakan font yang mendukung block character.

### 4. `AI_API_KEY belum dikonfigurasi`
- Isi `.env` bagian AI.
- Jangan menaruh key langsung di file source code.

### 5. `yt-dlp not found`
- Install: `pkg install python && pip install yt-dlp`
- Atau set `YTDLP_PATH` di `.env`.

### 6. Sticker video gagal
- Pastikan `ffmpeg` terinstall: `pkg install ffmpeg`

---

## Disclaimer

Project ini disediakan sebagai alat pembelajaran. Gunakan secara bijak dan patuhi [Terms of Service](https://www.whatsapp.com/legal/terms-of-service) WhatsApp. Pengembang tidak bertanggung jawab atas penyalahgunaan.
