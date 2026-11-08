import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, describeSkill, previewSkill } from '../src/engine';
import type { AiTrace } from '../src/engine/ai';
import type { BattleEvent, Combatant, CombatantDef } from '../src/engine';
import { skillAreaProblem } from '../src/engine/area-shape';
import { splitParts, type DamageEffect } from '../src/engine/spec';
import { targetBadge } from '../src/engine/skill-info';
import { ITEMS } from '../src/progression/items';
import { buildMechanics } from '../src/wiki/catalog';

// Thunder Skald (Ömer onayı 2026-11-07): War Drum (yeni hedef türü self_area), Hammer Spark (damage.split), pasif Conductor.
// Sayılar veriden okunur (PROVİZYON).

const SK = content.classes.skald!;
const S = content.skills;
const pe = SK.passive!.effect as Extract<NonNullable<CombatantDef['passive']>['effect'], { type: 'conductor' }>;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const dmg = (skill: string) => S[skill]!.effects.find((e) => e.type === 'damage') as DamageEffect;

function arena(party: [string, number][], enemies: [string, number][], seed = 1): Battle {
  const base = content.battleSetup('random-battle', seed, 'test', { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: party.map(([id]) => content.classes[id]!), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => content.classes[id]!), enemySlots: enemies.map(([, s]) => s) });
  b.freeMp = true;
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0, blockChance: 0 });
    c.hp = c.maxHp = 5000;
  }
  return b;
}
const skald = (b: Battle): Combatant => b.combatants.find((c) => c.defId === 'skald')!;
const foes = (b: Battle): Combatant[] => b.combatants.filter((c) => c.side === 'enemy');
function cast(b: Battle, skill: string, target?: string): BattleEvent[] {
  const r = b.useSkill(skald(b).uid, skill, target);
  if (!r.ok) throw new Error(`${skill}: ${r.reason}`);
  return r.events;
}
/** Skald'ın şimşek / fiziksel vuruşlarının toplamı (debug zarı sabit: aynı seed). */
const sumBy = (ev: BattleEvent[], el: string) => ofType(ev, 'damage').filter((d) => (d.element ?? 'physical') === el).reduce((a, d) => a + d.amount + d.absorbed, 0);

describe('Thunder Skald class verisi', () => {
  it('STR kahramanı, 4 skill, Conductor pasifi, çekiç / gürz / kalkan aileleri, başlangıç çekici + kalkan, Quick Battle havuzunda', () => {
    expect(SK.name).toBe('Thunder Skald');
    expect(SK.primary).toBe('str');
    expect(SK.skills).toEqual(['hammer_spark', 'thunder_strike', 'war_drum', 'stormcall']);
    expect(pe).toEqual({ type: 'conductor', element: 'lightning', statuses: ['slow', 'stun', 'shocked'], bonus: 0.25 });
    expect(S.hammer_spark!.cost.amount).toBe(0);
    expect(S.war_drum!.cost.amount).toBe(8); // 2026-11-08 Skald denge turu: 20 -> 8
    expect(S.war_drum!.cooldown).toBe(4); // 2026-11-08: 5 -> 4
    for (const fam of ['maces', 'hammers']) expect(ITEMS.weaponFamilies.find((f) => f.id === fam)!.classes).toContain('skald');
    expect(ITEMS.offhandKinds.find((f) => f.id === 'shields')!.classes).toContain('skald');
    expect(ITEMS.starterWeapons.classes.skald).toBe('war_hammer');
    expect(content.randomPool).toContain('skald');
    expect(content.battles['random-battle']!.random!.pool).toContain('skald');
  });
});

