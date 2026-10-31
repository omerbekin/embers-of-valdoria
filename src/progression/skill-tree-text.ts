/**
 * Skill ağacı düğüm metninin verilen rank'taki hali (Gear > Sheet > Active nodes ipucu). Kural yeni değil: bir düğümün rank'ları doğrusal toplanır
 * (docs/design/ui-design-language.md madde 8: "6% more per rank", rank 3 = 18% more). Metin "N% ... per rank" diyorsa o N, rank ile çarpılıp
 * "per rank" düşer; sayı o cümlede "per rank"ten hemen önceki sayıdır (eşik gibi önceki sayılar dokunulmaz: "below 50% HP, 4% less per rank").
 * Tek rank'lı düğümde (metinde "per rank" yok) null döner: ipucu yalnızca düğüm metnini gösterir.
 */
const PER_RANK = /(\d+(?:\.\d+)?)(%?)((?:(?!\d)[^.;])*?)\s+per rank/g;

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

export function textAtRank(text: string, rank: number): string | null {
  if (!/per rank/.test(text) || rank < 1) return null;
  return text.replace(PER_RANK, (_m, n: string, pct: string, rest: string) => `${round3(Number(n) * rank)}${pct}${rest}`);
}
