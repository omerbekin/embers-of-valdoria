import './battle-hud.css';
import { passivePlateHtml, skillPlateHtml, type SkillChipKind } from './skill-bar';
import { iconUrl } from './dom-icons';
import { cooldownChipOf, costChipOf, rangeChipOf } from './skill-chips';
import { hasUiImage, uiIconName } from './ui-icons';
import { ValorMeter } from './valor-braziers';
import { valorRules } from '../engine/content';
import { tipOn, tipOff } from './tip-vis';
import { navSvg } from './nav-icons';
import { rectToLocal } from './formation-board-rules';
import { bandRichHtml, bandTipHtml, type BandChip, type BandTipSpec } from './band-tip';

/**
 * SAVAŞ HUD'ı (Ömer 2026-10-09, taslak public/mockups/battle-hud.html?v=2 "Slim bar, sheet rises"): DOM katmanı, oyun biriminde çizilir ve
 * görünür sahneye ölçeklenir (BattleScene `layout` ile verir). İçerik saf veridir (HudModel); tıklamalar geri çağrılarla sahneye gider.
 *  - Alt ince çubuk: sol altta portre, ad, HP/MP (Warrior'da Rage), 4 ana stat ve "◇ All stats"; portreye / stat alanına tıklayınca karakter
 *    sayfası yükselir (Main / Attack / Defense, simge + ad + değer, primary statta kor elmas; pasif ve Lucky Escape); ikinci tık ya da boş yere tık kapatır.
 *  - 4 skill tam ortada, Rest / Skip / Move hemen sağında dikey sütun; skill açıklaması yalnızca üstüne gelinen ya da seçili skill'in üstünde.
 *  - Sıra çubuğu ekranın tam ortasında, şu an oynayan tam ortada (geçmiş solda, sıradakiler sağda).
 *  - Birim kartları: düşman sağ kenarda, dost sol kenarda; her tarafta bir kart sabitlenebilir, hover diğer tarafın sabitini kapatmaz.
 *  - Pasif madalyonu 4 skill'in hemen solunda (Luck primary'de yanında Lucky Escape elması); skill'ler yine tam ortada.
 *  - Sağ alt (Ömer 2026-10-09): koşu boyu etkilerin ikonları yan yana (önce Endless kalıntıları, sonra zorluk / bölüm ölçeği ve
 *    ileride gelecek kalıcı güçlendirmeler; her biri kit tooltip'i) ve tek düğme "Combat log" (yukarı açılan panelde yalnızca günlük).
 *    Panel ikinci tıkla, dışarı tıklayınca ya da Esc ile kapanır. Etki yoksa (Quick Battle) yalnızca Combat log görünür.
 *  - Stat / global / sıra hücresi açıklamaları öğenin hemen üstünde; boş yere gelince açıklama yok.
 */

export interface TipRow {
  text: string;
  color?: string;
}
export interface TipMeta {
  iconUrl?: string;
  text: string;
  color?: string;
}
export interface MiniShapeLike {
  cols: number;
  rows: number;
  cells: Array<{ col: number; row: number; on: boolean; anchor?: boolean; stage?: number; hits?: number }>;
  note?: string;
}
export interface TipContent {
  title: string;
  titleColor?: string;
  iconUrl?: string;
  /** Sağdaki etiket (hedef türü: 'One enemy', 'Passive'...). */
  badge?: string;
  /** Başlığın sağındaki değer (stat tooltip'i). */
  value?: string;
  valueColor?: string;
  /** Başlığın altında tek düz satır (primary stat: "Primary: ..."). */
  sub?: string;
  meta?: TipMeta[];
  /** Başlığın altında yan yana küçük etiketler (skill: hedef türü · element · Melee / Ranged; src/ui/skill-tags.ts). */
  tags?: Array<{ text: string; color?: string; iconUrl?: string; /** 'range' = menzil çipi (ikon + sayı, V2). */ kind?: string }>;
  rows: TipRow[];
  shape?: MiniShapeLike | null;
  /** Başlık şeridinin üstündeki tür etiketi ("Skill", "Passive"...); yoksa `badge` kullanılır (Band tooltip, src/ui/band-tip.ts). */
  kind?: string;
  /** Vurgu rengi (yoksa skill'in element rengi, o da yoksa altın). */
  accent?: string;
  /** Satırların altına eklenen hazır HTML (çağrı hücresi: Formation'daki "Enemy rows hit" çubuğu). */
  bodyHtml?: string;
}
export interface HudStat {
  kind: string;
  label: string;
  name: string;
  value: string;
  iconUrl: string;
  primary?: boolean;
  /** Değer rengi (ACC / EVA bir durumla düşmüş ya da artmışsa). */
  color?: string;
  tip: TipContent;
}
export interface HudSkill {
  id: string;
  name: string;
  iconUrl: string;
  key: number;
  /** Bedel / bekleme çipleri; `kind` yetersiz kaynakta o çipi kırmızı yapar. */
  cost: Array<TipMeta & { kind?: SkillChipKind }>;
  /** Kalan cooldown (0 = hazır). */
  wait: number;
  enabled: boolean;
  selected: boolean;
  ult: boolean;
  /** Yetersiz kaynak türü (bekleme sürerken de verilir; plaka o bedel çipini kırmızı gösterir). */
  lack?: 'mp' | 'rage' | 'hp';
  tip: TipContent;
}
export interface HudGlobal {
  id: string;
  name: string;
  iconUrl: string;
  enabled: boolean;
  active: boolean;
  /** Hazır vurgusu (Valor Revive: Valor >= battleCost ve kullanılabilir; kor ışıması). */
  ready?: boolean;
  /** Görünmez yer tutucu (bu birimde olmayan global eylem, ör. düşmanda Valor Revive): sütun genişliği birimden birime değişmesin. */
  placeholder?: boolean;
  tip: TipContent;
}
/**
 * Crown Surge taç plakası (Ömer 2026-10-27, mockup public/mockups/crown-surge.html#v1): sağ alt alanda, Combat log'un solunda; skill plakası
 * dili ("Crown" şeridi, ikon, ad, hak çipi). Basınca onGlobal(id) (kahramanın eylemi harcanır). `used` = bu savaşta / bölgede harcandı (soluk).
 */
export interface HudCrown {
  id: string;
  name: string;
  iconUrl: string;
  enabled: boolean;
  used: boolean;
  tip: TipContent;
}
export interface HudBar {
  value: number;
  max: number;
  tip: TipContent;
  iconUrl?: string;
}
export interface HudActor {
  uid: string;
  name: string;
  sub: string;
  portraitUrl: string;
  flip: boolean;
  enemy: boolean;
  nameColor?: string;
  hp: HudBar;
  mp: HudBar | null;
  rage: (HudBar & { iconUrl: string }) | null;
  main: HudStat[];
  groups: Array<{ title: string; stats: HudStat[] }>;
  passive: { name: string; text: string; iconUrl: string } | null;
  /** Ashen Taint yığını (Crown Surge; sefer kahramanı). 0 / yok = çip yok. */
  taint?: number;
  /** Kahraman sayfası başlığı (A-Band): rol, primary stat çipi, level (yoksa gizli), alt çubuktaki primary bonusu. */
  role?: string;
  primary?: { name: string; iconUrl: string } | null;
  level?: number;
  bonus?: { text: string } | null;
  /** Sayfanın altındaki ek satırlar (Lucky Escape, kalkan, beslenmiş çağrı...). */
  notes: TipRow[];
}
export interface HudQueueCell {
  uid: string;
  avatarUrl: string;
  enemy: boolean;
  flip: boolean;
  state: 'past' | 'now' | 'next';
  tag?: { text: string; color: string };
  tip: TipContent;
}
export interface HudPassive {
  name: string;
  iconUrl: string;
  tip: TipContent;
  /** Luck primary: Lucky Escape (hazır / bu savaşta kullanıldı). */
  lucky: { ready: boolean; tip: TipContent } | null;
}

