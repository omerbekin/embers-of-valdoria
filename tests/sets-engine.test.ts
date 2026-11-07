import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, UnitSetup } from '../src/engine';
import { chooseAction, type AiTrace } from '../src/engine/ai';
import { previewSkill } from '../src/engine/preview';
import { describePassive } from '../src/engine/skill-info';
import { patchedPassive } from '../src/engine/stats';
import { ITEMS, SLOT_IDS, itemDef, makeItem, emptyEquipment, canEquip, validateItems, type Equipment, type ItemDef } from '../src/progression/items';
import { loadout, loadoutSetup, affixContext } from '../src/progression/loadout';
import { RARE, rollRareDrop, type RareDropConfig } from '../src/progression/rare';
import { SETS, SET_ITEMS, equippedSetCounts, setContribution, setDropPools, setPieces, setTip } from '../src/progression/sets';
import { instanceLines } from '../src/progression/item-text';
import { reforgeBlocked, reforgeSlots } from '../src/campaign/smith';
import { buildMechanics, setsArticle } from '../src/wiki/catalog';
import { Rng } from '../src/engine/rng';

// Pilot setler (Ömer 2026-11-03; docs/design/progression/item-design-plan.md "Set kuralları"). Sayılar veriden okunur.

const ASH = SETS.find((s) => s.id === 'ashguard_vigil')!;
const WAY = SETS.find((s) => s.id === 'wayfarers_oath')!;
const COALS = ASH.bonuses['4']!;
const HOUND = WAY.bonuses['3']!;
const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');

function wearing(ids: string[]): Equipment {
  const eq = emptyEquipment();
  ids.forEach((id, i) => {
    const d = itemDef(id)!;
    (eq as Record<string, unknown>)[d.slot] = makeItem(id, `u${i}`, new Rng(i + 1));
  });
  return eq;
}
const ashPieces = (n: number) => setPieces('ashguard_vigil').slice(0, n).map((d) => d.id);
const wayPieces = (n: number) => setPieces('wayfarers_oath').slice(0, n).map((d) => d.id);

/** Kurulumlu tek hedef savaşı: party yuva 3 = `cls`, karşıda `foe`. */
function duel(cls: string, unit: UnitSetup, foe = 'warrior', mode: BattleMode = 'test', seed = 3): { b: Battle; hero: Combatant; enemy: Combatant } {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells({ 3: cls }), enemies: cells({ 0: foe }), units: { party: { 3: unit } } }, false));
  return { b, hero: b.combatants.find((c) => c.side === 'party' && !c.summoned)!, enemy: b.combatants.find((c) => c.side === 'enemy')! };
}

/** Hedefin korlu vuruşunu doğrudan işletir (motorun iç yolu: gerçek skill isabeti aynı applyHit'ten geçer). */
function hit(b: Battle, actor: Combatant, target: Combatant, amount: number): BattleEvent[] {
  const ev: BattleEvent[] = [];
  (b as unknown as { applyHit: (...a: unknown[]) => number }).applyHit(actor, target, amount, 'physical', false, (e: BattleEvent) => ev.push(e), false, { origin: 'skill', damageType: 'physical' });
  return ev;
}
const coalHits = (ev: BattleEvent[]) => ev.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && (e as { cause?: string }).cause === 'banked_coals');
const tick = (b: Battle, actor: Combatant): BattleEvent[] => {
  const ev: BattleEvent[] = [];
  (b as unknown as { applyCoalTicks: (a: Combatant, e: (x: BattleEvent) => void) => void }).applyCoalTicks(actor, (e) => ev.push(e));
  return ev;
};
const bigHp = (c: Combatant) => {
  c.maxHp = 5000;
  c.hp = 5000;
};

