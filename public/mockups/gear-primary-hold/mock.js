/* Gear primary + basili tutma mockup mantigi (oyun kodu DEGIL). Hash: #now #a #b #c. */
(() => {
  const root = document.documentElement;
  const bar = document.getElementById('mk-bar');
  const note = document.getElementById('mk-note');
  const view = document.getElementById('mk-view');
  const stage = document.getElementById('mk-stage');
  const HOLD_MS = 600; // tutma suresi (istek: ~600 ms)
  const NOTES = {
    now: '<b>Mevcut:</b> primary kutusu turuncu dolgulu ve kalin yazili, ustune basilmis gibi; puan bekleyen + Confirm ile verilir. Karsilastirma icin (burada yalniz gorunum).',
    a: '<b>A Tac:</b> Primary kutusu otekilerle ayni, yalniz sag ustte kucuk kor elmas; tutunca kutu alttan yukari kor rengiyle dolar, bitince halka yayilir ve elmas parlar.',
    b: '<b>B Ray:</b> Primary adi altin, kutunun altinda ince kor ray; tutunca ray soldan saga dolar, bitince +1 yukari suzulur.',
    c: '<b>C Koseler:</b> Primary dort kose isaretli; tutunca ikonun cevresindeki halka tam tur dolar, bitince halka buyuyup kor kivilcimlar saçilir.',
  };
  const STATS = [
    ['str', 'Strength'],
    ['dex', 'Dexterity'],
    ['int', 'Intelligence'],
    ['luck', 'Luck'],
  ];
  const SIZES = { '169': { w: 1920, h: 1080, gu: 1, label: '16:9' }, '219': { w: 2580, h: 1080, gu: 1, label: '21:9' }, ph: { w: 844, h: 390, gu: 390 / 1080, label: 'Phone' } };
  // telefonda oyunun mantiksal genisligi 2337: gu = min(844/2337, 390/1080)
  SIZES.ph.gu = Math.min(844 / 2337, 390 / 1080);
  const S = { variant: (location.hash.slice(1) || 'a').split('&')[0], points: 3, primary: 'str', size: '169', val: { str: 14, dex: 9, int: 4, luck: 6 } };
  if (!NOTES[S.variant]) S.variant = 'a';
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const ICON = (k) => `gear-primary-hold/icons/${k}.webp`;

  function buildBar() {
    bar.replaceChildren();
    const add = (label, on, fn, title) => { const b = el('button', on ? 'on' : '', label); if (title) b.title = title; b.onclick = fn; bar.append(b); return b; };
    for (const [k, l] of [['now', 'Now'], ['a', 'A'], ['b', 'B'], ['c', 'C']]) add(l, S.variant === k, () => { S.variant = k; location.hash = k; render(); });
    bar.append(el('span', 'sep'));
    add(S.points > 0 ? `Points: ${S.points}` : 'Points: none', S.points > 0, () => { S.points = S.points > 0 ? 0 : 3; render(); }, 'Toggle: points to spend / all placed');
    add('Reset', false, () => { S.val = { str: 14, dex: 9, int: 4, luck: 6 }; S.points = 3; render(); });
    add(S.primary === 'str' ? 'Main: STR' : 'Main: INT', false, () => { S.primary = S.primary === 'str' ? 'int' : 'str'; render(); }, 'Primary stat: Strength / Intelligence');
    bar.append(el('span', 'sep'));
    for (const k of ['169', '219', 'ph']) add(SIZES[k].label, S.size === k, () => { S.size = k; render(); });
    note.innerHTML = NOTES[S.variant] + ' <b>Dene:</b> kutuya basili tut (fare ya da dokunma), erken birak = dolgu geri sarar.';
  }

  function fit() {
    const z = SIZES[S.size];
    stage.style.width = z.w + 'px';
    stage.style.height = z.h + 'px';
    stage.style.setProperty('--gu', z.gu + 'px');
    for (const k of ['--el', '--er', '--et', '--eb']) stage.style.setProperty(k, '0px');
    root.classList.toggle('short', S.size === 'ph');
    root.classList.toggle('compact', S.size === 'ph');
    const vw = view.clientWidth, vh = view.clientHeight;
    const k = Math.min(vw / z.w, vh / z.h, S.size === 'ph' ? 2.4 : 1);
    stage.style.transform = `scale(${k})`;
    stage.dataset.k = String(k);
  }

  const row = (k, name, val) => `<div class="sh-row" data-stat="${k}"><img class="sh-ico" src="${ICON(k)}" alt="" draggable="false"><span class="sh-k">${name}</span><span class="sh-n">${val}</span><span class="sh-d"></span></div>`;
  const bar2 = (cls, id, name, v, w) => `<div class="sh-bh ${id}" data-stat="${id}"><div class="sh-bh-top"><img class="sh-ico" src="${ICON(id)}" alt="" draggable="false"><span class="sh-bn">${name}</span><span class="sh-bv">${v}</span><span class="sh-d"></span></div><div class="sh-bar"><i class="${cls}" style="width:${w}%"></i></div></div>`;

  function tileHtml(k, name) {
    const isP = k === S.primary;
    const now = S.variant === 'now';
    const can = S.points > 0;
    const cls = `sh-row sh-tile${now && isP ? ' p' : ''}${!now && isP ? ' mk-p' : ''}${can ? ' can-add' : ''}`;
    return `<div class="${cls}" data-stat="${k}" tabindex="0" role="button" aria-label="${name}">`
      + `<span class="sh-t-top"><span class="mk-ico"><img class="sh-ico" src="${ICON(k)}" alt="" draggable="false"><svg class="mk-ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="16"/><circle class="fg" cx="18" cy="18" r="16" pathLength="100"/></svg><i class="mk-sp" style="--dx:-14px;--dy:-14px"></i><i class="mk-sp" style="--dx:14px;--dy:-14px"></i><i class="mk-sp" style="--dx:-14px;--dy:14px"></i><i class="mk-sp" style="--dx:14px;--dy:14px"></i></span><span class="sh-k">${name}</span></span>`
      + `<span class="sh-t-bot"><span class="sh-n">${S.val[k]}</span><span class="sh-d"></span></span>`
      + `<i class="mk-dia"></i><span class="mk-plus">+1</span></div>`;
  }

  function render() {
    buildBar();
    fit();
    const free = S.points;
    stage.className = 'v-' + S.variant;
    stage.innerHTML = `<div class="gr-overlay"><div class="gr-panel gr-solo"><div class="mk-tabs"><span class="mk-title">Gear</span><span class="mk-tab">Hero</span><span class="mk-tab on">Sheet</span><span class="mk-tab">Tree</span></div>`
      + `<div class="sh"><div class="sh-head"><span class="sh-lt">Level <b>9</b></span><span class="sh-xpv">120 <s>/ 673 XP</s></span></div><div class="sh-bar sh-xp"><i style="width:18%"></i></div>`
      + `<div class="sh-under"><span class="sh-ptr${free > 0 ? '' : ' idle'}"><span class="sh-medal${free > 0 ? '' : ' empty'}"><span>${free}</span></span><span class="sh-tx">${free > 0 ? `stat point${free === 1 ? '' : 's'} to spend` : 'All points placed'}</span></span></div>`
      + `<div class="sh-dv"></div><div class="sh-vit">${bar2('fhp', 'hp', 'HP', '151 <s>/ 151</s>', 100)}${bar2('fmp', 'mp', 'MP', '49 <s>/ 49</s>', 100)}</div><div class="sh-dv"></div>`
      + `<div class="sh-cols"><div class="sh-col base"><div class="sh-sl">Main</div><div class="sh-main">${STATS.map(([k, n]) => tileHtml(k, n)).join('')}</div></div>`
      + `<div class="sh-two"><div class="sh-col attack"><div class="sh-sl">Attack</div>${row('might', 'Damage', '0%')}${row('critChance', 'Crit chance', '8.5%')}${row('accuracy', 'Accuracy', '87%')}</div>`
      + `<div class="sh-col defense"><div class="sh-sl">Defense</div>${row('armor', 'Armor', '12')}${row('magicArmor', 'Magic armor', '4')}${row('evasion', 'Evasion', '6%')}</div></div></div></div></div></div>`;
    wire();
  }

  /* ---- basili tutma ---- */
  function updateFree() {
    const medal = stage.querySelector('.sh-medal');
    const ptr = stage.querySelector('.sh-ptr');
    const tx = stage.querySelector('.sh-tx');
    medal.firstChild.textContent = String(S.points);
    medal.classList.toggle('empty', S.points <= 0);
    ptr.classList.toggle('idle', S.points <= 0);
    tx.textContent = S.points > 0 ? `stat point${S.points === 1 ? '' : 's'} to spend` : 'All points placed';
    stage.querySelectorAll('.sh-tile').forEach((t) => t.classList.toggle('can-add', S.points > 0));
    buildBar();
  }

  function wire() {
    stage.querySelectorAll('.sh-tile').forEach((tile) => {
      const k = tile.dataset.stat;
      let raf = 0, prog = 0, t0 = 0, active = false, finished = false;
      const set = (p) => { prog = p; tile.style.setProperty('--h', p.toFixed(4)); };
      const stop = () => { cancelAnimationFrame(raf); raf = 0; };
      const complete = () => {
        stop();
        finished = true;
        set(1);
        S.points -= 1;
        S.val[k] += 1;
        tile.querySelector('.sh-n').textContent = String(S.val[k]);
        tile.classList.remove('holding');
        tile.classList.add('done');
        updateFree();
        window.setTimeout(() => { tile.classList.remove('done'); set(0); }, 480);
      };
      const tick = (ts) => {
        if (!active) return;
        if (!t0) t0 = ts - prog * HOLD_MS;
        const p = Math.min(1, (ts - t0) / HOLD_MS);
        set(p);
        if (p >= 1) return complete();
        raf = requestAnimationFrame(tick);
      };
      const rewind = () => {
        stop();
        const from = prog;
        const dur = Math.max(120, from * 260); // erken birakinca dolgu geri sarar (kisa)
        const s0 = performance.now();
        const back = (ts) => {
          const q = Math.min(1, (ts - s0) / dur);
          set(from * (1 - q * q)); // yumusak
          if (q < 1 && !active) raf = requestAnimationFrame(back);
        };
        raf = requestAnimationFrame(back);
      };
      const down = () => {
        if (active || finished || S.variant === 'now') return;
        if (S.points <= 0) { tile.classList.add('nope'); window.setTimeout(() => tile.classList.remove('nope'), 320); return; }
        active = true; t0 = 0;
        stop();
        tile.classList.add('holding');
        raf = requestAnimationFrame(tick);
      };
      const up = () => {
        finished = false;
        if (!active) return;
        active = false;
        tile.classList.remove('holding');
        if (prog < 1) rewind();
      };
      tile.addEventListener('pointerdown', (e) => { if (e.button > 0) return; try { tile.setPointerCapture(e.pointerId); } catch { /* yok */ } down(); });
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) tile.addEventListener(t, up);
      tile.addEventListener('contextmenu', (e) => e.preventDefault());
      tile.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); } });
      tile.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
      tile.addEventListener('blur', up);
    });
  }

  addEventListener('resize', fit);
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (NOTES[h] && h !== S.variant) { S.variant = h; render(); } });
  render();
})();
