/**
 * Sefer ekranlarının GLOBAL Gear + Formation ikonları (Ömer 2026-10-18, taslak enc=map / town): sol altta, yazısız ikon düğmeleri; harita, kasaba
 * ve tüccar ekranında aynı yer. Bir pencere / menü açıkken gizlenir. Parlama (glow): Gear = harcanmamış stat puanı var; Formation = "Arrange your
 * formation" ipucu açık (ya da zorunlu Formation kapısı); parlama sebep bitince söner. Ekran yalnızca durumu bildirir (`setGlow`, `setHidden`).
 * Üstüne gelince / uzun basınca kısa ipucu (ad). Dokunma hedefi >= 44 px. Oyun içi metinler İngilizce.
 */
import './camp-hud.css';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName, type UiIconKind } from './ui-icons';

export interface CampHud {
  setGlow(which: 'gear' | 'formation', on: boolean): void;
  /** Bir kez güçlü çak (ör. kapıya dokunuldu). */
  pulse(which: 'gear' | 'formation'): void;
  setHidden(hidden: boolean): void;
  destroy(): void;
}

export interface CampHudHooks {
  gear: () => void;
  formation: () => void;
}

const button = (kind: 'gear' | 'formation', label: string, tip: string, run: () => void): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `camp-ib camp-${kind}`;
  b.title = tip;
  b.setAttribute('aria-label', label);
  const k: UiIconKind = kind;
  if (hasUiImage(k)) {
    const img = document.createElement('img');
    img.src = iconUrl(uiIconName(k));
    img.alt = '';
    img.draggable = false;
    b.append(img);
  } else b.textContent = label;
  b.addEventListener('click', run);
  return b;
};

export function mountCampHud(root: HTMLElement, h: CampHudHooks): CampHud {
  const box = document.createElement('div');
  box.className = 'camp-hud';
  const gear = button('gear', 'Gear', 'Gear: heroes and bag (C)', h.gear);
  const form = button('formation', 'Formation', 'Formation: who stands in front', h.formation);
  box.append(gear, form);
  root.append(box);
  const of = (w: 'gear' | 'formation'): HTMLElement => (w === 'gear' ? gear : form);
  return {
    setGlow: (w, on) => {
      if (of(w).classList.contains('glow') !== on) of(w).classList.toggle('glow', on);
    },
    pulse: (w) => {
      const b = of(w);
      b.classList.remove('pulse');
      void b.offsetWidth;
      b.classList.add('pulse');
    },
    setHidden: (hidden) => {
      if (box.classList.contains('off') !== hidden) box.classList.toggle('off', hidden);
    },
    destroy: () => box.remove(),
  };
}
