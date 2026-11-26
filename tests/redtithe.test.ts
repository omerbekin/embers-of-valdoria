import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, describeSkill, explainChoice, previewForTargets, skillCostAmount, skillCostLabel, type BattleEvent, type BattleMode, type Combatant, type SkillEffect, type Teams } from '../src/engine';
import { passiveNumbers } from '../src/engine/skill-info';

// Redtithe (iç id antimage; Ömer 2026-11-17): kan barı, Tithe Cut, Blood Brand, Mirror Vein, Exsanguinate, Blood Tithe pasifi. Sayılar veriden okunur.

const F = content.formulas;
const BB = F.bloodBar!;
const S = content.skills;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: {}, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
const eff = <T extends SkillEffect['type']>(id: string, type: T) => S[id]!.effects.find((e) => e.type === type) as Extract<SkillEffect, { type: T }>;
/** İsabet edene kadar (en çok 40 deneme) skill kullanır; her denemede kaynak ve bekleme sıfırlanır. */
function landed(b: Battle, uid: string, skill: string, target: Combatant, prep?: () => void): BattleEvent[] {
  const me = b.get(uid)!;
  for (let i = 0; i < 40; i++) {
    prep?.();
    me.cooldowns[skill] = 0;
    const from = b.log.length;
    const r = b.useSkill(uid, skill, target.uid);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const ev = b.log.slice(from);
    if (ev.some((e) => e.type === 'damage' && e.target === target.uid && e.source === uid && (e.amount > 0 || (e.absorbed ?? 0) > 0))) return ev;
  }
  throw new Error('never landed');
}

describe('Redtithe: veri', () => {
  it('sınıf: görünen ad Redtithe, iç id antimage, DEX ana stat, MP yok, kan barı', () => {
    const c = content.classes.antimage!;
    expect(c.name).toBe('Redtithe');
    expect(c.primary).toBe('dex');
    expect(c.stats.mp).toBe(0);
    expect(c.stats.mpRegen).toBe(0);
    expect(c.maxBlood).toBe(BB.max);
    expect(c.bloodStart).toBe(BB.start);
    expect(c.maxRage).toBeUndefined();
    const a = c.attributes;
    expect(a.str + a.int + a.dex + a.luck).toBe(60);
    expect(a.dex).toBeGreaterThan(Math.max(a.str, a.int, a.luck));
  });
  it('skill idleri aynı, adlar ve kaynak yeni', () => {
    expect(content.classes.antimage!.skills).toEqual(['mana_burn', 'drain_field', 'spell_ward', 'void_strike']);
    expect(S.mana_burn!.name).toBe('Tithe Cut');
    expect(S.drain_field!.name).toBe('Blood Brand');
    expect(S.spell_ward!.name).toBe('Mirror Vein');
    expect(S.void_strike!.name).toBe('Exsanguinate');
    for (const id of content.classes.antimage!.skills) expect(S[id]!.cost.resource).toBe('blood');
    expect(S.void_strike!.cost.spendAll).toBe(true);
    expect(skillCostLabel(S.void_strike!.cost)).toBe(`All BLOOD (min ${S.void_strike!.cost.amount})`);
  });
  it('mob ve boss kitlerinde kan kaynağı yok (yalnız Redtithe)', () => {
    const bloodSkills = new Set(Object.values(S).filter((s) => s.cost.resource === 'blood').map((s) => s.id));
    for (const d of [...Object.values(content.mobs ?? {}), ...Object.values(content.bosses ?? {})]) {
      expect(d.maxBlood, d.id).toBeUndefined();
      for (const sk of d.skills) expect(bloodSkills.has(sk), `${d.id} ${sk}`).toBe(false);
    }
  });
});

