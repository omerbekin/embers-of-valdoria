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
import { copyDiagLog, diagConsent, diagReportId, onDiagConsentChange, setDiagConsent } from '../diag/diag';
import { isDiagNoticeOpen, openDiagNotice } from '../diag/diag-notice';
import { PRIVACY_LINE, reportIdLine, SETTINGS_LABELS, SETTINGS_PAGES, type SettingsPageKey, setSettingsPage, settingsPage, stepPage } from './settings-pages';

/**
 * Oyun içi ayarlar ekranı (sefer > Menu (Esc) > Settings, savaş / takım seçimi > Menu (Esc) > Settings). Ömer 2026-10-08: ana menünün SOL
 * SÜTUN görünümüyle aynı (MainMenuScene > Settings): arkadaki sahne kararıp bulanıklaşır, soldan sağa açılan gölge, altın "Settings" başlığı,
 * kutusuz serif satırlar (seçili satırın önünde kor rengi elmas + hafif parıltı), sağda değer/denetim, sol üstte geri ikonu.
 * Ölçüler oyun birimiyle (--gu: 1 mantıksal birimin CSS pikseli) ve sütun konumu ana menüyle aynı (--menu-x; src/ui/viewport.ts).
 * Sayfalar (Ömer 2026-10-16): solda kategori sütunu Sound · Gameplay · Display · Privacy (seçili olanın önünde kor elması; en altta soluk
 * "Developer tools"), sağda sayfa başlığı ve ondan içeride, biraz daha küçük / yumuşak renkli satırlar. Liste TEK yerde
 * `src/ui/settings-pages.ts` (ana menü sütunu da aynısını çizer); son seçilen sayfa oturum boyunca hatırlanır.
 * Sound = Master Volume (skill sesleri, arayüz sesleri ve müziğin ortak çarpanı), Music, Sound Effects, UI Sounds; Gameplay = Battle Speed,
 * Reduced Motion, Tutorials (Replay + On/Off); Display = Performance Mode (Auto / On / Off), Show FPS, Fullscreen; Privacy = Error Reports,
 * Copy Log, Privacy Info + kısa gizlilik satırı. TÜM kaydırıcılar 20 adım: sesler %0-100 (%5, 0 = Off; src/ui/volume-steps.ts),
 * Battle speed 0.25x-4x (src/ui/battle-speed.ts). Oyun akışı eylemleri menüdedir (`src/ui/game-menu.ts`).
 * Klavye: kategori sütununda yukarı/aşağı sayfa, sağ / Enter satırlara; satırlarda yukarı/aşağı, sol/sağ ayar, Enter seçer; Tab sonraki
 * sayfa; Esc / Back kapatır; altta açık olan menü yeniden görünür. Açıkken sahne girişi kilitli.
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
  /** Sayfa başına satırlar (SETTINGS_PAGES sırası). */
  private readonly rows: Record<SettingsPageKey, SettingsRow[]> = { sound: [], gameplay: [], display: [], privacy: [] };
  private readonly pages = new Map<SettingsPageKey, HTMLElement>();
  private readonly cats = new Map<SettingsPageKey, HTMLElement>();
  /** Sayfanın altındaki kısa not (Replay onayı, iPhone tam ekran ipucu, Copy log / Error reports onayı). */
  private readonly notes = new Map<SettingsPageKey, HTMLElement>();
  private page: SettingsPageKey = settingsPage();
  /** Klavye odağı: kategori sütunu ya da sayfanın satırları. */
  private zone: 'cat' | 'row' = 'cat';
  private sel = -1;
  /** Master Volume'u uygular (kaydırıcı, saklama, ses motoru, müzik); ana menünün Settings sütunu da bunu kullanır. */
  readonly applyVolume: (level: number, preview: boolean) => void;

  constructor(root: HTMLElement, hooks: SettingsHooks) {
    this.overlay = el('div', 'st-overlay el-modal'); // ortak pencere hareketi (elegant.css > .el-modal)
    this.overlay.hidden = true;
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Settings');
    const col = el('div', 'st-col el-modal-panel');
    col.append(el('div', 'st-title', 'Settings'));
    const body = el('div', 'st-body');
    const nav = el('div', 'st-cats');
    nav.setAttribute('role', 'tablist');
    const pagesBox = el('div', 'st-pages');
    body.append(nav, pagesBox);
    col.append(body);
    for (const pg of SETTINGS_PAGES) {
      const cat = el('button', 'st-cat');
      cat.type = 'button';
      cat.setAttribute('role', 'tab');
      cat.append(el('span', 'st-diamond'), el('span', 'st-cat-label', pg.label));
      cat.addEventListener('click', () => {
        if (this.page !== pg.key) uiSound('tab');
        this.showPage(pg.key);
        this.zone = 'cat';
      });
      nav.append(cat);
      this.cats.set(pg.key, cat);
      const page = el('div', 'st-page');
      page.setAttribute('role', 'tabpanel');
      page.append(el('div', 'st-page-head', pg.label));
      pagesBox.append(page);
      this.pages.set(pg.key, page);
      this.notes.set(pg.key, el('div', 'st-note'));
    }
    const note = (k: SettingsPageKey): HTMLElement => this.notes.get(k)!;

    // ================= Sound =================
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

    // --- Music: ana menü müziği (src/ui/music.ts, data/audio-music.json). 0 = tamamen kapalı; menüde canlı duyulur ---
    const music = this.slider('music', VOLUME_STEPS, volumeLabel);
    music.paint(loadMusicLevel());
    onMusicLevelChange(music.paint);
    music.slider.addEventListener('input', () => setMusicLevel(Number(music.slider.value)));
    this.stepButtons(music, (d) => setMusicLevel(Number(music.slider.value) + d));

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

    // ================= Gameplay =================
    // --- Battle speed: 20 adım 0.25x-4x (1x çevresinde ince; src/ui/battle-speed.ts, src/game/turn-wait.ts) ---
    const bs = this.slider('battle speed', SPEED_STEPS, (i) => battleSpeedLabel(speedAt(i)));
    bs.paint(speedIndex(battleSpeed()));
    onBattleSpeedChange((v) => bs.paint(speedIndex(v)));
    const applyBs = (i: number): void => setBattleSpeed(speedAt(i));
    bs.slider.addEventListener('input', () => applyBs(Number(bs.slider.value)));
    this.stepButtons(bs, (d) => applyBs(speedIndex(battleSpeed()) + d));

    // --- Reduced motion (ana menü sahnesi: paralaks ve parçacık yok; kayıt yoksa işletim sistemi tercihi; src/ui/motion-pref.ts) ---
    const motion = el('span', 'st-value', reducedMotion() ? 'On' : 'Off');
    onReducedMotionChange((on) => (motion.textContent = on ? 'On' : 'Off'));

    // --- Tutorials: mentor dersleri açık / kapalı (sefer + Endless; src/tutorial/store.ts, docs/design/tutorial.md) ---
    const tut = el('span', 'st-value', tutorialsOn() ? 'On' : 'Off');
    onTutorialChange(() => (tut.textContent = tutorialsOn() ? 'On' : 'Off'));
    // Replay tutorials (Ömer 2026-10-14, b_reset): görülen dersleri unutur ve dersleri açar (debug "Reset tutorials" ile aynı); onay yok
    // (ilerleme kaybolmaz), sayfanın altında kısa onay yazısı
    const replay = el('button', 'el-link st-replay', 'Replay');
    replay.type = 'button';
    replay.title = 'Show every lesson again';
    replay.addEventListener('click', () => {
      resetTutorials();
      uiSound('select');
      note('gameplay').textContent = 'Tutorials will play again.';
    });

    // ================= Display =================
    // --- Performance mode: Auto / On / Off (düşük çözünürlük, 30 fps, tam ekran FX yok; Auto zayıf cihazda açılır; src/ui/perf-mode.ts) ---
    const perf = el('span', 'st-value', perfSettingLabel(perfSetting()));
    onPerfSettingChange((v) => (perf.textContent = perfSettingLabel(v)));
    const stepPerf = (d: number): void => setPerfSetting(cyclePerfSetting(perfSetting(), d));

    // --- Show FPS: sol üstte küçük FPS / kare süresi göstergesi (varsayılan kapalı; src/ui/fps-meter.ts) ---
    const fps = el('span', 'st-value', showFps() ? 'On' : 'Off');
    onShowFpsChange((on) => (fps.textContent = on ? 'On' : 'Off'));

    // --- Fullscreen (Fullscreen API yoksa satır yok; iPhone'da ipucu) ---
    const support = currentSupport();
    const fsState = el('span', 'st-value', 'Enter');
    onFullscreenChange((on) => (fsState.textContent = on ? 'Exit' : 'Enter'));

    // ================= Privacy =================
    // --- Error reports (Ömer 2026-10-16; src/diag/, docs/arch/diagnostics.md): opt-in, varsayılan Off. Copy log (izleri panoya; onay kapalıyken
    // de çalışır, bir şey göndermez) ve Info (gizlilik metni + aynı anahtar: src/diag/diag-notice.ts) ayrı satırlar (44 px dokunma) ---
    const rep = el('span', 'st-value', diagConsent() ? 'On' : 'Off');
    onDiagConsentChange((on) => (rep.textContent = on ? 'On' : 'Off'));
    const copyLog = (): void => {
      uiSound('select');
      void copyDiagLog().then((ok) => (note('privacy').textContent = ok ? 'Log copied.' : 'Could not copy the log.'));
    };

    // Satırlar sayfa listesinden (settings-pages.ts) sırayla
    for (const pg of SETTINGS_PAGES) {
      const page = this.pages.get(pg.key)!;
      for (const item of pg.items) {
        const add = (run: () => void, right: HTMLElement[], adjust?: (d: number) => void): void => this.addRow(page, pg.key, SETTINGS_LABELS[item], run, right, adjust);
        switch (item) {
          case 'master':
            add(() => undefined, master.parts, (d) => apply(Number(master.slider.value) + d, true));
            break;
          case 'music':
            add(() => undefined, music.parts, (d) => setMusicLevel(Number(music.slider.value) + d));
            break;
          case 'sfx':
            add(() => undefined, fx.parts, (d) => applyFx(Number(fx.slider.value) + d, true));
            break;
          case 'ui':
            add(() => undefined, ui.parts, (d) => applyUi(Number(ui.slider.value) + d, true));
            break;
          case 'speed':
            add(() => undefined, bs.parts, (d) => applyBs(speedIndex(battleSpeed()) + d));
            break;
          case 'motion':
            add(() => setReducedMotion(!reducedMotion()), [motion]);
            break;
          case 'tutorials':
            add(() => {
              setTutorialsOn(!tutorialsOn());
              note('gameplay').textContent = '';
            }, [replay, tut]);
            break;
          case 'perf':
            add(() => stepPerf(1), [perf], stepPerf);
            break;
          case 'fps':
            add(() => setShowFps(!showFps()), [fps]);
            break;
          case 'fullscreen':
            if (support !== 'none' && !isStandalone())
              add(() => {
                if (support === 'ios') note('display').textContent = IOS_HINT;
                else void toggleFullscreen();
              }, [fsState]);
            break;
          case 'reports':
            add(() => {
              setDiagConsent(!diagConsent());
              note('privacy').textContent = diagConsent() ? 'Anonymous crash reports on. Kept 30 days.' : '';
            }, [rep]);
            break;
          case 'copyLog':
            add(copyLog, [el('span', 'st-value st-action', 'Copy')]);
            break;
          case 'info':
            add(() => openDiagNotice('info'), [el('span', 'st-value st-action', 'Open')]);
            break;
        }
      }
      if (pg.key === 'privacy') {
        // Raporlar açıkken rapor kimliği (kısa; KVKK başvurusunda raporları bulmak için)
        const idLine = el('div', 'st-line st-id', reportIdLine(diagReportId()));
        onDiagConsentChange(() => (idLine.textContent = reportIdLine(diagReportId())));
        page.append(el('div', 'st-line', PRIVACY_LINE), idLine);
      }
      page.append(note(pg.key));
    }

    // Gizli debug girişinin yedeği (src/ui/debug-gesture.ts): kategori sütununun en altında küçük, soluk "Developer tools"
    const dev = el('button', 'st-dev', 'Developer tools');
    dev.type = 'button';
    dev.addEventListener('click', () => {
      this.setOpen(false);
      openDebugMenu();
    });
    nav.append(dev);

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

    window.addEventListener('keydown', (e) => this.onKey(e), true);
    this.showPage(this.page);
    hooks.onVolume(Number(master.slider.value));
    setMusicMaster(Number(master.slider.value));
    registerSettingsScreen(this);
  }

  /** Klavye: açıkken oyunun kısayollarına gitmez (debug kısayolu ve üstte açık Info penceresi hariç). */
  private onKey(e: KeyboardEvent): void {
    if (!this.open || e.key === '`' || e.key === 'F2' || isDiagNoticeOpen()) return;
    e.stopImmediatePropagation();
    const k = e.key;
    const rows = this.rows[this.page];
    const row = this.zone === 'row' ? rows[this.sel] : undefined;
    const up = k === 'ArrowUp' || k === 'w' || k === 'W';
    const down = k === 'ArrowDown' || k === 's' || k === 'S';
    const onButton = e.target instanceof HTMLButtonElement;
    if (k === 'Escape') {
      e.preventDefault();
      this.setOpen(false);
    } else if (k === 'Tab') {
      e.preventDefault();
      uiSound('tab');
      this.showPage(stepPage(this.page, e.shiftKey ? -1 : 1));
      this.zone = 'cat';
    } else if (this.zone === 'cat') {
      if (up || down) {
        e.preventDefault();
        uiSound('tab');
        this.showPage(stepPage(this.page, up ? -1 : 1));
      } else if (rows.length && (k === 'ArrowRight' || ((k === 'Enter' || k === ' ') && !onButton))) {
        e.preventDefault();
        this.zone = 'row';
        this.select(0);
      }
    } else if (up || down) {
      e.preventDefault();
      this.select((this.sel + (up ? -1 : 1) + rows.length) % rows.length);
    } else if ((k === 'ArrowLeft' || k === 'ArrowRight') && row?.adjust) {
      e.preventDefault();
      row.adjust(k === 'ArrowLeft' ? -1 : 1);
    } else if (k === 'ArrowLeft') {
      e.preventDefault();
      this.zone = 'cat';
      this.select(-1);
    } else if ((k === 'Enter' || k === ' ') && !onButton) {
      e.preventDefault();
      row?.run();
    }
  }

  /** Kategori sayfasını gösterir (oturum boyunca hatırlanır: settings-pages.ts). */
  private showPage(key: SettingsPageKey): void {
    this.page = key;
    setSettingsPage(key);
    for (const [k, page] of this.pages) page.hidden = k !== key;
    for (const [k, cat] of this.cats) {
      cat.classList.toggle('on', k === key);
      cat.setAttribute('aria-selected', String(k === key));
    }
    for (const n of this.notes.values()) n.textContent = '';
    this.select(-1);
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
  private addRow(page: HTMLElement, key: SettingsPageKey, label: string, run: () => void, right: HTMLElement[], adjust?: (d: number) => void): void {
    const list = this.rows[key];
    const i = list.length;
    const root = el('div', 'st-row');
    const name = el('button', 'st-label', label);
    name.type = 'button';
    name.addEventListener('click', () => run());
    const control = el('div', 'st-control');
    control.append(...right);
    root.append(el('span', 'st-diamond'), name, control);
    const pick = (): void => {
      this.zone = 'row';
      this.select(i);
    };
    root.addEventListener('pointerenter', pick);
    root.addEventListener('pointerdown', pick);
    // Kaydırıcısız satırda sağdaki değer yazısına dokunmak da satırı çalıştırır (On/Off, Copy, Open)
    if (!adjust || right.length === 1) for (const r of right) if (r.classList.contains('st-value')) r.addEventListener('click', () => run());
    page.append(root);
    list.push({ root, run, adjust });
  }

  private select(i: number): void {
    this.sel = i;
    for (const [k, list] of Object.entries(this.rows) as Array<[SettingsPageKey, SettingsRow[]]>) list.forEach((r, n) => r.root.classList.toggle('on', k === this.page && n === i));
  }

  /** Açar (isteğe bağlı: kapanınca çağrılacak geri dönüş) ya da kapatır. */
  setOpen(open: boolean, onBack?: () => void): void {
    if (open) this.onBack = onBack;
    const was = this.open;
    this.open = open;
    this.overlay.hidden = !open;
    if (open && !was) {
      this.showPage(settingsPage()); // ana menü sütununda seçilen sayfa burada da açılır
      this.zone = 'cat';
    }
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
