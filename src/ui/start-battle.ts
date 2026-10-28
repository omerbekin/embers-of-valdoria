/**
 * "Start battle?" kartı (Ömer 2026-10-18, taslak start-battle v3 "Anchored"): seçilen düğümün yanında küçük kart, ok ucu düğümü gösterir
 * (sağa ya da sola otomatik yerleşir); harita daha az kararır, düğüm parlak kalır. İçerik: düğüm adı + tür, düşman portreleri (elit / boss
 * çerçeveli, "N×" gruplu, "Lv N"), TEK bilgi satırı (düğümün lore cümlesi; yoksa önder düşmanın pasifi / boss çığlığı), Fight (birincil).
 * Savaşsız düğümler (kasaba, kamp, tüccar, hazine, olay; Ömer 2026-10-18 "tüm nodelar için") AYNI kartı kullanır: `foes` verilmez (portre satırı yok),
 * `actionLabel` düğümün kendi eylemi (Enter / Rest / Trade / Open / Continue); `onFight` o eylemi çalıştırır.
 * Kapatma: Menu yerindeki ortak X (src/ui/nav-close.ts), Esc (sahne), kararan zemine dokunma. "diğer yollar kapanır" notu YOKTUR
 * (Ömer: haritada geri de gidilecek). Oyun kuralı burada yok: sahne `onFight` / `onCancel` verir.
 * Tek kart, iki adım (Ömer 2026-10-23): `preview` = fareyle üstüne gelince açılan ÖNİZLEME (düğme yok, zemin kararmaz, girdi kilitlenmez,
 * fareyi geçirir, X yok); normal kart = sabitlenmiş (düğme ya da `note`). `then` = alttaki "Then: <sonraki düğüm> TÜR" satırı.
 */
import './start-battle.css';
import { content } from '../engine';
import { encounterUnit } from '../engine/content';
import { ownerOfUnit } from '../game/asset-versions';
import { miscImage } from '../game/icon-image-files';
import { bindIcon } from './dom-icons';
import { lockInput, unlockInput } from './input-lock';
import { mountCloseButton } from './nav-close';
import { classLogoName, miscIconName } from './misc-icons';
import type { FoeGroup } from '../campaign/encounters';

