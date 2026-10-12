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
  /** İkinci (sol) el: kalkan / ikinci hançer burada çizilir (açı yoksa ana elin açısı); çift elde kabzadaki el (yalnızca yumruk yaması). */
  offhand?: { x: number; y: number; angle?: number };
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
  /** Genel durumlar (idle, step, hit, death, attack, cast, defend) -> poz (tutuş takımı varsa mantıksal ad: `grips` çözer). */
  states: Record<string, string>;
  /**
   * Tutuş takımları (v2, Ömer 2026-10-12 "Silah ve tutuş kuralları"): tutuş -> { mantıksal poz adı -> kare / döngü adı }. Ör. one.idle = idle1,
   * two.spin = spin2 (döngü). Haritada olmayan ad (raise, point, hit...) ortaktır. Yoksa sınıf tek takımlıdır (v1).
   */
  grips?: Partial<Record<Grip, Record<string, string>>>;
  /** Kendi takımı olmayan tutuş -> kullanılacak takım (şimdilik bow / charm -> one). */
  gripFallback?: Partial<Record<Grip, Grip>>;
  /** Tutuşa göre, görseli olmayan silahın yerine çizilen silah (ör. two -> balta; Avenger's Maul görseli gelene dek). */
  gripWeapon?: Partial<Record<Grip, { family: string; look: string }>>;
  /** Silah boyu çarpanı (ailelerin `length` değeri v1 Warrior figürüne göre; başka boy figürde oran). */
  weaponScale?: number;
  /** Pozlu birimin isabet tepkisi (kod): saldırandan geriye eğilme (derece) + çökme oranı. */
  hitRecoil?: { leanDeg: number; crouch: number };
  poses: Record<string, PoseDef>;
}
export interface WeaponLook {
  w: number;
  h: number;
  grip: { x: number; y: number };
  /** Bu görünümün boyu (yoksa ailenin `length`'i): ör. kule kalkanı yuvarlaktan büyük. */
  length?: number;
}
export interface WeaponFamilyArt {
  /** Silah boyu (gövde tuvali pikseli; v1 Warrior figür ölçeği, sınıfın weaponScale'i ile çarpılır). */
  length: number;
  /** Ailenin tutuşu (debug silah seçici ve görseli seçerken): two / bow / charm; offhand = yalnızca ikinci el (kalkan). Yoksa tek el. */
  hold?: Grip | 'offhand';
  /** El açısından bağımsız DİK çizilir (kalkan: önden görünüm). */
  upright?: boolean;
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
  /** Başlarken küçük savunma hareketi yapan skill'ler (Guard kopyası; gerçek koruma pozu gelene dek). */
  braceSkills?: string[];
  /** Başka sınıfın poz kütüphanesini kullanan sınıflar (Pose Tester'lar -> warrior_v2). */
  classAliases?: Record<string, string>;
  /** Tutuşa göre aile görseli (yalnızca tutuş takımı olan sınıfta): ör. two.axes = greataxes, two.maces = mauls. */
  gripArt?: Partial<Record<Grip, Record<string, string>>>;
  /** Item'e özel görünüm (ailede varsa nadirlik yerine): ör. hex_doll -> doll, dane_axe -> dane. */
  itemLook?: Record<string, string>;
}

export const POSES = raw as unknown as PosesData;

/** Silah tutuşu (data/items.json > grip): tek el, çift el, yay, tılsım. */
export type Grip = 'one' | 'two' | 'bow' | 'charm';

/**
 * Çizilecek silah: görsel ailesi + görünüm (+ nadirlik ışıltısı rengi), tutuş (poz takımını seçer; yoksa 'one') ve ikinci eldeki eşya
 * (kalkan / ikinci hançer; `offhand.family` POSES.weapons içinde görseli olan aile, yalnızca tek el tutuşta çizilir).
 */
export interface WeaponPick {
  family: string;
  look: string;
  glow?: string;
  grip?: Grip;
  offhand?: { family: string; look: string };
}

/** Kütüphanenin asıl sahibi (takma ad çözülür: Pose Tester -> warrior). */
export const poseOwner = (classId: string): string => POSES.classAliases?.[classId] ?? classId;
/** Bu sınıfın poz kütüphanesi (yoksa null: bugünkü davranış). */
export const poseClass = (classId: string): PoseClassDef | null => POSES.classes[poseOwner(classId)] ?? null;
export const hasPoses = (classId: string): boolean => !!poseClass(classId);
export const poseClassIds = (): string[] => Object.keys(POSES.classes);
export const poseNames = (classId: string): string[] => Object.keys(poseClass(classId)?.poses ?? {});

