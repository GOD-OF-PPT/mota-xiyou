/* Legal v6 acceptance checkpoints come exclusively from a complete public-action
   trace. No coordinate, resource, quest or inventory field is injected. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
global.window=global;require('../js/world.js');require('../js/engine.js');

function prepare(trace='playthrough-v5-free-mixed-direct-bypasses.json'){
  const record=JSON.parse(fs.readFileSync(path.join(__dirname,trace),'utf8'));
  const game=new TowerEngine(TowerData);game.newGame();
  const checkpoints=[],floors={},crossedVowGates=new Set();
  let firstFight=null,firstDoor=null;
  for(let i=0;i<record.actions.length;i++){
    const action=record.actions[i],before=game.snapshot();
    let type=action.type,target=action.args[0];
    if(type==='step'){
      const [dx,dy]=TowerRules.directions[target],entity=game.getEntity(before.x+dx,before.y+dy);
      if(entity?.type==='gate'&&entity.requiresQuests?.some(q=>['bellPassage','ferryPassage','emberPassage'].includes(q)))crossedVowGates.add(entity.id);
      if(entity&&['fragment','treasure'].includes(entity.type)){type=entity.type;target=entity;}
    }
    assert.ok(game[action.type](...action.args),`Public trace rejected at ${i}: ${action.type}`);
    const after=game.snapshot(),cp={i,type,target,args:action.args,floor:before.floor,before,after};
    if(type==='fight'&&!firstFight)firstFight=cp;
    if(type==='openDoor'&&!firstDoor)firstDoor=cp;
    if(['fragment','treasure','reveal','activateResonator','rescue','toggleTide','choose','equipTreasure','recallClone','setBossPlan','awakenSelf','finish','traverse','offerOrb'].includes(type))checkpoints.push(cp);
    if(!floors[before.floor])floors[before.floor]=before;
  }
  assert.equal(game.state.won,true);assert.equal(game.state.externalRelics,16);
  assert.equal(game.state.visited.length,18);assert.equal(game.state.treasures.length,6);
  // The same formal load path used by the browser must preserve current saves.
  const loader=new TowerEngine(TowerData);
  for(const cp of [firstFight,firstDoor,...checkpoints]){
    if(!cp)continue;assert.equal(loader.load(JSON.stringify(cp.before)),true);
    assert.deepEqual(loader.snapshot(),cp.before,`Current-save round trip changed ${cp.type} at ${cp.i}`);
  }
  return {record,actions:record.actions,checkpoints,floors,firstFight,firstDoor,
    crossedVowGates:[...crossedVowGates],final:game.snapshot()};
}
module.exports={prepare};
if(require.main===module){
  const run=prepare(),counts={};for(const cp of run.checkpoints)counts[cp.type]=(counts[cp.type]||0)+1;
  const result={trace:'playthrough-v5-free-mixed-direct-bypasses.json',publicActions:run.actions.length,
    checkpointCounts:counts,currentSaveRoundTrips:run.checkpoints.length+2,crossedVowGates:run.crossedVowGates,
    final:{floor:run.final.floor+1,visited:run.final.visited.length,fragments:run.final.fragments.length,
      treasures:run.final.treasures.length,won:run.final.won,hp:run.final.hp,atk:run.final.atk,def:run.final.def}};
  fs.writeFileSync(path.join(__dirname,'../audits/v6-legal-checkpoint-preparation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
