import Phaser from 'phaser';
import { menuMusic } from '../../ui/music';
import { formatLobbyCode, normalizeLobbyCode } from '../../net/lobby-code';
import { sanitizeName } from '../../net/protocol';
import { copyText, openExternal, promptCode, promptName, showCopyBox, toast } from '../../ui/mp-overlay';
import { DISCORD_APP_URL, inviteMessage, whatsappShareUrl } from '../../net/share-invite';
import { preloadCampaignArt } from '../campaign-art';
import { mapArt } from '../map-art';
import { getMap } from '../../campaign';
import { W, H } from '../campaign-ui';
import { buildBackdrop } from '../menu-ui';
import { mp, MP_SCENE, takeMultiplayerBoot } from '../mp-client';
import { EL, elBack, elBody, elButton, elGo, elHeading, elPanel, elScreenIn, elText } from '../elegant-ui';
import { debugState } from '../debug-state';

/**
 * Multiplayer ekranı (docs/design/multiplayer.md): Host lobby / Join lobby menüsü, bağlanma, lobi (büyük kod, Copy code,
 * Copy invite link, paylaşım satırı: Share (varsa sistem paylaşımı) / WhatsApp / Discord, rakip göstergesi, Ready) ve hata. İçerik her multiplayer değişikliğinde baştan çizilir.
 */
export class MultiplayerScene extends Phaser.Scene {
  static readonly KEY = MP_SCENE;
  private layer!: Phaser.GameObjects.Container;
  private off: (() => void) | null = null;

  constructor() {
    super(MultiplayerScene.KEY);
  }

  preload(): void {
    preloadCampaignArt(this);
    // paylaşım düğmelerinin küçük SVG glifleri (marka logosu dosyası yok; kit yazı rengi)
    for (const [key, svg] of Object.entries(SHARE_ICONS)) if (!this.textures.exists(key)) this.load.image(key, `data:image/svg+xml;base64,${btoa(svg)}`);
  }

  create(): void {
    menuMusic(true); // kurulum ekranı: ana menü müziği sürer (savaştan dönüşte yumuşak geçişle)
    elScreenIn(this); // ortak ekran geçişi (data/ui-motion.json > screen; Reduced motion = anında)
    const art = mapArt(this, getMap('valdoria')); // geniş harita görseli varsa o (eski 16:9 bölgesi eski yerinde)
    buildBackdrop(this, W, H, art?.key ?? null, art?.region);
    this.layer = this.add.container(0, 0).setDepth(100);
    // Kurulum ekranı: sol üstte ◂ Back / Esc (Menu yok; CLAUDE.md > Geri / Menu kuralı)
    elBack(this, () => this.back(), { depth: 200 });
    this.input.keyboard?.on('keydown-ESC', () => !debugState.uiPaused && this.back());
    this.off = mp.onChange(() => this.scene.isActive() && this.draw());
    this.events.once('shutdown', () => {
      this.off?.();
      this.off = null;
    });
    const boot = takeMultiplayerBoot();
    if (boot && !mp.active) {
      if ('join' in boot) mp.join(boot.join);
      else {
        const s = mp.pendingRejoin();
        if (s) mp.rejoin(s);
      }
    }
    this.draw();
  }

  /** ◂ Back / Esc: bağlantı hatasından menüye, bağlanırken iptal, lobiden ayrıl, menüden ana menünün Play kartlarına (onaysız). */
  private back(): void {
    if (mp.state === 'error') {
      mp.state = 'idle';
      mp.error = '';
      this.draw();
      return;
    }
    if (mp.state === 'connecting') return mp.leave();
    if (mp.active) mp.leave();
    elGo(this, 'MainMenuScene', { view: 'play' });
  }

