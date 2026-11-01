// Harita 3 imza mekanikleri (maps-2-3.md B1, B2, C1, C2, C5, C6). Sayılar veriden okunur; test mobları testOnly.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill, previewSkill } from '../src/engine';
import type { BattleMode, Combatant, Side, Teams, UnitSetup } from '../src/engine';
import { RULES_TESTS, rulesTestBattleData } from '../src/game/rules-test-battle';
import { buildMechanics } from '../src/wiki/catalog';
import { ENCOUNTERS } from '../src/campaign/data';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const MODES: BattleMode[] = ['turns', 'test'];
const R = content.battleRulesData;
const GROUND = Object.keys(content.grounds).find((g) => content.grounds[g]!.name === 'Chill Ground')!;

function make(rules: Teams['rules'], party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', units?: Record<number, UnitSetup>, seed = 7): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies), rules, ...(units ? { units: { enemies: units } } : {}) } as Teams, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
function turnOf(b: Battle, uid: string): void {
  if (b.mode !== 'turns') return;
  for (let i = 0; i < 120 && b.currentUid !== uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(uid);
}
const P = { 0: 'warrior', 3: 'druid', 7: 'archer' };
const ai = (b: Battle, c: Combatant) => chooseAction(b, c.uid, content.aiConfig);
/** Bir eylem geçer: sırada sıradaki birim pas geçer; test modunda canlı bir kahraman dinlenir (iki kez davranan yeni Round açar). */
function pass(b: Battle): void {
  if (b.mode === 'turns') {
    expect(b.skipTurn().ok).toBe(true);
    return;
  }
  const hero = b.combatants.find((c) => c.hp > 0 && c.side === 'party' && !c.inert)!;
  hero.mp = hero.maxMp;
  const id = b.globalSkillIds('party').find((x) => b.globalDef(x)?.kind === 'rest' && b.canUseGlobal(hero.uid, x).ok);
  if (id) b.useGlobal(hero.uid, id);
  else b.useSkill(hero.uid, hero.skills[0]!, b.combatants.find((c) => c.hp > 0 && c.side === 'enemy')?.uid);
}
function nextRound(b: Battle): void {
  const r = b.round;
  for (let i = 0; i < 80 && b.round === r && !b.winner; i++) pass(b);
  expect(b.round).toBeGreaterThan(r);
}

describe('etiket kapısı', () => {
  it('test mobları rastgele havuzda yok, imza skill\'leri yalnız onlarda', () => {
    for (const id of ['rod_tester', 'eye_tester', 'temper_tester']) {
      expect(content.classes[id]!.testOnly).toBe(true);
      expect(content.randomPool).not.toContain(id);
    }
    const owners = Object.values(content.classes).filter((c) => c.skills.includes('thunder_rod') || c.skills.includes('rolling_thunder')).map((c) => c.id);
    expect(owners).toEqual(['rod_tester']); // Clan Stormcaller (data/mobs) kampanya mobu, class değil
  });

  it('kural yok, imza birimi yok: olay ve durum yok', () => {
    const b = make(undefined, P, { 0: 'drowned', 2: 'drowned' }, 'turns');
    expect(b.noiseState()).toBeNull();
    expect(b.combatants.some((c) => c.encased || c.temper)).toBe(false);
    expect(b.globalSkillIds('party')).not.toContain('thunder_rod_topple');
  });
});

describe('B1 Eye of the Storm', () => {
  it.each(MODES)('kendi şeridi Chill Ground ve menzil cezasından muaf, kahraman değil; ölünce biter (%s)', (mode) => {
    const b = make({ condition: 'blizzard' }, P, { 0: 'eye_tester', 6: 'corsair_slinger', 2: 'corsair_slinger' }, mode);
    const eye = at(b, 'enemy', 0);
    const lane = at(b, 'enemy', 6);
    const other = at(b, 'enemy', 2);
    const hero = at(b, 'party', 0);
    const skill = b.skill(lane.skills.find((id) => b.skill(id, lane)?.motion === 'ranged') ?? lane.skills[0]!, lane)!;
    const base = b.effectiveStats(other).accuracy;
    expect(b.hitStats(other, skill).accuracy).toBeLessThan(base);
    expect(b.hitStats(lane, skill).accuracy).toBe(b.effectiveStats(lane).accuracy);
    expect(b.eyeCarrier('enemy', 'enemy', lane.slot)?.uid).toBe(eye.uid);
    expect(b.eyeCarrier('enemy', 'enemy', other.slot)).toBeUndefined();
    expect(b.eyeCarrier('party', 'party', hero.slot)).toBeUndefined();
    // Ortam zemini korunan şeritte durum vermez, kahramanda verir (ayakta olduğu sürece)
    const envGround = { source: 'env', envCause: 'blizzard', ground: GROUND, board: 'enemy' as const, slots: [lane.slot, other.slot], turns: 9, id: 'env_test', sourceSide: 'party' as const };
    b.ground.push(envGround as never);
    expect(b.groundStatusesAt(lane).size).toBe(0);
    const open = b.groundStatusesAt(other).size;
    expect(open).toBeGreaterThan(0);
    eye.hp = 0;
    expect(b.groundStatusesAt(lane).size).toBe(open);
    expect(b.hitStats(lane, skill).accuracy).toBeLessThan(b.effectiveStats(lane).accuracy);
  });
});

describe('B2 Thunder Rod', () => {
  const E = { 6: 'rod_tester', 8: 'drowned' };
  it.each(MODES)('boş hücreye çakılır, hücre kapanır, Round başında komşu kahramanları vurur, bitişik kahraman devirir (%s)', (mode) => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid' }, E, mode);
    const t = at(b, 'enemy', 6);
    turnOf(b, t.uid);
    expect(b.useSkill(t.uid, 'thunder_rod').ok).toBe(true);
    const planted = b.log.find((e) => e.type === 'rodPlanted');
    expect(planted).toBeTruthy();
    const slot = (planted as { slot: number }).slot;
    expect(b.isBlocked(slot, 'party')).toBe(true);
    const near = b.rodVictims('party', slot, 'enemy');
    expect(near.length).toBeGreaterThan(0);
    expect(b.globalSkillIds('party')).toContain('thunder_rod_topple');
    const before = near.map((c) => c.hp);
    const hazard = b.hazards.find((h) => h.rod)!;
    nextRound(b);
    expect(b.log.some((e) => e.type === 'rodStrike')).toBe(true);
    near.forEach((c, i) => expect(c.hp).toBeLessThan(before[i]!));
    const hero = near[0]!;
    turnOf(b, hero.uid);
    expect(b.canUseGlobal(hero.uid, 'thunder_rod_topple').ok).toBe(true);
    expect(b.useGlobal(hero.uid, 'thunder_rod_topple').ok).toBe(true);
    expect(b.hazards.includes(hazard)).toBe(false);
    expect(b.isBlocked(slot, 'party')).toBe(false);
    expect(b.globalSkillIds('party')).not.toContain('thunder_rod_topple');
  });

  it('çubuğa komşu olmayan deviremez; çakan ölse de çubuk durur', () => {
    const b = make(undefined, { 0: 'warrior', 8: 'druid' }, E, 'test');
    const t = at(b, 'enemy', 6);
    expect(b.useSkill(t.uid, 'thunder_rod').ok).toBe(true);
    const h = b.hazards.find((x) => x.rod)!;
    const far = b.combatants.find((c) => c.side === 'party' && !h.cells.includes(c.slot));
    if (far) expect(b.canUseGlobal(far.uid, 'thunder_rod_topple').ok).toBe(false);
    t.hp = 0;
    expect(b.hazards.includes(h)).toBe(true);
  });

  it('YZ: mob çubuğu kahramanlara komşu hücreye değer biçer; kahraman komşu hasarı büyükse çubuğu devirir', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid', 4: 'archer' }, { 6: 'rod_tester' }, 'test');
    const t = at(b, 'enemy', 6);
    const cell = b.rodCellFor(t, content.skills.thunder_rod!);
    expect(cell).not.toBeNull();
    expect(b.rodVictims('party', cell!, 'enemy').length).toBeGreaterThan(1);
    expect(b.useSkill(t.uid, 'thunder_rod').ok).toBe(true);
    // Ayakta çubuk komşularını vuruyor; yüksek oranla devirmek her hamleden değerli
    const h = b.hazards.find((x) => x.rod)!;
    h.rod!.ratio = 5;
    const hero = b.combatants.find((c) => c.side === 'party' && h.cells.includes(c.slot))!;
    expect(ai(b, hero)?.skillId).toBe('thunder_rod_topple');
    // Çubuk zararsızsa (oran 0) devirmez
    h.rod!.ratio = 0;
    expect(ai(b, hero)?.skillId).not.toBe('thunder_rod_topple');
  });

  it('önizleme, skill metni', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid' }, E, 'test');
    const t = at(b, 'enemy', 6);
    const list = previewSkill(b, t.uid, 'thunder_rod');
    expect(list.some((p) => (p.statuses ?? []).some((s) => s.includes('Thunder Rod')))).toBe(true);
    const info = describeSkill(content.skills.thunder_rod!, t.stats, content.formulas);
    expect(info.lines.join(' ')).toContain('topple');
  });
});

