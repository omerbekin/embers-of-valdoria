#!/usr/bin/env node
// GitHub Pages yayını tek komut (Ömer 2026-10-17, "GitHub'a at"): patch notes girdisi + (3 parçalı sürümde) package.json + tam test + build + commit + push.
// Kullanım:
//   npm run release -- 0.8.3.1 --fixes "Ash Hounds hit harder only below 35% HP." --new "..." --changes "..."
//   --dry   : test + build yapar, commit/push yapmaz (patch notes girdisi sonunda geri alınır)
// Satırlar oyuncuya yönelik kısa İngilizce (tests/patch-notes.test.ts kuralları). Canlı (Cloudflare) yayın bu komutla YAPILMAZ.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const version = args.shift();
if (!version || !/^\d+\.\d+\.\d+(\.\d+)?$/.test(version)) {
  console.error('Sürüm gerekli: npm run release -- 0.8.3.1 --fixes "..."');
  process.exit(1);
}
const dry = args.includes('--dry');
const HEAD = { '--new': 'New', '--changes': 'Changes', '--fixes': 'Fixes' };
const groups = [];
let cur = null;
for (const a of args) {
  if (a === '--dry') continue;
  if (HEAD[a]) {
    cur = { heading: HEAD[a], items: [] };
    groups.push(cur);
  } else if (cur) cur.items.push(a);
  else {
    console.error(`Satırdan önce --new / --changes / --fixes yaz: "${a}"`);
    process.exit(1);
  }
}
const filled = groups.filter((g) => g.items.length);
if (!filled.length) {
  console.error('En az bir patch notes satırı gerekli (--fixes "...").');
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

// 1) Sürüm: 3 parçalıysa package.json da ilerler (CLAUDE.md sürüm kuralı)
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (version.split('.').length === 3 && pkg.version !== version) run(`npm version ${version} --no-git-tag-version`);

// 2) Patch notes: en üste (aynı sürüm zaten varsa durur)
const notesPath = 'data/patch-notes.json';
const raw = readFileSync(notesPath, 'utf8');
const notes = JSON.parse(raw);
if (notes.releases.some((r) => r.version === version)) {
  console.error(`${version} patch notes'ta zaten var.`);
  process.exit(1);
}
const d = new Date(); // yerel tarih (UTC gece yarısından önce bir gün geride kalır)
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const entry = { version, date, groups: filled };
const block = JSON.stringify(entry, null, 2)
  .split('\n')
  .map((l) => '    ' + l)
  .join('\n');
const m = /"releases": \[\r?\n/.exec(raw);
if (!m) throw new Error('patch-notes.json: "releases" bulunamadı');
const eol = m[0].endsWith('\r\n') ? '\r\n' : '\n'; // dosyanın satır sonu korunur
const cut = m.index + m[0].length;
writeFileSync(notesPath, raw.slice(0, cut) + block.split('\n').join(eol) + ',' + eol + raw.slice(cut));
console.log(`\n> ${version} patch notes eklendi (${filled.map((g) => `${g.heading} ${g.items.length}`).join(', ')})`);

// 3) Tam test + build (biri kırmızıysa durur, hiçbir şey gönderilmez)
try {
  run('npm test');
  run('npm run build');
} catch {
  writeFileSync(notesPath, raw); // kırmızı: patch notes geri alınır, hiçbir şey gönderilmez
  console.error('\n> Test ya da build kırmızı: patch notes geri alındı, gönderilmedi.');
  process.exit(1);
}
if (dry) {
  writeFileSync(notesPath, raw); // deneme: patch notes eski haline döner (3 parçalı sürümde package.json elle geri alınır)
  console.log('\n> --dry: test + build yeşil; patch notes geri alındı, commit/push yapılmadı.');
  process.exit(0);
}

// 4) Commit + push (kaynak klasörler; assets/source gibi işlenmemiş ham dosyalar eklenmez)
run('git add -A src data tests tools docs public index.html package.json package-lock.json cloudflare CLAUDE.md .claude');
const summary = filled.flatMap((g) => g.items)[0].replace(/"/g, "'");
const msg = `${version}: ${summary}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
writeFileSync('.git/RELEASE_MSG', msg);
run('git -c user.name=Omer -c user.email=omerbekinn@gmail.com commit -q -F .git/RELEASE_MSG');
run('git push');
console.log(`\n> ${version} GitHub'a gönderildi (${out('git rev-parse --short HEAD')}). Pages birkaç dakikada güncellenir.`);
