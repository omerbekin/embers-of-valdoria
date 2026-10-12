# Pose coverage re-check (Pose Tester question)

Question (Ömer): "If we fix the Pose Tester's problem poses, will we have a pose set that covers ALL characters?"

**Short answer: no, not fully.** The planned re-draws fix the quality problems, but they leave 2 missing shared pose *types* (point-cast and thrust) and a few class-only poses (Archer's bow, Hexer's doll, possibly Cutthroat's X-cut). There is also one missing piece of *code/data*: a second-hand layer for the shield, the second dagger and the two-handed grip. With 2 new shared poses plus 2-4 class extras, all 11 classes are covered.

Sources read: data/poses.json, src/game/poses.ts (statePose), src/game/combatant-view.ts (ANIMATIONS = idle, attack, cast, hit, death, defend), data/classes/*.json, data/skills.json, data/global-skills.json, data/mobs/*.json, data/bosses/*.json, data/summons/*.json, data/items.json > weaponFamilies, docs/design/future-ideas.md, docs/design/bosses/bridge-warden.md.

Important framing: "shared pose" means a shared pose **name and list**, plus a weapon layer with hand-point data. Every class still gets its own drawn bodies (`assets/poses/<dir>/`). So "shared OK" means the class needs nothing beyond the common list.

---

## 1. Current pose set (Warrior only)

| Pose | What it shows | Current use |
|---|---|---|
| idle | Standing ready, weapon held low (35°) | idle state; also the hit state (idle + code recoil) |
| step | Stepping forward, weapon up (70°) | move / run-in; the `defend` state; Guard (temporary) |
| slash | Wide downward/side cut, arm swept back-low (-95°) | `attack` state; 2nd hit of Double Strike; 2nd half of Charge |
| overhead | Weapon raised high over the head, two hands | 1st hit of Double Strike; Tremor Slam (A) |
| spin1-3 | 3-frame spin cycle, weapon held out | Whirlwind (A) |
| raise | One arm thrust up (weapon hanging 160°), open hand | `cast` state; Abyssal Cry; Judgment (A) |
| channel | Both arms forward at chest height, open hands | Abyssal Cry 2nd half; Wail of the Dead (A) |
| throw | Overhand hurl, arm forward, open hand | Quick Shot (D, stand-in) |
| hit | Recoil (drawn, but reads as hit from BEHIND) | NOT used; hit = idle + code lean (D) |
| kneel | On one knee, weapon down | `death` state (downed) |

10 pose types in 12 frames. Known defects: open hands in raise/channel/throw (the weapon sits in the palm); two-handed weapons held one-handed; axe held backwards; no real guard; hit reads as being struck from behind.

Planned re-draws (future-ideas row): (1) front hit, (2) real guard/block, (3) better slash (Saltire Cut), (4) archer bow shot, (5) two-handed grip + axe flip + fists in raise/channel/throw.

---

## 2. Coverage table

Status key:
- **A** = the current set covers it well.
- **B** = covered once the planned re-draws are done.
- **C** = NOT COVERED: a new pose type is needed. The best stand-in is in brackets.

Ömer's ratings are noted where they exist.

### Basic and always-on actions (all classes)

| Action | Pose | Status |
|---|---|---|
| Idle | idle | A |
| Move (global `move_tile`) | step (+ code tween) | A |
| Rest / Skip Turn (global) | idle (+ small code breath) | A |
| Run-in to melee | step | A |
| Hit reaction | hit_front (re-draw 1) | B (currently D) |
| Defend / block / evade reaction (`defend` state) | guard (re-draw 2) | B |
| Death / downed (corpse stays on board, can be revived) | kneel | A |
| Victory | not used in battle code today | n/a (could reuse raise) |

Note: there is no separate "basic attack" action. Each class's first skill is its 0-MP basic.

### Player classes (11)

| Class (weapon family) | Skill | Type | Best pose | Status |
|---|---|---|---|---|
| Warrior (axes/swords, maces) | Double Strike | melee 2 hits | overhead -> slash | B (needs better slash + 2H grip/axe fix) |
| Warrior | Whirlwind | spin | spin1-3 | A (Ömer: A) |
| Warrior | Charge | rush + hit | step -> slash | A (Ömer: A) |
| Warrior | Abyssal Cry | self buff / war cry | raise -> channel (fists) | B |
| Defender (mace + shield) | Tremor Slam | ground slam, row | overhead | A (Ömer: A); needs shield layer |
| Defender | Taunt | shield bang + roar | guard (shield bang) or raise | B (raise is an acceptable fallback) |
| Defender | Guard | protect ally | guard | B (currently D) |
| Defender | Fist Crush | sky fists, 3 random | raise (fist up) | B (fist re-draw) |
| Paladin (mace + shield) | Holy Strike | sky hammer, single | raise | B |
| Paladin | Resurrection | revive dead ally | channel | B |
| Paladin | Judgment | sky light, plus shape | raise | A (Ömer: A) |
| Paladin | Radiance | heal all + damage | channel (or raise) | B |
| Archer (bows, two hands) | Quick Shot | bow shot | bow_shot | B (currently D via throw) |
| Archer | Piercing Arrow | bow shot, column | bow_shot | B |
| Archer | Arrow Rain | volley into the sky | bow_sky | **C** (bow_shot tilted by code is a weak stand-in) |
| Archer | Aimed Shot | full-draw shot | bow_shot (held longer) | B |
| Cutthroat (2 daggers) | Venom Edge | 2 quick cuts | slash (x2) | B (better slash + offhand dagger layer) |
| Cutthroat | Saltire Cut | X cut / thrown blades | cross-cut (both arms crossing) | B only if the "better slash" is drawn as an X with both blades; otherwise **C** (Ömer: C on slash) |
| Cutthroat | Smoke Bomb | throw, 2x2 | throw | B (fist) |
| Cutthroat | Backstab | teleport, stab in the back | **thrust** | **C** [slash] |
| Mage (staff) | Fire Bolt | single bolt | **point** (or throw = hurl fireball) | **C** for point; B as a throw stand-in |
| Mage | Blizzard | sky AoE | raise | B |
| Mage | Mana Barrier | shield on ally | point / channel | B via channel; better with point (C) |
| Mage | Meteor | sky AoE | channel -> raise | B |
| Druid (staff, two hands) | Thorn Whip | whip lash | slash (or throw) | B |
| Druid | Nature's Wrath | roots from the ground | overhead (staff into ground) or channel | B |
| Druid | Rejuvenate | heal ally | point / channel | B via channel; better with point (C) |
| Druid | Summon Treant | summon from the ground | channel (or raise) | B |
| Undead (staff) | Bone Throw | throw | throw | B (fist) |
| Undead | Wail of the Dead | channel AoE | channel | A (Ömer: A) |
| Undead | Dark Bond | link to ally | channel / point | B |
| Undead | Raise Dead | summon from corpse | raise (or channel) | B |
| Anti-Mage (swords, daggers) | Mana Steal | melee arcane hit | slash | B |
| Anti-Mage | Drain Field | sky AoE | raise / channel | B |
| Anti-Mage | Spell Ward | shield on ally/self | point / raise | B via raise; better with point (C) |
| Anti-Mage | Void Strike | single spell | **point** | **C** [throw] |
| Gambler (charms: dice/cards/coin) | Loaded Dice | dice toss | throw | B (dice in fist; weapon layer = small charm) |
| Gambler | High Stakes | duel/bet strike | point (card flick) or slash | **C** for point; B with a slash stand-in |
| Gambler | Card Trick | card throw, 2 random | throw | B |
| Gambler | All In | slam chips down | overhead | A/B (weapon hidden) |
| Hexer (charm: doll) | Evil Eye | gaze/curse, single | **point** | **C** [raise] |
| Hexer | Withering Curse | area curse | channel | B |
| Hexer | Jinx | single curse | **point** | **C** [raise] |
| Hexer | Doom Mark | crack/pierce the doll | doll_stab (class-specific) | **C** [channel] |

Count across 44 class skills: **A 6, B 30, C 8** (Arrow Rain, Backstab, Void Strike, Evil Eye, Jinx, Doom Mark, Fire Bolt\*, High Stakes\*; \* = has a usable B stand-in). Saltire Cut is borderline. Three more skills (Mana Barrier, Rejuvenate, Spell Ward) are B but would read better with point.

### Summons

| Unit | Skill | Best pose | Status |
|---|---|---|---|
| Skeleton (humanoid) | Skeleton Strike / Slash | slash / overhead | A/B, using its own skeleton body drawings |
| Treant (tree) | Root Smash / Vine Snare | own art | own art (non-humanoid) |

### Phase 1 mobs (5 families, fill-plan step 1)

| Mob | Skill | Best pose | Status |
|---|---|---|---|
| Road Thug, Moor Raider (cudgel) | Cudgel | overhead / slash | A/B |
| Road Thug, Moor Raider | Hamstring | slash low (or thrust) | B |
| Bandit Crossbowman | Bolt, Snare Shot | crossbow_aim (two hands at the shoulder, no string pull) | **C** (Archer's bow_shot does not fit a crossbow) |
| Ember Acolyte, Charcoal Burner | Ember Toss | throw (or point) | B |
| Ember Acolyte, Charcoal Burner | Burn the Ground | raise | B |
| Shieldwarden, Stonebound Warden, Thane (shield) | Shield Bash | **thrust** (shield shove) | **C** [slash] |
| Shieldwarden, Stonebound Warden, Thane | Hold the Line (taunt) | raise / guard | B |
| Thane of the Deep | Shield Wall (guard copy) | guard | B |
| Fen Witchling, Hedge Witch Morwen | Hex Bolt | **point** | **C** [raise] |
| Fen Witchling, Hedge Witch Morwen | Bog Curse | channel | B |
| Hedge Witch Morwen | Lure Light | point / raise | B via raise |
| Will-o'-Wisp (floating light) | Spark / Marsh Glow | own art (pulse, flare) | own art |
| Ghoul (hunched, claws) | Gnaw | thrust (lunge-bite) | **C** [slash]; own hunched drawings, weapon hidden |
| Ghoul | Feast | overhead (pounce claw) | B |
| Drowned | Gnaw | thrust | **C** [slash] |
| Drowned | Drag Under (hook pull) | yank (pull back) | **C** [throw] (optional pose, see 4d) |

### Boss

| Unit | Skill | Status |
|---|---|---|
| The Bridge Warden (half-man, half-bridge, chained anchor) | Anchor Smash, Breaking Span, Chain Hook, Ash Brand, Fall of King's Bridge | **own art**: the silhouette, size and anchor are all unique |
| Iron Mooring (inert object) | none (no turns) | static sprite + code hit-shake + broken frame; no poses |

---

## 3. Class-specific body/weapon issues

| Case | Verdict | Why / what is needed |
|---|---|---|
| Gambler: dice, cards, coin | **Shared poses OK** | Charm = small prop in the fist (the weapon layer with a tiny item, or `hidden`). throw/overhead/point cover it. An idle "dice roll" flourish is optional. |
| Hexer: doll | **Shared OK + 1 class pose** | The doll is held in the offhand in most poses. Doom Mark (piercing/cracking the doll) needs both hands working on the doll: a `doll_stab` pose. |
| Druid: staff | **Shared OK** (needs re-draw 5) | Long staff = two-hand grip data per pose (offhand on the shaft). The planned two-handed fix covers it; the staves family art is needed. |
| Mage / Undead: staff | **Shared OK** (re-draw 5) | Same as Druid. They also need **point** for single-target spells. |
| Cutthroat: two daggers | **Shared OK + offhand weapon layer** (+ maybe cross_cut) | Today `offhand` is data only (a fist patch). A second weapon drawn at the offhand point, with its own angle per pose, is a code/data addition, not new body art. Saltire Cut needs both arms crossing. |
| Anti-Mage: blade (+ dagger) | **Shared OK** (+ offhand layer if dual) | Uses slash/raise/point. |
| Defender / Paladin: shield + mace | **Shared OK + offhand shield layer** | The shield goes on the offhand point with a per-pose angle and front/back flag. The guard re-draw must be drawn shield-ready (arm forward). No extra body pose. |
| Archer: bow (two hands, string pull) | **Needs class-specific poses** | The bow arm extends and the string hand pulls to the cheek; no other class does this. bow_shot (planned) + bow_sky (Arrow Rain). The bow layer needs a drawn string state (relaxed/drawn) or a 2-frame bow. |
| Mage / Anti-Mage casting hands | **Shared OK after the fist fix + new `point`** | raise/channel with fists hold a staff/blade; the single-target spell needs point. Glow at the hand point comes from VFX. |
| Skeleton (summon) | **Shared list OK**, own drawings | Humanoid; weapon = bone blade. |
| Treant | **Own art** | Tree body, no hands/weapon logic. 3-4 frames: idle sway, smash, snare, wither. |
| Will-o'-Wisp | **Own art** | No body. Pulse/flare/flicker/fade, mostly code + glow. |
| Ghoul (hunched) | **Shared list OK**, own hunched drawings, weapon hidden | Bite/pounce reads better with thrust and overhead. |
| Bridge Warden (huge) | **Own art** | Unique silhouette, scale and anchor-on-chain; the design doc forbids a knight silhouette. ~5-6 own poses. |
| Iron Mooring | **Own art (static)** | One normal frame + one broken frame; motion in code. |

---

## 4. Conclusions

### (a) Do the planned re-draws give full coverage for the 11 classes?

**No.** After the 5 planned re-draws, these gaps remain:

1. **No single-target "point/cast-forward" pose.** It affects Fire Bolt, Void Strike, Evil Eye, Jinx and High Stakes, and would also improve Mana Barrier, Rejuvenate, Spell Ward and Dark Bond. Today these fall back to raise (an arm to the sky, which reads as a sky spell, not a bolt) or throw.
2. **No thrust/stab pose.** It affects Backstab, and on the mob side Shield Bash and the Ghoul/Drowned Gnaw.
3. **Archer needs a second bow pose.** Arrow Rain shoots into the sky; the single planned "bow shot" is horizontal.
4. **Hexer's Doom Mark** needs a doll pose (class-only).
5. **Saltire Cut** is fixed only if the "better slash" is drawn as a two-blade X; a normal one-arm slash will still look wrong.
6. **Not a pose, but required:** an offhand weapon layer (shield, second dagger) and two-hand grip data. Today `offhand` only draws a fist patch.

### (b) Minimal final shared pose list (13 types, 15 frames)

1. **idle**: standing ready, weapon low.
2. **step**: step forward; move, run-in, rush.
3. **slash**: wide side/diagonal cut (re-drawn; readable as a single or double cut).
4. **overhead**: weapon over the head and brought down; heavy blow, ground slam, staff into the ground.
5. **thrust** (NEW): lunge with the arm straight forward; stab, shield bash, bite-lunge.
6. **spin** (3 frames): spin attack.
7. **raise**: fist (with weapon) thrust skyward; sky spells, war cry, summon from above.
8. **channel**: both fists forward at the chest; area spells, heals on many, summon, link.
9. **point** (NEW): one arm extended at the target, the other hand back; single-target spell, curse, buff/shield on one ally.
10. **throw**: overhand hurl with a closed fist; dice, cards, bones, bombs, fireball.
11. **guard** (re-draw): braced block, weapon/shield forward; Guard, defend, evade reaction.
12. **hit_front** (re-draw): bent forward, struck from the front.
13. **kneel**: downed / death (the corpse stays on the board).

Applied to all 13: fists (not open hands), a two-hand grip where the weapon is two-handed, and the correct axe direction. Spin counts as one type, so there are 13 types and 15 frames, inside the 12-16 target. Defaults to change: `cast` state -> point for Mage/Hexer/Anti-Mage-type casters; `defend` -> guard; `hit` -> hit_front.

### (c) Unavoidable class-specific extras

| Class | Extra | Note |
|---|---|---|
| Archer | **bow_shot**, **bow_sky** | String-pull body; the bow layer has a drawn/relaxed string state. bow_shot is already planned. |
| Hexer | **doll_stab** | Only Doom Mark needs it (fallback: channel). |
| Cutthroat | **cross_cut** (only if the shared slash cannot read as an X) | Plus the offhand dagger layer. |
| Defender, Paladin, Cutthroat, (Anti-Mage) | no extra pose; **offhand weapon layer** | Shield / second blade: per-pose offhand angle and front/back data. |
| Druid, Mage, Undead | no extra pose; **two-hand staff grip data** | Part of re-draw 5. |
| Gambler | none required | An idle shuffle/dice flourish is optional. |

That is 2-4 extra poses in total across 11 classes. Everything else rides on the 13 shared types.

### (d) What this means for mobs

- **Can reuse the shared list (humanoids):** Bandits (Road Thug, Moor Raider; cudgel = maces family), Ember Cult (Ember Acolyte, Charcoal Burner), Guardians (Shieldwarden, Stonebound Warden, Thane; shield layer + thrust for Shield Bash), Hexes witches (Fen Witchling, Hedge Witch Morwen; point + channel), Drowned, Ghoul (own hunched drawings, weapon hidden, thrust + overhead), and the Skeleton summon. Cost-saver idea: humanoid mobs of one family could share one generic body set with an outfit/palette swap, because the weapon is a separate layer anyway.
- **Mob extras:** the Bandit Crossbowman needs **crossbow_aim** (a crossbow is not a bow). Drowned's Drag Under (and the boss's Chain Hook) would read better with a **yank** pose; throw is the fallback.
- **Cannot reuse (own art):** Will-o'-Wisp (no body), Treant (tree), Bridge Warden (huge, unique silhouette and anchor weapon), Iron Mooring (static object, 2 frames).
