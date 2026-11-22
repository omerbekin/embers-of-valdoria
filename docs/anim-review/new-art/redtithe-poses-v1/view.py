# Ham çıktıyı eski kareyle yan yana gri zeminde gösterir (kontrol). Kullanım: python view.py out.png poz ...
import sys
from PIL import Image
out=sys.argv[1]; names=sys.argv[2:]
W,H=450,412
o=Image.new('RGB',(W*2*len(names),H),(90,90,110))
for i,n in enumerate(names):
  for j,src in enumerate(['refs/old-'+n+'.png','raw/'+n+'.png']):
    try: im=Image.open(src).convert('RGBA').resize((W,H),Image.LANCZOS)
    except Exception: continue
    bg=Image.new('RGBA',(W,H),(90,90,110,255));bg.alpha_composite(im);o.paste(bg.convert('RGB'),((2*i+j)*W,0))
o.save(out)
