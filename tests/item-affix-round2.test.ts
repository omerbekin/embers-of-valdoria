import { describe, expect, it } from 'vitest';
import { Battle, content, manaShieldNeed, manaShieldPay, previewSkill, type BattleEvent, type BattleMode, type ItemEffects, type Teams, type UnitSetup } from '../src/engine';
import { affixLines } from '../src/progression/item-text';
import { ITEMS, affixDef, affixValues, validateItems, type ItemInstance } from '../src/progression/items';
import { loadout } from '../src/progression/loadout';

// Yeni affix turu 2 (Ömer 2026-10-24, item-effects.md "Yeni affix turu 2"): 9 affix, veri eşlemesi (loadout) + motor kancaları. Sayılar provizyon;
// testler kuralı denetler (iska kapalı; sayılar veriden).

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, enemyUnits: Record<number, UnitSetup> = {}, mode: BattleMode = 'test', seed = 11): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: enemyUnits } };
  const b = new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
  b.debug.dodge = 'never';
  return b;
};
const fx = (e: ItemEffects, extra: UnitSetup = {}): UnitSetup => ({ ...extra, itemEffects: e });
const unit = (b: Battle, uid: string) => b.combatants.find((c) => c.uid === uid)!;
type Emit = (e: BattleEvent) => void;
type Priv = { applyHeal: (s: unknown, t: unknown, n: number, crit: boolean, emit: Emit, cause?: string) => number; applyHit: (a: unknown, t: unknown, n: number, ty: string, crit: boolean, emit: Emit, red: boolean, meta: unknown) => number };
const priv = (b: Battle) => b as unknown as Priv;
const warriorAttack = content.classes.warrior!.skills[0]!;
const mageAttack = content.classes.mage!.skills[0]!;
const NEW = ['c_healrecv', 'b_execute', 'b_startshield', 'b_killmp', 'b_killheal', 'b_shred', 'a_manashield', 'a_cdchance', 'a_overkill'];
/** Tek affix'li örnek (ilvl 10, orta zar). */
const inst = (base: string, affix: string, uid = 'x'): ItemInstance => ({ uid, id: base, rolls: { rarity: 'common', ilvl: 10, affixes: [{ id: affix, q: 0.5 }] } });
const v = (affix: string, i = 0) => affixValues(affix, 10, 0.5)[i]!;
const ofType = <T extends BattleEvent['type']>(b: Battle, t: T) => b.log.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === t);

