// Gear > Tree sekmesi (Faz 3b; Ömer'in seçtiği taslak public/mockups/skill-tree-gear.html#v4: "sade ağaç"). Sol: oyunun gerçek skill plakaları
// (pasif 1. sırada, ult en altta), yanlarında her satırın düğümleri; üstte Mastery bar; altta Respec / Reset / Confirm. Yan sütun, puan kutusu,
// düğüm adı, kademe kutusu YOK: sayılar ve kilitler üstüne gelince / dokununca A Band ipucunda. Sakin hareketler (puan, yol, kilit, evolve,
// Confirm / Reset, Blood Price damlası); Reduced motion = hareket yok.
// Kurallar ve kayıt: src/progression/skill-tree*.ts (çağrılır, burada yeniden yazılmaz); ekran durumu tree-tab-model.ts; yerleşim tree-tab-layout.ts.
// Gear'a bağı tek kanca: gear-screen.ts `createTreeTab(...)` (sekme düğmesi + sağ sayfaya render). Görünüm: tree-tab.css.
import './tree-tab.css';
import { content } from '../engine';
import { heroStats } from '../progression';
import { TREE_RULES, type TreeData, type TreeRules } from '../progression/skill-tree-data';
import { TREE_RESET_NOTICE, type TreeHero } from '../progression/skill-tree-hero';
import { counter, rowSpent, ultSpent, treeNodes, type TreeNode } from '../progression/skill-tree';
import { skillCostAmount } from '../engine/cost';
import type { SkillDef } from '../engine';
import { bandTipEl, type BandChip, type BandTipSpec } from './band-tip';
import { gearSkillRows, passiveTip, skillTip, classSkills } from './gear-skills';
import { escHtml } from './skill-bar';
import { skillIconName } from './mob-icons';
import { evolveNodeIconUrl, heroSkillIconUrl, nodeArtUrl, SAVE_TREE_MODE } from './evolve-icon';
import { evolvedRows, type EvolveSource } from '../progression/skill-tree-evolve';
import { ownerOfSkill, ownerOfUnit } from '../game/asset-versions';
import { iconUrl } from './dom-icons';
import { uiIconName } from './ui-icons';
import { RAGE_COLOR, STAT_COLOR, UI_COLOR, statIconName } from './stat-icons';
import { className } from './character-panel';
import { reducedMotion } from './motion-pref';
import { uiSound } from './ui-sound';
import type { HoverHero } from './gear-hover';
import {
  addPending,
  confirmAlloc,
  confirmBlocked,
  effective,
  freePoints,
  lockInfo,
  makeSession,
  nodeOf,
  nodeStatus,
  pendingCount,
  removePending,
  resetPending,
  respecInfo,
  stripState,
  treeTabEnabled,
  type TreeSession,
} from './tree-tab-model';
import { build, link, plateConfig, type Layout, type LayoutCfg } from './tree-tab-layout';

export type TreeTabHero = HoverHero & TreeHero;

export interface TreeTabCtx {
  overlay: HTMLElement;
  /** Seçili kahraman (Gear'ın curHero'su). */
  hero(): TreeTabHero | undefined;
  gold(): number;
  /** Onay (Gear kaynağı: setTree); geçersizse Error fırlatır. */
  setTree(heroId: string, alloc: { v: number; r: Record<string, number> }): void;
  /** Respec (Gear kaynağı: respecTree); geçersizse Error fırlatır. */
  respec(heroId: string): void;
  toast(text: string, ok?: boolean): void;
  /** Onay kutusu (Gear'ın confirmIn'i). */
  ask(text: string, ok: string, run: () => void, danger?: boolean): void;
  /** Gear'ı yeniden çizdirir (kaynak değişti). */
  rerender(): void;
}

export interface TreeTab {
  /** Ana şalter açık mı (kapalıyken Gear sekmeyi hiç çizmez). */
  enabled: boolean;
  button: HTMLButtonElement;
  /** Gear her başlık çiziminde: sekme açık mı + puan rozeti. */
  syncButton(on: boolean, points: number): void;
  /** Sağ sayfayı çizer (aynı kahraman / ölçü ise yeniden kurmadan günceller). */
  render(host: HTMLElement): void;
  destroy(): void;
  /** Açık düğüm ipucu var mı / kapat (Esc önce ipucunu kapatır). */
  tipOpen(): boolean;
  closeTip(): void;
}

const KN: Record<string, string> = { filler: 'Filler', edge: 'Edge', notable: 'Notable', blood: 'Blood Price', evolve: 'Evolve' };
const LOCK = '<svg viewBox="0 0 12 14"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"/></svg>';
const PL = '<svg class="pl" viewBox="0 0 12 14"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"/></svg>';
const DROP = '<svg class="drop" viewBox="0 0 32 38"><path class="bd" d="M16 2 C16 2 4 17 4 25 a12 12 0 0 0 24 0 C28 17 16 2 16 2Z"/><path class="bi" d="M11 26 h10"/></svg>';
const FX_CLASSES = ['anim-fill', 'anim-evolve', 'anim-reset', 'anim-confirm', 'anim-dim', 'anim-awaken', 'anim-evoready'];
const LVL: Record<string, number> = { '': 0, half: 1, pend: 2, on: 2 };

const noticed = new Set<string>();

/** Satır başına ikon / ad (pasif + 3 skill + ult). */
interface RowInfo {
  /** Satırın skill ikonu: evolve ONAYLIYSA evolve sanatı + animasyon işareti (src/ui/evolve-icon.ts); plaka, ipucu ve ult göbeğinde bu görünür. */
  icon: string;
  /** Normal skill ikonu (evolve olmayan düğümler / pasif): notable düğümleri bunu kullanır. */
  base: string;
  name: string;
  kind: '' | 'pas' | 'ult';
  skill?: SkillDef;
}

function rowInfos(tree: TreeData, hero?: EvolveSource): RowInfo[] {
  const def = content.classes[tree.class];
  const { skills } = classSkills(tree.class);
  const byId = (id: string): SkillDef | undefined => skills.find((s) => s.id === id) ?? content.skills[id];
  const sk = (id: string): string => {
    const s = byId(id);
    return s ? iconUrl(skillIconName(s), s.fx, ownerOfSkill(s.id)) : '';
  };
  const out: RowInfo[] = tree.rows.map((r, i) => {
    if (i === 0 && def?.passive) {
      const pi = iconUrl(def.passive.icon || uiIconName('passive'), def.color, ownerOfUnit(tree.class));
      return { icon: pi, base: pi, name: def.passive.name, kind: 'pas' as const };
    }
    const s = byId(r.skill);
    const base = sk(r.skill);
    return { icon: s ? heroSkillIconUrl(hero, s) : base, base, name: s?.name ?? r.name, kind: '' as const, ...(s ? { skill: s } : {}) };
  });
  const us = byId(tree.ult.skill);
  const ub = sk(tree.ult.skill);
  out.push({ icon: ub, base: ub, name: us?.name ?? tree.ult.name, kind: 'ult', ...(us ? { skill: us } : {}) });
  return out;
}

