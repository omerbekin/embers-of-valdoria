import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { Teams } from '../src/engine';
import { ENCOUNTERS, battlePlan, debugTeleport, getMap, newCampaign } from '../src/campaign';
import {
  LESSONS,
  TUTORIAL,
  codexLessons,
  defeatHint,
  dueBattleLesson,
  dueScreenLessons,
  lessonComplete,
  forcedSteps,
  lessonById,
  lessonPages,
  openingLine,
  type BattleLessonCtx,
  type LessonProgress,
  type Situation,
} from '../src/tutorial/lessons';
import { _resetTutorialMemory, isLessonSeen, markLessonSeen, resetTutorials, seenLessons, setTutorialsOn, tutorialsOn } from '../src/tutorial/store';
import { buildLessons } from '../src/wiki/catalog';

// Sefer tutorial'ı (docs/design/tutorial.md, data/tutorial.json): veri denetimi, tetik kuralları, kayıt, motorun "ölemez" kurulumu.

const map = getMap('valdoria');
const ctx = (node: string, o: Partial<BattleLessonCtx> = {}): BattleLessonCtx => ({ node, region: map.nodes.find((n) => n.id === node)!.region, encounter: map.nodes.find((n) => n.id === node)!.encounter ?? '', defeats: 0, ...o });
const prog = (o: Partial<LessonProgress> = {}): LessonProgress => ({ seen: new Set(), done: new Set(), shows: () => 0, thisBattle: new Set(), ...o });
const due = (node: string, found: Situation[], p: LessonProgress = prog()) => dueBattleLesson(ctx(node), found, p)?.lesson.id ?? null;
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

  it('tetiklerdeki düğüm ve karşılaşmalar haritada var; zorunlu adımlar yalnızca ilk savaşta, diğer savaş dersleri yalnızca durumla', () => {
    const nodes = new Set(map.nodes.map((n) => n.id));
    for (const l of LESSONS) {
      const b = l.trigger.battle;
      for (const n of [...(b?.node ?? []), ...(l.trigger.node ?? []), ...(l.trigger.after ? [l.trigger.after] : [])]) expect(nodes.has(n), `${l.id} -> ${n}`).toBe(true);
      expect(!!b !== !!l.trigger.screen, `${l.id}: tek tür tetik`).toBe(true);
      if (l.forced) expect(b, l.id).toEqual({ node: [map.start], when: 'start' });
      else if (b) {
        expect(b.node, `${l.id}: durum dersi düğüme bağlı değil`).toBeUndefined();
        expect(b.when, l.id).not.toBe('start');
      }
      // eylem dersi gösterdiği düğmeye odaklanır
      if (l.done && l.done !== 'ultimate') expect(l.focus, l.id).toMatch(/data-global=/);
    }
    expect(TUTORIAL.actionRepeats).toBeGreaterThanOrEqual(1);
    expect(TUTORIAL.opening.node).toBe(map.start);
    for (const enc of Object.keys(TUTORIAL.defeatHints.byEncounter)) expect(ENCOUNTERS[enc], enc).toBeDefined();
    // ipucu verilen karşılaşmalar gerçekten ipucu bölgesinde
    for (const enc of Object.keys(TUTORIAL.defeatHints.byEncounter)) {
      const n = map.nodes.find((x) => x.encounter === enc);
      expect(n && TUTORIAL.defeatHints.regions.includes(n.region), enc).toBe(true);
    }
  });

});

