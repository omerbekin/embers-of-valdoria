#!/usr/bin/env node
// Gönderim kuyruğu (Ömer 2026-10-24): sohbetler birbirine mesaj atmadan GitHub gönderimini paylaşır.
// Modlar: kritik (iş bitince kendisi gönderir), eşlik (biri gönderince beraber gider; etiketsiz sohbet), gün sonu (yalnız gece 03:00).
// Kuyruk .git/push-queue.json içinde durur (git'e girmez, Changes'ta görünmez). Hook'lar .claude/settings.local.json'da.
// Komutlar:
//   hook-prompt / hook-edit / hook-bash-pre / hook-bash-post : Claude Code hook'ları (stdin JSON)
//   status                           : kuyruğu yazar (sahipsiz değişiklikler dahil)
//   pages-check <sha> <sürüm>        : gönderimden sonra arka planda Pages yayınını izler
//   mode <oturum> <kritik|eşlik|gün sonu>
//   add <oturum> <dosya...>          : hook'un görmediği dosyalar (Bash ile, script ile, worktree'den gelenler)
//   ready <oturum> --fixes "..." [--new "..."] [--changes "..."]   : iş bitti, sıradaki gönderime katılır
//   push <oturum> [--fixes "..." ...] [--version x] [--dry]        : kritik sohbetin gönderimi (+ hazır eşlikler)
//   eod [--dry]                      : gece görevi, hazır olan her şeyi gönderir
//   doctor                           : bakım: bayat index.lock, artık eov-push kopyaları, artık süreçler (her gönderim başında da çalışır)
// push/eod (--dry hariç) kendini arka plana alıp hemen döner (Ömer 2026-10-30); özet .git/push-queue.log, tam çıktı .git/push-queue.out.log
//   drop <oturum>                    : girdiyi siler (gönderilmeden)
import { execSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, lstatSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, appendFileSync, openSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { tmpdir } from 'node:os';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(GAME, '..');
const QUEUE = join(GAME, '.git', 'push-queue.json');
const QLOCK = join(GAME, '.git', 'push-queue.d.lock');
const PLOCK = join(GAME, '.git', 'push-queue.push.lock');
const LOG = join(GAME, '.git', 'push-queue.log');
const SNAP = join(GAME, '.git', 'push-queue.snap');
const OUT = join(GAME, '.git', 'push-queue.out.log');
const SELF = fileURLToPath(import.meta.url);
const DAY = 86400000;
// Kuyruğa girmeyen yollar: ham görseller (yayına elle eklenir), agent kopyaları, derleme çıktıları
const SKIP = (rel) => /^(\.git\/|assets\/source\/|\.claude\/worktrees\/|node_modules\/|dist\/)/.test(rel);
process.chdir(GAME);

const MODES = { kritik: 'kritik', 'eşlik': 'eşlik', eslik: 'eşlik', 'günsonu': 'gün sonu', gunsonu: 'gün sonu' };
const HEAD = { '--new': 'New', '--changes': 'Changes', '--fixes': 'Fixes' };

const log = (s) => {
  const line = `[${new Date().toISOString()}] ${s}`;
  console.log(s);
  try { appendFileSync(LOG, line + '\n'); } catch {}
};
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Kısa kilit: aynı anda iki sohbetin hook'u kuyruğu bozmasın
function withQueue(fn) {
  for (let i = 0; ; i++) {
    try { mkdirSync(QLOCK); break; } catch {
      try { if (Date.now() - statSync(QLOCK).mtimeMs > 10000) rmSync(QLOCK, { recursive: true, force: true }); } catch {}
      if (i > 100) throw new Error('kuyruk kilidi alınamadı');
      sleep(30);
    }
  }
  try {
    const q = existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : { sessions: {} };
    for (const sid of Object.keys(q.sessions)) if (sid.length > 8 && q.sessions[short(sid)]) entry(q, sid);
    // Dosyası olmayan, hazır olmayan ve 2 gündür sesi çıkmayan girdiler kendiliğinden silinir
    for (const [sid, e] of Object.entries(q.sessions))
      if (!e.ready && !e.files.length && Date.now() - Math.max(e.updated ?? 0, e.seen ?? 0) > 2 * DAY) delete q.sessions[sid];
    const r = fn(q);
    writeFileSync(QUEUE + '.tmp', JSON.stringify(q, null, 2));
    renameSync(QUEUE + '.tmp', QUEUE);
    return r;
  } finally {
    rmSync(QLOCK, { recursive: true, force: true });
  }
}
const readQueue = () => (existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : { sessions: {} });
const short = (sid) => sid.slice(0, 8);
// Sohbetin modu girdiden ayrı saklanır (Ömer 2026-10-25): gönderim girdiyi silince yeni girdi varsayılan 'eşlik'e düşüyordu, kritik kanal unutuluyordu
const rememberMode = (q, sid, mode) => { (q.modes ??= {})[short(sid)] = mode; };
function entry(q, sid) {
  const e = (q.sessions[sid] ??= { mode: q.modes?.[short(sid)] ?? 'eşlik', files: [], ready: false, notes: {}, created: new Date().toISOString(), updated: Date.now(), told: false });
  // Kısa kimlikle (add/ready) açılmış ayrı bir girdi varsa tam kimliğe katılır
  const s = short(sid);
  const dup = s !== sid && q.sessions[s];
  if (dup) {
    for (const f of dup.files) if (!e.files.includes(f)) e.files.push(f);
    mergeNotes((e.notes ??= {}), dup.notes ?? {});
    e.ready ||= dup.ready;
    e.internal ||= dup.internal;
    e.updated = Math.max(e.updated, dup.updated);
    delete q.sessions[s];
  }
  return e;
}

function findSid(q, s) {
  if (!s) throw new Error('oturum kimliği gerekli');
  if (q.sessions[s]) return s;
  const hit = Object.keys(q.sessions).filter((k) => k.startsWith(s) && k.length > s.length);
  if (hit.length === 1) return hit[0];
  return s; // yeni girdi (add/ready ile açılabilir)
}
function parseNotes(args) {
  const notes = {};
  let cur = null;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (HEAD[a]) { cur = HEAD[a]; notes[cur] ??= []; }
    else if (a === '--version' || a === '--dry' || a === '--internal' || a === '--bg') { rest.push(a); if (a === '--version') rest.push(args[++i]); cur = null; }
    else if (cur) notes[cur].push(a);
    else rest.push(a);
  }
  return { notes, rest };
}
const mergeNotes = (into, add) => { for (const [h, items] of Object.entries(add)) (into[h] ??= []).push(...items.filter((x) => !(into[h] ?? []).includes(x))); };
const hasNotes = (n) => Object.values(n ?? {}).some((v) => v.length);
const readStdin = () => { try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; } };

