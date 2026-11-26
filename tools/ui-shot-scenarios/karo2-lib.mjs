// Karo galerisi (karo-2) yardımcıları: gerçek oyun ekranında karonun yerini bulur, kırmızı halka çizer, çevresini kırpıp kaydeder.
// Çıkış klasörü KARO_OUT ortam değişkeni (yoksa --out ile aynı yer değil, ./karo-out). Telefon kırpıntıları 2 kat büyütülür (4-5 px karo okunsun).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
const OUT = resolve(process.env.KARO_OUT || 'karo-out');
mkdirSync(OUT, { recursive: true });
// Karo-3 grup mockup'ı (Ömer 2026-11-25 r47 g_all): KARO_OPT=A (nokta) | B (halka) | C (yok). Yalnız çekim anında sayfaya basılır, oyun kodu değişmez.
// Kalanlar (9, 10, 11, 28, 35: ağaç puanı, ok uçları, gün sayacı, düğüm kartı ok çentiği) ve ağaç / plaka bu listede YOK.
export const OPT = process.env.KARO_OPT || '';
export const OPT_SEL = [
  '.st-row.on .st-diamond::before', '.cx-navrow .el-dia', '.el-btn::before', '.el-btn::after', '.cw-ttl i::after', '.nc .nc-head .rl::after', '.gm-rule i',
  ':is(.it-card, .mw-stats) .it-dia::after', '.bt-ln .dia::after', '.pn-items li::before', '.bh-more::before', '.bh-band-dia', '.bh-dia', '.sd-pips i', '.crd-dots i',
  '.gr-dia', '.gr-tab.on::after', '.sd-ch::before', '.pn-head .el-dia', '.mw-pdv::after', '.bt-div::after', '.it-rule::after', '.fb-cell.empty::after', '.cw-empty::after',
  '.cx-filters > summary::before', '.cx-empty .el-dia',
];
const SVG = (inner) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'>${inner}</svg>`)}")`;
export function optCss(o = OPT) {
  if (!o) return '';
  const sel = OPT_SEL.join(',');
  const GOLD = 'rgba(217,178,106,.95)';
  // A = dolu nokta: içi koyu / yalnız kenarlı karolar kenar renginde doldurulur (yoksa A halkaya benzer)
  const solid = (s, c) => `${s}{background:${c}!important;border-color:transparent!important;box-shadow:none!important}`;
  if (o === 'A') return `${sel}{border-radius:50%!important}
${solid('.el-btn::before,.el-btn::after,.cw-ttl i::after,.nc .nc-head .rl::after,.gm-rule i,.bh-more::before,.cx-filters > summary::before,.cx-empty .el-dia', 'rgba(217,178,106,.9)')}
${solid('.bt-div::after,.mw-pdv::after', 'var(--acl, rgba(217,178,106,.9))')}
${solid('.it-rule::after', 'var(--rl, rgba(217,178,106,.9))')}
${solid('.fb-cell.empty::after,.cw-empty::after', 'rgba(217,178,106,.4)')}
*{--orn-dia:${SVG("<circle cx='5' cy='5' r='2.6' fill='#d9b26a'/>")}!important;--uvh-dia:${SVG("<circle cx='5' cy='5' r='2.6' fill='#d9b26a'/>")}!important}`;
  if (o === 'B') return `${sel}{border-radius:50%!important;background:transparent!important;border:0!important;box-shadow:inset 0 0 0 max(1px,.09em) ${GOLD}!important}
*{--orn-dia:${SVG("<circle cx='5' cy='5' r='2.8' fill='none' stroke='#d9b26a' stroke-width='1.1'/>")}!important;--uvh-dia:${SVG("<circle cx='5' cy='5' r='2.8' fill='none' stroke='#d9b26a' stroke-width='1.1'/>")}!important}`;
  return `${sel}{background:transparent!important;border-color:transparent!important;box-shadow:none!important}
*{--orn-dia:${SVG('')}!important;--uvh-dia:${SVG('')}!important}`;
}
export const HIDE_DEBUG = '.debug-toggle,#debug-toggle,.debug-fab,[class*="debug-btn"],#debug-root>button{display:none!important}' + optCss();

