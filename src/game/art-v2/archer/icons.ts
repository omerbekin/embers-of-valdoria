/**
 * Archer - SÜRÜM 2 İKONLARI. Kılavuz: docs/design/art-v2.md
 *
 * Karakter referansı (assets/sprites/archer/idle.png): yeşil kukuletalı korucu, sade ahşap UZUN YAY (pirinç kavrama halkası),
 * sırtta beyaz-kahve tüylü oklarla dolu sadak, deri kolluk/kemer. Silahı tek: yay ve ok. Bu yüzden tüm ikonlar ok/yayın kendisinden
 * ve okun yaptığı işten (hız, delip geçme, gökten yağma, zırh kırma, uzak menzil) kurulur; büyü ışığı yok, malzeme gerçek:
 * ahşap gövde ('n' açık meşe, 'b' kahve), çelik uç ('l'/'m'), tüy ('w' beyaz + 'a' vurgu), sicim/deri ('k').
 *
 * Bu class'ın v1 ikon adları (ICONS anahtarları): bow (logo), sharp (pasif Sharpshooter), arrow (Quick Shot), pierce (Piercing Arrow),
 * arrows (Arrow Rain), aimedshot (Aimed Shot).
 * SPRITES: v2 efektlerinin (vfx.ts) ok, kıymık, zırh parçası çizimleri.
 */
import type { V2SpriteEntry } from '../types';
import type { PxGrid } from '../../pixel-art';

type P = [number, number];

/** Okun kendisi: kuyruk (x0,y0) -> uç (x1,y1). Gövde, geniş çelik uç, sicim bağı, üç tüy, gez. */
function arrow(g: PxGrid, x0: number, y0: number, x1: number, y1: number, o: { sw?: number; hl?: number; hw?: number; fl?: number; fw?: number; vane?: [string, string]; head?: [string, string] } = {}): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const dx = (x1 - x0) / len;
  const dy = (y1 - y0) / len;
  const nx = -dy;
  const ny = dx;
  const sw = o.sw ?? 1.2; // gövde kalınlığı
  const hl = o.hl ?? 4.6; // uç boyu
  const hw = o.hw ?? 2.1; // uç yarı genişliği
  const fl = o.fl ?? 6; // tüy boyu
  const fw = o.fw ?? 1.9; // tüy genişliği
  const [v1, v2] = o.vane ?? ['w', 'a'];
  const [h1, h2] = o.head ?? ['l', 'm'];
  const at = (k: number, side = 0): P => [x0 + dx * k + nx * side, y0 + dy * k + ny * side];
  // tüyler (gövdenin iki yanında; arkası kesik, önü inceltilmiş)
  const f0 = 0.9;
  const f1 = f0 + fl;
  for (const [s, c] of [[1, v1], [-1, v2]] as Array<[number, string]>) {
    const a = at(f0, s * fw);
    const b = at(f0 + fl * 0.35, s * fw * 1.05);
    const e = at(f1, s * 0.35);
    const r = at(f1 - 0.5, 0);
    const q = at(f0, 0);
    g.poly([q[0], q[1], a[0], a[1], b[0], b[1], e[0], e[1], r[0], r[1]], c);
    // tüy dikişi (barbs): ince koyu çizgiler
    for (let k = 1; k < 4; k++) {
      const m0 = at(f0 + (fl * k) / 4.5, s * 0.3);
      const m1 = at(f0 + (fl * k) / 4.5 - 0.9, s * fw * 0.85);
      g.line(m0[0], m0[1], m1[0], m1[1], c === 'w' ? 'l' : 'A', 0.25);
    }
  }
  // gövde
  const s0 = at(0.2);
  const s1 = at(len - hl * 0.7);
  g.line(s0[0], s0[1], s1[0], s1[1], 'n', sw);
  const g0 = at(f1 + 0.4, sw * 0.32);
  const g1 = at(len - hl * 0.9, sw * 0.32);
  g.line(g0[0], g0[1], g1[0], g1[1], 'b', Math.max(0.25, sw * 0.28)); // ahşap damarı
  // gez (nock) ve tüy bağı
  const nk = at(0);
  g.line(nk[0], nk[1], at(0.9)[0], at(0.9)[1], 'k', sw * 1.1);
  const tb = at(f1 + 0.1);
  g.line(tb[0], tb[1], at(f1 + 0.8)[0], at(f1 + 0.8)[1], 'k', sw * 1.15);
  // uç bağı ve geniş uç
  const hb = at(len - hl - 0.7);
  g.line(hb[0], hb[1], at(len - hl + 0.1)[0], at(len - hl + 0.1)[1], 'k', sw * 1.25);
  const tip = at(len);
  const bl = at(len - hl, hw);
  const br = at(len - hl, -hw);
  const notch = at(len - hl * 0.72);
  g.poly([tip[0], tip[1], bl[0], bl[1], notch[0], notch[1], br[0], br[1]], h2);
  g.poly([tip[0], tip[1], bl[0], bl[1], notch[0], notch[1]], h1);
  const ridge0 = at(len - hl * 0.7);
  g.line(ridge0[0], ridge0[1], at(len - 0.6)[0], at(len - 0.6)[1], 'w', 0.25);
}

