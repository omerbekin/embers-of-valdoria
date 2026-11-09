# Archer v3 poz normalleştirici (art-loop job-E için; Terra ve Claude kullanır).
# python normalize.py <ham.png> <çıktı.png> <poz-ref.png>
# Ham görsel: saydam ya da düz (beyaz/koyu) zeminli tek figür, herhangi bir boyut.
# Çıktı: 584x454 RGBA, gerçek alfa; figür poz-ref'in (assets/poses/archer-v2/<poz>.png) alfa kutusunun
# boyuna ölçeklenir, ayak tabanı y=448, yatay merkez ref kutusunun merkezi.
import sys
from collections import deque
from PIL import Image, ImageFilter

src, out, ref = sys.argv[1], sys.argv[2], sys.argv[3]
W, H, FOOT = 584, 454, 448

im = Image.open(src).convert('RGBA')
w, h = im.size
px = im.load()
a = im.getchannel('A')
opaque = a.getextrema()[0] > 200  # hiç saydam piksel yok: zemin anahtarla

if opaque:
    # köşelerden taşma dolgusu: köşe rengine yakın pikseller zemin
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    def near(c, tol=38):
        return any(abs(c[0] - k[0]) + abs(c[1] - k[1]) + abs(c[2] - k[2]) <= tol for k in corners)
    bg = bytearray(w * h)
    q = deque()
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        bg[y * w + x] = 1
        q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and near(px[nx, ny]):
                bg[ny * w + nx] = 1
                q.append((nx, ny))
    mask = Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in bg))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mask)
    a = mask

# en büyük bağlı bileşen dışındaki kırıntıları sil (alfa > 40)
small = a.point(lambda v: 255 if v > 40 else 0)
sw, sh = small.size
sp = small.load()
seen = bytearray(sw * sh)
best = []
for y0 in range(sh):
    for x0 in range(sw):
        if sp[x0, y0] and not seen[y0 * sw + x0]:
            comp = []
            q = deque([(x0, y0)])
            seen[y0 * sw + x0] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < sw and 0 <= ny < sh and sp[nx, ny] and not seen[ny * sw + nx]:
                        seen[ny * sw + nx] = 1
                        q.append((nx, ny))
            if len(comp) > len(best):
                best = comp
keep = Image.new('L', (sw, sh))
kp = keep.load()
for x, y in best:
    kp[x, y] = 255
keep = keep.filter(ImageFilter.MaxFilter(7))
alpha = Image.composite(a, Image.new('L', (sw, sh)), keep)
alpha = alpha.point(lambda v: 0 if v < 12 else v)
im.putalpha(alpha)

bbox = alpha.getbbox()
crop = im.crop(bbox)
rb = Image.open(ref).convert('RGBA').getchannel('A').getbbox()
th = rb[3] - rb[1]
tw = max(1, round(crop.width * th / crop.height))
crop = crop.resize((tw, th), Image.Resampling.LANCZOS)
cx = (rb[0] + rb[2]) // 2
x = max(0, min(W - tw, cx - tw // 2))
canvas = Image.new('RGBA', (W, H))
canvas.alpha_composite(crop, (x, FOOT - th))
canvas.save(out)
print('src', (w, h), 'bbox', bbox, '->', canvas.size, 'alpha bbox', canvas.getchannel('A').getbbox())
