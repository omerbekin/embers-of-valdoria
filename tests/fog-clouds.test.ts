import { describe, expect, it } from 'vitest';
import { basePuffs, placePuffs, puffHits, roadRects, type Rect } from '../src/game/fog-clouds';
import { getMap, nodeVisibility } from '../src/campaign';

const W = 1920;
const H = 1080;

describe('sefer haritası sis bulutları', () => {
  it('açık alana değen parça dışarı itilir ya da atılır; değmeyen yerinde kalır', () => {
    const clear: Rect = { x0: 900, y0: 500, x1: 1100, y1: 620 };
    const near = basePuffs('x', 1000, 560);
    expect(near.some((p) => puffHits(p, clear))).toBe(true);
    const placed = placePuffs(near, [clear]);
    for (const p of placed) expect(puffHits(p, clear)).toBe(false);
    const far = basePuffs('x', 200, 200);
    expect(placePuffs(far, [clear])).toEqual(far);
  });

  it('valdoria: her durakta gidilebilir düğümler, adları ve yolları bulutsuz', () => {
    const map = getMap('valdoria');
    const pos = (id: string) => {
      const n = map.nodes.find((m) => m.id === id)!;
      return { x: n.pos[0] * W, y: n.pos[1] * H };
    };
    for (const at of map.nodes) {
      const vis = nodeVisibility(map, { at: at.id, path: [] });
      const clear: Rect[] = [];
      for (const n of map.nodes) {
        const v = vis[n.id];
        if (v !== 'near' && v !== 'current') continue;
        const p = pos(n.id);
        // sahnedeki gibi: düğüm + ad (en geniş ad ~ 300 px) + alt yazı; ad üstte ya da altta
        const above = n.label === 'above';
        clear.push({ x0: p.x - 150, x1: p.x + 150, y0: p.y - 32 - (above ? 64 : 0), y1: p.y + 32 + (above ? 0 : 64) });
      }
      for (const e of map.edges.filter((e) => e.from === at.id && vis[e.to] === 'near')) {
        const a = pos(e.from);
        const b = pos(e.to);
        const pts = Array.from({ length: 49 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 48, y: a.y + ((b.y - a.y) * i) / 48 }));
        clear.push(...roadRects(pts));
      }
      for (const n of map.nodes) {
        const v = vis[n.id];
        if (v !== 'fog' && v !== 'goal') continue;
        const p = pos(n.id);
        for (const q of placePuffs(basePuffs(n.id, p.x, p.y), clear)) {
          for (const r of clear) expect(puffHits(q, r), `durak ${at.id}: ${n.id} bulutu açık alana değiyor`).toBe(false);
        }
      }
    }
  });
});
