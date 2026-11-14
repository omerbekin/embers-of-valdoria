/**
 * Haritanın eski Phaser pencereleri (Leave the map?, Resume battle?, harita / hikaye giriş kartı, Farewell, Valdoria Conquered, kasaba kartı...)
 * = DOM Diyalog (Ömer 2026-11-11, "B" seçildi; `openElDialog`, Cloud / hesap pencereleriyle AYNI kod): başlık, altında alt başlık, açıklama, kutulu X, düğmeler sağda.
 * `campaign-ui.ts > openModal` bunu çağırır. Dönen Modal'ın `root`'u görünmez boş bir kapsayıcıdır (Farewell yüzleri gibi sahne süsleri DOM'da çizilmez).
 */
import type Phaser from 'phaser';
import { openElDialog } from './el-dialog';
import { avatarUrlOf } from './hero-bust';
import './map-confirm.css';

export interface MapDialogOpts {
  title: string;
  subtitle?: string;
  text?: string;
  buttons?: Array<{ label: string; primary?: boolean; run: () => void }>;
  onDismiss?: () => void;
  /** Başlığın altında sıralanan kahraman yüzleri (Farewell: aktif kadro). Avatar yoksa sınıf renginde daire. */
  faces?: Array<{ spriteId: string; name: string; color?: string }>;
}
export interface MapDialog {
  root: Phaser.GameObjects.Container;
  close: () => void;
  area: { x: number; y: number; w: number; h: number };
}

const p = (cls: string, text: string): HTMLElement => {
  const e = document.createElement('p');
  e.className = cls;
  e.textContent = text;
  return e;
};

export function openMapDialog(scene: Phaser.Scene, _layer: Phaser.GameObjects.Container, o: MapDialogOpts): MapDialog {
  const dummy = scene.add.container(0, 0).setVisible(false);
  // Alt başlık başlığın hemen altında (eski görünüm), sonra açıklama
  const body: HTMLElement[] = [];
  if (o.subtitle) body.push(p('eld-sub', o.subtitle));
  if (o.faces?.length) {
    const row = document.createElement('div');
    row.className = 'mc-faces';
    for (const f of o.faces) {
      const av = avatarUrlOf(f.spriteId);
      const face = document.createElement(av ? 'img' : 'div');
      face.className = 'mc-face';
      face.setAttribute('title', f.name);
      if (face instanceof HTMLImageElement) {
        face.src = av!;
        face.alt = f.name;
        face.draggable = false;
      } else if (f.color !== undefined) face.style.background = f.color;
      row.append(face);
    }
    body.push(row);
  }
  if (o.text) body.push(p('eld-lead eld-note', o.text));
  const d = openElDialog({
    title: o.title,
    wide: (o.text?.length ?? 0) > 260,
    className: 'eld-confirm map-confirm',
    body,
    buttons: (o.buttons ?? []).map((b) => ({ label: b.label, kind: b.primary ? ('primary' as const) : ('secondary' as const), onClick: () => b.run() })),
    ...(o.onDismiss ? { onDismiss: () => o.onDismiss?.() } : {}),
  });
  return {
    root: dummy,
    close: () => {
      d.close();
      dummy.destroy(true);
    },
    area: { x: 0, y: 0, w: 0, h: 0 },
  };
}
