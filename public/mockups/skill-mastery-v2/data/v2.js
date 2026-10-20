/* V2 Bonds (Baglar): skill'ler birbirini besler. Satirlar kisa; asil guc satirlar arasindaki kopru dugumlerinde.
   Bar bonuslari "farkli skill'leri sirayla kullanma" temali. Sayilar PROVIZYON. 3. eleman 1 = [NEW]. */
(window.SMV_DATA = window.SMV_DATA || {})[2] = {
  w: {
    mastery: "Battle-Weave Mastery",
    bar: [
      ["Shifting Grip", "Using a different skill than last turn grants 3 Rage."],
      ["Varied Blows", "A skill used right after a different one deals +5% damage."],
      ["Full Repertoire", "Once you have used all four skills in a battle, gain 20 Rage."],
      ["Ebbing Tide", "Using a different skill than last turn lowers Headsman's Blow's cooldown by 1."],
      ["Master of Arms", "A skill used right after a different one costs 2 less MP."],
    ],
    rows: [
      { n: {
          a: ["Wounded Pride", "While below 50% HP, your skills +2% power per rank."],
          e: ["Kindled by Pain", "Losing 10% or more of your max HP in one hit gives your next skill +10% power."],
          m: ["Thrill of Slaughter", "Each kill grants 10 Rage and heals you for 5% of max HP."],
          v: ["Storm of Steel", "While below 50% HP, each skill you use lowers your other cooldowns by 1."],
        } },
      { n: {
          a: ["Twin Bite", "Double Strike +3% power per rank."],
          e: ["Hock Cut", "Double Strike's second hit Slows the target for 1 turn."],
          m: ["Relentless Hacking", "Against a Slowed target, Double Strike adds a third hit at 40%."],
          v: ["Opening Gambit", "Double Strike lowers the cooldowns of Whirlwind and Charge by 1."],
        } },
      { n: {
          a: ["Spinning Weight", "Whirlwind +3% power per rank."],
          e: ["Bloodspray", "Whirlwind Wounds every enemy it hits (healing -25%) for 2 turns."],
          m: ["Second Revolution", "Each enemy hit by Whirlwind has a 35% chance to be struck a second time."],
          v: ["Blade Tempest", "Whirlwind leaves whirling blades on the ground: 20% STR to enemies there for 2 turns."],
        } },
      { n: {
          a: ["Gathering Speed", "Charge +3% power per rank."],
          e: ["Scattering Rush", "Charge Slows the enemies beside the target for 1 turn."],
          m: ["Breakneck", "Charge cooldown 3 → 2."],
          v: ["Bull's Rush", "Charge leaves the target Overextended (+25% damage taken) until its next turn."],
        } },
      { n: {
          a: ["Leaden Axe", "Headsman's Blow +2% power per rank."],
          e: ["Short Wait", "Headsman's Blow cooldown 5 → 4."],
          m: ["Grisly Display", "A Headsman's Blow kill Stuns the enemies next to the victim for 1 turn."],
          v: ["Executioner's Song", "Headsman's Blow +15% power for each different skill used since its last use.", 1],
        } },
    ],
    bridges: {
      b01: ["Blood on the Axe", "While below 50% HP, Double Strike grants +2 Rage per hit and 5% lifesteal."],
      b12: ["Opening Cuts", "After Double Strike, your next Whirlwind costs no MP."],
      b23: ["Spin and Dive", "Whirlwind lowers Charge's cooldown by 1, and Charge lowers Whirlwind's by 1."],
      b34: ["Kneel for the Axe", "Headsman's Blow deals +25% damage to a Stunned target."],
      b13: ["Fall on the Fallen", "Double Strike strikes four times against a target Stunned by Charge."],
      b24: ["Harvest of Heads", "Each enemy Whirlwind hits grants 4 Rage; a Headsman's Blow kill resets Whirlwind."],
    },
  },
  h: {
    mastery: "Woven Hex Mastery",
    bar: [
      ["Changing Chant", "Using a different skill than last turn restores 2 MP."],
      ["Litany of Ills", "A skill used right after a different one has +5% critical chance."],
      ["Full Grimoire", "Once you have used all four skills in a battle, your next Doom Mark costs no MP."],
      ["Turning Wheel", "Using a different skill than last turn lowers Doom Mark's cooldown by 1."],
      ["Witch's Round", "A curse used right after a different one makes the target's Omens last 1 turn longer."],
    ],
    rows: [
      { n: {
          a: ["Grave Murmur", "Your skills deal +1% damage per Omen on the target, per rank."],
          e: ["Uneasy Heirs", "Enemies receiving passed Omens are Jinxed for 1 turn."],
          m: ["Toll of Three", "Each time Doom triggers, you regain 6 MP."],
          v: ["Fortune's Wheel", "Whenever Omens pass on, all your cooldowns drop by 1."],
        } },
      { n: {
          a: ["Gimlet Eye", "Evil Eye +3% power per rank."],
          e: ["Following Stare", "Evil Eye deals +20% damage to a Withered target."],
          m: ["Doubled Glance", "Evil Eye strikes again at 40% if the target has 2 Omens."],
          v: ["Gorgon's Eye", "Evil Eye Jinxes the target for 1 turn, and its critical hits apply 3 Omens."],
        } },
      { n: {
          a: ["Rotroot", "Withering Curse +3% power per rank (hit and Wither)."],
          e: ["Spoiled Well", "Withering Curse Slows the enemies it hits for 1 turn."],
          m: ["Cross of Ashes", "The area becomes a cross: the target cell and the 4 cells around it."],
          v: ["Blackrot", "Withered enemies take +20% damage from your other skills."],
        } },
      { n: {
          a: ["Bent Pin", "Jinx +3% power per rank."],
          e: ["Clinging Ill", "Jinx costs 2 → 0 MP."],
          m: ["Hexed Fate", "Jinxed enemies take +15% damage from Doom."],
          v: ["Turned Fate", "When a Jinxed enemy misses, you regain 6 MP and your next Evil Eye is a critical."],
        } },
      { n: {
          a: ["Grim Ink", "Doom Mark +3% power per rank."],
          e: ["Mark of Dread", "Doom Mark Jinxes the target for 1 turn."],
          m: ["Gathered Dread", "Doom Mark's burst +10% for each other curse on the target (Wither, Jinxed)."],
          v: ["Reckoning", "Doom Mark consumes the target's Wither and deals all its remaining ticks at once.", 1],
        } },
    ],
    bridges: {
      b01: ["Mourner's Stare", "Evil Eye's next hit on a target that received passed Omens is a critical."],
      b12: ["Eye of Rot", "Evil Eye renews Wither on its target to full duration."],
      b23: ["Sickly Luck", "Jinx deals +25% damage to Withered targets."],
      b34: ["Crooked Verdict", "Doom Mark is always a critical against a Jinxed target."],
      b13: ["Witch's Pin", "Evil Eye on a Jinxed target applies 2 Omens and resets Jinx's cooldown."],
      b24: ["Funeral Rot", "Doom Mark's burst also hits adjacent Withered enemies for 50% of its Doom."],
    },
  },
};
