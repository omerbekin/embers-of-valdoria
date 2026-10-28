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
    expect(pe.perBell).toBe(0.05);
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
    expect(describePassive(BW.passive!, st, content.formulas)).toContain('5% more');
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
    const extra = CONFIG.recruitPool.find((c) => !offer.includes(c) && !s.roster.some((h) => h.class === c))!;
    let t = s;
    while (t.roster.length < COMPANY_MAX) t = debugEnsureClass(t, extra);
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
