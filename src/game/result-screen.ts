import Phaser from 'phaser';
import { motion, TYPE } from '../ui/motion';
import type { Battle, BattleEvent, Combatant, Side } from '../engine';
import { debugState } from './debug-state';
import { copyMatchData } from '../ui/match-copy';
import { fitText } from './menu-ui';
import { EL, elBody, elButton, elText, diamondPts, hGradient, vGradient, type ElButton } from './elegant-ui';
import { tierStyle, unitName } from './unit-label';
import { FULL_W, FULL_X0 } from '../ui/viewport';
import { stageView } from './stage-view';
import { gateActions } from './result-actions';
import { ensureIcon } from './icons';
import { statIconName } from '../ui/stat-icons';
import { uiIconName } from '../ui/ui-icons';
import { classLogoName, hasMiscImage } from '../ui/misc-icons';
import { ownerOfUnit } from './asset-versions';

/**
 * Savaş sonu ekranı (VICTORY / DEFEAT), "A · Plates" düzeni (public/mockups/battle-result.html): üstte A-Band plaket (şerit, ikon, başlık,
 * Turns / Standing), ortada iki takımın plaka satırları, altında tek özet şeridi, en altta düğmeler (CONTINUE en sağda).
 * Oyun kuralı bilmez: sayılar yalnızca olay akışından (`BattleStats`) ve birimlerin son canından okunur.
 */

/** Taraf başına en büyük vuruş (tek hasar olayı). */
export interface BigHit {
  amount: number;
  /** Vuran birimin adı (çağrıysa kendi adı). */
  name: string;
}

/** Olay akışından (damage / heal / turnStart / block / dodge) biriktirilen savaş sayaçları. Çağrılanların sayıları sahibine yazılır. */
export class BattleStats {
  /** Savaşta oynanan toplam sıra (turnStart olayları). */
  turns = 0;
  readonly dealt = new Map<string, number>();
  readonly taken = new Map<string, number>();
  readonly healed = new Map<string, number>();
  /** Taraf başına en büyük vuruş (düşmana yapılan skill hasarı). */
  readonly biggest: Record<Side, BigHit | null> = { party: null, enemy: null };
  /** Taraf başına kritik vuruş sayısı (o tarafın düşmana yaptığı). */
  readonly crits: Record<Side, number> = { party: 0, enemy: 0 };
  /** Taraf başına blok sayısı (o tarafın birimi kalkanıyla vuruşu tamamen blokladı). */
  readonly blocks: Record<Side, number> = { party: 0, enemy: 0 };
  /** Taraf başına kaçınma sayısı (o tarafın birimi vuruştan kaçındı). */
  readonly dodges: Record<Side, number> = { party: 0, enemy: 0 };

  constructor(private readonly battle: Battle) {}

  /** Çağrılan birim ise sahibinin uid'i, değilse kendi uid'i. */
  private credit(uid: string): string {
    const c = this.battle.get(uid);
    return c?.summoned && c.owner ? c.owner : uid;
  }

  private add(map: Map<string, number>, uid: string, n: number): void {
    map.set(uid, (map.get(uid) ?? 0) + n);
  }

  record(e: BattleEvent): void {
    if (e.type === 'turnStart') this.turns++;
    else if (e.type === 'damage') {
      const a0 = this.battle.get(e.source);
      const b0 = this.battle.get(e.target);
      // Özet şeridi: yalnızca düşmana yapılan skill vuruşları (yer / durum / kendine hasar sayılmaz)
      if (a0 && b0 && a0.side !== b0.side && (!e.origin || e.origin === 'skill')) {
        if (e.crit) this.crits[a0.side]++;
        const best = this.biggest[a0.side];
        if (e.amount > 0 && (!best || e.amount > best.amount)) this.biggest[a0.side] = { amount: e.amount, name: unitName(a0) };
      }
      if (e.amount <= 0) return;
      const src = this.credit(e.source);
      const dst = this.credit(e.target);
      this.add(this.taken, dst, e.amount);
      const a = this.battle.get(src);
      const b = this.battle.get(dst);
      if (src !== dst && a && b && a.side !== b.side) this.add(this.dealt, src, e.amount);
    } else if (e.type === 'heal') {
      if (e.amount > 0) this.add(this.healed, this.credit(e.source), e.amount);
    } else if (e.type === 'block') {
      const t = this.battle.get(e.target);
      if (t) this.blocks[t.side]++;
    } else if (e.type === 'dodge') {
      const t = this.battle.get(e.target);
      if (t) this.dodges[t.side]++;
    }
  }
}

