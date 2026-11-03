/**
 * Kamp ekrani (Omer 2026-10-26, taslak public/mockups/economy-ui.html bolum 3 A "once eylem, dort kart"): Rest / Tend wounds / Sharpen / Train
 * kartlari; secilince altinda hedef (kahraman ya da item plakasi) acilir, Rest hedef istemez. Kamp BIR kez, tek secim (src/campaign/state.ts >
 * useCamp, campBlocked, campUsed, campTrainXp, campSharpenPreview). Kullanilmis kampta "used" durumu. Secim yapmadan da kapatilabilir (kamp kullanilmamis kalir, sonra geri gelinip kullanilir).
 * Italik yok; oyun metni Ingilizce.
 */
import {
  CONFIG,
  activeHeroes,
  atChapel,
  nextTaintGain,
  resetSurgeUses,
  surgeResetBlocked,
  surgeResetPrice,
  SURGE,
  campBlocked,
  campSharpenPreview,
  campTrainXp,
  campUsed,
  restHealOf,
  useCamp,
  woundRules,
  type CampChoice,
  type CampaignState,
  type Hero,
} from '../campaign';
import { affixLines, baseLineTexts, instanceBaseLines, instanceColor, instanceIlvl, instanceRarity, itemDef, rarityDef, slotDef, type ItemInstance, type SlotId } from '../progression';
import { diffLines, diffParts, firstChange, noStatChange, shortReason, type DiffLine } from './camp-sharpen-diff';
import { itemIcon } from './inventory';
import { hasUiImage, uiIconName } from './ui-icons';
import { iconUrl } from './dom-icons';
import { woundCount } from '../progression/wounds';
import { SLOT_IDS } from '../progression';
import { className, emptySlotIcon, itemPlate, plateLabel } from './character-panel';
import { attachBandTip, reasonSpec } from './band-tip-attach';
import { woundPipsEl } from './wound-ui';
import { itemTipNodes } from './item-tip';
import { el, button, goldImg, heroFace, hpBar, openShell } from './econ-shell';
import { CAMP_CARDS, fillText, type CampCardKind } from './econ-model';
import { TEMPER_STONE_ICON } from './temper-stone';
import { miscImage } from '../game/icon-image-files';
import { uiSound } from './ui-sound';

/** Kartin aciklamasi: campaign.json > texts.camp* satirindan "Ad: " onegi atilarak ("Rest: every..." -> "Every..."). */
function cardDesc(kind: CampCardKind, s: CampaignState): string {
  const T = CONFIG.texts;
  const raw = { rest: T['campRest'], tend: T['campTend'], sharpen: T['campSharpen'], train: T['campTrain'] }[kind] ?? '';
  const t = fillText(raw, { pct: Math.round(restHealOf(s) * 100), xp: 'bonus' });
  const i = t.indexOf(': ');
  const r = i >= 0 ? t.slice(i + 2) : t;
  return r ? r[0]!.toUpperCase() + r.slice(1) : r;
}

const TARGET_HINT: Record<CampCardKind, string> = { rest: 'Whole company', tend: 'Pick a hero', sharpen: 'Pick an item', train: 'Pick a hero' };
const USED_NAME: Record<CampCardKind, string> = { rest: 'Rest', tend: 'Tend wounds', sharpen: 'Sharpen', train: 'Train' };

/** Sharpen ekranindaki bir item'in satiri: oyunun gercek (bedava) Temper onizlemesinden; hicbir deger sabit degil. */
interface SharpInfo {
  inst: ItemInstance;
  hero?: Hero;
  /** campBlocked'un nedeni (null = secilebilir). */
  why: string | null;
  after: ItemInstance | null;
  lines: DiffLine[];
  reqFrom: number;
  reqTo: number | null;
}

/** Itemin gorunen satirlari: taban (guc / blok / ortuk) + affix'ler, oyunun kendi metin uretecinden. */
const linesOf = (inst: ItemInstance, cls: string | undefined): string[] => [...baseLineTexts(instanceBaseLines(inst)), ...affixLines(inst, cls).map((a) => a.text)];

function sharpInfo(s: CampaignState, inst: ItemInstance, hero?: Hero): SharpInfo {
  const p = campSharpenPreview(s, inst.uid);
  const after = p?.after ?? null;
  return {
    inst,
    ...(hero ? { hero } : {}),
    why: campBlocked(s, { kind: 'sharpen', uid: inst.uid }),
    after,
    lines: diffLines(linesOf(inst, hero?.class), after ? linesOf(after, hero?.class) : null),
    reqFrom: instanceBaseLines(inst).req,
    reqTo: after ? instanceBaseLines(after).req : null,
  };
}

