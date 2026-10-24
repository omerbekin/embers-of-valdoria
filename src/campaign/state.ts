import { classes, defaultSlots, skills, CELL_COUNT } from '../engine/content';
import { CONFIG, ENCOUNTERS, EVENTS, STORIES, TREASURES, getMap, type EventChoice } from './data';
import { finalNode, incoming, neighbors, node, outgoing, undirectedDistances, upstreamOf } from './graph';
import { rngFor, shuffle } from './seed';
import { SLOT_IDS, canEquip, itemDef } from '../progression/items';
import { starterEquipment } from '../progression/weapon';
import { itemRecovery } from '../progression/loadout';
import { fallAfterVictory, healWounds, valorClearWounds, woundCount, woundsLine, type WoundRules } from '../progression/wounds';
import { emptyLootState, grantGift, grantLoot } from './loot';
import { leaveMerchant } from './merchant';
import { valorRules } from '../engine/content';
import { addValor, canReviveOutside, valorEarned } from '../engine/valor';
import { applyXp, battleXp, fixedXp, fixedXpNode, joinLevel } from './xp';
import { LEVELS, campaignMaxLevel, setLevel } from '../progression/levels';
import type { BattleOutcome, CampaignMap, CampaignMode, Difficulty, CampaignRules, CampaignState, Hero, MapNode, NextStep, StepKind } from './types';

/**
 * Sefer ilerlemesi (saf; durum JSON'dur ve her işlem YENİ bir durum döndürür). Akış: campaign.md 1.2 ve 4.
 * Bir düğümdeki adımlar sırayla tamamlanır (nodeSteps); hepsi bitince yola çıkılır (moveTo).
 * Serbest dolaşım (roadmap 2.1, Ömer 2026-10-09 kararları): kenarlar iki yönlü yürünür, seçilen yol kilitlenmez; temizlenmiş düğümlerden
 * geçerek uzak düğüme tek hamlede yolculuk (travelRoutes). Temizlenmiş Battle / Elite / Guarded Treasure düğümünde devriye (yeniden oynama,
 * azalan getiri) başlatılabilir (startPatrol). Tutorial (bölük kurma düğümünden öncesi) tek yönlü kalır ve yeniden oynanmaz.
 */

export const clone = (s: CampaignState): CampaignState => JSON.parse(JSON.stringify(s)) as CampaignState;

/** Duraklatılmış savaş (src/campaign/suspend.ts) varken haritada yasak eylemlerin notu. */
export const PAUSED_LOCK = 'Finish the paused battle first';
/** Duraklatılmış savaş varken yola çıkmak, Formation, Gear, Valor diriltmesi kilitli: nedeni (yoksa null). */
export const pausedLock = (s: CampaignState | null): string | null => (s?.suspended ? PAUSED_LOCK : null);
const key = (nodeId: string, kind: StepKind) => `${nodeId}:${kind}`;
export const mapOf = (s: CampaignState): CampaignMap => getMap(s.mapId);

export function newCampaign(o: { mode: CampaignMode; seed: number; mapId?: string; campaignId?: string; difficulty?: Difficulty; slot?: number }): CampaignState {
  const map = getMap(o.mapId ?? CONFIG.maps[0]!);
  return {
    version: 2,
    campaignId: o.campaignId ?? `c-${o.seed}`,
    mode: o.mode,
    difficulty: o.difficulty ?? CONFIG.defaultDifficulty,
    slot: o.slot ?? 0,
    mapId: map.id,
    seed: o.seed,
    roster: [],
    active: Array.from({ length: CELL_COUNT }, () => ''),
    at: map.start,
    path: [map.start],
    visited: [map.start],
    cleared: [],
    replays: {},
    done: [],
    tipsSeen: [],
    stats: { victories: 0, defeats: 0 },
    nextHeroId: 1,
    inventory: [],
    gold: 0,
    nextItemId: 1,
    lootState: emptyLootState(),
  };
}

/** Bir düğümün adımları (sırayla). Başlangıç düğümünde önce kahraman seçimi. */
export function nodeSteps(map: CampaignMap, n: MapNode): StepKind[] {
  const steps: StepKind[] = [];
  if (n.id === map.start) steps.push('hero');
  if (n.recruit?.when === 'before') steps.push('recruit');
  if (n.endsTutorial) steps.push('farewell');
  if (n.newCompany) steps.push('company');
  if (n.encounter) steps.push('battle');
  if (n.treasure) steps.push('treasure');
  if (n.event) steps.push('event');
  if (n.story) steps.push('story'); // kasaba hikâye sahnesi (T5): kasaba eylemlerinden önce, bir kez
  if (n.type === 'town') steps.push('town');
  if (n.type === 'rest' || n.rest) steps.push('rest'); // dinlenme noktası ya da olaydan sonra dinlenme (Shepherd's Fold; Ömer 2026-10-11)
  if (n.type === 'merchant') steps.push('merchant');
  if (n.recruit?.when === 'leave') steps.push('volunteer');
  return steps;
}

/** Adım bitti mi? Sahne (story), kasaba adımı bitmişse de bitmiş sayılır (sahneden önceki kayıtlar onu yeniden göstermez). */
export const isDone = (s: CampaignState, nodeId: string, kind: StepKind): boolean =>
  s.done.includes(key(nodeId, kind)) || (kind === 'story' && s.done.includes(key(nodeId, 'town')));

/** Düğümün tüm adımları bitti mi? */
export function nodeCleared(s: CampaignState, nodeId: string): boolean {
  const map = mapOf(s);
  return nodeSteps(map, node(map, nodeId)).every((k) => isDone(s, nodeId, k));
}

/** Şu an yapılacak iş. */
export function nextStep(s: CampaignState): NextStep {
  const map = mapOf(s);
  const n = node(map, s.at);
  // Başlatılmış devriye (temizlenmiş düğümün yeniden oynanışı): düğümün kendi karşılaşması
  if (s.patrol === n.id && n.encounter && canReplay(map, n)) return { kind: 'battle', node: n.id, encounter: n.encounter, patrol: true };
  for (const kind of nodeSteps(map, n)) {
    if (isDone(s, n.id, kind)) continue;
    switch (kind) {
      case 'hero':
        return { kind: 'hero' };
      case 'recruit':
        return { kind: 'recruit', node: n.id, offer: recruitOffer(s, n.id) };
      case 'volunteer':
        return { kind: 'volunteer', node: n.id, offer: recruitOffer(s, n.id) };
      case 'farewell':
        return { kind: 'farewell', node: n.id };
      case 'company':
        return { kind: 'company', node: n.id, size: n.newCompany!.size };
      case 'battle':
        return { kind: 'battle', node: n.id, encounter: n.encounter! };
      case 'treasure':
        return { kind: 'treasure', node: n.id, treasure: n.treasure! };
      case 'event':
        // Seçenekli olayda savaş seçildiyse olay adımı o savaştır (kazanılınca olay biter)
        if (s.eventChoice?.node === n.id && s.eventChoice.battle) return { kind: 'battle', node: n.id, encounter: s.eventChoice.battle };
        return { kind: 'event', node: n.id, event: n.event! };
      case 'story':
        return { kind: 'story', node: n.id, story: n.story! };
      case 'town':
        return { kind: 'town', node: n.id };
      case 'rest':
        return { kind: 'rest', node: n.id };
      case 'merchant':
        return { kind: 'merchant', node: n.id };
    }
  }
  // Final düğümü (Castle Morvane) temizlendi: sefer biter (bölüm geçişi ayrı iş)
  if (n.id === finalNode(map)) return { kind: 'complete' };
  const { forward, back } = moveOptions(s);
  if (!forward.length && !back.length) return { kind: 'complete' };
  return back.length ? { kind: 'move', options: forward, back } : { kind: 'move', options: forward };
}

// ---------------------------------------------------------------- kadro

/** Alan saldırısı olan sınıf mı (skill'lerinden biri bir alanı vuruyor)? */
export function isAreaClass(classId: string): boolean {
  const def = classes[classId];
  return !!def?.skills.some((id) => {
    const t = skills[id]?.target ?? '';
    return t === 'area_enemies' || t === 'area_any';
  });
}

/**
 * Aday kartları (seed'li; aynı sefer + düğüm = aynı adaylar). Kadroda olan sınıflar çıkarılır (aynı sınıftan ikinci karakter yok).
 * `requireArea`: adaylardan en az biri alan saldırılı sınıf. `byFirstHero`: ilk kahramanın sınıfına göre sabit liste (çekiliş yok).
 */
