import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, describeSkill, rolledSpeed, roundSpeed } from '../src/engine';
import type { BattleEvent, Combatant, CombatantDef } from '../src/engine';
import { damageSpecFor, type DamageEffect } from '../src/engine/spec';
import {
  autoResolve,
  chooseEvent,
  completeSimple,
  COMPANY_MAX,
  debugEnsureClass,
  debugTeleport,
  eventChoicesFor,
  newCampaign,
  nextStep,
  recruit,
  recruitInTown,
  townRecruitOffer,
} from '../src/campaign/state';
import type { CampaignState } from '../src/campaign/types';
import { CONFIG, EVENTS, getMap } from '../src/campaign/data';
import { debugJumpDrownedReach, debugJumpNode } from '../src/campaign/maps23-debug';
import { ITEMS, canEquip, validateItems } from '../src/progression/items';
import { legendaryPool } from '../src/progression/rare';
import { treeOf, validateTreeData } from '../src/progression/skill-tree-data';
import { buildMechanics } from '../src/wiki/catalog';
import { previewSkill } from '../src/engine';
import { skillCostAmount } from '../src/engine/cost';
import { checkTreeFx, compileTree } from '../src/progression/skill-tree-compile';
import { applyOutcome, battleFor, fightWave, newRun, outcomeFromBattle, wavePlan, type EndlessRun } from '../src/endless';

// Vesper (Ömer onayı 2026-10-28, docs/design/classes/vesper.md): çan sayacı (Pealing Bells), Great Bell, dr19 Sunken Chapel buluşması,
// Clapper of the Sunken Bell ve kışla-yedek kuralı. Sayılar veriden okunur.

const BW = content.classes.vesper!;
const S = content.skills;
const pe = BW.passive!.effect as Extract<NonNullable<CombatantDef['passive']>['effect'], { type: 'pealingBells' }>;
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);
const dmg = (skill: string, i = 0) => S[skill]!.effects.filter((e) => e.type === 'damage')[i] as DamageEffect;

function arena(enemies: [string, number][], seed = 1): Battle {
  const base = content.battleSetup('random-battle', seed, 'test', { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: [BW], partySlots: [7], enemies: enemies.map(([id]) => content.classes[id]!), enemySlots: enemies.map(([, s]) => s) });
  b.freeMp = true;
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0 });
    c.hp = c.maxHp = 5000;
  }
  return b;
}
const me = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party')!;
const foes = (b: Battle): Combatant[] => b.combatants.filter((c) => c.side === 'enemy');
function cast(b: Battle, skill: string, target?: string, slot?: number): BattleEvent[] {
  const r = b.useSkill(me(b).uid, skill, target, slot);
  if (!r.ok) throw new Error(`${skill}: ${r.reason}`);
  return r.events;
}

describe('Vesper class verisi', () => {
  it('INT caster, 4 skill sırası, pasif Pealing Bells %5, staff ailesi + başlangıç asası, ağaç taslağı geçerli', () => {
    expect(BW.name).toBe('Vesper');
    expect(BW.primary).toBe('int');
    expect(BW.skills).toEqual(['toll', 'thunderpeal', 'cracked_bell', 'great_bell_of_valdoria']);
    expect(pe.type).toBe('pealingBells');
    expect(pe.perBell).toBe(0.07);
    expect(ITEMS.weaponFamilies.find((f) => f.id === 'staves')!.classes).toContain('vesper');
    expect(ITEMS.starterWeapons.classes.vesper).toBe('ash_staff');
    expect(validateTreeData(treeOf('vesper')!)).toEqual([]);
    // şifa yok (destek değil)
    for (const id of BW.skills) expect(S[id]!.effects.some((e) => e.type === 'heal' || e.type === 'hot' || e.type === 'shield'), id).toBe(false);
    expect(S.great_bell_of_valdoria!.initialCooldown).toBeGreaterThan(0);
  });

  it('her zaman açık: Quick Battle / Endless / MP havuzu (randomPool), seçilebilir, sefer aday ve bölük havuzu', () => {
    expect(content.randomPool).toContain('vesper');
    expect(content.selectableClasses).toContain('vesper');
    expect(content.battles['random-battle']!.random!.pool).toContain('vesper');
    expect(CONFIG.recruitPool).toContain('vesper');
    expect(CONFIG.companyPool).toContain('vesper');
  });

  it('kart ve pasif metinleri çanı anlatır; Codex Mechanics > Bells makalesi', () => {
    const st = me(arena([['warrior', 0]])).stats;
    expect(describePassive(BW.passive!, st, content.formulas)).toContain('7% more');
    expect(describeSkill(S.toll!, st, content.formulas).lines.join(' ')).toContain('Rings a bell');
    expect(describeSkill(S.great_bell_of_valdoria!, st, content.formulas).lines.join(' ')).toContain('for every bell rung');
    const art = buildMechanics().find((a) => a.id === 'bells');
    expect(art).toBeDefined();
    expect(JSON.stringify(art)).toContain('Toll or Thunderpeal');
  });
});

