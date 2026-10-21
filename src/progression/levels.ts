// Level / XP sistemi (saf; Phaser/DOM yok). Tasarım: docs/design/progression/levels.md (Ömer 2026-10-17). Sayılar data/levels.json.
// Sefer (src/campaign/state.ts) ve Endless (src/endless/run.ts) aynı fonksiyonları kullanır; Quick Battle / multiplayer kullanmaz (herkes L1).
import levelsJson from '../../data/levels.json';
import { classes, encounterUnit, summons } from '../engine/content';
import type { Attribute, Attributes, UnitModifiers } from '../engine/types';
import type { Battle } from '../engine';
import type { TreeAlloc } from './skill-tree';

export interface LevelRules {
  /** Genel tavan (Endless). */
  maxLevel: number;
  /** Sefer tavanı (Ömer 2026-10-18, TUR 1 madde 1: L30): seferde XP ve level burada durur. Yoksa maxLevel. */
  campaignMaxLevel?: number;
  /** Stat puanı kuralı (Ömer 2026-10-18, TUR 1 madde 2): her level perLevel, atMultiplesOf'un katlarında bonusLevelPoints. */
  statPoints: { perLevel: number; atMultiplesOf: number; bonusLevelPoints: number };
  skillPointsPerLevel: number;
  statPerPoint: number;
  xpToNext: { base: number; pow: number };
  enemyXp: { base: number; pow: number };
  nodeMult: Record<string, number>;
  fixedEnemies: number;
  fallenShare: number;
  gap: { fullBand: number; zeroAt: number };
  catchUp: { perLevel: number; max: number };
  /** Sonradan katılan kahraman takım ortalamasının bu kadar altında katılır (TUR 1 madde 6). */
  joinBelow?: number;
  /**
   * Bölümün level rampasının başladığı yer (Ömer 2026-10-18, karar 364: "Sıradaki mapte lvl atlama başlasın. Orası lvl1den başlasın ve öyle
   * scalelensin"): bölük kurma düğümü (Ashford) olan haritada rampa bu düğümden `rampStartSteps` adım sonra başlar; o adıma kadar (tutorial
   * dahil) her düğüm bölümün ilk level'ında (L1), sonra final düğümüne doğru doğrusal. Yoksa eski kural (haritanın başından derinlik).
   */
  rampStartSteps?: number;
  levelsPerChapter: number;
  /** Düşman level büyümesi (levels.md > Düşman level'ı). Yoksa kapalı. */
  enemies?: { enabled: boolean; profiles?: Record<string, Partial<Record<Attribute, number>>> };
}

const RULES: LevelRules = levelsJson as unknown as LevelRules;

/** Kurallar (data/levels.json). Level başına stat puanı: `statPointsBetween` / `statPointsAt` (eski sabit `statPointsPerLevel` 2026-10-18'de kalktı). */
export const LEVELS: LevelRules = RULES;

/** Seferin level tavanı (campaignMaxLevel; yoksa maxLevel). */
export const campaignMaxLevel = (r: LevelRules = LEVELS): number => Math.min(r.maxLevel, r.campaignMaxLevel ?? r.maxLevel);

/** L1'den `level`'a kadar kazanılan TOPLAM stat puanı (saf): her level perLevel, atMultiplesOf'un katlarında bonusLevelPoints. L30 = 35. */
export function statPointsAt(level: number, r: LevelRules = LEVELS): number {
  const l = Math.max(1, Math.floor(level));
  const { perLevel, atMultiplesOf: m, bonusLevelPoints } = r.statPoints;
  const bonusLevels = m >= 1 ? Math.floor(l / m) - Math.floor(1 / m) : 0; // L1 puan vermez
  return (l - 1) * perLevel + bonusLevels * (bonusLevelPoints - perLevel);
}

/** `from` level'dan `to`'ya çıkarken kazanılan stat puanı. */
export const statPointsBetween = (from: number, to: number, r: LevelRules = LEVELS): number => Math.max(0, statPointsAt(to, r) - statPointsAt(from, r));

export const ATTRS: Attribute[] = ['str', 'dex', 'int', 'luck'];

/** Dağıtılmış puanlar (temel stat başına PUAN sayısı; stat değeri = puan x statPerPoint). */
export type StatAlloc = Partial<Record<Attribute, number>>;

