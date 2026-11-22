/**
 * Redtithe (iç id antimage; eski Anti-Mage) - SÜRÜM 2 SKILL ANİMASYONLARI. Kılavuz: docs/design/art-v2.md
 *
 * Karakter: çift hançerli kan avcısı (Blood Hunter). Görsel dil (Ömer 2026-11-22 "yeni skill effectlerini kodla"): KAN; kan kırmızısı, koyu
 * bordo, sıcak kor vurgusu. Her şey piksel hizalı kod çizimi: kan damlası, kan ipliği / damarı, kesik, kan havuzu, damga (brand) işareti,
 * kan zarı (Mirror Vein). Mor / mavi yalnız eski Ley Thread durum efektlerinde (emekli) kalır. Ayna tarafı: bakış yönü (`face`).
 *
 * Skill -> anahtar: mana_burn -> 'manasteal', drain_field -> 'drainfield', spell_ward -> 'spellward', void_strike -> 'voidstrike'
 * Promise VURUŞ ANINDA çözülür; tüm süreler k.slow() ile skillSlowdown'a uyar.
 */
import { FULL_W } from '../../../ui/viewport'; // geniş ekran: tam ekran karartma görünen alanın tamamını kaplar
import type Phaser from 'phaser';
import type { CombatantView } from '../../combatant-view';
import type { VfxCtx } from '../../vfx';
import type { VfxKit } from '../../vfx-versions';
import type { V2Vfx } from '../types';

type Pt = { x: number; y: number };
type Img = Phaser.GameObjects.Image;

const VIOLET = ['#e3ccff', '#b872ff', '#9b59d0', '#7d3fb0'];
const ACCENT = '#9b59d0';

const face = (v: CombatantView): number => (v.combatant.side === 'party' ? 1 : -1);
/** Kaldırılmış eldiven (tabletlerin döndüğü el) ve kılıcın ortası. */
// v2 pozlu birim (Pose Tester): silahın ucu / tılsımlı el (CombatantView.castPoint), yoksa sprite oranı
const handOf = (v: CombatantView): Pt => v.castPoint() ?? { x: v.container.x + face(v) * v.w * 0.36, y: v.container.y - v.h * 0.72 };

const dotTex = (k: VfxKit, s: Phaser.Scene): string =>
  k.softTexture(s, 'v2am:dot', 48, 48, (x, y) => {
    const d = Math.hypot((x + 0.5 - 24) / 24, (y + 0.5 - 24) / 24);
    return d >= 1 ? null : { c: '#ffffff', a: (1 - d) ** 1.5 };
  });
/** Kan damlası (10x16, ucu yukarı): koyu kontur, kırmızı gövde, sağ altta bordo gölge, solda tek açık parıltı. */
const dropTex = (k: VfxKit, s: Phaser.Scene): string => {
  const inside = (x: number, y: number): boolean => {
    const px = x + 0.5;
    const py = y + 0.5;
    if (py >= 10.5) return Math.hypot(px - 5, py - 10.5) <= 4.6;
    return py >= 1 && Math.abs(px - 5) <= ((py - 1) / 9.5) * 4.6;
  };
  return k.softTexture(s, 'v2am:blooddrop', 10, 16, (x, y) => {
    if (!inside(x, y)) return null;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) return { c: '#3a0508', a: 1 };
    if ((x === 3 && (y === 9 || y === 10)) || (x === 4 && y === 8)) return { c: '#ffd9cf', a: 1 };
    return { c: x >= 6 && y >= 11 ? '#8e0c16' : '#c0182a', a: 1 };
  });
};
/** Kan paleti (Redtithe): açık parıltı, açık kan, kan kırmızısı, bordo, en koyu kontur, kor vurgusu. */
const BLOOD = { hi: '#ffd9cf', light: '#ff7b70', red: '#c0182a', deep: '#8e0c16', dark: '#3a0508', ember: '#ff9a3c' };
const SPRAY = [BLOOD.light, BLOOD.red, BLOOD.red, BLOOD.deep];
const hex = (h: string): number => parseInt(h.slice(1), 16);

function glow(c: VfxCtx, k: VfxKit, x: number, y: number, size: number, tint: number, alpha: number, depth = k.DEPTH + 40): Img {
  return c.scene.add.image(x, y, dotTex(k, c.scene)).setDisplaySize(size, size).setTint(tint).setAlpha(alpha).setDepth(depth).setBlendMode(k.Phaser.BlendModes.ADD);
}
function fade(c: VfxCtx, k: VfxKit, obj: Phaser.GameObjects.GameObject, delay: number, dur: number, extra: Record<string, unknown> = {}): void {
  c.scene.tweens.add({ targets: obj, alpha: 0, delay: k.slow(delay), duration: k.slow(dur), ...extra, onComplete: () => obj.destroy() });
}

/** Kan damlası görüntüsü (`size` boy; en 10:16). */
function drop(c: VfxCtx, k: VfxKit, x: number, y: number, size: number, depth = k.DEPTH + 36): Img {
  return c.scene.add.image(k.snap(x), k.snap(y), dropTex(k, c.scene)).setDisplaySize(Math.round(size * 0.625), size).setDepth(depth);
}

/** Kaldırılmış elin çevresinde dönen kan damlaları (Blood Brand / Mirror Vein hazırlığı). Döndürür: damlalar + durdurucu. */
function handDrops(c: VfxCtx, k: VfxKit, n: number, r: number): { list: Img[]; stop: () => void } {
  const hand = handOf(c.actor);
  const list = Array.from({ length: n }, () => drop(c, k, hand.x, hand.y, 30, k.DEPTH + 34).setAlpha(0));
  let ang = 0;
  const ev = c.scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      ang += 0.09;
      list.forEach((d, i) => {
        if (d.getData('free')) return;
        const a = ang + (i / n) * Math.PI * 2;
        d.setPosition(k.snap(hand.x + Math.cos(a) * r), k.snap(hand.y + Math.sin(a) * r * 0.9));
      });
    },
  });
  list.forEach((d, i) => c.scene.tweens.add({ targets: d, alpha: 1, duration: k.slow(120), delay: k.slow(i * 25) }));
  const g = glow(c, k, hand.x, hand.y, 50, hex(BLOOD.red), 0, k.DEPTH + 33);
  c.scene.tweens.add({ targets: g, alpha: 0.7, displayWidth: 100, displayHeight: 100, duration: k.slow(200) });
  fade(c, k, g, 260, 200);
  return { list, stop: () => ev.remove() };
}

/** Yere düşen kan: zeminde koyu leke (yavaş söner) + yukarı küçük sıçrama. */
function splat(c: VfxCtx, k: VfxKit, x: number, y: number, w = 30): void {
  const g = c.scene.add.graphics().setDepth(k.FLOOR_FX + 1);
  g.fillStyle(hex(BLOOD.dark), 0.75).fillEllipse(k.snap(x), k.snap(y), w, w * 0.34);
  g.fillStyle(hex(BLOOD.deep), 0.9).fillEllipse(k.snap(x), k.snap(y - 1), w * 0.62, w * 0.2);
  fade(c, k, g, 260, 420);
  k.burst(c.scene, x, y - 2, { colors: SPRAY, n: 4, speed: [60, 170], angle: [-Math.PI * 0.9, -Math.PI * 0.1], gravity: 900, life: [200, 360], size: [4, 7] });
}

