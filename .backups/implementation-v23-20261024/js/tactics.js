/* Read-only, one-pickup route comparisons. No state, cost or save writes. */
(function(root){
  'use strict';
  function growthPlans(engine,enemy){
    const s=engine.state,data=engine.data,floor=data.floors[s.floor],baseline=root.TowerRules.battle(s,enemy),queue=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]),plans=[];
    for(let cursor=0;cursor<queue.length;cursor++){
      const cur=queue[cursor];
      for(const [dir,[dx,dy]]of Object.entries(root.TowerRules.directions)){
        const x=cur.x+dx,y=cur.y+dy,key=x+','+y;
        if(seen.has(key)||engine.getTile(x,y)!=='.')continue;seen.add(key);
        const e=engine.getEntity(x,y),path=cur.path.concat(dir),item=e?.type==='item'&&data.items[e.item];
        if(item&&['atk','def'].includes(item.kind)){
          const after=root.TowerRules.battle({...s,[item.kind]:s[item.kind]+(item.value||1)},enemy);
          plans.push({id:e.id,x,y,item:e.item,kind:item.kind,value:item.value||1,name:item.name,path,steps:path.length,before:baseline,after,saved:baseline.possible&&after.possible?baseline.damage-after.damage:null});
        }
        // A plan never silently claims a potion, key, contract, relic, chest or
        // another crystal on the way. Closed doors/enemies stay real barriers.
        if(engine.isBlocked(e)||e&&['item','chest','cache','fragment','treasure','relic','choice','rescue','finale','portal','tide','resonator','switch','illusion'].includes(e.type))continue;
        queue.push({x,y,path});
      }
    }
    const gain=p=>!p.before.possible&&p.after.possible?Infinity:p.saved??-Infinity;
    return ['atk','def'].map(kind=>plans.filter(p=>p.kind===kind).sort((a,b)=>gain(b)-gain(a)||a.steps-b.steps||a.id.localeCompare(b.id))[0]).filter(Boolean);
  }
  root.TowerTactics={growthPlans};
})(typeof window!=='undefined'?window:globalThis);
