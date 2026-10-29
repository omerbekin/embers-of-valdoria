// Harita 3 (The Hollow Crown) düğüm kuralları (Ömer 2026-10-29, open-questions 454 a / b / d; src/campaign/hollow-crown.ts):
// Hall of Oaths (Stone Oath: yemin = Deep Market indirimi + cüce mezarları mühürlü; ret = indirim yok, mezarlar açık), The Deep Market (yalnız bu tüccar: fiyat
// yüksek, stok iyi), The White Dark "Wait it out" (can kaybı yok, sonraki savaş Chilled 2 tur).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  EVENTS,
  HOLLOW_CROWN,
  MAPS,
  applyBattle,
  autoResolve,
  battlePlan,
  campaignPrice,
  campaignStock,
  campaignWaveTeams,
  chooseEvent,
  completeSimple,
  oathFirstPlunder,
  oathSealedFor,
  TREASURES,
  debugSetStoneOath,
  debugSetWhiteDarkChill,
  debugTeleport,
  campaignRerollCost,
  marketPriceMult,
  marketRerollMult,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  setMapOverride,
  startPatrol,
  withRarityFloor,
  type CampaignState,
} from '../src/campaign';
import { Battle, content } from '../src/engine';
import { instanceRarity } from '../src/progression';
import { OATH_SEALED_CARD, OATH_SEALED_CHIPS, choiceChips, resultChips } from '../src/ui/map-window-data';

beforeAll(() => setMapOverride(HOLLOW_CROWN, true));
afterAll(() => setMapOverride(HOLLOW_CROWN, null));

const map = MAPS[HOLLOW_CROWN]!;
const nodeOf = (id: string) => map.nodes.find((n) => n.id === id)!;
// Harita 3 başında takım yok (devam haritası): Harita 1'in kahraman seçiminden ödünç takım (yalnız test; kurallar takımdan bağımsız)
const team = autoResolve(newCampaign({ mode: 'normal', seed: 5 }));
const withTeam = (s: CampaignState): CampaignState => ({ ...s, roster: structuredClone(team.roster), active: [...team.active] });
const hc = (): CampaignState => newCampaign({ mode: 'normal', seed: 5, mapId: HOLLOW_CROWN });
const at = (id: string): CampaignState => withTeam(debugTeleport(hc(), id));
function settle(s: CampaignState): CampaignState {
  let t = s;
  for (let i = 0; i < 30; i++) {
    const k = nextStep(t).kind;
    if (k === 'move' || k === 'complete') return t;
    t = autoResolve(t);
  }
  return t;
}
const battleOf = (plan: ReturnType<typeof battlePlan>) =>
  new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan) }, false));