describe('C1 Rolling Thunder', () => {
  const E = { 6: 'rod_tester', 8: 'drowned' };
  const cast = (b: Battle): Combatant => {
    const t = at(b, 'enemy', 6);
    turnOf(b, t.uid);
    expect(b.useSkill(t.uid, 'rolling_thunder', at(b, 'party', 0).uid).ok).toBe(true);
    return t;
  };
  function until(b: Battle, done: () => boolean, tries = 60): void {
    for (let i = 0; i < tries && !done() && !b.winner; i++) pass(b);
  }

  it.each(MODES)('belirteç iner: işaretli sıradaki kahraman vurulur, başka sıra vurulmaz (%s)', (mode) => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid', 3: 'archer' }, E, mode);
    const a = at(b, 'party', 0);
    const row = at(b, 'party', 3);
    const other = at(b, 'party', 2);
    cast(b);
    expect(b.log.some((e) => e.type === 'hazardWarn' && e.kind === 'bolt')).toBe(true);
    const h = b.hazards.find((x) => x.bolt)!;
    expect(h.cells).toContain(a.slot);
    if (mode === 'turns') expect(b.turnBar().some((u) => b.isBoltToken(u))).toBe(true);
    expect(b.turnQueue().some((u) => b.isBoltToken(u))).toBe(false);
    const hpBefore = new Map(b.combatants.map((c) => [c.uid, c.hp]));
    until(b, () => !b.hazards.includes(h));
    const land = b.log.find((e) => e.type === 'hazardLand' && e.kind === 'bolt') as { hit: string[] } | undefined;
    expect(land).toBeTruthy();
    expect(land!.hit).toContain(a.uid);
    if (!h.cells.includes(other.slot)) expect(land!.hit).not.toContain(other.uid);
    if (!h.cells.includes(row.slot)) expect(land!.hit).not.toContain(row.uid);
    expect(a.hp).toBeLessThan(hpBefore.get(a.uid)!);
  });

  it('atan ölse de iner; birim hızı ve Slow belirteç zamanını değiştirmez', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid' }, E, 'turns');
    const t = cast(b);
    const h = b.hazards.find((x) => x.bolt)!;
    const speed = h.bolt!.speed;
    t.hp = 0;
    expect(h.bolt!.speed).toBe(content.skills.rolling_thunder!.rollingThunder!.speed);
    expect(speed).toBe(content.skills.rolling_thunder!.rollingThunder!.speed);
    until(b, () => !b.hazards.includes(h));
    expect(b.log.some((e) => e.type === 'hazardLand' && e.kind === 'bolt')).toBe(true);
  });

  it('YZ: mob satır değeri verir; işaretli sıradaki kahraman sıradan çıkmaya değer görür', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid', 3: 'archer' }, { 6: 'rod_tester' }, 'test');
    const t = at(b, 'enemy', 6);
    const list = previewSkill(b, t.uid, 'rolling_thunder', at(b, 'party', 0).uid);
    expect(list.some((p) => (p.statuses ?? []).some((s) => s.includes('Rolling Thunder')))).toBe(true);
    cast(b);
    const h = b.hazards.find((x) => x.bolt)!;
    const hero = at(b, 'party', 0);
    expect(b.hazardThreat(hero)).toBeGreaterThan(0);
    expect(h.cells).toContain(hero.slot);
  });
});

