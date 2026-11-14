/**
 * Düğüm kartı (Ömer 2026-10-18, taslak start-battle v3 "Anchored"): seçilen düğümün yanında küçük kart, ok ucu düğümü gösterir (sağa ya da
 * sola otomatik yerleşir); harita daha az kararır, düğüm parlak kalır. Kartın İÇİ src/ui/node-card.ts (Tur 14 kararı: Herald H2 Banner + düz
 * Lv + H1 defne elit / görkemli başak boss). Her düğüm türü aynı kartı kullanır; `actionLabel` düğümün kendi eylemi (Fight / Enter / Rest /
 * Trade / Open / Continue); `onFight` o eylemi çalıştırır.
 * Kapatma: Menu yerindeki ortak X (src/ui/nav-close.ts), Esc (sahne), kararan zemine dokunma. Oyun kuralı burada yok: sahne `onFight` /
 * `onCancel` verir. Tek kart, iki adım (Ömer 2026-10-23): `preview` = fareyle üstüne gelince açılan ÖNİZLEME (düğme yok, zemin kararmaz, girdi
 * kilitlenmez, fareyi geçirir, X yok); normal kart = sabitlenmiş (düğme ya da `note`).
 */
import './start-battle.css';
import { content } from '../engine';
import { encounterUnit } from '../engine/content';
import { ownerOfUnit } from '../game/asset-versions';
import { miscImage } from '../game/icon-image-files';
import { bindIcon } from './dom-icons';
import { attachBandTip } from './band-tip-attach';
import type { BandTipSpec } from './band-tip';
import { lockInput, unlockInput } from './input-lock';
import { mountCloseButton } from './nav-close';
import { classLogoName, miscIconName } from './misc-icons';
import type { FoeGroup } from '../campaign/encounters';
import { buildNodeCard, type NodeCardFacts } from './node-card';

