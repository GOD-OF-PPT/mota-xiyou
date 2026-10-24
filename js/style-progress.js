/* Cosmetic completion reward. Uses the current storage namespace, never run resources. */
(function(root){
 'use strict';
 const KEY='dasheng-style-unlocks-v30',endings=['release','keep'];
 const cleared=s=>s?.won===true&&s.floor===17&&endings.includes(s.ending)&&s.selfAwakened===true&&[0,1,2,3,4].every(id=>s.relics?.includes(id))&&Array.isArray(s.fragments)&&new Set(s.fragments).size===16;
 let reward=null;
 try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1&&saved.mural===true&&endings.includes(saved.ending))reward=saved;}catch{}
 function record(s){
  if(reward||!cleared(s))return false;
  reward={version:1,mural:true,ending:s.ending,clearedAt:Date.now()};
  try{localStorage.setItem(KEY,JSON.stringify(reward));}catch{}
  root.dispatchEvent(new CustomEvent('tower-style-unlocked',{detail:{id:'mural',ending:s.ending}}));return true;
 }
 // Credit a previously completed campaign only through the real save validator.
 // Trial slots and arbitrary flags such as a visited floor never grant this reward.
 if(!reward&&root.TowerEngine&&root.TowerData)for(const key of ['dasheng-relic-tower-v1','dasheng-relic-tower-manual-v2']){
  try{const raw=localStorage.getItem(key);if(!raw)continue;const value=JSON.parse(raw);if(value.trialSession||!cleared(value.state))continue;
   const reader=new root.TowerEngine(root.TowerData,{persist:false});if(reader.load(raw)&&cleared(reader.state)){record(reader.state);break;}
  }catch{}
 }
 root.TowerStyleProgress={isUnlocked:id=>id==='material'||id==='mural'&&!!reward,recordCampaignClear:(state,{isTrial=false}={})=>!isTrial&&record(state),get reward(){return reward?{...reward}:null;}};
})(window);
