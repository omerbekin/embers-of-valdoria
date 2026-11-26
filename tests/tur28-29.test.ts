// Ömer 2026-11-16 Tur 28 + Tur 29 seçimleri (savaş / veri tarafı): isabet 0,85 + her 5 DEX %2 kaçınma; yeni buff'lar Empowered / Focused;
// Piercing Arrow kanatan ok; Thunderpeal iletken şimşek (Shocked yok); üç yeni set (Stormhall Saga / Refrain, Relics of Saint Odran / Martyr's Bequest,
// Almoner's Vestments / Pilgrim's Burden). Sayılar veriden (data/formulas.json, statuses.json, skills.json, items.json, ai.json).
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill, previewSkill } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, ItemEffects, Side, Status } from '../src/engine';
import { aiCoverageInternals as AC, type AiTrace } from '../src/engine/ai';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';
import { evasionOf } from '../src/engine/stats';
import { describeEvent } from '../src/engine/match-log';
import { statusPercent } from '../src/game/status-pct';
import { Rng } from '../src/engine/rng';
import { ITEMS, emptyEquipment, itemDef, makeItem, validateItems, type Equipment } from '../src/progression/items';
import { SETS, setBonusScore, setContribution, setPieces, setTip } from '../src/progression/sets';
import { bestMoves } from '../src/progression/equip';

const S = content.statuses;
const F = content.formulas;
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
function make(party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', seed = 7): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies) }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    c.hp = c.maxHp = 5000;
    c.stats = { ...c.stats, hpRegen: 0, resilience: 0, surviveChance: 0 };
  }
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot && !c.summoned)!;
const evs = (r: ReturnType<Battle['useSkill']>): BattleEvent[] => {
  if (!r.ok) throw new Error(r.reason);
  return r.events;
};
const give = (c: Combatant, fx: ItemEffects) => {
  c.itemEffects = { ...(c.itemEffects ?? {}), ...fx };
};
const has = (c: Combatant, kind: string) => c.statuses.some((s) => s.kind === kind);
const passives = (ev: BattleEvent[], id: string) => ev.filter((e) => e.type === 'passive' && (e as { passive?: string }).passive === id);
const vc = () => ({ ...DEFAULT_VALUE, ...(content.aiConfig.value ?? {}) });
const ctxOf = (b: Battle, actor: Combatant) => new ValueContext(b, actor, vc(), (c) => content.aiConfig.profiles[c.ai ?? content.aiConfig.defaultProfile]?.focus ?? 'lowest_ratio');
type Priv = { addStatus(c: Combatant, s: Status, emit: (e: BattleEvent) => void): void; announceIfDead(c: Combatant, emit: (e: BattleEvent) => void): void; debugEmit: (e: BattleEvent) => void };
const priv = (b: Battle) => b as unknown as Priv;
const rf = () => SETS.find((s) => s.id === 'stormhall_saga')!.bonuses['4']!;
const mb = () => SETS.find((s) => s.id === 'relics_of_saint_odran')!.bonuses['3']!;
const pb = () => SETS.find((s) => s.id === 'almoners_vestments')!.bonuses['3']!;

describe('1. isabet / kaçınma', () => {
  it('taban isabet 0,85; kaçınma her 5 DEX +%2 (moblar aynı formül)', () => {
    const a = F.attributes;
    expect(a.accuracyBase).toBe(0.85);
    expect(a.dexPerEvasionStep).toBe(5);
    expect(a.evasionPerStep).toBe(0.02);
    expect(evasionOf(10, F)).toBeCloseTo(0.04, 6);
    expect(evasionOf(14, F)).toBeCloseTo(0.04, 6);
    const b = make({ 0: 'archer' }, { 0: 'drowned' });
    for (const c of b.combatants) expect(c.stats.evasion, c.uid).toBeCloseTo(Math.min(a.evasionMax, Math.floor(c.stats.dex / a.dexPerEvasionStep) * a.evasionPerStep), 6);
  });
});

