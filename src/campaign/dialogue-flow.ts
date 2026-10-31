/**
 * Hikâye diyaloğunun sayfa akışı (saf; DOM / Phaser yok, sahne yalnızca sayfayı gösterir). Cevabın kendi `reply` metni varsa (Ömer 2026-10-31:
 * her soru kendi kısa cevabını alır) sonraki adımdan önce o sayfa açılır, tek "Continue" ile geçilir. Reply sayfası cevap SAYMAZ: `answers` adım
 * başına tek kalır, beğeni / hediye (state.ts > storyLikes) değişmez. Akış kayda yazılmaz (`answers` bellekte): yarım diyalog yüklemede baştan başlar.
 */
import type { DialogueStep } from './data';

export type DialoguePage = { kind: 'step'; at: number } | { kind: 'reply'; at: number; text: string } | { kind: 'end' };

export const dialogueStart = (steps: readonly DialogueStep[]): DialoguePage => (steps.length ? { kind: 'step', at: 0 } : { kind: 'end' });

const stepOrEnd = (steps: readonly DialogueStep[], at: number): DialoguePage => (at < steps.length ? { kind: 'step', at } : { kind: 'end' });

/** Seçimden sonraki sayfa. `step` sayfasında seçim `answers`a eklenir; `reply` sayfasının Continue'su eklemez. */
export function dialogueAdvance(steps: readonly DialogueStep[], page: DialoguePage, pick: number, answers: number[]): DialoguePage {
  if (page.kind === 'end') return page;
  if (page.kind === 'reply') return stepOrEnd(steps, page.at + 1);
  answers.push(pick);
  const reply = steps[page.at]?.choices[pick]?.reply?.trim();
  return reply ? { kind: 'reply', at: page.at, text: reply } : stepOrEnd(steps, page.at + 1);
}