const avatars = import.meta.glob('../../assets/avatars/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const avatarUrl = (id: string): string | undefined => avatars[`../../assets/avatars/${id}.webp`];

export interface StartBattleOpts {
  /** Düğüm adı (kartın başlığı). */
  name: string;
  /** Tür satırı ("Battle · Outlaw Pack"); gövdede görünen parça tekrar edilmez (node-card.ts > dedupSubtitle). */
  subtitle: string;
  /** Düğüm türü (madalyon ikonu: assets/misc-icons/node). */
  nodeType: string;
  level: number;
  /**
   * Takıma göre zorluk (level farkı bandı; src/campaign/level-gap.ts): bant normal değilse "Company X.X" yazısı bant renginde (eski kart gibi).
   * Bant adı (Dangerous / Deadly) yazılmaz.
   */
  threat?: { band: 'normal' | 'danger' | 'deadly'; color: string; company?: number };
  /** Takımın ortalama seviyesi (src/campaign/level-gap.ts > companyAvgLevel): "Company X.X"; 0 / yok = gizli. */
  teamLevel?: number;
  /** Yan karşılaşma uyarısı (src/campaign/side-danger.ts): "Stronger than the road ahead" satırı. */
  side?: { line: string };
  /** Arka arkaya savaş bilgisi (src/campaign/chain-info.ts): sakin tek satır, "Depth 3 · no rest since the surface". */
  chain?: string;
  /** Savaşsız düğümde (kasaba, kamp, tüccar, hazine, olay) boş / verilmez. */
  foes?: FoeGroup[];
  /** Düğümün türetilmiş bilgisi (tür, known, elit / boss çerçevesi, sahne; CampaignMapScene > designFacts). */
  design: NodeCardFacts;
  /** Birincil düğme yazısı (varsayılan "Fight"; kasaba "Enter", kamp "Rest" ...). */
  actionLabel?: string;
  /** Lore satırı (düğümün lore'u; yoksa önder düşmanın pasifi / kilit / Caravel notu). */
  info?: { text: string };
  /** Devriye etiketleri (PATROL · FULL LOOT · NO VALOR): tek düz satır. */
  tags?: Array<{ text: string }>;
  /** Rakip bölük (Silver Stag): ad + tek satır; `cause` lore satırının yerine geçer. */
  company?: { name: string; line: string; cause: string };
  /** Fare önizlemesi: düğmesiz, girdiyi kilitlemez, zemin kararmaz. */
  preview?: boolean;
  /** Verilirse düğmenin yerine düz bu satır (ör. "Not reachable yet"); düğme yok. */
  note?: string;
  /** Önizlemeden sabitlenirken giriş animasyonu tekrar oynamaz. */
  instant?: boolean;
  /** Varışta önce gelen kadro adımları (playtest H3 / H2): "Form your company." gibi. */
  first?: string[];
  /** Kasaba kartı: kasabanın yerleri (ad + ikon), üstüne gelince / dokununca A Band ipucu. `flags` = kısa haber satırları. */
  services?: Array<{ name: string; icon?: string; tip: BandTipSpec }>;
  flags?: string[];
  /**
   * Kararan zemine dokunuş (playtest U8, tek tıkla hızlı yolculuk): zeminin yerel CSS pikseli verilir; true dönerse sahne dokunuşu kullandı
   * (ör. başka bir düğüme yürüdü), kart onCancel çağrılmadan bırakılır. Yoksa / false ise eskisi gibi vazgeç.
   */
  onScrimTap?: (x: number, y: number) => boolean;
  /** Düğümün #ui-root içindeki CSS piksel konumu (harita kayarsa / boyut değişirse yeniden sorulur); null = ortala. */
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

const tierName = (f: FoeGroup): string => (f.tier === 'boss' ? 'Boss' : f.tier === 'elite' ? 'Elite' : '');
const foeTipText = (f: FoeGroup, level: number): string => {
  const tag = tierName(f);
  return `${f.name}${f.n > 1 ? ` ×${f.n}` : ''}${tag ? ` · ${tag}` : ''} · Lv ${level}`;
};

/**
 * Düşmanın çok kısa bilgisi (düğüm kartı, bilinen düğüm; Ömer 2026-11-14 Tur 14): ad, rol ve tek satır (pasifin var olan açıklaması). Yeni metin yok.
 */
function foeBrief(f: FoeGroup, level: number): BandTipSpec {
  const def = (content.classes[f.cls] ?? encounterUnit(f.cls)) as { role?: string; passive?: { name?: string; text?: string } } | undefined;
  const kind = [tierName(f), def?.role ?? ''].filter(Boolean).join(' · ');
  const url = avatarUrl(f.sprite);
  const first = def?.passive?.text?.split(/(?<=[.!?])\s+/)[0] ?? ''; // tek satır: pasifin ilk cümlesi
  const line = first ? (def?.passive?.name ? `${def.passive.name}: ${first}` : first) : '';
  return {
    ...(kind ? { kind } : {}),
    title: `${f.name}${f.n > 1 ? ` ×${f.n}` : ''}`,
    value: `Lv ${level}`,
    ...(url ? { icon: url, iconShape: 'portrait' as const, iconFlip: true } : {}),
    ...(line ? { lines: [{ text: line }] } : {}),
  };
}

/** Portre kutusu (görsel yoksa sınıf logosu). */
function foeFace(f: FoeGroup): HTMLElement {
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
  return face;
}

export function openStartBattle(root: HTMLElement, o: StartBattleOpts): StartBattleHandle {
  const wrap = el('div', 'sbc');
  const scrim = el('div', 'sbc-scrim');
  const ring = el('i', 'sbc-ring');
  const card = el('div', 'sbc-card');
  const nl = el('i', 'sbc-notch l');
  const nr = el('i', 'sbc-notch r');
  const badge = miscImage(miscIconName('node', o.nodeType))?.url;
  const foes = o.foes ?? [];
  const preview = !!o.preview;
  if (!foes.length) card.classList.add('nofoes');
  card.append(nl, nr);

  // Lv / Company (yalnız savaşlı düğüm): takım ortalaması bir ondalık; zorluk bandı normal değilse Company bant renginde (eski kart gibi)
  const th = o.threat;
  const teamLv = o.teamLevel ?? th?.company ?? 0;
  const coLv = teamLv > 0 ? (Math.round(teamLv * 10) / 10).toFixed(1) : '';
  const bandColor = th && th.band !== 'normal' ? th.color : '';

  const tipOffs: Array<() => void> = [];
  const fight = el('button', 'el-btn primary ready dlg', esc(o.actionLabel ?? 'Fight'));
  fight.type = 'button';
  const noteEl = o.note ? el('p', 'sbc-note', esc(o.note)) : null;
  const actsEl = !preview && !o.note ? el('div', 'sbc-acts') : null;
  actsEl?.append(fight);

  const co = o.company;
  const crest = buildNodeCard(card, {
    name: o.name,
    subtitle: o.subtitle,
    badge,
    lv: foes.length ? { level: o.level, company: coLv, color: bandColor } : null,
    foes,
    lore: co ? co.cause : (o.info?.text ?? ''),
    side: o.side?.line ?? '',
    chain: o.chain ?? '',
    first: o.first ?? [],
    flags: o.flags ?? [],
    tags: (o.tags ?? []).map((t) => t.text),
    company: co ? { name: co.name, line: co.line } : null,
    services: (o.services ?? []).map((sv) => ({ name: sv.name, tip: sv.tip, ...(sv.icon ? { icon: sv.icon } : {}) })),
    act: noteEl ?? actsEl,
    face: (f) => foeFace(f),
    tip: (f) => foeTipText(f, o.level),
    foeInfo: (f) => foeBrief(f, o.level),
    bandTip: (node, spec) => void tipOffs.push(attachBandTip(node, spec)),
    portrait: (id) => avatarUrl(id),
    facts: o.design,
  });
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
    for (const off of tipOffs) off();
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

  /** Kartın üstüne taşan süs payı (madalyon / elit-boss çerçevesi); ok ucu (sbc-notch) sayılmaz (telefonda kartı ekranın altına itiyordu). */
  const overTop = (): number => {
    const top = card.getBoundingClientRect().top;
    let m = 0;
    for (const ch of card.children) if (!ch.classList.contains('sbc-notch')) m = Math.max(m, top - ch.getBoundingClientRect().top);
    if (crest) m = Math.max(m, top - crest.getBoundingClientRect().top);
    return Math.ceil(m);
  };
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
      card.style.top = `${Math.max(8 + overTop(), (vh - ch) / 2)}px`;
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
    const lift = overTop(); // üst kenar süsü kartın üstüne taşar: ekrandan çıkmasın
    let top = Math.max(8 + lift, Math.min(vh - ch - 8, a.y - ch / 2));
    // telefon: sağ üstteki X / tam ekran düğmeleri kartın köşesini örtmesin; önce aşağı, sığmazsa sola kaydır
    const wr = wrap.getBoundingClientRect();
    if (Math.abs(wr.width - vw) < 2) {
      for (const b of document.querySelectorAll<HTMLElement>('.nav-btn')) {
        const r = b.getBoundingClientRect();
        if (!r.width) continue;
        const bx = r.left - wr.left;
        const by = r.top - wr.top;
        if (left < bx + r.width && left + cw > bx && top < by + r.height && top + ch > by) {
          if (by + r.height + 6 + ch <= vh - 8) top = by + r.height + 6;
          else if (bx - 6 - cw >= 8) left = bx - 6 - cw;
        }
      }
    }
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
  requestAnimationFrame(() => {
    if (done) return;
    place();
  }); // yazı tipi / görsel yüklenince boy değişirse
  return { close, place, el: wrap };
}
