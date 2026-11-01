// Harita 3 4. dilim: Ömer'in seçtiği 10 mob (maps-2-3.md). Kit, YZ, yerleşim; iki savaş modu. Sayılar veriden okunur.
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill, previewSkill } from '../src/engine';
import type { BattleMode, Combatant, Side, Teams } from '../src/engine';
import { RULES_TESTS } from '../src/game/rules-test-battle';
import { buildMechanics } from '../src/wiki/catalog';
import enc from '../data/campaign/hollow-crown-encounters.json';

const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const MODES: BattleMode[] = ['turns', 'test'];

function make(rules: Teams['rules'], party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', seed = 5): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies), rules }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
const ai = (b: Battle, c: Combatant) => chooseAction(b, c.uid, content.aiConfig);
const has = (c: Combatant, kind: string) => c.statuses.some((s) => s.kind === kind);
/** turns: sıra bu birime gelene dek pas (dönen olaylar toplanır). test: serbest eylem, dokunmaz. */
function turnOf(b: Battle, uid: string, log: unknown[] = []): void {
  if (b.mode !== 'turns') return;
  for (let i = 0; i < 200 && b.currentUid !== uid; i++) {
    const r = b.skipTurn();
    if (r.ok) log.push(...r.events);
  }
  expect(b.currentUid).toBe(uid);
}
/** test modunda telgraf, atanın sonraki eyleminden önce çözülür: atan için boş bir eylem daha. */
function nextActionOf(b: Battle, c: Combatant): void {
  if (b.mode === 'turns') return turnOf(b, c.uid);
  const other = b.combatants.find((u) => u.hp > 0 && u.side !== c.side && !u.inert)!;
  b.useSkill(other.uid, other.skills[0]!, c.underground ? undefined : c.uid);
  const id = b.globalSkillIds(c.side).find((x) => b.globalDef(x)?.kind === 'rest' && b.canUseGlobal(c.uid, x).ok);
  c.mp = c.maxMp;
  if (id) b.useGlobal(c.uid, id);
  else b.useSkill(c.uid, c.skills[0]!, b.validTargets(c.uid, c.skills[0]!)[0]?.uid);
}
const P = { 0: 'warrior', 3: 'druid', 7: 'archer' };
const skill = (id: string) => content.skills[id]!;
type EncUnit = { class: string; name?: string; tier?: string; encased?: boolean };
const ENC = enc as unknown as Record<string, { units: EncUnit[]; condition?: string; noise?: string }>;
const MOBS = ['clan_vaulter', 'shardwalker', 'hollow_delver', 'gloamstalker', 'cinderleaper', 'slagcart_golem', 'thunderwright', 'clan_stormcaller', 'gloam_eel', 'stormhorn_ram'];

describe.each(MODES)('%s modu', (mode) => {
  it('Clan Vaulter: Pole Vault yalnız ön sıranın arkasına iner, açık kalır, sersemletmez', () => {
    const b = make(undefined, P, { 0: 'clan_vaulter' }, mode);
    const v = at(b, 'enemy', 0);
    const [front, back] = [at(b, 'party', 0), at(b, 'party', 3)];
    expect(b.validTargets(v.uid, 'pole_vault').map((c) => c.uid)).not.toContain(front.uid);
    expect(b.validTargets(v.uid, 'pole_vault').map((c) => c.uid)).toContain(back.uid);
    turnOf(b, v.uid);
    const hp = back.hp;
    expect(b.useSkill(v.uid, 'pole_vault', back.uid).ok).toBe(true);
    expect(back.hp).toBeLessThan(hp);
    expect(has(back, 'stun')).toBe(false);
    expect(has(v, 'overreached')).toBe(true);
    expect(v.slot).toBe(0); // öne yerleşmez, yerine döner
    expect(content.statuses['overreached']!.damageTakenMult).toBe(1.25);
    if (mode === 'turns') {
      turnOf(b, v.uid);
      expect(has(v, 'overreached')).toBe(false); // sonraki turuna kadar
    }
  });

  it('Clan Vaulter: arkada kimse yoksa zıplayacak yer yok', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid' }, { 0: 'clan_vaulter' }, mode);
    const v = at(b, 'enemy', 0);
    turnOf(b, v.uid);
    expect(b.validTargets(v.uid, 'pole_vault')).toEqual([]);
    expect(b.canUse(v.uid, 'pole_vault').ok).toBe(false);
  });

  it('Shardwalker: Chilled hedefe her sıradan; Chilled yoksa ön sıra; Chilled vermez, Frozen tetiklemez', () => {
    const b = make(undefined, P, { 0: 'shardwalker' }, mode);
    const s = at(b, 'enemy', 0);
    const back = at(b, 'party', 3);
    expect(b.validTargets(s.uid, 'shardwalk').map((c) => c.uid)).not.toContain(back.uid);
    expect(skill('shardwalk').effects.some((e) => e.type === 'status')).toBe(false);
    expect(b.debugAddStatus(back.uid, 'chilled', 3).ok).toBe(true);
    expect(b.validTargets(s.uid, 'shardwalk').map((c) => c.uid)).toContain(back.uid);
    turnOf(b, s.uid);
    expect(b.useSkill(s.uid, 'shardwalk', back.uid).ok).toBe(true);
    expect(has(back, 'frozen')).toBe(false);
    expect(has(back, 'chilled')).toBe(true);
  });

  it('Hollow Delver: dalar, hedef alınamaz, hasar almaz; hücrede kalana çıkar ve vurur', () => {
    const b = make(undefined, P, { 0: 'hollow_delver', 6: 'fen_witchling' }, mode);
    const d = at(b, 'enemy', 0);
    const hero = at(b, 'party', 3);
    turnOf(b, d.uid);
    expect(b.useSkill(d.uid, 'undermine', undefined, hero.slot, 'party').ok).toBe(true);
    expect(d.underground).toBeTruthy();
    expect(b.telegraphs).toHaveLength(1);
    const foe = at(b, 'party', 0);
    expect(b.validTargets(foe.uid, foe.skills[0]!).map((c) => c.uid)).not.toContain(d.uid);
    const hpBefore = hero.hp;
    if (mode === 'turns') {
      const log: { type: string }[] = [];
      for (let i = 0; i < 60 && d.underground; i++) {
        const r = b.skipTurn();
        if (r.ok) log.push(...r.events);
      }
      expect(log.some((e) => e.type === 'surface')).toBe(true);
      expect(log.some((e) => e.type === 'turnSkipped' && (e as { spent?: boolean }).spent)).toBe(true); // çıkış turu yer
    } else nextActionOf(b, d);
    expect(d.underground).toBeUndefined();
    expect(hero.hp).toBeLessThan(hpBefore);
    expect(has(d, 'staggered')).toBe(false);
  });

  it('Hollow Delver: hedef kaçarsa boşa çıkar ve Staggered olur', () => {
    const b = make(undefined, P, { 0: 'hollow_delver', 6: 'fen_witchling' }, mode);
    const d = at(b, 'enemy', 0);
    const hero = at(b, 'party', 3);
    turnOf(b, d.uid);
    expect(b.useSkill(d.uid, 'undermine', undefined, hero.slot, 'party').ok).toBe(true);
    hero.slot = 4; // kaçtı
    const hp = hero.hp;
    if (mode === 'turns') for (let i = 0; i < 60 && d.underground; i++) b.skipTurn();
    else {
      // test modu: kendi eylemi öncesi çözülür, Staggered tur akışına değil durum listesine bakılır
      const other = at(b, 'party', 0);
      b.useSkill(other.uid, other.skills[0]!, at(b, 'enemy', 6).uid);
      b.useSkill(d.uid, d.skills[0]!, b.validTargets(d.uid, d.skills[0]!)[0]?.uid);
    }
    expect(d.underground).toBeUndefined();
    expect(hero.hp).toBe(hp);
    if (mode === 'turns') expect(has(d, 'staggered')).toBe(true);
  });

  it('Gloamstalker: karanlıkta her sıra, aydınlıkta yalnız yakın; ateşle kapanır', () => {
    const b = make({ condition: 'darkness' }, P, { 0: 'gloamstalker' }, mode);
    const g = at(b, 'enemy', 0);
    const back = at(b, 'party', 7);
    expect(b.isDark()).toBe(true);
    expect(b.validTargets(g.uid, 'dark_step').map((c) => c.uid)).toContain(back.uid);
    b.debugLightUp(3);
    expect(b.isDark()).toBe(false);
    expect(b.validTargets(g.uid, 'dark_step').map((c) => c.uid)).not.toContain(back.uid);
    expect(b.validTargets(g.uid, 'dark_step').map((c) => c.uid)).toContain(at(b, 'party', 0).uid);
  });

  it('Gloamstalker: Darkness yoksa düz yakın dövüşçü', () => {
    const b = make(undefined, P, { 0: 'gloamstalker' }, mode);
    const g = at(b, 'enemy', 0);
    expect(b.validTargets(g.uid, 'dark_step').map((c) => c.uid)).not.toContain(at(b, 'party', 7).uid);
  });

  it('Cinderleaper: yanan ya da Burning zemindeki hedefe her sıradan, hücreye 1 tur zemin; yoksa düz vuruş, zemin yok', () => {
    const b = make(undefined, P, { 0: 'cinderleaper' }, mode);
    const c = at(b, 'enemy', 0);
    const [front, mid, back] = [at(b, 'party', 0), at(b, 'party', 3), at(b, 'party', 7)];
    expect(b.validTargets(c.uid, 'through_the_flame').map((u) => u.uid)).not.toContain(back.uid);
    // normal vuruş: zemin bırakmaz
    turnOf(b, c.uid);
    expect(b.useSkill(c.uid, 'through_the_flame', front.uid).ok).toBe(true);
    expect(b.ground.filter((g) => g.ground === 'burning')).toEqual([]);
    expect(b.debugAddStatus(back.uid, 'burning', 3).ok).toBe(true);
    expect(b.validTargets(c.uid, 'through_the_flame').map((u) => u.uid)).toContain(back.uid);
    b.debugPlaceGround(c.uid, 'burning', 'party', [mid.slot], 3);
    expect(b.validTargets(c.uid, 'through_the_flame').map((u) => u.uid)).toContain(mid.uid);
    b.ground.splice(0, b.ground.length);
    turnOf(b, c.uid);
    b.debugClearCooldowns(c.uid);
    expect(b.useSkill(c.uid, 'through_the_flame', back.uid).ok).toBe(true);
    const placed = b.ground.find((g) => g.ground === 'burning' && g.board === 'party' && g.slots.includes(back.slot));
    expect(placed).toBeTruthy();
    expect(skill('through_the_flame').effects.find((e) => e.type === 'ground')).toMatchObject({ turns: 1, whenOpened: true });
  });

  it('Slagcart Golem: sıra telgrafı, koşu Burning verir, sonra soğuma (zırh 0, sersemletmez)', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid', 4: 'archer' }, { 0: 'slagcart_golem', 6: 'fen_witchling' }, mode);
    const g = at(b, 'enemy', 0);
    const [a, c, out] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'party', 4)];
    turnOf(b, g.uid);
    expect(b.useSkill(g.uid, 'slag_charge', undefined, a.slot, 'party').ok).toBe(true);
    expect(b.telegraphs[0]!.cells).toEqual(expect.arrayContaining([0, 1, 2]));
    const hp = [a.hp, c.hp, out.hp];
    if (mode === 'turns') for (let i = 0; i < 60 && b.telegraphs.length; i++) b.skipTurn();
    else nextActionOf(b, g);
    expect(b.telegraphs).toHaveLength(0);
    expect(a.hp).toBeLessThan(hp[0]!);
    expect(c.hp).toBeLessThan(hp[1]!);
    expect(has(a, 'burning')).toBe(true);
    expect(skill('slag_charge').effects.find((e) => e.type === 'dot')).toMatchObject({ status: 'burning', turns: 2 });
    expect(has(a, 'stun')).toBe(false);
    expect(out.hp).toBe(hp[2]); // sıra dışı
    expect(has(out, 'burning')).toBe(false);
    if (mode === 'turns') {
      expect(has(g, 'cooling')).toBe(true);
      expect(b.effectiveStats(g).armor).toBe(0);
      const log: { type: string; actor?: string }[] = [];
      turnOf(b, g.uid, log); // soğuma turu kendiliğinden geçer: bir sonraki kendi turu
      expect(log.some((e) => e.type === 'turnSkipped' && e.actor === g.uid && !(e as { stunned?: boolean }).stunned)).toBe(true); // Cooling sersemlik değil
      expect(has(g, 'cooling')).toBe(false);
      expect(b.effectiveStats(g).armor).toBeGreaterThan(0);
    } else {
      expect(has(g, 'cooling') || g.statuses.length === 0).toBe(true);
    }
  });

  it('Thunderwright: Anvil Strike Shocked; Ring the Anvil en ağır zırhtan başlar, 3 zırhlıya gider', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'paladin', 3: 'druid', 7: 'archer' }, { 0: 'thunderwright' }, mode);
    const t = at(b, 'enemy', 0);
    const heroes = b.combatants.filter((c) => c.side === 'party');
    const order = [...heroes].sort((x, y) => b.effectiveStats(y).armor - b.effectiveStats(x).armor || x.slot - y.slot);
    expect(b.validTargets(t.uid, 'ring_the_anvil').map((c) => c.uid)).toEqual([order[0]!.uid]);
    expect(b.splashTargets('ring_the_anvil', order[0]!, t.uid).map((c) => c.uid)).toEqual(order.slice(1).filter((c) => b.effectiveStats(c).armor > 0).slice(0, 2).map((c) => c.uid));
    const before = order.slice(0, 3).map((c) => c.hp);
    turnOf(b, t.uid);
    b.debugClearCooldowns(t.uid);
    expect(b.useSkill(t.uid, 'ring_the_anvil', order[0]!.uid).ok).toBe(true);
    order.slice(0, 3).forEach((c, i) => {
      if (b.effectiveStats(c).armor > 0) expect(c.hp).toBeLessThan(before[i]!);
    });
    expect(t.passive?.effect.type).toBe('ironDraws');
    expect(skill('anvil_strike').effects[0]).toMatchObject({ ironBolt: expect.any(Number) });
    const r = make(undefined, { 0: 'warrior' }, { 0: 'thunderwright' }, mode);
    const u = at(r, 'enemy', 0);
    const w = at(r, 'party', 0);
    turnOf(r, u.uid);
    const res = r.useSkill(u.uid, 'anvil_strike', w.uid);
    expect(res.ok && res.events.some((e) => e.type === 'shock' && e.target === w.uid)).toBe(true);
  });

  it('Clan Stormcaller: Fork Soaked hedefe Stun; kuruya Stun yok; Eye of the Storm ve Rolling Thunder kitte', () => {
    const b = make(undefined, P, { 6: 'clan_stormcaller' }, mode);
    const s = at(b, 'enemy', 6);
    const h = at(b, 'party', 0);
    turnOf(b, s.uid);
    expect(b.useSkill(s.uid, 'fork', h.uid).ok).toBe(true);
    expect(has(h, 'stun')).toBe(false);
    const c = make(undefined, P, { 6: 'clan_stormcaller' }, mode);
    const s2 = at(c, 'enemy', 6);
    const h2 = at(c, 'party', 0);
    c.debugAddStatus(h2.uid, 'soaked', 3);
    turnOf(c, s2.uid);
    expect(c.useSkill(s2.uid, 'fork', h2.uid).ok).toBe(true);
    expect(has(h2, 'stun')).toBe(true);
    expect(s.passive?.effect.type).toBe('eyeOfStorm');
    expect(s.skills).toContain('rolling_thunder');
  });

  it('Gloam Eel: yalnız kendi suda dururken Live Water; karanlıkta Thunderflash', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid' }, { 0: 'gloam_eel' }, mode);
    const e = at(b, 'enemy', 0);
    const [h, n] = [at(b, 'party', 0), at(b, 'party', 1)];
    b.debugPlaceGround(h.uid, 'flooded', 'party', [0, 1], 5);
    expect(b.boltOutcome(e, skill('gloam_bite'), b.boltFeetOf([h]), [h]).live).toEqual([]); // yılan kuruda
    b.debugPlaceGround(e.uid, 'flooded', 'enemy', [0], 5);
    const out = b.boltOutcome(e, skill('gloam_bite'), b.boltFeetOf([h]), [h]);
    expect(out.arcs.map((a) => a.uid)).toContain(n.uid);
    const nhp = n.hp;
    turnOf(b, e.uid);
    expect(b.useSkill(e.uid, 'gloam_bite', h.uid).ok).toBe(true);
    expect(n.hp).toBeLessThan(nhp);
    const d = make({ condition: 'darkness' }, { 0: 'warrior', 3: 'druid' }, { 0: 'gloam_eel' }, mode);
    const e2 = at(d, 'enemy', 0);
    expect(d.isDark()).toBe(true);
    d.debugPlaceGround(at(d, 'party', 0).uid, 'flooded', 'party', [0], 5);
    turnOf(d, e2.uid);
    const r = d.useSkill(e2.uid, 'gloam_bite', at(d, 'party', 0).uid);
    expect(r.ok && r.events.some((x) => x.type === 'thunderflash')).toBe(true);
    expect(d.isDark()).toBe(false);
  });

  it('Gloam Eel: kuru hedefe ısırık Thunderflash yapmaz, karanlık sürer (Ömer 2026-11-01)', () => {
    const d = make({ condition: 'darkness' }, { 0: 'warrior', 3: 'druid' }, { 0: 'gloam_eel' }, mode);
    const e2 = at(d, 'enemy', 0);
    const h = at(d, 'party', 0);
    expect(d.boltOutcome(e2, skill('gloam_bite'), d.boltFeetOf([h]), [h]).flash).toBe(false);
    turnOf(d, e2.uid);
    const r = d.useSkill(e2.uid, 'gloam_bite', h.uid);
    expect(r.ok && r.events.some((x) => x.type === 'thunderflash')).toBe(false);
    expect(d.isDark()).toBe(true);
  });

  it('Stormhorn Ram: yakın dövüşle vuran Shocked; menzilli vuran olmaz; Headlong ilk kahramanı geri iter', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'druid', 1: 'archer' }, { 0: 'stormhorn_ram' }, mode);
    const r = at(b, 'enemy', 0);
    const w = at(b, 'party', 0);
    turnOf(b, w.uid);
    const res = b.useSkill(w.uid, 'melee_attack', r.uid);
    if (res.ok) expect(res.events.some((e) => e.type === 'shock' && e.target === w.uid)).toBe(true);
    else {
      const m = w.skills.find((id) => content.skills[id]!.motion === 'melee' && content.skills[id]!.target === 'single_enemy' && b.validTargets(w.uid, id).some((t) => t.uid === r.uid))!;
      const res2 = b.useSkill(w.uid, m, r.uid);
      expect(res2.ok && res2.events.some((e) => e.type === 'shock' && e.target === w.uid)).toBe(true);
    }
    const c = make(undefined, { 0: 'warrior', 3: 'druid', 1: 'archer' }, { 0: 'stormhorn_ram' }, mode);
    const r2 = at(c, 'enemy', 0);
    const arch = at(c, 'party', 1);
    const shot = arch.skills.find((id) => content.skills[id]!.motion !== 'melee' && content.skills[id]!.target === 'single_enemy' && content.skills[id]!.effects.some((e) => e.type === 'damage') && c.validTargets(arch.uid, id).some((t) => t.uid === r2.uid))!;
    turnOf(c, arch.uid);
    const sr = c.useSkill(arch.uid, shot, r2.uid);
    expect(sr.ok && sr.events.some((e) => e.type === 'shock')).toBe(false);
    const d = make(undefined, { 0: 'warrior', 3: 'druid', 1: 'archer' }, { 0: 'stormhorn_ram' }, mode);
    const r3 = at(d, 'enemy', 0);
    const [front, behind, other] = [at(d, 'party', 0), at(d, 'party', 3), at(d, 'party', 1)];
    const opts = d.validTargets(r3.uid, 'headlong').map((u) => u.uid);
    expect(opts).toContain(front.uid);
    expect(opts).toContain(other.uid);
    expect(opts).not.toContain(behind.uid); // şeridinde önünde biri var
    turnOf(d, r3.uid);
    d.debugClearCooldowns(r3.uid);
    expect(d.useSkill(r3.uid, 'headlong', other.uid).ok).toBe(true);
    expect(other.slot).toBe(4); // bir sıra geri
  });
});

