/* A read-only player journey: goals, prerequisites and receipts share one state. */
(function(root){
  'use strict';
  const directions={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]},distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const statNames={hp:'生命',atk:'攻击',def:'防御',mana:'灵息',coins:'功德',orbs:'凝息珠',elixirs:'蟠桃'},keyNames={yellow:'铜钥',blue:'青钥',red:'心钥'};
  const snapshot=s=>({floor:s.floor,turn:s.turn,hp:s.hp,atk:s.atk,def:s.def,mana:s.mana,coins:s.coins,orbs:s.orbs,elixirs:s.elixirs,keys:{...s.keys},removed:{...s.removed},switches:{...s.switches},terrain:{...s.terrain},tides:{...s.tides},choices:{...s.choices},quests:{...s.quests},equipped:[...s.equipped],fragments:s.fragments.length,relics:s.relics.length,kills:s.kills,rescued:s.rescued.length,selfAwakened:s.selfAwakened});
  class TowerJourney {
    constructor(engine){this.engine=engine;this.previous=snapshot(engine.state);this.receipt=null;this.receipts=[];this.effect=null;this.cache=null;this.sequence=0;engine.on((type,detail)=>this.observe(type,detail));}
    observe(type,detail){
      if(['change','reset','floorEntry','selection','mode','log'].includes(type))this.cache=null;
      if(type==='reset'||type==='floorEntry'){this.previous=snapshot(this.engine.state);this.receipt=null;this.effect=null;if(type==='reset')this.receipts=[];return;}
      if(type==='effect'&&!['move','floor'].includes(detail.type))this.effect=detail;
      if(type!=='change')return;
      const s=this.engine.state,before=this.previous,after=snapshot(s);this.previous=after;
      if(s.floor!==before.floor||s.turn<=before.turn){this.effect=null;return;}
      const deltas=[];for(const [key,label]of Object.entries(statNames)){const n=after[key]-before[key];if(n)deltas.push({key,label,amount:n,before:before[key],after:after[key]});}
      for(const [key,label]of Object.entries(keyNames)){const n=after.keys[key]-before.keys[key];if(n)deltas.push({key:'key-'+key,label,amount:n,before:before.keys[key],after:after.keys[key]});}
      const removed=this.floor.entities.filter(e=>after.removed[e.id]&&!before.removed[e.id]),target=removed.find(e=>e.type==='enemy')||removed[0],effect=this.effect;this.effect=null;
      let title='',kind='action',receiptDetail='';
      if(s.defeated){title='行者力竭，可回溯战前';kind='defeat';}
      else if(after.fragments>before.fragments){title=`外舍利 ${after.fragments}/16 已寻回`;kind='fragment';}
      else if(after.relics>before.relics){title=this.engine.data.relics[s.relics.at(-1)].name+'已觉醒';kind='seal';}
      else if(after.kills>before.kills){title='击败'+this.engine.data.enemies[target?.enemy||effect?.meta?.enemy]?.name;kind='battle';}
      else if(removed.some(e=>e.type==='treasure')){const treasure=removed.find(e=>e.type==='treasure');title=this.name(treasure)+'已入行囊';kind='treasure';receiptDetail='到莲灯佩戴才生效，最多同佩两件。';}
      else if(after.selfAwakened&&!before.selfAwakened){title='无骨舍利已觉醒';kind='awakening';}
      else if(removed.some(e=>e.type==='door'))title='封门已开，通路保留';
      else if(JSON.stringify(before.choices)!==JSON.stringify(after.choices)){const group=Object.keys(after.choices).find(k=>after.choices[k]!==before.choices[k]),option=this.engine.data.choices[group]?.options.find(o=>o.id===after.choices[group]);title='已定：'+(option?.label.split(' · ')[0]||'此念');kind='choice';}
      else if(JSON.stringify(before.equipped)!==JSON.stringify(after.equipped))title='行装已更新，战损已重算';
      else if(after.rescued>before.rescued)title='同道已获救，归路已改变';
      else if(JSON.stringify(before.switches)!==JSON.stringify(after.switches))title=effect?.meta?.ability==='recall'?'分身归来，驻守位已释放':'机关已响应，查看新通路';
      else if(JSON.stringify(before.tides)!==JSON.stringify(after.tides))title='水位已改变，渡路重新显现';
      else if(JSON.stringify(before.quests)!==JSON.stringify(after.quests))title='援手已接通，归路已有变化';
      else if(JSON.stringify(before.terrain)!==JSON.stringify(after.terrain))title=effect?.meta?.ability==='morph'?'铁栅已卸，通路保留':'道路已接通';
      else if(effect?.meta?.ability==='eye')title='幻壁已破，真路显形';
      else if(deltas.length)title=target?this.name(target)+'已取得':deltas.some(d=>d.key==='atk'||d.key==='def')?'修为已增长':'行囊与气息已更新';
      if(kind==='choice'){
        const group=Object.keys(after.choices).find(k=>after.choices[k]!==before.choices[k]);
        const outcomes={bellVow:{offering:'防御增长；北门通路与另一份成长已放弃。',passage:'定海铁北门已接通；可绕过守宝精英。'},ferryVow:{offering:'生命已经恢复；保留黄钥，普通渡口仍可走。',passage:'渡灯栈道已开；交出黄钥与仙桃，绕过两场守卫。'},silk:{atk:'攻击经已取；仍需召回丙影、改驻甲乙再上楼。',def:'护身经已取；仍需召回丙影、改驻甲乙再上楼。'},sevenWounds:{rescue:'三位映身获救；十五层援手侧门接通。',power:'防御增长；十五层改走正面守卫通路。'},emberVow:{offering:'防御增长；终战与法器仍按保留路线规划。',passage:'心炉烬北径已开；放弃本次护身成长。'}};
        receiptDetail=outcomes[group]?.[after.choices[group]]||'本次代价与奖励已结算；另一份选择不再可取。';
      }else if(after.relics>before.relics){receiptDetail=['金箍架桥已醒，旧层断口可开路。','青蝉化形已醒，可卸铁栅、保留青钥。','分身已醒，驻守与免费收回可以组合。','法术护持已生效，旧敌战损已经改变。','归根匣已回应，回第一层取终局朱钥。'][s.relics.at(-1)];}
      else if(JSON.stringify(before.switches)!==JSON.stringify(after.switches)){const changed=Object.keys(after.switches).find(k=>after.switches[k]!==before.switches[k]),entity=this.floor.entities.find(e=>e.id===changed),targets=this.floor.entities.filter(e=>e.type==='gate'&&(e.controls?.includes(entity?.controlId||changed)||e.group&&e.group===entity?.group));receiptDetail=(targets.map(e=>e.label||'联动门').slice(0,2).join('、')||'本层联动通路')+'随驻守变化；收影免费，先保留退路。';}
      else if(JSON.stringify(before.tides)!==JSON.stringify(after.tides))receiptDetail=(s.tides.weakwater==='high'?'高水浮道':'低水井路')+'已开放；另一条渡路关闭，莲灯与安全中庭仍保留。';
      else if(after.rescued>before.rescued)receiptDetail='同道的援手已入局；查看关联侧路与水轮条件。';
      else if(JSON.stringify(before.terrain)!==JSON.stringify(after.terrain)&&effect?.meta?.ability==='morph')receiptDetail='灵息已支付，铁栅永久卸下；未消耗青钥。';
      if(title){this.receipt={id:++this.sequence,title,kind,detail:receiptDetail,deltas,turn:s.turn,floor:s.floor,target:target||effect&&{x:effect.x,y:effect.y}};if(['choice','seal','treasure','awakening'].includes(kind)||receiptDetail)this.receipts.unshift(this.receipt);this.receipts=this.receipts.slice(0,12);}
    }
    get floor(){return this.engine.data.floors[this.engine.state.floor];}
    conversation(entity){
      if(entity?.dialogue!=='lantern'||this.engine.state.relics.length)return null;
      if(this.engine.state.fragments.length)return ['外舍利已回来，塔阶在东庭等你。','守卫不必打尽，记得把力气留给前路。'];
      return ['先拾灵晶，看看守卫的战损怎样变化。','塔里没有催你的钟，绕开一场也无妨。','外舍利在山门支院，照破幻壁便能寻路。'];
    }
    name(e){const d=this.engine.data;return e.name||e.label?.split(' · ')[0]||(e.type==='item'?d.items[e.item]?.name:e.type==='enemy'?d.enemies[e.enemy]?.name:e.type==='fragment'?'外舍利':e.type==='relic'?d.relics[e.relic]?.name:e.type==='stairs'?'塔阶':e.type==='altar'?'莲灯':e.type==='illusion'?'幻壁':'机关');}
    withFloor(e,floor=this.engine.state.floor){return e?{...e,floor:e.floor??floor}:null;}
    prerequisite(e){
      const s=this.engine.state,data=this.engine.data,all=data.floors.flatMap(f=>f.entities.map(a=>({...a,floor:f.id}))),find=fn=>all.find(a=>!s.removed[a.id]&&fn(a));
      for(const id of e.requiresFragments||[])if(!s.fragments.includes(id))return find(a=>a.type==='fragment'&&a.fragment===id);
      if((e.requires||0)>s.relics.length)return this.engine.nextObjective();
      const controlIds=[...(e.requiresControls||[]),...(e.controls||[])];for(const id of controlIds){const a=find(a=>a.id===id||a.controlId===id);if(a&&!s.switches[a.id])return a;}
      for(const id of [...(e.requiresQuests||[]),...(e.requireQuest?[e.requireQuest]:[])])if(!s.quests[id]){
        const rescue=find(a=>a.type==='rescue'&&a.quest===id)||find(a=>a.aid===id);if(rescue)return rescue;
        const choice=find(a=>a.type==='choice'&&!s.choices[a.choice]&&data.choices[a.choice]?.options.some(o=>(!a.option||a.option===o.id)&&o.reward?.quests?.[id]));if(choice)return choice;
      }
      if(e.type==='gate'&&e.group&&!this.engine.isGateOpen(e))return find(a=>a.floor===s.floor&&a.type==='switch'&&a.group===e.group&&!s.switches[a.id]);
      return null;
    }
    frontier(goal){
      // Weighted exploration locates a real obstruction, never a fictitious route.
      const s=this.engine.state,f=this.floor,queue=[{x:s.x,y:s.y,cost:0,first:null}],costs=new Map([[s.x+','+s.y,0]]);
      while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const cur=queue.shift();if(cur.cost!==costs.get(cur.x+','+cur.y))continue;if(cur.x===goal.x&&cur.y===goal.y)return cur.first||goal;
        for(const [dx,dy]of Object.values(directions)){
          const x=cur.x+dx,y=cur.y+dy,t=this.engine.getTile(x,y);if(x<0||y<0||y>=f.map.length||x>=f.map[0].length||['#','v',undefined].includes(t))continue;
          const e=this.engine.getEntity(x,y);let penalty=0,obstruction=null;
          if(t==='w'){const water=f.waterTiles?.find(a=>a.x===x&&a.y===y),wheel=f.entities.find(a=>a.type==='tide');if(!water||!wheel)continue;obstruction=this.withFloor(wheel);penalty=60;}
          else if(t==='~'||t==='='){const mode=t==='~'?'staff':'morph';if(!s.relics.includes(mode==='staff'?0:1))continue;obstruction={x,y,mode,type:'terrain',floor:s.floor};penalty=35;}
          else if(e&&this.engine.isBlocked(e)){
            // An already-forfeited bypass is never a future prerequisite.
            const forfeited=(e.requiresQuests||[]).some(q=>!s.quests[q]&&Object.entries(this.engine.data.choices).some(([group,spec])=>s.choices[group]&&spec.options.some(o=>o.reward?.quests?.[q])&&!spec.options.find(o=>o.id===s.choices[group])?.reward?.quests?.[q]));if(forfeited)continue;
            obstruction=this.withFloor(e);penalty=e.type==='enemy'?80+Math.min(100,this.engine.preview(e.enemy).damage||0):e.type==='illusion'?8:40;if(!Number.isFinite(penalty))penalty=500;
          }
          const cost=cur.cost+1+penalty,key=x+','+y;if(cost>=(costs.get(key)??Infinity))continue;costs.set(key,cost);queue.push({x,y,cost,first:cur.first||obstruction});
        }
      }return goal;
    }
    resolve(goal,visited=new Set()){
      if(!goal)return null;const s=this.engine.state;goal=this.withFloor(goal);const key=goal.floor+':'+(goal.id||goal.x+','+goal.y);if(visited.has(key)||visited.size>12)return goal;visited.add(key);
      if(goal.floor!==s.floor){
        const portal=this.floor.entities.find(e=>e.type==='portal'&&e.to===goal.floor&&this.engine.requirements(e).met);if(portal)return this.resolve(portal,visited);
        if(goal.floor<s.floor&&s.relics.includes(2)&&s.visited.includes(goal.floor))return {...goal,journal:true};
        const stair=this.floor.entities.find(e=>e.type==='stairs'&&e.to===s.floor+Math.sign(goal.floor-s.floor));return stair?this.resolve(stair,visited):{...goal,journal:true};
      }
      const prior=this.prerequisite(goal);if(prior&&prior.id!==goal.id)return this.resolve(prior.type==='choice'?{...prior,optional:true}:prior,visited);
      if(goal.type==='switch'&&goal.kind==='plate'&&!s.switches[goal.id]&&this.engine.cloneStatus().free<=0){const raw=this.engine.nextObjective(),needed=raw?.requiresControls||[],active=this.engine.cloneStatus().active.find(a=>!needed.includes(a.controlId||a.id)&&this.engine.hasSafeRetreat({...s.switches,[a.id]:false}));if(active)return {...this.withFloor(active),recall:true};}
      const mode=goal.mode||(goal.kind==='plate'&&!s.switches[goal.id]?'clone':null);if(mode&&s.mana<this.engine.abilityCost(mode)){const altar=this.floor.entities.find(a=>a.type==='altar'&&this.engine.findPath(a.x,a.y));if(altar)return {...this.withFloor(altar),recharge:true};}
      if(goal.type==='door'&&!s.keys[goal.color]&&!(goal.morphable&&s.relics.includes(1))){const keyItem=this.floor.entities.find(e=>e.type==='item'&&!s.removed[e.id]&&this.engine.data.items[e.item]?.kind==='key'&&this.engine.data.items[e.item].color===goal.color&&this.engine.findPath(e.x,e.y));if(keyItem)return this.withFloor(keyItem);}
      if(!this.engine.findPath(goal.x,goal.y)&&distance(s,goal)>1){const obstruction=this.frontier(goal);if(obstruction.id!==goal.id||obstruction.mode)return this.resolve(obstruction,visited);}
      return goal;
    }
    model(){
      if(this.cache)return this.cache;const s=this.engine.state,raw=this.engine.nextObjective();let target=this.resolve(raw),text='',why='',lesson='',phase='探索';
      // The first lesson uses the existing nearby crystal; leaving it is allowed.
      if(s.floor===0&&!s.fragments.includes(0)&&s.turn<20){const crystal=this.floor.entities.find(e=>e.type==='item'&&this.engine.data.items[e.item]?.kind==='atk'&&!s.removed[e.id]&&distance(s,e)<=4&&this.engine.findPath(e.x,e.y));if(crystal)target=this.withFloor(crystal);}
      if(s.won){text='众生已有归途，这段因果已圆满。';target=null;phase='归途';why='归途已定，可重温结局或返回标题。';lesson='F 重温结局 · J 因果手记';}
      else if(!target){text='观察此层道路，准备下一步。';why='点选场景中的目标查看用途。';}
      else if(target.journal){text=`回第 ${target.floor+1} 层，${target.type==='chest'?'开启归根之匣。':'寻回遗落的舍利。'}`;why='乘云消耗 1 灵息；也可循原路回访。';phase='回访';lesson='J 查看回访';}
      else if(target.type==='enemy'){const p=this.engine.preview(target.enemy);text=`${this.engine.data.enemies[target.enemy].name}挡在前方，先比较战损。`;why=p.possible?(p.survive?`本战损失 ${p.damage} 生命；战后剩 ${s.hp-p.damage}。`:'当前生命不足，先成长、用药或改走其他路。'):'当前无法破防，先寻找成长或调整行装。';lesson='点守卫查看 · 松开再前进迎战';phase='比较';}
      else if(target.type==='item'){const item=this.engine.data.items[target.item];text=item.kind==='atk'&&s.floor===0?'先取西侧灵晶，增强金箍棒。':`先取得${item.name}，准备前路。`;why=item.kind==='atk'?'攻击成长会降低部分战损；可先比较再出棒。':item.kind==='key'?'门只消耗对应钥匙，开启后永久保留。':'补给有限，拾取后再比较战损。';lesson='方向键移动 · 点灵晶也可前往';phase='成长';}
      else if(target.type==='illusion'){text='用火眼照破幻壁，接通舍利支院。';why='辨真免费；幻壁破除后道路永久保留。';lesson='点幻壁 · 火眼辨真';phase='辨真';}
      else if(target.type==='fragment'){text='沿已开的通路，寻回本层外舍利。';why='舍利归位后可继续本层主线，无需清空守卫。';lesson='点舍利 · 前往寻回';phase='寻回';}
      else if(target.type==='relic'){text=`本印舍利已齐，解开${this.engine.data.relics[target.relic].name}。`;why='心印会带来新能力，也让旧路出现新解。';lesson='靠近心印 · 尝试解印';phase='觉醒';}
      else if(target.type==='stairs'){text=`本层要事已成，前往第 ${target.to+1} 层。`;why='可以回访；经过塔阶不会自动换层。';lesson='靠近塔阶 · F 主动上楼';phase='启程';}
      else if(target.type==='switch'){text=target.recall?'先收回一影，释放分身驻守位。':target.kind==='plate'?'用毫毛分身驻守阵眼，接通塔心。':`先接通${this.name(target)}。`;why=target.recall?'回收免费；关联门会复位，先保留安全退路。':target.kind==='plate'?`分身消耗 ${this.engine.abilityCost('clone')} 灵息；回收免费，关联门会复位。`:'扳动免费；地面与门的变化会保留。';lesson=target.recall?'点驻守阵眼 · 收回毫毛':target.kind==='plate'?'5 分身 · 四格内阵眼':'走近机关 · F 交互';phase=target.recall?'调度':'接通';}
      else if(target.type==='altar'){text='先到莲灯补满灵息，再继续开路。';why='站到莲灯即可免费补息；生命不会自动恢复。';lesson='点莲灯 · 走到灯前';phase='整装';}
      else if(target.type==='tide'){text='回到安全水轮，切换弱水渡路。';why='切水位免费；开一路、合一路，先看两侧守卫。';lesson='走近水轮 · F 切换';phase='渡路';}
      else if(target.type==='terrain'){text=target.mode==='staff'?'用金箍架桥，接通前方断口。':'用青蝉化形，卸下前方铁栅。';why=`消耗 ${this.engine.abilityCost(target.mode)} 灵息；成功后通路永久保留。`;lesson=target.mode==='staff'?'3 架桥 · 点相邻断口':'4 化蝉 · 点相邻铁栅';phase='开路';}
      else if(target.type==='door'){text=`先查看${keyNames[target.color]}封门的代价。`;why=`持有 ${s.keys[target.color]} 把，开门消耗 1 把；门后奖励可先查看。`;lesson='点门 · 比较后确认';phase='取舍';}
      else if(target.type==='resonator'){text='校正塔轴，让两塔重新共鸣。';why='校准免费；另一座塔的状态也会保留。';lesson='走近塔轴 · F 校准';phase='接通';}
      else if(target.type==='rescue'){text='先救出被困的同道，接通援手归路。';why='救援不消耗资源，渡路与机关会获得帮助。';lesson='走近同道 · F 解救';phase='救援';}
      else if(target.type==='chest'){text='五印已齐，开启归根之匣取得心钥。';why='心钥通往最终塔心；领取只会结算一次。';lesson='点宝匣 · 前往开启';phase='回响';}
      else if(target.type==='choice'){text='比较契台的代价与收益，再定一念。';why=target.optional?'可选捷径；常规路仍保留，查看不消耗。':'同组只取一项；查看和取消都不消耗。';lesson='点契台 · 比较取舍';phase='取舍';}
      else if(target.aid){text='向白衣善念求援，接通南侧归路。';why='援手免费，之后仍由你完成机关。';lesson='走近白衣 · 请求援手';phase='援手';}
      else if(target.type==='portal'){text='走入归根云廊，回山门取得心钥。';why='回廊不耗灵息，经过不会自动传送。';lesson='靠近回廊 · F 穿过';phase='回访';}
      else if(target.type==='finale'){text='走向莲阵，照见无骨舍利。';why='最后的归途由你亲自选择。';lesson='走近莲阵 · F 交互';phase='归真';}
      else {text='循此层线索，接通前方归路。';why=this.engine.requirements(target).missing.join(' · ')||'点选目标查看用途与条件。';}
      return this.cache={text,why,lesson,phase,target,journal:!!target?.journal,key:target?`${s.floor}:${target.id||target.x+','+target.y}`:'complete',chapter:this.engine.narrativeStatus(),raw};
    }
    safeRoute(target){
      if(!target||target.floor!==this.engine.state.floor)return null;let path=this.engine.findPath(target.x,target.y);
      if(!path||target.type==='terrain'){
        const s=this.engine.state,candidates=Object.values(directions).map(([dx,dy])=>({x:target.x+dx,y:target.y+dy})).filter(p=>this.engine.getTile(p.x,p.y)==='.'&&!this.engine.isBlocked(this.engine.getEntity(p.x,p.y))).map(p=>p.x===s.x&&p.y===s.y?[]:this.engine.findPath(p.x,p.y)).filter(Boolean).sort((a,b)=>a.length-b.length);path=candidates[0];
      }else{path=path.slice();if(this.engine.isBlocked(this.engine.getEntity(target.x,target.y)))path.pop();}
      if(!path)return null;
      let {x,y}=this.engine.state;for(const dir of path){const [dx,dy]=directions[dir];x+=dx;y+=dy;if(this.engine.getTile(x,y)!=='.'||this.engine.isBlocked(this.engine.getEntity(x,y)))return null;}return path;
    }
    purpose(e){
      if(!e)return '';if(e.type!=='enemy')return {fragment:'此行要事',relic:'心印觉醒',choice:'互斥取舍',altar:'补息与成长',resonator:'校准通路',switch:'改变通路',treasure:'可选异宝',chest:'条件宝匣'}[e.type]||'';
      if(e.role==='optional')return '可绕行的功德挑战';if(e.role==='treasure'){const reward=this.floor.entities.find(a=>e.guards?.includes(a.id));return reward?'守护'+this.name(reward)+' · 可放弃奖励':'守宝挑战 · 可放弃奖励';}return e.role==='boss'?'最终三相 · 战前准备':e.role==='guardian'?'舍利支院守卫 · 可先成长再战':'前路守卫 · 先比较战损';
    }
  }
  root.TowerJourney=TowerJourney;
})(typeof window!=='undefined'?window:globalThis);