describe('savaş içi tetikler', () => {
  it('ilk savaş: açılış sözü + sırayla zorunlu adımlar (sıra çubuğu, saldırı, hedef)', () => {
    expect(ids(forcedSteps(ctx('1'), none))).toEqual(['turn_bar', 'attack', 'target']);
    expect(openingLine(ctx('1'), none)).toBe(TUTORIAL.opening.text);
    // görülen adım atlanır; hepsi görüldüyse açılış sözü de yok
    expect(ids(forcedSteps(ctx('1'), new Set(['turn_bar'])))).toEqual(['attack', 'target']);
    expect(openingLine(ctx('1'), new Set(['turn_bar', 'attack', 'target']))).toBeNull();
    // ilk savaşta durum dersi yok (senaryo), başka düğümde zorunlu adım yok
    expect(due('1', [{ when: 'rest' }, { when: 'ultimate', skill: 'x' }])).toBeNull();
    expect(forcedSteps(ctx('2'), none)).toEqual([]);
    expect(openingLine(ctx('2'), none)).toBeNull();
  });

  it('durum dersi: yalnızca durum oluşunca, her bölgede; kararda tek ders (veri sırası öncelik), skill odağa taşınır', () => {
    expect(due('2', [])).toBeNull();
    expect(due('2', [{ when: 'rest', skill: 'fireball' }])).toBe('rest');
    expect(due('moor', [{ when: 'move' }])).toBe('move');
    expect(due('10', [{ when: 'skip' }])).toBe('skip');
    expect(due('2', [{ when: 'spent', skill: 'a' }, { when: 'rest' }])).toBe('rest');
    expect(due('3', [{ when: 'status' }, { when: 'ultimate', skill: 'u' }])).toBe('ultimate');
    expect(dueBattleLesson(ctx('3'), [{ when: 'ultimate', skill: 'u' }], prog())?.skill).toBe('u');
    expect(due('2', [{ when: 'reach', skill: 'm' }])).toBe('rows_reach');
    expect(due('2', [{ when: 'area', skill: 'm' }])).toBe('area_shapes');
    expect(due('9', [{ when: 'telegraph' }])).toBe('boss');
    expect(due('moor', [{ when: 'ground' }])).toBe('burning_ground');
    // bu savaşta gösterilen atlanır, sıradaki duruma geçilir
    expect(due('2', [{ when: 'rest' }, { when: 'spent' }], prog({ thisBattle: new Set(['rest']) }))).toBe('skills_mp');
  });

  it('bilgi dersi bir kez görülünce biter; eylem dersi eylem yapılınca ya da actionRepeats savaştan sonra', () => {
    const info = lessonById('skills_mp')!;
    const act = lessonById('rest')!;
    expect(info.done).toBeUndefined();
    expect(act.done).toBe('rest');
    expect(lessonComplete(info, prog({ seen: new Set(['skills_mp']) }))).toBe(true);
    expect(lessonComplete(act, prog({ seen: new Set(['rest']) }))).toBe(false); // görüldü ama Rest yapılmadı: durum yeniden oluşunca çıkar
    expect(due('2', [{ when: 'rest' }], prog({ seen: new Set(['rest']), shows: () => 1 }))).toBe('rest');
    expect(lessonComplete(act, prog({ done: new Set(['rest']) }))).toBe(true);
    expect(lessonComplete(act, prog({ shows: () => TUTORIAL.actionRepeats }))).toBe(true);
    expect(due('2', [{ when: 'rest' }], prog({ done: new Set(['rest']) }))).toBeNull();
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
    expect(TUTORIAL.groups.indexOf(lessonById('turn_bar')!.group)).toBeLessThan(TUTORIAL.groups.indexOf(lessonById('statuses')!.group));
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

  it('Mill Road iki kahramanla: planda iki kahraman da ölemez; ağır hasarda ikisi de ayakta kalır, savaş kaybedilmez', () => {
    // Ravenwood'dan sonra iki kahramanlı takım Mill Road'daymış gibi (debug / ileride 2 kişilik açılış)
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), '3');
    expect(s.active.filter(Boolean)).toHaveLength(2);
    s = { ...s, at: '1', done: s.done.filter((d) => !d.startsWith('1:battle')) };
    const plan = battlePlan(s);
    expect(plan.encounterId).toBe('mill_road_thugs');
    const party = Object.values(plan.units.party);
    expect(party.length).toBe(2);
    expect(party.every((u) => u.undying)).toBe(true);
    const teams: Teams = { party: cells({ 1: 'mage', 4: 'archer' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 2: 'cutthroat' }), units: { party: { 1: { undying: true }, 4: { undying: true } } } };
    for (const seed of [1, 2]) {
      const b = new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
      b.debug.damageMult = 6;
      for (let n = 0; n < 800 && !b.winner; n++) {
        const uid = b.currentActor?.uid;
        if (!uid) break;
        b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
        for (const c of b.combatants.filter((x) => x.side === 'party' && !x.summoned)) expect(c.hp, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      }
      expect(b.winner, `seed ${seed}`).not.toBe('enemy');
    }
  });
});
