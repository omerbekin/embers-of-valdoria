# Lead açık iş listesi (alanlar arası)
> **Ne için / Güncel mi (2026-11-13):** Lead'in tek takip listesi: dal durumu, bekleyen formlar, Ömer'e sorulacaklar, alanlara dağılmış açık işlerin kısa dizini. Hafızadaki `lead-handoff` kaydından taşındı (2026-11-13); hafızada yalnız açılış adımları kaldı. Ayrıntı ve karar her zaman alan belgesindedir (`docs/arch/areas/<alan>.md`); burada yalnız tek satır + alan adı durur. Biten satır silinir.

## DEVİR (2026-11-23 gece, oturum c05f58e0 -> yeni Lead)
Ömer devri istedi: "sen alzheimera bağladın" (oturum çok uzadı, Lead bağlamı kaybetti). Bu bölüm tek güncel durumdur. Eski günlük: `docs/archive/lead-open-gunluk-2026-11-20-23.md` (aramada gizli, yol açıkça verilir).

### İlk okunacak
- **Bu dosyanın güncel hâli main'de DEĞİL:** dal `chat/lead-r35`, kopya `game/.claude/worktrees/chat-lead-r35`. main = 0.9.11.9 (ed84197a). Gönderim Ömer'in sözüyle.
- **Ömer'in bu oturumdaki şikâyetleri (tekrarlama):** soruları sohbete dağıtma, 2+ soru = form; kartlar sabit sade biçimde (hafıza `plain-card-format`); "açıkla" dediğinde önce konunun ne olduğunu hatırlat; sayı yığını yok.
- Form: tek kalıcı adres `https://claude.ai/artifact/6cxPLYpEVXqMNSnDVhfvEo`, db `picks/r41`, kaynak `eov-forms-archive/uiform-live/r41/round.json` (son ek `add51.cjs`), şu an 0 kart (v122). Yeni tur açarken r42'ye geç.

