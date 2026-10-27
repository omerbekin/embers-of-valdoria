import type Phaser from 'phaser';
import { content } from '../engine';
import type { Battle } from '../engine';
import { attachRecorder, replayActions, type ReplayAction } from '../endless/replay';
import {
  applyBattle,
  diveDefeat,
  battlePlan,
  campaignWaveTeams,
  carryCinematics,
  canResume,
  clearPauseSave,
  pauseRecord,
  resumePlan,
  suspendedOf,
  withSuspended,
  writePauseSave,
  PAUSED_CONFIRM,
  PAUSED_NOTICE,
  getMap,
  isFallen,
  node,
  claimSlot,
  latestSave,
  markPlayed,
  newCampaign,
  battleOutcomeOf,
  writeSave,
  writeCheckpointSave,
  saveAgo,
  retreatPatrol,
  patrolRetreatConfirm,
  losePit,
  woundRules,
  setMapOverride,
  DROWNED_REACH,
  type BattlePlan,
  type CampaignMode,
  type CampaignState,
  type Difficulty,
  type SaveEntry,
  type SaveKind,
  SURGE,
  nextTaintGain,
  taintOf,
} from '../campaign';
import type { LootXp } from '../ui/loot-screen';
import { healWounds, valorClearWounds, woundCount } from '../progression/wounds';
import type { ResultAction } from './result-screen';
import type { BattleSceneData } from './scenes/BattleScene';
import { campaignEffects } from './battle-effects';
import { newSeed } from './seed';
import { screenGo } from './screen-go';

/**
 * Seferin tarayıcı tarafı (oturum): o anki sefer durumu, kayıt deposu (localStorage), savaşa geçiş ve savaştan dönüş.
 * Kurallar src/campaign/ içinde (saf); burası yalnızca sahneler arası bağlantıdır.
 */

export const MAP_SCENE = 'CampaignMapScene';
export const MENU_SCENE = 'MainMenuScene';
const BATTLE_SCENE = 'BattleScene';

export { storage } from './kv-storage';
import { storage } from './kv-storage';
import { partyWeapons } from './pose-weapons';
import { logEvent } from '../diag/diag';
import { totalXpFor, trackKills, type KillRecord } from '../progression/levels';
import { maps23On } from '../ui/maps23-flag';
import { mapSceneTrack } from '../ui/music';

// Harita 2 test bayrağı (maps-2-3.md 9.1): debug anahtarı ya da ?maps=1 açıksa bu oturumda Drowned Reach geçişi görünür
if (maps23On()) setMapOverride(DROWNED_REACH, true);

export const session = {
  state: null as CampaignState | null,
  /** Yenilgide artan yerel deneme sayacı (düğüm -> deneme): zarlar değişir, düşman aynı kalır. Kayda yazılmaz. */
  attempts: new Map<string, number>(),
  /** Hiç kayıt yokken yenilgide dönülecek durum (Ironman'ın ilk savaşı). */
  fallback: null as CampaignState | null,
  /** Debug: sis kapalı. */
  revealFog: false,
  /** Debug: haritada can taşıma ayrıntısı. */
  showHp: false,
  /** Ashford'da veda eden tutorial sınıfları ("Played in the tutorial" etiketi). */
  tutorialClasses: [] as string[],
  /** Haritada bir kez gösterilecek kısa not (ör. "Game saved (3/5)"). */
  notice: '',
};

export function current(): CampaignState | null {
  return session.state;
}

export function setState(s: CampaignState): void {
  session.state = s;
}

/** Yeni sefer: mod ve genel zorluk sabitlenir, yuvaya yerleşir (yuvadaki eski sefer silinir; onay ekranda alınır). */
export function startNewCampaign(mode: CampaignMode, difficulty: Difficulty = 'medium', slot = 0): CampaignState {
  const seed = newSeed();
  session.state = newCampaign({ mode, seed, difficulty, slot, campaignId: `c-${seed}-${Math.floor(Date.now() / 1000) % 100000}` });
  claimSlot(storage(), session.state);
  logEvent('campaign', `new ${mode} ${difficulty} slot ${slot}`); // hata raporu izi (src/diag)
  session.attempts = new Map();
  session.fallback = null;
  return session.state;
}

