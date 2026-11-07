/* Mockup kit runtime. Hash: #v=a&s=169&n=shrine. EOV.init({variants:[[id,label]], groups:[{key,label,items:[[id,label]]}], render(st, stage)}) */
window.EOV = { init(cfg) {
  const bar = document.getElementById('bar'), fit = document.getElementById('fitbox'), stage = document.getElementById('stage');
  const sizes = [['169', '16:9'], ['219', '21:9'], ['ph', 'Phone 844x390']];
  const st = { v: cfg.variants[0][0], s: '169' };
  (cfg.groups || []).forEach((g) => (st[g.key] = g.items[0][0]));
  new URLSearchParams(location.hash.slice(1)).forEach((val, k) => (st[k] = val));
  const mk = (key, label, items) => { const g = document.createElement('div'); g.className = 'grp'; g.innerHTML = `<span class="lab">${label}</span>` + items.map(([id, l]) => `<button data-k="${key}" data-id="${id}">${l}</button>`).join(''); bar.appendChild(g); };
  mk('v', 'Variant', cfg.variants); (cfg.groups || []).forEach((g) => mk(g.key, g.label, g.items)); mk('s', 'Screen', sizes);
  const place = () => {
    fit.style.top = bar.offsetHeight + 'px';
    const w = stage.offsetWidth, h = stage.offsetHeight, k = Math.min(fit.clientWidth / w, fit.clientHeight / h);
    stage.style.transform = `scale(${k})`;
    stage.style.left = (fit.clientWidth - w * k) / 2 + 'px'; stage.style.top = (fit.clientHeight - h * k) / 2 + 'px';
  };
  const draw = () => {
    stage.className = 's-' + st.s; stage.dataset.v = st.v;
    document.documentElement.classList.toggle('short', st.s === 'ph');
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', st[b.dataset.k] === b.dataset.id));
    history.replaceState(null, '', '#' + new URLSearchParams(st).toString());
    stage.innerHTML = ''; cfg.render(st, stage); place();
  };
  bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st[b.dataset.k] = b.dataset.id; draw(); });
  addEventListener('hashchange', () => { const h = new URLSearchParams(st).toString(); if (location.hash.slice(1) !== h) { new URLSearchParams(location.hash.slice(1)).forEach((val, key) => (st[key] = val)); draw(); } });
  addEventListener('resize', place); document.fonts.ready.then(draw); draw();
} };