/** Kimlik (ör. '<aile>.<görünüm>.<ışıltı>'): pişmiş doku anahtarı. */
export const weaponKey = (w: WeaponPick): string =>
  `${w.family}.${w.look}${w.glow ? `.${w.glow.replace('#', '')}` : ''}${w.grip && w.grip !== 'one' ? `.${w.grip}` : ''}${w.offhand ? `+${w.offhand.family}.${w.offhand.look}` : ''}`;

/** Bu sınıfta kullanılacak poz takımının tutuşu: kendi takımı varsa o, yoksa gripFallback, yoksa 'one'. Takımsız sınıfta verilen. */
export function poseGrip(def: PoseClassDef, grip: Grip | undefined): Grip {
  const g = grip ?? 'one';
  if (!def.grips || def.grips[g]) return g;
  const f = def.gripFallback?.[g];
  return f && def.grips[f] ? f : 'one';
}

/** Mantıksal poz adı -> bu tutuşun karesi / döngüsü (haritada yoksa adın kendisi: ortak poz ya da zaten kare adı). */
export const resolvePose = (def: PoseClassDef, name: string, grip?: Grip): string => def.grips?.[poseGrip(def, grip)]?.[name] ?? name;

/** Bu tutuşta kullanılan kareler (pişirilecek): başka tutuş takımına ait olup bu takımda geçmeyen kareler hariç. Takımsız sınıfta tümü. */
export function gripFrames(def: PoseClassDef, grip?: Grip): string[] {
  const all = Object.keys(def.poses);
  if (!def.grips) return all;
  const expand = (names: string[]) => names.flatMap((n) => def.cycles[n] ?? [n]);
  const g = poseGrip(def, grip);
  const own = new Set(expand(Object.values(def.grips[g] ?? {})));
  const other = new Set(Object.entries(def.grips).filter(([k]) => k !== g).flatMap(([, m]) => expand(Object.values(m ?? {}))));
  return all.filter((n) => own.has(n) || !other.has(n));
}

/** Tutuş ikinci eli kapatıyor mu (çift el, yay, tılsım): ikinci el eşyası çizilmez. */
export const gripBlocksOffhand = (grip: Grip | undefined): boolean => grip === 'two' || grip === 'bow' || grip === 'charm';

/**
 * Takılı silah item'inden çizilecek silah: görsel ailesi önce item'in kendi eşlemesinden (itemArt: 'arming_sword' -> swords), yoksa item
 * ailesinden (familyArt: axes -> axes); görünüm nadirlikten (Common/Uncommon sade, Rare orta, Epic/Legendary süslü); Rare+ ince ışıltı.
 * Görseli olmayan aile (ör. maces) ya da item yoksa sınıfın varsayılan silahı (ışıltısız).
 */
export function weaponFor(
  classId: string,
  item: { id: string; family?: string; rarity?: string; grip?: string } | null | undefined,
  off?: { id: string; family?: string; rarity?: string; shield?: boolean } | null,
): WeaponPick | null {
  const def = poseClass(classId);
  if (!def) return null;
  const grip = (item?.grip as Grip | undefined) ?? 'one';
  // tutuşu poz takımı olan sınıfta bilinir (v1 Warrior tek takımlı: eski davranış birebir)
  const out: WeaponPick = (item && artPick(item, def.grips ? grip : undefined)) || { ...(def.grips ? (def.gripWeapon?.[grip] ?? def.defaultWeapon) : def.defaultWeapon) };
  if (def.grips && grip !== 'one') out.grip = grip;
  // ikinci el yalnızca tek el silahla (ya da silahsız); görseli olan aile çizilir (kalkan / hançer görseli gelene dek yok: veri yolu hazır)
  const offArt = def.grips && off && !gripBlocksOffhand(grip) ? artPick({ ...off, ...(off.shield ? { family: 'shield' } : {}) }) : null;
  if (offArt) out.offhand = { family: offArt.family, look: offArt.look };
  return out;
}

/**
 * Item -> görsel ailesi + görünüm (+ışıltı): itemArt (item kimliği) önce, sonra tutuşa özel aile (gripArt: çift el balta -> greataxes),
 * sonra familyArt (kalkanlar 'shield' anahtarıyla). Görünüm itemLook (ailede varsa), yoksa nadirlikten. Görseli yoksa null.
 */
