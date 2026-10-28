import { woundCount } from '../progression/wounds';
import { normalizeSurge, taintOf } from './surge';
import { CONFIG, MAPS } from './data';
import { findNode } from './graph';
import { activeHeroes, canReplay, clearedProgress, formationGate, nodeCleared, stopNumber } from './state';
import { validCampaignSuspended } from './suspend';
import { pitOf } from './pit';
import { oathDef } from './oath';
import { sanitizeHeroQuests } from './quests';
import { boonIds } from './side-content';
import { emptyEquipment, migrateItemRolls, migrateOffhand, migrateRollsX2, promoteOffhand, SLOT_IDS, stripUnusable, type ItemInstance } from '../progression/items';
import { classes, valorRules } from '../engine/content';
import { giveStarterIfUnarmed } from '../progression/weapon';
import { normalizeLevelFields } from '../progression/levels';
import { normalizeTree } from '../progression/skill-tree-hero';
import { normalizeSpdRoll } from '../progression/loadout';
import { clampValor } from '../engine/valor';
import type { CampaignMode, CampaignState, Difficulty, Hero } from './types';

/**
 * Sefer kaydı (campaign.md 5.2-5.3 + madde 256): tarayıcıda tek anahtar, sürümlü JSON. Depolama dışarıdan verilir (tarayıcıda localStorage, testte bellek).
 *  - 3 SEFER YUVASI (`rules.slots`): her yuvada bir sefer (mod + zorluk sabit) ve o seferin KENDİ kayıt listesi.
 *  - Kasaba işlemlerinden sonra da otomatik (writeCheckpointSave; aynı düğümde tek kayıt, Normal ve Ironman; playtest B1).
 *  - Normal: zafer sonrası otomatik + sefer başında + haritada elle; yuva başına en fazla `maxSaves.normal` (5), yeni gelince en eskisi silinir.
 *  - Ironman: yalnızca zafer sonrası; yuva başına tek kayıt (`maxSaves.ironman` = 1), her kayıt öncekinin üstüne yazar.
 *  - Continue: en son oynanan yuvanın en yeni kaydı.
 * Sürüm 1 (tek liste) okunurken yuvalara taşınır (en yeni sefer Slot 1). Bozuk/eksik kayıt oyunu çökertmez: okunamayan dosya boş sayılır
 * (`corrupt` bayrağı), geçersiz tek kayıtlar atlanır.
 */

export const SAVE_KEY = 'eov.campaign.v1';
/** Kayıt dosyası sürümü. 3 (madde 278): sefer durumu v2 (kahraman level/XP/ekipman, torba, altın); 2 ve 1 okunurken taşınır. */
/** 4: x2 stat ölçeği (Ömer 2026-10-10): 2 ve 3 okunurken item zarlarının ölçekli statları x2 (progression > migrateRollsX2). */
/** 5: affix kademeleri (Ömer 2026-10-11): eski stat zarları en yakın affix biçimine çevrilir (progression > migrateItemRolls; hiçbir durumda çökmez). */
/**
 * 6: Valdoria A1-x haritası (Ömer 2026-10-11): eski seferler YENİ haritaya taşınmaz; okunurken yuvaların kayıtları silinir, yuva (mod, zorluk)
 * kalır ve `mapChanged` işaretlenir: arayüz "The Valdoria map has changed; this campaign must restart." uyarısını gösterir, yuvada yeni sefer başlar.
 */
/**
 * 7: Valor (Ömer 2026-10-13): sefer durumuna isteğe bağlı `valor` alanı. Sürüm 6 kayıtları aynen okunur (harita aynı); Valdren Keep'i (Valor'un
 * tanıtıldığı kasaba) çoktan geçmiş eski kayıt Valor'u hediye miktarıyla açılmış olarak alır, geçmemiş kayıt kapalı kalır (normalizeState).
 */
/**
 * 8: Item Güçlendirme (Ömer 2026-10-17): silah gücü + sınıf başına başlangıç silahı. Sürüm 7 ve öncesi okunurken silah yuvası boş her kahramana
 * sınıfının başlangıç silahı takılır (progression > giveStarterIfUnarmed; var olan item'ler aynen kalır). Silah alan kahramanı olan kaydın
 * duraklatılmış savaşı atılır (kurulum değişti; savaş baştan başlar). Yalnızca göçte: oyuncunun sonradan çıkardığı silah geri gelmez.
 */
/**
 * 9: Level / XP (Ömer 2026-10-17, levels.md): kahramana stat / skill puanı ve dağıtılmış puanlar (`statPoints`, `skillPoints`, `alloc`).
 * Sürüm 8 ve öncesi okunurken level ve XP AYNEN kalır (yoksa 1 / 0); eksik puanlar level'dan tamamlanır (progression > normalizeLevelFields).
 * Sınıfların başlangıç statları değiştiği için duraklatılmış savaş kurulumu tutmaz: suspend.ts > canResume onu atar (savaş baştan).
 */
/**
 * 10: Serbest dolaşım (roadmap 2.1, Ömer 2026-10-09 kararları): sefer durumuna `visited`, `cleared`, `replays` (ve duraklatılmış devriyede
 * `patrol`). Sürüm 9 ve öncesi okunurken `visited` / `cleared` yürüyüş günlüğünden (path) türetilir, `replays` boş; kapanan dal kavramı
 * kalktığı için başka bir şey değişmez (normalizeState > upgradeRoam; her okumada çalışır, idempotent).
 */
/**
 * 11: Can ve ölüm reworkü (Ömer 2026-10-19, hp-death-rework.md): kahraman başına `wounds` (yara sayısı). Sürüm 10 ve öncesi okunurken
 * herkes 0 yara (alan yok); eski cesetler ceset kalır (Valor kaldırır). Bozuk değer 0'a düşer (normalizeState; her okumada, idempotent).
 */
/**
 * 12: Skill ağacı (Moments; plan docs/design/skill-tree-implementation.md 3.3, Faz 1b): kahraman başına isteğe bağlı `tree` (onaylı dağılım),
 * `freeRespec` (ağaç verisi değişti: bir kez bedava sıfırlama) ve `treeReset` (okumada iade bildirimi). `skillPoints` = harcanmamış puan.
 * Göç yok: sürüm 11 ve öncesi okunurken alan yok = boş ağaç, puanlar aynen. Her okumada onarım (progression > normalizeTree; idempotent).
 */
export const SAVE_VERSION = 12;
export const SLOT_COUNT = CONFIG.rules.slots;

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveKind = 'auto' | 'manual' | 'start';