const avatars = import.meta.glob('../../assets/avatars/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const avatarUrl = (id: string): string | undefined => avatars[`../../assets/avatars/${id}.webp`];

export interface StartBattleOpts {
  /** Artık gösterilmez (Ömer 2026-10-27: başlıkta "Start battle?" / "Enter town?" sorusu yok, başlık düğüm adı); çağıranlar için duruyor. */
  title?: string;
  /** Düğüm adı (kartın başlığı). */
  name: string;
  /** Tür satırı ("Battle · Outlaw Pack"). */
  subtitle: string;
  /** Düğüm türü (rozet ikonu: assets/misc-icons/node). */
  nodeType: string;
  level: number;
  /** Tehlike satırı (level farkı bandı; src/campaign/level-gap.ts): metin, bant adı (Dangerous / Deadly; normalde boş) ve rengi. */
  threat?: { line: string; band: 'normal' | 'danger' | 'deadly'; name: string; color: string };
  /** Yan karşılaşma uyarısı (src/campaign/side-danger.ts): "Stronger than the road ahead" satırı + etiket ve rengi. */
  side?: { line: string; name: string; color: string };
  /** Arka arkaya savaş bilgisi (src/campaign/chain-info.ts): sakin tek satır, "Depth 3 · no rest since the surface". */
  chain?: string;
  /** Savaşsız düğümde (kasaba, kamp, tüccar, hazine, olay) boş / verilmez: portre satırı çizilmez. */
  foes?: FoeGroup[];
  /** Birincil düğme yazısı (varsayılan "Fight"; kasaba "Enter", kamp "Rest" ...). */
  actionLabel?: string;
  /** who yoksa (düğüm lore'u) yalnızca italik cümle. */
  info?: { who?: string; text: string; quote?: boolean; plain?: boolean };
  /** Bilgi satırının üstünde etiketler (Ömer 2026-10-27: devriye PATROL · 60% XP · FULL LOOT · NO VALOR); gold = vurgulu, dim = sönük. Telefonda da görünür. */
  tags?: Array<{ text: string; tone?: 'gold' | 'dim' | 'silver' }>;
  /** Rakip bölük (Silver Stag, Ömer 2026-10-28, taslak rival-company C): başlığın altında bölük şeridi, düşmanlar bölük üyesi, gümüş "Rival Company" etiketi, "Their cause" bilgi satırı. */
  company?: { name: string; line: string; cause: string; waves?: number };
  /** Düğümün #ui-root içindeki CSS piksel konumu (harita kayarsa / boyut değişirse yeniden sorulur); null = ortala. */
  /** Alttaki "Then" satırı: sonraki duraklar. */
  then?: Array<{ name: string; kind: string }>;
  /** Fare önizlemesi: düğmesiz, girdiyi kilitlemez, zemin kararmaz. */
  preview?: boolean;
  /** Verilirse düğmenin yerine düz bu satır (ör. "Not reachable yet"); düğme yok. */
  note?: string;
  /** Önizlemeden sabitlenirken giriş animasyonu tekrar oynamaz. */
  instant?: boolean;
  /**
   * Varışta önce gelen kadro adımları (Ömer 2026-10-23, playtest H3 / H2): "First" satırı (ör. "Form your company."); verilirse kartın
   * sürprizi kalmaz. Düğme yazısını sahne seçer (actionLabel "Continue").
   */
  first?: string[];
  /**
   * Kararan zemine dokunuş (playtest U8, tek tıkla hızlı yolculuk): zeminin yerel CSS pikseli verilir; true dönerse sahne dokunuşu kullandı
   * (ör. başka bir düğüme yürüdü), kart onCancel çağrılmadan bırakılır. Yoksa / false ise eskisi gibi vazgeç.
   */
  onScrimTap?: (x: number, y: number) => boolean;
  anchor: () => { x: number; y: number } | null;
  onFight: () => void;
  onCancel: () => void;
}

export interface StartBattleHandle {
  /** Kartı kaldırır (idempotent). */
  close(): void;
  /** Konumu yeniden hesapla (ekran boyutu değişti). */
  place(): void;
  readonly el: HTMLElement;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** Geyik armasi (taslak rival-company, #stag): gümüş. */
const STAG_SVG = '<svg class="bdg" viewBox="0 0 52 60" aria-hidden="true"><path d="M4 4 L26 1 L48 4 L48 34 Q48 50 26 59 Q4 50 4 34 Z" fill="#17222e" stroke="#cfe0ee" stroke-width="2.5"/><g stroke="#e8f2fa" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 30 L16 20 L12 10 M16 20 L9 17 M14 14 L8 8 M31 30 L36 20 L40 10 M36 20 L43 17 M38 14 L44 8"/></g><path d="M20 29 L32 29 L29 43 L26 47 L23 43 Z" fill="#e8f2fa"/><circle cx="23" cy="34" r="1.4" fill="#17222e"/><circle cx="29" cy="34" r="1.4" fill="#17222e"/></svg>';

function foeTile(f: FoeGroup, level: number, member = false): HTMLElement {
  const tag = f.tier === 'boss' ? 'BOSS' : f.tier === 'elite' ? 'ELITE' : '';
  const tile = el('div', `sbc-foe ${f.tier ?? ''}${member ? ' mem' : ''}`.trim());
  tile.tabIndex = 0;
  tile.dataset['tip'] = `${f.name}${f.n > 1 ? ` ×${f.n}` : ''}${tag ? ` · ${tag === 'BOSS' ? 'Boss' : 'Elite'}` : ''} · Lv ${level}`;
  const face = el('div', 'sbc-face');
  const img = el('img');
  img.alt = '';
  img.draggable = false;
  const url = avatarUrl(f.sprite);
  const logo = (): void => {
    const def = (content.classes[f.cls] ?? encounterUnit(f.cls)) as { id: string; logo: string; color?: string } | undefined;
    if (!def) return img.remove();
    img.classList.add('logo');
    bindIcon(img, classLogoName({ id: def.id, logo: def.logo }), def.color ?? '#d9b26a', ownerOfUnit(def.id));
  };
  if (url) {
    img.src = url;
    img.addEventListener('error', logo, { once: true });
  } else logo();
  face.append(img);
  if (f.n > 1) face.append(el('i', 'cnt', `${f.n}×`));
  if (tag) face.append(el('i', 'tg', tag));
  if (member) face.append(el('div', 'cr', STAG_SVG));
  tile.append(face, el('span', 'sbc-nm', esc(f.name)), el('span', 'sbc-lv', `Lv ${level}`));
  return tile;
}

export function openStartBattle(root: HTMLElement, o: StartBattleOpts): StartBattleHandle {
  const wrap = el('div', 'sbc');
  const scrim = el('div', 'sbc-scrim');
  const ring = el('i', 'sbc-ring');
  const card = el('div', 'sbc-card');
  const nl = el('i', 'sbc-notch l');
  const nr = el('i', 'sbc-notch r');
  const badge = miscImage(miscIconName('node', o.nodeType))?.url;
  const head = el('div', 'sbc-head', `<div class="sbc-ntile">${badge ? `<img src="${badge}" alt="" draggable="false">` : ''}</div><div class="tx"><h2 class="sbc-t">${esc(o.name)}</h2><p class="sbc-sub"><b>${esc(o.subtitle)}</b></p></div>`);
  const foes = o.foes ?? [];
  if (!foes.length) card.classList.add('nofoes');
  card.append(nl, nr, head, el('hr', 'sbc-rule'));
  const co = o.company;
  if (co) card.append(el('div', 'sbc-co', `${STAG_SVG}<div><b>${esc(co.name)}</b><span>${esc(co.line)}</span></div>`));
  if (foes.length) {
    const row = el('div', 'sbc-row');
    for (const f of foes) row.append(foeTile(f, o.level, !!co));
    card.append(row);
  }
  if (o.threat) {
    const t = o.threat;
    const mark = t.band === 'deadly' ? '☠' : t.band === 'danger' ? '!' : '';
    card.append(el('p', `sbc-threat ${t.band}`, `<span class="ln">${esc(t.line)}</span>${t.name ? `<b style="color:${esc(t.color)}"><i class="mk" aria-hidden="true">${mark}</i>${esc(t.name)}</b>` : ''}`));
  }
  if (o.side) card.append(el('p', 'sbc-threat danger side', `<span class="ln">${esc(o.side.line)}</span><b style="color:${esc(o.side.color)}"><i class="mk" aria-hidden="true">!</i>${esc(o.side.name)}</b>`));
  if (o.chain) card.append(el('p', 'sbc-chain', esc(o.chain)));
  const tags = [...(co ? [{ text: 'Rival Company', tone: 'silver' as const }, ...(co.waves ? [{ text: `${co.waves} Waves`, tone: 'gold' as const }] : [])] : []), ...(o.tags ?? [])];
  if (tags.length) card.append(el('div', 'sbc-tags', tags.map((t) => `<span class="sbc-tag${t.tone ? ` ${t.tone}` : ''}">${esc(t.text)}</span>`).join('')));
  const info = co ? { who: 'Their cause', text: co.cause, quote: false, plain: false } : o.info;
  if (info) card.append(el('p', `sbc-info${info.quote ? ' quote' : ''}${info.plain ? ' plain' : ''}`, `${info.who ? `<b>${esc(info.who)}</b> ` : ''}${info.quote ? `“${esc(info.text)}”` : esc(info.text)}`));
  if (o.first?.length) card.append(el('p', 'sbc-then sbc-first', `<b>First</b> ${o.first.map((t) => esc(t)).join(' ')}`));
  if (o.then?.length) card.append(el('p', 'sbc-then', `<b>Then</b> ${o.then.map((t) => `${esc(t.name)} <span class="k">${esc(t.kind)}</span>`).join(' <i>or</i> ')}`));
  const preview = !!o.preview;
  const fight = el('button', 'el-btn primary ready', esc(o.actionLabel ?? 'Fight'));
  fight.type = 'button';
  if (o.note && !preview) card.append(el('p', 'sbc-note', esc(o.note)));
  else if (!preview) {
    const acts = el('div', 'sbc-acts');
    acts.append(fight);
    card.append(acts);
  } else if (o.note) card.append(el('p', 'sbc-note', esc(o.note)));
  if (preview) wrap.classList.add('preview');
  if (o.instant) wrap.classList.add('instant');
  if (preview) wrap.append(ring, card);
  else wrap.append(scrim, ring, card);
  root.append(wrap);
  if (!preview) lockInput('start-battle');

  let done = false;
  const unmountX = preview ? () => {} : mountCloseButton(root, () => cancel());
  const close = (): void => {
    if (done) return;
    done = true;
    unmountX();
    wrap.remove();
    if (!preview) unlockInput('start-battle');
  };
  const cancel = (): void => {
    if (done) return;
    o.onCancel();
  };
  fight.addEventListener('click', () => {
    if (done) return;
    o.onFight();
  });
  scrim.addEventListener('click', (e) => {
    if (done) return;
    if (o.onScrimTap?.(e.offsetX, e.offsetY)) return;
    cancel();
  });

  const place = (): void => {
    if (done) return;
    const vw = wrap.clientWidth;
    const vh = wrap.clientHeight;
    const a = o.anchor();
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const gu = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gu')) || 1;
    if (!a) {
      card.style.left = `${Math.max(8, (vw - cw) / 2)}px`;
      card.style.top = `${Math.max(8, (vh - ch) / 2)}px`;
      nl.style.display = nr.style.display = 'none';
      ring.style.display = 'none';
      scrim.style.background = 'rgba(5,3,2,.5)';
      return;
    }
    const r = Math.max(13, 29 * gu);
    const gap = r + Math.max(14, 20 * gu); // düğüm etiketi kartın altında kalmasın: yatayda yeterli boşluk
    let left = a.x + gap;
    let side: 'l' | 'r' = 'l';
    if (left + cw > vw - 10) {
      left = a.x - gap - cw;
      side = 'r';
    }
    left = Math.max(8, Math.min(vw - cw - 8, left));
    const top = Math.max(8, Math.min(vh - ch - 8, a.y - ch / 2));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    (side === 'l' ? nr : nl).style.display = 'none';
    (side === 'l' ? nl : nr).style.display = '';
    (side === 'l' ? nl : nr).style.top = `${Math.max(18, Math.min(ch - 30, a.y - top - 8))}px`;
    // düğüm parlak kalsın: kararan zeminde düğüm çevresinde delik (radyal geçiş)
    wrap.style.setProperty('--ax', `${a.x}px`);
    wrap.style.setProperty('--ay', `${a.y}px`);
    wrap.style.setProperty('--ar', `${Math.round(r * 1.5)}px`);
    ring.style.display = '';
    ring.style.left = `${a.x}px`;
    ring.style.top = `${a.y}px`;
    ring.style.width = ring.style.height = `${r * 2}px`;
  };
  place();
  requestAnimationFrame(() => !done && place()); // yazı tipi / görsel yüklenince boy değişirse
  return { close, place, el: wrap };
}
