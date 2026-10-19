import Phaser from 'phaser';
import { motion } from '../ui/motion';
import { content } from '../engine';
import { CONFIG, deleteSave, deleteSlot, listSaves, progressText, slotSummaries, type CampaignMode, type Difficulty, type SaveEntry, type SlotSummary } from '../campaign';
import { storage } from './campaign-session';
import { H, W } from './campaign-ui';
import { classAvatar } from './menu-ui';
import { campaignArtKey, hasCampaignArt } from './campaign-art';
import { cardArt } from './card-art';
import { EL, diamondPts, elBack, elBody, elButton, elDiamond, elGlow, elPanel, elText, fitW, hGradient, vGradient } from './elegant-ui';
import { FULL_W, FULL_X0 } from '../ui/viewport';
import { onStageResize } from './stage';
import { stageView } from './stage-view';

/**
 * Sefer yuvaları "Three cards" (Ömer 2026-10-19, taslak campaign-slots-v2.html #v2): New Campaign ve Load Game aynı ekran.
 * Yuvalar Play kartları gibi üç büyük kart (harita bölgesi + durak adı, takım yüzleri + seviye, çipler, ilerleme çubuğu, kayıt sayısı + tarih).
 *  - New: adım I (kart seç; dolu yuvada sağ altta "Overwrite this slot" -> alt şerit onay "Accept" / "Cancel"; boşta "Choose"), adım II
 *    (tam genişlikte mod + zorluk plakaları, Back / "Begin the journey"). Yuva silme Accept'te değil başlangıçta olur (startNewCampaign yuvayı yeniden kurar).
 *  - Load: kısa kartlar + altında seçili yuvanın kayıtları (Load / Delete, silme panel içinde onaylanır) + "Delete slot". Haritadan
 *    açılınca (`onlySlot`) yalnızca o yuva.
 * Sol üstte kit "◂ Back" (Geri / Menu kuralı). Esc = `back()`: önce onay, sonra adım II -> I, sonra kapanır.
 * Telefon: düğmeler `touch: true` (44 gerçek piksel dokunma alanı); kayıt satırları 120 birim aralıklı.
 */

export interface SlotBrowserOptions {
  flow: 'new' | 'load';
  /** Başta seçili yuva (verilmezse New: ilk boş, Load: en son oynanan). */
  slot?: number;
  /** Yalnızca bu yuvayı göster (harita > Menu > Load). */
  onlySlot?: boolean;
  onClose: () => void;
  onStart?: (mode: CampaignMode, difficulty: Difficulty, slot: number) => void;
  onLoad?: (entry: SaveEntry) => void;
  /** Kayıt / yuva silindi (ana menü Campaign kartını yeniler). */
  onChanged?: () => void;
}

export interface SlotBrowser {
  root: Phaser.GameObjects.Container;
  /** Esc / Back: onay -> adım -> kapat. */
  back(): void;
  close(): void;
}

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
const MODES: Array<{ id: CampaignMode; name: string; lines: string[] }> = [
  { id: 'normal', name: 'Normal', lines: ['Autosave after every victory', 'Save on the map at any time', 'Up to 5 saves in this slot'] },
  { id: 'ironman', name: 'Ironman', lines: ['Saved only after a victory', 'No manual saves', 'One save, always overwritten'] },
];
const KICKER = 'rgba(217,178,106,0.85)';
const CARD_W = 520;
const CARD_GAP = 30;
const EDGE = 150; // Load paneli ve adım II plakaları için yatay sınır
const RIGHT = W - 150; // birincil eylem sağ hizası
const FOCUS: Array<[number, number]> = [[0.18, 0.85], [0.8, 0.15], [0.38, 0.4]]; // kart başına harita kesiti (taslak V2)

const dateText = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};
const dayText = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
};
/** Telefonda küçük yazıyı okunur yap (gerçek ~10 px); masaüstünde aynı kalır. */
const legible = (base: number): number => Math.min(28, Math.max(base, Math.ceil(10 / (stageView.cssScale > 0 ? stageView.cssScale : 1))));
const modeName = (m: CampaignMode) => (m === 'ironman' ? 'Ironman' : 'Normal');
const diffName = (d: Difficulty) => CONFIG.difficulties[d]?.name ?? d;
const MAP_NOTE = '#e3c48f'; // harita değişti uyarısı (kehribar; onay kutusunun kırmızısından ayrı)
const kindName = (k: SaveEntry['kind']) => (k === 'manual' ? 'Manual' : k === 'start' ? 'Start' : 'Auto');