/** Level'ı olan kahraman (sefer Hero'su ve Endless kahramanı bu şekle uyar; eski kayıtta alanlar yoksa varsayılan). */
export interface LevelHero {
  id: string;
  class: string;
  level?: number;
  xp?: number;
  statPoints?: number;
  skillPoints?: number;
  alloc?: StatAlloc;
  /** Skill ağacı (Faz 1b; src/progression/skill-tree-hero.ts): onaylı dağılım + bayraklar. setLevel sıfırlar. */
  tree?: TreeAlloc;
  freeRespec?: boolean;
  treeReset?: boolean;
}

const clampLevel = (l: number, r: LevelRules = LEVELS, cap: number = r.maxLevel): number => Math.max(1, Math.min(r.maxLevel, cap, Math.floor(l)));

/** `level`'dan bir sonrakine gereken XP (tavanda 0). */
export function xpToNext(level: number, r: LevelRules = LEVELS): number {
  const l = clampLevel(level, r);
  if (l >= r.maxLevel) return 0;
  return Math.max(1, Math.round(r.xpToNext.base * Math.pow(l, r.xpToNext.pow)));
}

/** L1'den `level`'a toplam XP. */
export function totalXpFor(level: number, r: LevelRules = LEVELS): number {
  let t = 0;
  for (let l = 1; l < clampLevel(level, r); l++) t += xpToNext(l, r);
  return t;
}

/** Seviyesi `level` olan karşılaşmada düşman başına XP (düğüm çarpanından önce). */
export function enemyXp(level: number, r: LevelRules = LEVELS): number {
  return Math.max(1, Math.round(r.enemyXp.base * Math.pow(clampLevel(level, r), r.enemyXp.pow)));
}

/** Düğüm türünün çarpanı (savaş 1, elit 2, boss 4, olay / hazine 0,5; bilinmeyen tür 1). */
export const nodeXpMult = (type: string, r: LevelRules = LEVELS): number => r.nodeMult[type] ?? 1;

/** Bölüm `chapter`'ın level aralığı (tavan maxLevel). */
export function chapterLevels(chapter: number, r: LevelRules = LEVELS): [number, number] {
  const c = Math.max(1, Math.floor(chapter));
  return [clampLevel((c - 1) * r.levelsPerChapter + 1, r), clampLevel(c * r.levelsPerChapter, r)];
}

/** Bölüm + derinlik (0 = başlangıç, 1 = final) -> karşılaşma seviyesi. */
export function levelAt(chapter: number, depth: number, r: LevelRules = LEVELS): number {
  const [a, b] = chapterLevels(chapter, r);
  return clampLevel(Math.round(a + (b - a) * Math.max(0, Math.min(1, depth))), r);
}

/** Level farkı çarpanı (0-1): |fark| <= fullBand tam, zeroAt ve üstü 0, arası doğrusal. */
export function gapFactor(heroLevel: number, nodeLevel: number, r: LevelRules = LEVELS): number {
  const d = Math.abs(heroLevel - nodeLevel);
  const { fullBand, zeroAt } = r.gap;
  if (d <= fullBand) return 1;
  if (d >= zeroAt) return 0;
  return Math.round(((zeroAt - d) / (zeroAt - fullBand)) * 10000) / 10000;
}

/**
 * Bir kahramanın XP çarpanı (level farkı + istisna + yakalama bonusu). `others` = aynı savaştaki diğer kahramanların level'ları.
 * İstisna (levels.md): bandın ALTINDAKİ kahraman, diğerlerinin ortalaması düğüme zeroAt'tan yakınsa ve kendisi onlardan daha gerideyse %100.
 * Takımın tamamı geride (kimse "daha geride" değil) ise ceza işler. Bandın üstündeki kahramana istisna yok (farm freni).
 * Yakalama bonusu: diğerlerinin ortalamasının altındaysa level farkı başına catchUp.perLevel (en çok catchUp.max).
 */
