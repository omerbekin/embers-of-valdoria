/**
 * Harita pencereleri (Ömer 2026-10-19, taslak public/mockups/map-events.html):
 *  - A "levha" (ortada): olay, olay sonucu, hazine, dinlenme, "Choose your hero", aday (yeni yoldaş). Başlık şeridi (madalyon + ad + çipler),
 *    sahne şeridi, metin, çipler, gövde (seçenek plakaları / seçilen plaka / kahraman kartları / düşmüş kahramanlar), düğmeler (birincil EN SAĞDA).
 *  - C "düğümün yanında kart" (anchored): kasaba içi küçük notlar (ateş, ilan panosu, kışla). Start Battle kartıyla aynı dil ve ok ucu.
 * Oyun kuralı burada yok: sahne içerik ve geri çağrıları verir. Zorunlu pencerede `onDismiss` verilmez (zemin kapatmaz, X yok);
 * verilirse zemin, X (Menu yerinde, nav-close) ve sahnenin Esc'i kapatır. DOM katmanı açıkken sahne girişi kilitli (input-lock).
 */
import './map-window.css';
import { statImage, miscImage, uiImage } from '../game/icon-image-files';
import mwData from '../../data/map-window.json';
import { addBustWeapons, avatarUrlOf, bustHtml } from './hero-bust';
import { lockInput, unlockInput } from './input-lock';
import { mountCloseButton } from './nav-close';
import { attachBandTip, reasonSpec } from './band-tip-attach';
import { mountHeroPicker } from './hero-picker';

export type MwTone = 'info' | 'gain' | 'heal' | 'loss' | 'dim';
export type MwIcon = 'gold' | 'gear' | 'bag' | 'rest' | 'hp' | 'sword' | 'str' | 'dex' | 'int' | 'luck' | 'check';
export type MwAcc = 'ember' | 'gold' | 'red' | 'violet' | 'green' | 'dim';

export interface MwChip {
  tone: MwTone;
  icon?: MwIcon;
  text: string;
}
export interface MwPlate {
  id: string;
  label: string;
  desc: string;
  tag: string;
  acc: MwAcc;
  chips: MwChip[];
  /** Altın yetmiyor vb: soluk + "need" satırı (yine de tıklanır; sahne sebebi bildirir). */
  need?: string;
  dim?: boolean;
}
export interface MwCard {
  id: string;
  classId: string;
  spriteId: string;
  name: string;
  color: string;
  role?: string;
  stat?: string;
  blurb?: string;
  /** Ek etiket çipi (ör. "Area attacks", "Played in the tutorial"). */
  tag?: string;
  /** Seçilemez (soluk; ör. respec malzemesinde sıfırlanacak puanı olmayan kahraman). */
  off?: boolean;
}
export interface MwFallen {
  classId: string;
  spriteId: string;
  name: string;
  note: string;
}
export type MwBody =
  | { k: 'plates'; plates: MwPlate[]; pick: (id: string) => void }
  | { k: 'chosen'; plate: MwPlate }
  | { k: 'cards'; cards: MwCard[]; leader?: boolean; onPick?: (id: string) => void; /** Listenin görünen satır sayısı (Recruit: 4). */ rows?: number; /** Önerilenler: listede önce, "Recommended" etiketli. */ recommended?: readonly string[] }
  | { k: 'fallen'; rows: MwFallen[] };
