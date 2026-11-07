import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, ItemEffects } from '../src/engine';
import { chooseAction, type AiTrace } from '../src/engine/ai';
import { previewSkill } from '../src/engine/preview';
import { ITEMS, emptyEquipment, makeItem, partRange, tierPool } from '../src/progression/items';
import { Rng } from '../src/engine/rng';
import { setContribution, setPieces } from '../src/progression/sets';
import { buildMechanics } from '../src/wiki/catalog';

// Ömer 2026-11-07 set kuralları (set-rules-proposal B1-B4) + Spare Arrow (C1). Sayılar veriden.

const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');
const bigHp = (c: Combatant) => {
  c.maxHp = 5000;
  c.hp = 5000;
};

function fight(party: Record<number, string>, foe = 'warrior', mode: BattleMode = 'test', seed = 3): { b: Battle; heroes: Combatant[]; enemy: Combatant } {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells({ 0: foe }) }, false));
  const heroes = b.combatants.filter((c) => c.side === 'party' && !c.summoned);
  const enemy = b.combatants.find((c) => c.side === 'enemy')!;
  for (const c of b.combatants) bigHp(c);
  return { b, heroes, enemy };
}
const give = (c: Combatant, fx: ItemEffects) => {
  c.itemEffects = { ...(c.itemEffects ?? {}), ...fx };
};
const damageSkill = (b: Battle, from: Combatant, to: Combatant): string =>
  from.skills.find((s) => content.skills[s]!.effects.some((e) => e.type === 'damage') && b.validTargets(from.uid, s).some((x) => x.uid === to.uid))!;
const use = (b: Battle, actor: Combatant, skill: string, target: Combatant): BattleEvent[] => {
  actor.cooldowns = {};
  const r = b.useSkill(actor.uid, skill, target.uid);
  if (!r.ok) throw new Error(r.reason);
  return r.events;
};
const passives = (ev: BattleEvent[], id: string) => ev.filter((e) => e.type === 'passive' && (e as { passive?: string }).passive === id);
const hits = (ev: BattleEvent[], from: Combatant, to: Combatant) =>
  ev.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.source === from.uid && e.target === to.uid);

describe('set verisi', () => {
  it('dört yeni kural item verisinde ve efekt alanına eşlenir', () => {
    const full = (set: string) => {
      const eq = emptyEquipment();
      setPieces(set).forEach((d, i) => {
        (eq as Record<string, unknown>)[d.slot] = makeItem(d.id, `u${i}`, new Rng(i + 1));
      });
      return setContribution(eq, setPieces(set)[0]!.usableBy?.[0] ?? 'warrior').effects;
    };
    expect(full('ravens_shroud').dodgeCrit).toBe(true);
    expect(full('gallows_pact').escapeStatus).toEqual({ status: 'fortify', turns: 1 });
    expect(full('conclave_of_embers').counterAttack).toEqual({ power: 0.5, perTurn: 1 });
    expect(full('kingsfall_regalia').allyTurn).toBe(true);
  });
});

describe('Unseen (dodgeCrit)', () => {
  it('kaçınınca taşıyanın sonraki skill kullanımı kesin kritik, sonra biter', () => {
    const { b, heroes, enemy } = fight({ 3: 'archer' });
    const hero = heroes[0]!;
    give(hero, { dodgeCrit: true });
    b.debug.dodge = 'always';
    const ev = use(b, enemy, damageSkill(b, enemy, hero), hero);
    expect(passives(ev, 'unseen').length).toBe(1);
    expect(b.unseenReady(hero)).toBe(true);
    b.debug.dodge = 'never';
    const skill = damageSkill(b, hero, enemy);
    const pv = previewSkill(b, hero.uid, skill, enemy.uid).find((p) => p.uid === enemy.uid)!.damage!;
    expect(pv.critChance ?? 1).toBe(1);
    const out = hits(use(b, hero, skill, enemy), hero, enemy);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((h) => h.crit)).toBe(true);
    expect(b.unseenReady(hero)).toBe(false);
  });

  it('kuralı olmayan birim kaçınınca hazırlanmaz', () => {
    const { b, heroes, enemy } = fight({ 3: 'archer' });
    b.debug.dodge = 'always';
    use(b, enemy, damageSkill(b, enemy, heroes[0]!), heroes[0]!);
    expect(b.unseenReady(heroes[0]!)).toBe(false);
  });
});