describe('affix turu 2: veri', () => {
  it('9 affix veride; kademe, yuva, needs ve ilvl 10 orta değerleri Ömer\'in başlangıç sayılarına yakın; doğrulayıcı temiz', () => {
    for (const id of NEW) expect(affixDef(id), id).toBeDefined();
    expect(validateItems().filter((e) => NEW.some((id) => e.includes(`affix ${id}`)))).toEqual([]);
    const want: Record<string, { tier: string; slots: string[]; mid: number; needs?: string }> = {
      c_healrecv: { tier: 'C', slots: ['helm', 'armor'], mid: 8 },
      b_execute: { tier: 'B', slots: ['weapon', 'gloves'], mid: 12 },
      b_startshield: { tier: 'B', slots: ['offhand', 'armor'], mid: 8 },
      b_killmp: { tier: 'B', slots: ['gloves', 'trinket'], mid: 4, needs: 'mp' },
      b_killheal: { tier: 'B', slots: ['armor', 'trinket'], mid: 4 },
      b_shred: { tier: 'B', slots: ['weapon'], mid: 5 },
      a_manashield: { tier: 'A', slots: ['armor', 'helm'], mid: 15, needs: 'mp' },
      a_cdchance: { tier: 'A', slots: ['helm', 'gloves', 'trinket'], mid: 12 },
      a_overkill: { tier: 'A', slots: ['weapon'], mid: 40 },
    };
    for (const [id, w] of Object.entries(want)) {
      const a = ITEMS.affixDefs[id]!;
      expect(a.tier, id).toBe(w.tier);
      expect(a.slots, id).toEqual(w.slots);
      expect(a.needs, id).toBe(w.needs);
      expect(Math.abs(v(id) - w.mid), `${id} ${v(id)}`).toBeLessThanOrEqual(1);
    }
  });

  it('loadout eşlemesi: fx kancaları (Bitirici eşiği parçadan; Hazır kalkan = startShieldRatio)', () => {
    const fxOf = (slot: string, base: string, id: string) => loadout({ class: 'mage', equipment: { [slot]: inst(base, id) } }).itemEffects!;
    expect(fxOf('helm', 'leather_coif', 'c_healrecv').healReceived).toBeCloseTo(v('c_healrecv') / 100, 6);
    expect(fxOf('gloves', 'work_gloves', 'b_execute').executeDamage).toEqual({ below: 0.3, bonus: expect.closeTo(v('b_execute') / 100, 6) });
    expect(fxOf('armor', 'padded_gambeson', 'b_startshield').startShieldRatio).toBeCloseTo(v('b_startshield') / 100, 6);
    expect(fxOf('gloves', 'work_gloves', 'b_killmp').killMp).toBeCloseTo(v('b_killmp'), 6);
    expect(fxOf('armor', 'padded_gambeson', 'b_killheal').killHeal).toBeCloseTo(v('b_killheal') / 100, 6);
    expect(fxOf('armor', 'padded_gambeson', 'a_manashield').manaShield).toBeCloseTo(v('a_manashield') / 100, 6);
    expect(fxOf('helm', 'leather_coif', 'a_cdchance').cdChance).toBeCloseTo(v('a_cdchance') / 100, 6);
    // Bitirici iki kaynakta ÇARPILIR ("more" yazımı)
    const two = loadout({ class: 'warrior', equipment: { gloves: inst('work_gloves', 'b_execute', 'g'), helm: undefined } }).itemEffects!.executeDamage!;
    expect(two.below).toBe(0.3);
    expect(affixLines(inst('work_gloves', 'b_execute'))[0]!.text).toBe(`${v('b_execute')}% more damage to enemies below 30% HP`);
    expect(affixLines(inst('work_gloves', 'b_killmp'))[0]!.text).toBe(`+${v('b_killmp')} MP when your skill kills an enemy`);
  });

  it('Shredded durumu veride: debuff, yığın sınırı ve süre; Omen yığını değil (maxStacks yok)', () => {
    const d = content.statuses.shredded!;
    expect(d.name).toBe('Shredded');
    expect(d.type).toBe('debuff');
    expect(d.stackLimit).toBe(3);
    expect(d.duration).toBe(2);
    expect(d.maxStacks).toBeUndefined();
  });
});

