// Skill ağacı DERLEYİCİSİ (saf; docs/design/skill-tree-implementation.md 2.3 + 4.1): kahramanın ağaç dağılımı -> motorun anladığı TreeSetup
// (UnitSetup.tree: yamalı tam skill tanımları + yamalı pasif; skill id'leri aynı). Motor ağaç biçimini bilmez.
// Faz 1a: (a) düz sayı yamaları (fx k 'skill' / 'passive'). Faz 2a: (b) addEffect / replaceEffect / unitFx, (c) C1 koşul + C2 Rage kancaları (k 'hook').
// Uygulama sırası: satır 0 -> 3, sonra ult, sonra Mastery bar; satır içinde sütun sırası (f1 -> f2 -> f3 -> n0 -> r -> e -> m/f -> v), ult'ta kol x adım.
// `set` kendinden öncekileri ezer, sonrakiler onun üstüne biner; `base` (temel değeri değiştirir) TÜM yamalardan önce uygulanır. '+X% power' = op 'pct': anlamı _rules.json > percentRule (TEK yer; varsayılan 'mul').
import { classes, formulas, grounds as GROUNDS, skills as SKILLS, statuses as STATUSES, summons as SUMMON_DEFS } from '../engine/content';
import { areaDefProblem } from '../engine/area-shape';
import { COND, COST_TARGET_CONDS, FX_THRESHOLD_FIELDS, HEAL_POINTS, mergeFxValue, MOD_SPEC, POTENCY_FIELDS, SCALE, SELF_CONDS, SELF_SCALES, SET_MODS, TRIGGER_BASES, TRIGGER_EVENTS, TRIGGER_TARGETS, UNIT_FX_KEYS, whenIsLate, type CondMod, type HealHook, type HookAt, type ModGroup, RULE_KINDS, type RuleHook, type RuleKind, type TreeHook, type TriggerAction, type TriggerEvent, type TriggerHook } from '../engine/tree-hooks';
import type { ItemEffects, PassiveDef, RandomStatusOption, SkillDef, SkillEffect, SkillModeDef, SkillModeSet, TreeSetup } from '../engine/types';
import { TREE_RULES, treeOf, type TreeData, type TreeFx, type TreeMode, type TreeRules } from './skill-tree-data';
import { barReached, focusBuild, rankOf, spent, treeNodes, validate, type TreeAlloc } from './skill-tree';

/** Seçici türü -> yamalanabilir alanlar (beyaz liste; bilinmeyen seçici / alan = derleme hatası, veri testi kırmızı). */
export const FX_FIELDS: Record<string, readonly string[]> = {
  /** Skill'in kendisi. */
  self: ['cost.amount', 'cost.ofCurrent', 'cost.hpFallback', 'cooldown', 'initialCooldown', 'count', 'turnCost'],
  /** Tüm hasar etkileri ('damage') ya da N. hasar etkisi ('damage:1', 0 tabanlı). */
  damage: ['power', 'lifesteal', 'ignoreDefense', 'critBonus', 'powerPerRage', 'executeBonus', 'falloff', 'repeatChance'],
  /** 'status:<durum>' (ör. status:slow). */
  status: ['turns', 'chance'],
  taunt: ['turns', 'breakRatio', 'allyDamageMult'],
  guard: ['turns', 'share'],
  /** 'ground' ya da 'ground:<id>' (Faz 4c: stackMult = aynı zeminin üstüne atılınca, centerMult = merkez hücre çarpanı). */
  ground: ['turns', 'power', 'stackMult', 'centerMult'],
  /** 'bonusScale:<stat>' (hasar etkilerindeki ek ölçek; ör. bonusScale:armor). */
  bonusScale: ['pct'],
  // Faz 2a+ (a*): diğer etki türlerinin sayıları
  heal: ['power', 'missingHpBonus'],
  hot: ['power', 'turns'],
  shield: ['power', 'bonusPerMana'],
  revive: ['hpRatio', 'mpRatio'],
  manaBurn: ['amount', 'pctMax', 'gainRatio', 'onEmpty.chance', 'onEmpty.turns', 'onEmpty.damage.power', 'onEmpty.damage'],
  /** Hasar etkilerinin bahsi (damage.bet). */
  bet: ['ratio', 'winMult', 'loseMult', 'perStake', 'winChance', 'hpStake'],
  omen: ['stacks', 'critStacks'],
  dot: ['power', 'turns'],
  bond: ['ratio', 'turns', 'permanent'],
  summon: ['lifespan'],
  dispel: ['count'],
  /** 'randomStatus:<durum>' (randomStatus seçeneği). */
  randomStatus: ['turns', 'weight'],
};
/** op 'remove' ile silinebilen alanlar (motorun "yok" anlamı: lifespan yok = süresiz çağrı, count yok = hepsi, chance yok = kesin). */
const REMOVABLE = new Set(['lifespan', 'count', 'chance', 'falloff', 'cost.ofCurrent', 'initialCooldown', 'onEmpty.damage']);
/** Faz 2c: op 'on' ile açılan bayrak alanları (Crimson Covenant: bond permanent). Sayı op'u bunlara uygulanmaz. */
const FLAG_FIELDS = new Set(['permanent']);
/** Faz 2c: pasif alanı tanımda yoksa başlangıç değerini aldığı alan (Deep Rot: dotTurns <- turns; Anchored Stone: selfPct <- pct). */
const PASSIVE_ALIAS: Record<string, string> = { dotTurns: 'turns', selfPct: 'pct' };
/** Faz 2c: op 'remove' ile silinebilen pasif alanları (Black Mold: Nature's Grudge'ın Slow'u). */
const PASSIVE_REMOVABLE = new Set(['status']);
/** Faz 4c: pasifte hiç olmayan alanın başlangıç değeri (Exposed Perch: Sharpshooter extraRows 0). */
const PASSIVE_DEFAULTS: Record<string, number> = { extraRows: 0 };

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
  missingHpBonus: 0,
  bonusPerMana: 0,
  gainRatio: 0,
  amount: 0,
  pctMax: 0,
  loseMult: 1,
  perStake: 0,
  'cost.ofCurrent': 0,
  // Faz 5c: Soul Exchange yedek can bedeli, Mortgage ek can bahsi (yoksa 0 = yok)
  'cost.hpFallback': 0,
  hpStake: 0,
  stackMult: 1,
  centerMult: 1,
};