export function recruitOffer(s: CampaignState, nodeId: string): string[] {
  const map = mapOf(s);
  const def = node(map, nodeId).recruit;
  if (!def) return [];
  const owned = new Set(s.roster.map((h) => h.class));
  const fixed = s.roster[0] ? def.byFirstHero?.[s.roster[0].class] : undefined;
  if (fixed) return fixed.filter((c) => !owned.has(c) && classes[c]).slice(0, def.offer);
  const pool = shuffle(CONFIG.recruitPool.filter((c) => !owned.has(c) && classes[c]), rngFor(s.seed, s.mapId, nodeId, 'recruit'));
  const offer = pool.slice(0, def.offer);
  if (def.requireArea && !offer.some(isAreaClass)) {
    const area = pool.slice(def.offer).find(isAreaClass);
    if (area) offer[offer.length - 1] = area;
  }
  return offer;
}

export const heroById = (s: CampaignState, id: string): Hero | undefined => s.roster.find((h) => h.id === id);
export const leaderOf = (s: CampaignState): Hero | undefined => s.roster.find((h) => h.leader) ?? s.roster[0];

/** Aktif takım (dizilimdeki karakterler, yuva sırasıyla). */
export function activeHeroes(s: CampaignState): Hero[] {
  return s.active.filter(Boolean).map((id) => heroById(s, id)).filter((h): h is Hero => !!h);
}

/** Yeni karakteri dizilime koyar: otomatik dizilimin önerdiği hücre boşsa oraya, değilse önden arkaya ilk boş hücreye. */
function place(s: CampaignState, hero: Hero): void {
  const classesNow = [...activeHeroes(s).map((h) => h.class), hero.class];
  const suggested = defaultSlots(classesNow)[classesNow.length - 1] ?? -1;
  const cell = suggested >= 0 && !s.active[suggested] ? suggested : s.active.findIndex((c) => !c);
  if (cell >= 0) s.active[cell] = hero.id;
}

/**
 * Kadroya kahraman ekler. `join`: sonradan katılan (aday seçimi; Ömer 2026-10-18, TUR 1 madde 6): takımın (aktif dizilim; yoksa kadro) level
 * ortalamasının `levels.json > joinBelow` altında, en az L1, XP 0, stat puanları DAĞITILMAMIŞ (xp.ts > joinLevel). Ashford'daki ilk bölük
 * (formCompany) ve tutorial kahramanı L1 başlar (karar 364: "Karakterler l1 gelsin").
 */
function addHero(s: CampaignState, classId: string, o: { leader?: boolean; tutorial?: boolean; join?: boolean } = {}): Hero {
  if (!classes[classId]) throw new Error(`Unknown class: ${classId}`);
  const id = `h${s.nextHeroId++}`;
  const hero: Hero = {
    id,
    class: classId,
    hpRatio: 1,
    alive: true,
    ...(o.leader ? { leader: true } : {}),
    ...(o.tutorial ? { tutorial: true } : {}),
    level: 1,
    xp: 0,
    statPoints: 0,
    skillPoints: 0,
    alloc: {},
    // Item Güçlendirme x5 (Ömer 2026-10-17): her kahraman sınıfının Common başlangıç silahıyla gelir
    equipment: starterEquipment(classId, id),
  };
  s.roster.push(hero);
  place(s, hero);
  if (o.join) {
    const level = joinLevel(s, [id]);
    if (level > 1) setLevel(hero, level, LEVELS, campaignMaxLevel());
  }
  return hero;
}

/** Tüm kadroyu otomatik dizilime göre yeniden yerleştirir. */
export function autoFormation(s: CampaignState): CampaignState {
  if (pausedLock(s)) return s;
  const t = clone(s);
  t.active = Array.from({ length: CELL_COUNT }, () => '');
  const slots = defaultSlots(t.roster.map((h) => h.class));
  t.roster.forEach((h, i) => {
    const slot = slots[i] ?? -1;
    if (slot >= 0) t.active[slot] = h.id;
  });
  return t;
}

/** Party ekranı: bir karakteri hücreye taşır (hücre doluysa yer değiştirir). */
export function moveHero(s: CampaignState, heroId: string, cell: number): CampaignState {
  if (pausedLock(s)) return s;
  const t = clone(s);
  const from = t.active.indexOf(heroId);
  if (from < 0 || cell < 0 || cell >= t.active.length) return s;
  const other = t.active[cell]!;
  t.active[cell] = heroId;
  t.active[from] = other;
  return t;
}

const tutorialActive = (s: CampaignState): boolean => !mapOf(s).nodes.some((n) => n.endsTutorial && isDone(s, n.id, 'farewell'));

export function complete(s: CampaignState, kind: StepKind): void {
  const k = key(s.at, kind);
  if (!s.done.includes(k)) s.done.push(k);
  markCleared(s, s.at);
  // Valor (Ömer 2026-10-13): Valdren Keep'in hikâyesi (komutan Valor'u anlatır) ya da kasabası bitince açılır, hediye ile başlar
  if ((kind === 'story' || kind === 'town') && s.at === valorRules.campaign.introNode && s.valor === undefined) s.valor = addValor(valorRules, 0, valorRules.campaign.gift);
}

// ---------------------------------------------------------------- Valor (Ömer 2026-10-13; data/valor.json)

/** Valor açık mı (Valdren Keep'ten sonra)? Kapalıyken arayüz göstermez ve savaş kazancı birikmez. */
export const valorUnlocked = (s: CampaignState): boolean => s.valor !== undefined;

/** Savaş dışı diriltme yapılabilir mi (açık, yeterli Valor, düşmüş kahraman)? Değilse nedeni. */
export function valorReviveBlocked(s: CampaignState, heroId: string): string | null {
  if (!valorUnlocked(s)) return 'Valor is not known yet';
  const lock = pausedLock(s);
  if (lock) return lock;
  const h = heroById(s, heroId);
  if (!h || !isFallen(h)) return 'This hero has not fallen';
  if (!canReviveOutside(valorRules, s.valor!)) return `Needs ${valorRules.revive.outsideCost} Valor (you have ${s.valor})`;
  return null;
}

/** Savaş dışında (harita) Valor ile dirilt: outsideCost Valor, kahraman revive.hpRatio canla kalkar. */
export function reviveWithValor(s: CampaignState, heroId: string): CampaignState {
  const why = valorReviveBlocked(s, heroId);
  if (why) throw new Error(why);
  const t = clone(s);
  const h = heroById(t, heroId)!;
  t.valor = addValor(valorRules, t.valor! - valorRules.revive.outsideCost, 0);
  h.alive = true;
  h.hpRatio = Math.round(clamp01(valorRules.revive.hpRatio) * 1000) / 1000;
  // Valor 1 yara siler (Ömer 2026-10-20; valor.json > revive.clearWounds)
  const w = healWounds(woundCount(h), valorClearWounds());
  if (w > 0) h.wounds = w;
  else delete h.wounds;
  return t;
}

/** Oyuncu vekili (sim / otomatik): Valor yettikçe düşmüşleri savaş dışında diriltir (önce aktif takım; tutorial kahramanı hariç). */
export function autoValorRevive(s: CampaignState): CampaignState {
  let t = s;
  for (const h of [...activeHeroes(s), ...s.roster.filter((x) => !s.active.includes(x.id))]) if (!h.tutorial && !valorReviveBlocked(t, h.id)) t = reviveWithValor(t, h.id);
  return t;
}

/** Debug: Valor'u ayarla (açar; null = kapat / gizle). */
export function debugSetValor(s: CampaignState, v: number | null): CampaignState {
  const t = clone(s);
  if (v === null) delete t.valor;
  else t.valor = addValor(valorRules, 0, v);
  return t;
}

export function expectStep(s: CampaignState, kind: NextStep['kind']): NextStep {
  const step = nextStep(s);
  if (step.kind !== kind) throw new Error(`Expected step ${kind}, current step is ${step.kind}`);
  return step;
}

/** Tezgâhı kapatır (Leave): bu düğümde yeniden açılırsa aynı mallar dönsün diye saklanır (geri alım listesi ziyarete özel, boşalır). */
export function closeShop(t: CampaignState): void {
  if (t.shop?.node === t.at) t.closedShop = { ...t.shop, buyback: [] };
  delete t.shop;
}

