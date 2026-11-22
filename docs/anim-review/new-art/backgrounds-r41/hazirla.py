# r41 arka plan örneği: ChatGPT'den indirilen görseli oyun boyutuna getirir (1536x1024, 3:2) ve gösterim kopyasını yazar.
# Oyuna BAĞLAMAZ; assets/ ve data/ altına hiçbir şey yazmaz.
#   python -X utf8 docs/anim-review/new-art/backgrounds-r41/hazirla.py <indirilen.png> [--id castle-morvane] [--floor 0.586]
#   --id: arka plan kimliği (kebab-case, varsayılan castle-morvane); çıktı adları <id>-ham.png, <id>-1536.png, <id>-yeni*.jpg olur (castle-morvane için eski adlar: ornek-yeni*.jpg)
# Çıktılar:
#   docs/anim-review/new-art/backgrounds-r41/castle-morvane-ham.png   (indirilen, olduğu gibi)
#   docs/anim-review/new-art/backgrounds-r41/castle-morvane-1536.png  (1536x1024, ortadan cover kırpma)
#   ui-shots-mobil-masaustu/arkaplan/ornek-yeni.jpg                  (1536x1024 + zemin çizgisi ve kırpma kılavuzlu ikinci kopya ornek-yeni-kilavuz.jpg)
# Sonra savaş görüntüsü (dev sunucu kendi portunda açıkken):
#   BG_FILE=docs/anim-review/new-art/backgrounds-r41/castle-morvane-1536.png BG_FLOOR=<ölçülen kesir> \
#     node tools/ui-shot.mjs docs/anim-review/new-art/backgrounds-r41/oyunda-shot.mjs --url http://localhost:<port> --out <geçici klasör> --view 1920x1080,844x390
#   ve <geçici klasör>/oyunda-1920x1080.jpg + oyunda-844x390.jpg -> ui-shots-mobil-masaustu/arkaplan/ornek-oyunda-1920x1080.jpg / ornek-oyunda-844x390.jpg
import os, shutil, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))  # game/ (ya da worktree kökü)
SHOTS = os.path.abspath(os.path.join(ROOT, '..', 'ui-shots-mobil-masaustu', 'arkaplan'))
if not os.path.isdir(os.path.dirname(SHOTS)):  # worktree: .claude/worktrees/<ad> -> proje kökü
    SHOTS = r'C:\Users\Omer\Projects\embers-of-valdoria\ui-shots-mobil-masaustu\arkaplan'

args = sys.argv[1:]
floor = 0.586
bgid = 'castle-morvane'
if '--id' in args:
    i = args.index('--id'); bgid = args[i + 1]; del args[i:i + 2]
PFX = 'ornek' if bgid == 'castle-morvane' else bgid
if '--floor' in args:
    i = args.index('--floor'); floor = float(args[i + 1]); del args[i:i + 2]
src = args[0]
os.makedirs(SHOTS, exist_ok=True)
shutil.copyfile(src, os.path.join(HERE, bgid + '-ham' + os.path.splitext(src)[1].lower()))

im = Image.open(src).convert('RGB')
W, H = 1536, 1024
s = max(W / im.width, H / im.height)
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
x0, y0 = (im.width - W) // 2, (im.height - H) // 2
im = im.crop((x0, y0, x0 + W, y0 + H))
im.save(os.path.join(HERE, bgid + '-1536.png'))
im.save(os.path.join(SHOTS, PFX + '-yeni.jpg'), quality=90)

# Kılavuzlu kopya: zemin çizgisi (kırmızı), 16:9 (sarı) ve telefon 844x390 (camgöbeği) savaşta görünen bant; --floor değerinden hesaplanır
def band(stage_w, f, stage_h=1080, target=715):
    # src/game/battle-background.ts > backgroundPlacement ile aynı hesap: görselin ekranda görünen dikey bandı (kesir)
    scale = max(stage_w / W, stage_h / H, (stage_h - target) / ((1 - f) * H), target / (f * H))
    h = H * scale
    y = min(h / 2, max(stage_h - h / 2, target - (f - 0.5) * h))
    top = (h / 2 - y) / h
    return top, top + stage_h / h

g = im.copy(); d = ImageDraw.Draw(g)
d.line([(0, floor * H), (W, floor * H)], fill=(255, 40, 40), width=3)
for sw, c in ((1920, (255, 220, 0)), (2337, (0, 220, 255))):  # 16:9 ve telefon 844x390
    top, bot = band(sw, floor)
    d.rectangle([2, top * H, W - 3, min(bot, 1) * H - 1], outline=c, width=3)
    print(f'{sw}x1080 görünen bant: y %{top*100:.1f} - %{min(bot,1)*100:.1f}')
g.save(os.path.join(SHOTS, PFX + '-yeni-kilavuz.jpg'), quality=88)
print('tamam:', os.path.join(HERE, bgid + '-1536.png'), '| zemin kesri', floor)
