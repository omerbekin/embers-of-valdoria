import './lesson-box.css';
import { MENTOR, lessonById, lessonPages } from '../tutorial/lessons';
import { isLessonSeen, markLessonSeen, setTutorialsOn, tutorialsOn } from '../tutorial/store';
import { uiSound } from './ui-sound';

/**
 * Mentor kutusu (sefer tutorial'ı; docs/design/tutorial.md): portreli kısa diyalog kartı (kit: el-panel corners, Cinzel başlık, Garamond
 * italik metin). Oyunu durdurmaz, pencere zemini yoktur (yalnızca kutu dokunulabilir). Sırayla kuyruk: aynı anda tek kutu.
 * Serbest ders: "Got it" (çok sayfalıysa "Next") + "Don't show again" (tüm dersleri kapatır = Settings > Tutorials Off).
 * Zorunlu adım (yalnızca ilk savaş): düğme yerine bekleme satırı; adım oyunda doğru eylem yapılınca dışarıdan kapanır (`LessonHandle.done`).
 * `focus` seçicisiyle gösterilen DOM öğesi nabız gibi atan altın çerçeve alır (savaş HUD'ı, Gear).
 */

export interface LessonCard {
  title: string;
  text: string;
  focus?: string;
  /** Zorunlu adım: düğme yok, bu yazı gösterilir; kapanış dışarıdan (`done`). */
  awaitText?: string;
  /** Sayfa sayacı ("2 / 3"). */
  page?: string;
  /** Arkasından aynı dersin başka sayfası gelir: düğme "Next". */
  more?: boolean;
  /** Kutu altta (varsayılan üst orta). */
  bottom?: boolean;
}

export interface LessonHandle {
  /** Zorunlu adım tamamlandı / dışarıdan kapat (kuyruktaki sıradaki kart açılır). */
  done(): void;
}

interface Pending {
  card: LessonCard;
  onClose?: () => void;
  handle: { closed: boolean; done: () => void };
}

