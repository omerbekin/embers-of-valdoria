/**
 * SEFER MOBU SKILL EFEKTLERİ (Bölge I + II, ChatGPT 2026-10-16): hazır 8 karelik sprite sheet'ler (assets/mob-vfx/<mob>/<skill>.png, içe aktarma
 * `node tools/import-mob-art.mjs vfx`). Mob bir sürüm anahtarı değildir: src/game/vfx-select.ts önce bu tabloya bakar (skill id'si), sheet'i
 * yoksa skill eski ödünç (artOf) efektini oynar. Sesler aynen skill'in `sfx` listesinden (ilk ses başta, kalanlar vuruşta).
 *
 * Nasıl oynar (SPECS, skill başına bir satır):
 *   melee   kullanıcı hedefe atılır (c.lunge), sheet hedefte oynar (sıra/alan vuruşunda her hedefte; `windMs`: önce hazırlık pozu)
 *   bolt    büyü/atış hazırlığı (c.windUp), sheet hedefte oynar (ilk kareler mermi/uçuş)
 *   cells   alan skill'i: her kapsanan hücrede bir sheet (aşamalı skill'de aşama aşama, c.releaseStage)
 *   center  alan skill'i: alanın ortasında tek büyük sheet
 *   self    kullanıcının ayağında (Oath of Stone, Call the Buried)
 *   ally    hedef dostun ayağında (Sanctuary, Unholy Benediction)
 * Sheet'ler soldan sağa çizilidir: düşman tarafı (moblar) için yatay aynalanır. `impact` = vuruş karesi (0-7): Promise o karede çözülür
 * (hasar rakamları o an), sheet arkada biter. `at`: 'hit' göğüs hizası, 'ground' ayak/hücre zemini (alta oturan sheet).
 * DAYANAK NOKTASI (vfxSheetAnchors, vuruş karesinin alfa dağılımından): sheet'ler vuruşu karenin ortasına, zemin halkasını karenin altına
 * çizmez, pivot (kare ortası / alt kenar) bunu bilmez ve efekt ayağa / havaya düşerdi (Ömer 2026-10-18). Bu yüzden:
 *   'hit' + melee/bolt: karenin AĞIRLIK MERKEZİ hedefin gövde merkezine (k.spot) oturur;
 *   'ground' (cells, self, ally, zemine inen melee/mermi): içeriğin ALT BANDININ merkezi (zemin diski) hücre zeminine / ayağa (k.feet) oturur;
 *   center + 'hit' (Glyph of Breaking): sheet pivotundan (kare ortası), `squashY` ve -40 ayarıyla zemine yatar.
 * DERİNLİK: efekt hedefin (alan efektinde her hücrenin) birim derinliğinin hemen üstünde çizilir; hedeften ÖNDEKİ birimler efektin üstünde kalır.
 * Phaser'ı çalışma zamanında içe aktarmaz (yalnızca tip): node testlerinde de yüklenir.
 */
import type { CombatantView } from './combatant-view';
import type { VfxCtx } from './vfx';
import type { VfxKit } from './vfx-versions';
import type { V2Vfx } from './art-v2/types';
import { mobSheetId, mobTweenSheetId, vfxSheetFile } from './vfx-sheet-files';
import layout from '../../data/battle-layout.json';
import { IB_CFG } from './vfx-inbetween';

const IB = IB_CFG.player;

/**
 * Yalnızca Debug > VFX frame test (in battle): bir sonraki mob efekti hangi sheet'le / ara karelerle oynasın. `on` kapalıyken (gerçek savaşlar)
 * hiçbir şey değişmez: asıl sheet (assets/mob-vfx) ve data/vfx-inbetween.json > player ayarı.
 *   tween  16 karelik ChatGPT sheet'i (assets/mob-vfx-tween; test ekranı kaydeder, yoksa asıl sheet)
 *   ib     kodla ara kare (null = kapalı)
 *   hand   sheet YERİNE tamamen kodla çizilen efekt (src/game/mob-vfx-hand.ts; test paneli verir, null = kapalı). `hitMs` = asıl sheet'in
 *          vuruş anı (ms, yavaşlatılmadan): el yapımı efekt hasar rakamlarını aynı anda düşürür.
 */
