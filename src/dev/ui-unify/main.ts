/**
 * DEV-ONLY mockup (ui-unify.html): oyunun GERCEK bilesenleriyle Formation ve Hero card secenekleri.
 * mountFormationBoard / openFormationWindow / boardHero / boardTips + gercek CSS, portre, ikon. Oyun koduna dokunmaz; uretim build'ine girmez.
 */
import '../../style.css';
import '../../ui/elegant.css';
import '../../ui/company-window.css';
import './uu.css';
import { content } from '../../engine';
import { mountFormationBoard, openFormationWindow, type FormationBoard, type FormationBoardHero, type FormationBoardOpts } from '../../ui/formation-board';
import { boardHero, boardHints, boardIcons, boardRangeUi, boardTips, type BoardHeroSource } from '../../ui/formation-board-data';
import { previewMove } from '../../ui/formation-board-rules';
import { avatarUrl } from '../../ui/character-panel';
import bgSunset from '../../../assets/backgrounds/proving-grounds-sunset.webp?url';
import bgTown from '../../../assets/towns/town-ashford.webp?url';

type Page = 'formation' | 'hero';
type Opt = 'A' | 'B';

const ORDER = ['defender', 'skald', 'warrior', 'archer', 'cutthroat', 'antimage', 'druid', 'mage', 'paladin', 'undead', 'vesper', 'gambler', 'hexer'].filter((c) => content.classes[c]);
const src = (cls: string, side = 'p', leader = false): BoardHeroSource => ({ id: `${side}_${cls}`, class: cls, level: 3, hpRatio: 0.55 + ((cls.length * 7) % 5) / 12, ...(leader ? { leader: true } : {}) });

// ---- takim durumu (12 hucre: sira*3 + serit; sira 0 = on)
const player: BoardHeroSource[] = [src('defender', 'p', true), src('warrior'), src('skald'), src('archer')];
const enemy: BoardHeroSource[] = [src('cutthroat', 'e', true), src('paladin', 'e'), src('druid', 'e'), src('mage', 'e')];
const mk = (list: BoardHeroSource[], at: number[]): string[] => {
  const c = Array<string>(12).fill('');
  list.forEach((h, i) => (c[at[i]!] = h.id));
  return c;
};
const cellsOf: Record<string, string[]> = { p: mk(player, [0, 4, 6, 10]), e: mk(enemy, [1, 3, 7, 9]) };
const teamOf = (side: string): BoardHeroSource[] => (side === 'p' ? player : enemy);

const heroCache = new Map<string, FormationBoardHero>();
const bh = (h: BoardHeroSource): FormationBoardHero | null => {
  const k = `${h.id}:${h.leader ? 1 : 0}`;
  let v = heroCache.get(k);
  if (!v) {
    const b = boardHero(h);
    if (!b) return null;
    v = b;
    heroCache.set(k, v);
  }
  return v;
};
const opts = (side: () => string): FormationBoardOpts => {
  const team = (): BoardHeroSource[] => teamOf(side());
  return {
    heroes: () => team().flatMap((h) => bh(h) ?? []),
    cells: () => cellsOf[side()]!,
    hintsFor: boardHints((id) => team().find((h) => h.id === id)?.class ?? ''),
    rangeUi: boardRangeUi(),
    icons: boardIcons(),
    tips: boardTips((id) => team().find((h) => h.id === id)),
    move: (id, cell) => {
      cellsOf[side()] = previewMove(cellsOf[side()]!, id, cell);
    },
  };
};

// ---- sayfa durumu
const root = document.getElementById('ui-root')!;
const stage = document.getElementById('stage')!;
const CTXS: Record<Page, Array<[string, string]>> = {
  formation: [['campaign', 'Campaign'], ['qb', 'Quick Battle'], ['endless', 'Endless']],
  hero: [['choose', 'Choose hero'], ['company', 'Company'], ['endless', 'Endless roster']],
};
const defCtx = (p: Page): string => CTXS[p][p === 'formation' ? 1 : 0]![0];
let page: Page = 'formation';
let opt: Opt = 'A';
let ctx = '';
const readHash = (): void => {
  const p = location.hash.replace('#', '').split('/');
  page = p[0] === 'hero' ? 'hero' : 'formation';
  opt = p[1] === 'B' ? 'B' : 'A';
  ctx = CTXS[page].some(([k]) => k === p[2]) ? p[2]! : defCtx(page);
};
readHash();

