#!/usr/bin/env python3
"""
OYUN İKONU İÇE AKTARICI (tek dosya / klasör). Boyalı oyun ikonu grubu (assets/misc-icons/<grup>/) için kare, gerçek saydam büyük PNG'leri alır:
alfa kutusuna kırp, %5 pay, premultiplied LANCZOS (tools/make-class-icons.py > fit) -> <ad>.png (128) + small/<ad>.png (64) + .webp'leri,
assets/webp-manifest.json güncellenir. Ad = dosya adı (uzantısız).

Kullanım:
  python tools/make-misc-icon.py <grup> <kaynak.png | klasör> [--keep-source]
  python tools/make-misc-icon.py codex C:/.../codex-icons    (klasörde yalnızca *.png okunur; alt klasörler ve .log/.txt atlanır)
--keep-source kaynağı assets/source/misc-icons/<grup>/<ad>.png olarak da kopyalar. Yeni grup ise src/ui/misc-icons.ts MISC_GROUPS / MISC_ICONS'a eklenir.
"""
import hashlib
import importlib.util
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('mci', os.path.join(ROOT, 'tools', 'make-class-icons.py'))
src = open(spec.origin, encoding='utf-8').read().rsplit('\nmain()', 1)[0]
ns: dict = {'__file__': spec.origin, '__name__': 'mci'}
exec(compile(src, spec.origin, 'exec'), ns)
fit, WEBP = ns['fit'], ns['WEBP']

from PIL import Image  # noqa: E402


def sha(path: str) -> str:
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()[:16]


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        raise SystemExit(__doc__)
    group, path = args
    files = sorted(os.path.join(path, f) for f in os.listdir(path) if f.endswith('.png')) if os.path.isdir(path) else [path]
    mpath = os.path.join(ROOT, 'assets/webp-manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8'))
    for f in files:
        name = os.path.basename(f)[:-4]
        img = Image.open(f).convert('RGBA')
        if img.width != img.height:
            raise SystemExit(f'{name}: kare kaynak bekleniyor, gelen {img.size}')
        for sub, size in (('', 128), ('small', 64)):
            out = os.path.join(ROOT, 'assets/misc-icons', group, sub)
            os.makedirs(out, exist_ok=True)
            dst = os.path.join(out, f'{name}.png')
            res = fit(img, size)
            res.save(dst, optimize=True)
            res.save(dst[:-4] + '.webp', **WEBP)
            manifest[os.path.relpath(dst, ROOT).replace(os.sep, '/')] = sha(dst)
        if '--keep-source' in sys.argv:
            sd = os.path.join(ROOT, 'assets/source/misc-icons', group)
            os.makedirs(sd, exist_ok=True)
            shutil.copyfile(f, os.path.join(sd, f'{name}.png'))
        print('yazıldı', group, name)
    with open(mpath, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')


main()
