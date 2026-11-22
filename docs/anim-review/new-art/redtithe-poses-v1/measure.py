# Ham çıktıyı 450x412'ye indirip alfa kutusunu eski kutu ve idle1 ile karşılaştırır.
import sys,json
from PIL import Image
P=json.load(open('data/poses.json',encoding='utf8'))['classes']['antimage_v2']['poses']
D='docs/anim-review/new-art/redtithe-poses-v1/'
def bbox(im,t=24):
  a=im.getchannel('A').point(lambda v:255 if v>t else 0);return a.getbbox()
for n in sys.argv[1:]:
  im=Image.open(D+'raw/'+n+'.png').convert('RGBA').resize((450,412),Image.LANCZOS)
  old=Image.open(D+'refs/old-'+n+'.png').convert('RGBA')
  b=bbox(im);ob=bbox(old);bx=P[n]['box']
  print(n,'new',b,'h',b[3]-b[1],'| oldpng',ob,'h',ob[3]-ob[1],'| box',bx)