/** DOM karo merkezi: host kutusu + (sözde öğe) hesaplanmış left/top/boy + transform kayması; HUD ölçeği (rect / offsetWidth) dahil. */
export const domLoc = (page, sel, { idx = 0, pseudo = '', at = '' } = {}) =>
  page.evaluate(([s, i, ps, a]) => {
    const els = [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; });
    const el = els[i];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
    if (a) {
      const p = { tl: [0, 0], tr: [1, 0], bl: [0, 1], br: [1, 1], l: [0, 0.5], r: [1, 0.5], t: [0.5, 0], b: [0.5, 1], c: [0.5, 0.5] }[a];
      return { x: r.left + r.width * p[0], y: r.top + r.height * p[1], s: 10 * k };
    }
    if (!ps) return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(r.width, r.height) };
    const cs = getComputedStyle(el, ps);
    if (cs.display === 'none' || cs.content === 'none') return null;
    const w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0;
    const L = parseFloat(cs.left), T = parseFloat(cs.top);
    let e = 0, f = 0;
    const m = cs.transform.match(/matrix\(([^)]+)\)/);
    if (m) { const v = m[1].split(',').map(Number); e = v[4]; f = v[5]; }
    if (cs.position === 'absolute' && !isNaN(L) && !isNaN(T)) return { x: r.left + (el.clientLeft + L + w / 2 + e) * k, y: r.top + (el.clientTop + T + h / 2 + f) * k, s: Math.max(w, h) * k };
    return { x: r.left + 8 * k, y: r.top + r.height / 2, s: Math.max(w, h, 8) * k }; // akış içi (flex) sözde öğe: hostun sol ortası
  }, [sel, idx, pseudo, at]);

/** Phaser nesnesinin ekran konumu: fn(scene) dünya noktası {x,y} döndürür (yerel nokta + kap matrisi). */
export const phaserLoc = (page, key, src, arg) =>
  page.evaluate(([k, s, a]) => {
    const g = window.__game;
    const sc = g.scene.getScene(k);
    const p = new Function('sc', 'a', 'return (' + s + ')(sc, a)')(sc, a);
    if (!p) return null;
    const cam = sc.cameras.main;
    const cr = g.canvas.getBoundingClientRect();
    const sx = cr.width / g.scale.width, sy = cr.height / g.scale.height;
    const wx = (p.x - cam.worldView.x) * cam.zoom, wy = (p.y - cam.worldView.y) * cam.zoom;
    return { ...p, x: cr.left + (cam.x + wx) * sx, y: cr.top + (cam.y + wy) * sy, s: (p.s ?? 16) * cam.zoom * sx };
  }, [key, src.toString(), arg]);

/** Halka çiz + kırp + kaydet. loc = {x,y,s}; name = dosya adı (uzantısız). w/h = kırpma boyu (ekran px). */
export async function ring(page, loc, name, { w, h, view, r: rr, zoom } = {}) {
  if (!loc) { console.log('YOK', name); return false; }
  const vp = page.viewportSize();
  const phone = vp.height < 500;
  const W = Math.min(vp.width, w ?? (phone ? 300 : 560));
  const H = Math.min(vp.height, h ?? (phone ? 170 : 320));
  const rad = Math.round(rr ?? Math.max(phone ? 9 : 14, loc.s * 0.85 + (phone ? 5 : 8)));
  await page.evaluate(([x, y, r]) => {
    const d = document.createElement('div');
    d.className = 'karo2-ring';
    d.style.cssText = `position:fixed;left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border:${r < 12 ? 2 : 3}px solid #ff2a2a;border-radius:50%;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #000;z-index:2147483647;pointer-events:none;box-sizing:border-box`;
    document.documentElement.appendChild(d);
  }, [loc.x, loc.y, rad]);
  await page.waitForTimeout(120);
  const x = Math.max(0, Math.min(vp.width - W, Math.round(loc.x - W / 2)));
  const y = Math.max(0, Math.min(vp.height - H, Math.round(loc.y - H / 2)));
  const buf = await page.screenshot({ type: 'png', clip: { x, y, width: W, height: H } });
  await page.evaluate(() => document.querySelectorAll('.karo2-ring').forEach((d) => d.remove()));
  const tag = view ?? `${vp.width}x${vp.height}`;
  const file = `${OUT}/${name}-${tag}.jpg`;
  await sharp(buf).resize({ width: Math.round(W * (zoom ?? (phone ? 2 : 1))), kernel: 'nearest' }).jpeg({ quality: 88 }).toFile(file);
  console.log('KARE', name, tag, Math.round(loc.x), Math.round(loc.y), Math.round(loc.s));
  return true;
}
/** Tam ekran bağlam karesi (halkalı). */
export async function ctxShot(page, loc, name) {
  const vp = page.viewportSize();
  return ring(page, loc, name, { w: vp.width, h: vp.height });
}

