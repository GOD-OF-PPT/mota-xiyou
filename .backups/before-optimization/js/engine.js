/* 大圣：舍利魔塔 · deterministic simulation. No DOM or rendering state is saved. */
(function (root) {
  'use strict';
  const SAVE_KEY = 'dasheng-relic-tower-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const directions = { up: [0,-1], right: [1,0], down: [0,1], left: [-1,0] };

  function battle(state, enemy) {
    const hit = state.atk - enemy.def;
    if (hit <= 0) return { possible: false, survive: false, damage: Infinity, hit: 0, reason: '攻击未破防，无法造成伤害。', rounds: Infinity, enemyHits: Infinity, lines: ['须使攻击高于守卫防御。'] };
    const rounds = Math.ceil(enemy.hp / hit);
    const first = enemy.trait === 'first' || enemy.trait === 'boss';
    const enemyHits = Math.max(0, rounds - 1) + (first ? 1 : 0);
    const ward = state.relics.includes(3) ? 8 : 0;
    const foeHit = enemy.trait === 'magic' ? Math.max(0, enemy.atk - ward) : Math.max(0, enemy.atk - state.def);
    const normalDamage = enemyHits * foeHit;
    let traitDamage = 0;
    if (enemy.trait === 'venom') traitDamage = enemy.special || 0;
    if (enemy.trait === 'counter') traitDamage = (enemy.special || 0) * rounds;
    if (enemy.trait === 'boss') traitDamage = Math.max(0, (enemy.special || 0) - ward);
    const damage = normalDamage + traitDamage;
    const lines = [`每棒 ${state.atk} − ${enemy.def} = ${hit} 点伤害`, `${enemy.hp} 生命 ÷ ${hit}，向上取整：${rounds} 棒`, `${first ? '敌人先手；' : '行者先手；'}敌人还击 ${enemyHits} 次`, `${enemy.trait === 'magic' ? '法术无视防御' + (ward ? '，定心减伤 8' : '') : '每次还击 max(0, ' + enemy.atk + ' − ' + state.def + ')'}：${foeHit} 点`];
    if (traitDamage) lines.push(`${enemy.trait === 'counter' ? '反震' : enemy.trait === 'venom' ? '余毒' : '执念'}：额外 ${traitDamage} 点真实伤害`);
    return { possible:true, survive:state.hp > damage, damage, hit, rounds, enemyHits, foeHit, normalDamage, traitDamage, firstStrike:first, ward, lines };
  }

  class TowerEngine {
    constructor(data) {
      this.data = data;
      this.listeners = [];
      this.history = [];
      this.mode = 'walk';
      this.selection = null;
      this.motion = null;
      this.path = [];
      this.busyUntil = 0;
      this.state = this.initialState();
    }
    initialState() {
      return { version:1, floor:0,x:6,y:11,facing:'up',hp:620,atk:24,def:10,mana:6,maxMana:6,coins:0,keys:{yellow:1,blue:0,red:0},relics:[],removed:{},switches:{},terrain:{},visited:[0],seenIntros:{},journal:[],log:[],elixirs:1,orbs:1,turn:0,defeated:false,won:false,ending:null,purchases:{atk:0,def:0,heal:0},startedAt:Date.now(),kills:0 };
    }
    on(fn) { this.listeners.push(fn); return () => this.listeners = this.listeners.filter(f=>f!==fn); }
    emit(type, detail) { this.listeners.forEach(fn => fn(type, detail)); }
    newGame() {
      this.state = this.initialState(); this.history=[]; this.mode='walk'; this.selection=null;
      this.addLog('残钟响起。你踏入了自己的因果。','story');
      this.story('入塔', '五百年前，灵山借一座无相塔，封住了你取经途中舍下的杀心。如今五枚舍利碎落，塔中众生被困在同一夜。\n\n提灯人说：集齐舍利，你就能取回完整的自己。可那盏灯，为何让你觉得熟悉？');
      this.state.seenIntros[0]=true;
      this.save(true); this.emit('reset');
    }
    snapshot() { return clone(this.state); }
    checkpoint() { this.history.push(this.snapshot()); if (this.history.length>30) this.history.shift(); }
    changed() { this.state.turn++; this.save(true); this.emit('change'); }
    addLog(text,kind='info') { this.state.log.unshift({text,kind,turn:this.state.turn}); this.state.log=this.state.log.slice(0,50); this.emit('log',{text,kind}); }
    notify(text) { this.emit('notice',text); }
    story(title,text) { this.state.journal.push({title,text,floor:this.state.floor}); this.emit('story',{title,text}); }
    getTile(x,y,floor=this.state.floor) {
      const f=this.data.floors[floor];
      if (!f || x<0 || y<0 || y>=13 || x>=13) return '#';
      return this.state.terrain[`${floor}:${x}:${y}`] || f.map[y][x];
    }
    getEntity(x,y,floor=this.state.floor) {
      return this.data.floors[floor].entities.find(e=>e.x===x && e.y===y && !this.state.removed[e.id]) || null;
    }
    isGateOpen(entity,floor=this.state.floor) {
      if (entity.type === 'seal') return this.state.relics.length >= (entity.requires || 0);
      const switches=this.data.floors[floor].entities.filter(e=>e.type==='switch' && e.group===entity.group);
      return switches.length>0 && switches.every(e=>!!this.state.switches[e.id]);
    }
    preview(enemyId) { return battle(this.state,typeof enemyId === 'string' ? this.data.enemies[enemyId] : enemyId); }
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
      if(tile==='#') { this.notify('石壁无路。试试另一条因果。'); return false; }
      if(tile==='~'||tile==='=') { this.notify(tile==='~'?'断口无桥。选择「金箍架桥」后点此格。':'铁栅封路。选择「青蝉化形」后点此格。'); return false; }
      if(e) {
        if(e.type==='enemy') { this.emit('combat',e); return false; }
        if(e.type==='door') { this.emit('door',e); return false; }
        if((e.type==='gate'||e.type==='seal')&&!this.isGateOpen(e)) { this.notify(e.type==='seal'?`此处须集齐 ${e.requires} 枚舍利。`:'机关尚未接通。查看同色的机关与阵眼。'); return false; }
        if(e.type==='chest'&&e.requires>this.state.relics.length) { this.notify(`宝匣共鸣：需要 ${e.requires} 枚舍利。获得新舍利后再来。`); return false; }
        if(e.type==='finale') { if(s.relics.length<5) {this.notify('五枚舍利缺一不可。');return false;} this.emit('finale',e); return false; }
        if(e.type==='stairs'&&this.stairRequirement(e)>s.relics.length){this.notify(`本篇舍利尚未归位。须集齐 ${this.stairRequirement(e)} 枚舍利才能继续上行。`);return false;}
      }
      this.checkpoint();
      const fromX=s.x,fromY=s.y; s.x=x;s.y=y;
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
        case 'stairs': this.changeFloor(e); break;
        case 'npc': case 'monument': {
          const d=this.data.dialogues[e.dialogue];
          if(!s.seenIntros['event:'+e.id]){s.seenIntros['event:'+e.id]=true;this.story(e.name || d?.title || '无相塔记',typeof d==='string'?d:(d?.text||d?.lines?.join('\n\n')||'残碑无言，只有风声。'));}
          break;
        }
        case 'altar': s.mana=s.maxMana; this.addLog('莲灯燃起，灵息尽复。生命不会自动恢复。','magic'); this.emit('altar',e); break;
        case 'switch':
          if(e.kind!=='plate') { s.switches[e.id]=!s.switches[e.id]; this.addLog(`${e.label||'机关'}已${s.switches[e.id]?'接通':'复位'}。`,'magic');this.emit('effect',{type:'magic',x:e.x,y:e.y}); }
          break;
      }
    }
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
      this.emit('effect',{type:'pickup',x:e.x,y:e.y,text:item.name});
    }
    itemEffect(item) {
      return ({hp:'生命 +',atk:'攻击 +',def:'防御 +',key:'钥匙 +',coin:'金钱 +',mana:'灵息 +',elixir:'蟠桃 +',orb:'灵珠 +'})[item.kind]+(item.value||1);
    }
    takeRelic(e) {
      const s=this.state, r=this.data.relics[e.relic];
      if(s.relics.includes(e.relic))return;
      s.relics.push(e.relic); s.relics.sort();s.removed[e.id]=true;s.hp+=100;s.mana=s.maxMana;
      this.addLog(`舍利觉醒 · ${r.name}。生命 +100，灵息尽复。`,'relic');
      this.emit('effect',{type:'relic',x:e.x,y:e.y,text:r.name});
      const abilityName={staff:'金箍架桥',morph:'青蝉化形',clone:'毫毛分身',ward:'定心护身',truth:'归真共鸣'}[r.ability]||r.ability;
      this.story(r.name+' · 觉醒',`${r.story}\n\n${abilityName}：${r.description}\n\n舍利与你共鸣：生命 +100，灵息回复至 6。旧塔层也许已有新的道路。`);
    }
    changeFloor(e) {
      const s=this.state; s.floor=e.to;s.x=e.tx;s.y=e.ty;this.selection=null;this.motion=null;this.path=[];
      if(!s.visited.includes(e.to))s.visited.push(e.to);
      const f=this.data.floors[e.to];this.addLog(`抵达 ${f.name}`,'story');
      if(!s.seenIntros[e.to]){s.seenIntros[e.to]=true;this.story(f.name,f.intro);}
      this.emit('effect',{type:'floor',x:s.x,y:s.y});
    }
    stairRequirement(e){return e.requires ?? (e.to>this.state.floor&&e.to%3===0?Math.floor(e.to/3):0);}
    traverse(e){
      if(this.state.won||this.state.defeated||!this.isCurrent(e)||e.type!=='stairs'||this.distance(e)>1)return false;
      if(this.stairRequirement(e)>this.state.relics.length){this.notify(`本篇舍利尚未归位。须集齐 ${this.stairRequirement(e)} 枚舍利才能继续上行。`);return false;}
      this.checkpoint();this.changeFloor(e);this.changed();return true;
    }
    openDoor(e) {
      if(this.state.defeated||this.state.won)return false;
      if(!this.isCurrent(e)||e.type!=='door')return false;
      if(this.distance(e)>1){this.notify('靠近门后才能开启。');return false;}
      if(!this.state.keys[e.color]){this.notify('缺少对应颜色的钥匙。');return false;}
      this.checkpoint();this.state.keys[e.color]--;this.state.removed[e.id]=true;
      this.addLog(`消耗 1 把${{yellow:'铜',blue:'青',red:'朱'}[e.color]}钥匙，门已开启。`,'item');
      this.emit('effect',{type:'door',x:e.x,y:e.y});this.changed();return true;
    }
    fight(e) {
      if(this.state.defeated||this.state.won)return false;
      if(!this.isCurrent(e)||e.type!=='enemy'||this.distance(e)!==1)return false;
      const enemy=this.data.enemies[e.enemy],p=this.preview(enemy);
      if(!p.possible){this.notify(p.reason);return false;}
      if(enemy.trait==='boss'&&this.state.relics.length<5){this.notify('没有完整的五枚舍利，无法撼动无相之心。');return false;}
      this.checkpoint();this.state.hp-=p.damage;
      this.emit('effect',{type:'attack',x:e.x,y:e.y,text:'−'+p.damage});
      if(this.state.hp<=0){this.state.hp=0;this.state.defeated=true;this.addLog('行者力竭。因果仍可回溯。','danger');this.changed();this.emit('defeat',{enemy,p});return false;}
      this.state.coins+=enemy.gold;this.state.kills++;this.state.removed[e.id]=true;
      this.addLog(`击败${enemy.name} · 损失 ${p.damage} 生命，获得 ${enemy.gold} 金。`,'combat');
      if(enemy.trait==='boss')this.story('无相之心', '你击碎最后一层金甲，露出的却不是妖魔。\n\n那是五百年前的你。暴戾，也孤独。提灯人将灯递来——灯中一直护着塔里每一个亡魂。\n\n“我是你被舍去的慈悲。舍利从来不属于佛，也不属于塔。它们是你一路作出的选择。”\n\n走向塔心，决定这份力量的归处。');
      this.changed();return true;
    }
    useAbility(mode,x,y) {
      const s=this.state;if(s.defeated||s.won)return false;
      const required={staff:0,morph:1,clone:2}[mode];
      if(required===undefined||!s.relics.includes(required)){this.notify('这项神通尚未觉醒。');return false;}
      const tile=this.getTile(x,y),entity=this.getEntity(x,y),dist=Math.abs(s.x-x)+Math.abs(s.y-y);
      if(mode==='clone') {
        if(!entity||entity.type!=='switch'||entity.kind!=='plate'){this.notify('毫毛只能落在青色分身阵眼上。');return false;}
        if(s.switches[entity.id]){this.notify('这个阵眼已有分身驻守，无需再次消耗。');return false;}
        if(dist>4){this.notify('阵眼超出四格施法范围。距离按横纵格数相加，可隔墙施法。');return false;}
        if(s.mana<2){this.notify('分身需要 2 灵息。莲灯可免费补满灵息。');return false;}
        this.checkpoint();s.mana-=2;s.switches[entity.id]=true;this.addLog('毫毛化形，分身永久守住阵眼 · 灵息 −2。','magic');
      } else {
        if(dist!==1){this.notify('靠近目标一格后施法。');return false;}
        if(tile!==(mode==='staff'?'~':'=')){this.notify(mode==='staff'?'金箍棒只能架起断口。':'青蝉化形只能穿过铁栅。');return false;}
        if(s.mana<1){this.notify('需要 1 灵息。莲灯可免费补满灵息。');return false;}
        this.checkpoint();s.mana--;s.terrain[`${s.floor}:${x}:${y}`]='.';
        this.addLog(mode==='staff'?'金箍棒化作金桥，此路永久连通 · 灵息 −1。':'你化作青蝉钻过门隙，从内侧拔下门闩 · 灵息 −1。','magic');
      }
      this.emit('effect',{type:'magic',x,y,text:mode==='clone'?'分身落阵':'道路已通'});this.changed();return true;
    }
    useConsumable(kind) {
      if(this.state.defeated||this.state.won)return false;
      if(kind==='elixir'&&this.state.elixirs>0){this.checkpoint();this.state.elixirs--;this.state.hp+=200;this.addLog('服下随身蟠桃 · 生命 +200。','item');}
      else if(kind==='orb'&&this.state.orbs>0&&this.state.mana<this.state.maxMana){this.checkpoint();this.state.orbs--;this.state.mana=this.state.maxMana;this.addLog('捏碎凝息珠 · 灵息尽复。','magic');}
      else {this.notify(kind==='orb'&&this.state.mana===this.state.maxMana?'灵息已满，无需消耗。':'背包中没有此物。');return false;}
      this.changed();return true;
    }
    shopCost(kind){const n=this.state.purchases[kind]||0;return kind==='heal'?12+n*6:20+n*12;}
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
      this.checkpoint();s.mana--;s.floor=floor;s.x=a.x;s.y=a.y;this.selection=null;this.motion=null;this.path=[];this.addLog(`乘云回到 ${this.data.floors[floor].name} · 灵息 −1。`,'magic');this.changed();this.emit('effect',{type:'floor',x:s.x,y:s.y});return true;
    }
    finish(ending) {
      if(this.state.relics.length<5||this.state.won||this.state.defeated)return false;
      const boss=this.data.floors[this.data.floors.length-1].entities.find(e=>e.type==='enemy'&&this.data.enemies[e.enemy].trait==='boss');
      if(boss&&!this.state.removed[boss.id]){this.notify('无相之心仍在守着塔心。');return false;}
      this.checkpoint();this.state.won=true;this.state.ending=ending;this.addLog(ending==='release'?'舍利归尘，众生出塔。':'舍利入心，行者守塔。','relic');this.changed();this.emit('ending',ending);return true;
    }
    distance(e){return Math.abs(this.state.x-e.x)+Math.abs(this.state.y-e.y);}
    isCurrent(e){return !!e&&!this.state.removed[e.id]&&this.data.floors[this.state.floor].entities.some(a=>a.id===e.id);}
    undo() {
      if(!this.history.length){this.notify('暂无可回溯的脚步。');return false;}
      this.state=this.history.pop();this.motion=null;this.selection=null;this.path=[];this.save(true);this.emit('reset');this.notify('因果回溯 · 已撤回上一步。');return true;
    }
    save(silent=false) {
      if(this.state.defeated){if(!silent)this.notify('力竭不会覆盖战前存档，可读取后重新规划。');return false;}
      try {if(typeof localStorage==='undefined')return false;localStorage.setItem(SAVE_KEY,JSON.stringify({state:this.state,savedAt:Date.now()}));if(!silent)this.notify('已存档。每一步也会自动保存。');return true;}
      catch(error){if(!silent)this.notify('浏览器禁止本地存储。可在背包导出存档。');return false;}
    }
    validate(s) {
      if(!s||s.version!==1||!Number.isInteger(s.floor)||s.floor<0||s.floor>=this.data.floors.length)throw new Error('存档版本或塔层不正确');
      if(!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<0||s.x>12||s.y<0||s.y>12)throw new Error('存档坐标不正确');
      for(const k of ['hp','atk','def','mana','maxMana','coins','turn','elixirs','orbs','kills'])if(!Number.isFinite(s[k])||s[k]<0)throw new Error('存档属性不正确');
      if(!Array.isArray(s.relics)||!Array.isArray(s.visited)||!s.keys||!s.removed||!s.switches||!s.terrain||!s.purchases||!s.seenIntros||!Array.isArray(s.log)||!Array.isArray(s.journal))throw new Error('存档结构不完整');
      if(new Set(s.relics).size!==s.relics.length||new Set(s.visited).size!==s.visited.length)throw new Error('存档进度重复');
      for(const key of ['keys','removed','switches','terrain','purchases','seenIntros'])if(typeof s[key]!=='object'||Array.isArray(s[key]))throw new Error('存档状态不正确');
      if(!directions[s.facing]||s.maxMana!==6||s.mana>s.maxMana||!s.visited.includes(s.floor)||typeof s.won!=='boolean'||typeof s.defeated!=='boolean'||!['atk','def','heal'].every(k=>Number.isInteger(s.purchases[k])&&s.purchases[k]>=0))throw new Error('存档规则不正确');
      if(s.relics.some(n=>!Number.isInteger(n)||n<0||n>4)||s.visited.some(n=>!Number.isInteger(n)||n<0||n>=this.data.floors.length)||['yellow','blue','red'].some(k=>!Number.isInteger(s.keys[k])||s.keys[k]<0))throw new Error('存档物品不正确');
      return s;
    }
    load(raw) {
      try {const obj=JSON.parse(raw || localStorage.getItem(SAVE_KEY));const s=this.validate(obj?.state||obj);this.state=clone(s);this.history=[];this.selection=null;this.motion=null;this.mode='walk';this.path=[];this.emit('reset');this.notify('存档已读取。');return true;}
      catch(error){this.notify('无法读取存档：'+error.message);return false;}
    }
    hasSave(){try{return !!localStorage.getItem(SAVE_KEY);}catch(error){return false;}}
    exportSave(){return JSON.stringify({state:this.state,savedAt:Date.now()},null,2);}
    findPath(tx,ty) {
      const s=this.state;if(tx===s.x&&ty===s.y)return [];
      const queue=[{x:s.x,y:s.y,path:[]}],seen=new Set([s.x+','+s.y]);
      while(queue.length){const cur=queue.shift();for(const [dir,[dx,dy]]of Object.entries(directions)){
        const x=cur.x+dx,y=cur.y+dy,key=x+','+y;if(seen.has(key)||this.getTile(x,y)!=='.')continue;seen.add(key);
        const e=this.getEntity(x,y),isTarget=x===tx&&y===ty;
        const blocked=e&&(['enemy','door','finale'].includes(e.type)||(['gate','seal'].includes(e.type)&&!this.isGateOpen(e))||e.type==='chest'&&e.requires>s.relics.length);
        if(isTarget)return cur.path.concat(dir);
        if(blocked||e?.type==='stairs')continue;
        queue.push({x,y,path:cur.path.concat(dir)});
      }}return null;
    }
  }
  root.TowerRules={battle,directions};root.TowerEngine=TowerEngine;
  if(typeof module!=='undefined')module.exports={TowerRules:root.TowerRules,TowerEngine};
})(typeof window!=='undefined'?window:globalThis);
