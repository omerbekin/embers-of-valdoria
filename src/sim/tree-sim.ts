// Skill ağacı simi (Faz 6; docs/design/skill-tree-implementation.md 9.2a / 9.2). YALNIZCA SİM: ağaç bu süreçte bellekte açılır,
// data/skill-trees/_rules.json > enabled false kalır (debug odaklı kurulum gibi bellek içi aşma). Oyun kodu ve veri değişmez.
//
// Quick Battle vekili: standart denge simiyle (simulate.ts) AYNI takımlar ve dizilim; her birim seçilen level'da (stat puanları oyuncu vekili
// gibi ana stata, levels.ts > autoAllocate; item yok), ağaçlı tarafın birimleri ön ayar build'iyle (skill-tree.ts > focusBuild) derlenmiş ağaç
// alır. Aynı seed'lerle ağaçsız referans da koşulur (aynı level, aynı statlar): fark yalnızca ağaçtır.
// Sefer / Endless vekili için `simAutoTreeHero` (campaign-grind.ts, campaign.ts, endless.ts --tree bayrağıyla çağırır).
import { content, type BattleSetup, type UnitSetup, type TreeSetup } from '../engine';
import { loadoutSetup } from '../progression/loadout';
import { autoAllocate, statPointsAt, type LevelHero } from '../progression/levels';
import { barReached, counter, focusBuild, rankOf, spent, ultArm, validate, type TreeAlloc } from '../progression/skill-tree';
import { compileTree } from '../progression/skill-tree-compile';
import { applyTree, autoTreePlan, treeChangeBlocked } from '../progression/skill-tree-hero';
import { TREE_RULES, treeOf, type TreeData, type TreeDir, type TreeFx } from '../progression/skill-tree-data';
import { mergeResults, simulate, winRate, type SimObserver, type SimResult } from './simulate';
import presetsJson from './tree-presets.json';

const BID = content.DEFAULT_BATTLE;

/**
 * `fn` süresince ağacı bellekte açar (sefer / Endless savaşı loadoutSetup üzerinden alır; debug odaklı kurulum gibi bellek içi aşma), sonra eski
 * değere döner. data/skill-trees/_rules.json dosyası DEĞİŞMEZ. Quick Battle vekili buna gerek duymaz (derlenmiş ağacı birime kendisi verir).
 */
export function withTreesInMemory<T>(on: boolean, fn: () => T): T {
  const prev = TREE_RULES.enabled;
  TREE_RULES.enabled = on; // kapalı = ağaçsız referans: gönderilen şalter açık olsa da ağaç savaşa girmez
  try {
    return fn();
  } finally {
    TREE_RULES.enabled = prev;
  }
}

// ------------------------------------------------------------------ build ön ayarları

export interface PresetDef {
  rows?: 'auto' | [number, number];
  dirs?: TreeDir[];
  ult?: string;
  evolve?: boolean;
  ultFx?: boolean;
  bar?: boolean;
  classes?: Record<string, Partial<Omit<PresetDef, 'classes' | 'dirs'>>>;
}

export const TREE_PRESETS = (presetsJson as unknown as { presets: Record<string, PresetDef> }).presets;

/** Tek class'ın çözülmüş build kimliği (satırlar, yön, ult kolu, kapatılan kısımlar). */
export interface BuildSpec {
  rows: [number, number];
  dir: TreeDir;
  /** Ult kolu (null = kol yok: vekil kuralı). */
  ult: string | null;
  evolve: boolean;
  ultFx: boolean;
  bar: boolean;
}

export function resolveBuild(cls: string, preset: PresetDef, dir: TreeDir, over: Partial<BuildSpec> = {}): BuildSpec {
  const p = { ...preset, ...(preset.classes?.[cls] ?? {}) };
  const plan = autoTreePlan(cls);
  const rows: [number, number] = over.rows ?? (p.rows && p.rows !== 'auto' ? p.rows : plan.rows);
  const u = over.ult !== undefined ? over.ult : (p.ult ?? 'auto');
  const ult = u === null || u === 'none' ? null : u === 'auto' ? (TREE_RULES.debugFocus?.[cls]?.ult ?? TREE_RULES.ult.arms[0] ?? null) : u;
  return { rows, dir, ult, evolve: over.evolve ?? p.evolve ?? true, ultFx: over.ultFx ?? p.ultFx ?? true, bar: over.bar ?? p.bar ?? true };
}

