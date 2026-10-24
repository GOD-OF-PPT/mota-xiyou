/* Deterministic contract checks. Run: node tests/engine-check.cjs */
'use strict';
const assert=require('node:assert/strict');
const {TowerEngine,TowerRules}=require('../js/engine.js');
const tests=[];
const test=(name,fn)=>tests.push({name,fn});
const copy=x=>JSON.parse(JSON.stringify(x));
const foe=(trait='normal',more={})=>({name:trait,hp:42,atk:25,def:10,gold:7,trait,special:6,...more});
const state=more=>({hp:100,atk:24,def:10,relics:[],...more});
const openMap=()=>Array.from({length:13},(_,y)=>Array.from({length:13},(_,x)=>x===0||y===0||x===12||y===12?'#':'.').join(''));
function fixture(count=18){
  return {floors:Array.from({length:count},(_,i)=>({id:i,name:'Floor '+i,intro:'Story '+i,map:openMap(),entities:[]})),
    enemies:{normal:foe(),first:foe('first'),magic:foe('magic'),armor:foe('armor'),venom:foe('venom'),counter:foe('counter'),boss:foe('boss')},
    items:{atk:{name:'Power',kind:'atk',value:3},hp:{name:'Peach',kind:'hp',value:120},key:{name:'Key',kind:'key',color:'blue',value:1}},
    relics:Array.from({length:5},(_,i)=>({name:'Relic '+i,ability:'Power',description:'Effect',story:'Memory'})),dialogues:{}};
}
function engine(data=fixture()){
  const storage=new Map();
  global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  return new TowerEngine(data);
}
function entity(g,type,more={}){const e={id:'entity-'+g.data.floors[0].entities.length,x:6,y:10,type,...more};g.data.floors[g.state.floor].entities.push(e);return e;}