export interface ResultScreenOptions {
  victory: boolean;
  battle: Battle;
  stats: BattleStats;
  /** Birimin kafa avatarı (BattleScene.avatarImage). */
  avatar: (unit: Combatant, cx: number, cy: number, size: number) => Phaser.GameObjects.Image;
  onNewGame: () => void;
  onTeamSelect: () => void;
  /** Ekran kapanınca (önizleme Close, destroy): savaş arayüzünü geri getirmek için. */
  onClose?: () => void;
  /** Maç kaydı (Copy match data bağlantısı); yoksa bağlantı gösterilmez. */
  matchData?: () => { text: string; moves: number } | null;
  /** Debug önizlemesi: gerçek savaş bitmedi; "Close" düğmesi + Esc ile kapanır. */
  preview?: boolean;
  /** Sefer savaşı: New Game / Team Select yerine bu düğmeler (Continue, Load Last Save, Load Game, Main Menu). Enter = ilk düğme. */
  actions?: ResultAction[];
  /** Multiplayer: yerel oyuncunun tarafı (katılan sağ taraf = 'enemy'); yoksa 'party'. */
  localSide?: 'party' | 'enemy';
  /** Multiplayer: başlık ve alt yazı yerine (ör. 'NO CONTEST', 'Your opponent left the battle'). */
  title?: string;
  subtitle?: string;
  /** Multiplayer: sütun başlıkları (yerel ve rakip oyuncunun adı). */
  headings?: { local: string; remote: string };
  /** Multiplayer: düğmelerin üstündeki canlı durum satırı (ör. 'Opponent left the match'); ~4 kez/sn okunur, '' = gizli. */
  status?: () => { text: string; tone: 'info' | 'warn' | 'error' };
}

/** Sonuç ekranının özel düğmesi (sefer bağlamı: src/game/campaign-session.ts). */
export interface ResultAction {
  label: string;
  primary?: boolean;
  run: () => void;
  /**
   * Tekrar basılabilir aç/kapa düğmesi (multiplayer Rematch / Cancel rematch). Diğer düğmeler ekranı terk eder ve yalnızca bir kez
   * çalışır; tekrarlanabilir düğme onları ASLA kilitlemez (canlı hata 2026-10-10: Rematch'ten sonra Back to lobby tıklanmıyordu).
   */
  repeatable?: boolean;
  /** Canlı görünüm (~4 kez/sn okunur): yazı ve basılabilirlik. Yoksa sabit `label`, hep etkin. */
  view?: () => { label: string; enabled: boolean };
}

export interface ResultScreen {
  destroy(): void;
}

const W = 1920;
const H = 1080;
const DEPTH = 6000;


/** Ortası elmaslı ince süs çizgisi (merkez cx, cy). */
function ornamentLine(scene: Phaser.Scene, cx: number, cy: number, half: number, edge: number, light: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  for (const dir of [-1, 1]) {
    g.lineStyle(1, edge, 0.85).lineBetween(cx + dir * 16, cy, cx + dir * half, cy);
    g.lineStyle(1, light, 0.55).lineBetween(cx + dir * 16, cy + 4, cx + dir * (half - 30), cy + 4);
    g.fillStyle(light, 0.9).fillCircle(cx + dir * half, cy, 3);
  }
  const d = 8;
  const pts = [new Phaser.Math.Vector2(cx, cy - d), new Phaser.Math.Vector2(cx + d, cy), new Phaser.Math.Vector2(cx, cy + d), new Phaser.Math.Vector2(cx - d, cy)];
  g.fillStyle(0x1a1008, 1).fillPoints(pts, true);
  g.lineStyle(1.5, light, 1).strokePoints(pts, true);
  return g;
}

/** Zafer: çapraz kılıçlar; Yenilgi: kırık kılıç (düz çizgilerle). Merkez (cx, cy). */
function emblemArt(scene: Phaser.Scene, cx: number, cy: number, victory: boolean): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  if (victory) {
    g.lineStyle(5, 0xf3d999, 1);
    g.lineBetween(cx - 26, cy - 28, cx + 8, cy + 6).lineBetween(cx + 26, cy - 28, cx - 8, cy + 6);
    g.lineStyle(7, 0xf3d999, 1);
    g.lineBetween(cx + 2, cy + 2, cx + 18, cy + 18).lineBetween(cx - 2, cy + 2, cx - 18, cy + 18);
    g.lineStyle(8, 0xf3d999, 1).lineBetween(cx + 14, cy + 14, cx + 6, cy + 22).lineBetween(cx - 14, cy + 14, cx - 6, cy + 22);
    g.fillStyle(0xe0702a, 1).fillPoints(diamondPts(cx, cy - 32, 7), true);
  } else {
    g.lineStyle(5, 0xd88a7e, 1);
    g.lineBetween(cx, cy - 30, cx, cy + 2).lineBetween(cx - 12, cy + 2, cx + 12, cy + 2).lineBetween(cx, cy + 2, cx, cy + 12);
    g.lineStyle(6, 0xd88a7e, 1).lineBetween(cx - 4, cy + 18, cx - 9, cy + 32).lineBetween(cx + 4, cy + 18, cx + 9, cy + 32);
    g.fillStyle(0x8a3a32, 1).fillPoints(diamondPts(cx, cy + 36, 6), true);
  }
  return g;
}

/** Küçük haç (düşen birim işareti), merkez (cx, cy). */
function crossMark(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number, color: number): void {
  g.fillStyle(color, 1).fillRect(cx - s / 6, cy - s / 2, s / 3, s).fillRect(cx - s / 2, cy - s / 3, s, s / 3);
}