  /** Yazı (tasarım kiti): `bold: false` = EB Garamond italik açıklama, diğerleri Cinzel. */
  private kt(x: number, y: number, text: string, size: number, color: string = EL.TXT, o: { bold?: boolean; stroke?: number; spacing?: number } = {}): Phaser.GameObjects.Text {
    if (o.bold === false) return elBody(this, x, y, text, size + 1, color === '#a8977a' ? EL.MUTED : color);
    return elText(this, x, y, text, Math.round(size * 0.8), color, { em: 0.06, upper: false });
  }

  private draw(): void {
    this.layer.removeAll(true);
    const L = this.layer;
    L.add(elHeading(this, W / 2, 130, 'Multiplayer', 64));
    L.add(this.kt(W / 2, 210, 'Quick Battle against a friend', 30, '#d8c49a', { bold: false, spacing: 3 }).setOrigin(0.5));
    if (mp.state === 'error') return this.drawError();
    if (mp.state === 'connecting') return this.drawConnecting();
    if (mp.active) return this.drawLobby();
    this.drawMenu();
  }

  private button(x: number, y: number, w: number, label: string, run: () => void, primary = false, enabled = true, icon?: string): void {
    // tasarım kiti düğmesi (primary = START dili); pasifse soluk, dokununca sallanır
    const b = elButton(this, label, () => (enabled ? run() : b.shake()), { kind: primary ? 'primary' : 'secondary', w, h: primary ? 84 : 68, size: primary ? 28 : 22, ready: enabled, icon: icon && this.textures.exists(icon) ? icon : undefined, iconSize: 30 });
    b.root.setPosition(x, y);
    this.layer.add(b.root);
  }

  private drawMenu(): void {
    const ok = !!mp.serverUrl();
    if (!ok) {
      this.layer.add(this.kt(W / 2, 330, 'Server not configured', 34, '#e08a7a').setOrigin(0.5));
      this.layer.add(this.kt(W / 2, 380, 'The multiplayer server address has not been set up yet.', 22, '#a8977a', { bold: false, stroke: 2 }).setOrigin(0.5));
    }
    this.nameLine(W / 2, ok ? 300 : 440);
    const y0 = ok ? 420 : 520;
    this.button(W / 2, y0, 560, 'Host lobby', () => mp.host(), true, ok);
    this.layer.add(this.kt(W / 2, y0 + 62, 'Create a lobby and share its code', 19, '#a8977a', { bold: false, stroke: 2 }).setOrigin(0.5));
    this.button(W / 2, y0 + 160, 560, 'Join lobby', () => void this.askCode(), false, ok);
    this.layer.add(this.kt(W / 2, y0 + 222, "Enter a friend's lobby code", 19, '#a8977a', { bold: false, stroke: 2 }).setOrigin(0.5));
  }

  /** "Name: X  [Change name]" satırı (ad isteğe bağlı; yalnızca rakibe gider). */
  private nameLine(cx: number, y: number): void {
    const { local } = mp.names();
    this.layer.add(this.kt(cx - 30, y, `Name: ${local}`, 26, '#f3e4c4').setOrigin(1, 0.5));
    const b = elButton(this, 'Change name', () => void this.askName(), { kind: 'secondary', w: 240, h: 52, size: 16 });
    b.root.setPosition(cx + 130, y);
    this.layer.add(b.root);
  }

  private async askName(): Promise<void> {
    const name = await promptName(mp.session?.localName ?? '', sanitizeName);
    if (name !== null && this.scene.isActive()) {
      mp.setName(name);
      this.draw();
    }
  }

  private async askCode(): Promise<void> {
    const code = await promptCode(normalizeLobbyCode);
    if (code && this.scene.isActive()) mp.join(code);
  }

  private drawConnecting(): void {
    this.layer.add(this.kt(W / 2, 470, mp.role === 'host' ? 'Opening the lobby...' : `Joining lobby ${formatLobbyCode(mp.code)}...`, 40, '#f3e4c4').setOrigin(0.5));
    this.button(W / 2, 640, 400, 'Cancel', () => mp.leave());
  }

