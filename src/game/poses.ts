/**
 * Karakter POZ KÜTÜPHANESİ (Ömer 2026-10-11; docs/design/future-ideas.md "Karakter animasyonları: ortak poz kütüphanesi + dinamik silah").
 * Saf modül (Phaser yok): veri erişimi, silah görseli seçimi, skill -> poz çözümü, birleştirme sınırları ve 2D canvas birleştirmesi.
 *
 *  - Gövde pozları ayrı görseller (assets/poses/<dir>/<poz>.png, eller BOŞ), hepsi aynı tuvalde: ayak ortası (footX, footY) ortak.
 *  - Silah AYRI katman: her pozun el noktası (anchor x/y + açı) var; takılı silahın görseli (aile + nadirlik -> görünüm) oraya çizilir.
 *  - Çalışma anında (src/game/pose-rig.ts) gövde + silah her poz için TEK kareye pişirilir; CombatantView bu kareler arasında geçer.
 *  - Pozu olmayan sınıf bugünkü gibi (tek sprite + kod tweenleri). Motor / oyun kuralı DEĞİŞMEZ: yalnızca sunum.
 * Veri: data/poses.json (ölçümler tools/make-poses.mjs, el noktaları tools/pose-editor.mjs), skill eşlemesi skills.json > pose.
 */
import raw from '../../data/poses.json';

export interface PoseAnchor {
  x: number;
  y: number;
  /** Silah açısı (derece, saat yönü; 0 = ağız yukarı). */
  angle: number;
}
export interface PoseDef {
  box?: { x: number; y: number; w: number; h: number };
  anchor: PoseAnchor;
  offhand?: { x: number; y: number };
  /** Silahı yatay aynala (balta ağzının yönü). */
  flip?: boolean;
  /** Silah gövdenin arkasında. */
  back?: boolean;
  /** Silah çizilmez. */
  hidden?: boolean;
  /** Yumruk yamasının yarıçapı (0 = yama yok). */
  fist?: number;
}
export interface PoseClassDef {
  dir: string;
  canvas: { w: number; h: number; footX: number; footY: number };
  figure: { w: number; h: number };
  /** Ekranda figür boyu = spriteBox.height x heightFit. */
  heightFit: number;
  /** true: boşta bugünkü idle.png (sprite) kalır; pozlar yalnızca eylemde. */
  idleSprite: boolean;
  defaultWeapon: WeaponPick;
  cycles: Record<string, string[]>;
  /** Genel durumlar (idle, step, hit, death, attack, cast, defend) -> poz. */
  states: Record<string, string>;
  poses: Record<string, PoseDef>;
}
export interface WeaponLook {
  w: number;
  h: number;
  grip: { x: number; y: number };
}
export interface WeaponFamilyArt {
  /** Silah boyu (gövde tuvali pikseli). */
  length: number;
  looks: Record<string, WeaponLook>;
  order: string[];
}
export interface PosesData {
  classes: Record<string, PoseClassDef>;
  weapons: Record<string, WeaponFamilyArt>;
  itemArt: Record<string, string>;
  familyArt: Record<string, string>;
  rarityLook: Record<string, number>;
  rarityGlow: Record<string, string>;
  fistRadius: number;
  /** Başka sınıfın poz kütüphanesini kullanan sınıflar (Pose Tester I/II -> warrior). */
  classAliases?: Record<string, string>;
}

export const POSES = raw as unknown as PosesData;

/** Çizilecek silah: görsel ailesi + görünüm (+ nadirlik ışıltısı rengi). */
export interface WeaponPick {
  family: string;
  look: string;
  glow?: string;
}

/** Kütüphanenin asıl sahibi (takma ad çözülür: Pose Tester -> warrior). */
export const poseOwner = (classId: string): string => POSES.classAliases?.[classId] ?? classId;
/** Bu sınıfın poz kütüphanesi (yoksa null: bugünkü davranış). */
export const poseClass = (classId: string): PoseClassDef | null => POSES.classes[poseOwner(classId)] ?? null;
export const hasPoses = (classId: string): boolean => !!poseClass(classId);
export const poseClassIds = (): string[] => Object.keys(POSES.classes);
export const poseNames = (classId: string): string[] => Object.keys(poseClass(classId)?.poses ?? {});

/** Kimlik (ör. '<aile>.<görünüm>.<ışıltı>'): pişmiş doku anahtarı. */
export const weaponKey = (w: WeaponPick): string => `${w.family}.${w.look}${w.glow ? `.${w.glow.replace('#', '')}` : ''}`;

/**
 * Takılı silah item'inden çizilecek silah: görsel ailesi önce item'in kendi eşlemesinden (itemArt: 'arming_sword' -> swords), yoksa item
 * ailesinden (familyArt: axes -> axes); görünüm nadirlikten (Common/Uncommon sade, Rare orta, Epic/Legendary süslü); Rare+ ince ışıltı.
 * Görseli olmayan aile (ör. maces) ya da item yoksa sınıfın varsayılan silahı (ışıltısız).
 */
