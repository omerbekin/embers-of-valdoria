/**
 * Debug > Characters > Animation tests > "VFX frame test (in battle)" (Ömer 2026-10-18: "bu testi oyun içinde göster ... karakter karşı takımda bir
 * dummy'de bu skilli atsın, animasyon gerçekten oynasın"). GERÇEK test savaşı (BattleScene, mode 'test'): atan mob düşman tarafında, kukla (dummy)
 * oyuncu tarafında durur; skill gerçek savaş hattıyla oynar (hazırlık pozu, atılma, efekt, vuruş, hasar rakamı). Kukla hareket etmez ve ölmez
 * (BattleScene.vfxTestCast her atıştan önce/sonra canı doldurur). Savaş arayüzü gizlenir; üstte küçük kontrol paneli:
 *   Skill (TÜM mob skill'leri, src/game/mob-vfx.ts > MOB_VFX_SPECS: mob'a göre gruplu açılır liste + önceki / sonraki; seçince savaş o skill'in
 *   sahibiyle yeniden kurulur; dost hedefli skill'de atanın yanına bir dost (battleTest.allyMob) konur) · Version (Real battle (panel varsayılanı: gerçek savaşta oynayan sürüm, skill başına veri kararı) / Original / ChatGPT 16f (varsa) /
 *   Code in-between / Hand-coded: sheet'siz, tamamen kodla çizilen efekt, src/game/mob-vfx-hand.ts) ·
 *   Code yöntemi + kat · Cast · Loop · Speed 0.25x/0.5x/1x · Pause + Step (≈1 efekt karesi).
 * Sürüm yalnızca O ATIŞ için seçilir (src/game/mob-vfx.ts > mobVfxTest); panel kapanınca ya da savaştan çıkılınca kapanır, gerçek savaşlar
 * değişmez ('Real battle' sürümü test ezmesi olmadan skill'in gerçek ayarıyla oynar). Ayarlar data/vfx-inbetween.json > battleTest. Ayrı kod parçası: debug-tools tembel içe aktarır.
 */
import type Phaser from 'phaser';
import { debugState, effectiveTimeScale } from '../game/debug-state';
import { MOB_VFX_SPECS, mobRealPlay, mobVfxTest } from '../game/mob-vfx';
import { MOB_HAND_VFX } from '../game/mob-vfx-hand';
import { SLOW } from '../game/combatant-view';
import { BattleScene } from '../game/scenes/BattleScene';
import { newSeed } from '../game/seed';
import { IB_CFG, IB_METHODS } from '../game/vfx-inbetween';
import { mobSheetId, mobTweenSheetId, registerExtraVfxSheet, vfxSheetFile, type VfxSheetMeta } from '../game/vfx-sheet-files';
import { content } from '../engine';
import layout from '../../data/battle-layout.json';
import './debug-vfx-battle.css';
import reviewBoard from '../../docs/anim-review/board.md?raw';

const BT = IB_CFG.battleTest as typeof IB_CFG.battleTest & { allyMob: string; allySlot: number }; // allyMob / allySlot: dost hedefli skill testi (data/vfx-inbetween.json)
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

/** Codex + Claude animasyon incelemesi (docs/anim-review/board.md): skill id -> durum + tarih. Düzeltilenler listede ayrı görünür (Ömer 2026-10-28). */
const REVIEW: Record<string, { status: string; date: string }> = {};
for (const m of reviewBoard.matchAll(/^\| [^|]*?`([a-z0-9_]+)` \| [^|]+\| ([a-z-]+) \| (\d{4}-\d{2}-\d{2})/gm)) REVIEW[m[1]!] = { status: m[2]!, date: m[3]! };
const reviewTag = (skill: string): string => {
  const r = REVIEW[skill];
  if (!r) return '';
  return r.status === 'tamam' ? ` · FIXED ${r.date.slice(5)}` : ' · in review';
};