/**
 * Damga (brand) işareti: eşkenar dörtgen + boydan boya çizgi + üstte kısa çubuk (ondalık / damga mührü). `flat`: zemin perspektifi (y ezilir).
 * Önce koyu kontur, sonra renk; piksel hizalı.
 */
function sigil(g: Phaser.GameObjects.Graphics, k: VfxKit, x: number, y: number, s: number, col: number, alpha: number, flat = 1, width = 3): void {
  const P = (dx: number, dy: number): Pt => ({ x: k.snap(x + dx), y: k.snap(y + dy * flat) });
  const dia = [P(0, -s), P(s * 0.62, 0), P(0, s), P(-s * 0.62, 0)];
  for (const [w, cc, aa] of [[width + 2, hex(BLOOD.dark), alpha * 0.8], [width, col, alpha]] as const) {
    g.lineStyle(w, cc, aa).strokePoints(dia, true);
    const t = P(0, -s * 1.35);
    const b = P(0, s * 1.35);
    g.lineBetween(t.x, t.y, b.x, b.y);
    const l = P(-s * 0.36, -s * 0.5);
    const r = P(s * 0.36, -s * 0.5);
    g.lineBetween(l.x, l.y, r.x, r.y);
  }
}

/** Bu kullanımda hedef ıskaladı / kaçındı / blokladı mı (mana çekilmez, yalnız saldırı animasyonu oynar; Ömer 2026-11-07). */
const avoidedBy = (c: VfxCtx, v: CombatantView): boolean => (c.usage?.events ?? []).some((e) => (e.type === 'miss' || e.type === 'dodge' || e.type === 'block') && e.target === v.combatant.uid);

/**
 * Bedenden sökülen KAN: damlalar yaradan fışkırır, sonra eğriyle `to()` noktasına çekilir (arkasında ince kan izi), varınca incelip yutulur.
 * Iskalanan hedeften kan çekilmez. `down`: yere (kan havuzuna) doğru akar.
 */