describe('Skald menzili: yakın dövüş grubu (Ömer 2026-11-08: "uzatılmış yakın dövüşçü")', () => {
  it('sınıf taban menzili 2, Stormcall istisnası 3, War Drum self_area menzilsiz; yakın dövüşçü + ön saf sayılır', () => {
    expect(SK.range).toBe(2);
    expect(S.hammer_spark!.range).toBeUndefined();
    expect(S.thunder_strike!.range).toBeUndefined();
    expect(S.stormcall!.range).toBe(3);
    expect(S.war_drum!.range).toBeUndefined();
    const b = arena([['skald', 4]], [['warrior', 0]]);
    const me = skald(b);
    expect(b.rangeOf(me, S.hammer_spark!)).toBe(2);
    expect(b.rangeOf(me, S.thunder_strike!)).toBe(2);
    expect(b.rangeOf(me, S.stormcall!)).toBe(3);
    expect(content.isMeleeClass('skald')).toBe(true);
    expect(SK.frontPriority).toBeLessThanOrEqual(2); // campaign.json > companySuggest: front = frontPriority <= 2
  });
});

describe('War Drum: self_area (kullanan merkezli 3x3)', () => {
  it('veri geçerli; alan Skald hücresi merkezli 3x3, yalnız içindeki dostlar 2 tur Haste alır', () => {
    expect(S.war_drum!.target).toBe('self_area');
    expect(skillAreaProblem(S.war_drum!, content.formulas.formation)).toBeNull();
    const b = arena([['skald', 4], ['warrior', 0], ['mage', 10]], [['warrior', 0]]);
    const me = skald(b);
    const cells = b.selfAreaCells(me.uid, 'war_drum').sort((x, y) => x - y);
    expect(cells).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(b.needsTargetChoice('war_drum', me.uid)).toBe(false);
    const ev = cast(b, 'war_drum');
    const hasted = ofType(ev, 'status').filter((s) => s.status === 'haste');
    const [, warrior, mage] = b.combatants.filter((c) => c.side === 'party');
    expect(hasted.map((s) => s.target).sort()).toEqual([me.uid, warrior!.uid].sort());
    expect(mage!.statuses.some((s) => s.kind === 'haste')).toBe(false);
    expect(warrior!.statuses.find((s) => s.kind === 'haste')?.turns).toBe((S.war_drum!.effects[0] as { turns: number }).turns); // veriden (2026-11-08: 2 -> 3)
    expect(foes(b)[0]!.statuses.some((s) => s.kind === 'haste')).toBe(false);
  });

  it('kenarda kırpılır: arka köşedeki Skald yalnız tahtadaki komşu hücreleri kapsar', () => {
    const b = arena([['skald', 11]], [['warrior', 0]]);
    expect(b.selfAreaCells(skald(b).uid, 'war_drum').sort((x, y) => x - y)).toEqual([7, 8, 10, 11]);
  });

  it('ipucu: rozet ve hedef satırı alanı anlatır', () => {
    expect(targetBadge(S.war_drum!)).toBe('Around You · Block 3x3');
    const st = skald(arena([['skald', 4]], [['warrior', 0]])).stats;
    const info = describeSkill(S.war_drum!, st, content.formulas);
    expect(info.target).toContain('3x3 square around you');
  });
});