const tweenExists = (mob: string, skill: string): boolean => Object.keys(tweenMetas).some((k) => k.replace(/\\/g, '/').endsWith(`/${mob}/${skill}.json`));

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Version = 'real' | 'orig' | 'tween' | 'code' | 'hand';
const HAND_FPS = 60; // el yapımı efekt her karede çizilir: Step ≈ 1 ekran karesi
interface PanelHandle {
  close: () => void;
  /** tools/anim-capture.mjs (Playwright) için: skill'i id ile seç, sürümü değiştir, atış sürüyor mu. */
  pick: (skill: string) => boolean;
  version: (v: Version) => void;
  busy: () => boolean;
}
let openPanel: PanelHandle | null = null;
/** Açık VFX test panelinin otomasyon tutamacı (tools/anim-capture.mjs). */
export const vfxBattleTestHandle = (): PanelHandle | null => openPanel;

interface TestSkill {
  /** Listedeki kimlik (pick / board satırı); mob skill'lerinde skill id'si. */
  key: string;
  /** Atılan skill. */
  skill: string;
  label: string;
  mob: string;
  mobName: string;
  /** Dost hedefli (atanın yanına bir dost konur). */
  ally: boolean;
  /** Kukla yerine oyuncu tarafına konan birim (sınıf pasifi denemesi: Heat Mirage = kuklada Mage). */
  dummy?: string;
  /** Kuklanın hücresi (varsayılan battleTest.dummySlot; Ice Crater çarpması: arka sıra, itme tahta kenarına çarpar). */
  dummySlot?: number;
  /** Ana skill'den önce aynı atışta atılan skill'ler (durumlar silinmeden: Ley Thread -> Ley Brand). */
  pre?: string[];
  /** Atanın canı atıştan önce bu orana iner (can çalma pasifi yalnız gerçek iyileşmede oynar: Vampiric Bite). */
  casterHp?: number;
  /** Atıştan sonra savaş sıfırlanmaz (atan bir çağrı: sıfırlama çağrıları kaldırır, ikinci atış olmazdı; Skeleton). */
  keepAfter?: boolean;
}
/**
 * SINIF efektleri (mob değil; Ömer 2026-10-29 Mage / AM reworkü, v2 sınıf efektleri art-v2/<sınıf>/vfx.ts). Atan sınıf birimi düşman tarafında;
 * pasif / durum olay efektleri (passive_<id>, status_<id> ...) bir skill'in yan sonucu olarak oynar.
 */