export const buildLabel = (b: BuildSpec): string =>
  `satır ${b.rows[0]}+${b.rows[1]} yön ${b.dir} ult ${b.ult ?? '-'}${b.evolve ? '' : ' evolve-kapalı'}${b.ultFx ? '' : ' ult-kapalı'}${b.bar ? '' : ' bar-kapalı'}`;

/** Kapatılan kısımların fx'i null olan ağaç kopyası (puan dağılımı aynı kalır, etkisi yok). */
function maskedTree(tree: TreeData, b: BuildSpec): TreeData {
  if (b.evolve && b.ultFx && b.bar) return tree;
  const t = JSON.parse(JSON.stringify(tree)) as TreeData;
  for (const [k, n] of Object.entries(t.nodes)) {
    if (!b.evolve && k.endsWith('.v')) n.fx = null;
    if (!b.ultFx && k.startsWith(`${TREE_RULES.rows}.`)) n.fx = null;
  }
  if (!b.bar) for (const x of t.mastery.bar) x.fx = null;
  return t;
}

export interface CompiledBuild {
  alloc: TreeAlloc;
  setup: TreeSetup | undefined;
  /** Alınan düğümler (rank > 0) + açılan bar bonusları (`bar[i]`). */
  taken: string[];
  points: number;
}

const buildCache = new Map<string, CompiledBuild | null>();

/** Class + level + build -> dağılım ve derlenmiş ağaç (ağacı olmayan class: null). */
export function compileBuild(cls: string, level: number, b: BuildSpec): CompiledBuild | null {
  const key = `${cls}|${level}|${JSON.stringify(b)}`;
  if (buildCache.has(key)) return buildCache.get(key)!;
  const tree = treeOf(cls);
  let out: CompiledBuild | null = null;
  if (tree) {
    const alloc = focusBuild(tree, b.rows, level, { dir: b.dir, ...(b.ult ? { ult: b.ult } : {}) });
    const bad = validate(tree, level, alloc);
    if (bad) throw new Error(`${cls} L${level} build geçersiz (${bad.key}: ${bad.code})`);
    const taken = Object.keys(alloc.r).filter((k) => rankOf(alloc, k) > 0);
    barReached(alloc).forEach((on, i) => {
      if (on) taken.push(`bar[${i}]`);
    });
    out = { alloc, setup: compileTree(maskedTree(tree, b), alloc), taken, points: spent(alloc) };
  }
  buildCache.set(key, out);
  return out;
}

// ------------------------------------------------------------------ level'lı birim + savaş kurulumu

const levelCache = new Map<string, UnitSetup | undefined>();

/** Class'ın level N birimi (stat puanları oyuncu vekili gibi ana stata; item yok, ağaç yok). L1 = undefined (bugünkü birim). */
export function levelUnit(cls: string, level: number): UnitSetup | undefined {
  const key = `${cls}|${level}`;
  if (levelCache.has(key)) return levelCache.get(key);
  let u: UnitSetup | undefined;
  if (level > 1 && content.classes[cls]) {
    const h: LevelHero = { id: cls, class: cls, level, statPoints: statPointsAt(level), alloc: {} };
    autoAllocate(h);
    const s = loadoutSetup({ class: cls, level, alloc: h.alloc ?? {} });
    u = Object.keys(s).length ? s : undefined;
  }
  levelCache.set(key, u);
  return u;
}

/**
 * Standart simin kurulumu (content.battleSetup rastgele yolu: aynı takım, dizilim, birim sırası) + birim kurulumları. `unitFor(side, cls)` birimin
 * kurulumunu verir (undefined = bugünkü birim). Kurulumsuz çağrı standart kurulumla birebir aynıdır (test: tests/tree-sim.test.ts).
 */
export function treeBattleSetup(seed: number, unitFor: (side: 'party' | 'enemies', cls: string) => UnitSetup | undefined): BattleSetup {
  const setup = content.battleSetup(BID, seed, 'turns');
  const pu = setup.party.map((d, i) => merge(setup.partyUnits?.[i], unitFor('party', d.id)));
  const eu = setup.enemies.map((d, i) => merge(setup.enemyUnits?.[i], unitFor('enemies', d.id)));
  return { ...setup, ...(pu.some(Boolean) ? { partyUnits: pu } : {}), ...(eu.some(Boolean) ? { enemyUnits: eu } : {}) };
}

const merge = (a: UnitSetup | undefined, b: UnitSetup | undefined): UnitSetup | undefined => (a && b ? { ...a, ...b } : (a ?? b));

// ------------------------------------------------------------------ varyant koşusu + ölçümler

