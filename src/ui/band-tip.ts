// TOOLTIP = "A - BAND" (Ömer 2026-10-18: "sonraki benzer şeylerde bu tasarım dilini kullan"). DOM tarafının TEK ipucu bileşeni:
// ikon solda, renkli başlık şeridi, değer sağda; üstte tür etiketi, Cinzel başlık, altın çizgi + ortada elmas ayırıcı, elmas madde işareti,
// anahtar kelime vurgu renginde + rakamlar altın, çipler (hedef / element / menzil / maliyet / durum), alt bilgi çubuğu.
// Stil: band-tip.css (`.bt`); Phaser eşi: src/game/band-tip.ts. Metni değiştirmez, yalnızca görünümü kurar (ayrıştırma: band-rich.ts).
// Item ipucu (item-tip.ts, v3) ayrıdır ve bu bileşene bağlanmaz.
import './band-tip.css';
import { richSegs, splitNow, type RichSeg } from './band-rich';

export interface BandChip {
  text: string;
  /** Çipin başındaki küçük ikon (data URL / dosya). */
  icon?: string;
  /** ac = vurgu rengi (element), v = değerli çip (sayı altın), ok / warn / free = durum. */
  tone?: 'ac' | 'v' | 'ok' | 'warn' | 'free';
  /** Yazı rengi (element gibi kendi rengi olan etiket). */
  color?: string;
  /** Çip 'v' ise değerin kalın altın kısmı ("14" + " MP"). */
  num?: string;
  /** Yalnızca ikon + sayı (sözcük yok: skill ipucu V2 çipleri: menzil / bedel / bekleme); `text` boş kalır, tam anlam `tip`te. */
  bare?: boolean;
  /** Üstüne gelince / odakta / dokununca küçük balon ve ekran okuyucu metni ("Range 6", "Costs 14 MP", "Cooldown: 2 turns"). */
  tip?: string;
}

export interface BandLine {
  text: string;
  /** Satır rengi: etiketli satırda anahtar kelimeyi, etiketsizde tüm satırı boyar (element / uyarı rengi). */
  color?: string;
  icon?: string;
  /** Sağdaki çip ("now 84"); verilmezse metindeki "(now N)" ayrılır. */
  now?: string;
}

export interface BandGrid {
  cols: number;
  rows: number;
  cells: Array<{ col: number; row: number; on: boolean; anchor?: boolean; stage?: number; hits?: number }>;
}

