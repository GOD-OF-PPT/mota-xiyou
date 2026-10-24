/* Legacy routes stay deterministic; new seals are finite, previewed and atomic. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;require('../js/world');require('../js/engine');require('../js/story-director');
const root=path.resolve(__dirname,'..'),old={};old.window=old;vm.createContext(old);for(const f of ['js/world.js','js/engine.js'])vm.runInContext(fs.readFileSync(path.join(root,'.backups/finale-v21-20261024',f),'utf8'),old);
const fields=['floor','x','y','hp','atk','def','mana','coins','keys','relics','externalRelics','fragments','treasures','equipped','removed','switches','terrain','choices','quests','rescued','orbs','elixirs','purchases','won','ending','kills'];
const state=s=>JSON.parse(JSON.stringify(Object.fromEntries(fields.map(k=>[k,s[k]]))));
const report={checks:[],cases:[],legalRoutes:[],errors:[]};let cp;
for(const file of ['playthrough-v9-free-mixed-direct-offering.json','playthrough-v9-gold-def-anchor-offering.json']){
 const actions=JSON.parse(fs.readFileSync(path.join(__dirname,file))).actions,g=new TowerEngine(TowerData),legacy=new old.TowerEngine(old.TowerData);g.newGame();legacy.newGame();
 for(let i=0;i<actions.length;i++){const a=actions[i];if(a.type==='fight'&&a.args[0].enemy==='heart'&&(!cp||g.state.orbs>cp.state.orbs))cp={state:g.snapshot(),entity:a.args[0]};assert.ok(g[a.type](...a.args),file+' '+i);assert.ok(legacy[a.type](...a.args));assert.deepEqual(state(g.state),state(legacy.state),file+' '+i+' legacy resource contract');}
 assert.ok(g.state.won);report.legalRoutes.push({file,actions:actions.length,finalHp:g.state.hp});
}
report.checks.push('Both existing full-campaign routes retain every original resource and progression result');
const permutations=[['staff','morph','clone'],['staff','clone','morph'],['morph','staff','clone'],['morph','clone','staff'],['clone','staff','morph'],['clone','morph','staff']];
for(const plan of ['direct','anchor','echoes'])for(const seals of [[null,null,null],...permutations]){
 const g=new TowerEngine(TowerData);assert.ok(g.load(JSON.stringify(cp.state)));const before=g.snapshot(),p=g.preview(cp.entity.enemy,{bossPlan:plan,bossSeals:seals});assert.deepEqual(g.snapshot(),before,'Preview changed the run');
 const outcome=g.fight(cp.entity,{bossPlan:plan,bossSeals:seals});
 if(!p.canAfford){assert.equal(outcome,false);assert.deepEqual(g.snapshot(),before);report.cases.push({plan,seals,damage:p.damage,canAfford:false});continue;}
 assert.ok(p.possible);assert.ok(p.damage<=g.preview(cp.entity.enemy,{bossPlan:plan}).damage,'Seals must not add a hidden penalty to the selected preparation');assert.equal(outcome,p.survive);assert.equal(g.state.hp,Math.max(0,before.hp-p.damage));assert.equal(g.state.defeated,!p.survive);assert.equal(g.state.orbs,before.orbs-p.resourceCost.orbs);assert.equal(g.state.bossPlan,plan);assert.deepEqual(g.state.finalBattle.seals,seals);
 const once=g.snapshot();assert.equal(g.fight(cp.entity,{bossPlan:plan,bossSeals:seals}),false);assert.deepEqual(g.snapshot(),once,'Repeated commitment settled again');
 const loaded=new TowerEngine(TowerData);assert.ok(loaded.load(JSON.stringify(once)));assert.deepEqual(loaded.state.finalBattle,g.state.finalBattle);assert.ok(g.undo());assert.deepEqual(g.snapshot(),before);
 report.cases.push({plan,seals,damage:p.damage,canAfford:true});
}
assert.ok(new Set(report.cases.filter(c=>c.plan==='direct').map(c=>c.damage)).size>1,'Arrangement must change real costs');
report.checks.push('All three preparations and six seal permutations share exact preview/settlement, undo, once-only commitment and save round-trip');
for(const seals of [['staff','staff','clone'],['hack','morph','clone'],[],[null,null],['staff','morph','clone','extra']]){
 const g=new TowerEngine(TowerData);g.load(JSON.stringify(cp.state));const before=g.snapshot();assert.equal(g.preview('heart',{bossSeals:seals}).possible,false);assert.equal(g.fight(cp.entity,{bossSeals:seals}),false);assert.deepEqual(g.snapshot(),before);
}
report.checks.push('Duplicate, unknown and malformed seal layouts reject without a transaction');
for(const kind of ['confrontation','boss','awakening','release','keep','seal'])for(let relic=0;relic<5;relic++)for(const rescued of [[],['bajie','tangseng']]){
 const shots=TowerStoryDirector.shots(kind,{relic,rescued,externalRelics:16,choices:{sevenWounds:'rescue'},seals:['clone','staff','morph']});assert.equal(shots.length,3);assert.ok(shots.every(s=>s.text.length>0&&s.text.length<=36));
}
report.checks.push('All story branches keep three distinct short, actionable shots');report.passed=true;
fs.writeFileSync(path.join(root,'audits/v21-finale-model.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks,legalBossState:{hp:cp.state.hp,orbs:cp.state.orbs},cases:report.cases},null,2));
