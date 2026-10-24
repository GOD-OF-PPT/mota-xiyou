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
  let started=false,modalOpen=false,modalQueue=[],pathTimer=0,toastTimer=0,lastInput=0,assetsLoading=true;
  const audio=new TowerAudio();
  const preferenceKey='dasheng-relic-tower-preferences-v3';
  let localPreferences={};try{localPreferences=JSON.parse(localStorage.getItem(preferenceKey)||'{}');}catch{}
  const systemMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const settings=()=>Object.assign(engine.state.settings||(engine.state.settings={quickZero:false,showDamage:true}),localPreferences);
  const effectiveMotion=()=>systemMotion.matches?'reduced':(settings().motion||'standard');
  function setPreference(key,value){localPreferences[key]=value;try{localStorage.setItem(preferenceKey,JSON.stringify(localPreferences));}catch{}if(engine.updateSettings)engine.updateSettings({[key]:value});else{settings()[key]=value;engine.save(true);}renderHUD();}
  const externalCount=()=>Array.isArray(engine.state.fragments)?engine.state.fragments.length:(Number(engine.state.externalRelics)||0);
  const currentFloor=()=>TowerData.floors[engine.state.floor];
  const abilityCost=mode=>engine.abilityCost?.(mode)??(mode==='clone'?2:1);
  const treasureList=()=>Array.isArray(TowerData.treasures)?TowerData.treasures:Object.entries(TowerData.treasures||{}).map(([id,t])=>({id,...t}));
  const treasureById=id=>treasureList().find(t=>t.id===id);
  const treasureEffects={iron:'攻击 +6，防御 −3。',lotus:'每次法术反击 −6，攻击 −2。',thorn:'先手守卫少一次先手攻击，防御 −2。',tide:'整场生命损失乘 90% 向下取整；胜利功德乘 75% 向下取整。',ember:'每相第一棒额外造成 18 伤害；整场战后额外损失 8 生命。',mirror:'分身耗 1 灵息，架桥与化蝉耗 2；每次反震 −2，攻击 −2。'};
  function viewStatus(){const v=renderer.getViewport?.()||{x:0,y:0,w:currentFloor().map[0].length,h:currentFloor().map.length,overview:false};if($('viewport-label'))$('viewport-label').textContent=v.overview?`全图 ${currentFloor().map[0].length} × ${currentFloor().map.length} · 点目标看规则`:`近观 ${v.x+1}–${v.x+v.w} / ${v.y+1}–${v.y+v.h} · 方向跟随`;if($('btn-overview')){$('btn-overview').setAttribute('aria-pressed',!!v.overview);$('btn-overview').classList.toggle('active',!!v.overview);$('btn-overview').innerHTML=v.overview?'回到近观 <kbd>M</kbd>':'全图规划 <kbd>M</kbd>';}}
  function focusPlayer(showNotice=true){stopPath();renderer.setOverview?.(false);if(renderer.focusPlayer)renderer.focusPlayer();else{engine.selection=null;renderer.focusCell?.(engine.state.x,engine.state.y);engine.emit('selection',null);}viewStatus();if(showNotice)toast('视野已回到悟空；方向移动时继续跟随。');}
  function toggleOverview(){stopPath();renderer.toggleOverview?.();if(!renderer.getViewport?.().overview)focusPlayer(false);viewStatus();toast(renderer.getViewport?.().overview?'已展开整层。点选敌人、舍利与机关，先看路线再落子。':'已回到悟空身边。方向移动时，视野会跟随行者。');}
  const finite=n=>Number.isFinite(n)?n:'—';
  const coord=e=>`第 ${engine.state.floor+1} 层 · ${e.x+1}, ${e.y+1}`;
  function hintHTML(text){return esc(text).replace(/[（(](\d+)\s*[,，]\s*(\d+)[）)]/g,(match,x,y)=>`<button class="hint-target" data-focus-x="${Number(x)-1}" data-focus-y="${Number(y)-1}" title="在地图上定位">${match}</button>`);}
  function bindFocus(holder){holder?.querySelectorAll('[data-focus-x]').forEach(b=>b.onclick=()=>{const sheet=b.closest('details');if(sheet)sheet.open=false;focusTarget(engine.state.floor,Number(b.dataset.focusX),Number(b.dataset.focusY));});}
  function focusTarget(floor,x,y){
    stopPath();
    if(floor!==engine.state.floor){
      if(!engine.state.visited.includes(floor)){toast('还未抵达此层，请循阶探索。');return;}
      if(!engine.state.relics.includes(2)){toast('第九层觉醒乘云后可直达旧层；目标已记在因果簿。');return;}
      if(engine.state.mana<1){toast('乘云需要 1 点灵息。');return;}
      clearModals();if(!engine.travel(floor))return;
    }else clearModals();
    engine.setMode('inspect');engine.select(x,y);renderer.focusCell?.(x,y);viewStatus();$('game-canvas').focus({preventScroll:true});
    renderer.effect('magic',x,y,'此处');toast(`已定位：第 ${floor+1} 层 (${x+1}, ${y+1})。`);
  }
  function soundSettings(){showModal('声音与演出',inspectSettings(),[{label:'回到塔中',className:'primary-button'}],'六章声景 · 随心调节');bindSettings();}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3300);$('status-message').textContent=text;}
  function stopPath(){clearTimeout(pathTimer);pathTimer=0;engine.path=[];}
  function showModal(title,content,actions=[],eyebrow='无相塔 · 因果簿',closeable=true){
    stopPath();clearTimeout(toastTimer);$('toast').classList.remove('visible');
    if($('game-toolbox'))$('game-toolbox').open=false;
    if(modalOpen){modalQueue.push({title,content,actions,eyebrow,closeable});return;}
    modalOpen=true;audio.setScene(/觉醒|归真/.test(title)?'awakening':'planning');$('modal-title').textContent=title;$('modal-eyebrow').textContent=eyebrow;$('modal-content').innerHTML=content;$('modal-actions').innerHTML='';$('modal-content').querySelectorAll('[data-phase]').forEach(c=>TowerRenderer.icon(c,'boss',Number(c.dataset.phase)));paintPortraits($('modal-content'));paintAssetIcons($('modal-content'));
    $('modal-close').classList.toggle('hidden',!closeable);$('modal-root').classList.remove('hidden');
    actions.forEach(a=>{const b=document.createElement('button');b.textContent=a.label;b.className=a.className||'secondary-button';b.disabled=!!a.disabled;b.addEventListener('click',()=>{if(a.keep){a.action?.();return;}closeModal(false);a.action?.();nextModal();});$('modal-actions').append(b);});
    $('modal-close').disabled=!closeable;
    requestAnimationFrame(()=>{const panel=$('modal-panel');panel.scrollTop=0;const first=$('modal-actions').querySelector('button:not(:disabled)')||$('modal-close');(panel.scrollHeight>panel.clientHeight+1?panel:first).focus({preventScroll:true});});
  }
  function nextModal(){if(!modalOpen&&modalQueue.length){const m=modalQueue.shift();showModal(m.title,m.content,m.actions,m.eyebrow,m.closeable);}}
  function closeModal(next=true){modalOpen=false;audio.setScene('planning');$('modal-root').classList.add('hidden');if(next)nextModal();}
  function clearModals(){modalQueue=[];closeModal(false);}
  const paragraphs=text=>String(text).split('\n\n').map(t=>`<p>${esc(t).replace(/\n/g,'<br>')}</p>`).join('');
  function portraitSVG(kind='lantern'){
    kind=String(kind).replaceAll('-','').toLowerCase();const human=['wukong','bajie','tangseng','whitewutian','qiao','nezha','lantern'].includes(kind)?kind:'lantern';
    const skin=human==='wukong'?'#cda365':human==='bajie'?'#d5a087':'#d7c3a0',robe={wukong:'#b75a3e',bajie:'#554947',tangseng:'#bb985a',whitewutian:'#d6d8bc',qiao:'#5b8a7d',nezha:'#b9514a',lantern:'#6f8263'}[human];
    let detail=human==='wukong'?'<path d="M11 12h25v5H11zm7-7h4v8h-4zm9-3h4v11h-4z" fill="#e3bd65"/><path d="M5 35h38v5H5z" fill="#d36b49"/>':human==='bajie'?'<path d="M9 14H4v12h7zm28 0h7v12h-7zM18 24h13v8H18z" fill="#c18a75"/><path d="M21 26h2v3h-2zm5 0h2v3h-2z" fill="#705547"/>':human==='tangseng'?'<path d="M11 17V9l6 4 7-8 7 8 6-4v8z" fill="#d9ba70"/><path d="M22 7h4v12h-4z" fill="#b96850"/>':human==='whitewutian'?'<path d="M10 14V8h27v7H10zm1 11h5v11h-5zm22 0h5v11h-5z" fill="#f0e6bd"/>':human==='nezha'?'<path d="M8 9h8v8H8zm25 0h8v8h-8z" fill="#333335"/><path d="M19 14h11v3H19z" fill="#d56957"/>':'<path d="M12 11h24v6H12z" fill="#5d5e4d"/>';
    if(human==='lantern')detail+='<path d="M36 27h3v17h-3zM32 31h11v10H32z" fill="#d5ac63"/><path d="M35 33h5v6h-5z" fill="#f5d994"/>';
    return `<canvas class="portrait-asset" width="144" height="144" data-portrait="${human}" aria-hidden="true"></canvas><svg viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true"><path fill="#172a25" d="M0 0h48v48H0z"/><path d="M6 37h9v-7h20v7h7v11H6z" fill="${robe}"/><path d="M12 13h25v15h-5v7H17v-7h-5z" fill="${skin}"/><path d="M17 20h5v3h-5zm11 0h5v3h-5z" fill="#27352d"/><path d="M21 29h9v2h-9z" fill="#9f8164"/>${detail}</svg>`;
  }
  function paintPortraits(holder=document){
    if(!window.TowerAssets?.ready)return;
    holder.querySelectorAll('canvas[data-portrait]').forEach(canvas=>{
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#1b5b5c';ctx.fillRect(0,0,canvas.width,canvas.height);
      const kind=canvas.dataset.portrait,id=kind==='wukong'?(TowerAssets.get('portrait_wukong')?'portrait_wukong':'actor_wukong_down'):'npc_'+kind;
      const entry=TowerAssets.get?.(id);if(!entry)return;
      const sw=entry.sourceW||96,sh=entry.sourceH||96,scale=Math.min((canvas.width-8)/sw,(canvas.height-4)/sh),w=sw*scale,h=sh*scale;
      const anchor=entry.anchor||{x:sw/2,y:sh*.92},x=canvas.width/2-anchor.x*scale,y=canvas.height*.92-anchor.y*scale;
      if(TowerAssets.draw(ctx,id,x,y,w,h,0))canvas.parentElement.classList.add('asset-portrait');
    });
  }
  function paintAssetIcons(holder=document){
    if(!window.TowerAssets?.ready)return;
    holder.querySelectorAll('canvas[data-asset]').forEach(canvas=>{const id=canvas.dataset.asset,e=TowerAssets.get?.(id);if(!e)return;const sw=e.sourceW||64,sh=e.sourceH||64,scale=Math.min(canvas.width/sw,canvas.height/sh),w=sw*scale,h=sh*scale,ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;if(TowerAssets.draw(ctx,id,(canvas.width-w)/2,(canvas.height-h)/2,w,h,0))canvas.parentElement.classList.add('has-asset');});
  }
  function installUIArt(){
    const assets=window.TowerAssets;if(!assets)return;
    const getImage=id=>{const entry=assets.get?.(id);return entry?.image||entry;};
    const backdrop=getImage('ui_backdrop'),motif=getImage('ui_motif');
    if(backdrop?.src){document.documentElement.style.setProperty('--mural-backdrop',`url("${backdrop.src}")`);$('start-illustration').src=backdrop.src;$('start-illustration').hidden=false;document.body.classList.add('assets-ready');}
    if(motif?.src){document.documentElement.style.setProperty('--mural-motif',`url("${motif.src}")`);if(!document.querySelector('.mural-motif')){const el=document.createElement('div');el.className='mural-motif';el.setAttribute('aria-hidden','true');document.body.prepend(el);}}
    const portrait=$('portrait');if(portrait&&!portrait.querySelector('[data-portrait]'))portrait.innerHTML=portraitSVG('wukong');paintPortraits();
    const ids={walk:'actor_wukong_down',inspect:'prop_eye',staff:'prop_staff',morph:'prop_cicada',clone:'prop_clone'};
    document.querySelectorAll('.ability[data-mode] .ability-symbol').forEach(el=>{const mode=el.closest('[data-mode]').dataset.mode,canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;if(assets.draw(ctx,ids[mode],0,0,48,48,0)){el.replaceChildren(canvas);el.classList.add('asset-symbol');}});
    for(const [selector,id]of [['.stat-icon.sword','item_atk'],['.stat-icon.shield','item_def'],['.stat-icon.spirit','item_mana'],['.stat-icon.coin','item_coin']]){
      const el=document.querySelector(selector);if(!el)continue;const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;if(assets.draw(ctx,id,0,0,48,48,0)){el.replaceChildren(canvas);el.classList.add('asset-stat');}
    }
    for(const color of ['yellow','blue','red']){const el=document.querySelector('.key-icon.'+color);if(!el)continue;const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;if(assets.draw(ctx,'item_key_'+color,0,0,48,48,0)){el.replaceChildren(canvas);el.classList.add('asset-key');}}
  }
  async function preloadArt(){
    $('new-game').disabled=true;$('continue-game').disabled=true;
    const update=progress=>{const loaded=Number(progress?.loaded)||0,total=Math.max(1,Number(progress?.total)||1);$('asset-progress').max=total;$('asset-progress').value=loaded;$('asset-count').textContent=`${loaded} / ${total}`;$('asset-status').textContent='正在展开青绿画卷';};
    try{
      if(!window.TowerAssets?.preload)throw new Error('美术资源清单未能载入');
      const result=await TowerAssets.preload(update);update(result);installUIArt();
      const failed=Array.isArray(result?.failed)?result.failed:[];$('asset-loading').classList.add(failed.length?'failed':'complete');$('asset-status').textContent=failed.length?`${failed.length} 份画卷未载入；可使用基础图形继续`:'青绿画卷已展开 · 离线亦可游玩';$('asset-count').textContent=failed.length?'部分载入':'已就绪';
    }catch(error){$('asset-loading').classList.add('failed');$('asset-status').textContent='美术画卷未能载入；可使用基础图形继续';$('asset-count').textContent='基础图形';}
    finally{assetsLoading=false;$('new-game').disabled=false;$('continue-game').disabled=!engine.hasSave();renderHUD();}
  }
  function relicRing(awakened=engine.state.selfAwakened,animate=false){const count=externalCount();return `<div class="relic-orbit ${awakened?'self-awakened':''} ${animate?'awakening-sequence':''}" role="img" aria-label="外舍利 ${count}/16，${awakened?'中心无骨舍利已觉醒':'中心空位尚未觉醒'}"><svg viewBox="0 0 220 220" aria-hidden="true"><circle class="orbit-trace" cx="110" cy="110" r="81"/><circle class="orbit-inner" cx="110" cy="110" r="52"/>${Array.from({length:16},(_,i)=>{const a=(i/16)*Math.PI*2-Math.PI/2,x=110+Math.cos(a)*81,y=110+Math.sin(a)*81;return `<g class="orbit-point ${(Array.isArray(engine.state.fragments)?engine.state.fragments.includes(i):i<count)?'lit':''}" style="--point:${i}"><path d="M${x} ${y-6}l6 6-6 6-6-6z"/><path d="M${x} ${y-2}l2 2-2 2-2-2z" class="point-core"/></g>`;}).join('')}<path class="orbit-lotus" d="M110 151c-29 0-44-26-44-26 25-1 34 5 44 14 10-9 19-15 44-14 0 0-15 26-44 26zm0-5c-17-10-24-33 0-57 24 24 17 47 0 57z"/>${!awakened?'<text class="orbit-center" x="110" y="113" text-anchor="middle">空</text>':''}</svg>${awakened?'<canvas class="orbit-self orbit-self-asset" width="192" height="192" data-asset="actor_wukong_down" aria-hidden="true"></canvas><span class="orbit-self-fallback">无骨</span>':''}<span class="orbit-caption">${awakened?'第十七 · 无骨归真':'第十七位 · 尚待照见'}</span></div>`;}
  function skipPresentation(){renderer.skipEffects?.();audio.skip();document.querySelectorAll('.awakening-sequence').forEach(el=>el.classList.add('sequence-complete'));$('status-message').textContent='光影敛去，前路仍在。';}
  function bossMemorial(){return `<div class="boss-memorial" aria-label="金甲、执念与心火三相已经消散">${['金甲已卸','执念已解','心火已息'].map((name,i)=>`<figure style="--phase:${i}"><canvas width="96" height="112" data-asset="enemy_boss_${i}" aria-hidden="true"></canvas><figcaption>${name}</figcaption></figure>`).join('')}</div>`;}
  function story(d){const awakening=/觉醒|解印/.test(d.title),portrait=d.portrait||(/八戒/.test(d.text)?'bajie':/白衣/.test(d.title)?'whitewutian':'lantern');showModal(d.title,`${awakening?relicRing(false,true):''}${/黑莲化影.*消散/.test(d.title)?bossMemorial():''}<div class="dialogue-layout"><div class="dialogue-portrait">${portraitSVG(portrait)}</div><div class="story-quote">${paragraphs(d.text)}</div></div>`,[...(awakening?[{label:'跳过演出',keep:true,action:skipPresentation}]:[]),{label:'继续前行',className:'primary-button'}],'残卷 · '+TowerData.floors[engine.state.floor].name);}
  function showGame(){started=true;$('start-screen').classList.add('hidden');$('game-shell').classList.remove('hidden');renderHUD();}
  function begin(){if(assetsLoading)return;clearModals();showGame();engine.newGame();focusPlayer(false);}
  function continueGame(){if(assetsLoading)return;clearModals();if(engine.load()){showGame();focusPlayer(false);if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();}}
  function statsHTML(enemy,preview){return `<div class="enemy-stat-grid"><span>生命<b>${enemy.hp}</b></span><span>攻击<b>${enemy.atk}</b></span><span>防御<b>${enemy.def}</b></span><span>功德<b>${preview?.goldReward??enemy.gold}</b></span></div>`;}
  function attackBreakpoint(enemy,p){
    if(p.nextAttack)return p.nextAttack;
    if(enemy.trait==='boss'||!p.possible||p.rounds<=1||p.damage===0)return null;
    const ceiling=Math.max(engine.state.atk+1,enemy.def+enemy.hp);
    for(let atk=engine.state.atk+1;atk<=ceiling;atk++){const q=TowerRules.battle({...engine.state,atk},enemy);if(q.possible&&q.damage<p.damage)return {atk,delta:atk-engine.state.atk,saved:p.damage-q.damage};}
    return null;
  }
  function battleHTML(enemy,p,expanded=false){
    const next=attackBreakpoint(enemy,p),phase=p.phases?.length?`<div class="phase-table">${p.phases.map((q,i)=>`<div class="phase-row"><b><canvas class="phase-icon" data-phase="${i}" aria-hidden="true"></canvas>${i+1} · ${esc(q.name)}</b><span>生命 ${q.hp} / 攻 ${q.atk} / 防 ${q.def}</span><small>${q.possible===false?'无法破防':`${finite(q.rounds)} 棒 · 敌出手 ${finite(q.enemyHits)} 次 · 损失 ${finite(q.damage)}`}</small></div>`).join('')}</div>`:'';
    return `${statsHTML(enemy,p)}<div class="forecast ${p.possible&&p.survive?'safe':'danger'}"><span>预计生命损失${p.phases?.length?' · 三相合计':''}</span><strong class="damage-number">${p.possible?p.damage:'无法破防'}</strong><small>${p.possible?(p.survive?`战后剩余 ${engine.state.hp-p.damage} 生命`:'本次战斗将会力竭'):'提升攻击，或寻找其他路线'}</small></div><div class="trait-note context-summary ${enemy.trait==='normal'?'normal-rule':'special-rule'}"><b>${traitNames[enemy.trait]||'普通'} · </b>${esc(enemy.desc||'行者先攻，击杀一击不会受到还击。')}</div>${p.gearLines?.length?`<div class="gear-forecast"><b>法器实效 · 攻 ${p.effectiveAtk} / 防 ${p.effectiveDef}</b>${p.gearLines.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${next?`<div class="breakpoint-note">下一基础攻击临界：<b>${next.atk}</b>（再加 ${next.delta}）可少损 <b>${next.saved}</b> 生命。</div>`:''}${expanded?`${phase}<details class="formula" ${!p.phases?'open':''}><summary>展开真实计算过程</summary>${(p.lines||[]).map(t=>`<div>${esc(t)}</div>`).join('')}<div><b>总损失 = ${p.possible?p.damage:'无法破防'}</b></div></details>`:''}`;
  }
  function combat(e){
    if(!engine.isCurrent(e))return;
    const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy);
    if(enemy.trait==='boss'&&engine.bossOptions){bossCombat(e);return;}
    const can=engine.distance(e)===1;
    const bossLock=enemy.trait==='boss'&&engine.state.relics.length<5;
    showModal(enemy.name,`${battleHTML(enemy,p,true)}${bossLock?'<p class="danger-text">无相之心须五重心印齐聚才能挑战。</p>':''}<p class="muted">${esc(enemy.lore||'守卫不会重生。确认后一次结算整场战斗。')}</p>`,[
      {label:'暂避锋芒'},
      {label:p.survive?`迎战 · 损失 ${p.damage} 生命`:'迎战 · 将会力竭',className:p.survive?'primary-button':'danger-button',disabled:!p.possible||!can||bossLock,action:()=>engine.fight(e)}
    ],`火眼金睛 · ${traitNames[enemy.trait]||'普通守卫'}`);
  }
  function requestCombat(e){const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy);if(settings().quickZero&&enemy.trait!=='boss'&&p.possible&&p.damage===0&&engine.distance(e)===1)engine.fight(e);else combat(e);}
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
    const rescueNames={bajie:'八戒',tangseng:'唐僧映身',nezha:'哪吒映身',qiao:'乔灵儿映身',waterSoul:'灯魂'};
    const result=[];for(const [key,value]of Object.entries(values)){if(key==='key'&&value)result.push(`${colorNames[value.color]||value.color}钥匙 × ${value.amount||1}`);else if(key==='keys'&&value){for(const [c,n]of Object.entries(value))if(n)result.push(`${colorNames[c]||c}钥匙 × ${n}`);}else if(key==='rescue'&&Array.isArray(value))result.push(`救回 ${value.map(id=>rescueNames[id]||'被困者').join('、')}`);else if(key==='quests'&&value){if(value.sevenRescue)result.push('开启十五层援手侧门');else if(value.sevenWounds)result.push('完成七伤抉择');else if(value.bajie)result.push('开启弱水援手');else if(value.bellPassage)result.push('永久开启定海铁宝龛北门');else if(value.ferryPassage)result.push('永久开启西缘渡灯栈道');else if(value.emberPassage)result.push('永久开启心炉烬北径');}else if(names[key]&&value)result.push(`${names[key]} ${value>0?'+':''}${value}`);}
    return result.join(' · ')||'无';
  }
  function opportunityText(group,option){
    const costs={bellVow:{offering:'宝龛北门保持关闭；仍可正面战精英取宝。',passage:'放弃这一份防御 +2；避战也不获得精英功德。'},ferryVow:{offering:'渡灯栈道保持关闭；仍可选择低水或高水渡口。',passage:'放弃这一份生命 +90；另消耗一把黄钥。'},emberVow:{offering:'心炉烬北径保持关闭；仍可正面战精英取宝。',passage:'放弃这一份防御 +4；异宝仍须在莲灯佩戴。'}};
    return option.opportunityCost||costs[group]?.[option.id]||'';
  }
  function choice(e){
    const spec=TowerData.choices?.[e.choice];if(!spec||!engine.choicePreview)return;
    if(e.type==='cache'){const picked=engine.state.choices?.[e.choice];showModal(spec.title+' · 共鸣藏室',`<p>${picked?'所选路线的奖励在抵达此处后领取。':'先到南廊的对应契台选定路线，再抵达北侧领取奖励。'}</p><div class="choice-options">${spec.options.map(o=>`<article class="choice-option ${picked===o.id?'selected':''}"><h3>${esc(o.label)}</h3><div class="choice-cost">即付：${esc(resourceText(o.cost))}</div>${opportunityText(e.choice,o)?`<div class="choice-opportunity"><b>取舍</b> · ${esc(opportunityText(e.choice,o))}</div>`:''}<div class="choice-reward">奖励：${esc(resourceText(o.reward))}</div><small>${picked===o.id?'本次所选':picked?'已封存':'尚未选契'}</small></article>`).join('')}</div>`,[{label:'合上契约'}],'路线奖励 · 每局只取一份');return;}
    const options=spec.options.map(o=>({o,p:engine.choicePreview(e,o.id)}));
    showModal(spec.title,`<p>${esc(spec.description)}</p>${engine.state.quests.locksLegacy&&e.choice==='locks'?'<div class="resource-choice">旧档灵晶的成长已承续：可以继续选路，北匣不再重复发放奖励。</div>':''}${engine.state.quests.silkLegacy&&e.choice==='silk'?'<div class="resource-choice">旧档朱砂修为已承续，双经卷沿用攻击份额。</div>':''}<div class="choice-options">${options.map(({o,p})=>`<article class="choice-option ${p.chosen===o.id||p.chosen?.id===o.id?'selected':''}"><h3>${esc(o.label)}</h3><p>${esc(o.description)}</p><div class="choice-cost">即付：${esc(resourceText(o.cost))}</div>${opportunityText(e.choice,o)?`<div class="choice-opportunity"><b>取舍</b> · ${esc(opportunityText(e.choice,o))}</div>`:''}<div class="choice-reward">${spec.grant==='cache'?'藏室奖励':'获得'}：${p.rewardAlreadyClaimed?'旧档成长已领取':esc(resourceText(p.reward))}</div>${p.reason?`<small>${esc(p.reason)}</small>`:''}${!p.chosen?`<button class="context-button" data-choice="${esc(o.id)}" ${!p.possible||(e.option&&e.option!==o.id)?'disabled':''}>${e.option&&e.option!==o.id?'前往对应契台选择':`确认 · ${esc(o.label)}`}</button>`:`<b>${p.chosen===o.id||p.chosen?.id===o.id?'已选定此路':'本次已选择另一条路'}</b>`}</article>`).join('')}</div><p class="planning-note">同组只能选一项，其他选项会锁定。${engine.state.quests.locksLegacy&&e.choice==='locks'?'旧档成长已承续，本次只决定道路。':spec.grant==='cache'?'奖励在契约藏室领取，须自行抵达。':'确认后立即结算。'}按 Z 可回溯此决策。</p>`,[{label:'先观察其他路线'}],'路线契约 · 代价公开');
    $('modal-content').querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{clearModals();engine.choose(e,b.dataset.choice);});
  }
  function cloneLimit(d){
    const active=d.active||engine.cloneStatus?.().active||[];
    showModal('镜台已满 · 调度分身',`<p>此层仅能同时驻守 <b>${engine.cloneStatus?.().limit||active.length}</b> 个阵眼。回收一个分身后再安排新阵位。</p><p class="planning-note">回收免费，关联机关将立即重新计算。重新派驻仍按当前法器计算灵息；已走通的普通道路不会被重置。</p><div class="recall-list">${active.map(e=>`<button class="secondary-button" data-recall="${esc(e.id)}">回收 ${esc(e.label||'镜台分身')} · (${e.x+1}, ${e.y+1})</button>`).join('')}</div>`,[{label:'保持现有阵位'}],'神通调度 · 可逆选择');
    $('modal-content').querySelectorAll('[data-recall]').forEach(b=>b.onclick=()=>{clearModals();if(engine.recallClone(b.dataset.recall)&&d.target)cast('clone',d.target.x,d.target.y);});
  }
  function cast(mode,x,y){renderer.skipEffects?.();const ok=engine.useAbility(mode,x,y);if(ok){engine.setMode('walk');engine.select(x,y);}return ok;}
  function inspectSettings(){
    const prefs=settings();return `<h3>行者偏好</h3><label class="setting-row"><input type="checkbox" id="setting-zero" ${prefs.quickZero?'checked':''}><span><b>零损守卫直接结算</b><small>只对普通零损战斗生效；首领和有损战斗始终确认。</small></span></label><label class="setting-row"><input type="checkbox" id="setting-damage" ${prefs.showDamage?'checked':''}><span><b>地图常显战损</b><small>直接在守卫旁显示当前损失，火眼金睛仍可查看公式。</small></span></label><label class="setting-row setting-select"><span><b>动作与演出</b><small>${systemMotion.matches?'系统已要求减弱动态，当前始终使用减弱模式。':'标准保留完整动作；简洁缩短过程；减弱使用静态状态反馈。'}跳过演出不会改变结算。</small></span><select id="setting-motion" aria-label="动作与演出"><option value="standard" ${prefs.motion==='standard'?'selected':''}>标准</option><option value="simple" ${prefs.motion==='simple'?'selected':''}>简洁</option><option value="reduced" ${prefs.motion==='reduced'?'selected':''}>减弱动态</option></select></label><label class="setting-row"><input type="checkbox" id="setting-shake" ${prefs.screenShake?'checked':''} ${effectiveMotion()!=='standard'?'disabled':''}><span><b>受击震动</b><small>默认关闭，仅标准动作模式生效。</small></span></label><label class="setting-row"><input type="checkbox" id="setting-music" ${prefs.music?'checked':''}><span><b>章节音乐</b><small>六章独立旋律，静思时留白，行动后加入节奏。</small></span></label><label class="setting-row"><input type="checkbox" id="setting-sfx" ${prefs.sfx?'checked':''}><span><b>动作与机关音效</b><small>金箍、青蝉、分身、钥匙材质各有声音；与音乐独立。</small></span></label><p class="muted">声音首次开启需浏览器授权播放；设置保存在当前浏览器。</p>`;
  }
  function bindSettings(){for(const [id,key]of [['setting-zero','quickZero'],['setting-damage','showDamage'],['setting-shake','screenShake'],['setting-music','music'],['setting-sfx','sfx']])$(id)?.addEventListener('change',ev=>{if(key==='music'||key==='sfx')audio.unlock();setPreference(key,ev.target.checked);});$('setting-motion')?.addEventListener('change',ev=>{setPreference('motion',ev.target.value);if($('setting-shake'))$('setting-shake').disabled=effectiveMotion()!=='standard';if(effectiveMotion()==='reduced')renderer.skipEffects?.();});}
  function atLantern(){return currentFloor().entities.some(e=>e.type==='altar'&&e.x===engine.state.x&&e.y===engine.state.y);}
  function treasureHTML(){
    const s=engine.state,owned=s.treasures||[],equipped=s.equipped||[],near=atLantern();
    return `<section class="treasure-section"><div class="treasure-heading"><h3>六器行装</h3><span>佩戴 ${equipped.length} / 2</span></div><p class="muted">法器各有代价，最多佩戴两件；必须站在莲灯上才能装卸。${near?'此刻可调整行装。':'查看敌情后，再决定以何种行装出发。'}</p><div class="treasure-grid">${treasureList().map((t,i)=>{const has=owned.includes(t.id),on=equipped.includes(t.id),f=TowerData.floors.findIndex(f=>f.entities.some(e=>e.type==='treasure'&&e.treasure===t.id));return `<article class="treasure-card ${has?'owned':''} ${on?'equipped':''}"><canvas class="treasure-stamp" data-treasure-icon="${esc(t.id)}" aria-hidden="true"></canvas><div><h4>${esc(t.name||t.id)}${on?'<small>已佩戴</small>':''}</h4><small>${has?'已寻回':`第 ${f>=0?f+1:'?'} 层 · 支翼精英守藏`}</small><p>${esc(treasureEffects[t.id]||t.description||'')}</p>${has?`<button class="secondary-button" data-equip="${esc(t.id)}" ${!near||(!on&&equipped.length>=2)?'disabled':''}>${on?'卸下法器':'佩戴法器'}</button>`:'<span class="unfound-treasure">尚未寻回</span>'}</div></article>`;}).join('')}</div>${!near&&owned.length?'<button class="secondary-button" data-find-lantern>在地图定位莲灯 ↗</button>':''}</section>`;
  }
  function bindTreasures(reopen){
    $('modal-content').querySelectorAll('[data-treasure-icon]').forEach(c=>TowerRenderer.icon(c,'treasure',c.dataset.treasureIcon));
    $('modal-content').querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{if(engine.equipTreasure?.(b.dataset.equip)){clearModals();reopen();}});
    $('modal-content').querySelector('[data-find-lantern]')?.addEventListener('click',()=>{const e=currentFloor().entities.find(e=>e.type==='altar');if(e)focusTarget(engine.state.floor,e.x,e.y);});
  }
  function altar(){
    const s=engine.state;
    showModal('莲灯 · 修心',`<p>莲灯可免费补满灵息，<b>不恢复生命</b>。守卫与宝物均不刷新。</p><div class="resource-choice">功德金 ${s.coins} · 灵息 ${s.mana} / ${s.maxMana}</div><div class="shop-list">${['atk','def','heal'].map(k=>`<div><span>${k==='atk'?'磨砺金箍 · 攻击 +3':k==='def'?'淬炼护身 · 防御 +3':'灯前疗伤 · 生命 +120'}</span><b>${engine.shopCost(k)} 金</b></div>`).join('')}</div><p class="muted">每次同类供奉会涨价：属性 +12 金，疗伤 +6 金。凝息珠也可供奉，或保留给最后的临战准备。</p>${treasureHTML()}`,[
      {label:'离开莲灯'},
      {label:'奉珠 · 换 8 金',disabled:s.orbs<1,action:()=>{engine.offerOrb('coins');altar();}},
      {label:'奉珠 · 回 50 血',disabled:s.orbs<1,action:()=>{engine.offerOrb('heal');altar();}},
      {label:'补满灵息',disabled:s.mana===s.maxMana,action:()=>{engine.meditate();altar();}},
      ...['atk','def','heal'].map(k=>({label:k==='atk'?'修攻击':k==='def'?'修防御':'疗伤',disabled:s.coins<engine.shopCost(k),className:'primary-button',action:()=>{engine.shop(k);altar();}}))
    ] ,'功德有限 · 取舍有因');
    bindTreasures(altar);
  }
  function renderHUD(){
    const s=engine.state,f=TowerData.floors[s.floor];
    viewStatus();
    const prefs=settings();document.body.dataset.motion=effectiveMotion();document.body.dataset.chapter=String(Math.floor(s.floor/3));audio.configure(prefs,Math.floor(s.floor/3));
    const effective=engine.effectiveStats?.()||s;
    $('hp-value').textContent=s.hp;$('atk-value').innerHTML=effective.atk===s.atk?s.atk:`${effective.atk}<small>基 ${s.atk}</small>`;$('def-value').innerHTML=effective.def===s.def?s.def:`${effective.def}<small>基 ${s.def}</small>`;$('mana-value').textContent=s.mana+' / '+s.maxMana;$('coins-value').textContent=s.coins;
    for(const c of ['yellow','blue','red'])$('key-'+c).textContent=s.keys[c];
    $('floor-number').textContent=String(s.floor+1).padStart(2,'0');$('floor-name').textContent=f.name;$('floor-subtitle').textContent=f.subtitle;
    $('floor-objective').textContent=s.floor===4&&s.quests.locksLegacy?'旧档灵晶修为已承续。选契开通道路，前往北端塔阶；共鸣匣不再重复发奖。':f.objective;
    if($('floor-depth')){const d=f.depth;$('floor-depth').innerHTML=d?`<section class="depth-planning"><span>此层一问</span><h3>${esc(d.question)}</h3><p class="depth-tradeoff">${esc(d.opportunityCost)}</p><details><summary>一念提醒</summary><p>${esc(d.insight)}</p></details><div class="depth-targets">${(d.objectives||[]).map(t=>`<button data-focus-x="${t.x}" data-focus-y="${t.y}" title="定位 ${esc(t.text)}">${esc(t.text)} <span>↗</span></button>`).join('')}</div></section>`:'';bindFocus($('floor-depth'));}
    $('location-label').textContent=`第 ${s.floor+1} / ${TowerData.floors.length} 层 · ${['辨真','合塔','弱水','炼炉','善念','归真'][Math.floor(s.floor/3)]}篇`;
    $('floor-progress').textContent=`心印 ${s.relics.length}/5 · 外舍利 ${externalCount()}/16`;
    if($('external-count'))$('external-count').textContent=externalCount()+' / 16';
    $('relic-count-label').textContent=s.relics.length+' / 5';
    if($('status-turn'))$('status-turn').textContent=`${s.turn} 步因果`;
    $('mode-label').textContent=modeNames[engine.mode];
    $('relic-slots').innerHTML=TowerData.relics.map((r,i)=>`<span class="relic-slot ${s.relics.includes(i)?'awakened':''}" title="${esc(r.name+' · '+(abilityNames[r.ability]||r.ability))}"><span>${s.relics.includes(i)?'✦':'◇'}</span><small>${esc(r.name.replace('舍利','').replace('心印',''))}</small></span>`).join('');
    document.querySelectorAll('[data-mode]').forEach(b=>{const required={staff:0,morph:1,clone:2}[b.dataset.mode],locked=required!==undefined&&!s.relics.includes(required);b.classList.toggle('active',engine.mode===b.dataset.mode);b.classList.toggle('locked',locked);b.setAttribute('aria-pressed',engine.mode===b.dataset.mode);if(b.querySelector('small'))b.querySelector('small').textContent=locked?'第 '+[3,6,9][required]+' 层觉醒':({walk:'自在探索',inspect:'洞察 · 无消耗',staff:`${abilityCost('staff')} 灵息 · 相邻断口`,morph:`${abilityCost('morph')} 灵息 · 相邻铁栅`,clone:`${abilityCost('clone')} 灵息 · 四格阵眼`})[b.dataset.mode];b.title=locked?'在第 '+[3,6,9][required]+' 层解开对应心印后觉醒':modeHelp(b.dataset.mode);});
    $('btn-undo').disabled=!engine.history.length;
    if($('btn-redo'))$('btn-redo').disabled=!engine.redoHistory?.length;
    const cs=engine.cloneStatus?.();if($('clone-status'))$('clone-status').textContent=s.relics.includes(2)?`分身 ${cs?.active?.length||0}${Number.isFinite(cs?.limit)?' / '+cs.limit:' 驻守'}${Number.isFinite(cs?.limit)?' · 可回收':''}`:'五印渐解 · 神通觉醒';
    const availableRevisits=(TowerData.revisits||[]).filter(r=>s.relics.includes(r.relic)&&!revisitDone(r));if($('revisit-count')){$('revisit-count').textContent=availableRevisits.length?String(availableRevisits.length):'';$('revisit-count').classList.toggle('hidden',!availableRevisits.length);}
    $('event-log').innerHTML=s.log.slice(0,5).map(l=>`<div class="log-entry ${esc(l.kind)}"><span class="log-dot"></span><p>${esc(l.text)}</p></div>`).join('');
    updateContext();
  }
  function modeHelp(mode){return {walk:'方向键 / WASD 移动，视野跟随。M 展开全图规划；机关与楼梯按 E 交互',inspect:'点选任何目标，免费查看真实规则和损失',staff:`相邻断口，耗 ${abilityCost('staff')} 灵息，永久架桥；成功后回到行走`,morph:`相邻铁栅，耗 ${abilityCost('morph')} 灵息，从内侧永久解锁；成功后回到行走`,clone:`点选四格内青色阵眼，耗 ${abilityCost('clone')} 灵息，可隔墙；满员时可免费回收`}[mode];}
  function requirementsHTML(e){const r=engine.requirements?.(e),names={sevenRescue:'七伤同行：亲自护送三名映身',sevenWounds:'完成七伤抉择',weakwater:'转动弱水水轮',bajie:'解救八戒',bellPassage:'残钟台舍弃防御 +2，补钟开门',ferryPassage:'渡灯台舍弃90生命并供一黄钥，开西缘栈道',emberPassage:'无生髓台舍弃防御 +4，燃髓开径'};return r&&!r.met?`<div class="requirement-note">尚需：${r.missing.map(v=>esc(names[v]||v)).join(' · ')}</div>`:'';}
  function updateContext(){
    const s=engine.state,sel=engine.selection;
    let title='观塔 · 再落子',html=`<div class="context-kicker">${esc(modeNames[engine.mode])}</div><p>${esc(modeHelp(engine.mode))}</p><div class="context-divider"></div><p class="muted">点守卫先看战损；点机关先看规则。没有计时，也没有刷怪。</p><div class="context-callout">${hintHTML(TowerData.floors[s.floor].hints?.[0]||'先看清每一条路，再决定付出什么。')}</div>`;
    if(sel){const e=engine.getEntity(sel.x,sel.y),tile=engine.getTile(sel.x,sel.y);
      if(e?.type==='enemy'){const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy);title=enemy.name;html=`<div class="context-kicker">守卫 · ${traitNames[enemy.trait]} · ${coord(e)}</div>${battleHTML(enemy,p)}<div class="context-actions"><button class="context-button" data-context="fight">${engine.distance(e)===1?'查看并迎战':'走近 · 再确认迎战'}</button>${engine.distance(e)!==1?'<button class="secondary-button" data-context="formula">详细计算</button>':''}</div>`;}
      else if(e?.type==='door'){title=colorNames[e.color]+'色封门';html=`<p class="context-summary">消耗 1 把${colorNames[e.color]}钥匙 · 现有 ${s.keys[e.color]} 把</p><div class="context-callout">${esc(e.label||'开启后永久消失。')}</div><button class="context-button" data-context="door">${engine.distance(e)>1?'走近 · 再确认开门':'开门决策'}</button>`;}
      else if(tile==='~'||tile==='='){const m=tile==='~'?'staff':'morph';title=tile==='~'?'断口 · 金箍为桥':'铁栅 · 青蝉可渡';html=`<p>${esc(modeHelp(m))}</p><p class="muted">道路贯通后无需再次消耗灵息。</p><button class="context-button" data-context="${m}" ${engine.distance(sel)!==1?'disabled':''}>${modeNames[m]} · ${abilityCost(m)} 灵息</button>`;}
      else if(e?.type==='switch'){title=e.label||(e.kind==='plate'?'分身阵眼':'两仪扳杆');html=`<p class="context-summary">${s.switches[e.id]?'◆ 灵脉已接通':'◇ 灵脉尚未接通'} · 坐标 ${e.x+1}, ${e.y+1}</p><div class="context-callout">${e.kind==='plate'?'四格内可隔墙施法，费用以技能栏为准；分身可以免费回收，机关同步复位。':'经过不会自动切换。主动交互才能扳动；同组机关全部接通才会开门。'}</div>${e.kind==='plate'?`<button class="context-button" data-context="${s.switches[e.id]?'recall':'clone'}" ${!s.switches[e.id]&&engine.distance(e)>4?'disabled':''}>${s.switches[e.id]?'回收分身 · 免费':`分身落阵 · ${abilityCost('clone')} 灵息`}</button>`:`<button class="context-button" data-context="switch">${engine.distance(e)>1?'走近扳杆':s.switches[e.id]?'复位扳杆':'接通扳杆'}</button>`}`;}
      else if(e?.type==='gate'||e?.type==='seal'){title=e.label||'灵脉机关';const switches=TowerData.floors[s.floor].entities.filter(a=>a.type==='switch'&&(e.controls?e.controls.includes(a.controlId||a.id):a.group===e.group));html=`<div class="context-callout">${engine.isGateOpen(e)?'已开启，可以通行。':e.type==='seal'?`需要 ${e.requires} 重心印，现有 ${s.relics.length} 重。`:'关联阵眼接通后开启；取卷后的经门会保留退路。'}</div>${requirementsHTML(e)}${e.type==='gate'?switches.map(a=>`<p>${s.switches[a.id]?'◆':'◇'} ${esc(a.label||'阵眼')} <small>坐标 ${a.x+1},${a.y+1}</small></p>`).join(''):''}`;}
      else if(e?.type==='relic'){const r=TowerData.relics[e.relic];title=r.name;html=`<div class="context-kicker">心印 · ${esc(abilityNames[r.ability]||r.ability)}</div><p>${esc(r.description)}</p><div class="context-callout">${Array.isArray(e.requiresFragments)?'需要本印舍利：'+e.requiresFragments.map(i=>'第 '+(i+1)+' 枚').join('、'):'需要对应舍利'}；当前已寻回 ${externalCount()} / 16 枚。解印恢复 100 生命与全部灵息；神通将打开新的支路。</div>${requirementsHTML(e)}<button class="context-button" data-context="relic">${engine.distance(e)>1?'走近心印':'尝试解印'}</button>`;}
      else if(e?.type==='fragment'){title=e.label||`外舍利 · 第 ${Number(e.fragment)+1} 枚`;html=`<div class="context-kicker">散落舍利 · ${coord(e)}</div><p>十六枚外舍利中的一枚。须亲自抵达此格寻回；它会推进心印的觉醒条件，不额外增加攻击与防御。</p>${e.description?`<p class="context-callout">${esc(e.description)}</p>`:""}${requirementsHTML(e)}<button class="context-button" data-context="fragment">${engine.distance(e)>0?'前往寻回舍利':'寻回舍利'}</button>`;}
      else if(e?.type==='treasure'){const t=treasureById(e.treasure);title=e.label||t?.name||'失落法器';html=`<div class="context-kicker">六器之一 · ${coord(e)}</div><p>${esc(treasureEffects[e.treasure]||t?.description||'')}</p><div class="context-callout">亲自抵达此格寻回。须在莲灯上佩戴，最多两件；取得法器不会自动改变当前行装。</div>${requirementsHTML(e)}<button class="context-button" data-context="treasure">${engine.distance(e)>0?'前往寻回法器':'寻回法器'}</button>`;}
      else if(e?.type==='item'||e?.type==='chest'){const it=TowerData.items[e.item];title=e.label||it.name;html=`<p>${esc(it.description||it.desc||engine.itemEffect(it))}</p>${e.type==='chest'?`<div class="context-callout">${e.requires>s.relics.length?`需要 ${e.requires} 重心印共鸣。记住这里，稍后回来。`:'宝匣已回应心印，走上此格领取。'}</div>${requirementsHTML(e)}`:''}`;}
      else if(e?.type==='stairs'){title='塔阶 · '+TowerData.floors[e.to].name;const need=engine.stairRequirement(e),req=engine.requirements?.(e);html=`<p class="context-summary">前往第 ${e.to+1} 层 · 经过阶梯不会自动换层。</p><p class="muted">旧层的守卫、宝物与机关保持现状。</p>${need>s.relics.length?`<div class="context-callout">需要 ${need} 重心印，现有 ${s.relics.length} 重。</div>`:''}${requirementsHTML(e)}<button class="context-button" data-context="stairs" ${need>s.relics.length||req&&!req.met?'disabled':''}>${engine.distance(e)>1?'走近阶梯':`确认前往第 ${e.to+1} 层`}</button>`;}
      else if(e?.type==='altar'){title=e.name||'莲灯';html='<p class="context-summary">走上补满灵息；主动交互修心，生命不会自动恢复。</p><button class="context-button" data-context="altar">'+(engine.distance(e)===0?'灯前修心':'走到莲灯 · 修心')+'</button>';}
      else if(e?.type==='choice'){const spec=TowerData.choices?.[e.choice];title=e.label||spec?.title||'路线契约';html=`<p class="context-summary">${esc(spec?.description||'代价与奖励均会在确认前展示。')}</p><button class="context-button" data-context="choice">${engine.distance(e)>1?'走近 · 比较选择':'比较代价与奖励'}</button>`;}
      else if(e?.type==='cache'){const spec=TowerData.choices?.[e.choice];title=e.label||'契约藏室';html=`<p class="context-summary">${esc(spec?.description||'奖励由已选契约决定；每份契约只可领取一次。')}</p><button class="context-button" data-context="cache">${s.choices?.[e.choice]?'前往领取所选奖励':'查看契约奖励'}</button>`;}
      else if(e?.type==='npc'||e?.type==='monument'){title=e.name||'塔中残卷';const d=TowerData.dialogues[e.dialogue];html=`<p class="context-summary">${esc((typeof d==='string'?d:(d?.text||d?.lines?.join('\n')||'')).split('\n')[0])}</p><button class="context-button" data-context="story">${engine.distance(e)>1?'走近 · 阅读全文':'阅读全文'}</button>`;}
      else if(e?.type==='illusion'){title=e.label||'伪佛幻壁';const revealed=!!s.revealed?.[e.id];html=`<p class="context-summary">${revealed?'火眼已照破此处幻象，真实通路保持开放。':'黑莲幻象覆盖了真正的通路。火眼金睛可免费辨真，不消耗灵息。'}</p>${!revealed?'<button class="context-button" data-context="reveal">火眼辨真 · 免费</button>':''}`;}
      else if(e?.type==='resonator'){title=e.label||'双塔共鸣印';const active=!!s.switches[e.id];html=`<p class="context-summary">${active?'◆ 此塔已校正，隔层共鸣保持。':'◇ 此塔尚未校正。两座塔的共鸣印都归位后，开启合塔心印与回廊。'}</p>${requirementsHTML(e)}${!active?`<button class="context-button" data-context="resonator">${engine.distance(e)>1?'走近 · ':'校正此塔 · '}免费</button>`:''}`;}
      else if(e?.type==='rescue'){title=e.name||e.label||'被困的同道';const rescued=!!s.quests?.[e.quest];html=`<p class="context-summary">${rescued?'◆ 同道已获救，正在稳定水脉与安全归路。':esc(e.description||'解救同道后，弱水渡口与水轮获得援手。此救援无资源消耗。')}</p>${requirementsHTML(e)}${!rescued?`<button class="context-button" data-context="rescue">${engine.distance(e)>1?'走近 · ':''}救出同道</button>`:''}`;}
      else if(e?.type==='tide'){title=e.label||'弱水水轮';const low=(s.tides?.[e.group||'weakwater']||'low')==='low',req=engine.requirements?.(e);html=`<p class="context-summary">当前${low?'低水位 · 井路开放':'高水位 · 浮道开放'}。切换水位会开一路、合一路；深弱水不能架桥。中庭和莲灯始终安全。</p>${requirementsHTML(e)}<button class="context-button" data-context="tide" ${req&&!req.met?'disabled':''}>${engine.distance(e)>1?'走近 · ':''}切到${low?'高':'低'}水位 · 免费</button>`;}
      else if(e?.type==='portal'){title=e.label||'双塔回廊';const req=engine.requirements?.(e);html=`<p class="context-summary">两塔合印后的持久捷径，前往第 ${e.to+1} 层。经过不自动传送，不消耗灵息。</p>${requirementsHTML(e)}<button class="context-button" data-context="portal" ${req&&!req.met?'disabled':''}>${engine.distance(e)>1?'走近 · ':''}穿过回廊</button>`;}
      else if(e?.type==='finale'){title=s.selfAwakened?'无骨归真 · 最后选择':'莲阵中央 · 第十七位';html=`<p class="context-summary">${s.selfAwakened?'无骨舍利已照见。选择破劫归尘，或留下守塔；两种结局皆会解救众生。':'五印、十六枚外舍利与三相首领之后，才可照见中央空位。第十七颗并非塔中宝物。'}</p><button class="context-button" data-context="finale">走向塔心 · ${s.selfAwakened?'最后选择':'照见无骨'}</button>`;}
      else if(tile==='w'){title='深弱水 · 不载万物';html='<p class="context-summary">无法直接通行，也不能以金箍棒架桥。先救出八戒，再在水轮旁切换水位；水路开合由水位决定。</p>';}
      else if(tile==='#'){title='沉默石壁';html='<p class="muted">不可通行。分身可隔墙落在四格内的青色阵眼上。</p>';}
      else {title=`青石 · ${sel.x+1}, ${sel.y+1}`;html='<p class="muted">可通行的地面。点击可沿已连通道路行走。</p>';}
    }
    const selectedEntity=sel&&engine.getEntity(sel.x,sel.y),selectedTile=sel&&engine.getTile(sel.x,sel.y);
    if(selectedEntity&&engine.distance(selectedEntity)>1&&selectedEntity.type!=='illusion'&&!(selectedEntity.type==='switch'&&selectedEntity.kind==='plate')){
      const route=engine.findPath(selectedEntity.x,selectedEntity.y),standOn=['fragment','treasure','item','chest','altar','relic','cache'].includes(selectedEntity.type);
      html+=`<p class="route-cost">${route?`连通路线：<b>${Math.max(0,route.length-(standOn?0:1))} 步</b> · 途中不代你开门或战斗`:'暂无安全接近路线 · 先处理沿途守卫、门与机关'}</p>`;
    }
    const portrait=$('context-portrait');if(portrait){const type=selectedEntity?.type;portrait.hidden=!['enemy','npc','rescue','treasure'].includes(type);if(!portrait.hidden){if(type==='enemy')TowerRenderer.icon(portrait,'enemy',selectedEntity.enemy);else if(type==='treasure')TowerRenderer.icon(portrait,'treasure',selectedEntity.treasure);else TowerRenderer.icon(portrait,'npc',selectedEntity.sprite||selectedEntity.portrait||(type==='rescue'?'bajie':'lantern'));}}
    $('context-title').textContent=title;$('context-body').innerHTML=html;
    document.querySelector('.context-card')?.classList.toggle('has-selection',!!sel&&(!!selectedEntity||['~','=','w'].includes(selectedTile)));
    bindFocus($('context-body'));
    $('context-body').querySelectorAll('[data-context]').forEach(b=>b.onclick=()=>{
      const p=engine.selection,e=p&&engine.getEntity(p.x,p.y);if(!p)return;const a=b.dataset.context;
      if(a==='formula'&&e)combat(e);
      else if(a==='fight'&&e)approach(e,()=>requestCombat(e));
      else if(a==='door'&&e)approach(e,()=>door(e));
      else if(a==='switch'&&e)approach(e,()=>engine.toggleSwitch(e));
      else if(a==='stairs'&&e)approach(e,()=>engine.traverse(e));
      else if(a==='altar'&&e)approach(e,altar,true);
      else if(a==='choice'&&e)approach(e,()=>choice(e));
      else if(a==='cache'&&e){if(engine.state.choices?.[e.choice])approach(e,()=>{},true);else choice(e);}
      else if(a==='fragment'&&e)approach(e,()=>engine.takeFragment?.(e),true);
      else if(a==='treasure'&&e)approach(e,()=>engine.takeTreasure?.(e),true);
      else if(a==='relic'&&e)approach(e,()=>engine.moveTo(e.x,e.y),true);
      else if(a==='finale'&&e)approach(e,()=>engine.moveTo(e.x,e.y));
      else if(a==='story'&&e)approach(e,()=>engine.interact(e));
      else if(a==='reveal'&&e)engine.reveal(e);
      else if(a==='resonator'&&e)approach(e,()=>engine.activateResonator(e));
      else if(a==='rescue'&&e)approach(e,()=>engine.rescue(e));
      else if(a==='tide'&&e)approach(e,()=>engine.toggleTide(e));
      else if(a==='portal'&&e)approach(e,()=>engine.usePortal(e));
      else if(a==='recall'&&e)engine.recallClone(e.id);
      else cast(a,p.x,p.y);
    });
  }
  function inventory(){const s=engine.state;showModal('行者行囊',`<div class="inventory-grid"><article><span class="inventory-symbol"><canvas width="64" height="64" data-asset="item_elixir" aria-hidden="true"></canvas><span>桃</span></span><h3>随身蟠桃 × ${s.elixirs}</h3><p>立即恢复 200 生命。生命无上限，不会浪费溢出治疗。</p></article><article><span class="inventory-symbol blue"><canvas width="64" height="64" data-asset="item_orb" aria-hidden="true"></canvas><span>珠</span></span><h3>凝息珠 × ${s.orbs}</h3><p>可补满 ${s.maxMana} 点灵息，也可在灯前换 8 金或 50 生命，或留给最终战准备。凝息珠用后不再恢复。</p></article></div><div class="key-summary">铜钥匙 ${s.keys.yellow} · 青钥匙 ${s.keys.blue} · 朱钥匙 ${s.keys.red}</div>${treasureHTML()}<h3>已觉醒的心印</h3>${s.relics.length?s.relics.map(i=>`<div class="codex-row"><b>${esc(TowerData.relics[i].name)}</b><p>${esc(TowerData.relics[i].description)}</p></div>`).join(''):'<p class="muted">尚未解开心印。第三层完成第一印。</p>'}<div class="save-tools"><button id="export-save" class="secondary-button">导出存档</button><label class="secondary-button file-label">导入存档<input type="file" id="import-save" accept=".json,application/json" hidden></label></div>`,[{label:'收起行囊'},{label:'服用蟠桃',disabled:!s.elixirs,className:'primary-button',action:()=>{engine.useConsumable('elixir');inventory();}},{label:'凝息珠 · 补满灵息',disabled:!s.orbs||s.mana===s.maxMana,action:()=>{engine.useConsumable('orb');inventory();}}],'背包 · 有限资源');
    bindTreasures(inventory);
    $('export-save')?.addEventListener('click',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([engine.exportSave()],{type:'application/json'}));a.href=url;a.download='大圣-舍利魔塔-第'+(s.floor+1)+'层.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出可迁移的 JSON 存档。');});
    $('import-save')?.addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;if(file.size>2000000){toast('存档文件过大。');return;}const raw=await file.text();clearModals();if(engine.load(raw)){engine.save(true);if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();}});
  }
  function chapterProgressHTML(){return (engine.chapterProgress?.()||[]).map((p,i)=>`<article class="chapter-progress ${p.done?'completed':''}"><span>${String(i+1).padStart(2,'0')}</span><div><b>${esc(p.title)} ${p.done?'◆':''}</b><p>${p.steps.map(s=>`${s.done?'◆':'◇'} ${esc(s.label)}`).join(' · ')||'循阶解印'}</p></div></article>`).join('');}
  function fragmentListHTML(){return '<div class="fragment-list">'+Array.from({length:16},(_,id)=>{let target=null,fi=-1;TowerData.floors.forEach((f,i)=>{const e=f.entities.find(e=>e.type==='fragment'&&e.fragment===id);if(e){target=e;fi=i;}});const found=(engine.state.fragments||[]).includes(id),known=engine.state.visited.includes(fi);return `<article class="fragment-entry ${found?'found':''}"><b>${found?'◆':'◇'} 第 ${id+1} 枚</b><small>${found?'已经归环':known?'第 '+(fi+1)+' 层':'塔雾未散'}</small>${!found&&known&&target?`<button class="secondary-button" data-fragment-floor="${fi}" data-fragment-x="${target.x}" data-fragment-y="${target.y}">定位 ↗</button>`:''}</article>`;}).join('')+'</div>';}
  function relicCollection(){const s=engine.state;showModal('十六外环 · 一位未归',`${relicRing()}<div class="relic-counts"><span>外在舍利<b>${externalCount()} / 16</b></span><span>五重心印<b>${s.relics.length} / 5</b></span><span>无骨归真<b>${s.selfAwakened?'已照见':'中央空位'}</b></span></div>${fragmentListHTML()}<p>十六枚外舍利散落在真实塔路中，须逐枚寻回。五重心印会公开所需舍利数，解印后觉醒神通。主路、支翼与旧层回访，共同构成这一圈因果。</p><p class="muted">中央空位不是另一件宝物。解开五印、集齐外舍利并战胜三相后，须在塔心照见悟空自身。</p><div class="chapter-progress-list">${chapterProgressHTML()}</div><p class="adaptation-caption">《西游记后传》的十七舍利与无骨归真启发了此平行篇章；五印魔塔、点灯僧与守塔分歧为本作原创。</p>`,[{label:'合上莲阵',className:'primary-button'}],'十八层 · 五印 · 十六加一');$('modal-content').querySelectorAll('[data-fragment-floor]').forEach(b=>b.onclick=()=>focusTarget(Number(b.dataset.fragmentFloor),Number(b.dataset.fragmentX),Number(b.dataset.fragmentY)));}
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
      holder.innerHTML=`<details class="chapter-summary"><summary>六章主线 · ${externalCount()} / 16 外舍利</summary>${chapterProgressHTML()}</details>${revisits.length?`<h3>心印新解 · 旧层回响</h3><div class="revisit-list">${revisits.map(r=>{const done=revisitDone(r),reachable=s.visited.includes(r.floor),canFocus=r.floor===s.floor||(s.relics.includes(2)&&s.mana>=1&&reachable);return `<article class="revisit-row ${done?'completed':''}"><b>${done?'◆ 已探索':'◇ 可回访'} · ${esc(r.title)}</b><p>${esc(r.description)}</p><small>第 ${r.floor+1} 层 · (${r.x+1}, ${r.y+1}) · ${esc(TowerData.relics[r.relic].name)}</small>${!done?`<button class="secondary-button" data-revisit="${esc(r.id)}" ${!canFocus?'disabled':''}>${r.floor===s.floor?'地图定位':'乘云定位 · 1 息'}</button>`:''}</article>`;}).join('')}</div>`:''}<p class="muted">${s.relics.includes(2)?'乘云耗 1 灵息，直达已抵达塔层的莲灯。落地不会自动补息；机关与资源状态保持。':'第九层解开渡厄心印后，可乘云回到已抵达塔层的莲灯。'}</p><div class="tower-list">${TowerData.floors.map((f,i)=>`<article class="tower-row ${i===s.floor?'current':''}"><span>${String(i+1).padStart(2,'0')}</span><div><b>${s.visited.includes(i)?esc(f.name):'未抵达'}</b><small>${s.visited.includes(i)?esc(f.objective):'塔雾未散，循阶而上。'}</small>${i===s.floor?`<div class="floor-hints">${(f.hints||[]).map(h=>`<p>· ${hintHTML(h)}</p>`).join('')}${(f.hintTargets||[]).map(t=>`<button class="secondary-button" data-focus-x="${t.x}" data-focus-y="${t.y}">${esc(t.text)} ↗</button>`).join('')}</div>`:''}</div>${s.relics.includes(2)&&s.visited.includes(i)&&i!==s.floor?`<button class="secondary-button" data-travel="${i}" ${s.mana<1?'disabled':''}>乘云 · 1息</button>`:''}</article>`).join('')}</div>`;
      holder.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>{clearModals();engine.travel(Number(b.dataset.travel));});
      holder.querySelectorAll('[data-revisit]').forEach(b=>b.onclick=()=>{const r=revisits.find(r=>r.id===b.dataset.revisit);if(r)focusTarget(r.floor,r.x,r.y);});bindFocus(holder);
    }
    function notes(){if($('journal-body'))$('journal-body').innerHTML=s.journal.length?s.journal.slice().reverse().map(d=>`<details class="journal-note"><summary>${esc(d.title)}<small>第 ${d.floor+1} 层</small></summary>${paragraphs(d.text)}</details>`).join(''):'<p>塔中尚无记载。</p>';}
    $('tab-map')?.addEventListener('click',map);$('tab-story')?.addEventListener('click',notes);map();
  }
  function bestiary(){const s=engine.state,foes=TowerData.floors[s.floor].entities.filter(e=>e.type==='enemy'&&!s.removed[e.id]);showModal('火眼金睛 · 敌情簿',`<p class="muted">本层尚有 ${foes.length} 名守卫。以下损失以当前属性实时计算，不含途中拾取和成长。</p>${foes.map(e=>{const a=TowerData.enemies[e.enemy],p=engine.preview(a);return `<article class="bestiary-entry"><div><b>${esc(a.name)}</b><small>${traitNames[a.trait]} · 坐标 ${e.x+1},${e.y+1}</small></div>${statsHTML(a,p)}<div class="bestiary-bottom"><span>损失 <b class="${p.survive?'safe-text':'danger-text'}">${p.possible?p.damage:'无法破防'}</b></span><button class="secondary-button" data-foe="${esc(e.id)}">详细计算</button></div></article>`;}).join('')||'<div class="context-callout">此层守卫已肃清。无需再战。</div>'}`, [{label:'合上敌情簿'}],'规则透明 · 先算后战');$('modal-content').querySelectorAll('[data-foe]').forEach(b=>b.onclick=()=>{const e=foes.find(e=>e.id===b.dataset.foe);clearModals();renderer.focusCell?.(e.x,e.y);engine.select(e.x,e.y);combat(e);});}
  function help(){showModal('入塔须知',`<div class="guide-section"><h3>一格一策，不计时</h3><p>方向键 / WASD 移动，视野会随行者移动。<b>M / 全图规划</b>可在近观与整层地图间切换；全图中可选中远处目标。十六枚舍利要逐一寻回，支翼精英守着六件取舍鲜明的法器。点击守卫先看战损，点“走近”才接近，确认才开战。所有守卫、物品与门均不刷新。</p><h3>明算胜负</h3><p>行者伤害 = 攻击 − 敌防御，须大于 0；出棒数 = 敌生命 ÷ 每棒伤害，向上取整。普通守卫还击次数 = 出棒数 − 1。敌伤害 = max(0, 敌攻 − 行者防御)。生命必须大于总损失才能获胜。</p><p>先手守卫额外攻击一次；法术无视防御；余毒战后固定扣血；反震每棒固定扣血，包含最后一击。首领连续结算三相，准备方案的代价和总损失均在战前显示。</p><h3>西游神通，组合解局</h3><p><b>1 行走 · 2 火眼金睛</b>：免费查看任意格，战损和下一攻击临界值随属性更新。<br><b>3 金箍架桥</b>：第三层觉醒；相邻断口，耗 1 灵息，永久开路。<br><b>4 青蝉化形</b>：第六层觉醒；相邻铁栅，耗 1 灵息，从内侧开栅。<br><b>5 毫毛分身</b>：第九层觉醒；四格内点青色阵眼，可隔墙，基础耗 2 灵息。双影镜会改变神通费用，以技能栏当前数字为准。分身可免费回收，但关联机关会重新闭合。标有驻守上限的塔层需要调度；回收分身后可重新施放。<br><b>定心护身</b>：第十二层觉醒，被动将每次法术伤害降低 8，首领心火降低 8。<br><b>归真共鸣</b>：第十五层觉醒，回到第一层开启归根匣，取得最终朱钥匙。</p><h3>经过与交互分开</h3><p>经过楼梯和扳杆不会自动触发。靠近后按 E，或点目标后的交互按钮。踩上莲灯免费补满灵息，主动交互才打开供奉。远处查看不消耗行动。</p><h3>有限资源，路线有别</h3><p>路线契约会公开全部代价与奖励，同组只可选一项。凝息珠除恢复灵息，也能在莲灯换取功德、生命，或用于最终战；选择前先看机会成本。新心印会让因果簿出现旧层回访目标，可直接定位。</p><h3>存档、回溯与重做</h3><p>自动存档随行动更新；Ctrl+S 写入独立手动存档，L 可分别查看并读取。Z 回溯一次决策，Y / Ctrl+Y 重做（当前会话最近 30 组）。M 全图规划，I 背包与法器，J 因果簿，B 敌情簿，H 指引，E 交互；Esc 关闭或回到行走。背包可导入、导出 JSON 存档。</p><p class="muted">没有隐藏随机伤害，没有强制倒计时。不能通行时先看机关联动、旧层宝匣与其他路线。</p>${inspectSettings()}</div>`,[{label:'记下了 · 继续',className:'primary-button'}],'大圣 · 舍利魔塔');bindSettings();}
  function defeat(){showModal('行者，莫忘来路',`<div class="ending-symbol">败</div><p>金箍棒落地，塔钟却没有停。你仍能回到上一个选择。</p><div class="resource-choice">力竭不会覆盖战前存档。可直接回溯，或读取战前进度重新规划。</div>`,[{label:'回溯到战前',className:'primary-button',disabled:!engine.history.length,action:()=>engine.undo()},{label:'读取战前存档',disabled:!engine.hasSave(),action:continueGame},{label:'重启冒险',action:()=>confirmRestart()}],'力竭 · 因果未断',false);}
  function finale(){
    const s=engine.state,boss=TowerData.floors.at(-1).entities.find(e=>e.type==='enemy'&&TowerData.enemies[e.enemy].trait==='boss');
    if(boss&&!s.removed[boss.id]){toast('无相之心尚未伏诛。');return;}
    if(s.relics.length<5||externalCount()<16){toast('五重心印与十六枚外舍利尚未齐聚。');return;}
    if(!s.selfAwakened){showModal('空位不在塔中',`${relicRing(false)}<div class="dialogue-layout"><div class="dialogue-portrait">${portraitSVG('wukong')}</div><div class="story-quote"><p>十六点金光已归环，中央却始终空着。</p><p>点灯僧把灯放下：“你一路救回的性命，都曾被算作绕路的代价。大圣，最后那颗无骨舍利，一直是你。”</p><p>照见自身不会额外消耗生命或物品；接下来仍可选择破劫归尘，或留下守塔。</p></div></div>`,[{label:'再看一眼来路'},{label:'照见自身 · 无骨归真',className:'primary-button',action:()=>engine.awakenSelf()}],'第十七位 · 自身非宝物');return;}
    showModal('最后一念 · 众生的归路',`${relicRing(true)}<div class="ending-options"><article><h3>破劫归尘</h3><p>化为无骨舍利，携十六外舍利破开黑莲。被救者的呼唤会把悟空带回人间，乔灵儿与三界重见晨光。</p></article><article><h3>留灯守塔</h3><p>将十七道光留作塔内长明灯。众生仍可离塔，悟空留下守住黑莲余烬。这是本作原创的另一条因果。</p></article></div><p class="muted">两条结局均完整通关。选择会保存，可从此前手动存档体验另一条路。</p>`,[{label:'破劫归尘 · 为众生',className:'primary-button',action:()=>engine.finish('release')},{label:'留灯守塔 · 我来守',action:()=>engine.finish('keep')}],'无相塔心 · 平行篇章的分歧');
  }
  function selfAwakening(){showModal('无骨归真 · 第十七颗',`${relicRing(true,true)}<div class="awakening-caption"><b>十六外舍利，归于一颗无骨心。</b><p>金箍没有折断。你只是终于明白：能破黑莲的，从来不只是一棒。</p></div><p class="muted">无骨舍利已觉醒。可继续选择归途。</p>`,[{label:'跳过演出',keep:true,action:skipPresentation},{label:'作最后的选择',className:'primary-button',action:finale}],'归真 · 此心无骨');}
  function journeyRecall(){const entries=Object.entries(engine.state.choices||{}).map(([group,id])=>{const def=TowerData.choices?.[group],option=def?.options.find(o=>o.id===id);if(group==='silk'&&engine.state.quests?.silkLegacy)return '<p><b>旧日朱砂</b> · 攻击修为承续，双经卷未重复领取。</p>';if(group==='locks'&&engine.state.quests?.locksLegacy)return '<p><b>旧日锁廊</b> · 灵晶修为承续，路线沿用所选契约。</p>';if(group==='sevenWounds'&&engine.state.quests?.sevenLegacy)return '<p><b>旧日碧髓</b> · 防御修为承续；七伤侧门仍未开启。</p>';return option?`<p><b>${esc(def.title)}</b> · ${esc(option.label)}</p>`:'';}).filter(Boolean);return entries.length?`<div class="journey-recall"><h3>此行因果</h3>${entries.join('')}${engine.state.choices.compassion?`<p>${engine.state.choices.compassion==='release'?'你还给灯魂的那盏灯，正照着众生离塔。':'那枚取走的灯芯，提醒你记住力量的来处。'}</p>`:''}</div>`:'';}
  function ending(choice){const s=engine.state,rescued=s.rescued||[],names={bajie:'八戒',tangseng:'唐僧',nezha:'哪吒',gods:'诸神',souls:'灯魂',waterSoul:'灯魂',qiao:'乔灵儿的映身',seven:'七伤路中的众生'},voices=rescued.map(id=>names[id]||id).join('、');showModal(choice==='release'?'不负众生，不负此心':'留一盏灯，照众生归途',`${relicRing(true)}<div class="story-quote">${paragraphs(choice==='release'?`你化作无骨舍利，十七道光穿过黑莲塔心。\n\n${voices?voices+'的呼唤，从你亲手打开的归路传来。':'众生的呼唤，从每一条重新点亮的归路传来。'}一根毫毛飘回掌心，你又听见八戒的笑。\n\n塔外，乔灵儿迎着晨光。点灯僧化作胸口的一点暖意——那是你从未失去的慈悲。你扛起金箍棒，走回众人身边。`:'你把十七道光留在塔心，以金箍压住黑莲余烬。\n\n被困众生循灯而去，乔灵儿与八戒守望塔外。你坐在门前，接过那个一直等你的灯盏。\n\n风过时，金箍棒轻轻一响。塔里仍有需要你点亮的路。')}</div>${journeyRecall()}<div class="completion-stats"><span>踏遍塔层<b>${s.visited.length} / 18</b></span><span>外舍利 + 无骨<b>${externalCount()} + ${s.selfAwakened?1:0}</b></span><span>降伏守卫<b>${s.kills}</b></span><span>剩余生命<b>${s.hp}</b></span></div><p class="adaptation-caption">${choice==='release'?'破劫归尘 · 众念归来':'原创分歧 · 留灯守塔'}</p><p class="ending-credit">大圣：舍利魔塔 · 全篇终</p>`,[{label:'留步观塔'},{label:'再走一段因果',className:'primary-button',action:()=>confirmRestart()}],'十八重因果 · 已通关');}
  function confirmRestart(){showModal('重新开始这段因果？','<p>当前自动存档会被新冒险替换，独立手动存档保留。若想保留当前行动，可先手动存档或到背包导出。</p>',[{label:'留在此处'},{label:'开启新冒险',className:'danger-button',action:begin}],'重新开始');}
  function interact(){
    if(modalOpen||!started)return;
    stopPath();renderer.skipEffects?.();const s=engine.state,sel=engine.selection;
    const [dx,dy]=TowerRules.directions[s.facing],here=engine.getEntity(s.x,s.y),front=engine.getEntity(s.x+dx,s.y+dy);
    const selected=sel&&engine.getEntity(sel.x,sel.y);
    const e=selected&&engine.distance(selected)<=1?selected:here||front;
    if(e){engine.interact(e);return;}
    const x=s.x+dx,y=s.y+dy,tile=engine.getTile(x,y);
    if(tile==='~')cast('staff',x,y);else if(tile==='=')cast('morph',x,y);else toast('此处没有可交互的目标。先点选机关、阶梯或莲灯。');
  }
  function saveSummary(kind){
    const a=engine.getSaveSummary?.(kind);if(!a)return '<p class="muted">尚无此类存档</p>';
    const s=a.state||a;const floor=s.floor??a.floor;const time=a.savedAt?new Date(a.savedAt).toLocaleString('zh-CN',{hour12:false}):'';
    const relicCount=Array.isArray(s.relics)?s.relics.length:(Number.isFinite(s.relics)?s.relics:undefined);
    return `<p>第 ${Number(floor)+1} 层${TowerData.floors[floor]?' · '+esc(TowerData.floors[floor].name):''}</p><small>${s.hp!==undefined?'生命 '+s.hp+' · ':''}${relicCount!==undefined?'心印 '+relicCount+'/5 · ':''}${esc(time)}</small>`;
  }
  function loadSlots(){
    showModal('选择一段前缘',`<div class="save-slot"><h3>手动存档 · 独立保留</h3>${saveSummary('manual')}</div><div class="save-slot"><h3>自动存档 · 最近行动</h3>${saveSummary('auto')}</div><p class="muted">读取会清空本会话的回溯与重做记录。自动保存不会覆盖手动存档。</p>`,[{label:'留在当前进度'},{label:'读取手动存档',className:'primary-button',disabled:!engine.hasManualSave?.(),action:()=>{if(engine.loadManual()){showGame();if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();}}},{label:'读取自动存档',disabled:!engine.hasSave(),action:continueGame}],'存档 · 两条独立的前缘');
  }
  engine.on((type,d)=>{
    if(type==='notice')toast(d);
    else if(type==='story')story(d);
    else if(type==='combat')requestCombat(d);
    else if(type==='door')door(d);
    else if(type==='altar')altar();
    else if(type==='choice')choice(d);
    else if(type==='cloneLimit')cloneLimit(d);
    else if(type==='stairs'){engine.select(d.x,d.y);toast('已到阶梯。按 E 或点击目标面板，确认后换层。');}
    else if(type==='finale')finale();
    else if(type==='awakening')selfAwakening();
    else if(type==='defeat')defeat();
    else if(type==='ending')ending(d);
    else if(type==='effect'){const meta={...d,...(d.meta||{})};renderer.effect(d.type,d.x,d.y,d.text,meta);audio.cue(meta.fragment!==undefined?'pickup':meta.self?'selfAwaken':d.type,meta);}
    if(['change','reset','mode','selection','log'].includes(type))renderHUD();
  });
  $('new-game').onclick=()=>engine.hasSave()?confirmRestart():begin();$('continue-game').disabled=!engine.hasSave();$('continue-game').onclick=continueGame;
  $('btn-overview').onclick=toggleOverview;
  $('btn-focus-player').onclick=()=>focusPlayer();
  $('btn-quest-journal').onclick=()=>{document.querySelector('.quest-scroll').open=false;journal();};
  $('btn-save').onclick=()=>{if($('game-toolbox'))$('game-toolbox').open=false;engine.save();};$('btn-load').onclick=loadSlots;
  $('btn-inventory').onclick=inventory;$('btn-journal').onclick=journal;$('btn-bestiary').onclick=bestiary;$('btn-help').onclick=help;$('btn-restart').onclick=confirmRestart;$('btn-undo').onclick=()=>{stopPath();clearModals();engine.undo();};$('btn-audio').onclick=soundSettings;$('btn-relics').onclick=relicCollection;
  $('modal-close').onclick=()=>closeModal();$('modal-backdrop').onclick=()=>{if(!$('modal-close').disabled)closeModal();};
  if($('btn-redo'))$('btn-redo').onclick=()=>{stopPath();clearModals();engine.redo();};
  if($('context-dismiss'))$('context-dismiss').onclick=()=>{engine.selection=null;focusPlayer(false);engine.emit('selection',null);};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{stopPath();if(engine.setMode(b.dataset.mode))toast(modeHelp(b.dataset.mode));});
  document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('pointerdown',ev=>{ev.preventDefault();const now=performance.now();if(!modalOpen&&now-lastInput>=105){lastInput=now;stopPath();renderer.skipEffects?.();engine.step(b.dataset.move);}}));
  if($('btn-interact'))$('btn-interact').onclick=interact;
  function approach(e,action,standOn=false){
    stopPath();if(!engine.isCurrent(e))return;
    if((standOn&&engine.distance(e)===0)||(!standOn&&engine.distance(e)<=1)){action();return;}
    const path=engine.findPath(e.x,e.y);if(!path){toast('当前没有安全的接近路线。先解决阻挡的门、守卫或机关。');return;}
    if(!standOn)path.pop();
    walkPath(path,()=>{engine.select(e.x,e.y);if(engine.isCurrent(e)&&((standOn&&engine.distance(e)===0)||(!standOn&&engine.distance(e)<=1)))action();});
  }
  function walkPath(path,onComplete){
    stopPath();if(!path)return;if(!path.length){onComplete?.();return;}
    engine.path=path.slice();const lastFloor=engine.state.floor;
    function next(){
      if(modalOpen||engine.state.floor!==lastFloor){stopPath();return;}
      const dir=engine.path.shift();if(!dir){pathTimer=0;onComplete?.();return;}
      renderer.skipEffects?.();const moved=engine.step(dir);if(!moved||modalOpen){stopPath();return;}
      pathTimer=setTimeout(next,115);
    }next();
  }
  $('game-canvas').addEventListener('pointerdown',ev=>{
    if(ev.button===2||!started||modalOpen||engine.state.won||engine.state.defeated)return;
    stopPath();const now=performance.now();if(engine.mode==='walk'&&now-lastInput<105)return;lastInput=now;
    const p=renderer.cellAt(ev.clientX,ev.clientY),floor=currentFloor();if(!p||p.x<0||p.x>=floor.map[0].length||p.y<0||p.y>=floor.map.length)return;
    engine.select(p.x,p.y);
    if(engine.mode==='inspect')return;
    if(engine.mode!=='walk'){cast(engine.mode,p.x,p.y);return;}
    if(p.x===engine.state.x&&p.y===engine.state.y){inventory();return;}
    const e=engine.getEntity(p.x,p.y),tile=engine.getTile(p.x,p.y);
    if(e&&['enemy','door','stairs','switch','choice','cache','altar','npc','monument','gate','seal','finale','illusion','resonator','rescue','tide','portal','fragment','treasure'].includes(e.type))return;
    if(['#','~','=','w'].includes(tile))return;
    const path=engine.findPath(p.x,p.y);if(path)walkPath(path);else toast('此处暂无连通道路。查看目标信息，先解决沿途阻挡。');
  });
  $('game-canvas').addEventListener('contextmenu',ev=>{ev.preventDefault();stopPath();const p=renderer.cellAt(ev.clientX,ev.clientY);if(p&&!modalOpen)engine.select(p.x,p.y);});
  $('game-canvas').addEventListener('pointermove',ev=>{const p=renderer.cellAt(ev.clientX,ev.clientY);renderer.setHover(p?.x,p?.y);});$('game-canvas').addEventListener('pointerleave',()=>renderer.setHover(-1,-1));
  window.addEventListener('keydown',ev=>{
    if(started&&(ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='s'){ev.preventDefault();if(!modalOpen)engine.save();return;}
    if(ev.target.matches('input,textarea,select')&&!['Escape','Tab'].includes(ev.key))return;
    if(ev.key==='Tab'&&modalOpen){const focusables=[...$('modal-panel').querySelectorAll('button:not(:disabled):not(.hidden),input:not([hidden]):not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);if(focusables.length){const first=focusables[0],last=focusables.at(-1);if(ev.shiftKey&&(document.activeElement===first||document.activeElement===$('modal-panel'))){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}return;}
    if(ev.code==='Space'&&modalOpen&&$('modal-content').querySelector('.awakening-sequence')&&!ev.target.matches('button,input,select,summary')){ev.preventDefault();skipPresentation();return;}
    if(ev.key==='Escape'&&$('game-toolbox')?.open&&!modalOpen){ev.preventDefault();$('game-toolbox').open=false;document.querySelector('#game-toolbox summary').focus();return;}
    if($('game-toolbox')?.open&&ev.target.closest('#game-toolbox')&&!modalOpen)return;
    if(ev.key==='Escape'){ev.preventDefault();stopPath();if(modalOpen&&!$('modal-close').disabled)closeModal();else if(!modalOpen)engine.setMode('walk');return;}
    if(!started||modalOpen)return;
    const k=ev.key.toLowerCase(),dirs={arrowup:'up',w:'up',arrowright:'right',d:'right',arrowdown:'down',s:'down',arrowleft:'left',a:'left'};
    if((ev.ctrlKey||ev.metaKey)&&k==='s'){ev.preventDefault();engine.save();return;}
    if((ev.ctrlKey||ev.metaKey)&&k==='y'){ev.preventDefault();stopPath();engine.redo();return;}
    if(dirs[k]){ev.preventDefault();if(ev.ctrlKey||ev.metaKey)return;const now=performance.now();if(now-lastInput<105)return;lastInput=now;stopPath();renderer.skipEffects?.();engine.step(dirs[k]);return;}
    if(ev.repeat)return;
    if(['1','2','3','4','5'].includes(k)){ev.preventDefault();stopPath();engine.setMode(['walk','inspect','staff','morph','clone'][Number(k)-1]);}
    const keys={m:toggleOverview,f:()=>focusPlayer(),i:inventory,j:journal,b:bestiary,h:help,l:loadSlots,z:()=>engine.undo(),y:()=>engine.redo(),e:interact};if(keys[k]){ev.preventDefault();stopPath();keys[k]();}
  });
  document.querySelector('.game-brand')?.addEventListener('click',ev=>{ev.preventDefault();stopPath();engine.save(true);started=false;$('game-shell').classList.add('hidden');$('start-screen').classList.remove('hidden');$('continue-game').disabled=!engine.hasSave();});
  document.addEventListener('pointerdown',ev=>{const menu=$('game-toolbox');if(menu?.open&&!menu.contains(ev.target))menu.open=false;});
  window.addEventListener('blur',stopPath);
  document.addEventListener('pointerdown',()=>{if(settings().music||settings().sfx){audio.unlock();audio.configure(settings(),Math.floor(engine.state.floor/3));}},{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPath();audio.pause();}else audio.resume();});
  systemMotion.addEventListener?.('change',()=>{renderHUD();if(systemMotion.matches)skipPresentation();});
  renderHUD();
  preloadArt();
})();
