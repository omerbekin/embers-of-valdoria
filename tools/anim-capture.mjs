#!/usr/bin/env node
// Skill VFX kare yakalayıcı (Codex + Claude animasyon incelemesi, docs/anim-review/README.md).
// Oyunu görünmez Chromium'da SESSİZ açar, Debug > VFX frame test panelinde skill'i seçer, oyun döngüsünü durdurup
// ekran karesi ekran karesi (1/60 sn) ilerletir; görüntüsü değişen her kareyi kaydeder.
//
//   node tools/anim-capture.mjs <skill-id> [<skill-id> ...] [--version real|orig|tween|code|hand] [--url http://localhost:5173]
//
// Çıktı: docs/anim-review/captures/<skill-id>/
//   frame_NNN.png  tam ekran kare (1600x900)       sheet.png  kırpılmış kareler, numaralı, 50 px ızgaralı
//   frames.json    units: atan (caster) / hedef (target) konumu ve adı; her karenin zamanı + VFX sprite'larının sheet karesi / konum / boyut / saydamlık
// Geliştirme sunucusu açık olmalı (npm run dev, 5173): panel kaynak koddan içe aktarılır.
import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIEW = { width: 1600, height: 900 };
const DT = 1000 / 60;
const MAX_STEPS = 600; // en çok 10 sn oyun zamanı
const TAIL = 30; // VFX bittikten sonra yakalanan ekran karesi

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const version = opt('version', 'real');
const url = opt('url', 'http://localhost:5173');
const skills = args.filter((a) => !a.startsWith('--'));
if (!skills.length) {
  console.error('kullanım: node tools/anim-capture.mjs <skill-id> [...] [--version real] [--url http://localhost:5173]');
  process.exit(1);
}

const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  // geliştirme sunucusu başka bir sohbetin dosya değişikliğiyle sayfayı yenileyebilir: her skill temiz sayfada, hata olursa 2 kez daha
  let failed = 0;
  for (const skill of skills) {
    for (let attempt = 1; ; attempt++) {
      let page = null;
      try {
        page = await openPage();
        await captureSkill(page, skill);
        break;
      } catch (e) {
        if (attempt >= 3) {
          console.error(`HATA: ${skill} yakalanamadı: ${e.message.split('\n')[0]}`);
          failed++;
          break;
        }
        console.error(`yeniden deneniyor (${attempt}/3): ${skill}`);
      } finally {
        await page?.close().catch(() => {});
      }
    }
  }
  if (failed) process.exitCode = 1;
} finally {
  await browser.close();
}

async function openPage() {
  const page = await browser.newPage({ viewport: VIEW });
  // ses kapalı (CLAUDE.md: Master 0); ilk açılış hata raporu bildirimi görülmüş + rapor KAPALI — sayfa yüklenmeden önce
  await page.addInitScript(() => {
    localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 }));
    localStorage.setItem('eov.diag.v1', JSON.stringify({ consent: false, noticed: true }));
  });
  await page.goto(`${url}/?debug=1`);
  await page.waitForFunction(() => window.__game?.scene?.getScenes(true).length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const m = await import('/src/ui/debug-vfx-battle.ts');
    m.openVfxBattleTest(window.__game);
    window.__vbh = m.vfxBattleTestHandle;
  });
  return page;
}

/** Panel en az 1.5 sn kesintisiz boşta (savaş kurulurken atış öncesi kısa boşluklar sayılmaz: çift atış olmasın). */
async function waitIdle(page, ms = 30000) {
  const t0 = Date.now();
  let since = 0;
  while (Date.now() - t0 < ms) {
    const idle = await page.evaluate(() => !!window.__vbh?.() && !window.__vbh().busy());
    if (!idle) since = 0;
    else if (!since) since = Date.now();
    else if (Date.now() - since >= 1500) return;
    await page.waitForTimeout(100);
  }
  throw new Error('test paneli boşa çıkmadı');
}