const CLASS_TESTS: ReadonlyArray<{ key: string; skill: string; caster: string; label?: string; dummy?: string; dummySlot?: number; pre?: string[]; casterHp?: number; keepAfter?: boolean }> = [
  { key: 'ice_crater', skill: 'ice_crater', caster: 'mage' },
  { key: 'ice_crater_crash', skill: 'ice_crater', caster: 'mage', dummySlot: 10, label: 'Ice Crater crash (dummy on the back row: pushed into the edge)' },
  { key: 'heat_mirage', skill: 'rend', caster: 'grey_wolf', dummy: 'mage', label: 'Heat Mirage (Grey Wolf bites the Mage)' },
  { key: 'ley_thread', skill: 'mana_burn', caster: 'antimage', label: 'Ley Thread (Mana Steal)' },
  { key: 'ley_thread_brand', skill: 'drain_field', caster: 'antimage', pre: ['mana_burn'], label: 'Ley Thread used up (Mana Steal, then Ley Brand)' },
  { key: 'storm', skill: 'blizzard', caster: 'mage', label: 'Chill Ground (Blizzard)' },
  // Undead sheet seti (2026-10-29, docs/anim-review/new-art/undead/brief.md): anahtar sheet adında geçer (assets/vfx/undead/NN-<anahtar>-..), yakalama aracı onu izler
  { key: 'bone_throw', skill: 'bone_throw', caster: 'undead' },
  { key: 'wail_of_the_dead', skill: 'wail_of_the_dead', caster: 'undead' },
  { key: 'dark_bond', skill: 'dark_bond', caster: 'undead' },
  { key: 'raise_dead', skill: 'raise_dead', caster: 'undead', label: 'Raise Dead (no corpse: unfed skeleton)' },
  { key: 'vampiric_bite', skill: 'wail_of_the_dead', caster: 'undead', label: 'Vampiric Bite (Undead at half HP drains life with Wail)', casterHp: 0.5 },
  { key: 'bone_slash', skill: 'skeleton_slash', caster: 'skeleton', label: 'Bone Slash (Skeleton)', keepAfter: true },
];
/** Tüm mob skill'leri, sahibine göre gruplu (MOB_VFX_SPECS sırası; aynı mob'un skill'leri yan yana). */
function testSkills(): TestSkill[] {
  const byMob = new Map<string, TestSkill[]>();
  for (const [skill, s] of Object.entries(MOB_VFX_SPECS)) {
    const def = content.skills[skill];
    const unit = content.bosses[s.mob] ?? content.mobs[s.mob];
    const t = def?.target;
    const item: TestSkill = { key: skill, skill, label: def?.name ?? skill, mob: s.mob, mobName: unit?.name ?? s.mob, ally: t === 'single_ally' || t === 'all_allies' };
    const list = byMob.get(s.mob) ?? [];
    list.push(item);
    byMob.set(s.mob, list);
  }
  const cls: TestSkill[] = CLASS_TESTS.filter((t) => content.skills[t.skill]).map((t) => {
    const unit = content.classes[t.caster] ?? content.summons[t.caster] ?? content.bosses[t.caster] ?? content.mobs[t.caster];
    const tgt = content.skills[t.skill]?.target;
    const ally = tgt === 'single_ally' || tgt === 'all_allies';
    return { key: t.key, skill: t.skill, label: t.label ?? content.skills[t.skill]?.name ?? t.skill, mob: t.caster, mobName: `${unit?.name ?? t.caster} (class effects)`, ally, ...(t.dummy ? { dummy: t.dummy } : {}), ...(t.dummySlot !== undefined ? { dummySlot: t.dummySlot } : {}), ...(t.pre ? { pre: t.pre } : {}), ...(t.casterHp !== undefined ? { casterHp: t.casterHp } : {}), ...(t.keepAfter ? { keepAfter: true } : {}) };
  });
  return [...byMob.values()].flat().concat(cls);
}
/** Son seçim (panel yeniden açılınca aynı skill / sürüm). */
const last = { skill: 'rend', version: 'real' as Version };

