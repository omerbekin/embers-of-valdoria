/**
 * Ortak item ipucu (Ömer 2026-10-11, g1): torba / yuva / tüccar / ödül hücresinin üstüne gelince FARE İMLECİNİN YANINDA yüzen panel
 * (dokunmatikte TEK DOKUNUŞ: item'in yanına sabitlenir, altta eylem düğmeleri; boşluğa dokununca kapanır, Ömer 2026-10-12). İçerik: ad (nadirlik rengi), nadirlik + yuva + item seviyesi, affix satırları (C / B / A kademe etiketi + ikon +
 * değer + zar aralığı), Legendary etkisi, değer. Gear, tüccar ve ödül torbası aynı bileşeni kullanır. Oyun içi metinler İngilizce.
 */
import { rarityMark } from './rarity-mark';
import { ITEMS, TIER_COLOR, affixCapKeys, affixDef, affixLines, capOf, effectLine, instanceBaseLines, instanceColor, instanceRarity, instanceSubtitle, itemDef, itemValue, levelReqMsg, type CapKey, type ItemInstance } from '../progression';
import { setTip } from '../progression/sets';
import type { Equipment } from '../progression/items';
import { tipOn, tipOff } from './tip-vis';
import { clientToLocal } from './formation-board-rules';
import { statIconUrl } from './stat-tips';
import { itemDefIcon } from './item-icon-dom';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName } from './ui-icons';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Dokunmatikte sabitlenen ipucunun eylem düğmesi (Equip / Unequip / Buy / Sell ...). */
export interface ItemTipAction {
  label: string;
  run: () => void;
  disabled?: boolean;
  primary?: boolean;
}

/** Düğümün `anc` içindeki konumu (offset zinciri; döndürülmüş sahnede de doğru, kaydırmalar düşülür). */
export function offsetIn(node: HTMLElement, anc: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = node;
  while (n && n !== anc) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const parent = n.offsetParent as HTMLElement | null;
    for (let q: HTMLElement | null = n.parentElement; q && q !== anc; q = q.parentElement) {
      x -= q.scrollLeft;
      y -= q.scrollTop;
      if (q === parent) break;
    }
    n = parent;
  }
  return { x, y };
}

export interface ItemTipLine {
  text: string;
  dir?: 'up' | 'down' | 'no';
}

/** Kahraman bağlamı (progression > affixContext): etkisiz affix sıraları + tavanı dolu statlar (Ömer 2026-10-13, itemcaps). */
export interface ItemTipState {
  inactive?: Set<number>;
  capped?: Set<CapKey>;
  /** Seçili kahramanın seviyesi: item'in şartı bundan yüksekse "Requires Level X" kırmızı (Item Güçlendirme x6). */
  level?: number;
  /** Tüccar: torba item'inin satış fiyatı (verilirse altta "sells for"; yoksa "value"). */
  sellFor?: number;
  /** Oransal örtüğün seçili kahramandaki gerçek sonucu, soluk ("(120 → 130)"; Ömer 2026-10-27; loadout.ts > implicitResultHint). */
  implicitHint?: string;
  /** Set parçası: kahramanın (item takılı sayılmış) kuşanması; set bloğunda sayaç ve etkin satırlar (loadout.ts > affixContext). */
  setEquipment?: Partial<Equipment>;
  /** Karşılaştırma kartı: kahramanın o yuvada giydiği item (Gear Hero çantası; Ömer 2026-11-01): köşede küçük "EQUIPPED" etiketi. */
  equipped?: boolean;
  /** Karşılaştırma kartında kahraman adı ('Equipped · Warrior'): seçili kahraman yokken (ganimet / ödül torbası) kimin item'i olduğu görünsün. */
  equippedBy?: string;
  /**
   * Demirci önizlemesi (Ömer 2026-11-12, Blacksmith varyantları): karşılaştırma örneği. 'arrow' = kart bu item'in, değişen sayılar satır içinde
   * "13 → 16" (yeni değer yeşil); 'new' = kart yeni item'in, eskisinden farklı sayılar yeşil.
   */
  compare?: { other: Pick<ItemInstance, 'id'> & { rolls?: unknown }; mode: 'arrow' | 'new' };
  /**
   * Demirci Reforge: kartın affix satırları seçilebilir (`can` = özgün affix sıraları), `on` seçili satır, altına `note`; `mystery` = seçili
   * satırın yazısı "?" olur (Reforge sonrası kartı). `pick` yoksa satırlar yalnızca vurgulanır.
   */
  lineSel?: { can: number[]; on: number; pick?: (i: number) => void; note?: string; mystery?: boolean };
}

