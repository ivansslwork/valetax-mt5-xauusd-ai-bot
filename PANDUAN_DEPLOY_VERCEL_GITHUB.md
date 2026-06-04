# Panduan Build, GitHub, dan Deploy Vercel

Panduan ini untuk project **Valetax MT5 XAUUSD AI Bot**.

## 1. Struktur file penting

```text
public/index.html                 # UI utama mobile
public/metaeditor.html            # EA editor mobile dari script upload
public/ValetaxCloudflareAIBot.mq5 # EA yang bisa didownload user
api/*.js                          # Vercel Serverless API
mql5/ValetaxCloudflareAIBot.mq5   # Source utama EA MT5
scripts/build.mjs                 # File build Vercel
scripts/compile-ea.ps1            # Auto compile EA di Windows/MetaEditor
scripts/compile-ea.bat            # Runner BAT untuk PowerShell compile
vercel.json                       # Config Vercel
package.json                      # Script npm
.env.example                      # Contoh environment variable
.vercelignore                     # File yang tidak dikirim ke Vercel
.github/workflows/vercel-deploy.yml # Optional GitHub Action deploy
```

## 2. File build untuk Vercel

Build script ada di:

```text
scripts/build.mjs
```

Script ini melakukan:

1. Syntax check API JavaScript.
2. Copy EA dari `mql5/` ke `public/` supaya bisa didownload dari Vercel.
3. Copy script auto compile ke `public/`.
4. Membuat file:

```text
public/build-info.json
```

Command build:

```bash
npm run build
```

Di `package.json` sudah ada:

```json
{
  "scripts": {
    "build": "node scripts/build.mjs",
    "vercel-build": "npm run build"
  }
}
```

Vercel akan menjalankan build ini saat deploy.

## 3. Test lokal sebelum push GitHub

Install dependency:

```bash
npm install
```

Jalankan build:

```bash
npm run build
```

Jalankan Vercel lokal:

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

Test endpoint:

```text
http://localhost:3000/api/health
http://localhost:3000/api/quote?symbol=XAUUSD&token=APP_TOKEN_ANDA
```

Jika `APP_TOKEN` aktif, buat file lokal `.env.local`:

```env
APP_TOKEN=token_rahasia_anda
DEFAULT_MAX_RISK_PERCENT=1
DEFAULT_MIN_CONFIDENCE=65
AI_MODEL=@cf/meta/llama-3.1-8b-instruct
```

Jangan commit `.env.local` ke GitHub.

## 4. Push ke GitHub

### Opsi A — pakai GitHub CLI

```bash
git init
git add .
git commit -m "Valetax MT5 XAUUSD AI bot"
git branch -M main
gh repo create valetax-mt5-xauusd-ai-bot --private --source=. --remote=origin --push
```

### Opsi B — manual dari GitHub website

1. Buka GitHub.
2. Buat repository baru, misalnya:

```text
valetax-mt5-xauusd-ai-bot
```

3. Jalankan di terminal:

```bash
git init
git add .
git commit -m "Valetax MT5 XAUUSD AI bot"
git branch -M main
git remote add origin https://github.com/USERNAME/valetax-mt5-xauusd-ai-bot.git
git push -u origin main
```

Jika repo lokal sudah ada, cukup:

```bash
git add .
git commit -m "Update build files for Vercel"
git push
```

## 5. Deploy dari GitHub ke Vercel

1. Buka:

```text
https://vercel.com/new
```

2. Pilih repository GitHub.
3. Framework Preset pilih:

```text
Other
```

4. Build Command:

```bash
npm run build
```

5. Output Directory:

```text
public
```

Catatan: untuk Vercel project dengan `api/` serverless dan `public/` static, output directory `public` aman untuk UI. API tetap dibaca dari folder `api/`.

6. Install Command:

```bash
npm install
```

7. Tambahkan Environment Variables.

## 6. Environment Variables Vercel

Wajib:

```text
APP_TOKEN=token_rahasia_anda
```

Opsional:

```text
DEFAULT_MAX_RISK_PERCENT=1
DEFAULT_MIN_CONFIDENCE=65
```

