// twin_stab el turu v2 (Ömer 2026-11-22, rt4_ulti: "Daggerı karşıdaki adama saplaması için yumruğunu yere paralel tutması lazım").
// Girdi 1 = önceki tur (gövde/kollar aynen), girdi 2 = aynı poz + oyunun taktığı rondel hançer YATAY konumunda (yalnız el şekli için referans).
// Kullanım: node docs/anim-review/new-art/redtithe-poses-v1/make-twin-stab-hands.mjs <önceki-ham> <yeni-no> [ek not]
import { writeFileSync } from 'node:fs';
const D = 'docs/anim-review/new-art/redtithe-poses-v1';
const [prev, n, extra = ''] = process.argv.slice(2);
const prompt = `IMAGE EDIT of image 1: a game sprite of a woman fighter (Redtithe) facing right in a deep lunge, both arms reaching forward to the right, transparent background. Image 2 is the SAME pose, smaller, with the two daggers that the game attaches to her hands drawn in: each dagger lies HORIZONTAL, its handle passing through the fist from left to right, blade pointing straight right at the enemy.

TASK: keep EVERYTHING of image 1 exactly as it is (body, lunge, head, face, clothing, legs, both arms and forearms with their bandages, which side of each arm we see, canvas size and position, transparent background) and redraw ONLY the two hands, so that each hand clearly GRIPS A HORIZONTAL DAGGER HANDLE exactly where image 2 shows it.

HOW EACH HAND MUST LOOK: each hand grips a HORIZONTAL dagger handle pointing at the target; the grip channel through the fist is parallel to the ground; the knuckle row is HORIZONTAL (the four fingers lie side by side ALONG the handle, left to right, and curl down and around underneath it); the thumb wraps over the top of the handle near the front of the fist, pointing right. The wrist is bent slightly DOWN so the handle continues the line of the forearm toward the enemy, like a fencer's hand in a rapier lunge. NOT a punching fist (knuckles must not face the enemy), NOT a fist around a vertical pole (the fingers must not be stacked one above the other).
- UPPER hand (far arm): we see the curled fingertips and the palm side wrapped around the horizontal handle.
- LOWER hand (near arm): we see the back of the hand, the knuckle row running horizontally along the top of the handle.
The handle itself is NOT drawn: the hands are EMPTY, but shaped around the missing horizontal handle (a horizontal tunnel through each fist, open at the front and back), so the game's dagger fits through them. Each hand the same size as in image 1, the two hands clearly separated vertically.${extra ? `\n${extra}` : ''}

BANS: no weapon, no dagger, no handle, no blade, no extra fingers or hands, no motion lines, no blood, magic, glow, text, ground shadow, checkerboard or coloured background. Output the same size as image 1 with a real transparent background.`;
writeFileSync(`${D}/list-twin.json`, JSON.stringify([{ out: `${D}/raw/twin_stab-${n}.png`, prompt, refs: [prev, `${D}/refs/twin_stab-daggers.png`] }], null, 1));
console.log('1 iş (el turu)', prev, '->', n);