/** Sayı farkı (demirci önizlemesi): `a` (önce) ve `b` (sonra) aynı kalıpta ise değişen sayılar işaretlenir; değilse yeni yazı yeşil. */
function diffText(a: string, b: string, mode: 'arrow' | 'new'): HTMLElement {
  const out = el('span', 'it-text');
  if (a === b) return (out.append(a), out);
  const num = /(\d+(?:\.\d+)?)/;
  const pa = a.split(num);
  const pb = b.split(num);
  const same = pa.length === pb.length && pa.every((x, i) => i % 2 === 1 || x === pb[i]);
  if (!same) {
    if (mode === 'arrow') out.append(a, el('span', 'it-diff-ar', ' → '), el('span', 'it-diff-up', b));
    else out.append(el('span', 'it-diff-up', b));
    return out;
  }
  const own = mode === 'arrow' ? pa : pb;
  own.forEach((x, i) => {
    if (i % 2 === 0 || pa[i] === pb[i]) return void out.append(x);
    if (mode === 'arrow') out.append(el('span', 'it-diff-was', pa[i]!), el('span', 'it-diff-ar', ' → '), el('span', 'it-diff-up', pb[i]!));
    else out.append(el('span', 'it-diff-up', x));
  });
  return out;
}

/**
 * Item ipucunun "value" kaynağı: sefer, tüccarın satış fiyatını (campaignSellValue) yazar (Ömer 2026-10-26); null = ortak değer (progression > itemValue; Endless).
 * Sefer sahnesi açılırken kurar, kapanırken null yapar.
 */
let valueSource: ((inst: Pick<ItemInstance, 'id'> & { rolls?: unknown }) => number) | null = null;
export function setItemValueSource(fn: typeof valueSource): void {
  valueSource = fn;
}

/** Tavan etiketi: "max 25%" (hız düz: "max 3"). */
export const capLabel = (k: CapKey): string => `max ${capOf(k) ?? ''}${k === 'spd' ? '' : '%'}`;

/** Kahraman satırı (karşılaştırma): `face` portre adresi, `level` kahramanın seviyesi (item şartı yüksekse "Lv" kırmızı). */
export interface ItemTipHero {
  label: string;
  parts: ItemTipLine[];
  face?: string;
  level?: number;
}

const TIER_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

/** Zar göstergesi için değerin aralıktaki yeri (0-1); aralık ya da sayı yoksa null. */
function rollPos(text: string, range: string): number | null {
  // Ayrı çarpan aralığı "×1.03–1.05" (azalışta zar sırasıyla "×0.97–0.95"): sayı yazıdaki "×" değerinden
  const [lo, hi] = range.replace(/×/g, '').split('–').map(Number);
  const m = range.startsWith('×') ? text.match(/×(\d+(\.\d+)?)/) : text.match(/\d+(\.\d+)?/);
  if (!m || lo === undefined || hi === undefined || !Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo) return null;
  return Math.max(0, Math.min(1, (Number(m[1] !== undefined && range.startsWith('×') ? m[1] : m[0]) - lo) / (hi - lo)));
}

