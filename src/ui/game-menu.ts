import { MENU_LABELS, menuItems, type FlowContext, type MapMenuState, type MenuItemId } from '../game/session-flow';
import './motion';
import { uiSound } from './ui-sound';
import { dismissOnBackdrop } from './backdrop';
import { isSettingsOpen, setSettingsOpen } from './settings';
import { lockInput, unlockInput } from './input-lock';
import './elegant.css';
import { navSvg } from './nav-icons';

/**
 * Oyun içi Menu (Ömer 2026-10-08): sağ üstte Menu ikon düğmesi (sıranın en sağı; tam ekran solunda) + Esc.
 * Savaş (hızlı / sefer / multiplayer), takım seçimi ve multiplayer ekranlarında görünür; ana menüde yok, sefer haritası kendi menüsünü
 * kullanır (aynı düğme: `mountMenuToggle`). İçerik `menuItems(ctx)` (saf, `src/game/session-flow.ts`): Resume / Codex / Settings / Leave / Main Menu
 * (bağlama göre); devam eden savaştan çıkış onay ister. Menü açıkken savaş durur (wiki gibi).
 */

/**
 * Sağ üst "Menu" ikon düğmesi (Ömer 2026-10-14, ikon taslağı D): üç ince altın çizgi, ortadakinde küçük kor elmas; tam ekranla AYNI kare
 * (src/ui/nav-icons.ts). Sıranın en sağında; görünürken tam ekran bir adım sola kayar (`html.menu-btn-on`, style.css).
 */
export function mountMenuToggle(root: HTMLElement, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `nav-btn settings-toggle menu-toggle ${cls}`.trim();
  b.innerHTML = navSvg('menu');
  b.title = 'Menu (Esc)';
  b.setAttribute('aria-label', 'Menu (Esc)');
  b.addEventListener('click', onClick);
  b.addEventListener('mouseup', (e) => e.preventDefault()); // bırakma alttaki Phaser sahnesine gitmesin
  root.append(b);
  return b;
}

/** Menu düğmesi görünür mü: tam ekran düğmesi onun soluna geçer (style.css > html.menu-btn-on). */
function markMenuShown(on: boolean): void {
  document.documentElement.classList.toggle('menu-btn-on', on);
}