export function heroXpMult(level: number, others: number[], nodeLevel: number, r: LevelRules = LEVELS): number {
  let gap = gapFactor(level, nodeLevel, r);
  const avg = others.length ? others.reduce((a, b) => a + b, 0) / others.length : undefined;
  if (gap < 1 && avg !== undefined && level < nodeLevel - r.gap.fullBand && Math.abs(avg - nodeLevel) < r.gap.zeroAt && nodeLevel - level > Math.abs(nodeLevel - avg)) gap = 1;
  const behind = avg !== undefined ? Math.max(0, avg - level) : 0;
  const bonus = Math.min(r.catchUp.max, behind * r.catchUp.perLevel);
  return Math.round(gap * (1 + bonus) * 10000) / 10000;
}

/** Savaştaki bir öldürme: o anda düşmüş kahramanların id'leri (onlar payını fallenShare ile alır). */
export interface KillRecord {
  down: string[];
}

/** XP dağıtımının girdisi. */
export interface XpSplitInput {
  /** Savaşa giren kahramanlar (bölen; düşenler dahil) ve level'ları. */
  heroes: Array<{ id: string; level: number }>;
  /** Karşılaşma seviyesi. */
  nodeLevel: number;
  /** Düğüm / dalga türü çarpanı. */
  mult: number;
  /** Öldürmeler (sırayla). */
  kills: KillRecord[];
  /** Ek çarpan (Endless xpMult). */
  scale?: number;
}

/** Kahraman başına kazanılan XP (tam sayı). Düşman XP'si x çarpan / bölen; düştükten sonraki öldürmeler fallenShare; sonra kahraman çarpanı. */
export function splitXp(x: XpSplitInput, r: LevelRules = LEVELS): Record<string, number> {
  const n = x.heroes.length;
  const out: Record<string, number> = {};
  if (!n) return out;
  const per = (enemyXp(x.nodeLevel, r) * x.mult * (x.scale ?? 1)) / n;
  for (const h of x.heroes) {
    let raw = 0;
    for (const k of x.kills) raw += k.down.includes(h.id) ? per * r.fallenShare : per;
    const others = x.heroes.filter((o) => o.id !== h.id).map((o) => o.level);
    out[h.id] = Math.max(0, Math.round(raw * heroXpMult(h.level, others, x.nodeLevel, r)));
  }
  return out;
}

/** Level atlama kaydı (arayüz bildirimi). */
export interface LevelUp {
  heroId: string;
  from: number;
  to: number;
}

/**
 * XP ekler (kahramanı YERİNDE değiştirir): eşik aşıldıkça level +1, stat ve skill puanı. Tavanda (`cap`: sefer campaignMaxLevel, Endless
 * maxLevel) XP 0'da durur; tavanın üstündeki kahraman (debug) düşürülmez. Dönen: level atlandıysa kayıt (yoksa null). Tam iyileşme çağıranın işi.
 */
export function addXp(h: LevelHero, amount: number, r: LevelRules = LEVELS, cap: number = r.maxLevel): LevelUp | null {
  const from = clampLevel(h.level ?? 1, r);
  const top = Math.max(from, Math.min(r.maxLevel, cap));
  let level = from;
  let xp = Math.max(0, (h.xp ?? 0) + Math.max(0, Math.round(amount)));
  while (level < top && xp >= xpToNext(level, r)) {
    xp -= xpToNext(level, r);
    level++;
  }
  if (level >= top) xp = 0;
  h.level = level;
  h.xp = xp;
  if (level === from) return null;
  h.statPoints = (h.statPoints ?? 0) + statPointsBetween(from, level, r);
  h.skillPoints = (h.skillPoints ?? 0) + (level - from) * r.skillPointsPerLevel;
  return { heroId: h.id, from, to: level };
}

/**
 * Debug: level'ı doğrudan ayarlar (XP 0). Dağıtılmış stat puanları ve skill ağacı (bayraklarıyla) sıfırlanır; tüm puanlar level'a göre yeniden
 * harcanmamış olarak verilir (skill ağacı Faz 1b, plan 3.3).
 */
export function setLevel(h: LevelHero, level: number, r: LevelRules = LEVELS, cap: number = r.maxLevel): void {
  const to = clampLevel(level, r, cap);
  h.level = to;
  h.xp = 0;
  h.alloc = {};
  h.statPoints = statPointsAt(to, r);
  h.skillPoints = (to - 1) * r.skillPointsPerLevel;
  delete h.tree;
  delete h.freeRespec;
  delete h.treeReset;
}

