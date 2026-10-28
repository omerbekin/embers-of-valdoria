/**
 * "Form your company" penceresi (Ömer 2026-10-23, taslak public/mockups/form-company-v2 B): üstte 3 büyük yuva (seçilen kahraman kartı, lider işaretli),
 * altta tüm sınıfların portre şeridi, alt çubukta "3 / 3 chosen  LEADER X" + Set out (sağda). Oyun kuralı burada yok: seçim durumu (3 kişi, ilk seçilen
 * lider, seçili kahramana tekrar dokununca lider) yalnızca arayüz bilgisidir; sonuç `onSetOut(sınıflar, liderSırası)` ile sahneye gider.
 * Portre çerçevesi hero-bust verisinden (kart başına aynı en-boy oranı: baş hep aynı yerde), çipler tek satır.
 */
import './map-window.css';
import './company-window.css';
import { addBustWeapons, avatarUrlOf, bustHtml } from './hero-bust';
import { bandTipHtml } from './band-tip';
import { dismissOnBackdrop } from './backdrop';
import { lockInput, unlockInput } from './input-lock';
import { miscImage, statImage } from '../game/icon-image-files';
import type { MwCard } from './map-window';

export interface CompanySpec {
  size: number;
  cards: MwCard[];
  /** Tutorial'da oynanan sınıflar: "Played in the tutorial" notu. */
  tutorial: Set<string>;
  onSetOut: (picks: string[], leaderIndex: number) => void;
  toast: (msg: string) => void;
  /** Kışla (Ömer 2026-10-27: Barracks da bu pencereyi kullanır): başlık, alt yazı, düğme yazısı; lider yok; Not now + zemin = onCancel. */
  title?: string;
  sub?: string;
  goLabel?: string;
  noLeader?: boolean;
  onCancel?: () => void;
}
export interface CompanyHandle {
  close(): void;
  readonly el: HTMLElement;
}

const CROWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 19V8l5 5 4-8 4 8 5-5v11z"/><circle cx="12" cy="15.5" r="1.3" fill="#e0702a" stroke="none"/></svg>';
const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const lighten = (hex: string): string => `color-mix(in srgb, ${hex} 55%, #fff)`;