/**
 * Bulunulan düğüme yeniden girilebilir mi (Ömer 2026-10-13, "Ashford'a giremiyorum"): adımları bitmiş, yola çıkmayı bekleyen düğümde
 * kasaba ekranı, tüccar ya da kamp (dinlenme noktası) yeniden açılır. Yoksa null.
 */
export function revisitKind(s: CampaignState): 'town' | 'merchant' | 'rest' | null {
  if (nextStep(s).kind !== 'move') return null;
  const map = mapOf(s);
  const steps = nodeSteps(map, node(map, s.at));
  for (const k of ['town', 'merchant', 'rest'] as const) if (steps.includes(k) && isDone(s, s.at, k)) return k;
  return null;
}

/**
 * Kasabaya / tüccara yeniden gir: o adım yeniden açılır (Leave yine bitirir). Kasabanın hikâye sahnesi yeniden oynamaz, gönüllü yeniden sorulmaz.
 * Kamp yeniden açılmaz (ücretsiz dinlenme ikinci kez iyileştirmesin): kampta yalnızca diriltme (reviveAtCamp) açık kalır; durum aynen döner.
 */
export function revisitNode(s: CampaignState): CampaignState {
  if (pausedLock(s)) return s;
  const k = revisitKind(s);
  if (k !== 'town' && k !== 'merchant') return s;
  const t = clone(s);
  const map = mapOf(t);
  if (k === 'town' && node(map, t.at).story && !t.done.includes(key(t.at, 'story'))) t.done.push(key(t.at, 'story'));
  t.done = t.done.filter((d) => d !== key(t.at, k));
  return t;
}

/** "Choose your hero": tutorial kahramanı (lider). */
export function pickHero(s: CampaignState, classId: string): CampaignState {
  expectStep(s, 'hero');
  if (!CONFIG.starterPool.includes(classId)) throw new Error(`Class not in the starter pool: ${classId}`);
  const t = clone(s);
  addHero(t, classId, { leader: true, tutorial: true });
  complete(t, 'hero');
  return t;
}

/** Aday kartlarından birini seçer (Ravenwood'da önce / Valdren Keep'ten ayrılırken). */
export function recruit(s: CampaignState, classId: string): CampaignState {
  const step = nextStep(s);
  if (step.kind !== 'recruit' && step.kind !== 'volunteer') throw new Error(`No recruit here (step: ${step.kind})`);
  if (!step.offer.includes(classId)) throw new Error(`${classId} is not on offer`);
  const t = clone(s);
  addHero(t, classId, { tutorial: tutorialActive(t), join: true });
  complete(t, step.kind);
  // Zorunlu Formation (tutorial): katılım savaştan önceyse savaş, Formation açılıp kapanana kadar bekler
  if (tutorialActive(t) && recruitHoldsBattle(s, t)) t.formationDue = t.at;
  return t;
}

/**
 * Zorunlu Formation kapısı (tutorial; Ömer 2026-10-17): bulunulan düğümün savaşı, Formation açılıp kapanana kadar başlamaz.
 * `lessonsOn` = Settings > Tutorials açık (kapalıysa kapı yok). Eski kayıtta alan yoksa kapı yok.
 */
export function formationGate(s: CampaignState, lessonsOn = true): boolean {
  return lessonsOn && s.formationDue !== undefined && s.formationDue === s.at && nextStep(s).kind === 'battle';
}

/** Formation açıldı ve kapandı: kapı kalkar (yoksa aynı durum döner). */
export function markFormationOpened(s: CampaignState): CampaignState {
  if (s.formationDue === undefined) return s;
  const t = clone(s);
  delete t.formationDue;
  return t;
}

/**
 * Katılım savaştan önceyse (Ravenwood, recruit.when 'before'; Ömer 2026-10-16): yeni kahraman katıldıktan sonra savaş KENDİLİĞİNDEN
 * başlamaz; oyuncu önce Formation'ı düzenler, düğüme dokunup "Start battle?" ile başlatır. `before` = katılımdan önceki durum,
 * `after` = katılımdan sonraki durum. Aynı düğümde sıradaki adım savaşsa true.
 */
export function recruitHoldsBattle(before: CampaignState, after: CampaignState): boolean {
  const was = nextStep(before);
  if (was.kind !== 'recruit') return false;
  const now = nextStep(after);
  return now.kind === 'battle' && now.node === was.node && after.at === was.node;
}

/**
 * Kasaba ekranında kışla / ilan panosu (Ömer 2026-10-12): ayrılırken gelen gönüllü (recruit.when 'leave') kasabadayken de seçilebilir.
 * Sunulan adaylar (gönüllü adımıyla aynı seed'li liste) ya da yoksa boş: kasaba adımında değilse, kasabanın adayı yoksa ya da zaten seçildiyse.
 */
export function townRecruitOffer(s: CampaignState): string[] {
  if (nextStep(s).kind !== 'town') return [];
  const n = node(mapOf(s), s.at);
  if (n.recruit?.when !== 'leave' || isDone(s, n.id, 'volunteer')) return [];
  return recruitOffer(s, n.id);
}

/** Kasaba ekranında aday seçimi: gönüllü adımını şimdiden bitirir (kasabadan ayrılınca ikinci kez sorulmaz). */
export function recruitInTown(s: CampaignState, classId: string): CampaignState {
  const offer = townRecruitOffer(s);
  if (!offer.length) throw new Error('No recruits in this town');
  if (!offer.includes(classId)) throw new Error(`${classId} is not on offer`);
  const t = clone(s);
  addHero(t, classId, { tutorial: tutorialActive(t), join: true });
  complete(t, 'volunteer');
  return t;
}

/**
 * Ashford: tutorial takımı veda eder (kadrodan çıkar). Takılı item'leri torbaya düşer: yeni bölük onları takar, item takma tutorial'ı burada
 * başlar (items.md karar 7). Torba sınırı burada uygulanmaz (hiçbir item kaybolmaz; Ömer, madde 278). Teslim anı için `pendingHandover` yazılır.
 */
export function farewell(s: CampaignState): CampaignState {
  expectStep(s, 'farewell');
  const t = clone(s);
  const given: string[] = [];
  const from: Array<{ heroId: string; class: string }> = [];
  for (const h of t.roster.filter((x) => x.tutorial)) {
    let gave = false;
    for (const slot of SLOT_IDS) {
      const it = h.equipment[slot];
      if (it) {
        t.inventory.push(it);
        given.push(it.uid);
        gave = true;
      }
      h.equipment[slot] = null;
    }
    if (gave) from.push({ heroId: h.id, class: h.class });
  }
  // Teslim anı (Aşama 1 arayüzü gösterip onaylatır); item yoksa kayıt yok
  if (given.length) t.pendingHandover = { node: t.at, from, items: given };
  const leaving = new Set(t.roster.filter((h) => h.tutorial).map((h) => h.id));
  t.roster = t.roster.filter((h) => !leaving.has(h.id));
  t.active = t.active.map((id) => (leaving.has(id) ? '' : id));
  complete(t, 'farewell');
  return t;
}

/** Teslim anı görüldü/onaylandı: bekleyen teslim kaydı silinir (item'ler zaten torbada). */
export function acknowledgeHandover(s: CampaignState): CampaignState {
  if (!s.pendingHandover) return s;
  const t = clone(s);
  delete t.pendingHandover;
  return t;
}

/**
 * Atlanan tutorial'ın teslim kartı portreleri: her item grubu (ayrılan bir kahramanın eşyası) için o gruptaki tüm item'leri takabilen
 * sınıflar (companyPool) arasından seed'le biri; önce yeni bölükte olmayan ve henüz seçilmemiş, yoksa seçilmemiş, yoksa herhangi uyan sınıf.
 * Hiçbir sınıf uymuyorsa (bozuk veri) o grup portresiz kalır.
 */
function skippedHandoverFaces(t: CampaignState, ho: NonNullable<CampaignState['pendingHandover']>, picks: string[]): NonNullable<CampaignState['pendingHandover']> {
  const rng = rngFor(t.seed, 'skip-faces');
  const used = new Set<string>();
  const from: Array<{ heroId: string; class: string }> = [];
  for (const group of ho.skippedSets ?? []) {
    const defs = group.map((uid) => itemDef(t.inventory.find((i) => i.uid === uid)?.id ?? '')).filter((d): d is NonNullable<typeof d> => !!d);
    const fits = CONFIG.companyPool.filter((c) => classes[c] && defs.every((d) => canEquip(c, d)));
    const tiers = [fits.filter((c) => !used.has(c) && !picks.includes(c)), fits.filter((c) => !used.has(c)), fits];
    const pool = tiers.find((x) => x.length);
    if (!pool) continue;
    const c = pool[rng.int(0, pool.length - 1)]!;
    used.add(c);
    from.push({ heroId: '', class: c });
  }
  return { node: ho.node, items: ho.items, from };
}

