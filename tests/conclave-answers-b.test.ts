import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, ItemEffects } from '../src/engine';
import { chooseAction, type AiTrace } from '../src/engine/ai';
import { attributePower } from '../src/engine/stats';
import { emptyEquipment, makeItem } from '../src/progression/items';
import { Rng } from '../src/engine/rng';
import { SETS, conclaveAnswersText, setContribution, setPieces, setTip } from '../src/progression/sets';

// Ömer 2026-11-23 (form r41, Seçenek B): The Conclave Answers artık karşılık vuruşu yapmaz; taşıyana skill kullanan düşmanın altına Burning Ground çıkar,
// hücre zaten yanıyorsa zemin yerine debuff (Overextended). Sayılar veriden.

const CLASSES = ['mage', 'druid', 'undead', 'vesper'] as const;
const SET = SETS.find((s) => s.id === 'conclave_of_embers')!;
const B4 = SET.bonuses['4']!;

/** Tam setin efekti (gerçek parçalarla, setContribution). */
function fullFx(classId: string): ItemEffects {
  const eq = emptyEquipment();
  setPieces('conclave_of_embers').forEach((d, i) => {
    (eq as Record<string, unknown>)[d.slot] = makeItem(d.id, `u${i}`, new Rng(i + 1));
  });
  return setContribution(eq, classId).effects;
}
const CG = fullFx('mage').counterGround!;

const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');
function fight(party: Record<number, string>, foe: string, mode: BattleMode = 'test', seed = 3): { b: Battle; heroes: Combatant[]; enemy: Combatant } {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells({ 0: foe }) }, false));
  for (const c of b.combatants) {
    c.maxHp = 5000;
    c.hp = 5000;
  }
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return { b, heroes: b.combatants.filter((c) => c.side === 'party' && !c.summoned), enemy: b.combatants.find((c) => c.side === 'enemy')! };
}
const wear = (c: Combatant) => {
  c.itemEffects = { ...(c.itemEffects ?? {}), counterGround: fullFx(c.defId).counterGround! };
};
/** Düşmanın taşıyana ulaşan hasar skill'i (`kind`: tek hedef / tümü). */
const damageSkill = (b: Battle, from: Combatant, to: Combatant, pred: (id: string) => boolean = () => true): string =>
  from.skills.find((s) => pred(s) && content.skills[s]!.effects.some((e) => e.type === 'damage') && b.validTargets(from.uid, s).some((x) => x.uid === to.uid))!;
const use = (b: Battle, actor: Combatant, skill: string, target: Combatant): BattleEvent[] => {
  actor.cooldowns = {};
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target.uid);
  if (!r.ok) throw new Error(r.reason);
  return r.events;
};
const answers = (ev: BattleEvent[], w: Combatant) => ev.filter((e) => e.type === 'passive' && e.passive === 'conclave_answers' && e.actor === w.uid);
const groundsAt = (b: Battle, u: Combatant) => b.ground.filter((g) => g.ground === CG.ground && g.board === u.board && g.slots.includes(u.slot));
const groundEvents = (ev: BattleEvent[]) => ev.filter((e): e is Extract<BattleEvent, { type: 'ground' }> => e.type === 'ground');

describe('The Conclave Answers (Seçenek B): veri ve metin', () => {
  it('dört sınıfta tam set counterGround verir, alanlar veriden; eski karşılık anahtarı yok', () => {
    for (const cls of CLASSES) {
      const fx = fullFx(cls);
      expect(fx.counterGround).toEqual({ ground: B4.ground, scale: B4.scale, power: B4.power, turns: B4.turns, perTurn: B4.perTurn, status: B4.status, statusTurns: B4.statusTurns });
      expect((fx as Record<string, unknown>).counterAttack).toBeUndefined();
    }
    expect(content.grounds[CG.ground]).toBeTruthy();
    expect(content.statuses[CG.status]?.damageTakenMult ?? 1).toBeGreaterThan(1); // alınan hasarı artıran var olan durum
  });

  it('4 parça metni yeni kuralı söyler (zemin, güç, durum adı veriden), karşılık vuruşu ve em dash yok', () => {
    const text = conclaveAnswersText(B4);
    const pct = `${Math.round(B4.power! * 1000) / 10}%`;
    expect(text).toContain(`${content.grounds[CG.ground]!.name} appears under it`);
    expect(text).toContain(`${pct} of your ${CG.scale.toUpperCase()}`);
    expect(text).toContain(content.statuses[CG.status]!.name);
    expect(text).toContain('At most once between your turns');
    expect(text).not.toMatch(/strike back|basic attack/);
    const rows = setTip(setPieces('conclave_of_embers')[0], 'vesper')!.rows.map((r) => r.text).join('\n');
    expect(rows).not.toContain('—');
    expect(rows).toContain(text);
  });
});