/** Boyalı arayüz ikonu (assets/ui-icons) varsa DOM adresi, yoksa '' (kit elması / yazı kalır). */
const uiImg = (k: 'luckyEscape' | 'combatLog'): string => (hasUiImage(k) ? iconUrl(uiIconName(k)) : '');
/** Savaş günlüğü satırının parçası: p / e = dost / düşman adı, sk = skill, dm = sayı, cr = kritik sayı, hl = şifa, ko = düştü, n = not. */
export interface LogPart {
  t: string;
  k?: 'p' | 'e' | 'sk' | 'dm' | 'cr' | 'hl' | 'ko' | 'n';
}
export interface HudLogEntry {
  round: number;
  parts: LogPart[];
}
/** Koşu boyu etki (Endless kalıntısı, sefer zorluk ölçeği; ileride başka sistemler). */
export interface HudEffect {
  name: string;
  text: string;
  iconUrl?: string;
  color?: string;
  /** Başlık grubu ('Relics', 'Enemy scaling'...). */
  group?: string;
}
export interface HudModel {
  actor: HudActor | null;
  passive?: HudPassive | null;
  skills: HudSkill[];
  globals: HudGlobal[];
  turnLabel: string;
}
export interface UnitCard {
  uid: string;
  enemy: boolean;
  name: string;
  nameColor?: string;
  sub: string;
  portraitUrl: string;
  flip: boolean;
  tag?: { text: string; color: string };
  hp: { value: number; max: number };
  mp: { value: number; max: number } | null;
  rage: { value: number; max: number } | null;
  /** Çubuk ikonları (HP / MP / Rage). */
  hpIcon?: string;
  mpIcon?: string;
  rageIcon?: string;
  /** Rol çipi, primary stat çipi, level rozeti (kart başlığı; B · Band + Rows). */
  role?: string;
  primary?: { name: string; iconUrl: string } | null;
  level?: number;
  attrs: HudStat[];
  grid: Array<{ iconUrl: string; label: string; value: string; small?: string; color?: string }>;
  /** Üstteki aktif buff / debuff'lar: ikon (rozetle aynı), ad, kalan tur, yığın. */
  effects: Array<{ name: string; color: string; turns: string; text: string; iconUrl?: string; debuff?: boolean; stacks?: number }>;
  passive: { name: string; text: string; iconUrl?: string } | null;
  preview: { iconUrl: string; skill: string; hit?: string; amount?: string; note?: string } | null;
  /** Birimin skill'leri (Ömer 2026-10-16): ikon, ad, kısa hedef/şekil, bedel, cooldown; satıra dokununca / gelince skill tooltip'i. */
  skills?: CardSkill[];
}
export interface CardSkill {
  id: string;
  name: string;
  iconUrl: string;
  /** Kısa hedef / şekil (src/ui/skill-target-label.ts). */
  target: string;
  cost: TipMeta | null;
  /** Temel cooldown (0 = yok). */
  cd: number;
  /** Kalan cooldown (0 = hazır). */
  wait: number;
  /** Kum saati ikonu (skill düğmesinin cooldown çipiyle aynı). */
  cdIconUrl?: string;
  /** Skill tooltip'i; işlev = yalnızca açılınca üretilir (kartlar saniyede birkaç kez yenilenir). */
  tip: TipContent | (() => TipContent);
}
export interface HudCallbacks {
  onSkill: (id: string) => void;
  onGlobal: (id: string) => void;
  /** Kart sabitleme değişti (sahne hedef parıltısını vb. yenileyebilir). */
  onPinChange?: () => void;
}

type Side = 'party' | 'enemy';

/** Savaş HUD'ında sabit skill yuvası sayısı: global sütun ve sağ alan bu genişlikten sonra durur (skill sayısı değişince kaymaz). */
export const HUD_SKILL_SLOTS = 4;
/** Skill / pasif plakası ölçüleri (oyun birimi; telefonda plaka biraz geniş: bedel çipleri okunur kalsın). CSS: battle-hud.css > .bp, .bh-skills. */
export const HUD_PLATE_W = 132;
export const HUD_PLATE_W_PHONE = 146;
export const HUD_PLATE_GAP = 8;
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Sıra çubuğu hücresinin erişilebilir adı (B9, playtest 2026-10-23): hücreler yalnızca portre (alt="") olduğundan çubuk erişilebilirlik
 * ağacında görünmüyordu; ilk savaşta (rozetsiz) "turn bar yok" sanıldı. Ad = ipucunun başlığı · tarafı · ne zaman ("Warrior, Ally, Acting now").
 */
export function queueCellLabel(c: HudQueueCell): string {
  return [c.tip.title, c.tip.badge, c.tag?.text, ...c.tip.rows.map((r) => r.text)].filter(Boolean).join(', ');
}
const pct = (a: number, b: number) => `${b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0}%`;
const img = (url: string, cls = 'bh-ico', extra = '') => (url ? `<img class="${cls}" src="${url}" alt="" draggable="false" ${extra}>` : '');

/** Nötr başlık renkleri (krem / altın): vurgu sayılmaz, ipucu altın kalır; renkli başlık (uyarı, seçili hücre) vurgu olur. */
const NEUTRAL_TITLE = new Set(['#d9c8a2', '#f3d999', '#e8e2d0', '#f4ede1', '#ffffff']);

/** "Strength 32" -> "Strength <b>32</b>" (primary çipinde sayı altın). */
const primaryLabelHtml = (name: string): string => {
  const m = /^(.*?)s*(d+)$/.exec(name);
  return m ? `${esc(m[1]!)} <b>${esc(m[2]!)}</b>` : esc(name);
};

/** Skill ipucu çipleri V2 (Ömer 2026-10-20): menzil / bedel / bekleme yalnızca ikon + sayı; tam anlam üstüne gelince ("Range 6", "Costs 14 MP", "Cooldown: 2 turns"). */
function tagChip(g: NonNullable<TipContent['tags']>[number]): BandChip {
  const rg = g.kind === 'range' ? rangeChipOf(g.text) : null;
  if (rg) return { text: '', num: rg.num, bare: true, tone: 'v', icon: iconUrl(uiIconName('range'), '#e8e2d0'), tip: rg.tip };
  return { text: g.text, ...(g.iconUrl ? { icon: g.iconUrl } : {}), ...(g.color ? { tone: 'ac' as const, color: g.color } : {}) };
}
function metaBare(m: NonNullable<TipContent['meta']>[number]): BandChip | null {
  const icon = m.iconUrl ? { icon: m.iconUrl } : {};
  const cd = cooldownChipOf(m.text);
  if (cd) return { text: '', num: cd.num, bare: true, tone: 'v', ...icon, tip: cd.tip };
  const cost = m.iconUrl ? costChipOf(m.text) : null;
  if (cost) return { text: '', num: cost.num, bare: true, tone: 'v', ...icon, tip: cost.tip, ...(m.color && cost.res === 'rage' ? { color: m.color } : {}) };
  return null;
}

/** TipContent -> "A - Band" ipucu tarifi (içerik aynı; yalnızca görünüm: src/ui/band-tip.ts). */
export function tipToBand(t: TipContent): BandTipSpec {
  const tagColor = t.tags?.find((g) => g.color)?.color;
  const titleAccent = t.titleColor && !NEUTRAL_TITLE.has(t.titleColor.toLowerCase()) ? t.titleColor : undefined;
  const chips: BandChip[] = [];
  for (const g of t.tags ?? []) chips.push(tagChip(g));
  for (const m of t.meta ?? []) {
    const bare = metaBare(m);
    if (bare) {
      chips.push(bare);
      continue;
    }
    const free = /^(cost )?free$/i.test(m.text);
    const num = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(m.text);
    chips.push({ text: num ? num[2]! : m.text, ...(num ? { num: num[1]!, tone: 'v' as const } : { tone: free ? ('free' as const) : ('v' as const) }), ...(m.iconUrl ? { icon: m.iconUrl } : {}), ...(m.color && !free ? { color: m.color } : {}) });
  }
  const grid = t.shape ? { cols: t.shape.cols, rows: t.shape.rows, cells: t.shape.cells } : null;
  const accent = t.accent ?? tagColor ?? titleAccent;
  return {
    ...(accent ? { accent } : {}),
    ...((t.kind ?? t.badge) ? { kind: (t.kind ?? t.badge)! } : {}),
    title: t.title,
    ...(t.sub ? { sub: t.sub } : {}),
    ...(t.iconUrl ? { icon: t.iconUrl } : {}),
    ...(t.value !== undefined ? { value: t.value, ...(t.valueColor ? { valueColor: t.valueColor } : {}) } : {}),
    grid,
    chips,
    lines: t.rows.map((r) => ({ text: r.text, ...(r.color ? { color: r.color } : {}) })),
    ...(t.shape?.note ? { foot: t.shape.note } : {}),
    ...(t.bodyHtml ? { bodyHtml: t.bodyHtml, noKeywords: true } : {}),
  };
}

