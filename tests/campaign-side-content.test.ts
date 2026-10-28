// Harita 2 yan içerik (maps-2-3.md 9; open-questions 428): A1 Wayshrines (sınav + seferlik nimet) ve B1 Salvage Dive (derinlik + sandık).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  applyBattle,
  battlePlan,
  boonIds,
  boonList,
  boonMods,
  campaignWaveTeams,
  completeSimple,
  continueToMap,
  debugJumpDrownedReach,
  debugJumpNode,
  debugSetBoons,
  diveDeeper,
  diveDefeat,
  diveMax,
  diveState,
  DROWNED_REACH,
  ENCOUNTERS,
  encounterWaves,
  getMap,
  mergeMods,
  newCampaign,
  nextStep,
  normalizeState,
  setMapOverride,
  ultSkillOf,
  validateEncounters,
  validateMap,
  WAYSHRINES,
  type CampaignState,
} from '../src/campaign';
import { Battle, chooseAction, content } from '../src/engine';

beforeAll(() => setMapOverride(DROWNED_REACH, true));
afterAll(() => setMapOverride(DROWNED_REACH, null));

const map = getMap(DROWNED_REACH);
let base: CampaignState | undefined;
const at = (node: string): CampaignState => debugJumpNode((base ??= debugJumpDrownedReach(newCampaign({ mode: "normal", seed: 11 }))), node);
const battleOf = (plan: ReturnType<typeof battlePlan>) =>
  new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan) }, false));
/** Herkes ayakta kazandı (canlar aynen). */
const win = (s: CampaignState) => applyBattle(s, { victory: true, units: battlePlan(s).heroOrder.map((id) => ({ heroId: id, hpRatio: s.roster.find((h) => h.id === id)!.hpRatio, alive: true })) });

