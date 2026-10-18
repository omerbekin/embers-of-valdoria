/**
 * Undead - SÜRÜM 2 İKONLARI. Kılavuz: docs/design/art-v2.md
 *
 * Karakter referansı (assets/sprites/undead/idle.png): kukuletalı lich; mor + kömür grisi yırtık cübbe, kemik kafatası, TURKUAZ
 * yanan gözler, avucunda turkuaz ruh ateşi, asasında turkuaz kristal. Skeleton (çağrı): paslı kısa kılıç + yuvarlak ahşap kalkan,
 * turkuaz gözler. v2 görsel dili: "turkuaz ruh ateşi + mezar moru + kemik". Palette turkuaz jeton yok: 'c' (buz mavisi) ile 'g'
 * (yeşil) dama deseniyle karıştırılır (uzaktan nane-turkuaz okunur).
 *
 * Bu class'ın v1 ikon adları (ICONS anahtarları): skull, soul, darkbond, bonethrow, wail, raise, bone, boneslash
 *  - skull: Undead logosu + Skeleton logosu (kukuletalı lich kafatası)
 *  - soul: Vampiric Bite pasifi: ısıran dişler + kan kalbi + içinde ruh
 *  - darkbond: Dark Bond skill'i (+ dark_bond durum rozeti, o shared'dan çözülür): iki kalp arasında kemik zincir
 *  - bonethrow, wail, raise: Undead skill'leri; bone (Bone Strike), boneslash (Bone Slash): Skeleton skill'leri
 *
 * SPRITES: v2 efektlerinin (vfx.ts) kullandığı ek çizimler; efektte k.v2Sprite(c, 'ad', renk, x, y, boyut) ile çizilir.
 */
import type { V2SpriteEntry } from '../types';
import type { PxGrid } from '../../pixel-art';

// ---------------------------------------------------------------------------------------------------------------- yardımcılar

/** Turkuaz ruh ateşi dolgusu: daire içinde 'c'/'g' dama + beyaz çekirdek. */
function soulDisc(g: PxGrid, cx: number, cy: number, r: number): void {
  g.disc(cx, cy, r, 'G');
  // dama: c/g karışımı (turkuaz), kenarı koyu yeşil
  const k = g.k;
  for (let y = Math.floor((cy - r) * k); y <= Math.ceil((cy + r) * k); y++)
    for (let x = Math.floor((cx - r) * k); x <= Math.ceil((cx + r) * k); x++) {
      const d = Math.hypot(x + 0.5 - cx * k, y + 0.5 - cy * k) / (r * k);
      if (d > 0.78) continue;
      g.px(x, y, d < 0.32 ? 'w' : (x + y) % 2 ? 'c' : 'g');
    }
}

/** Ruh alevi (damla biçimli, turkuaz): taban (cx, by), yükseklik h, genişlik w. */
function soulFlame(g: PxGrid, cx: number, by: number, h: number, w: number): void {
  const shape = (s: number) => [cx, by - h * s, cx + w * s * 1.05, by - h * s * 0.42, cx + w * s * 0.8, by - h * s * 0.08, cx, by, cx - w * s * 0.8, by - h * s * 0.08, cx - w * s * 1.05, by - h * s * 0.42];
  g.poly(shape(1), 'G');
  // iç: c/g dama (turkuaz)
  const tmp: Array<[number, number]> = [];
  const inner = shape(0.72).map((v) => v * g.k);
  const n = inner.length / 2;
  for (let y = 0; y < g.size; y++) {
    const xs: number[] = [];
    const py = y + 0.5;
    for (let i = 0; i < n; i++) {
      const ax = inner[i * 2]!;
      const ay = inner[i * 2 + 1]!;
      const bx = inner[((i + 1) % n) * 2]!;
      const by2 = inner[((i + 1) % n) * 2 + 1]!;
      if ((ay <= py && by2 > py) || (by2 <= py && ay > py)) xs.push(ax + ((py - ay) / (by2 - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]! - 0.5); x <= Math.floor(xs[i + 1]! - 0.5); x++) tmp.push([x, y]);
  }
  for (const [x, y] of tmp) g.px(x, y, (x + y) % 2 ? 'c' : 'g');
  g.poly(shape(0.38), 'w');
}

/** Uzun kemik (femur): iki uçta çift topuz, gövde açık kemik + alt kenar gölgesi. */
function femur(g: PxGrid, x0: number, y0: number, x1: number, y1: number, w: number, hi = 'e', lo = 'n'): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const r = w * 0.72;
  for (const [x, y] of [
    [x0, y0],
    [x1, y1],
  ] as const) {
    g.disc(x + nx * r * 0.8, y + ny * r * 0.8, r, hi);
    g.disc(x - nx * r * 0.8, y - ny * r * 0.8, r, hi);
  }
  g.line(x0, y0, x1, y1, hi, w);
  // alt kenar gölgesi + uç gölgeleri
  g.line(x0 + nx * w * 0.32, y0 + ny * w * 0.32, x1 + nx * w * 0.32, y1 + ny * w * 0.32, lo, w * 0.3);
  g.disc(x0 + nx * r * 1.05, y0 + ny * r * 1.05, r * 0.42, lo);
  g.disc(x1 + nx * r * 1.05, y1 + ny * r * 1.05, r * 0.42, lo);
  // parlama
  g.line(x0 - nx * w * 0.25 + (x1 - x0) * 0.15, y0 - ny * w * 0.25 + (y1 - y0) * 0.15, x0 - nx * w * 0.25 + (x1 - x0) * 0.7, y0 - ny * w * 0.25 + (y1 - y0) * 0.7, 'w', 0.5);
}

