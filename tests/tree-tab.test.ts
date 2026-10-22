// Gear > Tree sekmesinin DOM'suz mantığı (src/ui/tree-tab-model.ts, tree-tab-layout.ts): bekleyen puan akışı, yön kilidi, Confirm / Reset, respec bedeli.
import { describe, expect, it } from 'vitest';
import { TREE_RULES, treeOf } from '../src/progression/skill-tree-data';
import { treeNodes, rankOf, spent } from '../src/progression/skill-tree';
import { applyRespec, applyTree, type TreeHero } from '../src/progression/skill-tree-hero';
import {
  addPending,
  confirmAlloc,
  confirmBlocked,
  effective,
  freePoints,
  lockInfo,
  makeSession,
  nodeOf,
  nodeStatus,
  pendingCount,
  removePending,
  resetPending,
  respecInfo,
  stripState,
  treeTabEnabled,
} from '../src/ui/tree-tab-model';
import { build, link, platePreset, plateConfig, plateNeed, PRESETS, template } from '../src/ui/tree-tab-layout';

const hero = (level: number, extra: Partial<TreeHero> = {}): TreeHero => ({ id: 'h1', class: 'warrior', level, skillPoints: level - 1, ...extra });
const rules = TREE_RULES;

describe('Tree sekmesi: oturum ve bekleyen puan', () => {
  it('ağacı olan class için oturum açılır, boş ağaç + sıfır bekleyen', () => {
    const s = makeSession(hero(10))!;
    expect(s.tree.class).toBe('warrior');
    expect(pendingCount(s)).toBe(0);
    expect(freePoints(s)).toBe(9);
    expect(makeSession({ id: 'x', class: 'nope', level: 5 })).toBeUndefined();
  });

  it('tık +1 bekleyen: f1 açık, f2 f1 olmadan kilitli, puan bitince reddedilir', () => {
    const s = makeSession(hero(3))!; // 2 puan
    expect(addPending(s, '1.f2', rules)).toMatchObject({ ok: false });
    expect(addPending(s, '1.f1', rules).ok).toBe(true);
    expect(addPending(s, '1.f1', rules).ok).toBe(true);
    expect(freePoints(s)).toBe(0);
    const r = addPending(s, '1.f1', rules);
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/No points left|Max rank/);
    expect(pendingCount(s)).toBe(2);
  });

  it('sağ tık yalnızca bekleyeni geri alır; onaylı puan respec ister; bağımlıyı bozan reddedilir', () => {
    const s = makeSession(hero(10, { tree: { v: treeOf('warrior')!.version, r: { '1.f1': 1 } }, skillPoints: 8 }))!;
    expect(removePending(s, '1.f1', rules)).toMatchObject({ ok: false, reason: 'Confirmed points need a respec' });
    addPending(s, '1.f2', rules);
    expect(removePending(s, '1.f1', rules).ok).toBe(false); // onaylı
    s.pending['1.f1'] = 1; // f1 bekleyen de olsun: f2 f1'e bağlı, ama onaylı f1 hâlâ duruyor
    expect(removePending(s, '1.f1', rules).ok).toBe(true);
    expect(removePending(s, '1.f2', rules).ok).toBe(true);
    expect(pendingCount(s)).toBe(0);
    expect(removePending(s, '1.f2', rules)).toMatchObject({ ok: false, reason: 'Nothing to remove' });
  });

  it('bekleyen f1 geri alınırken f2 ona bağlıysa "Needed by" der', () => {
    const s = makeSession(hero(10))!;
    addPending(s, '1.f1', rules);
    addPending(s, '1.f2', rules);
    const r = removePending(s, '1.f1', rules);
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/^Needed by/);
  });

  it('Reset bekleyenlerin hepsini siler, onaylıya dokunmaz', () => {
    const s = makeSession(hero(10, { tree: { v: treeOf('warrior')!.version, r: { '1.f1': 2 } }, skillPoints: 7 }))!;
    addPending(s, '1.f1', rules);
    addPending(s, '2.f1', rules);
    expect(pendingCount(s)).toBe(2);
    resetPending(s);
    expect(pendingCount(s)).toBe(0);
    expect(rankOf(effective(s), '1.f1')).toBe(2);
  });
});