/** Ekrandaki TÜM 45° dönmüş küçük kareleri (DOM karo) bulur: anahtar (ebeveyn > sınıf + sözde öğe) + ekran merkezi + boy. */
export const scanKaro = (page) =>
  page.evaluate(() => {
    const out = [];
    const key = (el, ps) => {
      let p = el.tagName.toLowerCase();
      if (el.classList.length) p += '.' + [...el.classList].filter((c) => !/^(on|sel|hover|pin|in|show|open|active)$/.test(c)).slice(0, 3).join('.');
      const par = el.parentElement;
      if (par && par !== document.body) p = (par.classList.length ? '.' + [...par.classList].slice(0, 2).join('.') : par.tagName.toLowerCase()) + ' > ' + p;
      return p + (ps || '');
    };
    for (const el of document.querySelectorAll('body *')) {
      if (el.classList.contains('karo2-ring')) continue;
      for (const ps of ['', '::before', '::after']) {
        const cs = getComputedStyle(el, ps || null);
        if (ps && (cs.content === 'none' || cs.content === 'normal')) continue;
        const m = (cs.transform || '').match(/matrix\(([^)]+)\)/);
        if (!m) continue;
        const v = m[1].split(',').map(Number);
        if (!(Math.abs(Math.abs(v[0]) - 0.7071) < 0.05 && Math.abs(Math.abs(v[1]) - 0.7071) < 0.05)) continue;
        const w = parseFloat(cs.width), h = parseFloat(cs.height);
        if (!(w > 0 && w <= 30 && h > 0 && h <= 30)) continue;
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        let vis = true;
        for (let n = el; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') { vis = false; break; } }
        if (!vis) continue;
        const r = el.getBoundingClientRect();
        const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
        let x, y;
        if (!ps) { if (r.width === 0) continue; x = r.left + r.width / 2; y = r.top + r.height / 2; }
        else {
          const L = parseFloat(cs.left), T = parseFloat(cs.top);
          if (cs.position === 'absolute' && !isNaN(L) && !isNaN(T)) { x = r.left + (el.clientLeft + L + w / 2 + v[4]) * k; y = r.top + (el.clientTop + T + h / 2 + v[5]) * k; }
          else { x = r.left + 8 * k; y = r.top + r.height / 2; }
        }
        if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) continue;
        out.push({ k: key(el, ps), x, y, s: Math.max(w, h) * k });
      }
    }
    return out;
  });
const seenKeys = new Set();
export const manifest = [];
/** Ekrandaki her yeni karo türünü (anahtar) bir kez halkalayıp kaydeder. prefix = ekran adı. */
export async function autoRing(page, prefix, { skip = [] } = {}) {
  const hits = await scanKaro(page);
  let n = 0;
  for (const h of hits) {
    if (seenKeys.has(h.k) || skip.some((s) => h.k.includes(s))) continue;
    seenKeys.add(h.k);
    n++;
    const name = `${prefix}-${String(n).padStart(2, '0')}`;
    await ring(page, h, name);
    manifest.push({ name, screen: prefix, key: h.k, s: Math.round(h.s) });
    console.log('OTO', name, h.k);
  }
  return n;
}

