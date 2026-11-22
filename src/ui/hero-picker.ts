/**
 * Ortak kahraman seçici (Ömer 2026-11-10, docs/design/ui-design-language.md 4.7): "Choose your hero", Recruit penceresi, Recruit penceresi (kasaba kışla girişi, yedek
 * değişimi, boss / gönüllü katılımı, Oath kahraman seçimi) ve "Choose a companion" önerisi AYNI bileşeni kullanır; birinde değişiklik hepsine uyar.
 * Görünüm: solda satır listesi (portre, ad, rol, STR / DEX / INT / LCK ana stat vurgulu, sınıf amblemi), sağda satırların toplam yüksekliğinde kahraman kartı
 * (büyük portre, ad, rol / menzil çipleri, açıklama; ALTINDA skill listesi: pasif 1. sırada, gerçek skill ikonları). Oyun mantığı değişmez: var olan
 * `.mw-card` düğmeleri (tıklama + seçim) aynen çalışır, bu dosya yalnızca onları yeniden giydirir ve yanına kartı koyar. Telefonda da aynı pencere (ölçek küçülür).
 * Stil: src/ui/hero-picker.css (kapsam `.mw.hp`).
 */
import './hero-picker.css';
import { content } from '../engine';
import { miscImage, statImage } from '../game/icon-image-files';
import { avatarUrl } from './character-panel';
import type { MwCard } from './map-window';
import { heroCardHtml, bindHeroCardTips } from './hero-card';
import { ms } from './motion';
import { attachBandTip, reasonSpec } from './band-tip-attach';
import { once } from './reward-fx';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const STAT_KEYS = ['str', 'dex', 'int', 'luck'] as const;
const STAT_LABEL: Record<string, string> = { str: 'STR', dex: 'DEX', int: 'INT', luck: 'LCK' };

/** Sıkı stat şeridi: STR / DEX / INT / LCK (oyunun stat ikonlarıyla), ana stat vurgulu. */
function statStrip(classId: string): string {
  const def = content.classes[classId] as unknown as { attributes?: Record<string, number>; primary?: string } | undefined;
  if (!def?.attributes) return '';
  return `<span class="hp-st">${STAT_KEYS.map((k) => {
    const u = statImage(k)?.url;
    return `<span class="${def.primary === k ? 'hot' : ''}" title="${STAT_LABEL[k]}">${u ? `<img src="${u}" alt="">` : STAT_LABEL[k]}${def.attributes![k] ?? 0}</span>`;
  }).join('')}</span>`;
}

export interface HeroPickerOpts {
  /** Kart penceresi genişleyince konumu yenile (map-window `place`). */
  place?: () => void;
  /** Listenin görünen yüksekliği tam `rows` satır (Recruit ve Choose a companion aynı: 4); daha çoksa kaydırılır, azsa kutu yine aynı yükseklikte kalır. */
  rows?: number;
  /** Önerilen kahramanlar: listenin başına gelir, satırında küçük "Recommended" etiketi. */
  recommended?: readonly string[];
  /** "Recommended" satırının hover ipucu: classId -> kısa neden (rozeti koyan kuralın gerekçesi, suggest.ts > recommendReasons). Nedeni olmayan satırda ipucu çıkmaz. */
  recommendWhy?: Readonly<Record<string, string>>;
}

/**
 * `wrap` içindeki `.mw-cards` (içinde `.mw-card[data-card]` düğmeleri) ortak seçiciye dönüştürülür; yanına kahraman kartı gelir.
 * Dönen işlev kart yazısını yeniden çizer (seçim dışarıdan değişirse).
 */
