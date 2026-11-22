import sharp from 'sharp';
const [out, crop, k, ...files] = process.argv.slice(2);
const [l,t,w,h] = crop.split(',').map(Number); const K=+k;
const comps=[]; let x=0;
for (const f of files){ comps.push({input: await sharp(f).flatten({background:'#556'}).extract({left:l,top:t,width:w,height:h}).resize(w*K,h*K,{kernel:'nearest'}).png().toBuffer(), left:x, top:30});
 comps.push({input:Buffer.from(`<svg width="${w*K}" height="30" xmlns="http://www.w3.org/2000/svg"><text x="4" y="22" font-size="20" fill="#fff">${f.split('/').pop()}</text></svg>`),left:x,top:0}); x+=w*K+6;}
await sharp({create:{width:x,height:h*K+30,channels:4,background:'#222'}}).composite(comps).png().toFile(out);
