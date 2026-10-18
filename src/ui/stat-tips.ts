// Stat açıklamaları (savaş HUD'ı ile AYNI kaynak: src/engine/stat-info.ts > describeStat, değerler formulas.json): Gear ekranının stat paneli
// ve item kartı satırları için. Motorda karşılığı tek stat olmayan "Damage" (Global damage affix'i = Stats.damageMult; eski Might'ın yerine,
// Ömer 2026-10-11) burada anlatılır; ikonu eski Might ikonu.
import { content, describeStat, UNBLOCKABLE_LABEL } from '../engine';
import type { StatKind, Stats } from '../engine';
import { iconUrl } from './dom-icons';
import { splitStatTitle } from './band-rich';
import type { BandTipSpec } from './band-tip';
import { MIGHT_COLOR, STAT_COLOR, statIconName } from './stat-icons';
import { itemImageUrl } from '../game/item-icon-files';
import itemsJson from '../../data/items.json';

export interface StatTip {
  title: string;
  lines: string[];
  /** Karşılaştırmada başlıktaki fark ("+2" / "-3"; başlık yazısına eklenmez): tüccar ipucu yanına renkli yazar (Gear ekranı kendi farkını gösterir). */
  titleDiff?: { text: string; dir: 'up' | 'down' };
}

/** Gear paneli / item stat kimliği -> motor statı ('might' = Damage satırı; ikon adı eski Might ikonu). */
const KIND: Record<string, StatKind | 'might'> = {
  hp: 'hp',
  mp: 'mp',
  str: 'str',
  dex: 'dex',
  int: 'int',
  luck: 'luck',
  damage: 'might',
  armor: 'armor',
  magicArmor: 'magicArmor',
  crit: 'critChance',
  critMult: 'critMult',
  critDmg: 'critMult',
  accuracy: 'accuracy',
  evasion: 'evasion',
  spd: 'spd',
  hpRegen: 'hpRegen',
  mpRegen: 'mpRegen',
};

const NUM = /[-−+]?\d+(?:\.\d+)?%?/g;

/** Sayı yazısı -> değer ('−' eksi işareti de); okunmazsa null. */
const numOf = (t: string): number | null => {
  const v = Number(t.replace('−', '-').replace('%', ''));
  return Number.isFinite(v) ? v : null;
};
const decimals = (t: string): number => (t.replace('%', '').split('.')[1] ?? '').length;

/**
 * Fark yazısı (Ömer 2026-10-10): değerle aynı birim ve hassasiyet ("+6.4%" yüzde puanı, "+6" düz sayı); fark 0 ya da okunmazsa ''. Artış '+',
 * azalış '-' (başlıktaki Gear farkıyla aynı biçim).
 */
export function diffText(before: string, after: string): string {
  const a = numOf(before);
  const b = numOf(after);
  if (a === null || b === null) return '';
  const pct = before.endsWith('%') && after.endsWith('%');
  const dp = Math.max(decimals(before), decimals(after));
  const d = Math.round((b - a) * 10 ** dp) / 10 ** dp;
  if (d === 0) return '';
  return `${d > 0 ? '+' : '-'}${Math.abs(d).toFixed(dp)}${pct ? '%' : ''}`;
}

/**
 * İki açıklama satırını birleştirir: yalnızca sayıları farklıysa "28.6% → 33.3%"; yapı farklıysa sonraki satır. `withDiff`: değişen her
 * sayının ardına farkı ekler ("28.6% → 33.3% (+4.7%)"; renk: statTipSegments).
 */
export function mergeLine(before: string, after: string, withDiff = false): string {
  if (before === after) return before;
  const nb = before.match(NUM) ?? [];
  const na = after.match(NUM) ?? [];
  const tb = before.split(NUM);
  const ta = after.split(NUM);
  if (nb.length !== na.length || tb.join('|') !== ta.join('|')) return after;
  let out = tb[0] ?? '';
  nb.forEach((n, i) => {
    const m = na[i]!;
    if (n === m) out += n;
    else {
      const d = withDiff ? diffText(n, m) : '';
      out += `${n} → ${m}${d ? ` (${d})` : ''}`;
    }
    out += tb[i + 1] ?? '';
  });
  return out;
}

/** Satırın parçaları: fark parantezleri ("(+6.4%)" / "(-2)") ayrı parça, yönüyle (artış yeşil, azalış kırmızı: Gear başlık farkıyla aynı renkler). */
export interface TipSeg {
  text: string;
  dir?: 'up' | 'down';
}
const DIFF = /(\([+-]\d+(?:\.\d+)?%?\))/;
export function statTipSegments(line: string): TipSeg[] {
  return line
    .split(DIFF)
    .filter((p) => p !== '')
    .map((p) => (DIFF.test(p) ? { text: p, dir: p.startsWith('(+') ? 'up' : 'down' } : { text: p }));
}

/**
 * Statın açıklaması (birimin o anki statlarıyla); bilinmeyen kimlikte null. `after` verilirse (Gear: seçili item takılırsa) başlık ve
 * hesaplanan değerler "önce → sonra" gösterilir (savaşta fark yok; aynı describeStat kaynağı).
 */
export function statTip(id: string, stats: Stats, after?: Stats | null): StatTip | null {
  const now = statTipBase(id, stats);
  if (!now || !after) return now;
  const next = statTipBase(id, after);
  if (!next) return now;
  const lines = now.lines.map((l, i) => mergeLine(l, next.lines[i] ?? l, true)); // türetilen değerlerde fark da (başlık farkı ayrı: Gear satırı)
  for (let i = now.lines.length; i < next.lines.length; i++) lines.push(next.lines[i]!);
  const segs = statTipSegments(mergeLine(now.title, next.title, true));
  const d = segs.find((g) => g.dir);
  return { title: mergeLine(now.title, next.title), lines, ...(d ? { titleDiff: { text: d.text, dir: d.dir! } } : {}) };
}

