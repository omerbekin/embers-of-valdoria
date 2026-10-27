/**
 * Harita pencerelerinin saf (DOM'suz) veri parçaları: olay seçeneğinden çipler ve düğüm üst bilgisi. Oyun kuralı burada değil;
 * yalnızca seçeneğin verisini (data/campaign/events.json > choices) oyuncuya okunur çiplere çevirir. Testi tests/map-window.test.ts.
 */
import type { MwChip } from './map-window';

export interface ChoiceFx {
  cost?: number;
  gold?: number;
  hpLoss?: number;
  heal?: number;
  chest?: boolean;
  chestItems?: number;
  restHeal?: number;
  battle?: unknown;
  win?: { gold?: number; chest?: boolean };
  /** M-L / M-J / M-M (src/campaign/reach.ts): taraf seçimi, gemi kiralama, fener, hediye item. */
  faction?: string;
  charter?: boolean;
  light?: boolean;
  gift?: { rarity?: string; slots?: string[] };
}

const FACTION_LABEL: Record<string, string> = { order: 'the Order', guild: 'the Guild' };
const giftText = (g: { rarity?: string; slots?: string[] }): string => {
  const kind = g.slots?.includes('offhand') ? 'relic' : 'item';
  return `${g.rarity ? g.rarity.charAt(0).toUpperCase() + g.rarity.slice(1) + ' ' : ''}${kind}`;
};

/** Kalıcı kural çipleri (taraf, deniz yolu, fener, hediye). */
function reachChips(c: ChoiceFx, done: boolean): MwChip[] {
  const out: MwChip[] = [];
  const side = c.faction ? (FACTION_LABEL[c.faction] ?? c.faction) : '';
  if (c.faction) out.push({ tone: 'info', text: done ? `Sided with ${side}` : `Side with ${side} (final)` });
  if (c.charter) out.push({ tone: 'gain', text: done ? 'Sea lanes open' : 'Opens the sea lanes' });
  if (c.light) out.push({ tone: 'gain', text: 'Sight +1 on this map' });
  if (c.gift) out.push({ tone: 'gain', icon: 'gear', text: giftText(c.gift) });
  return out;
}

const pct = (v: number): number => Math.round(v * 100);
const items = (n: number): string => `${n} item${n === 1 ? '' : 's'}`;

/** Seçenek plakasındaki çipler (ne olacak). */
export function choiceChips(c: ChoiceFx): MwChip[] {
  const out: MwChip[] = [];
  if (c.battle) {
    out.push({ tone: 'info', icon: 'sword', text: 'Battle' });
    if (c.win?.gold) out.push({ tone: 'gain', icon: 'gold', text: `Win: ${c.win.gold} gold` });
    if (c.win?.chest) out.push({ tone: 'gain', icon: 'gear', text: 'Win: chest' });
    return out;
  }
  if (c.cost) out.push({ tone: 'loss', icon: 'gold', text: `${c.cost} gold` });
  if (c.hpLoss) out.push({ tone: 'loss', icon: 'hp', text: `-${pct(c.hpLoss)}% HP, every hero` });
  if (c.heal) out.push({ tone: 'heal', icon: 'hp', text: `Heal ${pct(c.heal)}% HP` });
  if (c.chest) out.push({ tone: 'gain', icon: 'gear', text: c.chestItems !== undefined ? items(c.chestItems) : 'Chest' });
  if (c.gold) out.push({ tone: 'gain', icon: 'gold', text: `${c.gold} gold` });
  if (c.restHeal !== undefined) out.push({ tone: 'heal', icon: 'rest', text: `Rest heals ${pct(c.restHeal)}%` });
  out.push(...reachChips(c, false));
  if (!out.length) out.push({ tone: 'dim', text: 'No change' });
  return out;
}

/** Sonuç penceresindeki çipler (ne değişti). */
export function resultChips(c: ChoiceFx): MwChip[] {
  const out: MwChip[] = [];
  if (c.cost) out.push({ tone: 'loss', icon: 'gold', text: `-${c.cost} gold` });
  if (c.hpLoss) out.push({ tone: 'loss', icon: 'hp', text: `-${pct(c.hpLoss)}% current HP, every hero` });
  if (c.heal) out.push({ tone: 'heal', icon: 'hp', text: `+${pct(c.heal)}% HP` });
  if (c.chest) out.push({ tone: 'gain', icon: 'gear', text: c.chestItems !== undefined ? `${items(c.chestItems)} from the chest` : 'A chest to open' });
  if (c.gold) out.push({ tone: 'gain', icon: 'gold', text: `+${c.gold} gold` });
  if (c.restHeal !== undefined) out.push({ tone: 'heal', icon: 'rest', text: `Tonight's rest heals ${pct(c.restHeal)}%` });
  out.push(...reachChips(c, true));
  if (!out.length) out.push({ tone: 'dim', text: 'Nothing gained, nothing lost' });
  return out;
}

/** Düğüm alt yazısından ("Event · Guarded") tür ve yer çipleri. */
export function nodeTags(subtitle: string | undefined, fallbackKind: string): { kind: string; place?: string } {
  const parts = (subtitle ?? '').split(' · ');
  const kind = parts[0] || fallbackKind;
  const place = parts.slice(1).join(' · ');
  return { kind, ...(place ? { place } : {}) };
}

/** Düz metni paragraflara böler (boş satırla ayrılmış). */
export const paragraphs = (text: string | undefined): string[] => (text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
