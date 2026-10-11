import { autoDetected, frameTimeSaysSlow, noteMeasuredSlow, onPerfLiteChange, onPerfSettingChange, onShowFpsChange, perfLite, perfSetting, showFps } from './perf-mode';

/**
 * Kare ölçer (Ömer 2026-10-11): tarayıcının gerçek kare aralıkları (requestAnimationFrame) ile
 * - Settings > Gameplay > Show FPS açıkken üst kenarda, sol üstteki Back düğmesinin sağında (Menu, sıra çubuğu ve alt çubukla çakışmaz) küçük gösterge:
 *   "FPS 58 · 17.2 ms" (son ~0,5 sn ortalaması; ms = ortanca kare süresi), performans modu açıksa "· Perf" eki;
 * - Performance mode = Auto iken zayıf cihaz tespiti: ilk saniyelerden sonra 4 sn'lik iki ardışık pencerenin ortanca kare süresi yüksekse
 *   (src/ui/perf-mode.ts > frameTimeSaysSlow) performans modu açılır ve hatırlanır.
 * Hiçbiri gerekmiyorsa döngü durur (boşa çalışmaz). Sekme gizliyken ölçmez.
 */
export function installFpsMeter(root: HTMLElement): void {
  const box = document.createElement('div');
  box.className = 'fps-meter';
  box.setAttribute('aria-hidden', 'true');
  box.hidden = true;
  root.append(box);

  let running = false;
  let last = 0;
  // gösterge penceresi
  let shownFrames: number[] = [];
  let shownAt = 0;
  // Auto tespit penceresi
  const bootAt = performance.now();
  let probe: number[] = [];
  let probeAt = 0;
  let slowWindows = 0;

  const wantProbe = (): boolean => perfSetting() === 'auto' && !autoDetected() && !perfLite();
  const wanted = (): boolean => showFps() || wantProbe();

  const median = (a: number[]): number => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)] ?? 0;
  };

  const tick = (t: number): void => {
    if (!wanted()) {
      running = false;
      box.hidden = true;
      return;
    }
    window.requestAnimationFrame(tick);
    if (document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? t - last : 0;
    last = t;
    if (dt <= 0 || dt > 1000) return; // ilk kare / sekmeden dönüş
    if (showFps()) {
      shownFrames.push(dt);
      if (t - shownAt >= 500) {
        const sum = shownFrames.reduce((x, y) => x + y, 0);
        const fps = sum > 0 ? Math.round((shownFrames.length * 1000) / sum) : 0;
        box.textContent = `FPS ${fps} · ${median(shownFrames).toFixed(1)} ms${perfLite() ? ' · Perf' : ''}`;
        box.hidden = false;
        shownFrames = [];
        shownAt = t;
      }
    } else box.hidden = true;
    if (wantProbe() && t - bootAt > 6000) {
      probe.push(dt);
      if (!probeAt) probeAt = t;
      if (t - probeAt >= 4000) {
        slowWindows = frameTimeSaysSlow(probe) ? slowWindows + 1 : 0;
        probe = [];
        probeAt = 0;
        if (slowWindows >= 2) noteMeasuredSlow();
      }
    }
  };

  const ensure = (): void => {
    if (running || !wanted()) {
      if (!showFps()) box.hidden = true;
      return;
    }
    running = true;
    last = 0;
    shownFrames = [];
    shownAt = 0;
    window.requestAnimationFrame(tick);
  };
  onShowFpsChange(ensure);
  onPerfSettingChange(ensure);
  onPerfLiteChange(ensure);
  ensure();
}