/** Kafatası (önden): kubbe + çene, göz çukurları turkuaz yanar. */
function skullFace(g: PxGrid, cx: number, cy: number, s: number, glow = true): void {
  g.disc(cx, cy, 6.6 * s, 'e');
  g.poly([cx - 4.6 * s, cy + 2.6 * s, cx + 4.6 * s, cy + 2.6 * s, cx + 3.6 * s, cy + 9.2 * s, cx - 3.6 * s, cy + 9.2 * s], 'e');
  // elmacık gölgesi
  g.poly([cx - 6.2 * s, cy + 1.6 * s, cx - 3.4 * s, cy + 3.6 * s, cx - 4.4 * s, cy + 5.6 * s], 'n');
  g.poly([cx + 6.2 * s, cy + 1.6 * s, cx + 3.4 * s, cy + 3.6 * s, cx + 4.4 * s, cy + 5.6 * s], 'n');
  g.ellipse(cx - 2.8 * s, cy + 0.8 * s, 2.15 * s, 2.35 * s, 'o');
  g.ellipse(cx + 2.8 * s, cy + 0.8 * s, 2.15 * s, 2.35 * s, 'o');
  if (glow) {
    g.disc(cx - 2.8 * s, cy + 1 * s, 1.15 * s, 'c').disc(cx + 2.8 * s, cy + 1 * s, 1.15 * s, 'c');
    g.disc(cx - 2.8 * s, cy + 1 * s, 0.5 * s, 'w').disc(cx + 2.8 * s, cy + 1 * s, 0.5 * s, 'w');
  }
  g.poly([cx, cy + 3 * s, cx - 1.1 * s, cy + 5 * s, cx + 1.1 * s, cy + 5 * s], 'o');
  // dişler
  g.rect(cx - 3.2 * s, cy + 6.1 * s, 6.4 * s, 1.7 * s, 'w');
  g.line(cx - 3.4 * s, cy + 7.9 * s, cx + 3.4 * s, cy + 7.9 * s, 'o', 0.5);
  for (let i = -2; i <= 2; i++) g.line(cx + i * 1.3 * s, cy + 6.1 * s, cx + i * 1.3 * s, cy + 7.7 * s, 'n', 0.25);
}

// ---------------------------------------------------------------------------------------------------------------- ikonlar