export interface SaveSummary {
  map: string;
  stop: number;
  stops: number;
  node: string;
  region: string;
  classes: string[];
  hp: number[];
  victories: number;
  /** Temizlenmiş / toplam düğüm (sürüm 10; eski kayıt kartında yok, kart "Stop" yazar). */
  cleared?: number;
  total?: number;
}

export interface SaveEntry {
  id: string;
  kind: SaveKind;
  savedAt: string;
  mode: CampaignMode;
  campaignId: string;
  summary: SaveSummary;
  state: CampaignState;
}

/** Bir sefer yuvası: seferin kimliği, sabit modu ve zorluğu, kayıtları (eskiden yeniye). */
export interface SlotData {
  campaignId: string;
  mode: CampaignMode;
  difficulty: Difficulty;
  startedAt: string;
  lastPlayed: string;
  saves: SaveEntry[];
  /** Harita değişti (sürüm < 6 kaydı): eski sefer yeniden başlamalı; yuvada yeni sefer başlayınca kalkar. */
  mapChanged?: boolean;
}

export interface SaveFile {
  version: number;
  counter: number;
  /** En son oynanan yuva (Continue). */
  lastSlot: number | null;
  slots: Array<SlotData | null>;
}

const emptySlots = (): Array<SlotData | null> => Array.from({ length: SLOT_COUNT }, () => null);
const empty = (): SaveFile => ({ version: SAVE_VERSION, counter: 0, lastSlot: null, slots: emptySlots() });
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
const maxFor = (mode: CampaignMode) => (mode === 'ironman' ? CONFIG.rules.maxSaves.ironman : CONFIG.rules.maxSaves.normal);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const isItem = (it: unknown): it is ItemInstance =>
  !!it &&
  typeof it === 'object' &&
  typeof (it as ItemInstance).uid === 'string' &&
  typeof (it as ItemInstance).id === 'string' &&
  ((it as ItemInstance).rolls === undefined || (typeof (it as ItemInstance).rolls === 'object' && (it as ItemInstance).rolls !== null));

/**
 * Sefer durumu v1 -> v2 (madde 278): kahramana level 1, XP 0, boş 6 yuva; sefere boş torba, 0 altın. v2'de eksik/bozuk alanlar da aynı
 * varsayılanlarla tamamlanır (bozuk item girdisi atılır). Diğer her şey aynen kalır.
 */
