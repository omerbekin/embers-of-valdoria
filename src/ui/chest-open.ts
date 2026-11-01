/**
 * SANDIK AÇILIŞ animasyonu (Ömer 2026-11-01, taslak public/mockups/chest-open.html > B "Full scene"): sandığa dokununca ~2,5 sn tam ekran açılır;
 * kapak patlar, altın sayılır, item'ler tek tek rarity renginde ışık sütunuyla çıkar, sonra "Take all". Hızlı geçme: animasyon sırasında dokunmak sona atlar.
 * Bu ekran LOOT ekranının ÖN SAHNESİDİR: ödül zaten kayıttadır (`pendingLoot`), burası yalnız gösterir; kapanınca LOOT ekranı bugünkü kuralla açılır
 * (torba, Take all, bırakılan kaybolur, `first_loot` dersi hepsi orada). Sayfa yenilenirse LOOT ekranı doğrudan açılır (ödül kaybolmaz, iki kez verilmez).
 * Mantık: src/ui/chest-flow.ts (saf). Oyun içi metinler İngilizce.
 */
import chestClosedUrl from '../../assets/campaign/chest/chest-closed.webp?url';
import chestOpenUrl from '../../assets/campaign/chest/chest-open.webp?url';
import './gear.css';
import './chest-open.css';
import { stashLoot, type CampaignState } from '../campaign';
import { instanceColor, instanceRarity, rarityIndex, type ItemInstance } from '../progression';
import { chestClaim, chestKey, chestPlan, ChestFlow, CHEST_TIMING } from './chest-flow';
import { iconUrl } from './dom-icons';
import { itemTipNodes } from './item-tip';
import { lootItems } from './loot-screen';
import { reducedMotion } from './motion-pref';
import { hasUiImage, uiIconName } from './ui-icons';
import { uiSound, worldSound } from './ui-sound';

const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
const SESSION_KEY = 'eov.chestPlayed';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export interface ChestDropView {
  items: ItemInstance[];
  gold: number;
  stones: number;
  key: string;
}

/** Sandık düşüşünün gösterimi (kayda dokunmaz): `pendingLoot` sandık kaynaklıysa ve bu oturumda bu düşüş için oynatılmadıysa, yoksa null. */
export function chestDropOf(s: CampaignState | null | undefined): ChestDropView | null {
  const pl = s?.pendingLoot;
  if (!s || !pl || pl.kind !== 'treasure' || pl.gift) return null;
  const key = chestKey(pl);
  try {
    if (sessionStorage.getItem(SESSION_KEY) === key) return null;
  } catch {
    /* depolama yok: her seferinde oynar */
  }
  return { items: lootItems(stashLoot(s)), gold: pl.gold ?? 0, stones: pl.stones ?? 0, key };
}

/** Bu düşüş için sahne bu oturumda oynatıldı mı (LOOT ekranı açılış sesini tekrarlamasın). */
export function chestWasPlayed(s: CampaignState | null | undefined): boolean {
  const pl = s?.pendingLoot;
  if (!pl) return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === chestKey(pl);
  } catch {
    return false;
  }
}

export interface ChestHandle {
  /** Sona atla (item'ler kaybolmaz; düğme görünür). */
  skip(): void;
  /** Sahne kapanırken: `onDone` çağırmadan kaldır. */
  abort(): void;
}

export interface ChestOptions {
  drop: ChestDropView;
  /** Kayıt (Take all hepsini alırsa ganimet kaydı burada kapanır). */
  get: () => CampaignState;
  set: (s: CampaignState) => void;
  /** Take all hepsini torbaya aldı: LOOT ekranı AÇILMAZ; çağıran devam eder. BİR kez çağrılır. */
  onClaimed: () => void;
  /** Torba dolu / sığmayan var / item yok (Continue): LOOT ekranı açılır. BİR kez çağrılır. */
  onOpenLoot: () => void;
}

