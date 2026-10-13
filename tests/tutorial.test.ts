import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { Teams } from '../src/engine';
import { ENCOUNTERS, battlePlan, debugTeleport, getMap, newCampaign } from '../src/campaign';
import {
  LESSONS,
  TUTORIAL,
  codexLessons,
  defeatHint,
  dueBattleLessons,
  dueScreenLessons,
  forcedSteps,
  lessonById,
  lessonPages,
  openingLine,
  type BattleLessonCtx,
  type BattleMoment,
} from '../src/tutorial/lessons';
import { _resetTutorialMemory, isLessonSeen, markLessonSeen, resetTutorials, seenLessons, setTutorialsOn, tutorialsOn } from '../src/tutorial/store';
import { buildLessons } from '../src/wiki/catalog';

// Sefer tutorial'ı (docs/design/tutorial.md, data/tutorial.json): veri denetimi, tetik kuralları, kayıt, motorun "ölemez" kurulumu.

const map = getMap('valdoria');
const ctx = (node: string, o: Partial<BattleLessonCtx> = {}): BattleLessonCtx => ({ node, region: map.nodes.find((n) => n.id === node)!.region, encounter: map.nodes.find((n) => n.id === node)!.encounter ?? '', defeats: 0, ...o });
const moment = (o: Partial<BattleMoment> = {}): BattleMoment => ({ turn: 1, hasStatus: false, hasGround: false, hasBoss: false, ...o });
const none = new Set<string>();
const ids = (ls: ReadonlyArray<{ id: string }>) => ls.map((l) => l.id);
const sentences = (t: string) => (t.match(/[.!?](\s|$)/g) ?? []).length;

