// Skill ağacı DERLEYİCİSİ (saf; docs/design/skill-tree-implementation.md 2.3 + 4.1): kahramanın ağaç dağılımı -> motorun anladığı TreeSetup
// (UnitSetup.tree: yamalı tam skill tanımları + yamalı pasif; skill id'leri aynı). Motor ağaç biçimini bilmez.
// Faz 1a: yalnızca (a) düz sayı yamaları (fx k 'skill' / 'passive'); (b)/(c) fx türleri sonraki fazlarda.
// Uygulama sırası: satır 0 -> 3, sonra ult, sonra Mastery bar; satır içinde sütun sırası (f1 -> f2 -> f3 -> n0 -> r -> e -> m/f -> v), ult'ta kol x adım.
// `set` kendinden öncekileri ezer, sonrakiler onun üstüne biner; `base` (temel değeri değiştirir) TÜM yamalardan önce uygulanır. '+X% power' = op 'pct': anlamı _rules.json > percentRule (TEK yer; varsayılan 'mul').
import { classes, skills as SKILLS } from '../engine/content';
import type { PassiveDef, SkillDef, TreeSetup } from '../engine/types';
import { TREE_RULES, treeOf, type TreeData, type TreeFx, type TreeMode, type TreeRules } from './skill-tree-data';
import { barReached, focusBuild, rankOf, spent, treeNodes, validate, type TreeAlloc } from './skill-tree';

/** Seçici türü -> yamalanabilir alanlar (beyaz liste; bilinmeyen seçici / alan = derleme hatası, veri testi kırmızı). */
export const FX_FIELDS: Record<string, readonly string[]> = {
  /** Skill'in kendisi. */
  self: ['cost.amount', 'cooldown', 'initialCooldown', 'count', 'turnCost'],
  /** Tüm hasar etkileri ('damage') ya da N. hasar etkisi ('damage:1', 0 tabanlı). */
  damage: ['power', 'lifesteal', 'ignoreDefense', 'critBonus', 'powerPerRage', 'executeBonus', 'falloff', 'repeatChance'],
  /** 'status:<durum>' (ör. status:slow). */
  status: ['turns', 'chance'],
  taunt: ['turns', 'breakRatio', 'allyDamageMult'],
  guard: ['turns', 'share'],
  ground: ['turns', 'power'],
  /** 'bonusScale:<stat>' (hasar etkilerindeki ek ölçek; ör. bonusScale:armor). */
  bonusScale: ['pct'],
};

/** Alan tanımda yoksa add / mul / pct'nin başlangıç değeri (motorun "yok" anlamıyla aynı). Burada olmayan eksik alan = hata. */
const FX_DEFAULTS: Record<string, number> = {
  lifesteal: 0,
  ignoreDefense: 0,
  critBonus: 0,
  powerPerRage: 0,
  executeBonus: 0,
  repeatChance: 0,
  falloff: 1,
  cooldown: 0,
  initialCooldown: 0,
  turnCost: 1,
  chance: 1,
  breakRatio: 0,
  allyDamageMult: 1,
};

/** Tam sayı alanlar (sonuç yuvarlanır, en az 0). */
const INT_FIELDS = new Set(['cost.amount', 'cooldown', 'initialCooldown', 'count', 'turns']);

export class TreeFxError extends Error {}

type Bag = Record<string, unknown>;
const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;

/** Seçicinin işaret ettiği nesneler (tanımın İÇİNDE; yamalanacak kopyada çağrılır). */
function resolve(def: SkillDef, sel: string): { kind: string; targets: Bag[] } {
  const [head = '', arg] = sel.split(':');
  const effects = def.effects as unknown as Bag[];
  const damage = effects.filter((e) => e.type === 'damage');
  switch (head) {
    case 'self':
      if (arg !== undefined) break;
      return { kind: 'self', targets: [def as unknown as Bag] };
    case 'damage': {
      if (arg === undefined) return { kind: 'damage', targets: damage };
      const i = Number(arg);
      if (!Number.isInteger(i) || i < 0) break;
      return { kind: 'damage', targets: damage[i] ? [damage[i]!] : [] };
    }
    case 'status':
      if (!arg) break;
      return { kind: 'status', targets: effects.filter((e) => e.type === 'status' && e.status === arg) };
    case 'taunt':
    case 'guard':
    case 'ground':
      if (arg !== undefined) break;
      return { kind: head, targets: effects.filter((e) => e.type === head) };
    case 'bonusScale':
      if (!arg) break;
      return { kind: 'bonusScale', targets: damage.flatMap((e) => ((e.bonusScale as Bag[] | undefined) ?? []).filter((b) => b.stat === arg)) };
  }
  throw new TreeFxError(`unknown selector "${sel}"`);
}