export function createTreeTab(ctx: TreeTabCtx, rules: TreeRules = TREE_RULES): TreeTab {
  const enabled = treeTabEnabled(rules);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gr-tab';
  button.setAttribute('role', 'tab');
  button.title = 'Tree';
  const ico = document.createElement('img');
  ico.className = 'gr-tab-ico';
  ico.alt = '';
  ico.draggable = false;
  ico.src = iconUrl(uiIconName('passive'));
  if (ico.src) button.append(ico);
  button.append(document.createTextNode('Tree'));

  let sess: TreeSession | undefined;
  let sessHero = '';
  let sessSig = '';
  let host: HTMLElement | null = null;
  let page: HTMLElement | null = null;
  let treeHost: HTMLElement | null = null;
  let rows: RowInfo[] = [];
  let plates: PlateData[] = [];
  let entered = false;
  let lastPtr = 'mouse';
  let lpT = 0;
  let lpX = 0;
  let lpY = 0;
  let suppress = false;
  let failT = 0;
  let fail: { key: string; msg: string } | null = null;
  let ro: ResizeObserver | null = null;
  let roT = 0;
  const tip = document.createElement('div');
  tip.className = 'tt-tip';
  const TIP: { ref: string | null; pinned: HTMLElement | null } = { ref: null, pinned: null };
  const de = document.documentElement;
  const isShort = (): boolean => de.classList.contains('short');
  const isCoarse = (): boolean => (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || de.classList.contains('rotated');
  const reduced = (): boolean => reducedMotion();

  const $$ = <T extends HTMLElement = HTMLElement>(q: string, r: ParentNode = page ?? document): T[] => Array.from(r.querySelectorAll<T>(q));
  const $ = <T extends HTMLElement = HTMLElement>(q: string, r: ParentNode = page ?? document): T | null => r.querySelector<T>(q);

  // ------------------------------------------------------------------ oturum (kahraman değişince / onaylı ağaç değişince yeniden)
  function session(): TreeSession | undefined {
    const h = ctx.hero();
    if (!h) return undefined;
    const sig = `${h.level}|${JSON.stringify(h.tree ?? null)}`;
    if (!sess || sessHero !== h.id || sessSig !== sig) {
      // kahraman ya da onaylı ağaç değişti (Confirm / respec / kahraman seçimi): bekleyen puanlar silinir (stat sayfasıyla aynı)
      sess = makeSession(h);
      sessHero = h.id;
      sessSig = sig;
    }
    return sess;
  }

  // ------------------------------------------------------------------ HTML üreticileri
  /** Düğüm görseli: evolve düğümü kendi sanatını (varsa) gösterir, onaylıysa animasyon işaretiyle (refresh `.evo-on`'u da koyar); diğerleri normal skill ikonu. */
  const nodeIcon = (nd: TreeNode): string => {
    const r = rows[nd.row];
    if (nd.kind === 'notable') return nodeArtUrl(sess?.tree.class ?? '', nd.key) ?? r?.base ?? '';
    if (nd.kind !== 'evolve') return r?.base ?? '';
    const art = r?.skill ? evolveNodeIconUrl(sess?.tree.class ?? '', r.skill.id) : null;
    return art ?? r?.base ?? '';
  };

  function nodeHTML(nd: TreeNode, p: { x: number; y: number }): string {
    const k = nd.kind === 'evolve' ? 'v' : nd.kind === 'blood' ? 'b' : nd.kind === 'notable' ? 'n' : nd.kind === 'edge' ? 'e' : 'f';
    const name = sess?.tree.nodes[nd.key]?.name ?? nd.key;
    let inner: string;
    if (k === 'b') inner = DROP;
    else if (k === 'n' || k === 'v') inner = `<span class="dm"><img src="${escHtml(nodeIcon(nd))}" alt="" draggable="false"></span>`;
    else inner = '<span class="dm"></span>';
    const pp = k === 'f' ? '<span class="pp"></span>' : '';
    const fx = '<span class="fx"></span>' + (k === 'v' ? '<span class="evx"><i></i><i></i><i></i><i></i></span>' : '');
    return `<button type="button" class="gt-nd k-${k}" data-key="${nd.key}" data-tt="n:${nd.key}" aria-label="${escHtml(name)}" style="left:${p.x}px;top:${p.y}px">${fx}<span class="lkic">${LOCK}</span>${inner}${pp}</button>`;
  }

  function barHTML(slim: boolean, s: TreeSession): string {
    const vis = Math.max(...rules.barAt);
    const mk = rules.barAt.map((t, i) => `<span class="gt-mk" data-t="${t}" data-tt="b:${i}" style="left:${(t / vis) * 100}%"><em>${t}</em><i></i></span>`).join('');
    const track = `<div class="gt-barrow"><div class="gt-track"><div class="bf"></div><div class="gt-bp"></div>${mk}</div></div>`;
    const head = `<span class="gt-bnm">${escHtml(s.tree.mastery.name)}</span><span class="gt-bval"><b data-bv>0</b> / ${vis}<i data-bp></i></span>`;
    return slim || isShort() ? `<div class="gt-barw slim">${head}${track}</div>` : `<div class="gt-barw"><div class="gt-bar-top">${head}<span class="gt-bar-r">Level<b data-lvl>${s.level}</b></span></div>${track}</div>`;
  }

  function ultHTML(L: Layout, cfg: LayoutCfg): string {
    const U = L.ult;
    const ur = rows[rules.rows]!;
    const u = rules.rows;
    let usvg = '';
    let ucv = '';
    for (const arm of rules.ult.arms)
      for (let st = 1; st <= rules.ult.levels.length; st++) {
        const key = `${u}.${arm}${st}`;
        const P = U.pos[key]!;
        const prev = st === 1 ? { x: U.cx, y: U.cy } : U.pos[`${u}.${arm}${st - 1}`]!;
        usvg += `<path data-a="${st === 1 ? 'C' : `${u}.${arm}${st - 1}`}" data-b="${key}" d="M${prev.x},${prev.y} L${P.x},${P.y}"/>`;
        ucv += nodeHTML(treeNodes(rules).by.get(key)!, P);
        const vert = arm === 'u' || arm === 'd';
        const half = (st === rules.ult.levels.length ? cfg.sz.N : cfg.sz.E) / 2;
        const lx = vert ? P.x - (half + 30) : P.x;
        const ly = vert ? P.y : P.y - (half + 13);
        ucv += `<span class="gt-ulv" data-ulv="${key}" style="left:${lx}px;top:${ly}px">Lv ${rules.ult.levels[st - 1]}</span>`;
      }
    return `<div class="gt-ult q4u"><div class="gt-uwrap"><div class="gt-uscroll"><div class="gt-ucanvas" style="width:${U.W}px;height:${U.H}px"><svg class="gt-lines" width="${U.W}" height="${U.H}" viewBox="0 0 ${U.W} ${U.H}">${usvg}</svg>
      <div class="gt-ucore" data-tt="p:${u}" style="left:${U.cx}px;top:${U.cy}px;width:${cfg.coreSz}px;height:${cfg.coreSz}px"><span class="ud"></span><img src="${escHtml(ur.icon)}" alt="${escHtml(ur.name)}"></div>${ucv}</div></div></div></div>`;
  }

  function plateOne(i: number): string {
    const p = plates[i];
    const r = rows[i]!;
    if (!p) return `<div class="gr-pl ${r.kind}" data-tt="p:${i}"><span class="pl-tag"${r.kind ? '' : ' hidden'}>${r.kind === 'pas' ? 'Passive' : 'Ultimate'}</span><div class="pl-ico"><img src="${escHtml(r.icon)}" alt="" draggable="false"></div><div class="pl-nm">${escHtml(r.name)}</div></div>`;
    const tag = r.kind ? `<span class="pl-tag">${r.kind === 'pas' ? 'Passive' : 'Ultimate'}</span>` : '';
    return `<div class="gr-pl ${r.kind}" data-tt="p:${i}">${tag}<div class="pl-ico"><img src="${escHtml(r.icon)}" alt="" draggable="false"></div>
      <div class="pl-bd"><div class="pl-hd"><div class="pl-nm">${escHtml(r.name)}</div><div class="pl-chips">${p.chips}</div></div><div class="pl-dv"></div>${p.nums || '<div class="pl-sls"></div>'}</div></div>`;
  }

  function actsHTML(h: TreeTabHero, s: TreeSession): string {
    const free = freePoints(s);
    const pend = pendingCount(s);
    const ri = respecInfo(h, ctx.gold());
    const goldImg = `<img src="${escHtml(iconUrl(uiIconName('gold')))}" alt="" draggable="false">`;
    const cost = ri.free ? 'Free' : `${ri.cost}${goldImg}`;
    return `<span class="sh-ptr" title="${free > 0 ? `${free} skill point${free === 1 ? '' : 's'} to spend` : 'All points placed'}"><span class="sh-medal${free > 0 ? '' : ' empty'}"><span>${free}</span></span><span class="sh-tx">${free > 0 ? `skill point${free === 1 ? '' : 's'} to spend` : 'All points placed'}</span></span><span class="gt-sp"></span>
      <span class="sh-acts"><button type="button" class="sh-btn rs${ri.spent > 0 ? '' : ' off'}" data-a="respec" data-tt="x:respec">Respec <span class="cost">${cost}</span></button>
      <button type="button" class="sh-btn${pend > 0 ? '' : ' off'}" data-a="reset">Reset</button>
      <button type="button" class="sh-btn primary${pend > 0 ? '' : ' off'}" data-a="confirm">Confirm${pend > 0 ? ` (${pend})` : ''}</button></span>`;
  }

  const lvlText = (s: TreeSession): string => `Level ${s.level} · ${Math.max(0, s.level - 1)} points`;

  /** Sayfanın iskeleti (başlık + tek kayan alan + alt işlem satırı). */
  function pageHTML(h: TreeTabHero): string {
    const short = isShort();
    const head = `<div class="gt-head"><div class="gr-sec gr-tree-head">Skill tree · ${escHtml(className(h.class))}<span class="gr-pt sk" data-badge></span><span class="gt-lvl" data-dyn="lvl"></span></div></div><div class="gt-sec-gap"></div>`;
    return `<div class="gt-page fill q4p">${head}<div class="gt-wide q4w"><div class="gt-main"><div class="gt-in"></div></div>${short ? '' : `<div class="gt-acts gt-foot" data-dyn="acts"></div>`}</div></div>`;
  }

  /** Düğüm tuvalleri + plakalar (ölçü: treeHost genişliği). */
  function treeHTML(s: TreeSession, avail: number): { html: string; cfg: LayoutCfg; key: string; hs: boolean } {
    const short = isShort();
    const o = { avail, coarse: isCoarse(), short, u: parseFloat(getComputedStyle(de).getPropertyValue('--gu')) || 1 };
    const { cfg, key, pw, pg, hs } = plateConfig(o);
    const L = build(cfg, rules);
    const nodes = treeNodes(rules);
    let tsh = '';
    for (const t of L.tiers) {
      const x0 = cfg.padX + cfg.colW * t.c0;
      const w = cfg.colW * (t.c1 - t.c0 + 1);
      tsh += `<div class="gt-ts${t.tier === 'E' ? ' evo' : ''}" data-tier="${t.tier}" data-tn="${t.tier}" style="left:${x0}px;top:0;width:${w}px;height:${cfg.hdr}px"><small></small><b>${PL}<span class="pt"></span><em></em></b></div>`;
    }
    let rowsH = '';
    for (const row of L.rows) {
      const i = row.i;
      const loc = (k: string) => ({ x: L.pos[k]!.x, y: L.pos[k]!.y - row.top });
      let bands = '';
      let svg = '';
      let nds = '';
      for (const t of L.tiers) bands += `<div class="gt-tb" data-tier="${t.tier}" style="left:${cfg.padX + cfg.colW * t.c0}px;top:0;bottom:0;width:${cfg.colW * (t.c1 - t.c0 + 1)}px"></div>`;
      for (const n of nodes.list.filter((x) => x.row === i)) {
        const B = loc(n.key);
        for (const term of n.req)
          for (const src of term) svg += `<path class="${term.length > 1 ? 'alt' : ''}" data-a="${src}" data-b="${n.key}" d="${link(loc(src), B)}"/>`;
        if (n.kind === 'blood') {
          const h = cfg.sz.B / 2 + 2;
          svg += `<path class="dead" data-b="${n.key}" data-dead="1" d="M${B.x + h},${B.y} H${B.x + h + 12} M${B.x + h + 12},${B.y - 6} V${B.y + 6}"/>`;
        }
        nds += nodeHTML(n, B);
      }
      rowsH += `<div class="gt-prow" data-row="${i}"><div class="gt-pcell">${plateOne(i)}</div>
        <div class="gt-pcv" style="width:${L.W}px">${bands}<div class="gt-pin" style="width:${L.W}px;height:${row.h}px"><svg class="gt-lines" width="${L.W}" height="${row.h}" viewBox="0 0 ${L.W} ${row.h}">${svg}</svg>${nds}</div></div></div>`;
    }
    const ultRow = `<div class="gt-prow ult" data-row="${rules.rows}"><div class="gt-pcell">${plateOne(rules.rows)}</div><div class="gt-pult"${short || hs ? ` style="flex:none;width:${L.W}px"` : ''}>${ultHTML(L, cfg)}</div></div>`;
    const vars = `--sF:${cfg.sz.F}px;--sE:${cfg.sz.E}px;--sB:${cfg.sz.B}px;--sN:${cfg.sz.N}px;--sV:${cfg.sz.V}px;--hit:${cfg.hit}px;--hdr:${cfg.hdr}px;--pw:${pw}px;--pg:${pg}px`;
    const tight = cfg.colW < 70;
    const cls = `gt gp q4${key === 'm' && !short ? '' : ' cs'}${tight ? ' tight' : ''}${short ? ' sh' : ''}${hs ? ' hs' : ''} k-${key}`;
    const bar = barHTML(true, s);
    const acts = short ? `<div class="gt-acts gt-inbar" data-dyn="acts"></div>` : '';
    const top = short ? `<div class="gt-tools">${bar}${acts}</div>` : bar;
    const html = `<div class="${cls}" style="${vars}">${top}<div class="gt-scroll"><div class="gt-gpw"><div class="gt-sk"><div class="gt-ghead"><div class="gt-gsp"></div><div class="gt-gcv" style="width:${L.W}px">${tsh}</div></div>${rowsH}</div>${ultRow}</div></div></div>`;
    return { html, cfg, key, hs };
  }

  // ------------------------------------------------------------------ plaka verisi (gerçek skill sayıları)
  interface PlateData {
    chips: string;
    nums: string;
  }
  function plateData(h: TreeTabHero, tree: TreeData): PlateData[] {
    const stats = heroStats(h);
    if (!stats) return [];
    const list = gearSkillRows(tree.class, stats);
    if (list.length !== rules.rows + 1) return [];
    return list.map((r) => {
      if (r.passive) return { chips: '', nums: numsHtml(r.numbers) };
      return { chips: chipsHtml(r.skill!, stats), nums: numsHtml(r.numbers) };
    });
  }
  const numsHtml = (nums: Array<{ label: string; text: string; times?: number }>): string =>
    nums.length ? `<div class="pl-sls">${nums.map((n) => `<div class="pl-sl"><span class="k" title="${escHtml(n.label)}">${escHtml(n.label)}</span><span class="n">${escHtml(n.text)}${n.times ? ` x${n.times}` : ''}</span></div>`).join('')}</div>` : '';
  function chipsHtml(skill: SkillDef, stats: NonNullable<ReturnType<typeof heroStats>>): string {
    const out: string[] = [];
    const amount = skillCostAmount(skill.cost, { hp: stats.hp, mp: stats.mp, rage: 0 } as never);
    const chip = (icon: string, text: string, cls = ''): string => `<span class="pl-chip${cls}">${icon ? `<img class="bh-ico" src="${escHtml(icon)}" alt="" draggable="false">` : ''}${escHtml(text)}</span>`;
    if (amount > 0 && skill.cost.resource === 'rage') out.push(chip(iconUrl(uiIconName('rage'), RAGE_COLOR), `RAGE ${amount}`, ' rage'));
    else if (amount > 0) {
      const kind = skill.cost.resource === 'mp' ? 'mp' : 'hp';
      out.push(chip(iconUrl(statIconName(kind), STAT_COLOR[kind]), String(amount)));
    }
    if ((skill.cooldown ?? 0) > 0) out.push(chip(iconUrl(uiIconName('cooldown'), UI_COLOR), String(skill.cooldown)));
    return out.length ? out.join('') : '<span class="pl-chip free">Free</span>';
  }

  // ------------------------------------------------------------------ ipuçları (A Band)
  const foot = (text: string, cls: string): HTMLElement => {
    const d = document.createElement('div');
    d.className = `bt-foot${cls ? ` ${cls}` : ''}`;
    d.innerHTML = `<span class="dia"></span><span class="tx">${escHtml(text)}</span>`;
    return d;
  };

  function nodeTip(key: string, s: TreeSession, touch: boolean): HTMLElement {
    const nd = nodeOf(key, rules)!;
    const info = s.tree.nodes[key]!;
    const st = nodeStatus(s, key, rules);
    const pend = s.pending[key] ?? 0;
    const committed = st.rank - pend;
    const row = rows[nd.row]!;
    const accent = nd.kind === 'evolve' ? '#f3d999' : nd.kind === 'blood' ? '#c63b3b' : nd.arm ? '#e0702a' : row.kind === 'pas' ? '#6fb0a8' : undefined;
    const li = lockInfo(s, nd, rules);
    const chips: BandChip[] = [{ text: KN[nd.kind] ?? nd.kind, tone: 'ac' }];
    if (nd.max > 1) chips.push({ text: `Rank ${st.rank} / ${nd.max}` });
    chips.push(committed > 0 ? { text: 'Taken', tone: 'ok' } : pend > 0 ? { text: 'Pending', tone: 'v' } : { text: 'Not taken' });
    chips.push({ text: li.tier }, { text: li.lock, ...(li.open ? { tone: 'ok' as const } : {}) });
    if (st.inert) chips.push({ text: 'Not active yet', tone: 'warn' });
    if (st.st === 'dir') chips.push({ text: st.block?.code === 'ultArm' ? 'Other ult path chosen' : 'Other direction chosen', tone: 'warn' });
    if (st.st === 'new') chips.push({ text: 'Awaiting approval', tone: 'warn' });
    const lines: string[] = [info.text];
    if (st.inert) lines.push('Not active yet: you can take it, but the battle engine does not apply it yet.');
    const spec: BandTipSpec = {
      ...(accent ? { accent } : {}),
      kind: nd.arm ? `Ult ${KN[nd.kind]} · ${row.name}` : `${KN[nd.kind]} · ${row.name}`,
      title: info.name,
      icon: row.icon,
      value: '1',
      valueLabel: nd.max > 1 ? 'POINT / RANK' : 'POINT',
      chips,
      lines: lines.map((text) => ({ text })),
    };
    const el = bandTipEl(spec);
    let f: HTMLElement;
    const failMsg = fail && fail.key === key ? fail.msg : null;
    if (failMsg) f = foot(failMsg, 'bad');
    else if (st.rank === 0 && st.block?.code === 'points') f = foot('No points left', '');
    else if (st.rank === 0 && st.block) f = foot((['ultCap', 'ultArm', 'direction', 'unapproved'].includes(st.block.code) ? '' : 'Locked: ') + st.block.text, 'lock');
    else if (pend > 0) f = foot(touch ? `Pending +${pend}: Confirm keeps it, − takes it back` : `Pending +${pend}: Confirm keeps it, right-click takes it back`, 'pend');
    else if (committed > 0) f = foot('Confirmed: only a respec takes it back', '');
    else f = foot(touch ? 'Tap again to add 1 pending point' : 'Click to add 1 pending point', '');
    el.append(f);
    const canAdd = !st.block;
    const ctl = document.createElement('div');
    ctl.className = 'gt-ctl';
    ctl.innerHTML = `<button type="button" data-act="-1" aria-label="Take back a pending point"${pend > 0 ? '' : ' disabled'}>−</button><span class="rk">${st.rank} / ${nd.max}</span><button type="button" data-act="1" aria-label="Add a pending point"${canAdd ? '' : ' disabled'}>+</button>`;
    el.append(ctl);
    return el;
  }

  function rowTip(i: number, s: TreeSession): HTMLElement {
    const r = rows[i]!;
    const h = ctx.hero();
    const stats = h ? heroStats(h) : null;
    const kind = r.kind === 'ult' ? 'Ultimate' : r.kind === 'pas' ? 'Passive' : 'Skill';
    const chips: BandChip[] = [{ text: kind, tone: 'ac' }];
    const lines: string[] = [];
    if (stats && r.skill) {
      const t = skillTip(r.skill, stats);
      for (const m of t.meta) chips.push({ text: m, ...(m === 'Free' ? { tone: 'ok' as const } : /^RAGE/.test(m) ? { tone: 'warn' as const } : {}) });
      for (const x of t.rows) lines.push(x.text);
    } else if (stats && r.kind === 'pas') {
      const p = content.classes[s.tree.class]?.passive;
      if (p) for (const x of passiveTip(p, stats).rows) lines.push(x.text);
    }
    if (r.kind === 'ult') chips.push({ text: `Ult points ${ultSpent(effective(s), rules)} / ${rules.ult.max}` });
    const spec: BandTipSpec = { accent: r.kind === 'pas' ? '#6fb0a8' : r.kind === 'ult' ? '#e0702a' : '#d9b26a', kind: `${kind} · ${className(s.tree.class)}`, title: r.name, icon: r.icon, value: String(rowSpent(effective(s), i)), valueLabel: 'POINTS', chips, lines: lines.map((text) => ({ text })) };
    return bandTipEl(spec);
  }

  function bonusTip(i: number, s: TreeSession): HTMLElement {
    const t = rules.barAt[i]!;
    const b = s.tree.mastery.bar[i];
    const E = effective(s);
    const sp = counter(E, rules);
    const on = sp >= t;
    const pendOn = on && counter(s.confirmed, rules) < t;
    const chips: BandChip[] = [{ text: `Bar ${t}`, tone: 'ac' }, { text: pendOn ? 'Pending' : on ? 'Active' : 'Not reached', ...(on && !pendOn ? { tone: 'ok' as const } : pendOn ? { tone: 'v' as const } : {}) }];
    if (b && !b.fx) chips.push({ text: 'Not active yet', tone: 'warn' });
    const lines = [b?.text ?? '(content missing)'];
    if (b && !b.fx) lines.push('Not active yet: the bonus is chosen, but the battle engine does not apply it yet.');
    const footText = on ? `Reached: ${sp} points (needs ${t})` : `Spend ${t - sp} more point${t - sp === 1 ? '' : 's'} in the passive and skill rows`;
    const el = bandTipEl({ kind: `Mastery bonus · ${s.tree.mastery.name}`, title: b?.name ?? `Bonus ${t}`, value: String(t), valueLabel: 'BAR', chips, lines: lines.map((text) => ({ text })) });
    el.append(foot(footText, ''));
    return el;
  }

  function respecTip(): HTMLElement {
    const h = ctx.hero()!;
    const ri = respecInfo(h, ctx.gold(), rules);
    const chips: BandChip[] = [{ text: ri.free ? 'free this once' : 'gold', ...(ri.free ? { tone: 'ok' as const } : { num: String(ri.cost), tone: 'v' as const }) }, { text: ri.spent ? `${ri.spent} points return` : 'Nothing spent', ...(ri.spent ? {} : { tone: 'warn' as const }) }];
    const lines = ['Takes every confirmed point back, so the tree can be spent again. Pending points are dropped too.'];
    if (ri.free) lines.push('Free this once: the skill tree changed since you spent these points.');
    else lines.push(`Cost: ${rules.respec?.base ?? 0} gold plus ${rules.respec?.perLevel ?? 0} per level.`);
    const el = bandTipEl({ kind: 'Skill tree', title: 'Respec', icon: iconUrl(uiIconName('gold')), value: ri.free ? '0' : String(ri.cost), valueLabel: 'GOLD', chips, lines: lines.map((text) => ({ text })) });
    el.append(foot(!ri.spent ? 'No confirmed points to take back' : ri.blocked ?? 'Opens a confirmation first', !ri.spent || ri.blocked ? 'lock' : ''));
    return el;
  }

  function tipFor(ref: string, touch: boolean): HTMLElement | null {
    if (!sess) return null;
    const t = ref.slice(0, 1);
    const id = ref.slice(2);
    if (t === 'n') return nodeTip(id, sess, touch);
    if (t === 'b') return bonusTip(+id, sess);
    if (t === 'x') return respecTip();
    if (t === 'p') return rowTip(+id, sess);
    return null;
  }

  function place(el: HTMLElement): void {
    const host2 = ctx.overlay;
    const sr = host2.getBoundingClientRect();
    tip.style.left = '0px';
    tip.style.top = '0px';
    const r = (el.classList.contains('gt-mk') ? el.querySelector('i') ?? el : el).getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const vw = sr.width;
    const vh = sr.height;
    const rl = r.left - sr.left;
    const rr = r.right - sr.left;
    const rt = r.top - sr.top;
    const rb = r.bottom - sr.top;
    let x = rr + 12;
    if (x + w > vw - 8) x = rl - w - 12;
    if (x < 8) x = Math.max(8, Math.min(vw - w - 8, rl + r.width / 2 - w / 2));
    let y = rt + r.height / 2 - h / 2;
    if (x < rr && x + w > rl) y = rt - h - 8 < 8 ? rb + 8 : rt - h - 8;
    // düğüm ipucu ağacın kendisini örtmesin (playtest B4): ağaç alanının sağına, sığmazsa altına kayar
    if (el.classList.contains('gt-nd') && treeHost?.isConnected) {
      const hr = treeHost.getBoundingClientRect();
      const hl = hr.left - sr.left;
      const hrr = hr.right - sr.left;
      const hb = hr.bottom - sr.top;
      if (hrr + 10 + w <= vw - 8) {
        x = hrr + 10;
        y = rt + r.height / 2 - h / 2;
      } else if (hb + 8 + h <= vh - 8) {
        x = Math.max(8, Math.min(vw - w - 8, rl + r.width / 2 - w / 2));
        y = hb + 8;
      } else if (hl - 10 - w >= 8) {
        x = hl - 10 - w;
        y = rt + r.height / 2 - h / 2;
      }
    }
    y = Math.max(8, Math.min(vh - h - 8, y));
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }
  function showTip(el: HTMLElement, pin: boolean): void {
    const ref = el.dataset['tt'];
    if (!ref) return;
    const node = tipFor(ref, lastPtr !== 'mouse');
    if (!node) return;
    TIP.ref = ref;
    tip.replaceChildren(node);
    if (!tip.isConnected) ctx.overlay.append(tip);
    tip.classList.add('show');
    tip.classList.toggle('pin', pin);
    place(el);
  }
  function hideTip(): void {
    tip.classList.remove('show', 'pin');
    $$('.pin').forEach((e) => e.classList.remove('pin'));
    TIP.pinned = null;
    TIP.ref = null;
  }
  function refreshTip(): void {
    if (!TIP.ref) return;
    const el = $(`[data-tt="${TIP.ref}"]`);
    if (!el) return hideTip();
    const node = tipFor(TIP.ref, lastPtr !== 'mouse');
    if (!node) return hideTip();
    const l = tip.style.left;
    const t = tip.style.top;
    const pinned = tip.classList.contains('pin');
    tip.replaceChildren(node);
    if (pinned) {
      tip.style.left = l;
      tip.style.top = t;
    }
  }

  // ------------------------------------------------------------------ güncelleme (yeniden kurmadan)
  function playFx(el: HTMLElement & { _at?: number }, names: string, ms: number): void {
    FX_CLASSES.forEach((c) => el.classList.remove(c));
    void el.offsetWidth;
    names.split(' ').forEach((c) => el.classList.add(c));
    window.clearTimeout(el._at);
    el._at = window.setTimeout(() => FX_CLASSES.forEach((c) => el.classList.remove(c)), ms);
  }
  type FxEl = HTMLElement & { _fx?: { rank: number; pn: number; st: string }; _at?: number };
  function nodeFx(el: FxEl, st: { rank: number; st: string }, pn: number): void {
    const old = el._fx;
    el._fx = { rank: st.rank, pn, st: st.st };
    if (!old || reduced()) return;
    const isV = el.classList.contains('k-v');
    const shut = (x: string): boolean => x === 'tlk' || x === 'rq' || x === 'dir' || x === 'new';
    if (st.rank < old.rank) playFx(el, 'anim-reset', 700);
    else if (st.rank > old.rank) playFx(el, `anim-fill${isV ? ' anim-evolve' : ''}`, isV ? 1800 : 1000);
    else if (old.pn > 0 && pn === 0) playFx(el, 'anim-confirm', 1000);
    else if (st.st === 'dir' && old.st !== 'dir') playFx(el, 'anim-dim', 600);
    else if (isV && st.st === 'av' && old.st !== 'av') playFx(el, 'anim-evoready', 1800);
    else if (shut(old.st) && !shut(st.st)) playFx(el, 'anim-awaken', 900);
  }

  /** Bu satırın evolve'u kahramanın ONAYLI ağacında aktif mi (kural: skill-tree-evolve.ts). */
  const evoOn = (row: number): boolean => {
    const h = ctx.hero();
    return !!h && evolvedRows(h, SAVE_TREE_MODE, rules).includes(row);
  };

  function refresh(): void {
    const h = ctx.hero();
    const s = session();
    if (!page || !h || !s) return;
    const E = effective(s);
    // dinamik parçalar
    $$('[data-dyn]').forEach((e) => {
      const html = e.dataset['dyn'] === 'acts' ? actsHTML(h, s) : e.dataset['dyn'] === 'lvl' ? escHtml(lvlText(s)) : '';
      const x = e as HTMLElement & { _h?: string };
      if (x._h !== html) {
        e.innerHTML = html;
        x._h = html;
      }
    });
    const free = freePoints(s);
    $$('[data-badge]').forEach((b) => {
      b.textContent = String(free);
      b.style.display = free > 0 ? '' : 'none';
    });
    // düğümler
    $$<FxEl>('.gt-nd').forEach((el) => {
      const key = el.dataset['key']!;
      const st = nodeStatus(s, key, rules);
      const keep = (el.className.match(/anim-\S+/g) ?? []).join(' ');
      const base = el.dataset['base'] ?? (el.dataset['base'] = el.className.replace(/\s*(st-\S+|pend|pin|anim-\S+)/g, ''));
      const pn = s.pending[key] ?? 0;
      el.className = `${base} st-${st.st}${pn > 0 ? ' pend' : ''}${TIP.pinned === el ? ' pin' : ''}${keep ? ` ${keep}` : ''}`;
      nodeFx(el, st, pn);
      const pp = el.querySelector('.pp');
      if (pp) pp.innerHTML = `<span class="c">${'●'.repeat(st.rank - pn)}</span><span class="p">${'●'.repeat(pn)}</span>${'○'.repeat(st.max - st.rank)}`;
      // evolve düğümü: ONAYLI (bekleyen değil) ise sürekli ikon animasyonu (evolve-icon.css .evo-on)
      if (el.classList.contains('k-v')) el.classList.toggle('evo-on', st.rank - pn > 0 && evoOn(nodeOf(key, rules)!.row));
    });
    // plaka ikonları: evolve onaylanınca (ya da respec'te geri dönünce) yeniden kurmadan değişir
    $$<HTMLElement>('.gr-pl[data-tt^="p:"] .pl-ico img').forEach((img) => {
      const i = Number(img.closest<HTMLElement>('.gr-pl')?.dataset['tt']?.slice(2));
      const want = rows[i]?.icon;
      if (want && img.getAttribute('src') !== want) img.setAttribute('src', want);
    });
    // yollar
    const rk = (a: { r: Record<string, number> }, k: string): number => a.r[k] ?? 0;
    $$<HTMLElement>('.gt-lines path[data-b]').forEach((pEl) => {
      const p = pEl as unknown as SVGPathElement & { _lv?: string; _ft?: number };
      if (p.dataset['cls'] === undefined) p.dataset['cls'] = p.getAttribute('class') ?? '';
      const a = p.dataset['a'] ?? '';
      const b = p.dataset['b']!;
      const rb = rk(E, b);
      const rbS = rk(s.confirmed, b);
      let cls = '';
      if (p.hasAttribute('data-dead')) cls = rb > 0 ? (rbS > 0 ? ' on' : ' pend') : '';
      else {
        const ra = a === 'C' ? 1 : rk(E, a);
        const raS = a === 'C' ? 1 : rk(s.confirmed, a);
        cls = ra > 0 && rb > 0 ? (raS > 0 && rbS > 0 ? ' on' : ' pend') : ra > 0 ? ' half' : '';
      }
      const lvl = cls.trim();
      const wasFlow = p.classList.contains('flow');
      if (nodeStatus(s, b, rules).st === 'dir') cls += ' dim';
      p.setAttribute('class', `${p.dataset['cls']}${cls}${wasFlow ? ' flow' : ''}`.trim());
      if (p._lv !== undefined && !reduced() && (LVL[lvl] ?? 0) > (LVL[p._lv] ?? 0)) {
        let len = 80;
        try {
          len = Math.ceil(p.getTotalLength()) || 80;
        } catch {
          /* yok say */
        }
        p.style.setProperty('--len', String(len));
        p.classList.remove('flow');
        void p.getBoundingClientRect();
        p.classList.add('flow');
        window.clearTimeout(p._ft);
        p._ft = window.setTimeout(() => p.classList.remove('flow'), 1100);
      }
      p._lv = lvl;
    });
    // tier bandı
    $$<HTMLElement & { _seen?: boolean; _ot?: number }>('.gt-ts').forEach((el) => {
      const t = stripState(E, el.dataset['tier']!, rules);
      if (el._seen && el.classList.contains('lk') && !t.lk && !reduced()) {
        el.classList.add('opening');
        window.clearTimeout(el._ot);
        el._ot = window.setTimeout(() => el.classList.remove('opening'), 1300);
      }
      el._seen = true;
      el.querySelector('small')!.textContent = t.small;
      el.querySelector('.pt')!.textContent = t.pt;
      el.querySelector('em')!.textContent = t.em;
      el.classList.toggle('lk', t.lk);
    });
    $$('.gt-tb').forEach((b) => b.classList.toggle('lk', stripState(E, b.dataset['tier']!, rules).lk));
    // ult kademe etiketleri
    for (const arm of rules.ult.arms)
      for (let st = 1; st <= rules.ult.levels.length; st++) {
        const key = `${rules.rows}.${arm}${st}`;
        $$(`[data-ulv="${key}"]`).forEach((t) => t.classList.toggle('lk', s.level < (rules.ult.levels[st - 1] ?? 0)));
      }
    // Mastery bar
    const vis = Math.max(...rules.barAt);
    const bvE = Math.min(vis, counter(E, rules));
    const bvS = Math.min(vis, counter(s.confirmed, rules));
    const cE = counter(E, rules);
    const cS = counter(s.confirmed, rules);
    $$('.gt-barw').forEach((w) => {
      $('[data-bv]', w)!.textContent = String(bvE);
      $('[data-bp]', w)!.textContent = bvE > bvS ? `+${bvE - bvS}` : '';
      $('.bf', w)!.style.width = `${(bvS / vis) * 100}%`;
      const bp = $('.gt-bp', w)!;
      bp.style.left = `${(bvS / vis) * 100}%`;
      bp.style.width = `${((bvE - bvS) / vis) * 100}%`;
      $$('.gt-mk', w).forEach((m) => {
        const t = +m.dataset['t']!;
        m.classList.toggle('rc', cS >= t);
        m.classList.toggle('rp', cE >= t && cS < t);
      });
      const l = $('[data-lvl]', w);
      if (l) l.textContent = String(s.level);
    });
    refreshTip();
  }

  // ------------------------------------------------------------------ eylemler
  function toast(text: string, ok = false): void {
    if (!ok) uiSound('error');
    ctx.toast(text, ok);
  }
  function shake(key: string): void {
    $$(`.gt-nd[data-key="${key}"]`).forEach((n) => {
      n.classList.remove('shake');
      void n.offsetWidth;
      n.classList.add('shake');
    });
  }
  function act(key: string, d: number): void {
    const s = session();
    if (!s) return;
    const res = d > 0 ? addPending(s, key, rules) : removePending(s, key, rules);
    if (res.ok) {
      fail = null;
      uiSound('select');
    } else {
      fail = { key, msg: res.reason };
      toast(res.reason);
      window.clearTimeout(failT);
      failT = window.setTimeout(() => {
        fail = null;
        refreshTip();
      }, 2600);
    }
    refresh();
    if (!res.ok) shake(key);
  }
  function pulseTree(c: string, ms: number): void {
    const g = $('.gt.q4');
    if (!g || reduced()) return;
    const x = g as HTMLElement & { _pt?: number };
    g.classList.remove('q4-confirm', 'q4-reset');
    void g.offsetWidth;
    g.classList.add(c);
    window.clearTimeout(x._pt);
    x._pt = window.setTimeout(() => g.classList.remove(c), ms);
  }
  function doConfirm(): void {
    const h = ctx.hero();
    const s = session();
    if (!h || !s) return;
    const why = confirmBlocked(h, s, rules);
    if (why) return toast(why);
    const n = pendingCount(s);
    try {
      ctx.setTree(h.id, confirmAlloc(s));
    } catch (e) {
      return toast(e instanceof Error ? e.message : 'Could not confirm');
    }
    uiSound('confirm');
    resetPending(s);
    pulseTree('q4-confirm', 1100);
    ctx.toast(`${n} point${n === 1 ? '' : 's'} confirmed`, true);
    ctx.rerender();
  }
  function doReset(): void {
    const s = session();
    if (!s) return;
    resetPending(s);
    fail = null;
    uiSound('select');
    refresh();
    pulseTree('q4-reset', 700);
  }
  function doRespec(): void {
    const h = ctx.hero();
    if (!h) return;
    const ri = respecInfo(h, ctx.gold(), rules);
    if (!ri.spent) return toast('No confirmed points to take back');
    if (ri.blocked) return toast(ri.blocked);
    const cost = ri.free ? 'It is free this once: the skill tree changed.' : `It costs ${ri.cost} gold.`;
    ctx.ask(`Respec ${className(h.class)}? All ${ri.spent} confirmed points return to the pool and pending points are dropped. ${cost}`, 'Respec', () => {
      try {
        ctx.respec(h.id);
      } catch (e) {
        return toast(e instanceof Error ? e.message : 'Could not respec');
      }
      uiSound('confirm');
      const s = session();
      if (s) resetPending(s);
      fail = null;
      ctx.toast(`Tree reset: ${ri.spent} points returned${ri.free ? '' : `, −${ri.cost} gold`}`, true);
      ctx.rerender();
    }, true);
  }

  // ------------------------------------------------------------------ kurulum
  function onPointerDown(e: PointerEvent): void {
    lastPtr = e.pointerType || 'mouse';
    suppress = false;
    window.clearTimeout(lpT);
    const t = e.target as HTMLElement;
    if (!t.closest('[data-tt]') && !t.closest('.tt-tip')) hideTip();
    const nd = t.closest<HTMLElement>('.gt-nd');
    if (nd && lastPtr !== 'mouse') {
      lpX = e.clientX;
      lpY = e.clientY;
      lpT = window.setTimeout(() => {
        suppress = true;
        act(nd.dataset['key']!, -1);
      }, 520);
    }
  }
  function onPointerOver(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || TIP.pinned) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tt]');
    if (el) showTip(el, false);
  }
  function onPointerOut(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || TIP.pinned) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tt]');
    const rel = e.relatedTarget as Node | null;
    if (el && !(rel && el.contains(rel))) {
      tip.classList.remove('show');
      TIP.ref = null;
    }
  }
  function onClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    const ab = t.closest<HTMLElement>('[data-a]');
    if (ab) {
      if (ab.classList.contains('off') && ab.dataset['a'] !== 'respec') return;
      const a = ab.dataset['a'];
      if (a === 'confirm') doConfirm();
      else if (a === 'reset') doReset();
      else if (a === 'respec') doRespec();
      return;
    }
    const tt = t.closest<HTMLElement>('[data-tt]');
    if (!tt) return;
    if (suppress) {
      suppress = false;
      return;
    }
    const isNode = tt.classList.contains('gt-nd');
    if (lastPtr !== 'mouse') {
      if (TIP.pinned !== tt) {
        hideTip();
        TIP.pinned = tt;
        tt.classList.add('pin');
        showTip(tt, true);
        return;
      }
      if (isNode) act(tt.dataset['key']!, 1);
      return;
    }
    if (isNode) act(tt.dataset['key']!, 1);
  }
  function onTipClick(e: MouseEvent): void {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (b && TIP.ref && TIP.ref[0] === 'n' && !b.disabled) act(TIP.ref.slice(2), +b.dataset['act']!);
  }
  function onContext(e: MouseEvent): void {
    const nd = (e.target as HTMLElement).closest<HTMLElement>('.gt-nd');
    if (!nd) return;
    e.preventDefault();
    if (lastPtr === 'mouse') act(nd.dataset['key']!, -1);
  }
  function onKeyDown(e: KeyboardEvent): void {
    const nd = (e.target as HTMLElement).closest<HTMLElement>('.gt-nd');
    if (nd && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      e.stopPropagation();
      act(nd.dataset['key']!, -1);
    }
  }
  function onMove(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - lpX, e.clientY - lpY) > 12) window.clearTimeout(lpT);
  }
  const onUp = (): void => window.clearTimeout(lpT);
  const onDocDown = (e: PointerEvent): void => {
    if (!ctx.overlay.isConnected) return destroy();
    const t = e.target as HTMLElement;
    if (TIP.pinned && !t.closest('[data-tt]') && !t.closest('.tt-tip')) hideTip();
  };
  const onScroll = (): void => {
    if (TIP.pinned) hideTip();
  };

  function wire(p: HTMLElement): void {
    p.addEventListener('pointerdown', onPointerDown, true);
    p.addEventListener('pointerup', onUp, true);
    p.addEventListener('pointercancel', onUp, true);
    p.addEventListener('pointermove', onMove, true);
    p.addEventListener('pointerover', onPointerOver);
    p.addEventListener('pointerout', onPointerOut);
    p.addEventListener('click', onClick);
    p.addEventListener('contextmenu', onContext);
    p.addEventListener('keydown', onKeyDown);
    p.addEventListener('scroll', onScroll, true);
  }
  tip.addEventListener('click', onTipClick);
  document.addEventListener('pointerdown', onDocDown, true);

  function mountTree(s: TreeSession): void {
    if (!treeHost || !page) return;
    const avail = Math.max(240, treeHost.clientWidth - (isShort() ? 14 : 14));
    const t = treeHTML(s, avail);
    const sc = { x: 0, y: 0 };
    const old = $('.gt-scroll', treeHost);
    if (old) {
      sc.x = old.scrollLeft;
      sc.y = old.scrollTop;
    }
    treeHost.innerHTML = t.html;
    const scr = $('.gt-scroll', treeHost);
    if (scr) {
      scr.scrollLeft = sc.x;
      scr.scrollTop = sc.y;
    }
    if (!entered && !reduced()) {
      const g = $('.gt.q4', treeHost);
      if (g) {
        g.classList.add('enter');
        window.setTimeout(() => g.classList.remove('enter'), 1200);
      }
    }
    entered = true;
  }

  function render(hostEl: HTMLElement): void {
    const h = ctx.hero();
    const s = session();
    if (!h) return void hostEl.replaceChildren();
    if (!s) {
      const m = document.createElement('div');
      m.className = 'gt-none';
      m.textContent = 'This class has no skill tree yet.';
      page = null;
      host = hostEl;
      return void hostEl.replaceChildren(m);
    }
    if (h.treeReset && !noticed.has(h.id)) {
      noticed.add(h.id);
      ctx.toast(TREE_RESET_NOTICE, true);
    }
    const pk = `${h.id}|${isShort()}`;
    const reuse = page && host === hostEl && hostEl.contains(page) && page.dataset['pk'] === pk;
    if (!reuse) {
      host = hostEl;
      const wrap = document.createElement('div');
      wrap.innerHTML = pageHTML(h);
      page = wrap.firstElementChild as HTMLElement;
      page.dataset['pk'] = pk;
      wire(page);
      hostEl.replaceChildren(page);
      treeHost = $('.gt-in', page);
      rows = rowInfos(s.tree, h);
      plates = plateData(h, s.tree);
      mountTree(s);
      watchSize();
    } else {
      rows = rowInfos(s.tree, h);
      // ölçü ya da plaka sayıları (stat / item) değiştiyse düğümler dışarıdan yeniden kurulur
      const np = plateData(h, s.tree);
      if (JSON.stringify(np) !== JSON.stringify(plates)) {
        plates = np;
        mountTree(s);
      }
    }
    refresh();
  }

  function watchSize(): void {
    ro?.disconnect();
    if (!treeHost || typeof ResizeObserver === 'undefined') return;
    let w0 = treeHost.clientWidth;
    ro = new ResizeObserver(() => {
      window.clearTimeout(roT);
      roT = window.setTimeout(() => {
        const s = sess;
        if (!s || !treeHost || !treeHost.isConnected) return;
        const w = treeHost.clientWidth;
        if (Math.abs(w - w0) < 3) return;
        w0 = w;
        hideTip();
        mountTree(s);
        refresh();
      }, 160);
    });
    ro.observe(treeHost);
  }

  function syncButton(on: boolean, points: number): void {
    button.classList.toggle('on', on);
    button.setAttribute('aria-selected', String(on));
    button.querySelector('.gr-pt')?.remove();
    if (points > 0) {
      const b = document.createElement('span');
      b.className = 'gr-pt sk';
      b.textContent = String(points);
      b.title = 'Skill points';
      button.append(b);
    }
    if (!on) {
      entered = false;
      hideTip();
      page = null;
    }
  }

  function destroy(): void {
    ro?.disconnect();
    window.clearTimeout(roT);
    window.clearTimeout(lpT);
    window.clearTimeout(failT);
    document.removeEventListener('pointerdown', onDocDown, true);
    tip.remove();
  }

  return { enabled, button, syncButton, render, destroy, tipOpen: () => tip.classList.contains('show'), closeTip: hideTip };
}
