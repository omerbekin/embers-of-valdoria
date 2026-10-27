"""Sefer moblarının (data/mobs) ChatGPT görsellerini (Ömer, 2026-10-13, 1024x1536) oyuna aktarır.
Kullanım (game/ klasöründen):  python tools/import-mobs.py [--only <id>] [--check <klasör>]
Kaynak: assets/source/mobs/<id>.png (oyuna yüklenmez). Çıktı (sınıflarla aynı boru hattı, tools/import-characters-v2.py):
  assets/sprites/<id>/idle.png  içerik kutusuna kırpılır (küçük pay), yükseklik 640, sağa bakar (motor düşmanı aynalar)
  assets/avatars/<id>.png       kafa kırpması 256x256 (HEADS: temizlenmiş içerik kutusunun sol-üstüne göre kaynak px)
Temizlik:
  - Gerçek saydam kaynaklar (road_thug, bandit_crossbowman, ember_acolyte, will_o_wisp ve Bölge II'nin 8 çizimi): alfa eşiği (ALPHA_CUT altı silinir; road_thug'daki
    koyu yarı saydam hale de böyle gider), sonra kenar tüylemesi.
  - Gömülü gri/beyaz dama (fen_witchling, ghoul, shieldwarden; ChatGPT saydamlık yerine deseni boyamış, tonlar ~165 / ~245, ~8 px kare):
    1) kenardan taşma dolgusu, yalnızca renksiz-açık piksellerde (karakterin koyu konturu dolguyu durdurur);
    2) kenara bağlı olmayan renksiz-açık bileşenler (bacak/kol arası delikler): bileşen içindeki piksel çiftleri yarım periyotta (7-9 px) çok,
       tam periyotta (15-17 px) az farklıysa (dama; desen yerel olarak kayar, küresel ızgara tutmaz) ya da çok küçük cepte iki dama tonu birden
       ve sıfıra yakın doygunluk varsa silinir; düz açık iç parçalar (kumaş, kemik) bu sınamayı geçmez;
    3) silinen alana komşu açık-gri kenar halkası (2 geçiş) da silinir, sonra alfa 1 px tüylenir.
Palet varyantları (fill-plan 2): taban sprite'ın HSV bölge eşlemesiyle yeniden boyanması (VARIANTS); sprite + avatar aynı kutuyla.
Doğrulama: --check <klasör> her çıktıyı koyu ve açık zemin üstünde bir kontrol sayfasına yazar (<klasör>/mobs-check.png)."""
import math, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'source', 'mobs')
SPRITE_H = 640
AVATAR = 256
MARGIN = 0.015
WIDE_MAX = 1.45     # idle.png en/boy üst sınırı (1,5 ve üstü oyunda sprite sheet sayılır)
ALPHA_CUT = 150      # gerçek saydam kaynaklarda bunun altı silinir (yarı saydam koyu hale)

# Dama gömülü kaynaklar
CHECKER = {'fen_witchling', 'ghoul', 'shieldwarden'}

