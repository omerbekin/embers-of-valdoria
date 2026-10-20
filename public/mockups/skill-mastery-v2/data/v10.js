// V10 Warband (Takım, pasif omurga): pasif satırı her zaman açık, skill satırlarının tier'ını pasife harcanan puan açar.
// Her skill satırında "kendin mi (es), takım mı (et)" seçimi (biri). m / f2 / v ortak. Mevcut takım mekanikleri:
// Guard, Taunt (allyDamageMult), Haste, Fortified, Shrouded, Blinded, şifa, MP verme (giveMana), Martyr's Vow. Sayılar PROVİZYON.
(window.SMV_DATA = window.SMV_DATA || {})[10] = {
  w: {
    mastery: "Warleader Mastery",
    bar: [
      ["Shoulder to Shoulder", "When you lose HP to an enemy skill, the allies beside you gain 2 MP."],
      ["Brothers in Arms", "When an ally falls, gain 20 Rage and Fortified for 1 turn."],
      ["Victor's Share", "Your kills heal every ally for 5% of their max HP."],
      ["Stand Firm", "Allies behind you in your lane take 10% less damage."],
      ["Last Stand Oath", "Once per battle, you take a lethal skill hit meant for an ally beside you."],
    ],
    rows: [
      { // 0 Berserker (pasif omurga)
        n: {
          p1: ["Shared Scars", "When an ally beside you loses HP, gain 1 Rage per rank."],
          p2: ["Iron Presence", "While you hold 30+ Rage, allies beside you take 10% less damage."],
          p3: ["Blooded Kin", "While you are below 50% HP, allies beside you deal +2% damage per rank."],
          p4: ["Warlord's Howl", "The first time you drop below 50% HP, every ally gains Haste for 2 turns and 6 MP."],
          pv: ["Blood Banner", "Allies gain half of your current Berserker bonus as extra damage.", 1],
        },
      },
      { // 1 Double Strike
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["Settling Scores", "Double Strike +6% power per rank against an enemy that hit an ally last turn."],
          es: ["Greedy Axe", "Double Strike grants 5 extra Rage when both hits land."],
          et: ["Marking Cut", "Double Strike marks the target: it takes +10% damage for 1 turn."],
          m: ["Relentless Pair", "If Double Strike kills, your next turn comes twice as fast."],
          f2: ["Drill Yard", "While an ally stands beside you, Double Strike grants +1 Rage per hit per rank."],
          v: ["Captain's Cut", "Double Strike gains a third hit; if it kills, every ally gains 3 MP."],
        },
      },
      { // 2 Whirlwind
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["Kin-Strength", "Whirlwind +3% power per rank for each living ally."],
          es: ["Gorging Spin", "Whirlwind lifesteal +15% while you are below 50% HP."],
          et: ["Sheltering Spin", "Whirlwind's lifesteal also heals the most wounded ally for half as much."],
          m: ["Hobbling Spin", "Whirlwind Slows every front-row enemy for 1 turn."],
          f2: ["Steady Footing", "Whirlwind costs 1 less MP per rank."],
          v: ["Rally Wheel", "Each enemy Whirlwind hits gives you 3 Rage and every ally 1 MP."],
        },
      },
      { // 3 Charge
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["Spurred", "Charge +5% power per rank against enemies in the back two rows."],
          es: ["Lone Rider", "Charge costs no MP if no ally stands in your row."],
          et: ["Clearing the Way", "After Charge, the ally behind you gains Haste for 2 turns."],
          m: ["Breach Point", "The Charged target takes +20% damage from everyone for 2 turns."],
          f2: ["Heavy Boots", "Charge's Stun has a 10% chance per rank to last 2 turns."],
          v: ["Spearhead", "After Charge, you Taunt for 1 turn and allies in your lane take 30% less damage."],
        },
      },
      { // 4 Headsman's Blow
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["For the Fallen", "Headsman's Blow +4% power per rank for each fallen ally."],
          es: ["Keep the Fire", "If Headsman's Blow kills, keep 15 Rage."],
          et: ["Bounty Shared", "If Headsman's Blow kills, every ally heals 8% of max HP."],
          m: ["Fear the Axe", "A kill with Headsman's Blow makes the other enemies deal 15% less damage for 2 turns.", 1],
          f2: ["Measured Fury", "Headsman's Blow needs 2 less Rage per rank (30 down to 24)."],
          v: ["Warlord's Verdict", "A kill with Headsman's Blow grants every ally Haste for 1 turn and 6 MP."],
        },
      },
    ],
  },
  h: {
    mastery: "Coven Mastery",
    bar: [
      ["Shared Omens", "Allies deal +5% damage to enemies carrying 2 or more Omens."],
      ["Coven Gift", "When Doom strikes, the ally with the lowest MP gains 3 MP."],
      ["Wise Woman's Salve", "Doom heals the ally with the lowest HP for 20% of its damage."],
      ["Black Mass", "When a cursed enemy dies, every ally heals 3% of max HP."],
      ["Crone's Bargain", "Allies gain +10% crit chance against Jinxed enemies."],
    ],
    rows: [
      { // 0 Ill Omen (pasif omurga)
        n: {
          p1: ["Coven Bond", "Allies deal +1% damage per rank for each Omen on their target."],
          p2: ["Omen Ward", "An enemy that hits you or an ally beside you gains 1 Omen, once per turn."],
          p3: ["Charm Bag", "When Omens pass on, the ally with the lowest MP gains 2 MP per rank."],
          p4: ["Veil of Crows", "When Doom kills, every ally gains Shrouded for 1 turn."],
          pv: ["Coven's Curse", "Allies' critical hits add 1 Omen to their target.", 1],
        },
      },
      { // 1 Evil Eye
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["Keen Stare", "Evil Eye +4% power per rank against an enemy an ally hit this round."],
          es: ["Drinking Gaze", "Evil Eye restores 2 MP when it crits."],
          et: ["Pointing Finger", "Allies gain +10% crit chance against Evil Eye's target for 1 turn."],
          m: ["Vengeful Eye", "Evil Eye applies 2 Omens to an enemy that hit an ally last turn."],
          f2: ["Grey Iris", "While an ally stands beside you, Evil Eye +3% crit chance per rank."],
          v: ["Watcher's Eye", "For 2 turns, Evil Eye's target gains 1 Omen whenever an ally hits it."],
        },
      },
      { // 2 Withering Curse
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["Grave Soil", "Withering Curse +3% power per rank for each living ally."],
          es: ["Leeching Rot", "Wither ticks heal you for 20% of their damage."],
          et: ["Mending Rot", "Wither ticks heal the most wounded ally for 15% of their damage."],
          m: ["Choking Haze", "Withering Curse Blinds the front-row enemies it hits for 1 turn."],
          f2: ["Thrifty Rot", "Withering Curse costs 1 less MP per rank."],
          v: ["Starving Ground", "Withering enemies get no healing; each Wither tick gives you and the lowest-MP ally 1 MP."],
        },
      },
      { // 3 Jinx
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["Avenging Knot", "Jinx +5% power per rank against an enemy that hit an ally last turn."],
          es: ["Lucky Charm", "When a Jinxed enemy misses you, regain 4 MP."],
          et: ["Luckless Foe", "When a Jinxed enemy misses an ally, that ally gains Shrouded for 1 turn."],
          m: ["Crippling Jinx", "Jinx also Slows the target for 2 turns."],
          f2: ["Hex Needle", "Jinx +6% power per rank against a target with 2 Omens."],
          v: ["Spite Knot", "When a Jinxed enemy misses an ally, it takes the damage it meant to deal.", 1],
        },
      },
      { // 4 Doom Mark
        lanes: { u: "Self", l: "Warband" },
        n: {
          f: ["Grave Mark", "Doom Mark +4% power per rank for each fallen ally."],
          es: ["Grave Wages", "If Doom Mark kills, regain 10 MP."],
          et: ["Funeral Feast", "Doom Mark's Doom gives every ally 2 MP per Omen consumed."],
          m: ["Open Grave", "If Doom Mark does not kill, the target takes +20% damage until its next turn."],
          f2: ["Black Verdict", "Doom Mark's Doom +4% per rank."],
          v: ["Rite of the Coven", "Doom Mark's Doom is +15% for each living ally."],
        },
      },
    ],
  },
};