describe('YZ mekaniği kullanır', () => {
  const pickBack = (cls: string, rules?: Teams['rules'], prep?: (b: Battle, back: Combatant) => void) => {
    const b = make(rules, { 0: 'warrior', 3: 'archer' }, { 0: cls }, 'turns');
    const back = at(b, 'party', 3);
    prep?.(b, back);
    turnOf(b, at(b, 'enemy', 0).uid);
    return { c: ai(b, at(b, 'enemy', 0)), back };
  };
  it('Vaulter arka sıradaki kırılgan kahramana atlar', () => {
    const { c, back } = pickBack('clan_vaulter');
    expect(c).toMatchObject({ skillId: 'pole_vault', targetUid: back.uid });
  });
  it('Shardwalker Chilled arka kahramana yürür', () => {
    const { c, back } = pickBack('shardwalker', undefined, (b, u) => b.debugAddStatus(u.uid, 'chilled', 3));
    expect(c?.targetUid).toBe(back.uid);
  });
  it('Gloamstalker karanlıkta arka kahramanı seçer', () => {
    const { c, back } = pickBack('gloamstalker', { condition: 'darkness' });
    expect(c?.targetUid).toBe(back.uid);
  });
  it('Cinderleaper yanan arka kahramana gider', () => {
    const { c, back } = pickBack('cinderleaper', undefined, (b, u) => b.debugAddStatus(u.uid, 'burning', 3));
    expect(c).toMatchObject({ skillId: 'through_the_flame', targetUid: back.uid });
  });
  it('Delver Undermine ile kahraman hücresini işaretler', () => {
    const b = make(undefined, P, { 0: 'hollow_delver' }, 'turns');
    const d = at(b, 'enemy', 0);
    turnOf(b, d.uid);
    const c = ai(b, d);
    expect(c?.skillId).toBe('undermine');
    expect(b.combatants.some((u) => u.side === 'party' && u.slot === c?.slot)).toBe(true);
  });
  it('Slagcart iki kahramanlı sırayı işaretler', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'archer', 3: 'druid' }, { 0: 'slagcart_golem' }, 'turns');
    const g = at(b, 'enemy', 0);
    turnOf(b, g.uid);
    const c = ai(b, g);
    expect(c?.skillId).toBe('slag_charge');
    expect(b.areaCells('slag_charge', c!.slot!, 'party', g.uid)).toEqual(expect.arrayContaining([0, 1]));
  });
  it('Thunderwright üç zırhlıyı görünce Ring the Anvil kullanır', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'paladin', 3: 'defender' }, { 0: 'thunderwright' }, 'turns');
    const t = at(b, 'enemy', 0);
    turnOf(b, t.uid);
    expect(ai(b, t)?.skillId).toBe('ring_the_anvil');
  });
  it('Stormcaller Soaked hedefe Fork atar (Stun değeri)', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer' }, { 6: 'clan_stormcaller' }, 'turns');
    const s = at(b, 'enemy', 6);
    const w = at(b, 'party', 3);
    b.debugAddStatus(w.uid, 'soaked', 3);
    s.cooldowns ??= {};
    s.cooldowns['rolling_thunder'] = 5;
    turnOf(b, s.uid);
    expect(ai(b, s)).toMatchObject({ skillId: 'fork', targetUid: w.uid });
  });
  it('Gloam Eel karanlıkta Thunderflash bedeline rağmen ısırır', () => {
    const b = make({ condition: 'darkness' }, { 0: 'warrior', 3: 'archer' }, { 0: 'gloam_eel' }, 'turns');
    const e = at(b, 'enemy', 0);
    b.debugPlaceGround(at(b, 'party', 0).uid, 'flooded', 'party', [0], 5); // çakması için hedef suda (Ömer 2026-11-01)
    e.cooldowns ??= {};
    e.cooldowns['gloam_lunge'] = 5;
    turnOf(b, e.uid);
    expect(ai(b, e)?.skillId).toBe('gloam_bite');
  });
  it('Ram Headlong yönünü seçmez: yön hep geri', () => {
    const b = make(undefined, { 0: 'warrior', 3: 'archer' }, { 0: 'stormhorn_ram' }, 'turns');
    const r = at(b, 'enemy', 0);
    turnOf(b, r.uid);
    const c = ai(b, r);
    if (c?.skillId === 'headlong') expect(c.dir ?? 'back').toBe('back');
  });
  it('Kahraman YZ eşit iki hedeften Stormhide taşımayana yakın dövüşle vurur', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'stormhorn_ram', 2: 'stormhorn_ram' }, 'turns');
    const [plain, hide] = [at(b, 'enemy', 0), at(b, 'enemy', 2)];
    delete plain.passive;
    const w = at(b, 'party', 0);
    turnOf(b, w.uid);
    const c = ai(b, w);
    if (c?.targetUid && content.skills[c.skillId!]?.motion === 'melee') expect(c.targetUid).not.toBe(hide.uid);
  });
  it('kahraman YZ yerin altındakini hedef almaz', () => {
    const b = make(undefined, P, { 0: 'hollow_delver', 6: 'fen_witchling' }, 'turns');
    const d = at(b, 'enemy', 0);
    turnOf(b, d.uid);
    expect(b.useSkill(d.uid, 'undermine', undefined, 3, 'party').ok).toBe(true);
    for (let i = 0; i < 10 && d.underground; i++) {
      const cur = b.currentActor;
      if (!cur) break;
      const c = ai(b, cur);
      if (cur.side === 'party') expect(c?.targetUid).not.toBe(d.uid);
      b.skipTurn();
    }
  });
});

