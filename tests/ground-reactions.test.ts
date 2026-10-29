/**
 * Zemin tepkimeleri (Ömer 2026-10-27, open-questions 445; veri data/grounds.json > reactions). Kurulum (hücrede olan) + tetik (yeni bırakılan)
 * -> hücrede bir kez tepkime, tek sonuç. Sayılar veriden okunur (provizyon).
 */
import { describe, expect, it } from 'vitest';
import { Battle, attributePower, chooseAction, content } from '../src/engine';
import type { BattleEvent, GroundEffect } from '../src/engine';

const R = content.groundReactions;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
const mk = (mode: 'turns' | 'test' = 'turns', seed = 7) => {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells({ 0: 'mage', 1: 'paladin' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 3: 'warrior', 4: 'warrior' }) }, false));
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, armor: 0, magicArmor: 0, resilience: 0 });
  const me = b.get('party-0')!;
  return { b, me };
};
const at = (b: Battle, board: 'party' | 'enemy', slot: number): GroundEffect[] => b.ground.filter((g) => g.board === board && g.slots.includes(slot));
const typesAt = (b: Battle, board: 'party' | 'enemy', slot: number) => at(b, board, slot).map((g) => g.ground).sort();
const place = (b: Battle, by: string, ground: string, board: 'party' | 'enemy', slots: number[], turns = 3) => {
  const r = b.debugPlaceGround(by, ground, board, slots, turns);
  expect(r.ok, r.ok ? '' : r.reason).toBe(true);
};
const reactions = (b: Battle) => b.log.filter((e): e is Extract<BattleEvent, { type: 'groundReaction' }> => e.type === 'groundReaction');
const hpOf = (b: Battle, uid: string) => b.get(uid)!.hp;

describe('zemin tepkimeleri: veri', () => {
  it('reactions bloğu zemin değil; her tepkimenin zeminleri ve yeni zeminleri tanımlı, etiketi ve metni var', () => {
    expect(content.grounds.reactions).toBeUndefined();
    expect(Object.keys(R).sort()).toEqual(['evaporate', 'explosion', 'feed', 'frozen', 'frozen_chill', 'holy_water', 'holy_water_ground', 'purge', 'quenched', 'roots_burn', 'sanctified', 'spread', 'toxic_smoke']);
    for (const [id, d] of Object.entries(R)) {
      expect(d.label, id).toBeTruthy();
      expect(d.text, id).toBeTruthy();
      for (const g of [...d.setup, ...d.trigger, ...(d.becomes ? [d.becomes.ground] : [])]) expect(content.grounds[g], `${id}: ${g}`).toBeDefined();
    }
  });
});