export function loadEntry(entry: SaveEntry): CampaignState {
  session.state = JSON.parse(JSON.stringify(entry.state)) as CampaignState;
  session.attempts = new Map();
  session.fallback = session.state;
  markPlayed(storage(), session.state.slot);
  logEvent('campaign', `load slot ${session.state.slot} at ${session.state.at}`); // Continue / Load Game (hata raporu izi)
  return session.state;
}

/** Kayıt yazar (Ironman yalnızca 'auto'). Haritada gösterilecek notu da hazırlar. */
export function save(kind: SaveKind): boolean {
  const s = session.state;
  if (!s) return false;
  const r = writeSave(storage(), s, kind);
  if (r.ok && kind === 'manual') session.notice = r.replaced.length ? 'Game saved (oldest save replaced)' : 'Game saved';
  return r.ok;
}

/**
 * Kasaba kaydı (Ömer 2026-10-23, playtest B1): kasaba işleminden sonra otomatik kayıt (Normal ve Ironman). Aynı düğümdeki önceki otomatik
 * kaydın yerine yazılır (src/campaign/save.ts > writeCheckpointSave). Duraklatılmış savaş varken yazmaz (onun kaydı ayrı).
 */
export function checkpoint(): boolean {
  const s = session.state;
  if (!s || s.suspended) return false;
  return writeCheckpointSave(storage(), s);
}

/** "Load Last Save"in döneceği yer ve zaman (Defeat ekranı, H4): "Valdren Keep · 12 min ago"; kayıt yoksa sefer başı. */
export function lastSaveNote(now: number = Date.now()): string {
  const s = session.state;
  if (!s) return '';
  const last = latestSave(storage(), s.slot);
  if (last && last.campaignId === s.campaignId) return `${last.summary.node} · ${saveAgo(last.savedAt, now)}`;
  return session.fallback ? 'Start of the journey' : '';
}

/** Yenilgi: aynı seferin son kaydına (yoksa sefer başına) döner; düğümün deneme sayacı artar. */
export function loadLastSave(): CampaignState | null {
  const s = session.state;
  if (!s) return null;
  const last = latestSave(storage(), s.slot);
  const entry = last && last.campaignId === s.campaignId ? last : null;
  const back = entry ? (JSON.parse(JSON.stringify(entry.state)) as CampaignState) : session.fallback;
  if (!back) return null;
  back.stats.defeats = Math.max(back.stats.defeats, s.stats.defeats) + 1;
  delete back.suspended; // yenilgi duraklatma kaydını siler (kaybedilen savaş yarıdan sürdürülemez; düğümün savaşı baştan)
  delete back.patrol; // kaybedilen devriye kayıttan dönünce başlatılmış kalmaz: takım temizlenmiş düğümde, yola çıkabilir
  carryCinematics(s, back); // görülen hikâye sinematikleri (ör. Morvane karşılaşması) kayıttan dönünce yeniden oynamaz
  session.attempts.set(s.at, (session.attempts.get(s.at) ?? 0) + 1);
  session.state = back;
  session.notice = entry ? 'Loaded your last save' : 'Back to the start of the journey';
  logEvent('campaign', `defeat reload at ${back.at}`);
  return back;
}

/**
 * Savaştan haritaya geri çekilme (savaş menüsü > Retreat to Map, onaylı). Ömer 2026-10-14 (Endless 0.7.8.1 ile aynı kural): geri çekilme
 * savaşı SIFIRLAMAZ (yoksa kaybedilen savaş baştan oynanabilirdi), DURAKLATIR: eylem günlüğü durumun `suspended` alanına yazılır ve otomatik
 * kaydedilir (Normal ve Ironman; sekme kapansa da kalır). Takım aynı düğümde kalır; düğüme yeniden girilince savaş aynı turdan sürer
 * (`startCampaignBattle`). O zamana dek yola çıkmak, Gear / Formation / Valor diriltmesi kilitli. Boss savaşında da geçerli.
 */
export function retreatToMap(): CampaignState | null {
  const s = session.state;
  if (!s) return null;
  const rec = recording;
  stopRecording();
  if (rec && !rec.battle.winner && rec.plan.nodeId === s.at) {
    session.state = withSuspended(s, pauseRecord(rec.plan, rec.battle, rec.log));
    writePauseSave(storage(), session.state);
  }
  session.notice = PAUSED_NOTICE;
  return session.state;
}