/** "Form your company": `size` farklı sınıf, companyPool'dan serbest; ilk seçilen (ya da `leaderIndex`) lider. */
export function formCompany(s: CampaignState, picks: string[], leaderIndex = 0): CampaignState {
  const step = expectStep(s, 'company');
  const size = (step as Extract<NextStep, { kind: 'company' }>).size;
  if (picks.length !== size) throw new Error(`Pick exactly ${size} classes`);
  if (new Set(picks).size !== picks.length) throw new Error('Each class can be picked only once');
  for (const c of picks) if (!CONFIG.companyPool.includes(c)) throw new Error(`Class not in the company pool: ${c}`);
  const t = clone(s);
  picks.forEach((c, i) => addHero(t, c, { leader: i === leaderIndex }));
  // Tutorial atlandıysa teslim kartına eşyayla eşleşen portreler (open-questions 407, Ömer 2026-10-24 "Eşleşsin")
  if (t.pendingHandover?.skippedSets) t.pendingHandover = skippedHandoverFaces(t, t.pendingHandover, picks);
  const arranged = autoFormation(t);
  complete(arranged, 'company');
  return arranged;
}

/** Tek tıkla biten adımlar: olay (seçenekli olayda "hiçbir şey yapmadan geç"), hazine, kasaba sahnesi, kasaba (Leave). */
export function completeSimple(s: CampaignState, kind: 'event' | 'treasure' | 'story' | 'town'): CampaignState {
  expectStep(s, kind);
  const t = clone(s);
  // Hazine sandığı (saf hazine ya da korunan hazine): loot torbaya (items.md 3.1)
  if (kind === 'treasure') {
    // Hazinenin kendi içeriği varsa (events.json > treasures[x].loot; Harita 1 cepleri) sandık ona göre, yoksa standart sandık
    const tl = TREASURES[node(mapOf(t), t.at).treasure ?? '']?.loot;
    grantLoot(t, t.at, 'treasure', activeHeroes(t), tl && (tl.maxItems !== undefined || tl.itemsDelta !== undefined || tl.gold !== undefined) ? { ...(tl.maxItems !== undefined ? { maxItems: tl.maxItems } : {}), ...(tl.itemsDelta !== undefined ? { itemsDelta: tl.itemsDelta } : {}), ...(tl.gold !== undefined ? { gold: tl.gold } : {}) } : undefined);
    if (tl?.gift) grantGift(t, t.at, activeHeroes(t), 'treasure', tl.gift);
  }
  if (kind === 'town') closeShop(t); // kasaba tüccarının tezgâhı kasabadan ayrılınca kapanır (T1); yeniden girilirse aynı tezgâh döner
  // Savaşsız olay / hazine düğümü: sabit XP (levels.md, 0,5x)
  if ((kind === 'treasure' || kind === 'event') && fixedXpNode(t)) applyXp(t, fixedXp(t, activeHeroes(t)));
  complete(t, kind);
  return t;
}

// ---------------------------------------------------------------- kasaba sahnesi (T5) ve diyalog

/** Diyalog cevaplarından hoşa gidenlerin sayısı (gizli sayaç). Geçersiz cevap hata. */
export function storyLikes(storyId: string, answers: number[]): number {
  const steps = STORIES[storyId]?.dialogue ?? [];
  if (answers.length !== steps.length) throw new Error(`Answer all ${steps.length} questions`);
  return steps.reduce((n, st, i) => {
    const c = st.choices[answers[i]!];
    if (!c) throw new Error(`Invalid answer at step ${i}`);
    return n + (c.likes ? 1 : 0);
  }, 0);
}

/** NPC takımı sevdi mi (hoşa giden cevap >= likeThreshold)? */
export const storyLiked = (storyId: string, answers: number[]): boolean => storyLikes(storyId, answers) >= (STORIES[storyId]?.likeThreshold ?? 2);

/**
 * Kasaba sahnesini bitirir. Diyalog sahnesinde `answers` (adım başına seçilen cevabın sırası): NPC sevdiyse hediye item (torba ya da Spoils'ta
 * geride kalan). Düz metin sahnede ya da cevapsız (otomatik çözüm) yalnızca biter.
 */
export function completeStory(s: CampaignState, answers?: number[]): CampaignState {
  const step = expectStep(s, 'story') as Extract<NextStep, { kind: 'story' }>;
  const def = STORIES[step.story];
  const liked = !!(def?.dialogue?.length && answers && storyLiked(step.story, answers));
  const t = completeSimple(s, 'story');
  if (liked && def?.gift) grantGift(t, t.at, activeHeroes(t), step.story, def.gift.rarity);
  return t;
}

// ---------------------------------------------------------------- seçenekli olaylar (N2)

/** Seçeneğin oynanacak karşılaşması: listedeki ilk VAR OLAN (yoksa undefined). */
export const choiceBattle = (c: EventChoice): string | undefined => c.battle?.find((id) => !!ENCOUNTERS[id]);

/** Olayın şu an sunulabilen seçenekleri (savaşı olup karşılaşması henüz olmayanlar gizli). Seçenek yoksa boş. */
export function eventChoices(eventId: string): EventChoice[] {
  return (EVENTS[eventId]?.choices ?? []).filter((c) => !c.battle || !!choiceBattle(c));
}

/** Seçenek seçilebilir mi (altın yetiyor mu)? null = evet, yoksa sebep. */
export function choiceBlocked(s: CampaignState, c: EventChoice): string | null {
  return c.cost && s.gold < c.cost ? 'Not enough gold' : null;
}

/**
 * Olay seçeneğini uygular. Savaşlı seçenek: olay savaşı bekler (nextStep 'battle'; applyBattle kazanınca `win` ödülünü verip olayı bitirir).
 * Diğerleri anında biter. "Pay in blood" (hpLoss): yaşayan herkes mevcut canının o oranını kaybeder, kimse ölmez (Ömer 2026-10-12).
 */
export function chooseEvent(s: CampaignState, choiceId: string): CampaignState {
  const step = expectStep(s, 'event') as Extract<NextStep, { kind: 'event' }>;
  const c = eventChoices(step.event).find((x) => x.id === choiceId);
  if (!c) throw new Error(`No such choice: ${choiceId}`);
  const blocked = choiceBlocked(s, c);
  if (blocked) throw new Error(blocked);
  const t = clone(s);
  t.gold -= c.cost ?? 0;
  for (const h of t.roster) {
    if (isFallen(h)) continue;
    if (c.hpLoss) h.hpRatio = Math.max(0.001, Math.round(h.hpRatio * (1 - clamp01(c.hpLoss)) * 1000) / 1000);
    if (c.heal) h.hpRatio = Math.round(clamp01(h.hpRatio + c.heal) * 1000) / 1000;
  }
  const small = !!c.chest && c.chestItems !== undefined; // küçük sandık: altın sandığın kartında
  if (!small) t.gold += c.gold ?? 0;
  if (c.chest) grantLoot(t, t.at, 'treasure', activeHeroes(t), small ? { maxItems: c.chestItems!, gold: c.gold ?? 0 } : undefined);
  const battle = choiceBattle(c);
  t.eventChoice = { node: t.at, choice: c.id, ...(battle ? { battle } : {}), ...(c.restHeal !== undefined ? { restHeal: c.restHeal } : {}) };
  if (!battle) {
    if (fixedXpNode(t)) applyXp(t, fixedXp(t, activeHeroes(t))); // savaşsız olay: sabit XP (savaşlı seçenekte XP savaştan)
    complete(t, 'event');
  }
  return t;
}

/** Olay savaşı kazanıldı: seçeneğin `win` ödülü (olağan savaş loot'u yerine), olay biter. `t` klonlanmış olmalı. */
function winEventBattle(t: CampaignState): void {
  const ec = t.eventChoice!;
  const n = node(mapOf(t), t.at);
  const c = EVENTS[n.event ?? '']?.choices?.find((x) => x.id === ec.choice);
  if (c?.win?.gold) t.gold += c.win.gold;
  if (c?.win?.chest) grantLoot(t, t.at, 'treasure', activeHeroes(t));
  delete ec.battle;
  complete(t, 'event');
}

