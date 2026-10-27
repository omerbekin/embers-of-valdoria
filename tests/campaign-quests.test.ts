// A5 Personal Quests, Harita 2 (Ömer seçimi 2026-10-27, form quests/surge; map2-quests-surge.md 1; open-questions 431).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  applyBattle,
  applyQuestBonus,
  battlePlan,
  campaignWaveTeams,
  canWithdraw,
  chooseEvent,
  clone,
  completeSimple,
  debugJumpDrownedReach,
  debugJumpNode,
  debugJumpQuest,
  debugSetOath,
  DROWNED_REACH,
  ENCOUNTERS,
  encounterWaves,
  eventChoicesFor,
  getMap,
  grantQuest,
  heroQuests,
  heroTitles,
  hiddenQuestNodes,
  isCleared,
  moveOptions,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  OATHS,
  QUEST_LIST,
  questBase,
  questBonusLine,
  QUESTS,
  questOpen,
  setMapOverride,
  shownMap,
  validateEncounters,
  validateMap,
  type CampaignState,
  type Hero,
} from '../src/campaign';
import { Battle, content } from '../src/engine';
import { personalQuestsArticle } from '../src/wiki/catalog';

beforeAll(() => setMapOverride(DROWNED_REACH, true));
afterAll(() => setMapOverride(DROWNED_REACH, null));

const map = getMap(DROWNED_REACH);
let base: CampaignState | undefined;
const start = (): CampaignState => (base ??= debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 11 })));
const jump = (id: string): CampaignState => debugJumpQuest(start(), id);
const holder = (s: CampaignState, cls: string): Hero => [...s.roster, ...(s.reserve ?? [])].find((h) => h.class === cls)!;
/** Savaşa girenler ayakta kazandı (canlar aynen). */
const win = (s: CampaignState): CampaignState =>
  applyBattle(s, { victory: true, units: battlePlan(s).heroOrder.map((id) => ({ heroId: id, hpRatio: s.roster.find((h) => h.id === id)!.hpRatio, alive: true })) });
/** Kadrodan (aktif + yedek) bu sınıfı çıkarır (yalnız görünürlük testi: sınıf adı değişir). */
const withoutClass = (s: CampaignState, cls: string): CampaignState => {
  const t = clone(s);
  for (const h of [...t.roster, ...(t.reserve ?? [])]) if (h.class === cls) h.class = cls === 'warrior' ? 'defender' : 'warrior';
  return t;
};

