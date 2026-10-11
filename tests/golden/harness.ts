// Altın kayıt (golden record) koşum takımı: ×2 stat ölçeği dönüşümü (Ömer onayı 2026-10-10) "hiçbir şey bozulmasın" güvencesi.
// Sabit seed'li savaşlar oynatılır (Quick Battle 4v4, özel kompozisyonlar: çağrılar, Hexer Omen/Doom, Gambler şans, Defender aurası; sefer
// simülatörü (elit/boss, zorluk çarpanları, item'ler); Endless simülatörü (dalga ölçeği, kalıntılar, item'ler); Epic item etkili savaşlar) ve her
// savaşın OLAY AKIŞI + başlangıç/bitiş "değişmez" anlık görüntüsü kaydedilir. Dönüşümden sonra aynı seed'ler aynı kaydı vermelidir.
//
// Normalleştirme: olaylar olduğu gibi kaydedilir; yalnızca ham stat taşıyan alanlar (çağrı olayındaki birim kopyasının stats / sayaç alanları) atılır.
// Değişmezler ham stat yerine OYUNA ETKİSİNİ kaydeder: zırh azaltma oranı, hız / eşik, kritik şansı, MP, skill gücü (stat x güç + hibrit ek) vb.
// Dönüşümde bu fonksiyon motorun yeni katsayılarıyla aynı sayıları vermelidir.
import { Battle, chooseAction, content, attributePower, armorReduction, type BattleEvent, type Combatant } from '../../src/engine';
import { bonusScaleRaw } from '../../src/engine/spec';
import { simulateCampaign } from '../../src/sim/campaign';
import { simulateEndless } from '../../src/sim/endless';
import { loadoutSetup } from '../../src/progression/loadout';
import { ITEMS, canEquip, emptyEquipment, rollItem, type Equipment } from '../../src/progression/items';
import { affixFit } from '../../src/progression/equip';
import { Rng } from '../../src/engine/rng';
import { applyUnitModifiers } from '../../src/engine/stats';
import type { Difficulty } from '../../src/campaign';

export interface GoldenBattle {
  id: string;
  /** Başlangıçta her birimin değişmezleri. */
  start: string[];
  /** Normalleştirilmiş olaylar (her biri JSON). */
  events: string[];
  /** Bitişte birim değişmezleri + kazanan + tur. */
  end: string[];
}

export interface GoldenGroup {
  group: string;
  battles: GoldenBattle[];
  /** Savaş dışı değişmezler (ör. item takılı class'ın türev değerleri). */
  extra?: string[];
}

const DROP = new Set(['stats', 'attributes', 'turnCounter', 'charge', 'baseStats']);
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

export function normEvent(e: BattleEvent): string {
  return JSON.stringify(e, (k, v) => (DROP.has(k) ? undefined : typeof v === 'number' ? r6(v) : v));
}

/** Skill başına güç: hasar/şifa/kalkan/yer etkisi = stat gücü x güç (+ hibrit ek) -> oyunun gördüğü ham miktar. */
function skillPowers(b: Battle, c: Combatant): string {
  const f = b.formulas;
  const out: string[] = [];
  for (const id of c.skills) {
    const sk = b.skill(id);
    if (!sk) continue;
    const parts: number[] = [];
    for (const e of sk.effects) {
      const scale = (e as { scale?: string }).scale as Parameters<typeof attributePower>[1] | undefined;
      if (!scale) continue;
      const pw = (e as { power?: number }).power ?? 0;
      parts.push(r6(attributePower(c.stats, scale, f) * pw + (e.type === 'damage' ? bonusScaleRaw(e.bonusScale, b.effectiveStats(c)) * (c.stats.spellPowerMult ?? 1) : 0)));
    }
    out.push(`${id}=${parts.join('/')}`);
  }
  return out.join(' ');
}

/** Birimin değişmezleri (dönüşümde aynı kalması gereken, oyuna etkiyen değerler). */
export function invariants(b: Battle, c: Combatant): string {
  const f = b.formulas;
  const eff = b.effectiveStats(c);
  const s = c.stats;
  const thr = f.turn.threshold;
  return [
    c.uid,
    c.defId,
    `hp ${c.hp}/${c.maxHp}`,
    `mp ${c.mp}/${c.maxMp}`,
    `sh ${c.shield}/${c.magicShield}`,
    `armR ${r6(armorReduction(eff.armor, f))}`,
    `marmR ${r6(armorReduction(eff.magicArmor, f))}`,
    `spd/thr ${r6(b.speedOf(c) / thr)}`,
    `ctr/thr ${r6(c.turnCounter / thr)}`,
    `crit ${r6(eff.critChance)} x${r6(s.critMult)}`,
    `acc ${r6(eff.accuracy)} eva ${r6(eff.evasion)}`,
    `regen ${r6(appliedHpRegen(s))}/${r6(appliedMpRegen(s))}`,
    `pow ${skillPowers(b, c)}`,
    `slot ${c.board}:${c.slot}`,
    `st ${c.statuses.map((x) => `${x.kind}:${x.turns}${x.stacks ? `x${x.stacks}` : ''}`).join(',')}`,
  ].join(' | ');
}

