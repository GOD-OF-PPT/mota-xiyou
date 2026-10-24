/* Read-only research: replay existing legal traces in memory and save metrics.
   No browser interaction, live saves, gameplay edits or new balance assertions. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
global.window=global;require('../js/world');require('../js/engine');
const root=path.resolve(__dirname,'..'),data=TowerData;
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const count=(rows,fn)=>rows.reduce((out,row)=>(out[fn(row)]=(out[fn(row)]||0)+1,out),{});
const fields=['hp','atk','def','mana','coins','keys','removed','switches','quests','rescued','revealed','fragments','relics','terrain','treasures','equipped','orbs','elixirs','tides','purchases'];
const floors=data.floors.map((floor,i)=>({floor:i+1,name:floor.name,width:floor.map[0].length,height:floor.map.length,
 openFloorCells:floor.map.join('').split('').filter(c=>c==='.').length,entityTypes:count(floor.entities,e=>e.type),theme:floor.theme,
 mapHash:crypto.createHash('sha256').update(floor.map.join('\n')).digest('hex')}));
const routes=[];
for(const file of ['playthrough-v9-free-mixed-direct-offering.json','playthrough-v9-gold-def-anchor-offering.json']){
 const actions=JSON.parse(fs.readFileSync(path.join(__dirname,'../tests',file))).actions,g=new TowerEngine(data);g.newGame();
 let quietSteps=0,quietRevisits=0,run=0,maxRun=0,castMana=0,refills=0;const positions=new Set([`${g.state.floor}:${g.state.x}:${g.state.y}`]),equipment=[],byFloor={};
 for(let i=0;i<actions.length;i++){
  const a=actions[i],before=g.snapshot(),floor=before.floor+1;byFloor[floor]??={steps:0,quietSteps:0,nonStepActions:0};
  if(a.type==='useAbility')castMana+=g.abilityCost(a.args[0]);
  if(a.type==='equipTreasure')equipment.push({floor,args:a.args});
  if(!g[a.type](...a.args))throw Error(`Existing legal trace ${file} rejected at ${i}: ${a.type}`);
  const s=g.state,key=`${s.floor}:${s.x}:${s.y}`;
  if(a.type==='step'){
   byFloor[floor].steps++;const quiet=fields.every(k=>JSON.stringify(before[k])===JSON.stringify(s[k]));
   if(quiet){quietSteps++;byFloor[floor].quietSteps++;run++;maxRun=Math.max(maxRun,run);if(positions.has(key))quietRevisits++;}else run=0;
   if(s.mana>before.mana)refills++;
  }else {byFloor[floor].nonStepActions++;run=0;}
  positions.add(key);
 }
 const types=count(actions,a=>a.type);
 routes.push({file:'tests/'+file,sha256:hash('tests/'+file),totalEngineActions:actions.length,actionTypes:types,
 stepShare:types.step/actions.length,quietSteps,quietShare:quietSteps/actions.length,quietRevisits,maxConsecutiveQuietSteps:maxRun,
 spellKindSequence:actions.filter(a=>a.type==='useAbility').map(a=>a.args[0]),castManaSum:castMana,stepTriggeredRefills:refills,
 equipmentChanges:equipment,byFloor,final:{won:g.state.won,ending:g.state.ending,hp:g.state.hp,coins:g.state.coins,mana:g.state.mana,choices:g.state.choices}});
}
const all=data.floors.flatMap(f=>f.entities),enemies=all.filter(e=>e.type==='enemy');
const result={date:'2026-10-23',method:'Existing legal canonical traces replayed through current public engine methods in isolated Node memory. Counts are model actions, not physical clicks, seconds, optimality or player sentiment.',
 quietDefinition:{fieldsCompared:fields,excluded:['position','facing','turn','logs','UI state'],warning:'Unchanged resource/state fields do not imply meaningless movement: observation, route discovery and deliberate positioning can still matter.'},
 source:Object.fromEntries(['js/world.js','js/engine.js','js/ui.js','js/journey.js','js/tactics.js','js/presentation.js','index.html','css/experience.css','assets/material/manifest.json'].map(f=>[f,hash(f)])),
 summary:{floorCount:floors.length,uniqueMaps:new Set(floors.map(f=>f.mapHash)).size,entities:all.length,enemies:enemies.length,
 enemyTraits:count(enemies,e=>data.enemies[e.enemy].trait),altars:all.filter(e=>e.type==='altar').length,choiceGroups:Object.keys(data.choices),
 treasures:Object.keys(data.treasures),activeAbilitiesLearnedAtFloors:[3,6,9],laterRelics:['floor12 passive ward','floor15 final-key return requirement'],
 twoTraceSpellKindSequencesEqual:JSON.stringify(routes[0].spellKindSequence)===JSON.stringify(routes[1].spellKindSequence)},floors,routes,
 researchBoundary:['No new UI or blind playtest in this research pass','Existing trace success does not prove all legal branches are balanced or softlock-free','Two authored traces are not representative human behaviour','Gameplay files and live browser save are unchanged']};
fs.writeFileSync(path.join(__dirname,'playability-v20-metrics.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({summary:result.summary,routes:routes.map(r=>({file:r.file,actions:r.totalEngineActions,steps:r.actionTypes.step,stepPercent:+(r.stepShare*100).toFixed(2),quietSteps:r.quietSteps,quietPercent:+(r.quietShare*100).toFixed(2),quietRevisits:r.quietRevisits,longestQuietRun:r.maxConsecutiveQuietSteps,equipmentChanges:r.equipmentChanges.length,casts:r.spellKindSequence.length,mana:r.castManaSum,refills:r.stepTriggeredRefills,final:r.final}))},null,2));