function upgradeState(s: CampaignState): void {
  const raw = s as unknown as Record<string, unknown>;
  if (raw.version === 1) raw.version = 2;
  const overflow: ItemInstance[] = []; // ikinci el taşıması: ikinci el doluysa oradaki item torbaya
  let stripped = false; // sınıfın takamadığı item yuvadan çıktı mı (kurulum değişti: yarım savaş atılır)
  const upgradeHero = (h: Hero): Hero => {
      if (!h || typeof h !== 'object') return h;
      const eq = emptyEquipment();
      const old = (h as Partial<Hero>).equipment as Record<string, unknown> | undefined;
      if (old && typeof old === 'object') {
        for (const k of SLOT_IDS) if (isItem(old[k])) eq[k] = old[k] as ItemInstance;
      } else if (typeof h.id === 'string' && typeof h.class === 'string') {
        // Ekipmanı hiç olmayan (durum v1) kahraman: sınıfının başlangıç silahı (Item Güçlendirme x5; ekipmanı olan kahramana dokunulmaz)
        giveStarterIfUnarmed({ id: h.id, class: h.class, equipment: eq });
      }
      // 2026-10-12 ikinci el yuvası: silah yuvasındaki kalkan ikinci ele geçer (sürüm artmaz; her okumada çalışır, idempotent)
      migrateOffhand(eq, overflow);
      // 2026-10-28 (Ömer): sınıfın artık takamadığı item (örn. war_maul hammers ailesine geçti, Warrior kullanamaz) torbaya döner; yarım savaş atılır
      if (stripUnusable(h.class, eq, overflow).length) stripped = true;
      promoteOffhand(eq); // 2026-10-14: ana el boşken ikinci eldeki hançer ana ele (eski Equip best hatası)
      const out = { ...h, equipment: eq };
      normalizeLevelFields(out); // level / XP / puanlar (sürüm 9; bozuk değer varsayılana, hiçbir şey geri alınmaz)
      if (typeof s.seed === 'number') normalizeSpdRoll(out, s.seed); // kişisel hız zarı (Ömer 2026-10-24; sürüm artmaz, idempotent)
      normalizeTree(out); // skill ağacı (sürüm 12): bozuk dağılım bedava iade + treeReset, skillPoints = havuz - harcanan, veri değiştiyse freeRespec
      return out;
  };
  if (Array.isArray(s.roster)) s.roster = s.roster.map(upgradeHero);
  // Yedek (kışla değişimi, Ömer 2026-10-25; isteğe bağlı alan): kahramanlar kadro gibi yükseltilir, bozuk / kadroyla çakışan girdi atılır
  if (s.reserve !== undefined) {
    const ids = new Set(Array.isArray(s.roster) ? s.roster.map((h) => h?.id) : []);
    const ok = Array.isArray(s.reserve) ? s.reserve.filter((h) => h && typeof h === 'object' && typeof h.id === 'string' && typeof h.class === 'string' && !!classes[h.class] && typeof h.hpRatio === 'number' && !ids.has(h.id)).map(upgradeHero) : [];
    const valid = ok.filter((h) => typeof h.level === 'number' && typeof h.xp === 'number' && !!h.equipment);
    if (valid.length) s.reserve = valid;
    else delete (s as { reserve?: unknown }).reserve;
  }
  // Inn (Ömer 2026-10-26; isteğe bağlı alan): kahramanlar kadro gibi yükseltilir; bozuk / kadroyla ya da yedekle çakışan girdi atılır
  if (s.inn !== undefined) {
    const ids = new Set([...(Array.isArray(s.roster) ? s.roster : []), ...(s.reserve ?? [])].map((h) => h?.id));
    const ok = Array.isArray(s.inn)
      ? s.inn
          .filter((x) => x && typeof x === 'object' && typeof x.town === 'string' && typeof x.mapId === 'string' && !!MAPS[x.mapId] && x.hero && typeof x.hero === 'object' && typeof x.hero.id === 'string' && typeof x.hero.class === 'string' && !!classes[x.hero.class] && typeof x.hero.hpRatio === 'number' && !ids.has(x.hero.id))
          .map((x) => ({ hero: upgradeHero(x.hero), mapId: x.mapId, town: x.town, day: typeof x.day === 'number' && Number.isInteger(x.day) && x.day >= 1 ? x.day : 1 }))
      : [];
    const valid = ok.filter((x) => typeof x.hero.level === 'number' && typeof x.hero.xp === 'number' && !!x.hero.equipment);
    if (valid.length) s.inn = valid;
    else delete (s as { inn?: unknown }).inn;
  }
  // Gün (Ömer 2026-10-26; isteğe bağlı alanlar): eski kayıtta yok = gün 1, ilerleme 0; bozuk değer varsayılana
  s.day = typeof s.day === 'number' && Number.isInteger(s.day) && s.day >= 1 ? s.day : 1;
  s.dayProgress = typeof s.dayProgress === 'number' && s.dayProgress >= 0 && s.dayProgress < 1 ? s.dayProgress : 0;
  if (s.campsUsed !== undefined && !(s.campsUsed && typeof s.campsUsed === 'object' && !Array.isArray(s.campsUsed))) delete (s as { campsUsed?: unknown }).campsUsed;
  // A1 Wayshrine nimetleri (isteğe bağlı alan, sürüm değişmez; open-questions 428): bilinmeyen / tekrar eden id atılır, boşsa alan silinir
  if (s.boons !== undefined) {
    const ok = boonIds(s);
    if (ok.length) s.boons = ok;
    else delete (s as { boons?: unknown }).boons;
  }
  // B1 Salvage Dive (isteğe bağlı alan): bozuksa ya da bulunulan düğümün değilse atılır (hazine adımı baştan, ek sandıklar yok)
  const dv = s.dive as unknown as Record<string, unknown> | undefined;
  if (dv !== undefined && !(dv && dv.node === s.at && typeof dv.depth === 'number' && Number.isInteger(dv.depth) && dv.depth >= 1 && (dv.diving === undefined || dv.diving === true)))
    delete (s as { dive?: unknown }).dive;
  s.inventory = [...(Array.isArray(s.inventory) ? s.inventory.filter(isItem) : []), ...overflow.filter(isItem)];
  if (stripped) delete (s as { suspended?: unknown }).suspended;
  // Bekleyen teslim: bozuksa atılır (item'ler zaten torbada; yalnızca gösterilecek an kaybolur)
  const ho = s.pendingHandover as unknown as Record<string, unknown> | undefined;
  if (ho !== undefined && !(ho && typeof ho.node === 'string' && Array.isArray(ho.items) && ho.items.every((u) => typeof u === 'string') && Array.isArray(ho.from)))
    delete (s as { pendingHandover?: unknown }).pendingHandover;
  else if (ho && ho.skippedSets !== undefined && !(Array.isArray(ho.skippedSets) && ho.skippedSets.length <= 6 && ho.skippedSets.every((g) => Array.isArray(g) && g.length > 0 && g.every((u) => typeof u === 'string')))) delete ho.skippedSets;
  const ls = s.lootState as unknown as Record<string, unknown> | undefined;
  s.lootState = {
    rarePity: ls && typeof ls.rarePity === 'number' && ls.rarePity >= 0 ? ls.rarePity : 0,
    clears: ls && ls.clears && typeof ls.clears === 'object' ? Object.fromEntries(Object.entries(ls.clears as Record<string, unknown>).filter(([, v]) => typeof v === 'number')) as Record<string, number> : {},
    // Nadir düşüş sayacı (madde 297): eski kayıtta yok = 0
    rareMisses: ls && typeof ls.rareMisses === 'number' && ls.rareMisses >= 0 ? ls.rareMisses : 0,
  };
  const pl = s.pendingLoot as unknown as Record<string, unknown> | undefined;
  if (pl !== undefined && !(pl && typeof pl.node === 'string' && Array.isArray(pl.items) && typeof pl.gold === 'number' && (pl.left === undefined || (Array.isArray(pl.left) && pl.left.every((x) => typeof x === 'string')))))
    delete (s as { pendingLoot?: unknown }).pendingLoot;
  s.gold = typeof s.gold === 'number' && Number.isFinite(s.gold) && s.gold >= 0 ? s.gold : 0;
  // Duraklatılmış savaş (Ömer 2026-10-14; isteğe bağlı alan, sürüm değişmez): bozuksa ya da başka düğümünse atılır (savaş baştan başlar)
  if (s.suspended !== undefined && !(validCampaignSuspended(s.suspended) && s.suspended.node === s.at)) delete (s as { suspended?: unknown }).suspended;
  // Zorunlu Formation kapısı (Ömer 2026-10-17; isteğe bağlı alan): bozuksa atılır; geçerliliği upgradeRecruitTiming'de (eski kayıt takılmaz)
  if (s.formationDue !== undefined && typeof s.formationDue !== 'string') delete (s as { formationDue?: unknown }).formationDue;
  // Valor (sürüm 7): bozuk değer kırpılır; alanı olmayan eski kayıt Valdren Keep'in hikâyesini / kasabasını bitirmişse hediye ile açılır
  const intro = valorRules.campaign.introNode;
  if (s.valor !== undefined) s.valor = clampValor(valorRules, Number(s.valor));
  else if (Array.isArray(s.done) && (s.done.includes(`${intro}:story`) || s.done.includes(`${intro}:town`))) s.valor = clampValor(valorRules, valorRules.campaign.gift);
  // uid çakışmasın: sıradaki numara mevcut en büyük 'i<n>'den büyük
  const heroes = [...(Array.isArray(s.roster) ? s.roster : []), ...(s.reserve ?? []), ...(s.inn ?? []).map((x) => x.hero)];
  const equipped = heroes.flatMap((h) => (h?.equipment ? SLOT_IDS.map((k) => h.equipment[k]) : []));
  const used = [...s.inventory, ...equipped].filter(isItem).map((it) => Number(/^i(\d+)$/.exec(it.uid)?.[1] ?? 0));
  const next = Math.max(0, ...used) + 1;
  s.nextItemId = Number.isInteger(s.nextItemId) && s.nextItemId >= next ? s.nextItemId : next;
}

