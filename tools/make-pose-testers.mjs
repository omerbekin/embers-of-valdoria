// Pose Tester debug sınıfları (Ömer 2026-10-12): v2 poz takımını (data/poses.json > classes.warrior_v2) oyundaki HER sınıf skill'iyle denemek
// için sınıf başına bir test sınıfı: "Pose Tester I (Warrior)" ... "Pose Tester XI (Hexer)". Her biri o sınıfın 4 gerçek skill'inin
// pt_<id> kopyasını taşır: aynı efekt / hedef / alan / ses / ikon (artOf), bedel 0, cooldown yok, gücü ~1 hasar (0.02), en uygun v2 pozu
// (docs/design/pose-coverage.md). testOnly + hidden: rastgele havuz, sim, takım seçimi, sefer ve Endless dışı; Debug > Setup > Test
// poses (v2) ve Test Mode sınıf seçicisinden gelir. Gövde: sınıfın kendi v2 gövdesi (classes.<sınıf>_v2) varsa o, yoksa Warrior v2
// (data/poses.json > classAliases, burada yazılır); statlar sabit test değerleri.
//
//   node tools/make-pose-testers.mjs      -> data/classes/pose_tester_<n>.json + data/skills.json > pt_* (yeniden yazar)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const CLASSES = ['warrior', 'defender', 'paladin', 'archer', 'cutthroat', 'mage', 'druid', 'undead', 'antimage', 'gambler', 'hexer'];

/**
 * Skill -> v2 mantıksal poz (tek ad ya da sıra; ilk = hazırlık, son = bırakış / vuruş anı). Tutuşa göre karesi CombatantView'da seçilir.
 * Eşleşme 2026-10-12 poz denetimi (docs/design/pose-coverage.md > "v2 eşleşme (2026-10-12)"): yeni çizim yok, 24 kare; silahın yeri
 * data/poses.json > classes.warrior_v2.itemPoses (aile x poz), büyü / ok çıkışı silahın ucundan (CombatantView.castPoint).
 */
const POSE = {
  // Warrior (Dane Axe, çift el)
  melee_attack: ['overhead', 'slash'],
  whirlwind: 'spin',
  charge: ['step', 'thrust'],
  headsmans_blow: ['overhead', 'slash'],
  // Defender (gürz + kule kalkanı)
  tremor_slam: 'overhead',
  taunt: 'guard',
  close_ranks: 'guard',
  fist_crush: 'raise',
  // Paladin (gürz + heater kalkanı)
  holy_strike: 'raise',
  resurrection: 'channel',
  judgment: 'raise',
  radiance: ['raise', 'channel'],
  // Archer (yay): shot = yay tutuşunda bow_shot (yay öne uzanmış dik, kiriş eli yanakta), sky = bow_sky (göğe çekiş); başka tutuşta
  // shot -> thrust, sky -> raise (data/poses.json > grips). channel = ok takma
  quick_shot: 'shot',
  piercing_arrow: ['channel', 'shot'],
  arrow_rain: 'sky',
  aimed_shot: ['channel', 'shot'],
  // Cutthroat (iki hançer)
  venom_edge: ['slash', 'thrust'],
  x_cut: 'cross_cut', // Cutthroat'a özel ek poz (extra-cross_cut.png: iki kol X, iki hançer); başka gövdede yok -> attack (slash)
  smoke_bomb: 'throw',
  backstab: 'thrust',
  // Mage (asa, çift el): ok asanın ucundan
  fire_bolt: 'thrust',
  blizzard: 'raise',
  mana_barrier: 'channel',
  meteor: ['channel', 'raise'],
  // Druid (asa)
  thorn_whip: 'thrust',
  natures_wrath: 'overhead',
  rejuvenate: 'channel',
  summon_treant: 'raise',
  // Undead (asa)
  bone_throw: 'throw',
  wail_of_the_dead: 'channel',
  dark_bond: 'channel',
  raise_dead: 'raise',
  // Anti-Mage (hançer; mana_burn = hançer fırlatır, void_strike = sol elle point)
  mana_burn: 'throw',
  drain_field: 'raise',
  spell_ward: 'channel',
  void_strike: 'point',
  // Gambler (iskambil: tılsım fırlatışta elden çıkar, point'te açık elin parmaklarında)
  loaded_dice: 'throw',
  high_stakes: 'point',
  card_trick: 'throw',
  all_in: 'overhead',
  // Hexer (bez bebek)
  evil_eye: 'point',
  withering_curse: 'raise',
  jinx: 'thrust',
  doom_mark: 'doll_stab', // Hexer'e özel ek poz (extra-doll_stab.png: bebek + iğne kareye boyalı, tılsım çizilmez; efekt bebekten); başka gövdede yok -> cast (raise)
};
const LABEL = {
  idle: 'Idle',
  step: 'Step',
  slash: 'Slash',
  overhead: 'Overhead Strike',
  thrust: 'Thrust',
  spin: 'Spin (3-frame cycle)',
  guard: 'Guard',
  raise: 'Raise Hand',
  channel: 'Channel',
  point: 'Point',
  throw: 'Throw',
  shot: 'Bow Shot',
  sky: 'Sky Shot',
  cross_cut: 'Cross Cut (Cutthroat only)',
  doll_stab: 'Doll Stab (Hexer only)',
};

