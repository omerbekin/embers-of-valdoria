/* OMER'IN SATIR SECIMLERI (karma A/B), 2026-10-22. Omer class class yaziyor, ana oturum ekliyor.
   rows: [pasif, aktif 1, aktif 2, aktif 3, ult] -> 'a' = Karma A, 'b' = Karma B (mix/<cls>.js).
   Mastery adi + bar bonuslari pasif satirinin karmasindan gelir. */
window.SMM_FINAL = {
  warrior: { rows: ['b', 'b', 'a', 'a', 'b'], at: '2026-10-22' }, // Berserker, Double Strike, ult = B; Whirlwind, Charge = A
  defender: { rows: ['a', 'a', 'a', 'a', 'b'], at: '2026-10-22' }, // Bulwark, Tremor Slam, Taunt, Close Ranks = A; ult = B
  paladin: { rows: ['a', 'a', 'b', 'a', 'a'], at: '2026-10-22' } // Divine Light, Holy Strike, Judgment, ult = A; Resurrection = B
};
