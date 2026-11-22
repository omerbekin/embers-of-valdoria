/**
 * Kahraman kartının skill alanı (Ömer 2026-11-11, "V3" seçildi): solda pasif madalyonu (ayrı sütun), sağda dört skill 2x2 yatay plaka
 * (ikon + ad + bedel + bekleme); 4. skill "Ultimate" etiketli, turuncu-kızıl. Pasif her zaman 1. sırada (kural).
 * Kullanan: hero-card.ts (Choose your hero seçicisi, Recruit penceresi). Savaş alt çubuğu ve Quick Battle plakaları BAŞKA bileşendir (skill-bar.ts).
 */
import { content } from '../engine';
import { ownerOfSkill, ownerOfUnit } from '../game/asset-versions';
import { iconUrl } from './dom-icons';
import { classSkills, skillRow } from './gear-skills';
import { skillIconName } from './mob-icons';
import { uiIconName } from './ui-icons';
import './hero-card-skills.css';

/** Plaka verisi. `key` (skill kimliği / 'passive') ve `tip` (gizli ipucu HTML'i, `.bh-sktip`) verilirse Gear Sheet'in yüzen skill ipucu çalışır. */
export interface SkData {
  name: string;
  key?: string;
  tip?: string;
  iconUrl: string;
  kind: '' | 'pas' | 'ult';
  cost?: string;
  cd?: string;
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** Bir sınıfın skill listesi: pasif önce, sonra 4 skill (4. = Ultimate). */
function classSkillData(classId: string): SkData[] {
  const def = content.classes[classId];
  if (!def) return [];
  const { skills, passive } = classSkills(classId);
  const out: SkData[] = [];
  if (passive) out.push({ name: passive.name, iconUrl: iconUrl(passive.icon || uiIconName('passive'), def.color, ownerOfUnit(classId)), kind: 'pas', key: 'passive' });
  skills.slice(0, 4).forEach((s, i) => {
    const r = skillRow(s, def.stats);
    out.push({ name: s.name, key: s.id, iconUrl: iconUrl(skillIconName(s), s.fx, ownerOfSkill(s.id)), kind: i === 3 ? 'ult' : '', cost: r.cost, cd: r.cooldown });
  });
  return out;
}

function plate(d: SkData): string {
  const tag = d.kind === 'pas' ? 'Passive' : d.kind === 'ult' ? 'Ultimate' : '';
  const ic = `<div class="ic">${d.iconUrl ? `<img src="${esc(d.iconUrl)}" alt="" draggable="false">` : ''}</div>`;
  const cost = d.cost ? `<span class="chip">${esc(d.cost)}</span>` : '';
  const cd = d.cd ? `<span class="chip cd">${esc(d.cd)}</span>` : '';
  const free = !d.cost && !d.cd && d.kind !== 'pas' ? '<span class="chip free">Free</span>' : '';
  // ipucu verilmişse (Gear Sheet): tarayıcı title'ı yok, yüzen ipucu `.bh-sktip` kopyasından açılır (character-panel.ts > skillStrip)
  const title = d.tip || d.key ? '' : ` title="${esc(d.name)}"`;
  const key = d.key ? ` data-skill="${esc(d.key)}"` : '';
  const tip = d.tip ? `<div class="bh-sktip bh-panel bh-corners">${d.tip}</div>` : '';
  return `<div class="hsk ${d.kind}"${title}${key}>${tag ? `<span class="tg">${tag}</span>` : ''}${ic}<div class="tx"><span class="sn">${esc(d.name)}</span><span class="cs">${cost}${cd}${free}</span></div>${tip}</div>`;
}

/** Bir sınıfın skill alanı (pasif solda ayrı sütun, 4 skill sağda 2x2). */
export function heroSkillRowHtml(classId: string): string {
  return heroSkillRowHtmlFrom(classSkillData(classId));
}

/** Aynı skill alanı hazır veriden (Gear Sheet sekmesi: ağaçla değişmiş ad / ikon, bedel ve ipucu; Ömer 2026-11-12). Pasif yine 1. sırada. */
export function heroSkillRowHtmlFrom(all: SkData[]): string {
  const pas = all.filter((s) => s.kind === 'pas');
  const rest = all.filter((s) => s.kind !== 'pas');
  return `<div class="hp-sks"><div class="g-pas">${pas.map(plate).join('')}</div><div class="g-rest">${rest.map(plate).join('')}</div></div>`;
}
