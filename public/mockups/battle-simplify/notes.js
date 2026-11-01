/* Turkish notes under the stage (generated from the same token tables as the stage, so the numbers always match what is drawn). */
(function () {
  'use strict';
  var X = window.__sim, T = X.T, TEXT = X.TEXT, K = X.PH_SCALE;
  var r1 = function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); };
  // value shown to the reader: desktop = px at 1920; phone = real px at 844x390
  function val(v, k, i) {
    var p = T[v][k]; if (!p) return 0;
    var n = p[i];
    if (i === 1 && !TEXT[k]) n = n * K; // layout tokens are in stage units on phone -> real px
    return n;
  }
  function cell(n) { return n ? r1(n) + ' px' : 'yok'; }
  var ROWS = [
    ['nm', 'Karakter adı (Warrior)'], ['num', 'HP / MP / Rage sayısı'], ['of', '"/ max" sayısı'], ['stv', 'Stat değeri (32 / 8 / 12 / 14)'], ['stl', 'Stat etiketi (STR / DEX / INT / LCK)'],
    ['rc', 'Rol ve primary çipi yazısı'], ['more', '"All stats" yazısı'], ['pn', 'Skill adı (plaka; telefonda yalnızca pasif adı)'], ['pw', 'Çipteki "RAGE" kelimesi'], ['pc', 'Çip sayısı (MP / Rage / bekleme)'],
    ['fr', '"Free" çipi'], ['tag', 'PASSIVE / ULTIMATE şeridi'], ['key', 'Skill numarası (1-4)'], ['gl', 'Rest / Skip / Move / Revive yazısı'], ['cl', 'Combat log yazısı'], ['vl', 'VALOR yazısı'],
    ['tl', '"Your turn" yazısı'], ['un', 'Birim adı (sahnede; telefonda sahne ölçeğiyle küçülür)']
  ];
  var LROWS = [['ico', 'Skill ikonu (kare)'], ['plW', 'Plaka genişliği'], ['plH', 'Plaka yüksekliği'], ['tileH', 'Stat karosu yüksekliği'], ['barH', 'HP / MP / Rage çubuğu yüksekliği'], ['chipIco', 'Çip ikonu']];
  function diffTable(v) {
    var out = '<table><tr><th>Parça</th><th>1920 genişlikte (şimdi → öneri)</th><th>Telefon 844x390, gerçek px (şimdi → öneri)</th></tr>';
    ROWS.concat(LROWS).forEach(function (row) {
      var k = row[0], d0 = val('now', k, 0), d1 = val(v, k, 0), p0 = val('now', k, 1), p1 = val(v, k, 1);
      if (d0 === d1 && p0 === p1) return;
      var f = function (a, b) { return a === b ? (a ? cell(a) + ' (aynı)' : '-') : (a ? cell(a) : 'yok') + ' → ' + (b ? cell(b) : '<span class="gone">kaldırıldı</span>'); };
      out += '<tr><td>' + row[1] + '</td><td>' + f(d0, d1) + '</td><td>' + f(p0, p1) + '</td></tr>';
    });
    return out + '</table>';
  }
  function nowTable() {
    var out = '<table><tr><th>Parça</th><th>1920 genişlikte</th><th>Telefon 844x390 (gerçek px)</th></tr>';
    ROWS.forEach(function (row) { var p = val('now', row[0], 1); out += '<tr><td>' + row[1] + '</td><td>' + cell(val('now', row[0], 0)) + '</td><td>' + (p ? cell(p) : 'gizli') + '</td></tr>'; });
    return out + '</table>';
  }
  function li(a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }

  var h = '';
  h += '<h2>Şimdiki durum (Now)</h2><p>Ömer 2026-10-31: yeni yerleşim yok, <b>mevcut sistem sadeleştirilecek</b> (docs/design/pending-fixes.md, madde 38). Aşağıdaki üç varyantta yerleşim aynıdır: soldan portre + karakter bloğu, ortada pasif + 4 skill, sağında Rest/Skip/Move/Revive plakası, Valor mangalları, Combat log. Üstte sıra çubuğu ve "Your turn". Değişen yalnızca boyutlar, kaldırılan / ipucuna taşınan yazılar ve birim adı - çubuk düzeni.</p>';
  h += '<h3>Ölçülen küçük yazılar</h3>' + nowTable();
  h += '<h3>Ad / HP çubuğu çakışması (Now)</h3><p>Birim adı Cinzel 600 26 px, çubuğun 4 px üstünde, yazı kutusu yaklaşık 38 px yüksek (combatant-view.ts). Çubuk 104 x 16 px, baş 24 px yukarıda. Aynı sütundaki birimler 57 px aşağı / 59 px sağa dizildiği için alttaki kurdun adı üstteki kurdun HP çubuğuna <b>yaklaşık 12 px biner</b> (sahnede kırmızı kutu). Hesap koddaki geometriden yapıldı, oyunda ekran görüntüsüyle henüz karşılaştırılmadı.</p>';
  h += '<h3>Değişmeyenler (tüm varyantlarda)</h3>' + li(['Aynı savaş durumu: Warrior sırada, Double Strike seçili, 3 Grey Wolf yan yana (Ravenwood), HP 83/129, MP 68/68, Rage 7/50.', 'Kilitli Charge (kilit simgesi assets/ui-icons/lock), pasif Berserker (1. sırada, bakır-yeşil), Headsman\'s Blow ulti (turuncu, Rage yetmiyor: kırmızı çip).', 'Yeni mekanik, stat ya da kural yok. Yerleşim ve sıra aynı; seçme, kısayol davranışı aynı.', 'İtalik yok; oyun içi tüm yazı İngilizce.']);

  function sec(id, title, rec, idea, removed, moved, gone, overlap, phone) {
    var s = '<div class="sec"><h2>' + title + (rec ? ' <span class="rec">· önerilen</span>' : '') + ' <a href="#' + id + '" style="font:600 11px Cinzel,serif;color:#ffb35a;text-decoration:none;letter-spacing:.12em">(sahnede göster)</a></h2><p>' + idea + '</p>';
    s += '<h3>Çıkarılan</h3>' + li(removed) + '<h3>Tooltip\'e taşınan</h3>' + li(moved);
    s += '<h3>Büyüyen / değişen (somut px)</h3>' + diffTable(id);
    s += '<h3>Ad / HP çubuğu çakışması nasıl çözülür</h3><p>' + overlap + '</p>';
    s += '<h3>Telefon (844x390)</h3>' + li(phone);
    s += '<h3>Ekrandan tamamen kaybolan bilgi</h3><p>' + gone + '</p></div>';
    return s;
  }
  h += sec('a', 'A · Numbers first', 1,
    'Her turda karar verdiren <b>sayılar</b> (HP / MP / Rage, stat değerleri, maliyet ve bekleme çipleri) büyür; onları kalabalıklaştıran etiketler ve tekrar eden yazılar çıkar. Skill adı plakada kalır, bu yüzden plaka biraz genişler (132 → 140 px) ve yükselir (148 → 154 px).',
    ['Adın altındaki rol çipi "Melee Bruiser" ve primary çipi "Strength 32 primary" (primary zaten turuncu STR karosundan okunuyor).', 'Stat karolarındaki STR / DEX / INT / LCK yazıları (ikon + değer kalır).', 'Plaka çiplerindeki "RAGE" kelimesi (ikon + sayı kalır; telefonda zaten yoktu).'],
    ['Rol + primary + dört stat adı: portreye ya da stat alanına tıklayınca açılan Character sayfasının başlığında (mevcut sayfa, sahnede sabitlenmiş örnek).', 'Stat adı: karonun üstüne gelince çıkan mevcut stat ipucunun başlığı.', '"Rage" kelimesi: skill ipucundaki maliyet çipi (mevcut).'],
    'Yok. Çıkarılan her şey zaten Character sayfasında ya da mevcut ipuçlarında duruyor.',
    'Ad, HP çubuğunun üstüne değil <b>çubuğun içine</b> yazılır: ad + çubuk tek plaka olur (150 x 26 px; telefonda 176 x 36 birim = 63 x 13 px). Bir birimin yığını ~60 px yerine 26 px yer tutar, satırlar 57 px aralıklı olduğu için adlar başka birimin çubuğuna giremez. Ad sahnede 26 → 19 px olur ama koyu zemin üstünde kontrast yüksek kalır; telefonda 9,4 → 9,5 px (yan sütunla aralık 67 px, daha geniş plaka yan sütuna girer).',
    ['Plaka adı hâlâ gizli (146 birim = 53 px genişliğe sığmaz; uzun basınca ipucu). Pasif adı 9 → 11 px.', 'Rest / Skip / Move yazısı <b>eklenir</b>: 44 px kare düğmenin altında 10 px etiket (şimdi yalnızca ikon). Combat log şimdi 14 px ikon + görünmez 44 px alan; öneride görünür 44 px kare düğme.', 'Plaka 52,7 px geniş, 53,4 px yüksek (dokunma hedefi 44 px üstünde). Karakter bloğu tek dokunma hedefi.']);
  h += sec('b', 'B · Icon plates', 0,
    'Skill plakaları (ikon, numara, çipler) büyür; plakadaki ve karakter bloğundaki <b>sözcükler</b> (skill adı, stat karoları, rol / primary çipi) şeritten çıkar, ipucuna gider. Karakter bloğu daralır, boşalan genişlik plakalara verilir (132 → 150 px).',
    ['Dört stat karosu (STR 32 / DEX 8 / INT 12 / LUCK 14) alt çubuktan; primary\'nin turuncu karosu da gider.', 'Rol çipi "Melee Bruiser" ve primary çipi.', 'Skill adı plakadan (Double Strike, Whirlwind, Charge, Headsman\'s Blow, Berserker): plakada ikon + numara + çip kalır.', 'Plaka çiplerindeki "RAGE" kelimesi.'],
    ['Stat değerleri + primary: portreye ya da "All stats" düğmesine tıklayınca açılan Character sayfası (mevcut).', 'Skill adı: skill ipucunun başlığı (fareyle üstüne gelince; telefonda uzun basınca). Sahnede Whirlwind örneği sabit.'],
    'Hiçbir bilgi hiçbir yerden silinmez. Ama iki şey artık ekranda bir bakışta görünmez, yalnızca tıklayınca / ipucuyla çıkar: <b>dört stat değeri</b> ve <b>skill adları</b>. Ömer karar vermeli.',
    'Ad, çubuğun üstünden <b>ayağın altına</b> (yer çizgisine) taşınır; çubuk başın üstünde kalır. Böylece ad ile çubuk hiç aynı bantta olmaz, bir sonraki birimin çubuğu bu birimin adına gelemez. Çubuk 104 x 16 → 120 x 22 px, ad 26 → 24 px (telefonda 9,4 → 10 px; sütun aralığı 67 px sınırı). Ad sprite üstüne binebilir ama çubuğa binmez.',
    ['Plaka 160 birim = 57,8 px geniş, ikon 84 birim = 30 px; plakada ad yok, uzun adların sığmama sorunu hiç yok.', 'Stat karoları telefonda da kalkar; karakter bloğu: ad + üç çubuk (sayı 14 px). Rest / Skip / Move 44 px kare, Combat log 44 px görünür kare.']);
  h += sec('c', 'C · One size floor', 0,
    'Ortak kural: <b>hiçbir yazı 1920\'de 16 px, telefonda 10 px altında kalmaz</b>. Sığmayan yazı küçültülmez, çıkarılır. Her şey ölçülü büyür (A kadar sayı vurgusu yok, B kadar ikon büyümesi yok).',
    ['PASSIVE / ULTIMATE şerit yazıları (pasif 1. sırada bakır-yeşil, ulti 4. sırada turuncu çerçeve: renk dili aynı).', '"All stats" yazısı (yerine yalnızca elmas düğme; portreye tıklamak da aynı sayfayı açar).', 'VALOR yazısı (mangallar kalır).', 'Stat karosu etiketleri, rol + primary çipi, çipteki "RAGE" kelimesi.'],
    ['Şerit adı: skill ipucunun üst satırı ("Passive" / "Ultimate"; sahnede ulti örneği sabit).', '"All stats": elmas düğmenin ve portrenin ipucu / aynı Character sayfası.', '"Valor": mangalların üstüne gelince çıkan mevcut Valor ipucu.'],
    'Yok. Pasif ve ulti hâlâ renk + sıra ile ayırt edilir, yalnızca yazıları ipucuna gider.',
    'Çubuk adın <b>üstüne</b> çıkar: sıra "çubuk → ad → kafa". Ad satır kutusu ~38 px yerine 26 px, kafaya 3 px yakın. Bir birimin adı bir sonraki satırdaki birimin çubuğundan en az 5 px uzak kalır (aynı geometride hesaplandı: şimdi +12 px biniyor, burada 5 px boşluk). Çubuk 104 x 16 → 112 x 20 px, ad 26 px kalır (telefonda 9,4 → 10 px).',
    ['Taban 10 px: ad 12, sayı 12, çip 12, numara 10, "Your turn" 10 px (şimdi 5,4 px).', 'Plaka 52,7 px geniş, ikon 80 birim = 28,9 px; plaka adı yine gizli. Rest / Skip / Move 44 px, Combat log 44 px görünür kare.']);
  h += '<div class="sec"><h2>Doğrulanamayanlar</h2>' + li([
    'Ekran görüntüsü alınmadı ve tarayıcıda açılmadı; metin genişlikleri (A\'da "HEADSMAN\'S BLOW" iki satırı, B\'de yan yana sığma, telefonda bar sayıları) gerçek yazı tipiyle ölçülmedi.',
    'Birim adı kutusu ve çubuk geometrisi combatant-view.ts + battle-layout.json\'dan hesaplandı; Phaser metin kutusu yüksekliği (~38 px) tahmin. Çakışma ölçüsü (≈12 px) bu yüzden kabaca.',
    'Warrior sprite\'ı sahnede poz sistemiyle (rig) çizilir; mockup eski tek karelik idle görselini kullanır, yükseklik biraz farklı olabilir.',
    'Tooltip örnek metinleri data/skills.json + classes/warrior.json\'dan yaklaşık yazıldı (motorun skill-info metni değil).',
    'Telefon ölçeği 844x390 için 0,361 alındı; gerçek cihazda safe-area farkı olabilir.'
  ]) + '</div>';
  document.getElementById('notes').innerHTML = h;
})();
