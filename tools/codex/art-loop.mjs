#!/usr/bin/env node
// Terra çizer / Sol kontrol eder döngüsü (genel araç). Betik yalnız sırayı yürütür, karar vermez: geçti/kaldı Sol'un yazdığıdır.
// Terra (gpt-6.1-terra) çizer ve NOTES.md'ye not alır; Sol (gpt-6.1-sol, reasoning high, read-only) kontrol eder.
// İkisi AYRI süreçtir: Sol, Terra'nın sandbox'ı içinden açılamaz (Windows os error 5).
// Kullanım: node tools/codex/art-loop.mjs <is.json> [--dry-run] [--resume] [--threshold 8]
// İş dosyası biçimi ve örnek: docs/arch/codex-art-loop.md. Ücretli API yok; yalnız tools/codex/run.mjs.
import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_THRESHOLD = 8;
export const DEFAULT_ROUNDS = 4;
const HERE = dirname(fileURLToPath(import.meta.url));
const IMG = /\.(png|jpe?g|webp)$/i;

/** İş dosyasını doğrular; hata metinleri dizisi döner (boş = geçerli). `exists` yalnız dosya varlığı için; verilmezse yol denetlenmez. */
export function validateJob(job, exists) {
  const errs = [];
  const str = (v) => typeof v === 'string' && v.trim() !== '';
  if (!job || typeof job !== 'object') return ['iş dosyası bir nesne olmalı'];
  if (!str(job.name)) errs.push('name boş');
  if (!str(job.outDir)) errs.push('outDir boş');
  if (job.rules !== undefined && !str(job.rules)) errs.push('rules metin ya da yol olmalı');
  if (job.threshold !== undefined && !(Number.isFinite(job.threshold) && job.threshold >= 1 && job.threshold <= 10)) errs.push('threshold 1-10 arası olmalı');
  if (!Array.isArray(job.pages) || job.pages.length === 0) errs.push('pages boş');
  const ids = new Set();
  for (const [i, p] of (Array.isArray(job.pages) ? job.pages : []).entries()) {
    const at = `pages[${i}]`;
    if (!p || typeof p !== 'object') { errs.push(`${at} nesne değil`); continue; }
    if (!str(p.id) || !/^[A-Za-z0-9._-]+$/.test(p.id)) errs.push(`${at}.id yalnız harf/rakam/._- olmalı`);
    else if (ids.has(p.id)) errs.push(`${at}.id yinelenmiş: ${p.id}`);
    else ids.add(p.id);
    if (!str(p.task)) errs.push(`${at}.task boş`);
    if (!str(p.checkRules)) errs.push(`${at}.checkRules boş`);
    for (const key of ['refs', 'checkRefs']) {
      if (p[key] !== undefined && (!Array.isArray(p[key]) || p[key].some((r) => !str(r)))) errs.push(`${at}.${key} yol dizisi olmalı`);
      else if (exists) for (const r of p[key] ?? []) if (!exists(r)) errs.push(`${at}.${key}: dosya yok: ${r}`);
    }
    if (p.maxRounds !== undefined && !(Number.isInteger(p.maxRounds) && p.maxRounds >= 1 && p.maxRounds <= 10)) errs.push(`${at}.maxRounds 1-10 tam sayı olmalı`);
    if (p.file !== undefined && !str(p.file)) errs.push(`${at}.file boş`);
  }
  const f = job.finalCheck;
  if (f !== undefined) {
    if (!f || typeof f !== 'object') errs.push('finalCheck nesne olmalı');
    else {
      if (!str(f.task)) errs.push('finalCheck.task boş');
      if (!str(f.checkRules)) errs.push('finalCheck.checkRules boş');
      if (!Array.isArray(f.outputs) || f.outputs.length === 0) errs.push('finalCheck.outputs boş (Terra yazacağı dosyalar, outDir göreli)');
      if (f.maxRounds !== undefined && !(Number.isInteger(f.maxRounds) && f.maxRounds >= 1 && f.maxRounds <= 10)) errs.push('finalCheck.maxRounds 1-10 tam sayı olmalı');
    }
  }
  return errs;
}

