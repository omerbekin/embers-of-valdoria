// Savaşta skill biçimi seçim paneli (skill ağacı Faz 8; Ömer 2026-10-23 mockup tree-choices V2): skill düğmesinin üstünde küçük kart paneli
// (Paladin Radiance: "Radiance" / "Focused Beam"; Gambler Card Trick: Slow / Wound / Stun) + hedef seçerken "Choose an enemy" şeridi.
// Yalnızca DOM; motoru bilmez (BattleScene kartları ve geri çağrıları verir). Görünüm savaş HUD'ının dili (bh-panel, Cinzel ad, düz Garamond metin).
import './skill-choice.css';
import { uiSound } from './ui-sound';

export interface SkillChoiceCard {
  /** Geri çağrıya giden anahtar (biçim id'si; '' = skill'in kendi biçimi). */
  key: string;
  name: string;
  text: string;
  /** Küçük ek satır (ör. "First target only"). */
  note?: string;
  iconUrl?: string;
  /** İkonun üstüne nişangâh (tek hedef seçtiren biçim). */
  aim?: boolean;
  /** Kart rengi vurgusu (durum rengi). */
  accent?: string;
}

export interface SkillChoiceOpts {
  /** Panelin çocuğu olacağı kök (savaş HUD'ı kökü; konum bu kökün oyun birimlerinde). */
  host: HTMLElement;
  /** Panelin üstünde durduğu skill plakası. */
  anchor: HTMLElement;
  /** Kartların üstündeki kısa satır (yoksa yok). */
  title?: string;
  cards: SkillChoiceCard[];
  onPick: (key: string) => void;
  /** Esc, panel dışına dokunma ya da aynı düğmeye yeniden basma (çağıran kapatır). */
  onCancel: () => void;
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** `el`'in `host` içindeki konumu (offset zinciri: dönüşüm / ölçek / döndürülmüş sahne etkilemez). */
function offsetIn(el: HTMLElement, host: HTMLElement): { x: number; y: number; w: number; h: number } {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== host) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Açık panel (tek seferde bir tane). */
export class SkillChoicePanel {
  readonly el: HTMLDivElement;
  private readonly offDoc: () => void;
  private closed = false;

  constructor(private readonly o: SkillChoiceOpts) {
    const el = document.createElement('div');
    el.className = 'sc-pop bh-panel bh-corners';
    el.innerHTML =
      (o.title ? `<div class="sc-head">${esc(o.title)}</div>` : '') +
      `<div class="sc-cards">${o.cards
        .map(
          (c, i) => `<button type="button" class="sc-card" data-key="${esc(c.key)}" style="--i:${i}${c.accent ? `;--acc:${esc(c.accent)}` : ''}">
            <span class="sc-ico${c.aim ? ' aim' : ''}">${c.iconUrl ? `<img src="${esc(c.iconUrl)}" alt="" draggable="false">` : ''}</span>
            <span class="sc-nm">${esc(c.name)}</span>
            <span class="sc-tx">${esc(c.text)}</span>
            ${c.note ? `<span class="sc-nt">${esc(c.note)}</span>` : ''}
          </button>`,
        )
        .join('')}</div><i class="sc-arrow"></i>`;
    o.host.append(el);
    this.el = el;
    this.place();
    // Fare bırakması alttaki Phaser sahnesine gitmesin (BattleHud ile aynı)
    el.addEventListener('mouseup', (e) => e.preventDefault());
    el.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.sc-card');
      if (!card || this.closed) return;
      e.stopPropagation();
      uiSound('select');
      this.o.onPick(card.dataset['key'] ?? '');
    });
    // Panel ve skill düğmesi dışına dokunma = vazgeç (düğmeye dokunmayı BattleScene kendi işler: aynı düğme kapatır, başka düğme yeni seçim)
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (this.closed || (t && (el.contains(t) || this.o.anchor.contains(t)))) return;
      if (t instanceof HTMLElement && t.closest('[data-skill]')) return;
      this.o.onCancel();
    };
    document.addEventListener('pointerdown', onDoc, true);
    this.offDoc = () => document.removeEventListener('pointerdown', onDoc, true);
  }

  /** Skill düğmesinin üstüne ortalar; kökün kenarlarından taşmaz; ok düğmenin ortasını gösterir. */
  place(): void {
    const a = offsetIn(this.o.anchor, this.o.host);
    const hostW = this.o.host.offsetWidth || 1920;
    const w = this.el.offsetWidth;
    const left = Math.max(12, Math.min(hostW - 12 - w, a.x + a.w / 2 - w / 2));
    this.el.style.left = `${left}px`;
    this.el.style.top = `${a.y - this.el.offsetHeight - 22}px`;
    this.el.style.setProperty('--ax', `${a.x + a.w / 2 - left}px`);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.offDoc();
    this.el.remove();
  }
}

/** Hedef seçme şeridi (Focused Beam: "Choose an enemy"): skill çubuğunun üstünde ortada; Cancel düğmesi dokunmatik için. */
export class SkillChoicePrompt {
  readonly el: HTMLDivElement;

  constructor(host: HTMLElement, title: string, text: string, onCancel: () => void) {
    const el = document.createElement('div');
    el.className = 'sc-prompt bh-panel';
    el.innerHTML = `<span class="sc-pn">${esc(title)}</span><span class="sc-pt">${esc(text)}</span><button type="button" class="sc-cancel">Cancel</button>`;
    el.addEventListener('mouseup', (e) => e.preventDefault());
    el.querySelector('.sc-cancel')!.addEventListener('click', (e) => {
      e.stopPropagation();
      uiSound('back');
      onCancel();
    });
    host.append(el);
    this.el = el;
  }

  close(): void {
    this.el.remove();
  }
}
