import { describe, expect, it } from 'vitest';
import { Battle, armorReduction, chooseAction, content, describePassive, explainChoice, roundSpeed, skillCostAmount } from '../src/engine';
import type { BattleEvent, Combatant, CombatantDef, PassiveEffect } from '../src/engine';

// Sefer mob pasifleri YM1-YM13 ve doğrulama maddeleri D1-D6 (Bölge II, docs/design/campaign/mob-plan.md 2.2 / 5; Ömer onayı 2026-10-16).
// Sayılar veriden okunur (data/mobs, data/skills.json).

const f = content.formulas;
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
/** Her vuruş isabet eder, kritik yok, Lucky Escape / Resilience yok; canlar büyük (sayım için). */
function sure(b: Battle, hp = 5000): Battle {
  b.debug.crit = 'never';
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
  for (const c of b.combatants) c.hp = c.maxHp = hp;
  return b;
}
const unit = (b: Battle, uid: string): Combatant => b.get(uid)!;
/** turns modu: `uid`'nin sırası gelene kadar diğerleri pas geçer (sınırlı). */
function until(b: Battle, uid: string, max = 60): void {
  for (let i = 0; i < max && b.currentUid !== uid && !b.winner; i++) b.skipTurn();
  expect(b.currentUid).toBe(uid);
}
const since = (b: Battle, n: number) => b.log.slice(n);

describe('YM1 Cut and Run (Moor Raider, Bandit Crossbowman)', () => {
  it('can ilk kez eşiğin altına inince Shrouded + hız desteği; savaşta bir kez', () => {
    const e = effectOf('moor_raider', 'cutAndRun');
    expect(content.mobs.bandit_crossbowman!.passive!.id).toBe('cut_and_run');
    const b = sure(arena([['archer', 6]], [['moor_raider', 1]], 'turns'), 1000);
    const raider = unit(b, 'enemy-0');
    raider.hp = Math.round(raider.maxHp * e.below) + 5;
    const n = b.log.length;
    b.debugCast('party-0', 'quick_shot', 'enemy-0');
    expect(raider.hp).toBeLessThan(raider.maxHp * e.below);
    expect(ofType(since(b, n), 'passive').some((x) => x.actor === 'enemy-0' && x.passive === 'cut_and_run')).toBe(true);
    expect(raider.statuses.find((s) => s.kind === e.status)?.turns).toBe(e.turns);
    expect(b.speedBoostOf('enemy-0')).toBe(e.speedBoost);
    const m = b.log.length;
    b.debugCast('party-0', 'quick_shot', 'enemy-0');
    expect(ofType(since(b, m), 'passive').some((x) => x.passive === 'cut_and_run')).toBe(false);
  });
});

describe('YM2 Last Ember (Ember Acolyte, Charcoal Burner)', () => {
  it('skill vuruşuyla öldüren kahramanın hücresi süreli yanan zemin olur; süre ve tik öldürenin turunda', () => {
    const e = effectOf('ember_acolyte', 'lastEmber');
    expect(content.mobs.charcoal_burner!.passive!.id).toBe('last_ember');
    const b = sure(arena([['archer', 6], ['warrior', 1]], [['ember_acolyte', 7], ['shieldwarden', 1]], 'turns'));
    unit(b, 'enemy-0').hp = 1;
    const n = b.log.length;
    b.debugCast('party-0', 'quick_shot', 'enemy-0');
    const g = ofType(since(b, n), 'ground').find((x) => x.ground === e.ground);
    expect(g).toBeDefined();
    expect(g!.board).toBe('party');
    expect(g!.slots).toEqual([6]);
    expect(g!.turns).toBe(e.turns);
    const ge = b.ground.find((x) => x.id === g!.id)!;
    expect(ge.tickOn).toBe('party-0');
    // bırakan öldü ama zemin, öldürenin turunda tikler ve sayacı onunla azalır
    if (b.currentUid === 'party-0') b.skipTurn();
    until(b, 'party-0');
    const ticks = ofType(b.log, 'damage').filter((x) => x.target === 'party-0' && x.origin === 'ground' && x.groundId === g!.id);
    expect(ticks.length).toBe(1);
    expect(b.ground.find((x) => x.id === g!.id)?.turns).toBe(e.turns - 1);
  });

  it('zemin / DoT ile ölümde kor yok', () => {
    const b = sure(arena([['archer', 6]], [['ember_acolyte', 7], ['shieldwarden', 1]], 'turns'));
    const ac = unit(b, 'enemy-0');
    ac.hp = 1;
    ac.statuses.push({ kind: 'wither', turns: 3, source: 'party-0', amount: 999 });
    for (let i = 0; i < 40 && ac.hp > 0; i++) b.skipTurn();
    expect(ac.hp).toBe(0);
    expect(ofType(b.log, 'passive').some((x) => x.passive === 'last_ember')).toBe(false);
    expect(b.ground.length).toBe(0);
  });
});

