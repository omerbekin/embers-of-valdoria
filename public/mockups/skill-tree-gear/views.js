/* SKILL AGACI Gear taslagi: GORUNUM KATMANI (mockup, oyun kodu DEGIL). Saf metin (HTML) ureticileri; DOM'a dokunmaz, durumu ST'den okur.
   Kurallar: data/core.js (SMM) + data/tree-logic.js (GT). Yerlesim: data/tree-layout.js (GL). Icerik: data/content.js + classes.js + final.js + mix-warrior.js.
   Tarayicida window.GV; Node'da vm ile (tests: scratchpad). Oyun metinleri Ingilizce. */
(function (root, f) { root.GV = f(root); })(this, function (root) {
  'use strict';
  const MC = root.SMM, GT = root.GT, GL = root.GL, CT = root.SMM_CONTENT;
  const A = 'skill-tree-gear/';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = (c) => String(c).replace(/[;"<>]/g, '');
  const ULT = MC.ULT, NROWS = 4;

  /* ---------- icerik: Omer'in Warrior secimi (final.js rows b b a a b) ---------- */
  const CLS = root.SMM_CLASSES.find((c) => c.id === 'warrior');
  const CN = CT.fromSelection(null, root.SMM_MIX.warrior, root.SMM_FINAL.warrior);
  const ROWS = CLS.rows.map((r, i) => ({ ic: r.ic, name: r.name, d: r.d, pas: i === 0, ult: i === ULT }));
  const KN = { F: 'Filler', E: 'Edge', N: 'Notable', B: 'Blood Price', V: 'Evolve' };
  /* mock veri: motorda henuz calismayan (Not active yet) dugumler / bonus. Gercek liste motor ekibinden gelecek. */
  const INERT = { '0.mb': 1, '2.eb': 1, '3.v': 1, '4.l1': 1, 'bar:3': 1 };
  const nodeInfo = (key) => CN.nodes[key] || { name: key, eff: '(content missing)', nw: false };
  MC.setNamer((k) => nodeInfo(k).name);
  GT.setApproved(() => true); /* Omer 2026-10-22: tum NEW dugumler (Undying Rage dahil) onayli; 'Awaiting approval' durumu bu taslakta gosterilmez */
  const ic = (i) => A + ROWS[i].ic;

  /* ---------- durum (app.js ayni nesneyi kullanir) ---------- */
  function demoState() {
    return {
      S: { r: { '0.f1': 3, '0.f2': 2, '1.f1': 3, '1.f2': 3, '1.f3': 2, '1.n0': 1, '1.r': 1, '1.ea': 1, '1.ma': 1, '2.f1': 3, '2.f2': 3, '2.f3': 1, '2.n0': 1, '4.u1': 1 } },
      P: { '2.f3': 1, '3.f1': 1 },
    };
  }
  const D0 = demoState();
  const ST = { variant: 'v1', tab: 'sheet', lv: 30, S: D0.S, P: D0.P, gold: 1480, open: false, phone: '', nw: false, short: false, coarse: false, touch: false, fail: null };
  const eff = () => GT.merge(ST.S, ST.P);
  const freePts = () => MC.pool(ST.lv) - MC.spent(ST.S) - GT.pendingCount(ST.P);
  const reset = () => { const d = demoState(); ST.S = d.S; ST.P = d.P; ST.gold = 1480; ST.fail = null; if (GT.validate(ST.lv, eff())) GT.fitLevel(ST.lv, ST.S, ST.P); };

  /* ---------- A Band ipucu: band-tip.ts / band-rich.ts'in JS karsiligi (ayni sinif seti: css/band-tip.css) ---------- */
  const DIFF = /(\([+\-−]\d+(?:\.\d+)?%?\))/;
  const NUM = /((?<![A-Za-z0-9])[+\-−]?\d+(?:\.\d+)?(?:%|x\d*)?|(?<![A-Za-z])x\d+(?:\.\d+)?)/;
  function splitLabel(line) {
    const colon = /^([^:\d()]{2,30}?):\s+(.*)$/.exec(line);
    if (colon && colon[1].split(' ').length <= 4) return { label: colon[1], rest: ' ' + colon[2] };
    const num = /^([A-Z][A-Za-z']+(?: [A-Z][A-Za-z']+)?)(?=\s+[+\-−]?\d)(.*)$/.exec(line);
    return num ? { label: num[1], rest: num[2] } : null;
  }
  function richSegs(line, keyword) {
    const out = []; let body = line;
    const numberSegs = (text) => { for (const part of text.split(NUM)) { if (!part) continue; const m = part.match(NUM); out.push(m && m[0] === part ? { text: part, kind: 'n' } : { text: part }); } };
    if (keyword) { const l = splitLabel(line); if (l) { out.push({ text: l.label, kind: 'k' }); body = l.rest; } }
    for (const piece of body.split(DIFF)) { if (!piece) continue; if (DIFF.test(piece)) out.push({ text: piece, kind: /^\(\+/.test(piece) ? 'up' : 'down' }); else numberSegs(piece); }
    return out;
  }
  function richHtml(text, keyword) {
    return richSegs(text, keyword !== false).map((s) => { const t = esc(s.text); return s.kind ? `<span class="${s.kind === 'n' ? 'n' : s.kind}">${t}</span>` : t; }).join('');
  }
  /* spec: { accent, kind, title, icon, value, valueLabel, chips:[{text,tone,num}], lines:[string | {html}], foot:{text,cls}, ctl:html } */
  function bt(s) {
    const medal = s.icon ? `<span class="bt-medal ico frm" style="background-image:url(&quot;${esc(s.icon)}&quot;)"></span>` : '';
    const aside = s.value !== undefined ? `<div class="bt-aside"><div class="bt-big">${esc(s.value)}${s.valueLabel ? `<small>${esc(s.valueLabel)}</small>` : ''}</div></div>` : '';
    const head = `<div class="bt-head">${medal}<div class="bt-ht">${s.kind ? `<div class="bt-kind">${esc(s.kind)}</div>` : ''}<div class="bt-title">${esc(s.title)}</div></div>${aside}</div>`;
    const chips = s.chips && s.chips.length ? `<div class="bt-meta">${s.chips.map((c) => `<span class="bt-chip${c.tone ? ' ' + c.tone : ''}">${c.num ? `<span class="n">${esc(c.num)}</span> ` : ''}${esc(c.text)}</span>`).join('')}</div>` : '';
    const lines = (s.lines || []).map((l) => `<div class="bt-ln"><span class="dia"></span><div class="tx">${typeof l === 'string' ? richHtml(l) : l.html}</div></div>`).join('');
    const body = lines ? `<div class="bt-div"></div><div class="bt-body">${lines}</div>` : '';
    const foot = s.foot ? `<div class="bt-foot${s.foot.cls ? ' ' + s.foot.cls : ''}"><span class="dia"></span><span class="tx">${esc(s.foot.text)}</span></div>` : '';
    return `<div class="bt"${s.accent ? ` style="--ac:${css(s.accent)}"` : ''}>${head}${chips}${body}${foot}${s.ctl || ''}</div>`;
  }
  const kw = (label, text) => ({ html: `<span class="k">${esc(label)}</span> ${text}` });

  /* ---------- ipuclari ---------- */
  function lockInfo(nd, E, lv) {
    if (nd.arm) { const need = MC.ultLv(nd); return { tier: 'Ult · ' + MC.ARM_NAME[nd.arm] + ' arm', lock: 'Lv ' + need, open: lv >= need }; }
    if (nd.kind === 'V') {
      if (MC.rk(E, nd.key) > 0) return { tier: 'Evolve', lock: 'Taken', open: true };
      const es = MC.evoState(E);
      return es.capped ? { tier: 'Evolve', lock: '2 / 2 used', open: false } : { tier: es.label, lock: es.need + ' pts', open: es.open };
    }
    const need = MC.TIER_NEED[nd.tier];
    return { tier: 'Tier ' + nd.tier, lock: need ? need + ' pts' : 'Open', open: MC.counter(E) >= need };
  }
  /* o = { fail: {key,msg}|null, touch: bool } */
  function nodeTip(key, o) {
    o = o || {};
    const nd = MC.BY[key], info = nodeInfo(key), E = eff(), lv = ST.lv, st = GT.status(lv, E, key), rr = ROWS[nd.i], k = nd.kind;
    const pend = ST.P[key] || 0, committed = st.rank - pend;
    const accent = k === 'V' ? '#f3d999' : k === 'B' ? '#c63b3b' : nd.arm ? '#e0702a' : rr.pas ? '#6fb0a8' : undefined;
    const li = lockInfo(nd, E, lv), chips = [{ text: KN[k], tone: 'ac' }];
    if (nd.max > 1) chips.push({ text: 'Rank ' + st.rank + ' / ' + nd.max });
    chips.push(committed > 0 ? { text: 'Taken', tone: 'ok' } : pend > 0 ? { text: 'Pending', tone: 'v' } : { text: 'Not taken' });
    chips.push({ text: li.tier }, { text: li.lock, tone: li.open ? 'ok' : '' });
    if (INERT[key]) chips.push({ text: 'Not active yet', tone: 'warn' });
    if (st.st === 'dir') chips.push({ text: st.check && st.check.code === 'ultarm' ? 'Other ult path chosen' : 'Other direction chosen', tone: 'warn' });
    const lines = [info.eff];
    if (nd.req.length) {
      const terms = nd.req.map((term) => term.map((q) => { const met = MC.rk(E, q) > 0; return (met ? '' : '<span class="no">') + esc(nodeInfo(q).name) + (met ? '' : '</span>'); }).join(' or ')).join(' + ');
      lines.push(kw('Needs:', terms));
    }
    if (k === 'V') lines.push(kw('Evolves in place:', 'the skill keeps its slot and gains this behaviour. Evolve I needs 23 points in the passive and skill rows, Evolve II needs 38 (ult points do not count); two per hero at most.'));
    if (k === 'B') lines.push(kw('Blood Price:', 'a gain with a cost. Dead end: nothing unlocks after it.'));
    if (nd.arm) lines.push(kw('One ult path:', 'a point in any node of an arm closes the other three arms. A pending point can be taken back to choose again; only a respec changes a confirmed arm. ' + MC.ULT_MAX + ' points at most (' + MC.ultSpent(E) + ' / ' + MC.ULT_MAX + ' spent). Locked by level, not by points.'));
    if (GT.DIR[nd.id] && !nd.arm) lines.push(kw('One direction:', 'each skill follows one side (Edge, Notable and Blood Price). Taking this side locks the other; only a respec changes a confirmed choice.'));
    if (INERT[key]) lines.push(kw('Not active yet:', 'you can take it, but the battle engine does not apply it yet.'));
    const fl = o.fail && o.fail.key === key ? o.fail.msg : null;
    let foot;
    if (fl) foot = { text: fl, cls: 'bad' };
    else if (st.rank === 0 && st.check && st.check.code === 'points') foot = { text: 'No points left' };
    else if (st.rank === 0 && st.check) foot = { text: (['ultcap', 'ultarm', 'direction'].indexOf(st.check.code) >= 0 ? '' : 'Locked: ') + st.check.text, cls: 'lock' };
    else if (pend > 0) foot = { text: o.touch ? 'Pending +' + pend + ': Confirm keeps it, − takes it back' : 'Pending +' + pend + ': Confirm keeps it, right-click takes it back', cls: 'pend' };
    else if (committed > 0) foot = { text: 'Confirmed: only a respec takes it back' };
    else foot = { text: o.touch ? 'Tap again to add 1 pending point' : 'Click to add 1 pending point' };
    const canAdd = !GT.check(lv, E, key), canSub = pend > 0;
    const ctl = `<div class="gt-ctl"><button type="button" data-act="-1" aria-label="Take back a pending point"${canSub ? '' : ' disabled'}>−</button><span class="rk">${st.rank} / ${nd.max}</span><button type="button" data-act="1" aria-label="Add a pending point"${canAdd ? '' : ' disabled'}>+</button></div>`;
    return bt({ accent, kind: nd.arm ? 'Ult ' + KN[k] + ' · ' + rr.name : KN[k] + ' · ' + rr.name, title: info.name, icon: ic(nd.i), value: '1', valueLabel: nd.max > 1 ? 'POINT / RANK' : 'POINT', chips, lines, foot, ctl });
  }
  /* full: v3 Tree sekmesindeki plaka ipucu (oyundaki skill ipucu gibi: aciklama + bedel / bekleme + plakadaki deger satiri); v1 / v2 etiketleri eski kisa ipucunu kullanir */
  function rowTip(i, full) {
    const rr = ROWS[i], E = eff(), kind = rr.ult ? 'Ultimate' : rr.pas ? 'Passive' : 'Skill';
    const chips = [{ text: kind, tone: 'ac' }];
    if (full) PLATE[i].tip.forEach((c) => chips.push(c));
    if (rr.ult) chips.push({ text: 'Ult points ' + MC.ultSpent(E) + ' / ' + MC.ULT_MAX });
    const lines = [rr.d];
    if (full) PLATE[i].nums.forEach((n) => lines.push(kw(n.label + ':', richHtml(plRaw(n), false))));
    return bt({ accent: rr.pas ? '#6fb0a8' : rr.ult ? '#e0702a' : undefined, kind: kind + ' · Warrior', title: rr.name, icon: A + rr.ic, value: String(MC.rowSpent(E, i)), valueLabel: 'POINTS', chips, lines });
  }
  function barInfo(i) {
    const t = MC.BAR_THR[i];
    if (t > 25) return { name: 'L50: TBD', eff: 'Reserved for the Lv 50 bar (30 / 35 / 40 / 45). Content not decided yet.', tbd: true };
    const b = CN.bar[i];
    return b && b[0] ? { name: b[0], eff: b[1] || '(content missing)', tbd: false } : { name: 'Bonus ' + t, eff: '(content missing)', tbd: false };
  }
  function bonusTip(i) {
    const b = barInfo(i), E = eff(), t = MC.BAR_THR[i], sp = MC.counter(E), on = sp >= t, pendOn = on && MC.counter(ST.S) < t;
    const chips = [{ text: 'Bar ' + t, tone: 'ac' }, { text: pendOn ? 'Pending' : on ? (b.tbd ? 'Reached' : 'Active') : 'Not reached', tone: on && !pendOn ? 'ok' : pendOn ? 'v' : '' }];
    if (INERT['bar:' + i]) chips.push({ text: 'Not active yet', tone: 'warn' });
    const lines = [b.eff];
    if (INERT['bar:' + i]) lines.push(kw('Not active yet:', 'the bonus is chosen, but the battle engine does not apply it yet.'));
    const foot = b.tbd ? 'Needs ' + t + ' points in the passive and skill rows; the Lv 50 bar. Content to be decided.' : on ? 'Reached: ' + sp + ' points (needs ' + t + ')' : 'Spend ' + (t - sp) + ' more point' + (t - sp === 1 ? '' : 's') + ' in the passive and skill rows';
    return bt({ kind: 'Mastery bonus · ' + CN.mastery, title: b.name, value: String(t), valueLabel: 'BAR', chips, lines, foot: { text: foot } });
  }
  function respecTip() {
    const cost = GT.respecCost(ST.lv), spent = MC.spent(ST.S), short = ST.gold < cost;
    const chips = [{ text: 'gold', num: String(cost), tone: 'v' }, { text: spent ? spent + ' points return' : 'Nothing spent', tone: spent ? '' : 'warn' }];
    const lines = ['Takes every confirmed point back, so the tree can be spent again. Pending points are dropped too.', kw('Placeholder cost:', GT.RESPEC_PER_LEVEL + ' gold per level. The real rule is still open.')];
    return bt({ kind: 'Skill tree', title: 'Respec', icon: A + 'ui/gold.webp', value: String(cost), valueLabel: 'GOLD', chips, lines, foot: { text: !spent ? 'No confirmed points to take back' : short ? 'Not enough gold (' + ST.gold + ')' : 'Opens a confirmation first', cls: !spent || short ? 'lock' : '' } });
  }
  function tipHtml(ref, o) {
    const t = ref.slice(0, 1), id = ref.slice(2);
    return t === 'n' ? nodeTip(id, o) : t === 'b' ? bonusTip(+id) : t === 'x' ? respecTip() : t === 'p' ? rowTip(+id, true) : rowTip(+id);
  }

  /* ---------- kucuk parcalar ---------- */
  const LOCK = '<svg viewBox="0 0 12 14"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"/></svg>';
  const PL = '<svg class="pl" viewBox="0 0 12 14"><rect x="1.5" y="6" width="9" height="7" rx="1"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"/></svg>';
  const DROP = '<svg class="drop" viewBox="0 0 32 38"><path class="bd" d="M16 2 C16 2 4 17 4 25 a12 12 0 0 0 24 0 C28 17 16 2 16 2Z"/><path class="bi" d="M11 26 h10"/></svg>';
  const labelSide = GL.labelSide;
  function nodeHTML(key, p, cfg) {
    const nd = MC.BY[key], info = nodeInfo(key), k = nd.kind;
    let inner;
    if (k === 'B') inner = DROP;
    else if (k === 'N' || k === 'V') inner = `<span class="dm"><img src="${ic(nd.i)}" alt="" draggable="false"></span>`;
    else inner = '<span class="dm"></span>';
    const pp = k === 'F' ? '<span class="pp"></span>' : '';
    let lb = '';
    if (cfg.lblH && (k === 'N' || k === 'V')) { const side = nd.arm ? (nd.arm === 'u' || nd.arm === 'd' ? 'rt' : 'dn') : labelSide(nd) === 'up' ? 'up' : 'dn'; lb = `<span class="lb ${side}">${esc(info.name)}</span>`; }
    return `<button type="button" class="gt-nd k-${k.toLowerCase()}" data-key="${key}" data-tip="n:${key}" aria-label="${esc(info.name)}" style="left:${p.x}px;top:${p.y}px"><span class="lkic">${LOCK}</span>${inner}${pp}${lb}</button>`;
  }
  function stripState(E, tier) {
    const sp = MC.counter(E);
    if (tier === 'E') {
      const es = MC.evoState(E);
      if (es.capped) return { small: 'Evolve', pt: '2 / 2 used', em: '', lk: true };
      return { small: es.label, pt: es.need + ' pts', em: es.open ? '' : sp + '/' + es.need, lk: !es.open };
    }
    const need = MC.TIER_NEED[tier];
    return { small: 'Tier ' + tier, pt: need === 0 ? 'open' : need + ' pts', em: sp >= need ? '' : sp + '/' + need, lk: sp < need };
  }

  /* ---------- Mastery bar: yalniz bonus elmaslari (hover ipucu); bonus izgarasi / tier yazisi / evolve centigi YOK ---------- */
  /* kisa ekranda (ST.short, telefon yatay): TEK satirlik ince serit (ad + deger + iz); seviye yazisi yok (baslikta var) */
  /* 30-45 basamaklari icerik gelene kadar GIZLI (Omer 2026-10-22 form): iz 25'e olceklenir, deger 25'te dolar */
  const BAR_VIS = 25;
  function barHTML() {
    const mk = MC.BAR_THR.map((t, i) => [t, i]).filter(([t]) => t <= BAR_VIS).map(([t, i]) => `<span class="gt-mk" data-t="${t}" data-tip="b:${i}" style="left:${t / BAR_VIS * 100}%"><em>${t}</em><i></i></span>`).join('');
    if (ST.short) return `<div class="gt-barw slim"><span class="gt-bnm">${esc(CN.mastery)}</span><span class="gt-bval"><b data-bv>0</b> / ${BAR_VIS}<i data-bp></i></span><div class="gt-barrow"><div class="gt-track"><div class="bf"></div><div class="bp"></div>${mk}</div></div></div>`;
    return `<div class="gt-barw"><div class="gt-bar-top"><span class="gt-bnm">${esc(CN.mastery)}</span><span class="gt-bval"><b data-bv>0</b> / ${BAR_VIS}<i data-bp></i></span><span class="gt-bar-r">Level<b data-lvl>${ST.lv}</b></span></div>
      <div class="gt-barrow"><div class="gt-track"><div class="bf"></div><div class="bp"></div>${mk}</div></div></div>`;
  }

  /* ---------- agac (satirlar + ult) ---------- */
  const presetNeed = (k) => { const p = GL.PRESETS[k]; return p.labW + 2 * p.padX + 8 * p.colMin; };
  /* istenen ayardan baslayip sigmayan ayardan bir sonrakine duser (m -> l -> s -> p); dokunmatikte s (kucuk hedef) atlanir */
  function pickPreset(want, avail, coarse) {
    const chain = ['m', 'l', 's', 'p'].filter((k) => !(coarse && k === 's')), from = Math.max(0, chain.indexOf(want));
    for (let i = from; i < chain.length - 1; i++) if (avail >= presetNeed(chain[i])) return chain[i];
    return 'p';
  }
  function ultHTML(L, cfg, mode) {
    const U = L.ult, ur = ROWS[ULT], tags = cfg.ultD >= 44;
    let usvg = '', ucv = '';
    MC.ARMS.forEach((arm) => [1, 2, 3].forEach((s) => {
      const key = ULT + '.' + arm + s, P = U.pos[key], prev = s === 1 ? { x: U.cx, y: U.cy } : U.pos[ULT + '.' + arm + (s - 1)];
      usvg += `<path data-a="${s === 1 ? 'C' : ULT + '.' + arm + (s - 1)}" data-b="${key}" d="M${prev.x},${prev.y} L${P.x},${P.y}"/>`;
      ucv += nodeHTML(key, P, cfg);
      if (tags) {
        const vert = arm === 'u' || arm === 'd', half = (s === 3 ? cfg.sz.N : cfg.sz.E) / 2;
        const lx = vert ? P.x - (half + 30) : P.x, ly = vert ? P.y : P.y - (half + 13);
        ucv += `<span class="gt-ulv" data-ulv="${key}" style="left:${lx}px;top:${ly}px">Lv ${MC.ULT_LV[s - 1]}</span>`;
      }
    }));
    const arms = `<div class="gt-arms">${MC.ARMS.map((a) => `<div data-arm="${a}">${MC.ARM_NAME[a]} arm<b>0 / 3</b></div>`).join('')}</div>`;
    const info = mode === 'full'
      ? `<p>The ult icon sits in the middle (it is not a node). Four arms, three nodes each: the 1st needs <b>Lv 5</b>, the 2nd <b>Lv 10</b>, the 3rd <b>Lv 15</b> and is a Notable.</p><p><b>One arm only:</b> a point in any node of an arm closes the other three. The ult takes <b>${MC.ULT_MAX} points</b> at most, 1 per node, and each node needs the one before it. <b>No Evolve here.</b> Ult points do not count toward tier locks or the Mastery bar.</p>${arms}`
      : `<p>Nodes unlock by level (<b>5 · 10 · 15</b>), ${MC.ULT_MAX} points at most, one arm only. Ult points do not count toward tiers or the bar.</p>${arms}`;
    return `<div class="gt-ult"><div class="gt-uhead"><h3>Ult tree · ${esc(ur.name)}</h3><span>Level locks 5 · 10 · 15</span><span>Ult points <b data-upts>0</b> / ${MC.ULT_MAX}</span></div>
      <div class="gt-uwrap"><div class="gt-uinfo">${info}</div><div class="gt-uscroll"><div class="gt-ucanvas" style="width:${U.W}px;height:${U.H}px"><svg class="gt-lines" width="${U.W}" height="${U.H}" viewBox="0 0 ${U.W} ${U.H}">${usvg}</svg>
        <div class="gt-ucore" data-tip="r:${ULT}" style="left:${U.cx}px;top:${U.cy}px;width:${cfg.coreSz}px;height:${cfg.coreSz}px"><span class="ud"></span><img src="${A}${ur.ic}" alt="${esc(ur.name)}"></div>${ucv}</div></div></div></div>`;
  }
  /* o = { want: 'm'|'l'|'s'|'p', avail: px, coarse, ult: 'under'|'full'|'none'|'side', bar: bool, short: bool (telefon yatay: ince serit + kayan alan), inbar: bool (kisa ekran: islem dugmeleri seridin sagina) } -> { html, key, cfg, L } */
  function treeHTML(o) {
    if (o.plates) return gpHTML(o);
    const key = pickPreset(o.want, o.avail, o.coarse), cfg = Object.assign({}, GL.PRESETS[key]);
    if (o.short) { cfg.hdr = 20; cfg.padV = 3; cfg.lblH = 0; } /* kisa ekran: dugum adi yok (ipucunda), tek satirlik tier bandi */
    cfg.colW = GL.pickColW(o.avail, cfg.labW, cfg);
    const L = GL.build(cfg), mini = cfg.labW <= 56, tight = cfg.colW < 70, lh = mini ? 40 : 52;
    let cv = '', svg = '', labs = '', tsh = '';
    L.tiers.forEach((t) => {
      const x0 = cfg.padX + cfg.colW * t.c0, w = cfg.colW * (t.c1 - t.c0 + 1);
      tsh += `<div class="gt-ts${t.tier === 'E' ? ' evo' : ''}" data-tier="${t.tier}" data-tn="${t.tier}" style="left:${x0}px;top:0;width:${w}px;height:${cfg.hdr}px"><small></small><b>${PL}<span class="pt"></span><em></em></b></div>`;
    });
    L.rows.forEach((row) => {
      L.tiers.forEach((t) => {
        const x0 = cfg.padX + cfg.colW * t.c0, w = cfg.colW * (t.c1 - t.c0 + 1);
        cv += `<div class="gt-tb" data-tier="${t.tier}" style="left:${x0}px;top:${row.top}px;width:${w}px;height:${row.h}px"></div>`;
      });
      svg += `<line class="sep" x1="0" y1="${row.top + row.h}" x2="${L.W}" y2="${row.top + row.h}"/>`;
      const rr = ROWS[row.i];
      labs += `<div class="gt-rl${rr.pas ? ' pas' : ''}" data-row="${row.i}" data-tip="r:${row.i}" style="top:${row.cy - lh / 2}px;height:${lh}px"><span class="med"><img src="${A}${rr.ic}" alt=""><span class="rp" data-pts="${row.i}">0</span></span><span class="rt"><b>${esc(rr.name)}</b><i>${rr.pas ? 'Passive' : 'Skill'} · <u data-pts2="${row.i}">0</u> pts</i></span></div>`;
    });
    MC.NODES.filter((n) => n.i < NROWS).forEach((n) => {
      const B = L.pos[n.key];
      n.req.forEach((term) => term.forEach((src) => { svg += `<path class="${term.length > 1 ? 'alt' : ''}" data-a="${src}" data-b="${n.key}" d="${GL.link(L.pos[src], B)}"/>`; }));
      if (n.kind === 'B') { const h = cfg.sz.B / 2 + 2; svg += `<path class="dead" data-b="${n.key}" data-dead="1" d="M${B.x + h},${B.y} H${B.x + h + 12} M${B.x + h + 12},${B.y - 6} V${B.y + 6}"/>`; }
    });
    MC.NODES.filter((n) => n.i < NROWS).forEach((n) => { cv += nodeHTML(n.key, L.pos[n.key], cfg); });
    const vars = `--sF:${cfg.sz.F}px;--sE:${cfg.sz.E}px;--sB:${cfg.sz.B}px;--sN:${cfg.sz.N}px;--sV:${cfg.sz.V}px;--hit:${cfg.hit}px;--medw:${lh}px;--hdr:${cfg.hdr}px`;
    const cls = `gt cs${mini ? ' mini' : ''}${tight ? ' tight' : ''}${o.short ? ' sh' : ''} k-${key}`, inside = o.ult === 'under' || o.ult === 'full';
    /* ust serit: ince Mastery bar (+ kisa ekranda islem dugmeleri); sonra TEK kayan alan (.gt-scroll): satirlar + altta ult (kisa ekranda dikey + yatay kayar, tier bandi ve etiket sutunu yapisik) */
    const bar = o.bar === false ? '' : barHTML(), acts = o.inbar ? `<div class="gt-acts gt-inbar" data-dyn="acts">${actsHTML()}</div>` : '';
    const top = o.short ? `<div class="gt-tools">${bar}${acts}</div>` : bar;
    const html = `<div class="${cls}" style="${vars}">${top}
      <div class="gt-scroll"><div class="gt-treewrap"><div class="gt-labcol" style="width:${cfg.labW}px;height:${L.H}px"><div class="gt-corner"></div>${labs}</div><div class="gt-tree"><div class="gt-canvas" style="width:${L.W}px;height:${L.H}px"><svg class="gt-lines" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}">${svg}</svg><div class="gt-tsrow">${tsh}</div>${cv}</div></div></div>
      ${inside ? ultHTML(L, cfg, o.ult) : ''}</div></div>`;
    /* ult yan sutunda (v3): ayni .gt degiskenleriyle sarilir */
    const ultHtml = o.ult === 'side' ? `<div class="${cls}" style="${vars}">${ultHTML(L, cfg, 'side')}</div>` : '';
    return { html, key, cfg, L, ultHtml };
  }

  /* ---------- v3 Tree sekmesi: her satir = oyunun skill plakasi (A Plates) + yaninda o satirin dugumleri; ult en altta kendi satirinda ----------
     Plaka sutunu sabit genislik (masaustu 200 x --u, en az 150 px; telefon 104 px: oyunun kisa ekran plakasindan biraz buyuk, deger satirlari acik).
     Satir yuksekligini plaka belirler; dugum tuvali dikeyde ortalanir. Sigmayan yer plakalari kucultmez: sayfa kendi icinde dikey kayar
     (tier bandi kayarken ustte yapisik kalir). Dugum ayari: orta (m) -> kucuk-yogun (l) -> telefon (p); dokunmatikte l atlanir. o: treeHTML ile ayni + { u: sahne olcegi } */
  const GP_PG = 12, GP_PG_SHORT = 8;
  const gpPlateW = (o) => (o.short ? 104 : Math.max(150, Math.round(200 * (o.u || 1))));
  /* en dar satir: plaka + bosluk + telefon ayarinin 8 kolonu (en az genislik). Ana sutun bundan darsa satirlar sigmaz:
     once yan sutun agacin ALTINA iner (app.js > mountTree, .gt-wide.stack); o da yetmezse agac alani kendi icinde yatay kayar (hs, plaka sutunu solda yapisik). */
  const gpNeed = (o) => { const P = GL.PRESETS.p; return gpPlateW(o) + (o.short ? GP_PG_SHORT : GP_PG) + 2 * P.padX + GL.COLS * P.colMin; };
  function gpPreset(o, pw, pg) {
    const chain = o.coarse ? ['m', 'p'] : ['m', 'l', 'p'];
    for (let i = 0; i < chain.length - 1; i++) { const p = GL.PRESETS[chain[i]]; if (o.avail >= pw + pg + 2 * p.padX + 8 * p.colMin) return chain[i]; }
    return 'p';
  }
  function gpHTML(o) {
    const pg = o.short ? GP_PG_SHORT : GP_PG, pw = gpPlateW(o), key = gpPreset(o, pw, pg), cfg = Object.assign({}, GL.PRESETS[key]), hs = o.avail < gpNeed(o);
    if (o.short) { cfg.hdr = 20; cfg.padV = 3; cfg.lblH = 0; } /* kisa ekran: dugum adi yok (ipucunda), tek satirlik tier bandi */
    if (key === 'm') { cfg.ultD = 64; cfg.coreSz = 66; } /* ult + sekli plaka satirina sigsin (542 yerine 482 px) */
    if (key === 'p') cfg.colMax = 72; /* plaka sutunu kadar yer ayrildiktan sonra kalan genislik dugumlere */
    cfg.colW = GL.pickColW(o.avail, pw + pg, cfg);
    const L = GL.build(cfg), tight = cfg.colW < 70;
    let tsh = '';
    L.tiers.forEach((t) => {
      const x0 = cfg.padX + cfg.colW * t.c0, w = cfg.colW * (t.c1 - t.c0 + 1);
      tsh += `<div class="gt-ts${t.tier === 'E' ? ' evo' : ''}" data-tier="${t.tier}" data-tn="${t.tier}" style="left:${x0}px;top:0;width:${w}px;height:${cfg.hdr}px"><small></small><b>${PL}<span class="pt"></span><em></em></b></div>`;
    });
    let rowsH = '';
    L.rows.forEach((row) => {
      const i = row.i, loc = (k) => ({ x: L.pos[k].x, y: L.pos[k].y - row.top }); /* satir-yerel koordinat */
      let bands = '', svg = '', nds = '';
      L.tiers.forEach((t) => { bands += `<div class="gt-tb" data-tier="${t.tier}" style="left:${cfg.padX + cfg.colW * t.c0}px;top:0;bottom:0;width:${cfg.colW * (t.c1 - t.c0 + 1)}px"></div>`; });
      MC.NODES.filter((n) => n.i === i).forEach((n) => {
        const B = loc(n.key);
        n.req.forEach((term) => term.forEach((src) => { svg += `<path class="${term.length > 1 ? 'alt' : ''}" data-a="${src}" data-b="${n.key}" d="${GL.link(loc(src), B)}"/>`; }));
        if (n.kind === 'B') { const h = cfg.sz.B / 2 + 2; svg += `<path class="dead" data-b="${n.key}" data-dead="1" d="M${B.x + h},${B.y} H${B.x + h + 12} M${B.x + h + 12},${B.y - 6} V${B.y + 6}"/>`; }
        nds += nodeHTML(n.key, B, cfg);
      });
      rowsH += `<div class="gt-prow" data-row="${i}"><div class="gt-pcell">${plateOne(i, 'p:' + i)}<div class="gt-pcap"><span class="k">Points</span><span class="n" data-pts2="${i}">0</span></div></div>
        <div class="gt-pcv" style="width:${L.W}px">${bands}<div class="gt-pin" style="width:${L.W}px;height:${row.h}px"><svg class="gt-lines" width="${L.W}" height="${row.h}" viewBox="0 0 ${L.W} ${row.h}">${svg}</svg>${nds}</div></div></div>`;
    });
    const ultRow = `<div class="gt-prow ult" data-row="${ULT}"><div class="gt-pcell">${plateOne(ULT, 'p:' + ULT)}</div><div class="gt-pult"${o.short || hs ? ` style="flex:none;width:${L.W}px"` : ''}>${ultHTML(L, cfg, 'side')}</div></div>`; /* telefon / yatay kayan alan: ult satiri dugum satirlarindan GENIS olmasin (kayan genislik = en genis satir; fazlasi yatay kayma yaratir): ult icerigi bu genislikte sarilir */
    const vars = `--sF:${cfg.sz.F}px;--sE:${cfg.sz.E}px;--sB:${cfg.sz.B}px;--sN:${cfg.sz.N}px;--sV:${cfg.sz.V}px;--hit:${cfg.hit}px;--hdr:${cfg.hdr}px;--pw:${pw}px;--pg:${pg}px`;
    const cls = `gt gp${key === 'm' && !o.short ? '' : ' cs'}${tight ? ' tight' : ''}${o.short ? ' sh' : ''}${hs ? ' hs' : ''} k-${key}`;
    const bar = o.bar === false ? '' : barHTML(), acts = o.inbar ? `<div class="gt-acts gt-inbar" data-dyn="acts">${actsHTML()}</div>` : '';
    const top = o.short ? `<div class="gt-tools">${bar}${acts}</div>` : bar;
    const html = `<div class="${cls}" style="${vars}">${top}
      <div class="gt-scroll"><div class="gt-gpw"><div class="gt-sk"><div class="gt-ghead"><div class="gt-gsp"></div><div class="gt-gcv" style="width:${L.W}px">${tsh}</div></div>${rowsH}</div>${ultRow}</div></div></div>`;
    return { html, key, cfg, L, hs, ultHtml: '' };
  }

  /* ---------- islem cubugu (stat sayfasi dili: puan madalyonu | Respec · Reset · Confirm) ---------- */
  function actsHTML() {
    const free = freePts(), pend = GT.pendingCount(ST.P), spent = MC.spent(ST.S), cost = GT.respecCost(ST.lv);
    return `<span class="sh-ptr" title="${free > 0 ? free + ' skill point' + (free === 1 ? '' : 's') + ' to spend' : 'All points placed'}"><span class="sh-medal${free > 0 ? '' : ' empty'}"><span>${free}</span></span><span class="sh-tx">${free > 0 ? 'skill point' + (free === 1 ? '' : 's') + ' to spend' : 'All points placed'}</span></span><span class="gt-sp"></span>
      <span class="sh-acts"><button type="button" class="sh-btn rs${spent > 0 ? '' : ' off'}" data-a="respec" data-tip="x:respec">Respec <span class="cost">${cost}<img src="${A}ui/gold.webp" alt="" draggable="false"></span></button>
      <button type="button" class="sh-btn${pend > 0 ? '' : ' off'}" data-a="reset">Reset</button>
      <button type="button" class="sh-btn primary${pend > 0 ? '' : ' off'}" data-a="confirm">Confirm${pend > 0 ? ' (' + pend + ')' : ''}</button></span>`;
  }

  /* ---------- ozet parcalari (v2 sag sayfa, v3 Sheet kapisi, v3 yan kart) ---------- */
  function evolveText(E) {
    const es = MC.evoState(E), nds = MC.NODES.filter((n) => n.kind === 'V' && MC.rk(E, n.key) > 0);
    return { es, taken: nds.map((n) => nodeInfo(n.key).name) };
  }
  function chipsHTML() {
    const E = eff(), free = freePts(), pend = GT.pendingCount(ST.P), ev = evolveText(E).es;
    const evc = ev.capped ? '<span class="gt-chip ok">Evolves <b>2 / 2</b></span>' : `<span class="gt-chip${ev.open ? ' ok' : ''}">${ev.label} <b>${ev.open ? 'ready' : ev.have + ' / ' + ev.need}</b></span>`;
    return `<span class="gt-chip">Level <b>${ST.lv}</b></span><span class="gt-chip">Spent <b>${MC.spent(ST.S)}</b> / ${MC.pool(ST.lv)}</span><span class="gt-chip${free > 0 ? ' ok' : ''}">Free <b>${free}</b></span>${pend ? `<span class="gt-chip pend">Pending <b>+${pend}</b></span>` : ''}${evc}`;
  }
  function chainDot(key, E) {
    const st = GT.status(ST.lv, E, key), pd = ST.P[key] > 0 && MC.rk(ST.S, key) === 0;
    const on = st.rank > 0;
    return `${on ? (pd ? 'pd' : 'on') : ''}${!on && ['tlk', 'xl', 'dir'].indexOf(st.st) >= 0 ? ' lk' : ''}`.trim();
  }
  function summaryRowsHTML() {
    const E = eff(), lv = ST.lv;
    let out = '';
    for (let i = 0; i < 5; i++) {
      const rr = ROWS[i], pts = MC.rowSpent(E, i), pendN = MC.rowSpent(ST.S, i) === pts ? 0 : pts - MC.rowSpent(ST.S, i);
      let chain = '', evs = '';
      if (i < NROWS) {
        ['f1', 'f2', 'f3', 'n0', 'r'].forEach((id) => { chain += `<i class="${chainDot(i + '.' + id, E)}"></i>`; });
        const sideKey = MC.rk(E, i + '.eb') > 0 ? i + '.eb' : i + '.ea';
        chain += `<i class="${chainDot(sideKey, E)}"></i>`;
        const t4 = ['ma', 'fa', 'fb', 'mb'].map((id) => i + '.' + id).find((k) => MC.rk(E, k) > 0) || i + '.ma';
        chain += `<i class="${chainDot(t4, E)}"></i><i class="ev ${chainDot(i + '.v', E)}"></i>`;
        const vk = i + '.v', vinfo = nodeInfo(vk), vst = GT.status(lv, E, vk);
        if (vst.rank > 0) evs = `<span class="evs ok">Evolved: <b>${esc(vinfo.name)}</b></span>`;
        else if (vst.st === 'av') evs = `<span class="evs gold">Evolve ready: <b>${esc(vinfo.name)}</b></span>`;
        else if (vst.check && vst.check.code === 'evo') evs = `<span class="evs">${vst.check.text}</span>`;
        else if (vst.check && vst.check.code === 'cap') evs = '<span class="evs">Both evolves used</span>';
        else evs = `<span class="evs">${esc(vst.check ? vst.check.text : '')}</span>`;
      } else {
        const up = MC.ultSpent(E);
        for (let k = 0; k < MC.ULT_MAX; k++) chain += `<i class="${k < up ? (MC.ultSpent(ST.S) > k ? 'on' : 'pd') : ''}"></i>`;
        evs = `<span class="evs">Ult tree: ${up} / ${MC.ULT_MAX} points · levels 5 · 10 · 15</span>`;
      }
      out += `<div class="gt-srow${rr.pas ? ' pas' : ''}${rr.ult ? ' ult' : ''}" data-tip="r:${i}"><span class="med"><img src="${A}${rr.ic}" alt=""></span><div class="mid"><div class="nm">${esc(rr.name)}<span class="tg">${rr.pas ? 'Passive' : rr.ult ? 'Ultimate' : 'Skill'}</span></div><div class="gt-chain">${chain}</div></div><div class="pts">${pts}${pendN ? `<u>+${pendN}</u>` : ''}<small>${rr.ult ? 'ult pts' : 'points'}</small></div>${evs}</div>`;
    }
    return out;
  }
  function cardHTML() {
    const E = eff(), free = freePts(), pend = GT.pendingCount(ST.P), ev = evolveText(E);
    const evLine = ev.es.capped ? '<b>2 / 2</b>' : ev.es.open ? '<b>ready</b>' : `<b>${ev.es.have} / ${ev.es.need}</b>`;
    return `<h4>Points</h4><div class="gt-kv">Level<b>${ST.lv}</b></div><div class="gt-kv">Spent<b>${MC.spent(ST.S)} / ${MC.pool(ST.lv)}</b></div><div class="gt-kv">Pending<b class="${pend ? 'pd' : ''}">${pend ? '+' + pend : '0'}</b></div><div class="gt-kv">Free<b>${free}</b></div>
      <h4>Evolve</h4><div class="gt-kv">${ev.es.capped ? 'Both used' : ev.es.label + ' (' + ev.es.need + ' pts)'}${evLine}</div>${ev.taken.length ? `<div class="gt-kv">Taken<b>${esc(ev.taken.join(' · '))}</b></div>` : ''}`;
  }
  const shltHtml = () => `Level <b>${ST.lv}</b>`;
  const lvlText = () => `Level ${ST.lv} · ${MC.pool(ST.lv)} points`;
  const goldHtml = () => `${ST.gold}<img class="gr-ui-ico" src="${A}ui/gold.webp" alt="" draggable="false">`;
  const spChipHtml = () => { const n = freePts(); return `<b>${n}</b> skill point${n === 1 ? '' : 's'} saved for the skill trees`; };

  /* ---------- Gear kabugu: Sheet sol sayfasi, yer imleri, skill plakalari ---------- */
  const STAT_ICO = { hp: 'hp', mp: 'mp', str: 'str', dex: 'dex', int: 'int', luck: 'luck', damage: 'might', crit: 'critChance', critMult: 'critMult', accuracy: 'accuracy', spd: 'spd', armor: 'armor', magicArmor: 'magicArmor', evasion: 'evasion', hpRegen: 'hpRegen', mpRegen: 'mpRegen' };
  const STAT_NAME = { hp: 'HP', mp: 'MP', str: 'Strength', dex: 'Dexterity', int: 'Intelligence', luck: 'Luck', damage: 'Damage', crit: 'Crit chance', critMult: 'Crit damage', accuracy: 'Accuracy', spd: 'Speed', armor: 'Armor', magicArmor: 'Magic armor', evasion: 'Evasion', hpRegen: 'HP regen', mpRegen: 'MP regen' };
  /* mock deger: Lv 30 Warrior (gercek hesap degil, yalniz gorunum icin) */
  const STAT_VAL = { str: '61', dex: '18', int: '14', luck: '20', damage: '+12%', crit: '9%', critMult: '1.5', accuracy: '88%', spd: '21', armor: '34', magicArmor: '4', evasion: '3%', hpRegen: '6', mpRegen: '2' };
  const sIco = (id) => `<img class="sh-ico" src="${A}stat/${STAT_ICO[id]}.webp" alt="" draggable="false">`;
  function sheetLeftHTML() {
    const lv = ST.lv, need = 2310, xp = 1840;
    const vital = (id, cur, max) => `<div class="sh-bh ${id}" data-stat="${id}"><div class="sh-bh-top">${sIco(id)}<span class="sh-bn">${STAT_NAME[id]}</span><span class="sh-bv">${cur} <s>/ ${max}</s></span><span class="sh-d"></span></div><div class="sh-bar"><i class="f${id}" style="width:${Math.round(cur / max * 100)}%"></i></div></div>`;
    const row = (id) => `<div class="sh-row${id === 'str' ? ' p' : ''}" data-stat="${id}">${sIco(id)}<span class="sh-k">${STAT_NAME[id]}</span><span class="sh-n">${STAT_VAL[id]}</span><span class="sh-d"></span></div>`;
    const col = (cls, label, ids) => `<div class="sh-col ${cls}"><div class="sh-sl">${label}</div>${ids.map(row).join('')}</div>`;
    return `<div class="gr-leaf gr-leaf-sheet"><div class="sh"><div class="sh-head"><span class="sh-lt" data-dyn="shlt">Level <b>${lv}</b></span><span class="sh-xpv">${xp} <s>/ ${need} XP</s></span></div><div class="sh-bar sh-xp"><i style="width:${Math.round(xp / need * 100)}%"></i></div>
      <div class="sh-under"><span class="sh-chip" data-dyn="spchip">${spChipHtml()}</span></div><div class="sh-dv"></div>
      <div class="sh-vit">${vital('hp', 388, 412)}${vital('mp', 74, 74)}</div><div class="sh-dv"></div>
      <div class="sh-cols">${col('base', 'Main', ['str', 'dex', 'int', 'luck'])}${col('attack', 'Attack', ['damage', 'crit', 'critMult', 'accuracy', 'spd'])}${col('defense', 'Defense', ['armor', 'magicArmor', 'evasion', 'hpRegen', 'mpRegen'])}</div></div></div>`;
  }
  const HEROES = [['warrior', 'Warrior'], ['archer', 'Archer'], ['mage', 'Mage'], ['defender', 'Defender']];
  const marksHTML = () => `<div class="gr-marks">${HEROES.map(([id, nm]) => `<button type="button" class="gr-mark${id === 'warrior' ? ' on' : ''}" data-a="hero:${id}" aria-label="${nm}" title="${nm}"><div class="gr-face" style="background-image:url('${A}av/${id}.webp')"></div></button>`).join('')}</div>`;
  /* skill plakalari (A Plates = oyunun .gr-pl isaretlemesi, character-panel.ts > plateHtml / plateChips / numsHtml): pasif 1. sirada, sonra 4 skill; 4. skill yuvasi ulti.
     TEK uretici: Sheet seridi (platesHTML) ve v3 Tree sekmesindeki satirlar (gpHTML) ayni plakayi kullanir. Cipler ve deger satirlari GERCEK veriden (data/plates.js: skills.json + oyunun gear-skills.ts hesabi). */
  const PD = ((root.SMM_PLATES || {})[CLS.id] || { rows: [] }).rows;
  const PL_ICO = { mp: 'stat/mp.webp', hp: 'stat/hp.webp', cd: 'ui/cooldown.webp', rage: 'ui/rage.webp' };
  const plChip = (c) => (c.kind === 'free' ? '<span class="pl-chip free">Free</span>' : `<span class="pl-chip${c.kind === 'rage' ? ' rage' : ''}"><img class="bh-ico" src="${A}${PL_ICO[c.kind]}" alt="" draggable="false">${esc(c.text)}</span>`);
  const plRaw = (n) => n.text + (n.times ? ' x' + n.times : '');
  const plVal = (n) => esc(plRaw(n));
  const PL_SL = (n) => `<div class="pl-sl"><span class="k" title="${esc(n.label)}">${esc(n.label)}</span><span class="n">${plVal(n)}</span></div>`;
  /* kind: '' | 'pas' | 'ult'; chips: plaka cipleri (html); nums: deger satirlari; tip: ipucundaki cipler (skillTip meta). Veri yoksa / ad uymazsa plaka bos cipli kalir (cokmez). */
  const PLATE = ROWS.map((rr, i) => {
    const d = PD[i] && PD[i].name === rr.name ? PD[i] : { kind: rr.pas ? 'pas' : rr.ult ? 'ult' : '', chips: [], nums: [], tip: [] };
    return { kind: d.kind, chips: d.chips.map(plChip).join(''), nums: d.nums, tip: d.tip.map((t) => ({ text: t, tone: t === 'Free' ? 'ok' : /^RAGE/.test(t) ? 'warn' : '' })) };
  });
  function plateOne(i, ref) {
    const p = PLATE[i];
    return `<div class="gr-pl ${p.kind}" data-tip="${ref}"><span class="pl-tag"${p.kind ? '' : ' hidden'}>${p.kind === 'pas' ? 'Passive' : 'Ultimate'}</span><div class="pl-ico"><img src="${A}${ROWS[i].ic}#smooth" alt="" draggable="false"></div><div class="pl-nm">${esc(ROWS[i].name)}</div><div class="pl-dv"></div><div class="pl-chips">${p.chips}</div><div class="pl-sls">${p.nums.map(PL_SL).join('')}</div></div>`;
  }
  function platesHTML() {
    return `<div class="gr-skills"><div class="gr-sec">Skills</div><div class="gr-skillbar">${PLATE.map((p, i) => plateOne(i, 'r:' + i)).join('')}</div></div>`;
  }

  /* ---------- sag sayfa / sekme icerikleri ---------- */
  const headHTML = () => `<div class="gr-sec gr-tree-head">Skill tree<span class="gr-pt sk" data-badge></span><span class="gt-lvl" data-dyn="lvl">${lvlText()}</span></div>`;
  /* v1: tum agac sag sayfada */
  const rightV1 = () => `<div class="gt-page fill">${headHTML()}<div class="gt-sec-gap"></div><div id="gt-treehost" class="gt-in"></div><div class="gt-acts gt-sticky" data-dyn="acts">${actsHTML()}</div></div>`;
  /* v2: ozet + "Open tree" */
  const rightV2 = () => `<div class="gt-page">${headHTML()}<div class="gt-sec-gap"></div><div class="gt-sum"><div class="gt-chips" data-dyn="chips">${chipsHTML()}</div><div id="gt-barhost">${barHTML()}</div><div class="gt-srows" data-dyn="srows">${summaryRowsHTML()}</div>
    <button type="button" class="gt-door" data-a="open-tree">Open skill tree <small>full working panel</small></button></div><div class="gt-acts gt-sticky" data-dyn="acts">${actsHTML()}</div></div>`;
  /* v3: Sheet sekmesinin sag sayfasi = kucuk kapi; Tree sekmesi iki sayfayi kaplar */
  const rightV3Sheet = () => `<div class="gt-page">${headHTML()}<div class="gt-sec-gap"></div><div class="gt-doorpage"><div class="gt-chips" data-dyn="chips">${chipsHTML()}</div><div id="gt-barhost">${barHTML()}</div>
    <button type="button" class="gt-door" data-a="tab:tree">Open the Tree tab <small>uses both pages</small></button></div></div>`;
  const rightV3Tree = () => {
    const head = `<div class="gt-head"><div class="gr-sec gr-tree-head">Skill tree · ${esc(CLS.name)}<span class="gr-pt sk" data-badge></span><span class="gt-lvl" data-dyn="lvl">${lvlText()}</span></div></div><div class="gt-sec-gap"></div>`;
    if (ST.short) return `<div class="gt-page fill">${head}<div class="gt-wide"><div class="gt-main"><div id="gt-treehost" class="gt-in"></div></div></div></div>`;
    /* plakali satirlar (gpHTML): ult kendi satirinda ana sutunda; dar + uzun yedek pencerede (nw) eski yan sutun */
    return `<div class="gt-page">${head}
    <div class="gt-wide${ST.nw ? '' : ' gp'}"><div class="gt-main"><div id="gt-treehost" class="gt-in"></div></div><div class="gt-side">${ST.nw ? '<div id="gt-ulthost"></div>' : ''}<div class="gt-card" data-dyn="card">${cardHTML()}</div><p class="gt-note"><b>Tap</b> a node: +1 pending (orange ring). <b>Right-click</b> or long-press: −1 pending. <b>Confirm</b> keeps the points.</p><div class="gt-acts gt-sticky" data-dyn="acts">${actsHTML()}</div></div></div></div>`;
  };
  /* v2 calisma paneli (tam ekran) */
  const workspaceHTML = () => `<div class="gr-overlay el-modal gr-ledger-ov gt-wp-ov" id="gt-wp"><div class="gr-panel gr-gear gt-wp el-modal-panel"><div class="gr-head gr-lhead"><div class="gr-title">Skill tree</div><div class="gt-hero"><img src="${A}av/warrior.webp" alt=""><div>${esc(CLS.name)}<small data-dyn="lvl">${lvlText()}</small></div></div><span class="gr-grow"></span><div class="gr-gold" data-dyn="gold">${goldHtml()}</div></div>
    <div class="gt-wp-body"><div id="gt-treehost" class="gt-in"></div>${ST.short ? '' : `<div class="gt-acts" data-dyn="acts">${actsHTML()}</div>`}</div></div></div>`;

  const NAVX = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';
  const NAVFS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="round"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/></svg>';
  /* Gear kabugu (v1 / v2: Hero + Sheet; v3: Hero + Sheet + Tree) */
  function gearHTML() {
    const tabs = [['hero', 'Hero', 'ui/gear.webp'], ['sheet', 'Sheet', 'stat/str.webp']];
    if (ST.variant === 'v3') tabs.push(['tree', 'Tree', 'ui/passive.webp']);
    const badgeTab = ST.variant === 'v3' ? 'tree' : 'sheet';
    const tabHtml = tabs.map(([id, nm, src]) => `<button type="button" class="gr-tab${ST.tab === id ? ' on' : ''}" role="tab" aria-selected="${ST.tab === id}" data-a="tab:${id}" title="${nm}"><img class="gr-tab-ico" src="${A}${src}" alt="" draggable="false">${nm}${id === badgeTab ? '<span class="gr-pt sk" data-badge></span>' : ''}</button>`).join('');
    const tree = ST.variant === 'v3' && ST.tab === 'tree';
    const left = tree ? '' : sheetLeftHTML();
    const right = ST.tab === 'hero' ? '' : ST.variant === 'v1' ? rightV1() : ST.variant === 'v2' ? rightV2() : tree ? rightV3Tree() : rightV3Sheet();
    return `<div class="gr-overlay el-modal gr-ledger-ov" id="gt-gear"><div class="gr-panel gr-gear gr-ledger el-modal-panel tab-${tree ? 'tree' : ST.tab}${tree || (ST.variant === 'v1' && ST.tab === 'sheet') ? ' gt-fill' : ''}"><div class="gr-head gr-lhead"><div class="gr-title">Gear</div><div class="gr-tabs gr-headtabs" role="tablist">${tabHtml}</div><span class="gr-grow"></span><div class="gr-gold" data-dyn="gold">${goldHtml()}</div></div>
      <div class="gr-body gr-lbody"><div class="gr-marks-col">${marksHTML()}</div><div class="gr-page"><div class="gr-page-in" id="gt-leafL">${left}</div><div class="gr-folio">· 3 ·</div></div><div class="gr-spine"></div><div class="gr-page r"><div class="gr-page-in" id="gt-leafR">${right}</div><div class="gr-folio">· 4 ·</div></div><div class="gr-lskills">${tree ? '' : platesHTML()}</div></div></div>
      <button type="button" class="nav-btn settings-toggle close-toggle" data-a="close" title="Close" aria-label="Close">${NAVX}</button><div class="gr-toast" role="status"></div></div>`;
  }
  const fsButtonHTML = () => `<button type="button" class="nav-btn settings-toggle fullscreen-toggle" data-a="fs" title="Fullscreen" aria-label="Fullscreen">${NAVFS}</button>`;
  const closeButtonHTML = () => `<button type="button" class="nav-btn settings-toggle close-toggle" data-a="close-ws" title="Close" aria-label="Close">${NAVX}</button>`;

  return { BAR_VIS, ST, MC, GT, GL, CN, ROWS, KN, INERT, A, esc, eff, freePts, reset, demoState, bt, richHtml, nodeTip, rowTip, bonusTip, respecTip, tipHtml, nodeInfo, stripState, treeHTML, pickPreset, presetNeed, gpNeed, barHTML, actsHTML, chipsHTML, summaryRowsHTML, cardHTML, lvlText, shltHtml, goldHtml, spChipHtml,
    sheetLeftHTML, platesHTML, gearHTML, workspaceHTML, fsButtonHTML, closeButtonHTML, rightV1, rightV2, rightV3Sheet, rightV3Tree };
});