export function showResultScreen(scene: Phaser.Scene, o: ResultScreenOptions): ResultScreen {
  const { victory, battle, stats } = o;
  const local = o.localSide ?? 'party';
  const accent = victory ? { edge: 0xd9b26a, light: 0xe8c47e, text: '#f3d9a0', value: EL.ON } : { edge: 0x9c4a40, light: 0xb0584c, text: '#d88a7e', value: '#eab0a4' };
  const root = scene.add.container(0, 0).setDepth(DEPTH);

  // Kısa ekran (telefon yatay): yazılar ve dokunma hedefleri büyür (html.short = ≤520px, html.compact = ≤720px)
  const cls = typeof document !== 'undefined' ? document.documentElement.classList : null;
  const short = !!cls?.contains('short');
  const compactScreen = short || !!cls?.contains('compact');
  const k = short ? 1.55 : compactScreen ? 1.25 : 1;
  /** Küçük yazılar k ile tam, büyükler yarım büyür. */
  // Telefonda sahne ~0.35x küçüldüğü için küçük yazılar en az ~9,5 gerçek piksel olsun (cssScale = 1 birimin CSS pikseli)
  const minSmall = short ? Math.ceil(9.5 / Math.max(0.2, stageView.cssScale)) : 0;
  const sz = (n: number): number => Math.max(n < 22 ? minSmall : 0, Math.round(n * (n < 22 ? k : 1 + (k - 1) * 0.5)));

  // --- Vinyet: sahne hafifçe kararır; altındaki tıklamaları yutar ---
  const dim = scene.add.rectangle(FULL_X0, 0, FULL_W, H, 0x050302, 0).setOrigin(0, 0).setInteractive();
  const edge = scene.add.graphics();
  edge.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.7, 0.7, 0, 0).fillRect(FULL_X0, 0, FULL_W, 260);
  edge.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8).fillRect(FULL_X0, H - 320, FULL_W, 320);
  edge.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.6, 0, 0.6, 0).fillRect(FULL_X0, 0, 360, H);
  edge.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.6, 0, 0.6).fillRect(FULL_X0 + FULL_W - 360, 0, 360, H);
  edge.setAlpha(0);
  root.add([dim, edge]);
  const rm = motion('result');
  const d = (n: number) => Math.max(1, n);
  scene.tweens.add({ targets: dim, fillAlpha: victory ? 0.7 : 0.78, duration: d(rm.dimMs) });
  scene.tweens.add({ targets: edge, alpha: 1, duration: d(rm.dimMs) });

  const icon = (name: string, x: number, y: number, size: number): Phaser.GameObjects.Image => scene.add.image(x, y, ensureIcon(scene, name, '#ffffff', false)).setDisplaySize(size, size);
  const stat = (n: string) => statIconName(n as Parameters<typeof statIconName>[0]);

  // ============ A-Band plaket ============
  const myUnits = battle.combatants.filter((c) => c.side === local && !c.summoned);
  const standing = myUnits.filter((c) => c.hp > 0).length;
  const plaqueW = 920;
  const bandH = 40 * (short ? 1.3 : 1);
  const topPad = 26; // sağdaki Turns / Standing kutularının üstünde şeritle arasında nefes payı
  const boxH = Math.round(60 * (short ? 1.35 : 1));
  const boxGap = 10;
  const mainH = topPad + boxH * 2 + boxGap + 22;
  const plaqueH = bandH + mainH;
  const px = W / 2 - plaqueW / 2;
  const py = 46;
  const plaque = scene.add.container(0, -50).setAlpha(0);
  {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRect(px + 4, py + 12, plaqueW, plaqueH);
    g.lineStyle(3, EL.INK, 0.9).strokeRect(px - 1.5, py - 1.5, plaqueW + 3, plaqueH + 3);
    vGradient(g, px, py, plaqueW, plaqueH, 0x18110b, [[0, 0.97], [1, 0.98]]);
    g.fillGradientStyle(0x18110b, 0x18110b, 0x0a0705, 0x0a0705, 0.98).fillRect(px, py, plaqueW, plaqueH);
    // Üst şerit
    hGradient(g, px, py, plaqueW, bandH, victory ? 0xd9b26a : 0xb0584c, [[0, 0.26], [0.6, 0.07], [1, 0.18]]);
    g.lineStyle(1, accent.edge, 0.55).lineBetween(px, py + bandH, px + plaqueW, py + bandH);
    g.lineStyle(1, accent.edge, victory ? 0.5 : 0.75).strokeRect(px + 0.5, py + 0.5, plaqueW - 1, plaqueH - 1);
    for (const [cx, cy] of [[px, py], [px + plaqueW, py + plaqueH]] as const) {
      g.fillStyle(0x130d07, 1).fillPoints(diamondPts(cx, cy, 6), true);
      g.lineStyle(1, 0xf0dca8, 1).strokePoints(diamondPts(cx, cy, 6), true);
    }
    plaque.add(g);
  }
  plaque.add(elText(scene, px + 22, py + bandH / 2, 'Battle result', sz(15), victory ? EL.ON : '#e0a79c', { em: 0.3 }).setOrigin(0, 0.5));

  const mainY = py + bandH;
  const midY = mainY + topPad + (boxH * 2 + boxGap) / 2;
  // Simge kutusu (Victory / Defeat)
  {
    const ex = px + 28 + 52;
    const g = scene.add.graphics();
    g.fillStyle(0x0d0806, 0.95).fillRect(ex - 52, midY - 52, 104, 104);
    g.fillStyle(victory ? 0xd9b26a : 0xb0584c, 0.16).fillCircle(ex, midY - 8, 44);
    g.lineStyle(1, victory ? 0xd9b26a : 0xb0584c, 0.7).strokeRect(ex - 51.5, midY - 51.5, 103, 103);
    g.lineStyle(2, EL.INK, 0.9).strokeRect(ex - 54, midY - 54, 108, 108);
    plaque.add(g);
    plaque.add(emblemArt(scene, ex, midY, victory));
  }
  // Başlık + süs + alt yazı (ortadaki alan: kutu ile sağdaki sütun arası)
  const midX = px + 28 + 104 + (plaqueW - 28 - 104 - 28 - 160) / 2 + 26;
  const midW = plaqueW - 28 - 104 - 26 - 160 - 26 - 28;
  const fit = (t: Phaser.GameObjects.Text, maxW = midW) => {
    if (t.width > maxW) t.setScale(maxW / t.width);
    return t;
  };
  const title = fit(elText(scene, midX, midY - 30, o.title ?? (victory ? 'Victory' : 'Defeat'), TYPE.hero, '#ffffff', { em: 0.12 }).setOrigin(0.5));
  if (victory) title.setTint(0xfbe7b0, 0xfbe7b0, 0xc7984f, 0xc7984f);
  else title.setTint(0xd98a7e, 0xd98a7e, 0x8a3a32, 0x8a3a32);
  plaque.add(title);
  plaque.add(ornamentLine(scene, midX, midY + 18, Math.min(190, midW / 2 - 10), accent.edge, accent.light));
  const sub = o.subtitle ?? (victory ? 'The enemy line is broken' : 'Your party has fallen');
  plaque.add(fit(elBody(scene, midX, midY + 46, sub, sz(26), accent.text, false).setOrigin(0.5)));
  // Sağ sütun: Turns / Standing
  {
    const bx = px + plaqueW - 28 - 160;
    const items: Array<[string, string, string]> = [[uiIconName('cooldown'), String(stats.turns), 'Turns'], [stat('hp'), `${standing} / ${myUnits.length}`, 'Standing']];
    items.forEach(([ic, val, label], i) => {
      const by0 = mainY + topPad + i * (boxH + boxGap);
      const g = scene.add.graphics();
      g.fillStyle(0xffffff, 0.04).fillRect(bx, by0, 160, boxH);
      g.lineStyle(1, EL.GOLD, EL.LINE.a1 + 0.06).strokeRect(bx + 0.5, by0 + 0.5, 159, boxH - 1);
      plaque.add(g);
      plaque.add(icon(ic, bx + 10 + 17, by0 + boxH / 2, 34));
      plaque.add(elText(scene, bx + 56, by0 + boxH / 2 - 9, val, 28, accent.value, { em: 0.02, upper: false, weight: '700' }).setOrigin(0, 0.5));
      plaque.add(elText(scene, bx + 56, by0 + boxH / 2 + 16, label, sz(11), EL.MUTED, { em: 0.14 }).setOrigin(0, 0.5));
    });
  }
  plaque.setSize(plaqueW, plaqueH);
  root.add(plaque);
  scene.tweens.add({ targets: plaque, y: 0, alpha: 1, duration: d(rm.plaqueMs), ease: 'Cubic.easeOut', delay: rm.plaqueDelayMs });

  // ============ Alt çubuk ölçüleri (alan buna göre ayrılır) ============
  const primaryH = short ? 126 : 84;
  const secH = short ? 120 : 62;
  const barBottom = H - 30;
  const barY = barBottom - primaryH / 2; // düğme merkezi
  const areaTop = py + plaqueH + 26;
  const areaBottom = barBottom - primaryH - (short ? 14 : 22);

  // ============ Takım panelleri ============
  const winnerSide = victory ? local : local === 'party' ? 'enemy' : 'party';
  const roster = (side: Side) => battle.combatants.filter((c) => c.side === side && !c.summoned).sort((a, b) => a.slot - b.slot);
  const winners = roster(winnerSide);
  const mvp = !victory ? undefined : winners.reduce<Combatant | undefined>((best, c) => ((stats.dealt.get(c.uid) ?? 0) > (stats.dealt.get(best?.uid ?? '') ?? 0) ? c : best), undefined);
  const mvpUid = mvp && (stats.dealt.get(mvp.uid) ?? 0) > 0 ? mvp.uid : null;

  const stripH = Math.round(82 * (short ? 1.2 : 1));
  const gapY = 20;
  const rowCount = Math.max(3, ...(['party', 'enemy'] as const).map((s) => roster(s).length));
  const rowGap = 6;
  const headBlock = Math.round(78 * (short ? 1.25 : 1)); // panel üstü: başlık + sütun etiketleri
  const padBottom = 16;
  const rowsAvail = areaBottom - areaTop - stripH - gapY - headBlock - padBottom;
  const rowH = Math.max(34, Math.min(104, Math.floor((rowsAvail - rowGap * (rowCount - 1)) / rowCount)));
  const tight = rowH < 60; // tek satır: ad + etiket yan yana
  const panelH = headBlock + rowCount * rowH + (rowCount - 1) * rowGap + padBottom;
  const blockH = panelH + gapY + stripH;
  const blockTop = areaTop + Math.max(0, (areaBottom - areaTop - blockH) / 2);
  const panelW = (W - 160 - 22) / 2;

  const area = scene.add.container(0, 24).setAlpha(0);
  root.add(area);
  scene.tweens.add({ targets: area, y: 0, alpha: 1, duration: d(rm.summaryMs), ease: 'Cubic.easeOut', delay: rm.summaryDelayMs });

  const drawPanel = (x: number, y: number, w: number, h: number): void => {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRect(x + 3, y + 10, w, h);
    g.lineStyle(2, EL.INK, 0.8).strokeRect(x - 1, y - 1, w + 2, h + 2);
    g.fillGradientStyle(0x140e0a, 0x140e0a, 0x090604, 0x090604, 0.92).fillRect(x, y, w, h);
    g.lineStyle(1, EL.GOLD, EL.LINE.a2).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    for (const [cx, cy] of [[x, y], [x + w, y + h]] as const) {
      g.fillStyle(0x130d07, 1).fillPoints(diamondPts(cx, cy, 5), true);
      g.lineStyle(1, 0xf0dca8, 1).strokePoints(diamondPts(cx, cy, 5), true);
    }
    area.add(g);
  };

  // Telefonda büyüyen etiketler (Dealt / Taken / Healed) için sütun genişliği; sağdaki ad ve can çubuğu payı da buna göre daralır
  const metricW = short ? 142 : 108;
  const rowItems: Phaser.GameObjects.Container[] = [];
  const metricDefs = [
    { icon: stat('str'), label: 'Dealt', color: '#f0cf8a', bar: 0xf0cf8a, map: stats.dealt },
    { icon: stat('armor'), label: 'Taken', color: '#e39a8c', bar: 0xe39a8c, map: stats.taken },
    { icon: stat('hpRegen'), label: 'Healed', color: '#98d890', bar: 0x98d890, map: stats.healed },
  ];

  (['party', 'enemy'] as const).forEach((side, col) => {
    const x0 = 80 + col * (panelW + 22);
    drawPanel(x0, blockTop, panelW, panelH);
    const heading = o.headings ? (side === local ? o.headings.local : o.headings.remote).toUpperCase() : side === local ? 'YOUR PARTY' : 'ENEMY';
    const win = side === winnerSide;
    const hy = blockTop + 26;
    {
      const g = scene.add.graphics();
      g.fillStyle(win ? EL.EMBER : 0x5a4a38, 1).fillPoints(diamondPts(x0 + 30, hy, 6), true);
      if (win) g.fillStyle(EL.EMBER, 0.22).fillPoints(diamondPts(x0 + 30, hy, 10), true);
      hGradient(g, x0 + 30 + 120, hy, panelW - 52 - 120, 1, EL.GOLD, [[0, 0.3], [1, 0]]);
      area.add(g);
    }
    const ht = elText(scene, x0 + 48, hy, heading, sz(19), win ? EL.ON : EL.MUTED, { em: 0.24 }).setOrigin(0, 0.5);
    area.add(ht);
    // sütun etiketleri (ikon + yazı), satırlardaki metrik sütunlarıyla aynı hizada
    const mRight = x0 + panelW - 22 - 14;
    metricDefs.forEach((m, i) => {
      const cx = mRight - (2 - i) * metricW - metricW / 2;
      const lab = elText(scene, 0, hy + 34 * (short ? 1.15 : 1), m.label, sz(12), EL.MUTED, { em: 0.12 }).setOrigin(0, 0.5);
      const isz = sz(18);
      if (short) lab.setScale(Math.min(1, (metricW - 8 - isz - 6) / lab.width));
      const total = isz + 6 + lab.displayWidth;
      lab.setX(cx - total / 2 + isz + 6);
      area.add(icon(m.icon, cx - total / 2 + isz / 2, lab.y, isz).setAlpha(0.9));
      area.add(lab);
    });

    const units = roster(side);
    const teamTotals = metricDefs.map((m) => units.reduce((s, c) => s + (m.map.get(c.uid) ?? 0), 0));
    units.forEach((c, i) => {
      const alive = c.hp > 0;
      const rx = x0 + 22;
      const rw = panelW - 44;
      const ry = blockTop + headBlock + i * (rowH + rowGap);
      const cy = ry + rowH / 2;
      const row = scene.add.container(0, 0).setAlpha(0);
      const isMvp = mvpUid === c.uid;
      const g = scene.add.graphics();
      if (isMvp) {
        hGradient(g, rx, ry, rw, rowH, 0xe0702a, [[0, 0.2], [1, 0.05]]);
        g.lineStyle(1, 0xe0702a, 0.7).strokeRect(rx + 0.5, ry + 0.5, rw - 1, rowH - 1);
        g.fillStyle(0xe0702a, 1).fillRect(rx, ry, 3, rowH);
      } else if (!alive) {
        g.fillStyle(0x000000, 0.28).fillRect(rx, ry, rw, rowH);
        g.lineStyle(1, EL.GOLD, EL.LINE.a1).strokeRect(rx + 0.5, ry + 0.5, rw - 1, rowH - 1);
      } else {
        hGradient(g, rx, ry, rw, rowH, 0xffffff, [[0, 0.055], [1, 0.015]]);
        g.lineStyle(1, EL.GOLD, EL.LINE.a1).strokeRect(rx + 0.5, ry + 0.5, rw - 1, rowH - 1);
      }
      row.add(g);

      // Çerçeveli portre
      const av = Math.max(34, rowH - 22);
      const ax = rx + 14 + av / 2;
      const pf = scene.add.graphics();
      pf.fillStyle(0x0d0806, 1).fillRect(ax - av / 2, cy - av / 2, av, av);
      row.add(pf);
      const face = o.avatar(c, ax, cy, av - 4);
      face.setDepth(0);
      if (!alive) face.setTint(0x555555).setAlpha(0.6);
      row.add(face);
      const fr = scene.add.graphics();
      const frCol = isMvp ? 0xf0a85a : alive ? EL.GOLD : 0x4a3f33;
      if (isMvp) fr.fillStyle(0xe0702a, 0.1).fillRect(ax - av / 2 - 4, cy - av / 2 - 4, av + 8, av + 8);
      fr.lineStyle(2, EL.INK, 0.9).strokeRect(ax - av / 2 - 2, cy - av / 2 - 2, av + 4, av + 4);
      fr.lineStyle(1, frCol, alive ? 0.75 : 1).strokeRect(ax - av / 2 + 0.5, cy - av / 2 + 0.5, av - 1, av - 1);
      row.add(fr);
      // Köşe rozeti: kahramanda sınıf amblemi, düşende haç
      const bR = Math.round(Math.min(15, av * 0.24));
      const bx = ax + av / 2 - 2;
      const by = cy + av / 2 - 2;
      const isHero = !c.defId.startsWith('enemy_') && hasMiscImage('class', c.defId);
      if (!alive) {
        const cg = scene.add.graphics();
        cg.fillStyle(0x130d07, 1).fillCircle(bx, by, bR).lineStyle(1, 0x5a4a38, 1).strokeCircle(bx, by, bR);
        crossMark(cg, bx, by, bR * 0.9, 0x8d8070);
        row.add(cg);
      } else if (isHero) {
        const cg = scene.add.graphics();
        cg.fillStyle(0x130d07, 1).fillCircle(bx, by, bR).lineStyle(1, EL.GOLD, 0.7).strokeCircle(bx, by, bR);
        row.add(cg);
        row.add(scene.add.image(bx, by, ensureIcon(scene, classLogoName({ id: c.defId, logo: c.logo }), c.color, false, ownerOfUnit(c.defId))).setDisplaySize(bR * 1.5, bR * 1.5));
      }

      // Ad + MVP / Fallen
      const nameX = ax + av / 2 + 18;
      const idW = short ? 140 : tight ? 150 : 168;
      const nameCol = alive ? (tierStyle(c.tier)?.hex ?? EL.ON) : '#8d8070';
      const nameSize = tight ? sz(18) : sz(19);
      const nameText = fitText(elText(scene, nameX, tight ? cy : cy - (rowH > 70 ? 13 : 11), unitName(c), nameSize, nameCol, { em: 0.04 }).setOrigin(0, 0.5), tight ? idW - 56 : idW);
      row.add(nameText);
      const tagX = tight ? nameX + nameText.displayWidth + 8 : nameX;
      const tagY = tight ? cy : cy + (rowH > 70 ? 15 : 13);
      if (isMvp) {
        const th = tight ? 18 : sz(22);
        const label = elText(scene, 0, tagY, 'MVP', tight ? 11 : sz(12), '#2a1405', { em: 0.2, weight: '700' }).setOrigin(0, 0.5);
        const tw = label.width + 22 + th * 0.2;
        const tg = scene.add.graphics();
        vGradient(tg, tagX, tagY - th / 2, tw, th, 0xf0a85a, [[0, 1], [1, 1]]);
        tg.fillGradientStyle(0xf0a85a, 0xf0a85a, 0xe0702a, 0xe0702a, 1).fillRect(tagX, tagY - th / 2, tw, th);
        tg.fillStyle(0x2a1405, 1).fillPoints(diamondPts(tagX + 11, tagY, 4.5), true);
        row.add(tg);
        row.add(label.setX(tagX + 22));
      } else if (!alive) row.add(elBody(scene, tagX, tagY, 'Fallen', tight ? sz(15) : sz(17), '#8d8070', false).setOrigin(0, 0.5));

      // Can çubuğu (karakter kartı dili: rakam çubuğun içinde)
      const hpX = nameX + idW + 14;
      const hpW = 150;
      const hpH = Math.round((tight ? 20 : 24) * (short ? 1.4 : 1));
      const ratio = Phaser.Math.Clamp(c.hp / Math.max(1, c.maxHp), 0, 1);
      const bar = scene.add.graphics();
      bar.fillStyle(0x1d150d, 1).fillRect(hpX, cy - hpH / 2, hpW, hpH);
      if (ratio > 0) {
        const fw = Math.max(3, (hpW - 2) * ratio);
        const [c0, c1] = side === local ? [0x4f9a32, 0x7fbf3f] : [0x9c3a28, 0xcc5a42];
        bar.fillGradientStyle(c0, c1, c0, c1, 1).fillRect(hpX + 1, cy - hpH / 2 + 1, fw, hpH - 2);
        bar.fillStyle(0xffffff, 0.2).fillRect(hpX + 1, cy - hpH / 2 + 1, fw, 1);
      }
      bar.lineStyle(1, EL.GOLD, 0.3).strokeRect(hpX + 0.5, cy - hpH / 2 + 0.5, hpW - 1, hpH - 1);
      row.add(bar);
      row.add(fitText(elText(scene, hpX + hpW / 2, cy, alive ? `${c.hp} / ${c.maxHp}` : '0', sz(14), alive ? '#ffffff' : '#8d8070', { em: 0.04, upper: false }).setOrigin(0.5), hpW - 6));

      // DEALT / TAKEN / HEALED: ikon + renkli sayı + takım toplamına oran çubuğu
      metricDefs.forEach((m, mi) => {
        const cx = rx + rw - 14 - (2 - mi) * metricW - metricW / 2;
        const v = m.map.get(c.uid) ?? 0;
        const numY = tight ? cy : cy - 7;
        const numSize = tight ? sz(22) : sz(27);
        const t = elText(scene, 0, numY, v > 0 ? String(v) : '-', numSize, v > 0 ? m.color : '#6b5f4d', { em: 0.02, upper: false }).setOrigin(0, 0.5);
        const isz = tight ? sz(20) : sz(22);
        const tot = isz + 6 + t.width;
        t.setX(cx - tot / 2 + isz + 6);
        row.add(icon(m.icon, cx - tot / 2 + isz / 2, numY, isz).setAlpha(v > 0 ? 1 : 0.4));
        row.add(t);
        if (!tight) {
          const sh = scene.add.graphics();
          sh.fillStyle(0xffffff, 0.08).fillRect(cx - 31, cy + 17, 62, 4);
          const share = teamTotals[mi]! > 0 ? v / teamTotals[mi]! : 0;
          if (share > 0) sh.fillStyle(m.bar, 0.95).fillRect(cx - 31, cy + 17, Math.max(2, 62 * share), 4);
          row.add(sh);
        }
      });
      area.add(row);
      rowItems.push(row);
    });
  });
  rowItems.forEach((row, i) => {
    row.y = 12;
    scene.tweens.add({ targets: row, alpha: 1, y: 0, duration: d(rm.rowMs), ease: 'Sine.easeOut', delay: rm.rowDelayMs + (i % 5) * rm.rowStaggerMs + Math.floor(i / 5) * (rm.rowStaggerMs * 0.43) });
  });

  // ============ Özet şeridi (yerel takımın bakışıyla) ============
  {
    const sx = 80;
    const sy = blockTop + panelH + gapY;
    const sw = W - 160;
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRect(sx + 3, sy + 8, sw, stripH);
    g.lineStyle(2, EL.INK, 0.8).strokeRect(sx - 1, sy - 1, sw + 2, stripH + 2);
    g.fillGradientStyle(0x18110b, 0x18110b, 0x0a0705, 0x0a0705, 0.95).fillRect(sx, sy, sw, stripH);
    g.lineStyle(1, EL.GOLD, EL.LINE.a2).strokeRect(sx + 0.5, sy + 0.5, sw - 1, stripH - 1);
    area.add(g);
    const dealtTotal = roster(local).reduce((s, c) => s + (stats.dealt.get(c.uid) ?? 0), 0);
    const takenTotal = roster(local).reduce((s, c) => s + (stats.taken.get(c.uid) ?? 0), 0);
    const big = stats.biggest[local];
    const cells: Array<{ ic: string; label: string; val: string; color: string; note?: string }> = [
      { ic: stat('str'), label: 'Damage dealt', val: String(dealtTotal), color: '#f0cf8a' },
      { ic: stat('armor'), label: 'Damage taken', val: String(takenTotal), color: '#e39a8c' },
      { ic: stat('might'), label: 'Biggest hit', val: String(big?.amount ?? 0), color: EL.ON, ...(big && !short ? { note: big.name } : {}) },
      { ic: stat('critChance'), label: 'Critical hits', val: String(stats.crits[local]), color: EL.ON },
      { ic: stat('armor'), label: 'Blocked', val: String(stats.blocks[local]), color: EL.ON },
      { ic: stat('evasion'), label: 'Dodged', val: String(stats.dodges[local]), color: EL.ON },
    ];
    const cw = sw / cells.length;
    cells.forEach((c, i) => {
      const cx = sx + i * cw;
      if (i > 0) g.lineStyle(1, EL.GOLD, EL.LINE.a1).lineBetween(cx + 0.5, sy + 1, cx + 0.5, sy + stripH - 1);
      const isz = Math.round(38 * (short ? 1.1 : 1));
      area.add(icon(c.ic, cx + 18 + isz / 2, sy + stripH / 2, isz));
      const tx = cx + 18 + isz + 12;
      const lab = elText(scene, tx, sy + stripH / 2 - (c.note ? 22 : 18), c.label, sz(11), EL.MUTED, { em: 0.18 }).setOrigin(0, 0.5);
      fitText(lab, cw - (tx - cx) - 8);
      area.add(lab);
      area.add(elText(scene, tx, sy + stripH / 2 + (c.note ? 0 : 6), c.val, 29 * (short ? 1.15 : 1), c.color, { em: 0.02, upper: false, weight: '700' }).setOrigin(0, 0.5));
      if (c.note) area.add(fitText(elBody(scene, tx, sy + stripH / 2 + 24, c.note, 15, EL.MUTED, false).setOrigin(0, 0.5), cw - (tx - cx) - 8));
    });
  }

  // ============ Düğmeler ============
  let destroyed = false;
  const srcActions = !o.preview && o.actions?.length ? o.actions : [];
  const gate = gateActions(srcActions);
  const once = (fn: () => void) => () => {
    if (gate.close()) fn();
  };
  const newGame = once(() => o.onNewGame());
  const teamSelect = once(() => o.onTeamSelect());
  const buttons = scene.add.container(0, 0).setAlpha(0);
  const bw = 420;
  const kitButton = (label: string, run: () => void, x: number, w: number, primary: boolean): ElButton => {
    const b = elButton(scene, label, run, { kind: primary ? 'primary' : 'secondary', w, h: primary ? primaryH : secH, size: primary ? sz(28) : sz(22), ready: true, touch: { growY: 'both', maxW: w + gap - 4 } });
    b.root.setPosition(x, barY);
    return b;
  };
  const actions = srcActions.length ? srcActions.map((a, i) => ({ ...a, run: () => void gate.press(i) })) : null;
  const live: Array<{ b: ElButton; view: () => { label: string; enabled: boolean } }> = [];
  /** Kit kuralı: birincil eylem EN SAĞDA, ikinciller onun soluna dizilir; "Copy match data" en solda küçük düğme. */
  const right = W - 80;
  const gap = 24;
  const place = (items: Array<{ label: string; run: () => void; primary: boolean; view?: () => { label: string; enabled: boolean } }>): void => {
    const prim = items.filter((x) => x.primary);
    const secs = items.filter((x) => !x.primary);
    const sw2 = items.length > 3 ? 280 : 320;
    let x = right;
    const row: Array<{ it: (typeof items)[number]; x: number; w: number }> = [];
    for (const it of [...prim].reverse()) {
      row.push({ it, x: x - bw / 2, w: bw });
      x -= bw + gap + 16;
    }
    for (const it of [...secs].reverse()) {
      row.push({ it, x: x - sw2 / 2, w: sw2 });
      x -= sw2 + gap;
    }
    for (const { it, x: bx, w } of row) {
      const b = kitButton(it.label, it.run, bx, w, it.primary);
      buttons.add(b.root);
      if (it.view) live.push({ b, view: it.view });
    }
  };
  if (actions) place(actions.map((a) => ({ label: a.label, run: a.run, primary: !!a.primary, ...(a.view ? { view: a.view } : {}) })));
  else if (o.preview) place([{ label: 'Team Select', run: teamSelect, primary: false }, { label: 'Close preview', run: () => destroy(), primary: true }]);
  else place([{ label: 'Team Select', run: teamSelect, primary: false }, { label: 'New Game', run: newGame, primary: true }]);
  // "Copy match data": solda küçük ikincil düğme (kısa ipucu = yazının kendisi)
  if (o.matchData) {
    const matchData = o.matchData;
    const cb = elButton(scene, 'Copy match data', () => {
      void copyMatchData({ get: matchData }).then((r) => cb.setLabel(r.ok ? `Copied (${r.moves} moves)` : 'Copy match data'));
    }, { kind: 'secondary', w: short ? 330 : 300, h: short ? 120 : 52, size: sz(16), ready: true, icon: ensureIcon(scene, uiIconName('combatLog'), '#ffffff', false), iconSize: sz(24) });
    cb.root.setPosition(80 + cb.w / 2, barY);
    buttons.add(cb.root);
  }
  // Multiplayer durum satırı: düğmelerin hemen üstünde, ortalı
  const statusText = o.status && !o.preview ? elBody(scene, W / 2, barY - primaryH / 2 - 22, '', 22, EL.MUTED).setOrigin(0.5) : null;
  if (statusText) buttons.add(statusText);
  const refresh = () => {
    if (destroyed) return;
    for (const { b, view } of live) {
      const v = view();
      b.setLabel(v.label);
      b.setReady(v.enabled && !gate.done);
    }
    if (statusText && o.status) {
      const st = o.status();
      statusText.setText(st.text);
      statusText.setColor(st.tone === 'error' ? '#e08a7a' : st.tone === 'warn' ? '#e8c27a' : EL.MUTED);
    }
  };
  refresh();
  const refreshTimer = live.length || statusText ? scene.time.addEvent({ delay: 250, loop: true, callback: refresh }) : null;
  root.add(buttons);
  scene.tweens.add({ targets: buttons, alpha: 1, duration: d(rm.buttonsMs), delay: rm.buttonsDelayMs });

  // --- Klavye: Enter = ilk eylem / New Game, Esc = Team Select (wiki/debug menüsü açıkken yok sayılır); ipucu yazısı yok ---
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || debugState.uiPaused || e.defaultPrevented) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (actions) actions[0]!.run();
      else if (o.preview) destroy();
      else newGame();
    } else if (e.key === 'Escape') {
      if (actions) return;
      if (o.preview) destroy();
      else teamSelect();
    }
  };
  window.addEventListener('keydown', onKey);
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    refreshTimer?.remove(false);
    window.removeEventListener('keydown', onKey);
    scene.tweens.killTweensOf(root.list);
    root.destroy(true);
    o.onClose?.();
  }
  scene.events.once('shutdown', destroy);
  return { destroy };
}