function artPick(item: { id: string; family?: string; rarity?: string }, grip?: Grip): WeaponPick | null {
  const byFamily = item.family ? ((grip ? POSES.gripArt?.[grip]?.[item.family] : undefined) ?? POSES.familyArt[item.family]) : undefined;
  const fam = POSES.itemArt[item.id] ?? byFamily;
  const art = fam ? POSES.weapons[fam] : undefined;
  if (!fam || !art) return null;
  const own = POSES.itemLook?.[item.id];
  const idx = Math.min(art.order.length - 1, Math.max(0, POSES.rarityLook[item.rarity ?? 'common'] ?? 0));
  const glow = POSES.rarityGlow[item.rarity ?? ''];
  return { family: fam, look: own && art.looks[own] ? own : art.order[idx]!, ...(glow ? { glow } : {}) };
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
  // mantıksal ad (slash, spin...) her tutuş takımında çözülmeli; tutuş çizim anında (CombatantView) seçilir
  const known = list.filter((p) => {
    const r = resolvePose(def, p, 'one');
    return def.poses[r] || def.cycles[r];
  });
  if (known.length) return known;
  const state = skill.motion === 'cast' || skill.motion === 'self' ? 'cast' : 'attack';
  const p = def.states[state];
  return p ? [p] : [];
}

/** Ad döngüyse kareleri, tek pozsa kendisi (mantıksal ad tutuşla çözülür: spin -> spin1 / spin2). */
export const cycleFrames = (def: PoseClassDef, name: string, grip?: Grip): string[] => {
  const r = resolvePose(def, name, grip);
  return def.cycles[r] ?? (def.poses[r] ? [r] : []);
};

/** Döngünün anahtar karesi (Reduced motion: kare döngüsü yok, yalnızca bu): ortadaki kare. */
export const keyFrame = (def: PoseClassDef, name: string, grip?: Grip): string | null => {
  const f = cycleFrames(def, name, grip);
  return f[Math.floor((f.length - 1) / 2)] ?? null;
};

/** Genel durumun pozu (idle/step/hit/death/attack/cast/defend), tutuşa göre karesi (döngüyse anahtar karesi). */
export const statePose = (def: PoseClassDef, state: string, grip?: Grip): string | null => {
  const p = def.states[state];
  return p ? keyFrame(def, p, grip) : null;
};

/** Silah boyuna ölçek (görünüm pikseli -> gövde tuvali pikseli); `def` verilirse sınıfın silah boyu çarpanıyla. */
export const weaponScale = (fam: WeaponFamilyArt, look: WeaponLook, def?: PoseClassDef): number => ((look.length ?? fam.length) / look.h) * (def?.weaponScale ?? 1);

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
  const box = itemBounds(def, name, w, false);
  if (w?.offhand && !gripBlocksOffhand(w.grip)) {
    const o = itemBounds(def, name, { ...w.offhand, ...(w.glow ? { glow: w.glow } : {}) }, true);
    box.x0 = Math.min(box.x0, o.x0);
    box.x1 = Math.max(box.x1, o.x1);
    box.y0 = Math.min(box.y0, o.y0);
    box.y1 = Math.min(Math.max(box.y1, o.y1), def.canvas.footY);
  }
  return box;
}

/** El noktası + açısı: ana el ya da ikinci el (açısı yoksa ana elin; dik aile = 0). Yoksa null. */
function handOf(p: PoseDef, offhand: boolean, fam: WeaponFamilyArt): PoseAnchor | null {
  const h = offhand ? (p.offhand ? { x: p.offhand.x, y: p.offhand.y, angle: p.offhand.angle ?? p.anchor.angle } : null) : p.anchor;
  return h && fam.upright ? { ...h, angle: 0 } : h;
}