describe('zemin tepkimeleri: motor', () => {
  it('1 Explosion (Poison -> Burning): hücreye ve 4 yönden komşulara anlık ateş hasarı; zehir kalkar, ateş kalır', () => {
    for (const mode of ['turns', 'test'] as const) {
      const { b, me } = mk(mode);
      place(b, me.uid, 'poison', 'enemy', [0]);
      place(b, me.uid, 'burning', 'enemy', [0]);
      expect(typesAt(b, 'enemy', 0)).toEqual(['burning']);
      const ev = reactions(b);
      expect(ev).toHaveLength(1);
      expect(ev[0]).toMatchObject({ reaction: 'explosion', label: R.explosion!.label, slot: 0, setup: 'poison', trigger: 'burning', source: me.uid });
      const dmg = b.log.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.reaction === 'explosion');
      const center = dmg.find((d) => d.target === 'enemy-0')!;
      const burn = b.ground.find((g) => g.ground === 'burning')!;
      const base = Math.round((burn.amount + amountFor(b, me.uid)) * R.explosion!.damage!.mult);
      expect(center.amount + center.absorbed).toBe(b.tickDamage('fire', 'magic', base, b.get('enemy-0')!));
      // komşular: aynı sıradaki 1 ve arkadaki 3 (4 komşu değil)
      const adj = new Set(dmg.filter((d) => d.target !== 'enemy-0').map((d) => d.target));
      const bySlot = (sl: number) => b.combatants.find((c) => c.side === 'enemy' && c.slot === sl)!.uid;
      expect([...adj].sort()).toEqual([bySlot(1), bySlot(3)].sort());
      const side = dmg.find((d) => d.target === 'enemy-1')!;
      expect(side.amount + side.absorbed).toBe(b.tickDamage('fire', 'magic', Math.round(base * R.explosion!.damage!.adjacent!), b.get('enemy-1')!));
    }
  });

  it('2 sıra önemli: Burning -> Poison = Toxic smoke (Blinded + bir zehir tiki); zehir buharlaşır, ateş kalır', () => {
    const { b, me } = mk();
    place(b, me.uid, 'burning', 'enemy', [0]);
    const before = hpOf(b, 'enemy-0');
    place(b, me.uid, 'poison', 'enemy', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['toxic_smoke']);
    expect(typesAt(b, 'enemy', 0)).toEqual(['burning']);
    expect(b.get('enemy-0')!.statuses.some((s) => s.kind === R.toxic_smoke!.status!.status)).toBe(true);
    const poisonAmt = amountFor(b, me.uid);
    expect(before - hpOf(b, 'enemy-0')).toBe(b.tickDamage('nature', 'magic', Math.round(poisonAmt * R.toxic_smoke!.damage!.mult), b.get('enemy-0')!));
    // komşulara hasar yok
    expect(b.log.some((e) => e.type === 'damage' && e.target !== 'enemy-0')).toBe(false);
  });

  it('3 Purified (Holy Fire -> Poison): zehir tutmaz, kutsal ateşin süresi o hücrede baştan başlar', () => {
    const { b, me } = mk();
    place(b, me.uid, 'holy_fire', 'enemy', [0, 1], 3);
    b.ground[0]!.turns = 1;
    place(b, me.uid, 'poison', 'enemy', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['purge']);
    expect(typesAt(b, 'enemy', 0)).toEqual(['holy_fire']);
    expect(at(b, 'enemy', 0)[0]!.turns).toBe(3);
    expect(at(b, 'enemy', 1)[0]!.turns).toBe(1); // yalnızca tepkimenin hücresi
  });

  it('3b Purified, Withering durumunu kutsal ateşin sahibinin hücredeki dostlarından siler; düşmandan silmez (Ömer 2026-10-28, 445)', () => {
    expect(R.purge!.cleanse).toEqual(['wither']);
    const { b, me } = mk();
    // kendi tahtamda kutsal ateş (sahibi ben), üstümde Withering; düşman zehir atar -> Purified -> benden silinir
    place(b, me.uid, 'holy_fire', 'party', [0]);
    expect(b.debugAddStatus(me.uid, 'wither').ok).toBe(true);
    place(b, 'enemy-0', 'poison', 'party', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['purge']);
    expect(me.statuses.some((s) => s.kind === 'wither')).toBe(false);
    expect(b.log.some((e) => e.type === 'statusEnd' && e.target === me.uid && e.status === 'wither' && e.dispelled)).toBe(true);
    // düşman tahtasında benim kutsal ateşim: hücredeki düşmanın Withering'i kalır
    const t = mk();
    place(t.b, t.me.uid, 'holy_fire', 'enemy', [0]);
    expect(t.b.debugAddStatus('enemy-0', 'wither').ok).toBe(true);
    place(t.b, t.me.uid, 'poison', 'enemy', [0]);
    expect(reactions(t.b).map((e) => e.reaction)).toEqual(['purge']);
    expect(t.b.get('enemy-0')!.statuses.some((s) => s.kind === 'wither')).toBe(true);
  });

  it('4 Fed (Poison -> Holy Fire): zehir tükenir, kutsal ateş o hücrede %50 fazla vurur', () => {
    const { b, me } = mk();
    place(b, me.uid, 'poison', 'enemy', [0]);
    place(b, me.uid, 'holy_fire', 'enemy', [0, 1]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['feed']);
    expect(typesAt(b, 'enemy', 0)).toEqual(['holy_fire']);
    const hf = at(b, 'enemy', 0)[0]!;
    expect(hf.cellMult?.[0]).toBe(R.feed!.cellMult!.mult);
    expect(hf.cellMult?.[1]).toBeUndefined();
  });

  it('5 Sanctified (Burning <-> Holy Fire, iki sıra): tek kutsal zemin, güçlünün %30 fazlası, uzun süre', () => {
    for (const [first, second] of [['burning', 'holy_fire'], ['holy_fire', 'burning']] as const) {
      const { b, me } = mk();
      place(b, me.uid, first, 'enemy', [0], 2);
      const a1 = b.ground[0]!.amount;
      place(b, me.uid, second, 'enemy', [0], 4);
      expect(reactions(b).map((e) => e.reaction)).toEqual(['sanctified']);
      const here = at(b, 'enemy', 0);
      expect(here.map((g) => g.ground)).toEqual(['sanctified_flame']);
      const a2 = amountFor(b, me.uid);
      expect(here[0]!.amount).toBe(Math.round(Math.max(a1, a2) * R.sanctified!.becomes!.power));
      expect(here[0]!.turns).toBe(4);
      expect(here[0]!.source).toBe(me.uid);
    }
  });

  it('5b Sanctified Flame ateşle yeniden birleşmez (Ömer 2026-10-28, 445): Burning üst üste durur', () => {
    for (const order of [['sanctified_flame', 'burning'], ['burning', 'sanctified_flame']] as const) {
      const { b, me } = mk();
      place(b, me.uid, order[0], 'enemy', [0]);
      place(b, me.uid, order[1], 'enemy', [0]);
      expect(reactions(b)).toHaveLength(0);
      expect(typesAt(b, 'enemy', 0)).toEqual(['burning', 'sanctified_flame']);
    }
  });

  it('6 Roots burn (Root Field <-> Burning): kök kalkar, anlık ateş hasarı, ateş kalır', () => {
    for (const order of [['root_field', 'burning'], ['burning', 'root_field']] as const) {
      const { b, me } = mk();
      place(b, me.uid, order[0], 'enemy', [0]);
      const before = hpOf(b, 'enemy-0');
      place(b, me.uid, order[1], 'enemy', [0]);
      expect(reactions(b).map((e) => e.reaction)).toEqual(['roots_burn']);
      expect(typesAt(b, 'enemy', 0)).toEqual(['burning']);
      expect(hpOf(b, 'enemy-0')).toBeLessThan(before);
    }
  });

  it('7 Quenched (Storm <-> Burning): ikisi söner, hücre su olur (Flooded: üstündeki ıslanır)', () => {
    for (const order of [['storm', 'burning'], ['burning', 'storm']] as const) {
      const { b, me } = mk();
      place(b, me.uid, order[0], 'enemy', [0]);
      place(b, me.uid, order[1], 'enemy', [0]);
      expect(reactions(b).map((e) => e.reaction)).toEqual(['quenched']);
      expect(typesAt(b, 'enemy', 0)).toEqual(['flooded']);
      expect(at(b, 'enemy', 0)[0]!.turns).toBe(R.quenched!.becomes!.turns);
      expect(b.get('enemy-0')!.statuses.some((s) => s.kind === content.grounds.flooded!.soak)).toBe(true);
    }
  });

  it('8 Spread (su <-> zehir): zehir suya bağlı tüm su hücrelerine yayılır, su kalır', () => {
    {
      const { b, me } = mk();
      place(b, me.uid, 'flooded', 'enemy', [0, 1, 2, 4]);
      place(b, me.uid, 'poison', 'enemy', [0]);
      expect(reactions(b).map((e) => e.reaction)).toEqual(['spread']);
      const poison = b.ground.find((g) => g.ground === 'poison')!;
      expect(poison.slots).toEqual([0, 1, 2, 4]);
      expect(b.ground.find((g) => g.ground === 'flooded')!.slots).toEqual([0, 1, 2, 4]);
    }
    {
      const { b, me } = mk();
      place(b, me.uid, 'poison', 'enemy', [1]);
      place(b, me.uid, 'flooded', 'enemy', [1, 2, 5, 9]); // 9 bağlı değil
      expect(b.ground.find((g) => g.ground === 'poison')!.slots).toEqual([1, 2, 5]);
    }
  });

  it('9 Holy water (su <-> Holy Fire): şifa zemini, tetiği bırakanın tarafını tur başında iyileştirir, hasar vermez', () => {
    const { b, me } = mk();
    place(b, me.uid, 'flooded', 'party', [0]);
    place(b, me.uid, 'holy_fire', 'party', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['holy_water']);
    expect(typesAt(b, 'party', 0)).toEqual(['holy_water']);
    expect(b.isHealGround('holy_water')).toBe(true);
    me.hp = Math.round(me.maxHp / 2);
    const start = b.log.length;
    for (let i = 0; i < 20 && b.currentUid !== me.uid; i++) b.skipTurn();
    if (b.currentUid === me.uid) b.skipTurn();
    const after = b.log.slice(start);
    expect(after.some((e) => e.type === 'heal' && e.target === me.uid && e.cause === 'holy_water')).toBe(true);
    expect(after.some((e) => e.type === 'damage' && e.ground === 'holy_water')).toBe(false);
  });

  it('9b Evaporates (Ömer 2026-10-28, 445): karşı tahtada su + Holy Fire Holy Water olmaz; su buharlaşır, kutsal ateş kalır ve vurur (iki sıra)', () => {
    for (const order of [['flooded', 'holy_fire'], ['holy_fire', 'flooded']] as const) {
      const { b, me } = mk();
      place(b, me.uid, order[0], 'enemy', [0]);
      place(b, me.uid, order[1], 'enemy', [0]);
      expect(reactions(b).map((e) => e.reaction)).toEqual(['evaporate']);
      expect(typesAt(b, 'enemy', 0)).toEqual(['holy_fire']);
      expect(at(b, 'enemy', 0)[0]!.amount).toBeGreaterThan(0);
      const start = b.log.length;
      for (let i = 0; i < 20 && b.currentUid !== 'enemy-0'; i++) b.skipTurn();
      b.skipTurn();
      expect(b.log.slice(start).some((e) => e.type === 'damage' && e.target === 'enemy-0' && e.ground === 'holy_fire')).toBe(true);
    }
    // düşman kendi tahtasına bırakırsa (kendi tahtası) yine Holy Water
    const t = mk();
    place(t.b, t.me.uid, 'flooded', 'enemy', [0]);
    place(t.b, 'enemy-0', 'holy_fire', 'enemy', [0]);
    expect(reactions(t.b).map((e) => e.reaction)).toEqual(['holy_water']);
    // önizleme: Judgment su olan düşman hücresinde "Evaporates"
    const p = mk('test');
    place(p.b, p.me.uid, 'flooded', 'enemy', [0]);
    expect(p.b.groundReactionPreview('party-1', 'judgment', 0, 'enemy')).toEqual([{ board: 'enemy', slot: 0, reaction: 'evaporate', label: R.evaporate!.label }]);
    // debug düğmeleri: Holy water birimin kendi tahtasında doğar, Evaporates karşı taraftan
    const d = mk();
    expect(d.b.debugGroundReaction(d.me.uid, 'holy_water').ok).toBe(true);
    expect(typesAt(d.b, 'party', 0)).toEqual(['holy_water']);
    const e = mk();
    expect(e.b.debugGroundReaction(e.me.uid, 'evaporate').ok).toBe(true);
    expect(typesAt(e.b, 'party', 0)).toEqual(['holy_fire']);
  });

  it('9c Holy Ground + su = Holy Water (Ömer 2026-10-28, 445): iki sıra, yalnız kendi tahtada, şifa = Holy Ground tutarı; önizleme + debug', () => {
    expect(R.holy_water_ground!.label).toBe(R.holy_water!.label);
    for (const order of [['flooded', 'holy_ground'], ['holy_ground', 'flooded']] as const) {
      const { b, me } = mk();
      place(b, me.uid, order[0], 'party', [0]);
      place(b, me.uid, order[1], 'party', [0]);
      expect(reactions(b).map((e) => e.reaction)).toEqual(['holy_water_ground']);
      expect(typesAt(b, 'party', 0)).toEqual(['holy_water']);
      const hw = at(b, 'party', 0)[0]!;
      expect(hw.amount).toBe(Math.round(amountFor(b, me.uid) * R.holy_water_ground!.becomes!.power));
      expect(hw.turns).toBe(R.holy_water_ground!.becomes!.turns);
      expect(hw.source).toBe(me.uid);
      me.hp = Math.round(me.maxHp / 2);
      const start = b.log.length;
      for (let i = 0; i < 20 && b.currentUid !== me.uid; i++) b.skipTurn();
      if (b.currentUid === me.uid) b.skipTurn();
      expect(b.log.slice(start).some((e) => e.type === 'heal' && e.target === me.uid && e.cause === 'holy_water' && e.amount > 0)).toBe(true);
    }
    // karşı tahtada (bırakanın kendi tahtası değil) tepkime yok: ikisi üst üste durur (iki sıra)
    for (const order of [['flooded', 'holy_ground'], ['holy_ground', 'flooded']] as const) {
      const { b, me } = mk();
      place(b, me.uid, order[0], 'enemy', [0]);
      place(b, me.uid, order[1], 'enemy', [0]);
      expect(reactions(b)).toHaveLength(0);
      expect(typesAt(b, 'enemy', 0)).toEqual(['flooded', 'holy_ground']);
    }
    // düşmanın bıraktığı su benim Holy Ground'umda (benim tahtam, düşman için karşı tahta): tepkime yok
    const f = mk();
    place(f.b, f.me.uid, 'holy_ground', 'party', [0]);
    place(f.b, 'enemy-0', 'flooded', 'party', [0]);
    expect(reactions(f.b)).toHaveLength(0);
    // önizleme: Judgment kendi tarafında sulu hücrede "Holy water"
    const p = mk('test');
    place(p.b, p.me.uid, 'flooded', 'party', [0]);
    const prev = p.b.groundReactionPreview('party-1', 'judgment', 0, 'party');
    expect(prev).toContainEqual({ board: 'party', slot: 0, reaction: 'holy_water_ground', label: R.holy_water_ground!.label });
    // debug düğmesi: birimin kendi tahtasında doğar
    const d = mk();
    expect(d.b.debugGroundReaction(d.me.uid, 'holy_water_ground').ok).toBe(true);
    expect(typesAt(d.b, 'party', 0)).toEqual(['holy_water']);
  });

  it('10 Frozen (su <-> Storm): buz zemini, su kalkar; düşman tur başında Slow alır (ağaçsız savaşta da)', () => {
    const { b, me } = mk();
    place(b, me.uid, 'flooded', 'enemy', [0]);
    place(b, me.uid, 'storm', 'enemy', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['frozen']);
    expect(typesAt(b, 'enemy', 0)).toEqual(['ice_ground']);
    for (let i = 0; i < 20 && b.currentUid !== 'enemy-0'; i++) b.skipTurn();
    b.skipTurn();
    expect(b.log.some((e) => e.type === 'status' && e.target === 'enemy-0' && e.status === 'slow')).toBe(true);
  });

  it('11 Frozen solid (Chill Ground üstüne Chill Ground): Ice olur, Chill kalkar; tek tepkime', () => {
    const { b, me } = mk();
    expect(content.grounds.storm!.name).toBe('Chill Ground');
    place(b, me.uid, 'storm', 'enemy', [0]);
    place(b, me.uid, 'storm', 'enemy', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['frozen_chill']);
    expect(typesAt(b, 'enemy', 0)).toEqual(['ice_ground']);
    // başka hücrede tek Chill tepkimez
    place(b, me.uid, 'storm', 'enemy', [1]);
    expect(reactions(b)).toHaveLength(1);
    expect(typesAt(b, 'enemy', 1)).toEqual(['storm']);
  });

  it('her iki tarafın zemini tepkir: düşmanın bıraktığı zehir + oyuncunun ateşi patlar; hasar tetiği bırakanın düşmanına', () => {
    const { b, me } = mk();
    place(b, 'enemy-1', 'poison', 'enemy', [0]);
    place(b, me.uid, 'burning', 'enemy', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['explosion']);
    expect(b.log.some((e) => e.type === 'damage' && e.target === 'enemy-0' && e.reaction === 'explosion')).toBe(true);
    // ters: oyuncunun zehri, düşmanın ateşi (oyuncu tahtasında): hasar oyuncu birimine
    const t = mk();
    place(t.b, t.me.uid, 'poison', 'party', [0]);
    place(t.b, 'enemy-0', 'burning', 'party', [0]);
    expect(t.b.log.some((e) => e.type === 'damage' && e.target === t.me.uid && e.source === 'enemy-0' && e.reaction === 'explosion')).toBe(true);
  });

  it('hücre başına tek tepkime: iki kurulum (zehir + kök) varken ateş bir kez tepkir (en eski kurulumla)', () => {
    const { b, me } = mk();
    place(b, me.uid, 'poison', 'enemy', [0]);
    place(b, me.uid, 'root_field', 'enemy', [0]);
    place(b, me.uid, 'burning', 'enemy', [0]);
    expect(reactions(b).map((e) => e.reaction)).toEqual(['explosion']);
  });

  it('aynı tür tepkimez; tepkimesiz zemin (Holy Ground) üst üste durur', () => {
    const { b, me } = mk();
    place(b, me.uid, 'poison', 'enemy', [0]);
    place(b, me.uid, 'poison', 'enemy', [0]);
    place(b, me.uid, 'hall_of_silence', 'enemy', [0]);
    expect(reactions(b)).toHaveLength(0);
  });

  it('tepkime tablosu yoksa (eski kurulum) zeminler eskisi gibi üst üste durur', () => {
    const setup = content.battleSetup('random-battle', 7, 'turns', { party: cells({ 0: 'mage' }), enemies: cells({ 0: 'warrior' }) }, false);
    delete setup.groundReactions;
    const b = new Battle(setup);
    place(b, 'party-0', 'poison', 'enemy', [0]);
    place(b, 'party-0', 'burning', 'enemy', [0]);
    expect(reactions(b)).toHaveLength(0);
    expect(typesAt(b, 'enemy', 0)).toEqual(['burning', 'poison']);
  });

  it('belirleyici: aynı seed + aynı hamleler = birebir aynı olay akışı', () => {
    const run = () => {
      const { b, me } = mk('turns', 11);
      place(b, me.uid, 'flooded', 'enemy', [0, 1, 3]);
      place(b, me.uid, 'poison', 'enemy', [1]);
      place(b, me.uid, 'burning', 'enemy', [0, 1, 3, 4]);
      place(b, me.uid, 'holy_fire', 'enemy', [4]);
      for (let i = 0; i < 8; i++) b.skipTurn();
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });

  it('önizleme: Meteor zehirli hücreyi kapsayan anchor\'da o hücrede "Explosion" gösterir', () => {
    const { b, me } = mk('test');
    place(b, me.uid, 'poison', 'enemy', [0]);
    let found = false;
    for (let a = 0; a < 12; a++) {
      const p = b.groundReactionPreview(me.uid, 'meteor', a, 'enemy');
      for (const x of p) {
        expect(x.slot).toBe(0);
        expect(x.label).toBe(R.explosion!.label);
        found = true;
      }
    }
    expect(found).toBe(true);
    expect(b.groundReactionPreview(me.uid, 'fire_bolt', 0, 'enemy')).toEqual([]);
  });

  it('YZ yeni zeminlerle (Sanctified Flame, Holy Water, Ice) çökmez, geçerli hamle yapar', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const { b, me } = mk('turns', seed);
      place(b, me.uid, 'burning', 'enemy', [0, 1]);
      place(b, me.uid, 'holy_fire', 'enemy', [0]);
      place(b, me.uid, 'flooded', 'party', [0, 3]);
      place(b, 'enemy-0', 'holy_fire', 'party', [0]);
      place(b, 'enemy-0', 'storm', 'party', [3]);
      for (let i = 0; i < 200 && !b.winner; i++) {
        const actor = b.currentUid!;
        const r = b.applyChoice(actor, chooseAction(b, actor, content.aiConfig));
        expect(r.ok, `seed ${seed} tur ${i}`).toBe(true);
      }
    }
  });
});

/** Debug zemininin tutarı (debugPlaceGround varsayılanı: INT gücü x 0,5). */
function amountFor(b: Battle, uid: string): number {
  return Math.round(attributePower(b.get(uid)!.stats, 'int', content.formulas) * 0.5);
}
