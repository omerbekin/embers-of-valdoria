// Durum sayımı TEK yardımcı (Ömer 2026-10-31): Chilled üstüne gelerek oluşan Frozen, Chilled'a bakan her kuralda Chilled sayılır (Status.countsAs);
// doğrudan uygulanan Frozen sayılmaz. Bir kural "hedefte X var mı" diye bakıyorsa buradan bakar; süre, silme ve yığın işleri gerçek tür üzerinden kalır.
import type { Status } from './types';

export const statusCounts = (s: Pick<Status, 'kind' | 'countsAs'>, kind: unknown): boolean => s.kind === kind || (s.countsAs !== undefined && s.countsAs === kind);

export const statusCountsAny = (s: Pick<Status, 'kind' | 'countsAs'>, kinds: readonly unknown[]): boolean => kinds.includes(s.kind) || (s.countsAs !== undefined && kinds.includes(s.countsAs));