describe('A5 görev verisi', () => {
  it('Harita 2: 5 sınıf (Hexer Harita 3te), pasif alanları sayı, bonus metni "+X%"', () => {
    expect(QUEST_LIST.map((q) => q.class).sort()).toEqual(['archer', 'cutthroat', 'gambler', 'paladin', 'undead']);
    expect(QUEST_LIST.some((q) => q.class === 'hexer')).toBe(false);
    for (const q of QUEST_LIST) {
      expect(questBase(q), q.id).toBeDefined();
      expect(q.passive.add, q.id).toBeGreaterThan(0);
      expect(map.nodes.some((n) => n.id === q.node && n.quest === q.id), q.id).toBe(true);
      expect(questBonusLine(q), q.id).toMatch(/^[A-Z][\w' ]+ \+\d+(\.\d)?% \(\d+(\.\d)?% → \d+(\.\d)?% .+\)$/);
    }
    // belgedeki (a) değerleri
    const after = (id: string) => Math.round((questBase(QUESTS[id]!)!.value + QUESTS[id]!.passive.add) * 1000) / 1000;
    expect([after('paladin_bell'), after('undead_name'), after('archer_shoot'), after('cutthroat_debt'), after('gambler_table')]).toEqual([0.3, 0.6, 0.06, 0.3, 0.28]);
    expect(questBonusLine(QUESTS['paladin_bell']!)).toBe('Divine Light +3% (27% → 30% of Intelligence healed)');
  });

  it('cepler: dr90-dr93 isteğe bağlı, tek kesik giriş; Paladin dr56 cep değil; karşılaşmalar geçerli ve tek dalga', () => {
    expect(validateMap(map)).toEqual([]);
    expect(validateEncounters()).toEqual([]);
    const pockets = map.nodes.filter((n) => n.quest && n.optional).map((n) => n.id);
    expect(pockets).toEqual(['dr90', 'dr91', 'dr92', 'dr93']);
    for (const id of pockets) expect(map.edges.filter((e) => e.to === id || e.from === id).map((e) => e.style)).toEqual(['dashed']);
    expect(map.nodes.find((n) => n.id === 'dr56')).toMatchObject({ quest: 'paladin_bell' });
    expect(map.nodes.find((n) => n.id === 'dr56')!.optional).toBeUndefined();
    for (const id of ['dr_56_bell', 'dr_90', 'dr_91', 'dr_92', 'dr_93']) expect(encounterWaves(ENCOUNTERS[id]!, 'x', 'event'), id).toHaveLength(1);
  });
});

describe('A5 görünürlük (A4 = c: sınıf kadroda, yedek dahil)', () => {
  it('sınıf yoksa cep gizli (çizilmez, yol yok), yedekte varsa görünür', () => {
    const at41 = win(debugJumpNode(start(), 'dr41', 'archer')); // cebin girişi (savaşı kazanıldı: yola çıkılabilir)
    expect(nextStep(at41).kind).toBe('move');
    expect(moveOptions(at41).forward.concat(moveOptions(at41).back)).toContain('dr91');
    const none = withoutClass(at41, 'archer');
    expect(questOpen(none, 'archer_shoot')).toBe(false);
    expect(hiddenQuestNodes(map, none)).toContain('dr91');
    expect(shownMap(none).nodes.some((n) => n.id === 'dr91')).toBe(false);
    expect(shownMap(none).edges.some((e) => e.to === 'dr91')).toBe(false);
    expect([...moveOptions(none).forward, ...moveOptions(none).back]).not.toContain('dr91');
    expect(() => moveTo(none, 'dr91')).toThrow();
    // yalnız yedekte bir Archer: görünür
    const res = clone(none);
    res.reserve = [...(res.reserve ?? []), { ...clone(none).roster[0]!, id: 'hres', class: 'archer', leader: undefined }];
    expect(questOpen(res, 'archer_shoot')).toBe(true);
    expect(hiddenQuestNodes(map, res)).not.toContain('dr91');
  });

  it('ayak basılmış cep sınıf gidince de görünür kalır; bulunulan düğüm hiç gizlenmez', () => {
    const s = withoutClass(jump('archer_shoot'), 'archer');
    expect(s.at).toBe('dr91');
    expect(hiddenQuestNodes(map, s)).not.toContain('dr91');
  });

  it('Paladin seçeneği Monk\'s Isle\'da yalnız Paladin kadrodayken', () => {
    const s = jump('paladin_bell');
    expect(s.at).toBe('dr56');
    expect(eventChoicesFor(s, 'dr_monks_isle').map((c) => c.id)).toEqual(['bread', 'bell', 'leave']);
    expect(eventChoicesFor(withoutClass(s, 'paladin'), 'dr_monks_isle').map((c) => c.id)).toEqual(['bread', 'leave']);
    expect(() => chooseEvent(withoutClass(s, 'paladin'), 'bell')).toThrow();
  });
});

describe('A5 görev akışları ve ödül', () => {
  it('Paladin: Keep the vigil -> Survive 4 Rounds -> unvan + Divine Light +3% (savaşta pasif yaması)', () => {
    const s = chooseEvent(jump('paladin_bell'), 'bell');
    expect(nextStep(s)).toMatchObject({ kind: 'battle', encounter: 'dr_56_bell' });
    expect(battlePlan(s).rules?.objective).toMatchObject({ type: 'survive', rounds: 4 });
    const t = win(s);
    const p = holder(t, 'paladin');
    expect(p.quests).toEqual(['paladin_bell']);
    expect(heroTitles(p)).toEqual(['Bellkeeper of St. Brann']);
    expect(nextStep(t).kind).toBe('move');
    // sonraki savaşlarda pasif yamalı (skill ağacının pasifi üstüne)
    const setup = {};
    applyQuestBonus(setup, p);
    expect((setup as { tree?: { passive?: { effect: { power: number } } } }).tree?.passive?.effect.power).toBeCloseTo(0.3, 6);
  });

  it('bonus gerçek savaşta: battlePlan kurulumu -> motor Combatant pasifi', () => {
    const s = jump('paladin_bell');
    const t = clone(s);
    grantQuest(t, 'paladin_bell');
    const back = moveTo(completeSimple(t, 'event'), 'dr55'); // önceki savaş düğümü (temizlenmiş) -> devriye yerine: yalnızca kurulum
    const at = { ...back, patrol: back.at } as CampaignState;
    const plan = battlePlan(at);
    const pal = holder(at, 'paladin');
    const cell = at.active.indexOf(pal.id);
    expect(plan.units.party[cell]?.tree?.passive?.effect).toMatchObject({ type: 'divineLight' });
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan) }, false));
    const c = b.combatants.find((x) => x.side === 'party' && x.defId === 'paladin')!;
    expect((c.passive!.effect as { power: number }).power).toBeCloseTo(0.3, 6);
    // görevi olmayan kahramanın pasifi aynen
    const other = b.combatants.find((x) => x.side === 'party' && x.defId !== 'paladin' && x.passive)!;
    expect(other.passive).toEqual(content.classes[other.defId]!.passive);
  });

  it('Archer: yalnız 2 kahraman, Archer her zaman içeride (requireClass), zafer -> görev penceresi -> unvan', () => {
    const s = jump('archer_shoot');
    expect(nextStep(s)).toMatchObject({ kind: 'battle', encounter: 'dr_91' });
    const archer = holder(s, 'archer');
    // Archer'ı en arkaya al: yine de girer
    const t = clone(s);
    const from = t.active.indexOf(archer.id);
    const back = t.active.length - 1 - [...t.active].reverse().findIndex((x) => !x);
    t.active[back] = archer.id;
    t.active[from] = '';
    const plan = battlePlan(t);
    expect(plan.heroOrder).toHaveLength(2);
    expect(plan.heroOrder).toContain(archer.id);
    const w = win(t);
    expect(holder(w, 'archer').quests).toEqual(['archer_shoot']);
    expect(nextStep(w).kind).toBe('event');
    expect(nextStep(completeSimple(w, 'event')).kind).toBe('move');
  });

  it('Undead: Speak the name (savaş) ödüllü; Let it drown ödülsüz kapanır', () => {
    const s = jump('undead_name');
    const won = win(chooseEvent(s, 'speak'));
    expect(holder(won, 'undead').quests).toEqual(['undead_name']);
    const drown = chooseEvent(s, 'drown');
    expect(holder(drown, 'undead').quests).toBeUndefined();
    expect(isCleared(drown, 'dr90')).toBe(true);
    expect(nextStep(drown).kind).toBe('move');
  });

  it('Cutthroat: Pay (altın, savaşsız) tam ödül; Settle (ilk 3 tur ultimate yok) + 40 altın', () => {
    const s = { ...jump('cutthroat_debt'), gold: 100 };
    const paid = chooseEvent(s, 'pay');
    expect(paid.gold).toBe(40);
    expect(holder(paid, 'cutthroat').quests).toEqual(['cutthroat_debt']);
    expect(() => chooseEvent({ ...s, gold: 10 }, 'pay')).toThrow('Not enough gold');
    const fight = chooseEvent(s, 'settle');
    const plan = battlePlan(fight);
    for (const id of plan.heroOrder) {
      const h = fight.roster.find((x) => x.id === id)!;
      const ult = content.classes[h.class]!.skills[3]!;
      expect(plan.units.party[fight.active.indexOf(id)]?.startCooldowns?.[ult], h.class).toBe(4);
    }
    const won = win(fight);
    expect(won.gold).toBe(140);
    expect(holder(won, 'cutthroat').quests).toEqual(['cutthroat_debt']);
  });

  it('Gambler: Walk away olayı açık bırakır (yola çıkılır, dönülür); Lay the stake: bedel, arka sıra kapalı, zafer 2 kat', () => {
    const s = { ...jump('gambler_table'), gold: 100 };
    expect(canWithdraw(s)).toBe(true);
    expect(() => chooseEvent(s, 'walk')).toThrow();
    const away = moveTo(s, 'dr63');
    expect(isCleared(away, 'dr93')).toBe(false);
    const again = moveTo(away, 'dr93');
    expect(nextStep(again)).toMatchObject({ kind: 'event', event: 'dr_quest_table' });
    const staked = chooseEvent(again, 'stake');
    expect(staked.gold).toBe(60);
    expect(canWithdraw(staked)).toBe(false); // bahis konuldu: savaş kilitli (olay savaşı)
    expect(battlePlan(staked).rules?.blocked).toEqual([9, 10, 11]);
    const won = win(staked);
    expect(won.gold).toBe(140);
    expect(holder(won, 'gambler').quests).toEqual(['gambler_table']);
  });

  it('ödül yedekteki kahramana da gider; aynı görev ikinci kez verilmez', () => {
    const s = clone(jump('undead_name'));
    const u = s.roster.find((h) => h.class === 'undead')!;
    s.roster = s.roster.filter((h) => h !== u);
    s.active = s.active.map((x) => (x === u.id ? '' : x));
    s.reserve = [...(s.reserve ?? []), u];
    expect(grantQuest(s, 'undead_name')).toBe(u.id);
    expect(s.reserve!.find((h) => h.id === u.id)!.quests).toEqual(['undead_name']);
    expect(grantQuest(s, 'undead_name')).toBeNull();
  });

  it('A8: Hero Oath + görev bonusu aynı kahramanda birlikte', () => {
    const s = clone(jump('paladin_bell'));
    grantQuest(s, 'paladin_bell');
    const pal = holder(s, 'paladin');
    const sworn = debugSetOath(completeSimple(s, 'event'), pal.id, OATHS[0]!.id);
    const at = { ...moveTo(sworn, 'dr55') } as CampaignState;
    const plan = battlePlan({ ...at, patrol: at.at });
    const setup = plan.units.party[at.active.indexOf(pal.id)]!;
    expect(setup.modifiers?.damageAdd).toBeGreaterThan(0);
    expect((setup.tree?.passive?.effect as { power: number }).power).toBeCloseTo(0.3, 6);
  });
});

