/* Read-only presentation of preview, blockage and settled choice receipts. */
(function(root){
 'use strict';
 const stats=[['hp','生命'],['atk','攻击'],['def','防御'],['coins','功德'],['orbs','凝息珠'],['elixirs','蟠桃']],keyNames={yellow:'铜钥',blue:'青钥',red:'心钥'};
 function changes(before,after){
  const rows=stats.filter(([key])=>before[key]!==after[key]).map(([key,label])=>`${label} ${before[key]} → ${after[key]}`);
  for(const [key,label]of Object.entries(keyNames))if(before.keys[key]!==after.keys[key])rows.push(`${label} ${before.keys[key]} → ${after.keys[key]}`);
  return rows;
 }
 function previewChanges(s,cost,reward){
  const after={...s,keys:{...s.keys}};
  for(const [key]of stats)after[key]=s[key]-(cost[key]||0)+(reward[key]||0);
  if(cost.key)after.keys[cost.key.color]-=cost.key.amount||1;
  if(reward.key)after.keys[reward.key.color]+=reward.key.amount||1;
  for(const [key,n]of Object.entries(reward.keys||{}))after.keys[key]+=n;
  // An unavailable payment is a shortage, never a promise of negative resources.
  return changes(s,after).filter(row=>!row.includes('→ -'));
 }
 function barrier(engine,e,p){
  const s=engine.state;
  if((e.requires||0)>s.relics.length){
   const relic=engine.data.relics[e.requires-1],floor=engine.data.floors.find(f=>f.entities.some(a=>a.type==='relic'&&a.relic===e.requires-1));
   return {reason:`尚需 ${e.requires} 重心印（当前 ${s.relics.length}/${e.requires}）`,next:`先到第 ${(floor?.id??(e.requires*3-1))+1} 层唤醒${relic?.name.replace('舍利','心印')||'所需心印'}，再回来领取。`,guide:{label:'标记当前要事'},label:'心印未齐，暂不能领取'};
  }
  if(e.option&&e.option!==p?.option?.id){const target=engine.data.floors[s.floor].entities.find(a=>a.type==='choice'&&a.choice===e.choice&&a.option===p?.option?.id);return {reason:'请到对应的契台选择此路。',next:'此处只可确认本台的取舍；可先在地图标出另一契台。',guide:target?{label:'标记对应契台',target}:null,label:'须到对应契台'};}
  if(p?.chosen)return {reason:'这份因果已经作出选择。',next:'当前不会再次发奖；探索中可按 Z 回溯到取舍前。',label:'此念已定'};
  const c=p?.cost||{};
  if(c.key&&(s.keys[c.key.color]||0)<(c.key.amount||1))return {reason:`缺少${keyNames[c.key.color]}匙：需要 ${c.key.amount||1} 把，持有 ${s.keys[c.key.color]||0} 把。`,next:'可改选其他方案，或寻回钥匙后再来。',label:'钥匙不足，暂不能确认'};
  for(const [key,label]of [['coins','功德'],['orbs','凝息珠'],['hp','生命']])if(c[key]&&(key==='hp'?c[key]>=s[key]:c[key]>s[key]))return {reason:`${label}不足：需支付 ${c[key]}，当前 ${s[key]}${key==='hp'?'；支付后须保留生命':''}。`,next:'先补足资源，或比较其他方案；当前未扣除任何资源。',label:`${label}不足，暂不能确认`};
  if(p&&!p.possible)return {reason:p.reason,next:'先完成所需条件；选项会保留，当前不会支付或封存。',guide:{label:'标记当前要事'},label:'条件未齐，暂不能确认'};
  if(!engine.isCurrent(e)||engine.distance(e)>1)return {reason:'请先走近契台，再确认。',next:'查看和标记不消耗资源。',guide:{label:'标记当前要事'},label:'请先走近契台'};
  return null;
 }
 function describe(engine,e,id){
  const spec=engine.data.choices[e.choice],picked=spec.options.find(o=>o.id===id),sample=picked||spec.options.find(o=>o.id===e.option)||spec.options[0],p=engine.choicePreview(e,sample.id),cache=e.type==='cache',b=cache?null:barrier(engine,e,p),name=picked?.label.split(' · ')[0],rows=picked?previewChanges(engine.state,p.cost,p.reward):[];
  const committed=spec.options.find(o=>o.id===engine.state.choices[e.choice]);
  if(committed&&!cache){
   const title=committed.label.split(' · ')[0],target=engine.data.floors[engine.state.floor].entities.find(a=>a.type==='cache'&&a.choice===e.choice),pending=spec.grant==='cache'&&!p.rewardAlreadyClaimed&&target&&!engine.state.removed[target.id];
   const next=pending?'沿已开启的路线抵达北侧共鸣匣，亲自领取奖励。':'奖励已领取；返回地图继续探索，Z 可回溯到定契前。';
   return {status:'settled',settled:true,allowed:false,picked:picked?.id||null,name,headline:`已定契：${title}`,reason:'',next,guide:pending?{label:'标记北匣位置',target}:null,rows:[],buttonLabel:'此契已定',announcement:`已定契：${title}。无需再次确认，其余选项已封存。${next}`};
  }
  const allowed=!!picked&&(cache||!b),status=!picked?(b?'locked':'choose'):cache?'preview':b?'blocked':'ready';
  return {status,allowed,picked:picked?.id||null,name,headline:picked?`已选：${name} · ${cache?'尚未领取':allowed?'等待确认':'尚未生效'}`:b?(p.chosen?'此念已经确定':'此处尚未解锁 · 还不能领取'):'先选一个方案，再明确确认',reason:b?.reason||'',next:b?.next||(cache?'先定位契台，在契台确认；奖励仍须亲自抵达领取。':spec.grant==='cache'?'这里只定路线，奖励须到北侧共鸣匣领取。':'确认后立即生效，另一项封存；探索中 Z 可回溯。'),guide:b?.guide||null,rows,previewTitle:spec.grant==='cache'?'北匣领取后预计':b?'解锁并确认后预计':'确认后预计',buttonLabel:!picked?'请先选择一项':cache?'定位契台：'+name:b?b.label:'确认：'+name,announcement:picked?`已选${name}，${allowed?(cache?'仍未领取，定位不结算。':'尚未生效，按 Enter 确认。'):'尚未生效。'+b.reason+' '+b.next}`:b?.reason||'选择只比较，确认才生效。'};
 }
 function settled(engine,e,id,before){
  const spec=engine.data.choices[e.choice],option=spec.options.find(o=>o.id===id),rows=changes(before,engine.state),deferred=spec.grant==='cache';
  return {title:(deferred?'路线已定：':'已生效：')+option.label.split(' · ')[0],text:[...rows,deferred?'奖励尚未领取，须到北侧共鸣匣领取。':'另一项已封存；探索中 Z 可回溯。'].join('；')};
 }
 root.TowerChoiceFeedback={describe,settled};
})(typeof window!=='undefined'?window:globalThis);
