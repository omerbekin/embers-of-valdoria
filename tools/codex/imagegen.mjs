#!/usr/bin/env node
// Codex (ChatGPT aboneliği) ile görsel üretimi. Ücretli API KULLANMAZ.
//
// Tek görsel:
//   node tools/codex/imagegen.mjs --out <png yolu> --prompt "<konu, stil, kurallar>" [-i ref.png ...]
//   node tools/codex/imagegen.mjs --out <png yolu> --prompt-file istem.txt [-i ref.png ...]
// Toplu (liste JSON: [{ "out": "...", "prompt": "...", "refs": ["..."] }, ...]):
//   node tools/codex/imagegen.mjs --list liste.json [--parallel 2]
//
// - Hedef dosya zaten varsa atlanır (yarıda kalan koşu kaldığı yerden sürer).
// - Her işin günlüğü <out>.codex.log dosyasına yazılır.
// - Codex sandbox'ı görseli hedefe kopyalayamazsa betik ~/.codex/generated_images/<oturum>/
//   altındaki en yeni PNG'yi kendisi alır.
// - En fazla 2 paralel iş (fazlasında ChatGPT işleri sıraya alıyor, görsel başına 8-15 dk).
// Ayrıntı: docs/arch/codex-imagegen.md
import { spawn } from 'node:child_process';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RUN = join(dirname(fileURLToPath(import.meta.url)), 'run.mjs');
const MAX_PARALLEL = 2;

function buildPrompt(subject, out) {
  return [
    'Tek görevin: yerleşik görsel üretme aracınla (imagegen) TEK bir görsel üretmek ve ham PNG olarak kaydetmek.',
    'Kod yazma, betik yazma, başka dosyaya dokunma. Ücretli API, API anahtarı ya da image_gen.py gibi bir betik KULLANMA.',
    '',
    subject.trim(),
    '',
    `Üretince görseli şu yola kopyala: ${out}`,
    'Son mesajında yalnız dosya yolunu yaz.',
  ].join('\n');
}

function newestPng(dir) {
  if (!existsSync(dir)) return null;
  const pngs = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return pngs[0] ?? null;
}

function runJob({ out, prompt, refs = [] }) {
  out = resolve(out);
  if (existsSync(out)) {
    console.log(`atlandı (var): ${out}`);
    return Promise.resolve(true);
  }
  const dir = dirname(out);
  mkdirSync(dir, { recursive: true });
  const logPath = `${out}.codex.log`;
  const log = createWriteStream(logPath);
  const args = [
    RUN, 'exec', '-C', dir, '--skip-git-repo-check', '-s', 'workspace-write', '--color', 'never',
    '-c', 'model_reasoning_effort="low"', '-o', `${out}.last.txt`,
    ...refs.flatMap((r) => ['-i', resolve(r)]), '-',
  ];
  const t0 = Date.now();
  console.log(`başladı: ${out}`);
  return new Promise((res) => {
    const child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let text = '';
    const sink = (d) => { text += d; log.write(d); };
    child.stdout.on('data', sink);
    child.stderr.on('data', sink);
    child.stdin.end(buildPrompt(prompt, out));
    child.on('exit', (code) => {
      log.end();
      const sec = Math.round((Date.now() - t0) / 1000);
      if (!existsSync(out)) {
        const sid = text.match(/session id:\s*([0-9a-f-]+)/i)?.[1];
        const src = sid && newestPng(join(homedir(), '.codex', 'generated_images', sid));
        if (src) copyFileSync(src, out);
      }
      const ok = existsSync(out);
      console.log(`${ok ? 'tamam' : 'HATA'} (${sec} sn, codex çıkış ${code}): ${out}${ok ? '' : ` — günlük: ${logPath}`}`);
      res(ok);
    });
  });
}

async function runList(jobs, parallel) {
  const queue = [...jobs];
  let failed = 0;
  const worker = async () => {
    while (queue.length) if (!(await runJob(queue.shift()))) failed++;
  };
  await Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, worker));
  return failed;
}

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const refs = argv.flatMap((a, i) => (a === '-i' ? [argv[i + 1]] : []));

let failed;
if (opt('--list')) {
  const parallel = Math.min(MAX_PARALLEL, Math.max(1, Number(opt('--parallel') ?? MAX_PARALLEL)));
  failed = await runList(JSON.parse(readFileSync(opt('--list'), 'utf8')), parallel);
} else if (opt('--out') && (opt('--prompt') || opt('--prompt-file'))) {
  const prompt = opt('--prompt') ?? readFileSync(opt('--prompt-file'), 'utf8');
  failed = (await runJob({ out: opt('--out'), prompt, refs })) ? 0 : 1;
} else {
  console.error('Kullanım: --out <png> (--prompt "<metin>" | --prompt-file <txt>) [-i ref.png ...]  ya da  --list <json> [--parallel 1|2]');
  process.exit(2);
}
process.exit(failed ? 1 : 0);