describe('2. Empowered / Focused', () => {
  it('veri: buff, tickAtTurnEnd, tek alan; metin yüzdeyi yazar', () => {
    expect(S.empowered).toMatchObject({ name: 'Empowered', type: 'buff', tickAtTurnEnd: true });
    expect(S.empowered!.damageDealtMult).toBeGreaterThan(1);
    expect(S.empowered!.text).toContain(`${Math.round((S.empowered!.damageDealtMult! - 1) * 100)}% more damage`);
    expect(S.focused).toMatchObject({ name: 'Focused', type: 'buff', tickAtTurnEnd: true });
    expect(S.focused!.critDelta).toBeGreaterThan(0);
    expect(S.focused!.text).toContain(`+${Math.round(S.focused!.critDelta! * 100)}%`);
    // Focused vurana, Exposed hedefe: ayrı durumlar, ayrı alanlar
    expect(S.exposed!.critTakenDelta).toBeGreaterThan(0);
    expect(S.focused!.critTakenDelta).toBeUndefined();
  });

  it.each(MODES)('Empowered verilen hasarı, Focused kritik şansını veri kadar artırır; rozet yüzdesi çalışır (%s)', (mode) => {
    const b = make({ 0: 'warrior' }, { 0: 'warrior' }, mode);
    const [hero, foe] = [at(b, 'party', 0), at(b, 'enemy', 0)];
    const before = b.dealtDamageMult(hero, foe);
    const crit0 = b.effectiveStats(hero).critChance;
    priv(b).addStatus(hero, { kind: 'empowered', turns: 2, source: hero.uid }, priv(b).debugEmit);
    priv(b).addStatus(hero, { kind: 'focused', turns: 2, source: hero.uid }, priv(b).debugEmit);
    expect(b.dealtDamageMult(hero, foe)).toBeCloseTo(before * S.empowered!.damageDealtMult!, 6);
    expect(b.effectiveStats(hero).critChance).toBeCloseTo(crit0 + S.focused!.critDelta!, 6);
    const st = (k: string) => hero.statuses.find((s) => s.kind === k)!;
    expect(statusPercent(b, hero, st('empowered'))).toBeCloseTo((S.empowered!.damageDealtMult! - 1) * 100, 1);
    expect(statusPercent(b, hero, st('focused'))).toBeCloseTo(S.focused!.critDelta! * 100, 1);
  });

  it('YZ: iki buff da genel buff yolunda artı değer taşır (dosta verilince)', () => {
    const b = make({ 0: 'warrior', 1: 'archer' }, { 0: 'warrior', 1: 'warrior' });
    const ctx = ctxOf(b, at(b, 'party', 0));
    expect(AC.statusEffectWorth(ctx, at(b, 'party', 1), 'empowered', 2, { from: null })).toBeGreaterThan(0);
    expect(AC.statusEffectWorth(ctx, at(b, 'party', 1), 'focused', 2, { from: null })).toBeGreaterThan(0);
    // Exposed (karşı kritik) hedefe eksi kalır: Focused'ın artısı onu etkilemez
    expect(AC.statusEffectWorth(ctx, at(b, 'party', 1), 'exposed', 2)).toBeLessThan(0);
  });
});

