// "Skip tutorial" (Ömer 2026-10-23): kahraman seçiminde tutorial atlanır, sefer Ashford'da "Form your company" adımında sürer.
import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  autoResolve,
  canWithdraw,
  formCompany,
  isCleared,
  isDone,
  latestSave,
  mapOf,
  memoryKV,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  pathTo,
  pickHero,
  roamOpen,
  skipTutorial,
  tutorialNodes,
  visitedNodes,
  writeSave,
} from '../src/campaign';

const fresh = (seed = 4242) => newCampaign({ mode: 'normal', seed });
const companyNode = (s = fresh()) => mapOf(s).nodes.find((n) => n.newCompany)!;

describe('skipTutorial', () => {
  it('starts at the company town with "Form your company" pending and no heroes', () => {
    const s = skipTutorial(fresh());
    const c = companyNode(s);
    expect(s.at).toBe(c.id);
    expect(nextStep(s)).toMatchObject({ kind: 'company', node: c.id, size: c.newCompany!.size });
    expect(s.roster).toEqual([]);
    expect(s.active.every((x) => x === '')).toBe(true);
    expect(isDone(s, c.id, 'farewell')).toBe(true);
  });

  it('marks the tutorial road as visited and cleared, like a finished tutorial', () => {
    const s = skipTutorial(fresh());
    const map = mapOf(s);
    const c = companyNode(s);
    const route = pathTo(map, c.id);
    expect(s.path).toEqual(route);
    for (const id of route) expect(visitedNodes(s)).toContain(id);
    for (const id of route.slice(0, -1)) expect(isCleared(s, id)).toBe(true);
    for (const id of tutorialNodes(map)) if (id !== c.id) expect(isCleared(s, id)).toBe(true);
    // Tutorial'ı oynayarak gelen durumla aynı düğümler / adımlar
    let played = fresh();
    for (;;) {
      const st = nextStep(played);
      if (played.at === c.id && st.kind === 'company') break;
      played = st.kind === 'move' ? moveTo(played, route[route.indexOf(played.at) + 1]!) : autoResolve(played, st);
    }
    expect([...s.cleared].sort()).toEqual([...played.cleared].sort());
    expect([...s.done].sort()).toEqual([...played.done].sort());
  });

  it('keeps tutorial rewards but hides what the player never saw', () => {
    const before = fresh();
    const s = skipTutorial(before);
    expect(s.stats).toEqual(before.stats);
    expect(s.pendingLoot).toBeUndefined();
    expect(s.levelUps).toBeUndefined();
    expect(s.formationDue).toBeUndefined();
    if (s.pendingHandover) expect(s.pendingHandover.from).toEqual([]);
    expect(s.inventory.length).toBeGreaterThan(0); // tutorial takımının başlangıç silahları (normal vedadaki gibi)
    const route = pathTo(mapOf(s), s.at);
    for (const id of route.slice(0, -1)) if (CONFIG.tips[id]) expect(s.tipsSeen).toContain(id);
  });

  it('is deterministic for the same seed', () => {
    expect(skipTutorial(fresh(7))).toEqual(skipTutorial(fresh(7)));
  });

  it('only works on the hero step', () => {
    const picked = pickHero(fresh(), CONFIG.starterPool[0]!);
    expect(() => skipTutorial(picked)).toThrow();
  });

  it('forming the company afterwards opens free roam with level 1 heroes', () => {
    const s = skipTutorial(fresh());
    const size = companyNode(s).newCompany!.size;
    const t = formCompany(s, CONFIG.companyPool.slice(0, size));
    expect(t.roster).toHaveLength(size);
    expect(t.roster.every((h) => h.level === 1 && !h.tutorial)).toBe(true);
    expect(roamOpen(t)).toBe(true);
    expect(nextStep(t).kind).not.toBe('company');
    expect(typeof canWithdraw(t)).toBe('boolean');
  });

  it('survives a save / load roundtrip with the company step still pending', () => {
    const s = skipTutorial(fresh());
    const kv = memoryKV();
    expect(writeSave(kv, s, 'auto').ok).toBe(true);
    const entry = latestSave(kv, s.slot)!;
    const loaded = normalizeState(JSON.parse(JSON.stringify(entry.state)), s.slot)!;
    expect(loaded).not.toBeNull();
    expect(loaded.at).toBe(s.at);
    expect(nextStep(loaded).kind).toBe('company');
    expect(loaded.cleared.sort()).toEqual([...s.cleared].sort());
  });
});
