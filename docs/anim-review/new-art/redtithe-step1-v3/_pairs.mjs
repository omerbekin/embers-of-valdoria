import sharp from 'sharp';
const [out, ...cls] = process.argv.slice(2);
const comps=[]; let x=0; const H=480;
for (const c of cls) { for (const n of ['idle1','step1']) { const f=`assets/poses/${c}/${n}.png`; const m=await sharp(f).metadata();
  comps.push({input: await sharp(f).flatten({background:'#556'}).png().toBuffer(), left:x, top:0});
  comps.push({input: Buffer.from(`<svg width="300" height="30" xmlns="http://www.w3.org/2000/svg"><text x="5" y="22" font-size="20" fill="#fff">${c} ${n}</text></svg>`), left:x, top:H-30}); x+=m.width+6; } x+=20; }
await sharp({create:{width:x,height:H,channels:4,background:'#222'}}).composite(comps).png().toFile(out);