describe('YM3 Rebuke (Shieldwarden)', () => {
  it('yakın dövüş fiziksel vuruşta zırhın engellediği hasarın oranı saldırana fiziksel hasar olarak döner; menzilli vuruşta yok', () => {
    const e = effectOf('shieldwarden', 'rebuke');
    const b = sure(arena([['warrior', 1], ['archer', 6]], [['shieldwarden', 1]]));
    const sw = unit(b, 'enemy-0');
    const n = b.log.length;
    b.useSkill('party-0', 'melee_attack', 'enemy-0');
    const ev = since(b, n);
    const hits = ofType(ev, 'damage').filter((x) => x.target === 'enemy-0' && x.origin === 'skill');
    const backs = ofType(ev, 'damage').filter((x) => x.source === 'enemy-0' && x.target === 'party-0');
    expect(hits.length).toBeGreaterThan(0);
    expect(backs.length).toBe(hits.length);
    const red = armorReduction(b.effectiveStats(sw).armor, f);
    hits.forEach((h, i) => {
      const raw = Math.round((((h.amount + h.absorbed) * red) / (1 - red)) * e.ratio);
      expect(backs[i]!.amount).toBe(b.tickDamage('physical', 'physical', raw, unit(b, 'party-0')));
      expect(backs[i]!.damageType).toBe('physical');
    });
    const m = b.log.length;
    b.useSkill('party-1', 'quick_shot', 'enemy-0');
    expect(ofType(since(b, m), 'damage').some((x) => x.source === 'enemy-0')).toBe(false);
  });
});

describe('YM4 Stone Patience (Stonebound Warden)', () => {
  it('hasar almadığı her tur başında +zırh (en çok max); hasar sıfırlar', () => {
    const e = effectOf('stonebound_warden', 'stonePatience');
    const b = sure(arena([['archer', 6]], [['stonebound_warden', 1]], 'turns'));
    const sw = unit(b, 'enemy-0');
    const base = sw.stats.armor;
    for (let k = 1; k <= Math.ceil(e.max / e.armor) + 1; k++) {
      until(b, 'enemy-0');
      expect(b.effectiveStats(sw).armor).toBe(base + Math.min(e.max, k * e.armor));
      b.skipTurn();
    }
    b.debugCast('party-0', 'quick_shot', 'enemy-0');
    expect(b.effectiveStats(sw).armor).toBe(base);
    until(b, 'enemy-0');
    expect(b.effectiveStats(sw).armor).toBe(base); // hasar aldığı turun başında kazanmaz
  });
});

describe('YM5 Deep Hoard (Thane of the Deep)', () => {
  it('mevcut MP x oran kadar zırh ve büyü zırhı; MP düşünce incelir', () => {
    const e = effectOf('thane_of_the_deep', 'deepHoard');
    const b = arena([['archer', 6]], [['thane_of_the_deep', 1]]);
    const th = unit(b, 'enemy-0');
    const bonus = Math.round(th.mp * e.mpRatio);
    expect(bonus).toBeGreaterThan(0);
    expect(b.effectiveStats(th).armor).toBe(th.stats.armor + bonus);
    expect(b.effectiveStats(th).magicArmor).toBe(th.stats.magicArmor + bonus);
    th.mp = 0;
    expect(b.effectiveStats(th).armor).toBe(th.stats.armor);
    expect(b.effectiveStats(th).magicArmor).toBe(th.stats.magicArmor);
  });

  it('YZ: MP yakmanın değeri MP bağlı zırhı da sayar (Mana Steal burn terimi pasifle büyür; MP ve zırh geri alınır; 2026-10-27: Ley Brand yakmaz)', () => {
    const burnOf = (hoard: boolean) => {
      const b = arena([['antimage', 0], ['warrior', 1], ['archer', 6]], [['thane_of_the_deep', 1]]);
      const th = unit(b, 'enemy-0');
      if (!hoard) th.passive = undefined;
      const mp = th.mp;
      const armor = b.effectiveStats(th).armor;
      const am = b.combatants.find((c) => c.side === 'party' && c.defId === 'antimage')!;
      const ex = explainChoice(b, am.uid, content.aiConfig)!;
      expect(th.mp).toBe(mp); // değerlendirme durumu değiştirmez
      expect(b.effectiveStats(th).armor).toBe(armor);
      const best = (skill: string) => Math.max(0, ...ex.candidates.filter((c) => c.skill === skill).map((c) => c.terms?.burn ?? 0));
      return { steal: best('mana_burn') };
    };
    const withHoard = burnOf(true);
    const without = burnOf(false);
    expect(withHoard.steal).toBeGreaterThan(without.steal);
  });
});

