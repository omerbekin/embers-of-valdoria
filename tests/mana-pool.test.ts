import { describe, expect, it } from 'vitest';
import { Battle, content, describeStat, previewSkill, type BattleEvent, type Combatant, type CombatantDef, type SkillDef, type SkillEffect, type UnitSetup } from '../src/engine';
import { ValueContext, DEFAULT_VALUE } from '../src/engine/ai-value';
import { skillUsesMana, usesMana } from '../src/engine/mana-pool';
import { stateHash } from '../src/net/state-hash';

// "Karakter bir kaynağı kullanmıyorsa o onda olmasın" (Ömer 2026-10-31): manayı hiçbir yolla kullanamayan birim savaşa MP havuzsuz girer.

const def = (id: string): CombatantDef => (content.summons[id] ?? content.mobs[id] ?? content.bosses[id] ?? content.classes[id])!;
type Placed = [string, number, UnitSetup?];

function arena(party: Placed[], enemies: Placed[], mode: 'test' | 'turns' = 'test', seed = 1, skills: Record<string, SkillDef> = {}): Battle {
  const base = content.battleSetup('random-battle', seed, mode, { party: [], enemies: [] }, false);
  const units = (list: Placed[]) => list.map(([, , u]) => u);
  return new Battle({
    ...base,
    skills: { ...base.skills, ...skills },
    party: party.map(([id]) => def(id)),
    partySlots: party.map(([, s]) => s),
    enemies: enemies.map(([id]) => def(id)),
    enemySlots: enemies.map(([, s]) => s),
    partyUnits: units(party),
    enemyUnits: units(enemies),
  });
}
const unit = (b: Battle, uid: string): Combatant => b.get(uid)!;
const ofType = <T extends BattleEvent['type']>(b: Battle, type: T) => b.log.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);
const noPool = (c: Combatant) => {
  expect(c.maxMp).toBe(0);
  expect(c.mp).toBe(0);
  expect(c.stats.mp).toBe(0);
  expect(c.stats.mpRegen).toBe(0);
};
const priced = (id: string, amount: number): SkillDef => ({ ...content.skills[id]!, cost: { resource: 'mp', amount } });

describe('kullanılmayan mana yok: kim etkilenir', () => {
  it('hiçbir gerçek kahramanın manası gitmez', () => {
    for (const d of Object.values(content.classes)) {
      if (d.testOnly) continue;
      const c = unit(arena([[d.id, 0]], [['skeleton', 0]]), 'party-0');
      expect(c.maxMp, d.id).toBeGreaterThan(0);
      expect(c.mp, d.id).toBe(c.maxMp);
    }
  });

  it('verisinde MP olup savaşta havuzu kalkan birim listesi bilinçli değişir', () => {
    const all = { ...content.mobs, ...content.bosses, ...content.summons };
    const dropped = Object.values(all)
      .filter((d) => d.stats.mp > 0 && unit(arena([['warrior', 0]], [[d.id, 0]]), 'enemy-0').maxMp === 0)
      .map((d) => d.id)
      .sort();
    expect(dropped).toEqual(['clan_stormcaller', 'clan_vaulter', 'hollow_delver', 'risen_skeleton', 'slagcart_golem', 'stormhorn_ram', 'thunderwright', 'weir_wyrm']);
  });

  it('MP harcayan mob etkilenmez', () => {
    const c = unit(arena([['warrior', 0]], [['thane_of_the_deep', 0]]), 'enemy-0');
    expect(c.maxMp).toBe(def('thane_of_the_deep').stats.mp);
    expect(c.maxMp).toBeGreaterThan(0);
  });

  it('mana harcayan birim aynen kalır; verilen başlangıç MP oranı işler', () => {
    const b = arena([['mage', 0, { startMpRatio: 0.5 }]], [['risen_skeleton', 0, { startMp: 20 }]]);
    const m = unit(b, 'party-0');
    expect(m.maxMp).toBe(def('mage').stats.mp);
    expect(m.mp).toBe(Math.round(m.maxMp * 0.5));
    expect(m.stats.mpRegen).toBe(def('mage').stats.mpRegen);
    noPool(unit(b, 'enemy-0')); // başlangıç MP'si havuz açmaz
  });
});

