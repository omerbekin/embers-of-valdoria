# Mob skill animasyonu düzeltme listesi (Ömer, 2026-10-18)

Durum: NOT ALINDI, henüz uygulanmadı. Önce "ara kare" testi (aşağıda) yapılıyor; sonuca göre bu liste uygulanacak.
Kapsam: ChatGPT ile yapılmış düşman mob skill animasyonları (assets/mob-vfx, src/game/mob-vfx.ts, data/battle-layout.json > animation.mobVfx). Kodla çizilen kahraman efektleri bu listenin dışında.

## Genel
- Tüm skiller %7 yavaşlasın.
- Tüm skiller %15 küçülsün (bugünkü 0.8 ölçeğin üstüne mi, yerine mi: uygularken Ömer'e sor). İstisnalar aşağıda.
- Kodla yazılan skillerin aksine bu animasyonlarda kareler arasında boşluk kalıyor (akıcı değil) -> ara kare testi.

## Skill skill (Ömer'in sözleriyle)
- **Sanctuary:** animasyon biraz yukarı çıksın.
- **Chief's Cleaver:** animasyon konumu aşağı.
- **Burn the Ground:** küçülmesin.
- **Drakefire:** küçülmesin.
- **Dragon's Breath:** konumu az yukarı çıksın.
- **Kindle the Faith:** %10 büyüsün. Son animasyon karesi ya da kareleri yukarı çıkıyor, bu olmasın.
- **Toll Sweep:** animasyon konumu biraz yukarı çıksın.
- **Hold the Tower:** animasyon kareleri aynı yere oturmuyor; başta başladığı gibi bitsin. %15 büyüsün.
- **Bite:** sola kaysın, animasyon kesiliyor; ısırdığı yerin ortası karakterin ortası olsun (ss: Grey Wolf).
- **Rune Spark:** çok azcık sağa kaysın, karaktere tam değsin (ss: buz çarkı).
- **Glyph of Breaking:** skill artı şeklinde atıyor ama perspektiften animasyon tam oturmuyor.
- **Raven's Peck:** %5 küçülsün. (Ömer "ravens pack" yazdı.)
- **Murder of Crows:** konum olarak biraz yukarı atsın ve animasyonlar birbirinden çok dağılmasın (ss: mor kargalar).
- **Consecrate:** %5 büyüsün.
- **Scatter Quarry:** animasyonu hatalı; olduğu yerde uçup yere düşüyor gibi. Mevcut kareleri tekrar oluştur.
- **Oath of the Stone:** küçülmesin, hızlanmasın.
- **Shield Wall:** %10 büyüsün.
- **Hold the Gate:** %10 büyüsün; animasyonu önemli derecede sola kaysın (ss: mavi çizgiler).
- **Requiem:** animasyon konumu hafif yukarı çıksın, çok az (ss: mor hayaletler).
- **Unholy Benediction:** konumu yukarı çıksın, %10 büyüsün.
- **Gatestone Slam:** %10 yavaşlasın; animasyonu sona doğru yine yukarı çıkıyor, her karesi eşitlensin.
- **Rockfall:** %15 büyüsün, %15 yavaşlasın; son animasyon karelerinin konumu yanlış.
- **Cudgel:** animasyonu aşağı insin; küçülmesin, hızlanmasın; son karesi düzelsin.
- **Hamstring:** animasyonu aşağı insin; küçülmesin, hızlanmasın; son karesi düzelsin.
- **Peat Smoke:** Scatter Quarry ile aynı sorun.
- **Scorch Bite:** biraz sola; yavaşlamasın (ss: Ash Hound ateş ısırığı).
- **Run Down:** sanki kurdun izi (trail) olacakmış da sonra Scorch Bite'taki ısırma animasyonu gelecekmiş gibi; ayrıca bakılsın.
- **Feast:** biraz sola.
- **Wall of Pikes:** animasyon ışınlanıyor gibi duruyor; okçunun 2. skilli gibi yapılsın.

"Küçülmesin / hızlanmasın" = genel %15 küçültme ve %7 yavaşlatmanın o skille uygulanmaması (hızlanmasın: yavaşlatma ya da hız değişikliği yok, uygularken netleştir).

## Ara kare testi (Ömer: "3 tane rastgele karakter belirle ... chatgpt ile ara görsellerle fill et. bir de alternatif olarak kodla yazdır. sonra test ortamına 2sini de koyarak bana sun")
3 rastgele mob, her birinin skill animasyonu için iki yol karşılaştırılır: (A) ChatGPT ile üretilmiş ara kareler, (B) kodla üretilen ara kareler. Test sayfasında yan yana.