describe('YM6 Ward-Etcher (Deep Runecaller)', () => {
  it('MP harcayan skill sonrası zırhı en düşük dosta harcanan MP x perMp süreli büyü kalkanı; süre dolunca silinir', () => {
    const e = effectOf('deep_runecaller', 'wardEtcher');
    const b = sure(arena([['archer', 6], ['mage', 7]], [['deep_runecaller', 7], ['stonebound_warden', 1], ['bandit_crossbowman', 6]], 'turns'));
    const cb = unit(b, 'enemy-2');
    expect(b.wardEtchTarget(unit(b, 'enemy-0'))!.uid).toBe('enemy-2'); // en düşük zırh (kendisi hariç)
    until(b, 'enemy-0');
    const cost = skillCostAmount(content.skills.glyph_of_breaking!.cost, unit(b, 'enemy-0'));
    const r = b.useSkill('enemy-0', 'glyph_of_breaking', 'party-0');
    expect(r.ok).toBe(true);
    expect(cb.magicShield).toBe(cost * e.perMp);
    expect(cb.shieldHooks?.[0]?.turns).toBe(e.turns);
    // MP harcamayan temel saldırı kalkan vermez
    until(b, 'enemy-0');
    const before = cb.magicShield;
    b.useSkill('enemy-0', 'rune_spark', 'party-0');
    expect(cb.magicShield).toBe(before);
    // taşıyanın e.turns turu sonunda kalan kalkan havuzdan düşer
    for (let k = 0; k < e.turns; k++) {
      until(b, 'enemy-2');
      b.skipTurn();
    }
    expect(cb.magicShield).toBe(0);
    expect(cb.shieldHooks).toBeUndefined();
  });
});

describe('YM7 Mire-Bound (Fen Witchling, Morwen)', () => {
  it('Saltbound taşıyan düşman yavaşlar; birden çok cadıda tek uygulanır; cadı ölünce kalkar', () => {
    const e = effectOf('fen_witchling', 'mireBound');
    expect(content.mobs.hedge_witch_morwen!.passive!.id).toBe('mire_bound');
    const b = arena([['warrior', 1]], [['fen_witchling', 6], ['hedge_witch_morwen', 8]]);
    const w = unit(b, 'party-0');
    const plain = b.baseSpeedOf(w);
    expect(e.status).toBe('saltbound');
    b.debugAddStatus('party-0', e.status);
    expect(b.baseSpeedOf(w)).toBe(Math.max(f.attributes.spdStep ?? 1, roundSpeed(w.stats.spd * e.speedMult, f)));
    b.debugKill('enemy-0', false);
    expect(b.baseSpeedOf(w)).toBeLessThan(plain); // Morwen hâlâ yaşıyor
    b.debugKill('enemy-1', false);
    expect(b.baseSpeedOf(w)).toBe(plain);
  });
});

describe('YM8 Flicker (Will-o\'-Wisp)', () => {
  it('düşman skill vuruşu isabet edince Shrouded; kendi turu başına bir kez', () => {
    const e = effectOf('will_o_wisp', 'flicker');
    const b = sure(arena([['archer', 6]], [['will_o_wisp', 7]]));
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(unit(b, 'enemy-0').statuses.find((s) => s.kind === e.status)?.turns).toBe(e.turns);
    const n = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(ofType(since(b, n), 'passive').some((x) => x.passive === 'flicker')).toBe(false);
    b.useSkill('enemy-0', 'wisp_spark', 'party-0'); // kendi eylemi: hak yenilenir
    const m = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(ofType(since(b, m), 'passive').some((x) => x.passive === 'flicker')).toBe(true);
  });
});