describe('usesMana: MP kullanan her yol sayılır', () => {
  const skeletonWith = (u: UnitSetup) => unit(arena([['warrior', 0]], [['risen_skeleton', 0, u]]), 'enemy-0');
  const SK = def('risen_skeleton').skills[0]!;

  it('skill bedeli biçimleri', () => {
    const base = content.skills[SK]!;
    expect(skillUsesMana(base)).toBe(false);
    expect(skillUsesMana(priced(SK, 1))).toBe(true);
    expect(skillUsesMana({ ...base, cost: { resource: 'mp', amount: 0, spendAll: true } })).toBe(true);
    expect(skillUsesMana({ ...base, cost: { resource: 'mp', amount: 0, ofCurrent: 0.5 } })).toBe(true);
    expect(skillUsesMana({ ...base, cost: { resource: 'rage', amount: 10 } })).toBe(false);
    expect(skillUsesMana({ ...base, cost: { resource: 'hp', amount: 10 } })).toBe(false);
    expect(skillUsesMana({ ...base, effects: [{ type: 'shield', scale: 'int', power: 1, bonusPerMana: 0.5 } as SkillEffect] })).toBe(true);
  });

  it('ağaç yaması MP bedeli koyarsa birim MP kalır', () => {
    const c = skeletonWith({ tree: { skills: { [SK]: priced(SK, 5) } } });
    expect(c.maxMp).toBeGreaterThan(0);
    expect(c.mp).toBe(c.maxMp);
  });

  it('ağaç biçimi MP bedeli koyarsa birim MP kalır', () => {
    const c = skeletonWith({ tree: { modes: { [SK]: { keepBase: true, list: [{ id: 'x', node: 'n', skill: priced(SK, 5) }] } } } as never });
    expect(c.maxMp).toBeGreaterThan(0);
  });

  it('item etkisi Mana kalkanı manayı kullanır', () => {
    expect(skeletonWith({ itemEffects: { manaShield: 0.2 } }).maxMp).toBeGreaterThan(0);
  });

  it('MP pasifi manayı kullanır; tanımı olmayan skill şüphede MP bırakır', () => {
    const skel = unit(arena([['warrior', 0]], [['skeleton', 0]]), 'enemy-0');
    const skills = content.skills as Record<string, SkillDef>;
    expect(usesMana(skel, skills)).toBe(false);
    expect(usesMana({ ...skel, passive: { id: 'p', name: 'P', text: '', effect: { type: 'deepHoard', mpRatio: 0.5 } } } as unknown as Combatant, skills)).toBe(true);
    expect(usesMana({ ...skel, skills: ['no_such_skill'] }, skills)).toBe(true);
  });
});

