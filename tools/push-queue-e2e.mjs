#!/usr/bin/env node
// Gönderim kuyruğu faz 2 uçtan uca testi (Ömer 2026-10-31): geçici depo + geçici bare origin; gerçek repo, gerçek test/build/deploy ÇALIŞMAZ.
// Kullanım: node tools/push-queue-e2e.mjs [senaryo-adı-parçası]   Çıkış kodu 0 = hepsi geçti.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = join(dirname(fileURLToPath(import.meta.url)), 'push-queue.mjs');
const BASE = mkdtempSync(join(tmpdir(), 'eov-e2e-'));
const ID = ['-c', 'user.name=T', '-c', 'user.email=t@t'];
const OLD = 'aaaaaaaa-legacy-session';
const A = 'bbbbbbbb-new-chat-a';
const B = 'cccccccc-new-chat-b';
const C = 'dddddddd-new-chat-c';
const CRLF = (s) => s.replace(/\r?\n/g, '\r\n');
const SHARED = Array.from({ length: 14 }, (_, i) => `line ${i + 1}`).join('\n') + '\n';

const FAKE_TEST = `
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const W = process.env.EOV_W;
appendFileSync(W + '/count-test', 'x');
const hook = W + '/on-test.mjs';
if (existsSync(hook)) { const u = W + '/on-test-run.mjs'; writeFileSync(u, readFileSync(hook)); rmSync(hook); spawnSync(process.execPath, [u], { stdio: 'inherit' }); }
let red = null;
for (const f of readdirSync('tests')) if (readFileSync('tests/' + f, 'utf8').includes('RED')) red = 'tests/' + f;
for (const f of readdirSync('src')) if (readFileSync('src/' + f, 'utf8').includes('REDSRC')) red = 'tests/t.test.ts';
if (red) { console.log(' FAIL  |fast| ' + red + ' > boom'); process.exit(1); }
console.log('yesil');
`;
const FAKE_GIT = `
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
const a = process.argv.slice(2);
const W = process.env.EOV_W;
if (a[0] === 'push') {
  const n = existsSync(W + '/count-push') ? readFileSync(W + '/count-push', 'utf8').length : 0;
  appendFileSync(W + '/count-push', 'x');
  if (n < Number(process.env.EOV_E2E_NETFAIL)) { console.error("fatal: unable to access 'https://x/': Could not resolve host: github.com"); process.exit(128); }
}
const r = spawnSync('git', a, { stdio: 'inherit' });
process.exit(r.status ?? 1);
`;