function bleed(c: VfxCtx, k: VfxKit, from: CombatantView, to: () => Pt, o: { n: number; dur: number; onAbsorb?: () => void; down?: boolean }): Promise<void> {
  if (avoidedBy(c, from)) return Promise.resolve();
  const p = k.spot(from);
  const drops = Array.from({ length: o.n }, () => {
    const s = drop(c, k, p.x, p.y, k.rnd(16, 24), k.DEPTH + 34).setAlpha(0);
    const a = k.rnd(-Math.PI * 0.95, -Math.PI * 0.05);
    const out = k.rnd(50, 110);
    return { s, sx: s.scaleX, sy: s.scaleY, start: { x: p.x + k.rnd(-from.w * 0.22, from.w * 0.22), y: p.y + k.rnd(-from.h * 0.18, from.h * 0.22) }, a, out, delay: k.rnd(0, 0.22), ctrl: k.rnd(40, 120), done: false };
  });
  const trail = c.scene.add.graphics().setDepth(k.DEPTH + 32);
  let absorbed = 0;
  return k.counter(c.scene, k.slow(o.dur), (u) => {
    trail.clear();
    const dst = to();
    for (const d of drops) {
      if (d.done) continue;
      const l = Math.max(0, (u - d.delay) / (1 - d.delay));
      if (l <= 0) continue;
      let x: number;
      let y: number;
      let rot: number;
      const burstK = 0.28;
      if (l < burstK) {
        const e = 1 - (1 - l / burstK) ** 2;
        x = d.start.x + Math.cos(d.a) * d.out * e;
        y = d.start.y + Math.sin(d.a) * d.out * e * 0.8;
        rot = d.a + Math.PI / 2;
      } else {
        const kk = (l - burstK) / (1 - burstK);
        const e = kk * kk;
        const ax = d.start.x + Math.cos(d.a) * d.out;
        const ay = d.start.y + Math.sin(d.a) * d.out * 0.8;
        const cx = (ax + dst.x) / 2;
        const cy = o.down ? Math.max(ay, dst.y) + d.ctrl * 0.3 : Math.min(ay, dst.y) - d.ctrl;
        const bx = (t: number) => (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * dst.x;
        const by = (t: number) => (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * dst.y;
        x = bx(e);
        y = by(e);
        const e2 = Math.min(1, e + 0.04);
        // damla ucu geriye (gidiş yönünün tersine) bakar: hızla çekilen sıvı
        rot = Math.atan2(by(e2) - y, bx(e2) - x) - Math.PI / 2;
        const e0 = Math.max(0, e - 0.16);
        trail.lineStyle(4, THREAD.edge, 0.7 * (1 - kk * 0.4)).lineBetween(k.snap(bx(e0)), k.snap(by(e0)), k.snap(x), k.snap(y));
        trail.lineStyle(2, THREAD.body, 0.9 * (1 - kk * 0.4)).lineBetween(k.snap(bx(e0)), k.snap(by(e0)), k.snap(x), k.snap(y));
        d.s.setScale(d.sx * (1 - 0.4 * kk), d.sy * (1 + 0.9 * kk));
        if (kk >= 1) {
          d.done = true;
          d.s.destroy();
          if (absorbed++ % 3 === 0) {
            void k.ring(c.scene, dst.x, dst.y, { r: 40, flat: 0.8, n: 10, colors: SPRAY, dur: 220, size: 5 });
            o.onAbsorb?.();
          }
          continue;
        }
      }
      d.s.setPosition(k.snap(x), k.snap(y)).setRotation(rot).setAlpha(Math.min(1, l * 8));
    }
    if (u >= 1) {
      for (const d of drops) if (!d.done) d.s.destroy();
      trail.destroy();
    }
  });
}

// =====================================================================================================================
// MANA STEAL

/**
 * Tithe Cut (eski Mana Steal; motor: yakın dövüş; görünüm: yerinden, skills.json > viewMotion 'ranged'; tek hedef) - "iplikli hançer"
 * (Lead 2026-11-21, Ömer: "elindeki hançerleri bir şekilde kullanacak"): Redtithe hedefe koşmaz; yarım adım öne hamle (step), sonra atış
 * pozunda ÖN ELİNDEKİ hançeri savurur (atış pozunda açık ön elde hançer çizilmez, arka eldeki kalır). Hançer düz ve hızlı hedefe uçar,
 * arkasında elden topuza gergin ince kan ipliği; değince kısa kanlı kesik + damlalar (vuruş anı ~0,34 sn, eski atışla aynı). Sonra Redtithe
 * ipliği çeker: hançer aynı yoldan geri döner, ele oturur (boşta pozu: el yine hançerli), iplik kaybolur. "+N Blood" motor olayıyla
 * dönüş anına denk gelir (süre ayarı: vuruş -> Blood olayı ~0,2 sn). Iskada da hançer uçar ve döner, kesik yok.
 * Uçan hançer ELDEKİ hançerin birebir aynısı (CombatantView.offItemSprite: pişirmede saklanan çizim, aynı boy, tutuş noktası orijin); doku yoksa
 * (pozsuz görünüm) kitin 'throwdagger' sprite'ı.
 */
/** Kan ipliği / kesik renkleri. */
const THREAD = { edge: 0x3a0508, body: 0xb3121f, hi: 0xff7b70 };
const BLOOD_CUT = ['#ffe0d8', '#ff7b70', '#d81f2c', '#8e0c16'];
/** Zaman çizelgesi (ham ms, k.slow ile): hamle, uçuş (vuruş anı = hamle + uçuş), vuruştan sonra bekleme, geri dönüş. */
const TC = { lunge: 110, fly: 230, hold: 60, back: 150, knife: 48, step: 36 };

/** Gergin kan ipliği: `from()` (ön el) -> `to()` (hançer topuzu), her karede yeniden okunur. */
function bloodThread(c: VfxCtx, k: VfxKit, from: () => Pt, to: () => Pt): { draw: () => void; destroy: () => void } {
  const g = c.scene.add.graphics().setDepth(k.DEPTH + 35);
  const draw = (): void => {
    const a = from();
    const b = to();
    g.clear();
    g.lineStyle(5, THREAD.edge, 0.85).lineBetween(k.snap(a.x), k.snap(a.y), k.snap(b.x), k.snap(b.y));
    g.lineStyle(3, THREAD.body, 1).lineBetween(k.snap(a.x), k.snap(a.y), k.snap(b.x), k.snap(b.y));
    g.lineStyle(1, THREAD.hi, 0.9).lineBetween(k.snap(a.x), k.snap(a.y) - 1, k.snap(b.x), k.snap(b.y) - 1);
  };
  return { draw, destroy: () => g.destroy() };
}

const manasteal: V2Vfx = async (c, k) => {
  const t0 = c.targets[0];
  if (!t0) return;
  const dir = t0.container.x >= c.actor.container.x ? 1 : -1;
  const home = c.actor.container.x;
  c.scene.tweens.add({ targets: c.actor.container, x: home + dir * TC.step, duration: k.slow(TC.lunge), ease: 'Quad.easeOut' });
  await k.wait(c.scene, k.slow(TC.lunge));
  // atış pozu: ön el açık (hançer elden çıktı), arka el hançerli. Solma YOK: adım pozunun hayaleti ön eldeki hançeri bir an daha gösterirdi (çift hançer)
  c.actor.showPose('throw', false);
  c.actor.play('attack');
  c.sfx('swordWhoosh');
  const hand = (): Pt => c.actor.handPoint('off') ?? handOf(c.actor);
  const start = hand();
  const to = k.contact(c.actor, t0);
  const ang = Math.atan2(to.y - start.y, to.x - start.x);
  // eldeki hançer: tutuş noktası orijin, ucu uçuş yönüne (çizimde uç yukarı = 0); topuz tutuşun arkasında kalan sap ucu
  const own = c.actor.offItemSprite();
  const knife = own
    ? c.scene.add.image(start.x, start.y, own.key).setOrigin(own.ox, own.oy).setDisplaySize(own.w, own.h).setFlipX(own.flip).setDepth(k.DEPTH + 36).setRotation(ang + Math.PI / 2)
    : k.sprite(c.scene, 'throwdagger', '#d7dce6', start.x, start.y, TC.knife, k.DEPTH + 36).setRotation(ang + Math.PI / 4);
  const back = own ? own.h * (1 - own.oy) : TC.knife * 0.36;
  const pommel = (): Pt => ({ x: knife.x - Math.cos(ang) * back, y: knife.y - Math.sin(ang) * back });
  const thread = bloodThread(c, k, hand, pommel);
  // iplik hançerin o karedeki konumuna çizilir: tween'lerden SONRA (postupdate); zamanlayıcı bir kare geriden izliyordu (topuzla iplik arasında boşluk)
  c.scene.events.on('postupdate', thread.draw);
  thread.draw();
  await k.travel(c.scene, knife, to, TC.fly, { ease: 'in' });
  const hit = c.targets.filter((t) => !avoidedBy(c, t));
  if (hit.length) {
    c.sfx('manaSizzle');
    for (const t of hit) {
      const p = k.contact(c.actor, t);
      void k.arcSlash(c.scene, p.x, p.y, { dir, colors: BLOOD_CUT, from: -0.8, to: 0.8, r: 56, dur: 130, size: 12 });
      k.burst(c.scene, p.x, p.y, { colors: BLOOD_CUT, n: 9, speed: [100, 280], gravity: 900, life: [260, 460], size: [5, 9] });
    }
  }
  // iplik çekilir: hançer aynı yoldan ele döner (arka planda); ele oturunca boşta pozu (el yine hançerli), Redtithe yerine
  void k
    .wait(c.scene, k.slow(TC.hold))
    .then(() => {
      c.sfx('energySlurp');
      let caught = false;
      return k.counter(c.scene, k.slow(TC.back), (u) => {
        if (caught) return; // counter son değeri iki kez verebilir (onUpdate + onComplete)
        const h = hand();
        knife.setPosition(k.snap(to.x + (h.x - to.x) * u), k.snap(to.y + (h.y - to.y) * u));
        // ele oturma AYNI karede: uçan hançer silinir, boşta pozu (el yine hançerli) gelir; ayrı adımda bir kare çift hançer görünürdü
        if (u >= 1) {
          caught = true;
          c.scene.events.off('postupdate', thread.draw);
          thread.destroy();
          knife.destroy();
          c.actor.showPose(null);
        }
      }, 'Quad.easeIn');
    })
    .then(() => {
      if (hit.length) {
        const h = hand();
        const g = glow(c, k, h.x, h.y, 48, 0xd81f2c, 0.6, k.DEPTH + 37);
        fade(c, k, g, 40, 260);
      }
      c.scene.tweens.add({ targets: c.actor.container, x: home, duration: k.slow(180), ease: 'Quad.easeInOut' });
    });
  await k.wait(c.scene, k.slow(40));
};

// =====================================================================================================================
// BLOOD BRAND (iç id drain_field / vfx drainfield)

/**
 * Blood Brand (rect alan, DoT kanama + damga): Redtithe elini kaldırır, avucunda kan damlaları döner; damlalar alanın 4 köşesine ve
 * merkezine uçup yere SIÇRAR (kan lekesi). Lekelerin arasında hücreler merkezden dışa koyu kan havuzuna döner, her hücreye DAMGA işareti
 * (eşkenar dörtgen + çizgi) kazınır; kızınca damga kor rengine yanar. Sonra alandaki her hedefin göğsünde küçük bir kor damga parlar,
 * yarasından kan aşağı, havuza süzülür (kanama başladı). Havuz yavaşça kurur. Zamanlama v1 ile aynı (ilk sayı ~mühür + 0,5 sn).
 */
const drainfield: V2Vfx = async (c, k) => {
  c.sfx('voidSuction');
  c.actor.play('cast');
  const hd = handDrops(c, k, 5, 46);
  c.sfx('tabletClack');
  const slots = c.slots?.length ? c.slots : c.targets.map((t) => t.combatant.slot);
  const midSlot = c.center !== undefined && slots.includes(c.center) ? c.center : slots[0];
  const center = midSlot !== undefined ? k.cellMid(c.board, midSlot) : (c.centerPos ?? k.feet(c.actor));
  const quads = slots.map((s) => ({ s, q: k.quadOf(c.board, s, 1), m: k.cellMid(c.board, s) }));
  // alanın 4 köşesi (tüm hücre köşelerinin en uç olanları) + merkez
  const pts = quads.flatMap((x) => x.q);
  const pick = (f: (p: Pt) => number) => pts.reduce((b, p) => (f(p) > f(b) ? p : b));
  const stakes: Pt[] = [pick((p) => -p.x - p.y * 0.3), pick((p) => p.x - p.y * 0.3), pick((p) => p.x + p.y * 0.3), pick((p) => -p.x + p.y * 0.3), center];
  await k.wait(c.scene, k.slow(220));
  hd.stop();
  // damlalar köşelere uçar, yere sıçrar
  const land = hd.list.map(async (d, i) => {
    d.setData('free', true);
    const to = stakes[i % stakes.length]!;
    await k.travel(c.scene, d, { x: to.x, y: to.y - 6 }, 240, { ease: 'in', arc: 90 });
    d.destroy();
    splat(c, k, to.x, to.y, 34);
    const g = glow(c, k, to.x, to.y - 6, 60, hex(BLOOD.red), 0.8, k.DEPTH + 30);
    fade(c, k, g, 0, 300);
  });
  await Promise.all(land);
  c.actor.play('idle');
  c.sfx('tabletClack');
  // kan havuzu + damga
  const floor = c.scene.add.graphics().setDepth(k.FLOOR_FX);
  const dist = quads.map((x) => Math.hypot(x.m.x - center.x, x.m.y - center.y));
  const span = Math.max(1, ...dist);
  const glows = quads.map((x) => glow(c, k, x.m.x, x.m.y, 1, hex(BLOOD.red), 0, k.FLOOR_FX + 2));
  const shrink = (q: Pt[], sc: number) => {
    const cx = (q[0]!.x + q[2]!.x) / 2;
    const cy = (q[0]!.y + q[2]!.y) / 2;
    return q.map((p) => ({ x: k.snap(cx + (p.x - cx) * sc), y: k.snap(cy + (p.y - cy) * sc) }));
  };
  const draw = (u: number, hot = 0) => {
    floor.clear();
    quads.forEach((x, i) => {
      const v = Math.max(0, Math.min(1, (u - (dist[i]! / span) * 0.5) / 0.5));
      if (v <= 0) return;
      const e = 1 - (1 - v) ** 2;
      floor.fillStyle(hex(BLOOD.dark), 0.62 * e).fillPoints(shrink(x.q, 0.98), true);
      floor.fillStyle(hot ? hex(BLOOD.red) : hex(BLOOD.deep), (0.5 + 0.1 * hot) * e).fillPoints(shrink(x.q, 0.72 * e), true);
      floor.lineStyle(3, hex(BLOOD.red), 0.9 * e).strokePoints(shrink(x.q, 0.98), true);
      // damga: hücre ortasında, zemin perspektifiyle ezik
      const h = Math.abs(x.q[2]!.y - x.q[0]!.y) || 40;
      sigil(floor, k, x.m.x, x.m.y, h * 0.32 * e, hot ? hex(BLOOD.ember) : hex(BLOOD.light), 0.9 * e, 0.9, 3);
      glows[i]!.setAlpha((0.4 + 0.45 * hot) * e).setDisplaySize(150 * e, 64 * e);
    });
  };
  await k.counter(c.scene, k.slow(420), (u) => draw(u), 'Quad.easeOut');
  c.sfx('voidPulse');
  draw(1, 1);
  k.flash(c.scene, BLOOD.dark, 0.22, 300);
  k.shake(c.scene, 180, 0.005);
  // kanama: her hedefin göğsünde kor damga, yarasından kan havuza süzülür
  c.sfx('energySlurp');
  let release: () => void = () => undefined;
  const firstSink = new Promise<void>((r) => (release = r));
  for (const t of c.targets) {
    if (avoidedBy(c, t)) continue;
    const fp = k.feet(t);
    const sp = k.spot(t);
    const mark = c.scene.add.graphics().setDepth(k.DEPTH + 38);
    sigil(mark, k, sp.x, sp.y, 13, hex(BLOOD.ember), 1, 1, 3);
    mark.setAlpha(0);
    c.scene.tweens.add({ targets: mark, alpha: 1, duration: k.slow(90) });
    fade(c, k, mark, 520, 360);
    const mg = glow(c, k, sp.x, sp.y, 70, hex(BLOOD.ember), 0.75, k.DEPTH + 37);
    fade(c, k, mg, 120, 320);
    void bleed(c, k, t, () => ({ x: fp.x, y: fp.y }), { n: 8, dur: 620, down: true, onAbsorb: () => {
      release();
      splat(c, k, fp.x + k.rnd(-10, 10), fp.y, 26);
    } });
    const fx = t.sprite.postFX?.addGlow(k.color(BLOOD.red), 8, 0, false, 0.1, 16);
    if (fx) c.scene.tweens.add({ targets: fx, outerStrength: 0, duration: k.slow(1100), delay: k.slow(300), onComplete: () => t.sprite.postFX?.remove(fx) });
  }
  if (!c.targets.some((t) => !avoidedBy(c, t))) release();
  // kuyruk: havuz kurur
  void k.wait(c.scene, k.slow(720)).then(() => {
    c.scene.tweens.add({ targets: [floor, ...glows], alpha: 0, duration: k.slow(600), onComplete: () => { floor.destroy(); glows.forEach((g) => g.destroy()); } });
  });
  await Promise.race([firstSink, k.wait(c.scene, k.slow(500))]);
};

// =====================================================================================================================
// MIRROR VEIN (iç id spell_ward / vfx spellward)

/**
 * Mirror Vein (dostlara kalkan; kalkana vuran yansır): Redtithe elini kaldırır, avucunda kan damlaları döner; elinden her dosta birer kan
 * DAMARI uzanır (kendine ise yerinde). Damar varınca dostun çevresinde ince bir KAN ZARI kapanır: koyu kırmızı yarı saydam oval, kırmızı
 * kontur, içinde dallanan damarlar ve üst solda soluk AYNA parıltısı (yansıtma). Kapanınca dışa kan damlaları sıçrar. Zar bir süre solgun
 * kalıp söner. Kalkan rakamı kapanınca (v1 ile aynı zamanlama).
 */
const spellward: V2Vfx = async (c, k) => {
  c.sfx('wardHum');
  c.actor.play('cast');
  const hand = handOf(c.actor); // damarlar kaldırılmış avuçtan çıkar (idle'a dönmeden önce ölçülür)
  const hd = handDrops(c, k, 6, 50);
  await k.wait(c.scene, k.slow(190));
  c.actor.play('idle');
  hd.stop();
  for (const d of hd.list) fade(c, k, d, 0, 200, { displayWidth: 4, displayHeight: 6 });
  await Promise.all(
    c.targets.map(async (t) => {
      const mid = k.spot(t);
      const R = Math.max(t.w * 0.62, t.h * 0.5);
      // damar: elden dosta uzanan, hafif dalgalı kan çizgisi
      const vein = c.scene.add.graphics().setDepth(k.DEPTH + 33);
      const wob = k.rnd(0, Math.PI * 2);
      const N = 14;
      const path = (u: number): Pt[] =>
        Array.from({ length: Math.max(2, Math.round(N * u) + 1) }, (_, i) => {
          const s = i / N;
          const x = hand.x + (mid.x - hand.x) * s;
          const y = hand.y + (mid.y - hand.y) * s - Math.sin(s * Math.PI) * 40 + Math.sin(s * 9 + wob) * 4;
          return { x: k.snap(x), y: k.snap(y) };
        });
      const drawVein = (u: number) => {
        vein.clear();
        const pp = path(u);
        vein.lineStyle(5, THREAD.edge, 0.85).strokePoints(pp, false);
        vein.lineStyle(3, THREAD.body, 1).strokePoints(pp, false);
        vein.lineStyle(1, THREAD.hi, 0.8).strokePoints(pp, false);
      };
      if (t === c.actor) await k.wait(c.scene, k.slow(120));
      else await k.counter(c.scene, k.slow(220), (u) => drawVein(u), 'Quad.easeOut');
      fade(c, k, vein, 60, 260);
      await k.wait(c.scene, k.slow(90));
      c.sfx('wardLock');
      // kan zarı kapanır
      const mem = c.scene.add.graphics().setDepth(k.DEPTH + 26);
      const rx = R * 0.8;
      const ry = R * 0.92;
      const veins = Array.from({ length: 5 }, (_, i) => ({ a: (i / 5) * Math.PI * 2 + k.rnd(-0.3, 0.3), bend: k.rnd(-0.5, 0.5), fork: k.rnd(0.45, 0.7) }));
      const drawMem = (e: number) => {
        mem.clear();
        const mx = k.snap(mid.x);
        const my = k.snap(mid.y);
        mem.fillStyle(hex(BLOOD.deep), 0.16 * e).fillEllipse(mx, my, rx * 2 * e, ry * 2 * e);
        // damarlar: kenardan içe dallanır
        for (const v of veins) {
          const ex = mid.x + Math.cos(v.a) * rx * e;
          const ey = mid.y + Math.sin(v.a) * ry * e;
          const ix = mid.x + Math.cos(v.a + v.bend) * rx * e * 0.62;
          const iy = mid.y + Math.sin(v.a + v.bend) * ry * e * 0.62;
          const fx = ex + (ix - ex) * v.fork;
          const fy = ey + (iy - ey) * v.fork;
          mem.lineStyle(2, hex(BLOOD.red), 0.6 * e).lineBetween(k.snap(ex), k.snap(ey), k.snap(ix), k.snap(iy));
          const ba = v.a + v.bend + 0.9;
          mem.lineStyle(2, hex(BLOOD.red), 0.45 * e).lineBetween(k.snap(fx), k.snap(fy), k.snap(fx - Math.cos(ba) * rx * 0.18 * e), k.snap(fy - Math.sin(ba) * ry * 0.18 * e));
        }
        mem.lineStyle(6, THREAD.edge, 0.8 * e).strokeEllipse(mx, my, rx * 2 * e, ry * 2 * e);
        mem.lineStyle(3, hex(BLOOD.red), 0.95 * e).strokeEllipse(mx, my, rx * 2 * e, ry * 2 * e);
        // ayna parıltısı: üst solda soluk yay
        mem.lineStyle(3, hex(BLOOD.hi), 0.7 * e).beginPath();
        mem.arc(mx, my, Math.min(rx, ry) * 0.78 * e, Math.PI * 1.08, Math.PI * 1.42, false);
        mem.strokePath();
      };
      void k.counter(c.scene, k.slow(200), (u) => drawMem(1 - (1 - u) ** 3));
      const fl = glow(c, k, mid.x, mid.y, R * 2.1, hex(BLOOD.red), 0.4, k.DEPTH + 25);
      fade(c, k, fl, 60, 320);
      // kapanınca dışa kan damlaları
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const px = mid.x + Math.cos(a) * rx;
        const py = mid.y + Math.sin(a) * ry;
        const d = drop(c, k, px, py, 16, k.DEPTH + 37).setRotation(a - Math.PI / 2).setAlpha(0);
        c.scene.tweens.add({ targets: d, x: px + Math.cos(a) * 30, y: py + Math.sin(a) * 30, alpha: 1, duration: k.slow(110), delay: k.slow(120), ease: 'Back.easeOut', yoyo: true, hold: k.slow(90), onComplete: () => d.destroy() });
      }
      void k.ring(c.scene, mid.x, mid.y, { r: R * 1.15, flat: 0.95, n: 18, colors: SPRAY, dur: 360, size: 5 });
      // kuyruk: zar solar
      c.scene.tweens.add({ targets: mem, alpha: 0.35, delay: k.slow(300), duration: k.slow(300) });
      fade(c, k, mem, 700, 300);
      await k.wait(c.scene, k.slow(120));
    }),
  );
};

// =====================================================================================================================
// EXSANGUINATE (iç id void_strike / vfx voidstrike) - ulti v3 "Çift Saplama" (Ömer 2026-11-22: "Düşmana yaklaştığı noktada ikisini de
// düşmana saplar gibi bir pozisyona geçip daha sonra gevşeterek geri dönmesi lazım"; tepe kare Redtithe'e özel ek poz twin_stab)

/**
 * Exsanguinate (tek hedef; motor: cast, kan barının TAMAMINI harcar). Hedefin üstünde kendiliğinden küre YOK; Redtithe kendi kanını ve iki
 * hançerini kullanır, ekranda "bedel öde, kanını al" okunur:
 * 1) BEDEL (overhead pozu): bedeninden kan damlaları yükselip kaldırdığı hançerin ağzına akar (harcanan kan barı), hançer ağzı kızarır.
 * 2) ATILIŞ (step): kırmızı art görüntüyle hedefin dibine atılır.
 * 3) ÇİFT SAPLAMA (twin_stab: iki kol öne, iki hançer yatay, uçları hedefte; üst hançer göğüs, alt hançer karın hizası): son adımda öne
 *    itilir, iki hançer hedefe girer. Giriş noktalarında (hançer ucundan biraz geride) dikey kan yarığı açılır, kan fışkırır; isabette kısa
 *    bordo karartma + kırmızı parlama + sarsıntı (vuruş anı = saplama, eski efektle aynı ~0,6 sn; implode burada).
 * 4) HASAT (hançerler saplıyken kısa tutuş): kan yaralardan hançer namlusu boyunca yumruklara doğru yürür, bedenden sökülen damlalar iki ele
 *    çekilir; sonunda iki yumrukta kırmızı parıltı.
 * 5) ÇEKİŞ VE DÖNÜŞ: hançerleri çeker (yaralardan son bir fışkırma), gevşeyerek boşta pozuna geçer, yerine döner (returnHome). Yaralar söner.
 * Iskada: saplama havaya, uçlarda soluk savrulma çizgisi (kan, yara, karartma, sarsıntı, hasat yok), sonra aynı çekiş ve dönüş.
 * Hançer uçları gerçek silah yerleşiminden okunur (weaponLine: el noktası, açı, boy; ikinci hançer handPoint('off') + aynı açı ve boy).
 * Sesler (2026-11-22, Ömer form r41 op_stab): voidPulse başta; implode'un patlaması saplama karesinde (sesin kendi 0,22 sn emiş girişi
 * olduğu için IMPLODE_LEAD kadar önce başlatılır); isabette iki ıslak saplama sesi (daggerStabA saplama karesinde, daggerStabB STAB2_GAP
 * sonra: iki hançer); ıskada saplama sesi yok.
 */
/**
 * Zaman çizelgesi (ham ms, k.slow ile): bedel, atılış, saplama itişi (implode = vuruş), vuruştan sonra çözülme payı, saplı tutuş (hasat),
 * hançeri çekiş, dönüş; push = saplamada öne itiş (px), sink = hançerin hedefe giriş payı (boyun oranı).
 */
/** Hasatta namlu boyunca akan kanın, hançer çizgisinin altına kayması (px). */
const BLADE_DRIP_DY = 4;
/** implode sesinin emiş girişi (gerçek ms, yavaşlatılmaz): patlaması (tepe ~0,22 sn) saplama karesine otursun diye bu kadar önce çalar. */
const IMPLODE_LEAD = 220;
/** İkinci hançerin saplama sesi birincisinden bu kadar sonra (gerçek ms). */
const STAB2_GAP = 40;
const EX = { pay: 220, dash: 190, stab: 130, land: 110, hold: 320, pull: 120, back: 240, push: 30, sink: 0.32 };

/**
 * Hançer kesiği / yarık (yara): `a` -> `b`, `u` (0..1) kadar açılmış; iki ucu sivri, ortası geniş mercek biçimi (çubuk / ışın gibi düz değil).
 * Üç kat: koyu kontur, kan gövdesi, ince açık çekirdek; köşeler piksel hizalı.
 */
function cutLine(g: Phaser.GameObjects.Graphics, k: VfxKit, a: Pt, b: Pt, u: number, w: number, alpha = 1): void {
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / L;
  const ny = (b.x - a.x) / L;
  const N = 10;
  const lens = (half: number): Pt[] => {
    const side = (sg: number) =>
      Array.from({ length: N + 1 }, (_, i) => {
        const s0 = (i / N) * u;
        const h = half * Math.sin(Math.PI * s0) ** 0.7;
        return { x: k.snap(a.x + (b.x - a.x) * s0 + nx * h * sg), y: k.snap(a.y + (b.y - a.y) * s0 + ny * h * sg) };
      });
    return [...side(1), ...side(-1).reverse()];
  };
  g.fillStyle(THREAD.edge, 0.9 * alpha).fillPoints(lens(w / 2 + 2), true);
  g.fillStyle(THREAD.body, alpha).fillPoints(lens(w / 2), true);
  g.fillStyle(hex(BLOOD.light), alpha).fillPoints(lens(Math.max(1, w / 7)), true); // ince açık çekirdek: kesik, ışın değil
}

/** Saplama pozunda iki hançer: el noktası ve uç, gövdeye (container) göre. Poz anlık kurulup ölçülür, sonra çağıran pozu değiştirir. */
type Blade = { hand: Pt; tip: Pt };
function measureStab(v: CombatantView): { main: Blade; off: Blade; dx: number; dy: number } | null {
  v.showPose('twin_stab', false);
  const wl = v.weaponLine();
  const off = v.handPoint('off');
  if (!wl || !off) return null;
  const f = face(v);
  const dx = f * Math.cos(wl.ang) * wl.len;
  const dy = Math.sin(wl.ang) * wl.len;
  const rel = (p: Pt): Pt => ({ x: p.x - v.container.x, y: p.y - v.container.y });
  return { main: { hand: rel(wl), tip: rel({ x: wl.x + dx, y: wl.y + dy }) }, off: { hand: rel(off), tip: rel({ x: off.x + dx, y: off.y + dy }) }, dx, dy };
}

const voidstrike: V2Vfx = async (c, k) => {
  const t0 = c.targets[0];
  c.sfx('voidPulse');
  const v = c.actor;
  const f = face(v);
  // saplama pozunun hançer uçları (atılışın duracağı yer buna göre); ölçüm aynı karede, ekrana çizilmeden
  const stab = measureStab(v);
  // 1) BEDEL: hançer kaldırılır, kendi kanı bedenden hançer ağzına akar
  v.showPose('overhead', false); // solmasız: ölçüm / başlangıç pozunun hayaleti kalmasın
  v.afterimage(hex(BLOOD.red), 0.35, 220);
  // kaldırılmış hançer eli (overhead: yumruk başın üstünde, biraz önde). handPoint skill'in SON pozunu (twin_stab) okur, burada işe yaramaz
  const raised = (): Pt => ({ x: v.container.x + f * v.w * 0.08, y: v.container.y - v.h * 0.98 });
  const pay = bleed(c, k, v, raised, { n: 7, dur: EX.pay });
  const edge = glow(c, k, raised().x, raised().y, 30, hex(BLOOD.red), 0.9, k.DEPTH + 37);
  c.scene.tweens.add({ targets: edge, displayWidth: 90, displayHeight: 90, duration: k.slow(EX.pay), ease: 'Quad.easeIn' });
  fade(c, k, edge, EX.pay, 160);
  await pay;
  if (!t0) return;
  // 2) ATILIŞ: hedefin dibine (ortak yakın dövüş yaklaşması: adım pozu, ön plan derinliği, kırmızı art görüntü izi). Duruş: saplama itişinden
  // sonra ana hançerin ucu hedefin gövde ortasına ulaşır
  const dir = t0.container.x >= v.container.x ? 1 : -1;
  const p = k.spot(t0);
  const tipGoal = p.x + dir * t0.w * 0.04; // uç gövde ortasının az ötesi: giriş noktası (uçtan sink kadar geride) ön yarıda, ince hedefte havada kalmaz
  const stopX = stab ? tipGoal - stab.main.tip.x - dir * EX.push : t0.container.x - dir * (t0.w * 0.5 + v.w * 0.5 + 40);
  v.afterimage(hex(BLOOD.red), 0.5, 240); // tek kırmızı art görüntü (approach'un sık hayalet izi ekranı boyuyordu)
  const hit = !avoidedBy(c, t0);
  // implode: patlaması saplama karesine (atılış + itiş sonu) denk gelsin diye emiş girişi kadar önce başlar
  let implodeAt = c.scene.time.now + Math.max(0, k.slow(EX.dash) + k.slow(EX.stab) - IMPLODE_LEAD);
  c.scene.time.delayedCall(implodeAt - c.scene.time.now, () => {
    implodeAt = c.scene.time.now;
    c.sfx('implode');
  });
  await v.approach(stopX, t0.container.y, EX.dash);
  // 3) ÇİFT SAPLAMA: poz + son itiş
  v.showPose('twin_stab', false);
  v.afterimage(hex(BLOOD.red), 0.35, 200);
  // itiş süresi implode'un patlamasına göre ayarlanır (kare yuvarlaması kaydırmasın): saplama karesi = implode başlangıcı + IMPLODE_LEAD
  const stabMs = Math.min(k.slow(EX.stab) * 1.4, Math.max(k.slow(EX.stab) * 0.5, implodeAt + IMPLODE_LEAD - c.scene.time.now));
  c.scene.tweens.add({ targets: v.container, x: v.container.x + dir * EX.push, duration: stabMs, ease: 'Quad.easeOut' });
  // hançer uçları ve giriş noktaları (canlı: gövde itilirken / çekilirken birlikte kayar)
  const blades: Blade[] = stab ? [stab.main, stab.off] : [];
  const world = (q: Pt): Pt => ({ x: v.container.x + q.x, y: v.container.y + q.y });
  const entry = (b: Blade): Pt => {
    const tp = world(b.tip);
    const hd = world(b.hand);
    return { x: tp.x + (hd.x - tp.x) * EX.sink, y: tp.y + (hd.y - tp.y) * EX.sink };
  };
  // saplı tutuş boyunca poz korunur: vuruştan sonra motorun kurduğu boşta-pozu dönüşü (skill bitişi) her karede iptal edilir
  let keep = true;
  // Redtithe tutuşta düşerse (yansıma / diken hasarı) ölüm pozunun üstüne saplama pozu basılmaz
  const keeper = (): void => { if (keep && v.alive) v.showPose('twin_stab', false); };
  c.scene.events.on('postupdate', keeper);
  await k.wait(c.scene, stabMs);
  // saplama karesi: iki ıslak saplama sesi (yalnız isabette; ıskada hançer havayı deler, ses yok)
  if (hit) {
    c.sfx('daggerStabA');
    c.scene.time.delayedCall(STAB2_GAP, () => c.sfx('daggerStabB'));
  }
  const wounds = blades.map(entry); // yaralar hedefte kalır (gövde sonra çekilse de)
  const wg = c.scene.add.graphics().setDepth(k.DEPTH + 44);
  if (hit) {
    // tepe kare (yalnız isabette): kısa karartma + parlama + sarsıntı, iki yaradan kan fışkırır
    const dim = c.scene.add.rectangle(960, 540, FULL_W, 1080, 0x1a0306, 0.32).setDepth(k.DEPTH - 25);
    c.scene.tweens.add({ targets: dim, alpha: 0, delay: k.slow(160), duration: k.slow(380), onComplete: () => dim.destroy() });
    k.shake(c.scene, 200, 0.008);
    k.flash(c.scene, BLOOD.red, 0.16, 200);
    for (const w of wounds) {
      const core = glow(c, k, w.x, w.y, 30, hex(BLOOD.hi), 1, k.DEPTH + 45);
      c.scene.tweens.add({ targets: core, displayWidth: 110, displayHeight: 110, alpha: 0, duration: k.slow(240), onComplete: () => core.destroy() });
      k.burst(c.scene, w.x, w.y, { colors: [...SPRAY, BLOOD.dark], n: 12, speed: [140, 360], angle: [-Math.PI * 0.95, -Math.PI * 0.35], gravity: 1000, life: [320, 560], size: [5, 10] });
    }
    const fp = k.feet(t0);
    splat(c, k, fp.x - 10, fp.y, 40);
    // dikey kan yarıkları hançerin girdiği yerde açılır
    void k.counter(c.scene, k.slow(90), (u) => {
      wg.clear();
      for (const w of wounds) cutLine(wg, k, { x: w.x, y: w.y - 13 }, { x: w.x, y: w.y + 13 }, u, 9);
    }, 'Quad.easeOut');
  } else {
    // ıska: uçların önünde soluk savrulma çizgisi
    const sw = c.scene.add.graphics().setDepth(k.DEPTH + 40);
    for (const b of blades) {
      const tp = world(b.tip);
      sw.lineStyle(3, hex(BLOOD.hi), 0.55).lineBetween(k.snap(tp.x - dir * 34), k.snap(tp.y), k.snap(tp.x + dir * 26), k.snap(tp.y));
    }
    c.scene.tweens.add({ targets: sw, alpha: 0, duration: k.slow(200), onComplete: () => sw.destroy() });
  }
  // 4-5) HASAT, ÇEKİŞ, DÖNÜŞ (arka planda; vuruş anı burada çözülür)
  void (async () => {
    await k.wait(c.scene, k.slow(EX.land - 20));
    if (hit && blades.length) {
      const hands = [() => world(blades[0]!.hand), () => world(blades[1]!.hand)];
      // namlu boyunca kan: yaradan yumruğa yürür (namlunun alt kenarında ince sızıntı)
      const rg = c.scene.add.graphics().setDepth(k.DEPTH + 36);
      let flow = 0;
      const draw = (): void => {
        rg.clear();
        blades.forEach((_b, i) => {
          const a = wounds[i]!;
          const h = hands[i]!();
          const e = { x: a.x + (h.x - a.x) * flow, y: a.y + (h.y - a.y) * flow };
          // ince kan sızıntısı namlunun ALT kenarından akar: namlu (çelik) görünür kalır
          const dy = BLADE_DRIP_DY;
          rg.lineStyle(3, THREAD.edge, 0.8).lineBetween(k.snap(a.x), k.snap(a.y + dy), k.snap(e.x), k.snap(e.y + dy));
          rg.lineStyle(1, THREAD.body, 1).lineBetween(k.snap(a.x), k.snap(a.y + dy), k.snap(e.x), k.snap(e.y + dy));
        });
      };
      c.scene.events.on('postupdate', draw);
      // bedenden sökülen kan iki ele çekilir
      const sucks = hands.map((h) => bleed(c, k, t0, h, { n: 5, dur: EX.hold }));
      await k.counter(c.scene, k.slow(EX.hold * 0.6), (u) => { flow = u; }, 'Quad.easeIn');
      await Promise.all(sucks);
      for (const h of hands) {
        const q = h();
        const g = glow(c, k, q.x, q.y, 46, hex(BLOOD.red), 0.8, k.DEPTH + 37);
        fade(c, k, g, 40, 260);
      }
      v.afterimage(hex(BLOOD.red), 0.4, 260); // Redtithe kanı aldı
      c.scene.events.off('postupdate', draw);
      rg.destroy();
      // çekiş: yaralardan son bir fışkırma
      for (const w of wounds) k.burst(c.scene, w.x, w.y, { colors: SPRAY, n: 7, speed: [90, 240], angle: [-Math.PI * 0.9, -Math.PI * 0.4], gravity: 900, life: [260, 420], size: [4, 8] });
      const fp = k.feet(t0);
      wounds.forEach((w, i) => {
        const d = drop(c, k, w.x, w.y + 10, 14, k.DEPTH + 45).setAlpha(0); // düşen damla: ucu yukarı
        c.scene.tweens.add({ targets: d, alpha: 1, delay: k.slow(40 + i * 60), duration: k.slow(60) });
        c.scene.tweens.add({ targets: d, y: fp.y - 4, delay: k.slow(40 + i * 60), duration: k.slow(360), ease: 'Quad.easeIn', onComplete: () => d.destroy() });
      });
      c.scene.tweens.add({ targets: wg, alpha: 0, delay: k.slow(200), duration: k.slow(EX.pull + EX.back), onComplete: () => wg.destroy() });
    } else {
      wg.destroy();
      await k.wait(c.scene, k.slow(120));
    }
    // gevşeme: hançerleri çeker, boşta pozuna yumuşak geçer, yerine döner
    keep = false;
    c.scene.events.off('postupdate', keeper);
    if (!v.alive) return;
    v.showPose(null);
    c.scene.tweens.add({ targets: v.container, x: v.container.x - dir * 22, duration: k.slow(EX.pull), ease: 'Quad.easeOut' });
    await k.wait(c.scene, k.slow(EX.pull));
    await v.returnHome(EX.back);
  })();
  // vuruş anı: eski efektle aynı yerde (~0,65 sn): implode + kısa çözülme payı
  await k.wait(c.scene, k.slow(EX.land));
};

// =====================================================================================================================
// LEY THREAD (durum olay efektleri; Ömer 2026-10-29: Mana Steal isabet ettiği hedefe iplik bırakır, Ley Brand onu tüketir)

/**
 * İnce ley ipliği: `from` -> `to` arasında hafif dalgalı, iki katlı (dışta soluk mor, içte beyaz-mor) ışık çizgisi. Uçtan uca `draw` ms'de
 * uzar, `hold` ms durur, sonra `from` ucundan `to`ya doğru çekilerek söner (iplik hedefe bağlanmış kalır gibi). `taut`: gergin ve parlak
 * (tüketim anı), dalga yok denecek kadar az.
 */
function leyLine(c: VfxCtx, k: VfxKit, from: () => Pt, to: () => Pt, o: { draw: number; hold: number; out: number; taut?: boolean }): Promise<void> {
  const g = c.scene.add.graphics().setDepth(k.DEPTH + 38).setBlendMode(k.Phaser.BlendModes.ADD);
  const N = 22;
  const amp = o.taut ? 2 : 7;
  const ph = k.rnd(0, 6);
  const draw = (a: number, b: number, alpha: number, time: number): void => {
    g.clear();
    if (b <= a || alpha <= 0) return;
    const p0 = from();
    const p1 = to();
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const nx = -(p1.y - p0.y) / len;
    const ny = (p1.x - p0.x) / len;
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const u = a + ((b - a) * i) / N;
      const w = Math.sin(u * Math.PI) * amp * Math.sin(u * 9 + time * 0.012 + ph);
      pts.push({ x: p0.x + (p1.x - p0.x) * u + nx * w, y: p0.y + (p1.y - p0.y) * u + ny * w - Math.sin(u * Math.PI) * (o.taut ? 4 : 18) });
    }
    g.lineStyle(o.taut ? 7 : 5, 0x7d3fb0, 0.35 * alpha).strokePoints(pts);
    g.lineStyle(o.taut ? 3 : 2, 0xe3ccff, 0.9 * alpha).strokePoints(pts);
  };
  return k
    .counter(c.scene, k.slow(o.draw), (u) => draw(0, u, 1, c.scene.time.now), 'Quad.easeOut')
    .then(() => k.counter(c.scene, k.slow(o.hold), () => draw(0, 1, 1, c.scene.time.now)))
    .then(() => k.counter(c.scene, k.slow(o.out), (u) => draw(u, 1, 1 - u * 0.6, c.scene.time.now), 'Sine.easeIn'))
    .then(() => g.destroy());
}

