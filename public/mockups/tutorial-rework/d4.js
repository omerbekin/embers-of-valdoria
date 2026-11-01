'use strict';
(function () {
  const V = KIT.q.v || 'a', S = KIT.q.s || 'form', MAX = 24;
  const SUG = ['The Border Wardens', 'Ashen Banner', 'Ember Company', 'The Last Lanterns', 'Iron Hollow Watch', 'The Grey Wolves', 'Valdorian Vanguard'];
  const PRE = ['The', 'Iron', 'Ashen', 'Ember', 'Grey', 'Last'], NOUN = ['Wardens', 'Banner', 'Company', 'Lanterns', 'Vanguard', 'Blades'];
  const PARTY = [['warrior', 'Warrior', 'Leader', 88], ['archer', 'Archer', 'Ranged', 100], ['druid', 'Druid', 'Healer', 64]];
  const av = (k) => 'art/av/' + k + '.webp';
  const st = { name: SUG[1], si: 1, own: false, pre: 'Ashen', noun: 'Banner', custom: false };
  const stage = document.getElementById('stage');
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const label = () => (st.name.trim() || 'Your party');
  const party = () => PARTY.map((p) => `<div class="pc"><span class="pf"><img src="${av(p[0])}" alt=""></span><div><b>${p[1]}</b><span>${p[2]}</span></div></div>`).join('');
  const built = () => (st.pre === 'The' ? 'The ' + st.noun : st.pre + ' ' + st.noun);

  function nameBlock() {
    const field = `<div class="lbl">Company name</div><label class="fld"><input id="in" maxlength="${MAX}" value="${esc(st.name)}" placeholder="Your party" autocomplete="off" spellcheck="false"><span class="cnt">${st.name.length} / ${MAX}</span></label>`;
    const hint = '<div class="hint">Leave it empty to keep &ldquo;Your party&rdquo;.</div>';
    if (V === 'a') return `${field}<div class="lbl">Suggestions</div><div class="chips">${SUG.map((n) => `<button class="chipx ${n === st.name ? 'on' : ''}" data-sug="${esc(n)}">${n}</button>`).join('')}</div>${hint}`;
    if (V === 'b') return `<div class="lbl">${st.own ? 'Your own name' : 'Garrick suggests'}</div><div class="big">${esc(label())}</div><div class="row"><button class="btnx sec" data-act="again">Another name</button><button class="btnx sec" data-act="own">${st.own ? 'Use a suggestion' : 'Write my own'}</button></div>${st.own ? field : ''}${hint}`;
    return `<div class="cols"><div><div class="lbl">Start</div><div class="chips">${PRE.map((n) => `<button class="chipx ${!st.custom && n === st.pre ? 'on' : ''}" data-pre="${n}">${n}</button>`).join('')}</div></div><div><div class="lbl">Then</div><div class="chips">${NOUN.map((n) => `<button class="chipx ${!st.custom && n === st.noun ? 'on' : ''}" data-noun="${n}">${n}</button>`).join('')}</div></div></div><div class="big">${esc(label())}</div><div class="row"><button class="btnx sec" data-act="own">${st.custom ? 'Back to the lists' : 'Write my own'}</button></div>${st.custom ? field : ''}${hint}`;
  }
  const formView = () => `<div class="panelx win"><i class="cn tl"></i><i class="cn tr"></i><i class="cn bl"></i><i class="cn br"></i>
    <div class="ttl">Form your company</div><div class="sub">Name your company. The name shows on the map and in your saves.</div>
    <div class="body"><div class="nm" id="nm">${nameBlock()}</div><div class="pty"><div class="lbl">Your party</div>${party()}</div></div>
    <div class="foot"><button class="btnx sec">Back</button><button class="btnx" data-act="go">Begin the campaign</button></div></div>`;

  function head() {
    const n = esc(label()), c = PARTY.length;
    if (V === 'a') return `<div class="hA"><div class="kick" title="${n}">${n}</div><div class="rule"></div><div class="sm">Party &middot; ${c}</div></div>`;
    if (V === 'b') return `<div class="hB"><i class="cn tl"></i><i class="cn br"></i><div class="kick" title="${n}">${n}</div><div class="sm">${c} heroes under one banner</div></div>`;
    return `<div class="hC"><div class="tag">Your company</div><div class="kick" title="${n}">${n}</div><div class="rule"></div></div>`;
  }
  const mapView = () => `<div class="mp-left"></div><div class="mp-region">Border Road</div><div class="mp-col"><div class="mp-head">${head()}</div>
    <div class="mp-rows">${PARTY.map((p) => `<div class="mr"><span class="pf"><img src="${av(p[0])}" alt=""></span><div><b>${p[1]}</b><span>${p[2]}</span><i><u style="width:${p[3]}%"></u></i></div></div>`).join('')}</div></div>
    <div class="note">Mockup scene: Border Road art stands in for the node map. The left header is the subject.</div>`;

  const SAVES = [['Map 1 &middot; Border Road', 'Day 12', 'Party level 7', '2 days ago'], ['Map 2 &middot; Ravenwood', 'Day 31', 'Party level 14', 'Yesterday'], null];
  function savesView() {
    const rows = SAVES.map((s, i) => {
      const slot = `<div class="slot">Slot ${i + 1}</div>`;
      if (!s) return V === 'c' ? `<div class="panelx lrow"><i class="cn tl"></i><i class="cn br"></i><div class="t">${slot}<div class="meta">Empty</div></div></div>` : `<div class="panelx card empty"><i class="cn tl"></i><i class="cn br"></i>${slot}<div class="meta">Empty</div></div>`;
      const nm = i === 0 ? label() : '', fb = nm === '' || nm === 'Your party';
      const title = `<h3 class="${fb ? 'fb' : ''}">${esc(nm || 'Your party')}</h3>`;
      const avs = `<div class="av3">${PARTY.map((p) => `<span class="pf"><img src="${av(p[0])}" alt=""></span>`).join('')}</div>`;
      const meta = `<div class="meta">${s[0]}</div><div class="meta"><em>${s[1]} &middot; ${s[2]}</em></div><div class="meta"><em>Last played ${s[3]}</em></div>`;
      if (V === 'a') return `<div class="panelx card"><i class="cn tl"></i><i class="cn br"></i>${slot}${title}${meta}<button class="btnx go">Continue</button></div>`;
      if (V === 'b') return `<div class="panelx card"><i class="cn tl"></i><i class="cn br"></i>${slot}${avs}${title}${meta}<button class="btnx go">Continue</button></div>`;
      return `<div class="panelx lrow"><i class="cn tl"></i><i class="cn br"></i><span class="pf"><img src="${av('warrior')}" alt=""></span><div class="t">${slot}${title}<div class="meta">${s[0]} &middot; ${s[1]} &middot; ${s[2]} &middot; ${s[3]}</div></div><button class="btnx">Continue</button></div>`;
    });
    return `<div class="sv-t"><div class="ttl">Saved campaigns</div></div><div class="sv-wrap ${V === 'c' ? 'list' : ''}">${rows.join('')}</div>`;
  }

  function draw() {
    stage.style.setProperty('--W', KIT.W + 'px');
    stage.innerHTML = S === 'map' ? mapView() : S === 'saves' ? savesView() : formView();
  }
  function redraw() { const a = document.activeElement, id = a && a.id, pos = a && a.selectionStart; draw(); const e = id && document.getElementById(id); if (e) { e.focus(); try { e.setSelectionRange(pos, pos); } catch (x) { /* yok say */ } } }
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.sug) st.name = d.sug;
    else if (d.pre) { st.pre = d.pre; st.custom = false; st.name = built(); }
    else if (d.noun) { st.noun = d.noun; st.custom = false; st.name = built(); }
    else if (d.act === 'again') { st.si = (st.si + 1) % SUG.length; st.name = SUG[st.si]; st.own = false; }
    else if (d.act === 'own') { if (V === 'b') { st.own = !st.own; if (!st.own) st.name = SUG[st.si]; } else { st.custom = !st.custom; if (!st.custom) st.name = built(); } }
    else return;
    redraw();
  });
  stage.addEventListener('input', (e) => {
    if (e.target.id !== 'in') return; st.name = e.target.value.slice(0, MAX);
    const c = stage.querySelector('.cnt'); if (c) c.textContent = st.name.length + ' / ' + MAX;
    stage.querySelectorAll('.chipx[data-sug]').forEach((x) => x.classList.toggle('on', x.dataset.sug === st.name));
    const bg = stage.querySelector('.big'); if (bg) bg.textContent = label();
  });
  KIT.start(() => draw());
})();