const CAP: Record<string, string> = {
  'formation/A': 'A: tek tahta + sağda kahraman kartı. Campaign, Quick Battle (Player / Enemy sekmesi) ve Endless (altta kahraman şeridi) aynı gerçek bileşen.',
  'formation/B': 'B: Quick Battle iki takımı yan yana gösterir (aynı gerçek tahta, küçültülmüş), kart yok; kahraman bilgisi tek satır. Campaign ve Endless A ile aynı.',
  'hero/A': 'A: tek kart boyutu: gerçek Formation kahraman kartı her yerde (seçim, bölük, Endless) aynı kart; yalnızca ölçek değişir.',
  'hero/B': 'B: kart + küçük plaka: listelerde gerçek portre çerçevesi + sınıf noktası + isim; üstüne gel / tıkla, gerçek kart açılır.',
};

let cleanup: Array<() => void> = [];
const clear = (): void => {
  cleanup.forEach((f) => f());
  cleanup = [];
  document.querySelectorAll('.fbw, .uu-scrim, .uu-pop').forEach((n) => n.remove());
  document.querySelectorAll('.tt-tip, .gr-sktip-fl').forEach((n) => n.remove());
};

const gu = (): number => Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
const setGu = (): void => document.documentElement.style.setProperty('--gu', `${gu()}px`);
setGu();
window.addEventListener('resize', setGu);

// ---- ust cubuk
const bar = document.createElement('div');
bar.className = 'uu-bar';
const tag = document.createElement('div');
tag.className = 'uu-tag';
tag.textContent = 'MOCKUP';
document.body.append(bar, tag);
const btn = (label: string, on: boolean, fn: () => void, cls = ''): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `el-btn sm${on ? ' primary' : ''} ${cls}`;
  b.textContent = label;
  b.addEventListener('click', fn);
  return b;
};
const renderBar = (): void => {
  bar.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'uu-row';
  const sep = (): HTMLElement => Object.assign(document.createElement('i'), { className: 'sep' });
  row.append(btn('Formation', page === 'formation', () => go('formation', opt, '')), btn('Hero cards', page === 'hero', () => go('hero', opt, '')), sep());
  row.append(btn('A', opt === 'A', () => go(page, 'A', ctx)), btn('B', opt === 'B', () => go(page, 'B', ctx)), sep());
  for (const [k, label] of CTXS[page]) row.append(btn(label, ctx === k, () => go(page, opt, k)));
  if (page === 'formation') {
    row.append(sep());
    const a = document.createElement('a');
    a.href = '/';
    a.target = '_blank';
    a.className = 'el-btn sm';
    a.style.textDecoration = 'none';
    a.textContent = 'Current game (Play > Quick Battle)';
    row.append(a);
  }
  const cap = document.createElement('div');
  cap.className = 'uu-cap';
  cap.textContent = CAP[`${page}/${opt}`] ?? '';
  bar.append(row, cap);
};

function go(p: Page, o: Opt, c: string): void {
  page = p;
  opt = o;
  ctx = CTXS[p].some(([k]) => k === c) ? c : defCtx(p);
  history.replaceState(null, '', `#${page}/${opt}/${ctx}`);
  render();
}

// ---- yardimcilar
const tileEl = (cls: string, ord?: number): HTMLButtonElement => {
  const def = content.classes[cls]!;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cw-pc uu-tile';
  b.dataset['cls'] = cls;
  b.innerHTML = `<img src="${avatarUrl(cls) ?? ''}" alt="" draggable="false"><i class="uu-dot" style="background:${def.color}"></i>${ord ? `<span class="ord">${ord}</span>` : ''}<span class="dm"></span><span class="nm">${def.name}</span>`;
  return b;
};