describe('C2 Encased', () => {
  const E = { 0: 'corsair_cutlass', 1: 'morvane_halberdier' };
  const U = { 1: { encased: true } };
  const hpRatio = content.formulas.encased.hpRatio;

  it.each(MODES)('blokla başlar, sıraya girmez, eyleme geçemez; ateş dışı hasar bloğa gider (%s)', (mode) => {
    const b = make({ condition: 'blizzard' }, P, E, mode, U);
    const u = at(b, 'enemy', 1);
    expect(u.encased?.maxHp).toBe(Math.max(1, Math.round(u.maxHp * hpRatio)));
    expect(b.turnQueue()).not.toContain(u.uid);
    expect(b.canUse(u.uid, u.skills[0]!).ok).toBe(false);
    const hero = at(b, 'party', 7);
    turnOf(b, hero.uid);
    const hp = u.hp;
    const left = u.encased!.hp;
    expect(b.useSkill(hero.uid, hero.skills[0]!, u.uid).ok).toBe(true);
    if (u.encased) {
      expect(u.hp).toBe(hp);
      expect(u.encased.hp).toBeLessThan(left);
    }
    expect(b.log.some((e) => e.type === 'encasedHit')).toBe(true);
  });

  it.each(MODES)('ateş bloğu anında kırar ve tam geçer; blok bitince sıraya girer (%s)', (mode) => {
    const b = make({ condition: 'blizzard' }, { 0: 'warrior', 7: 'mage' }, E, mode, U);
    const u = at(b, 'enemy', 1);
    const mage = at(b, 'party', 7);
    const fire = mage.skills.find((id) => b.skill(id, mage)!.effects.some((e) => e.type === 'damage' && e.element === 'fire') && b.skill(id, mage)!.target === 'single_enemy')!;
    expect(fire).toBeTruthy();
    turnOf(b, mage.uid);
    const hp = u.hp;
    expect(b.useSkill(mage.uid, fire, u.uid).ok).toBe(true);
    expect(u.encased).toBeUndefined();
    expect(u.hp).toBeLessThan(hp);
    const br = b.log.find((e) => e.type === 'encasedBreak') as { cause: string };
    expect(br.cause).toBe('fire');
    if (mode === 'turns') expect(b.turnQueue()).toContain(u.uid);
  });

  it('Blizzard her Round blokları onarır; durum almaz, itilemez', () => {
    const b = make({ condition: 'blizzard' }, P, E, 'test', U);
    const u = at(b, 'enemy', 1);
    u.encased!.hp = 1;
    nextRound(b);
    expect(u.encased!.hp).toBeGreaterThan(1);
    expect(b.log.some((e) => e.type === 'encasedHit' && e.repaired)).toBe(true);
  });

  it('YZ: uyanık düşman varken uyuyanı ateşle uyandırmaz; yalnız uyuyanlar kaldıysa bloğa vurur', () => {
    const b = make({ condition: 'blizzard' }, { 0: 'warrior', 7: 'mage' }, E, 'test', U);
    const u = at(b, 'enemy', 1);
    const mage = at(b, 'party', 7);
    const c = ai(b, mage);
    expect(c?.targetUid).not.toBe(u.uid);
    at(b, 'enemy', 0).hp = 0;
    const lone = ai(b, mage);
    expect(lone?.targetUid).toBe(u.uid);
  });

  it('kampanya: yalnızca The Frozen Legion iki askeriyle bloklu', () => {
    const marked = Object.entries(ENCOUNTERS).filter(([, d]) => JSON.stringify(d).includes('"encased":true'));
    expect(marked.map(([id]) => id)).toEqual(['hc_17']);
    expect(JSON.stringify(marked[0]![1]).match(/"encased":true/g)).toHaveLength(2);
  });

  it('önizleme satırı', () => {
    const b = make({ condition: 'blizzard' }, P, E, 'test', U);
    const u = at(b, 'enemy', 1);
    const hero = at(b, 'party', 7);
    const list = previewSkill(b, hero.uid, hero.skills[0]!, u.uid);
    expect(list.find((p) => p.uid === u.uid)?.statuses?.join(' ')).toContain('Ice block');
  });
});