/**
 * Devriyeden geri çekilme (Ömer 2026-10-19): savaş duraklatılmaz; devriye iptal olur, takım serbest. Her kahraman 0-30% can kaybeder
 * (src/campaign/state.ts > retreatPatrol); haritada kayıplar not olarak yazar. Otomatik kayıt alınır (kayıp kayıttan dönülerek silinmesin).
 */
export function retreatPatrolToMap(): CampaignState | null {
  const s = session.state;
  if (!s) return null;
  // Savaşta ne olduysa kalır (Ömer 2026-10-19): geri çekilme anındaki kahraman canları / düşenler / kalan Valor
  const rec = recording;
  const now = rec && !rec.battle.winner ? battleOutcomeOf(rec.plan, rec.battle, false) : undefined;
  stopRecording();
  const r = retreatPatrol(s, now);
  session.state = r.state;
  save('auto');
  const name = (id: string) => content.classes[s.roster.find((h) => h.id === id)?.class ?? '']?.name ?? 'Hero';
  const parts = r.losses.map((l) => (l.died ? `${name(l.heroId)} died` : l.wounded ? `${name(l.heroId)} wounded` : `${name(l.heroId)} -${l.pct}%`));
  session.notice = `Patrol called off${parts.length ? ` · ${parts.join(', ')}` : ''}`;
  logEvent('campaign', `patrol retreat at ${s.at}`);
  return session.state;
}

/** The Fighting Pit (B5) pes / yenilgi onay metni (savaş menüsü > Retreat). */
export const PIT_YIELD_CONFIRM = 'Yield the pit? The run ends here and this bout pays nothing. Health lost stays lost; fallen heroes rise wounded, and a hero who already has the most wounds dies.';

/**
 * The Fighting Pit (B5): kademe savaşından pes ya da yenilgi (Continue). Savaş duraklatılmaz; koşu biter, savaşta ne olduysa kalır
 * (src/campaign/state.ts > losePit). Otomatik kayıt alınır (kayıp kayıttan dönülerek silinmesin). Takım kasabaya döner.
 */
export function endPitRun(victory = false): CampaignState | null {
  const s = session.state;
  if (!s?.pit) return s ?? null;
  const rec = recording;
  const now = rec && !rec.battle.winner ? battleOutcomeOf(rec.plan, rec.battle, false) : undefined;
  stopRecording();
  session.state = losePit(s, now);
  save('auto');
  session.notice = victory ? 'You walk out of the pit' : 'The crowd keeps the purse · you leave the pit';
  logEvent('campaign', `pit lost at ${s.at} tier ${s.pit.wins + 1}`);
  return session.state;
}

// ------------------------------------------------------------ duraklatılmış savaş (eylem günlüğü; src/campaign/suspend.ts)

/** Kayıt tutulan savaş: eylemler bellekte birikir, geri çekilmede duruma yazılır. */
let recording: { battle: Battle; plan: BattlePlan; log: ReplayAction[]; stop: () => void } | null = null;

function stopRecording(): void {
  recording?.stop();
  recording = null;
}

/** Savaşa günlük tutucuyu bağlar; günlük `actions` ile (sürdürülüyorsa önceki eylemlerle) başlar. */
function startRecording(battle: Battle, plan: BattlePlan, actions: ReplayAction[]): void {
  stopRecording();
  const log = [...actions];
  const off = attachRecorder(battle, (a) => void log.push(a));
  recording = { battle, plan, log, stop: off };
}

/** Bulunulan düğümde duraklatılmış savaş var mı (harita: "Resume battle?" ve kilitler). */
export const pausedHere = (): boolean => !!suspendedOf(session.state);

/**
 * Duraklatılmış savaş sürdürülebilir mi; değilse kayıt silinir (kayıt dosyasındaki dahil) ve false döner: harita notu gösterir, savaş baştan.
 * Kayıt yoksa true (yapılacak bir şey yok).
 */
export function checkPaused(): boolean {
  const s = session.state;
  if (!s?.suspended) return true;
  if (canResume(s)) return true;
  session.state = withSuspended(s, undefined);
  clearPauseSave(storage(), s);
  return false;
}

/** Öldürme kaydı (XP payı: düştükten sonraki öldürmeler %50; progression > trackKills). */
let killTrack: { battle: Battle; kills: () => KillRecord[]; stop: () => void } | null = null;

function startKillTrack(battle: Battle, heroOrder: string[]): void {
  killTrack?.stop();
  const t = trackKills(battle, heroOrder);
  killTrack = { battle, ...t };
}