const RULES = (sid, mode) =>
  `[gönderim kuyruğu] Bu sohbetin oturumu: ${short(sid)} · mod: ${mode}. ` +
  `Düzenlediğin game/ dosyaları (Edit/Write ve Bash komutlarıyla değişenler) otomatik kuyruğa yazılır; gözden kaçan olursa \`node tools/push-queue.mjs add ${short(sid)} <dosya...>\`. ` +
  (mode === 'kritik'
    ? `İş bitip doğrulanınca Ömer'e tek satır "GitHub'a gönderiyorum" de, teyit BEKLEME, \`node tools/push-queue.mjs push ${short(sid)} --fixes "<oyuncuya yönelik İngilizce satır>"\` çalıştır (sürüm, test, 5000, Pages, push dahil; komut kendini arka plana alıp hemen döner, sonuç .git/push-queue.log son satırlarında ve kuyruk raporunda); bitince 5000 + Pages linkini ver.`
    : `Kendin GitHub'a gönderme. İş bitip doğrulanınca \`node tools/push-queue.mjs ready ${short(sid)} --fixes "<oyuncuya yönelik İngilizce satır>"\` çalıştır; ` +
      (mode === 'eşlik' ? 'ilk kritik gönderimle ya da gece 03:00 görevinde gider.' : 'gece 03:00 görevinde gider.')) +
  ` Oyuncunun göreceği bir şey değişmediyse (yalnız docs/ ya da araç) satır yazma, \`--internal\` ver (sürüm notuna girmez).` +
  ` Diğer sohbetlere mesaj atma.`;

function hookPrompt() {
  const { session_id: sid, prompt = '' } = readStdin();
  if (!sid) return;
  const m = /\[(kritik|eşlik|eslik|gün[ -]?sonu|gun[ -]?sonu)\]/i.exec(prompt);
  const out = withQueue((q) => {
    const fresh = !q.sessions[sid];
    const e = entry(q, sid);
    let changed = false;
    if (m) {
      const mode = MODES[m[1].toLowerCase().replace(/[ -]/g, '')] ?? 'eşlik';
      if (mode !== e.mode) { e.mode = mode; changed = true; }
      rememberMode(q, sid, mode);
    }
    e.seen = Date.now();
    if (!e.label && prompt.trim() && !/^kuyruk/i.test(prompt.trim())) e.label = prompt.trim().replace(/\s+/g, ' ').slice(0, 50);
    let text = fresh || changed || !e.told ? ((e.told = true), RULES(sid, e.mode))
      : `[gönderim kuyruğu] oturum ${short(sid)} · mod: ${e.mode}${e.ready ? ' · hazır' : ''} · ${e.files.length} dosya`;
    // Gece raporu / Pages uyarısı: ilk gelen sohbete bir kez gösterilir
    if (q.notices?.length) {
      text += `\n[gönderim kuyruğu] RAPOR: bunları Ömer'e cevabının en başında sade Türkçeyle ilet:\n- ${q.notices.join('\n- ')}`;
      q.notices = [];
    }
    if (/^kuyruk\??$/i.test(prompt.trim()))
      text += `\n[gönderim kuyruğu] Ömer kuyruğu görmek istiyor. Komut çalıştırmadan, aşağıdakini sade bir tablo yap (sohbet, mod, durum, dosya sayısı, bekleyen not) ve sahipsiz değişiklikleri ayrıca yaz:\n${statusText(q)}`;
    return text;
  });
  console.log(out);
}

function hookEdit() {
  const { session_id: sid, tool_input = {}, cwd = ROOT } = readStdin();
  const p = tool_input.file_path ?? tool_input.notebook_path;
  if (!sid || !p) return;
  const rel = relative(GAME, isAbsolute(p) ? p : resolve(cwd, p)).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || SKIP(rel)) return;
  const warn = withQueue((q) => {
    const e = entry(q, sid);
    if (!e.files.includes(rel)) e.files.push(rel);
    e.updated = Date.now();
    return overlapWarning(q, sid, e, [rel]);
  });
  if (warn) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: warn } }));
}

// Ortak dosya uyarısı (Ömer 2026-10-24, 0.9.8.4 olayı: yarım Radiance işi başka sohbetlerin gönderimini kilitledi): dosya başka bir sohbetin
// kuyruğunda da varsa, dosya başına bir kez uyarı döner (beraber gidecekler; o sohbet yarımsa gönderim onun işini de taşır)
function overlapWarning(q, sid, e, files) {
  const hits = [];
  for (const f of files) {
    if ((e.warned ??= []).includes(f)) continue;
    const who = Object.entries(q.sessions).filter(([k, o]) => k !== sid && o.files.includes(f)).map(([k, o]) => `${short(k)} (${o.mode}, ${o.ready ? 'hazır' : 'yarım'}${o.label ? `, "${o.label.slice(0, 30)}"` : ''})`);
    if (!who.length) continue;
    e.warned.push(f);
    hits.push(`${f} -> ${who.join(', ')}`);
  }
  return hits.length
    ? `[gönderim kuyruğu] ORTAK DOSYA: ${hits.join('; ')}. Bu dosyalar o sohbetin işiyle ayrılamaz, gönderimde beraber gider; o sohbet yarımsa onun değişiklikleri de gider ya da testleri kırabilir. Gönderimden önce Ömer'e bunu söyle.`
    : null;
}

// Değişmiş yollar (git'in gördüğü) + her birinin boyut/zaman imzası
// Salt okunur status index'i kilitlemez (Ömer 2026-10-30, F1): hook zaman aşımıyla öldürülünce bayat index.lock kalıyordu
function dirtyMap() {
  const recs = execSync('git --no-optional-locks status --porcelain -uall -z', { encoding: 'utf8' }).split('\0');
  const map = {};
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    if (!r) continue;
    const p = r.slice(3);
    if (r[0] === 'R' || r[0] === 'C') i++; // -z biçiminde eski ad ayrı kayıtta gelir
    if (SKIP(p)) continue;
    try { const st = statSync(p); map[p] = `${st.size}:${st.mtimeMs}`; } catch { map[p] = 'gone'; }
  }
  return map;
}
const snapPath = (d) => join(SNAP, `${d.session_id}-${String(d.tool_use_id ?? 'x').replace(/[^\w-]/g, '')}.json`);
function hookBashPre() {
  const d = readStdin();
  if (!d.session_id) return;
  mkdirSync(SNAP, { recursive: true });
  writeFileSync(snapPath(d), JSON.stringify(dirtyMap()));
}
function hookBashPost() {
  const d = readStdin();
  if (!d.session_id || !existsSync(snapPath(d))) return;
  const before = JSON.parse(readFileSync(snapPath(d), 'utf8'));
  rmSync(snapPath(d), { force: true });
  const after = dirtyMap();
  const touched = Object.keys(after).filter((p) => after[p] !== before[p]);
  if (!touched.length) return;
  const warn = withQueue((q) => {
    // Başka bir sohbetin zaten sahiplendiği dosya yazılmaz (uzun komut sırasında onun Edit'i olabilir); yine de ortak dosya uyarısı verilir
    const others = new Set(Object.entries(q.sessions).filter(([k]) => k !== d.session_id).flatMap(([, e]) => e.files));
    const e = entry(q, d.session_id);
    const add = touched.filter((p) => !others.has(p) && !e.files.includes(p));
    if (add.length) {
      e.files.push(...add);
      e.updated = Date.now();
    }
    return overlapWarning(q, d.session_id, e, touched.filter((p) => others.has(p)));
  });
  if (warn) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: warn } }));
}
const unclaimed = (q) => { const own = new Set(Object.values(q.sessions).flatMap((e) => e.files)); return Object.keys(dirtyMap()).filter((p) => !own.has(p)); };
function statusText(q) {
  const lines = [];
  const ids = Object.keys(q.sessions);
  if (!ids.length) lines.push('Kuyruk boş.');
  for (const sid of ids) {
    const e = q.sessions[sid];
    lines.push(`${short(sid)}  ${e.mode.padEnd(8)} ${e.ready ? (e.internal ? 'HAZIR (iç)' : 'HAZIR') : 'çalışıyor'}  ${e.files.length} dosya${e.label ? '  "' + e.label + '"' : ''}${e.lastError ? '  !! ' + e.lastError : ''}`);
    for (const f of e.files) lines.push('     ' + f);
    for (const [h, items] of Object.entries(e.notes ?? {})) for (const it of items) lines.push(`     [${h}] ${it}`);
  }
  const u = unclaimed(q);
  if (u.length) lines.push(`Sahipsiz değişiklikler (hiçbir sohbete ait değil, gönderilmez): ${u.join(', ')}`);
  return lines.join('\n');
}
const status = () => console.log(statusText(readQueue()));
const notice = (text) => withQueue((q) => { (q.notices ??= []).push(`[${new Date().toLocaleString('tr-TR')}] ${text}`); });