describe('Hammer Spark: bölünmüş hasar (damage.split)', () => {
  it('parçalar: 0,30 STR fiziksel + 0,30 STR büyü şimşek', () => {
    const parts = splitParts(dmg('hammer_spark'));
    expect(parts.map((p) => [p.effect.damageType, p.effect.element ?? 'physical', +(p.share * dmg('hammer_spark').power).toFixed(3)])).toEqual([
      ['physical', 'physical', +(dmg('hammer_spark').power * 0.5).toFixed(3)], // 2026-11-08: güç 0,6 -> 0,57
      ['magic', 'lightning', +(dmg('hammer_spark').power * 0.5).toFixed(3)],
    ]);
  });

  it('tek vuruş: iki hasar olayı (fiziksel + şimşek), toplam önizleme aralığında', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const b = arena([['skald', 4]], [['defender', 1]], seed);
      const t = foes(b)[0]!;
      const pv = previewSkill(b, skald(b).uid, 'hammer_spark', t.uid).find((x) => x.uid === t.uid)!.damage!;
      const ev = cast(b, 'hammer_spark', t.uid);
      const hits = ofType(ev, 'damage');
      expect(hits.map((h) => [h.damageType, h.element])).toEqual([
        ['physical', 'physical'],
        ['magic', 'lightning'],
      ]);
      const total = hits.reduce((a, h) => a + h.amount + h.absorbed, 0);
      expect(total).toBeGreaterThanOrEqual(pv.min - 1);
      expect(total).toBeLessThanOrEqual(pv.max + 1);
    }
  });

  it('şimşek payı büyü zırhına, fiziksel pay zırha çarpar', () => {
    const b1 = arena([['skald', 4]], [['warrior', 1]]);
    const b2 = arena([['skald', 4]], [['warrior', 1]]);
    foes(b2)[0]!.stats.magicArmor += 200;
    const e1 = cast(b1, 'hammer_spark', foes(b1)[0]!.uid);
    const e2 = cast(b2, 'hammer_spark', foes(b2)[0]!.uid);
    expect(sumBy(e2, 'physical')).toBe(sumBy(e1, 'physical'));
    expect(sumBy(e2, 'lightning')).toBeLessThan(sumBy(e1, 'lightning'));
  });

  it('ipucu iki parçayı ayrı sayıyla yazar', () => {
    const st = skald(arena([['skald', 4]], [['warrior', 0]])).stats;
    const info = describeSkill(S.hammer_spark!, st, content.formulas);
    const text = info.lines.join(' | ');
    const pctTxt = `${Math.round(dmg('hammer_spark').power * 50)}% STR`; // veriden (0,57 x 0,5 = 0,285 -> 28%)
    expect(text).toContain(`${pctTxt} as physical damage`);
    expect(text).toContain(`${pctTxt} as lightning damage`);
    expect(text).toContain('Magic armor');
    expect(text).toContain('single hit');
  });
});

describe('Conductor: yalnız şimşek, Slow / Stun / Shocked ya da vuruşun kendisi verince, vuruş başına en çok +%25', () => {
  const fx = (statuses: string[] = []) => {
    const b = arena([['skald', 4]], [['warrior', 1]]);
    const t = foes(b)[0]!;
    for (const k of statuses) b.debugAddStatus(t.uid, k as never, 3);
    return { b, t, me: skald(b) };
  };

  it('dealtDamage: şimşek etkisine hedef Slowed iken x1,25; fiziksel etkiye yok; durum yokken Hammer Spark şimşek payına yok', () => {
    const { b, t, me } = fx(['slow']);
    const parts = splitParts(dmg('hammer_spark'));
    expect(b.dealtDamage(me, t, S.hammer_spark, parts[1]!.effect).mult).toBeCloseTo(1 + pe.bonus, 10);
    expect(b.dealtDamage(me, t, S.hammer_spark, parts[0]!.effect).mult).toBeCloseTo(1, 10);
    const clean = fx();
    expect(clean.b.dealtDamage(clean.me, clean.t, S.hammer_spark, parts[1]!.effect).mult).toBeCloseTo(1, 10);
  });

  it('vuruşun kendisi Shocked veriyor (Thunder Strike, Stormcall): durum yokken de +%25; hedef ayrıca Stunned iken yine yalnız +%25', () => {
    const clean = fx();
    expect(clean.b.dealtDamage(clean.me, clean.t, S.thunder_strike, dmg('thunder_strike')).mult).toBeCloseTo(1 + pe.bonus, 10);
    expect(clean.b.dealtDamage(clean.me, clean.t, S.stormcall, dmg('stormcall')).mult).toBeCloseTo(1 + pe.bonus, 10);
    const stunned = fx(['stun', 'slow']);
    expect(stunned.b.dealtDamage(stunned.me, stunned.t, S.thunder_strike, dmg('thunder_strike')).mult).toBeCloseTo(1 + pe.bonus, 10);
  });

  it('gerçek vuruş: Slowed hedefte Hammer Spark şimşek payı ~x1,25, fiziksel pay aynı', () => {
    const a = fx();
    const s = fx(['slow']);
    const ea = cast(a.b, 'hammer_spark', a.t.uid);
    const es = cast(s.b, 'hammer_spark', s.t.uid);
    expect(sumBy(es, 'physical')).toBe(sumBy(ea, 'physical'));
    const ratio = sumBy(es, 'lightning') / sumBy(ea, 'lightning');
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.3);
  });

  it('dost hedefe ve pasifi olmayana uygulanmaz', () => {
    const { b, me } = fx(['slow']);
    expect(b.conductorApplies(me, me, S.thunder_strike, dmg('thunder_strike'))).toBe(false);
    const other = b.combatants.find((c) => c.side === 'enemy')!;
    expect(b.conductorApplies(other, me, S.thunder_strike, dmg('thunder_strike'))).toBe(false);
  });

  it('pasif metni İngilizce, oranı yazar; Codex Mechanics status-bonus makalesinde', () => {
    const st = skald(arena([['skald', 4]], [['warrior', 0]])).stats;
    const text = describePassive(SK.passive!, st, content.formulas);
    expect(text).toContain('25% more');
    expect(text).toContain('Slowed, Stunned or Shocked');
    expect(JSON.stringify(buildMechanics().find((a) => a.id === 'status-bonus'))).toContain('Conductor');
  });
});

