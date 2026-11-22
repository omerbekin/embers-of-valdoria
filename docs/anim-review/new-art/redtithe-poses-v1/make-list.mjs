// Redtithe poz seti v1: kalan 22 pozun Codex image-edit iş listesini yazar (list.json).
// Girdi 1 = onaylı duruş R2 (kimlik), girdi 2 = aynı yuvanın ESKİ kadın çizimi (yalnız poz/yerleşim örneği).
// Kullanım (worktree kökünden): node docs/anim-review/new-art/redtithe-poses-v1/make-list.mjs [poz ...]
import { writeFileSync } from 'node:fs';
const D = 'docs/anim-review/new-art/redtithe-poses-v1';
const FIST = 'Both fists are EMPTY and clenched (the game adds the daggers later), each fist clearly visible, same size as the fists of image 1, thumb on top, wrist straight and in line with the forearm.';
const TWO = 'Both fists are EMPTY and clenched close together one above the other as if gripping the same long shaft (the game adds the weapon later), wrists straight.';
// Yatay sap (deneme 2, 2026-11-21): ilk denemede TWO yumrukları üst üste dizdi (dik sap); ileri uzanan iki elli karelerde sap yatay olmalı.
const TWO_H = 'Both fists are EMPTY and clenched, gripping the same HORIZONTAL shaft: the two fists are at the SAME HEIGHT, one in front of the other along a horizontal line about one fist-width apart (NOT stacked one above the other), knuckles up, wrists straight (the game adds the weapon later). Exactly three blood vials on the belt as in image 1.';
const POSES = {
  idle2: `two-handed ready stance: feet apart, both fists together in front of the belly. ${TWO}`,
  step2: `two-handed running step / wind-up: both fists together raised near the rear shoulder, legs in a long stride. ${TWO}`,
  slash1: `one-handed slash follow-through: rear arm swung back and up behind her, front arm forward at waist height, wide lunging stance. ${FIST}`,
  slash2: `two-handed horizontal slash follow-through: both arms extended far forward to the right at chest height, fists together, wide lunge. ${TWO_H}`,
  overhead1: `one-handed overhead chop wind-up: rear fist raised high straight above the head, front fist at chest. ${FIST}`,
  overhead2: `two-handed overhead wind-up: both fists together raised high above the head. ${TWO}`,
  thrust1: `one-handed lunge thrust: front arm fully extended forward to the right at shoulder height, rear fist pulled back by the chest, deep front-knee lunge. ${FIST}`,
  thrust2: `two-handed lunge thrust: both arms extended forward to the right at chest height, fists together, deep lunge. ${TWO_H}`,
  spin1a: `spin attack frame 1 of 3 (one-handed): torso wound up turning away, rear arm swung back and up, front arm across the body. ${FIST}`,
  spin1b: `spin attack frame 2 of 3 (one-handed): mid-turn, chest open toward the viewer, both arms spread wide to the sides at shoulder height. ${FIST}`,
  spin1c: `spin attack frame 3 of 3 (one-handed): turned back to face right, front arm extended forward to the right at chest height, rear fist by the chest. ${FIST}`,
  spin2a: `two-handed spin frame 1 of 3: torso wound up, both fists together swung back behind the rear shoulder. ${TWO}`,
  spin2b: `two-handed spin frame 2 of 3: mid-turn, both fists together swung out to the front at chest height, the red sash panels flaring. ${TWO_H}`,
  spin2c: `two-handed spin frame 3 of 3: follow-through, both fists together extended forward to the right at chest height. ${TWO_H}`,
  guard1: `one-handed defensive guard: knees slightly bent, front fist raised in front of the face/chest, rear fist low by the hip. ${FIST}`,
  guard2: `two-handed block: both fists together raised in front of the chest as if holding a shaft up to block. ${TWO}`,
  raise: `casting with a raised arm: rear fist raised high above the head, front fist low at the hip, standing upright. ${FIST}`,
  channel: `channeling: both arms extended forward to the right at chest height, standing upright. ${FIST}`,
  point: `pointing: front arm fully extended forward to the right at shoulder height with the index finger pointing (front hand OPEN, pointing, empty), rear fist clenched low at the hip. Only the rear fist is clenched and empty.`,
  throw: `throw follow-through: front arm extended forward to the right with an OPEN empty hand (fingers spread, just released something), rear fist clenched pulled back by the hip. Only the rear fist is clenched and empty.`,
  hit: `getting hit: recoiling backwards, torso leaning back, head tilted back with a pained face, rear fist pulled in tight against the chest, front arm thrown out forward to the right at shoulder height, knees slightly bent. ${FIST}`,
  kneel: `defeated: down on one knee, head bowed, one hand pressed on the ground, the other fist resting on the raised knee. Fists empty.`,
};
const prompt = (name, desc) => `IMAGE EDIT of image 1: a 450x412 game sprite of a woman fighter (Redtithe) standing in a guard stance, facing right, transparent background. Image 2 is the SAME game slot drawn earlier with a DIFFERENT, OLD outfit (long dark coat with purple lining, auburn bun) and is shown ONLY as a POSE AND LAYOUT EXAMPLE.

TASK: redraw the woman of image 1 in the exact pose of image 2 ("${name}"), full body, facing right.
POSE (copy from image 2): ${desc}
Match image 2 closely: same body position on the canvas, same limb angles, same fist and hand positions, same head position and size, same stance width and boot positions on the ground. Feet stand on the same ground line as image 2 (boot soles near y=405), unless the pose is kneeling.

IDENTITY (copy from image 1 exactly, NOT from image 2): same face, eyebrow scar, shaved side of the head with the scale-like tattoo, long dark braid, red shirt sleeves rolled to the forearm, pale linen bandaged forearms with red cross-lacing, dark leather vest with brass buckles, red sash and belt with EXACTLY THREE blood vials side by side, small pouch, brass bowl hanging on a chain, red tattered sash panels, dark baggy trousers, plain brown leather boots. Medieval clothing only. NO long coat, NO purple, NO auburn bun from image 2. Same scale as image 1 (the standing figure is about 380 px tall), same painterly pixel-art rendering, outline, palette and lighting. Each arm and each leg is one continuous limb.

BANS: no weapon, no dagger, no extra or missing limb, no floating parts, no motion lines, no dust, no blood, magic, glow, text, ground shadow, halo, checkerboard or white/coloured background. Output a 450x412 image with a real transparent background.`;
const only = process.argv.slice(2);
const jobs = Object.entries(POSES).filter(([n]) => !only.length || only.includes(n)).map(([n, desc]) => ({
  out: `${D}/raw/${n}.png`,
  prompt: prompt(n, desc),
  refs: [`${D}/refs/redtithe-idle1.png`, `${D}/refs/old-${n}.png`],
}));
writeFileSync(`${D}/list.json`, JSON.stringify(jobs, null, 1));
console.log(jobs.length, 'iş');
