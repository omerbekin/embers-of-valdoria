/**
 * DİZİLİM TAHTASI (Ömer 2026-10-18, Formation A seçildi; taslak public/mockups/formation.html#a). ORTAK, düz veriyle beslenen DOM bileşeni:
 * 4x3 ızgara + her hücrede menzil uygunluk rengi + hücre üstüne gelince Band ipucu + sağda kahraman paneli (Passive İLK, sonra 2x2 skill).
 * Şimdi sefer Formation penceresinde (src/game/campaign-panels.ts); Quick Battle ve Multiplayer hazırlık ekranları da bunu kullanacak.
 * Bileşen motoru / ilerlemeyi BİLMEZ: kahramanlar `FormationBoardHero` olarak, dizilim ipucu `hintsFor` ile verilir
 * (src/ui/formation-board-data.ts: engine/formation-hints.ts + ilerleme verisi köprüsü). Kurallar (dokun / sürükle / takas): formation-board-rules.ts.
 * Sürükleme fare + dokunma (tek işaretçi olayları); görünüm formation-board.css. Mantıksal ölçü 1360x600; kabuk ölçekler (openFormationWindow).
 * Oyun içi metinler İngilizce.
 */
import './formation-board.css';
import './elegant.css';
import { bandTipHtml } from './band-tip';
import { dismissOnBackdrop } from './backdrop';
import { closeDom } from './motion';
import { lockInput, unlockInput } from './input-lock';
import type { BandTipSpec } from './band-tip';
import { uiSound } from './ui-sound';
import { LANES, ROWS, clientToLocal, dropOnCell, fitAccent, fitOfHint, previewMove, reachBarHtml, reachRows, reachText, rowName, rowOfCell, tapCell, type BoardSel, type Fit } from './formation-board-rules';

export type BoardAttr = 'str' | 'dex' | 'int' | 'luck';

export interface BoardSkill {
  /** Skill kimliği (ipucu için). */
  id?: string;
  name: string;
  icon: string;
  /** Bedel çipi: free = 'Free'; rage = 'Rage N'; mp / hp = ikon (mp) + sayı. `text` sayı / yüzde. */
  cost: { kind: 'free' | 'rage' | 'mp' | 'hp'; text?: string };
}

/** Tahtanın bir kahramanı (düz veri; motor / ilerleme türü yok). */
export interface FormationBoardHero {
  id: string;
  name: string;
  role: string;
  /** Ana menzil (null = global). */
  range: number | null;
  primary: BoardAttr;
  level: number;
  hp: number;
  hpRatio: number;
  mp: number;
  attr: Record<BoardAttr, number>;
  /** Portre (kare) adresi; yoksa boş (yer tutucu çerçeve). */
  avatar: string;
  leader?: boolean;
  /** Pasif HER ZAMAN skill'lerin önünde gösterilir. */
  passive?: { name: string; icon: string };
  /** En çok 4 skill (veri sırası). */
  skills: BoardSkill[];
}

/** Bir hücrenin ipucu girdisi: dizinler hücre; `undefined` = uygun. Yalnızca `kind` okunur (engine PlacementHint uyar). */
export type BoardHint = { kind: 'outOfReach' | 'exposed' } | undefined;

