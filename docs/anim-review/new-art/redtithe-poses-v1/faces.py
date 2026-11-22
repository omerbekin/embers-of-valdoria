# Deri bölgeleri (yüz ölçeği denetimi): her karede alan>150 deri lekelerinin kutusu. Yüz = saç bloğuna bitişik, en üstteki büyük leke.
import sys,glob,os
import numpy as np
from PIL import Image
def blobs(im):
  a=np.array(im).astype(int); r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
  m=(al>200)&(r>140)&(r-g>25)&(g-b>10)&(r-b>45)&(r<250)
  H,W=m.shape; seen=np.zeros_like(m); out=[]
  for y0,x0 in zip(*np.nonzero(m)):
    if seen[y0,x0]: continue
    st=[(y0,x0)]; seen[y0,x0]=1; pts=[]
    while st:
      y,x=st.pop(); pts.append((y,x))
      for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        yy,xx=y+dy,x+dx
        if 0<=yy<H and 0<=xx<W and m[yy,xx] and not seen[yy,xx]: seen[yy,xx]=1; st.append((yy,xx))
    if len(pts)>150:
      ys=[p[0] for p in pts]; xs=[p[1] for p in pts]; out.append((min(ys),min(xs),max(ys)-min(ys),max(xs)-min(xs),len(pts)))
  return sorted(out)
for f in sys.argv[1:]:
  im=Image.open(f).convert('RGBA')
  k=450/im.width
  if im.width!=450: im=im.resize((450,round(im.height*k)),Image.LANCZOS)
  print(os.path.basename(f),' '.join(f'[y{b[0]} x{b[1]} h{b[2]} w{b[3]} a{b[4]}]' for b in blobs(im)))
