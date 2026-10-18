#!/usr/bin/env python3
"""
SINIF İKON SAYFASI KESİCİ (ChatGPT sayfası -> oyun ikonları). Plan: docs/design/icon-redraw-plan.md > 3.2.
(Bu makinede `sharp` yok; Pillow ile yazıldı. Her sınıf için aynı araç kullanılır.)

Kaynak: assets/source/class-icons/<sınıf>-sheet.png (1536x1024, gerçek saydam, 3x2 ızgara, 512'lik hücre).
Hücre sırası: 1-4 skill (4 = ultimate), 5 pasif, 6 sınıf amblemi.

Kullanım:
  python tools/make-class-icons.py <sınıf> <skill1> <skill2> <skill3> <ultimate> <pasif>
  python tools/make-class-icons.py warrior sword whirlwind charge warcry rage
Adlar verideki ikon adlarıdır (skill.icon / passive.icon).

Çağrı (summon) ikonları — 2x2 sayfa (hücre = boyut/2, ör. 1254 -> 627), yalnızca ikon (amblem yok):
  python tools/make-class-icons.py --grid2 <sayfa-adı> <sahip/ad> <sahip/ad> <sahip/ad> <sahip/ad>   (sıra: sol üst, sağ üst, sol alt, sağ alt)
  python tools/make-class-icons.py --grid2 summons druid/rootsmash druid/vinesnare undead/bone undead/boneslash

Çıktı:
  assets/icons-v2/<sınıf>/<ad>.png (128)  +  .webp
  assets/misc-icons/class/<sınıf>.png (128) + small/<sınıf>.png (64)  +  .webp
  assets/webp-manifest.json güncellenir (tools/webp-assets.mjs ile aynı özet ve WebP ayarı).

Her hücrede alfa kutusu ölçülür (zayıf pus sayılmaz), içerik kare tuvalde ortalanır, her kenarda eşit pay kalır (kırpma yok);
küçültme premultiplied alfa + LANCZOS (açık zeminde hale çıkmaz); tam saydam piksellerin gizli rengi temizlenir.
make-misc-icons.mjs bu sınıfların amblem hücrelerini atlar (yoksa eski amblemi geri yazar).
"""
import hashlib
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL = 512
MARGIN = 0.05      # her kenarda %5 pay
BOX_ALPHA = 24     # bundan zayıf alfa kutu ölçümüne girmez (pus)
WEBP = dict(format='WEBP', quality=90, alpha_quality=100, method=6)


def fit(cell: Image.Image, size: int) -> Image.Image:
    a = cell.getchannel('A').point(lambda v: 255 if v >= BOX_ALPHA else 0)
    box = a.getbbox()
    if not box:
        raise SystemExit('hücre boş')
    l, t, r, b = box
    w, h = r - l, b - t
    side = round(max(w, h) / (1 - 2 * MARGIN))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    # kutu dışındaki zayıf pus da hücre içinde kalarak taşınır (kare tuvale sığdığı kadar)
    ox, oy = (side - w) // 2 - l, (side - h) // 2 - t
    canvas.paste(cell, (ox, oy))
    pm = canvas.convert('RGBa').resize((size, size), Image.LANCZOS)
    out = pm.convert('RGBA')
    px = out.load()
    for y in range(size):  # tam saydam piksellerin gizli rengini sil
        for x in range(size):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)
    return out


def sha(path: str) -> str:
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()[:16]


def main() -> None:
    jobs = []  # (png yolu, görsel)
    if len(sys.argv) == 7 and sys.argv[1] == '--grid2':
        sheet = Image.open(os.path.join(ROOT, 'assets/source/class-icons', f'{sys.argv[2]}-sheet.png')).convert('RGBA')
        if sheet.width != sheet.height or sheet.width % 2:
            raise SystemExit(f'2x2 için kare sayfa bekleniyor, gelen {sheet.size}')
        h = sheet.width // 2
        for i, ref in enumerate(sys.argv[3:7]):
            owner, name = ref.split('/')
            cell = sheet.crop(((i % 2) * h, (i // 2) * h, (i % 2 + 1) * h, (i // 2 + 1) * h))
            d = os.path.join(ROOT, 'assets/icons-v2', owner)
            os.makedirs(d, exist_ok=True)
            jobs.append((os.path.join(d, f'{name}.png'), fit(cell, 128)))
    elif len(sys.argv) == 7:
        cls, names = sys.argv[1], sys.argv[2:7]
        sheet = Image.open(os.path.join(ROOT, 'assets/source/class-icons', f'{cls}-sheet.png')).convert('RGBA')
        if sheet.size != (CELL * 3, CELL * 2):
            raise SystemExit(f'beklenen 1536x1024, gelen {sheet.size}')
        cells = [sheet.crop(((i % 3) * CELL, (i // 3) * CELL, (i % 3 + 1) * CELL, (i // 3 + 1) * CELL)) for i in range(6)]
        d = os.path.join(ROOT, 'assets/icons-v2', cls)
        os.makedirs(d, exist_ok=True)
        for i, name in enumerate(names):
            jobs.append((os.path.join(d, f'{name}.png'), fit(cells[i], 128)))
        cd = os.path.join(ROOT, 'assets/misc-icons/class')
        os.makedirs(os.path.join(cd, 'small'), exist_ok=True)
        jobs.append((os.path.join(cd, f'{cls}.png'), fit(cells[5], 128)))
        jobs.append((os.path.join(cd, 'small', f'{cls}.png'), fit(cells[5], 64)))
    else:
        raise SystemExit(__doc__)

    mpath = os.path.join(ROOT, 'assets/webp-manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8'))
    for path, img in jobs:
        img.save(path, optimize=True)
        img.save(path[:-4] + '.webp', **WEBP)
        key = os.path.relpath(path, ROOT).replace(os.sep, '/')
        if key not in manifest:  # yeni anahtar: aynı klasörün son girişinin ardına
            items = list(manifest.items())
            pre = key.rsplit('/', 1)[0]
            idx = max([i for i, (k, _) in enumerate(items) if k.startswith(pre.rsplit('/', 1)[0])] or [len(items) - 1])
            items.insert(idx + 1, (key, None))
            manifest = dict(items)
        manifest[key] = sha(path)
        print('yazıldı', key)
    with open(mpath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')


main()
