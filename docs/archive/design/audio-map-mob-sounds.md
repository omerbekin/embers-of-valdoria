> Ne için: `docs/design/audio-map.md` belgesinden 2026-11-08'de taşınan mob ses tarifi anlatıları (Bölge I-III, Harita 2); güncel tarifler `data/audio-mobs.json`. Güncel değil.

## Sefer düşmanı skill sesleri (`data/audio-mobs.json`, çalma `src/game/mob-sfx.ts`; Ömer 2026-10-16)

Bölge I-II'deki her mob skill'inin (50 skill, 98 ses) KENDİ sesi var; artık bir class'ın sesini ödünç almaz. Efekt (ödünç v1/v2 ya da mobun
kendi sheet'i) eski ses adını ister (`c.sfx('axeChop')`); `roles` tablosu bunu role çevirir (cast = hazırlık / savurma / atış, travel = uçuş,
hit = vuruş, none = sessiz; skill bazında `skills.<id>.roles` ezer) ve skill'in o roldeki sesi çalar. Aynı ses bir dökümde 90 ms'den sık çalmaz.
Skill tabloda yoksa eski ödünç ses çalar (yedek; `skills.json > sfx` yedek olarak durur). Kaydırıcı: Sound Effects. Tepe 0,30-0,66 (vuruş ~0,6,
savurma ~0,45, uçuş ~0,3, ilahi/fısıltı ~0,38), class skill sesleriyle aynı seviye. Codex > Assets > Sounds > "Campaign enemies" grubunda
▶ ile dinlenir (kartta gerçek karşılığı ve kullanan skill yazar; "Play all in group" hepsini sırayla çalar).
Örnekler: Billhook = demir kanca savrulması + kumaş takılması; Rockfall = gürleme, sonra sırayla taş düşmeleri + çakıl; Dirge = ağzı kapalı
alçak mırıldanma (formantlı ses, sinüs değil); Holy Ember = buhurdan zinciri şıkırtısı + savrulma; Raven's Peck = çift karga gaklaması +
kanat çırpışı ve gaga darbesi; Bite = kurt hırlaması + diş şaklaması.

**Bölge III (campaign-dev 2026-10-17; mob-plan.md 10):** 14 yeni skill (Morvane Halberdier, Sworn Guard, Ash Hound, Cinder Gatewarden, Ember Hierophant,
Drake Priest ve final boss Lord Morvane), 29 yeni ses; hepsi WebAudio tarifi, kayıtlı dosya yok. Her yeni ses tepe ölçümüyle eşitlenmiş bir Bölge I-II
sesinin katmanlarından türetildi (frekans kaydırma + ek katman; kazanç şablondan, ek katmanda %10 kısık; tarayıcıda tepe ölçümü yapılmadı, kulak
kontrolü önerilir). Örnekler: Halberd Chop = uzun sap savrulması + kalın balta vuruşu; Scorch Bite = dumanlı hırlama + diş şaklaması ve kor çıtırtısı;
Hold the Gate = demir bantlı kalkan taşa vurulur + kalın "None pass the gate!" bağırışı; Cinder Lash = kor zincir kırbaç şaklaması + tıslama;
Iron Decree = kızgın mühür basılması + Morvane'nin derin tek komutu; Pyre of Morvane = yer gürlemesi, sonra tüm alanı saran alev. Lord Morvane'ın
sesleri de "Campaign enemies" grubunda (sahibi boss).

**Harita 2 önderleri (content-designer 2026-10-27):** 9 elit (Hook, Salt Hag Mother, Bastion, Vell, Wrecker-Captain, Marrow, Siren Queen, Salt Bishop,
Drowned Champion), Pit Champion "Gorr" ve 3 boss (Weir-Wyrm, Admiral Vane, Drowned Queen): 43 skill, 83 ses; her skill KENDİ tarifiyle (eski kopya /
yer tutucu tarifler ve Bridge Warden'ın ödünç sesleri kalktı). Aileler aynı malzemeden ama her biri ayırt edilir: kanca ailesi (Gaff Strike = kısa demir
kanca + yırtılma, Boarding Hook = ip ucunda dönen çatal kanca + ip gerilir, Debtor's Chain = zincir sarılır + asma kilit kapanır, Wrecker's Gaff = ıslak
sırık + kaldıraç gıcırtısı, Harpoon Line = zıpkın + gerilen halat); pala ailesi (Black Cutlass = kınından çekme + tek kesik, Captain's Rake = ileri-geri iki
savuruş, Cutlass Flurry = hızlı çift kesik, Drowned Greatsword = ağır ıslak savuruş + sıçrama); deniz büyüsü (Brine Curse = gargaralı lanet, Call the Tide /
High Tide / Surge = yükselen dalga ve kırılış, Salt Circle = dökülen tuz + kristal çıtırtısı, Requiem of Salt / Lament of the Deep = alçak koro); siren
sesleri formantlı kadın sesi (Queen's Lament = tiz ağıt, Grand Chorus = dört sesli akor, Siren's Call = nefesli iki notalık çağrı); Weir-Wyrm = kuyruk
şaklaması, ağız açılırken gargaralı hırıltı + ısırma ve yutkunma, kükreme + bent yıkılışı; Admiral Vane = top atışı + zincir gülle vınlaması, "Fire!" +
üç topluk yaylım, "All hands!" + tayfa tezahüratı; Gorr = demir yumruk, kalabalığın "Ohh!"u, göğüs yumruklama + adını haykıran kalabalık. Tepe ölçümü
çevrimdışı JS taklidiyle, Bölge I-II seslerine göre ayarlı (aynı ölçekte Billhook 0,56 / 0,74): savuruş ~0,55, vuruş ~0,72, ağır vuruş ~0,78,
ses / koro ~0,62, yumuşak ~0,44, ulti ~0,8; tarayıcıda kulak kontrolü önerilir. Mob sheet'i istek listesinin ilkini başta, kalanlarını vuruşta çalar:
Warden kaynaklı listelerde (wyrm_*, chain_shot) yalnızca biri vuruşa bağlı, diğerleri sessiz (`skills.<id>.roles`); Powder Keg / Brine Lash'in uçuş isteği
sessiz (uçuş sesi vuruşla üst üste binmesin).

Harita 2 sıradan mobları (dock_rat, reef_hound, salt_hag, tide_caller, marsh_light, wreck_ghoul) + River Reaver / Cliff Crossbowman yeni skill'leri kendi tariflerinde (16 skill, 32 ses: ıslak halat / ağ, tuzlu dalga, bataklık kıvılcımı, midye kabuğu tırmığı, kanca, uçurumdan yaylım; open-questions-archive 442); tepe tarayıcıda Harita 1 karşılığına eşitlendi.

Harita 2'de kalan son Harita 1 birimlerinin sürümleri (cinder_exile, pitch_boiler, sunken_dead, mire_ghoul, reed_witch, mudlark, inquisition_brother, salt_chaplain) + Tide Caller çağrısı risen_drowned kendi tariflerinde (18 skill, 33 ses: zift / katran, su sıçraması, çamur, saz hışırtısı, tuz kristali; open-questions-archive 446); tepe tarayıcıda Harita 1 karşılığına (Risen Drowned: Skeleton class seslerine) eşitlendi.

