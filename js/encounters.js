/* Authored encounters retain the v22 layout for existing revision-6 saves. */
(function(root){
  'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),legacy=copy(root.TowerData),current=copy(legacy);
  function move(data,floor,id,x,y,why){const f=data.floors[floor],e=f.entities.find(e=>e.id===id);if(!e||f.entities.some(a=>a.id!==id&&a.x===x&&a.y===y)||f.map[y]?.[x]!=='.')throw Error('Invalid authored placement '+id);const from=[e.x,e.y];Object.assign(e,{x,y});for(const list of [f.depth?.objectives,f.hintTargets])for(const t of list||[])if(t.x===from[0]&&t.y===from[1])Object.assign(t,{x,y});return {floor,id,from,to:[x,y],why};}
  const changes=[
    move(current,7,'f7-10',4,11,'低水守卫后取得攻击成长，改变后续战序。'),
    move(current,7,'f7-8',17,11,'高水余毒守卫后取得生命补给。'),
    move(current,10,'f10-9',10,3,'甲乙开启北庭补给，先补给或先取卷有不同驻守预算。')
  ];
  Object.assign(current.floors[7].entities.find(e=>e.id==='f7-5'),{role:'treasure',guards:['f7-10'],purpose:'低水渡口后是攻击成长；先比较战损与成长时机。'});
  Object.assign(current.floors[7].entities.find(e=>e.id==='f7-6'),{role:'treasure',guards:['f7-8'],purpose:'高水渡口后是生命补给；余毒代价会进入整段预算。'});
  for(const [floor,id]of [[7,'f7-wing-guard-0'],[10,'f10-wing-guard-0']])Object.assign(current.floors[floor].entities.find(e=>e.id===id),{role:'optional',guards:[],purpose:'可选的功德挑战；可以保留生命，不取这份战利。'});
  current.floors[10].entities.find(e=>e.id==='f10-3').label='北庭上行门 · 甲 + 乙';
  // The paid ferry route must actually avoid the guarded central approach.
  const ferry=current.floors[7],ferryMap=ferry.map.map(r=>r.split(''));
  for(const x of [3,4,5,6])ferryMap[7][x]='.';for(const x of [14,15,16])ferryMap[6][x]='.';ferry.map=ferryMap.map(r=>r.join(''));
  ferry.entities.push({id:'f7-v23-ferry-link',type:'gate',x:5,y:7,requiresQuests:['ferryPassage'],label:'渡灯中庭门 · 供灯后直达定风归路',purpose:'已供灯的栈道接入中庭，避开渡口与横桥守卫。'});
  ferry.entities.push({id:'f7-v23-ferry-east',type:'gate',x:15,y:6,requiresQuests:['ferryPassage'],label:'渡灯东归门 · 供灯后通往上行',purpose:'已供灯的归路避开东横桥守卫；北侧定风门仍须接通。'});
  ferry.hintTargets.push({text:'渡灯中庭门',x:5,y:7});
  changes.push({floor:7,id:'f7-v23-ferry-link',from:null,to:[5,7],why:'让已付黄钥的栈道接通中庭，真实避开守卫；不增加资源。'});
  changes.push({floor:7,id:'f7-v23-ferry-east',from:null,to:[15,6],why:'补齐同一上行终点的东侧归路；同一供灯取舍开门，不另收资源。'});
  current.choices.ferryVow.options.find(o=>o.id==='passage').description='消耗一把黄钥，放弃这份 90 生命；西缘栈道与中庭门永久接通。可从西庭取回攻击成长，避开渡口与横桥守卫；定风仍须亲自接通，东岸补给不随之领取。';
  ferry.hints.unshift('供灯后，西缘栈道在中庭门接回主路；西庭攻击成长可另行领取，东岸仙桃仍有独立代价。');
  current.levelDepth.revision=7;
  current.floors[7].hints.unshift('低水西渡取攻击，高水东渡取补给；成长在守卫之后。先看两场合计战损，再决定渡路。');
  current.floors[7].depth.insight='低水守卫后是攻击成长，高水守卫后是生命补给；先取哪份会改变后续战序。';
  current.floors[10].hints.unshift('北庭仙桃与上行门共用甲乙；可以先补给再换丙取卷，也可先取经卷再重建甲乙。收影免费，重新驻守仍耗灵息。');
  current.floors[10].depth.insight='甲乙不仅开上行，也开北庭仙桃；先补给或先取卷，会改变驻守和生命预算。';
  const versions={6:legacy,7:current};
  root.TowerEncounters={latest:current,legacy,changes,dataForRevision:n=>n>=7?current:legacy,copyForRevision:n=>copy(n>=7?current:legacy)};
  // New journeys use the new layouts. Old saves select their matching data.
  root.TowerData=current;
})(typeof window!=='undefined'?window:globalThis);
