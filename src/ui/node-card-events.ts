/**
 * Olay düğümü kartı (Ömer 2026-11-14: E1 Ribbon seçildi; sahnede arka plan yerine olayın kendi resmi; yanında tür rozeti).
 * Kart iskeleti (madalyon, başlık, lore, düğme) ortak; olay parçası = aile madalyonu + aile renginde çerçeveli sahne şeridi + üstte aile kurdelesi.
 * Şeridin ortasında olayın resmi (assets/campaign/events/<olay>.webp, tools/make-event-art.mjs); resmi yoksa eski arka plan.
 * Tür rozeti (köşede, küçük): görev olayında görevin sınıf ikonu, hikâye olayında (seçeneksiz, yalnız okunan) taç mührü, diğerlerinde yok.
 * Yalnız GÖSTERİM: kural yok, kartta ödül / seçenek / sonuç yazmaz. Blessing veren olayda yalnız gizli sürpriz ikonu görünür (karşı köşe).
 */
import './node-card-events.css';
import { EVENTS, MAPS } from '../campaign/data';
import { QUESTS } from '../campaign/quests';
import { miscImage } from '../game/icon-image-files';

export type EventFamilyId = 'shrine' | 'bargain' | 'folk' | 'toll' | 'storm' | 'lore';

export interface EventFamily {
  id: EventFamilyId;
  /** Kısa etiket (E1 kurdelesi). */
  tag: string;
  /** Aile rengi (vurgu). */
  color: string;
  rgb: string;
  /** Madalyon / sürgü ikonu (assets/misc-icons, '<grup>:<ad>'). */
  sigil: string;
}

export const EVENT_FAMILIES: Record<EventFamilyId, EventFamily> = {
  shrine: { id: 'shrine', tag: 'Sacred', color: '#f0d58a', rgb: '240,213,138', sigil: 'relic:pilgrims_bell' },
  bargain: { id: 'bargain', tag: 'Wager', color: '#b88cd8', rgb: '184,140,216', sigil: 'codex:mech_gamble' },
  folk: { id: 'folk', tag: 'Wayfarers', color: '#8fc48a', rgb: '143,196,138', sigil: 'emblem:feast' },
  toll: { id: 'toll', tag: 'Passage', color: '#d9774a', rgb: '217,119,74', sigil: 'relic:banner_of_the_bridge' },
  storm: { id: 'storm', tag: 'Tempest', color: '#8ab8e0', rgb: '138,184,224', sigil: 'ground:storm' },
  lore: { id: 'lore', tag: 'Ruin', color: '#6fc0b8', rgb: '111,192,184', sigil: 'codex:nav_lessons' },
};

/** Olay -> aile + sahne (assets/backgrounds ya da kampanya penceresi görseli). Her olay tam bir ailede (test: tests/node-card-events.test.ts). */
export const EVENT_LOOK: Record<string, { family: EventFamilyId; bg?: string; win?: string }> = {
  // Sacred: tapınak, çan, yemin, vaaz
  dr_wayshrine: { family: 'shrine', bg: 'pilgrim-road' },
  dr_saltspray_shrine: { family: 'shrine', bg: 'wreck-cliffs' },
  dr_monks_isle: { family: 'shrine', bg: 'siren-rocks' },
  dr_vesper: { family: 'shrine', bg: 'sunken-court' },
  hc_shrine_of_the_hearth: { family: 'shrine', bg: 'forge-heart' },
  hc_sermon_hall: { family: 'shrine', bg: 'deep-halls' },
  hc_hall_of_oaths: { family: 'shrine', bg: 'kharduin' },
  // Wager: pazarlık, kumar, borç, takas
  witchs_hut: { family: 'bargain', win: 'witchs_hut' },
  dr_quest_table: { family: 'bargain', bg: 'storm-deck' },
  dr_quest_debt: { family: 'bargain', bg: 'saltmere-docks' },
  dr_stilt_hamlet: { family: 'bargain', bg: 'saltmarsh' },
  dr_fishmarket: { family: 'bargain', bg: 'saltmere-docks' },
  // Wayfarers: yoldaki insanlar
  shepherds_fold: { family: 'folk', win: 'shepherds_fold' },
  dr_floodplain_farms: { family: 'folk', bg: 'misty-marsh' },
  dr_widows_watch: { family: 'folk', bg: 'storm-deck' },
  dr_quest_roost: { family: 'folk', bg: 'wreck-cliffs' },
  // Passage: yol kesenler, geçiş, kapı, asansör
  dr_smugglers_reeds: { family: 'toll', bg: 'saltmarsh' },
  hc_clan_steading: { family: 'toll', bg: 'snowline' },
  hc_stone_gate: { family: 'toll', bg: 'iron-pass' },
  hc_broken_lift: { family: 'toll', bg: 'deep-halls' },
  dr_ferry_office: { family: 'toll', bg: 'saltmere-docks' },
  dr_guild_hall: { family: 'toll', bg: 'castle-hall' },
  // Tempest: fırtına, karanlık, deniz feneri
  hc_white_dark: { family: 'storm', bg: 'glacier' },
  dr_lantern_rock: { family: 'storm', bg: 'ruined-watchtower' },
  hc_lantern_gallery: { family: 'storm', bg: 'deep-halls' },
  // Ruin: kalıntı, kütüphane, taç, günlük, hayalet kayıt
  dr_flooded_library: { family: 'lore', bg: 'sunken-court' },
  dr_sunken_stair: { family: 'lore', bg: 'siren-rocks' },
  dr_two_crowns: { family: 'lore', bg: 'sunken-court' },
  hc_crown_gallery: { family: 'lore', bg: 'castle-hall' },
  hc_mend_or_quench: { family: 'lore', bg: 'forge-heart' },
  hc_morvanes_bivouac: { family: 'lore', bg: 'snowline' },
  dr_quest_registry: { family: 'lore', bg: 'grave-field' },
};