describe('YM9 Corpse Hunger (Ghoul, Drowned)', () => {
  it('çağrı olmayan herhangi bir birim ölünce maks canın oranı kadar şifa; Wound azaltır; çağrı ölümü saymaz', () => {
    const e = effectOf('ghoul', 'corpseHunger');
    expect(content.mobs.drowned!.passive!.id).toBe('corpse_hunger');
    const b = sure(arena([['archer', 6]], [['ghoul', 1], ['ember_acolyte', 7], ['ember_acolyte', 8]]), 1000);
    const g = unit(b, 'enemy-0');
    g.hp = 500;
    unit(b, 'enemy-1').hp = 1;
    b.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(g.hp).toBe(500 + Math.round(g.maxHp * e.ratio));
    g.hp = 500;
    g.statuses.push({ kind: 'wound', turns: 3, source: 'party-0' });
    unit(b, 'enemy-2').hp = 1;
    b.useSkill('party-0', 'quick_shot', 'enemy-2');
    expect(g.hp).toBe(500 + Math.round(Math.round(g.maxHp * e.ratio) * (content.statuses.wound!.healTakenMult ?? 1)));
  });
});

describe('YM10 Bone Ward (Grave Chanter)', () => {
  it('tarafında çağrı yaşadıkça aldığı tüm hasar azalır (skill çarpanı ve tik)', () => {
    const e = effectOf('grave_chanter', 'boneWard');
    const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const b = new Battle(content.battleSetup('random-battle', 3, 'test', { party: cells({ 6: 'archer' }), enemies: cells({ 0: 'skeleton', 7: 'grave_chanter' }) }, false));
    const ch = b.combatants.find((c) => c.defId === 'grave_chanter')!;
    const sk = b.combatants.find((c) => c.defId === 'skeleton')!;
    expect(sk.summoned).toBe(true);
    expect(b.damageTakenMult(ch)).toBeCloseTo(1 - e.reduce, 6);
    const tickWith = b.tickDamage('fire', 'magic', 100, ch);
    b.debugKill(sk.uid, false);
    expect(b.damageTakenMult(ch)).toBe(1);
    expect(tickWith).toBeLessThan(b.tickDamage('fire', 'magic', 100, ch));
  });
});

describe('YM11 Martyr\'s Vow (Oathsworn Brother)', () => {
  it('bitişik dosta gelen ölümcül vuruşu savaşta bir kez kendisi alır (kendi zırhıyla); bitişik değilse almaz', () => {
    const b = sure(arena([['archer', 6]], [['oathsworn_brother', 0], ['ghoul', 1], ['ghoul', 2]]), 1000);
    const br = unit(b, 'enemy-0');
    const g = unit(b, 'enemy-1');
    g.hp = 1;
    const n = b.log.length;
    b.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(g.hp).toBe(1);
    expect(br.hp).toBeLessThan(br.maxHp);
    expect(ofType(since(b, n), 'passive').some((x) => x.passive === 'martyrs_vow')).toBe(true);
    expect(br.passiveUsed).toBe(true);
    b.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(g.hp).toBe(0); // yemin harcandı
    // bitişik olmayan (slot 2, şerit farkı 2) dost korunmaz
    const c = sure(arena([['archer', 6]], [['oathsworn_brother', 0], ['ghoul', 2]]), 1000);
    c.get('enemy-1')!.hp = 1;
    c.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(c.get('enemy-1')!.hp).toBe(0);
    expect(c.get('enemy-0')!.passiveUsed).toBeFalsy();
  });
});

