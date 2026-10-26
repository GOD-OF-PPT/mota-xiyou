/* Legal twelfth-floor entry and a low-mana return that avoids both lamps. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.window=global;for(const f of ['world','encounters','chronicle','outcomes','engine'])require('../js/'+f);
const root=path.resolve(__dirname,'..'),out=root+'/audits/v37-fixtures',records={},trace=require('../tests/playthrough-v28-free-mixed-direct.json').actions,g=new TowerEngine(TowerData,{persist:false});g.newGame();fs.mkdirSync(out,{recursive:true});
function save(name,actor,source){const raw=actor.exportSave(),file='audits/v37-fixtures/'+name+'.json';fs.writeFileSync(root+'/'+file,raw);records[name]={file,source,sha256:crypto.createHash('sha256').update(raw).digest('hex'),mana:actor.state.mana,coins:actor.state.coins};}
function returnPath(actor){const s=actor.state,q=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]);for(let i=0;i<q.length;i++){const c=q[i];if(c.x===10&&c.y===19)return c.path;for(const [d,[dx,dy]]of Object.entries(TowerRules.directions)){const x=c.x+dx,y=c.y+dy,key=x+','+y,e=actor.getEntity(x,y);if(seen.has(key)||actor.getTile(x,y)!=='.'||actor.isBlocked(e)||e&&!['npc','monument','stairs'].includes(e.type))continue;seen.add(key);q.push({x,y,path:c.path.concat(d)});}}return null;}
for(let i=0;i<trace.length;i++){
 if(g.state.floor===11&&!records.entry)save('entry',g,{prefixActions:i});
 if(g.state.floor===11&&g.state.mana<g.state.maxMana&&!records['low-mana']){const path=returnPath(g);if(path){const copy=new TowerEngine(TowerData,{persist:false});assert.ok(copy.load(g.exportSave()));const before=copy.snapshot();for(const d of path)assert.ok(copy.step(d));assert.equal(copy.state.mana,before.mana);assert.equal(copy.state.hp,before.hp);assert.equal(copy.state.coins,before.coins);assert.deepEqual(copy.state.keys,before.keys);save('low-mana',copy,{prefixActions:i,extraLegalSteps:path});}}
 const a=trace[i];assert.notEqual(g[a.type](...a.args),false,'legal prefix '+i);
}
assert.ok(records.entry&&records['low-mana']&&g.state.won);fs.writeFileSync(out+'/manifest.json',JSON.stringify({records,source:'tests/playthrough-v28-free-mixed-direct.json',campaignActions:trace.length},null,2));console.log(JSON.stringify(records));
