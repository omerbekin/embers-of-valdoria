// Frozen (Ömer 2026-10-31; maps-2-3.md M-D, M-E; statuses.json > chilled.freeze, frozen; battle-rules.json > blizzard). Sayılar veriden okunur.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill } from '../src/engine';
import type { Combatant, Side, Teams } from '../src/engine';
import { battleRulesArticle } from '../src/wiki/catalog';
import { condHolds } from '../src/engine/tree-hooks';
import { damageSpecFor, type DamageEffect } from '../src/engine/spec';
import encounters from '../data/campaign/hollow-crown-encounters.json';

const FZ = content.statuses['chilled']!.freeze!;
const BLIZ = content.battleRulesData.conditions['blizzard']!;

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
function make(party: Record<number, string>, enemies: Record<number, string>, mode: 'turns' | 'test' = 'test', rules?: Teams['rules'], seed = 7): Battle {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), ...(rules ? { rules } : {}) };
  const b = new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
  Object.assign(b.debug, { miss: 'never', dodge: 'never' });
  return b;
}
const of = (b: Battle, id: string): Combatant => b.combatants.find((c) => c.defId === id && c.hp > 0)!;
const has = (c: Combatant, kind: string) => c.statuses.some((s) => s.kind === kind);
/** Ice Crater atışı (hedef ölmesin, cooldown engellemesin). */
function shot(b: Battle, target: Combatant, skill = 'ice_crater'): void {
  const mage = of(b, 'mage');
  b.debugClearCooldowns();
  target.hp = target.maxHp;
  mage.mp = mage.maxMp;
  const r = b.useSkill(mage.uid, skill, target.uid);
  expect(r.ok, r.ok ? '' : r.reason).toBe(true);
  target.hp = target.maxHp;
}
const P = { 3: 'mage', 4: 'warrior' };
const E = { 0: 'drowned', 1: 'drowned', 6: 'fen_witchling' };

