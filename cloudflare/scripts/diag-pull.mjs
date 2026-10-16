#!/usr/bin/env node
// Hata raporlarını okur (yalnızca yerelde, giriş yapılmış wrangler ile; herkese açık okuma ucu YOK). docs/arch/diagnostics.md
// Kullanım (oyun klasöründe): npm run diag:pull [-- --limit 20] [-- --full] [-- --kind previous_session_crashed]
//   --limit N   en yeni N rapor (varsayılan 15)
//   --full      her raporun tam JSON'u (izler dahil); yoksa kısa özet + son 12 iz
//   --kind K    yalnızca bu türdeki raporlar (error, unhandledrejection, previous_session_crashed, webglcontextlost, test)
// Ön koşul: npm --prefix cloudflare exec -- wrangler login (bir kez) ve wrangler.toml'da DIAG KV kimliği.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? def) : def;
};
const limit = Math.max(1, Number(opt('limit', '15')) || 15);
const full = args.includes('--full');
const kind = opt('kind', '');

const wrangler = (...a) =>
  execFileSync('npx', ['wrangler', ...a], { cwd, encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });

let keys;
try {
  keys = JSON.parse(wrangler('kv', 'key', 'list', '--binding', 'DIAG', '--remote', '--prefix', 'r:'));
} catch (e) {
  console.error('Could not list reports (wrangler login? DIAG KV id in cloudflare/wrangler.toml?)');
  process.exit(1);
}
let list = keys.map((k) => ({ name: k.name, meta: k.metadata ?? {} })).sort((a, b) => (a.name < b.name ? 1 : -1));
if (kind) list = list.filter((k) => k.meta.kind === kind);
console.log(`${keys.length} reports stored (kept 30 days); showing ${Math.min(limit, list.length)} newest${kind ? ` of kind ${kind}` : ''}\n`);

for (const k of list.slice(0, limit)) {
  let r;
  try {
    r = JSON.parse(wrangler('kv', 'key', 'get', k.name, '--binding', 'DIAG', '--remote', '--text'));
  } catch {
    console.log(`${k.name}: could not read`);
    continue;
  }
  if (full) {
    console.log(JSON.stringify(r, null, 2), '\n');
    continue;
  }
  const e = r.env ?? {};
  console.log(`=== ${r.at} ${r.kind} v${r.app} scene=${r.scene || '-'}${r.midLoad ? ' (mid-load)' : ''} device=${r.device}`);
  if (r.message) console.log(`  ${r.message}`);
  if (r.stack) console.log(r.stack.split('\n').slice(0, 6).map((l) => `    ${l}`).join('\n'));
  console.log(`  ${e.ua}`);
  console.log(`  screen ${e.screen?.join('x')} @${e.dpr}x view ${e.viewport?.join('x')} mem ${e.mem ?? '?'}GB heap ${e.heap ? `${e.heap.used}/${e.heap.limit}MB` : '?'} tex ${e.texMB ?? '?'}MB ${e.renderer}${e.touch ? ' touch' : ''}`);
  for (const c of (r.crumbs ?? []).slice(-12)) console.log(`    ${new Date(c.t).toISOString().slice(11, 23)} [${c.k}] ${c.m}`);
  console.log('');
}