/** Dönüşümlü çizim: (x,y)'yi merkez etrafında açı + ölçekle çevirir. */
const xf = (cx: number, cy: number, ang: number, s = 1) => (x: number, y: number): P => {
  const dx = (x - cx) * s;
  const dy = (y - cy) * s;
  return [cx + dx * Math.cos(ang) - dy * Math.sin(ang), cy + dx * Math.sin(ang) + dy * Math.cos(ang)];
};

/** İkinci dereceden Bézier boyunca kalınlığı değişen çizgi (yay kolu). */
function limb(g: PxGrid, p0: P, p1: P, p2: P, w0: number, w1: number, t: string, steps = 26): void {
  const pt = (u: number): P => [(1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]];
  for (let i = 0; i < steps; i++) {
    const a = pt(i / steps);
    const b = pt((i + 1) / steps);
    const u = (i + 0.5) / steps;
    const w = w0 + (w1 - w0) * (1 - Math.abs(u - 0.5) * 2); // ortada (kavrama) kalın
    g.line(a[0], a[1], b[0], b[1], t, w);
  }
}

export const ICONS: Record<string, V2SpriteEntry> = {
  // ChatGPT boyalı ikonlar (assets/source/class-icons/archer-sheet.png -> python tools/make-class-icons.py archer ...); eski kodla çizimler kaldırıldı.
  arrow: { image: 'archer/arrow' },
  pierce: { image: 'archer/pierce' },
  arrows: { image: 'archer/arrows' },
  aimedshot: { image: 'archer/aimedshot' },
  sharp: { image: 'archer/sharp' },
  /**
   * LOGO (bow): tam gerilmiş uzun yay + gezde ok, çapraz (ok sağ üste bakar). Sprite'taki gibi sade ahşap kol, pirinç halkalı deri kavrama.
   * 15-26 px'te de okunsun diye kol kalın, ok tek ve uzun.
   */
  bow: (g) => {
    const T = xf(16, 16, -Math.PI / 4, 0.9);
    const L = (x0: number, y0: number, x1: number, y1: number, t: string, w: number) => {
      const a = T(x0, y0);
      const b = T(x1, y1);
      g.line(a[0], a[1], b[0], b[1], t, w * 0.9);
    };
    // kiriş: uçlardan gerilmiş gez noktasına
    L(9, 3, 4.5, 16, 'e', 0.75);
    L(9, 29, 4.5, 16, 'e', 0.75);
    // yay kolları (Bézier): kavramada kalın, uçlara incelir
    limb(g, T(9, 3), T(25, 16), T(9, 29), 1.5, 3.0, 'b');
    limb(g, T(9.6, 3.6), T(24, 16), T(9.6, 28.4), 0.25, 0.9, 'n'); // kolun iç yüzü (açık ahşap)
    // recurve uçlar
    L(9, 3, 11.2, 1.6, 'b', 1.4);
    L(9, 29, 11.2, 30.4, 'b', 1.4);
    // ok (gezden uca)
    const a = T(4.5, 16);
    const b = T(30, 16);
    arrow(g, a[0], a[1], b[0], b[1], { sw: 1.3, hl: 4.4, hw: 2.2, fl: 5.2, fw: 1.9, vane: ['w', 'a'] });
    // deri kavrama + pirinç halkalar (sprite'taki gibi)
    L(16.2, 13.6, 16.2, 18.4, 'k', 2.9);
    L(16.2, 13.4, 16.2, 13.9, 'y', 3.1);
    L(16.2, 18.1, 16.2, 18.6, 'y', 3.1);
  },

  /**
   * PASİF Sharpshooter (uzak sıradaki hedefe daha çok hasar): uzak bir saman hedefin tam ortasına saplanmış ok; ok yolunun altında
   * üç mesafe kazığı, uzaklaştıkça boyu ve parlaklığı artıyor (mesafe = hasar). Hedef yeşil vurgu halkalı.
   */

  /**
   * QUICK SHOT (tek hedef + kendine Haste): tek ok, sağ üste çok hızlı uçuyor; arkasında üç hava çizgisi ve tüylerin iki silik
   * art görüntüsü (çabukluk/Haste). Ucunda küçük hava kıvılcımı.
   */

  /**
   * PIERCING ARROW (sütun, önden arkaya delip geçer, her delişte güç kaybı): ağır ok iki kalın ahşap kalkanı arka arkaya delip
   * çıkıyor; her kalkanın çıkış yüzünden kıymıklar saçılıyor, ikincide daha az (falloff). Ok ucu çeliği parlak, gövdesi uzun.
   */

  /**
   * ARROW RAIN (3x3 alan, gökten): yere yatık 3x3 hücreli toprak plaka; üstüne dik açıyla yağan oklar. Üçü düşüyor (arkalarında hava
   * çizgisi), dördü toprağa saplanmış (uçları gömülü, yalnızca gövde ve tüy görünür) ve dibinde toz.
   */

  /**
   * AIMED SHOT (tek hedef, dev hasar, zırhın yarısını yok sayar): çelik göğüs plakası tam ortadan delinmiş ve çatlamış, ok saplı;
   * dört köşede altın nişan köşebentleri + ince artı (uzun nişan), plakadan kopan parçalar.
   */
};

