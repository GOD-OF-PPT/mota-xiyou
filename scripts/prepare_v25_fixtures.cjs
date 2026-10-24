/* Authoring fixtures from existing public campaign actions, never resource edits. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.window=global;for(const f of ['world','encounters','chronicle','outcomes','engine'])require('../js/'+f);
const source='tests/playthrough-v23-free-mixed-direct.json',trace=JSON.parse(fs.readFileSync(source)),out='audits/v25-fixtures',sha=s=>crypto.createHash('sha256').update(s).digest('hex');fs.mkdirSync(out,{recursive:true});
const g=new TowerEngine(TowerEncounters.latest,{persist:false});g.chronicle=new TowerChronicle(g);g.newGame();const records={};
function save(name,raw,prefix,extra={}){if(records[name])return;const file=out+'/'+name+'.json';fs.writeFileSync(file,raw);records[name]={file,prefixActions:prefix,sha256:sha(raw),...extra};}
save('arrival',g.exportSave(),0);
for(let i=0;i<trace.actions.length;i++){
 const a=trace.actions[i],raw=g.exportSave(),s=g.state;
 if(a.type==='fight'){const e=g.data.floors[s.floor].entities.find(e=>e.id===a.args[0].id);save(e.enemy==='heart'?'final-battle':'battle',raw,i,{target:e});if(g.data.enemies[e.enemy]?.phases)save('final-battle',raw,i,{target:e});}
 if(a.type==='choose'){const e=g.data.floors[s.floor].entities.find(e=>e.id===a.args[0].id),spec=g.data.choices[e.choice];save('choice-'+spec.options.length,raw,i,{target:e});}
 if(a.type==='useAbility')save('ability',raw,i,{action:a});
 if(a.type==='awakenSelf')save('awakening',raw,i);
 if(!records['pre-defeat']){const e=g.data.floors[s.floor].entities.find(e=>e.type==='enemy'&&!s.removed[e.id]&&g.distance(e)<=1&&g.preview(e.enemy).possible&&!g.preview(e.enemy).survive);if(e){save('pre-defeat',raw,i,{target:e});const dead=new TowerEngine(g.data,{persist:false});assert.ok(dead.load(raw));dead.fight(e);assert.equal(dead.state.defeated,true);save('defeat',dead.exportSave(),i,{extraPublicAction:{type:'fight',args:[e]}});}}
 assert.notEqual(g[a.type](...a.args),false,`Rejected legal prefix ${i}: ${a.type}`);
 if(g.getEntity(g.state.x,g.state.y)?.type==='altar'&&g.state.treasures.length)save('lantern-gear',g.exportSave(),i+1);
 if(g.state.floor===10)save('floor11',g.exportSave(),i+1);
 if(a.type==='awakenSelf')save('ending-choice',g.exportSave(),i+1);
 if(g.state.won)save('ending',g.exportSave(),i+1);
}
for(const name of ['arrival','battle','choice-2','choice-3','ability','lantern-gear','floor11','final-battle','awakening','ending-choice','ending','pre-defeat','defeat'])assert.ok(records[name],name+' fixture missing');
fs.writeFileSync(out+'/manifest.json',JSON.stringify({source,sourceSHA256:sha(fs.readFileSync(source)),method:'Unmodified current engine, 4176 public actions; each save is a real prefix. Defeat adds one allowed attack from an adjacent legal state.',observedByHuman:false,records},null,2));console.log(JSON.stringify({fixtures:Object.keys(records),sourceActions:trace.actions.length,ending:g.state.ending,hp:g.state.hp}));
