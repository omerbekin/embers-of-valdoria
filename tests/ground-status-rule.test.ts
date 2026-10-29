/**
 * GENEL ZEMİN KURALI (Ömer 2026-10-29, open-questions 453): zemin kendi durumunu İÇİNDE DURAN birime verir. Giren (yürüyerek, Move, itilerek /
 * çekilerek) o an alır; içindeyken durumun süresi işlemez; çıkınca ya da zemin bitince o an kalkar. Hasar / şifa zeminden değil DURUMDAN gelir:
 * durum birimin tur başında BİR kez tikler (güç zeminin gücü); yeniden kazanmak tik atmaz. Aynı türden skill durumuyla çakışınca güçlü olan geçer,
 * birim zeminden çıkınca skill örneği kalan süresiyle sürer. Sayılar veriden (provizyon).
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, previewSkill } from '../src/engine';
import type { BattleEvent, Combatant, CombatantDef, Status } from '../src/engine';

const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);

function arena(party: [string, number][], enemies: [string, number][], mode: 'test' | 'turns' = 'test', seed = 1): Battle {
  const base = content.battleSetup('random-battle', seed, mode, { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
  b.debug.crit = 'never';
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0, armor: 0, magicArmor: 0, hpRegen: 0 });
    c.hp = c.maxHp = 5000;
  }
  return b;
}
interface Priv {
  record(e: BattleEvent): void;
  addStatus(t: Combatant, s: Status, emit: (e: BattleEvent) => void, cause?: string): void;
}
const X = (b: Battle): Priv => b as unknown as Priv;
const emitOf = (b: Battle) => (e: BattleEvent) => X(b).record(e);
const st = (c: Combatant, kind: string) => c.statuses.find((s) => s.kind === kind);
const place = (b: Battle, by: string, ground: string, board: 'party' | 'enemy', slots: number[], turns = 3, power = 0.5) => {
  const r = b.debugPlaceGround(by, ground, board, slots, turns, power);
  expect(r.ok, r.ok ? '' : r.reason).toBe(true);
  return b.ground[b.ground.length - 1]!;
};
/** Birimi elle başka hücreye koyup zemin durumlarını eşitler (Move ile aynı yol: syncGroundStatuses). */
const step = (b: Battle, c: Combatant, slot: number) => {
  c.slot = slot;
  b.syncGroundStatuses(emitOf(b));
};
function untilTurn(b: Battle, c: Combatant, max = 40): void {
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
}
/** `c`'nin bir sonraki tur başına kadar ilerler (şu an sıradaysa önce turunu pas geçer). */
function nextTurnOf(b: Battle, c: Combatant): BattleEvent[] {
  const from = b.log.length;
  if (b.currentActor === c) expect(b.skipTurn().ok).toBe(true);
  untilTurn(b, c);
  return b.log.slice(from);
}
const groundHits = (evs: BattleEvent[], uid: string) => ofType(evs, 'damage').filter((d) => d.target === uid && d.ground);

describe('genel zemin kuralı: veri', () => {
  it('eşleme: her zeminin ana durumu (status / su: soak) statuses.json\'da tanımlı', () => {
    const want: Record<string, string> = {
      burning: 'burning', storm: 'chilled', ice_ground: 'slow', flooded: 'soaked', quaking_ground: 'slow', field_of_shafts: 'slow', root_field: 'slow',
      poison: 'poisoned', holy_fire: 'searing', sanctified_flame: 'searing', lingering_rain: 'bleeding', flooded_planks: 'soaked', holy_ground: 'hallowed', holy_water: 'hallowed',
    };
    for (const [g, s] of Object.entries(want)) {
      const def = content.grounds[g]!;
      expect(def.status ?? def.soak, g).toBe(s);
      expect(content.statuses[s], s).toBeDefined();
    }
    expect(content.grounds.hall_of_silence!.statuses?.some((x) => x.status === 'silence' && x.mpZero)).toBe(true);
    expect(content.grounds.flooded_planks!.directTick).toBe(true);
    expect((content.grounds.flooded as { soakTurns?: number }).soakTurns).toBeUndefined();
  });

  it('yeni durumlar: Poisoned (nature DoT + 15% less healing), Searing (holy), Bleeding (physical), Hallowed (buff)', () => {
    expect(content.statuses.poisoned).toMatchObject({ type: 'debuff', healTakenMult: 0.85, dot: { element: 'nature' } });
    expect(content.statuses.searing).toMatchObject({ type: 'debuff', dot: { element: 'holy' } });
    expect(content.statuses.bleeding).toMatchObject({ type: 'debuff', dot: { element: 'physical' } });
    expect(content.statuses.hallowed).toMatchObject({ type: 'buff' });
    for (const k of ['poisoned', 'searing', 'bleeding', 'hallowed']) expect(content.statuses[k]!.text.length, k).toBeGreaterThan(0);
  });
});

