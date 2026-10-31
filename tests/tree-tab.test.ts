// Gear > Tree sekmesinin DOM'suz mantığı (src/ui/tree-tab-model.ts, tree-tab-layout.ts): bekleyen puan akışı, yön kilidi, Confirm / Reset, respec bedeli.
import { describe, expect, it } from 'vitest';
import { TREE_RULES, treeOf } from '../src/progression/skill-tree-data';
import { rankOf, spent } from '../src/progression/skill-tree';
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
import { buildCols, link, deadStub, tierSpans, COL_AT, HIT_GOAL } from '../src/ui/tree-tab-layout';

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

describe('Tree sekmesi: sütun yerleşimi (V1 Columns)', () => {
  const sizes = [
    { n: '16:9', W: 1500, H: 640, short: false },
    { n: '21:9', W: 2000, H: 640, short: false },
    { n: 'telefon', W: 732, H: 255, short: true },
  ];

  it("rowShape içindeki her düğüm kimliğinin sütun yeri var; tier sırası I II III IV E", () => {
    for (const d of rules.rowShape) expect(COL_AT[d.id], d.id).toBeTruthy();
    expect(tierSpans(rules).map((t) => t.tier)).toEqual(['I', 'II', 'III', 'IV', 'E']);
    expect(tierSpans(rules).map((t) => t.n)).toEqual([1, 1, 2, 1, 1]);
  });

  for (const z of sizes)
    it(`${z.n}: her düğüm kutuya sığar, sütunlar ve ult kolları hizalı`, () => {
      const L = buildCols(z, rules);
      expect(Object.keys(L.pos)).toHaveLength(rules.rowShape.length * rules.rows + rules.ult.arms.length * rules.ult.levels.length);
      for (const [key, p] of Object.entries(L.pos)) {
        expect(p.x, key).toBeGreaterThan(L.labW);
        expect(p.x, key).toBeLessThan(L.W);
        expect(p.y, key).toBeGreaterThan(0);
        expect(p.y, key).toBeLessThan(L.H);
      }
      // sütun i'nin düğümleri sütun i'nin genişliğinde; ult kolu i aynı sütunda
      for (let i = 0; i < rules.rows; i++)
        for (const d of rules.rowShape) {
          const p = L.pos[`${i}.${d.id}`]!;
          expect(p.x).toBeGreaterThan(L.colX[i]!);
          expect(p.x).toBeLessThan(L.colX[i]! + L.cw);
        }
      rules.ult.arms.forEach((arm, j) => {
        for (let s = 1; s <= rules.ult.levels.length; s++) {
          const p = L.pos[`${rules.rows}.${arm}${s}`]!;
          expect(p.x).toBeGreaterThan(L.colX[j]!);
          expect(p.x).toBeLessThan(L.colX[j]! + L.cw);
          expect(p.y).toBeGreaterThan(L.ultY0);
        }
      });
      // ağaç alanı: başlık + sıralar + ult bandı toplamı kutuyu aşmaz (sayfa kaymaz)
      expect(L.hh + L.pitch * 6 + L.ultH).toBeLessThanOrEqual(L.H + 1);
      expect(L.tiers[L.tiers.length - 1]!.y + L.tiers[L.tiers.length - 1]!.h).toBeLessThanOrEqual(L.ultY0 + 1);
    });

  it('dokunma kutuları: komşuyla çakışmaz, masaüstünde 44 px, telefonda en iyi çaba (en yüksek değer kayda geçer)', () => {
    const lay = (z: (typeof sizes)[number]) => buildCols(z, rules);
    for (const z of sizes) {
      const L = lay(z);
      const keys = Object.keys(L.pos);
      for (const a of keys)
        for (const b of keys) {
          if (a >= b) continue;
          const dx = Math.abs(L.pos[a]!.x - L.pos[b]!.x);
          const dy = Math.abs(L.pos[a]!.y - L.pos[b]!.y);
          const ox = dx < (L.hit[a]!.w + L.hit[b]!.w) / 2 - 0.01;
          const oy = dy < (L.hit[a]!.h + L.hit[b]!.h) / 2 - 0.01;
          expect(ox && oy, `${z.n}: ${a} / ${b} kutuları çakışıyor`).toBe(false);
        }
    }
    const min = (z: (typeof sizes)[number]) => Math.min(...Object.values(lay(z).hit).map((h) => Math.min(h.w, h.h)));
    expect(min(sizes[0]!)).toBeGreaterThanOrEqual(HIT_GOAL);
    expect(min(sizes[1]!)).toBeGreaterThanOrEqual(HIT_GOAL);
    expect(min(sizes[2]!)).toBeGreaterThanOrEqual(24);
  });

  it('yol: aynı hizada düz; dikeyse dikey, yataysa yatay yumuşak eğri; blood ucu aşağı', () => {
    expect(link({ x: 0, y: 5 }, { x: 10, y: 5 })).toBe('M0,5 L10,5');
    expect(link({ x: 0, y: 0 }, { x: 4, y: 20 })).toBe('M0,0 C0,10 4,10 4,20');
    expect(link({ x: 0, y: 0 }, { x: 20, y: 4 })).toBe('M0,0 C10,0 10,4 20,4');
    expect(deadStub({ x: 10, y: 10 }, 5)).toMatch(/^M10,15 V24/);
  });
});
