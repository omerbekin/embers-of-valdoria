import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { Teams } from '../src/engine';
import type { BattleLessonCtx } from '../src/tutorial/lessons';
import { strongMpSkill } from '../src/tutorial/situations';
import { _resetTutorialMemory, isLessonSeen, resetTutorials } from '../src/tutorial/store';

// Savaş içi tutorial akışı (src/game/battle-tutorial.ts; docs/design/tutorial.md): Mill Road zorunlu adımları (1. karar: sıra çubuğu ->
// saldırı -> hedef; 2. karar: en güçlü MP skill'i -> hedef -> "Skills and MP"), sonraki savaşta kararda en çok bir durum dersi.
// Mentor kutusu (DOM) taklit edilir: yalnızca hangi kartın / dersin hangi seçeneklerle açıldığı denetlenir.

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
const enemy = (b: Battle, uid: string, skill: string) => b.validTargets(uid, skill)[0]!.uid;

beforeEach(() => {
  _resetTutorialMemory();
  resetTutorials();
  box.cards.length = 0;
  box.lessons.length = 0;
});

describe('Mill Road zorunlu adımları', () => {
  it('1. karar: sıra çubuğu (spot ışığı) -> saldırı -> hedef; 2. karar: en güçlü MP skill’i parlar, kullanılınca Skills and MP burada', () => {
    const { b, uid, toMage } = setup();
    const tut = new BattleTutorial(MILL, () => b);
    let me = toMage();
    const basic = me.skills[0]!;
    tut.onPlayerTurn(me);
    expect(tut.forced).toBe('next');
    const bar = box.cards.find((c) => c.card.title === 'The Turn Bar')!;
    expect(bar.card).toMatchObject({ focus: '.bh-turn', spotlight: true });
    expect(tut.allowSkill(basic)).toBe(false);
    bar.onClose!(); // "Next"
    expect(tut.forced).toBe('skill');
    expect(box.cards.at(-1)!.card).toMatchObject({ title: 'Attacking', spotlight: true });
    expect(tut.allowSkill(me.skills[1]!)).toBe(false);
    expect(tut.allowGlobal()).toBe(false);
    expect(tut.allowSkill(basic)).toBe(true);
    tut.onSkillSelected(basic);
    expect(tut.forced).toBe('target');
    expect(box.cards.at(-1)!.card.spotlight).toBeUndefined(); // hedef adımı: düşmanlar karartılmaz
    expect(tut.allowPerform(basic)).toBe(true);
    expect(b.useSkill(uid, basic, enemy(b, uid, basic)).ok).toBe(true);
    tut.onPerformed(basic);
    expect(tut.forced).toBeNull();

    // 2. karar
    me = toMage();
    b.debugSetResource(uid, 'mp', me.maxMp);
    const mp = strongMpSkill(b, uid)!;
    expect(mp).toBeTruthy();
    tut.onPlayerTurn(me);
    expect(tut.forced).toBe('skill');
    const step = box.cards.at(-1)!;
    expect(step.card).toMatchObject({ title: 'Stronger Skills', focus: `[data-skill='${mp}']`, spotlight: true });
    expect(isLessonSeen('f_mp_skill')).toBe(true);
    expect(tut.allowSkill(basic)).toBe(false);
    expect(tut.allowSkill(mp)).toBe(true);
    tut.onSkillSelected(mp);
    expect(tut.forced).toBe('target');
    expect(step.handle.update).toHaveBeenCalledWith(expect.objectContaining({ spotlight: false }));
    expect(tut.allowPerform(basic)).toBe(false);
    expect(tut.allowPerform(mp)).toBe(true);
    tut.onPerformed(mp);
    expect(tut.forced).toBeNull();
    expect(box.lessons).toEqual([{ id: 'skills_mp', o: expect.objectContaining({ force: true, skill: mp }) }]);
  });

  it('2. kararda kullanılabilir MP skill’i yoksa adım sessizce atlanır (ders görülmemiş kalır)', () => {
    const { b, uid, toMage } = setup();
    const tut = new BattleTutorial(MILL, () => b);
    let me = toMage();
    tut.onPlayerTurn(me);
    box.cards.find((c) => c.card.title === 'The Turn Bar')!.onClose!();
    tut.onSkillSelected(me.skills[0]!);
    b.useSkill(uid, me.skills[0]!, enemy(b, uid, me.skills[0]!));
    tut.onPerformed(me.skills[0]!);
    me = toMage();
    b.debugSetResource(uid, 'mp', 0);
    const before = box.cards.length;
    tut.onPlayerTurn(me);
    expect(tut.forced).toBeNull();
    expect(box.cards.length).toBe(before);
    expect(isLessonSeen('f_mp_skill')).toBe(false);
  });
});

describe('sonraki savaş: durum dersleri', () => {
  it('ilk karar Reading a Fighter; aynı kararda ikinci ders yok, sonraki kararda Hit Chance', () => {
    const { b, uid, toMage } = setup();
    const tut = new BattleTutorial(RAVEN, () => b);
    let me = toMage();
    tut.onPlayerTurn(me);
    expect(box.lessons.map((l) => l.id)).toEqual(['unit_card']);
    const basic = me.skills[0]!;
    tut.onSkillSelected(basic); // aynı karar: Hit Chance bekler
    expect(box.lessons.map((l) => l.id)).toEqual(['unit_card']);
    b.useSkill(uid, basic, enemy(b, uid, basic));
    tut.onPerformed(basic);
    me = toMage();
    me.cooldowns[me.skills[3]!] = 5; // Ultimate hazır olmasın (o kararı o alırdı)
    tut.onPlayerTurn(me);
    tut.onSkillSelected(basic);
    expect(box.lessons.map((l) => l.id)).toContain('hit_preview');
  });
});