describe('YM12 Censer Smoke (Censer Monk)', () => {
  it('kendisi ve aynı şeritteki dostlar tur başında maks canın oranı kadar iyileşir; başka şerit iyileşmez', () => {
    const e = effectOf('censer_monk', 'censerSmoke');
    const b = sure(arena([['archer', 6]], [['censer_monk', 7], ['oathsworn_brother', 1], ['ghoul', 0]], 'turns'), 1000);
    for (const c of b.combatants) if (c.side === 'enemy') c.hp = 500;
    for (const uid of ['enemy-1', 'enemy-0', 'enemy-2']) until(b, uid), b.skipTurn();
    const heals = ofType(b.log, 'heal').filter((x) => x.cause === 'censer_smoke');
    const amount = Math.round(1000 * e.ratio);
    expect(heals.some((x) => x.target === 'enemy-1' && x.amount === amount)).toBe(true);
    expect(heals.some((x) => x.target === 'enemy-0' && x.amount === amount)).toBe(true);
    expect(heals.some((x) => x.target === 'enemy-2')).toBe(false);
  });
});

describe('YM13 Vessel of the Choir (High Priest of the Undying)', () => {
  it('maks MP + mpAdd; dostu düşman skill\'inden hasar aldıkça MP (kendisine gelen vuruş saymaz)', () => {
    const e = effectOf('high_priest_of_the_undying', 'choirVessel');
    const hp = content.mobs.high_priest_of_the_undying!;
    expect(hp.stats.mp).toBe(Math.round(f.attributes.mpBase + f.attributes.mpPerInt * hp.attributes.int) + e.mpAdd);
    const b = sure(arena([['archer', 6]], [['high_priest_of_the_undying', 7], ['ghoul', 1]]));
    const pr = unit(b, 'enemy-0');
    pr.mp = 0;
    b.useSkill('party-0', 'quick_shot', 'enemy-1');
    expect(pr.mp).toBe(e.mpPerHit);
    b.useSkill('party-0', 'quick_shot', 'enemy-0');
    expect(pr.mp).toBe(e.mpPerHit);
  });
});

describe('YM metinleri', () => {
  it('her Bölge II mob pasifinin describePassive metni ve veri metni boş değil', () => {
    for (const m of Object.values(content.mobs)) {
      if (!m.passive) continue;
      expect(describePassive(m.passive, m.stats, f).length, m.id).toBeGreaterThan(10);
      expect(m.passive.text.length, m.id).toBeGreaterThan(10);
    }
  });
});

