> Ne için: docs/design/tutorial.md belgesinden 2026-11-08'de taşınan bitmiş iş bölümleri (gereken sanat, ders sırası ölçümü); güncel değil.

## Gereken sanat
- Mentor portresi (Garrick, yaşlı sınır komutanı; 256x256, diğer avatarlarla aynı stil): `assets/avatars/mentor.png`, sonra `data/tutorial.json > mentor.avatar = "mentor"`. Hazır (2026-10-14): asıl `assets/source/mentor/garrick.png`, yana bakan sürüm (öne bakan ilk deneme reddedildi).
- (İsteğe bağlı) Codex > Lessons ikonu: şimdilik piksel `book`.

## Tutorial sırası ölçümü
Karar uygulandı: Mill Road 1. karar = The Turn Bar, Attacking, **Hit Chance**, Choosing a Target (kart saldırı düğmesine basılınca, "Got it"e kadar vuruş kilitli). Ölçüm günlüğü (v0.9.10.6, 2026-10-31) arşivde: `docs/archive/design/tutorial-order.md`. Kod `src/game/battle-tutorial.ts > nextStep`.