// Pages yayını izleme (gönderimden sonra ayrı süreç): GitHub Actions'ın o commit için sonucu
async function pagesCheck(sha, version) {
  const url = `https://api.github.com/repos/omerbekin/embers-of-valdoria/actions/runs?head_sha=${sha}`;
  for (let i = 0; i < 25; i++) {
    sleep(60000);
    let runs = [];
    try {
      const out = execSync(`powershell -NoProfile -NonInteractive -Command "(Invoke-RestMethod -TimeoutSec 20 -Headers @{'User-Agent'='eov'} '${url}').workflow_runs | Select-Object name,status,conclusion | ConvertTo-Json -Compress"`, { encoding: 'utf8', windowsHide: true }).trim();
      runs = out ? [].concat(JSON.parse(out)) : [];
    } catch { continue; }
    if (!runs.length || runs.some((r) => r.status !== 'completed')) continue;
    const bad = runs.filter((r) => r.conclusion !== 'success');
    if (bad.length) { log(`!! Pages yayını başarısız: ${version}`); notice(`${version} GitHub'a gitti ama Pages yayını BAŞARISIZ (${bad.map((r) => r.name + ': ' + r.conclusion).join(', ')}); Pages eski sürümde kaldı, düzeltilmesi gerek.`); }
    else log(`> Pages yayını tamam: ${version}`);
    return;
  }
  log(`!! Pages yayını 25 dakikada sonuçlanmadı: ${version}`);
  notice(`${version} GitHub'a gitti ama Pages yayını 25 dakikada sonuçlanmadı; Pages'te sürüm kontrol edilmeli.`);
}

const portBusy = (port) =>
  new Promise((ok) => {
    const s = net.connect(port, '127.0.0.1');
    s.once('connect', () => { s.destroy(); ok(true); });
    s.once('error', () => ok(false));
  });

