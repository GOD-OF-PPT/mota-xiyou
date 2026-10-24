const assert=require('node:assert/strict');
function actor(data){const g=new TowerEngine(data,{persist:false});g.newGame();g.actions=[];return g;}
function act(g,type,...args){const before=g.state.turn,result=g[type](...args);assert.ok(result!==false&&(g.state.turn>before||type==='setBossPlan'),type+' '+JSON.stringify(args)+' at '+g.state.floor+':'+g.state.x+','+g.state.y);g.actions.push({type,args});return result;}
function walk(g,x,y,near=false){const route=g.findPath(x,y);assert.ok(route,'No legal path to '+x+','+y);if(near&&route.length)route.pop();for(const d of route)act(g,'step',d);}
function entity(g,id){return g.data.floors[g.state.floor].entities.find(e=>e.id===id);}
function fight(g,id){const e=entity(g,id);if(g.state.removed[id])return;walk(g,e.x,e.y,true);assert.ok(g.preview(e.enemy).survive,'Lethal '+id+' '+g.state.hp);act(g,'fight',e);}
function collect(g,id){const e=entity(g,id);if(!g.state.removed[id])walk(g,e.x,e.y);}
function use(g,kind,id){const e=entity(g,id);if(kind==='clone'){const r=TowerPlanning.route(g,e,4);assert.ok(r);for(const d of r)act(g,'step',d);act(g,'useAbility','clone',e.x,e.y);}else{walk(g,e.x,e.y,true);act(g,kind,e);}}
function toChoice(group,data,{saveYellow=false}={}){const g=actor(data),trace=require('../tests/playthrough-v9-free-mixed-direct-offering.json').actions;for(let i=0;i<trace.length;i++){const a=trace[i];if(a.type==='choose'&&a.args[0].choice===group)return g;if(saveYellow&&i>=103&&i<=107)continue;act(g,a.type,...a.args);}throw Error('No choice '+group);}
function vector(s){return {hp:s.hp,atk:s.atk,def:s.def,mana:s.mana,coins:s.coins,orbs:s.orbs,elixirs:s.elixirs,keys:{...s.keys},rescued:[...s.rescued]};}
// Authoring helper only: find a candidate, then execute every paid action legally.
function go(g,x,y,near=false){const q=[{x:g.state.x,y:g.state.y,cost:0,path:[]}],best=new Map(),s=g.state;let chosen=null;
 while(q.length){q.sort((a,b)=>a.cost-b.cost);const p=q.shift(),key=p.x+','+p.y;if(best.has(key))continue;best.set(key,p.cost);if(Math.abs(p.x-x)+Math.abs(p.y-y)<=(near?1:0)){chosen=p.path;break;}
  for(const [dir,[dx,dy]]of Object.entries(TowerRules.directions)){const nx=p.x+dx,ny=p.y+dy,t=g.getTile(nx,ny),e=g.getEntity(nx,ny);let extra=0;if(['#','w','v'].includes(t))continue;if(t==='~'||t==='='){if(!s.relics.includes(t==='~'?0:1))continue;extra=5;}
   if(e?.type==='enemy'){const a=g.preview(e.enemy);if(!a.possible)continue;extra+=a.damage;}
   else if(e?.type==='door'){if(!s.keys[e.color]&&!(e.morphable&&s.relics.includes(1)))continue;extra+=20;}
   else if(e&&g.isBlocked(e)&&e.type!=='illusion')continue;
   q.push({x:nx,y:ny,cost:p.cost+1+extra,path:p.path.concat(dir)});
  }
 }assert.ok(chosen,'No authored route to '+x+','+y);
 for(const dir of chosen){const [dx,dy]=TowerRules.directions[dir],nx=g.state.x+dx,ny=g.state.y+dy,t=g.getTile(nx,ny),e=g.getEntity(nx,ny);
  if(t==='~'||t==='=')act(g,'useAbility',t==='~'?'staff':'morph',nx,ny);
  if(e?.type==='illusion'&&!g.state.revealed[e.id])act(g,'reveal',e);
  if(e?.type==='enemy'){if(!g.preview(e.enemy).survive&&g.state.elixirs)act(g,'useConsumable','elixir');if(!g.preview(e.enemy).survive){const lamp=g.data.floors[g.state.floor].entities.find(a=>a.type==='altar'),path=lamp&&TowerPlanning.route(g,lamp,0),back={up:'down',down:'up',left:'right',right:'left'};if(path&&g.state.coins>=g.shopCost('heal')){for(const d of path)act(g,'step',d);while(!g.preview(e.enemy).survive&&g.state.coins>=g.shopCost('heal'))act(g,'shop','heal');for(const d of [...path].reverse())act(g,'step',back[d]);}}assert.ok(g.preview(e.enemy).survive,'Lethal route '+e.id);act(g,'fight',e);}
  if(e?.type==='door'){if(g.state.keys[e.color])act(g,'openDoor',e);else act(g,'useAbility','morph',nx,ny);}
  act(g,'step',dir);
 }
}
module.exports={actor,act,walk,entity,fight,collect,use,toChoice,vector,go};