describe('The Conclave Answers (Seçenek B): motor', () => {
  for (const cls of CLASSES) {
    it(`${cls}: düşman skill'i saldıranın hücresine zemin bırakır, taşıyan karşılık vurmaz`, () => {
      const { b, heroes, enemy } = fight({ 3: cls }, 'archer'); // menzilli saldıran: Heat Mirage çalışmaz
      const w = heroes[0]!;
      wear(w);
      const ev = use(b, enemy, damageSkill(b, enemy, w), w);
      expect(answers(ev, w).length).toBe(1);
      const ge = groundEvents(ev).filter((g) => g.ground === CG.ground && g.board === enemy.board && g.slots.includes(enemy.slot));
      expect(ge.length).toBe(1);
      const g = groundsAt(b, enemy);
      expect(g.length).toBe(1);
      expect(g[0]!.amount).toBe(Math.round(attributePower(w.stats, CG.scale, content.formulas) * CG.power));
      expect(g[0]!.turns).toBe(CG.turns);
      expect(g[0]!.tickOn).toBe(enemy.uid);
      expect(g[0]!.source).toBe(w.uid);
      expect(ev.some((e) => e.type === 'damage' && e.source === w.uid)).toBe(false); // eski karşılık vuruşu yok
      expect(enemy.statuses.some((s) => s.kind === CG.status)).toBe(false);
    });
  }

  it('Vesper: alan / tüm düşman skill\'i de tetikler (taşıyan hedef listesinde)', () => {
    const { b, heroes, enemy } = fight({ 3: 'warrior' }, 'vesper');
    const w = heroes[0]!;
    wear(w);
    const toll = damageSkill(b, enemy, w, (s) => content.skills[s]!.target === 'all_enemies');
    expect(toll).toBeTruthy();
    const ev = use(b, enemy, toll, w);
    expect(answers(ev, w).length).toBe(1);
    expect(groundsAt(b, enemy).length).toBe(1);
  });

  it('turda bir kez: ikinci kullanım hiçbir şey çıkarmaz; taşıyanın turu hakkı yeniler', () => {
    const { b, heroes, enemy } = fight({ 3: 'vesper' }, 'archer');
    const w = heroes[0]!;
    wear(w);
    const sk = damageSkill(b, enemy, w);
    use(b, enemy, sk, w);
    const before = b.ground.length;
    const second = use(b, enemy, sk, w);
    expect(answers(second, w).length).toBe(0);
    expect(enemy.statuses.some((s) => s.kind === CG.status)).toBe(false);
    expect(b.ground.length).toBe(before);
    use(b, w, damageSkill(b, w, enemy), enemy); // taşıyanın eylemi (finishAction) sayacı sıfırlar
    expect(answers(use(b, enemy, sk, w), w).length).toBe(1);
  });

  it('hücre zaten yanıyorsa ikinci zemin çıkmaz, saldırana durum (Overextended) atılır ve hak harcanır', () => {
    const { b, heroes, enemy } = fight({ 3: 'druid' }, 'archer');
    const w = heroes[0]!;
    wear(w);
    const sk = damageSkill(b, enemy, w);
    use(b, enemy, sk, w);
    expect(groundsAt(b, enemy).length).toBe(1);
    w.countersUsed = 0; // hakkı elle yenile (zemin hâlâ yerinde)
    const ev = use(b, enemy, sk, w);
    expect(answers(ev, w).length).toBe(1);
    expect(groundEvents(ev).length).toBe(0);
    expect(groundsAt(b, enemy).length).toBe(1);
    const st = enemy.statuses.find((s) => s.kind === CG.status);
    expect(st?.turns).toBe(CG.statusTurns);
    expect(st?.source).toBe(w.uid);
    expect(w.countersUsed).toBe(1);
  });

  it('Mage: yakın dövüşte Heat Mirage zemini bırakır, kural ikinci zemin yerine Overextended verir', () => {
    const { b, heroes, enemy } = fight({ 0: 'mage' }, 'warrior');
    const w = heroes[0]!;
    wear(w);
    const sk = damageSkill(b, enemy, w, (s) => content.skills[s]!.motion === 'melee' && content.skills[s]!.target === 'single_enemy');
    const ev = use(b, enemy, sk, w);
    expect(ev.some((e) => e.type === 'passive' && e.passive === 'heat_mirage')).toBe(true);
    expect(answers(ev, w).length).toBe(1);
    expect(groundsAt(b, enemy).length).toBe(1); // tek zemin
    expect(enemy.statuses.some((s) => s.kind === CG.status)).toBe(true);
  });

  it('iki taşıyan aynı alan skill\'iyle vurulursa: ilki zemin, ikincisi durum', () => {
    const { b, heroes, enemy } = fight({ 3: 'undead', 4: 'mage' }, 'vesper');
    for (const h of heroes) wear(h);
    const ev = use(b, enemy, damageSkill(b, enemy, heroes[0]!, (s) => content.skills[s]!.target === 'all_enemies'), heroes[0]!);
    expect(ev.filter((e) => e.type === 'passive' && e.passive === 'conclave_answers').length).toBe(2);
    expect(groundsAt(b, enemy).length).toBe(1);
    expect(enemy.statuses.some((s) => s.kind === CG.status)).toBe(true);
  });

  it('sersem taşıyan cevap vermez', () => {
    const { b, heroes, enemy } = fight({ 3: 'undead' }, 'archer');
    const w = heroes[0]!;
    wear(w);
    w.statuses.push({ kind: 'stun', turns: 1, source: enemy.uid });
    expect(answers(use(b, enemy, damageSkill(b, enemy, w), w), w).length).toBe(0);
    expect(groundsAt(b, enemy).length).toBe(0);
  });

  it('turns modu: zemin ve durum saldıranın eylem sonunu atlatır, zemin saldıranın sonraki turunda yakar', () => {
    const { b, heroes, enemy } = fight({ 3: 'vesper' }, 'archer', 'turns');
    const w = heroes[0]!;
    wear(w);
    for (let i = 0; i < 200 && b.currentUid !== enemy.uid; i++) b.skipTurn();
    expect(b.currentUid).toBe(enemy.uid);
    use(b, enemy, damageSkill(b, enemy, w), w);
    expect(groundsAt(b, enemy).length).toBe(1);
    expect(enemy.statuses.some((s) => s.kind === content.grounds[CG.ground]!.status)).toBe(true);
    const hp = enemy.hp;
    for (let i = 0; i < 200 && b.currentUid !== enemy.uid; i++) b.skipTurn();
    expect(b.currentUid).toBe(enemy.uid);
    expect(enemy.hp).toBeLessThan(hp); // tur başında Burning tiki
  });
});