/** Tur başında GERÇEKTEN uygulanan can / MP yenilenmesi (dönüşümde gösterim değişse bile uygulanan miktar aynı kalmalı). */
export function appliedHpRegen(s: Combatant['stats']): number {
  return s.hpRegen;
}
export function appliedMpRegen(s: Combatant['stats']): number {
  return s.mpRegen;
}

// ---------------------------------------------------------------- kayıt: Battle.applyChoice sarmalanır (simülatörler kendi savaşlarını kurar)

interface Live {
  battle: Battle;
  id: string;
  start: string[];
  events: string[];
}

function withRecorder<T>(prefix: string, run: () => T): GoldenBattle[] {
  const proto = Battle.prototype as unknown as { applyChoice: Battle['applyChoice'] };
  const orig = proto.applyChoice;
  const lives: Live[] = [];
  const byBattle = new WeakMap<Battle, Live>();
  proto.applyChoice = function (this: Battle, ...args: Parameters<Battle['applyChoice']>) {
    let live = byBattle.get(this);
    if (!live) {
      live = { battle: this, id: `${prefix}#${lives.length}`, start: this.combatants.map((c) => invariants(this, c)), events: [] };
      byBattle.set(this, live);
      lives.push(live);
    }
    const r = orig.apply(this, args);
    if (r.ok) for (const e of r.events) live.events.push(normEvent(e));
    else live.events.push(`!${r.reason}`);
    return r;
  };
  try {
    run();
  } finally {
    proto.applyChoice = orig;
  }
  return lives.map((l) => ({ id: l.id, start: l.start, events: l.events, end: [...l.battle.combatants.map((c) => invariants(l.battle, c)), `winner ${l.battle.winner} turns ${l.battle.turnsTaken}`] }));
}

const MAX_TURNS = 400;
function playOut(b: Battle): void {
  while (!b.winner && b.turnsTaken < MAX_TURNS) {
    const u = b.currentUid;
    if (!u) break;
    if (!b.applyChoice(u, chooseAction(b, u, content.aiConfig)).ok) break;
  }
}

const cells = (m: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => m[i] ?? '');

// ---------------------------------------------------------------- gruplar

/** Quick Battle: rastgele 4v4 (seed 1-16) + 3v7 ve 1v1. */
export function groupQuick(): GoldenGroup {
  const battles = withRecorder('qb', () => {
    for (let seed = 1; seed <= 16; seed++) playOut(new Battle(content.battleSetup('random-battle', seed, 'turns')));
    playOut(new Battle(content.battleSetup('random-battle', 77, 'turns', { partySize: 3, enemySize: 7 })));
    playOut(new Battle(content.battleSetup('random-battle', 78, 'turns', { partySize: 1, enemySize: 1 })));
  });
  return { group: 'quick', battles };
}

/** Özel kompozisyonlar: çağrılar (Undead/Druid), Hexer Omen/Doom, Gambler şans, Defender aurası, Anti-Mage, test modu. */
export function groupComps(): GoldenGroup {
  const comps: Array<[Record<number, string>, Record<number, string>]> = [
    [{ 0: 'defender', 1: 'warrior', 3: 'paladin', 7: 'mage' }, { 0: 'defender', 2: 'cutthroat', 6: 'hexer', 8: 'gambler' }],
    [{ 0: 'warrior', 6: 'undead', 7: 'druid', 8: 'hexer' }, { 0: 'defender', 1: 'archer', 6: 'undead', 7: 'antimage' }],
    [{ 0: 'gambler', 1: 'cutthroat', 6: 'gambler', 7: 'hexer' }, { 0: 'warrior', 1: 'paladin', 6: 'mage', 8: 'druid' }],
    [{ 0: 'hexer', 1: 'hexer', 6: 'mage', 7: 'antimage' }, { 0: 'defender', 1: 'defender', 6: 'archer', 7: 'undead' }],
    [{ 0: 'undead', 1: 'undead' }, { 0: 'undead', 1: 'druid' }],
  ];
  const battles = withRecorder('comp', () => {
    comps.forEach(([p, e], i) => {
      for (const seed of [11 + i, 101 + i]) playOut(new Battle(content.battleSetup('random-battle', seed, 'turns', { party: cells(p), enemies: cells(e) }, false)));
    });
    // test modu (sırasız): canlı birimler sırayla
    const t = new Battle(content.battleSetup('random-battle', 5, 'test', { party: cells(comps[0]![0]), enemies: cells(comps[0]![1]) }, false));
    for (let i = 0; i < 300 && !t.winner; i++) {
      const alive = t.combatants.filter((c) => c.hp > 0 && !c.inert);
      const u = alive[i % alive.length]!.uid;
      t.applyChoice(u, chooseAction(t, u, content.aiConfig));
    }
  });
  return { group: 'comps', battles };
}

