/**
 * Hikâye sinematiği oynatıcısı (Ömer 2026-10-23): görünüm Ashford hikâye diyaloğunun AYNISI (src/ui/story-dialog.ts, taslak story-dialog C
 * "şerit": altta şerit, solda küçük çerçeveli portre, ortada başlık + ilerleme elmasları + satır, sağda tek "Continue"); üstüne sinematik
 * katmanı: tam ekran sahne görseli (yavaş kamera kayması / yakınlaşma, hafif kül-kor parçacıkları, sahne değişince yumuşak kararma),
 * sağ üstte yazısız Skip (X'in yeri, src/ui/nav-close.ts), son sahnede kapanış kartı (`endCard`). Ekrana dokunmak / Space / Enter sonraki
 * satır; Esc = Skip. Hareket süreleri data/ui-motion.json > cinematic; azaltılmış harekette kayma ve parçacık yok, geçişler anında.
 * Kahraman savaş sprite'ları sahnede BÜYÜTÜLMEZ (Ömer kuralı): kişiler yalnızca portreyle. Oyun kuralı burada yok (tetik ve "görüldü"
 * src/campaign/cinematics.ts); eksik görsel çökertmez (koyu zemin).
 */
import './cinematic.css';
import { CINEMATICS, cinematicLineCount, cinematicSpeaker, cinematicTitle, resolveCinematicBg, type CinematicFolder, getMap, CONFIG, type CampaignMap } from '../campaign';
import { openStoryDialog, type StoryDialogHandle } from './story-dialog';
import { mountCloseButton } from './nav-close';
import { lockInput, unlockInput } from './input-lock';
import { motion } from './motion';
import { reducedMotion } from './motion-pref';
import { worldSound } from './ui-sound';