/** Gercek formation kahraman karti: tahta bilesenini yalnizca panel gorunecek sekilde (CSS) kurar; ipuclari / stat kutulari gercek. */
function realCard(host: HTMLElement, cls: string, scale: number): void {
  const s = src(cls, 'c');
  const inner = document.createElement('div');
  inner.className = 'uu-in uu-v';
  inner.style.transform = `scale(${scale})`;
  host.style.width = `${550 * scale}px`;
  host.style.height = `${580 * scale}px`;
  host.append(inner);
  const b = mountFormationBoard(inner, {
    heroes: () => { const b = bh(s); return b ? [b] : []; },
    cells: () => [s.id],
    hintsFor: () => [],
    rangeUi: boardRangeUi(),
    icons: boardIcons(),
    tips: boardTips(() => s),
    move: () => undefined,
  });
  cleanup.push(() => b.destroy());
}

/** Seritteki kahramana tiklayinca tahtada o kahramani secer (gercek hucre tiklamasi taklit edilir). */
function pickCell(b: FormationBoard, heroId: string): void {
  const slot = cellsOf['p']!.indexOf(heroId);
  const cell = b.el.querySelector<HTMLElement>(`.fb-cell[data-slot="${slot}"]`);
  if (!cell) return;
  const r = cell.getBoundingClientRect();
  const o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 7, pointerType: 'mouse', button: 0 };
  cell.dispatchEvent(new PointerEvent('pointerdown', o));
  document.dispatchEvent(new PointerEvent('pointerup', o));
}

// ---- Formation
function renderFormation(): void {
  stage.style.backgroundImage = `url(${ctx === 'campaign' ? bgTown : bgSunset})`;
  const side = { cur: 'p' };
  const base = () => ({
    ...opts(() => side.cur),
    auto: () => {
      cellsOf[side.cur] = cellsOf[side.cur]!.slice().reverse();
    },
    done: () => undefined,
  });
  if (ctx === 'campaign') {
    const w = openFormationWindow({ ...base(), details: () => undefined, subtitle: 'The front row faces the enemy.' });
    cleanup.push(() => w.board.destroy());
    return;
  }
  if (ctx === 'endless') {
    const w = openFormationWindow({ ...base(), title: 'Choose your company', subtitle: 'Drag heroes to set their places. They keep them all run.', back: () => undefined, doneLabel: 'Start Run', details: () => undefined });
    w.board.el.closest('.fbw')!.classList.add('uu-hidehow');
    const strip = document.createElement('div');
    strip.className = 'uu-strip uu-v';
    player.forEach((h, i) => {
      const t = tileEl(h.class, i + 1);
      t.addEventListener('click', () => pickCell(w.board, h.id));
      strip.append(t);
    });
    w.board.el.append(strip);
    cleanup.push(() => w.board.destroy());
    return;
  }
  if (opt === 'A') {
    const w = openFormationWindow({ ...base(), title: 'Quick Battle', subtitle: ' ', back: () => undefined, doneLabel: 'Start Battle', details: () => undefined });
    const tabs = document.createElement('div');
    tabs.className = 'uu-tabs';
    const draw = (): void => {
      tabs.innerHTML = '';
      tabs.append(
        btn('Player', side.cur === 'p', () => {
          side.cur = 'p';
          w.board.refresh();
          draw();
        }, 'dlg'),
        btn('Enemy', side.cur === 'e', () => {
          side.cur = 'e';
          w.board.refresh();
          draw();
        }, 'dlg'),
      );
    };
    draw();
    w.board.el.closest('.fbw-win')!.append(tabs);
    cleanup.push(() => w.board.destroy());
    return;
  }
  // B: iki tahta yan yana (ayni gercek bilesen, CSS olcek)
  const w = openFormationWindow({ ...base(), title: 'Quick Battle', subtitle: ' ', back: () => undefined, doneLabel: 'Start Battle' });
  const ov = w.board.el.closest('.fbw') as HTMLElement;
  ov.classList.add('uu-two');
  const body = w.board.el.parentElement!;
  w.board.el.classList.add('p1');
  const b2 = mountFormationBoard(body, opts(() => 'e'));
  b2.el.classList.add('p2');
  const winEl = ov.querySelector('.fbw-win')!;
  for (const [txt, left] of [['Player', 70], ['Enemy', 1010]] as const) {
    const l = document.createElement('div');
    l.className = 'uu-lbl';
    l.style.left = `${left + 120}px`;
    l.textContent = txt;
    winEl.append(l);
  }
  const attachInfo = (b: FormationBoard, sideKey: string): void => {
    const info = document.createElement('div');
    info.className = 'uu-one';
    b.el.append(info);
    const icons = boardIcons();
    const upd = (): void => {
      const sel = b.el.querySelector<HTMLElement>('.fb-cell.sel');
      const cells = cellsOf[sideKey]!;
      const id = sel ? cells[Number(sel.dataset['slot'])] : cells.find((c) => c);
      const h = teamOf(sideKey)
        .flatMap((x) => (x.id === id ? (bh(x) ?? []) : []))
        .at(0);
      if (!h) {
        info.innerHTML = '';
        return;
      }
      const st = (k: 'str' | 'dex' | 'int' | 'luck', n: string): string => `<span class="st"><img src="${icons[k]}" alt="">${n} ${Math.round(h.attr[k])}</span>`;
      info.innerHTML = `<div class="fb-ico" style="--is:56px"><img src="${h.avatar}" alt="" draggable="false"></div><b>${h.name}</b><span class="fb-chip">${h.role}</span>${st('str', 'STR')}${st('dex', 'DEX')}${st('int', 'INT')}${st('luck', 'LCK')}`;
    };
    new MutationObserver(upd).observe(b.el.querySelector('.fb-grid')!, { childList: true });
    upd();
  };
  attachInfo(w.board, 'p');
  attachInfo(b2, 'e');
  cleanup.push(() => w.board.destroy(), () => b2.destroy());
}