export interface BandTipSpec {
  /** Vurgu rengi (CSS rengi): element / durum / nadirlik. Verilmezse altın. */
  accent?: string;
  kind?: string;
  title: string;
  /** Başlığın altında tek düz satır ("Primary: 35% chance ..."): "Etiket:" altın, rakamlar altın. */
  sub?: string;
  /** Başlık rengi (verilmezse vurgunun açık tonu). */
  titleColor?: string;
  icon?: string;
  iconShape?: 'frame' | 'round' | 'portrait';
  /** Portre madalyası yatay çevrilir (düşman). */
  iconFlip?: boolean;
  /** Başlığın sağındaki büyük değer (stat: "18"; kahraman: "Lv 3"). */
  value?: string;
  valueLabel?: string;
  valueColor?: string;
  /** Değerin altında renkli fark ("+2" yeşil / "-3" kırmızı: Gear karşılaştırması). */
  valueDiff?: { text: string; dir: 'up' | 'down' };
  grid?: BandGrid | null;
  chips?: BandChip[];
  lines?: BandLine[];
  foot?: string;
  /** Satırların yerine/yanına özel HTML (kahraman madalyası gibi) gövdeye eklenir. */
  bodyHtml?: string;
  /** Satırlarda anahtar kelime bulunmaz (yalnızca rakam / fark vurgusu). */
  noKeywords?: boolean;
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const css = (c: string): string => c.replace(/[;"<>]/g, '');
const img = (url: string): string => (url ? `<img src="${esc(url)}" alt="" draggable="false">` : '');

/** Satırı renkli parçalarıyla HTML'e çevirir (anahtar kelime vurgu rengi ya da `color`; rakam altın; fark yeşil / kırmızı). */
export function bandRichHtml(text: string, color?: string, keyword = true): string {
  const segs: RichSeg[] = richSegs(text, keyword);
  const hasKey = segs.some((s) => s.kind === 'k');
  const body = segs
    .map((s) => {
      const t = esc(s.text);
      if (s.kind === 'k') return `<span class="k"${color ? ` style="color:${css(color)}"` : ''}>${t}</span>`;
      if (s.kind === 'n') return `<span class="n">${t}</span>`;
      if (s.kind === 'up' || s.kind === 'down') return `<span class="${s.kind}">${t}</span>`;
      return t;
    })
    .join('');
  return color && !hasKey ? `<span style="color:${css(color)}">${body}</span>` : body;
}

function chipHtml(c: BandChip): string {
  const style = c.color ? ` style="color:${css(c.color)}"` : '';
  const inner = c.bare ? `<span class="n">${esc(c.num ?? c.text)}</span>` : c.tone === 'v' && c.num ? `<span class="n">${esc(c.num)}</span> ${esc(c.text)}` : esc(c.text);
  const tip = c.tip ? ` data-tip="${esc(c.tip)}" aria-label="${esc(c.tip)}" tabindex="0"` : '';
  return `<span class="bt-chip${c.tone ? ` ${c.tone}` : ''}${c.bare ? ' q' : ''}"${style}${tip}>${img(c.icon ?? '')}${inner}</span>`;
}

function gridHtml(g: BandGrid): string {
  const cells = g.cells
    .map((c) => `<i class="${c.on ? 'on' : ''}${c.anchor ? ' an' : ''}" style="grid-column:${c.col + 1};grid-row:${c.row + 1};${c.on && c.stage && c.stage > 1 ? `opacity:${Math.max(0.4, 1 - 0.3 * (c.stage - 1))}` : ''}">${c.hits && c.hits > 1 ? c.hits : ''}</i>`)
    .join('');
  return `<span class="bt-grid" style="grid-template-columns:repeat(${g.cols},auto);grid-template-rows:repeat(${g.rows},auto)">${cells}</span>`;
}

/** Başlık altı satırı: baştaki "Primary:" etiketi altın, rakamlar altın, gerisi düz. */
function subHtml(t: string): string {
  const m = /^([^:]+:)\s*(.*)$/.exec(t);
  return `<div class="bt-sub">${m ? `<span class="pl">${esc(m[1]!)}</span> ${bandRichHtml(m[2]!, undefined, false)}` : bandRichHtml(t, undefined, false)}</div>`;
}

/** İpucunun iç HTML'i (`.bt` kökü dahil). Konumlama çağıranda; kök kendi çerçevesini taşır. */
export function bandTipHtml(s: BandTipSpec): string {
  const medal = s.icon ? `<span class="bt-medal ${s.iconShape === 'round' ? 'round' : s.iconShape === 'portrait' ? 'por' : 'ico frm'}" style="background-image:url(&quot;${esc(s.icon)}&quot;)${s.iconFlip ? ';transform:scaleX(-1)' : ''}"></span>` : '';
  const aside = [s.grid ? gridHtml(s.grid) : '', s.value !== undefined ? `<div class="bt-big"${s.valueColor ? ` style="color:${css(s.valueColor)}"` : ''}>${esc(s.value)}${s.valueLabel || s.valueDiff ? `<small>${esc(s.valueLabel ?? '')}${s.valueDiff ? ` <span class="${s.valueDiff.dir}">(${esc(s.valueDiff.text)})</span>` : ''}</small>` : ''}</div>` : ''].join('');
  const head = `<div class="bt-head">${medal}<div class="bt-ht">${s.kind ? `<div class="bt-kind">${esc(s.kind)}</div>` : ''}<div class="bt-title"${s.titleColor ? ` style="color:${css(s.titleColor)}"` : ''}>${esc(s.title)}</div>${s.sub ? subHtml(s.sub) : ''}</div>${aside ? `<div class="bt-aside">${aside}</div>` : ''}</div>`;
  const chips = s.chips && s.chips.length ? `<div class="bt-meta">${s.chips.map(chipHtml).join('')}</div>` : '';
  const lines = (s.lines ?? [])
    .map((l) => {
      const sp = l.now === undefined ? splitNow(l.text) : { text: l.text, now: l.now };
      const lead = l.icon ? img(l.icon) : '<span class="dia"></span>';
      const txt = `${lead}<div class="tx">${bandRichHtml(sp.text, l.color, !s.noKeywords)}</div>`;
      // durum çipi ("now 3% ; max 75%"): metin + elmas ayrı bir kapta; çip sığmazsa satırın sonuna, kendi satırında sağa hizalı iner (metni bölmez)
      return sp.now
        ? `<div class="bt-ln has-now"><div class="main">${txt}</div><span class="now bt-chip v">${bandRichHtml(sp.now, undefined, false)}</span></div>`
        : `<div class="bt-ln">${txt}</div>`;
    })
    .join('');
  const body = lines || s.bodyHtml ? `<div class="bt-div"></div><div class="bt-body">${lines}${s.bodyHtml ?? ''}</div>` : '';
  const foot = s.foot ? `<div class="bt-foot"><span class="dia"></span><span class="tx">${esc(s.foot)}</span></div>` : '';
  const ac = s.accent ? ` style="--ac:${css(s.accent)}"` : '';
  return `<div class="bt"${ac}>${head}${chips}${body}${foot}</div>`;
}

/** Aynı ipucu DOM düğümü olarak. */
export function bandTipEl(s: BandTipSpec): HTMLElement {
  const t = document.createElement('div');
  t.innerHTML = bandTipHtml(s);
  return t.firstElementChild as HTMLElement;
}

/** Kahraman madalyası altındaki 7 yuvalık elmas sırası (dolu / boş). */
export function bandPipsHtml(filled: number, total: number): string {
  return `<span class="bt-pips">${Array.from({ length: total }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('')}</span>`;
}