// ---------------------------------------------------------------- dinlenme noktası (Ömer 2026-10-11)

/** Düşmüş mü (can 0 ya da alive false): dinlenme noktasında altınla diriltilebilir. */
export const isFallen = (h: Hero): boolean => !h.alive || h.hpRatio <= 0;

/**
 * ESKİ (Ömer 2026-10-18, ilerleme TUR 1 madde 10: dinlenme DİRİLTMEZ, diriltme yalnızca Valor; campaign.json > rest.reviveCost kalktı).
 * Kamp penceresi (CampaignMapScene > restModal) güncellenene dek derlensin diye duruyor: fiyat 0, diriltme hiçbir şey yapmaz (durum aynen).
 * @deprecated
 */
export function reviveCost(_s: CampaignState, _nodeId?: string): number {
  return 0;
}

/** ESKİ (TUR 1 madde 10): dinlenme diriltmez; durum aynen döner (Valor: reviveWithValor). @deprecated */
export function reviveAtCamp(s: CampaignState, _heroId: string): CampaignState {
  return s;
}

/** Bu düğümün dinlenme oranı: rest.heal, ya da olay seçeneğinin `restHeal`'ı (Shepherd's Fold "Share your bread": 1 = tam). */
export const restHealOf = (s: CampaignState): number => (s.eventChoice?.node === s.at && s.eventChoice.restHeal !== undefined ? s.eventChoice.restHeal : CONFIG.rest.heal);

/** Dinlen ve yola devam: ÜCRETSİZ, yaşayan herkes maks canın restHealOf oranı kadar iyileşir (düşmüşler kalkmaz: altınla diriltilir). */
export function restAtCamp(s: CampaignState): CampaignState {
  expectStep(s, 'rest');
  const t = clone(s);
  const heal = restHealOf(t);
  for (const h of t.roster) if (!isFallen(h)) h.hpRatio = Math.round(clamp01(h.hpRatio + heal) * 1000) / 1000;
  complete(t, 'rest');
  return t;
}

// ---------------------------------------------------------------- can

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Savaş sonucu (campaign.md 5.1; Ömer 2026-10-11, Endless gibi): zaferde hayatta kalanlar maks canın `victoryHeal` kadarını geri alır;
 * düşenler KALKMAZ: ceset olarak taşınır (sonraki savaşa ceset girer; savaş içi Resurrection ya da dinlenme noktasında altınla diriltme).
 * Boss zaferinde yaşayanlar `bossVictoryHeal` (tam) can; düşmüşler yine düşmüş. Savaşa girmeyenler değişmez. Yenilgide durum yalnızca sayaç olarak değişir.
 */
/** Seferin zorluğuna göre geçerli kurallar: campaign.json > rules + difficulties[x].rules üstüne yazımları. */
export function rulesFor(s: Pick<CampaignState, 'difficulty'>): CampaignRules {
  return { ...CONFIG.rules, ...(CONFIG.difficulties[s.difficulty]?.rules ?? {}) };
}

/** Zafer şifası (yaşayanlara, maks canın oranı): boss bossVictoryHeal, elit eliteVictoryHeal (yoksa victoryHeal), diğerleri victoryHeal. */
export function victoryHealFor(rules: CampaignRules, nodeType: MapNode['type']): number {
  if (nodeType === 'boss') return rules.bossVictoryHeal;
  if (nodeType === 'elite') return rules.eliteVictoryHeal ?? rules.victoryHeal;
  return rules.victoryHeal;
}

/** Sefer yara kuralı (campaign.json > rules.wounds). */
export const woundRules = (): WoundRules => CONFIG.rules.wounds;

/** Kahramanın yara satırı (en küçük işlevsel gösterim; yarasızsa boş): "Wounds: 2 (-40% max HP)". */
export const heroWoundsLine = (h: Hero): string => woundsLine(woundCount(h), woundRules());

/**
 * Savaşın SONUNDA hâlâ düşmüş kahramanlar (YERİNDE; zafer ve devriyeden geri çekilme aynı kural): savaşa ayakta girmişse yarası lethal'ın
 * altındaysa riseRatio canla kalkar ve +1 yara; değilse ceset. Savaşa ceset girip kalkmamışsa ceset kalır (yeni yara yok). Dönen: kalkanlar.
 */
function settleFallen(t: CampaignState, units: BattleOutcome['units'], rules: WoundRules): Set<string> {
  const risen = new Set<string>();
  for (const u of units) {
    const h = heroById(t, u.heroId);
    if (!h || (u.alive && u.hpRatio > 0)) continue;
    const r = isFallen(h) ? ({ corpse: true, wounds: woundCount(h) } as const) : fallAfterVictory(woundCount(h), rules);
    if (r.corpse) {
      h.hpRatio = 0;
      h.alive = false;
    } else {
      h.hpRatio = Math.round(r.hpRatio * 1000) / 1000;
      h.alive = true;
      risen.add(h.id);
    }
    if (r.wounds > 0) h.wounds = r.wounds;
  }
  return risen;
}

/** Savaş içi Valor diriltmeleri (YERİNDE): her biri valor.json > revive.clearWounds yara siler (Ömer 2026-10-20; skill dirilişi silmez). */
function valorHealWounds(t: CampaignState, counts: Record<string, number> | undefined): void {
  for (const [id, n] of Object.entries(counts ?? {})) {
    const h = heroById(t, id);
    if (!h) continue;
    const w = healWounds(woundCount(h), n * valorClearWounds());
    if (w > 0) h.wounds = w;
    else delete h.wounds;
  }
}

/** Yaraları siler (YERİNDE; kasaba dinlenmesi): yalnızca yaşayanlar (ceset dinlenmeyle kalkmaz, yarası da kalır; VARSAYIM open-questions 369). */
export function clearWounds(t: CampaignState): void {
  for (const h of t.roster) if (!isFallen(h)) delete h.wounds;
}

export function applyBattle(s: CampaignState, outcome: BattleOutcome, rules: CampaignRules = rulesFor(s)): CampaignState {
  const t = clone(s);
  delete t.suspended; // savaş bitti (zafer ya da yenilgi): duraklatma kaydı geçersiz
  if (!outcome.victory) {
    t.stats.defeats++;
    return t;
  }
  expectStep(t, 'battle');
  const heal = victoryHealFor(rules, node(mapOf(t), t.at).type);
  // Can ve ölüm reworkü (Ömer 2026-10-19, hp-death-rework.md): yaşayanlar düğüm türünün zafer şifasını alır; savaş SONUNDA hâlâ düşmüş
  // olan kahraman %10 canla yaralı kalkar (lethal yaralıysa ceset). Savaşa ceset girip kalkmayan ceset kalır.
  valorHealWounds(t, outcome.valorRevived);
  const risen = settleFallen(t, outcome.units, rules.wounds ?? woundRules());
  for (const u of outcome.units) {
    const h = heroById(t, u.heroId);
    if (!h || risen.has(h.id) || !u.alive || u.hpRatio <= 0) continue;
    h.hpRatio = Math.round(clamp01(u.hpRatio + heal + itemRecovery(h)) * 1000) / 1000; // Recovery affix'i: yalnızca takan (Ömer 2026-10-11)
    h.alive = true;
  }
  t.stats.victories++;
  // XP (levels.md): düşman başına, düğüm çarpanı, savaşa girenlere bölünür; level atlayan (ayaktaki) kahraman tam iyileşir
  const encounterId = t.eventChoice?.node === t.at && t.eventChoice.battle ? t.eventChoice.battle : (node(mapOf(t), t.at).encounter ?? '');
  // Devriye (yeniden oynama): XP azalan getiriyle (roadmap 2.3 A; campaign.json > replay.xp); altın / item loot.ts'te (items.json > loot.repeat)
  const patrol = t.patrol === t.at;
  const gains = battleXp(t, outcome, encounterId);
  applyXp(t, patrol ? scaleGains(gains, replayMult(replayCount(t, t.at) + 1)) : gains);
  // Yaralı kalkan kahraman level atlasa da riseRatio canla kalır (level şifası yalnızca savaşı ayakta bitirene; VARSAYIM open-questions 369)
  for (const id of risen) {
    const h = heroById(t, id);
    if (h) h.hpRatio = Math.round(clamp01((rules.wounds ?? woundRules()).riseRatio) * 1000) / 1000;
  }
  // Valor: yalnızca açıksa birikir (savaşta harcanan düşülür); elit +2, boss +3 (win yerine), kusursuzsa +1. Düğüm başına bir kez
  // (Ömer 2026-10-18, karar 364: "Valorü node başına 1 kere al"): devriye zaferi Valor KAZANDIRMAZ (savaşta harcanan yine düşülür).
  if (t.valor !== undefined) {
    const type = node(mapOf(t), t.at).type;
    const flawless = outcome.flawless ?? outcome.units.every((u) => u.alive && u.hpRatio > 0);
    const earned = patrol ? 0 : valorEarned(valorRules, type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'normal', flawless);
    t.valor = addValor(valorRules, outcome.valorLeft ?? t.valor, earned);
  }
  if (t.eventChoice?.node === t.at && t.eventChoice.battle) {
    winEventBattle(t); // olay savaşı: düğümün savaş adımı zaten bitti
    return t;
  }
  // Zafer loot'u (items.md 3.1; zorluktan bağımsız, karar 6). Savaşa giren takım = bu sonuçtaki kahramanlar
  const fought = outcome.units.map((u) => heroById(t, u.heroId)).filter((h): h is Hero => !!h);
  const type = node(mapOf(t), t.at).type;
  // Devriyede de aynı çağrı: loot.ts düğümün kaçıncı zaferi olduğunu lootState.clears'tan sayar (item / altın çarpanı, sandık yok)
  grantLoot(t, t.at, type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'battle', fought.length ? fought : activeHeroes(t));
  if (patrol) {
    t.replays = { ...(t.replays ?? {}), [t.at]: replayCount(t, t.at) + 1 };
    delete t.patrol;
    return t;
  }
  complete(t, 'battle');
  return t;
}

