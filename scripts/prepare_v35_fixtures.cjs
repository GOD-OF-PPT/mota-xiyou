/* Campaign prefixes and a branch leaving optional healing, without state edits. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.window=global;for(const f of ['world','encounters','chronicle','outcomes','engine'])require('../js/'+f);
const root=path.resolve(__dirname,'..'),out=root+'/audits/v35-fixtures',records={},trace=require('../tests/playthrough-v28-free-mixed-direct.json').actions;
fs.mkdirSync(out,{recursive:true});
function save(name,g,target,source){const raw=g.exportSave(),file='audits/v35-fixtures/'+name+'.json';fs.writeFileSync(root+'/'+file,raw);records[name]={file,target,source,hp:g.state.hp,preview:g.preview(target.enemy),sha256:crypto.createHash('sha256').update(raw).digest('hex')};}
const g=new TowerEngine(TowerData,{persist:false});g.newGame();save('distant',g,g.data.floors[0].entities.find(e=>e.id==='f0-4'),{newGame:true});
for(let i=0;i<trace.length;i++){
 for(const e of g.data.floors[g.state.floor].entities){if(e.type!=='enemy'||!g.isCurrent(e)||g.distance(e)!==1)continue;const p=g.preview(e.enemy),kind=TowerData.enemies[e.enemy].trait==='boss'?'boss':p.possible&&p.survive?(p.damage===0?'zero':'safe'):null;if(kind&&!records[kind])save(kind,g,e,{prefixActions:i});}

 const a=trace[i];assert.notEqual(g[a.type](...a.args),false,'original legal prefix '+i);
}
function safePath(g,x,y){
 const s=g.state,q=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]);
 for(let i=0;i<q.length;i++){const c=q[i];if(c.x===x&&c.y===y)return c.path;for(const [dir,[dx,dy]]of Object.entries(TowerRules.directions)){const nx=c.x+dx,ny=c.y+dy,key=nx+','+ny,e=g.getEntity(nx,ny);if(seen.has(key)||g.getTile(nx,ny)!=='.'||g.isBlocked(e)||e&&['item','chest','cache','fragment','treasure','relic','choice','rescue','finale'].includes(e.type))continue;seen.add(key);q.push({x:nx,y:ny,path:c.path.concat(dir)});}}
 return null;
}
const branch=new TowerEngine(TowerData,{persist:false});branch.newGame();const detours=[];let fatal;
for(let i=0;i<trace.length;i++){
 const a=trace[i],next=trace[i+1];
 if(a.type==='step'&&next?.type==='step'){
  const [dx,dy]=TowerRules.directions[a.args[0]],[ex,ey]=TowerRules.directions[next.args[0]],x=branch.state.x+dx,y=branch.state.y+dy,e=branch.getEntity(x,y);
  if(e?.type==='item'&&TowerData.items[e.item].kind==='hp'){
   const walk=safePath(branch,x+ex,y+ey);
   if(walk){for(const d of walk)assert.ok(branch.step(d));detours.push({originalIndex:i,omittedHealing:e.id,originalSteps:[a,next],legalSteps:walk});i++;continue;}
  }
 }
 if(a.type==='fight'){
  const e=branch.data.floors[branch.state.floor].entities.find(e=>e.id===a.args[0].id),p=branch.preview(e.enemy);
  if(p.possible&&!p.survive){fatal={e,source:{sourceTrace:'tests/playthrough-v28-free-mixed-direct.json',stopBeforeAction:i,healingDetours:detours}};break;}
 }
 assert.notEqual(branch[a.type](...a.args),false,'legal reduced-healing branch '+i);
}
assert.ok(fatal,'a route that leaves optional healing must produce a real lethal preview');save('fatal',branch,fatal.e,fatal.source);
assert.ok(g.state.won);assert.ok(['safe','zero','boss','fatal','distant'].every(k=>records[k]));fs.writeFileSync(out+'/manifest.json',JSON.stringify({records,originalCampaignActions:trace.length},null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(records).map(([k,v])=>[k,{hp:v.hp,damage:v.preview.damage,target:v.target.id}]))));