const avatars = import.meta.glob('../../assets/avatars/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const avatarUrl = (id: string): string | undefined => avatars[`../../assets/avatars/${id}.png`];

const queue: Pending[] = [];
let current: { p: Pending; root: HTMLElement; timer: number } | null = null;
const offListeners = new Set<() => void>();

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function clearFocus(): void {
  document.querySelectorAll('.tut-focus').forEach((e) => e.classList.remove('tut-focus'));
}

function render(p: Pending): void {
  const host = document.getElementById('ui-root') ?? document.body;
  const wrap = el('div', `tut-wrap${p.card.bottom ? ' bottom' : ''}`);
  const box = el('div', 'tut-box el-panel corners');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', `${MENTOR.name}: ${p.card.title}`);
  const face = el('div', 'tut-face');
  const url = avatarUrl(MENTOR.avatar);
  if (url) {
    const img = el('img', '');
    img.src = url;
    img.alt = MENTOR.name;
    face.append(img);
  }
  const main = el('div', 'tut-main');
  const who = el('div', 'tut-who', `${MENTOR.name} · ${MENTOR.title}`);
  const title = el('div', 'tut-title', p.card.title);
  const text = el('div', 'tut-text', p.card.text);
  const row = el('div', 'tut-row');
  const off = el('button', 'el-link tut-off', "Don't show again");
  off.type = 'button';
  off.addEventListener('click', () => {
    setTutorialsOn(false);
    closeAllLessons();
    for (const fn of offListeners) fn();
  });
  row.append(off);
  if (p.card.page) row.append(el('span', 'tut-page', p.card.page));
  if (p.card.awaitText) row.append(el('span', 'tut-await', p.card.awaitText));
  else {
    const ok = el('button', 'el-btn primary tut-ok', p.card.more ? 'Next' : 'Got it');
    ok.type = 'button';
    ok.addEventListener('click', () => {
      uiSound('select');
      p.handle.done();
    });
    row.append(ok);
  }
  main.append(who, title, text, row);
  box.append(face, main);
  wrap.append(box);
  // Fare bırakması alttaki Phaser sahnesine gitmesin (Phaser window mouseup'ı dinler, defaultPrevented olanı yok sayar)
  box.addEventListener('mouseup', (e) => e.preventDefault());
  box.addEventListener('pointerdown', (e) => e.stopPropagation());
  host.append(wrap);
  // Vurgu: HUD yeniden çizilince sınıf kaybolabilir; kısa aralıkla yeniden takılır
  const paint = () => {
    const target = p.card.focus ? document.querySelector(p.card.focus) : null;
    document.querySelectorAll('.tut-focus').forEach((e) => e !== target && e.classList.remove('tut-focus'));
    if (target && !target.classList.contains('tut-focus')) {
      target.classList.add('tut-focus'); // aynı öğede sınıf kalır (nabız baştan başlamasın)
      target.scrollIntoView({ block: 'nearest' }); // kaydırılan panelde görünür olsun (Gear statları)
    }
  };
  paint();
  const timer = window.setInterval(paint, 250);
  current = { p, root: wrap, timer };
  uiSound('toast');
}

function closeCurrent(): void {
  if (!current) return;
  window.clearInterval(current.timer);
  clearFocus();
  current.root.remove();
  const cb = current.p.onClose;
  current = null;
  cb?.();
}

function pump(): void {
  if (current) return;
  const next = queue.shift();
  if (next) render(next);
}

/** Kartı kuyruğa koyar (açık kutu yoksa hemen açılır). */
export function showCard(card: LessonCard, onClose?: () => void): LessonHandle {
  const handle = {
    closed: false,
    done: () => {
      if (handle.closed) return;
      handle.closed = true;
      if (current?.p === p) {
        closeCurrent();
        pump();
      } else {
        const i = queue.indexOf(p);
        if (i >= 0) queue.splice(i, 1);
        onClose?.();
      }
    },
  };
  const p: Pending = { card, ...(onClose ? { onClose } : {}), handle };
  queue.push(p);
  pump();
  return handle;
}

/**
 * Serbest dersi gösterir (ayar açık ve daha görülmediyse): görüldü olarak işaretlenir (Codex > Lessons), sayfaları sırayla kuyruğa girer.
 * Gösterildiyse true. `force`: görülmüş olsa da göster (debug "Trigger lesson").
 */
export function showLesson(id: string, o: { force?: boolean; onClose?: () => void } = {}): boolean {
  const l = lessonById(id);
  if (!l || (!o.force && (!tutorialsOn() || isLessonSeen(id)))) return false;
  markLessonSeen(id);
  const pages = lessonPages(l);
  pages.forEach((pg, i) =>
    showCard(
      {
        title: pg.title ?? l.title,
        text: pg.text,
        ...(pg.focus ? { focus: pg.focus } : {}),
        ...(l.place === 'bottom' ? { bottom: true } : {}),
        ...(pages.length > 1 ? { page: `${i + 1} / ${pages.length}`, more: i < pages.length - 1 } : {}),
      },
      i === pages.length - 1 ? o.onClose : undefined,
    ),
  );
  return true;
}

/** Dersi olmayan mentor sözü (açılış, yenilgi ipucu): ayar kapalıysa gösterilmez. */
export function showMentorLine(title: string, text: string, onClose?: () => void): boolean {
  if (!tutorialsOn()) return false;
  showCard({ title, text }, onClose);
  return true;
}

export function lessonBoxOpen(): boolean {
  return !!current;
}

/** Tüm kutuları kapatır (sahne değişimi, "Don't show again"). Kapanış geri çağrıları çalışmaz. */
export function closeAllLessons(): void {
  queue.length = 0;
  if (current) {
    window.clearInterval(current.timer);
    clearFocus();
    current.root.remove();
    current = null;
  }
}

/** "Don't show again" basılınca (zorunlu adımlar serbest kalsın). */
export function onLessonsTurnedOff(fn: () => void): () => void {
  offListeners.add(fn);
  return () => offListeners.delete(fn);
}