describe('The Conclave Answers (Seçenek B): YZ', () => {
  const options = (fx: boolean, preBurn = false) => {
    const { b, heroes, enemy } = fight({ 3: 'vesper' }, 'archer', 'test', 9);
    if (fx) wear(heroes[0]!);
    if (preBurn) {
      wear(heroes[0]!);
      use(b, enemy, damageSkill(b, enemy, heroes[0]!), heroes[0]!);
      heroes[0]!.countersUsed = 0;
    }
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    chooseAction(b, enemy.uid, content.aiConfig, trace);
    return { trace, w: heroes[0]! };
  };
  const scoreOf = (t: AiTrace, w: Combatant) => t.options.filter((o) => (o.dmgBy[w.uid] ?? 0) > 0).sort((x, y) => x.skill.id.localeCompare(y.skill.id))[0]!;

  it('veride bedel payı var', () => {
    expect(content.aiConfig.value?.setRules?.counterCost).toBeGreaterThan(0);
  });

  it('taşıyana skill atmak zemin bedeli doğurur (puan düşer, gerekçe satırı zemini söyler)', () => {
    const bare = options(false);
    const on = options(true);
    const a = scoreOf(bare.trace, bare.w);
    const o = scoreOf(on.trace, on.w);
    expect(o.score).toBeLessThan(a.score);
    expect(o.notes.join('|')).toContain(`The Conclave Answers (${CG.ground})`);
  });

  it('hücre zaten yanıyorsa bedel durumdan gelir (motorla aynı çift zemin kuralı)', () => {
    const on = options(false, true);
    const o = scoreOf(on.trace, on.w);
    expect(o.notes.join('|')).toContain(`The Conclave Answers (${CG.status})`);
  });

  it('Mage: yakın dövüş seçeneğinde Heat Mirage zemini bırakacağı için bedel durumdan gelir (zemin iki kez sayılmaz)', () => {
    const { b, heroes, enemy } = fight({ 0: 'mage' }, 'warrior', 'test', 9);
    const w = heroes[0]!;
    wear(w);
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    chooseAction(b, enemy.uid, content.aiConfig, trace);
    const melee = trace.options.find((o) => o.skill.motion === 'melee' && o.primary?.uid === w.uid && (o.dmgBy[w.uid] ?? 0) > 0)!;
    expect(melee).toBeTruthy();
    expect(melee.notes.join('|')).toContain(`The Conclave Answers (${CG.status})`);
  });

  it('taşıyanın tarafı: Overextended alan saldırana dostun vuruşu daha değerli (var olan durum değeri taşır, yeni terim yok)', () => {
    const score = (debuffed: boolean) => {
      const { b, heroes, enemy } = fight({ 3: 'vesper', 4: 'archer' }, 'archer', 'test', 9);
      const ally = heroes.find((h) => h.defId === 'archer')!;
      if (debuffed) enemy.statuses.push({ kind: CG.status as never, turns: CG.statusTurns, source: heroes[0]!.uid });
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, ally.uid, content.aiConfig, trace);
      return trace.options.filter((o) => (o.dmgBy[enemy.uid] ?? 0) > 0).sort((x, y) => x.skill.id.localeCompare(y.skill.id))[0]!.score;
    };
    expect(score(true)).toBeGreaterThan(score(false));
  });

  it('dört sınıfın tam seti bedel doğurur', () => {
    for (const cls of CLASSES) {
      const { b, heroes, enemy } = fight({ 3: cls }, 'archer', 'test', 9);
      const trace0: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, enemy.uid, content.aiConfig, trace0);
      const base = scoreOf(trace0, heroes[0]!);
      wear(heroes[0]!);
      const trace1: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, enemy.uid, content.aiConfig, trace1);
      const withFx = trace1.options.find((x) => x.skill.id === base.skill.id && x.primary?.uid === base.primary?.uid)!;
      expect(withFx.score).toBeLessThan(base.score);
    }
  });
});

