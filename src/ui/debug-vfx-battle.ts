/**
 * Debug > Characters > Animation tests > "VFX frame test (in battle)" (Ömer 2026-10-18: "bu testi oyun içinde göster ... karakter karşı takımda bir
 * dummy'de bu skilli atsın, animasyon gerçekten oynasın"). GERÇEK test savaşı (BattleScene, mode 'test'): atan mob düşman tarafında, kukla (dummy)
 * oyuncu tarafında durur; skill gerçek savaş hattıyla oynar (hazırlık pozu, atılma, efekt, vuruş, hasar rakamı). Kukla hareket etmez ve ölmez
 * (BattleScene.vfxTestCast her atıştan önce/sonra canı doldurur). Savaş arayüzü gizlenir; üstte küçük kontrol paneli:
 *   Skill (Dirge / Halberd Chop / Wall of Pikes / Rend / Glyph of Breaking: atan mob değişince savaş yeniden kurulur) · Version (Original / ChatGPT 16f / Code in-between /
 *   Hand-coded: sheet'siz, tamamen kodla çizilen efekt, src/game/mob-vfx-hand.ts) ·
 *   Code yöntemi + kat · Cast · Loop · Speed 0.25x/0.5x/1x · Pause + Step (≈1 efekt karesi).
 * Sürüm yalnızca O ATIŞ için seçilir (src/game/mob-vfx.ts > mobVfxTest); panel kapanınca ya da savaştan çıkılınca kapanır, gerçek savaşlar
 * değişmez (Original, ara kare KAPALI). Ayarlar data/vfx-inbetween.json > battleTest. Ayrı kod parçası: debug-tools tembel içe aktarır.
 */
import type Phaser from 'phaser';
import { debugState, effectiveTimeScale } from '../game/debug-state';
import { MOB_VFX_SPECS, mobVfxTest } from '../game/mob-vfx';
import { MOB_HAND_VFX } from '../game/mob-vfx-hand';
import { SLOW } from '../game/combatant-view';
import { BattleScene } from '../game/scenes/BattleScene';
import { newSeed } from '../game/seed';
import { IB_CFG, IB_METHODS } from '../game/vfx-inbetween';
import { mobSheetId, mobTweenSheetId, registerExtraVfxSheet, vfxSheetFile, type VfxSheetMeta } from '../game/vfx-sheet-files';
import { content } from '../engine';
import layout from '../../data/battle-layout.json';
import './debug-vfx-battle.css';

const BT = IB_CFG.battleTest;
const T = IB_CFG.test;
const FPS_SCALE = layout.animation.mobVfx.fpsScale;
const CASTER = 'enemy-0';
const DUMMY = 'party-0';