export interface FormationBoardOpts {
  /** Dizilimdeki kahramanlar (yalnızca hücrelere yerleşmiş olanlar çizilir). */
  heroes: () => readonly FormationBoardHero[];
  /** 12 hücre: kahraman id'si ya da '' (hücre = sıra * 3 + şerit). */
  cells: () => readonly string[];
  /** Hücre listesi için hücre başına dizilim ipucu (motor kuralı). Menzil arayüzü kapalıysa verilmez / boş döner. */
  hintsFor: (cells: string[]) => BoardHint[];
  /** Menzil arayüzü (Range çipi, hücre renkleri, hover kutusu) açık mı (`range.enabled`). */
  rangeUi: boolean;
  /** Kahramanı hücreye taşı (doluysa yer değiştirir). Tahta ardından kendini yeniden çizer. */
  move: (heroId: string, cell: number) => void;
  /** "Hero details" (verilmezse düğme yok). */
  details?: (heroId: string) => void;
  /**
   * Kart ipuçları (hover; dokunmatikte tek dokunuş): skill / pasif satırı = oyundaki ortak skill ipucu (Gear skill çubuğuyla aynı), stat kutusu =
   * ortak stat ipucu (A Band, Gear stat paneliyle aynı). Verilmezse ipucu yok.
   */
  tips?: {
    /** Skill ipucunu `anchor` satırının yanında açar (ekran sınırları içinde); pasifte key = 'passive'. */
    showSkill: (anchor: HTMLElement, heroId: string, key: string) => void;
    hideSkill: () => void;
    /** Stat ipucunun içeriği; yoksa null. */
    stat: (heroId: string, attr: BoardAttr) => BandTipSpec | null;
  };
  /** Stat / bedel ikonları. */
  icons: Record<'hp' | 'mp' | BoardAttr, string>;
  /** Izgara altındaki kullanım yazısı (verilmezse varsayılan). */
  howText?: string;
}

export interface FormationBoard {
  el: HTMLElement;
  /** Dışarıda dizilim değişti (Auto arrange gibi): yeniden çiz. */
  refresh: () => void;
  destroy: () => void;
}

// ---- yerleşim (tahta yerel mantıksal px; kabuk 1360x820 pencerede tahtayı (0,134)'e koyar)
const C = 128;
const GAP = 10;
const GX = 120;
const GY = 16;
export const BOARD_W = 1360;
export const BOARD_H = 600;
const DRAG_PX = 10;

const NAMES: Record<BoardAttr, string> = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence', luck: 'Luck' };
const ORDER: BoardAttr[] = ['str', 'dex', 'int', 'luck'];
const HOW = 'Click a hero to select it, then click an empty cell to move it there. Drag a hero onto another hero to swap them. Hover a cell to see how far the selected hero reaches from there.';
const HOW_PLAIN = 'Click a hero to select it, then click an empty cell to move it there. Drag a hero onto another hero to swap them.';
// dokunmatik (telefon): "Click / Hover" yerine dokunma dili
const HOW_TOUCH = 'Tap a hero to select it, then tap an empty cell to move it there. Drag a hero onto another hero to swap them. Tap a cell to see how far the selected hero reaches from there.';
const HOW_PLAIN_TOUCH = 'Tap a hero to select it, then tap an empty cell to move it there. Drag a hero onto another hero to swap them.';
const isTouchUi = (): boolean => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false);

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const num = (v: number): string => (Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toFixed(1));
const cellPos = (cell: number): { x: number; y: number } => ({ x: GX + (ROWS - 1 - rowOfCell(cell)) * (C + GAP), y: GY + (cell % LANES) * (C + GAP) });
const hpCls = (r: number): string => (r > 0.6 ? '' : r > 0.3 ? 'mid' : 'low');
const hpCol = (r: number): string => (r > 0.6 ? 'var(--fb-good)' : r > 0.3 ? '#d9b24a' : '#c4553f');
const img = (url: string): string => (url ? `<img src="${esc(url)}" alt="" draggable="false">` : '');

const CROWN =
  '<svg class="fb-crown" viewBox="-16 -12 32 24"><polygon points="-14,8 -14,-6 -7,1 0,-10 7,1 14,-6 14,8" fill="#2a1d10" stroke="#f3d999" stroke-width="1.6"/><circle cx="0" cy="3" r="2.6" fill="#e0702a"/></svg>';