describe('genel zemin kuralı: giriş / çıkış / bitiş', () => {
  it('zemin konunca içindeki düşman durumu o an alır (tik yok); süresi işlemez; kendi tarafı etkilenmez', () => {
    const b = arena([['mage', 1], ['warrior', 0]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    const from = b.log.length;
    const g = place(b, 'party-0', 'burning', 'enemy', [1]);
    const burn = st(foe, 'burning')!;
    expect(burn).toMatchObject({ fromGround: g.id, groundKind: 'burning', source: 'party-0', amount: g.amount });
    expect(groundHits(b.log.slice(from), foe.uid)).toHaveLength(0);
    expect(ofType(b.log.slice(from), 'status').some((e) => e.target === foe.uid && e.status === 'burning' && e.cause === 'burning')).toBe(true);
    // dost tahtasına konan düşman zemini: bırakanın tarafı etkilenmez
    place(b, 'party-0', 'burning', 'party', [0]);
    expect(st(b.get('party-1')!, 'burning')).toBeUndefined();
  });

  it('Move ile giren o an alır, çıkan o an bırakır', () => {
    const b = arena([['warrior', 0]], [['warrior', 1]]);
    const me = b.get('party-0')!;
    place(b, 'enemy-0', 'poison', 'party', [1]);
    expect(st(me, 'poisoned')).toBeUndefined();
    expect(b.useGlobal(me.uid, 'move_tile', 1).ok).toBe(true);
    expect(st(me, 'poisoned')?.fromGround).toBeDefined();
    expect(b.useGlobal(me.uid, 'move_tile', 2).ok).toBe(true);
    expect(st(me, 'poisoned')).toBeUndefined();
    expect(ofType(b.log, 'statusEnd').some((e) => e.target === me.uid && e.status === 'poisoned')).toBe(true);
  });

  it('zeminin süresi bitince durum o an kalkar (içindeyken durumun süresi azalmaz)', () => {
    const b = arena([['mage', 1]], [['warrior', 1]], 'turns', 3);
    const me = b.get('party-0')!;
    const foe = b.get('enemy-0')!;
    untilTurn(b, me);
    const g = place(b, me.uid, 'storm', 'enemy', [1], 2);
    expect(st(foe, 'chilled')?.fromGround).toBe(g.id);
    nextTurnOf(b, foe);
    expect(st(foe, 'chilled')?.fromGround).toBe(g.id); // düşmanın kendi turu durumu bitirmez
    g.turns = 1;
    nextTurnOf(b, me); // bırakanın tur başında zemin biter
    expect(b.ground.includes(g)).toBe(false);
    expect(st(foe, 'chilled')).toBeUndefined();
  });

  it('itilen birim (Ice Crater) zemine girdiği an durumunu alır', () => {
    const b = arena([['mage', 7]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    place(b, 'party-0', 'burning', 'enemy', [4]);
    expect(st(foe, 'burning')).toBeUndefined();
    b.get('party-0')!.mp = 999;
    expect(b.useSkill('party-0', 'ice_crater', foe.uid, undefined, undefined, undefined, undefined, 'back').ok).toBe(true);
    expect(foe.slot).toBe(4);
    expect(st(foe, 'burning')?.fromGround).toBeDefined();
    // önizleme: itilen hücrenin zemin durumu satırı
    const b2 = arena([['mage', 7]], [['warrior', 1]]);
    place(b2, 'party-0', 'burning', 'enemy', [4]);
    const pv = previewSkill(b2, 'party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, 'back');
    expect(pv.find((e) => e.uid === 'enemy-0')?.statuses?.some((s) => s.includes('Burning'))).toBe(true);
  });
});

describe('genel zemin kuralı: tik', () => {
  it('tur başında BİR tik (zeminin gücü); iki Burning Ground arasında yürümek ikinci tik atmaz', () => {
    const b = arena([['mage', 1]], [['warrior', 1]], 'turns', 5);
    const me = b.get('party-0')!;
    const foe = b.get('enemy-0')!;
    untilTurn(b, me);
    const a = place(b, me.uid, 'burning', 'enemy', [1], 9);
    place(b, me.uid, 'burning', 'enemy', [2], 9);
    let evs = nextTurnOf(b, foe);
    const hits = groundHits(evs, foe.uid);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.amount + hits[0]!.absorbed).toBe(b.groundTickDamage('burning', a.amount, foe));
    // Burning Ground -> boş kare -> ikinci Burning Ground: durumu yeniden kazanır ama turda yine tek tik
    step(b, foe, 0);
    expect(st(foe, 'burning')).toBeUndefined();
    step(b, foe, 2);
    expect(st(foe, 'burning')?.fromGround).toBeDefined();
    evs = nextTurnOf(b, foe);
    expect(groundHits(evs, foe.uid)).toHaveLength(1);
  });

  it('aynı türden iki zemin üst üste (farklı güç): en güçlüsü, tek tik', () => {
    const b = arena([['mage', 1], ['mage', 2]], [['warrior', 1]], 'turns', 5);
    const foe = b.get('enemy-0')!;
    b.get('party-1')!.stats.int = b.get('party-0')!.stats.int * 3;
    place(b, 'party-0', 'burning', 'enemy', [1], 9);
    const strong = place(b, 'party-1', 'burning', 'enemy', [1], 9);
    expect(st(foe, 'burning')).toMatchObject({ fromGround: strong.id, amount: strong.amount });
    const evs = nextTurnOf(b, foe);
    expect(groundHits(evs, foe.uid)).toHaveLength(1);
  });
});

describe('genel zemin kuralı: skill durumu ile çakışma', () => {
  it('skill Burning daha güçlüyse o geçerli; zemin örneği eklenmez', () => {
    const b = arena([['mage', 1]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    X(b).addStatus(foe, { kind: 'burning', turns: 3, source: 'party-0', amount: 9999 }, emitOf(b));
    place(b, 'party-0', 'burning', 'enemy', [1]);
    expect(foe.statuses.filter((s) => s.kind === 'burning')).toHaveLength(1);
    expect(st(foe, 'burning')).toMatchObject({ amount: 9999, turns: 3 });
    expect(st(foe, 'burning')!.fromGround).toBeUndefined();
  });

  it('zemin daha güçlüyse zemin örneği geçer, zayıf skill örneği altta bekler ve zeminden çıkınca kalan süresiyle döner', () => {
    const b = arena([['mage', 1]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    X(b).addStatus(foe, { kind: 'burning', turns: 3, source: 'party-0', amount: 1 }, emitOf(b));
    const g = place(b, 'party-0', 'burning', 'enemy', [1]);
    expect(g.amount).toBeGreaterThan(1);
    const cur = st(foe, 'burning')!;
    expect(cur.fromGround).toBe(g.id);
    expect(cur.held).toMatchObject({ amount: 1, turns: 3 });
    // içerideyken yeni zayıf skill uygulaması üst üste binmez, alttaki örneğe katılır
    X(b).addStatus(foe, { kind: 'burning', turns: 2, source: 'party-0', amount: 1 }, emitOf(b));
    expect(foe.statuses.filter((s) => s.kind === 'burning')).toHaveLength(1);
    step(b, foe, 0);
    const back = st(foe, 'burning')!;
    expect(back.fromGround).toBeUndefined();
    expect(back).toMatchObject({ amount: 1, turns: 3 });
  });

  it('içerideyken daha güçlü skill uygulaması zemin örneğinin yerine geçer; çıkınca skill örneği sürer', () => {
    const b = arena([['mage', 1]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    place(b, 'party-0', 'burning', 'enemy', [1]);
    X(b).addStatus(foe, { kind: 'burning', turns: 2, source: 'party-0', amount: 9999 }, emitOf(b));
    expect(foe.statuses.filter((s) => s.kind === 'burning')).toHaveLength(1);
    expect(st(foe, 'burning')).toMatchObject({ amount: 9999, turns: 2 });
    step(b, foe, 0);
    expect(st(foe, 'burning')).toMatchObject({ amount: 9999, turns: 2 });
  });

  it('zemin kaynaklı durum dispel ile silinmez', () => {
    const b = arena([['mage', 1]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    place(b, 'party-0', 'burning', 'enemy', [1]);
    expect(b.dispelCandidates(foe, 'debuff').some((s) => s.kind === 'burning')).toBe(false);
  });
});

describe('genel zemin kuralı: her durum', () => {
  it('Poison -> Poisoned: nature tiki ve 15% less healing', () => {
    const b = arena([['mage', 1]], [['warrior', 1]], 'turns', 2);
    const foe = b.get('enemy-0')!;
    const g = place(b, 'party-0', 'poison', 'enemy', [1], 9);
    expect(st(foe, 'poisoned')?.amount).toBe(g.amount);
    expect(b.statusMult(foe, 'healTakenMult')).toBeCloseTo(0.85, 6);
    const hits = groundHits(nextTurnOf(b, foe), foe.uid);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.element).toBe('nature');
  });

  it('Holy Fire -> Searing; Sanctified Flame (tepkime) daha güçlü Searing', () => {
    const b = arena([['paladin', 1]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    const hf = place(b, 'party-0', 'holy_fire', 'enemy', [1]);
    expect(st(foe, 'searing')?.amount).toBe(hf.amount);
    place(b, 'party-0', 'burning', 'enemy', [1]); // Burning + Holy Fire = Sanctified Flame
    const sf = b.ground.find((x) => x.ground === 'sanctified_flame')!;
    expect(sf).toBeDefined();
    expect(st(foe, 'searing')).toMatchObject({ fromGround: sf.id, groundKind: 'sanctified_flame' });
    expect(st(foe, 'searing')!.amount!).toBeGreaterThan(hf.amount);
    expect(st(foe, 'burning')).toBeUndefined(); // Burning Ground tepkimeyle kalktı
  });

  it('Lingering Rain -> Bleeding (physical tik)', () => {
    const b = arena([['archer', 1]], [['warrior', 1]], 'turns', 2);
    const foe = b.get('enemy-0')!;
    place(b, 'party-0', 'lingering_rain', 'enemy', [1], 9, 0.5);
    expect(st(foe, 'bleeding')?.fromGround).toBeDefined();
    const hits = groundHits(nextTurnOf(b, foe), foe.uid);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.element).toBe('physical');
  });

  it('Holy Ground / Holy Water -> Hallowed (dosta): tur başında bugünkü şifa; düşmana bir şey olmaz', () => {
    const b = arena([['paladin', 1], ['warrior', 0]], [['warrior', 1]], 'turns', 2);
    const ally = b.get('party-1')!;
    ally.hp = 100;
    const g = place(b, 'party-0', 'holy_ground', 'party', [0], 9);
    expect(st(ally, 'hallowed')).toMatchObject({ fromGround: g.id, amount: g.amount });
    expect(b.get('party-0')!.statuses.some((s) => s.kind === 'hallowed')).toBe(false);
    const hp0 = ally.hp;
    const evs = nextTurnOf(b, ally);
    const heals = ofType(evs, 'heal').filter((h) => h.target === ally.uid && h.cause === 'holy_ground');
    expect(heals).toHaveLength(1);
    expect(ally.hp).toBeGreaterThan(hp0);
    // Holy Water (tepkime: su + Holy Ground, kendi tahtası) da Hallowed
    const b2 = arena([['paladin', 1], ['warrior', 0]], [['warrior', 1]]);
    place(b2, 'party-0', 'flooded', 'party', [0]);
    expect(st(b2.get('party-1')!, 'soaked')?.fromGround).toBeDefined();
    place(b2, 'party-0', 'holy_ground', 'party', [0]);
    expect(b2.ground.some((x) => x.ground === 'holy_water')).toBe(true);
    expect(st(b2.get('party-1')!, 'hallowed')?.groundKind).toBe('holy_water');
    expect(st(b2.get('party-1')!, 'soaked')).toBeUndefined(); // su kalktı
  });

  it('Flooded -> Soaked (herkese); çıkınca o an kalkar; su + Chill Ground = Ice: durum Slow\'a döner', () => {
    const b = arena([['mage', 1]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    place(b, 'party-0', 'flooded', 'enemy', [1]);
    expect(st(foe, 'soaked')?.fromGround).toBeDefined();
    place(b, 'party-0', 'storm', 'enemy', [1]); // Frozen
    expect(b.ground.some((x) => x.ground === 'ice_ground')).toBe(true);
    expect(st(foe, 'soaked')).toBeUndefined();
    expect(st(foe, 'slow')?.groundKind).toBe('ice_ground');
    step(b, foe, 0);
    expect(st(foe, 'slow')).toBeUndefined();
  });

  it('Flooded Planks -> Soaked; kendi küçük fiziksel hasarı zemin tiki olarak kalır (istisna)', () => {
    const b = arena([['mage', 1]], [['warrior', 1]], 'turns', 2);
    const foe = b.get('enemy-0')!;
    const g = place(b, 'party-0', 'flooded_planks', 'enemy', [1], 9);
    const s = st(foe, 'soaked')!;
    expect(s.fromGround).toBe(g.id);
    expect(s.amount).toBeUndefined();
    const hits = groundHits(nextTurnOf(b, foe), foe.uid);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.ground).toBe('flooded_planks');
  });

  it('Quaking Ground / Field of Shafts / Root Field / Ice -> Slow; Chill Ground -> Chilled', () => {
    for (const [g, k] of [['quaking_ground', 'slow'], ['field_of_shafts', 'slow'], ['root_field', 'slow'], ['ice_ground', 'slow'], ['storm', 'chilled']] as const) {
      const b = arena([['mage', 1]], [['warrior', 1]]);
      place(b, 'party-0', g, 'enemy', [1]);
      expect(st(b.get('enemy-0')!, k)?.groundKind, g).toBe(g);
    }
  });

  it('Hall of Silence: MP\'si 0 olan giren Silenced (içindeyken sürer); MP\'si olan girmez', () => {
    const b = arena([['mage', 1]], [['mage', 1], ['mage', 2]]);
    const dry = b.get('enemy-0')!;
    const full = b.get('enemy-1')!;
    dry.mp = 0;
    full.mp = full.maxMp;
    place(b, 'party-0', 'hall_of_silence', 'enemy', [1, 2]);
    expect(st(dry, 'silence')?.fromGround).toBeDefined();
    expect(st(full, 'silence')).toBeUndefined();
    dry.mp = dry.maxMp;
    b.syncGroundStatuses(emitOf(b));
    expect(st(dry, 'silence')?.fromGround).toBeDefined(); // içeride kalınca sürer
  });

  it('boss CC bağışık: zemin Slow / Chilled vermez, Immune girişte bir kez', () => {
    const b = arena([['mage', 1]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    foe.tier = 'boss';
    const from = b.log.length;
    place(b, 'party-0', 'storm', 'enemy', [1]);
    b.syncGroundStatuses(emitOf(b));
    expect(st(foe, 'chilled')).toBeUndefined();
    expect(ofType(b.log.slice(from), 'immune').filter((e) => e.target === foe.uid && e.status === 'chilled')).toHaveLength(1);
  });

  it('Heat Mirage: saldıranın hücresindeki 1 turluk Burning Ground saldırana o an Burning verir', () => {
    const b = arena([['mage', 0]], [['warrior', 1]]);
    const foe = b.get('enemy-0')!;
    const warriorMelee = foe.skills.find((id) => b.skill(id, foe)?.motion === 'melee' && b.skill(id, foe)?.effects.some((e) => e.type === 'damage'))!;
    expect(warriorMelee).toBeDefined();
    foe.mp = foe.maxMp;
    foe.cooldowns = {};
    expect(b.useSkill(foe.uid, warriorMelee, 'party-0').ok).toBe(true);
    const g = b.ground.find((x) => x.ground === 'burning' && x.board === 'enemy' && x.slots.includes(foe.slot));
    expect(g).toBeDefined();
    expect(st(foe, 'burning')?.fromGround).toBe(g!.id);
  });
});
