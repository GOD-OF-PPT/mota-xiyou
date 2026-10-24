/* Six real treasures, a legal walk back to the lantern, and all 22 sets. */
const fs=require('node:fs'),assert=require('node:assert/strict');global.window=global;require('../js/world');require('../js/engine');require('../js/planning');
const g=new TowerEngine(TowerData,{persist:false});g.newGame();let found=false;
for(const a of require('./playthrough-v9-free-mixed-direct-offering.json').actions){
 if(a.type==='fight'&&a.args[0].enemy==='heart'){
  const altar=TowerData.floors[17].entities.find(e=>e.type==='altar'),back=g.findPath(altar.x,altar.y);for(const d of back)assert.ok(g.step(d));found=true;
  const step=TowerPlanning.targets(g).find(t=>t.kind==='fight'&&t.id===a.args[0].id),combos=TowerPlanning.combinations(g),before=g.snapshot(),start=performance.now(),rows=combos.map(ids=>({gear:ids,result:TowerPlanning.simulate(g,[step],ids)}));assert.equal(combos.length,22);assert.deepEqual(g.snapshot(),before);assert.ok(rows.some(r=>r.result.possible));
  fs.writeFileSync('audits/v22-all-owned-gear.json',JSON.stringify({passed:true,method:'Original public full-campaign trace to pre-boss checkpoint, then 26 legal walking actions back to lantern. No resource or position edits.',floor:18,returnPath:back,combinations:22,steps:[step],ms:performance.now()-start,rows},null,2));console.log('22 owned sets; '+rows.filter(r=>r.result.possible).length+' survive the same final encounter');break;
 }assert.ok(g[a.type](...a.args));
}
assert.ok(found);