export const ICONS: Record<string, V2SpriteEntry> = {
  // ChatGPT boyalı ikonlar (assets/source/class-icons/undead-sheet.png -> python tools/make-class-icons.py undead ...); eski kodla çizimler kaldırıldı.
  bonethrow: { image: 'undead/bonethrow' },
  wail: { image: 'undead/wail' },
  darkbond: { image: 'undead/darkbond' },
  raise: { image: 'undead/raise' },
  soul: { image: 'undead/soul' },
  // ChatGPT boyalı ikonlar (summons-sheet.png -> tools/make-class-icons.py); eski kodla çizimler kaldırıldı.
  bone: { image: 'undead/bone' },
  boneslash: { image: 'undead/boneslash' },
  /** Undead / Skeleton logosu: yırtık mor kukuletanın içinden bakan, gözleri turkuaz yanan kafatası. */
  skull: (g) => {
    // kukuleta (yırtık alt kenar)
    g.poly([16, 1.5, 23, 3.5, 27.5, 9, 29, 17, 28.5, 24.5, 30.5, 30.5, 25.5, 28.5, 22.5, 31, 19.5, 28.5, 16, 30.5, 12.5, 28.5, 9.5, 31, 6.5, 28.5, 1.5, 30.5, 3.5, 24.5, 3, 17, 4.5, 9, 9, 3.5], 'P');
    g.poly([9, 3.5, 16, 1.5, 16, 4.5, 10.5, 6.5, 7, 12, 6, 20, 4.5, 26, 3.5, 24.5, 3, 17, 4.5, 9], 'p');
    g.line(23.5, 6, 27, 14, 'P', 1); // kıvrım
    // kukuleta içi derin gölge
    g.ellipse(16, 17.5, 9, 11, 'o');
    g.ellipse(16, 18.5, 8, 9.5, 'P');
    g.ellipse(16, 18.5, 7.2, 8.6, 'o');
    skullFace(g, 16, 14.5, 1);
  },

  /** Vampiric Bite: kemik çene kan kalbine diş geçirir; kalbin içinde turkuaz ruh yanar, uçtan kan damlar (ısırıp ruh/can çekmek). */

  /**
   * Dark Bond: iki kalp arasında sarkan kemik zincir (animasyondaki omur boncukları + kan ipliği). Solda Undead'in mor kalbi
   * (içinde turkuaz ruh ateşi), sağda dostun kan kalbi; zincirin ortasından kan-ruh damlası akar (lifesteal'ın paylaşıldığı yol).
   */

  /** Bone Throw: turkuaz ruh ateşine sarılı, dönerek uçan femur kemiği; arkasında dönüş izleri. */

  /** Wail of the Dead: çığlık atan mor hayalet (ağzı aşağı sarkmış kafatası), önünde ses dalgaları, ağzından zehir damlar. */

  /** Raise Dead: mezar toprağını yarıp çıkan iskelet eli; arkasında mor ölü-çağırma halkası, avucun üstünde turkuaz ruh. */


};

// ---------------------------------------------------------------------------------------------------------------- efekt sprite'ları