export function weaponFor(classId: string, item: { id: string; family?: string; rarity?: string } | null | undefined): WeaponPick | null {
  const def = poseClass(classId);
  if (!def) return null;
  const fam = item ? (POSES.itemArt[item.id] ?? (item.family ? POSES.familyArt[item.family] : undefined)) : undefined;
  const art = fam ? POSES.weapons[fam] : undefined;
  if (!item || !fam || !art) return { ...def.defaultWeapon };
  const idx = Math.min(art.order.length - 1, Math.max(0, POSES.rarityLook[item.rarity ?? 'common'] ?? 0));
  const glow = POSES.rarityGlow[item.rarity ?? ''];
  return { family: fam, look: art.order[idx]!, ...(glow ? { glow } : {}) };
}

/** Tüm silah görünümleri (önizleme ve debug silah seçici). */
export const allWeapons = (): WeaponPick[] => Object.entries(POSES.weapons).flatMap(([family, f]) => f.order.map((look) => ({ family, look })));

/**
 * Skill'in poz dizisi (skills.json > pose: tek ad ya da sıralı ad listesi; ad bir döngü olabilir: 'spin' -> spin1..3). Pozu olmayan
 * skill'de `attack`/`cast` durumu (motion'a göre). Dönen her öğe bir "anahtar poz": ilk = hazırlık/yaklaşma, son = vuruş anı.
 */
export function skillPoses(classId: string, skill: { pose?: string | string[]; motion?: string } | null | undefined): string[] {
  const def = poseClass(classId);
  if (!def || !skill) return [];
  const list = skill.pose === undefined ? [] : Array.isArray(skill.pose) ? skill.pose : [skill.pose];
  const known = list.filter((p) => def.poses[p] || def.cycles[p]);
  if (known.length) return known;
  const state = skill.motion === 'cast' || skill.motion === 'self' ? 'cast' : 'attack';
  const p = def.states[state];
  return p ? [p] : [];
}

/** Ad döngüyse kareleri, tek pozsa kendisi. */
export const cycleFrames = (def: PoseClassDef, name: string): string[] => def.cycles[name] ?? (def.poses[name] ? [name] : []);

/** Döngünün anahtar karesi (Reduced motion: kare döngüsü yok, yalnızca bu): ortadaki kare. */
export const keyFrame = (def: PoseClassDef, name: string): string | null => {
  const f = cycleFrames(def, name);
  return f[Math.floor((f.length - 1) / 2)] ?? null;
};

/** Genel durumun pozu (idle/step/hit/death/attack/cast/defend). */
export const statePose = (def: PoseClassDef, state: string): string | null => {
  const p = def.states[state];
  return p && def.poses[p] ? p : null;
};

/** Silah boyuna ölçek (görünüm pikseli -> gövde tuvali pikseli). */
export const weaponScale = (fam: WeaponFamilyArt, look: WeaponLook): number => fam.length / look.h;

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Silah ışıltısı için kenar payı (gövde tuvali pikseli). */
export const GLOW_PAD = 12;

