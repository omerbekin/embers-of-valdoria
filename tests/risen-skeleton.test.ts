import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';

// Risen Skeleton düşman mobu (campaign-dev 2026-10-28, Ömer onayı, open-questions 448): karşılaşmalar kahramanın çağrısını
// (data/summons) doğrudan birim olarak koymaz; Harita 1'in hazır iskeletleri data/mobs/risen_skeleton. Sayılar veriden okunur.

type Unit = { class: string; name?: string };
type Enc = { units: Unit[]; waves?: { units?: Unit[] }[] };
const dir = new URL('../data/campaign/', import.meta.url);
const files = readdirSync(dir).filter((f) => /encounters.*\.json$/.test(f));
const placed = (e: Enc) => [...e.units, ...(e.waves ?? []).flatMap((w) => w.units ?? [])];
const all = files.flatMap((f) => {
  const data = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Record<string, unknown>;
  return Object.entries(data).filter(([k, v]) => !k.startsWith('_') && v && typeof v === 'object' && Array.isArray((v as Enc).units)).map(([k, v]) => [`${f}:${k}`, v as Enc] as const);
});

describe('karşılaşmalarda çağrı birimi yok; Risen Skeleton ayrı düşman mobu', () => {
  it('hiçbir sefer karşılaşması data/summons birimini doğrudan koymaz', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(all.length).toBeGreaterThan(10);
    for (const [k, e] of all) for (const u of placed(e)) expect(content.summons[u.class], `${k} -> ${u.class}`).toBeUndefined();
  });

  it('risen_skeleton kullanılıyor: Grave Field, Black Cathedral, Burnt Hamlet; adı Risen Skeleton', () => {
    const enc = Object.fromEntries(all.map(([k, e]) => [k.split(':')[1]!, e]));
    for (const k of ['grave_field', 'black_cathedral', 'burnt_hamlet']) expect(placed(enc[k]!).map((u) => u.class), k).toContain('risen_skeleton');
    expect(content.mobs.risen_skeleton!.name).toBe('Risen Skeleton');
  });

  it('mob Bölge II sıradan seviyesinde (STR = Ghoul), çağrı değil; kahraman Skeleton çağrısı ve skill gücü değişmedi', () => {
    const r = content.mobs.risen_skeleton!;
    const g = content.mobs.ghoul!;
    const s = content.summons.skeleton!;
    expect(r.stats.str).toBe(g.stats.str);
    expect(r.stats.str).toBeLessThan(s.stats.str);
    expect(r.tags).toContain('undead');
    expect(r.spriteId).toBe('skeleton');
    expect((r as { summonerScale?: unknown }).summonerScale).toBeUndefined();
    expect(s.skills).toEqual(['skeleton_strike', 'skeleton_slash']);
    // Grave Chanter hâlâ kahraman tarzı Skeleton çağırır
    expect(content.skills.call_the_buried!.effects).toContainEqual(expect.objectContaining({ type: 'summon', unit: 'skeleton' }));
  });
});