# id: (cx, top, size) temizlenmiş içerik kutusunun sol-üstüne göre kaynak px (kare kafa+boyun kutusu)
HEADS = {
    'road_thug': (545, 0, 260),
    'bandit_crossbowman': (495, 0, 250),
    'ember_acolyte': (560, 10, 270),
    'fen_witchling': (625, 90, 290),
    'ghoul': (720, 10, 290),
    'shieldwarden': (600, 0, 240),
    'will_o_wisp': (565, 390, 350),
    # Bölge II (ChatGPT, 2026-10-16; gerçek saydam, sağa bakar)
    'stonebound_warden': (450, 0, 300),
    'deep_runecaller': (610, 190, 300),
    'thane_of_the_deep': (495, 50, 320),
    'hedge_witch_morwen': (570, 90, 300),
    'grave_chanter': (515, 50, 260),
    'oathsworn_brother': (545, 0, 280),
    'censer_monk': (545, 30, 290),
    'high_priest_of_the_undying': (520, 20, 300),
    # Bölge I (ChatGPT, 2026-10-16; gerçek saydam, sağa bakar). grey_wolf yatay (1536x1024): kafa sağda; ekranda boyu mob json spriteScale ile
    'cutpurse': (620, 25, 280),
    'ravenwood_poacher': (690, 20, 300),
    'raven_seer': (599, 110, 300),
    'bandit_chief': (640, 10, 260),
    'deserter_captain': (570, 0, 260),
    'grey_wolf': (1270, 190, 400),
    # Bölge III (mob-plan.md 10.6): YER TUTUCU kafa kutuları; çizim yarın gelince `--only <id> --check <klasör>` ile bakıp düzelt.
    # Kaynağı (assets/source/mobs/<id>.png) olmayan id atlanır.
    'morvane_halberdier': (520, 70, 290),
    'sworn_guard': (560, 90, 300),
    'ash_hound': (1290, 170, 440),
    'cinder_gatewarden': (557, 0, 260),
    'ember_hierophant': (470, 0, 480),
    'drake_priest': (540, 20, 370),
    'lord_morvane': (765, 0, 280),
    # Harita 2 The Drowned Reach (ChatGPT, 2026-10-25; gerçek saydam, sağa bakar; maps-2-3.md 3.3). Kaynaklara her yandan 32 px saydam pay
    # eklendi (reaver_archer / reef_wrecker sağ kenara 1 px'ti). salt_crab ve weir_eel yatay (1536x1024 + pay): WIDE_MAX ile, boy mob json spriteScale.
    'corsair_cutlass': (695, 0, 290),
    'corsair_slinger': (690, 0, 280),
    'salt_crab': (960, 40, 400),
    'weir_eel': (1337, 40, 390),
    'siren': (676, 5, 290),
    'drowned_knight': (621, 0, 320),
    'brine_maiden': (690, 15, 300),
    'reaver_archer': (540, 225, 300),
    'reef_wrecker': (642, 0, 290),
    # 2026-10-27: Harita 2'nin son iki kendi çizimi (önceden moor_raider / bandit_crossbowman çizimini kullanıyorlardı)
    'river_reaver': (455, 0, 290),
    'cliff_crossbowman': (350, 40, 300),
    # Kadın varyasyonları (V1-V5, 2026-10-26)
    'corsair_cutlass_f': (620, 0, 260),
    'corsair_slinger_f': (608, 0, 280),
    'drowned_knight_f': (565, 0, 300),
    'reaver_archer_f': (540, 225, 300),
    'reef_wrecker_f': (635, 10, 285),
    # Harita 2 elitleri (B1-B8, 2026-10-26)
    'reaver_chief_hook': (553, 0, 300),
    'salt_hag_mother': (580, 20, 360),
    'guild_enforcer_bastion': (578, 0, 310),
    'wrecker_captain': (538, 165, 300),
    'corsair_captain_marrow': (430, 55, 280),
    'siren_queen': (555, 0, 270),
    'salt_bishop': (540, 150, 280),
    'drowned_champion': (545, 10, 300),
    'weir_wyrm': (1270, 100, 400),
    'admiral_vane': (770, 20, 300),
    'drowned_queen': (700, 0, 330),
    'pit_champion_gorr': (410, 0, 290),  # 2026-10-27 kendi çizimi (önceden Bandit Chief)
    'inquisitor_captain_vell': (400, 52, 250),  # 2026-10-27 kendi çizimi (önceden Oathsworn Brother)
    'hex_totem': (313, 290, 240),
    'harpoon_ballista': (760, 60, 640),  # Harita 2 yardımcı nesnesi (Admiral Vane'in Harpoon Ballista'sı)
}

# Havada süzülen moblar: içerik bu oranda yüksekliğe çıkar, altı boş kalır (ekranda gövde yerden yüksekte durur; gölge yerde kalır).
FLOAT = {'will_o_wisp': 0.74}


# ------------------------------------------------------------------ renk yardımcıları
def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm = m & (mx == r); gm = m & (mx == g) & ~rm; bm = m & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    h = h * 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    h = (h % 360) / 60.0
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,))
    for k, (a, b, c) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        mk = i == k
        out[mk, 0] = a[mk]; out[mk, 1] = b[mk]; out[mk, 2] = c[mk]
    return out