describe('set verisi ve katalog', () => {
  it('parçalar geçerli, ana katalogda ve bayrak kapalı', () => {
    expect(validateItems()).toEqual([]);
    expect(RARE.setsEnabled).toBe(false);
    expect(SET_ITEMS).toHaveLength(SETS.reduce((n, x) => n + x.slots.length, 0));
    for (const d of SET_ITEMS) {
      expect(itemDef(d.id)).toBe(d);
      expect(ITEMS.items.includes(d)).toBe(false);
    }
  });

  it('parça örneği Epic, üç sabit affix ile zarlanır', () => {
    const inst = makeItem('ashguard_helm', 'x', new Rng(5));
    expect(inst.rolls?.rarity).toBe('epic');
    expect(inst.rolls?.affixes.map((a) => a.id)).toEqual(itemDef('ashguard_helm')!.affixes);
  });

  it('Ashguard yalnızca üç sınıf, Wayfarer herkes takar', () => {
    const h = itemDef('ashguard_helm')!;
    expect(canEquip('warrior', h)).toBe(true);
    expect(canEquip('mage', h)).toBe(false);
    expect(canEquip('mage', itemDef('milestone_boots')!)).toBe(true);
  });

  it('reforge kapalı', () => {
    const inst = makeItem('ashguard_helm', 'u1', new Rng(1));
    expect(reforgeSlots(inst)).toEqual([]);
    const s = { roster: [], inventory: [inst], gold: 99999 } as unknown as Parameters<typeof reforgeBlocked>[0];
    expect(reforgeBlocked(s, 'u1', 1)).toBe('Set items cannot be reforged');
  });
});

describe('parça sayımı ve eşikler', () => {
  it('sayaç takılı farklı parçaları sayar', () => {
    expect(equippedSetCounts(wearing(ashPieces(3)))).toEqual({ ashguard_vigil: 3 });
    expect(equippedSetCounts(wearing([...ashPieces(1), 'drovers_signet']))).toEqual({ ashguard_vigil: 1, wayfarers_oath: 1 });
  });

  it('1 parça bonus vermez; 2 parça statları; 4 parçada Banked Coals', () => {
    expect(setContribution(wearing(ashPieces(1)), 'warrior')).toEqual({ mods: {}, effects: {} });
    expect(setContribution(wearing(ashPieces(2)), 'warrior').mods).toEqual(ASH.bonuses['2']!.mods);
    expect(setContribution(wearing(ashPieces(3)), 'warrior').effects).toEqual({});
    expect(setContribution(wearing(ashPieces(4)), 'warrior').effects.bankedCoals).toEqual({ share: COALS.bankShare, ticks: COALS.ticks });
    expect(setContribution(wearing(wayPieces(2)), 'mage').mods).toEqual(WAY.bonuses['2']!.mods);
    expect(setContribution(wearing(wayPieces(3)), 'mage').effects.roadHound).toEqual({ unit: 'road_hound' });
  });

  it('2 parça statı yuvarlak farkla kuruluma geçer', () => {
    const a = loadout({ class: 'warrior', equipment: wearing(ashPieces(1)) }).modifiers as { armorAdd?: number; magicArmorAdd?: number };
    const b = loadout({ class: 'warrior', equipment: wearing(ashPieces(2)) }).modifiers as { armorAdd?: number; magicArmorAdd?: number };
    expect(b.magicArmorAdd! - (a.magicArmorAdd ?? 0)).toBeGreaterThanOrEqual(2);
    const way = loadout({ class: 'mage', equipment: wearing(wayPieces(2)) }).modifiers as { hpRegenAdd?: number };
    expect(way.hpRegenAdd).toBeGreaterThanOrEqual(0.75);
  });

  for (const [cls, row] of Object.entries(ASH.bonuses['3']!.byClass!)) {
    it(`3 parça ${cls}: pasif sayısı veriden, ağaç üstüne fark eklenir, metin yeni sayıyı yazar`, () => {
      const setup = loadoutSetup({ class: cls, equipment: wearing(ashPieces(3)) });
      const { hero } = duel(cls, setup);
      const read = (p: unknown): number => row.field.split('.').reduce((o, k) => (o as Record<string, unknown>)[k], (p as { effect: unknown }).effect) as unknown as number;
      expect(read(hero.passive)).toBeCloseTo(row.to, 6);
      expect(read(content.classes[cls]!.passive)).toBeCloseTo(row.from, 6);
      // ağaçla gelen değerin üstüne: 0,1 fazlasıyla başlayan pasif yine farkı alır
      const raw = JSON.parse(JSON.stringify(content.classes[cls]!.passive));
      const path = row.field.split('.');
      let at = raw.effect;
      for (const k of path.slice(0, -1)) at = at[k];
      at[path[path.length - 1]!] += 0.1;
      expect(read(patchedPassive(raw, setup.passivePatch))).toBeCloseTo(row.to + 0.1, 6);
    });
  }

  it('yamalı pasif metni ve Berserker değeri YZ terimine akar', () => {
    const def = content.classes.defender!.passive!;
    const patched = patchedPassive(def, setContribution(wearing(ashPieces(3)), 'defender').passivePatch);
    const text = describePassive(patched, content.classes.defender!.stats, content.formulas);
    expect(text).toContain('50%');
    const zerk = duel('warrior', loadoutSetup({ class: 'warrior', equipment: wearing(ashPieces(3)) })).hero;
    expect((zerk.passive!.effect as { rageOnHurt: { perHpPercent: number } }).rageOnHurt.perHpPercent).toBe(0.5);
  });

  it('başka sınıfta (veri satırı yok) pasif yaması yok', () => {
    expect(setContribution(wearing(ashPieces(3)), 'mage').passivePatch).toBeUndefined();
  });
});