/** Kit tooltip'inin iç HTML'i (skill, stat, global, sıra hücresi, bağlam ipuçları): ortak "A - Band" bileşeni. */
export function tipHtml(t: TipContent): string {
  return bandTipHtml(tipToBand(t));
}

export class BattleHud {
  readonly root: HTMLDivElement;
  private readonly band: HTMLDivElement;
  private readonly turn: HTMLDivElement;
  private readonly turnLbl: HTMLDivElement;
  /** Dalgalı savaş göstergesi ("Round 2/3"; yalnızca dalga sayısı 1'den büyükse; geçici görünüm: tek yer bu alan + .bh-wave). */
  private readonly waveLbl: HTMLDivElement;
  /** Karşılaşma kuralı satırı (Harita 2-3: koşul · hedef · sayaç; dalga plakasının altında, yoksa onun yerinde). */
  private readonly goalLbl: HTMLDivElement;
  private readonly actorBox: HTMLDivElement;
  private readonly skillBox: HTMLDivElement;
  private readonly globBox: HTMLDivElement;
  private readonly rightSlot: HTMLDivElement;
  private readonly pasBox: HTMLDivElement;
  private readonly infoBox: HTMLDivElement;
  private readonly logPanel: HTMLDivElement;
  private log: HudLogEntry[] = [];
  private effects: HudEffect[] = [];
  private panel: 'log' | null = null;
  /** Dokunmatik uzun basma (skill açıklaması). */
  private pressTimer = 0;
  private pressFired = false;
  private readonly ftip: HTMLDivElement;
  private readonly ctip: HTMLDivElement;
  private readonly cards: Record<Side, HTMLDivElement>;
  private model: HudModel = { actor: null, skills: [], globals: [], turnLabel: '' };
  private queue: HudQueueCell[] | null = null;
  private testLabel = '';
  private viewW = 1920;
  /** 1 gerçek CSS px kaç oyun birimi (layout'tan; telefonda Combat log'un 44 px alanı için). */
  private inv = 1;
  /** Son yazılan HTML (kutu başına): aynıysa DOM'a dokunulmaz (skill değiştirmek tüm alt çubuğu yeniden kurup yerleşim ölçtürüyordu). */
  private readonly lastHtml = new WeakMap<HTMLElement, string>();
  /** Skill kutusunun seçimden bağımsız içeriği: yalnızca seçim değiştiyse sınıf değişir. */
  private skillsKey = '';
  /** Global sütunun ölçülen genişliği (yalnızca içerik ya da ekran değişince yeniden ölçülür). */
  private globW: number | null = null;
  private open = false;
  private tipEl: HTMLElement | null = null;
  private tipPinned = false;
  private readonly tips = new Map<string, TipContent>();
  /** Birim kartı skill satırlarının ipuçları (setModel'in temizlediği `tips`ten ayrı: kart HTML'i değişmeden kalabilir). */
  private readonly cardTips = new Map<string, TipContent | (() => TipContent)>();
  private hover: Partial<Record<Side, UnitCard>> = {};
  private pins: Partial<Record<Side, UnitCard>> = {};
  private readonly offDoc: () => void;
  private hidden = false;
  /** Valor mangalları (sefer / Endless; global sütunun hemen sağında, alt çubukta). Yoksa gizli. */
  private readonly valorBox: HTMLElement;
  private valorMeter: ValorMeter | null = null;
  /** Crown Surge taç plakaları (sağ alanın başında; yoksa gizli). */
  private readonly crownBox: HTMLElement;