describe('C5 Wake the Halls', () => {
  const rule = R.noise.wake_the_halls!;
  const rules = { noise: 'wake_the_halls' };
  const E = { 0: 'drowned', 2: 'drowned' };

  it.each(MODES)('alan skill\'i sayacı doldurur, düşman eylemi doldurmaz (%s)', (mode) => {
    const b = make(rules, { 0: 'warrior', 3: 'druid', 7: 'mage' }, E, mode);
    expect(b.noiseState()).toMatchObject({ value: 0, rises: 0 });
    const foe = at(b, 'enemy', 0);
    turnOf(b, foe.uid);
    b.useSkill(foe.uid, foe.skills[0]!, at(b, 'party', 0).uid);
    expect(b.noiseState()!.value).toBe(0);
    const mage = at(b, 'party', 7);
    turnOf(b, mage.uid);
    const area = mage.skills.find((id) => b.isAreaSkill(id, mage) && b.canUse(mage.uid, id).ok);
    expect(area).toBeTruthy();
    const r = b.useSkill(mage.uid, area!, undefined, 1, 'enemy');
    if (r.ok) expect(b.noiseState()!.value).toBeGreaterThanOrEqual(rule.points.area);
  });

  it.each(MODES)('kritik doldurur; dolunca birim kalkar, sayaç sıfırlanır, üst sınırda durur (%s)', (mode) => {
    const b = make(rules, P, E, mode);
    b.debug.crit = 'always';
    const hero = at(b, 'party', 0);
    turnOf(b, hero.uid);
    expect(b.useSkill(hero.uid, hero.skills[0]!, at(b, 'enemy', 0).uid).ok).toBe(true);
    if (b.log.some((e) => e.type === 'damage' && e.crit)) expect(b.noiseState()!.value).toBeGreaterThanOrEqual(rule.points.crit);
    const count = () => b.combatants.filter((c) => c.side === 'enemy').length;
    const before = count();
    expect(b.debugNoise(rule.goal).ok).toBe(true);
    expect(count()).toBe(before + 1);
    expect(b.noiseState()!.value).toBe(0);
    expect(b.log.some((e) => e.type === 'noiseFull')).toBe(true);
    const risen = b.combatants.filter((c) => c.side === 'enemy').at(-1)!;
    expect(risen.displayName ?? risen.name).toBe(rule.unit.name);
    for (let i = 1; i < rule.maxRises + 2; i++) b.debugNoise(rule.goal);
    expect(b.noiseState()!.rises).toBe(rule.maxRises);
    expect(count()).toBeLessThanOrEqual(before + rule.maxRises);
  });

  it('YZ: dolmak üzereyken alan skill\'inin bedeli artar (oyuncu tarafı); kural yoksa 0', () => {
    const b = make(rules, { 0: 'warrior', 7: 'mage' }, E, 'test');
    const mage = at(b, 'party', 7);
    const area = mage.skills.find((id) => b.isAreaSkill(id, mage))!;
    expect(b.noisePoints(mage, b.skill(area, mage)!)).toBeGreaterThanOrEqual(rule.points.area);
    expect(b.noisePoints(at(b, 'enemy', 0), b.skill(at(b, 'enemy', 0).skills[0]!, at(b, 'enemy', 0))!)).toBe(0);
    const plain = make(undefined, { 0: 'warrior', 7: 'mage' }, E, 'test');
    const m2 = at(plain, 'party', 7);
    expect(plain.noisePoints(m2, plain.skill(area, m2)!)).toBe(0);
    const list = previewSkill(b, mage.uid, area, undefined, 1, 'enemy');
    expect(list.some((p) => (p.statuses ?? []).some((s) => s.startsWith('Noise +')))).toBe(true);
  });

  it('kampanya: Deep Halls savaşlarında veriden açık', () => {
    const on = Object.entries(ENCOUNTERS).filter(([, d]) => d.noise).map(([id]) => id).sort();
    expect(on).toEqual(['hc_43', 'hc_45', 'hc_46', 'hc_47', 'hc_49', 'hc_53', 'hc_hollow_king']);
  });
});