const tweenImgs = import.meta.glob('../../assets/mob-vfx-tween/*/*.{webp,png}', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const tweenMetas = import.meta.glob('../../assets/mob-vfx-tween/*/*.json', { eager: true, import: 'default' }) as Record<string, VfxSheetMeta>;

/** 16 karelik ChatGPT sheet'ini (varsa) Phaser'ın bulabileceği tabloya kaydeder; yoksa false. */
async function registerTween(mob: string, skill: string): Promise<boolean> {
  const id = mobTweenSheetId(mob, skill);
  if (vfxSheetFile(id)) return true;
  const norm = (k: string): string => k.replace(/\\/g, '/');
  const metaKey = Object.keys(tweenMetas).find((k) => norm(k).endsWith(`/${mob}/${skill}.json`));
  const imgKey = Object.keys(tweenImgs).find((k) => norm(k).endsWith(`/${mob}/${skill}.webp`)) ?? Object.keys(tweenImgs).find((k) => norm(k).endsWith(`/${mob}/${skill}.png`));
  if (!metaKey || !imgKey) return false;
  registerExtraVfxSheet({ id, owner: mob, name: skill, url: await tweenImgs[imgKey]!(), meta: tweenMetas[metaKey]! });
  return true;
}

const tweenExists = (mob: string, skill: string): boolean => Object.keys(tweenMetas).some((k) => k.replace(/\\/g, '/').endsWith(`/${mob}/${skill}.json`));

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Version = 'orig' | 'tween' | 'code' | 'hand';
const HAND_FPS = 60; // el yapımı efekt her karede çizilir: Step ≈ 1 ekran karesi
let openPanel: { close: () => void } | null = null;

export function openVfxBattleTest(game: Phaser.Game): void {
  openPanel?.close();
  const root = document.getElementById('ui-root') ?? document.body;
  const panel = el('div', 'vb-panel');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'VFX frame test (in battle)');

  const state = {
    skill: 0,
    version: 'orig' as Version,
    method: IB_CFG.player.method in IB_CFG.methods ? IB_CFG.player.method : IB_METHODS[0]!,
    sub: IB_CFG.subOptions[0] ?? 2,
    speed: 1,
    loop: false,
    paused: false,
  };
  let alive = true;
  let casting = false;
  let queued = false;
  let gen = 0; // savaş yeniden kurulunca eski döngü kendiliğinden biter
  let seed = 0;
  const tweenOk = T.skills.map((s) => tweenExists(MOB_VFX_SPECS[s.skill]!.mob, s.skill));

  const mk = (txt: string, title: string, fn: () => void, cls = ''): HTMLButtonElement => {
    const b = el('button', `el-icon-btn vb-btn ${cls}`, txt);
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', fn);
    return b;
  };
  const grp = (label: string, ...b: HTMLElement[]): HTMLElement => {
    const g = el('div', 'vb-grp');
    if (label) g.append(el('span', 'vb-lbl', label));
    g.append(...b);
    return g;
  };

  const skillBtns = T.skills.map((sk, i) =>
    mk(sk.label, `Caster: ${MOB_VFX_SPECS[sk.skill]!.mob} casts ${sk.label} on the dummy`, () => {
      if (state.skill === i) return void cast();
      state.skill = i;
      void rebuild();
    }),
  );
  const verBtns: Array<[Version, HTMLButtonElement]> = (
    [
      ['orig', 'Original', 'Original 8-frame sheet (assets/mob-vfx): what real battles use'],
      ['tween', 'ChatGPT 16f', 'ChatGPT 16-frame sheet (assets/mob-vfx-tween)'],
      ['code', 'Code in-between', 'Original 8 frames plus code-made in-between frames'],
      ['hand', 'Hand-coded', 'Drawn fully in code (no sprite sheet): particles, arcs, glows, ground rings; redrawn every frame'],
    ] as Array<[Version, string, string]>
  ).map(([v, label, title]) => [
    v,
    mk(label, title, () => {
      state.version = v;
      sync();
      void cast();
    }),
  ]);
  const methodBtns = IB_METHODS.map((m) =>
    mk(IB_CFG.methods[m]!.label, `Code in-between method: ${IB_CFG.methods[m]!.label}`, () => {
      state.method = m;
      state.version = 'code';
      sync();
      void cast();
    }),
  );
  const subBtns = IB_CFG.subOptions.map((n) =>
    mk(`${n}x`, `Code in-betweens: ${n}x frames`, () => {
      state.sub = n;
      state.version = 'code';
      sync();
      void cast();
    }),
  );
  const castBtn = mk('Cast', 'Cast the skill on the dummy again (with the selected version)', () => void cast(), 'vb-wide vb-main');
  const loopBtn = mk('Loop', 'Auto-repeat: cast again and again', () => {
    state.loop = !state.loop;
    sync();
    if (state.loop) void cast();
  });
  const pauseBtn = mk('Pause', 'Pause / resume the animation', () => {
    state.paused = !state.paused;
    applyTiming();
    sync();
  });
  const stepBtn = mk('Step', 'Advance about one effect frame, then pause again', () => void step());
  const speedBtns = BT.speeds.map((s) =>
    mk(`${s}x`, `Speed ${s}x`, () => {
      state.speed = s;
      applyTiming();
      sync();
    }),
  );
  const closeBtn = mk('Close', 'Close this panel and show the battle screen again', () => close(), 'vb-close');
  const toggle = mk('', 'Hide / show the controls', () => panel.classList.toggle('min'), 'vb-toggle');
  toggle.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  const info = el('div', 'vb-info');
  const codeRow = grp('Code', ...methodBtns, ...subBtns);
  codeRow.classList.add('vb-code');
  const rows = el('div', 'vb-rows');
  rows.append(
    grp('Skill', ...skillBtns),
    grp('Version', ...verBtns.map(([, b]) => b)),
    codeRow,
    grp('', castBtn, loopBtn, pauseBtn, stepBtn),
    grp('Speed', ...speedBtns, closeBtn),
    info,
  );
  panel.append(toggle, rows);

  // ---- sahne ----
  const sceneNow = (): BattleScene | null => {
    const s = game.scene.isActive(BattleScene.KEY) ? game.scene.getScene(BattleScene.KEY) : null;
    return s && !('isLoading' in s) && (s as BattleScene).battle?.seed === seed ? (s as BattleScene) : null;
  };

  function applyTiming(): void {
    debugState.speed = state.speed;
    debugState.paused = state.paused;
    const sc = sceneNow() ?? (game.scene.isActive(BattleScene.KEY) ? (game.scene.getScene(BattleScene.KEY) as BattleScene) : null);
    sc?.applyDebugTiming?.();
    game.anims.globalTimeScale = effectiveTimeScale(debugState); // efekt sprite'ları da hıza uysun (genel animasyon yöneticisi: kapanışta 1'e döner)
  }

  function curSheet() {
    const sk = T.skills[state.skill]!;
    const mob = MOB_VFX_SPECS[sk.skill]!.mob;
    const tw = state.version === 'tween' && tweenOk[state.skill] ? vfxSheetFile(mobTweenSheetId(mob, sk.skill)) : undefined;
    return tw ?? vfxSheetFile(mobSheetId(mob, sk.skill));
  }

  function sync(): void {
    const sk = T.skills[state.skill]!;
    skillBtns.forEach((b, i) => b.classList.toggle('on', i === state.skill));
    verBtns.forEach(([v, b]) => {
      b.classList.toggle('on', v === state.version);
      if (v === 'tween') b.classList.toggle('na', !tweenOk[state.skill]);
      if (v === 'hand') b.classList.toggle('na', !MOB_HAND_VFX[sk.skill]);
    });
    codeRow.classList.toggle('on', state.version === 'code');
    methodBtns.forEach((b, i) => b.classList.toggle('on', state.version === 'code' && IB_METHODS[i] === state.method));
    subBtns.forEach((b, i) => b.classList.toggle('on', state.version === 'code' && IB_CFG.subOptions[i] === state.sub));
    speedBtns.forEach((b, i) => b.classList.toggle('on', BT.speeds[i] === state.speed));
    loopBtn.classList.toggle('on', state.loop);
    pauseBtn.classList.toggle('on', state.paused);
    pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
    stepBtn.disabled = !state.paused;
    castBtn.classList.toggle('busy', casting);
    const f = curSheet();
    const ibSub = state.version === 'code' ? state.sub : 1;
    const label =
      state.version === 'hand' && !MOB_HAND_VFX[sk.skill]
        ? 'Hand-coded: not made for this skill, playing Original'
        : state.version === 'hand'
        ? 'Hand-coded · no sprite sheet, drawn every frame · same hit moment as Original'
        : state.version === 'tween' && !tweenOk[state.skill]
        ? 'ChatGPT 16f: not ready yet (assets/mob-vfx-tween), playing Original'
        : state.version === 'tween'
          ? `ChatGPT 16f · ${f?.meta.frames ?? '?'} frames @ ${((f?.meta.fps ?? 0) * FPS_SCALE).toFixed(1)} fps`
          : state.version === 'code'
            ? `Code (${IB_CFG.methods[state.method]!.label}, ${state.sub}x) · ${(f?.meta.frames ?? 8) * ibSub} frames @ ${((f?.meta.fps ?? 12) * FPS_SCALE * ibSub).toFixed(1)} fps`
            : `Original · ${f?.meta.frames ?? 8} frames @ ${((f?.meta.fps ?? 12) * FPS_SCALE).toFixed(1)} fps`;
    info.textContent = `${sk.label} · ${MOB_VFX_SPECS[sk.skill]!.mob} on the dummy · ${label}`;
  }

  async function step(): Promise<void> {
    if (!state.paused) return;
    const f = curSheet();
    const fps = state.version === 'hand' ? HAND_FPS : (f?.meta.fps ?? 12) * FPS_SCALE * (state.version === 'code' ? state.sub : 1);
    const ms = Math.max(16, ((1000 / fps) * SLOW) / state.speed);
    debugState.paused = false;
    applyTiming();
    await sleep(ms);
    debugState.paused = state.paused;
    applyTiming();
  }

  async function cast(): Promise<void> {
    if (!alive) return;
    if (casting) {
      if (!state.loop) queued = true;
      return;
    }
    const myGen = gen;
    casting = true;
    state.paused = false;
    applyTiming();
    try {
      do {
        queued = false;
        const sk = T.skills[state.skill]!;
        const mob = MOB_VFX_SPECS[sk.skill]!.mob;
        const useTween = state.version === 'tween' && (await registerTween(mob, sk.skill));
        mobVfxTest.on = true;
        mobVfxTest.tween = useTween;
        mobVfxTest.ib = state.version === 'code' ? { method: state.method, sub: state.sub } : null;
        mobVfxTest.hand = state.version === 'hand' ? (MOB_HAND_VFX[sk.skill] ?? null) : null;
        sync();
        const sc = sceneNow();
        if (!sc || myGen !== gen) return;
        const err = await sc.vfxTestCast(sk.skill, CASTER, DUMMY);
        if (myGen !== gen || !alive) return;
        if (err) {
          info.textContent = `Cast failed: ${err}`;
          return;
        }
        if (state.loop || queued) await sleep(BT.loopGapMs);
      } while (alive && myGen === gen && (state.loop || queued));
    } finally {
      if (myGen === gen) {
        casting = false;
        sync();
      }
    }
  }

  /** Savaşı atan moba göre yeniden kurar (kukla oyuncu tarafında, mob düşman tarafında) ve ilk atışı yapar. */
  async function rebuild(): Promise<void> {
    gen++;
    casting = false;
    queued = false;
    sync();
    const sk = T.skills[state.skill]!;
    const mob = MOB_VFX_SPECS[sk.skill]!.mob;
    const cells = (slot: number, id: string): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => (i === slot ? id : ''));
    seed = newSeed();
    const data = {
      seed,
      mode: 'test' as const,
      teams: { party: cells(BT.dummySlot, BT.dummy), enemies: cells(BT.casterSlot, mob) },
      partySize: 1,
      enemySize: 1,
      background: BT.background,
    };
    const cur = game.scene.isActive(BattleScene.KEY) ? game.scene.getScene(BattleScene.KEY) : null;
    if (cur && !('isLoading' in cur)) (cur as BattleScene).scene.restart(data);
    else game.scene.getScenes(true)[0]?.scene.start(BattleScene.KEY, data);
    // yeni savaşın kurulmasını bekle (en çok ~15 sn; sprite'lar iner)
    for (let i = 0; i < 150 && alive; i++) {
      if (sceneNow()) break;
      await sleep(100);
    }
    const sc = sceneNow();
    if (!sc || !alive) {
      info.textContent = 'Could not start the test battle';
      return;
    }
    await sleep(500);
    sc.vfxTestHud(true);
    applyTiming();
    void cast();
  }

  // savaştan çıkılırsa (Menu > Main Menu, başka savaş) panel kendiliğinden kapanır
  const watch = window.setInterval(() => {
    if (!alive || !seed) return;
    if (!sceneNow() && !casting && gen > 0) {
      // geçiş sırasında kısa süre sahne yok olabilir: iki kez üst üste yoksa kapat
      watchMiss++;
      if (watchMiss >= 4) close();
    } else watchMiss = 0;
  }, 500);
  let watchMiss = 0;

  function close(): void {
    if (!alive) return;
    alive = false;
    gen++;
    window.clearInterval(watch);
    mobVfxTest.on = false;
    mobVfxTest.tween = false;
    mobVfxTest.ib = null;
    mobVfxTest.hand = null;
    debugState.speed = 1;
    debugState.paused = false;
    game.anims.globalTimeScale = 1;
    const sc = game.scene.isActive(BattleScene.KEY) ? game.scene.getScene(BattleScene.KEY) : null;
    if (sc && !('isLoading' in sc)) {
      (sc as BattleScene).applyDebugTiming();
      (sc as BattleScene).vfxTestHud(false);
    }
    panel.remove();
    openPanel = null;
  }

  openPanel = { close };
  root.append(panel);
  sync();
  // 16 karelik sheet'leri önceden kaydet (bilgi satırı doğru kare sayısını göstersin; indirme yalnızca atışta olur)
  void Promise.all(T.skills.map((s) => registerTween(MOB_VFX_SPECS[s.skill]!.mob, s.skill))).then(sync);
  void rebuild();
}
