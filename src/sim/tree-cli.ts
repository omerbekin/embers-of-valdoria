// Skill ağacı simi raporu (Türkçe; Faz 6, docs/design/skill-tree-implementation.md 9.2a / 9.2). src/sim/cli.ts --tree / --level / --side
// bayraklarıyla buraya gelir. Çekirdek src/sim/tree-sim.ts; build ön ayarları src/sim/tree-presets.json.
// Kullanım: npm run sim -- <savaş> <seed[,seed2]> --tree <preset|a|b|off> --level <N[,N2,...]> [--side party|both] [--only=cls1,cls2]
//   [--parts] [--rows=1,2] [--ult=u|r|d|l|none] [--out=dosya.json]
//   Her level için aynı seed'lerle ağaçsız referans + ön ayarın yön(ler)i koşulur; --parts ek olarak evolve / ult kolu / Mastery bar kapalı
//   varyantları koşar (katkı = tam - kapalı). Ham sonuç JSON dosyasına (--out; yoksa işletim sisteminin geçici klasörü) yazılır, yolu en sonda basılır.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { content } from '../engine';
import { TREE_RULES, type TreeDir } from '../progression/skill-tree-data';
import { balance, skillCategory } from './simulate';
import { TREE_PRESETS, resolveBuild, runVariant, type BuildSpec, type PresetDef, type VariantOut } from './tree-sim';

const VALUE_FLAGS = new Set(['tree', 'level', 'side', 'only', 'rows', 'ult', 'out']);

/** Bayrakları ayrıştırır: `--ad=değer`, `--ad değer` (VALUE_FLAGS) ya da `--ad` (true). Kalanlar sıralı argüman. */
export function parseTreeArgs(argv: readonly string[]): { pos: string[]; flags: Record<string, string> } {
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) {
      pos.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
    else if (VALUE_FLAGS.has(a.slice(2)) && i + 1 < argv.length && !argv[i + 1]!.startsWith('--')) flags[a.slice(2)] = argv[++i]!;
    else flags[a.slice(2)] = 'true';
  }
  return { pos, flags };
}

/** cli.ts bu bayraklardan biri varsa ağaç simine yönlendirir. */
export const isTreeArgs = (argv: readonly string[]): boolean => argv.some((a) => /^--(tree|level|side)(=|$)/.test(a));

export interface TreeSimPlan {
  runs: number;
  seeds: number[];
  levels: number[];
  side: 'party' | 'both';
  preset: string;
  only: string[];
  parts: boolean;
  over: Partial<BuildSpec>;
  out: string;
}

export function planFromArgs(argv: readonly string[]): TreeSimPlan {
  const { pos, flags } = parseTreeArgs(argv);
  const runs = Math.max(1, Math.floor(Number(pos[0] ?? 300)) || 300);
  const seeds = (pos[1] ?? '1').split(',').map(Number).filter((n) => Number.isFinite(n));
  const levels = (flags.level ?? '15').split(',').map((x) => Math.floor(Number(x))).filter((n) => n >= 1);
  const side = flags.side === 'both' ? 'both' : 'party';
  const preset = flags.tree ?? 'focus';
  if (!['off', 'a', 'b'].includes(preset) && !TREE_PRESETS[preset]) throw new Error(`Bilinmeyen ön ayar "${preset}" (seçenekler: off, a, b, ${Object.keys(TREE_PRESETS).join(', ')})`);
  const only = (flags.only ?? '').split(',').filter(Boolean);
  for (const c of only) if (!content.classes[c]) throw new Error(`Bilinmeyen class "${c}"`);
  const over: Partial<BuildSpec> = {};
  if (flags.rows) {
    const r = flags.rows.split(',').map(Number);
    if (r.length !== 2 || r.some((x) => !Number.isInteger(x) || x < 0 || x >= TREE_RULES.rows)) throw new Error(`--rows iki satır ister (0-${TREE_RULES.rows - 1}), ör. --rows=1,2`);
    over.rows = [r[0]!, r[1]!];
  }
  if (flags.ult) over.ult = flags.ult === 'none' ? null : flags.ult;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = flags.out ?? join(tmpdir(), `eov-tree-sim-${stamp}.json`);
  return { runs, seeds: seeds.length ? seeds : [1], levels: levels.length ? levels : [15], side, preset, only, parts: flags.parts === 'true', over, out };
}

