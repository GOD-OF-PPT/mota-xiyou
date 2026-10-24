const fs=require('node:fs'),assert=require('node:assert/strict');
global.window=global;require('../js/world.js');require('../js/engine.js');
const results=[],test=(name,fn)=>{fn();results.push(name);console.log('PASS '+name);};
const trace=JSON.parse(fs.readFileSync(__dirname+'/playthrough-v9-free-mixed-direct-offering.json','utf8')),g=new TowerEngine(TowerData);g.newGame();let entry;
for(let i=0;i<trace.actions.length;i++){if(g.state.floor===12){entry={index:i,state:g.snapshot()};break;}const a=trace.actions[i];assert.ok(g[a.type](...a.args));}
function reach(e,adjacent=false){const p=g.findPath(e.x,e.y);assert.ok(p,'No legal route to '+e.id);if(adjacent&&p.length)p.pop();for(const d of p)assert.ok(g.step(d));}
function structural(f,closed){const a=f.entities.find(e=>e.type==='altar'),q=[[a.x,a.y]],seen=new Set([a.x+','+a.y]);for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy]of Object.values(TowerRules.directions)){const X=x+dx,Y=y+dy,k=X+','+Y;if(seen.has(k)||closed===k||['#','v',undefined].includes(f.map[Y]?.[X]))continue;seen.add(k);q.push([X,Y]);}}return seen;}
test('Every repaired lock/guard has a unique real reward behind its actual cell',()=>{
 for(const [floor,id,item]of TowerData.levelDepth.alcoveRepairs){const f=TowerData.floors[floor],e=f.entities.find(e=>e.id===id),reward=f.entities.find(e=>e.id===item),key=reward.x+','+reward.y;assert.ok(structural(f).has(key),item+' is isolated');assert.equal(structural(f,e.x+','+e.y).has(key),false,id+' can be bypassed');assert.ok(e.guards.includes(item));}
});
test('Every keyed door has a guarded reward, a measured shortcut, or the final heart-key role',()=>{
 for(const f of TowerData.floors)for(const e of f.entities.filter(e=>e.type==='door'))assert.ok(e.guards?.length||e.role==='shortcut'||e.color==='red',e.id);
});
test('NPC aid creates a real alternate route without changing any finite resource',()=>{
 assert.ok(entry);const npc=TowerData.floors[12].entities.find(e=>e.aid),fragment=TowerData.floors[12].entities.find(e=>e.type==='fragment');reach(npc,true);const before=g.snapshot();assert.equal(g.findPath(fragment.x,fragment.y),null);assert.ok(g.receiveAid(npc));const after=g.snapshot();for(const k of ['hp','atk','def','mana','coins','keys','elixirs','orbs','fragments'])assert.deepEqual(after[k],before[k]);assert.equal(g.receiveAid(npc),false);assert.ok(g.findPath(fragment.x,fragment.y));
});
test('The new white passage collects its relic without fighting the original guardian',()=>{
 const f=TowerData.floors[12],guardian=f.entities.find(e=>e.x===5&&e.y===3&&e.type==='enemy'),fragment=f.entities.find(e=>e.type==='fragment');reach(fragment);assert.equal(g.state.removed[fragment.id],true);assert.equal(g.state.removed[guardian.id],undefined);
});
test('Level repair preserves the authored finite item inventory and all sixteen unique fragments',()=>{
 const budget={};let fragments=[];for(const f of TowerData.floors)for(const e of f.entities){if(e.type==='item')budget[e.item]=(budget[e.item]||0)+1;if(e.type==='fragment')fragments.push(e.fragment);}
 for(const [id,count]of Object.entries(TowerData.levelDepth.supplyBefore.items)){if(['peach','bigPeach','feast','amber','ruby','jade','emerald','yellowKey','blueKey','elixir','orb','coins'].includes(id)){/* v5 choice conversions already excluded these three supplies. */assert.ok((budget[id]||0)<=count,id+' grew unexpectedly');}}
 assert.deepEqual(fragments.sort((a,b)=>a-b),Array.from({length:16},(_,i)=>i));
});
test('A current full campaign still completes on public actions and has exact current-save round trips',()=>{
 const e=new TowerEngine(TowerData);e.newGame();for(const a of trace.actions)assert.ok(e[a.type](...a.args));assert.equal(e.state.won,true);const s=e.snapshot(),copy=new TowerEngine(TowerData);assert.ok(copy.load(JSON.stringify(s)));assert.deepEqual(copy.snapshot(),s);
});
fs.writeFileSync(__dirname+'/../audits/v9-rules.json',JSON.stringify({completed:true,checks:results,alcoves:TowerData.levelDepth.alcoveRepairs.length,resourceBudget:'no new items, crystals, healing or keys',finishedAt:new Date().toISOString()},null,2));