describe('tutorial verisi', () => {
  it('dersler tekil, grupları tanımlı, metinler kısa (en çok 2 cümle) ve İngilizce', () => {
    expect(new Set(ids(LESSONS)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(TUTORIAL.groups, l.id).toContain(l.group);
      expect(l.title.trim(), l.id).not.toBe('');
      for (const p of lessonPages(l)) {
        expect(p.text.trim(), l.id).not.toBe('');
        expect(sentences(p.text), `${l.id}: ${p.text}`).toBeLessThanOrEqual(2);
        expect(/[ğüşıöçĞÜŞİÖÇ]/.test(p.text), l.id).toBe(false);
      }
      if (l.codex) expect(sentences(l.codex), l.id).toBeLessThanOrEqual(2);
    }
    expect(sentences(TUTORIAL.opening.text)).toBeLessThanOrEqual(3);
  });

  it('tetiklerdeki düğüm, bölge ve karşılaşmalar haritada var; zorunlu adımlar yalnızca ilk savaşta', () => {
    const nodes = new Set(map.nodes.map((n) => n.id));
    const regions = new Set(map.nodes.map((n) => n.region));
    for (const l of LESSONS) {
      const b = l.trigger.battle;
      for (const n of [...(b?.node ?? []), ...(l.trigger.node ?? []), ...(l.trigger.after ? [l.trigger.after] : [])]) expect(nodes.has(n), `${l.id} -> ${n}`).toBe(true);
      for (const r of b?.region ?? []) expect(regions.has(r), `${l.id} -> ${r}`).toBe(true);
      expect(!!b !== !!l.trigger.screen, `${l.id}: tek tür tetik`).toBe(true);
      if (l.forced) expect(b?.node, l.id).toEqual([map.start]);
    }
    expect(TUTORIAL.opening.node).toBe(map.start);
    for (const enc of Object.keys(TUTORIAL.defeatHints.byEncounter)) expect(ENCOUNTERS[enc], enc).toBeDefined();
    // ipucu verilen karşılaşmalar gerçekten ipucu bölgesinde
    for (const enc of Object.keys(TUTORIAL.defeatHints.byEncounter)) {
      const n = map.nodes.find((x) => x.encounter === enc);
      expect(n && TUTORIAL.defeatHints.regions.includes(n.region), enc).toBe(true);
    }
  });

  it('Bölüm III ders vermez (yalnızca yenilgi ipucu)', () => {
    for (const l of LESSONS) expect(l.trigger.battle?.region ?? [], l.id).not.toContain('III');
    for (const n of map.nodes.filter((x) => x.region === 'III')) expect(ids(LESSONS.filter((l) => l.trigger.battle?.node?.includes(n.id))), n.id).toEqual([]);
  });
});

describe('savaş içi tetikler', () => {
  it('ilk savaş: açılış sözü + sırayla zorunlu adımlar (sıra çubuğu, saldırı, hedef)', () => {
    expect(ids(forcedSteps(ctx('1'), none))).toEqual(['turn_bar', 'attack', 'target']);
    expect(openingLine(ctx('1'), none)).toBe(TUTORIAL.opening.text);
    // görülen adım atlanır; hepsi görüldüyse açılış sözü de yok
    expect(ids(forcedSteps(ctx('1'), new Set(['turn_bar'])))).toEqual(['attack', 'target']);
    expect(openingLine(ctx('1'), new Set(['turn_bar', 'attack', 'target']))).toBeNull();
    // zorunlu adımlar serbest ders listesinde çıkmaz; başka düğümde zorunlu adım yok
    expect(ids(dueBattleLessons(ctx('1'), moment(), none))).toEqual([]);
    expect(forcedSteps(ctx('2'), none)).toEqual([]);
    expect(openingLine(ctx('2'), none)).toBeNull();
  });

  it('Ravenwood: başta skill/MP, melee seçince ya da 2. kararda menzil', () => {
    expect(ids(dueBattleLessons(ctx('2'), moment(), none))).toEqual(['skills_mp']);
    expect(ids(dueBattleLessons(ctx('2'), moment({ skill: { melee: false, area: false } }), none))).toEqual([]);
    expect(ids(dueBattleLessons(ctx('2'), moment({ skill: { melee: true, area: false } }), none))).toEqual(['rows_reach']);
    expect(ids(dueBattleLessons(ctx('2'), moment({ turn: 2 }), new Set(['skills_mp'])))).toEqual(['rows_reach']);
  });

  it('Watchtower: başta ultimate, 2. kararda Rest / Skip / Move', () => {
    expect(ids(dueBattleLessons(ctx('3'), moment(), none))).toEqual(['ultimate']);
    expect(ids(dueBattleLessons(ctx('3'), moment({ turn: 2 }), new Set(['ultimate'])))).toEqual(['actions']);
  });

  it('Bölüm II: durum, alan skill seçimi, zemin, boss; durum oluşmadan çıkmaz', () => {
    const moor = ctx('moor');
    expect(ids(dueBattleLessons(moor, moment(), none))).toEqual([]);
    expect(ids(dueBattleLessons(moor, moment({ hasStatus: true }), none))).toEqual(['statuses']);
    expect(ids(dueBattleLessons(moor, moment({ hasGround: true }), none))).toEqual(['burning_ground']);
    expect(ids(dueBattleLessons(moor, moment({ skill: { melee: false, area: true } }), none))).toEqual(['area_shapes']);
    expect(ids(dueBattleLessons(ctx('9'), moment({ hasBoss: true }), none))).toEqual(['boss']);
    // Bölüm I'de bölge II dersleri yok, Bölüm III'te hiç ders yok
    expect(ids(dueBattleLessons(ctx('2'), moment({ hasStatus: true, hasGround: true, hasBoss: true }), new Set(['skills_mp'])))).toEqual([]);
    expect(dueBattleLessons(ctx('10'), moment({ turn: 3, hasStatus: true, hasGround: true, hasBoss: true }), none)).toEqual([]);
  });

  it('Bölüm III yenilgi ipucu: aynı savaş 2 kez kaybedilince, duruma özel', () => {
    expect(defeatHint(ctx('10', { defeats: 1 }))).toBeNull();
    expect(defeatHint(ctx('10', { defeats: 2 }))).toBe(TUTORIAL.defeatHints.byEncounter['ashen_plain']);
    expect(defeatHint(ctx('10', { defeats: 2, encounter: 'unknown' }))).toBe(TUTORIAL.defeatHints.default);
    expect(defeatHint(ctx('moor', { defeats: 5 }))).toBeNull();
  });
});

describe('ekran tetikleri ve Codex', () => {
  it('kasaba dersi yalnızca Ashford; harita dersleri Ashford geçilince (Formation 3+ kişide)', () => {
    expect(ids(dueScreenLessons('town', { node: '4' }, none))).toEqual(['town']);
    expect(ids(dueScreenLessons('town', { node: '7' }, none))).toEqual([]);
    expect(ids(dueScreenLessons('map', { path: ['1', '2', '3'], partySize: 2 }, none))).toEqual([]);
    expect(ids(dueScreenLessons('map', { path: ['1', '2', '3', '4'], partySize: 3 }, none))).toEqual(['formation', 'roads']);
    expect(ids(dueScreenLessons('map', { path: ['1', '2', '3', '4'], partySize: 2 }, none))).toEqual(['roads']);
    expect(ids(dueScreenLessons('gear', {}, none))).toEqual(['gear']);
    expect(lessonPages(lessonById('gear')!)).toHaveLength(3);
    expect(lessonPages(lessonById('endless')!)).toHaveLength(3);
    expect(ids(dueScreenLessons('gear', {}, new Set(['gear'])))).toEqual([]);
  });

  it('Codex > Lessons yalnızca görülen dersleri grup sırasıyla gösterir; katalog tüm dersleri taşır', () => {
    expect(codexLessons(none)).toEqual([]);
    const got = codexLessons(new Set(['endless', 'statuses', 'turn_bar']));
    expect(got.map((l) => l.id)).toEqual(['turn_bar', 'statuses', 'endless']);
    expect(got[2]!.paragraphs).toHaveLength(3);
    expect(codexLessons(new Set(['attack']))[0]!.paragraphs).toEqual([lessonById('attack')!.codex]);
    expect(buildLessons()).toHaveLength(LESSONS.length);
  });
});

describe('tutorial kaydı (proto.tutorial.v1)', () => {
  const mem = new Map<string, string>();
  const fake = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: unknown }).localStorage = fake;
    _resetTutorialMemory();
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    _resetTutorialMemory();
  });

  it('varsayılan açık; görülen ders ve ayar sürümlü kayda yazılır, yeniden okunur', () => {
    expect(tutorialsOn()).toBe(true);
    expect(seenLessons().size).toBe(0);
    markLessonSeen('turn_bar');
    markLessonSeen('turn_bar');
    setTutorialsOn(false);
    expect(JSON.parse(mem.get('proto.tutorial.v1')!)).toEqual({ v: 1, on: false, seen: ['turn_bar'] });
    _resetTutorialMemory();
    expect(tutorialsOn()).toBe(false);
    expect(isLessonSeen('turn_bar')).toBe(true);
    resetTutorials();
    expect(tutorialsOn()).toBe(true);
    expect(seenLessons().size).toBe(0);
  });

  it('bozuk ya da başka sürüm kayıt: varsayılan', () => {
    mem.set('proto.tutorial.v1', '{bad');
    expect(tutorialsOn()).toBe(true);
    _resetTutorialMemory();
    mem.set('proto.tutorial.v1', JSON.stringify({ v: 99, on: false, seen: ['x'] }));
    expect(tutorialsOn()).toBe(true);
    expect(seenLessons().size).toBe(0);
  });
});