describe('Frozen: ikinci atış', () => {
  for (const mode of ['test', 'turns'] as const)
    it(`${mode}: ilk atış Chilled, ikinci atış Frozen (Chilled kalkar, süre veriden)`, () => {
      const b = make(P, E, mode);
      const t = of(b, 'drowned');
      if (mode === 'turns') {
        for (let i = 0; i < 20 && b.currentActor?.defId !== 'mage'; i++) b.skipTurn();
      }
      shot(b, t);
      expect(has(t, 'chilled')).toBe(true);
      expect(has(t, 'frozen')).toBe(false);
      if (mode === 'turns') {
        for (let i = 0; i < 30 && b.currentActor?.defId !== 'mage'; i++) b.skipTurn();
        if (!has(t, 'chilled')) b.debugAddStatus(t.uid, 'chilled', 3);
      }
      shot(b, t);
      expect(has(t, 'chilled')).toBe(false);
      const fz = t.statuses.find((s) => s.kind === 'frozen');
      expect(fz?.turns).toBe(FZ.turns);
      expect(b.log.some((e) => e.type === 'statusEnd' && e.status === 'chilled' && e.target === t.uid)).toBe(true);
    });

  it('tek atışın iki etkisi kendi ilk Chilledını iki kez saymaz; yeni atış sayar', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    const mage = of(b, 'mage');
    const priv = b as unknown as { castingSkill: unknown; castChilled: Set<string>; addStatus(c: Combatant, s: object, e: () => void): void; freezeOnDrop(o: Combatant, g: string, bd: Side, sl: number[], or: string, e: () => void): void };
    const emit = () => {};
    priv.castingSkill = content.skills["ice_crater"];
    priv.addStatus(t, { kind: 'chilled', turns: 2, source: mage.uid, origin: 'skill' }, emit);
    expect(has(t, 'chilled')).toBe(true);
    priv.addStatus(t, { kind: 'chilled', turns: 2, source: mage.uid, origin: 'skill' }, emit); // çok vuruş
    priv.freezeOnDrop(mage, 'storm', t.board, [t.slot], 'skill', emit); // zemin etkisi
    expect(has(t, 'frozen')).toBe(false);
    priv.castChilled.clear(); // yeni atış
    priv.addStatus(t, { kind: 'chilled', turns: 2, source: mage.uid, origin: 'skill' }, emit);
    expect(has(t, 'frozen')).toBe(true);
    priv.castingSkill = null;
  });

  it('ağaç düğümünden gelen atış sayılır, pasif / hava / debug kaynaksız sayılmaz', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    const mage = of(b, 'mage');
    const add = (origin?: string) => (b as unknown as { addStatus(c: Combatant, s: object, e: () => void): void }).addStatus(t, { kind: 'chilled', turns: 2, source: mage.uid, ...(origin ? { origin } : {}) }, () => {});
    add();
    add();
    add();
    expect(has(t, 'frozen')).toBe(false);
    add('tree');
    expect(has(t, 'frozen')).toBe(true);
  });

  it('Frozen bitince Chilled kalmaz; yeniden donmak iki yeni atış ister', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    shot(b, t);
    shot(b, t);
    expect(has(t, 'frozen')).toBe(true);
    shot(b, t); // Frozen sürerken Chilled tutmaz, süre uzamaz
    expect(has(t, 'chilled')).toBe(false);
    expect(t.statuses.find((s) => s.kind === 'frozen')?.turns).toBe(FZ.turns);
    b.debugClearStatuses(t.uid);
    expect(has(t, 'chilled')).toBe(false);
    shot(b, t);
    expect(has(t, 'frozen')).toBe(false);
    shot(b, t);
    expect(has(t, 'frozen')).toBe(true);
  });

  it('turns modunda Frozen birim turunu kaybeder ve bitince hiçbir buz durumu kalmaz', () => {
    const b = make(P, { 0: 'drowned' }, 'turns');
    const t = of(b, 'drowned');
    b.debugAddStatus(t.uid, 'frozen', FZ.turns);
    const hp = of(b, 'warrior').hp;
    for (let i = 0; i < 12 && has(t, 'frozen'); i++) b.skipTurn();
    expect(has(t, 'frozen')).toBe(false);
    expect(has(t, 'chilled')).toBe(false);
    expect(of(b, 'warrior').hp).toBe(hp);
    expect(b.log.some((e) => e.type === 'statusEnd' && e.status === 'frozen' && e.target === t.uid)).toBe(true);
  });

  it('boss donmaz, Chilled de tutmaz', () => {
    const b = make(P, { 1: 'drowned' });
    const t = of(b, 'drowned');
    t.tier = 'boss'; // bağışıklık rütbeden (statusBlocked)
    expect(b.statusBlocked(t, 'frozen')).toBe(true);
    shot(b, t);
    shot(b, t);
    expect(has(t, 'chilled')).toBe(false);
    expect(has(t, 'frozen')).toBe(false);
  });
});

