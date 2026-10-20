// V8 Reach (Menzil ve Şekil): üst şerit (Shape) hedeflemeyi değiştirir: yan sıçrama (perpendicular), zincir,
// şerit / sıra / artı / dikdörtgen alan, menzil, çekme (pull laneFront: motorda var). İtme [NEW].
// Alt şerit (Power) gücü artırır. İki şerit de alınabilir, tek Evolve. Sayılar PROVİZYON.
(window.SMV_DATA = window.SMV_DATA || {})[8] = {
  w: {
    mastery: "Reaver Mastery",
    bar: [
      ["Reaver's Eye", "Your skills deal +10% damage to an enemy that stands alone in its row."],
      ["Hooked Haft", "Enemies you pull or splash take +10% damage from you until your next turn."],
      ["Crowd Breaker", "Whirlwind and Charge deal +5% damage for each enemy beyond the first they hit."],
      ["Deep Strikes", "Your hits on enemies in the back two rows deal +12% damage."],
      ["Executioner's Reach", "You can strike an enemy below 25% HP at any range."],
    ],
    rows: [
      { // 0 Berserker: az canla vuruşların şekli genişler
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Wild Swing", "Below 50% HP, your single-target hits splash 20% to the enemies beside the target."],
          s2: ["Lunging Fury", "Below 50% HP, your melee skills reach one row deeper."],
          sm: ["Brink Sweep", "Below 25% HP, your single-target skills also hit the rest of the target's row for 50%."],
          p1: ["Raw Fury", "Berserker's top bonus +4% per rank (+80% up to +100%)."],
          p2: ["Blood-Fed Wrath", "Rage gained from losing HP +10% per rank."],
          pm: ["Red Haze", "Berserker counts you as 15% lower on HP than you really are."],
          v: ["Rampage", "Below 50% HP, your single-target hits splash 35% to all four neighbours of the target."],
        },
      },
      { // 1 Double Strike
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Glancing Edge", "Double Strike's second hit splashes 30% to the enemies beside the target."],
          s2: ["Hooking Swing", "Double Strike's second hit pulls a back-row target to the front of its lane."],
          sm: ["Chain of Cuts", "Each Double Strike hit jumps on to the nearest other enemy for 60%."],
          p1: ["Honed Bit", "Double Strike +4% power per rank."],
          p2: ["Bearded Axe", "Double Strike grants +1 Rage per hit per rank."],
          pm: ["Sundering Pair", "If both Double Strike hits land, the target takes +12% damage for 2 turns."],
          v: ["Cleaving Pair", "Double Strike also hits both enemies beside the target at full power."],
        },
      },
      { // 2 Whirlwind (zaten tüm düşmanlara vurur: şekil = odak, çekme, itme)
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Tight Circle", "Whirlwind deals +25% to the front row and 25% less to the rows behind."],
          s2: ["Dragging Edge", "Whirlwind pulls one back-row enemy to the front of its lane."],
          sm: ["Fling", "Whirlwind knocks every front-row enemy one row back.", 1],
          p1: ["Broad Blade", "Whirlwind +3% power per rank."],
          p2: ["Leech Edge", "Whirlwind lifesteal +4% per rank."],
          pm: ["Bloody Orbit", "Whirlwind deals +30% damage to enemies below 50% HP."],
          v: ["Gyre of Steel", "Whirlwind Slows the front row for 2 turns, and Slowed enemies take +20% from it."],
        },
      },
      { // 3 Charge
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Wide Impact", "Charge splashes 40% to the enemies beside the target."],
          s2: ["Bowl Over", "Charge knocks its target one row back.", 1],
          sm: ["Trampling Run", "Charge hits every enemy in the target's lane; only the target is Stunned."],
          p1: ["Iron Brow", "Charge +4% power per rank."],
          p2: ["Ringing Blow", "Charge +6% power per rank against a Slowed or Stunned target."],
          pm: ["Crushing Arrival", "Charge's Stun lasts 2 turns."],
          v: ["Breakthrough", "Charge hits every enemy in the target's lane and Stuns them all for 1 turn."],
        },
      },
      { // 4 Headsman's Blow
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Long-Hafted Axe", "Headsman's Blow can strike one row deeper."],
          s2: ["Bloody Arc", "Headsman's Blow splashes 30% to the enemies beside the target."],
          sm: ["Mass Execution", "Headsman's Blow hits the target's whole row; the others take 50%."],
          p1: ["Heavy Head", "Headsman's Blow +3% power per rank."],
          p2: ["Hungry Blade", "Headsman's Blow's missing-HP bonus +10% per rank (60% up to 90%)."],
          pm: ["Neck Breaker", "Headsman's Blow draws 25% more power from each Rage spent."],
          v: ["Arc of the Headsman", "Headsman's Blow strikes the target and its four neighbours at full power."],
        },
      },
    ],
  },
  h: {
    mastery: "Hexcraft Mastery",
    bar: [
      ["Far Whisper", "Evil Eye and Jinx gain Range +1."],
      ["Spreading Ink", "When you crit with a single-target skill, an enemy beside the target gains 1 Omen."],
      ["Wide Malice", "Withering Curse and Doom Mark deal +8% for each enemy beyond the first they hit."],
      ["Distant Doom", "Doom on enemies in the back two rows deals +15% damage."],
      ["Omen Web", "When Doom strikes, one enemy beside the victim gains 1 Omen."],
    ],
    rows: [
      { // 0 Ill Omen: Omen'lerin nereye geçtiği (şekil) / Doom gücü
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Crow Flight", "Passed Omens go to the enemy with the lowest HP instead of the nearest."],
          s2: ["Spatter of Woe", "When a cursed enemy dies, the enemies beside it each gain 1 Omen."],
          sm: ["Graveyard Web", "When a cursed enemy dies, every enemy in its row receives its Omens (never Doom)."],
          p1: ["Bitter Wax", "Doom +3% damage per rank."],
          p2: ["Grim Arithmetic", "Misfortune lowers crit by 1% more per Omen, per rank."],
          pm: ["Crushing Doom", "Doom from reaching 3 Omens (not from the timer) deals +30% damage."],
          v: ["Carrion Web", "When a cursed enemy dies, its Omens pass to every enemy within 2 cells (never Doom)."],
        },
      },
      { // 1 Evil Eye
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Glancing Curse", "Evil Eye splashes 25% to the enemies beside the target (no Omen)."],
          s2: ["Piercing Stare", "Evil Eye pierces the target's lane, 30% weaker for each enemy past the first."],
          sm: ["Roving Eye", "Evil Eye jumps to 2 more enemies (60%, then 36%), each gaining 1 Omen."],
          p1: ["Bloodshot", "Evil Eye +4% power per rank."],
          p2: ["Witch-Sight", "Evil Eye +3% crit chance per rank."],
          pm: ["Baneful Glint", "Evil Eye's critical hits add 3 Omens instead of 2."],
          v: ["Hundred Eyes", "Evil Eye jumps through up to 4 enemies at 70% each, adding 1 Omen to each."],
        },
      },
      { // 2 Withering Curse (2x3 alan)
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Turned Furrow", "You may turn Withering Curse's area to 3 rows deep by 2 lanes."],
          s2: ["Creeping Mist", "Withering Curse's area grows to 3x3."],
          sm: ["Shroud of Rot", "Withering Curse covers the whole enemy board, but deals 25% less."],
          p1: ["Grave Dirt", "Wither ticks +4% per rank."],
          p2: ["Grave Chill", "Withering Curse's initial hit +6% power per rank."],
          pm: ["Black Mold", "Withering Curse's initial hit is doubled and also Wounds for 2 turns."],
          v: ["Grave Fog", "Withering Curse's area stays as rot ground for 2 turns, Withering anyone in it."],
        },
      },
      { // 3 Jinx
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Tangled Pair", "Jinx also Jinxes the enemies beside the target (no damage)."],
          s2: ["Hag's Tug", "Jinx pulls the target to the front of its lane."],
          sm: ["Cat's Cradle", "Jinx hits the target's whole row."],
          p1: ["Needle and Thread", "Jinx +4% power per rank."],
          p2: ["Hag's Luck", "Jinx +4% crit chance per rank."],
          pm: ["Ruinous Jinx", "Jinxed's accuracy penalty grows from 20% to 35%."],
          v: ["Web of Ill Luck", "Jinx hits the target and all four of its neighbours (plus shape)."],
        },
      },
      { // 4 Doom Mark
        lanes: { u: "Shape", l: "Power" },
        n: {
          s1: ["Spill of Doom", "Doom Mark's Doom also hits the enemies beside the target for 30%.", 1],
          s2: ["Far Verdict", "Doom Mark can target any enemy, at any range."],
          sm: ["Mass Grave", "Doom Mark hits every Omen-bearing enemy in the target's row and detonates each."],
          p1: ["Leaden Verdict", "Doom Mark's Doom multiplier +0.05 per rank (x1.65 up to x1.9)."],
          p2: ["Ink of Ruin", "Doom Mark +5% power per rank."],
          pm: ["Crushing Sentence", "Doom Mark applies 2 Omens before it detonates."],
          v: ["Bell of the Dead", "Doom Mark becomes a 2x2 blast: each enemy in it is hit, gains 1 Omen and detonates."],
        },
      },
    ],
  },
};
