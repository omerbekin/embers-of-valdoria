/* OMER'IN SATIR SECIMLERI (karma A/B), 2026-10-22. Omer class class yaziyor, ana oturum ekliyor.
   rows: [pasif, aktif 1, aktif 2, aktif 3, ult] -> 'a' = Karma A, 'b' = Karma B (mix/<cls>.js), 'c'/'d'/'e' = o satir icin yeni oneri (alts.js).
   try: { satir: ['c','d','e'] } = Omer o satirin onerisini henuz secmedi; sayfada her oneri ayri Seçim sekmesi.
   Mastery adi + bar bonuslari pasif satirinin karmasindan gelir. */
window.SMM_FINAL = {
  warrior: { rows: ['b', 'b', 'a', 'a', 'b'], at: '2026-10-22' }, // Berserker, Double Strike, ult = B; Whirlwind, Charge = A
  defender: { rows: ['a', 'a', 'a', 'a', 'b'], at: '2026-10-22' }, // Bulwark, Tremor Slam, Taunt, Close Ranks = A; ult = B
  paladin: { rows: ['a', 'a', 'b', 'a', 'a'], at: '2026-10-22' }, // Divine Light, Holy Strike, Judgment, ult = A; Resurrection = B
  archer: { rows: ['a', 'a', 'c', 'a', 'b'], try: { 2: ['c', 'd', 'e'] }, at: '2026-10-22' } // Sharpshooter, Quick Shot, Arrow Rain = A; ult = B; Piercing Arrow: yeni oneri C/D/E (alts.js), Omer sececek
};