describe('Redtithe: kan barı', () => {
  it('savaşa start kanla, 0 MP ile başlar; hiç MP kazanmaz', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' });
    const me = P(b);
    expect(me.blood).toBe(BB.start);
    expect(me.maxBlood).toBe(BB.max);
    expect(me.maxMp).toBe(0);
  });
  it('bar düştükçe büyü zırhı ve can emme doğrusal artar (bar 0 = tavan, dolu = 0); büyü zırhı tavanı magicArmorBase + INT x magicArmorPerInt', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' });
    const me = P(b);
    const base = me.stats.magicArmor; // class taban 0 (item / ağaç düz eki burada)
    const full = BB.magicArmorBase + BB.magicArmorPerInt * me.stats.int;
    me.blood = BB.max;
    expect(b.effectiveStats(me).magicArmor).toBe(base);
    expect(b.bloodLifesteal(me)).toBe(0);
    me.blood = 0;
    expect(b.effectiveStats(me).magicArmor).toBeCloseTo(base + full, 5);
    expect(b.bloodLifesteal(me)).toBeCloseTo(BB.lifestealMax, 5);
    me.blood = BB.max / 2;
    expect(b.effectiveStats(me).magicArmor).toBeCloseTo(base + full / 2, 5);
    expect(b.bloodLifesteal(me)).toBeCloseTo(BB.lifestealMax / 2, 5);
  });
  it('bar 0 iken vuruş can emer (lifesteal şifası), dolu barda emmez', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' });
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 5000;
    me.hp = Math.round(me.maxHp / 2);
    const ev0 = landed(b, me.uid, 'mana_burn', foe, () => (me.blood = 0));
    expect(ev0.some((e) => e.type === 'heal' && e.target === me.uid && e.cause === 'lifesteal')).toBe(true);
    const ev1 = landed(b, me.uid, 'mana_burn', foe, () => (me.blood = BB.max));
    expect(ev1.some((e) => e.type === 'heal' && e.target === me.uid && e.cause === 'lifesteal')).toBe(false);
  });
  it('kan yetmezse eksik kısım candan ödenir (1 kan = maks canın hpPerBlood oranı, yukarı yuvarlanır)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    const need = S.drain_field!.cost.amount;
    me.blood = 5;
    const hp0 = me.hp;
    const want = Math.ceil((need - 5) * me.maxHp * BB.hpPerBlood - 1e-9);
    expect(b.bloodSplitFor(me, S.drain_field!)).toEqual({ blood: 5, hp: want, ok: true });
    const from = b.log.length;
    expect(b.useSkill(me.uid, 'drain_field', foe.uid).ok).toBe(true);
    const ev = b.log.slice(from);
    expect(me.blood).toBe(0);
    expect(me.hp).toBe(hp0 - want);
    expect(ev.find((e) => e.type === 'blood')).toMatchObject({ delta: -5, after: 0, hp: want });
    expect(ev.some((e) => e.type === 'resource' && e.resource === 'hp' && e.amount === want)).toBe(true);
  });
  it('can ödemesi canı 1in altına indirecekse kullanılamaz (kendini öldüremez)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    me.blood = 0;
    const want = Math.ceil(S.spell_ward!.cost.amount * me.maxHp * BB.hpPerBlood - 1e-9);
    me.hp = want; // ödeme canı 0'a indirir
    expect(b.canUse(me.uid, 'spell_ward')).toEqual({ ok: false, reason: 'Not enough blood' });
    me.hp = want + 1; // 1 can kalır
    expect(b.canUse(me.uid, 'spell_ward').ok).toBe(true);
  });
  it('Exsanguinate en az min kan ister ve candan ödenmez; tüm barı harcar', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' }, 11, 'test');
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 9999;
    const min = S.void_strike!.cost.amount;
    me.blood = min - 1;
    expect(b.canUse(me.uid, 'void_strike')).toEqual({ ok: false, reason: 'Not enough blood' });
    me.blood = 80;
    expect(skillCostAmount(S.void_strike!.cost, me)).toBe(80);
    const ev = landed(b, me.uid, 'void_strike', foe, () => (me.blood = 80));
    expect(me.blood).toBe(0);
    expect(ev.find((e) => e.type === 'blood')).toMatchObject({ delta: -80, after: 0 });
    expect(ev.find((e) => e.type === 'blood')?.hp).toBeUndefined();
  });
  it('Exsanguinate hasarı harcanan kanla artar: x(1 + bonus x kan)', () => {
    const vs = eff('void_strike', 'damage');
    const at = (blood: number): number => {
      const b = make({ 0: 'antimage' }, { 0: 'warrior' }, 5);
      const me = P(b);
      const foe = E(b);
      foe.hp = foe.maxHp = 99999;
      foe.stats = { ...foe.stats, armor: 0, evasion: 0 };
      me.stats = { ...me.stats, critChance: 0, accuracy: 5 };
      const ev = landed(b, me.uid, 'void_strike', foe, () => (me.blood = blood));
      return ev.filter((e) => e.type === 'damage' && e.target === foe.uid).reduce((t, e) => t + (e.type === 'damage' ? e.amount : 0), 0);
    };
    const lo = at(50);
    const hi = at(100);
    expect(hi / lo).toBeGreaterThan(((1 + vs.bloodSpentBonus! * 100) / (1 + vs.bloodSpentBonus! * 50)) * 0.85);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe('Redtithe: Tithe Cut', () => {
  it('MP\'li hedef: MP söker, sökülen x bloodPerMp + hitGain kan kazanır', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 5000;
    const mb = eff('mana_burn', 'manaBurn');
    let mp0 = 0;
    const ev = landed(b, me.uid, 'mana_burn', foe, () => {
      me.blood = 0;
      foe.mp = foe.maxMp;
      mp0 = foe.mp;
    });
    const burned = Math.min(mp0, mb.amount!);
    expect(foe.mp).toBe(mp0 - burned);
    expect(me.blood).toBe(Math.min(BB.max, burned * mb.bloodPerMp! + BB.hitGain));
    expect(ev.some((e) => e.type === 'blood' && e.delta > 0)).toBe(true);
  });
  it('MP\'siz hedef: yalnız hitGain kan', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' });
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 5000;
    foe.maxMp = 0;
    foe.mp = 0;
    landed(b, me.uid, 'mana_burn', foe, () => (me.blood = 0));
    expect(me.blood).toBe(BB.hitGain);
  });
  it('fiziksel DEX vuruşu, bedelsiz', () => {
    const d = eff('mana_burn', 'damage');
    expect(d.damageType).toBe('physical');
    expect(d.scale).toBe('dex');
    expect(S.mana_burn!.cost.amount).toBe(0);
  });
});

