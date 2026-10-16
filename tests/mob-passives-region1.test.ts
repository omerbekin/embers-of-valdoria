import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive } from '../src/engine';
import type { BattleEvent, Combatant, CombatantDef, PassiveEffect } from '../src/engine';
import { battlePlan, chapterEnemyMods, CONFIG, debugTeleport, ENCOUNTERS, newCampaign, withDifficulty } from '../src/campaign';

// Bölge I (tutorial) mob pasifleri YM14-YM19 ve doğrulama maddeleri D7-D9 (docs/design/campaign/mob-plan.md 9.3 / 9.8; Ömer onayı 2026-10-16).
// Sayılar veriden okunur (data/mobs, data/skills.json).

const unitDef = (id: string): CombatantDef => (content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const effectOf = <T extends PassiveEffect['type']>(mob: string, type: T) => {
  const e = content.mobs[mob]!.passive!.effect;
  expect(e.type, mob).toBe(type);
  return e as Extract<PassiveEffect, { type: T }>;
};

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
const unit = (b: Battle, uid: string): Combatant => b.get(uid)!;
const since = (b: Battle, n: number) => b.log.slice(n);
/** Tek vuruşun hedefe verdiği hasar (son skill'in damage olayları). */
const hitOn = (b: Battle, n: number, target: string) => ofType(since(b, n), 'damage').filter((x) => x.target === target).reduce((t, x) => t + x.amount, 0);

describe('YM14 Grudge (Road Thug)', () => {
  it('temel saldırı (Cudgel), ona en son skill ile vuran kahramana +bonus; başka skill çarpılmaz; kin yeni vurana geçer', () => {
    const e = effectOf('road_thug', 'grudge');
    expect(content.mobs.road_thug!.skills[0]).toBe(e.skill);
    const b = sure(arena([['archer', 1], ['mage', 7]], [['road_thug', 1]]));
    const thug = unit(b, 'enemy-0');
    const cudgel = content.skills[e.skill]!;
    const hamstring = content.skills.hamstring!;
    expect(b.dealtDamageMult(thug, unit(b, 'party-0'), cudgel)).toBe(1);
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(thug.grudgeOn).toBe('party-0');
    expect(b.dealtDamageMult(thug, unit(b, 'party-0'), cudgel)).toBeCloseTo(1 + e.bonus, 10);
    expect(b.dealtDamageMult(thug, unit(b, 'party-0'), hamstring)).toBe(1);
    expect(b.dealtDamageMult(thug, unit(b, 'party-1'), cudgel)).toBe(1);
    b.useSkill('party-1', 'fire_bolt', 'enemy-0');
    expect(thug.grudgeOn).toBe('party-1');
    expect(b.dealtDamageMult(thug, unit(b, 'party-0'), cudgel)).toBe(1);
  });

  it('gerçek vuruş da çarpılır (aynı seed, kinli / kinsiz)', () => {
    const hit = (grudge: boolean) => {
      const b = sure(arena([['archer', 1]], [['road_thug', 1]]));
      if (grudge) unit(b, 'enemy-0').grudgeOn = 'party-0';
      const n = b.log.length;
      b.useSkill('enemy-0', 'cudgel', 'party-0');
      return hitOn(b, n, 'party-0');
    };
    const bonus = effectOf('road_thug', 'grudge').bonus;
    expect(Math.abs(hit(true) - hit(false) * (1 + bonus))).toBeLessThanOrEqual(1);
  });
});

describe('YM15 Head Start (Cutpurse)', () => {
  it('turns modunda savaş başında hız desteği: daha hızlı kahramandan önce oynar; pasif olayı yazılır; test modunda yok', () => {
    const e = effectOf('cutpurse', 'headStart');
    expect(e.speedBoost).toBeGreaterThan(0);
    // Archer cutpurse'ten hızlı; destek olmadan önce Archer oynardı
    expect(content.classes.archer!.stats.spd).toBeGreaterThan(content.mobs.cutpurse!.stats.spd);
    const b = arena([['archer', 1]], [['cutpurse', 0]], 'turns');
    expect(b.currentUid).toBe('enemy-0');
    expect(ofType(b.log, 'passive').some((x) => x.actor === 'enemy-0' && x.passive === 'head_start')).toBe(true);
    expect(b.speedBoostOf('enemy-0')).toBe(0); // ilk turu başlayınca biter
    const t = arena([['archer', 1]], [['cutpurse', 0]], 'test');
    expect(t.speedBoostOf('enemy-0')).toBe(0);
    expect(ofType(t.log, 'passive').length).toBe(0);
  });
});

describe('YM16 Pack Tactics (Grey Wolf)', () => {
  it('aynı sıradaki her diğer canlı kurt için +perAlly; ölen ve başka sıradaki sayılmaz', () => {
    const e = effectOf('grey_wolf', 'packTactics');
    const b = sure(arena([['warrior', 1]], [['grey_wolf', 0], ['grey_wolf', 1], ['grey_wolf', 2], ['grey_wolf', 4]]));
    const w = unit(b, 'enemy-0');
    const hero = unit(b, 'party-0');
    expect(b.dealtDamageMult(w, hero)).toBeCloseTo(1 + 2 * e.perAlly, 10);
    expect(b.dealtDamageMult(unit(b, 'enemy-3'), hero)).toBe(1); // tek başına ikinci sırada
    unit(b, 'enemy-2').hp = 0;
    expect(b.dealtDamageMult(w, hero)).toBeCloseTo(1 + e.perAlly, 10);
    // gerçek vuruş: 3 kurt vs tek kurt (aynı seed)
    const hit = (pack: boolean) => {
      const x = sure(arena([['warrior', 1]], pack ? [['grey_wolf', 1], ['grey_wolf', 0], ['grey_wolf', 2]] : [['grey_wolf', 1]]));
      const n = x.log.length;
      x.useSkill('enemy-0', 'bite', 'party-0');
      return hitOn(x, n, 'party-0');
    };
    expect(Math.abs(hit(true) - hit(false) * (1 + 2 * e.perAlly))).toBeLessThanOrEqual(1);
  });
});

describe('YM17 Hide in the Brush (Ravenwood Poacher)', () => {
  it('şeridinde önünde canlı dost varken kaçınma +evasion; siper ölünce ya da başka şeritteyse yok', () => {
    const e = effectOf('ravenwood_poacher', 'hideInBrush');
    const b = arena([['warrior', 1]], [['ravenwood_poacher', 7], ['grey_wolf', 1], ['grey_wolf', 0]]);
    const p = unit(b, 'enemy-0');
    expect(b.effectiveStats(p).evasion).toBeCloseTo(p.stats.evasion + e.evasion, 6);
    unit(b, 'enemy-1').hp = 0;
    expect(b.effectiveStats(p).evasion).toBeCloseTo(p.stats.evasion, 6); // şerit 0'daki kurt siper değil
  });
});

describe('YM18 Flock Shield (Raven Seer)', () => {
  it('savaşta bir kez ilk düşman skill vuruşu x(1 - reduce); önizleme gösterir; ikinci vuruş tam', () => {
    const e = effectOf('raven_seer', 'flockShield');
    const hit = (shield: boolean) => {
      const b = sure(arena([['archer', 1]], [['raven_seer', 7]]));
      if (!shield) unit(b, 'enemy-0').passiveUsed = true;
      const n = b.log.length;
      b.useSkill('party-0', 'quick_shot', 'enemy-0');
      return { b, n, dmg: hitOn(b, n, 'enemy-0') };
    };
    const a = hit(true);
    const full = hit(false).dmg;
    expect(Math.abs(a.dmg - full * (1 - e.reduce))).toBeLessThanOrEqual(1);
    expect(ofType(since(a.b, a.n), 'passive').some((x) => x.actor === 'enemy-0' && x.passive === 'flock_shield')).toBe(true);
    expect(a.b.flockMult(unit(a.b, 'party-0'), unit(a.b, 'enemy-0'))).toBe(1);
    const b = sure(arena([['archer', 1]], [['raven_seer', 7]]));
    expect(b.flockMult(unit(b, 'party-0'), unit(b, 'enemy-0'))).toBeCloseTo(1 - e.reduce, 10);
  });
});

describe('YM19 Shares of the Dead (Bandit Chief)', () => {
  it('çağrı olmayan dost ölünce Fortified + kalıcı hasar eki (yığılır)', () => {
    const e = effectOf('bandit_chief', 'sharesOfDead');
    const b = sure(arena([['archer', 1]], [['bandit_chief', 1], ['ravenwood_poacher', 6], ['ember_acolyte', 8]]));
    const chief = unit(b, 'enemy-0');
    const hero = unit(b, 'party-0');
    expect(b.dealtDamageMult(chief, hero)).toBe(1);
    unit(b, 'enemy-1').hp = 1;
    const n = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(unit(b, 'enemy-1').hp).toBe(0);
    expect(ofType(since(b, n), 'passive').some((x) => x.actor === 'enemy-0' && x.passive === 'shares_of_the_dead')).toBe(true);
    expect(chief.statuses.find((s) => s.kind === e.status)?.turns).toBe(e.turns);
    expect(b.dealtDamageMult(chief, hero)).toBeCloseTo(1 + e.perDeath, 10);
    unit(b, 'enemy-2').hp = 1;
    b.useSkill('party-0', 'quick_shot', 'enemy-2');
    expect(b.dealtDamageMult(chief, hero)).toBeCloseTo(1 + 2 * e.perDeath, 10);
  });
});

describe('YM14-YM19 metinleri', () => {
  it('her Bölge I mob pasifinin describePassive metni ve veri metni dolu', () => {
    for (const id of ['road_thug', 'cutpurse', 'grey_wolf', 'ravenwood_poacher', 'raven_seer', 'bandit_chief']) {
      const m = content.mobs[id]!;
      expect(describePassive(m.passive!, m.stats, content.formulas).length, id).toBeGreaterThan(10);
      expect(m.passive!.text.length, id).toBeGreaterThan(10);
    }
    expect(content.mobs.grey_wolf!.family).toBe('beasts');
  });
});

describe('D7-D9', () => {
  it('D7 tek hedefli skill\'in ground etkisi hedefin hücresine konur (Tainted Bait)', () => {
    const b = sure(arena([['warrior', 4]], [['ravenwood_poacher', 7]]));
    const n = b.log.length;
    b.useSkill('enemy-0', 'tainted_bait', 'party-0');
    const g = ofType(since(b, n), 'ground');
    expect(g.length).toBe(1);
    expect(g[0]!.ground).toBe('poison');
    expect(g[0]!.board).toBe('party');
    expect(g[0]!.slots).toEqual([4]);
  });

  it('D8 Ember Acolyte Ruined Watchtower\'da (bölge I) sefer ölçeği olmadan, yalnızca karşılaşma x zorluk çarpanıyla kurulur', () => {
    const enc = ENCOUNTERS.watchtower_tutorial!;
    const u = enc.units.find((x) => x.class === 'ember_acolyte')!;
    expect(CONFIG.enemyScale?.skipRegions).toContain('I');
    const plan = battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 5, difficulty: 'medium' }), '3'));
    const expected = withDifficulty(withDifficulty(u.mods, chapterEnemyMods('valdoria', '3')), CONFIG.difficulties.medium!.enemy)!;
    const m = plan.units.enemies[u.slot]!.modifiers!;
    expect(m.hpMult).toBe(expected.hpMult);
    expect(m.powerMult).toBe(expected.powerMult);
    expect(m.statMult).toBe(expected.statMult);
    const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
    const ac = battle.combatants.find((c) => c.side === 'enemy' && c.defId === 'ember_acolyte')!;
    expect(ac.maxHp).toBeGreaterThan(0);
    expect(ac.maxHp).toBeLessThan(content.mobs.ember_acolyte!.stats.hp);
  });

  it('D9 Mill Road kilitleriyle düşman YZ\'si her turunda temel saldırıyı seçer (iki savaş modu da çalışır)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const plan = battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed }), '1'));
      expect(plan.encounterId).toBe('mill_road_thugs');
      const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
      let enemyTurns = 0;
      for (let i = 0; i < 200 && !b.winner; i++) {
        const uid = b.currentActor?.uid;
        if (!uid) break;
        const choice = chooseAction(b, uid, content.aiConfig);
        if (b.get(uid)!.side === 'enemy') {
          enemyTurns++;
          expect(choice?.skillId, `seed ${seed} ${uid}`).toBe(content.mobs[b.get(uid)!.defId]!.skills[0]);
        }
        if (!b.applyChoice(uid, choice).ok) break;
      }
      expect(b.winner).toBe('party');
      expect(enemyTurns).toBeGreaterThan(0);
    }
    const t = arena([['warrior', 1]], [['road_thug', 1], ['cutpurse', 0]], 'test');
    expect(t.useSkill('enemy-0', 'cudgel', 'party-0').ok).toBe(true);
    expect(t.useSkill('enemy-1', 'shiv', 'party-0').ok).toBe(true);
  });
});
