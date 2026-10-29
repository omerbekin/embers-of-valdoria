import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, previewSkill } from '../src/engine';
import type { BattleEvent, CombatantDef } from '../src/engine';
import { attributePower } from '../src/engine/stats';
import { pushDirChoice } from '../src/engine/ai';

// Ömer 2026-10-29 Mage reworkü: Ice Crater (3. skill, seçilen yönde itme / çarpma), Chilled durumu, Heat Mirage pasifi (+ Frost Skin direnci).
// Sayılar veriden okunur (data/skills.json, data/statuses.json, data/classes/mage.json); hepsi geçici.

const f = content.formulas;
const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);

function arena(party: [string, number][], enemies: [string, number][], mode: 'test' | 'turns' = 'test', seed = 1): Battle {
  const base = content.battleSetup('random-battle', seed, mode, { party: [], enemies: [] }, false);
  return new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
}
/** Her vuruş isabet eder, kritik yok, Lucky Escape / Resilience yok; canlar büyük. */
function sure(b: Battle, hp = 5000): Battle {
  b.debug.crit = 'never';
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  for (const c of b.combatants) c.hp = c.maxHp = hp;
  return b;
}
const crater = content.skills.ice_crater!;
const pushFx = crater.effects.find((e) => e.type === 'push') as Extract<(typeof crater.effects)[number], { type: 'push' }>;

describe('Mage kiti (Ömer 2026-10-29)', () => {
  it('Fire Bolt / Blizzard / Ice Crater / Meteor; pasif Heat Mirage; Mana Barrier ve Spell Echo verde duruyor', () => {
    expect(content.classes.mage!.skills).toEqual(['fire_bolt', 'blizzard', 'ice_crater', 'meteor']);
    expect(content.classes.mage!.passive!.id).toBe('heat_mirage');
    expect(content.skills.mana_barrier).toBeDefined();
    expect(content.classes.gambler!.passive!.effect.type).toBe('spellEcho');
  });
});

describe('Chilled', () => {
  it('Slow\'dan ayrı: hız x0.8, kaçınma x0.9, cc (boss yemez); Slow ile birlikte durur', () => {
    const def = content.statuses.chilled!;
    expect(def).toMatchObject({ name: 'Chilled', type: 'debuff', speedMult: 0.8, evasionMult: 0.9, cc: true });
    const b = sure(arena([['mage', 7]], [['warrior', 1]]));
    const foe = b.get('enemy-0')!;
    foe.stats.evasion = 0.2;
    const spd = b.speedOf(foe);
    b.debugAddStatus('enemy-0', 'chilled', 2);
    expect(b.effectiveStats(foe).evasion).toBeCloseTo(0.18, 6);
    expect(b.statusMult(foe, 'speedMult')).toBeCloseTo(0.8, 6);
    b.debugAddStatus('enemy-0', 'slow', 2);
    expect(foe.statuses.map((s) => s.kind).sort()).toEqual(['chilled', 'slow']);
    expect(b.statusMult(foe, 'speedMult')).toBeCloseTo(0.8 * 0.7, 6);
    expect(b.speedOf(foe)).toBeLessThan(spd);
    // Boss rütbesi CC bağışık: Slow gibi Chilled da işlemez
    foe.statuses = [];
    foe.tier = 'boss';
    expect(b.statusBlocked(foe, 'chilled')).toBe(true);
  });

  it('Chill Ground (storm) içinde tur başlatan Chilled alır, Ice hâlâ Slow', () => {
    // Genel zemin kuralı (Ömer 2026-10-29): zeminin ana durumu (status), içindeyken sürer
    expect(content.grounds.storm!.status).toBe('chilled');
    expect(content.grounds.ice_ground!.status).toBe('slow');
  });
});

