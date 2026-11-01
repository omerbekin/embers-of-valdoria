import type { Battle, Combatant } from '../engine';
import { TUTORIAL, defeatHint, dueBattleLesson, forcedSteps, openingLine, situationLessonsIn, type BattleLessonCtx, type ForcedAwait, type Lesson, type LessonAction, type Situation } from '../tutorial/lessons';
import { rejectSituations, selectSituations, strongMpSkill, turnSituations } from '../tutorial/situations';
import { isLessonSeen, lessonDoneIds, lessonShows, markLessonDone, markLessonSeen, noteLessonShown, seenLessons, tutorialsOn } from '../tutorial/store';
import { closeAllLessons, dismissLesson, nudgeLesson, onLessonsTurnedOff, showCard, showLesson, showMentorLine, type LessonHandle } from '../ui/lesson-box';

/**
 * Savaş içi tutorial yöneticisi (sefer savaşı; BattleScene çağırır, kurallar saf src/tutorial/lessons.ts, docs/design/tutorial.md).
 * - İlk savaş (Mill Road): açılış sözü + zorunlu adımlar. 1. karar: sıra çubuğu -> saldırı düğmesi -> Hit Chance -> hedef; 2. karar (f_mp_skill): kahramanın
 *   en güçlü MP skill'i parlar, oyuncu onu bir hedefe kullanır, ardından "Skills and MP" dersi burada gösterilir (kullanılabilir MP skill'i
 *   yoksa adım sessizce atlanır). Adım bitmeden başka girdi kabul edilmez (`allowSkill` / `allowGlobal` / `allowPerform`); ayar kapalıysa ya
 *   da "Don't show again" basılırsa serbest kalır.
 * - Sonraki savaşlar: DURUM dersleri (Ömer 2026-10-14): oyuncu kararı başında / skill seçiminde durum oluştuysa (src/tutorial/situations.ts)
 *   o kahraman için ders; bir kararda en çok BİR ders. Eylem dersi (Rest, Move, Skip, Ultimate) oyuncu eylemi yapınca tamamlanır. Oyuncu bir
 *   eylem yapınca açık durum dersi kartı kapanır (ders "şimdi"yi anlatır). Savaşın ilk kararı `first` durumudur (Reading a Fighter).
 * - Bölüm III: aynı savaş iki kez kaybedildiyse savaş başında mentor ipucu.
 */

const AWAIT_TEXT: Record<Exclude<ForcedAwait, 'next'>, string> = {
  skill: 'Press the glowing skill',
  target: 'Tap a glowing enemy',
};

const HIT_CHANCE = 'hit_preview';

/** Yenilgi ipucu bu oturumda bu düğüm + yenilgi sayısı için gösterildi mi (her yeni denemede bir kez). */
const hintShown = new Set<string>();

/** C1 (Ömer 2026-11-01): güçlü skill ıskalayabilir; sahne, kart açılınca hedeflerin isabet yüzdesini kısa süre vurgular. */
export const CAN_MISS_LESSON = 'strong_can_miss';

/** Saldırı Taunt yüzünden reddedilince çıkan ders (data/tutorial.json); sahne, kart açıkken koruyan birimi vurgular. */
export const PROTECTED_LESSON = 'taunt_rejected';

/** Zorunlu adım kilidi (<html data-tut-lock>): next | skill | target (ilk saldırı), mp (f_mp_skill: yalnızca vurgulanan skill açık). */
type Lock = ForcedAwait | 'mp';

export class BattleTutorial {
  private turn = 0;
  private lastKey = '';
  /** Bu kararda durum dersi gösterildi mi (karar anahtarı; bir kararda en çok bir ders). */
  private lessonKey = '';
  /** Sıradaki zorunlu adımlar (ilk savaş). */
  private steps: Lesson[] = [];
  /** Şu an beklenen zorunlu eylem (yoksa serbest). */
  private phase: ForcedAwait | null = null;
  private handle: LessonHandle | null = null;
  /** Zorunlu adımın skill'i: 1. kararda temel saldırı, 2. kararda en güçlü MP skill'i. */
  private stepSkill: string | null = null;
  /** Şu anki zorunlu adım MP skill adımı mı (skill seçilince aynı kart hedef beklemeye geçer). */
  private mpStep = false;
  /** Bu savaşta gösterilen durum dersleri (savaş başına bir kez). */
  private readonly shownHere = new Set<string>();
  /** Açık durum dersi ve beklediği eylem (eylem dersi) / skill (Ultimate). */
  private open: { id: string; action?: LessonAction; skill?: string } | null = null;
  /** Mill Road MP adımından sonra açılan "Skills and MP" Whisper'ı: oyuncunun sıradaki eylemi kaldırır. */
  private afterStep: string | null = null;
  private readonly offTurnOff: () => void;
  /** Tek kişilik başlangıç: Garrick'in anlatacağı yeni açılmış skill'ler (savaş başı + dalga ortası); kararda en çok biri. */
  private readonly unlocks: string[];
  /** İlk karar skill açılışına gitti: Reading a Fighter sıradaki karara kaldı. */
  private firstWaiting = false;