describe('D1-D6: var olan etkiler mob skill\'lerinde', () => {
  it('D1 düz skill etkisiyle Silence (Clutch); D6 düz etkiyle Slow (Gatestone Slam)', () => {
    const b = sure(arena([['mage', 1]], [['drowned', 1], ['stonebound_warden', 0]]));
    b.useSkill('enemy-0', 'clutch', 'party-0');
    expect(b.isSilenced('party-0')).toBe(true);
    expect(b.canUse('party-0', 'meteor')).toMatchObject({ ok: false });
    b.useSkill('enemy-1', 'gatestone_slam', 'party-0');
    expect(unit(b, 'party-0').statuses.some((s) => s.kind === 'slow')).toBe(true);
  });

  it('D2 dot etkisi burning durumuyla (Kiln Smoke): miktar sabitlenir, tik hasarı > 0', () => {
    const b = sure(arena([['warrior', 1], ['mage', 4]], [['charcoal_burner', 7]]));
    b.useSkill('enemy-0', 'kiln_smoke', 'party-0');
    const burn = unit(b, 'party-0').statuses.find((s) => s.kind === 'burning');
    expect(burn?.amount).toBeGreaterThan(0);
    expect(b.dotTickDamage('burning', burn!.amount!, unit(b, 'party-0'))).toBeGreaterThan(0);
  });

  it('D4 cost.ofCurrent temel saldırıda (Penance Flail): bedel mevcut canın oranı, asla öldürmez', () => {
    const b = sure(arena([['warrior', 1]], [['oathsworn_brother', 1]]), 1000);
    const br = unit(b, 'enemy-0');
    const cost = skillCostAmount(content.skills.penance_flail!.cost, br);
    expect(cost).toBe(Math.round(1000 * content.skills.penance_flail!.cost.ofCurrent!));
    b.useSkill('enemy-0', 'penance_flail', 'party-0');
    expect(br.hp).toBe(1000 - cost);
    br.hp = 1;
    expect(b.canUse('enemy-0', 'penance_flail').ok).toBe(false);
  });

  it('D5 alan skill\'inde manaBurn amount (Glyph of Breaking): yalnızca isabet eden hedefler', () => {
    const b = sure(arena([['mage', 1], ['mage', 4], ['mage', 0]], [['deep_runecaller', 7]]));
    b.freeMp = true;
    const n = b.log.length;
    b.useSkill('enemy-0', 'glyph_of_breaking', 'party-0');
    const burns = ofType(since(b, n), 'manaBurn');
    const amount = (content.skills.glyph_of_breaking!.effects.find((x) => x.type === 'manaBurn') as { amount: number }).amount;
    expect(burns.length).toBe(3);
    for (const x of burns) expect(x.amount).toBe(amount);
  });

  it('D3 mob YZ\'si çağırma skill\'ini kullanır (Call the Buried); iki savaş modu da çalışır', () => {
    let used = 0;
    for (const seed of [1, 2, 3, 4]) {
      const b = arena([['warrior', 1], ['archer', 6]], [['grave_chanter', 7], ['ghoul', 1]], 'turns', seed);
      for (let i = 0; i < 300 && !b.winner; i++) {
        const uid = b.currentActor?.uid;
        if (!uid || !b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
      }
      expect(b.winner).toBeTruthy();
      used += ofType(b.log, 'skillUsed').filter((x) => x.skill === 'call_the_buried').length;
    }
    expect(used).toBeGreaterThan(0);
    const t = arena([['warrior', 1]], [['grave_chanter', 7]], 'test');
    expect(t.useSkill('enemy-0', 'call_the_buried').ok).toBe(true);
    expect(t.combatants.some((c) => c.summoned && c.side === 'enemy')).toBe(true);
  });
});

describe('Bölge II mob YZ\'si yeni skill\'leri kullanır', () => {
  it('karşılaşma takımları YZ vs YZ: çağırma, buff, taunt ve imza skill\'leri en az bir kez seçilir', () => {
    const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const parties = [cells({ 0: 'warrior', 1: 'defender', 6: 'mage', 8: 'archer' }), cells({ 0: 'warrior', 1: 'defender', 3: 'paladin', 4: 'mage' })];
    const fights: Record<number, string>[] = [
      { 0: 'moor_raider', 2: 'moor_raider', 7: 'ember_acolyte' },
      { 1: 'stonebound_warden', 6: 'bandit_crossbowman', 8: 'deep_runecaller' },
      { 1: 'shieldwarden', 4: 'charcoal_burner', 7: 'ember_acolyte' },
      { 1: 'thane_of_the_deep', 6: 'deep_runecaller', 8: 'deep_runecaller' },
      { 7: 'hedge_witch_morwen', 1: 'drowned', 6: 'will_o_wisp', 8: 'will_o_wisp' },
      { 1: 'ghoul', 7: 'grave_chanter' },
      { 0: 'oathsworn_brother', 1: 'oathsworn_brother', 7: 'censer_monk' },
      { 7: 'high_priest_of_the_undying', 6: 'grave_chanter', 8: 'fen_witchling', 1: 'ghoul' },
    ];
    const used = new Set<string>();
    for (const enemies of fights)
      for (const party of parties)
      for (const seed of [1, 2, 3]) {
        const b = new Battle(content.battleSetup('random-battle', seed, 'turns', { party, enemies: cells(enemies) }, false));
        for (let i = 0; i < 400 && !b.winner; i++) {
          const uid = b.currentActor?.uid;
          // Taunt çekimi (playtest D5, ai.json value.tauntPull): bazı alan skill'leri (Scatter Quarrels, Kiln Smoke) bu takımlarda yalnızca Defender
          // taunt'lıyken taunter dışına seçiliyordu; çekim bunu bilerek bastırır (tests/taunt-pull.test.ts). Seçilebilirlik burada çekimsiz denetlenir.
          const opts = { value: { tauntPull: 0 } };
          if (!uid || !b.applyChoice(uid, chooseAction(b, uid, content.aiConfig, undefined, opts)).ok) break;
        }
        for (const e of ofType(b.log, 'skillUsed')) if (b.get(e.actor)?.side === 'enemy') used.add(e.skill);
      }
    for (const id of ['peat_smoke', 'scatter_quarrels', 'kiln_smoke', 'rockfall', 'oath_of_stone', 'glyph_of_breaking', 'hags_mark', 'call_the_buried', 'sanctuary', 'consecrate', 'requiem', 'unholy_benediction'])
      expect(used, id).toContain(id);
  });
});
