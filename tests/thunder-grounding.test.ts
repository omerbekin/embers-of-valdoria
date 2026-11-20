// Şimşek kimliği (Ömer 2026-11-15/16): Shocked = Topraklama (büyü zırhı x thunder.magicArmorMult, şimşeğin kalkana giden kısmı x(1 + shieldBonus);
// sıra çubuğu geri itmesi yok), Islak devre (şimşek sıvıya düşünce iki tahtada da sıvıdaki herkese iletim + thunderSpark olayı), Electrocuted
// sırayı sıfırlamaz. Sayılar veriden (data/formulas.json > thunder, data/ai.json > value.thunder).
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill, explainChoice, previewSkill, unitLabel } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, Side, Teams } from '../src/engine';
import { shieldAbsorb } from '../src/engine/battle';
import { buildMechanics } from '../src/wiki/catalog';

const T = content.formulas.thunder;
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
function make(party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', rules?: Teams['rules']): Battle {
  const b = new Battle(content.battleSetup('random-battle', 7, mode, { party: cells(party), enemies: cells(enemies), ...(rules ? { rules } : {}) }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
const shocked = (c: Combatant) => c.statuses.some((s) => s.kind === T.badge);
/** useSkill olayları (başarısızsa test düşer). */
const evs = (r: ReturnType<Battle['useSkill']>): BattleEvent[] => {
  if (!r.ok) throw new Error(r.reason);
  return r.events;
};

describe('Shocked = Topraklama: büyü zırhı', () => {
  it('veri: geri itme alanı yok, büyü zırhı çarpanı ve kalkan bonusu var', () => {
    expect((T as Record<string, unknown>).pushback).toBeUndefined();
    expect(T.magicArmorMult).toBeGreaterThan(0);
    expect(T.magicArmorMult).toBeLessThan(1);
    expect(T.shieldBonus).toBeGreaterThan(0);
  });

  it.each(MODES)('Shocked birimin büyü zırhı veri çarpanıyla düşer, fiziksel zırh değişmez; eksi büyü zırhı çarpılmaz (%s)', (mode) => {
    const b = make({ 0: 'warrior' }, { 0: 'storm_tester' }, mode);
    const hero = at(b, 'party', 0);
    hero.stats = { ...hero.stats, magicArmor: 40, armor: 30 };
    b.debugBolt(hero.uid);
    expect(shocked(hero)).toBe(true);
    expect(b.effectiveStats(hero).magicArmor).toBeCloseTo(40 * T.magicArmorMult, 4);
    expect(b.effectiveStats(hero).armor).toBe(30);
    hero.stats = { ...hero.stats, magicArmor: -10 };
    expect(b.effectiveStats(hero).magicArmor).toBe(-10);
  });

  it('Shocked hedefe şimşek önizlemesi daha çok hasar gösterir (büyü zırhı düştü)', () => {
    const b = make({ 0: 'warrior' }, { 0: 'storm_tester' });
    const hero = at(b, 'party', 0);
    hero.stats = { ...hero.stats, magicArmor: 60 };
    const tester = at(b, 'enemy', 0);
    const avg = () => previewSkill(b, tester.uid, 'storm_test_iron', hero.uid).find((p) => p.uid === hero.uid)!.damage!.avg;
    const dry = avg();
    b.debugBolt(hero.uid);
    expect(avg()).toBeGreaterThan(dry);
  });

  it('önizleme satırı Shocked etkisini veriden yazar; geri itme yazmaz', () => {
    const b = make({ 0: 'warrior' }, { 0: 'storm_tester' });
    const rows = previewSkill(b, at(b, 'enemy', 0).uid, 'storm_test_bolt', at(b, 'party', 0).uid).find((p) => p.uid === at(b, 'party', 0).uid)?.statuses ?? [];
    const line = rows.find((l) => l.startsWith('Shocked'));
    expect(line).toContain(`${Math.round((1 - T.magicArmorMult) * 100)}% Magic Armor`);
    expect(rows.join(' ')).not.toMatch(/pushed back|turn bar/);
  });
});

describe('Shocked = Topraklama: kalkan', () => {
  it('shieldAbsorb: çarpan 1 eski kural; çarpan 2 kalkanı iki kat yer, biten kalkanın kalanı cana', () => {
    expect(shieldAbsorb(30, 10, 1)).toEqual({ used: 10, covered: 10 });
    expect(shieldAbsorb(30, 10, 2)).toEqual({ used: 20, covered: 10 });
    expect(shieldAbsorb(5, 10, 2)).toEqual({ used: 5, covered: 3 });
    expect(shieldAbsorb(0, 10, 2)).toEqual({ used: 0, covered: 0 });
  });

  const hit = (shock: boolean, skill: string, mode: BattleMode) => {
    const b = make({ 0: 'warrior' }, { 0: 'storm_tester' }, mode);
    const hero = at(b, 'party', 0);
    hero.stats = { ...hero.stats, magicArmor: 0, armor: 0 };
    hero.shield = 100000;
    if (shock) b.debugBolt(hero.uid);
    hero.shield = 100000;
    const hp = hero.hp;
    const ev = b.useSkill(at(b, 'enemy', 0).uid, skill, hero.uid);
    expect(ev.ok).toBe(true);
    const d = evs(ev).find((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.target === hero.uid && e.origin === 'skill')!;
    return { lost: 100000 - hero.shield, hpLost: hp - hero.hp, absorbed: d.absorbed };
  };

  it.each(MODES)('Shocked birime şimşek: kalkandan düşen x(1 + shieldBonus), can değişmez; Shocked değilse x1 (%s)', (mode) => {
    const plain = hit(false, 'storm_test_iron', mode);
    const sh = hit(true, 'storm_test_iron', mode);
    expect(plain.lost).toBeGreaterThan(0);
    expect(plain.hpLost).toBe(0);
    expect(sh.lost).toBe(Math.round(plain.lost * (1 + T.shieldBonus)));
    expect(sh.absorbed).toBe(sh.lost);
    expect(sh.hpLost).toBe(0);
  });

  it('önizleme kalkan payını motorla aynı çarpanla gösterir (YZ hasar değeri bunu okur)', () => {
    const b = make({ 0: 'warrior' }, { 0: 'storm_tester' });
    const hero = at(b, 'party', 0);
    hero.stats = { ...hero.stats, magicArmor: 0 };
    hero.shield = 100000;
    const pv = () => previewSkill(b, at(b, 'enemy', 0).uid, 'storm_test_iron', hero.uid).find((p) => p.uid === hero.uid)!.damage!;
    const plain = pv();
    expect(plain.absorbed).toBe(plain.avg);
    b.debugBolt(hero.uid);
    hero.shield = 100000;
    const sh = pv();
    expect(sh.absorbed).toBe(Math.round(sh.avg * (1 + T.shieldBonus)));
    expect(sh.hpLoss).toBe(0);
  });

  it('şimşek olmayan vuruş ve Shocked olmayan birimde çarpan 1; YZ öldürme tahmini kalkanı çarpanla böler', () => {
    const b = make({ 0: 'warrior' }, { 0: 'storm_tester' });
    const hero = at(b, 'party', 0);
    hero.shield = 40;
    expect(b.shieldHitMult(hero, 'lightning')).toBe(1);
    expect(b.shieldCover(hero, true, 'lightning')).toBe(40);
    b.debugBolt(hero.uid);
    expect(b.shieldHitMult(hero, 'physical')).toBe(1);
    expect(b.shieldHitMult(hero, 'lightning')).toBe(1 + T.shieldBonus);
    expect(b.shieldCover(hero, true, 'lightning')).toBe(Math.ceil(40 / (1 + T.shieldBonus)));
    expect(b.shieldCover(hero, true, 'fire')).toBe(40);
  });
});

describe('Islak devre (Live Water genişledi)', () => {
  it.each(MODES)('şimşek düşman suyuna düşünce kendi tahtamızın suyundaki dostlar da iletim yer; kuru ve Ice yemez; her iletime thunderSpark (%s)', (mode) => {
    // Kahraman şimşekçi (storm_tester) karşı tahtadaki suya atar; kendi tahtasında suda duran dostu da çarpılır
    const b = make({ 0: 'storm_tester', 1: 'warrior', 2: 'druid', 4: 'archer' }, { 0: 'drowned', 1: 'drowned', 2: 'drowned' }, mode);
    const caster = at(b, 'party', 0);
    const [wetAlly, dryAlly, iceAlly] = [at(b, 'party', 1), at(b, 'party', 2), at(b, 'party', 4)];
    const [foe0, foe1, foe2] = [at(b, 'enemy', 0), at(b, 'enemy', 1), at(b, 'enemy', 2)];
    b.debugPlaceGround(foe0.uid, 'flooded', 'party', [1, 4], 9, 0);
    b.debugPlaceGround(foe0.uid, 'ice_ground', 'party', [4], 9, 0);
    b.debugPlaceGround(caster.uid, 'flooded', 'enemy', [0], 9, 0);
    b.debugPlaceGround(caster.uid, 'blood', 'enemy', [2], 9, 0);
    for (const u of b.combatants) u.stats = { ...u.stats, hpRegen: 0 };
    if (mode === 'turns') for (let i = 0; i < 80 && b.currentUid !== caster.uid; i++) b.skipTurn();
    const hp = new Map(b.combatants.map((c) => [c.uid, c.hp]));
    const r = b.useSkill(caster.uid, 'storm_test_iron', foe0.uid);
    expect(r.ok).toBe(true);
    const sparks = evs(r).filter((e): e is Extract<BattleEvent, { type: 'thunderSpark' }> => e.type === 'thunderSpark');
    expect(sparks.map((s) => s.target).sort()).toEqual([foe0.uid, foe2.uid, wetAlly.uid].sort());
    for (const s of sparks) {
      expect(s.kind).toBe('conduct');
      expect(s.from).toEqual({ board: 'enemy', slot: 0 });
      expect(s.skill).toBe('storm_test_iron');
    }
    expect(wetAlly.hp).toBeLessThan(hp.get(wetAlly.uid)!);
    expect(foe2.hp).toBeLessThan(hp.get(foe2.uid)!); // kan da iletir
    expect(foe1.hp).toBe(hp.get(foe1.uid)!); // kuru
    expect(dryAlly.hp).toBe(hp.get(dryAlly.uid)!);
    expect(iceAlly.hp).toBe(hp.get(iceAlly.uid)!); // Ice iletmez
    // Kıvılcım hasardan önce gelir (render sırası)
    const i = evs(r).findIndex((e) => e.type === 'thunderSpark' && e.target === wetAlly.uid);
    const j = evs(r).findIndex((e, k) => k > i && e.type === 'damage' && e.target === wetAlly.uid);
    expect(j).toBeGreaterThan(i);
  });

  it('kuru hedefe şimşek iletmez (tahtalarda su olsa da); Holy Water iletmez', () => {
    const b = make({ 0: 'storm_tester', 1: 'warrior' }, { 0: 'drowned', 1: 'drowned' });
    b.debugPlaceGround(at(b, 'enemy', 0).uid, 'flooded', 'party', [1], 9, 0);
    b.debugPlaceGround(at(b, 'party', 0).uid, 'holy_water', 'enemy', [0], 9, 0);
    const ally = at(b, 'party', 1);
    const hp = ally.hp;
    const r = b.useSkill(at(b, 'party', 0).uid, 'storm_test_iron', at(b, 'enemy', 0).uid);
    expect(evs(r).some((e) => e.type === 'thunderSpark')).toBe(false);
    expect(ally.hp).toBe(hp);
    expect(b.wetCells('enemy')).toEqual([]);
  });

  it('önizleme sonuç = gerçek: iletim hasarı önizlemedeki Live Water satırıyla aynı', () => {
    const b = make({ 0: 'storm_tester', 1: 'warrior' }, { 0: 'drowned' });
    b.debugPlaceGround(at(b, 'enemy', 0).uid, 'flooded', 'party', [1], 9, 0);
    b.debugPlaceGround(at(b, 'party', 0).uid, 'flooded', 'enemy', [0], 9, 0);
    const ally = at(b, 'party', 1);
    const out = b.boltOutcome(at(b, 'party', 0), content.skills.storm_test_iron!, [{ board: 'enemy', cells: [0] }], [at(b, 'enemy', 0)]);
    const want = out.arcs.find((a) => a.uid === ally.uid)!.damage;
    const hp = ally.hp;
    b.useSkill(at(b, 'party', 0).uid, 'storm_test_iron', at(b, 'enemy', 0).uid);
    expect(hp - ally.hp).toBe(want);
  });

  it('aynı seed = aynı savaş (Islak devre ile)', () => {
    const run = () => {
      const b = make({ 0: 'storm_tester', 1: 'warrior' }, { 0: 'drowned', 1: 'drowned' }, 'turns', { condition: 'tide' });
      const log: string[] = [];
      for (let i = 0; i < 30 && !b.winner && b.currentUid; i++) {
        b.applyChoice(b.currentUid, chooseAction(b, b.currentUid, content.aiConfig));
      }
      for (const e of b.log) log.push(JSON.stringify(e));
      return log.join('\n');
    };
    expect(run()).toBe(run());
  });
});

describe('Electrocuted (sıra sıfırlama kalktı)', () => {
  it.each(MODES)('suda çarpılan birim dostuna vurur ama sıra sayacı korunur (%s)', (mode) => {
    const b = make({ 0: 'warrior', 1: 'druid' }, { 0: 'storm_tester' }, mode);
    const hero = at(b, 'party', 0);
    hero.turnCounter = 42;
    b.debugAddStatus(hero.uid, T.wetStatus, 3);
    b.debugBolt(hero.uid);
    expect(hero.statuses.some((s) => s.kind === T.wetInto)).toBe(true);
    expect(hero.turnCounter).toBe(42);
  });
});

/** Adayın 'thunder: ±x' notu (thunderValue); not yoksa 0. */
function thunderNote(b: Battle, actor: string, skill: string, target: Combatant): number {
  const ex = explainChoice(b, actor, content.aiConfig)!;
  const c = ex.candidates.find((x) => x.skill === skill && x.target === unitLabel(target));
  expect(c, `${skill} -> ${target.uid}`).toBeTruthy();
  const n = (c!.notes ?? []).find((x) => x.startsWith('thunder:'));
  return n ? Number(n.slice('thunder:'.length).trim()) : 0;
}

describe('YZ', () => {
  const setup = () => {
    // Kahraman şimşekçi + şimşekli dost (Skald): Shocked'ın değeri dostun vuruşlarından
    const b = make({ 0: 'storm_tester', 1: 'skald' }, { 0: 'warrior', 1: 'warrior' }, 'test');
    for (const u of b.fighting('enemy')) {
      u.hp = u.maxHp = 900;
      u.stats = { ...u.stats, magicArmor: 60 };
    }
    return b;
  };

  it('Shocked veren şimşek değer taşır (büyü zırhı düşüşü); zaten Shocked hedefe ek değer yok', () => {
    const b = setup();
    const [a, c] = [at(b, 'enemy', 0), at(b, 'enemy', 1)];
    const fresh = thunderNote(b, at(b, 'party', 0).uid, 'storm_test_bolt', a);
    expect(fresh).toBeGreaterThan(0);
    b.debugBolt(c.uid);
    expect(thunderNote(b, at(b, 'party', 0).uid, 'storm_test_bolt', c)).toBeLessThan(fresh);
  });

  it('zaten Shocked ve kalkanlı hedefe şimşekle vurmak ikizinden daha yüksek puan alır (kalkan çift erir)', () => {
    const b = make({ 0: 'storm_tester' }, { 0: 'warrior', 1: 'warrior' });
    for (const u of b.fighting('enemy')) {
      u.hp = u.maxHp = 900;
      u.stats = { ...u.stats, magicArmor: 0 };
    }
    b.debugBolt('enemy-1');
    for (const u of b.fighting('enemy')) u.shield = 200;
    const ex = explainChoice(b, 'party-0', content.aiConfig)!;
    const score = (uid: string) => ex.candidates.find((x) => x.skill === 'storm_test_iron' && x.target === unitLabel(b.get(uid)!))!.score ?? 0;
    expect(score('enemy-1')).toBeGreaterThan(score('enemy-0'));
  });

  it('Stormhide bedeli: büyü zırhlı kahraman için Stormhorn Ram\'a yakın dövüş eksi değer taşır; büyü zırhı yoksa bedel yok', () => {
    const notes = (ma: number) => {
      const b = make({ 0: 'warrior' }, { 0: 'stormhorn_ram', 1: 'storm_tester' });
      const w = b.get('party-0')!;
      w.stats = { ...w.stats, magicArmor: ma };
      const ex = explainChoice(b, 'party-0', content.aiConfig)!;
      return ex.candidates.find((x) => x.skill === 'melee_attack' && x.target === unitLabel(b.get('enemy-0')!))?.notes ?? [];
    };
    expect(notes(0).some((n) => n.startsWith('mob kit:'))).toBe(false);
    expect(notes(60).some((n) => /^mob kit: -/.test(n))).toBe(true);
  });

  it('kalkanlı hedefe Shocked daha değerli (şimşek kalkanı kat kat yer)', () => {
    const b = setup();
    const [a, c] = [at(b, 'enemy', 0), at(b, 'enemy', 1)];
    c.shield = 300;
    expect(thunderNote(b, at(b, 'party', 0).uid, 'storm_test_bolt', c)).toBeGreaterThan(thunderNote(b, at(b, 'party', 0).uid, 'storm_test_bolt', a));
  });

  it('sıvıdaki düşman kümesine düşen şimşek daha değerli; kendi takımı sıvıdaysa değer düşer (Islak devre riski)', () => {
    const b = make({ 0: 'storm_tester', 1: 'warrior' }, { 0: 'drowned', 1: 'drowned', 2: 'drowned' }, 'test');
    for (const u of b.combatants) u.hp = u.maxHp = 900;
    const caster = at(b, 'party', 0).uid;
    const foe = at(b, 'enemy', 0);
    const dry = thunderNote(b, caster, 'storm_test_iron', foe);
    b.debugPlaceGround(caster, 'flooded', 'enemy', [0, 1, 2], 9, 0);
    const wet = thunderNote(b, caster, 'storm_test_iron', foe);
    expect(wet).toBeGreaterThan(dry);
    b.debugPlaceGround(foe.uid, 'flooded', 'party', [0, 1], 9, 0);
    expect(thunderNote(b, caster, 'storm_test_iron', foe)).toBeLessThan(wet);
  });

  it('hücre değeri: kendi takımında şimşekçi varken ve karşı tahtada su varken kahraman sudan çıkar; karşı tahta kuruyken kalır', () => {
    const decide = (enemyWater: boolean) => {
      const b = make({ 0: 'warrior', 3: 'storm_tester' }, { 6: 'will_o_wisp', 9: 'drowned' }, 'turns');
      const hero = at(b, 'party', 0);
      b.debugPlaceGround(at(b, 'enemy', 9).uid, 'flooded', 'party', [0], 30, 0);
      if (enemyWater) b.debugPlaceGround(hero.uid, 'flooded', 'enemy', [6, 9], 30, 0);
      hero.skills = []; // yalnız hücre değeri ölçülür
      for (let i = 0; i < 80 && b.currentUid !== hero.uid; i++) b.skipTurn();
      return chooseAction(b, hero.uid, content.aiConfig);
    };
    expect(decide(true)?.skillId).toBe('move_tile');
    const calm = decide(false);
    expect(calm?.skillId === 'move_tile').toBe(false);
  });

});

describe('metinler', () => {
  it('durum, skill ve Codex metni Topraklama ve Islak devreyi anlatır, geri itme yok', () => {
    expect(content.statuses.shocked!.text).toContain(`${Math.round((1 - T.magicArmorMult) * 100)}% less Magic Armor`);
    expect(content.statuses.shocked!.text).not.toMatch(/pushed back|turn bar/);
    expect(content.statuses[T.wetInto!]!.text).not.toMatch(/turn bar/);
    const txt = JSON.stringify(describeSkill(content.skills.storm_test_bolt!, content.classes.storm_tester!.stats ?? content.classes.storm_tester!, content.formulas));
    expect(txt).toContain('less Magic Armor');
    expect(txt).toContain('both sides');
    expect(txt).not.toMatch(/turn bar/);
    const art = JSON.stringify(buildMechanics().find((x) => x.id === 'lightning-rules'));
    expect(art).toContain('BOTH sides');
    expect(art).not.toMatch(/pushed back/);
  });
});