### Lead dalında, GÖNDERİLMEDİ (hepsi test:fast yeşilken birleşti; birleşik hâlde test:slow + build KOŞMADI)
- Harita 3 son kartına Endless düğmesi + kartın sahne kapanınca kapanması + Endless / Main Menu geçişinde açılış (yükleme) ekranı.
- Önizleme düzeltmeleri (Whirlwind, Saltire Cut, can koşulları, Tithe Collector) + YZ 16 ağaç tetiğini tartıyor (dengeye etkisi ölçülüyor, aşağıda).
- Denge: Mage / Defender ağacı -%5, Skald Thunder Drum sıra Haste, set bonusları + `setValue` 3 / 4,5, Road Hound büyüdü (Ömer: kalsın).
- Shepherd's Fold `fold_flock` iki dalga (Ömer: ölçülmeyecek, metin onaylı).
- Mage evrim animasyonları: Sunfire (düzeltildi), Eternal Winter, Glacier Crater. Sesleri kimse kulakla dinlemedi.
- Ashguard Vigil 3 parça Warrior satırı: Rage 2 kat + Berserker bonusu %25 canda tam (`fullAt`). Ölçüm sırada.
- Conclave of Embers Seçenek B BİRLEŞTİ (e0d15c31 + ff67fb0b): 2 parça +20 MP / +2,5 regen; 3 parça Druid %40, Undead %100, Vesper %17 (Mage aynı); 4 parça +15 MP, +1 regen, -10 HP, kural: taşıyana skill kullanan düşmanın altında 1 tur Burning Ground (INT %50), hücre zaten yanıyorsa Overextended (+%25 alınan hasar, 1 tur; var olan durum). ÖLÇÜLMEDİ; ölçüm için Ömer onayı ALINMADI. Ömer'e söylenmeyen ayrıntı: Mage'e yakın dövüşle vuran hep Overextended alır (Heat Mirage zemini önce bırakıyor). Açık: taşıyan tarafı YZ terimi yok; iki taşıyanda YZ bedeli çift sayıyor; `npm run codemap` yenilenmeli.
- Mirage Veil BİRLEŞTİ (abb136ff): pasif evrimliyse Mage'in etrafında turuncu-altın kenar parıltısı (genel kalıp `src/game/passive-evolve-fx.ts` + `data/passive-evolve-fx.json`, yalnız Mage dolu); `Combatant.evolved` pasif id'sini de tutuyor. Vuruş beyazlaması 0,45 > 0,25 (üç kademe). Kareler `ui-shots-mobil-masaustu/mage-evolves/mirage-veil/` (Lead baktı, temiz; gerçek savaşta ve 21:9'da bakılmadı). `tests/gear-autosave.test.ts` yük altında bir kez zaman aşımına düştü, tek başına geçiyor.
- Ekranda Lead'in baktığı: yalnız Endless düğmesi (3 boyut) ve agent kareleri. Yükleme ekranı birleşik hâlde, fold_flock, Ashguard ipucu ekranda DENENMEDİ.

### Form r42 cevapları (2026-11-24 01:45, Lead 0e7b1324; ham `eov-forms-archive/r42/picks/r42.json`)
- d_speed cevapsız, not: Archer/Hexer L0-L20 karşılaştır; yalnız bu ikisiyse skill flat hasar + DEX ölçeği çok ufak ayar. Lead varsayımı: 0,25 taban kalır.
- d_mobs evet, d_druid A (önce parça ölçümü), d_reckless A (önce YZ incelemesi; Ömer fikri: Charge sonrası 2 tur Fortified, öneri), d_big evet (gece), d_cuts KALSIN (geri alma yok), d_3a A (öneri, onaysız uygulanmaz).
- s_consim evet, s_over olur, s_ash B (önce incele). v_glow yumuşak (halka kalsın, parıltı yalnız tetikte, ~%80 az; Ömer "her karakterin pasifine uygun efekt" istedi, soru: Mage'e oldu mu). v_flash2 yeter. g_push BEKLE (denge bitsin).
- Ömer'in kuralı: aynı kahramanda pasif + set + ağaç birlikte değişiyor (Warrior, Mage, Druid); ölçümler aynı tabanda, rapor başlığında commit / spdPerDex / setsEnabled; metinler birbirini yalanlamasın.
- Lead kopyası `chat/lead-r35` kuyrukta 0e7b1324'e bağlandı (eski kayıt c05f58e0; yedek scratchpad'de).

### 2026-11-24 sabah durumu
- Gece agent'ları bitti (denge 5 saatlik limitte durdu, 08:50 devam edip bitirdi). Mirage Veil yumuşatma Lead dalına birleşti (69fc6c57). Denge dalı uç fe849961: Archer x1,05 / Hexer x0,96, mob hızları geri (eski - 0,9, en az 15); Druid parça + Conclave ölçüldü (değer değişmedi). Büyük ağaç ölçümü BAŞLAMADI (komut character-design.md r42).
- Denge dalında test:fast 8 kırmızı (hız değişikliğinden) + metin düzeltmeleri: engine-dev (sonnet) aynı dalda çalışıyor. balance-b Druid %43,9 kırmızı sürüyor.
- **Form r43 (v125, 10 kart, db picks/r43) yayında**, kaynak `eov-forms-archive/uiform-live/r43/add01.cjs`: w_reckless, w_herald, w_ash, d_druid2, d_3a2, d_archer, d_l20, d_mobrule, d_big2, s_con2. "Her durumda Lead yapar" dediklerim: YZ Rage/Fortified değeri, YZ + şifacı bekleyen kor, Conclave taşıyan YZ terimi.

### Form r43 cevapları (2026-11-24 13:53; ham `eov-forms-archive/r43/picks/r43.json`)
- w_reckless A (Stun geri + 30 Rage + 2 tur Fortified, hasar bonusu yok), w_herald kalsın, w_ash A (YZ koru görsün, ölç), d_druid2 A (Stun'ı simde kapatıp ayır), d_3a2 dördü de, d_archer +%5 daha, d_l20 incelensin, d_mobrule kalsın, d_big2 ŞİMDİ, s_con2 A (counterCost 0,8 > 0,4, ölç).
- Lead kararı: büyük ölçüm "şimdi" seçildi ama değerler değişmek üzere; eski değerle 4 saat ölçmek boşa. Sıra: YZ düzeltmeleri (agent/balance-r41-aksam) + değer/kural (agent/r43-values) birleşir, test:fast yeşil, sonra hemen büyük ölçüm + Druid ayrımı + Conclave counterCost ölçümü (tek ağır iş, sırayla).
- Çalışan: YZ düzeltmeleri (engine-dev opus, balance dalında), r43 değerleri (engine-dev opus, agent/r43-values), L20 incelemesi (balance-tester sonnet, salt okunur, `r43/l20-inceleme.md`).

### Açık işler süpürmesi (2026-11-24 gece, Ömer: "açıkta kalan her şeye bakalım")
- Çalışan ek agent'lar: eski dallar + arşiv açıkları denetimi (`r45/acik-denetim.md`), eski görsel kusurlar + ekranda denenmemişler (ui-dev, `agent/ui-fixes-r45`), Equip best Conclave (engine-dev, `agent/equip-best`), oyun içi İngilizce tam tarama (text-qa), 28 eski varsayım kart taslağı (`r45/add-varsayim.cjs`, yayınlanmadı).
- Sırada (denge agent'ı bitince, tek ağır sim): Ashguard YZ sonrası ölçüm, Stormhall / Odran / Almoner ilk ölçüm; YZ küçük eksikleri (Glacier Crater yan vuruş, Jinx-Woeful bekleme, buff/clear/free/mark/spread/detonate/doom tetikleri 0, Math.pow, golden ağaç tetikleri).
- Ömer gerekir: gönderim sözü, Mage evrimlerini oyunda görmek, telefonda Endless bekleme, iki cihazla çok oyunculu, sesleri kulakla dinlemek, Thunder Drum onayı.

### Form r44 cevapları (2026-11-24 20:53; ham `eov-forms-archive/r44/picks/r44.json`)
- l_skald A (sabit can kalkar), t_deal A (metin düzelsin), s_mage A (Conclave Mage 3 parça 0,533 > 0,70), s_two kalsın (iki ceza), d_def evet (incele).
- l_paladin cevapsız, not: "Başka öneri sun. Şifayı şimdi kısarsak tüm denge bozulacak." l_undead cevapsız, not: ileriki levelleri güçlendiren çözüm. d_druid3 B (Falling Oak Stun savaşta yalnız ilk Treant'ta; sonradan seçildi, uygulama agent'ına eklendi).
- Çalışan (gece): uygulama + ölçüm (balance-tester opus, balance dalı), Paladin/Undead/Defender öneri (balance-tester sonnet, salt okunur, `r44/oneri-paladin-undead-defender.md`).

### 2026-11-24 öğleden sonra
- YZ düzeltmeleri + r43 değerleri `agent/balance-r41-aksam` 70d03b7b'de birleşti, test:fast yeşil; test:slow yalnız balance-b Druid %42,7 kırmızı. Denge dalı hâlâ Lead dalına BİRLEŞMEDİ.
- Çalışan: ölçüm agent'ı (balance-tester sonnet): büyük ağaç ölçümü 70d03b7b'de (o kopyaya yazma yok), sonra `agent/r43-measure`'da Druid ayrımı + Conclave counterCost 0,8 > 0,4. Raporlar `r43/`.
- **Form r44 (v127, 5 kart, db picks/r44) yayında:** l_paladin, l_undead, l_skald (L20 incelemesi `r43/l20-inceleme.md`), t_deal (Double Deal ikinci durum), s_two (Conclave iki taşıyan iki ceza).
- Bilinen YZ yaklaşıklıkları (r43-values raporu): Glacier Crater yan vuruş değeri fazla, Jinx kurulumu Woeful Turn beklemesini bilmiyor, statusModePick Double Deal'i bilmiyor.

### Gece agent'ları (2026-11-24, bitti)
- Denge (balance-tester, opus) `agent/balance-r41-aksam`: TEK değer yazan. Sıra: Archer/Hexer ayar + ölçüm > mob hızları + sefer ölçümü > Druid parça ölçümü (setler kapalı) > Conclave sınıf sınıf > test:fast+slow > büyük ağaç ölçümü arka planda.
- Warrior incelemesi (engine-dev, opus) `agent/warrior-inspect`, salt okunur: Reckless YZ + Ashguard 4 parça + Fortified fikri + tooltip doğruluğu. Rapor `r42/warrior-inceleme.md`.
- 3a önerileri (content-designer, sonnet), salt okunur: `r42/oneri-3a.md`.
- Mirage Veil yumuşatma (ui-dev, sonnet) `agent/mirage-glow2` (taban chat/lead-r35).
- Metin çelişki taraması (text-qa, haiku): `r42/metin-celiski.md`.
- Raporlar `eov-forms-archive/uiform-live/r42/`.
### Ömer'den bekleyen
- **Form r42 (v124, 13 kart, db picks/r42) yayında, cevap bekliyor:** d_speed, d_mobs, d_druid, d_reckless, d_big, d_cuts, d_3a, s_consim, s_over, s_ash, v_glow, v_flash2, g_push. Kartlar `eov-forms-archive/uiform-live/r42/add01.cjs` + `add02.cjs`.
- **Denge dalı `agent/balance-r41-aksam` (uç 197ad758) BİLEREK BİRLEŞTİRİLMEDİ.** Agent bitti (2026-11-24). İçinde: spdPerDex 0,4>0,25, Druid x0,9, Reckless Heat yeni tasarım, 3a x0,8, lead birleşmesi. Sebep: `tests/balance-b.test.ts` kırmızı (Druid %43,4, seed 300001), tam test koşulmadı, sefer mob hızları bant dışı (14 mob), form g_push "hız/Druid/Reckless gönderime girmez" diyor. Cevaplara göre: d_cuts=undo ise 7b1167e0 ve 7f81d2d7 düşürülür; d_speed sonucuna göre hız yeniden ölçülür; sonra birleşir. Raporlar `eov-forms-archive/uiform-live/r41/`: dex-hiz, druid-tur5, yz-sonrasi, reckless-tur2, agac-3a, ashguard-tur2. Ashguard tam set -2,150 (Warrior 4 parça -4,296), hedef 0..+3 dışında.
- Çalışan agent YOK.
- Gönderim sözü ("GitHub'a at"). Mage evrimlerini oyunda görmek istiyor; görmeden diğer 12 sınıfın evrimleri BAŞLAMAZ.
- Conclave ölçüm onayı (yukarıda). Ashguard / 3a / Reckless / DEX sonuçları gelince band dışı kalanlar için karar.
- Telefonda Endless'e basınca gerçek bekleme süresi (agent ortamında kare hızı düşüktü; kök sebep cihazda ölçülmedi).
- Skald Thunder Drum yorumu (Skald'ın sırasındaki dostlara Haste) uygulandı; Ömer açıkça "evet" demedi.

### Bilinen açıklar (yapılmadı)
- YZ: buff, clear, free, mark, spread, detonate, doom eylemli tetikler hâlâ 0 değerinde; `ai.ts` Math.pow; golden ağaç tetiklerini sınamıyor; golden campaign testi 12,5 sn.
- Setler kapalı (`setsEnabled` false). Stormhall, Odran, Almoner hiç ölçülmedi. Equip best Conclave'i yanlış öneriyor.
- **1.0 öncesi SON iş: Endless düşmanları sefer moblarına (Ömer 2026-11-25: "campaigni bitirelim endlessı 1.0 öncesi son iş yapalım").** Bugün Endless normal dalgaları kahraman sınıflarından (`waves.ts > randomPool`), elit/boss eski sınıf kopyası karşılaşmalar (mob-plan 2026-10-16 "yeni moblar sonra Endless havuzuna girer" hiç yapılmadı). Düşman Undead bağı yüzünden Undead L20 41,7'de kaldı (S4, d3ff01d4; endless yeşil kıl payı). Mob geçişinden sonra Endless dengesi yeniden + Undead L20 48-52'ye yeniden ayar (d2 tipi değerler L20 51,5 vermişti; rapor `eov-forms-archive/uiform-live/r46/undead-flat.md`).
- 1.0 listesi: iki cihazla çok oyunculu test (Ömer gerek), onaysız eski varsayımlar formu (28 madde + 3 grup) hazırlanmadı, text-qa / ödünç içerik taraması kapanışı, skill ses genel bakışı (kükreme sesleri).
- Kulakla dinlenmedi: Redtithe ulti saplama sesleri (canlıda), Sunfire + 5 buz sesi.
- Eski kusurlar: Gambler zarları telefonda küçük, fişler kodla çizili, Redtithe üst üste binmeleri; Glacier Crater telefonda küçük; evrim karelerinde üst yazı taban skill adını gösteriyor (bakılmadı).
- **Doğrulanmadı:** arşivdeki 2026-11-20 devrinde ve 21-22 Kasım günlüğünde kalan açıklar (arka planlar, köşe süsü / üç nokta, First Fire, Vesper ağaç ikonları, birleşmemiş eski dallar) bu oturumda yeniden taranmadı. İlgili işe girmeden önce arşivden bak.

### Ortam
- Önizleme: preview_start adı `chat-lead-r35`, http://localhost:5174/ (ses kapatma kuralı CLAUDE.md'de). Debug > Campaign > "Finish Map 3 (Mend) → ending" son kartı açar.
- Test sınırı 60 sn (`vite.config.ts`). Gündüz tek ağır iş; gece paralel serbest (hafıza `night-parallel`).
- Agent worktree'lerinde `node_modules` junction: worktree silmeden önce junction'ı kaldır. Agent'lar dev sunucusunu açık bırakabiliyor (port 5187 örneği); bitince kontrol et.
- Birleşmemiş eski dallar çok (`git branch --no-merged chat/lead-r35`); çoğu 14-21 Kasım, durumları bilinmiyor.


## Dallar (2026-11-14 git ile doğrulandı, devir: oturum 6f68be03)
- **chat/bigform-picks** (`.claude/worktrees/chat-bigform-picks`, port 5175, uç 28f2846f): main'den 49 commit ileride, main'e gönderilmedi. İçinde son olarak: düğüm kartı (H2 düzeni, Lv dikey ortalı, elit H1 defne, boss tek kırmızı defne + glow yok) ve olay kartı (E1 + olayın kendi GENİŞ resmi şeridi doldurur + sol alt tür rozeti: görev = sınıf ikonu, hikâye = taç mührü; ayrıntı `areas/ui-ux.md`). Sahibi kuyrukta 869adf76 oturumu. "GitHub'a at" beklenir; öncesinde sürüm bump + patch-notes, tam `npm test` + build. 5000 (play-build) bu daldan derlendi: `npx vite build --outDir /c/Users/Omer/Projects/embers-of-valdoria/play-build --emptyOutDir`.
- **chat/combat-design** (port 5181, uç 33b62d36): main'den 6 ileride, 13 geride. İçeriği kontrol edilmedi; yalnız `areas/combat-design.md` (+39 satır) ve kod farkı var, gönderimden önce bak.
- **chat/lead-tune** (port 5182) ve **chat/ui-fixes-11** (port 5174): main'de, ileride commit yok. Kopyaları kapatılabilir (`wt-close`; node_modules bağlantısı önce silinir).
- **chat/respec-supply** (port 5177, uç 8f2181cc, oturum 6f68be03): main'den 4 ileride. Respec malzemeleri + story dialog (Continue sabit). Ömer onaylamadı (varsayım, open-questions'a yazılmalı/yazıldıysa bak): boss yalnız ilk zaferde düşürür; tüccar her yenilemede (Reroll dahil) atar; ölmüş kahraman sıfırlanabilir; kasaba yer hover bilgisi; kilitliyken lore yerine kilit notu. Göndermeden önce: tap-expand.ts'te kullanılmayan sahne `title` + ölü `.sbc-info/.sbc-chain` seçicileri temizle.
- **chat/docs-tidy** (port 5176): belge/araç düzeni (bu liste, `.ignore`, kuyruk metinleri). Yalnız docs/araç, `--internal`.
- Otomatik gönderim KAPALI (`hold on`). Harita 3 AÇIK (`mapFlags.hollow-crown.enabled`). Setler bayrak kapalı.
- Çalışan agent yok. Yeni agent sıfırdan açılır; eski agent kimliğine SendMessage atılmaz.

## Bekleyen formlar
- **UI Seçim Formu** (tek kalıcı form `https://claude.ai/artifact/6cxPLYpEVXqMNSnDVhfvEo`, db `picks/r<N>`, cevaplar önce `C:/Users/Omer/Projects/eov-forms-archive/r<N>`). Form kaynağı (derleyici + şablon + tur verisi): `C:/Users/Omer/Projects/eov-forms-archive/uiform-live/` (`node build.mjs template-r16.html r<N>/round.json <çıktı>`). **r17 seçildi (2026-11-14), arşivde**: ruh hali satırı kalktı; Divine Light 0,312 kalır; Skald saldırı kareleri kalır; tier konsept kalır; Skald ağacı + 6 öneri onaylı (agent/skald-hooks, gönderilmedi); respec: adlar/şans/fiyat/Reroll onaylı, her zaferde zar + elit boss şansının yarısı (Ömer notu), düşmüş kahraman sıfırlanamaz. Sıradaki: r18 = 10 arayüz önerisi.
- **Eski "büyük form" listesi kapandı (2026-11-14 doğrulandı):** Divine Light %35, Drained Dry, Blinded/Jinxed CC, Mana Steal, Burning+Poison, menzil-2 moblar, Skald/Vesper görevi, tutorial metinleri (Garrick's Charge dahil), 16 D sorusu, vision/classes onayı Ömer'in 2026-11-08 / 2026-11-09 cevaplarıyla kapalı (kararlar bigform-picks belgelerinde; docs-tidy kopyaları o dal gönderilince eskir). Kasabada ücretli dinlenme / Fountain: Ömer 2026-11-09 "Sonra sor".
- **Sorulmadı, bekliyor:** 28 onay bekleyen varsayım (332-520) + 2026-11-09 üç Q-NEW grubu (kan/lanetli zemin, boss/elit debuff, element formu); respec-supply'da kasaba hover bilgisi ve kilit notu varsayımları; eski haftalık listedeki dört soru (Ley Brand ipucu, Natural pace, Vesper epic level, Valor removal) hâlâ açık mı bakılmadı.
- **21 Kasım 2026:** 7-11 formları GitHub push sonrası silinecek; her silme Ömer onayıyla (`eov-forms-archive\classification.md`).

## Ömer'e sorulacak (form dışı, küçük)
- Yok. (`eov-maps` klasörü 2026-11-14'te zaten yoktu; `maps-2-3` dalı main'de.)

## Açık işler (alan: tek satır; ayrıntı alan belgesinde)
- **ui-ux:** Tur 11 gövde seçimi; onboarding (ilk 10 dk, "sonra" seçildi); telefonda Sheet "MAIN" yazısı HP çubuğuna yakın; telefonda skill ipucu tahtayı kapatıyor; hasar sayısı renkleri; imleç seçimi (XVJ5Tp, NSkZNv) yapılmadı; `UiazV5` kararı uygulanmadı; Farewell penceresi yüzleri; kasaba bilgi Close düğmeleri; telefonda Hearthstead yazıları biniyor.
- **character-vfx:** evolve skill animasyonları daha görkemli (başlanmadı); Archer step2 Sol 7/10 (8 tur geçmedi: göğüs kayışı, sol bracer, sağ eldiven; en iyi tur bağlı); Archer 2H pozlarda (thrust2, spin2b) bir yumruk silahtan ayrı, çift el silahla bakılmadı; ready/nock/draw_*/release/reach_quiver çizili ama bağlı değil; Skald saldırı karelerinin yüzü zayıf; Healing Rain tarayıcıda görsel kontrol yapılmadı (boş hücrede yağmur yok); Vine Snare sheet 07/08 bağlı değil (başka yöntem gerek); Hammer Spark iki hasar sayısı 100-200 ms (engine-dev); ışıma taraması `wip/character-vfx-glow`; Druid 21:9/telefon bakılmadı, eski "8/10 GECTI" puanları geçersiz zamanlama (anim-capture düzeldi, eski capture'lar şüpheli).
- **character-design:** Skald ağacı 6 motor önerisi agent/skald-hooks dalında (Ömer onaylı 2026-11-14; ağaç sim'i Ömer onayıyla); Druid `PENDING_BALANCE`.
- **item-design:** setler (bayrağı açma + sim Ömer onayıyla, kalan 4 set, Sadak, Focus Orb, "Equip best" setleri görmüyor); Potency ölçülmedi; Ring 2 item.
- **campaign:** Harita 3 gözle kontrol (gerçek savaşlar, Kharduin, düğüm-yol hizası, 78 VFX konumu); q5 Fountain; Morvane sineması `CprM9eeoVef4RYd2VH52Ro` yalnız cin_kneel; Crown Surge `Q8mfgZof7zGxQBoALGnftt` C1 seçimi (sormadan bak).
- **minor-fixes:** eski `_not` alanları (items.json sets._status, tutorial.json _not, campaign.json _mapFlags; düşük öncelik); Respec düğmesi.
- **push-queue / dış dünya:** iki cihaz testi sonucu gelmedi; staging kurulmadı; mobil `previous_session_crashed` yanlış; wrangler `tools/deploy-clean.ps1`.
- **Bilinen kırmızılar (tam `npm test`):** Anti-Mage Mana Steal/Burn ~%45 bant 45; endless determinizm yükte zaman aşımı.

## Doğrulanmamış eski açıklar (kapanan kayıtlardan; önce hâlâ geçerli mi bak)
- Haftalık liste 2026-11-07: hafıza arşivi `memory/archive/2026-11-08/weekly-reset-todo.md`, form `U1qTGAFCMEEzQk25VQBgyP`; hangisi bitti kontrol et. Sonra: global DESIGN.md + "more" çarpan sınırlama önerileri.
- Eski 0.9.8 / 0.9.9: D8 paketi, open-question 404/406/408/409/412/413/414.

## Dersler (Ömer)
- **2026-11-13 (sert tepki):** seçim notu harfiyen uygulanır, kapsam genişletilmez ("seviye C gibi" = YALNIZ seviye; çerçeve/arma/renk değil). İtiraz belirsizse önce SOR; tahminle geri alma ya da değiştirme yapılmaz.
- **2026-11-10:** headless Playwright çekim izni agent brief'ine açıkça yazılır; yoksa agent yasak sanıp çekmez. Tek tarayıcı, sırayla, sessiz.

## Araçlar
- **5199 yük izleyici:** `tools/load-monitor.mjs`, `/api` + `/api/progress`, Load/Progress sekmeleri. `launch.json` kaydı yok. Agent brief'ine `İLERLEME n/m: <adım>` satırı yazılır (`lead.md` > Agent brief madde 7).
- **agents-panel modu (kalıcı, Ömer 2026-11-14):** `C:\Users\Omer\.claude\mods\agents-panel\`, `C:\Users\Omer\.claude\settings.json > env.CLAUDE_CODE_PLUGIN_DIRS` ile her yeni oturumda yüklenir (kullanıcı düzeyi, her proje). Yeni oturumda açıldığı henüz GÖRÜLMEDİ; açılmıyorsa ilk bakılacak yer bu ayar.
- **Gönderim aracı ve gizlilik eklentisi (2026-11-14):** `cc-plugin-privacy` eklentisi, `tools/push-queue.mjs` içinde Ömer'in e-postası sabit yazılı olduğu için (git yazar kimliği, satır ~374/948/1118/1737/1834/1841) Lead'in bu aracı çalıştırmasını reddediyor (status, wt-open, ready, push). Depo yerel git ayarında kimlik zaten var; araç sabit e-posta yerine onu kullanırsa engel kalkar. Agent kopyaları (`.claude/worktrees/agent-*`) kancaya takılmaz; Lead belge işini oradan yapar.
