/**
 * Debug > Characters > "VFX frame test" (Ömer 2026-10-18: ChatGPT mob animasyonlarında kareler arası boşluk). Tam ekran DOM sayfası:
 * seçilen mob skill animasyonu, hedef mob sprite'ı üzerinde, savaş zemininde ÜÇ sütunda döngüyle oynar:
 *   Original (8 kare, oyundaki hâli) | ChatGPT (16 kare, assets/mob-vfx-tween; dosya yoksa "not ready yet") | Code (kodla ara kare, 8 -> 8*sub).
 * Kontroller: skill seçici, oynat/duraklat, hız (0.25x/0.5x/1x), kare adımı (yarım kare = 16 karelik sütunun bir karesi), döngü, kod yöntemi + kat.
 * Oynatma oyundaki gibi: sheet fps x fpsScale (data/battle-layout.json), vuruş karesinde impactHoldMs donma, efektin parlak ADD kopyası.
 * Sadeleştirmeler: tek hücre (cells skill'inde de), mermi için temas kenarı yok (hedef gövdesi), vuruş parlaması yok. Ayarlar data/vfx-inbetween.json > test.
 * Ayrı kod parçası: debug-tools tembel içe aktarır.
 */
import layout from '../../data/battle-layout.json';
import { IB_CFG, IB_METHODS, buildInbetween, canvasAnchors, sliceSheet } from '../game/vfx-inbetween';
import { MOB_VFX_SPECS } from '../game/mob-vfx';
import { MOB_VFX_SHEET_FILES, mobSheetId, type VfxSheetMeta } from '../game/vfx-sheet-files';
import { lockInput, unlockInput } from './input-lock';
import { navSvg } from './nav-icons';
import './debug-vfx-frames.css';

const T = IB_CFG.test;
const FPS_SCALE = layout.animation.mobVfx.fpsScale;
const HOLD_MS = layout.animation.mobVfx.impactHoldMs;
const MOB_SCALE = (layout.animation.mobVfx as { scale?: number }).scale ?? 1;
const SIZE_MULT = 1.5;
const SIZE_MAX = 640;

