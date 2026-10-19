/* Ortak taslak yardimcilari (ui-dev, 2026-10-19). Oyun kodu DEGIL. window.MK:
   MK.mount({ title, sections:[{id,h,note,build(host)}], hashExtra }) ; MK.addFrame(host,{cap,bg,render(ui,f),state}) ; MK.tip(spec) (A Band ipucu HTML'i, src/ui/band-tip.ts'in aynisi) ;
   MK.nav.back/menu/fs/close (src/ui/nav-icons.ts svg'leri) ; MK.img(...) yollari kit-v2/ altindan. Adres: #<bolum> &phone &clean (+ sayfaya ozel jetonlar). */
(function () {
  const MK = (window.MK = {});
  const BASE = (document.currentScript && document.currentScript.src.replace(/mk\.js.*$/, '')) || 'kit-v2/';
  MK.base = BASE;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  MK.esc = esc;
  MK.img = (p) => BASE + p;
  MK.ui = (n) => `${BASE}ui/${n}.webp`;
  MK.st = (n) => `${BASE}stat/${n}.webp`;
  MK.av = (n) => `${BASE}av/${n}.webp`;
  MK.cls = (n) => `${BASE}cls/${n}.webp`;
  MK.node = (n) => `${BASE}node/${n}.webp`;
  MK.spr = (n) => `${BASE}spr/${n}.webp`;
  MK.bg = (n) => `${BASE}bg/${n}.webp`;
  MK.brazier = (n) => `${BASE}valor/${n}.webp`;
  const svg = (body, cap) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="${cap || 'round'}" stroke-linejoin="round">${body}</svg>`;
  MK.nav = {
    back: svg('<path d="M15 4 L7 12 L15 20"/>'),
    menu: svg('<path d="M4 6h16 M4 12h5 M15 12h5 M4 18h16"/><path d="M12 9.2 l2.8 2.8 -2.8 2.8 -2.8 -2.8 z" stroke="#e0904a" fill="#e0702a" stroke-width="1"/>'),
    fs: svg('<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>', 'square'),
    close: svg('<path d="M6 6 L18 18 M18 6 L6 18"/>'),
  };
  MK.navBtn = (kind, title) => `<button class="nav-btn ${kind}" type="button" title="${esc(title || kind)}">${MK.nav[kind === 'fs' ? 'fs' : kind]}</button>`;
  // A Band ipucu (src/ui/band-tip.ts birebir; yalnizca anahtar kelime vurgusu yok, rakamlar altin)
  const rich = (t) => esc(t).replace(/(\d+(?:[.,]\d+)?%?)/g, '<span class="n">$1</span>');
  MK.tip = (s) => {
    const css = (c) => String(c).replace(/[;"<>]/g, '');
    const medal = s.icon ? `<span class="bt-medal ${s.iconShape === 'round' ? 'round' : s.iconShape === 'portrait' ? 'por' : 'ico frm'}" style="background-image:url(&quot;${esc(s.icon)}&quot;)"></span>` : '';
    const aside = s.value !== undefined ? `<div class="bt-big"${s.valueColor ? ` style="color:${css(s.valueColor)}"` : ''}>${esc(s.value)}${s.valueLabel ? `<small>${esc(s.valueLabel)}</small>` : ''}</div>` : '';
    const head = `<div class="bt-head">${medal}<div class="bt-ht">${s.kind ? `<div class="bt-kind">${esc(s.kind)}</div>` : ''}<div class="bt-title"${s.titleColor ? ` style="color:${css(s.titleColor)}"` : ''}>${esc(s.title)}</div></div>${aside ? `<div class="bt-aside">${aside}</div>` : ''}</div>`;
    const chip = (c) => `<span class="bt-chip${c.tone ? ' ' + c.tone : ''}">${c.icon ? `<img src="${esc(c.icon)}" alt="" draggable="false">` : ''}${c.tone === 'v' && c.num ? `<span class="n">${esc(c.num)}</span> ${esc(c.text)}` : esc(c.text)}</span>`;
    const chips = s.chips && s.chips.length ? `<div class="bt-meta">${s.chips.map(chip).join('')}</div>` : '';
    const lines = (s.lines || []).map((l) => `<div class="bt-ln"><span class="dia"></span><div class="tx">${rich(l)}</div></div>`).join('');
    const body = lines || s.bodyHtml ? `<div class="bt-div"></div><div class="bt-body">${lines}${s.bodyHtml || ''}</div>` : '';
    const foot = s.foot ? `<div class="bt-foot"><span class="dia"></span><span class="tx">${esc(s.foot)}</span></div>` : '';
    return `<div class="bt"${s.accent ? ` style="--ac:${css(s.accent)}"` : ''}>${head}${chips}${body}${foot}</div>`;
  };

  const S = (MK.S = { v: 'all', phone: false, clean: false, extra: {} });
  const secs = [];
  function readHash() {
    S.extra = {};
    S.v = 'all';
    location.hash.replace(/^#/, '').split('&').forEach((p) => {
      if (!p) return;
      if (p === 'phone') S.phone = true;
      else if (p === 'clean') S.clean = true;
      else if (p.includes('=')) { const [k, v] = p.split('='); S.extra[k] = v; }
      else S.v = p;
    });
  }
  function writeHash() {
    const x = Object.entries(S.extra).map(([k, v]) => `${k}=${v}`);
    history.replaceState(null, '', '#' + [S.v, S.phone ? 'phone' : '', S.clean ? 'clean' : '', ...x].filter(Boolean).join('&'));
  }
  function fit() {
    const fw = S.phone ? 844 : 1600;
    const z = Math.min(1, (window.innerWidth - 44) / fw);
    document.querySelectorAll('.mk-zoom').forEach((e) => { e.style.zoom = String(z); });
  }
  function apply() {
    const r = document.documentElement;
    r.classList.toggle('mk-phone', S.phone);
    r.classList.toggle('short', S.phone);
    r.classList.toggle('compact', S.phone);
    r.classList.toggle('mk-clean', S.clean);
    secs.forEach((s) => s.el.classList.toggle('mk-hide', S.v !== 'all' && S.v !== s.id));
    document.querySelectorAll('#mk-strip button[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.v));
    document.querySelectorAll('#mk-strip button[data-m]').forEach((b) => b.classList.toggle('on', (b.dataset.m === 'phone') === S.phone));
    r.style.setProperty('--sc', String((S.phone ? 390 : 900) / 1080));
    r.style.setProperty('--bh-inv', String(1080 / (S.phone ? 390 : 900)));
    fit();
    writeHash();
    if (MK.onApply) MK.onApply(S);
  }
  MK.refresh = apply;
  MK.addFrame = (host, o) => {
    const cell = document.createElement('div');
    cell.className = 'mk-cell';
    cell.innerHTML = `${o.cap ? `<div class="mk-cap">${esc(o.cap)}</div>` : ''}<div class="mk-zoom"><div class="mk-frame ${o.cls || ''}${o.crop ? ' crop' : ''}"${o.crop ? ` style="--chd:${o.crop[0]}px;--chp:${o.crop[1]}px"` : ''}><div class="mk-bg ${o.dim === false ? '' : 'dim'}" style="${o.bg ? `background-image:url(${o.bg})` : ''}"></div><div class="mk-ui"></div></div></div>`;
    host.append(cell);
    const f = { cell, frame: cell.querySelector('.mk-frame'), ui: cell.querySelector('.mk-ui'), state: o.state || {}, redraw() { o.render(f.ui, f); } };
    f.redraw();
    return f;
  };
  MK.mount = (cfg) => {
    readHash();
    document.title = cfg.title;
    const root = document.getElementById('sections');
    cfg.sections.forEach((s) => {
      const el = document.createElement('section');
      el.className = 'mk-sec';
      el.id = s.id;
      el.innerHTML = `<h2>${s.h}</h2>${s.note ? `<p class="mk-note">${s.note}</p>` : ''}<div class="mk-frames"></div>`;
      root.append(el);
      secs.push({ id: s.id, el });
      s.build(el.querySelector('.mk-frames'));
    });
    const strip = document.createElement('div');
    strip.id = 'mk-strip';
    strip.innerHTML = `<b>MOCKUP</b>${esc(cfg.title)} &middot; <button data-v="all">All</button>${cfg.sections.map((s) => `<button data-v="${s.id}">${esc(s.tab || s.id)}</button>`).join('')}<span class="sep"></span><button data-m="desk">1600x900</button><button data-m="phone">844x390</button>`;
    document.body.append(strip);
    strip.querySelectorAll('button[data-v]').forEach((b) => b.addEventListener('click', () => { S.v = b.dataset.v; apply(); }));
    strip.querySelectorAll('button[data-m]').forEach((b) => b.addEventListener('click', () => { S.phone = b.dataset.m === 'phone'; apply(); }));
    window.addEventListener('resize', fit);
    window.addEventListener('hashchange', () => { readHash(); apply(); });
    apply();
  };
})();
