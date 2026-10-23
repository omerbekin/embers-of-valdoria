#!/usr/bin/env python3
"""
SKILL AĞACI İKONU İÇE AKTARICI (tek dosya modu). Plan: docs/design/art/skill-tree-icons-warrior.md (bölüm 2, 7).
Kaynak: kare, gerçek saydam büyük PNG (ör. 1254 / 1024). Alfa kutusu ölçülür, her kenarda %5 pay, premultiplied LANCZOS ile 128'e küçülür
(tools/make-class-icons.py > fit ile aynı mantık).

Kullanım:
  python tools/make-tree-icon.py <kaynak.png> <sınıf> <düğüm>
  python tools/make-tree-icon.py C:/.../warrior/3_v.png warrior 3_v      (düğüm = '<satır>_<id>', nokta yerine alt çizgi)
Çıktı: assets/tree-icons/<sınıf>/<düğüm>.png (128) + .webp; assets/webp-manifest.json güncellenir (webp-assets.mjs ile aynı özet).
İsteğe bağlı: --keep-source kaynağı assets/source/tree-icons/<sınıf>/<düğüm>.png olarak da kopyalar.
Oyun bağlantısı otomatik: evolve düğümünün (<satır>_v) dosyası varsa o skill'in ikonu yerine o gösterilir (src/ui/evolve-icon.ts).
"""
import hashlib
import importlib.util
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('mci', os.path.join(ROOT, 'tools', 'make-class-icons.py'))
src = open(spec.origin, encoding='utf-8').read().rsplit('\nmain()', 1)[0]  # main() çağrısını çalıştırmadan fit / WEBP al
ns: dict = {'__file__': spec.origin, '__name__': 'mci'}
exec(compile(src, spec.origin, 'exec'), ns)
fit, WEBP = ns['fit'], ns['WEBP']

from PIL import Image  # noqa: E402


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 3:
        raise SystemExit(__doc__)
    path, cls, node = args
    img = Image.open(path).convert('RGBA')
    if img.width != img.height:
        raise SystemExit(f'kare kaynak bekleniyor, gelen {img.size}')
    out = os.path.join(ROOT, 'assets/tree-icons', cls)
    os.makedirs(out, exist_ok=True)
    dst = os.path.join(out, f'{node}.png')
    res = fit(img, 128)
    res.save(dst, optimize=True)
    res.save(dst[:-4] + '.webp', **WEBP)
    if '--keep-source' in sys.argv:
        sd = os.path.join(ROOT, 'assets/source/tree-icons', cls)
        os.makedirs(sd, exist_ok=True)
        shutil.copyfile(path, os.path.join(sd, f'{node}.png'))
    mpath = os.path.join(ROOT, 'assets/webp-manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8'))
    key = f'assets/tree-icons/{cls}/{node}.png'
    manifest[key] = hashlib.sha1(open(dst, 'rb').read()).hexdigest()[:16]
    with open(mpath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')
    print('yazıldı', key)


main()