describe('Redtithe: Blood Brand', () => {
  it('hedefe Bleeding + işaret; işaretlinin MP bedelleri costMult katı', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'drain_field', foe.uid).ok).toBe(true);
    const br = eff('drain_field', 'bloodBrand');
    const dot = eff('drain_field', 'dot');
    expect(foe.statuses.find((s) => s.kind === 'blood_brand')?.turns).toBe(br.turns);
    expect(foe.statuses.find((s) => s.kind === 'bleeding')?.turns).toBe(dot.turns);
    const mageSkill = Object.values(S).find((s) => content.classes.mage!.skills.includes(s.id) && s.cost.resource === 'mp' && s.cost.amount > 0)!;
    expect(skillCostAmount(mageSkill.cost, foe)).toBe(Math.ceil(mageSkill.cost.amount * br.costMult - 1e-9));
  });
  it('işaretli skill kullanınca Bleeding hemen ek tik yer, süre azalmaz', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 5000;
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'drain_field', foe.uid).ok).toBe(true);
    const bleed = foe.statuses.find((s) => s.kind === 'bleeding')!;
    const turns0 = bleed.turns;
    const free = content.classes.mage!.skills.find((id) => b.canUse(foe.uid, id).ok)!;
    const tgt = b.validTargets(foe.uid, free)[0];
    const from = b.log.length;
    expect(b.useSkill(foe.uid, free, tgt?.uid).ok).toBe(true);
    const ev = b.log.slice(from);
    expect(ev.some((e) => e.type === 'damage' && e.target === foe.uid && e.status === 'bleeding')).toBe(true);
    expect(foe.statuses.find((s) => s.kind === 'bleeding')?.turns).toBe(turns0);
  });
  it('işaretliye Tithe Cut ve Exsanguinate markDamagePct fazla vurur', () => {
    const br = eff('drain_field', 'bloodBrand');
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    const base = b.dealtDamage(me, foe, S.mana_burn).mult; // Hunter's Mark (DEX primary) vb. taban
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'drain_field', foe.uid).ok).toBe(true);
    expect(b.dealtDamage(me, foe, S.mana_burn).mult / base).toBeCloseTo(1 + br.markDamagePct!, 2);
    expect(b.dealtDamage(me, foe, S.void_strike).mult / b.dealtDamage(me, foe, S.spell_ward).mult).toBeCloseTo(1 + br.markDamagePct!, 2);
  });
});