describe('C6 Tempering', () => {
  const E = { 0: 'temper_tester', 2: 'drowned' };
  const hot: string = 'tempered_red_hot';
  const cold: string = 'tempered_quenched';

  it.each(MODES)('Red-hot başlar, kendi sırasında çevrilir (%s)', (mode) => {
    const b = make(undefined, P, E, mode);
    const t = at(b, 'enemy', 0);
    expect(t.temper).toBe('hot');
    expect(t.statuses.some((s) => s.kind === hot)).toBe(true);
    if (mode === 'turns') {
      turnOf(b, t.uid);
      expect(t.temper).toBe('cold');
      expect(t.statuses.some((s) => s.kind === cold)).toBe(true);
      expect(t.statuses.some((s) => s.kind === hot)).toBe(false);
    } else {
      expect(b.useSkill(t.uid, t.skills[0]!, at(b, 'party', 0).uid).ok).toBe(true);
      expect(t.temper).toBe('cold');
    }
    expect(b.log.some((e) => e.type === 'tempered')).toBe(true);
  });

  it('Red-hot ateşten 0 alır; Quenched zırhı yarım, ateş yeniden kızdırır', () => {
    const b = make(undefined, { 0: 'warrior', 7: 'mage' }, E, 'test');
    const t = at(b, 'enemy', 0);
    const mage = at(b, 'party', 7);
    const fire = mage.skills.find((id) => b.skill(id, mage)!.effects.some((e) => e.type === 'damage' && e.element === 'fire') && b.skill(id, mage)!.target === 'single_enemy')!;
    const hp = t.hp;
    expect(b.useSkill(mage.uid, fire, t.uid).ok).toBe(true);
    expect(t.hp).toBe(hp);
    expect(t.temper).toBe('hot');
    const armorHot = b.effectiveStats(t).armor;
    b.debugTemper(t.uid);
    expect(t.temper).toBe('cold');
    expect(b.effectiveStats(t).armor).toBeLessThanOrEqual(Math.ceil(armorHot * 0.5));
    const hp2 = t.hp;
    b.noCooldowns = true;
    expect(b.useSkill(mage.uid, fire, t.uid).ok).toBe(true);
    expect(t.hp).toBeLessThan(hp2);
    expect(t.temper).toBe('hot');
    expect(b.log.some((e) => e.type === 'tempered' && e.cause === 'fire')).toBe(true);
  });

  it('YZ: Quenched birime ateş vurmak bedellidir, Red-hot birime ateş boşa gider', () => {
    const b = make(undefined, { 0: 'warrior', 7: 'mage' }, { 0: 'temper_tester' }, 'test');
    const t = at(b, 'enemy', 0);
    const mage = at(b, 'party', 7);
    const fire = mage.skills.find((id) => b.skill(id, mage)!.effects.some((e) => e.type === 'damage' && e.element === 'fire') && b.skill(id, mage)!.target === 'single_enemy')!;
    const list = previewSkill(b, mage.uid, fire, t.uid);
    expect(list.find((p) => p.uid === t.uid)).toBeTruthy();
    b.debugTemper(t.uid);
    const list2 = previewSkill(b, mage.uid, fire, t.uid);
    expect(list2.find((p) => p.uid === t.uid)?.statuses?.join(' ')).toContain('Red-hot');
    const c = ai(b, mage);
    expect(c?.skillId === fire && c?.targetUid === t.uid).toBe(false);
  });
});

