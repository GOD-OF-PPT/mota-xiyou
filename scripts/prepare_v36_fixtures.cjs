/* Public legal campaign prefixes for door costs, approach and spell choices. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.window=global;for(const f of ['world','encounters','chronicle','outcomes','engine'])require('../js/'+f);
const root=path.resolve(__dirname,'..'),out=root+'/audits/v36-fixtures',records={},trace=require('../tests/playthrough-v28-free-mixed-direct.json').actions,g=new TowerEngine(TowerData,{persist:false});g.newGame();fs.mkdirSync(out,{recursive:true});
function save(name,e,index){if(records[name])return;const raw=g.exportSave(),file='audits/v36-fixtures/'+name+'.json';fs.writeFileSync(root+'/'+file,raw);records[name]={file,target:{...e},prefixActions:index,keys:{...g.state.keys},mana:g.state.mana,relics:[...g.state.relics],sha256:crypto.createHash('sha256').update(raw).digest('hex')};}
for(let i=0;i<trace.length;i++){
 const a=trace[i];
 for(const e of g.data.floors[g.state.floor].entities){if(e.type!=='door'||!g.isCurrent(e))continue;const near=g.distance(e)<=1;
  if(near&&!g.state.keys[e.color])save('missing-key',e,i);
  if(e.color==='blue'&&!near&&g.state.keys.blue&&g.findPath(e.x,e.y))save('distant-blue',e,i);
  if(near&&e.color==='blue'&&g.state.relics.includes(1)&&g.state.mana<g.abilityCost('morph'))save('low-mana',e,i);
  if(near&&e.id==='f2-16'&&g.state.keys.blue&&!g.state.relics.includes(1))save('screen-blue',e,i);
 }
 if(a.type==='openDoor'){const e=g.data.floors[g.state.floor].entities.find(e=>e.id===a.args[0].id);save('key-'+e.color,e,i);}
 if(a.type==='useAbility'&&a.args[0]==='morph'){const e=g.getEntity(a.args[1],a.args[2]);if(e?.type==='door')save('morph-blue',e,i);}
 assert.notEqual(g[a.type](...a.args),false,'legal prefix '+i);
}
assert.ok(g.state.won);for(const name of ['key-yellow','key-blue','missing-key','distant-blue','morph-blue'])assert.ok(records[name],name);fs.writeFileSync(out+'/manifest.json',JSON.stringify({records,source:'tests/playthrough-v28-free-mixed-direct.json',legalCampaignActions:trace.length},null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(records).map(([k,v])=>[k,{target:v.target.id,prefix:v.prefixActions,keys:v.keys,mana:v.mana,relics:v.relics}]))));