/** Tam sayı alanlar (sonuç yuvarlanır, en az 0). */
const INT_FIELDS = new Set(['cost.amount', 'cooldown', 'initialCooldown', 'count', 'turns', 'stacks', 'critStacks', 'lifespan', 'onEmpty.turns', 'amount']);

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
    case 'ground':
      if (arg !== undefined) return { kind: 'ground', targets: effects.filter((e) => e.type === 'ground' && e.ground === arg) };
      return { kind: 'ground', targets: effects.filter((e) => e.type === 'ground') };
    case 'taunt':
    case 'guard':
    case 'heal':
    case 'hot':
    case 'shield':
    case 'revive':
    case 'manaBurn':
    case 'omen':
    case 'dot':
    case 'bond':
    case 'summon':
    case 'dispel':
      if (arg !== undefined) break;
      return { kind: head, targets: effects.filter((e) => e.type === head) };
    case 'bet':
      if (arg !== undefined) break;
      return { kind: 'bet', targets: damage.map((e) => e.bet as Bag | undefined).filter((b): b is Bag => !!b) };
    case 'randomStatus':
      if (!arg) break;
      return { kind: 'randomStatus', targets: effects.filter((e) => e.type === 'randomStatus').flatMap((e) => (e.options as Bag[]).filter((o) => o.status === arg)) };
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
function applyOp(cur: unknown, fx: Extract<TreeFx, { k: 'skill' | 'passive' | 'stat' }>, rank: number, field: string, rules: TreeRules): number {
  if (fx.op === 'remove' || fx.op === 'on') throw new TreeFxError(`op "${fx.op}" is not allowed for "${field}"`);
  if (FLAG_FIELDS.has(field)) throw new TreeFxError(`"${field}" is a flag: use op "on"`);
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

/**
 * Skill yaması (yerinde, kopya üzerinde). `lenient` (Faz 2c, compileTree): seçici hiçbir etkiye uymuyorsa (birlikte alınan başka düğüm o etkiyi
 * kaldırdı / değiştirdi) yama SESSİZCE atlanır; checkTreeFx katı kalır (hata).
 */
function patchSkill(def: SkillDef, fx: Extract<TreeFx, { k: 'skill' }>, rank: number, rules: TreeRules, lenient = false): void {
  const { kind, targets } = resolve(def, fx.sel);
  if (!FX_FIELDS[kind]!.includes(fx.f)) throw new TreeFxError(`field "${fx.f}" is not patchable for selector "${fx.sel}"`);
  if (!targets.length) {
    if (lenient) return;
    throw new TreeFxError(`selector "${fx.sel}" matches nothing in ${def.id}`);
  }
  if (fx.op === 'on') {
    // Bayrak aç (Crimson Covenant: bağ süresiz)
    if (!FLAG_FIELDS.has(fx.f)) throw new TreeFxError(`op "on" is only for a flag field`);
    for (const t of targets) t[fx.f] = true;
    return;
  }
  if (fx.op === 'remove') {
    // Alanı sil (süresiz çağrı, hepsini sil, kesin şans...): yalnızca REMOVABLE alanlar
    if (!REMOVABLE.has(fx.f)) throw new TreeFxError(`field "${fx.f}" cannot be removed`);
    for (const t of targets) {
      const parts = fx.f.split('.');
      const owner = parts.length > 1 ? (getPath(t, parts.slice(0, -1).join('.')) as Bag | undefined) : t;
      if (owner) delete owner[parts[parts.length - 1]!];
    }
    return;
  }
  for (const t of targets) setPath(t, fx.f, applyOp(getPath(t, fx.f), fx, rank, fx.f, rules));
  // Faz 5c: yedek can bedeli yalnızca MP bedelli skill'de, ek can bahsi yalnızca MP bahsinde; oran (0, 1)
  if (fx.f === 'cost.hpFallback' && (def.cost.resource !== 'mp' || !((def.cost.hpFallback ?? 0) > 0 && def.cost.hpFallback! < 1))) throw new TreeFxError('cost.hpFallback needs an MP cost and a ratio in (0, 1)');
  if (fx.f === 'hpStake' && targets.some((t) => t.resource !== 'mp' || !((t.hpStake as number) > 0 && (t.hpStake as number) < 1))) throw new TreeFxError('hpStake needs an MP bet and a ratio in (0, 1)');
}

/**
 * Pasif yaması (yerinde, kopya üzerinde): alan pasif etkisinde sayı olmalı. Faz 2c: tanımda olmayan ayrı alan başlangıcını eşinden alır
 * (PASSIVE_ALIAS: dotTurns <- turns, selfPct <- pct); op 'remove' yalnızca PASSIVE_REMOVABLE alanları siler (Nature's Grudge status).
 */
function patchPassive(p: PassiveDef, fx: Extract<TreeFx, { k: 'passive' }>, rank: number, rules: TreeRules): void {
  const eff = p.effect as unknown as Bag;
  if (fx.op === 'remove') {
    if (!PASSIVE_REMOVABLE.has(fx.f) || eff[fx.f] === undefined) throw new TreeFxError(`passive ${p.id} field "${fx.f}" cannot be removed`);
    delete eff[fx.f];
    return;
  }
  let cur = getPath(eff, fx.f);
  if (cur === undefined && PASSIVE_ALIAS[fx.f]) cur = getPath(eff, PASSIVE_ALIAS[fx.f]!);
  if (cur === undefined && PASSIVE_DEFAULTS[fx.f] !== undefined) {
    cur = PASSIVE_DEFAULTS[fx.f];
    eff[fx.f] = cur;
  }
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

const isBase = (p: Patch): boolean => (p.fx.k === 'skill' || p.fx.k === 'passive') && p.fx.op === 'base';

/**
 * Dağılımdaki etkin yamalar, uygulama sırasıyla (fx null düğümler atlanır). Faz 2c: `needs: '<düğüm>'` taşıyan yama o düğümün son yamasının hemen
 * ARKASINA taşınır (Iron Oath 3.fb, Blood Oath 3.mb'den önce uygulanırdı); düğüm alınmadıysa yerinde kalır (seçici uymazsa sessizce atlanır).
 */
/** Faz 4c: `onlyWith` (hepsi alınmış) / `unless` (hiçbiri alınmamış) birleşim koşulu (Turned Blade x Reckless Grace, Unending Mark x Hungry Leap). */
function comboOk(f: TreeFx, alloc: TreeAlloc): boolean {
  if (f.onlyWith && !f.onlyWith.every((k) => rankOf(alloc, k) > 0)) return false;
  if (f.unless && f.unless.some((k) => rankOf(alloc, k) > 0)) return false;
  return true;
}

function patchesOf(tree: TreeData, alloc: TreeAlloc, rules: TreeRules): Patch[] {
  const out: Patch[] = [];
  for (const n of treeNodes(rules).list) {
    const rank = rankOf(alloc, n.key);
    const fx = tree.nodes[n.key]?.fx;
    if (rank <= 0 || !fx) continue;
    const skill = rowSkill(tree, n.row, rules);
    for (const f of fx) if (comboOk(f, alloc)) out.push({ fx: f, rank, ...(skill ? { skill } : {}), label: n.key });
  }
  barReached(alloc, rules).forEach((on, i) => {
    const fx = tree.mastery.bar[i]?.fx;
    if (on && fx) for (const f of fx) out.push({ fx: f, rank: 1, label: `bar[${i}]` });
  });
  // `base` önce (temel değer), sonra kalanlar sütun sırasıyla (sıralama kararlı)
  const list = [...out.filter(isBase), ...out.filter((p) => !isBase(p))];
  for (const p of list.filter((x) => x.fx.needs)) {
    const at = list.indexOf(p);
    const last = list.map((x) => x.label).lastIndexOf(p.fx.needs!);
    if (last < 0 || at > last) continue;
    list.splice(at, 1);
    list.splice(last, 0, p);
  }
  return list;
}

/** Derleme birikimi (compileTree tek, checkTreeFx fx başına taze). */
interface Acc {
  skills: Record<string, SkillDef>;
  passive?: PassiveDef;
  fx: Record<string, unknown>;
  fxNodes: Record<string, string[]>;
  hooks: TreeHook[];
  /** Faz 2c (fx k 'stat'): maks can çarpanı. */
  hpMult?: number;
  /** Faz 2c: hoşgörülü derleme (compileTree): uymayan yer seçicisi başa / sona, uymayan yama / kaldırma / değiştirme atlanır. */
  lenient?: boolean;
  /** Faz 4c (fx k 'stat' f armorAdd; yalnızca çağrı): düz zırh eki. */
  armorAdd?: number;
  /** Faz 5a (fx k 'stat' f armorMult; yalnızca kahraman): kendi zırh çarpanı. */
  armorMult?: number;
  /** Faz 4c: çağrıya geçen yamalar (çağrı id'si; ceset tüketen çağrıda '<id>#fed' beslenmiş kopyası). */
  summons?: Record<string, Acc>;
  /** Faz 8: skill biçim fx'leri (skill id -> sırayla; biçimler setupOf'ta son yamalı tanımdan kurulur). */
  modes?: Record<string, Array<{ fx: Extract<TreeFx, { k: 'mode' }>; node: string }>>;
}
/** Faz 4c: sınıfın çağırdığı birimler (id -> ceset tüketen çağrı mı: fed / unfed ayrı derlenir). */
const summonsOf = (clsId: string): Record<string, boolean> => {
  const out: Record<string, boolean> = {};
  for (const s of classes[clsId]?.skills ?? []) for (const e of SKILLS[s]?.effects ?? []) if (e.type === 'summon') out[e.unit] = (out[e.unit] ?? false) || !!e.consumeCorpse;
  return out;
};
const SUMMON_FX_KINDS: ReadonlySet<string> = new Set(['skill', 'addEffect', 'stat', 'hook']);
const newAcc = (lenient = false): Acc => ({ skills: {}, fx: {}, fxNodes: {}, hooks: [], ...(lenient ? { lenient } : {}) });

/** addEffect / replaceEffect: izin verilen etki türleri ve zorunlu alanları (var olan SkillEffect türleri; çağırma / diriltme / yığın gibi yapısal türler yok). */
const EFFECT_FIELDS: Record<string, readonly string[]> = {
  damage: ['damageType', 'scale', 'power'],
  status: ['status', 'turns'],
  randomStatus: ['options'],
  dispel: ['status'],
  shield: ['scale', 'power'],
  taunt: ['turns'],
  guard: ['turns', 'share'],
  ground: ['ground', 'turns', 'scale', 'power'],
  heal: ['scale', 'power'],
  hot: ['scale', 'power', 'turns'],
  dot: ['status', 'scale', 'power', 'turns'],
  selfDamage: ['ratio'],
  pull: ['to'],
};
/** addEffect / replaceEffect: ağaç bayrakları ve izinli olduğu etki türleri (preHit: durum hasardan önce; permanent: süresiz; kinds / self: dispel). */
const EFFECT_FLAGS: Record<string, readonly string[]> = {
  preHit: ['status'],
  permanent: ['status', 'dot', 'ground', 'bond'],
  kinds: ['dispel'],
  self: ['dispel', 'status', 'shield'],
  // Faz 2c: seed'li rastgele silme (Prying Blade), Dark Bond'a bağlı guard (Blood Oath), etki koşulu (Ward Taunt)
  random: ['dispel'],
  bond: ['guard'],
  when: ['status', 'taunt', 'dispel', 'shield', 'guard'],
  // Faz 4c: zemin çarpanları ve tur başı durumları
  stackMult: ['ground'],
  centerMult: ['ground'],
  statuses: ['ground'],
  // Faz 5a (Grasp and Drag): yalnızca alanın arka sırası
  areaBack: ['pull'],
};
const SEL_RE = /^(damage(:\d+)?|status(:[a-z_]+)?)$/;
const HOOK_ATS: readonly HookAt[] = ['hit', 'doom', 'dot', 'ground', 'passiveHeal', 'smite', 'aura'];
/** Vuruş sonrası (hitIsCrit / killingBlow) kancalarda anlamlı değişiklikler (motor yalnızca bunları vuruştan sonra okur). */
const LATE_MODS = new Set(['powerMul', 'ignoreDefense', 'flatDamage', 'critDmgMul', 'lifesteal', 'lifestealMul', 'drainMul', 'drainAdd', 'addStatus', 'removeStatus', 'extendStatus']);

/** Tek değişikliğin biçim denetimi ve rank ölçeklemesi (sayılar x rank; Set biçimliler ve nesne içi süre / şans alanları ölçeklenmez). */
function checkMod(k: string, t: 'num' | 'bool' | 'obj' | 'str', v: unknown, r: number): unknown {
  if (t === 'bool') {
    if (typeof v !== 'boolean') throw new TreeFxError(`${k} must be true / false`);
    return v ? true : undefined;
  }
  if (t === 'num') {
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new TreeFxError(`mod ${k} must be a number`);
    return SET_MODS.has(k) ? v : r6(v * r);
  }
  if (t === 'str') {
    if (!knownStatus(v)) throw new TreeFxError(`${k}: unknown status "${String(v)}"`);
    return v;
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new TreeFxError(`${k} must be an object`);
  const o = v as Bag;
  if (k === 'statusPotency') {
    const out: Record<string, number> = {};
    for (const [f, x] of Object.entries(o)) {
      if (!POTENCY_FIELDS.has(f)) throw new TreeFxError(`statusPotency: unknown field "${f}"`);
      if (typeof x !== 'number' || !Number.isFinite(x)) throw new TreeFxError(`statusPotency.${f} must be a number`);
      out[f] = r6(x * r);
    }
    if (!Object.keys(out).length) throw new TreeFxError('statusPotency is empty');
    return out;
  }
  if (k === 'addStatus' || k === 'extendStatus') {
    if (!(k === 'extendStatus' && o.status === '*') && !knownStatus(o.status)) throw new TreeFxError(`${k}: unknown status "${String(o.status)}"`);
    if (typeof o.turns !== 'number' || !Number.isFinite(o.turns) || o.turns <= 0) throw new TreeFxError(`${k} needs "turns"`);
    if (o.chance !== undefined && (typeof o.chance !== 'number' || o.chance < 0 || o.chance > 1)) throw new TreeFxError(`${k}.chance must be 0-1`);
    if (o.self !== undefined && (k !== 'addStatus' || typeof o.self !== 'boolean')) throw new TreeFxError(`${k}.self is not allowed`);
    for (const f of Object.keys(o)) if (!['status', 'turns', 'chance', 'self'].includes(f)) throw new TreeFxError(`${k}: unknown field "${f}"`);
    return clone(o);
  }
  throw new TreeFxError(`mod ${k} has no checker`);
}

const knownStatus = (s: unknown): boolean => typeof s === 'string' && !!STATUSES[s];
/** Faz 4a olay süzgeci: statuses.json durumları + motorun özel kodlu durumları (taunt / guard / regen; eylemle verilemez, yalnızca süzgeç). */
const filterStatus = (s: unknown): boolean => knownStatus(s) || s === 'taunt' || s === 'guard' || s === 'regen';

/** Skill içindeki etki seçicisinin uyduğu sıralar: 'damage' / 'damage:N' (N. hasar etkisi) / 'status' / 'status:<durum>' / etki türü ('taunt'). */
function effectIndexes(def: SkillDef, sel: string): number[] {
  const [head = '', arg] = sel.split(':');
  const out: number[] = [];
  let d = -1;
  def.effects.forEach((e, i) => {
    if (e.type === 'damage') d++;
    const ok = head === 'damage' ? e.type === 'damage' && (arg === undefined || Number(arg) === d) : head === 'status' ? e.type === 'status' && (arg === undefined || e.status === arg) : arg === undefined && e.type === head;
    if (ok) out.push(i);
  });
  return out;
}

/** addEffect / replaceEffect etkisi: rank'a göre seçilir, türü / alanları / durum adları doğrulanır, kopyası düğüm kimliğini taşır. */
function treeEffectOf(fx: { effect?: SkillEffect; byRank?: SkillEffect[] }, rank: number, node: string): SkillEffect {
  const raw = fx.byRank?.length ? fx.byRank[Math.min(fx.byRank.length, Math.max(1, rank)) - 1] : fx.effect;
  if (!raw || typeof raw !== 'object') throw new TreeFxError('needs "effect" or "byRank"');
  const e = clone(raw) as unknown as Bag;
  // Ortak DoT değeri (plan 10a: Burning): statuses.json > dot'ta scale / power / turns varsa eksik alanlar oradan (TEK yer)
  if (e.type === 'dot' && knownStatus(e.status)) {
    const d = STATUSES[e.status as string]!.dot;
    if (d?.scale !== undefined && e.scale === undefined) e.scale = d.scale;
    if (d?.power !== undefined && e.power === undefined) e.power = d.power;
    if (d?.turns !== undefined && e.turns === undefined) e.turns = d.turns;
  }
  for (const [flag, types] of Object.entries(EFFECT_FLAGS)) if (e[flag] !== undefined && !types.includes(e.type as string)) throw new TreeFxError(`"${flag}" is not allowed on a ${String(e.type)} effect`);
  for (const flag of ['preHit', 'permanent', 'self', 'random', 'bond', 'areaBack'] as const) if (e[flag] !== undefined && typeof e[flag] !== 'boolean') throw new TreeFxError(`"${flag}" must be true / false`);
  if (e.type === 'pull' && e.to !== 'laneFront' && e.to !== 'stepForward') throw new TreeFxError('pull to must be laneFront / stepForward');
  if (e.when !== undefined) checkWhen(e.when, false);
  if (e.kinds !== undefined && !(Array.isArray(e.kinds) && e.kinds.length && e.kinds.every(knownStatus))) throw new TreeFxError('"kinds" must be a list of known statuses');
  const need = EFFECT_FIELDS[e.type as string];
  if (!need) throw new TreeFxError(`effect type "${String(e.type)}" is not allowed here`);
  for (const f of need) if (e[f] === undefined) throw new TreeFxError(`${String(e.type)} effect needs "${f}"`);
  if ((e.type === 'status' || e.type === 'dot') && !knownStatus(e.status)) throw new TreeFxError(`unknown status "${String(e.status)}"`);
  if (e.type === 'randomStatus' && (!Array.isArray(e.options) || !e.options.length || !(e.options as Bag[]).every((o) => knownStatus(o.status) && typeof o.turns === 'number' && typeof o.weight === 'number')))
    throw new TreeFxError('randomStatus options need known status, turns and weight');
  if (e.type === 'ground' && !GROUNDS[e.ground as string]) throw new TreeFxError(`unknown ground "${String(e.ground)}"`);
  if (e.type === 'dispel' && e.status !== 'debuff' && e.status !== 'buff') throw new TreeFxError('dispel status must be debuff or buff');
  if (e.chance !== undefined && (typeof e.chance !== 'number' || e.chance < 0 || e.chance > 1)) throw new TreeFxError('chance must be 0-1');
  e.treeNode = node;
  return e as unknown as SkillEffect;
}

/** unitFx değeri: sayısal alanlar x rank (eşik / süre alanları hariç; çarpan anahtarı 1 + (v - 1) x rank). */
function rankFx(key: string, v: unknown, rank: number): unknown {
  if (typeof v === 'number') return key === 'tierDamageMult' ? 1 + (v - 1) * rank : r6(v * rank);
  if (Array.isArray(v) || typeof v !== 'object' || v === null) return v;
  return Object.fromEntries(Object.entries(v as Bag).map(([k, x]) => [k, typeof x === 'number' && !FX_THRESHOLD_FIELDS.has(k) ? r6(x * rank) : x]));
}
/** unitFx değerinin kaba biçim denetimi (sayı sonlu; nesne / dizideki durum adları statuses.json'da). */
function checkFxValue(key: string, v: unknown): void {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new TreeFxError(`unitFx ${key} must be a finite number`);
    return;
  }
  if (typeof v === 'boolean') return;
  if (!v || typeof v !== 'object') throw new TreeFxError(`unitFx ${key} has a bad value`);
  const items = Array.isArray(v) ? (v as Bag[]) : [v as Bag];
  for (const o of items) {
    for (const [k, x] of Object.entries(o)) {
      if (typeof x === 'number' && !Number.isFinite(x)) throw new TreeFxError(`unitFx ${key}.${k} must be finite`);
      if (k === 'status' && !knownStatus(x)) throw new TreeFxError(`unitFx ${key}: unknown status "${String(x)}"`);
      if (k === 'statuses' && !(Array.isArray(x) && x.every(knownStatus))) throw new TreeFxError(`unitFx ${key}: unknown status in list`);
    }
  }
}

/** Koşul / ölçek nesnelerinin sözlük denetimi (`selfOnly`: bedel koşulu: kendi koşulları + hedefe bağlı bedel koşulları, COST_TARGET_CONDS). */
function checkWhen(when: unknown, selfOnly: boolean): void {
  if (when === undefined) return;
  if (!when || typeof when !== 'object' || Array.isArray(when)) throw new TreeFxError('"when" must be an object');
  for (const [k, v] of Object.entries(when as Bag)) {
    if (k === 'not' || k === 'before') checkWhen(v, selfOnly);
    else if (k === 'any') {
      if (!Array.isArray(v) || !v.length) throw new TreeFxError('"any" must be a non-empty list');
      v.forEach((w) => checkWhen(w, selfOnly));
    } else if (!COND[k]) throw new TreeFxError(`unknown condition "${k}"`);
    else if (selfOnly && !SELF_CONDS.has(k) && !COST_TARGET_CONDS.has(k)) throw new TreeFxError(`condition "${k}" cannot be used for a cost (no battle context)`);
  }
}
function checkScale(scale: unknown, selfOnly: boolean): void {
  if (scale === undefined) return;
  const keys = scale && typeof scale === 'object' && !Array.isArray(scale) ? Object.keys(scale) : [];
  if (keys.length !== 1) throw new TreeFxError('"scale" must have exactly one key');
  if (!SCALE[keys[0]!]) throw new TreeFxError(`unknown scale "${keys[0]}"`);
  if (selfOnly && !SELF_SCALES.has(keys[0]!)) throw new TreeFxError(`scale "${keys[0]}" cannot be used for a cost (no battle context)`);
}

/**
 * Tek fx'i birikime uygular (yerinde). `p.skill`: satırın skill'i (pasif satırı / bar: yok). Düğüm kimliği '<class>:<anahtar>'.
 * Hatalı fx TreeFxError fırlatır.
 */
function applyFx(tree: TreeData, acc: Acc, p: Patch, rules: TreeRules, unit?: string): void {
  const node = `${tree.class}:${p.label}`;
  const fx = p.fx;
  // Faz 4c: `summon: '<id>'` taşıyan fx çağrının kendi derlemesine gider (skill'leri çağrının skill'leri; satır skill'i yok). `fed: true`
  // yalnızca beslenmiş (ceset tüketmiş) çağrıya; ceset tüketen çağrıda diğer fx iki kopyaya da yazılır
  const su = (fx as { summon?: unknown }).summon;
  const fed = (fx as { fed?: unknown }).fed;
  if (su !== undefined && unit === undefined) {
    const can = summonsOf(tree.class);
    if (typeof su !== 'string' || can[su] === undefined || !SUMMON_DEFS[su]) throw new TreeFxError(`${tree.class} does not summon "${String(su)}"`);
    if (!SUMMON_FX_KINDS.has(fx.k)) throw new TreeFxError(`fx kind "${fx.k}" cannot go to a summon`);
    if (fed !== undefined && (fed !== true || !can[su])) throw new TreeFxError('"fed" must be true and needs a corpse-eating summon');
    const keys = fed ? [`${su}#fed`] : can[su] ? [su, `${su}#fed`] : [su];
    const { skill: _row, ...rest } = p;
    for (const key of keys) applyFx(tree, ((acc.summons ??= {})[key] ??= newAcc(acc.lenient)), rest, rules, su);
    return;
  }
  if (su === undefined && fed !== undefined) throw new TreeFxError('"fed" needs "summon"');
  const base = classes[tree.class]!;
  const cls = unit ? { ...base, skills: SUMMON_DEFS[unit]!.skills, passive: undefined, maxRage: undefined } : base;
  for (const k of ['onlyWith', 'unless'] as const) {
    const v = fx[k];
    if (v !== undefined && !(Array.isArray(v) && v.length && v.every((x) => typeof x === 'string' && tree.nodes[x]))) throw new TreeFxError(`"${k}" must be a list of node keys`);
  }
  const ownSkill = (id: string | undefined): SkillDef => {
    if (!id) throw new TreeFxError('needs a "skill" here');
    if (!cls.skills.includes(id)) throw new TreeFxError(`skill ${id} is not a ${tree.class} skill`);
    const base = SKILLS[id];
    if (!base) throw new TreeFxError(`unknown skill ${id}`);
    return (acc.skills[id] ??= cloneSkill(base));
  };
  /** Kanca kapsamı: '*' = her skill, yoksa fx.skill ya da satırın skill'i (pasif satırı / bar: her skill). */
  const scope = (s: string | undefined): string | undefined => {
    const id = s === '*' ? undefined : (s ?? p.skill);
    if (id && !cls.skills.includes(id)) throw new TreeFxError(`skill ${id} is not a ${tree.class} skill`);
    return id;
  };
  switch (fx.k) {
    case 'skill': {
      const id = fx.skill ?? p.skill;
      patchSkill(ownSkill(id), fx, p.rank, rules, acc.lenient);
      return;
    }
    case 'stat': {
      // Faz 2c (Gaunt Frame): birim stat çarpanı; yalnızca maks can (hpMult, op mul: x (1 + v)). Motor stat türetiminde UnitModifiers.hpMult ile çarpar
      if ((fx.f as string) === 'armorAdd') {
        // Faz 4c (Grave Plate): çağrının düz zırh eki (op add)
        if (!unit) throw new TreeFxError('stat armorAdd only works on a summon');
        if (fx.op !== 'add') throw new TreeFxError('stat armorAdd only takes op "add"');
        acc.armorAdd = r6((acc.armorAdd ?? 0) + applyOp(0, fx, p.rank, fx.f, rules));
        return;
      }
      if ((fx.f as string) === 'armorMult') {
        // Faz 5a (Pledged Plate): birimin kendi zırh çarpanı (op mul: x (1 + v))
        if (unit) throw new TreeFxError('stat armorMult does not work on a summon');
        if (fx.op !== 'mul') throw new TreeFxError('stat armorMult only takes op "mul"');
        acc.armorMult = r6((acc.armorMult ?? 1) * applyOp(1, fx, p.rank, fx.f, rules));
        return;
      }
      if ((fx.f as string) !== 'hpMult') throw new TreeFxError(`unknown stat "${String(fx.f)}"`);
      if (fx.op !== 'mul') throw new TreeFxError('stat hpMult only takes op "mul"');
      acc.hpMult = r6((acc.hpMult ?? 1) * applyOp(1, fx, p.rank, fx.f, rules));
      return;
    }
    case 'passive':
      if (!cls.passive) throw new TreeFxError(`${tree.class} has no passive`);
      patchPassive((acc.passive ??= clone(cls.passive)), fx, p.rank, rules);
      return;
    case 'addEffect': {
      const def = ownSkill(fx.skill ?? p.skill);
      const e = treeEffectOf(fx, p.rank, node);
      if ([fx.after, fx.before, fx.first].filter((x) => x !== undefined).length > 1) throw new TreeFxError('use only one of "after", "before", "first"');
      if (fx.first !== undefined && fx.first !== true) throw new TreeFxError('"first" must be true');
      // Faz 2c: first = başa (Spellsplitter: silme hasardan ÖNCE). Hoşgörülü derlemede uymayan yer seçicisi: before -> başa, after -> sona
      let at = fx.first ? 0 : def.effects.length;
      const where = fx.after ?? fx.before;
      if (where) {
        const idx = effectIndexes(def, where);
        if (!idx.length && !acc.lenient) throw new TreeFxError(`selector "${where}" matches nothing in ${def.id}`);
        at = !idx.length ? (fx.before ? 0 : def.effects.length) : fx.after ? idx[idx.length - 1]! + 1 : idx[0]!;
      }
      def.effects.splice(at, 0, e);
      return;
    }
    case 'groundStatus': {
      // Faz 4c (Hushing Moss, Killing Field): skill'in bu zeminine tur başı durumu ekler (zemini başka düğüm ekliyorsa needs ile)
      const def = ownSkill(fx.skill ?? p.skill);
      if (!GROUNDS[fx.ground]) throw new TreeFxError(`unknown ground "${String(fx.ground)}"`);
      if (!knownStatus(fx.status)) throw new TreeFxError(`unknown status "${String(fx.status)}"`);
      if (fx.turns !== undefined && !(Number.isInteger(fx.turns) && fx.turns >= 1)) throw new TreeFxError('turns must be an integer >= 1');
      if (fx.mpZero !== undefined && fx.mpZero !== true) throw new TreeFxError('mpZero must be true');
      const gs = def.effects.filter((e) => e.type === 'ground' && e.ground === fx.ground) as Array<Extract<SkillEffect, { type: 'ground' }>>;
      if (!gs.length) {
        if (acc.lenient) return;
        throw new TreeFxError(`ground ${fx.ground} is not in ${def.id}`);
      }
      for (const g of gs) (g.statuses ??= []).push({ status: fx.status, ...(fx.turns !== undefined ? { turns: fx.turns } : {}), ...(fx.mpZero ? { mpZero: true } : {}) });
      return;
    }
    case 'removeEffect': {
      // Etkiyi kaldır (Not Yet: hasar yok). Hasar etkisi kalmazsa skill yine isabet zarı atar (treeHitRoll; plan 10a)
      const def = ownSkill(fx.skill ?? p.skill);
      const idx = effectIndexes(def, fx.sel ?? '');
      if (!idx.length) {
        if (acc.lenient) return;
        throw new TreeFxError(`selector "${fx.sel}" matches nothing in ${def.id}`);
      }
      const hadDamage = def.effects.some((e) => e.type === 'damage');
      def.effects = def.effects.filter((_, i) => !idx.includes(i));
      if (hadDamage && !def.effects.some((e) => e.type === 'damage')) def.treeHitRoll = true;
      return;
    }
    case 'replaceEffect': {
      const def = ownSkill(fx.skill ?? p.skill);
      const idx = effectIndexes(def, fx.sel ?? '');
      if (!idx.length) {
        if (acc.lenient) return;
        throw new TreeFxError(`selector "${fx.sel}" matches nothing in ${def.id}`);
      }
      if (fx.collapse !== undefined) {
        // Faz 2c (Desperate Sap): HoT tek seferde şifa olur: güç = HoT gücü x süre x collapse (derleme anındaki süre; Deep Spring dahil)
        if (typeof fx.collapse !== 'number' || !(fx.collapse > 0) || fx.effect || fx.byRank) throw new TreeFxError('"collapse" must be a positive number, without "effect"');
        for (const i of idx) {
          const h = def.effects[i]!;
          if (h.type !== 'hot') throw new TreeFxError('"collapse" only works on a hot effect');
          def.effects[i] = { type: 'heal', scale: h.scale, power: r6(h.power * h.turns * fx.collapse), treeNode: node } as SkillEffect;
        }
        return;
      }
      for (const i of idx) def.effects[i] = treeEffectOf(fx, p.rank, node);
      return;
    }
    case 'unitFx': {
      const entries = fx.fx && typeof fx.fx === 'object' ? Object.entries(fx.fx) : [];
      if (!entries.length) throw new TreeFxError('unitFx needs at least one key');
      for (const [k, v] of entries) {
        if (!(UNIT_FX_KEYS as readonly string[]).includes(k)) throw new TreeFxError(`unknown unitFx key "${k}"`);
        checkFxValue(k, v);
        acc.fx[k] = mergeFxValue(k, acc.fx[k], fx.rank ? rankFx(k, v, p.rank) : clone(v));
        const nodes = (acc.fxNodes[k] ??= []);
        if (!nodes.includes(node)) nodes.push(node);
      }
      return;
    }
    case 'hook': {
      // rank: true = değişiklik sayıları ve procChance x rank; rank: 'chance' (Faz 2c) = YALNIZCA procChance x rank (sabit +1 tur çarpılmaz)
      const r = fx.rank === true ? p.rank : 1;
      if (fx.drop !== undefined) {
        // Faz 2c (Blind Zeal): o düğümün DAHA ÖNCE eklenmiş kancaları kaldırılır (bu kanca onun yerine geçer)
        if (typeof fx.drop !== 'string' || !fx.drop) throw new TreeFxError('"drop" must be a node key');
        const gone = `${tree.class}:${fx.drop}`;
        acc.hooks = acc.hooks.filter((h) => h.node !== gone);
      }
      if (fx.h === 'rule') {
        // Faz 5a: C6 kural sözlüğü (çağrı derlemesinde `unit` dolu)
        acc.hooks.push(compileRule(tree, cls, fx, node, r, unit));
        return;
      }
      if (fx.h === 'target') {
        // Faz 5a: C5 hedef / alan / aura: derleme anında skill / pasif kopyası yamalanır (kanca eklenmez)
        const skillKeys = (['area', 'target', 'count', 'splash', 'range', 'open', 'priority', 'gather', 'guard', 'groundWide'] as const).some((k) => fx[k] !== undefined);
        applyTarget(fx, acc, skillKeys ? ownSkill(fx.skill ?? p.skill) : null, cls, r);
        return;
      }
      if (fx.h === 'cond') {
        checkWhen(fx.when, false);
        checkScale(fx.scale, false);
        if (fx.sel !== undefined && !SEL_RE.test(fx.sel)) throw new TreeFxError(`bad selector "${fx.sel}"`);
        if (!fx.mod || typeof fx.mod !== 'object') throw new TreeFxError('cond needs "mod"');
        const at: HookAt = fx.at ?? 'hit';
        if (!HOOK_ATS.includes(at)) throw new TreeFxError(`unknown hook point "${String(at)}"`);
        const late = whenIsLate(fx.when);
        if (late && at !== 'hit') throw new TreeFxError('hitIsCrit / killingBlow only work on a skill hit');
        const mod: Bag = {};
        let cost: number | undefined;
        let costMul: number | undefined;
        const groups = new Set<ModGroup>();
        for (const [k, v] of Object.entries(fx.mod)) {
          if (k === 'cost' || k === 'costMul') {
            if (typeof v !== 'number' || !Number.isFinite(v)) throw new TreeFxError(`mod ${k} must be a number`);
            if (k === 'cost') cost = Math.round(v * r);
            else costMul = r6(v * r);
            continue;
          }
          const spec = MOD_SPEC[k as keyof CondMod];
          if (!spec) throw new TreeFxError(`unknown mod "${k}"`);
          if (spec.at ? !spec.at.includes(at) : at !== 'hit') throw new TreeFxError(`mod ${k} cannot be used at "${at}"`);
          if (late && !LATE_MODS.has(k)) throw new TreeFxError(`mod ${k} cannot be used with hitIsCrit / killingBlow`);
          groups.add(spec.g);
          mod[k] = checkMod(k, spec.t, v, r);
          if (mod[k] === undefined) delete mod[k];
        }
        const keys = Object.keys(mod);
        const gl = [...groups];
        if (gl.length > 1 && !(gl.length === 2 && groups.has('damage') && groups.has('proc'))) throw new TreeFxError(`mods from different groups (${gl.join(', ')}) need two separate hooks`);
        const g0 = gl[0];
        if (fx.sel && g0) {
          const want = g0 === 'status' ? 'status' : g0 === 'damage' || g0 === 'proc' ? 'damage' : null;
          if (!want || !fx.sel.startsWith(want)) throw new TreeFxError(`mods do not fit selector "${fx.sel}"`);
        }
        if (fx.sel && at !== 'hit') throw new TreeFxError('a selector only works at the "hit" point');
        if (fx.procChance !== undefined && (typeof fx.procChance !== 'number' || !(fx.procChance > 0) || fx.procChance > 1)) throw new TreeFxError('procChance must be in (0, 1]');
        if (fx.rank === 'chance' && fx.procChance === undefined) throw new TreeFxError('rank "chance" needs "procChance"');
        const rc = fx.rank === true || fx.rank === 'chance' ? p.rank : 1;
        const skill = scope(fx.skill);
        if (cost !== undefined || costMul !== undefined) {
          checkWhen(fx.when, true);
          checkScale(fx.scale, true);
          const def = ownSkill(skill);
          (def.cost.cond ??= []).push({ node, add: cost ?? 0, ...(costMul !== undefined ? { mul: costMul } : {}), ...(JSON.stringify(fx.when ?? {}).includes('firstUseOfSkill') ? { skill: def.id } : {}), ...(fx.when ? { when: clone(fx.when) } : {}), ...(fx.scale ? { scale: clone(fx.scale) } : {}) });
        }
        if (keys.length)
          acc.hooks.push({
            h: 'cond',
            node,
            ...(skill ? { skill } : {}),
            ...(fx.sel ? { sel: fx.sel } : {}),
            ...(at !== 'hit' ? { at } : {}),
            ...(fx.when ? { when: clone(fx.when) } : {}),
            ...(fx.scale ? { scale: clone(fx.scale) } : {}),
            ...(fx.procChance !== undefined ? { procChance: Math.min(1, r6(fx.procChance * rc)) } : {}),
            ...(late ? { late: true } : {}),
            mod: mod as CondMod,
          });
        else if (cost === undefined && costMul === undefined) throw new TreeFxError('cond has no effect');
        return;
      }
      if (fx.h === 'rage') {
        checkWhen(fx.when, false);
        checkScale(fx.scale, false);
        if (fx.on !== undefined && fx.on !== 'hit' && fx.on !== 'cast') throw new TreeFxError(`unknown trigger "${String(fx.on)}"`);
        if (fx.rule !== undefined && fx.rule !== 'tallyAll') throw new TreeFxError(`unknown rule "${String(fx.rule)}"`);
        for (const k of ['gain', 'floor', 'cost'] as const) if (fx[k] !== undefined && (typeof fx[k] !== 'number' || !Number.isFinite(fx[k]))) throw new TreeFxError(`${k} must be a number`);
        const skill = scope(fx.skill);
        let any = false;
        if (fx.cost !== undefined) {
          checkWhen(fx.when, true);
          checkScale(fx.scale, true);
          if (fx.after !== undefined && !cls.skills.includes(fx.after)) throw new TreeFxError(`skill ${fx.after} is not a ${tree.class} skill`);
          const def = ownSkill(skill);
          (def.cost.cond ??= []).push({ node, add: Math.round(fx.cost * r), ...(fx.when ? { when: clone(fx.when) } : {}), ...(fx.scale ? { scale: clone(fx.scale) } : {}), ...(fx.after ? { after: fx.after } : {}) });
          any = true;
        } else if (fx.after !== undefined) throw new TreeFxError('"after" is only for a cost change');
        if (fx.gain !== undefined || fx.floor !== undefined || fx.rule) {
          if (cls.maxRage === undefined) throw new TreeFxError(`${tree.class} has no Rage`);
          acc.hooks.push({
            h: 'rage',
            node,
            ...(skill ? { skill } : {}),
            ...(fx.on ? { on: fx.on } : {}),
            ...(fx.gain !== undefined ? { gain: r6(fx.gain * r) } : {}),
            ...(fx.floor !== undefined ? { floor: fx.floor } : {}),
            ...(fx.once ? { once: true } : {}),
            ...(fx.when ? { when: clone(fx.when) } : {}),
            ...(fx.scale ? { scale: clone(fx.scale) } : {}),
            ...(fx.rule ? { rule: fx.rule } : {}),
          });
          any = true;
        }
        if (!any) throw new TreeFxError('rage hook has no effect');
        return;
      }
      if (fx.h === 'trigger') {
        acc.hooks.push(compileTrigger(tree, fx, node, r, scope));
        return;
      }
      if (fx.h === 'heal') {
        acc.hooks.push(compileHeal(fx, node, r, scope));
        return;
      }
      throw new TreeFxError(`hook family "${String((fx as { h: string }).h)}" is not supported yet`);
    }
  }
  if (fx.k === 'mode') {
    // Faz 8: biçim fx'i burada yalnızca doğrulanır ve sıraya girer; biçimler derleme sonunda (setupOf > buildModes) kurulur
    if (unit) throw new TreeFxError('mode fx does not work on a summon');
    const id = fx.skill ?? p.skill;
    ownSkill(id);
    checkModeFx(fx, node, p.rank);
    ((acc.modes ??= {})[id!] ??= []).push({ fx, node });
    return;
  }
  throw new TreeFxError(`fx kind "${String((fx as { k: string }).k)}" is not supported yet`);
}

/* ------------------------------------------------------------------ Faz 8: skill biçimleri (Focused Beam, Stacked Deck) ------------------------------------------------------------------ */

const MODE_KEYS = ['k', 'skill', 'mode', 'name', 'text', 'baseText', 'title', 'target', 'removeEffects', 'powerMul', 'addEffect', 'splash', 'statusPick', 'firstOnly', 'secondStatus', 'needs', 'onlyWith', 'unless'];
const MODE_ID_RE = /^[a-z][a-z0-9_]*$/;

/** Biçim fx'inin biçim denetimi (alanlar, türler); hangi biçime eklendiği buildModes'ta denetlenir. */
function checkModeFx(fx: Extract<TreeFx, { k: 'mode' }>, node: string, rank: number): void {
  for (const k of Object.keys(fx)) if (!MODE_KEYS.includes(k)) throw new TreeFxError(`mode: unknown field "${k}"`);
  const str = (k: 'name' | 'text' | 'baseText' | 'title') => {
    if (fx[k] !== undefined && (typeof fx[k] !== 'string' || !fx[k]!.trim())) throw new TreeFxError(`mode ${k} must be a non-empty string`);
  };
  (['name', 'text', 'baseText', 'title'] as const).forEach(str);
  const family = fx.statusPick || fx.secondStatus ? 'status' : 'named';
  if (family === 'status') {
    if (fx.mode !== undefined || fx.name !== undefined || fx.target !== undefined || fx.removeEffects !== undefined || fx.powerMul !== undefined || fx.addEffect !== undefined || fx.splash !== undefined)
      throw new TreeFxError('statusPick / secondStatus cannot be mixed with a named mode');
    if (fx.statusPick !== undefined && fx.statusPick !== true) throw new TreeFxError('statusPick must be true');
    if (fx.secondStatus !== undefined && fx.secondStatus !== true) throw new TreeFxError('secondStatus must be true');
    if (fx.firstOnly !== undefined && !(Array.isArray(fx.firstOnly) && fx.firstOnly.every(knownStatus))) throw new TreeFxError('firstOnly must be a list of known statuses');
    return;
  }
  if (typeof fx.mode !== 'string' || !MODE_ID_RE.test(fx.mode)) throw new TreeFxError('mode needs an id ("mode": "focused_beam")');
  if (fx.firstOnly !== undefined) throw new TreeFxError('firstOnly only fits statusPick');
  if (fx.target !== undefined && fx.target !== 'single_enemy') throw new TreeFxError('mode target must be "single_enemy"');
  if (fx.removeEffects !== undefined && !(Array.isArray(fx.removeEffects) && fx.removeEffects.every((t) => typeof t === 'string' && EFFECT_FIELDS[t]))) throw new TreeFxError('removeEffects must be a list of effect types');
  if (fx.powerMul !== undefined && !(finiteNum(fx.powerMul) && fx.powerMul > 0)) throw new TreeFxError('powerMul must be a positive number');
  if (fx.splash !== undefined && !(fx.splash && (fx.splash.pattern === 'lane' || fx.splash.pattern === 'behind') && (fx.splash.mult === undefined || (finiteNum(fx.splash.mult) && fx.splash.mult > 0))))
    throw new TreeFxError('mode splash needs pattern lane / behind and a positive mult');
  if (fx.addEffect !== undefined) treeEffectOf({ effect: fx.addEffect }, rank, node);
  const opens = fx.name !== undefined;
  if (opens && fx.text === undefined) throw new TreeFxError('a new mode needs "text"');
  if (!opens && (fx.target !== undefined || fx.removeEffects !== undefined || fx.powerMul !== undefined || fx.baseText !== undefined)) throw new TreeFxError('target / removeEffects / powerMul / baseText only fit the fx that opens the mode (with "name")');
}

/** Hasar etkilerinin gücü x çarpan (yerinde). */
const mulDamage = (d: SkillDef, m: number): void => {
  for (const e of d.effects) if (e.type === 'damage') e.power = r6(e.power * m);
};

/**
 * Biçimleri kurar (son yamalı skill tanımından). Adlı biçim: kuran fx (name) + sonra gelen eklemeler; kurulmamış biçime ekleme hoşgörülü derlemede
 * atlanır, katı denetimde hata. Durum seçimi: randomStatus yoksa (Cold Deck onu Stun'a çevirdi) biçim kurulmaz; secondStatus o zaman skill'in KENDİ
 * tanımına, sınıf skill'inin özgün seçeneklerinden skill'de zaten olmayanlarla rastgele ikinci durum ekler.
 */
function buildModes(acc: Acc, lenient: boolean): Record<string, SkillModeSet> | undefined {
  const out: Record<string, SkillModeSet> = {};
  for (const [skillId, ops] of Object.entries(acc.modes ?? {})) {
    const final = acc.skills[skillId] ?? cloneSkill(SKILLS[skillId]!);
    const named = new Map<string, SkillModeDef>();
    let baseText: string | undefined;
    let title: string | undefined;
    let pick: { node: string; firstOnly: string[] } | undefined;
    let second: string | undefined;
    for (const { fx, node } of ops) {
      if (fx.title) title = fx.title;
      if (fx.statusPick) pick = { node, firstOnly: fx.firstOnly ?? [] };
      if (fx.secondStatus) second = node;
      if (fx.statusPick || fx.secondStatus) continue;
      let m = named.get(fx.mode!);
      if (fx.name !== undefined) {
        const d = cloneSkill(final);
        if (fx.target) {
          d.target = fx.target;
          delete d.area;
          delete d.areaByPhase;
          delete d.splash;
          delete d.count;
          delete d.skyCenter;
        }
        if (fx.removeEffects?.length) d.effects = d.effects.filter((x) => !fx.removeEffects!.includes(x.type));
        if (fx.powerMul !== undefined) mulDamage(d, fx.powerMul);
        if (!d.effects.length) throw new TreeFxError(`mode ${fx.mode} leaves ${skillId} with no effect`);
        m = { id: fx.mode!, name: fx.name, text: fx.text!, node, skill: d };
        named.set(fx.mode!, m);
        if (fx.baseText) baseText = fx.baseText;
      } else if (!m) {
        if (lenient) continue;
        throw new TreeFxError(`mode ${fx.mode} of ${skillId} is not opened by an earlier node (use "needs")`);
      } else if (fx.text) m.text = `${m.text} ${fx.text}`;
      if (fx.addEffect) m.skill.effects.push(treeEffectOf({ effect: fx.addEffect }, 1, node));
      if (fx.splash) {
        if (m.skill.target !== 'single_enemy') throw new TreeFxError(`mode ${fx.mode}: splash needs a single_enemy mode`);
        m.skill.splash = clone(fx.splash);
      }
    }
    const list: SkillModeDef[] = [...named.values()];
    const rsIdx = final.effects.findIndex((x) => x.type === 'randomStatus');
    if (pick && rsIdx >= 0) {
      const rs = final.effects[rsIdx] as Extract<SkillEffect, { type: 'randomStatus' }>;
      const tag = (o: RandomStatusOption): RandomStatusOption => ({ ...o, ...(pick!.firstOnly.includes(o.status) ? { firstOnly: true } : {}) });
      const seen = new Set<string>();
      for (const o of rs.options) {
        if (seen.has(o.status)) continue;
        seen.add(o.status);
        const d = cloneSkill(final);
        const only = pick.firstOnly.includes(o.status);
        const fixed = { type: 'status', status: o.status, turns: o.turns, ...(only ? { firstOnly: true } : {}), treeNode: pick.node } as SkillEffect;
        const extra = second ? rs.options.filter((x) => x.status !== o.status).map(tag) : [];
        d.effects.splice(rsIdx, 1, fixed, ...(extra.length ? [{ type: 'randomStatus', options: extra, treeNode: second } as SkillEffect] : []));
        const st = STATUSES[o.status];
        list.push({
          id: o.status,
          name: st?.name ?? o.status,
          text: `${o.turns} ${o.turns === 1 ? 'turn' : 'turns'}: ${st?.text ?? ''}`.trim(),
          ...(only ? { note: 'First target only' } : {}),
          status: o.status,
          node: pick.node,
          skill: d,
        });
      }
    } else if (second && rsIdx < 0) {
      // Cold Deck + Double Deal: seçim yok (durum sabit); kendi tanıma kalan özgün seçeneklerden rastgele ikinci durum
      const base = SKILLS[skillId]?.effects.find((x) => x.type === 'randomStatus') as Extract<SkillEffect, { type: 'randomStatus' }> | undefined;
      const have = new Set(final.effects.flatMap((x) => (x.type === 'status' ? [x.status] : [])));
      const extra = (base?.options ?? []).filter((o) => !have.has(o.status));
      if (extra.length) {
        const own = (acc.skills[skillId] ??= cloneSkill(SKILLS[skillId]!));
        const at = own.effects.findIndex((x) => x.type === 'status' && have.has(x.status));
        own.effects.splice(at < 0 ? own.effects.length : at + 1, 0, { type: 'randomStatus', options: extra.map((o) => ({ ...o })), treeNode: second } as SkillEffect);
      }
    }
    if (!list.length) continue;
    out[skillId] = { keepBase: !pick, ...(baseText ? { baseText } : {}), ...(title ? { title } : {}), list };
  }
  return Object.keys(out).length ? out : undefined;
}

/* ------------------------------------------------------------------ Faz 5a: C5 hedef / alan / aura + C6 kural ------------------------------------------------------------------ */

/** Kural türü -> izinli alanlar (`when` her türde). */
const RULE_KEYS: Record<RuleKind, readonly string[]> = {
  noMove: ['while'],
  noTaunt: ['while'],
  immune: ['statuses', 'pull'],
  shorten: ['statuses', 'by'],
  cheatDeath: ['once', 'hp', 'hpRatio', 'below', 'notCrit', 'rage', 'ready', 'do'],
  intercept: ['scope', 'once'],
  split: [],
  ward: ['skill'],
  pierce: ['statuses', 'shields', 'skill'],
  luck: ['add'],
  repeatChain: [],
  actions: ['n'],
  guardBehind: ['share'],
  resummon: ['skill', 'mult'],
  fedNoCorpse: ['cost'],
  rest: ['mult'],
  turnedHand: [],
};
/** Yalnızca çağrının kendi derlemesinde anlamlı kurallar. */
const SUMMON_RULES: ReadonlySet<RuleKind> = new Set(['actions', 'guardBehind']);

/** C6 kural fx'i -> motor RuleHook (doğrulama; rank: true = add / share / hpRatio / mult x rank). */
function compileRule(tree: TreeData, cls: (typeof classes)[string], fx: Extract<TreeFx, { h: 'rule' }>, node: string, r: number, unit: string | undefined): RuleHook {
  const kind = fx.rule as RuleKind;
  if (!(RULE_KINDS as readonly string[]).includes(kind)) throw new TreeFxError(`unknown rule "${String(fx.rule)}"`);
  const allowed = RULE_KEYS[kind];
  const META = ['k', 'h', 'rule', 'rank', 'drop', 'when', 'needs', 'onlyWith', 'unless', 'summon', 'fed', 'skillRow'];
  for (const k of Object.keys(fx)) if (!META.includes(k) && !allowed.includes(k)) throw new TreeFxError(`rule ${kind}: unknown field "${k}"`);
  if (SUMMON_RULES.has(kind) && !unit) throw new TreeFxError(`rule ${kind} only works on a summon`);
  checkWhen(fx.when, false);
  const out: RuleHook = { h: 'rule', node, rule: kind };
  if (fx.when) out.when = clone(fx.when);
  if (fx.while !== undefined) {
    if (fx.while !== 'guarding') throw new TreeFxError('while must be "guarding"');
    out.while = 'guarding';
  }
  if (fx.statuses !== undefined) {
    if (!(Array.isArray(fx.statuses) && fx.statuses.length && fx.statuses.every((s) => filterStatus(s)))) throw new TreeFxError('statuses must be a list of known statuses');
    out.statuses = [...fx.statuses];
  }
  for (const k of ['pull', 'once', 'notCrit', 'shields'] as const) {
    if (fx[k] === undefined) continue;
    if (fx[k] !== true) throw new TreeFxError(`${k} must be true`);
    out[k] = true;
  }
  const num = (k: 'by' | 'hp' | 'rage' | 'n' | 'cost', int: boolean, min: number): void => {
    const v = fx[k];
    if (v === undefined) return;
    if (!(finiteNum(v) && v >= min && (!int || Number.isInteger(v)))) throw new TreeFxError(`${k} must be ${int ? 'an integer' : 'a number'} >= ${min}`);
    out[k] = v;
  };
  num('by', true, 1);
  num('hp', true, 1);
  num('rage', false, -1000);
  num('n', true, 2);
  num('cost', true, 0);
  const ratio = (k: 'hpRatio' | 'below' | 'add' | 'share' | 'mult', ranked: boolean, max: number): void => {
    const v = fx[k];
    if (v === undefined) return;
    if (!(finiteNum(v) && v > 0 && v <= max)) throw new TreeFxError(`${k} must be in (0, ${max}]`);
    out[k] = ranked ? r6(v * r) : v;
  };
  ratio('hpRatio', true, 1);
  ratio('below', false, 1);
  ratio('add', true, 1);
  ratio('share', true, 1);
  ratio('mult', true, 10);
  if (fx.hp !== undefined && fx.hpRatio !== undefined) throw new TreeFxError('use only one of hp / hpRatio');
  if (fx.scope !== undefined) {
    if (fx.scope !== 'guarded' && fx.scope !== 'bonded') throw new TreeFxError('scope must be guarded / bonded');
    out.scope = fx.scope;
  }
  if (kind === 'intercept' && !out.scope) throw new TreeFxError('intercept needs "scope"');
  if ((kind === 'immune' || kind === 'shorten') && !out.statuses && !(kind === 'immune' && out.pull)) throw new TreeFxError(`${kind} needs "statuses"`);
  if (kind === 'pierce' && !out.statuses && !out.shields) throw new TreeFxError('pierce needs "statuses" or "shields"');
  if (kind === 'luck' && out.add === undefined) throw new TreeFxError('luck needs "add"');
  if (kind === 'actions' && out.n === undefined) throw new TreeFxError('actions needs "n"');
  if (kind === 'guardBehind' && out.share === undefined) throw new TreeFxError('guardBehind needs "share"');
  if (kind === 'rest' && out.mult === undefined) throw new TreeFxError('rest needs "mult"');
  for (const k of ['ready', 'skill'] as const) {
    const v = fx[k];
    if (v === undefined) continue;
    if (!cls.skills.includes(v)) throw new TreeFxError(`skill ${v} is not a ${tree.class} skill`);
    out[k] = v;
  }
  if (fx.do !== undefined) {
    if (!Array.isArray(fx.do) || !fx.do.length) throw new TreeFxError('"do" must be a non-empty list');
    out.do = fx.do.map((a) => compileAction(tree, cls, a, r));
  }
  return out;
}

const ENEMY_TARGETS: ReadonlySet<string> = new Set(['random_enemies', 'all_enemies', 'single_enemy', 'area_enemies']);

/** C5 hedef fx'i: skill / pasif kopyasını yamalar (sıra: hedef türü -> alan -> sıçrama -> menzil -> açıklık -> öncelik -> çekme -> Guard -> aura -> smite). */
function applyTarget(fx: Extract<TreeFx, { h: 'target' }>, acc: Acc, def: SkillDef | null, cls: (typeof classes)[string], r: number): void {
  const META = ['k', 'h', 'skill', 'rank', 'drop', 'needs', 'onlyWith', 'unless', 'summon', 'fed', 'skillRow'];
  const KEYS = ['area', 'target', 'count', 'splash', 'range', 'open', 'priority', 'gather', 'guard', 'groundWide', 'aura', 'smite', 'noSelf', 'overflow'];
  for (const k of Object.keys(fx)) if (!META.includes(k) && !KEYS.includes(k)) throw new TreeFxError(`target hook: unknown field "${k}"`);
  if (!KEYS.some((k) => (fx as unknown as Bag)[k] !== undefined)) throw new TreeFxError('target hook has no effect');
  const needDef = (): SkillDef => {
    if (!def) throw new TreeFxError('target hook needs a skill here');
    return def;
  };
  if (fx.target !== undefined) {
    const d = needDef();
    const ok = ['random_enemies', 'all_enemies', 'all_allies', 'self', 'single_enemy', 'single_ally'];
    if (!ok.includes(fx.target)) throw new TreeFxError(`unknown target "${String(fx.target)}"`);
    if (ENEMY_TARGETS.has(d.target) !== ENEMY_TARGETS.has(fx.target)) throw new TreeFxError(`target ${fx.target} changes the side of ${d.id}`);
    d.target = fx.target;
    delete d.area;
    delete d.areaByPhase;
    delete d.splash;
    if (fx.target === 'all_enemies') d.global = true;
    if (fx.target === 'random_enemies') d.count = d.count ?? 3;
    else delete d.count;
  }
  if (fx.count !== undefined) {
    const d = needDef();
    if (d.target !== 'random_enemies') throw new TreeFxError('count only fits target random_enemies');
    if (!(Number.isInteger(fx.count) && fx.count >= 1)) throw new TreeFxError('count must be an integer >= 1');
    d.count = fx.count;
  }
  if (fx.area !== undefined) {
    const d = needDef();
    if (fx.area === null) {
      delete d.area;
      delete d.areaByPhase;
    } else {
      if (!fx.area || typeof fx.area !== 'object') throw new TreeFxError('area must be an object or null');
      if (d.target !== 'area_enemies' && d.target !== 'area_any') throw new TreeFxError(`${d.id} is not an area skill`);
      const next = { ...(d.area ?? {}), ...clone(fx.area) } as Bag;
      if (next.shape !== 'rect') {
        delete next.rows;
        delete next.cols;
      }
      if (next.shape !== 'plus') delete next.arm;
      const bad = areaDefProblem(next, formulas.formation);
      if (bad) throw new TreeFxError(`area: ${bad}`);
      d.area = next as unknown as SkillDef['area'];
      delete d.areaByPhase;
    }
  }
  if (fx.splash !== undefined) {
    const d = needDef();
    if (fx.splash === null) delete d.splash;
    else {
      if (!['perpendicular', 'chain', 'row', 'behind'].includes(fx.splash?.pattern)) throw new TreeFxError('splash needs a pattern (perpendicular / chain / row / behind)');
      if (fx.splash.mult !== undefined && !(finiteNum(fx.splash.mult) && fx.splash.mult > 0)) throw new TreeFxError('splash mult must be a positive number');
      if (fx.splash.jumps !== undefined && !(Number.isInteger(fx.splash.jumps) && fx.splash.jumps >= 1)) throw new TreeFxError('splash jumps must be an integer >= 1');
      d.splash = clone(fx.splash);
    }
  }
  if (fx.range !== undefined) {
    const d = needDef();
    if (fx.range === 'global') d.global = true;
    else if (Number.isInteger(fx.range) && fx.range >= 1) {
      d.range = fx.range;
      delete d.global;
    } else throw new TreeFxError('range must be an integer >= 1 or "global"');
  }
  if (fx.open !== undefined) {
    const d = needDef();
    if (fx.open !== false && fx.open !== 'thrown') throw new TreeFxError('open must be false or "thrown"');
    delete d.requiresOpenBehind;
    if (fx.open === 'thrown') d.treeThrown = true;
    else delete d.treeThrown;
  }
  if (fx.priority !== undefined) {
    const d = needDef();
    if (!['hitMe', 'armor', 'hurtMe'].includes(fx.priority)) throw new TreeFxError(`unknown priority "${String(fx.priority)}"`);
    if (d.target !== 'random_enemies') throw new TreeFxError('priority only fits target random_enemies');
    d.treePriority = fx.priority;
  }
  if (fx.gather !== undefined) {
    const d = needDef();
    if (!knownStatus(fx.gather?.status) || !STATUSES[fx.gather.status]!.maxStacks) throw new TreeFxError('gather needs a stacking status');
    if (fx.gather.from !== undefined && !(Number.isInteger(fx.gather.from) && fx.gather.from >= 1)) throw new TreeFxError('gather from must be an integer >= 1');
    d.treeGather = clone(fx.gather);
  }
  if (fx.guard !== undefined) {
    const d = needDef();
    const gs = d.effects.filter((e) => e.type === 'guard') as Array<Extract<SkillEffect, { type: 'guard' }>>;
    if (!gs.length) throw new TreeFxError(`${d.id} has no Guard effect`);
    const { armorPct, ownRow } = fx.guard ?? {};
    if (armorPct === undefined && ownRow === undefined) throw new TreeFxError('guard needs armorPct or ownRow');
    if (armorPct !== undefined && !(finiteNum(armorPct) && armorPct > 0 && armorPct <= 1)) throw new TreeFxError('guard armorPct must be in (0, 1]');
    if (ownRow !== undefined && ownRow !== true) throw new TreeFxError('guard ownRow must be true');
    for (const g of gs) {
      if (armorPct !== undefined) g.armorPct = r6((g.armorPct ?? 0) + armorPct * r);
      if (ownRow) g.ownRow = true;
    }
  }
  if (fx.groundWide !== undefined) {
    const d = needDef();
    if (fx.groundWide !== 'touch') throw new TreeFxError('groundWide must be "touch"');
    const gs = d.effects.filter((e) => e.type === 'ground') as Array<Extract<SkillEffect, { type: 'ground' }>>;
    if (!gs.length) throw new TreeFxError(`${d.id} leaves no ground`);
    for (const g of gs) g.treeWide = 'touch';
  }
  if (fx.overflow !== undefined) {
    if (!cls.passive) throw new TreeFxError('this class has no passive');
    const pass = (acc.passive ??= clone(cls.passive));
    const e = pass.effect as Bag;
    if (e.type !== 'manaOverflow') throw new TreeFxError('overflow only fits a manaOverflow passive');
    const o = fx.overflow;
    if (!o || typeof o !== 'object') throw new TreeFxError('overflow must be an object');
    for (const k of Object.keys(o)) if (!['to', 'mult', 'noSelf', 'spill', 'allies'].includes(k)) throw new TreeFxError(`overflow: unknown field "${k}"`);
    if (o.to !== undefined && o.to !== 'lowestMp') throw new TreeFxError('overflow to must be "lowestMp"');
    if (o.mult !== undefined && !(finiteNum(o.mult) && o.mult > 0)) throw new TreeFxError('overflow mult must be a positive number');
    for (const k of ['noSelf', 'spill', 'allies'] as const) if (o[k] !== undefined && o[k] !== true) throw new TreeFxError(`overflow ${k} must be true`);
    if (o.to) e.to = o.to;
    if (o.mult !== undefined) e.mult = r6(((e.mult as number | undefined) ?? 1) * o.mult);
    for (const k of ['noSelf', 'spill', 'allies'] as const) if (o[k]) e[k] = true;
  }
  if (fx.aura !== undefined || fx.smite !== undefined || fx.noSelf !== undefined) {
    if (!cls.passive) throw new TreeFxError('this class has no passive');
    const pass = (acc.passive ??= clone(cls.passive));
    const e = pass.effect as Bag;
    if (fx.aura !== undefined) {
      if (e.type !== 'armorAura') throw new TreeFxError('aura only fits an armorAura passive');
      const { square, magicPct, pct } = fx.aura ?? {};
      if (square !== undefined && square !== true) throw new TreeFxError('aura square must be true');
      if (magicPct !== undefined && !(finiteNum(magicPct) && magicPct > 0 && magicPct <= 1)) throw new TreeFxError('aura magicPct must be in (0, 1]');
      if (pct !== undefined && !(finiteNum(pct) && pct >= 0 && pct <= 1)) throw new TreeFxError('aura pct must be in [0, 1]');
      if (square) e.square = true;
      if (magicPct !== undefined) e.magicPct = r6(((e.magicPct as number | undefined) ?? 0) + magicPct * r);
      if (pct !== undefined) {
        // pct (dostların payı) set; sahibin kendi payı (selfPct yoksa pct) korunur
        if (e.selfPct === undefined) e.selfPct = e.pct;
        e.pct = pct;
      }
    }
    if (fx.smite !== undefined || fx.noSelf !== undefined) {
      if (e.type !== 'divineLight') throw new TreeFxError('smite / noSelf only fit a divineLight passive');
      if (fx.noSelf !== undefined) {
        if (fx.noSelf !== true) throw new TreeFxError('noSelf must be true');
        e.noSelf = true;
      }
      if (fx.smite !== undefined) {
        if (!fx.smite || typeof fx.smite !== 'object') throw new TreeFxError('smite must be an object');
        const sm = (e.smite ??= {}) as Bag;
        for (const [k, v] of Object.entries(fx.smite)) {
          if (!['power', 'idle', 'mirror', 'mul', 'dual'].includes(k)) throw new TreeFxError(`smite: unknown field "${k}"`);
          if (!(finiteNum(v) && v > 0)) throw new TreeFxError(`smite ${k} must be a positive number`);
          // power / idle / mirror toplanır (x rank); mul ve dual (Crusader's Dawn) çarpılır
          sm[k] = k === 'mul' || k === 'dual' ? r6(((sm[k] as number | undefined) ?? 1) * v) : r6(((sm[k] as number | undefined) ?? 0) + v * r);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ Faz 4a: C3 tetik + C4 şifa kancaları ------------------------------------------------------------------ */

/** Skill süzgeci anlamlı olan olaylar (satırın skill'i varsayılan kapsam); diğerlerinde `skill` verilemez. */
const SKILL_EVENTS: ReadonlySet<TriggerEvent> = new Set(['kill', 'skillUse', 'echo', 'echoFail', 'jackpot', 'bust', 'crit', 'hit', 'statusApplied', 'shieldAbsorb', 'shieldBreak', 'doom', 'payHp', 'dispel', 'mpEmptied', 'manaBurned', 'revived', 'repeat', 'repeatFail']);
/** Olay süzgeçlerinin izinli olduğu olaylar. */
const TRIGGER_FILTERS: Record<string, readonly TriggerEvent[]> = {
  status: ['statusGained', 'statusApplied', 'statusEnd', 'enemyDied', 'dotTick', 'dispel', 'enemyBuffed', 'enemyHealed'],
  ground: ['enemyDied', 'groundEnd'],
  end: ['statusEnd'],
  mine: ['statusEnd', 'enemyDied', 'enemyHealed'],
  unit: ['summonDeath', 'arrive'],
  fromSkill: ['statusEnd'],
  marked: ['enemyDied'],
  by: ['enemyDied'],
  who: ['hpBelow', 'enemyMissed'],
  below: ['hpBelow', 'mpBelow'],
  via: ['kill'],
  resource: ['jackpot', 'bust'],
  near: ['enemyMoved'],
};
/** Eylemin ana anahtarları -> izinli yardımcı alanlar (to her eylemde). */
const ACTION_KEYS: Record<string, readonly string[]> = {
  heal: ['of'],
  shield: ['of', 'turns', 'magic'],
  status: ['turns', 'stacks', 'chance', 'power', 'stat', 'permanent'],
  removeStatus: ['node'],
  damage: ['of', 'stat', 'damageType', 'element', 'crit', 'passive', 'summoner'],
  rage: [],
  mp: ['of'],
  hpLoss: ['of'],
  cooldown: ['cd'],
  sooner: [],
  buff: ['uses', 'turns', 'skill', 'stack'],
  free: ['uses'],
  clear: [],
  charge: [],
  // Faz 4c
  cast: ['power', 'crit', 'mod', 'delay', 'noChain'],
  ground: ['of', 'power', 'stat', 'turns', 'permanent', 'wide'],
  doom: ['of'],
  spread: [],
  guard: [],
  overflow: [],
  mark: ['until'],
  // Faz 5a (C5 ek vuruş): skill'in ilk hasar etkisiyle gerçek vuruş, güç x oran; buff çalma; yenilenme aktarımı
  strike: ['hits', 'pierce', 'skill', 'chain', 'rollStatus', 'cutStatus'],
  steal: [],
  hot: ['skill'],
  smite: [],
  // Altıncı tur (Rot Bomb): DoT'un kalan tikleri bir anda
  detonate: [],
};
/** Faz 5a: `count` alan hedefler. */
const COUNT_TARGETS: ReadonlySet<string> = new Set(['nearestEnemies', 'outsideArea', 'randomInCast', 'beside']);
/** Faz 5a: her eylemde izinli alıcı alanları. */
const RECIPIENT_KEYS: ReadonlySet<string> = new Set(['to', 'count', 'rows', 'ifStatus', 'caster', 'ifMpZero', 'notTarget']);
const ATTRS: ReadonlySet<string> = new Set(['str', 'int', 'dex', 'luck']);
const ELEMENTS: ReadonlySet<string> = new Set(['physical', 'fire', 'ice', 'holy', 'dark', 'nature', 'arcane', 'lightning']);
const finiteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** C3 tetik fx'i -> motor TriggerHook (doğrulama + rank ölçeklemesi: eylem sayıları x r; süre / şans / yığın / eşik çarpılmaz). */
function compileTrigger(tree: TreeData, fx: Extract<TreeFx, { h: 'trigger' }>, node: string, r: number, scope: (s: string | undefined) => string | undefined): TriggerHook {
  const cls = classes[tree.class]!;
  if (!(TRIGGER_EVENTS as readonly string[]).includes(fx.on as string)) throw new TreeFxError(`unknown trigger event "${String(fx.on)}"`);
  const on = fx.on;
  checkWhen(fx.when, false);
  checkScale(fx.scale, false);
  for (const [k, evs] of Object.entries(TRIGGER_FILTERS)) if ((fx as unknown as Bag)[k] !== undefined && !evs.includes(on)) throw new TreeFxError(`"${k}" does not fit event "${on}"`);
  if (fx.status !== undefined && !filterStatus(fx.status)) throw new TreeFxError(`unknown status "${String(fx.status)}"`);
  if (fx.ground !== undefined && !GROUNDS[fx.ground]) throw new TreeFxError(`unknown ground "${String(fx.ground)}"`);
  if (fx.end !== undefined && !['broken', 'expired', 'dispelled'].includes(fx.end)) throw new TreeFxError(`unknown end "${String(fx.end)}"`);
  if (fx.who !== undefined && !(on === 'hpBelow' ? ['self', 'ally', 'any', 'bonded', 'aura'] : ['self', 'ally', 'any']).includes(fx.who)) throw new TreeFxError(`bad "who" for ${on}`);
  if ((on === 'hpBelow' || on === 'mpBelow') && !(finiteNum(fx.below) && fx.below > 0 && fx.below < 1)) throw new TreeFxError(`${on} needs "below" in (0, 1)`);
  if (fx.unit !== undefined && fx.unit !== 'treant' && fx.unit !== 'skeleton') throw new TreeFxError(`unknown unit "${String(fx.unit)}"`);
  if (fx.fromSkill !== undefined && !cls.skills.includes(fx.fromSkill)) throw new TreeFxError(`skill ${fx.fromSkill} is not a ${tree.class} skill`);
  if (fx.marked !== undefined && fx.marked !== true) throw new TreeFxError('marked must be true');
  if (fx.by !== undefined && !['ally', 'self', 'team'].includes(fx.by)) throw new TreeFxError(`bad "by" "${String(fx.by)}"`);
  if (fx.via !== undefined && !['skill', 'dot', 'doom', 'ground', 'leap', 'smite'].includes(fx.via)) throw new TreeFxError(`unknown via "${String(fx.via)}"`);
  if (fx.resource !== undefined && fx.resource !== 'hp' && fx.resource !== 'mp') throw new TreeFxError('resource must be hp / mp');
  if (fx.near !== undefined && !(finiteNum(fx.near) && fx.near >= 0)) throw new TreeFxError('near must be a number');
  if (fx.every !== undefined && !(Number.isInteger(fx.every) && fx.every >= 2)) throw new TreeFxError('every must be an integer >= 2');
  if (fx.perCast !== undefined && !(Number.isInteger(fx.perCast) && fx.perCast >= 1)) throw new TreeFxError('perCast must be an integer >= 1');
  if (fx.once !== undefined && !([true, 'perTarget', 'perTurn', 'perShield'] as unknown[]).includes(fx.once)) throw new TreeFxError(`unknown once "${String(fx.once)}"`);
  if (fx.once === 'perShield' && on !== 'shieldAbsorb') throw new TreeFxError('once "perShield" is only for shieldAbsorb');
  if (fx.procChance !== undefined && !(finiteNum(fx.procChance) && fx.procChance > 0 && fx.procChance <= 1)) throw new TreeFxError('procChance must be in (0, 1]');
  if (fx.skill !== undefined && !SKILL_EVENTS.has(on)) throw new TreeFxError(`"skill" does not fit event "${on}"`);
  const skill = SKILL_EVENTS.has(on) ? scope(fx.skill) : undefined;
  if (!Array.isArray(fx.do) || !fx.do.length) throw new TreeFxError('trigger needs a non-empty "do" list');
  const acts = fx.do.map((a) => compileAction(tree, cls, a, r));
  return {
    h: 'trigger',
    node,
    on,
    ...(skill ? { skill } : {}),
    ...(fx.status !== undefined ? { status: fx.status } : {}),
    ...(fx.ground !== undefined ? { ground: fx.ground } : {}),
    ...(fx.end !== undefined ? { end: fx.end } : {}),
    ...(fx.mine ? { mine: true } : {}),
    ...(fx.who !== undefined ? { who: fx.who } : {}),
    ...(fx.below !== undefined ? { below: fx.below } : {}),
    ...(fx.via !== undefined ? { via: fx.via } : {}),
    ...(fx.resource !== undefined ? { resource: fx.resource } : {}),
    ...(fx.near !== undefined ? { near: fx.near } : {}),
    ...(fx.unit !== undefined ? { unit: fx.unit } : {}),
    ...(fx.fromSkill !== undefined ? { fromSkill: fx.fromSkill } : {}),
    ...(fx.marked ? { marked: true } : {}),
    ...(fx.by !== undefined ? { by: fx.by } : {}),
    ...(fx.every !== undefined ? { every: fx.every } : {}),
    ...(fx.perCast !== undefined ? { perCast: fx.perCast } : {}),
    ...(fx.once !== undefined ? { once: fx.once } : {}),
    ...(fx.procChance !== undefined ? { procChance: fx.procChance } : {}),
    ...(fx.when ? { when: clone(fx.when) } : {}),
    ...(fx.scale ? { scale: clone(fx.scale) } : {}),
    do: acts,
  };
}

function compileAction(tree: TreeData, cls: (typeof classes)[string], a: TriggerAction, r: number): TriggerAction {
  if (!a || typeof a !== 'object' || Array.isArray(a)) throw new TreeFxError('an action must be an object');
  const mains = Object.keys(ACTION_KEYS).filter((k) => (a as Bag)[k] !== undefined);
  if (mains.length !== 1) throw new TreeFxError(`an action needs exactly one of ${Object.keys(ACTION_KEYS).join(' / ')} (got ${mains.join(', ') || 'none'})`);
  const main = mains[0]!;
  for (const k of Object.keys(a)) if (k !== main && !RECIPIENT_KEYS.has(k) && !ACTION_KEYS[main]!.includes(k)) throw new TreeFxError(`action ${main}: unknown field "${k}"`);
  if (a.ifStatus !== undefined && !knownStatus(a.ifStatus)) throw new TreeFxError(`unknown status "${String(a.ifStatus)}"`);
  if (a.caster !== undefined && a.caster !== true) throw new TreeFxError('caster must be true');
  if (a.ifMpZero !== undefined && a.ifMpZero !== true) throw new TreeFxError('ifMpZero must be true');
  if (a.notTarget !== undefined && a.notTarget !== true) throw new TreeFxError('notTarget must be true');
  if (a.to !== undefined && !(TRIGGER_TARGETS as readonly string[]).includes(a.to)) throw new TreeFxError(`unknown action target "${String(a.to)}"`);
  if (a.of !== undefined && !(TRIGGER_BASES as readonly string[]).includes(a.of)) throw new TreeFxError(`unknown base "${String(a.of)}"`);
  if (a.turns !== undefined && !(Number.isInteger(a.turns) && a.turns >= 1)) throw new TreeFxError('turns must be an integer >= 1');
  if (a.count !== undefined && !(Number.isInteger(a.count) && a.count >= 1 && COUNT_TARGETS.has(a.to as string))) throw new TreeFxError('count is an integer >= 1, only with to nearestEnemies / outsideArea / randomInCast');
  if (a.rows !== undefined && !(Number.isInteger(a.rows) && a.rows >= 1 && a.to === 'enemyFront')) throw new TreeFxError('rows is an integer >= 1, only with to enemyFront');
  for (const k of ['crit', 'noChain', 'permanent', 'node', 'passive', 'pierce', 'summoner', 'rollStatus'] as const) if (a[k] !== undefined && a[k] !== true) throw new TreeFxError(`${k} must be true`);
  if (a.wide !== undefined && a.wide !== 'beside') throw new TreeFxError('wide must be "beside"');
  const out: Bag = clone(a) as unknown as Bag;
  const scaleNum = (k: keyof TriggerAction) => {
    const v = (a as Bag)[k];
    if (!finiteNum(v)) throw new TreeFxError(`action ${String(k)} must be a number`);
    out[k] = r6(v * r);
  };
  switch (main) {
    case 'heal':
    case 'shield':
    case 'hpLoss':
    case 'rage':
    case 'mp':
    case 'sooner':
    case 'charge':
      scaleNum(main as keyof TriggerAction);
      if (main === 'rage' && cls.maxRage === undefined) throw new TreeFxError(`${tree.class} has no Rage`);
      break;
    case 'damage':
      scaleNum('damage');
      if (a.of !== undefined && a.of !== 'amount' && a.of !== 'dealt') throw new TreeFxError('damage base is the owner stat, "amount" or "dealt"');
      if (a.of === undefined && !ATTRS.has(a.stat as string)) throw new TreeFxError('damage needs "stat" (str / int / dex / luck) or of "amount"');
      if (a.damageType !== undefined && a.damageType !== 'physical' && a.damageType !== 'magic') throw new TreeFxError('damageType must be physical / magic');
      if (a.element !== undefined && !ELEMENTS.has(a.element)) throw new TreeFxError(`unknown element "${String(a.element)}"`);
      break;
    case 'status': {
      if (a.status === 'taunt') {
        // Faz 4c (Shieldbark): özel kodlu Taunt yalnızca süreyle
        if (!(Number.isInteger(a.turns) && a.turns! >= 1) || a.stacks !== undefined || a.permanent) throw new TreeFxError('taunt needs integer "turns" only');
        break;
      }
      if (!knownStatus(a.status)) throw new TreeFxError(`unknown status "${String(a.status)}"`);
      const def = STATUSES[a.status!]!;
      if (a.stacks !== undefined) {
        if (!def.maxStacks) throw new TreeFxError(`${a.status} does not stack`);
        if (!(Number.isInteger(a.stacks) && a.stacks >= 1)) throw new TreeFxError('stacks must be an integer >= 1');
      } else if (def.maxStacks) throw new TreeFxError(`${a.status} needs "stacks"`);
      else if (a.turns === undefined && !a.permanent) throw new TreeFxError('status needs "turns" (or permanent)');
      if (a.chance !== undefined && !(finiteNum(a.chance) && a.chance > 0 && a.chance <= 1)) throw new TreeFxError('chance must be in (0, 1]');
      if (def.dot && !(def.dot.scale && def.dot.power) && (a.power === undefined || a.stat === undefined)) throw new TreeFxError(`${a.status} is a DoT: needs "power" and "stat"`);
      if (a.power !== undefined) scaleNum('power');
      if (a.stat !== undefined && !ATTRS.has(a.stat)) throw new TreeFxError(`unknown stat "${a.stat}"`);
      break;
    }
    case 'removeStatus':
      if (!knownStatus(a.removeStatus)) throw new TreeFxError(`unknown status "${String(a.removeStatus)}"`);
      break;
    case 'cooldown':
      if (a.cooldown !== 'reset') scaleNum('cooldown');
      if (a.cooldown !== 'reset') out.cooldown = Math.round(out.cooldown as number);
      if (a.cd !== undefined && !['event', 'all', 'others', 'longest'].includes(a.cd) && !cls.skills.includes(a.cd)) throw new TreeFxError(`cooldown target "${a.cd}" is not a ${tree.class} skill`);
      break;
    case 'buff': {
      if (!a.buff || typeof a.buff !== 'object') throw new TreeFxError('buff must be a mod object');
      const mod: Bag = {};
      for (const [k, v] of Object.entries(a.buff)) {
        const spec = MOD_SPEC[k as keyof CondMod];
        if (!spec) throw new TreeFxError(`unknown mod "${k}"`);
        if (!['damage', 'status', 'proc', 'cast', 'bet'].includes(spec.g)) throw new TreeFxError(`mod ${k} cannot be a buff`);
        if (spec.at && !spec.at.includes('hit')) throw new TreeFxError(`mod ${k} cannot be a buff`);
        mod[k] = checkMod(k, spec.t, v, r);
        if (mod[k] === undefined) delete mod[k];
      }
      if (!Object.keys(mod).length) throw new TreeFxError('buff has no effect');
      out.buff = mod;
      if (a.uses !== undefined && !(Number.isInteger(a.uses) && a.uses >= 0)) throw new TreeFxError('uses must be an integer >= 0');
      if (a.skill !== undefined && a.skill !== 'event' && !cls.skills.includes(a.skill)) throw new TreeFxError(`skill ${a.skill} is not a ${tree.class} skill`);
      if (a.stack !== undefined && typeof a.stack !== 'boolean') throw new TreeFxError('stack must be true / false');
      break;
    }
    case 'free':
      if (a.free !== true) throw new TreeFxError('free must be true');
      if (a.uses !== undefined && !(Number.isInteger(a.uses) && a.uses >= 1)) throw new TreeFxError('uses must be an integer >= 1');
      break;
    case 'cast': {
      if (a.cast !== 'event' && !cls.skills.includes(a.cast as string)) throw new TreeFxError(`cast: skill ${String(a.cast)} is not a ${tree.class} skill`);
      if (a.power !== undefined && !(finiteNum(a.power) && a.power > 0)) throw new TreeFxError('cast power must be a positive number');
      if (a.delay !== undefined && !(Number.isInteger(a.delay) && a.delay >= 1)) throw new TreeFxError('delay must be an integer >= 1');
      if (a.mod !== undefined) {
        if (!a.mod || typeof a.mod !== 'object') throw new TreeFxError('cast mod must be a mod object');
        const mod: Bag = {};
        for (const [k, v] of Object.entries(a.mod)) {
          const spec = MOD_SPEC[k as keyof CondMod];
          if (!spec || !['damage', 'status', 'proc', 'cast'].includes(spec.g)) throw new TreeFxError(`mod ${k} cannot ride a free cast`);
          mod[k] = checkMod(k, spec.t, v, 1);
          if (mod[k] === undefined) delete mod[k];
        }
        out.mod = mod;
      }
      break;
    }
    case 'ground':
      if (!GROUNDS[a.ground as string]) throw new TreeFxError(`unknown ground "${String(a.ground)}"`);
      if (a.of === undefined && a.stat === undefined && a.power !== undefined) throw new TreeFxError('ground power needs "of" or "stat"');
      if (a.stat !== undefined && !ATTRS.has(a.stat)) throw new TreeFxError(`unknown stat "${a.stat}"`);
      if (a.power !== undefined) scaleNum('power');
      break;
    case 'doom':
      scaleNum('doom');
      if (a.of !== undefined && a.of !== 'stacks' && a.of !== 'amount') throw new TreeFxError('doom base is "stacks" or "amount"');
      break;
    case 'spread':
      if (!knownStatus(a.spread)) throw new TreeFxError(`unknown status "${String(a.spread)}"`);
      break;
    case 'guard':
      scaleNum('guard');
      if (!((out.guard as number) > 0 && (out.guard as number) <= 1)) throw new TreeFxError('guard share must be in (0, 1]');
      break;
    case 'overflow':
      if (a.overflow !== true) throw new TreeFxError('overflow must be true');
      break;
    case 'strike':
      scaleNum('strike');
      if (!((out.strike as number) > 0)) throw new TreeFxError('strike must be a positive number');
      if (a.hits !== undefined && !(Number.isInteger(a.hits) && a.hits >= 1)) throw new TreeFxError('hits must be an integer >= 1');
      if (a.skill !== undefined && a.skill !== 'event' && !cls.skills.includes(a.skill)) throw new TreeFxError(`skill ${a.skill} is not a ${tree.class} skill`);
      if (a.chain !== undefined && !(Number.isInteger(a.chain) && a.chain >= 2)) throw new TreeFxError('chain must be an integer >= 2');
      if (a.cutStatus !== undefined) {
        const cs = a.cutStatus as unknown as Bag;
        if (!cs || typeof cs !== 'object' || !knownStatus(cs.status) || STATUSES[cs.status as string]!.maxStacks) throw new TreeFxError('cutStatus needs a known, non-stacking "status"');
        if (!(Number.isInteger(cs.turns) && (cs.turns as number) >= 1)) throw new TreeFxError('cutStatus needs "turns" (integer >= 1)');
        for (const f of Object.keys(cs)) if (f !== 'status' && f !== 'turns') throw new TreeFxError(`cutStatus: unknown field "${f}"`);
      }
      break;
    case 'detonate':
      if (!knownStatus(a.detonate) || !STATUSES[a.detonate as string]!.dot) throw new TreeFxError(`detonate needs a DoT status (got "${String(a.detonate)}")`);
      break;
    case 'steal':
      if (a.steal !== true) throw new TreeFxError('steal must be true');
      break;
    case 'smite':
      if (a.smite !== true) throw new TreeFxError('smite must be true');
      if ((cls.passive?.effect as { type?: string } | undefined)?.type !== 'divineLight') throw new TreeFxError('smite needs the Divine Light passive');
      break;
    case 'hot':
      scaleNum('hot');
      if (!((out.hot as number) > 0)) throw new TreeFxError('hot must be a positive number');
      if (a.skill !== undefined && a.skill !== 'event' && !cls.skills.includes(a.skill)) throw new TreeFxError(`skill ${a.skill} is not a ${tree.class} skill`);
      break;
    case 'mark':
      if (a.mark !== true) throw new TreeFxError('mark must be true');
      if (a.until !== undefined && a.until !== 'turn' && a.until !== 'hit') throw new TreeFxError('until must be turn / hit');
      break;
    case 'clear':
      if (a.clear !== true && (typeof a.clear !== 'string' || !a.clear)) throw new TreeFxError('clear must be true or a node key');
      if (typeof a.clear === 'string') out.clear = `${tree.class}:${a.clear}`;
      break;
  }
  if (a.magic !== undefined && typeof a.magic !== 'boolean') throw new TreeFxError('magic must be true / false');
  return out as TriggerAction;
}

/** C4 fx'i -> motor HealHook (mul / ratio x r). */
function compileHeal(fx: Extract<TreeFx, { h: 'heal' }>, node: string, r: number, scope: (s: string | undefined) => string | undefined): HealHook {
  if (!(HEAL_POINTS as readonly string[]).includes(fx.on as string)) throw new TreeFxError(`unknown heal point "${String(fx.on)}"`);
  const on = fx.on;
  checkWhen(fx.when, false);
  checkScale(fx.scale, false);
  const conv = on === 'overheal' || on === 'overhealDealt';
  if (conv) {
    if (fx.into !== 'shield' && fx.into !== 'rage') throw new TreeFxError(`${on} needs "into" shield / rage`);
    if (!(finiteNum(fx.ratio) && fx.ratio > 0)) throw new TreeFxError(`${on} needs a positive "ratio"`);
    if (fx.mul !== undefined) throw new TreeFxError(`${on} takes "ratio", not "mul"`);
    if (fx.into === 'rage' && on === 'overhealDealt') throw new TreeFxError('overhealDealt cannot give Rage');
  } else {
    if (!finiteNum(fx.mul)) throw new TreeFxError(`${on} needs "mul"`);
    for (const k of ['into', 'ratio', 'turns', 'cap'] as const) if (fx[k] !== undefined) throw new TreeFxError(`"${k}" is only for overheal`);
  }
  if (fx.cap !== undefined && (on !== 'overheal' || !(finiteNum(fx.cap) && fx.cap > 0 && fx.cap < 1))) throw new TreeFxError('cap is only for overheal, in (0, 1)');
  if (fx.turns !== undefined && !(Number.isInteger(fx.turns) && fx.turns >= 1)) throw new TreeFxError('turns must be an integer >= 1');
  if (fx.min !== undefined && on !== 'bigHit') throw new TreeFxError('"min" is only for bigHit');
  if (on === 'bigHit' && !(finiteNum(fx.min) && fx.min > 0 && fx.min <= 1)) throw new TreeFxError('bigHit needs "min" in (0, 1]');
  for (const k of ['who', 'status', 'mine', 'shield', 'marked', 'ground'] as const) if (fx[k] !== undefined && on !== 'damageTaken') throw new TreeFxError(`"${k}" is only for damageTaken`);
  if (fx.who !== undefined && !['self', 'ally', 'team', 'foe'].includes(fx.who)) throw new TreeFxError(`bad "who" "${String(fx.who)}"`);
  if (fx.ground !== undefined && !GROUNDS[fx.ground]) throw new TreeFxError(`unknown ground "${String(fx.ground)}"`);
  if (fx.status !== undefined && !filterStatus(fx.status)) throw new TreeFxError(`unknown status "${String(fx.status)}"`);
  const skilled = on === 'healDealt' || on === 'overhealDealt' || on === 'shieldDealt' || on === 'overheal';
  if (fx.skill !== undefined && !skilled) throw new TreeFxError(`"skill" does not fit ${on}`);
  const skill = skilled ? scope(fx.skill) : undefined;
  if (fx.shield !== undefined) scope(fx.shield);
  return {
    h: 'heal',
    node,
    on,
    ...(skill ? { skill } : {}),
    ...(fx.who !== undefined ? { who: fx.who } : {}),
    ...(fx.ground !== undefined ? { ground: fx.ground } : {}),
    ...(fx.status !== undefined ? { status: fx.status } : {}),
    ...(fx.mine ? { mine: true } : {}),
    ...(fx.shield !== undefined ? { shield: fx.shield } : {}),
    ...(fx.marked ? { marked: true } : {}),
    ...(fx.min !== undefined ? { min: fx.min } : {}),
    ...(fx.mul !== undefined ? { mul: r6(fx.mul * r) } : {}),
    ...(fx.into !== undefined ? { into: fx.into } : {}),
    ...(fx.ratio !== undefined ? { ratio: r6(fx.ratio * r) } : {}),
    ...(fx.turns !== undefined ? { turns: fx.turns } : {}),
    ...(fx.cap !== undefined ? { cap: fx.cap } : {}),
    ...(fx.when ? { when: clone(fx.when) } : {}),
    ...(fx.scale ? { scale: clone(fx.scale) } : {}),
  };
}

/** Birikim -> TreeSetup (boş kanallar yazılmaz); hiçbir şey yoksa undefined. */
function setupOf(acc: Acc): TreeSetup | undefined {
  // Faz 8: biçimler önce (Double Deal + Cold Deck skill'in kendi tanımını da yamalar)
  const modes = acc.modes ? buildModes(acc, !!acc.lenient) : undefined;
  const skills = Object.keys(acc.skills).length > 0;
  const fx = Object.keys(acc.fx).length > 0;
  const hooks = acc.hooks.length > 0;
  const hp = acc.hpMult !== undefined && acc.hpMult !== 1;
  const armor = !!acc.armorAdd;
  const armorMul = acc.armorMult !== undefined && acc.armorMult !== 1;
  const subs = Object.entries(acc.summons ?? {}).flatMap(([k, a]) => {
    const s = setupOf(a);
    return s ? [[k, s] as const] : [];
  });
  if (!skills && !acc.passive && !fx && !hooks && !hp && !armor && !armorMul && !subs.length && !modes) return undefined;
  return {
    ...(skills ? { skills: acc.skills } : {}),
    ...(acc.passive ? { passive: acc.passive } : {}),
    ...(fx ? { fx: acc.fx as ItemEffects, fxNodes: acc.fxNodes } : {}),
    ...(hooks ? { hooks: acc.hooks } : {}),
    ...(hp ? { hpMult: acc.hpMult } : {}),
    ...(armor ? { armorAdd: acc.armorAdd } : {}),
    ...(armorMul ? { armorMult: acc.armorMult } : {}),
    ...(subs.length ? { summons: Object.fromEntries(subs) } : {}),
    ...(modes ? { modes } : {}),
  };
}

/**
 * Dağılımı derler -> TreeSetup (değişen skill'ler, değiştiyse pasif, unitFx kanalı, kancalar) ya da hiçbir şey değişmediyse undefined
 * (birim bugünküyle aynı). Dağılımın geçerli olduğu varsayılır (treeSetupFor doğrular). Hatalı fx TreeFxError fırlatır (veri testi yakalar).
 */
export function compileTree(tree: TreeData, alloc: TreeAlloc, rules: TreeRules = TREE_RULES): TreeSetup | undefined {
  if (!classes[tree.class]) return undefined;
  // Faz 2c: hoşgörülü derleme: birlikte alınan düğümlerden biri bir etkiyi kaldırdıysa öbürünün ona bakan yaması çökmez (sessizce atlanır)
  const acc = newAcc(true);
  for (const p of patchesOf(tree, alloc, rules)) {
    try {
      applyFx(tree, acc, p, rules);
    } catch (e) {
      throw new TreeFxError(`${tree.class} ${p.label}: ${(e as Error).message}`);
    }
  }
  return setupOf(acc);
}

/**
 * fx denetimi (veri testi; boş = sağlam): her düğümün / bar bonusunun fx'i TEK BAŞINA, tam rank'la gerçek skill tanımına karşı derlenir
 * ((a) seçici var ve en az bir etkiye uyar, alan beyaz listede, op bilinir, değer sayı; (b) etki türü / alanları / durum adları, unitFx anahtarı;
 * (c) koşul / ölçek sözlükte, değişiklik anahtarı bilinir, bedel koşulu yalnızca kendi canı / Rage'i). Başka düğümün eklediği etkiye bakan
 * (a) / addEffect yeri burada kırmızı olur; C1 seçicisi (sel) çalışma anında eşlendiği için yalnızca biçimi denetlenir. Faz 2c: `needs: '<düğüm>'`
 * taşıyan fx'ten önce o düğümün fx'i (tam rank'la) uygulanır (Whiteout <- Driving Snow, Iron Oath <- Blood Oath).
 */
export function checkTreeFx(tree: TreeData, rules: TreeRules = TREE_RULES): string[] {
  const out: string[] = [];
  const { list } = treeNodes(rules);
  const one = (label: string, fx: TreeFx[] | null | undefined, max: number, skill: string | undefined) => {
    if (!fx) return;
    for (const f of fx) {
      if (f.k === 'skill' || f.k === 'passive' || f.k === 'stat') {
        if (!['add', 'mul', 'pct', 'set', 'base', 'remove', 'on'].includes(f.op)) out.push(`${tree.class} ${label}: unknown op "${f.op}"`);
        if (f.op !== 'remove' && f.op !== 'on' && (typeof f.v !== 'number' || !Number.isFinite(f.v))) out.push(`${tree.class} ${label}: value must be a number`);
      }
      const fr = (f as { rank?: unknown }).rank;
      if (fr !== undefined && typeof fr !== 'boolean' && !(fr === 'chance' && f.k === 'hook')) out.push(`${tree.class} ${label}: rank must be true, "chance" (hook) or absent`);
      try {
        if (!classes[tree.class]) throw new TreeFxError('unknown class');
        const acc = newAcc();
        if (f.needs !== undefined) {
          const dep = list.find((x) => x.key === f.needs);
          const depFx = dep ? tree.nodes[dep.key]?.fx : undefined;
          if (!dep || !depFx) throw new TreeFxError(`"needs" names no node with fx: ${String(f.needs)}`);
          const depSkill = rowSkill(tree, dep.row, rules);
          for (const d of depFx) applyFx(tree, acc, { fx: d, rank: dep.max, ...(depSkill ? { skill: depSkill } : {}), label: dep.key }, rules);
        }
        applyFx(tree, acc, { fx: f, rank: max, ...(skill ? { skill } : {}), label }, rules);
        if (acc.modes) buildModes(acc, false); // Faz 8: biçim kurulumu da denetlenir (eklemenin açılmış biçimi var mı)
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