describe('Redtithe: Mirror Vein (Kan Örtüsü, Ömer 2026-11-18)', () => {
  const sh = () => eff('spell_ward', 'shield');
  /** Mage'in büyü hasarlı tek hedefli skill'i. */
  const spellOf = () => content.classes.mage!.skills.find((id) => S[id]!.effects.some((e) => e.type === 'damage' && e.damageType === 'magic') && S[id]!.target === 'single_enemy')!;
  it('veri: bütün takıma süreli kalkan (flat + INT x power), büyü emişi kan verir; bedel kan', () => {
    const e = sh();
    expect(S.spell_ward!.target).toBe('all_allies');
    expect(S.spell_ward!.cost.resource).toBe('blood');
    expect(e.scale).toBe('int');
    expect(e.flat).toBeGreaterThan(0);
    expect(e.turns).toBeGreaterThan(0);
    expect(e.onAbsorb?.giveBlood).toBeTruthy();
    expect(S.spell_ward!.effects.some((x) => (x as { type: string }).type === 'mirrorVein')).toBe(false);
  });
  it('her yaşayan dosta (kendisi dahil) flat + INT x power kalkan, süreli katman; süre taşıyanın tur başında biter (turns modu)', () => {
    const b = make({ 0: 'warrior', 1: 'antimage', 2: 'archer' }, { 0: 'warrior' }, 11, 'turns');
    const me = P(b, 1);
    const ally = P(b, 0);
    const e = sh();
    const want = Math.round(e.flat! + me.stats.int * e.power);
    for (let i = 0; i < 40 && b.currentUid !== me.uid; i++) expect(b.skipTurn().ok).toBe(true);
    expect(b.currentUid).toBe(me.uid);
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    for (const a of b.living('party')) {
      expect(a.shield, a.uid).toBe(want);
      expect(a.shieldHooks?.find((h) => h.skill === 'spell_ward' && h.caster === me.uid)?.turns).toBe(e.turns);
    }
    // dostun kendi tur başları: e.turns kez sonra kalkan düşer (düşmanın vuruşu kalkanı azaltabilir: sadece sonda 0 beklenir)
    let starts = 0;
    for (let i = 0; i < 80 && starts < e.turns!; i++) {
      const from = b.log.length;
      expect(b.skipTurn().ok).toBe(true);
      starts += b.log.slice(from).filter((x) => x.type === 'turnStart' && x.actor === ally.uid).length;
      if (starts < e.turns!) expect(ally.shieldHooks?.some((h) => h.skill === 'spell_ward')).toBe(true);
    }
    expect(starts).toBe(e.turns);
    expect(ally.shieldHooks?.some((h) => h.skill === 'spell_ward') ?? false).toBe(false);
    expect(ally.shield).toBe(0);
  });
  it('büyü emişi: kalkanı atana 2 + DEX x 0,2 kan (vuruş başına); fiziksel emiş kan vermez', () => {
    const b = make({ 0: 'warrior', 1: 'antimage' }, { 0: 'mage', 1: 'warrior' });
    const me = P(b, 1);
    const ally = P(b, 0);
    const mage = E(b, 0);
    const e = sh();
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    expect(me.blood).toBe(BB.max - S.spell_ward!.cost.amount);
    const gain = Math.round(e.onAbsorb!.giveBlood!.base + e.onAbsorb!.giveBlood!.perDex * me.stats.dex);
    const spell = spellOf();
    const before = me.blood!;
    const ev = landed(b, mage.uid, spell, ally, () => {
      mage.mp = mage.maxMp;
    });
    const trig = ev.find((x) => x.type === 'shieldTrigger' && x.skill === 'spell_ward');
    expect(trig && trig.type === 'shieldTrigger' ? trig.blood : 0).toBe(gain);
    expect(me.blood).toBe(before + gain);
    expect(ev.some((x) => x.type === 'blood' && x.actor === me.uid && x.delta === gain)).toBe(true);
  });
  it('fiziksel vuruşu emer ama kan vermez', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' });
    const me = P(b);
    const foe = E(b);
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    const shield0 = me.shield;
    expect(shield0).toBeGreaterThan(0);
    const phys = content.classes.warrior!.skills.find((id) => S[id]!.cost.amount === 0 && S[id]!.effects.some((e) => e.type === 'damage' && e.damageType === 'physical'))!;
    const blood0 = me.blood!;
    const ev = landed(b, foe.uid, phys, me);
    expect(me.shield).toBeLessThan(shield0);
    expect(me.blood).toBe(blood0);
    expect(ev.some((x) => x.type === 'blood' && x.actor === me.uid)).toBe(false);
  });
  it('kan bar sınırını aşmaz; Redtithe ölüyse kan yok', () => {
    const b = make({ 0: 'warrior', 1: 'antimage' }, { 0: 'mage' });
    const me = P(b, 1);
    const ally = P(b, 0);
    const mage = E(b);
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    me.blood = BB.max;
    landed(b, mage.uid, spellOf(), ally, () => {
      mage.mp = mage.maxMp;
    });
    expect(me.blood).toBe(BB.max);
    // yeniden kalkan, Redtithe ölü: emiş kan vermez (olay yok)
    me.cooldowns.spell_ward = 0;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    me.blood = 0;
    me.hp = 0;
    const ev = landed(b, mage.uid, spellOf(), ally, () => {
      mage.mp = mage.maxMp;
    });
    expect(ev.some((x) => x.type === 'blood')).toBe(false);
  });
  it('yeniden atınca süre yenilenir (katman büyür)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' });
    const me = P(b);
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    const h = me.shieldHooks!.find((x) => x.skill === 'spell_ward')!;
    h.turns = 1;
    me.cooldowns.spell_ward = 0;
    me.blood = BB.max;
    expect(b.useSkill(me.uid, 'spell_ward').ok).toBe(true);
    expect(me.shieldHooks!.filter((x) => x.skill === 'spell_ward').length).toBe(1);
    expect(me.shieldHooks!.find((x) => x.skill === 'spell_ward')!.turns).toBe(sh().turns);
  });
});