/** Eski kayıtlarda olmayan alanları tamamlar (zorluk: varsayılan, yuva; v1 -> v2: kahraman kaydı, torba, altın). Geçersizse null. */
export function normalizeState(x: unknown, slot?: number): CampaignState | null {
  if (!x || typeof x !== 'object') return null;
  const s = { ...(x as CampaignState) };
  const v = (s as unknown as { version: unknown }).version;
  if (v !== 1 && v !== 2) return null;
  upgradeState(s);
  // Düşmüş kahraman (Ömer 2026-10-11): can 0 ya da alive false = ceset; ikisi tutarlı tutulur (eski kayıtlarda herkes ayaktaydı)
  if (Array.isArray(s.roster)) s.roster = s.roster.map((h) => (h && typeof h.hpRatio === 'number' && (h.hpRatio <= 0 || h.alive === false) ? { ...h, hpRatio: 0, alive: false } : h));
  // Yara (sürüm 11): yok / bozuk = 0 (alan silinir), geçerli sayı tam sayıya
  if (Array.isArray(s.roster))
    s.roster = s.roster.map((h) => {
      if (!h || typeof h !== 'object') return h;
      const n = woundCount(h);
      const tn = taintOf(h); // Crown Surge Ashen Taint (isteğe bağlı alan, sürüm değişmez): yok / bozuk = 0
      const { wounds: _w, taint: _t, ...rest } = h;
      return { ...rest, ...(n > 0 ? { wounds: n } : {}), ...(tn > 0 ? { taint: tn } : {}) };
    });
  // Crown Surge sayaçları (isteğe bağlı alan, sürüm değişmez): bozuk parçalar atılır
  const sg = normalizeSurge(s.surge);
  if (sg) s.surge = sg;
  else delete (s as { surge?: unknown }).surge;
  if (!DIFFS.includes(s.difficulty)) s.difficulty = CONFIG.defaultDifficulty;
  if (slot !== undefined) s.slot = slot;
  else if (typeof s.slot !== 'number' || s.slot < 0 || s.slot >= SLOT_COUNT) s.slot = 0;
  upgradeRemovedNodes(s);
  if (!isValidState(s)) return null;
  upgradeReach(s);
  // Geçilen haritalar (harita geçişi M-Q; isteğe bağlı alan, sürüm değişmez): bozuksa / bilinmeyen haritaysa atılır
  if (s.mapsDone !== undefined && !(Array.isArray(s.mapsDone) && s.mapsDone.every((m) => typeof m === 'string' && !!MAPS[m]))) delete (s as { mapsDone?: unknown }).mapsDone;
  upgradePitOath(s);
  // A5 Personal Quests (isteğe bağlı Hero.quests; kayıt sürümü değişmez): bilinmeyen / başka sınıfın / tekrar eden görev id'si atılır
  for (const h of [...s.roster, ...(s.reserve ?? []), ...(s.inn ?? []).map((x) => x.hero)]) if (h && typeof h === 'object') sanitizeHeroQuests(h);
  upgradeRoam(s);
  upgradeRecruitTiming(s);
  return s;
}

/**
 * Katılım zamanı (Ömer 2026-10-27; kayıt sürümü 12 kalır, her okumada çalışır, idempotent): tutorial katılımı Ravenwood'un savaşından önceden
 * Mill Road zaferinin sonrasına taşındı (recruit.when 'after'). Eski kayıtta katılım bitmişse ('2:recruit') adım yeni düğüme yazılır (ikinci
 * kahraman gelmez); bitmemişse state.ts > carriedRecruit kahramanı bulunulan yerde verir. Zorunlu Formation alanı kapı geçerli değilse atılır.
 */
function upgradeRecruitTiming(s: CampaignState): void {
  const map = MAPS[s.mapId];
  const after = map?.nodes.find((n) => n.recruit?.when === 'after');
  if (after && !s.done.includes(`${after.id}:recruit`)) {
    const old = s.done.find((d) => {
      const [id, kind] = d.split(':');
      if (kind !== 'recruit' || id === after.id) return false;
      const w = map!.nodes.find((n) => n.id === id)?.recruit?.when;
      return w !== 'before' && w !== 'after';
    });
    if (old) s.done = s.done.map((d) => (d === old ? `${after.id}:recruit` : d));
  }
  if (s.formationDue !== undefined && !formationGate(s)) delete (s as { formationDue?: unknown }).formationDue;
}

/**
 * Haritadan kaldırılan düğümler (CampaignMap.removedNodes; Harita 2 dr59 Black Caravel cebi gezici elite dönüştü, M-K). Kayıt sürümü değişmez,
 * her okumada çalışır (idempotent): kaldırılan düğümde duran takım yerine konan düğüme taşınır (yolu yürüyüşe eklenir), yürüyüş / ziyaret /
 * temizlenme / devriye listelerinden atılır. Eski cebin savaşı kazanılmışsa (`done` içinde) Caravel yenilmiş sayılır. Yerinde değiştirir.
 */
function upgradeRemovedNodes(s: CampaignState): void {
  const map = typeof s.mapId === 'string' ? MAPS[s.mapId] : undefined;
  const removed = map?.removedNodes;
  if (!removed || !Array.isArray(s.path)) return;
  const gone = (id: unknown) => typeof id === 'string' && id in removed;
  if (Array.isArray(s.done) && s.done.some((d) => typeof d === 'string' && gone(d.split(':')[0]) && d.endsWith(':battle')) && map.reach?.caravel) s.caravel = { i: 0, beaten: true };
  if (gone(s.at)) {
    const to = removed[s.at]!;
    s.at = to;
    s.path = [...s.path, to];
    for (const k of ['suspended', 'patrol', 'eventChoice', 'formationDue', 'dive', 'pit'] as const) delete (s as unknown as Record<string, unknown>)[k];
  }
  s.path = s.path.filter((id) => !gone(id));
  if (!s.path.length) s.path = [s.at];
  if (Array.isArray(s.visited)) s.visited = s.visited.filter((id) => !gone(id));
  if (Array.isArray(s.cleared)) s.cleared = s.cleared.filter((id) => !gone(id));
  if (s.replays && typeof s.replays === 'object') for (const k of Object.keys(s.replays)) if (gone(k)) delete s.replays[k];
}

/**
 * Harita 2 deniz alanları (M-J / M-K / M-L / M-M; isteğe bağlı, kayıt sürümü 12 kalır; eski kayıtta yok = taraf yok, deniz kapalı, fener sönük,
 * Caravel rotanın başında). Bozuk değer atılır. Yerinde değiştirir.
 */
function upgradeReach(s: CampaignState): void {
  if (s.faction !== undefined && s.faction !== 'order' && s.faction !== 'guild') delete (s as { faction?: unknown }).faction;
  if (s.sea !== undefined && s.sea !== true) delete (s as { sea?: unknown }).sea;
  if (s.lit !== undefined && s.lit !== true) delete (s as { lit?: unknown }).lit;
  const c = s.caravel as unknown as { i?: unknown; met?: unknown; beaten?: unknown } | undefined;
  if (c !== undefined) {
    const route = MAPS[s.mapId]?.reach?.caravel?.route ?? [];
    const i = typeof c?.i === 'number' && Number.isInteger(c.i) && c.i >= 0 && c.i < route.length ? c.i : null;
    if (i === null) delete (s as { caravel?: unknown }).caravel;
    else s.caravel = { i, ...(c!.met === s.at && typeof c!.met === 'string' ? { met: c!.met } : {}), ...(c!.beaten === true ? { beaten: true as const } : {}) };
  }
}

