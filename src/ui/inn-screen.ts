/**
 * Inn ekrani (Omer 2026-10-26, taslak public/mockups/economy-ui.html bolum 2 A "iki sutun"): solda Inn'deki kahramanlar ("Fully healed in N days" +
 * Take back), sagda yoldaki takim (Leave here + bos yuvalar), altta yedekler (kisla; yalniz bilgi). Kural saf: src/campaign/state.ts (innGuests,
 * innLeaveBlocked, leaveAtInn, innTakeBlocked, takeFromInn). Engelliyse dugme pasif, neden ipucunda ve altinda yazili. Italik yok; oyun metni Ingilizce.
 */
import {
  CONFIG,
  activeHeroes,
  completionsPerDay,
  innGuests,
  innLeaveBlocked,
  innTakeBlocked,
  leaveAtInn,
  partyCap,
  recruitFromReserve,
  reserveTakeBlocked,
  takeFromInn,
  woundRules,
  type CampaignState,
  type Hero,
} from '../campaign';
import { woundCount } from '../progression/wounds';
import { className } from './character-panel';
import { woundPipsEl } from './wound-ui';
import { el, button, heroFace, hpBar, openShell } from './econ-shell';
import { healLine, innHealDays } from './econ-model';
import { INN_ICON, iconImg } from './temper-stone';
import { uiSound } from './ui-sound';

/**
 * Inn'i acar. `town` = kasaba adi, `townId` = kasaba dugum kimligi (yalniz buradaki misafirler). Dönen: kapat.
 * `onChange` her durum degisiminde (kayit icin) cagrilir.
 */
export function openInn(root: HTMLElement, get: () => CampaignState, set: (s: CampaignState) => void, o: { town: string; townId: string; onClose?: () => void }): () => void {
  const sh = openShell(root, { label: 'Inn', title: 'Inn', sub: o.town, lock: 'inn', closable: () => true, onClosed: () => o.onClose?.() });
  const body = sh.body;
  sh.head.prepend(iconImg(INN_ICON, 'ec-head-ico'));

  const act = (run: () => CampaignState, sound: 'buy' | 'select'): void => {
    try {
      set(run());
      uiSound(sound);
    } catch {
      uiSound('error');
    }
    render();
  };

  const wounds = (h: Hero): HTMLElement | null => {
    const n = woundCount(h);
    return n > 0 ? woundPipsEl(n, { rules: woundRules(), town: false }) : null;
  };

  /** Kahraman satiri: yuz, ad, can cubugu, yaralar; `right` sag kenara. */
  const heroRow = (h: Hero, cls: string, extra: HTMLElement[], right: HTMLElement | null, ghost?: number): HTMLElement => {
    const row = el('div', `ec-hero ${cls}`.trim());
    const t = el('div', 'ec-ht');
    t.append(el('div', 'ec-hn', className(h.class)), el('div', 'ec-hm', `Lv ${h.level}`), hpBar(h.hpRatio, ghost));
    const meta = el('div', 'ec-hm', `${Math.round(h.hpRatio * 100)}% HP`);
    const w = wounds(h);
    if (w) {
      sh.woundTip(w, woundCount(h));
      meta.append(w, `${woundCount(h)} wound${woundCount(h) === 1 ? '' : 's'}`);
    }
    t.append(meta, ...extra);
    row.append(heroFace(h.class), t);
    if (right) row.append(right);
    return row;
  };

  function render(): void {
    const s = get();
    const rate = CONFIG.inn;
    const guests = innGuests(s, o.townId);
    const team = activeHeroes(s);
    const cap = Math.max(team.length, partyCap(s));
    body.replaceChildren();

    const pct = Math.round(rate.healPerDay * 100);
    body.append(el('p', 'ec-rule', `Leave a hero here and they leave your company. Each day they recover ${pct}% health and ${rate.woundsPerDay} wound${rate.woundsPerDay === 1 ? '' : 's'}, and earn no experience. Only this town's inn can give them back.`));

    const grid = el('div', 'ec-grid2');

    // sol: Inn'deki kahramanlar
    const left = el('div', 'ec-col');
    left.append(el('h4', 'ec-lab', `At the Inn · ${guests.length} resting`));
    if (!guests.length) left.append(el('div', 'ec-empty', 'No one is resting here.'));
    for (const g of guests) {
      const days = innHealDays(g.hero, rate);
      const why = innTakeBlocked(s, g.hero.id);
      const heal = el('span', 'ec-heal', healLine(days));
      const a = el('div', 'ec-act');
      a.append(button('', 'Take back', () => act(() => takeFromInn(get(), g.hero.id), 'select'), why));
      if (why) a.append(el('span', 'ec-why', why));
      const next = Math.min(1, g.hero.hpRatio + rate.healPerDay);
      left.append(heroRow(g.hero, 'inn', [heal], a, next));
    }
    grid.append(left);

    // sag: yoldaki takim
    const right = el('div', 'ec-col');
    right.append(el('h4', 'ec-lab', `On the road · ${team.length} / ${cap}`));
    for (const h of team) {
      const why = innLeaveBlocked(s, h.id);
      const a = el('div', 'ec-act');
      a.append(button('', 'Leave here', () => act(() => leaveAtInn(get(), h.id), 'buy'), why));
      if (why) a.append(el('span', 'ec-why', why));
      right.append(heroRow(h, '', [], a));
    }
    for (let i = team.length; i < cap; i++) right.append(el('div', 'ec-empty', 'Empty slot · recruit at the barracks or travel short-handed'));
    grid.append(right);
    body.append(grid);

    // altta: yedekler (kisla; degisim kislada)
    const reserve = s.reserve ?? [];
    if (reserve.length) {
      body.append(el('h4', 'ec-lab', `Reserves · ${reserve.length}`));
      const r = el('div', 'ec-heros');
      for (const h of reserve) {
        const why = reserveTakeBlocked(s, h.id);
        const a = el('div', 'ec-act');
        a.append(button('', 'Join company', () => act(() => recruitFromReserve(get(), h.id), 'select'), why));
        if (why) a.append(el('span', 'ec-why', why));
        r.append(heroRow(h, why ? 'dim' : '', [], a));
      }
      body.append(r);
    }

    const foot = el('div', 'ec-foot');
    const per = completionsPerDay();
    foot.append(el('span', 'ec-note', per === 1 ? 'A day passes for every battle you win.' : `A day passes for every ${per} battles you win.`), button('primary', 'Done', () => sh.close()));
    body.append(foot);
  }

  render();
  return () => sh.close();
}
