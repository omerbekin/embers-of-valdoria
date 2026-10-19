/**
 * Hero / Recruit kartlarının büstü (Ömer 2026-10-19): piksel avatar yerine v2 savaş poz sanatından (assets/poses/<sınıf>-v2/idle1.webp)
 * kırpılmış yüksek çözünürlüklü göğüs-baş görüntüsü. Kırpma koordinatları sınıf başına VERİDE (data/hero-bust.json), koda gömülü değil.
 * Sınıf veride yoksa ya da poz dosyası eksikse eski avatar (assets/avatars) yedeği, o da yoksa boş zemin: oyun çökmez.
 */
import bust from '../../data/hero-bust.json';

interface BustRect {
  pose: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sw: number;
  sh: number;
}

const poses = import.meta.glob('../../assets/poses/*-v2/idle1.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const avatars = import.meta.glob('../../assets/avatars/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const RECTS = (bust as unknown as { classes: Record<string, BustRect> }).classes;

/** Kırpılmış büstün görsel adresi ve kırpma kutusu (yoksa null). */
export function bustSource(classId: string): { url: string; rect: BustRect } | null {
  const rect = RECTS[classId];
  if (!rect) return null;
  const url = poses[`../../assets/poses/${classId}-v2/${rect.pose}.webp`];
  return url ? { url, rect } : null;
}

export const avatarUrlOf = (spriteId: string): string | null => avatars[`../../assets/avatars/${spriteId}.webp`] ?? null;

/**
 * Kart portresinin iç HTML'i (kapsayıcı `.pt` dışarıda; en-boy oranı 1 : .85 sabit, kırpma kutuları buna göre veride).
 * Büst kapsayıcıya göre yüzde ile kaydırılır / ölçeklenir (yeniden boyutlanınca bozulmaz).
 */
export function bustHtml(classId: string, spriteId: string): string {
  const b = bustSource(classId);
  if (b) {
    const { rect: r } = b;
    const wPct = (r.sw / r.w) * 100;
    const left = -(r.x / r.w) * 100;
    const top = -(r.y / r.h) * 100;
    return `<img class="bust" src="${b.url}" alt="" draggable="false" style="width:${wPct.toFixed(3)}%;left:${left.toFixed(3)}%;top:${top.toFixed(3)}%">`;
  }
  const av = avatarUrlOf(spriteId);
  return av ? `<img class="av" src="${av}" alt="" draggable="false">` : '';
}