/**
 * The Fighting Pit (B5) ve Hero Oath (A4) alanları (open-questions 429; isteğe bağlı, kayıt sürümü değişmez; eski kayıtta yok = arena rekoru yok,
 * yemin yok). Açık arena koşusu yalnız bulunulan arenalı kasabada ve geçerli kademe sayısıyla kalır; başlamış kademe savaşı (`fight`) atılır
 * (savaş yarıdan sürdürülmez: kademe arası pencere yeniden açılır). Rekor: pozitif tam sayılar. Yemin: bilinen yemin + kadroda / yedekte / Inn'de
 * olan kahraman; değilse atılır. Yerinde değiştirir.
 */
function upgradePitOath(s: CampaignState): void {
  const map = MAPS[s.mapId]!;
  const p = s.pit as unknown as { node?: unknown; wins?: unknown } | undefined;
  if (p !== undefined) {
    const n = typeof p?.node === 'string' && p.node === s.at ? findNode(map, p.node) : undefined;
    const def = n ? pitOf(n) : null;
    const wins = p?.wins;
    if (def && typeof wins === 'number' && Number.isInteger(wins) && wins >= 0 && wins <= def.tiers.length) s.pit = { node: s.at, wins };
    else delete (s as { pit?: unknown }).pit;
  }
  const b = s.pitBest as unknown;
  if (b !== undefined) {
    const ok = b && typeof b === 'object' && !Array.isArray(b) ? Object.entries(b as Record<string, unknown>).filter(([, v]) => typeof v === 'number' && Number.isInteger(v) && v > 0) : [];
    if (ok.length) s.pitBest = Object.fromEntries(ok) as Record<string, number>;
    else delete (s as { pitBest?: unknown }).pitBest;
  }
  const o = s.oath as unknown as { hero?: unknown; id?: unknown } | undefined;
  if (o !== undefined) {
    const heroes = [...(Array.isArray(s.roster) ? s.roster : []), ...(s.reserve ?? []), ...(s.inn ?? []).map((x) => x.hero)];
    if (o && typeof o.hero === 'string' && typeof o.id === 'string' && oathDef(o.id) && heroes.some((h) => h?.id === o.hero)) s.oath = { hero: o.hero, id: o.id };
    else delete (s as { oath?: unknown }).oath;
  }
}

/**
 * Sürüm 10 (serbest dolaşım): `visited` / `cleared` yoksa ya da bozuksa yürüyüş günlüğünden türetilir (bulunulan dışındaki her geçilen düğüm
 * temizlenmişti: eski kuralda düğüm bitmeden yola çıkılmazdı; bulunulan düğüm adımları bitmişse temizlenmiş). `replays` bozuksa / yoksa boş.
 * Başlatılmış devriye yalnızca aynı düğümün duraklatılmış savaşıyla kalır. Eski `closedNodes` kavramının kayıtta alanı yoktu (path'ten
 * türetiliyordu): atılacak bir şey yok. Yerinde değiştirir (geçerli durum).
 */
function upgradeRoam(s: CampaignState): void {
  const map = MAPS[s.mapId]!;
  const known = (x: unknown): x is string => typeof x === 'string' && !!findNode(map, x);
  const uniq = (xs: string[]) => [...new Set(xs)];
  s.visited = Array.isArray(s.visited) && s.visited.every(known) ? uniq(s.visited) : uniq([...s.path, s.at]);
  if (!s.visited.includes(s.at)) s.visited.push(s.at);
  if (Array.isArray(s.cleared) && s.cleared.every(known)) s.cleared = uniq(s.cleared);
  else {
    const out = uniq(s.path.filter((id) => id !== s.at));
    if (nodeCleared(s, s.at) && !out.includes(s.at)) out.push(s.at);
    s.cleared = out;
  }
  const r = s.replays as unknown;
  s.replays =
    r && typeof r === 'object' && !Array.isArray(r)
      ? (Object.fromEntries(Object.entries(r as Record<string, unknown>).filter(([k, v]) => known(k) && typeof v === 'number' && Number.isInteger(v) && v > 0)) as Record<string, number>)
      : {};
  if (s.patrol !== undefined && !(s.patrol === s.at && s.suspended?.node === s.at && canReplay(map, findNode(map, s.at)!))) delete (s as { patrol?: unknown }).patrol;
}

/** Kaydedilmiş bir durum oyunda kullanılabilir mi (harita, düğüm, kadro ve dizilim tutarlı)? */
export function isValidState(x: unknown): x is CampaignState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<CampaignState>;
  if (s.version !== 2 || typeof s.seed !== 'number' || typeof s.mapId !== 'string' || typeof s.at !== 'string') return false;
  if (s.mode !== 'normal' && s.mode !== 'ironman') return false;
  if (!DIFFS.includes(s.difficulty as Difficulty) || typeof s.slot !== 'number') return false;
  const map = MAPS[s.mapId];
  if (!map || !findNode(map, s.at)) return false;
  if (!Array.isArray(s.path) || !s.path.every((id) => typeof id === 'string' && findNode(map, id))) return false;
  if (!Array.isArray(s.done) || !Array.isArray(s.tipsSeen) || !Array.isArray(s.active) || !Array.isArray(s.roster)) return false;
  if (!s.roster.every((h) => h && typeof h.id === 'string' && typeof h.class === 'string' && typeof h.hpRatio === 'number')) return false;
  if (!s.roster.every((h) => typeof h.level === 'number' && typeof h.xp === 'number' && !!h.equipment && SLOT_IDS.every((k) => h.equipment[k] === null || isItem(h.equipment[k])))) return false;
  if (!Array.isArray(s.inventory) || !s.inventory.every(isItem) || typeof s.gold !== 'number' || typeof s.nextItemId !== 'number') return false;
  if (!s.lootState || typeof s.lootState.rarePity !== 'number' || typeof s.lootState.clears !== 'object') return false;
  if (!s.stats || typeof s.stats.victories !== 'number' || typeof s.nextHeroId !== 'number' || typeof s.campaignId !== 'string') return false;
  return true;
}

/** Bir kaydı doğrular/tamamlar (geçersizse null). */
function cleanEntry(e: unknown, slot: number): SaveEntry | null {
  if (!e || typeof e !== 'object') return null;
  const x = e as SaveEntry;
  if (typeof x.id !== 'string') return null;
  const state = normalizeState(x.state, slot);
  if (!state) return null;
  return { ...x, state, mode: state.mode, campaignId: state.campaignId };
}