describe('The White Dark: "Wait it out"', () => {
  const wait = EVENTS['hc_white_dark']!.choices!.find((c) => c.id === 'wait')!;

  it('veri: can kaybı yok, sonraki savaş Chilled 2 tur; metin bedeli söyler', () => {
    expect(wait.hpLoss).toBeUndefined();
    expect(wait.nextBattleStatus).toEqual({ status: 'chilled', turns: 2 });
    expect(content.statuses['chilled']).toBeTruthy();
    expect(wait.hint).toMatch(/Chilled for 2 turns/);
    expect(choiceChips(wait).map((c) => c.text)).toContain('Next battle: Chilled, 2 turns');
    expect(resultChips(wait).map((c) => c.text)).toContain('Next battle: Chilled, 2 turns');
  });

  it('seçilince can aynı, kayıtta bekleyen durum; sonraki savaşta her kahraman Chilled başlar, savaş bitince silinir', () => {
    const s = at('hc20');
    expect(nextStep(s)).toMatchObject({ kind: 'event', event: 'hc_white_dark' });
    const hp = s.roster.map((h) => h.hpRatio);
    const t = chooseEvent(s, 'wait');
    expect(t.roster.map((h) => h.hpRatio)).toEqual(hp);
    expect(t.pendingStatus).toEqual({ status: 'chilled', turns: 2 });
    // kayıt: geçerli alan kalır, bozuk alan atılır
    expect(normalizeState(JSON.parse(JSON.stringify(t)))?.pendingStatus).toEqual({ status: 'chilled', turns: 2 });
    expect(normalizeState(JSON.parse(JSON.stringify({ ...t, pendingStatus: { status: 'nope', turns: 2 } })))?.pendingStatus).toBeUndefined();
    expect(normalizeState(JSON.parse(JSON.stringify({ ...t, pendingStatus: { status: 'chilled', turns: 0 } })))?.pendingStatus).toBeUndefined();
    // sonraki savaş düğümü
    expect(nextStep(t).kind).toBe('move');
    // ileri yürü (savaşsız düğümler çözülür) ilk savaş adımına kadar; bekleyen durum savaşa dek kalır
    let b = t;
    for (let i = 0; i < 20 && nextStep(b).kind !== 'battle'; i++) {
      const st = nextStep(b);
      b = st.kind === 'move' ? moveTo(b, st.options[0]!) : autoResolve(b);
    }
    expect(nextStep(b).kind).toBe('battle');
    expect(b.pendingStatus).toEqual({ status: 'chilled', turns: 2 });
    const plan = battlePlan(b);
    plan.heroOrder.forEach((id, i) => {
      const cell = b.active.indexOf(id);
      expect(plan.units.party[cell]?.startStatuses).toEqual([{ kind: 'chilled', turns: 2, source: `party-${i}` }]);
    });
    const battle = battleOf(plan);
    const heroes = battle.combatants.filter((c) => c.side === 'party' && !c.summoned);
    expect(heroes.length).toBeGreaterThan(0);
    for (const c of heroes) expect(c.statuses.find((x) => x.kind === 'chilled')?.turns).toBe(2);
    // zafer de yenilgi de siler
    const out = { victory: true, units: plan.heroOrder.map((heroId) => ({ heroId, hpRatio: 1, alive: true })) };
    expect(applyBattle(b, out).pendingStatus).toBeUndefined();
    expect(applyBattle(b, { ...out, victory: false }).pendingStatus).toBeUndefined();
    // bekleyen durum yokken plan eskisi gibi (startStatuses yok)
    const clean = battlePlan({ ...b, pendingStatus: undefined });
    for (const u of Object.values(clean.units.party)) expect(u.startStatuses).toBeUndefined();
  });

  it('diğer seçenekler bekleyen durum koymaz; debug aç / kapa', () => {
    const s = at('hc20');
    expect(chooseEvent(s, 'press').pendingStatus).toBeUndefined();
    expect(chooseEvent(s, 'wood').pendingStatus).toBeUndefined();
    expect(debugSetWhiteDarkChill(s, true).pendingStatus).toEqual({ status: 'chilled', turns: 2 });
    expect(debugSetWhiteDarkChill(debugSetWhiteDarkChill(s, true), false).pendingStatus).toBeUndefined();
  });
});

describe('Hall of Oaths: Stone Oath', () => {
  it('yemin et = sworn, reddet = refused; kayıtta kalır, bozuk değer atılır; metin ve çipler iki tarafı da söyler, seçim kesin', () => {
    const s = at('hc31');
    expect(nextStep(s)).toMatchObject({ kind: 'event', event: 'hc_hall_of_oaths' });
    const sworn = chooseEvent(s, 'swear');
    const refused = chooseEvent(s, 'refuse');
    expect(sworn.stoneOath).toBe('sworn');
    expect(refused.stoneOath).toBe('refused');
    expect(normalizeState(JSON.parse(JSON.stringify(refused)))?.stoneOath).toBe('refused');
    expect(normalizeState(JSON.parse(JSON.stringify({ ...refused, stoneOath: 'maybe' })))?.stoneOath).toBeUndefined();
    const ev = EVENTS['hc_hall_of_oaths']!;
    expect(ev.text).toMatch(/Loremaster Dunwe/);
    expect(ev.text).toMatch(/kin their price/);
    expect(ev.text).toMatch(/halls of our dead/);
    const [sw, rf] = ev.choices!;
    expect(sw!.hint).toMatch(/kin prices/);
    expect(sw!.hint).toMatch(/sealed/);
    expect(rf!.hint).toMatch(/outsider prices/);
    expect(rf!.hint).toMatch(/plunder/);
    for (const c of [sw!, rf!]) expect(c.hint).toMatch(/no going back/);
    const final = 'Final: an oath cannot be uncut';
    expect(choiceChips(sw!).map((c) => c.text)).toEqual(expect.arrayContaining(['Deep Market: kin prices', 'Tomb treasures sealed to you', final]));
    expect(choiceChips(rf!).map((c) => c.text)).toEqual(expect.arrayContaining(['Deep Market: outsider prices', 'Tombs open to plunder', final]));
    // sonuç penceresi: iki yüz, "Final" yok
    expect(resultChips(sw!).map((c) => c.text)).toEqual(['Deep Market: kin prices', 'Tomb treasures sealed to you']);
    expect(resultChips(rf!).map((c) => c.text)).toEqual(['Deep Market: outsider prices', 'Tombs open to plunder']);
  });

  it('devriye cezası kaldırıldı (Ömer 2026-10-29): Gatehouse devriyesi yeminden bağımsız', () => {
    expect(Object.values(MAPS).flatMap((m) => m.nodes.filter((n) => 'oathRefusedPatrol' in n).map((n) => n.id))).toEqual([]);
    let k = settle(at('hc30'));
    k = startPatrol(moveTo(k, 'hc29'));
    expect(nextStep(k)).toMatchObject({ kind: 'battle', node: 'hc29', patrol: true });
    const plain = battlePlan(k).units.enemies;
    expect(battlePlan(debugSetStoneOath(k, 'refused')).units.enemies).toEqual(plain);
    expect(battlePlan(debugSetStoneOath(k, 'sworn')).units.enemies).toEqual(plain);
  });
});

