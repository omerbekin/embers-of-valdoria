// Pose Tester debug sınıfları (Ömer 2026-10-12): v2 poz takımını (data/poses.json > classes.warrior_v2) oyundaki HER sınıf skill'iyle denemek
// için sınıf başına bir test sınıfı: "Pose Tester I (Warrior)" ... "Pose Tester XI (Hexer)". Her biri o sınıfın 4 gerçek skill'inin
// pt_<id> kopyasını taşır: aynı efekt / hedef / alan / ses / ikon (artOf), bedel 0, cooldown yok, gücü ~1 hasar (0.02), en uygun v2 pozu
// (docs/design/pose-coverage.md). testOnly + hidden: rastgele havuz, sim, takım seçimi, sefer ve Endless dışı; Debug > Setup > Test
// poses (v2) ve Test Mode sınıf seçicisinden gelir. Gövde: Warrior v2 (classAliases), statlar gerçek sınıftan.
//
//   node tools/make-pose-testers.mjs      -> data/classes/pose_tester_<n>.json + data/skills.json > pt_* (yeniden yazar)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const CLASSES = ['warrior', 'defender', 'paladin', 'archer', 'cutthroat', 'mage', 'druid', 'undead', 'antimage', 'gambler', 'hexer'];

/** Skill -> v2 mantıksal poz (tek ad ya da sıra; son = vuruş anı). Tutuşa göre karesi CombatantView'da seçilir. */
const POSE = {
  melee_attack: ['overhead', 'slash'],
  whirlwind: 'spin',
  charge: ['step', 'thrust'],
  abyssal_cry: ['raise', 'channel'],
  tremor_slam: 'overhead',
  taunt: 'guard',
  guard: 'guard',
  fist_crush: 'raise',
  holy_strike: 'raise',
  resurrection: 'channel',
  judgment: 'raise',
  radiance: ['raise', 'channel'],
  quick_shot: 'throw',
  piercing_arrow: 'throw',
  arrow_rain: 'raise',
  aimed_shot: ['point', 'throw'],
  venom_edge: ['slash', 'thrust'],
  x_cut: 'slash',
  smoke_bomb: 'throw',
  backstab: 'thrust',
  fire_bolt: 'point',
  blizzard: 'raise',
  mana_barrier: 'point',
  meteor: ['channel', 'raise'],
  thorn_whip: 'slash',
  natures_wrath: 'overhead',
  rejuvenate: 'point',
  summon_treant: 'channel',
  bone_throw: 'throw',
  wail_of_the_dead: 'channel',
  dark_bond: 'point',
  raise_dead: 'raise',
  mana_burn: 'slash',
  drain_field: 'raise',
  spell_ward: 'point',
  void_strike: 'point',
  loaded_dice: 'throw',
  high_stakes: 'point',
  card_trick: 'throw',
  all_in: 'overhead',
  evil_eye: 'point',
  withering_curse: 'channel',
  jinx: 'point',
  doom_mark: 'channel',
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
    attributes: { str: 30, int: 16, dex: 8, luck: 6 },
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
console.log(`${CLASSES.length} pose testers, ${CLASSES.length * 4} pt_* skills`);
