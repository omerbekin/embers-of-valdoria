import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// CLAUDE.md kuralı: motor saf TypeScript; Phaser/DOM/window yok, Math.random yok.
const ENGINE_DIR = join(__dirname, '..', 'src', 'engine');

function engineFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return engineFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

const FORBIDDEN: Array<[RegExp, string]> = [
  [/Math\.random/, 'Math.random (seed\'li Rng kullan)'],
  [/from\s+['"]phaser['"]/, 'Phaser importu'],
  [/\bwindow\./, 'window erişimi'],
  [/\bdocument\./, 'document erişimi'],
  [/\blocalStorage\b/, 'localStorage erişimi'],
];

describe('motor saflığı', () => {
  const files = engineFiles(ENGINE_DIR);

  it('motor klasöründe en az bir dosya var', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.slice(ENGINE_DIR.length + 1)} yasak bağımlılık içermiyor`, () => {
      // Yorumlar sayılmaz ("Math.random yasak" gibi açıklamalar testi bozmasın)
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const hits = FORBIDDEN.filter(([re]) => re.test(src)).map(([, why]) => why);
      expect(hits).toEqual([]);
    });
  }
});

/**
 * Güvenlik ağı (denetim r39 madde 11.2): kayan noktalı üs / aşkın fonksiyonlar (Math.pow, **, Math.exp/log/sin/cos/hypot...) ECMAScript'te bit bit
 * garanti değildir; tarayıcılar arasında son basamak farkı çok oyunculu maçta desync'e yol açabilir. Motorda bunlar yalnız aşağıdaki BİLİNEN yerlerde
 * durur (dosya başına sayı). Yeni bir kullanım (ya da listeden düşen bir yer) testi kırmızı yapar: yeni yer için ya tam sayı döngüsüyle çarpım yaz
 * ya da gerekçesiyle bu listeye ekle. Math.sqrt IEEE'de tam yuvarlamalıdır (kesin), taranmaz. Yorumlar sayılmaz.
 */
const FLOAT_RISK = /Math\.(pow|exp|expm1|log|log1p|log2|log10|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|cbrt|hypot)\b|\*\*/g;
const KNOWN_FLOAT: Record<string, Record<string, number>> = {
  // Denetim 11.2: falloff Math.pow(fo, idx) (motor + önizleme aynı formül; idx küçük tam sayı)
  'battle.ts': {
    'Math.pow': 1,
    '**': 2, // (a.col - b.col) ** 2 + (a.row - b.row) ** 2: tam sayı kare, kesin (risk yok)
  },
  'preview.ts': { 'Math.pow': 1 },
  // Denetim 11.2: yan komşu sıralaması (düzen verisinden; yalnız sıralama anahtarı)
  'formation.ts': { 'Math.hypot': 1 },
  // Denetimde yazmıyor, bu taramada bulundu (bilinen açık, düşük önem): YZ puanı Math.pow / ** kullanıyor (ai.ts: ıska olasılığı 2882 / 2934,
  // zincir olasılığı 4739, zar yüzü 4790 / 4877, çan indirimi 5204). Gerçek multiplayer'da YZ yok (yalnız debug sahte rakip, src/net/fake-opponent.ts),
  // yani desync değil: tek oyunculuda puan eşitliğine çok yakın adayda cihazlar arası farklı seçim olasılığı. 2934 kesirli üs: tam sayı döngüsüyle değişmez.
  'ai.ts': { 'Math.pow': 4, '**': 2 },
};

describe('motor: kayan noktalı üs / aşkın fonksiyon taraması (desync riski)', () => {
  it('yalnız bilinen yerlerde (dosya başına sayı listeyle birebir)', () => {
    const found: Record<string, Record<string, number>> = {};
    for (const file of engineFiles(ENGINE_DIR)) {
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      for (const m of src.matchAll(FLOAT_RISK)) {
        const rel = file.slice(ENGINE_DIR.length + 1).split(sep).join('/');
        const key = m[0];
        (found[rel] ??= {})[key] = (found[rel]![key] ?? 0) + 1;
      }
    }
    expect(found).toEqual(KNOWN_FLOAT);
  });
});