/** İpliğin hedefteki düğümü: küçük rün tableti göğüste belirip yavaşça söner. */
function threadKnot(c: VfxCtx, k: VfxKit, t: CombatantView, life: number, bright = false): void {
  const p = k.spot(t);
  const rn = k.v2Sprite(c, 'tablet', ACCENT, p.x, p.y, bright ? 30 : 22, k.DEPTH + 42).setAlpha(0).setBlendMode(k.Phaser.BlendModes.ADD);
  c.scene.tweens.add({ targets: rn, alpha: 0.9, duration: k.slow(120) });
  fade(c, k, rn, life, 260, { y: p.y - 10 });
  const g = glow(c, k, p.x, p.y, bright ? 90 : 56, 0xb872ff, bright ? 0.7 : 0.45, k.DEPTH + 30);
  fade(c, k, g, life * 0.5, 300);
}

/**
 * Ley Thread uygulandı (`status_ley_thread`; Mana Steal isabeti): Anti-Mage'in eldiveninden hedefin göğsüne ince mor ley ipliği uzanır, kısa
 * durur, AM ucundan çözülüp hedefe sarılarak söner; göğüste küçük rün düğümü kalır. Olay kuyruğunu ~0,1 sn bekletir.
 */
const threadApply: V2Vfx = async (c, k) => {
  const t = c.targets[0];
  if (!t || t === c.actor) return;
  void leyLine(c, k, () => handOf(c.actor), () => k.spot(t), { draw: 180, hold: 220, out: 280 });
  threadKnot(c, k, t, 520);
  await k.wait(c.scene, k.slow(100));
};