describe('Tree sekmesi: yön kilidi (a / b) ve kilit durumları', () => {
  const chain = { '1.f1': 3, '1.f2': 5, '1.f3': 5, '1.n0': 1, '1.r': 1 }; // 15 puan: Tier IV açık
  const mk = () => makeSession(hero(30, { tree: { v: treeOf('warrior')!.version, r: chain }, skillPoints: 14 }))!;

  it('a yönü bekleyen alınınca b yönü kilitlenir (dir), geri alınınca açılır', () => {
    const s = mk();
    expect(nodeStatus(s, '1.eb', rules).st).toBe('av');
    expect(addPending(s, '1.ea', rules).ok).toBe(true);
    expect(nodeStatus(s, '1.eb', rules).st).toBe('dir');
    expect(nodeStatus(s, '1.mb', rules).st).toBe('dir');
    const r = addPending(s, '1.eb', rules);
    expect(r).toMatchObject({ ok: false, reason: 'Other direction chosen' });
    expect(removePending(s, '1.ea', rules).ok).toBe(true);
    expect(nodeStatus(s, '1.eb', rules).st).toBe('av');
  });

  it('kademe kilidi: sayaç 5 olmadan Tier II alınamaz; kilit bilgisi ipucu için doğru', () => {
    const s = makeSession(hero(30))!;
    const n0 = nodeOf('1.n0', rules)!;
    expect(nodeStatus(s, '1.n0', rules).st).toBe('tlk'); // sayaç 0 < 5
    expect(lockInfo(s, n0, rules)).toMatchObject({ tier: 'Tier II', lock: '5 pts', open: false });
    const m = mk();
    expect(lockInfo(m, nodeOf('1.ea', rules)!, rules)).toMatchObject({ tier: 'Tier III', open: true });
  });

  it('evolve: sayaç 23 gerekir; ult düğümü level kilidi bilgisi', () => {
    const s = mk();
    expect(lockInfo(s, nodeOf('1.v', rules)!, rules)).toMatchObject({ tier: 'Evolve I', lock: '23 pts', open: false });
    const u1 = nodeOf('4.u1', rules)!;
    expect(lockInfo(makeSession(hero(4))!, u1, rules)).toMatchObject({ lock: 'Lv 5', open: false });
    expect(lockInfo(makeSession(hero(6))!, u1, rules).open).toBe(true);
  });

  it('tier bandı durumu: kilitli şerit gereken puanı ve ilerlemeyi gösterir', () => {
    const empty = { v: 1, r: {} };
    expect(stripState(empty, 'I', rules)).toMatchObject({ pt: 'open', lk: false });
    expect(stripState(empty, 'II', rules)).toMatchObject({ pt: '5 pts', em: '0/5', lk: true });
    expect(stripState(mk().confirmed, 'IV', rules).lk).toBe(false);
    expect(stripState(mk().confirmed, 'E', rules)).toMatchObject({ small: 'Evolve I', lk: true });
  });
});

