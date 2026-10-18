/**
 * BOŞ YUVA SİMGELERİ (Ömer 2026-10-18, ortak envanter v3): ChatGPT ile çizilmiş, Ömer onaylı soluk simgeler. Dosyalar
 * assets/ui-icons/slots/<yuva>.png (+ aynı adlı .webp; oyun WebP yükler, tools/webp-assets.mjs), asıl sayfa assets/source/ui-icons/gear-slots-sheet.png.
 * Boş yuvada ~%36 opaklıkla durur (gear.css > .gr-slot-ico). Dosya yoksa çağıran eski kodla çizilen gölge simgeye düşer.
 */
import type { SlotId } from '../progression';

const files = import.meta.glob('../../assets/ui-icons/slots/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Yuva -> görsel adresi. */
export const SLOT_ICON_FILES: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(files).map(([p, url]) => [(p.split('/').pop() ?? '').replace(/\.webp$/, ''), url]));

/** Boş yuvanın boyalı simgesi (yoksa null). */
export const slotIconUrl = (slot: SlotId | string): string | null => SLOT_ICON_FILES[slot] ?? null;