/** Phaser karo kaydı: Graphics.fillPoints / strokePoints ile çizilen 4 noktalı elmasları (graphics nesnesi + yerel merkez) kaydeder. Sahne kurulmadan ÖNCE çağır. */
export const hookPhaser = (page) =>
  page.evaluate((OPTV) => {
    if (window.__karoHook) return;
    window.__karoHook = true;
    const g = window.__game;
    const sc = g.scene.getScenes(true)[0];
    const probe = sc.add.graphics();
    const P = Object.getPrototypeOf(probe);
    probe.destroy();
    const reg = (window.__karoReg = new Map());
    const isDia = (pts) => {
      if (!pts || pts.length < 4 || pts.length > 5) return null;
      const q = pts.slice(0, 4).map((p) => ({ x: p.x, y: p.y }));
      const e = 0.6;
      for (const [a, b, c, d] of [[0, 1, 2, 3], [1, 2, 3, 0]]) {
        if (Math.abs(q[a].x - q[c].x) < e && Math.abs(q[b].y - q[d].y) < e) {
          const cx = q[a].x, cy = q[b].y, r = Math.abs(q[a].y - q[c].y) / 2, r2 = Math.abs(q[b].x - q[d].x) / 2;
          if (r > 0.5 && r < 40 && r2 > 0.5 && r2 < 40 && Math.abs(r - r2) < Math.max(r, r2) * 0.6) return { cx, cy, r: Math.max(r, r2) };
        }
      }
      return null;
    };
    for (const fn of ['fillPoints', 'strokePoints']) {
      const orig = P[fn];
      P[fn] = function (pts, ...rest) {
        const d = isDia(pts);
        if (d) { const l = reg.get(this) ?? []; if (!l.some((x) => Math.abs(x.cx - d.cx) < 1 && Math.abs(x.cy - d.cy) < 1)) l.push(d); reg.set(this, l); }
        const o = window.__karoOpt;
        if (d && o) {
          if (o === 'C') return this;
          const fill = fn === 'fillPoints';
          const col = fill ? this.defaultFillColor : this.defaultStrokeColor, al = fill ? this.defaultFillAlpha : this.defaultStrokeAlpha;
          // koyu iç dolgu çizilmez: A'da renkli dolgu / kontur DOLU noktaya, B'de halkaya döner
          const lum = ((col >> 16) & 255) * 0.3 + ((col >> 8) & 255) * 0.59 + (col & 255) * 0.11;
          if (fill && lum < 70) return this;
          if (o === 'A') { const fc = this.defaultFillColor, fa = this.defaultFillAlpha; this.fillStyle(col, al).fillCircle(d.cx, d.cy, d.r * 0.62); this.fillStyle(fc, fa); return this; }
          const sw = this.defaultStrokeWidth, sc = this.defaultStrokeColor, sa = this.defaultStrokeAlpha;
          this.lineStyle(Math.max(1, Math.min(2, d.r * 0.2)), col, al).strokeCircle(d.cx, d.cy, d.r * 0.74);
          this.lineStyle(sw, sc, sa);
          return this;
        }
        return orig.call(this, pts, ...rest);
      };
    }
    window.__karoOpt = OPTV;
    if (OPTV) {
      const tp = sc.add.text(0, 0, '');
      const T = Object.getPrototypeOf(tp);
      tp.destroy();
      const rep = { A: '●', B: '○', C: ' ' }[OPTV];
      const st = T.setText;
      T.setText = function (v) { if (typeof v === 'string' && v.includes('◆')) { this.__karoRep = true; v = v.split('◆').join(rep); } return st.call(this, v); };
    }
    const oc = P.clear;
    P.clear = function (...a) { reg.delete(this); return oc.apply(this, a); };
  }, OPT);