describe('Vesper skill davranışı', () => {
  it('Toll: tüm düşmanlara kutsal hasar', () => {
    const b = arena([['warrior', 0], ['mage', 4], ['archer', 8]]);
    const hits = ofType(cast(b, 'toll'), 'damage');
    expect(new Set(hits.map((h) => h.target))).toEqual(new Set(foes(b).map((f) => f.uid)));
    expect(hits.every((h) => h.element === 'holy')).toBe(true);
  });

  it('Thunderpeal: yalnızca tek düşman sırası, şimşek + 1 tur Blinded', () => {
    const b = arena([['warrior', 0], ['defender', 1], ['mage', 6]]);
    const ev = cast(b, 'thunderpeal', undefined, 0);
    const hit = new Set(ofType(ev, 'damage').map((h) => h.target));
    const [w, d, m] = foes(b);
    expect(hit.has(w!.uid) && hit.has(d!.uid)).toBe(true);
    expect(hit.has(m!.uid)).toBe(false);
    expect(ofType(ev, 'damage').every((h) => h.element === 'lightning')).toBe(true);
    expect(ofType(ev, 'status').filter((s) => s.status === 'blinded').map((s) => s.target).sort()).toEqual([w!.uid, d!.uid].sort());
  });

  it('Cracked Bell: tek hedef kutsal, Stun şansı veriden; bazı seed’lerde Stun, bazılarında yok', () => {
    const st = S.cracked_bell!.effects.find((e) => e.type === 'status');
    expect(st && st.type === 'status' && st.status === 'stun' && st.chance! > 0 && st.chance! < 1).toBe(true);
    let stuns = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const b = arena([['warrior', 0]], seed);
      const ev = cast(b, 'cracked_bell', foes(b)[0]!.uid);
      expect(ofType(ev, 'damage')[0]!.element).toBe('holy');
      if (ofType(ev, 'status').some((s) => s.status === 'stun')) stuns++;
    }
    expect(stuns).toBeGreaterThan(0);
    expect(stuns).toBeLessThan(30);
  });

  it('Great Bell of Valdoria: her düşmana kutsal + şimşek', () => {
    const b = arena([['warrior', 0], ['mage', 4]]);
    const hits = ofType(cast(b, 'great_bell_of_valdoria'), 'damage');
    for (const f of foes(b)) expect(hits.filter((h) => h.target === f.uid).map((h) => h.element).sort()).toEqual(['holy', 'lightning']);
  });
});

describe('Pealing Bells: çan sayacı ve ölçek', () => {
  it('Toll ve Thunderpeal çan çalar (+1), Cracked Bell ve Great Bell çalmaz; debug oynatması saymaz', () => {
    const b = arena([['warrior', 0]]);
    const u = me(b);
    expect(u.bells ?? 0).toBe(0);
    cast(b, 'toll');
    expect(u.bells).toBe(1);
    cast(b, 'thunderpeal', undefined, 0);
    expect(u.bells).toBe(2);
    cast(b, 'cracked_bell', foes(b)[0]!.uid);
    cast(b, 'great_bell_of_valdoria');
    expect(u.bells).toBe(2);
    b.debugCast(u.uid, 'toll');
    expect(u.bells).toBe(2);
  });

  it('çan vuruşu x(1 + perBell x çan), sınırsız; çalan çan kendi vuruşunu güçlendirmez', () => {
    const b = arena([['warrior', 0]]);
    const u = me(b);
    const t = foes(b)[0]!;
    const at = (n: number, eff: DamageEffect) => {
      u.bells = n;
      return damageSpecFor(u, t, eff, content.formulas).power;
    };
    const base = at(0, dmg('toll'));
    expect(at(3, dmg('toll'))).toBeCloseTo(base * (1 + pe.perBell * 3), 10);
    expect(at(40, dmg('toll'))).toBeCloseTo(base * (1 + pe.perBell * 40), 10); // üst sınır yok
    // Great Bell: güç + powerPerBell x çan, üstüne Pealing Bells çarpanı
    const g = dmg('great_bell_of_valdoria');
    expect(at(4, g) / at(0, g)).toBeCloseTo(((g.power + g.powerPerBell! * 4) / g.power) * (1 + pe.perBell * 4), 10);
    // Toll'un ilk vuruşu 0 çanla hesaplanır: art arda iki Toll'da ikincinin önizleme gücü %5 fazla
    u.bells = 0;
    const p0 = damageSpecFor(u, t, dmg('toll'), content.formulas).power;
    cast(b, 'toll');
    expect(damageSpecFor(u, t, dmg('toll'), content.formulas).power).toBeCloseTo(p0 * (1 + pe.perBell), 10);
  });

  it('pasifi olmayan birimde çan çarpanı yok (yalnızca Great Bell kendi çan payını alır)', () => {
    const b = arena([['warrior', 0]]);
    const u = me(b);
    const t = foes(b)[0]!;
    const passive = u.passive;
    u.passive = undefined;
    u.bells = 5;
    expect(damageSpecFor(u, t, dmg('toll'), content.formulas).power).toBeCloseTo(dmg('toll').power, 10);
    u.passive = passive;
  });

  it('turns modunda YZ oynatır (geçerli hamleler, çanlar birikir), aynı seed aynı sonuç', () => {
    const run = (seed: number) => {
      const b = new Battle(content.battleSetup('random-battle', seed, 'turns', { party: ['vesper', 'warrior', 'mage', 'archer'], enemies: ['vesper', 'defender', 'paladin', 'hexer'] }));
      for (let i = 0; i < 500 && !b.winner; i++) {
        const actor = b.currentUid!;
        const r = b.applyChoice(actor, chooseAction(b, actor, content.aiConfig));
        expect(r.ok, `seed ${seed} tur ${i}`).toBe(true);
      }
      return { bells: b.combatants.filter((c) => c.defId === 'vesper').map((c) => c.bells ?? 0), winner: b.winner };
    };
    for (const seed of [5, 6, 7]) {
      const a = run(seed);
      expect(a.winner).not.toBeNull();
      expect(Math.max(...a.bells)).toBeGreaterThan(0);
      expect(run(seed)).toEqual(a);
    }
  });
});

