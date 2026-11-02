/* Skill tip mockup round 2 (not game code). Three wording rules applied to the REAL generated lines of describeSkill (data.js).
   A = merge equal values, one line per effect.  B = columns (label | who | number | turns).  C = merge everything equal, numbers only.
   In the game the same split would be made inside describeSkill, where each effect type already knows its parts; the parsing here only proves the rule. */
(function () {
  'use strict';
  var D = window.ST_DATA, TR = window.TipRules;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SIZES = { '169': { w: 1920, h: 1080, hs: 1, label: '16:9' }, '219': { w: 2580, h: 1080, hs: 1, label: '21:9' }, ph: { w: 844, h: 390, hs: 390 / 1080, label: 'Phone' } };
  var SKEY = ['judgment', 'double', 'charge', 'brand'];
  var VKEY = ['now', 'a', 'b', 'c'];
  var VNAME = { now: 'Now', a: 'A', b: 'B', c: 'C' };
  var NOTE = {
    now: 'Bugün: oyunun kendi metni, Judgment 7 satır.',
    a: 'A (önerilen): eşit değerler tek satırda (Damage / Heal), her zemin ve durum "ad, süre, sayı" tek satır; cümleler ve kurallar More altında.',
    b: 'B: sütunlu tablo (ad | kim | sayı | süre), tekrar eden kelime sütun başlığına gider; kısa durum açıklaması ve tek kısa koşul satırı kalır.',
    c: 'C: en sıkı: eşit olan HER ŞEY birleşir (zeminler dahil), tipte yalnız sayı; taraf (enemies/allies) ve cümleler More altında.'
  };
  var RULE = {
    a: 'Rule A: lines with the same value merge (labels joined by " / ", who joined by " / "). Every status / ground / damage-over-time = name, side, turns, one number. Sentences, cast rules, reactions: More.',
    b: 'Rule B: same facts as A in four aligned columns; no repeated words ("Leaves", "for", "per turn" becomes /turn). Keeps a status clause up to 30 characters, one cast rule up to 90, numeric rules up to 70.',
    c: 'Rule C: merge every line whose number and turns are equal (grounds too); lingering effects are packed behind the hit line when short; who/side is dropped from the tip and kept in More.'
  };
  var S = { z: '169', v: 'a', s: 0, o: false };
  var I = 'skill-tips-2/i/';

  /* ---------- hash ---------- */
  function readHash() {
    S = { z: '169', v: 'a', s: 0, o: false };
    location.hash.slice(1).split('&').forEach(function (p) {
      if (!p) return;
      var kv = p.split('='), k = kv[0], v = kv[1];
      if (VKEY.indexOf(k) >= 0) S.v = k;
      else if (k === 'o') S.o = v !== '0';
      else if (k === 'z' && SIZES[v]) S.z = v;
      else if (k === 's') { var i = SKEY.indexOf(v); if (i >= 0) S.s = i; }
    });
  }
  function hashOf(o) { return '#' + o.v + '&s=' + SKEY[o.s] + '&z=' + o.z + (o.o ? '&o=1' : ''); }
  function go(patch) { var o = {}; for (var k in S) o[k] = S[k]; for (k in patch) o[k] = patch[k]; if (location.hash === hashOf(o)) { S = o; render(); } else location.hash = hashOf(o); }

  /* ---------- source rows with their colours, from the real generated tip ---------- */
  function srcRows(sm) {
    if (sm._rows) return sm._rows;
    var t = document.createElement('template'); t.innerHTML = sm.html.now.split('skill-tips/').join('skill-tips-2/');
    var lns = t.content.querySelectorAll('.bt-ln');
    sm._head = sm.html.now.split('skill-tips/').join('skill-tips-2/').split('<div class="bt-body">')[0] + '<div class="bt-body">';
    sm._rows = sm.now.map(function (txt, i) {
      var tx = lns[i] && lns[i].querySelector('.tx'), k = null, whole = false;
      if (tx) {
        var ke = tx.querySelector('.k'), fc = tx.firstElementChild;
        if (ke && ke.style.color) k = ke.style.color;
        else if (fc && fc.tagName === 'SPAN' && fc.style.color && fc.textContent === tx.textContent) { k = fc.style.color; whole = true; }
      }
      return { t: txt, k: k, whole: whole, html: lns[i] ? lns[i].outerHTML : '', hint: /^Ground reactions: /.test(txt) };
    });
    return sm._rows;
  }

  /* ---------- tiny html helpers ---------- */
  function nz(s) { return esc(s).replace(/(x?\d+%?)/g, '<span class="n">$1</span>'); }
  function kk(text, col) { return '<span class="k"' + (col ? ' style="color:' + col + '"' : '') + '>' + esc(text) + '</span>'; }
  function dim(text) { return '<span class="sd">' + esc(text) + '</span>'; }
  var SEP = ' <span class="sd">&middot;</span> ';
  function ln(inner) { return '<div class="bt-ln"><span class="dia"></span><div class="tx">' + inner + '</div></div>'; }
  function turnsWord(n) { return n + (n === 1 ? ' turn' : ' turns'); }

  /* ---------- model: split the generated lines into parts ---------- */
  var VAL = /(\d+% [A-Z]+ \(\d+\)(?: x\d+)?)/;
  var PERTURN = /start of (each|every)|each of (its|their) turns|every turn/;
  function model(sm) {
    var rows = srcRows(sm), m = { eff: [], per: [], mods: [], first: null, rest: [], reacts: [], rows: rows };
    rows.forEach(function (r) {
      if (r.hint) { m.reacts.push(r); return; }
      var p = TR.parse({ t: r.t, k: r.k }), x;
      if (p.type === 'effect' && (x = /^(Damage|Heal|Magic shield|Shield|Heals you)\s+(\d+% [A-Z]+ \(\d+\)(?: x\d+)?)(.*)$/.exec(r.t))) {
        var rest = x[3], who = '', w = /\(on (?:the )?(?:enemy|your) side: (enemies|allies)\)/.exec(rest);
        if (w) { who = w[1]; rest = rest.replace(w[0], ''); }
        if (rest.trim()) { m.rest.push(r); return; }
        m.eff.push({ label: x[1], val: x[2], who: who, k: r.k, row: r });
      } else if (p.type === 'status' || p.type === 'ground' || p.type === 'dot') {
        var nm = VAL.exec(p.clause || ''), per = nm ? nm[1] + (PERTURN.test(p.clause) ? ' per turn' : '') : '';
        var verbNote = p.type === 'status' && p.verb === 'You gain' ? 'you' : '';
        m.per.push({ type: p.type, name: p.name, side: p.side || verbNote, turns: p.turns, val: nm ? nm[1] : '', perTurn: !!(nm && PERTURN.test(p.clause)), clause: p.clause || '', k: r.k, row: r, plainClause: p.type === 'status' && !nm });
      } else if (p.type === 'other' && /\d/.test(r.t) && r.t.length <= 70) m.mods.push({ r: r, len: r.t.length });
      else if (p.type === 'cond' && !m.cond && r.t.length <= 90) m.cond = r;
      else m.rest.push(r);
    });
    return m;
  }

  function firstRow(m) { var s = m.rest.concat(m.cond ? [m.cond] : [], m.mods.map(function (x) { return x.r; })); s.sort(function (a, b) { return m.rows.indexOf(a) - m.rows.indexOf(b); }); return s[0]; }

  /* ---------- tier 2 = the complete original text (reaction lines merged into one) ---------- */
  function fullBody(sm) {
    var rows = srcRows(sm), out = '', reacts = [];
    rows.forEach(function (r) { if (r.hint) reacts.push(r); else out += r.html; });
    var mr = TR.mergeReactions(reacts.map(function (r) { return { t: r.t }; }));
    if (mr) out += ln('<span class="k">Ground reactions</span> ' + esc(mr.t.replace(/^Ground reactions: /, '')));
    return out;
  }

  /* ---------- rule A ---------- */
  function mergeEff(eff, keepWho) {
    var by = {}, order = [];
    eff.forEach(function (e) { if (!by[e.val]) { by[e.val] = { labels: [], whos: [], val: e.val, k: e.k }; order.push(e.val); } by[e.val].labels.push(e.label); if (e.who) by[e.val].whos.push(e.who); });
    return order.map(function (v) { return by[v]; });
  }
  function perLine(p, form) {
    var num = p.val ? p.val + (p.perTurn ? (form === 'b' ? '/turn' : ' per turn') : '') : '';
    return num;
  }
  function ruleA(sm, m) {
    var lines = [], more = false;
    mergeEff(m.eff).forEach(function (g) {
      var inner = kk(g.labels.join(' / '), g.k) + ' ' + nz(g.val) + (g.whos.length ? SEP + dim(g.whos.join(' / ')) : '');
      lines.push(ln(inner)); if (g.whos.length) more = true;
    });
    m.per.forEach(function (p) {
      var inner = kk(p.name, p.k) + (p.side ? ' ' + dim('(' + p.side + ')') : '') + SEP + nz(turnsWord(p.turns)) + (p.val ? SEP + nz(perLine(p, 'a')) : '');
      lines.push(ln(inner)); if (p.clause) more = true;
    });
    m.mods.filter(function (x) { return x.len <= 60; }).forEach(function (x) { lines.push(x.r.html); });
    if (m.mods.some(function (x) { return x.len > 60; }) || m.cond || m.rest.length || m.reacts.length) more = true;
    if (!lines.length && (m.cond || m.rest.length || m.mods.length)) { lines.push(firstRow(m).html); }
    if (m.reacts.length || m.rest.length > 1 || m.cond) more = true;
    return { body: lines.slice(0, 4).join(''), more: more || lines.length > 4 };
  }

  /* ---------- rule B: aligned columns ---------- */
  function cell(cls, inner) { return '<span class="' + cls + '">' + inner + '</span>'; }
  function gridRow(c1, c2, c3, c4) { return '<span class="g-dia"><span class="dia"></span></span>' + cell('g-k', c1) + cell('g-w', c2) + cell('g-v', c3) + cell('g-t', c4); }
  function ruleB(sm, m) {
    var g = '', more = false, extra = '';
    mergeEff(m.eff).forEach(function (e) {
      g += gridRow(kk(e.labels.join(' / '), e.k), e.whos.length ? dim(e.whos.join(' / ')) : '', nz(e.val), ''); if (e.whos.length) more = true;
    });
    m.per.forEach(function (p) {
      var shortClause = p.plainClause && p.clause && p.clause.length <= 30;
      var v = p.val ? nz(perLine(p, 'b')) : (shortClause ? esc(p.clause) : '');
      g += gridRow(kk(p.name, p.k), p.side ? dim(p.side) : '', v, nz(turnsWord(p.turns)));
      if (p.clause && !shortClause) more = true;
    });
    var single = [];
    if (m.cond) single.push(m.cond.html);
    m.mods.forEach(function (x) { single.push(x.r.html); });
    if (!g && !single.length && m.rest.length) single.push(firstRow(m).html);
    if (m.rest.length > (g || single.length > 0 && !m.cond && !m.mods.length ? 0 : 1) || m.reacts.length) more = true;
    if (m.rest.length && (g || m.cond || m.mods.length)) more = true;
    var body = (g ? '<div class="s2-g">' + g + '</div>' : '') + single.slice(0, 3).join('');
    if (!body) more = true;
    return { body: body, more: more || m.mods.length > 2 };
  }

  /* ---------- rule C: merge everything equal, numbers only ---------- */
  function ruleC(sm, m) {
    var more = false, effLine = [], perBy = {}, perOrder = [];
    mergeEff(m.eff).forEach(function (e) { effLine.push(kk(e.labels.join(' / '), e.k) + ' ' + nz(e.val)); if (e.whos.length) more = true; });
    m.per.forEach(function (p) {
      var key = p.val + '|' + p.perTurn + '|' + p.turns + '|' + (p.val ? '' : p.name);
      if (!perBy[key]) { perBy[key] = { names: [], p: p, k: p.k }; perOrder.push(key); }
      perBy[key].names.push(p.name);
      if (p.side || p.clause) more = true;
    });
    var perSeg = perOrder.map(function (key) { var b = perBy[key], p = b.p; return { html: kk(b.names.join(' / '), b.k) + ' ' + nz(turnsWord(p.turns)) + (p.val ? SEP + nz(perLine(p, 'a')) : ''), len: (b.names.join(' / ') + ' ' + turnsWord(p.turns) + (p.val ? ' ' + perLine(p, 'a') : '')).length }; });
    var lines = [];
    var effLen = effLine.join('').replace(/<[^>]+>/g, '').length + 14;
    if (effLine.length) {
      var head = effLine.join(SEP), len = head.replace(/<[^>]+>/g, '').length;
      // pack short lingering effects behind the hit line
      while (perSeg.length && len + perSeg[0].len + 3 <= 52) { head += SEP + perSeg[0].html; len += perSeg[0].len + 3; perSeg.shift(); }
      lines.push(ln(head));
    }
    perSeg.forEach(function (s) { lines.push(ln(s.html)); });
    if (m.cond || m.mods.length || m.rest.length || m.reacts.length) more = true;
    if (!lines.length && (m.rest.length || m.cond || m.mods.length)) { lines.push(firstRow(m).html); }
    return { body: lines.join(''), more: more };
  }

  /* ---------- assemble a whole tip ---------- */
  var RULEFN = { a: ruleA, b: ruleB, c: ruleC };
  function tipHtml(si, v, open) {
    var sm = D.samples[si];
    srcRows(sm);
    if (v === 'now') return sm._head + sm._rows.map(function (r) { return r.html; }).join('') + '</div></div>';
    var m = model(sm), r = RULEFN[v](sm, m);
    var body = open ? fullBody(sm) : r.body;
    var btn = (r.more || open) ? '<div class="st-more-row"><button class="st-more" type="button" data-more="1"><span class="dia"></span>' + (open ? 'Less' : 'More') + '</button></div>' : '';
    return sm._head + body + '</div>' + btn + '</div>';
  }

  /* ---------- bottom bar + scene (same plates as the first round) ---------- */
  function chipHtml(cls, icon, word, num) { return '<span class="bp-chip ' + cls + '"><img class="bh-ico" src="' + icon + '" alt="">' + (word ? '<span class="w">' + word + '</span>' : '') + '<b>' + num + '</b></span>'; }
  function plateHtml(p, key, tipInner, hot) {
    var chips = '';
    if (p.free) chips += '<span class="bp-chip free">Free</span>';
    if (p.mp) chips += chipHtml('', I + 'mp.webp', '', p.mp);
    if (p.rage) chips += chipHtml('rage', I + 'rage.webp', 'RAGE', (/(\d+)/.exec(p.rage) || [0, '30'])[1]);
    if (p.cd) chips += chipHtml('cd', I + 'cooldown.webp', '', p.cd);
    var tag = p.ult ? '<span class="bp-tag"><span class="full">Ultimate</span><span class="short">Ult</span></span>' : '';
    return '<div class="bp ' + (p.ult ? 'ult' : '') + (hot ? ' tip' : '') + '" data-skill="' + p.id + '">' + tag + '<span class="bp-key">' + key + '</span><div class="bp-ico"><img class="bh-ico" src="' + I + 'sk-' + p.icon + '.webp" alt=""></div><span class="bp-nm">' + esc(p.name) + '</span><div class="bp-chips">' + chips + '</div>' +
      '<div class="bh-sktip bh-panel bh-corners" data-tipbox="1">' + (hot ? tipInner : '') + '</div></div>';
  }
  function sceneHtml(si, v, open) {
    var sm = D.samples[si], cls = D.classes[sm.cls], z = SIZES[S.z], phone = S.z === 'ph';
    var viewW = z.w / z.hs, PW = phone ? 146 : 132, PG = 8;
    var sx0 = viewW / 2 - (4 * PW + 3 * PG) / 2, SKW = 4 * PW + 3 * PG;
    var tip = tipHtml(si, v, open);
    var plates = cls.plates.map(function (p, i) { return plateHtml(p, i + 1, tip, i === sm.slot); }).join('');
    var pas = '<div class="bp pas"><span class="bp-tag"><span class="full">Passive</span><span class="short">Pas</span></span><div class="bp-ico"><img class="bh-ico" src="' + I + 'sk-' + cls.passive.icon + '.webp" alt=""></div><span class="bp-nm">' + esc(cls.passive.name) + '</span><div class="bp-chips"></div></div>';
    var gx = sx0 + SKW + (phone ? 12 : 22);
    var glob = '<div class="sf-glob" style="left:' + gx + 'px"><div>Rest</div><div>Skip</div><div><img src="' + I + 'move.webp" alt="">Move</div></div>';
    var actor = '<div class="sf-actor" style="left:' + (phone ? 20 : 28) + 'px"><img src="' + I + 'av-' + sm.cls + '.webp" alt=""><span>' + esc(cls.name) + '</span></div>';
    return '<div class="sf" id="sf"><div class="sf-in" id="sfin" style="width:' + z.w + 'px;height:' + z.h + 'px"><div class="sf-bg"></div>' +
      '<div class="bh-root" style="width:' + viewW + 'px;height:1080px;transform:scale(' + z.hs + ');--bh-inv:' + (1 / z.hs) + '"><div class="bh-band"></div>' + actor + '<div class="bh-pasv" style="left:' + (sx0 - (PW + PG)) + 'px;width:' + PW + 'px">' + pas + '</div><div class="bh-skills" style="left:' + sx0 + 'px">' + plates + '</div>' + glob + '</div></div></div>';
  }

  /* ---------- fit the scene into what is left under the bar ---------- */
  function fit() {
    var bar = $('#s2-bar'), st = $('#stage'), sf = $('#sf'), inn = $('#sfin'); if (!sf) return;
    var z = SIZES[S.z], aw = document.documentElement.clientWidth, ah = Math.max(120, window.innerHeight - bar.offsetHeight);
    var k = Math.min(aw / z.w, ah / z.h);
    st.style.height = ah + 'px';
    sf.style.width = (z.w * k) + 'px'; sf.style.height = (z.h * k) + 'px';
    inn.style.transform = 'scale(' + k + ')';
    var tip = $('.bh-sktip .bt', sf), lab = $('#s2-share');
    if (tip && lab) {
      var a = inn.getBoundingClientRect(), r = tip.getBoundingClientRect();
      var w = r.width / k, h = r.height / k, share = w * h / (z.w * z.h) * 100;
      lab.textContent = 'Tip covers ' + share.toFixed(1) + '% of the screen (' + Math.round(h / z.h * 100) + '% of its height), scene at ' + Math.round(k * 100) + '% of design size';
    }
  }

  /* ---------- coverage measurement for the report: window.__measure() ---------- */
  function measure() {
    var out = [], root = document.documentElement, was = root.classList.contains('short');
    var host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-20000px;top:0;visibility:hidden;width:3000px;height:1200px';
    document.body.appendChild(host);
    ['169', '219', 'ph'].forEach(function (zk) {
      var z = SIZES[zk]; root.classList.toggle('short', zk === 'ph');
      host.innerHTML = '<div class="bh-root" style="position:absolute;left:0;top:0;width:' + (z.w / z.hs) + 'px;height:1080px;transform:scale(' + z.hs + ');transform-origin:0 0;--bh-inv:' + (1 / z.hs) + '"><div class="bh-kit" id="mz" style="position:absolute;left:0;top:0"></div></div>';
      var box = $('#mz', host);
      D.samples.forEach(function (sm, si) {
        VKEY.forEach(function (v) {
          [false, true].forEach(function (open) {
            if (open && v !== 'a') return;
            box.innerHTML = '<div class="bh-sktip">' + tipHtml(si, v, open) + '</div>';
            var t = $('.bt', box), r = t.getBoundingClientRect(), w = r.width / z.hs, h = r.height / z.hs;
            out.push({ z: zk, skill: sm.label, v: v + (open ? '-open' : ''), w: Math.round(w), h: Math.round(h), share: +(w * h / ((z.w / z.hs) * 1080) * 100).toFixed(2), lines: box.querySelectorAll('.bt-body > .bt-ln, .bt-body .s2-g > .g-k').length });
          });
        });
      });
    });
    root.classList.toggle('short', was); host.remove();
    return out;
  }
  window.__measure = measure;

  /* ---------- page ---------- */
  function bar() {
    var b = '<div class="row">' +
      VKEY.map(function (k) { return '<a class="btn' + (S.v === k ? ' on' : '') + '" href="' + hashOf({ v: k, s: S.s, z: S.z, o: S.o }) + '">' + VNAME[k] + (k === 'a' ? ' *' : '') + '</a>'; }).join('') + '<span class="gap"></span>' +
      D.samples.map(function (s, i) { return '<a class="btn' + (S.s === i ? ' on' : '') + '" href="' + hashOf({ v: S.v, s: i, z: S.z, o: S.o }) + '">' + esc(s.label) + '</a>'; }).join('') + '<span class="gap"></span>' +
      ['169', '219', 'ph'].map(function (k) { return '<a class="btn' + (S.z === k ? ' on' : '') + '" href="' + hashOf({ v: S.v, s: S.s, z: k, o: S.o }) + '">' + SIZES[k].label + '</a>'; }).join('') + '<span class="gap"></span>' +
      '<a class="btn' + (S.o ? ' on' : '') + '" href="' + hashOf({ v: S.v, s: S.s, z: S.z, o: !S.o }) + '">Open all text</a></div>' +
      '<div class="note">' + esc(NOTE[S.v]) + ' <span id="s2-share"></span> <details><summary>Notlar</summary>' +
      VKEY.map(function (k) { return '<p><b>' + VNAME[k] + '</b> ' + esc(NOTE[k]) + (RULE[k] ? '<br><span class="en">' + esc(RULE[k]) + '</span>' : '') + '</p>'; }).join('') + '</details></div>';
    $('#s2-bar').innerHTML = b;
  }
  function render() {
    document.documentElement.classList.toggle('short', S.z === 'ph');
    bar();
    $('#stage').innerHTML = sceneHtml(S.s, S.v, S.o);
    fit();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.st-more'); if (!t) return;
    go({ o: !S.o });
  });
  window.addEventListener('hashchange', function () { readHash(); render(); });
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(fit, 60); });
  readHash(); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  window.addEventListener('load', fit);
})();