export interface VariantSpec {
  label: string;
  level: number;
  /** party = yalnızca oyuncu tarafı ağaçlı (güç artışı); both = iki taraf ağaçlı (sınıf eşitliği). */
  side: 'party' | 'both';
  /** Yalnızca bu class'lar ağaç alır (boş = hepsi). Ölçüm de yalnızca bunlara bakar. */
  only?: string[];
  /** Class'ın build'i; null / verilmezse ağaçsız (referans). */
  build?: (cls: string) => BuildSpec | null;
}

export interface ClassOut {
  games: number;
  wins: number;
  win: number;
  units: number;
  moves: number;
  skillShare: Record<string, number>;
  /** MP'li birimler: savaştaki en düşük MP oranı ortalaması (%) ve hiç %25 altına inmeyen birim payı (%; kaynak tükenmemesi). */
  mpUnits: number;
  mpMinAvg: number;
  mpNeverLow: number;
}

export interface VariantOut {
  label: string;
  level: number;
  side: 'party' | 'both';
  runs: number;
  partyWin: number;
  draws: number;
  avgTurns: number;
  classes: Record<string, ClassOut>;
  /** Ölçülen tarafın karşısındaki birimlerin (side both: iki taraf) kontrol altında geçirdiği tur payı (%), duruma göre kırılım; ownPct = ölçülen taraf. */
  control: { foeTurns: number; foeCtrl: number; foePct: number; byStatus: Record<string, number>; ownPct: number };
  /** Düğüm başına tetiklenme (treeProc; '<class>:<düğüm>') ve ağaçlı birim sayısı (class başına). */
  procs: Record<string, number>;
  treedUnits: Record<string, number>;
  /** Class başına build özeti (ağaçlı varyantta). */
  builds: Record<string, { label: string; points: number; counter: number; ultArm: string | null; evolves: string[]; bar: number; taken: string[] }>;
  /** Alınan, tetiklenmesi beklenen ama hiç tetiklenmeyen düğümler (ölü) ve fx'i olmayan alınan düğümler (etkisiz). Sürekli etkiler sayılmaz. */
  deadNodes: string[];
  inertNodes: string[];
}

const TRIGGER_UNIT_FX = new Set(['secondWind', 'shieldRefresh', 'lastStand', 'vengeance', 'retortStatus', 'openerStatus', 'executeLifesteal', 'onHitDot', 'restBlessing', 'critStatuses', 'tierStatus', 'killRush']);

/** Düğümün ölçüm türü: none = fx yok; static = sürekli (sayı yaması / sürekli unitFx; treeProc yazmaz); proc = tetiklenince sayılır. */
export function procKind(fx: TreeFx[] | null | undefined): 'none' | 'static' | 'proc' {
  if (!fx || !fx.length) return 'none';
  for (const f of fx) {
    if (f.k === 'hook' || f.k === 'addEffect' || f.k === 'replaceEffect' || f.k === 'groundStatus') return 'proc';
    if (f.k === 'unitFx' && Object.keys((f as { fx?: object }).fx ?? {}).some((k) => TRIGGER_UNIT_FX.has(k))) return 'proc';
  }
  return 'static';
}

const nodeFx = (cls: string, key: string): TreeFx[] | null | undefined => {
  const t = treeOf(cls);
  if (!t) return undefined;
  const m = /^bar\[(\d+)\]$/.exec(key);
  return m ? t.mastery.bar[Number(m[1])]?.fx : t.nodes[key]?.fx;
};

type ClassAcc = ClassOut & { mpMinSum: number; mpLow: number; uses: Map<string, number> };