def hue_in(h, lo, hi):
    return (h >= lo) & (h <= hi) if lo <= hi else (h >= lo) | (h <= hi)


# ------------------------------------------------------------------ temizlik
def components(mask, seeds_edge):
    """4-komşu bileşen etiketleri (yalnızca mask içinde). seeds_edge: kenara değen bileşenler 1 numara olur."""
    H, W = mask.shape
    lab = np.zeros((H, W), np.int32)
    flat = mask.ravel(); L = lab.ravel()
    n = 1
    def bfs(s, k):
        q = deque([s]); L[s] = k; cnt = 0
        while q:
            i = q.popleft(); cnt += 1
            x = i % W
            for j in ((i - 1) if x > 0 else -1, (i + 1) if x < W - 1 else -1, i - W, i + W):
                if 0 <= j < H * W and flat[j] and not L[j]:
                    L[j] = k; q.append(j)
        return cnt
    if seeds_edge:
        edge = np.concatenate([np.arange(W), (H - 1) * W + np.arange(W), np.arange(H) * W, np.arange(H) * W + W - 1])
        for s in edge:
            if flat[s] and not L[s]:
                bfs(int(s), 1)
    for s in np.flatnonzero(flat & (L == 0)):
        if not L[s]:
            n += 1; bfs(int(s), n)
    return lab, n


def neighbor_any(m):
    o = np.zeros_like(m)
    o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    return o


