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
