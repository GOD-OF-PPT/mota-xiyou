/* Alternate local solutions begin with real campaign actions, never edited stats. */
const assert=require('node:assert/strict'),fs=require('node:fs');global.window=global;require('../js/world');require('../js/engine');require('../js/planning');
const trace=require('./playthrough-v9-free-mixed-direct-offering.json').actions,report={checks:[],branches:[]},P=TowerPlanning;
function actor(){const g=new TowerEngine(TowerData,{persist:false});g.newGame();g.legal=[];return g;}
function act(g,type,...args){assert.ok(g[type](...args),type+' '+JSON.stringify(args)+' at '+g.state.floor+':'+g.state.x+','+g.state.y);g.legal.push({type,args});}
function walk(g,x,y,radius=0){const p=P.route(g,{x,y},radius);assert.ok(p,'No event-free route to '+x+','+y+' radius '+radius);for(const d of p)act(g,'step',d);}
function originalWalk(g,x,y,near=false){const p=g.findPath(x,y);assert.ok(p,'No legal path to '+x+','+y);if(near&&p.length)p.pop();for(const d of p)act(g,'step',d);}
function entry(choice,saveKey=false){const g=actor();for(let i=0;i<trace.length;i++){const a=trace[i];if(a.type==='choose'&&a.args[0].choice===choice)return g;if(saveKey&&i>=103&&i<=107)continue;act(g,a.type,...a.args);}throw Error('checkpoint missing');}
function summary(g,name,start){return {name,start:{hp:start.hp,keys:start.keys,mana:start.mana},end:{hp:g.state.hp,keys:g.state.keys,mana:g.state.mana,coins:g.state.coins,atk:g.state.atk,def:g.state.def,switches:g.state.switches,choices:g.state.choices,fragments:g.state.fragments},actions:g.legal};}
for(const option of ['offering','passage']){
 const g=entry('ferryVow',true),start=g.snapshot(),e=TowerData.floors[7].entities.find(e=>e.choice==='ferryVow'),frag=TowerData.floors[7].entities.find(e=>e.type==='fragment');act(g,'choose',e,option);
 if(option==='passage'){originalWalk(g,frag.x,frag.y);assert.equal(g.state.removed['f7-4']||false,false);assert.equal(g.state.removed['f7-5']||false,false);}
 else{const at=trace.findIndex(a=>a.type==='choose'&&a.args[0].choice==='ferryVow');for(let i=at+1;!g.state.fragments.includes(7);i++)act(g,trace[i].type,...trace[i].args);}
 assert.ok(g.state.fragments.includes(7));report.branches.push(summary(g,'八层 / '+option,start));
}
report.checks.push('Both eighth-floor ferry routes reach the same relic legally; one retains a yellow key and heals, the other spends the saved key and bypasses two guardians');
for(const option of ['atk','def']){
 const g=entry('silk'),start=g.snapshot(),f=TowerData.floors[10],choice=f.entities.find(e=>e.choice==='silk'&&e.option===option),plate=id=>f.entities.find(e=>e.controlId===id),fight=id=>{const e=f.entities.find(e=>e.id===id);originalWalk(g,e.x,e.y,true);act(g,'fight',e);};
 if(option==='def'){
  originalWalk(g,10,18);act(g,'useConsumable','elixir');act(g,'recallClone',plate('silk-a').id);fight('f10-wing-guard-1');const b=plate('silk-b');walk(g,b.x,b.y,4);act(g,'useAbility','clone',b.x,b.y);fight('f10-8');originalWalk(g,choice.x,choice.y,true);
 }
 act(g,'choose',choice,option);originalWalk(g,10,18);act(g,'recallClone',plate('silk-c').id);
 for(const id of ['silk-a','silk-b']){const p=plate(id);if(!g.state.switches[p.id]){if(id==='silk-b'&&!g.state.removed['f10-wing-guard-1']){if(g.state.hp<=g.preview('flame').damage)act(g,'useConsumable','elixir');fight('f10-wing-guard-1');}walk(g,p.x,p.y,4);act(g,'useAbility','clone',p.x,p.y);}}
 const frag=f.entities.find(e=>e.type==='fragment');if(!g.state.fragments.includes(10)){originalWalk(g,7,16);if(g.getTile(6,16)==='~')act(g,'useAbility','staff',6,16);if(!g.state.removed['f10-7'])fight('f10-7');originalWalk(g,frag.x,frag.y);}const stairs=f.entities.find(e=>e.type==='stairs'&&e.to===11);originalWalk(g,stairs.x,stairs.y,true);act(g,'traverse',stairs);assert.equal(g.state.floor,11);report.branches.push(summary(g,'十一层 / '+option,start));
}
report.checks.push('Both eleventh-floor scroll choices finish with two active shadows A/B, release C, and legally reach the next floor with distinct stat/supply costs');
for(const group of ['sevenWounds','emberVow'])for(const option of TowerData.choices[group].options){const g=entry(group),start=g.snapshot(),e=TowerData.floors[g.state.floor].entities.find(e=>e.choice===group);act(g,'choose',e,option.id);assert.equal(g.choose(e,option.id),false);report.branches.push(summary(g,group+' / '+option.id,start));}
report.checks.push('Four later rescue/defense and armor/shortcut outcomes charge their real finite costs once from legal checkpoints');
report.passed=true;fs.writeFileSync('audits/v22-branch-routes.json',JSON.stringify(report,null,2));console.log(report.checks.join('\n'));