/** Kasaba şifası (Ömer 2026-10-11, denge paketi): ücretsiz, yaşayanlar `ratio` (tam) cana; düşmüşler KALKMAZ (TUR 1 madde 10: diriltme yalnızca Valor). */
function healAll(s: CampaignState, ratio: number): void {
  for (const h of s.roster) if (!isFallen(h)) h.hpRatio = Math.max(h.hpRatio, clamp01(ratio));
}

// ---------------------------------------------------------------- hareket

/**
 * Yola çıkar: yalnızca düğüm temizlendiyse. Hedef bir komşu (tek hamle) ya da serbest dolaşımda temizlenmiş düğümler üzerinden ulaşılan
 * uzak düğüm (yolculuk, travelRoutes): aradaki düğümlerin içeriği tetiklenmez (iyileşme dahil), yalnızca varılan düğümünki (kasaba şifası,
 * ilk kez varılan düğümün adımları). Yolun her düğümü yürüyüş günlüğüne (path) yazılır.
 */
export function moveTo(s: CampaignState, to: string): CampaignState {
  const step = nextStep(s);
  if (step.kind !== 'move' && !canWithdraw(s)) throw new Error(`Cannot move to ${to} now`);
  if (pausedLock(s)) throw new Error(PAUSED_LOCK);
  const route = travelRoute(s, to);
  if (!route) throw new Error(`Cannot move to ${to} now`);
  const t = clone(s);
  t.visited = [...(t.visited ?? [])];
  for (const id of route) {
    t.path.push(id);
    if (!t.visited.includes(id)) t.visited.push(id);
  }
  t.at = to;
  delete t.eventChoice;
  delete t.closedShop;
  delete t.formationDue;
  delete t.patrol;
  const n = node(mapOf(t), to);
  // Varış şifası (Ömer 2026-10-18, karar 364: "Varış şifası ilk bedava dinlenme olsun. Her tekrar ziyaret para istesin"): kasabaya İLK
  // varışta tam şifa ve o kasabanın bedava dinlenmesi kullanılmış sayılır (townRests = 1); sonraki varışlarda şifa yok, ateş başı ücretli.
  if (n.heal) {
    const rests = t.townRests?.[to];
    const firstRest = !(typeof rests === 'number' && rests > 0);
    if (n.type !== 'town' || firstRest) healAll(t, n.heal);
    if (n.type === 'town' && firstRest) {
      t.townRests = { ...(t.townRests ?? {}), [to]: 1 };
      clearWounds(t); // ilk varış = bedava kasaba dinlenmesi: yaraları da siler (Ömer 2026-10-19)
    }
  }
  markCleared(t, to); // adımı olmayan düğüm varınca temizlenmiş sayılır
  return t;
}

// ---------------------------------------------------------------- serbest dolaşım ve devriye (roadmap 2.1-2.4, 2.7)

/** Düğüm temizlendiyse (tüm adımları bitti) `cleared` listesine ekler (yerinde; çağıran klonlamış olmalı). */
function markCleared(t: CampaignState, id: string): void {
  if (!nodeCleared(t, id)) return;
  t.cleared = t.cleared ?? [];
  if (!t.cleared.includes(id)) t.cleared.push(id);
}

/** Temizlenmiş düğümler (eski / eksik durumda: bulunulan dışındaki geçilen düğümler + bitmişse bulunulan). */
export function clearedNodes(s: CampaignState): string[] {
  if (Array.isArray(s.cleared)) return s.cleared;
  const out = [...new Set(s.path.filter((id) => id !== s.at))];
  if (nodeCleared(s, s.at)) out.push(s.at);
  return out;
}
export const isCleared = (s: CampaignState, id: string): boolean => clearedNodes(s).includes(id);
/** Ayak basılan düğümler (eski / eksik durumda path'ten). */
export const visitedNodes = (s: CampaignState): string[] => (Array.isArray(s.visited) ? s.visited : [...new Set(s.path)]);

/** Bölük kurma düğümü (Ashford: newCompany) ve öncesi tutorial düğümleri (ataları). Haritada bölük kurma yoksa kilit yok. */
export function tutorialNodes(map: CampaignMap): Set<string> {
  let set = tutorialCache.get(map);
  if (!set) {
    const c = map.nodes.find((n) => n.newCompany);
    set = c ? upstreamOf(map, c.id) : new Set();
    tutorialCache.set(map, set);
  }
  return set;
}
const tutorialCache = new WeakMap<CampaignMap, Set<string>>();

/** Serbest dolaşım açık mı (roadmap 2.7): bölük kurma ekranı bittiyse; öncesinde yollar tek yönlü (bugünkü gibi). */
export function roamOpen(s: CampaignState): boolean {
  const c = mapOf(s).nodes.find((n) => n.newCompany);
  return !c || isDone(s, c.id, 'company');
}

/** Tek hamlede gidilebilen komşular: ileri (çıkışlar) ve serbest dolaşımda geri (girişler); tutorial düğümlerine geri dönülmez. */
export function moveOptions(s: CampaignState): { forward: string[]; back: string[] } {
  const map = mapOf(s);
  const forward = outgoing(map, s.at);
  if (!roamOpen(s)) return { forward, back: [] };
  const locked = tutorialNodes(map);
  return { forward: forward.filter((id) => !locked.has(id)), back: incoming(map, s.at).filter((id) => !locked.has(id) && !forward.includes(id)) };
}

/**
 * Yolculuk hedefleri (roadmap 2.1): bulunulan düğümden, yalnızca TEMİZLENMİŞ düğümlerin içinden geçerek ulaşılan her düğüm ve yolu
 * (bulunulan hariç, hedef dahil; en kısa yol, eşitlikte veri sırası). Komşular her zaman (tek hamle). Yalnızca yola çıkılabilirken (move) ya da savaşa girmeden ayrılırken (canWithdraw).
 */
export function travelRoutes(s: CampaignState): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const withdraw = nextStep(s).kind !== 'move';
  if (withdraw && !canWithdraw(s)) return out;
  const cleared = new Set(clearedNodes(s));
  const { forward, back } = moveOptions(s);
  // Savaşa girmeden ayrılırken yalnızca temizlenmiş komşulara (ve onların üzerinden) gidilir: savaş düğümü atlanıp ileri geçilmez
  for (const id of [...forward, ...back]) if (!withdraw || cleared.has(id)) out.set(id, [id]);
  if (!roamOpen(s)) return out;
  const map = mapOf(s);
  const locked = tutorialNodes(map);
  const queue = [...out.keys()].filter((id) => cleared.has(id));
  while (queue.length) {
    const id = queue.shift()!;
    for (const nb of neighbors(map, id)) {
      if (nb === s.at || out.has(nb) || locked.has(nb)) continue;
      out.set(nb, [...out.get(id)!, nb]);
      if (cleared.has(nb)) queue.push(nb);
    }
  }
  return out;
}