def feather(alpha):
    """1 px tüy: 3x3 ortalama + 40, yalnızca küçültür."""
    a = alpha.astype(np.float32)
    p = np.pad(a, 1, mode='edge')
    s = sum(p[1 + dy:1 + dy + a.shape[0], 1 + dx:1 + dx + a.shape[1]] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
    return np.minimum(a, s + 40).clip(0, 255).astype(np.uint8)


def pair_diff(L, mm, d):
    """Bileşen içindeki d px uzak piksel çiftlerinin (yatay + dikey) ortalama parlaklık farkı; çift yoksa None."""
    H, W = mm.shape
    out = []
    for dx, dy in ((d, 0), (0, d)):
        if dy >= H or dx >= W:
            continue
        a = mm[:H - dy, :W - dx] & mm[dy:, dx:]
        if a.sum() >= 6:
            out.append(float(np.abs(L[:H - dy, :W - dx] - L[dy:, dx:])[a].mean()))
    return float(np.mean(out)) if out else None


def is_checker_hole(L, sat, mm, tones):
    """Kapalı renksiz-açık bileşen dama mı: yarım periyotta (7-9 px) büyük, tam periyotta (15-17 px) küçük fark; çift kurulamayacak kadar
    küçük ceplerde iki dama tonu birden, neredeyse sıfır doygunlukla."""
    lo, hi = tones
    d8 = [v for v in (pair_diff(L, mm, d) for d in (7, 8, 9)) if v is not None]
    d16 = [v for v in (pair_diff(L, mm, d) for d in (15, 16, 17)) if v is not None]
    v = L[mm]
    # kontur dışındaki beyaz hale cebi (ChatGPT damanın açık karesini kontura yapıştırmış): neredeyse saf beyaz ve renksiz
    if v.mean() > 205 and sat[mm].mean() < 12:
        # yalnızca koyu konturla çevriliyse (çelik parlaklığı gri çelikle çevrilidir, silinmez)
        ring = neighbor_any(neighbor_any(mm)) & ~mm
        if ring.any() and L[ring].mean() < 85:
            return True
    if d8 and d16:
        return max(d8) > 32 and min(d16) < 0.5 * max(d8)
    return sat[mm].mean() < 10 and np.mean(np.abs(v - lo) < 14) > 0.2 and np.mean(np.abs(v - hi) < 12) > 0.2


def remove_checker(rgb):
    f = rgb.astype(np.float32)
    mx = f.max(-1); mn = f.min(-1); sat = mx - mn
    bg_like = (sat <= 22) & (mn >= 128)
    lab, n = components(bg_like, True)
    removed = lab == 1
    lum = f.mean(-1)
    e = lum[removed]
    tones = (float(np.median(e[e < 205])), float(np.median(e[e >= 205])))
    holes = 0
    for k in range(2, n + 1):
        m = lab == k
        ys, xs = np.nonzero(m)
        if len(ys) < 12:
            continue
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        if is_checker_hole(lum[y0:y1, x0:x1], sat[y0:y1, x0:x1], m[y0:y1, x0:x1], tones):
            removed |= m; holes += 1
    for _ in range(2):
        ring = neighbor_any(removed) & ~removed & (sat <= 30) & (mn >= 105)
        removed |= ring
    alpha = np.where(removed, 0, 255).astype(np.uint8)
    return alpha, holes


def clean(mid):
    im = Image.open(os.path.join(SRC, mid + '.png'))
    if mid in CHECKER:
        rgb = np.asarray(im.convert('RGB'))
        alpha, holes = remove_checker(rgb)
        print(f'  {mid}: dama silindi ({holes} kapalı delik)')
    else:
        a = np.asarray(im.convert('RGBA'))
        rgb = a[..., :3].copy(); alpha = a[..., 3].copy()
        alpha[alpha < ALPHA_CUT] = 0
        alpha[alpha >= ALPHA_CUT] = 255
    # tek başına kalan küçük kırıntılar (toz, dama artığı) silinir
    lab, n = components(alpha > 0, False)
    sizes = np.bincount(lab.ravel())
    big = sizes.argmax() if n else 0
    small = np.isin(lab, [k for k in range(2, n + 1) if sizes[k] < 400])
    alpha[small] = 0
    alpha = feather(alpha)
    out = np.dstack([rgb, alpha])
    return Image.fromarray(out, 'RGBA')


# ------------------------------------------------------------------ palet varyantları
def recolor(img, fn):
    a = np.asarray(img).astype(np.float32) / 255
    h, s, v = rgb_to_hsv(a[..., :3])
    h, s, v = fn(h, s, v)
    rgb = hsv_to_rgb(h, np.clip(s, 0, 1), np.clip(v, 0, 1))
    return Image.fromarray(np.dstack([rgb, a[..., 3:]]).__mul__(255).round().astype(np.uint8), 'RGBA')


def charcoal_burner(h, s, v):
    # kızıl cüppe -> is kara önlük/cüppe; kor kovası (parlak turuncu-sarı) korunur
    ember = hue_in(h, 10, 55) & (v > 0.62) & (s > 0.55)
    red = hue_in(h, 335, 30) & (s > 0.28) & ~ember
    s = np.where(red, s * 0.18, s)
    v = np.where(red, v * 0.62, v)
    # kahve deriler biraz daha kirli-gri
    brown = hue_in(h, 15, 50) & ~ember & ~red
    s = np.where(brown, s * 0.65, s)
    v = np.where(brown, v * 0.85, v)
    return h, s, v


def drowned(h, s, v):
    # solgun deri -> yosun yeşili; açık sarımsı paçavralar -> bataklık mavisi; kan kırmızısı -> koyu bataklık kahve-yeşili
    warm = hue_in(h, 18, 70) & (s > 0.1)
    rag = warm & (s < 0.3) & (v > 0.55)
    skin = warm & ~rag
    red = hue_in(h, 330, 18) & (s > 0.2)
    pale = (s <= 0.1) & (v > 0.35)
    h = np.where(skin, 88 + (h - 40) * 0.35, h)
    s = np.where(skin, np.clip(s * 0.9, 0, 0.42), s)
    v = np.where(skin, v * 0.86, v)
    h = np.where(rag | pale, 196, h)
    s = np.where(rag | pale, np.clip(s * 0.9 + 0.06, 0, 0.3), s)
    v = np.where(rag | pale, v * 0.84, v)
    h = np.where(red, 55, h)
    s = np.where(red, s * 0.55, s)
    v = np.where(red, v * 0.55, v)
    return h, s, v


def moor_raider(h, s, v):
    # kızıl atkı/kuşak -> çivit mavisi yün (woad); kahve yelek/deri -> boz yeşil yün; ten aynen
    red = hue_in(h, 340, 14) & (s > 0.35)
    h = np.where(red, 218, h)
    s = np.where(red, s * 0.75, s)
    v = np.where(red, v * 0.9, v)
    brown = hue_in(h, 15, 45) & (s > 0.3) & (v < 0.5)
    h = np.where(brown, 70, h)
    s = np.where(brown, s * 0.55, s)
    return h, s, v


VARIANTS = {
    'charcoal_burner': ('ember_acolyte', charcoal_burner),
    'drowned': ('ghoul', drowned),
    'moor_raider': ('road_thug', moor_raider),
}


# ------------------------------------------------------------------ çıktı
def write(mid, c, head):
    """c: içerik kutusuna kırpılmış temiz RGBA (kaynak çözünürlüğü)."""
    cx, top, size = head
    x0 = int(cx - size / 2); y0 = int(top)
    pad = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    pad.paste(c.crop((max(0, x0), max(0, y0), min(c.width, x0 + size), min(c.height, y0 + size))), (max(0, -x0), max(0, -y0)))
    os.makedirs(os.path.join(ROOT, 'assets', 'avatars'), exist_ok=True)
    pad.resize((AVATAR, AVATAR), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'avatars', mid + '.png'), optimize=True)
    m = int(max(c.size) * MARGIN)
    base = FLOAT.get(mid)
    hh = c.height + 2 * m if base is None else int(round((c.height + m) / base))
    # Yatay çizim (Grey Wolf): oyun genişliği yüksekliğin 1,5 katını aşan idle.png'yi yatay sprite sheet sayar (assets.ts > registerSheet);
    # üstte saydam boşlukla oran WIDE_MAX'a indirilir, figür altta (ayak zemin çizgisinde) kalır. Ekrandaki boy: mob json spriteScale.
    hh = max(hh, int(math.ceil((c.width + 2 * m) / WIDE_MAX)))
    sp = Image.new('RGBA', (c.width + 2 * m, hh), (0, 0, 0, 0))
    sp.paste(c, (m, hh - c.height - m if base is None else m))
    w = round(sp.width * SPRITE_H / sp.height)
    sp = sp.resize((w, SPRITE_H), Image.LANCZOS)
    d = os.path.join(ROOT, 'assets', 'sprites', mid)
    os.makedirs(d, exist_ok=True)
    sp.save(os.path.join(d, 'idle.png'), optimize=True)
    print(mid, sp.size)
    return sp, pad


