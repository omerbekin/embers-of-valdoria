#!/usr/bin/env node
// Skill ağacı içe aktarma (docs/design/skill-tree-implementation.md bölüm 2.1): mockup seçiminden data/skill-trees/<class>.json üretir.
// Kaynak: public/mockups/skill-tree-moments/ > final.js (Ömer'in satır satır karma seçimi), mix/<class>.js (karma A / B düğümleri),
// alts.js (satır için yeni öneriler C / D / E), variants/<class>.js (satır ve ult skill id'leri / adları). Dosyalar Node `vm` ile sahte
// `window` içinde okunur (tarayıcı betikleri).
// Kural (content.js > fromSelection / altOf ile aynı): satır r'nin düğümleri final.rows[r] karmasından ('a' = mixes[0], 'b' = mixes[1]);
// harf 'c' / 'd' / 'e' ise SMM_ALT[class][r] listesinde id'si o harf olan önerinin nodes'undan (yalnızca satır 0-3; ult önerisi yok).
// Mastery adı + bar pasif satırının karmasından (pasif satırı öneriyse content.js gibi karma A'dan).
// Var olan class dosyası korunur: `fx` ve `approved` alanları anahtar bazında aynen kalır (içe aktarım metni yeniler, motor verisine dokunmaz);
// metin değiştiyse uyarı yazar. İçe aktarımdan sonra KAYNAK JSON'dur; mockup yalnızca referans.
// Kullanım: node tools/tree-import.mjs <class> [<class> ...] [--check]   (--check: yazmaz, mockup ile farkı raporlar; fark varsa çıkış kodu 1)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOCK = path.join(ROOT, 'public/mockups/skill-tree-moments');
const OUT = path.join(ROOT, 'data/skill-trees');
const ROW_IDS = ['f1', 'f2', 'f3', 'n0', 'r', 'ea', 'eb', 'ma', 'fa', 'fb', 'mb', 'v'];
const ULT_IDS = ['u1', 'u2', 'u3', 'r1', 'r2', 'r3', 'd1', 'd2', 'd3', 'l1', 'l2', 'l3'];
const KEYS = [...[0, 1, 2, 3].flatMap((i) => ROW_IDS.map((id) => `${i}.${id}`)), ...ULT_IDS.map((id) => `4.${id}`)];
const BAR_AT = JSON.parse(fs.readFileSync(path.join(OUT, '_rules.json'), 'utf8')).barAt;

const args = process.argv.slice(2);
const check = args.includes('--check');
const classes = args.filter((a) => !a.startsWith('--'));
if (!classes.length) {
  console.error('Usage: node tools/tree-import.mjs <class> [<class> ...] [--check]');
  process.exit(2);
}

function load(cls) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of ['final.js', 'alts.js', `mix/${cls}.js`, `variants/${cls}.js`]) {
    const file = path.join(MOCK, f);
    if (f === 'alts.js' && !fs.existsSync(file)) continue; // öneri dosyası yoksa yalnızca a / b satırları içe aktarılabilir
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: f });
  }
  const F = ctx.window.SMM_FINAL?.[cls];
  const M = ctx.window.SMM_MIX?.[cls];
  const V = ctx.window.SMM_VARIANTS?.[cls];
  const A = ctx.window.SMM_ALT?.[cls];
  if (!F) throw new Error(`${cls}: no entry in final.js`);
  // Seçimi bitmemiş class (final.js > try: Ömer bir satırın alts.js önerilerinden henüz seçmedi) içe aktarılmaz
  if (F.try && Object.keys(F.try).length)
    throw new Error(`${cls}: final.js still has "try" (rows ${Object.keys(F.try).join(', ')} wait for a pick among alts.js proposals); import after Ömer picks`);
  if (!Array.isArray(F.rows) || F.rows.length !== 5 || F.rows.some((l) => l !== 'a' && l !== 'b' && !isAltL(l)))
    throw new Error(`${cls}: final.rows must be 5 x 'a' | 'b' (or 'c' | 'd' | 'e' = alts.js proposal)`);
  F.rows.forEach((l, r) => {
    if (!isAltL(l)) return;
    if (r === 4) throw new Error(`${cls}: ult row cannot use a proposal ("${l}"); alts.js has rows 0-3 only`);
    if (!altOf(A, r, l)) throw new Error(`${cls}: row ${r} uses proposal "${l}" but alts.js has no SMM_ALT.${cls}[${r}] entry with id "${l}"`);
  });
  if (!M || !Array.isArray(M.mixes) || M.mixes.length < 2) throw new Error(`${cls}: mix file needs 2 karma trees`);
  if (!V || !Array.isArray(V.rows) || V.rows.length !== 4 || !V.ult) throw new Error(`${cls}: variants file needs rows[4] + ult`);
  return { F, M, V, A };
}

const isAltL = (l) => l === 'c' || l === 'd' || l === 'e';
/** content.js > altOf: satır r için id'si l olan öneri (nodes taşımalı). */
const altOf = (A, r, l) => (A && Array.isArray(A[r]) ? A[r].find((x) => x && x.id === l && x.nodes) : null) || null;
const mixIdx = (l) => (l === 'b' ? 1 : 0);
const letter = (l) => (isAltL(l) ? l.toUpperCase() : l === 'b' ? 'B' : 'A');

