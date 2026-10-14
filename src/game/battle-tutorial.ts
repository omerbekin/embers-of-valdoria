import type { Battle, Combatant } from '../engine';
import { defeatHint, dueBattleLesson, forcedSteps, openingLine, type BattleLessonCtx, type ForcedAwait, type Lesson, type LessonAction, type Situation } from '../tutorial/lessons';
import { selectSituations, turnSituations } from '../tutorial/situations';
import { lessonDoneIds, lessonShows, markLessonDone, markLessonSeen, noteLessonShown, seenLessons, tutorialsOn } from '../tutorial/store';
import { closeAllLessons, dismissLesson, nudgeLesson, onLessonsTurnedOff, showCard, showLesson, showMentorLine, type LessonHandle } from '../ui/lesson-box';

/**
 * Savaş içi tutorial yöneticisi (sefer savaşı; BattleScene çağırır, kurallar saf src/tutorial/lessons.ts, docs/design/tutorial.md).
 * - İlk savaş (Mill Road): açılış sözü + zorunlu adımlar (sıra çubuğu -> saldırı düğmesi -> hedef). Adım bitmeden başka girdi kabul edilmez
 *   (`allowSkill` / `allowGlobal` / `allowPerform`); ayar kapalıysa ya da "Don't show again" basılırsa serbest kalır.
 * - Sonraki savaşlar: DURUM dersleri (Ömer 2026-10-14): oyuncu kararı başında / skill seçiminde durum oluştuysa (src/tutorial/situations.ts)
 *   o kahraman için en çok bir ders; eylem dersi (Rest, Move, Skip, Ultimate) oyuncu eylemi yapınca tamamlanır. Oyuncu bir eylem yapınca açık
 *   durum dersi kartı kapanır (ders "şimdi"yi anlatır).
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
  /** Bu savaşta gösterilen durum dersleri (savaş başına bir kez). */
  private readonly shownHere = new Set<string>();
  /** Açık durum dersi ve beklediği eylem (eylem dersi) / skill (Ultimate). */
  private open: { id: string; action?: LessonAction; skill?: string } | null = null;
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
          this.setPhase('next');
          this.nextStep();
          return;
        }
      }
    }
    if (this.phase) return;
    this.showSituation(turnSituations(b, actor.uid));
  }

  /** Oyuncu bir skill seçti (seçim uygulandıktan sonra). */
  onSkillSelected(skillId: string): void {
    if (this.phase === 'skill' && skillId === this.basicSkill) {
      this.finishStep();
      return;
    }
    if (this.phase) return;
    const uid = this.battle().currentUid;
    if (uid) this.showSituation(selectSituations(this.battle(), uid, skillId));
  }

  /** Zorunlu adımda izin verilmeyen girdi: mentor kutusu sallanır (Ömer 2026-10-14: düğme neden çalışmıyor belli olsun). */
  blocked(): void {
    nudgeLesson();
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
  onPerformed(skillId?: string): void {
    if (this.phase === 'target') {
      this.finishStep();
      return;
    }
    this.acted(this.open?.action === 'ultimate' && skillId === this.open.skill ? 'ultimate' : null);
  }

  /** Oyuncu bir global eylem yaptı (Rest / Skip Turn / Move; motor kabul ettikten sonra). */
  onGlobal(globalId: string): void {
    const kind: Record<string, LessonAction> = { rest: 'rest', skip_turn: 'skip', move_tile: 'move' };
    this.acted(kind[globalId] ?? null);
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

  /** Oyuncu eylemi yaptı: önerilen eylemse ders tamamlanır; açık durum dersi kartı her durumda kapanır. */
  private acted(action: LessonAction | null): void {
    const o = this.open;
    if (!o) return;
    this.open = null;
    if (o.action && action === o.action) markLessonDone(o.id);
    dismissLesson(o.id);
  }

  /** Oluşan durumlara göre en çok bir durum dersi gösterir (src/tutorial/lessons.ts > dueBattleLesson). */
  private showSituation(found: Situation[]): void {
    if (!tutorialsOn() || !found.length || this.open) return;
    const due = dueBattleLesson(this.ctx, found, { seen: seenLessons(), done: lessonDoneIds(), shows: lessonShows, thisBattle: this.shownHere });
    if (!due) return;
    const l = due.lesson;
    if (!showLesson(l.id, { force: true, ...(due.skill ? { skill: due.skill } : {}), onClose: () => {
          if (this.open?.id === l.id) this.open = null;
        } })) return;
    this.shownHere.add(l.id);
    if (l.done) noteLessonShown(l.id);
    this.open = { id: l.id, ...(l.done ? { action: l.done } : {}), ...(due.skill ? { skill: due.skill } : {}) };
  }

  /** Sıradaki zorunlu adımı açar; kalmadıysa serbest kalır. */
  private nextStep(): void {
    const l = this.steps.shift();
    if (!l || !l.forced) {
      this.setPhase(null);
      this.handle = null;
      return;
    }
    markLessonSeen(l.id);
    const kind = l.forced;
    const text = l.text ?? '';
    if (kind === 'next') {
      this.setPhase('next');
      this.handle = showCard({ title: l.title, text, ...(l.focus ? { focus: l.focus } : {}) }, () => {
        if (this.phase === 'next') this.nextStep();
      });
      return;
    }
    this.setPhase(kind);
    this.handle = showCard({ title: l.title, text, awaitText: AWAIT_TEXT[kind], ...(l.focus ? { focus: l.focus } : {}) });
  }

  /**
   * Zorunlu adım kilidi: <html data-tut-lock="next|skill|target"> (lesson-box.css). Kilitli düğmeler soluk görünür; temel saldırı
   * (skill çubuğunun ilk düğmesi) skill / target adımında açık kalır.
   */
  private setPhase(p: ForcedAwait | null): void {
    this.phase = p;
    if (typeof document === 'undefined') return;
    if (p) document.documentElement.dataset.tutLock = p;
    else delete document.documentElement.dataset.tutLock;
  }

  private finishStep(): void {
    const h = this.handle;
    this.handle = null;
    this.setPhase('next');
    h?.done();
    this.nextStep();
  }

  /** Zorunlu akış biter (ayar kapandı / savaş bitti / sahne kapandı); kutular kapanır. */
  private release(): void {
    this.open = null;
    this.setPhase(null);
    this.steps = [];
    this.handle = null;
    closeAllLessons();
  }
}