/** Sürüm 1 (tek liste) -> yuvalar: seferler en yeni kaydına göre sıralanır, en yeni sefer Slot 1; her yuvada en yeni kayıtlar (sınır kadar). */
function migrateV1(saves: unknown[], counter: number): { file: SaveFile; dropped: boolean } {
  const file = empty();
  file.counter = counter;
  const groups = new Map<string, SaveEntry[]>();
  /** Seferin eski listedeki en yeni kaydının sırası (eski liste eskiden yeniye). */
  const newest = new Map<string, number>();
  let dropped = false;
  saves.forEach((raw, i) => {
    const e = cleanEntry(raw, 0);
    if (!e) {
      dropped = true;
      return;
    }
    groups.set(e.campaignId, [...(groups.get(e.campaignId) ?? []), e]);
    newest.set(e.campaignId, i);
  });
  const order = [...groups.entries()].sort((a, b) => newest.get(b[0])! - newest.get(a[0])!);
  order.slice(0, SLOT_COUNT).forEach(([campaignId, list], slot) => {
    const mode = list[list.length - 1]!.mode;
    const kept = list.slice(-maxFor(mode)).map((e) => ({ ...e, state: { ...e.state, slot } }));
    file.slots[slot] = { campaignId, mode, difficulty: kept[0]!.state.difficulty, startedAt: kept[0]!.savedAt, lastPlayed: kept[kept.length - 1]!.savedAt, saves: kept };
  });
  if (order.length) file.lastSlot = 0;
  return { file, dropped: dropped || order.length > SLOT_COUNT };
}

/**
 * Ham kayıt dizgisinin dosya sürümü (bulut senkronu: daha yeni şemadan gelen paketi reddetmek için; accounts-plan.md Faz 1b).
 * Yalnızca okur, şemaya dokunmaz. Boş / JSON değil / sürüm sayı değilse null.
 */
export function peekVersion(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const v = (JSON.parse(raw) as { version?: unknown } | null)?.version;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Kayıt dosyasını okur. Hiç kayıt yoksa boş; okunamazsa boş + corrupt. Eski sürüm yuvalara taşınır (`migrated`). */
export function readSaves(kv: KV | null): { file: SaveFile; corrupt: boolean; migrated: boolean } {
  let raw: string | null = null;
  try {
    raw = kv?.getItem(SAVE_KEY) ?? null;
  } catch {
    return { file: empty(), corrupt: true, migrated: false };
  }
  if (!raw) return { file: empty(), corrupt: false, migrated: false };
  try {
    const parsed = JSON.parse(raw) as Partial<SaveFile> & { saves?: unknown[] };
    if (!parsed || typeof parsed !== 'object') return { file: empty(), corrupt: true, migrated: false };
    const counter = typeof parsed.counter === 'number' ? parsed.counter : 0;
    if (parsed.version === 1 && Array.isArray(parsed.saves)) {
      const m = migrateV1(parsed.saves, counter);
      return { file: restartForNewMap(m.file), corrupt: m.dropped, migrated: true };
    }
    // Sürüm 2 (yuvalar, sefer durumu v1) ile 3 aynı dosya düzeni; 2'nin durumları cleanEntry > normalizeState ile v2'ye taşınır
    if ((parsed.version !== SAVE_VERSION && parsed.version !== 2 && parsed.version !== 3 && parsed.version !== 4 && parsed.version !== 5 && parsed.version !== 6 && parsed.version !== 7 && parsed.version !== 8 && parsed.version !== 9 && parsed.version !== 10 && parsed.version !== 11) || !Array.isArray(parsed.slots)) return { file: empty(), corrupt: true, migrated: false };
    // Sürüm < 8 (Item Güçlendirme): silahsız kahramana sınıfının başlangıç silahı
    const starters = parsed.version < 8 ? migrateStarterWeapons(parsed.slots) : 0;
    const fromV2 = parsed.version === 2;
    // x2 stat ölçeği (sürüm 4): eski kayıttaki item zarları (STR/DEX/INT/LUCK, zırh, hız) x2
    const scaled = parsed.version < 6;
    if (parsed.version === 2 || parsed.version === 3) migrateRollsX2(parsed.slots);
    // Affix göçü (sürüm 5): eski stat zarları -> en yakın affix biçimi (okunurken de instanceRoll onarır; asla çökmez)
    if (scaled) migrateItemRolls(parsed.slots);
    const file = empty();
    file.counter = counter;
    let corrupt = false;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const sd = parsed.slots[i] as SlotData | null | undefined;
      if (!sd) continue;
      if (typeof sd !== 'object' || !Array.isArray(sd.saves) || typeof sd.campaignId !== 'string' || (sd.mode !== 'normal' && sd.mode !== 'ironman')) {
        corrupt = true;
        continue;
      }
      const saves = sd.saves.map((e) => cleanEntry(e, i)).filter((e): e is SaveEntry => !!e);
      if (saves.length !== sd.saves.length && parsed.version >= 6) corrupt = true; // eski harita kayıtları zaten yeniden başlar
      file.slots[i] = { ...sd, difficulty: DIFFS.includes(sd.difficulty) ? sd.difficulty : CONFIG.defaultDifficulty, saves };
    }
    file.lastSlot = typeof parsed.lastSlot === 'number' && file.slots[parsed.lastSlot] ? parsed.lastSlot : null;
    // Sürüm < 6: Valdoria haritası değişti; seferler yeniden başlar (yuva korunur, uyarı işareti)
    // Sürüm 6 -> 7 (Valor): harita aynı, kayıtlar korunur; Valor alanı normalizeState'te tamamlanır, dosya yeni sürümle yeniden yazılır
    return { file: parsed.version < 6 ? restartForNewMap(file) : file, corrupt, migrated: fromV2 || scaled || parsed.version === 6 || parsed.version === 7 || parsed.version === 8 || parsed.version === 9 || parsed.version === 10 || parsed.version === 11 || starters > 0 };
  } catch {
    return { file: empty(), corrupt: true, migrated: false };
  }
}

/**
 * Sürüm 8 göçü (Item Güçlendirme x5): her kayıttaki her kahramanın silah yuvası boşsa sınıfının başlangıç silahı takılır; silah alan kahramanı
 * olan kaydın duraklatılmış savaşı atılır (kurulum değişti). Yerinde değiştirir; takılan silah sayısı. Bozuk girdiler atlanır (çökmez).
 */