describe('Tree sekmesi: Confirm ve respec (kayıt kuralıyla birlikte)', () => {
  it('Confirm: bekleyen yokken reddedilir; varken kahraman kuralı kabul eder ve harcanmamış puan düşer', () => {
    const h = hero(10);
    const s = makeSession(h)!;
    expect(confirmBlocked(h, s, rules)).toBe('No pending points');
    addPending(s, '1.f1', rules);
    addPending(s, '1.f1', rules);
    expect(confirmBlocked(h, s, rules)).toBeNull();
    applyTree(h, confirmAlloc(s));
    expect(spent(h.tree!)).toBe(2);
    expect(h.skillPoints).toBe(7);
    // aynı oturumdan yeni oturum: onaylı ağaç yüklenir, bekleyen boş
    const s2 = makeSession(h)!;
    expect(rankOf(s2.confirmed, '1.f1')).toBe(2);
    expect(pendingCount(s2)).toBe(0);
  });

  it('Confirm: onaylı puan düşürülemez, harcanmamıştan fazla alınamaz', () => {
    const h = hero(3);
    const s = makeSession(h)!;
    s.pending['1.f1'] = 3; // 2 puanı var
    expect(confirmBlocked(h, s, rules)).toBeTruthy();
  });

  it('respec bedeli = 20 + 5 x level (altın); bedava hak 0; altın yetmezse neden', () => {
    const treeAlloc = { v: treeOf('warrior')!.version, r: { '1.f1': 1 } };
    const h = hero(10, { tree: treeAlloc, skillPoints: 8 });
    const ri = respecInfo(h, 1000, rules);
    expect(ri).toMatchObject({ cost: 70, spent: 1, free: false, blocked: null });
    expect(respecInfo(h, 50, rules).blocked).toMatch(/Not enough gold \(70 needed\)/);
    expect(respecInfo(hero(10, { tree: treeAlloc, skillPoints: 8, freeRespec: true }), 0, rules)).toMatchObject({ cost: 0, free: true, blocked: null });
    expect(respecInfo(hero(10), 1000, rules).blocked).toBe('No skill points to reset');
    expect(respecInfo(hero(30), 1000, rules).cost).toBe(170);
  });

  it('respec ağacın tamamını iade eder, bedeli döner, bedava hak harcanır', () => {
    const h = hero(10, { tree: { v: treeOf('warrior')!.version, r: { '1.f1': 3, '2.f1': 1 } }, skillPoints: 5, freeRespec: true });
    expect(applyRespec(h)).toBe(0);
    expect(h.tree).toBeUndefined();
    expect(h.skillPoints).toBe(9);
    expect(h.freeRespec).toBeUndefined();
  });

  it('sekme yalnızca ana şalter açıkken görünür', () => {
    expect(treeTabEnabled({ ...rules, enabled: false })).toBe(false);
    expect(treeTabEnabled({ ...rules, enabled: true })).toBe(true);
  });
});

describe('Tree sekmesi: yerleşim', () => {
  it('her satırda tüm düğümler, ult için kol başına 3 adım, 5 tier bandı', () => {
    const cfg = plateConfig({ avail: 1000, coarse: false, short: false, u: 1 }).cfg;
    const L = build(cfg, rules);
    const per = template(rules).length;
    expect(Object.keys(L.pos)).toHaveLength(per * rules.rows);
    expect(Object.keys(L.ult.pos)).toHaveLength(rules.ult.arms.length * rules.ult.levels.length);
    expect(L.tiers.map((t) => t.tier)).toEqual(['I', 'II', 'III', 'IV', 'E']);
    expect(L.rows).toHaveLength(rules.rows);
    expect(L.W).toBe(cfg.padX * 2 + cfg.colW * 8);
    // bütün düğümler kendi anahtarlarıyla var
    for (const n of treeNodes(rules).list.filter((x) => x.row < rules.rows)) expect(L.pos[n.key]).toBeTruthy();
  });

  it('ayar zinciri: geniş = m, dar = p; dokunmatikte l atlanır; en dar satıra sığmazsa hs', () => {
    expect(platePreset({ avail: 1400, coarse: false, short: false, u: 1 })).toBe('m');
    expect(platePreset({ avail: 1030, coarse: false, short: false, u: 1 })).toBe('l');
    expect(platePreset({ avail: 1030, coarse: true, short: false, u: 1 })).toBe('p');
    const pc = plateConfig({ avail: 300, coarse: true, short: true, u: 0.35 });
    expect(pc.key).toBe('p');
    expect(pc.hs).toBe(300 < plateNeed({ short: true, u: 0.35 }));
    expect(pc.cfg.hdr).toBe(20); // kısa ekran: tek satırlık tier bandı
    expect(PRESETS.p.hit).toBeGreaterThanOrEqual(44);
  });

  it('yol: aynı hizada düz çizgi, değilse eğri', () => {
    expect(link({ x: 0, y: 5 }, { x: 10, y: 5 })).toBe('M0,5 L10,5');
    expect(link({ x: 0, y: 0 }, { x: 10, y: 6 })).toMatch(/^M0,0 C/);
  });
});