/** Yol üzerinden (a.b) sayısal alanı okur / yazar. */
function getPath(o: Bag, path: string): unknown {
  return path.split('.').reduce<unknown>((x, k) => (x && typeof x === 'object' ? (x as Bag)[k] : undefined), o);
}
function setPath(o: Bag, path: string, v: number): void {
  const parts = path.split('.');
  let cur = o;
  for (const k of parts.slice(0, -1)) {
    if (!cur[k] || typeof cur[k] !== 'object') throw new TreeFxError(`no object at "${k}" for "${path}"`);
    cur = cur[k] as Bag;
  }
  cur[parts[parts.length - 1]!] = v;
}

/** Tek değere op uygular. `rank`: düğümün rank'ı (fx.rank true ise v x rank). */
function applyOp(cur: unknown, fx: TreeFx, rank: number, field: string, rules: TreeRules): number {
  if (!Number.isFinite(fx.v)) throw new TreeFxError(`value of ${field} must be a number`);
  const n = fx.rank ? fx.v * rank : fx.v;
  let out: number;
  if (fx.op === 'set' || fx.op === 'base') out = fx.v;
  else {
    const base = typeof cur === 'number' ? cur : FX_DEFAULTS[field];
    if (base === undefined) throw new TreeFxError(`field "${field}" is missing and has no default`);
    if (fx.op === 'add') out = base + n;
    else if (fx.op === 'mul') out = base * (1 + n);
    else if (fx.op === 'pct') out = rules.percentRule === 'add' ? base + n : base * (1 + n);
    else throw new TreeFxError(`unknown op "${(fx as { op: string }).op}"`);
  }
  return INT_FIELDS.has(field) ? Math.max(0, Math.round(out)) : r6(out);
}

/** Skill yaması (yerinde, kopya üzerinde). */
function patchSkill(def: SkillDef, fx: Extract<TreeFx, { k: 'skill' }>, rank: number, rules: TreeRules): void {
  const { kind, targets } = resolve(def, fx.sel);
  if (!FX_FIELDS[kind]!.includes(fx.f)) throw new TreeFxError(`field "${fx.f}" is not patchable for selector "${fx.sel}"`);
  if (!targets.length) throw new TreeFxError(`selector "${fx.sel}" matches nothing in ${def.id}`);
  for (const t of targets) setPath(t, fx.f, applyOp(getPath(t, fx.f), fx, rank, fx.f, rules));
}

/** Pasif yaması (yerinde, kopya üzerinde): alan pasif etkisinde sayı olmalı. */
function patchPassive(p: PassiveDef, fx: Extract<TreeFx, { k: 'passive' }>, rank: number, rules: TreeRules): void {
  const eff = p.effect as unknown as Bag;
  const cur = getPath(eff, fx.f);
  if (typeof cur !== 'number') throw new TreeFxError(`passive ${p.id} has no numeric field "${fx.f}"`);
  setPath(eff, fx.f, applyOp(cur, fx, rank, fx.f, rules));
}

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
/** Skill kopyası (açıklama `_not` alanları atılır; motor okumaz). */
function cloneSkill(def: SkillDef): SkillDef {
  const c = clone(def) as unknown as Bag;
  for (const k of Object.keys(c)) if (k.startsWith('_')) delete c[k];
  return c as unknown as SkillDef;
}

/** Satırın varsayılan skill'i (satır 0 = pasif: skill yaması `skill` alanı ister). */
function rowSkill(tree: TreeData, row: number, rules: TreeRules): string | undefined {
  if (row === rules.rows) return tree.ult.skill;
  return tree.rows[row]?.passive ? undefined : tree.rows[row]?.skill;
}

interface Patch {
  fx: TreeFx;
  rank: number;
  /** Varsayılan hedef skill (satırın skill'i; bar / pasif satırında yok). */
  skill?: string;
  label: string;
}