// r43 madde 3 (Lead 2026-11-24): taşıyanın kendi YZ terimi (karşılık beklentisi); iki taşıyanda iki bedel motorla aynı kalır. counterCost değeri aynı.
describe('The Conclave Answers: r43 YZ', () => {
  const conclaveNotes = (o: { notes: string[] }) => o.notes.filter((n) => n.includes('The Conclave Answers ('));

  it('iki taşıyan aynı alan skill\'iyle hedeflenirse YZ iki bedeli de sayar (motor da ikisine cevap verdirir: zemin + durum)', () => {
    const { b, heroes, enemy } = fight({ 3: 'undead', 4: 'mage' }, 'vesper');
    const sk = damageSkill(b, enemy, heroes[0]!, (s) => content.skills[s]!.target === 'all_enemies');
    const area = (n: number) => {
      for (const h of heroes) h.itemEffects = {};
      heroes.slice(0, n).forEach(wear);
      enemy.mp = enemy.maxMp;
      enemy.cooldowns = {};
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, enemy.uid, content.aiConfig, trace);
      return trace.options.find((o) => o.skill.id === sk)!;
    };
    const one = area(1);
    const two = area(2);
    expect(conclaveNotes(one).length).toBe(1);
    expect(conclaveNotes(two).length).toBe(2);
    expect(conclaveNotes(two).some((n) => n.includes(`(${CG.status})`))).toBe(true);
    expect(two.score).toBeLessThan(one.score);
  });

  it('taşıyanın YZ\'si: kendisini hedefleyecek düşmanı öldürmek karşılığı kaybettirir (küçük eksi terim); taşımayanda yok', () => {
    const val = (worn: boolean) => {
      const { b, heroes, enemy } = fight({ 3: 'mage' }, 'archer', 'test', 9);
      const w = heroes[0]!;
      if (worn) wear(w);
      enemy.hp = 1; // her saldırı öldürür
      w.mp = w.maxMp;
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, w.uid, content.aiConfig, trace);
      const kill = trace.options.find((o) => (o.killP[enemy.uid] ?? 0) > 0.5 && o.skill.id === 'fire_bolt')!;
      return kill.notes.filter((n) => n.startsWith('own The Conclave Answers')).length;
    };
    expect(val(false)).toBe(0);
    expect(val(true)).toBe(1);
  });

  it('hak perTurn: taşıyanı iki düşman hedefleyecekken birini öldürmek karşılığı kaybettirmez (öbürü yine tetikler)', () => {
    const outlook = (foes: number) => {
      const b = new Battle(content.battleSetup('random-battle', 9, 'test', { party: cells({ 3: 'mage' }), enemies: cells(foes === 2 ? { 0: 'archer', 1: 'archer' } : { 0: 'archer' }) }, false));
      for (const c of b.combatants) c.hp = c.maxHp = 5000;
      const w = b.combatants.find((c) => c.side === 'party')!;
      wear(w);
      w.mp = w.maxMp;
      const victim = b.combatants.find((c) => c.side === 'enemy')!;
      victim.hp = 1;
      const trace: AiTrace = { options: [], reserves: [], steps: [] };
      chooseAction(b, w.uid, content.aiConfig, trace);
      const kill = trace.options.find((o) => o.skill.id === 'fire_bolt' && o.primary?.uid === victim.uid)!;
      return kill.notes.filter((n) => n.startsWith('own The Conclave Answers')).length;
    };
    expect(outlook(1)).toBe(1);
    expect(outlook(2)).toBe(0);
  });

  it('veride taşıyan payı var', () => {
    expect(content.aiConfig.value?.setRules?.conclaveWearer).toBeGreaterThan(0);
  });
});
