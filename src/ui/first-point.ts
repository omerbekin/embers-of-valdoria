import './first-point.css';
import { MENTOR, TUTORIAL, firstPointLine, firstPointRec, firstPointState, type FirstPointKind, type FirstPointState } from '../tutorial/lessons';
import { isLessonSeen, markLessonSeen, tutorialsOn } from '../tutorial/store';
import { uiSound } from './ui-sound';

/**
 * Garrick şeridi (Ömer 2026-11-01, C5 B "Ribbon"; docs/design/tutorial.md): skill ağacı / stat ekranı ilk kez puanla açılınca başlık satırında
 * portre + cümle + "I will choose" + "Take it"; önerilen tek düğüm / stat parlar. "Take it" BEKLEYEN puan koyar, oyuncu Confirm ile onaylar, başkası
 * da seçilebilir. Bir kez görünür (tutorial kaydı), Tutorials kapalıyken çıkmaz, verisi olmayan sınıfta çıkmaz (data/tutorial.json > firstPoint).
 * Tetik ekran + puan: düğüm id'sine bağlı değil; öneri alınamıyorsa (kilitli) şerit çıkmaz ve görülmemiş kalır. Kural burada yok: alınabilirliği
 * ağaç / stat modeli söyler (gear-screen.ts bağlar).
 */

export interface FirstPointSide {
  free(): number;
  pending(): number;
  pendingOf(key: string): number;
  canTake(key: string): boolean;
  take(key: string): void;
  /** Parlayacak düğüm / stat kutusu. */
  node(key: string): HTMLElement | null;
  /** Şeridin yanına geleceği başlık satırı (telefonda ağaç başlığı gizli: yoksa panelin altına oturur). */
  head(): HTMLElement | null;
}

export interface FirstPointHost {
  panel: HTMLElement;
  view(): FirstPointKind | null;
  hero(): { id: string; class: string } | undefined;
  tree: FirstPointSide;
  stat: FirstPointSide;
}

export interface FirstPointCoach {
  sync(): void;
  destroy(): void;
}