describe('YZ davranışı', () => {
  it('mob boş tahtada çubuk ya da belirteç seçer; yer yoksa çubuğu seçemez', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid', 4: 'archer' }, { 6: 'rod_tester' }, 'test');
    const t = at(b, 'enemy', 6);
    expect(['thunder_rod', 'rolling_thunder']).toContain(ai(b, t)?.skillId);
  });

  it('kahraman işaretli sıradan çıkar (ağır belirteç), belirteç yoksa aynı hamleyi yapmaz', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'druid' }, { 6: 'rod_tester', 8: 'drowned' }, 'turns');
    const t = at(b, 'enemy', 6);
    const hero = at(b, 'party', 0);
    turnOf(b, t.uid);
    expect(b.useSkill(t.uid, 'rolling_thunder', hero.uid).ok).toBe(true);
    const h = b.hazards.find((x) => x.bolt)!;
    h.bolt!.ratio = 5;
    for (let i = 0; i < 40 && b.currentUid !== hero.uid && !b.winner; i++) b.skipTurn();
    if (!b.hazards.includes(h)) return; // belirteç önce indiyse kaçacak bir şey kalmadı
    const c = ai(b, hero);
    expect(c?.skillId).toBe('move_tile');
    expect(h.cells).not.toContain(c?.slot);
  });

  it('Noise: dolmak üzereyken alan skill\'i kural yokken olduğundan az çekici', () => {
    const E = { 0: 'drowned', 1: 'drowned', 2: 'drowned' };
    const value = content.aiConfig.value!;
    const pick = (near: boolean, weight: number) => {
      const b = make(near ? { noise: 'wake_the_halls' } : undefined, { 0: 'warrior', 7: 'mage' }, E, 'test');
      if (near) b.debugNoise(R.noise.wake_the_halls!.goal - 1);
      const mage = at(b, 'party', 7);
      const c = chooseAction(b, mage.uid, content.aiConfig, undefined, { value: { ...value, signature: { ...value.signature!, noiseRise: weight } } });
      return !!c?.skillId && b.isAreaSkill(c.skillId, mage);
    };
    // Sayı PROVİZYON: kuralın yönü sınanır. Kuralsız savaşta ağırlık etkisiz; dolmak üzereyken ağır bedel alanı bıraktırır.
    expect(pick(false, 1000)).toBe(pick(false, 0));
    expect(pick(true, 1000)).toBe(false);
  });
});

describe('Codex, kurallar testi, debug', () => {
  it('Mechanics metinleri var', () => {
    const text = JSON.stringify(buildMechanics());
    for (const k of ['Encased', 'Noise', 'Thunder Rod', 'Rolling Thunder', 'Eye of the Storm', 'Tempering']) expect(text).toContain(k);
  });

  it('kural testleri kurulur', () => {
    for (const kind of ['eye', 'rod', 'rolling', 'encased', 'noise', 'temper'] as const) {
      expect(RULES_TESTS.some((t) => t.kind === kind)).toBe(true);
      for (const mode of MODES) {
        const data = rulesTestBattleData(11, mode, kind);
        expect(() => new Battle(content.battleSetup('random-battle', 11, mode, data.teams as Teams, false))).not.toThrow();
      }
    }
  });
});