export function migrateStarterWeapons(slots: unknown): number {
  let n = 0;
  if (!Array.isArray(slots)) return 0;
  for (const sd of slots as Array<Partial<SlotData> | null>) {
    if (!sd || typeof sd !== 'object' || !Array.isArray(sd.saves)) continue;
    for (const e of sd.saves as Array<Partial<SaveEntry> | null>) {
      const st = e && typeof e === 'object' ? (e.state as Partial<CampaignState> | undefined) : undefined;
      if (!st || typeof st !== 'object' || !Array.isArray(st.roster)) continue;
      let given = 0;
      for (const h of st.roster) if (h && typeof h === 'object' && typeof h.id === 'string' && typeof h.class === 'string' && giveStarterIfUnarmed(h)) given++;
      if (given) delete (st as { suspended?: unknown }).suspended;
      n += given;
    }
  }
  return n;
}

/** Eski haritanın seferleri: kayıtlar silinir, yuva (mod, zorluk, tarihler) kalır, `mapChanged` işaretlenir. */
function restartForNewMap(file: SaveFile): SaveFile {
  return { ...file, slots: file.slots.map((sd) => (sd ? { ...sd, saves: [], mapChanged: true } : null)) };
}

function write(kv: KV | null, file: SaveFile): boolean {
  try {
    kv?.setItem(SAVE_KEY, JSON.stringify(file));
    return !!kv;
  } catch {
    return false;
  }
}

/** Eski sürüm okunduysa yeni biçimde geri yazar (açılışta bir kez çağrılır). */
export function migrateSaves(kv: KV | null): boolean {
  const r = readSaves(kv);
  return r.migrated ? write(kv, r.file) : false;
}

export function summarize(s: CampaignState): SaveSummary {
  const map = MAPS[s.mapId]!;
  const n = findNode(map, s.at)!;
  const team = activeHeroes(s);
  return {
    map: map.title,
    stop: stopNumber(s),
    stops: map.stopsPerRun,
    node: n.name,
    region: map.regions.find((r) => r.id === n.region)?.title ?? '',
    classes: team.map((h) => h.class),
    hp: team.map((h) => h.hpRatio),
    victories: s.stats.victories,
    ...clearedProgress(s),
  };
}

/** Kayıt kartındaki ilerleme yazısı: sürüm 10 özeti "Cleared 9/26", eski özet "Stop 7" (long: "Stop 7 of 21"). */
export const progressText = (sum: SaveSummary, long = false): string =>
  sum.cleared !== undefined && sum.total !== undefined ? `Cleared ${sum.cleared}/${sum.total}` : long ? `Stop ${sum.stop} of ${sum.stops}` : `Stop ${sum.stop}`;

/** Elle kayıt yalnızca Normal modda. */
export const canSaveManually = (s: CampaignState): boolean => s.mode === 'normal';

/**
 * Yeni bir seferi yuvaya yerleştirir (yuvadaki eski sefer ve kayıtları silinir: çağıran onay almış olmalı).
 * Kayıt yazmaz (Normal'de ardından 'start' kaydı yazılır; Ironman ilk zafere kadar kayıtsız).
 */
export function claimSlot(kv: KV | null, s: CampaignState, now: string = new Date().toISOString()): boolean {
  const { file } = readSaves(kv);
  file.slots[s.slot] = { campaignId: s.campaignId, mode: s.mode, difficulty: s.difficulty, startedAt: now, lastPlayed: now, saves: [] };
  file.lastSlot = s.slot;
  return write(kv, file);
}

/**
 * Kayıt yazar (seferin yuvasına). Ironman yalnızca 'auto' (zafer sonrası) kabul eder ve tek kayıt tutar. Yuvada başka bir sefer varsa
 * yerine bu sefer geçer. Dönen `replaced`: silinen en eski kayıt(lar).
 */
export function writeSave(kv: KV | null, s: CampaignState, kind: SaveKind, now: string = new Date().toISOString()): { entry: SaveEntry | null; replaced: SaveEntry[]; ok: boolean } {
  if (s.mode === 'ironman' && kind !== 'auto') return { entry: null, replaced: [], ok: false };
  if (s.slot < 0 || s.slot >= SLOT_COUNT) return { entry: null, replaced: [], ok: false };
  const { file } = readSaves(kv);
  let slot = file.slots[s.slot];
  if (!slot || slot.campaignId !== s.campaignId) slot = { campaignId: s.campaignId, mode: s.mode, difficulty: s.difficulty, startedAt: now, lastPlayed: now, saves: [] };
  const entry: SaveEntry = { id: `s${++file.counter}`, kind, savedAt: now, mode: s.mode, campaignId: s.campaignId, summary: summarize(s), state: clone(s) };
  slot.saves.push(entry);
  slot.lastPlayed = now;
  delete slot.mapChanged; // yuvada yeni sefer kaydedildi: harita uyarısı kalkar
  const replaced: SaveEntry[] = [];
  while (slot.saves.length > maxFor(s.mode)) replaced.push(slot.saves.shift()!);
  file.slots[s.slot] = slot;
  file.lastSlot = s.slot;
  return { entry, replaced, ok: write(kv, file) };
}

/**
 * Duraklatma kaydı (Retreat to Map, Ömer 2026-10-14): duraklatılmış savaşlı durum otomatik kaydedilir (Normal ve Ironman; sekme kapansa da
 * savaş aynı turdan sürer). Yuvanın en yeni kaydı aynı düğümün duraklatma kaydıysa onun YERİNE yazılır (geri çek / sürdür döngüsü Normal'in
 * 5 kaydını eritmesin); değilse yeni 'auto' kayıt.
 */
export function writePauseSave(kv: KV | null, s: CampaignState, now: string = new Date().toISOString()): boolean {
  const { file } = readSaves(kv);
  const slot = s.slot >= 0 && s.slot < SLOT_COUNT ? file.slots[s.slot] : null;
  const last = slot?.campaignId === s.campaignId ? slot.saves.at(-1) : undefined;
  if (!slot || !last || last.kind !== 'auto' || !last.state.suspended || last.state.at !== s.at) return writeSave(kv, s, 'auto', now).ok;
  slot.saves[slot.saves.length - 1] = { ...last, savedAt: now, summary: summarize(s), state: clone(s) };
  slot.lastPlayed = now;
  file.lastSlot = s.slot;
  return write(kv, file);
}

/**
 * Kasaba kaydı (Ömer 2026-10-23, playtest B1): kasaba işlemlerinden (alışveriş, katılım, hikâye sonu, Castle Gate) sonra otomatik kayıt;
 * yenilgide "Load Last Save" kasabadaki ilerlemeyi korur. Yuvanın en yeni kaydı aynı düğümün otomatik kaydıysa (duraklatılmış savaşsız) onun
 * YERİNE yazılır: kasabadaki her satın alma Normal'in 5 kaydını eritmesin, elle kayıtlar hiç silinmez. Değilse yeni 'auto' kayıt.
 * Şema değişmez (yeni alan yok).
 */