/** Gövde kutusu + bir eldeki eşyanın döndürülmüş dörtgeni (ana el ya da `offhand`). */
function itemBounds(def: PoseClassDef, name: string, w: WeaponPick | null, offhand: boolean): Box {
  const p = def.poses[name]!;
  const b = p.box ?? { x: 0, y: 0, w: def.canvas.w, h: def.canvas.h };
  const box: Box = { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
  const fam = w ? POSES.weapons[w.family] : undefined;
  const look = fam && w ? fam.looks[w.look] : undefined;
  const hand = fam ? handOf(p, offhand, fam) : null;
  if (fam && look && hand && !p.hidden) {
    const k = weaponScale(fam, look, def);
    const a = (hand.angle * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pad = w?.glow ? GLOW_PAD : 2;
    for (const [px, py] of [[0, 0], [look.w, 0], [0, look.h], [look.w, look.h]] as const) {
      let lx = (px - look.grip.x) * k;
      const ly = (py - look.grip.y) * k;
      if (p.flip && !offhand) lx = -lx;
      const x = hand.x + lx * c - ly * s;
      const y = hand.y + lx * s + ly * c;
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
  for (const name of gripFrames(def, w?.grip)) {
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
export function drawPoseComposite(
  ctx: CanvasRenderingContext2D,
  def: PoseClassDef,
  name: string,
  body: Src,
  weapon: { img: Src; pick: WeaponPick; offImg?: Src | null } | null,
  glowPx = 0,
): void {
  const p = def.poses[name];
  if (!p) return;
  const { w: CW, h: CH } = def.canvas;
  /** Bir eldeki eşya (ana el ya da ikinci el); görseli / ölçüsü yoksa çizmez. */
  const drawItem = (img: Src | null | undefined, family: string | undefined, lookId: string | undefined, offhand: boolean) => {
    const fam = family ? POSES.weapons[family] : undefined;
    const look = fam && lookId ? fam.looks[lookId] : undefined;
    const hand = fam ? handOf(p, offhand, fam) : null;
    if (!img || !fam || !look || !hand || p.hidden) return;
    const k = weaponScale(fam, look, def);
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate((hand.angle * Math.PI) / 180);
    ctx.scale(p.flip && !offhand ? -k : k, k);
    if (weapon?.pick.glow && glowPx > 0) {
      ctx.shadowColor = weapon.pick.glow;
      ctx.shadowBlur = glowPx;
    }
    ctx.drawImage(img, -look.grip.x, -look.grip.y, look.w, look.h);
    ctx.restore();
  };
  const main = () => drawItem(weapon?.img, weapon?.pick.family, weapon?.pick.look, false);
  // ikinci el: yalnızca tek el tutuşta (kalkan / ikinci hançer; görseli yoksa hiçbir şey çizilmez)
  const off = weapon?.pick.offhand && !gripBlocksOffhand(weapon.pick.grip) ? weapon.pick.offhand : null;
  const second = () => off && drawItem(weapon?.offImg, off.family, off.look, true);
  const shieldOnTop = !!off && !!POSES.weapons[off.family]?.upright;
  if (p.back) main();
  ctx.drawImage(body, 0, 0, CW, CH);
  if (p.hidden || !weapon) return;
  if (!p.back) main();
  if (!shieldOnTop) second();
  const r = p.fist ?? POSES.fistRadius;
  // yumruk yaması: el çevresindeki gövde pikselleri kabzanın üstüne (yumruk sarar); kalkan bunun da üstünde (kol kalkanın arkasında)
  if (r > 0)
    for (const h of [p.back ? null : p.anchor, off ? p.offhand : p.back ? null : p.offhand]) {
      if (!h) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(body, 0, 0, CW, CH);
      ctx.restore();
    }
  if (shieldOnTop) second();
}

/** Veri denetimi (tests/poses.test.ts): her sınıfın durumları, döngüleri ve el noktaları geçerli mi; silah görünümleri tam mı. */
export function validatePoses(data: PosesData = POSES): string[] {
  const errors: string[] = [];
  for (const [id, def] of Object.entries(data.classes)) {
    if (!def.canvas || !def.figure) errors.push(`${id}: canvas/figure measurements missing (run tools/make-poses.mjs)`);
    for (const g of Object.keys(def.grips ?? { one: 1 }) as Grip[])
      for (const [state, p] of Object.entries(def.states)) if (!keyFrame(def, p, g)) errors.push(`${id}: state ${state} (${g}) -> unknown pose ${p}`);
    for (const [g, m] of Object.entries(def.grips ?? {})) for (const [n, f] of Object.entries(m ?? {})) if (!def.poses[f] && !def.cycles[f]) errors.push(`${id}: grip ${g} ${n} -> unknown pose ${f}`);
    for (const g of Object.values(def.gripWeapon ?? {})) if (g && !data.weapons[g.family]?.looks[g.look]) errors.push(`${id}: grip weapon ${g.family}/${g.look} has no art`);
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
  for (const [g, m] of Object.entries(data.gripArt ?? {})) for (const [f, fam] of Object.entries(m ?? {})) if (!data.weapons[fam]) errors.push(`gripArt ${g}.${f} -> unknown family ${fam}`);
  for (const [item, look] of Object.entries(data.itemLook ?? {})) if (!Object.values(data.weapons).some((f) => f.looks[look])) errors.push(`itemLook ${item} -> unknown look ${look}`);
  return errors;
}