describe('A1 Wayshrines', () => {
  const shrines = map.nodes.filter((n) => n.shrine);

  it('bölge başına 1 sunak cebi; kesik yol, tek giriş, veri geçerli', () => {
    expect(shrines.map((n) => n.region).sort()).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI']);
    expect(validateMap(map)).toEqual([]);
    expect(validateEncounters()).toEqual([]);
    for (const n of shrines) {
      expect(n.optional, n.id).toBe(true);
      expect(WAYSHRINES[n.shrine!], n.id).toBeDefined();
      expect(map.edges.filter((e) => e.to === n.id).map((e) => e.style)).toEqual(['dashed']);
      const enc = ENCOUNTERS[n.encounter!]!;
      expect(enc.trial, n.id).toBeDefined();
      expect(encounterWaves(enc, n.id, n.type, n.region), n.id).toHaveLength(1); // sınav tek dalga
    }
    expect(new Set(shrines.map((n) => n.shrine)).size).toBe(6);
  });

  it('"Only 2 heroes": yalnız en öndeki 2 ayakta kahraman savaşa girer, diğerleri dokunulmaz', () => {
    const s = at('dr84');
    expect(s.roster.length).toBe(4);
    const plan = battlePlan(s);
    expect(plan.heroOrder).toHaveLength(2);
    expect(plan.party.filter(Boolean)).toHaveLength(2);
    const front = s.active.filter(Boolean).slice(0, 2);
    expect(plan.heroOrder).toEqual(front);
    // kazanınca nimet; savaşa girmeyenlerin canı değişmez
    const before = s.roster.map((h) => [h.id, h.hpRatio]);
    const t = applyBattle(s, { victory: true, units: plan.heroOrder.map((id) => ({ heroId: id, hpRatio: 0.5, alive: true })) });
    expect(t.boons).toEqual(['dr_shrine_stone']);
    for (const [id, hp] of before) if (!plan.heroOrder.includes(id as string)) expect(t.roster.find((h) => h.id === id)!.hpRatio).toBe(hp);
    // sonraki adım nimet penceresi (olay), sonra yol
    expect(nextStep(t).kind).toBe('event');
    expect(nextStep(completeSimple(t, 'event')).kind).toBe('move');
  });

  it('düşmüş kahraman sınava giremez (sıradaki ayakta kahraman girer)', () => {
    const s = at('dr84');
    const first = s.active.filter(Boolean)[0]!;
    const t = { ...s, roster: s.roster.map((h) => (h.id === first ? { ...h, alive: false, hpRatio: 0 } : h)) };
    const plan = battlePlan(t);
    expect(plan.heroOrder).toHaveLength(2);
    expect(plan.heroOrder).not.toContain(first);
  });

  it('"No ultimates for the first 3 turns": her kahramanın ultimate\'ı ilk 3 kendi turunda kilitli, 4.de açılır', () => {
    const plan = battlePlan(at('dr85'));
    const b = battleOf(plan);
    const turns = new Map<string, number>();
    let last = '';
    const checked = new Set<string>();
    for (let i = 0; i < 400 && !b.winner; i++) {
      const a = b.currentActor;
      if (!a) break;
      if (a.side === 'party' && a.uid !== last) {
        const n = (turns.get(a.uid) ?? 0) + 1;
        turns.set(a.uid, n);
        const ult = ultSkillOf(a.defId)!;
        if (n <= 3) expect(b.canUse(a.uid, ult).ok, `${a.defId} turn ${n}`).toBe(false);
        if (n === 4) {
          expect(a.cooldowns[ult] ?? 0, `${a.defId} turn 4`).toBe(0);
          checked.add(a.uid);
        }
      }
      last = a.uid;
      // ultimate'ı hiç seçmeyen basit oyuncu: kilit dışı da kullanılmasın ki 4. turdaki sayaç temiz okunsun
      const c = chooseAction(b, a.uid, content.aiConfig, undefined, { difficulty: plan.difficulty });
      if (!c) break;
      const ult = a.side === 'party' ? ultSkillOf(a.defId) : undefined;
      const pick = ult && 'skill' in c && c.skill === ult ? { kind: 'skip' as const } : c;
      if (!b.applyChoice(a.uid, pick as typeof c).ok) b.applyChoice(a.uid, c);
    }
    expect(plan.units.party[Number(Object.keys(plan.units.party)[0])]?.startCooldowns).toBeDefined();
    expect(checked.size + (b.winner ? 1 : 0)).toBeGreaterThan(0);
  });

  it('kurallar mevcut katmandan: Narrow Ledge = arka iki sıra kapalı, Line = hold, Storm = survive 5', () => {
    expect(battlePlan(at('dr86')).rules?.blocked).toEqual([6, 7, 8, 9, 10, 11]);
    expect(battlePlan(at('dr87')).rules?.objective).toBe('hold');
    expect(battlePlan(at('dr88')).rules?.objective).toEqual({ type: 'survive', rounds: 5 });
    const vigil = battlePlan(at('dr89'));
    expect(vigil.heroOrder).toHaveLength(3);
    const b = battleOf(battlePlan(at('dr86')));
    for (const c of b.combatants.filter((x) => x.side === 'party')) expect(c.slot, c.defId).toBeLessThan(6);
  });

  it('nimet her savaşta her kahramana: +%3 maks can çarpanı, kritik / şifa ekleri toplanır', () => {
    const s = debugSetBoons(at('dr3'), true);
    expect(boonIds(s)).toHaveLength(6);
    expect(boonList(s).map((b) => b.name)).toContain('Blessing of Stone');
    const mods = boonMods(s)!;
    expect(mods).toMatchObject({ hpMult: 1.03, critAdd: 0.02, healPowerAdd: 0.05, damageAdd: 0.03, evasionAdd: 0.02, shieldPowerAdd: 0.05 });
    const plain = battlePlan(at('dr3'));
    const blessed = battlePlan(s);
    for (const cell of Object.keys(blessed.units.party).map(Number)) {
      const a = plain.units.party[cell]?.modifiers ?? {};
      const m = blessed.units.party[cell]!.modifiers!;
      expect(m.hpMult).toBeCloseTo((a.hpMult ?? 1) * 1.03, 4);
      expect(m.critAdd).toBeCloseTo((a.critAdd ?? 0) + 0.02, 4);
    }
    const b0 = battleOf(plain);
    const b1 = battleOf(blessed);
    const hp = (b: Battle) => b.combatants.filter((c) => c.side === 'party').map((c) => c.maxHp);
    hp(b1).forEach((v, i) => expect(v).toBeGreaterThan(hp(b0)[i]!));
    expect(mergeMods({ attrAdd: { str: 2 } }, { attrAdd: { str: 1 }, hpMult: 1.1 })).toEqual({ attrAdd: { str: 3 }, hpMult: 1.1 });
  });

  it('nimet kayıtta kalır, bozuk id atılır; harita geçişinde taşınır', () => {
    const s = { ...debugSetBoons(at('dr3'), false), boons: ['dr_shrine_stone', 'nope', 'dr_shrine_stone'] };
    const n = normalizeState(JSON.parse(JSON.stringify(s)))!;
    expect(n.boons).toEqual(['dr_shrine_stone']);
    const empty = normalizeState(JSON.parse(JSON.stringify({ ...s, boons: ['nope'] })))!;
    expect(empty.boons).toBeUndefined();
    // Harita 1 -> 2: alan aynen
    const m1 = { ...newCampaign({ mode: 'normal', seed: 3 }) };
    expect(m1.boons).toBeUndefined();
    const fake = { ...at('dr3'), boons: ['dr_shrine_keen'] };
    expect(JSON.parse(JSON.stringify(fake)).boons).toEqual(['dr_shrine_keen']);
    expect(typeof continueToMap).toBe('function');
  });

  it('debug: sunağa atla (takım hazır, sınav bekliyor)', () => {
    const s = debugJumpNode(base!, 'dr87');
    expect(s.at).toBe('dr87');
    expect(nextStep(s)).toMatchObject({ kind: 'battle', encounter: 'dr_87' });
  });
});