export function writeCheckpointSave(kv: KV | null, s: CampaignState, now: string = new Date().toISOString()): boolean {
  if (s.slot < 0 || s.slot >= SLOT_COUNT) return false;
  const { file } = readSaves(kv);
  const slot = file.slots[s.slot];
  const last = slot?.campaignId === s.campaignId ? slot.saves.at(-1) : undefined;
  if (!slot || !last || last.kind !== 'auto' || last.state.suspended || s.suspended || last.state.at !== s.at) return writeSave(kv, s, 'auto', now).ok;
  slot.saves[slot.saves.length - 1] = { ...last, savedAt: now, summary: summarize(s), state: clone(s) };
  slot.lastPlayed = now;
  file.lastSlot = s.slot;
  return write(kv, file);
}

/** Kaydın yaşı, oyuncu dili (Defeat ekranı, H4): "just now", "12 min ago", "3 h ago", "2 days ago". */
export function saveAgo(savedAt: string, now: number = Date.now()): string {
  const min = Math.floor((now - Date.parse(savedAt)) / 60000);
  if (!Number.isFinite(min) || min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}

/**
 * Savaş bitti (yenilgi): yuvanın en yeni kaydındaki aynı düğümün duraklatma kaydı silinir (kayıt kalır; Continue / Load Last Save o düğümün
 * savaşını baştan açar, kaybedilen savaş yarıdan sürdürülemez). Değişiklik yoksa false.
 */
export function clearPauseSave(kv: KV | null, s: Pick<CampaignState, 'slot' | 'campaignId' | 'at'>): boolean {
  const { file } = readSaves(kv);
  const slot = s.slot >= 0 && s.slot < SLOT_COUNT ? file.slots[s.slot] : null;
  const last = slot?.campaignId === s.campaignId ? slot.saves.at(-1) : undefined;
  if (!last?.state.suspended || last.state.suspended.node !== s.at) return false;
  delete last.state.suspended;
  return write(kv, file);
}

/** Yuvanın kayıtları en yeni üstte. */
export const listSaves = (kv: KV | null, slot: number): SaveEntry[] => [...(readSaves(kv).file.slots[slot]?.saves ?? [])].reverse();

/** Yuva özetleri (Load Game / New Campaign ekranı): boşsa null. */
export interface SlotSummary {
  slot: number;
  campaignId: string;
  mode: CampaignMode;
  difficulty: Difficulty;
  lastPlayed: string;
  saveCount: number;
  latest: SaveEntry | null;
  /** Harita değişti: bu yuvanın seferi yeniden başlamalı (uyarı). */
  mapChanged?: boolean;
}

export function slotSummaries(kv: KV | null): Array<SlotSummary | null> {
  const { file } = readSaves(kv);
  return file.slots.map((sd, slot) =>
    sd ? { slot, campaignId: sd.campaignId, mode: sd.mode, difficulty: sd.difficulty, lastPlayed: sd.lastPlayed, saveCount: sd.saves.length, latest: sd.saves[sd.saves.length - 1] ?? null, ...(sd.mapChanged ? { mapChanged: true } : {}) } : null,
  );
}

/** En yeni kayıt: yuva verilirse o yuvanın; verilmezse en son oynanan yuvanın (Continue). */
export function latestSave(kv: KV | null, slot?: number): SaveEntry | null {
  const { file } = readSaves(kv);
  const pick = (i: number | null | undefined) => (i === null || i === undefined ? null : (file.slots[i]?.saves.at(-1) ?? null));
  if (slot !== undefined) return pick(slot);
  const last = pick(file.lastSlot);
  if (last) return last;
  // yedek: kaydı olan yuvalardan en son oynanan
  const best = file.slots
    .map((sd, i) => ({ sd, i }))
    .filter((x) => x.sd?.saves.length)
    .sort((a, b) => (b.sd!.lastPlayed > a.sd!.lastPlayed ? 1 : -1))[0];
  return best ? pick(best.i) : null;
}

/** Anahtar sırasından bağımsız JSON (kayıttan okunan durumla bellekteki durumu karşılaştırmak için). */
function stableJson(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stableJson).join(',')}]`;
  if (x && typeof x === 'object')
    return `{${Object.keys(x)
      .filter((k) => (x as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((x as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(x) ?? 'null';
}

/**
 * Son kayıttan beri kaydedilmemiş ilerleme var mı (sefer haritası ◂ Back uyarısı, Ömer 2026-10-12). Ironman her adımda kendiliğinden
 * kaydettiği için hiçbir zaman true değildir. Görülen ipuçları (`tipsSeen`) ilerleme sayılmaz. Yuvada bu seferin kaydı yoksa true.
 */
export function hasUnsavedProgress(kv: KV | null, s: CampaignState): boolean {
  if (s.mode === 'ironman') return false;
  const last = latestSave(kv, s.slot);
  if (!last || last.campaignId !== s.campaignId) return true;
  const strip = (x: CampaignState) => ({ ...x, tipsSeen: [] });
  return stableJson(strip(last.state)) !== stableJson(strip(s));
}

/** Bir yuvayı "son oynanan" yapar (yükleme / Continue). */
export function markPlayed(kv: KV | null, slot: number, now: string = new Date().toISOString()): void {
  const { file } = readSaves(kv);
  const sd = file.slots[slot];
  if (!sd) return;
  sd.lastPlayed = now;
  file.lastSlot = slot;
  write(kv, file);
}

export function deleteSave(kv: KV | null, slot: number, id: string): void {
  const { file } = readSaves(kv);
  const sd = file.slots[slot];
  if (!sd) return;
  sd.saves = sd.saves.filter((e) => e.id !== id);
  write(kv, file);
}

/** Yuvayı tamamen boşaltır (sefer ve tüm kayıtları). */
export function deleteSlot(kv: KV | null, slot: number): void {
  const { file } = readSaves(kv);
  file.slots[slot] = null;
  if (file.lastSlot === slot) file.lastSlot = null;
  write(kv, file);
}

export function wipeSaves(kv: KV | null): void {
  try {
    kv?.removeItem(SAVE_KEY);
  } catch {
    /* depolama kapalı */
  }
}

/** Yuvadaki kayıt sayısı. */
export const saveCount = (kv: KV | null, slot: number): number => readSaves(kv).file.slots[slot]?.saves.length ?? 0;

/** Yeni kayıt yuvadaki en eskiyi silecek mi (Normal: "Oldest save will be replaced")? */
export function willReplaceOldest(kv: KV | null, slot: number, mode: CampaignMode): boolean {
  return saveCount(kv, slot) >= maxFor(mode);
}

/** Bellekte depolama (testler ve localStorage kapalıyken). */
export function memoryKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