describe('Clapper of the Sunken Bell (olay Legendary takısı)', () => {
  const d = ITEMS.items.find((x) => x.id === 'clapper_of_the_sunken_bell')!;
  it('takı yuvası, Legendary, her sınıf takabilir, kutsal + şimşek affix, kendi etkisi; veri doğrulaması temiz', () => {
    expect(d.slot).toBe('trinket');
    expect(d.rarity).toBe('legendary');
    expect(d.usableBy).toBeUndefined();
    for (const c of content.randomPool) expect(canEquip(c, d), c).toBe(true);
    expect(d.affixes).toEqual(expect.arrayContaining(['c_holy', 'c_lightning']));
    expect(ITEMS.effects[d.effect!]).toBeDefined();
    expect(validateItems(ITEMS)).toEqual([]);
  });
  it('eventOnly: nadir düşüş ve Endless Legendary havuzunda yok', () => {
    expect(legendaryPool({ chapter: 9 }).map((x) => x.id)).not.toContain(d.id);
    expect(legendaryPool({ wave: 99 }).map((x) => x.id)).not.toContain(d.id);
  });
});

// ---------------------------------------------------------------- sefer: dr19 buluşması ve kışla-yedek kuralı

let reachBase: CampaignState | undefined;
/** dr19'a atla, savaş ve sandık (dalış dahil) otomatik; olay adımında dur. */
function atChapelEvent(): CampaignState {
  let s = debugJumpNode((reachBase ??= debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 11 }))), 'dr19');
  for (let i = 0; i < 20 && nextStep(s).kind !== 'event'; i++) s = autoResolve(s);
  expect(nextStep(s)).toMatchObject({ kind: 'event', event: 'dr_vesper' });
  return s;
}
const withoutVesper = (s: CampaignState): CampaignState => ({ ...s, roster: s.roster.filter((h) => h.class !== 'vesper'), reserve: (s.reserve ?? []).filter((h) => h.class !== 'vesper') });

describe('Sunken Chapel (dr19): Vesper buluşması', () => {
  it('düğüm sandığı korur, ardından olay; metin ve iki seçenek', () => {
    const n = getMap('drowned-reach').nodes.find((x) => x.id === 'dr19')!;
    expect(n.treasure).toBe('dr_sunken_chapel');
    expect(n.event).toBe('dr_vesper');
    expect(EVENTS.dr_vesper!.choices!.map((c) => c.id)).toEqual(['accept', 'refuse']);
  });

  it('kabul, bölük doluyken: Vesper kışlada yedek bekler, bölük dört kalır', () => {
    const s = withoutVesper(atChapelEvent());
    expect(s.roster.length).toBe(COMPANY_MAX);
    const t = chooseEvent(s, 'accept');
    expect(t.roster.length).toBe(COMPANY_MAX);
    expect(t.roster.some((h) => h.class === 'vesper')).toBe(false);
    expect((t.reserve ?? []).filter((h) => h.class === 'vesper')).toHaveLength(1);
    expect(t.active.filter(Boolean)).toEqual(s.active.filter(Boolean));
    expect(nextStep(t).kind).not.toBe('event');
  });

  it('kabul, bölükte yer varken: bugünkü gibi takıma katılır', () => {
    const s0 = withoutVesper(atChapelEvent());
    const drop = s0.roster.find((h) => !h.leader)!;
    const s = { ...s0, roster: s0.roster.filter((h) => h.id !== drop.id), active: s0.active.map((c) => (c === drop.id ? '' : c)) };
    const t = chooseEvent(s, 'accept');
    const bw = t.roster.find((h) => h.class === 'vesper');
    expect(bw).toBeDefined();
    expect(t.active).toContain(bw!.id);
    expect((t.reserve ?? []).some((h) => h.class === 'vesper')).toBe(false);
  });

  it('ret: Clapper of the Sunken Bell torbaya, kimse katılmaz', () => {
    const s = withoutVesper(atChapelEvent());
    const t = chooseEvent(s, 'refuse');
    expect(t.inventory.some((i) => i.id === 'clapper_of_the_sunken_bell')).toBe(true);
    expect([...t.roster, ...(t.reserve ?? [])].some((h) => h.class === 'vesper')).toBe(false);
  });

  it('Vesper zaten varsa kabul seçeneği gizli, yalnızca tokmak kalır', () => {
    const s = debugEnsureClass(withoutVesper(atChapelEvent()), 'vesper');
    expect(eventChoicesFor(s, 'dr_vesper').map((c) => c.id)).toEqual(['refuse']);
  });
});