export type MobHandVfx = (c: VfxCtx, k: VfxKit, hitMs: number) => Promise<void>;
export const mobVfxTest: { on: boolean; tween: boolean; ib: { method: string; sub: number } | null; hand: MobHandVfx | null } = { on: false, tween: false, ib: null, hand: null };

type Mode = 'melee' | 'bolt' | 'cells' | 'center' | 'self' | 'ally';

export interface MobVfxSpec {
  /** Sheet'in sahibi (mob id, assets/mob-vfx/<mob>). */
  mob: string;
  mode: Mode;
  at: 'hit' | 'ground';
  /** Vuruş karesi (0-7). */
  impact: number;
  /** 256'lık karenin ekrandaki kenarı (px). */
  size: number;
  /** Dikey basıklık (zemine yatan desen: Glyph of Breaking). */
  squashY?: number;
  /** Hazırlık rengi (c.windUp). */
  hex?: string;
  /** melee: atılmadan önce bu kadar ms hazırlık pozu (poz sayfalı mobda kaldırma karesi: Bandit Chief'in baltası). */
  windMs?: number;
}

export const MOB_VFX_SPECS: Readonly<Record<string, MobVfxSpec>> = {
  // Bölge I (tutorial)
  shiv: { mob: 'cutpurse', mode: 'melee', at: 'hit', impact: 3, size: 220 },
  sand_in_the_eyes: { mob: 'cutpurse', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  bite: { mob: 'grey_wolf', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  rend: { mob: 'grey_wolf', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  poachers_shot: { mob: 'ravenwood_poacher', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#8a9a4a' },
  tainted_bait: { mob: 'ravenwood_poacher', mode: 'bolt', at: 'ground', impact: 1, size: 220, hex: '#6fcf4b' },
  ravens_peck: { mob: 'raven_seer', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#a55cff' },
  murder_of_crows: { mob: 'raven_seer', mode: 'center', at: 'ground', impact: 4, size: 340, hex: '#a55cff' },
  chiefs_cleaver: { mob: 'bandit_chief', mode: 'melee', at: 'hit', impact: 3, size: 250, windMs: 280 },
  toll_sweep: { mob: 'bandit_chief', mode: 'melee', at: 'hit', impact: 4, size: 250, windMs: 280 },
  hold_the_tower: { mob: 'bandit_chief', mode: 'self', at: 'ground', impact: 3, size: 260, hex: '#c0704a' },
  // Bandits
  billhook: { mob: 'moor_raider', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  peat_smoke: { mob: 'moor_raider', mode: 'cells', at: 'ground', impact: 2, size: 210, hex: '#8a6a48' },
  scatter_quarrels: { mob: 'bandit_crossbowman', mode: 'cells', at: 'ground', impact: 1, size: 200, hex: '#c0392b' },
  // Ember Cult / Drowned
  shovel_of_embers: { mob: 'charcoal_burner', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ff7a1a' },
  kiln_smoke: { mob: 'charcoal_burner', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#ff7a1a' },
  clutch: { mob: 'drowned', mode: 'melee', at: 'ground', impact: 3, size: 220 },
  // Guardians
  gatestone_slam: { mob: 'stonebound_warden', mode: 'melee', at: 'ground', impact: 1, size: 250 },
  rockfall: { mob: 'stonebound_warden', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#c08a3a' },
  pick_of_the_deep: { mob: 'thane_of_the_deep', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  oath_of_stone: { mob: 'thane_of_the_deep', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#3aa0ff' },
  rune_spark: { mob: 'deep_runecaller', mode: 'bolt', at: 'hit', impact: 2, size: 220, hex: '#4fe3ff' },
  glyph_of_breaking: { mob: 'deep_runecaller', mode: 'center', at: 'hit', impact: 3, size: 460, squashY: 0.62, hex: '#4fe3ff' },
  // Hexes
  cauldron_splash: { mob: 'hedge_witch_morwen', mode: 'bolt', at: 'ground', impact: 1, size: 230, hex: '#a6e22e' },
  hags_mark: { mob: 'hedge_witch_morwen', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#a6e22e' },
  // Undead
  dirge: { mob: 'grave_chanter', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#a55cff' },
  call_the_buried: { mob: 'grave_chanter', mode: 'self', at: 'ground', impact: 4, size: 230, hex: '#a55cff' },
  // Brann's Order
  penance_flail: { mob: 'oathsworn_brother', mode: 'melee', at: 'ground', impact: 3, size: 240 },
  sanctuary: { mob: 'oathsworn_brother', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#ffcf5a' },
  holy_ember: { mob: 'censer_monk', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ffcf5a' },
  consecrate: { mob: 'censer_monk', mode: 'center', at: 'ground', impact: 2, size: 330, hex: '#ffcf5a' },
  // High Priest of the Undying
  bone_rite: { mob: 'high_priest_of_the_undying', mode: 'bolt', at: 'hit', impact: 3, size: 240, hex: '#a55cff' },
  requiem: { mob: 'high_priest_of_the_undying', mode: 'cells', at: 'ground', impact: 2, size: 230, hex: '#a55cff' },
  unholy_benediction: { mob: 'high_priest_of_the_undying', mode: 'ally', at: 'ground', impact: 4, size: 240, hex: '#a55cff' },
  // Bölge I-II eski skill'ler: kendi sheet'leri (2026-10-17; öncesinde ödünç artOf efekti). Ortak skill'lerin sahibi burada (ember_toss: Hierophant da, shield_bash: Gatewarden da)
  cudgel: { mob: 'road_thug', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  hamstring: { mob: 'road_thug', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  gnaw: { mob: 'ghoul', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  feast: { mob: 'ghoul', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  hex_bolt: { mob: 'fen_witchling', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#b04fa8' },
  bog_curse: { mob: 'fen_witchling', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#9cab3c' },
  wisp_spark: { mob: 'will_o_wisp', mode: 'bolt', at: 'hit', impact: 2, size: 220, hex: '#6fc9b8' },
  marsh_glow: { mob: 'will_o_wisp', mode: 'ally', at: 'ground', impact: 3, size: 230, hex: '#7dff9b' },
  ember_toss: { mob: 'ember_acolyte', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ff7a1a' },
  burn_the_ground: { mob: 'ember_acolyte', mode: 'center', at: 'ground', impact: 3, size: 340, hex: '#ff4d1a' },
  shield_bash: { mob: 'shieldwarden', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  hold_the_line: { mob: 'shieldwarden', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#b9c8dc' },
  drag_under: { mob: 'drowned', mode: 'melee', at: 'ground', impact: 3, size: 230 },
  crossbow_bolt: { mob: 'bandit_crossbowman', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#d9c9a3' },
  shield_wall: { mob: 'thane_of_the_deep', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#7fb8e8' },
  lure_light: { mob: 'hedge_witch_morwen', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#e0b04a' },
  // Bölge III (campaign-dev 2026-10-17; mob-plan.md 10.6): satırlar HAZIR, sheet'ler yarın (ChatGPT). Sheet yokken skill sanatını ödünç aldığı
  // mob skill'inin (artOf) sheet'ini oynar (vfx-select.ts); `node tools/import-mob-art.mjs vfx` sonrası kendi sheet'i kendiliğinden öne geçer.
  halberd_chop: { mob: 'morvane_halberdier', mode: 'melee', at: 'hit', impact: 3, size: 250 },
  pike_thrust: { mob: 'morvane_halberdier', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  wall_of_pikes: { mob: 'sworn_guard', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#c0392b' },
  scorch_bite: { mob: 'ash_hound', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  run_down: { mob: 'ash_hound', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  hold_the_gate: { mob: 'cinder_gatewarden', mode: 'self', at: 'ground', impact: 3, size: 260, hex: '#ff7a1a' },
  burn_the_field: { mob: 'ember_hierophant', mode: 'center', at: 'ground', impact: 3, size: 380, hex: '#ff5a1a' },
  drakefire: { mob: 'drake_priest', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ff8a2a' },
  dragons_breath: { mob: 'drake_priest', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#ff5a1a' },
  kindle_the_faithful: { mob: 'drake_priest', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#ffb04a' },
  cinder_lash: { mob: 'lord_morvane', mode: 'bolt', at: 'hit', impact: 3, size: 250, hex: '#ff6a2a' },
  ashfall: { mob: 'lord_morvane', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#8a6a5a' },
  iron_decree: { mob: 'lord_morvane', mode: 'self', at: 'ground', impact: 3, size: 280, hex: '#c0392b' },
  pyre_of_morvane: { mob: 'lord_morvane', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#ff4d1a' },
  // King's Bridge boss (Bridge Warden)
  anchor_smash: { mob: 'bridge_warden', mode: 'melee', at: 'hit', impact: 3, size: 260, hex: '#ff8a3a' },
  breaking_span: { mob: 'bridge_warden', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#6ad0d8' },
  chain_hook: { mob: 'bridge_warden', mode: 'bolt', at: 'hit', impact: 3, size: 250, hex: '#ff8a3a' },
  ash_brand: { mob: 'bridge_warden', mode: 'bolt', at: 'hit', impact: 4, size: 260, hex: '#ff6a1a' },
  fall_of_kings_bridge: { mob: 'bridge_warden', mode: 'center', at: 'ground', impact: 3, size: 520, hex: '#ff5a1a' },
};

type Pt = { x: number; y: number };

/** OYNATMA AYARLARI (Ömer 2026-10-17: mob efektleri savaşta zor seçiliyordu). Hız ayarları veride: data/battle-layout.json > animation.mobVfx. */
const SIZE_MULT = 1.5; // her spec.size bununla çarpılır (skill'ler arası oran korunur)
const SIZE_MAX = 640; // büyük (center/cells) efektler ekranı kaplamasın (1080 yükseklikte ~%60)
const FPS_SCALE = layout.animation.mobVfx.fpsScale; // sheet fps çarpanı (sheet 12 fps x fpsScale; ayar data/battle-layout.json > animation.mobVfx)
const HOLD_MS = layout.animation.mobVfx.impactHoldMs; // vuruş karesinde donma (ms, k.slow ile)
const MOB_SCALE = (layout.animation.mobVfx as { scale?: number }).scale ?? 1; // yalnızca ChatGPT mob sheet'leri (%20 küçük: 0.8); kodla çizilen sınıf efektleri etkilenmez
const WIND_MULT = layout.animation.mobVfx.windMult; // spec.windMs (hazırlık pozu) çarpanı
const BOOST_ALPHA = 0.35; // ikinci ADD kopyanın şeffaflığı (soluk sanatı parlatır; açık zeminde yıkamaz)
const FLASH_HEX = '#ffe2b0'; // spec.hex yoksa sıcak beyaz
const FLASH_SIZE = 150; // vuruş parlaması başlangıç çapı (px)
const FLASH_GROW = 2.4; // parlama büyüme çarpanı
const FLASH_MS = 220; // parlama süresi (ms, k.slow ile)
const FLASH_ALPHA = 0.85;
const ADD_BLEND = 1; // Phaser.BlendModes.ADD
const CELL_DEPTH = 8; // hücre zemin merkezi (ayak y'sinin ~4-6 px üstü) -> o hücredeki birimin derinliğinin hemen üstü
const SHAKE_MS = 130; // yalnızca melee
const SHAKE_MAG = 0.004;

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Vuruş karesine kadar geçen süre (ms, yavaşlatılmadan; sheet fps'i meta'dan). */
const impactMs = (frame: number, fps: number): number => (frame * 1000) / Math.max(1, fps);

function build(skillId: string, s: MobVfxSpec): V2Vfx {
  const origId = mobSheetId(s.mob, skillId);
  return async (c: VfxCtx, k: VfxKit) => {
    // test ekranı: tamamen kodla çizilen sürüm (sheet yüklenmez); vuruş anı asıl sheet'inkiyle aynı
    if (mobVfxTest.on && mobVfxTest.hand) return mobVfxTest.hand(c, k, impactMs(s.impact, (vfxSheetFile(origId)?.meta.fps ?? 12) * FPS_SCALE));
    // test ekranı: 16 karelik sheet (varsa) ve kare sayısı oranı (vuruş karesi ve fps ona göre); gerçek savaşta hep asıl sheet
    const tweenId = mobVfxTest.on && mobVfxTest.tween ? mobTweenSheetId(s.mob, skillId) : null;
    const id = tweenId && vfxSheetFile(tweenId) ? tweenId : origId;
    const mult = (vfxSheetFile(id)?.meta.frames ?? 8) / (vfxSheetFile(origId)?.meta.frames ?? 8);
    const impactF = Math.round(s.impact * mult);
    const ib = mobVfxTest.on ? mobVfxTest.ib : IB.enabled ? { method: IB.method, sub: IB.sub } : null;
    await k.sheetsReady(c.scene, [id]);
    const flip = c.actor.combatant.side !== 'party';
    const fps = (vfxSheetFile(id)?.meta.fps ?? 12) * FPS_SCALE;
    const size = Math.min(SIZE_MAX, Math.round(s.size * SIZE_MULT * MOB_SCALE));
    const flashColor = parseInt((s.hex ?? FLASH_HEX).slice(1), 16);
    const sfx = c.skill.sfx ?? [];
    // 'bolt' + 'hit' (tek hedefli mermi): vuruş hedefin GÖVDE MERKEZİNDE değil, saldırgana bakan kenarında (ilk temas; data/battle-layout.json > animation.contactEdgeRatio)
    const pos = (v: CombatantView): Pt => (s.at === 'hit' ? (s.mode === 'bolt' ? k.contact(c.actor, v) : k.spot(v)) : k.feet(v));
    // dayanak noktası (origin): vuruş karesinden okunur, pivota değil (başlık yorumu). Doku okunamazsa (null) sheet pivotu kalır.
    const meta = vfxSheetFile(id)?.meta;
    const [fw, fh] = meta?.frame_size ?? [256, 256];
    const anchors = s.at === 'ground' || s.mode === 'melee' || s.mode === 'bolt' ? k.sheetAnchors(c.scene, id, impactF) : null;
    const origin: [number, number] | null = !anchors
      ? null
      : s.at === 'ground'
        ? [anchors.baseX / fw, anchors.baseY / fh]
        : [anchors.core[0] / fw, anchors.core[1] / fh];
    // DERİNLİK: efekt hedefin hemen üstünde, hedeften ÖNDEKİ (ekranda daha aşağıdaki) birimlerin altında çizilir (birim derinliği = ayak y'si).
    const play = (p: Pt, delay = 0, depth = k.DEPTH): void => {
      const base = {
        size,
        flipX: flip,
        fps,
        delay,
        ...(s.squashY ? { squashY: s.squashY } : {}),
        ...(origin ? { origin } : {}),
        ...(ib ? { inbetween: ib } : {}), // kodla ara kare (varsayılan KAPALI: data/vfx-inbetween.json > player)
      };
      const main = k.sheet(c.scene, id, p.x, p.y, { ...base, depth: depth + 1 });
      const glow = k.sheet(c.scene, id, p.x, p.y, { ...base, depth: depth + 2, alpha: BOOST_ALPHA, blend: ADD_BLEND });
      if (!main) return;
      // vuruş karesi: sheet'i kısa dondur + hedefte parlama
      c.scene.time.delayedCall(k.slow(delay + impactMs(impactF, fps)), () => {
        for (const o of [main, glow]) if (o?.active) o.anims.pause();
        const f = c.scene.add.circle(p.x, p.y, FLASH_SIZE / 2, flashColor, FLASH_ALPHA).setBlendMode(ADD_BLEND).setDepth(depth + 3);
        c.scene.tweens.add({ targets: f, scale: FLASH_GROW, alpha: 0, duration: k.slow(FLASH_MS), onComplete: () => f.destroy() });
        c.scene.time.delayedCall(k.slow(HOLD_MS), () => {
          for (const o of [main, glow]) if (o?.active) o.anims.resume();
        });
      });
    };
    const land = (): Promise<void> => {
      const d = deferred();
      c.scene.time.delayedCall(k.slow(impactMs(impactF, fps)), () => {
        for (const x of sfx.slice(1)) c.sfx(x);
        d.resolve();
      });
      return d.promise;
    };
    if (sfx[0]) c.sfx(sfx[0]);

    if (s.mode === 'melee') {
      if (s.windMs) {
        c.actor.play('cast');
        await new Promise<void>((r) => c.scene.time.delayedCall(k.slow(s.windMs! * WIND_MULT), r));
      }
      const t = c.targets[0];
      await c.lunge(t ? t.container.x : c.actor.container.x);
      for (const v of c.targets) play(pos(v), 0, v.container.depth);
      c.scene.time.delayedCall(k.slow(impactMs(impactF, fps)), () => k.shake(c.scene, SHAKE_MS, SHAKE_MAG));
      return land();
    }
    await c.windUp(s.hex ?? c.skill.fx ?? '#ffffff', 'cast');
    if (s.mode === 'bolt' || s.mode === 'ally') {
      for (const v of c.targets) play(pos(v), 0, v.container.depth);
      return land();
    }
    if (s.mode === 'self') {
      play(k.feet(c.actor), 0, c.actor.container.depth);
      return land();
    }
    const cells = c.cells.length ? c.cells : c.targets.map((v) => k.feet(v));
    if (s.mode === 'center') {
      // alanın merkezi = gerçekten kapsanan hücrelerin zemin konumlarının ağırlık merkezi (tıklanan hücre değil; kenarda kırpılan alanda ikisi farklıdır)
      const m = cells.length ? cells.reduce((a, p) => ({ x: a.x + p.x / cells.length, y: a.y + p.y / cells.length }), { x: 0, y: 0 }) : (c.centerPos ?? k.feet(c.actor));
      const mid = s.at === 'hit' ? { x: m.x, y: m.y - 40 } : m;
      play(mid, 0, Math.max(...cells.map((q) => q.y)) + CELL_DEPTH);
      return land();
    }
    // cells: aşamalı skill'de aşama aşama (her aşama bir öncekinden ~180 ms sonra), değilse küçük rastgele gecikmeyle hepsi birden
    if (c.stages && c.stages.length > 1) {
      const STEP = 180;
      c.stages.forEach((st, i) => {
        for (const p of st.cells) play(p, i * STEP, p.y + CELL_DEPTH);
        c.scene.time.delayedCall(k.slow(i * STEP + impactMs(impactF, fps)), () => c.releaseStage(i));
      });
      return land();
    }
    cells.forEach((p, i) => play(p, i * 50, p.y + CELL_DEPTH));
    return land();
  };
}

/** skill id -> efekt (sheet dosyası olmayan skill burada yok: ödünç efektini oynar). */
export function mobVfxOf(skillId: string, hasSheet: (id: string) => boolean): V2Vfx | undefined {
  const s = MOB_VFX_SPECS[skillId];
  if (!s || !hasSheet(mobSheetId(s.mob, skillId))) return undefined;
  return (cache[skillId] ??= build(skillId, s));
}
const cache: Record<string, V2Vfx> = {};