export function runVariant(runs: number, seeds: number[], v: VariantSpec): VariantOut {
  const only = v.only?.length ? new Set(v.only) : null;
  const measured = (side: 'party' | 'enemy', id: string) => (v.side === 'both' || side === 'party') && (!only || only.has(id));
  const builds: VariantOut['builds'] = {};
  const compiled = new Map<string, CompiledBuild | null>();
  const compiledFor = (id: string): CompiledBuild | null => {
    if (!v.build) return null;
    if (!compiled.has(id)) {
      const b = v.build(id);
      const c = b ? compileBuild(id, v.level, b) : null;
      compiled.set(id, c);
      if (b && c) {
        builds[id] = { label: buildLabel(b), points: c.points, counter: counter(c.alloc), ultArm: ultArm(c.alloc), evolves: c.taken.filter((k) => k.endsWith('.v')), bar: c.taken.filter((k) => k.startsWith('bar[')).length, taken: c.taken };
      }
    }
    return compiled.get(id)!;
  };
  const unitFor = (side: 'party' | 'enemies', id: string): UnitSetup | undefined => {
    const base = levelUnit(id, v.level);
    const tree = measured(side === 'party' ? 'party' : 'enemy', id) ? compiledFor(id)?.setup : undefined;
    if (!tree) return base;
    return { ...(base ?? {}), tree };
  };

  const cls: Record<string, ClassAcc> = {};
  const C = (id: string): ClassAcc => (cls[id] ??= { games: 0, wins: 0, win: 0, units: 0, moves: 0, skillShare: {}, mpUnits: 0, mpMinAvg: 0, mpNeverLow: 0, mpMinSum: 0, mpLow: 0, uses: new Map() });
  for (const id of content.randomPool) C(id);
  const ctl = { foeTurns: 0, foeCtrl: 0, ownTurns: 0, ownCtrl: 0, byStatus: {} as Record<string, number> };
  const procs: Record<string, number> = {};
  const treedUnits: Record<string, number> = {};
  const ctrlOf = (c: { statuses: ReadonlyArray<{ kind: string }> }): string[] =>
    c.statuses.filter((s) => content.statuses[s.kind]?.cc || content.statuses[s.kind]?.skipTurn).map((s) => s.kind);

  // Birim başına: ölçülen mi, en düşük MP oranı (savaş başında sıfırlanır)
  let unitInfo = new Map<string, { measured: boolean; minMp: number }>();
  const sideOf = (s: string): 'party' | 'enemy' => (s === 'party' ? 'party' : 'enemy');
  const countTurn = (side: 'party' | 'enemy', kinds: string[], defId: string) => {
    // "karşı" = ölçülen tarafın karşısı; side both: iki taraf da hem kendi hem karşı (iki taraf ağaçlı; --only verilirse yalnızca o class'lar)
    if (v.side === 'both' && only && !only.has(defId)) return;
    const foe = v.side === 'both' || side === 'enemy';
    const own = v.side === 'both' || side === 'party';
    if (foe) {
      ctl.foeTurns++;
      if (kinds.length) ctl.foeCtrl++;
      for (const k of new Set(kinds)) ctl.byStatus[k] = (ctl.byStatus[k] ?? 0) + 1;
    }
    if (own) {
      ctl.ownTurns++;
      if (kinds.length) ctl.ownCtrl++;
    }
  };
  const sampleMp = (cs: ReadonlyArray<{ uid: string; mp: number; maxMp: number }>) => {
    for (const c of cs) {
      const u = unitInfo.get(c.uid);
      if (u && c.maxMp > 0) u.minMp = Math.min(u.minMp, c.mp / c.maxMp);
    }
  };

  const observer: SimObserver = {
    start(battle) {
      unitInfo = new Map();
      for (const c of battle.combatants) {
        if (c.summoned) continue;
        const m = measured(sideOf(c.side), c.defId);
        unitInfo.set(c.uid, { measured: m, minMp: c.maxMp > 0 ? c.mp / c.maxMp : 1 });
        if (m && compiled.get(c.defId)?.setup) treedUnits[c.defId] = (treedUnits[c.defId] ?? 0) + 1;
      }
    },
    beforeAct(battle, actor) {
      if (!actor.summoned) countTurn(sideOf(actor.side), ctrlOf(actor), actor.defId);
      sampleMp(battle.combatants);
    },
    events(battle, events, actor, skillId) {
      if (unitInfo.get(actor.uid)?.measured) {
        const s = C(actor.defId);
        s.moves++;
        if (skillId) s.uses.set(skillId, (s.uses.get(skillId) ?? 0) + 1);
      }
      for (const e of events) {
        if (e.type !== 'turnSkipped' || !(e as { stunned?: boolean }).stunned) continue;
        const c = battle.get((e as { actor: string }).actor);
        if (!c || c.summoned) continue;
        const k = ctrlOf(c);
        countTurn(sideOf(c.side), k.length ? k : ['stun'], c.defId);
      }
    },
    end(battle, setup) {
      sampleMp(battle.combatants);
      for (const c of battle.combatants) {
        const u = unitInfo.get(c.uid);
        if (!u?.measured) continue;
        const s = C(c.defId);
        s.units++;
        if (c.maxMp > 0) {
          s.mpUnits++;
          s.mpMinSum += u.minMp;
          if (u.minMp >= 0.25) s.mpLow++;
        }
      }
      for (const p of battle.treeProcs()) procs[p.node] = (procs[p.node] ?? 0) + p.count;
      // Ölçülen tarafta class kazanma (class iki tarafta da varsa sayılmaz; side both = standart ölçüm)
      const party = setup.party.map((d) => d.id);
      const enemy = setup.enemies.map((d) => d.id);
      for (const [side, mine, theirs] of [['party', party, enemy], ['enemy', enemy, party]] as const) {
        for (const id of new Set(mine)) {
          if (theirs.includes(id) || !measured(side, id)) continue;
          const s = C(id);
          s.games++;
          if (battle.winner === side) s.wins++;
        }
      }
    },
  };

  const parts: SimResult[] = seeds.map((seed) => simulate(runs, seed, BID, {}, { setupFor: (sd) => treeBattleSetup(sd, unitFor), observer }));
  const r = parts.length === 1 ? parts[0]! : mergeResults(parts);
  const classes: Record<string, ClassOut> = {};
  for (const [id, s] of Object.entries(cls)) {
    const share: Record<string, number> = {};
    for (const [sk, n] of s.uses) share[sk] = s.moves ? (n / s.moves) * 100 : 0;
    classes[id] = { games: s.games, wins: s.wins, win: winRate(s), units: s.units, moves: s.moves, skillShare: share, mpUnits: s.mpUnits, mpMinAvg: s.mpUnits ? (s.mpMinSum / s.mpUnits) * 100 : 0, mpNeverLow: s.mpUnits ? (s.mpLow / s.mpUnits) * 100 : 0 };
  }
  // Ölü / etkisiz düğümler: ağacı en az bir birimde savaşa girmiş class'ların alınan düğümleri
  const deadNodes: string[] = [];
  const inertNodes: string[] = [];
  for (const [id, b] of Object.entries(builds)) {
    if (!treedUnits[id]) continue;
    for (const k of b.taken) {
      const kind = procKind(nodeFx(id, k));
      const node = `${id}:${k}`;
      if (kind === 'none') inertNodes.push(node);
      else if (kind === 'proc' && !procs[node]) deadNodes.push(node);
    }
  }
  const total = r.runs;
  return {
    label: v.label,
    level: v.level,
    side: v.side,
    runs: total,
    partyWin: total ? (r.partyWins / total) * 100 : 0,
    draws: r.draws,
    avgTurns: total ? r.totalTurns / total : 0,
    classes,
    control: {
      foeTurns: ctl.foeTurns,
      foeCtrl: ctl.foeCtrl,
      foePct: ctl.foeTurns ? (ctl.foeCtrl / ctl.foeTurns) * 100 : 0,
      byStatus: Object.fromEntries(Object.entries(ctl.byStatus).map(([k, n]) => [k, ctl.foeTurns ? (n / ctl.foeTurns) * 100 : 0])),
      ownPct: ctl.ownTurns ? (ctl.ownCtrl / ctl.ownTurns) * 100 : 0,
    },
    procs,
    treedUnits,
    builds,
    deadNodes,
    inertNodes,
  };
}