/**
 * Savaşa girmeden ayrılma (Ömer 2026-10-23: "Fight çıkıyor ama tıklamadığımda başka node'a gidebilmem gerek"): savaş adımı bekleyen düğümde
 * Fight'a basılmadıysa kafile yola çıkabilir; düğüm temizlenmemiş kalır, sonra dönüp savaşılır. Yalnızca serbest dolaşım açıkken ve
 * yalnızca temizlenmiş komşular üzerinden (travelRoutes). Duraklatılmış savaşta (suspended) ve olayda seçilen savaşta kilit sürer.
 */
export function canWithdraw(s: CampaignState): boolean {
  const step = nextStep(s);
  return step.kind === 'battle' && !s.suspended && !s.eventChoice && roamOpen(s);
}

/** Hedefe giden yol (bulunulan hariç, hedef dahil) ya da gidilemiyorsa null. */
export const travelRoute = (s: CampaignState, to: string): string[] | null => travelRoutes(s).get(to) ?? null;

/** Düğüm yeniden oynanır mı (roadmap 2.2): Battle, Elite ve korunan hazine (savaşı); Boss, olay, saf hazine, kasaba hayır; tutorial düğümleri hayır. */
export function canReplay(map: CampaignMap, n: MapNode): boolean {
  if (!n.encounter || tutorialNodes(map).has(n.id) || n.newCompany) return false;
  return n.type === 'battle' || n.type === 'elite' || n.type === 'treasure';
}

/** Düğümün devriye zaferi sayısı. */
export const replayCount = (s: CampaignState, id: string): number => s.replays?.[id] ?? 0;

/** i. yeniden oynanışın ödül çarpanı (0 = ilk zafer = 1; son değer taban): campaign.json > replay.xp. */
export function replayMult(i: number): number {
  const xs = CONFIG.replay?.xp ?? [1];
  return xs[Math.max(0, Math.min(i, xs.length - 1))] ?? 1;
}
/** Bu düğümde sıradaki devriyenin ödül çarpanı (rozet: 100 / 60 / 40 / 25). */
export const nextReplayMult = (s: CampaignState, id: string): number => replayMult(replayCount(s, id) + 1);

const scaleGains = (g: Record<string, number>, k: number): Record<string, number> => Object.fromEntries(Object.entries(g).map(([id, v]) => [id, Math.round(v * k)]));

/** Devriye bu düğümde başlatılabilir mi (düğüm temizlenmiş, yeniden oynanır, serbest dolaşım açık, yola çıkılabilir durumda). */
export function patrolAvailable(s: CampaignState, id: string = s.at): boolean {
  const map = mapOf(s);
  return roamOpen(s) && isCleared(s, id) && canReplay(map, node(map, id));
}

/** Devriyeyi başlat (bulunulan temizlenmiş savaş düğümünde): nextStep düğümün karşılaşmasını döndürür. Değilse hata. */
export function startPatrol(s: CampaignState): CampaignState {
  if (pausedLock(s)) throw new Error(PAUSED_LOCK);
  if (nextStep(s).kind !== 'move' || !patrolAvailable(s)) throw new Error('No patrol here');
  const t = clone(s);
  t.patrol = t.at;
  return t;
}

/** Başlatılmış devriyeyi bırak (savaş başlamadan; yoksa aynı durum). */
export function cancelPatrol(s: CampaignState): CampaignState {
  if (!s.patrol || s.suspended) return s;
  const t = clone(s);
  delete t.patrol;
  return t;
}

/**
 * ESKİ (Ömer 2026-10-19 can ve ölüm reworkü: rastgele geri çekilme kaybı kalktı, savaşta ne olduysa kalır). Haritadaki devriye kartı metni
 * (CampaignMapScene) patrolRetreatNote'a geçene dek derlensin diye duruyor: 0 döner. @deprecated
 */
export const patrolRetreatMaxLoss = (): number => 0;

/** Devriye kartının geri çekilme notu (haritadaki "Fight the patrol?" kartı; İngilizce). */
export const patrolRetreatNote = (): string => 'Retreating keeps what happened in the fight: lost health stays lost and fallen heroes rise wounded.';

/** Devriyeden geri çekilme onayı (savaş menüsü > Retreat): oyuncuya bedeli açıkça yazar. */
export const patrolRetreatConfirm = (): string => {
  const w = woundRules();
  return `Retreat from the patrol? The patrol is called off and you may move on. Health lost in this fight stays lost. Fallen heroes rise with ${Math.round(w.riseRatio * 100)}% health and a wound; a hero who already has ${w.lethal} wounds dies.`;
};

/**
 * Devriyeden geri çekilme (Ömer 2026-10-19, hp-death-rework.md: savaşta ne olduysa kalır): savaş DURAKLATILMAZ, devriye iptal olur, takım
 * serbestçe yola çıkabilir. `battle` = geri çekilme anındaki kahraman durumu (outcomeFrom; victory alanına bakılmaz): canlar taşınır, düşmüş
 * olanlar zaferdeki gibi yaralı kalkar (lethal yaralıysa ceset), harcanan Valor harcanmış kalır. Zafer şifası / XP / loot / Valor kazancı yok.
 * `battle` yoksa (savaş kaydı yok) yalnızca devriye bırakılır. Dönen: yeni durum + kahraman başına kaybedilen yüzde / yara / ölüm (gösterim).
 */
export function retreatPatrol(s: CampaignState, battle?: Pick<BattleOutcome, 'units' | 'valorLeft' | 'valorRevived'>): { state: CampaignState; losses: RetreatLoss[] } {
  if (s.patrol !== s.at) return { state: s, losses: [] };
  const t = clone(s);
  delete t.patrol;
  delete t.suspended;
  const losses: RetreatLoss[] = [];
  if (!battle) return { state: t, losses };
  const before = new Map(t.roster.map((h) => [h.id, { hp: isFallen(h) ? 0 : h.hpRatio, fallen: isFallen(h) }]));
  valorHealWounds(t, battle.valorRevived);
  const risen = settleFallen(t, battle.units, woundRules());
  for (const u of battle.units) {
    const h = heroById(t, u.heroId);
    const b = before.get(u.heroId);
    if (!h || !b) continue;
    if (!risen.has(h.id) && u.alive && u.hpRatio > 0) {
      h.hpRatio = Math.round(clamp01(u.hpRatio) * 1000) / 1000;
      h.alive = true;
    }
    const died = !b.fallen && isFallen(h);
    const pct = Math.max(0, Math.round((b.hp - (isFallen(h) ? 0 : h.hpRatio)) * 100));
    if (pct > 0 || risen.has(h.id) || died) losses.push({ heroId: h.id, pct, ...(risen.has(h.id) ? { wounded: true } : {}), ...(died ? { died: true } : {}) });
  }
  if (t.valor !== undefined && battle.valorLeft !== undefined) t.valor = addValor(valorRules, battle.valorLeft, 0);
  return { state: t, losses };
}

/** Geri çekilmede kahraman başına bedel (gösterim): kaybedilen can yüzdesi, yaralı kalktı mı, öldü mü (ceset). */
export interface RetreatLoss {
  heroId: string;
  pct: number;
  wounded?: boolean;
  died?: boolean;
}

/** Keşfedilen düğümler (roadmap 2.4): ayak basılan her düğümün görüş mesafesi (visibility) içindekiler; bir kez görülen sise dönmez. */
export function discoveredNodes(map: CampaignMap, visited: string[]): Set<string> {
  const out = new Set<string>();
  for (const v of visited) for (const [id, d] of undirectedDistances(map, v)) if (d <= map.visibility) out.add(id);
  return out;
}

/** İlerleme yazısı: temizlenmiş / toplam düğüm (haritada "Cleared 9/26 · Chapter 1"). */
export const clearedProgress = (s: CampaignState): { cleared: number; total: number } => ({ cleared: clearedNodes(s).length, total: mapOf(s).nodes.length });

/** Takım sınırı: geçilen düğümlerin en büyük `partyCap`'i (ayrılırken katılım olan düğümde katılım bitince geçerli). */
export function partyCap(s: CampaignState): number {
  const map = mapOf(s);
  let cap = 0;
  for (const id of s.path) {
    const n = node(map, id);
    if (n.partyCap === undefined) continue;
    if (n.recruit?.when === 'leave' && !isDone(s, id, 'volunteer')) continue;
    cap = Math.max(cap, n.partyCap);
  }
  return cap;
}