async function captureSkill(page, skill) {
  const out = join(ROOT, 'docs', 'anim-review', 'captures', skill);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  await page.evaluate(() => window.__game.loop.wake());
  await waitIdle(page);
  const ok = await page.evaluate(([s, v]) => {
    const h = window.__vbh();
    h.version(v);
    return h.pick(s);
  }, [skill, version]);
  if (!ok) {
    console.error(`HATA: "${skill}" test panelinde yok (src/game/mob-vfx.ts > MOB_VFX_SPECS anahtarı olmalı)`);
    return;
  }
  await page.waitForTimeout(300);
  await waitIdle(page, 30000); // savaş kurulur + ilk atış biter
  await page.waitForTimeout(400);
  const canvas = await page.evaluate(() => {
    const r = window.__game.canvas.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });

  // döngüyü durdur, atışı başlat, elle ilerlet
  await page.evaluate(() => {
    document.querySelector('.vb-panel')?.classList.add('min'); // panel kareyi örtmesin
    window.__game.loop.sleep();
    window.__capT = performance.now();
    document.querySelector('.vb-main').click();
  });
  const frames = [];
  let lastHash = '';
  let seen = false;
  let quiet = 0;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const info = await page.evaluate(([s, dt]) => {
      const g = window.__game;
      window.__capT += dt;
      g.step(window.__capT, dt);
      const sc = g.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('battle'));
      const list = [];
      const walk = (objs) => {
        for (const o of objs) {
          if (o.list) walk(o.list);
          const key = o.texture?.key ?? '';
          if (!key.includes(`/${s}`)) continue;
          const m = o.getWorldTransformMatrix?.();
          list.push({
            key,
            frame: o.frame?.name ?? null,
            x: Math.round(m ? m.tx : o.x),
            y: Math.round(m ? m.ty : o.y),
            w: Math.round(o.displayWidth ?? 0),
            h: Math.round(o.displayHeight ?? 0),
            angle: Math.round(o.angle ?? 0),
            flipX: !!o.flipX,
            alpha: Math.round((o.alpha ?? 1) * 100) / 100,
            visible: o.visible !== false,
          });
        }
      };
      if (sc) walk(sc.children.list);
      return { vfx: list.filter((v) => v.visible && v.alpha > 0), busy: window.__vbh().busy() };
    }, [skill, DT]);
    const buf = await page.screenshot({ clip: canvas });
    const hash = createHash('md5').update(buf).digest('hex');
    if (info.vfx.length) {
      seen = true;
      quiet = 0;
    } else if (seen) quiet++;
    if (hash !== lastHash) {
      lastHash = hash;
      const n = frames.length + 1;
      const file = `frame_${String(n).padStart(3, '0')}.png`;
      writeFileSync(join(out, file), buf);
      frames.push({ n, file, ms: Math.round(step * DT), vfx: info.vfx });
    }
    if (!info.busy && (quiet >= TAIL || (!seen && step > 240))) break;
  }
  await page.evaluate(() => window.__game.loop.wake());
  // VFX'ten önceki / sonraki boş kareleri at (ilk VFX'ten 4 önce, son VFX'ten 8 sonrası kalır), numaraları yeniden ver
  const first = frames.findIndex((f) => f.vfx.length);
  const last = frames.findLastIndex((f) => f.vfx.length);
  if (first >= 0) {
    const keep = frames.slice(Math.max(0, first - 4), last + 9);
    for (const f of frames) if (!keep.includes(f)) rmSync(join(out, f.file));
    frames.length = 0;
    for (const [i, f] of keep.entries()) {
      const file = `frame_${String(i + 1).padStart(3, '0')}.png`;
      renameSync(join(out, f.file), join(out, file));
      frames.push({ ...f, n: i + 1, file });
    }
  }
  // kim atıyor, kime: test panelinde atan = enemy-0 (mob, sağ taraf), hedef = party-0 (kukla, sol taraf); dost hedefli skill'de dost da düşman tarafında
  const units = await page.evaluate(() => {
    const sc = window.__game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('battle'));
    const out = [];
    for (const [uid, v] of sc?.views ?? []) {
      const u = sc.battle.get(uid);
      const m = v.sprite.getWorldTransformMatrix();
      const role = uid === 'enemy-0' ? 'caster' : uid === 'party-0' ? 'target (dummy)' : 'ally of caster';
      out.push({ uid, role, name: u?.name ?? uid, side: uid.startsWith('party') ? 'left (player side)' : 'right (enemy side)', x: Math.round(m.tx), y: Math.round(m.ty), w: Math.round(v.sprite.displayWidth), h: Math.round(v.sprite.displayHeight) });
    }
    return out;
  });
  writeFileSync(join(out, 'frames.json'), JSON.stringify({ skill, version, view: VIEW, stepMs: DT, units, frames }, null, 1));
  await contactSheet(out, frames, canvas);
  const vfxN = frames.filter((f) => f.vfx.length).length;
  console.log(`${skill}: ${frames.length} kare (${vfxN} karede VFX sprite'ı) -> ${out}`);
}

