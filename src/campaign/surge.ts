// CROWN SURGE + ASHEN TAINT (Ömer 2026-10-27, docs/design/campaign/map2-quests-surge.md bölüm 2; kurallar data/campaign/crown-surge.json).
// Saf (Phaser/DOM yok, rastgelelik yok). Savaşta Surge motorun global 'surge' eylemidir (data/global-skills.json); burada yalnızca sefer tarafı:
// bölge hakkı, savaşa hangi Surge'lerin verileceği, savaş sonunda harcanan hak + Taint, Chapel temizliği, Salt Surge'ün açılması.
import surgeJson from '../../data/campaign/crown-surge.json';
import type { UnitSetup } from '../engine/types';
import { getMap } from './data';
import { findNode } from './graph';
import type { BattleOutcome, CampaignState, Hero } from './types';

export interface CrownSurgeConfig {
  /** Surge'ün çalıştığı haritalar (C12 a: yalnız sefer, Harita 2-3). */
  maps: string[];
  /** Ash Surge'ün global id'si. */
  ash: string;
  salt: { id: string; unlock: { map: string; node: string } };
  taint: { maxHpLoss: number; firstGain: number; gainStep: number; minFactor: number };
  /** Harita başına Chapel dinlenme düğümleri (C5 b: Taint'i temizler). */
  chapels: Record<string, string[]>;
  /** Chapel'de altınla kullanım sayacını sıfırlama (Ömer 2026-10-27, open-questions 445): harita başına altın fiyatı (haritada yoksa teklif yok). */
  reset?: { gold: Record<string, number> };
}

export const SURGE: CrownSurgeConfig = surgeJson as unknown as CrownSurgeConfig;

/** Kahramanın Taint yığını (kayıtta `taint`; yok / bozuk = 0). */
export const taintOf = (h: { taint?: unknown } | undefined): number => {
  const v = h?.taint;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
};

/** Taint'in maks can çarpanı (1 = Taint yok): 1 - yığın x maxHpLoss, teknik taban minFactor (can sıfıra inmesin). */
export function taintHpFactor(stacks: number, cfg: CrownSurgeConfig['taint'] = SURGE.taint): number {
  const n = Math.max(0, Math.floor(stacks));
  if (n <= 0) return 1;
  return Math.max(cfg.minFactor, Math.round((1 - cfg.maxHpLoss * n) * 1000) / 1000);
}

/** Gösterim: Taint'in maks can kaybı yüzdesi (2 yığın -> 6). */
export const taintHpLossPct = (stacks: number): number => Math.round((1 - taintHpFactor(stacks)) * 100);

/** Taint'i savaş kurulumuna uygular (YERİNDE; yaralar gibi UnitModifiers.hpMult / hpAdd üstünden, çarpımsal). Taint yoksa dokunmaz. */
export function applyTaint(setup: UnitSetup, stacks: number): UnitSetup {
  const f = taintHpFactor(stacks);
  if (f >= 1) return setup;
  const m = { ...(setup.modifiers ?? {}) };
  m.hpMult = Math.round((m.hpMult ?? 1) * f * 1000) / 1000;
  if (m.hpAdd) m.hpAdd = Math.round(m.hpAdd * f);
  setup.modifiers = m;
  return setup;
}

/** Seferin bir sonraki Surge kullanımının vereceği Taint (C4: 1., 2., 3. kullanım = firstGain, +gainStep, ...). */
export function nextTaintGain(s: Pick<CampaignState, 'surge'>): number {
  const uses = Math.max(0, Math.floor(s.surge?.uses ?? 0));
  return Math.max(0, SURGE.taint.firstGain + uses * SURGE.taint.gainStep);
}

/** Bölge hakkının anahtarı ('<harita>:<bölge>:<surge id>'). */
const spentKey = (mapId: string, region: string, id: string): string => `${mapId}:${region}:${id}`;

/** Salt Surge açık mı (Drowned Queen yenildi; C9). */
export const saltUnlocked = (s: Pick<CampaignState, 'surge'>): boolean => !!s.surge?.salt;

/** Bulunulan düğümün bölgesi (yoksa null). */
function regionAt(s: Pick<CampaignState, 'mapId' | 'at'>): string | null {
  return findNode(getMap(s.mapId), s.at)?.region ?? null;
}