test('ordinary encounter: player first, killing blow earns no retaliation',()=>{
  const p=TowerRules.battle(state(),foe());assert.equal(p.rounds,3);assert.equal(p.enemyHits,2);assert.equal(p.damage,30);assert.equal(p.survive,true);
  assert.equal(TowerRules.battle(state({atk:52}),foe()).damage,0);
});
test('first strike remains dangerous even when defeated by one blow',()=>{
  assert.equal(TowerRules.battle(state(),foe('first')).damage,45);
  assert.equal(TowerRules.battle(state({atk:52}),foe('first')).damage,15);
});
test('damage breakpoint and armor are exact, never random or negative',()=>{
  assert.equal(TowerRules.battle(state({atk:10}),foe()).possible,false);
  assert.equal(TowerRules.battle(state({atk:9}),foe()).possible,false);
  assert.equal(TowerRules.battle(state({def:30}),foe()).damage,0);
  assert.equal(TowerRules.battle(state({atk:31}),foe()).damage,15);
  const g=engine();const before=g.snapshot();for(let i=0;i<25;i++)assert.equal(g.preview('normal').damage,30);assert.deepEqual(g.state,before);
});
test('magic ignores defense; fourth relic lowers every magic strike by eight',()=>{
  assert.equal(TowerRules.battle(state({def:999}),foe('magic')).damage,50);
  assert.equal(TowerRules.battle(state({def:0,relics:[3]}),foe('magic')).damage,34);
  assert.equal(TowerRules.battle(state({relics:[3]}),foe('magic',{atk:5})).damage,0);
});
test('venom occurs once, counter includes the final strike, boss combines first strike and true damage',()=>{
  assert.equal(TowerRules.battle(state(),foe('venom')).damage,36);
  assert.equal(TowerRules.battle(state(),foe('counter')).damage,48);
  assert.equal(TowerRules.battle(state({atk:52}),foe('counter')).damage,6);
  assert.equal(TowerRules.battle(state(),foe('boss',{special:80})).damage,125);
  assert.equal(TowerRules.battle(state({relics:[3]}),foe('boss',{special:80})).damage,117);
});
test('exact lethal preview is defeat; one HP above it is survival',()=>{
  assert.equal(TowerRules.battle(state({hp:30}),foe()).survive,false);
  assert.equal(TowerRules.battle(state({hp:31}),foe()).survive,true);
});
for(const trait of ['normal','first','magic','armor','venom','counter','boss'])test('preview and committed '+trait+' battle settle identically and only once',()=>{
  const g=engine(),e=entity(g,'enemy',{enemy:trait});g.state.hp=1000;if(trait==='boss')g.state.relics=[0,1,2,3,4];
  const p=g.preview(trait),hp=g.state.hp,gold=g.state.coins;assert.equal(g.fight(e),true);assert.equal(g.state.hp,hp-p.damage);assert.equal(g.state.coins,gold+7);assert.equal(g.state.kills,1);assert.equal(g.state.removed[e.id],true);
  const after=g.snapshot();assert.equal(g.fight(e),false);assert.deepEqual(g.state,after);
});
test('lethal battle preserves guard, grants no reward, and undo restores prebattle transaction',()=>{
  const g=engine(),e=entity(g,'enemy',{enemy:'normal'});g.state.hp=30;const before=g.snapshot();assert.equal(g.fight(e),false);assert.equal(g.state.hp,0);assert.equal(g.state.defeated,true);assert.equal(g.state.coins,0);assert.equal(g.state.removed[e.id],undefined);assert.equal(g.undo(),true);assert.deepEqual(g.state,before);
});
test('unbreakable guard and relic-locked boss do not consume a turn or HP',()=>{
  const g=engine(),e=entity(g,'enemy',{enemy:'normal'});g.state.atk=10;let before=g.snapshot();assert.equal(g.fight(e),false);assert.deepEqual(g.state,before);
  e.enemy='boss';g.state.atk=24;before=g.snapshot();assert.equal(g.fight(e),false);assert.deepEqual(g.state,before);
});
test('door requires matching finite key, opens permanently and undo returns key',()=>{
  const g=engine(),e=entity(g,'door',{color:'blue'});let before=g.snapshot();assert.equal(g.openDoor(e),false);assert.deepEqual(g.state,before);
  g.state.keys.blue=1;before=g.snapshot();assert.equal(g.openDoor(e),true);assert.equal(g.state.keys.blue,0);assert.equal(g.getEntity(6,10),null);assert.equal(g.openDoor(e),false);g.undo();assert.deepEqual(g.state,before);
});
test('staff and morph have correct range, unlock and mana costs, and persist independently by floor',()=>{
  const g=engine();g.data.floors[0].map[10]='#.....~.....#';g.data.floors[1].map[10]='#.....=.....#';
  assert.equal(g.useAbility('staff',6,10),false);g.state.relics=[0];assert.equal(g.useAbility('staff',6,10),true);assert.equal(g.state.mana,5);assert.equal(g.getTile(6,10),'.');assert.equal(g.getTile(6,10,1),'=');
  let before=g.snapshot();assert.equal(g.useAbility('staff',6,10),false);assert.deepEqual(g.state,before);
  g.state.floor=1;assert.equal(g.useAbility('morph',6,10),false);g.state.relics.push(1);g.state.mana=0;before=g.snapshot();assert.equal(g.useAbility('morph',6,10),false);assert.deepEqual(g.state,before);g.state.mana=1;assert.equal(g.useAbility('morph',6,10),true);assert.equal(g.state.mana,0);assert.equal(g.getTile(6,10),'.');
});
test('clone can cross a wall at Manhattan four, but not five, and does not spend twice',()=>{
  const g=engine();g.state.relics=[2];const plate=entity(g,'switch',{kind:'plate',group:'river',x:9,y:10}),lever=entity(g,'switch',{kind:'lever',group:'river',x:4,y:10}),gate=entity(g,'gate',{group:'river',x:6,y:7});
  g.data.floors[0].map[10]='#.....#.....#';assert.equal(g.useAbility('clone',9,10),true);assert.equal(g.state.mana,4);assert.equal(g.isGateOpen(gate),false);g.state.switches[lever.id]=true;assert.equal(g.isGateOpen(gate),true);
  const before=g.snapshot();assert.equal(g.useAbility('clone',9,10),false);assert.deepEqual(g.state,before);
  const far=entity(g,'switch',{kind:'plate',x:10,y:10});assert.equal(g.useAbility('clone',10,10),false);assert.equal(g.state.switches[far.id],undefined);
});
test('walking across a projection plate does not activate it or consume mana',()=>{
  const g=engine(),p=entity(g,'switch',{kind:'plate',group:'mirror'});assert.equal(g.moveTo(6,10),true);assert.equal(g.state.switches[p.id],undefined);assert.equal(g.state.mana,6);g.state.relics=[2];assert.equal(g.useAbility('clone',6,10),true);assert.equal(g.state.switches[p.id],true);assert.equal(g.state.mana,4);
});
test('altar is renewable mana, not renewable HP or money; shop prices persist globally',()=>{
  const g=engine(),a=entity(g,'altar');g.state.hp=217;g.state.mana=0;assert.equal(g.moveTo(6,10),true);assert.equal(g.state.mana,6);assert.equal(g.state.hp,217);g.state.coins=100;assert.equal(g.shop('atk'),true);assert.equal(g.state.atk,27);assert.equal(g.state.coins,80);assert.equal(g.shopCost('atk'),32);g.state.mana=0;assert.equal(g.meditate(),true);assert.equal(g.state.hp,217);assert.equal(g.state.coins,80);
});
test('consumables work once and full-mana orb cannot be wasted',()=>{
  const g=engine(),hp=g.state.hp;assert.equal(g.useConsumable('elixir'),true);assert.equal(g.state.hp,hp+200);assert.equal(g.state.elixirs,0);assert.equal(g.useConsumable('elixir'),false);assert.equal(g.useConsumable('orb'),false);assert.equal(g.state.orbs,1);g.state.mana=1;assert.equal(g.useConsumable('orb'),true);assert.equal(g.state.mana,6);assert.equal(g.state.orbs,0);
});
test('18-floor stair transitions preserve HP/resources and do not replay already-read intros',()=>{
  const g=engine();for(let i=0;i<17;i++)g.data.floors[i].entities.push({id:'up'+i,type:'stairs',x:6,y:10,to:i+1,tx:6,ty:11,requires:0});
  const hp=g.state.hp;let stories=0;g.on(t=>{if(t==='story')stories++;});for(let i=0;i<17;i++){assert.equal(g.moveTo(6,10),true);assert.equal(g.state.floor,i);assert.equal(g.traverse(g.getEntity(6,10)),true);assert.equal(g.state.floor,i+1);assert.equal(g.state.x,6);assert.equal(g.state.y,11);}
  assert.equal(g.state.visited.length,18);assert.equal(g.state.hp,hp);assert.equal(g.state.mana,6);assert.equal(stories,17);
  g.changeFloor({to:0,tx:6,ty:11});g.changeFloor({to:17,tx:6,ty:11});assert.equal(stories,18); // fixture's start intro is first visited here
});
test('each new three-floor realm requires its preceding relic count before climbing',()=>{
  for(let r=1;r<=5;r++){const g=engine();g.state.floor=r*3-1;const e={id:'realm',type:'stairs',x:6,y:10,to:r*3,tx:6,ty:11};g.data.floors[g.state.floor].entities.push(e);g.state.relics=Array.from({length:r-1},(_,i)=>i);assert.equal(g.moveTo(6,10),true);const before=g.snapshot();assert.equal(g.traverse(e),false);assert.deepEqual(g.state,before);g.state.relics.push(r-1);assert.equal(g.traverse(e),true);assert.equal(g.state.floor,r*3);}
});
test('standing on a staircase after arrival supports explicit return traversal without moving off',()=>{
  const g=engine();const down=entity(g,'stairs',{x:6,y:11,to:1,tx:6,ty:11,requires:0});assert.equal(g.traverse(down),true);assert.equal(g.state.floor,1);assert.equal(g.state.x,6);assert.equal(g.state.y,11);g.undo();assert.equal(g.state.floor,0);assert.equal(g.state.turn,0);
});
test('save/load restores removed guards, terrain, clone switches, resources and no undo history',()=>{
  const g=engine();g.state.floor=17;g.state.x=3;g.state.y=7;g.state.terrain['0:6:10']='.';g.state.switches.p=true;g.state.removed.guard=true;g.state.relics=[0,1,2,3,4];g.state.externalRelics=16;g.state.visited=Array.from({length:18},(_,i)=>i);g.state.keys.red=1;g.checkpoint();const expected=g.snapshot();const raw=g.exportSave();g.state.hp=1;assert.equal(g.load(raw),true);assert.deepEqual(g.state,expected);assert.equal(g.history.length,0);assert.equal(g.mode,'walk');assert.equal(g.path.length,0);
});
test('malformed save is rejected atomically',()=>{
  const g=engine(),before=g.snapshot();for(const raw of ['no json','{}',JSON.stringify({state:{...before,floor:18}}),JSON.stringify({state:{...before,keys:{yellow:-1,blue:0,red:0}}})]){assert.equal(g.load(raw),false);assert.deepEqual(g.state,before);}
});
test('save rejects missing event flags instead of accepting an unusable game',()=>{
  const g=engine(),broken=g.snapshot();delete broken.seenIntros;assert.equal(g.load(JSON.stringify({state:broken})),false);
});
test('save rejects duplicate relics instead of allowing a false five-relic completion',()=>{
  const g=engine(),broken=g.snapshot();broken.relics=[0,0,0,0,0];assert.equal(g.load(JSON.stringify({state:broken})),false);
});
test('completed/defeated game cannot commit another battle',()=>{
  for(const flag of ['won','defeated']){const g=engine(),e=entity(g,'enemy',{enemy:'normal'});g.state[flag]=true;const before=g.snapshot();assert.equal(g.fight(e),false);assert.deepEqual(g.state,before);}
});
test('ending remains locked until final boss defeated, then commits exactly once',()=>{
  const g=engine();const boss={id:'final',type:'enemy',x:6,y:10,enemy:'boss'},fin={id:'lotus',type:'finale',x:6,y:1};g.data.floors[17].entities.push(boss,fin);assert.equal(g.finish('release'),false);Object.assign(g.state,{floor:17,x:6,y:2,relics:[0,1,2,3,4],externalRelics:16});assert.equal(g.awakenSelf(fin),false);g.state.removed.final=true;assert.equal(g.finish('release'),false);assert.equal(g.awakenSelf(fin),true);assert.equal(g.awakenSelf(fin),false);assert.equal(g.finish('release'),true);assert.equal(g.state.ending,'release');assert.equal(g.finish('keep'),false);
});
test('pathfinding avoids intermediate guards and does not cross stairs automatically',()=>{
  const g=engine();entity(g,'enemy',{enemy:'normal',x:6,y:9});entity(g,'stairs',{x:5,y:11,to:1,tx:6,ty:11});const p=g.findPath(6,8);assert.ok(p&&p.length>3);let x=6,y=11;for(const dir of p){const[dx,dy]=TowerRules.directions[dir];x+=dx;y+=dy;assert.notDeepEqual([x,y],[6,9]);assert.notDeepEqual([x,y],[5,11]);}assert.deepEqual([x,y],[6,8]);
});

