// A5 Personal Quests, Harita 2 (Ömer seçimi 2026-10-27, form quests/surge; docs/design/campaign/map2-quests-surge.md 1; open-questions 431):
// saf veri ve kural yardımcıları. Durum geçişleri (görevi bitirme) state.ts'te çağrılır; bu modül state.ts'i içe aktarmaz.
//  - Görünürlük (A4 = c): o sınıftan bir kahraman kadroda (aktif takım + yedek) varsa görev düğümü / seçeneği görünür. Inn'deki kahraman sayılmaz.
//  - Ödül: o sınıftaki kahramana unvan + sınıf pasifinin bir sayısına ek (A2 = a), yalnız bu seferde (A7 = a; haritalar arası taşınır).
//  - Hero Oath ile aynı kahramanda birlikte olabilir (A8 = a).
import questsJson from '../../data/campaign/quests.json';
import { classes } from '../engine/content';
import type { PassiveDef, UnitSetup } from '../engine/types';
import type { CampaignMap, CampaignState, Hero } from './types';
import { getMap } from './data';

export interface QuestDef {
  id: string;
  /** Görevin sınıfı (data/classes id'si). */
  class: string;
  /** Görev adı (İngilizce). */
  name: string;
  /** Kazanılan unvan (İngilizce). */
  title: string;
  /** Görevin düğümü (cep ya da var olan olay düğümü). */
  node: string;
  /** Pasif ekinin alanı ve miktarı (sınıf pasifinin `effect[field]` sayısına eklenir). */
  passive: { field: string; add: number };
  /** Bonus satırında yüzdenin neyi anlattığı. */
  unit: string;
}

const RAW = (questsJson as unknown as { quests: Record<string, Omit<QuestDef, 'id'>> }).quests;
export const QUESTS: Record<string, QuestDef> = Object.fromEntries(Object.entries(RAW).map(([id, q]) => [id, { id, ...q }]));
export const QUEST_LIST: QuestDef[] = Object.values(QUESTS);
export const questDef = (id: string | undefined): QuestDef | undefined => (id ? QUESTS[id] : undefined);

/** Görevin sınıfından kahraman kadroda (aktif takım dahil tüm roster + yedek) var mı: düğüm / seçenek görünür. */
export function questOpen(s: Pick<CampaignState, 'roster' | 'reserve'>, id: string | undefined): boolean {
  const q = questDef(id);
  return !!q && [...s.roster, ...(s.reserve ?? [])].some((h) => h.class === q.class);
}

/** Kahramanın geçerli görevleri (bilinmeyen / başka sınıfın görevi sayılmaz), bitirme sırasıyla. */
export function heroQuests(h: Pick<Hero, 'class' | 'quests'>): QuestDef[] {
  const out: QuestDef[] = [];
  for (const id of Array.isArray(h.quests) ? h.quests : []) {
    const q = questDef(id);
    if (q && q.class === h.class && !out.includes(q)) out.push(q);
  }
  return out;
}

/** Kahramanın unvanları. */
export const heroTitles = (h: Pick<Hero, 'class' | 'quests'>): string[] => heroQuests(h).map((q) => q.title);

/** Sınıfın pasifi ve görevin alanındaki taban sayı (veri doğrulaması ve metin için). */
export function questBase(q: QuestDef): { passive: PassiveDef; value: number } | undefined {
  const p = classes[q.class]?.passive;
  const v = (p?.effect as unknown as Record<string, unknown> | undefined)?.[q.passive.field];
  return p && typeof v === 'number' ? { passive: p, value: v } : undefined;
}

const pct = (v: number): string => `${Math.round(v * 1000) / 10}%`;

/** Bonusun oyuncu metni (toplamsal "+X%"): "Divine Light +3% (27% → 30% of Intelligence healed)". */
export function questBonusLine(q: QuestDef): string {
  const b = questBase(q);
  if (!b) return '';
  return `${b.passive.name} +${pct(q.passive.add)} (${pct(b.value)} → ${pct(b.value + q.passive.add)} ${q.unit})`;
}

/**
 * Görev bonuslarını savaş kurulumuna ekler (YERİNDE): sınıf pasifinin (ya da skill ağacının zaten yamaladığı pasifin) alanına ek; motor
 * UnitSetup.tree.passive ile aynı id'li pasifin yerine koyar. Görevi yoksa dokunmaz.
 */