/** Bu haritada Surge var mı (C12 a). */
export const surgeOnMap = (mapId: string): boolean => SURGE.maps.includes(mapId);

/**
 * Bulunulan düğümün savaşına verilecek Surge id'leri (C3 a: bölge başına her tür için bir hak; harcanmışsa yok). Taç yoksa (harita listede değil,
 * bölgesi yok) boş. Ash her zaman, Salt yalnızca açıldıysa.
 */
export function surgeIdsAt(s: Pick<CampaignState, 'mapId' | 'at' | 'surge'>): string[] {
  if (!surgeOnMap(s.mapId)) return [];
  const region = regionAt(s);
  if (!region) return [];
  const spent = s.surge?.spent ?? [];
  const ids = [SURGE.ash, ...(saltUnlocked(s) ? [SURGE.salt.id] : [])];
  return ids.filter((id) => !spent.includes(spentKey(s.mapId, region, id)));
}

/** Savaşın 'party-i' birimleri için Surge olayından çağıran kahraman (Battle.log 'surge' olayı; yoksa undefined). */
export function surgedFromLog(log: ReadonlyArray<{ type: string; actor?: string; side?: string; id?: string }>, heroOrder: readonly string[]): BattleOutcome['surged'] {
  for (const e of log) {
    if (e.type !== 'surge' || e.side !== 'party' || !e.actor || !e.id || !/^party-\d+$/.test(e.actor)) continue;
    const heroId = heroOrder[Number(e.actor.slice('party-'.length))];
    if (heroId) return { heroId, id: e.id };
  }
  return undefined;
}

/**
 * Savaşta çağrılan Surge'ü sefere işler (YERİNDE): bulunulan bölgenin o türdeki hakkı harcanır, kullanım sayacı artar, çağıran kahraman nextTaintGain
 * kadar Taint alır (alınan toplam `taken`'a eklenir). YENİLGİDE ÇAĞRILMAZ (Ömer 2026-10-27, open-questions 445: hak yenilgide gitmez; Taint ve sayaç
 * da yazılmaz): zafer ve devriyeden geri çekilme işler; yenilgi (applyBattle), Dive ve Pit yenilgisi işlemez.
 */
export function applySurgeOutcome(t: CampaignState, surged: BattleOutcome['surged']): void {
  if (!surged) return;
  const region = regionAt(t) ?? '';
  const gain = nextTaintGain(t);
  const sv = { ...(t.surge ?? {}) };
  sv.spent = [...new Set([...(sv.spent ?? []), spentKey(t.mapId, region, surged.id)])];
  sv.uses = Math.max(0, Math.floor(sv.uses ?? 0)) + 1;
  sv.taken = Math.max(0, Math.floor(sv.taken ?? 0)) + gain;
  t.surge = sv;
  const h = t.roster.find((x) => x.id === surged.heroId) ?? t.reserve?.find((x) => x.id === surged.heroId);
  if (h && gain > 0) h.taint = taintOf(h) + gain;
}

/** Bu düğüm Taint'i temizleyen bir Chapel dinlenme düğümü mü (C5 b). */
export const isChapel = (mapId: string, nodeId: string): boolean => !!SURGE.chapels[mapId]?.includes(nodeId) && findNode(getMap(mapId), nodeId)?.type === 'rest';

/** Kadrodaki (takım + yedek + Inn) herkesin Taint'ini siler (YERİNDE). Silinen toplam yığın döner. */
export function cleanseTaint(t: CampaignState): number {
  let n = 0;
  const all: Hero[] = [...t.roster, ...(t.reserve ?? []), ...(t.inn ?? []).map((x) => x.hero)];
  for (const h of all) {
    n += taintOf(h);
    delete h.taint;
  }
  return n;
}

/** Chapel'de kullanım sayacını sıfırlamanın altın fiyatı (crown-surge.json > reset.gold; bu haritada yoksa null). */
export function surgeResetPrice(mapId: string): number | null {
  const g = SURGE.reset?.gold?.[mapId];
  return typeof g === 'number' && Number.isFinite(g) && g > 0 ? Math.round(g) : null;
}

/** Bulunulan düğüm bir Chapel mi (Taint temizliği + sayaç sıfırlama teklifi). */
export const atChapel = (s: Pick<CampaignState, 'mapId' | 'at'>): boolean => isChapel(s.mapId, s.at);