/** Satir parcalarini DOM'a yazar: degisen sayi "eski → yeni" (yeni yesil). */
function appendParts(parent: HTMLElement, before: string, after: string | null): void {
  for (const part of diffParts(before, after)) {
    if (part.from === undefined) {
      parent.append(part.text);
      continue;
    }
    const df = el('span', 'df');
    df.append(el('s', '', part.from), el('span', 'ar', '→'), el('b', '', part.text));
    parent.append(df);
  }
}

/** "iL a → b" (sonraki yoksa yalniz a). */
function ilvlNode(info: SharpInfo, cls: string): HTMLElement {
  const n = el('span', cls, 'iL ');
  n.append(el('b', '', String(instanceIlvl(info.inst))));
  if (info.after) n.append(el('span', 'ar', '→'), el('b', 'to', String(instanceIlvl(info.after))));
  return n;
}

/** Gear plakasi (itemPlate) uzerine: ikinci satir = iL a → b + ilk degisen satir ("No stat change") ya da kisa engel nedeni. */
function sharpPlate(info: SharpInfo, on: boolean): HTMLButtonElement {
  const p = itemPlate(info.inst, info.hero?.class);
  p.classList.toggle('on', on);
  p.classList.toggle('dim', !!info.why);
  const l2 = el('div', 'gp-l2');
  l2.append(ilvlNode(info, 'gp-il'));
  if (info.why) l2.append(el('span', 'gp-why', shortReason(info.why)));
  else {
    const c = firstChange(info.lines);
    const a = el('span', 'gp-aff', c ? '' : 'No stat change');
    if (c) appendParts(a, c.before, c.after);
    l2.append(a);
  }
  p.querySelector('.gp-l2')?.replaceWith(l2);
  return p;
}

/** Bos yuva: kesikli plaka (Gear'daki bos yuva dili). */
function emptyPlate(k: SlotId): HTMLButtonElement {
  const b = el('button', `gr-slot gr-plate empty gr-slot-${k}`);
  b.type = 'button';
  b.tabIndex = -1;
  b.setAttribute('aria-disabled', 'true');
  b.style.setProperty('--rc', '#5b4a33');
  const ico = el('span', 'gp-ico');
  ico.append(emptySlotIcon(k));
  const tx = el('div', 'gr-slot-text gp-tx');
  tx.append(plateLabel(k), el('div', 'gr-slot-name', 'Empty'));
  b.append(ico, tx);
  return b;
}

/** Secili item'in ayrinti paneli: her satir once → sonra, "up" / "same" etiketi, seviye sarti a → b (kahramanin seviyesi parantezde). */
function sharpDetail(info: SharpInfo | null): HTMLElement {
  const dt = el('div', 'dt');
  if (!info) {
    dt.append(el('div', 'dt-note', 'Pick an item.'));
    return dt;
  }
  const { inst, hero, after, lines } = info;
  const d = itemDef(inst.id);
  const k = (d?.slot ?? 'weapon') as SlotId;
  dt.style.setProperty('--rc', instanceColor(inst));
  const head = el('div', 'dt-head');
  const ico = el('span', 'gp-ico big');
  ico.append(itemIcon(inst, k, 1.3));
  const who = el('div', 'dt-who');
  who.append(
    el('div', 'dt-name', d?.name ?? inst.id),
    el('div', 'dt-sub', `${hero ? className(hero.class) : 'In the bag'} · ${slotDef(k).name} · ${rarityDef(instanceRarity(inst)).name}`),
    ilvlNode(info, 'dt-il'),
  );
  head.append(ico, who);
  const ul = el('ul', 'dt-rows');
  for (const l of lines) {
    const li = el('li', l.changed ? 'chg' : 'same');
    appendParts(li, l.before, l.after);
    if (after) li.append(el('span', 'tg', l.changed ? 'up' : 'same'));
    ul.append(li);
  }
  const foot = el('div', 'dt-foot');
  if (info.why) foot.append(el('div', 'dt-block', info.why));
  else {
    if (noStatChange(lines)) foot.append(el('div', 'dt-note', 'No stat changes at this level; only the item level and requirement rise.'));
    if (info.reqTo !== null && info.reqTo !== info.reqFrom) {
      const r = el('div', 'dt-req', `Level requirement ${info.reqFrom}`);
      r.append(el('span', 'ar', '→'), el('b', 'to', String(info.reqTo)));
      if (hero) r.append(` (${className(hero.class)} is Lv ${hero.level})`);
      foot.append(r);
    }
  }
  const left = el('div', 'dt-l');
  left.append(head);
  const right = el('div', 'dt-r');
  right.append(ul, foot);
  dt.append(left, right);
  return dt;
}