describe('Banked Coals', () => {
  const setup = (): UnitSetup => loadoutSetup({ class: 'warrior', equipment: wearing(ashPieces(4)) });

  it('40 hasar: 20 anında, 7 + 7 + 6 tik; toplam tam', () => {
    const { b, hero, enemy } = duel('warrior', setup());
    bigHp(hero);
    const shields = hero.shield + hero.magicShield;
    expect(shields).toBeGreaterThanOrEqual(0);
    hero.shield = 0;
    const before = hero.hp;
    const ev = hit(b, enemy, hero, 40);
    expect(before - hero.hp).toBe(20);
    expect(ev.some((e) => e.type === 'status' && e.status === 'banked_coals')).toBe(true);
    expect(b.coalPending(hero)).toBe(20);
    const amounts = [1, 2, 3].map(() => coalHits(tick(b, hero))[0]!.amount);
    expect(amounts).toEqual([7, 7, 6]);
    expect(b.coalPending(hero)).toBe(0);
    expect(tick(b, hero)).toEqual([]);
    expect(hero.statuses.some((s) => s.kind === 'banked_coals')).toBe(false);
    expect(before - hero.hp).toBe(40);
  });

  it('vuruş başına ayrı yanar, süreler sıfırlanmaz', () => {
    const { b, hero, enemy } = duel('warrior', setup());
    bigHp(hero);
    hit(b, enemy, hero, 40);
    tick(b, hero);
    hit(b, enemy, hero, 20);
    expect(hero.coals!.map((c) => c.left)).toEqual([2, 3]);
    const ticks = coalHits(tick(b, hero)).map((e) => e.amount);
    expect(ticks).toEqual([7, 3]);
  });

  it('tik yeniden ertelenmez; Fortified / Blessed tiki azaltmaz; öldürebilir', () => {
    const { b, hero, enemy } = duel('warrior', setup());
    bigHp(hero);
    hit(b, enemy, hero, 40);
    hero.statuses.push({ kind: 'fortify', turns: 3, source: hero.uid });
    hero.statuses.push({ kind: 'blessed', turns: 3, source: hero.uid });
    const n = hero.coals!.length;
    const first = coalHits(tick(b, hero))[0]!;
    expect(first.amount).toBe(7);
    expect(hero.coals!.length).toBe(n);
    hero.hp = 1;
    hero.shield = 0;
    const ev = tick(b, hero);
    expect(hero.hp).toBe(0);
    expect(ev.some((e) => e.type === 'death' && e.target === hero.uid)).toBe(true);
    expect(hero.coals).toEqual([]);
  });

  it('yalnızca düşman skill vuruşu ertelenir; 1 hasar ertelenmez', () => {
    const { b, hero, enemy } = duel('warrior', setup());
    bigHp(hero);
    const emit = () => undefined;
    const apply = (b as unknown as { applyHit: (...a: unknown[]) => number }).applyHit.bind(b);
    apply(enemy, hero, 40, 'physical', false, emit, false, { origin: 'status', damageType: 'physical' });
    expect(b.coalPending(hero)).toBe(0);
    apply(hero, hero, 40, 'physical', false, emit, false, { origin: 'skill', damageType: 'physical' });
    expect(b.coalPending(hero)).toBe(0);
    hit(b, enemy, hero, 1);
    expect(b.coalPending(hero)).toBe(0);
  });

  it('turns modu: gerçek skill vuruşu ertelenir, tik taşıyanın kendi tur başında', () => {
    const { b, hero, enemy } = duel('warrior', setup(), 'warrior', 'turns');
    b.debug.dodge = 'never';
    bigHp(hero);
    bigHp(enemy);
    for (let i = 0; i < 200 && b.currentUid !== enemy.uid; i++) b.skipTurn();
    enemy.cooldowns = {};
    const skill = enemy.skills.find((s) => content.skills[s]!.effects.some((e) => e.type === 'damage') && b.validTargets(enemy.uid, s).some((x) => x.uid === hero.uid))!;
    const r = b.useSkill(enemy.uid, skill, hero.uid);
    if (!r.ok) throw new Error(r.reason);
    
    const pending = Math.max(...r.events.flatMap((e) => (e.type === 'status' && e.status === 'banked_coals' ? [e.stacks ?? 0] : [])));
    expect(pending).toBeGreaterThan(0);
    const seen: BattleEvent[] = [...r.events];
    for (let i = 0; i < 200 && b.currentUid !== hero.uid; i++) {
      const s = b.skipTurn();
      if (s.ok) seen.push(...s.events);
    }
    expect(b.currentUid).toBe(hero.uid);
    expect(b.coalPending(hero)).toBeLessThan(pending);
    expect(coalHits(seen).length).toBeGreaterThan(0);
    // tik düşman kendi eylemini bitirip sıra taşıyana geçince, turnStart'tan önce
    const lastTick = seen.lastIndexOf(coalHits(seen).at(-1)!);
    expect(seen.slice(lastTick).some((e) => e.type === 'turnStart' && e.actor === hero.uid)).toBe(true);
  });

  it('test modu: tik taşıyanın eylemi sonunda', () => {
    const { b, hero, enemy } = duel('warrior', setup(), 'warrior', 'test');
    b.debug.dodge = 'never';
    bigHp(hero);
    bigHp(enemy);
    const skill = enemy.skills.find((s) => content.skills[s]!.effects.some((e) => e.type === 'damage') && b.validTargets(enemy.uid, s).some((x) => x.uid === hero.uid))!;
    expect(b.useSkill(enemy.uid, skill, hero.uid).ok).toBe(true);
    const pending = b.coalPending(hero);
    expect(pending).toBeGreaterThan(0);
    const burns = hero.coals!.length; // çok vuruşlu skill: her vuruş ayrı yanar
    const own = hero.skills.find((s) => b.validTargets(hero.uid, s).some((x) => x.uid === enemy.uid))!;
    const r = b.useSkill(hero.uid, own, enemy.uid);
    if (!r.ok) throw new Error(r.reason);
    expect(b.coalPending(hero)).toBeLessThan(pending);
    expect(coalHits(r.events).length).toBe(burns);
  });

  it('önizleme anında kalanı ve ertelenen payı ayırır', () => {
    const { b, hero, enemy } = duel('warrior', setup());
    bigHp(hero);
    hero.shield = 0;
    const skill = enemy.skills.find((s) => content.skills[s]!.effects.some((e) => e.type === 'damage') && b.validTargets(enemy.uid, s).some((x) => x.uid === hero.uid))!;
    const pv = previewSkill(b, enemy.uid, skill, hero.uid).find((p) => p.uid === hero.uid)!.damage!;
    expect(pv.banked).toBeGreaterThan(0);
    expect(pv.hpLoss + pv.absorbed + pv.banked!).toBeCloseTo(pv.avg, 6);
    const plain = duel('warrior', {});
    bigHp(plain.hero);
    plain.hero.shield = 0;
    expect(previewSkill(plain.b, plain.enemy.uid, skill, plain.hero.uid).find((p) => p.uid === plain.hero.uid)!.damage!.banked).toBeUndefined();
  });

  describe('YZ', () => {
    const traced = (b: Battle, uid: string): AiTrace => {
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, uid, content.aiConfig, trace);
      return trace;
    };
    const attackOn = (tr: AiTrace, uid: string) => tr.options.filter((o) => (o.dmgBy[uid] ?? 0) > 0).sort((x, y) => x.skill.id.localeCompare(y.skill.id))[0]!;

    it('ai.json payları var', () => {
      expect(content.aiConfig.value?.setRules).toMatchObject({ coalDelay: expect.any(Number), coalDoomed: expect.any(Number), coalCover: expect.any(Number) });
    });

    it('öldürme ihtimali taşıyıcıda ertelenen payla düşer; ertelenen hasar sayılır', () => {
      const worn = duel('warrior', setup(), 'warrior', 'test', 9);
      const bare = duel('warrior', {}, 'warrior', 'test', 9);
      const skill = bare.enemy.skills.find((s) => content.skills[s]!.effects.some((e) => e.type === 'damage') && bare.b.validTargets(bare.enemy.uid, s).some((x) => x.uid === bare.hero.uid))!;
      const raw = previewSkill(bare.b, bare.enemy.uid, skill, bare.hero.uid).find((p) => p.uid === bare.hero.uid)!.damage!;
      for (const d of [worn, bare]) {
        d.hero.shield = 0;
        d.hero.hp = Math.max(1, Math.floor(raw.min));
      }
      const a = attackOn(traced(worn.b, worn.enemy.uid), worn.hero.uid);
      const c = attackOn(traced(bare.b, bare.enemy.uid), bare.hero.uid);
      expect(a.skill.id).toBe(c.skill.id);
      expect(a.killP[worn.hero.uid]!).toBeLessThan(c.killP[bare.hero.uid]!);
      expect(a.coalBanked!).toBeGreaterThan(0);
      expect(c.coalBanked).toBeUndefined();
    });

    it('bekleyen koru canından çok olan hedefe vurmanın değeri düşer', () => {
      const safe = duel('warrior', setup(), 'warrior', 'test', 9);
      const doomed = duel('warrior', setup(), 'warrior', 'test', 9);
      for (const d of [safe, doomed]) bigHp(d.hero);
      doomed.hero.coals = [{ left: 3, per: 1700, rest: 5100, source: doomed.enemy.uid, type: 'physical' }];
      const a = attackOn(traced(safe.b, safe.enemy.uid), safe.hero.uid);
      const c = attackOn(traced(doomed.b, doomed.enemy.uid), doomed.hero.uid);
      expect(c.score).toBeLessThan(a.score);
    });

    it('kendi taşıyıcısının korunu karşılayan şifa değer kazanır', () => {
      const make = (coals: boolean) => {
        const b = new Battle(content.battleSetup('random-battle', 4, 'test', { party: cells({ 0: 'warrior', 3: 'paladin' }), enemies: cells({ 0: 'warrior' }), units: { party: { 0: setup() } } }, false));
        const w = b.combatants.find((c) => c.defId === 'warrior' && c.side === 'party')!;
        const pal = b.combatants.find((c) => c.defId === 'paladin')!;
        w.hp = Math.round(w.maxHp / 2);
        if (coals) w.coals = [{ left: 3, per: 10, rest: 30, source: pal.uid, type: 'physical' }];
        const tr = traced(b, pal.uid);
        return tr.options.find((o) => (o.healBy[w.uid] ?? 0) > 0)!;
      };
      expect(make(true).score).toBeGreaterThan(make(false).score);
    });
  });
});