describe('affix turu 2: motor kancaları', () => {
  it('Gelen şifa: applyHeal (leech dahil) büyür; tur başı düz can yenilenmesi (hpRegen) büyümez', () => {
    const heal = (recv: number) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ healReceived: recv }, { startHpRatio: 0.2 }) });
      const ev: BattleEvent[] = [];
      return priv(b).applyHeal(unit(b, 'enemy-0'), unit(b, 'party-0'), 20, false, (e) => ev.push(e));
    };
    expect(heal(0)).toBe(20);
    expect(heal(0.5)).toBe(30);
    const leech = (recv: number) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ leech: 0.5, healReceived: recv }, { startHpRatio: 0.2 }) });
      b.useSkill('party-0', warriorAttack, 'enemy-0');
      return ofType(b, 'heal').find((e) => e.cause === 'leech')!.amount;
    };
    expect(leech(1)).toBeGreaterThan(leech(0));
    // hpRegen: turns modunda ilk tur başında (party-0 en hızlı)
    const regen = (recv: number) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ healReceived: recv }, { startHpRatio: 0.2, modifiers: { spdMult: 3, hpRegenAdd: 10 } }) }, {}, 'turns');
      expect(b.currentUid).toBe('party-0');
      return ofType(b, 'heal').find((e) => e.target === 'party-0' && e.source === 'party-0')!.amount;
    };
    expect(regen(1)).toBe(regen(0));
  });

  it('Bitirici: canı eşiğin altındaki düşmana daha çok hasar (önizleme = gerçek çarpan); üstündekine aynı', () => {
    const avg = (bonus: number, hpRatio: number) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx(bonus ? { executeDamage: { below: 0.3, bonus } } : {}) }, { 0: { startHpRatio: hpRatio } });
      return previewSkill(b, 'party-0', warriorAttack, 'enemy-0')[0]!.damage!.avg;
    };
    expect(avg(0.5, 0.2)).toBeGreaterThan(avg(0, 0.2));
    expect(avg(0.5, 0.5)).toBe(avg(0, 0.5));
  });

  it('Hazır kalkan: savaşa maks canın oranı kalkanla başlar; Shield power değiştirmez', () => {
    const shield = (shieldPowerAdd: number) => {
      const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ startShieldRatio: 0.08 }, { modifiers: { shieldPowerAdd } }) });
      const u = unit(b, 'party-0');
      return { shield: u.shield, want: Math.round(u.maxHp * 0.08) };
    };
    expect(shield(0).shield).toBe(shield(0).want);
    expect(shield(1).shield).toBe(shield(1).want);
  });

  it('Ruh hasadı: skill ile düşman öldürünce MP (mpRegen cause soul_harvest); maks MP tavanı; öldürmeyen vuruşta yok', () => {
    const run = (startMpRatio: number, enemyHp: number) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior', 1: 'warrior' }, { 0: fx({ killMp: 4 }, { startMpRatio }) }, { 0: { startHp: enemyHp } });
      b.useSkill('party-0', mageAttack, 'enemy-0');
      return { b, gains: ofType(b, 'mpRegen').filter((e) => e.cause === 'soul_harvest') };
    };
    const kill = run(0.2, 1);
    expect(kill.gains.length).toBe(1);
    expect(kill.gains[0]!.amount).toBe(4);
    const full = run(1, 1);
    const u = unit(full.b, 'party-0');
    expect(u.mp).toBeLessThanOrEqual(u.maxMp);
    expect(full.gains.every((g) => g.after <= u.maxMp)).toBe(true);
    expect(run(0.2, 9999).gains.length).toBe(0);
  });

  it('Zafer nefesi: skill ile düşman öldürünce maks canın oranı şifa (cause victors_breath)', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage' }, { 0: fx({ killHeal: 0.04 }, { startHpRatio: 0.3 }) }, { 0: { startHp: 1 } });
    b.useSkill('party-0', warriorAttack, 'enemy-0');
    const h = ofType(b, 'heal').filter((e) => e.cause === 'victors_breath');
    expect(h.length).toBe(1);
    expect(h[0]!.amount).toBe(Math.round(unit(b, 'party-0').maxHp * 0.04));
  });

  it('Zırh yırtan: her isabet eden vuruş bir Shredded yığını (iki darbeli temel saldırı 2 yığın; en çok 3); direnç durdurur', () => {
    const hits = content.skills[warriorAttack]!.effects.filter((e) => e.type === 'damage').length;
    expect(hits).toBeGreaterThanOrEqual(2); // Warrior temel saldırısı iki darbeli
    const limit = content.statuses.shredded!.stackLimit!;
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, { 0: fx({ armorShred: 5 }) }, { 0: { modifiers: { hpMult: 20, armorAdd: 20 } } });
    const e = unit(b, 'enemy-0');
    const base = b.effectiveStats(e).armor;
    b.useSkill('party-0', warriorAttack, 'enemy-0');
    const st = () => e.statuses.find((s) => s.kind === 'shredded');
    expect(st()?.stacks).toBe(Math.min(limit, hits));
    expect(ofType(b, 'status').filter((x) => (x as { status?: string }).status === 'shredded').length).toBeGreaterThanOrEqual(Math.min(limit, hits));
    expect(st()?.turns).toBe(content.statuses.shredded!.duration);
    expect(b.effectiveStats(e).armor).toBe(Math.max(0, base - 5 * Math.min(limit, hits)));
    for (let i = 0; i < 3; i++) b.useSkill('party-0', warriorAttack, 'enemy-0');
    expect(st()?.stacks).toBe(limit);
    expect(b.effectiveStats(e).armor).toBe(Math.max(0, base - 5 * limit));
    const r = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: fx({ armorShred: 5 }) }, { 0: fx({ debuffAvoid: 1 }) });
    r.useSkill('party-0', warriorAttack, 'enemy-0');
    expect(unit(r, 'enemy-0').statuses.some((s) => s.kind === 'shredded')).toBe(false);
  });

  it('Mana kalkanı: kalkanlardan sonra kalan hasarın oranı MP\'den; MP bitince kalanı cana', () => {
    const hit = (mp: number) => {
      const b = make({ 0: 'mage' }, { 0: 'warrior' }, { 0: fx({ manaShield: 0.15 }) });
      const u = unit(b, 'party-0');
      Object.assign(u, { shield: 0, magicShield: 0, mp, hp: u.maxHp });
      const ev: BattleEvent[] = [];
      const lost = priv(b).applyHit(unit(b, 'enemy-0'), u, 40, 'physical', false, (e) => ev.push(e), false, { origin: 'skill', element: 'physical', damageType: 'physical' });
      return { lost, mp: u.mp, burn: ev.find((e) => e.type === 'manaBurn') };
    };
    const full = hit(30);
    expect(full.lost).toBe(34);
    expect(full.mp).toBe(24);
    expect(full.burn).toMatchObject({ amount: 6, cause: 'mana_shield' });
    const low = hit(2);
    expect(low.lost).toBe(38);
    expect(low.mp).toBe(0);
  });

  it('Mana kalkanı: önizleme ve AI ölümcül tahmini MP payını görür (ortak yardımcı manaShieldPay / manaShieldNeed)', () => {
    const setup = (ms: number, mp: number) => {
      const b = make({ 0: 'warrior' }, { 0: 'mage' }, {}, { 0: fx({ manaShield: ms }) });
      const t = unit(b, 'enemy-0');
      Object.assign(t, { shield: 0, magicShield: 0, mp, hp: t.maxHp });
      return { b, t, d: previewSkill(b, 'party-0', warriorAttack, 'enemy-0').find((x) => x.uid === 'enemy-0')!.damage! };
    };
    const off = setup(0, 50);
    const on = setup(0.5, 9999);
    // aynı ham hasar; kalkanlı hedefte cana giden kısım yaklaşık yarı (vuruş başına yuvarlama)
    expect(on.d.avg).toBe(off.d.avg);
    expect(on.d.hpLoss).toBeLessThan(off.d.hpLoss);
    expect(Math.abs(on.d.hpLoss - off.d.hpLoss / 2)).toBeLessThanOrEqual(2);
    // MP yoksa fark yok
    expect(setup(0.5, 0).d.hpLoss).toBe(off.d.hpLoss);
    // Ölümcül işareti: canı en yüksek vuruşun %60'ı olan hedef kalkansız ölebilir, kalkanlıda (bol MP, cana ~yarısı) ölmez
    const lethalAt = (ms: number, mp: number) => {
      const s0 = setup(ms, mp);
      s0.t.hp = Math.ceil(off.d.hpLossMax * 0.6);
      return previewSkill(s0.b, 'party-0', warriorAttack, 'enemy-0').find((x) => x.uid === 'enemy-0')!.damage!.lethal;
    };
    expect(lethalAt(0, 50)).not.toBeNull();
    expect(lethalAt(0.5, 9999)).toBeNull();
    // manaShieldNeed motorla aynı: gereken hasar, MP payı düşülünce canı tam bitirir; MP sınırı hp + mp
    const t = setup(0.3, 10).t;
    const need = manaShieldNeed(t, 40, 10);
    expect(need - manaShieldPay(t, need, 10)).toBeGreaterThanOrEqual(40);
    expect(need - 1 - manaShieldPay(t, need - 1, 10)).toBeLessThan(40);
    expect(need).toBe(50);
    const big = manaShieldNeed(t, 40, 100); // MP bol: ~40 / 0.7, yuvarlama dahil en küçük değer
    expect(big - manaShieldPay(t, big, 100)).toBeGreaterThanOrEqual(40);
    expect(big - 1 - manaShieldPay(t, big - 1, 100)).toBeLessThan(40);
    expect(manaShieldNeed({}, 40, 100)).toBe(40);
  });

  it('Akıcı: cooldown\'lu skill\'in cooldown\'u 1 tur kısa başlar; ultimate etkilenmez; etki yoksa tam', () => {
    const b0 = make({ 0: 'archer' }, { 0: 'defender' }, { 0: { startMpRatio: 1, modifiers: { spdMult: 3 } } }, { 0: { modifiers: { hpMult: 20 } } }, 'turns');
    const kit = unit(b0, 'party-0').skills;
    const cdAfter = (chance: number, skillId: string) => {
      const b = make({ 0: 'archer' }, { 0: 'defender' }, { 0: fx({ cdChance: chance }, { startMpRatio: 1, modifiers: { spdMult: 3 } }) }, { 0: { modifiers: { hpMult: 20 } } }, 'turns');
      const u = unit(b, 'party-0');
      expect(b.currentUid).toBe('party-0');
      u.cooldowns = {};
      const r = b.useSkill('party-0', skillId, b.validTargets('party-0', skillId)[0]?.uid);
      expect(r.ok, `${skillId} ${'reason' in r ? String(r.reason) : ''} [${u.skills.join(',')}]`).toBe(true);
      return { cd: u.cooldowns[skillId] ?? 0, fluid: b.log.some((e) => e.type === 'passive' && e.passive === 'fluid') };
    };
    const normal = kit.find((id) => (content.skills[id]!.cooldown ?? 0) >= 2 && !(content.skills[id]!.initialCooldown ?? 0) && b0.validTargets('party-0', id).length > 0)!;
    const ult = kit.find((id) => (content.skills[id]!.initialCooldown ?? 0) > 0 && b0.validTargets('party-0', id).length > 0)!;
    // sıra kullanımdan sonra archer'e dönüp sayacı azaltmış olabilir: karşılaştırma aynı akışın etkisiz koşusuyla
    const full = cdAfter(0, normal);
    expect(full.cd).toBeGreaterThan(0);
    expect(full.fluid).toBe(false);
    const short = cdAfter(1, normal);
    expect(short.cd).toBe(full.cd - 1);
    expect(short.fluid).toBe(true);
    const u = cdAfter(1, ult);
    expect(u.cd).toBe(cdAfter(0, ult).cd);
    expect(u.fluid).toBe(false);
  });

  it('Taşan hasar: öldüren vuruşun fazlasının oranı en yakın düşmana; zincirlenmez, vuruş kancası (leech) tetiklemez', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage', 3: 'mage' }, { 0: fx({ overkillSpill: 0.4, leech: 1 }, { startHpRatio: 0.3 }) }, { 0: { startHp: 1 }, 1: { startHp: 1 }, 3: { startHp: 1 } });
    for (const c of b.combatants) if (c.side === 'enemy') Object.assign(c, { shield: 0, magicShield: 0 });
    const near = b.nearestLivingAlly(unit(b, 'enemy-0'), true)!.uid;
    b.useSkill('party-0', warriorAttack, 'enemy-0');
    const dmg = ofType(b, 'damage').filter((e) => e.source === 'party-0');
    expect(dmg.length).toBe(2); // asıl vuruş + tek taşma (taşmanın öldürmesi yeniden taşmaz)
    const main = dmg[0]!;
    expect(main.target).toBe('enemy-0');
    expect(dmg[1]!.amount).toBe(Math.round((main.amount - 1) * 0.4));
    expect(dmg[1]!.target).toBe(near);
    expect(b.log.some((e) => e.type === 'passive' && e.passive === 'overflow')).toBe(true);
    expect(ofType(b, 'heal').filter((e) => e.cause === 'leech').length).toBe(1);
    // etki yoksa taşma yok
    const plain = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage' }, {}, { 0: { startHp: 1 } });
    plain.useSkill('party-0', warriorAttack, 'enemy-0');
    expect(ofType(plain, 'damage').filter((e) => e.source === 'party-0').length).toBe(1);
  });
});