describe('kışla-yedek kuralı tüm katılım yollarında (Valdren Keep kasaba gönüllüsü + ayrılırken gönüllü)', () => {
  const valdren = (): CampaignState => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), '7');
    for (let i = 0; i < 20 && nextStep(s).kind !== 'town'; i++) s = autoResolve(s);
    expect(nextStep(s).kind).toBe('town');
    return s;
  };
  /** Bölüğü dörde tamamla (adaylarda olmayan bir sınıfla). */
  const fill = (s: CampaignState): CampaignState => {
    const offer = townRecruitOffer(s);
    let t = s;
    // Yeni seferde kadro burada daha küçük: her turda kadroda olmayan yeni bir sınıf eklenir
    while (t.roster.length < COMPANY_MAX) t = debugEnsureClass(t, CONFIG.recruitPool.find((c) => !offer.includes(c) && !t.roster.some((h) => h.class === c))!);
    return t;
  };

  it('kasabada aday seçimi (recruitInTown), bölük dolu: yedeğe', () => {
    const s = fill(valdren());
    expect(s.roster.length).toBe(COMPANY_MAX);
    const pick = townRecruitOffer(s)[0]!;
    const t = recruitInTown(s, pick);
    expect(t.roster.length).toBe(COMPANY_MAX);
    expect(t.reserve?.map((h) => h.class)).toContain(pick);
  });

  it('ayrılırken gönüllü (recruit), bölük dolu: yedeğe; yer varken takıma', () => {
    const full = completeSimple(fill(valdren()), 'town');
    expect(nextStep(full).kind).toBe('volunteer');
    const offer = (nextStep(full) as Extract<ReturnType<typeof nextStep>, { kind: 'volunteer' }>).offer;
    const t = recruit(full, offer[0]!);
    expect(t.roster.length).toBe(COMPANY_MAX);
    expect(t.reserve?.map((h) => h.class)).toContain(offer[0]);
    // yer varken bugünkü gibi
    const open = completeSimple(valdren(), 'town');
    const o2 = (nextStep(open) as Extract<ReturnType<typeof nextStep>, { kind: 'volunteer' }>).offer;
    const u = recruit(open, o2[0]!);
    expect(u.roster.at(-1)!.class).toBe(o2[0]);
    expect(u.reserve ?? []).toEqual([]);
  });
});

// ---------------------------------------------------------------- Vesper ağacı: 25 düğüm çalışır (Ömer onayı 2026-10-31; değerler veriden)

const TREE = treeOf('vesper')!;
type Fx = { k: string; h?: string; f?: string; v?: number; mod?: Record<string, unknown>; mul?: number; do?: Array<Record<string, number>> };
const fxOf = (key: string) => TREE.nodes[key]!.fx as unknown as Fx[];
const powerMulOf = (key: string) => fxOf(key).find((f) => f.h === 'cond')!.mod!.powerMul as number;
const pctOf = (key: string) => fxOf(key).find((f) => f.k === 'skill' && f.f === 'power')!.v!;
const perBellOf = (key: string) => fxOf(key).find((f) => f.k === 'passive')!.v!;
const setupFor = (r: Record<string, number>) => compileTree(TREE, { v: TREE.version, r });

/** Kurulum: Vesper arka sırada (hücre 7), ağaç dağılımı `r`; düşmanlar hücre -> sınıf; `allies` ek dostlar. */
function treed(r: Record<string, number>, enemies: Record<number, string>, allies: Record<number, string> = {}, mode: 'test' | 'turns' = 'test'): Battle {
  const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
  const tree = setupFor(r);
  const setup = content.battleSetup('random-battle', 3, mode, { party: cells({ 7: 'vesper', ...allies }), enemies: cells(enemies), units: { party: tree ? { 7: { tree } } : {}, enemies: {} } }, false);
  // Hasar zarı kapalı: oranlar tam okunur
  const b = new Battle({ ...setup, formulas: { ...setup.formulas, damage: { ...setup.formulas.damage, variance: 0 } } });
  b.freeMp = true;
  b.debug.crit = 'never';
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0 });
    c.hp = c.maxHp = 50000;
  }
  // Oranlar yuvarlamaya takılmasın diye büyük hasar (Toll bile tek vuruşta öldürmez)
  Object.assign(vesper(b).stats, { int: 4000 });
  return b;
}
const vesper = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party' && c.defId === 'vesper')!;
const foeAt = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function vcast(b: Battle, skill: string, target?: string, slot?: number, board?: 'party' | 'enemy'): BattleEvent[] {
  const r = b.useSkill(vesper(b).uid, skill, target, slot, board);
  if (!r.ok) throw new Error(`${skill}: ${r.reason}`);
  b.debugClearCooldowns();
  return r.events;
}
const dealt = (ev: BattleEvent[], uid: string) => ofType(ev, 'damage').filter((e) => e.target === uid).reduce((s, e) => s + e.amount + e.absorbed, 0);
/** Aynı kurulumda iki düşmana giden hasarın oranı için yeterince büyük zırhsız düşman. */
const noArmor = (b: Battle) => b.combatants.filter((c) => c.side === 'enemy').forEach((c) => Object.assign(c.stats, { armor: 0, magicArmor: 0 }));

describe('Vesper ağacı: veri', () => {
  it('fx null düğüm kalmadı, fx denetimi temiz, ağaç onaylı ve sürümü yükseldi (bedava respec)', () => {
    expect(Object.entries(TREE.nodes).filter(([, n]) => !n.fx).map(([k]) => k)).toEqual([]);
    expect(TREE.mastery.bar.filter((x) => !x.fx).map((x) => x.name)).toEqual([]);
    expect(checkTreeFx(TREE)).toEqual([]);
    expect(TREE.version).toBeGreaterThan(1);
    expect((TREE as unknown as { _not: string })._not).toContain('Ömer onayladı 2026-10-31');
  });
});

