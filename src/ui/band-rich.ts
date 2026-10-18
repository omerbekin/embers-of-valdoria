// "Tooltip = A Band" (Ömer 2026-10-18) için ortak metin ayrıştırıcı (saf; DOM ve Phaser aynı kuralı kullanır; testli: tests/band-tip.test.ts).
// Açıklama satırındaki oyun metni DEĞİŞMEZ; yalnızca parçalara bölünür: anahtar kelime (vurgu rengi), rakam (altın), fark parantezi (yeşil / kırmızı).

export type RichKind = 'k' | 'n' | 'up' | 'down';
export interface RichSeg {
  text: string;
  kind?: RichKind;
}

const DIFF = /(\([+\-−]\d+(?:\.\d+)?%?\))/;
// rakam: işaretli / ondalık / yüzde, "2x3", "1x", "x1.5"; kelime içindeki rakam sayılmaz
const NUM = /((?<![A-Za-z0-9])[+\-−]?\d+(?:\.\d+)?(?:%|x\d*)?|(?<![A-Za-z])x\d+(?:\.\d+)?)/;

/** Satırın başındaki etiket: "Max HP: ..." (iki noktalı) ya da "Damage 30% ..." (ardından rakam gelen baş harfi büyük kelime). */
function splitLabel(line: string): { label: string; rest: string } | null {
  const colon = /^([^:\d()]{2,30}?):\s+(.*)$/.exec(line);
  if (colon && colon[1]!.split(' ').length <= 4) return { label: colon[1]!, rest: ' ' + colon[2]! };
  const num = /^([A-Z][A-Za-z']+(?: [A-Z][A-Za-z']+)?)(?=\s+[+\-−]?\d)(.*)$/.exec(line);
  if (num) return { label: num[1]!, rest: num[2]! };
  return null;
}

function numberSegs(text: string, out: RichSeg[]): void {
  for (const part of text.split(NUM)) {
    if (!part) continue;
    const isNum = NUM.test(part) && part.match(NUM)![0] === part;
    out.push(isNum ? { text: part, kind: 'n' } : { text: part });
  }
}

/** Satırı parçalara böler. `keyword: false` = etiket aramaz (yalnızca rakam / fark). */
export function richSegs(line: string, keyword = true): RichSeg[] {
  const out: RichSeg[] = [];
  let body = line;
  if (keyword) {
    const l = splitLabel(line);
    if (l) {
      out.push({ text: l.label, kind: 'k' });
      body = l.rest;
    }
  }
  for (const piece of body.split(DIFF)) {
    if (!piece) continue;
    if (DIFF.test(piece)) out.push({ text: piece, kind: /^\(\+/.test(piece) ? 'up' : 'down' });
    else numberSegs(piece, out);
  }
  return out;
}

/**
 * Stat başlığı "Strength 18" / "Crit damage x1.5" / "Strength 18 → 20 · Bonus adı" -> ad + büyük değer (+ varsa bonus adı). Sayı yoksa yalnızca ad.
 * Başlık metni değişmez; band başlığı adı, sağ taraf değeri gösterir.
 */
export function splitStatTitle(title: string): { name: string; value?: string; bonus?: string } {
  const [main = title, ...rest] = title.split(' · ');
  const bonus = rest.length ? rest.join(' · ') : undefined;
  const m = /^(.*?)\s+((?:[x+\-−]?\d[\d.,]*%?)(?:\s*→\s*[x+\-−]?\d[\d.,]*%?)?)$/.exec(main);
  return m ? { name: m[1]!, value: m[2]!, ...(bonus ? { bonus } : {}) } : { name: main, ...(bonus ? { bonus } : {}) };
}

/** "Max HP: +3 per point (now 84)" -> { text: "Max HP: +3 per point", now: "now 84" }: durum çipi sağa gider. */
export function splitNow(line: string): { text: string; now?: string } {
  const m = /^(.*?)\s*\((now .*)\)\s*$/.exec(line);
  return m ? { text: m[1]!, now: m[2]! } : { text: line };
}
