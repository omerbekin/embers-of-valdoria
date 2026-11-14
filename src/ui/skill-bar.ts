/**
 * Savaş alt çubuğu skill / pasif plakaları (HTML üretir; davranış battle-hud.ts'te). Gear / Character sayfası aynı CSS'i (battle-hud.css:
 * .bh-sk, .bh-medal, .bh-sktip...) kullanır. (Eski skillCellHtml / passiveCellHtml ölü kodu 2026-11-09'da silindi.)
 */

import { lockBadgeHtml } from './skill-lock';

export const escHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const img = (url: string, cls = 'bh-ico') => (url ? `<img class="${cls}" src="${url}" alt="" draggable="false" >` : '');

/** Bedel / cooldown çipi (ikon + yazı + renk). */
export interface SkillCostChip {
  iconUrl?: string;
  text: string;
  color?: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// SAVAŞ ALT ÇUBUĞU PLAKALARI (Ömer 2026-10-18, taslak public/mockups/battle-hud.html "A · Plates"): savaş HUD'ının skill / pasif plakası.
// Gear / Character sayfası kendi plakasını kullanır (character-panel.ts > plateHtml). Davranış kancaları: `data-skill`,
// `.tip` (dokunmatik uzun basma), içteki `.bh-sktip` (üstte açılan A-Band ipucu).
// ---------------------------------------------------------------------------------------------------------------------

/** Bedel çipinin türü (plaka yetersiz kaynağı bu türdeki çipte kırmızı gösterir). */
export type SkillChipKind = 'mp' | 'rage' | 'hp' | 'cd';

export interface SkillPlateChip extends SkillCostChip {
  kind?: SkillChipKind;
  /** Etkiyle (durum, boss fazı, item) temel değere göre arttı (kırmızı) / azaldı (yeşil). */
  dir?: 'up' | 'down';
}

export interface SkillPlateView {
  id: string;
  name: string;
  iconUrl: string;
  key?: number;
  cost: SkillPlateChip[];
  wait: number;
  enabled: boolean;
  selected: boolean;
  ult: boolean;
  /** Kilitli skill: ikonun üstünde kilit simgesi. */
  locked?: boolean;
  /** Susturulmuş (Silenced): MP bedelli skill kapalı; ikonun üstünde "Silenced" yazısı, plaka kilitli gibi sönük. */
  silenced?: boolean;
  /** Düşman turu: plaka sönük ('off') ve tıklanmaz; imleç ipucu verir (hover ipucu okunur kalır). */
  foe?: boolean;
  /** Yetersiz kaynak: bu türdeki bedel çipi kırmızı olur ("Not enough MP / Rage / HP"). */
  lack?: 'mp' | 'rage' | 'hp';
}

/** "RAGE 30" -> sözcük + sayı (telefonda sözcük gizlenir, ikon yeter); salt sayı -> yalnızca sayı. */
function plateChip(c: SkillPlateChip, lack: SkillPlateView['lack']): string {
  const m = /^(\D*?)\s*(\d+)$/.exec(c.text.trim());
  const word = m && m[1] ? `<span class="w">${escHtml(m[1])}</span>` : '';
  const num = m ? `<b>${escHtml(m[2]!)}</b>` : `<b>${escHtml(c.text)}</b>`;
  const kind = c.kind ?? (/^RAGE/i.test(c.text) ? 'rage' : '');
  const cls = [kind === 'rage' ? 'rage' : '', kind === 'cd' ? 'cd' : '', lack && kind === lack ? 'low' : '', c.dir ?? ''].filter(Boolean).join(' ');
  return `<span class="bp-chip ${cls}">${img(c.iconUrl ?? '', 'bh-ico')}${word}${num}</span>`;
}

/** Skill plakası: köşe elmaslı ikon, numara, ad, bedel / bekleme çipleri; üstte açılan ipucu `tipInner`. */
export function skillPlateHtml(s: SkillPlateView, tipInner: string): string {
  const chips = s.cost.length ? s.cost.map((c) => plateChip(c, s.lack)).join('') : '<span class="bp-chip free">Free</span>';
  const tag = s.ult ? '<span class="bp-tag"><span class="full">Ultimate</span><span class="short">Ult</span></span>' : '';
  return `<div class="bp ${s.ult ? 'ult' : ''} ${s.wait > 0 ? 'cdn' : ''} ${s.selected ? 'sel' : ''} ${s.foe ? 'foe off' : s.enabled ? '' : 'off'}${s.silenced ? ' off' : ''}" data-skill="${escHtml(s.id)}">
          ${tag}${s.key !== undefined ? `<span class="bp-key">${s.key}</span>` : ''}
          <div class="bp-ico">${img(s.iconUrl)}${s.wait > 0 && !s.locked && !s.silenced ? `<span class="cdv">${s.wait}</span>` : ''}${s.locked ? lockBadgeHtml() : ''}${s.silenced && !s.locked ? '<span class="bp-sil">Silenced</span>' : ''}</div>
          <span class="bp-nm">${escHtml(s.name)}</span>
          <div class="bp-chips">${chips}</div>
          <div class="bh-sktip bh-panel bh-corners">${tipInner}</div>
        </div>`;
}

/** Pasif plakası (4 skill'in solunda): "Passive" şeridi, ikon, ad; `attrs` = ipucu kaydı, `extra` = köşe rozeti (Lucky Escape). */
export function passivePlateHtml(name: string, iconUrl: string, attrs = '', extra = ''): string {
  return `<div class="bp pas" ${attrs}>
          <span class="bp-tag"><span class="full">Passive</span><span class="short">Pas</span></span>
          <div class="bp-ico">${img(iconUrl)}</div>
          <span class="bp-nm">${escHtml(name)}</span>
          <div class="bp-chips"></div>${extra}
        </div>`;
}