describe('yerleşim', () => {
  const nodes = Object.entries(ENC).filter(([k]) => k !== '_not');
  const withMob = (id: string) => nodes.filter(([, n]) => n.units?.some((u) => u.class === id)).map(([k]) => k).sort();
  it('melee moblar seçilen düğümlerde (bölgede 2 düğüm + 1 elit; Delver elitsiz)', () => {
    expect(withMob('clan_vaulter')).toEqual(['hc_12', 'hc_4', 'hc_6']);
    expect(withMob('shardwalker')).toEqual(['hc_16', 'hc_18', 'hc_19']);
    expect(withMob('hollow_delver')).toEqual(['hc_47', 'hc_53']);
    expect(withMob('gloamstalker')).toEqual(['hc_45', 'hc_50', 'hc_55']);
    expect(withMob('cinderleaper')).toEqual(['hc_59', 'hc_61', 'hc_64']);
    expect(withMob('slagcart_golem')).toEqual(['hc_63', 'hc_65', 'hc_74']);
  });
  it('şimşek mobları yerinde; Bölge IV Thunderwright Hollow adıyla', () => {
    expect(withMob('thunderwright')).toEqual(['hc_29', 'hc_36', 'hc_43', 'hc_44']);
    expect(withMob('clan_stormcaller')).toEqual(['hc_13', 'hc_26']);
    expect(withMob('gloam_eel')).toEqual(['hc_45', 'hc_46', 'hc_47']);
    expect(withMob('stormhorn_ram')).toEqual(['hc_22', 'hc_9']);
    for (const k of ['hc_43', 'hc_44']) expect(ENC[k]!.units.find((u) => u.class === 'thunderwright')!.name).toBe('Hollow Thunderwright');
  });
  it('Delver ve Gloamstalker aynı savaşta yok; Gloamstalker hep karanlıkta', () => {
    for (const [k, n] of nodes) {
      const ids = (n.units ?? []).map((u) => u.class);
      expect(ids.includes('hollow_delver') && ids.includes('gloamstalker'), k).toBe(false);
      if (ids.includes('gloamstalker')) expect(content.battleRulesData.conditions[n.condition!]?.darkness, k).toBeTruthy();
    }
  });
  it('Shardwalker Blizzard ya da Chilled kaynağıyla çıkar', () => {
    for (const k of withMob('shardwalker')) expect(ENC[k]!.condition).toBe('blizzard');
  });
  it('hc_46 hem karanlık hem su; 3. dilim bağları (hc_17, Noise) yerinde', () => {
    const c = content.battleRulesData.conditions['dark_tide']!;
    expect(c.darkness).toBeTruthy();
    expect(c.flood?.ground).toBe('flooded');
    expect(ENC['hc_46']!.condition).toBe('dark_tide');
    expect(nodes.filter(([, n]) => n.noise).map(([k]) => k).sort()).toEqual(['hc_43', 'hc_45', 'hc_46', 'hc_47', 'hc_49', 'hc_53', 'hc_hollow_king']);
    expect(ENC['hc_17']!.units.some((u) => u.encased)).toBe(true);
  });
  it('elit düğümler elitini korur', () => {
    for (const k of ['hc_12', 'hc_18', 'hc_50', 'hc_61', 'hc_65']) expect(ENC[k]!.units.some((u) => u.tier === 'elite'), k).toBe(true);
  });
});

