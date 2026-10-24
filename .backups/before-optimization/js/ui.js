(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const engine = new TowerEngine(TowerData);
  const renderer = new TowerRenderer($('game-canvas'),engine);
  window.game = engine;
  const traitNames={normal:'普通',first:'先手',magic:'法术',armor:'重甲',venom:'余毒',counter:'反震',boss:'无相'};
  const abilityNames={staff:'金箍架桥',morph:'青蝉化形',clone:'毫毛分身',ward:'慈悲护持',truth:'归真共鸣'};
  const colorNames={yellow:'铜',blue:'青',red:'朱'};
  const modeNames={walk:'行走',inspect:'火眼金睛',staff:'金箍架桥',morph:'青蝉化形',clone:'毫毛分身'};
  let started=false,modalOpen=false,modalQueue=[],pathTimer=0,toastTimer=0,lastInput=0,audioEnabled=false,audioContext=null,musicTimer=0,musicStep=0;
  const settings=()=>engine.state.settings||(engine.state.settings={quickZero:false,showDamage:true});
  const currentFloor=()=>TowerData.floors[engine.state.floor];
  const finite=n=>Number.isFinite(n)?n:'—';
  const coord=e=>`第 ${engine.state.floor+1} 层 · ${e.x+1}, ${e.y+1}`;
  function hintHTML(text){return esc(text).replace(/[（(](\d+)\s*[,，]\s*(\d+)[）)]/g,(match,x,y)=>`<button class="hint-target" data-focus-x="${Number(x)-1}" data-focus-y="${Number(y)-1}" title="在地图上定位">${match}</button>`);}
  function bindFocus(holder){holder?.querySelectorAll('[data-focus-x]').forEach(b=>b.onclick=()=>focusTarget(engine.state.floor,Number(b.dataset.focusX),Number(b.dataset.focusY)));}
  function focusTarget(floor,x,y){
    stopPath();
    if(floor!==engine.state.floor){
      if(!engine.state.visited.includes(floor)){toast('还未抵达此层，请循阶探索。');return;}
      if(!engine.state.relics.includes(2)){toast('第九层觉醒乘云后可直达旧层；目标已记在因果簿。');return;}
      if(engine.state.mana<1){toast('乘云需要 1 点灵息。');return;}
      clearModals();if(!engine.travel(floor))return;
    }else clearModals();
    engine.setMode('inspect');engine.select(x,y);$('game-canvas').focus({preventScroll:true});
    renderer.effect('magic',x,y,'此处');toast(`已定位：第 ${floor+1} 层 (${x+1}, ${y+1})。`);
  }
  const tone=(freq,duration=.12,type='sine',volume=.04)=>{
    if(!audioEnabled||!audioContext)return;
    const t=audioContext.currentTime,o=audioContext.createOscillator(),gain=audioContext.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(gain);gain.connect(audioContext.destination);o.start(t);o.stop(t+duration+.02);
  };
  function toggleAudio(){
    if(!audioContext){const AC=window.AudioContext||window.webkitAudioContext;if(!AC){toast('当前浏览器不支持合成音频。');return;}audioContext=new AC();}
    audioContext.resume();audioEnabled=!audioEnabled;
    $('btn-audio').textContent=audioEnabled?'♫ 声音 开':'♪ 声音 关';$('btn-audio').setAttribute('aria-pressed',audioEnabled);
    clearInterval(musicTimer);
    if(audioEnabled){const notes=[130.81,196,261.63,293.66,329.63,293.66,196,164.81,130.81,196,261.63,392,329.63,293.66,196,164.81];tone(261.63,.6,'sine',.02);musicTimer=setInterval(()=>{tone(notes[musicStep++%notes.length],1.8,'sine',.018);if(musicStep%4===0)tone(65.4,2.4,'sine',.025);},760);}
  }
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3300);$('status-message').textContent=text;}
  function stopPath(){clearTimeout(pathTimer);pathTimer=0;engine.path=[];}
  function showModal(title,content,actions=[],eyebrow='无相塔 · 因果簿',closeable=true){
    stopPath();
    if($('game-toolbox'))$('game-toolbox').open=false;
    if(modalOpen){modalQueue.push({title,content,actions,eyebrow,closeable});return;}
    modalOpen=true;$('modal-title').textContent=title;$('modal-eyebrow').textContent=eyebrow;$('modal-content').innerHTML=content;$('modal-actions').innerHTML='';
    $('modal-close').classList.toggle('hidden',!closeable);$('modal-root').classList.remove('hidden');
    actions.forEach(a=>{const b=document.createElement('button');b.textContent=a.label;b.className=a.className||'secondary-button';b.disabled=!!a.disabled;b.addEventListener('click',()=>{if(a.keep){a.action?.();return;}closeModal(false);a.action?.();nextModal();});$('modal-actions').append(b);});
    $('modal-close').disabled=!closeable;
    requestAnimationFrame(()=>($('modal-actions').querySelector('button:not(:disabled)')||$('modal-close')).focus());
  }
  function nextModal(){if(!modalOpen&&modalQueue.length){const m=modalQueue.shift();showModal(m.title,m.content,m.actions,m.eyebrow,m.closeable);}}
  function closeModal(next=true){modalOpen=false;$('modal-root').classList.add('hidden');if(next)nextModal();}
  function clearModals(){modalQueue=[];closeModal(false);}
  const paragraphs=text=>String(text).split('\n\n').map(t=>`<p>${esc(t).replace(/\n/g,'<br>')}</p>`).join('');
  function story(d){showModal(d.title,`<div class="story-quote">${paragraphs(d.text)}</div>`,[{label:'继续前行',className:'primary-button'}],'残卷 · '+TowerData.floors[engine.state.floor].name);}
  function showGame(){started=true;$('start-screen').classList.add('hidden');$('game-shell').classList.remove('hidden');renderHUD();}
  function begin(){clearModals();showGame();engine.newGame();}
  function continueGame(){clearModals();if(engine.load()){showGame();if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();}}
  function statsHTML(enemy){return `<div class="enemy-stat-grid"><span>生命<b>${enemy.hp}</b></span><span>攻击<b>${enemy.atk}</b></span><span>防御<b>${enemy.def}</b></span><span>金钱<b>${enemy.gold}</b></span></div>`;}
  function attackBreakpoint(enemy,p){
    if(p.nextAttack)return p.nextAttack;
    if(enemy.trait==='boss'||!p.possible||p.rounds<=1||p.damage===0)return null;
    const ceiling=Math.max(engine.state.atk+1,enemy.def+enemy.hp);
    for(let atk=engine.state.atk+1;atk<=ceiling;atk++){const q=TowerRules.battle({...engine.state,atk},enemy);if(q.possible&&q.damage<p.damage)return {atk,delta:atk-engine.state.atk,saved:p.damage-q.damage};}
    return null;
  }
  function battleHTML(enemy,p,expanded=false){
    const next=attackBreakpoint(enemy,p),phase=p.phases?.length?`<div class="phase-table">${p.phases.map((q,i)=>`<div class="phase-row"><b>${i+1} · ${esc(q.name)}</b><span>生命 ${q.hp} / 攻 ${q.atk} / 防 ${q.def}</span><small>${q.possible===false?'无法破防':`${finite(q.rounds)} 棒 · 敌出手 ${finite(q.enemyHits)} 次 · 损失 ${finite(q.damage)}`}</small></div>`).join('')}</div>`:'';
    return `${statsHTML(enemy)}<div class="forecast ${p.possible&&p.survive?'safe':'danger'}"><span>预计生命损失${p.phases?.length?' · 三相合计':''}</span><strong class="damage-number">${p.possible?p.damage:'无法破防'}</strong><small>${p.possible?(p.survive?`战后剩余 ${engine.state.hp-p.damage} 生命`:'本次战斗将会力竭'):'提升攻击，或寻找其他路线'}</small></div><div class="trait-note context-summary"><b>${traitNames[enemy.trait]||'普通'} · </b>${esc(enemy.desc||'行者先攻，击杀一击不会受到还击。')}</div>${next?`<div class="breakpoint-note">下一攻击临界：<b>${next.atk}</b>（再加 ${next.delta}）可少损 <b>${next.saved}</b> 生命。</div>`:''}${expanded?`${phase}<details class="formula" ${!p.phases?'open':''}><summary>展开真实计算过程</summary>${(p.lines||[]).map(t=>`<div>${esc(t)}</div>`).join('')}<div><b>总损失 = ${p.possible?p.damage:'无法破防'}</b></div></details>`:''}`;
  }
  function combat(e){
    if(!engine.isCurrent(e))return;
    const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy);
    if(enemy.trait==='boss'&&engine.bossOptions){bossCombat(e);return;}
    const can=engine.distance(e)===1;
    const bossLock=enemy.trait==='boss'&&engine.state.relics.length<5;
    showModal(enemy.name,`${battleHTML(enemy,p,true)}${bossLock?'<p class="danger-text">无相之心须五枚舍利齐聚才能挑战。</p>':''}<p class="muted">${esc(enemy.lore||'守卫不会重生。确认后一次结算整场战斗。')}</p>`,[
      {label:'暂避锋芒'},
      {label:p.survive?`迎战 · 损失 ${p.damage} 生命`:'迎战 · 将会力竭',className:p.survive?'primary-button':'danger-button',disabled:!p.possible||!can||bossLock,action:()=>engine.fight(e)}
    ],`火眼金睛 · ${traitNames[enemy.trait]||'普通守卫'}`);
  }
  function bossCombat(e){
    if(!engine.isCurrent(e))return;
    const enemy=TowerData.enemies[e.enemy],options=engine.bossOptions();
    const selected=options.find(o=>o.id===engine.state.bossPlan)||options[0];
    const p=engine.preview(e.enemy,{bossPlan:selected.id});
    showModal('无相 · 三相问心',`<p>准备方案会改变整场三阶段结算。<b>灵珠只在确认迎战时消耗</b>；选方案、看预览均免费。</p><div class="boss-plans">${options.map(o=>{const q=o.preview||engine.preview(e.enemy,{bossPlan:o.id});const cost=typeof o.cost==='number'?o.cost:(o.cost?.orbs||0);return `<button class="boss-plan ${o.id===selected.id?'selected':''}" data-boss-plan="${esc(o.id)}" aria-pressed="${o.id===selected.id}"><b>${esc(o.label)}</b><span>${esc(o.description)}</span><small>${cost?`凝息珠 × ${cost}`:'无额外消耗'} · 预计损失 ${q.possible?q.damage:'无法破防'}</small></button>`;}).join('')}</div>${battleHTML(enemy,p,true)}<p class="planning-note">当前凝息珠 <b>${engine.state.orbs}</b> 颗。三相连续结算，中途不会补血或更换准备。</p>`,[
      {label:'继续筹备'},
      {label:`迎战 · ${p.possible?p.damage:'无法破防'} 生命${p.resourceCost?.orbs?` + ${p.resourceCost.orbs} 珠`:''}`,className:p.survive?'primary-button':'danger-button',disabled:!p.possible||p.canAfford===false||engine.distance(e)!==1||engine.state.relics.length<5,action:()=>engine.fight(e)}
    ],'最终挑战 · 先看清每一相');
    $('modal-content').querySelectorAll('[data-boss-plan]').forEach(b=>b.onclick=()=>{engine.setBossPlan(b.dataset.bossPlan);clearModals();bossCombat(e);});
  }
  function door(e){const color=colorNames[e.color];showModal(color+'色封门',`<p>开启将消耗 <b>1 把${color}钥匙</b>。已开启的门永久消失。</p><div class="resource-choice">现有 ${engine.state.keys[e.color]} 把 · ${e.label?esc(e.label):'先观察门后的资源与其他可走路线，再作决定。'}</div><p class="muted">若想调整选择，按 Z 可回溯刚才的行动。</p>`,[{label:'再想一想'},{label:'消耗钥匙 · 开门',className:'primary-button',disabled:!engine.state.keys[e.color],action:()=>engine.openDoor(e)}],'钥匙与路线');}
  function resourceText(values){
    if(!values)return '无';
    const names={hp:'生命',atk:'攻击',def:'防御',coins:'功德金',mana:'灵息',elixirs:'随身蟠桃',orbs:'凝息珠'};
    const result=[];for(const [key,value]of Object.entries(values)){if(key==='key'&&value)result.push(`${colorNames[value.color]||value.color}钥匙 × ${value.amount||1}`);else if(key==='keys'&&value){for(const [c,n]of Object.entries(value))if(n)result.push(`${colorNames[c]||c}钥匙 × ${n}`);}else if(names[key]&&value)result.push(`${names[key]} ${value>0?'+':''}${value}`);}
    return result.join(' · ')||'无';
  }
  function choice(e){
    const spec=TowerData.choices?.[e.choice];if(!spec||!engine.choicePreview)return;
    const options=spec.options.map(o=>({o,p:engine.choicePreview(e,o.id)}));
    showModal(spec.title,`<p>${esc(spec.description)}</p><div class="choice-options">${options.map(({o,p})=>`<article class="choice-option ${p.chosen===o.id||p.chosen?.id===o.id?'selected':''}"><h3>${esc(o.label)}</h3><p>${esc(o.description)}</p><div class="choice-cost">付出：${esc(resourceText(o.cost))}</div><div class="choice-reward">${spec.grant==='cache'?'藏室奖励':'获得'}：${esc(resourceText(o.reward))}</div>${p.reason?`<small>${esc(p.reason)}</small>`:''}${!p.chosen?`<button class="context-button" data-choice="${esc(o.id)}" ${!p.possible||(e.option&&e.option!==o.id)?'disabled':''}>${e.option&&e.option!==o.id?'前往对应契台选择':`确认 · ${esc(o.label)}`}</button>`:`<b>${p.chosen===o.id||p.chosen?.id===o.id?'已选定此路':'本次已选择另一条路'}</b>`}</article>`).join('')}</div><p class="planning-note">同组只能选一项，其他选项会锁定。${spec.grant==='cache'?'奖励在契约藏室领取，须自行抵达。':'确认后立即结算。'}按 Z 可回溯此决策。</p>`,[{label:'先观察其他路线'}],'路线契约 · 代价公开');
    $('modal-content').querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{clearModals();engine.choose(e,b.dataset.choice);});
  }
  function cloneLimit(d){
    const active=d.active||engine.cloneStatus?.().active||[];
    showModal('镜台已满 · 调度分身',`<p>此层仅能同时驻守 <b>${engine.cloneStatus?.().limit||active.length}</b> 个阵眼。回收一个分身后再安排新阵位。</p><p class="planning-note">回收免费，关联机关将立即重新计算。重新派驻仍消耗 2 灵息；已走通的普通道路不会被重置。</p><div class="recall-list">${active.map(e=>`<button class="secondary-button" data-recall="${esc(e.id)}">回收 ${esc(e.label||'镜台分身')} · (${e.x+1}, ${e.y+1})</button>`).join('')}</div>`,[{label:'保持现有阵位'}],'神通调度 · 可逆选择');
    $('modal-content').querySelectorAll('[data-recall]').forEach(b=>b.onclick=()=>{clearModals();if(engine.recallClone(b.dataset.recall)&&d.target)cast('clone',d.target.x,d.target.y);});
  }
  function cast(mode,x,y){const ok=engine.useAbility(mode,x,y);if(ok){engine.setMode('walk');engine.select(x,y);}return ok;}
  function inspectSettings(){
    const prefs=settings();return `<h3>行者偏好</h3><label class="setting-row"><input type="checkbox" id="setting-zero" ${prefs.quickZero?'checked':''}><span><b>零损守卫直接结算</b><small>只对普通零损战斗生效；首领和有损战斗始终确认。</small></span></label><label class="setting-row"><input type="checkbox" id="setting-damage" ${prefs.showDamage?'checked':''}><span><b>地图常显战损</b><small>直接在守卫旁显示当前损失，火眼金睛仍可查看公式。</small></span></label>`;
  }
  function bindSettings(){for(const [id,key]of [['setting-zero','quickZero'],['setting-damage','showDamage']])$(id)?.addEventListener('change',ev=>{settings()[key]=ev.target.checked;engine.save(true);renderHUD();});}
  function altar(){
    const s=engine.state;
    showModal('莲灯 · 修心',`<p>莲灯可免费补满灵息，<b>不恢复生命</b>。守卫与宝物均不刷新。</p><div class="resource-choice">功德金 ${s.coins} · 灵息 ${s.mana} / ${s.maxMana}</div><div class="shop-list">${['atk','def','heal'].map(k=>`<div><span>${k==='atk'?'磨砺金箍 · 攻击 +3':k==='def'?'淬炼护身 · 防御 +3':'灯前疗伤 · 生命 +120'}</span><b>${engine.shopCost(k)} 金</b></div>`).join('')}</div><p class="muted">每次同类供奉会涨价：属性 +12 金，疗伤 +6 金。价格在所有塔层共享。</p>`,[
      {label:'离开莲灯'},
      {label:'补满灵息',disabled:s.mana===s.maxMana,action:()=>{engine.meditate();altar();}},
      ...['atk','def','heal'].map(k=>({label:k==='atk'?'修攻击':k==='def'?'修防御':'疗伤',disabled:s.coins<engine.shopCost(k),className:'primary-button',action:()=>{engine.shop(k);altar();}}))
    ],'功德有限 · 取舍有因');
  }
  function renderHUD(){
    const s=engine.state,f=TowerData.floors[s.floor];
    $('hp-value').textContent=s.hp;$('atk-value').textContent=s.atk;$('def-value').textContent=s.def;$('mana-value').textContent=s.mana+' / '+s.maxMana;$('coins-value').textContent=s.coins;
    for(const c of ['yellow','blue','red'])$('key-'+c).textContent=s.keys[c];
    $('floor-number').textContent=String(s.floor+1).padStart(2,'0');$('floor-name').textContent=f.name;$('floor-subtitle').textContent=f.subtitle;
    $('floor-objective').textContent=f.objective;
    $('location-label').textContent=`第 ${s.floor+1} / ${TowerData.floors.length} 层 · ${['石生','照骨','悬丝','两仪','倒影','无相'][Math.floor(s.floor/3)]}篇`;
    $('floor-progress').textContent=`舍利 ${s.relics.length} / 5`;
    if($('status-turn'))$('status-turn').textContent=`${s.turn} 步因果`;
    $('mode-label').textContent=modeNames[engine.mode];
    $('relic-slots').innerHTML=TowerData.relics.map((r,i)=>`<span class="relic-slot ${s.relics.includes(i)?'awakened':''}" title="${esc(r.name+' · '+(abilityNames[r.ability]||r.ability))}"><span>${s.relics.includes(i)?'✦':'◇'}</span><small>${esc(r.name.replace('舍利',''))}</small></span>`).join('');
    document.querySelectorAll('[data-mode]').forEach(b=>{const required={staff:0,morph:1,clone:2}[b.dataset.mode],locked=required!==undefined&&!s.relics.includes(required);b.classList.toggle('active',engine.mode===b.dataset.mode);b.classList.toggle('locked',locked);b.setAttribute('aria-pressed',engine.mode===b.dataset.mode);if(b.querySelector('small'))b.querySelector('small').textContent=locked?'第 '+[3,6,9][required]+' 层觉醒':({walk:'自在探索',inspect:'洞察 · 无消耗',staff:'1 灵息 · 相邻断口',morph:'1 灵息 · 相邻铁栅',clone:'2 灵息 · 四格阵眼'})[b.dataset.mode];b.title=locked?'在第 '+[3,6,9][required]+' 层获得舍利后觉醒':modeHelp(b.dataset.mode);});
    $('btn-undo').disabled=!engine.history.length;
    if($('btn-redo'))$('btn-redo').disabled=!engine.redoHistory?.length;
    const cs=engine.cloneStatus?.();if($('clone-status'))$('clone-status').textContent=s.relics.includes(2)?`分身 ${cs?.active?.length||0}${Number.isFinite(cs?.limit)?' / '+cs.limit:' 驻守'}${Number.isFinite(cs?.limit)?' · 可回收':''}`:'神通随舍利觉醒';
    const availableRevisits=(TowerData.revisits||[]).filter(r=>s.relics.includes(r.relic)&&!revisitDone(r));if($('revisit-count'))$('revisit-count').textContent=availableRevisits.length?String(availableRevisits.length):'';
    $('event-log').innerHTML=s.log.slice(0,5).map(l=>`<div class="log-entry ${esc(l.kind)}"><span class="log-dot"></span><p>${esc(l.text)}</p></div>`).join('');
    updateContext();
  }
  function modeHelp(mode){return {walk:'方向键 / WASD 移动；点击地面寻路。机关与楼梯按 E 或点交互',inspect:'点选任何目标，免费查看真实规则和损失',staff:'相邻断口，耗 1 灵息，永久架桥；成功后回到行走',morph:'相邻铁栅，耗 1 灵息，从内侧永久解锁；成功后回到行走',clone:'点选四格内青色阵眼，耗 2 灵息，可隔墙；满员时可免费回收'}[mode];}
  function updateContext(){
    const s=engine.state,sel=engine.selection;
    let title='观塔 · 再落子',html=`<div class="context-kicker">${esc(modeNames[engine.mode])}</div><p>${esc(modeHelp(engine.mode))}</p><div class="context-divider"></div><p class="muted">点守卫先看战损；点机关先看规则。没有计时，也没有刷怪。</p><div class="context-callout">${hintHTML(TowerData.floors[s.floor].hints?.[0]||'先看清每一条路，再决定付出什么。')}</div>`;
    if(sel){const e=engine.getEntity(sel.x,sel.y),tile=engine.getTile(sel.x,sel.y);
      if(e?.type==='enemy'){const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy);title=enemy.name;html=`<div class="context-kicker">守卫 · ${traitNames[enemy.trait]} · ${coord(e)}</div>${battleHTML(enemy,p)}<div class="context-actions"><button class="context-button" data-context="fight">${engine.distance(e)===1?'查看并迎战':'走近 · 再确认迎战'}</button>${engine.distance(e)!==1?'<button class="secondary-button" data-context="formula">详细计算</button>':''}</div>`;}
      else if(e?.type==='door'){title=colorNames[e.color]+'色封门';html=`<p class="context-summary">消耗 1 把${colorNames[e.color]}钥匙 · 现有 ${s.keys[e.color]} 把</p><div class="context-callout">${esc(e.label||'开启后永久消失。')}</div><button class="context-button" data-context="door">${engine.distance(e)>1?'走近 · 再确认开门':'开门决策'}</button>`;}
      else if(tile==='~'||tile==='='){const m=tile==='~'?'staff':'morph';title=tile==='~'?'断口 · 金箍为桥':'铁栅 · 青蝉可渡';html=`<p>${esc(modeHelp(m))}</p><p class="muted">道路贯通后无需再次消耗灵息。</p><button class="context-button" data-context="${m}" ${engine.distance(sel)!==1?'disabled':''}>${modeNames[m]} · 1 灵息</button>`;}
      else if(e?.type==='switch'){title=e.label||(e.kind==='plate'?'分身阵眼':'两仪扳杆');html=`<p class="context-summary">${s.switches[e.id]?'◆ 灵脉已接通':'◇ 灵脉尚未接通'} · 坐标 ${e.x+1}, ${e.y+1}</p><div class="context-callout">${e.kind==='plate'?'四格内可隔墙施法，耗 2 灵息；分身可以免费回收，机关同步复位。':'经过不会自动切换。主动交互才能扳动；同组机关全部接通才会开门。'}</div>${e.kind==='plate'?`<button class="context-button" data-context="${s.switches[e.id]?'recall':'clone'}" ${!s.switches[e.id]&&engine.distance(e)>4?'disabled':''}>${s.switches[e.id]?'回收分身 · 免费':'分身落阵 · 2 灵息'}</button>`:`<button class="context-button" data-context="switch">${engine.distance(e)>1?'走近扳杆':s.switches[e.id]?'复位扳杆':'接通扳杆'}</button>`}`;}
      else if(e?.type==='gate'||e?.type==='seal'){title=e.label||'灵脉机关';const switches=TowerData.floors[s.floor].entities.filter(a=>a.type==='switch'&&a.group===e.group);html=`<div class="context-callout">${engine.isGateOpen(e)?'已开启，可以通行。':e.type==='seal'?`需要 ${e.requires} 枚舍利，现有 ${s.relics.length} 枚。`:'同组机关全部接通后开启。'}</div>${e.type==='gate'?switches.map(a=>`<p>${s.switches[a.id]?'◆':'◇'} ${esc(a.label||'阵眼')} <small>坐标 ${a.x+1},${a.y+1}</small></p>`).join(''):''}`;}
      else if(e?.type==='relic'){const r=TowerData.relics[e.relic];title=r.name;html=`<div class="context-kicker">舍利 · ${esc(abilityNames[r.ability]||r.ability)}</div><p>${esc(r.description)}</p><div class="context-callout">拾取：生命 +100，灵息尽复。觉醒后可回访旧区域。</div>`;}
      else if(e?.type==='item'||e?.type==='chest'){const it=TowerData.items[e.item];title=e.label||it.name;html=`<p>${esc(it.description||it.desc||engine.itemEffect(it))}</p>${e.type==='chest'?`<div class="context-callout">${e.requires>s.relics.length?`需要 ${e.requires} 枚舍利共鸣。记住这里，稍后回来。`:'宝匣已回应舍利，走上此格领取。'}</div>`:''}`;}
      else if(e?.type==='stairs'){title='塔阶 · '+TowerData.floors[e.to].name;const need=engine.stairRequirement(e);html=`<p class="context-summary">前往第 ${e.to+1} 层 · 经过阶梯不会自动换层。</p><p class="muted">旧层的守卫、宝物与机关保持现状。</p>${need>s.relics.length?`<div class="context-callout">需要 ${need} 枚舍利，现有 ${s.relics.length} 枚。</div>`:''}<button class="context-button" data-context="stairs" ${need>s.relics.length?'disabled':''}>${engine.distance(e)>1?'走近阶梯':`确认前往第 ${e.to+1} 层`}</button>`;}
      else if(e?.type==='altar'){title=e.name||'莲灯';html='<p class="context-summary">走上补满灵息；主动交互修心，生命不会自动恢复。</p><button class="context-button" data-context="altar">'+(engine.distance(e)===0?'灯前修心':'走到莲灯 · 修心')+'</button>';}
      else if(e?.type==='choice'){const spec=TowerData.choices?.[e.choice];title=e.label||spec?.title||'路线契约';html=`<p class="context-summary">${esc(spec?.description||'代价与奖励均会在确认前展示。')}</p><button class="context-button" data-context="choice">${engine.distance(e)>1?'走近 · 比较选择':'比较代价与奖励'}</button>`;}
      else if(e?.type==='cache'){const spec=TowerData.choices?.[e.choice];title=e.label||'契约藏室';html=`<p class="context-summary">${esc(spec?.description||'奖励由已选契约决定；每份契约只可领取一次。')}</p><button class="context-button" data-context="cache">查看契约奖励</button>`;}
      else if(e?.type==='npc'||e?.type==='monument'){title=e.name||'塔中残卷';const d=TowerData.dialogues[e.dialogue];html=`<p class="context-summary">${esc((typeof d==='string'?d:(d?.text||d?.lines?.join('\n')||'')).split('\n')[0])}</p><button class="context-button" data-context="story">${engine.distance(e)>1?'走近 · 阅读全文':'阅读全文'}</button>`;}
      else if(e?.type==='finale'){title='舍利的归处';html='<p>战胜无相之心后，踏向塔心。最后的选择，将决定众生与行者的未来。</p>';}
      else if(tile==='#'){title='沉默石壁';html='<p class="muted">不可通行。分身可隔墙落在四格内的青色阵眼上。</p>';}
      else {title=`青石 · ${sel.x+1}, ${sel.y+1}`;html='<p class="muted">可通行的地面。点击可沿已连通道路行走。</p>';}
    }
    $('context-title').textContent=title;$('context-body').innerHTML=html;
    const selectedEntity=sel&&engine.getEntity(sel.x,sel.y),selectedTile=sel&&engine.getTile(sel.x,sel.y);
    document.querySelector('.context-card')?.classList.toggle('has-selection',!!sel&&(!!selectedEntity||selectedTile==='~'||selectedTile==='='));
    bindFocus($('context-body'));
    $('context-body').querySelectorAll('[data-context]').forEach(b=>b.onclick=()=>{
      const p=engine.selection,e=p&&engine.getEntity(p.x,p.y);if(!p)return;const a=b.dataset.context;
      if(a==='formula'&&e)combat(e);
      else if(a==='fight'&&e)approach(e,()=>combat(e));
      else if(a==='door'&&e)approach(e,()=>door(e));
      else if(a==='switch'&&e)approach(e,()=>engine.toggleSwitch(e));
      else if(a==='stairs'&&e)approach(e,()=>engine.traverse(e));
      else if(a==='altar'&&e)approach(e,altar,true);
      else if(a==='choice'&&e)approach(e,()=>choice(e));
      else if(a==='cache'&&e)choice(e);
      else if(a==='story'&&e)approach(e,()=>engine.interact(e));
      else if(a==='recall'&&e)engine.recallClone(e.id);
      else cast(a,p.x,p.y);
    });
  }
  function inventory(){const s=engine.state;showModal('行者行囊',`<div class="inventory-grid"><article><span class="inventory-symbol">桃</span><h3>随身蟠桃 × ${s.elixirs}</h3><p>立即恢复 200 生命。生命无上限，不会浪费溢出治疗。</p></article><article><span class="inventory-symbol blue">珠</span><h3>凝息珠 × ${s.orbs}</h3><p>可补满 ${s.maxMana} 点灵息，也可留给路线契约与最终战准备。莲灯免费补息，珠的其他用途不可重复获得。</p></article></div><div class="key-summary">铜钥匙 ${s.keys.yellow} · 青钥匙 ${s.keys.blue} · 朱钥匙 ${s.keys.red}</div><h3>已觉醒的舍利</h3>${s.relics.length?s.relics.map(i=>`<div class="codex-row"><b>${esc(TowerData.relics[i].name)}</b><p>${esc(TowerData.relics[i].description)}</p></div>`).join(''):'<p class="muted">尚未获得舍利。第三层有第一枚。</p>'}<div class="save-tools"><button id="export-save" class="secondary-button">导出存档</button><label class="secondary-button file-label">导入存档<input type="file" id="import-save" accept=".json,application/json" hidden></label></div>`,[{label:'收起行囊'},{label:'服用蟠桃',disabled:!s.elixirs,className:'primary-button',action:()=>{engine.useConsumable('elixir');inventory();}},{label:'凝息珠 · 补满灵息',disabled:!s.orbs||s.mana===s.maxMana,action:()=>{engine.useConsumable('orb');inventory();}}],'背包 · 有限资源');
    $('export-save')?.addEventListener('click',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([engine.exportSave()],{type:'application/json'}));a.href=url;a.download='大圣-舍利魔塔-第'+(s.floor+1)+'层.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出可迁移的 JSON 存档。');});
    $('import-save')?.addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;if(file.size>2000000){toast('存档文件过大。');return;}const raw=await file.text();clearModals();if(engine.load(raw)){engine.save(true);if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();}});
  }
  function revisitDone(r){
    const entity=TowerData.floors[r.floor]?.entities.find(e=>e.id===r.target||(e.x===r.x&&e.y===r.y));
    if(r.target&&engine.state.removed[r.target])return true;
    if(entity)return !!engine.state.removed[entity.id]||(entity.type==='switch'&&!!engine.state.switches[entity.id]);
    return !!engine.state.terrain[`${r.floor}:${r.x}:${r.y}`];
  }
  function journal(){
    const s=engine.state;showModal('十八重 · 因果簿',`<div class="journal-tabs"><button class="primary-button" id="tab-map">塔层与线索</button><button class="secondary-button" id="tab-story">已阅残卷 (${s.journal.length})</button></div><div id="journal-body"></div>`,[{label:'合上因果簿'}],'六篇十八层 · 旧路亦是新路');
    function map(){const holder=$('journal-body');if(!holder)return;
      const revisits=(TowerData.revisits||[]).filter(r=>s.relics.includes(r.relic));
      holder.innerHTML=`${revisits.length?`<h3>舍利新解 · 旧层回响</h3><div class="revisit-list">${revisits.map(r=>{const done=revisitDone(r),reachable=s.visited.includes(r.floor),canFocus=r.floor===s.floor||(s.relics.includes(2)&&s.mana>=1&&reachable);return `<article class="revisit-row ${done?'completed':''}"><b>${done?'◆ 已探索':'◇ 可回访'} · ${esc(r.title)}</b><p>${esc(r.description)}</p><small>第 ${r.floor+1} 层 · (${r.x+1}, ${r.y+1}) · ${esc(TowerData.relics[r.relic].name)}</small>${!done?`<button class="secondary-button" data-revisit="${esc(r.id)}" ${!canFocus?'disabled':''}>${r.floor===s.floor?'地图定位':'乘云定位 · 1 息'}</button>`:''}</article>`;}).join('')}</div>`:''}<p class="muted">${s.relics.includes(2)?'乘云耗 1 灵息，直达已抵达塔层的莲灯。落地不会自动补息；机关与资源状态保持。':'第九层觉醒分身舍利后，可乘云回到已抵达塔层的莲灯。'}</p><div class="tower-list">${TowerData.floors.map((f,i)=>`<article class="tower-row ${i===s.floor?'current':''}"><span>${String(i+1).padStart(2,'0')}</span><div><b>${s.visited.includes(i)?esc(f.name):'未抵达'}</b><small>${s.visited.includes(i)?esc(f.objective):'塔雾未散，循阶而上。'}</small>${i===s.floor?`<div class="floor-hints">${(f.hints||[]).map(h=>`<p>· ${hintHTML(h)}</p>`).join('')}${(f.hintTargets||[]).map(t=>`<button class="secondary-button" data-focus-x="${t.x}" data-focus-y="${t.y}">${esc(t.text)} ↗</button>`).join('')}</div>`:''}</div>${s.relics.includes(2)&&s.visited.includes(i)&&i!==s.floor?`<button class="secondary-button" data-travel="${i}" ${s.mana<1?'disabled':''}>乘云 · 1息</button>`:''}</article>`).join('')}</div>`;
      holder.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>{clearModals();engine.travel(Number(b.dataset.travel));});
      holder.querySelectorAll('[data-revisit]').forEach(b=>b.onclick=()=>{const r=revisits.find(r=>r.id===b.dataset.revisit);if(r)focusTarget(r.floor,r.x,r.y);});bindFocus(holder);
    }
    function notes(){if($('journal-body'))$('journal-body').innerHTML=s.journal.length?s.journal.slice().reverse().map(d=>`<details class="journal-note"><summary>${esc(d.title)}<small>第 ${d.floor+1} 层</small></summary>${paragraphs(d.text)}</details>`).join(''):'<p>塔中尚无记载。</p>';}
    $('tab-map')?.addEventListener('click',map);$('tab-story')?.addEventListener('click',notes);map();
  }
  function bestiary(){const s=engine.state,foes=TowerData.floors[s.floor].entities.filter(e=>e.type==='enemy'&&!s.removed[e.id]);showModal('火眼金睛 · 敌情簿',`<p class="muted">本层尚有 ${foes.length} 名守卫。以下损失以当前属性实时计算，不含途中拾取和成长。</p>${foes.map(e=>{const a=TowerData.enemies[e.enemy],p=engine.preview(a);return `<article class="bestiary-entry"><div><b>${esc(a.name)}</b><small>${traitNames[a.trait]} · 坐标 ${e.x+1},${e.y+1}</small></div>${statsHTML(a)}<div class="bestiary-bottom"><span>损失 <b class="${p.survive?'safe-text':'danger-text'}">${p.possible?p.damage:'无法破防'}</b></span><button class="secondary-button" data-foe="${esc(e.id)}">详细计算</button></div></article>`;}).join('')||'<div class="context-callout">此层守卫已肃清。无需再战。</div>'}`, [{label:'合上敌情簿'}],'规则透明 · 先算后战');$('modal-content').querySelectorAll('[data-foe]').forEach(b=>b.onclick=()=>{const e=foes.find(e=>e.id===b.dataset.foe);clearModals();combat(e);});}
  function help(){showModal('入塔须知',`<div class="guide-section"><h3>一格一策，不计时</h3><p>方向键 / WASD 移动，或点击地面自动寻路。点击守卫会先显示整场战损，确认才会战斗。所有守卫、物品与门都不会刷新。</p><h3>明算胜负</h3><p>行者伤害 = 攻击 − 敌防御，须大于 0；出棒数 = 敌生命 ÷ 每棒伤害，向上取整。普通守卫还击次数 = 出棒数 − 1。敌伤害 = max(0, 敌攻 − 行者防御)。生命必须大于总损失才能获胜。</p><p>先手守卫额外攻击一次；法术无视防御；余毒在战后固定扣血；反震在每一棒后固定扣血。首领兼具先手与战后执念。所有特性都计入预览。</p><h3>西游神通，打开新路</h3><p><b>1 行走 · 2 火眼金睛</b>：免费查看任意格。<br><b>3 金箍架桥</b>：第三层觉醒；相邻断口，耗 1 灵息，永久开路。<br><b>4 青蝉化形</b>：第六层觉醒；相邻铁栅，耗 1 灵息，从内侧开栅。<br><b>5 毫毛分身</b>：第九层觉醒；四格内点青色阵眼，可隔墙，耗 2 灵息，永久留守。距离按横纵格数相加。<br><b>定心护身</b>：第十二层觉醒，被动将每次法术伤害降低 8，首领执念降低 8。<br><b>归真共鸣</b>：第十五层觉醒，回到第一层开启归根匣，取得最终朱钥匙。</p><h3>机关与补给</h3><p>站上扳杆切换状态；同色扳杆、阵眼全部接通才会开启对应机关门。莲灯免费回满灵息，不回生命；供奉花费有限金钱。生命无上限。可随时用背包中的蟠桃与灵珠。</p><h3>存档与回溯</h3><p>每步自动存档；Ctrl+S 手动保存，L 读取，Z 撤回一步（当前会话最近 30 步）。I 背包，J 因果簿，B 敌情簿，H 规则，E 与脚下或面前目标交互，Esc 关闭或回到行走。第九层后因果簿支持乘云回访。背包可导入、导出 JSON 存档。</p><p class="muted">没有隐藏随机伤害，没有强制倒计时。资源不足时先检查旧层宝匣与其他分支。</p></div>`,[{label:'记下了 · 继续',className:'primary-button'}],'大圣 · 舍利魔塔');}
  function defeat(){showModal('行者，莫忘来路',`<div class="ending-symbol">败</div><p>金箍棒落地，塔钟却没有停。你仍能回到上一个选择。</p><div class="resource-choice">力竭不会覆盖战前存档。可直接回溯，或读取战前进度重新规划。</div>`,[{label:'回溯到战前',className:'primary-button',disabled:!engine.history.length,action:()=>engine.undo()},{label:'读取战前存档',disabled:!engine.hasSave(),action:continueGame},{label:'重启冒险',action:()=>confirmRestart()}],'力竭 · 因果未断',false);}
  function finale(){const boss=TowerData.floors[TowerData.floors.length-1].entities.find(e=>e.type==='enemy'&&TowerData.enemies[e.enemy].trait==='boss');if(boss&&!engine.state.removed[boss.id]){toast('无相之心尚未伏诛。');return;}showModal('最后一枚选择',`<div class="story-quote"><p>五枚舍利悬在掌心，塔中的门已不再需要钥匙。</p><p>提灯人微笑：“大圣，你要带走的是力量，还是你自己？”</p></div><div class="ending-options"><article><h3>舍利归尘</h3><p>将舍利还给众生。高塔消散，被困者自由，行者带着慈悲继续西行。</p></article><article><h3>舍利入心</h3><p>承认自己的杀心，留下镇守塔中因果。众生同样获释，行者成为新的提灯人。</p></article></div><p class="muted">此选择改变结局叙事，不改写已取得的通关成绩。</p>`,[{label:'舍利归尘 · 放下',className:'primary-button',action:()=>engine.finish('release')},{label:'舍利入心 · 承担',action:()=>engine.finish('keep')}],'无相塔心 · 完整的你');}
  function ending(choice){const s=engine.state;showModal(choice==='release'?'不负众生，不负此心':'心有无相，灯照归途',`<div class="ending-symbol">${choice==='release'?'悟':'灯'}</div><div class="story-quote">${paragraphs(choice==='release'?'你张开手，舍利化成十八道晨光。\n\n每一扇你打开的门，都成为众生的归路。提灯人化作胸口的一点暖意；那不是新的力量，是你终于接纳的慈悲。\n\n塔外，白马嘶鸣。你扛起金箍棒，走进朝阳。':'你把舍利放回心口，没有再把任何一部分自己舍去。\n\n众生循着灯光离塔，十八重浮屠在晨雾中化为一间小庙。你坐在门前，像那个曾等你的提灯人。\n\n风过时，金箍棒轻轻一响。你知道，西行仍在继续。')}</div><div class="completion-stats"><span>踏遍塔层<b>${s.visited.length} / 18</b></span><span>舍利归位<b>${s.relics.length} / 5</b></span><span>降伏守卫<b>${s.kills}</b></span><span>剩余生命<b>${s.hp}</b></span></div><p class="ending-credit">大圣：舍利魔塔 · 全篇终</p>`,[{label:'留步观塔'},{label:'再走一段因果',className:'primary-button',action:()=>confirmRestart()}],'十八重因果 · 已通关');}
  function confirmRestart(){showModal('重新开始这段因果？','<p>当前自动存档会被新冒险替换。若想保留，先到背包导出存档。</p>',[{label:'留在此处'},{label:'开启新冒险',className:'danger-button',action:begin}],'重新开始');}
  function interact(){const s=engine.state,here=engine.getEntity(s.x,s.y);if(here?.type==='stairs'){engine.traverse(here);return;}if(here?.type==='altar'){altar();return;}if(here?.type==='npc'||here?.type==='monument'){const d=TowerData.dialogues[here.dialogue];story({title:here.name||d.title,text:typeof d==='string'?d:d.text||d.lines.join('\n\n')});return;}const [dx,dy]=TowerRules.directions[s.facing];const x=s.x+dx,y=s.y+dy,e=engine.getEntity(x,y);if(e?.type==='switch'&&e.kind==='plate')engine.useAbility('clone',x,y);else if(engine.getTile(x,y)==='~')engine.useAbility('staff',x,y);else if(engine.getTile(x,y)==='=')engine.useAbility('morph',x,y);else engine.moveTo(x,y);}
  engine.on((type,d)=>{
    if(type==='notice')toast(d);
    else if(type==='story')story(d);
    else if(type==='combat')combat(d);
    else if(type==='door')door(d);
    else if(type==='altar')altar();
    else if(type==='finale')finale();
    else if(type==='defeat')defeat();
    else if(type==='ending')ending(d);
    else if(type==='effect'){renderer.effect(d.type,d.x,d.y,d.text);if(d.type==='pickup')tone(660,.18,'triangle',.045);else if(d.type==='attack'){tone(110,.18,'square',.025);setTimeout(()=>tone(82,.2,'triangle',.025),80);}else if(d.type==='relic'){[261,329,392,523].forEach((v,i)=>setTimeout(()=>tone(v,.8,'sine',.05),i*110));}else if(d.type==='magic')tone(440,.4,'sine',.04);else if(d.type==='door')tone(146,.2,'triangle',.025);}
    if(['change','reset','mode','selection','log'].includes(type))renderHUD();
  });
  $('new-game').onclick=()=>engine.hasSave()?confirmRestart():begin();$('continue-game').disabled=!engine.hasSave();$('continue-game').onclick=continueGame;
  $('btn-save').onclick=()=>engine.save();$('btn-load').onclick=()=>showModal('读取最近存档？','<p>每一步都会自动保存，读取会清空当前会话的回溯记录。</p>',[{label:'取消'},{label:'读取存档',action:continueGame,className:'primary-button'}]);
  $('btn-inventory').onclick=inventory;$('btn-journal').onclick=journal;$('btn-bestiary').onclick=bestiary;$('btn-help').onclick=help;$('btn-restart').onclick=confirmRestart;$('btn-undo').onclick=()=>{stopPath();clearModals();engine.undo();};$('btn-audio').onclick=toggleAudio;$('btn-audio').setAttribute('aria-pressed','false');
  $('modal-close').onclick=()=>closeModal();$('modal-backdrop').onclick=()=>{if(!$('modal-close').disabled)closeModal();};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{stopPath();if(engine.setMode(b.dataset.mode))toast(modeHelp(b.dataset.mode));});
  document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('pointerdown',ev=>{ev.preventDefault();const now=performance.now();if(!modalOpen&&now-lastInput>=105){lastInput=now;stopPath();engine.step(b.dataset.move);}}));
  if($('btn-interact'))$('btn-interact').onclick=interact;
  function walkPath(path){stopPath();if(!path?.length)return;engine.path=path.slice();let lastFloor=engine.state.floor;function next(){if(modalOpen||engine.state.floor!==lastFloor){stopPath();return;}const dir=engine.path.shift();if(!dir)return;const moved=engine.step(dir);if(!moved||modalOpen){stopPath();return;}pathTimer=setTimeout(next,115);}next();}
  $('game-canvas').addEventListener('pointerdown',ev=>{if(!started||modalOpen||engine.state.won||engine.state.defeated)return;stopPath();const now=performance.now();if(engine.mode==='walk'&&now-lastInput<105)return;lastInput=now;const p=renderer.cellAt(ev.clientX,ev.clientY);if(!p||p.x<0||p.x>12||p.y<0||p.y>12)return;engine.select(p.x,p.y);if(engine.mode==='inspect')return;if(engine.mode!=='walk'){engine.useAbility(engine.mode,p.x,p.y);return;}if(p.x===engine.state.x&&p.y===engine.state.y){interact();return;}const path=engine.findPath(p.x,p.y);if(path)walkPath(path);else toast('此处暂无连通道路。点选后可在右侧查看原因。');});
  $('game-canvas').addEventListener('pointermove',ev=>{const p=renderer.cellAt(ev.clientX,ev.clientY);renderer.setHover(p?.x,p?.y);});$('game-canvas').addEventListener('pointerleave',()=>renderer.setHover(-1,-1));
  window.addEventListener('keydown',ev=>{
    if(ev.target.matches('input,textarea,select'))return;
    if(ev.key==='Tab'&&modalOpen){const focusables=[...$('modal-panel').querySelectorAll('button:not(:disabled):not(.hidden),input:not([hidden])')];if(focusables.length){const first=focusables[0],last=focusables.at(-1);if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}return;}
    if(ev.key==='Escape'){ev.preventDefault();stopPath();if(modalOpen&&!$('modal-close').disabled)closeModal();else if(!modalOpen)engine.setMode('walk');return;}
    if(!started||modalOpen)return;
    const k=ev.key.toLowerCase(),dirs={arrowup:'up',w:'up',arrowright:'right',d:'right',arrowdown:'down',s:'down',arrowleft:'left',a:'left'};
    if((ev.ctrlKey||ev.metaKey)&&k==='s'){ev.preventDefault();engine.save();return;}
    if(dirs[k]){ev.preventDefault();if(ev.ctrlKey||ev.metaKey)return;const now=performance.now();if(now-lastInput<105)return;lastInput=now;stopPath();engine.step(dirs[k]);return;}
    if(ev.repeat)return;
    if(['1','2','3','4','5'].includes(k)){ev.preventDefault();stopPath();engine.setMode(['walk','inspect','staff','morph','clone'][Number(k)-1]);}
    const keys={i:inventory,j:journal,b:bestiary,h:help,l:continueGame,z:()=>engine.undo(),e:interact};if(keys[k]){ev.preventDefault();stopPath();keys[k]();}
  });
  window.addEventListener('blur',stopPath);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPath();audioContext?.suspend();}else if(audioEnabled)audioContext?.resume();});
  renderHUD();
})();
