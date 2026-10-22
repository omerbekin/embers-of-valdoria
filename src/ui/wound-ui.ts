// Yara arayüzü (DOM; Ömer 2026-10-23, mockup wounds V1 "Scar + dots"): HP çubuğunun sağ ucunda koyu kırmızı taralı "yara bölümü" (scar; her yara maks canın
// %20'si), 3 küçük elmas nokta (dolu = yara) ve A Band ipucu. Sayılar kuraldan (src/progression/wounds.ts); motor / kural burada yok.
// Ipucu `data-band` (BandTipSpec JSON) ile item-drag.ts ortak ipucu sistemine bağlanır. Phaser eşi: CampaignMapScene > woundBar.
import './wound-ui.css';
import type { BandTipSpec } from './band-tip';
import { woundHpFactor, woundTipData, type WoundRules } from '../progression/wounds';

export interface WoundCfg {
  rules: WoundRules;
  /** Kasaba dinlenmesi yara siler (sefer). */
  town: boolean;
}

/** Yara ipucu belirtimi (A Band); yarasızsa null. Başlık tek satır (`nowrapTitle`). */
export function woundBandSpec(wounds: number, cfg: WoundCfg, baseHp?: number): BandTipSpec | null {
  const d = woundTipData(wounds, cfg.rules, { ...(baseHp !== undefined ? { baseHp } : {}), town: cfg.town });
  if (!d) return null;
  return {
    kind: 'Wounds',
    title: d.title,
    value: d.value,
    valueLabel: d.valueLabel,
    accent: '#c8503c',
    titleColor: '#e8806a',
    valueColor: '#e8806a',
    nowrapTitle: true,
    chips: [...(d.maxHp ? [{ text: d.maxHp, ...(d.maxed ? { tone: 'warn' as const } : {}) }] : []), ...(d.maxed ? [{ text: 'Maximum', tone: 'warn' as const }] : [])],
    lines: d.lines.map((text) => ({ text })),
    ...(d.foot ? { foot: d.foot } : {}),
    noKeywords: false,
  };
}

/** Çubuk üstü: yaraların götürdüğü maks can bölümü (genişlik = kayıp oranı). Yarasızsa null. */
export function woundScarEl(wounds: number, cfg: WoundCfg): HTMLElement | null {
  const loss = 1 - woundHpFactor(wounds, cfg.rules);
  if (wounds <= 0 || loss <= 0) return null;
  const b = document.createElement('b');
  b.className = 'wd-scar';
  b.style.width = `${Math.round(loss * 1000) / 10}%`;
  return b;
}

/** Elmas noktalar (toplam = ölümcül sınır; dolu = yara). */
export function woundPipsEl(wounds: number, cfg: WoundCfg): HTMLElement {
  const box = document.createElement('span');
  box.className = 'wd-pips';
  const total = Math.max(1, Math.floor(cfg.rules.lethal));
  for (let i = 0; i < total; i++) {
    const p = document.createElement('i');
    p.className = `wd-pip${i < wounds ? ' on' : ''}${wounds >= total ? ' max' : ''}`;
    box.append(p);
  }
  return box;
}

/** İpucu + elmas nokta çipi (başlık satırı); yarasızsa null (gizli). */
export function woundChipEl(wounds: number, cfg: WoundCfg, baseHp?: number): HTMLElement | null {
  const spec = woundBandSpec(wounds, cfg, baseHp);
  if (!spec) return null;
  const chip = document.createElement('span');
  chip.className = 'wd-chip';
  chip.dataset['band'] = JSON.stringify(spec);
  chip.setAttribute('aria-label', `${spec.title}, ${spec.value} max HP`);
  chip.append(woundPipsEl(wounds, cfg));
  return chip;
}
