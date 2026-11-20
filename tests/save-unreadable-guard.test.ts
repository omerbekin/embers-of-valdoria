import { afterEach, describe, expect, it } from 'vitest';
import {
  autoResolve,
  claimSlot,
  CORRUPT_KEY,
  markPlayed,
  memoryKV,
  newCampaign,
  onSaveFail,
  pickHero,
  readSaves,
  SAVE_KEY,
  SAVE_VERSION,
  writeCheckpointSave,
  writeSave,
  type SaveFailReason,
} from '../src/campaign';
import { wrapKV } from '../src/game/kv-storage';
import { deletedSlots, readTombstones } from '../src/cloud/tombstones';

/**
 * Sağlamlık taraması A1 (2026-11-15): okunamayan sefer dosyası (daha yeni sürüm ya da yarım JSON) bir sonraki kayıtta ezilmez,
 * buluta silme işareti (tombstone) gitmez. Daha yeni sürümde yazılmaz; bozuk dosyanın ham dizgisi önce CORRUPT_KEY'e kopyalanır.
 */
const st = (seed: number, slot: number) => autoResolve(pickHero(newCampaign({ mode: 'normal', seed, slot, difficulty: 'medium', campaignId: `c${seed}` }), 'druid'));

/** Üç yuvası dolu dosya (bu sürümle yazılmış), ham dizgi. */
function threeSlots(): string {
  const kv = memoryKV();
  for (let i = 0; i < 3; i++) writeSave(kv, st(10 + i, i), 'manual', '2026-11-01T10:00:00Z');
  return kv.getItem(SAVE_KEY)!;
}

const fails: SaveFailReason[] = [];
let off: (() => void) | null = null;
afterEach(() => {
  off?.();
  off = null;
  fails.length = 0;
});

describe('okunamayan kayıt dosyası korunur (save.ts > write)', () => {
  it('daha yeni sürüm (v15): hiçbir yazım dosyaya dokunmaz, tombstone yok, uyarı nedeni "newer"', () => {
    off = onSaveFail((w) => void fails.push(w));
    const raw = memoryKV();
    const v15 = JSON.stringify({ ...JSON.parse(threeSlots()), version: SAVE_VERSION + 1 });
    raw.setItem(SAVE_KEY, v15);
    const kv = wrapKV(raw);
    expect(readSaves(kv).newer).toBe(true);
    expect(writeSave(kv, st(10, 0), 'auto').ok).toBe(false);
    expect(writeCheckpointSave(kv, st(10, 0))).toBe(false);
    expect(claimSlot(kv, st(99, 1))).toBe(false);
    markPlayed(kv, 2);
    expect(raw.getItem(SAVE_KEY)).toBe(v15);
    expect(readTombstones(raw)).toEqual([]);
    expect(fails.length).toBeGreaterThan(0);
    expect(new Set(fails)).toEqual(new Set(['newer']));
  });

  it('yarım JSON: yazımdan önce ham dizgi CORRUPT_KEY\'e kopyalanır, tombstone yok', () => {
    const raw = memoryKV();
    const half = threeSlots().slice(0, 4000);
    raw.setItem(SAVE_KEY, half);
    const kv = wrapKV(raw);
    expect(readSaves(kv).corrupt).toBe(true);
    expect(writeSave(kv, st(10, 0), 'auto').ok).toBe(true);
    expect(raw.getItem(CORRUPT_KEY)).toBe(half);
    expect(readTombstones(raw)).toEqual([]);
    expect(readSaves(kv).corrupt).toBe(false);
  });

  it('kopya yazılamazsa (depo dolu) bozuk dosyanın üstüne yazılmaz', () => {
    off = onSaveFail((w) => void fails.push(w));
    const raw = memoryKV();
    raw.setItem(SAVE_KEY, '{"version":14,"slots":[');
    const full = { ...raw, getItem: raw.getItem.bind(raw), removeItem: raw.removeItem.bind(raw), setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(writeSave(full, st(10, 0), 'auto').ok).toBe(false);
    expect(raw.getItem(SAVE_KEY)).toBe('{"version":14,"slots":[');
    expect(fails).toEqual(['storage']);
  });

  it('sağlam dosyada eskisi gibi: yazım yapılır, CORRUPT_KEY oluşmaz, dinleyici çağrılmaz', () => {
    off = onSaveFail((w) => void fails.push(w));
    const raw = memoryKV();
    raw.setItem(SAVE_KEY, threeSlots());
    const kv = wrapKV(raw);
    expect(writeSave(kv, st(10, 0), 'auto').ok).toBe(true);
    expect(readSaves(kv).file.slots.map((s) => !!s)).toEqual([true, true, true]);
    expect(raw.getItem(CORRUPT_KEY)).toBeNull();
    expect(fails).toEqual([]);
  });

  it('tombstones.ts > deletedSlots: önceki dosya yazandan yeni ya da sürümsüzse silme işareti yok', () => {
    const now = '2026-11-15T00:00:00Z';
    const prev = JSON.parse(threeSlots()) as { version: number; slots: unknown[] };
    const next = JSON.stringify({ ...prev, slots: [prev.slots[0], null, null] });
    expect(deletedSlots(JSON.stringify({ ...prev, version: SAVE_VERSION + 1 }), next, now)).toEqual([]);
    expect(deletedSlots(JSON.stringify({ slots: prev.slots }), next, now)).toEqual([]);
    expect(deletedSlots(JSON.stringify(prev), next, now).map((t) => t.slot)).toEqual([1, 2]); // aynı sürüm: eskisi gibi
  });

  it('tek yuvası bozuk dosya (campaignId var, mode bozuk): yazımda o yuva için tombstone yok, ham kopya alınır', () => {
    const raw = memoryKV();
    const f = JSON.parse(threeSlots()) as { slots: Array<Record<string, unknown>> };
    f.slots[1] = { ...f.slots[1], mode: 'weird' };
    const bad = JSON.stringify(f);
    raw.setItem(SAVE_KEY, bad);
    const kv = wrapKV(raw);
    expect(writeSave(kv, st(10, 0), 'auto').ok).toBe(true);
    expect(readTombstones(raw)).toEqual([]);
    expect(raw.getItem(CORRUPT_KEY)).toBe(bad);
    expect(readSaves(kv).file.slots.map((s) => !!s)).toEqual([true, false, true]);
  });
});
