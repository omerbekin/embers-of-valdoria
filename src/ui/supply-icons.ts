// Malzeme (Supplies) ikonları: boyalı görsel assets/supplies/<id>.webp (Lead 2026-11-07, 2x2 sayfadan kesilir); dosya yoksa satır içi SVG yedeği (eski geçici ikonlar).
const IMAGES = import.meta.glob('../../assets/supplies/*.{webp,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const imageUrl = (id: string): string | undefined => Object.entries(IMAGES).find(([path]) => (path.split('/').pop() ?? '').replace(/\.[^.]+$/, '') === id)?.[1];
// Her biri tek kalın nesne: kırmızı şişe (heal), altın-yeşil şişe (greater heal), sarı bandaj (cure wound), kor haçı (revive).
const FLASK = (liquid: string, rim: string): string =>
  `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 6h10v3l-1 1v8l9 17c1.5 3-.5 6-4 6H15c-3.5 0-5.5-3-4-6l9-17v-8l-1-1z" fill="#1c1410" stroke="${rim}" stroke-width="2.2" stroke-linejoin="round"/><path d="M14.5 33l5-9.5h9l5 9.5c.8 1.6-.2 3.5-2.2 3.5H16.700c-2 0-3-1.900-2.2-3.5z" fill="${liquid}"/><rect x="18" y="4" width="12" height="4" rx="1.500" fill="${rim}"/></svg>`;
const BANDAGE = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="16" width="36" height="16" rx="3" transform="rotate(-20 24 24)" fill="#e9d8a6" stroke="#b9954a" stroke-width="2"/><rect x="19" y="14" width="10" height="20" transform="rotate(-20 24 24)" fill="#c9a24a" opacity=".55"/><circle cx="24" cy="24" r="4" fill="#9b2c1c"/></svg>`;
const REVIVE = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 6h8v14h14v8H28v14h-8V28H6v-8h14z" fill="#1c1410" stroke="#f3d999" stroke-width="2.2" stroke-linejoin="round"/><circle cx="24" cy="24" r="5" fill="#e0702a"/></svg>`;

const ICONS: Record<string, string> = {
  heal: FLASK('#c0392b', '#d9b36a'),
  greater_heal: FLASK('#7fbf4d', '#f3d999'),
  cure_wound: BANDAGE,
  revive_ally: REVIVE,
};

/** Malzemenin ikonu (boyalı <img>, yoksa satır içi SVG); bilinmeyen id boş kutu. */
export const supplyIconSvg = (id: string): string => {
  const url = imageUrl(id);
  return url ? `<img src="${url}" alt="" draggable="false" style="width:100%;height:100%;object-fit:contain">` : (ICONS[id] ?? FLASK('#888', '#ccc'));
};
