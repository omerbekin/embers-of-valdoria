#!/usr/bin/env python3
"""
Poz gövde ve silah görsellerini az sayıda atlasa paketler (Ömer 2026-10-18, yükleme performansı: savaş başına ~130 küçük dosya yerine
birkaç atlas; sahne açılışını dosya açma / doku çevirme harcıyordu).

Girdi : assets/poses/<dir>/<poz>.png (+ small/), assets/weapons/<aile>/<görünüm>.png (+ small/), data/poses.json (gruplama için)
Çıktı : assets/pose-atlas/*.webp (atlas sayfaları), index.json (oyunun okuduğu kare konumları), manifest.json (denetim özeti)

Gruplama (oyun "yalnızca gereken tutuş takımını" yüklemeye devam eder; src/game/poses.ts > gripFrames ile aynı kural):
  - gövde: her sınıf klasörü için kareler "hangi tutuş takımlarında kullanılıyor" imzasına göre gruplanır (ör. ortak kareler = 'all',
    yalnızca çift el = 'two'). Bir birim ortak grup + kendi tutuşunun grubunu yükler. Tutuş takımı olmayan sınıf (Warrior v1) tek grup.
  - silah: aile başına bir atlas (görünümler birlikte).
  - her grup ayrıca yarı boy (small/) olarak paketlenir ('.s').
Atlas PNG asıllardan üretilir (WebP'ye bir kez, tek tek dosyalarla aynı görünüm: q95 + kayıpsız alfa); kareler 16 pikselin katına hizalanır
(kayıplı sıkıştırma blokları tek tek dosyadakiyle aynı kalır) ve aralarında en az 2 piksel boşluk vardır. Kare kırpılmaz: oyundaki pişirme
tek dosyadakiyle birebir aynı pikselleri okur.

Ne zaman: assets/poses, assets/weapons ya da data/poses.json içindeki poz / tutuş / döngü adları değişince (make-poses*.mjs, import araçları
ve webp-assets.mjs'ten SONRA). tests/pose-atlas.test.ts eski atlası yakalar. Kullanım:
  python tools/pack-pose-atlases.py          yalnızca değiştiyse üretir
  python tools/pack-pose-atlases.py --force  hepsini yeniden üret
  python tools/pack-pose-atlases.py --check  yalnızca denetle (eski / eksik varsa çıkış kodu 1)
"""
import hashlib
import json
import math
import os
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
POSES_DIR = os.path.join(ROOT, 'assets', 'poses')
WEAPONS_DIR = os.path.join(ROOT, 'assets', 'weapons')
OUT = os.path.join(ROOT, 'assets', 'pose-atlas')
VERSION = 2  # paketleme kuralı değişince artır (manifest özetine girer)
ALIGN = 16
GAP = 2
MAX_SIDE = 4096  # telefon grafik belleği için en büyük sayfa kenarı
# Pillow, sharp'ın smartSubsample'ına denk gelen keskin renk dönüşümünü sunmuyor: aynı görünüm için q90 yerine q95 (ölçüm: tek dosya q90
# ile PSNR farkı < 0,6 dB; q90'da 1,4 dB). Alfa kayıpsız.
WEBP = dict(format='WEBP', quality=95, alpha_quality=100, method=6)

CHECK = '--check' in sys.argv
FORCE = '--force' in sys.argv


def sha(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:16]


def file_hash(path: str) -> str:
    with open(path, 'rb') as f:
        return sha(f.read())


