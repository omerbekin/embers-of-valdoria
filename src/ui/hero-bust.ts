/**
 * Hero / Recruit kartlarının büstü (Ömer 2026-10-19): piksel avatar yerine v2 savaş poz sanatından (assets/poses/<sınıf>-v2/idle1.webp)
 * kırpılmış yüksek çözünürlüklü göğüs-baş görüntüsü. Kırpma koordinatları sınıf başına VERİDE (data/hero-bust.json), koda gömülü değil.
 * Sınıf veride yoksa ya da poz dosyası eksikse eski avatar (assets/avatars) yedeği, o da yoksa boş zemin: oyun çökmez.
 */
import bust from '../../data/hero-bust.json';
import { poseBodyUrl, weaponUrl } from '../game/pose-files';
import { drawPoseComposite, poseClass, resolvePose, type WeaponPick } from '../game/poses';
import { unitWeaponPick } from '../game/pose-weapons';

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
    return `<img class="bust" data-bust="${classId}" src="${b.url}" alt="" draggable="false" style="width:${wPct.toFixed(3)}%;left:${left.toFixed(3)}%;top:${top.toFixed(3)}%">`;
  }
  const av = avatarUrlOf(spriteId);
  return av ? `<img class="av" src="${av}" alt="" draggable="false">` : '';
}

const loadImg = (url: string | null): Promise<HTMLImageElement | null> =>
  new Promise((res) => {
    if (!url) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });

/**
 * Büst + sınıfın varsayılan silahı (savaştaki aynı poz + el noktası: `drawPoseComposite`), tuvale çizilmiş. Silah sprite'ı ya da poz yoksa null
 * (çağıran çıplak büstü bırakır). Tuval poz görselinin tam boyunda; kırpma CSS ile (bustHtml'deki yüzdeler).
 */
export async function bustWithWeapon(classId: string, weaponOverride?: WeaponPick | null): Promise<HTMLCanvasElement | null> {
  const def = poseClass(classId);
  const rect = RECTS[classId];
  if (!def || !rect) return null;
  const pick = weaponOverride ?? unitWeaponPick(classId, null);
  if (!pick) return null;
  // çift el silah (Warrior Dane Axe) tek el pozunda yüzün önüne biniyordu: tutuşa uyan poz takımının dinlenme karesi (çift el = idle2, eller karında)
  const pose = rect.pose === 'idle1' ? resolvePose(def, 'idle', pick.grip) : rect.pose;
  const [body, wpn, off, fingerImg] = await Promise.all([
    loadImg(poseBodyUrl(def.dir, pose)),
    loadImg(weaponUrl(pick.family, pick.look)),
    pick.offhand ? loadImg(weaponUrl(pick.offhand.family, pick.offhand.look)) : Promise.resolve(null),
    def.poses[pose]?.fingers ? loadImg(poseBodyUrl(def.dir, def.poses[pose]!.fingers!)) : Promise.resolve(null),
  ]);
  if (!body || !wpn) return null;
  const c = document.createElement('canvas');
  // kırpma pozun üstünden taşabilir (uzun asa ucu, y < 0): tuval üstten o kadar uzar
  const pad = Math.max(0, Math.ceil(-rect.y));
  c.width = def.canvas.w;
  c.height = def.canvas.h + pad;
  c.dataset['pad'] = String(pad);
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(0, pad);
  drawPoseComposite(ctx, def, pose, body, { img: wpn, pick, offImg: off }, 0, fingerImg);
  return c;
}

/**
 * Kök içindeki çıplak büstleri silahlı hâliyle değiştirir (asenkron). Çıplak büst baştan gizlenir (yer ayrılı kalır), silahlı hâl hazır olunca
 * yumuşakça belirir; silah / poz yüklenemezse çıplak büst gösterilir (yanıp sönme yok, çökme yok).
 */
export function addBustWeapons(root: HTMLElement): void {
  for (const img of root.querySelectorAll<HTMLImageElement>('img.bust[data-bust]')) {
    img.classList.add('pend');
    const classId = img.dataset['bust'] ?? '';
    const rect = RECTS[classId];
    void bustWithWeapon(classId)
      .then((c) => {
        if (!img.isConnected) return;
        if (!c || !rect) return void img.classList.remove('pend');
        const pad = Number(c.dataset['pad'] ?? 0);
        c.className = 'bust arm';
        c.setAttribute('style', img.getAttribute('style') ?? '');
        c.style.top = `${(((-pad - rect.y) / rect.h) * 100).toFixed(3)}%`;
        c.draggable = false;
        img.replaceWith(c);
      })
      .catch(() => img.classList.remove('pend'));
  }
}