  constructor(parent: HTMLElement, private readonly cb: HudCallbacks) {
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => {
      const e = document.createElement(tag);
      e.className = cls;
      return e;
    };
    this.root = el('div', 'bh-root');
    this.band = el('div', 'bh-band');
    this.band.innerHTML = '<i class="bh-dia bh-band-dia"></i>';
    this.turn = el('div', 'bh-turn');
    this.turn.setAttribute('role', 'list');
    this.turn.setAttribute('aria-label', 'Turn order');
    this.turnLbl = el('div', 'bh-turn-lbl');
    this.waveLbl = el('div', 'bh-wave');
    this.waveLbl.hidden = true;
    this.goalLbl = el('div', 'bh-goal');
    this.goalLbl.hidden = true;
    this.actorBox = el('div', 'bh-actor');
    this.skillBox = el('div', 'bh-skills');
    this.globBox = el('div', 'bh-globs');
    this.rightSlot = el('div', 'bh-right');
    this.pasBox = el('div', 'bh-pasv');
    this.valorBox = el('div', 'bh-valor');
    this.valorBox.hidden = true;
    this.infoBox = el('div', 'bh-binfo');
    this.logPanel = el('div', 'bh-logp bh-panel bh-corners');
    this.crownBox = el('div', 'bh-crown');
    this.crownBox.hidden = true;
    this.rightSlot.append(this.crownBox, this.infoBox, this.logPanel);
    this.ftip = el('div', 'bh-ftip bh-panel');
    this.ctip = el('div', 'bh-ctip bh-panel bh-corners');
    this.cards = { party: el('div', 'bh-card party'), enemy: el('div', 'bh-card enemy') };
    this.root.append(this.band, this.turn, this.turnLbl, this.waveLbl, this.goalLbl, this.actorBox, this.pasBox, this.skillBox, this.globBox, this.valorBox, this.rightSlot, this.cards.party, this.cards.enemy, this.ctip, this.ftip);
    parent.append(this.root);

    // Fare bırakması alttaki Phaser sahnesine gitmesin (Phaser window mouseup'ı dinler, defaultPrevented olanı yok sayar)
    this.root.addEventListener('mouseup', (e) => e.preventDefault());
    this.root.addEventListener('pointerover', (e) => this.onOver(e));
    this.root.addEventListener('pointerout', (e) => this.onOut(e));
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      const sk = (e.target as HTMLElement).closest<HTMLElement>('.bp[data-skill]');
      if (!sk) return;
      this.pressFired = false;
      window.clearTimeout(this.pressTimer);
      this.pressTimer = window.setTimeout(() => {
        this.pressFired = true;
        sk.classList.add('tip');
      }, 420);
    });
    const endPress = () => {
      window.clearTimeout(this.pressTimer);
      this.skillBox.querySelectorAll('.bp.tip').forEach((x) => x.classList.remove('tip'));
    };
    this.root.addEventListener('pointerup', endPress);
    this.root.addEventListener('pointercancel', endPress);
    this.root.addEventListener('contextmenu', (e) => (e.target as HTMLElement).closest('.bp') && e.preventDefault());
    // Sabit birim kartı (Ömer 2026-10-16 telefon testi: kart dokunarak kaymıyordu): karttaki dokunma / fare basışı Phaser'ın window
    // dinleyicilerine gitmesin. Gitse Phaser kartın ARKASINDAKİ birim / hücreyi basılmış sayar (kart başka birime döner ya da sabiti
    // düşer, içerik parmağın altında yeniden yazılır, kaydırma kesilir). preventDefault YOK: tarayıcının kendi kaydırması ve click çalışır.
    for (const card of Object.values(this.cards))
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown'] as const) card.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
    // Boş yere (HUD dışına, sahneye) dokunmak açık karakter sayfasını ve günlük / etki panelini kapatır
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (this.open && !(t && this.actorBox.contains(t))) this.setOpen(false);
      if (this.panel && !(t && this.rightSlot.contains(t))) this.setPanel(null);
      // Kart skill satırına dokununca açılan sabit ipucu: başka yere dokununca kapanır
      if (this.tipPinned && this.tipEl?.closest('.bh-card') && !(t && this.tipEl.contains(t))) this.hideTip();
    };
    document.addEventListener('pointerdown', onDoc, true);
    this.offDoc = () => document.removeEventListener('pointerdown', onDoc, true);
  }

  destroy(): void {
    this.offDoc();
    this.valorMeter?.destroy();
    this.root.remove();
  }

  /** Görünür sahne: CSS sol / üst (px), ölçek (CSS px / oyun birimi), görünür mantıksal genişlik. */
  layout(left: number, top: number, scale: number, viewW: number): void {
    const r = this.root.style;
    r.left = `${left}px`;
    r.top = `${top}px`;
    r.width = `${viewW}px`;
    r.transform = `scale(${scale})`;
    r.setProperty('--bh-inv', String(1 / Math.max(0.05, scale))); // 1 gerçek px = --bh-inv oyun birimi (dokunma alanları en az 44 gerçek px)
    this.globW = null; // ekran değişti (html.short düzeni): global sütun yeniden ölçülür
    this.inv = 1 / Math.max(0.05, scale);
    this.viewW = viewW;
    this.place();
  }

  setHidden(on: boolean): void {
    this.hidden = on;
    this.root.classList.toggle('hidden', on);
    if (on) {
      this.hideTip();
      this.hideContextTip();
      this.setOpen(false);
      this.setPanel(null);
    }
  }

  // ------------------------------------------------------------------ sağ alt: etkiler + Combat log
  /** Savaş günlüğü (en yeni önce). Panel açıksa hemen yenilenir. */
  setLog(entries: HudLogEntry[]): void {
    this.log = entries;
    if (this.panel === 'log') this.renderLog();
  }

  /** Koşu boyu etkiler (kalıntılar, zorluk / bölüm ölçeği, ileride başka sistemler): sağ altta ikon sırası; boşsa yalnızca Combat log. */
  setEffects(list: HudEffect[]): void {
    this.effects = list;
    this.renderInfo();
  }

  /** Esc: açık günlük panelini kapatır; kapattıysa true. */
  closePanels(): boolean {
    if (!this.panel) return false;
    this.setPanel(null);
    return true;
  }

  private setPanel(p: 'log' | null): void {
    this.panel = p;
    if (p === 'log') this.renderLog();
    this.logPanel.classList.toggle('open', p === 'log');
    this.infoBox.querySelector('[data-panel="log"]')?.classList.toggle('open', p === 'log');
    if (p) this.hideTip();
  }

  private renderInfo(): void {
    const icons = this.effects
      .map((e, i) => {
        const tip: TipContent = { title: e.name, ...(e.color ? { titleColor: e.color } : {}), ...(e.iconUrl ? { iconUrl: e.iconUrl } : {}), ...(e.group ? { badge: e.group } : {}), rows: [{ text: e.text }] };
        return `<span class="bh-buff" ${this.reg(`fx:${i}`, tip)} style="${e.color ? `--c:${e.color}` : ''}">${e.iconUrl ? img(e.iconUrl) : '<i class="bh-dia s"></i>'}</span>`;
      })
      .join('');
    this.put(this.infoBox, `${icons ? `<div class="bh-buffs">${icons}</div>` : ''}<div class="bh-links"><span class="bh-plink ${uiImg('combatLog') ? 'ico' : ''} ${this.panel === 'log' ? 'open' : ''}" data-panel="log">${uiImg('combatLog') ? img(uiImg('combatLog'), 'bh-ico bh-pl-ico') : '<i class="bh-dia s"></i>'}<span class="bh-pl-t">Combat log</span></span></div>`);
  }

  private renderLog(): void {
    const lines = this.log
      .slice(0, 40)
      .map((e) => `<div class="bh-ln"><span class="r">R${e.round}</span><span>${e.parts.map((p) => (p.k ? `<b class="${p.k}">${esc(p.t)}</b>` : esc(p.t))).join('')}</span></div>`)
      .join('');
    this.logPanel.innerHTML = `<div class="bh-hd"><i class="bh-dia h s"></i>Combat log<span class="bh-hd-r">latest first</span></div><div class="bh-lns">${lines || '<div class="bh-none">Nothing has happened yet.</div>'}</div>`;
  }

  isSheetOpen(): boolean {
    return this.open;
  }

  setOpen(v: boolean): void {
    if (v === this.open) return;
    this.open = v;
    this.actorBox.classList.toggle('open', v);
    this.root.classList.toggle('sheet-open', v);
    if (v) this.hideTip();
  }

  // ------------------------------------------------------------------ alt çubuk

  setModel(m: HudModel): void {
    this.model = m;
    this.tips.clear();
    this.renderActor();
    this.renderSkills();
    this.renderGlobals();
    this.renderTurnLabel();
    this.renderPassive();
    this.renderInfo();
    this.place();
    if (this.tipEl && !this.root.contains(this.tipEl)) this.hideTip();
  }

  /** Rage çubuğunu yeniden çizmeden günceller (savaş animasyonuyla akan değer). */
  setRage(value: number): void {
    const r = this.model.actor?.rage;
    if (!r) return;
    r.value = value;
    const fill = this.actorBox.querySelector<HTMLElement>('.bh-hpmp.rage .bh-bar i');
    const lab = this.actorBox.querySelector<HTMLElement>('.bh-hpmp.rage .bh-num .v');
    if (fill) fill.style.width = pct(value, r.max);
    if (lab) lab.textContent = String(Math.round(value));
  }

  private reg(key: string, t: TipContent): string {
    this.tips.set(key, t);
    return `data-tip="${esc(key)}"`;
  }

  /** innerHTML yalnızca değiştiyse yazılır (yazıldıysa true). */
  private put(box: HTMLElement, html: string): boolean {
    if (this.lastHtml.get(box) === html) return false;
    this.lastHtml.set(box, html);
    box.innerHTML = html;
    return true;
  }

  private renderActor(): void {
    const a = this.model.actor;
    const wasOpen = this.open;
    if (!a) {
      this.put(this.actorBox, '');
      return;
    }
    const st = (s: HudStat) => `<div class="bh-st ${s.primary ? 'pri' : ''}" ${this.reg(`s:${s.kind}`, s.tip)} style="${s.color ? `color:${s.color}` : ''}">${img(s.iconUrl)}<span class="l">${esc(s.label)}</span><span>${esc(s.value)}</span></div>`;
    const srow = (s: HudStat) => `<div class="bh-srow ${s.primary ? 'pri' : ''}" ${this.reg(`s:${s.kind}`, s.tip)}>${img(s.iconUrl)}<span class="l">${esc(s.name)}${s.primary ? '<i class="bh-pd"></i>' : ''}</span><span class="v" style="${s.color ? `color:${s.color}` : ''}">${esc(s.value)}</span></div>`;
    const bar = (kind: 'hp' | 'mp', b: HudBar) =>
      `<div class="bh-hpmp ${kind}" ${this.reg(`b:${kind}`, b.tip)}><div class="bh-num">${img(b.iconUrl ?? '')}${b.value}<span class="of">/ ${b.max}</span></div><div class="bh-bar ${kind}${a.enemy && kind === 'hp' ? ' en' : ''}"><i style="width:${pct(b.value, b.max)}"></i></div></div>`;
    // Üçüncü kaynak (Warrior'ın Rage'i): HP/MP ile AYNI hücre (ikon + "0 / 50" + ince çubuk), aynı ızgarada üçüncü sütun;
    // ayrı geniş satır yok (Ömer 2026-10-12: satır taşıyor, stat satırını itiyordu)
    const rage = a.rage
      ? `<div class="bh-hpmp rage" ${this.reg('b:rage', a.rage.tip)}><div class="bh-num">${img(a.rage.iconUrl)}<span class="v">${Math.round(a.rage.value)}</span><span class="of">/ ${a.rage.max}</span></div><div class="bh-bar rage"><i style="width:${pct(a.rage.value, a.rage.max)}"></i></div></div>`
      : '';
    // Kahraman sayfası = A-Band ipucu (ortak bileşen): başlık şeridi + rol / primary çipleri + 3 sütun + alt bilgi çubuğu (primary bonusu). Pasif burada YOK (skill'ler anlatıyor).
    const notes = a.notes.map((n) => `<div class="bt-ln"><span class="dia"></span><div class="tx"${n.color ? ` style="color:${n.color}"` : ''}>${esc(n.text)}</div></div>`).join('');
    const cols = `<div class="bh-cols">${a.groups.map((g, gi) => `${gi ? '<div class="bh-vfade"></div>' : ''}<div class="bh-col"><div class="bh-hd"><i class="bh-dia h s"></i>${esc(g.title)}</div>${g.stats.map(srow).join('')}</div>`).join('')}</div>${notes ? `<div class="bh-sheet-notes">${notes}</div>` : ''}`;
    const chips: BandChip[] = [];
    if (a.role) chips.push({ text: a.role });
    if (a.primary) chips.push({ text: `${a.primary.name} primary`, ...(a.primary.iconUrl ? { icon: a.primary.iconUrl } : {}), tone: 'ac', color: '#ffb98a' });
    // Alt çubuk karakter bloğu (B · Icon first): rol + primary çipleri
    if (a.taint) chips.push({ text: `Ashen Taint ×${a.taint}`, color: '#c9b8f0' });
    const rowChips =
      (a.role ? `<span class="bh-chip">${esc(a.role)}</span>` : '') +
      (a.taint ? `<span class="bh-chip taint"><b>Ashen Taint ×${a.taint}</b></span>` : a.primary ? `<span class="bh-chip hot">${img(a.primary.iconUrl)}${primaryLabelHtml(a.primary.name)} primary</span>` : '');
    const sheet = bandTipHtml({
      kind: 'Character',
      title: a.name,
      icon: a.portraitUrl,
      iconShape: 'portrait',
      ...(a.flip ? { iconFlip: true } : {}),
      ...(a.level !== undefined ? { value: `Lv ${a.level}` } : {}),
      chips,
      bodyHtml: cols,
      ...(a.bonus ? { foot: a.bonus.text } : {}),
    });
    this.put(
      this.actorBox,
      `
      <div class="bh-sheet">${sheet}</div>
      <div class="bh-opener" data-open="1">
        <div class="bh-pframe${a.enemy ? ' en' : ''}">${img(a.portraitUrl, 'bh-portrait', a.flip ? 'style="transform:scaleX(-1)"' : '')}</div>
        <div class="bh-actor-info">
          <div class="bh-name"><span class="bh-n" style="${a.nameColor ? `color:${a.nameColor}` : ''}">${esc(a.name)}</span></div>
          ${rowChips ? `<div class="bh-chips">${rowChips}</div>` : ''}
          <div class="bh-abody">
            <div class="bh-hpmp-row">${bar('hp', a.hp)}${a.mp ? bar('mp', a.mp) : ''}${rage}</div>
            <div class="bh-aside"><div class="bh-main">${a.main.map(st).join('')}</div><span class="bh-more">All stats</span></div>
          </div>
        </div>
      </div>`,
    );
    if (wasOpen) this.actorBox.classList.add('open');
  }

  private renderSkills(): void {
    // Skill plakası (src/ui/skill-bar.ts > skillPlateHtml; "A · Plates": ikon, numara, ad, bedel / bekleme çipleri). Gear skillCellHtml'i kullanmaya devam eder.
    const one = (s: HudModel['skills'][number], selected: boolean) => skillPlateHtml({ ...s, selected }, tipHtml(s.tip));
    // Yalnızca seçim değiştiyse (skill'ler arasında geçiş) kutu yeniden kurulmaz: 'sel' sınıfı taşınır (zayıf telefonda gecikmenin ana nedeni)
    const key = this.model.skills.map((s) => one(s, false)).join('');
    const kids = this.skillBox.children;
    if (key === this.skillsKey && kids.length === this.model.skills.length) {
      this.model.skills.forEach((s, i) => kids[i]!.classList.toggle('sel', !!s.selected));
      return;
    }
    this.skillsKey = key;
    const html = this.model.skills.map((s) => one(s, !!s.selected)).join('');
    this.lastHtml.set(this.skillBox, html);
    this.skillBox.innerHTML = html;
  }

  /**
   * Valor mangalları (null = bu savaşta Valor yok: gizli). `animate`: korlar tek tek değişir (harcama / kazanç). İpucu HUD'ın ortak ipucu kutusuyla.
   */
  setValor(v: number | null, tip?: TipContent, animate = false): void {
    if (v === null) {
      if (!this.valorBox.hidden) {
        this.valorBox.hidden = true;
        this.place();
      }
      return;
    }
    if (!this.valorMeter) {
      // Savaşta diriltme bedeli battleCost: alev/ışıma yalnızca o eşikte, mangalda bedel çentiği (Ömer 2026-10-13 form valor2)
      this.valorMeter = new ValorMeter({ label: true, readyAt: valorRules.revive.battleCost, marker: valorRules.revive.battleCost });
      this.valorMeter.el.classList.add('vl-stack');
      this.valorBox.append(this.valorMeter.el);
    }
    if (tip) {
      this.valorMeter.el.setAttribute('data-tip', 'v:valor');
      this.tips.set('v:valor', tip);
    }
    this.valorMeter.set(v, animate);
    if (this.valorBox.hidden) {
      this.valorBox.hidden = false;
      this.place();
    }
  }

  /** Crown Surge taç plakaları (boş liste = bu savaşta Surge yok: gizli). */
  setCrown(list: HudCrown[]): void {
    const html = list
      .map((c) => {
        const chips = c.used ? '<span class="bp-chip none"><b>0 / 1</b></span>' : '<span class="bp-chip act"><b>1 / 1</b></span><span class="bp-chip">Action</span>';
        return `<div class="bp crown ${c.used ? 'used' : ''} ${c.enabled ? '' : 'off'}" data-global="${esc(c.id)}">
          <span class="bp-tag"><span class="full">Crown</span><span class="short">Crown</span></span>
          <div class="bp-ico">${img(c.iconUrl)}</div>
          <span class="bp-nm">${esc(c.name)}</span>
          <div class="bp-chips">${chips}</div>
          <div class="bh-sktip bh-panel bh-corners">${tipHtml(c.tip)}</div>
        </div>`;
      })
      .join('');
    const on = list.length > 0;
    if (this.crownBox.hidden === on) this.crownBox.hidden = !on;
    this.rightSlot.classList.toggle('has-crown', on);
    this.put(this.crownBox, html);
  }

  private renderGlobals(): void {
    const g = this.model.globals;
    this.globBox.classList.toggle('empty', g.length === 0);
    const html = g.length
      ? `<div class="bh-vfade"></div><div class="bh-gcol">${g
          .map((x) =>
            x.placeholder
              ? `<div class="bh-gl ph" aria-hidden="true">${img(x.iconUrl)}<span>${esc(x.name)}</span></div>`
              : `<div class="bh-gl ${x.enabled ? '' : 'off'} ${x.active ? 'on' : ''} ${x.ready ? 'ready' : ''}" data-global="${esc(x.id)}" ${this.reg(`g:${x.id}`, x.tip)}>${img(x.iconUrl)}<span>${esc(x.name)}</span></div>`,
          )
          .join('')}</div>`
      : '';
    if (this.put(this.globBox, html)) this.globW = null;
  }

  /** Pasif madalyonu (4 skill'in solunda) + Luck primary'de Lucky Escape elması. */
  private renderPassive(): void {
    const p = this.model.passive;
    const lucky = p?.lucky ? `<span class="bh-lucky ${uiImg('luckyEscape') ? 'ico' : ''} ${p.lucky.ready ? '' : 'used'}" ${this.reg('p:lucky', p.lucky.tip)}>${uiImg('luckyEscape') ? img(uiImg('luckyEscape')) : '<i></i>'}</span>` : '';
    this.put(this.pasBox, p ? passivePlateHtml(p.name, p.iconUrl, this.reg('p:passive', p.tip), lucky) : '');
  }

  /** Tur göstergesi (savaştaki dalga = "Round", Ömer 2026-10-19 V1 Corner): sol üst plaka "Round 2 / 3" + elmaslar (null = gizli: tek turlu savaş). */
  /**
   * Karşılaşma kuralı satırı (maps-2-3.md B3 / M-B / M-I; data/battle-rules.json): tek satır "Tide · Survive 6 turns · 3/6" + A Band ipucu
   * (kuralların tam metni). `state` 'done' yeşil, 'failed' kırmızı. null = gizli (kuralsız savaş).
   */
  setGoal(g: { parts: string[]; counter?: string; state?: 'done' | 'failed'; tip: TipContent } | null): void {
    this.goalLbl.hidden = !g;
    this.cardTips.set('goal', g?.tip ?? { title: '', rows: [] });
    if (!g) {
      this.put(this.goalLbl, '');
      return;
    }
    this.goalLbl.classList.toggle('done', g.state === 'done');
    this.goalLbl.classList.toggle('failed', g.state === 'failed');
    const parts = g.parts.map((p) => `<span class="p">${esc(p)}</span>`).join('<i class="bh-dia s"></i>');
    this.put(this.goalLbl, `<span class="t" data-tip="goal">${parts}${g.counter ? `<span class="c">${esc(g.counter)}</span>` : ''}</span>`);
  }

  setWave(round: { n: number; total: number } | null): void {
    this.waveLbl.hidden = !round;
    this.goalLbl.classList.toggle('low', !!round);
    if (!round) {
      this.waveLbl.innerHTML = '';
      return;
    }
    const pips = Array.from({ length: round.total }, (_, i) => `<i class="${i + 1 < round.n ? 'on' : i + 1 === round.n ? 'cur' : ''}"></i>`).join('');
    this.waveLbl.classList.toggle('final', round.n === round.total);
    this.waveLbl.innerHTML = `<span class="ico"><img src="${iconUrl('node:battle')}" alt=""></span><span class="tx"><span class="k">Round</span><span class="n">${round.n}<small> / ${round.total}</small></span><span class="bh-pips">${pips}</span></span>`;
  }

  private renderTurnLabel(): void {
    const t = this.model.turnLabel;
    this.put(this.turnLbl, t ? `<i class="bh-dia s"></i>${esc(t)}<i class="bh-dia s"></i>` : '');
  }

  /** Sıra çubuğu (null = gizli); test modunda hücreler yerine yazı. */
  /**
   * Turlar arası bekleme (src/game/turn-wait.ts): sıra çubuğu portreleri "now" yuvasına doğru `t` (0-1) oranında kayar; bekleme bitince
   * yeni sıra (setQueue) kaymayı sıfırlar ve geçen birim solda bir hücre daha açıldığı için konumlar aynen devam eder.
   */
  setQueueSlide(t: number, cell = 80): void {
    this.turn.style.translate = t > 0 ? `${-Math.round(t * cell * 10) / 10}px 0` : '';
  }

  setQueue(cells: HudQueueCell[] | null, testLabel = ''): void {
    this.turn.style.translate = '';
    this.queue = cells;
    this.testLabel = testLabel;
    if (testLabel) {
      this.turn.innerHTML = `<div class="bh-test">${esc(testLabel)}</div>`;
    } else if (cells) {
      this.turn.innerHTML = cells
        .map(
          (c, i) =>
            `<div class="bh-cell ${c.enemy ? 'enemy' : ''} ${c.state}" role="listitem" aria-label="${esc(queueCellLabel(c))}" ${this.reg(`q:${i}:${c.uid}`, c.tip)}>${img(c.avatarUrl, 'bh-portrait', c.flip ? 'style="transform:scaleX(-1)"' : '')}${
              c.tag ? `<span class="bh-ctag" style="color:${c.tag.color};border-color:${c.tag.color}">${esc(c.tag.text)}</span>` : ''
            }</div>`,
        )
        .join('');
    } else this.turn.innerHTML = '';
    this.place();
  }

  // ------------------------------------------------------------------ yerleşim (oyun birimi)

  private place(): void {
    const W = this.viewW;
    // Sıra çubuğu: şu anki birim ekranın tam ortasında
    const past = this.queue ? this.queue.filter((c) => c.state === 'past').length : 0;
    const CW = 70;
    const NW = 92;
    const GAP = 10;
    this.turn.style.left = this.testLabel ? `${W / 2}px` : `${W / 2 - NW / 2 - past * (CW + GAP)}px`;
    this.turn.classList.toggle('test', !!this.testLabel);
    this.turnLbl.style.left = `${W / 2}px`;
    // Sabit skill bölgesi (Ömer 0.8.2.3 telefon testi: 2 skill'li düşmanda Rest / Skip / Move ve Combat log ortaya kayıyordu): en az 4 yuva
    // genişliğinde, skill'ler soldan yuvalara dizilir; global sütun ve sağ alan skill sayısından bağımsız aynı yerde. 4'ten çok skill
    // (fazladan skill'li birim) bölgeyi iki yana eşit büyütür.
    const phone = document.documentElement.classList.contains('short');
    const PW = phone ? HUD_PLATE_W_PHONE : HUD_PLATE_W; // plaka genişliği (pasif plakası da aynı: 4 skill'in hemen solunda)
    const PG = HUD_PLATE_GAP;
    const slots = Math.max(HUD_SKILL_SLOTS, this.model.skills.length);
    const SKW = slots * PW + (slots - 1) * PG;
    const sx0 = W / 2 - (HUD_SKILL_SLOTS * PW + (HUD_SKILL_SLOTS - 1) * PG) / 2 - ((slots - HUD_SKILL_SLOTS) * (PW + PG)) / 2;
    // Telefonda (html.short; Ömer 2026-10-14 telefon testi) aralar daralır; Valor varken sağ alttaki Combat log ekrandan taşmasın diye
    // skill + global öbeği gerekirse sola, stat bloğuyla arasındaki boşluğa kayar (ekran içinde, en az 44 gerçek px dokunma alanıyla)
    const gSk = phone ? 12 : 22;
    const gGl = phone ? 10 : 20;
    const gVa = phone ? 12 : 24;
    const EDGE = 28;
    // Sağ alan global sütunun ölçülen genişliğinden sonra (telefonda globaller yatay, büyük dokunma alanlı: battle-hud.css > html.short)
    // ölçüm (zorunlu yerleşim) yalnızca global sütun ya da ekran değişince
    this.globW ??= this.globBox.offsetWidth;
    const hasValor = !this.valorBox.hidden;
    if (this.valorBox.classList.contains('tight')) this.valorBox.classList.remove('tight');
    let valorW = hasValor ? this.valorBox.offsetWidth + gVa : 0;
    const rightOf = (sx: number) => sx + SKW + gSk + Math.max(150, this.globW!) + gGl + valorW;
    let sx = sx0;
    // Dar telefon ekranında (sığmıyorsa) Valor sıkışır: "VALOR" yazısı gizlenir, mangallar üstte, Combat log simgesi hemen altında (aynı sütun)
    let tight = false;
    if (phone) {
      const need = Math.max(120, 52 * this.inv); // Combat log: en az 44 gerçek px + pay
      let over = rightOf(sx0) + need + EDGE - W;
      if (over > 0) {
        const actorR = this.actorBox.offsetLeft + this.actorBox.offsetWidth;
        const room = Math.max(0, sx0 - (PW + PG) - (actorR + 20)); // pasif plakası skill'lerin solunda
        if (hasValor && over > room) {
          tight = true;
          this.valorBox.classList.add('tight');
          valorW = this.valorBox.offsetWidth + gVa;
          over = rightOf(sx0) + EDGE - W;
        }
        sx = sx0 - Math.max(0, Math.min(over, room));
      }
    }
    this.rightSlot.classList.toggle('stacked', tight);
    this.skillBox.style.left = `${sx}px`;
    this.pasBox.style.left = `${sx - (PW + PG)}px`;
    this.pasBox.style.width = `${PW}px`;
    const gx = sx + SKW + gSk;
    this.globBox.style.left = `${gx}px`;
    // Valor mangalları global sütunun hemen sağında (yalnızca sefer / Endless); sağ alan onlardan sonra başlar
    let rx = gx + Math.max(150, this.globW) + gGl;
    if (hasValor) {
      this.valorBox.style.left = `${rx}px`;
      if (tight) {
        this.rightSlot.style.left = `${rx}px`;
        this.rightSlot.style.width = `${valorW - gVa}px`;
      }
      rx += valorW;
    }
    if (!tight) {
      this.rightSlot.style.left = `${rx}px`;
      this.rightSlot.style.width = `${Math.max(0, W - rx - EDGE)}px`;
    }
    this.cards.enemy.style.left = `${W - (phone ? 760 : 500) - 22}px`; // kart genişliği: battle-hud.css > .bh-card
  }

  // ------------------------------------------------------------------ birim kartları

  /** Fareyle üstüne gelinen birim (null = bıraktı). Sabitlenmiş kart o tarafta öncelikli; diğer taraf etkilenmez. */
  hoverCard(card: UnitCard | null, side?: Side): void {
    if (card) this.hover[card.enemy ? 'enemy' : 'party'] = card;
    else if (side) delete this.hover[side];
    else this.hover = {};
    this.renderCards();
  }

  /** Birime tıklama: o tarafta kart sabitlenir; aynı birime yeniden tıklamak sabiti kaldırır. true = sabitlendi. */
  togglePin(card: UnitCard): boolean {
    const side: Side = card.enemy ? 'enemy' : 'party';
    const pinned = this.pins[side]?.uid === card.uid;
    if (pinned) delete this.pins[side];
    else this.pins[side] = card;
    this.renderCards();
    this.cb.onPinChange?.();
    return !pinned;
  }

  /** Esc: tüm sabitleri kaldırır; bir şey kaldırıldıysa true. */
  unpinAll(): boolean {
    const had = !!(this.pins.party || this.pins.enemy);
    this.pins = {};
    if (had) {
      this.renderCards();
      this.cb.onPinChange?.();
    }
    return had;
  }

  pinnedUids(): string[] {
    return [this.pins.party?.uid, this.pins.enemy?.uid].filter((u): u is string => !!u);
  }

  /** Açık kartları güncel veriyle yeniden çizer (can, durumlar, önizleme değişti); birim yoksa (null) kart kapanır. */
  refreshCards(build: (uid: string) => UnitCard | null): void {
    for (const side of ['party', 'enemy'] as const) {
      const p = this.pins[side];
      if (p) {
        const c = build(p.uid);
        if (c) this.pins[side] = c;
        else delete this.pins[side];
      }
      const h = this.hover[side];
      if (h) {
        const c = build(h.uid);
        if (c) this.hover[side] = c;
        else delete this.hover[side];
      }
    }
    this.renderCards();
  }

  private renderCards(): void {
    for (const side of ['party', 'enemy'] as const) {
      const el = this.cards[side];
      const card = this.hover[side] ?? this.pins[side];
      // yalnızca değişen öznitelik / içerik yazılır (kartlar birkaç karede bir yenilenir; kapalı kart boşta her seferinde DOM'a yazılıyordu)
      if (!card || this.hidden) {
        if (this.tipEl && el.contains(this.tipEl)) this.hideTip();
        if (el.classList.contains('on') || el.classList.contains('pin')) el.classList.remove('on', 'pin');
        if (el.dataset['uid']) el.dataset['uid'] = '';
        continue;
      }
      const pinned = this.pins[side]?.uid === card.uid;
      for (const k of [...this.cardTips.keys()]) if (k.startsWith(`k:${side}:`)) this.cardTips.delete(k);
      card.skills?.forEach((s, i) => this.cardTips.set(`k:${side}:${i}`, s.tip));
      // aynı birimin kartı yenilenince (can, bekleme...) iç kaydırma yerinde kalır (innerHTML yeniden yazımı başa atardı)
      const keep = el.dataset['uid'] === card.uid ? (el.firstElementChild?.scrollTop ?? 0) : 0;
      if (this.put(el, this.cardHtml(card, pinned)) && keep > 0 && el.firstElementChild) el.firstElementChild.scrollTop = keep;
      if (el.dataset['uid'] !== card.uid) el.dataset['uid'] = card.uid;
      if (!el.classList.contains('on')) el.classList.add('on');
      if (el.classList.contains('pin') !== pinned) el.classList.toggle('pin', pinned);
    }
  }

  /**
   * Sabitlenen / üstüne gelinen birim kartı = "B · Band + Rows" (Ömer 2026-10-18, taslak public/mockups/stats-panels.html): ortak A-Band bileşeni
   * (src/ui/band-tip.ts): başlıkta ad + Lv, üstte ALLY / ENEMY satırı, rol + primary çipleri; gövde: HP / MP / Rage, MAIN / ATTACK / DEFENSE,
   * aktif buff / debuff'lar, skill satırları (ikon · ad · hedef · bedel · bekleme), pasif; alt çubuk yalnızca sabitliyken.
   */
  private cardHtml(c: UnitCard, pinned: boolean): string {
    const side: Side = c.enemy ? 'enemy' : 'party';
    const lab = (t: string) => `<div class="bh-cl">${esc(t)}</div>`;
    const div = '<div class="bt-div"></div>';
    const bar = (kind: 'hp' | 'mp' | 'rage', iconUrl: string, b: { value: number; max: number }) =>
      `<div class="bh-cb ${kind}"><div class="bh-cb-v">${img(iconUrl)}<b>${b.value}</b><span class="of">/ ${b.max}</span></div><div class="bh-bar ${kind}${kind === 'hp' && c.enemy ? ' en' : ''}"><i style="width:${pct(b.value, b.max)}"></i></div></div>`;
    const bars = [bar('hp', c.hpIcon ?? '', c.hp), c.mp ? bar('mp', c.mpIcon ?? '', c.mp) : '', c.rage ? bar('rage', c.rageIcon ?? '', c.rage) : ''].join('');
    // Üç sütun: MAIN = dört attribute; ATTACK / DEFENSE = karttaki ızgara etiketlerine göre (azalma yüzdesi teal, hizalı)
    const ATTACK = new Set(['CRIT', 'SPD', 'ACC', 'CDMG', 'DMG']);
    const row = (icon: string, label: string, value: string, color?: string, small?: string, pri = false, slot = false) =>
      `<div class="bh-sr${pri ? ' pri' : ''}">${img(icon)}<span class="k">${esc(label)}</span><span class="n" style="${color ? `color:${color}` : ''}">${esc(value)}</span>${small ? `<span class="rd">${esc(small)}</span>` : slot ? '<span class="rd"></span>' : ''}</div>`;
    const col = (title: string, rows: string) => `<div class="bh-sc">${lab(title)}${rows}</div>`;
    const cols = `<div class="bh-scols">${col('Main', c.attrs.map((s) => row(s.iconUrl, s.label, s.value, s.color, undefined, !!s.primary)).join(''))}${col('Attack', c.grid.filter((g) => ATTACK.has(g.label)).map((g) => row(g.iconUrl, g.label, g.value, g.color, g.small)).join(''))}${col('Defense', c.grid.filter((g) => !ATTACK.has(g.label)).map((g) => row(g.iconUrl, g.label, g.value, g.color, g.small, false, true)).join(''))}</div>`;
    // Aktif buff / debuff'lar (ayrı bölüm): ikon, ad, yığın, kalan tur; altında kısa açıklama
    const fx = c.effects
      .map(
        (e) =>
          `<div class="bh-e ${e.debuff ? 'bad' : ''}" style="--c:${e.color}">${e.iconUrl ? img(e.iconUrl, 'bh-ico bh-e-ico') : '<i class="bh-e-dia"></i>'}<b>${esc(e.name)}${e.stacks ? `<span class="st">x${e.stacks}</span>` : ''}</b><em>${esc(e.turns)}</em>${e.text ? `<span class="d">${esc(e.text)}</span>` : ''}</div>`,
      )
      .join('');
    // Skill satırları: ikon · ad · hedef · bedel · bekleme (bedel / bekleme sütunları hizalı)
    const sks = (c.skills ?? [])
      .map((s, i) => {
        const hg = img(s.cdIconUrl ?? '');
        const cost = s.cost
          ? `<span class="bt-chip${/^RAGE/i.test(s.cost.text) ? ' rg' : ''}">${img(s.cost.iconUrl ?? '')}<span class="n">${esc(s.cost.text.replace(/^RAGE /, ''))}</span></span>`
          : '<span class="bt-chip free">Free</span>';
        const cd = s.wait > 0 ? `<span class="bt-chip wait">${hg}<span class="n">${s.wait}</span>/${s.cd}</span>` : s.cd > 0 ? `<span class="bt-chip">${hg}<span class="n">${s.cd}</span></span>` : '';
        return `<div class="bh-cs${s.wait > 0 ? ' cool' : ''}" data-tip="k:${side}:${i}">${img(s.iconUrl, 'bh-ico bh-cs-ico')}<span class="n">${esc(s.name)}</span><span class="t">${esc(s.target)}</span><span class="c">${cost}</span><span class="d">${cd}</span></div>`;
      })
      .join('');
    const pas = c.passive
      ? `<div class="bh-cpas">${c.passive.iconUrl ? img(c.passive.iconUrl, 'bh-ico bh-cpas-ico') : ''}<div class="tx"><b>${esc(c.passive.name)}</b><span>${bandRichHtml(c.passive.text, undefined, false)}</span></div></div>`
      : '';
    const pv = c.preview
      ? `<div class="bh-pv">${img(c.preview.iconUrl)}<b>${esc(c.preview.skill)}</b>${c.preview.hit ? `<span class="r">${esc(c.preview.hit)}<em> to hit</em></span>` : ''}${c.preview.amount ? `<span>${esc(c.preview.amount)}</span>` : ''}${c.preview.note ? `<em class="n">${esc(c.preview.note)}</em>` : ''}</div>`
      : '';
    const chips: BandChip[] = [];
    if (c.role) chips.push({ text: c.role });
    if (c.primary) chips.push({ text: `${c.primary.name} primary`, ...(c.primary.iconUrl ? { icon: c.primary.iconUrl } : {}), tone: 'ac', color: '#ffb98a' });
    const body = [`<div class="bh-cbars">${bars}</div>`, div, cols, fx ? `${div}<div class="bh-csec">${lab('Effects')}<div class="bh-eff">${fx}</div></div>` : '', sks ? `${div}<div class="bh-csec">${lab('Skills')}<div class="bh-csl">${sks}</div></div>` : '', pas ? `${div}<div class="bh-csec">${lab('Passive')}${pas}</div>` : '', pv].join('');
    const html = bandTipHtml({
      kind: `${c.tag ? `${c.tag.text} · ` : ''}${c.enemy ? 'Enemy' : 'Ally'}`,
      title: c.name,
      ...(c.nameColor ? { titleColor: c.nameColor } : {}),
      icon: c.portraitUrl,
      iconShape: 'portrait',
      ...(c.flip ? { iconFlip: true } : {}),
      ...(c.level !== undefined ? { value: `Lv ${c.level}` } : {}),
      chips,
      bodyHtml: body,
      ...(pinned ? { foot: 'Pinned · tap again or Esc to close' } : {}),
    });
    // Sabit kartta sağ üst X (Ömer 2026-10-19: telefonda Esc yok); kaydırma kabının dışında, dokunma hedefi en az 44 gerçek piksel
    const x = pinned ? `<button type="button" class="bh-card-x" data-unpin="${side}" aria-label="Close card" title="Close">${navSvg('close')}</button>` : '';
    // X başlık satırının İÇİNDE (dikey ortalı, kenardan eşit pay); "Lv" için sağda yer ayrılır (battle-hud.css > .bh-card.pin .bt-head)
    return `<div class="bh-card-sc">${x ? html.replace('<div class="bt-head">', `<div class="bt-head">${x}`) : html}</div>`;
  }

  // ------------------------------------------------------------------ bağlam ipucu (hücre: yürü, ceset, diriltme...)

  /** Hücre / ceset ipuçları: alt çubuğun hemen üstünde, ortada (boş yere gelince gösterilmez). */
  showContextTip(t: TipContent): void {
    this.ctip.innerHTML = tipHtml(t);
    tipOn(this.ctip);
    this.root.classList.add('ctx');
  }

  hideContextTip(): void {
    tipOff(this.ctip);
    this.root.classList.remove('ctx');
  }

  // ------------------------------------------------------------------ olaylar

  private onOver(e: PointerEvent): void {
    if (e.pointerType === 'touch') return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (t && t !== this.tipEl && !this.tipPinned) this.showTip(t);
  }

  private onOut(e: PointerEvent): void {
    if (e.pointerType === 'touch' || this.tipPinned) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (t && !(e.relatedTarget instanceof Node && t.contains(e.relatedTarget))) this.hideTip();
  }

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const un = target.closest<HTMLElement>('[data-unpin]');
    if (un) {
      const side = un.dataset['unpin'] as Side;
      if (this.pins[side]) {
        delete this.pins[side];
        this.renderCards();
        this.cb.onPinChange?.();
      }
      return;
    }
    if (target.closest('.bh-sktip, .bh-logp')) return;
    const pl = target.closest<HTMLElement>('[data-panel]');
    if (pl) {
      this.setPanel(this.panel ? null : 'log');
      return;
    }
    const sk = target.closest<HTMLElement>('[data-skill]');
    if (sk && this.pressFired) {
      this.pressFired = false; // uzun basma yalnızca açıklamayı gösterdi: skill seçilmez
      return;
    }
    if (sk) {
      this.hideTip();
      this.cb.onSkill(sk.dataset['skill']!);
      return;
    }
    const gl = target.closest<HTMLElement>('[data-global]');
    if (gl) {
      this.hideTip();
      this.cb.onGlobal(gl.dataset['global']!);
      return;
    }
    const tp = target.closest<HTMLElement>('[data-tip]');
    const inSheet = !!target.closest('.bh-sheet');
    // Dokunmatik: stata dokununca açıklama açılır / kapanır
    if (tp && (e as PointerEvent).pointerType === 'touch') {
      if (this.tipEl === tp && this.tipPinned) this.hideTip();
      else {
        this.showTip(tp);
        this.tipPinned = true;
      }
    }
    if (inSheet) return;
    if (target.closest('[data-open]')) {
      this.setOpen(!this.open);
      return;
    }
  }

  private showTip(el: HTMLElement): void {
    const key = el.dataset['tip'] ?? '';
    const ct = this.cardTips.get(key);
    const t = this.tips.get(key) ?? (typeof ct === 'function' ? ct() : ct);
    if (!t) return;
    this.ftip.innerHTML = tipHtml(t);
    tipOn(this.ftip);
    // Öğenin hemen üstünde (yer yoksa altında); ölçek: root dönüştürülmüş, offset'ler oyun biriminde
    const rr = this.root.getBoundingClientRect();
    const rot = document.documentElement.classList.contains('rotated');
    const { x: ex, y: ey, w: ew, h: eh } = rectToLocal(el.getBoundingClientRect(), rr, this.root.offsetWidth, rot);
    const tw = this.ftip.offsetWidth;
    const th = this.ftip.offsetHeight;
    const card = el.closest<HTMLElement>('.bh-card');
    const side = el.closest('.bh-sheet') ? 'right' : card ? 'beside' : 'above';
    let x = side === 'right' ? ex + ew + 16 : ex + ew / 2 - tw / 2;
    let y = side === 'right' || side === 'beside' ? ey + eh / 2 - th / 2 : ey - th - 12;
    if (card) {
      // Birim kartının skill satırı: ipucu kartın yanında, tahtaya doğru (dost kartı solda: sağına; düşman kartı sağda: soluna)
      const { x: cl, w: cw } = rectToLocal(card.getBoundingClientRect(), rr, this.root.offsetWidth, rot);
      x = card.classList.contains('enemy') ? cl - tw - 16 : cl + cw + 16;
    }
    if (y < 10 && side === 'above') y = ey + eh + 12;
    x = Math.max(12, Math.min(this.viewW - tw - 12, x));
    y = Math.max(10, Math.min(1080 - th - 10, y));
    this.ftip.style.left = `${x}px`;
    this.ftip.style.top = `${y}px`;
    this.tipEl?.classList.remove('tip');
    this.tipEl = el;
    if (card) el.classList.add('tip');
  }

  hideTip(): void {
    tipOff(this.ftip);
    if (this.tipEl?.classList.contains('bh-cs')) this.tipEl.classList.remove('tip');
    this.tipEl = null;
    this.tipPinned = false;
  }
}