export function openVfxBattleTest(game: Phaser.Game): void {
  openPanel?.close();
  const root = document.getElementById('ui-root') ?? document.body;
  const panel = el('div', 'vb-panel');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'VFX frame test (in battle)');

  const SK = testSkills();
  const state = {
    skill: Math.max(0, SK.findIndex((s) => s.key === last.skill)),
    version: last.version,
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
  const tweenOk = SK.map((s) => tweenExists(s.mob, s.skill));
  let builtFor = ''; // savaşın kurulduğu düzen (atan mob + dost): aynıysa skill değişince yalnızca atılır
  const layoutKey = (i: number): string => `${SK[i]!.mob}|${SK[i]!.ally ? 1 : 0}|${SK[i]!.dummy ?? ''}|${SK[i]!.dummySlot ?? ''}`;

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

  // skill seçimi: mob'a göre gruplu açılır liste (tüm mob skill'leri: düğme sırası yetmez) + önceki / sonraki
  const pickSkill = (i: number): void => {
    const n = (i + SK.length) % SK.length;
    const sameLayout = layoutKey(n) === builtFor;
    state.skill = n;
    last.skill = SK[n]!.key;
    if (sameLayout) {
      sync();
      void cast();
    } else void rebuild();
  };
  const skillSel = el('select', 'vb-select');
  skillSel.title = 'Skill to test (grouped by the mob that casts it)';
  skillSel.setAttribute('aria-label', 'Skill to test');
  {
    let grp: HTMLOptGroupElement | null = null;
    SK.forEach((sk, i) => {
      if (!grp || grp.label !== sk.mobName) {
        grp = el('optgroup');
        grp.label = sk.mobName;
        skillSel.append(grp);
      }
      const o = el('option', REVIEW[sk.key]?.status === 'tamam' ? 'vb-fixed' : REVIEW[sk.key] ? 'vb-review' : '', sk.label + reviewTag(sk.key));
      o.value = String(i);
      grp.append(o);
    });
  }
  skillSel.addEventListener('change', () => pickSkill(Number(skillSel.value)));
  const prevBtn = mk('', 'Previous skill', () => pickSkill(state.skill - 1), 'vb-arrow');
  prevBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  const nextBtn = mk('', 'Next skill', () => pickSkill(state.skill + 1), 'vb-arrow');
  nextBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  const verBtns: Array<[Version, HTMLButtonElement]> = (
    [
      ['real', 'Real battle', 'Exactly what a real battle plays for this skill (the review decision: Hand-coded, or ChatGPT sheet with code in-betweens)'],
      ['orig', 'Original', 'Original 8-frame sheet (assets/mob-vfx), no in-between frames'],
      ['tween', 'ChatGPT 16f', 'ChatGPT 16-frame sheet (assets/mob-vfx-tween)'],
      ['code', 'Code in-between', 'Original 8 frames plus code-made in-between frames'],
      ['hand', 'Hand-coded', 'Drawn fully in code (no sprite sheet): particles, arcs, glows, ground rings; redrawn every frame'],
    ] as Array<[Version, string, string]>
  ).map(([v, label, title]) => [
    v,
    mk(label, title, () => {
      state.version = v;
      last.version = v;
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
    grp('Skill', prevBtn, skillSel, nextBtn),
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
    const sk = SK[state.skill]!;
    const mob = sk.mob;
    const tw = state.version === 'tween' && tweenOk[state.skill] ? vfxSheetFile(mobTweenSheetId(mob, sk.skill)) : undefined;
    return tw ?? vfxSheetFile(mobSheetId(mob, sk.skill));
  }

  function sync(): void {
    const sk = SK[state.skill]!;
    if (skillSel.value !== String(state.skill)) skillSel.value = String(state.skill);
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
    const real = mobRealPlay(sk.skill);
    const ibSub = state.version === 'code' ? state.sub : state.version === 'real' ? (real.ib?.sub ?? 1) : 1;
    const label =
      state.version === 'real'
        ? real.hand
          ? 'Real battle: Hand-coded (drawn in code, no sprite sheet) · this is what a real battle plays'
          : real.ib
            ? `Real battle: ChatGPT sheet + code in-betweens (${IB_CFG.methods[real.ib.method]?.label ?? real.ib.method}, ${real.ib.sub}x) · ${(f?.meta.frames ?? 8) * real.ib.sub} frames @ ${((f?.meta.fps ?? 12) * FPS_SCALE * real.ib.sub).toFixed(1)} fps · this is what a real battle plays`
            : `Real battle: ChatGPT sheet, no in-betweens · ${f?.meta.frames ?? 8} frames`
        : state.version === 'hand' && !MOB_HAND_VFX[sk.skill]
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
    skillSel.classList.toggle('vb-fixed', REVIEW[sk.key]?.status === 'tamam');
    info.textContent = `${sk.label} · ${sk.mobName} (${state.skill + 1}/${SK.length}) ${sk.ally ? 'on its ally' : 'on the dummy'} · ${label}`;
  }

  async function step(): Promise<void> {
    if (!state.paused) return;
    const f = curSheet();
    const real = mobRealPlay(SK[state.skill]!.skill);
    const handNow = state.version === 'hand' || (state.version === 'real' && real.hand);
    const fps = handNow ? HAND_FPS : (f?.meta.fps ?? 12) * FPS_SCALE * (state.version === 'code' ? state.sub : state.version === 'real' ? (real.ib?.sub ?? 1) : 1);
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
        const sk = SK[state.skill]!;
        const mob = sk.mob;
        const useTween = state.version === 'tween' && (await registerTween(mob, sk.skill));
        mobVfxTest.on = state.version !== 'real'; // 'real' = test kapalı: skill'in gerçek ayarı (el yapımı ya da sheet + ara kare) aynen oynar
        mobVfxTest.tween = useTween;
        mobVfxTest.ib = state.version === 'code' ? { method: state.method, sub: state.sub } : null;
        mobVfxTest.hand = state.version === 'hand' ? (MOB_HAND_VFX[sk.skill] ?? null) : null;
        sync();
        const sc = sceneNow();
        if (!sc || myGen !== gen) return;
        let err = '';
        // atan: düşman tarafında casterSlot'taki birim (dost hedefli testte dost daha küçük yuvada olduğundan uid'i enemy-0 olabilir)
        const caster = sc.battle.combatants.find((u) => u.side === 'enemy' && u.slot === BT.casterSlot && !u.summoned)?.uid ?? CASTER;
        for (const pre of sk.pre ?? []) if (!err) err = await sc.vfxTestCast(pre, caster, DUMMY, { keepAfter: true });
        if (!err && sk.casterHp !== undefined) {
          const c = sc.battle.get(caster);
          if (c) sc.battle.debugSetResource(caster, 'hp', Math.max(1, Math.round(c.maxHp * sk.casterHp)));
        }
        if (!err) err = await sc.vfxTestCast(sk.skill, caster, DUMMY, { ...(sk.pre?.length ? { keepBefore: true } : {}), ...(sk.keepAfter ? { keepAfter: true } : {}) });
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
    const sk = SK[state.skill]!;
    const mob = sk.mob;
    builtFor = layoutKey(state.skill);
    const cells = (units: Array<[number, string]>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => units.find(([s]) => s === i)?.[1] ?? '');
    // dost hedefli skill: dost daha küçük yuvada (debug atışı en küçük yuvadaki dostu seçer; kendisi hariç skill'ler de çalışsın)
    const enemies: Array<[number, string]> = sk.ally ? [[BT.casterSlot, mob], [BT.allySlot, BT.allyMob]] : [[BT.casterSlot, mob]];
    seed = newSeed();
    const data = {
      seed,
      mode: 'test' as const,
      teams: { party: cells([[sk.dummySlot ?? BT.dummySlot, sk.dummy ?? BT.dummy]]), enemies: cells(enemies) },
      partySize: 1,
      enemySize: enemies.length,
      background: BT.background,
    };
    const cur = game.scene.isActive(BattleScene.KEY) ? game.scene.getScene(BattleScene.KEY) : null;
    if (cur && !('isLoading' in cur)) (cur as BattleScene).scene.restart(data);
    else game.scene.getScenes(true)[0]?.scene.start(BattleScene.KEY, data);
    // yeni savaşın kurulmasını bekle (en çok ~60 sn; sprite'lar iner: sınıf birimi ilk kez gelince yükleme uzun sürebilir)
    building = true;
    for (let i = 0; i < 600 && alive; i++) {
      if (sceneNow()) break;
      await sleep(100);
    }
    building = false;
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
    if (!sceneNow() && !casting && !building && gen > 0) {
      // geçiş sırasında kısa süre sahne yok olabilir: iki kez üst üste yoksa kapat
      watchMiss++;
      if (watchMiss >= 4) close();
    } else watchMiss = 0;
  }, 500);
  let watchMiss = 0;
  /** Savaş yeniden kuruluyor (yükleme sürerken panel kapanmasın). */
  let building = false;

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

  openPanel = {
    close,
    pick: (skill) => {
      const i = SK.findIndex((s) => s.key === skill);
      if (i >= 0) pickSkill(i);
      return i >= 0;
    },
    version: (v) => {
      state.version = v;
      last.version = v;
      sync();
    },
    busy: () => casting || !sceneNow(),
  };
  root.append(panel);
  sync();
  // 16 karelik sheet'leri (yalnızca var olanlar) önceden kaydet: bilgi satırı doğru kare sayısını göstersin; indirme yalnızca atışta olur
  void Promise.all(SK.filter((_, i) => tweenOk[i]).map((s) => registerTween(s.mob, s.skill))).then(sync);
  void rebuild();
}
