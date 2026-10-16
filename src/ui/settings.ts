import { lockInput, unlockInput } from './input-lock';
import { SPEED_STEPS, battleSpeed, battleSpeedLabel, onBattleSpeedChange, setBattleSpeed, speedAt, speedIndex } from './battle-speed';
import './motion';
import { onReducedMotionChange, reducedMotion, setReducedMotion } from './motion-pref';
import { openDebugMenu } from './debug-entry';
import { loadUiSoundLevel, onUiSoundLevelChange, previewUiSound, setUiSoundLevel, uiSound } from './ui-sound';
import { loadSfxLevel, onSfxLevelChange, setSfxLevel } from './sfx-volume';
import { loadMusicLevel, onMusicLevelChange, setMusicLevel, setMusicMaster } from './music';
import { currentSupport, IOS_HINT, isStandalone, onFullscreenChange, toggleFullscreen } from './fullscreen';
import { VOLUME_STEPS, clampStep, readStepLevel, stepRecord, volumeLabel } from './volume-steps';
import { cyclePerfSetting, onPerfSettingChange, onShowFpsChange, perfSetting, perfSettingLabel, setPerfSetting, setShowFps, showFps } from './perf-mode';
import { onTutorialChange, resetTutorials, setTutorialsOn, tutorialsOn } from '../tutorial/store';
import { navSvg } from './nav-icons';
import { copyDiagLog, diagConsent, onDiagConsentChange, setDiagConsent } from '../diag/diag';
import { isDiagNoticeOpen, openDiagNotice } from '../diag/diag-notice';

/**
 * Oyun içi ayarlar ekranı (sefer > Menu (Esc) > Settings, savaş / takım seçimi > Menu (Esc) > Settings). Ömer 2026-10-08: ana menünün SOL
 * SÜTUN görünümüyle aynı (MainMenuScene > Settings): arkadaki sahne kararıp bulanıklaşır, soldan sağa açılan gölge, altın "Settings" başlığı,
 * kutusuz serif satırlar (seçili satırın önünde kor rengi elmas + hafif parıltı), sağda değer/denetim, sol üstte geri ikonu.
 * Ölçüler oyun birimiyle (--gu: 1 mantıksal birimin CSS pikseli) ve sütun konumu ana menüyle aynı (--menu-x; src/ui/viewport.ts).
 * Klavye: yukarı/aşağı satır, sol/sağ ses, Enter seçer, Esc / Back kapatır; altta açık olan menü yeniden görünür. Açıkken sahne girişi kilitli.
 * İçerik (Ömer 2026-10-10): "Sounds" bölümü = Master Volume (skill sesleri, arayüz sesleri ve müziğin ortak çarpanı), Music, Sound Effects (savaş/skill sesleri; 2026-10-13), UI sounds;
 * "Gameplay" bölümü = Reduced motion, Battle speed, Performance mode (Auto / On / Off), Show FPS, Tutorials (mentor dersleri; 2026-10-13; satırda Replay: dersler yeniden, 2026-10-14), Fullscreen (Ömer 2026-10-11: src/ui/perf-mode.ts). TÜM kaydırıcılar 20 adım: sesler %0-100 (%5, 0 = Off; src/ui/volume-steps.ts),
 * Battle speed 0.25x-4x (src/ui/battle-speed.ts). Oyun akışı eylemleri menüdedir (`src/ui/game-menu.ts`).
 */
export interface SettingsHooks {
  /** Master Volume değişti (0..20 adım). */
  onVolume: (level: number) => void;
  /** Kaydırıcı bırakıldığında duyulacak deneme sesi. */
  preview: () => void;
}

const KEY = 'proto.settings.v1';
/** Master Volume varsayılanı: %70 (adım). */
export const DEFAULT_VOLUME = 14;

/** Kayıtlı Master Volume 0..20 adım (eski 0-10 kayıtlar en yakın adıma: x2). */
export function loadVolume(): number {
  try {
    return readStepLevel(window.localStorage.getItem(KEY), 'volume', DEFAULT_VOLUME);
  } catch {
    return DEFAULT_VOLUME;
  }
}