export interface GameMenuHooks {
  context: () => FlowContext;
  newGame: () => void;
  teamSelect: () => void;
  mainMenu: () => void;
  /** Codex'i aç (menü kapanır). */
  codex?: () => void;
  /** Sefer savaşından haritaya geri çekil (savaş sayılmaz). */
  retreat: () => void;
  /** Sefer haritası Menu'sü (aynı bileşen): sahnenin anlık durumu ve Save / Load eylemleri (src/game/session-flow.ts > MapMenuState). */
  mapMenu?: () => MapMenuState | null;
  save?: () => void;
  load?: () => void;
  /** Geri çekilme düğmesinin yazısı (endless: 'Retreat to Camp'); yoksa MENU_LABELS.retreat. */
  retreatLabel?: () => string | undefined;
  /** Geri çekilme onay sorusu (endless: savaş duraklar); yoksa spec.confirm.retreat. */
  retreatConfirm?: () => string | undefined;
  /** Menü (ya da üstündeki ayarlar ekranı) açıldı / kapandı: savaşı durdur / sürdür. */
  onOpen?: () => void;
  onClose?: () => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class GameMenu {
  private readonly overlay: HTMLDivElement;
  private readonly list: HTMLDivElement;
  private readonly confirmBox: HTMLDivElement;
  private readonly confirmText: HTMLDivElement;
  private readonly toggle: HTMLButtonElement;
  private open = false;
  private pending: (() => void) | null = null;
  private lastCtx: FlowContext | null = null;

  constructor(
    root: HTMLElement,
    private readonly hooks: GameMenuHooks,
  ) {
    this.toggle = mountMenuToggle(root, () => this.setOpen(!this.open), 'game-menu-toggle');
    this.toggle.hidden = true;
    this.overlay = el('div', 'gm-overlay el-modal'); // ortak pencere hareketi (elegant.css > .el-modal)
    this.overlay.hidden = true;
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Menu');
    const box = el('div', 'gm-box el-panel corners el-modal-panel');
    box.append(el('div', 'gm-title el-title', 'Menu'));
    this.list = el('div', 'gm-list');
    this.confirmBox = el('div', 'gm-confirm');
    this.confirmBox.hidden = true;
    this.confirmText = el('div', 'gm-confirm-text el-status');
    const answers = el('div', 'gm-confirm-row');
    const yes = this.button('Yes', true);
    const no = this.button('No');
    yes.addEventListener('click', () => {
      const action = this.pending;
      if (action) this.run(action);
    });
    no.addEventListener('click', () => this.hideConfirm());
    answers.append(no, yes); // kit kuralı: ikincil solda, birincil eylem en sağda
    this.confirmBox.append(this.confirmText, answers);
    box.append(this.list, this.confirmBox);
    this.overlay.append(box);
    // Boş zemine dokunmak menüyü kapatır (Resume ile aynı); onay sorusu açıksa yalnızca soruyu iptal eder (src/ui/backdrop.ts)
    dismissOnBackdrop(this.overlay, box, () => (this.confirmBox.hidden ? this.setOpen(false) : this.hideConfirm()));
    root.append(this.overlay);
    this.overlay.addEventListener('mouseup', (e) => e.preventDefault()); // bırakma alttaki Phaser düğmelerine gitmesin (+ giriş kilidi)

    // Esc: açık menüde önce onay kutusu, sonra menü kapanır; savaşın kendi Esc kısayollarına gitmez (ayarlar ekranı kendi Esc'ini önce alır)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || isSettingsOpen()) return;
        if (e.key === '`' || e.key === 'F2') return; // debug menüsü kısayolu çalışmaya devam eder
        e.stopImmediatePropagation(); // diğer kısayollar (1-4, Enter...) menü açıkken oyuna gitmez
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          // ↑ / ↓ satırlar (ya da onay düğmeleri) arasında dolaşır; Enter / Space odaktaki satırı seçer (düğmenin kendi davranışı)
          e.preventDefault();
          this.moveFocus(e.key === 'ArrowDown' ? 1 : -1);
          return;
        }
        if (e.key !== 'Escape') return;
        e.preventDefault();
        if (!this.confirmBox.hidden) this.hideConfirm();
        else this.setOpen(false);
      },
      true,
    );
    // Düğme etkin sahneyi izler (sahne değişince göster / gizle; açık menü sahne değişince kapanır)
    window.setInterval(() => this.sync(), 250);
    this.sync();
    registerGameMenu(this);
  }

  private button(label: string, primary = false): HTMLButtonElement {
    // Tasarım kiti (src/ui/elegant.css): Resume / Yes = primary, diğerleri secondary
    const b = el('button', `gm-btn el-btn${primary ? ' primary' : ''}`, label);
    b.type = 'button';
    return b;
  }

  /** Etkin sahneye göre Menu düğmesini göster / gizle. */
  sync(): void {
    const ctx = this.hooks.context();
    const has = !!menuItems(ctx, this.hooks.mapMenu?.());
    // 250 ms'de bir çalışır: yalnızca değişince DOM'a yazılır ve stil ölçülür (her seferinde hidden yazmak + getComputedStyle boşta
    // sürekli stil hesabı demekti; Ömer 2026-10-11 performans denetimi)
    if (this.toggle.hidden !== !has) {
      this.toggle.hidden = !has;
      markMenuShown(has);
    }
    const sceneChanged = this.lastCtx !== null && sceneOf(this.lastCtx) !== sceneOf(ctx);
    this.lastCtx = ctx;
    if (this.open && (!has || sceneChanged)) this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Esc'in sahnelerden çağrılan yolu: menü yoksa açar, varsa kapatır. Menü bu bağlamda yoksa false. */
  toggleOpen(): boolean {
    if (!menuItems(this.hooks.context(), this.hooks.mapMenu?.())) return false;
    this.setOpen(!this.open);
    return true;
  }

  setOpen(open: boolean): void {
    if (open === this.open) return;
    const spec = open ? menuItems(this.hooks.context(), this.hooks.mapMenu?.()) : null;
    if (open && !spec) return;
    this.open = open;
    uiSound(open ? 'open' : 'close');
    this.overlay.hidden = !open;
    if (open) lockInput('game-menu');
    else unlockInput('game-menu');
    this.hideConfirm();
    if (spec) this.build(spec);
    if (!open && isSettingsOpen()) setSettingsOpen(false);
    if (open) this.hooks.onOpen?.();
    else this.hooks.onClose?.();
  }

  private build(spec: NonNullable<ReturnType<typeof menuItems>>): void {
    this.list.replaceChildren();
    const icons: Array<[MenuItemId, HTMLImageElement]> = [];
    for (const id of spec.items) {
      // Kutusuz, ortalı satır (Ömer 2026-10-12): ikon + yazı birlikte ortada, ince ayırıcı; Yes / No onay düğmeleri kit düğmesi kalır
      const b = el('button', `gm-row${id === 'resume' ? ' primary' : ''}`);
      b.type = 'button';
      const icon = el('img', 'gm-icon');
      icon.alt = '';
      icon.draggable = false;
      icons.push([id, icon]);
      b.append(icon, el('span', '', (id === 'retreat' ? this.hooks.retreatLabel?.() : undefined) ?? spec.labels?.[id] ?? MENU_LABELS[id]));
      b.dataset.item = id;
      b.addEventListener('click', () => this.pick(id, id === 'retreat' && spec.confirm[id] ? this.hooks.retreatConfirm?.() ?? spec.confirm[id] : spec.confirm[id]));
      this.list.append(b);
    }
    // İkonlar tembel yüklenir (src/ui/menu-icons.ts: ikon motoru ana menünün ilk indirmesine girmesin); yer önceden ayrılı, satır kaymaz
    void import('./menu-icons').then(({ menuIconUrl }) => {
      for (const [id, img] of icons) {
        const url = menuIconUrl(id);
        if (url) img.src = url;
        else img.classList.add('empty');
      }
    });
  }

  /** Klavye odağını görünen satırlar (ya da onay düğmeleri) arasında bir adım taşır (sonda başa döner). */
  private moveFocus(step: number): void {
    const host = this.confirmBox.hidden ? this.list : this.confirmBox;
    const items = [...host.querySelectorAll<HTMLButtonElement>('button')];
    if (!items.length) return;
    // Odak yoksa başlangıç seçili satırdır (Resume, vurgulu); ilk ↓ ondan sonrakine geçer
    const focused = items.indexOf(document.activeElement as HTMLButtonElement);
    const at = focused >= 0 ? focused : items.findIndex((b) => b.classList.contains('primary'));
    const next = at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
    items[next]!.focus({ preventScroll: true });
  }

  private pick(id: MenuItemId, confirm: string | undefined): void {
    if (id !== 'resume') uiSound('select');
    switch (id) {
      case 'resume':
        return this.setOpen(false);
      case 'codex':
        this.setOpen(false);
        return this.hooks.codex?.();
      case 'settings':
        // Ayarlar ekranı menünün üstünde açılır; Back / Esc onu kapatınca menü yeniden görünür (savaş durmaya devam eder)
        return setSettingsOpen(true);
      case 'newGame':
        return this.ask(this.hooks.newGame, confirm);
      case 'teamSelect':
        return this.ask(this.hooks.teamSelect, confirm);
      case 'retreat':
        return this.ask(this.hooks.retreat, confirm);
      case 'save':
        return this.hooks.save ? this.run(this.hooks.save) : undefined;
      case 'load':
        return this.hooks.load ? this.run(this.hooks.load) : undefined;
      case 'mainMenu':
        return this.ask(this.hooks.mainMenu, confirm);
    }
  }

  private ask(action: () => void, confirm: string | undefined): void {
    if (!confirm) return this.run(action);
    this.pending = action;
    this.confirmText.textContent = confirm;
    this.list.hidden = true;
    this.confirmBox.hidden = false;
  }

  private hideConfirm(): void {
    this.pending = null;
    this.confirmBox.hidden = true;
    this.list.hidden = false;
  }

  private run(action: () => void): void {
    this.setOpen(false);
    action();
  }
}

/** Bağlamın ait olduğu sahne (canlı -> bitti geçişi sahne değişimi sayılmaz). */
function sceneOf(ctx: FlowContext): string {
  if (ctx.startsWith('battle')) return 'battle';
  if (ctx.startsWith('campaign-battle')) return 'campaign-battle';
  if (ctx === 'mp-live') return 'mp';
  return ctx;
}

let instance: GameMenu | null = null;
function registerGameMenu(menu: GameMenu): void {
  instance = menu;
}
/** Sahnelerin Esc işleyicisi: kendi Esc işi yoksa menüyü aç / kapat. */
export function toggleGameMenu(): boolean {
  return instance?.toggleOpen() ?? false;
}
export function isGameMenuOpen(): boolean {
  return instance?.isOpen ?? false;
}
export function setGameMenuOpen(open: boolean): void {
  instance?.setOpen(open);
}