describe("Hangman's Rope (escapeStatus)", () => {
  it('Lucky Escape ölümcül vuruşu yok sayınca 1 tur Fortified', () => {
    const { b, heroes, enemy } = fight({ 3: 'warrior' });
    const hero = heroes[0]!;
    give(hero, { escapeStatus: { status: 'fortify', turns: 1 } });
    hero.stats.surviveChance = 1;
    hero.hp = 1;
    hero.shield = 0;
    const ev: BattleEvent[] = [];
    (b as unknown as { applyHit: (...a: unknown[]) => number }).applyHit(enemy, hero, 500, 'physical', false, (e: BattleEvent) => ev.push(e), false, { origin: 'skill', damageType: 'physical' });
    expect(hero.hp).toBe(1);
    expect(passives(ev, 'hangmans_rope').length).toBe(1);
    expect(hero.statuses.find((s) => s.kind === 'fortify')).toBeTruthy();
  });
});

describe('The Conclave Answers (counterAttack)', () => {
  it('düşman taşıyana skill kullanınca bedava temel saldırıyla karşılık, turda bir kez', () => {
    const { b, heroes, enemy } = fight({ 3: 'archer' });
    const hero = heroes[0]!;
    give(hero, { counterAttack: { power: 0.5, perTurn: 1 } });
    b.debug.dodge = 'never';
    b.debug.crit = 'never';
    const skill = damageSkill(b, enemy, hero);
    const first = use(b, enemy, skill, hero);
    expect(hits(first, hero, enemy).length).toBeGreaterThan(0);
    const second = use(b, enemy, skill, hero);
    expect(hits(second, hero, enemy).length).toBe(0); // hak taşıyanın turuna kadar bitti
  });

  it('karşılık %50 güçte: aynı temel saldırının yarısı kadar', () => {
    const { b, heroes, enemy } = fight({ 3: 'archer' });
    const hero = heroes[0]!;
    give(hero, { counterAttack: { power: 0.5, perTurn: 1 } });
    b.debug.dodge = 'never';
    b.debug.crit = 'never';
    const pv = previewSkill(b, hero.uid, hero.skills[0]!, enemy.uid).find((p) => p.uid === enemy.uid)!.damage!;
    const dealt = hits(use(b, enemy, damageSkill(b, enemy, hero), hero), hero, enemy).reduce((s, h) => s + h.amount + h.absorbed, 0);
    expect(dealt).toBeGreaterThanOrEqual(Math.floor(pv.min * 0.5) - 1);
    expect(dealt).toBeLessThanOrEqual(Math.ceil(pv.max * 0.5) + 1);
  });
});

describe('Royal Command (allyTurn)', () => {
  it('turns modu: dost hemen ek tur alır, sayacı değişmez; savaşta bir kez', () => {
    const { b, heroes } = fight({ 3: 'warrior', 7: 'archer' }, 'warrior', 'turns');
    const [king, ally] = [heroes.find((h) => h.slot === 3)!, heroes.find((h) => h.slot === 7)!];
    give(king, { allyTurn: true });
    expect(b.globalSkillIds('party')).toContain('royal_command');
    expect(b.globalSkillIds('enemy')).not.toContain('royal_command');
    for (let i = 0; i < 200 && b.currentUid !== king.uid; i++) b.skipTurn();
    expect(b.currentUid).toBe(king.uid);
    expect(b.canUseGlobal(ally.uid, 'royal_command').ok).toBe(false);
    const before = ally.turnCounter;
    const r = b.useGlobal(king.uid, 'royal_command', undefined, ally.uid);
    if (!r.ok) throw new Error(r.reason);
    expect(r.events.some((e) => e.type === 'command' && e.target === ally.uid)).toBe(true);
    expect(b.currentUid).toBe(ally.uid);
    expect(ally.turnCounter).toBe(before);
    for (let i = 0; i < 200 && b.currentUid !== king.uid; i++) b.skipTurn();
    expect(b.canUseGlobal(king.uid, 'royal_command')).toMatchObject({ ok: false, reason: 'Already used in this battle' });
  });

  it('test modu: hak harcanır, hedef şart', () => {
    const { b, heroes } = fight({ 3: 'warrior', 7: 'archer' });
    const [king, ally] = [heroes.find((h) => h.slot === 3)!, heroes.find((h) => h.slot === 7)!];
    give(king, { allyTurn: true });
    expect(b.useGlobal(king.uid, 'royal_command').ok).toBe(false);
    expect(b.useGlobal(king.uid, 'royal_command', undefined, ally.uid).ok).toBe(true);
    expect(b.useGlobal(king.uid, 'royal_command', undefined, ally.uid).ok).toBe(false);
  });

  it('AI taşıyanın komut planını hesaplar ve geçerli hamle seçer', () => {
    const { b, heroes } = fight({ 3: 'warrior', 7: 'archer' }, 'warrior', 'turns');
    const king = heroes.find((h) => h.slot === 3)!;
    give(king, { allyTurn: true });
    for (let i = 0; i < 200 && b.currentUid !== king.uid; i++) b.skipTurn();
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    const pick = chooseAction(b, king.uid, content.aiConfig, trace);
    expect(pick).toBeTruthy();
    if (pick?.skillId === 'royal_command') expect(heroes.some((h) => h.uid === pick.targetUid && h.uid !== king.uid)).toBe(true);
    expect(trace.global?.command === undefined).toBe(false);
  });
});