function statTipBase(id: string, stats: Stats): StatTip | null {
  if (id === 'block') return BLOCK_TIP;
  const kind = KIND[id];
  if (!kind) return null;
  if (kind === 'might') {
    const pct = Math.round(((stats.damageMult ?? 1) * (stats.weaponMult ?? 1) - 1) * 1000) / 10;
    const sign = pct < 0 ? '' : '+';
    return {
      title: `Damage ${sign}${pct}%`,
      lines: [
        `All damage of your skills ${sign}${pct}% (weapon power and Global damage affixes).`,
        "Weapon power multiplies skill damage: x(1 + power/100), measured against your class's starter weapon. No weapon = less damage.",
        'Global damage stacks additively across items. Element damage affixes add on top for their element.',
      ],
    };
  }
  const info = describeStat(kind, stats, content.formulas);
  // Gear bağlamı: item'ler kritik çarpanını artırır (loadout critMultAdd), "herkes için sabit" satırı burada yanlış olur
  const lines = kind === 'critMult' ? [...info.lines.filter((l) => !l.startsWith('Fixed for every unit')), 'Items raise it: each +1% Crit damage adds 0.01 to the multiplier'] : [...info.lines];
  return { title: info.bonus ? `${info.title} · ${info.bonus.name}` : info.title, lines };
}

/**
 * Statın ikonu (savaş HUD'ı / karakter sayfası / alt çubuk / Codex ile AYNI kaynak: src/ui/stat-icons.ts > statIconName -> boyalı PNG
 * assets/stat-icons/<stat>.png, yoksa kodla çizilen yedek). Gear paneli ve item stat kimlikleri kabul edilir (Might dahil).
 * Phaser ekranları (Endless ödül / tüccar kartları) aynı `kind` + `color` ile `ensureIcon(scene, kind, color)` çağırır.
 */
export function statIcon(id: string): { kind: string; color: string } | null {
  const kind = KIND[id];
  if (!kind) return null;
  return { kind: statIconName(kind), color: kind === 'might' ? MIGHT_COLOR : STAT_COLOR[kind] };
}

const ATTRIBUTES = new Set(['str', 'dex', 'int', 'luck']);

/** Stat ipucunun "A - Band" parçaları (DOM ve Phaser ortak): tür etiketi, ad, büyük değer, vurgu rengi. İçerik metni değişmez. */
export function statTipParts(id: string, tip: StatTip): { kind: string; name: string; value?: string; valueLabel?: string; accent: string } {
  const t = splitStatTitle(tip.title);
  const base = ATTRIBUTES.has(id) ? 'Attribute' : 'Stat';
  return {
    kind: t.bonus ? `${base} · ${t.bonus}` : base,
    name: t.name,
    ...(t.value !== undefined ? { value: t.value } : {}),
    ...(t.value !== undefined && ATTRIBUTES.has(id) ? { valueLabel: 'points' } : {}),
    accent: statIcon(id)?.color ?? '#d9b26a',
  };
}

/** Gear'ın stat ipucu (band): `diff` = başlıktaki fark ("+2" ya da parantezli; yoksa tip.titleDiff). */
export function statBandSpec(id: string, tip: StatTip, diff?: { text: string; dir: 'up' | 'down' }): BandTipSpec {
  const p = statTipParts(id, tip);
  const d = diff ?? tip.titleDiff;
  const icon = statIconUrl(id);
  return {
    accent: p.accent,
    kind: p.kind,
    title: p.name,
    ...(icon ? { icon } : {}),
    ...(p.value !== undefined ? { value: p.value } : {}),
    ...(p.valueLabel ? { valueLabel: p.valueLabel } : {}),
    ...(d ? { valueDiff: { text: d.text.replace(/^\((.*)\)$/, '$1'), dir: d.dir } } : {}),
    lines: tip.lines.map((text) => ({ text })),
  };
}

/**
 * Blok (Ömer 2026-10-18): motor statı değil (kalkan kancası `blockChance`), açıklaması burada; ikonu Iron Buckler'ın item görseli (zırh ikonu
 * zaten kalkan, ana oturumun seçimi). Değer satırın kendisinde (panel "BLOCK 18%"), ipucu kuralı anlatır.
 */
const BLOCK_TIP: StatTip = {
  title: 'Block chance',
  lines: [
    "Chance that your shield blocks an enemy's physical hit (melee or ranged): the hit deals no damage and none of its effects (Stun, Wound...).",
    `Spells, damage over time, burning ground, Doom and ${UNBLOCKABLE_LABEL} skills (Backstab, boss warnings) cannot be blocked. A guardian's shield can block the share it takes.`,
    `Comes only from shields: their base value plus the Block affix. At most ${(itemsJson.caps as Record<string, number>)['block'] ?? 30}%.`,
  ],
};
export const blockIconUrl = (): string => itemImageUrl({ id: 'iron_buckler' }) ?? iconUrl(statIconName('armor'), STAT_COLOR.armor);

/** DOM için ikon resmi (data URL; önbellekli). Bilinmeyen kimlikte ''. */
export function statIconUrl(id: string): string {
  if (id === 'block') return blockIconUrl();
  const i = statIcon(id);
  return i ? iconUrl(i.kind, i.color) : '';
}