export interface MwAct {
  label: string;
  primary?: boolean;
  /** true: bir kart seçilene dek soluk (kapalı). */
  needPick?: string;
  run: (picked: string, name?: string) => void;
}
export interface MwSpec {
  variant: 'A' | 'C';
  /** Düğüm türü (madalyon rengi + ikonu): start | event | treasure | rest | town | battle | merchant. */
  type: string;
  kind: string;
  place?: string;
  region?: string;
  title: string;
  /** Madalyonun içindeki ikon (misc ikon adı, ör. 'emblem:recruit'); yoksa düğüm türünün ikonu. Çerçeve türden gelir. */
  icon?: string;
  /** Sahne şeridi (data/map-window.json > art). */
  art?: { file: string; pos: [number, number] } | null;
  paras: string[];
  /** Arka arkaya savaş bilgisi (src/campaign/chain-info.ts): paragrafların altında sakin tek satır. */
  chain?: string;
  chipsCap?: string;
  chips?: MwChip[];
  body?: MwBody;
  acts: MwAct[];
  /** Bölük adı alanı (yalnız seferin başında): düğmelerle aynı satırda solda; değeri `run(picked, name)` ile gelir. */
  name?: { max: number; suggestions: string[] };
  /** Verilirse pencere kapatılabilir (zemin, X, Esc); yoksa zorunlu. */
  onDismiss?: () => void;
  /** C: düğüm / yerin CSS piksel konumu (+ yarım genişlik); null = ortala. */
  anchor?: () => { x: number; y: number; hw?: number } | null;
}
export interface MwHandle {
  close(): void;
  place(): void;
  readonly el: HTMLElement;
}

