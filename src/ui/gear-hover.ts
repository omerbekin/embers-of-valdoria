// Character sayfasının kahraman listesi: üstüne gelinen / seçili item'in her kahramana etkisi (saf; testli: tests/gear-hover.test.ts).
// Ömer 2026-10-11 (g1): "Usable by" ayrı blok değil; kahraman kartının alt satırı ("Level 1 · 4/6 items") item üstündeyken o kahramanın
// kullanabilirlik / fark özetine döner ("+4 ARM · -2 HP", "Can't use Axes"); item yokken eski satır geri gelir.
import type { StatAlloc } from '../progression/levels';
import type { TreeAlloc } from '../progression/skill-tree';
import type { WoundCfg } from './wound-ui';
import { FALLEN_GEAR_MSG, FALLEN_GEAR_SHORT } from '../progression/equip';
import {
  ITEMS,
  affixDiff,
  canEquip,
  equipDiff,
  fmtPanel,
  itemDef,
  LEGENDARY_LIMIT_MSG,
  defaultEquipSlot,
  isPlanError,
  instanceLevelReq,
  levelReqMsg,
  meetsLevel,
  offhandBlocker,
  planEquip,
  signedText,
  SLOT_IDS,
  type Equipment,
  type ItemInstance,
} from '../progression';

export interface HoverHero {
  id: string;
  class: string;
  level: number;
  equipment: Equipment;
  /** Level sistemi (levels.md): bu level'daki XP, dağıtılmamış stat / skill puanları, dağıtılmış puanlar (yoksa 0 / boş). */
  xp?: number;
  statPoints?: number;
  skillPoints?: number;
  alloc?: StatAlloc;
  /** Onaylı skill ağacı (evolve ikonu animasyonu için; src/ui/evolve-icon.ts). */
  tree?: TreeAlloc;
  /** Düşmüş kahraman: alive false ya da can oranı 0 (ekipmanı değiştirilemez; Ömer 2026-10-18). */
  alive?: boolean;
  hpRatio?: number;
  /** Yara sayısı ve kuralı (Ömer 2026-10-23, V1 "Scar + dots": src/ui/wound-ui.ts); yoksa yarasız. */
  wounds?: number;
  woundCfg?: WoundCfg;
  /** A4 Hero Oath (sefer): yemin adı + artı / eksi metni. */
  oath?: { name: string; plus: string; minus: string };
  /** A5 Personal Quests (sefer): kazanılan unvanlar ve bonus satırları (karakter kartında adın altında küçük satır). */
  titles?: Array<{ title: string; bonus: string }>;
}

/** Düşmüş mü? (sefer isFallen ile aynı kural: !alive ya da can 0.) */
export const heroFallen = (h: { alive?: boolean; hpRatio?: number } | undefined): boolean => !!h && (h.alive === false || (h.hpRatio !== undefined && h.hpRatio <= 0));

/** Düşmüş kahraman için ortak yazılar (Ömer 2026-10-18): şerit işareti + tek kural metni (sefer ve Endless; diriltme yolu söylenmez). */
export const FALLEN_MARK = 'Fallen';
export const FALLEN_GEAR_TEXT = FALLEN_GEAR_MSG;
export const FALLEN_GEAR_SHORT_TEXT = FALLEN_GEAR_SHORT;

export interface HeroLinePart {
  text: string;
  dir?: 'up' | 'down';
}

/** Kahraman kartının alt satırı: `tone` rengi (up yeşil, down kırmızı, mixed karışık, no kullanılamaz, none değişiklik yok, idle olağan satır). */
export interface HeroLine {
  text: string;
  tone: 'idle' | 'up' | 'down' | 'mixed' | 'none' | 'no';
  parts: HeroLinePart[];
}

/** Dolu yuva sayısı / toplam yuva ("2/7"; kahraman ipucunda elmas sırası). */
export function heroItemCount(h: HoverHero): { filled: number; total: number } {
  return { filled: SLOT_IDS.filter((k) => h.equipment[k]).length, total: SLOT_IDS.length };
}

