#!/usr/bin/env python3
"""
rage + cooldown ikonları (skill kartı çipleri), yeniden çizim 2026-10-18.
Kaynak: assets/source/ui-icons/rage-cooldown-v2.png (gerçek saydam, 2 hücre yan yana: sol rage, sağ cooldown).
Çıktı: assets/ui-icons/<ad>.png (128) + small/<ad>.png (64) + .webp + assets/webp-manifest.json.
Yöntem make-class-icons.py ile aynı (alfa kutusu, kare %5 pay, premultiplied LANCZOS). make-ui-icons.mjs bu ikonları atlar.
Kullanım: python tools/make-ui-icons-v2.py
"""
import hashlib, json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARGIN = 0.05
BOX_ALPHA = 24
WEBP = dict(format='WEBP', quality=90, alpha_quality=100, method=6)


def fit(cell, size):
    a = cell.getchannel('A').point(lambda v: 255 if v >= BOX_ALPHA else 0)
    l, t, r, b = a.getbbox()
    w, h = r - l, b - t
    side = round(max(w, h) / (1 - 2 * MARGIN))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(cell, ((side - w) // 2 - l, (side - h) // 2 - t))
    out = canvas.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA')
    px = out.load()
    for y in range(size):
        for x in range(size):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)
    return out


def sha(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()[:16]


sheet = Image.open(os.path.join(ROOT, 'assets/source/ui-icons/rage-cooldown-v2.png')).convert('RGBA')
W, H = sheet.size
half = W // 2
mpath = os.path.join(ROOT, 'assets/webp-manifest.json')
manifest = json.load(open(mpath, encoding='utf-8'))
for i, name in enumerate(['rage', 'cooldown']):
    cell = sheet.crop((i * half, 0, (i + 1) * half, H))
    for sub, size in (('', 128), ('small/', 64)):
        path = os.path.join(ROOT, 'assets/ui-icons', sub + name + '.png')
        img = fit(cell, size)
        img.save(path, optimize=True)
        img.save(path[:-4] + '.webp', **WEBP)
        manifest[os.path.relpath(path, ROOT).replace(os.sep, '/')] = sha(path)
        print('yazildi', path)
with open(mpath, 'w', encoding='utf-8', newline='\n') as f:
    f.write(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')
