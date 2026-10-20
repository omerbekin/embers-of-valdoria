// Skill ipucu çipleri V2 (Ömer 2026-10-20): menzil / bedel / bekleme yalnızca ikon + sayı; tam anlam balon / aria metninde.
// TEK ayrıştırıcı: DOM ipucu (battle-hud.ts > tipToBand), Phaser takım seçimi ipucu ve Codex skill kartı aynı metinden aynı sayıyı ve aynı ipucu metnini çıkarır.
// Sayıya inmeyen metinler (Free, "All MP (min 10)", "20% of current HP", "Global") null döner: çağıran eski yazılı çipi korur.

export type SkillResource = 'mp' | 'hp' | 'rage';
export interface BareChip {
  num: string;
  /** "Range 6", "Costs 14 MP", "Cooldown: 2 turns". */
  tip: string;
}

const RESOURCE_NAME: Record<SkillResource, string> = { mp: 'MP', hp: 'HP', rage: 'Rage' };

/** "Range 6" -> { num: '6', tip: 'Range 6' }. */
export function rangeChipOf(text: string): BareChip | null {
  const m = /^Range (\d+)$/.exec(text);
  return m ? { num: m[1]!, tip: `Range ${m[1]}` } : null;
}

/** "14 MP" / "12 HP" / "RAGE 10" / "Cost 14 MP" -> kaynak + sayı + ipucu. */
export function costChipOf(text: string): (BareChip & { res: SkillResource }) | null {
  const m = /^(?:Cost )?(?:(\d+) (MP|HP)|(RAGE) (\d+))$/i.exec(text);
  if (!m) return null;
  const res = (m[2] ?? m[3])!.toLowerCase() as SkillResource;
  const num = (m[1] ?? m[4])!;
  return { res, num, tip: `Costs ${num} ${RESOURCE_NAME[res]}` };
}

/** "2 turns" / "1 turn" -> { num, tip: 'Cooldown: 2 turns' }. */
export function cooldownChipOf(text: string): BareChip | null {
  const m = /^(?:Cooldown )?(\d+) turns?$|^Cooldown (\d+)$/i.exec(text);
  if (!m) return null;
  const n = (m[1] ?? m[2])!;
  return { num: n, tip: `Cooldown: ${n} ${n === '1' ? 'turn' : 'turns'}` };
}
