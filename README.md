# Valetax MT5 XAUUSD AI Bot — Vercel + GitHub + EA MQL5

Project ini menggabungkan semua komponen yang diminta:

- Mobile UI trading XAUUSD: `public/index.html`
- MetaEditor-style mobile EA editor dari script yang Anda lampirkan: `public/metaeditor.html`
- API Vercel serverless: `api/`
- Cloudflare Workers AI REST opsional dari Vercel
- Expert Advisor MT5 Valetax: `mql5/ValetaxCloudflareAIBot.mq5`
- Script auto compile EA untuk Windows/MetaEditor: `scripts/compile-ea.ps1` dan `scripts/compile-ea.bat`
- Config deploy Vercel: `vercel.json`

> Penting: ini scaffold teknis/edukasi, bukan nasihat finansial dan tidak menjamin profit. Uji akun demo terlebih dahulu.

## Link Login Valetax

Member Area Valetax:

```text
https://ma.valetax.com/
```

Login trading MT5 tetap dilakukan di terminal MT5 Valetax:

```text
MT5 -> File -> Login to Trade Account
```

Aplikasi web hanya menyimpan metadata akun untuk guard EA:

- Nomor login MT5
- Server MT5
- Tipe akun demo/live
- Label akun

Password MT5/broker tidak disimpan di app, Vercel, GitHub, atau Cloudflare.

## Fitur App

### UI Mobile

- Login akun MT5 Valetax metadata
- Kolom input harga XAUUSD
- Tombol update harga XAUUSD saat ini via `/api/quote`
- Tombol Auto Analyze
- Tombol Auto Trade Signal ON/OFF
- 5 AI agent:
  - Trend Agent
  - Momentum Agent
  - Volatility Agent
  - Price Action Agent
  - Risk Guard Agent
- API key / APP_TOKEN setting
- Download EA .mq5
- Download script auto compile
- Link login Valetax

### EA MT5

EA berjalan di terminal MT5, bukan di browser. EA:

- Membaca harga bid/ask broker langsung dari MT5
- Membaca EMA, RSI, ATR, spread
- Mengirim data ke endpoint Vercel `/api/signal`
- Menerima `buy`, `sell`, atau `hold`
- Memiliki account guard:

```text
InpExpectedAccountLogin
InpExpectedAccountServer
InpRequireAccountMatch
```

Jika akun tidak cocok, EA berhenti / tidak trading.

## Panduan build/deploy lengkap

Saya tambahkan panduan khusus:

```text
PANDUAN_DEPLOY_VERCEL_GITHUB.md
```

File build utama:

```text
scripts/build.mjs
```

Jalankan build:

```bash
npm run build
```

## Deploy ke Vercel

### 1. Install dependency

```bash
npm install
```

### 2. Jalankan lokal

```bash
npm run dev
```

### 3. Set environment Vercel

Minimal wajib:

```bash
vercel env add APP_TOKEN production
```

Opsional untuk Cloudflare AI REST dari Vercel:

```bash
vercel env add CF_ACCOUNT_ID production
vercel env add CF_API_TOKEN production
vercel env add AI_MODEL production
```

Default model:

```text
@cf/meta/llama-3.1-8b-instruct
```

Jika Cloudflare AI env tidak diset, app tetap bekerja dengan fallback weighted-vote 5-agent.

### 4. Deploy production

```bash
npm run deploy
```

## Buat Repository GitHub

Jika memakai GitHub CLI:

```bash
git init
git add .
git commit -m "Valetax MT5 XAUUSD AI bot"
gh repo create valetax-mt5-xauusd-ai-bot --private --source=. --remote=origin --push
```

Jika tidak memakai GitHub CLI:

```bash
git init
git add .
git commit -m "Valetax MT5 XAUUSD AI bot"
git branch -M main
git remote add origin https://github.com/USERNAME/valetax-mt5-xauusd-ai-bot.git
git push -u origin main
```

Setelah itu buka Vercel Dashboard -> New Project -> Import repository GitHub.

## Endpoint API Vercel

### Health

```http
GET /api/health
```

### Quote XAUUSD

```http
GET /api/quote?symbol=XAUUSD&token=APP_TOKEN
```

Harga ini hanya referensi UI. Harga eksekusi order tetap dari MT5 Valetax.

### Analyze dari UI

```http
POST /api/analyze
x-app-token: APP_TOKEN
content-type: application/json

{
  "symbol": "XAUUSD",
  "price": 4461,
  "emaFast": 4455,
  "emaSlow": 4448,
  "rsi": 62,
  "atrPoints": 250,
  "spreadPoints": 20,
  "candleDir": "bullish",
  "riskPercent": 1,
  "minConfidence": 65
}
```

### Signal untuk EA

```http
GET /api/signal?symbol=XAUUSD&price=4461&emaFast=4455&emaSlow=4448&rsi=62&atrPoints=250&spreadPoints=20&candleDir=bullish&token=APP_TOKEN
```

## Auto Compile EA

Real compile `.mq5` menjadi `.ex5` tidak bisa dilakukan di Vercel/browser karena compiler MQL5 resmi adalah MetaEditor/MT5 Windows.

Saya sediakan script auto compile untuk Windows/VPS:

```text
scripts/compile-ea.ps1
scripts/compile-ea.bat
```

Cara pakai:

1. Install MT5 Valetax di Windows/VPS.
2. Pastikan `metaeditor64.exe` ada, contoh:

```text
C:\Program Files\MetaTrader 5\metaeditor64.exe
```

3. Jalankan:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/compile-ea.ps1
```

Atau:

```bat
scripts\compile-ea.bat
```

Jika path MetaEditor berbeda:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/compile-ea.ps1 -MetaEditorPath "C:\Path\To\metaeditor64.exe"
```

## Instal EA ke MT5 Valetax

1. Login ke MT5 Valetax.
2. Copy `mql5/ValetaxCloudflareAIBot.mq5` ke:

```text
MQL5/Experts/
```

3. Compile dengan MetaEditor atau script auto compile.
4. MT5 -> Tools -> Options -> Expert Advisors:
   - Allow algorithmic trading
   - Allow WebRequest for listed URL
   - Tambahkan domain Vercel Anda, contoh:

```text
https://valetax-mt5-xauusd-ai-bot.vercel.app
```

5. Attach EA ke chart `XAUUSD`.
6. Isi input EA:

```text
InpWorkerUrl=https://domain-vercel-anda.vercel.app
InpAppToken=APP_TOKEN_ANDA
InpExpectedAccountLogin=nomor_login_mt5_anda
InpExpectedAccountServer=server_valetax_anda
InpRequireAccountMatch=true
InpAllowAutoTrade=false
```

Mulai dari `InpAllowAutoTrade=false` untuk melihat sinyal saja. Ubah ke `true` hanya setelah demo test stabil.

## Catatan Keamanan

- Jangan commit `.dev.vars`, token, password broker, atau API token ke GitHub.
- `APP_TOKEN` harus diset di Vercel env dan dimasukkan ke UI/EA.
- Gunakan akun demo terlebih dahulu.
- Batasi risk per trade.
- Gunakan VPS agar EA berjalan stabil.
