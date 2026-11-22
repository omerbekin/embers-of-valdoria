import sharp from 'sharp';
const files = process.argv.slice(2);
async function meas(f){ const {data,info}=await sharp(f).ensureAlpha().raw().toBuffer({resolveWithObject:true}); const W=info.width,H=info.height;
 let y0=H,y1=-1; for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(data[(y*W+x)*4+3]>60){if(y<y0)y0=y;if(y>y1)y1=y;}
 const h=y1-y0+1;
 // baş: ilk %12 bant ağırlık merkezi; kalça: %48-%54 bandında en uzun opak koşunun ortası (kollar hariç gövde)
 const band=(a,b)=>{let sx=0,n=0;for(let y=Math.round(y0+a*h);y<Math.round(y0+b*h);y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>60){sx+=x;n++;}return sx/n;};
 const run=(a,b)=>{let acc=0,k=0;for(let y=Math.round(y0+a*h);y<Math.round(y0+b*h);y++){let best=[0,0],cs=-1;for(let x=0;x<=W;x++){const o=x<W&&data[(y*W+x)*4+3]>60;if(o&&cs<0)cs=x;if(!o&&cs>=0){if(x-cs>best[1]-best[0])best=[cs,x];cs=-1;}}acc+=(best[0]+best[1])/2;k++;}return acc/k;};
 const head=band(0,0.10), hip=run(0.42,0.48);
 return {f:f.split('/').slice(-2).join('/'),top:y0,h,head:+head.toFixed(1),hip:+hip.toFixed(1),lean:+(Math.atan2(head-hip,(0.45-0.05)*h)*180/Math.PI).toFixed(1)};}
for(const f of files) console.log(JSON.stringify(await meas(f)));