// ---- Hero cards
function renderHero(): void {
  stage.style.backgroundImage = `url(${ctx === 'company' ? bgTown : bgSunset})`;
  const scrim = document.createElement('div');
  scrim.className = 'uu-scrim';
  root.append(scrim);
  const pos = document.createElement('div');
  pos.className = 'uu-hero-pos fbw-pos uu-v';
  const win = document.createElement('div');
  win.className = 'fbw-win el-modal-panel';
  pos.append(win);
  scrim.append(pos);
  const placeWin = (): void => {
    const k = gu();
    pos.style.transform = `translate(-50%, -50%) scale(${k})`;
    pos.style.width = '1700px';
    pos.style.height = '880px';
    pos.style.top = `calc(50% + ${60 * k}px)`;
  };
  placeWin();
  window.addEventListener('resize', placeWin);
  cleanup.push(() => window.removeEventListener('resize', placeWin));
  const titles: Record<string, [string, string]> = {
    choose: ['Choose a companion', 'Choose one hero to walk north with you. You still lead the company.'],
    company: ['Your company', 'Four heroes march together. The first leads the company.'],
    endless: ['Choose your company', 'Pick 4 heroes from the pool. They start at level 1 with no gear.'],
  };
  win.innerHTML = `<div class="uu-ttl">${titles[ctx]![0]}</div><div class="uu-sub">${titles[ctx]![1]}</div>`;
  const foot = document.createElement('div');
  foot.className = 'uu-foot';
  foot.innerHTML = `<button type="button" class="el-btn dlg primary">${ctx === 'choose' ? 'Set out' : ctx === 'company' ? 'Formation' : 'Start Run'}</button>`;
  win.append(foot);
  const picked = new Set<string>(ctx === 'choose' ? ['defender'] : ['defender', 'warrior', 'skald', 'archer']);
  const company = ['defender', 'warrior', 'skald', 'archer'];

  const sec = (txt: string, top: number): void => {
    const s = document.createElement('div');
    s.className = 'uu-sec';
    s.style.top = `${top}px`;
    s.textContent = txt;
    win.append(s);
  };
  const row = (top: number, wrap = false): HTMLElement => {
    const r = document.createElement('div');
    r.className = `uu-scroll${wrap ? ' wrap' : ''}`;
    r.style.top = `${top}px`;
    win.append(r);
    return r;
  };

  if (opt === 'A') {
    const cardRow = (host: HTMLElement, list: string[], scale: number, numbered: boolean): void => {
      list.forEach((cls, i) => {
        const c = document.createElement('div');
        c.className = `uu-card${picked.has(cls) ? ' sel' : ''}`;
        realCard(c, cls, scale);
        if (numbered) c.insertAdjacentHTML('beforeend', `<span class="uu-ord">${i + 1}</span>`);
        else
          c.addEventListener('click', () => {
            if (ctx === 'choose') picked.clear();
            if (picked.has(cls)) picked.delete(cls);
            else picked.add(cls);
            host.querySelectorAll('.uu-card').forEach((n, j) => n.classList.toggle('sel', picked.has(list[j]!)));
          });
        host.append(c);
      });
    };
    if (ctx === 'company') {
      sec('Company', 120);
      const r = row(150);
      r.style.justifyContent = 'center';
      r.style.gap = '24px';
      cardRow(r, company, 0.66, true);
    } else if (ctx === 'choose') {
      sec('Companions', 120);
      cardRow(row(150), ORDER, 0.55, false);
    } else {
      sec('Heroes', 114);
      cardRow(row(138), ORDER, 0.5, false);
      sec('Your company  4 / 4', 462);
      cardRow(row(486), company, 0.5, true);
    }
    return;
  }
  // B: kart + plaka
  const pop = document.createElement('div');
  pop.className = 'uu-pop uu-v';
  pop.style.display = 'none';
  document.body.append(pop);
  let pinned = '';
  let shown = '';
  const hide = (): void => {
    pop.style.display = 'none';
    pop.innerHTML = '';
    shown = '';
  };
  const show = (t: HTMLElement, cls: string): void => {
    if (shown === cls) return;
    hide();
    shown = cls;
    realCard(pop, cls, 1);
    pop.style.display = '';
    const r = t.getBoundingClientRect();
    const x = Math.max(8, Math.min(window.innerWidth - 558, r.left + r.width / 2 - 275));
    let y = r.top - 592;
    if (y < 8) y = Math.min(window.innerHeight - 588, r.bottom + 12);
    pop.style.left = `${x}px`;
    pop.style.top = `${Math.max(8, y)}px`;
  };
  const wire = (t: HTMLElement, cls: string): void => {
    t.addEventListener('pointerenter', () => show(t, cls));
    t.addEventListener('pointerleave', () => {
      if (pinned !== cls) hide();
    });
    t.addEventListener('click', () => {
      if (pinned === cls) {
        pinned = '';
        hide();
      } else {
        pinned = cls;
        show(t, cls);
      }
    });
  };
  const onDoc = (e: PointerEvent): void => {
    if (!(e.target as HTMLElement).closest('.uu-tile, .uu-pop')) {
      pinned = '';
      hide();
    }
  };
  document.addEventListener('pointerdown', onDoc);
  cleanup.push(() => document.removeEventListener('pointerdown', onDoc), hide);
  const tiles = (host: HTMLElement, list: string[], numbered: boolean): void => {
    host.style.justifyContent = 'center';
    list.forEach((cls, i) => {
      const t = tileEl(cls, numbered ? i + 1 : undefined);
      if (picked.has(cls) && !numbered) t.classList.add('sel');
      wire(t, cls);
      host.append(t);
    });
  };
  const hint = (txt: string, top: number): void => {
    const h = document.createElement('div');
    h.className = 'uu-hint';
    h.style.top = `${top}px`;
    h.textContent = txt;
    win.append(h);
  };
  if (ctx === 'company') {
    sec('Company', 200);
    tiles(row(230), company, true);
    hint('Hover or click a tile to open the hero card.', 420);
  } else if (ctx === 'choose') {
    sec('Companions', 200);
    tiles(row(230, true), ORDER, false);
    hint('Hover or click a tile to open the hero card.', 560);
  } else {
    sec('Heroes', 150);
    tiles(row(180, true), ORDER, false);
    sec('Your company  4 / 4', 440);
    tiles(row(470), company, true);
  }
}

function render(): void {
  clear();
  renderBar();
  if (page === 'formation') renderFormation();
  else renderHero();
}
window.addEventListener('hashchange', () => {
  readHash();
  render();
});
render();