/** Verisinde blessing geçen olay (şimdilik yalnız Wayshrine sonucu): kartta ad / etki yok, yalnız gizli sürpriz ikonu. */
export function eventHasBlessing(id: string): boolean {
  const e = EVENTS[id];
  return !!e && /blessing/i.test(JSON.stringify(e));
}

const artFiles = import.meta.glob('../../assets/campaign/events/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const ART: Record<string, string> = Object.fromEntries(Object.entries(artFiles).map(([p, u]) => [(p.split('/').pop() ?? '').replace('.webp', ''), u]));
/** Olayın kendi resmi (yoksa undefined). */
export const eventArtUrl = (id: string): string | undefined => ART[id];

/** Görev olayının sınıfı: olayı gösteren düğümün `quest`'i ya da seçeneğin `quest`'i -> data/campaign/quests.json > class (sabit eşleme yok). */
export function eventQuestClass(id: string): string | undefined {
  for (const m of Object.values(MAPS)) {
    const n = m.nodes.find((x) => x.event === id && x.quest);
    if (n) return QUESTS[n.quest!]?.class;
  }
  const c = EVENTS[id]?.choices?.find((x) => x.quest);
  return c?.quest ? QUESTS[c.quest]?.class : undefined;
}

/**
 * Hikâye olayı: seçeneği yok, görev değil ve savaş / sınav penceresi değil (Wayshrine sınavı kazanılınca açılan pencere: düğümde karşılaşma / shrine var).
 * Yalnız okunur.
 */
export function eventIsStory(id: string): boolean {
  const e = EVENTS[id];
  if (!e || (e.choices?.length ?? 0) > 0 || eventQuestClass(id)) return false;
  const nodes = Object.values(MAPS).flatMap((m) => m.nodes.filter((n) => n.event === id));
  return nodes.length > 0 && nodes.every((n) => !n.encounter && !n.shrine && !n.quest);
}

// debug örnek düğmeleri (Debug > Campaign > Node card > Event card - ...): kartta hangi olay gösterilsin
type Art = { bg?: string; win?: string; pos?: [number, number] };

/** Parçanın ihtiyaç duyduğu küçük yardımcılar (node-card.ts'ten verilir; döngüsel içe aktarma yok). */
export interface EventKit {
  paint: (node: HTMLElement, art: Art | undefined) => boolean;
  h: (tag: 'div' | 'p' | 'i' | 'span', cls?: string, html?: string) => HTMLElement;
}

const iconUrl = (name: string): string => miscImage(name)?.url ?? '';
const ic = (name: string): string => {
  const u = iconUrl(name);
  return u ? `<img src="${u}" alt="" draggable="false">` : '';
};

/** Taç mührü (hikâye rozeti): küçük SVG, altın. */
const CROWN_SEAL = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.2" fill="#1a1008" stroke="#e6c675" stroke-width="1.6"/><circle cx="16" cy="16" r="11.4" fill="none" stroke="#e6c675" stroke-opacity=".45" stroke-width=".8"/><path d="M8.6 21.4 L7.6 11.6 L12.6 15.4 L16 9.2 L19.4 15.4 L24.4 11.6 L23.4 21.4 Z" fill="#e6c675"/><rect x="8.8" y="22.4" width="14.4" height="2" rx=".6" fill="#e6c675"/></svg>`;

/** Madalyonda aile sigili (olay kartı). */
export function eventMedalIcon(eventId: string | undefined): string | undefined {
  const look = eventId ? EVENT_LOOK[eventId] : undefined;
  return look ? iconUrl(EVENT_FAMILIES[look.family].sigil) || undefined : undefined;
}

/** Olay kartı parçası; bilinmeyen olay null (eski görünüm kalır). */
export function eventPiece(kit: EventKit, eventId: string, fallbackArt: Art | undefined): HTMLElement | null {
  const look = EVENT_LOOK[eventId];
  if (!look) return null;
  const fam = EVENT_FAMILIES[look.family];
  const blessing = eventHasBlessing(eventId);
  const w = kit.h('div', `nc-kind nc-event ev fam-${fam.id}${blessing ? ' has-surprise' : ''}`);
  w.style.setProperty('--fc', fam.color);
  w.style.setProperty('--fc-rgb', fam.rgb);
  const scene = kit.h('div', 'ev-scene');
  const url = eventArtUrl(eventId);
  let picture = '';
  if (url) picture = `<img class="ev-art" src="${url}" alt="" draggable="false">`;
  else {
    const art: Art | undefined = look.win ? { win: look.win, pos: [0.5, 0.5] } : look.bg ? { bg: look.bg, pos: [0.5, 0.5] } : fallbackArt;
    if (!kit.paint(scene, art)) scene.classList.add('plain');
  }
  const surprise = blessing ? `<i class="ev-surprise" title="A surprise" aria-hidden="true">${ic('blessing:hidden')}</i>` : '';
  const qc = eventQuestClass(eventId);
  const badge = qc && iconUrl(`class:${qc}`) ? `<i class="ev-badge quest" title="Quest" aria-hidden="true">${ic(`class:${qc}`)}</i>` : eventIsStory(eventId) ? `<i class="ev-badge story" title="Story" aria-hidden="true">${CROWN_SEAL}</i>` : '';
  scene.classList.toggle('has-art', !!url);
  scene.innerHTML = `${picture}<i class="ev-wash"></i><i class="ev-corner tl"></i><i class="ev-corner tr"></i><i class="ev-corner bl"></i><i class="ev-corner br"></i><span class="ev-ribbon">${fam.tag}</span>${badge}${surprise}`;
  w.append(scene);
  return w;
}
