// V9 Marks (Damga): uygula -> büyüt -> tüket. T1 (a1, a2) durum uygular / uzatır, T2 (b1, b2) durumu güçlendirir,
// T3 Major'ları (c1 ya da c2, biri) durumu TÜKETİP büyük etki yapar. Sayılar PROVİZYON.
// Warrior: Stun, Wound, Slow (mevcut) + Sundered (zırh kırma; veride yeni durum: "damage taken +15%", alanı mevcut
// damageTakenMult; Ömer onayı gerektiği için uygulayan düğümler [NEW]). Hexer: Omen, Wither, Jinxed.
(window.SMV_DATA = window.SMV_DATA || {})[9] = {
  w: {
    mastery: "Ironbrand Mastery",
    bar: [
      ["Lasting Bruises", "Wound and Slow you apply last 1 turn longer."],
      ["Blood in the Water", "You deal +8% damage to enemies carrying a status you applied."],
      ["Old Scars Open", "Your hits on a Wounded enemy grant +3 Rage."],
      ["Spent Marks", "Each time you consume a status, gain 10 Rage."],
      ["Branded Prey", "Stunned enemies take +15% damage from your skills."],
    ],
    rows: [
      { // 0 Berserker: az canla Wound / Slow dağıtır, vuruşların bunları tüketir
        n: {
          a1: ["Spiteful Hide", "When an enemy hits you below 50% HP, 20% chance per rank to Wound it for 2 turns."],
          a2: ["Bared Fangs", "The first time you drop below 50% HP, Slow every front-row enemy for 2 turns."],
          b1: ["Festering Bite", "Wound you apply cuts healing by a further 5% per rank."],
          b2: ["Easy Meat", "Your hits on a Slowed enemy grant +3 Rage."],
          c1: ["Bloodletting", "Your hits consume Wound: heal 6% of your max HP each time."],
          c2: ["Fell the Lame", "Your hits consume Slow for +40% damage and 10 Rage."],
          v: ["Carrion Wrath", "Berserker's bonus rises +10% for each status on the enemy you strike."],
        },
      },
      { // 1 Double Strike: Wound uygular, Wound ya da Stun tüketir
        n: {
          a1: ["Ragged Edge", "Double Strike's second hit has a 10% chance per rank to Wound for 2 turns."],
          a2: ["Gash", "Double Strike always Wounds a target below 50% HP for 2 turns."],
          b1: ["Salt the Wound", "Double Strike +5% power per rank against a Wounded target."],
          b2: ["Reopened Gash", "Double Strike refreshes Wound to its full length and grants 3 Rage per Wounded hit."],
          c1: ["Open the Vein", "Double Strike consumes Wound: its second hit deals +60% and heals you for 30% of it."],
          c2: ["Crack the Skull", "Double Strike consumes Stun: both hits are critical and you gain 15 Rage."],
          v: ["Flaying Strikes", "Every Double Strike hit Wounds; a hit on a Wounded target refreshes it and gives 3 Rage."],
        },
      },
      { // 2 Whirlwind: Slow uygular, Slow ya da Sundered tüketir
        n: {
          a1: ["Leg Sweep", "Whirlwind has a 10% chance per rank to Slow each enemy hit for 2 turns."],
          a2: ["Shin Splitter", "Whirlwind Slows every front-row enemy for 2 turns."],
          b1: ["Cruel Spin", "Whirlwind +4% power per rank against Slowed enemies."],
          b2: ["Carrion Spin", "Whirlwind lifesteal +10% against enemies carrying any status."],
          c1: ["Shattering Spin", "Whirlwind consumes Slow on each enemy hit for +35% damage on them."],
          c2: ["Splitting Spin", "Whirlwind consumes Sundered on each enemy hit for +50% and 5 Rage each."],
          v: ["Millstone", "Whirlwind Slows every enemy hit; enemies already Slowed take +25% and are Wounded."],
        },
      },
      { // 3 Charge: Sundered (zırh kırma) ve Stun sahibi
        n: {
          a1: ["Bruising Impact", "After Charge's Stun ends, the target is Slowed for 1 turn per rank."],
          a2: ["Sundering Ram", "Charge Sunders the target: it takes +15% damage for 3 turns.", 1],
          b1: ["Hammered Down", "Sundered from your skills adds +3% more damage taken per rank."],
          b2: ["Dazing Blow", "Charge Stuns for 2 turns if the target was already Slowed."],
          c1: ["Shatter the Guard", "Charge consumes Sundered for +70% damage and Stuns the enemies beside the target."],
          c2: ["Ringing Helm", "Charge on a Stunned enemy consumes the Stun for double damage, then Stuns again."],
          v: ["Siege Ram", "Charge's statuses last 1 turn longer, and it costs no MP against a Sundered target."],
        },
      },
      { // 4 Headsman's Blow: doğal tüketici
        n: {
          a1: ["Bloody Notch", "If the target survives Headsman's Blow, it is Wounded for 1 turn per rank."],
          a2: ["Ruinous Cleave", "If the target survives Headsman's Blow, it is Sundered for 2 turns.", 1],
          b1: ["Weighed Sentence", "Headsman's Blow +4% power per rank for each different status on the target."],
          b2: ["Cruel Patience", "Headsman's Blow needs 10 less Rage against a Stunned target."],
          c1: ["Final Mark", "Headsman's Blow consumes every status on the target: +25% power per status."],
          c2: ["Severing Stroke", "Headsman's Blow consumes Wound; a kill then heals 25% of max HP and keeps 20 Rage."],
          v: ["Tally of Sins", "Headsman's Blow counts each status on the target as 10 extra Rage spent."],
        },
      },
    ],
  },
  h: {
    mastery: "Sigil Mastery",
    bar: [
      ["Ink and Ash", "Wither and Jinxed you apply last 1 turn longer."],
      ["Thrice-Cursed", "Enemies carrying Omen, Wither and Jinxed at once take +12% damage from you."],
      ["Rot Feeds Fate", "Each Wither tick on an enemy with Omens resets its Omen timer."],
      ["Spent Curses", "Each time you consume a curse, regain 4 MP."],
      ["Sealed Fate", "Enemies carrying 2 Omens cannot land critical hits."],
    ],
    rows: [
      { // 0 Ill Omen: ölünce geçen şey Omen'le sınırlı kalmaz
        n: {
          a1: ["Rot-Touched", "Enemies that receive passed Omens also Wither for 1 turn per rank."],
          a2: ["Ill Inheritance", "When a Jinxed enemy dies, the enemy that gets its Omens is Jinxed too."],
          b1: ["Rot and Ruin", "Doom on a Withering enemy +5% per rank."],
          b2: ["Hagstone", "Jinxed enemies count 1 more Omen for Misfortune and Doom damage."],
          c1: ["Corpse-Rot", "A dying enemy's Wither is consumed: the nearest enemy takes all its remaining ticks."],
          c2: ["Black Wake", "A dying enemy's Jinxed is consumed: every enemy beside it gains 1 Omen."],
          v: ["Grave Sigil", "When a cursed enemy dies, its Omens, Wither and Jinxed all pass on together."],
        },
      },
      { // 1 Evil Eye: Wither'ı uzatır, kritikte Jinx; Wither ya da Jinxed tüketir
        n: {
          a1: ["Lingering Eye", "Evil Eye extends the target's Wither by 1 turn per rank."],
          a2: ["Evil Glint", "Evil Eye's critical hits Jinx the target for 1 turn."],
          b1: ["Sour Stare", "Evil Eye +3% power per rank for each curse on the target (Omen, Wither, Jinxed)."],
          b2: ["Eye of Ill Luck", "Evil Eye cannot miss a Jinxed target and has +15% crit chance against it."],
          c1: ["Reaping Glare", "Evil Eye consumes Wither: all its remaining ticks hit at once, +50%."],
          c2: ["Broken Luck", "Evil Eye consumes Jinxed for a guaranteed critical hit (2 Omens)."],
          v: ["Branding Eye", "Evil Eye adds a curse the target lacks: first Wither, then Jinxed, then an extra Omen."],
        },
      },
      { // 2 Withering Curse
        n: {
          a1: ["Deep Roots", "Wither from Withering Curse lasts +1 turn per rank."],
          a2: ["Mouldy Thread", "Withering Curse Jinxes the enemy on the chosen cell for 1 turn."],
          b1: ["Thick Rot", "Wither ticks +5% per rank on enemies carrying an Omen."],
          b2: ["Black Fever", "Withering enemies also receive 25% less healing (as Wound)."],
          c1: ["Harvest of Rot", "Withering Curse consumes old Wither on each enemy hit: +100% initial damage on them."],
          c2: ["Curdled Fate", "Withering Curse consumes Jinxed: each Jinxed enemy hit gains 2 Omens."],
          v: ["Plague Pit", "Wither now stacks up to 3 times on one enemy, each stack ticking on its own.", 1],
        },
      },
      { // 3 Jinx
        n: {
          a1: ["Twice-Knotted", "Jinx also Withers the target for 1 turn per rank."],
          a2: ["Lingering Hex", "Jinxed no longer ends after one attack; it lasts its full 2 turns."],
          b1: ["Tightening Knot", "Jinxed lowers accuracy by 3% more per rank."],
          b2: ["Crooked Fortune", "A Jinxed enemy that misses gains 1 Omen."],
          c1: ["Cut the Thread", "Jinx on a Jinxed enemy consumes it and Stuns the target for 1 turn."],
          c2: ["Unravel Fate", "Jinx consumes Wither: its remaining ticks hit at once and add 1 Omen per 2 ticks left."],
          v: ["Witch's Knot", "Jinx applies all three curses at once: Jinxed, 3 turns of Wither and 1 extra Omen."],
        },
      },
      { // 4 Doom Mark
        n: {
          a1: ["Inked Verdict", "Doom Mark Withers the target for 1 turn per rank."],
          a2: ["Sealing Mark", "If the target survives Doom Mark, it is Jinxed for 2 turns."],
          b1: ["Heavy Sigil", "Doom Mark's Doom +3% per rank for each curse on the target."],
          b2: ["Ripened Curse", "Doom Mark deals +20% against a Withering target."],
          c1: ["Total Doom", "Doom Mark also consumes Wither and Jinxed: +30% Doom for each one consumed."],
          c2: ["Bitter Harvest", "Doom Mark consumes Jinxed to detonate twice; the second blast is 50%."],
          v: ["Last Seal", "If the target survives, Doom Mark leaves 1 Omen for each curse it consumed."],
        },
      },
    ],
  },
};