/** Bu savaşın öldürme kaydı (yoksa undefined: applyBattle tüm düşmanları sayar). */
const killsOf = (battle: Battle): KillRecord[] | undefined => (killTrack?.battle === battle ? killTrack.kills() : undefined);

/** Sefer başı kaydı (Normal: listede görünür; Ironman: yalnızca bellekte, yenilgide dönüş noktası). */
export function markJourneyStart(): void {
  const s = session.state;
  if (!s) return;
  session.fallback = JSON.parse(JSON.stringify(s)) as CampaignState;
  if (s.mode === 'normal') save('start');
}

/** Bulunulan düğümün savaşını başlatır (mevcut savaş girişi: takım + düşman + seed + birim kurulumları). */
export function startCampaignBattle(scene: Phaser.Scene): BattlePlan | null {
  const s = session.state;
  if (!s) return null;
  // Duraklatılmış savaş (Ömer 2026-10-14): kayıttaki seed ile kurulur, günlük oynatılır; doğrulanamazsa savaş baştan (harita önce
  // checkPaused ile denetleyip PAUSED_BROKEN notunu gösterir; burası yalnızca güvenlik ağı)
  checkPaused();
  const st = session.state!;
  const susp = suspendedOf(st);
  const plan = susp ? resumePlan(st, susp) : battlePlan(st, session.attempts.get(st.at) ?? 0);
  const replay = susp?.actions ?? [];
  // Devriye (duraklatılmış eski kayıt değilse): Retreat duraklatmaz, devriyeyi can bedeliyle iptal eder (retreatPatrolToMap)
  const patrolRetreat = !susp && st.patrol === st.at;
  const pitRetreat = !susp && !!plan.pitTier; // The Fighting Pit (B5): Retreat = pes (koşu biter)
  logEvent('battle', `campaign enc ${plan.encounterId} node ${plan.nodeId}${susp ? `, resume ${replay.length} actions` : ''}`); // hata raporu izi
  const game = scene.game;
  const data: Partial<BattleSceneData> = {
    seed: plan.seed,
    mode: 'turns',
    battleId: content.DEFAULT_BATTLE,
    teams: { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan), ...(plan.valor !== undefined ? { valor: { party: plan.valor } } : {}) },
    partySize: plan.party.filter(Boolean).length,
    enemySize: plan.enemies.filter(Boolean).length,
    // Genel zorluk (yapay zeka): engine-dev AI girdisini hazırlıyor; BattleScene şimdilik yalnızca taşır
    difficulty: plan.difficulty,
    // Bölge düşman YZ ayarı (valdoria.json regions[].enemyAi; D5)
    ...(plan.enemyAi ? { enemyAi: plan.enemyAi } : {}),
    // Poz kütüphanesi (yalnızca sunum): kahramanların takılı silahı ekranda çizilen silahı seçer (src/game/poses.ts)
    weapons: { items: partyWeapons(plan.heroOrder, (id) => st.roster.find((h) => h.id === id)?.equipment.weapon, (id) => st.roster.find((h) => h.id === id)?.equipment.offhand) },
    // Level'lar (ad plakasında "Lv N"): düşmanlar düğüm seviyesinde, kahramanlar kendi level'ında
    levels: { enemy: plan.enemyLevel, party: Object.fromEntries(plan.heroOrder.map((id, i) => [`party-${i}`, st.roster.find((h) => h.id === id)?.level ?? 1])) },
    // Crown Surge (sunum): Ashen Taint çipleri ve ipucundaki bir sonraki Taint (Surge'ün kendisi teams.surge, campaignWaveTeams)
    ...(plan.surge?.length || st.roster.some((h) => taintOf(h) > 0)
      ? { crown: { taint: Object.fromEntries(plan.heroOrder.map((id, i) => [`party-${i}`, taintOf(st.roster.find((h) => h.id === id))])), nextTaint: nextTaintGain(st), hpLoss: SURGE.taint.maxHpLoss } }
      : {}),
    // Savaş arka planı (karşılaşma > düğüm > bölge; dosya yoksa savaşın varsayılanı): King's Bridge = kings-bridge
    ...(plan.background ? { background: plan.background } : {}),
    // Tutorial bağlamı (docs/design/tutorial.md): düğüm / bölge dersleri, Bölüm III yenilgi ipucu (bu düğümdeki yenilgi sayısı)
    tutorial: { node: plan.nodeId, region: node(getMap(st.mapId), plan.nodeId).region, encounter: plan.encounterId, defeats: session.attempts.get(st.at) ?? 0 },
    campaign: {
      resultActions: (victory, battle) => resultActions(game, plan, victory, battle),
      resultSubtitle: (victory, battle) => fallenNote(plan, victory, battle),
      battleEffects: () => campaignEffects(st),
      music: mapSceneTrack(getMap(st.mapId).music, 'battle'), // haritanın kendi savaş müziği (Harita 2: battle_reach)
      retreatConfirm: pitRetreat ? PIT_YIELD_CONFIRM : patrolRetreat ? patrolRetreatConfirm() : PAUSED_CONFIRM,
      // Savaş kurulur kurulmaz (çizimden önce): sürdürülüyorsa günlük oynatılır, sonra kayıt başlar
      prepareBattle: (battle) => {
        startKillTrack(battle, plan.heroOrder); // XP payı (levels.md): günlük oynatılmadan önce (sürdürülen savaşın öldürmeleri de sayılır)
        if (replay.length) replayActions(battle, replay);
        startRecording(battle, plan, replay);
      },
      retreat: () => {
        if (pitRetreat) endPitRun();
        else if (patrolRetreat) retreatPatrolToMap();
        else retreatToMap();
        screenGo(game.scene.getScene(BATTLE_SCENE) as Phaser.Scene, MAP_SCENE); // kit ekran geçişi (kararıp açılma), Menu > Retreat
      },
    },
  };
  scene.scene.start(BATTLE_SCENE, data);
  return plan;
}