/** Dağılımdaki etkin yamalar, uygulama sırasıyla (fx null düğümler atlanır). */
function patchesOf(tree: TreeData, alloc: TreeAlloc, rules: TreeRules): Patch[] {
  const out: Patch[] = [];
  for (const n of treeNodes(rules).list) {
    const rank = rankOf(alloc, n.key);
    const fx = tree.nodes[n.key]?.fx;
    if (rank <= 0 || !fx) continue;
    const skill = rowSkill(tree, n.row, rules);
    for (const f of fx) out.push({ fx: f, rank, ...(skill ? { skill } : {}), label: n.key });
  }
  barReached(alloc, rules).forEach((on, i) => {
    const fx = tree.mastery.bar[i]?.fx;
    if (on && fx) for (const f of fx) out.push({ fx: f, rank: 1, label: `bar[${i}]` });
  });
  // `base` önce (temel değer), sonra kalanlar sütun sırasıyla (sıralama kararlı)
  return [...out.filter((p) => p.fx.op === 'base'), ...out.filter((p) => p.fx.op !== 'base')];
}

/**
 * Dağılımı derler -> TreeSetup (yalnızca değişen skill'ler + değiştiyse pasif) ya da hiçbir şey değişmediyse undefined (birim bugünküyle aynı).
 * Dağılımın geçerli olduğu varsayılır (treeSetupFor doğrular). Hatalı fx TreeFxError fırlatır (veri testi yakalar).
 */
export function compileTree(tree: TreeData, alloc: TreeAlloc, rules: TreeRules = TREE_RULES): TreeSetup | undefined {
  const cls = classes[tree.class];
  if (!cls) return undefined;
  const own = new Set(cls.skills);
  const out: Record<string, SkillDef> = {};
  let passive: PassiveDef | undefined;
  for (const p of patchesOf(tree, alloc, rules)) {
    try {
      if (p.fx.k === 'skill') {
        const id = p.fx.skill ?? p.skill;
        if (!id) throw new TreeFxError('skill patch needs a "skill" here');
        if (!own.has(id)) throw new TreeFxError(`skill ${id} is not a ${tree.class} skill`);
        const base = SKILLS[id];
        if (!base) throw new TreeFxError(`unknown skill ${id}`);
        patchSkill((out[id] ??= cloneSkill(base)), p.fx, p.rank, rules);
      } else if (p.fx.k === 'passive') {
        if (!cls.passive) throw new TreeFxError(`${tree.class} has no passive`);
        patchPassive((passive ??= clone(cls.passive)), p.fx, p.rank, rules);
      } else throw new TreeFxError(`fx kind "${(p.fx as { k: string }).k}" is not supported yet`);
    } catch (e) {
      throw new TreeFxError(`${tree.class} ${p.label}: ${(e as Error).message}`);
    }
  }
  const any = Object.keys(out).length > 0;
  return any || passive ? { ...(any ? { skills: out } : {}), ...(passive ? { passive } : {}) } : undefined;
}

/**
 * fx denetimi (veri testi; boş = sağlam): her düğümün / bar bonusunun fx'i TEK BAŞINA, tam rank'la gerçek skill tanımına karşı derlenir
 * (seçici var ve en az bir etkiye uyar, alan beyaz listede, op bilinir, değer sayı). Başka düğümün eklediği etkiye bakan fx burada kırmızı olur.
 */
export function checkTreeFx(tree: TreeData, rules: TreeRules = TREE_RULES): string[] {
  const out: string[] = [];
  const { list } = treeNodes(rules);
  const one = (label: string, fx: TreeFx[] | null | undefined, max: number, skill: string | undefined) => {
    if (!fx) return;
    for (const f of fx) {
      if (!['add', 'mul', 'pct', 'set', 'base'].includes(f.op)) out.push(`${tree.class} ${label}: unknown op "${f.op}"`);
      if (typeof f.v !== 'number' || !Number.isFinite(f.v)) out.push(`${tree.class} ${label}: value must be a number`);
      if (f.rank !== undefined && typeof f.rank !== 'boolean') out.push(`${tree.class} ${label}: rank must be true or absent`);
      try {
        const cls = classes[tree.class];
        if (!cls) throw new TreeFxError('unknown class');
        if (f.k === 'skill') {
          const id = f.skill ?? skill;
          if (!id) throw new TreeFxError('skill patch needs a "skill" here');
          if (!cls.skills.includes(id)) throw new TreeFxError(`skill ${id} is not a ${tree.class} skill`);
          if (!SKILLS[id]) throw new TreeFxError(`unknown skill ${id}`);
          patchSkill(cloneSkill(SKILLS[id]!), f, max, rules);
        } else if (f.k === 'passive') {
          if (!cls.passive) throw new TreeFxError('class has no passive');
          patchPassive(clone(cls.passive), f, max, rules);
        } else throw new TreeFxError(`fx kind "${(f as { k: string }).k}" is not supported yet`);
      } catch (e) {
        out.push(`${tree.class} ${label}: ${(e as Error).message}`);
      }
    }
  };
  for (const n of list) one(n.key, tree.nodes[n.key]?.fx, n.max, rowSkill(tree, n.row, rules));
  tree.mastery.bar.forEach((b, i) => one(`bar[${i}]`, b.fx, 1, undefined));
  return out;
}