describe('ilk savaş kaybedilemez (UnitSetup.undying)', () => {
  const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');

  it('ölemez birim can 1 altına inmez; savaş oyuncu YZ ile oynanınca kazanılır', () => {
    const teams: Teams = { party: cells({ 1: 'mage' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 2: 'cutthroat' }), units: { party: { 1: { undying: true } } } };
    for (const seed of [1, 2, 3]) {
      const b = new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
      b.debug.damageMult = 5;
      let minHp = Infinity;
      for (let n = 0; n < 600 && !b.winner; n++) {
        const uid = b.currentActor?.uid;
        if (!uid) break;
        b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
        minHp = Math.min(minHp, b.get('party-0')!.hp);
      }
      expect(minHp, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      expect(b.winner, `seed ${seed}`).not.toBe('enemy');
    }
  });

  it('verilmezse aynı birim ölebilir (kural yalnızca kuruluma bağlı)', () => {
    const teams: Teams = { party: cells({ 1: 'mage' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 2: 'cutthroat' }) };
    const b = new Battle(content.battleSetup('random-battle', 1, 'turns', teams, false));
    b.debug.damageMult = 5;
    for (let n = 0; n < 600 && !b.winner; n++) {
      const uid = b.currentActor?.uid;
      if (!uid) break;
      b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
    }
    expect(b.winner).toBe('enemy');
  });

  it('sefer: Mill Road planında kahraman ölemez, sonraki savaşlarda değil', () => {
    const mill = battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), '1'));
    expect(Object.values(mill.units.party).every((u) => u.undying)).toBe(true);
    expect(Object.keys(mill.units.party).length).toBeGreaterThan(0);
    const raven = battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), '2'));
    expect(Object.values(raven.units.party).some((u) => u.undying)).toBe(false);
  });
});
