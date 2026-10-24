/* Compare every settled action against the pre-fix engine on the same campaign. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const common=['js/world.js','js/encounters.js','js/chronicle.js','js/outcomes.js'];
function runtime(engine){const c=vm.createContext({console});c.window=c;for(const f of [...common,engine])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});return c;}
const before=runtime('.backups/spawn-v28-20261024/js/engine.js'),after=runtime('js/engine.js');
const a=new before.TowerEngine(before.TowerData,{persist:false}),b=new after.TowerEngine(after.TowerData,{persist:false});a.newGame();b.newGame();
const fields=['hp','atk','def','mana','maxMana','coins','keys','elixirs','orbs','equipped','relics','fragments','choices','quests','won','ending','kills','purchases','removed','terrain','switches','tides','rescued','treasures','selfAwakened','visited'];
const resource=g=>JSON.parse(JSON.stringify(Object.fromEntries(fields.map(k=>[k,g.state[k]]))));
assert.deepEqual(resource(a),resource(b));assert.equal(b.getEntity(b.state.x,b.state.y),null);assert.ok(b.step('up'));assert.equal(a.state.x,b.state.x);assert.equal(a.state.y,b.state.y);assert.deepEqual(resource(a),resource(b));
const trace=JSON.parse(fs.readFileSync('tests/playthrough-v23-free-mixed-direct.json','utf8'));
for(let i=0;i<trace.actions.length;i++){const q=trace.actions[i];assert.notEqual(a[q.type](...q.args),false,'old action '+i);assert.notEqual(b[q.type](...q.args),false,'new action '+i);assert.deepEqual(resource(a),resource(b),'settlement '+i+' '+q.type);assert.equal(b.state.turn,a.state.turn+1);}
assert.ok(b.state.won);
const legacyBefore=new before.TowerEngine(before.TowerEncounters.legacy,{persist:false}),legacyAfter=new after.TowerEngine(after.TowerEncounters.legacy,{persist:false});legacyBefore.newGame();legacyAfter.newGame();assert.equal(legacyBefore.state.x,legacyAfter.state.x);assert.equal(legacyBefore.state.y,legacyAfter.state.y);assert.deepEqual(resource(legacyBefore),resource(legacyAfter));
for(const floor of after.TowerData.floors){assert.equal(floor.map[floor.spawn.y][floor.spawn.x],'.');assert.ok(!floor.entities.some(e=>e.x===floor.spawn.x&&e.y===floor.spawn.y&&e.type!=='stairs'),'prop occupies arrival '+floor.id);}
const report={passed:true,actionsCompared:trace.actions.length,addedLegalActions:[{type:'step',args:['up']}],resourceFieldsCompared:fields,final:{hp:b.state.hp,mana:b.state.mana,coins:b.state.coins,ending:b.state.ending,turn:b.state.turn},legacyStartPreserved:true,all18EntriesClearOfSolidProps:true};fs.writeFileSync('audits/v28-spawn-rules.json',JSON.stringify(report,null,2));console.log('PASS '+trace.actions.length+' unchanged settlements, legacy start and 18 entries clear of solid props');