const avatars = import.meta.glob('../../assets/avatars/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

interface Active {
  hero: string;
  key: string;
  text: string;
  /** Başlangıçtaki harcanmamış puan: bekleyen yokken azaldıysa oyuncu onayladı. */
  base: number;
  dismissed: boolean;
}

export function createFirstPoint(h: FirstPointHost): FirstPointCoach {
  const active: Partial<Record<FirstPointKind, Active>> = {};
  const done: Partial<Record<FirstPointKind, boolean>> = {};
  const shown: Partial<Record<FirstPointKind, boolean>> = {};
  let rib: HTMLElement | null = null;
  let ribKey = '';
  let glow: HTMLElement | null = null;
  let glowClass = '';
  let timer = 0;
  let cur: { kind: FirstPointKind; a: Active } | null = null;
  let syncing = false;

  const clearGlow = (): void => {
    glow?.classList.remove('fp-glow', 'fp-soft');
    glow = null;
    glowClass = '';
  };
  const hide = (): void => {
    rib?.remove();
    rib = null;
    ribKey = '';
    cur = null;
    clearGlow();
    if (timer) window.clearInterval(timer);
    timer = 0;
  };
  /** Bu ekran için şerit durumu: varsa sürer, yoksa koşullar uyuyorsa başlar (ilk gösterimde ders görüldü sayılır). */
  const resolve = (kind: FirstPointKind, heroId: string, cls: string): Active | null => {
    const side = h[kind];
    const lesson = TUTORIAL.firstPoint.lessons[kind];
    let a = active[kind];
    if (a && a.hero !== heroId) {
      delete active[kind];
      a = undefined;
    }
    if (a) return a;
    if (done[kind] || (!shown[kind] && isLessonSeen(lesson))) return null;
    const rec = kind === 'tree' ? firstPointRec(cls, 'tree') : firstPointRec(cls, 'stat');
    if (!rec) return null;
    const key = 'node' in rec ? rec.node : rec.attr;
    if (side.free() <= 0 || side.pending() > 0 || !side.canTake(key)) return null;
    markLessonSeen(lesson);
    shown[kind] = true;
    a = { hero: heroId, key, text: rec.text, base: side.free(), dismissed: false };
    active[kind] = a;
    return a;
  };
  const paintGlow = (): void => {
    if (!cur) return;
    const t = h[cur.kind].node(cur.a.key);
    const st = firstPointState({ pending: h[cur.kind].pending(), recPending: h[cur.kind].pendingOf(cur.a.key) > 0, dismissed: cur.a.dismissed });
    const cls = st === 'good' ? 'fp-soft' : st === 'other' ? '' : 'fp-glow';
    if (t === glow && cls === glowClass && (!t || !cls || t.classList.contains(cls))) return;
    clearGlow();
    glow = t;
    glowClass = cls;
    if (t && cls) t.classList.add(cls);
  };
  const place = (kind: FirstPointKind): void => {
    if (!rib) return;
    const head = h[kind].head();
    // Telefonda başlığa sığmaz (ağaçta başlık da gizli): panelin altına oturur. Sheet'te önerilen stat üstte, altta yalnız skill şeridi kalır.
    const short = document.documentElement.classList.contains('short');
    const bar = !short && head && head.offsetParent ? head : null;
    if (bar && kind === 'stat') {
      // Geniş ekran sheet: başlık satırı dar ve kırpılı; sağ sayfada başlığın hemen altına akar
      rib.classList.add('stat', 'in-flow');
      rib.classList.remove('in-head', 'in-panel');
      if (bar.nextElementSibling !== rib) bar.after(rib);
      return;
    }
    rib.classList.remove('in-flow');
    const host = bar ?? h.panel;
    rib.classList.toggle('in-head', !!bar);
    rib.classList.toggle('in-panel', !bar);
    rib.classList.toggle('stat', kind === 'stat');
    if (rib.parentElement !== host) host.append(rib);
  };
  const face = (): string => {
    const url = avatars[`../../assets/avatars/${MENTOR.avatar}.webp`];
    return `<span class="fp-face">${url ? `<img src="${url}" alt="">` : ''}</span>`;
  };
  const draw = (kind: FirstPointKind, a: Active, st: FirstPointState): void => {
    const key = `${kind}|${a.hero}|${st}`;
    if (!rib) {
      rib = document.createElement('div');
      rib.className = 'fp-rib fp-in';
      rib.setAttribute('role', 'status');
      // Şeride dokunma alttaki ağacı / düğme ipuçlarını tetiklemesin
      rib.addEventListener('pointerdown', (e) => e.stopPropagation());
      rib.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fp]');
        if (!b || !cur) return;
        if (b.dataset['fp'] === 'own') {
          cur.a.dismissed = true;
          uiSound('select');
          sync();
        } else h[cur.kind].take(cur.a.key);
      });
      window.setTimeout(() => rib?.classList.remove('fp-in'), 400);
    }
    if (key !== ribKey) {
      ribKey = key;
      const take = st === 'suggest' || st === 'quiet' ? '<button type="button" class="el-btn fp-take" data-fp="take">Take it</button>' : '';
      const own = st === 'suggest' ? '<button type="button" class="el-link fp-own" data-fp="own">I will choose</button>' : '';
      rib.innerHTML = `${face()}<div class="fp-tx"><b class="fp-nm">${MENTOR.name}</b><span class="fp-line"></span></div><div class="fp-btns">${own}${take}</div>`;
      rib.querySelector('.fp-line')!.textContent = firstPointLine(st, a.text);
    }
    place(kind);
  };
  function sync(): void {
    if (syncing) return; // take -> yeniden çizim -> sync zinciri
    syncing = true;
    try {
      const kind = h.view();
      const hero = h.hero();
      if (!kind || !hero || !tutorialsOn()) return hide();
      const a = resolve(kind, hero.id, hero.class);
      if (!a) return hide();
      const side = h[kind];
      if (side.pending() === 0 && side.free() < a.base) {
        done[kind] = true; // onaylandı: görevi bitti
        delete active[kind];
        return hide();
      }
      const st = firstPointState({ pending: side.pending(), recPending: side.pendingOf(a.key) > 0, dismissed: a.dismissed });
      cur = { kind, a };
      draw(kind, a, st);
      paintGlow();
      // Ağaç ölçü değişince düğümleri yeniden kurar, stat sayfası yeniden çizilir: parlama kaybolmasın
      if (!timer) {
        timer = window.setInterval(() => {
          paintGlow();
          if (cur) place(cur.kind);
        }, 300);
      }
    } finally {
      syncing = false;
    }
  }
  return { sync, destroy: hide };
}
