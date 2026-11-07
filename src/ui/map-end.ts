/**
 * Harita 1 bitiş ekranı (Ömer 2026-11-07, taslak map1-end A "Ledger"; src/ui/map-end.css): ortada tek panel; başlık + hikâye satırı, sefer özeti
 * (yalnız TUTULAN sayılar), kadro (portre + level), en iyi 3 item, sıradaki haritanın teaser şeridi ve Continue. Oyun kuralı burada yok:
 * sahne verileri hazırlar (CampaignMapScene > mapEndCard) ve düğmelerin `run`ını verir. Girdi kilidi açıkken alttaki Phaser sahnesi tıklama almaz.
 */
import './map-end.css';
import { lockInput, unlockInput } from './input-lock';

const arts = import.meta.glob('../../assets/campaign/*-bg.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const artUrl = (id: string): string | undefined => arts[`../../assets/campaign/${id}.webp`];

export interface MapEndOpts {
  title: string;
  subtitle: string;
  /** Hikâye satırı; boşsa çizilmez (final sinematiği aynı cümleyi az önce gösterdi). */
  story: string;
  /** Sefer özeti kutuları: yalnız oyunun gerçekten tuttuğu sayılar. */
  stats: Array<{ label: string; value: string }>;
  heroes: Array<{ name: string; level: number; face?: string }>;
  loot: Array<{ name: string; tag: string; icon: string; color?: string }>;
  /** Sıradaki harita (yoksa teaser şeridi çizilmez). */
  next?: { name: string; art?: string; teaser: string };
  buttons: Array<{ label: string; primary?: boolean; run: () => void }>;
}

export interface MapEndHandle {
  close(): void;
}

const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const faces = import.meta.glob('../../assets/avatars/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const heroFace = (cls: string): string | undefined => faces[`../../assets/avatars/${cls}.webp`];

export const mapEndArt = (id: string): string | undefined => artUrl(id);

export function openMapEnd(root: HTMLElement, o: MapEndOpts): MapEndHandle {
  const wrap = document.createElement('div');
  wrap.className = 'mend';
  const bg = artUrl('valdoria-bg');
  const stats = o.stats.map((s) => `<div class="me-stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('');
  const heroes = o.heroes
    .map((h) => `<div class="me-hero"><div class="face">${h.face ? `<img src="${h.face}" alt="" draggable="false">` : ''}<span class="lv">Lv ${h.level}</span></div><div class="nm">${esc(h.name)}</div></div>`)
    .join('');
  const loot = o.loot
    .map((l) => `<div class="me-it"><div class="tile"><img src="${l.icon}" alt="" draggable="false"></div><div><div class="nm"${l.color ? ` style="color:${esc(l.color)}"` : ''}>${esc(l.name)}</div><div class="tg">${esc(l.tag)}</div></div></div>`)
    .join('');
  const tease = o.next
    ? `<div class="me-tease">${o.next.art ? `<div class="art" style="background-image:url(${o.next.art})"></div>` : ''}<div class="tx"><div class="nm">${esc(o.next.name)}</div><p>${esc(o.next.teaser)}</p></div></div>`
    : '<div class="me-tease"></div>';
  wrap.innerHTML = `${bg ? `<div class="me-bg" style="background-image:url(${bg})"></div>` : ''}<div class="me-panel" role="dialog" aria-label="${esc(o.title)}">
    <div class="me-sub">${esc(o.subtitle)}</div><h1 class="me-t">${esc(o.title)}</h1>${o.story ? `<p class="me-story">${esc(o.story)}</p>` : ''}<hr class="me-rule">
    ${stats ? `<div class="me-stats" style="--n:${o.stats.length}">${stats}</div>` : ''}
    <div class="me-row2"><div><div class="me-h">Your company</div><div class="me-heroes">${heroes}</div></div>${loot ? `<div><div class="me-h">Best finds</div><div class="me-loot">${loot}</div></div>` : ''}</div>
    <div class="me-foot">${tease}<div class="me-acts"></div></div></div>`;
  const acts = wrap.querySelector<HTMLElement>('.me-acts')!;
  let done = false;
  for (const b of o.buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `el-btn${b.primary ? ' primary ready' : ''}`;
    btn.textContent = b.label;
    btn.addEventListener('click', () => {
      if (!done) b.run();
    });
    acts.append(btn);
  }
  root.append(wrap);
  lockInput('map-end');
  return {
    close: () => {
      if (done) return;
      done = true;
      wrap.remove();
      unlockInput('map-end');
    },
  };
}