// ------------------------------------------------------------ temel stat dağıtımı

const allocPoints = (a: StatAlloc | undefined): number => ATTRS.reduce((t, k) => t + Math.max(0, a?.[k] ?? 0), 0);

/** Kahramanın TEMEL statları: sınıf + dağıtılmış puanlar (item / diğer bonuslar hariç). Sınıf yoksa null. */
export function baseAttrs(classId: string, alloc: StatAlloc | undefined, r: LevelRules = LEVELS): Attributes | null {
  const c = classes[classId];
  if (!c) return null;
  const out = { ...c.attributes };
  for (const k of ATTRS) out[k] += Math.max(0, Math.floor(alloc?.[k] ?? 0)) * r.statPerPoint;
  return out;
}

/** Temel stat kuralı (levels.md): hiçbir temel stat diğer üçünün toplamını aşamaz. */
export function baseRuleOk(a: Attributes): boolean {
  const sum = ATTRS.reduce((t, k) => t + a[k], 0);
  return ATTRS.every((k) => a[k] <= sum - a[k]);
}

/** `k`'ya bir puan daha eklenebilir mi (dağıtılmış + bekleyen `alloc` üstüne)? */
export function canAddPoint(classId: string, alloc: StatAlloc | undefined, k: Attribute, r: LevelRules = LEVELS): boolean {
  const a = baseAttrs(classId, { ...(alloc ?? {}), [k]: (alloc?.[k] ?? 0) + 1 }, r);
  return !!a && baseRuleOk(a);
}

/** Puanların birleşimi. */
export function mergeAlloc(a: StatAlloc | undefined, b: StatAlloc | undefined): StatAlloc {
  const out: StatAlloc = {};
  for (const k of ATTRS) {
    const v = Math.max(0, Math.floor(a?.[k] ?? 0)) + Math.max(0, Math.floor(b?.[k] ?? 0));
    if (v) out[k] = v;
  }
  return out;
}

/** Dağıtımın neden yapılamadığı (yoksa null): puan yetmiyor ya da temel stat kuralı. */
export function allocBlocked(h: LevelHero, add: StatAlloc, r: LevelRules = LEVELS): string | null {
  const n = allocPoints(add);
  if (ATTRS.some((k) => (add[k] ?? 0) < 0 || !Number.isInteger(add[k] ?? 0))) return 'Invalid points';
  if (!n) return 'No points to spend';
  if (n > (h.statPoints ?? 0)) return 'Not enough stat points';
  const a = baseAttrs(h.class, mergeAlloc(h.alloc, add), r);
  if (!a) return 'Unknown class';
  if (!baseRuleOk(a)) return 'A base stat can never exceed the sum of the other three';
  return null;
}

/** Puanları dağıtır (kahramanı YERİNDE değiştirir; geçersizse Error). Dağıtılan puan geri alınmaz. */
export function allocate(h: LevelHero, add: StatAlloc, r: LevelRules = LEVELS): void {
  const why = allocBlocked(h, add, r);
  if (why) throw new Error(why);
  h.alloc = mergeAlloc(h.alloc, add);
  h.statPoints = (h.statPoints ?? 0) - allocPoints(add);
}

/**
 * Oyuncu vekili (sim / otomatik): puanları ana stata verir; kural engellerse ana stattan sonraki en yüksek temel stata (sınıfın ikinci rengi).
 * Kahramanı YERİNDE değiştirir.
 */
export function autoAllocate(h: LevelHero, r: LevelRules = LEVELS): void {
  const c = classes[h.class];
  if (!c) return;
  const primary = c.primary ?? ATTRS.reduce((m, k) => (c.attributes[k] > c.attributes[m] ? k : m), 'str' as Attribute);
  while ((h.statPoints ?? 0) > 0) {
    const cur = h.alloc ?? {};
    let k: Attribute | undefined = canAddPoint(h.class, cur, primary, r) ? primary : undefined;
    if (!k) {
      const a = baseAttrs(h.class, cur, r)!;
      k = ATTRS.filter((x) => x !== primary && canAddPoint(h.class, cur, x, r)).sort((x, y) => a[y] - a[x])[0];
    }
    if (!k) break;
    allocate(h, { [k]: 1 }, r);
  }
}