export function mountFormationBoard(host: HTMLElement, o: FormationBoardOpts): FormationBoard {
  const root = document.createElement('div');
  root.className = 'fb';
  host.append(root);
  const st: BoardSel = { sel: '', moved: '' };
  let drag: { id: string; ghost: HTMLElement } | null = null;
  let down: { slot: number; id: string; x: number; y: number; pid: number } | null = null;
  let over = -1;
  let tip: HTMLElement | null = null;
  let tipTimer = 0;
  let destroyed = false;

  const heroOf = (id: string): FormationBoardHero | undefined => (id ? o.heroes().find((h) => h.id === id) : undefined);
  const focus = (): FormationBoardHero | undefined => {
    const team = o.heroes().filter((h) => o.cells().includes(h.id));
    return heroOf(st.sel) ?? heroOf(st.moved) ?? team.find((h) => h.leader) ?? team[0];
  };
  /** Önizlenen kahraman: sürüklenen, yoksa seçili. */
  const subject = (): string => drag?.id ?? st.sel;

  // ---- uygunluk (motor ipucundan): kahraman `id` hücre `cell`'e konursa
  const fitCache = new Map<string, Fit>();
  const fitAt = (id: string, cell: number): Fit => {
    const key = `${id}@${cell}`;
    const hit = fitCache.get(key);
    if (hit) return hit;
    const next = previewMove(o.cells(), id, cell);
    const f = fitOfHint(o.hintsFor(next)[next.indexOf(id)]);
    fitCache.set(key, f);
    return f;
  };

  // ---- ızgara
  const gridHtml = (): string => {
    const cells = o.cells();
    const subj = o.rangeUi ? subject() : '';
    const hints = o.rangeUi ? o.hintsFor(cells.slice()) : [];
    let out = '';
    for (let slot = 0; slot < cells.length; slot++) {
      const id = cells[slot] ?? '';
      const h = heroOf(id);
      const row = rowOfCell(slot);
      const p = cellPos(slot);
      let cls = 'fb-cell' + (h ? '' : ' empty') + (row === 0 && !h ? ' fr' : '') + (h && id === st.sel ? ' sel' : '') + (drag && drag.id === id ? ' src' : '');
      let inner = '';
      if (subj && heroOf(subj)) {
        const f = fitAt(subj, slot);
        cls += ` fit-${f}`;
        inner += '<i class="fb-pdot"></i>';
        if (drag && over === slot) cls += ' hot';
      } else if (h && hints[slot]) {
        cls += ` fit-${fitOfHint(hints[slot])} own`;
        inner += '<i class="fb-pdot"></i>';
      }
      if (h) inner += `${img(h.avatar).replace('<img ', '<img class="fb-av" ')}<div class="fb-nm">${esc(h.name)}</div><div class="fb-hp"><i class="${hpCls(h.hpRatio)}" style="width:${Math.round(h.hpRatio * 100)}%"></i></div>${h.leader ? CROWN : ''}`;
      out += `<div class="${cls}" data-slot="${slot}" role="button" aria-label="${esc(h ? `${h.name}, ${rowName(row)}` : `Empty cell, ${rowName(row)}`)}" style="left:${p.x - GX}px;top:${p.y - GY}px">${inner}</div>`;
    }
    return out;
  };

  // ---- sağ panel
  const costChip = (c: BoardSkill['cost']): string => {
    if (c.kind === 'free') return '<span class="fb-chip free">Free</span>';
    if (c.kind === 'rage') return `<span class="fb-chip rage">Rage <b>${esc(c.text ?? '')}</b></span>`;
    if (c.kind === 'hp') return `<span class="fb-chip">HP <b>${esc(c.text ?? '')}</b></span>`;
    return `<span class="fb-chip">${img(o.icons.mp)}<b>${esc(c.text ?? '')}</b></span>`;
  };
  const panelHtml = (): string => {
    const f = focus();
    if (!f) return '';
    const slot = o.cells().indexOf(f.id);
    const rowTxt = slot >= 0 ? rowName(rowOfCell(slot)) : '';
    const chips = `<div class="fb-chips"><span class="fb-chip">${esc(f.role)}</span>${o.rangeUi ? `<span class="fb-chip hot">Range <b>${f.range === null ? 'Global' : f.range}</b></span>` : ''}${rowTxt ? `<span class="fb-chip">${esc(rowTxt)}</span>` : ''}</div>`;
    const head = `<div class="fb-chd"><div class="fb-ico" style="--is:84px">${img(f.avatar)}</div><div class="fb-apt"><div class="fb-nmt"><span class="t">${esc(f.name)}</span><span class="lv"><i>Lv</i>${f.level}</span></div>${chips}</div></div>`;
    const bars = `<div class="fb-bars"><div class="fb-bar2">${img(o.icons.hp)}<div class="bb"><i style="width:${Math.round(f.hpRatio * 100)}%;background:${hpCol(f.hpRatio)}"></i></div><span class="v">${Math.round(f.hp * f.hpRatio)}</span></div><div class="fb-bar2">${img(o.icons.mp)}<div class="bb"><i style="width:100%;background:#4a8fd0"></i></div><span class="v">${Math.round(f.mp)}</span></div></div>`;
    const tiles = ORDER.map((k) => `<div class="fb-tile ${f.primary === k ? 'p' : ''}" data-attr="${k}">${img(o.icons[k])}<div class="tx"><span class="n">${num(f.attr[k])}</span><span class="k">${NAMES[k]}</span></div></div>`).join('');
    const pas = f.passive ? `<div class="fb-srow pas" data-skill="passive"><div class="fb-ico sm sk" style="--is:44px">${img(f.passive.icon)}</div><div class="pn">${esc(f.passive.name)}</div><span class="fb-ptag">Passive</span></div>` : '';
    const sk = f.skills.map((s) => `<div class="fb-srow ${s.cost.kind === 'rage' ? 'rg' : ''}" data-skill="${esc(s.id ?? s.name)}"><div class="fb-ico sm sk" style="--is:44px">${img(s.icon)}</div><div class="pn">${esc(s.name)}</div>${costChip(s.cost)}</div>`).join('');
    const foot = o.details ? '<div class="fb-foot"><button type="button" class="el-btn fb-details" data-act="details">Hero details</button></div>' : '<div class="fb-foot"></div>';
    return `${head}${bars}<div class="fb-tiles">${tiles}</div><div class="fb-sl">Skills</div><div class="fb-srows">${pas}${sk}</div>${foot}`;
  };

  let gridEl: HTMLElement;
  let panelEl: HTMLElement;
  const build = (): void => {
    root.innerHTML = `<div class="fb-lbl back">Back</div><div class="fb-lbl front">Front ▸</div><div class="fb-grid"></div><div class="fb-how">${esc(o.howText ?? (isTouchUi() ? (o.rangeUi ? HOW_TOUCH : HOW_PLAIN_TOUCH) : o.rangeUi ? HOW : HOW_PLAIN))}</div><div class="fb-panel"></div>`;
    gridEl = root.querySelector('.fb-grid') as HTMLElement;
    panelEl = root.querySelector('.fb-panel') as HTMLElement;
  };
  const drawGrid = (): void => {
    gridEl.innerHTML = gridHtml();
  };
  const drawPanel = (): void => {
    panelEl.innerHTML = panelHtml();
  };
  const redraw = (): void => {
    fitCache.clear();
    drawGrid();
    drawPanel();
  };

  // ---- hover kutusu (Band dili: vurgu kenarı, ad + sıra, menzil cümlesi, 4 sıra çubuğu)
  let panelTipFor: HTMLElement | null = null;
  const hideTip = (): void => {
    o.tips?.hideSkill();
    panelTipFor = null;
    window.clearTimeout(tipTimer);
    tip?.remove();
    tip = null;
  };
  const showTip = (cell: number): void => {
    hideTip();
    if (!o.rangeUi || cell < 0) return;
    const cells = o.cells();
    const occ = cells[cell] ?? '';
    const who = heroOf(drag?.id ?? '') ?? heroOf(st.sel) ?? heroOf(occ) ?? focus();
    if (!who) return;
    const here = cells[cell] === who.id;
    const fit = here ? fitOfHint(o.hintsFor(cells.slice())[cell]) : fitAt(who.id, cell);
    const n = reachRows(who.range, rowOfCell(cell));
    const accent = fitAccent(n, fit);
    const bars = reachBarHtml(n);
    const lines = [{ text: reachText(n), ...(n <= 0 ? { color: '#ffb7a6' } : {}) }, ...(fit === 'weak' ? [{ text: 'Exposed in front', color: '#f3d08a' }] : [])];
    const el = document.createElement('div');
    el.className = 'fb-tip';
    el.innerHTML = bandTipHtml({ accent, kind: here ? 'Current position' : 'If moved here', title: `${who.name} · ${rowName(rowOfCell(cell))}`, ...(who.avatar ? { icon: who.avatar, iconShape: 'round' as const } : {}), lines, bodyHtml: bars, noKeywords: true });
    root.append(el);
    const p = cellPos(cell);
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    let x = p.x + C * 0.55;
    let y = p.y + C * 0.7;
    if (y + th > BOARD_H - 4) y = p.y - th - 8;
    x = Math.max(4, Math.min(BOARD_W - tw - 4, x));
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(Math.max(4, y))}px`;
    tip = el;
  };

  // ---- sürükleme
  const rotated0 = (): boolean => document.documentElement.classList.contains('rotated');
  // kart ipuçları: skill satırı (ortak skill ipucu) ve stat kutusu (ortak stat ipucu, Band)
  const showPanelTip = (t: HTMLElement): void => {
    const f = focus();
    if (!o.tips || !f || drag) return;
    if (panelTipFor === t) return;
    hideTip();
    if (t.dataset['skill'] !== undefined) {
      o.tips.showSkill(t, f.id, t.dataset['skill']);
      panelTipFor = t;
      return;
    }
    const attr = t.dataset['attr'] as BoardAttr | undefined;
    const spec = attr ? o.tips.stat(f.id, attr) : null;
    if (!spec) return;
    const el = document.createElement('div');
    el.className = 'fb-tip';
    el.innerHTML = bandTipHtml(spec);
    root.append(el);
    const r = t.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    const a = clientToLocal(r.left, r.top, box, root.offsetWidth, rotated0());
    const b = clientToLocal(r.right, r.bottom, box, root.offsetWidth, rotated0());
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    let y = Math.min(a.y, b.y) - th - 8;
    if (y < 4) y = Math.max(a.y, b.y) + 8;
    const x = Math.max(4, Math.min(BOARD_W - tw - 4, (a.x + b.x) / 2 - tw / 2));
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(Math.max(4, Math.min(BOARD_H - th - 4, y)))}px`;
    tip = el;
    panelTipFor = t;
  };
  const rotated = (): boolean => document.documentElement.classList.contains('rotated');
  const local = (cx: number, cy: number): { x: number; y: number } => clientToLocal(cx, cy, root.getBoundingClientRect(), root.offsetWidth, rotated());
  const cellAtPoint = (cx: number, cy: number): number => {
    const t = document.elementFromPoint(cx, cy)?.closest<HTMLElement>('.fb-cell');
    return t && root.contains(t) ? Number(t.dataset['slot']) : -1;
  };
  const moveGhost = (cx: number, cy: number): void => {
    if (!drag) return;
    const p = local(cx, cy);
    drag.ghost.style.left = `${p.x - 56}px`;
    drag.ghost.style.top = `${p.y - 56}px`;
  };
  const doMove = (m: { id: string; cell: number } | undefined): void => {
    if (!m) return;
    uiSound('snap');
    o.move(m.id, m.cell);
  };

  const onMove = (e: PointerEvent): void => {
    if (!down || e.pointerId !== down.pid) return;
    if (!drag && down.id && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_PX) {
      const h = heroOf(down.id);
      const ghost = document.createElement('div');
      ghost.className = 'fb-ghost';
      ghost.innerHTML = h ? img(h.avatar) : '';
      root.append(ghost);
      drag = { id: down.id, ghost };
      over = cellAtPoint(e.clientX, e.clientY);
      drawGrid();
    }
    if (drag) {
      moveGhost(e.clientX, e.clientY);
      const c = cellAtPoint(e.clientX, e.clientY);
      if (c !== over) {
        over = c;
        gridEl.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'));
        if (c >= 0) gridEl.querySelector(`[data-slot="${c}"]`)?.classList.add('hot');
        showTip(c);
      }
    }
  };
  const stopDrag = (): void => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
  };
  const onUp = (e: PointerEvent): void => {
    if (!down || e.pointerId !== down.pid) return;
    const d = down;
    down = null;
    stopDrag();
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (drag) {
      const id = drag.id;
      drag.ghost.remove();
      drag = null;
      over = -1;
      hideTip();
      const r = dropOnCell(o.cells(), id, cell);
      st.sel = r.st.sel;
      if (r.st.moved) st.moved = r.st.moved;
      doMove(r.move);
      redraw();
      return;
    }
    if (cell < 0 || cell !== d.slot) return;
    const r = tapCell(o.cells(), st, cell);
    st.sel = r.st.sel;
    st.moved = r.st.moved;
    if (r.move) doMove(r.move);
    redraw();
    if (e.pointerType === 'touch') {
      showTip(cell);
      tipTimer = window.setTimeout(hideTip, 1800);
    } else showTip(cell);
  };
  const onCancel = (e: PointerEvent): void => {
    if (!down || e.pointerId !== down.pid) return;
    down = null;
    stopDrag();
    drag?.ghost.remove();
    drag = null;
    over = -1;
    hideTip();
    redraw();
  };

  const onDown = (e: PointerEvent): void => {
    if (e.button) return;
    const c = (e.target as HTMLElement).closest<HTMLElement>('.fb-cell');
    if (!c || !root.contains(c)) return;
    const slot = Number(c.dataset['slot']);
    down = { slot, id: o.cells()[slot] ?? '', x: e.clientX, y: e.clientY, pid: e.pointerId };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    if (e.pointerType === 'touch') showTip(slot);
  };
  const onHover = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' || drag) return;
    const pt = (e.target as HTMLElement).closest<HTMLElement>('.fb-tile[data-attr], .fb-srow[data-skill]');
    if (pt) {
      over = -1;
      showPanelTip(pt);
      return;
    }
    if (panelTipFor) hideTip();
    const c = (e.target as HTMLElement).closest<HTMLElement>('.fb-cell');
    const slot = c ? Number(c.dataset['slot']) : -1;
    if (slot === over) return;
    over = slot;
    showTip(slot);
  };
  const onLeave = (): void => {
    if (drag) return;
    over = -1;
    hideTip();
  };
  const onClick = (e: MouseEvent): void => {
    // dokunmatik: satıra / kutuya tek dokunuş ipucunu açar (aynısına tekrar dokunmak kapatır)
    const pt = (e.target as HTMLElement).closest<HTMLElement>('.fb-tile[data-attr], .fb-srow[data-skill]');
    if (pt && isTouchUi()) {
      if (panelTipFor === pt) hideTip();
      else showPanelTip(pt);
      return;
    }
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-act="details"]');
    if (!a) return;
    const f = focus();
    if (f) o.details?.(f.id);
  };

  build();
  redraw();
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onHover);
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('click', onClick);

  return {
    el: root,
    refresh: () => {
      if (destroyed) return;
      const cells = o.cells();
      if (st.sel && !cells.includes(st.sel)) st.sel = '';
      hideTip();
      redraw();
    },
    destroy: () => {
      destroyed = true;
      stopDrag();
      hideTip();
      drag?.ghost.remove();
      root.remove();
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// PENCERE KABUĞU: 1360x820 mantıksal pencere (Phaser openModal ile aynı konum), başlık, alt düğmeler, zemine dokununca kapanma.
// Quick Battle / Multiplayer hazırlık ekranları kendi kabuklarında yalnızca `mountFormationBoard`ı kullanabilir.
// ---------------------------------------------------------------------------------------------------------------------

export interface FormationWindowOpts extends FormationBoardOpts {
  title?: string;
  subtitle?: string;
  /** Sol düğme (Back): verilirse zemine dokunmak / Esc bunu çağırır (Done yerine). */
  back?: () => void;
  auto: () => void;
  done: () => void;
  doneLabel?: string;
}

export interface FormationWindow {
  board: FormationBoard;
  close: () => void;
}

const BOARD_TOP = 134;
/** Kısa ekranda (html.short) pencerenin mantıksal boyutu; formation-board.css ile aynı. */
const SHORT_W = 1360;
const SHORT_H = 690;

export function openFormationWindow(o: FormationWindowOpts): FormationWindow {
  const host = document.getElementById('ui-root') ?? document.body;
  const overlay = document.createElement('div');
  overlay.className = 'fbw el-modal';
  const pos = document.createElement('div');
  pos.className = 'fbw-pos';
  const win = document.createElement('div');
  win.className = 'fbw-win el-modal-panel';
  win.innerHTML = `<div class="fbw-ttl">${esc(o.title ?? 'Formation')}</div><div class="fbw-sub">${esc(o.subtitle ?? 'The front row faces the enemy.')}</div><div class="fbw-body"></div><div class="fbw-btns">${o.back ? '<button type="button" class="el-btn" data-act="back">Back</button>' : ''}<button type="button" class="el-btn" data-act="auto">Auto arrange</button><button type="button" class="el-btn primary" data-act="done">${esc(o.doneLabel ?? 'Done')}</button></div>`;
  pos.append(win);
  overlay.append(pos);
  host.append(overlay);
  lockInput('formation');
  uiSound('open');

  const body = win.querySelector('.fbw-body') as HTMLElement;
  body.style.top = `${BOARD_TOP}px`;
  const board = mountFormationBoard(body, o);

  const place = (): void => {
    const gu = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gu')) || 1;
    if (document.documentElement.classList.contains('short')) {
      // telefon yatay: pencere kısa ekrana göre yeniden düzenlenir (formation-board.css > html.short) ve ekranı doldurur (yazılar okunur kalsın)
      const sc = Math.min((overlay.clientWidth * 0.98) / SHORT_W, (overlay.clientHeight * 0.97) / SHORT_H) || gu;
      pos.style.transform = `translate(-50%, -50%) scale(${sc})`;
      pos.style.top = '50%';
      return;
    }
    pos.style.transform = `translate(-50%, -50%) scale(${gu})`;
    pos.style.top = `calc(50% - ${10 * gu}px)`; // pencere 120..940: merkezi 530 (sahne ortası 540)
  };
  place();
  const onResize = (): void => {
    place();
    window.requestAnimationFrame(place); // viewport.ts ölçüyü bir kare sonra yazar
  };
  window.addEventListener('resize', onResize);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  ro?.observe(overlay);

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    window.removeEventListener('resize', onResize);
    ro?.disconnect();
    undismiss();
    board.destroy();
    unlockInput('formation');
    closeDom(overlay, () => overlay.remove());
  };
  const leave = (): void => (o.back ? o.back() : o.done());
  const undismiss = dismissOnBackdrop(overlay, (t) => win.contains(t), leave);
  win.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('.fbw-btns [data-act]')?.dataset['act'];
    if (a === 'back') o.back?.();
    else if (a === 'auto') {
      o.auto();
      board.refresh();
    } else if (a === 'done') o.done();
  });
  return { board, close };
}
