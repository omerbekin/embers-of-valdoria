from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path
import math, json
O=Path(__file__).resolve().parent
ROOT=O.parents[3]
W=(255,255,255,255); C=(255,243,200,255); P=(246,221,148,255); G=(230,193,98,255); D=(107,76,28,255)
def seal(f):
 im=Image.new('RGBA',(180,66)); px=im.load(); cx,cy=89.5,32.5
 for y in range(1,65):
  for x in range(1,179):
   r=math.hypot((x-cx)/88.5,(y-cy)/31.5); a=math.atan2((y-cy)/31.5,(x-cx)/88.5)
   if r<.89: px[x,y]=(*P[:3],80 if f==4 else 32)
   if .52<r<.57: px[x,y]=W if f==4 else G
   if .84<r<1:
    if f==5:
     t=(a+math.pi)%(math.pi/4)
     if .12<t<.58: px[x,y]=C if .89<r<.96 else P
    elif r<.87 or r>.97: px[x,y]=D
    else: px[x,y]=W if f==4 else (C if y<cy else G)
   if f==4 and .78<r<.83: px[x,y]=P
 dr=ImageDraw.Draw(im)
 def motif(x,y, faded=False):
  col=P if faded else (W if f==4 else C)
  pts=[(x-10,y+6),(x-10,y-6),(x-5,y-2),(x,y-7),(x+5,y-2),(x+10,y-6),(x+10,y+6)]
  dr.polygon(pts,fill=D); dr.polygon([(x-9,y+5),(x-9,y-4),(x-5,y),(x,y-5),(x+5,y),(x+9,y-4),(x+9,y+5)],fill=col)
  dr.polygon([(x,y-3),(x-2,y+2),(x,y+3),(x+2,y+1)],fill=G if not faded else C)
  dr.line((x-7,y+4,x+7,y+4),fill=D)
 phase=(f%4)*math.pi/8 if f<4 else 0
 for i in range(4):
  a=-math.pi/2+i*math.pi/2+phase
  motif(round(cx+65*math.cos(a)),round(cy+22*math.sin(a)),f==5)
 # Fixed hearth emblem, separately outlined.
 col=P if f==5 else (W if f==4 else C)
 dr.polygon([(76,33),(103,33),(99,41),(80,41)],fill=D); dr.polygon([(78,34),(101,34),(98,39),(81,39)],fill=col)
 dr.polygon([(79,32),(81,22),(85,27),(89,20),(94,27),(99,22),(101,32)],fill=D)
 dr.polygon([(81,31),(82,25),(85,29),(89,22),(94,29),(98,25),(99,31)],fill=col)
 dr.polygon([(89,25),(86,30),(89,32),(92,30)],fill=G)
 if f==5:
  for x,y in [(38,20),(143,45),(57,51),(122,13),(90,47)]: dr.point((x,y),fill=W)
 return im