describe('A5 kayıt ve Codex', () => {
  it('Hero.quests isteğe bağlı: geçerli kalır, bilinmeyen / başka sınıfın / tekrar eden atılır, bozuk alan silinir', () => {
    const s = clone(jump('paladin_bell'));
    const pal = s.roster.find((h) => h.class === 'paladin')!;
    const other = s.roster.find((h) => h.class !== 'paladin')!;
    pal.quests = ['paladin_bell', 'nope', 'paladin_bell', 'undead_name'];
    other.quests = 'broken' as unknown as string[];
    const n = normalizeState(JSON.parse(JSON.stringify(s)))!;
    expect(n.roster.find((h) => h.id === pal.id)!.quests).toEqual(['paladin_bell']);
    expect(n.roster.find((h) => h.id === other.id)!.quests).toBeUndefined();
    pal.quests = ['undead_name'];
    expect(normalizeState(JSON.parse(JSON.stringify(s)))!.roster.find((h) => h.id === pal.id)!.quests).toBeUndefined();
    expect(heroQuests({ class: 'paladin' })).toEqual([]);
  });

  it('debug: her görev düğümüne atla (sınıf takımda, adımlar baştan bekler)', () => {
    for (const q of QUEST_LIST) {
      const s = jump(q.id);
      expect(s.at, q.id).toBe(q.node);
      expect(s.roster.some((h) => h.class === q.class), q.id).toBe(true);
      expect(['event', 'battle'], q.id).toContain(nextStep(s).kind);
    }
  });

  it('Codex > Mechanics: Personal quests makalesi tüm unvanları ve bonusları yazar', () => {
    const text = JSON.stringify(personalQuestsArticle());
    for (const q of QUEST_LIST) {
      expect(text, q.id).toContain(q.title);
      expect(text, q.id).toContain(questBonusLine(q));
    }
  });
});