describe('YZ: set kurallarının vuruş bedeli', () => {
  const scoreOn = (fx: ItemEffects | undefined): number => {
    const { b, heroes, enemy } = fight({ 3: 'archer' }, 'warrior', 'test', 9);
    if (fx) give(heroes[0]!, fx);
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    chooseAction(b, enemy.uid, content.aiConfig, trace);
    return trace.options.filter((o) => (o.dmgBy[heroes[0]!.uid] ?? 0) > 0).sort((x, y) => x.skill.id.localeCompare(y.skill.id))[0]!.score;
  };
  it('veride payları var', () => {
    expect(content.aiConfig.value?.setRules).toMatchObject({ unseenGift: expect.any(Number), ropeFortify: expect.any(Number), counterCost: expect.any(Number) });
  });
  it('karşılık veren ve kaçınınca kritik hazırlayan hedefe vurmak daha az değerli', () => {
    const bare = scoreOn(undefined);
    expect(scoreOn({ counterAttack: { power: 0.5, perTurn: 1 } })).toBeLessThan(bare);
    expect(scoreOn({ dodgeCrit: true })).toBeLessThan(bare);
  });
});

describe('Spare Arrow (basicRepeat)', () => {
  it('affix yalnızca Sadakta çıkar, değer ilvl ile %8-12', () => {
    expect(tierPool('B', 'offhand', 10, { slot: 'offhand', family: 'quivers' })).toContain('b_sparearrow');
    expect(tierPool('B', 'offhand', 10, { slot: 'offhand', family: 'orbs' })).not.toContain('b_sparearrow');
    expect(tierPool('B', 'offhand', 10, { slot: 'offhand', family: 'shields' })).not.toContain('b_sparearrow');
    expect(tierPool('B', 'offhand', 10)).not.toContain('b_sparearrow');
    expect(tierPool('B', 'weapon', 10, { slot: 'weapon', family: 'bows' })).not.toContain('b_sparearrow');
    const part = ITEMS.affixDefs.b_sparearrow!.parts[0]!;
    expect(partRange(part, 1)).toEqual([8, 8]);
    expect(partRange(part, 41)).toEqual([12, 12]);
  });

  it('yalnızca 0 bedelli ilk skill tekrar eder; önizleme sayar', () => {
    const { b, heroes, enemy } = fight({ 3: 'archer' });
    const hero = heroes[0]!;
    give(hero, { basicRepeat: 1 });
    expect(b.basicRepeatOf(hero, b.skill(hero.skills[0]!, hero)!)).toBe(1);
    expect(b.basicRepeatOf(hero, b.skill(hero.skills[1]!, hero)!)).toBe(0);
    b.debug.dodge = 'never';
    const plain = fight({ 3: 'archer' });
    const pvOn = previewSkill(b, hero.uid, hero.skills[0]!, enemy.uid).find((p) => p.uid === enemy.uid)!.damage!;
    const pvOff = previewSkill(plain.b, plain.heroes[0]!.uid, plain.heroes[0]!.skills[0]!, plain.enemy.uid).find((p) => p.uid === plain.enemy.uid)!.damage!;
    expect(pvOn.avg).toBeGreaterThan(pvOff.avg * 1.5);
    const ev = use(b, hero, hero.skills[0]!, enemy);
    expect(passives(ev, 'spare_arrow').length).toBe(1);
    expect(hits(ev, hero, enemy).length).toBeGreaterThanOrEqual(2);
  });

  it('wiki savaş kurallarında anılır, Royal Command herkesin eylemi değildir', () => {
    const all = JSON.stringify(buildMechanics());
    expect(all).toContain('Spare Arrow');
    const actions = buildMechanics().find((a) => a.id === 'actions');
    expect(JSON.stringify(actions)).not.toContain('Royal Command');
  });
});
