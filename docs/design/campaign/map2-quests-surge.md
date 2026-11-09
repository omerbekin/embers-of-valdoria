# Harita 2: Personal Quests (A5) ve Crown Surge (C1) (özet)
> **Ne için / Güncel mi (2026-11-08):** Harita 2 sınıf görevleri ve Crown Surge'ün bugün geçerli özeti. UYGULANDI. Soru formu (Q-A1..Q-C12 seçenekleri, öneriler, Ömer'e soru listesi) arşivde: `docs/archive/design/campaign/map2-quests-surge.md`. Sayılar `data/campaign/quests.json` ve `crown-surge.json`'da.

## Personal Quests (A5)
- Görev, o sınıftan bir kahraman kadroda (yedek dahil) varken görünür: cep düğümü (`MapNode.quest`) ya da var olan olayın seçeneği (`EventChoice.quest`). Bitince kahramana unvan + seferlik bonus (`Hero.quests`); bonus sınıf pasifinin var olan bir sayısına eklenir (`passive.field += passive.add`). Kod `src/campaign/quests.ts`; test `tests/campaign-quests.test.ts`.
- Harita 2 görevleri (sayılar `quests.json`): Paladin dr56 (Brann's Bell), Undead dr90 (The Name Beneath the Water), Archer dr91 (The Gull Cliffs Shoot), Cutthroat dr92 (An Old Debt in Saltmere), Gambler dr93 (The Corsairs' Table). Hexer görevi Harita 3'e ayrıldı.
- Not: Skald ve Vesper (13 sınıflık havuza sonradan girdi) için kişisel görev tanımlı değil; kasıtlı mı Lead'e sorulacak.

## Crown Surge ve Ashen Taint (C1)
- Takım yeteneği, savaş HUD'ında taç plakası; kullanan kahramanın eylemi harcanır (`data/global-skills.json > ash_surge / salt_surge`, motor `battle.ts > callSurge`, kod `src/campaign/surge.ts`).
- Sırası gelen herhangi bir kahraman kullanır (çağrılar kullanamaz); kullanan Taint alır: seferdeki n. kullanım `firstGain + (n-1) x gainStep` yığın (üst sınır yok). Her yığın maks canı düşürür (`crown-surge.json > taint`).
- Hak BÖLGE başına bir (her tür için ayrı), kullanılmayan hak taşınmaz; bir savaşta yalnız bir Surge. Yenilgide hak harcanmaz; zafer ve devriyeden çekilme harcar.
- **Ash Surge** baştan; **Salt Surge** (takıma kalkan) Drowned Queen (dr82) ilk zaferinden açılır. Etki süresi 3 tur.
- **Chapel** (Harita 2: dr23 ve dr49): bedava Taint temizliği; ayrıca altınla Surge sayacı sıfırlanır (`crown-surge.json > reset.gold`, Harita 2'de 400 düz).
- Yalnız sefer, `crown-surge.json > maps` listesindeki haritalarda (Quick Battle / Endless / çevrimiçi yok). Codex: Mechanics > Campaign > Crown Surge and Ashen Taint.