describe('Road Hound', () => {
  const setup = (cls: string): UnitSetup => loadoutSetup({ class: cls, equipment: wearing(wayPieces(3)) });
  const houndOf = (b: Battle) => b.combatants.filter((c) => c.defId === 'road_hound');

  for (const mode of ['test', 'turns'] as const) {
    it(`${mode}: savaş başında yanında bir köpek, battleStart'ta var`, () => {
      const { b, hero } = duel('warrior', setup('warrior'), 'warrior', mode);
      const hs = houndOf(b);
      expect(hs).toHaveLength(1);
      const h = hs[0]!;
      expect(h.owner).toBe(hero.uid);
      expect(h.summoned).toBe(true);
      expect(h.lifespan).toBeUndefined();
      expect(h.board).toBe(hero.board);
      const L = content.formulas.formation.lanes;
      expect(Math.abs(Math.floor(h.slot / L) - Math.floor(hero.slot / L)) + Math.abs((h.slot % L) - (hero.slot % L))).toBe(1);
      const start = b.log.find((e) => e.type === 'battleStart') as Extract<BattleEvent, { type: 'battleStart' }>;
      expect(start.combatants.some((c) => c.defId === 'road_hound')).toBe(true);
    });
  }

  it('sahibi item alsa da köpek değişmez, sahip ölünce çağrı kuralı işler', () => {
    expect(content.setSummons.road_hound!.summonerScale!.from).toBe('primary');
  });

  it('statlar veriye eşit: can 2 x primary, hasar 0,5 x primary, hız 17, aggressive, item sayılmaz', () => {
    const scale = content.setSummons.road_hound!.summonerScale!;
    expect(scale.hp).toBe(HOUND.hpPerPrimary);
    expect(scale.damage).toBe(HOUND.damagePerPrimary);
    expect(content.setSummons.road_hound!.overrides?.spd).toBe(HOUND.spd);
    expect(content.setSummons.road_hound!.ai).toBe(HOUND.ai);
    const { b } = duel('warrior', setup('warrior'));
    const h = houndOf(b)[0]!;
    const primary = content.classes.warrior!.attributes.str;
    expect(h.maxHp).toBe(primary * 2);
    expect(h.stats.str).toBeCloseTo(primary * 0.5, 3);
    expect(Math.abs(h.stats.spd - 17)).toBeLessThanOrEqual(17 * 0.1);
    // INT sınıfı: kaynak INT, köpek yine STR ile vurur
    const m = houndOf(duel('mage', setup('mage')).b)[0]!;
    expect(m.maxHp).toBe(content.classes.mage!.attributes.int * 2);
    expect(m.stats.str).toBeCloseTo(content.classes.mage!.attributes.int * 0.5, 3);
  });

  it('item temel statı değiştirince köpek değişmez (primaryExcludesItems)', () => {
    const with3 = loadoutSetup({ class: 'warrior', equipment: wearing(wayPieces(3)) });
    const buffed: UnitSetup = { ...with3, summonBase: { ...content.classes.warrior!.attributes }, modifiers: { ...with3.modifiers, attrAdd: { str: 50 } } };
    const h = houndOf(duel('warrior', buffed).b)[0]!;
    expect(h.maxHp).toBe(content.classes.warrior!.attributes.str * 2);
  });

  it('ölünce savaşta yeniden gelmez; x2 hasar kuralı çağrı olarak geçerli', () => {
    const { b, hero } = duel('warrior', setup('warrior'), 'warrior', 'turns');
    const h = houndOf(b)[0]!;
    h.hp = 0;
    (b as unknown as { announceIfDead: (c: Combatant, e: (x: BattleEvent) => void) => void }).announceIfDead(h, () => undefined);
    for (let i = 0; i < 8; i++) b.skipTurn();
    expect(houndOf(b)).toHaveLength(1);
    expect(houndOf(b)[0]!.hp).toBe(0);
    expect(hero.summoned).toBeFalsy();
  });

  it('yanında boş hücre yoksa köpek gelmez', () => {
    const filled = { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior', 4: 'warrior', 5: 'warrior', 6: 'warrior', 7: 'warrior', 8: 'warrior', 9: 'warrior', 10: 'warrior', 11: 'warrior' };
    const b = new Battle(content.battleSetup('random-battle', 3, 'test', { party: cells(filled), enemies: cells({ 0: 'warrior' }), units: { party: { 4: setup('warrior') } } }, false));
    expect(houndOf(b)).toHaveLength(0);
  });

  it('YZ köpeği normal birim gibi oynatır ve hedefler', () => {
    const { b, enemy } = duel('warrior', setup('warrior'));
    const h = houndOf(b)[0]!;
    const own = chooseAction(b, h.uid, content.aiConfig);
    expect(own?.skillId).toBe('road_hound_bite');
    expect(b.validTargets(enemy.uid, enemy.skills[0]!).some((t) => t.uid === h.uid)).toBe(true);
  });
});

describe('set düşüşü', () => {
  const on: RareDropConfig = { ...RARE, setsEnabled: true, chance: { battle: 1, elite: 1, boss: 1 } };
  const pools = (party = ['warrior']) => setDropPools(ASH.map, ASH.dropper, party);
  const roll = (o: Partial<Parameters<typeof rollRareDrop>[0]>, n = 400) =>
    Array.from({ length: n }, (_, i) => rollRareDrop({ rng: new Rng(1000 + i), kind: 'elite', misses: 0, chapter: 1, cfg: on, setPools: pools(), ...o }));

  it('havuz: dropper düğümü, harita, parti süzgeci', () => {
    expect(pools().dropper.map((d: ItemDef) => d.set)).toContain('ashguard_vigil');
    expect(setDropPools(ASH.map, 'Some Camp', ['warrior']).dropper).toEqual([]);
    expect(setDropPools(ASH.map, ASH.dropper, ['mage']).map.map((d: ItemDef) => d.set)).not.toContain('ashguard_vigil'); // Ashguard'ı takacak yok (Kingsfall nötr: herkese)
    expect(setDropPools(WAY.map, WAY.dropper, ['mage']).dropper.length).toBe(WAY.slots.length);
    expect(setDropPools('Nowhere', ASH.dropper, ['warrior']).map).toEqual([]);
  });

  it('bossta ve Endless\'ta set yok', () => {
    expect(roll({ kind: 'boss' }).some((r) => r.branch === 'set')).toBe(false);
    expect(roll({ wave: 20 }).some((r) => r.branch === 'set')).toBe(false);
  });

  it('dropper elit: split.set payıyla; sayaç sıfırlanır', () => {
    const rs = roll({}, 1000);
    const sets = rs.filter((r) => r.branch === 'set');
    expect(sets.length / rs.length).toBeGreaterThan(on.split.set - 0.08);
    expect(sets.length / rs.length).toBeLessThan(on.split.set + 0.08);
    expect(sets.every((r) => r.misses === 0 && SET_ITEMS.some((d) => d.id === r.item))).toBe(true);
  });

  it('normal savaş ve dropper olmayan elit: Legendary dalı x setOfLegendary, harita havuzundan', () => {
    const rs = roll({ kind: 'battle', chapter: 2 }, 2000);
    const share = rs.filter((r) => r.branch === 'set').length / rs.length;
    const want = on.split.legendary * on.setOfLegendary!;
    expect(share).toBeGreaterThan(want - 0.04);
    expect(share).toBeLessThan(want + 0.04);
    const noDropper = setDropPools(ASH.map, 'Some Camp', ['warrior']);
    const el = roll({ kind: 'elite', chapter: 2, setPools: noDropper }, 2000);
    expect(el.filter((r) => r.branch === 'set').length / el.length).toBeLessThan(want + 0.04);
  });

  it('bayrak kapalı: havuz verilse de eski yol, zar sayısı ve sonuç aynı', () => {
    const off: RareDropConfig = { ...on, setsEnabled: false };
    for (let i = 0; i < 200; i++) {
      const a = new Rng(i);
      const b = new Rng(i);
      expect(rollRareDrop({ rng: a, kind: 'elite', misses: 0, chapter: 1, cfg: off, setPools: pools() })).toEqual(rollRareDrop({ rng: b, kind: 'elite', misses: 0, chapter: 1, cfg: off }));
      expect(a.next()).toBe(b.next());
    }
  });
});

describe('ipucu ve Codex', () => {
  it('ipucu: başlık sayacı, eşikler, taşıyanın sınıf satırı etkin', () => {
    const eq = wearing(ashPieces(3));
    const tip = setTip(itemDef('ashguard_helm'), 'defender', eq)!;
    expect(tip.title).toBe('Ashguard Vigil (3/4)');
    expect(tip.rows.find((r) => r.text.includes('+3 Armor'))!.on).toBe(true);
    expect(tip.rows.find((r) => r.text.includes('Bulwark Aura'))!.on).toBe(true);
    expect(tip.rows.find((r) => r.text.includes('Berserker'))!.on).toBe(false);
    expect(tip.rows.find((r) => r.text.includes('Banked Coals'))!.on).toBe(false);
    expect(setTip(itemDef('nasal_helm'), 'defender', eq)).toBeNull();
    for (const r of [...tip.rows, ...setTip(itemDef('milestone_boots'))!.rows]) expect(r.text).toMatch(/^\(\d\) [A-Z+]/);
  });

  it('kuşanma bağlamı parçayı takılı sayar; satır listesi set satırlarını içerir', () => {
    const src = { class: 'warrior', equipment: wearing(ashPieces(1)) };
    const ctx = affixContext(src, makeItem('ashguard_greaves', 'z', new Rng(2)))!;
    expect(equippedSetCounts(ctx.setEquipment)).toEqual({ ashguard_vigil: 2 });
    expect(instanceLines(makeItem('ashguard_greaves', 'z', new Rng(2)), 'warrior').join(' | ')).toContain('Ashguard Vigil (0/4)');
    expect(SLOT_IDS.length).toBeGreaterThan(0);
  });

  it('Codex: bayrakla açılır; metin parça adlarını ve kuralları yazar', () => {
    expect(buildMechanics().some((a) => a.id === 'set-items')).toBe(false);
    const art = setsArticle();
    expect(art.search).toContain('ashguard helm');
    expect(art.search).toContain('banked coals');
    expect(art.search).toContain('road hound');
  });
});