/** Kırpılmış kareler ızgarada: VFX'in hepsini + çevresini kapsayan bölge; 50 px ızgara, kare numarası ve zamanı. */
async function contactSheet(out, frames, canvas) {
  if (!frames.length) return;
  const boxes = frames.flatMap((f) => f.vfx.map((v) => [v.x - v.w / 2, v.y - v.h / 2, v.x + v.w / 2, v.y + v.h / 2]));
  const gw = { w: 1920, h: 1080, k: canvas.width / 1920 }; // oyun dünyası (1920 taban) -> ekran görüntüsü pikseli
  let [x0, y0, x1, y1] = boxes.length
    ? boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])
    : [0, 0, gw.w, gw.h];
  const pad = 140;
  x0 = Math.max(0, Math.floor((x0 - pad) * gw.k));
  y0 = Math.max(0, Math.floor((y0 - pad) * gw.k));
  x1 = Math.min(Math.round(canvas.width), Math.ceil((x1 + pad) * gw.k));
  y1 = Math.min(Math.round(canvas.height), Math.ceil((y1 + pad) * gw.k));
  const cw = x1 - x0;
  const ch = y1 - y0;
  const scale = Math.min(1, 520 / cw);
  const tw = Math.round(cw * scale);
  const th = Math.round(ch * scale);
  const cols = Math.min(5, frames.length);
  const rows = Math.ceil(frames.length / cols);
  const LBL = 26;
  const grid = [];
  // ızgara oyun koordinatında 50 px (1920x1080 taban; frames.json ile aynı birim), kırpma köşesi oyun ızgarasına oturur
  const g50 = 50 * gw.k;
  for (let i = Math.ceil(x0 / g50); i * g50 <= x1; i++) { const gx = (i * g50 - x0) * scale; grid.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${th}" stroke="#fff" stroke-opacity="${i % 2 ? 0.12 : 0.28}"/>`); }
  for (let i = Math.ceil(y0 / g50); i * g50 <= y1; i++) { const gy = (i * g50 - y0) * scale; grid.push(`<line x1="0" y1="${gy}" x2="${tw}" y2="${gy}" stroke="#fff" stroke-opacity="${i % 2 ? 0.12 : 0.28}"/>`); }
  const overlay = Buffer.from(`<svg width="${tw}" height="${th}" xmlns="http://www.w3.org/2000/svg">${grid.join('')}</svg>`);
  const tiles = [];
  for (const [i, f] of frames.entries()) {
    const img = await sharp(join(out, f.file)).extract({ left: x0, top: y0, width: cw, height: ch }).resize(tw, th).composite([{ input: overlay }]).png().toBuffer();
    const sheetFr = [...new Set(f.vfx.map((v) => v.frame).filter((v) => v !== null))].join('+');
    const label = Buffer.from(
      `<svg width="${tw}" height="${LBL}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="6" y="18" font-family="Arial" font-size="15" fill="#fff">#${f.n}  ${f.ms} ms${sheetFr ? `  sheet ${sheetFr}` : ''}</text></svg>`,
    );
    const c = i % cols;
    const r = Math.floor(i / cols);
    tiles.push({ input: label, left: c * (tw + 4), top: r * (th + LBL + 4) }, { input: img, left: c * (tw + 4), top: r * (th + LBL + 4) + LBL });
  }
  await sharp({ create: { width: cols * (tw + 4), height: rows * (th + LBL + 4), channels: 3, background: '#000' } })
    .composite(tiles)
    .png()
    .toFile(join(out, 'sheet.png'));
  writeFileSync(join(out, 'sheet.json'), JSON.stringify({ crop: { x: x0, y: y0, w: cw, h: ch }, tileScale: scale, gridGamePx: 50, gameToShot: gw.k }, null, 1));
}