// Audit the shipped authored data independently of the fixture combat checks.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const worldContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/world.js'),'utf8'),worldContext);
const actual=worldContext.window.TowerData;
test('authored adventure has 18 distinct maps, five relics, valid unique entities and reciprocal stairs',()=>{
  assert.equal(actual.floors.length,18);assert.equal(new Set(actual.floors.map(f=>f.map.join('\n'))).size,18);
  const ids=new Set(),relics=[];
  for(const f of actual.floors){assert.equal(f.id,actual.floors.indexOf(f));assert.equal(f.map.length,21);assert.ok(f.map.every(row=>row.length===21));assert.ok(f.entities.some(e=>e.type==='altar'),'No renewable mana altar on floor '+(f.id+1));
    for(const e of f.entities){assert.equal(ids.has(e.id),false,'Duplicate entity id '+e.id);ids.add(e.id);assert.equal(f.map[e.y]?.[e.x],'.','Entity outside walkable floor '+e.id);
      if(e.type==='enemy')assert.ok(actual.enemies[e.enemy],'Unknown enemy '+e.enemy);
      if(e.type==='item'||e.type==='chest')assert.ok(actual.items[e.item],'Unknown item '+e.item);
      if(e.type==='relic')relics.push(e.relic);
      if(e.type==='stairs'){const to=actual.floors[e.to];assert.ok(to,'Missing stair floor '+e.id);assert.equal(to.map[e.ty]?.[e.tx],'.','Bad arrival '+e.id);assert.ok(to.entities.some(a=>a.type==='stairs'&&a.to===f.id),'One-way stair '+e.id);}
      if(e.type==='gate')assert.ok(e.requiresQuests||e.requiresControls||f.entities.some(a=>a.type==='switch'&&a.group===e.group),'Gate has no controls '+e.id);
    }
  }assert.equal(relics.length,5);assert.equal(new Set(relics).size,5);
});
function reachableWithout(f,start,target,blocked){
  const q=[start],seen=new Set([start.x+','+start.y]);
  while(q.length){const cur=q.shift();if(cur.x===target.x&&cur.y===target.y)return true;
    for(const[dx,dy]of Object.values(TowerRules.directions)){const x=cur.x+dx,y=cur.y+dy,k=x+','+y;if(x<0||x>=f.map[0].length||y<0||y>=f.map.length||['#','v'].includes(f.map[y][x])||seen.has(k)||blocked.has(k))continue;const e=f.entities.find(e=>e.x===x&&e.y===y);if(e?.type==='stairs'&&(x!==target.x||y!==target.y))continue;seen.add(k);q.push({x,y});}
  }return false;
}
test('final seal, finite key, paired heart gates and boss genuinely cut the ending route',()=>{
 const f=actual.floors.at(-1),fin=f.entities.find(e=>e.type==='finale'),a=f.entities.find(e=>e.type==='altar');
 const groups=[f.entities.filter(e=>e.type==='gate'),f.entities.filter(e=>e.type==='seal'),f.entities.filter(e=>e.type==='door'&&e.color==='red'),f.entities.filter(e=>e.type==='enemy'&&actual.enemies[e.enemy].trait==='boss')];
 for(const g of groups){assert.ok(g.length);assert.equal(reachableWithout(f,a,fin,new Set(g.map(e=>e.x+','+e.y))),false,'Final prerequisite bypass');}
});