describe('Stone Oath: mühürlü cüce mezarları', () => {
  const tombs = map.nodes.filter((n) => n.oathSealed).map((n) => n.id);
  // Hazine adımına kadar çöz (koruma savaşı dahil)
  const toTreasure = (id: string): CampaignState => {
    let t = at(id);
    for (let i = 0; i < 10 && nextStep(t).kind !== 'treasure'; i++) t = autoResolve(t);
    expect(nextStep(t)).toMatchObject({ kind: 'treasure', node: id });
    return t;
  };
  const loot = (t: CampaignState): string => JSON.stringify({ inv: t.inventory.length, gold: t.gold, pending: t.pendingLoot ?? null });
  const open = (s: CampaignState): CampaignState => completeSimple(s, 'treasure');

  it('veri: yalnız Harita 3 cüce mezarları (Rune Vault, Treasury Vault, Kings Armory); hepsi hazine, metinleri var', () => {
    expect(tombs).toEqual(['hc42', 'hc44', 'hc52']);
    for (const id of ['valdoria', 'drowned-reach']) expect(MAPS[id]!.nodes.some((n) => n.oathSealed)).toBe(false);
    for (const id of tombs) {
      const n = nodeOf(id);
      expect(n.type).toBe('treasure');
      expect(TREASURES[n.treasure!]!.oathSealedText).toBeTruthy();
      expect(TREASURES[n.treasure!]!.oathPlunderText).toBe('The dead of Kharduin watch you take it.');
    }
  });

  it('yeminliyken mühürlü mezar ganimet vermez; adım biter, rota sürer', () => {
    for (const id of tombs) {
      const t = debugSetStoneOath(toTreasure(id), 'sworn');
      expect(oathSealedFor(nodeOf(id), t)).toBe(true);
      const after = open(t);
      expect(loot(after)).toBe(loot(t));
      expect(nextStep(after).kind).toBe('move');
    }
  });

  it('reddedince ve kararsızken mezar olağan sandığı verir', () => {
    for (const oath of ['refused', null] as const) {
      const t = debugSetStoneOath(toTreasure('hc42'), oath);
      expect(oathSealedFor(nodeOf('hc42'), t)).toBe(false);
      expect(loot(open(t))).not.toBe(loot(t));
    }
  });

  it('mühürsüz hazineler (Old Mine) ve Harita 1-2 yeminden etkilenmez', () => {
    const t = toTreasure('hc34');
    expect(nodeOf('hc34').oathSealed).toBeUndefined();
    const plain = open(t);
    expect(loot(plain)).not.toBe(loot(t));
    expect(loot(open(debugSetStoneOath(t, 'sworn')))).toBe(loot(plain));
    for (const id of ['valdoria', 'drowned-reach']) for (const n of MAPS[id]!.nodes) expect(oathSealedFor(n, { stoneOath: 'sworn' })).toBe(false);
  });

  it('ilk yağma satırı: yalnız ret, yalnız mezar, yalnız ilk mezar', () => {
    expect(oathFirstPlunder(map.nodes, { stoneOath: 'refused', done: [] }, 'hc42')).toBe(true);
    expect(oathFirstPlunder(map.nodes, { stoneOath: 'refused', done: ['hc44:treasure'] }, 'hc42')).toBe(false);
    expect(oathFirstPlunder(map.nodes, { stoneOath: 'sworn', done: [] }, 'hc42')).toBe(false);
    expect(oathFirstPlunder(map.nodes, { done: [] }, 'hc42')).toBe(false);
    expect(oathFirstPlunder(map.nodes, { stoneOath: 'refused', done: [] }, 'hc34')).toBe(false);
  });

  it('kart ve pencere metinleri', () => {
    expect(OATH_SEALED_CARD).toMatch(/^Sealed by your Stone Oath/);
    expect(OATH_SEALED_CHIPS.map((c) => c.text)).toEqual(['Sealed by your Stone Oath', 'Nothing taken']);
  });
});