describe('Thunder Skald YZ', () => {
  it('War Drum seçeneği alandaki dostları hedefler ve Haste değeri taşır', () => {
    const b = arena([['skald', 4], ['warrior', 1], ['archer', 3]], [['warrior', 0], ['mage', 4]]);
    const me = skald(b);
    const trace = { options: [], reserves: [], steps: [] } as unknown as AiTrace;
    chooseAction(b, me.uid, content.aiConfig, trace);
    const drum = trace.options.find((o) => o.skill.id === 'war_drum');
    expect(drum).toBeDefined();
    expect(drum!.targets.length).toBe(3);
  });

  it('Conductor kurulumu: Thunder Strike Shocked vermesi setup terimi taşır; hedef zaten Slowed iken yok; Hammer Spark taşımaz', () => {
    const setupOf = (pre: string[]) => {
      const b = arena([['skald', 4]], [['warrior', 1]]);
      const me = skald(b);
      const t = foes(b)[0]!;
      for (const k of pre) b.debugAddStatus(t.uid, k, 3);
      const tr = { options: [], reserves: [], steps: [] } as unknown as AiTrace;
      chooseAction(b, me.uid, content.aiConfig, tr);
      const at = (id: string) => tr.options.find((o) => o.skill.id === id && o.targetUid === t.uid)?.terms?.setup ?? 0;
      return { strike: at('thunder_strike'), spark: at('hammer_spark') };
    };
    const fresh = setupOf([]);
    expect(fresh.strike).toBeGreaterThan(0);
    expect(fresh.spark).toBe(0);
    expect(setupOf(['slow']).strike).toBe(0);
  });

  it('turns modunda YZ oynatır (geçerli hamleler), aynı seed aynı sonuç', () => {
    const run = (seed: number) => {
      const b = new Battle(content.battleSetup('random-battle', seed, 'turns', { party: ['skald', 'warrior', 'mage', 'archer'], enemies: ['skald', 'defender', 'paladin', 'hexer'] }));
      const used = new Set<string>();
      for (let i = 0; i < 500 && !b.winner; i++) {
        const actor = b.currentUid!;
        const choice = chooseAction(b, actor, content.aiConfig);
        if (choice && b.get(actor)?.defId === 'skald') used.add(choice.skillId);
        const r = b.applyChoice(actor, choice);
        expect(r.ok, `seed ${seed} tur ${i}`).toBe(true);
      }
      return { winner: b.winner, used: [...used].sort() };
    };
    const all = new Set<string>();
    for (const seed of [5, 6, 7]) {
      const a = run(seed);
      expect(a.winner).not.toBeNull();
      expect(run(seed)).toEqual(a);
      for (const u of a.used) all.add(u);
    }
    expect(all.has('hammer_spark')).toBe(true);
  });
});
