/**
 * Zemin rozeti kuralı (Ömer onaylı, 2026-11-01): bir zemin birimin altındayken verdiği durum zaten görünüyorsa zeminin kendi rozeti çizilmez;
 * zeminin adı o durumun EFFECTS satırında "from <Zemin adı>" olarak yazılır. Durum vermeyen zemin kendi rozetini ve kendi EFFECTS satırını korur.
 * Saf yardımcı (Phaser yok): rozet listesi (sıcak yol + telefon planı) ve birim kartı aynı listeyi kullanır.
 */

export interface GroundBadgeIn {
  /** Zemin örnek kimliği (GroundEffect.id). */
  id: string;
  /** Zemin türü (grounds.json anahtarı). */
  ground: string;
  /** Oyun içi ad ("Burning Ground"). */
  name: string;
  /** Kalan tur. */
  turns: number;
  /** Bu zeminin verdiği durum türleri (Battle.groundGrants). */
  grants: string[];
}

export interface ShownStatusIn {
  kind: string;
  /** Durumu veren zemin örneği (Status.fromGround). */
  fromGround?: string;
  /** Durumu veren zemin türü (Status.groundKind). */
  groundKind?: string;
}

export interface GroundBadgePlan {
  /** Kendi rozetini çizen (durum vermeyen ya da verdiği durum görünmeyen) zeminler. */
  badges: GroundBadgeIn[];
  /** Durum türü -> kaynak zemin adı ("from <ad>" satırı için). */
  statusSource: Map<string, string>;
}

/** `shown` birimin şu an görünen durumları; `nameOf` zemin türünden ad (durumun kaynak zemini listede olmayabilir). */
export function planGroundBadges(grounds: readonly GroundBadgeIn[], shown: readonly ShownStatusIn[], nameOf: (ground: string) => string): GroundBadgePlan {
  const statusSource = new Map<string, string>();
  for (const st of shown) {
    if (!st.fromGround) continue;
    const g = grounds.find((x) => x.id === st.fromGround);
    const name = g?.name ?? (st.groundKind ? nameOf(st.groundKind) : '');
    if (name) statusSource.set(st.kind, name);
  }
  const badges = grounds.filter((g) => !g.grants.some((k) => shown.some((st) => st.kind === k && !!st.fromGround)));
  return { badges, statusSource };
}

/** "3 turns" / "1 turn" (birim kartı süre yazısı). */
export function groundTurnsText(turns: number): string {
  return `${turns} turn${turns === 1 ? '' : 's'}`;
}

/** Durum vermeyen zeminin EFFECTS satırı açıklaması (veride zemin metni yok: elementten kısa cümle; şifa zemini ayrı). */
export function groundCardText(def: { element?: string; heal?: boolean } | undefined): string {
  if (def?.heal) return 'Heals its caster\'s allies standing here';
  const el = def?.element ? `${def.element.charAt(0).toUpperCase()}${def.element.slice(1)} ground` : 'Ground effect';
  return `${el} underfoot`;
}