// skills.json elle biçimli (CRLF, satır içi diziler): yalnızca pt_* bloğu metin olarak değiştirilir, dosyanın geri kalanına dokunulmaz
const raw = readFileSync('data/skills.json', 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
const keyLine = (l) => /^ {2}"([^"]+)": \{/.exec(l)?.[1];
const first = lines.findIndex((l) => keyLine(l)?.startsWith('pt_'));
if (first < 0) throw new Error('skills.json: pt_* bloğu yok');
let end = first + 1;
while (end < lines.length && !(keyLine(lines[end]) && !keyLine(lines[end]).startsWith('pt_'))) end++;
const skills = JSON.parse(raw);
const made = [];
// gerçek / diğer test sınıflarının logoları (Pose Tester logoları bunlardan ve birbirinden farklı)
const usedLogos = new Set(
  readdirSync('data/classes')
    .filter((f) => f.endsWith('.json') && !f.startsWith('pose_tester_'))
    .map((f) => JSON.parse(readFileSync(`data/classes/${f}`, 'utf8')).logo),
);

CLASSES.forEach((cls, i) => {
  const real = JSON.parse(readFileSync(`data/classes/${cls}.json`, 'utf8'));
  const ids = [];
  for (const sid of real.skills) {
    const src = skills[sid];
    if (!src) throw new Error(`${cls}: skill ${sid} yok`);
    const pose = POSE[sid];
    if (!pose) throw new Error(`${sid}: poz eşlemesi yok`);
    const { _not, cooldown, initialCooldown, turnCost, pose: _old, ...rest } = src;
    const copy = {
      _not: `Pose Tester (debug, Ömer 2026-10-12; tools/make-pose-testers.mjs üretir): ${src.name} kopyası; gerçek efekt/ses/hedef (artOf ${sid}), v2 poz takımında '${[pose].flat().join(' -> ')}'. Bedel 0, cooldown yok, güç 0.02 (~1).`,
      ...rest,
      id: `pt_${sid}`,
      cost: { resource: 'mp', amount: 0 },
      effects: src.effects.map((e) => (typeof e.power === 'number' ? { ...e, power: 0.02 } : e)),
      pose,
      artOf: sid,
      note: `Pose test: plays the ${[pose].flat().map((p) => LABEL[p]).join(', then ')} pose.`,
    };
    made.push(copy);
    ids.push(copy.id);
  }
  const n = i + 1;
  const def = {
    _not: `Debug test sınıfı (Ömer 2026-10-12; tools/make-pose-testers.mjs üretir): ${real.name} skill'lerinin pt_* kopyaları, Warrior v2 poz kütüphanesi + silah katmanıyla çizilir (data/poses.json > classAliases). testOnly + hidden: rastgele havuz, sim, takım seçimi, sefer ve Endless dışı.`,
    id: `pose_tester_${n}`,
    name: `Pose Tester ${ROMAN[i]} (${real.name})`,
    spriteId: 'warrior',
    color: real.color,
    // logo: sınıf logoları benzersiz olmalı -> kopyaladığı skill'lerden henüz logo olmayan ilk ikon
    logo: made.slice(-4).map((s) => s.icon).find((ic) => ic && !usedLogos.has(ic) && usedLogos.add(ic)) ?? real.logo,
    role: 'Pose Test',
    testOnly: true,
    hidden: true,
    // statlar sabit test değerleri (sınıf verisi testleri: zırh, çeviklik, Rage, büyü zırhı gerçek sınıflara özgü kalsın)
    frontPriority: 1,
    attributes: { str: 26, int: 12, dex: 8, luck: 14 }, // Warrior ile aynı (levels.md 2026-10-17: en yüksek temel stat <= diğer üçünün %80i)
    primary: 'str',
    armor: 18,
    magicArmor: 0,
    ai: 'aggressive',
    skills: ids,
    passive: {
      id: 'pose_test_rig',
      name: 'Pose Rig',
      icon: 'helm',
      text: 'Test passive with no effect: this class only exists to try the pose library in a real battle.',
      effect: { type: 'spellEcho', chance: 0 },
    },
  };
  writeFileSync(`data/classes/pose_tester_${n}.json`, `${JSON.stringify(def, null, 2)}\n`);
});
const block = made.map((c) => `  "${c.id}": ${JSON.stringify(c, null, 2).split('\n').join('\n  ')},`).join('\n').split('\n');
lines.splice(first, end - first, ...block);
writeFileSync('data/skills.json', lines.join(EOL));
// gövde: sınıfın kendi v2 gövdesi varsa (data/poses.json > classes.<sınıf>_v2, tools/make-poses-v2.mjs --class=<sınıf>) o, yoksa warrior_v2
const poses = JSON.parse(readFileSync('data/poses.json', 'utf8'));
poses.classAliases = Object.fromEntries(CLASSES.map((cls, i) => [`pose_tester_${i + 1}`, poses.classes[`${cls}_v2`] ? `${cls}_v2` : 'warrior_v2']));
writeFileSync('data/poses.json', `${JSON.stringify(poses, null, 2)}\n`);
console.log(`${CLASSES.length} pose testers, ${CLASSES.length * 4} pt_* skills`);
