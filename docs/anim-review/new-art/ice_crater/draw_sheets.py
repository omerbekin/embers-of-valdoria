from PIL import Image, ImageDraw
import math, json
from pathlib import Path
OUT=Path(__file__).parent
W=H=256
WHITE=(244,251,255); PALE=(143,216,255); BLUE=(74,163,255); DARK=(31,63,92); MID=(55,113,166)
def rgba(c,a=255): return (*c,max(0,min(255,int(a))))
def poly(d, pts, c, a=255): d.polygon(pts, fill=rgba(c,a))
def line(d, pts, c, w=1, a=255): d.line(pts, fill=rgba(c,a), width=w, joint='curve')
def ellipse(d, box, c, outline=None, width=1, a=255): d.ellipse(box, fill=rgba(c,a) if c else None, outline=rgba(outline,a) if outline else None, width=width)
def make_crater(f):
 im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
 # frame progress phases, footprint y=214
 # s1/s2 frost grows from a small, translucent ring; s3 reaches full size.
 if f<=3:
  scale=[.35,.70,1.0][f-1]; alpha=[102,145,175][f-1]
 elif f<=8:
  scale=1.0; alpha={4:175,5:190,6:205,7:180,8:125}[f]
 else:
  scale=1.0; alpha={9:105,10:72,11:46,12:22}[f]
 # Keep the initial footprint hollow and delicate; the dark crater forms at s3.
 cx=128; cy=214
 rx=101*scale; ry=20*scale
 dark_phase=3<=f<=9
 if dark_phase:
  ellipse(d,(cx-rx,cy-ry,cx+rx,cy+ry),DARK,a=alpha)
  ellipse(d,(cx-rx*.84,cy-ry*.66,cx+rx*.84,cy+ry*.66),MID,a=int(alpha*.9))
  ellipse(d,(cx-rx*.65,cy-ry*.35,cx+rx*.65,cy+ry*.35),DARK,a=int(alpha*.95))
 else:
  # only a faint frost wash, never a filled bright disk
  ellipse(d,(cx-rx*.82,cy-ry*.55,cx+rx*.82,cy+ry*.55),PALE,a=int(alpha*.16))
 for inset,col in [(0,PALE),(7,WHITE),(14,BLUE)]:
  box=(round(cx-rx+inset*scale),round(cy-ry+inset*scale/3),round(cx+rx-inset*scale),round(cy+ry-inset*scale/3))
  d.arc(box,190,350,fill=rgba(col,alpha),width=2 if inset==0 else 1)
  d.arc(box,8,170,fill=rgba(col,int(alpha*.65)),width=1)
 # radial ground fractures, brightening toward impact
 for i in range(6):
  ang=math.radians(205+i*26)
  fracture_scale=scale if f<=3 else 1.0
  x0=128+math.cos(ang)*28*fracture_scale; y0=214+math.sin(ang)*8*fracture_scale
  x1=128+math.cos(ang)*78*fracture_scale; y1=214+math.sin(ang)*19*fracture_scale
  xm=(x0+x1)/2 + (-1 if i%2 else 1)*5; ym=(y0+y1)/2-2
  crack_alpha=int(alpha*.85) if f<=8 else int(alpha*.35)
  line(d,[(round(x0),round(y0)),(round(xm),round(ym)),(round(x1),round(y1))],WHITE if f in (3,4,5,6) else PALE,1,crack_alpha)
  if f>=3 and f<=7: line(d,[(round(x0),round(y0+1)),(round(xm),round(ym+1)),(round(x1),round(y1+1))],BLUE,1,int(crack_alpha*.7))
 # VFX eruption ramps s5-s8
 heights={5:68,6:116,7:103,8:68,9:36}.get(f,0)
 if heights:
  # translucent, tapered white-blue light column rises between the spires.
  if f in (5,6,7):
   glow_a={5:105,6:135,7:72}[f]
   top=214-heights//2
   poly(d,[(128,top),(111,207),(120,209),(116,214),(140,214),(136,209),(145,207)],PALE,glow_a)
   poly(d,[(128,top+5),(123,209),(128,207),(133,209),(131,214),(125,214)],WHITE,int(glow_a*.9))
  n=7
  for i in range(n):
   base_x=48+i*26
   # central spires tallest; edge spires short
   scale=[.46,.64,.84,1,.84,.64,.46][i]
   hh=int(heights*scale)
   lean=(-1 if i<3 else 1 if i>3 else 0)*(hh//9)
   bw=12 if i in (0,6) else 16
   tip=(base_x+lean,214-hh)
   left=(base_x-bw//2,211); right=(base_x+bw//2,211)
   a=alpha
   poly(d,[left,tip,right,(base_x+3,207),(base_x-3,207)],DARK,a)
   poly(d,[(base_x-bw//2+2,210),(tip[0],tip[1]+4),(base_x+2,209)],PALE,a)
   line(d,[tip,(base_x+1,208)],WHITE,2,a)
   if f>=8:
    # jagged split at tip
    line(d,[(tip[0],tip[1]+4),(tip[0]-4,tip[1]+12),(tip[0]+3,tip[1]+18)],WHITE,1,a)
  # airborne shards, move out and down through late frames
  for j in range(5):
   side=-1 if j%2==0 else 1
   dist=18+j*10+(f-6)*7
   xx=128+side*dist; yy=157-(j%3)*18 + max(0,f-7)*12
   if 8<=f<=9: yy+= (f-7)*14
   if 0<xx<256 and 24<yy<235:
    poly(d,[(xx,yy-5),(xx+3*side,yy),(xx,yy+5),(xx-2*side,yy)],WHITE if j%2 else PALE,alpha)
 # later small ice chips + cold mist
 if f>=9:
  for x,y in [(75,211),(103,207),(158,213),(185,208)]:
   if f<11: poly(d,[(x,y-4),(x+4,y+2),(x-2,y+2)],PALE,alpha)
  for k in range(3):
   yy=185-k*8-(f-10)*2
   if yy>150: line(d,[(100+k*24,yy),(104+k*24,yy-3),(101+k*24,yy-6)],(143,216,255),1,alpha)
 return im

def make_crack(f):
 im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
 # flash grows then becomes a six/eight arm fracture
 if f<=2:
  r=[20,22][f-1]
  poly(d,[(128,128-r),(133,124),(131,128),(128+r,126),(132,132),(128,131+r),(124,133),(126,129-r),(128-r,130),(124,125),(129,127)],PALE if f==1 else WHITE)
  ellipse(d,(128-r//2,128-r//2,128+r//2,128+r//2),PALE)
 if 3<=f<=6:
  fade={3:255,4:245,5:210,6:150}[f]
  scale={3:.60,4:.80,5:.95,6:1.0}[f]
  rays=[(0,-62),(1,-38),(44,-43),(25,-17),(63,0),(37,8),(40,43),(17,25),(0,62),(-8,35),(-48,45),(-24,17),(-62,0),(-37,-7),(-43,-43),(-17,-24)]
  # radial crack arms with stepped branches
  for i in range(0,16,2):
   dx,dy=rays[i]; mx=int(128+dx*.55*scale+(i%3-1)*3*scale); my=int(128+dy*.55*scale)
   ex=128+dx*scale; ey=128+dy*scale
   line(d,[(128,128),(mx,my),(ex,ey)],WHITE if f<=4 else PALE,2 if i%4==0 else 1)
   line(d,[(128,128+1),(mx, my+1)],BLUE,1)
   # tiny fork near outer midsection
   bx=int(128+dx*.64*scale); by=int(128+dy*.64*scale)
   line(d,[(bx,by),(bx+int(-dy*.16),by+int(dx*.16))],PALE,1)
  # center fractured star
  star=[(128,112),(132,123),(143,119),(135,128),(144,135),(132,134),(128,145),(124,134),(112,138),(120,128),(113,120),(124,123)]
  core=[(128,119),(131,127),(137,127),(131,131),(128,138),(125,131),(119,128),(125,125)]
  poly(d,[(128+(x-128)*scale,128+(y-128)*scale) for x,y in star],PALE)
  poly(d,[(128+(x-128)*scale,128+(y-128)*scale) for x,y in core],WHITE)
 # shards burst out and descend
 for i in range(6):
  side=-1 if i%2 else 1
  dist=20+i*6+max(0,f-4)*9
  xx=128+side*dist; yy=128+(i%3-1)*18+max(0,f-5)*11
  if 15<xx<241 and 15<yy<241 and f>=3:
   col=PALE if f<6 else (74,163,255)
   poly(d,[(xx,yy-6),(xx+side*4,yy),(xx,yy+5),(xx-side*2,yy)],col)
 # dissipating remnant
 if f>=6:
  a={6:130,7:75,8:38}[f]
  for x,y in [(102,125),(151,132),(126,102)]:
   line(d,[(x,y),(x+4,y-4),(x+7,y-3)],PALE,1)
 return im

def sheet(name,count,grid,draw,fps,pivot):
 sheet=Image.new('RGBA',(grid[0]*W,grid[1]*H),(0,0,0,0))
 for n in range(1,count+1): sheet.alpha_composite(draw(n),(((n-1)%grid[0])*W,((n-1)//grid[0])*H))
 sheet.save(OUT/f'{name}.png')
 meta={'frames':count,'fps':fps,'frame_size':[W,H],'grid':list(grid),'order':'row-major','padding_px':0,'pivot':list(pivot)}
 (OUT/f'{name}.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
sheet('ice_crater',12,(4,3),make_crater,16,(128,214))
sheet('ice_crater_crack',8,(4,2),make_crack,18,(128,128))

