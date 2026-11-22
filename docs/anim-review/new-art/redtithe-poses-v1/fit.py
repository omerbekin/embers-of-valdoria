# Ham Codex çıktısını tuvale oturtur. Ölçek SABİT: ham görsel doğrudan 450x412'ye (Codex, girdi 1 = idle1 ölçeğini koruyor; yüz deri
# lekesi alanı faces.py ile idle1'e +-8% içinde). Eski kutu boyuna germe YOK (eski kadının topuzu kutuyu büyütüyordu).
# Yatay: iki çizmenin taban (alt 14 satır) ortası eski karedekiyle aynı x; dikey: en alt opak satır y405 (taban 406).
# Yarı saydam kenar kırpılır (alfa<24 -> 0). Çıktı fit/<poz>.png (450x412) + fit/<poz>-grid.png (3x, 12 px ızgara, eski el noktaları mavi/yeşil).
# Kullanım (worktree kökü): python docs/anim-review/new-art/redtithe-poses-v1/fit.py poz[:olcek][:dx][:dy] ...
import sys,json,os
from PIL import Image,ImageDraw
P=json.load(open('data/poses.json',encoding='utf8'))['classes']['antimage_v2']['poses']
D='docs/anim-review/new-art/redtithe-poses-v1/'
os.makedirs(D+'fit',exist_ok=True)
def bbox(im,t=24): return im.getchannel('A').point(lambda v:255 if v>t else 0).getbbox()
for arg in sys.argv[1:]:
  p=(arg+':::').split(':'); n=p[0]; k=float(p[1] or 1); dx=int(p[2] or 0); dy=int(p[3] or 0)
  raw=Image.open(D+'raw/'+n+'.png').convert('RGBA')
  fig=raw.resize((round(450*k),round(raw.height*450/raw.width*k)),Image.LANCZOS)
  a=fig.getchannel('A').point(lambda v:0 if v<24 else v); fig.putalpha(a)
  fb=bbox(fig); fig=fig.crop(fb)
  def solex(im):
    A=im.getchannel('A'); w,h=im.size; xs=[x for y in range(h-14,h) for x in range(w) if A.getpixel((x,y))>128]; return (min(xs)+max(xs))/2
  old=Image.open(D+'refs/old-'+n+'.png').convert('RGBA'); ob=bbox(old)
  ocx=ob[0]+solex(old.crop(ob))
  x0=round(ocx-solex(fig))+dx; y0=406-fig.height+dy
  out=Image.new('RGBA',(450,412),(0,0,0,0)); s=1
  out.alpha_composite(fig,(max(0,x0),max(0,y0)),(max(0,-x0),max(0,-y0)))
  if x0<2 or x0+fig.width>448 or y0<2: print('UYARI kesik',n,x0,y0,fig.size)
  out.save(D+'fit/'+n+'.png')
  g=Image.new('RGBA',(450,412),(90,90,110,255)); g.alpha_composite(out); g=g.resize((1350,1236),Image.NEAREST); d=ImageDraw.Draw(g)
  for x in range(0,450,12): d.line([(x*3,0),(x*3,1236)],fill=(60,60,80) if x%60 else (200,200,60))
  for y in range(0,412,12): d.line([(0,y*3),(1350,y*3)],fill=(60,60,80) if y%60 else (200,200,60))
  g2=Image.new('RGBA',g.size); g2.alpha_composite(g)
  for key,col in (('anchor',(60,140,255)),('offhand',(60,220,90))):
    q=P[n][key]; d.ellipse([q['x']*3-7,q['y']*3-7,q['x']*3+7,q['y']*3+7],outline=col,width=3)
  g.convert('RGB').save(D+'fit/'+n+'-grid.png')
  print(n,'olcek',k,'yer',x0,y0,'kutu',bbox(out))