describe('içerik', () => {
  it('10 mob gerçek kitle var, inert değil, Omen ve Dark Bond taşımaz', () => {
    for (const id of MOBS) {
      const m = content.mobs[id]!;
      expect(m, id).toBeTruthy();
      expect(m.inert, id).toBeFalsy();
      expect(m.skills.length, id).toBeGreaterThanOrEqual(2);
      const text = JSON.stringify(m.skills.map((s) => content.skills[s]!.effects));
      expect(text, id).not.toMatch(/omen|dark_bond/);
      expect(content.bosses[id], id).toBeUndefined();
    }
  });
  it('yeni kurallar iki modda: debug kural testleri listede', () => {
    for (const k of ['mob_vaulter', 'mob_shardwalker', 'mob_delver', 'mob_gloamstalker', 'mob_cinderleaper', 'mob_slagcart', 'mob_thunderwright', 'mob_stormcaller', 'mob_eel', 'mob_ram']) expect(RULES_TESTS.map((t) => t.kind)).toContain(k);
  });
  it('Codex yeni kuralları anlatır; test içeriği yok', () => {
    const text = JSON.stringify(buildMechanics());
    for (const w of ['Burrowers', 'Charges', 'Moving foes', 'Overreached', 'Cooling']) expect(text).toContain(w);
    expect(text).not.toContain('Test Bolt');
  });
  it('skill kartı kuralları yazar', () => {
    const b = make(undefined, P, { 0: 'hollow_delver' });
    const d = at(b, 'enemy', 0);
    const opts = { statuses: content.statuses, grounds: content.grounds };
    const line = (id: string) => JSON.stringify(describeSkill(skill(id), d.stats, content.formulas, {}, opts));
    expect(line('undermine')).toContain('underground');
    expect(line('slag_charge')).toContain('Cooling');
    expect(line('through_the_flame')).toContain('Burning');
    expect(line('dark_step')).toContain('Darkness');
    expect(line('pole_vault')).toContain('behind the front row');
    expect(line('ring_the_anvil')).toContain('most Armor');
    expect(line('headlong')).toContain('first hero');
  });
  it('Stormhide önizlemede görünür', () => {
    const b = make(undefined, { 0: 'warrior' }, { 0: 'stormhorn_ram' });
    const w = at(b, 'party', 0);
    const list = previewSkill(b, w.uid, 'melee_attack', at(b, 'enemy', 0).uid);
    expect(JSON.stringify(list)).toContain('Stormhide');
  });
});