// ------------------------------------------------------------------ sefer / Endless vekili

/**
 * Sefer / Endless oyuncu vekilinin ağacı (YERİNDE; skill-tree-hero.ts > autoTreeHero ile aynı yol, yalnızca yön seçilebilir): harcanmamış puanlar
 * onaylı ağacın üstüne odaklı kurulumla harcanır. Satırlar / ult kolu autoTreePlan'dan (_rules.json > debugFocus). Dönen: değişti mi.
 */
export function simAutoTreeHero(h: LevelHero, dir: TreeDir): boolean {
  const tree = treeOf(h.class);
  if (!tree || (h.skillPoints ?? 0) <= 0) return false;
  const p = autoTreePlan(h.class);
  const next = focusBuild(tree, p.rows, Math.max(1, Math.floor(h.level ?? 1)), { dir, ...(p.ult ? { ult: p.ult } : {}), ...(h.tree ? { from: h.tree } : {}) });
  if (treeChangeBlocked(h, next)) return false;
  applyTree(h, next);
  return true;
}

/** Kahraman listesinin ağacını vekille harcar (değişen kahraman kopyalanır; girdi değişmez). */
export function autoTreeHeroes<H extends LevelHero>(hs: H[], dir: TreeDir): H[] {
  return hs.map((h) => {
    if (!treeOf(h.class) || (h.skillPoints ?? 0) <= 0) return h;
    const c = JSON.parse(JSON.stringify(h)) as H;
    return simAutoTreeHero(c, dir) ? c : h;
  });
}

/** `--tree=a|b|off` bayrağı (sefer / Endless CLI): yön ya da kapalı (null). */
export function treeFlag(args: readonly string[]): TreeDir | null {
  const v = args.find((a) => a.startsWith('--tree='))?.split('=')[1];
  return v === 'a' || v === 'b' ? v : null;
}
