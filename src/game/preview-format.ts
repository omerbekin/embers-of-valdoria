import type { StatusDef } from '../engine';
import layout from '../../data/battle-layout.json';

/** Hover önizlemesi durum ayrımı (saf; Phaser'a bağımlı değil, test edilebilir). Eşik: data/battle-layout.json > preview.statusIconMinChance. */
export const previewStatusIconMinChance: number = (layout as { preview?: { statusIconMinChance?: number } }).preview?.statusIconMinChance ?? 0.5;

/** Motorun önizleme metninden "Slow 1 turns (5% chance)" -> { name: 'Slow', chance: 0.05 }; kalıba uymayan satır (Immune:, Removes ...) null. */
export function parseStatusLine(line: string): { name: string; chance: number } | null {
  const m = /^([A-Za-z' ]+?) \d+ turns?(?: \((\d+)% chance\))?$/.exec(line);
  if (!m) return null;
  return { name: m[1]!, chance: m[2] !== undefined ? Number(m[2]) / 100 : 1 };
}

/** Ley Brand'in ek satırları önizlemede yazılmaz: yalnız 'Branded N turns' kalır (açıklama skill metninde). */
const DROPPED_PREFIXES = ['Tainted mana', 'MP costs', 'MP skills burn'];
/** Yazı olarak kalan durumlar (kind): Branded satırı yazı kalır. */
const TEXT_KINDS = new Set(['branded']);
/** Taunt / Guard motorda statuses.json'da olmayabilir; rozet yedeği ile aynı simge. */
const FALLBACK: Record<string, string> = { Taunt: 'taunt', Guard: 'guard' };

export interface PreviewStatusSplit {
  /** İkon olarak gösterilecek durumlar (uygulanma ihtimali eşik ve üstü). */
  icons: Array<{ kind: string; chance: number }>;
  /** Yazı olarak kalan satırlar. */
  text: string[];
}

/** Hedefin durum satırlarını ikon / yazı / gizli olarak ayırır. Eşikten düşük ihtimalli durumlar hiç görünmez. */
export function splitPreviewStatuses(lines: string[], defs: Record<string, StatusDef | undefined>, minChance = previewStatusIconMinChance): PreviewStatusSplit {
  const kindOf = new Map<string, string>();
  for (const [kind, def] of Object.entries(defs)) if (def?.name) kindOf.set(def.name, kind);
  const icons: PreviewStatusSplit['icons'] = [];
  const text: string[] = [];
  for (const line of lines) {
    if (DROPPED_PREFIXES.some((p) => line.startsWith(p))) continue;
    const p = parseStatusLine(line);
    const kind = p ? (kindOf.get(p.name) ?? (FALLBACK[p.name] ? FALLBACK[p.name] : undefined)) : undefined;
    if (!p || !kind || TEXT_KINDS.has(kind)) {
      text.push(line);
      continue;
    }
    if (p.chance + 1e-9 >= minChance && !icons.some((i) => i.kind === kind)) icons.push({ kind, chance: p.chance });
  }
  return { icons, text };
}
