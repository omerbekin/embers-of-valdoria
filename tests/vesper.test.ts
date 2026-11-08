import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describePassive, describeSkill } from '../src/engine';
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
/** Vesper'i çıkarır; bölük (başlangıç havuzu değişince Vesper Harita 1'de zaten gelmiş olabilir) yine COMPANY_MAX'e tamamlanır. */
const withoutVesper = (s: CampaignState): CampaignState => {
  let t: CampaignState = { ...s, roster: s.roster.filter((h) => h.class !== 'vesper'), reserve: (s.reserve ?? []).filter((h) => h.class !== 'vesper') };
  while (t.roster.length < COMPANY_MAX) t = debugEnsureClass(t, CONFIG.recruitPool.find((c) => c !== 'vesper' && ![...t.roster, ...(t.reserve ?? [])].some((h) => h.class === c))!);
  return t;
};

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

// ---------------------------------------------------------------- Vesper ağacı v3: her düğüm çalışır (ilk ağaç Ömer onayı 2026-10-31, yeniden kuruluş 2026-11-08; değerler veriden)

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
  const b = new Battle({ ...setup, formulas: { ...setup.formulas, damage: { ...setup.formulas.damage, variance: 0, elementVariance: {} } } });
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

// Ağaç v3 (2026-11-08 yeniden kuruluş, docs/design/classes/skill-tree-logic.md): her düğüm kendi skill'inin oynanışını değiştirir; sayılar veriden.
type Priv = {
  ringBells: (a: Combatant, n: number, e: (x: BattleEvent) => void) => void;
  speedBoostOf: (u: string) => number;
  delayedFree: Array<{ skill: string; power: number }>;
  rng: { next: () => number };
};
const priv = (b: Battle) => b as unknown as Priv;
/** turns modunda Vesper'in sırasına kadar tur atla, cooldown'ları temizle. */
const vesperTurn = (b: Battle) => {
  for (let i = 0; i < 300 && b.currentUid !== vesper(b).uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(vesper(b).uid);
  b.debugClearCooldowns();
};
/** Şans zarlarını hep tutturur (isabet 10, kritik kapalı, zar sapması yok: yalnız durum şansları etkilenir). */
const lucky = (b: Battle) => (priv(b).rng.next = () => 0);
const has = (c: Combatant, kind: string) => c.statuses.some((s) => s.kind === kind);
const statusOf = (c: Combatant, kind: string) => c.statuses.find((s) => s.kind === kind);
const barAt = (name: string) => TREE.mastery.bar.find((x) => x.name === name)!.at;
const doOf = (key: string, i = 0) => fxOf(key).find((f) => f.h === 'trigger')!.do![i] as Record<string, number>;
const stunChance = (def: { effects: unknown[] }) => (def.effects.find((e) => (e as { type: string; status?: string }).type === 'status' && (e as { status?: string }).status === 'stun') as { chance?: number } | undefined)?.chance;
/** Cracked Bell Stun'u kesin (zar beklemeden durum tetiği). */
const sureStun = (b: Battle) => {
  const d = b.skill('cracked_bell', vesper(b))!;
  for (const e of d.effects) if (e.type === 'status' && e.status === 'stun') (e as { chance?: number }).chance = 1;
};
/** Aynı kurulumda ağaçlı / ağaçsız tek kullanım hasar oranı (aynı hedef). */
function ratio(r: Record<string, number>, enemies: Record<number, string>, skill: string, prep: (b: Battle) => void, at: number, target?: number, slot?: number): number {
  const one = (rr: Record<string, number>) => {
    const b = treed(rr, enemies);
    noArmor(b);
    prep(b);
    const ev = vcast(b, skill, target !== undefined ? foeAt(b, target).uid : undefined, slot, slot !== undefined ? 'enemy' : undefined);
    return dealt(ev, foeAt(b, at).uid);
  };
  return one(r) / one({});
}

describe('Vesper ağacı: veri', () => {
  it('fx null düğüm yok, fx denetimi temiz, ağaç onaylı, sürüm 3 (2026-11-08 yeniden kuruluş: bedava respec)', () => {
    expect(Object.entries(TREE.nodes).filter(([, n]) => !n.fx).map(([k]) => k)).toEqual([]);
    expect(TREE.mastery.bar.filter((x) => !x.fx).map((x) => x.name)).toEqual([]);
    expect(checkTreeFx(TREE)).toEqual([]);
    expect(TREE.version).toBeGreaterThanOrEqual(3);
    expect((TREE as unknown as { _not: string })._not).toContain('Ömer onayladı 2026-10-31');
  });
  it('genel "skill\'lerin +%X hasar" düğümü kalmadı: her güç ekinin bir koşulu, ölçeği ya da bedeli var', () => {
    const plain: string[] = [];
    for (const [k, nd] of [...Object.entries(TREE.nodes), ...TREE.mastery.bar.map((x) => [x.name, x] as const)]) {
      for (const f of (nd.fx ?? []) as unknown as Array<Fx & { when?: unknown; scale?: unknown }>) {
        if (f.h === 'cond' && f.mod?.powerMul !== undefined && !f.when && !f.scale) plain.push(String(k));
      }
    }
    expect(plain).toEqual([]);
  });
});

describe('Vesper ağacı: başlangıç ve Mastery bar çanları', () => {
  it('Matins bir çanla başlatır; başlangıç çanı ilk vuruşu güçlendirir', () => {
    expect(vesper(treed({}, { 1: 'warrior' })).bells ?? 0).toBe(0);
    expect(vesper(treed({ '0.n0': 1 }, { 1: 'warrior' })).bells).toBe(1);
    const base = treed({}, { 1: 'warrior' });
    const up = treed({ '0.n0': 1 }, { 1: 'warrior' });
    const a = dealt(vcast(base, 'toll'), foeAt(base, 1).uid);
    const c = dealt(vcast(up, 'toll'), foeAt(up, 1).uid);
    expect(c / a).toBeCloseTo(1 + pe.perBell, 1);
  });
  it('First Toll (bar 5): savaşın ilk Toll\'u iki çan, sonrakiler bir', () => {
    const b = treed({ '1.f1': barAt('First Toll') }, { 1: 'warrior' });
    vcast(b, 'toll');
    expect(vesper(b).bells).toBe(2);
    vcast(b, 'toll');
    expect(vesper(b).bells).toBe(3);
  });
  it('Vigil (bar 10): dost düşünce çan', () => {
    const b = treed({ '1.f1': barAt('Vigil') }, { 1: 'mage' }, { 10: 'warrior' });
    const ally = b.combatants.find((c) => c.side === 'party' && c.defId === 'warrior')!;
    ally.hp = 1;
    expect(b.useSkill(foeAt(b, 1).uid, 'fire_bolt', ally.uid).ok).toBe(true);
    expect(ally.hp).toBe(0);
    expect(vesper(b).bells).toBe(1);
  });
  it('Thunder After (bar 15, Ömer 2026-11-08): veride enemyMissed + Blinded kancası; Blind vermek artık ek çan vermez', () => {
    const node = treeOf('vesper')!.mastery!.bar.find((x: { name: string }) => x.name === 'Thunder After') as unknown as { fx: { on: string; when: { targetStatus: string }; do: { bell: number }[] }[] };
    expect(node.fx[0]!.on).toBe('enemyMissed');
    expect(node.fx[0]!.when.targetStatus).toBe('blinded');
    expect(node.fx[0]!.do[0]!.bell).toBe(1);
    const b = treed({ '1.f1': barAt('Thunder After') }, { 1: 'warrior' });
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(vesper(b).bells).toBe(1);
  });
  it('enemyMissed (Ömer 2026-11-08 onaylı, düğüm yeri bekliyor): Blind\'lı düşman ıskalayınca 1 çan; Blind\'sız ıska ve isabet çan vermez', () => {
    // Ağaçta boş yuva yok: kanca derlenmiş ağaca elle eklenir (veri düğümü Ömer'in yer seçiminden sonra)
    const missTree = { hooks: [{ h: 'trigger', node: 'vesper:missBell', on: 'enemyMissed', when: { targetStatus: 'blinded' }, do: [{ bell: 1 }] }] } as never;
    const mk = () => {
      const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
      const setup = content.battleSetup('random-battle', 3, 'test', { party: cells({ 7: 'vesper' }), enemies: cells({ 1: 'archer' }), units: { party: { 7: { tree: missTree } }, enemies: {} } }, false);
      const b = new Battle(setup);
      b.freeMp = true;
      for (const c of b.combatants) c.hp = c.maxHp = 50000;
      return b;
    };
    const shoot = (b: Battle) => {
      const a = foeAt(b, 1);
      const r = b.useSkill(a.uid, 'quick_shot', vesper(b).uid);
      if (!r.ok) throw new Error(r.reason);
      b.debugClearCooldowns();
      return r.events;
    };
    // Blind'lı + ıska: +1 çan (her ıskada; tur sınırı yok)
    const b = mk();
    b.debug.miss = 'always';
    b.debugAddStatus(foeAt(b, 1).uid, 'blinded', 3);
    expect(ofType(shoot(b), 'miss').length).toBeGreaterThan(0);
    expect(vesper(b).bells).toBe(1);
    shoot(b);
    expect(vesper(b).bells).toBe(2);
    // Blind'sız ıska: çan yok
    const n = mk();
    n.debug.miss = 'always';
    shoot(n);
    expect(vesper(n).bells ?? 0).toBe(0);
    // Blind'lı ama isabet: çan yok
    const h = mk();
    for (const c of h.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0 });
    h.debugAddStatus(foeAt(h, 1).uid, 'blinded', 3);
    const ev = shoot(h);
    expect(ofType(ev, 'damage').some((e) => e.target === vesper(h).uid)).toBe(true);
    expect(vesper(h).bells ?? 0).toBe(0);
  });
  it('Iron Rope (bar 20): çan başı güç artar', () => {
    const v = vesper(treed({ '1.f1': barAt('Iron Rope') }, { 1: 'warrior' }));
    expect((v.passive!.effect as { perBell: number }).perBell).toBeCloseTo(pe.perBell + 0.01, 6);
  });
  it("Vespers' Hour (bar 25): 10+ çanda Great Bell bir kez 3 çan, altında yok", () => {
    const b = treed({ '1.f1': barAt("Vespers' Hour") }, { 1: 'warrior' });
    const v = vesper(b);
    v.bells = 9;
    vcast(b, 'great_bell_of_valdoria');
    expect(v.bells).toBe(9);
    const k = treed({ '1.f1': barAt("Vespers' Hour") }, { 1: 'warrior' });
    vesper(k).bells = 10;
    vcast(k, 'great_bell_of_valdoria');
    expect(vesper(k).bells).toBe(13);
    vcast(k, 'great_bell_of_valdoria');
    expect(vesper(k).bells).toBe(13);
  });
});

