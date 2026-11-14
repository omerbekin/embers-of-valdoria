// Respec malzemesi kullanımı (Ömer 2026-11-14): Supplies'ta Tome of Unlearning / Draught of Rebirth'e dokununca kahraman seçme penceresi.
// Ortak parça: harita penceresi A levhası + Recruit / Barracks kahraman kartları (map-window.ts > openMapWindow, body 'cards'). Her kartta harcanmış
// puan; sıfırlanacak bir şeyi olmayan ya da düşmüş kahraman soluk ve seçilemez. Seçince kısa onay satırı ("Reset X's skill tree? Points return."), birincil düğme
// sıfırlar. Zemine dokunma / X / Esc kapatır. Kural burada yok: kaynak (gear-screen.ts) `use` ile uygular (src/campaign/supply-use.ts).
import { content } from '../engine';
import { openMapWindow, type MwCard, type MwHandle } from './map-window';
import { uiSound } from './ui-sound';

export type RespecKind = 'tree' | 'stats';

export interface RespecSupplyView {
  id: string;
  name: string;
  text: string;
  kind: RespecKind;
  rarityName?: string;
}

export interface RespecHeroView {
  id: string;
  class: string;
  level: number;
  /** Bu malzemenin geri vereceği puan (0 = sıfırlanacak bir şey yok: kart soluk). */
  spent: number;
  fallen?: boolean;
}

/** Kartın etiketi: "Lv 7 · 6 skill points spent" / "Nothing to reset"; düşmüş kahraman: kullanamaz (Ömer 2026-11-14). */
export function respecCardTag(h: RespecHeroView, kind: RespecKind): string {
  if (h.fallen) return `Lv ${h.level} · Fallen heroes can't use this.`;
  const what = kind === 'tree' ? 'skill' : 'stat';
  const body = h.spent > 0 ? `${h.spent} ${what} point${h.spent === 1 ? '' : 's'} spent` : 'Nothing to reset';
  return `Lv ${h.level}${h.fallen ? ' · Fallen' : ''} · ${body}`;
}

/** Onay satırı. */
export function respecConfirmText(heroName: string, kind: RespecKind): string {
  return kind === 'tree' ? `Reset ${heroName}'s skill tree? Points return.` : `Reset ${heroName}'s stat points? Points return.`;
}

const nameOf = (cls: string): string => content.classes[cls]?.name ?? cls;

export function openRespecChooser(root: HTMLElement, o: { supply: RespecSupplyView; heroes: RespecHeroView[]; use: (heroId: string) => void; onClose: () => void }): MwHandle {
  const cards: MwCard[] = o.heroes.map((h) => {
    const d = content.classes[h.class];
    return { id: h.id, classId: h.class, spriteId: d?.spriteId ?? h.class, name: nameOf(h.class), color: d?.color ?? '#cdb67f', tag: respecCardTag(h, o.supply.kind), ...(h.spent > 0 && !h.fallen ? {} : { off: true }) };
  });
  const any = o.heroes.some((h) => h.spent > 0 && !h.fallen);
  let handle: MwHandle | null = null;
  const close = (): void => {
    window.removeEventListener('keydown', onKey, true);
    handle?.close();
    handle = null;
    o.onClose();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  const confirmLine = (picked: string): void => {
    const el = handle?.el;
    if (!el) return;
    let line = el.querySelector<HTMLElement>('.mw-confirm');
    const h = o.heroes.find((x) => x.id === picked);
    if (!h) return line?.remove();
    if (!line) {
      line = document.createElement('p');
      line.className = 'mw-confirm';
      el.querySelector('.mw-acts')?.before(line);
    }
    line.textContent = respecConfirmText(nameOf(h.class), o.supply.kind);
    uiSound('select');
  };
  handle = openMapWindow(root, {
    variant: 'A',
    type: 'event',
    kind: o.supply.rarityName ? `Supply · ${o.supply.rarityName}` : 'Supply',
    title: o.supply.name,
    paras: [o.supply.text, any ? 'Choose the hero.' : (o.supply.kind === 'tree' ? 'No hero has spent a skill point yet.' : 'No hero has spent a stat point yet.')],
    body: { k: 'cards', cards, onPick: confirmLine },
    acts: [
      { label: 'Cancel', run: () => close() },
      {
        label: 'Reset',
        primary: true,
        needPick: 'Choose a hero first.',
        run: (picked) => {
          if (!picked) return;
          o.use(picked);
          close();
        },
      },
    ],
    onDismiss: () => close(),
  });
  handle.el.classList.add('mw-respec');
  window.addEventListener('keydown', onKey, true); // window yakalama: Gear'ın document Esc'inden önce (yalnız pencere kapanır)
  return handle;
}