const goTo = (game: Phaser.Game, key: string, data?: object) => (game.scene.getScene(BATTLE_SCENE) as Phaser.Scene).scene.start(key, data);

/** Zaferde düşen kahramanlar (Ömer 2026-10-11): kendiliğinden kalkmazlar; sonuç ekranında not. */
export function fallenNote(plan: BattlePlan, victory: boolean, battle: Battle): string | undefined {
  if (!victory) return undefined;
  // Can ve ölüm reworkü (Ömer 2026-10-19): düşen kahraman yaralı kalkar; lethal yaralıysa ölür (ceset, Valor kaldırır)
  const s = session.state;
  const lethal = woundRules().lethal;
  let wounded = 0;
  let died = 0;
  const out = battleOutcomeOf(plan, battle, true);
  for (const u of out.units) {
    if (u.alive) continue;
    const h = s?.roster.find((x) => x.id === u.heroId);
    // savaş içi Valor diriltmesi yara siler (Ömer 2026-10-20): ölümcül sınır o sayıya göre
    const w = h ? healWounds(woundCount(h), (out.valorRevived?.[h.id] ?? 0) * valorClearWounds()) : 0;
    if (!h || (isFallen(h) && !out.valorRevived?.[h.id]) || w >= lethal) died++;
    else wounded++;
  }
  const parts = [wounded ? `${wounded} ${wounded === 1 ? 'hero' : 'heroes'} wounded` : '', died ? `${died} ${died === 1 ? 'hero' : 'heroes'} died  ·  only Valor can raise them` : ''].filter(Boolean);
  return parts.length ? parts.join('  ·  ') : undefined;
}

/** Toplam XP (level eşiklerinin toplamı + mevcut XP): savaştan kazanılan XP'yi göstermek için fark alınır. */
const totalXp = (level: number, xp: number): number => totalXpFor(level) + xp;

/**
 * Zaferden sonra (Continue): düşen ganimet varsa LOOT ekranı savaş sahnesinin üstünde açılır (Ömer 2026-10-18: "moblar ölünce loot ekranı";
 * haritada eski "Spoils" kartı açılmaz). Ekran kapanınca (alınmayanlar bırakıldı) kayıt yenilenir ve haritaya geçilir. Ganimet yoksa doğrudan harita.
 */
function openLootThenMap(game: Phaser.Game, xp: LootXp[]): void {
  const root = document.getElementById('ui-root');
  if (!session.state?.pendingLoot || !root) return void goTo(game, MAP_SCENE);
  void import('../ui/loot-screen').then(async (m) => {
    const g = await import('../ui/gear-screen');
    const h = m.openLootScreen(root, {
      get: () => session.state!,
      set: setState,
      gear: g.campaignGearSource(() => session.state!, setState),
      xp,
      onDone: () => {
        save('auto'); // alınan item'ler kayda geçsin
        goTo(game, MAP_SCENE);
      },
    });
    game.scene.getScene(BATTLE_SCENE).events.once('shutdown', () => h.abort());
  });
}

