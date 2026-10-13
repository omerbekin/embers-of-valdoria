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

---

## v2 eşleşme (2026-10-12)

Ömer'in testinden sonra (okçu atışları fırlatma pozuyla saçma, Fire Bolt açık elle işaret ve asa öteki elde, Mage / Anti-Mage büyü pozları çok hızlı sönüyor) 44 `pt_*` skill'in v2 pozu yeniden seçildi. **Kural: yeni poz çizilmedi**; yalnızca mevcut 24 kare + kod / veri ayarı (silahın yeri, açısı, eli, gizlenmesi, zamanlama). Eşleşme `tools/make-pose-testers.mjs > POSE` içinde (yeniden üretince korunur); silah yerleşimi `data/poses.json > classes.warrior_v2.itemPoses`.

Silah sütunu Pose Tester'ın gerçek silahı (`src/game/pose-weapons.ts > POSE_TESTER_GEAR`). Tek el (…1) / çift el (…2) karesi silahın tutuşundan seçilir; tılsım tek el takımını kullanır; **yay kendi takımını** kullanır (2026-10-13: tek el takımı, ama `thrust` / `shot` -> bow_shot, `sky` -> bow_sky; başka tutuşta `shot` -> thrust1/2, `sky` -> raise; `data/poses.json > grips.bow`). Yay kullanan her silah (debug silah seçiciyle yay verilen herhangi bir Pose Tester da) yatay atışta bow_shot, göğe atışta bow_sky gösterir.

**Güncelleme 2026-10-13 (Ömer onayı):** Warrior v2'ye 6 yeni kare: idle2, slash1, slash2, spin2a YENİDEN çizildi (eski kareler yerine), bow_shot ve bow_sky YENİ (26 kare). Kaynak `assets/source/poses/warrior-v2-extra/extra.png` (3 x 2), eski sayfalar duruyor; ek sayfa o hücrelerin yerine geçer (`tools/make-poses-v2.mjs > CLASS_EXTRAS`, ölçek eski karelerin boyuna göre medyan oran).