/** Gövde: (Legendary etkisi) + örtük stat + kademeye göre YÜKSEKTEN düşüğe (A, B, C) sıralı affix satırları. Ortak ipucu ve tüccar karşılama kartı kullanır. */
function bodyNodes(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId: string | undefined, state: ItemTipState | undefined): HTMLElement[] {
  const d = itemDef(inst.id);
  if (!d) return [];
  const out: HTMLElement[] = [];
  const fx = effectLine(d);
  if (fx) {
    const i = fx.indexOf(':');
    const box = el('div', 'it-effect');
    if (i > 0) box.append(el('strong', '', fx.slice(0, i)), el('span', '', fx.slice(i + 1).trim()));
    else box.append(el('span', '', fx));
    out.push(box);
  }
  const set = setTip(d, classId, state?.setEquipment);
  if (set) {
    const box = el('div', 'it-set');
    box.append(el('strong', '', set.title));
    for (const r of set.rows) box.append(el('div', r.on ? 'it-set-row on' : 'it-set-row', r.text));
    out.push(box);
  }
  const base = instanceBaseLines(inst);
  // örtük satır(lar): tipin örtüğü (+ hız cezası) ve çift el yakın dövüşte Heavy grip (Ömer 2026-10-27); silahta bunlar gücün iki yanında (bigNode)
  for (const [line, hint] of [[base.implicit, state?.implicitHint], [base.heavy, undefined]] as const) {
    if (!line || base.weaponSides) continue;
    const row = el('div', 'it-implicit');
    const url = line.stat ? statIconUrl(line.stat) : '';
    if (url) {
      const i = el('img', 'it-ico');
      i.src = url;
      i.alt = '';
      row.append(i);
    }
    const own = line === base.heavy ? `${line.name}: ${line.text}` : line.text;
    const ob = state?.compare ? instanceBaseLines(state.compare.other) : null;
    const oLine = ob ? (line === base.heavy ? ob.heavy : ob.implicit) : undefined;
    const oText = oLine ? (line === base.heavy ? `${oLine.name}: ${oLine.text}` : oLine.text) : undefined;
    if (state?.compare && oText !== undefined && oText !== own) {
      const m = state.compare.mode;
      row.append(diffText(m === 'arrow' ? own : oText, m === 'arrow' ? oText : own, m));
    } else row.append(el('span', 'it-text', own));
    if (hint) {
      const h = el('span', 'it-text', ` ${hint}`);
      h.style.opacity = '0.55';
      row.append(h);
    }
    out.push(row);
  }
  const lines = el('div', 'it-lines');
  const cmp = state?.compare;
  const otherLines = cmp ? affixLines(cmp.other, classId) : null;
  const sel = state?.lineSel;
  // sıra: kademe yüksekten düşüğe (A, B, C); eşitlikte zar sırası. "Etkisiz" işareti özgün sıra numarasıyla eşlenir.
  const ls = affixLines(inst, classId).map((l, i) => ({ l, i }));
  ls.sort((x, y) => (TIER_ORDER[x.l.tier] ?? 9) - (TIER_ORDER[y.l.tier] ?? 9) || x.i - y.i);
  for (const { l, i } of ls) {
    const off = !!state?.inactive?.has(i);
    const row = el('div', `it-line${off ? ' off' : ''}`);
    const can = !!sel?.can.includes(i);
    const picked = sel?.on === i;
    const mystery = picked && !!sel?.mystery;
    if (sel) row.classList.add(can ? 'it-pickable' : 'it-locked');
    if (picked) row.classList.add('it-picked');
    if (sel?.pick && can) {
      row.setAttribute('role', 'button');
      row.tabIndex = 0;
      row.addEventListener('click', () => sel.pick?.(i));
      row.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        sel.pick?.(i);
      });
    }
    const tag = el('span', 'it-tier', l.tier);
    tag.style.setProperty('--tc', TIER_COLOR[l.tier]);
    row.append(tag);
    const url = l.stat ? statIconUrl(l.stat) : l.icon === 'block' || l.icon === 'blockBreak' ? statIconUrl('block') : '';
    if (url) {
      const im = el('img', 'it-ico');
      im.src = url;
      im.alt = '';
      row.append(im);
    } else row.append(el('i', 'it-dia'));
    const other = otherLines?.[i]?.text;
    const changed = !!cmp && other !== undefined && other !== l.text;
    if (mystery) row.append(el('span', 'it-text it-mystery', '?'));
    else if (changed && cmp) row.append(cmp.mode === 'arrow' ? diffText(l.text, other!, 'arrow') : diffText(other!, l.text, 'new'));
    else row.append(el('span', 'it-text', l.text));
    // tavan dolu (fazlası kaybolur) ya da A affix sınırı (aynı A affix'i en çok 2 item'de sayılır)
    const capKey = off ? undefined : affixCapKeys(affixDef(l.id) ?? { parts: [] }).find((k) => state?.capped?.has(k));
    if (capKey) row.append(el('span', 'it-cap', capLabel(capKey)));
    // zar göstergesi: mücevher rayı (değerin aralıktaki yeri), üstüne gelince aralık
    const pos = l.range ? rollPos(l.text, l.range) : null;
    if (changed || mystery) {
      // demirci önizlemesi: değişen / bilinmeyen satırda zar rayı yok (eski değerin yeri yanıltır)
    } else if (l.range && pos !== null) {
      const g = el('span', 'it-rail');
      g.style.setProperty('--p', String(pos));
      g.title = `Roll range ${l.range}`;
      g.append(el('i'), el('strong'));
      row.append(g);
    } else if (l.range) row.append(el('span', 'it-range', `(${l.range})`));
    lines.append(row);
    if (picked && sel?.note) lines.append(el('div', 'it-pick-note', sel.note));
    if (off) lines.append(el('div', 'it-off-note', `Inactive: only ${ITEMS.caps.aAffixCopies ?? 2} of this affix count`));
  }
  if (lines.childElementCount) out.push(lines);
  return out;
}