/** Sefer savaşının sonuç ekranı düğmeleri. */
export function resultActions(game: Phaser.Game, plan: BattlePlan, victory: boolean, battle: Battle): ResultAction[] {
  if (recording?.battle === battle) stopRecording();
  // Yenilgi duraklatma kaydını hemen siler (bellek + kayıt dosyası): sekme kapatılsa da kaybedilen savaş yarıdan sürdürülemez. Akış aynı.
  const cur = session.state;
  if (!victory && cur?.suspended && cur.at === plan.nodeId) {
    session.state = withSuspended(cur, undefined);
    clearPauseSave(storage(), cur);
  }
  if (victory)
    return [
      {
        label: 'Continue',
        primary: true,
        run: () => {
          const s = session.state;
          let xp: LootXp[] = [];
          if (s && s.at === plan.nodeId) {
            const kills = killsOf(battle);
            const before = new Map(s.roster.map((h) => [h.id, { level: h.level, xp: h.xp }]));
            const outcome = battleOutcomeOf(plan, battle, true);
            const hpEnd = new Map(outcome.units.map((u) => [u.heroId, u.hpRatio]));
            session.state = applyBattle(s, { ...outcome, ...(kills ? { kills } : {}) });
            const act = session.state.active;
            xp = session.state.roster
              .map((h): LootXp => {
                const b = before.get(h.id) ?? { level: h.level, xp: h.xp };
                return { name: content.classes[h.class]?.name ?? h.class, gain: totalXp(h.level, h.xp) - totalXp(b.level, b.xp), heroId: h.id, cls: h.class, from: b, to: { level: h.level, xp: h.xp }, fallen: isFallen(h), ...(hpEnd.has(h.id) && !isFallen(h) ? { hpFrom: hpEnd.get(h.id)!, hpTo: h.hpRatio } : {}) };
              })
              .filter((x) => x.gain > 0 || (act.includes(x.heroId!) && x.fallen)); // XP almayan düşmüş kahraman da gri satır
            killTrack?.stop();
            killTrack = null;
            save('auto');
          }
          openLootThenMap(game, xp);
        },
      },
    ];
  // The Fighting Pit (B5): yenilgi koşuyu bitirir, sefer kuralıyla (yara / ceset) kasabaya dönülür; kayıttan dönüş yok
  if (plan.pitTier && session.state?.pit?.node === plan.nodeId)
    return [
      {
        label: 'Leave the pit',
        primary: true,
        run: () => {
          const cur2 = session.state;
          if (cur2?.pit) {
            const out = battleOutcomeOf(plan, battle, false);
            session.state = losePit(cur2, out);
            save('auto');
            session.notice = 'The crowd keeps the purse · you leave the pit';
          }
          goTo(game, MAP_SCENE);
        },
      },
    ];
  // B1 Salvage Dive: derinlikte yenilgi = yüzeye yüz (son bulunan sandık batar, öncekiler alınır); kayıt yükleme ikincil
  const cur2 = session.state;
  const diveOut: ResultAction[] =
    plan.dive && cur2 && cur2.at === plan.nodeId
      ? [
          {
            label: 'Swim for the surface',
            primary: true,
            note: 'The last chest you found sinks. Earlier chests come up with you.',
            run: () => {
              const s = session.state;
              if (s && s.at === plan.nodeId) {
                session.state = diveDefeat(s, battleOutcomeOf(plan, battle, false));
                killTrack?.stop();
                killTrack = null;
                save('auto');
              }
              openLootThenMap(game, []);
            },
          },
        ]
      : [];
  const out: ResultAction[] = [
    ...diveOut,
    {
      label: 'Load Last Save',
      primary: !diveOut.length,
      note: lastSaveNote(), // H4: kaydın yeri ve zamanı düğmenin altında
      run: () => {
        loadLastSave();
        goTo(game, MAP_SCENE);
      },
    },
  ];
  if (session.state?.mode === 'normal') out.push({ label: 'Load Game', run: () => goTo(game, MENU_SCENE, { open: 'load' }) });
  out.push({ label: 'Main Menu', run: () => goTo(game, MENU_SCENE) });
  return out;
}