describe('Vesper ağacı: Pealing Bells satırı (çan ritmi)', () => {
  it('Bronze Throat: çan başı güç rank kadar artar', () => {
    const v = vesper(treed({ '0.f1': 3 }, { 1: 'warrior' }));
    expect((v.passive!.effect as { perBell: number }).perBell).toBeCloseTo(pe.perBell + perBellOf('0.f1') * 3, 6);
  });
  it('Counted Strokes: her 4. çan rank kadar MP', () => {
    const b = treed({ '0.f2': 5 }, { 1: 'warrior' });
    const v = vesper(b);
    v.mp = 0;
    priv(b).ringBells(v, 3, () => {});
    expect(v.mp).toBe(0);
    priv(b).ringBells(v, 1, () => {});
    expect(v.mp).toBe(doOf('0.f2').mp! * 5);
  });
  it('Full Peal: 5+ çanda kritik şansı, altında yok (önizleme)', () => {
    const b = treed({ '0.f3': 5 }, { 1: 'warrior' });
    const v = vesper(b);
    v.bells = 4;
    expect(previewSkill(b, v.uid, 'toll')[0]!.damage!.critChance).toBe(0);
    v.bells = 5;
    expect(previewSkill(b, v.uid, 'toll')[0]!.damage!.critChance).toBeCloseTo(0.02 * 5, 6);
  });
  it('Prime: 3 çan ve altında daha çok hasar, 4 çanda yok', () => {
    const low = ratio({ '0.r': 3 }, { 1: 'warrior' }, 'toll', (b) => (vesper(b).bells = 3), 1);
    const high = ratio({ '0.r': 3 }, { 1: 'warrior' }, 'toll', (b) => (vesper(b).bells = 4), 1);
    expect(low).toBeCloseTo(1 + powerMulOf('0.r') * 3, 2);
    expect(high).toBeCloseTo(1, 2);
  });
  it('Quickening Peal: her üçüncü çan sıradaki turu erkene alır (turns)', () => {
    const b = treed({ '0.ea': 1 }, { 1: 'warrior' }, {}, 'turns');
    const v = vesper(b);
    priv(b).ringBells(v, 2, () => {});
    expect(priv(b).speedBoostOf(v.uid)).toBe(0);
    priv(b).ringBells(v, 1, () => {});
    expect(priv(b).speedBoostOf(v.uid)).toBe(doOf('0.ea').sooner);
  });
  it('Racing Peal: her ikinci çan erken tur (Quickening yerine), çan başı güç düşer', () => {
    const b = treed({ '0.ea': 1, '0.fa': 1 }, { 1: 'warrior' }, {}, 'turns');
    const v = vesper(b);
    expect(setupFor({ '0.ea': 1, '0.fa': 1 })!.hooks!.some((h) => h.node === 'vesper:0.ea')).toBe(false);
    priv(b).ringBells(v, 2, () => {});
    expect(priv(b).speedBoostOf(v.uid)).toBeGreaterThan(0);
    expect((v.passive!.effect as { perBell: number }).perBell).toBeCloseTo(pe.perBell + perBellOf('0.fa'), 6);
  });
  it('Struck Bronze / Cracked Throat: Cracked Bell 1 / 2 çan çalar; Cracked Throat Stun şansını yarılar', () => {
    const one = treed({ '0.eb': 1 }, { 1: 'warrior' });
    vcast(one, 'cracked_bell', foeAt(one, 1).uid);
    expect(vesper(one).bells).toBe(1);
    const two = treed({ '0.eb': 1, '0.fb': 1 }, { 1: 'warrior' });
    vcast(two, 'cracked_bell', foeAt(two, 1).uid);
    expect(vesper(two).bells).toBe(2);
    expect(stunChance(setupFor({ '0.fb': 1 })!.skills!.cracked_bell!)).toBeCloseTo(stunChance(S.cracked_bell!)! * 0.5, 6);
    expect(vesper(treed({}, { 1: 'warrior' })).bells ?? 0).toBe(0);
  });
  it('Call to Prayer: her 5. çan tüm cooldown\'ları 1 kısaltır', () => {
    const b = treed({ '0.ma': 1 }, { 1: 'warrior' });
    const v = vesper(b);
    v.cooldowns = { thunderpeal: 2, cracked_bell: 1 };
    priv(b).ringBells(v, 4, () => {});
    expect(v.cooldowns).toEqual({ thunderpeal: 2, cracked_bell: 1 });
    priv(b).ringBells(v, 1, () => {});
    expect(v.cooldowns.thunderpeal).toBe(1);
    expect(v.cooldowns.cracked_bell).toBeUndefined();
  });
  it('Angelus: 8 çandan itibaren üç çan skill\'i 3 MP ucuz, altında değil', () => {
    const b = treed({ '0.mb': 1 }, { 1: 'warrior' });
    const v = vesper(b);
    for (const id of ['toll', 'thunderpeal', 'cracked_bell']) {
      const def = b.skill(id, v)!;
      v.bells = 7;
      expect(skillCostAmount(def.cost, v), id).toBe(S[id]!.cost.amount);
      v.bells = 8;
      expect(skillCostAmount(def.cost, v), id).toBe(Math.max(0, S[id]!.cost.amount - 3));
    }
  });
  it('Cathedral Choir: her 5. çan bedava Toll (o da çan çalar, kendini zincirlemez)', () => {
    const b = treed({ '0.v': 1 }, { 1: 'warrior' });
    for (let i = 0; i < 4; i++) vcast(b, 'toll');
    expect(vesper(b).bells).toBe(4);
    const ev = vcast(b, 'toll');
    expect(ofType(ev, 'damage').filter((e) => e.target === foeAt(b, 1).uid).length).toBe(2);
    expect(vesper(b).bells).toBe(6);
  });
});