export function openCompanyWindow(root: HTMLElement, o: CompanySpec): CompanyHandle {
  const by = new Map(o.cards.map((c) => [c.id, c]));
  const SIZE = o.size;
  const slots: Array<string | null> = Array.from({ length: SIZE }, () => null);
  let leader: string | null = null;
  const shown: Array<string | null> = Array.from({ length: SIZE }, () => null);
  let done = false;

  const wrap = document.createElement('div');
  wrap.className = 'mw cw mw-in';
  const slotHtml = slots.map((_, i) => `<div class="cw-slot" data-drop="slot" data-i="${i}"><span class="cw-ord"></span><div class="cw-empty"></div></div>`).join('');
  const strip = o.cards
    .map((c, i) => {
      const av = avatarUrlOf(c.spriteId);
      return `<button type="button" class="cw-pc" data-id="${esc(c.id)}" style="--i:${i}">${av ? `<img src="${av}" alt="" draggable="false">` : ''}<span class="dm"></span><span class="nm">${esc(c.name)}</span></button>`;
    })
    .join('');
  wrap.innerHTML = `<div class="mw-scrim"></div>
    <div class="cw-win"><i class="cw-cn tl"></i><i class="cw-cn tr"></i><i class="cw-cn bl"></i><i class="cw-cn br"></i>
      <h1 class="cw-ttl"><i></i><span>${esc(o.title ?? 'Form your company')}</span><i></i></h1>
      <p class="cw-sub">${esc(o.sub ?? `Choose ${SIZE} heroes. The first one you pick leads the company (tap a chosen hero again to make them the leader).`)}</p>
      <div class="cw-body"><div class="cw-slots">${slotHtml}</div><div class="cw-strip" data-drop="pool">${strip}</div></div>
      <div class="cw-foot"><div class="cw-count"></div><div class="cw-acts">${o.onCancel ? '<button type="button" class="el-btn" data-no>Not now</button>' : ''}<button type="button" class="el-btn primary" data-go>${esc(o.goLabel ?? 'Set out')}</button></div></div>
    </div>`;
  root.append(wrap);
  lockInput('company-window');
  const entry = window.setTimeout(() => wrap.classList.remove('mw-in'), 1300);
  const win = wrap.querySelector<HTMLElement>('.cw-win')!;
  win.style.animation = 'mw-rise var(--m-modal-in, 220ms) ease-out both';
  wrap.querySelector<HTMLElement>('.mw-scrim')!.style.animation = 'mw-fade 200ms ease-out both';
  window.setTimeout(() => {
    win.style.animation = '';
    const sc = wrap.querySelector<HTMLElement>('.mw-scrim');
    if (sc) sc.style.animation = '';
  }, 600);

  const picks = (): string[] => slots.filter((s): s is string => !!s);
  const compact = (): void => {
    const p = picks();
    for (let i = 0; i < SIZE; i++) slots[i] = p[i] ?? null;
    if (!leader || !p.includes(leader)) leader = p[0] ?? null;
  };

  // ---- ipucu (A Band, hover) ----
  let tipEl: HTMLElement | null = null;
  const hideTip = (): void => {
    tipEl?.remove();
    tipEl = null;
  };
  const showTip = (target: HTMLElement, id: string): void => {
    hideTip();
    const c = by.get(id);
    if (!c) return;
    const lines = [...(c.blurb ? [{ text: c.blurb }] : []), ...(o.tutorial.has(id) ? [{ text: 'Played in the tutorial' }] : [])];
    const av = avatarUrlOf(c.spriteId);
    const html = bandTipHtml({ accent: c.color, ...(c.role ? { kind: c.role } : {}), title: c.name, ...(av ? { icon: av, iconShape: 'portrait' as const } : {}), ...(c.stat ? { value: c.stat.toUpperCase(), valueLabel: 'Primary' } : {}), lines });
    const t = document.createElement('div');
    t.className = 'cw-tip';
    t.innerHTML = html;
    wrap.append(t);
    tipEl = t;
    const r = target.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const tw = t.offsetWidth;
    const th = t.offsetHeight;
    const x = Math.max(8, Math.min(w.width - tw - 8, r.left - w.left + r.width / 2 - tw / 2));
    let y = r.top - w.top - th - 14;
    if (y < 8) y = r.bottom - w.top + 14;
    t.style.left = `${x}px`;
    t.style.top = `${y}px`;
    requestAnimationFrame(() => t.classList.add('on'));
  };
  const hoverTip = (el: HTMLElement, id: string): void => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && !drag) showTip(el, id);
    });
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('focus', () => showTip(el, id));
    el.addEventListener('blur', hideTip);
  };

  // ---- kart ----
  function cardHtml(c: MwCard): string {
    const logo = miscImage(`class:${c.classId}`)?.url;
    const stat = c.stat ? statImage(c.stat as 'str')?.url : null;
    const chips = `<div class="cw-chips">${c.role ? `<span class="cw-chip role" title="${esc(c.role)}">${esc(c.role)}</span>` : ''}${c.stat ? `<span class="cw-chip stat">${stat ? `<img src="${stat}" alt="" draggable="false">` : ''}${esc(c.stat.toUpperCase())}</span>` : ''}</div>`;
    const tut = o.tutorial.has(c.id) ? '<span class="tut"><i></i>Played in the tutorial</span>' : c.tag ? `<span class="tut"><i></i>${esc(c.tag)}</span>` : '<span class="tut"></span>'; // kışlada: katılacağı level (D12)
    return `<button type="button" class="mw-card cw-card" data-id="${esc(c.id)}" style="--i:0;--ac:${c.color};--acl:${lighten(c.color)}"><div class="pt">${bustHtml(c.classId, c.spriteId)}${logo ? `<img class="em" src="${logo}" alt="" draggable="false">` : ''}</div><span class="nm">${esc(c.name)}</span>${chips}${tut}</button>`;
  }

  // ---- durum -> görünüm (kök baştan kurulmaz: yalnızca değişen yuva yeniden çizilir) ----
  const countEl = wrap.querySelector<HTMLElement>('.cw-count')!;
  const goBtn = wrap.querySelector<HTMLButtonElement>('[data-go]')!;
  const sync = (): void => {
    const p = picks();
    wrap.querySelectorAll<HTMLElement>('.cw-pc').forEach((el) => el.classList.toggle('sel', p.includes(el.dataset['id'] ?? '')));
    wrap.querySelectorAll<HTMLElement>('.cw-slot').forEach((s, i) => {
      const id = slots[i] ?? null;
      if (shown[i] !== id) {
        shown[i] = id;
        s.querySelector('.cw-card')?.remove();
        s.querySelector<HTMLElement>('.cw-empty')!.style.display = id ? 'none' : '';
        const c = id ? by.get(id) : null;
        if (id && c) {
          s.insertAdjacentHTML('beforeend', cardHtml(c));
          const el = s.querySelector<HTMLElement>('.cw-card')!;
          el.classList.add('sel');
          addBustWeapons(el);
          bindDrag(el, id);
          hoverTip(el, id);
        }
      }
      const ord = s.querySelector<HTMLElement>('.cw-ord')!;
      if (id && o.noLeader) {
        ord.className = 'cw-ord on';
        ord.innerHTML = `<b>${i + 1}</b>`;
      } else if (id) {
        const lead = leader === id;
        ord.className = `cw-ord on${lead ? ' lead' : ''}`;
        ord.innerHTML = `${CROWN}<b>${i + 1}</b><span class="lt">Leader</span>`;
      } else {
        ord.className = 'cw-ord empty';
        ord.innerHTML = `<b>${i + 1}</b>`;
      }
    });
    const n = p.length;
    countEl.innerHTML = `${n} / ${SIZE} chosen`;
    goBtn.disabled = n !== SIZE;
    goBtn.classList.toggle('ready', n === SIZE);
    goBtn.title = n === SIZE ? '' : `Pick ${SIZE} heroes first.`;
  };

  // ---- seçim (dokunma) ----
  const toast = (m: string): void => o.toast(m);
  function tap(id: string): void {
    const p = picks();
    if (!p.includes(id)) {
      if (p.length >= SIZE && o.noLeader && SIZE === 1) slots[0] = null; // tek seçim: yeni dokunuş öncekinin yerine geçer
      else if (p.length >= SIZE) return toast(`You already have ${SIZE} heroes. Tap one to remove it.`);
      slots[slots.indexOf(null)] = id;
      if (!leader) leader = id;
    } else if (leader !== id && !o.noLeader) leader = id;
    else {
      slots[slots.indexOf(id)] = null;
      leader = null;
    }
    compact();
    sync();
  }
  function dropTo(id: string, t: { k: 'slot'; i: number } | { k: 'pool' }): void {
    const j = slots.indexOf(id);
    if (t.k === 'slot') {
      const old = slots[t.i] ?? null;
      if (old === id) return;
      if (j >= 0) {
        slots[j] = old;
        slots[t.i] = id;
      } else {
        slots[t.i] = id;
        if (old && old === leader) leader = id;
      }
      if (!leader) leader = id;
    } else if (j >= 0) slots[j] = null;
    compact();
    sync();
  }

  // ---- sürükle-bırak (fare + dokunma); kıpırdamadan bırakılırsa dokunma sayılır ----
  let drag: { id: string; el: HTMLElement; ghost: HTMLElement; x: number; y: number; moved: boolean; pid: number } | null = null;
  function bindDrag(el: HTMLElement, id: string): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || done) return;
      const st = { id, el, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, ghost: null as unknown as HTMLElement };
      const move = (ev: PointerEvent): void => {
        if (ev.pointerId !== st.pid) return;
        if (!st.moved && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) > 8) {
          st.moved = true;
          hideTip();
          const g = document.createElement('div');
          g.className = 'cw-ghost';
          const av = avatarUrlOf(by.get(id)?.spriteId ?? '');
          if (av) g.style.backgroundImage = `url(${av})`;
          wrap.append(g);
          st.ghost = g;
          drag = st;
          el.classList.add('dragging');
          wrap.querySelectorAll('[data-drop]').forEach((d) => d.classList.add('drop-can'));
        }
        if (st.moved) {
          st.ghost.style.left = `${ev.clientX}px`;
          st.ghost.style.top = `${ev.clientY}px`;
          const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]');
          wrap.querySelectorAll('.drop-over').forEach((d) => d !== t && d.classList.remove('drop-over'));
          t?.classList.add('drop-over');
        }
      };
      const up = (ev: PointerEvent): void => {
        if (ev.pointerId !== st.pid) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (st.moved) {
          const t = ev.type === 'pointercancel' ? null : (document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]') as HTMLElement | null);
          st.ghost.remove();
          el.classList.remove('dragging');
          wrap.querySelectorAll('[data-drop]').forEach((d) => d.classList.remove('drop-can', 'drop-over'));
          drag = null;
          if (t) dropTo(id, t.dataset['drop'] === 'slot' ? { k: 'slot', i: Number(t.dataset['i']) } : { k: 'pool' });
        } else if (ev.type === 'pointerup') tap(id);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
    el.addEventListener('click', (e) => {
      if (e.detail === 0) tap(id); // klavye
    });
  }
  wrap.querySelectorAll<HTMLElement>('.cw-pc').forEach((el) => {
    const id = el.dataset['id'] ?? '';
    bindDrag(el, id);
    hoverTip(el, id);
  });

  goBtn.addEventListener('click', () => {
    if (done) return;
    const p = picks();
    if (p.length !== SIZE) return toast(SIZE === 1 ? 'Pick one companion first.' : `Pick ${SIZE} heroes.`);
    o.onSetOut(p, Math.max(0, p.indexOf(leader ?? p[0]!)));
  });

  if (o.onCancel) {
    const cancel = o.onCancel;
    wrap.querySelector<HTMLElement>('[data-no]')?.addEventListener('click', () => !done && cancel());
    dismissOnBackdrop(wrap, win, () => !done && cancel());
  }

  sync();
  return {
    el: wrap,
    close: () => {
      if (done) return;
      done = true;
      window.clearTimeout(entry);
      hideTip();
      wrap.remove();
      unlockInput('company-window');
    },
  };
}