/** Büyük taban değeri: silah gücü ya da kalkan blok şansı (büyük sayı + küçük etiket). */
function bigNode(base: ReturnType<typeof instanceBaseLines>, implicitHint?: string): HTMLElement | null {
  if (base.power === undefined && base.block === undefined) return null;
  const box = el('div', 'it-big');
  if (base.power !== undefined) {
    const power = el('div', 'it-big-power');
    power.append(el('strong', '', String(base.power)), el('span', '', 'Weapon power'));
    if (!base.weaponSides) box.append(power);
    else {
      // Silah gücünün iki yanı (Ömer 2026-10-31): olumlu solda, Speed cezası sağda
      const plus = el('div', 'it-side it-side-plus', base.weaponSides.plus ?? '');
      if (implicitHint && base.weaponSides.plus) {
        const h = el('span', '', ` ${implicitHint}`);
        h.style.opacity = '0.55';
        plus.append(h);
      }
      box.classList.add('sided');
      box.append(plus, power, el('div', 'it-side it-side-minus', base.weaponSides.minus ?? ''));
    }
  } else if (base.block !== undefined) {
    const n = el('span', 'it-big-n');
    const url = statIconUrl('block');
    if (url) {
      const i = el('img', 'it-big-ico');
      i.src = url;
      i.alt = '';
      n.append(i);
    }
    n.append(el('strong', '', `${Math.round(base.block * 10) / 10}%`));
    box.append(n, el('span', '', 'Block chance'));
  }
  return box;
}

/** Tüccar karşılama kartı için: büyük taban değeri, seviye şartı ve gövde (başlık / ad / değer kartın kendi yerinde). */
export function itemTipBody(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }): HTMLElement[] {
  const base = instanceBaseLines(inst);
  const out: HTMLElement[] = [];
  const big = bigNode(base);
  if (big) out.push(big);
  if (base.req > 1) out.push(el('div', 'it-req', levelReqMsg(base.req)));
  out.push(...bodyNodes(inst, undefined, undefined));
  return out;
}

