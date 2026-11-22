// twin_stab düzeltme turu: önceki turun görseli girdi 1 olur, YALNIZ eller/bilekler yeniden çizilir (gövde, kimlik, yerleşim aynen).
// Kullanım: node docs/anim-review/new-art/redtithe-poses-v1/make-twin-stab-fix.mjs <önceki-no> <yeni-no>
import { writeFileSync } from 'node:fs';
const D = 'docs/anim-review/new-art/redtithe-poses-v1';
const [prev, n] = process.argv.slice(2);
const prompt = `IMAGE EDIT of image 1: a game sprite of a woman fighter (Redtithe) facing right in a deep lunge, both arms reaching forward to the right, transparent background. Image 2 is the same woman standing, for identity only.

TASK: keep EVERYTHING of image 1 exactly as it is (body, lunge, head, face, clothing, legs, arm positions, canvas size and position, transparent background) and redraw ONLY the two hands and wrists.

WHY: in the game a dagger is attached to each fist and must point straight RIGHT at the enemy, horizontal. In image 1 the fists are drawn like punches / vertical grips (knuckles facing right, thumb on top of a vertical fist), which makes the dagger stand upright. Fix the fists so they hold a HORIZONTAL dagger handle pointing right.

HOW EACH FIST MUST LOOK (both hands): a forward "fencing grip" on an invisible horizontal dagger handle. The wrist is cocked UP a little so the fist lies flat and long, like a horizontal oval continuing the forearm; the THUMB is stretched along the TOP of the fist pointing straight RIGHT toward the enemy (thumb tip at the right end of the fist); the curled fingers wrap UNDER the invisible handle, so the finger row runs horizontally along the BOTTOM of the fist. The opening of the fist (between thumb and index finger) faces RIGHT. The flat front of the knuckles must NOT face right. Each fist stays the same size as in image 1, empty (no dagger drawn).
- UPPER fist (far arm, the character's left arm): show its INSIDE: the curled fingertips and palm side of the fist face the viewer, inner forearm visible.
- LOWER fist (near arm): show its OUTSIDE: the back of the hand and the knuckle ridge face the viewer, the fingers curl away underneath.
Keep the two fists separated vertically as in image 1, not touching.

BANS: no weapon, no dagger, no blade, no extra fingers or hands, no motion lines, no blood, magic, glow, text, ground shadow, checkerboard or coloured background. Output the same size as image 1 with a real transparent background.`;
writeFileSync(`${D}/list-twin.json`, JSON.stringify([{ out: `${D}/raw/twin_stab-${n}.png`, prompt, refs: [`${D}/raw/twin_stab-${prev}.png`, `${D}/refs/redtithe-idle1.png`] }], null, 1));
console.log('1 iş (düzeltme)', prev, '->', n);