/** Ekrandaki Phaser elmasları + '◆' yazıları: {k, x, y, s}. k = sahne + kayıt sırası (ad yok; konumla eşlenir). */
export const scanPhaser = (page) =>
  page.evaluate(() => {
    const g = window.__game;
    const cr = g.canvas.getBoundingClientRect();
    const kx = cr.width / g.scale.width, ky = cr.height / g.scale.height;
    const toScreen = (o, wx, wy) => {
      const cam = o.scene.cameras.main;
      const sfx = o.scrollFactorX ?? 1, sfy = o.scrollFactorY ?? 1;
      const x = cam.x + cam.width / 2 + (wx - cam.scrollX * sfx - cam.width / 2) * cam.zoom;
      const y = cam.y + cam.height / 2 + (wy - cam.scrollY * sfy - cam.height / 2) * cam.zoom;
      return { x: cr.left + x * kx, y: cr.top + y * ky, z: cam.zoom * kx };
    };
    const shown = (o) => {
      if (!o.scene || !o.scene.sys.settings.active || !o.scene.sys.settings.visible) return false;
      for (let n = o; n; n = n.parentContainer) if (!n.visible || n.alpha < 0.05) return false;
      return true;
    };
    const out = [];
    for (const [o, list] of window.__karoReg ?? []) {
      if (!o.active || !shown(o)) continue;
      const m = o.getWorldTransformMatrix();
      for (const d of list) {
        const p = m.transformPoint(d.cx, d.cy);
        const s = toScreen(o, p.x, p.y);
        if (s.x < 0 || s.y < 0 || s.x > innerWidth || s.y > innerHeight) continue;
        out.push({ k: o.scene.sys.settings.key + ' gfx r' + Math.round(d.r), x: s.x, y: s.y, s: d.r * 2 * s.z * Math.abs(m.scaleX || 1) });
      }
    }
    const walk = (list) => {
      for (const o of list) {
        if (o.type === 'Text' && typeof o.text === 'string' && (o.text.includes('◆') || o.__karoRep) && shown(o)) {
          const b = o.getBounds();
          const s = toScreen(o, b.centerX, b.centerY);
          out.push({ k: o.scene.sys.settings.key + ' text "' + o.text.slice(0, 24) + '"', x: s.x, y: s.y, s: Math.min(b.height, 20) * s.z });
        }
        if (o.list) walk(o.list);
      }
    };
    for (const sc of g.scene.getScenes(true)) walk(sc.children.list);
    return out;
  });
/** Phaser karoları: konum ızgarasıyla (40 px) tekilleştirip her birini halkalar. limit = en çok kare. */
export async function autoRingPhaser(page, prefix, { limit = 12, keyOnce = false } = {}) {
  const hits = await scanPhaser(page);
  let n = 0;
  for (const h of hits) {
    const id = keyOnce ? prefix + ' ' + h.k : prefix + ' ' + h.k + ' ' + Math.round(h.x / 150) + ',' + Math.round(h.y / 150);
    if (seenKeys.has(id)) continue;
    seenKeys.add(id);
    if (++n > limit) break;
    const name = `${prefix}-p${String(n).padStart(2, '0')}`;
    await ring(page, h, name);
    manifest.push({ name, screen: prefix, key: h.k, s: Math.round(h.s) });
    console.log('OTO', name, h.k);
  }
  return n;
}
export async function saveManifest(view) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`${OUT}/manifest-${view}-${Date.now()}.json`, JSON.stringify(manifest, null, 1));
}

/** Başlık süsü (SVG arka planlı karo, ::before çizgi + karo): yazının solundaki karonun ekran yeri. */
export const titleOrn = (page, sel) =>
  page.evaluate((s) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0);
    if (!el) return null;
    const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()) ?? el.firstElementChild;
    if (!tn) return null;
    const rg = document.createRange();
    rg.selectNodeContents(tn);
    const tr = rg.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
    const fs = parseFloat(getComputedStyle(el).fontSize) * k;
    const gap = parseFloat(getComputedStyle(el).columnGap) * k || 0.45 * fs;
    return { x: tr.left - gap - 0.16 * fs, y: tr.top + tr.height / 2, s: 0.32 * fs };
  }, sel);