async function start5000() {
  // Yerel 5000 (Ömer 2026-10-18 + 2026-10-24): her GitHub gönderimi önce play-build'i yeniler; vite preview diskten okur, açıksa yeniden başlatmak gerekmez
  if (await portBusy(5000)) return log('> 5000 açık, yeni build yayında.');
  const out = openSync(join(GAME, '.git', 'play-5000.log'), 'a');
  spawn(process.execPath, [join(GAME, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--config', 'game/vite.config.ts', '--outDir', 'play-build', '--port', '5000', '--strictPort', '--host'], {
    cwd: ROOT, detached: true, stdio: ['ignore', out, out], windowsHide: true,
  }).unref();
  log('> 5000 kapalıydı, önizleme başlatıldı.');
}

function nextVersion() {
  const top = JSON.parse(readFileSync('data/patch-notes.json', 'utf8')).releases[0].version.split('.').map(Number);
  if (top.length === 4) top[3]++;
  else top.push(1);
  return top.join('.');
}

async function push(trigger, args) {
  const { notes, rest } = parseNotes(args);
  const dry = rest.includes('--dry');
  const internal = rest.includes('--internal');
  const vi = rest.indexOf('--version');
  const forced = vi >= 0 ? rest[vi + 1] : null;

  // Uzun kilit: aynı anda iki gönderim olmaz; meşgulse sırasını bekler (eski kilit 40 dk sonra bayat sayılır)
  for (let waited = false; ; ) {
    try { mkdirSync(PLOCK); break; } catch {
      let age = 0;
      try { age = Date.now() - statSync(PLOCK).mtimeMs; } catch { continue; }
      if (age > 40 * 60000) { rmSync(PLOCK, { recursive: true, force: true }); continue; }
      if (!waited) { log('> Başka bir gönderim sürüyor, bitmesi bekleniyor.'); waited = true; }
      sleep(15000);
    }
  }
  const started = Date.now();
  try {
    // Kilidin sahibi yazılır (doctor çalışan gönderimin kopyasına dokunmasın), sonra bakım (Ömer 2026-10-30, F2/F8)
    try { writeFileSync(join(PLOCK, 'owner.json'), JSON.stringify({ pid: process.pid })); } catch {}
    try { doctor({ inPush: true }); } catch (e) { log('!! Bakım (doctor) hata verdi, gönderim sürüyor: ' + firstLine(e)); }
    const picked = withQueue((q) => {
      if (trigger !== 'eod') {
        const sid = findSid(q, trigger);
        const e = entry(q, sid);
        e.ready = true;
        mergeNotes(e.notes, notes);
        if (internal && !hasNotes(notes)) e.internal = true;
        trigger = sid;
      }
      return Object.entries(q.sessions)
        // Hazır işaretlenmiş başka kritik sohbet de beraber gider (2026-10-30: 839e43ba hazır ama dışarıda kalıp dosyaları yarım gidiyordu)
        .filter(([sid, e]) => e.ready && (trigger === 'eod' || sid === trigger || e.mode === 'eşlik' || e.mode === 'kritik'))
        .map(([sid, e]) => ({ sid, ...e }));
    });
    const q = readQueue();
    const files = [...new Set(picked.flatMap((e) => e.files))];
    const changed = files.filter((f) => execSync(`git --no-optional-locks status --porcelain -- "${f}"`, { encoding: 'utf8' }).trim());
    const groups = {};
    for (const e of picked) mergeNotes(groups, e.notes);
    if (trigger === 'eod') {
      const u = unclaimed(q);
      if (u.length) { log(`!! Sahipsiz değişiklikler: ${u.join(', ')}`); if (!dry) notice(`Gece kontrolü: hiçbir sohbete ait olmayan değişiklikler var, gönderilmediler: ${u.join(', ')}. Bunlar hangi işe ait, söylersen kuyruğa eklerim.`); }
    }
    if (!changed.length) {
      log(`> Gönderilecek değişiklik yok (${picked.length} hazır girdi).`);
      if (!dry) withQueue((qq) => { for (const e of picked) if ((qq.sessions[e.sid]?.updated ?? 0) <= started) delete qq.sessions[e.sid]; });
      return 0;
    }
    // Oyuncuya görünen satır yoksa (yalnız --internal girdiler) sürüm ve patch notes ALMAZ
    if (!hasNotes(groups) && !picked.every((e) => e.internal)) throw new Error('patch notes satırı yok (ready/push --fixes "..." ya da --internal)');

    // Aynı dosya dışarıda kalan bir sohbette de değiştiyse ayrılamaz, beraber gider
    for (const [sid, e] of Object.entries(q.sessions)) {
      if (picked.some((p) => p.sid === sid)) continue;
      const both = e.files.filter((f) => changed.includes(f));
      if (both.length) log(`!! Uyarı: ${short(sid)} (${e.mode}, ${e.ready ? 'hazır' : 'yarım'}) şu dosyaları da değiştirdi, ayrılamadığı için bu gönderime giriyor: ${both.join(', ')}`);
    }

    const version = hasNotes(groups) ? forced ?? nextVersion() : null;
    log(`> ${version ?? 'Sürümsüz iç güncelleme'} hazırlanıyor: ${picked.map((e) => `${short(e.sid)}/${e.mode}`).join(', ')} · ${changed.length} dosya${dry ? ' (deneme)' : ''}`);
    const shipped = await shipClean(version, groups, changed, dry);
    if (dry) return log('> Deneme bitti, kuyruk olduğu gibi kaldı.'), 0;

    withQueue((qq) => {
      for (const e of picked) {
        const cur = qq.sessions[e.sid];
        if (!cur) continue;
        if (cur.updated > started) { cur.ready = false; cur.notes = {}; cur.files = cur.files.filter((f) => execSync(`git --no-optional-locks status --porcelain -- "${f}"`, { encoding: 'utf8' }).trim()); }
        else delete qq.sessions[e.sid];
      }
    });
    log(`> ${version ?? 'İç güncelleme'} GitHub'a gönderildi. 5000: http://localhost:5000/ · Pages: https://omerbekin.github.io/embers-of-valdoria/`);
    if (trigger === 'eod') notice(`Gece 03:00 gönderimi: ${version ?? 'sürümsüz iç güncelleme'} GitHub'a gitti (${picked.map((e) => e.label ? '"' + e.label + '"' : short(e.sid)).join(', ')}).`);
    // Arka planda koştuğu için (F5) başlatan sohbet sonucu kuyruk raporundan öğrenir
    if (trigger !== 'eod') notice(`${short(trigger)} gönderimi tamam: ${version ?? 'sürümsüz iç güncelleme'} GitHub'a gitti. 5000: http://localhost:5000/ · Pages: https://omerbekin.github.io/embers-of-valdoria/`);
    spawn(process.execPath, [SELF, 'pages-check', shipped.sha, version ?? 'iç güncelleme'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    return 0;
  } catch (err) {
    log('!! Gönderim durdu: ' + err.message);
    if (dry) return 1; // deneme kuyruğa ve sohbetlere iz bırakmaz
    if (trigger === 'eod') notice(`Gece 03:00 gönderimi DURDU, hiçbir şey gitmedi: ${err.message}. Hazır işler kuyrukta bekliyor.`);
    else notice(`${short(trigger)} gönderimi DURDU: ${err.red ?? err.message}`);
    withQueue((qq) => { for (const e of Object.values(qq.sessions)) if (e.ready) e.lastError = err.red ?? err.message; });
    return 1;
  } finally {
    rmSync(PLOCK, { recursive: true, force: true });
  }
}

const q_ = (s) => `"${s}"`;
const git = (cmd, env) => execSync(`git ${cmd}`, { encoding: 'utf8', env: { ...process.env, ...env } }).trim();
const ps = (cmd) => execSync(`powershell -NoProfile -NonInteractive -Command "${cmd}"`, { stdio: 'inherit' });

// Patch notes girdisi (release.mjs ile aynı biçim; dosyanın satır sonu korunur)
function addNotes(version, groups) {
  const path = 'data/patch-notes.json';
  const raw = readFileSync(path, 'utf8');
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const entryObj = { version, date, groups: Object.entries(groups).filter(([, v]) => v.length).map(([heading, items]) => ({ heading, items })) };
  const m = /"releases": \[\r?\n/.exec(raw);
  if (!m) throw new Error('patch-notes.json: "releases" bulunamadı');
  const eol = m[0].endsWith('\r\n') ? '\r\n' : '\n';
  const block = JSON.stringify(entryObj, null, 2).split('\n').map((l) => '    ' + l).join(eol);
  const cut = m.index + m[0].length;
  const added = block + ',' + eol;
  writeFileSync(path, raw.slice(0, cut) + added + raw.slice(cut));
  const oldPkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const bump = version.split('.').length === 3 && oldPkgVersion !== version;
  if (bump) execSync(`npm version ${version} --no-git-tag-version`, { stdio: 'ignore' });
  // Geri alma yalnız kuyruğun eklediğini siler (Ömer 2026-10-31): dosya komple eski hâline dönerse test süresince başka sohbetin yazdığı kaybolur
  return () => {
    const now = readFileSync(path, 'utf8');
    const at = now.indexOf(added);
    if (at >= 0) writeFileSync(path, now.slice(0, at) + now.slice(at + added.length));
    else log(`!! Uyarı: ${version} sürüm notu patch-notes.json içinde bulunamadı, geri alınmadı; elle bakılmalı`);
    if (bump && JSON.parse(readFileSync('package.json', 'utf8')).version === version) execSync(`npm version ${oldPkgVersion} --no-git-tag-version`, { stdio: 'ignore' });
  };
}

// Hata metninin kısa hali: git'in asıl sebebi stderr'dedir, message'ın ilk satırı yalnız komutu tekrarlar
const firstLine = (e) => String(e?.stderr?.toString().trim() || e?.message || e).split('\n')[0].slice(0, 200);

// Komut çıktısı hem ekranda hem dosyada (Ömer 2026-10-30, F3); dosya sistemin geçici klasöründe, repoya yazılmaz
// args verilirse kabuksuz çalışır (cmd.exe satırı ~8k ile sınırlı, ön testte yüzlerce dosya yolu geçebiliyor)
function runTee(cmd, args, cwd, tag) {
  const file = join(tmpdir(), `eov-out-${tag.replace(/\W+/g, '-')}-${Date.now()}.txt`);
  return new Promise((ok) => {
    const chunks = [];
    const done = (code, extra = '') => {
      const out = Buffer.concat(chunks).toString('utf8') + extra;
      try { writeFileSync(file, out); } catch {}
      ok({ code, out, file });
    };
    const p = spawn(cmd, args ?? [], { cwd, shell: !args, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', (d) => { process.stdout.write(d); chunks.push(d); });
    p.stderr.on('data', (d) => { process.stderr.write(d); chunks.push(d); });
    p.on('error', (e) => done(-1, String(e)));
    p.on('close', (code) => done(code));
  });
}

// Kırmızı çıktıdan dosyalar: vitest FAIL satırları + tsc hataları + derleme hataları; dosya -> kısa ayrıntı
function parseRed(out) {
  const text = out.replace(/\x1b\[[0-9;]*m/g, '');
  const norm = (f) => f.replace(/\\/g, '/').replace(/^.*?\/eov-push-\d+\//, '').replace(/^\.\//, '');
  const hits = new Map();
  const add = (f, why) => { const n = norm(f); if (!hits.has(n)) hits.set(n, why); };
  for (const m of text.matchAll(/\bFAIL\s+(\S+?\.(?:test|spec)\.[cm]?[jt]sx?)(?:\s+>\s+([^\n]+))?/g)) add(m[1], (m[2] ?? '').trim().slice(0, 40));
  for (const m of text.matchAll(/^\s*([^\s(][^()\n]*?\.[cm]?tsx?)\(\d+,\d+\): error (TS\d+)/gm)) add(m[1], m[2]);
  for (const m of text.matchAll(/(?:^|\s)((?:src|tests|data)\/[\w./-]+\.(?:tsx?|mjs|js|json))(?::\d+:\d+)?:\s*(?:ERROR|error)/gm)) add(m[1], 'derleme');
  return hits;
}
// Kırmızıyı kimin kırdığı (Ömer 2026-10-30, F3): dosya -> kuyruktaki sahibi; en fazla 10 dosya
function redReport(stage, out, file, shipped) {
  const hits = [...parseRed(out)];
  if (!hits.length) return `Kırmızı (${stage}): dosya ayrıştırılamadı · çıktı: ${file}`;
  const sessions = Object.entries(readQueue().sessions);
  const owner = (f) => {
    const who = sessions.filter(([, e]) => e.files.includes(f)).map(([k, e]) => `${short(k)} (${e.mode}, ${e.ready ? 'hazır' : 'yarım'})`);
    return who.length ? who.join(', ') : shipped.includes(f) ? 'sahipsiz' : 'sahipsiz (bu gönderimde değişmedi, sebep başka dosya)';
  };
  const list = hits.slice(0, 10).map(([f, why]) => `${f}${why ? ` (${why})` : ''} — dosya sahibi ${owner(f)}`).join('; ');
  return `Kırmızı (${stage}): ${list}${hits.length > 10 ? `; +${hits.length - 10} dosya daha` : ''} · çıktı: ${file}`;
}

const INDEX_LOCK = join(GAME, '.git', 'index.lock');
const LOCK_STALE = 10 * 60000;
const psJson = (script) => {
  const enc = Buffer.from(script, 'utf16le').toString('base64');
  return JSON.parse(execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${enc}`, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }));
};
// Hook'ların git status'ları çok kısa sürer, bir anlık görülebilir: üç kez bakılır. Sorgu başarısızsa "çalışıyor" sayılır (kilit silinmez)
function gitRunning() {
  for (let i = 0; i < 3; i++) {
    try { if (psJson('@(Get-Process git -ErrorAction SilentlyContinue).Count') === 0) return false; } catch {}
    if (i < 2) sleep(2000);
  }
  return true;
}
// Bayat index.lock (10 dk+ ve çalışan git yok) silinir; dönüş: kilit yoksa null, yoksa durumu anlatan { removed, why }
function clearStaleIndexLock() {
  let age;
  try { age = Date.now() - statSync(INDEX_LOCK).mtimeMs; } catch { return null; }
  const min = Math.round(age / 60000);
  if (age < LOCK_STALE) return { removed: false, why: `.git/index.lock ${min} dk yaşında, henüz bayat sayılmıyor` };
  if (gitRunning()) return { removed: false, why: `.git/index.lock ${min} dk yaşında ama çalışan git var` };
  try { rmSync(INDEX_LOCK, { force: true }); } catch (e) { return { removed: false, why: `.git/index.lock silinemedi: ${firstLine(e)}` }; }
  log(`> Bayat .git/index.lock silindi (${min} dk)`);
  notice(`Bayat .git/index.lock (${min} dk) bulundu ve silindi; hiçbir git işlemi çalışmıyordu.`);
  return { removed: true, why: `.git/index.lock (${min} dk) silindi` };
}

// Gönderilen yolların index'i yeni HEAD'e eşitlenir ve doğrulanır (Ömer 2026-10-30, F2; 0.9.10.2 ve 0.9.10.4'te reset kilitten olmadı, index yüzlerce dosya geride kaldı)
function syncIndex(all) {
  const list = join(GAME, '.git', 'push-queue.reset-paths');
  writeFileSync(list, all.join('\n') + '\n');
  const fix = 'cd game && git reset -q --pathspec-from-file=.git/push-queue.reset-paths';
  const reset = () => git(`reset -q --pathspec-from-file=${q_(list)}`); // yol listesi dosyadan: 384+ dosyada komut satırı sınırı
  const fail = (text) => { log(`!! ${text}`); notice(text); };
  try { reset(); } catch (e) {
    const why = existsSync(INDEX_LOCK) ? `.git/index.lock duruyor (${firstLine(e)})` : firstLine(e);
    log(`!! Index güncellenemedi, bir kez daha denenecek: ${why}`);
    // Bayatsa temizlenir; tazeyse başka bir git işlemidir, biraz beklenir
    const lock = clearStaleIndexLock();
    for (let i = 0; i < 6 && lock && !lock.removed && existsSync(INDEX_LOCK); i++) sleep(5000);
    try { reset(); } catch (e2) {
      const still = existsSync(INDEX_LOCK);
      fail(`GitHub'a gitti, yerel main ilerledi ama index güncellenemedi: ${still ? `.git/index.lock duruyor (${firstLine(e2)})` : firstLine(e2)}. Gönderilen dosyalar değişmiş görünür; elle: ${still ? 'git çalışmadığından emin olup .git/index.lock sil, sonra ' : ''}${fix}`);
      return false;
    }
  }
  // Yol listesi komut satırına sığmayabilir (git diff --pathspec-from-file almaz): tüm stage alınır, gönderilen yollara süzülür
  let staged;
  try { staged = git('diff --cached --no-renames --name-only -z').split('\0').filter(Boolean); }
  catch (e) { fail(`Index doğrulanamadı: ${firstLine(e)}; elle kontrol: git diff --cached --stat`); return false; }
  const bad = staged.filter((p) => all.some((a) => p === a || p.startsWith(a.replace(/\/$/, '') + '/')));
  if (bad.length) { fail(`Index yeni HEAD ile eşleşmiyor (${bad.length} yol: ${bad.slice(0, 5).join(', ')}); elle: ${fix}`); return false; }
  return true;
}

// Süreç komut satırındaki klasörler (Ömer 2026-10-30, F8). "Ayırt etmek dikkat ister" notunun çözümü: yalnız klasörü diskte artık olmayan süreç artıktır.
// Yalnız kendi başına yol olan argümanlar sayılır; serbest metin (-e betikleri, istem yazıları) içinde geçen yol süreci artık yapmaz.
const WORK_DIR = /^[A-Za-z]:[\\/](?:[^\\/:*?"<>|]+[\\/]+)*?(?:eov-(?:push|play)-\d+|\.claude[\\/]+worktrees[\\/]+agent-[A-Za-z0-9]+)(?=[\\/]|$)/;
function cmdFolders(cmd) {
  const toks = String(cmd).match(/"[^"]*"|\S+/g) ?? [];
  if (toks.some((t) => /^"?(-e|--eval|-p|--print)"?$/.test(t))) return [];
  const out = new Set();
  for (const t of toks) {
    const m = WORK_DIR.exec(t.replace(/^"|"$/g, '').replace(/^--?[\w-]+=/, ''));
    if (m) out.add(m[0]);
  }
  return [...out];
}
// Günlüğe kısa komut: yollar yalnız dosya adı, adresler atılır (komut satırında gizli anahtarlı adres olabiliyor)
const shortCmd = (cmd) => (String(cmd).match(/"[^"]*"|\S+/g) ?? []).slice(1)
  .map((t) => t.replace(/^"|"$/g, '')).map((t) => (/^[a-z][\w+.-]*:\/\//i.test(t) ? '<adres>' : t.split(/[\\/]/).pop())).join(' ').slice(0, 60);
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const lexists = (p) => { try { lstatSync(p); return true; } catch { return false; } };
const normPath = (p) => String(p).replace(/[\\/]+/g, '\\').toLowerCase();

// Çalışan gönderimin geçici kopyası mı? Kilit bizdeyse (push başı) henüz kopya yok, hepsi artıktır
function pushOwned(inPush) {
  if (inPush || !existsSync(PLOCK)) return () => false;
  let owner = {};
  try { owner = JSON.parse(readFileSync(join(PLOCK, 'owner.json'), 'utf8')); } catch {}
  let since = 0;
  try { since = statSync(PLOCK).mtimeMs; } catch { return () => false; }
  const live = owner.pid ? pidAlive(owner.pid) : Date.now() - since < 40 * 60000;
  if (!live) return () => false;
  return (dir, ts) => (owner.scratch && normPath(owner.scratch) === normPath(dir)) || ts >= since - 60000;
}

// Artık eov-push kopyaları: ÖNCE node_modules bağlantıları (2026-10-18 olayı), doğrulama, sonra worktree. eov-maps ve .claude/worktrees adın dışında kaldığı için hiç seçilmez.
function cleanLeftoverWorktrees(inPush, procs, say) {
  const owned = pushOwned(inPush);
  const registered = git('worktree list --porcelain').split('\n').filter((l) => l.startsWith('worktree ')).map((l) => resolve(l.slice(9).trim()));
  const dirs = new Set(registered.filter((d) => /^eov-push-\d+$/.test(d.split(/[\\/]/).pop())).filter((d) => existsSync(d)));
  for (const n of readdirSync(tmpdir())) if (/^eov-push-\d+$/.test(n)) dirs.add(resolve(tmpdir(), n));
  for (const d of dirs) {
    if (owned(d, Number(d.split('eov-push-').pop()))) { log(`> Çalışan gönderimin kopyası, dokunulmadı: ${d}`); continue; }
    if (procs.some((p) => normPath(p.cmd).includes(normPath(d)))) { log(`> Hâlâ bir süreç kullanıyor, dokunulmadı: ${d}`); continue; }
    const links = [join(d, 'cloudflare', 'node_modules'), join(d, 'node_modules')];
    for (const j of links) if (lexists(j)) { try { ps(`$j='${j}'; (Get-Item -LiteralPath $j -Force).Delete()`); } catch {} }
    if (links.some(lexists)) { say(`!! Bağlantı silinemedi, kopyaya dokunulmadı: ${d}`); continue; }
    try { if (registered.some((r) => normPath(r) === normPath(d))) git(`worktree remove --force ${q_(d)}`); } catch (e) { log(`!! worktree remove: ${firstLine(e)}`); }
    try { rmSync(d, { recursive: true, force: true }); } catch {}
    say(existsSync(d) ? `!! Artık kopya silinemedi: ${d}` : `> Artık kopya silindi: ${d}`);
  }
  git('worktree prune');
}

// Bakım (Ömer 2026-10-30, F2 + F8): komut olarak ve her gönderim başında
function doctor({ inPush = false } = {}) {
  const did = [];
  const say = (s) => { did.push(s); log(s); };
  const lock = clearStaleIndexLock();
  if (lock?.removed) did.push(lock.why);
  else if (lock) log(`> ${lock.why}; dokunulmadı`);

  let info = { procs: [], listen: [] };
  let listed = true;
  try {
    info = psJson(`$p = @(Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='esbuild.exe'" | ForEach-Object { [pscustomobject]@{ id=[int]$_.ProcessId; ppid=[int]$_.ParentProcessId; age=$(if ($_.CreationDate) { [int]((Get-Date)-$_.CreationDate).TotalMinutes } else { 0 }); cmd=[string]$_.CommandLine } })
$l = @(Get-NetTCPConnection -State Listen -LocalPort 5173,5000,5002,5187 -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.OwningProcess })
[pscustomobject]@{ procs=$p; listen=$l } | ConvertTo-Json -Depth 3 -Compress`);
  } catch (e) { listed = false; log(`!! Süreç listesi alınamadı: ${firstLine(e)}; kopya ve süreç temizliği atlandı`); }
  const procs = [].concat(info.procs ?? []);

  if (listed) {
    cleanLeftoverWorktrees(inPush, procs, say);

    // 5173/5000/5002/5187 dinleyenler (ve ebeveyn/çocukları) ne olursa olsun korunur; klasörü duran süreç yalnız listelenir
    const listen = new Set([].concat(info.listen ?? []));
    const keep = new Set(listen);
    for (const p of procs) if (listen.has(p.id)) keep.add(p.ppid);
    const isKept = (p) => keep.has(p.id) || listen.has(p.ppid) || p.id === process.pid || p.id === process.ppid;
    const orphans = [];
    const others = [];
    for (const p of procs) {
      if (isKept(p)) continue;
      const gone = cmdFolders(p.cmd).filter((f) => !existsSync(f));
      if (gone.length) orphans.push({ ...p, gone });
      else if (p.age >= 60) others.push(p);
    }
    for (const p of orphans) {
      try { ps(`Stop-Process -Id ${p.id} -Force -ErrorAction Stop`); say(`> Artık süreç kapatıldı: pid ${p.id} · ${p.age} dk · ${shortCmd(p.cmd)} (klasörü yok: ${p.gone[0]})`); }
      catch (e) { say(`!! Artık süreç kapatılamadı: pid ${p.id} (${firstLine(e)})`); }
    }
    if (others.length) log(`> kontrol edilmedi (${others.length} uzun süreç): ${others.slice(0, 8).map((p) => `pid ${p.id} · ${p.age} dk · ${shortCmd(p.cmd)}`).join(' | ')}`);
  }

  // Git'in yarım bıraktığı geçici nesneler: 1 saatten eskiyse çöp; çalışan git varken dokunulmaz
  const objects = join(GAME, '.git', 'objects');
  const junk = [];
  for (const d of readdirSync(objects)) {
    if (!/^[0-9a-f]{2}$/.test(d)) continue;
    for (const f of readdirSync(join(objects, d))) {
      if (!f.startsWith('tmp_obj_')) continue;
      try { if (Date.now() - statSync(join(objects, d, f)).mtimeMs > 3600000) junk.push(join(objects, d, f)); } catch {}
    }
  }
  if (junk.length && !gitRunning()) { for (const f of junk) rmSync(f, { force: true }); say(`> Yarım git nesnesi silindi: ${junk.length}`); }

  // Eski çıktı dosyaları (3 gün)
  for (const n of readdirSync(tmpdir())) {
    if (!/^eov-out-.*\.txt$/.test(n)) continue;
    try { if (Date.now() - statSync(join(tmpdir(), n)).mtimeMs > 3 * DAY) rmSync(join(tmpdir(), n), { force: true }); } catch {}
  }

  if (!existsSync(join(GAME, 'node_modules', '.bin', 'vitest'))) {
    say('!! UYARI: game/node_modules eksik görünüyor, npm install gerekebilir');
    notice('Bakım sonrası game/node_modules/.bin/vitest bulunamadı; npm install gerekebilir.');
  }
  if (!inPush && !did.length) log('> Temizlenecek bir şey yok.');
  return did;
}

// Gönderim arka planda (Ömer 2026-10-30, F5): sohbet beklemez; --dry ekranda kalır. Çıktı .git içinde, Changes'ta görünmez
function background(name, rest) {
  if (rest.includes('--dry') || rest.includes('--bg')) return false;
  try { if (!existsSync(PLOCK) && statSync(OUT).size > 5 * 1024 * 1024) renameSync(OUT, OUT + '.old'); } catch {}
  appendFileSync(OUT, `\n===== ${new Date().toISOString()} ${name} ${rest.join(' ')}\n`);
  const fd = openSync(OUT, 'a');
  spawn(process.execPath, [SELF, name, ...rest, '--bg'], { cwd: GAME, detached: true, stdio: ['ignore', fd, fd], windowsHide: true }).unref();
  console.log(`Gönderim arka planda başladı. Özet: ${LOG} · tam çıktı: ${OUT}`);
  return true;
}

// Temiz kopyada gönderim (Ömer 2026-10-24): başka sohbetlerin yarım işi testi kırmasın.
// Commit geçici index ile kurulur (gerçek index'e ve diğer sohbetlerin stage'ine dokunulmaz),
// geçici worktree'de tip kontrolü + ön test + tam test + build; yeşilse 5000 yenilenir, push ve main ileri alınır.
async function shipClean(version, groups, files, dry) {
  const undoNotes = version ? addNotes(version, groups) : () => {};
  const all = [...files, 'data/patch-notes.json', 'package.json', 'package-lock.json'];
  const base = git('rev-parse HEAD');
  const tmpIndex = join(GAME, '.git', 'push-queue.index');
  const env = { GIT_INDEX_FILE: tmpIndex };
  const scratch = join(tmpdir(), `eov-push-${Date.now()}`);
  let made = false;
  let pushed = false;
  try {
    git('read-tree HEAD', env);
    // Çok dosyada Windows komut satırı sınırı (~32k) aşılıyordu (2026-10-30, 384 dosya): yollar dosyadan okunur
    const specFile = join(GAME, '.git', 'push-queue.pathspec');
    writeFileSync(specFile, all.join('\n') + '\n');
    git(`add -A --pathspec-from-file=${q_(specFile)}`, env);
    const tree = git('write-tree', env);
    const summary = version ? `${version}: ${Object.values(groups).flat()[0]}` : `Internal: docs/tools update (${files.length} files)`;
    writeFileSync(join(GAME, '.git', 'RELEASE_MSG'), `${summary}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n`);
    const who = { GIT_AUTHOR_NAME: 'Omer', GIT_AUTHOR_EMAIL: 'omerbekinn@gmail.com', GIT_COMMITTER_NAME: 'Omer', GIT_COMMITTER_EMAIL: 'omerbekinn@gmail.com' };
    const sha = git(`commit-tree ${tree} -p ${base} -F ${q_(join(GAME, '.git', 'RELEASE_MSG'))}`, who);

    try { writeFileSync(join(PLOCK, 'owner.json'), JSON.stringify({ pid: process.pid, scratch })); } catch {}
    git(`worktree add --detach ${q_(scratch)} ${sha}`);
    made = true;
    ps(`New-Item -ItemType Junction -Path '${join(scratch, 'node_modules')}' -Target '${join(GAME, 'node_modules')}' | Out-Null`);
    const inScratch = (cmd) => execSync(cmd, { cwd: scratch, stdio: 'inherit' });
    // Kırmızıda hangi dosya, kimin (Ömer 2026-10-30, F3)
    const gate = async (stage, cmd, cmdArgs) => {
      const r = await runTee(cmd, cmdArgs, scratch, stage);
      if (r.code === 0) return;
      const red = redReport(stage, r.out, r.file, files);
      throw Object.assign(new Error(red), { red });
    };
    // Önce tip kontrolü (Ömer 2026-10-24): parça parça gelen dosyalar (bir sohbetin yarısı) en hızlı burada yakalanır
    log('> Temiz kopyada tip kontrolü');
    await gate('tip kontrolü', 'npx tsc --noEmit');
    // Ön test (Ömer 2026-10-30, F4): yalnız değişen dosyalara bağlı testler; kırmızı en hızlı burada görülür
    const related = files.filter((f) => /^(src|tests|data)\//.test(f)).filter((f) => { try { return statSync(join(scratch, f)).isFile(); } catch { return false; } });
    if (!related.length) log('> Ön test atlandı: src/tests/data altında değişen dosya yok');
    else if (related.join(' ').length > 30000) log(`> Ön test atlandı: ${related.length} dosya komut satırına sığmıyor, tam teste geçiliyor`);
    else {
      log(`> Ön test: değişen ${related.length} dosyaya bağlı testler`);
      await gate('ön test', process.execPath, [join('node_modules', 'vitest', 'vitest.mjs'), 'related', '--run', '--passWithNoTests', ...related]);
    }
    // Tam npm test göndermeden önce yerelde (Ömer 2026-10-25): yalnız hızlı testle 0.9.8.4/0.9.8.5 GitHub'a gidip CI'da kırmızı kalmıştı
    log('> Temiz kopyada tam test + build');
    await gate('tam test', 'npm test');
    await gate('build', 'npm run build');
    if (dry) return log('> (deneme) 5000 derlemesi atlandı');
    // 5000 yalnız test + build yeşilse yenilenir (Ömer 2026-10-30, F5): gönderilmeyecek sürüm 5000'de görünmesin
    // Geçici klasöre derlenir, yalnızca başarılıysa play-build ile değişir (0.9.8.4 olayı: kırık build 5000'i boş bırakmıştı)
    log('> 5000: temiz kopyadan play-build derleniyor');
    const out = join(tmpdir(), `eov-play-${Date.now()}`);
    try {
      await gate('5000 derlemesi', `npx vite build --outDir ${q_(out)} --emptyOutDir`);
      const pb = join(ROOT, 'play-build');
      mkdirSync(pb, { recursive: true });
      for (const f of readdirSync(pb)) rmSync(join(pb, f), { recursive: true, force: true });
      cpSync(out, pb, { recursive: true });
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
    await start5000();

    execSync(`git push origin ${sha}:main`, { stdio: 'inherit' });
    pushed = true;
    // update-ref ve index ayrı ayrı (Ömer 2026-10-30, F2): index hatası "main değişmiş" diye yanlış raporlanıyordu
    let moved = false;
    try {
      git(`update-ref -m "push-queue ${version}" refs/heads/main ${sha} ${base}`);
      moved = true;
    } catch (e) {
      const cur = git('rev-parse HEAD');
      const text = `GitHub'a gitti ama yerel main ilerletilemedi: ${cur !== base ? `main bu sırada değişmiş (${cur.slice(0, 7)})` : firstLine(e)}; elle: git merge --ff-only ${sha}`;
      log('!! ' + text);
      notice(text);
    }
    if (moved) syncIndex(all); // yalnız gönderilen yolların index'i yeni HEAD'e eşitlenir
    log(`> Commit ${sha.slice(0, 7)}`);
    // Canlı site (Ömer 2026-10-28: "githuba atarken canlıya da at"): sürümlü her gönderimden sonra aynı temiz kopyadan
    // embersofvaldoria.com'a yayın; Cloudflare zaman aşımına sık düştüğü için bir kez yeniden denenir, olmazsa push geri alınmaz, not bırakılır
    if (version) {
      const cfMods = join(GAME, 'cloudflare', 'node_modules');
      if (existsSync(cfMods)) ps(`New-Item -ItemType Junction -Path '${join(scratch, 'cloudflare', 'node_modules')}' -Target '${cfMods}' | Out-Null`);
      let live = false;
      for (let i = 1; i <= 2 && !live; i++) {
        log(`> Canlı site yayını (deneme ${i}): npm run deploy:cf`);
        try { inScratch('npm run deploy:cf'); live = true; } catch (e) { log(`!! Canlı yayın denemesi ${i} başarısız: ${e.message.split('\n')[0]}`); }
      }
      if (live) log(`> ${version} canlıda: https://embersofvaldoria.com/`);
      else notice(`${version} GitHub'a gitti ama canlı siteye (embersofvaldoria.com) yayın iki denemede de başarısız oldu; elle npm run deploy:cf gerekiyor.`);
    }
    return { sha };
  } catch (err) {
    if (pushed) throw err;
    undoNotes();
    throw Object.assign(new Error('temiz kopyada test/build/push kırmızı, hiçbir şey gönderilmedi (' + (err.red ?? firstLine(err)) + ')'), { red: err.red });
  } finally {
    if (dry) undoNotes();
    rmSync(tmpIndex, { force: true });
    if (made) {
      // Önce node_modules bağlantısı silinir, yoksa worktree silinirken gerçek node_modules boşalır (2026-10-18 olayı)
      try { ps(`$j='${join(scratch, 'cloudflare', 'node_modules')}'; if (Test-Path -LiteralPath $j) { (Get-Item -LiteralPath $j).Delete() }`); } catch {}
      try { ps(`$j='${join(scratch, 'node_modules')}'; if (Test-Path -LiteralPath $j) { (Get-Item -LiteralPath $j).Delete() }`); } catch {}
      if (existsSync(join(scratch, 'node_modules')) || existsSync(join(scratch, 'cloudflare', 'node_modules'))) log(`!! Bağlantı silinemedi, worktree yerinde bırakıldı: ${scratch}`);
      else { try { git(`worktree remove --force ${q_(scratch)}`); } catch {} git('worktree prune'); }
      if (!existsSync(join(GAME, 'node_modules', '.bin', 'vitest'))) log('!! UYARI: game/node_modules eksik görünüyor, npm install gerekebilir');
    }
  }
}

const [cmd, ...args] = process.argv.slice(2);
const main = {
  'hook-prompt': hookPrompt,
  'hook-edit': hookEdit,
  'hook-bash-pre': hookBashPre,
  'hook-bash-post': hookBashPost,
  'pages-check': () => pagesCheck(args[0], args[1]),
  status,
  mode: () => withQueue((q) => {
    const mode = MODES[args.slice(1).join('').toLowerCase().replace(/[ -]/g, '')];
    if (!mode) throw new Error('mod: kritik | eşlik | gün sonu');
    const sidM = findSid(q, args[0]);
    entry(q, sidM).mode = mode;
    rememberMode(q, sidM, mode);
    console.log(`${args[0]} artık ${mode}.`);
  }),
  add: () => withQueue((q) => {
    const e = entry(q, findSid(q, args[0]));
    for (const f of args.slice(1)) { const rel = relative(GAME, resolve(f)).replace(/\\/g, '/'); if (!rel.startsWith('..') && !SKIP(rel) && !e.files.includes(rel)) e.files.push(rel); }
    e.updated = Date.now();
    console.log(`${e.files.length} dosya kuyrukta.`);
  }),
  ready: () => withQueue((q) => {
    const { notes } = parseNotes(args.slice(1));
    const internal = args.includes('--internal');
    if (!hasNotes(notes) && !internal) throw new Error('en az bir satır: --fixes "..." (oyuncuya görünmeyen iş için --internal)');
    const e = entry(q, findSid(q, args[0]));
    e.ready = true; delete e.lastError;
    if (internal && !hasNotes(notes)) e.internal = true; else delete e.internal;
    mergeNotes(e.notes, notes);
    console.log(`Hazır (${e.mode}, ${e.files.length} dosya). ${e.mode === 'gün sonu' ? 'Gece 03:00 görevinde gider.' : 'İlk kritik gönderimle ya da gece 03:00 görevinde gider.'}`);
  }),
  drop: () => withQueue((q) => { delete q.sessions[findSid(q, args[0])]; console.log('Silindi.'); }),
  doctor: () => { doctor(); },
  push: async () => process.exit(background('push', args) ? 0 : await push(args[0], args.slice(1))),
  eod: async () => process.exit(background('eod', args) ? 0 : await push('eod', args)),
}[cmd];
if (!main) { console.error('Komut: status | mode | add | ready | push | eod | doctor | drop'); process.exit(1); }
try { await main(); } catch (e) {
  console.error(e.message);
  if (cmd === 'push' || cmd === 'eod') try { appendFileSync(LOG, `[${new Date().toISOString()}] !! Gönderim süreci beklenmedik hatayla bitti: ${firstLine(e)}\n`); } catch {}
  process.exit(1);
}
