/* 大圣：舍利魔塔 · deterministic simulation. No DOM or rendering state is saved. */
(function (root) {
  'use strict';
  const SAVE_KEY = 'dasheng-relic-tower-v1';
  const MANUAL_KEY = 'dasheng-relic-tower-manual-v2';
  const clone = value => JSON.parse(JSON.stringify(value));
  const directions = { up: [0,-1], right: [1,0], down: [0,1], left: [-1,0] };

  const bossPlans = [
    {id:'direct',label:'执棒破阵',description:'保留攻击，直接迎战三相。无需凝息珠。',cost:{orbs:0}},
    {id:'anchor',label:'定海镇心',description:'消耗 1 凝息珠；攻击 −6，第二相防御 −20，第三相每击伤害减半，最后心火 −40。',cost:{orbs:1}},
    {id:'echoes',label:'毫毛合击',description:'消耗 2 凝息珠；第一相少受两击，第二相每棒伤害 +18，第三相每棒伤害 +8。',cost:{orbs:2}}
  ];
  const TREASURES={
    iron:{id:'iron',name:'定海铁',floor:1,description:'攻击 +6，防御 −3。高甲守卫的破防筹码，也会增加物理还击代价。'},
    lotus:{id:'lotus',name:'莲灯芯',floor:4,description:'每次法术反击减 6，攻击 −2。不能减免余毒、反震或最终心火。'},
    thorn:{id:'thorn',name:'照骨齿',floor:10,description:'先手守卫少先手一击，防御 −2。普通敌人的行动顺序不变。'},
    tide:{id:'tide',name:'听潮贝',floor:7,description:'整场总损失乘 90% 后向下取整；战利功德乘 75% 后向下取整。'},
    ember:{id:'ember',name:'心炉烬',floor:16,description:'每相第一棒额外 18 伤害；整场战后额外损失 8 生命。普通战算一相。'},
    mirror:{id:'mirror',name:'双影镜',floor:13,description:'分身耗 1 灵息，架桥与化蝉耗 2；每棒反震减 2，攻击 −2。'}
  };
  const BOSS_SEALS={staff:{name:'破执印',rule:'本相每棒伤害 +8'},morph:{name:'见微印',rule:'本相法术每击 −6，物理每击 −2'},clone:{name:'同行印',rule:'本相少受一次反击'}};
  function sealLayout(value){
    if(value===undefined||value===null)return [null,null,null];
    if(!Array.isArray(value)||value.length!==3||value.some(id=>id!==null&&!Object.hasOwn(BOSS_SEALS,id)))return null;
    const used=value.filter(Boolean);return new Set(used).size===used.length?[...value]:null;
  }
  function loadout(state){
    const gear=new Set(state.equipped||[]),has=id=>gear.has(id);
    return {atk:Math.max(0,state.atk+(has('iron')?6:0)-(has('lotus')?2:0)-(has('mirror')?2:0)),def:Math.max(0,state.def-(has('iron')?3:0)-(has('thorn')?2:0)),magicWard:(state.relics.includes(3)?8:0)+(has('lotus')?6:0),firstWard:has('thorn')?1:0,counterWard:has('mirror')?2:0,openingBonus:has('ember')?18:0,tax:has('ember')?8:0,tide:has('tide'),gearLines:[...gear].map(id=>TREASURES[id]?.name+'：'+TREASURES[id]?.description)};
  }
  function battle(state, enemy, options={}, withNext=true) {
    const stats=loadout(state),ward=state.relics.includes(3)?8:0;
    const goldReward=Math.floor((enemy.gold||0)*(stats.tide?0.75:1));
    const stages=enemy.phases?.length?enemy.phases:[enemy];
    const boss=!!enemy.phases?.length,plan=boss?(bossPlans.find(p=>p.id===(options.bossPlan||state.bossPlan))||bossPlans[0]):null,seals=boss?sealLayout(options.bossSeals):[null,null,null];
    const phases=stages.map((phase,i)=>{
      const atk=stats.atk-(plan?.id==='anchor'?6:0),def=Math.max(0,phase.def-(plan?.id==='anchor'&&i===1?20:0));
      const seal=seals?.[i]||null,sealBonus=seal==='staff'?8:0,bonus=plan?.id==='echoes'?(i===1?18:i===2?8:0):0,hit=atk-def+bonus+sealBonus;
      const rounds=hit>0?Math.max(1,Math.ceil(Math.max(0,phase.hp-stats.openingBonus)/hit)):Infinity;
      const first=phase.trait==='first'||phase.trait==='boss';
      const enemyHits=Math.max(0,rounds-1+(first?Math.max(0,1-stats.firstWard):0)-(plan?.id==='echoes'&&i===0?2:0)-(seal==='clone'?1:0));
      let foeHit=phase.trait==='magic'?Math.max(0,phase.atk-stats.magicWard):Math.max(0,phase.atk-stats.def);
      if(seal==='morph')foeHit=Math.max(0,foeHit-(phase.trait==='magic'?6:2));
      if(plan?.id==='anchor'&&i===2)foeHit=Math.floor(foeHit/2);
      const rawDamage=hit>0?enemyHits*foeHit:Infinity;
      return {...phase,def,playerAtk:atk,hit,rounds,enemyHits,foeHit,damage:rawDamage,rawDamage,bonus,possible:hit>0,seal,sealBonus,sealName:BOSS_SEALS[seal]?.name||'未用印',sealRule:BOSS_SEALS[seal]?.rule||'按原准备迎战'};
    });
    const possible=!!seals&&phases.every(p=>p.possible),rawNormal=possible?phases.reduce((n,p)=>n+p.rawDamage,0):Infinity;
    let rawTrait=0;
    if(boss||enemy.trait==='boss')rawTrait=Math.max(0,(enemy.special||0)-ward-(plan?.id==='anchor'?40:0));
    else if(enemy.trait==='venom')rawTrait=enemy.special||0;
    else if(enemy.trait==='counter')rawTrait=Math.max(0,(enemy.special||0)-stats.counterWard)*phases[0].rounds;
    rawTrait+=stats.tax;
    const discount=n=>stats.tide?Math.floor(n*.9):n;
    let cumulative=0,prior=0;
    for(const phase of phases){cumulative+=phase.rawDamage;const n=discount(cumulative);phase.damage=possible?n-prior:Infinity;prior=n;}
    const normalDamage=discount(rawNormal),damage=discount(rawNormal+rawTrait),traitDamage=possible?damage-normalDamage:Infinity;
    const first=phases[0];
    const lines=boss?phases.map(p=>`${p.name}：每棒 ${p.hit>0?p.hit:'未破防'}，首棒另加 ${stats.openingBonus}，${p.rounds} 棒 / 受击 ${p.enemyHits} 次，损失 ${p.damage}`):[`每棒 ${stats.atk} − ${enemy.def} = ${first.hit} 点伤害`,`${enemy.hp} 生命，首棒额外 ${stats.openingBonus}；共 ${first.rounds} 棒`,`${enemy.trait==='first'||enemy.trait==='boss'?'敌人先手；':'行者先手；'}敌人还击 ${first.enemyHits} 次`,`${enemy.trait==='magic'?'法术无视防御，法术护持 '+stats.magicWard:'每次还击 max(0, '+enemy.atk+' − '+stats.def+')'}：${first.foeHit} 点`];
    if(rawTrait)lines.push(`余毒 / 反震 / 心火 / 炉烬：额外 ${rawTrait} 点`);
    if(boss&&seals?.some(Boolean))phases.forEach(p=>lines.push(`${p.name} · ${p.sealName}：${p.sealRule}`));
    if(stats.tide)lines.push(`听潮贝：整场原损失 ${rawNormal+rawTrait} × 90%，向下取整`);
    lines.push(`总损失 ${damage}；胜利功德 ${goldReward}`);
    const result={possible,survive:possible&&state.hp>damage,damage,normalDamage,traitDamage,hit:first.hit,rounds:phases.reduce((n,p)=>n+p.rounds,0),enemyHits:phases.reduce((n,p)=>n+p.enemyHits,0),foeHit:first.foeHit,firstStrike:enemy.trait==='first'||enemy.trait==='boss',ward,lines,gearLines:stats.gearLines,effectiveAtk:stats.atk,effectiveDef:stats.def,openingBonus:stats.openingBonus,goldReward,canAfford:!plan||(state.orbs||0)>=plan.cost.orbs,reason:possible?'':'攻击未破防，须使有效攻击高于守卫防御。'};
    if(boss)Object.assign(result,{phases,plan,seals:seals||[],resourceCost:{orbs:plan.cost.orbs}});
    if(!seals)result.reason='每相一印，每种心印一战只能使用一次。';
    if(withNext&&possible&&damage>0){
      const candidates=phases.filter(p=>p.rounds>1).map(p=>state.atk+Math.max(1,Math.ceil(Math.max(0,p.hp-stats.openingBonus)/(p.rounds-1))-p.hit));
      for(const atk of [...new Set(candidates)].sort((a,b)=>a-b)){const q=battle({...state,atk},enemy,options,false);if(q.damage<damage){result.nextAttack={atk,delta:atk-state.atk,saved:damage-q.damage};break;}}
    }
    return result;
  }

  class TowerEngine {
    constructor(data,{persist=true}={}) {
      this.data = data;this.data.treasures=Object.fromEntries(Object.entries(TREASURES).map(([id,rule])=>[id,{...data.treasures?.[id],...rule}]));
      this.listeners = [];
      this.history = [];
      this.redoHistory = [];
      this.lastCheckpointKind = null;
      this.mode = 'walk';
      this.selection = null;
      this.motion = null;
      this.path = [];
      this.busyUntil = 0;
      this.persist=persist;this.state = this.initialState();
      if(root.TowerChronicle&&persist)this.chronicle=new root.TowerChronicle(this);
    }
    initialState() {
      const floor=this.data.floors[0],altar=floor.entities.find(e=>e.type==='altar'),authored=floor.spawn;
      // New journeys begin on the authored empty apron, not inside the lantern.
      // Revision-6 starts and loaded saves retain their original action history.
      const spawn=(this.data.levelDepth?.revision||4)>=7&&authored&&floor.map[authored.y]?.[authored.x]==='.'&&!floor.entities.some(e=>e.x===authored.x&&e.y===authored.y)?authored:altar||{x:6,y:11};
      return { version:4, levelRevision:this.data.levelDepth?.revision||4, floor:0,x:spawn.x,y:spawn.y,facing:'up',hp:620,atk:24,def:10,mana:6,maxMana:6,coins:0,keys:{yellow:1,blue:0,red:0},relics:[],externalRelics:0,fragments:[],treasures:[],equipped:[],selfAwakened:false,revealed:{},quests:{},tides:{},rescued:[],removed:{},switches:{},terrain:{},choices:{},visited:[0],seenIntros:{},journal:[],log:[],elixirs:1,orbs:1,turn:0,defeated:false,won:false,ending:null,bossPlan:'direct',settings:{quickZero:false,showDamage:true,motion:'standard',screenShake:false,music:false,sfx:false},purchases:{atk:0,def:0,heal:0},startedAt:Date.now(),kills:0 };
    }
    on(fn) { this.listeners.push(fn); return () => this.listeners = this.listeners.filter(f=>f!==fn); }
    emit(type, detail) { this.listeners.forEach(fn => fn(type, detail)); }
    newGame() {
      if(this.persist&&root.TowerEncounters){this.data=root.TowerEncounters.latest;this.emit('data',this.data);}
      this.state = this.initialState(); this.history=[];this.redoHistory=[];this.lastCheckpointKind=null; this.mode='walk'; this.selection=null;
      this.addLog('残钟响起。你踏入了自己的因果。','story');
      this.story('黑莲劫 · 入塔', '无天劫中，黑莲化出十八层无相塔，将十六枚外舍利与被困众生一同镇在五重心印之下。乔灵儿留在塔外，等候你重开归路。\n\n点灯僧提着一盏熟悉的灯：“先辨真伪，再去救人。三枚归位，第三层的石心才肯开口。最后那个空位，不在任何宝匣里。”\n\n悟空握紧金箍棒：“先带人回家，再和这座塔算账。”',{portrait:'wukong',speaker:'孙悟空',kind:'intro',source:'tower:arrival',chapter:0});
      this.state.seenIntros[0]=true;
      this.chronicle?.start();this.save(true); this.emit('reset');this.emit('floorEntry',{floor:0,title:this.data.floors[0].name,text:this.data.floors[0].intro});
    }
    snapshot() { return clone(this.state); }
    checkpoint(kind='decision') { root.TowerOutcomes?.begin(this);this.redoHistory=[];if(kind==='move'&&this.lastCheckpointKind==='move'&&this.history.length)return;const point=this.snapshot();this.chronicle?.remember(point);this.history.push(point);this.lastCheckpointKind=kind;if(this.history.length>30)this.history.shift(); }
    changed() { this.state.turn++;root.TowerOutcomes?.settle(this);this.chronicle?.changed(); this.save(true); this.emit('change');if(this.pendingChapterOutcome){this.emit('chapterSummary',this.pendingChapterOutcome);this.pendingChapterOutcome=null;} }
    addLog(text,kind='info') { this.state.log.unshift({text,kind,turn:this.state.turn}); this.state.log=this.state.log.slice(0,50); this.emit('log',{text,kind}); }
    notify(text) { this.emit('notice',text); }
    story(title,text,meta={}) {
      const kind=meta.kind||(meta.awakening||/心印觉醒/.test(title)?'relic':/法器入囊/.test(title)?'treasure':'lore');
      const entry={title,text,floor:this.state.floor,kind,source:meta.source||`floor:${this.state.floor}`,objective:meta.objective||this.narrativeStatus().goal,...meta};
      this.state.journal.push(entry);this.emit('story',entry);
    }
    narrativeStatus(){
      const s=this.state,chapter=Math.min(5,Math.floor(s.floor/3)),spec=this.data.chapters?.[chapter],seal=[0,1,2,3,4].find(id=>!s.relics.includes(id));
      const rootChest=this.data.floors[0].entities.find(e=>e.type==='chest'&&(e.requires||0)>=5),boss=this.data.floors[17]?.entities.find(e=>e.enemy==='heart');
      let stage='arrival',goal='寻回本层舍利，重启第三层石生心印',found=(s.fragments||[]).length,required=16;
      if(s.won){stage='complete';goal=s.ending==='keep'?'众生已归，留灯守塔':'黑莲劫已破，与众生归去';}
      else if(s.selfAwakened){stage='awakened';goal='走向莲台，选择最后的归途';}
      else if(boss&&s.removed[boss.id]){stage='heart';goal='前往十八层莲阵，照见无骨舍利';}
      else if(seal===undefined){stage=rootChest&&s.removed[rootChest.id]?'rootKey':'five';goal=stage==='five'?(s.floor===0?'开启东南归根之匣，取得心钥':'回到第一层，取得归根心钥'):'前往十八层，合两翼机关、面对三相';}
      else{
        stage=seal===0?'arrival':seal===1?'staff':seal===2?(s.quests.bajie?'rescued':'cicada'):seal===3?'companions':'mercy';
        const group=this.data.fragmentGroups?.[seal]||[],missing=group.filter(id=>!(s.fragments||[]).includes(id));found=group.length-missing.length;required=group.length;
        if(!missing.length){const floor=seal*3+2;goal=(s.floor===floor?'本层':'第 '+(floor+1)+' 层')+'心印待醒：'+this.data.relics[seal].name.replace('舍利','');}
        else{const here=this.data.floors[s.floor].entities.filter(e=>e.type==='fragment'&&!s.removed[e.id]&&group.includes(e.fragment));goal=here.length?'寻回本层外舍利 · 本印 '+found+'/'+required:'沿塔路寻舍利 · 本印 '+found+'/'+required;}
      }
      return {chapter,heading:`第${chapter+1}回 · ${spec?.title||this.data.floors[s.floor].name}`,goal,stage,found,required};
    }
    dialogueFor(entity){
      const original=this.data.dialogues[entity?.dialogue],base=typeof original==='string'?{text:original}:original||{},status=this.narrativeStatus();
      const stage=entity?.dialogue==='lantern'?this.data.narrative?.lanternStages?.[status.stage]:null,lines=stage?.lines||base.lines;
      return {...base,...(stage||{}),lines,text:stage?.lines?.join('\n\n')||base.text||lines?.join('\n\n')||'',portrait:entity?.archetype||base.portrait||base.archetype||'lantern',speaker:entity?.name||base.speaker||'塔中回响',objective:status.goal};
    }
    nextObjective(forEntity=null){
      const s=this.state,all=this.data.floors.flatMap(f=>f.entities.map(e=>({...e,floor:f.id}))),find=predicate=>all.find(e=>!s.removed[e.id]&&predicate(e));
      const target=e=>e?{...e,label:e.label||e.name||(e.type==='fragment'?'第 '+(e.fragment+1)+' 枚外舍利':e.type==='relic'?this.data.relics[e.relic].name:e.type==='enemy'?this.data.enemies[e.enemy].name:'塔中目标')}:null;
      const missing=e=>{
        const fragment=(e.requiresFragments||[]).find(id=>!s.fragments.includes(id));if(fragment!==undefined)return find(a=>a.type==='fragment'&&a.fragment===fragment);
        const control=(e.requiresControls||e.controls||[]).find(id=>{const a=all.find(a=>a.controlId===id||a.id===id);return a&&!s.switches[a.id];});if(control)return all.find(a=>a.controlId===control||a.id===control);
        if((e.requireQuest==='bajie'||e.requiresQuests?.includes('bajie'))&&!s.quests.bajie)return find(a=>a.type==='rescue'&&a.quest==='bajie');
        if(e.requiresQuests?.includes('whiteGoodness')&&!s.quests.whiteGoodness)return find(a=>a.aid==='whiteGoodness');
        return null;
      };
      if(forEntity){const needed=missing(forEntity);if(needed)return target(needed);}
      const seal=[0,1,2,3,4].find(id=>!s.relics.includes(id));
      if(seal!==undefined){
        const missingId=this.data.fragmentGroups[seal].find(id=>!s.fragments.includes(id));
        if(missingId!==undefined)return target(find(a=>a.type==='fragment'&&a.fragment===missingId));
        const relic=find(a=>a.type==='relic'&&a.relic===seal);return target(relic&&(missing(relic)||relic));
      }
      const root=find(a=>a.type==='chest'&&a.item==='redKey');if(root)return target(root);
      const boss=find(a=>a.enemy==='heart');if(boss){const f=this.data.floors[17],lever=f.entities.find(a=>a.type==='switch'&&!s.switches[a.id]);return target(lever?{...lever,floor:17}:boss);}
      return target(find(a=>a.type==='finale'));
    }
    receiveAid(e){
      if(!this.isCurrent(e)||this.distance(e)>1||e.aid!=='whiteGoodness'||this.state.quests.whiteGoodness||this.state.won||this.state.defeated)return false;
      this.checkpoint();this.state.quests.whiteGoodness=true;
      this.story('善念开路 · 白衣无天','白衣无天将黑莲上的一缕光还给经壁。\n\n第十三层舍利支院的南径已经开启，可以绕过正门守卫。五印齐聚后，第十五层白衣归根云廊将直通第一层，取回心钥后仍可乘云回访。\n\n“我只能替你开路，最后那一步，还要你自己走。”',{kind:'rescue',speaker:'白衣无天',portrait:'whiteWutian',source:e.id});
      const gate=this.data.floors[this.state.floor].entities.find(a=>a.id==='f12-white-passage');
      this.emit('effect',{type:'magic',x:e.x,y:e.y,text:'善念南径已开',meta:{ability:'switch',targets:gate?[{x:gate.x,y:gate.y}]:[]}});this.changed();return true;
    }
    getTile(x,y,floor=this.state.floor) {
      const f=this.data.floors[floor];
      if (!f || x<0 || y<0 || y>=f.map.length || x>=f.map[y].length) return '#';
      const water=f.waterTiles?.find(t=>t.x===x&&t.y===y);
      if(water)return (this.state.tides[f.tideGroup||'weakwater']||'low')===water.openWhen?'.':'w';
      return this.state.terrain[`${floor}:${x}:${y}`] || f.map[y][x];
    }
    getEntity(x,y,floor=this.state.floor) {
      return this.data.floors[floor].entities.find(e=>e.x===x && e.y===y && !this.state.removed[e.id]) || null;
    }
    dimensions(floor=this.state.floor){const f=this.data.floors[floor];return {width:f.map[0].length,height:f.map.length};}
    effectiveStats(){return loadout(this.state);}
    abilityCost(mode){return this.state.equipped.includes('mirror')?(mode==='clone'?1:2):(mode==='clone'?2:1);}
    abilityPreview(mode,x,y){
      const s=this.state,cost=this.abilityCost(mode),tile=this.getTile(x,y),entity=this.getEntity(x,y),distance=Math.abs(s.x-x)+Math.abs(s.y-y),required={staff:0,morph:1,clone:2}[mode];
      let reason='';
      if(required===undefined||!s.relics.includes(required))reason='这项神通尚未觉醒';
      else if(mode==='clone'){
        if(entity?.type!=='switch'||entity.kind!=='plate')reason='只能落在青色分身阵眼';
        else if(s.switches[entity.id])reason='已有分身驻守，可免费召回';
        else if(distance>4)reason='超出四格施法范围';
        else if(this.cloneStatus().free<=0)reason='驻守位已满，先免费召回一影';
      }else if(tile!==(mode==='staff'?'~':'=')&&!(mode==='morph'&&entity?.morphable))reason=mode==='staff'?'目标须为断口':'目标须为铁栅';
      else if(distance!==1)reason='走近目标一格后施法';
      if(!reason&&s.mana<cost)reason='灵息不足，先到莲灯补满';
      return {possible:!reason,reason,cost,distance,mode,x,y};
    }
    takeFragment(e){
      if(this.state.fragments.includes(e.fragment))return;
      this.state.fragments.push(e.fragment);this.state.fragments.sort((a,b)=>a-b);this.state.externalRelics=this.state.fragments.length;this.state.removed[e.id]=true;
      this.addLog(`寻回外舍利 · 第 ${e.fragment+1} 枚，${this.state.externalRelics}/16。`,'relic');this.emit('effect',{type:'relic',x:e.x,y:e.y,text:`外舍利 ${this.state.externalRelics}/16`,meta:{fragment:e.fragment,externalRelics:this.state.externalRelics}});
    }
    takeTreasure(e){
      if(this.state.treasures.includes(e.treasure))return;
      const t=this.data.treasures[e.treasure];if(!t)return;this.state.treasures.push(e.treasure);this.state.removed[e.id]=true;this.addLog(`取得法器 · ${t.name}。到莲灯装配，最多同时两件。`,'item');this.emit('effect',{type:'pickup',x:e.x,y:e.y,text:t.name,meta:{treasure:e.treasure}});this.story(t.name+' · 法器入囊',t.description+'\n\n法器收入行囊。站在莲灯上打开行囊或修心，可免费装卸。最多同时装配两件；战损会按当前组合重新计算。',{portrait:'wukong'});
    }
    equipTreasure(id){
      if(this.state.won||this.state.defeated||!this.state.treasures.includes(id))return false;
      if(this.getEntity(this.state.x,this.state.y)?.type!=='altar'){this.notify('站在莲灯上才能改变法器组合。');return false;}
      const found=this.state.equipped.includes(id);if(!found&&this.state.equipped.length>=2){this.notify('只可同时装配两件，先卸下一件。');return false;}
      this.checkpoint();if(found)this.state.equipped=this.state.equipped.filter(x=>x!==id);else this.state.equipped.push(id);this.addLog(`${found?'卸下':'装配'}${this.data.treasures[id].name}；战损与神通代价已更新。`,'magic');this.changed();return true;
    }
    equipLoadout(ids){if(!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!this.state.treasures.includes(id))||this.getEntity(this.state.x,this.state.y)?.type!=='altar'||this.state.won||this.state.defeated)return false;if(JSON.stringify([...ids].sort())===JSON.stringify([...this.state.equipped].sort()))return false;this.checkpoint();this.state.equipped=[...ids];this.addLog('整套行装已确认，战损与神通费用已更新。','magic');this.changed();return true;}
    isGateOpen(entity,floor=this.state.floor,flags=this.state.switches) {
      if(!this.requirements(entity,flags).met)return false;
      if (entity.type === 'seal') return true;
      if(entity.releaseOnChoice&&this.state.choices[entity.releaseOnChoice])return true;
      if(!entity.controls&&!entity.group&&(entity.requiresControls||entity.requiresQuests||entity.requireQuest))return true;
      if(entity.controls){const switches=this.data.floors[floor].entities.filter(e=>entity.controls.includes(e.controlId||e.id));return switches.length===entity.controls.length&&switches.every(e=>!!flags[e.id]);}
      const switches=this.data.floors[floor].entities.filter(e=>e.type==='switch' && e.group===entity.group);
      return switches.length>0 && switches.every(e=>!!flags[e.id]);
    }
    requirements(entity,flags=this.state.switches){
      const missing=[];
      if((entity.requires||0)>this.state.relics.length)missing.push(`需要 ${entity.requires} 重心印`);
      for(const id of entity.requiresFragments||[])if(!this.state.fragments.includes(id))missing.push(`尚缺第 ${id+1} 枚外舍利`);
      for(const id of entity.requiresControls||[]){const e=this.data.floors.flatMap(f=>f.entities).find(e=>e.controlId===id||e.id===id);if(!e||!flags[e.id])missing.push(e?.label||id);}
      for(const id of [...(entity.requiresQuests||[]),...(entity.requireQuest?[entity.requireQuest]:[])])if(!this.state.quests[id])missing.push(({bajie:'先解救八戒',bellPassage:'先在残钟台舍玉开门',ferryPassage:'先在渡灯台供灯开栈',emberPassage:'先在无生髓台燃髓开径'})[id]||id);
      return {met:missing.length===0,missing};
    }
    isBlocked(e,flags=this.state.switches){
      if(!e)return false;
      return ['enemy','door','finale'].includes(e.type)||e.type==='illusion'&&!this.state.revealed[e.id]||['gate','seal'].includes(e.type)&&!this.isGateOpen(e,this.state.floor,flags)||['chest','relic'].includes(e.type)&&!this.requirements(e,flags).met||e.type==='choice'&&e.blocking!==false&&this.state.choices[e.choice]!==e.option||e.type==='cache'&&!this.state.choices[e.choice];
    }
    chapterProgress(){
      const controls=(ids)=>ids.map(id=>{const e=this.data.floors.flatMap(f=>f.entities).find(e=>e.controlId===id);return {id,label:e?.label||id,done:!!(e&&this.state.switches[e.id])};});
      return [
        {title:'火眼辨真',done:this.state.relics.includes(0),steps:this.data.floors.slice(0,3).flatMap(f=>f.entities).filter(e=>e.type==='illusion').map(e=>({label:e.label,done:!!this.state.revealed[e.id]}))},
        {title:'双塔合印',done:this.state.relics.includes(1),steps:controls(['east-tower','west-tower'])},
        {title:'弱水救援',done:this.state.relics.includes(2),steps:[{label:'解救八戒',done:!!this.state.quests.bajie},{label:'水轮通路',done:!!this.state.quests.weakwater}]},
        {title:'黑莲炼炉',done:this.state.relics.includes(3),steps:controls(['furnace-shadow','furnace-latch','silk-a','silk-b','furnace-mercy','furnace-stop'])},
        {title:'七伤与善念',done:this.state.relics.includes(4),steps:[{label:'七伤抉择',done:!!this.state.choices.sevenWounds}]},
        {title:'无骨归真',done:this.state.selfAwakened,steps:[{label:'十六外舍利',done:this.state.externalRelics===16},{label:'中央空位',done:this.state.selfAwakened}]}
      ];
    }
    reveal(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='illusion'||this.state.revealed[e.id])return false;
      this.checkpoint();this.state.revealed[e.id]=true;this.addLog(e.revealText||'火眼辨真：幻壁消散，旧路显现。','magic');this.emit('effect',{type:'magic',x:e.x,y:e.y,text:'火眼辨真',meta:{ability:'eye',fromX:this.state.x,fromY:this.state.y}});this.changed();return true;
    }
    activateResonator(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='resonator'||this.distance(e)>1||this.state.switches[e.id])return false;
      const r=this.requirements(e);if(!r.met){this.notify(r.missing.join(' · '));return false;}
      this.checkpoint();this.state.switches[e.id]=true;this.addLog(`${e.label||'塔印'}已校正，两塔隔层共鸣。`,'magic');this.emit('effect',{type:'magic',x:e.x,y:e.y,text:'塔印归位',meta:{ability:'resonance'}});this.changed();return true;
    }
    rescue(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='rescue'||this.distance(e)>1||this.state.quests[e.quest])return false;
      const r=this.requirements(e);if(!r.met){this.notify(r.missing.join(' · '));return false;}
      this.checkpoint();this.state.quests[e.quest]=true;if(!this.state.rescued.includes(e.quest))this.state.rescued.push(e.quest);
      this.addLog(`${e.name||e.label||'被困者'}已获救，援手将稳定弱水渡路。`,'story');this.emit('effect',{type:'magic',x:e.x,y:e.y,text:'同道归来',meta:{ability:'rescue'}});this.story(e.name||'弱水救援',e.rescueText||'“猴哥，水脉交给老猪！去转动水轮，两条渡路会随水位开合。莲灯与归路不会沉没。”',{portrait:e.archetype||'bajie',speaker:e.name||'八戒',kind:'rescue',source:e.id});this.changed();return true;
    }
    toggleTide(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='tide'||this.distance(e)>1)return false;
      const r=this.requirements(e);if(!r.met){this.notify(r.missing.join(' · '));return false;}
      const group=e.group||'weakwater',saved=this.state.tides[group],old=saved||'low',next=old==='low'?'high':'low';
      this.state.tides[group]=next;const safe=this.getTile(this.state.x,this.state.y)==='.'&&this.hasSafeRetreat(this.state.switches);if(saved===undefined)delete this.state.tides[group];else this.state.tides[group]=saved;
      if(!safe){this.notify('先回到水轮安全中庭，再改变水位。');return false;}
      this.checkpoint();this.state.tides[group]=next;this.state.quests.weakwater=true;this.addLog(`弱水${next==='low'?'退落，低水井路':'升起，高水浮道'}开放；另一条水路暂时关闭。`,'magic');this.emit('effect',{type:'magic',x:e.x,y:e.y,text:next==='low'?'弱水退潮':'浮道升起',meta:{ability:'tide'}});this.changed();return true;
    }
    usePortal(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='portal'||this.distance(e)>1)return false;
      const r=this.requirements(e);if(!r.met){this.notify(r.missing.join(' · '));return false;}
      this.checkpoint();this.changeFloor(e);this.changed();return true;
    }
    preview(enemyId,options={}) { return battle(this.state,typeof enemyId === 'string' ? this.data.enemies[enemyId] : enemyId,options); }
    bossOptions(){return (this.data.bossPlans||bossPlans).map(p=>({...p,preview:this.preview(Object.values(this.data.enemies).find(e=>e.trait==='boss'),{bossPlan:p.id})}));}
    setBossPlan(id){if(!bossPlans.some(p=>p.id===id)||this.state.won||this.state.defeated)return false;if(this.state.bossPlan===id)return true;this.checkpoint();this.state.bossPlan=id;this.changed();return true;}
    select(x,y) { this.selection={x,y}; this.emit('selection',this.selection); }
    setMode(mode) {
      const need={staff:0,morph:1,clone:2};
      if (need[mode]!==undefined && !this.state.relics.includes(need[mode])) { this.notify('尚未觉醒。先找回对应的舍利。'); return false; }
      this.mode=mode; this.path=[]; this.emit('mode',mode); return true;
    }
    step(dir) {
      if(this.state.defeated||this.state.won) return false;
      const d=directions[dir]; if(!d) return false;
      this.state.facing=dir;
      return this.moveTo(this.state.x+d[0],this.state.y+d[1]);
    }
    moveTo(x,y) {
      if(this.state.defeated||this.state.won) return false;
      const s=this.state;
      if(Math.abs(x-s.x)+Math.abs(y-s.y)!==1) return false;
      this.select(x,y);
      const tile=this.getTile(x,y), e=this.getEntity(x,y);
      if(tile==='#'||tile==='v') { this.notify('石壁无路。试试另一条因果。'); return false; }
      if(tile==='~'||tile==='='||tile==='w') { this.notify(tile==='w'?'弱水不能用金箍棒架桥。解救八戒后，转动安全中庭的水轮改变渡路。':tile==='~'?'断口无桥。选择「金箍架桥」后点此格。':'铁栅封路。选择「青蝉化形」后点此格。'); return false; }
      if(e) {
        if(e.type==='illusion'&&!s.revealed[e.id]){this.notify('此壁有异。用火眼查看并辨真，无需灵息。');this.select(x,y);return false;}
        if(e.type==='enemy') { this.emit('combat',e); return false; }
        if(e.type==='door') { this.emit('door',e); return false; }
        if((e.type==='gate'||e.type==='seal')&&!this.isGateOpen(e)) { this.notify(e.type==='seal'?`此处须集齐 ${e.requires} 重心印。`:'机关尚未接通。查看同色的机关与阵眼。'); return false; }
        if(['chest','relic'].includes(e.type)&&!this.requirements(e).met) { this.notify('镇封尚在：'+this.requirements(e).missing.join(' · ')); return false; }
        if(e.type==='finale') { if(s.relics.length<5) {this.notify('五重心印缺一不可。');return false;} this.emit('finale',e); return false; }
        if(e.type==='choice'&&e.blocking!==false&&s.choices[e.choice]!==e.option){if(s.choices[e.choice]){this.notify('此处的因果已经选择，另一份奖励已封存。');return false;}this.emit('choice',e);return false;}
        if(e.type==='cache'&&!s.choices[e.choice]){this.notify('先在岔路契台选定一条路线。');return false;}
      }
      this.checkpoint(e&&['item','chest','cache','relic','fragment','treasure'].includes(e.type)?'pickup':'move');
      const fromX=s.x,fromY=s.y;s.walked||={};s.walked[`${s.floor}:${fromX}:${fromY}`]=true;s.walked[`${s.floor}:${x}:${y}`]=true; s.x=x;s.y=y;
      this.motion={fromX,fromY,toX:x,toY:y,start:typeof performance!=='undefined'?performance.now():0,duration:100};
      if(e) this.enter(e);
      this.changed(); this.emit('effect',{type:'move',x,y});
      return true;
    }
    enter(e) {
      const s=this.state;
      switch(e.type) {
        case 'item': case 'chest': this.takeItem(e); break;
        case 'relic': this.takeRelic(e); break;
        case 'fragment':this.takeFragment(e);break;
        case 'treasure':this.takeTreasure(e);break;
        case 'stairs': this.notify(this.runSession?.isTrial?'上行处可按 F 确认本题，主线进度独立保留。':'塔阶已到。按 F 或点「前往」切换塔层。'); break;
        case 'cache': this.takeCache(e); break;
        case 'npc': case 'monument': {
          const d=this.dialogueFor(e);
          if(!s.seenIntros['event:'+e.id]){s.seenIntros['event:'+e.id]=true;this.story(d?.title||e.name||'无相塔记',d?.text||'残碑无言，只有风声。',{portrait:e.archetype||d?.portrait||'lantern',speaker:d.speaker,kind:'lore',source:e.id});}
          break;
        }
        case 'altar': if(s.mana<s.maxMana){s.mana=s.maxMana;this.addLog('莲灯照心，灵息尽复。按 F 可供奉修行。','magic');}break;
      }
    }
    interact(e){
      if(this.state.won||this.state.defeated||!e||!this.isCurrent(e)||this.distance(e)>1)return false;
      if(e.type==='stairs')return this.traverse(e);
      if(e.type==='illusion')return this.reveal(e);
      if(e.type==='resonator')return this.activateResonator(e);
      if(e.type==='rescue')return this.rescue(e);
      if(e.type==='tide')return this.toggleTide(e);
      if(e.type==='portal')return this.usePortal(e);
      if(e.type==='switch')return e.kind==='plate'?this.useAbility('clone',e.x,e.y):this.toggleSwitch(e);
      if(e.type==='door'){this.emit('door',e);return true;}
      if(e.type==='choice'){this.emit('choice',e);return true;}
      if(['item','chest','cache','relic','fragment','treasure'].includes(e.type))return this.distance(e)===1?this.moveTo(e.x,e.y):false;
      if(e.type==='enemy'){this.emit('combat',e);return true;}
      if(e.type==='altar'){if(this.distance(e)!==0){this.notify('站到莲灯上后，可供奉修行。');return false;}this.emit('altar',e);return true;}
      if(e.type==='npc'||e.type==='monument'){const d=this.dialogueFor(e);this.emit('story',{title:d.title||e.name||'塔中残卷',text:d.text,portrait:d.portrait,speaker:d.speaker,objective:d.objective,kind:'npc',source:e.id});return true;}
      if(e.type==='finale'){this.emit('finale',e);return true;}
      return false;
    }
    toggleSwitch(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='switch'||e.kind==='plate'||this.distance(e)>1)return false;
      if(this.state.switches[e.id]&&!this.hasSafeRetreat({...this.state.switches,[e.id]:false})){this.notify('先回到安全走廊再复位，避免关闭自己的退路。');return false;}
      this.checkpoint();this.state.switches[e.id]=!this.state.switches[e.id];this.addLog(`${e.label||'机关'}已${this.state.switches[e.id]?'接通':'复位'}。`,'magic');this.emit('effect',{type:'magic',x:e.x,y:e.y,meta:{ability:'switch',active:this.state.switches[e.id],targets:this.data.floors[this.state.floor].entities.filter(a=>a.type==='gate'&&(a.controls?a.controls.includes(e.controlId||e.id):a.group===e.group)).map(a=>({x:a.x,y:a.y}))}});this.changed();return true;
    }
    cloneStatus(){const floor=this.data.floors[this.state.floor];const active=floor.entities.filter(e=>e.type==='switch'&&e.kind==='plate'&&this.state.switches[e.id]);const limit=floor.cloneLimit||Infinity;return {limit,active,free:limit-active.length};}
    recallClone(entityId){
      const e=this.data.floors[this.state.floor].entities.find(e=>e.id===entityId&&e.type==='switch'&&e.kind==='plate');
      if(this.state.won||this.state.defeated||!e||!this.state.switches[e.id])return false;
      if(!this.hasSafeRetreat({...this.state.switches,[entityId]:false})){this.notify('先走出藏室或领取经卷，再召回分身，保留一条安全退路。');return false;}
      this.checkpoint();this.state.switches[e.id]=false;this.addLog(`召回${e.label||'分身'}，驻守位已释放。`,'magic');this.emit('effect',{type:'magic',x:e.x,y:e.y,text:'分身归来',meta:{ability:'recall',fromX:this.state.x,fromY:this.state.y}});this.changed();return true;
    }
    hasSafeRetreat(flags){
      const s=this.state,q=[[s.x,s.y]],seen=new Set([s.x+','+s.y]);
      while(q.length){const [x,y]=q.shift(),here=this.getEntity(x,y);
        if(here?.type==='altar'||here?.type==='stairs'&&this.stairRequirement(here)<=s.relics.length&&this.requirements(here,flags).met)return true;
        for(const [dx,dy]of Object.values(directions)){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||this.getTile(nx,ny)!=='.')continue;seen.add(k);const e=this.getEntity(nx,ny);
          if(this.isBlocked(e,flags))continue;
          q.push([nx,ny]);
        }
      }return false;
    }
    choicePreview(e,optionId){
      const def=this.data.choices?.[e.choice],option=def?.options.find(o=>o.id===optionId);
      if(!option)return {possible:false,reason:'未找到此项选择。'};
      const chosen=this.state.choices[e.choice],cost=option.cost||{},rewardAlreadyClaimed=e.choice==='locks'&&!!this.state.quests.locksLegacy,reward=rewardAlreadyClaimed?{}:option.reward||{};
      let reason='';
      if(e.option&&e.option!==optionId)reason='请到对应的契台选择此路。';
      else if(!this.requirements(e).met)reason=this.requirements(e).missing.join(' · ');
      else if(chosen)reason='这份因果已经作出选择。';
      else if(cost.key&&(this.state.keys[cost.key.color]||0)<(cost.key.amount||1))reason='缺少对应钥匙。';
      else if(cost.coins>this.state.coins)reason='功德不足。';
      else if(cost.hp>=this.state.hp)reason='生命不足以承担代价。';
      else if(cost.orbs>this.state.orbs)reason='凝息珠不足。';
      return {possible:!reason,reason,option,cost,reward,chosen,definition:def,rewardAlreadyClaimed};
    }
    applyReward(reward){
      for(const stat of ['hp','atk','def','coins','elixirs','orbs'])if(reward[stat])this.state[stat]+=reward[stat];
      if(reward.key)this.state.keys[reward.key.color]+=reward.key.amount||1;
      if(reward.keys)for(const color of ['yellow','blue','red'])this.state.keys[color]+=reward.keys[color]||0;
      if(reward.rescue)for(const id of reward.rescue)if(!this.state.rescued.includes(id))this.state.rescued.push(id);
      if(reward.quests)Object.assign(this.state.quests,reward.quests);
    }
    choose(e,optionId){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='choice'||this.distance(e)>1)return false;
      const p=this.choicePreview(e,optionId);if(!p.possible){this.notify(p.reason);return false;}
      this.chronicle?.decision(e);this.checkpoint();const c=p.cost;if(c.key)this.state.keys[c.key.color]-=c.key.amount||1;
      for(const stat of ['hp','coins','orbs'])if(c[stat])this.state[stat]-=c[stat];
      this.state.choices[e.choice]=optionId;
      if(p.definition.grant!=='cache'){this.applyReward(p.reward);this.state.removed[e.id]=true;}
      this.addLog(`因果已定 · ${p.option.label}。${p.rewardAlreadyClaimed?'旧档成长份额已领取，本次只开通所选道路。':p.definition.grant==='cache'?'走到北侧共鸣匣领取所选奖励。':'奖励已收入行囊。'}`,'relic');
      this.emit('effect',{type:'magic',x:e.x,y:e.y,text:'一念成路'});this.changed();return true;
    }
    takeCache(e){
      const option=this.data.choices?.[e.choice]?.options.find(o=>o.id===this.state.choices[e.choice]);if(!option)return;
      this.applyReward(option.reward||{});this.state.removed[e.id]=true;this.addLog(`共鸣匣开启 · ${option.label}的馈赠已取得。`,'item');this.emit('effect',{type:'pickup',x:e.x,y:e.y,text:option.label});
    }
    updateSettings(patch){for(const key of ['quickZero','showDamage','screenShake','music','sfx','fastTravel'])if(typeof patch[key]==='boolean')this.state.settings[key]=patch[key];if(['standard','simple','reduced'].includes(patch.motion))this.state.settings.motion=patch.motion;this.save(true);this.emit('change');}
    takeItem(e) {
      const item=this.data.items[e.item]; if(!item) return;
      const s=this.state,v=item.value||1;
      if(item.kind==='hp') s.hp+=v;
      else if(item.kind==='atk') s.atk+=v;
      else if(item.kind==='def') s.def+=v;
      else if(item.kind==='key') s.keys[item.color]+=v;
      else if(item.kind==='coin') s.coins+=v;
      else if(item.kind==='mana') s.mana=Math.min(s.maxMana,s.mana+v);
      else if(item.kind==='elixir') s.elixirs+=v;
      else if(item.kind==='orb') s.orbs+=v;
      s.removed[e.id]=true;
      this.addLog(`获得${item.name} · ${item.description||item.desc||this.itemEffect(item)}`,'item');
      this.emit('effect',{type:'pickup',x:e.x,y:e.y,text:item.name,meta:{item:e.item,kind:item.kind}});
    }
    itemEffect(item) {
      return ({hp:'生命 +',atk:'攻击 +',def:'防御 +',key:'钥匙 +',coin:'金钱 +',mana:'灵息 +',elixir:'蟠桃 +',orb:'灵珠 +'})[item.kind]+(item.value||1);
    }
    takeRelic(e) {
      const s=this.state, r=this.data.relics[e.relic];
      if(s.relics.includes(e.relic))return;
      if(!this.requirements(e).met)return;
      s.relics.push(e.relic); s.relics.sort();if(!this.data.fragmentGroups)s.externalRelics=s.relics.reduce((sum,id)=>sum+(this.data.relicGroups||[3,3,3,3,4])[id],0);s.removed[e.id]=true;s.hp+=100;s.mana=s.maxMana;
      this.addLog(`心印觉醒 · ${r.name}。外舍利 ${s.externalRelics}/16；生命 +100，灵息尽复。`,'relic');
      this.emit('effect',{type:'relic',x:e.x,y:e.y,text:r.name,meta:{relic:e.relic,index:e.relic,externalRelics:s.externalRelics}});
      const abilityName={staff:'金箍架桥',morph:'青蝉化形',clone:'毫毛分身',ward:'定心护身',truth:'归真共鸣'}[r.ability]||r.ability;
      this.story(r.name+' · 心印觉醒',`${r.story}\n\n${abilityName}：${r.description}\n\n本组外舍利归位：${s.externalRelics}/16。生命 +100，灵息回复至 6。因果簿已标记旧层的新道路。`,{portrait:'wukong',speaker:'孙悟空',kind:'relic',source:e.id,awakening:true});
    }
    changeFloor(e) {
      const s=this.state; s.floor=e.to;s.x=e.tx;s.y=e.ty;this.selection=null;this.motion=null;this.path=[];
      if(!s.visited.includes(e.to))s.visited.push(e.to);
      const f=this.data.floors[e.to];this.addLog(`抵达 ${f.name}`,'story');
      if(!s.seenIntros[e.to]){s.seenIntros[e.to]=true;this.story(f.name,f.intro,{kind:'chapter',source:'floor:'+e.to,speaker:'塔中回响',portrait:'wukong',chapter:Math.floor(e.to/3)});}
      this.emit('floorEntry',{floor:s.floor,title:f.name,text:f.intro,objective:this.narrativeStatus().goal});
      this.emit('effect',{type:'floor',x:s.x,y:s.y});
    }
    stairRequirement(e){return e.requires ?? (e.to>this.state.floor&&e.to%3===0?Math.floor(e.to/3):0);}
    traverse(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='stairs'||this.distance(e)>1)return false;
      const r=this.requirements(e);if(!r.met){this.notify(r.missing.join(' · '));return false;}
      if(this.stairRequirement(e)>this.state.relics.length){this.notify(`本篇舍利尚未归位。须集齐 ${this.stairRequirement(e)} 重心印才能继续上行。`);return false;}
      this.checkpoint();this.changeFloor(e);this.changed();return true;
    }
    openDoor(e) {
      if(this.state.defeated||this.state.won)return false;
      if(!this.isCurrent(e)||e.type!=='door')return false;
      if(this.distance(e)>1){this.notify('靠近门后才能开启。');return false;}
      if(!this.state.keys[e.color]){this.notify('缺少对应颜色的钥匙。');return false;}
      this.checkpoint();this.state.keys[e.color]--;this.state.removed[e.id]=true;
      this.addLog(`消耗 1 把${{yellow:'铜',blue:'青',red:'朱'}[e.color]}钥匙，门已开启。`,'item');
      this.emit('effect',{type:'door',x:e.x,y:e.y,meta:{color:e.color,material:e.color==='yellow'?'wood':'metal'}});this.changed();return true;
    }
    fight(e,options={}) {
      if(this.state.defeated||this.state.won)return false;
      if(!this.isCurrent(e)||e.type!=='enemy'||this.distance(e)!==1)return false;
      const enemy=this.data.enemies[e.enemy],p=this.preview(enemy,options);
      if(!p.possible){this.notify(p.reason);return false;}
      if(!p.canAfford){this.notify('当前凝息珠不足以完成这套临战准备，请改用另一方案。');return false;}
      if(enemy.trait==='boss'&&this.state.relics.length<5){this.notify('没有完整的五重心印，无法撼动无相之心。');return false;}
      this.checkpoint();this.state.orbs-=p.resourceCost?.orbs||0;this.state.hp-=p.damage;
      if(p.plan){this.state.bossPlan=p.plan.id;this.state.finalBattle={seals:p.seals,plan:p.plan.id,damage:p.damage};}
      this.emit('effect',{type:'attack',x:e.x,y:e.y,text:'−'+p.damage,meta:{enemy:e.enemy,damage:p.damage,goldReward:p.goldReward,victory:this.state.hp>0,rounds:p.rounds,enemyHits:p.enemyHits,traitDamage:p.traitDamage,phases:p.phases,plan:p.plan?.id,seals:p.seals,fromX:this.state.x,fromY:this.state.y,facing:this.state.facing}});
      if(this.state.hp<=0){this.state.hp=0;this.state.defeated=true;this.addLog('行者力竭。因果仍可回溯。','danger');this.changed();this.emit('defeat',{enemy,p});return false;}
      this.state.coins+=p.goldReward;this.state.kills++;this.state.removed[e.id]=true;
      this.addLog(`击败${enemy.name} · 损失 ${p.damage} 生命，获得 ${p.goldReward} 金。`,'combat');
      if(enemy.trait==='boss')this.story('黑莲化影 · 消散', '三相金甲崩落，黑莲借你嗔怒造出的心猿终于平静。点灯僧将灯递来，灯中护着你一路解救的生命。\n\n“你曾在黑莲前停步，听见一声求救，那时我才有了这盏灯。如今十六枚已齐，中央却仍空着——最后一颗，一直在你心中。”\n\n走向塔心莲阵，觉醒无骨舍利。',{portrait:'lantern',speaker:'点灯僧',kind:'boss',source:e.id});
      this.changed();return true;
    }
    useAbility(mode,x,y) {
      const s=this.state;if(s.defeated||s.won)return false;
      const cost=this.abilityCost(mode),required={staff:0,morph:1,clone:2}[mode];
      if(required===undefined||!s.relics.includes(required)){this.notify('这项神通尚未觉醒。');return false;}
      const tile=this.getTile(x,y),entity=this.getEntity(x,y),dist=Math.abs(s.x-x)+Math.abs(s.y-y);
      if(mode==='clone') {
        if(!entity||entity.type!=='switch'||entity.kind!=='plate'){this.notify('毫毛只能落在青色分身阵眼上。');return false;}
        if(s.switches[entity.id]){this.notify('这个阵眼已有分身驻守，无需再次消耗。');return false;}
        if(dist>4){this.notify('阵眼超出四格施法范围。距离按横纵格数相加，可隔墙施法。');return false;}
        if(s.mana<cost){this.notify(`分身需要 ${cost} 灵息。莲灯可免费补满灵息。`);return false;}
        const status=this.cloneStatus();if(status.free<=0){this.emit('cloneLimit',{target:entity,active:status.active});this.notify('本层只能同时驻守两处。召回一处分身后，再部署新的阵眼。');return false;}
        this.checkpoint();s.mana-=cost;s.switches[entity.id]=true;this.addLog(`毫毛化形，分身守住阵眼 · 灵息 −${cost}。${status.limit<Infinity?'本层可随时召回调度。':'按阵眼可召回。'}`,'magic');
      } else {
        if(dist!==1){this.notify('靠近目标一格后施法。');return false;}
        if(tile!==(mode==='staff'?'~':'=')&&!(mode==='morph'&&entity?.morphable)){this.notify(mode==='staff'?'金箍棒只能架起断口。':'青蝉化形只能穿过铁栅。');return false;}
        if(s.mana<cost){this.notify(`需要 ${cost} 灵息。莲灯可免费补满灵息。`);return false;}
        this.checkpoint();s.mana-=cost;if(mode==='morph'&&entity?.morphable)s.removed[entity.id]=true;else s.terrain[`${s.floor}:${x}:${y}`]='.';
        this.addLog((mode==='staff'?'金箍棒化作金桥，此路永久连通':'你化作青蝉钻过门隙，从内侧拔下门闩')+` · 灵息 −${cost}。`,'magic');
      }
      this.emit('effect',{type:'magic',x,y,text:mode==='clone'?'分身落阵':'道路已通',meta:{ability:mode,fromX:s.x,fromY:s.y,targets:mode==='clone'?this.data.floors[s.floor].entities.filter(a=>a.type==='gate'&&(a.controls?a.controls.includes(entity.controlId||entity.id):a.group===entity.group)).map(a=>({x:a.x,y:a.y})):[]}});this.changed();return true;
    }
    useConsumable(kind) {
      if(this.state.defeated||this.state.won)return false;
      if(kind==='elixir'&&this.state.elixirs>0){this.checkpoint();this.state.elixirs--;this.state.hp+=200;this.addLog('服下随身蟠桃 · 生命 +200。','item');}
      else if(kind==='orb'&&this.state.orbs>0&&this.state.mana<this.state.maxMana){this.checkpoint();this.state.orbs--;this.state.mana=this.state.maxMana;this.addLog('捏碎凝息珠 · 灵息尽复。','magic');}
      else {this.notify(kind==='orb'&&this.state.mana===this.state.maxMana?'灵息已满，无需消耗。':'背包中没有此物。');return false;}
      this.changed();return true;
    }
    shopCost(kind){const n=this.state.purchases[kind]||0;return kind==='heal'?12+n*6:20+n*12;}
    offerOrb(kind){
      if(this.state.won||this.state.defeated||this.getEntity(this.state.x,this.state.y)?.type!=='altar'||!['coins','heal'].includes(kind)||this.state.orbs<1)return false;
      this.checkpoint();this.state.orbs--;if(kind==='coins')this.state.coins+=8;else this.state.hp+=50;
      this.addLog(`供奉凝息珠 1 颗 · ${kind==='coins'?'功德金 +8':'生命 +50'}。`,'item');this.changed();return true;
    }
    shop(kind) {
      if(this.state.defeated||this.state.won)return false;
      const e=this.getEntity(this.state.x,this.state.y);
      if(!e||e.type!=='altar'||!['atk','def','heal'].includes(kind))return false;
      const cost=this.shopCost(kind);if(this.state.coins<cost){this.notify('功德不足。');return false;}
      this.checkpoint();this.state.coins-=cost;this.state.purchases[kind]++;
      if(kind==='heal')this.state.hp+=120;else this.state[kind]+=3;
      this.addLog(`供奉 ${cost} 金 · ${kind==='heal'?'生命 +120':kind==='atk'?'攻击 +3':'防御 +3'}。`,'item');this.changed();return true;
    }
    meditate() {
      if(this.state.defeated||this.state.won)return false;
      if(this.getEntity(this.state.x,this.state.y)?.type!=='altar')return false;
      if(this.state.mana===this.state.maxMana){this.notify('灵息已满。');return false;}
      this.checkpoint();this.state.mana=this.state.maxMana;this.changed();this.notify('莲灯照心 · 灵息尽复。');return true;
    }
    travel(floor) {
      const s=this.state;if(!s.relics.includes(2)||!s.visited.includes(floor)||s.floor===floor||s.mana<1||s.won||s.defeated)return false;
      const a=this.data.floors[floor].entities.find(e=>e.type==='altar');if(!a)return false;
      this.checkpoint();s.mana--;s.floor=floor;s.x=a.x;s.y=a.y;this.selection=null;this.motion=null;this.path=[];this.addLog(`乘云回到 ${this.data.floors[floor].name} · 灵息 −1。`,'magic');this.changed();this.emit('floorEntry',{floor:s.floor,title:this.data.floors[s.floor].name,text:this.data.floors[s.floor].intro});this.emit('effect',{type:'floor',x:s.x,y:s.y});return true;
    }
    awakenSelf(e=this.data.floors[this.state.floor].entities.find(a=>a.type==='finale')){
      if(this.state.won||this.state.defeated||this.state.selfAwakened||!this.isCurrent(e)||e.type!=='finale'||this.distance(e)>1||this.state.externalRelics!==16||this.state.relics.length!==5)return false;
      const boss=this.data.floors[17].entities.find(a=>a.type==='enemy'&&this.data.enemies[a.enemy].trait==='boss');
      if(boss&&!this.state.removed[boss.id]){this.notify('先破除守在莲阵前的黑莲三相。');return false;}
      this.checkpoint();this.state.selfAwakened=true;this.addLog('无骨归真 · 第十七颗不是宝物，是悟空愿意承担众生的本心。','relic');this.emit('effect',{type:'relic',x:e.x,y:e.y,text:'无骨舍利 · 归真',meta:{relic:17,index:16,externalRelics:16,self:true}});
      this.story('无骨归真 · 第十七颗','十六枚外舍利，终于照见中央那个空位。悟空看见的不是另一件宝物，是一路仍愿意回头救人的自己。\n\n“最后一个名字，原来从未被夺走。”金箍没有折断，黑莲却已无处安放你的心。\n\n走向莲台，选择与众生归去，或留灯守住归路。',{kind:'awakening',source:e.id,portrait:'wukong',speaker:'孙悟空',awakening:true});
      this.changed();this.emit('awakening',{rescued:[...this.state.rescued],externalRelics:16});return true;
    }
    finish(ending) {
      if(!['release','keep'].includes(ending)||!this.state.selfAwakened||this.state.relics.length<5||this.state.won||this.state.defeated)return false;
      const finale=this.data.floors[this.state.floor].entities.find(a=>a.type==='finale');if(!finale||this.distance(finale)>1)return false;
      const boss=this.data.floors[this.data.floors.length-1].entities.find(e=>e.type==='enemy'&&this.data.enemies[e.enemy].trait==='boss');
      if(boss&&!this.state.removed[boss.id]){this.notify('无相之心仍在守着塔心。');return false;}
      this.checkpoint();this.state.won=true;this.state.ending=ending;this.addLog(ending==='release'?'舍利归尘，众生出塔。':'舍利入心，行者守塔。','relic');this.changed();this.emit('ending',ending);return true;
    }
    distance(e){return Math.abs(this.state.x-e.x)+Math.abs(this.state.y-e.y);}
    isCurrent(e){return !!e&&!this.state.removed[e.id]&&this.data.floors[this.state.floor].entities.some(a=>a.id===e.id);}
    undo() {
      if(!this.history.length){this.notify('暂无可回溯的脚步。');return false;}
      const redo=this.snapshot();this.chronicle?.remember(redo);this.redoHistory.push(redo);this.state=this.history.pop();this.chronicle?.rewind(this.state);this.lastCheckpointKind=null;this.motion=null;this.selection=null;this.path=[];this.save(true);this.emit('reset');this.notify('因果回溯 · 已撤回上次行动。');return true;
    }
    redo(){if(!this.redoHistory.length){this.notify('暂无可重做的行动。');return false;}const undo=this.snapshot();this.chronicle?.remember(undo);this.history.push(undo);this.state=this.redoHistory.pop();this.chronicle?.rewind(this.state);this.lastCheckpointKind=null;this.motion=null;this.selection=null;this.path=[];this.save(true);this.emit('reset');this.notify('因果重现 · 已重做行动。');return true;}
    storageKey(kind='auto'){return this.runSession?.storageKey(kind)||(kind==='manual'?MANUAL_KEY:SAVE_KEY);}
    save(silent=false) {
      if(this.state.defeated){if(!silent)this.notify('力竭不会覆盖战前存档，可读取后重新规划。');return false;}
      try {if(!this.persist||typeof localStorage==='undefined')return false;const payload=this.exportSave(false);localStorage.setItem(this.storageKey('auto'),payload);if(this.runSession)this.runSession.storageWarning=false;if(!silent){localStorage.setItem(this.storageKey('manual'),payload);this.notify('手动存档已保留。后续行动只更新自动进度。');}return true;}
      catch(error){if(!silent)this.notify('浏览器禁止本地存储。可在背包导出存档。');else if(this.runSession?.isTrial&&!this.runSession.storageWarning){this.runSession.storageWarning=true;this.notify('试炼前缘未能保存，主线仍保留。可先在行囊导出本次进度。');}return false;}
    }
    validate(s) {
      if(!s||![1,2,3,4].includes(s.version)||!Number.isInteger(s.floor)||s.floor<0||s.floor>=this.data.floors.length)throw new Error('存档版本或塔层不正确');
      if(!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<0||s.x>=this.data.floors[s.floor].map[0].length||s.y<0||s.y>=this.data.floors[s.floor].map.length)throw new Error('存档坐标不正确');
      if(s.levelRevision!==undefined&&(!Number.isInteger(s.levelRevision)||s.levelRevision<1||s.levelRevision>(this.data.levelDepth?.revision||4)))throw new Error('存档殿院修订号不正确');
      for(const k of ['hp','atk','def','mana','maxMana','coins','turn','elixirs','orbs','kills'])if(!Number.isFinite(s[k])||s[k]<0)throw new Error('存档属性不正确');
      if(!Array.isArray(s.relics)||!Array.isArray(s.visited)||!s.keys||!s.removed||!s.switches||!s.terrain||!s.purchases||!s.seenIntros||!Array.isArray(s.log)||!Array.isArray(s.journal))throw new Error('存档结构不完整');
      if(new Set(s.relics).size!==s.relics.length||new Set(s.visited).size!==s.visited.length)throw new Error('存档进度重复');
      for(const key of ['keys','removed','switches','terrain','purchases','seenIntros'])if(typeof s[key]!=='object'||Array.isArray(s[key]))throw new Error('存档状态不正确');
      if(!directions[s.facing]||s.maxMana!==6||s.mana>s.maxMana||!s.visited.includes(s.floor)||typeof s.won!=='boolean'||typeof s.defeated!=='boolean'||!['atk','def','heal'].every(k=>Number.isInteger(s.purchases[k])&&s.purchases[k]>=0))throw new Error('存档规则不正确');
      if(s.relics.some(n=>!Number.isInteger(n)||n<0||n>4)||s.visited.some(n=>!Number.isInteger(n)||n<0||n>=this.data.floors.length)||['yellow','blue','red'].some(k=>!Number.isInteger(s.keys[k])||s.keys[k]<0))throw new Error('存档物品不正确');
      if(s.version>=2&&(!s.choices||typeof s.choices!=='object'||Array.isArray(s.choices)||!s.settings||typeof s.settings!=='object'||Array.isArray(s.settings)||!bossPlans.some(p=>p.id===s.bossPlan)))throw new Error('存档策略状态不正确');
      if(s.outcomes!==undefined&&(!Array.isArray(s.outcomes)||s.outcomes.length>120||s.outcomes.some(e=>!e||typeof e.title!=='string'||e.title.length>160||typeof e.detail!=='string'||e.detail.length>1200||!Array.isArray(e.deltas)||!Number.isInteger(e.floor)||e.floor<0||e.floor>17||!Number.isInteger(e.turn)||e.turn<0)))throw new Error('阶段记录不正确');
      if(s.walked!==undefined&&(!s.walked||typeof s.walked!=='object'||Array.isArray(s.walked)||Object.keys(s.walked).length>7938||Object.entries(s.walked).some(([k,v])=>!/^([0-9]|1[0-7]):([0-9]|1[0-9]|20):([0-9]|1[0-9]|20)$/.test(k)||v!==true)))throw new Error('熟路记录不正确');
      if(s.finalBattle!==undefined&&(!s.finalBattle||!sealLayout(s.finalBattle.seals)||!bossPlans.some(p=>p.id===s.finalBattle.plan)||!Number.isFinite(s.finalBattle.damage)||s.finalBattle.damage<0))throw new Error('决战记录不正确');
      if(s.version>=2){for(const [group,option]of Object.entries(s.choices)){if(typeof option!=='string'||!this.data.choices?.[group]?.options.some(o=>o.id===option))throw new Error('存档契约状态不正确');}if(['quickZero','showDamage'].some(key=>typeof s.settings[key]!=='boolean'))throw new Error('存档偏好不正确');}
      if(s.version>=3){
        for(const key of ['revealed','quests','tides'])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))throw new Error('章节状态不正确');
        if(!Array.isArray(s.rescued)||s.rescued.some(id=>typeof id!=='string')||new Set(s.rescued).size!==s.rescued.length||typeof s.selfAwakened!=='boolean'||s.externalRelics!==(s.version===4&&this.data.fragmentGroups?s.fragments?.length:s.relics.reduce((n,id)=>n+(this.data.relicGroups||[3,3,3,3,4])[id],0))||s.selfAwakened&&s.externalRelics!==16)throw new Error('舍利状态不正确');
        if(Object.values(s.tides).some(v=>!['low','high'].includes(v))||Object.values(s.quests).some(v=>typeof v!=='boolean')||Object.values(s.revealed).some(v=>typeof v!=='boolean'))throw new Error('机关状态不正确');
        if(!['standard','simple','reduced'].includes(s.settings.motion)||['screenShake','music','sfx'].some(k=>typeof s.settings[k]!=='boolean'))throw new Error('表现设置不正确');
      }
      if(s.version===4){
        if(!Array.isArray(s.fragments)||new Set(s.fragments).size!==s.fragments.length||s.fragments.some(n=>!Number.isInteger(n)||n<0||n>15)||!Array.isArray(s.treasures)||new Set(s.treasures).size!==s.treasures.length||s.treasures.some(id=>!this.data.treasures[id])||!Array.isArray(s.equipped)||new Set(s.equipped).size!==s.equipped.length||s.equipped.length>2||s.equipped.some(id=>!s.treasures.includes(id)))throw new Error('法器或外舍利记录不正确');
      }
      return s;
    }
    migrate(raw){
      const s=clone(this.validate(raw));s.version=4;s.choices=s.choices||{};s.bossPlan=s.bossPlan||'direct';s.settings={quickZero:false,showDamage:true,motion:'standard',screenShake:false,music:false,sfx:false,...s.settings};
      s.fragments=s.fragments||[];s.treasures=s.treasures||[];s.equipped=s.equipped||[];if(raw.version<4&&this.data.fragmentGroups){for(const group of this.data.fragmentGroups)for(const id of group){const f=this.data.floors.find(f=>f.entities.some(e=>e.type==='fragment'&&e.fragment===id));if((f&&f.id<s.floor)||s.relics.includes(this.data.fragmentGroups.indexOf(group))){if(!s.fragments.includes(id))s.fragments.push(id);}}}s.externalRelics=this.data.fragmentGroups?s.fragments.length:s.relics.reduce((n,id)=>n+(this.data.relicGroups||[3,3,3,3,4])[id],0);s.selfAwakened=!!s.selfAwakened||!!s.won;s.revealed=s.revealed||{};s.quests=s.quests||{};s.tides=s.tides||{};s.rescued=s.rescued||[];
      if(raw.version<3){
        if(s.visited.some(n=>n>=7)||s.relics.includes(2)){s.quests.bajie=true;if(!s.rescued.includes('bajie'))s.rescued.push('bajie');}
        if(s.visited.some(n=>n>=8))s.quests.weakwater=true;
        if(s.relics.includes(1))for(const floor of this.data.floors)for(const a of floor.entities)if(['east-tower','west-tower'].includes(a.controlId))s.switches[a.id]=true;
        if(s.removed['f13-11']){s.choices.sevenWounds='power';s.quests.sevenWounds=true;s.quests.sevenLegacy=true;s.log.unshift({text:'旧档迁移：原问心碑庭碧髓已领取，防御份额沿用为白衣守关；未重复发放属性。',kind:'story',turn:s.turn});}
      }
      if(raw.version===1&&this.data.choices?.locks){
        const room=this.data.floors[4],opened=room.entities.find(e=>e.type==='choice'&&e.choice==='locks'&&s.removed[e.id]);
        if(opened)s.choices.locks=opened.option;
        if(s.removed['f4-11']||s.removed['f4-12']){s.quests.locksLegacy=true;const cache=room.entities.find(e=>e.type==='cache'&&e.choice==='locks');if(cache)s.removed[cache.id]=true;s.log.unshift({text:'旧档迁移：百锁殿灵晶已领取，原属性保留；契约仍可选路，北匣不再重复发放成长。',kind:'story',turn:s.turn});}
        if(s.removed['f10-13']){s.choices.silk='atk';s.quests.silkLegacy=true;s.log.unshift({text:'旧档迁移：千丝庭朱砂已领取，原攻击保留；双经卷沿用攻击份额。',kind:'story',turn:s.turn});}
      }
      if(this.data.fragmentGroups)for(const floor of this.data.floors)for(const e of floor.entities)if(e.type==='fragment'&&s.fragments.includes(e.fragment))s.removed[e.id]=true;
      if(raw.version<4){s.terrain={};s.mana=s.maxMana;s.log.unshift({text:'殿堂已重构：旧进度回到本层莲灯，原资源与机关保留，桥栅需按新地形施法。',kind:'story',turn:s.turn});}
      // A legacy save can land on a wall after an authored room redesign.
      const revision=this.data.levelDepth?.revision||4,layoutChanged=(raw.levelRevision||4)<revision;
      if(layoutChanged)s.terrain=Object.fromEntries(Object.entries(s.terrain).filter(([key])=>{const [floor,x,y]=key.split(':').map(Number);return ['~','='].includes(this.data.floors[floor]?.map[y]?.[x]);}));
      const f=this.data.floors[s.floor],water=f.waterTiles?.find(t=>t.x===s.x&&t.y===s.y),tile=water?((s.tides[f.tideGroup||'weakwater']||'low')===water.openWhen?'.':'w'):(s.terrain[`${s.floor}:${s.x}:${s.y}`]||f.map[s.y][s.x]);if(raw.version<4||layoutChanged||['#','w','v'].includes(tile)){
        const preferred=f.entities.find(e=>e.type==='altar')||{x:6,y:11};s.x=preferred.x;s.y=preferred.y;
      }
      s.levelRevision=revision;if(layoutChanged&&raw.version>=4)s.log.unshift({text:'殿院已修缮：旧行程回到本层莲灯，原属性、资源与已成机关保留。',kind:'story',turn:s.turn});
      if(f.cloneLimit){const active=f.entities.filter(e=>e.type==='switch'&&e.kind==='plate'&&s.switches[e.id]);active.slice(f.cloneLimit).forEach(e=>{s.switches[e.id]=false;});}
      return s;
    }
    load(raw) {
      const previousData=this.data;
      try {const obj=JSON.parse(raw || localStorage.getItem(this.storageKey('auto')));this.runSession?.validateLoad(obj);const rawState=obj?.state||obj;
        if(root.TowerEncounters)this.data=root.TowerEncounters.dataForRevision(rawState.levelRevision||6);
        const s=this.migrate(rawState),chronicle=this.chronicle?.decode(obj?.chronicle,s);this.state=s;this.chronicle?.load(chronicle);this.history=[];this.redoHistory=[];this.lastCheckpointKind=null;this.runSession?.didLoad(obj);this.selection=null;this.motion=null;this.mode='walk';this.path=[];this.outcomeBefore=null;this.emit('data',this.data);this.emit('reset');this.notify('存档已读取。');return true;}
      catch(error){this.data=previousData;this.notify('无法读取存档：'+error.message);return false;}
    }
    hasSave(){try{return !!localStorage.getItem(this.storageKey('auto'));}catch(error){return false;}}
    hasManualSave(){try{return !!localStorage.getItem(this.storageKey('manual'));}catch(error){return false;}}
    loadManual(){try{const raw=localStorage.getItem(this.storageKey('manual'));if(!raw){this.notify('尚无手动存档。');return false;}return this.load(raw);}catch(error){this.notify('无法读取手动存档。');return false;}}
    getSaveSummary(kind='auto'){try{const p=JSON.parse(localStorage.getItem(this.storageKey(kind)));if(!p?.state)return null;return {floor:p.state.floor,name:this.data.floors[p.state.floor]?.name,hp:p.state.hp,relics:p.state.relics.length,savedAt:p.savedAt};}catch(error){return null;}}
    exportSave(pretty=true){return JSON.stringify({state:this.state,savedAt:Date.now(),...(this.chronicle?{chronicle:this.chronicle.export()}: {}),...(this.runSession?.exportMeta()?{trialSession:this.runSession.exportMeta()}: {})},null,pretty?2:0);}
    findPath(tx,ty) {
      const s=this.state;if(tx===s.x&&ty===s.y)return [];
      const queue=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]);
      while(queue.length){const cur=queue.shift();for(const [dir,[dx,dy]]of Object.entries(directions)){
        const x=cur.x+dx,y=cur.y+dy,key=x+','+y;if(seen.has(key)||this.getTile(x,y)!=='.')continue;seen.add(key);
        const e=this.getEntity(x,y),isTarget=x===tx&&y===ty;
        const blocked=this.isBlocked(e);
        if(isTarget)return cur.path.concat(dir);
        if(blocked)continue;
        queue.push({x,y,path:cur.path.concat(dir)});
      }}return null;
    }
  }
  root.TowerRules={battle,directions,loadout,treasures:TREASURES,bossSeals:BOSS_SEALS,sealLayout};root.TowerEngine=TowerEngine;
  if(typeof module!=='undefined')module.exports={TowerRules:root.TowerRules,TowerEngine};
})(typeof window!=='undefined'?window:globalThis);