describe('Redtithe: büyü zırhı tamamen kan barına bağlı (Ömer 2026-11-18)', () => {
  it('class taban büyü zırhı 0; kan 0 = magicArmorBase + INT x magicArmorPerInt, kan dolu = 0', () => {
    expect(content.classes.antimage!.stats.magicArmor).toBe(0);
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    me.blood = 0;
    expect(b.effectiveStats(me).magicArmor).toBeCloseTo(BB.magicArmorBase + BB.magicArmorPerInt * me.stats.int, 5);
    me.blood = BB.max;
    expect(b.effectiveStats(me).magicArmor).toBe(0);
  });
  it('anlık INT sayılır (item / ağaç INT eki); düz büyü zırhı eki bar formülünün üstüne', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    me.blood = BB.max / 4;
    const at = (int: number, flat: number) => {
      me.stats = { ...me.stats, int, magicArmor: flat };
      return b.effectiveStats(me).magicArmor;
    };
    const lack = (BB.max - BB.max / 4) / BB.max;
    expect(at(10, 0)).toBeCloseTo((BB.magicArmorBase + BB.magicArmorPerInt * 10) * lack, 1);
    expect(at(15, 0)).toBeCloseTo((BB.magicArmorBase + BB.magicArmorPerInt * 15) * lack, 1);
    expect(at(15, 7)).toBeCloseTo(7 + (BB.magicArmorBase + BB.magicArmorPerInt * 15) * lack, 1);
  });
  it('kan ipucu formülü ve anlık değeri yazar', async () => {
    const { describeBlood } = await import('../src/engine');
    const lines = describeBlood(F, 0, BB.max, 10).join(' | ');
    expect(lines).toContain(`${BB.magicArmorBase} + INT x${BB.magicArmorPerInt}`);
    expect(lines).toContain(`+${BB.magicArmorBase + BB.magicArmorPerInt * 10} Magic Armor`);
  });
});