describe('Vesper ağacı: başlangıç çanları', () => {
  const towerAt = TREE.mastery.bar.find((x) => x.name === 'Tower Stance')!.at;
  it('Matins ve Tower Stance birer çanla başlatır, ikisi birlikte 2 (üst sınır yok)', () => {
    expect(vesper(treed({}, { 1: 'warrior' })).bells ?? 0).toBe(0);
    expect(vesper(treed({ '0.n0': 1 }, { 1: 'warrior' })).bells).toBe(1);
    expect(vesper(treed({ '1.f1': towerAt }, { 1: 'warrior' })).bells).toBe(1);
    expect(vesper(treed({ '0.n0': 1, '1.f1': towerAt }, { 1: 'warrior' })).bells).toBe(2);
  });
  it('başlangıç çanı ilk vuruşu güçlendirir', () => {
    const base = treed({}, { 1: 'warrior' });
    const up = treed({ '0.n0': 1 }, { 1: 'warrior' });
    const a = dealt(vcast(base, 'toll'), foeAt(base, 1).uid);
    const c = dealt(vcast(up, 'toll'), foeAt(up, 1).uid);
    expect(c / a).toBeCloseTo(1 + pe.perBell, 1);
  });
  it('Long Echo: savaşın ilk çanı iki sayılır, sonrakiler bir; Matins varsa ilk çan odur', () => {
    const b = treed({ '0.f3': 1 }, { 1: 'warrior' });
    vcast(b, 'toll');
    expect(vesper(b).bells).toBe(2);
    vcast(b, 'toll');
    expect(vesper(b).bells).toBe(3);
    expect(vesper(treed({ '0.f3': 1, '0.n0': 1 }, { 1: 'warrior' })).bells).toBe(2);
  });
  it('Quickening Peal: her üçüncü çan sıradaki turu erkene alır (turns)', () => {
    const b = treed({ '0.ea': 1 }, { 1: 'warrior' }, {}, 'turns');
    const v = vesper(b);
    const priv = b as unknown as { ringBells: (a: Combatant, n: number, e: (x: BattleEvent) => void) => void; speedBoostOf: (u: string) => number };
    priv.ringBells(v, 2, () => {});
    expect(priv.speedBoostOf(v.uid)).toBe(0);
    priv.ringBells(v, 1, () => {});
    expect(priv.speedBoostOf(v.uid)).toBe((fxOf('0.ea')[0]!.do![0] as { sooner: number }).sooner);
  });
});

describe('Vesper ağacı: Pealing Bells satırı', () => {
  it('Deep Peal: perBell artar, yalnız Toll çalar (Storm Tower, Echoing Hall, Ringing Skull da kapanır); skill adı taşımayan çanlar kalır; ipucu doğru', () => {
    const r = { '0.eb': 1, '2.v': 1, '4.l1': 1, '3.n0': 1, '0.n0': 1 };
    const b = treed(r, { 1: 'warrior', 4: 'mage' });
    const v = vesper(b);
    expect((v.passive!.effect as { perBell: number }).perBell).toBeCloseTo(pe.perBell + perBellOf('0.eb'), 6);
    expect(v.bells).toBe(1); // Matins
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    vcast(b, 'great_bell_of_valdoria');
    expect(v.bells).toBe(1);
    vcast(b, 'toll');
    expect(v.bells).toBe(2);
    expect(setupFor(r)!.hooks!.some((h) => h.node === 'vesper:3.n0')).toBe(false);
    expect(describePassive(v.passive!, v.stats, content.formulas)).toContain('Every Toll you ring');
    expect(describeSkill(b.skill('thunderpeal', v)!, v.stats, content.formulas).lines.join(' ')).not.toContain('Rings');
  });
  it('Angelus: 5 çandan itibaren dört çan skill\'i 2 MP ucuz, altında değil', () => {
    const b = treed({ '0.ma': 1 }, { 1: 'warrior' });
    const v = vesper(b);
    for (const id of BW.skills) {
      const def = b.skill(id, v)!;
      const add = (fxOf('0.ma').find((f) => (f as unknown as { skill: string }).skill === id)!.mod!.cost as number);
      v.bells = 4;
      expect(skillCostAmount(def.cost, v), id).toBe(S[id]!.cost.amount);
      v.bells = 5;
      expect(skillCostAmount(def.cost, v), id).toBe(S[id]!.cost.amount + add);
    }
  });
  it('Fraying Rope: perBell artar, alınan hasar artar', () => {
    const hit = (r: Record<string, number>) => {
      const b = treed(r, { 1: 'mage' });
      const m = foeAt(b, 1);
      const out = b.useSkill(m.uid, 'fire_bolt', vesper(b).uid);
      if (!out.ok) throw new Error(out.reason);
      return { d: dealt(out.events, vesper(b).uid), p: (vesper(b).passive!.effect as { perBell: number }).perBell };
    };
    const a = hit({});
    const c = hit({ '0.fa': 1 });
    expect(c.p).toBeCloseTo(a.p + perBellOf('0.fa'), 6);
    expect(c.d / a.d).toBeCloseTo(1 + fxOf('0.fa').find((f) => f.h === 'heal')!.mul!, 1);
  });
  it('Heavy Bronze: perBell artar, hız düşer', () => {
    const a = vesper(treed({}, { 1: 'warrior' }));
    const c = vesper(treed({ '0.fb': 1 }, { 1: 'warrior' }));
    expect((c.passive!.effect as { perBell: number }).perBell).toBeCloseTo(pe.perBell + perBellOf('0.fb'), 6);
    expect(c.stats.spd).toBeLessThan(a.stats.spd);
    expect(c.stats.spd).toBe(rolledSpeed(roundSpeed(content.classes.vesper!.stats.spd * (1 + fxOf('0.fb').find((f) => f.k === 'stat')!.v!), content.formulas), c.stats.spdRoll!, content.formulas)); // ondalık hız: -%10 tam uygulanır, sonra kişisel zar
  });
  it('Compline: dost düşünce çan çalar', () => {
    const b = treed({ '0.mb': 1 }, { 1: 'mage' }, { 10: 'warrior' });
    const ally = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
    ally.hp = 1;
    const out = b.useSkill(foeAt(b, 1).uid, 'fire_bolt', ally.uid);
    expect(out.ok).toBe(true);
    expect(ally.hp).toBe(0);
    expect(vesper(b).bells).toBe(1);
  });
  it('Cathedral Choir: çan başına kritik şansı (çok çanda kesin kritik), çansızken yok; dört skill de', () => {
    const b = treed({ '0.v': 1 }, { 1: 'warrior' });
    b.debug.crit = 'auto' as never;
    const v = vesper(b);
    const f = foeAt(b, 1);
    f.hp = f.maxHp = 1e9;
    expect(ofType(vcast(b, 'cracked_bell', f.uid), 'damage').some((e) => e.crit)).toBe(false);
    v.bells = Math.ceil(1 / (fxOf('0.v')[0]!.mod!.critBonus as number));
    expect(previewSkill(b, v.uid, 'toll')[0]!.damage!.critChance).toBe(1); // önizleme de bilir
    for (const id of BW.skills) expect(ofType(vcast(b, id, id === 'cracked_bell' ? f.uid : undefined, id === 'thunderpeal' ? f.slot : undefined, id === 'thunderpeal' ? 'enemy' : undefined), 'damage').every((e) => e.crit), id).toBe(true);
  });
});

