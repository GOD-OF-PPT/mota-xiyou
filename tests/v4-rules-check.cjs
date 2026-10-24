/* Explicit equipment arithmetic and actual campaign state invariants. */
const assert=require('node:assert/strict');global.window=global;require('../js/world.js');require('../js/engine.js');
const tests=[],test=(name,fn)=>tests.push({name,fn}),state=(equipped=[])=>({hp:1000,atk:30,def:12,relics:[],equipped,orbs:3,bossPlan:'direct'}),foe=(trait='normal',more={})=>({hp:100,atk:30,def:10,gold:20,trait,special:4,...more});
test('iron raises effective attack and reduces defense without modifying base growth',()=>{
 const s=state(['iron']),p=TowerRules.battle(s,foe());assert.equal(p.hit,26);assert.equal(p.rounds,4);assert.equal(p.foeHit,21);assert.equal(p.damage,63);assert.equal(s.atk,30);assert.equal(s.def,12);
});
test('lotus and thorn change different enemy rules with explicit tradeoffs',()=>{
 const a=TowerRules.battle(state(['lotus']),foe('magic'));assert.equal(a.hit,18);assert.equal(a.rounds,6);assert.equal(a.foeHit,24);assert.equal(a.damage,120);
 const b=TowerRules.battle(state(['thorn']),foe('first'));assert.equal(b.enemyHits,4);assert.equal(b.foeHit,20);assert.equal(b.damage,80);assert.equal(TowerRules.battle(state(),foe('first')).damage,90);
});
test('tide discounts total loss once and separately reduces the actual gold reward',()=>{
 const p=TowerRules.battle(state(['tide']),foe('venom',{special:13,gold:19}));assert.equal(p.damage,Math.floor((72+13)*.9));assert.equal(p.goldReward,14);assert.equal(p.normalDamage+p.traitDamage,p.damage);
});
test('ember first-hit damage changes round thresholds, with a real unavoidable eight-point cost',()=>{
 const p=TowerRules.battle(state(['ember']),foe());assert.equal(p.rounds,5);assert.equal(p.damage,80);const q=TowerRules.battle(state(['ember']),foe('normal',{hp:21,atk:0}));assert.equal(q.rounds,1);assert.equal(q.damage,8);
});
test('mirror reduces every counter and visibly swaps ability costs',()=>{
 const p=TowerRules.battle(state(['mirror']),foe('counter'));assert.equal(p.rounds,6);assert.equal(p.traitDamage,12);const e=new TowerEngine(TowerData);e.state.equipped=['mirror'];assert.equal(e.abilityCost('clone'),1);assert.equal(e.abilityCost('staff'),2);assert.equal(e.abilityCost('morph'),2);
});
test('equipment can change only at a lantern, enforces two slots, and undo restores the full loadout',()=>{
 const e=new TowerEngine(TowerData),s=e.state;s.treasures=['iron','lotus','tide'];assert.equal(e.equipTreasure('iron'),true);assert.equal(e.equipTreasure('lotus'),true);assert.equal(e.equipTreasure('tide'),false);assert.equal(s.atk,24);e.undo();assert.deepEqual(e.state.equipped,['iron']);const a=TowerData.floors[0].entities.find(a=>a.type==='altar');e.state.y=a.y-1;assert.equal(e.equipTreasure('lotus'),false);
});
test('all 16 relic fragments are actual distinct pick-ups, and upstairs/awakening require them',()=>{
 const e=new TowerEngine(TowerData),fragments=TowerData.floors.flatMap(f=>f.entities).filter(a=>a.type==='fragment');assert.equal(fragments.length,16);assert.equal(new Set(fragments.map(a=>a.fragment)).size,16);const first=fragments.find(a=>a.fragment===0),stair=TowerData.floors[0].entities.find(a=>a.type==='stairs'&&a.to>0);assert.equal(e.requirements(stair).met,false);const hp=e.state.hp;e.takeFragment(first);e.takeFragment(first);assert.equal(e.state.externalRelics,1);assert.equal(e.state.hp,hp);assert.equal(e.requirements(stair).met,true);assert.equal(e.requirements(TowerData.floors[2].entities.find(a=>a.type==='relic')).met,false);
});
test('boss discount allocation sums exactly and breakpoints include equipped attack only once',()=>{
 const s={...state(['iron','tide']),atk:82,def:40,relics:[0,1,2,3,4]};for(const bossPlan of ['direct','anchor','echoes']){const p=TowerRules.battle(s,TowerData.enemies.heart,{bossPlan});assert.equal(p.damage,p.phases.reduce((n,p)=>n+p.damage,0)+p.traitDamage);const n=p.nextAttack;if(n){const q=TowerRules.battle({...s,atk:n.atk},TowerData.enemies.heart,{bossPlan});assert.equal(p.damage-q.damage,n.saved);}}
});
let failed=0;for(const t of tests){try{t.fn();console.log('PASS '+t.name);}catch(e){failed++;console.error('FAIL '+t.name+'\n'+e.stack);}}console.log(`${tests.length-failed}/${tests.length} v4 contracts passed`);if(failed)process.exitCode=1;
