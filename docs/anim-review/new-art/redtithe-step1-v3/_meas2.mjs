import sharp from 'sharp';
for (const f of process.argv.slice(2)) { const {data,info}=await sharp(f).ensureAlpha().raw().toBuffer({resolveWithObject:true}); const W=info.width,H=info.height;
 let y0=H,y1=-1; for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(data[(y*W+x)*4+3]>60){if(y<y0)y0=y;if(y>y1)y1=y;}
 const h=y1-y0+1; const fx=(a,b)=>{let m=0;for(let y=Math.round(y0+a*h);y<Math.round(y0+b*h);y++)for(let x=W-1;x>=0;x--)if(data[(y*W+x)*4+3]>60){m+=x;break;}return m/(Math.round(y0+b*h)-Math.round(y0+a*h));};
 console.log(f.split('/').slice(-2).join('/').padEnd(28), 'foot', y1, 'top', y0, 'faceFront', fx(0.05,0.11).toFixed(0)); }