interface LevelOut {
  level: number;
  variants: Record<string, VariantOut>;
}

/** Ön ayarın koşulacak varyantları: (etiket, yön, kapatılan kısımlar). */
function variantsOf(plan: TreeSimPlan): Array<{ label: string; preset: PresetDef; dir: TreeDir; over: Partial<BuildSpec> }> {
  if (plan.preset === 'off') return [];
  const preset: PresetDef = plan.preset === 'a' || plan.preset === 'b' ? { ...TREE_PRESETS.focus!, dirs: [plan.preset] } : TREE_PRESETS[plan.preset]!;
  const out: Array<{ label: string; preset: PresetDef; dir: TreeDir; over: Partial<BuildSpec> }> = [];
  for (const dir of preset.dirs ?? ['a']) {
    out.push({ label: dir, preset, dir, over: plan.over });
    if (plan.parts) {
      out.push({ label: `${dir}-evolve0`, preset, dir, over: { ...plan.over, evolve: false } });
      out.push({ label: `${dir}-ult0`, preset, dir, over: { ...plan.over, ultFx: false } });
      out.push({ label: `${dir}-bar0`, preset, dir, over: { ...plan.over, bar: false } });
    }
  }
  return out;
}

/** Tüm koşuyu yapar (rapor basmaz). Test ve CLI ortak. */
export function runTreeSim(plan: TreeSimPlan, log: (s: string) => void = () => {}): { plan: TreeSimPlan; levels: LevelOut[]; seconds: number } {
  const t0 = Date.now();
  const levels: LevelOut[] = [];
  for (const level of plan.levels) {
    const variants: Record<string, VariantOut> = {};
    log(`  L${level}: ağaçsız referans...`);
    variants.off = runVariant(plan.runs, plan.seeds, { label: 'off', level, side: plan.side, only: plan.only });
    for (const v of variantsOf(plan)) {
      log(`  L${level}: ${v.label}...`);
      variants[v.label] = runVariant(plan.runs, plan.seeds, { label: v.label, level, side: plan.side, only: plan.only, build: (cls) => resolveBuild(cls, v.preset, v.dir, v.over) });
    }
    levels.push({ level, variants });
  }
  return { plan, levels, seconds: (Date.now() - t0) / 1000 };
}

const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d).replace('.', ',') : '-');
const sgn = (n: number, d = 1) => (n > 0 ? '+' : n < 0 ? '-' : ' ') + fmt(Math.abs(n), d);
const name = (id: string) => content.classes[id]?.name ?? id;
const skillName = (id: string) => content.skills[id]?.name ?? content.globalSkills[id]?.name ?? id;

