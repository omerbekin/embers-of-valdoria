import sharp from 'sharp'; import { readdirSync } from 'node:fs';
const [dir, out, every='4', scale='0.3'] = process.argv.slice(2);
const fs = readdirSync(dir).filter(f=>/^f\d+\.png$/.test(f)).sort().filter((f,i)=>i%+every===0);
const m = await sharp(`${dir}/${fs[0]}`).metadata(); const w=Math.round(m.width*+scale), h=Math.round(m.height*+scale);
const cols=4; const comps=[];
for (const [i,f] of fs.entries()) { comps.push({input: await sharp(`${dir}/${f}`).resize(w,h).png().toBuffer(), left:(i%cols)*(w+4), top:Math.floor(i/cols)*(h+24)+20});
 comps.push({input:Buffer.from(`<svg width="200" height="20" xmlns="http://www.w3.org/2000/svg"><text x="2" y="16" font-size="16" fill="#ff0">${f}</text></svg>`),left:(i%cols)*(w+4),top:Math.floor(i/cols)*(h+24)}); }
await sharp({create:{width:cols*(w+4),height:Math.ceil(fs.length/cols)*(h+24),channels:4,background:'#000'}}).composite(comps).png().toFile(out);
console.log(m.width,m.height,fs.length);
