/* Uc-nokta taslagi: oyun kodu degil. ESIK KURALI: kisa kenar < 100 oyun birimi (masaustu 1920 olceginde) = kucuk: ust + alt kenarin TAM ORTASINDA uc nokta;
   >= 100 = buyuk: bugunku V05 konumu (sol ust + sag alt, kenar boyunca), nokta +%15 / +%25. Telefonda esik AYNI oyun biriminde uygulanir (kutunun masaustundeki kisa kenari). */
(function () {
  const I = 'kose-sus/img/';
  const IT = 'kose-sus/items/';
  const D = 4; // V05 nokta capi (birim px), aralik 8
  const IVORY = '#f6e8bc';
  const dot = `radial-gradient(circle, ${IVORY} 0 52%, transparent 58%)`;
  const COMPS = [
    { id: 'c1', host: '.bp-ico', short: 60, name: 'Skill plate icon' },
    { id: 'c2', host: '.gr-item', short: 62, name: 'Gear bag cell' },
    { id: 'c3', host: '.bt', short: 200, name: 'Tooltip' },
    { id: 'c4', host: '.gr-slot.gr-plate', short: 92, name: 'Gear item plate' },
    { id: 'c5', host: '.mw-panel', short: 742, name: 'Event window' },
  ];
  const THRESH = 100;
  const css = [];
  const dsz = '--d: max(calc(' + D + 'px * var(--sk) * var(--ds, 1)), var(--fl)); --pt: max(calc(8px * var(--sk) * var(--ds, 1)), calc(var(--d) * 1.8));';
  const lay = (mode) => {
    const img = [], pos = [], size = [];
    const dd = 'var(--d)';
    if (mode === 'c') {
      for (const i of [-1, 0, 1]) {
        for (const top of [true, false]) {
          img.push(dot); size.push(dd + ' ' + dd);
          const x = 'calc(50% + ' + i + ' * var(--pt))';
          pos.push(top ? x + ' calc(var(--ov) + .5px - ' + dd + ' / 2)' : x + ' calc(100% + ' + dd + ' / 2 - var(--ov) - .5px)');
        }
      }
    } else {
      for (const i of [1, 2, 3]) {
        img.push(dot); size.push(dd + ' ' + dd);
        pos.push('left calc(' + i + ' * var(--pt) + var(--ov)) top calc(var(--ov) + .5px - ' + dd + ' / 2)');
        img.push(dot); size.push(dd + ' ' + dd);
        pos.push('right calc(' + i + ' * var(--pt) + var(--ov)) bottom calc(var(--ov) + .5px - ' + dd + ' / 2)');
      }
    }
    return 'background-image:' + img.join(',') + ';background-position:' + pos.join(',') + ';background-size:' + size.join(',') + ';background-repeat:no-repeat';
  };
  for (const c of COMPS) {
    for (const mode of ['c', 'k']) {
      css.push('.nu.m-' + mode + ' ' + c.host + "::before{all:unset;content:'';position:absolute;inset:calc(-1px - var(--ov));pointer-events:none;z-index:4;" + dsz + lay(mode) + '}');
    }
    css.push('.nu ' + c.host + "::after{all:unset;content:none}");
  }
  css.push('.nu .mw-corner,.nu .gr-c2,.nu .gr-c3,.nu .gr-dia{display:none}');
  css.push('.ucw{--ov:20px}');
  document.getElementById('ucdyn').textContent = css.join('\n');

  const raw = location.hash.replace(/^#/, '').split('&');
  const mode = raw[0] || 'd1';
  const clean = raw.indexOf('clean') >= 0;
  const phone = mode[0] === 'p';
  document.documentElement.classList.toggle('short', phone);
  document.documentElement.classList.toggle('compact', phone);
  document.body.classList.toggle('ph', phone);
  document.body.classList.toggle('clean', clean);
  const K = 0.3611;

  const chip = (c, n, ico) => '<span class="bp-chip ' + c + '"><img class="bh-ico" src="' + I + ico + '.webp" alt=""><b>' + n + '</b></span>';
  const sk = (cls, key, ico, nm, chips) => '<div class="bp ' + cls + '"><span class="bp-key">' + key + '</span><div class="bp-ico"><img class="bh-ico" src="' + I + 'sk-' + ico + '.webp" alt=""></div><span class="bp-nm">' + nm + '</span><div class="bp-chips">' + chips + '</div></div>';
  const samples = {
    c1: () => '<div class="bh-kit sc"><div class="bh-skills">' + sk('sel', 1, 'venomedge', 'Venom Edge', '<span class="bp-chip free">Free</span>') + sk('', 2, 'saltire', 'Saltire Cut', chip('', 9, 'st-mp') + chip('cd', 2, 'ui-cooldown')) + '</div></div>',
    c2: () => '<div style="display:flex;gap:10px"><button class="gr-item k0" style="--rc:#7d705a"><img class="gr-svg" src="' + IT + 'arming_sword.webp" alt=""></button><button class="gr-item k2" style="--rc:#5aa0ff"><img class="gr-svg" src="' + IT + 'ember_circlet.webp" alt=""></button><button class="gr-item k3 on" style="--rc:#b36bff"><img class="gr-svg" src="' + IT + 'emberbrand.webp" alt=""><i class="gr-c2"></i><i class="gr-c3"></i><i class="gr-dia"></i></button></div>',
    c3: () => '<div class="bh-kit sc"><div class="bt" style="--ac:#e8e2d0"><div class="bt-head"><span class="bt-medal ico frm" style="background-image:url(' + I + 'sk-venomedge.webp)"></span><div class="bt-ht"><div class="bt-kind">Skill</div><div class="bt-title">Venom Edge</div></div></div><div class="bt-meta"><span class="bt-chip">Single Target</span><span class="bt-chip free">Free</span></div><div class="bt-div"></div><div class="bt-body"><div class="bt-ln"><span class="dia"></span><div class="tx"><span class="k" style="color:#e8e2d0">Damage</span> <span class="n">100%</span> DEX (<span class="n">26</span>)</div></div></div></div></div>',
    c4: () => '<button class="gr-slot gr-plate gr-slot-weapon" style="--rc:#b36bff"><span class="gp-ico"><img class="gr-svg gr-slot-ico" src="' + IT + 'emberbrand.webp" alt=""></span><div class="gr-slot-text gp-tx"><div class="gp-lbl">Weapon</div><div class="gr-slot-name">Emberbrand</div></div></button>',
    c5: () => '<div class="mw"><div class="mw-win mw-center mw-A event"><div class="mw-panel" style="--ac:#cdb67f;--acr:205,182,127"><i class="mw-corner tl"></i><i class="mw-corner tr"></i><i class="mw-corner bl"></i><i class="mw-corner br"></i><div class="mw-hd"><div class="tx"><b class="mw-t">Guild Hall</b></div></div><div class="mw-body"><div class="mw-txt"><p>Saltmere is a city of two masters, and every newcomer is asked which one they serve.</p></div><div class="mw-plates compact"><button class="mw-plate acc-gold"><span class="mw-ptag">Choice</span><b class="mw-pnm">Swear to the Crown</b><p class="mw-pds">The guild will remember.</p></button><button class="mw-plate acc-red"><span class="mw-ptag">Choice</span><b class="mw-pnm">Stay unsworn</b><p class="mw-pds">Doors close, others open.</p></button></div></div></div></div></div>',
  };
  const TODAY = ['Today (diamonds)', ''];
  const VARS = {
    c1: [TODAY, ['New: centred top + bottom', 'nu m-c', 1]],
    c2: [TODAY, ['New: centred top + bottom', 'nu m-c', 1]],
    c3: [TODAY, ['New: corners +15%', 'nu m-k', 1.15], ['New: corners +25%', 'nu m-k', 1.25]],
    c4: [TODAY, ['Rule result: 92 < 100 = SMALL: centred', 'nu m-c', 1], ['Alt: corners +15%', 'nu m-k', 1.15], ['Alt: corners +25%', 'nu m-k', 1.25]],
    c5: [TODAY, ['New: corners +15%', 'nu m-k', 1.15], ['New: corners +25%', 'nu m-k', 1.25]],
  };
  const comps = { d1: ['c1', 'c2', 'c3', 'c4'], d2: ['c5'], p1: ['c1', 'c2', 'c3'], p2: ['c4'], p3: ['c5'] }[mode] || ['c1'];
  const page = document.getElementById('page');
  let html = '';
  for (const id of comps) {
    const c = COMPS.find((x) => x.id === id);
    const small = c.short < THRESH;
    html += '<div class="lbl">' + c.name + ' <small>short edge ' + c.short + ' u: ' + (small ? 'SMALL (centred top + bottom)' : 'LARGE (corners TL + BR, bigger dots)') + '</small></div><div class="row' + (id === 'c5' ? ' stack' : '') + '">' +
      VARS[id].map((v) => '<div class="col"><div class="cap">' + v[0] + '</div><div class="ucw ' + v[1] + '" data-c="' + id + '" style="' + (v[2] ? '--sk:' + v[2] + ';' : '') + '">' + samples[id]() + '</div></div>').join('') + '</div>';
  }
  page.innerHTML = html;
  const dsFor = { c1: 60, c2: 62, c3: 200, c4: 96, c5: 742 };
  document.querySelectorAll('.ucw').forEach((w) => {
    const id = w.dataset.c;
    if (!phone) { w.style.setProperty('--fl', '1.2px'); return; }
    w.style.setProperty('--gu', K + 'px');
    if (id === 'c1' || id === 'c3') {
      const sc = w.querySelector('.sc'); const wrap = document.createElement('div'); sc.parentNode.insertBefore(wrap, sc); wrap.appendChild(sc);
      sc.style.cssText = 'transform:scale(' + K + ');transform-origin:0 0;width:max-content;--bh-inv:' + (1 / K);
      w.style.setProperty('--fl', (1.2 / K) + 'px');
      requestAnimationFrame(() => { const r = sc.getBoundingClientRect(); wrap.style.cssText = 'width:' + r.width + 'px;height:' + r.height + 'px'; });
    } else {
      w.style.setProperty('--fl', '1.2px');
      requestAnimationFrame(() => {
        const host = w.querySelector(COMPS.find((x) => x.id === id).host);
        const r = host.getBoundingClientRect();
        w.style.setProperty('--ds', String(Math.min(1, Math.min(r.width, r.height) / dsFor[id])));
      });
    }
  });

  window.__uc = () => {
    const out = [];
    document.querySelectorAll('.ucw.nu').forEach((w) => {
      const id = w.dataset.c, c = COMPS.find((x) => x.id === id);
      const host = w.querySelector(c.host);
      const r = host.getBoundingClientRect();
      const cs = getComputedStyle(host, '::before');
      const holder = w.querySelector('.sc') || w;
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;height:1px;left:0;top:0';
      holder.appendChild(probe);
      probe.style.width = cs.getPropertyValue('--d').trim();
      const dPx = probe.getBoundingClientRect().width;
      probe.style.width = cs.getPropertyValue('--pt').trim();
      const ptPx = probe.getBoundingClientRect().width;
      probe.remove();
      const cluster = dPx + 2 * ptPx;
      out.push({ id: id, name: c.name, mode: w.classList.contains('m-c') ? 'center' : 'corner', sk: w.style.getPropertyValue('--sk'), boxW: +r.width.toFixed(1), boxH: +r.height.toFixed(1), dot: +dPx.toFixed(2), pitch: +ptPx.toFixed(2), cluster: +cluster.toFixed(2), dotRatio: +(dPx / Math.min(r.width, r.height)).toFixed(4), clusterRatio: +(cluster / r.width).toFixed(3), hostCenterX: +(r.left + r.width / 2).toFixed(2) });
    });
    return out;
  };
})();
