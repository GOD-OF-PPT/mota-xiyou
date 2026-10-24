/* Structured settled outcomes travel with the same save/undo branch. */
(function(root){
 'use strict';const cp=x=>JSON.parse(JSON.stringify(x));
 const refs={sevenWounds:{rescue:[{floor:14,id:'f14-20',quest:'sevenRescue',label:'十五层援手侧门'}],power:[]},emberVow:{passage:[{floor:16,id:'f16-v5-ember-gate',quest:'emberPassage',label:'心炉烬北径'}],offering:[]},ferryVow:{passage:[{floor:7,id:'f7-v5-ferry-south',quest:'ferryPassage',label:'渡灯栈道'}],offering:[]}};
 function consequences(engine,group,id){const d=engine.data,option=d.choices[group]?.options.find(o=>o.id===id);if(!option)return null;const resolved=(refs[group]?.[id]||[]).map(ref=>{const f=d.floors[ref.floor],entity=f.entities.find(e=>e.id===ref.id&&e.type==='gate')||f.entities.find(e=>e.type==='gate'&&e.requiresQuests?.includes(ref.quest));return {...ref,id:entity?.id,x:entity?.x,y:entity?.y,known:engine.state.visited.includes(ref.floor),active:!!engine.state.quests[ref.quest]};});return {title:option.label,description:option.description,cost:cp(option.cost||{}),reward:cp(option.reward||{}),targets:resolved};}
 function baseline(e){const s=e.state;return {floor:s.floor,visited:[...s.visited],turn:s.turn,hp:s.hp,atk:s.atk,def:s.def,coins:s.coins,mana:s.mana,orbs:s.orbs,elixirs:s.elixirs,keys:{...s.keys},choices:{...s.choices},rescued:[...s.rescued],relics:[...s.relics],won:s.won};}
 function begin(e){e.outcomeBefore=baseline(e);}
 function settle(e){const b=e.outcomeBefore,s=e.state;e.outcomeBefore=null;if(!b)return;const entries=s.outcomes||(s.outcomes=[]),deltas=[];for(const k of ['hp','atk','def','coins','mana','orbs','elixirs'])if(s[k]!==b[k])deltas.push({key:k,label:({hp:'生命',atk:'攻击',def:'防御',coins:'功德',mana:'灵息',orbs:'凝息珠',elixirs:'蟠桃'})[k],before:b[k],after:s[k],amount:s[k]-b[k]});for(const c of ['yellow','blue','red'])if(s.keys[c]!==b.keys[c])deltas.push({key:'key-'+c,label:({yellow:'铜钥',blue:'青钥',red:'朱钥'})[c],before:b.keys[c],after:s.keys[c],amount:s.keys[c]-b.keys[c]});
  const add=(kind,title,detail,targets=[])=>entries.push({kind,title,detail,targets,deltas:cp(deltas),floor:s.floor,turn:s.turn});
  const group=Object.keys(s.choices).find(k=>s.choices[k]!==b.choices[k]);if(group){const c=consequences(e,group,s.choices[group]);add('choice','已定：'+c.title,c.description,c.targets);}
  const relic=s.relics.find(id=>!b.relics.includes(id));if(relic!==undefined)add('seal',e.data.relics[relic].name+'已觉醒',['架桥已醒，旧断口可以重新利用。','化形已醒，卸锁可以保留青钥。','分身已醒，驻守与收回可以重排。','慈悲护持已生效，旧敌法术战损已经改变。','归根匣已回应，回山门取得最终心钥。'][relic]);
  if(!group&&s.rescued.length>b.rescued.length)add('rescue','同道已获救','援手已进入正式进度，关联侧路与机关条件随之改变。');
  const beforeChapter=Math.floor(b.floor/3),afterChapter=Math.floor(s.floor/3);if(afterChapter>beforeChapter&&!b.visited.some(f=>Math.floor(f/3)===afterChapter)){
   const detail=['架桥已醒，下一回可接断路，也可回看山门。','化形已醒，青锁与铁栅有了新解。','八戒获救，分身已醒；下一回要重排驻守。','慈悲护持已醒，旧敌战损已改变。','五印已归，取得心钥后可面对心猿。'][beforeChapter]||'本回通路已成，继续查看下一回目标。';add('chapter','第 '+(beforeChapter+1)+' 回已完成',detail);const entry=entries.at(-1),origin=e.chronicle?.data.records.find(r=>r.type==='chapter'&&Math.floor(r.state.floor/3)===beforeChapter);if(origin){entry.chapterSpan={fromFloor:origin.state.floor,fromTurn:origin.state.turn,complete:/首次踏入|第一回.*入塔/.test(origin.title)};entry.deltas=[];for(const [key,label]of Object.entries({hp:'生命',atk:'攻击',def:'防御',coins:'功德',mana:'灵息',orbs:'凝息珠',elixirs:'蟠桃'})){const before=origin.state[key],after=s[key];if(before!==after)entry.deltas.push({key,label,before,after,amount:after-before});}for(const [c,label]of Object.entries({yellow:'铜钥',blue:'青钥',red:'朱钥'})){const before=origin.state.keys[c],after=s.keys[c];if(before!==after)entry.deltas.push({key:'key-'+c,label,before,after,amount:after-before});}}e.pendingChapterOutcome=entry;
  }
  if(s.won&&!b.won)add('ending',s.ending==='release'?'与众生归去':'留灯守塔','最终归途由你亲自选择；救援和资源仍保留真实结果。');
  if(entries.length>120)s.outcomes=entries.slice(-120);
 }
 function history(e){return [...(e.state.outcomes||[])].reverse();}
 root.TowerOutcomes={begin,settle,history,consequences};
})(typeof window!=='undefined'?window:globalThis);
