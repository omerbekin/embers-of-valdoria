import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, explainChoice } from '../src/engine';
import type { BattleEvent, Combatant, GroundEffect, PassiveEffect, Teams } from '../src/engine';
import { rangeOff } from './range-helpers';

// Harita 2 boss / elit kuralları (Ömer onayı 2026-10-27; maps-2-3.md 3.3 + 5 M-B; open-questions 437): skill suyu = Tide suyu, Slick Hide, Weir-Wyrm faz 2
// Surge kadansı, Harpoon Ballista'nın kendi atışı, Crown of Salt, Deathless Tide x2, Drowned Champion'ın faz 3 dirilişi; YZ Saltbound / Spellbound değeri.
// Sayılar veriden okunur.

type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const def = (id: string) => content.mobs[id] ?? content.bosses[id]!;
const effectOf = <T extends PassiveEffect['type']>(id: string, type: T) => {
  const e = def(id).passive!.effect;
  expect(e.type, id).toBe(type);
  return e as Extract<PassiveEffect, { type: T }>;
};
const make = (teams: Teams, mode: 'turns' | 'test' = 'test', seed = 1) => new Battle(rangeOff(content.battleSetup('random-battle', seed, mode, teams, false)));
const PARTY = cells({ 0: 'warrior', 1: 'defender', 6: 'mage', 8: 'archer' });
/** Her vuruş isabet eder, kritik yok. */
function sure(b: Battle): Battle {
  b.debug.crit = 'never';
  b.debug.dodge = 'never';
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  return b;
}
const byDef = (b: Battle, id: string): Combatant => b.combatants.find((c) => c.defId === id && !c.removed)!;
let gid = 0;
const water = (b: Battle, board: 'party' | 'enemy', slots: number[], ground = 'flooded'): GroundEffect => {
  const g: GroundEffect = { id: `t${gid++}`, ground, board, slots, turns: 3, source: 'enemy-0', sourceSide: 'enemy', amount: 0, noDamage: true };
  b.ground.push(g);
  return g;
};
const flooded = content.grounds.flooded!;
/** Test modu eylemi: birimin ilk kullanılabilir skill'i, `avoid` dışındaki ilk geçerli hedefe. */
function hitSomeone(b: Battle, uid: string, avoid: string[] = []): void {
  const u = b.get(uid)!;
  for (const s of u.skills) {
    if (!b.canUse(uid, s).ok) continue;
    const t = b.validTargets(uid, s).find((c) => !avoid.includes(c.uid));
    if (t && b.useSkill(uid, s, t.uid, t.slot).ok) return;
  }
  throw new Error('no action for ' + uid);
}