/** Sol kararını ayrıştırır. İlk satır GECTI/KALDI (Türkçe yazımlar dahil), ikinci satır PUAN: n. Geçer: ilk satır GECTI ya da puan >= eşik. */
export function parseVerdict(body, threshold = DEFAULT_THRESHOLD) {
  const text = String(body ?? '').trim();
  const first = text.split('\n')[0].toUpperCase().replace(/İ/g, 'I').replace(/Ç/g, 'C').replace(/Ğ/g, 'G');
  const m = text.match(/PUAN:\s*(\d+(?:[.,]\d+)?)/i);
  const score = m ? Number(m[1].replace(',', '.')) : 0;
  const said = first.includes('GECTI') ? 'GECTI' : first.includes('KALDI') ? 'KALDI' : null;
  if (!said) return { valid: false, pass: false, score, said: null, body: text };
  return { valid: true, pass: said === 'GECTI' || score >= threshold, score, said, body: text };
}

/** En iyi tur: geçen ilk tur; yoksa en yüksek puan (eşitlikte sonraki tur). rounds: [{round, score, pass, file}] */
export function pickBest(rounds) {
  const passed = rounds.find((r) => r.pass);
  if (passed) return passed;
  let best = null;
  for (const r of rounds) if (!best || r.score >= best.score) best = r;
  return best;
}