  private drawError(): void {
    this.layer.add(this.kt(W / 2, 460, mp.error || 'Something went wrong', 38, '#e08a7a').setOrigin(0.5));
  }

  private drawLobby(): void {
    const s = mp.session!;
    const L = this.layer;
    // --- Kod paneli ---
    const pw = 1000;
    const px = W / 2 - pw / 2;
    L.add(elPanel(this, px, 252, pw, 372, { corners: true, alpha: 0.95 }));
    L.add(this.kt(W / 2, 290, mp.isFake ? 'LOCAL TEST LOBBY (FAKE OPPONENT)' : 'LOBBY CODE', 24, '#c9b27a', { spacing: 6, stroke: 2 }).setOrigin(0.5));
    L.add(elText(this, W / 2, 372, mp.isFake ? 'LOCAL' : formatLobbyCode(mp.code), 110, '#ffffff', { em: 0.16 }).setOrigin(0.5).setTint(0xfbe7b0, 0xfbe7b0, 0xc7984f, 0xc7984f));
    const copy = async (text: string, what: string) => toast((await copyText(text)) ? `${what} copied` : 'Could not copy - select it by hand');
    if (!mp.isFake) {
      this.button(W / 2 - 230, 478, 400, 'Copy code', () => void copy(mp.code, 'Code'));
      this.button(W / 2 + 230, 478, 400, 'Copy invite link', () => void copy(mp.inviteLink(), 'Invite link'));
      this.drawShareRow(566);
    }
    // --- Oyuncular ---
    const rowY = 700;
    const names = mp.names();
    const you = `${names.local} (you, ${mp.role === 'host' ? 'host, left side' : 'right side'})`;
    const opp = `${names.remote} (${mp.role === 'host' ? 'right side' : 'host, left side'})`;
    const link = s.linkStatus();
    const oppState = s.connected ? (s.ready.remote ? 'Ready' : 'Connected') : s.everConnected && link.phase === 'waiting' ? 'Disconnected...' : 'Waiting for opponent...';
    const rows: Array<[string, string, string]> = [
      [you, s.ready.local ? 'Ready' : 'Not ready', s.ready.local ? '#9be29a' : '#c9b48a'],
      [opp, oppState, s.connected ? (s.ready.remote ? '#9be29a' : '#9cc4ff') : '#e0b07a'],
    ];
    rows.forEach(([who, st, hex], i) => {
      const y = rowY + i * 68;
      L.add(elPanel(this, W / 2 - 500, y - 30, 1000, 60, { alpha: 0.9, border: 0.3 }));
      const dot = this.add.graphics();
      dot.fillStyle(Phaser.Display.Color.HexStringToColor(hex).color, 1).fillCircle(W / 2 - 460, y, 10);
      L.add(dot);
      L.add(this.kt(W / 2 - 430, y, who, 26, '#f3e4c4').setOrigin(0, 0.5));
      L.add(this.kt(W / 2 + 470, y, st, 26, hex).setOrigin(1, 0.5));
    });
    if (mp.channelMode === 'relay') L.add(this.kt(W / 2, 648, 'Connected through the server (direct link was not possible)', 18, '#9cc4ff', { bold: false, stroke: 2 }).setOrigin(0.5));
    this.nameLine(W / 2, 1024);
    L.add(this.kt(W / 2, 836, s.connected ? 'Both players press Ready to choose teams (4 champions each).' : 'Share the code or the invite link with your friend.', 22, '#a8977a', { bold: false, stroke: 2 }).setOrigin(0.5));
    // Kit kuralı: ikincil (Leave) solda, birincil (Ready) en sağda
    this.button(W / 2 - 230, 926, 400, 'Leave', () => {
      mp.leave();
      elGo(this, 'MainMenuScene');
    });
    this.button(W / 2 + 230, 926, 400, s.ready.local ? 'Not ready' : 'Ready', () => s.setReady(!s.ready.local), !s.ready.local, s.connected || s.ready.local);
  }