test('shipped staircase progression locks are consistent across all 18 floors',()=>{
  const g=engine(actual);for(const f of actual.floors){g.state.floor=f.id;for(const e of f.entities.filter(e=>e.type==='stairs'&&e.to>f.id))assert.equal(g.stairRequirement(e),Math.min(5,Math.floor(e.to/3)),'Incorrect relic threshold '+e.id);}
});
test('without a sworn bypass every relic-vault guardian is a real cut to its treasure',()=>{
 for(const f of actual.floors){const t=f.entities.find(e=>e.type==='treasure');if(!t)continue;const a=f.entities.find(e=>e.type==='altar'),guard=f.entities.find(e=>e.id==='f'+f.id+'-reliquary');assert.ok(guard);assert.equal(reachableWithout(f,a,t,new Set([guard.x+','+guard.y,...f.entities.filter(e=>e.type==='gate'&&e.requiresQuests).map(e=>e.x+','+e.y)])),false,'Bypassed treasure guardian '+guard.id);}
});

test('fourth-floor fragment wing requires the acquired staff bridge',()=>{
 const f=actual.floors[3],fragment=f.entities.find(e=>e.type==='fragment'),altar=f.entities.find(e=>e.type==='altar'),gaps=[];for(let y=0;y<f.map.length;y++)for(let x=0;x<f.map[y].length;x++)if(f.map[y][x]==='~')gaps.push(x+','+y);assert.ok(gaps.length);assert.equal(reachableWithout(f,altar,fragment,new Set()),true);assert.equal(reachableWithout(f,altar,fragment,new Set(gaps)),false);
});