/**
 * İpucunun içeriği (DOM): TEK kart (Ömer 2026-10-18, taslak item-tooltip.html#v3): yuvarlak madalyon + ad + nadirlik kurdelesi + "tutuş · Item level"
 * + büyük silah gücü / blok şansı; gövde (Legendary etkisi üstte, örtük stat, kademe sırası A > B > C stat satırları); "Requires Level" solda +
 * değer sağda; kahraman karşılaştırma satırları. `classId`: takan sınıf ({primary} yazısı); `extra`: kahraman başına fark satırları.
 */
export function itemTipNodes(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string, extra: ItemTipHero[] = [], state?: ItemTipState): HTMLElement[] {
  const d = itemDef(inst.id);
  if (!d) return [];
  const color = instanceColor(inst);
  const card = el('div', `it-card${state?.equipped ? ' eq' : ''}`);
  card.style.setProperty('--rc', color);
  const base = instanceBaseLines(inst);
  if (state?.equipped) card.append(el('span', 'it-eqtag', state.equippedBy ? `Equipped · ${state.equippedBy}` : 'Equipped'));

  // ---- başlık
  const head = el('div', 'it-head');
  const medal = el('span', 'it-medal');
  medal.append(itemDefIcon(d, d.slot, color, 'gr-svg gr-px'));
  const id = el('div', 'it-id');
  id.append(el('strong', 'it-name', d.name), rarityMark(instanceRarity(inst)));
  const sub = instanceSubtitle(inst).split(' · ');
  const grip = sub.slice(1, -1).join(' · ');
  const ilvl = sub.length > 1 ? (sub[sub.length - 1] ?? '') : '';
  // başlık (Ömer 2026-10-23, taslak item-tip-head#b): ad, elmaslı ince altın çizgi, net "RARITY · TYPE" satırı, düz "el · Item level"
  id.append(el('div', 'it-rule'));
  id.append(el('div', 'it-kind', (sub[0] ?? '').replace(' ', ' · ')));
  const line = [grip, ilvl].filter(Boolean).join(' · ');
  // demirci önizlemesi (compare): alt satırdaki item seviyesi, büyük güç / blok ve şart satırı da önce -> sonra
  const cmp = state?.compare;
  const ob = cmp ? instanceBaseLines(cmp.other) : null;
  const oSub = cmp ? instanceSubtitle(cmp.other).split(' · ') : null;
  const oLine = oSub ? [oSub.slice(1, -1).join(' · '), oSub.length > 1 ? (oSub[oSub.length - 1] ?? '') : ''].filter(Boolean).join(' · ') : '';
  const pair = (own: string, other: string): HTMLElement => (cmp!.mode === 'arrow' ? diffText(own, other, 'arrow') : diffText(other, own, 'new'));
  if (line) {
    const subEl = el('div', 'it-sub');
    if (cmp && oLine !== line) subEl.append(pair(line, oLine));
    else subEl.textContent = line;
    id.append(subEl);
  }
  const big = bigNode(base, state?.implicitHint);
  if (big && cmp && ob) {
    const st = big.querySelector<HTMLElement>('.it-big-power strong, .it-big-n strong');
    const own = base.power !== undefined ? String(base.power) : base.block !== undefined ? `${Math.round(base.block * 10) / 10}%` : '';
    const oth = ob.power !== undefined ? String(ob.power) : ob.block !== undefined ? `${Math.round(ob.block * 10) / 10}%` : '';
    if (st && oth && oth !== own) {
      if (cmp.mode === 'arrow') st.append(el('span', 'it-diff-ar', ' → '), el('span', 'it-diff-up', oth));
      else st.classList.add('it-diff-up');
    }
  }
  if (big) id.append(big);
  head.append(medal, id);
  card.append(head);

  // ---- gövde
  const main = el('div', 'it-main');
  main.append(...bodyNodes(inst, classId, state));
  if (main.childElementCount) card.append(main);

  // ---- şart (solda, karşılanmıyorsa kırmızı) + değer (sağda)
  const unmet = state?.level !== undefined && state.level < base.req;
  const foot = el('div', 'it-reqrow');
  const reqEl = el('span', `it-req${unmet ? ' unmet' : ''}`, base.req > 1 || unmet ? levelReqMsg(base.req) : '');
  if (cmp && ob && ob.req !== base.req) reqEl.replaceChildren(pair(levelReqMsg(base.req), levelReqMsg(ob.req)));
  foot.append(reqEl);
  const val = el('span', 'it-val');
  if (hasUiImage('gold')) {
    const c = el('img', 'it-coin');
    c.src = iconUrl(uiIconName('gold'));
    c.alt = '';
    val.append(c);
  }
  val.append(el('strong', '', String(state?.sellFor ?? (valueSource ? valueSource(inst) : itemValue(inst)))), el('em', '', state?.sellFor !== undefined ? 'sells for' : 'value'));
  foot.append(val);
  card.append(foot);

  // ---- kahramanlar: kare portre + ad + seviye + fark (yuvarlak hap YOK; oyunun kare portre + ince altın çizgi dili)
  if (extra.length) {
    const box = el('div', 'it-heroes');
    for (const x of extra) {
      const no = x.parts.some((p) => p.dir === 'no');
      const row = el('div', `it-hero${no ? ' no' : ''}`);
      const face = el('span', 'it-face');
      if (x.face) face.style.backgroundImage = `url("${x.face}")`;
      row.append(face, el('strong', 'it-hero-k', x.label));
      if (x.level !== undefined && !no) row.append(el('span', `it-lv${x.level < base.req ? ' unmet' : ''}`, `Lv ${x.level}`));
      const v = el('span', 'it-hero-v');
      for (const p of x.parts) v.append(el('span', `it-chip${p.dir ? ` it-${p.dir}` : ''}`, p.text));
      row.append(v);
      box.append(row);
    }
    card.append(box);
  }
  return [card];
}