/** Ağaç bu modda savaşa girer mi (ana şalter + mod bayrağı; _rules.json). */
export const treeEnabled = (mode: TreeMode | undefined, rules: TreeRules = TREE_RULES): boolean => !!mode && rules.enabled && !!rules.modes[mode];

/*
 * DEBUG odaklı kurulum (Debug > Campaign > 'Skill tree: focus build'; yalnızca bellekte, kayda yazılmaz): açıkken sefer / Endless kahramanı
 * (ana şalter kapalı olsa da) level'ına göre _rules.json > debugFocus ön ayarıyla odaklı kurulum alır; Quick Battle / multiplayer etkilenmez.
 */
let debugFocus: { dir: 'a' | 'b' } | null = null;
export const setDebugTreeFocus = (f: { dir: 'a' | 'b' } | null): void => {
  debugFocus = f ? { dir: f.dir } : null;
};
export const debugTreeFocus = (): { dir: 'a' | 'b' } | null => debugFocus;

/** Debug ön ayarının o class / level için dağılımı (ön ayar yoksa undefined). */
export function debugFocusAlloc(classId: string, level: number, dir: 'a' | 'b', rules: TreeRules = TREE_RULES): TreeAlloc | undefined {
  const tree = treeOf(classId);
  const p = rules.debugFocus?.[classId];
  if (!tree || !p) return undefined;
  return focusBuild(tree, p.rows, level, { dir, ...(p.ult ? { ult: p.ult } : {}) }, rules);
}

/** Güç katmanının girdisi (LoadoutSource ile uyumlu): sınıf, level ve (Faz 1b'den itibaren kayıttan gelen) ağaç dağılımı. */
export interface TreeSource {
  class: string;
  level?: number;
  tree?: TreeAlloc;
}

/**
 * Kahramanın savaş ağacı (loadoutSetup çağırır): mod açıksa kahramanın dağılımı doğrulanır ve derlenir. Ağacı olmayan class, kapalı mod,
 * geçersiz dağılım ya da etkisiz (fx null) düğümler -> undefined (birim bugünküyle aynı).
 * Debug odaklı kurulum açıkken (sefer / Endless; ana şalter kapalı olsa da): kayıtta KENDİ ağacı (en az 1 puan) olan kahraman kendi ağacıyla
 * girer, ağacı boş olan ön ayarı alır (Faz 1b kararı: oyuncunun kurduğu ağaç debug ön ayarından önce gelir; Gear'da kurulan ağaç şalter
 * kapalıyken bu araçla denenir, ön ayar için ağaç Set level ile sıfırlanır).
 */
export function treeSetupFor(src: TreeSource, mode: TreeMode | undefined, rules: TreeRules = TREE_RULES): TreeSetup | undefined {
  const tree = treeOf(src.class);
  if (!tree || !mode) return undefined;
  const level = Math.max(1, Math.floor(src.level ?? 1));
  const own = src.tree && spent(src.tree) > 0 ? src.tree : undefined;
  const dbg = !!debugFocus && (mode === 'campaign' || mode === 'endless');
  const alloc = dbg ? (own ?? debugFocusAlloc(src.class, level, debugFocus!.dir, rules)) : treeEnabled(mode, rules) ? src.tree : undefined;
  if (!alloc || validate(tree, level, alloc, rules)) return undefined;
  return compileTree(tree, alloc, rules);
}
