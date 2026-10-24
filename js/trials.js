/* Public objectives and comparable resource vectors, without permanent rewards. */
(function(root){
 'use strict';const cp=x=>JSON.parse(JSON.stringify(x));
 const spec=id=>root.TOWER_TRIALS?.trials.find(t=>t.id===id);
 function qualification(engine,t,objective){const s=engine.state,exit=engine.data.floors[t.floor].entities.find(e=>e.type==='stairs'&&e.to===t.exitTo);if(s.floor!==t.floor||s.defeated||s.hp<=0)return {met:false,reason:'先完成当前试炼，保留可行动的生命。'};
  if(!exit||!engine.requirements(exit).met||engine.stairRequirement(exit)>s.relics.length)return {met:false,reason:'舍利或上行机关尚未全部完成。'};
  if(t.id.startsWith('ferry')){if(!s.fragments.includes(7)||!s.switches['f7-1'])return {met:false,reason:'先取得舍利并接通定风扳杆。'};if(objective==='keep-key'&&s.keys.yellow<t.seed.keys.yellow)return {met:false,reason:'本题要求保留起始黄钥；可以回溯或重走同题。'};if(objective==='lantern-way'&&!(s.choices.ferryVow==='passage'&&s.walked?.['7:2:14']&&s.walked?.['7:2:6']))return {met:false,reason:'本题要求供灯，并亲自经过南北两道栈门。'};}
  else if(s.choices.silk!==objective||!s.fragments.includes(10)||!s.switches['f10-1']||!s.switches['f10-2']||s.switches['f10-16'])return {met:false,reason:'取得指定经卷，收回丙影，以甲乙接通上行。'};
  if(engine.distance(exit)>1)return {met:false,reason:'条件已齐；走近上行塔阶，按 F 确认完成。'};return {met:true,exit};
 }
 function vector(s){return {hp:s.hp,atk:s.atk,def:s.def,mana:s.mana,coins:s.coins,orbs:s.orbs,elixirs:s.elixirs,yellow:s.keys.yellow,blue:s.keys.blue,red:s.keys.red,rescued:[...s.rescued].sort()};}
 function group(r){return [r.trialId,r.objective,r.startHash,r.rulesHash,r.revision,r.standard?'standard':'custom'].join('|');}
 function compare(a,b){if(!a.standard||!b.standard||group(a)!==group(b))return 'incomparable';const keys=['hp','atk','def','mana','coins','orbs','elixirs','yellow','blue','red'],av=a.vector,bv=b.vector,atLeast=keys.every(k=>av[k]>=bv[k])&&bv.rescued.every(id=>av.rescued.includes(id)),bAtLeast=keys.every(k=>bv[k]>=av[k])&&av.rescued.every(id=>bv.rescued.includes(id));if(atLeast&&bAtLeast)return 'same';return atLeast?'better':bAtLeast?'worse':'tradeoff';}
 function projection(s){const excluded=new Set(['startedAt','settings','log','journal','outcomes','seenIntros']);return Object.fromEntries(Object.keys(s).sort().filter(k=>!excluded.has(k)).map(k=>[k,cp(s[k])]));}
 function normalize(args){return args.map(a=>a&&typeof a==='object'&&!Array.isArray(a)&&a.id?{$entity:a.id}:cp(a));}
 function execute(engine,a){const args=a.args.map(x=>x?.$entity?engine.data.floors[engine.state.floor].entities.find(e=>e.id===x.$entity):x);if(args.some(x=>x===undefined))return false;if(a.type==='restore')return engine.chronicle?.restore(args[0]);if(a.type==='returnPresent')return engine.chronicle?.returnToPresent();return engine[a.type]?.(...args);}
 root.TowerTrials={spec,qualification,vector,group,compare,projection,normalize,execute};
})(typeof window!=='undefined'?window:globalThis);
