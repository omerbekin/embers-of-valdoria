import { classes, defaultSlots, skills, CELL_COUNT } from '../engine/content';
import { CONFIG, ENCOUNTERS, EVENTS, STORIES, getMap, type EventChoice } from './data';
import { finalNode, forwardDistances, incoming, node, outgoing } from './graph';
import { rngFor, shuffle } from './seed';
import { emptyEquipment, SLOT_IDS } from '../progression/items';
import { itemRecovery } from '../progression/loadout';
import { emptyLootState, grantGift, grantLoot } from './loot';
import { leaveMerchant } from './merchant';
import { nodeIlvl } from './power';
import { valorRules } from '../engine/content';
import { addValor, canReviveOutside, valorEarned } from '../engine/valor';
import type { BattleOutcome, CampaignMap, CampaignMode, Difficulty, CampaignRules, CampaignState, Hero, MapNode, NextStep, StepKind } from './types';

/**
 * Sefer ilerlemesi (saf; durum JSON'dur ve her işlem YENİ bir durum döndürür). Akış: campaign.md 1.2 ve 4.
 * Bir düğümdeki adımlar sırayla tamamlanır (nodeSteps); hepsi bitince yola çıkılır (moveTo). Seçim noktasında
 * seçilen yol kilitlenir: geri dönüş yok, seçilmeyen dallar graftan ulaşılamaz olur (sis 'closed').
 */

export const clone = (s: CampaignState): CampaignState => JSON.parse(JSON.stringify(s)) as CampaignState;
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
  const options = outgoing(map, n.id);
  return options.length ? { kind: 'move', options } : { kind: 'complete' };
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
 * `requireArea`: adaylardan en az biri alan saldırılı sınıf.
 */
