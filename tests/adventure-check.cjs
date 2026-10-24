/* Full campaign solver. Only public actions mutate game state; no stat, floor or flag edits. */
const fs=require('node:fs'),assert=require('node:assert/strict');global.window=global;require('../js/world.js');require('../js/engine.js');
const e=new TowerEngine(TowerData);e.newGame();
const build=process.env.TOWER_BUILD||'none',route=process.env.TOWER_ROUTE||'free',silk=process.env.TOWER_SILK||'atk',plan=process.env.BOSS_PLAN||'direct';
const record=[],summary=[],abilities=new Set(),dirs=TowerRules.directions;
function act(type,...args){const ok=e[type](...args);if(!ok){fs.writeFileSync(__dirname+'/upgrade-failed.json',JSON.stringify({state:e.state,recent:record.slice(-20)},null,2));throw new Error('Public action rejected '+type+' '+JSON.stringify(args)+' at floor '+(e.state.floor+1));}record.push({type,args});if(e.state.defeated)throw new Error('The player died');return ok;}
function blocked(a){return e.isBlocked(a);}
function pathTo(tx,ty,allowTarget=false){
 const s=e.state,q=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]);
 while(q.length){const c=q.shift();if(c.x===tx&&c.y===ty)return c.path;for(const [d,[dx,dy]]of Object.entries(dirs)){
  const x=c.x+dx,y=c.y+dy,k=x+','+y;if(seen.has(k)||e.getTile(x,y)!=='.')continue;seen.add(k);
  if(blocked(e.getEntity(x,y))&&!(allowTarget&&x===tx&&y===ty))continue;q.push({x,y,path:c.path.concat(d)});
 }}return null;
}
function walk(path){for(const d of path)act('step',d);return true;}
function reach(a,adjacent=false){const p=pathTo(a.x,a.y,true);if(!p)return false;if(adjacent&&p.length)p.pop();walk(p);return true;}
function deploy(a){let best=null;for(let y=1;y<e.dimensions().height-1;y++)for(let x=1;x<e.dimensions().width-1;x++)if(Math.abs(x-a.x)+Math.abs(y-a.y)<=4){const p=pathTo(x,y);if(p&&(!best||p.length<best.length))best={p};}if(!best)return false;walk(best.p);act('useAbility','clone',a.x,a.y);abilities.add('clone');return true;}
function refill(){if(e.state.mana===e.state.maxMana)return;const altar=TowerData.floors[e.state.floor].entities.find(a=>a.type==='altar'&&pathTo(a.x,a.y));assert.ok(altar);reach(altar);if(e.state.mana<e.state.maxMana)act('meditate');}
function journeyTo(floor){if(e.state.floor===floor)return;if(e.state.relics.includes(2)){if(e.state.mana<1)refill();act('travel',floor);return;}while(e.state.floor!==floor){const next=e.state.floor+(floor>e.state.floor?1:-1),stairs=TowerData.floors[e.state.floor].entities.find(a=>a.type==='stairs'&&a.to===next);assert.ok(stairs&&reach(stairs,true));act('traverse',stairs);}}
function explore(){
 let ticks=0;const tidesTried=new Set([e.state.tides.weakwater||'low']);
 while(++ticks<900){
  const s=e.state,f=TowerData.floors[s.floor],ents=f.entities.filter(a=>!s.removed[a.id]);
  const illusion=ents.find(a=>a.type==='illusion'&&!s.revealed[a.id]);if(illusion){act('reveal',illusion);continue;}
  const mechanism=ents.find(a=>e.requirements(a).met&&pathTo(a.x,a.y,true)&&(a.type==='rescue'&&!s.quests[a.quest]||a.type==='resonator'&&!s.switches[a.id]));
  if(mechanism){reach(mechanism,true);act(mechanism.type==='rescue'?'rescue':'activateResonator',mechanism);continue;}
  const loot=ents.filter(a=>['item','fragment','treasure'].includes(a.type)||a.type==='relic'&&e.requirements(a).met||a.type==='cache'&&s.choices[a.choice]||a.type==='chest'&&e.requirements(a).met).map(a=>({a,p:pathTo(a.x,a.y)})).filter(a=>a.p?.length).sort((a,b)=>a.p.length-b.p.length);
  if(loot.length){walk(loot[0].p);continue;}
  const lever=ents.find(a=>a.type==='switch'&&a.kind!=='plate'&&!s.switches[a.id]&&pathTo(a.x,a.y,true));
  if(lever){reach(lever,true);act('toggleSwitch',lever);continue;}
  const choices=ents.filter(a=>a.type==='choice'&&!s.choices[a.choice]&&!(a.requires>s.relics.length)&&pathTo(a.x,a.y,true));
  const choice=choices.find(a=>a.choice==='locks'?a.option===route:a.choice==='silk'?a.option===silk:true);
  if(choice){const option=choice.option||(choice.choice==='compassion'?'release':choice.choice==='sevenWounds'?(process.env.SEVEN_ROUTE||'rescue'):['bellVow','ferryVow','emberVow'].includes(choice.choice)?(process.env.VOW_ROUTE||'offering'):'offering');if(e.choicePreview(choice,option).possible){reach(choice,true);act('choose',choice,option);continue;}}
  const gear=(process.env.TOWER_GEAR||'iron,lotus').split(',').filter(id=>s.treasures.includes(id)).slice(0,2);
  if(gear.some(id=>!s.equipped.includes(id))||s.equipped.some(id=>!gear.includes(id))){const altar=ents.find(a=>a.type==='altar'&&pathTo(a.x,a.y));if(altar){reach(altar);for(const id of [...s.equipped])if(!gear.includes(id))act('equipTreasure',id);for(const id of gear)if(!s.equipped.includes(id))act('equipTreasure',id);continue;}}
  const purchase=build==='mixed'?(e.shopCost('atk')<=e.shopCost('def')?'atk':'def'):build;
  if(['atk','def'].includes(purchase)&&s.coins>=e.shopCost(purchase)){const a=ents.find(a=>a.type==='altar'&&pathTo(a.x,a.y));if(a){reach(a);act('shop',purchase);continue;}}
  if(s.mana<4){const a=ents.find(a=>a.type==='altar'&&pathTo(a.x,a.y));if(a){if(e.distance(a))reach(a);else act('meditate');continue;}}
  let changed=false;
  if(f.cloneLimit){
   const wanted=s.choices.silk?['silk-a','silk-b']:silk==='atk'?['silk-a','silk-c']:['silk-b','silk-c'];
   const extra=ents.find(a=>a.type==='switch'&&a.kind==='plate'&&s.switches[a.id]&&!wanted.includes(a.controlId));
   if(extra){act('recallClone',extra.id);continue;}
   const target=ents.find(a=>a.type==='switch'&&a.kind==='plate'&&wanted.includes(a.controlId)&&!s.switches[a.id]);
   if(target&&s.mana>=e.abilityCost('clone')&&e.cloneStatus().free>0&&deploy(target))continue;
  }else if(s.relics.includes(2)&&s.mana>=e.abilityCost('clone')){for(const a of ents.filter(a=>a.type==='switch'&&a.kind==='plate'&&!s.switches[a.id]))if(deploy(a)){changed=true;break;}if(changed)continue;}
  for(let y=1;y<e.dimensions().height-1&&!changed;y++)for(let x=1;x<e.dimensions().width-1&&!changed;x++){
   const tile=e.getTile(x,y),mode=tile==='~'?'staff':tile==='='?'morph':null;
   if(!mode||!s.relics.includes(mode==='staff'?0:1)||s.mana<e.abilityCost(mode))continue;
   let best=null;for(const [dx,dy]of Object.values(dirs)){const p=pathTo(x+dx,y+dy);if(p&&(!best||p.length<best.length))best={p};}
   if(best){walk(best.p);act('useAbility',mode,x,y);abilities.add(mode);changed=true;}
  }if(changed)continue;
  const fights=ents.filter(a=>a.type==='enemy'&&!(process.env.USE_RESCUE_BYPASS==='true'&&s.floor===14&&s.quests.sevenRescue&&a.enemy==='archivist')).map(a=>({a,p:pathTo(a.x,a.y,true),b:e.preview(a.enemy,{bossPlan:plan})})).filter(a=>a.p&&a.b.possible&&a.b.canAfford&&a.b.survive&&(TowerData.enemies[a.a.enemy].trait!=='boss'||s.relics.length===5)).sort((a,b)=>a.b.damage-b.b.damage||a.p.length-b.p.length);
  if(fights.length){const a=fights[0];reach(a.a,true);if(TowerData.enemies[a.a.enemy].trait==='boss')act('setBossPlan',plan);act('fight',a.a);continue;}
  const lethal=ents.some(a=>a.type==='enemy'&&e.preview(a.enemy,{bossPlan:plan}).possible&&!e.preview(a.enemy,{bossPlan:plan}).survive&&pathTo(a.x,a.y,true));
  if(lethal&&s.elixirs>0){act('useConsumable','elixir');continue;}
  if(lethal&&s.coins>=e.shopCost('heal')){const a=ents.find(a=>a.type==='altar'&&pathTo(a.x,a.y));if(a){reach(a);act('shop','heal');continue;}}
  const reserve=plan==='echoes'?2:plan==='anchor'?1:0;
  if(lethal&&s.orbs>reserve){const a=ents.find(a=>a.type==='altar'&&pathTo(a.x,a.y));if(a){reach(a);act('offerOrb','heal');continue;}}
  const doors=ents.filter(a=>a.type==='door'&&s.keys[a.color]>0&&pathTo(a.x,a.y,true));
  if(doors.length){reach(doors[0],true);act('openDoor',doors[0]);continue;}
  const tide=ents.find(a=>a.type==='tide'&&e.requirements(a).met&&pathTo(a.x,a.y,true));
  const next=(s.tides.weakwater||'low')==='low'?'high':'low';if(tide&&!tidesTried.has(next)){reach(tide,true);act('toggleTide',tide);tidesTried.add(next);continue;}
  break;
 }if(ticks>=900)throw new Error('Solver loop '+(e.state.floor+1));
}
let recalled=false;
for(let floor=0;floor<18;floor++){
 assert.equal(e.state.floor,floor);explore();const s=e.state;
 if(process.env.REVISIT_ALL==='true'){
  for(const r of TowerData.revisits.filter(r=>s.relics.includes(r.relic)&&r.floor!==floor)){
   const target=TowerData.floors[r.floor].entities.find(a=>a.x===r.x&&a.y===r.y);if(!target||s.removed[target.id])continue;
   journeyTo(r.floor);refill();explore();journeyTo(floor);if(s.keys.red>0)recalled=true;
  }
  explore();
 }
 if(s.relics.length===5&&!recalled){recalled=true;act('travel',0);explore();assert.ok(s.keys.red>0,'The true root key has been recovered');act('travel',floor);explore();}
 summary.push({floor:floor+1,name:TowerData.floors[floor].name,hp:s.hp,atk:s.atk,def:s.def,coins:s.coins,keys:{...s.keys},relics:s.relics.length,choices:{...s.choices},orbs:s.orbs});
 if(floor<17){const stair=TowerData.floors[floor].entities.find(a=>a.type==='stairs'&&a.to===floor+1);if(!reach(stair,true)){fs.writeFileSync(__dirname+'/upgrade-failed.json',JSON.stringify({summary,state:s},null,2));throw new Error('No route to exit floor '+(floor+1));}act('traverse',stair);}
}
const finale=TowerData.floors[17].entities.find(a=>a.type==='finale');if(!reach(finale,true)){fs.writeFileSync(__dirname+'/upgrade-failed.json',JSON.stringify({summary,state:e.state},null,2));throw new Error('Final lotus unreachable');}act('awakenSelf',finale);act('finish','release');assert.equal(e.state.won,true);assert.equal(e.state.visited.length,18);assert.equal(e.state.relics.length,5);assert.equal(e.state.externalRelics,16);assert.equal(e.state.selfAwakened,true);assert.equal(abilities.size,3);assert.equal(e.state.choices.locks,route);assert.equal(e.state.choices.silk,silk);
const result={build,route,silk,plan,summary,actions:record,final:{hp:e.state.hp,atk:e.state.atk,def:e.state.def,turn:e.state.turn,kills:e.state.kills,won:e.state.won,choices:e.state.choices,fragments:e.state.fragments,treasures:e.state.treasures,equipped:e.state.equipped,purchases:e.state.purchases,elixirsLeft:e.state.elixirs,orbsLeft:e.state.orbs,coins:e.state.coins}};
const filename=`playthrough-v5-${route}-${build}-${plan}-${process.env.VOW_ROUTE||'offering'}.json`;fs.writeFileSync(__dirname+'/'+filename,JSON.stringify(result,null,2));console.log(JSON.stringify({file:filename,actions:record.length,...result.final},null,2));