describe('Skill suyu = Tide suyu (M-B, birleşik Flooded)', () => {
  it('grounds.json flooded kendi ıslatma kuralını taşır; skill suyu bırakan skill\'lerde ayrı Soaked etkisi yok', () => {
    expect(flooded.soak).toBe('soaked');
    expect(flooded.soakTurns).toBeGreaterThan(0);
    for (const s of Object.values(content.skills)) {
      if (!s.effects.some((e) => e.type === 'ground' && e.ground === 'flooded')) continue;
      expect(s.effects.some((e) => e.type === 'status' && (e.status as string) === flooded.soak), s.id).toBe(false);
    }
  });

  for (const mode of ['test', 'turns'] as const) {
    it(`kuralsız savaşta skill suyu içindekileri ıslatır ve Burning ground'u söndürür (${mode})`, () => {
      const b = sure(make({ party: PARTY, enemies: cells({ 1: 'salt_hag_mother' }), units: { enemies: { 1: { tier: 'elite' } } } }, mode));
      const hag = byDef(b, 'salt_hag_mother');
      const burning = water(b, 'party', [0, 1, 2], 'burning');
      burning.noDamage = false;
      burning.amount = 3;
      const t = b.validTargets(hag.uid, 'call_the_tide').find((c) => c.slot === 0)!;
      const n = b.log.length;
      if (mode === 'turns') b.currentUid = hag.uid; // sıranın hag'a geldiğini varsay (yalnızca etki sınanır)
      expect(b.useSkill(hag.uid, 'call_the_tide', t.uid, t.slot).ok).toBe(true);
      const w = b.ground.find((g) => g.ground === 'flooded' && g.board === 'party')!;
      expect(w).toBeDefined();
      for (const c of b.combatants.filter((x) => x.side === 'party' && x.hp > 0)) {
        const st = c.statuses.find((s) => (s.kind as string) === flooded.soak);
        if (w.slots.includes(c.slot)) expect(st?.turns, c.defId).toBe(flooded.soakTurns);
        else expect(st, c.defId).toBeUndefined();
      }
      // söndürme: suyla çakışan Burning hücreleri kalkar
      const left = b.ground.filter((g) => g.ground === 'burning').flatMap((g) => g.slots);
      expect(left.some((s) => w.slots.includes(s))).toBe(false);
      expect(ofType(b.log.slice(n), 'groundEnd').length).toBeGreaterThan(0);
    });
  }

  it('suya sonradan giren birim eylem sonunda ıslanır; Burning durumu söner (kuralsız savaş)', () => {
    const b = sure(make({ party: PARTY, enemies: cells({ 0: 'drowned' }) }));
    water(b, 'party', [3]);
    const mage = byDef(b, 'mage');
    mage.statuses.push({ kind: 'burning', turns: 2, source: 'enemy-0' });
    expect(b.useGlobal(mage.uid, 'move_tile', 3).ok).toBe(true);
    expect(mage.slot).toBe(3);
    expect(mage.statuses.some((s) => (s.kind as string) === flooded.soak)).toBe(true);
    expect(mage.statuses.some((s) => s.kind === 'burning')).toBe(false);
  });

  it('telgraf suyu (High Tide) çözülünce hasarsızdır ve ıslatır', () => {
    const b = sure(make({ party: PARTY, enemies: cells({ 4: 'drowned_queen' }), units: { enemies: { 4: { tier: 'boss' } } } }));
    const q = byDef(b, 'drowned_queen');
    const t = b.validTargets(q.uid, 'high_tide').find((c) => c.defId === 'warrior')!;
    expect(b.useSkill(q.uid, 'high_tide', t.uid, t.slot).ok).toBe(true);
    expect(b.telegraphs.length).toBe(1);
    hitSomeone(b, q.uid); // test modu: sonraki eylemden önce çözülür
    const w = b.ground.find((g) => g.ground === 'flooded')!;
    expect(w.noDamage).toBe(true);
    const warrior = byDef(b, 'warrior');
    expect(warrior.statuses.some((s) => (s.kind as string) === flooded.soak)).toBe(true);
  });
});

describe('Weir-Wyrm Slick Hide', () => {
  it('Flooded hücredeyken alınan fiziksel hasar x physicalTakenMult; büyü ve kuru hücre etkilenmez', () => {
    const e = effectOf('weir_wyrm', 'slickHide');
    const b = make({ party: PARTY, enemies: cells({ 1: 'weir_wyrm' }), units: { enemies: { 1: { tier: 'boss' } } } });
    const w = byDef(b, 'weir_wyrm');
    const war = byDef(b, 'warrior');
    const dryP = b.damageTakenMult(w, war, 'physical');
    const dryM = b.damageTakenMult(w, war, 'magic');
    water(b, 'enemy', [w.slot]);
    expect(b.damageTakenMult(w, war, 'physical')).toBeCloseTo(dryP * e.physicalTakenMult, 6);
    expect(b.damageTakenMult(w, war, 'magic')).toBeCloseTo(dryM, 6);
    expect(describePassive(def('weir_wyrm').passive!, def('weir_wyrm').stats, content.formulas)).toContain('physical damage');
  });
});

