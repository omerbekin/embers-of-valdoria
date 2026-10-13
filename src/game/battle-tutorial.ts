import type { Battle, Combatant } from '../engine';
import { defeatHint, dueBattleLessons, forcedSteps, openingLine, type BattleLessonCtx, type BattleMoment, type ForcedAwait, type Lesson } from '../tutorial/lessons';
import { markLessonSeen, seenLessons, tutorialsOn } from '../tutorial/store';
import { closeAllLessons, onLessonsTurnedOff, showCard, showLesson, showMentorLine, type LessonHandle } from '../ui/lesson-box';

/**
 * Savaş içi tutorial yöneticisi (sefer savaşı; BattleScene çağırır, kurallar saf src/tutorial/lessons.ts, docs/design/tutorial.md).
 * - İlk savaş (Mill Road): açılış sözü + zorunlu adımlar (sıra çubuğu -> saldırı düğmesi -> hedef). Adım bitmeden başka girdi kabul edilmez
 *   (`allowSkill` / `allowGlobal` / `allowPerform`); ayar kapalıysa ya da "Don't show again" basılırsa serbest kalır.
 * - Sonraki savaşlar: oyuncu kararı başında ve skill seçiminde zamanı gelen serbest dersler (oyunu durdurmaz).
 * - Bölüm III: aynı savaş iki kez kaybedildiyse savaş başında mentor ipucu.
 */

const AWAIT_TEXT: Record<Exclude<ForcedAwait, 'next'>, string> = {
  skill: 'Press the glowing skill',
  target: 'Tap a glowing enemy',
};

/** Yenilgi ipucu bu oturumda bu düğüm + yenilgi sayısı için gösterildi mi (her yeni denemede bir kez). */
const hintShown = new Set<string>();

export class BattleTutorial {
  private turn = 0;
  private lastKey = '';
  /** Sıradaki zorunlu adımlar (ilk savaş). */
  private steps: Lesson[] = [];
  /** Şu an beklenen zorunlu eylem (yoksa serbest). */
  private phase: ForcedAwait | null = null;
  private handle: LessonHandle | null = null;
  private basicSkill: string | null = null;
  private readonly offTurnOff: () => void;

  constructor(
    private readonly ctx: BattleLessonCtx,
    private readonly battle: () => Battle,
  ) {
    this.offTurnOff = onLessonsTurnedOff(() => this.release());
  }

  /** Zorunlu adım sürüyor mu (debug / test). */
  get forced(): ForcedAwait | null {
    return this.phase;
  }

  /** Oyuncunun kararı başladı (aynı karar için birden çok çağrı tek sayılır). */
  onPlayerTurn(actor: Combatant): void {
    const b = this.battle();
    const key = `${b.currentUid}:${b.log.length}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.turn++;
    if (this.turn === 1) {
      const hint = defeatHint(this.ctx);
      const hk = `${this.ctx.node}:${this.ctx.defeats}`;
      if (hint && !hintShown.has(hk) && showMentorLine('A word of advice', hint)) hintShown.add(hk);
      if (tutorialsOn()) {
        this.steps = forcedSteps(this.ctx, seenLessons());
        if (this.steps.length) {
          this.basicSkill = actor.skills[0] ?? null;
          const open = openingLine(this.ctx, seenLessons());
          if (open) showCard({ title: 'Mill Road', text: open, more: true });
          this.phase = 'next';
          this.nextStep();
          return;
        }
      }
    }
    if (this.phase) return;
    this.showFree(this.moment());
  }

  /** Oyuncu bir skill seçti (seçim uygulandıktan sonra). */
  onSkillSelected(skillId: string): void {
    if (this.phase === 'skill' && skillId === this.basicSkill) {
      this.finishStep();
      return;
    }
    if (this.phase) return;
    const b = this.battle();
    this.showFree({ ...this.moment(), skill: { melee: b.isMelee(skillId), area: b.isAreaSkill(skillId) || b.isShapeSkill(skillId) } });
  }

  allowSkill(skillId: string): boolean {
    if (!this.phase) return true;
    return this.phase !== 'next' && skillId === this.basicSkill;
  }

  allowGlobal(): boolean {
    return !this.phase;
  }

  allowPerform(skillId: string): boolean {
    if (!this.phase) return true;
    return this.phase === 'target' && skillId === this.basicSkill;
  }

  /** Oyuncu bir eylem yaptı (skill hedefe gitti). */
  onPerformed(): void {
    if (this.phase === 'target') this.finishStep();
  }

  /** Savaş bitti: açık kutular kapanır. */
  end(): void {
    this.release();
  }

  destroy(): void {
    this.offTurnOff();
    this.release();
  }

  // ------------------------------------------------------------ iç

  private moment(): BattleMoment {
    const b = this.battle();
    const living = b.combatants.filter((c) => c.hp > 0);
    return {
      turn: this.turn,
      hasStatus: living.some((c) => c.statuses.length > 0),
      hasGround: b.ground.length > 0,
      hasBoss: living.some((c) => c.side === 'enemy' && c.tier === 'boss'),
    };
  }

  private showFree(m: BattleMoment): void {
    if (!tutorialsOn()) return;
    for (const l of dueBattleLessons(this.ctx, m, seenLessons())) showLesson(l.id);
  }

  /** Sıradaki zorunlu adımı açar; kalmadıysa serbest kalır. */
  private nextStep(): void {
    const l = this.steps.shift();
    if (!l || !l.forced) {
      this.phase = null;
      this.handle = null;
      return;
    }
    markLessonSeen(l.id);
    const kind = l.forced;
    const text = l.text ?? '';
    if (kind === 'next') {
      this.phase = 'next';
      this.handle = showCard({ title: l.title, text, ...(l.focus ? { focus: l.focus } : {}) }, () => {
        if (this.phase === 'next') this.nextStep();
      });
      return;
    }
    this.phase = kind;
    this.handle = showCard({ title: l.title, text, awaitText: AWAIT_TEXT[kind], ...(l.focus ? { focus: l.focus } : {}) });
  }

  private finishStep(): void {
    const h = this.handle;
    this.handle = null;
    this.phase = 'next';
    h?.done();
    this.nextStep();
  }

  /** Zorunlu akış biter (ayar kapandı / savaş bitti / sahne kapandı); kutular kapanır. */
  private release(): void {
    this.phase = null;
    this.steps = [];
    this.handle = null;
    closeAllLessons();
  }
}