const COL: Record<string, string> = { treasure: '#efc85a', event: '#b99ad6', rest: '#f08c3c', merchant: '#9fc4a0', town: '#e3bf72', battle: '#cdb67f', start: '#cdb67f' };
const rgb = (h: string): string => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const sceneFiles = import.meta.glob('../../assets/campaign/windows/*.webp', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;

/** Tanımlı sahne şeridi (data/map-window.json > art) için anahtar araması. */
export function windowArt(...keys: string[]): { file: string; pos: [number, number] } | null {
  const art = (mwData as unknown as { art: Record<string, { file: string; pos: [number, number] }> }).art;
  for (const k of keys) if (art[k]) return art[k]!;
  return null;
}

/** Olay seçeneğinin plaka etiketi / rengi / açıklaması (data/map-window.json > choices; yoksa verisinden türetilir). */
export function choiceStyle(eventId: string, c: { id: string; hint?: string; battle?: unknown; cost?: number; hpLoss?: number }): { tag: string; acc: MwAcc; desc: string } {
  const ch = (mwData as unknown as { choices: Record<string, { tag: string; acc: MwAcc; desc: string }> }).choices[`${eventId}.${c.id}`];
  if (ch) return ch;
  const tag = c.battle ? 'Fight' : c.hpLoss ? 'Blood' : c.cost ? 'Gold' : 'Free';
  const acc: MwAcc = c.battle ? 'ember' : c.hpLoss ? 'red' : c.cost ? 'gold' : 'green';
  return { tag, acc, desc: c.hint ?? '' };
}

function iconUrl(i: MwIcon): string | null {
  if (i === 'gold' || i === 'gear' || i === 'bag' || i === 'rest') return uiImage(i)?.url ?? null;
  if (i === 'sword') return miscImage('node:battle')?.url ?? null;
  if (i === 'check') return null;
  return statImage(i)?.url ?? null;
}
const CHECK = '<svg class="ck" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5 L5 9.5 L10 3"/></svg>';
const CROWN = '<svg class="crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 19V8l5 5 4-8 4 8 5-5v11z"/><circle cx="12" cy="15.5" r="1.3" fill="#e0702a" stroke="none"/></svg>';

const chipHtml = (c: MwChip, big = false): string => {
  const u = c.icon ? iconUrl(c.icon) : null;
  return `<span class="mw-chip ${c.tone}${big ? ' big' : ''}">${c.icon === 'check' ? CHECK : u ? `<img src="${u}" alt="" draggable="false">` : ''}${esc(c.text)}</span>`;
};
const chipsHtml = (l: MwChip[], big = false): string => `<div class="mw-chips">${l.map((c) => chipHtml(c, big)).join('')}</div>`;

function medal(type: string, px: [number, number], icon?: string): string {
  const c = COL[type] ?? COL['battle']!;
  const D = 'url(#mw-disc)';
  const tab = (k: number): string => `<path d="M${k * 30} -7 L${k * 46} 0 L${k * 30} 7 L${k * 34} 0Z" fill="${c}" stroke="rgba(0,0,0,.5)"/>`;
  let b: string;
  let isz = 54;
  if (type === 'town') {
    const flag = (k: number): string => `<path d="M${k * 40} -12 L${k * 40} 16 M${k * 40} -12 L${k * 58} -6 L${k * 40} 0" stroke="${c}" stroke-width="2" fill="#8c2b1c" stroke-linejoin="round"/>`;
    b = `${flag(-1)}${flag(1)}<path d="M-14 -44 v-8 h6 v5 h5 v-5 h6 v5 h5 v-5 h6 v8Z" fill="${c}" stroke="rgba(0,0,0,.5)"/><circle r="34" fill="${D}" stroke="${c}" stroke-width="3.2"/><circle r="39" fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="1.4"/>`;
    isz = 60;
  } else if (type === 'start' || type === 'battle') b = `<circle r="28" fill="${D}" stroke="${c}" stroke-width="2"/><circle r="31.5" fill="none" stroke="${c}" stroke-opacity=".3"/>`;
  else b = `${tab(-1)}${tab(1)}<circle r="29" fill="${D}" stroke="${c}" stroke-width="3"/><circle r="25" fill="none" stroke="${c}" stroke-opacity=".4"/>`;
  const own = icon ? miscImage(icon)?.url : undefined;
  if (own) isz = 70; // özel emblem (ör. Recruit) madalyonun içini doldurur
  const url = own ?? miscImage(`node:${type}`)?.url;
  const size = `width:max(${px[0]}px,calc(${px[1]} * var(--u)));height:max(${px[0]}px,calc(${px[1]} * var(--u)))`;
  return `<svg class="mw-medal" viewBox="-62 -62 124 124" style="${size}">${b}${url ? `<image href="${url}" x="${-isz / 2}" y="${-isz / 2 - 1}" width="${isz}" height="${isz}"/>` : ''}</svg>`;
}

const plateHtml = (o: MwPlate, chosen = false): string => {
  const need = o.need ? `<span class="need">${esc(o.need)}</span>` : '';
  return `<button type="button" class="mw-plate acc-${o.acc}${o.dim ? ' dim' : ''}${chosen ? ' chosen' : ''}" ${chosen ? 'tabindex="-1"' : `data-plate="${esc(o.id)}"`}><span class="mw-ptag">${chosen ? 'You chose' : esc(o.tag)}</span><b class="mw-pnm">${esc(o.label)}</b><p class="mw-pds">${esc(o.desc)}</p>${o.chips.length && !chosen ? '<div class="mw-pdv"></div>' : ''}${chosen ? '' : chipsHtml(o.chips)}${need}</button>`;
};

const lighten = (hex: string): string => `color-mix(in srgb, ${hex} 55%, #fff)`;
function cardHtml(c: MwCard, i = 0): string {
  const logo = miscImage(`class:${c.classId}`)?.url;
  const chips: MwChip[] = [];
  if (c.role) chips.push({ tone: 'info', text: c.role });
  if (c.stat) chips.push({ tone: 'gain', icon: c.stat as MwIcon, text: c.stat.toUpperCase() });
  if (c.tag) chips.push({ tone: 'dim', text: c.tag });
  return `<button type="button" class="mw-card${c.off ? ' off' : ''}" data-card="${esc(c.id)}"${c.off ? ' aria-disabled="true"' : ''} style="--i:${i};--ac:${c.color};--acl:${lighten(c.color)}"><div class="pt">${bustHtml(c.classId, c.spriteId)}${logo ? `<img class="em" src="${logo}" alt="" draggable="false">` : ''}<span class="lead"></span></div>
    <span class="nm">${esc(c.name)}</span>${chips.length ? chipsHtml(chips) : ''}${c.blurb ? `<p class="ds">${esc(c.blurb)}</p>` : ''}</button>`;
}

const bodyHtml = (b: MwBody | undefined): string => {
  if (!b) return '';
  if (b.k === 'plates') return `<div class="mw-plates${b.plates.length === 1 ? ' one' : ''}">${b.plates.map((p) => plateHtml(p)).join('')}</div>`;
  if (b.k === 'chosen') return `<div class="mw-plates one solo">${plateHtml(b.plate, true)}</div>`;
  if (b.k === 'cards') return `<div class="mw-cards">${b.cards.map((c, i) => cardHtml(c, i)).join('')}</div>`;
  return `<div class="mw-fallen">${b.rows.map((r) => {
    const av = avatarUrlOf(r.spriteId);
    return `<div class="mw-frow">${av ? `<img class="av" src="${av}" alt="" draggable="false">` : ''}<div class="tx"><b>${esc(r.name)}</b><span>${esc(r.note)}</span></div></div>`;
  }).join('')}</div>`;
};

/** medal() gradyanı (`#mw-disc`): üst bilgiyi kullanan her pencerenin içinde bir kez bulunmalı. */
export const MW_DEFS = '<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="mw-disc" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="#4a3622"/><stop offset=".7" stop-color="#1c130b"/><stop offset="1" stop-color="#0d0805"/></radialGradient></defs></svg>';

/**
 * ORTAK pencere üst bilgisi (Ömer 2026-11-10): sol madalyon (düğüm türü ikonu) + başlık + çip satırı (yer / bölge). Başlığı tekrarlayan tür çipi gösterilmez.
 * Harita pencereleri (A levha: olay, Recruit, Choose your hero...) ve "Choose a companion" aynı üst bilgiyi kullanır.
 */
export function mwHeaderHtml(o: { type: string; kind?: string; place?: string; region?: string; title: string; icon?: string }, px: [number, number] = [44, 96]): string {
  const col = COL[o.type] ?? COL['battle']!;
  const kind = o.kind && o.kind.trim().toLowerCase() !== o.title.trim().toLowerCase() ? `<span class="mw-chip type" style="--ac:${col}">${esc(o.kind)}</span>` : '';
  const tags = `<div class="mw-tags">${kind}${o.place ? `<span class="mw-chip dim">${esc(o.place)}</span>` : ''}${o.region ? `<span class="mw-chip dim reg">${esc(o.region)}</span>` : ''}</div>`;
  return `<div class="mw-hd" style="--ac:${col};--acr:${rgb(col)}">${medal(o.type, px, o.icon)}<div class="tx"><h2 class="mw-t">${esc(o.title)}</h2>${tags}</div></div>`;
}

export function openMapWindow(root: HTMLElement, o: MwSpec): MwHandle {
  const wrap = document.createElement('div');
  wrap.className = `mw mw-in${o.variant === 'C' ? ' anch' : ''}`;
  const acc = `--ac:${COL[o.type] ?? COL['battle']};--acr:${rgb(COL[o.type] ?? COL['battle']!)}`;
  const body = o.body;
  const bd = body ? `bd-${body.k === 'plates' ? 'plates' : body.k}` : 'bd-none';
  const tags = `<div class="mw-tags"><span class="mw-chip type" style="--ac:${COL[o.type] ?? COL['battle']}">${esc(o.kind)}</span>${o.place ? `<span class="mw-chip dim">${esc(o.place)}</span>` : ''}${o.region ? `<span class="mw-chip dim reg">${esc(o.region)}</span>` : ''}</div>`;
  const art = o.art ? `<div class="mw-art" data-art="${esc(o.art.file)}" style="background-position:${Math.round(o.art.pos[0] * 100)}% ${Math.round(o.art.pos[1] * 100)}%"></div>` : '';
  const paras = `<div class="mw-txt">${o.paras.map((p) => `<p>${esc(p)}</p>`).join('')}${o.chain ? `<p class="mw-chain">${esc(o.chain)}</p>` : ''}</div>`;
  const chipBlock = o.chips?.length ? `${o.chipsCap ? `<h3 class="mw-cap">${esc(o.chipsCap)}</h3>` : ''}${chipsHtml(o.chips, body?.k !== 'plates')}` : '';
  const nameBox = o.name ? `<span class="mw-cname"><span class="mw-cname-box"><input class="el-field mw-cname-in" type="text" maxlength="${o.name.max}" placeholder="Name your company" aria-label="Company name" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done"><span class="mw-cname-n">0 / ${o.name.max}</span></span><button type="button" class="el-btn mw-cname-sug" data-suggest>Suggest</button></span>` : '';
  const acts = o.acts.length
    ? `<div class="mw-acts">${nameBox}${o.acts.map((a, i) => `${a.needPick ? `<span class="mw-pickhint" data-pickhint="${i}">${esc(a.needPick)}</span>` : ''}<button type="button" class="el-btn${a.primary ? ' primary ready' : ''}" data-act="${i}"${a.needPick ? ' disabled' : ''}>${esc(a.label)}</button>`).join('')}</div>`
    : '';
  const inner = `<div class="mw-scroll"><div class="mw-body">${paras}${chipBlock}${bodyHtml(body)}${acts}</div></div>`;
  const defs = MW_DEFS;
  let win: string;
  if (o.variant === 'A') {
    const corners = '<i class="mw-corner tl"></i><i class="mw-corner tr"></i><i class="mw-corner bl"></i><i class="mw-corner br"></i>';
    win = `<div class="mw-win mw-center mw-A ${o.type} ${bd}"><div class="mw-panel" style="${acc}">${corners}
      ${mwHeaderHtml(o)}${art}${inner}</div></div>`;
  } else {
    const wide = body?.k === 'plates' || body?.k === 'fallen' || (body?.k === 'cards' && body.cards.length > 2);
    win = `<div class="mw-win mw-C${wide ? ' wide' : ''} ${o.type} ${bd}"><div class="mw-panel" style="${acc}"><i class="mw-notch l"></i><i class="mw-notch r"></i>${art}
      <div class="mw-hd2">${medal(o.type, [40, 90])}<div class="tx"><h2 class="mw-t">${esc(o.title)}</h2>${tags}</div></div>${inner}</div></div>`;
  }
  wrap.innerHTML = `${defs}<div class="mw-scrim"></div>${win}`;
  root.append(wrap);
  addBustWeapons(wrap);
  lockInput('map-window');

  let done = false;
  const unmountX = o.onDismiss ? mountCloseButton(root, () => dismiss()) : () => undefined;
  const dismiss = (): void => {
    if (!done) o.onDismiss?.();
  };
  const close = (): void => {
    if (done) return;
    done = true;
    unmountX();
    wrap.remove();
    unlockInput('map-window');
  };
  if (o.onDismiss) wrap.querySelector('.mw-scrim')?.addEventListener('click', dismiss);
  else wrap.querySelector('.mw-scrim')?.addEventListener('click', () => undefined);

  // sahne şeridi: tembel yüklenir (eksikse düz zemin; oyun çökmez)
  const artEl = wrap.querySelector<HTMLElement>('.mw-art');
  if (artEl && o.art) {
    const load = sceneFiles[`../../assets/campaign/windows/${o.art.file}.webp`];
    if (load) void load().then((u) => !done && (artEl.style.backgroundImage = `url(${u})`)).catch(() => undefined);
  }

  // kartlar: seçim sınıf değiştirerek (yeniden çizim yok)
  let picked = '';
  const actBtns = [...wrap.querySelectorAll<HTMLButtonElement>('[data-act]')];
  const syncActs = (): void => {
    o.acts.forEach((a, i) => {
      const b = actBtns[i];
      if (b && a.needPick) {
        b.disabled = !picked;
        wrap.querySelector<HTMLElement>(`[data-pickhint="${i}"]`)?.toggleAttribute('hidden', !!picked); // görünür neden (Ömer 2026-11-14, form r18 u06)
        // pasif nedeni A Band ipucu (ilk kurulumda bağlanır; ipucu üretici seçime bakar)
        if (!b.dataset['bt']) attachBandTip(b, () => (picked ? null : reasonSpec(a.label, a.needPick!)));
      }
    });
  };
  const cards = [...wrap.querySelectorAll<HTMLElement>('[data-card]')];
  for (const el of cards) {
    el.addEventListener('click', () => {
      if (done || el.classList.contains('off')) return;
      picked = el.dataset['card'] ?? '';
      for (const c of cards) {
        const on = c === el;
        c.classList.toggle('sel', on);
        const lead = c.querySelector<HTMLElement>('.lead');
        if (lead) lead.innerHTML = on && body?.k === 'cards' && body.leader ? CROWN : '';
      }
      syncActs();
      if (body?.k === 'cards') body.onPick?.(picked);
    });
  }
  if (body?.k === 'plates') {
    for (const el of wrap.querySelectorAll<HTMLElement>('[data-plate]')) el.addEventListener('click', () => !done && body.pick(el.dataset['plate'] ?? ''));
  }
  // bölük adı (yalnız seferin başında): sayaç, Suggest (hazır adı üstüne yazar), yazarken kısayollar çalışmaz
  const nameIn = wrap.querySelector<HTMLInputElement>('.mw-cname-in');
  if (nameIn && o.name) {
    const names = o.name.suggestions;
    let at = Math.floor(Math.random() * names.length) - 1; // yalnızca görünüm (kayda rastgelelik girmez)
    const paint = (): void => {
      const n = wrap.querySelector<HTMLElement>('.mw-cname-n');
      if (n) n.textContent = `${nameIn.value.length} / ${o.name!.max}`;
    };
    nameIn.addEventListener('input', paint);
    const stop = (e: KeyboardEvent): void => {
      e.stopPropagation();
      if (e.type === 'keydown' && (e.key === 'Enter' || e.key === 'Escape')) nameIn.blur();
    };
    nameIn.addEventListener('keydown', stop);
    nameIn.addEventListener('keyup', stop);
    nameIn.addEventListener('keypress', stop);
    const sug = wrap.querySelector<HTMLElement>('[data-suggest]');
    sug?.addEventListener('pointerdown', (e) => e.preventDefault());
    sug?.addEventListener('click', () => {
      at = (at + 1) % names.length;
      if (names[at] === nameIn.value) at = (at + 1) % names.length;
      nameIn.value = names[at] ?? '';
      paint();
    });
  }
  actBtns.forEach((b, i) =>
    b.addEventListener('click', () => {
      if (done || b.disabled) return;
      o.acts[i]!.run(picked, nameIn?.value ?? '');
    }),
  );
  syncActs();

  const noteL = wrap.querySelector<HTMLElement>('.mw-notch.l');
  const noteR = wrap.querySelector<HTMLElement>('.mw-notch.r');
  const place = (): void => {
    if (done || o.variant !== 'C') return;
    const win = wrap.querySelector<HTMLElement>('.mw-C');
    if (!win) return;
    const vw = wrap.clientWidth;
    const vh = wrap.clientHeight;
    const cw = win.offsetWidth;
    const ch = win.offsetHeight;
    const a = o.anchor?.() ?? null;
    if (!a) {
      win.style.left = `${Math.max(8, (vw - cw) / 2)}px`;
      win.style.top = `${Math.max(8, (vh - ch) / 2)}px`;
      if (noteL) noteL.style.display = 'none';
      if (noteR) noteR.style.display = 'none';
      return;
    }
    const gap = Math.max(22, (a.hw ?? 0) + 18);
    let left = a.x + gap;
    let side: 'l' | 'r' = 'l';
    if (left + cw > vw - 10) {
      left = a.x - gap - cw;
      side = 'r';
    }
    left = Math.max(8, Math.min(vw - cw - 8, left));
    const top = Math.max(8, Math.min(vh - ch - 8, a.y - ch / 2));
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
    const on = side === 'l' ? noteL : noteR;
    const off = side === 'l' ? noteR : noteL;
    if (off) off.style.display = 'none';
    if (on) {
      on.style.display = '';
      on.style.top = `${Math.max(18, Math.min(ch - 30, a.y - top - 8))}px`;
    }
  };
  place();
  requestAnimationFrame(() => !done && place());
  // Kahraman seçim penceresi: ortak seçici (satır listesi + yanında kart; src/ui/hero-picker.ts)
  if (body?.k === 'cards') mountHeroPicker(wrap, body.cards, { place, ...(body.rows ? { rows: body.rows } : {}), ...(body.recommended ? { recommended: body.recommended } : {}) });
  return { close, place, el: wrap };
}