/** Türkçe rapor metni (satırlar). */
export function treeReport(res: ReturnType<typeof runTreeSim>): string[] {
  const { plan } = res;
  const L: string[] = [];
  const p = (s = '') => L.push(s);
  p('Embers of Valdoria skill ağacı simi (Faz 6)');
  p('===========================================');
  p(`Quick Battle vekili: ${content.DEFAULT_BATTLE} (standart simle aynı takım + dizilim), 4e4, Medium YZ. Ağaç yalnızca bu süreçte açık (_rules.json enabled=false kaldı).`);
  p(`Seed grupları: ${plan.seeds.map((s) => `${s}..${s + plan.runs - 1}`).join(' ve ')} (grup başına ${plan.runs} savaş). Level: ${plan.levels.join(', ')}. Ağaçlı taraf: ${plan.side === 'party' ? 'yalnızca oyuncu (güç artışı)' : 'iki taraf (sınıf eşitliği)'}. Ön ayar: ${plan.preset}${plan.only.length ? `. Yalnızca: ${plan.only.map(name).join(', ')}` : ''}${plan.parts ? '. Parça katkısı açık (--parts)' : ''}.`);
  p('Statlar: her birim o level\'ın stat puanlarını ana stata dağıtmış (oyuncu vekili), item yok. Referans = aynı seed, aynı level, ağaçsız.');
  const B = balance.bands;
  for (const lv of res.levels) {
    const V = lv.variants;
    const off = V.off!;
    const dirs = (['a', 'b'] as const).filter((d) => V[d]);
    p('');
    p(`############ LEVEL ${lv.level} ############`);
    p('GENEL (oyuncu kazanma; bitmeyen = 400 turu aşan; kontrol = karşı tarafın Stun/Slow/Silence vb. altında başlattığı tur payı)');
    p('  varyant          oyuncu  bitmeyen  ort.tur  karşı-kontrol  (kırılım)                      kendi-kontrol');
    for (const v of Object.values(V)) {
      const br = Object.entries(v.control.byStatus).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${content.statuses[k]?.name ?? k} %${fmt(n)}`).join(', ');
      p(`  ${v.label.padEnd(15)} %${fmt(v.partyWin).padStart(5)}  ${String(v.draws).padStart(8)}  ${fmt(v.avgTurns).padStart(7)}  %${fmt(v.control.foePct).padStart(5)}         ${br.padEnd(30)} %${fmt(v.control.ownPct).padStart(5)}`);
    }
    const ids = content.randomPool;
    p('');
    p(`SINIF FARKI (ölçülen tarafta class kazanma %; hedef: ağaçlı - ağaçsız +20..+25 puan, |a - b| <= 5 puan)`);
    p(`  sınıf      savaş  ağaçsız${dirs.map((d) => `      ${d}`).join('')}${dirs.map((d) => `   ${d}-ağaçsız`).join('')}${dirs.length === 2 ? '     a-b' : ''}`);
    for (const id of ids) {
      const o = off.classes[id]!;
      const ws = dirs.map((d) => V[d]!.classes[id]!.win);
      const ds = ws.map((w) => w - o.win);
      const ab = dirs.length === 2 ? ws[0]! - ws[1]! : NaN;
      const seen = o.games > 0 && dirs.every((d) => V[d]!.classes[id]!.games > 0);
      const flag = seen ? [...ds.map((x) => (x < 20 || x > 25 ? 'fark' : '')), Number.isFinite(ab) && Math.abs(ab) > 5 ? 'yön' : ''].filter(Boolean) : [];
      p(`  ${name(id).padEnd(9)} ${String(o.games).padStart(6)}  %${fmt(o.win).padStart(5)}${ws.map((w) => `  %${fmt(w).padStart(5)}`).join('')}${ds.map((x) => `      ${sgn(x).padStart(6)}`).join('')}${Number.isFinite(ab) ? `  ${sgn(ab).padStart(6)}` : ''}${flag.length ? `  <-- hedef dışı (${[...new Set(flag)].join(', ')})` : ''}`);
    }
    if (plan.parts) {
      p('');
      p('PARÇA KATKISI (class kazanma puanı; katkı = tam build - o kısım etkisiz; puanlar aynı yerde)');
      p(`  sınıf     ${dirs.map((d) => `  ${d}:evolve   ${d}:ult  ${d}:bar`).join('')}`);
      for (const id of ids) {
        const cells = dirs.map((d) => {
          const full = V[d]!.classes[id]!.win;
          return ['evolve0', 'ult0', 'bar0'].map((k) => sgn(full - (V[`${d}-${k}`]?.classes[id]?.win ?? NaN)).padStart(8)).join(' ');
        });
        p(`  ${name(id).padEnd(9)} ${cells.join('  ')}`);
      }
    }
    p('');
    p('BUILD (class başına; puan = harcanan, sayaç = ult hariç, evolve / bar = açılanlar)');
    for (const d of dirs) {
      for (const id of ids) {
        const b = V[d]!.builds[id];
        if (b) p(`  [${d}] ${name(id).padEnd(9)} ${b.label}; puan ${b.points}, sayaç ${b.counter}, ult kolu ${b.ultArm ?? '-'}, evolve ${b.evolves.join(' ') || '-'}, bar ${b.bar}/5`);
      }
    }
    p('');
    p(`SKILL PAYI KAYMASI (ölçülen birimlerin hamle payı %; yalnızca >= 5 puan kayan ya da > %40 olan bedelli skill'ler; bantlar: temel %${B.basic.low}-${B.basic.high}, normal %${B.normal.low}-${B.normal.high})`);
    let any = false;
    for (const id of ids) {
      const skills = new Set([...Object.keys(off.classes[id]!.skillShare), ...dirs.flatMap((d) => Object.keys(V[d]!.classes[id]!.skillShare))]);
      for (const sk of skills) {
        const o = off.classes[id]!.skillShare[sk] ?? 0;
        const vs = dirs.map((d) => V[d]!.classes[id]!.skillShare[sk] ?? 0);
        const def = content.skills[sk];
        const paid = !!def && (def.cost.amount > 0 || (def.cost.ofCurrent ?? 0) > 0);
        const dom = paid && vs.some((x) => x > 40);
        if (!dom && !vs.some((x) => Math.abs(x - o) >= 5)) continue;
        any = true;
        const cat = skillCategory(id, sk);
        p(`  ${name(id).padEnd(9)} ${skillName(sk).padEnd(20)} %${fmt(o).padStart(5)} ->${dirs.map((d, i) => ` ${d} %${fmt(vs[i]!).padStart(5)}`).join('')}${cat ? `  (${cat})` : ''}${dom ? '  <-- baskın (%40+)' : ''}`);
      }
    }
    if (!any) p('  Kayda değer kayma yok.');
    p('');
    p('KAYNAK (MP\'li ölçülen birimler: savaştaki en düşük MP ortalaması % / hiç %25 altına inmeyen birim payı %)');
    for (const id of ids) {
      const o = off.classes[id]!;
      if (!o.mpUnits) continue;
      p(`  ${name(id).padEnd(9)} ağaçsız %${fmt(o.mpMinAvg, 0).padStart(3)} / %${fmt(o.mpNeverLow, 0).padStart(3)}${dirs.map((d) => `   ${d} %${fmt(V[d]!.classes[id]!.mpMinAvg, 0).padStart(3)} / %${fmt(V[d]!.classes[id]!.mpNeverLow, 0).padStart(3)}`).join('')}`);
    }
    p('');
    p('DÜĞÜM TETİKLENME (treeProc; ağaçlı birim başına; ölü = alınmış, tetiklenmesi beklenen ama hiç tetiklenmemiş; sürekli etkiler sayılmaz)');
    for (const d of dirs) {
      const v = V[d]!;
      for (const id of ids) {
        const units = v.treedUnits[id] ?? 0;
        if (!units) continue;
        const top = Object.entries(v.procs).filter(([k]) => k.startsWith(`${id}:`)).sort((a, b) => b[1] - a[1]);
        const dead = v.deadNodes.filter((k) => k.startsWith(`${id}:`)).map((k) => k.slice(id.length + 1));
        const inert = v.inertNodes.filter((k) => k.startsWith(`${id}:`)).map((k) => k.slice(id.length + 1));
        p(`  [${d}] ${name(id).padEnd(9)} ${units} birim; en çok: ${top.slice(0, 4).map(([k, n]) => `${k.slice(id.length + 1)} ${fmt(n / units, 2)}`).join(', ') || '-'}`);
        if (dead.length) p(`        ölü: ${dead.join(', ')}`);
        if (inert.length) p(`        fx yok: ${inert.join(', ')}`);
      }
    }
  }
  p('');
  p(`Süre: ${fmt(res.seconds, 0)} sn.`);
  return L;
}

/** CLI girişi (cli.ts çağırır): koşar, raporu basar, ham JSON'u yazar. */
export function treeCli(argv: readonly string[]): void {
  const plan = planFromArgs(argv);
  const res = runTreeSim(plan, (s) => process.stderr.write(`${s}\n`));
  for (const line of treeReport(res)) console.log(line);
  writeFileSync(plan.out, JSON.stringify(res, null, 1));
  console.log(`Ham JSON: ${plan.out}`);
}