let worldNo = 0;
function world() {
  const w = join(BASE, `w${++worldNo}`);
  const game = join(w, 'outer', 'game');
  mkdirSync(join(w, 'sessions'), { recursive: true });
  mkdirSync(join(w, 'tmp'), { recursive: true });
  mkdirSync(join(w, 'outer', '.claude'), { recursive: true });
  mkdirSync(game, { recursive: true });
  writeFileSync(join(w, 'sessions', `${OLD}.jsonl`), '');
  writeFileSync(join(w, 'fake-test.mjs'), FAKE_TEST);
  writeFileSync(join(w, 'fake-git.mjs'), FAKE_GIT);
  writeFileSync(join(w, 'outer', '.claude', 'launch.json'), CRLF(JSON.stringify({ version: '0.0.1', configurations: [{ name: 'dev', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 5173 }] }, null, 2) + '\n'));
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(w, 'origin.git')]);
  const g = (...a) => execFileSync('git', [...ID, ...a], { cwd: game, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  g('init', '-q', '-b', 'main');
  g('config', 'core.autocrlf', 'true');
  g('remote', 'add', 'origin', join(w, 'origin.git'));
  const put = (f, s) => { mkdirSync(dirname(join(game, f)), { recursive: true }); writeFileSync(join(game, f), CRLF(s)); };
  put('.gitignore', 'node_modules/\ndist/\n');
  put('.gitattributes', 'docs/design/open-questions.md merge=union\n');
  put('data/patch-notes.json', '{\n  "releases": [\n    {\n      "version": "0.9.0.1",\n      "date": "2026-10-01",\n      "groups": []\n    }\n  ]\n}\n');
  put('package.json', '{\n  "name": "t",\n  "version": "0.9.0"\n}\n');
  put('package-lock.json', '{\n  "name": "t",\n  "version": "0.9.0"\n}\n');
  put('src/a.ts', 'export const a = 1;\n');
  put('src/b.ts', 'export const b = 1;\n');
  put('src/shared.ts', SHARED);
  put('tests/t.test.ts', 'ok\n');
  put('docs/design/open-questions.md', '# Sorular\n\n## 458. Son madde\n- not\n');
  mkdirSync(join(game, 'node_modules', '.bin'), { recursive: true });
  writeFileSync(join(game, 'node_modules', '.bin', 'vitest'), '');
  writeFileSync(join(game, '.git', 'info', 'exclude'), '.claude/worktrees/\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'ilk');
  g('push', '-q', '-u', 'origin', 'main');
  const env = {
    ...process.env, EOV_GAME: game, EOV_ROOT: join(w, 'outer'), EOV_SESSIONS_DIR: join(w, 'sessions'), EOV_E2E: '1', EOV_W: w, TEMP: join(w, 'tmp'), TMP: join(w, 'tmp'),
    EOV_CMD_TSC: 'node -e 0', EOV_CMD_TEST: `node "${join(w, 'fake-test.mjs')}"`, EOV_CMD_BUILD: 'node -e 0', EOV_CMD_DEPLOY: 'node -e 0', EOV_CMD_NPMCI: 'node -e 0',
    EOV_NET_WAITS: '0,0,0', EOV_LOCK_POLL_MS: '200', EOV_GIT_WRAP: '', GIT_AUTHOR_NAME: undefined,
  };
  delete env.EOV_GIT_WRAP;
  const run = (args, input, extra = {}) => {
    const r = spawnSync(process.execPath, [TOOL, ...args], { env: { ...env, ...extra }, input: input ?? '', encoding: 'utf8', windowsHide: true });
    return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
  };
  const W = {
    w, game, env, g, run, put,
    hook: (name, payload, raw) => { const r = run([name], raw ?? JSON.stringify(payload)); return r; },
    q: () => JSON.parse(readFileSync(join(game, '.git', 'push-queue.json'), 'utf8')),
    log: () => { try { return readFileSync(join(game, '.git', 'push-queue.log'), 'utf8'); } catch { return ''; } },
    origin: (f) => { try { return execFileSync('git', ['--git-dir', join(w, 'origin.git'), 'show', `main:${f}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n'); } catch { return null; } },
    originSha: () => execFileSync('git', ['--git-dir', join(w, 'origin.git'), 'rev-parse', 'main'], { encoding: 'utf8' }).trim(),
    tests: () => { try { return readFileSync(join(w, 'count-test'), 'utf8').length; } catch { return 0; } },
    cutover: () => { const r = run(['cutover']); if (r.code) throw new Error('cutover: ' + r.out); },
    open: (sid, name) => { const r = run(['wt-open', sid, name]); if (r.code) throw new Error('wt-open: ' + r.out); return W.q().worktrees[sid.slice(0, 8)]; },
    wg: (rec, ...a) => execFileSync('git', [...ID, ...a], { cwd: rec.path, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(),
    wput: (rec, f, s) => { mkdirSync(dirname(join(rec.path, f)), { recursive: true }); writeFileSync(join(rec.path, f), CRLF(s)); },
    ready: (sid, line = 'a line') => { const r = run(['ready', sid.slice(0, 8), '--fixes', line]); if (r.code) throw new Error('ready: ' + r.out); return r; },
    push: (sid, extra = {}) => run(['push', sid.slice(0, 8), '--bg'], undefined, extra),
    upstream: (f, s) => {
      const c = join(w, `up${Date.now()}`);
      execFileSync('git', ['clone', '-q', join(w, 'origin.git'), c]);
      mkdirSync(dirname(join(c, f)), { recursive: true });
      writeFileSync(join(c, f), s);
      execFileSync('git', [...ID, 'add', '-A'], { cwd: c });
      execFileSync('git', [...ID, 'commit', '-q', '-m', 'upstream'], { cwd: c });
      execFileSync('git', ['push', '-q', 'origin', 'main'], { cwd: c });
    },
    notices: () => JSON.stringify(W.q().notices ?? []) + JSON.stringify(W.q().chatNotices ?? {}),
  };
  return W;
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const has = (s, part, m) => ok(String(s).includes(part), `${m ?? 'içermiyor'}: "${part}" yok\n--- ${String(s).slice(-1500)}`);
const hasNot = (s, part, m) => ok(!String(s).includes(part), `${m ?? 'içeriyor'}: "${part}"\n--- ${String(s).slice(-1500)}`);
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const deny = (r) => ok(r.out.includes('"permissionDecision":"deny"'), `deny bekleniyordu: ${r.out}`);
const allow = (r) => ok(r.code === 0 && !r.out.trim(), `izin bekleniyordu: ${r.code} ${r.out}`);
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

const S = {
  'cutover oncesi degismez': (W) => {
    allow(W.hook('hook-edit-pre', { session_id: A, tool_input: { file_path: join(W.game, 'src/a.ts') } }));
    const p = W.hook('hook-prompt', { session_id: A, prompt: 'selam' });
    has(p.out, 'Kendin GitHub');
    hasNot(p.out, 'wt-open');
    ok(W.run(['wt-open', A, 'x']).code !== 0, 'wt-open reddedilmeli');
    W.put('src/a.ts', 'export const a = 2;\n');
    W.hook('hook-edit', { session_id: A, tool_input: { file_path: join(W.game, 'src/a.ts') } });
    W.ready(A);
    W.push(A);
    has(W.origin('src/a.ts'), 'a = 2');
    has(W.origin('data/patch-notes.json'), '0.9.0.2');
    ok(W.g('rev-parse', 'HEAD') === W.originSha(), 'yerel main ilerlemeli');
    ok(!W.g('status', '--porcelain'), 'çalışma kopyası temiz olmalı');
    ok(W.tests() === 1, 'tek test');
  },
  'wt-open + guard + bash uyarisi + fail-open': (W) => {
    W.cutover();
    const r = W.open(A, 'küçük İş');
    ok(r.port >= 5174 && ![5187].includes(r.port), 'port');
    ok(r.branch === 'chat/kucuk-is', 'ad: ' + r.branch);
    ok(existsSync(join(r.path, 'src/a.ts')), 'kopya');
    ok(W.wg(r, 'rev-parse', 'HEAD') === W.originSha(), 'taban origin/main');
    const launch = JSON.parse(readFileSync(join(W.w, 'outer/.claude/launch.json'), 'utf8'));
    ok(launch.configurations.some((c) => c.name === 'dev'), 'diğer girdi durmalı');
    const le = launch.configurations.find((c) => c.name === 'chat-kucuk-is');
    ok(le && le.port === r.port && le.runtimeArgs.includes('--strictPort'), 'launch girdisi');
    has(readFileSync(join(W.w, 'outer/.claude/launch.json'), 'utf8'), '\r\n', 'CRLF korunmalı');
    const r2 = W.open(B, 'iki');
    ok(r2.port !== r.port, 'farklı port');
    const pre = (sid, p) => W.hook('hook-edit-pre', { session_id: sid, tool_input: { file_path: p } });
    deny(pre(A, join(W.game, 'src/a.ts')));
    deny(pre(C, join(W.game, 'src/a.ts')));
    has(pre(C, join(W.game, 'src/a.ts')).out, 'wt-open');
    deny(pre(A, join(r2.path, 'src/a.ts')));
    allow(pre(A, join(r.path, 'src/a.ts')));
    allow(pre(A, join(r.path, 'src/a.ts').toUpperCase()));
    allow(pre(A, join(W.game, '.claude/worktrees/agent-x/src/a.ts')));
    allow(pre(A, join(W.w, 'outer', 'notes.md')));
    deny(W.hook('hook-edit-pre', { session_id: A, tool_input: { notebook_path: join(W.game, 'n.ipynb') } }));
    has(W.hook('hook-edit', { session_id: A, tool_input: { file_path: join(W.game, 'src/a.ts') } }).out, '"decision":"block"');
    ok(!W.q().sessions[A]?.files?.length, 'takip yok');
    const p = W.hook('hook-prompt', { session_id: A, prompt: 'x' });
    has(p.out, r.path); has(p.out, String(r.port)); has(p.out, 'Kurallar');
    hasNot(W.hook('hook-prompt', { session_id: A, prompt: 'y' }).out, 'Kurallar', 'ikinci istemde kısa');
    has(W.hook('hook-prompt', { session_id: C, prompt: 'x' }).out, 'wt-open');
    // Bash: yeni sohbet uyarılır, takip edilmez
    const b = { session_id: A, tool_use_id: 't1' };
    W.hook('hook-bash-pre', b);
    W.put('src/b.ts', 'export const b = 9;\n');
    has(W.hook('hook-bash-post', b).out, 'UYARI');
    ok(!W.q().sessions[A].files.length, 'bash takibi yok');
    W.g('checkout', '--', 'src/b.ts');
    // Her türlü iç hata: engel yok
    allow(W.hook('hook-edit-pre', null, 'bu json değil'));
    const qf = join(W.game, '.git', 'push-queue.json');
    const keep = readFileSync(qf);
    writeFileSync(qf, '{bozuk');
    for (const h of ['hook-edit-pre', 'hook-edit', 'hook-prompt', 'hook-bash-pre', 'hook-bash-post']) ok(W.hook(h, { session_id: A, tool_use_id: 't2', tool_input: { file_path: join(W.game, 'src/a.ts') }, prompt: 'x' }).code === 0, `${h} açık kalmalı`);
    writeFileSync(qf, keep);
  },
  'eski akis etkilenmez, ayni gonderimde dal ile': (W) => {
    W.cutover();
    allow(W.hook('hook-edit-pre', { session_id: OLD, tool_input: { file_path: join(W.game, 'src/a.ts') } }));
    has(W.hook('hook-prompt', { session_id: OLD, prompt: 'x' }).out, 'Kendin GitHub');
    ok(W.run(['wt-open', OLD, 'x']).code !== 0, 'eski akış wt açamaz');
    W.put('src/a.ts', 'export const a = 5;\n');
    W.put('src/b.ts', 'export const b = 7;\n'); // bu dosya başka bir yarım iş, sahipsiz
    W.hook('hook-edit', { session_id: OLD, tool_input: { file_path: join(W.game, 'src/a.ts') } });
    ok(W.q().sessions[OLD].files.includes('src/a.ts'), 'eski akış takip edilir');
    W.ready(OLD);
    const r = W.open(A, 'a');
    W.wput(r, 'src/new.ts', 'export const n = 1;\n');
    W.ready(A);
    W.push(A);
    has(W.origin('src/a.ts'), 'a = 5');
    has(W.origin('src/new.ts'), 'n = 1');
    has(W.origin('src/b.ts'), 'b = 1');
    has(read(join(W.game, 'src/b.ts')), 'b = 7', 'yarım iş durmalı');
    has(read(join(W.game, 'src/new.ts')), 'n = 1', 'main checkout yeni dosyayı almalı');
    ok(W.g('rev-parse', 'HEAD') === W.originSha(), 'main ilerlemeli');
    const st = W.g('status', '--porcelain');
    has(st, 'src/b.ts'); hasNot(st, 'src/a.ts', 'gönderilen dosya temiz');
    ok(!W.q().sessions[OLD], 'eski akış girdisi silinir');
  },
  'ready autocommit + assets/source gitmez': (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    W.wput(r, 'src/n.ts', 'x\n');
    W.wput(r, 'assets/source/raw.txt', 'ham\n');
    W.ready(A);
    has(W.wg(r, 'show', '--name-only', '--format=', 'HEAD'), 'src/n.ts');
    hasNot(W.wg(r, 'show', '--name-only', '--format=', 'HEAD'), 'assets/source');
    has(W.wg(r, 'status', '--porcelain', '-uall'), 'assets/source/raw.txt');
    ok(W.q().sessions[A.slice(0, 8)]?.ready || W.q().sessions[A]?.ready, 'hazır');
  },
  'iki dal birlikte gider': (W) => {
    W.cutover();
    const a = W.open(A, 'a');
    const b = W.open(B, 'b');
    W.hook('hook-prompt', { session_id: A, prompt: 'x' });
    W.hook('hook-prompt', { session_id: B, prompt: 'x' });
    W.wput(a, 'src/a.ts', 'export const a = 3;\n');
    W.wput(b, 'src/b.ts', 'export const b = 3;\n');
    W.ready(A, 'line A');
    W.ready(B, 'line B');
    W.push(A);
    has(W.origin('src/a.ts'), 'a = 3'); has(W.origin('src/b.ts'), 'b = 3');
    const notes = W.origin('data/patch-notes.json');
    has(notes, '0.9.0.2'); has(notes, 'line A'); has(notes, 'line B');
    has(read(join(W.game, 'src/a.ts')), 'a = 3'); has(read(join(W.game, 'src/b.ts')), 'b = 3');
    ok(W.g('rev-parse', 'HEAD') === W.originSha(), 'main');
    ok(!W.g('status', '--porcelain'), 'main temiz');
    for (const r of [a, b]) ok(W.wg(r, 'rev-parse', 'HEAD') === W.originSha(), 'dal taşındı');
    ok(W.q().worktrees.bbbbbbbb && W.q().sessions[A].ready === false, 'kayıt durur, hazır sıfırlanır');
    ok(W.tests() === 1, 'tek test');
  },
  'cakisan dal duser digeri gider': (W) => {
    W.cutover();
    const a = W.open(A, 'a'); const b = W.open(B, 'b'); const c = W.open(C, 'c');
    for (const s of [A, B, C]) W.hook('hook-prompt', { session_id: s, prompt: 'x' });
    W.wput(a, 'src/shared.ts', SHARED.replace('line 3', 'line 3 A'));
    W.wput(b, 'src/shared.ts', SHARED.replace('line 3', 'line 3 B'));
    W.wput(c, 'src/c.ts', 'c\n');
    for (const s of [A, B, C]) W.ready(s);
    W.push(A);
    has(W.origin('src/shared.ts'), 'line 3 A'); has(W.origin('src/c.ts'), 'c');
    hasNot(W.origin('src/shared.ts'), 'line 3 B');
    has(W.wg(b, 'show', 'HEAD:src/shared.ts'), 'line 3 B', 'B işi dalda durur');
    ok(W.q().sessions[B].ready === false, 'B hazır değil');
    has(W.q().chatNotices.cccccccc.join(), 'src/shared.ts');
    const p = W.hook('hook-prompt', { session_id: B, prompt: 'x' });
    has(p.out, 'BU SOHBETE RAPOR'); has(p.out, 'src/shared.ts');
  },
  'kirmizi dal duser kalan yeniden test': (W) => {
    W.cutover();
    const a = W.open(A, 'a'); const b = W.open(B, 'b');
    for (const s of [A, B]) W.hook('hook-prompt', { session_id: s, prompt: 'x' });
    W.wput(a, 'tests/kir.test.ts', 'RED\n');
    W.wput(b, 'src/b.ts', 'export const b = 3;\n');
    W.ready(A); W.ready(B);
    W.push(B);
    ok(W.tests() === 2, 'iki test: ' + W.tests());
    ok(W.origin('tests/kir.test.ts') === null, 'A gitmez');
    has(W.origin('src/b.ts'), 'b = 3');
    has(W.q().chatNotices.bbbbbbbb.join(), 'tests/kir.test.ts');
    ok(W.q().sessions[A].ready === false, 'A hazır değil');
  },
  'kirmizi sahibi belirsiz: hic gitmez': (W) => {
    W.cutover();
    const a = W.open(A, 'a'); const b = W.open(B, 'b');
    for (const s of [A, B]) W.hook('hook-prompt', { session_id: s, prompt: 'x' });
    W.wput(a, 'src/a.ts', 'export const a = 3;\n');
    W.wput(b, 'src/b.ts', '// REDSRC\n');
    W.ready(A); W.ready(B);
    const before = W.originSha();
    W.push(A);
    ok(W.originSha() === before, 'hiçbir şey gitmemeli');
    ok(W.tests() === 1, 'tekrar test yok');
    has(W.notices(), 'DURDU'); has(W.notices(), 'tests/t.test.ts');
    ok(W.q().sessions[A].ready && W.q().sessions[B].ready, 'hazır kalır');
  },
  'eski akis dosyasi upstreamde degisti: girdi durur': (W) => {
    W.cutover();
    W.put('src/a.ts', 'export const a = 100;\n');
    W.hook('hook-edit', { session_id: OLD, tool_input: { file_path: join(W.game, 'src/a.ts') } });
    W.ready(OLD);
    W.upstream('src/a.ts', 'export const a = 200;\n');
    const r = W.open(A, 'a');
    W.wput(r, 'src/n.ts', 'n\n');
    W.ready(A);
    W.push(A);
    has(W.origin('src/a.ts'), 'a = 200', 'yeni iş ezilmez');
    has(W.origin('src/n.ts'), 'n');
    has(read(join(W.game, 'src/a.ts')), 'a = 100', 'eski akış dosyası yerinde');
    has(W.q().chatNotices.aaaaaaaa.join(), 'src/a.ts');
    ok(W.q().sessions[OLD].ready === false, 'durdu');
    // Elle birleştirip legacy-merged sonrası gidebilir
    W.put('src/a.ts', 'export const a = 300;\n');
    ok(W.run(['legacy-merged', OLD.slice(0, 8), 'src/a.ts']).code === 0, 'legacy-merged');
    W.ready(OLD);
    W.push(OLD);
    has(W.origin('src/a.ts'), 'a = 300');
  },
  'ff yarim is ustune yazmaz, sonra yetisir': (W) => {
    W.cutover();
    W.put('src/shared.ts', SHARED.replace('line 3', 'line 3 half'));
    W.hook('hook-edit', { session_id: OLD, tool_input: { file_path: join(W.game, 'src/shared.ts') } });
    const L = W.g('rev-parse', 'HEAD');
    const r = W.open(A, 'a');
    W.wput(r, 'src/shared.ts', SHARED.replace('line 9', 'line 9 A'));
    W.ready(A);
    W.push(A);
    has(W.origin('src/shared.ts'), 'line 9 A');
    ok(W.g('rev-parse', 'HEAD') === L, 'main geride kalmalı');
    has(read(join(W.game, 'src/shared.ts')), 'line 3 half', 'yarım iş durur');
    has(W.notices(), 'src/shared.ts'); has(W.notices(), 'geride');
    // Yarım iş geri alındı: sıradaki gönderimde yetişir
    W.g('checkout', '--', 'src/shared.ts');
    W.run(['drop', OLD.slice(0, 8)]);
    W.wput(r, 'src/n.ts', 'n\n');
    W.ready(A);
    W.push(A);
    ok(W.g('rev-parse', 'HEAD') === W.originSha(), 'main yetişti');
    has(read(join(W.game, 'src/shared.ts')), 'line 9 A');
    ok(!W.q().mainBlocked, 'blok kalktı');
  },
  'tasinan dal yeni isi korur': (W) => {
    W.cutover();
    const a = W.open(A, 'a'); const b = W.open(B, 'b');
    for (const s of [A, B]) W.hook('hook-prompt', { session_id: s, prompt: 'x' });
    W.wput(a, 'src/a.ts', 'export const a = 3;\n');
    W.wput(b, 'src/shared.ts', SHARED.replace('line 1\n', 'line 1 B\n'));
    W.ready(A); W.ready(B);
    // ready sonrası commit'lenmemiş iş: aynı dosyanın başka satırı + ayrı dosya
    W.wput(a, 'src/shared.ts', SHARED.replace('line 12', 'line 12 A wip'));
    W.wput(a, 'u.txt', 'wip\n');
    // Test sırasında A dalına yeni commit de gelir
    writeFileSync(join(W.w, 'on-test.mjs'), `import { writeFileSync } from 'node:fs'; import { execFileSync } from 'node:child_process';
const d = ${JSON.stringify(a.path)}; writeFileSync(d + '/later.ts', 'later\\n');
execFileSync('git', ['-c','user.name=T','-c','user.email=t@t','add','later.ts'], { cwd: d });
execFileSync('git', ['-c','user.name=T','-c','user.email=t@t','commit','-q','-m','later'], { cwd: d });`);
    W.run(['eod', '--bg']);
    const sha = W.originSha();
    ok(W.origin('later.ts') === null, 'yeni commit gönderilmez');
    has(W.origin('src/shared.ts'), 'line 1 B'); hasNot(W.origin('src/shared.ts'), 'wip');
    ok(W.wg(a, 'rev-parse', 'HEAD~1') === sha, 'yeni commit gönderimin üstünde');
    ok(existsSync(join(a.path, 'later.ts')), 'later durur');
    const shared = readFileSync(join(a.path, 'src/shared.ts'), 'utf8');
    has(shared, 'line 1 B', 'diğer sohbetin satırı geldi'); has(shared, 'line 12 A wip', 'yarım iş durur'); has(shared, '\r\n', 'CRLF');
    has(read(join(a.path, 'u.txt')), 'wip');
    const st = W.wg(a, 'status', '--porcelain');
    has(st, 'src/shared.ts'); has(st, 'u.txt');
    ok(W.wg(b, 'rev-parse', 'HEAD') === sha, 'B taşındı');
  },
  'olu sahip kilidi hemen alinir': (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    W.wput(r, 'src/n.ts', 'n\n');
    W.ready(A);
    const dead = spawnSync(process.execPath, ['-e', '0']).pid;
    mkdirSync(join(W.game, '.git', 'push-queue.push.lock'));
    writeFileSync(join(W.game, '.git', 'push-queue.push.lock', 'owner.json'), JSON.stringify({ pid: dead }));
    W.push(A);
    has(W.origin('src/n.ts'), 'n');
    has(W.log(), 'ölmüş');
  },
  'canli sahip kilidi beklenir': async (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    W.wput(r, 'src/n.ts', 'n\n');
    W.ready(A);
    const holder = spawn(process.execPath, ['-e', 'setTimeout(()=>{},120000)'], { stdio: 'ignore' });
    const lock = join(W.game, '.git', 'push-queue.push.lock');
    mkdirSync(lock);
    writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: holder.pid }));
    const pusher = spawn(process.execPath, [TOOL, 'push', 'bbbbbbbb', '--bg'], { env: W.env, stdio: 'ignore' });
    const done = new Promise((res) => pusher.on('close', res));
    await sleepMs(4000);
    ok(W.origin('src/n.ts') === null, 'beklemeli');
    has(W.log(), 'bekleniyor');
    ok(existsSync(lock), 'kilit durmalı');
    holder.kill();
    await done;
    has(W.origin('src/n.ts'), 'n');
  },
  'ag hatasi retry test tekrar yok': (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    W.wput(r, 'src/n.ts', 'n\n');
    W.ready(A);
    W.push(A, { EOV_GIT_WRAP: join(W.w, 'fake-git.mjs'), EOV_E2E_NETFAIL: '2' });
    has(W.origin('src/n.ts'), 'n');
    ok(W.tests() === 1, 'tek test: ' + W.tests());
    has(W.log(), 'ağ hatası'); hasNot(W.log(), 'kırmızı');
  },
  'ag tamamen yok: dogru mesaj, is bekler': (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    W.wput(r, 'src/n.ts', 'n\n');
    W.ready(A);
    W.push(A, { EOV_GIT_WRAP: join(W.w, 'fake-git.mjs'), EOV_E2E_NETFAIL: '99' });
    ok(W.origin('src/n.ts') === null, 'gitmez');
    ok(W.tests() === 1, 'tek test');
    has(W.notices(), 'Testler yeşildi'); hasNot(W.notices(), 'kırmızı'); hasNot(W.log(), 'kırmızı');
    ok(W.q().sessions[A.slice(0, 8)]?.ready ?? W.q().sessions[A]?.ready, 'hazır kalır');
  },
  'eski akista ag hatasi da dogru': (W) => {
    W.put('src/a.ts', 'export const a = 2;\n');
    W.hook('hook-edit', { session_id: A, tool_input: { file_path: join(W.game, 'src/a.ts') } });
    W.ready(A);
    W.push(A, { EOV_GIT_WRAP: join(W.w, 'fake-git.mjs'), EOV_E2E_NETFAIL: '99' });
    ok(W.origin('src/a.ts').includes('a = 1'), 'gitmez');
    has(W.notices(), 'Testler yeşildi'); hasNot(W.notices(), 'kırmızı');
    ok(W.tests() === 1, 'tek test');
    hasNot(read(join(W.game, 'data/patch-notes.json')), '0.9.0.2', 'not geri alındı');
  },
  'non-ff yeniden birlestir ve test': (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    W.wput(r, 'src/n.ts', 'n\n');
    W.ready(A);
    const up = JSON.stringify(join(W.w, 'mover'));
    writeFileSync(join(W.w, 'on-test.mjs'), `import { execFileSync } from 'node:child_process'; import { writeFileSync } from 'node:fs';
const o = ${JSON.stringify(join(W.w, 'origin.git'))}; const c = ${up};
execFileSync('git', ['clone','-q',o,c]); writeFileSync(c + '/up.txt', 'up\\n');
execFileSync('git', ['-c','user.name=T','-c','user.email=t@t','add','-A'], { cwd: c });
execFileSync('git', ['-c','user.name=T','-c','user.email=t@t','commit','-q','-m','up'], { cwd: c });
execFileSync('git', ['push','-q','origin','main'], { cwd: c });`);
    W.push(A);
    ok(W.tests() === 2, 'iki test: ' + W.tests());
    has(W.origin('src/n.ts'), 'n'); has(W.origin('up.txt'), 'up');
    has(W.log(), 'yeniden birleştirilip'); hasNot(W.log(), 'kırmızı');
    ok(W.g('rev-parse', 'HEAD') === W.originSha(), 'main');
  },
  'Q-NEW numaralanir, union birlestirir': (W) => {
    W.cutover();
    const a = W.open(A, 'a'); const b = W.open(B, 'b');
    for (const s of [A, B]) W.hook('hook-prompt', { session_id: s, prompt: 'x' });
    const base = '# Sorular\n\n## 458. Son madde\n- not\n';
    W.wput(a, 'docs/design/open-questions.md', base + '\n## Q-NEW. A sorusu\n- a\n');
    W.wput(b, 'docs/design/open-questions.md', base + '\n## Q-NEW. B sorusu\n- b\n');
    W.ready(A); W.ready(B);
    W.push(A);
    const f = W.origin('docs/design/open-questions.md');
    hasNot(f, 'Q-NEW'); has(f, 'A sorusu'); has(f, 'B sorusu');
    has(f, '## 459.'); has(f, '## 460.');
    has(read(join(a.path, 'docs/design/open-questions.md')), '## 459.', 'kopya güncel');
  },
  'wt-close gonderilmemis isi reddeder, baglantiyi izlemez': (W) => {
    W.cutover();
    const a = W.open(A, 'a');
    W.hook('hook-prompt', { session_id: A, prompt: 'x' });
    W.wput(a, 'src/n.ts', 'n\n');
    let r = W.run(['wt-close', 'bbbbbbbb']);
    ok(r.code !== 0, 'kirli reddedilir'); has(r.out, 'src/n.ts');
    W.wg(a, 'add', '-A'); W.wg(a, 'commit', '-q', '-m', 'x');
    r = W.run(['wt-close', 'bbbbbbbb']);
    ok(r.code !== 0, 'gönderilmemiş reddedilir'); has(r.out, 'gönderilmemiş');
    W.ready(A);
    W.push(A);
    has(W.origin('src/n.ts'), 'n');
    const keep = join(W.w, 'sentinel');
    mkdirSync(keep);
    writeFileSync(join(keep, 'canli.txt'), 'dokunma');
    mkdirSync(join(a.path, 'node_modules'), { recursive: true });
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', `New-Item -ItemType Junction -Path '${join(a.path, 'node_modules', 'bag')}' -Target '${keep}' | Out-Null`]);
    r = W.run(['wt-close', 'bbbbbbbb']);
    ok(r.code === 0, 'kapanmalı: ' + r.out);
    ok(existsSync(join(keep, 'canli.txt')), 'bağlantı hedefi durmalı');
    ok(!existsSync(a.path), 'kopya silindi');
    ok(!W.g('branch', '--list', 'chat/a'), 'dal silindi');
    ok(!W.q().worktrees.bbbbbbbb, 'kayıt silindi');
    hasNot(readFileSync(join(W.w, 'outer/.claude/launch.json'), 'utf8'), 'chat-a', 'launch girdisi silindi');
    const again = W.open(A, 'a2');
    ok(again.port === a.port, 'port geri geldi');
  },
  'eod hazir dallari alir': (W) => {
    W.cutover();
    const a = W.open(A, 'a'); const b = W.open(B, 'b'); const c = W.open(C, 'c');
    W.hook('hook-prompt', { session_id: A, prompt: '[gün sonu] x' });
    W.hook('hook-prompt', { session_id: B, prompt: 'x' });
    W.hook('hook-prompt', { session_id: C, prompt: 'x' });
    W.wput(a, 'src/a.ts', 'export const a = 3;\n');
    W.wput(b, 'src/b.ts', 'export const b = 3;\n');
    W.wput(c, 'src/c.ts', 'yarim\n');
    W.ready(A); W.ready(B);
    W.run(['eod', '--bg']);
    has(W.origin('src/a.ts'), 'a = 3'); has(W.origin('src/b.ts'), 'b = 3');
    ok(W.origin('src/c.ts') === null, 'hazır olmayan gitmez');
    has(W.notices(), 'Gece 03:00');
    ok(existsSync(join(c.path, 'src/c.ts')), 'C işi durur');
  },
  'kopyadaki arac asil kopyaya yonlenir': (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    for (const d of [W.game, r.path]) { mkdirSync(join(d, 'tools'), { recursive: true }); writeFileSync(join(d, 'tools', 'push-queue.mjs'), readFileSync(TOOL)); }
    const env = { ...W.env };
    delete env.EOV_GAME; delete env.EOV_ROOT;
    const x = spawnSync(process.execPath, [join(r.path, 'tools', 'push-queue.mjs'), 'status'], { env, encoding: 'utf8', windowsHide: true });
    has(x.stdout, 'chat/a', 'asıl kuyruğu okumalı');
  },
  'deneme iz birakmaz + ic is surum almaz': (W) => {
    W.cutover();
    const r = W.open(A, 'a');
    W.hook('hook-prompt', { session_id: A, prompt: 'x' });
    W.wput(r, 'docs/n.md', 'n\n');
    ok(W.run(['ready', 'bbbbbbbb', '--internal']).code === 0, 'ready');
    const before = W.originSha();
    W.run(['push', 'bbbbbbbb', '--dry']);
    ok(W.originSha() === before, 'deneme göndermez');
    ok(W.q().sessions[A].ready, 'hazır kalır');
    W.push(A);
    has(W.origin('docs/n.md'), 'n');
    hasNot(W.origin('data/patch-notes.json'), '0.9.0.2', 'iç iş sürüm almaz');
    ok(W.wg(r, 'rev-parse', 'HEAD') === W.originSha(), 'dal taşındı');
  },
  'sessiz sohbet kaydi dusmez + temiz kopya yetisir': (W) => {
    W.cutover();
    const a = W.open(A, 'a'); const b = W.open(B, 'b'); const c = W.open(C, 'c');
    for (const s of [A, B, C]) W.hook('hook-prompt', { session_id: s, prompt: 'x' });
    const qf = join(W.game, '.git', 'push-queue.json');
    const q = W.q();
    q.sessions[B].updated = 1; q.sessions[B].seen = 1;
    writeFileSync(qf, JSON.stringify(q));
    W.wput(a, 'src/a.ts', 'export const a = 3;\n');
    W.wput(c, 'u.txt', 'kirli\n');
    W.ready(A);
    W.push(A);
    const sha = W.originSha();
    ok(W.q().sessions[B] && W.q().worktrees.cccccccc, 'kayıt durur');
    ok(W.wg(b, 'rev-parse', 'HEAD') !== sha, 'henüz yetişmedi');
    W.hook('hook-prompt', { session_id: B, prompt: 'x' });
    ok(W.wg(b, 'rev-parse', 'HEAD') === sha, 'temiz kopya yetişti');
    has(read(join(b.path, 'src/a.ts')), 'a = 3');
    W.hook('hook-prompt', { session_id: C, prompt: 'x' });
    ok(W.wg(c, 'rev-parse', 'HEAD') !== sha, 'kirli kopya yerinde');
  },
};

const only = process.argv[2];
let fail = 0;
for (const [name, fn] of Object.entries(S)) {
  if (only && !name.includes(only)) continue;
  const t0 = Date.now();
  try {
    await fn(world());
    console.log(`GECTI  ${name} (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
  } catch (e) {
    fail++;
    console.log(`KALDI  ${name}\n       ${String(e.message).split('\n').slice(0, 30).join('\n       ')}`);
    try { appendFileSync(join(BASE, 'fails.txt'), `${name}\n${e.stack}\n\n`); } catch {}
  }
}
console.log(fail ? `${fail} senaryo kaldı. Geçici klasör: ${BASE}` : 'Hepsi geçti.');
if (!fail) { try { rmSync(BASE, { recursive: true, force: true }); } catch {} }
process.exit(fail ? 1 : 0);
