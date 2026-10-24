const fs=require('node:fs');global.window=global;require('../js/world.js');require('../js/engine.js');
const rows=[];
for(const build of ['none','atk','def']){
 const run=JSON.parse(fs.readFileSync(__dirname+'/../tests/playthrough-'+build+'.json','utf8'));
 const e=new TowerEngine(TowerData);e.newGame();const fights=[],failed=[];
 for(const [i,a] of run.actions.entries()){
  if(a.type==='fight'){const p=e.preview(a.args[0].enemy);fights.push({floor:e.state.floor+1,enemy:a.args[0].enemy,damage:p.damage,hp:e.state.hp,atk:e.state.atk,def:e.state.def});}
  const result=e[a.type](...a.args);if(result===false)failed.push({i,type:a.type});if(e.state.defeated)throw Error('Death in '+build+' action '+i);
 }
 rows.push({build,won:e.state.won,defeated:e.state.defeated,hp:e.state.hp,atk:e.state.atk,def:e.state.def,coins:e.state.coins,elixirs:e.state.elixirs,orbs:e.state.orbs,kills:e.state.kills,actions:run.actions.length,zeroDamageFights:fights.filter(f=>f.damage===0).length,totalDamage:fights.reduce((a,f)=>a+f.damage,0),boss:fights.find(f=>f.enemy==='heart'),purchases:e.state.purchases,failedActions:failed});
}
fs.writeFileSync(__dirname+'/public-replay-audit.json',JSON.stringify({note:'Current engine replay of stored public action traces. These are three specified strategies, not an optimal solver or a human usability result.',profiles:rows},null,2));console.log(JSON.stringify(rows,null,2));