export const SPRITES: Record<string, V2SpriteEntry> = {
  /** Uçan ok (yatay, uç SAĞDA): efektte gerçek uçuş açısına döndürülür. 128 ince piksel; 0..32 mantıksal. */
  arrow: (g) => arrow(g, 1.5, 16, 30.5, 16, { sw: 1.25, hl: 4.6, hw: 2.1, fl: 6.4, fw: 2.1, vane: ['w', 'a'] }),
  /** Ağır ok (Piercing / Aimed): daha kalın gövde, iri uç, kırmızı tüy. */
  arrowheavy: (g) => arrow(g, 1, 16, 31, 16, { sw: 1.6, hl: 5.8, hw: 2.8, fl: 7, fw: 2.5, vane: ['w', 'r'] }),
  /** Saplanmış ok (uç yok: hedefte/toprakta gömülü), yatay, gömülen uç SAĞDA. */
  arrowstuck: (g) => arrow(g, 9, 16, 31.5, 16, { sw: 1.25, hl: 0.1, hw: 0.1, fl: 6.4, fw: 2.1, vane: ['w', 'a'] }),
  /** Ahşap kıymık. */
  splinter: { size: 64, draw: (g) => {
    g.poly([6, 18, 26, 12, 28, 14.5, 8, 20.5], 'n');
    g.line(9, 18.6, 24, 14, 'b', 0.6);
  } },
  /** Çelik zırh kırığı (Aimed Shot). */
  plateshard: { size: 64, draw: (g) => {
    g.poly([6, 10, 24, 6, 27, 18, 14, 27, 5, 20], 'm');
    g.poly([6, 10, 24, 6, 15, 15, 5, 20], 'l');
    g.line(8, 11, 22, 7.5, 'w', 0.7);
  } },
  /** Toz/çim tutamı (ok yere saplanınca). */
  dirt: { size: 64, outline: false, draw: (g) => {
    g.disc(16, 18, 6, 'b').disc(11, 20, 4, 'k').disc(21, 19, 4.5, 'n').disc(15, 15, 3, 'n');
  } },
};