describe('B1 Salvage Dive', () => {
  const sites = map.nodes.filter((n) => n.dive?.length);

  it('3 batık hazine; her biri 3 derinlik, karşılaşmalar var', () => {
    expect(sites.map((n) => n.id).sort()).toEqual(['dr19', 'dr51', 'dr72']);
    for (const n of sites) {
      expect(n.type).toBe('treasure');
      expect(diveMax(n)).toBe(3);
      for (const e of n.dive!) expect(ENCOUNTERS[e], e).toBeDefined();
    }
  });

  it('kazan -> "Dive deeper?" -> 2. derinlik tek dalga, arada şifa yok -> 3. derinlik -> yüzeye çık: 3 sandık', () => {
    let s = win(at('dr19'));
    const d1 = diveState(s)!;
    expect(d1).toMatchObject({ won: 1, max: 3, next: 'dr_19_d2' });
    s = diveDeeper(s);
    const step = nextStep(s);
    expect(step).toMatchObject({ kind: 'battle', encounter: 'dr_19_d2', dive: 2 });
    const plan = battlePlan(s);
    expect(plan.dive).toBe(2);
    expect(plan.encounterId).toBe('dr_19_d2');
    expect(plan.waves).toBeUndefined(); // tek dalga
    // derinlik zaferi: canlar aynen (zafer şifası yok), loot yok
    const hp = 0.4;
    const gold0 = s.gold;
    s = applyBattle(s, { victory: true, units: plan.heroOrder.map((id) => ({ heroId: id, hpRatio: hp, alive: true })) });
    for (const id of plan.heroOrder) expect(s.roster.find((h) => h.id === id)!.hpRatio).toBe(hp);
    expect(s.gold).toBe(gold0);
    expect(s.dive).toEqual({ node: 'dr19', depth: 2 });
    expect(diveState(s)).toMatchObject({ won: 2, next: 'dr_19_d3' });
    s = diveDeeper(s);
    s = win(s);
    expect(diveState(s)).toMatchObject({ won: 3, next: null });
    expect(() => diveDeeper(s)).toThrow();
    // yüzey: düğümün sandığı + 2. (1 Rare + 30 altın) + 3. derinlik (Rare + Epic + 60 altın)
    s = { ...s, inventory: [] }; // çanta dolup Epic geride kalmasın (2026-10-27: yeni çekiç tabanları loot havuzunu kaydırdı, çanta dolabiliyordu)
    const bag0 = s.inventory.length;
    const g0 = s.gold;
    const t = completeSimple(s, 'treasure');
    expect(t.dive).toBeUndefined();
    expect(t.inventory.length - bag0).toBeGreaterThanOrEqual(3);
    expect(t.gold - g0).toBeGreaterThanOrEqual(90);
    expect(t.inventory.slice(bag0).map((i) => i.rolls?.rarity)).toEqual(expect.arrayContaining(['rare', 'epic']));
    // 2026-10-28: dr19'da sandıktan sonra Vesper buluşması (olay adımı) gelir; sandık bitince yol ondan sonra açılır
    expect(nextStep(t)).toMatchObject({ kind: 'event', event: 'dr_vesper' });
    expect(nextStep(completeSimple(t, 'event')).kind).toBe('move');
  });

  it('derinlikte yenilgi: son bulunan sandık batar, öncekiler alınır, savaştaki canlar kalır', () => {
    let s = win(at('dr51'));
    s = diveDeeper(s);
    s = win(s); // derinlik 2 kazanıldı
    s = diveDeeper(s); // 3. derinlikte yenilir
    const plan = battlePlan(s);
    const g0 = s.gold;
    const bag0 = s.inventory.length;
    const t = diveDefeat(s, { units: plan.heroOrder.map((id, i) => ({ heroId: id, hpRatio: i === 0 ? 0 : 0.3, alive: i !== 0 })) });
    expect(t.dive).toBeUndefined();
    expect(nextStep(t).kind).toBe('move'); // hazine bitti
    // 1. derinliğin sandığı (Sea Cave: 15 altın + hediye) geldi, 2. derinliğin sandığı (30 altın) battı
    expect(t.gold - g0).toBe(15);
    expect(t.inventory.length).toBeGreaterThan(bag0);
    expect(t.roster.find((h) => h.id === plan.heroOrder[1])!.hpRatio).toBe(0.3);
    expect(t.stats.defeats).toBe(s.stats.defeats + 1);
  });

  it('2. derinlikte yenilgi: hiçbir sandık gelmez (1. derinliğin sandığı batar)', () => {
    let s = win(at('dr72'));
    s = diveDeeper(s);
    const plan = battlePlan(s);
    const g0 = s.gold;
    const t = diveDefeat(s, { units: plan.heroOrder.map((id) => ({ heroId: id, hpRatio: 0.2, alive: true })) });
    expect(t.gold).toBe(g0);
    expect(t.inventory.length).toBe(s.inventory.length);
  });

  it('dalış kayıtta: geçerli alan kalır, başka düğümün / bozuk alan atılır', () => {
    const s = diveDeeper(win(at('dr19')));
    expect(normalizeState(JSON.parse(JSON.stringify(s)))!.dive).toEqual({ node: 'dr19', depth: 1, diving: true });
    expect(normalizeState(JSON.parse(JSON.stringify({ ...s, dive: { node: 'dr5', depth: 1 } })))!.dive).toBeUndefined();
    expect(normalizeState(JSON.parse(JSON.stringify({ ...s, dive: { node: 'dr19', depth: 'x' } })))!.dive).toBeUndefined();
  });

  it('dalışsız korunan hazine eskisi gibi: zafer -> sandık penceresi (dalış yok)', () => {
    const s = win(at('dr5'));
    expect(diveState(s)).toBeNull();
    expect(nextStep(s).kind).toBe('treasure');
  });
});
