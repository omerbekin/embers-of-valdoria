// Redtithe hit v2 (Ömer 2026-11-21 form: "Hiti kafasından yemesin karnından yesin").
// Eski hit geriye savruluyordu (darbe kafaya gibi); v2 darbeyi karından yer: öne iki büklüm.
// Yalnız girdi 1 (R2 duruş, kimlik) verilir; eski hit poz örneği OLARAK VERİLMEZ (yanlış yöne çekiyordu).
// Kullanım (worktree kökünden): node docs/anim-review/new-art/redtithe-poses-v1/make-hit-v2.mjs [deneme-no]
import { writeFileSync } from 'node:fs';
const D = 'docs/anim-review/new-art/redtithe-poses-v1';
const n = process.argv[2] || '1';
const prompt = `IMAGE EDIT of image 1: a 450x412 game sprite of a woman fighter (Redtithe) standing in a guard stance, facing right, transparent background.

TASK: redraw the SAME woman, full body, facing right, in a "hit in the stomach" reaction pose.
POSE: she has just been punched / struck hard in the BELLY from the right. Her torso DOUBLES OVER FORWARD (bent at the waist toward the right, about 30-40 degrees), the belly caved in, shoulders hunched forward and rounded, head bowed forward and down (chin toward the chest, face looking down, pained grimace, eyes squeezed). The REAR arm is bent with its clenched EMPTY fist pressed against her own stomach, protecting the belly. The FRONT arm hangs loosely forward and down in front of the knees, its clenched EMPTY fist below the waist. Knees bent, both boots flat on the ground at the same ground line, stance about as wide as image 1, the whole body slid a little backwards (to the left). The head must NOT tilt back; the body must NOT lean back.
Both fists are EMPTY and clenched (the game adds the daggers later), each fist clearly visible, same size as the fists of image 1, thumb on top, wrist straight and in line with the forearm.
Layout: same scale as image 1 (standing figure about 380 px tall; bent over she is shorter), boot soles near y=405, figure roughly centred like image 1.

IDENTITY (copy from image 1 exactly): same face, eyebrow scar, shaved side of the head with the scale-like tattoo, long dark braid, red shirt sleeves rolled to the forearm, pale linen bandaged forearms with red cross-lacing, dark leather vest with brass buckles, red sash and belt with EXACTLY THREE blood vials side by side, small pouch, brass bowl hanging on a chain, red tattered sash panels, dark baggy trousers, plain brown leather boots. Medieval clothing only. Same painterly pixel-art rendering, outline, palette and lighting. Each arm and each leg is one continuous limb.

BANS: no weapon, no dagger, no extra or missing limb, no floating parts, no motion lines, no impact star, no dust, no blood, magic, glow, text, ground shadow, halo, checkerboard or white/coloured background. Output a 450x412 image with a real transparent background.`;
writeFileSync(`${D}/list-hit.json`, JSON.stringify([{ out: `${D}/raw/hit.png`, prompt, refs: [`${D}/refs/redtithe-idle1.png`] }], null, 1));
console.log('1 iş', n);
