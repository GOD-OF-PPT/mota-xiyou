/* Independent read-only simulation and geography checks. No production writes. */
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const world=fs.readFileSync('js/world.js','utf8'),engine=fs.readFileSync('js/engine.js','utf8');
function context(w,e){const c={console,performance:{now:()=>0},Date,Math,JSON,Set,Infinity};c.window=c;c.globalThis=c;vm.createContext(c);vm.runInContext(w,c);vm.runInContext(e,c);return c;}
const c=context(world,engine),data=c.TowerData,e=new c.TowerEngine(data);
const oldWorld=world.slice(0,world.indexOf('  /* v4:'))+'window.TowerData={version:3,floors,enemies,items,relics,relicGroups,chapters,dialogues,choices,revisits,bossPlans};})();';
const old=context(oldWorld,fs.readFileSync('.backups/before-v4/engine.js','utf8'));
const report={timestamp:new Date().toISOString(),scope:'Read-only source and Node probes. No browser, no production edits, no claim about human play time.',hashes:Object.fromEntries(['js/engine.js','js/world.js','js/ui.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),combat:{checked:0,mismatches:[]},migration:{checked:0,mismatches:[],replayFailures:[]},guardTopology:[],stairRequirements:[],findings:[]};
// Reference combat executes individual strikes rather than using round division.
function reference(s,foe,plan){
 const on=id=>s.equipped.includes(id),atk=Math.max(0,s.atk+(on('iron')?6:0)-(on('lotus')?2:0)-(on('mirror')?2:0)),def=Math.max(0,s.def-(on('iron')?3:0)-(on('thorn')?2:0));
 let loss=0,rounds=0,hits=0;const phases=foe.phases||[foe];
 for(let i=0;i<phases.length;i++){
  const p=phases[i],damage=atk-(plan==='anchor'?6:0)-Math.max(0,p.def-(plan==='anchor'&&i===1?20:0))+(plan==='echoes'?(i===1?18:i===2?8:0):0);
  if(damage<=0)return {possible:false};let remaining=p.hp,blows=0;
  do{remaining-=damage+(blows===0&&on('ember')?18:0);blows++;if(blows>10000)throw Error('reference overflow');}while(remaining>0);
  const first=p.trait==='first'||p.trait==='boss';let attacks=blows-1+(first&&!on('thorn')?1:0);if(plan==='echoes'&&i===0)attacks=Math.max(0,attacks-2);
  let foeHit=p.trait==='magic'?Math.max(0,p.atk-(s.relics.includes(3)?8:0)-(on('lotus')?6:0)):Math.max(0,p.atk-def);if(plan==='anchor'&&i===2)foeHit=Math.floor(foeHit/2);
  loss+=attacks*foeHit;rounds+=blows;hits+=attacks;
 }
 if(foe.phases||foe.trait==='boss')loss+=Math.max(0,(foe.special||0)-(s.relics.includes(3)?8:0)-(plan==='anchor'?40:0));
 else if(foe.trait==='venom')loss+=foe.special||0;
 else if(foe.trait==='counter')loss+=Math.max(0,(foe.special||0)-(on('mirror')?2:0))*rounds;
 if(on('ember'))loss+=8;if(on('tide'))loss=Math.floor(loss*.9);
 return {possible:true,damage:loss,rounds,enemyHits:hits,goldReward:Math.floor((foe.gold||0)*(on('tide')?.75:1))};
}
const gear=Object.keys(data.treasures),sets=[[],...gear.map(x=>[x]),...gear.flatMap((x,i)=>gear.slice(i+1).map(y=>[x,y]))];
for(const equipped of sets)for(const [atk,def]of [[24,10],[42,22],[80,48]])for(const relics of [[],[0,1,2,3,4]])for(const [id,foe]of Object.entries(data.enemies))for(const plan of foe.phases?['direct','anchor','echoes']:['direct']){
 const s={hp:1e6,atk,def,relics,equipped,orbs:3,bossPlan:plan},a=c.TowerRules.battle(s,foe,{bossPlan:plan}),b=reference(s,foe,foe.phases?plan:null);report.combat.checked++;
 for(const key of Object.keys(b))if(a[key]!==b[key]){report.combat.mismatches.push({id,equipped,atk,def,relics,plan,key,actual:a[key],reference:b[key]});break;}
}
// Replay an actual v3 public-action trace against its pre-v4 maps and engine.
const oldEngine=new old.TowerEngine(old.TowerData);oldEngine.newGame();
const trace=JSON.parse(fs.readFileSync('tests/playthrough-v3-free-mixed-anchor.json','utf8')).actions;
function checkMigration(label){
 const raw=JSON.parse(JSON.stringify(oldEngine.state)),s=e.migrate(raw);report.migration.checked++;
 const scalar=['hp','atk','def','coins','orbs','elixirs','kills','turn'];for(const key of scalar)if(raw[key]!==s[key])report.migration.mismatches.push({label,key,old:raw[key],new:s[key]});
 for(const key of ['keys','choices','purchases','relics','visited'])if(JSON.stringify(raw[key])!==JSON.stringify(s[key]))report.migration.mismatches.push({label,key,old:raw[key],new:s[key]});
 try{e.validate(s);}catch(err){report.migration.mismatches.push({label,error:err.message});}
 const floor=data.floors[s.floor],altar=floor.entities.find(a=>a.type==='altar');if(s.x!==altar.x||s.y!==altar.y||Object.keys(s.terrain).length)report.migration.mismatches.push({label,error:'not reset to safe altar or old terrain retained'});
}
checkMigration('start');let prevFloor=0;for(let i=0;i<trace.length;i++){const a=trace[i];if(!oldEngine[a.type](...JSON.parse(JSON.stringify(a.args))))report.migration.replayFailures.push({index:i,type:a.type});if(oldEngine.state.floor!==prevFloor){checkMigration('entry-'+oldEngine.state.floor);prevFloor=oldEngine.state.floor;}if(i%200===0)checkMigration('action-'+i);}checkMigration('finished');report.migration.replayedToVictory=oldEngine.state.won;
// Topological guard check opens all other constraints. The named guard alone
// must prevent direct walking into its vault; water is checked in either tide.
function reachable(f,target,blocked){const q=[[10,18]],seen=new Set(['10,18']);while(q.length){const [x,y]=q.shift();if(x===target.x&&y===target.y)return true;for(const[dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const X=x+dx,Y=y+dy,k=X+','+Y,t=f.map[Y]?.[X];if(seen.has(k)||!t||['#','v'].includes(t)||blocked.some(b=>b.x===X&&b.y===Y))continue;seen.add(k);q.push([X,Y]);}}return false;}
for(const f of data.floors){const original=old.TowerData.floors[f.id],guardian=original.entities.filter(a=>a.type==='enemy'&&a.enemy!=='heart').sort((a,b)=>data.enemies[b.enemy].hp-data.enemies[a.enemy].hp)[0];for(const target of f.entities.filter(a=>a.type==='fragment'||a.type==='treasure')){let guard=target.type==='treasure'?f.entities.find(a=>a.id==='f'+f.id+'-reliquary'):f.entities.find(a=>a.id===guardian?.id);if(f.id===4&&target.type==='fragment')guard=f.entities.find(a=>a.id==='f4-wing-guard-0');const canReach=guard&&reachable(f,target,[guard]);report.guardTopology.push({floor:f.id+1,target:target.id,guard:guard?.id,reachableWithGuardAlive:!!canReach,intendedRescueBypass:f.id===14,intendedBlueContractBypass:f.id===4&&target.type==='fragment'});}}
for(const f of data.floors){const stair=f.entities.find(a=>a.type==='stairs'&&a.to>f.id);if(!stair)continue;for(const id of stair.requiresFragments||[]){const s=e.initialState();Object.assign(s,{floor:f.id,x:stair.x,y:stair.y,relics:[0,1,2,3,4],fragments:Array.from({length:16},(_,i)=>i).filter(n=>n!==id),externalRelics:15,visited:[f.id]});e.state=s;for(const a of data.floors.flatMap(f=>f.entities)){if(a.type==='switch'||a.type==='resonator')s.switches[a.id]=true;if(a.quest)s.quests[a.quest]=true;}const rejected=e.traverse(stair)===false;report.stairRequirements.push({floor:f.id+1,missingFragment:id,rejected});}}
report.resolvedFindings=[
 {severity:'high',type:'recall-softlock',source:'js/engine.js hasSafeRetreat',before:'A staircase counted as safe without its required controls/fragments. Public-action replay plus orb offerings and cloud travel reached floor 11 upstairs with zero mana/orbs; recalling silk-a closed both retreat and the only usable stairs.',fix:'Staircase now requires requirements(here,flags).met as well as its heart-seal requirement.',verification:'audits/v4-softlock-check.cjs refuses recall without changing flags/resources, preserving the usable stairs and lantern retreat.'},
 {severity:'minor',type:'misdirecting-dialogue',source:'js/world.js dialogues.library and dialogues.sevenWounds',before:'Said northwest rescue side gate; actual floor 15 gate is player coordinate 18,15 in southeast wing.',fixObserved:!JSON.stringify([data.dialogues.library,data.dialogues.sevenWounds]).includes('西北援手侧门')},
 {severity:'minor',type:'outdated-collection-copy',source:'js/world.js dialogues.lantern.lines[1] and dialogues.library.lines[2]',before:'Said heart seals hide grouped relics; v4 fragments are separately collected across floors.',fixObserved:data.dialogues.lantern.lines[1].includes('散')},
 {severity:'minor',type:'floor-5-route-information',before:'Blue north lock enters the fragment wing behind its advertised serpent guard. Gold/free routes meet the east mouth guard.',resolution:'Root retained this actual key-route advantage and disclosed it in objective, hint and fragment description.',fixObserved:!!data.floors[4].entities.find(a=>a.type==='fragment')?.description}
];
fs.writeFileSync('audits/v4-independent-review.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