test('defeat cannot overwrite the last safe save; reload returns to the prebattle state',()=>{
  const data=fixture(),enemy={id:'danger',x:7,y:11,type:'enemy',enemy:'normal'};data.floors[0].entities.push(enemy);const g=engine(data);g.state.hp=20;g.save(true);const before=g.snapshot();assert.equal(g.fight(enemy),false);assert.equal(g.state.defeated,true);assert.equal(g.save(true),false);assert.equal(g.load(),true);assert.deepEqual(g.state,before);assert.equal(g.state.removed[enemy.id],undefined);
});
test('import rejects invalid movement, mana, purchase and event structures atomically',()=>{
  const g=engine(),before=g.snapshot();for(const change of [{facing:'diagonal'},{mana:7},{purchases:{atk:-1,def:0,heal:0}},{seenIntros:true},{visited:[]}]){assert.equal(g.load(JSON.stringify({state:{...before,...change}})),false);assert.deepEqual(g.state,before);}
});
test('walking past a read monument does not replay its dialog or duplicate the journal',()=>{
  const data=fixture();data.dialogues.test={title:'A lamp',lines:['Remember the way.']};data.floors[0].entities.push({id:'note',type:'monument',x:6,y:10,dialogue:'test'});const g=engine(data);g.step('up');g.step('down');g.step('up');assert.equal(g.state.journal.length,1);assert.equal(g.state.seenIntros['event:note'],true);
});
let failed=0;for(const {name,fn}of tests){try{fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n  '+error.message);}}
console.log(`\n${tests.length-failed}/${tests.length} deterministic checks passed.`);if(failed)process.exitCode=1;