describe('Redtithe: Blood Tithe pasifi', () => {
  it('ipucu metni (Ömer 2026-11-21 form r40): üç cümle; sayılar formulas.bloodBar ve kahramanın statından (stat değişince metin değişir)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const pas = content.classes.antimage!.passive!;
    const e = pas.effect as Extract<NonNullable<Combatant['passive']>['effect'], { type: 'spellbreakerInstinct' }>;
    const pc = (v: number) => `${Math.round(v * 100)}%`;
    const txt = (st: Combatant['stats']) => describePassive(pas, st, content.formulas);
    const t = txt(me.stats);
    expect(t).toContain(`Blood bar: 0-${BB.max}, starts at ${BB.start}.`);
    expect(t).toContain(`${content.skills.mana_burn!.name} fills it; skills spend it. Missing blood is paid in HP`);
    expect(t).toContain(`up to ${pc(e.advance + e.bloodAdvance! + e.bloodAdvancePerDex! * me.stats.dex)} of a turn at a full bar. Once between your turns.`);
    expect(t).toContain(`more Magic Armor (up to ${BB.magicArmorBase + BB.magicArmorPerInt * me.stats.int} at 0 blood) and up to ${pc(BB.lifestealMax)} life steal on skill hits.`);
    // motorla aynı: bar 0'daki büyü zırhı = metindeki sayı
    me.blood = 0;
    expect(b.bloodMagicArmor(me)).toBeCloseTo(BB.magicArmorBase + BB.magicArmorPerInt * me.stats.int, 2);
    expect(b.bloodLifesteal(me)).toBeCloseTo(BB.lifestealMax, 4);
    // stat değişince sayı değişir (sabit yazılmaz)
    const more = { ...me.stats, int: me.stats.int + 10, dex: me.stats.dex + 20 };
    expect(txt(more)).toContain(`up to ${BB.magicArmorBase + BB.magicArmorPerInt * more.int} at 0 blood`);
    expect(txt(more)).toContain(`up to ${pc(e.advance + e.bloodAdvance! + e.bloodAdvancePerDex! * more.dex)} of a turn`);
    expect(passiveNumbers(pas, me.stats, content.formulas).map((x) => x.label)).toEqual(['Turn bar ahead (full blood)', 'Magic Armor (0 blood)', 'Life steal (0 blood)']);
    // sabit veri metni (savaş başı kartı, Codex arama) aynı kuralı formülle yazar
    expect(pas.text).toContain(`0-${BB.max}, starts at ${BB.start}`);
    expect(pas.text).toContain(`${pc(e.bloodAdvance!)} + DEX x${Math.round(e.bloodAdvancePerDex! * 10000) / 100}%`);
    expect(pas.text).toContain(`${BB.magicArmorBase} + INT x${BB.magicArmorPerInt}`);
    expect(pas.text).toContain(`${pc(BB.lifestealMax)} life steal`);
  });
  it('kayma barla ölçeklenir: advance + (bloodAdvance + bloodAdvancePerDex x DEX) x bar/max (Ömer 2026-11-18)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const e = content.classes.antimage!.passive!.effect as Extract<NonNullable<Combatant['passive']>['effect'], { type: 'spellbreakerInstinct' }>;
    expect(e.bloodAdvancePerDex).toBeGreaterThan(0);
    const peak = e.bloodAdvance! + e.bloodAdvancePerDex! * me.stats.dex;
    me.blood = 0;
    expect(b.instinctAdvance(me)).toBeCloseTo(e.advance, 4);
    me.blood = 50;
    expect(b.instinctAdvance(me)).toBeCloseTo(e.advance + peak * (50 / BB.max), 4);
    me.blood = BB.max;
    expect(b.instinctAdvance(me)).toBeCloseTo(e.advance + peak, 4);
    // DEX doğrusal: +10 DEX = +10 x bloodAdvancePerDex (bar dolu)
    me.stats = { ...me.stats, dex: me.stats.dex + 10 };
    expect(b.instinctAdvance(me)).toBeCloseTo(e.advance + peak + 10 * e.bloodAdvancePerDex!, 4);
  });
  it('turns modunda düşman MP skilli takıma atılınca sıra sayacı o oranda öne kayar (bar 50 ve 100)', () => {
    for (const blood of [BB.start, BB.max]) {
      const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, 11, 'turns');
      const me = P(b);
      const foe = E(b);
      foe.turnCounter = F.turn.threshold * 20;
      b.currentUid = foe.uid;
      foe.mp = foe.maxMp;
      me.blood = blood;
      const spell = content.classes.mage!.skills.find((id) => S[id]!.cost.resource === 'mp' && S[id]!.cost.amount > 0 && S[id]!.target === 'single_enemy' && b.canUse(foe.uid, id).ok)!;
      const tgt = b.validTargets(foe.uid, spell).find((c) => c.side === 'party')!;
      const c0 = me.turnCounter;
      const adv = b.instinctAdvance(me);
      expect(b.useSkill(foe.uid, spell, tgt.uid).ok).toBe(true);
      expect(me.turnCounter - c0).toBeCloseTo(Math.round(F.turn.threshold * adv * 1000) / 1000, 2);
    }
  });
});

describe('Redtithe: ipucu ve önizleme', () => {
  it('skill açıklamaları yeni kiti anlatır', () => {
    const st = content.classes.antimage!.stats;
    const defs = { statuses: content.statuses, skills: S };
    const txt = (id: string) => describeSkill(S[id]!, st, F, {}, defs).lines.join(' | ');
    expect(txt('mana_burn')).toMatch(/blood per MP/);
    expect(txt('drain_field')).toMatch(/Bleeding/);
    expect(txt('drain_field')).toMatch(/more MP/);
    expect(txt('drain_field')).toMatch(/paid with HP/);
    // formül görünür (Ömer 2026-11-18): "Shield 6 + INT x0.5 (...)" ve "2 + DEX x0.2 (...) blood"
    const w = eff('spell_ward', 'shield');
    expect(txt('spell_ward')).toContain(`Shield ${w.flat} + INT x${w.power}`);
    expect(txt('spell_ward')).toContain(`${w.onAbsorb!.giveBlood!.base} + DEX x${w.onAbsorb!.giveBlood!.perDex}`);
    expect(txt('spell_ward')).toContain(`for ${w.turns} turns`);
    expect(txt('void_strike')).toMatch(/per blood spent/);
    expect(txt('void_strike')).toMatch(/HP cannot pay/);
    expect(txt('mana_burn')).toMatch(/more damage to enemies marked by Blood Brand/);
  });
  it('önizleme kan yetmezken can bedelini gösterir', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    me.blood = 0;
    const pv = previewForTargets(b, me, 'drain_field', [foe]);
    const lines = pv.find((x) => x.uid === me.uid)?.statuses ?? [];
    expect(lines.some((l) => /pays \d+ HP/.test(l))).toBe(true);
  });
});