describe('Frozen: sayım (Chilled üstüne gelen Chilled sayılır)', () => {
  const holds = (t: Combatant, self: Combatant) => condHolds({ targetStatus: ['slow', 'chilled'] } as never, { self, target: t } as never);
  it('atışla oluşan Frozen Chilled koşulunu tutturur, doğrudan Frozen tutturmaz', () => {
    const b = make(P, E);
    const [t, u] = b.combatants.filter((c) => c.defId === 'drowned') as [Combatant, Combatant];
    const mage = of(b, 'mage');
    shot(b, t);
    shot(b, t);
    expect(has(t, 'frozen')).toBe(true);
    expect(has(t, 'chilled')).toBe(false);
    expect(holds(t, mage)).toBe(true);
    b.debugAddStatus(u.uid, 'frozen', 1);
    expect(holds(u, mage)).toBe(false);
  });
  it('skill bonusu (bonusVsStatus) aynı yardımcıdan; Frozen kalkınca sayım da kalkar', () => {
    const b = make(P, E);
    const [t, u] = b.combatants.filter((c) => c.defId === 'drowned') as [Combatant, Combatant];
    const mage = of(b, 'mage');
    shot(b, t);
    shot(b, t);
    b.debugAddStatus(u.uid, 'frozen', 1);
    const fx = { type: 'damage', damageType: 'magic', scale: 'int', power: 1, element: 'ice', bonusVsStatus: { status: 'chilled', multiplier: 2 } } as unknown as DamageEffect;
    const pow = (c: Combatant) => damageSpecFor(mage, c, fx, content.formulas).power;
    expect(pow(t)).toBeCloseTo(pow(u) * 2, 5);
    b.debugClearStatuses(t.uid);
    expect(holds(t, mage)).toBe(false);
  });
  it('Frozen hedefe buz atışı süreyi uzatmaz, yeniden tetiklemez (peş peşe kilit yok)', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    shot(b, t);
    shot(b, t);
    const count = () => b.log.filter((e) => e.type === 'status' && e.status === 'frozen' && e.target === t.uid).length;
    const n = count();
    const turns = t.statuses.find((s) => s.kind === 'frozen')!.turns;
    shot(b, t);
    shot(b, t);
    expect(count()).toBe(n);
    expect(t.statuses.find((s) => s.kind === 'frozen')!.turns).toBe(turns);
  });
});

describe('Frozen + Stun birlikte', () => {
  it('2 tur Stun + 1 tur Frozen = 2 tur kayıp, 3. turda oynar; süreler birlikte işler', () => {
    const b = make({ 0: 'warrior' }, { 0: 'drowned' }, 'turns');
    const t = of(b, 'drowned');
    b.debugAddStatus(t.uid, 'stun', 2);
    b.debugAddStatus(t.uid, 'frozen', 1);
    expect(has(t, 'stun') && has(t, 'frozen')).toBe(true);
    const skipped = () => b.log.filter((e) => e.type === 'statusEnd' && e.target === t.uid && (e.status === 'frozen' || e.status === 'stun')).map((e) => (e as { status: string }).status);
    let guard = 0;
    while (guard++ < 60 && has(t, 'stun')) b.skipTurn();
    expect(has(t, 'frozen')).toBe(false);
    expect(skipped()).toEqual(['frozen', 'stun']);
    guard = 0;
    while (guard++ < 60 && b.currentActor?.uid !== t.uid) b.skipTurn();
    expect(b.currentActor?.uid).toBe(t.uid); // sıra gelince oynar (2 kayıptan sonra)
    expect(t.statuses.some((s) => b.statusDef(s.kind)?.skipTurn)).toBe(false);
  });
  it('Stun Frozen hedefe, Frozen Stunlı hedefe engellenmez; Chilled kalkar, Stun sürer', () => {
    const b = make({ 0: 'warrior' }, { 0: 'drowned' }, 'turns');
    const t = of(b, 'drowned');
    b.debugAddStatus(t.uid, 'chilled', 3);
    b.debugAddStatus(t.uid, 'stun', 3);
    b.debugAddStatus(t.uid, 'frozen', 1);
    expect(has(t, 'stun') && has(t, 'frozen')).toBe(true);
    expect(has(t, 'chilled')).toBe(false);
    expect(t.statuses.find((s) => s.kind === 'frozen')?.countsAs).toBe('chilled');
    let guard = 0;
    while (guard++ < 40 && has(t, 'frozen')) b.skipTurn();
    expect(has(t, 'chilled')).toBe(false);
    expect(has(t, 'stun')).toBe(true);
  });
});