  constructor(
    private readonly ctx: BattleLessonCtx,
    private readonly battle: () => Battle,
  ) {
    this.offTurnOff = onLessonsTurnedOff(() => this.release());
    this.unlocks = [...(ctx.unlocks ?? [])];
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
          this.stepSkill = actor.skills[0] ?? null;
          const open = openingLine(this.ctx, seenLessons(), actor.defId);
          if (open) showCard({ title: 'Mill Road', text: open, more: true });
          this.setPhase('next');
          this.nextStep();
          return;
        }
      }
    }
    if (this.turn === 2 && tutorialsOn() && !this.phase) {
      // Mill Road 2. karar: en güçlü MP skill'i (yoksa adım sessizce atlanır, ders görülmemiş kalır)
      const steps = forcedSteps(this.ctx, seenLessons(), 2);
      const mp = steps.length ? strongMpSkill(b, actor.uid) : null;
      if (mp) {
        this.steps = steps;
        this.stepSkill = mp;
        this.nextStep();
        return;
      }
    }
    if (this.phase) return;
    if (this.showUnlock()) {
      if (this.turn === 1) this.firstWaiting = true;
      return;
    }
    const found = turnSituations(b, actor.uid);
    if ((this.turn === 1 || this.firstWaiting) && situationLessonsIn(this.ctx)) found.unshift({ when: 'first' });
    this.firstWaiting = false;
    this.showSituation(found);
  }

  /** Motor dalga başında kilit açtı (UnitSetup.unlockOnWave): Garrick sıradaki kararda anlatır. */
  onSkillsUnlocked(skills: readonly string[]): void {
    this.unlocks.push(...skills);
  }

  /** Oyuncu bir skill seçti (seçim uygulandıktan sonra). */
  onSkillSelected(skillId: string): void {
    if (this.phase === 'skill' && skillId === this.stepSkill) {
      if (this.mpStep) {
        // Aynı kart hedef bekler; spot ışığı kalkar (hedefler sahnede, karartılmasın)
        this.setPhase('target', 'mp');
        this.handle?.update({ awaitText: this.targetText(skillId), spotlight: false });
        return;
      }
      this.finishStep();
      return;
    }
    if (this.phase) return;
    const uid = this.battle().currentUid;
    if (uid) this.showSituation(selectSituations(this.battle(), uid, skillId));
  }

  /**
   * Oyuncu seçili skill'le hedef olmayan bir birime tıkladı. Sebep Taunt ise ve ders gösterildiyse koruyan birimlerin uid'leri döner (sahne vurgular);
   * aksi halde boş. Ayar kapalıysa / ders görülmüşse / zorunlu adımda / Mill Road'da ders çıkmaz.
   */
  onTargetRejected(actorUid: string, skillId: string, targetUid: string): readonly string[] {
    if (this.phase) return [];
    const found = rejectSituations(this.battle(), actorUid, skillId, targetUid);
    return this.showSituation(found) ? (found[0]?.units ?? []) : [];
  }

  /** Bu durum dersinin kartı hâlâ açık mı (sahnedeki vurgu onunla biter). */
  isLessonOpen(id: string): boolean {
    return this.open?.id === id;
  }

  /** Zorunlu adımda izin verilmeyen girdi: mentor kutusu sallanır (Ömer 2026-10-14: düğme neden çalışmıyor belli olsun). */
  blocked(): void {
    nudgeLesson();
  }

  allowSkill(skillId: string): boolean {
    if (!this.phase) return true;
    return this.phase !== 'next' && skillId === this.stepSkill;
  }

  allowGlobal(): boolean {
    return !this.phase;
  }

  allowPerform(skillId: string): boolean {
    if (!this.phase) return true;
    return this.phase === 'target' && skillId === this.stepSkill;
  }

  /** Oyuncu bir eylem yaptı (skill hedefe gitti). */
  onPerformed(skillId?: string): void {
    if (this.phase === 'target') {
      const mp = this.mpStep ? this.stepSkill : null;
      this.finishStep();
      // "Skills and MP" burada (Ömer 2026-10-14, f_mp_skill): kullanılan skill artık beklemede / MP harcandı
      if (mp && !seenLessons().has('skills_mp') && showLesson('skills_mp', { force: true, skill: mp })) this.afterStep = 'skills_mp';
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

  /** MP adımının hedef bekleme yazısı (skill'in hedef türüne göre). */
  private targetText(skillId: string): string {
    const b = this.battle();
    const t = b.skill(skillId)?.target;
    if (t === 'single_ally') return 'Tap a glowing ally';
    if (b.isAreaSkill(skillId)) return 'Tap where it should land';
    if (!b.needsTargetChoice(skillId)) return 'Press it again to use it';
    return AWAIT_TEXT.target;
  }

  /** Oyuncu eylemi yaptı: önerilen eylemse ders tamamlanır; açık durum dersi kartı her durumda kapanır. */
  private acted(action: LessonAction | null): void {
    if (this.afterStep) dismissLesson(this.afterStep);
    this.afterStep = null;
    const o = this.open;
    if (!o) return;
    this.open = null;
    if (o.action && action === o.action) markLessonDone(o.id);
    dismissLesson(o.id);
  }

  /** Sıradaki skill açılış cümlesi (skill başına bir kez, kayıt anahtarı unlock:<skill>; tavana girmez). Gösterildiyse true. */
  private showUnlock(): boolean {
    if (!tutorialsOn() || this.open) return false;
    while (this.unlocks.length) {
      const skill = this.unlocks.shift()!;
      const id = `unlock:${skill}`;
      const text = TUTORIAL.skillUnlocks[skill];
      if (!text || isLessonSeen(id)) continue;
      markLessonSeen(id);
      showCard({ title: TUTORIAL.skillUnlockTitle, text, focus: `[data-skill='${skill}']` }, () => {
        if (this.open?.id === id) this.open = null;
      }, id);
      this.open = { id }; // aynı kararda, kart kapanınca seçim dersi (C1) çıkabilir; o yüzden lessonKey yazılmaz
      return true;
    }
    return false;
  }

  /** Oluşan durumlara göre en çok bir durum dersi gösterir (src/tutorial/lessons.ts > dueBattleLesson); bir kararda en çok bir ders. */
  private showSituation(found: Situation[]): boolean {
    if (!tutorialsOn() || !found.length || this.open || this.lessonKey === this.lastKey) return false;
    const due = dueBattleLesson(this.ctx, found, { seen: seenLessons(), done: lessonDoneIds(), shows: lessonShows, thisBattle: this.shownHere });
    if (!due) return false;
    const l = due.lesson;
    const opts = { force: true, ...(due.skill ? { skill: due.skill } : {}), ...(due.variant ? { variant: due.variant } : {}), ...(due.vars ? { vars: due.vars } : {}) };
    if (!showLesson(l.id, { ...opts, onClose: () => {
          if (this.open?.id === l.id) this.open = null;
        } })) return false;
    this.lessonKey = this.lastKey;
    this.shownHere.add(l.id);
    if (l.done) noteLessonShown(l.id);
    this.open = { id: l.id, ...(l.done ? { action: l.done } : {}), ...(due.skill ? { skill: due.skill } : {}) };
    return true;
  }

  /** Sıradaki zorunlu adımı açar; kalmadıysa serbest kalır. */
  private nextStep(): void {
    // Hit Chance (Ömer 2026-10-31): ilk saldırı seçilince, hedef adımından önce. Mill Road'da durum dersi çıkmadığı için aksi halde ikinci savaşa
    // kalıyordu. Kart kapanana kadar vuruş kilitli (phase 'next'); hedefin üstündeki sayılar bu sırada görülebilir.
    if (this.steps[0]?.forced === 'target' && !seenLessons().has(HIT_CHANCE)) {
      this.setPhase('next');
      const shown = showLesson(HIT_CHANCE, {
        force: true,
        onClose: () => {
          if (this.phase === 'next') this.nextStep();
        },
      });
      if (shown) return;
    }
    const l = this.steps.shift();
    if (!l || !l.forced) {
      this.setPhase(null);
      this.handle = null;
      this.mpStep = false;
      return;
    }
    markLessonSeen(l.id);
    const kind = l.forced;
    const text = l.text ?? '';
    this.mpStep = (l.decision ?? 1) > 1;
    const focus = l.focus ? l.focus.replace('{skill}', this.stepSkill ?? '') : undefined;
    const spot = l.spotlight && focus ? { spotlight: true } : {};
    if (kind === 'next') {
      this.setPhase('next');
      this.handle = showCard({ title: l.title, text, ...(focus ? { focus } : {}), ...spot }, () => {
        if (this.phase === 'next') this.nextStep();
      });
      return;
    }
    this.setPhase(kind, this.mpStep ? 'mp' : kind);
    this.handle = showCard({ title: l.title, text, awaitText: AWAIT_TEXT[kind], ...(focus ? { focus } : {}), ...spot });
  }

  /**
   * Zorunlu adım kilidi: <html data-tut-lock="next|skill|target|mp"> (lesson-box.css). Kilitli düğmeler soluk görünür; temel saldırı
   * (skill çubuğunun ilk düğmesi) skill / target adımında, MP adımında yalnızca vurgulanan skill açık kalır.
   */
  private setPhase(p: ForcedAwait | null, lock: Lock | null = p): void {
    this.phase = p;
    if (typeof document === 'undefined') return;
    if (p && lock) document.documentElement.dataset.tutLock = lock;
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
    this.afterStep = null;
    this.setPhase(null);
    this.steps = [];
    this.handle = null;
    this.mpStep = false;
    closeAllLessons();
  }
}
