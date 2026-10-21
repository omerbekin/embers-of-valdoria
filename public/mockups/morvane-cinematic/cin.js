/* MOCKUP (oyun kodu degil): Lord Morvane sinematigi, 3 varyant. Adres: #v1 | #v2 | #v3  &n=1..6 (6 = kapanis karti)  &clean  &rm=1 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);

  // ---------- GORSEL YUVASI: yeni illustrasyon gelince yalniz buradaki dosya adi degisir ----------
  const BG = {
    hall: { src: 'morvane-cinematic/castle-hall.webp', dark: false, ash: 0.7 },
    plain: { src: 'morvane-cinematic/ashen-plain.webp', dark: false, ash: 0.22 }, // kul dinmis: parcacik az
  };
  const END_ASH = 0.5;

  // ---------- metin (oyun ici Ingilizce; "page" yalnizca v3 kitabinda sayfa grubu) ----------
  const WHO = {
    narrator: { name: 'Narrator', cls: 'n' },
    morvane: { name: 'Lord Morvane', cls: 'm', img: 'morvane-cinematic/lord_morvane.webp' },
    leader: { name: 'Paladin', role: 'Company Leader', cls: 'l', img: 'morvane-cinematic/paladin.webp' }, // ornek lider sinifi
  };
  const LINES = [
    { bg: 'hall', who: 'narrator', page: 0, text: 'The last blow lands. Lord Morvane sinks to one knee, and the ash in the hall hangs still.' },
    { bg: 'hall', who: 'morvane', page: 0, text: 'So it ends with strangers. I always thought it would.' },
    { bg: 'hall', who: 'leader', page: 0, text: 'Your curse ends with you, Morvane.' },
    { bg: 'hall', who: 'narrator', page: 1, text: 'Lord Morvane falls silent. The Crown of Ash rolls across the stones. It does not break. Its embers still glow.' },
    { bg: 'plain', who: 'narrator', page: 2, text: 'Across Valdoria the grey ash stops falling. For the first time in a year, the wind smells of rain.' },
  ];
  const END = { title: 'The Ash Curse is broken.', sub: 'Valdoria is free again.' };
  const N = LINES.length; // N = kapanis karti indeksi

  // ---------- adres ----------
  const params = () => {
    const t = location.hash.replace(/^#/, '').split('&');
    const o = { v: /^v[123]$/.test(t[0]) ? t[0] : 'v1', n: 0, clean: false, rm: false };
    for (const p of t.slice(1)) {
      if (p.startsWith('n=')) o.n = Math.max(0, Math.min(N + 1, parseInt(p.slice(2), 10) || 0));
      else if (p === 'clean') o.clean = true;
      else if (p === 'rm=1') o.rm = true;
    }
    return o;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fmt = (l) => (l.who === 'narrator' ? l.text : '“' + l.text + '”');

  // ---------- azaltilmis hareket + dugme olcegi + kisa ekran ----------
  let RM = false;
  function env(P) {
    RM = P.rm || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const h = innerHeight, root = document.documentElement;
    root.classList.toggle('reduced-motion', RM);
    root.classList.toggle('short', h <= 520);
    root.classList.toggle('compact', h <= 720);
    const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const k = coarse ? 1 : Math.round(Math.min(1.75, Math.max(1, h / 640)) / 0.05) * 0.05;
    root.style.setProperty('--nav-k', String(k)); // oyundaki navScaleFor ile ayni kural
  }

  // ---------- kul / kor parcaciklari ----------
  function Ash(canvas) {
    const c = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, parts = [], density = 0.6, raf = 0, last = 0, alive = true;
    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
    };
    const target = () => Math.round(Math.min(90, Math.max(18, (W * H) / 22000)) * density);
    const spawn = (anywhere) => {
      const hot = Math.random() < 0.14;
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : (hot ? H + 6 : -6), r: hot ? 1 + Math.random() * 1.4 : 0.8 + Math.random() * 1.9,
        vy: hot ? -(14 + Math.random() * 30) : 18 + Math.random() * 38, vx: 6 + Math.random() * 16, ph: Math.random() * 6.28, a: 0.25 + Math.random() * 0.5, hot };
    };
    const tick = (t) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      if (!W) resize();
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const want = target();
      while (parts.length < want) parts.push(spawn(true));
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.ph += dt * (p.hot ? 3 : 1.2);
        p.x += (p.vx + Math.sin(p.ph) * 10) * dt; p.y += p.vy * dt;
        if (p.y > H + 8 || p.y < -8 || p.x > W + 8) { if (parts.length > want) parts.splice(i, 1); else parts[i] = spawn(false); continue; }
        const f = p.hot ? 0.6 + 0.4 * Math.sin(p.ph * 2) : 1;
        c.globalAlpha = p.a * f;
        c.fillStyle = p.hot ? '#ffb35a' : '#b9b2a6';
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.2832); c.fill();
      }
    };
    resize();
    if (!RM) raf = requestAnimationFrame(tick);
    addEventListener('resize', resize);
    return { set(d) { density = d; }, destroy() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); } };
  }

  // ---------- daktilo ----------
  function typeInto(tw, text, onDone, instant) {
    const on = tw.querySelector('.on'), off = tw.querySelector('.off');
    let k = 0, timer = 0, done = false;
    const set = (n) => { on.textContent = text.slice(0, n); off.textContent = text.slice(n); };
    const fin = () => { if (done) return; done = true; clearTimeout(timer); set(text.length); onDone(); };
    const step = () => {
      k++; set(k);
      if (k >= text.length) return fin();
      const ch = text[k - 1];
      timer = setTimeout(step, ',;'.includes(ch) ? 150 : '.!?”'.includes(ch) ? 260 : 22);
    };
    set(0);
    if (instant || RM) { fin(); return { finish: fin, cancel() { clearTimeout(timer); done = true; } }; }
    timer = setTimeout(step, 120);
    return { finish: fin, cancel() { clearTimeout(timer); done = true; } };
  }
  const twHtml = (cls) => `<div class="tw ${cls || ''}"><span class="on"></span><span class="off"></span></div>`;

  // ---------- ortak sahne tabani: gorsel yuvasi, gecisler, kul ----------
  function Base(host, variant) {
    host.insertAdjacentHTML('beforeend', '<div class="cin-view"><div class="cin-layer a"></div><div class="cin-layer b"></div><div class="cin-vig"></div><div class="cin-fade"></div><canvas class="cin-ash"></canvas></div>');
    const view = $('.cin-view', host), layers = [$('.cin-layer.a', view), $('.cin-layer.b', view)], fade = $('.cin-fade', view);
    const ash = Ash($('.cin-ash', view));
    let cur = -1, drift = 0, key = null;
    const api = {
      view, fade, ash, key: () => key,
      setBg(k, instant) {
        const next = (cur + 1) % 2, L = layers[next], d = BG[k];
        L.style.backgroundImage = `url(${d.src})`;
        L.classList.toggle('dark', !!d.dark);
        L.classList.toggle('nt', !!instant);
        L.classList.remove('d1', 'd2'); void L.offsetWidth;
        L.classList.add(drift++ % 2 ? 'd2' : 'd1');
        L.classList.add('on');
        if (cur >= 0) { layers[cur].classList.toggle('nt', !!instant); layers[cur].classList.remove('on'); }
        if (instant) { void L.offsetWidth; L.classList.remove('nt'); if (cur >= 0) layers[cur].classList.remove('nt'); }
        cur = next; key = k; ash.set(d.ash);
      },
      crossfade(k) { api.setBg(k, false); },
      async dip(k) { // kararma: karar, gorseli degistir, ac
        fade.classList.add('on'); await wait(RM ? 260 : 700);
        api.setBg(k, true); await wait(150);
        fade.classList.remove('on'); await wait(RM ? 200 : 500);
      },
      blackNow() { fade.style.transition = 'none'; fade.classList.add('on'); void fade.offsetWidth; fade.style.transition = ''; },
      async fromBlack(k) { api.blackNow(); api.setBg(k, true); await wait(60); fade.classList.remove('on'); await wait(RM ? 200 : 700); },
      destroy() { ash.destroy(); },
    };
    return api;
  }

  const endHtml = () => `<div class="cin-end"><div class="e-t">${esc(END.title)}</div><div class="e-dia"><i></i></div><div class="e-s">${esc(END.sub)}</div><div class="e-act"><button class="cin-btn" data-a="replay" type="button">Replay</button><button class="cin-btn pri" data-a="continue" type="button">Continue</button></div></div>`;
  const nameHtml = (w) => `<span class="nm ${w.cls}">${esc(w.name)}${w.role ? ` <span class="role">· ${esc(w.role)}</span>` : ''}</span>`;

  // ======================= v1: alt diyalog bandi =======================
  function V1(stage) {
    stage.className = 'v1';
    const base = Base(stage, 'v1');
    stage.insertAdjacentHTML('beforeend', `<div class="v1-band nar"><div class="v1-por"></div><div class="v1-txt"><div class="v1-name"></div>${twHtml()}</div><i class="nx"></i></div>${endHtml()}`);
    const band = $('.v1-band', stage), por = $('.v1-por', stage), nm = $('.v1-name', stage), tw = $('.tw', stage);
    return {
      base,
      async enter(l, i, prev, instant) {
        if (!prev) { stage.classList.add('hold'); if (instant) base.setBg(l.bg, true); else await base.fromBlack(l.bg); stage.classList.remove('hold'); }
        else if (prev.bg !== l.bg) { if (instant) base.setBg(l.bg, true); else { stage.classList.add('hold'); await base.dip(l.bg); stage.classList.remove('hold'); } }
        const w = WHO[l.who];
        band.classList.toggle('nar', !w.img);
        por.style.backgroundImage = w.img ? `url(${w.img})` : 'none';
        nm.innerHTML = nameHtml(w);
        tw.className = 'tw ' + w.cls;
        return tw;
      },
      async end(instant) {
        stage.classList.add('hold');
        if (instant) { base.fade.classList.add('on'); }
        else { base.fade.classList.add('slow', 'on'); await wait(RM ? 250 : 900); }
        stage.classList.add('closing'); base.ash.set(END_ASH);
      },
    };
  }

  // ======================= v2: sinema seridi =======================
  function V2(stage) {
    stage.className = 'v2';
    const base = Base(stage, 'v2');
    stage.insertAdjacentHTML('beforeend', `<div class="v2-bar t"></div><div class="v2-bar b"></div><div class="v2-sub"><div class="v2-name"></div>${twHtml()}</div><i class="nx"></i>${endHtml()}`);
    const nm = $('.v2-name', stage), tw = $('.tw', stage);
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('open')));
    return {
      base,
      async enter(l, i, prev, instant) {
        if (!prev) { stage.classList.add('hold'); if (instant) base.setBg(l.bg, true); else { base.blackNow(); base.setBg(l.bg, true); await wait(60); base.fade.classList.remove('on'); await wait(RM ? 250 : 1300); } stage.classList.remove('hold'); }
        else if (prev.bg !== l.bg) { if (instant) base.setBg(l.bg, true); else { stage.classList.add('hold'); await base.dip(l.bg); stage.classList.remove('hold'); } }
        const w = WHO[l.who];
        nm.innerHTML = `<span class="nm ${w.cls}">${esc(w.name)}</span>`; // sinema seridinde portre yok; lider = sinif adi
        tw.className = 'tw ' + w.cls;
        return tw;
      },
      async end(instant) {
        stage.classList.add('hold', 'closing');
        if (!instant) await wait(RM ? 200 : 900);
        base.ash.set(END_ASH);
      },
    };
  }

  // ======================= v3: hikaye kitabi =======================
  function V3(stage) {
    stage.className = 'v3';
    stage.insertAdjacentHTML('beforeend', '<div class="v3-book"><div class="v3-frame"><i></i><i></i><i></i><i></i></div><div class="v3-pw"><div class="v3-page"></div></div></div>');
    const base = Base($('.v3-frame', stage), 'v3');
    const pw = $('.v3-pw', stage); let page = $('.v3-page', stage);
    let curPage = -1, pageNo = 0;
    const nx = '<i class="nx"></i>';
    const para = (l, cls) => {
      const w = WHO[l.who];
      return `<div class="v3-p ${l.who === 'narrator' ? 'nar' : ''} ${cls || ''}">${w.img ? `<div class="por" style="background-image:url(${w.img})"></div>` : ''}<div class="bd">${l.who === 'narrator' ? '' : `<span class="who">${esc(w.name)}</span>`}${twHtml(w.cls)}</div></div>`;
    };
    const fillStatic = (l, i) => { // sayfadaki onceki paragraflari (tam yazili) yeniden kur
      const same = LINES.map((x, k) => [x, k]).filter(([x, k]) => x.page === l.page && k < i);
      page.innerHTML = same.map(([x]) => para(x, 'old')).join('');
      page.querySelectorAll('.tw').forEach((t, k) => { t.querySelector('.on').textContent = fmt(same[k][0]); });
    };
    const turn = async () => {
      const old = page.cloneNode(true); old.className = 'v3-turn'; old.querySelectorAll('.nx').forEach((n) => n.remove());
      pw.appendChild(old);
      if (RM) { old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).onfinish = () => old.remove(); return; }
      old.animate([{ transform: 'rotateY(0deg)', filter: 'brightness(1)', opacity: 1, offset: 0 }, { transform: 'rotateY(-95deg)', filter: 'brightness(.55)', opacity: 1, offset: .8 }, { transform: 'rotateY(-110deg)', filter: 'brightness(.5)', opacity: 0, offset: 1 }],
        { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = () => old.remove();
    };
    const setNo = (n) => { let e = $('.v3-no', page); if (!e) { e = document.createElement('div'); e.className = 'v3-no'; page.appendChild(e); } e.textContent = '— ' + n + ' —'; };
    const tail = () => { page.querySelectorAll('.nx').forEach((n) => n.remove()); page.insertAdjacentHTML('beforeend', nx); };
    return {
      base,
      async enter(l, i, prev, instant) {
        if (l.page !== curPage) {
          if (curPage >= 0 && !instant) { await turn(); }
          if (!prev || prev.bg !== l.bg) { if (!prev || instant) base.setBg(l.bg, true); else base.crossfade(l.bg); }
          else if (prev && prev.bg !== l.bg) base.crossfade(l.bg);
          curPage = l.page; pageNo = l.page + 1;
          page.innerHTML = ''; fillStatic(l, i);
          if (!instant && prev) await wait(RM ? 100 : 350);
        } else {
          page.querySelectorAll('.v3-p').forEach((p) => p.classList.add('old'));
        }
        if (!prev && !instant) { base.blackNow(); await wait(60); base.fade.classList.remove('on'); await wait(RM ? 100 : 500); }
        page.insertAdjacentHTML('beforeend', para(l));
        const ps = page.querySelectorAll('.v3-p'); const tw = ps[ps.length - 1].querySelector('.tw');
        // onceki paragraflarin yazisi page.innerHTML ile kuruldu; "old" siniflari fillStatic'te
        setNo(pageNo); tail();
        return tw;
      },
      async end(instant) {
        if (!instant && curPage >= 0) await turn();
        base.crossfade('plain'); curPage = 99;
        stage.classList.add('closing');
        page.innerHTML = endHtml(); page.querySelector('.cin-end').style.position = 'absolute';
      },
    };
  }

  // ======================= oynatici =======================
  let player = null;
  function Player(P) {
    const stage = $('#stage'); stage.innerHTML = ''; stage.className = '';
    const v = ({ v1: V1, v2: V2, v3: V3 })[P.v](stage);
    let i = -1, busy = true, typing = null, dead = false, atEnd = false;
    const self = {
      async go(k, instant) {
        busy = true; stage.classList.remove('ready'); if (typing) typing.cancel(); typing = null;
        if (k >= N) {
          atEnd = true; $('#skip').hidden = true;
          await v.end(instant); i = k; busy = false; return;
        }
        const l = LINES[k];
        const tw = await v.enter(l, k, i >= 0 ? LINES[i] : null, instant);
        if (dead) return;
        i = k; busy = false;
        typing = typeInto(tw, fmt(l), () => stage.classList.add('ready'), instant);
      },
      tap() { if (busy || atEnd) return; if (typing && !stage.classList.contains('ready')) { typing.finish(); return; } self.go(i + 1); },
      skip() { if (busy || atEnd) return; self.go(N); },
      destroy() { dead = true; stage.removeEventListener('click', onClick); if (typing) typing.cancel(); v.base.destroy(); stage.innerHTML = ''; },
    };
    $('#skip').hidden = false;
    const onClick = (e) => {
      const b = e.target.closest('button');
      if (b) { init(true); return; } // mockup: Continue de basa sarar (oyunda "Valdoria Conquered" penceresi acilir)
      self.tap();
    };
    stage.addEventListener('click', onClick);
    if (P.n > 0) { const t = Math.min(P.n, N + 1) - 1; (async () => { for (let k = 0; k <= Math.min(t, N); k++) await self.go(k, true); })(); }
    else self.go(0);
    return self;
  }

  // ======================= mockup seridi =======================
  const DESC = {
    v1: 'Alt diyalog bandı: tam ekran görsel, altta yarı saydam band, solda konuşanın portresi, üstünde adı.',
    v2: 'Sinema şeridi: üst-alt siyah bantlar, portre yok, yazı alt bantta altyazı gibi ortalı, ad küçük üst satır.',
    v3: 'Hikâye kitabı: üstte çerçeveli illüstrasyon, altta parşömen sayfada metin; sahne değişince sayfa çevrilir.',
  };
  function strip(P) {
    const s = $('#mk-strip');
    s.classList.toggle('clean', P.clean);
    s.innerHTML = `<div class="hd"><b>MOCKUP</b><button data-x="replay" type="button">Replay</button><span class="sp"></span><button data-x="hide" type="button" title="Hide strip (H)">Hide</button><button data-x="min" type="button">–</button></div>` +
      ['v1', 'v2', 'v3'].map((v) => `<div class="row"><button data-v="${v}" type="button" class="${v === P.v ? 'act' : ''}">${v}</button><span>${DESC[v]}</span></div>`).join('');
    if (innerHeight <= 520) s.classList.add('min');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('#mk-strip button'); if (!b) return;
    const s = $('#mk-strip');
    if (b.dataset.v) { location.hash = '#' + b.dataset.v; }
    else if (b.dataset.x === 'replay') init(true);
    else if (b.dataset.x === 'hide') s.classList.add('clean');
    else if (b.dataset.x === 'min') s.classList.toggle('min');
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') { $('#mk-strip').classList.toggle('clean'); return; }
    if (e.target.closest && e.target.closest('button')) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (player) player.tap(); }
  });
  // Skip: tikla = atla; dokunmatikte uzun basinca kisa ipucu
  (function () {
    const b = $('#skip'); let t = 0, long = false;
    b.addEventListener('click', () => { if (long) { long = false; return; } if (player) player.skip(); });
    b.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; long = false; t = setTimeout(() => { long = true; b.classList.add('tip'); setTimeout(() => b.classList.remove('tip'), 1400); }, 450); });
    const c = () => clearTimeout(t); b.addEventListener('pointerup', c); b.addEventListener('pointerleave', c); b.addEventListener('pointercancel', c);
  })();

  function init(fromStart) {
    const P = params(); if (fromStart === true) P.n = 0;
    if (player) player.destroy();
    env(P); strip(P);
    player = Player(P);
  }
  addEventListener('hashchange', init);
  addEventListener('resize', () => env(params()));
  init();
})();
