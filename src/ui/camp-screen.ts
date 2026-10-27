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
import { instanceIlvl, itemDef, type ItemInstance } from '../progression';
import { woundCount } from '../progression/wounds';
import { SLOT_IDS } from '../progression';
import { className, itemPlate } from './character-panel';
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
  let done = false;
  const used0 = (): CampChoice['kind'] | null => campUsed(get());
  const sh = openShell(root, { label: 'Camp', title: 'Camp', sub: o.name, lock: 'camp', closable: () => true, onClosed: () => o.onClose?.(done || !!used0()), wide: true });
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
   * Chapel satırı (Ömer 2026-10-27, open-questions 445): varışta Taint bedava silindi; altınla Surge kullanım sayacı başa döner (kamp seçimi değil,
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
      b.title = why;
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

  function render(): void {
    const s = get();
    body.replaceChildren();
    const used = used0();
    const fire = el('div', 'ec-fire');
    const ico = miscImage('node:rest')?.url;
    if (ico) {
      const im = el('img');
      im.src = ico;
      im.alt = '';
      im.draggable = false;
      fire.append(im);
    }
    fire.append(el('p', 'ec-rule', CONFIG.texts['camp'] ?? 'Make camp once. Choose one.'));
    body.append(fire);
    const chapel = chapelRow(s);
    if (chapel) body.append(chapel);
    if (used) return renderUsed(s, used);

    const cards = el('div', 'ec-cards4');
    for (const c of CAMP_CARDS) {
      const why = cardWhy(s, c.kind);
      const b = el('button', `ec-card${kind === c.kind ? ' on' : ''}`);
      b.type = 'button';
      b.disabled = !!why;
      if (why) b.title = why;
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
        uiSound('select');
        render();
      });
      cards.append(b);
    }
    body.append(cards);

    // hedef bolumu
    if (kind === 'tend' || kind === 'train') {
      body.append(el('h4', 'ec-lab', `${USED_NAME[kind]} · who?`));
      const g = el('div', 'ec-heros');
      for (const h of activeHeroes(s)) g.append(heroTarget(s, kind, h));
      body.append(g);
    } else if (kind === 'sharpen') {
      body.append(el('h4', 'ec-lab', 'Sharpen · which item?'));
      const g = el('div', 'ec-plates');
      for (const { inst, hero } of items(s)) {
        const why = campBlocked(s, { kind: 'sharpen', uid: inst.uid });
        const owner = hero ? el('span', 'ec-note', className(hero.class)) : undefined;
        const p = itemPlate(inst, hero?.class, owner);
        if (target === inst.uid) p.classList.add('on');
        if (why) {
          p.style.opacity = '.45';
          p.title = why;
        }
        sh.tipOn(p, `camp:${inst.uid}`, () => itemTipNodes(inst, hero?.class));
        p.addEventListener('click', () => {
          if (why) return uiSound('error');
          target = target === inst.uid ? '' : inst.uid;
          uiSound('select');
          render();
        });
        g.append(p);
      }
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