function saveVolume(volume: number): void {
  try {
    window.localStorage.setItem(KEY, stepRecord('volume', volume));
  } catch {
    // saklama kapalıysa (gizli pencere vb.) sessizce geç
  }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

interface SettingsRow {
  root: HTMLElement;
  run: () => void;
  adjust?: (d: number) => void;
}

/** Kaydırıcı satırının parçaları: − [kaydırıcı] + değer. `paint(i)` konumu ve yazıyı günceller. */
interface SliderParts {
  parts: HTMLElement[];
  slider: HTMLInputElement;
  paint: (i: number) => void;
}

export class SettingsScreen {
  private readonly overlay: HTMLDivElement;
  private open = false;
  private onBack: (() => void) | undefined;
  private rows: SettingsRow[] = [];
  private sel = 0;
  /** Master Volume'u uygular (kaydırıcı, saklama, ses motoru, müzik); ana menünün Settings sütunu da bunu kullanır. */
  readonly applyVolume: (level: number, preview: boolean) => void;

  constructor(root: HTMLElement, hooks: SettingsHooks) {
    this.overlay = el('div', 'st-overlay el-modal'); // ortak pencere hareketi (elegant.css > .el-modal)
    this.overlay.hidden = true;
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Settings');
    const col = el('div', 'st-col el-modal-panel');
    col.append(el('div', 'st-title', 'Settings'));

    // ================= Sounds =================
    col.append(el('div', 'st-section', 'Sounds'));

    // --- Master Volume: skill sesleri (audio.ts), arayüz sesleri (ui-sound.ts) ve müzik (music.ts) bununla çarpılır ---
    const master = this.slider('volume', VOLUME_STEPS, volumeLabel);
    const apply = (this.applyVolume = (level: number, preview: boolean): void => {
      const v = clampStep(level);
      master.paint(v);
      saveVolume(v);
      hooks.onVolume(v);
      setMusicMaster(v);
      if (preview) hooks.preview();
    });
    master.paint(loadVolume());
    master.slider.addEventListener('input', () => apply(Number(master.slider.value), false));
    master.slider.addEventListener('change', () => hooks.preview());
    this.stepButtons(master, (d) => apply(Number(master.slider.value) + d, true));
    this.addRow(col, 'Master Volume', () => undefined, master.parts, (d) => apply(Number(master.slider.value) + d, true));

    // --- Music: ana menü müziği (src/ui/music.ts, data/audio-music.json). 0 = tamamen kapalı; menüde canlı duyulur ---
    const music = this.slider('music', VOLUME_STEPS, volumeLabel);
    music.paint(loadMusicLevel());
    onMusicLevelChange(music.paint);
    music.slider.addEventListener('input', () => setMusicLevel(Number(music.slider.value)));
    this.stepButtons(music, (d) => setMusicLevel(Number(music.slider.value) + d));
    this.addRow(col, 'Music', () => undefined, music.parts, (d) => setMusicLevel(Number(music.slider.value) + d));

    // --- Sound Effects: savaş / skill sesleri (src/ui/sfx-volume.ts; Master ile çarpılır). 0 = kapalı; bırakınca deneme sesi ---
    const fx = this.slider('sound effects', VOLUME_STEPS, volumeLabel);
    fx.paint(loadSfxLevel());
    onSfxLevelChange(fx.paint);
    const applyFx = (lvl: number, preview: boolean): void => {
      setSfxLevel(lvl);
      if (preview) hooks.preview();
    };
    fx.slider.addEventListener('input', () => applyFx(Number(fx.slider.value), false));
    fx.slider.addEventListener('change', () => hooks.preview());
    this.stepButtons(fx, (d) => applyFx(Number(fx.slider.value) + d, true));
    this.addRow(col, 'Sound Effects', () => undefined, fx.parts, (d) => applyFx(Number(fx.slider.value) + d, true));

    // --- UI sounds: menü sesleri (deri, parşömen, ahşap tık; src/ui/ui-sound.ts, data/audio-ui.json). 0 = kapalı ---
    const ui = this.slider('UI sounds', VOLUME_STEPS, volumeLabel);
    ui.paint(loadUiSoundLevel());
    onUiSoundLevelChange(ui.paint);
    const applyUi = (lvl: number, preview: boolean): void => {
      setUiSoundLevel(lvl);
      if (preview) previewUiSound('select');
    };
    ui.slider.addEventListener('input', () => applyUi(Number(ui.slider.value), false));
    ui.slider.addEventListener('change', () => previewUiSound('select'));
    this.stepButtons(ui, (d) => applyUi(Number(ui.slider.value) + d, true));
    this.addRow(col, 'UI sounds', () => undefined, ui.parts, (d) => applyUi(Number(ui.slider.value) + d, true));

    // ================= Gameplay =================
    col.append(el('div', 'st-section', 'Gameplay'));

    // --- Reduced motion (ana menü sahnesi: paralaks ve parçacık yok; kayıt yoksa işletim sistemi tercihi; src/ui/motion-pref.ts) ---
    const motion = el('span', 'st-value', reducedMotion() ? 'On' : 'Off');
    onReducedMotionChange((on) => (motion.textContent = on ? 'On' : 'Off'));
    this.addRow(col, 'Reduced motion', () => setReducedMotion(!reducedMotion()), [motion]);

    // --- Battle speed: 20 adım 0.25x-4x (1x çevresinde ince; src/ui/battle-speed.ts, src/game/turn-wait.ts) ---
    const bs = this.slider('battle speed', SPEED_STEPS, (i) => battleSpeedLabel(speedAt(i)));
    bs.paint(speedIndex(battleSpeed()));
    onBattleSpeedChange((v) => bs.paint(speedIndex(v)));
    const applyBs = (i: number): void => setBattleSpeed(speedAt(i));
    bs.slider.addEventListener('input', () => applyBs(Number(bs.slider.value)));
    this.stepButtons(bs, (d) => applyBs(speedIndex(battleSpeed()) + d));
    this.addRow(col, 'Battle speed', () => undefined, bs.parts, (d) => applyBs(speedIndex(battleSpeed()) + d));

    // --- Performance mode: Auto / On / Off (düşük çözünürlük, 30 fps, tam ekran FX yok; Auto zayıf cihazda açılır; src/ui/perf-mode.ts) ---
    const perf = el('span', 'st-value', perfSettingLabel(perfSetting()));
    onPerfSettingChange((v) => (perf.textContent = perfSettingLabel(v)));
    const stepPerf = (d: number): void => setPerfSetting(cyclePerfSetting(perfSetting(), d));
    this.addRow(col, 'Performance mode', () => stepPerf(1), [perf], stepPerf);

    // --- Show FPS: sol üstte küçük FPS / kare süresi göstergesi (varsayılan kapalı; src/ui/fps-meter.ts) ---
    const fps = el('span', 'st-value', showFps() ? 'On' : 'Off');
    onShowFpsChange((on) => (fps.textContent = on ? 'On' : 'Off'));
    this.addRow(col, 'Show FPS', () => setShowFps(!showFps()), [fps]);

    // --- Tutorials: mentor dersleri açık / kapalı (sefer + Endless; src/tutorial/store.ts, docs/design/tutorial.md) ---
    const tut = el('span', 'st-value', tutorialsOn() ? 'On' : 'Off');
    onTutorialChange(() => (tut.textContent = tutorialsOn() ? 'On' : 'Off'));
    // Replay tutorials (Ömer 2026-10-14, b_reset): görülen dersleri unutur ve dersleri açar (debug "Reset tutorials" ile aynı); onay yok
    // (ilerleme kaybolmaz), satırın altında kısa onay yazısı
    const tutNote = el('div', 'st-note');
    const replay = el('button', 'el-link st-replay', 'Replay');
    replay.type = 'button';
    replay.title = 'Show every lesson again';
    replay.addEventListener('click', () => {
      resetTutorials();
      uiSound('select');
      tutNote.textContent = 'Tutorials will play again.';
    });
    this.addRow(col, 'Tutorials', () => {
      setTutorialsOn(!tutorialsOn());
      tutNote.textContent = '';
    }, [replay, tut]);
    col.append(tutNote);

    // --- Fullscreen (Fullscreen API yoksa satır yok; iPhone'da ipucu) ---
    const support = currentSupport();
    if (support !== 'none' && !isStandalone()) {
      const state = el('span', 'st-value', 'Enter');
      const note = el('div', 'st-note');
      onFullscreenChange((on) => (state.textContent = on ? 'Exit' : 'Enter'));
      this.addRow(col, 'Fullscreen', () => {
        if (support === 'ios') note.textContent = IOS_HINT;
        else void toggleFullscreen();
      }, [state]);
      col.append(note);
    }

    // ================= Privacy =================
    // --- Error reports (Ömer 2026-10-16; src/diag/, docs/arch/diagnostics.md): opt-in, varsayılan Off. Satırda Copy log (izleri panoya;
    // onay kapalıyken de çalışır, bir şey göndermez) ve Info (gizlilik metni + aynı anahtar: src/diag/diag-notice.ts) ---
    col.append(el('div', 'st-section', 'Privacy'));
    const rep = el('span', 'st-value', diagConsent() ? 'On' : 'Off');
    onDiagConsentChange((on) => (rep.textContent = on ? 'On' : 'Off'));
    const repNote = el('div', 'st-note');
    const copyLog = el('button', 'el-link st-replay', 'Copy log');
    copyLog.type = 'button';
    copyLog.title = 'Copy the recent event log as text (nothing is sent)';
    copyLog.addEventListener('click', () => {
      uiSound('select');
      void copyDiagLog().then((ok) => (repNote.textContent = ok ? 'Log copied.' : 'Could not copy the log.'));
    });
    const repInfo = el('button', 'el-link st-replay', 'Info');
    repInfo.type = 'button';
    repInfo.title = 'What is collected and why';
    repInfo.addEventListener('click', () => openDiagNotice('info'));
    this.addRow(col, 'Error reports', () => {
      setDiagConsent(!diagConsent());
      repNote.textContent = diagConsent() ? 'Anonymous crash reports on. Kept 30 days.' : '';
    }, [copyLog, repInfo, rep]);
    col.append(repNote);

    // Gizli debug girişinin yedeği (src/ui/debug-gesture.ts): en altta küçük, soluk "Developer tools" satırı
    const dev = el('button', 'st-dev', 'Developer tools');
    dev.type = 'button';
    dev.addEventListener('click', () => {
      this.setOpen(false);
      openDebugMenu();
    });
    col.append(dev);

    // Geri standardı (CLAUDE.md > Geri / Menu kuralı): her yerde aynı sol üst geri ikonu (src/ui/elegant.css > .el-back, nav-icons.ts)
    const back = el('button', 'nav-btn el-back st-back');
    back.innerHTML = navSvg('back');
    back.title = 'Back';
    back.setAttribute('aria-label', 'Back');
    back.type = 'button';
    back.addEventListener('click', () => this.setOpen(false));
    this.overlay.append(col, back);
    // Boş zemine dokunmak bir şey yapmaz (yanlışlıkla kapanmasın); kapatma: Back ya da Esc
    root.append(this.overlay);
    // Fare bırakması alttaki Phaser sahnesine gitmesin (Phaser window mouseup'ı dinler, defaultPrevented olanı yok sayar); asıl güvence giriş kilidi
    this.overlay.addEventListener('mouseup', (e) => e.preventDefault());

    // Klavye: açıkken oyunun kısayollarına gitmez; yukarı/aşağı satır, sol/sağ ayar, Enter seçer, Esc kapatır
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || e.key === '`' || e.key === 'F2' || isDiagNoticeOpen()) return; // debug kısayolu çalışır; üstte açık Info penceresi kendi tuşlarını alır
        e.stopImmediatePropagation();
        const k = e.key;
        const row = this.rows[this.sel];
        if (k === 'Escape') {
          e.preventDefault();
          this.setOpen(false);
        } else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'w' || k === 's' || k === 'W' || k === 'S') {
          e.preventDefault();
          const d = k === 'ArrowUp' || k === 'w' || k === 'W' ? -1 : 1;
          this.select((this.sel + d + this.rows.length) % this.rows.length);
        } else if ((k === 'ArrowLeft' || k === 'ArrowRight') && row?.adjust) {
          e.preventDefault();
          row.adjust(k === 'ArrowLeft' ? -1 : 1);
        } else if ((k === 'Enter' || k === ' ') && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          row?.run();
        }
      },
      true,
    );
    hooks.onVolume(Number(master.slider.value));
    setMusicMaster(Number(master.slider.value));
    registerSettingsScreen(this);
  }

  /** − [kaydırıcı] + değer (ortak bileşen; 0..max adım). `fmt` değer yazısı. */
  private slider(name: string, max: number, fmt: (i: number) => string): SliderParts {
    const minus = el('button', 'st-step', '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', `Lower ${name}`);
    const slider = el('input', 'st-slider');
    slider.type = 'range';
    slider.min = '0';
    slider.max = String(max);
    slider.step = '1';
    slider.setAttribute('aria-label', name);
    const plus = el('button', 'st-step', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', `Raise ${name}`);
    const value = el('span', 'st-value');
    const paint = (i: number): void => {
      const v = Math.min(max, Math.max(0, Math.round(i)));
      slider.value = String(v);
      value.textContent = fmt(v);
      slider.style.setProperty('--fill', `${(v / max) * 100}%`);
    };
    return { parts: [minus, slider, plus, value], slider, paint };
  }

  /** − / + düğmeleri bir adım oynatır. */
  private stepButtons(p: SliderParts, step: (d: number) => void): void {
    p.parts[0]!.addEventListener('click', () => step(-1));
    p.parts[2]!.addEventListener('click', () => step(1));
  }

  /** Kutusuz satır: elmas + yazı + sağda denetim + ince ayırıcı; satıra dokunmak/üstüne gelmek seçer. */
  private addRow(col: HTMLElement, label: string, run: () => void, right: HTMLElement[], adjust?: (d: number) => void): void {
    const i = this.rows.length;
    const root = el('div', 'st-row');
    const name = el('button', 'st-label', label);
    name.type = 'button';
    name.addEventListener('click', () => run());
    const control = el('div', 'st-control');
    control.append(...right);
    root.append(el('span', 'st-diamond'), name, control);
    root.addEventListener('pointerenter', () => this.select(i));
    root.addEventListener('pointerdown', () => this.select(i));
    col.append(root);
    this.rows.push({ root, run, adjust });
  }

  private select(i: number): void {
    this.sel = i;
    this.rows.forEach((r, k) => r.root.classList.toggle('on', k === i));
  }

  /** Açar (isteğe bağlı: kapanınca çağrılacak geri dönüş) ya da kapatır. */
  setOpen(open: boolean, onBack?: () => void): void {
    if (open) this.onBack = onBack;
    const was = this.open;
    this.open = open;
    this.overlay.hidden = !open;
    if (open && !was) this.select(0);
    if (open !== was) uiSound(open ? 'open' : 'close'); // parşömen açılır / dürülür (data/audio-ui.json)
    document.documentElement.classList.toggle('settings-open', open);
    if (open) lockInput('settings');
    else if (was) unlockInput('settings');
    if (was && !open) {
      const cb = this.onBack;
      this.onBack = undefined;
      cb?.();
    }
  }

  get isOpen(): boolean {
    return this.open;
  }
}

/** Sahnelerden (ana menü, sefer menüsü, savaş menüsü) ayarlar ekranını açıp kapatmak için tek örnek. */
let instance: SettingsScreen | null = null;
export function registerSettingsScreen(screen: SettingsScreen): void {
  instance = screen;
}
/** Ayarlar ekranını aç / kapat; `onBack` ekran kapanınca (Back, Esc) çağrılır. */
export function setSettingsOpen(open: boolean, onBack?: () => void): void {
  instance?.setOpen(open, onBack);
}
/** Master Volume'u değiştir (0-20 adım; ana menü Settings sütunu); `preview` true ise deneme sesi çalar. Ekran yoksa yalnızca saklar. */
export function setSettingsVolume(level: number, preview = false): void {
  if (instance) instance.applyVolume(level, preview);
  else {
    saveVolume(clampStep(level));
    setMusicMaster(level);
  }
}
export function isSettingsOpen(): boolean {
  return instance?.isOpen ?? false;
}