/** Sefer simülatörü: her zorluk 2 sefer (Medium oyuncu vekili) + Easy vekili 1 sefer; item'ler "Equip best". */
export function groupCampaign(): GoldenGroup {
  const battles = withRecorder('camp', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) simulateCampaign({ difficulty, player: 'medium', runs: 2, firstSeed: 7, maxAttempts: 3, gear: 'best' });
    simulateCampaign({ difficulty: 'medium', player: 'easy', runs: 1, firstSeed: 21, maxAttempts: 3, gear: 'best' });
  });
  return { group: 'campaign', battles };
}

/** Endless simülatörü: item + kalıntı alan koşular (dalga ölçeği, elit/boss dalgaları). */
export function groupEndless(): GoldenGroup {
  const battles = withRecorder('endless', () => {
    simulateEndless({ runs: 3, firstSeed: 5, gear: 'best', relics: 'pick', maxWave: 14 });
  });
  return { group: 'endless', battles };
}

/**
 * Item affix'leri ve Legendary etkileri (Ömer onayı 2026-10-11, affix kademeleri): her affix bir kahramanın item'inde (o affix'e uygun sınıf ve
 * yuva), her Legendary kendi taşıyabilen sınıfında; elit düşman (Damage vs elites, Marked Quarry için). Savaş dışı: her taban item'in seed'li
 * örneği her uygun sınıfta türev değerler.
 */
export function groupItems(): GoldenGroup {
  const classes = ['warrior', 'defender', 'archer', 'mage', 'paladin', 'gambler', 'hexer', 'druid', 'undead', 'antimage', 'cutthroat'];
  const extra: string[] = [];
  const fight = (seed: number, cls: string, eq: Equipment) => {
    const setup = loadoutSetup({ class: cls, equipment: eq }, { effects: true });
    const party = cells({ 0: cls, 1: 'warrior', 6: 'mage', 7: 'paladin' });
    const enemies = cells({ 0: 'defender', 1: 'warrior', 6: 'archer', 7: 'hexer' });
    const units = { party: { 0: setup }, enemies: { 0: { tier: 'elite' as const, modifiers: { hpMult: 1.5, statMult: 1.1 } } } };
    playOut(new Battle(content.battleSetup('random-battle', seed, 'turns', { party, enemies, units }, false)));
  };
  const battles = withRecorder('items', () => {
    // Affix başına bir savaş: uygun taban (affix'in izinli yuvası) + uygun sınıf; item Epic, affix'i zorlanmış (q 0,8)
    Object.keys(ITEMS.affixDefs).forEach((id, i) => {
      const a = ITEMS.affixDefs[id]!;
      const base = ITEMS.items.find((d) => d.rarity !== 'legendary' && (!a.slots || a.slots.includes(d.slot)) && classes.some((c) => canEquip(c, d) && affixFit(c, { id, def: a }) === 1))!;
      const cls = classes.find((c) => canEquip(c, base) && affixFit(c, { id, def: a }) === 1)!;
      const roll = rollItem(base, new Rng(900 + i), { rarity: 'common', forClass: cls });
      const x = a.choices?.[i % a.choices.length];
      roll.rarity = 'epic';
      roll.affixes = [...roll.affixes.filter((r) => r.id !== id), { id, q: 0.8, ...(x ? { x } : {}) }];
      fight(300 + i, cls, { ...emptyEquipment(), [base.slot]: { uid: `g${i}`, id: base.id, rolls: roll } });
    });
    // Legendary başına bir savaş (etkisi ve sabit affix'leri)
    ITEMS.items
      .filter((d) => d.rarity === 'legendary')
      .forEach((d, i) => {
        const cls = classes.find((c) => canEquip(c, d))!;
        fight(500 + i, cls, { ...emptyEquipment(), [d.slot]: { uid: `l${i}`, id: d.id, rolls: rollItem(d, new Rng(700 + i)) } });
      });
  });
  // Savaş dışı: her taban item'in seed'li örneğinin her uygun sınıfa etkisi (türev değerler)
  const b = new Battle(content.battleSetup('random-battle', 1, 'turns'));
  ITEMS.items.forEach((d, i) => {
    for (const cls of classes) {
      if (!canEquip(cls, d)) continue;
      const eq: Equipment = { ...emptyEquipment(), [d.slot]: { uid: 'x', id: d.id, rolls: rollItem(d, new Rng(40 + i), { forClass: cls }) } };
      const mods = loadoutSetup({ class: cls, equipment: eq }).modifiers;
      const def = applyUnitModifiers(content.classes[cls]!, mods, content.formulas);
      const fake = { ...b.combatants[0]!, defId: cls, uid: `${d.id}@${cls}`, stats: def.stats, hp: def.stats.hp, maxHp: def.stats.hp, mp: def.stats.mp, maxMp: def.stats.mp, skills: def.skills, statuses: [], shield: 0, magicShield: 0, turnCounter: 0 } as Combatant;
      extra.push(invariants(b, fake));
    }
  });
  return { group: 'items', battles, extra };
}

export const GROUPS: Record<string, () => GoldenGroup> = { quick: groupQuick, comps: groupComps, campaign: groupCampaign, endless: groupEndless, items: groupItems };