describe('3. Piercing Arrow: kanatan ok', () => {
  const sk = () => content.skills.piercing_arrow!;
  it('veri: falloff 0,85, her vurulana 2 tur Bleeding; açıklama ve önizleme yazar', () => {
    const dmg = sk().effects.find((e) => e.type === 'damage') as { falloff: number };
    expect(dmg.falloff).toBe(0.85);
    expect(sk().effects.find((e) => e.type === 'dot')).toMatchObject({ status: 'bleeding', turns: 2 });
    const b = make({ 3: 'archer' }, { 0: 'warrior', 3: 'warrior' });
    expect(describeSkill(sk(), at(b, 'party', 3).stats, F, content.summons, { statuses: S, grounds: content.grounds, skills: content.skills }).lines.join(' ')).toMatch(/Bleeding/);
    expect(describeSkill(sk(), at(b, 'party', 3).stats, F, content.summons, { statuses: S, grounds: content.grounds, skills: content.skills }).lines.join(' ')).toContain('15% less damage than the previous one');
    const pv = previewSkill(b, at(b, 'party', 3).uid, 'piercing_arrow', undefined, 0);
    expect(pv.length).toBe(2);
    expect(pv.every((p) => p.dot?.status === 'bleeding' && p.dot.turns === 2)).toBe(true);
  });

  it.each(MODES)('şeritteki her isabet eden hedef kanar; kaçınan kanamaz (%s)', (mode) => {
    const b = make({ 3: 'archer' }, { 0: 'warrior', 3: 'warrior' }, mode);
    if (mode === 'turns') for (let i = 0; i < 80 && b.currentUid !== at(b, 'party', 3).uid; i++) b.skipTurn();
    evs(b.useSkill(at(b, 'party', 3).uid, 'piercing_arrow', undefined, 0));
    expect(has(at(b, 'enemy', 0), 'bleeding')).toBe(true);
    expect(has(at(b, 'enemy', 3), 'bleeding')).toBe(true);
    const c = make({ 3: 'archer' }, { 0: 'warrior', 3: 'warrior' });
    c.debug.dodge = 'always';
    evs(c.useSkill(at(c, 'party', 3).uid, 'piercing_arrow', undefined, 0));
    expect(has(at(c, 'enemy', 0), 'bleeding')).toBe(false);
  });

  it('Lingering Rain zemininin Bleeding\'i ile skill Bleeding\'i çakışmaz: zemin kalkınca skill kanaması sürer', () => {
    const b = make({ 3: 'archer' }, { 0: 'warrior', 3: 'warrior' });
    const foe = at(b, 'enemy', 0);
    b.debugPlaceGround(at(b, 'party', 3).uid, 'lingering_rain', 'enemy', [0], 9, 0);
    evs(b.useSkill(at(b, 'party', 3).uid, 'piercing_arrow', undefined, 0));
    expect(has(foe, 'bleeding')).toBe(true);
    b.ground.splice(0, b.ground.length);
    (b as unknown as { syncGroundStatuses(e: (x: BattleEvent) => void): void }).syncGroundStatuses(priv(b).debugEmit);
    expect(foe.statuses.find((s) => s.kind === 'bleeding' && !s.fromGround)?.turns).toBe(2);
  });

  it('ağaç falloff eki 1\'i aşmaz (no falloff = 1)', () => {
    const b = make({ 3: 'archer' }, { 0: 'warrior', 3: 'warrior' });
    const pv = previewSkill(b, at(b, 'party', 3).uid, 'piercing_arrow', undefined, 0).map((p) => p.damage!.avg);
    expect(pv[1]! / pv[0]!).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('YZ: iki düşman aynı şeritteyken Archer şerit vuruşunu seçer (değer terazisi iki hedefi toplar; aoeMinTargets kullanılmıyor)', () => {
    const b = make({ 3: 'archer' }, { 0: 'warrior', 3: 'warrior' }, 'turns');
    const a = at(b, 'party', 3);
    for (let i = 0; i < 80 && b.currentUid !== a.uid; i++) b.skipTurn();
    a.cooldowns = { aimed_shot: 9, arrow_rain: 9 };
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    const pick = chooseAction(b, a.uid, content.aiConfig, trace);
    expect(pick?.skillId).toBe('piercing_arrow');
  });
});

describe('4. Thunderpeal: iletken şimşek, Shocked yok', () => {
  it('veri: thunder etiketi var, shocks yok; açıklama Live Water yazar, Shocked yazmaz', () => {
    const sk = content.skills.thunderpeal!;
    expect(sk.thunder).toBeDefined();
    expect(sk.thunder!.shocks).toBeFalsy();
    const b = make({ 0: 'vesper' }, { 0: 'warrior' });
    const text = describeSkill(sk, at(b, 'party', 0).stats, F, content.summons, { statuses: S, grounds: content.grounds, skills: content.skills }).lines.join(' ');
    expect(text).toContain('Live Water');
    expect(text).not.toContain('Shocked');
  });

  it.each(MODES)('sıvıya düşünce iki tahtada sıvıdaki herkesi çarpar (Vesper\'ın kendi dostu dahil); kimse Shocked / Electrocuted olmaz (%s)', (mode) => {
    const b = make({ 0: 'vesper', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' }, mode);
    const [v, ally, foe] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'enemy', 0)];
    b.debugPlaceGround(foe.uid, 'flooded', 'party', [1], 9, 0);
    b.debugPlaceGround(v.uid, 'flooded', 'enemy', [0], 9, 0);
    if (mode === 'turns') for (let i = 0; i < 80 && b.currentUid !== v.uid; i++) b.skipTurn();
    const hp = ally.hp;
    const ev = evs(b.useSkill(v.uid, 'thunderpeal', undefined, 0));
    expect(ev.filter((e) => e.type === 'thunderSpark').map((e) => (e as { target: string }).target)).toContain(ally.uid);
    expect(ally.hp).toBeLessThan(hp);
    for (const c of b.combatants) {
      expect(has(c, F.thunder.badge), c.uid).toBe(false);
      expect(has(c, F.thunder.wetInto ?? "electrocuted"), c.uid).toBe(false);
    }
  });

  it('kuru hedefte Islak devre yok; Ice hücresinde Shatter işler', () => {
    const b = make({ 0: 'vesper' }, { 0: 'warrior' });
    const ev = evs(b.useSkill(at(b, 'party', 0).uid, 'thunderpeal', undefined, 0));
    expect(ev.some((e) => e.type === 'thunderSpark')).toBe(false);
    const c = make({ 0: 'vesper' }, { 0: 'warrior' });
    c.debugPlaceGround(at(c, 'party', 0).uid, 'ice_ground', 'enemy', [0], 9, 0);
    const ev2 = evs(c.useSkill(at(c, 'party', 0).uid, 'thunderpeal', undefined, 0));
    expect(ev2.some((e) => e.type === 'groundReaction' && (e as { trigger?: string }).trigger === 'lightning')).toBe(true);
  });

  it('YZ: kendi dostu sıvıdayken Thunderpeal\'in puanı düşer', () => {
    const score = (wetAlly: boolean) => {
      const b = make({ 0: 'vesper', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' });
      b.debugPlaceGround(at(b, 'party', 0).uid, 'flooded', 'enemy', [0, 1], 9, 0);
      if (wetAlly) b.debugPlaceGround(at(b, 'enemy', 0).uid, 'flooded', 'party', [0, 1], 9, 0);
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, at(b, 'party', 0).uid, content.aiConfig, trace);
      return Math.max(...trace.options.filter((o) => o.skill.id === 'thunderpeal').map((o) => o.score));
    };
    expect(score(true)).toBeLessThan(score(false));
  });
});

function wearing(ids: string[]): Equipment {
  const eq = emptyEquipment();
  ids.forEach((id, i) => {
    const d = itemDef(id)!;
    (eq as Record<string, unknown>)[d.slot] = makeItem(id, `u${i}`, new Rng(i + 1));
  });
  return eq;
}

describe('5. yeni setler: veri', () => {
  it('üç set, parçalar ve eşikler; kurallar efekt alanına eşlenir; ipucu metni tam', () => {
    const want: Record<string, number> = { stormhall_saga: 4, relics_of_saint_odran: 3, almoners_vestments: 3 };
    for (const [id, n] of Object.entries(want)) {
      const s = SETS.find((x) => x.id === id)!;
      expect(s.slots.length, id).toBe(n);
      expect(setPieces(id).map((d) => d.name)).toEqual(s.pieceNames);
      for (const r of setTip({ set: id })!.rows) expect(r.text, id).not.toMatch(/undefined|NaN|\[object/);
    }
    const full = (id: string, cls: string) => setContribution(wearing(setPieces(id).map((d) => d.id)), cls);
    expect(full('stormhall_saga', 'skald').effects.refrain).toEqual({ status: rf().status, turns: rf().turns });
    expect(full('stormhall_saga', 'skald').passivePatch).toMatchObject({ passive: 'conductor', field: 'bonus' });
    expect(full('relics_of_saint_odran', 'mage').effects.deathBequest).toEqual({ statuses: mb().statuses, turns: mb().turns });
    expect(full('almoners_vestments', 'druid').effects.healShorten).toEqual({ turns: pb().turns });
    expect(setTip({ set: 'stormhall_saga' })!.rows.map((r) => r.text).join(' ')).toContain('Empowered');
    expect(setTip({ set: 'relics_of_saint_odran' })!.rows.map((r) => r.text).join(' ')).toContain('Empowered and Focused');
    expect(setTip({ set: 'stormhall_saga' }, 'skald')!.rows.some((r) => r.text.includes('25% → 30%'))).toBe(true);
  });

  it('düz stat bonusları: 2 parça = veri 2 eşiği; tam set = eşiklerin toplamı (Tur 28-29 sayıları)', () => {
    const want: Record<string, Record<string, number>> = {
      stormhall_saga: { hpAdd: 8, critAdd: 0.02 },
      // Ömer r50 (Odran C "kutsal ateş"): MP yenilenme gitti, kritik + Potency; sayı veriden (balance-tester ayarlar)
      relics_of_saint_odran: { critAdd: 0.05, potencyAdd: SETS.find((x) => x.id === 'relics_of_saint_odran')!.bonuses['2']!.mods!.potencyAdd! },
      almoners_vestments: { magicArmorAdd: 5, mpRegenAdd: 2 }, // r48 Ömer: 2 -> 5, 1 -> 2
    };
    const cls: Record<string, string> = { stormhall_saga: 'skald', relics_of_saint_odran: 'mage', almoners_vestments: 'druid' };
    for (const [id, two] of Object.entries(want)) {
      const s = SETS.find((x) => x.id === id)!;
      expect(s.bonuses['2']!.mods, id).toEqual(two);
      const ids = setPieces(id).map((d) => d.id);
      expect(setContribution(wearing(ids.slice(0, 2)), cls[id]!).mods, id).toEqual(two);
      const sum: Record<string, number> = {};
      for (const t of s.thresholds) for (const [k, v] of Object.entries(s.bonuses[String(t)]?.mods ?? {})) sum[k] = Math.round(((sum[k] ?? 0) + v) * 1000) / 1000;
      const full = setContribution(wearing(ids), cls[id]!).mods;
      for (const k of Object.keys(full)) full[k] = Math.round(full[k]! * 1000) / 1000;
      expect(full, id).toEqual(sum);
    }
    expect(SETS.find((x) => x.id === 'stormhall_saga')!.bonuses['4']!.mods).toEqual({ spdAdd: 0.5 }); // r48 Ömer: zırh cezası -2 -> 0
  });

  it('item kimlikleri tekil (set parçası eski bir item\'i ezmez; Drummer\'s Gauntlets Legendary kalır)', () => {
    const ids = [...ITEMS.items, ...(ITEMS.setItems ?? [])].map((d) => d.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(itemDef('drummers_gauntlets')!.rarity).toBe('legendary');
    expect(itemDef('stormhall_gauntlets')!.set).toBe('stormhall_saga');
  });

  it('Odran C (Ömer r50): Ring = MP yen. + MP bedeli + Elemental damage (A; set şablonunun tek istisnası), Reliquary DoT damage; doğrulayıcı istisnayı yalnız Ring için açar', () => {
    expect(itemDef('odrans_ring')!.affixes).toEqual(['c_mpregen', 'b_mpcost', 'a_allelem']);
    expect(itemDef('odrans_reliquary')!.affixes).toEqual(['c_dot', 'c_shield', 'b_startshield']);
    expect(itemDef('odrans_censer')!.affixes).toEqual(['c_hpregen', 'c_res_holy', 'b_marmor']);
    expect(validateItems()).toEqual([]);
    // Başka bir set parçasına A affix konursa doğrulayıcı reddeder
    const bad = { ...ITEMS, setItems: ITEMS.setItems!.map((d) => (d.id === 'kingsfall_signet' ? { ...d, affixes: ['c_hpregen', 'b_speed', 'a_allelem'] } : d)) };
    expect(validateItems(bad).some((e) => e.includes('kingsfall_signet') && e.includes('C, C, B'))).toBe(true);
  });

  it('Stormhall yalnız Skald; Odran Censer Focus Orb ailesi (kalkan değil)', () => {
    for (const d of setPieces('stormhall_saga')) expect(d.usableBy).toEqual(['skald']);
    const censer = itemDef('odrans_censer')!;
    expect(censer.slot).toBe('offhand');
    expect(censer.family).toBe('orbs');
  });

  it('Equip best: Pilgrim\'s Burden kuralı şifacı olmayana değer katmaz; şifacıya katar', () => {
    const eq = wearing(setPieces('almoners_vestments').map((d) => d.id));
    const two = wearing(setPieces('almoners_vestments').slice(0, 2).map((d) => d.id));
    expect(setBonusScore(eq, 'druid') - setBonusScore(two, 'druid')).toBeGreaterThan(0);
    expect(setBonusScore(eq, 'warrior') - setBonusScore(two, 'warrior')).toBe(0);
  });

  it('Equip best: çift elli silah varken ikinci el set parçası (Censer) zorlanmaz', () => {
    const bag = setPieces('relics_of_saint_odran').map((d, i) => makeItem(d.id, `o${i}`, new Rng(30 + i)));
    const eq = { ...emptyEquipment(), weapon: makeItem('ash_staff', 'w', new Rng(1)) };
    const moves = bestMoves({ class: 'mage', equipment: eq }, bag);
    expect(moves.some((m) => m.uid === 'o0')).toBe(false); // çift el asa: Censer takılmaz
    expect(moves.some((m) => m.uid === 'o1') && moves.some((m) => m.uid === 'o2')).toBe(true); // ring + trinket yine set (2 parça)
  });
});

describe('5a. Refrain (Stormhall Saga 4)', () => {
  it('Skald Shocked yapınca ilk vuran dost Empowered alır, işaret silinir; Skald kendisi tüketmez; Shocked kalır', () => {
    const b = make({ 0: 'skald', 1: 'warrior', 2: 'archer' }, { 0: 'warrior' });
    const [sk, w, ar, foe] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'party', 2), at(b, 'enemy', 0)];
    give(sk, { refrain: { status: rf().status!, turns: rf().turns! } });
    evs(b.useSkill(sk.uid, 'thunder_strike', foe.uid));
    expect(has(foe, F.thunder.badge)).toBe(true);
    expect(foe.statuses.find((s) => s.kind === F.thunder.badge)!.refrain).toBe(sk.uid);
    sk.cooldowns = {};
    evs(b.useSkill(sk.uid, sk.skills[0]!, foe.uid)); // Skald'ın kendi vuruşu
    expect(has(sk, 'empowered')).toBe(false);
    const ev = evs(b.useSkill(w.uid, w.skills[0]!, foe.uid));
    expect(passives(ev, 'refrain').length).toBe(1);
    expect(has(w, 'empowered')).toBe(true);
    expect(has(foe, F.thunder.badge)).toBe(true); // tüketilmez
    const ev2 = evs(b.useSkill(ar.uid, ar.skills[0]!, foe.uid));
    expect(passives(ev2, 'refrain').length).toBe(0);
    expect(has(ar, 'empowered')).toBe(false);
  });

  it('turns: dost kendi turunda Empowered alır; tur sonu düşüşü sayılmaz, kendi 2 turu tam kalır', () => {
    const b = make({ 0: 'skald', 1: 'warrior' }, { 0: 'warrior' }, 'turns');
    const [sk, w, foe] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'enemy', 0)];
    give(sk, { refrain: { status: rf().status!, turns: rf().turns! } });
    for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0 });
    // Shocked (badgeTurns) düşmanın kendi turu başında biter: dost araya girsin diye düşman yavaş, dostlar hızlı
    foe.stats.spd = 1;
    for (let i = 0; i < 80 && b.currentUid !== sk.uid; i++) b.skipTurn();
    w.stats.spd = sk.stats.spd * 3;
    expect(b.currentUid).toBe(sk.uid);
    evs(b.useSkill(sk.uid, 'thunder_strike', foe.uid));
    expect(foe.statuses.find((s) => s.kind === F.thunder.badge)?.refrain).toBe(sk.uid);
    for (let i = 0; i < 80 && b.currentUid !== w.uid; i++) b.skipTurn();
    expect(b.currentUid).toBe(w.uid);
    const ev = evs(b.useSkill(w.uid, w.skills[0]!, foe.uid));
    expect(passives(ev, 'refrain').length).toBe(1);
    // vuruş turunun sonundaki düşüşten sonra: verilen süre aynen durur (tickAtTurnEnd + 1 telafisi)
    expect(w.statuses.find((s) => s.kind === rf().status)?.turns).toBe(rf().turns);
  });

  it('kuralsız Skald işaret koymaz; suda (Electrocuted) Refrain yok', () => {
    const b = make({ 0: 'skald', 1: 'warrior' }, { 0: 'warrior' });
    evs(b.useSkill(at(b, 'party', 0).uid, 'thunder_strike', at(b, 'enemy', 0).uid));
    expect(at(b, 'enemy', 0).statuses.some((s) => s.refrain)).toBe(false);
    const c = make({ 0: 'skald', 1: 'warrior' }, { 0: 'warrior' });
    give(at(c, 'party', 0), { refrain: { status: 'empowered', turns: 2 } });
    c.debugAddStatus(at(c, 'enemy', 0).uid, F.thunder.wetStatus, 3);
    evs(c.useSkill(at(c, 'party', 0).uid, 'thunder_strike', at(c, 'enemy', 0).uid));
    expect(at(c, 'enemy', 0).statuses.some((s) => s.refrain)).toBe(false);
  });

  it('YZ: işaretli düşmana vurmak dosta daha değerli; Skald\'ın Shocked hamlesi Refrain ile değer kazanır', () => {
    const scoreOn = (mark: boolean) => {
      const b = make({ 0: 'skald', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' });
      give(at(b, 'party', 0), { refrain: { status: 'empowered', turns: 2 } });
      if (mark) evs(b.useSkill(at(b, 'party', 0).uid, 'thunder_strike', at(b, 'enemy', 0).uid));
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, at(b, 'party', 1).uid, content.aiConfig, trace);
      return Math.max(...trace.options.filter((o) => o.targetUid === at(b, 'enemy', 0).uid && o.skill.id === at(b, 'party', 1).skills[0]).map((o) => o.score));
    };
    // işaretsiz düşman Shocked da değilken (aynı düşman): işaret artı değer
    const plain = (() => {
      const b = make({ 0: 'skald', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' });
      evs(b.useSkill(at(b, 'party', 0).uid, 'thunder_strike', at(b, 'enemy', 0).uid));
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, at(b, 'party', 1).uid, content.aiConfig, trace);
      return Math.max(...trace.options.filter((o) => o.targetUid === at(b, 'enemy', 0).uid && o.skill.id === at(b, 'party', 1).skills[0]).map((o) => o.score));
    })();
    expect(scoreOn(true)).toBeGreaterThan(plain);
    const skaldScore = (fx: boolean) => {
      const b = make({ 0: 'skald', 1: 'warrior' }, { 0: 'warrior', 1: 'warrior' });
      if (fx) give(at(b, 'party', 0), { refrain: { status: 'empowered', turns: 2 } });
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, at(b, 'party', 0).uid, content.aiConfig, trace);
      return Math.max(...trace.options.filter((o) => o.skill.id === 'thunder_strike').map((o) => o.score));
    };
    expect(skaldScore(true)).toBeGreaterThan(skaldScore(false));
  });
});