export function applyQuestBonus(setup: UnitSetup, h: Pick<Hero, 'class' | 'quests'>): void {
  const qs = heroQuests(h);
  if (!qs.length) return;
  const base = setup.tree?.passive ?? classes[h.class]?.passive;
  if (!base) return;
  const p = JSON.parse(JSON.stringify(base)) as PassiveDef;
  const eff = p.effect as unknown as Record<string, unknown>;
  let changed = false;
  for (const q of qs) {
    const cur = eff[q.passive.field];
    if (typeof cur !== 'number') continue;
    eff[q.passive.field] = Math.round((cur + q.passive.add) * 10000) / 10000;
    changed = true;
  }
  if (changed) setup.tree = { ...(setup.tree ?? {}), passive: p };
}

/** Ödülü alacak kahraman: aktif dizilimde önden arkaya, sonra kadro, sonra yedek; o sınıftan ve görevi henüz almamış ilk kahraman. */
export function questRecipient(s: Pick<CampaignState, 'roster' | 'reserve' | 'active'>, id: string): Hero | undefined {
  const q = questDef(id);
  if (!q) return undefined;
  const byCell = s.active.map((hid) => s.roster.find((h) => h.id === hid)).filter((h): h is Hero => !!h);
  const order = [...byCell, ...s.roster.filter((h) => !byCell.includes(h)), ...(s.reserve ?? [])];
  return order.find((h) => h.class === q.class && !heroQuests(h).includes(q));
}

/** Görevi bitirir (YERİNDE): ödül kahramanının kaydına yazılır. Ödülü alan kahramanın id'si ya da (alacak yoksa) null. */
export function grantQuest(t: CampaignState, id: string | undefined): string | null {
  if (!id || !questDef(id)) return null;
  const h = questRecipient(t, id);
  if (!h) return null;
  h.quests = [...(Array.isArray(h.quests) ? h.quests : []), id];
  return h.id;
}

/** Kayıttan okunan kahramanın görev listesi (YERİNDE): bilinmeyen / başka sınıfın / tekrar eden id atılır; boşsa alan silinir. */
export function sanitizeHeroQuests(h: Hero): void {
  if (h.quests === undefined) return;
  if (!Array.isArray(h.quests)) return void delete h.quests;
  const ids = heroQuests(h).map((q) => q.id);
  if (ids.length) h.quests = ids;
  else delete h.quests;
}

/**
 * Gizli görev cepleri: görevi olan isteğe bağlı cep düğümü, görevin sınıfı kadroda yoksa ve oraya hiç ayak basılmadıysa gizlidir (haritada
 * çizilmez, yol açılmaz). Bulunulan düğüm hiçbir zaman gizli değil. Var olan olay düğümündeki görev (dr56, cep değil) düğümü gizlemez.
 */
export function hiddenQuestNodes(map: CampaignMap, s: Pick<CampaignState, 'at' | 'roster' | 'reserve' | 'visited' | 'path'>): string[] {
  const seen = new Set(Array.isArray(s.visited) ? s.visited : s.path);
  return map.nodes.filter((n) => n.optional && n.quest && n.id !== s.at && !seen.has(n.id) && !questOpen(s, n.quest)).map((n) => n.id);
}

const shownCache = new Map<string, CampaignMap>();

/** Oyuncunun gördüğü harita: gizli görev cepleri ve kenarları çıkarılmış kopya (aynı gizli küme için aynı nesne; gizli yoksa haritanın kendisi). */
export function shownMap(s: Pick<CampaignState, 'mapId' | 'at' | 'roster' | 'reserve' | 'visited' | 'path'>): CampaignMap {
  const map = getMap(s.mapId);
  const hidden = hiddenQuestNodes(map, s);
  if (!hidden.length) return map;
  const key = `${s.mapId}|${hidden.join(',')}`;
  let m = shownCache.get(key);
  if (!m) {
    const h = new Set(hidden);
    m = { ...map, nodes: map.nodes.filter((n) => !h.has(n.id)), edges: map.edges.filter((e) => !h.has(e.from) && !h.has(e.to)) };
    shownCache.set(key, m);
  }
  return m;
}