export function mountHeroPicker(wrap: HTMLElement, cards: readonly MwCard[], o: HeroPickerOpts = {}): () => void {
  const list = wrap.querySelector<HTMLElement>('.mw-cards');
  if (!list) return () => undefined;
  wrap.classList.add('hp');
  list.classList.add('hp-list');
  if (cards.length > 4) list.classList.add('c3');
  const by = new Map(cards.map((c) => [c.id, c]));
  // satırlar: var olan kart düğmeleri yeniden giydirilir
  list.querySelectorAll<HTMLElement>('.mw-card').forEach((el) => {
    const c = by.get(el.dataset['card'] ?? '');
    if (!c) return;
    const av = avatarUrl(c.classId) ?? '';
    const nm = el.querySelector<HTMLElement>('.nm');
    const lead = el.querySelector<HTMLElement>('.lead');
    if (lead) el.append(lead); // taç kartın köşesinde kalır (portre alanı gizli)
    const img = document.createElement('img');
    img.className = 'hp-av';
    img.alt = '';
    img.draggable = false;
    if (av) img.src = av;
    const txt = document.createElement('div');
    txt.className = 'hp-txt';
    if (nm) txt.append(nm);
    txt.insertAdjacentHTML('beforeend', `<span class="hp-r">${esc(c.role ?? '')}</span>${statStrip(c.classId)}`);
    el.prepend(img);
    img.after(txt);
    const em = miscImage(`class:${c.classId}`)?.url;
    if (em) el.insertAdjacentHTML('beforeend', `<img class="hp-em" src="${em}" alt="" draggable="false">`);
  });
  const split = document.createElement('div');
  split.className = 'hp-split mw-split';
  list.before(split);
  const left = document.createElement('div');
  left.className = 'hp-left';
  split.append(left);
  left.append(list);
  const detail = document.createElement('div');
  detail.className = 'hp-detail';
  split.append(detail);

  // öneri: önerilenler listenin başında, satırında "Recommended" etiketi
  const rec = new Set<string>((o.recommended ?? []).filter((id) => by.has(id)));
  if (rec.size) {
    const all = [...list.querySelectorAll<HTMLElement>('.mw-card')];
    const isRec = (r: HTMLElement): boolean => rec.has(r.dataset['card'] ?? '');
    [...all.filter(isRec), ...all.filter((r) => !isRec(r))].forEach((r) => list.append(r));
    all.filter(isRec).forEach((r) => {
      r.querySelector('.hp-r')?.insertAdjacentHTML('beforeend', '<span class="hp-rec">Recommended</span>');
      const why = o.recommendWhy?.[r.dataset['card'] ?? ''];
      if (why) {
        attachBandTip(r, reasonSpec('Recommended', why));
        // Dokunmada satır düğme olduğu için ipucu açmaz (seçer); nedeni etiketine dokununca açılır (doğrulama turu 2026-11-21)
        const badge = r.querySelector<HTMLElement>('.hp-rec');
        if (badge) attachBandTip(badge, reasonSpec('Recommended', why), { touchOnly: true });
      }
    });
  }
  // sabit görünen yükseklik (satır sayısı): fit
  const visibleRows = o.rows ?? 0;
  if (visibleRows) list.classList.add('hp-scroll');

  let paint = (id: string): void => {
    const c = by.get(id);
    if (!c) {
      detail.innerHTML = '<div class="hp-ds">Choose a hero to see them here.</div>';
      return;
    }
    const oldSrc = detail.querySelector<HTMLImageElement>('.hc .pt img')?.src;
    detail.innerHTML = heroCardHtml({ classId: c.classId, name: c.name, ...(c.role ? { role: c.role } : {}), color: c.color, ...(c.level ? { level: c.level } : {}) });
    bindHeroCardTips(detail, c.classId);
    // a15: yalnız büyük portre karşılıklı geçer (180 ms; ad ve skill'ler anında değişir, okunabilirlik)
    const pt = detail.querySelector<HTMLElement>('.hc .pt');
    const nImg = pt?.querySelector('img');
    const dur = ms(180);
    if (dur > 0 && pt && nImg && oldSrc && oldSrc !== nImg.src && nImg.animate) {
      const ghost = document.createElement('img');
      ghost.src = oldSrc;
      ghost.alt = '';
      ghost.draggable = false;
      ghost.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';
      pt.style.position = 'relative';
      pt.append(ghost);
      const a = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
      a.onfinish = () => ghost.remove();
      a.oncancel = () => ghost.remove();
      nImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease-in-out' });
    }
  };
  let lastSel = '';
  const selected = (): string => list.querySelector<HTMLElement>('.mw-card.sel')?.dataset['card'] ?? '';
  const firstShown = (): string => list.querySelector<HTMLElement>('.mw-card')?.dataset['card'] ?? cards[0]?.id ?? '';
  let hover = '';
  const focus = (): string => hover || selected() || firstShown();
  paint(focus());
  list.addEventListener('pointerover', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('.mw-card')?.dataset['card'] ?? '';
    if (id !== hover) {
      hover = id;
      paint(focus());
    }
  });
  list.addEventListener('pointerleave', () => {
    hover = '';
    paint(focus());
  });
  list.addEventListener('click', () =>
    window.setTimeout(() => {
      paint(focus());
      // a15: seçili satır değişince portrenin altın kenarı bir kez parlar
      const now = selected();
      if (now && now !== lastSel && lastSel) once(detail.querySelector<HTMLElement>('.hc .pt'), 'rfx-edge', 750);
      lastSel = now;
    }, 0),
  );
  lastSel = selected();
  const paintFit = paint;
  paint = (id: string): void => {
    paintFit(id);
    if (detail.style.height) fit();
  };
  // sağdaki kart = soldaki satırların toplam yüksekliği (az satırda içeriği sığdırmak için en az doğal yüksekliği)
  const fit = (): void => {
    if (visibleRows) {
      const rs = list.querySelectorAll<HTMLElement>('.mw-card');
      if (rs.length) {
        const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
        // offsetHeight: döndürülmüş sahnede (dikey telefon) getBoundingClientRect eksenleri değiştirir
        const rowH = Math.min(...[...rs].map((r) => r.offsetHeight));
        list.style.height = `${Math.ceil(rowH * visibleRows + gap * (visibleRows - 1))}px`;
      }
    }
    detail.style.height = 'auto';
    detail.style.height = `${Math.max(detail.offsetHeight, list.offsetHeight)}px`;
    o.place?.();
  };
  // Telefon (html.short): pencere masaüstü ölçüsünde, ekrana EŞİT ölçekle (zoom) sığdırılır; oran bozulmaz
  const scaleToFit = (): void => {
    if (!document.documentElement.classList.contains('short')) return;
    const panel = wrap.querySelector<HTMLElement>('.mw-panel');
    const host = wrap.querySelector<HTMLElement>('.mw-center') ?? wrap.closest<HTMLElement>('.mw-center');
    if (!panel || !host) return;
    panel.style.setProperty('--hp-zoom', '1');
    panel.style.setProperty('--btn-k', '1');
    const natW = panel.offsetWidth;
    // düğme boyu zoom'a bağlı (gerçek 30 px, phone-buttons.css): iki geçiş; ikinci ölçüm düğmenin büyümüş boyunu da hesaba katar
    let z = 1;
    for (let i = 0; i < 2; i++) {
      panel.style.setProperty('--btn-k', String(z));
      const natH = panel.offsetHeight;
      const k = Math.min((host.clientWidth - 12) / natW, (host.clientHeight - 12) / natH, 1);
      z = Math.max(0.2, Math.floor(k * 1000) / 1000);
    }
    panel.style.setProperty('--hp-zoom', String(z));
    panel.style.setProperty('--btn-k', String(z));
  };
  new ResizeObserver(() => {
    fit();
    scaleToFit();
  }).observe(list);
  window.addEventListener('resize', scaleToFit);
  fit();
  scaleToFit();
  window.requestAnimationFrame(fit);
  return () => paint(focus());
}
