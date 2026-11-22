// Redtithe ek poz "twin_stab" (Ömer 2026-11-22): Exsanguinate tepe karesi, iki hançeri birden hedefe saplama.
// Ömer: "Thrust2de kollar doğru ama yumruk karşıya bakıyor. Silah dik durmuş olacak. Slash fena değil ama sol kolun içini
// görmemiz gerekirken iki kolun da dışını görüyoruz." Kurallar: docs/arch/assets.md > "Poz çizim kuralları: el ve kol yönü".
// Girdi 1 = R2 duruş (kimlik), girdi 2 = thrust2 (YALNIZ gövde / bacak / kol uzanışı; yumruğu kusurlu, kopyalanmaz).
// Kullanım (worktree kökünden): node docs/anim-review/new-art/redtithe-poses-v1/make-twin-stab.mjs [deneme-no] [--no-ref2]
import { writeFileSync } from 'node:fs';
const D = 'docs/anim-review/new-art/redtithe-poses-v1';
const n = process.argv[2] || '1';
const noRef2 = process.argv.includes('--no-ref2');
const ref2 = noRef2 ? '' : ` Image 2 is the SAME woman in a lunge and is shown ONLY as a BODY / LEG / LUNGE-DEPTH example: copy her deep lunge, torso lean and boot positions, but NOT her fist (in image 2 the fist punches with the knuckles toward the right, which is WRONG for this pose) and NOT her overlapping arms.`;
const prompt = `IMAGE EDIT of image 1: a 450x412 game sprite of a woman fighter (Redtithe) standing in a guard stance, facing right, transparent background.${ref2}

TASK: redraw the SAME woman, full body, facing right, in a "twin stab" pose: she lunges deep and drives TWO daggers (one in each hand) into an enemy standing just to her right. The game draws the daggers later, so her fists are EMPTY, but they must be shaped and turned exactly as if each one grips a dagger whose blade points straight RIGHT at the enemy.

POSE: deep forward lunge to the right (front knee bent far forward, rear leg stretched back, both boots flat on the same ground line), torso leaning forward toward the right, head up looking right at the enemy, fierce focused face. BOTH arms reach far forward to the right toward the enemy, both nearly straight.
The two fists are clearly SEPARATED vertically, NOT overlapping and NOT touching: the far arm's fist is UPPER, at CHEST height; the near arm's fist is LOWER, at BELLY / navel height, about 50-60 px below the other and a little further forward. Both fists end near the right edge of the figure but stay inside the canvas.

HANDS (most important rule): each fist is seen from the SIDE, like a hand holding a horizontal stick that points right. The knuckle row faces UP (toward the sky), the curled index finger and thumb ring faces RIGHT toward the enemy, the bottom of the fist (little finger) faces DOWN. The hole through each fist is horizontal, pointing right, so a dagger handle would pass through it horizontally with the blade tip pointing RIGHT at the enemy. The flat front of the knuckles must NOT face right (that is a punch, wrong). Wrists straight in line with the forearms.

ARM FACES (side view rule): the two arms must NOT show the same face. The NEAR arm (closer to the viewer, the lower fist) shows its OUTSIDE: we see the back of that hand and the outer forearm. The FAR arm (behind, the upper fist, the character's left arm) shows its INSIDE: we see the inner forearm and the curled fingers / palm side of that fist, the inner elbow crease. Both arms are fully visible; the near arm passes in front of the body, the far arm reaches past the chest.

Layout: same scale as image 1 (same head size; standing she is about 380 px tall, in the lunge she is shorter), boot soles near y=405, figure roughly centred like image 1, at least 6 px free space to the right of the front fist.

IDENTITY (copy from image 1 exactly): same face, eyebrow scar, shaved side of the head with the scale-like tattoo, long dark braid, red shirt sleeves rolled to the forearm, pale linen bandaged forearms with red cross-lacing, dark leather vest with brass buckles, red sash and belt with EXACTLY THREE blood vials side by side, small pouch, brass bowl hanging on a chain, red tattered sash panels, dark baggy trousers, plain brown leather boots. Medieval clothing only. Same painterly pixel-art rendering, outline, palette and lighting. Each arm and each leg is one continuous limb; exactly two arms, two hands, two legs.

BANS: no weapon, no dagger, no blade, no extra or missing limb, no floating parts, no motion lines, no impact star, no dust, no blood, magic, glow, text, ground shadow, halo, checkerboard or white/coloured background. Output a 450x412 image with a real transparent background.`;
const refs = [`${D}/refs/redtithe-idle1.png`];
if (!noRef2) refs.push(`${D}/refs/old-twin_stab.png`);
writeFileSync(`${D}/list-twin.json`, JSON.stringify([{ out: `${D}/raw/twin_stab-${n}.png`, prompt, refs }], null, 1));
console.log('1 iş', n, noRef2 ? '(yalnız girdi 1)' : '(girdi 1 + thrust2)');
