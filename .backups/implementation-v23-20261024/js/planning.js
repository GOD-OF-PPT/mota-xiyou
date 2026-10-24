/* Bounded, read-only rehearsal. All outcomes use an isolated public engine. */
(function(root){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x)),dirs=()=>root.TowerRules.directions;
  const resources=s=>({hp:s.hp,atk:s.atk,def:s.def,mana:s.mana,coins:s.coins,orbs:s.orbs,elixirs:s.elixirs,keys:{...s.keys},rescued:s.rescued.length});
  function delta(a,b){const out={};for(const k of ['hp','atk','def','mana','coins','orbs','elixirs','rescued'])if(b[k]!==a[k])out[k]=b[k]-a[k];const keys={};for(const k of ['yellow','blue','red'])if(b.keys[k]!==a.keys[k])keys[k]=b.keys[k]-a.keys[k];if(Object.keys(keys).length)out.keys=keys;return out;}
  function name(engine,e){return e.label||e.name||(e.enemy?engine.data.enemies[e.enemy].name:e.item?engine.data.items[e.item].name:e.type==='treasure'?engine.data.treasures[e.treasure].name:e.type==='fragment'?'外舍利 '+(e.fragment+1):e.type==='relic'?engine.data.relics[e.relic].name:'塔中目标');}
  function targets(engine){
    const result=[],s=engine.state;for(const e of engine.data.floors[s.floor].entities){if(s.removed[e.id])continue;const base={id:e.id,x:e.x,y:e.y,floor:s.floor,name:name(engine,e)},add=(kind,label=base.name,option)=>result.push({...base,kind,label,option});
      if(e.type==='enemy')add('fight');else if(['item','chest','cache','relic','fragment','treasure'].includes(e.type))add('collect');
      else if(e.type==='door'){add('door','用钥 · '+base.name);if(e.morphable&&s.relics.includes(1))add('morph','化蝉 · '+base.name);}
      else if(e.type==='choice'&&!s.choices[e.choice]){for(const o of engine.data.choices[e.choice].options)if(!e.option||e.option===o.id)add('choose',base.name+' / '+o.label,o.id);}
      else if(e.type==='switch'){if(e.kind==='plate'){add('clone','留影 · '+base.name);add('recall','收影 · '+base.name);}else add('switch','扳动 / 复位 · '+base.name);}
      else if(e.type==='tide')add('tide','切换水位 · '+base.name);else if(e.type==='rescue'&&!s.quests[e.quest])add('rescue');else if(e.type==='illusion'&&!s.revealed[e.id])add('reveal');
      else if(e.aid&&!s.quests[e.aid])add('aid');else if(e.type==='altar')add('rest','走到莲灯 · 免费补息');
    }
    for(const [kind,label,amount]of [['elixir','服随身蟠桃 · 消耗 1 枚',s.elixirs],['orb','凝息珠补息 · 消耗 1 珠',s.orbs]])if(amount>0)result.push({id:'supply:'+kind,kind,x:s.x,y:s.y,floor:s.floor,label,name:label});
    const f=engine.data.floors[s.floor];for(let y=0;y<f.map.length;y++)for(let x=0;x<f.map[y].length;x++){const tile=engine.getTile(x,y),kind=tile==='~'?'staff':tile==='='?'morph':null;if(kind)result.push({kind,x,y,floor:s.floor,label:(kind==='staff'?'架桥':'化蝉')+' · '+(x+1)+','+(y+1),name:kind==='staff'?'断口':'铁栅'});}
    return result;
  }
  const targetKey=a=>[a.floor,a.id||a.x+','+a.y,a.kind,a.option||''].join(':');
  function safeCell(engine,x,y){if(engine.getTile(x,y)!=='.')return false;const e=engine.getEntity(x,y);return !e||(['gate','seal'].includes(e.type)&&engine.isGateOpen(e))||(e.type==='illusion'&&engine.state.revealed[e.id])||e.type==='stairs';}
  function route(engine,target,radius){
    const s=engine.state,q=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]);
    for(let cursor=0;cursor<q.length;cursor++){const p=q[cursor];if(Math.abs(p.x-target.x)+Math.abs(p.y-target.y)<=radius)return p.path;
      for(const [dir,[dx,dy]]of Object.entries(dirs())){const x=p.x+dx,y=p.y+dy,key=x+','+y;if(seen.has(key))continue;seen.add(key);const end=radius===0&&x===target.x&&y===target.y;if((end&&engine.getTile(x,y)==='.')||safeCell(engine,x,y))q.push({x,y,path:p.path.concat(dir)});}
    }return null;
  }
  function simulate(engine,steps,equipped=engine.state.equipped){
    const start=resources(engine.state),out={possible:false,steps:[],before:start,after:start,delta:{},damage:0,hpPaid:0,hpGained:0,walk:0,equipped:[...equipped],reason:''};
    if(!Array.isArray(steps)||!steps.length||steps.length>3){out.reason='从本层标记 1–3 个明确动作，再比较。';return out;}
    if(!Array.isArray(equipped)||equipped.length>2||new Set(equipped).size!==equipped.length||equipped.some(id=>!engine.state.treasures.includes(id))){out.reason='只能比较已拥有的零至两件法器。';return out;}
    const sim=new root.TowerEngine(engine.data,{persist:false});sim.state=copy(engine.state);let notice='';sim.on((type,d)=>{if(type==='notice')notice=d;if(type==='effect'&&d.type==='attack')out.damage+=d.meta.damage;});
    if(JSON.stringify([...equipped].sort())!==JSON.stringify([...sim.state.equipped].sort())){
      if(sim.getEntity(sim.state.x,sim.state.y)?.type!=='altar'){out.reason='到莲灯再比较其他行装；当前位置仍按当前配装推演。';return out;}
      for(const id of [...sim.state.equipped])sim.equipTreasure(id);for(const id of equipped)sim.equipTreasure(id);
    }
    for(const step of steps){const before=resources(sim.state),row={label:step.label||step.name,kind:step.kind,delta:{},path:[],possible:false};out.steps.push(row);notice='';
      if(step.floor!==sim.state.floor){row.reason='仅推演本层；换层后重新标记。';break;}
      const target=targets(sim).find(t=>targetKey(t)===targetKey(step));if(!target){row.reason='目标已变化或动作已完成，请重新标记。';break;}
      const radius=['collect','rest'].includes(step.kind)?0:step.kind==='clone'?4:1,path=['elixir','orb'].includes(step.kind)?[]:route(sim,step,radius);if(!path){row.reason='通路被未处理目标、门或地形阻断；将阻挡动作放在前面。';break;}
      row.path=path;let walked=true;for(const dir of path){if(!sim.step(dir)){walked=false;break;}out.walk++;}if(!walked){row.reason=notice||'当前通路条件尚未满足。';break;}
      const e=step.id&&sim.getEntity(step.x,step.y);let ok=false;
      switch(step.kind){
        case 'collect':ok=!!sim.state.removed[step.id];break;
        case 'rest':ok=sim.getEntity(sim.state.x,sim.state.y)?.type==='altar';if(ok&&sim.state.mana<sim.state.maxMana)sim.meditate();break;
        case 'elixir':case 'orb':ok=sim.useConsumable(step.kind);break;
        case 'fight':{const p=sim.preview(e.enemy);if(!p.possible||!p.survive||!p.canAfford){notice=!p.possible?p.reason:!p.canAfford?'凝息珠不足。':`预计损失 ${p.damage}，现有生命 ${sim.state.hp}；战后将力竭，请调整成长或补给。`;break;}ok=sim.fight(e);break;}
        case 'door':ok=sim.openDoor(e);break;
        case 'choose':ok=sim.choose(e,step.option);break;
        case 'clone':case 'morph':case 'staff':ok=sim.useAbility(step.kind,step.x,step.y);break;
        case 'recall':ok=sim.recallClone(e.id);break;
        case 'switch':ok=sim.toggleSwitch(e);break;
        case 'tide':ok=sim.toggleTide(e);break;
        case 'rescue':ok=sim.rescue(e);break;
        case 'reveal':ok=sim.reveal(e);break;
        case 'aid':ok=sim.receiveAid(e);break;
      }
      const after=resources(sim.state);row.delta=delta(before,after);row.possible=!!ok;if(step.kind!=='fight')out.hpPaid+=Math.max(0,before.hp-after.hp);out.hpGained+=Math.max(0,after.hp-before.hp);
      if(!ok){row.reason=notice||'条件尚未满足；查看目标的公开要求。';break;}
    }
    out.after=resources(sim.state);out.delta=delta(start,out.after);out.possible=out.steps.length===steps.length&&out.steps.every(s=>s.possible);out.reason=out.possible?'':out.steps.at(-1)?.reason||out.reason;return out;
  }
  function combinations(engine){const owned=engine.state.treasures,result=[[]];for(let i=0;i<owned.length;i++){result.push([owned[i]]);for(let j=i+1;j<owned.length;j++)result.push([owned[i],owned[j]]);}return result;}
  function equip(engine,ids){if(!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!engine.state.treasures.includes(id))||engine.getEntity(engine.state.x,engine.state.y)?.type!=='altar'||engine.state.won||engine.state.defeated)return false;if(JSON.stringify([...ids].sort())===JSON.stringify([...engine.state.equipped].sort()))return false;engine.checkpoint();engine.state.equipped=[...ids];engine.addLog('整套行装已确认，战损与神通费用已更新。','magic');engine.changed();return true;}
  function fastStep(engine,dir){const s=engine.state,[dx,dy]=dirs()[dir]||[],x=s.x+dx,y=s.y+dy;return Number.isFinite(x)&&engine.getTile(x,y)==='.'&&!!s.walked?.[`${s.floor}:${x}:${y}`]&&!engine.getEntity(x,y)&&Object.values(dirs()).every(([ax,ay])=>!engine.getEntity(x+ax,y+ay));}
  root.TowerPlanning={targets,targetKey,simulate,combinations,equip,route,safeCell,fastStep,resources,delta};
})(typeof window!=='undefined'?window:globalThis);
