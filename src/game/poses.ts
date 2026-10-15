/**
 * Karakter POZ KÜTÜPHANESİ (Ömer 2026-10-11; docs/design/future-ideas.md "Karakter animasyonları: ortak poz kütüphanesi + dinamik silah").
 * Saf modül (Phaser yok): veri erişimi, silah görseli seçimi, skill -> poz çözümü, birleştirme sınırları ve 2D canvas birleştirmesi.
 *
 *  - Gövde pozları ayrı görseller (assets/poses/<dir>/<poz>.png, eller BOŞ), hepsi aynı tuvalde: ayak ortası (footX, footY) ortak.
 *  - Silah AYRI katman: her pozun el noktası (anchor x/y + açı) var; takılı silahın görseli (aile + nadirlik -> görünüm) oraya çizilir.
 *  - Çalışma anında (src/game/pose-rig.ts) gövde + silah her poz için TEK kareye pişirilir; CombatantView bu kareler arasında geçer.
 *  - Pozu olmayan sınıf bugünkü gibi (tek sprite + kod tweenleri). Motor / oyun kuralı DEĞİŞMEZ: yalnızca sunum.
 *  - GERÇEK sınıflar (Ömer 2026-10-13) kendi v2 gövdesiyle (classes.<id>_v2) çizilir; skill -> poz eşlemesi Pose Tester kopyasından
 *    (pt_<id>.pose, `poseSkill`). Debug > Characters > Poses "Real classes: v1 render" eski görünüme döndürür (`setRealPosesV2`).
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
  /** Açık (avucu açık) el: point / throw. Büyü / fırlatılan şeyin çıkış noktası (CombatantView.castPoint), eşya o elde değilse. */
  open?: 'main' | 'off';
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
  /**
   * Aile x poz yerleşim ayarı (v2, 2026-10-12 poz denetimi): `itemPoses[aile][poz]` (`'*'` = ailenin tüm pozları, poza özel olan üstüne
   * yazar; `'off:<poz>'` / `'main:<poz>'` yalnızca o eldeki eşyaya, ör. ikinci el hançeri). Aynı 24 kare her silah ailesinde doğru dursun diye: açı, kaydırma, boy, gizleme, el değiştirme, arkada çizme.
   */
  itemPoses?: Record<string, Record<string, ItemOverride>>;
}
/** Bir eşyanın pozdaki yerleşim ayarı (`PoseClassDef.itemPoses`). */
export interface ItemOverride {
  /** Mutlak açı (derece, saat yönü, 0 = baş yukarı); dik ailede (yay, kalkan) de uygulanır. */
  angle?: number;
  /** Kabzanın el noktasından kayması (gövde tuvali pikseli). */
  dx?: number;
  dy?: number;
  /** Boy çarpanı. */
  scale?: number;
  /** Bu pozda çizilmez (ör. fırlatılan tılsım). */
  hidden?: boolean;
  /** Hangi el noktasında: 'main' (pozun ana eli) ya da 'off' (ikinci el); yoksa eşyanın kendi eli. */
  hand?: 'main' | 'off';
  /** Gövdenin arkasında çizilir. */
  back?: boolean;
  /** Yatay ayna (yoksa pozun `flip`'i, yalnızca ana el). */
  flip?: boolean;
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
  /**
   * Ağzı olan görünümlerde ağzın (balta ağzı, çekiç yüzü) görseldeki yanı: v2 gövdelerde (tutuş takımlı sınıf) eşya gerektiğinde AYNALANIR,
   * ağız saat yönündeki savuruşun önüne, yani düşmana bakar; elde baş aşağı sarkarken (`hangsDown`) de öne (Ömer 2026-10-13 "balta ters").
   * Pozun `flip`'i bunu tersine çevirir; `itemPoses.flip` mutlak. Görünüm başına (aynı ailede iki yönde çizilmiş görünüm var: axes).
   */
  edge?: Record<string, 'left' | 'right'>;
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
  /** Başka sınıfın poz kütüphanesini kullanan sınıflar (Pose Tester'lar -> kendi sınıfının <id>_v2 gövdesi, yoksa warrior_v2). */
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

/** Gerçek sınıflar v2 gövdesiyle mi (varsayılan: evet). Kapalıyken eski görünüm: tek idle görseli + kod hareketi (Warrior v1 pozları). */
let realV2 = true;
/** Debug karşılaştırması (src/game/pose-mode.ts kalıcı tutar): false = gerçek sınıflar v1 çizimi. */
export const setRealPosesV2 = (on: boolean): void => {
  realV2 = on;
};
export const realPosesV2 = (): boolean => realV2;
/** Sınıfın kendi v2 gövdesi (classes.<id>_v2; gerçek oynanabilir sınıflar), yoksa null. */
export const v2BodyOf = (classId: string): string | null => (POSES.classes[`${classId}_v2`] ? `${classId}_v2` : null);

/** Kütüphanenin asıl sahibi: takma ad (Pose Tester -> <sınıf>_v2), gerçek sınıfta kendi v2 gövdesi (v1 çizimi seçiliyse kendisi). */
export const poseOwner = (classId: string): string => POSES.classAliases?.[classId] ?? (realV2 ? v2BodyOf(classId) : null) ?? classId;
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

/**
 * v2 gövdeli gerçek sınıfın skill'i -> Pose Tester kopyasının (pt_<id>) pozu: gerçek sınıf ve Pose Tester AYNI eşlemeyi kullanır
 * (tools/make-pose-testers.mjs > POSE, docs/design/pose-coverage.md). v1 / pozsuz sınıf, pt_ skill'i ya da kopyası olmayan skill aynen.
 */
export function poseSkill<T extends { id?: string; pose?: string | string[]; motion?: string }>(classId: string, skill: T, lookup: (id: string) => { pose?: string | string[] } | undefined): T {
  if (!skill.id || skill.id.startsWith('pt_') || !poseClass(classId)?.grips) return skill;
  const pose = lookup(`pt_${skill.id}`)?.pose;
  return pose === undefined ? skill : { ...skill, pose };
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

/** Bir pozun birleşik sınırı (gövde kutusu + döndürülmüş silah dörtgenleri), gövde tuvali koordinatı; alt sınır taban çizgisinde kırpılır. */
export function poseBounds(def: PoseClassDef, name: string, w: WeaponPick | null): Box {
  const p = def.poses[name]!;
  const b = p.box ?? { x: 0, y: 0, w: def.canvas.w, h: def.canvas.h };
  const box: Box = { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
  const pad = w?.glow ? GLOW_PAD : 2;
  for (const pl of poseItems(def, name, w)) {
    for (const [x, y] of placementCorners(pl)) {
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
 * Bir eldeki eşyanın çözülmüş yerleşimi (gövde tuvali koordinatı): kabza noktası (x, y), açı (derece, saat yönü, 0 = baş yukarı), ölçek,
 * ayna, gövdenin arkasında mı ve hangi el noktasında. Poz + aile ayarı (`itemPoses`) birlikte uygulanmış hâli; çizim, sınır ve efekt
 * çıkış noktası (CombatantView.weaponPoint) hep bunu kullanır.
 */
export interface ItemPlacement {
  family: string;
  look: string;
  slot: 'main' | 'off';
  hand: 'main' | 'off';
  x: number;
  y: number;
  /** Elin noktası (yumruk yaması burada; kabza `dx/dy` ile kaydırılmış olabilir). */
  hx: number;
  hy: number;
  angle: number;
  k: number;
  flip: boolean;
  back: boolean;
  w: number;
  h: number;
  grip: { x: number; y: number };
}

/** Aile x poz ayarı: `itemPoses[aile]['*']`, üstüne `[poz]`, üstüne yalnızca o eldeki eşya için `['off:<poz>']` / `['main:<poz>']`. */
export const itemOverride = (def: PoseClassDef, family: string, pose: string, slot: 'main' | 'off' = 'main'): ItemOverride => {
  const f = def.itemPoses?.[family];
  return { ...f?.['*'], ...f?.[pose], ...f?.[`${slot}:${pose}`] };
};

/**
 * Bir eşyanın bu pozdaki yerleşimi (`slot` = ana el silahı ya da ikinci el eşyası); çizilmiyorsa (pozun `hidden`'ı, ayarın `hidden`'ı,
 * el noktası yok, görsel ölçüsü yok) null.
 */
export function itemPlacement(def: PoseClassDef, name: string, item: { family: string; look: string }, slot: 'main' | 'off'): ItemPlacement | null {
  const p = def.poses[name];
  const fam = POSES.weapons[item.family];
  const look = fam?.looks[item.look];
  if (!p || !fam || !look || p.hidden) return null;
  const o = itemOverride(def, item.family, name, slot);
  if (o.hidden) return null;
  const hand = o.hand ?? slot;
  const h = hand === 'main' ? p.anchor : p.offhand ? { x: p.offhand.x, y: p.offhand.y, angle: p.offhand.angle ?? p.anchor.angle } : null;
  if (!h) return null;
  const angle = o.angle ?? (fam.upright ? 0 : h.angle);
  return {
    family: item.family,
    look: item.look,
    slot,
    hand,
    x: h.x + (o.dx ?? 0),
    y: h.y + (o.dy ?? 0),
    hx: h.x,
    hy: h.y,
    angle,
    k: weaponScale(fam, look, def) * (o.scale ?? 1),
    flip: o.flip ?? (slot === 'main' && !!p.flip) !== edgeFlip(def, fam, item.look, angle),
    back: o.back ?? (slot === 'main' ? !!p.back : false),
    w: look.w,
    h: look.h,
    grip: look.grip,
  };
}

/** Ağzı öne çevirmek için ayna gerekir mi (`WeaponFamilyArt.edge`; yalnızca v2 gövdeler). */
export const edgeFlip = (def: PoseClassDef, fam: WeaponFamilyArt, look: string, angle: number): boolean => {
  const e = fam.edge?.[look];
  return !!e && !!def.grips && (e === 'left') !== hangsDown(angle);
};

/**
 * Eşya baş aşağı mı sarkıyor (açı 140..210 derece: elde sarkan balta, isabette düşen kol). Sarkan eşyada ağız
 * görselin öteki yanına gelir (`edgeFlip`).
 */
export const hangsDown = (angle: number): boolean => {
  const a = ((((angle + 180) % 360) + 360) % 360) - 180;
  return a > 140 || a < -150;
};

/** Pozda çizilen eşyalar: ana el silahı ve (tek el tutuşta) ikinci el eşyası, çözülmüş yerleşimleriyle. */
export function poseItems(def: PoseClassDef, name: string, w: WeaponPick | null): ItemPlacement[] {
  if (!w) return [];
  const out: ItemPlacement[] = [];
  const main = itemPlacement(def, name, w, 'main');
  if (main) out.push(main);
  if (w.offhand && !gripBlocksOffhand(w.grip)) {
    const off = itemPlacement(def, name, w.offhand, 'off');
    if (off) out.push(off);
  }
  return out;
}

/** Görsel üzerindeki bir noktanın (görünüm pikseli) gövde tuvali koordinatı. */
export function placementPoint(pl: ItemPlacement, px: number, py: number): { x: number; y: number } {
  const a = (pl.angle * Math.PI) / 180;
  let lx = (px - pl.grip.x) * pl.k;
  const ly = (py - pl.grip.y) * pl.k;
  if (pl.flip) lx = -lx;
  return { x: pl.x + lx * Math.cos(a) - ly * Math.sin(a), y: pl.y + lx * Math.sin(a) + ly * Math.cos(a) };
}

const placementCorners = (pl: ItemPlacement): Array<[number, number]> =>
  ([[0, 0], [pl.w, 0], [0, pl.h], [pl.w, pl.h]] as const).map(([px, py]) => {
    const q = placementPoint(pl, px, py);
    return [q.x, q.y] as [number, number];
  });

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
 * Bir pozu gövde tuvali koordinatında çizer (çağıran dönüşümü önceden kurar). Sıra: arkadaki eşyalar (`back`), gövde, öndeki eşyalar,
 * yumruk yaması (el çevresindeki gövde pikselleri kabzanın üstüne yeniden çizilir, yumruk kabzayı SARAR), önde duran kalkan, en üstte
 * (kalkan varsa) sağ eldeki silah + yumruğu.
 * `glowPx` ışıltı bulanıklığı (cihaz pikseli). Yerleşim `itemPlacement` (poz + `itemPoses` aile ayarı).
 * tools/pose-editor.html ve tools/make-poses.mjs --preview aynı kuralı (ayarsız) uygular.
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
  const items = weapon ? poseItems(def, name, weapon.pick) : [];
  const draw = (pl: ItemPlacement) => {
    const img = pl.slot === 'main' ? weapon?.img : weapon?.offImg;
    if (!img) return;
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate((pl.angle * Math.PI) / 180);
    ctx.scale(pl.flip ? -pl.k : pl.k, pl.k);
    if (weapon?.pick.glow && glowPx > 0) {
      ctx.shadowColor = weapon.pick.glow;
      ctx.shadowBlur = glowPx;
    }
    ctx.drawImage(img, -pl.grip.x, -pl.grip.y, pl.w, pl.h);
    ctx.restore();
  };
  for (const pl of items) if (pl.back) draw(pl);
  ctx.drawImage(body, 0, 0, CW, CH);
  for (const pl of items) if (!pl.back && !topShield(pl)) draw(pl);
  const r = p.fist ?? POSES.fistRadius;
  // yumruk yaması: eşyayı tutan elin (tek eşyada öteki elin de: çift elde sap üstündeki el) gövde pikselleri kabzanın üstüne
  for (const h of fistPoints(p, items))
    if (r > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(body, 0, 0, CW, CH);
      ctx.restore();
    }
  // kalkan önde (kolun önünde); SAĞ eldeki silah ve onu tutan yumruk kalkanın da üstünde (3/4 önden sağa bakan gövdede sağ yan
  // izleyiciye yakın; Ömer 2026-10-13 hazır tutuşta silah kalkanın arkasında kaybolmasın)
  const shields = items.filter(topShield);
  for (const pl of shields) draw(pl);
  const main = shields.length ? items.find((pl) => pl.slot === 'main' && !pl.back && pl.hand === 'main') : undefined;
  if (main) {
    draw(main);
    if (r > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(main.hx, main.hy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(body, 0, 0, CW, CH);
      ctx.restore();
    }
  }
}

/** Önde, her şeyin üstünde çizilen ikinci el kalkanı (kol kalkanın arkasında). */
const topShield = (pl: ItemPlacement) => pl.slot === 'off' && !pl.back && !!POSES.weapons[pl.family]?.upright;

/** Yumruk yaması noktaları: önde çizilen eşyaların elleri; tek eşya ana eldeyse ikinci el de (çift elde sapı saran el). */
export function fistPoints(p: PoseDef, items: ItemPlacement[]): Array<{ x: number; y: number }> {
  const front = items.filter((pl) => !pl.back);
  const pts = front.map((pl) => ({ x: pl.hx, y: pl.hy }));
  const main = front.find((pl) => pl.slot === 'main');
  if (main && main.hand === 'main' && !items.some((pl) => pl.slot === 'off') && p.offhand) pts.push({ x: p.offhand.x, y: p.offhand.y });
  return pts;
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
    for (const [fam, m] of Object.entries(def.itemPoses ?? {})) {
      if (!data.weapons[fam]) errors.push(`${id}: itemPoses ${fam} -> unknown weapon family`);
      for (const key of Object.keys(m)) {
        const pose = key.replace(/^(main|off):/, '');
        if (pose !== '*' && !def.poses[pose]) errors.push(`${id}: itemPoses ${fam}.${key} -> unknown pose`);
      }
    }
    const dw = def.defaultWeapon;
    if (!data.weapons[dw.family]?.looks[dw.look]) errors.push(`${id}: default weapon ${dw.family}/${dw.look} has no art`);
  }
  for (const [fam, f] of Object.entries(data.weapons)) {
    if (!(f.length > 0)) errors.push(`${fam}: length`);
    for (const l of f.order) if (!f.looks[l]) errors.push(`${fam}: look ${l} not measured`);
    for (const l of Object.keys(f.edge ?? {})) if (!f.looks[l]) errors.push(`${fam}: edge of unknown look ${l}`);
  }
  for (const [alias, owner] of Object.entries(data.classAliases ?? {})) if (!data.classes[owner]) errors.push(`classAliases ${alias} -> unknown class ${owner}`);
  for (const [item, fam] of Object.entries(data.itemArt)) if (!data.weapons[fam]) errors.push(`itemArt ${item} -> unknown family ${fam}`);
  for (const [f, fam] of Object.entries(data.familyArt)) if (!data.weapons[fam]) errors.push(`familyArt ${f} -> unknown family ${fam}`);
  for (const [g, m] of Object.entries(data.gripArt ?? {})) for (const [f, fam] of Object.entries(m ?? {})) if (!data.weapons[fam]) errors.push(`gripArt ${g}.${f} -> unknown family ${fam}`);
  for (const [item, look] of Object.entries(data.itemLook ?? {})) if (!Object.values(data.weapons).some((f) => f.looks[look])) errors.push(`itemLook ${item} -> unknown look ${look}`);
  return errors;
}

/**
 * Pişmiş atlas / kaynak dokularının bellek bırakma kuralı (src/game/pose-rig.ts > releasePoseTextures). Atlaslar (`pose:`) ve hale dokuları
 * (`glowfx:`, src/game/sprite-glow.ts) her (sınıf, silah) birleşimi için ayrı tuval; bırakılmazsa oturum boyunca birikir ve telefonda tuval /
 * GPU bellek sınırı aşılınca YENİ pişen atlas boş (saydam) kalır: aynı sınıfın farklı silahlı ikinci kopyası (ayna savaş) görünmez olurdu.
 * Kullanımdaki doku hiç atılmaz. Hale her zaman; atlaslar yalnızca `atlases` (yeni savaş kurulmadan: o anda hiçbir birim atlas tutmaz; savaş
 * içinde boşta pozu idle sprite olan birim atlasını ekranda göstermeden tutar); gövde kaynakları (`posebody:<dir>:...`) yalnızca
 * `keepBodies` verilince ve klasörü onda değilse (bu savaşta olmayan sınıf). Silah görselleri küçük: hiç atılmaz.
 */
export function isReleasablePoseTexture(key: string, inUse: ReadonlySet<string>, opts: { atlases?: boolean; keepBodies?: ReadonlySet<string> } = {}): boolean {
  if (inUse.has(key)) return false;
  if (key.startsWith('glowfx:')) return true;
  if (key.startsWith('pose:')) return !!opts.atlases;
  if (key.startsWith('posebody:') && opts.keepBodies) return !opts.keepBodies.has(key.split(':')[1] ?? '');
  return false;
}

/** RGBA piksel dizisinde hiç görünür (alfa > 8) piksel yok mu (pişen kare boş kaldıysa: tuval belleği tükenmiş). `step` = atlanan piksel. */
export function pixelsBlank(data: ArrayLike<number>, step = 1): boolean {
  for (let i = 3; i < data.length; i += 4 * Math.max(1, step)) if (data[i]! > 8) return false;
  return true;
}
