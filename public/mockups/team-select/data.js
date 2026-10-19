/* Oyun verisinden uretildi (data/classes, data/skills): Quick Battle taslagi icin. */
window.TS_CLASSES = [
 {
  "id": "warrior",
  "name": "Warrior",
  "role": "Melee Bruiser",
  "primary": "str",
  "attrs": {
   "str": 26,
   "int": 12,
   "dex": 8,
   "luck": 14
  },
  "range": 1,
  "resource": "rage",
  "blurb": "Frontline bruiser who turns pain into Rage and hits hardest at death's door.",
  "passive": {
   "name": "Berserker",
   "icon": "rage",
   "text": "The lower your HP, the harder you hit: up to +80% damage at the brink of death. Losing HP also gives Rage."
  },
  "skills": [
   {
    "name": "Double Strike",
    "icon": "sword",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Whirlwind",
    "icon": "whirlwind",
    "res": "mp",
    "amt": 8,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Charge",
    "icon": "charge",
    "res": "mp",
    "amt": 10,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Headsman's Blow",
    "icon": "warcry",
    "res": "rage",
    "amt": 30,
    "cd": 5,
    "icd": 1
   }
  ]
 },
 {
  "id": "defender",
  "name": "Defender",
  "role": "Tank",
  "primary": "str",
  "attrs": {
   "str": 24,
   "int": 24,
   "dex": 6,
   "luck": 6
  },
  "hp": 140,
  "range": 1,
  "resource": "mp",
  "blurb": "Iron-clad tank who taunts foes and hardens the armor of allies at his side.",
  "passive": {
   "name": "Bulwark Aura",
   "icon": "aura",
   "text": "You and the allies right next to you (front, back, left, right) gain bonus armor equal to 40% of your own armor."
  },
  "skills": [
   {
    "name": "Tremor Slam",
    "icon": "tremor2",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Taunt",
    "icon": "taunt2",
    "res": "mp",
    "amt": 8,
    "cd": 4,
    "icd": 0
   },
   {
    "name": "Guard",
    "icon": "guard2",
    "res": "mp",
    "amt": 2,
    "cd": 4,
    "icd": 0
   },
   {
    "name": "Fist Crush",
    "icon": "fistcrush2",
    "res": "mp",
    "amt": 14,
    "cd": 4,
    "icd": 3
   }
  ]
 },
 {
  "id": "archer",
  "name": "Archer",
  "role": "Marksman",
  "primary": "dex",
  "attrs": {
   "str": 13,
   "int": 13,
   "dex": 26,
   "luck": 8
  },
  "range": 6,
  "resource": "mp",
  "blurb": "Patient marksman whose arrows strike harder the farther the target stands.",
  "passive": {
   "name": "Sharpshooter",
   "icon": "sharp",
   "text": ""
  },
  "skills": [
   {
    "name": "Quick Shot",
    "icon": "arrow",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Piercing Arrow",
    "icon": "pierce",
    "res": "mp",
    "amt": 3,
    "cd": 2,
    "icd": 0
   },
   {
    "name": "Arrow Rain",
    "icon": "arrows",
    "res": "mp",
    "amt": 16,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Aimed Shot",
    "icon": "aimedshot",
    "res": "mp",
    "amt": 10,
    "cd": 3,
    "icd": 3
   }
  ]
 },
 {
  "id": "cutthroat",
  "name": "Cutthroat",
  "role": "Assassin",
  "primary": "dex",
  "attrs": {
   "str": 17,
   "int": 11,
   "dex": 26,
   "luck": 6
  },
  "range": 1,
  "resource": "mp",
  "blurb": "Cunning assassin who poisons, blinds and stabs weakened foes in the back.",
  "passive": {
   "name": "Opportunist",
   "icon": "opportunist",
   "text": ""
  },
  "skills": [
   {
    "name": "Venom Edge",
    "icon": "venomedge",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Saltire Cut",
    "icon": "saltire",
    "res": "mp",
    "amt": 7,
    "cd": 2,
    "icd": 0
   },
   {
    "name": "Smoke Bomb",
    "icon": "smokebomb",
    "res": "mp",
    "amt": 8,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Backstab",
    "icon": "backstab",
    "res": "mp",
    "amt": 12,
    "cd": 4,
    "icd": 3
   }
  ]
 },
 {
  "id": "antimage",
  "name": "Anti-Mage",
  "role": "Mana Hunter",
  "primary": "int",
  "attrs": {
   "str": 8,
   "int": 26,
   "dex": 12,
   "luck": 14
  },
  "range": 4,
  "resource": "mp",
  "blurb": "Mana hunter who burns enemy spellpower and turns blocked magic into team mana.",
  "passive": {
   "name": "Mana Overflow",
   "icon": "overflow",
   "text": "Magic damage blocked by your magic armor builds up; every 30 blocked, your whole team gains 5 MP."
  },
  "skills": [
   {
    "name": "Mana Steal",
    "icon": "manaburn",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Drain Field",
    "icon": "drainfield",
    "res": "mp",
    "amt": 6,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Spell Ward",
    "icon": "spellward",
    "res": "mp",
    "amt": 10,
    "cd": 4,
    "icd": 0
   },
   {
    "name": "Void Strike",
    "icon": "voidstrike",
    "res": "mp",
    "amt": 17,
    "cd": 3,
    "icd": 3
   }
  ]
 },
 {
  "id": "druid",
  "name": "Druid",
  "role": "Nature Summoner",
  "primary": "int",
  "attrs": {
   "str": 22,
   "int": 26,
   "dex": 10,
   "luck": 2
  },
  "range": 5,
  "resource": "mp",
  "blurb": "Nature summoner who calls treants to the field and heals allies as they rise.",
  "passive": {
   "name": "Verdant Blessing",
   "icon": "leaves",
   "text": "Whenever you summon, all allies are healed."
  },
  "skills": [
   {
    "name": "Thorn Whip",
    "icon": "thornwhip",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Nature's Wrath",
    "icon": "roots",
    "res": "mp",
    "amt": 15,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Rejuvenate",
    "icon": "rejuvenate",
    "res": "mp",
    "amt": 10,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Summon Treant",
    "icon": "treant",
    "res": "mp",
    "amt": 16,
    "cd": 5,
    "icd": 1
   }
  ]
 },
 {
  "id": "mage",
  "name": "Mage",
  "role": "Elemental Mage",
  "primary": "int",
  "attrs": {
   "str": 20,
   "int": 26,
   "dex": 6,
   "luck": 8
  },
  "range": 6,
  "resource": "mp",
  "blurb": "Elemental caster who rains fire and frost on enemy ranks from afar.",
  "passive": {
   "name": "Spell Echo",
   "icon": "echo",
   "text": "Damaging spells with a cooldown have a 25% chance to be ready again immediately."
  },
  "skills": [
   {
    "name": "Fire Bolt",
    "icon": "fireball",
    "res": "mp",
    "amt": 4,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Blizzard",
    "icon": "blizzard",
    "res": "mp",
    "amt": 14,
    "cd": 2,
    "icd": 0
   },
   {
    "name": "Mana Barrier",
    "icon": "manabarrier",
    "res": "mp",
    "amt": 8,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Meteor",
    "icon": "meteor",
    "res": "mp",
    "amt": 20,
    "cd": 3,
    "icd": 2
   }
  ]
 },
 {
  "id": "paladin",
  "name": "Paladin",
  "role": "Holy Healer",
  "primary": "int",
  "attrs": {
   "str": 24,
   "int": 26,
   "dex": 4,
   "luck": 6
  },
  "range": 4,
  "resource": "mp",
  "blurb": "Holy knight who mends the most wounded each turn and raises the fallen.",
  "passive": {
   "name": "Divine Light",
   "icon": "divine",
   "text": "At the start of your turn, heal the most wounded ally."
  },
  "skills": [
   {
    "name": "Holy Strike",
    "icon": "judgehammer",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Resurrection",
    "icon": "ankh",
    "res": "mp",
    "amt": 16,
    "cd": 5,
    "icd": 0
   },
   {
    "name": "Judgment",
    "icon": "judgebeam",
    "res": "mp",
    "amt": 14,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Radiance",
    "icon": "radiance",
    "res": "mp",
    "amt": 20,
    "cd": 4,
    "icd": 2
   }
  ]
 },
 {
  "id": "undead",
  "name": "Undead",
  "role": "Dark Mage",
  "primary": "int",
  "attrs": {
   "str": 26,
   "int": 26,
   "dex": 4,
   "luck": 4
  },
  "range": 5,
  "resource": "mp",
  "blurb": "Dark mage who drains life, shares it through a dark bond and raises the dead.",
  "passive": {
   "name": "Vampiric Bite",
   "icon": "soul",
   "text": ""
  },
  "skills": [
   {
    "name": "Bone Throw",
    "icon": "bonethrow",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Wail of the Dead",
    "icon": "wail",
    "res": "hp",
    "amt": 0,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Dark Bond",
    "icon": "darkbond",
    "res": "mp",
    "amt": 0,
    "cd": 2,
    "icd": 0
   },
   {
    "name": "Raise Dead",
    "icon": "raise",
    "res": "mp",
    "amt": 8,
    "cd": 5,
    "icd": 1
   }
  ]
 },
 {
  "id": "gambler",
  "name": "Gambler",
  "role": "Risk Taker",
  "primary": "luck",
  "attrs": {
   "str": 16,
   "int": 6,
   "dex": 14,
   "luck": 24
  },
  "range": 5,
  "resource": "mp",
  "blurb": "Reckless risk taker who wagers HP and mana on fate for huge hits.",
  "passive": {
   "name": "Double or Nothing",
   "icon": "doubleornothing",
   "text": "Damaging skills with a cooldown have a 25% chance to be ready again immediately."
  },
  "skills": [
   {
    "name": "Loaded Dice",
    "icon": "loadeddice",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "High Stakes",
    "icon": "highstakes",
    "res": "mp",
    "amt": 4,
    "cd": 2,
    "icd": 0
   },
   {
    "name": "Card Trick",
    "icon": "cardtrick",
    "res": "mp",
    "amt": 9,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "All In",
    "icon": "allin",
    "res": "mp",
    "amt": 8,
    "cd": 3,
    "icd": 3
   }
  ]
 },
 {
  "id": "hexer",
  "name": "Hexer",
  "role": "Curse Caster",
  "primary": "luck",
  "attrs": {
   "str": 18,
   "int": 10,
   "dex": 6,
   "luck": 26
  },
  "range": 5,
  "resource": "mp",
  "blurb": "Curse caster who piles Omens on foes and passes them on when a victim falls.",
  "passive": {
   "name": "Ill Omen",
   "icon": "soul",
   "text": "When a cursed enemy dies, its Omens pass to the nearest enemy (at most 2). If Doom or Doom Mark kills it, nothing passes on. Passed Omens never trigger Doom."
  },
  "skills": [
   {
    "name": "Evil Eye",
    "icon": "eye",
    "res": "mp",
    "amt": 0,
    "cd": 0,
    "icd": 0
   },
   {
    "name": "Withering Curse",
    "icon": "drainfield",
    "res": "mp",
    "amt": 14,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Jinx",
    "icon": "clover",
    "res": "mp",
    "amt": 2,
    "cd": 3,
    "icd": 0
   },
   {
    "name": "Doom Mark",
    "icon": "voidstrike",
    "res": "mp",
    "amt": 14,
    "cd": 4,
    "icd": 3
   }
  ]
 }
];
