/* Regression reproduction uses only an existing public campaign trace and
   public walking, orb offerings and cloud travel. No state assignments. */
const fs=require('node:fs'),assert=require('node:assert/strict');
global.window=global;require('../js/world.js');require('../js/engine.js');
const e=new TowerEngine(TowerData);e.newGame();
const trace=JSON.parse(fs.readFileSync('tests/playthrough-v4-free-mixed-direct.json','utf8')).actions;
let replayed=0;for(const a of trace){if(a.type==='traverse'&&a.args[0].to===11&&e.state.floor===10)break;assert.ok(e[a.type](...a.args),'trace action '+replayed+' '+a.type);replayed++;}
const floor=TowerData.floors[10],altar=floor.entities.find(a=>a.type==='altar'),stairs=floor.entities.find(a=>a.type==='stairs'&&a.to===11),plate=floor.entities.find(a=>a.controlId==='silk-a');
const actions=[];function act(type,...args){assert.ok(e[type](...args),type+' '+JSON.stringify(args));actions.push({type,args});}
function walk(path){assert.ok(path,'safe path must exist');for(const d of path)act('step',d);}
assert.equal(e.state.floor,10);walk(e.findPath(altar.x,altar.y));while(e.state.orbs>0)act('offerOrb','heal');
for(let i=0;i<3;i++){act('travel',9);act('travel',10);}assert.equal(e.state.mana,0);assert.equal(e.state.orbs,0);
walk(e.findPath(stairs.x,stairs.y));const before=JSON.stringify(e.state),accepted=e.recallClone(plate.id),after=JSON.stringify(e.state);
assert.equal(accepted,false,'must refuse to close the only usable staircase while trapping a player');assert.equal(after,before,'refused recall must preserve all flags and resources');
assert.equal(e.requirements(stairs).met,true);assert.ok(e.findPath(altar.x,altar.y),'lantern retreat remains open');
const result={timestamp:new Date().toISOString(),replayedPublicActions:replayed,additionalPublicActions:actions.length,fixture:{floor:11,x:e.state.x,y:e.state.y,mana:e.state.mana,orbs:e.state.orbs},refusedRecall:true,unchangedState:true,usableStaircase:true,lanternRetreatOpen:true};
console.log(JSON.stringify(result,null,2));