describe('Vesper ağacı: Toll satırı', () => {
  it('Funeral Toll: yarı canın altındakine daha çok, üstündekine aynı', () => {
    const b = treed({ '1.n0': 1 }, { 1: 'warrior', 4: 'warrior' });
    noArmor(b);
    const hi = foeAt(b, 1);
    const lo = foeAt(b, 4);
    lo.hp = Math.floor(lo.maxHp * 0.4);
    const ev = vcast(b, 'toll');
    expect(dealt(ev, lo.uid) / dealt(ev, hi.uid)).toBeCloseTo(1 + powerMulOf('1.n0'), 1);
  });
  it('Knell: en düşük canlıya daha çok; ölürse sıradaki bonus almaz (kullanım başı anlık görüntü); önizleme uyuşur', () => {
    const b = treed({ '1.ea': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    noArmor(b);
    const [a, c, d] = [foeAt(b, 0), foeAt(b, 1), foeAt(b, 2)];
    a.hp = 40000;
    const prev = previewSkill(b, vesper(b).uid, 'toll');
    expect(prev.find((p) => p.uid === a.uid)!.damage!.avg).toBeGreaterThan(prev.find((p) => p.uid === c.uid)!.damage!.avg);
    const ev = vcast(b, 'toll');
    expect(dealt(ev, a.uid) / dealt(ev, c.uid)).toBeCloseTo(1 + powerMulOf('1.ea'), 1);
    expect(dealt(ev, c.uid)).toBe(dealt(ev, d.uid));
    const k = treed({ '1.ea': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    noArmor(k);
    foeAt(k, 0).hp = 1;
    foeAt(k, 1).hp = 30000;
    const ev2 = vcast(k, 'toll');
    expect(foeAt(k, 0).hp).toBe(0);
    expect(dealt(ev2, foeAt(k, 1).uid)).toBe(dealt(ev2, foeAt(k, 2).uid));
  });
  it('Wide Toll: yalnız en ön DOLU sıra yavaşlar, ön sıra ölse de arkası kapmaz', () => {
    const b = treed({ '1.eb': 1 }, { 1: 'warrior', 4: 'mage' });
    vcast(b, 'toll');
    expect(foeAt(b, 1).statuses.some((s) => s.kind === 'slow')).toBe(true);
    expect(foeAt(b, 4).statuses.some((s) => s.kind === 'slow')).toBe(false);
    const k = treed({ '1.eb': 1 }, { 1: 'warrior', 4: 'mage' });
    foeAt(k, 1).hp = 1;
    vcast(k, 'toll');
    expect(foeAt(k, 4).statuses.some((s) => s.kind === 'slow')).toBe(false);
    const rear = treed({ '1.eb': 1 }, { 4: 'mage' });
    vcast(rear, 'toll');
    expect(foeAt(rear, 4).statuses.some((s) => s.kind === 'slow')).toBe(true);
  });
  it('Passing Bell: öldürme başına bir çan, çan kullanım sonunda çalar (o kullanımın vuruşlarını artırmaz)', () => {
    const b = treed({ '1.ma': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    noArmor(b);
    foeAt(b, 0).hp = 1;
    foeAt(b, 1).hp = 1;
    const base = treed({}, { 2: 'warrior' });
    noArmor(base);
    const ev = vcast(b, 'toll');
    expect(vesper(b).bells).toBe(3); // Toll + 2 öldürme
    expect(dealt(ev, foeAt(b, 2).uid)).toBe(dealt(vcast(base, 'toll'), foeAt(base, 2).uid));
  });
  it('Shaken Ranks: isabet edilene 1 tur isabet cezası (statuses.json), boss bağışık', () => {
    const b = treed({ '1.mb': 1 }, { 1: 'warrior' });
    const f = foeAt(b, 1);
    const acc = b.effectiveStats(f).accuracy;
    vcast(b, 'toll');
    const st = f.statuses.find((s) => s.kind === 'shaken')!;
    expect(st.turns).toBe(1);
    expect(b.effectiveStats(f).accuracy).toBeCloseTo(acc + content.statuses.shaken!.accuracyDelta!, 6);
    const k = treed({ '1.mb': 1 }, { 1: 'warrior' });
    foeAt(k, 1).tier = 'boss';
    vcast(k, 'toll');
    expect(foeAt(k, 1).statuses.some((s) => s.kind === 'shaken')).toBe(false);
  });
});

describe('Vesper ağacı: Thunderpeal satırı', () => {
  it('Forked Peal: arkadaki sıraya yarı hasar (Blind yok), onun arkasına değil', () => {
    const b = treed({ '2.ea': 1 }, { 1: 'warrior', 4: 'warrior', 7: 'warrior' });
    noArmor(b);
    const ev = vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    const strike = fxOf('2.ea')[0]!.do![0]!.strike!;
    expect(dealt(ev, foeAt(b, 4).uid) / dealt(ev, foeAt(b, 1).uid)).toBeCloseTo(strike, 1);
    expect(dealt(ev, foeAt(b, 7).uid)).toBe(0);
    expect(foeAt(b, 1).statuses.some((s) => s.kind === 'blinded')).toBe(true);
    expect(foeAt(b, 4).statuses.some((s) => s.kind === 'blinded')).toBe(false);
  });
  it('Single Bolt: yalnız merkez hücre, güç artar', () => {
    const b = treed({ '2.eb': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    const def = b.skill('thunderpeal', vesper(b))!;
    expect((def.effects[0] as DamageEffect).power).toBeCloseTo((S.thunderpeal!.effects[0] as DamageEffect).power * (1 + pctOf('2.eb')), 6);
    const ev = vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(dealt(ev, foeAt(b, 1).uid)).toBeGreaterThan(0);
    expect(dealt(ev, foeAt(b, 0).uid) + dealt(ev, foeAt(b, 2).uid)).toBe(0);
  });
  it('Storm Tower: güç artar, iki çan çalar, ipucu söyler', () => {
    const b = treed({ '2.v': 1 }, { 1: 'warrior' });
    const v = vesper(b);
    const def = b.skill('thunderpeal', v)!;
    expect((def.effects[0] as DamageEffect).power).toBeCloseTo((S.thunderpeal!.effects[0] as DamageEffect).power * (1 + pctOf('2.v')), 6);
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(v.bells).toBe(2);
    expect(describeSkill(def, v.stats, content.formulas).lines.join(' ')).toContain('Rings 2 bells');
  });
});

describe('Vesper ağacı: Cracked Bell satırı', () => {
  it('Ringing Skull: Stun tutarsa çan, tutmazsa yok; Brittle Bell ile sessiz', () => {
    const sure = (b: Battle) => {
      const d = b.skill('cracked_bell', vesper(b))!;
      for (const e of d.effects) if (e.type === 'status' && e.status === 'stun') (e as { chance?: number }).chance = 1;
    };
    const b = treed({ '3.n0': 1 }, { 1: 'warrior' });
    sure(b);
    vcast(b, 'cracked_bell', foeAt(b, 1).uid);
    expect(foeAt(b, 1).statuses.some((s) => s.kind === 'stun')).toBe(true);
    expect(vesper(b).bells).toBe(1);
    const no = treed({ '3.n0': 1, '3.fa': 1 }, { 1: 'warrior' });
    vcast(no, 'cracked_bell', foeAt(no, 1).uid);
    expect(vesper(no).bells ?? 0).toBe(0);
  });
  it('Shards: hedefin yanındakilere yarı hasar, başka birime yok', () => {
    const b = treed({ '3.eb': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior', 4: 'warrior' });
    noArmor(b);
    const ev = vcast(b, 'cracked_bell', foeAt(b, 1).uid);
    const main = dealt(ev, foeAt(b, 1).uid);
    expect(dealt(ev, foeAt(b, 0).uid) / main).toBeCloseTo(0.5, 1);
    expect(dealt(ev, foeAt(b, 2).uid) / main).toBeCloseTo(0.5, 1);
    expect(dealt(ev, foeAt(b, 4).uid)).toBe(0);
  });
  it('Toll for One: elite ve boss\'a daha çok, normale aynı', () => {
    const b = treed({ '3.ma': 1 }, { 1: 'warrior' });
    noArmor(b);
    const normal = dealt(vcast(b, 'cracked_bell', foeAt(b, 1).uid), foeAt(b, 1).uid);
    for (const tier of ['elite', 'boss'] as const) {
      foeAt(b, 1).tier = tier;
      foeAt(b, 1).statuses = [];
      expect(dealt(vcast(b, 'cracked_bell', foeAt(b, 1).uid), foeAt(b, 1).uid) / normal, tier).toBeCloseTo(1 + powerMulOf('3.ma'), 1);
    }
  });
  it('Sundered Bell: güç artar, Stun şansı iki katı; Brittle Bell ile çökmez', () => {
    const def = setupFor({ '3.v': 1 })!.skills!.cracked_bell!;
    expect((def.effects[0] as DamageEffect).power).toBeCloseTo((S.cracked_bell!.effects[0] as DamageEffect).power * (1 + pctOf('3.v')), 6);
    const stun = (s: typeof def) => (s.effects.find((e) => e.type === 'status' && e.status === 'stun') as { chance?: number } | undefined)?.chance;
    expect(stun(def)).toBeCloseTo(stun(S.cracked_bell!)! * 2, 6);
    expect(stun(setupFor({ '3.v': 1, '3.fa': 1 })!.skills!.cracked_bell!)).toBeUndefined();
  });
});

describe('Vesper ağacı: Great Bell satırı', () => {
  it('Last Peal: yarı canın altındakine daha çok', () => {
    const b = treed({ '4.d3': 1 }, { 1: 'warrior', 4: 'warrior' });
    noArmor(b);
    foeAt(b, 4).hp = 20000;
    const ev = vcast(b, 'great_bell_of_valdoria');
    expect(dealt(ev, foeAt(b, 4).uid) / dealt(ev, foeAt(b, 1).uid)).toBeCloseTo(1 + powerMulOf('4.d3'), 1);
  });
  it('Echoing Hall: Great Bell bir çan çalar (kendi vuruşu saymaz)', () => {
    const b = treed({ '4.l1': 1 }, { 1: 'warrior' });
    vcast(b, 'great_bell_of_valdoria');
    expect(vesper(b).bells).toBe(1);
  });
  it('Bell of Kings: Great Bell sonrası sıradaki Toll bedelsiz, araya başka skill girse de; bir kez', () => {
    const b = treed({ '4.l3': 1 }, { 1: 'warrior' });
    const v = vesper(b);
    const cost = () => skillCostAmount(b.skill('toll', v)!.cost, v);
    const full = S.toll!.cost.amount;
    expect(cost()).toBe(full);
    vcast(b, 'great_bell_of_valdoria');
    expect(cost()).toBe(0);
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(cost()).toBe(0);
    vcast(b, 'toll');
    expect(cost()).toBe(full);
  });
});

describe('Vesper: çan sayacı Endless dalgaları arasında sıfırlanır (Ömer kuralı)', () => {
  /** Kazanılan ilk dalga (seed taranır): plan ve bitmiş savaş; aynı yol Endless simi (src/sim/endless.ts fightWave). */
  /** Ağaç doğrudan plana yazılır (dağılım doğrulaması bu testin konusu değil). */
  const withTree = (plan: ReturnType<typeof wavePlan>, r: Record<string, number>) => {
    const cell = plan.party.indexOf('vesper');
    const tree = setupFor(r);
    return tree ? { ...plan, units: { ...plan.units, party: { ...plan.units.party, [cell]: { ...plan.units.party[cell], tree } } } } : plan;
  };
  function wonWave(r: Record<string, number>, start: number): { run: EndlessRun; plan: ReturnType<typeof wavePlan>; battle: Battle } {
    for (let seed = 1; seed < 60; seed++) {
      const run = newRun(seed, ['vesper', 'warrior', 'archer', 'druid'], '2026-10-31T00:00:00.000Z');
      const plan = withTree(wavePlan(run), r);
      const battle = fightWave(plan);
      const c = vesper(battle);
      if (battle.winner === 'party' && c.hp > 0 && (c.bells ?? 0) > start) return { run, plan, battle };
    }
    throw new Error('no wave-1 win with a bell');
  }
  it('dalga sonu sayaç > 0, taşımada yok, sonraki dalga 0\'dan (Matins\'le her dalga 1\'den) başlar', () => {
    for (const [r, start] of [[{}, 0], [{ '0.n0': 1 }, 1]] as const) {
      const { run, plan, battle } = wonWave(r, start);
      expect(vesper(battle).bells!).toBeGreaterThan(start);
      const next = applyOutcome(run, plan, outcomeFromBattle(plan, battle));
      const hero = next.heroes.find((h) => h.class === 'vesper')!;
      expect(hero.carry ?? {}).not.toHaveProperty('bells');
      const nextPlan = withTree(wavePlan({ ...next, phase: 'ready' }), r);
      expect(vesper(battleFor(nextPlan)).bells ?? 0).toBe(start);
    }
  });
  it('tek savaşın içindeki motor dalgalarında (Round 2 / 3) sayaç sürer: mevcut davranış, açık soru', () => {
    const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const b = new Battle(content.battleSetup('random-battle', 3, 'test', { party: cells({ 7: 'vesper' }), enemies: cells({ 1: 'warrior' }), waves: [{ enemies: cells({ 1: 'mage' }) }] }, false));
    b.freeMp = true;
    const first = b.combatants.find((c) => c.side === 'enemy')!;
    first.hp = 1;
    Object.assign(first.stats, { evasion: 0, surviveChance: 0 });
    Object.assign(vesper(b).stats, { accuracy: 10 });
    const r = b.useSkill(vesper(b).uid, 'toll');
    expect(r.ok).toBe(true);
    expect(b.winner).toBeFalsy();
    expect(b.combatants.some((c) => c.side === 'enemy' && c.hp > 0 && c.defId === 'mage')).toBe(true);
    expect(vesper(b).bells).toBe(1);
  });
});
