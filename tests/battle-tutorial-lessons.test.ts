import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { Teams } from '../src/engine';
import type { BattleLessonCtx } from '../src/tutorial/lessons';
import { LESSONS, TUTORIAL, lessonById } from '../src/tutorial/lessons';
import { _resetTutorialMemory, isLessonSeen, markLessonDone, markLessonSeen, resetTutorials, setTutorialsOn } from '../src/tutorial/store';

// Ders tavanı (C2) ve Taunt "neden olmadı" dersi (C4) akışı (src/game/battle-tutorial.ts; docs/design/tutorial.md). Mentor kutusu taklit edilir.

type Card = { title: string; text: string; focus?: string; awaitText?: string; spotlight?: boolean };
const box = vi.hoisted(() => ({
  cards: [] as Array<{ card: Card; onClose?: () => void; handle: { done: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } }>,
  lessons: [] as Array<{ id: string; o: Record<string, unknown> }>,
}));

vi.mock('../src/ui/lesson-box', () => ({
  showCard: (card: Card, onClose?: () => void) => {
    const handle = { done: vi.fn(), update: vi.fn() };
    box.cards.push({ card, ...(onClose ? { onClose } : {}), handle });
    return handle;
  },
  showLesson: (id: string, o: Record<string, unknown> = {}) => {
    box.lessons.push({ id, o });
    return true;
  },
  showMentorLine: () => true,
  dismissLesson: () => undefined,
  closeAllLessons: () => undefined,
  nudgeLesson: () => undefined,
  onLessonsTurnedOff: () => () => undefined,
}));

const { BattleTutorial } = await import('../src/game/battle-tutorial');

const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const MILL: BattleLessonCtx = { node: '1', region: 'I', encounter: 'mill_road_thugs', defeats: 0 };
const RAVEN: BattleLessonCtx = { node: '2', region: 'I', encounter: 'ravenwood_pack', defeats: 0 };

/** Hasarsız büyücü savaşı; `toMage` büyücünün sırasına kadar diğerlerini YZ ile oynatır. */
function setup() {
  const teams: Teams = { party: cells({ 1: 'mage' }), enemies: cells({ 1: 'warrior' }) };
  const b = new Battle(content.battleSetup('random-battle', 3, 'turns', teams, false));
  b.debug.damageMult = 0;
  const uid = b.combatants.find((c) => c.side === 'party')!.uid;
  const toMage = () => {
    for (let n = 0; n < 200 && b.currentUid !== uid; n++) b.applyChoice(b.currentUid!, chooseAction(b, b.currentUid!, content.aiConfig));
    expect(b.currentUid).toBe(uid);
    return b.get(uid)!;
  };
  return { b, uid, toMage };
}

beforeEach(() => {
  _resetTutorialMemory();
  resetTutorials();
  box.cards.length = 0;
  box.lessons.length = 0;
});

describe('savaş başına ders tavanı (C2)', () => {
  /** Birkaç karar oynar (her kararda başka skill + durum), çıkan dersleri döndürür. */
  const play = (ctx: BattleLessonCtx, decisions: number): string[] => {
    const { b, uid, toMage } = setup();
    const tut = new BattleTutorial(ctx, () => b);
    for (let i = 0; i < decisions; i++) {
      const me = toMage();
      b.debugSetResource(uid, 'mp', me.maxMp);
      for (const id of me.skills) me.cooldowns[id] = 0;
      b.debugAddStatus(uid, 'slow', 2);
      tut.onPlayerTurn(me);
      const sk = me.skills[i % 3]!;
      tut.onSkillSelected(sk);
      const t = b.validTargets(uid, sk)[0];
      if (!t || !b.useSkill(uid, sk, t.uid).ok) b.skipTurn();
      tut.onPerformed(sk);
    }
    return box.lessons.map((l) => l.id);
  };
  const infoOnly = (ids: string[]) => ids.filter((id) => !lessonById(id)?.done && !lessonById(id)?.capExempt);

  it('Ravenwood: en çok 3 bilgi dersi; tavansız savaşta (Windy Moor) aynı oyun daha çok ders çıkarır', () => {
    const capped = infoOnly(play(RAVEN, 8));
    expect(capped).toHaveLength(TUTORIAL.battleLessonCap.perBattle);
    box.lessons.length = 0;
    _resetTutorialMemory();
    resetTutorials();
    const free = infoOnly(play({ node: 'moor', region: 'I', encounter: 'windy_moor', defeats: 0 }, 8));
    expect(free.length).toBeGreaterThan(TUTORIAL.battleLessonCap.perBattle);
  });

  it('kalan ders görülmemiş kalır ve sonraki savaşta çıkar', () => {
    const first = infoOnly(play(RAVEN, 8));
    for (const id of first) markLessonSeen(id); // gerçek kutu gösterince işaretler (burada taklit)
    box.lessons.length = 0;
    const next = infoOnly(play({ node: '3', region: 'I', encounter: 'watchtower_tutorial', defeats: 0 }, 8));
    expect(next.length).toBeGreaterThan(0);
    for (const id of next) expect(first).not.toContain(id);
  });
});

