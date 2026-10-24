const fs=require('node:fs');
global.window=global;require('../js/world.js');
const dirs=[[0,-1],[1,0],[0,1],[-1,0]],key=(x,y)=>x+','+y;
function flood(f,blocked){
 const start=f.entities.find(e=>e.type==='altar'),q=[[start.x,start.y]],dist=new Map([[key(start.x,start.y),0]]);
 for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy]of dirs){const X=x+dx,Y=y+dy,k=key(X,Y);if(dist.has(k)||['#','v',undefined].includes(f.map[Y]?.[X])||k===blocked)continue;dist.set(k,dist.get(key(x,y))+1);q.push([X,Y]);}}
 return dist;
}
const report=TowerData.floors.map(f=>{
 const open=flood(f),barriers=f.entities.filter(e=>['door','gate','seal','enemy'].includes(e.type)).map(e=>{
  const closed=flood(f,key(e.x,e.y)),behind=f.entities.filter(a=>!['enemy','npc','monument','door','gate','seal'].includes(a.type)&&a.id!==e.id&&open.has(key(a.x,a.y))&&!closed.has(key(a.x,a.y)));
  const neighbors=dirs.map(([dx,dy])=>f.map[e.y+dy]?.[e.x+dx]||'#').join('');
  return {id:e.id,type:e.type,x:e.x,y:e.y,neighbors,label:e.label||e.enemy,role:e.role,behind:behind.map(a=>({id:a.id,type:a.type,item:a.item,fragment:a.fragment})),detour:Math.max(0,...f.entities.filter(a=>a.type==='item'||a.type==='stairs').map(a=>(closed.get(key(a.x,a.y))||0)-(open.get(key(a.x,a.y))||0)))};
 });return {floor:f.id+1,barriers,npcs:f.entities.filter(e=>e.type==='npc').map(e=>({id:e.id,dialogue:e.dialogue,x:e.x,y:e.y}))};
});
const out=process.argv[2];if(out)fs.writeFileSync(out,JSON.stringify(report,null,2));
for(const f of report){console.log('F'+f.floor,JSON.stringify(f.barriers.filter(e=>e.type!=='enemy')));console.log('unassigned enemies',f.barriers.filter(e=>e.type==='enemy'&&!e.behind.length&&!e.role).map(e=>e.id+'@'+e.x+','+e.y).join(' '));}