export function recruitOffer(s: CampaignState, nodeId: string): string[] {
  const map = mapOf(s);
  const def = node(map, nodeId).recruit;
  if (!def) return [];
  const owned = new Set(s.roster.map((h) => h.class));
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

function addHero(s: CampaignState, classId: string, o: { leader?: boolean; tutorial?: boolean } = {}): Hero {
  if (!classes[classId]) throw new Error(`Unknown class: ${classId}`);
  const hero: Hero = {
    id: `h${s.nextHeroId++}`,
    class: classId,
    hpRatio: 1,
    alive: true,
    ...(o.leader ? { leader: true } : {}),
    ...(o.tutorial ? { tutorial: true } : {}),
    level: 1,
    xp: 0,
    equipment: emptyEquipment(),
  };
  s.roster.push(hero);
  place(s, hero);
  return hero;
}

/** Tüm kadroyu otomatik dizilime göre yeniden yerleştirir. */
export function autoFormation(s: CampaignState): CampaignState {
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
  // Valor (Ömer 2026-10-13): Valdren Keep'in hikâyesi (komutan Valor'u anlatır) ya da kasabası bitince açılır, hediye ile başlar
  if ((kind === 'story' || kind === 'town') && s.at === valorRules.campaign.introNode && s.valor === undefined) s.valor = addValor(valorRules, 0, valorRules.campaign.gift);
}

// ---------------------------------------------------------------- Valor (Ömer 2026-10-13; data/valor.json)

/** Valor açık mı (Valdren Keep'ten sonra)? Kapalıyken arayüz göstermez ve savaş kazancı birikmez. */
export const valorUnlocked = (s: CampaignState): boolean => s.valor !== undefined;

/** Savaş dışı diriltme yapılabilir mi (açık, yeterli Valor, düşmüş kahraman)? Değilse nedeni. */
export function valorReviveBlocked(s: CampaignState, heroId: string): string | null {
  if (!valorUnlocked(s)) return 'Valor is not known yet';
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
  addHero(t, classId, { tutorial: tutorialActive(t) });
  complete(t, step.kind);
  return t;
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
  addHero(t, classId, { tutorial: tutorialActive(t) });
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

/** "Form your company": `size` farklı sınıf, companyPool'dan serbest; ilk seçilen (ya da `leaderIndex`) lider. */
export function formCompany(s: CampaignState, picks: string[], leaderIndex = 0): CampaignState {
  const step = expectStep(s, 'company');
  const size = (step as Extract<NextStep, { kind: 'company' }>).size;
  if (picks.length !== size) throw new Error(`Pick exactly ${size} classes`);
  if (new Set(picks).size !== picks.length) throw new Error('Each class can be picked only once');
  for (const c of picks) if (!CONFIG.companyPool.includes(c)) throw new Error(`Class not in the company pool: ${c}`);
  const t = clone(s);
  picks.forEach((c, i) => addHero(t, c, { leader: i === leaderIndex }));
  const arranged = autoFormation(t);
  complete(arranged, 'company');
  return arranged;
}

/** Tek tıkla biten adımlar: olay (seçenekli olayda "hiçbir şey yapmadan geç"), hazine, kasaba sahnesi, kasaba (Leave). */
export function completeSimple(s: CampaignState, kind: 'event' | 'treasure' | 'story' | 'town'): CampaignState {
  expectStep(s, kind);
  const t = clone(s);
  // Hazine sandığı (saf hazine ya da korunan hazine): loot torbaya (items.md 3.1)
  if (kind === 'treasure') grantLoot(t, t.at, 'treasure', activeHeroes(t));
  if (kind === 'town') closeShop(t); // kasaba tüccarının tezgâhı kasabadan ayrılınca kapanır (T1); yeniden girilirse aynı tezgâh döner
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
  if (!battle) complete(t, 'event');
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

/** Dinlenme noktasında diriltme fiyatı: base + perIlvl x düğümün item seviyesi (campaign.json > rest.reviveCost; VARSAYIM, madde 305). */
export function reviveCost(s: CampaignState, nodeId: string = s.at): number {
  const c = CONFIG.rest.reviveCost;
  return Math.round(c.base + c.perIlvl * nodeIlvl(s.mapId, nodeId));
}

/** Düşmüş kahramanı altınla dirilt (dinlenme adımında ya da dinlenilmiş kampa yeniden girince; altın yetmezse hata). reviveRatio canla kalkar. */
export function reviveAtCamp(s: CampaignState, heroId: string): CampaignState {
  if (revisitKind(s) !== 'rest') expectStep(s, 'rest'); // dinlenme adımında ya da kampa yeniden girince
  const h = heroById(s, heroId);
  if (!h || !isFallen(h)) throw new Error('This hero has not fallen');
  const cost = reviveCost(s);
  if (s.gold < cost) throw new Error('Not enough gold');
  const t = clone(s);
  const th = heroById(t, heroId)!;
  t.gold -= cost;
  th.alive = true;
  th.hpRatio = Math.round(clamp01(CONFIG.rest.reviveRatio) * 1000) / 1000;
  return t;
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

export function applyBattle(s: CampaignState, outcome: BattleOutcome, rules: CampaignRules = rulesFor(s)): CampaignState {
  const t = clone(s);
  if (!outcome.victory) {
    t.stats.defeats++;
    return t;
  }
  expectStep(t, 'battle');
  const boss = node(mapOf(t), t.at).type === 'boss';
  for (const u of outcome.units) {
    const h = heroById(t, u.heroId);
    if (!h) continue;
    if (!u.alive || u.hpRatio <= 0) {
      // düşmüş (ya da ceset olarak girip diriltilmemiş): ceset kalır
      h.hpRatio = 0;
      h.alive = false;
      continue;
    }
    if (boss) h.hpRatio = Math.max(u.hpRatio, rules.bossVictoryHeal);
    else h.hpRatio = clamp01(u.hpRatio + rules.victoryHeal + itemRecovery(h)); // Recovery affix'i: yalnızca takan (Ömer 2026-10-11)
    h.hpRatio = Math.round(clamp01(h.hpRatio) * 1000) / 1000;
    h.alive = true;
  }
  t.stats.victories++;
  // Valor: yalnızca açıksa birikir (savaşta harcanan düşülür); elit +2, boss +3 (win yerine), kusursuzsa +1
  if (t.valor !== undefined) {
    const type = node(mapOf(t), t.at).type;
    const flawless = outcome.flawless ?? outcome.units.every((u) => u.alive && u.hpRatio > 0);
    t.valor = addValor(valorRules, outcome.valorLeft ?? t.valor, valorEarned(valorRules, type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'normal', flawless));
  }
  if (t.eventChoice?.node === t.at && t.eventChoice.battle) {
    winEventBattle(t); // olay savaşı: düğümün savaş adımı zaten bitti
    return t;
  }
  // Zafer loot'u (items.md 3.1; zorluktan bağımsız, karar 6). Savaşa giren takım = bu sonuçtaki kahramanlar
  const fought = outcome.units.map((u) => heroById(t, u.heroId)).filter((h): h is Hero => !!h);
  const type = node(mapOf(t), t.at).type;
  grantLoot(t, t.at, type === 'boss' ? 'boss' : type === 'elite' ? 'elite' : 'battle', fought.length ? fought : activeHeroes(t));
  complete(t, 'battle');
  return t;
}

/** Kasaba şifası (Ömer 2026-10-11, denge paketi): ücretsiz, herkes `ratio` (tam) cana; düşmüşler de kalkar. */
function healAll(s: CampaignState, ratio: number): void {
  for (const h of s.roster) {
    h.hpRatio = Math.max(isFallen(h) ? 0 : h.hpRatio, clamp01(ratio));
    h.alive = true;
  }
}

// ---------------------------------------------------------------- hareket

/** Yola çıkar: yalnızca düğüm temizlendiyse ve hedef bir çıkışsa. Varılan kasaba iyileştirir. */
export function moveTo(s: CampaignState, to: string): CampaignState {
  const step = nextStep(s);
  if (step.kind !== 'move' || !step.options.includes(to)) throw new Error(`Cannot move to ${to} now`);
  const t = clone(s);
  t.at = to;
  t.path.push(to);
  delete t.eventChoice;
  delete t.closedShop;
  const n = node(mapOf(t), to);
  if (n.heal) healAll(t, n.heal);
  return t;
}

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

/** Durak numarası (1..stopsPerRun). */
export const stopNumber = (s: CampaignState): number => s.path.length;
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
      // Vekil (sim / otomatik): altın yettikçe düşmüşleri diriltir (önce aktif takım), sonra ücretsiz dinlenir
      let t = s;
      const order = [...activeHeroes(s), ...s.roster.filter((h) => !s.active.includes(h.id))];
      for (const h of order) if (isFallen(h) && !h.tutorial && t.gold >= reviveCost(t)) t = reviveAtCamp(t, h.id);
      return restAtCamp(t);
    }
    case 'merchant':
      return leaveMerchant(s);
    default:
      return s;
  }
}

/** Debug: bulunulan düğümün savaşını kazanılmış say (can değişmeden). */
export const debugWinNode = (s: CampaignState): CampaignState => (nextStep(s).kind === 'battle' ? autoResolve(s) : s);

/** Kapanan dalların düğümleri (seçilmeyen yollar). */
export function closedNodes(s: CampaignState): string[] {
  const map = mapOf(s);
  const reach = forwardDistances(map, s.at);
  return map.nodes.filter((n) => !reach.has(n.id) && !s.path.includes(n.id)).map((n) => n.id);
}

/** Birleşme noktası mı (rozet işareti için)? */
export const isMerge = (map: CampaignMap, id: string): boolean => incoming(map, id).length > 1;
