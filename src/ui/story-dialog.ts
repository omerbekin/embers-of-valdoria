/**
 * Hikâye / olay diyalogu (Ömer 2026-10-23, taslak public/mockups/story-dialog C "şerit"): ekranın altında sinematik şerit; solda küçük çerçeveli
 * konuşmacı portresi (gerçek avatar dosyası), ortada başlık + anlatı + replik, sağda karo (elmas) işaretli cevap satırları.
 * Oyun kuralı burada yok: sahne içerik verir, seçimi geri çağrıyla alır. `update` aynı pencereyi yeniden kurmadan sonraki adıma geçer
 * (yalnızca cevap satırları yeniden belirir). Zorunlu diyalogda `onDismiss` verilmez (zemin / Esc kapatmaz); verilirse zemin, X ve Esc kapatır.
 */
import './story-dialog.css';
import { avatarUrlOf } from './hero-bust';
import { lockInput, unlockInput } from './input-lock';
import { mountCloseButton } from './nav-close';

export interface StoryDialogContent {
  /** Anlatı satırı (yalnızca ilk adımda). */
  narr?: string;
  /** Konuşmacının repliği. */
  said: string;
  /** Replik altında küçük not (ör. "He presses a small bundle into your hands."). */
  note?: string;
  /** Cevaplar; sonuç sayfasında tek "Continue". */
  choices: string[];
  /** Kaçıncı adım (0 tabanlı) ve toplam: ilerleme elmasları. `done` = hepsi tamam. */
  step: number;
  total: number;
  done?: boolean;
}
export interface StoryDialogSpec {
  title: string;
  speaker: string;
  place?: string;
  /** Avatar dosya adı (assets/avatars/<ad>.webp); yoksa konuşmacı adından türetilir; dosya yoksa portre gösterilmez. */
  portrait?: string;
  onPick: (i: number) => void;
  onDismiss?: () => void;
}
export interface StoryDialogHandle {
  update: (c: StoryDialogContent) => void;
  close: () => void;
  el: HTMLElement;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Düz tırnak -> kıvrık; hikâye unsurları (yer / kişi adı) kısa atıf olarak italik (tek istisna). */
const curl = (s: string): string => s.replace(/^"/, '“').replace(/"/g, '”').replace(/(^|[\s“])'/g, '$1‘').replace(/'/g, '’');
const LORE = /(Charwood|Ash Lord)/g;
const text = (s: string): string => esc(curl(s)).replace(LORE, '<em class="sd-lore">$1</em>');

export const speakerPortraitId = (speaker: string): string => speaker.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function openStoryDialog(root: HTMLElement, spec: StoryDialogSpec): StoryDialogHandle {
  const wrap = document.createElement('div');
  wrap.className = 'sd';
  const av = avatarUrlOf(spec.portrait ?? speakerPortraitId(spec.speaker));
  const corners = '<i class="sd-corner tl"></i><i class="sd-corner tr"></i><i class="sd-corner bl"></i><i class="sd-corner br"></i>';
  const pic = av ? `<div class="sd-pic">${corners}<img src="${av}" alt="" draggable="false"></div>` : '';
  wrap.innerHTML = `<div class="sd-scrim"></div><div class="sd-panel"><div class="sd-grid${av ? '' : ' nopic'}">
    <div class="sd-who">${pic}<div class="sd-name">${esc(spec.speaker)}</div>${spec.place ? `<div class="sd-place">${esc(spec.place)}</div>` : ''}</div>
    <div class="sd-mid"><div class="sd-head"><h1 class="sd-ttl">${esc(spec.title)}</h1><div class="sd-pips"></div></div><div class="sd-body"></div></div>
    <div class="sd-choices"></div></div></div>`;
  root.append(wrap);
  lockInput('story-dialog');

  let done = false;
  let count = 0;
  const pips = wrap.querySelector<HTMLElement>('.sd-pips')!;
  const body = wrap.querySelector<HTMLElement>('.sd-body')!;
  const list = wrap.querySelector<HTMLElement>('.sd-choices')!;
  const pick = (i: number): void => {
    if (!done && i >= 0 && i < count) spec.onPick(i);
  };
  list.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-i]');
    if (b) pick(Number(b.dataset['i']));
  });

  const dismiss = (): void => {
    if (!done) spec.onDismiss?.();
  };
  const unmountX = spec.onDismiss ? mountCloseButton(root, dismiss) : () => undefined;
  if (spec.onDismiss) wrap.querySelector('.sd-scrim')?.addEventListener('click', dismiss);
  const onKey = (e: KeyboardEvent): void => {
    if (/^[1-9]$/.test(e.key)) pick(Number(e.key) - 1);
    else if (e.key === 'Escape' && spec.onDismiss) dismiss();
  };
  window.addEventListener('keydown', onKey);

  const update = (c: StoryDialogContent): void => {
    if (done) return;
    count = c.choices.length;
    pips.innerHTML = Array.from({ length: c.total }, (_, i) => `<i class="${c.done || i < c.step ? 'done' : i === c.step ? 'on' : ''}"></i>`).join('');
    body.innerHTML = `${c.narr ? `<p class="sd-narr">${text(c.narr)}</p>` : ''}<div class="sd-quote"><p class="sd-said">${text(c.said)}${c.note ? `<span class="sd-nb">${esc(c.note)}</span>` : ''}</p></div>`;
    list.innerHTML = c.choices.map((l, i) => `<button type="button" class="sd-ch" style="--i:${i}" data-i="${i}">${text(l)}</button>`).join('');
  };

  const close = (): void => {
    if (done) return;
    done = true;
    unmountX();
    window.removeEventListener('keydown', onKey);
    wrap.remove();
    unlockInput('story-dialog');
  };
  return { update, close, el: wrap };
}