/**
 * Kayıttan okunan kahramanın level alanlarını onarır (YERİNDE; bozuk değer varsayılana; eksik puanlar level'dan tamamlanır).
 * Stat puanı kuralı göçü (Ömer 2026-10-18, TUR 1 madde 2; 3/level -> 1/level + 5'in katlarında 2): puanların tek kaynağı level olduğu için
 * dağıtılmış + bekleyen = statPointsAt(level) her zaman doğrudur. Toplamı bunu AŞAN kahraman (eski kural: 3 x (level - 1)) göç edilir: dağıttığı
 * puan yeni toplamı aşıyorsa dağılımı sıfırlanır ve yeni toplamın tamamı dağıtılmamış puan olur; aşmıyorsa dağılım kalır, bekleyen = toplam -
 * dağıtılmış. Yeni kuraldaki kahramana dokunulmaz (idempotent; kayıt sürümü gerekmez, her okumada çalışır). Puan kaynağı ileride genişlerse
 * (levels.json > _points) bu denetim o kaynağı da saymalı.
 */
export function normalizeLevelFields(h: LevelHero, r: LevelRules = LEVELS): void {
  h.level = Number.isInteger(h.level) && h.level! >= 1 ? Math.min(h.level!, r.maxLevel) : 1;
  h.xp = typeof h.xp === 'number' && Number.isFinite(h.xp) && h.xp >= 0 ? Math.floor(h.xp) : 0;
  let alloc: StatAlloc = {};
  if (h.alloc && typeof h.alloc === 'object') for (const k of ATTRS) if (Number.isInteger(h.alloc[k]) && h.alloc[k]! > 0) alloc[k] = h.alloc[k]!;
  const earned = statPointsAt(h.level, r);
  const okPts = Number.isInteger(h.statPoints) && h.statPoints! >= 0;
  if (allocPoints(alloc) > earned) {
    alloc = {};
    h.statPoints = earned;
  } else if (!okPts || h.statPoints! + allocPoints(alloc) > earned) h.statPoints = Math.max(0, earned - allocPoints(alloc));
  h.alloc = alloc;
  if (!(Number.isInteger(h.skillPoints) && h.skillPoints! >= 0)) h.skillPoints = (h.level - 1) * r.skillPointsPerLevel;
}

// ------------------------------------------------------------ düşman level'ı (Ömer 2026-10-17)

/**
 * Düşmanın level puanlarının otomatik dağıtımı (saf): kahramanın o level'daki toplamı (statPointsAt) kadar puan, her puan hedef orana (ağırlık payı) en çok
 * gerideki stata; eşitlikte ATTRS sırası. Temel stat kuralı: puan, o stat (puanla birlikte) diğer üçünün toplamını AŞMAYACAKSA verilir
 * (kuralı baştan aşan birim önce diğer statlarına alır; hiçbir stata verilemiyorsa kalan puanlar yanar). Ağırlık yoksa temel statların kendisi.
 */
export function growthAlloc(base: Attributes, level: number, weights?: Partial<Record<Attribute, number>>, r: LevelRules = LEVELS): StatAlloc {
  const points = statPointsAt(clampLevel(level, r), r); // kahramanla aynı toplam (TUR 1 madde 2)
  const w = ATTRS.map((k) => Math.max(0, (weights ? weights[k] : base[k]) ?? 0));
  const W = w.reduce((a, b) => a + b, 0) || 1;
  const cnt = ATTRS.map(() => 0);
  const cur = ATTRS.map((k) => base[k]);
  for (let p = 0; p < points; p++) {
    const sum = cur.reduce((a, b) => a + b, 0);
    let best = -1;
    let bestDef = -Infinity;
    for (let i = 0; i < ATTRS.length; i++) {
      if (!w[i]) continue;
      if (cur[i]! + r.statPerPoint > sum - cur[i]!) continue; // temel stat kuralı
      const def = (w[i]! / W) * (p + 1) - cnt[i]!;
      if (def > bestDef + 1e-9) {
        bestDef = def;
        best = i;
      }
    }
    if (best < 0) break;
    cnt[best]!++;
    cur[best]! += r.statPerPoint;
  }
  const out: StatAlloc = {};
  ATTRS.forEach((k, i) => cnt[i] && (out[k] = cnt[i]));
  return out;
}