def column(f):
 phase=2*math.pi*f/6
 s=round(3*math.sin(phase)); t=round(2*math.cos(phase))
 mask=Image.new('L',(80,240)); d=ImageDraw.Draw(mask)
 # Broad base and five separated tongues. Side flares break the lower silhouette.
 d.polygon([(4,239),(5,226),(2,219),(9,222),(7,210),(11,197),(9,186),(14,171),(13,158),(19,140),(61,140),(67,157),(65,170),(71,185),(69,198),(74,209),(72,221),(78,216),(76,229),(76,239)],fill=255)
 tongues=[[(17,148),(15,131),(18,116),(17+s,102),(21+s,90),(22+s,109),(26,121),(27,145)],[(25,145),(24,126),(27,109),(25+t,91),(29+t,65),(31+t,87),(34,105),(35,145)],[(34,145),(33,120),(36,97),(34+s,73),(39+s,38),(38+s,24),(40+s,10),(43+s,30),(42+s,56),(46,80),(45,108),(47,145)],[(45,145),(47,119),(50,102),(48-t,81),(53-t,58),(55-t,83),(58,102),(56,124),(59,145)],[(55,145),(57,123),(60,108),(59-s,91),(64-s,80),(63-s,103),(67,118),(65,133),(64,148)]]
 for pts in tongues: d.polygon(pts,fill=255)
 inner=mask.filter(ImageFilter.MinFilter(3))
 inner2=mask.filter(ImageFilter.MinFilter(9))
 im=Image.new('RGBA',(80,240)); im.paste(D,(0,0,80,240),mask); im.paste(G,(0,0,80,240),inner); im.paste(P,(0,0,80,240),inner2)
 dr=ImageDraw.Draw(im)
 # Nested, independently pointed tongues reveal the flame inside the silhouette.
 dr.polygon([(15,239),(17,222),(15,213),(20,202),(19,190),(23,181),(22,171),(27,160),(26,149),(30,137),(30,126),(34,115),(35,103),(39+s,83),(41+s,105),(44,119),(44,132),(49,143),(48,154),(53,166),(52,177),(57,190),(56,203),(62,215),(64,239)],fill=C)
 dr.polygon([(22,239),(23,224),(21,215),(25,204),(24,192),(28,181),(27,169),(31,158),(31,148),(35,137),(35,126),(39+t,111),(41+t,128),(45,140),(45,151),(49,163),(48,175),(53,188),(52,201),(57,215),(58,239)],fill=P)
 dr.polygon([(26,239),(27,226),(25,217),(29,207),(28,196),(32,185),(31,174),(35,163),(35,153),(39+s,138),(41+s,153),(44,164),(44,175),(48,187),(47,198),(51,210),(53,224),(53,239)],fill=W)
 for i,(x,y) in enumerate([(10,73),(25,38),(56,34),(70,69),(50,17)]):
  y-=((f*3+i*3)%15); x+=round(2*math.sin(phase+i)); size=3+i%2
  dr.rectangle((x-1,y-1,x+size,y+size),fill=D); dr.rectangle((x,y,x+size-1,y+size-1),fill=W if i%2==0 else C)
 return im

def save(name,images):
 w,h=images[0].size; sheet=Image.new('RGBA',(w*len(images),h))
 for i,im in enumerate(images): sheet.paste(im,(w*i,0))
 sheet.save(O/(name+'.png')); (O/(name+'.json')).write_text(json.dumps(dict(frames=len(images),fps=18,frame_size=[w,h],sheet_size=list(sheet.size),grid=[len(images),1],order='row-major',padding_px=0),indent=2)+'\n',encoding='utf-8')
 return sheet
s=Image.open(O/'seal.png').convert('RGBA'); c=save('column',[column(i) for i in range(6)])
p=Image.new('RGBA',(max(s.width,c.width)*4,(s.height+c.height)*4))
p.paste(s.resize((s.width*4,s.height*4),Image.Resampling.NEAREST),(0,0)); p.paste(c.resize((c.width*4,c.height*4),Image.Resampling.NEAREST),(0,s.height*4)); p.save(O/'preview.png')
# Compare both new flame frames against sand and a brighter ground at game scale.
p=Image.new('RGB',(900,780),'#b08a58'); d=ImageDraw.Draw(p)
d.rectangle((0,390,899,779),fill='#e8d8b0')
try: font=ImageFont.truetype('arial.ttf',20)
except OSError: font=ImageFont.load_default()
def put(sheet,idx,sz,dest,out):
 w,h=sz; part=sheet.crop((idx*w,0,(idx+1)*w,h)).resize(out,Image.Resampling.NEAREST); p.paste(part,dest,part)
for y,label in [(10,'Kum zemini'),(400,'A\u00e7\u0131k zemin')]:
 d.text((15,y),label,fill=(42,29,14),font=font)
 for idx,x in [(0,180),(3,400),(5,620)]:
  put(c,idx,(80,240),(x,y+35),(100,300)); d.text((x,y+340),f'Alev {idx}',fill=(42,29,14),font=font)
p.save(O/'preview-1x.png')
