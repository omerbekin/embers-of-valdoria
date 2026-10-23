/**
 * Hikâye / olay diyalogu (Ömer 2026-10-23, taslak public/mockups/story-dialog C "şerit"): ekranın altında sinematik şerit; solda küçük çerçeveli
 * konuşmacı portresi (gerçek avatar dosyası), ortada başlık + anlatı + replik, sağda karo (elmas) işaretli cevap satırları.
 * Oyun kuralı burada yok: sahne içerik verir, seçimi geri çağrıyla alır. `update` aynı pencereyi yeniden kurmadan sonraki adıma geçer
 * (yalnızca cevap satırları yeniden belirir). Zorunlu diyalogda `onDismiss` verilmez (zemin / Esc kapatmaz); verilirse zemin, X ve Esc kapatır.
 * Sinematik kullanımı (src/ui/cinematic.ts, Ömer 2026-10-23): konuşan / portre adım adım değişir (`update` > speaker / portrait), anlatıcı
 * satırı replik kutusu olmadan (`said` boş), `onAdvance` verilirse ekrana dokunmak / Space / Enter sonraki satıra geçer.
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
  /** Replik altında küçük not (ör. "He presses a small bundle into your hands."). Boş `said` = yalnızca anlatı satırı (replik kutusu yok). */
  note?: string;
  /** Cevaplar; sonuç sayfasında tek "Continue". */
  choices: string[];
  /** Kaçıncı adım (0 tabanlı) ve toplam: ilerleme elmasları. `done` = hepsi tamam. */
  step: number;
  total: number;
  done?: boolean;
  /** Konuşanı bu adımda değiştir (boş = ad gösterilmez, ör. anlatıcı). */
  speaker?: string;
  /** Portreyi bu adımda değiştir: avatar dosya adı ya da null (portre yok). Verilmezse önceki kalır. */
  portrait?: string | null;
}
export interface StoryDialogSpec {
  title: string;
  speaker: string;
  place?: string;
  /** Avatar dosya adı (assets/avatars/<ad>.webp); yoksa konuşmacı adından türetilir; dosya yoksa portre gösterilmez. */
  portrait?: string | null;
  onPick: (i: number) => void;
  onDismiss?: () => void;
  /** Portresiz adımda da sol sütun yerinde kalsın (boş): satırlar arasında yazı sütunu kaymaz (sinematik). */
  keepWho?: boolean;
  /** Ekrana (düğmeler dışında) dokunmak / Space / Enter: sonraki satır (sinematik). */
  onAdvance?: () => void;
  /** Kökteki ek sınıf (ör. 'sd-cin'). */
  className?: string;
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
  wrap.className = spec.className ? `sd ${spec.className}` : 'sd';
  const portraitUrl = (p: string | null | undefined, speaker: string): string | null => (p === null ? null : avatarUrlOf(p ?? speakerPortraitId(speaker)));
  const av = portraitUrl(spec.portrait, spec.speaker);
  const corners = '<i class="sd-corner tl"></i><i class="sd-corner tr"></i><i class="sd-corner bl"></i><i class="sd-corner br"></i>';
  const picHtml = (url: string | null): string => (url ? `<div class="sd-pic">${corners}<img src="${url}" alt="" draggable="false"></div>` : '');
  const gridCls = (url: string | null): string => (url ? 'sd-grid' : spec.keepWho ? 'sd-grid nopic-keep' : 'sd-grid nopic');
  const whoHtml = (url: string | null, speaker: string): string =>
    `${picHtml(url)}<div class="sd-name">${esc(speaker)}</div>${spec.place ? `<div class="sd-place">${esc(spec.place)}</div>` : ''}`;
  wrap.innerHTML = `<div class="sd-scrim"></div><div class="sd-panel"><div class="${gridCls(av)}">
    <div class="sd-who">${whoHtml(av, spec.speaker)}</div>
    <div class="sd-mid"><div class="sd-head"><h1 class="sd-ttl">${esc(spec.title)}</h1><div class="sd-pips"></div></div><div class="sd-body"></div></div>
    <div class="sd-choices"></div></div></div>`;
  root.append(wrap);
  lockInput('story-dialog');

  let done = false;
  let count = 0;
  const pips = wrap.querySelector<HTMLElement>('.sd-pips')!;
  const body = wrap.querySelector<HTMLElement>('.sd-body')!;
  const list = wrap.querySelector<HTMLElement>('.sd-choices')!;
  const grid = wrap.querySelector<HTMLElement>('.sd-grid')!;
  const who = wrap.querySelector<HTMLElement>('.sd-who')!;
  let curSpeaker = spec.speaker;
  let curUrl = av;
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
  // Sinematik: düğme dışına dokunmak sonraki satır (cevap düğmesi kendi onPick'iyle; ikisi birden çalışmaz)
  if (spec.onAdvance)
    wrap.addEventListener('click', (e) => {
      if (done || (e.target as Element).closest('button, a, .sd-ch')) return;
      spec.onAdvance?.();
    });
  const onKey = (e: KeyboardEvent): void => {
    if (/^[1-9]$/.test(e.key)) pick(Number(e.key) - 1);
    else if (e.key === 'Escape' && spec.onDismiss) dismiss();
    else if (spec.onAdvance && !done && (e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault(); // odaktaki Continue düğmesi aynı tuşla ikinci kez tıklanmasın
      spec.onAdvance();
    }
  };
  window.addEventListener('keydown', onKey);

  const update = (c: StoryDialogContent): void => {
    if (done) return;
    count = c.choices.length;
    if (c.speaker !== undefined || c.portrait !== undefined) {
      const sp = c.speaker ?? curSpeaker;
      const url = c.portrait !== undefined ? portraitUrl(c.portrait, sp) : curUrl;
      if (sp !== curSpeaker || url !== curUrl) {
        curSpeaker = sp;
        curUrl = url;
        who.innerHTML = whoHtml(url, sp);
        grid.className = gridCls(url);
      }
    }
    pips.innerHTML = Array.from({ length: c.total }, (_, i) => `<i class="${c.done || i < c.step ? 'done' : i === c.step ? 'on' : ''}"></i>`).join('');
    const quote = c.said || c.note ? `<div class="sd-quote"><p class="sd-said">${text(c.said)}${c.note ? `<span class="sd-nb">${esc(c.note)}</span>` : ''}</p></div>` : '';
    body.innerHTML = `${c.narr ? `<p class="sd-narr">${text(c.narr)}</p>` : ''}${quote}`;
    list.innerHTML = c.choices.map((l, i) => `<button type="button" class="sd-ch" style="--i:${i}" data-i="${i}" aria-label="${esc(curl(l)).replace(/"/g, '&quot;')}">${text(l)}</button>`).join('');
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