const cinFiles = import.meta.glob('../../assets/cinematics/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const bgFiles = import.meta.glob('../../assets/backgrounds/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const fileOf = (folder: CinematicFolder, id: string): string | undefined => (folder === 'cinematics' ? cinFiles : bgFiles)[`../../assets/${folder}/${id}.webp`];

/** Sahne görselinin adresi (yedek zinciriyle); hiçbiri yoksa null. */
export function cinematicBgUrl(bg: string): string | null {
  const r = resolveCinematicBg(bg, (f, id) => !!fileOf(f, id));
  return r ? (fileOf(r.folder, r.id) ?? null) : null;
}

export interface CinematicOptions {
  /** Bölük liderinin sınıfı (leader satırları: sınıf adı + avatar). */
  leaderClass?: string;
  /** Başlık için harita (yoksa ilk sefer haritası). */
  map?: CampaignMap;
  /** Sinematik bitti (son satır / kapanış kartı ya da Skip). `endCard`: kapanış kartı gösterildi. */
  onDone?: (r: { endCard: boolean }) => void;
}
export interface CinematicHandle {
  /** Sessizce kapatır (onDone çağrılmaz; ör. sahne kapanırken). */
  close: () => void;
  el: HTMLElement;
}

const wait = (ms: number, fn: () => void): void => {
  if (ms <= 0) fn();
  else window.setTimeout(fn, ms);
};

/** Görseli önceden yükler (yükleme / hata / süre dolunca devam). */
function preload(url: string | null, maxMs: number, fn: () => void): void {
  if (!url) return fn();
  let fired = false;
  const go = (): void => {
    if (fired) return;
    fired = true;
    fn();
  };
  const im = new Image();
  im.onload = go;
  im.onerror = go;
  im.src = url;
  window.setTimeout(go, maxMs);
}

/** Kül / kor parçacıkları: deterministik dağılım (Math.random yok; her açılışta aynı desen, sakin). */
function embersHtml(n: number, minMs: number, maxMs: number): string {
  const h = (i: number, k: number): number => {
    const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  let out = '';
  for (let i = 0; i < n; i++) {
    const dur = Math.round(minMs + h(i, 1) * (maxMs - minMs));
    const ember = h(i, 2) < 0.35;
    const style = `--x:${(h(i, 3) * 100).toFixed(1)}%;--d:${dur}ms;--dl:${-Math.round(h(i, 4) * dur)}ms;--s:${(ember ? 2 + h(i, 5) * 2 : 1.5 + h(i, 5) * 2.5).toFixed(1)}px;--sw:${((h(i, 6) - 0.5) * 12).toFixed(1)}vw`;
    out += `<i class="cin-p${ember ? ' ember' : ''}" style="${style}"></i>`;
  }
  return out;
}

/**
 * Sinematiği `root` (#ui-root) içinde oynatır. Bilinmeyen id: null. Sefer durumuna dokunmaz ("görüldü" işaretini çağıran yazar).
 */
export function playCinematic(root: HTMLElement, id: string, o: CinematicOptions = {}): CinematicHandle | null {
  const def = CINEMATICS[id];
  if (!def || !def.scenes.length) return null;
  const m = motion('cinematic');
  const still = reducedMotion();
  const map = o.map ?? getMap(CONFIG.maps[0]!);
  const title = cinematicTitle(id, map);
  const lines = def.scenes.flatMap((sc, si) => sc.lines.map((l) => ({ ...l, scene: si })));
  const total = cinematicLineCount(def);
  const keepWho = lines.some((l) => cinematicSpeaker(l.speaker, o.leaderClass).portrait);

  const el = document.createElement('div');
  el.className = `cin${still ? ' still' : ''}`;
  el.style.setProperty('--cin-fade', `${m.fadeMs}ms`);
  el.style.setProperty('--cin-intro', `${m.introMs}ms`);
  el.style.setProperty('--cin-pan', `${m.panMs}ms`);
  el.style.setProperty('--cin-z0', String(m.zoomFrom));
  el.style.setProperty('--cin-z1', String(m.zoomTo));
  el.style.setProperty('--cin-dx', `${m.driftPct}%`);
  el.style.setProperty('--cin-end-in', `${m.endCardInMs}ms`);
  el.innerHTML = `<div class="cin-bg"><div class="cin-img"></div></div>${still ? '' : `<div class="cin-embers">${embersHtml(m.embers, m.emberMinMs, m.emberMaxMs)}</div>`}<div class="cin-veil on"></div>`;
  root.append(el);
  lockInput('cinematic');
  const img = el.querySelector<HTMLElement>('.cin-img')!;
  const veil = el.querySelector<HTMLElement>('.cin-veil')!;

  let closed = false;
  let busy = true; // sahne geçişi sürerken ilerleme yok
  let at = 0;
  let scene = -1;
  let sd: StoryDialogHandle | null = null;
  let endEl: HTMLElement | null = null;
  let finishing = false;

  const setBg = (si: number): void => {
    const url = cinematicBgUrl(def.scenes[si]!.bg);
    img.style.backgroundImage = url ? `url("${url}")` : 'none';
    // kamera kaymasını baştan başlat
    img.classList.remove('pan');
    void img.offsetWidth;
    img.classList.add('pan');
  };

  const content = (i: number) => {
    const l = lines[i]!;
    const sp = cinematicSpeaker(l.speaker, o.leaderClass);
    const narr = l.speaker === 'narrator';
    return { ...(narr ? { narr: l.text } : {}), said: narr ? '' : l.text, choices: ['Continue'], step: i, total, speaker: sp.name, portrait: sp.portrait };
  };

  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    sd?.close();
    sd = null;
    unmountSkip();
    window.removeEventListener('keydown', onKeyCap, true);
    el.remove();
    unlockInput('cinematic');
  };

  const finish = (): void => {
    if (closed || finishing) return;
    finishing = true;
    const shown = !!endEl;
    el.classList.add('out'); // şerit de katmanla birlikte söner (cleanup kapatır)
    wait(m.fadeMs, () => {
      cleanup();
      o.onDone?.({ endCard: shown });
    });
  };

  const showEndCard = (): void => {
    if (closed || endEl || finishing) return;
    if (!def.endCard) return finish();
    sd?.close();
    sd = null;
    busy = true;
    endEl = document.createElement('div');
    endEl.className = 'cin-end';
    endEl.innerHTML = `<div class="cin-end-in"><i class="cin-end-rule"></i><p class="cin-end-text"></p><i class="cin-end-rule"></i><button type="button" class="cin-end-go">Continue</button></div>`;
    endEl.querySelector('.cin-end-text')!.textContent = def.endCard;
    endEl.addEventListener('click', () => {
      if (!busy) finish(); // belirirken gelen ikinci dokunuş kartı atlamasın
    });
    el.append(endEl);
    wait(m.endCardInMs, () => {
      busy = false;
    });
  };

  const openDialog = (i: number): void => {
    const first = content(i);
    sd = openStoryDialog(el, {
      title,
      speaker: first.speaker,
      portrait: first.portrait,
      keepWho,
      className: 'sd-cin',
      onPick: () => next(),
      onAdvance: () => next(),
    });
    sd.update(first);
  };

  /** Satır `i`'yi gösterir; sahne değiştiyse önce kararır, görseli değiştirir, açılır. */
  const show = (i: number): void => {
    at = i;
    const si = lines[i]!.scene;
    if (si === scene) {
      sd?.update(content(i));
      return;
    }
    const firstScene = scene < 0;
    scene = si;
    busy = true;
    const url = cinematicBgUrl(def.scenes[si]!.bg);
    const reveal = (): void => {
      if (closed || finishing || endEl) return; // Skip geçiş sırasında geldiyse
      setBg(si);
      veil.style.transitionDuration = firstScene ? `${m.introMs}ms` : '';
      if (sd) sd.update(content(i));
      else openDialog(i);
      veil.classList.remove('on');
      wait(firstScene ? m.introMs : m.fadeMs, () => {
        busy = false;
      });
    };
    if (firstScene) return preload(url, Math.max(m.introMs, 1) * 3, reveal);
    veil.classList.add('on');
    wait(m.fadeMs, () => preload(url, Math.max(m.fadeMs, 1) * 3, reveal));
  };

  const next = (): void => {
    if (closed || busy || finishing) return;
    if (endEl) return finish();
    if (at + 1 < lines.length) return show(at + 1);
    showEndCard();
  };

  /** Skip: sinematiğin sonuna (kapanış kartı varsa ona) atlar. */
  const skip = (): void => {
    if (closed || finishing) return;
    if (def.endCard && !endEl) {
      veil.classList.remove('on');
      return showEndCard();
    }
    finish();
  };
  const unmountSkip = mountCloseButton(el, skip, 'Skip', 'skip');

  // Esc = Skip; kapanış kartında Space / Enter = devam. Yakalama evresinde: oyun Menu'sü / sahne kısayolları altta tetiklenmez.
  const onKeyCap = (e: KeyboardEvent): void => {
    if (closed) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      skip();
    } else if (endEl && (e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!busy) finish();
    }
  };
  window.addEventListener('keydown', onKeyCap, true);

  worldSound('quill'); // hikâye diyaloğunun açılış sesi (tüy kalem parşömende); yeni ses yok
  show(0);
  return { close: cleanup, el };
}
