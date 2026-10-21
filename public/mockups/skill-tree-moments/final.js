/* OMER'IN SATIR SECIMLERI (karma A/B), 2026-10-22. Omer class class yaziyor, ana oturum ekliyor.
   rows: [pasif, aktif 1, aktif 2, aktif 3, ult] -> 'a' = Karma A, 'b' = Karma B (mix/<cls>.js), 'c'/'d'/'e' = o satir icin yeni oneri (alts.js).
   try: { satir: ['c','d','e'] } = Omer o satirin onerisini henuz secmedi; sayfada her oneri ayri Seçim sekmesi.
   Mastery adi + bar bonuslari pasif satirinin karmasindan gelir. */
window.SMM_FINAL = {
  warrior: { rows: ['b', 'b', 'a', 'a', 'b'], at: '2026-10-22' }, // Berserker, Double Strike, ult = B; Whirlwind, Charge = A
  defender: { rows: ['a', 'a', 'a', 'a', 'b'], at: '2026-10-22' }, // Bulwark, Tremor Slam, Taunt, Close Ranks = A; ult = B
  paladin: { rows: ['a', 'a', 'b', 'a', 'a'], at: '2026-10-22' }, // Divine Light, Holy Strike, Judgment, ult = A; Resurrection = B
  archer: { rows: ['a', 'a', 'd', 'a', 'b'], at: '2026-10-22' }, // Sharpshooter, Quick Shot, Arrow Rain = A; ult = B; Piercing Arrow = oneri D (Bodkin Point, alts.js)
  cutthroat: { rows: ['b', 'b', 'b', 'a', 'b'], at: '2026-10-22' }, // Opportunist, Venom Edge, Saltire Cut, ult = B; Smoke Bomb = A
  mage: { rows: ['b', 'b', 'a', 'a', 'a'], at: '2026-10-22' }, // Spell Echo, Fire Bolt = B; Blizzard, Mana Barrier, ult = A
  druid: { rows: ['b', 'b', 'b', 'b', 'a'], at: '2026-10-22' }, // Nature's Grudge, Thorn Whip, Nature's Wrath, Rejuvenate = B; ult = A
  undead: { rows: ['a', 'a', 'a', 'a', 'b'], at: '2026-10-22' }, // Vampiric Bite, Bone Throw, Wail of the Dead, Dark Bond = A; ult = B
  hexer: { rows: ['a', 'a', 'b', 'b', 'b'], at: '2026-10-22' }, // Ill Omen, Evil Eye = A; Withering Curse, Jinx, ult = B
  antimage: { rows: ['b', 'b', 'a', 'b', 'b'], at: '2026-10-22' }, // Mana Overflow, Mana Steal, Spell Ward, ult = B; Drain Field = A
  gambler: { rows: ['a', 'a', 'b', 'b', 'a'], at: '2026-10-22' } // Double or Nothing, Loaded Dice, ult = A; High Stakes, Card Trick = B
};
