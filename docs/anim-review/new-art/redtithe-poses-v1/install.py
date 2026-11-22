# fit/<poz>.png -> oyuna: eski kare _old-2026-11-21b/ (+ small) altına taşınır, yeni kare + small (yarım boy, lanczos) yazılır,
# poses.json > antimage_v2.poses.<poz>.box alfa kutusundan, anchor/offhand verilen noktalardan güncellenir.
# Kullanım (worktree kökü): python .../install.py 'poz=ax,ay,aa/ox,oy,oa' ...  (sonra node tools/webp-assets.mjs + python tools/pack-pose-atlases.py)
import sys,os,shutil,re
from PIL import Image
D='docs/anim-review/new-art/redtithe-poses-v1/'; A='assets/poses/antimage-v2/'; O=A+'_old-2026-11-21b/'
os.makedirs(O+'small',exist_ok=True)
F='data/poses.json'; s=open(F,encoding='utf8').read()
base=s.index('"antimage_v2": {'); pstart=s.index('"poses": {',base)
def setpose(s,n,box,an,of):
  i=s.index('"'+n+'": {',pstart); j=s.index('"src"',i)
  blk=s[i:j]
  def rep(blk,key,vals):
    k=blk.index('"'+key+'": {'); e=blk.index('}',k)
    sub=blk[k:e]
    for f,v in vals.items(): sub=re.sub(r'("'+f+r'": )-?\d+(\.\d+)?', lambda m:m.group(1)+str(v), sub)
    return blk[:k]+sub+blk[e:]
  if an: blk=rep(blk,'anchor',dict(zip('x y angle'.split(),an)))
  if of: blk=rep(blk,'offhand',dict(zip('x y angle'.split(),of)))
  blk=rep(blk,'box',dict(zip('x y w h'.split(),box)))
  return s[:i]+blk+s[j:]
for arg in sys.argv[1:]:
  n,_,pts=arg.partition('=')
  an,_,of=pts.partition('/')
  an=[float(v) if '.' in v else int(v) for v in an.split(',')] if an else None; of=[float(v) if '.' in v else int(v) for v in of.split(',')] if of else None
  im=Image.open(D+'fit/'+n+'.png').convert('RGBA')
  b=im.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox()
  box=[b[0],b[1],b[2]-b[0],b[3]-b[1]]
  for sub in ('','small/'):
    for ext in ('.png','.webp'):
      src=A+sub+n+ext
      if os.path.exists(src) and not os.path.exists(O+sub+n+ext): shutil.move(src,O+sub+n+ext)
      elif os.path.exists(src): os.remove(src)
  im.save(A+n+'.png',optimize=True)
  im.resize((225,206),Image.LANCZOS).save(A+'small/'+n+'.png',optimize=True)
  s=setpose(s,n,box,an,of)
  print(n,'box',box,'anchor',an,'offhand',of)
open(F,'w',encoding='utf8').write(s)