/** Bir pozun birleşik sınırı (gövde kutusu + döndürülmüş silah dörtgeni), gövde tuvali koordinatı; alt sınır taban çizgisinde kırpılır. */
export function poseBounds(def: PoseClassDef, name: string, w: WeaponPick | null): Box {
  const p = def.poses[name]!;
  const b = p.box ?? { x: 0, y: 0, w: def.canvas.w, h: def.canvas.h };
  const box: Box = { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
  const fam = w ? POSES.weapons[w.family] : undefined;
  const look = fam && w ? fam.looks[w.look] : undefined;
  if (fam && look && !p.hidden) {
    const k = weaponScale(fam, look);
    const a = (p.anchor.angle * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pad = w?.glow ? GLOW_PAD : 2;
    for (const [px, py] of [[0, 0], [look.w, 0], [0, look.h], [look.w, look.h]] as const) {
      let lx = (px - look.grip.x) * k;
      const ly = (py - look.grip.y) * k;
      if (p.flip) lx = -lx;
      const x = p.anchor.x + lx * c - ly * s;
      const y = p.anchor.y + lx * s + ly * c;
      box.x0 = Math.min(box.x0, x - pad);
      box.x1 = Math.max(box.x1, x + pad);
      box.y0 = Math.min(box.y0, y - pad);
      box.y1 = Math.max(box.y1, y + pad);
    }
  }
  box.y1 = Math.min(box.y1, def.canvas.footY);
  return box;
}

/**
 * Tüm pozları kapsayan ORTAK kare (ayak ortası tam ortada, taban en altta): sprite kökeni (0.5, 1) her karede ayakları aynı yere koyar.
 * `halfW` ayak ortasından yana, `up` tabandan yukarı (gövde tuvali pikseli).
 */
export function frameExtent(def: PoseClassDef, w: WeaponPick | null): { halfW: number; up: number } {
  let halfW = 1;
  let up = 1;
  for (const name of Object.keys(def.poses)) {
    const b = poseBounds(def, name, w);
    halfW = Math.max(halfW, def.canvas.footX - b.x0, b.x1 - def.canvas.footX);
    up = Math.max(up, def.canvas.footY - b.y0);
  }
  return { halfW: Math.ceil(halfW), up: Math.ceil(up) };
}

/** drawImage alabilen kaynak (HTMLImageElement / canvas). */
type Src = CanvasImageSource;

/**
 * Bir pozu gövde tuvali koordinatında çizer (çağıran dönüşümü önceden kurar). Sıra: (arkadaysa silah) gövde (öndeyse silah + yumruk
 * yaması: el çevresindeki gövde pikselleri kabzanın üstüne yeniden çizilir, yumruk kabzayı SARAR). `glowPx` ışıltı bulanıklığı (cihaz pikseli).
 * tools/pose-editor.html ve tools/make-poses.mjs --preview aynı kuralı uygular.
 */
export function drawPoseComposite(ctx: CanvasRenderingContext2D, def: PoseClassDef, name: string, body: Src, weapon: { img: Src; pick: WeaponPick } | null, glowPx = 0): void {
  const p = def.poses[name];
  if (!p) return;
  const { w: CW, h: CH } = def.canvas;
  const fam = weapon ? POSES.weapons[weapon.pick.family] : undefined;
  const look = fam && weapon ? fam.looks[weapon.pick.look] : undefined;
  const drawWeapon = () => {
    if (!weapon || !fam || !look || p.hidden) return;
    const k = weaponScale(fam, look);
    ctx.save();
    ctx.translate(p.anchor.x, p.anchor.y);
    ctx.rotate((p.anchor.angle * Math.PI) / 180);
    ctx.scale(p.flip ? -k : k, k);
    if (weapon.pick.glow && glowPx > 0) {
      ctx.shadowColor = weapon.pick.glow;
      ctx.shadowBlur = glowPx;
    }
    ctx.drawImage(weapon.img, -look.grip.x, -look.grip.y, look.w, look.h);
    ctx.restore();
  };
  if (p.back) drawWeapon();
  ctx.drawImage(body, 0, 0, CW, CH);
  if (p.back || p.hidden || !weapon) return;
  drawWeapon();
  const r = p.fist ?? POSES.fistRadius;
  if (r <= 0) return;
  for (const h of [p.anchor, p.offhand]) {
    if (!h) continue;
    ctx.save();
    ctx.beginPath();
    ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(body, 0, 0, CW, CH);
    ctx.restore();
  }
}

/** Veri denetimi (tests/poses.test.ts): her sınıfın durumları, döngüleri ve el noktaları geçerli mi; silah görünümleri tam mı. */
export function validatePoses(data: PosesData = POSES): string[] {
  const errors: string[] = [];
  for (const [id, def] of Object.entries(data.classes)) {
    if (!def.canvas || !def.figure) errors.push(`${id}: canvas/figure measurements missing (run tools/make-poses.mjs)`);
    for (const [state, p] of Object.entries(def.states)) if (!def.poses[p]) errors.push(`${id}: state ${state} -> unknown pose ${p}`);
    for (const [c, frames] of Object.entries(def.cycles)) for (const f of frames) if (!def.poses[f]) errors.push(`${id}: cycle ${c} -> unknown pose ${f}`);
    for (const [name, p] of Object.entries(def.poses)) {
      if (!p.anchor || !Number.isFinite(p.anchor.x) || !Number.isFinite(p.anchor.y) || !Number.isFinite(p.anchor.angle)) errors.push(`${id}/${name}: anchor missing`);
      else if (def.canvas && (p.anchor.x < 0 || p.anchor.y < 0 || p.anchor.x > def.canvas.w || p.anchor.y > def.canvas.h)) errors.push(`${id}/${name}: anchor outside canvas`);
    }
    const dw = def.defaultWeapon;
    if (!data.weapons[dw.family]?.looks[dw.look]) errors.push(`${id}: default weapon ${dw.family}/${dw.look} has no art`);
  }
  for (const [fam, f] of Object.entries(data.weapons)) {
    if (!(f.length > 0)) errors.push(`${fam}: length`);
    for (const l of f.order) if (!f.looks[l]) errors.push(`${fam}: look ${l} not measured`);
  }
  for (const [alias, owner] of Object.entries(data.classAliases ?? {})) if (!data.classes[owner]) errors.push(`classAliases ${alias} -> unknown class ${owner}`);
  for (const [item, fam] of Object.entries(data.itemArt)) if (!data.weapons[fam]) errors.push(`itemArt ${item} -> unknown family ${fam}`);
  for (const [f, fam] of Object.entries(data.familyArt)) if (!data.weapons[fam]) errors.push(`familyArt ${f} -> unknown family ${fam}`);
  return errors;
}