describe('Frozen: zemin', () => {
  it('Chill Ground tiki yalnızca Chilled verir; içinde durmak dondurmaz', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    const mage = of(b, 'mage');
    b.debugPlaceGround(mage.uid, 'storm', t.board, [t.slot], 3);
    expect(has(t, 'chilled')).toBe(true);
    for (let i = 0; i < 4; i++) b.syncGroundStatuses(() => {});
    expect(has(t, 'frozen')).toBe(false);
  });

  it('Chill Ground ikinci kez aynı hücreye: hücre Ice olur VE içindeki Chilled donar', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    const mage = of(b, 'mage');
    b.debugPlaceGround(mage.uid, 'storm', t.board, [t.slot], 3);
    expect(has(t, 'frozen')).toBe(false);
    b.debugPlaceGround(mage.uid, 'storm', t.board, [t.slot], 3);
    expect(has(t, 'frozen')).toBe(true);
    expect(has(t, 'chilled')).toBe(false);
    expect(b.ground.some((g) => g.ground === 'ice_ground' && g.slots.includes(t.slot))).toBe(true);
    expect(has(t, 'slow')).toBe(true); // Ice Slow verir, Frozen vermez
  });

  it('Ice zemini tek başına Slow verir, Frozen vermez', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    b.debugPlaceGround(of(b, 'mage').uid, 'ice_ground', t.board, [t.slot], 3);
    expect(has(t, 'slow')).toBe(true);
    expect(has(t, 'frozen')).toBe(false);
  });

  it('Burning zemindeki birim Chilled almaz', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    b.debugPlaceGround(of(b, 'mage').uid, 'burning', t.board, [t.slot], 3);
    expect(b.statusRefused(t, 'chilled')).toBe(true);
    shot(b, t);
    expect(has(t, 'chilled')).toBe(false);
  });
});

describe('Frozen: ateş', () => {
  it('ateş hasarı Chilled ve Frozenı anında kaldırır', () => {
    const b = make(P, E);
    const t = of(b, 'drowned');
    shot(b, t);
    expect(has(t, 'chilled')).toBe(true);
    shot(b, t, 'fire_bolt');
    expect(has(t, 'chilled')).toBe(false);
    b.debugAddStatus(t.uid, 'frozen', 1);
    shot(b, t, 'fire_bolt');
    expect(has(t, 'frozen')).toBe(false);
  });
});

describe('M-E Blizzard', () => {
  const R = BLIZ.heat!;
  it('işaretli sıra, sonraki Round Chill Ground; içindeki Chilled (donmaz); menzilli isabet veriden; seed aynı', () => {
    const mk = () => make(P, E, 'turns', { condition: 'blizzard' });
    expect(mk().hazards).toEqual(mk().hazards);
    const b = mk();
    const h = b.hazards[0]!;
    expect(h.kind).toBe('heat');
    for (let i = 0; i < 60 && b.round < 2; i++) b.skipTurn();
    const g = b.ground.find((x) => x.ground === R.ground && x.board === h.board);
    expect(g?.source).toBe('env');
    expect(g?.noDamage).toBe(true);
    const inside = b.combatants.filter((c) => c.hp > 0 && c.board === h.board && h.cells.includes(c.slot));
    expect(inside.length).toBeGreaterThan(0);
    for (const c of inside) {
      expect(has(c, 'chilled')).toBe(true);
      expect(has(c, 'frozen')).toBe(false);
    }
    expect(BLIZ.rangedAccuracy?.delta).toBeLessThan(0);
  });

  it('aynı hücreye ikinci kar Ice olur; hava dondurmaz', () => {
    const b = make(P, E, 'turns', { condition: 'blizzard' });
    const t = of(b, 'drowned');
    const priv = b as unknown as { landHeat(h: object, e: () => void): void };
    const h = { id: 'hx', kind: 'heat', board: t.board, cells: [t.slot], dueRound: b.round };
    priv.landHeat(h, () => {});
    expect(has(t, 'chilled')).toBe(true);
    priv.landHeat({ ...h, id: 'hy' }, () => {});
    expect(b.ground.some((g) => g.ground === 'ice_ground' && g.slots.includes(t.slot))).toBe(true);
    expect(has(t, 'frozen')).toBe(false);
    expect(has(t, 'slow')).toBe(true);
  });

  it('test modunda da işler', () => {
    const b = make(P, E, 'test', { condition: 'blizzard' });
    expect(b.hazards).toHaveLength(1);
  });

  it('AI işaretli kar sırasını tehdit görür', () => {
    const b = make(P, E, 'turns', { condition: 'blizzard' });
    const h = b.hazards[0]!;
    const c = b.combatants.find((u) => u.hp > 0 && u.board === h.board && h.cells.includes(u.slot))!;
    expect(b.hazardThreat(c)).toBeGreaterThan(0);
  });

  it('Windwall karşılaşmalarına bağlı', () => {
    const E2 = encounters as unknown as Record<string, { condition?: string }>;
    for (const k of ['hc_15', 'hc_16', 'hc_17', 'hc_18', 'hc_19', 'hc_22', 'hc_26', 'hc_27', 'hc_snowfather']) expect(E2[k]?.condition, k).toBe('blizzard');
  });
});