| # | Sınıf (silah) | Skill | Poz (önce -> bırakış) | Kare | Neden |
|---|---|---|---|---|---|
| 1 | Warrior (Dane Axe, çift el) | Double Strike | overhead -> slash | overhead2 -> slash2 | Baltayı kaldırıp indirir; iki kare tek savuruş gibi okunur |
| 2 | Warrior | Whirlwind | spin | spin2a-c | Dönüş döngüsü, balta açık |
| 3 | Warrior | Charge | step -> thrust | step2 -> thrust2 | Koşu, sonra balta hedefe uzanmış darbe |
| 4 | Warrior | Abyssal Cry | raise -> channel | raise -> channel | Balta havada kükreme, sonra öfkeyi öne salar (yumruklar dolu) |
| 5 | Defender (gürz + kule kalkanı) | Tremor Slam | overhead | overhead1 | Gürz başın üstünde, yere vuruş |
| 6 | Defender | Taunt | guard | guard1 | Kalkan önde meydan okuma |
| 7 | Defender | Guard | guard | guard1 | Gerçek koruma pozu, kalkan yukarıda |
| 8 | Defender | Fist Crush | raise | raise | Gürzlü yumruk göğe; gökten yumruklar iner |
| 9 | Paladin (gürz + heater) | Holy Strike | raise | raise | Gürz göğe, gökten çekiç |
| 10 | Paladin | Resurrection | channel | channel | İki yumruk öne, dirilen dosta güç akar |
| 11 | Paladin | Judgment | raise | raise | Gökten ışık |
| 12 | Paladin | Radiance | raise -> channel | raise / channel | Yüceltme, sonra herkese yayılan ışık |
| 13 | Archer (yay) | Quick Shot | shot | bow_shot | Yay uzanmış yumrukta DİK, kiriş eli yanakta (gerçek atış pozu); kiriş kavrama noktasından yanaktaki ele gerilir, ok yayın kavrama yerinden çıkar |
| 14 | Archer | Piercing Arrow | channel -> shot | channel -> bow_shot | Ok takma (iki el göğüste), sonra tam çekiş |
| 15 | Archer | Arrow Rain | sky | bow_sky | Göğe çekiş: yay kolla birlikte göğe eğik (-38°), kiriş yanağa eğik gerilir, oklar kavrama yerinden yukarı |
| 16 | Archer | Aimed Shot | channel -> shot | channel -> bow_shot | Uzun nişan: takma, tam çekiş; poz atış bitene dek tutulur |
| 17 | Cutthroat (iki hançer) | Venom Edge | slash -> thrust | slash1 -> thrust1 | Kesik + saplama |
| 18 | Cutthroat | Saltire Cut | slash | slash1 | X kesiği alanda belirir; tek savuruş |
| 19 | Cutthroat | Smoke Bomb | throw | throw | Bomba açık elden çıkar; hançer arka yumrukta, ikinci hançer gizli |
| 20 | Cutthroat | Backstab | thrust | thrust1 | Arkadan saplama |
| 21 | Mage (Rune Staff, çift el) | Fire Bolt | thrust | thrust2 | Asa iki yumrukla hedefe uzanır, ateş oku ASANIN UCUNDAN çıkar (point'teki açık el / öteki eldeki asa sorunu yok) |
| 22 | Mage | Blizzard | raise | raise | Asa göğe, fırtına yukarıdan |
| 23 | Mage | Mana Barrier | channel | channel | Asa öne, dosta kalkan |
| 24 | Mage | Meteor | channel -> raise | channel -> raise | Toplanma, sonra asa göğe |
| 25 | Druid (Oak Staff) | Thorn Whip | thrust | thrust2 | Diken kırbacı asanın ucundan hedefe uzanır (slash2'de asa geriye bakıyordu, kırbaç gövdeden geçiyordu) |
| 26 | Druid | Nature's Wrath | overhead | overhead2 | Asa yukarıda, yere vuruşla kökler |
| 27 | Druid | Rejuvenate | channel | channel | Asa öne, dosta şifa (eski: point, açık el) |
| 28 | Druid | Summon Treant | raise | raise | Asa göğe, çağrı |
| 29 | Undead (Bone Staff) | Bone Throw | throw | throw | Kemik açık elden fırlar; asa arka yumrukta, başı yukarı |
| 30 | Undead | Wail of the Dead | channel | channel | Asa öne, çığlık alanı |
| 31 | Undead | Dark Bond | channel | channel | Asa dosta uzanır, bağ (eski: point) |
| 32 | Undead | Raise Dead | raise | raise | Asa göğe, ölüyü kaldırır |
| 33 | Anti-Mage (kılıç + hançer) | Mana Steal | slash | slash1 | Yakın vuruş |
| 34 | Anti-Mage | Drain Field | raise | raise | Kılıç göğe, alan |
| 35 | Anti-Mage | Spell Ward | channel | channel | Kılıç öne, dosta koruma (eski: point) |
| 36 | Anti-Mage | Void Strike | thrust | thrust1 | Kılıçla öne saplama, büyü kılıcın ucundan (eski: point) |
| 37 | Gambler (iskambil) | Loaded Dice | throw | throw | Zar açık elden çıkar, tılsım elde çizilmez (fırlatıldı) |
| 38 | Gambler | High Stakes | point | point | Kartlar açık elin parmaklarında hedefe uzatılır |
| 39 | Gambler | Card Trick | throw | throw | Kart fırlatma, kartlar elden çıkmış |
| 40 | Gambler | All In | overhead | overhead1 | Kartlar başın üstünde, masaya vuruş |
| 41 | Hexer (bez bebek) | Evil Eye | point | point | Bebek açık avuçta hedefe tutulur, göz bebeğin üstünde açılır |
| 42 | Hexer | Withering Curse | raise | raise | Bebek başın üstünde, çürüme yere damlar |
| 43 | Hexer | Jinx | thrust | thrust1 | Bebek uzanmış yumrukta, iplik arka elden bebeğe gerilir ve fırlar |
| 44 | Hexer | Doom Mark | channel | channel | İki yumruk bebeği önde tutar (doll_stab çizilene dek en yakını) |

Genel durumlar (değişmedi): idle = idle1/idle2, adım = step, isabet = hit, yere düşme = kneel, attack = slash, cast = raise, defend = guard.

### Silah yerleşimi (aile x poz, `itemPoses`)

| Aile | Poz | Ayar | Neden |
|---|---|---|---|
| staves | idle2 | açı 30°, 40 px aşağı | Baş yukarı, öne yaslı; eski 165° başı yere gömüyordu |
| staves | point / throw / hit | -15° / -25° / -30° + arkada | Arka yumrukta başı yukarı (yere gömülmez), isabette gövdenin arkasında |
| greataxes, mauls | idle2 | 38° | Baş omuz önünde; eski 165° yere gömülüyordu, 15° yüzü kapatıyordu |
| greataxes, mauls | point / throw / hit | -20° / -25° / -35° + arkada | Aynı neden |
| bows | raise | -40° | Yayla raise (büyü / buff): yay göğe eğik |
| bows | bow_sky | -38° | Arrow Rain: yay uzanan kola dik, göğe eğik |
| greataxes, mauls | idle2 (yeni kare) | 48° | Yeni idle2'de eller aşağıda ortada; baş omuz önünde, yüzü kapatmıyor |
| greataxes, mauls | slash2 (yeni kare) | 110° | Yeni slash2 aşağı-öne savuruş sonu; 125°'de baş yere gömülüyordu |
| staves | idle2 (yeni kare) | 40°, 20 px aşağı | Baş omuz önünde |
| charms | point | ikinci el (açık el) | Kart / bebek açık elde gösterilir |
| charms | throw | gizli | Tılsım fırlatıldı |
| shields | point / throw | önkola kaydırıldı | Kalkan açık elin üstünde değil |
| shields | hit / kneel | gövdenin arkasında | Kalkan elleri / dizleri kapatmıyor |
| daggers, swords (ikinci el) | point / throw | gizli | İkinci silah açık elde çizilmez |
| shields.tower | boy 200 -> 160 | | Kule kalkanı gövdeyi kapatıyordu |
| charms.doll | boy 80 -> 115 | | Bebek okunmayacak kadar küçüktü |

### Kod

- `src/game/poses.ts > itemPlacement / poseItems / placementPoint`: çizim, sınır ve efekt noktası tek yerleşimden (poz + aile ayarı). Gerçek Warrior v1'de ayar yok, birebir aynı.
- `CombatantView.castPoint()`: efekt çıkış noktası = asanın / kılıcın ucu, yayın kavrama yeri, tılsımın ortası; açık el pozunda (point / throw, `poses.<poz>.open`) açık el. `handPoint('off')`, `bowPoints()` (yayın gerçek uçları + kirişi çeken el). Mage, Anti-Mage, Undead, Druid, Gambler, Hexer, Archer v2 efektleri ve Smoke Bomb bunu kullanır (yalnızca v2 pozlu birimde; gerçek sınıflar eski el noktasında).
- Zamanlama (yalnızca v2): skill sürerken efektin `play('idle')` isteği pozu bozmaz; melee olmayan skill'de poz hazırlık, bırakış ve vuruş anı boyunca tutulur, skill başından en az 750 ms (battle speed ve skill yavaşlatmasıyla ölçekli, `slow()`), sonra 280 ms bekleyip 200 ms'lik yumuşak geçişle idle. Melee'de poz en az 260 ms görünür.

### Hâlâ çizim isteyen (kodla çözülmeyen)

- ~~slash1 / slash2 kolu geriye savrulmuş~~: 2026-10-13 yeni slash1 (tek el öne uzanmış vuruş sonu) ve slash2 (çift el aşağı-öne savuruş sonu) ile çözüldü.
- ~~Okçu atış pozu yok~~: 2026-10-13 bow_shot / bow_sky ile çözüldü.
- Hexer Doom Mark için bebeğe iğne (doll_stab) pozu yok (channel).
- Açık el pozlarında (point / throw) kalkan önkola kaydırıldı; kalkanlı sınıflar bu pozları kullanmıyor, gerekirse yeni çizim ister. hit / kneel'da kalkan gövdenin arkasında, büyük kısmı görünmüyor.
- Tılsımlar küçük (kart 70, bebek 115 gövde tuvali pikseli): ekranda ancak seçiliyor.

## Sınıf başına v2 gövdeleri (2026-10-13)

Her sınıf aynı kare listesiyle KENDİ gövdesini alabilir: `assets/source/poses/<id>-v2/one-handed.png` + `two-handed.png` (4 x 3, Warrior v2 ile aynı hücre sırası) + isteğe bağlı `bow.png` (2 x 1: bow_shot, bow_sky; yalnızca yay kullanan sınıf), sonra `node tools/make-poses-v2.mjs --class=<id>` -> `assets/poses/<id>-v2/` + `data/poses.json > classes.<id>_v2` (her sayfa Warrior v2'nin aynı karelerinin boyuna göre ölçeklenir: aynı taban ve boy; sola bakan hücre siluetle bulunup aynalanır; el noktaları Warrior v2 oranından, gerekirse `assets/source/poses/<id>-v2/config.json > seeds`). Tutuş takımları, durumlar, itemPoses Warrior v2'den kopyalanır. O sınıfın Pose Tester'ı kendi gövdesini kullanır (`classAliases`; yoksa warrior_v2). bow.png yoksa 24 kare ve yay tutuşu tek el takımına düşer. Kılavuz aracın başında; test `tests/poses-v2-classes.test.ts`.

- Archer: `archer_v2` (26 kare, Pose Tester IV). bow.png figürleri 4 x 3 sayfalardan büyük çizilmişti, araç ölçekle eşitledi. El tohumları `assets/source/poses/archer-v2/config.json` (gözle).
