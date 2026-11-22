# Eski | yeni kontak sayfaları (1x, etiketli): ui-shots-mobil-masaustu/redtithe/pozlar-v1-1.png, -2.png
from PIL import Image,ImageDraw,ImageFont
A='assets/poses/antimage-v2/'; O=A+'_old-2026-11-21b/'
OUT='../../../../../ui-shots-mobil-masaustu/redtithe/'
import os
OUT=os.path.normpath(os.path.join(os.getcwd(),'..','..','..','..','ui-shots-mobil-masaustu','redtithe'))+os.sep
N=['idle2','step2','slash1','slash2','overhead1','overhead2','thrust1','thrust2','spin1a','spin1b','spin1c',
   'spin2a','spin2b','spin2c','guard1','guard2','raise','channel','point','throw','hit','kneel']
f=ImageFont.truetype('arial.ttf',20)
def cell(p):
  bg=Image.new('RGBA',(450,412),(70,70,86,255)); im=Image.open(p).convert('RGBA'); bg.alpha_composite(im)
  d=ImageDraw.Draw(bg); d.line([(0,406),(450,406)],fill=(140,140,90)); return bg.convert('RGB')
for page,names in enumerate((N[:11],N[11:]),1):
  cols=3; rows=(len(names)+cols-1)//cols
  o=Image.new('RGB',(cols*910,rows*444),(25,25,30)); d=ImageDraw.Draw(o)
  for i,n in enumerate(names):
    x,y=(i%cols)*910,(i//cols)*444
    o.paste(cell(O+n+'.png'),(x,y+30)); o.paste(cell(A+n+'.png'),(x+452,y+30))
    d.text((x+4,y+4),f'{n}: eski',fill='white',font=f); d.text((x+456,y+4),f'{n}: yeni',fill=(255,220,120),font=f)
  o.save(OUT+f'pozlar-v1-{page}.png'); print(OUT+f'pozlar-v1-{page}.png')
