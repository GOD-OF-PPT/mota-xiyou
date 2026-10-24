const fs=require('node:fs'),path=require('node:path');global.window=global;require('../js/world.js');require('../js/engine.js');
const game=new TowerEngine(TowerData),actions=JSON.parse(fs.readFileSync(path.join(__dirname,'../tests/playthrough-atk.json'),'utf8')).actions;
const result={};game.newGame();
for(let i=0;i<actions.length;i++){
 const action=actions[i];if(action.type==='finish')break;
 if(!game[action.type](...action.args))throw new Error('record failed '+i);
 const s=game.state,f=TowerData.floors[s.floor];
 if(!result.stairChoke&&s.floor===1&&s.x===6&&s.y===11){
  const copy=new TowerEngine(TowerData);copy.load(game.exportSave());copy.step('right');
  result.stairChoke={floor:2,position:[copy.state.x,copy.state.y],target:[5,11],path:copy.findPath(5,11),stairs:[6,11],message:'The geometric two-step path crosses an automatic down-stair tile.'};
 }
 if(!result.leverAutoToggle){
  const active=f.entities.filter(e=>e.type==='switch'&&e.kind==='lever'&&s.switches[e.id]);
  for(let y=1;y<12&&!result.leverAutoToggle;y++)for(let x=1;x<12&&!result.leverAutoToggle;x++){
   if(game.getTile(x,y)!=='.'||game.getEntity(x,y))continue;
   const route=game.findPath(x,y);if(!route||route.length<2)continue;
   let px=s.x,py=s.y,found=null;
   for(const d of route.slice(0,-1)){const [dx,dy]=TowerRules.directions[d];px+=dx;py+=dy;found=active.find(e=>e.x===px&&e.y===py);if(found)break;}
   if(found){const copy=new TowerEngine(TowerData);copy.load(game.exportSave());for(const d of route)copy.step(d);result.leverAutoToggle={floor:s.floor+1,from:[s.x,s.y],target:[x,y],route,lever:{id:found.id,x:found.x,y:found.y,label:found.label},before:true,after:copy.state.switches[found.id]};}
  }
 }
 if(result.stairChoke&&result.leverAutoToggle)break;
}
fs.writeFileSync(path.join(__dirname,'navigation-observations.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