describe('Vesper ağacı: Toll satırı (seri ve en zayıf)', () => {
  it('Steady Stroke: art arda her Toll daha sert; ilk Toll aynı', () => {
    const run = (r: Record<string, number>) => {
      const b = treed(r, { 1: 'warrior' });
      noArmor(b);
      return [dealt(vcast(b, 'toll'), foeAt(b, 1).uid), dealt(vcast(b, 'toll'), foeAt(b, 1).uid), dealt(vcast(b, 'toll'), foeAt(b, 1).uid)];
    };
    const a = run({});
    const c = run({ '1.f1': 3 });
    expect(c[0]! / a[0]!).toBeCloseTo(1, 2);
    expect(c[1]! / a[1]!).toBeCloseTo(1 + powerMulOf('1.f1') * 3, 2);
    expect(c[2]! / a[2]!).toBeCloseTo(1 + powerMulOf('1.f1') * 3 * 2, 2);
  });
  it('Ringing Ears: rank başı Shaken şansı (byRank), Toll\'a eklenir', () => {
    const eff = (r: number) => setupFor({ '1.f2': r })!.skills!.toll!.effects.find((e) => e.type === 'status' && e.status === 'shaken') as { chance?: number; turns: number };
    expect(eff(1).chance).toBeCloseTo(0.03, 6);
    expect(eff(5).chance).toBeCloseTo(0.15, 6);
    expect(eff(5).turns).toBe(1);
  });
  it('Dread Peal: Shaken düşmana daha çok, öbürüne aynı', () => {
    const b = treed({ '1.f3': 5 }, { 1: 'warrior', 4: 'warrior' });
    noArmor(b);
    b.debugAddStatus(foeAt(b, 4).uid, 'shaken', 2);
    const ev = vcast(b, 'toll');
    expect(dealt(ev, foeAt(b, 4).uid) / dealt(ev, foeAt(b, 1).uid)).toBeCloseTo(1 + powerMulOf('1.f3') * 5, 2);
  });
  it('Triple Peal: her 3. Toll fazladan bir çan', () => {
    const b = treed({ '1.n0': 1 }, { 1: 'warrior' });
    vcast(b, 'toll');
    vcast(b, 'toll');
    expect(vesper(b).bells).toBe(2);
    vcast(b, 'toll');
    expect(vesper(b).bells).toBe(4);
  });
  it('Lingering Ears: Toll\'un Shaken\'ı isabeti daha çok düşürür', () => {
    const b = treed({ '1.f2': 5, '1.r': 3 }, { 1: 'warrior' });
    const d = b.skill('toll', vesper(b))!;
    for (const e of d.effects) if (e.type === 'status' && e.status === 'shaken') (e as { chance?: number }).chance = 1;
    const f = foeAt(b, 1);
    const acc = b.effectiveStats(f).accuracy;
    vcast(b, 'toll');
    expect(has(f, 'shaken')).toBe(true);
    expect(b.effectiveStats(f).accuracy).toBeCloseTo(acc + content.statuses.shaken!.accuracyDelta! - 0.02 * 3, 6);
  });
  it('Unbroken Rope: üçüncü art arda Toll\'dan itibaren herkese Shaken', () => {
    const b = treed({ '1.ea': 1 }, { 1: 'warrior' });
    vcast(b, 'toll');
    vcast(b, 'toll');
    expect(has(foeAt(b, 1), 'shaken')).toBe(false);
    vcast(b, 'toll');
    expect(has(foeAt(b, 1), 'shaken')).toBe(true);
  });
  it('Knell: en düşük canlıya daha çok; önizleme uyuşur', () => {
    const b = treed({ '1.eb': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    noArmor(b);
    const [a, c, d] = [foeAt(b, 0), foeAt(b, 1), foeAt(b, 2)];
    a.hp = 40000;
    const prev = previewSkill(b, vesper(b).uid, 'toll');
    expect(prev.find((p) => p.uid === a.uid)!.damage!.avg).toBeGreaterThan(prev.find((p) => p.uid === c.uid)!.damage!.avg);
    const ev = vcast(b, 'toll');
    expect(dealt(ev, a.uid) / dealt(ev, c.uid)).toBeCloseTo(1 + powerMulOf('1.eb'), 1);
    expect(dealt(ev, c.uid)).toBe(dealt(ev, d.uid));
  });
  it('Endless Toll: üçüncü art arda Toll\'dan itibaren Great Bell cooldown\'ı 1 kısalır', () => {
    const b = treed({ '1.ma': 1 }, { 1: 'warrior' });
    const v = vesper(b);
    v.cooldowns = { great_bell_of_valdoria: 5 };
    const toll = () => expect(b.useSkill(v.uid, 'toll').ok).toBe(true);
    toll();
    toll();
    expect(v.cooldowns.great_bell_of_valdoria).toBe(5);
    toll();
    expect(v.cooldowns.great_bell_of_valdoria).toBe(4);
    toll();
    expect(v.cooldowns.great_bell_of_valdoria).toBe(3);
  });
  it('Hammered Rope: seri başına daha çok (Steady Stroke düşer), serinin ilk Toll\'u zayıf', () => {
    const run = (r: Record<string, number>) => {
      const b = treed(r, { 1: 'warrior' });
      noArmor(b);
      return [dealt(vcast(b, 'toll'), foeAt(b, 1).uid), dealt(vcast(b, 'toll'), foeAt(b, 1).uid)];
    };
    const a = run({});
    const c = run({ '1.f1': 3, '1.fa': 1 });
    const [streak, first] = fxOf('1.fa').map((f) => f.mod!.powerMul as number);
    expect(c[0]! / a[0]!).toBeCloseTo(1 + first!, 2);
    expect(c[1]! / a[1]!).toBeCloseTo(1 + streak!, 2);
  });
  it('Muffled Knell: en düşük canlıya çok daha çok (Knell yerine), öbürlerine az', () => {
    const one = (r: Record<string, number>) => {
      const b = treed(r, { 0: 'warrior', 1: 'warrior' });
      noArmor(b);
      foeAt(b, 0).hp = 40000;
      const ev = vcast(b, 'toll');
      return [dealt(ev, foeAt(b, 0).uid), dealt(ev, foeAt(b, 1).uid)];
    };
    const a = one({});
    const c = one({ '1.eb': 1, '1.fb': 1 });
    const [lo, rest] = fxOf('1.fb').map((f) => f.mod!.powerMul as number);
    expect(c[0]! / a[0]!).toBeCloseTo(1 + lo!, 2);
    expect(c[1]! / a[1]!).toBeCloseTo(1 + rest!, 2);
  });
  it('Passing Bell: öldürme başına bir çan, kullanım sonunda (o kullanımın vuruşlarını artırmaz)', () => {
    const b = treed({ '1.mb': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    noArmor(b);
    foeAt(b, 0).hp = 1;
    foeAt(b, 1).hp = 1;
    const base = treed({}, { 2: 'warrior' });
    noArmor(base);
    const ev = vcast(b, 'toll');
    expect(vesper(b).bells).toBe(3);
    expect(dealt(ev, foeAt(b, 2).uid)).toBe(dealt(vcast(base, 'toll'), foeAt(base, 2).uid));
  });
  it('Death Knell: güç artar; öldürürse kullanım başına bir kez bedava Toll', () => {
    expect((setupFor({ '1.v': 1 })!.skills!.toll!.effects[0] as DamageEffect).power).toBeCloseTo((S.toll!.effects[0] as DamageEffect).power * (1 + pctOf('1.v')), 6);
    const b = treed({ '1.v': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    foeAt(b, 0).hp = 1;
    foeAt(b, 1).hp = 1;
    const ev = vcast(b, 'toll');
    expect(ofType(ev, 'damage').filter((e) => e.target === foeAt(b, 2).uid).length).toBe(2);
    expect(vesper(b).bells).toBe(2);
    const none = treed({ '1.v': 1 }, { 1: 'warrior' });
    expect(ofType(vcast(none, 'toll'), 'damage').length).toBe(1);
  });
});

describe('Vesper ağacı: Thunderpeal satırı (Blind ve sıra)', () => {
  it('Afterglare: Blind\'lı düşmana daha çok', () => {
    expect(ratio({ '2.f1': 5 }, { 1: 'warrior' }, 'thunderpeal', (b) => b.debugAddStatus(foeAt(b, 1).uid, 'blinded', 2), 1, undefined, 1)).toBeCloseTo(1 + powerMulOf('2.f1') * 5, 2);
    expect(ratio({ '2.f1': 5 }, { 1: 'warrior' }, 'thunderpeal', () => {}, 1, undefined, 1)).toBeCloseTo(1, 2);
  });
  it('Crowded Row: vurulan her düşman için daha çok (3 düşman)', () => {
    expect(ratio({ '2.f2': 5 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' }, 'thunderpeal', () => {}, 1, undefined, 1)).toBeCloseTo(1 + powerMulOf('2.f2') * 5 * 3, 2);
    expect(ratio({ '2.f2': 5 }, { 1: 'warrior' }, 'thunderpeal', () => {}, 1, undefined, 1)).toBeCloseTo(1 + powerMulOf('2.f2') * 5, 2);
  });
  it('Searing Flash + Lingering Flash: Blind daha uzun ve daha sert', () => {
    const b = treed({ '2.f3': 5, '2.n0': 1 }, { 1: 'warrior' });
    const f = foeAt(b, 1);
    const acc = b.effectiveStats(f).accuracy;
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    const base = S.thunderpeal!.effects.find((e) => e.type === 'status' && e.status === 'blinded') as { turns: number };
    expect(statusOf(f, 'blinded')!.turns).toBe(base.turns + 1);
    expect(b.effectiveStats(f).accuracy).toBeCloseTo(acc + content.statuses.blinded!.accuracyDelta! - 0.02 * 5, 6);
  });
  it('Dazzled: Cracked Bell Blind\'lı düşmana daha çok', () => {
    expect(ratio({ '2.r': 3 }, { 1: 'warrior' }, 'cracked_bell', (b) => b.debugAddStatus(foeAt(b, 1).uid, 'blinded', 2), 1, 1)).toBeCloseTo(1 + powerMulOf('2.r') * 3, 2);
  });
  it('Forked Peal: arkadaki sıraya yarı hasar (Blind yok), onun arkasına değil', () => {
    const b = treed({ '2.ea': 1 }, { 1: 'warrior', 4: 'warrior', 7: 'warrior' });
    noArmor(b);
    const ev = vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(dealt(ev, foeAt(b, 4).uid) / dealt(ev, foeAt(b, 1).uid)).toBeCloseTo(doOf('2.ea').strike!, 1);
    expect(dealt(ev, foeAt(b, 7).uid)).toBe(0);
    expect(has(foeAt(b, 4), 'blinded')).toBe(false);
  });
  it('Overcharged: arka sıraya tam hasar (Forked Peal yerine), bedel +6 MP', () => {
    const b = treed({ '2.ea': 1, '2.fa': 1 }, { 1: 'warrior', 4: 'warrior' });
    noArmor(b);
    const ev = vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(dealt(ev, foeAt(b, 4).uid) / dealt(ev, foeAt(b, 1).uid)).toBeCloseTo(1, 1);
    expect(setupFor({ '2.fa': 1 })!.skills!.thunderpeal!.cost.amount).toBe(S.thunderpeal!.cost.amount + 6);
  });
  it('Thunderstruck: zaten Blind\'lı düşmana Stun şansı, Blind\'sıza yok; Blinding Storm onu değiştirir', () => {
    const b = treed({ '2.eb': 1 }, { 0: 'warrior', 1: 'warrior' });
    lucky(b);
    b.debugAddStatus(foeAt(b, 1).uid, 'blinded', 2);
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(has(foeAt(b, 1), 'stun')).toBe(true);
    expect(has(foeAt(b, 0), 'stun')).toBe(false);
    const fb = setupFor({ '2.eb': 1, '2.fb': 1 })!;
    expect(fb.hooks!.some((h) => h.node === 'vesper:2.eb')).toBe(false);
    expect((fb.skills!.thunderpeal!.effects[0] as DamageEffect).power).toBeCloseTo((S.thunderpeal!.effects[0] as DamageEffect).power * (1 + pctOf('2.fb')), 6);
  });
  it('Storm Front: 3 düşmana isabet fazladan çan, 2\'ye yok', () => {
    const three = treed({ '2.ma': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' });
    vcast(three, 'thunderpeal', undefined, 1, 'enemy');
    expect(vesper(three).bells).toBe(2);
    const two = treed({ '2.ma': 1 }, { 0: 'warrior', 1: 'warrior' });
    vcast(two, 'thunderpeal', undefined, 1, 'enemy');
    expect(vesper(two).bells).toBe(1);
  });
  it('White Flash: Blind\'lı düşmana kritik şansı, Blind\'sıza yok', () => {
    const b = treed({ '2.mb': 1 }, { 0: 'warrior', 1: 'warrior' });
    b.debug.crit = 'auto';
    lucky(b);
    b.debugAddStatus(foeAt(b, 1).uid, 'blinded', 2);
    const ev = ofType(vcast(b, 'thunderpeal', undefined, 1, 'enemy'), 'damage');
    expect(ev.find((e) => e.target === foeAt(b, 1).uid)!.crit).toBe(true);
    expect(ev.find((e) => e.target === foeAt(b, 0).uid)!.crit).toBe(false);
  });
  it('Storm Tower: sıradaki tura gecikmeli ikinci gök gürültüsü (%60 güç, zincirlemez)', () => {
    const b = treed({ '2.v': 1 }, { 1: 'warrior' });
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(priv(b).delayedFree.map((d) => [d.skill, d.power])).toEqual([['thunderpeal', doOf('2.v').power]]);
  });
});

describe('Vesper ağacı: Cracked Bell satırı (Stun ve tek hedef)', () => {
  it('Bronze Memory: çan başı daha çok', () => {
    expect(ratio({ '3.f1': 3 }, { 1: 'warrior' }, 'cracked_bell', (b) => (vesper(b).bells = 10), 1, 1)).toBeCloseTo(1 + powerMulOf('3.f1') * 3 * 10, 2);
  });
  it('Jarring Note: Stun şansı rank kadar artar', () => {
    expect(stunChance(setupFor({ '3.f2': 5 })!.skills!.cracked_bell!)).toBeCloseTo(stunChance(S.cracked_bell!)! + 0.03 * 5, 6);
  });
  it('Bell-Breaker: yarı canın üstündekine daha çok, altındakine aynı', () => {
    expect(ratio({ '3.f3': 5 }, { 1: 'warrior' }, 'cracked_bell', () => {}, 1, 1)).toBeCloseTo(1 + powerMulOf('3.f3') * 5, 2);
    expect(ratio({ '3.f3': 5 }, { 1: 'warrior' }, 'cracked_bell', (b) => (foeAt(b, 1).hp = 20000), 1, 1)).toBeCloseTo(1, 2);
  });
  it('Ringing Skull: Stun tutarsa çan; Heavy Bronze ile sessiz', () => {
    const b = treed({ '3.n0': 1 }, { 1: 'warrior' });
    sureStun(b);
    vcast(b, 'cracked_bell', foeAt(b, 1).uid);
    expect(has(foeAt(b, 1), 'stun')).toBe(true);
    expect(vesper(b).bells).toBe(1);
    const no = treed({ '3.n0': 1, '3.fb': 1 }, { 1: 'warrior' });
    vcast(no, 'cracked_bell', foeAt(no, 1).uid);
    expect(vesper(no).bells ?? 0).toBe(0);
  });
  it('Aftershock: Stun tutarsa rank kadar MP', () => {
    const b = treed({ '3.r': 3 }, { 1: 'warrior' });
    sureStun(b);
    vesper(b).mp = 0;
    vcast(b, 'cracked_bell', foeAt(b, 1).uid);
    expect(vesper(b).mp).toBe(doOf('3.r').mp! * 3);
  });
  it('Resounding Crack: Stun tutarsa Thunderpeal cooldown\'ı sıfırlanır', () => {
    const b = treed({ '3.ea': 1 }, { 1: 'warrior' });
    sureStun(b);
    const v = vesper(b);
    v.cooldowns = { thunderpeal: 2 };
    expect(b.useSkill(v.uid, 'cracked_bell', foeAt(b, 1).uid).ok).toBe(true);
    expect(v.cooldowns.thunderpeal).toBeUndefined();
  });
  it('Toll for One: elite ve boss\'a daha çok, normale aynı', () => {
    const b = treed({ '3.eb': 1 }, { 1: 'warrior' });
    noArmor(b);
    const normal = dealt(vcast(b, 'cracked_bell', foeAt(b, 1).uid), foeAt(b, 1).uid);
    for (const tier of ['elite', 'boss'] as const) {
      foeAt(b, 1).tier = tier;
      foeAt(b, 1).statuses = [];
      expect(dealt(vcast(b, 'cracked_bell', foeAt(b, 1).uid), foeAt(b, 1).uid) / normal, tier).toBeCloseTo(1 + powerMulOf('3.eb'), 1);
    }
  });
  it('Death Bell: Stun tutarsa %50 güçle bedava Toll (tüm düşmanlara, o da çan çalar); tutmazsa yok', () => {
    const b = treed({ '3.ma': 1 }, { 1: 'warrior', 4: 'mage' });
    noArmor(b);
    sureStun(b);
    const ev = vcast(b, 'cracked_bell', foeAt(b, 1).uid);
    expect(dealt(ev, foeAt(b, 4).uid)).toBeGreaterThan(0);
    expect(vesper(b).bells).toBe(1);
    const base = treed({}, { 1: 'warrior', 4: 'mage' });
    noArmor(base);
    expect(dealt(ev, foeAt(b, 4).uid) / dealt(vcast(base, 'toll'), foeAt(base, 4).uid)).toBeCloseTo(doOf('3.ma').power!, 1);
    const no = treed({ '3.ma': 1 }, { 1: 'warrior', 4: 'mage' });
    for (const e of no.skill('cracked_bell', vesper(no))!.effects) if (e.type === 'status' && e.status === 'stun') (e as { chance?: number }).chance = 0.000001;
    expect(dealt(vcast(no, 'cracked_bell', foeAt(no, 1).uid), foeAt(no, 4).uid)).toBe(0);
  });
  it('Brittle Bell: Stun kesin, cooldown 5; Heavy Bronze: güç artar, Stun yok', () => {
    const fa = setupFor({ '3.fa': 1 })!.skills!.cracked_bell!;
    const stun = fa.effects.find((e) => e.type === 'status' && e.status === 'stun') as { chance?: number };
    expect(stun.chance).toBeUndefined();
    expect(fa.cooldown).toBe(5);
    const fb = setupFor({ '3.fb': 1 })!.skills!.cracked_bell!;
    expect(fb.effects.some((e) => e.type === 'status' && e.status === 'stun')).toBe(false);
    expect((fb.effects[0] as DamageEffect).power).toBeCloseTo((S.cracked_bell!.effects[0] as DamageEffect).power * (1 + pctOf('3.fb')), 6);
  });
  it('Bell-Toll Verdict: elite / boss\'a çan başı daha çok, normale yok', () => {
    const b = treed({ '3.mb': 1 }, { 1: 'warrior' });
    noArmor(b);
    vesper(b).bells = 10;
    const normal = dealt(vcast(b, 'cracked_bell', foeAt(b, 1).uid), foeAt(b, 1).uid);
    vesper(b).bells = 10;
    foeAt(b, 1).tier = 'elite';
    foeAt(b, 1).statuses = [];
    expect(dealt(vcast(b, 'cracked_bell', foeAt(b, 1).uid), foeAt(b, 1).uid) / normal).toBeCloseTo(1 + powerMulOf('3.mb') * 10, 2);
  });
  it('Sundered Bell: güç artar, hedefin yanındakilere yarı hasar', () => {
    const b = treed({ '3.v': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior', 4: 'warrior' });
    noArmor(b);
    const ev = vcast(b, 'cracked_bell', foeAt(b, 1).uid);
    const main = dealt(ev, foeAt(b, 1).uid);
    expect(dealt(ev, foeAt(b, 0).uid) / main).toBeCloseTo(0.5, 1);
    expect(dealt(ev, foeAt(b, 2).uid) / main).toBeCloseTo(0.5, 1);
    expect(dealt(ev, foeAt(b, 4).uid)).toBe(0);
    expect((setupFor({ '3.v': 1 })!.skills!.cracked_bell!.effects[0] as DamageEffect).power).toBeCloseTo((S.cracked_bell!.effects[0] as DamageEffect).power * (1 + pctOf('3.v')), 6);
  });
});

describe('Vesper ağacı: Great Bell kolları', () => {
  const GB = 'great_bell_of_valdoria';
  it('u: Echoing Hall çan çalar, Royal Peal çan başı gücü artırır', () => {
    const b = treed({ '4.u1': 1 }, { 1: 'warrior' });
    vcast(b, GB);
    expect(vesper(b).bells).toBe(1);
    const per = (s: typeof S[string]) => (s.effects.find((e) => e.type === 'damage') as DamageEffect & { powerPerBell?: number }).powerPerBell!;
    expect(per(setupFor({ '4.u2': 1 })!.skills![GB]!)).toBeCloseTo(per(S[GB]!) + 0.01, 6);
  });
  it('u3 Peal of Ages: 10+ çanda Great Bell cooldown\'ı 1 kısa (turns)', () => {
    const cd = (bells: number) => {
      const b = treed({ '4.u3': 1 }, { 1: 'warrior' }, {}, 'turns');
      const v = vesper(b);
      vesperTurn(b);
      v.bells = bells;
      const r = b.useSkill(v.uid, GB);
      if (!r.ok) throw new Error(r.reason);
      return v.cooldowns[GB];
    };
    expect(cd(10)).toBe(cd(9)! - 1);
  });
  it('r: Crown of Lightning Blind; Glaring Peal Blind\'lıya daha çok; Judgement Peal Blind\'lıyı Stun\'lar', () => {
    const b = treed({ '4.r1': 1 }, { 1: 'warrior' });
    vcast(b, GB);
    expect(statusOf(foeAt(b, 1), 'blinded')!.turns).toBe(1);
    expect(ratio({ '4.r2': 1 }, { 1: 'warrior' }, GB, (k) => k.debugAddStatus(foeAt(k, 1).uid, 'blinded', 2), 1)).toBeCloseTo(1 + powerMulOf('4.r2'), 2);
    const j = treed({ '4.r3': 1 }, { 0: 'warrior', 1: 'warrior' });
    lucky(j);
    j.debugAddStatus(foeAt(j, 1).uid, 'blinded', 2);
    vcast(j, GB);
    expect(has(foeAt(j, 1), 'stun')).toBe(true);
    expect(has(foeAt(j, 0), 'stun')).toBe(false);
  });
  it('d: Shaking Peal 2 tur Shaken; Last Peal yarı canın altındakine daha çok', () => {
    const b = treed({ '4.d1': 1 }, { 1: 'warrior' });
    vcast(b, GB);
    expect(statusOf(foeAt(b, 1), 'shaken')!.turns).toBe(2);
    const l = treed({ '4.d2': 1 }, { 1: 'warrior', 4: 'warrior' });
    noArmor(l);
    foeAt(l, 4).hp = 20000;
    const ev = vcast(l, GB);
    expect(dealt(ev, foeAt(l, 4).uid) / dealt(ev, foeAt(l, 1).uid)).toBeCloseTo(1 + powerMulOf('4.d2'), 1);
  });
  it('d3 Final Toll: öldürülen başına çan, Cracked Bell cooldown\'ı sıfırlanır', () => {
    const b = treed({ '4.d3': 1 }, { 0: 'warrior', 1: 'warrior' });
    const v = vesper(b);
    foeAt(b, 0).hp = 1;
    v.cooldowns = { cracked_bell: 3 };
    expect(b.useSkill(v.uid, GB).ok).toBe(true);
    expect(v.bells).toBe(1);
    expect(v.cooldowns.cracked_bell).toBeUndefined();
  });
  it('l: Tower Watch ilk bekleme 1 kısa; Bell of Kings sıradaki Toll bedelsiz (bir kez); Evensong erken tur', () => {
    expect(setupFor({ '4.l1': 1 })!.skills![GB]!.initialCooldown).toBe(S[GB]!.initialCooldown! - 1);
    const b = treed({ '4.l2': 1 }, { 1: 'warrior' });
    const v = vesper(b);
    const cost = () => skillCostAmount(b.skill('toll', v)!.cost, v);
    vcast(b, GB);
    expect(cost()).toBe(0);
    vcast(b, 'thunderpeal', undefined, 1, 'enemy');
    expect(cost()).toBe(0);
    vcast(b, 'toll');
    expect(cost()).toBe(S.toll!.cost.amount);
    const e = treed({ '4.l3': 1 }, { 1: 'warrior' }, {}, 'turns');
    vesperTurn(e);
    // Erken tur sahibin sıradaki turu başlayınca biter (Vesper hemen yine sıradaysa okunamaz): yazılan değeri yakala
    const boost = (e as unknown as { speedBoost: Map<string, number> }).speedBoost;
    const sets: number[] = [];
    const set = boost.set.bind(boost);
    boost.set = (k: string, v: number) => (k === vesper(e).uid && sets.push(v), set(k, v));
    expect(e.useSkill(vesper(e).uid, GB).ok).toBe(true);
    expect(sets).toEqual([doOf('4.l3').sooner]);
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
