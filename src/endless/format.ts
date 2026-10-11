// Endless ekranının yazıları (saf; İngilizce oyun içi metin). Sahne: src/game/scenes/EndlessScene.ts.
import { classes } from '../engine/content';
import { clampRarity, itemDef, rarityDef, slotDef, type ItemDef, type ItemRoll } from '../progression/items';
import { affixLineText, affixLines, effectLine, itemLines } from '../progression/item-text';
import { ENDLESS, type RewardCard } from './data';

/** Item'in satırları: kademe etiketli affix'ler ("[C] +3% Physical damage") + Legendary etkisi. Zar yoksa taban satırları (orta değer). */
export const itemStatLines = (d: ItemDef, rolls?: ItemRoll): string[] => {
  if (!rolls || !itemDef(d.id)) return itemLines(d);
  const lines = affixLines({ id: d.id, rolls }).map((l) => affixLineText(l, false));
  const fx = effectLine(d);
  return fx ? [...lines, fx] : lines;
};

/** Örneğin nadirliği (zarında; yoksa katalogdaki). */
const rarityOf = (d: ItemDef, rolls?: ItemRoll) => clampRarity(d, rolls?.rarity);

/** "Boots · Common" */
export const itemKindLine = (d: ItemDef, rolls?: ItemRoll): string => `${slotDef(d.slot)?.name ?? d.slot} · ${rarityDef(rarityOf(d, rolls))?.name ?? d.rarity}`;

/** Nadirlik rengi (örneğin nadirliği; zar verilmezse katalogdaki). */
export const rarityColor = (d: ItemDef, rolls?: ItemRoll): string => rarityDef(rarityOf(d, rolls))?.color ?? '#8a8a84';

/** Kamp / başlık ekranındaki yarım savaş düğmesi: "Resume Battle · Wave 3, Turn 12" (tur = o ana kadar oynanan hamle + 1). */
export const resumeLabel = (wave: number, turnsTaken: number): string => `Resume Battle · Wave ${wave}, Turn ${turnsTaken + 1}`;

export const className = (id: string): string => classes[id]?.name ?? id;

/** Ödül kartının başlığı (item kartında item adı ayrıca yazılır). */
export function cardTitle(c: RewardCard): string {
  if (c.kind === 'gold') return `${c.amount} Gold`;
  if (c.kind === 'heal') return c.ratio >= 0.6 ? 'Field Surgeon' : 'Tend the Wounded';
  if (c.kind === 'feast') return "Hero's Feast";
  if (c.kind === 'revive') return 'Revive';
  return 'Spoils';
}

export function cardText(c: RewardCard): string {
  if (c.kind === 'gold') return `Coin for the merchant who comes after every ${ENDLESS.shop.every}th wave.`;
  if (c.kind === 'heal') return `Every hero recovers ${Math.round(c.ratio * 100)}% of their health.`;
  if (c.kind === 'revive') return `The fallen hero rises with ${Math.round(c.ratio * 100)}% of their health and mana.`;
  if (c.kind === 'feast') return `Every hero is fully healed and has +${Math.round((c.hpMult - 1) * 100)}% max health for the next ${c.waves} waves.`;
  return '';
}