interface Confirm {
  text: string;
  yes: string;
  run: () => void;
}

export function openSlotBrowser(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, o: SlotBrowserOptions): SlotBrowser {
  const root = scene.add.container(0, 0);
  layer.add(root);
  let sums = slotSummaries(storage());
  const visible = (): number[] => (o.onlySlot && o.slot !== undefined ? [o.slot] : sums.map((_, i) => i));
  const st = {
    slot: o.slot ?? (o.flow === 'new' ? Math.max(0, sums.findIndex((x) => !x)) : latestSlot(sums)),
    step: 1 as 1 | 2,
    confirm: null as Confirm | null,
    mode: 'normal' as CampaignMode,
    diff: CONFIG.defaultDifficulty as Difficulty,
  };
  let closed = false;
  const compact = o.flow === 'load'; // Load: kartlar kısa, altta kayıt paneli

  // --- zemin: tüm alanı kaplayan örtü (alttaki tıklamaları yutar) + soldan koyu degrade ---
  // Ömer 2026-10-10: tam ekran değil, ana menü sahnesinin (ya da haritanın) üstünde yarı saydam açılır
  const dim = scene.add.rectangle(FULL_X0, 0, FULL_W, H, 0x050302, 0.01).setOrigin(0, 0).setInteractive();
  const shade = scene.add.graphics();
  const drawShade = () => {
    shade.clear();
    hGradient(shade, FULL_X0, 0, FULL_W, H, EL.INK, [
      [0, 0.93],
      [0.36, 0.8],
      [0.7, 0.55],
      [1, 0.45],
    ]);
  };
  drawShade();
  onStageResize(scene, () => shade.active && drawShade());
  root.add([dim, shade]);
  const back = elBack(scene, () => api.back());
  root.add(back.root);

  // --- başlık + adımlar ---
  const title = elText(scene, 150, 160, o.flow === 'new' ? 'New Campaign' : 'Load Game', 48, '#ffffff', { em: 0.14 }).setOrigin(0, 0.5);
  title.setTint(0xfbe7b0, 0xfbe7b0, 0xc7984f, 0xc7984f);
  root.add(title);
  const steps = scene.add.container(150, 222);
  root.add(steps);
  const drawSteps = () => {
    steps.removeAll(true);
    if (o.flow !== 'new') return;
    const a = elText(scene, 0, 0, 'I · Slot', 20, st.step === 1 ? EL.ON : EL.DIM, { em: 0.14 }).setOrigin(0, 0.5);
    const line = scene.add.graphics();
    line.lineStyle(1, EL.GOLD, EL.LINE.a2).lineBetween(a.width + 16, 0, a.width + 70, 0);
    const b = elText(scene, a.width + 86, 0, 'II · Mode & difficulty', 20, st.step === 2 ? EL.ON : EL.DIM, { em: 0.14 }).setOrigin(0, 0.5);
    steps.add([a, line, b]);
  };

  // --- dinamik görünüm (her render'da baştan kurulur) ---
  // Üç katman: viewRoot (giriş hareketi) > cardsC (yuva kartları) + bodyC (alt panel / onay / adım II). Onay, silme gibi eylemler yalnızca ilgili katmanı yeniler.
  const viewRoot = scene.add.container(0, 0);
  const cardsC = scene.add.container(0, 0);
  const bodyC = scene.add.container(0, 0);
  viewRoot.add([cardsC, bodyC]);
  root.add(viewRoot);
  let view: Phaser.GameObjects.Container = bodyC; // yardımcılar (button, kicker...) o an kurulan katmana ekler

  // Harita görseli menüde / haritada zaten yüklü (yeni indirme yok); yoksa Campaign kart görseli, o da yoksa düz koyu zemin
  const artKey = (): string | null => (hasCampaignArt(scene, 'valdoria-bg') ? campaignArtKey('valdoria-bg') : cardArt(scene, 'campaign'));

  const button = (label: string, run: () => void, x: number, cy: number, primary = true, w?: number, align: 'left' | 'right' = 'left'): number => {
    const b = elButton(scene, label, run, { kind: primary ? 'primary' : 'secondary', w, h: primary ? 70 : 58, size: primary ? 23 : 19, ready: true, touch: { minPx: 48 } });
    b.root.setPosition(align === 'left' ? x + b.w / 2 : x - b.w / 2, cy);
    view.add(b.root);
    return b.w;
  };

  /** Küçük çip (koyu plaka + ince altın çerçeve). Sol üst (x, y); genişliği döner. */
  const chip = (c: Phaser.GameObjects.Container, x: number, y: number, text: string): number => {
    const t = elText(scene, x + 12, y + 6, text, 15, EL.MUTED, { em: 0.08 }).setOrigin(0, 0);
    const w = Math.ceil(t.width + 22);
    const g = scene.add.graphics();
    g.fillStyle(0x120d08, 0.75).fillRect(x, y, w, 30);
    g.lineStyle(1, EL.GOLD, EL.LINE.a2).strokeRect(x + 0.5, y + 0.5, w - 1, 29);
    c.add([g, t]);
    return w;
  };

  /** Yuva kartı (taslak V2): harita kesiti + ad, takım yüzleri (seviye), çipler, ilerleme çubuğu, kayıt sayısı + tarih. */
  const slotCard = (i: number, x: number, y: number, h: number) => {
    const w = CARD_W;
    const s = sums[i] ?? null;
    const on = st.slot === i;
    const c = scene.add.container(x, y);
    const artH = compact ? 108 : 250;
    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x1a130c, 0x1a130c, 0x090604, 0x090604, 0.94).fillRect(0, 0, w, h);
    c.add(bg);
    const key = artKey();
    if (key) {
      const img = scene.add.image(0, 0, key).setOrigin(0, 0);
      const sc = Math.max(w / img.width, artH / img.height);
      const cw = w / sc;
      const ch = artH / sc;
      const [fx, fy] = FOCUS[i % FOCUS.length]!;
      const cx0 = (img.width - cw) * fx;
      const cy0 = (img.height - ch) * fy;
      img.setScale(sc).setCrop(cx0, cy0, cw, ch).setPosition(-cx0 * sc, -cy0 * sc).setAlpha(s ? 1 : 0.4);
      c.add(img);
    }
    const art = scene.add.graphics();
    vGradient(art, 0, 0, w, artH, 0x0a0705, [[0, 0.05], [1, 0.85]]);
    art.lineStyle(1, EL.GOLD, EL.LINE.a2).lineBetween(0, artH, w, artH);
    c.add(art);
    c.add(elText(scene, 24, 16, `Slot ${i + 1}`, 16, '#fff4d6', { em: 0.24 }).setOrigin(0, 0));
    if (s) c.add(elText(scene, w - 24, 18, `${modeName(s.mode)} · ${diffName(s.difficulty)}`, 14, s.mode === 'ironman' ? EL.BAD : '#e7d5a8', { em: 0.14 }).setOrigin(1, 0));
    const l = s?.latest;
    const nodeName = s ? (l ? l.summary.node : s.mapChanged ? 'Journey ended' : 'Journey started') : 'Empty slot';
    const name = elText(scene, 24, artH - 14, nodeName, compact ? 30 : 40, s ? EL.ON : EL.MUTED, { em: 0.04, upper: false }).setOrigin(0, 1);
    c.add(fitW(name, w - 48));
    // gövde
    let by = artH + (compact ? 14 : 22);
    if (!s) {
      c.add(elBody(scene, w / 2, artH + (h - artH) / 2, o.flow === 'new' ? 'A new journey can begin here.' : 'This slot is empty.', compact ? 20 : 24, EL.NOTE, false, w - 60).setOrigin(0.5).setAlign('center'));
    } else {
      if (l) {
        const fs = compact ? 64 : 84;
        l.summary.classes.forEach((cls, k) => {
          const def = content.classes[cls];
          if (!def) return;
          const ax = 26 + k * (fs + 10);
          const fr = scene.add.graphics();
          fr.fillStyle(0x0a0605, 1).fillRect(ax, by, fs, fs);
          c.add(fr);
          c.add(classAvatar(scene, def, ax + fs / 2, by + fs / 2, fs));
          const lv = l.state.roster.find((hh) => hh.class === cls)?.level;
          const bd = scene.add.graphics();
          bd.lineStyle(1, EL.GOLD, 0.45).strokeRect(ax + 0.5, by + 0.5, fs - 1, fs - 1);
          c.add(bd);
          if (lv !== undefined) {
            const lb = elText(scene, ax + 8, by + 7, `Lv ${lv}`, 12, EL.ON, { em: 0.06 }).setOrigin(0, 0);
            const g = scene.add.graphics();
            g.fillStyle(0x08060a, 0.85).fillRect(ax + 3, by + 3, lb.width + 10, 20);
            g.lineStyle(1, EL.GOLD, 0.45).strokeRect(ax + 3.5, by + 3.5, lb.width + 9, 19);
            c.add([g, lb]);
          }
        });
        by += (compact ? 64 : 84) + (compact ? 12 : 18);
      }
      if (s.mapChanged) {
        c.add(elBody(scene, 26, by, 'The Valdoria map has changed; this campaign must restart.', compact ? 17 : 21, MAP_NOTE, false, w - 52).setOrigin(0, 0));
      } else if (l) {
        let cx = 26;
        cx += chip(c, cx, by, progressText(l.summary, true)) + 8;
        chip(c, cx, by, `${l.summary.victories} victories`);
        const ratio = l.summary.cleared !== undefined && l.summary.total ? l.summary.cleared / l.summary.total : l.summary.stop / Math.max(1, l.summary.stops);
        const py = by + 30 + (compact ? 10 : 18);
        const pb = scene.add.graphics();
        pb.fillStyle(0x000000, 0.55).fillRect(26, py, w - 52, 8);
        pb.fillGradientStyle(0xa8742a, 0xe8c47e, 0xa8742a, 0xe8c47e, 1).fillRect(27, py + 1, Math.max(0, (w - 54) * Math.min(1, ratio)), 6);
        pb.lineStyle(1, EL.GOLD, EL.LINE.a2).strokeRect(26.5, py + 0.5, w - 53, 7);
        c.add(pb);
      }
      const fy = h - Math.max(compact ? 30 : 38, legible(14) + 14);
      c.add(elText(scene, 26, fy, `${s.saveCount} save${s.saveCount === 1 ? '' : 's'}`, legible(14), EL.DIM, { em: 0.14 }).setOrigin(0, 0));
      c.add(elText(scene, w - 26, fy, dayText(s.lastPlayed), legible(14), EL.DIM, { em: 0.14 }).setOrigin(1, 0));
    }
    // çerçeve (seçili: kor 2 px + dış ışıma; üstüne gelince açık altın)
    const frame = scene.add.graphics();
    let hover = false;
    const drawFrame = () => {
      frame.clear();
      if (on) {
        for (let k = 5; k >= 1; k--) frame.lineStyle(2, EL.EMBER, 0.05 + (5 - k) * 0.03).strokeRect(-k * 3, -k * 3, w + k * 6, h + k * 6);
        frame.lineStyle(2, EL.EMBER2, 1).strokeRect(1, 1, w - 2, h - 2);
      } else frame.lineStyle(1, EL.GOLD, hover ? 0.9 : EL.LINE.a2 * 1.4).strokeRect(0.5, 0.5, w - 1, h - 1);
    };
    drawFrame();
    c.add(frame);
    const zone = scene.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      hover = true;
      drawFrame();
      scene.tweens.add({ targets: c, y: y - 6, duration: 160, ease: EL.EASE });
    });
    zone.on('pointerout', () => {
      hover = false;
      drawFrame();
      scene.tweens.add({ targets: c, y, duration: 160, ease: EL.EASE });
    });
    zone.on('pointerup', () => {
      if (st.slot === i && !st.confirm) return;
      st.slot = i;
      st.step = 1;
      st.confirm = null;
      render();
    });
    c.add(zone);
    view.add(c);
  };

  const slotCards = (top: number, h: number) => {
    const ids = visible();
    view = cardsC;
    const total = ids.length * CARD_W + (ids.length - 1) * CARD_GAP;
    ids.forEach((i, k) => slotCard(i, W / 2 - total / 2 + k * (CARD_W + CARD_GAP), top, h));
    view = bodyC;
  };

  /** Onay kutusu (kırmızımsı ince çerçeve), yatay: solda metin, sağda Cancel + onay düğmesi. Yüksekliği döner. */
  const confirmBox = (x: number, y: number, w: number, c: Confirm): number => {
    const text = elBody(scene, x + 28, y + 24, c.text, 22, EL.NOTE, false, w - 560);
    const h = Math.max(text.height + 48, 116);
    const g = scene.add.graphics();
    g.fillStyle(0x280e0a, 0.7).fillRect(x, y, w, h);
    g.lineStyle(1, 0xe8806a, 0.5).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    view.add([g, text]);
    const cy = y + h / 2;
    const yw = button(c.yes, () => {
      st.confirm = null;
      c.run();
    }, x + w - 28, cy, true, 220, 'right');
    button('Cancel', () => ((st.confirm = null), render('body')), x + w - 28 - yw - 28, cy, false, 180, 'right');
    return h;
  };

  const kicker = (x: number, y: number, text: string): void => {
    view.add(elText(scene, x, y, text, 16, KICKER, { em: 0.24 }).setOrigin(0, 0));
  };

  /** Adım II seçenek plakası: köşe elması (seçili = kor), elmas madde işaretli düz yazı. Yüksekliği önceden ölçülür. */
  const optionRow = <T extends string>(y: number, opts: Array<{ id: T; name: string; lines: string[] }>, cur: T, set: (v: T) => void): number => {
    const total = W - EDGE * 2;
    const gap = 20;
    const bw = (total - gap * (opts.length - 1)) / opts.length;
    const made = opts.map((op) => op.lines.map((l) => elBody(scene, 0, 0, l, 21, '#cdb88d', false, bw - 76).setOrigin(0, 0)));
    const h = Math.max(...made.map((ts) => 74 + ts.reduce((a, t) => a + t.height + 6, 0) + 14));
    opts.forEach((op, k) => {
      const on = op.id === cur;
      const c = scene.add.container(EDGE + k * (bw + gap), y);
      const g = scene.add.graphics();
      g.fillGradientStyle(0x18110a, 0x18110a, 0x090604, 0x090604, 0.92).fillRect(0, 0, bw, h);
      if (on) {
        for (let q = 4; q >= 1; q--) g.lineStyle(2, EL.EMBER, 0.05 + (4 - q) * 0.03).strokeRect(-q * 3, -q * 3, bw + q * 6, h + q * 6);
        g.lineStyle(2, EL.EMBER2, 1).strokeRect(1, 1, bw - 2, h - 2);
      } else g.lineStyle(1, EL.GOLD, EL.LINE.a2).strokeRect(0.5, 0.5, bw - 1, h - 1);
      c.add(g);
      const t = elText(scene, 26, 22, op.name, 28, on ? EL.ON : EL.TXT, { em: 0.06 }).setOrigin(0, 0);
      if (on) elGlow(t, true);
      c.add(t);
      c.add(elDiamond(scene, 7, !on).setPosition(bw - 30, 36));
      let ty = 74;
      made[k]!.forEach((tx) => {
        const dot = scene.add.graphics();
        dot.fillStyle(EL.GOLD, 0.7).fillPoints(diamondPts(30, ty + 14, 4), true);
        tx.setPosition(48, ty);
        c.add([dot, tx]);
        ty += tx.height + 6;
      });
      const z = scene.add.zone(bw / 2, h / 2, bw, h).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        set(op.id);
        render();
      });
      c.add(z);
      view.add(c);
    });
    return y + h;
  };

  const newView = (what: 'all' | 'cards' | 'body'): void => {
    const s = sums[st.slot] ?? null;
    if (st.step === 2) {
      if (what === 'cards') return;
      let y = 280;
      kicker(EDGE, y, 'Mode');
      y = optionRow(y + 34, MODES, st.mode, (v) => (st.mode = v)) + 32;
      kicker(EDGE, y, 'Difficulty');
      y = optionRow(y + 34, DIFFS.map((d) => ({ id: d, name: diffName(d), lines: [CONFIG.difficulties[d].text] })), st.diff, (v) => (st.diff = v)) + 44;
      const cy = y + 35;
      button('Back', () => ((st.step = 1), render()), EDGE, cy, false, 200);
      view.add(elBody(scene, W / 2, cy, `Slot ${st.slot + 1} · Mode and difficulty cannot be changed later.`, 21, EL.MUTED, false, 800).setOrigin(0.5).setAlign('center'));
      const begin = elButton(scene, 'Begin the journey', () => o.onStart?.(st.mode, st.diff, st.slot), { kind: 'primary', h: 70, size: 23, ready: true, touch: { minPx: 48 } });
      begin.root.setPosition(RIGHT - begin.w / 2, cy);
      view.add(begin.root);
      return;
    }
    if (what !== 'body') slotCards(280, 560);
    if (what === 'cards') return;
    const cy = 925;
    if (st.confirm) {
      confirmBox(EDGE, 880, W - EDGE * 2, st.confirm);
      return;
    }
    if (!s) {
      button('Choose', () => ((st.step = 2), render()), RIGHT, cy, true, 240, 'right');
      return;
    }
    if (s.mapChanged && !s.saveCount) {
      button('Restart here', () => ((st.step = 2), render()), RIGHT, cy, true, 260, 'right'); // silinecek kayıt yok: onay gerekmez
      return;
    }
    const l = s.latest;
    button('Overwrite this slot', () => {
      st.confirm = {
        text: `Slot ${st.slot + 1} holds a journey (${modeName(s.mode)}, ${l ? `stop ${l.summary.stop}, ${l.summary.node}` : 'not saved yet'}) with ${s.saveCount} save${s.saveCount === 1 ? '' : 's'}. Overwriting deletes it for good.`,
        yes: 'Accept',
        run: () => ((st.step = 2), render()),
      };
      render('body');
    }, RIGHT, cy, true, undefined, 'right');
  };

  const loadView = (what: 'all' | 'cards' | 'body'): void => {
    if (what !== 'body') slotCards(250, 300);
    if (what === 'cards') return;
    const s = sums[st.slot] ?? null;
    const px = EDGE;
    const pw = W - EDGE * 2;
    const py = 580;
    let ph = 120;
    const before = view.length; // panel çerçevesi bu öğelerin arkasına eklenir
    if (!s) {
      view.add(elBody(scene, px + 32, py + 40, 'This slot is empty.', 26, EL.NOTE, false).setOrigin(0, 0));
    } else if (st.confirm) {
      ph = confirmBox(px + 20, py + 20, pw - 40, st.confirm) + 40;
    } else {
      kicker(px + 32, py + 26, 'Saves');
      if (!o.onlySlot) {
        button('Delete slot', () => {
          st.confirm = {
            text: `Delete slot ${st.slot + 1}? The whole journey (${modeName(s.mode)}) and all of its ${s.saveCount} save${s.saveCount === 1 ? '' : 's'} will be lost. This cannot be undone.`,
            yes: 'Delete',
            run: () => {
              deleteSlot(storage(), st.slot);
              sums = slotSummaries(storage());
              o.onChanged?.();
              render('both');
            },
          };
          render('body');
        }, px + pw - 32, py + 36, false, 200, 'right');
      }
      const saves = listSaves(storage(), st.slot);
      const top = py + 76;
      const cw = (pw - 64 - 30) / 2;
      const rowH = 124; // telefonda ~44 gerçek piksel: dokunma alanı komşuya binmez
      if (!saves.length) view.add(elBody(scene, px + 32, top + 10, 'No saved games in this slot.', 22, EL.MUTED, false).setOrigin(0, 0));
      const g = scene.add.graphics();
      view.add(g);
      saves.forEach((e, k) => {
        const x0 = px + 32 + (k % 2) * (cw + 30);
        const ry = top + Math.floor(k / 2) * rowH;
        g.lineStyle(1, EL.GOLD, EL.LINE.a1).lineBetween(x0, ry, x0 + cw, ry);
        const tw = cw - 130 - 110 - 70;
        view.add(elText(scene, x0, ry + 16, `${kindName(e.kind)}${k === 0 ? ' · Newest' : ''}`, 13, KICKER, { em: 0.2 }).setOrigin(0, 0));
        view.add(fitW(elText(scene, x0, ry + 38, `${progressText(e.summary, true)} · ${e.summary.node}`, 21, EL.TXT, { em: 0.04, upper: false }).setOrigin(0, 0), tw));
        view.add(fitW(elBody(scene, x0, ry + 70, `${e.summary.region} · ${dateText(e.savedAt)}`, 18, EL.MUTED, false).setOrigin(0, 0), tw));
        const cy = ry + rowH / 2;
        const lb = elButton(scene, 'Load', () => o.onLoad?.(e), { kind: 'primary', w: 130, h: 58, size: 20, ready: true, touch: { maxH: rowH + 8, maxExtraW: 8, minPx: 48 } });
        lb.root.setPosition(x0 + cw - 110 - 22 - 65, cy);
        const db = elButton(scene, 'Delete', () => {
          st.confirm = {
            text: `Delete the save at stop ${e.summary.stop}, ${e.summary.node}? This cannot be undone.`,
            yes: 'Delete',
            run: () => {
              deleteSave(storage(), st.slot, e.id);
              sums = slotSummaries(storage());
              o.onChanged?.();
              render('both');
            },
          };
          render('body');
        }, { kind: 'secondary', w: 110, h: 50, size: 16, touch: { maxH: rowH + 8, maxExtraW: 20, minPx: 48 } });
        db.root.setPosition(x0 + cw - 55, cy);
        view.add([lb.root, db.root]);
      });
      ph = 76 + Math.max(1, Math.ceil(saves.length / 2)) * rowH + 16;
    }
    view.addAt(elPanel(scene, px, py, pw, Math.min(H - 20 - py, ph), { corners: true, alpha: 0.95 }), before);
  };

  // Giriş hareketi yalnızca görünüm gerçekten değişince (ilk açılış, adım I <-> II, onay kutusu) oynar. Kart / seçenek tıklaması yalnızca
  // seçimi günceller: görünüm yeniden kurulur ama sönüp yükselmez (Ömer 2026-10-12: her tıklamada tüm kutu baştan yükleniyormuş gibi görünüyordu).
  let lastStep: number | null = null;
  const fadeBody = () => {
    scene.tweens.killTweensOf(bodyC);
    bodyC.setAlpha(0);
    scene.tweens.add({ targets: bodyC, alpha: 1, duration: 180, ease: EL.EASE });
  };
  /** what: 'all' = her şey; 'body' = yalnızca alt alan (onay aç/kapat); 'both' = kartlar + alt alan, giriş hareketi yok (silme sonrası sayılar). */
  const render = (what: 'all' | 'body' | 'both' = 'all') => {
    if (closed) return;
    const doCards = what !== 'body';
    if (what === 'all') drawSteps();
    if (doCards) cardsC.removeAll(true);
    bodyC.removeAll(true);
    view = bodyC;
    const part = what === 'body' ? 'body' : 'all';
    if (o.flow === 'new') newView(part);
    else loadView(part);
    view = bodyC;
    if (what !== 'all') return fadeBody();
    if (st.step === lastStep) return;
    lastStep = st.step;
    scene.tweens.killTweensOf(viewRoot);
    viewRoot.setAlpha(0).setY(14);
    scene.tweens.add({ targets: viewRoot, alpha: 1, y: 0, duration: 260, ease: EL.EASE });
  };

  const api: SlotBrowser = {
    root,
    back() {
      if (closed) return;
      if (st.confirm) {
        st.confirm = null;
        return render('body');
      }
      if (st.step === 2) {
        st.step = 1;
        return render();
      }
      api.close();
      o.onClose();
    },
    close() {
      if (closed) return;
      closed = true;
      root.destroy(true);
    },
  };
  render();
  // Ortak panel geçişi (data/ui-motion.json > panel; Reduced motion = anında)
  const pm = motion('panel');
  root.setAlpha(pm.ms > 0 ? 0 : 1);
  if (pm.ms > 0) scene.tweens.add({ targets: root, alpha: 1, duration: pm.ms, ease: EL.EASE });
  return api;
}

function latestSlot(sums: Array<SlotSummary | null>): number {
  let best = 0;
  let t = -Infinity;
  sums.forEach((s, i) => {
    const v = s ? Date.parse(s.lastPlayed) : NaN;
    if (s && s.saveCount > 0 && v > t) {
      t = v;
      best = i;
    }
  });
  return best;
}
