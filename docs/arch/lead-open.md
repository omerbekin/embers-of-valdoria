# Lead açık iş listesi (alanlar arası)
> **Ne için / Güncel mi (2026-11-13):** Lead'in tek takip listesi: dal durumu, bekleyen formlar, Ömer'e sorulacaklar, alanlara dağılmış açık işlerin kısa dizini. Hafızadaki `lead-handoff` kaydından taşındı (2026-11-13); hafızada yalnız açılış adımları kaldı. Ayrıntı ve karar her zaman alan belgesindedir (`docs/arch/areas/<alan>.md`); burada yalnız tek satır + alan adı durur. Biten satır silinir.

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