describe("5b. Martyr's Bequest (Relics of Saint Odran 3)", () => {
  it.each(MODES)('taşıyan ölünce en yakın canlı dost Empowered + Focused alır (%s)', (mode) => {
    const b = make({ 0: 'mage', 1: 'warrior', 8: 'archer' }, { 0: 'warrior' }, mode);
    const [m, near, far] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'party', 8)];
    give(m, { deathBequest: { statuses: [...mb().statuses!], turns: mb().turns! } });
    const ev: BattleEvent[] = [];
    m.hp = 0;
    priv(b).announceIfDead(m, (e) => ev.push(e));
    expect(passives(ev, 'martyrs_bequest').length).toBe(1);
    for (const st of mb().statuses!) {
      expect(near.statuses.find((s) => s.kind === st)?.turns, st).toBe(mb().turns);
      expect(has(far, st)).toBe(false);
    }
  });

  it('YZ: taşıyanı öldürecek vuruş daha az değerli', () => {
    const killScore = (fx: boolean) => {
      const b = make({ 0: 'mage', 1: 'warrior' }, { 0: 'warrior' });
      const m = at(b, 'party', 0);
      if (fx) give(m, { deathBequest: { statuses: ['empowered', 'focused'], turns: 2 } });
      m.hp = 5;
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, at(b, 'enemy', 0).uid, content.aiConfig, trace);
      return Math.max(...trace.options.filter((o) => o.targetUid === m.uid).map((o) => o.score));
    };
    expect(killScore(true)).toBeLessThan(killScore(false));
  });
});

