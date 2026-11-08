# Düşman silah etiketi
> **Ne için / Güncel mi (2026-11-08):** Düşman silah etiketi tasarımı. CANLI ama UYGULANMADI: `data/mobs/` içinde silah etiketi alanı yok, kod yok. Karar sahibi Combat Design; fikir günlüğü `future-ideas/combat.md`.

**Durum:** yalnız tasarım, kod yok (Ömer 2026-11-01, Koordinatör formu). Sahibi Combat Design; arayüz kısmı yapım zamanı UI-UX Design'a devredilir.

Fikir: düşman, kahraman silahlarındaki türe göre küçük bir özellik alır. Baltalı haydut ile hançerli haydut farklı hissettirir.

## Kararlar

| Konu | Karar |
|---|---|
| Kapsam | Bütün moblar. Silahsızlara karşılık yazılır: pençe, diş vb. |
| Etki | Yalnız örtük özellik. Can, güç ve hız silah türünden değişmez (hançerin hız özelliği hariç, örtük özelliği odur). |
| Tür listesi | Altısı da: kılıç, balta, gürz, çekiç, yay, hançer. |
| Görünüm | Düşman kartında normal pasif ("Axe: ignores 8% armor") + adının yanında silah rozeti. |

## Örtük özellikler

Kahramandaki değerler; düşmanda aynı sayıyla başlar, yapım zamanı ölçülür.

| Tür | Özellik |
|---|---|
| Kılıç | Kritik şansı |
| Balta | %8 zırh delme |
| Gürz | %6 daha fazla isabet |
| Çekiç | %15 şansla Daze (sırası geri itilir) |
| Yay | Kritik hasarı |
| Hançer | Hız |

## Silahsız moblar için karşılık (VARSAYIM, Ömer'e yapım öncesi sorulur)

Etiket adı kendi adıyla görünür, kural silahınkiyle aynıdır. Yeni kural yok.

| Karşılık | Kim | Kural |
|---|---|---|
| Pençe | kurt, ayı, yırtıcılar | Kılıç |
| Diş | sürüngen, yılan, ısıran canavarlar | Balta |
| Boynuz, kuyruk | iri canavarlar | Gürz |
| Taş yumruk | golem, dev | Çekiç |
| Tükürük, diken | uzaktan vuran canavarlar | Yay |
| Sinsi uzuv | küçük, hızlı canavarlar | Hançer |

## Yapım öncesi açık sorular

1. Hayalet ve büyücüler bu altı türden birini mi alır, yoksa kahramandaki Asa (Max MP) ve Tılsım (tur başına MP) da düşmana açılır mı? "Bütün moblar" seçildi, ama listede büyü silahı yok. Asa düşmanda mob mana dengesini (madde 466) değiştirir.
2. Boss ve adlı liderler: etiket onlara da yazılır mı, yoksa kendi pasifleri yeter mi?
3. Tür mobun kendi dosyasında mı, ailesinde mi durur?

## Yapım zamanı yapılacaklar

- **Denge:** kapsam bütün moblar olduğu için Harita 1-3 ve Endless dengesi kayar. Yapımdan sonra sefer ve Endless simi gerekir (önce sorulur). Çekiç Daze'i ve hançer hızı sıra düzenini en çok değiştiren iki etkidir, ilk onlara bakılır.
- **Yapay zekâ:** etiketler YZ değer hesabına ve testine girer (zırh delme, Daze, hız, kritik).
- **Arayüz (UI-UX Design):** rozet tasarımı, her tür + karşılık için yeni ikon, düşman kartı ve üç ekran boyutu. Mockup akışıyla Ömer seçer.
- **Metin:** pasif yazıları İngilizce ve hedef yazısındaki isabet/kritik yüzdeleriyle uyumlu.
- **Codex:** etiket tablosu.
