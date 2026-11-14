const C={};CLASSES.forEach(c=>C[c.id]=c);
const $=(s,r=document)=>r.querySelector(s);
const hashOf=()=>Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map(p=>p.split('=').length>1?p.split('='):[p,'1']));
const av=id=>`img/av/${id}.webp`;
function card(c,extra=''){
 const a=c.attr;
 return `<div class="hc" data-card="${c.id}"><div class="top"><img class="pt" src="${av(c.id)}" alt=""><div><h3>${c.name}</h3><div class="role"><span class="dot" style="background:${c.color}"></span>${c.role}</div><div class="rg">Range ${c.range}</div></div></div>
 <div class="bl">${c.blurb}</div>
 <div class="st"><span><img src="img/stat/str.webp" alt="">${a.str}</span><span><img src="img/stat/dex.webp" alt="">${a.dex}</span><span><img src="img/stat/int.webp" alt="">${a.int}</span><span><img src="img/stat/luck.webp" alt="">${a.luck}</span></div>
 <div class="sk pas"><img src="img/ic/${c.passive.icon}.webp" alt=""><div><div class="n">${c.passive.name}</div><div class="c">Passive. ${c.passive.text}</div></div></div>
 ${c.skills.map(s=>`<div class="sk"><img src="img/ic/${s.icon}.webp" alt=""><div><div class="n">${s.name}</div><div class="c">${s.cost}</div></div></div>`).join('')}${extra}</div>`;
}
function tile(c,on){return `<div class="tile${on?' on':''}" data-tile="${c.id}"><img src="${av(c.id)}" alt=""><span class="nm">${c.name}</span><span class="dot" style="background:${c.color}"></span></div>`}
function bindSwitch(group,get,set){
 document.querySelectorAll(`[data-sw="${group}"] button`).forEach(b=>{b.classList.toggle('on',b.dataset.v===get());b.onclick=()=>{set(b.dataset.v)}});
}