Opsional jika ingin pakai Cloudflare AI REST dari Vercel:

```text
CF_ACCOUNT_ID=account_id_cloudflare
CF_API_TOKEN=token_cloudflare_ai
AI_MODEL=@cf/meta/llama-3.1-8b-instruct
```

Jika Cloudflare AI tidak diisi, app tetap jalan dengan fallback 5-agent weighted vote.

## 7. Deploy lewat Vercel CLI

Login:

```bash
vercel login
```

Set env:

```bash
vercel env add APP_TOKEN production
```

Deploy production:

```bash
npm run deploy
```

Atau langsung:

```bash
vercel --prod
```

## 8. Setting GitHub Action opsional

File workflow sudah ada:

```text
.github/workflows/vercel-deploy.yml
```

Jika ingin GitHub Actions deploy otomatis, tambahkan secrets di GitHub repository:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Cara mendapatkannya:

1. `VERCEL_TOKEN`: Vercel Dashboard -> Account Settings -> Tokens.
2. `VERCEL_ORG_ID` dan `VERCEL_PROJECT_ID`: setelah link project, jalankan:

```bash
vercel link
cat .vercel/project.json
```

Isi contoh:

```json
{
  "orgId": "xxx",
  "projectId": "yyy"
}
```

Masukkan `orgId` dan `projectId` ke GitHub Secrets.

Jika memakai integrasi GitHub langsung dari Vercel dashboard, GitHub Action ini tidak wajib.

## 9. Setelah deploy

Misal domain Vercel Anda:

```text
https://valetax-mt5-xauusd-ai-bot.vercel.app
```

Buka UI:

```text
https://valetax-mt5-xauusd-ai-bot.vercel.app
```

Buka editor EA:

```text
https://valetax-mt5-xauusd-ai-bot.vercel.app/metaeditor.html
```

Download EA:

```text
https://valetax-mt5-xauusd-ai-bot.vercel.app/ValetaxCloudflareAIBot.mq5
```

Test API:

```text
https://valetax-mt5-xauusd-ai-bot.vercel.app/api/health
https://valetax-mt5-xauusd-ai-bot.vercel.app/api/quote?symbol=XAUUSD&token=APP_TOKEN_ANDA
```

## 10. Setting EA di MT5 Valetax

Di MT5:

```text
Tools -> Options -> Expert Advisors
```

Aktifkan:

```text
Allow algorithmic trading
Allow WebRequest for listed URL
```

Tambahkan URL Vercel:

```text
https://valetax-mt5-xauusd-ai-bot.vercel.app
```

Input EA:

```text
InpWorkerUrl=https://valetax-mt5-xauusd-ai-bot.vercel.app
InpAppToken=APP_TOKEN_ANDA
InpExpectedAccountLogin=NOMOR_LOGIN_MT5
InpExpectedAccountServer=SERVER_VALETAX
InpRequireAccountMatch=true
InpAllowAutoTrade=false
```

Mulai dari:

```text
InpAllowAutoTrade=false
```

Ubah ke `true` hanya setelah test demo stabil.

## 11. Auto compile EA

Vercel/browser tidak bisa compile `.mq5` ke `.ex5`. Compile asli harus memakai MetaEditor Windows.

Script tersedia:

```text
scripts/compile-ea.ps1
scripts/compile-ea.bat
```

Jalankan di Windows/VPS:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/compile-ea.ps1
```

Jika path MetaEditor berbeda:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/compile-ea.ps1 -MetaEditorPath "C:\Path\To\metaeditor64.exe"
```

Hasilnya:

```text
mql5/ValetaxCloudflareAIBot.ex5
```

## 12. Checklist cepat

- [ ] `npm run build` sukses
- [ ] GitHub repository sudah dipush
- [ ] Vercel project sudah import dari GitHub
- [ ] `APP_TOKEN` sudah diset di Vercel
- [ ] Domain Vercel sudah dicopy ke UI dan EA
- [ ] MT5 Allow WebRequest sudah ditambahkan domain Vercel
- [ ] EA sudah compile di MetaEditor Windows
- [ ] Test akun demo dulu