/**
 * Ley Thread tüketildi (`statususe_ley_thread`; Ley Brand iplikli hedefe değdi): iplik bu kez GERGİN ve parlak, Brand'i atan AM'den hedefe bir
 * anda gerilir, düğüm parlar ve iplik mor kıvılcımlarla kopar (Brand uzadı / güçlendi). ~0,35 sn.
 */
const threadUse: V2Vfx = async (c, k) => {
  const t = c.targets[0];
  if (!t) return;
  const from = c.actor !== t ? () => handOf(c.actor) : () => ({ x: t.container.x, y: t.container.y - 4 });
  void leyLine(c, k, from, () => k.spot(t), { draw: 90, hold: 140, out: 160, taut: true });
  threadKnot(c, k, t, 260, true);
  await k.wait(c.scene, k.slow(200));
  const p = k.spot(t);
  k.burst(c.scene, p.x, p.y, { colors: [...VIOLET, '#ffffff'], n: 10, speed: [90, 260], gravity: 120, life: [240, 440], size: [4, 8] });
  await k.wait(c.scene, k.slow(120));
};

// =====================================================================================================================
// BLOOD TITHE (pasif olay efekti `passive_spellbreaker_instinct`)

/**
 * Blood Tithe: düşman MP'li skill attı, Redtithe'in sırası öne kaydı. Avucu kızıl-kor parlar, elinden birkaç kan damlası sıçrar; gövdeden
 * ileri (baktığı yöne) kırmızı / kor hız izi ve kısa kırmızı art görüntü (sıra öne çekildi). ~0,3 sn; kuyruğu ~0,15 sn bekletir.
 */