/**
 * Telefonun karşılaştırma şeridi (Ömer 2026-11-12): yan yana iki tam kart 844x390'a sığmaz; takılı item ikinci kart yerine üstteki kartın altında
 * tek satır: "vs Equipped" + küçük ikon + ad + fark ("Power 11 → 15", "+4 ARM"). Masaüstü tam kartı kullanır (gear-screen.ts > equippedTipNodes).
 */
export function itemVsNode(equipped: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, label: string, parts: ItemTipLine[], hovered?: Pick<ItemInstance, 'id'> & { rolls?: unknown }): HTMLElement {
  const row = el('div', 'it-vs');
  const d = itemDef(equipped.id);
  const color = instanceColor(equipped);
  row.style.setProperty('--rc', color);
  row.append(el('span', 'it-vs-k', label));
  if (d) {
    const ic = el('span', 'it-vs-ico');
    ic.append(itemDefIcon(d, d.slot, color, 'gr-svg gr-px'));
    row.append(ic, el('strong', 'it-vs-n', d.name));
  }
  const v = el('span', 'it-vs-v');
  if (hovered) {
    const a = instanceBaseLines(equipped);
    const b = instanceBaseLines(hovered);
    const pair = a.power !== undefined && b.power !== undefined ? ([a.power, b.power, 'Power', ''] as const) : a.block !== undefined && b.block !== undefined ? ([Math.round(a.block * 10) / 10, Math.round(b.block * 10) / 10, 'Block', '%'] as const) : null;
    if (pair && pair[0] !== pair[1]) v.append(el('span', `it-chip it-${pair[1] > pair[0] ? 'up' : 'down'}`, `${pair[2]} ${pair[0]}${pair[3]} → ${pair[1]}${pair[3]}`));
  }
  for (const p of parts) v.append(el('span', `it-chip${p.dir ? ` it-${p.dir}` : ''}`, p.text));
  row.append(v);
  return row;
}