export function terraArgs(root, codexHome, refs) {
  return ['-m', 'gpt-6.1-terra', '-C', root, '-s', 'workspace-write', '--add-dir', codexHome, '-', ...refs.flatMap((f) => ['-i', f])];
}
export function solArgs(outDir, images, outFile) {
  return ['-m', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=high', '-C', outDir, '-s', 'read-only', '-', ...images.flatMap((f) => ['-i', f]), '-o', outFile];
}

function toAbs(root, p) { return isAbsolute(p) ? p : resolve(root, p); }

/** İş dosyasından yürütme planı (Codex çağırmaz). `chainPrevious` (iş ya da sayfa düzeyinde): önceki sayfanın geçen turu referans olur. */
export function buildPlan(job, root) {
  const outDir = toAbs(root, job.outDir);
  const threshold = job.threshold ?? DEFAULT_THRESHOLD;
  const pages = job.pages.map((p, i) => {
    const chain = p.chainPrevious ?? job.chainPrevious ?? false;
    return {
      id: p.id,
      file: join(outDir, p.file ?? `${p.id}.png`),
      maxRounds: p.maxRounds ?? job.maxRounds ?? DEFAULT_ROUNDS,
      refs: (p.refs ?? []).map((r) => toAbs(root, r)),
      checkRefs: (p.checkRefs ?? p.refs ?? []).map((r) => toAbs(root, r)),
      chainFrom: chain && i > 0 ? job.pages[i - 1].id : null,
    };
  });
  return { name: job.name, outDir, rel: relative(root, outDir).replace(/\\/g, '/'), threshold, pages, finalCheck: job.finalCheck ?? null };
}

function readRules(root, rules) {
  if (!rules) return '';
  const abs = toAbs(root, rules);
  if (!rules.includes('\n') && existsSync(abs)) return readFileSync(abs, 'utf8');
  return rules;
}

function main() {
  const argv = process.argv.slice(2);
  const ti = argv.indexOf('--threshold');
  const jobPath = argv.find((a, i) => !a.startsWith('--') && (ti < 0 || i !== ti + 1));
  const dry = argv.includes('--dry-run');
  const resume = argv.includes('--resume');
  if (!jobPath) { console.error('Kullanım: node tools/codex/art-loop.mjs <is.json> [--dry-run] [--resume] [--threshold 8]'); process.exit(2); }
  const job = JSON.parse(readFileSync(jobPath, 'utf8').replace(/^﻿/, ''));
  const root = resolve(job.root ?? process.cwd());
  if (ti >= 0) job.threshold = Number(argv[ti + 1]);
  const errs = validateJob(job, dry ? undefined : (r) => existsSync(toAbs(root, r)));
  if (errs.length) { console.error(`İş dosyası geçersiz:\n- ${errs.join('\n- ')}`); process.exit(2); }
  const plan = buildPlan(job, root);
  const rules = readRules(root, job.rules);

  if (dry) {
    console.log(`İŞ: ${plan.name}  (kök ${root})\nÇıktı: ${plan.outDir}\nEşik: puan >= ${plan.threshold}`);
    for (const p of plan.pages) {
      console.log(`- ${p.id}: en çok ${p.maxRounds} tur; dosya ${p.file}; ref ${p.refs.length}; Sol'a ${p.checkRefs.length + 1} görsel${p.chainFrom ? `; ${p.chainFrom} sayfasının geçen turu ref olarak verilir` : ''}`);
      console.log(`    Terra: ${terraArgs(root, '<CODEX_HOME>', p.refs).join(' ')}`);
      console.log(`    Sol:   ${solArgs(plan.outDir, [p.file, ...p.checkRefs], `${plan.outDir}/checks/${p.id}-<n>.md`).join(' ')}`);
    }
    if (plan.finalCheck) console.log(`- finalCheck: en çok ${plan.finalCheck.maxRounds ?? DEFAULT_ROUNDS} tur; çıktılar ${plan.finalCheck.outputs.join(', ')}`);
    console.log('(dry-run: Codex çağrılmadı, dosya yazılmadı)');
    return;
  }

  const CODEX_HOME = join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.codex');
  const LOG = join(plan.outDir, 'art-loop.log');
  const NOTES = join(plan.outDir, 'NOTES.md');
  const results = {};
  const save = () => writeFileSync(join(plan.outDir, 'sonuc.json'), JSON.stringify(results, null, 2));
  mkdirSync(join(plan.outDir, 'checks'), { recursive: true });
  mkdirSync(join(plan.outDir, 'turlar'), { recursive: true });
  const log = (s) => appendFileSync(LOG, `\n=== ${new Date().toISOString()} ${s}\n`);
  const codex = (args, input) => {
    const r = spawnSync(process.execPath, [join(HERE, 'run.mjs'), 'exec', '--skip-git-repo-check', '--color', 'never', ...args], { cwd: root, input, encoding: 'utf8', maxBuffer: 1 << 28 });
    appendFileSync(LOG, `${r.stdout ?? ''}\n${r.stderr ?? ''}\n`);
    return r.status;
  };
  const stop = (why) => {
    log(`DUR: ${why}`);
    appendFileSync(NOTES, `\n\nDURDU: ${why}\n`);
    results.durdu = why;
    save();
    console.log(`DUR: ${why}`);
    process.exit(1);
  };
  const terra = (task, refs) => {
    const code = codex(terraArgs(root, CODEX_HOME, refs),
      `Sen Terra 6.1'sin: çizer ve not tutarsın. Geçip geçmediğine sen karar vermezsin, bunu sonra Sol verir. İnsana soru sorma.\n\n${rules}\n\n## Görev\n${task}\n\n## Sınırlar\nYalnız ${plan.rel}/ altına yaz; ~/.codex/generated_images/ yalnız kopyalamak için okunur. Bu klasör dışında hiçbir dosya değişmez, git yazma komutu yok. Görselde yalnız yerleşik üretim aracı; ücretli API ya da image_gen.py yok. Kota ya da izin engeli çıkarsa aşmaya çalışma, NOTES.md'ye yazıp bitir. Metin dosyalarını UTF-8 yaz, Türkçe harfler bozulmasın. Her iş sonunda ${plan.rel}/NOTES.md dosyasına ekle: dosya, tur, kullandığın istem, ne değiştirdin.`);
    if (code !== 0) stop(`Terra çıkış kodu ${code} (kota ya da izin engeli olabilir, ayrıntı art-loop.log)`);
  };
  const sol = (id, round, text, images, checkRules, extra = '') => {
    const out = join(plan.outDir, 'checks', `${id}-${round}.md`);
    const code = codex(solArgs(plan.outDir, images, out),
      `Sen Sol 6.1'sin: kontrol edip karar verirsin. Dosya değiştirme.\n\n${rules}\n\n${text}\n\nKESİN KURALLAR, biri bile bozuksa KALDI:\n${checkRules}\n${extra}\nİlk satıra yalnız GECTI ya da KALDI yaz. İkinci satıra PUAN: <1-10> yaz. KALDI ise altına çizere verilecek somut düzeltmeleri, yalnız kesin kurallar için yaz.`);
    if (code !== 0 || !existsSync(out)) stop(`Sol çıkış kodu ${code}, karar dosyası ${existsSync(out) ? 'var' : 'yok'}`);
    const v = parseVerdict(readFileSync(out, 'utf8'), plan.threshold);
    if (!v.valid) stop(`Sol'un ilk satırı karar değil: ${v.body.split('\n')[0].slice(0, 80)}`);
    return v;
  };

  const passedFiles = {};
  for (const [i, page] of plan.pages.entries()) {
    const src = job.pages[i];
    const rounds = [];
    let fix = '';
    let best = null;
    for (let round = 1; round <= page.maxRounds; round++) {
      const kept = join(plan.outDir, 'turlar', `${page.id}-${round}.png`);
      const check = join(plan.outDir, 'checks', `${page.id}-${round}.md`);
      let v;
      if (resume && existsSync(kept) && existsSync(check)) {
        v = parseVerdict(readFileSync(check, 'utf8'), plan.threshold);
        if (!v.valid) stop(`${page.id} tur ${round}: eski karar dosyası okunamadı`);
        log(`Devam: ${page.id} tur ${round} hazır, atlandı`);
      } else {
        if (!(resume && existsSync(kept))) {
          log(`Terra çiziyor: ${page.id} tur ${round}`);
          const chain = page.chainFrom && passedFiles[page.chainFrom] ? [passedFiles[page.chainFrom]] : [];
          const task = best
            ? `${page.file} dosyasını, verilen en iyi turu temel alarak düzelt ve kaydet. Yalnız aşağıdaki kusurları değiştir, geri kalanı koru. Tur ${round}.\nGörev: ${src.task}\nSol'un düzeltmeleri:\n${fix}`
            : `${src.task}\nÇıktıyı ${page.file} olarak kaydet. Tur ${round}.`;
          terra(task, [...page.refs, ...chain, ...(best ? [best.file] : [])]);
          if (!existsSync(page.file)) stop(`Terra ${page.file} üretmedi`);
          copyFileSync(page.file, kept);
        }
        log(`Sol kontrol ediyor: ${page.id} tur ${round}`);
        v = sol(page.id, round, `Görseller sırayla: 1. kontrol edilen sayfa (${page.id}), sonrakiler referans ya da şablon. Her hücreye tek tek bak.`, [kept, ...page.checkRefs], src.checkRules);
      }
      log(`Sol: ${page.id} tur ${round} ${v.pass ? 'GECTI' : 'KALDI'} puan ${v.score}`);
      rounds.push({ round, score: v.score, pass: v.pass, file: kept });
      if (!best || v.score >= best.score) { best = { file: kept, score: v.score, round }; fix = v.body; }
      if (v.pass) break;
    }
    const pick = pickBest(rounds);
    copyFileSync(pick.file, page.file);
    if (pick.pass) passedFiles[page.id] = page.file;
    results[page.id] = { rounds: rounds.length, pass: !!pick.pass, bestRound: pick.round, score: pick.score };
    save();
  }

  const fc = job.finalCheck;
  if (fc) {
    const max = fc.maxRounds ?? DEFAULT_ROUNDS;
    const outs = fc.outputs.map((o) => toAbs(plan.outDir, o));
    const pageImgs = plan.pages.map((p) => p.file);
    let fix = '';
    let last = null;
    for (let round = 1; round <= max; round++) {
      const check = join(plan.outDir, 'checks', `final-${round}.md`);
      let v;
      if (resume && existsSync(check)) v = parseVerdict(readFileSync(check, 'utf8'), plan.threshold);
      else {
        log(`Terra çiziyor: final tur ${round}`);
        terra(`${fc.task}\nTur ${round}.${fix ? `\nSol'un düzeltmeleri:\n${fix}` : ''}`, [...(fc.refs ?? []).map((r) => toAbs(root, r)), ...pageImgs]);
        const missing = outs.filter((o) => !existsSync(o));
        if (missing.length) stop(`Terra final çıktısı üretmedi: ${missing.join(', ')}`);
        const texts = outs.filter((o) => !IMG.test(o)).map((o) => `\n--- ${o}\n${readFileSync(o, 'utf8')}`).join('\n');
        v = sol('final', round, fc.checkText ?? 'Görseller sırayla sayfalar, sonra son çıktı görselleri; metin çıktıları aşağıda.', [...pageImgs, ...outs.filter((o) => IMG.test(o))], fc.checkRules, texts);
      }
      last = { rounds: round, pass: v.pass, score: v.score };
      log(`Sol: final tur ${round} ${v.pass ? 'GECTI' : 'KALDI'} puan ${v.score}`);
      if (v.pass) break;
      fix = v.body;
    }
    results.finalCheck = last;
  }
  save();
  console.log(JSON.stringify(results));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