describe('Redtithe: yapay zeka', () => {
  const cands = (b: Battle, uid: string) => explainChoice(b, uid, content.aiConfig)!.candidates;
  const best = (b: Battle, uid: string, skill: string, target?: string) => {
    // aday hedefi etiket ('E0:Mage'); uid verilirse birimin etiket önekiyle eşlenir
    const t = target ? b.get(target) : undefined;
    const pre = t ? `${t.side === 'party' ? 'P' : 'E'}${t.slot}:` : '';
    const xs = cands(b, uid).filter((c) => c.skill === skill && (!t || (c.target ?? '').startsWith(pre)));
    return xs.sort((a, z) => (z.score ?? 0) - (a.score ?? 0))[0];
  };
  it('Exsanguinate en az kanın altında aday değil; 50+ kanda aday', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior' });
    const me = P(b);
    me.blood = S.void_strike!.cost.amount - 1;
    expect(best(b, me.uid, 'void_strike')).toBeUndefined();
    me.blood = BB.max;
    expect(best(b, me.uid, 'void_strike')).toBeTruthy();
  });
  it('kan yetmezken can bedeli: bloodCost yerine can bedeli; düşük canda (minHpRatioForHpCost altı) öldürmüyorsa puanı sıfırlanır', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 5000;
    me.blood = 0;
    const full = best(b, me.uid, 'drain_field', foe.uid)!;
    expect(full.tags).toContain('hpCost');
    expect(full.terms?.bloodCost ?? 0).toBe(0);
    me.hp = Math.max(2, Math.floor(me.maxHp * content.aiConfig.profiles.antimage!.minHpRatioForHpCost * 0.5));
    const low = best(b, me.uid, 'drain_field', foe.uid)!;
    expect(low.score ?? 0).toBeLessThanOrEqual(1e-6);
    me.blood = BB.max;
    const paid = best(b, me.uid, 'drain_field', foe.uid)!;
    expect(paid.tags).not.toContain('hpCost');
    expect(paid.terms?.bloodCost ?? 0).toBeLessThan(0);
  });
  it('Tithe Cut: MP\'li hedefte kan kazancı (blood terimi) MP\'siz hedeften büyük', () => {
    const b = make({ 0: 'antimage' }, { 0: 'mage', 1: 'warrior' });
    const me = P(b);
    me.blood = 0;
    const mage = E(b, 0);
    const war = E(b, 1);
    mage.mp = mage.maxMp;
    war.maxMp = 0; // MP havuzu olmayan hedef (mob gibi)
    war.mp = 0;
    const onMage = best(b, me.uid, 'mana_burn', mage.uid)?.terms?.blood ?? 0;
    const onWar = best(b, me.uid, 'mana_burn', war.uid)?.terms?.blood ?? 0;
    expect(onMage).toBeGreaterThan(onWar);
    expect(onWar).toBeGreaterThan(0);
  });
  it('Blood Brand: MP\'li düşman MP\'siz düşmandan değerli (brand terimi)', () => {
    // 2x2 alan (Ömer 2026-11-21 form r40): iki düşman aynı alana sığmasın (ön sıra şerit 0, arka sıra şerit 2)
    const b = make({ 0: 'antimage' }, { 0: 'mage', 11: 'warrior' });
    const me = P(b);
    me.blood = BB.max;
    const mage = E(b, 0);
    const war = E(b, 11);
    mage.mp = mage.maxMp;
    war.maxMp = 0;
    war.mp = 0;
    war.hp = war.maxHp = mage.hp = mage.maxHp = 400;
    // alan adayı: yalnız o düşmanı kapsayan alanlar (hits; anchor boş hücre olabilir)
    const only = (u: Combatant) => {
      const xs = cands(b, me.uid).filter((c) => c.skill === 'drain_field' && c.hits.length === 1 && c.hits[0]!.startsWith(`E${u.uid.split('-').pop()}:`));
      return Math.max(0, ...xs.map((c) => c.terms?.brand ?? 0));
    };
    const onMage = only(mage);
    const onWar = only(war);
    expect(onMage).toBeGreaterThan(onWar);
    expect(onWar).toBeGreaterThan(0);
  });
  it('Blood Brand 2x2 (Ömer 2026-11-21 form r40): iki düşmanı kapsayan alan tek düşmanlıdan değerli, ama işaret terimi toplanmaz (en yükseği)', () => {
    const b = make({ 0: 'antimage' }, { 0: 'warrior', 1: 'warrior' });
    const me = P(b);
    me.blood = BB.max;
    const [w0, w1] = [E(b, 0), E(b, 1)];
    for (const w of [w0, w1]) {
      w.maxMp = 0;
      w.mp = 0;
      w.hp = w.maxHp = 400;
    }
    const lab = (u: Combatant) => `E${u.uid.split('-').pop()}:`;
    const all = cands(b, me.uid).filter((c) => c.skill === 'drain_field');
    const both = Math.max(0, ...all.filter((c) => c.hits.length === 2).map((c) => c.terms?.brand ?? 0));
    const one = Math.max(0, ...all.filter((c) => c.hits.length === 1 && c.hits[0]!.startsWith(lab(w1))).map((c) => c.terms?.brand ?? 0));
    expect(one).toBeGreaterThan(0);
    expect(both).toBeGreaterThan(one);
    // MP'siz iki eş düşman: ek tik terimi iki kez, işaret terimi bir kez sayılır (toplam < 2 x tek)
    expect(both).toBeLessThan(2 * one - 1e-6);
  });
  it('Mirror Vein: büyücü düşman varken kan değeri (vein terimi) > 0, yalnız fiziksel düşmanda 0; kalkan değeri shield teriminde', () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' });
    const me = P(b);
    const foe = E(b);
    foe.mp = foe.maxMp;
    me.blood = BB.start;
    const c = best(b, me.uid, 'spell_ward');
    expect(c?.terms?.vein ?? 0).toBeGreaterThan(0);
    const p = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'warrior' });
    P(p).blood = BB.start;
    expect(best(p, P(p).uid, 'spell_ward')?.terms?.vein ?? 0).toBe(0);
  });
  it('Mirror Vein: bar doluyken (bedel sonrası boşluk küçük) kan değeri düşer; dostlar zaten bu kalkanı taşıyorsa 0', () => {
    const b = make({ 0: 'antimage', 1: 'warrior', 2: 'archer' }, { 0: 'mage', 1: 'mage' });
    const me = P(b);
    for (const f of b.living('enemy')) f.mp = f.maxMp;
    me.blood = 30;
    const low = best(b, me.uid, 'spell_ward')?.terms?.vein ?? 0;
    me.blood = BB.max;
    const full = best(b, me.uid, 'spell_ward')?.terms?.vein ?? 0;
    expect(low).toBeGreaterThan(0);
    expect(full).toBeLessThanOrEqual(low);
    for (const a of b.living('party')) a.shieldHooks = [{ skill: 'spell_ward', caster: me.uid, magic: false, amount: 5, onAbsorb: {}, turns: 2 }];
    me.blood = 30;
    expect(best(b, me.uid, 'spell_ward')?.terms?.vein ?? 0).toBe(0);
  });
  it('YZ ile tam savaşlar (iki mod) çökmeden biter, belirleyici; Redtithe kan skilllerini kullanır', () => {
    let used = 0;
    for (const mode of ['turns', 'test'] as const) {
      for (let seed = 1; seed <= 3; seed++) {
        const run = () => {
          const setup = content.battleSetup('random-battle', seed, mode, { party: ['antimage', 'warrior', 'mage', 'paladin'], enemies: ['mage', 'antimage', 'hexer', 'defender'] });
          const b = new Battle(setup);
          for (let i = 0; i < 600 && !b.winner; i++) {
            if (mode === 'turns') {
              const uid = b.currentUid!;
              b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
            } else {
              const live = b.combatants.filter((c) => c.hp > 0);
              const actor = live[i % live.length]!;
              const choice = chooseAction(b, actor.uid, content.aiConfig);
              if (choice && !b.globalDef(choice.skillId)) b.applyChoice(actor.uid, choice);
            }
          }
          return b.log;
        };
        const a = run();
        expect(JSON.stringify(run()), `${mode} ${seed}`).toBe(JSON.stringify(a));
        if (mode === 'turns') expect(a.some((e) => e.type === 'battleEnd'), `seed ${seed}`).toBe(true);
        used += a.filter((e) => e.type === 'skillUsed' && ['drain_field', 'spell_ward', 'void_strike'].includes(e.skill)).length;
      }
    }
    expect(used).toBeGreaterThan(0);
  });
});