export function playChestOpen(root: HTMLElement, o: ChestOptions): ChestHandle {
  try {
    sessionStorage.setItem(SESSION_KEY, o.drop.key);
  } catch {
    /* yok say */
  }
  const { items, gold, stones } = o.drop;
  const plan = chestPlan(
    items.map((i) => ({ color: instanceColor(i), rank: rarityIndex(instanceRarity(i)) })),
    gold
  );
  const flow = new ChestFlow();
  const U = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gu')) || 1;
  const reduced = reducedMotion();
  let fast = false;
  let dead = false;
  const timers: number[] = [];
  const pending: Array<{ at: number; run: () => void; done: boolean }> = [];

  // ---- sahne
  const ov = el('div', 'co-ov');
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', 'Chest');
  const row = el('div', 'co-row');
  const cols: HTMLElement[] = [];
  const beams: HTMLElement[] = [];
  const plates: HTMLElement[] = [];
  items.forEach((inst, i) => {
    const step = plan.steps[i]!;
    const col = el('div', 'co-col');
    col.style.setProperty('--rc', step.color);
    const beam = el('div', `co-beam${step.big ? ' big' : ''}`);
    const plate = el('div', 'co-plate');
    const fit = el('div', 'co-fit');
    fit.append(...itemTipNodes(inst));
    plate.append(fit);
    col.append(beam, plate);
    row.append(col);
    cols.push(col);
    beams.push(beam);
    plates.push(plate);
  });
  const goldLine = el('div', 'co-gold');
  const goldNum = el('span', 'co-gold-n', '+0');
  if (gold > 0 || stones > 0) {
    if (gold > 0) {
      if (hasUiImage('gold')) {
        const im = el('img', 'co-gold-ico');
        im.src = iconUrl(uiIconName('gold'));
        im.alt = '';
        im.draggable = false;
        goldLine.append(im);
      }
      goldLine.append(goldNum, el('span', 'co-gold-l', 'Gold'));
    }
    if (stones > 0) goldLine.append(el('span', 'co-gold-l co-gold-s', `${gold > 0 ? '  ·  ' : ''}+${stones} Temper Stone${stones === 1 ? '' : 's'}`));
  }
  goldLine.style.opacity = '0';
  const chest = el('div', 'co-chest');
  const cs = el('div', 'co-cs');
  const glow = el('div', 'co-cglow');
  const imgClosed = el('img', 'co-cimg');
  imgClosed.src = chestClosedUrl;
  const imgOpen = el('img', 'co-cimg co-open');
  imgOpen.src = chestOpenUrl;
  for (const im of [imgClosed, imgOpen]) {
    im.alt = '';
    im.draggable = false;
  }
  cs.append(glow, imgClosed, imgOpen);
  const burstHost = el('div', 'co-bursts');
  chest.append(cs, burstHost);
  const hint = el('div', 'co-hint', 'Tap to open');
  const take = el('button', 'co-take', items.length ? 'Take all' : 'Continue');
  take.type = 'button';
  take.style.visibility = 'hidden';
  ov.append(el('div', 'co-vig'), row, goldLine, chest, hint, take);
  root.append(ov);

  // ---- hareket yardımcıları
  const anim = (node: HTMLElement, frames: Keyframe[], opts: { duration: number; delay?: number; easing?: string }): void => {
    if (fast || reduced || !node.animate) return;
    node.animate(frames, { duration: opts.duration, delay: opts.delay ?? 0, easing: opts.easing ?? EASE, fill: 'backwards' });
  };
  const burst = (size: number, color: string | null, big: boolean): void => {
    const b = el('div', 'co-burst');
    if (color) b.style.background = `radial-gradient(circle, ${color}, transparent 68%)`;
    burstHost.append(b);
    if (fast || reduced || !b.animate) return void b.remove();
    const a = b.animate([{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0.95 }, { transform: `translate(-50%,-50%) scale(${size})`, opacity: 0 }], { duration: big ? 800 : 650, easing: EASE });
    a.onfinish = () => b.remove();
  };
  const coinSpill = (): void => {
    if (gold <= 0 || fast || reduced || !hasUiImage('gold')) return;
    const xs = [-330, -260, -190, -130, 130, 190, 260, 330, -90, 90, -300, 300];
    xs.forEach((dx, k) => {
      const im = el('img', 'co-coin');
      im.src = iconUrl(uiIconName('gold'));
      im.alt = '';
      burstHost.append(im);
      const x1 = dx * 0.7 * U;
      const y1 = (110 + (k % 3) * 14) * U;
      const h = (170 + (k % 4) * 30) * U * 0.6;
      const f: Keyframe[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        f.push({ transform: `translate(calc(-50% + ${x1 * t}px), calc(-50% + ${y1 * t - 4 * h * t * (1 - t)}px)) scale(${1 - 0.2 * t}) rotate(${(k % 2 ? 300 : -300) * t}deg)`, opacity: i === 0 ? 0 : 1, offset: t });
      }
      const a = im.animate(f, { duration: 520, delay: k * 28, easing: 'linear', fill: 'backwards' });
      a.onfinish = () => im.remove();
    });
  };
  /** Altın sayacı: zamanlayıcıyla (gizli sekmede de ilerler), hızlı geçmede doğrudan son değer. */
  let countTimer = 0;
  const countGold = (): void => {
    goldLine.style.opacity = '1';
    anim(goldLine, [{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    if (fast || reduced || gold <= 0) {
      goldNum.textContent = `+${gold}`;
      return;
    }
    const t0 = Date.now();
    const tick = (): void => {
      const p = Math.min(1, (Date.now() - t0) / plan.goldMs);
      goldNum.textContent = `+${Math.round(gold * (1 - Math.pow(1 - p, 3)))}`;
      if (p >= 1 || dead) {
        window.clearInterval(countTimer);
        goldNum.textContent = `+${gold}`;
      }
    };
    countTimer = window.setInterval(tick, 30);
  };

  // ---- zaman çizelgesi
  const at = (t: number, run: () => void): void => {
    pending.push({ at: t, run, done: false });
  };
  const doStep = (s: { done: boolean; run: () => void }): void => {
    if (s.done) return;
    s.done = true;
    s.run();
  };
  at(0, () => {
    hint.remove();
    worldSound('loot_reveal');
    anim(chest, [{ transform: 'translateX(0) rotate(0deg)' }, { transform: 'translateX(-7px) rotate(-0.9deg)', offset: 0.2 }, { transform: 'translateX(7px) rotate(0.9deg)', offset: 0.45 }, { transform: 'translateX(-4px) rotate(-0.5deg)', offset: 0.7 }, { transform: 'translateX(0) rotate(0deg)' }], { duration: CHEST_TIMING.shakeMs, easing: 'ease-in-out' });
  });
  at(plan.openAt, () => {
    imgClosed.style.display = 'none';
    imgOpen.style.display = 'block';
    anim(glow, [{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0.45 }], { duration: 500 });
    anim(cs, [{ transform: 'scale(0.94, 1.05)' }, { transform: 'scale(1.07, 0.965)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 340 });
    glow.style.opacity = '0.45';
    burst(3.4, null, false);
  });
  if (plan.goldAt >= 0 || stones > 0) {
    at(plan.goldAt >= 0 ? plan.goldAt : plan.openAt + CHEST_TIMING.spillMs, () => {
      coinSpill();
      countGold();
    });
  }
  plan.steps.forEach((st, i) => {
    at(st.at, () => {
      const beam = beams[i]!;
      const plate = plates[i]!;
      beam.style.opacity = st.big ? '0.8' : '0.6';
      plate.style.opacity = '1';
      plate.style.transform = 'none';
      anim(beam, [{ opacity: 0, transform: 'scaleY(0.05)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.3 }, { opacity: st.big ? 0.8 : 0.6, transform: 'scaleY(1)' }], { duration: 1100 });
      anim(plate, [{ opacity: 0, transform: `translateY(${220 * U}px) scale(0.3)` }, { opacity: 1, transform: `translateY(${-14 * U}px) scale(1.03)`, offset: 0.75 }, { opacity: 1, transform: 'none' }], { duration: 600 });
      if (st.big) burst(3, 'rgba(190, 120, 255, 0.7)', true);
      uiSound('open');
    });
  });
  at(plan.buttonAt, () => {
    flow.reveal();
    take.style.visibility = 'visible';
    anim(take, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
  });

  const hideUntilShown = (): void => {
    for (const p of plates) {
      p.style.opacity = '0';
      p.style.transform = `translateY(${220 * U}px) scale(0.3)`;
    }
    for (const b of beams) b.style.opacity = '0';
  };
  hideUntilShown();
  /** Plaka kendi boyunda kalır; satıra sığmıyorsa (kısa ekran) bütün olarak küçülür, kesilmez. */
  const fitPlates = (): void => {
    const room = row.clientHeight - 4;
    if (room < 40) return; // yerleşim henüz oturmadı
    for (const pl of plates) {
      const fit = pl.firstElementChild as HTMLElement;
      fit.style.transform = '';
      const h = fit.offsetHeight;
      const w = fit.offsetWidth;
      const kw = w > 0 && pl.clientWidth > 0 ? pl.clientWidth / w : 1;
      const k = h > 0 && room > 0 ? Math.min(1, room / h, kw) : 1;
      fit.style.transform = k < 1 ? `scale(${k})` : '';
      pl.style.height = `${Math.round(h * k)}px`;
    }
  };
  fitPlates();
  // satır boyu değişince (pencere / kısa ekran sınıfı sonradan oturur) yeniden sığdır
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fitPlates()) : null;
  ro?.observe(row);
  const onResize = (): void => fitPlates();
  window.addEventListener('resize', onResize);

  const runAll = (): void => {
    fast = true;
    for (const t of timers) window.clearTimeout(t);
    timers.length = 0;
    window.clearInterval(countTimer);
    for (const s of pending) doStep(s);
    ov.getAnimations({ subtree: true }).forEach((a) => {
      try {
        a.finish();
      } catch {
        /* yok say */
      }
    });
  };
  const start = (): void => {
    if (reduced) return runAll();
    for (const s of pending) timers.push(window.setTimeout(() => !dead && doStep(s), s.at));
  };

  const leave = (): void => {
    if (!flow.finish()) return;
    const r = chestClaim(o.get(), items.length > 0);
    if (r.state !== o.get()) o.set(r.state);
    const claimedAll = r.done;
    ov.style.pointerEvents = 'none';
    const done = (): void => {
      if (dead) return;
      dead = true;
      ov.remove();
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      if (claimedAll) o.onClaimed();
      else o.onOpenLoot();
    };
    uiSound('confirm');
    if (reduced || !ov.animate) return done();
    const a = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: EASE, fill: 'forwards' });
    a.onfinish = done;
  };
  const tap = (): void => {
    const r = flow.tap();
    if (r === 'open') start();
    else if (r === 'skip') runAll();
  };
  ov.addEventListener('click', (e) => {
    if (e.target === take) return leave();
    tap();
  });
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    if (flow.phase === 'shown') leave();
    else tap();
  };
  document.addEventListener('keydown', onKey, true);
  anim(chest, [{ opacity: 0, transform: `translateY(${120 * U}px)` }, { opacity: 1, transform: 'none' }], { duration: 420 });

  return {
    skip: () => {
      if (flow.phase === 'closed') flow.tap();
      if (flow.phase === 'opening') runAll();
    },
    abort: () => {
      dead = true;
      for (const t of timers) window.clearTimeout(t);
      window.clearInterval(countTimer);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      ov.remove();
    },
  };
}
