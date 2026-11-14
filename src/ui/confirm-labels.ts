/**
 * Onay penceresi ortak etiket sözlüğü (Ömer 2026-11-09, UI birleştirme A): onay = "Cancel" + bir EYLEM FİİLİ (Yes / No / Stay yok).
 * Hem Phaser `elConfirm` (src/game/elegant-ui.ts) hem DOM `openElConfirm` (src/ui/el-dialog.ts) buradan okur.
 * Pencereler sağ üstteki X ile de kapanır; Esc ve zemine dokunma = Cancel.
 */
export const CONFIRM = {
  cancel: 'Cancel',
  /** Başlık verilmeyen onayın başlığı. */
  title: 'Are you sure?',
  leave: 'Leave',
  retreat: 'Retreat',
  load: 'Load',
  delete: 'Delete',
  start: 'Start',
  abandon: 'Abandon',
  discard: 'Discard',
  confirm: 'Confirm',
} as const;

export type ConfirmVerb = (typeof CONFIRM)[Exclude<keyof typeof CONFIRM, 'cancel' | 'title'>];
