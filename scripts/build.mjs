import { writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function ensureDir(file) {
  const dir = dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

console.log('Building Valetax MT5 XAUUSD AI Bot for Vercel...');

// 1) Syntax check server/API scripts.
run('node', ['--check', 'api/_lib.js']);
run('node', ['--check', 'src/worker.js']);

// 2) Keep downloadable EA files in public/ in sync.
ensureDir('public/ValetaxCloudflareAIBot.mq5');
copyFileSync('mql5/ValetaxCloudflareAIBot.mq5', 'public/ValetaxCloudflareAIBot.mq5');
copyFileSync('scripts/compile-ea.ps1', 'public/compile-ea.ps1');
copyFileSync('scripts/compile-ea.bat', 'public/compile-ea.bat');

// 3) Write build metadata for UI/debug.
const info = {
  app: 'valetax-mt5-xauusd-ai-bot',
  target: 'vercel',
  builtAt: new Date().toISOString(),
  node: process.version,
  files: {
    ui: '/index.html',
    editor: '/metaeditor.html',
    ea: '/ValetaxCloudflareAIBot.mq5',
    compilePowerShell: '/compile-ea.ps1',
    compileBatch: '/compile-ea.bat'
  },
  api: ['/api/health', '/api/quote', '/api/analyze', '/api/signal', '/api/prompt', '/api/agents']
};
writeFileSync('public/build-info.json', JSON.stringify(info, null, 2));

console.log('Build OK. Vercel will serve public/ and api/*.js serverless functions.');