export const SPRITES: Record<string, V2SpriteEntry> = {
  /** Fırlatılan femur (Bone Throw mermisi). */
  femur: { size: 96, draw: (g) => femur(g, 7, 25, 25, 7, 4.2) },

  /** Turkuaz ruh alevi (avuç ateşi, lifesteal ruhu). */
  soulflame: { size: 96, draw: (g) => soulFlame(g, 16, 29, 26, 9) },

  /** Ruh kıvılcımı: küçük turkuaz ruh topu (lifesteal akışı, iz). */
  soulmote: { size: 64, outline: false, draw: (g) => {
    g.disc(16, 16, 9, 'G');
    soulDisc(g, 16, 16, 8);
  } },

  /** Çığlık atan banshee (Wail of the Dead): ağzı açık uzamış kafatası + savrulan mor gövde. */
  banshee: { size: 128, draw: (g) => {
    g.poly([10, 7, 15.5, 2.5, 21.5, 5, 25, 11, 26, 18, 30.5, 24, 25.5, 24, 28, 30.5, 22, 27, 20, 31.5, 16.5, 27, 13, 31.5, 11.5, 26, 6.5, 29.5, 8, 22, 5, 17, 7.5, 12], 'a');
    g.poly([15.5, 2.5, 21.5, 5, 25, 11, 26, 18, 30.5, 24, 24, 20, 21, 12, 18, 6], 'z');
    g.ellipse(16, 12, 5.6, 6.6, 'e');
    g.poly([11.6, 13.5, 20.4, 13.5, 18.8, 24, 13.2, 24], 'e');
    g.ellipse(13.6, 11, 1.6, 2.1, 'o').ellipse(18.4, 11, 1.6, 2.1, 'o');
    g.disc(13.6, 11.3, 0.8, 'c').disc(18.4, 11.3, 0.8, 'c');
    g.ellipse(16, 18.6, 2.8, 4.6, 'o');
    g.ellipse(16, 19.2, 1.6, 3, 'P');
  } },

  /** Kemik iskelet eli (yerden çıkıp bileği kavrar: Bone Throw'un Slow'u). */
  gravehand: { size: 96, draw: (g) => {
    g.line(14.5, 31, 15, 20, 'e', 1.8).line(18, 31, 17.6, 20, 'e', 1.8);
    g.ellipse(16.4, 18.4, 4, 2.8, 'e');
    const f: Array<[number, number, number, number, number, number]> = [
      [12.6, 17.6, 10, 12.4, 12.4, 9],
      [14.6, 16.6, 13.6, 10.2, 16, 7.6],
      [16.8, 16.4, 17.4, 9.8, 19.6, 7.8],
      [18.8, 16.8, 21, 11.2, 23, 9.6],
      [20.2, 18.6, 23.6, 16, 25, 13.2],
    ];
    for (const [x0, y0, x1, y1, x2, y2] of f) {
      g.line(x0, y0, x1, y1, 'e', 1.3).line(x1, y1, x2, y2, 'e', 1.1);
      g.disc(x1, y1, 0.8, 'w');
    }
    g.line(15.4, 30, 15.6, 21, 'n', 0.6);
  } },

  /** Bağ kalbi (Dark Bond): bağlı iki birimin üstünde kısa yanan kan-ruh kalbi. */
  bondheart: { size: 64, draw: (g) => {
    g.disc(11, 13, 6.6, 'R').disc(21, 13, 6.6, 'R');
    g.poly([4.6, 14.6, 27.4, 14.6, 16, 28], 'R');
    g.disc(11, 12.6, 5.6, 'a').disc(21, 12.6, 5.6, 'a');
    g.poly([5.8, 14.2, 26.2, 14.2, 16, 26], 'a');
    soulDisc(g, 16, 16.5, 4);
    g.disc(9.2, 10.6, 1.6, 'z');
  } },

  /** Omur boncuğu (Dark Bond'un kemik zinciri halkası). */
  vertebra: { size: 64, draw: (g) => {
    // yatay kemik halka (zincir yönünde): iki eklem topuzu + bel + üstte/altta kısa çıkıntılar
    g.disc(6.5, 13.2, 3.6, 'e').disc(6.5, 18.8, 3.6, 'e');
    g.disc(25.5, 13.2, 3.6, 'e').disc(25.5, 18.8, 3.6, 'e');
    g.rect(6.5, 12, 19, 8, 'e');
    g.poly([13, 12, 16, 6.5, 19, 12], 'e').poly([13, 20, 16, 25.5, 19, 20], 'e');
    g.line(7, 18.6, 25, 18.6, 'n', 1);
    g.disc(16, 16, 2.2, 'R');
    g.line(8, 13.4, 23, 13.4, 'w', 0.5);
  } },

  /** Yarım tur kum saati: üst hazne yarı dolu (Dark Bond yarım tur harcar). */
  halfglass: { size: 96, draw: (g) => {
    g.rect(7, 3, 18, 2.6, 'b').rect(7, 26.4, 18, 2.6, 'b');
    g.line(8.5, 5, 8.5, 26.5, 'k', 1.2).line(23.5, 5, 23.5, 26.5, 'k', 1.2);
    g.poly([10, 5.6, 22, 5.6, 16.8, 15.4, 15.2, 15.4], 'l');
    g.poly([15.2, 16.6, 16.8, 16.6, 22, 26.4, 10, 26.4], 'l');
    // kum: üstte yarı, altta yarı
    g.poly([12.6, 10.6, 19.4, 10.6, 16.8, 15.2, 15.2, 15.2], 'n');
    g.line(16, 15, 16, 24, 'n', 0.5);
    g.poly([12.6, 26.2, 19.4, 26.2, 16, 22], 'n');
    g.line(11, 6.5, 13, 9.5, 'w', 0.5);
  } },

  /** Mezar mührü: zeminde dönen ölü-çağırma halkası (kontursuz; yere yatırılarak çizilir). */
  gravesigil: { size: 128, outline: false, draw: (g) => {
    g.ring(16, 16, 15.5, 'a', 1.1);
    g.ring(16, 16, 13.4, 'z', 0.5);
    g.ring(16, 16, 9.2, 'a', 0.75);
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
      g.line(16 + Math.cos(a0) * 9.2, 16 + Math.sin(a0) * 9.2, 16 + Math.cos(a1) * 9.2, 16 + Math.sin(a1) * 9.2, 'a', 0.5);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = 16 + Math.cos(a) * 14.45;
      const y = 16 + Math.sin(a) * 14.45;
      if (i % 3 === 0) g.disc(x, y, 0.9, 'w');
      else g.line(x - Math.sin(a) * 0.7, y + Math.cos(a) * 0.7, x + Math.sin(a) * 0.7, y - Math.cos(a) * 0.7, 'z', 0.5);
    }
    g.disc(16, 16, 1.6, 'z');
  } },

  /** Kemik kıymığı (Bone Throw parçalanması, Skeleton kesişleri). */
  bonechip: { size: 48, draw: (g) => {
    g.poly([6, 20, 14, 9, 25, 6, 21, 15, 26, 24, 13, 23], 'e');
    g.line(10, 19, 21, 11, 'n', 1);
    g.line(12, 14, 18, 9.6, 'w', 0.8);
  } },

  /** Pas pulu (Skeleton'un paslı kılıcından dökülen). */
  rustflake: { size: 32, draw: (g) => {
    g.poly([8, 12, 20, 6, 25, 16, 17, 25, 7, 21], 'b');
    g.poly([11, 13, 18, 10, 20, 16, 14, 19], 'Y');
  } },
};