/**
 * Chapel'de sayaç sıfırlanabilir mi (null = evet, yoksa nedeni; İngilizce, arayüzde aynen). Chapel'de olmalı, haritada fiyat olmalı, duraklatılmış
 * savaş olmamalı, sayaç sıfırın üstünde olmalı ve altın yetmeli.
 */
export function surgeResetBlocked(s: CampaignState): string | null {
  if (!atChapel(s)) return 'Only a chapel can ease the Crown';
  const price = surgeResetPrice(s.mapId);
  if (price === null) return 'This chapel cannot ease the Crown';
  if (s.suspended) return 'Finish the paused battle first';
  if (Math.max(0, Math.floor(s.surge?.uses ?? 0)) <= 0) return 'The Crown asks nothing more of you yet';
  if ((s.gold ?? 0) < price) return `You need ${price} gold`;
  return null;
}

/**
 * Chapel'de altınla kullanım sayacını sıfırlar (Ömer 2026-10-27): fiyat düşer, `uses` silinir (bir sonraki Surge yine firstGain Taint verir).
 * Harcanan bölge hakları, `taken` ve Salt açıklığı değişmez; Taint yığınlarına dokunmaz (onları varış temizliği siler). Yapılamıyorsa Error.
 */
export function resetSurgeUses(s: CampaignState): CampaignState {
  const why = surgeResetBlocked(s);
  if (why) throw new Error(why);
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  t.gold -= surgeResetPrice(t.mapId)!;
  const sv = { ...(t.surge ?? {}) };
  delete sv.uses;
  if (Object.keys(sv).length) t.surge = sv;
  else delete t.surge;
  return t;
}

/** Bu zafer Salt Surge'ü açar mı (unlock haritası + düğümü). */
export const unlocksSalt = (mapId: string, nodeId: string): boolean => SURGE.salt.unlock.map === mapId && SURGE.salt.unlock.node === nodeId;

/** Kayıttan okunan Surge alanını onarır (bozuk parçalar atılır; boşsa undefined). */
export function normalizeSurge(v: unknown): CampaignState['surge'] {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const out: NonNullable<CampaignState['surge']> = {};
  if (Array.isArray(o['spent'])) {
    const spent = o['spent'].filter((x): x is string => typeof x === 'string');
    if (spent.length) out.spent = [...new Set(spent)];
  }
  const int = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
  if (int(o['uses'])) out.uses = int(o['uses']);
  if (int(o['taken'])) out.taken = int(o['taken']);
  if (o['salt'] === true) out.salt = true;
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------- debug

/** Debug: bulunulan bölgenin (ya da `all`: her yerin) harcanmış Surge haklarını geri verir. */
export function debugRefillSurge(s: CampaignState, all = false): CampaignState {
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  if (!t.surge?.spent) return t;
  const prefix = `${t.mapId}:${regionAt(t) ?? ''}:`;
  t.surge.spent = all ? [] : t.surge.spent.filter((k) => !k.startsWith(prefix));
  if (!t.surge.spent.length) delete t.surge.spent;
  return t;
}

/** Debug: aktif takımdaki her kahramana `n` Taint ekler (n < 0: tüm Taint'i siler). */
export function debugAddTaint(s: CampaignState, n: number): CampaignState {
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  if (n < 0) {
    cleanseTaint(t);
    return t;
  }
  const active = new Set(t.active.filter(Boolean));
  for (const h of t.roster) if (active.has(h.id)) h.taint = taintOf(h) + Math.floor(n);
  return t;
}

/** Debug: Surge kullanım sayacına `n` ekler (Chapel sıfırlamasını denemek için; Taint vermez). */
export function debugAddSurgeUses(s: CampaignState, n: number): CampaignState {
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  const uses = Math.max(0, Math.floor(t.surge?.uses ?? 0)) + Math.max(0, Math.floor(n));
  const sv = { ...(t.surge ?? {}) };
  if (uses > 0) sv.uses = uses;
  else delete sv.uses;
  if (Object.keys(sv).length) t.surge = sv;
  else delete t.surge;
  return t;
}

/** Debug: Salt Surge'ü açar / kapatır. */
export function debugSetSalt(s: CampaignState, on: boolean): CampaignState {
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  const sv = { ...(t.surge ?? {}) };
  if (on) sv.salt = true;
  else delete sv.salt;
  t.surge = sv;
  if (!Object.keys(sv).length) delete t.surge;
  return t;
}