def up(n: int) -> int:
    return -(-n // ALIGN) * ALIGN


def pose_grip(d: dict, grip):
    g = grip or 'one'
    grips = d.get('grips')
    if not grips or g in grips:
        return g
    f = (d.get('gripFallback') or {}).get(g)
    return f if f and f in grips else 'one'


def grip_frames(d: dict, grip):
    """src/game/poses.ts > gripFrames ile aynı kural."""
    allf = list(d['poses'].keys())
    grips = d.get('grips')
    if not grips:
        return allf
    cycles = d.get('cycles') or {}

    def expand(names):
        out = []
        for n in names:
            out.extend(cycles.get(n, [n]))
        return out

    g = pose_grip(d, grip)
    own = set(expand((grips.get(g) or {}).values()))
    other = set()
    for k, m in grips.items():
        if k != g:
            other.update(expand((m or {}).values()))
    return [n for n in allf if n in own or n not in other]


def body_groups(d: dict) -> dict:
    """grup adı -> kare adları (poz sırası)."""
    if not d.get('grips'):
        return {'all': list(d['poses'].keys())}
    resolved = sorted({pose_grip(d, g) for g in ('one', 'two', 'bow', 'charm')})
    sets = {g: set(grip_frames(d, g)) for g in resolved}
    groups: dict = {}
    for name in d['poses'].keys():
        sig = tuple(g for g in resolved if name in sets[g])
        label = 'all' if len(sig) == len(resolved) else '+'.join(sig)
        groups.setdefault(label, []).append(name)
    return groups


def pack(items):
    """items: [(ad, görsel)] -> (sayfalar [(W, H, [(ad, x, y, w, h, görsel)])]). Raf yerleşimi, en düşük alanlı genişlik seçilir."""
    slots = sorted(((n, im, up(im.width + GAP), up(im.height + GAP)) for n, im in items), key=lambda s: (-s[3], s[0]))
    widest = max(s[2] for s in slots)
    best = None
    for w in sorted({max(widest, c) for c in (512, 768, 1024, 1536, 2048, 3072, 4096) if c <= MAX_SIDE}):
        pages = []
        cur = None
        for n, im, sw, sh in slots:
            if cur is None:
                cur = {'x': 0, 'y': 0, 'sh': sh, 'items': [], 'H': 0}
                pages.append(cur)
            elif cur['x'] + sw > w:
                ny = cur['y'] + cur['sh']  # yeni raf (yükseklik azalan sırada: rafın yüksekliği ilk karenin yüksekliği)
                if ny + sh > MAX_SIDE:
                    cur = {'x': 0, 'y': 0, 'sh': sh, 'items': [], 'H': 0}
                    pages.append(cur)
                else:
                    cur['x'], cur['y'], cur['sh'] = 0, ny, sh
            cur['items'].append((n, cur['x'], cur['y'], im.width, im.height, im))
            cur['x'] += sw
            cur['H'] = max(cur['H'], cur['y'] + sh)
        area = sum(w * p['H'] for p in pages)
        cand = (len(pages), area, w, pages)
        if best is None or cand[:2] < best[:2]:
            best = cand
    _, _, w, pages = best
    return [(w, up(p['H']), p['items']) for p in pages]


def load(path: str):
    if not os.path.exists(path):
        return None
    return Image.open(path).convert('RGBA')


def build():
    poses = json.load(open(os.path.join(ROOT, 'data', 'poses.json'), encoding='utf-8'))
    atlases: dict = {}  # id -> {kind, owner, small, w, h, frames}
    jobs = []  # (id, W, H, items)
    sources: dict = {}

    def add(kind: str, owner: str, label: str, small: bool, names, src_dir: str):
        items = []
        for n in names:
            p = os.path.join(src_dir, ('small' if small else ''), n + '.png')
            im = load(p)
            if im is None:
                continue
            sources[os.path.relpath(p, ROOT).replace('\\', '/')] = file_hash(p)
            items.append((n, im))
        if not items:
            return
        for i, (w, h, placed) in enumerate(pack(items)):
            aid = f"{'b' if kind == 'body' else 'w'}.{owner}.{label}{'.s' if small else ''}{'.p%d' % (i + 1) if i else ''}"
            frames = {n: [x, y, fw, fh] for n, x, y, fw, fh, _ in placed}
            atlases[aid] = {'kind': kind, 'owner': owner, 'small': small, 'w': w, 'h': h, 'frames': frames}
            jobs.append((aid, w, h, placed))

    dirs = {}
    for cid, d in poses['classes'].items():
        if d['dir'] in dirs:
            raise SystemExit(f"{cid} ve {dirs[d['dir']]} aynı klasörü kullanıyor ({d['dir']}): paketleme klasör başına")
        dirs[d['dir']] = cid
        for label, names in body_groups(d).items():
            for small in (False, True):
                add('body', d['dir'], label, small, names, os.path.join(POSES_DIR, d['dir']))
    for fam in sorted(os.listdir(WEAPONS_DIR)):
        fdir = os.path.join(WEAPONS_DIR, fam)
        if not os.path.isdir(fdir):
            continue
        looks = sorted(f[:-4] for f in os.listdir(fdir) if f.endswith('.png'))
        for small in (False, True):
            add('weapon', fam, 'all', small, looks, fdir)
    return atlases, jobs, sources


def input_digest(sources: dict, poses: dict) -> str:
    group_rel = {cid: {k: d.get(k) for k in ('dir', 'grips', 'gripFallback', 'cycles')} | {'poses': list(d['poses'].keys())} for cid, d in poses['classes'].items()}
    blob = json.dumps({'v': VERSION, 'src': sources, 'g': group_rel}, sort_keys=True)
    return sha(blob.encode('utf-8'))


def main():
    poses = json.load(open(os.path.join(ROOT, 'data', 'poses.json'), encoding='utf-8'))
    atlases, jobs, sources = build()
    digest = input_digest(sources, poses)
    manifest_path = os.path.join(OUT, 'manifest.json')
    old = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    fresh = old.get('digest') == digest and all(os.path.exists(os.path.join(OUT, a + '.webp')) for a in atlases)
    if CHECK:
        print('güncel' if fresh else 'ESKİ / EKSİK: python tools/pack-pose-atlases.py')
        sys.exit(0 if fresh else 1)
    if fresh and not FORCE:
        print(f'{len(atlases)} atlas güncel.')
        return
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.webp'):
            os.remove(os.path.join(OUT, f))
    total = 0
    for aid, w, h, placed in jobs:
        sheet = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        for _, x, y, _, _, im in placed:
            sheet.paste(im, (x, y))
        path = os.path.join(OUT, aid + '.webp')
        sheet.save(path, **WEBP)
        total += os.path.getsize(path)
    index = {'v': VERSION, 'atlases': {k: {'kind': a['kind'], 'owner': a['owner'], 'small': a['small'], 'w': a['w'], 'h': a['h'], 'frames': a['frames']} for k, a in sorted(atlases.items())}}
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, separators=(',', ':'))
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump({'digest': digest, 'sources': dict(sorted(sources.items()))}, f, indent=1)
    print(f'{len(atlases)} atlas yazıldı ({total / 1048576:.1f} MB), {len(sources)} kaynak PNG.')


main()