/** Durak numarası: ayak basılan farklı düğüm sayısı (ilk geçişte 1..stopsPerRun; serbest dolaşımda yürüyüş günlüğü uzar, bu sayı uzamaz). */
export const stopNumber = (s: CampaignState): number => visitedNodes(s).length;
export const isComplete = (s: CampaignState): boolean => nextStep(s).kind === 'complete';
export const isFinal = (s: CampaignState): boolean => s.at === finalNode(mapOf(s));

/** Bir ipucu bu düğümde gösterilmeli mi (tek seferlik)? */
export function pendingTip(s: CampaignState): string | null {
  const tip = CONFIG.tips[s.at];
  return tip && !s.tipsSeen.includes(s.at) ? tip : null;
}

export function markTipSeen(s: CampaignState): CampaignState {
  if (s.tipsSeen.includes(s.at)) return s;
  const t = clone(s);
  t.tipsSeen.push(s.at);
  return t;
}

// ---------------------------------------------------------------- debug

/** Başlangıçtan `target`'a giden bir yol (ilk bulunan; dallar veri sırasıyla). */
export function pathTo(map: CampaignMap, target: string): string[] {
  const parent = new Map<string, string>();
  const queue = [map.start];
  const seen = new Set(queue);
  while (queue.length) {
    const id = queue.shift()!;
    if (id === target) break;
    for (const o of outgoing(map, id))
      if (!seen.has(o)) {
        seen.add(o);
        parent.set(o, id);
        queue.push(o);
      }
  }
  if (!seen.has(target)) throw new Error(`Node ${target} is unreachable`);
  const out = [target];
  while (out[0] !== map.start) out.unshift(parent.get(out[0]!)!);
  return out;
}

/**
 * Debug: düğüme ışınlan. Yol başlangıçtan oraya kurulur, önceki düğümlerin adımları bitmiş sayılır; kadro gerekiyorsa seed'li otomatik
 * seçimlerle doldurulur (kahraman, adaylar, Ashford takımı). Hedef düğümün adımları baştan başlar.
 */
export function debugTeleport(s: CampaignState, target: string): CampaignState {
  const map = mapOf(s);
  let t = newCampaign({ mode: s.mode, seed: s.seed, mapId: s.mapId, campaignId: s.campaignId, difficulty: s.difficulty, slot: s.slot });
  t.stats = { ...s.stats };
  t.tipsSeen = [...s.tipsSeen];
  const route = pathTo(map, target);
  for (let i = 0; i < route.length; i++) {
    const last = i === route.length - 1;
    // Hedef düğümde yalnızca oyuncunun kendisinin yapacağı adımlar kalır; kahraman yoksa otomatik seçilir
    while (true) {
      const step = nextStep(t);
      if (step.kind === 'move' || step.kind === 'complete') break;
      if (last && step.kind !== 'hero') break;
      t = autoResolve(t, step);
    }
    if (!last) t = moveTo(t, route[i + 1]!);
  }
  return t;
}

/**
 * "Skip tutorial" (Ömer 2026-10-23): kahraman seçiminde tutorial atlanır, sefer bölük kurma düğümünde (Ashford) "Form your company"
 * adımında başlar. Tutorial'ı bitiren oyuncuyla aynı durum mevcut kurallarla kurulur: tutorial yolu (Mill Road -> Ravenwood -> Watchtower)
 * seed'li otomatik seçimlerle kazanılmış sayılır (debugTeleport ile aynı yol), Ashford vedası yapılır (tutorial takımı ayrılır, eşyaları
 * torbaya). Kazanılan altın ve eşyalar kalır (open-questions 407 varsayımı); oyuncunun hiç görmediği şeyler temizlenir: zafer sayacı
 * değişmez, bekleyen ganimet / level kartı yok, tutorial düğümlerinin ipuçları görüldü. Teslim kartı (Ömer 2026-10-24, madde 407): ayrılan
 * kahramanlar yerine bölük kurulunca torbadaki eşyayı takabilen sınıflardan seed'li portreler (`skippedSets`, bkz. formCompany).
 */
export function skipTutorial(s: CampaignState): CampaignState {
  expectStep(s, 'hero');
  const map = mapOf(s);
  const target = map.nodes.find((n) => n.newCompany);
  if (!target) throw new Error('This map has no tutorial to skip');
  const route = pathTo(map, target.id);
  let t = clone(s);
  let sets: string[][] = [];
  for (let i = 0; i < route.length; i++) {
    const last = i === route.length - 1;
    while (true) {
      const step = nextStep(t);
      if (step.kind === 'move' || step.kind === 'complete') break;
      if (last && step.kind === 'company') break;
      if (step.kind === 'farewell')
        sets = t.roster.filter((h) => h.tutorial).map((h) => SLOT_IDS.map((k) => h.equipment[k]?.uid).filter((u): u is string => !!u)).filter((g) => g.length);
      t = autoResolve(t, step);
    }
    if (!last) t = moveTo(t, route[i + 1]!);
  }
  t.stats = { ...s.stats };
  delete t.pendingLoot;
  delete t.levelUps;
  delete t.formationDue;
  if (t.pendingHandover) {
    const ho = t.pendingHandover;
    const given = new Set(ho.items);
    const groups = sets.map((g) => g.filter((u) => given.has(u))).filter((g) => g.length);
    t.pendingHandover = { node: ho.node, items: ho.items, from: [], ...(groups.length ? { skippedSets: groups } : {}) };
  }
  for (const id of route.slice(0, -1)) if (CONFIG.tips[id] && !t.tipsSeen.includes(id)) t.tipsSeen.push(id);
  return t;
}

/** Bir adımı oyuncu yerine (seed'li, ilk seçenekle) çözer: debug ve testler. */
export function autoResolve(s: CampaignState, step: NextStep = nextStep(s)): CampaignState {
  switch (step.kind) {
    case 'hero':
      return pickHero(s, CONFIG.starterPool[rngFor(s.seed, 'auto-hero').int(0, CONFIG.starterPool.length - 1)]!);
    case 'recruit':
    case 'volunteer':
      return recruit(s, step.offer[0]!);
    case 'farewell':
      return farewell(s);
    case 'company':
      return formCompany(s, shuffle(CONFIG.companyPool, rngFor(s.seed, 'auto-company')).slice(0, step.size));
    case 'battle':
      return applyBattle(s, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: h.hpRatio, alive: !isFallen(h) })) });
    case 'treasure':
    case 'event':
    case 'story':
    case 'town':
      return completeSimple(s, step.kind);
    case 'rest': {
      // Vekil (sim / otomatik): ücretsiz dinlenir (dinlenme diriltmez, TUR 1 madde 10)
      return restAtCamp(s);
    }
    case 'merchant':
      return leaveMerchant(s);
    default:
      return s;
  }
}

/** Debug: bulunulan düğümün savaşını kazanılmış say (can değişmeden). */
export const debugWinNode = (s: CampaignState): CampaignState => (nextStep(s).kind === 'battle' ? autoResolve(s) : s);

/** Debug (Reset replays): devriye sayaçları sıfırlanır; loot sayacı ilk zafere döner (sonraki devriye yine %60'tan başlar). */
export function debugResetReplays(s: CampaignState): CampaignState {
  const t = clone(s);
  t.replays = {};
  for (const k of Object.keys(t.lootState.clears)) if (k.endsWith(':battle') && t.lootState.clears[k]! > 1) t.lootState.clears[k] = 1;
  return t;
}

/**
 * Debug (Teleport, serbest dolaşım): kadro ve ilerleme aynen kalır, takım keşfedilmiş bir düğüme konur (içerik tetiklenmez; düğüm temizlenmemişse
 * adımları baştan bekler). Duraklatılmış savaş varken olmaz (aynı durum döner).
 */
export function debugRoamTeleport(s: CampaignState, target: string): CampaignState {
  const map = mapOf(s);
  if (pausedLock(s) || !map.nodes.some((n) => n.id === target) || target === s.at) return s;
  const t = clone(s);
  t.visited = [...visitedNodes(t)];
  if (!t.visited.includes(target)) t.visited.push(target);
  t.path.push(target);
  t.at = target;
  delete t.eventChoice;
  delete t.closedShop;
  delete t.formationDue;
  delete t.patrol;
  markCleared(t, target);
  return t;
}

/** Birleşme noktası mı (rozet işareti için)? */
export const isMerge = (map: CampaignMap, id: string): boolean => incoming(map, id).length > 1;