describe('Weir-Wyrm faz 2: Surge her 2 turda', () => {
  const ph = def('weir_wyrm').boss!.phases![0]!;
  it('faz verisi Surge bekleme süresini değiştirir; faz 1 skill verisi', () => {
    expect(ph.cooldowns?.wyrm_surge).toBe(2);
    expect(ph.cadence).toContain('wyrm_surge');
    const b = make({ party: PARTY, enemies: cells({ 1: 'weir_wyrm' }), units: { enemies: { 1: { tier: 'boss' } } } }, 'turns');
    const w = byDef(b, 'weir_wyrm');
    const surge = content.skills.wyrm_surge!;
    expect(b.cooldownFor(w, surge)).toBe(surge.cooldown);
    w.phase = 2;
    expect(b.cooldownFor(w, surge)).toBe(2);
    w.phase = 3;
    expect(b.cooldownFor(w, surge)).toBe(2); // sonraki faz değiştirmezse önceki fazınki sürer
  });

  it('turns: faz 2\'de Surge kullanılınca bekleme 2; YZ hazır olunca hep Surge seçer', () => {
    const b = make({ party: PARTY, enemies: cells({ 1: 'weir_wyrm' }), units: { enemies: { 1: { tier: 'boss' } } } }, 'turns');
    const w = byDef(b, 'weir_wyrm');
    w.phase = 2;
    const used: number[] = [];
    let turns = 0;
    for (let n = 0; n < 300 && !b.winner && turns < 8; n++) {
      const uid = b.currentActor?.uid;
      if (!uid) break;
      for (const c of b.combatants) if (c.side === 'party') c.hp = c.maxHp; // savaş sürsün
      const c = chooseAction(b, uid, content.aiConfig);
      if (uid === w.uid) {
        if (c?.skillId === 'wyrm_surge') {
          used.push(turns);
          expect(b.useSkill(uid, 'wyrm_surge', c.targetUid, c.slot).ok).toBe(true);
          expect(w.cooldowns.wyrm_surge).toBe(2);
          turns++;
          continue;
        }
        expect(b.canUse(uid, 'wyrm_surge').ok, `turn ${turns}`).toBe(false); // hazırken başka hamle yok
        turns++;
      }
      if (!b.applyChoice(uid, c).ok) break;
    }
    expect(used.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Admiral Vane: Harpoon Ballista kendi atar', () => {
  const vane = def('admiral_vane');
  const teams: Teams = { party: PARTY, enemies: cells({ 4: 'admiral_vane', 3: 'harpoon_ballista' }), units: { enemies: { 4: { tier: 'boss' } } } };
  it('veri: Vane\'in kitinde Harpoon Line yok; bağlı nesne harpoon_ballista, atışı harpoon_line (telgraflı tek hücre)', () => {
    expect(vane.skills).not.toContain('harpoon_line');
    expect(vane.boss!.anchor).toMatchObject({ unit: 'harpoon_ballista', strike: 'harpoon_line' });
    expect(content.bosses.harpoon_ballista!.inert).toBe(true);
    expect(content.skills.harpoon_line!.telegraph?.kind).toBe('area');
  });

  it('turns: Vane\'in tur başında Ballista en düşük canlı kahramanın hücresini telgraflar, sonraki turunda çözer; kırılınca bekleyen atış iptal', () => {
    const b = sure(make(teams, 'turns', 3));
    const v = byDef(b, 'admiral_vane');
    const bal = byDef(b, 'harpoon_ballista');
    const mage = byDef(b, 'mage');
    mage.hp = 5; // en düşük can
    bal.hp = bal.maxHp = 5000; // YZ kırmasın
    let marked = false;
    let resolved = false;
    for (let n = 0; n < 200 && !b.winner && !resolved; n++) {
      const uid = b.currentActor?.uid;
      if (!uid) break;
      const before = b.log.length;
      for (const c of b.combatants) if (c.side === 'party' && c.hp > 0 && c !== mage) c.hp = c.maxHp; // savaş sürsün
      if (!b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
      void v;
      const ev = b.log.slice(before);
      const tg = ofType(ev, 'telegraph').find((t) => t.source === bal.uid);
      if (tg) {
        expect(tg.skill).toBe('harpoon_line');
        const weakest = b.combatants.filter((c) => c.side === 'party' && c.hp > 0).sort((x, y) => x.hp + x.shield - (y.hp + y.shield) || x.slot - y.slot)[0]!;
        expect(tg.cells).toEqual([weakest.slot]);
        marked = true;
      }
      if (ofType(ev, 'telegraphResolve').some((t) => t.source === bal.uid)) resolved = true;
    }
    expect(marked).toBe(true);
    expect(resolved).toBe(true);
    // yeni atış bekliyor; Ballista kırılınca iptal olur
    expect(b.telegraphs.some((t) => t.source === bal.uid)).toBe(true);
    const n = b.log.length;
    b.debugKill(bal.uid);
    expect(ofType(b.log.slice(n), 'telegraphCancel').some((t) => t.source === bal.uid)).toBe(true);
    expect(b.telegraphs.some((t) => t.source === bal.uid)).toBe(false);
  });

  it('test modu: Vane\'in her eyleminden önce Ballista atışını çözer ve yenisini işaretler', () => {
    const b = sure(make(teams, 'test', 3));
    const v = byDef(b, 'admiral_vane');
    const bal = byDef(b, 'harpoon_ballista');
    const war = byDef(b, 'warrior');
    for (const c of b.combatants) if (c.side === 'party' && c !== war) c.hp = c.maxHp;
    war.hp = 30;
    const hp = war.hp;
    hitSomeone(b, v.uid, [war.uid]);
    expect(b.telegraphs.find((t) => t.source === bal.uid)?.cells).toEqual([war.slot]);
    hitSomeone(b, war.uid);
    const n = b.log.length;
    hitSomeone(b, v.uid, [war.uid]);
    expect(ofType(b.log.slice(n), 'telegraphResolve').find((t) => t.source === bal.uid)?.hit).toContain(war.uid);
    expect(war.hp).toBeLessThan(hp);
  });
});

describe('Drowned Queen Crown of Salt', () => {
  it('iki tahtadaki her Flooded hücre alınan hasarı perCell azaltır (toplamsal)', () => {
    const e = effectOf('drowned_queen', 'crownOfSalt');
    const b = make({ party: PARTY, enemies: cells({ 4: 'drowned_queen' }), units: { enemies: { 4: { tier: 'boss' } } } });
    const q = byDef(b, 'drowned_queen');
    const war = byDef(b, 'warrior');
    const base = b.damageTakenMult(q, war, 'physical');
    water(b, 'party', [0, 1, 2]);
    water(b, 'enemy', [0, 1]);
    water(b, 'enemy', [1]); // aynı hücre iki kez sayılmaz
    expect(b.groundCellCount('flooded')).toBe(5);
    expect(b.damageTakenMult(q, war, 'physical')).toBeCloseTo(base * (1 - 5 * e.perCell), 6);
    expect(b.damageTakenMult(q, war, 'magic')).toBeCloseTo(b.damageTakenMult(q, war, 'magic'), 6);
  });

  it('YZ: Queen için yeni su hücresi Crown of Salt koruma değeri taşır (High Tide adayı)', () => {
    const b = make({ party: PARTY, enemies: cells({ 4: 'drowned_queen', 1: 'drowned_champion' }), units: { enemies: { 4: { tier: 'boss' } } } });
    const q = byDef(b, 'drowned_queen');
    const ex = explainChoice(b, q.uid, content.aiConfig)!;
    const tide = ex.candidates.filter((c) => c.skill === 'high_tide');
    expect(tide.length).toBeGreaterThan(0);
    expect(Math.max(...tide.map((c) => c.mitigation ?? 0))).toBeGreaterThan(0);
  });
});

describe('Drowned Champion: Deathless Tide x2', () => {
  it('Flooded hücrede iki kez %hpRatio canla kalkar, üçüncüde ölür', () => {
    const e = effectOf('drowned_champion', 'deathlessTide');
    expect(e.uses).toBe(2);
    const b = sure(make({ party: PARTY, enemies: cells({ 0: 'drowned_champion' }) }));
    const ch = byDef(b, 'drowned_champion');
    water(b, 'enemy', [ch.slot]);
    const war = byDef(b, 'warrior');
    const hit = () => {
      ch.hp = 1;
      ch.shield = 0;
      expect(b.useSkill(war.uid, content.classes.warrior!.skills[0]!, ch.uid).ok).toBe(true);
    };
    hit();
    expect(ch.hp).toBeGreaterThan(1); // kalktı (maks canın hpRatio'su; ek vuruş düşebilir)
    hit();
    expect(ch.hp).toBeGreaterThan(1); // kalktı (maks canın hpRatio'su; ek vuruş düşebilir)
    hit();
    expect(ch.hp).toBe(0);
    expect(ofType(b.log, 'passive').filter((p) => p.actor === ch.uid && p.passive === def('drowned_champion').passive!.id).length).toBe(2);
    expect(describePassive(def('drowned_champion').passive!, def('drowned_champion').stats, content.formulas)).toMatch(/^Twice per battle/);
  });
});

describe('Drowned Queen faz 3: Drowned Champion yeniden kalkar', () => {
  const rule = def('drowned_queen').boss!.phases![1]!.riseAllies!;
  const cross = (b: Battle, q: Combatant) => {
    q.phase = 2;
    q.hp = Math.round(q.maxHp * def('drowned_queen').boss!.phases![1]!.at) + 1;
    q.shield = q.magicShield = 0;
    const arc = byDef(b, 'archer'); // menzilli: önde Champion dursa da Queen'e ulaşır
    expect(b.useSkill(arc.uid, content.classes.archer!.skills[0]!, q.uid).ok).toBe(true);
    expect(q.phase).toBe(3);
  };
  it('veri: faz 3 riseAllies drowned_champion', () => {
    expect(rule.unit).toBe('drowned_champion');
    expect(rule.hpRatio).toBeGreaterThan(0);
  });

  for (const mode of ['test', 'turns'] as const) {
    it(`cesedi tahtadaki Champion yerinde dirilir (${mode})`, () => {
      const b = sure(make({ party: PARTY, enemies: cells({ 4: 'drowned_queen', 1: 'drowned_champion' }), units: { enemies: { 4: { tier: 'boss' } } } }, mode));
      const q = byDef(b, 'drowned_queen');
      const ch = byDef(b, 'drowned_champion');
      b.debugKill(ch.uid);
      expect(ch.hp).toBe(0);
      const n = b.log.length;
      if (mode === 'turns') b.currentUid = byDef(b, 'archer').uid;
      cross(b, q);
      const rv = ofType(b.log.slice(n), 'revive').find((r) => r.target === ch.uid);
      expect(rv?.cause).toBe('rise');
      expect(ch.hp).toBe(Math.round(ch.maxHp * rule.hpRatio));
      expect(ch.slot).toBe(1);
    });
  }

  it('canlı Champion varken kimse kalkmaz', () => {
    const b = sure(make({ party: PARTY, enemies: cells({ 4: 'drowned_queen', 1: 'drowned_champion' }), units: { enemies: { 4: { tier: 'boss' } } } }));
    const q = byDef(b, 'drowned_queen');
    const n = b.log.length;
    cross(b, q);
    expect(ofType(b.log.slice(n), 'revive').length).toBe(0);
    expect(ofType(b.log.slice(n), 'reinforce').length).toBe(0);
  });

  it('önceki dalgada düşüp savaştan çıkan Champion takviye olarak yeniden girer', () => {
    const b = sure(make({ party: PARTY, enemies: cells({ 1: 'drowned_champion' }), waves: [{ enemies: cells({ 4: 'drowned_queen' }), units: { 4: { tier: 'boss' } } }] }));
    const ch = byDef(b, 'drowned_champion');
    b.debugKill(ch.uid);
    expect(b.waveIndex).toBe(1);
    expect(ch.removed).toBe(true);
    const q = byDef(b, 'drowned_queen');
    const n = b.log.length;
    cross(b, q);
    const rf = ofType(b.log.slice(n), 'reinforce')[0];
    expect(rf?.combatants.map((c) => c.defId)).toEqual(['drowned_champion']);
    const fresh = b.get(rf!.combatants[0]!.uid)!;
    expect(fresh.hp).toBe(Math.round(fresh.maxHp * rule.hpRatio));
  });
});

describe('YZ: Saltbound / Spellbound skill\'lerini kullanır', () => {
  it('Salt Circle, Debtor\'s Chain YZ savaşlarında seçilir (belirleyici)', () => {
    const owners: Record<string, string> = { salt_circle: 'salt_hag_mother', debtors_chain: 'guild_enforcer_bastion' };
    const DENSE = cells({ 0: 'warrior', 1: 'defender', 3: 'mage', 4: 'archer' });
    const MIXED = cells({ 0: 'paladin', 2: 'cutthroat', 6: 'hexer', 7: 'druid' });
    for (const [skill, id] of Object.entries(owners)) {
      let used = 0;
      for (const seed of [21, 22, 23, 24, 25, 26]) {
        const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, seed, 'turns', { party: seed % 2 ? DENSE : MIXED, enemies: cells({ 1: id, 4: 'drowned', 6: 'siren' }), units: { enemies: { 1: { tier: 'elite' } } } }, false));
        const u = byDef(b, id);
        u.maxHp = u.hp = 2000;
        for (let n = 0; n < 400 && !b.winner; n++) {
          const uid = b.currentActor?.uid;
          if (!uid || !b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
        }
        used += b.log.filter((e) => e.type === 'skillUsed' && e.actor === u.uid && e.skill === skill).length;
      }
      expect(used, skill).toBeGreaterThan(0);
    }
  });

  it('Saltbound pin değeri: dostlar hedefe vurabildikçe Siren\'s Call kontrol değeri artar', () => {
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, 22, 'turns', { party: cells({ 0: 'paladin', 2: 'cutthroat', 6: 'hexer', 7: 'druid' }), enemies: cells({ 1: 'siren_queen', 4: 'drowned', 6: 'siren' }), units: { enemies: { 1: { tier: 'elite' } } } }, false));
    const u = byDef(b, 'siren_queen');
    for (let n = 0; n < 50 && b.currentActor?.uid !== u.uid; n++) b.applyChoice(b.currentActor!.uid, chooseAction(b, b.currentActor!.uid, content.aiConfig));
    expect(b.currentActor?.uid).toBe(u.uid);
    const control = (pin: number) => {
      const ds = { ...content.aiConfig.value!.debuffShare, pin };
      const ex = explainChoice(b, u.uid, content.aiConfig, { value: { debuffShare: ds } as never })!;
      return Math.max(...ex.candidates.filter((c) => c.skill === 'sirens_call').map((c) => (c.terms as Record<string, number>).control ?? 0));
    };
    expect(content.aiConfig.value!.debuffShare!.pin).toBeGreaterThan(0);
    expect(control(content.aiConfig.value!.debuffShare!.pin!)).toBeGreaterThan(control(0) + 1);
  });
});