const enemyDef = (id: string) => encounterUnit(id) ?? classes[id] ?? summons[id];
const enemyAddCache = new Map<string, Partial<Attributes> | null>();

/** Düşmanın `level`'daki temel stat eki (UnitModifiers.attrAdd; puan x statPerPoint). L1, bilinmeyen birim ya da kapalıysa undefined. */
export function enemyLevelAttrAdd(unitId: string, level: number, r: LevelRules = LEVELS): Partial<Attributes> | undefined {
  if (!r.enemies?.enabled || clampLevel(level, r) <= 1) return undefined;
  const key = `${unitId}|${clampLevel(level, r)}`;
  if (r === LEVELS && enemyAddCache.has(key)) return enemyAddCache.get(key) ?? undefined;
  const def = enemyDef(unitId);
  let out: Partial<Attributes> | null = null;
  if (def) {
    const a = growthAlloc(def.attributes, level, r.enemies.profiles?.[unitId], r);
    const add: Partial<Attributes> = {};
    for (const k of ATTRS) if (a[k]) add[k] = a[k]! * r.statPerPoint;
    if (Object.keys(add).length) out = add;
  }
  if (r === LEVELS) enemyAddCache.set(key, out);
  return out ?? undefined;
}

/** Düşman birim güçlendirmesine level ekini katar (attrAdd toplanır; diğer alanlar aynen). Ek yoksa `mods` aynen döner. */
export function withEnemyLevel<T extends UnitModifiers>(mods: T | undefined, unitId: string, level: number, r: LevelRules = LEVELS): T | undefined {
  const add = enemyLevelAttrAdd(unitId, level, r);
  if (!add) return mods;
  const attrAdd: Partial<Attributes> = { ...(mods?.attrAdd ?? {}) };
  for (const k of ATTRS) if (add[k]) attrAdd[k] = (attrAdd[k] ?? 0) + add[k]!;
  return { ...(mods ?? ({} as T)), attrAdd };
}

// ------------------------------------------------------------ savaş içi öldürme kaydı

/**
 * Savaşın olay akışından öldürme kaydı (motora dokunmaz; battle.on dinler): her DÜŞMAN (çağrı değil) ölümünde o an düşmüş kahramanlar.
 * Aynı düşman bir kez sayılır. `heroOrder[i]` = 'party-i' kahramanı. Sürdürülen savaşta günlük oynatılmadan ÖNCE bağlanmalı.
 */
export function trackKills(battle: Pick<Battle, 'on' | 'get' | 'combatants'>, heroOrder: string[]): { kills: () => KillRecord[]; stop: () => void } {
  const heroOf = (uid: string): string | undefined => (/^party-\d+$/.test(uid) ? heroOrder[Number(uid.slice(6))] : undefined);
  const down = new Set<string>();
  for (const c of battle.combatants) if (c.side === 'party' && !c.summoned && c.hp <= 0) {
    const id = heroOf(c.uid);
    if (id) down.add(id);
  }
  const counted = new Set<string>();
  const log: KillRecord[] = [];
  const stop = battle.on((ev) => {
    if (ev.type === 'death') {
      const c = battle.get(ev.target);
      if (!c || c.summoned) return;
      if (c.side === 'party') {
        const id = heroOf(c.uid);
        if (id) down.add(id);
      } else if (!counted.has(c.uid)) {
        counted.add(c.uid);
        log.push({ down: [...down] });
      }
    } else if (ev.type === 'revive') {
      const id = heroOf(ev.target);
      if (id) down.delete(id);
    }
  });
  return { kills: () => log.map((k) => ({ down: [...k.down] })), stop };
}

/** Level bildirimi metni (İngilizce): "Warrior reached Level 3 · Archer reached Level 2. Spend stat points in Gear." */
export function levelUpText(ups: Array<{ name: string; to: number }>): string {
  if (!ups.length) return '';
  return `${ups.map((u) => `${u.name} reached Level ${u.to}`).join(' · ')}. Spend stat points in Gear.`;
}