/** Mockup seçimi -> class dosyası (fx'siz, approved'sız ham hâl). */
function build(cls) {
  const { F, M, V, A } = load(cls);
  const nodes = {};
  for (const key of KEYS) {
    const r = Number(key.split('.')[0]);
    const l = F.rows[r];
    const m = isAltL(l) ? altOf(A, r, l) : M.mixes[mixIdx(l)]; // öneri de { syn, nodes } taşır
    const e = m.nodes[key];
    if (!Array.isArray(e) || typeof e[0] !== 'string' || !e[0] || typeof e[1] !== 'string' || !e[1])
      throw new Error(`${cls}: ${isAltL(l) ? 'proposal' : 'karma'} ${letter(l)} has no node ${key}`);
    const syn = m.syn && typeof m.syn[key] === 'string' && m.syn[key] ? m.syn[key] : undefined;
    nodes[key] = {
      name: e[0],
      text: e[1],
      src: `${letter(l)}:${typeof e[3] === 'string' ? e[3] : ''}`,
      ...(syn ? { syn } : {}),
      ...(e[2] === true ? { new: true, approved: false } : {}),
      fx: null,
    };
  }
  const pl = isAltL(F.rows[0]) ? 'a' : F.rows[0]; // Mastery + bar: önerilerde yok, content.js gibi karma A
  const pm = M.mixes[mixIdx(pl)];
  const bar = (Array.isArray(pm.bar) ? pm.bar : []).map((b, i) => ({ at: BAR_AT[i], name: b[0], text: b[1], src: `${letter(pl)}:${b[2] ?? ''}`, fx: null }));
  if (bar.length !== BAR_AT.length) throw new Error(`${cls}: Mastery bar needs ${BAR_AT.length} bonuses (has ${bar.length})`);
  return {
    class: cls,
    version: 1,
    picked: { rows: [...F.rows], at: F.at ?? '' },
    rows: V.rows.map((row, i) => ({ skill: row.skill, name: row.name, ...(row.passive ? { passive: true } : {}), karma: letter(F.rows[i]) })),
    ult: { skill: V.ult.skill, name: V.ult.name, karma: letter(F.rows[4]) },
    mastery: { name: pm.mastery, karma: letter(pl), bar },
    nodes,
  };
}

/** Var olan dosyanın motor alanlarını (fx, approved) yeni içe aktarıma taşır; metin farklarını döndürür. */
function merge(fresh, old) {
  const diffs = [];
  if (!old) return { out: fresh, diffs };
  if (old.version !== undefined) fresh.version = old.version;
  const keep = (nw, od, label) => {
    if (!od) return;
    if (od.fx !== undefined) nw.fx = od.fx;
    if (nw.new && od.approved !== undefined) nw.approved = od.approved;
    for (const f of ['name', 'text']) if (od[f] !== nw[f]) diffs.push(`${label}.${f}: "${od[f]}" -> "${nw[f]}"`);
  };
  for (const key of KEYS) keep(fresh.nodes[key], old.nodes?.[key], key);
  fresh.mastery.bar.forEach((b, i) => keep(b, old.mastery?.bar?.[i], `bar[${i}]`));
  if (old.mastery?.name !== fresh.mastery.name) diffs.push(`mastery.name: "${old.mastery?.name}" -> "${fresh.mastery.name}"`);
  if (JSON.stringify(old.picked?.rows) !== JSON.stringify(fresh.picked.rows)) diffs.push(`picked.rows: ${JSON.stringify(old.picked?.rows)} -> ${JSON.stringify(fresh.picked.rows)}`);
  return { out: fresh, diffs };
}

let failed = false;
for (const cls of classes) {
  const file = path.join(OUT, `${cls}.json`);
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  let fresh;
  try {
    fresh = build(cls);
  } catch (e) {
    console.error(`skipped ${e.message}`);
    failed = true;
    continue;
  }
  const { out, diffs } = merge(fresh, old);
  const text = JSON.stringify(out, null, 2) + '\n';
  if (check) {
    if (!old) {
      console.log(`${cls}: no data file yet (${path.relative(ROOT, file)})`);
      failed = true;
    } else if (diffs.length) {
      console.log(`${cls}: ${diffs.length} difference(s) from the mockup:`);
      for (const d of diffs) console.log(`  ${d}`);
      failed = true;
    } else console.log(`${cls}: matches the mockup`);
    continue;
  }
  if (diffs.length) {
    console.warn(`${cls}: text changed for ${diffs.length} entr${diffs.length === 1 ? 'y' : 'ies'} (fx kept; check that each fx still matches its text):`);
    for (const d of diffs) console.warn(`  ${d}`);
  }
  fs.writeFileSync(file, text);
  const fxCount = Object.values(out.nodes).filter((n) => n.fx).length;
  console.log(`${cls}: wrote ${path.relative(ROOT, file)} (${KEYS.length} nodes, ${fxCount} with fx, ${Object.values(out.nodes).filter((n) => n.new).length} NEW)`);
}
if (failed) process.exit(1);