// tembel dosya tabloları (yalnızca bu sayfa açılınca kullanılır)
const bgUrls = import.meta.glob('../../assets/backgrounds/*.webp', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const spriteUrls = import.meta.glob('../../assets/sprites/*/idle.webp', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const tweenImgs = import.meta.glob('../../assets/mob-vfx-tween/*/*.{webp,png}', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const tweenMetas = import.meta.glob('../../assets/mob-vfx-tween/*/*.json', { eager: true, import: 'default' }) as Record<string, VfxSheetMeta>;

const loadImg = (url: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('image'));
    i.src = url;
  });

async function urlOf(table: Record<string, () => Promise<string>>, suffix: string): Promise<string | null> {
  const key = Object.keys(table).find((k) => k.replace(/\\/g, '/').endsWith(suffix));
  return key ? await table[key]!() : null;
}

interface Col {
  title: string;
  note: string;
  frames: HTMLCanvasElement[];
  fps: number;
  anchors: ReturnType<typeof canvasAnchors>;
  fw: number;
  fh: number;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let open: HTMLElement | null = null;

export function openVfxFrameTest(): void {
  if (open) return;
  const root = document.getElementById('ui-root') ?? document.body;
  const overlay = el('div', 'vf-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'VFX frame test');

  // ---- üst: Back + başlık + skill seçici + kod yöntemi ----
  const back = el('button', 'nav-btn el-back vf-back');
  back.innerHTML = navSvg('back');
  back.title = 'Back';
  back.setAttribute('aria-label', 'Back');
  back.type = 'button';
  const head = el('div', 'vf-head');
  head.append(el('h2', 'el-title vf-title', 'VFX frame test'));
  const skillRow = el('div', 'vf-seg');
  const methodRow = el('div', 'vf-seg');
  head.append(skillRow, methodRow);

  // ---- orta: üç sütun ----
  const grid = el('div', 'vf-grid');
  const [lw, lh] = T.logical;
  const cols = [0, 1, 2].map(() => {
    const box = el('div', 'vf-col');
    const cv = el('canvas', 'vf-canvas');
    cv.width = lw;
    cv.height = lh;
    const cap = el('div', 'vf-cap');
    const sub = el('div', 'vf-sub');
    box.append(cv, cap, sub);
    grid.append(box);
    return { cv, cap, sub, ctx: cv.getContext('2d')! };
  });

  // ---- alt: kontroller ----
  const bar = el('div', 'vf-bar');
  const mk = (txt: string, title: string, fn: () => void, cls = ''): HTMLButtonElement => {
    const b = el('button', `el-icon-btn vf-btn ${cls}`, txt);
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', fn);
    return b;
  };
  const state = {
    skill: 0,
    method: IB_CFG.player.method in IB_CFG.methods ? IB_CFG.player.method : IB_METHODS[0]!,
    sub: IB_CFG.subOptions[0] ?? 2,
    speed: 1,
    playing: true,
    loop: true,
    t: 0,
  };
  const playBtn = mk('Pause', 'Play / pause (Space)', () => setPlaying(!state.playing), 'vf-wide');
  const prev = mk('‹', 'Step back (half an original frame; Left arrow)', () => step(-1));
  const next = mk('›', 'Step forward (half an original frame; Right arrow)', () => step(1));
  const speedBtns = T.speeds.map((s) =>
    mk(`${s}x`, `Speed ${s}x`, () => {
      state.speed = s;
      syncUi();
    }),
  );
  const loopBtn = mk('Loop', 'Loop on / off', () => {
    state.loop = !state.loop;
    syncUi();
  });
  const subBtns = IB_CFG.subOptions.map((n) =>
    mk(`${n}x`, `Code in-betweens: ${n}x frames`, () => {
      state.sub = n;
      void rebuild();
    }),
  );
  const grp = (label: string, ...b: HTMLElement[]): HTMLElement => {
    const g = el('div', 'vf-grp');
    if (label) g.append(el('span', 'vf-lbl', label));
    g.append(...b);
    return g;
  };
  bar.append(grp('', playBtn, prev, next), grp('Speed', ...speedBtns), grp('', loopBtn), grp('Code', ...subBtns));
  const info = el('div', 'vf-info');
  overlay.append(back, head, grid, bar, info);

  // ---- veri ----
  let bg: HTMLImageElement | null = null;
  const sprites = new Map<string, HTMLImageElement | null>();
  let colData: (Col | null)[] = [null, null, null];
  let total = 1;
  let impactT = 0;
  let origFps = 12;
  let alive = true;
  let raf = 0;
  let last = 0;
  let gap = 0;
  let buildId = 0;

  const skillId = (): string => T.skills[state.skill]!.skill;
  const spec = () => MOB_VFX_SPECS[skillId()]!;

  async function loadCols(): Promise<void> {
    const sk = T.skills[state.skill]!;
    const s = spec();
    const f = MOB_VFX_SHEET_FILES.find((x) => x.id === mobSheetId(s.mob, sk.skill));
    const next: (Col | null)[] = [null, null, null];
    if (!f) {
      colData = next;
      return;
    }
    const img = await loadImg(f.url);
    const [fw, fh] = f.meta.frame_size;
    const orig = sliceSheet(img, f.meta.frames, fw, fh, f.meta.grid?.[0] ?? 4);
    origFps = f.meta.fps * FPS_SCALE;
    next[0] = { title: 'Original', note: `${orig.length} frames @ ${origFps.toFixed(1)} fps`, frames: orig, fps: origFps, anchors: null, fw, fh };
    // ChatGPT ara kareli (assets/mob-vfx-tween/<mob>/<skill>.png + .json; sanat ajanı üretir, yoksa "not ready yet")
    const metaKey = Object.keys(tweenMetas).find((k) => k.replace(/\\/g, '/').endsWith(`/${s.mob}/${sk.skill}.json`));
    const imgUrl = (await urlOf(tweenImgs, `/${s.mob}/${sk.skill}.webp`)) ?? (await urlOf(tweenImgs, `/${s.mob}/${sk.skill}.png`));
    if (metaKey && imgUrl) {
      try {
        const tm = tweenMetas[metaKey]!;
        const ti = await loadImg(imgUrl);
        const [tw, th] = tm.frame_size;
        const tf = sliceSheet(ti, tm.frames, tw, th, tm.grid?.[0] ?? 4);
        const mult = tm.frames / f.meta.frames;
        next[1] = { title: 'ChatGPT', note: `${tf.length} frames @ ${(f.meta.fps * mult * FPS_SCALE).toFixed(1)} fps`, frames: tf, fps: origFps * mult, anchors: null, fw: tw, fh: th };
      } catch {
        next[1] = null;
      }
    }
    // Kod
    const code = buildInbetween(orig, state.method, state.sub);
    next[2] = { title: 'Code', note: `${IB_CFG.methods[state.method]!.label} · ${code.length} frames @ ${(origFps * state.sub).toFixed(1)} fps`, frames: code, fps: origFps * state.sub, anchors: null, fw, fh };
    for (const c of next) {
      if (!c) continue;
      const at = Math.min(c.frames.length - 1, Math.round((s.impact * c.frames.length) / orig.length));
      c.anchors = canvasAnchors(c.frames[at]!);
    }
    impactT = (s.impact * 1000) / origFps;
    total = (orig.length * 1000) / origFps + HOLD_MS;
    if (!sprites.has(sk.target)) {
      const u = await urlOf(spriteUrls, `/${sk.target}/idle.webp`);
      sprites.set(sk.target, u ? await loadImg(u).catch(() => null) : null);
    }
    colData = next;
  }

  function frameIndex(c: Col, t: number): number {
    const dur = 1000 / c.fps;
    const held = t > impactT ? Math.min(HOLD_MS, t - impactT) : 0;
    return Math.max(0, Math.min(c.frames.length - 1, Math.floor((t - held) / dur + 1e-6)));
  }

  function draw(): void {
    const sk = T.skills[state.skill]!;
    const s = spec();
    const spr = sprites.get(sk.target) ?? null;
    cols.forEach((col, i) => {
      const { ctx } = col;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, lw, lh);
      ctx.imageSmoothingEnabled = true;
      if (bg) {
        const k = Math.max(lw / bg.width, lh / bg.height);
        const bw = bg.width * k;
        ctx.drawImage(bg, (lw - bw) / 2, lh - bg.height * k, bw, bg.height * k);
      } else {
        ctx.fillStyle = '#2b2d42';
        ctx.fillRect(0, 0, lw, lh);
      }
      if (spr) {
        const h = T.spriteHeight;
        const w = (spr.width / spr.height) * h;
        ctx.drawImage(spr, T.targetX - w / 2, T.groundY - h, w, h);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(T.targetX - 40, T.groundY - T.spriteHeight, 80, T.spriteHeight);
      }
      const c = colData[i];
      col.cap.textContent = c ? c.title : i === 1 ? 'ChatGPT' : '';
      col.sub.textContent = c ? c.note : i === 1 ? 'not ready yet (assets/mob-vfx-tween)' : '';
      col.cv.classList.toggle('na', !c);
      if (!c) return;
      if (state.t >= total && state.playing) return; // döngü arası: efekt yok
      const idx = frameIndex(c, Math.min(state.t, total - 1));
      const size = Math.min(SIZE_MAX, Math.round(s.size * SIZE_MULT * MOB_SCALE)) * T.scale;
      const k = size / c.fw;
      const a = c.anchors;
      const ground = s.at === 'ground';
      const ax = a ? (ground ? a.baseX : a.core[0]) : c.fw / 2;
      const ay = a ? (ground ? a.baseY : a.core[1]) : c.fh / 2;
      const px = T.targetX;
      const py = ground ? T.groundY - 6 : T.groundY - T.spriteHeight * 0.5;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(-k, k * (s.squashY ?? 1)); // düşman efekti yatay aynalı (oyundaki gibi)
      ctx.translate(-ax, -ay);
      ctx.drawImage(c.frames[idx]!, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(c.frames[idx]!, 0, 0);
      ctx.restore();
      col.sub.textContent = `${c.note} · frame ${idx + 1}/${c.frames.length}`;
    });
  }

  function setPlaying(on: boolean): void {
    if (on && !state.loop && state.t >= total - 1) state.t = 0;
    state.playing = on;
    gap = 0;
    syncUi();
  }

  function tick(now: number): void {
    if (!alive) return;
    const dt = Math.min(100, now - last);
    last = now;
    if (state.playing) {
      if (state.t >= total) {
        gap += dt * state.speed;
        if (gap >= T.loopGapMs) {
          gap = 0;
          if (state.loop) state.t = 0;
          else setPlaying(false);
        }
      } else {
        state.t += dt * state.speed;
        if (state.t >= total && !state.loop) {
          state.t = total - 1;
          setPlaying(false);
        }
      }
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function step(dir: number): void {
    state.playing = false;
    const half = 500 / origFps;
    // adım = yarım asıl kare; vuruş karesindeki donma süresi tek adımda geçilir
    const holdOf = (n: number): number => (n * half > impactT + 1 ? HOLD_MS : 0);
    let cur = 0;
    for (let n = 0; n * half + holdOf(n) <= Math.min(state.t, total - 1) + 1; n++) cur = n;
    const maxN = Math.round((total - HOLD_MS) / half) - 1;
    let n = cur + dir;
    if (n < 0) n = maxN;
    if (n > maxN) n = 0;
    state.t = n * half + holdOf(n) + 1;
    syncUi();
  }

  function syncUi(): void {
    playBtn.textContent = state.playing ? 'Pause' : 'Play';
    speedBtns.forEach((b, i) => b.classList.toggle('on', T.speeds[i] === state.speed));
    loopBtn.classList.toggle('on', state.loop);
    subBtns.forEach((b, i) => b.classList.toggle('on', IB_CFG.subOptions[i] === state.sub));
    [...skillRow.children].forEach((b, i) => b.classList.toggle('on', i === state.skill));
    [...methodRow.children].forEach((b, i) => b.classList.toggle('on', IB_METHODS[i] === state.method));
    const s = spec();
    info.textContent = `${T.skills[state.skill]!.label} · ${s.mob} · impact frame ${s.impact + 1}/8 · Space play/pause · arrows step · Esc back`;
  }

  async function rebuild(): Promise<void> {
    const id = ++buildId;
    await loadCols().catch(() => undefined);
    if (id !== buildId) return;
    state.t = 0;
    gap = 0;
    syncUi();
  }

  T.skills.forEach((sk, i) => {
    skillRow.append(
      mk(
        sk.label,
        `Test ${sk.label}`,
        () => {
          state.skill = i;
          void rebuild();
        },
        'vf-txt',
      ),
    );
  });
  IB_METHODS.forEach((m) => {
    methodRow.append(
      mk(
        IB_CFG.methods[m]!.label,
        `Code in-between method: ${IB_CFG.methods[m]!.label}`,
        () => {
          state.method = m;
          void rebuild();
        },
        'vf-txt',
      ),
    );
  });

  // ---- kapatma ----
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === '`' || e.key === 'F2') return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === ' ') {
      e.preventDefault();
      setPlaying(!state.playing);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    }
  };
  function close(): void {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
    open = null;
    unlockInput('vfx-frame-test');
  }
  back.addEventListener('click', close);
  overlay.addEventListener('mouseup', (e) => e.preventDefault());
  window.addEventListener('keydown', onKey, true);
  root.append(overlay);
  open = overlay;
  lockInput('vfx-frame-test');
  syncUi();

  void (async () => {
    const bgu = await urlOf(bgUrls, `/${T.background}.webp`);
    if (bgu) bg = await loadImg(bgu).catch(() => null);
    await rebuild();
    last = performance.now();
    raf = requestAnimationFrame(tick);
  })();
}