describe("5c. Pilgrim's Burden (Almoner's Vestments 3)", () => {
  it.each(MODES)('taşıyanın skill şifası dostun en uzun debuff\'ını 1 tur kısaltır; 1 turu kalan biter (%s)', (mode) => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'warrior' }, mode);
    const [p, w] = [at(b, 'party', 0), at(b, 'party', 1)];
    give(p, { healShorten: { turns: pb().turns! } });
    w.hp = 1000;
    b.debugAddStatus(w.uid, 'blinded', 3);
    b.debugAddStatus(w.uid, 'slow', 1);
    if (mode === 'turns') for (let i = 0; i < 80 && b.currentUid !== p.uid; i++) b.skipTurn();
    const long0 = w.statuses.find((s) => s.kind === 'blinded')!.turns;
    const ev = evs(b.useSkill(p.uid, 'radiance'));
    expect(passives(ev, 'pilgrims_burden').length).toBe(1);
    expect(w.statuses.find((s) => s.kind === 'blinded')!.turns).toBe(long0 - pb().turns!);
    // tek debuff 1 turda: biter
    const c = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'warrior' });
    give(at(c, 'party', 0), { healShorten: { turns: 1 } });
    at(c, 'party', 1).hp = 1000;
    c.debugAddStatus(at(c, 'party', 1).uid, 'blinded', 1);
    const evC = evs(c.useSkill(at(c, 'party', 0).uid, 'radiance'));
    expect(has(at(c, 'party', 1), 'blinded')).toBe(false);
    // maç kaydı: bitiş gerekçesi "expired" değil
    const end = evC.find((e) => e.type === 'statusEnd' && (e as { cause?: string }).cause === 'pilgrims_burden')!;
    expect(describeEvent(c, end)).toContain("Pilgrim's Burden");
  });

  it('canı dolu dosta (şifa 0) ve kendine işlemez', () => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'warrior' });
    const [p, w] = [at(b, 'party', 0), at(b, 'party', 1)];
    give(p, { healShorten: { turns: 1 } });
    b.debugAddStatus(w.uid, 'blinded', 3);
    p.hp = 1000;
    b.debugAddStatus(p.uid, 'blinded', 3);
    const ev = evs(b.useSkill(p.uid, 'radiance'));
    expect(passives(ev, 'pilgrims_burden').length).toBe(0);
    expect(w.statuses.find((s) => s.kind === 'blinded')!.turns).toBe(3);
    expect(p.statuses.find((s) => s.kind === 'blinded')!.turns).toBe(3);
  });

  it('YZ: debuff\'lı yaralı dosta şifa daha değerli', () => {
    const healScore = (fx: boolean) => {
      const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'warrior' });
      if (fx) give(at(b, 'party', 0), { healShorten: { turns: 1 } });
      at(b, 'party', 1).hp = 1000;
      b.debugAddStatus(at(b, 'party', 1).uid, 'blinded', 3);
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, at(b, 'party', 0).uid, content.aiConfig, trace);
      return Math.max(...trace.options.filter((o) => o.skill.id === 'radiance').map((o) => o.score));
    };
    expect(healScore(true)).toBeGreaterThan(healScore(false));
  });
});
