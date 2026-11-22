/**
 * Kahraman bilgi kartı (Ömer 2026-11-11, "Sheet"): portre solda; yanında ad + Lv, çipler (rol, menzil; ana stat çipi yok, ana stat zaten vurgulu),
 * HP / MP çubukları, yassı stat şeridi (tek satır: ikon + sayı), altında skill madalyonları. Her stata Band ipucu bağlanır (`bindHeroCardTips`).
 * Seçici (hero-picker.ts) kullanır; stil src/ui/hero-picker.css (`.hc`).
 */
import { content } from '../engine';
import { classBoardHero } from '../game/scene-board';
import { statImage } from '../game/icon-image-files';
import { avatarUrl, hideHeroSkillTip, showHeroSkillTip } from './character-panel';
import { attachBandTip } from './band-tip-attach';
import { statBandSpec, statTip } from './stat-tips';
import { heroStats } from '../progression';
import { heroSkillRowHtml } from './hero-card-skills';

export interface CardData {
  classId: string;
  name: string;
  role?: string;
  color?: string;
  level?: number;
}

const KEYS = ['str', 'dex', 'int', 'luck'] as const;
const LABEL: Record<string, string> = { str: 'STR', dex: 'DEX', int: 'INT', luck: 'LCK' };
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export function heroCardHtml(d: CardData): string {
  const def = content.classes[d.classId];
  const av = avatarUrl(d.classId) ?? '';
  const h = classBoardHero(d.classId);
  const range = h ? (h.range === null ? 'Global' : `Range ${h.range}`) : '';
  const prim = (def as unknown as { primary?: string } | undefined)?.primary ?? '';
  const attrs = (def?.attributes ?? {}) as unknown as Record<string, number>;
  const chips = [d.role ? `<span>${esc(d.role)}</span>` : '', range ? `<span class="hot">${esc(range)}</span>` : ''].join('');
  const stats = KEYS.map((k) => {
    const u = statImage(k)?.url;
    return `<span class="${prim === k ? 'hot' : ''}" data-stat="${k}">${u ? `<img src="${u}" alt="${LABEL[k]}">` : `<em>${LABEL[k]}</em>`}<b>${attrs[k] ?? 0}</b></span>`;
  }).join('');
  const hp = def?.stats.hp ?? 0;
  const mp = def?.stats.mp ?? 0;
  return `<div class="hc" style="--c:${d.color ?? '#d9b26a'}"><div class="top"><div class="pt">${av ? `<img src="${av}" alt="">` : ''}</div>
    <div class="id"><div class="hd"><span class="nm">${esc(d.name)}</span><span class="lv">Lv ${d.level ?? 1}</span></div><div class="chips">${chips}</div>
    <div class="bars"><div class="hc-bar hp"><i></i><b>HP ${hp}</b></div>${mp ? `<div class="hc-bar mp"><i></i><b>MP ${mp}</b></div>` : ''}</div>
    <div class="stats">${stats}</div></div></div>
    ${heroSkillRowHtml(d.classId)}</div>`;
}

/** Karttaki her stata ortak Band ipucunu (statın ne işe yaradığı; savaş HUD'ı / Gear ile aynı metin) bağlar. Kart her çizildiğinde çağrılır. */
export function bindHeroCardTips(root: HTMLElement, classId: string): void {
  const st = heroStats({ class: classId });
  if (!st) return;
  bindSkillTips(root, classId, st);
  root.querySelectorAll<HTMLElement>('.hc .stats [data-stat]').forEach((n) => {
    const k = n.dataset['stat'] ?? '';
    attachBandTip(n, () => {
      const info = statTip(k, st);
      return info ? statBandSpec(k, info) : null;
    });
  });
}

/**
 * Skill / pasif plakalarına ortak skill ipucu (Gear Sheet / formation ile AYNI parça ve metin: character-panel.ts > showHeroSkillTip). Masaüstünde hover,
 * dokunmatikte dokunuş açar / kapatır. Kart her çizildiğinde (kök yeniden kurulur) yeniden bağlanır.
 */
function bindSkillTips(root: HTMLElement, classId: string, st: NonNullable<ReturnType<typeof heroStats>>): void {
  const bar = root.querySelector<HTMLElement>('.hp-sks');
  if (!bar) return;
  let open: HTMLElement | null = null;
  const show = (cell: HTMLElement): void => {
    open = cell;
    showHeroSkillTip(cell, classId, st, cell.dataset['skill'] ?? '');
  };
  const hide = (): void => {
    open = null;
    hideHeroSkillTip();
  };
  bar.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.hsk');
    if (cell && open !== cell) show(cell);
  });
  bar.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    const into = e.relatedTarget instanceof Element ? e.relatedTarget : null;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.hsk');
    if (cell && !(into && cell.contains(into))) hide();
  });
  bar.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.hsk');
    const was = open === cell;
    hide();
    if (cell && !was) show(cell);
  });
  // yeniden çizimde / pencere kapanınca asılı kalmasın
  hide();
}