describe('The Deep Market: yalnız bu tüccar', () => {
  const dm = nodeOf('hc54');

  it('veri: marketRules yalnız hc54te (Harita 1-2 ve diğer Harita 3 tüccarları olağan)', () => {
    expect(dm.marketRules).toBeTruthy();
    expect(dm.marketRules!.priceMult!).toBeGreaterThan(1);
    expect(Object.values(MAPS).flatMap((m) => m.nodes.filter((n) => n.marketRules).map((n) => n.id))).toEqual(['hc54']);
  });

  it('fiyat = olağan fiyat x priceMult, yeminliyken x (1 - oathDiscount); nadirlik tabanın altında değil', () => {
    const s = at('hc54');
    expect(nextStep(s)).toMatchObject({ kind: 'merchant', node: 'hc54' });
    const r = dm.marketRules!;
    for (const [oath, mult] of [[undefined, r.priceMult!], ['sworn', r.priceMult! * (1 - r.oathDiscount!)], ['refused', r.priceMult!]] as const) {
      const t = oath ? debugSetStoneOath(s, oath) : s;
      expect(marketPriceMult(dm, t)).toBeCloseTo(mult, 6);
      const wares = campaignStock(t, 'hc54');
      expect(wares.length).toBeGreaterThan(0);
      for (const w of wares) {
        expect(w.price).toBe(Math.max(1, Math.round(campaignPrice({ id: w.itemId, rolls: w.rolls }) * mult)));
        expect(instanceRarity({ id: w.itemId, rolls: w.rolls })).not.toBe('common');
      }
    }
  });

  it('diğer tüccarlar (Kharduin, Harita 1-2) yeminden ve kuraldan etkilenmez', () => {
    const k = at('hc30');
    expect(campaignStock(debugSetStoneOath(k, 'sworn'), 'hc30')).toEqual(campaignStock(k, 'hc30'));
    for (const w of campaignStock(k, 'hc30')) expect(w.price).toBe(campaignPrice({ id: w.itemId, rolls: w.rolls }));
    expect(marketPriceMult(nodeOf('hc30'), { stoneOath: 'sworn' })).toBe(1);
    for (const id of ['valdoria', 'drowned-reach']) for (const n of MAPS[id]!.nodes) expect(marketPriceMult(n, { stoneOath: 'sworn' })).toBe(1);
  });

  it('yenileme bedeli: olağan bedel x rerollMult, yeminliyken x (1 - oathDiscount); başka tüccarda olağan', () => {
    const r = dm.marketRules!;
    expect(r.rerollMult!).toBeGreaterThan(1);
    const k = at('hc30');
    const base = campaignRerollCost(k);
    const s = { ...at('hc54'), roster: k.roster, active: k.active } as CampaignState;
    expect(campaignRerollCost(s)).toBe(Math.round(base * r.rerollMult!));
    expect(campaignRerollCost(debugSetStoneOath(s, 'sworn'))).toBe(Math.round(base * r.rerollMult! * (1 - r.oathDiscount!)));
    expect(campaignRerollCost(debugSetStoneOath(k, 'sworn'))).toBe(base);
    for (const id of ['valdoria', 'drowned-reach']) for (const n of MAPS[id]!.nodes) expect(marketRerollMult(n, { stoneOath: 'sworn' })).toBe(1);
  });

  it('nadirlik tabanı: altındaysa tabana çıkar, üstündeyse aynen', () => {
    expect(withRarityFloor('common', 'uncommon')).toBe('uncommon');
    expect(withRarityFloor('rare', 'uncommon')).toBe('rare');
    expect(withRarityFloor('common', undefined)).toBe('common');
  });
});
