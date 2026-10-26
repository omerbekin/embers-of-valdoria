/**
 * Sefer haritası gün sayacı (Ömer 2026-10-26, taslak public/mockups/day-counter-6.html #I3 + R5; Ömer: "ekranın sağına al, açılan kutunun tasarımı aynı olsun").
 * Valor bandının dili: koyu degrade şerit + ince altın kenar; Menu / tam ekran satırıyla aynı hizada, onların solunda. Tıklayınca şeridin altına AYNI
 * çerçeve ve dolguyla panel açılır (gün, ilerleme çubuğu, yaklaşan kartlar, Inn satırı). Esc, dışarı tıklama ya da şeride ikinci tıklama kapatır.
 * Veri: src/ui/day-counter-model.ts (sefer durumundan; örnek olay yok, kart yoksa kategori gizli). Yeni mekanik yok.
 */
import './day-counter.css';
import type { CampaignState } from '../campaign';
import { DAY_KIND_NAME, countdown, dayView, type DayView } from './day-counter-model';

const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export class DayCounter {
  readonly el: HTMLElement;
  private readonly band: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private key = '';
  private isOpen = false;
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !this.isOpen) return;
    e.preventDefault();
    e.stopPropagation(); // Esc önce paneli kapatır, oyun menüsünü açmaz
    this.close();
  };
  private readonly onDown = (e: PointerEvent): void => {
    if (this.isOpen && e.target instanceof Node && !this.el.contains(e.target)) this.close();
  };

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'dcn';
    this.band = document.createElement('button');
    this.band.type = 'button';
    this.band.className = 'dcn-band';
    this.band.setAttribute('aria-expanded', 'false');
    this.band.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    this.panel = document.createElement('div');
    this.panel.className = 'dcn-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Day');
    this.el.append(this.band, this.panel);
    root.append(this.el);
  }

  get opened(): boolean {
    return this.isOpen;
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.el.classList.add('open');
    this.band.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', this.onKey, true);
    document.addEventListener('pointerdown', this.onDown, true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('open');
    this.band.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', this.onKey, true);
    document.removeEventListener('pointerdown', this.onDown, true);
  }

  /** Durumdan yeniden çizer (yalnız görünür veri değiştiyse); `hidden`: başka pencere / menü açıkken gizle ve paneli kapat. */
  sync(s: CampaignState, hidden: boolean): void {
    if (this.el.hidden !== hidden) this.el.hidden = hidden;
    if (hidden) {
      this.close();
      return;
    }
    const v = dayView(s);
    const key = JSON.stringify(v);
    if (key === this.key) return;
    this.key = key;
    this.render(v);
  }

  private render(v: DayView): void {
    const pips = Array.from({ length: v.per }, (_, i) => `<i${i < v.steps ? ' class="on"' : ''}></i>`).join('');
    this.band.innerHTML = `<span class="dcn-num">${v.day}</span><span class="dcn-tx"><span class="dcn-lbl">Day<span class="dcn-pips">${pips}</span></span><span class="dcn-next">${esc(v.next)}</span></span>`;
    const cards = v.entries
      .map((e) => {
        const c = countdown(e.inDays);
        return `<div class="dcn-card k-${e.kind}"><i class="dia"></i><div class="cx"><div class="kd">${DAY_KIND_NAME[e.kind]}</div><h4>${esc(e.title)}</h4><p>${esc(e.sub)}</p></div><div class="cn">${c.n}<small>${c.unit}</small></div></div>`;
      })
      .join('');
    const inn = v.innGuests > 0 ? `<div class="dcn-inn"><i class="dia"></i><span>Inn: ${v.innGuests} ${v.innGuests === 1 ? 'hero heals' : 'heroes heal'} at dawn</span></div>` : '';
    this.panel.innerHTML = `<div class="dcn-cap">Coming up</div><div class="dcn-nx"><span class="dcn-big">Day ${v.day}</span><span class="dcn-bar" style="--f:${v.steps / v.per}"><i></i></span><span class="dcn-pr">${v.steps}/${v.per}</span></div>${cards}${inn}<div class="dcn-ft">${esc(v.foot)}</div>`;
  }

  destroy(): void {
    this.close();
    this.el.remove();
  }
}
