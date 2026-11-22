import sys, os, textwrap
sys.path.insert(0, os.path.dirname(__file__))
from rows import MAPS
from PIL import Image, ImageDraw, ImageFont
BG = r'C:\Users\Omer\Projects\embers-of-valdoria\game\.claude\worktrees\agent-content-designer-arkaplan\assets\backgrounds'
OUT = r'C:\Users\Omer\Projects\embers-of-valdoria\ui-shots-mobil-masaustu\arkaplan'
os.makedirs(OUT, exist_ok=True)
COL = {'UYGUN': (46, 160, 67), 'KISMEN': (220, 180, 30), 'UYGUN DEĞİL': (200, 40, 40)}
f_b = ImageFont.truetype('arialbd.ttf', 22); f = ImageFont.truetype('arial.ttf', 17); f_t = ImageFont.truetype('arialbd.ttf', 34); f_s = ImageFont.truetype('arial.ttf', 15)
TW, TH = 420, 280
COLS = 4
CW, CH = TW + 20, TH + 150
for k, (title, rows) in MAPS.items():
    n = len(rows); r = (n + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * CW + 20, r * CH + 80), (18, 16, 14))
    d = ImageDraw.Draw(sheet)
    d.text((20, 18), title + '  -  savaş arka planı denetimi (r41)', font=f_t, fill=(240, 220, 170))
    for i, (reg, nodes, foes, bg, v) in enumerate(rows):
        x = 20 + (i % COLS) * CW; y = 80 + (i // COLS) * CH
        im = Image.open(os.path.join(BG, bg + '.webp')).convert('RGB').resize((TW, TH))
        sheet.paste(im, (x, y))
        c = COL[v]
        d.rectangle([x, y, x + TW - 1, y + TH - 1], outline=c, width=5)
        lw = d.textlength(v, font=f_b)
        d.rectangle([x, y, x + lw + 16, y + 32], fill=c)
        d.text((x + 8, y + 4), v, font=f_b, fill=(0, 0, 0) if v == 'KISMEN' else (255, 255, 255))
        d.rectangle([x, y + TH - 24, x + TW, y + TH], fill=(0, 0, 0))
        d.text((x + 6, y + TH - 22), bg, font=f_s, fill=(200, 200, 200))
        ty = y + TH + 4
        d.text((x, ty), reg, font=f_b, fill=c); ty += 26
        for line in textwrap.wrap(nodes, 46)[:3]:
            d.text((x, ty), line, font=f, fill=(235, 235, 235)); ty += 20
        for line in textwrap.wrap('Düşman: ' + foes, 50)[:2]:
            d.text((x, ty), line, font=f_s, fill=(170, 170, 170)); ty += 18
    sheet.save(os.path.join(OUT, f'harita-{k}.jpg'), quality=86)
    print(k, sheet.size)