  /**
   * Paylaşım satırı (kod panelinin altı): Share (yalnızca sistem paylaşımı olan tarayıcıda; telefonda WhatsApp/Discord da içinde),
   * WhatsApp (hazır mesajla wa.me) ve Discord (mesaj panoya, sonra Discord açılır; Discord hazır mesaj linki desteklemez).
   */
  private drawShareRow(y: number): void {
    const message = () => inviteMessage(mp.code, mp.inviteLink());
    const items: Array<[string, string, () => void]> = [];
    if (typeof navigator.share === 'function') {
      items.push(['Share', 'mp-ic-share', () => void navigator.share({ title: 'Embers of Valdoria', text: message() }).catch(() => undefined)]);
    }
    items.push(['WhatsApp', 'mp-ic-whatsapp', () => openExternal(whatsappShareUrl(message()))]);
    items.push(['Discord', 'mp-ic-discord', () => void this.shareDiscord(message())]);
    const w = items.length === 3 ? 300 : 400;
    const step = items.length === 3 ? 320 : 460;
    items.forEach(([label, icon, run], i) => this.button(W / 2 + (i - (items.length - 1) / 2) * step, y, w, label, run, false, true, icon));
  }

  private async shareDiscord(text: string): Promise<void> {
    // panoya yazma tıklamanın içinde başlar; Discord yeni sekmede (lobi sekmesi açık kalır, bağlantı kopmaz)
    if (await copyText(text)) {
      openExternal(DISCORD_APP_URL);
      toast('Invite copied — paste it in Discord', 5000);
    } else showCopyBox(text, { label: 'Open Discord', run: () => openExternal(DISCORD_APP_URL) });
  }
}

/** Paylaşım glifleri (24x24 çizim alanı, 96 px doku; kit yazı rengi). Marka logosu değil, tanınır basit işaretler. */
const GLYPH = '#f3e4c4';
const svg24 = (body: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24">${body}</svg>`;
const SHARE_ICONS: Record<string, string> = {
  // üç düğüm, iki bağ (sistem paylaşımı)
  'mp-ic-share': svg24(
    `<g fill="none" stroke="${GLYPH}" stroke-width="1.8" stroke-linecap="round"><path d="M8.6 10.7l6.8-3.9M8.6 13.3l6.8 3.9"/></g><g fill="${GLYPH}"><circle cx="18" cy="5.5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="18.5" r="2.8"/></g>`,
  ),
  // yuvarlak konuşma balonu + ahize (WhatsApp)
  'mp-ic-whatsapp': svg24(
    `<path d="M12 2.6a9.3 9.3 0 0 0-8 14l-1.3 4.8 4.9-1.3A9.3 9.3 0 1 0 12 2.6z" fill="none" stroke="${GLYPH}" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.7 7.6c.3-.4.8-.4 1 0l.9 1.9c.1.3 0 .6-.2.8l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.2-.2.5-.3.8-.2l1.9.9c.4.2.4.7 0 1-.9.9-2 1.2-3.2.6a9 9 0 0 1-4.6-4.6c-.6-1.2-.3-2.4.5-3.3z" fill="${GLYPH}"/>`,
  ),
  // oyun kumandası yüzü: yuvarlak gövde, iki göz (Discord)
  'mp-ic-discord': svg24(
    `<path d="M7.4 5.2c1.5-.6 3-.9 4.6-.9s3.1.3 4.6.9c1.9 2.6 2.9 5.6 2.8 9-1.4 1.1-3 1.9-4.7 2.4l-1-1.6c-1.1.2-2.3.2-3.4 0l-1 1.6c-1.7-.5-3.3-1.3-4.7-2.4-.1-3.4.9-6.4 2.8-9z" fill="${GLYPH}"/><g fill="#1a120a"><ellipse cx="9.3" cy="11.6" rx="1.4" ry="1.6"/><ellipse cx="14.7" cy="11.6" rx="1.4" ry="1.6"/></g>`,
  ),
};