describe('"Neden olmadı" dersi (C4)', () => {
  const taunted = (mode: 'turns' | 'test' = 'turns') => {
    const teams: Teams = { party: cells({ 1: 'mage' }), enemies: cells({ 0: 'warrior', 2: 'warrior' }) };
    const b = new Battle(content.battleSetup('random-battle', 3, mode, teams, false));
    b.debug.damageMult = 0;
    const uid = b.combatants.find((c) => c.side === 'party')!.uid;
    const shield = b.combatants.find((c) => c.side === 'enemy' && c.slot === 0)!;
    const other = b.combatants.find((c) => c.side === 'enemy' && c.slot === 2)!;
    if (mode === 'turns') for (let n = 0; n < 200 && b.currentUid !== uid; n++) b.applyChoice(b.currentUid!, chooseAction(b, b.currentUid!, content.aiConfig));
    expect(b.debugCast(shield.uid, 'taunt').ok).toBe(true); // gerçek Taunt skill'i (Taunt ayrı durum tanımı değil)
    return { b, uid, shield, other, basic: b.get(uid)!.skills[0]! };
  };

  /** Diğer savaş dersleri bitmiş sayılır: bu kararın dersi başka bir ders olmasın ("kararda bir ders"). */
  const quiet = () => {
    for (const l of LESSONS) {
      if (!l.trigger.battle || l.id === 'taunt_rejected') continue;
      markLessonSeen(l.id);
      markLessonDone(l.id);
    }
  };

  it('ilk ret: ders açılır, koruyan birim döner (vurgu), metne adı girer; eylem yapılınca kart kapanır', () => {
    const { b, uid, shield, other, basic } = taunted();
    quiet();
    const tut = new BattleTutorial(RAVEN, () => b);
    tut.onPlayerTurn(b.get(uid)!);
    box.lessons.length = 0;
    expect(tut.onTargetRejected(uid, basic, other.uid)).toEqual([shield.uid]);
    expect(box.lessons).toEqual([{ id: 'taunt_rejected', o: expect.objectContaining({ vars: { protector: shield.displayName ?? shield.name } }) }]);
    expect(tut.isLessonOpen('taunt_rejected')).toBe(true);
    tut.onPerformed(basic);
    expect(tut.isLessonOpen('taunt_rejected')).toBe(false);
  });

  it('bir kez: görülmüşse yeniden çıkmaz', () => {
    const { b, uid, other, basic } = taunted();
    quiet();
    markLessonSeen('taunt_rejected');
    const tut = new BattleTutorial(RAVEN, () => b);
    tut.onPlayerTurn(b.get(uid)!);
    box.lessons.length = 0;
    expect(tut.onTargetRejected(uid, basic, other.uid)).toEqual([]);
    expect(box.lessons).toEqual([]);
  });

  it('Tutorials kapalı / "Don’t show again" sonrası çıkmaz', () => {
    const { b, uid, other, basic } = taunted();
    quiet();
    const tut = new BattleTutorial(RAVEN, () => b);
    tut.onPlayerTurn(b.get(uid)!);
    box.lessons.length = 0;
    setTutorialsOn(false);
    expect(tut.onTargetRejected(uid, basic, other.uid)).toEqual([]);
    expect(box.lessons).toEqual([]);
  });

  it('kararda bir ders: aynı kararda başka ders çıktıysa bekler', () => {
    const { b, uid, other, basic } = taunted();
    const tut = new BattleTutorial(RAVEN, () => b);
    tut.onPlayerTurn(b.get(uid)!); // Reading a Fighter
    expect(box.lessons.map((l) => l.id)).toEqual(['unit_card']);
    expect(tut.onTargetRejected(uid, basic, other.uid)).toEqual([]);
    expect(isLessonSeen('taunt_rejected')).toBe(false);
  });

  it('tavan doluyken de çıkar (muaf)', () => {
    const { b, uid, shield, other, basic } = taunted();
    quiet();
    const tut = new BattleTutorial(RAVEN, () => b);
    const shown = (tut as unknown as { shownHere: Set<string> }).shownHere;
    shown.add('hit_preview').add('statuses').add('area_shapes');
    tut.onPlayerTurn(b.get(uid)!);
    expect(tut.onTargetRejected(uid, basic, other.uid)).toEqual([shield.uid]);
    expect(box.lessons.map((l) => l.id)).toContain('taunt_rejected');
  });

  it('Mill Road: zorunlu adım sürerken ve adımlar bitince de çıkmaz', () => {
    const { b, uid, other, basic } = taunted();
    const tut = new BattleTutorial(MILL, () => b);
    tut.onPlayerTurn(b.get(uid)!);
    expect(tut.forced).toBe('next');
    expect(tut.onTargetRejected(uid, basic, other.uid)).toEqual([]);
    const free = new BattleTutorial({ ...MILL }, () => b);
    expect(free.onTargetRejected(uid, basic, other.uid)).toEqual([]);
  });

  it('test modu: çökmez, durum dersleri gibi ders çıkmaz', () => {
    const { b, uid, other, basic } = taunted('test');
    const tut = new BattleTutorial(RAVEN, () => b);
    expect(tut.onTargetRejected(uid, basic, other.uid)).toEqual([]);
    expect(box.lessons).toEqual([]);
  });
});
