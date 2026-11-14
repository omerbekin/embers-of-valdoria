/**
 * Kahraman bilgi kartı (Ömer 2026-11-11, "Sheet"): portre solda; yanında ad + Lv, çipler (rol, menzil; ana stat çipi yok, ana stat zaten vurgulu),
 * HP / MP çubukları, yassı stat şeridi (tek satır: ikon + sayı), altında skill madalyonları. Her stata Band ipucu bağlanır (`bindHeroCardTips`).
 * Seçici (hero-picker.ts) kullanır; stil src/ui/hero-picker.css (`.hc`).
 */
import { content } from '../engine';
import { classBoardHero } from '../game/scene-board';
import { statImage } from '../game/icon-image-files';
import { avatarUrl } from './character-panel';
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
  root.querySelectorAll<HTMLElement>('.hc .stats [data-stat]').forEach((n) => {
    const k = n.dataset['stat'] ?? '';
    attachBandTip(n, () => {
      const info = statTip(k, st);
      return info ? statBandSpec(k, info) : null;
    });
  });
}