describe('MP havuzu olmayan birim savaşta', () => {
  it('Risen Skeleton bedava skill\'ini kullanır', () => {
    const b = arena([['warrior', 0]], [['risen_skeleton', 0]]);
    const sk = unit(b, 'enemy-0');
    noPool(sk);
    expect(sk.skills.every((id) => b.skill(id, sk)!.cost.amount === 0)).toBe(true);
    expect(b.canUse(sk.uid, sk.skills[0]!).ok).toBe(true);
  });

  it('savaşta çağrılan Treant havuzsuz doğar, olayındaki kopya da', () => {
    const b = arena([['druid', 0]], [['warrior', 0]]);
    const skill = Object.values(content.skills).find((s) => def('druid').skills.includes(s.id) && s.effects.some((e) => e.type === 'summon' && e.unit === 'treant'))!;
    const r = b.useSkill('party-0', skill.id, undefined, 1);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const ev = ofType(b, 'summon').at(-1)!;
    expect(ev.combatant.maxMp).toBe(0);
    noPool(unit(b, ev.combatant.uid));
  });

  it('verisinde MP olsa bile MP kullanmayan çağrı havuzsuz doğar', () => {
    const base = content.battleSetup('random-battle', 1, 'test', { party: [], enemies: [] }, false);
    const treant = base.units.treant!;
    const units = { ...base.units, treant: { ...treant, stats: { ...treant.stats, mp: 30, mpRegen: 3 } } };
    const b = new Battle({ ...base, units, party: [def('druid')], partySlots: [0], enemies: [def('warrior')], enemySlots: [0] });
    const skill = Object.values(content.skills).find((s) => def('druid').skills.includes(s.id) && s.effects.some((e) => e.type === 'summon' && e.unit === 'treant'))!;
    expect(b.useSkill('party-0', skill.id, undefined, 1).ok).toBe(true);
    const ev = ofType(b, 'summon').at(-1)!;
    noPool(unit(b, ev.combatant.uid));
  });

  it('Mana Steal: yakma yok, Anti-Mage MP kazanmaz, boşalma zarı atılmaz', () => {
    const b = arena([['antimage', 0]], [['risen_skeleton', 0]]);
    const am = unit(b, 'party-0');
    const sk = unit(b, 'enemy-0');
    const price = content.skills.mana_burn!.cost.amount;
    sk.hp = sk.maxHp = 50000;
    let hit = false;
    for (let i = 0; i < 30 && !hit; i++) {
      am.cooldowns.mana_burn = 0;
      am.mp = price;
      expect(b.useSkill(am.uid, 'mana_burn', sk.uid).ok).toBe(true);
      hit = sk.statuses.some((s) => s.kind === 'ley_thread');
      if (hit) expect(am.mp).toBe(0); // bedeli ödedi, geri kazanç yok
    }
    expect(hit).toBe(true); // iplik manadan bağımsız kalır (ek ödül yok: YZ değeri aşağıda)
    expect(ofType(b, 'manaBurn')).toHaveLength(0);
    expect(ofType(b, 'emptyProc')).toHaveLength(0);
    noPool(sk);
  });

  it('boş mana kuralı (onEmpty) tetiklenmez, önizleme de yakma göstermez', () => {
    const steal: SkillDef = { ...content.skills.mana_burn!, effects: [{ type: 'manaBurn', amount: 5, onEmpty: { chance: 1, status: 'silence', turns: 2 } }] };
    const b = arena([['antimage', 0]], [['risen_skeleton', 0]], 'test', 1, { mana_burn: steal });
    const sk = unit(b, 'enemy-0');
    const p = previewSkill(b, 'party-0', 'mana_burn', sk.uid).find((e) => e.uid === sk.uid);
    expect(p?.burn ?? 0).toBe(0);
    expect(p?.emptyProc).toBeUndefined();
    expect(b.useSkill('party-0', 'mana_burn', sk.uid).ok).toBe(true);
    expect(ofType(b, 'emptyProc')).toHaveLength(0);
    expect(sk.statuses.some((s) => s.kind === 'silence')).toBe(false);
  });

  it('MP veren etkiler 0 bırakır: tur yenilenmesi, item etkisi; Rest kapalı', () => {
    const b = arena([['warrior', 0]], [['risen_skeleton', 0, { itemEffects: { turnMp: { mp: 9, above: 0 }, critMp: 9, manaLeech: 1, killMp: 9 } }]], 'turns', 3);
    const sk = unit(b, 'enemy-0');
    noPool(sk);
    expect(b.mpRoom(sk)).toBe(0);
    for (const c of b.combatants) c.hp = c.maxHp = 50000;
    let turns = 0;
    for (let i = 0; i < 12 && !b.winner; i++) {
      if (b.currentUid === sk.uid) {
        turns++;
        const r = b.useGlobal(sk.uid, 'rest');
        expect(r.ok).toBe(false);
      }
      b.skipTurn();
    }
    expect(turns).toBeGreaterThan(0);
    expect(ofType(b, 'mpRegen').filter((e) => e.actor === sk.uid)).toHaveLength(0);
    noPool(sk);
  });

  it('Ley Brand (madde 444): tainted havuz açılır, MP kazanamaz', () => {
    const b = arena([['antimage', 0]], [['risen_skeleton', 0]]);
    const am = unit(b, 'party-0');
    const sk = unit(b, 'enemy-0');
    am.mp = am.maxMp;
    const r = b.useSkill(am.uid, 'drain_field', undefined, sk.slot, 'enemy');
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(sk.taint).toBeGreaterThan(0);
    expect(sk.maxMp).toBe(sk.taint);
    expect(b.mpRoom(sk)).toBe(0);
  });

  it('determinizm: aynı seed aynı durum özeti, NaN yok', () => {
    const run = () => {
      const b = arena([['antimage', 0], ['mage', 1]], [['risen_skeleton', 0], ['skeleton', 1]], 'turns', 7);
      for (let i = 0; i < 10 && !b.winner; i++) b.skipTurn();
      for (const c of b.combatants) expect(Number.isFinite(c.mp) && Number.isFinite(c.maxMp)).toBe(true);
      return stateHash(b);
    };
    expect(run()).toBe(run());
  });
});

describe('YZ: mana değeri', () => {
  it('yakma, MP kazancı ve susturma MP havuzsuz birimde değersiz; MP\'li birimde değerli', () => {
    const b = arena([['antimage', 0]], [['skeleton', 0], ['mage', 1]]);
    const ctx = new ValueContext(b, unit(b, 'party-0'), { ...DEFAULT_VALUE, ...content.aiConfig.value }, () => 'lowest_hp');
    const sk = unit(b, 'enemy-0');
    expect(ctx.manaDenial(sk, 30)).toBe(0);
    expect(ctx.manaGain(sk, 30)).toBe(0);
    expect(ctx.silenceDenial(sk, 0, 2)).toBe(0);
    expect(ctx.manaDenial(unit(b, 'enemy-1'), 30)).toBeGreaterThan(0);
  });
});

describe('Ekran metni', () => {
  it('Intelligence ipucunda MP havuzsuz birime MP satırı yok', () => {
    const b = arena([['warrior', 0]], [['skeleton', 0]]);
    const has = (c: Combatant) => describeStat('int', c.stats, content.formulas).lines.some((l) => /MP/.test(l));
    expect(has(unit(b, 'enemy-0'))).toBe(false);
    expect(has(unit(b, 'party-0'))).toBe(true);
  });
});