const spellbreakerInstinct: V2Vfx = async (c, k) => {
  const v = c.actor;
  const f = face(v);
  const hand = handOf(v);
  const hg = glow(c, k, hand.x, hand.y, 30, hex(BLOOD.ember), 0.9, k.DEPTH + 40);
  c.scene.tweens.add({ targets: hg, displayWidth: 110, displayHeight: 110, alpha: 0, duration: k.slow(260), ease: 'Quad.easeOut', onComplete: () => hg.destroy() });
  k.burst(c.scene, hand.x, hand.y, { colors: SPRAY, n: 7, speed: [90, 220], angle: [-Math.PI * 0.95, -Math.PI * 0.05], gravity: 800, life: [220, 380], size: [4, 8] });
  v.afterimage(hex(BLOOD.red), 0.45, 280);
  const g = c.scene.add.graphics().setDepth(k.DEPTH + 36);
  const y0 = v.container.y - v.h * 0.62;
  void k.counter(c.scene, k.slow(300), (u) => {
    g.clear();
    const a = Math.sin(u * Math.PI);
    for (let i = 0; i < 3; i++) {
      const y = k.snap(y0 + i * v.h * 0.16);
      const x0 = v.container.x - f * v.w * 0.3 + f * u * v.w * 0.5;
      const x1 = x0 + f * v.w * (0.35 + 0.2 * i);
      g.lineStyle(i === 1 ? 5 : 4, THREAD.edge, 0.6 * a).lineBetween(k.snap(x0), y, k.snap(x1), y);
      g.lineStyle(i === 1 ? 3 : 2, i === 1 ? hex(BLOOD.ember) : hex(BLOOD.red), 0.85 * a).lineBetween(k.snap(x0), y, k.snap(x1), y);
    }
    if (u >= 1) g.destroy();
  });
  await k.wait(c.scene, k.slow(150));
};

export const VFX: Record<string, V2Vfx> = { manasteal, drainfield, spellward, voidstrike, status_ley_thread: threadApply, statususe_ley_thread: threadUse, passive_spellbreaker_instinct: spellbreakerInstinct };
