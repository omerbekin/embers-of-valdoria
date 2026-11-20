/**
 * Ömer 2026-11-09 (element formu) kuralları:
 * 1) Boss CC'ye (statuses.json > cc: true) tamamen bağışık; Chilled artık CC değil. CC dışı debuff'lar karşı taraftan gelince boss'ta
 *    ccImmunity.debuffStrength.boss, elitte .elite gücünde (büyüklük; süre ve DoT aynı). Kendi tarafının durumu tam güç.
 * 2) Guard yalnız hasarı aktarır: vuruşun durum / tepkime etkileri (Soaked + şimşek = Stun, ateşin Chilled'ı eritmesi) asıl hedefte kalır.
 * 3) Birim üstü Explosion: hangi tarafta patlarsa o hücre + komşulardaki birimler (tetiği verenin düşmanları) hasar alır.
 * 4) Tremor Slam: isabet ettiği hücredeki sıvı zemini (grounds.json > liquid) 4 yönden komşu hücrelere sıçratır.
 * Sayılar veriden okunur.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, previewSkill } from '../src/engine';
import type { BattleEvent, Status } from '../src/engine';

const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
type Priv = { addStatus(t: unknown, s: Status, emit: unknown, cause?: string): void; debugEmit: unknown };
type Tier = { tier: 'boss' | 'elite' };
const mk = (opts: { party?: Record<number, string>; enemies?: Record<number, string>; units?: Record<number, Tier>; mode?: 'turns' | 'test' } = {}) => {
  const b = new Battle(
    content.battleSetup('random-battle', 7, opts.mode ?? 'test', {
      party: cells(opts.party ?? { 0: 'mage', 1: 'defender' }),
      enemies: cells(opts.enemies ?? { 0: 'warrior', 1: 'warrior', 2: 'warrior' }),
      ...(opts.units ? { units: { enemies: opts.units } } : {}),
    }, false),
  );
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, resilience: 0, evasion: 0, accuracy: 10 });
  for (const c of b.combatants) c.hp = c.maxHp = 5000;
  return b;
};
const give = (b: Battle, uid: string, kind: string, by: string, extra: Partial<Status> = {}) =>
  (b as unknown as Priv).addStatus(b.get(uid)!, { kind: kind as Status['kind'], turns: 3, source: by, ...extra }, (b as unknown as Priv).debugEmit);
const has = (b: Battle, uid: string, kind: string) => b.get(uid)!.statuses.some((s) => s.kind === kind);
const act = (b: Battle, actor: string, skill: string, target?: string): BattleEvent[] => {
  const r = b.useSkill(actor, skill, target);
  if (!r.ok) throw new Error(`${actor} ${skill}: ${r.reason}`);
  return r.events;
};
const S = content.statuses;
const STR = content.formulas.ccImmunity!.debuffStrength!;
const scaled = (m: number, k: number) => 1 + (m - 1) * k;

describe('boss / elit debuff gücü (Ömer 2026-11-09)', () => {
  it('veri: Chilled ve Slow CC değil (Slow: form 3, 2026-11-09), Frozen / Stun / Silence CC; güç boss 0,25, elit 0,5', () => {
    expect(S.chilled!.cc).toBeFalsy();
    expect(S.slow!.cc).toBeFalsy();
    for (const k of ['frozen', 'stun', 'silence']) expect(S[k]!.cc).toBe(true);
    expect(STR).toEqual({ boss: 0.25, elite: 0.5 });
  });

  it('Chilled: boss %25, elit %50, normal tam güçle yavaşlatır; süre aynı', () => {
    const b = mk({ units: { 0: { tier: 'boss' }, 1: { tier: 'elite' } } });
    const m = S.chilled!.speedMult!;
    for (const uid of ['enemy-0', 'enemy-1', 'enemy-2']) give(b, uid, 'chilled', 'party-0');
    expect(b.statusMult(b.get('enemy-0')!, 'speedMult')).toBeCloseTo(scaled(m, STR.boss!), 6);
    expect(b.statusMult(b.get('enemy-1')!, 'speedMult')).toBeCloseTo(scaled(m, STR.elite!), 6);
    expect(b.statusMult(b.get('enemy-2')!, 'speedMult')).toBeCloseTo(m, 6);
    for (const uid of ['enemy-0', 'enemy-1', 'enemy-2']) expect(b.get(uid)!.statuses.find((s) => s.kind === 'chilled')!.turns).toBe(3);
    // Ömer 2026-11-16: Chilled artık kaçınma kesmez (kaçınmayı Hobbled keser); Hobbled kaçınma çarpanı aynı ölçekle
    expect(S.chilled!.evasionMult).toBeUndefined();
    const e0 = b.get('enemy-0')!;
    e0.stats.evasion = 0.2;
    expect(b.effectiveStats(e0).evasion).toBeCloseTo(0.2, 4);
    give(b, 'enemy-0', 'slow', 'party-0');
    expect(b.effectiveStats(e0).evasion).toBeCloseTo(0.2 * scaled(S.slow!.evasionMult!, STR.boss!), 4);
  });

  it('boss CC yemez (Stun, Frozen); iki Chilled atışı boss\'u dondurmaz, Chilled kalır; elit donar', () => {
    const b = mk({ units: { 0: { tier: 'boss' }, 1: { tier: 'elite' } } });
    give(b, 'enemy-0', 'stun', 'party-0');
    expect(has(b, 'enemy-0', 'stun')).toBe(false);
    for (const uid of ['enemy-0', 'enemy-1']) {
      give(b, uid, 'chilled', 'party-0', { origin: 'skill' });
      give(b, uid, 'chilled', 'party-0', { origin: 'skill' });
    }
    expect(has(b, 'enemy-0', 'frozen')).toBe(false);
    expect(has(b, 'enemy-0', 'chilled')).toBe(true);
    expect(has(b, 'enemy-1', 'frozen')).toBe(true);
    expect(b.wouldFreeze(b.get('enemy-0')!, 'chilled')).toBe(false);
  });

  it('zırh, verilen hasar ve alınan şifa çarpanları da ölçeklenir (Sunder, Weakened, Wound)', () => {
    const b = mk({ units: { 1: { tier: 'elite' } } });
    const el = b.get('enemy-1')!;
    el.stats.armor = 40;
    give(b, 'enemy-1', 'sunder', 'party-0');
    give(b, 'enemy-1', 'weakened', 'party-0');
    give(b, 'enemy-1', 'wound', 'party-0');
    expect(b.effectiveStats(el).armor).toBeCloseTo(40 * scaled(S.sunder!.armorMult!, STR.elite!), 3);
    expect(b.weakenedMult(el, 'physical')).toBeCloseTo(scaled(S.weakened!.physicalDealtMult!, STR.elite!), 6); // Ömer 2026-11-16: yalnız fiziksel
    expect(b.statusMult(el, 'healTakenMult')).toBeCloseTo(scaled(S.wound!.healTakenMult!, STR.elite!), 6);
  });

  it('kendi tarafının verdiği debuff (kendine Overextended; eski Overreached) elitte tam güç; DoT tiki ölçeklenmez', () => {
    const b = mk({ units: { 1: { tier: 'elite' } } });
    give(b, 'enemy-1', 'overextended', 'enemy-1');
    expect(b.statusMult(b.get('enemy-1')!, 'damageTakenMult')).toBeCloseTo(S.overextended!.damageTakenMult!, 6);
    give(b, 'enemy-1', 'burning', 'party-0', { amount: 40 });
    give(b, 'enemy-2', 'burning', 'party-0', { amount: 40 });
    const st = (uid: string) => b.get(uid)!.statuses.find((s) => s.kind === 'burning')!;
    expect(b.statusTickDamage(b.get('enemy-1')!, st('enemy-1'))).toBe(b.statusTickDamage(b.get('enemy-2')!, st('enemy-2')));
  });

  // Ömer 2026-11-15 (Topraklama): geri itme kalktı; Shocked'ın büyü zırhı düşüşü ve kalkan çarpanı boss'ta debuffStrength.boss kadar
  it('Shocked büyü zırhı ve kalkan çarpanı boss\'ta debuffStrength.boss kadar; sıra çubuğu değişmez', () => {
    const b = mk({ units: { 0: { tier: 'boss' } } });
    const T = content.formulas.thunder;
    for (const uid of ['enemy-0', 'enemy-1']) b.get(uid)!.stats.magicArmor = 40;
    const before = [b.get('enemy-0')!.turnCounter, b.get('enemy-1')!.turnCounter];
    b.debugBolt('enemy-0');
    b.debugBolt('enemy-1');
    expect([b.get('enemy-0')!.turnCounter, b.get('enemy-1')!.turnCounter]).toEqual(before);
    expect(b.effectiveStats(b.get('enemy-0')!).magicArmor).toBeCloseTo(40 * scaled(T.magicArmorMult, STR.boss!), 4);
    expect(b.effectiveStats(b.get('enemy-1')!).magicArmor).toBeCloseTo(40 * T.magicArmorMult, 4);
    expect(b.shieldHitMult(b.get('enemy-0')!, 'lightning')).toBeCloseTo(1 + T.shieldBonus * STR.boss!, 6);
    expect(b.shieldHitMult(b.get('enemy-1')!, 'lightning')).toBeCloseTo(1 + T.shieldBonus, 6);
  });

  it('önizleme gücü yazar; YZ boss\'ta Chilled değerini düşük görür', () => {
    const b = mk({ units: { 0: { tier: 'boss' } } });
    const p = previewSkill(b, 'party-0', 'blizzard', 'enemy-0');
    const row = p.find((t) => t.uid === 'enemy-0')?.statuses?.join(' ') ?? '';
    if (content.skills.blizzard!.effects.some((e) => e.type === 'status' && e.status === 'chilled')) expect(row).toMatch(new RegExp(`${Math.round(STR.boss! * 100)}% strength`));
    expect(b.debuffStrength(b.get('enemy-0')!, 'chilled', 'party')).toBe(STR.boss);
    expect(b.debuffStrength(b.get('enemy-1')!, 'chilled', 'party')).toBe(1);
    expect(b.debuffStrength(b.get('enemy-0')!, 'stun', 'party')).toBe(1); // CC: gücü değil bağışıklık
  });
});

describe('Guard yalnız hasarı aktarır (Ömer 2026-11-09)', () => {
  it('Soaked korunan dosta şimşek: Electrocuted (eskiden Stun) korunanda, korumacıda değil; korumacı hasar payını alır', () => {
    const wetInto = content.formulas.thunder.wetInto ?? 'stun'; // Ömer 2026-11-09
    const b = mk({ enemies: { 0: 'defender', 1: 'warrior' } });
    const me = b.get('party-0')!;
    me.skills = ['storm_test_bolt'];
    give(b, 'enemy-1', 'guard', 'enemy-0', { share: 0.5 });
    give(b, 'enemy-1', 'soaked', 'enemy-1');
    const ev = act(b, 'party-0', 'storm_test_bolt', 'enemy-1');
    expect(has(b, 'enemy-1', wetInto)).toBe(true);
    expect(has(b, 'enemy-0', wetInto)).toBe(false);
    expect(has(b, 'enemy-0', 'shocked')).toBe(false);
    expect(ev.some((e) => e.type === 'damage' && e.target === 'enemy-0' && e.redirected)).toBe(true);
  });

  it('ateş vuruşu: korunanın Chilled\'ı erir, korumacınınki kalır', () => {
    const b = mk({ enemies: { 0: 'defender', 1: 'warrior' } });
    give(b, 'enemy-1', 'guard', 'enemy-0', { share: 0.5 });
    give(b, 'enemy-1', 'chilled', 'party-0');
    give(b, 'enemy-0', 'chilled', 'party-0');
    const ev = act(b, 'party-0', 'fire_bolt', 'enemy-1');
    expect(ev.some((e) => e.type === 'damage' && e.target === 'enemy-0' && e.redirected)).toBe(true);
    expect(has(b, 'enemy-1', 'chilled')).toBe(false);
    expect(has(b, 'enemy-0', 'chilled')).toBe(true);
  });
});

describe('birim Explosion iki tarafta da çalışır', () => {
  it('düşmanın tetiklediği Explosion kahraman tahtasında: kahraman + komşu kahraman hasar alır, düşman almaz', () => {
    const b = mk({ party: { 0: 'mage', 1: 'defender', 3: 'paladin' } });
    for (const c of b.combatants) Object.assign(c.stats, { armor: 0, magicArmor: 0 });
    give(b, 'party-0', 'poisoned', 'enemy-0', { amount: 20 });
    give(b, 'party-0', 'burning', 'enemy-0', { amount: 30 });
    const d = b.log.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.reaction === 'explosion');
    // party-0 yuva 0 (patlayan), party-1 yuva 1 ve party-2 yuva 3 (komşular)
    expect([...new Set(d.map((x) => x.target))].sort()).toEqual(['party-0', 'party-1', 'party-2']);
    expect(d.some((x) => x.target.startsWith('enemy'))).toBe(false);
  });

  it('kahramanın tetiklediği Explosion düşman tahtasında: düşman + komşusu', () => {
    const b = mk();
    give(b, 'enemy-0', 'poisoned', 'party-0', { amount: 20 });
    give(b, 'enemy-0', 'burning', 'party-0', { amount: 30 });
    const d = b.log.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.reaction === 'explosion');
    expect(d.map((x) => x.target).sort()).toEqual(['enemy-0', 'enemy-1']);
  });
});

describe('Tremor Slam sıvı sıçratır (Ömer 2026-11-09)', () => {
  const liquids = Object.entries(content.grounds).filter(([, g]) => g.liquid).map(([id]) => id);
  const groundAt = (b: Battle, id: string, slot: number) => b.ground.some((g) => g.board === 'enemy' && g.ground === id && g.slots.includes(slot));

  it('veri: Tremor Slam splashLiquid taşır; su ve zehir sıvıdır, yanan zemin değil; açıklama satırı', () => {
    expect(content.skills.tremor_slam!.effects.some((e) => e.type === 'splashLiquid')).toBe(true);
    for (const id of ['poison', 'flooded']) expect(liquids).toContain(id);
    expect(content.grounds.burning!.liquid).toBeFalsy();
    const b = mk();
    expect(describeSkill(content.skills.tremor_slam!, b.get('party-1')!.stats, content.formulas, content.summons, { statuses: content.statuses, grounds: content.grounds }).lines.join(' ')).toMatch(/Splashes liquid ground/);
  });

  it('isabet edilen hücredeki zehir komşu hücrelere sıçrar (aynı sahip, tepkimeler işler), komşudaki birim Poisoned olur; yanan zemin sıçramaz', () => {
    const b = mk({ enemies: { 0: 'warrior', 1: 'warrior', 3: 'warrior' } });
    b.debugPlaceGround('party-0', 'poison', 'enemy', [0]);
    b.debugPlaceGround('party-0', 'burning', 'enemy', [1]);
    const ev = act(b, 'party-1', 'tremor_slam', 'enemy-0');
    // yuva 1'deki yanan zemine sıçrayan zehir yeni bırakılmış sayılır: tepkime (Burning -> Poison = Toxic smoke)
    expect(ev.some((e) => e.type === 'groundReaction' && e.slot === 1 && e.setup === 'burning' && e.trigger === 'poison')).toBe(true);
    expect(groundAt(b, 'poison', 3)).toBe(true);
    expect(groundAt(b, 'burning', 0)).toBe(false);
    expect(groundAt(b, 'burning', 2)).toBe(false);
    expect(groundAt(b, 'burning', 4)).toBe(false);
    expect(b.ground.filter((g) => g.ground === 'poison').every((g) => g.source === 'party-0')).toBe(true);
    expect(has(b, 'enemy-2', 'poisoned')).toBe(true); // slot 3'teki warrior
  });

  it('su (Flooded) sıçrar, komşudaki birim Soaked olur; YZ adayında sıçrama değeri görünür', () => {
    const b = mk({ enemies: { 0: 'warrior', 3: 'warrior' } });
    b.debugPlaceGround('party-0', 'flooded', 'enemy', [0]);
    const ex = explainChoice(b, 'party-1', { ...content.aiConfig, global: undefined })!;
    const cand = ex.candidates.find((c) => c.skill === 'tremor_slam');
    expect(cand?.notes?.join(' ') ?? '').toMatch(/liquid splash/);
    act(b, 'party-1', 'tremor_slam', 'enemy-0');
    expect(groundAt(b, 'flooded', 3)).toBe(true);
    expect(has(b, 'enemy-1', 'soaked')).toBe(true);
  });
});