describe('Ice Crater', () => {
  const setup = () => sure(arena([['mage', 7]], [['warrior', 4], ['warrior', 1], ['warrior', 11]]));

  it('4 yönde 1 hücre iter (sıra / şerit boyunca), hasar + Chilled', () => {
    const cases = [
      ['forward', 1],
      ['back', 7],
      ['lanePrev', 3],
      ['laneNext', 5],
    ] as const;
    for (const [dir, to] of cases) {
      const b = sure(arena([['mage', 7]], [['warrior', 4]]));
      const foe = b.get('enemy-0')!;
      const hp = foe.hp;
      const n = b.log.length;
      expect(b.useSkill('party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, undefined, dir).ok).toBe(true);
      expect(foe.slot, dir).toBe(to);
      expect(foe.hp).toBeLessThan(hp);
      expect(foe.statuses.find((s) => s.kind === 'chilled')?.turns).toBe(2);
      expect(ofType(b.log.slice(n), 'moved')[0]).toMatchObject({ actor: 'enemy-0', from: 4, to, cause: 'ice_crater', by: 'party-0' });
      expect(ofType(b.log.slice(n), 'crash')).toHaveLength(0);
    }
  });

  it('çapraz yön yok: geçersiz yön verilirse varsayılan back; yön yoksa back', () => {
    const b = sure(arena([['mage', 7]], [['warrior', 4]]));
    expect(b.useSkill('party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, undefined, 'diagonal' as never).ok).toBe(true);
    expect(b.get('enemy-0')!.slot).toBe(7);
    expect(b.pushCell(4, 'forward')).toBe(1);
    expect(b.pushCell(0, 'forward')).toBeNull();
    expect(b.pushCell(2, 'laneNext')).toBeNull();
    expect(b.pushCell(9, 'back')).toBeNull();
  });

  it('dolu hücre: itme yok, hedef ve hücredeki birim çarpma hasarı alır', () => {
    const b = setup();
    const foe = b.get('enemy-0')!;
    const other = b.get('enemy-1')!;
    const mage = b.get('party-0')!;
    const raw = Math.round(attributePower(mage.stats, pushFx.scale, f) * pushFx.crashPower);
    const otherHp = other.hp;
    const n = b.log.length;
    expect(b.useSkill('party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, undefined, 'forward').ok).toBe(true);
    expect(foe.slot).toBe(4);
    expect(other.slot).toBe(1);
    const crash = ofType(b.log.slice(n), 'crash');
    expect(crash).toEqual([{ type: 'crash', source: 'party-0', target: 'enemy-0', dir: 'forward', to: 1, wall: false, with: 'enemy-1', cause: 'ice_crater' }]);
    expect(otherHp - other.hp).toBe(b.tickDamage('ice', 'magic', raw, other));
    const hits = ofType(b.log.slice(n), 'damage').filter((d) => d.target === 'enemy-0');
    expect(hits).toHaveLength(2); // krater + çarpma
    expect(hits[1]!.amount).toBe(b.tickDamage('ice', 'magic', raw, foe));
  });

  it('tahta dışı: itme yok, yalnız hedef çarpma hasarı alır', () => {
    const b = sure(arena([['mage', 7]], [['warrior', 3]]));
    const n = b.log.length;
    b.useSkill('party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, undefined, 'lanePrev');
    expect(b.get('enemy-0')!.slot).toBe(3);
    expect(ofType(b.log.slice(n), 'crash')[0]).toMatchObject({ wall: true, to: null });
    expect(ofType(b.log.slice(n), 'damage').filter((d) => d.target === 'enemy-0')).toHaveLength(2);
  });

  it('yer değiştirme bağışık (boss) hedef itilmez ve çarpmaz; hasar alır, Chilled CC olduğu için boss\'a işlemez', () => {
    const b = setup();
    const foe = b.get('enemy-0')!;
    foe.tier = 'boss';
    const hp = foe.hp;
    const n = b.log.length;
    b.useSkill('party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, undefined, 'forward');
    expect(foe.slot).toBe(4);
    expect(foe.hp).toBeLessThan(hp);
    expect(ofType(b.log.slice(n), 'crash')).toHaveLength(0);
    expect(ofType(b.log.slice(n), 'damage').filter((d) => d.target === 'enemy-1')).toHaveLength(0);
    // Steadfast vb. de aynı kapıdan: pushOutcome immune
    expect(b.pushOutcome(foe, 'back')).toEqual({ kind: 'immune' });
  });

  it('önizleme yönü ve çarpmayı gösterir', () => {
    const b = setup();
    const p = previewSkill(b, 'party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, 'forward').find((x) => x.uid === 'enemy-0')!;
    expect(p.push).toMatchObject({ dir: 'forward', kind: 'crash', to: 1, with: 'enemy-1' });
    expect(p.push!.damage).toBeGreaterThan(0);
    expect(p.push!.withDamage).toBeGreaterThan(0);
    const q = previewSkill(b, 'party-0', 'ice_crater', 'enemy-0', undefined, undefined, undefined, 'back').find((x) => x.uid === 'enemy-0')!;
    expect(q.push).toEqual({ dir: 'back', kind: 'move', to: 7 });
  });

  it('YZ yönü kendisi seçer: çarpma ile iki birime hasarı boş kaymaya tercih eder', () => {
    const b = setup();
    const mage = b.get('party-0')!;
    // yalnız Ice Crater kullanılabilir olsun
    mage.cooldowns = { fire_bolt: 9, blizzard: 9, meteor: 9 };
    // çarpma (enemy-1'e) iki birime hasar: boş kaymaya tercih edilir
    expect(pushDirChoice(b, mage, crater, b.get('enemy-0')!).dir).toBe('forward');
    // kendi zeminimize itmek: hedefin arkasındaki boş hücrede Burning Ground
    b.ground.push({ id: 'gx', ground: 'burning', board: 'enemy', slots: [7], turns: 2, source: 'party-0', sourceSide: 'party', amount: 900 });
    expect(pushDirChoice(b, mage, crater, b.get('enemy-0')!)).toMatchObject({ dir: 'back', why: 'into our ground' });
    // bağışık hedefte değer yok
    b.get('enemy-0')!.tier = 'boss';
    expect(pushDirChoice(b, mage, crater, b.get('enemy-0')!).value).toBe(0);
    b.get('enemy-0')!.tier = undefined;
    const c = chooseAction(b, 'party-0', content.aiConfig);
    expect(c?.skillId).toBe('ice_crater');
    expect(c?.dir).toBeDefined();
  });
});

describe('Heat Mirage', () => {
  const e = content.classes.mage!.passive!.effect as Extract<NonNullable<CombatantDef['passive']>['effect'], { type: 'heatMirage' }>;

  it('yakın dövüş vuruşunda saldıranın hücresine 1 tur Burning Ground (Meteor zemin gücü)', () => {
    expect(e).toMatchObject({ type: 'heatMirage', ground: 'burning', turns: 1, scale: 'int', power: 0.361 });
    const b = sure(arena([['mage', 0]], [['warrior', 0]]));
    const n = b.log.length;
    expect(b.useSkill('enemy-0', 'melee_attack', 'party-0').ok).toBe(true);
    const g = ofType(b.log.slice(n), 'ground');
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ground: 'burning', board: 'enemy', slots: [0], turns: 1 });
    const mage = b.get('party-0')!;
    expect(b.ground.find((x) => x.id === g[0]!.id)).toMatchObject({ source: 'party-0', tickOn: 'enemy-0', amount: Math.round(attributePower(mage.stats, 'int', f) * 0.361) });
    expect(ofType(b.log.slice(n), 'passive').some((p) => p.passive === 'heat_mirage')).toBe(true);
  });

  it('uzaktan vuruşta zemin yok', () => {
    const b = sure(arena([['mage', 0]], [['archer', 6]]));
    const n = b.log.length;
    expect(b.useSkill('enemy-0', 'quick_shot', 'party-0').ok).toBe(true);
    expect(ofType(b.log.slice(n), 'ground')).toHaveLength(0);
  });

  it('Mage\'in turları arasında bir kez; Mage oynayınca yeniden açılır', () => {
    const b = sure(arena([['mage', 0]], [['warrior', 0], ['warrior', 1]]));
    const n = b.log.length;
    b.useSkill('enemy-0', 'melee_attack', 'party-0');
    b.useSkill('enemy-1', 'melee_attack', 'party-0');
    expect(ofType(b.log.slice(n), 'ground')).toHaveLength(1);
    b.useSkill('party-0', 'fire_bolt', 'enemy-0');
    const m = b.log.length;
    b.useSkill('enemy-1', 'melee_attack', 'party-0');
    expect(ofType(b.log.slice(m), 'ground')).toHaveLength(1);
  });

  it('Frost Skin: ateş ve buz hasarından %10 daha az (fizikselde yok); metin iki parçayı anlatır', () => {
    expect(e.elemResist).toEqual({ fire: 0.1, ice: 0.1 });
    const b = sure(arena([['mage', 0], ['warrior', 1]], [['mage', 7]]));
    const mage = b.get('party-0')!;
    const war = b.get('party-1')!;
    // aynı zırh: yalnız pasifin farkı kalsın
    war.stats.magicArmor = mage.stats.magicArmor;
    expect(b.damageTakenMult(mage, undefined, 'magic', null, 'fire')).toBeCloseTo(0.9 * b.damageTakenMult(war, undefined, 'magic', null, 'fire'), 6);
    expect(b.damageTakenMult(mage, undefined, 'magic', null, 'ice')).toBeCloseTo(0.9 * b.damageTakenMult(war, undefined, 'magic', null, 'ice'), 6);
    expect(b.damageTakenMult(mage, undefined, 'physical', null, 'physical')).toBeCloseTo(b.damageTakenMult(war, undefined, 'physical', null, 'physical'), 6);
    expect(b.tickDamage('fire', 'magic', 1000, mage)).toBeLessThan(b.tickDamage('fire', 'magic', 1000, war));
    const text = describePassive(content.classes.mage!.passive!, mage.stats, f);
    expect(text).toContain('melee');
    expect(text).toContain('10% less Fire and Ice damage');
  });
});