def check_sheet(items, folder):
    cell_w, cell_h = 260, 340
    sheet = Image.new('RGB', (cell_w * len(items), cell_h * 2 + 140), (30, 30, 30))
    for i, (mid, sp, av) in enumerate(items):
        for row, bg in enumerate([(24, 20, 18), (236, 232, 222)]):
            cell = Image.new('RGB', (cell_w, cell_h), bg)
            t = sp.copy(); t.thumbnail((cell_w - 10, cell_h - 10), Image.LANCZOS)
            cell.paste(t, ((cell_w - t.width) // 2, cell_h - t.height - 5), t)
            sheet.paste(cell, (i * cell_w, row * cell_h))
        a = av.resize((128, 128), Image.LANCZOS)
        cell = Image.new('RGB', (128, 128), (60, 52, 44)); cell.paste(a, (0, 0), a)
        sheet.paste(cell, (i * cell_w + 66, cell_h * 2 + 6))
    os.makedirs(folder, exist_ok=True)
    sheet.save(os.path.join(folder, 'mobs-check.png'))


def main():
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    check = sys.argv[sys.argv.index('--check') + 1] if '--check' in sys.argv else None
    items = []
    cleaned = {}
    for mid in HEADS:
        if only and only != mid and VARIANTS.get(only, (None,))[0] != mid:
            continue
        if not os.path.exists(os.path.join(SRC, mid + '.png')):
            print(f'  atlandı (kaynak yok): {mid}')
            continue
        img = clean(mid)
        bb = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        c = img.crop(bb)
        cleaned[mid] = c
        if not only or only == mid:
            sp, av = write(mid, c, HEADS[mid])
            items.append((mid, sp, av))
    for vid, (base, fn) in VARIANTS.items():
        if only and only != vid:
            continue
        sp, av = write(vid, recolor(cleaned[base], fn), HEADS[base])
        items.append((vid, sp, av))
    if check:
        check_sheet(items, check)


if __name__ == '__main__':
    main()