/** Olağan satır: "Level 1 · 4/6 items". */
export function idleHeroLine(h: HoverHero): HeroLine {
  const count = SLOT_IDS.filter((k) => h.equipment[k]).length;
  const text = `Level ${h.level} · ${count}/${SLOT_IDS.length} items`;
  return { text, tone: 'idle', parts: [{ text }] };
}

/** Panelde en fazla `max` fark (göreli büyüklüğe göre: küçük taban değerde küçük fark da öne çıkar). */
const MAX_PARTS = 2;

/**
 * Item'in kahramana etkisi. Sıra: kullanamaz ("Can't use Axes" / "Can't use") → Legendary sınırı → (seviye şartı: "Requires Level X" + fark) → stat paneli farkları (en büyük ikisi) →
 * panelde görünmeyen affix farkı (element hasarı, delme...) → "No stat change". `inst` yoksa olağan satır.
 */
export function heroItemLine(h: HoverHero, inst: ItemInstance | null | undefined): HeroLine {
  if (!inst) return idleHeroLine(h);
  const d = itemDef(inst.id);
  if (!d) return idleHeroLine(h);
  if (!canEquip(h.class, d)) {
    const fam = d.family ? ITEMS.weaponFamilies.find((f) => f.id === d.family)?.name : undefined;
    const text = fam ? `Can't use ${fam}` : "Can't use";
    return { text, tone: 'no', parts: [{ text }] };
  }
  // Aynı item zaten takılı (yuvadaki örneğin kendisi): fark yok
  if (SLOT_IDS.some((k) => h.equipment[k]?.uid === inst.uid)) return { text: 'Equipped', tone: 'none', parts: [{ text: 'Equipped' }] };
  // Legendary sınırı / ikinci el kapalı (çift el silah): kısa neden
  const slot = defaultEquipSlot(h.equipment, d);
  const plan = planEquip(h.class, h.equipment, inst, slot);
  if (isPlanError(plan)) {
    const text = plan.error === LEGENDARY_LIMIT_MSG ? plan.error : offhandBlocker(h.equipment) && slot === 'offhand' ? 'Hands full' : plan.error;
    return { text, tone: 'no', parts: [{ text }] };
  }
  const diffs = equipDiff(h, inst, slot)
    .map((x) => ({ x, weight: Math.abs(x.delta) / Math.max(Math.abs(x.value - x.delta), x.fmt === 'pct' ? 0.05 : 1) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_PARTS)
    .map(({ x }) => x);
  let parts: HeroLinePart[];
  if (diffs.length) {
    parts = diffs.map((x) => ({ text: `${x.delta > 0 ? '+' : '-'}${fmtPanel({ value: Math.abs(x.delta), fmt: x.fmt })} ${x.label}`, dir: x.delta > 0 ? 'up' : 'down' }));
  } else {
    // Panelde görünmeyen affix'ler (element hasarı %, delme, auralar...): takılıyla affix farkı
    const ad = affixDiff(inst, h.equipment[slot], h.class).filter((a) => !a.stat && a.diff !== 0).slice(0, MAX_PARTS);
    parts = ad.map((a) => ({ text: `${signedText(a.diff, a.pct)} ${a.name}`, dir: a.diff > 0 ? 'up' : 'down' }));
  }
  // Seviye şartı (Item Güçlendirme x6): takılamaz ama karşılaştırma yine gösterilir (kırmızı "Requires Level X" önde)
  if (!meetsLevel(h.level, inst)) {
    const req = levelReqMsg(instanceLevelReq(inst));
    return { text: [req, ...parts.map((p) => p.text)].join(' · '), tone: 'no', parts: [{ text: req }, ...parts] };
  }
  if (!parts.length) return { text: 'No stat change', tone: 'none', parts: [{ text: 'No stat change' }] };
  const ups = parts.filter((p) => p.dir === 'up').length;
  const tone: HeroLine['tone'] = ups === parts.length ? 'up' : ups === 0 ? 'down' : 'mixed';
  return { text: parts.map((p) => p.text).join(' · '), tone, parts };
}
