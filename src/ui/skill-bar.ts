/**
 * ORTAK skill hücresi (Ömer 2026-10-11, "evrensel"): savaş HUD'ının alt çubuğundaki skill düğmesi (ikon çerçevesi, sayı rozeti, ad, bedel /
 * cooldown satırı, üstünde açılan kit tooltip'i) ve pasif madalyonu. Savaş HUD'ı (src/ui/battle-hud.ts) görünümün asıl kaynağıdır; Gear /
 * Character sayfası aynı işaretlemeyi ve aynı CSS'i (src/ui/battle-hud.css: .bh-sk, .bh-medal, .bh-sktip, .bh-tt...) kullanır. Yalnızca HTML
 * üretir; davranış (seçme, hedefleme, kısayol) savaşta HUD'ın kendisinde, Gear'da yok.
 */

export const escHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const img = (url: string, cls = 'bh-ico') => (url ? `<img class="${cls}" src="${url}" alt="" draggable="false" >` : '');

/** Bedel / cooldown çipi (ikon + yazı + renk). */
export interface SkillCostChip {
  iconUrl?: string;
  text: string;
  color?: string;
}

/** Bir skill hücresinin görünümü (savaş: HudSkill; Gear: seçili kahramanın skill'i). */
export interface SkillCellView {
  id: string;
  name: string;
  iconUrl: string;
  /** Sol üst sayı rozeti (savaşta kısayol 1-4); yoksa rozet yok. */
  key?: number;
  cost: SkillCostChip[];
  /** Kalan cooldown (0 = hazır). */
  wait: number;
  enabled: boolean;
  selected: boolean;
  /** 4. yuva (ultimate) çerçevesi. */
  ult: boolean;
}

/**
 * Skill hücresinin HTML'i. `tipInner`: üstünde açılan kit tooltip'inin içi (battle-hud.ts > tipHtml); `extra`: adın / bedelin altına ek
 * (Gear: anahtar sayılar ve farkları); `cls`: ek sınıf.
 */
export function skillCellHtml(s: SkillCellView, tipInner: string, extra = '', cls = ''): string {
  return `<div class="bh-sk ${s.ult ? 'ult' : ''} ${s.wait > 0 ? 'cdn' : ''} ${s.selected ? 'sel' : ''} ${s.enabled ? '' : 'off'} ${cls}" data-skill="${escHtml(s.id)}">
          <div class="fr">${img(s.iconUrl)}${s.wait > 0 ? `<span class="cdv">${s.wait}</span>` : ''}${s.key !== undefined ? `<span class="key">${s.key}</span>` : ''}</div>
          <span class="nm">${escHtml(s.name)}</span>
          <span class="cost">${s.cost.length ? s.cost.map((c) => `<span style="${c.color ? `color:${c.color}` : ''}">${img(c.iconUrl ?? '')}${escHtml(c.text)}</span>`).join('') : '<span class="free">Free</span>'}</span>${extra}
          <div class="bh-sktip bh-panel bh-corners">${tipInner}</div>
        </div>`;
}

/** Pasif madalyonu (savaş: 4 skill'in solunda; Gear: skill satırının sonunda). `attrs`: ek öznitelikler (savaşta ipucu kaydı). */
export function passiveMedalHtml(iconUrl: string, attrs = ''): string {
  return `<div class="bh-medal lg" ${attrs}>${img(iconUrl)}</div>`;
}

/** Gear'daki pasif hücresi: savaştaki madalyon + "Passive" etiketi, skill hücresiyle aynı sırada; tooltip üstünde (`.bh-sktip`). */
export function passiveCellHtml(name: string, iconUrl: string, tipInner: string, extra = ''): string {
  return `<div class="bh-sk bh-sk-pasv" data-skill="passive">
          ${passiveMedalHtml(iconUrl)}
          <span class="nm">${escHtml(name)}</span>
          <span class="bh-pasv-n">Passive</span>${extra}
          <div class="bh-sktip bh-panel bh-corners">${tipInner}</div>
        </div>`;
}

// ---------------------------------------------------------------------------------------------------------------------
// SAVAŞ ALT ÇUBUĞU PLAKALARI (Ömer 2026-10-18, taslak public/mockups/battle-hud.html "A · Plates"): savaş HUD'ının skill / pasif plakası.
// Gear / Character sayfası bunu KULLANMAZ (yukarıdaki skillCellHtml / passiveCellHtml aynen kalır). Davranış kancaları aynı: `data-skill`,
// `.tip` (dokunmatik uzun basma), içteki `.bh-sktip` (üstte açılan A-Band ipucu).
// ---------------------------------------------------------------------------------------------------------------------

/** Bedel çipinin türü (plaka yetersiz kaynağı bu türdeki çipte kırmızı gösterir). */
export type SkillChipKind = 'mp' | 'rage' | 'hp' | 'cd';

export interface SkillPlateChip extends SkillCostChip {
  kind?: SkillChipKind;
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
  /** Yetersiz kaynak: bu türdeki bedel çipi kırmızı olur ("Not enough MP / Rage / HP"). */
  lack?: 'mp' | 'rage' | 'hp';
}

/** "RAGE 30" -> sözcük + sayı (telefonda sözcük gizlenir, ikon yeter); salt sayı -> yalnızca sayı. */
function plateChip(c: SkillPlateChip, lack: SkillPlateView['lack']): string {
  const m = /^(\D*?)\s*(\d+)$/.exec(c.text.trim());
  const word = m && m[1] ? `<span class="w">${escHtml(m[1])}</span>` : '';
  const num = m ? `<b>${escHtml(m[2]!)}</b>` : `<b>${escHtml(c.text)}</b>`;
  const kind = c.kind ?? (/^RAGE/i.test(c.text) ? 'rage' : '');
  const cls = [kind === 'rage' ? 'rage' : '', kind === 'cd' ? 'cd' : '', lack && kind === lack ? 'low' : ''].filter(Boolean).join(' ');
  return `<span class="bp-chip ${cls}">${img(c.iconUrl ?? '', 'bh-ico')}${word}${num}</span>`;
}

/** Skill plakası: köşe elmaslı ikon, numara, ad, bedel / bekleme çipleri; üstte açılan ipucu `tipInner`. */
export function skillPlateHtml(s: SkillPlateView, tipInner: string): string {
  const chips = s.cost.length ? s.cost.map((c) => plateChip(c, s.lack)).join('') : '<span class="bp-chip free">Free</span>';
  const tag = s.ult ? '<span class="bp-tag"><span class="full">Ultimate</span><span class="short">Ult</span></span>' : '';
  return `<div class="bp ${s.ult ? 'ult' : ''} ${s.wait > 0 ? 'cdn' : ''} ${s.selected ? 'sel' : ''} ${s.enabled ? '' : 'off'}" data-skill="${escHtml(s.id)}">
          ${tag}${s.key !== undefined ? `<span class="bp-key">${s.key}</span>` : ''}
          <div class="bp-ico">${img(s.iconUrl)}${s.wait > 0 ? `<span class="cdv">${s.wait}</span>` : ''}</div>
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