describe('Frozen: yapay zeka', () => {
  const ai = (freeze: number, focus: number, thaw: number) => ({ ...content.aiConfig, value: { ...content.aiConfig.value, frost: { freeze, focus, thaw } } }) as typeof content.aiConfig;
  const mageTurn = (b: Battle) => {
    for (let i = 0; i < 30 && b.currentActor?.defId !== 'mage'; i++) b.skipTurn();
    return b.currentActor!.uid;
  };

  it('veride değerler var', () => {
    expect(content.aiConfig.value?.frost?.freeze).toBeGreaterThan(0);
    expect(content.aiConfig.value?.frost?.focus).toBeGreaterThan(0);
    expect(content.aiConfig.value?.frost?.thaw).toBeGreaterThan(0);
  });

  it('Chilled hedefe buz atışı seçilir (dondurma değeri)', () => {
    const b = make({ 0: 'mage' }, { 0: 'drowned', 1: 'drowned' }, 'turns');
    const uid = mageTurn(b);
    const [a] = b.combatants.filter((c) => c.defId === 'drowned');
    b.debugAddStatus(a!.uid, 'chilled', 3);
    const pick = chooseAction(b, uid, ai(100, 0, 0));
    expect(pick?.skillId).toBe('ice_crater');
    expect(pick?.targetUid).toBe(a!.uid);
  });

  it('Frozen hedef önceliklidir (ateşsiz vuruş)', () => {
    const b = make({ 0: 'archer' }, { 0: 'drowned', 1: 'drowned' }, 'turns');
    for (let i = 0; i < 30 && b.currentActor?.defId !== 'archer'; i++) b.skipTurn();
    const [, x] = b.combatants.filter((c) => c.defId === 'drowned');
    b.debugAddStatus(x!.uid, 'frozen', 1);
    const pick = chooseAction(b, b.currentActor!.uid, ai(0, 100, 0));
    expect(pick?.targetUid).toBe(x!.uid);
  });

  it('ateşle çözmez: tek hedef Frozenken ateş seçilmez', () => {
    const b = make({ 0: 'mage' }, { 0: 'drowned' }, 'turns');
    const uid = mageTurn(b);
    const t = of(b, 'drowned');
    b.debugAddStatus(t.uid, 'frozen', 1);
    const pick = chooseAction(b, uid, ai(0, 0, 100));
    if (pick?.skillId && b.skill(pick.skillId, uid)) expect(b.skill(pick.skillId, uid)!.effects.some((e) => e.type === 'damage' && e.element === 'fire')).toBe(false);
  });
});

describe('Frozen: metin', () => {
  it('skill bilgisinde "Freezes Chilled targets" (Ice Crater)', () => {
    const mage = content.classes['mage']!;
    const info = describeSkill(content.skills['ice_crater']!, mage.stats, content.formulas, {}, { statuses: content.statuses, grounds: content.grounds });
    expect(info.lines.join('\n')).toContain('Freezes Chilled targets');
  });
  it('Codex > Mechanics Frozen + Blizzard', () => {
    const text = JSON.stringify(battleRulesArticle().blocks);
    expect(text).toContain(BLIZ.name);
    expect(text).toContain('Frozen');
  });
});