/** Telefon şeridi (`.it-vs`) ayrı düğüm gelir; ilk kartın içine (eylem düğmelerinden önce) alınır. */
function mergeVs(nodes: HTMLElement[]): HTMLElement[] {
  const card = nodes[0]?.classList.contains('it-card') ? nodes[0] : null;
  if (!card) return nodes;
  const vs = nodes.filter((n) => n.classList.contains('it-vs'));
  if (!vs.length) return nodes;
  card.append(...vs);
  return nodes.filter((n) => !vs.includes(n));
}

/**
 * Yüzen ipucu denetçisi: `host` içinde konumlanır (döndürülmüş / ölçekli sahnede de: istemci koordinatı host'un ölçeğine bölünür).
 * `showAt` imlecin sağ altına koyar (taşarsa sola / yukarı çevirir); `follow` fare hareketiyle taşır.
 */
export class ItemTip {
  readonly box: HTMLDivElement;
  private key = '';
  private isPinned = false;
  /** Solma bitince kesin gizleme zamanlayıcısı (bkz. hide). */
  constructor(private host: HTMLElement) {
    this.box = el('div', 'el-tip item-tip');
    this.box.setAttribute('role', 'tooltip');
    // sabitlenmiş ipucuna dokunmak pencerenin zemin kapanışına / item denetçisine ulaşmasın (düğmelerin click'i çalışır)
    const stop = (e: Event): void => {
      if (this.isPinned) e.stopPropagation();
    };
    this.box.addEventListener('pointerdown', stop);
    this.box.addEventListener('pointerup', stop);
    host.append(this.box);
  }
  get shownKey(): string {
    return this.key;
  }
  /** Dokunuşla sabitlenmiş mi (fare üstüne gelme ipucu değil). */
  get pinned(): boolean {
    return this.isPinned && !!this.key;
  }
  show(key: string, nodes: HTMLElement[], clientX: number, clientY: number): void {
    if (!nodes.length) return this.hide();
    nodes = mergeVs(nodes);
    if (key !== this.key || this.isPinned) this.box.replaceChildren(...nodes);
    this.markDuo(nodes);
    this.setPinned(false);
    this.key = key;
    this.reveal();
    this.follow(clientX, clientY);
  }
  /**
   * Dokunmatik: ipucu `anchor` hücresinin yanına sabitlenir (sağında; sığmazsa solunda, o da olmazsa altında / üstünde) ve altta
   * eylem düğmeleri olur. Bir düğmeye basmak ipucunu kapatıp eylemi çalıştırır.
   */
  pin(key: string, nodes: HTMLElement[], anchor: HTMLElement, actions: ItemTipAction[] = []): void {
    if (!nodes.length) return this.hide();
    nodes = mergeVs(nodes);
    const acts: HTMLElement[] = [];
    if (actions.length) {
      const row = el('div', 'it-acts');
      for (const a of actions) {
        const b = el('button', `el-btn sm${a.primary === false ? '' : ' primary'}`, a.label);
        b.type = 'button';
        b.disabled = !!a.disabled;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hide();
          a.run();
        });
        row.append(b);
      }
      acts.push(row);
    }
    const card = nodes[0]?.classList.contains('it-card') ? nodes[0] : null;
    if (card) card.append(...acts);
    this.box.replaceChildren(...(card ? nodes : [...nodes, ...acts]));
    this.markDuo(nodes);
    this.key = key;
    this.setPinned(true);
    this.reveal();
    const p = offsetIn(anchor, this.host);
    const aw = anchor.offsetWidth;
    const ah = anchor.offsetHeight;
    const W = this.host.clientWidth;
    const H = this.host.clientHeight;
    const { tw, th } = this.fit(W, H);
    const gap = 8;
    let left: number;
    let top: number;
    this.box.classList.remove('flip');
    if (p.x + aw + gap + tw <= W - 6) {
      left = p.x + aw + gap;
      top = p.y + ah / 2 - th / 2;
    } else if (p.x - gap - tw >= 6) {
      left = p.x - gap - tw;
      top = p.y + ah / 2 - th / 2;
      this.box.classList.add('flip');
    } else {
      left = p.x + aw / 2 - tw / 2;
      top = p.y + ah + gap + th <= H - 6 ? p.y + ah + gap : p.y - gap - th;
    }
    this.box.style.left = `${Math.max(6, Math.min(W - tw - 6, left))}px`;
    this.box.style.top = `${Math.max(6, Math.min(H - th - 6, top))}px`;
  }
  /**
   * İpucu görünür alana sığsın, KAYDIRMA ÇUBUĞU ASLA (Ömer 2026-11-12): taşarsa önce sıkı düzen (`fit`: küçük madalyon, dar boşluklar; gear.css),
   * yine taşarsa kutu sol üst köşeden orantılı küçülür (transform). Ekranda kaplanan genişlik / yükseklik döner.
   */
  private fit(W: number, H: number): { tw: number; th: number } {
    const b = this.box;
    b.style.transform = '';
    b.classList.remove('fit');
    const mw = W - 12;
    const mh = H - 12;
    let tw = b.offsetWidth;
    let th = b.offsetHeight;
    if (tw > mw || th > mh) {
      b.classList.add('fit');
      tw = b.offsetWidth;
      th = b.offsetHeight;
    }
    const s = Math.min(1, mw / Math.max(1, tw), mh / Math.max(1, th));
    if (s < 1) {
      b.style.transformOrigin = '0 0';
      b.style.transform = `scale(${s})`;
      tw *= s;
      th *= s;
    }
    return { tw, th };
  }
  /** İki kart yan yana (çanta item'i + kuşanılmış karşılaştırma kartı): kutu genişliği kartlardan gelir (gear.css .item-tip.duo). */
  private markDuo(nodes: HTMLElement[]): void {
    this.box.classList.toggle('duo', nodes.filter((n) => n.classList.contains('it-card')).length > 1);
  }
  private setPinned(on: boolean): void {
    this.isPinned = on;
    this.box.classList.toggle('pinned', on);
  }
  follow(clientX: number, clientY: number): void {
    if (!this.key || this.isPinned) return;
    // dikey dokunmatikte sahne CSS ile döner: işaretçi yerel koordinata döndürmeye göre çevrilir
    const { x, y } = clientToLocal(clientX, clientY, this.host.getBoundingClientRect(), this.host.offsetWidth, !!document.documentElement?.classList.contains('rotated'));
    const W = this.host.clientWidth;
    const H = this.host.clientHeight;
    const { tw, th } = this.fit(W, H);
    const gap = 18;
    let left = x + gap;
    let top = y + gap;
    // karşılaştırma kartları yan yana: üstüne gelinen kart imlece yakın, takılı kart uzak tarafta (sola açılınca sıra ters: gear.css .item-tip.duo.flip)
    const flip = left + tw > W - 6 && x - gap - tw >= 6;
    this.box.classList.toggle('flip', flip);
    if (flip) left = x - gap - tw;
    if (top + th > H - 6) top = y - gap - th;
    this.box.style.left = `${Math.max(6, Math.min(W - tw - 6, left))}px`;
    this.box.style.top = `${Math.max(6, Math.min(H - th - 6, top))}px`;
  }
  private reveal(): void {
    tipOn(this.box);
  }
  /**
   * Gizle: CSS solması (gear.css .item-tip) + solma süresinden sonra satır içi `display: none`. Tarayıcı sekmesi arka plandayken /
   * önizleme paneli gizliyken CSS geçişleri donar ve ipucu yarı saydam "hayalet" olarak kalırdı (2026-10-18); zamanlayıcı bunu kesin kapatır
   * (display: none; donmuş geçiş satır içi visibility'yi de ezerdi).
   */
  hide(): void {
    this.key = '';
    this.setPinned(false);
    tipOff(this.box);
  }
}