export interface CampHandle {
  /** Kapatir (secim yapilmadiysa kamp kullanilmamis kalir). */
  close(): void;
  /** Zorla kapatma (sahne kapanirken). */
  destroy(): void;
  /** Dis degisiklikten (Gear'da esya degisti) sonra yeniden cizer. */
  refresh(): void;
}

/**
 * Kampi acar. `name` = dugum adi. Kullanilmamissa: secim onaylaninca `onUse(yeniDurum)` (sahne kaydeder ve ilerler); ekran kendini kapatir.
 * Kullanilmissa (yeniden giris): "used" gorunumu, Leave kapatir. `onGear` Gear'i acar.
 */
export function openCamp(
  root: HTMLElement,
  get: () => CampaignState,
  o: { name: string; onUse: (next: CampaignState) => void; onGear: () => void; onClose?: (usedNow: boolean) => void; /** Ekran açık kalırken durum değişti (Chapel sayaç sıfırlaması); sahne kaydeder. */ onSet?: (next: CampaignState) => void },
): CampHandle {
  let kind: CampCardKind | null = null;
  let target = '';
  /** Sharpen sol ray secimi: kahraman id'si ya da 'bag' ('' = henuz secilmedi, varsayilan hesaplanir). */
  let rail = '';
  let done = false;
  const used0 = (): CampChoice['kind'] | null => campUsed(get());
  const sh = openShell(root, { label: 'Camp', title: 'Camp', sub: o.name, lock: 'camp', closable: () => true, onClosed: () => o.onClose?.(done || !!used0()), wide: true, phoneFull: true });
  const body = sh.body;

  const choice = (): CampChoice | null => {
    if (!kind) return null;
    if (kind === 'rest') return { kind: 'rest' };
    if (!target) return null;
    return kind === 'sharpen' ? { kind, uid: target } : { kind, heroId: target };
  };

  const items = (s: CampaignState): Array<{ inst: ItemInstance; hero?: Hero }> => {
    const out: Array<{ inst: ItemInstance; hero?: Hero }> = s.inventory.map((inst) => ({ inst }));
    for (const h of s.roster) for (const k of SLOT_IDS) if (h.equipment[k]) out.push({ inst: h.equipment[k]!, hero: h });
    return out;
  };

  /** Karta hedef gerekli mi / secilebilir hedef var mi (yoksa kart pasif ve nedeni). */
  const cardWhy = (s: CampaignState, k: CampCardKind): string | null => {
    if (k === 'rest') return campBlocked(s, { kind: 'rest' });
    if (k === 'sharpen') {
      const all = items(s).map((x) => campBlocked(s, { kind: 'sharpen', uid: x.inst.uid }));
      return all.some((w) => w === null) ? null : (all.find((w) => !!w) ?? 'You have nothing to sharpen');
    }
    const hs = activeHeroes(s);
    const all = hs.map((h) => campBlocked(s, { kind: k, heroId: h.id }));
    return all.some((w) => w === null) ? null : (all.find((w) => !!w) ?? 'No one can do this');
  };

  const confirm = (): void => {
    const c = choice();
    if (!c) return;
    try {
      const next = useCamp(get(), c);
      done = true;
      uiSound('buy');
      sh.syncClose();
      sh.close();
      o.onUse(next);
    } catch {
      uiSound('error');
      render();
    }
  };

  /**
   * Chapel satırı (Ömer 2026-10-27, open-questions 449): varışta Taint bedava silindi; altınla Surge kullanım sayacı başa döner (kamp seçimi değil,
   * ekran açık kalır). Yalnızca Chapel düğümünde ve haritada fiyat varsa.
   */
  function chapelRow(s: CampaignState): HTMLElement | null {
    const price = surgeResetPrice(s.mapId);
    if (!atChapel(s) || price === null) return null;
    const uses = Math.max(0, Math.floor(s.surge?.uses ?? 0));
    const box = el('div', 'ec-chapel');
    const t = el('div');
    t.append(
      el('b', '', 'Chapel'),
      el('span', '', 'The priest washed away all Ashen Taint when you arrived.'),
      el(
        'span',
        'ec-note',
        uses > 0
          ? `You have called the Crown ${uses} time${uses === 1 ? '' : 's'}, so your next call gives ${nextTaintGain(s)} Taint. Ease the Crown and the count starts over: the next call gives ${SURGE.taint.firstGain} again.`
          : `The Crown asks little of you now: your next call gives ${nextTaintGain(s)} Taint.`,
      ),
    );
    const why = surgeResetBlocked(s);
    const b = button('', `Ease the Crown · ${price}`, () => {
      try {
        const next = resetSurgeUses(get());
        uiSound('buy');
        o.onSet?.(next);
        render();
      } catch {
        uiSound('error');
        render();
      }
    }, why);
    const gi = goldImg();
    if (gi) b.append(gi);
    box.append(t, b);
    if (why && uses > 0) box.append(el('span', 'ec-why', why));
    return box;
  }

  function renderUsed(s: CampaignState, k: CampChoice['kind']): void {
    const box = el('div', 'ec-used');
    const t = el('div');
    t.append(el('b', '', `Used: ${USED_NAME[k]}`), el('span', '', CONFIG.texts['campUsed'] ?? 'The camp is cold.'));
    box.append(t);
    const foot = el('div', 'ec-foot');
    foot.append(button('', 'Gear', () => o.onGear()), button('primary', 'Leave', () => sh.close()));
    body.append(box, foot);
    void s;
  }

  function heroTarget(s: CampaignState, k: 'tend' | 'train', h: Hero): HTMLElement {
    const why = campBlocked(s, { kind: k, heroId: h.id });
    const b = el('button', `ec-hero pick${target === h.id ? ' on' : ''}${why ? ' dim' : ''}`);
    b.type = 'button';
    if (why) {
      attachBandTip(b, reasonSpec(className(h.class), why));
      b.setAttribute('aria-disabled', 'true');
    }
    const t = el('div', 'ec-ht');
    const meta = el('div', 'ec-hm', `Lv ${h.level} · ${Math.round(h.hpRatio * 100)}% HP`);
    const w = woundCount(h);
    if (w > 0) {
      const pips = woundPipsEl(w, { rules: woundRules(), town: false });
      sh.woundTip(pips, w);
      meta.append(pips, `${w} wound${w === 1 ? '' : 's'}`);
    }
    t.append(el('div', 'ec-hn', className(h.class)), hpBar(h.hpRatio), meta);
    if (k === 'train' && !why) t.append(el('span', 'ec-heal', `+${campTrainXp(s, h.id)} XP`));
    if (why) t.append(el('span', 'ec-why', why));
    b.append(heroFace(h.class), t);
    b.addEventListener('click', () => {
      if (why) return uiSound('error');
      target = target === h.id ? '' : h.id;
      uiSound('select');
      render();
    });
    return b;
  }

  function preview(s: CampaignState): HTMLElement | null {
    const c = choice();
    if (!c) return null;
    const row = el('div', 'ec-prev');
    const arrow = (label: string, from: string, to: string): void => {
      row.append(el('b', '', label), el('span', '', from), el('span', 'ar', '→'), el('span', 'to', to));
    };
    if (c.kind === 'rest') {
      const heal = restHealOf(s);
      const avg = (f: (h: Hero) => number): number => {
        const hs = s.roster.filter((h) => h.alive && h.hpRatio > 0);
        return hs.length ? Math.round((hs.reduce((a, h) => a + f(h), 0) / hs.length) * 100) : 0;
      };
      arrow('Company HP', `${avg((h) => h.hpRatio)}%`, `${avg((h) => Math.min(1, h.hpRatio + heal))}%`);
    } else if (c.kind === 'tend') {
      const h = s.roster.find((x) => x.id === c.heroId);
      if (h) arrow(`${className(h.class)} wounds`, String(woundCount(h)), String(Math.max(0, woundCount(h) - CONFIG.camp.tendWounds)));
    } else if (c.kind === 'train') {
      const h = s.roster.find((x) => x.id === c.heroId);
      if (h) row.append(el('b', '', `${className(h.class)} gains`), el('span', 'to', `+${campTrainXp(s, h.id)} XP`));
    } else {
      const p = campSharpenPreview(s, c.uid);
      if (p?.after) arrow(itemDef(p.before.id)?.name ?? 'Item', `iL ${instanceIlvl(p.before)}`, `iL ${instanceIlvl(p.after)}`);
    }
    return row;
  }

  /** Dar sekme seridi (Rest / Tend wounds / Sharpen / Train): kartlarla ayni etkin / pasif mantik ve secim davranisi. Baslik satirina girer. */
  function campTabs(s: CampaignState): HTMLElement {
    const ct = el('div', 'ct');
    const restIco = miscImage('node:rest')?.url;
    for (const c of CAMP_CARDS) {
      const why = cardWhy(s, c.kind);
      const b = el('button', `ct-b${kind === c.kind ? ' on' : ''}`);
      b.type = 'button';
      b.disabled = !!why;
      if (why) attachBandTip(b, reasonSpec(c.name, why));
      const src = c.kind === 'rest' ? restIco : c.kind === 'sharpen' ? TEMPER_STONE_ICON : undefined;
      if (src) {
        const im = el('img');
        im.src = src;
        im.alt = '';
        b.append(im);
      } else b.append(el('i', '', c.kind === 'tend' ? '+' : 'XP'));
      b.append(el('span', '', c.name));
      b.addEventListener('click', () => {
        kind = kind === c.kind ? null : c.kind;
        target = '';
        rail = '';
        uiSound('select');
        render();
      });
      ct.append(b);
    }
    return ct;
  }

  /** Sharpen secimi: solda kahramanlar + Bag, sagda secili kahramanin yuva plakalari, altta secili item'in ayrintisi; altta Gear + Sharpen · item. */
  function renderSharpen(s: CampaignState): void {
    sh.head.insertBefore(campTabs(s), sh.head.querySelector('.ec-sub'));
    const chapel = chapelRow(s);
    if (chapel) body.append(chapel);

    // Sol ray: bugun sunulan her sahip (kadrodaki esyali kahraman + torba); esya eklenip cikarilmaz
    const owners: Array<{ id: string; name: string; sub: string; hero?: Hero; infos: SharpInfo[] }> = [];
    for (const h of s.roster) {
      const infos = SLOT_IDS.filter((k) => h.equipment[k]).map((k) => sharpInfo(s, h.equipment[k]!, h));
      if (infos.length) owners.push({ id: h.id, name: className(h.class), sub: `Lv ${h.level}`, hero: h, infos });
    }
    if (s.inventory.length) owners.push({ id: 'bag', name: 'Bag', sub: `${s.inventory.length} item${s.inventory.length === 1 ? '' : 's'}`, infos: s.inventory.map((i) => sharpInfo(s, i)) });
    const elig = (o: { infos: SharpInfo[] }): number => o.infos.filter((i) => !i.why).length;
    let cur = owners.find((o) => o.id === rail);
    if (!cur) {
      cur = owners.find((o) => elig(o) > 0) ?? owners[0];
      rail = cur?.id ?? '';
      target = '';
    }
    const curInfos = cur?.infos ?? [];
    if (!curInfos.some((i) => i.inst.uid === target)) target = (curInfos.find((i) => !i.why) ?? curInfos[0])?.inst.uid ?? '';
    const sel = curInfos.find((i) => i.inst.uid === target) ?? null;

    const grid = el('div', 'a-grid');
    const railEl = el('div', 'a-rail');
    for (const o of owners) {
      const b = el('button', `ec-hero sm pick${o.id === rail ? ' on' : ''}`);
      b.type = 'button';
      const face = o.hero ? heroFace(o.hero.class) : heroFace('bag', 'ec-face bag');
      if (!o.hero && hasUiImage('bag')) face.style.backgroundImage = `url(${iconUrl(uiIconName('bag'))})`;
      const t = el('div', 'ec-ht');
      t.append(el('div', 'ec-hn', o.name), el('div', 'ec-hm', `${o.sub} · ${elig(o)} to sharpen`));
      b.append(face, t);
      b.addEventListener('click', () => {
        if (o.id === rail) return;
        rail = o.id;
        target = '';
        uiSound('select');
        render();
      });
      railEl.append(b);
    }

    const plates = el('div', 'a-plates');
    const mk = (info: SharpInfo): HTMLElement => {
      const p = sharpPlate(info, info.inst.uid === target);
      sh.tipOn(p, `camp:${info.inst.uid}`, () => itemTipNodes(info.inst, info.hero?.class));
      p.addEventListener('click', () => {
        target = info.inst.uid;
        uiSound('select');
        render();
      });
      return p;
    };
    if (cur?.hero) for (const k of SLOT_IDS) {
      const info = curInfos.find((i) => i.inst.uid === cur.hero!.equipment[k]?.uid);
      plates.append(info ? mk(info) : emptyPlate(k));
    }
    else for (const info of curInfos) plates.append(mk(info));

    const detail = el('div', 'a-detail');
    detail.append(sharpDetail(sel));
    grid.append(railEl, plates, detail);
    body.append(grid);

    const foot = el('div', 'ec-foot');
    const why = sel ? sel.why : 'Pick an item first';
    foot.append(el('span', 'ec-note', 'One choice only: the camp is spent afterwards. You may leave and come back.'));
    if (why) foot.append(el('span', 'ec-why', why));
    foot.append(button('', 'Gear', () => o.onGear()), button('primary', sel ? `Sharpen · ${itemDef(sel.inst.id)?.name ?? ''}` : 'Sharpen', confirm, why));
    body.append(foot);
  }

  function render(): void {
    const s = get();
    body.replaceChildren();
    sh.head.querySelector('.ct')?.remove();
    const used = used0();
    const sharp = kind === 'sharpen' && !used;
    body.classList.toggle('ec-sharp', sharp);
    sh.panel.classList.toggle('sharp', sharp);
    // Tend wounds / Train secilince de kartlar dar seride iner (Omer 2026-11-02); Rest hedef istemez, kartlarda kalir
    const narrow = !used && (kind === 'tend' || kind === 'train');
    sh.panel.classList.toggle('strip', sharp || narrow);
    if (sharp) return renderSharpen(s);
    const ico = miscImage('node:rest')?.url;
    if (narrow) sh.head.insertBefore(campTabs(s), sh.head.querySelector('.ec-sub'));
    else {
      const fire = el('div', 'ec-fire');
      if (ico) {
        const im = el('img');
        im.src = ico;
        im.alt = '';
        im.draggable = false;
        fire.append(im);
      }
      fire.append(el('p', 'ec-rule', CONFIG.texts['camp'] ?? 'Make camp once. Choose one.'));
      body.append(fire);
    }
    const chapel = chapelRow(s);
    if (chapel) body.append(chapel);
    if (used) return renderUsed(s, used);

    if (!narrow) {
      const cards = el('div', 'ec-cards4');
      for (const c of CAMP_CARDS) {
        const why = cardWhy(s, c.kind);
        const b = el('button', `ec-card${kind === c.kind ? ' on' : ''}`);
        b.type = 'button';
        b.disabled = !!why;
        if (why) attachBandTip(b, reasonSpec(c.name, why));
        const ic = el('span', 'ec-card-ico');
        if (c.kind === 'rest' && ico) {
          const im = el('img');
          im.src = ico;
          im.alt = '';
          ic.append(im);
        } else if (c.kind === 'sharpen') {
          const im = el('img');
          im.src = TEMPER_STONE_ICON;
          im.alt = '';
          ic.append(im);
        } else ic.textContent = c.kind === 'tend' ? '+' : c.kind === 'train' ? 'XP' : '';
        b.append(ic, el('h4', '', c.name), el('p', '', cardDesc(c.kind, s)), el('small', '', why ?? TARGET_HINT[c.kind]));
        b.addEventListener('click', () => {
          kind = kind === c.kind ? null : c.kind;
          target = '';
          rail = '';
          uiSound('select');
          render();
        });
        cards.append(b);
      }
      body.append(cards);
    }

    // hedef bolumu
    if (kind === 'tend' || kind === 'train') {
      body.append(el('h4', 'ec-lab', `${USED_NAME[kind]} · who?`));
      const g = el('div', 'ec-heros');
      for (const h of activeHeroes(s)) g.append(heroTarget(s, kind, h));
      body.append(g);
    }

    const pv = preview(s);
    if (pv) body.append(pv);

    const c = choice();
    const foot = el('div', 'ec-foot');
    foot.append(el('span', 'ec-note', 'One choice only: the camp is spent afterwards. You may leave and come back.'), button('', 'Gear', () => o.onGear()));
    const label = !kind ? 'Choose' : kind === 'rest' ? 'Rest' : USED_NAME[kind];
    const why = !kind ? 'Pick one of the four' : c ? campBlocked(s, c) : kind === 'sharpen' ? 'Pick an item first' : 'Pick a hero first';
    foot.append(button('primary', label, confirm, why));
    body.append(foot);
  }

  render();
  return {
    close: () => sh.close(),
    destroy: () => {
      done = true;
      sh.close();
    },
    refresh: () => render(),
  };
}
