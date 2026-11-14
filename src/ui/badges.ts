/**
 * Rozet zinciri (Ömer 2026-11-12, "C" seçildi): yapılabilecek bir şey varsa yol boyunca her kap küçük kor nokta taşır (harita Gear düğmesi ->
 * kahraman yer imi -> Gear sekmesi); hedefin kenarı (harcanabilir stat karosu, açık ağaç düğümü, torbadaki yeni item) kor ışıkla nabız atar.
 * Hiç sayı yok. Kural modeli badge-model.ts. Oyun ekranlarının koduna dokunmaz: #ui-root'u izler (MutationObserver) ve kendi işaretlerini
 * ekler; kayıt yalnız okunur. Hareketi azalt (reducedMotion): nabız yok, sabit parıltı (html.vb-rm).
 */
import './badges.css';
import { current } from '../game/campaign-session';
import { badgeModel, type BadgeModel } from './badge-model';
import { reducedMotion } from './motion-pref';

// Görülmüş item'ler yalnız oturum boyu tutulur (sessionStorage); eov.* değil, bulut eşitlemesine girmez
const SEEN_KEY = 'badgeSeen';

interface SeenStore {
  seed: number;
  uids: string[];
}

let seen: Set<string> | null = null;
let seenSeed = -1;

function loadSeen(seed: number, inventory: Array<{ uid: string }>): Set<string> {
  if (seen && seenSeed === seed) return seen;
  let st: SeenStore | null = null;
  try {
    st = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? 'null') as SeenStore | null;
  } catch {
    st = null;
  }
  seenSeed = seed;
  // ilk açılış (ya da başka sefer): torbadaki her şey "görülmüş" sayılır; bundan sonra gelenler yeni
  seen = st && st.seed === seed ? new Set(st.uids) : new Set(inventory.map((i) => i.uid));
  saveSeen();
  return seen;
}

function saveSeen(): void {
  if (!seen) return;
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify({ seed: seenSeed, uids: [...seen] } satisfies SeenStore));
  } catch {
    /* kota: önemsiz */
  }
}

/** Debug "Badge demo state" item eklemeden önce çağırır: şu anki torba görülmüş sayılır, sonra eklenenler yeni olur. */
export function snapshotSeen(): void {
  const s = current();
  if (s) loadSeen(s.seed, s.inventory);
}

/** Yol işareti (nokta): host içinde tek `.vb` öğesi; aynıysa dokunulmaz (gözlemci döngüsü olmasın). */
function mark(host: Element, on: boolean): void {
  let m = host.querySelector<HTMLElement>(':scope > .vb');
  if (!on) {
    m?.remove();
    return;
  }
  const cls = 'vb vb-dot';
  if (!m) {
    m = document.createElement('span');
    m.setAttribute('aria-hidden', 'true');
    host.append(m);
  }
  if (m.className !== cls) m.className = cls;
}

function glow(host: Element, on: boolean): void {
  if (host.classList.contains('vb-glow') !== on) host.classList.toggle('vb-glow', on);
}

/** Yol üstündeki kap: sayı yok, yalnız nokta. */
function route(host: Element | null | undefined, n: number): void {
  if (host) mark(host, n > 0);
}

const tabKind = (b: HTMLElement): 'items' | 'stat' | 'tree' | 'char' | null => {
  const t = (b.textContent ?? '').replace(/\d+/g, '').trim().toLowerCase();
  if (t === 'hero' || t === 'inventory') return 'items';
  if (t === 'sheet') return 'stat';
  if (t === 'tree') return 'tree';
  if (t === 'character') return 'char';
  return null;
};

function decorate(): void {
  document.documentElement.classList.toggle('vb-rm', reducedMotion()); // ayar canlı değişebilir
  const s = current();
  const root = document.getElementById('ui-root');
  if (!s || !root) return;
  const m: BadgeModel = badgeModel(s, loadSeen(s.seed, s.inventory));
  // 1) harita / kasaba Gear düğmesi
  route(root.querySelector('.camp-hud .camp-gear'), m.total);
  // 2) kahraman yer imleri
  root.querySelectorAll<HTMLElement>('.gr-mark[data-hero]').forEach((b) => {
    const h = m.heroes[b.dataset['hero']!];
    route(b, h ? h.stat + h.tree : 0);
  });
  const heroId = root.querySelector<HTMLElement>('.gr-mark.on[data-hero]')?.dataset['hero'] ?? s.active?.find(Boolean) ?? s.roster[0]?.id ?? '';
  const hb = m.heroes[heroId] ?? { stat: 0, tree: 0 };
  // 3) Gear sekmeleri (Hero = torba, Sheet = stat, Tree = ağaç; telefonda Character / Inventory)
  root.querySelectorAll<HTMLElement>('.gr-overlay .gr-tab').forEach((b) => {
    const k = tabKind(b);
    if (!k) return;
    route(b, k === 'items' ? m.newUids.length : k === 'stat' ? hb.stat : k === 'tree' ? hb.tree : hb.stat + hb.tree);
  });
  // 4) hedefler
  const fresh = new Set(m.newUids);
  root.querySelectorAll<HTMLElement>('.gr-overlay [data-drag^="bag:"]').forEach((c) => glow(c, fresh.has(c.dataset['drag']!.slice(4))));
  root.querySelectorAll<HTMLElement>('.gr-overlay .sh-row').forEach((r) => glow(r, r.classList.contains('can-add')));
  root.querySelectorAll<HTMLElement>('.gr-overlay .gt-nd').forEach((n) => glow(n, hb.tree > 0 && n.classList.contains('st-av')));
}

let installed = false;

/** Açılışta bir kez kurulur (main.ts). */
export function installBadges(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.documentElement.classList.add('vb-on');
  let queued = false;
  const run = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      decorate();
    });
  };
  const start = (): void => {
    const root = document.getElementById('ui-root');
    if (!root) return void window.setTimeout(start, 300);
    new MutationObserver(run).observe(root, { childList: true, subtree: true });
    window.setInterval(run, 500); // kayıt değişti ama DOM değişmedi (harita düğmesi)
    run();
  };
  start();
  // Yeni item'in üstüne gelince / dokununca görülmüş sayılır
  document.addEventListener(
    'pointerover',
    (e) => {
      const c = (e.target as Element | null)?.closest?.('[data-drag^="bag:"]') as HTMLElement | null;
      const uid = c?.dataset['drag']?.slice(4);
      if (!uid || !seen || seen.has(uid)) return;
      seen.add(uid);
      saveSeen();
      run();
    },
    true,
  );
}
