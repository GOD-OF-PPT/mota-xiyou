(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const engine = new TowerEngine(TowerData);
  const runSession = new TowerRunSession(engine);
  window.runSession=runSession;
  const journey = new TowerJourney(engine);
  let armedCombat=null,floorEntryTimer=0,dialogueTimer=0,ritualOpen=false,decisionEntity=null,decisionSelection=null,ritualReturn=null,scenePointerAfter=0,ritualResult='',kitSelection='elixir',kitNotice='',speechTimer=0,lastSpeechKey='',guideTarget=null;
  const renderer = new TowerRenderer($('game-canvas'),engine);
  window.game = engine;
  const traitNames={normal:'普通',first:'先手',magic:'法术',armor:'重甲',venom:'余毒',counter:'反震',boss:'无相'};
  const abilityNames={staff:'金箍架桥',morph:'青蝉化形',clone:'毫毛分身',ward:'慈悲护持',truth:'归真共鸣'};
  const colorNames={yellow:'铜',blue:'青',red:'朱'};
  const modeNames={walk:'行走',inspect:'火眼金睛',staff:'金箍架桥',morph:'青蝉化形',clone:'毫毛分身'};
  let started=false,surfaceOpen=false,surfaceQueue=[],pathTimer=0,toastTimer=0,lastInput=0,assetsLoading=true,activeStory=null,storyCollapsed=false,calculationOpen=false,styleLoading=false,viewChosen=false,lastSigilTarget='',lastPresentedStory=null,targetDetails=null,contextFrame=0,anchorPlacement='',lastGuardKey='',sceneDetail=null,pendingStoryTarget=null,guidedRoute=null,receiptTimer=0,shownReceipt=0,whisperTimer=0;
  const audio=new TowerAudio();
  const preferenceKey='dasheng-relic-tower-preferences-v3';
  let localPreferences={};try{localPreferences=JSON.parse(localStorage.getItem(preferenceKey)||'{}');}catch{}
  let castFrequency='adaptive';try{const saved=localStorage.getItem('dasheng-cast-frequency-v13');if(['adaptive','always'].includes(saved))castFrequency=saved;}catch{}
  const systemMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const settings=()=>Object.assign(engine.state.settings||(engine.state.settings={quickZero:false,showDamage:true}),localPreferences);
  const effectiveMotion=()=>systemMotion.matches?'reduced':(settings().motion||'standard');
  const presentation=new TowerPresentation({motion:effectiveMotion,frequency:()=>castFrequency,onShot:({kind,index})=>{if(kind==='boss')audio.cue('final-phase',{phase:index});},onEntryEnd:()=>{lastInput=0;lastSpeechKey='';renderStory();renderHUD();$('game-canvas').focus({preventScroll:true});if(pendingChapterSummary){journeyNote(pendingChapterSummary);pendingChapterSummary='';}},onCastEnd:()=>{lastInput=0;lastSpeechKey='';renderStory();renderHUD();scheduleContext();if(finalBattle.isOpen)finalBattle.focus('[data-final-phase="0"]');else (surfaceOpen?$('modal-panel'):$('game-canvas')).focus({preventScroll:true});}});
  let finalPreludeSeen=false,pendingChapterSummary='';
  const finalBattle=new TowerFinale({engine,motion:effectiveMotion,onEnter:()=>{stopPath();clearSurfaces();closeCharacter();collapseStory(true);audio.setScene('finale');if(!finalPreludeSeen){finalPreludeSeen=true;presentation.showScene('confrontation',{floor:engine.state.floor,rescued:[...engine.state.rescued],choices:{...engine.state.choices},orbs:engine.state.orbs});}},onClose:()=>{lastInput=0;renderHUD();audio.setScene('planning');$('game-canvas').focus({preventScroll:true});},onCommit:ok=>{lastInput=0;if(!ok&&!engine.state.defeated)toast('局面已变化，请重新查看决战准备。');}});
  const planningDesk=new TowerPlanningUI({engine,show:showSurface,close:closeSurface,notice:toast,fast:()=>settings().fastTravel!==false,setFast:value=>setPreference('fastTravel',value),history:()=>runSession.isTrial?TowerOutcomes.history(engine).filter(r=>r.turn>runSession.trial.seed.turn&&r.floor===runSession.trial.floor):(TowerOutcomes.history(engine).length?TowerOutcomes.history(engine):journey.receipts||[]),resume:()=>{resetStorySession();showGame();viewChosen=false;explorationView();renderer.focusPlayer?.();if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();else floorEntry({floor:engine.state.floor,title:currentFloor().name,text:currentFloor().intro,resume:true});}});
  const trialPanel=new TowerTrialsUI({session:runSession,show:showSurface,close:closeSurface,resume:()=>{resetStorySession();planningDesk.steps=[];planningDesk.compare=[];showGame();viewChosen=false;explorationView();renderer.focusPlayer?.();viewStatus();trialPanel.updateRibbon();if(engine.state.won)ending(engine.state.ending);else floorEntry({floor:engine.state.floor,title:currentFloor().name,text:currentFloor().intro,resume:true});}});
  function syncRunLabels(){const active=runSession.isTrial,stale=active&&runSession.meta.rulesHash!==runSession.trial.rulesHash;$('leave-trial-start').hidden=!active;$('trial-resume-note').hidden=!stale;$('trial-resume-note').textContent=stale?'这道题已更新，可以重走新版或返回主线；旧记录会单独保留。':'';if(stale)$('continue-game').disabled=true;$('new-game').innerHTML=active?'重走本次试炼 <span>→</span>':'执棒入塔 <span>→</span>';$('continue-game').innerHTML=active?'继续独立试炼 <span>↗</span>':'继续前缘 <span>↗</span>';trialPanel.updateRibbon();}
  function setPreference(key,value){localPreferences[key]=value;try{localStorage.setItem(preferenceKey,JSON.stringify(localPreferences));}catch{}if(engine.updateSettings)engine.updateSettings({[key]:value});else{settings()[key]=value;engine.save(true);}renderHUD();}
  const externalCount=()=>Array.isArray(engine.state.fragments)?engine.state.fragments.length:(Number(engine.state.externalRelics)||0);
  const currentFloor=()=>TowerData.floors[engine.state.floor];
  const abilityCost=mode=>engine.abilityCost?.(mode)??(mode==='clone'?2:1);
  const treasureList=()=>Array.isArray(TowerData.treasures)?TowerData.treasures:Object.entries(TowerData.treasures||{}).map(([id,t])=>({id,...t}));
  const treasureById=id=>treasureList().find(t=>t.id===id);
  const treasureEffects={iron:'攻击 +6，防御 −3。',lotus:'每次法术反击 −6，攻击 −2。',thorn:'先手守卫少一次先手攻击，防御 −2。',tide:'整场生命损失乘 90% 向下取整；胜利功德乘 75% 向下取整。',ember:'每相第一棒额外造成 18 伤害；整场战后额外损失 8 生命。',mirror:'分身耗 1 灵息，架桥与化蝉耗 2；每次反震 −2，攻击 −2。'};
  function viewStatus(){const v=renderer.getViewport?.()||{x:0,y:0,w:currentFloor().map[0].length,h:currentFloor().map.length,overview:false};if($('viewport-label'))$('viewport-label').textContent=v.overview?`规划 ${currentFloor().map[0].length} × ${currentFloor().map.length} · 查看全局`:`近观 ${Math.floor(v.x)+1}–${Math.ceil(v.x+v.w)} / ${Math.floor(v.y)+1}–${Math.ceil(v.y+v.h)} · 方向跟随`;if($('btn-overview')){$('btn-overview').setAttribute('aria-pressed',!!v.overview);$('btn-overview').classList.toggle('active',!!v.overview);$('btn-overview').innerHTML=v.overview?'返回探索 <kbd>M</kbd>':'全图规划 <kbd>M</kbd>';}}
  function focusPlayer(showNotice=true){viewChosen=true;stopPath();renderer.setOverview?.(false);if(renderer.focusPlayer)renderer.focusPlayer();else{engine.selection=null;renderer.focusCell?.(engine.state.x,engine.state.y);engine.emit('selection',null);}viewStatus();if(showNotice)$('status-message').textContent='已回到悟空身边；所选目标仍保留。';scheduleContext();}
  function toggleOverview(){viewChosen=true;stopPath();renderer.toggleOverview?.();if(!renderer.getViewport?.().overview)focusPlayer(false);viewStatus();toast(renderer.getViewport?.().overview?'已展开整层。点选敌人、舍利与机关，先看路线再落子。':'已回到悟空身边。方向移动时，视野会跟随行者。');}
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
      clearSurfaces();if(!engine.travel(floor))return;
    }else clearSurfaces();
    engine.setMode('inspect');engine.select(x,y);renderer.focusCell?.(x,y);viewStatus();$('game-canvas').focus({preventScroll:true});
    renderer.effect('magic',x,y,'此处');toast(`已定位：第 ${floor+1} 层 (${x+1}, ${y+1})。`);
  }
  function soundSettings(){showSurface('声音与演出',inspectSettings(),[{label:'回到塔中',className:'primary-button'}],'六章声景 · 随心调节',true,'settings');bindSettings();}
  function toast(text){$('status-message').textContent=text;if(started&&!surfaceOpen){journeyNote(text);$('toast').hidden=true;return;}const node=$('toast');node.innerHTML=`<span class="notice-sigil" aria-hidden="true">回</span><span>${esc(text)}</span>`;node.hidden=false;node.classList.remove('visible');void node.offsetWidth;node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3300);}
  function stopPath(){clearTimeout(pathTimer);pathTimer=0;engine.path=[];}
  function showSurface(title,content,actions=[],eyebrow='无相塔 · 因果簿',closeable=true,view='book'){
    const same=surfaceOpen&&$('modal-root').dataset.view===view&&$('modal-title').textContent===title,scroll=same?$('modal-content').scrollTop:0,active=document.activeElement;
    const focusAttr=same&&active?.closest('#modal-content')?[...active.attributes].find(a=>a.name==='id'||a.name.startsWith('data-')):null;
    const focusSelector=focusAttr?(focusAttr.name==='id'?'#'+CSS.escape(focusAttr.value):'['+focusAttr.name+'="'+CSS.escape(focusAttr.value)+'"]'):null;
    const folds=same?[...$('modal-content').querySelectorAll('details[data-fold][open]')].map(n=>n.dataset.fold):[];
    const scrolls=same?[...$('modal-content').querySelectorAll('[data-scroll]')].map(n=>[n.dataset.scroll,n.scrollTop]):[];
    ritualReturn=null;stopPath();closeRitual(false);collapseStory(true);presentation.closeEntry(false);presentation.closeCast();closeCharacter();if($('game-toolbox'))$('game-toolbox').open=false;
    if(surfaceOpen&&!same)closeSurface(false);
    surfaceOpen=true;hideTargetLink();const kind=['awakening','ending','ending-choice','defeat'].includes(view)?'ending':/莲灯|契约|钥匙|神通调度|最终挑战/.test(title+' '+eyebrow)?'station':'drawer';
    $('modal-root').dataset.kind=kind;$('modal-root').dataset.view=view;document.body.dataset.surface=kind;
    audio.setScene(/觉醒|归真/.test(title)?'awakening':'planning');$('modal-title').textContent=title;$('modal-eyebrow').textContent=eyebrow;$('modal-content').innerHTML=content;$('modal-actions').innerHTML='';
    $('modal-content').querySelectorAll('[data-phase]').forEach(c=>TowerRenderer.icon(c,'boss',Number(c.dataset.phase)));paintPortraits($('modal-content'));paintAssetIcons($('modal-content'));
    $('modal-close').textContent='‹ 返回塔中';$('modal-close').setAttribute('aria-label','返回塔中');$('modal-close').classList.toggle('hidden',!closeable);$('modal-close').disabled=!closeable;$('modal-root').classList.remove('hidden');
    actions.forEach(a=>{const b=document.createElement('button');b.textContent=a.label;b.className=a.className||'secondary-button';b.disabled=!!a.disabled;b.addEventListener('click',()=>{if(a.keep){a.action?.();return;}closeSurface(false);a.action?.();nextSurface();});$('modal-actions').append(b);});
    folds.forEach(key=>{const n=$('modal-content').querySelector('[data-fold="'+CSS.escape(key)+'"]');if(n)n.open=true;});
    scrolls.forEach(([key,top])=>{const n=$('modal-content').querySelector('[data-scroll="'+CSS.escape(key)+'"]');if(n)n.scrollTop=top;});
    requestAnimationFrame(()=>{if(!surfaceOpen)return;$('modal-content').scrollTop=scroll;const panel=$('modal-panel'),focus=focusSelector&&$('modal-content').querySelector(focusSelector);if(!same)panel.scrollTop=0;(focus&&!focus.disabled?focus:panel).focus({preventScroll:true});});
  }
  function nextSurface(){if(!surfaceOpen&&surfaceQueue.length){const m=surfaceQueue.shift();showSurface(m.title,m.content,m.actions,m.eyebrow,m.closeable);}}
  function closeSurface(next=true){const resume=next&&ritualReturn;ritualReturn=null;surfaceOpen=false;audio.setScene('planning');$('modal-root').classList.add('hidden');delete document.body.dataset.surface;scheduleContext();if(resume){restoreRitual(resume);return;}if(started){lastInput=0;renderGuidance();$('game-canvas').focus({preventScroll:true});}if(next)nextSurface();}
  function clearSurfaces(){ritualReturn=null;surfaceQueue=[];closeRitual(false);closeSurface(false);}
  function closeCharacter(){delete document.body.dataset.character;const drawer=$('character-drawer');drawer?.classList.remove('open');drawer?.setAttribute('aria-hidden','true');$('btn-character')?.setAttribute('aria-expanded','false');syncSceneGuard();scheduleContext();}
  function character(){
    if(!started)return;if(surfaceOpen&&$('modal-root').dataset.view==='character'){closeSurface();return;}
    const s=engine.state,a=engine.effectiveStats();
    showSurface('照见行者',`<div class="character-tableau"><canvas width="384" height="384" data-asset="${heroAsset()}" aria-hidden="true"></canvas><div class="character-values">${[['生命',s.hp],['灵息',s.mana+' / '+s.maxMana],['攻击',a.atk],['防御',a.def],['功德',s.coins],['外舍利',externalCount()+' / 16']].map(([k,v])=>`<div>${k}<strong>${v}</strong></div>`).join('')}<div>五重心印<strong>${s.relics.length} / 5</strong></div><div>所佩法器<strong style="font-size:22px">${s.equipped.map(id=>treasureById(id)?.name).join(' · ')||'未佩戴'}</strong></div></div></div>`,[{label:'返回塔中 · C'}],'齐天大圣 · 一念照见',true,'character');
  }

  function collapseStory(explicit=false){if(!activeStory)return;clearInterval(speechTimer);activeStory=null;storyCollapsed=false;renderStory();}
  function clearSceneTarget(){renderer.mechanismPreview=[];armedCombat=null;clearInterval(dialogueTimer);engine.selection=null;targetDetails=null;sceneDetail=null;calculationOpen=false;hideTargetLink();engine.emit('selection',null);}
  function stepInScene(direction){
    collapseStory();const moved=engine.step(direction);
    if(moved){clearSceneTarget();renderer.focusPlayer?.();scheduleContext();}
    return moved;
  }
  function worldMove(direction,repeat=false){
    if(!started||engine.state.won||engine.state.defeated)return;
    clearSurfaces();closeCharacter();collapseStory();stopPath();presentation.closeCast();
    const s=engine.state,[dx,dy]=TowerRules.directions[direction],front=engine.getEntity(s.x+dx,s.y+dy);
    if(front?.type==='enemy'){
      const key=`${s.floor}:${s.x},${s.y}:${front.id}:${direction}`;
      if(armedCombat===key&&!repeat){armedCombat=null;confirmCombat(front,'keyboard');return;}
      combat(front);armedCombat=key;return;
    }
    armedCombat=null;renderer.skipEffects?.();stepInScene(direction);
  }
  function floorEntry(d){
    if(!started||engine.state.won)return;
    closeRitual(false);clearInterval(speechTimer);activeStory=null;renderStory();const g=guidance();
    const atmosphere=['云垂山门，黑莲吞没了旧日的钟声。','残钟失声，西庭仍有一处启钟扳杆。','石生心印沉睡，等三枚外舍利归位。','断云横在塔间，一棒也能渡人。','三条契路，须取舍才能走得更远。','双塔同鸣，青蝉将从细隙醒来。','弱水深处，八戒的呼唤尚未熄灭。','潮涨潮落，两岸各有未尽之路。','渡厄印前，一人当如何同渡。','炉火不眠，分身要守住另一端。','三台只容两影，取舍自有归途。','三炉相连，慈悲须从止火开始。','白衣善念，仍替众生留着一道门。','七伤路上，救助与力量各有代价。','经壁写尽十六道光，中央仍有空位。','逆莲向天，归路照见来时的抉择。','最后的炉烬，问你要留下怎样的力量。','黑莲三相之下，最后一颗舍利待你照见。'][d.floor];
    presentation.showEntry({floor:d.floor,title:d.title,atmosphere,goal:g.text,resume:!!d.resume});
  }
  function dismissFloorEntry(){presentation.closeEntry(false);}
  function guidance(){const g=journey.model();if(!runSession.isTrial)return g;const t=runSession.trial,goal=t.objectives.find(o=>o.id===runSession.meta.objective),q=TowerTrials.qualification(engine,t,goal.id),exit=currentFloor().entities.find(e=>e.type==='stairs'&&e.to===t.exitTo);return {...g,key:'trial:'+t.id+':'+goal.id,text:goal.description,why:q.met?'条件已齐；本题在上行处确认，不会进入下一层。':q.reason,phase:'独立试炼',lesson:'T 比较 · 上行处 F 完成 · 试炼菜单返回主线',journal:false,target:exit?{...exit,floor:t.floor}:null};}
  function renderGuidance(){
    const node=$('journey-guide'),g=guidance(),s=engine.state;guideTarget=g;
    node.dataset.goal=g.key;node.querySelector('[data-journey-phase]').textContent=g.phase;
    $('narrative-goal').textContent=g.text;node.querySelector('strong').innerHTML=TowerText.highlighted(g.text);
    node.querySelector('[data-journey-why]').textContent=g.why;
    // Keep each instruction together instead of wrapping its last two glyphs at the frame.
    const help=node.querySelector('[data-journey-help]');
    help.replaceChildren(...(g.lesson||'查看、定位均不消耗资源').split(' · ').map(text=>{const line=document.createElement('span');line.textContent=text;return line;}));
    node.querySelector('[data-journey-focus]').innerHTML=(g.journal?'查看回访':'标记目标')+' <kbd>G</kbd>';node.querySelector('[data-journey-focus]').disabled=!g.target&&!g.journal;
    if(guidedRoute&&guidedRoute.key!==g.key)guidedRoute=null;
    if(guidedRoute&&guidedRoute.turn!==s.turn){guidedRoute={key:g.key,turn:s.turn,path:journey.safeRoute(g.target)};}
    renderer.journey={target:g.target,phase:g.phase,path:guidedRoute?.path||null,floor:s.floor};
    renderReceipt();scheduleContext();
  }
  function renderReceipt(){
    const row=document.querySelector('[data-journey-result]'),receipt=journey.receipt;if(!row)return;
    if(!receipt){clearTimeout(receiptTimer);row.hidden=true;shownReceipt=0;return;}
    if(receipt.id===shownReceipt||presentation.entryOpen||presentation.castOpen||surfaceOpen||ritualOpen)return;
    shownReceipt=receipt.id;clearTimeout(receiptTimer);row.hidden=false;row.dataset.kind=receipt.kind;
    clearTimeout(whisperTimer);document.querySelector('[data-journey-note]').hidden=true;
    const numbers=receipt.deltas.map(d=>d.label+' '+d.before+' → '+d.after).join(' · ');
    row.querySelector('b').textContent=receipt.title;row.querySelector('span').textContent=(receipt.kind==='choice'?[numbers,receipt.detail].filter(Boolean).join('；'):receipt.detail||numbers)||'已结算，场景状态已更新';
    receiptTimer=setTimeout(()=>{row.hidden=true;scheduleContext();},5200);
  }
  function journeyNote(text){const node=document.querySelector('[data-journey-note]');if(!node)return;clearTimeout(whisperTimer);node.textContent=text;node.hidden=false;whisperTimer=setTimeout(()=>{node.hidden=true;scheduleContext();},4500);scheduleContext();}
  function sceneWhisper(d){journeyNote((storyPages(dialogueText(d))[0]||'').slice(0,36));}
  function guideAction(){
    if(activeStory)collapseStory(true);if(guideTarget?.journal){journal();return;}const e=guideTarget?.target;if(!e)return;
    if(e.floor!==undefined&&e.floor!==engine.state.floor){locateObjective();return;}
    stopPath();guidedRoute={key:guideTarget.key,turn:engine.state.turn,path:journey.safeRoute(e)};
    if(!renderer.getViewport?.().overview){renderer.setOverview?.(true);viewStatus();}
    engine.setMode('inspect');engine.select(e.x,e.y);renderGuidance();$('game-canvas').focus({preventScroll:true});
  }

  function locateObjective(e=null){
    let next=e?journey.resolve(e):guidance().target;if(!next)return;
    if(next.floor!==engine.state.floor){
      if(engine.state.visited.includes(next.floor)&&engine.state.relics.includes(2)){toast(`目标在第 ${next.floor+1} 层：${next.label}。按 J 可乘云回访，消耗 1 灵息。`);return;}
      const stair=currentFloor().entities.find(a=>a.type==='stairs'&&a.to===engine.state.floor+Math.sign(next.floor-engine.state.floor));
      if(stair){const need=engine.nextObjective(stair);next=need?.floor===engine.state.floor?need:{...stair,floor:engine.state.floor};}
    }
    if(next.floor===engine.state.floor)focusTarget(next.floor,next.x,next.y);
  }
  const paragraphs=text=>String(text).split('\n\n').map(t=>`<p>${esc(t).replace(/\n/g,'<br>')}</p>`).join('');
  const heroAsset=()=>window.TowerAssets?.get?.('cinematic_wukong')?'cinematic_wukong':'actor_wukong_down';
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
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=currentStyle()==='material';ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=currentStyle()==='material'?'#161b17':'#1b5b5c';ctx.fillRect(0,0,canvas.width,canvas.height);
      const kind=canvas.dataset.portrait,id=kind==='wukong'?(TowerAssets.get('portrait_wukong')?'portrait_wukong':'actor_wukong_down'):'npc_'+kind;
      const entry=TowerAssets.get?.(id);if(!entry)return;
      const sw=entry.sourceW||96,sh=entry.sourceH||96,scale=Math.min((canvas.width-8)/sw,(canvas.height-4)/sh),w=sw*scale,h=sh*scale;
      const anchor=entry.anchor||{x:sw/2,y:sh*.92},x=canvas.width/2-anchor.x*scale,y=canvas.height*.92-anchor.y*scale;
      if(TowerAssets.draw(ctx,id,x,y,w,h,0))canvas.parentElement.classList.add('asset-portrait');
    });
  }
  function paintAssetIcons(holder=document){
    if(!window.TowerAssets?.ready)return;
    holder.querySelectorAll('canvas[data-asset]').forEach(canvas=>{
      const e=TowerAssets.get?.(canvas.dataset.asset);if(!e?.image)return;
      const sw=e.sourceW||64,sh=e.sourceH||64,b=TowerText.artBounds(e,canvas.dataset.asset),pad=2,sx=Math.max(0,b[0]-pad),sy=Math.max(0,b[1]-pad),w=Math.min(sw,b[2]+pad)-sx,h=Math.min(sh,b[3]+pad)-sy,scale=Math.min(canvas.width/w,canvas.height/h),ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=currentStyle()==='material';ctx.imageSmoothingQuality='high';ctx.drawImage(e.image,(e.sx||0)+sx,(e.sy||0)+sy,w,h,(canvas.width-w*scale)/2,(canvas.height-h*scale)/2,w*scale,h*scale);canvas.parentElement.classList.add('has-asset');
    });
  }
  function installUIArt(){
    const assets=window.TowerAssets;if(!assets)return;
    const getImage=id=>{const entry=assets.get?.(id);return entry?.image||entry;};
    const backdrop=getImage('ui_backdrop'),motif=getImage('ui_motif');
    if(backdrop?.src){document.documentElement.style.setProperty('--mural-backdrop',`url("${backdrop.src}")`);$('start-illustration').src=backdrop.src;$('start-illustration').hidden=false;document.body.classList.add('assets-ready');}
    if(motif?.src){document.documentElement.style.setProperty('--mural-motif',`url("${motif.src}")`);if(!document.querySelector('.mural-motif')){const el=document.createElement('div');el.className='mural-motif';el.setAttribute('aria-hidden','true');document.body.prepend(el);}}
    const portrait=$('portrait');if(portrait&&!portrait.querySelector('[data-portrait]'))portrait.innerHTML=portraitSVG('wukong');paintPortraits();document.querySelectorAll('[data-treasure-icon]').forEach(c=>TowerRenderer.icon(c,'treasure',c.dataset.treasureIcon));document.querySelectorAll('canvas[data-phase]').forEach(c=>TowerRenderer.icon(c,'boss',Number(c.dataset.phase)));
    const ids={walk:'actor_wukong_down',inspect:'prop_eye',staff:'prop_staff',morph:'prop_cicada',clone:'prop_clone'};
    document.querySelectorAll('.ability[data-mode] .ability-symbol').forEach(el=>{const mode=el.closest('[data-mode]').dataset.mode,canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=currentStyle()==='material';if(assets.draw(ctx,ids[mode],0,0,48,48,0)){el.replaceChildren(canvas);el.classList.add('asset-symbol');}});
    for(const [selector,id]of [['.stat-icon.sword','item_atk'],['.stat-icon.shield','item_def'],['.stat-icon.spirit','item_mana'],['.stat-icon.coin','item_coin']]){
      const el=document.querySelector(selector);if(!el)continue;const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=currentStyle()==='material';if(assets.draw(ctx,id,0,0,48,48,0)){el.replaceChildren(canvas);el.classList.add('asset-stat');}
    }
    $('hud-portrait').dataset.asset=assets.get?.('portrait_wukong')?'portrait_wukong':'actor_wukong_down';paintAssetIcons();
    for(const color of ['yellow','blue','red']){const el=document.querySelector('.key-icon.'+color);if(!el)continue;const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=currentStyle()==='material';if(assets.draw(ctx,'item_key_'+color,0,0,48,48,0)){el.replaceChildren(canvas);el.classList.add('asset-key');}}
  }
  function currentStyle(){const value=window.TowerStyle?.current||window.TowerStyle?.get?.()||document.documentElement.dataset.artStyle||'material';return typeof value==='string'?value:value.id||'material';}
  function styleLabel(id=currentStyle()){return id==='material'?'玄金古寺':'青绿壁画';}
  function syncStyleUI(){const id=currentStyle();document.documentElement.dataset.artStyle=id;$('style-name').textContent=styleLabel(id);$('start-art-label').textContent=id==='material'?'玄金古寺 · 三维材质':'青绿壁画 · 重彩绘卷';document.querySelector('.start-topline>span:nth-child(2)').textContent='十八层西游策略冒险';document.querySelector('.art-caption').textContent='云垂山门 · '+styleLabel(id);$('start-illustration').alt=id==='material'?'玄金古寺的云山浮寺与鎏金佛龛':'青绿重彩的云山浮寺与金色莲灯';document.querySelectorAll('[data-style]').forEach(button=>{button.hidden=!TowerStyle.isUnlocked(button.dataset.style);button.classList.toggle('active',button.dataset.style===id);button.setAttribute('aria-pressed',button.dataset.style===id);button.disabled=styleLoading;});}
  function styleProgress(detail){const loaded=Number(detail?.loaded)||0,total=Math.max(1,Number(detail?.total)||1);$('style-progress-bar').max=total;$('style-progress-bar').value=loaded;$('style-progress-text').textContent=`正在载入${styleLabel(detail?.id)} · ${loaded} / ${total}`;if(styleLoading)$('style-progress').classList.remove('hidden');}
  async function switchStyle(id){
    if(!window.TowerStyle?.isUnlocked(id)){toast('完成任一主线结局后，便可展开新的画境。');return;}
    if(styleLoading||id===currentStyle()){$('style-picker').classList.add('hidden');return;}
    if(!window.TowerStyle?.set){toast('风格画卷尚未就位，请稍后重试。');return;}
    styleLoading=true;syncStyleUI();$('style-picker').classList.add('hidden');$('btn-style').setAttribute('aria-expanded','false');styleProgress({id,loaded:0,total:1});
    try{await TowerStyle.set(id);installUIArt();renderHUD();renderer.resize?.();syncSceneGuard();toast(styleLabel(id)+'已展开。塔中因果与资源保持原样。');}
    catch(error){toast('这幅画卷未能载入，仍保留'+styleLabel()+'。');}
    finally{styleLoading=false;$('style-progress').classList.add('hidden');syncStyleUI();}
  }
  async function preloadArt(){
    $('new-game').disabled=true;$('continue-game').disabled=true;
    const update=progress=>{const loaded=Number(progress?.loaded)||0,total=Math.max(1,Number(progress?.total)||1);$('asset-progress').max=total;$('asset-progress').value=loaded;$('asset-count').textContent=`${loaded} / ${total}`;$('asset-status').textContent='正在展开'+styleLabel()+'画卷';};
    try{
      if(!window.TowerAssets?.preload)throw new Error('美术资源清单未能载入');
      let worldProgress={loaded:0,total:1},skinProgress={loaded:0,total:window.TowerUISkins?.files.length||0};
      const aggregate=()=>update({loaded:worldProgress.loaded+skinProgress.loaded,total:worldProgress.total+skinProgress.total});
      const [result,skins]=await Promise.all([TowerAssets.preload(p=>{worldProgress=p;aggregate();}),window.TowerUISkins?.preload(p=>{skinProgress=p;aggregate();})]);aggregate();installUIArt();
      const failed=[...(result?.failed||[]),...(skins?.failed||[])];$('asset-loading').classList.add(failed.length?'failed':'complete');$('asset-status').textContent=failed.length?`${failed.length} 份画卷未载入；可使用基础图形继续`:styleLabel()+'已展开 · 离线亦可游玩';$('asset-count').textContent=failed.length?'部分载入':'已就绪';
    }catch(error){$('asset-loading').classList.add('failed');$('asset-status').textContent='美术画卷未能载入；可使用基础图形继续';$('asset-count').textContent='基础图形';}
    finally{assetsLoading=false;$('new-game').disabled=false;$('continue-game').disabled=!engine.hasSave()||runSession.isTrial&&runSession.meta.rulesHash!==runSession.trial.rulesHash;renderHUD();}
  }
  function relicRing(awakened=engine.state.selfAwakened,animate=false){const count=externalCount();return `<div class="relic-orbit ${awakened?'self-awakened':''} ${animate?'awakening-sequence':''}" role="img" aria-label="外舍利 ${count}/16，${awakened?'中心无骨舍利已觉醒':'中心空位尚未觉醒'}"><svg viewBox="0 0 220 220" aria-hidden="true"><circle class="orbit-trace" cx="110" cy="110" r="81"/><circle class="orbit-inner" cx="110" cy="110" r="52"/>${Array.from({length:16},(_,i)=>{const a=(i/16)*Math.PI*2-Math.PI/2,x=110+Math.cos(a)*81,y=110+Math.sin(a)*81;return `<g class="orbit-point ${(Array.isArray(engine.state.fragments)?engine.state.fragments.includes(i):i<count)?'lit':''}" style="--point:${i}"><path d="M${x} ${y-6}l6 6-6 6-6-6z"/><path d="M${x} ${y-2}l2 2-2 2-2-2z" class="point-core"/></g>`;}).join('')}<path class="orbit-lotus" d="M110 151c-29 0-44-26-44-26 25-1 34 5 44 14 10-9 19-15 44-14 0 0-15 26-44 26zm0-5c-17-10-24-33 0-57 24 24 17 47 0 57z"/>${!awakened?'<text class="orbit-center" x="110" y="113" text-anchor="middle">空</text>':''}</svg>${awakened?'<canvas class="orbit-self orbit-self-asset" width="192" height="192" data-asset="${heroAsset()}" aria-hidden="true"></canvas><span class="orbit-self-fallback">无骨</span>':''}<span class="orbit-caption">${awakened?'第十七 · 无骨归真':'第十七位 · 尚待照见'}</span></div>`;}
  function skipPresentation(){presentation.closeCast();presentation.settleEntry();renderer.skipEffects?.();audio.skip();document.querySelectorAll('.awakening-sequence').forEach(el=>el.classList.add('sequence-complete'));$('status-message').textContent='光影敛去，前路仍在。';}
  function bossMemorial(){return `<div class="boss-memorial" aria-label="金甲、执念与心火三相已经消散">${['金甲已卸','执念已解','心火已息'].map((name,i)=>`<figure style="--phase:${i}"><canvas width="96" height="112" data-asset="enemy_boss_${i}" aria-hidden="true"></canvas><figcaption>${name}</figcaption></figure>`).join('')}</div>`;}
  function dialogueText(d){return typeof d==='string'?d:(d?.text||d?.lines?.map(line=>typeof line==='string'?line:line.text||'').join('\n\n')||'');}
  function npcDialogue(e){return engine.dialogueFor?.(e)??TowerData.dialogues[e.dialogue];}
  function storyPages(text){return TowerText.speechPages(text,36);}
  function sceneTargetKey(e=engine.selection){return e?`${engine.state.floor}:${e.x},${e.y}`:'';}
  function story(d){
    if(d.kind==='chapter')return;
    if(!pendingStoryTarget&&['lore','treasure'].includes(d.kind)){sceneWhisper(d);return;}
    if(!pendingStoryTarget&&presentation.castOpen&&(['relic','boss','awakening'].includes(d.kind)||d.awakening))return;
    let pages=storyPages(dialogueText(d));if(!pages.length)return;
    const isTalk=!!pendingStoryTarget;
    if(d.kind==='intro')pages=[guidance().text,'十六枚舍利归位，五重心印会逐一苏醒。'];
    else if(isTalk)pages=journey.conversation(pendingStoryTarget)||pages.slice(0,3);
    else if(d.kind==='lore')pages=pages.slice(0,1);else if(d.kind==='treasure')pages=pages.slice(0,2);
    const major=['intro','relic','rescue','boss','awakening'].includes(d.kind)||!!d.awakening;
    if(!major&&!isTalk&&activeStory?.major)return;
    activeStory={...d,pages,index:0,major,isTalk,targetType:pendingStoryTarget?.type,portrait:d.portrait||pendingStoryTarget?.archetype||'lantern'};storyCollapsed=false;lastSpeechKey='';renderStory();
  }
  function paintSpeech(){if(!activeStory)return;const full=activeStory.pages[activeStory.index],count=activeStory.revealed??full.length;$('story-text').innerHTML=TowerText.highlighted(full.slice(0,count));scheduleContext();}
  function renderStory(){
    const dock=$('story-dock');if(!activeStory){clearInterval(speechTimer);dock.classList.add('hidden');delete document.body.dataset.speaking;scheduleContext();return;}
    dock.dataset.kind=activeStory.kind||'lore';dock.dataset.major=String(activeStory.major);dock.classList.remove('hidden');dock.classList.toggle('collapsed',storyCollapsed);document.body.dataset.speaking=String(!storyCollapsed);
    $('story-unfold').setAttribute('aria-expanded',!storyCollapsed);const names={wukong:'孙悟空',lantern:'点灯僧',bajie:'八戒',whiteWutian:'白衣无天',whitewutian:'白衣无天',tangseng:'唐僧',qiao:'乔灵儿',nezha:'哪吒'};
    $('story-speaker').textContent=storyCollapsed?activeStory.title:(activeStory.speaker||names[activeStory.portrait]||'塔中回响');$('story-counter').textContent=`${activeStory.index+1} / ${activeStory.pages.length}`;$('story-title').textContent=activeStory.title;
    $('story-portrait').innerHTML=portraitSVG(activeStory.portrait);paintPortraits($('story-portrait'));
    const hint=guidance(),same=activeStory.pages[activeStory.index]===hint.text,last=activeStory.index+1>=activeStory.pages.length;
    const finish=activeStory.isTalk?(activeStory.targetType==='monument'?'读毕收卷':'结束交谈'):'回到塔中';
    $('story-objective').hidden=false;$('story-objective').innerHTML=(same?'操作 · ':'要事 · ')+TowerText.highlighted(same?(hint.lesson||'G 定位当前目标'):hint.text);
    $('story-next').innerHTML=(last?finish:'继续')+' <kbd>F / Space</kbd>';
    $('story-skip').hidden=last;$('story-skip').innerHTML=(activeStory.isTalk?(activeStory.targetType==='monument'?'停止读碑':'结束交谈'):'收起对白')+' <kbd>Esc</kbd>';
    const key=(activeStory.source||activeStory.title)+':'+activeStory.index+':'+activeStory.pages[activeStory.index];
    if(key!==lastSpeechKey){clearInterval(speechTimer);lastSpeechKey=key;activeStory.revealed=effectiveMotion()==='standard'?0:activeStory.pages[activeStory.index].length;paintSpeech();if(effectiveMotion()==='standard'&&!storyCollapsed&&!presentation.entryOpen&&!presentation.castOpen){speechTimer=setInterval(()=>{if(!activeStory){clearInterval(speechTimer);return;}activeStory.revealed=Math.min(activeStory.pages[activeStory.index].length,activeStory.revealed+1);paintSpeech();if(activeStory.revealed>=activeStory.pages[activeStory.index].length)clearInterval(speechTimer);},27);}}
    else paintSpeech();scheduleContext();
  }
  function advanceStory(){
    if(!activeStory)return;if(storyCollapsed){storyCollapsed=false;lastSpeechKey='';renderStory();return;}
    const full=activeStory.pages[activeStory.index];if((activeStory.revealed||0)<full.length){clearInterval(speechTimer);activeStory.revealed=full.length;paintSpeech();return;}
    if(++activeStory.index>=activeStory.pages.length){skipStory();return;}renderStory();
  }
  function skipStory(){const wasTalk=!!activeStory?.isTalk;clearInterval(speechTimer);activeStory=null;renderStory();if(wasTalk)clearSceneTarget();$('game-canvas').focus({preventScroll:true});}
  function resetStorySession(){pendingChapterSummary='';finalBattle.close(false);finalPreludeSeen=false;armedCombat=null;clearInterval(dialogueTimer);clearInterval(speechTimer);clearTimeout(whisperTimer);clearTimeout(receiptTimer);guidedRoute=null;presentation.closeCast();activeStory=null;storyCollapsed=false;sceneDetail=null;pendingStoryTarget=null;lastSpeechKey='';renderStory();document.querySelector('[data-journey-note]').hidden=true;}

  function showGame(){started=true;$('start-screen').classList.add('hidden');$('game-shell').classList.remove('hidden');document.body.dataset.sceneStarted='true';renderer.resize?.();syncSceneGuard();renderHUD();trialPanel.updateRibbon();}
  function begin(){if(assetsLoading)return;clearSurfaces();resetStorySession();presentation.resetJourney();showGame();engine.newGame();viewChosen=false;explorationView();renderer.focusPlayer?.();viewStatus();}
  function continueGame(preserveStory=false){if(assetsLoading)return;clearSurfaces();if(engine.load()){if(preserveStory!==true)resetStorySession();else sceneDetail=null;showGame();viewChosen=false;explorationView();renderer.focusPlayer?.();viewStatus();renderStory();if(runSession.isTrial&&runSession.meta.completed){const record=runSession.records().find(r=>r.id===runSession.meta.recordId);if(record)trialPanel.result(record);else trialPanel.open();}else if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();else floorEntry({floor:engine.state.floor,title:currentFloor().name,text:currentFloor().intro,resume:true});}}
  function statsHTML(enemy,preview){return `<div class="enemy-stat-grid"><span>生命<b>${enemy.hp}</b></span><span>攻击<b>${enemy.atk}</b></span><span>防御<b>${enemy.def}</b></span><span>功德<b>${preview?.goldReward??enemy.gold}</b></span></div>`;}
  function attackBreakpoint(enemy,p){
    if(p.nextAttack)return p.nextAttack;
    if(enemy.trait==='boss'||!p.possible||p.rounds<=1||p.damage===0)return null;
    const ceiling=Math.max(engine.state.atk+1,enemy.def+enemy.hp);
    for(let atk=engine.state.atk+1;atk<=ceiling;atk++){const q=TowerRules.battle({...engine.state,atk},enemy);if(q.possible&&q.damage<p.damage)return {atk,delta:atk-engine.state.atk,saved:p.damage-q.damage};}
    return null;
  }
  function tacticsHTML(e){
    const plans=TowerTactics.growthPlans(engine,TowerData.enemies[e.enemy]),damage=p=>p.possible?p.damage:'未破防';
    return `<div class="scene-inline scene-tactics"><p class="tactics-caption">先取灵晶，还是现在迎战？</p>${plans.map(p=>{
      const active=renderer.planningHint?.id===p.id&&renderer.planningHint?.turn===engine.state.turn;
      const gain=p.saved===null?(p.after.possible?'可以破防':'仍未破防'):p.saved>0?`少损 ${p.saved} 生命`:'本战不减伤';
      return `<article class="growth-comparison"><div><b>${esc(p.name)}</b><span>${p.kind==='atk'?'攻':'防'} +${p.value} · ${p.steps} 步</span></div><p>战损 <strong>${damage(p.before)} → ${damage(p.after)}</strong><em>${gain}</em></p><button class="scene-rule-button" data-growth-route="${esc(p.id)}" aria-pressed="${active}">${active?'青线已标出':'标出这条路'} ↗</button></article>`;
    }).join('')||'<p class="tactics-empty">眼下没有可直接安全拾取的灵晶。可回访莲灯调整成长与法器。</p>'}<small>青线到灵晶，金圈为守卫。只比较单枚成长；途中不经战斗、开门或其他奖励。</small></div>`;
  }
  function nearbyGrowthHTML(e){
    if(engine.state.floor>2||sceneDetail)return '';
    const p=TowerTactics.growthPlans(engine,TowerData.enemies[e.enemy]).find(p=>p.saved>0);if(!p)return '';
    return `<div class="encounter-opportunity"><span>先取${esc(p.name)}：本战损失 ${p.before.damage} → ${p.after.damage}</span><button data-growth-route="${esc(p.id)}">标出路线 ↗</button></div>`;
  }
  function battleHTML(enemy,p,expanded=false){
    if(!expanded&&settings().quickZero&&p.possible&&p.damage===0)return `<div class="forecast safe"><span>本战可无损</span><strong class="damage-number">0</strong><small>再次前进或点击迎战才结算</small></div>`;
    const next=attackBreakpoint(enemy,p),phase=p.phases?.length?`<div class="phase-table">${p.phases.map((q,i)=>`<div class="phase-row"><b><canvas class="phase-icon" data-phase="${i}" aria-hidden="true"></canvas>${i+1} · ${esc(q.name)}</b><span>生命 ${q.hp} / 攻 ${q.atk} / 防 ${q.def}</span><small>${q.possible===false?'无法破防':`${finite(q.rounds)} 棒 · 敌出手 ${finite(q.enemyHits)} 次 · 损失 ${finite(q.damage)}`}</small></div>`).join('')}</div>`:'';
    return `${statsHTML(enemy,p)}<div class="forecast ${p.possible&&p.survive?'safe':'danger'}"><span>预计生命损失${p.phases?.length?' · 三相合计':''}</span><strong class="damage-number">${p.possible?p.damage:'无法破防'}</strong><small>${p.possible?(p.survive?`战后剩余 ${engine.state.hp-p.damage} 生命`:'本次战斗将会力竭'):'提升攻击，或寻找其他路线'}</small></div><div class="trait-note context-summary ${enemy.trait==='normal'?'normal-rule':'special-rule'}"><b>${traitNames[enemy.trait]||'普通'} · </b>${esc(enemy.desc||'行者先攻，击杀一击不会受到还击。')}</div>${p.gearLines?.length?`<div class="gear-forecast"><b>法器实效 · 攻 ${p.effectiveAtk} / 防 ${p.effectiveDef}</b>${p.gearLines.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${next?`<div class="breakpoint-note">下一基础攻击临界：<b>${next.atk}</b>（再加 ${next.delta}）可少损 <b>${next.saved}</b> 生命。</div>`:''}${expanded?`${phase}<details class="formula" ${!p.phases?'open':''}><summary>展开真实计算过程</summary>${(p.lines||[]).map(t=>`<div>${esc(t)}</div>`).join('')}<div><b>总损失 = ${p.possible?p.damage:'无法破防'}</b></div></details>`:''}`;
  }
  function combat(e){
    if(!engine.isCurrent(e))return;clearSurfaces();calculationOpen=false;engine.select(e.x,e.y);updateContext();positionContext();
  }
  function requestCombat(e){combat(e);}
  function bossCombat(e){combat(e);}
  function confirmCombat(e,source='button'){
    if(!e||!engine.isCurrent(e))return;if(engine.distance(e)!==1){toast('先走近守卫，再确认迎战。');return;}
    const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy);
    if(enemy.trait==='boss'&&source==='keyboard'&&engine.state.relics.length>=5){finalBattle.open(e);return;}
    if(!p.possible){toast('尚不能破防。先调整成长或路线。');return;}
    if(enemy.trait==='boss'&&engine.state.relics.length<5){toast('五重心印尚未齐聚。');return;}
    if(p.canAfford===false){toast('当前凝息珠不足，换一种临战准备。');return;}
    if(!p.survive&&source==='keyboard'){toast('本战将会力竭。若仍要尝试，请点红色迎战按钮。');return;}
    clearSurfaces();closeCharacter();collapseStory();renderer.skipEffects?.();engine.fight(e);
  }
  function sceneCalculation(enemy,p){
    const phases=p.phases?.length?`<div class="scene-phases">${p.phases.map((phase,i)=>`<div><span>${i+1} · ${esc(phase.name)}</span><b>${phase.possible===false?'无法破防':'−'+finite(phase.damage)}</b></div>`).join('')}</div>`:'';
    const breakpoint=attackBreakpoint(enemy,p);
    return `<details class="scene-calculation" ${calculationOpen?'open':''}><summary>规则与计算 <span>⌄</span></summary>${statsHTML(enemy,p)}${breakpoint?`<p class="scene-breakpoint">攻击临界 ${breakpoint.atk}（再加 ${breakpoint.delta}），可少损 ${breakpoint.saved} 生命。</p>`:''}${phases}${(p.lines||[]).map(line=>`<p>${esc(line)}</p>`).join('')}<p>${esc(enemy.desc||'行者先攻，击杀一击不会受到还击。')}</p></details>`;
  }
  function sceneBossPlans(e){return `<div class="scene-boss-plans" aria-label="三相临战准备">${engine.bossOptions().map(option=>{const p=option.preview||engine.preview(e.enemy,{bossPlan:option.id}),cost=typeof option.cost==='number'?option.cost:(option.cost?.orbs||0);return `<button data-context-plan="${esc(option.id)}" class="${engine.state.bossPlan===option.id?'selected':''}" aria-pressed="${engine.state.bossPlan===option.id}"><span>${esc(option.label)}</span><b>${p.possible?'−'+p.damage:'无法破防'}</b><small>${cost?cost+' 珠':'保留凝息珠'}</small></button>`;}).join('')}</div>`;}
  function toggleSceneDetail(kind){clearSurfaces();collapseStory();const key=sceneTargetKey();sceneDetail=sceneDetail?.key===key&&sceneDetail.kind===kind?null:{key,kind};updateContext();}
  function showBattleRules(e){if(engine.isCurrent(e))toggleSceneDetail('rules');}
  function showBossPreparation(e){if(engine.isCurrent(e))toggleSceneDetail('plans');}
  function talk(e){
    if(!engine.isCurrent(e)||engine.distance(e)>1)return;
    dismissFloorEntry();if(activeStory?.isTalk&&activeStory.source===e.id&&!storyCollapsed){skipStory();return;}
    sceneDetail=null;pendingStoryTarget=e;try{engine.interact(e);}finally{pendingStoryTarget=null;}updateContext();
  }

  function animateDialogue(){
    clearInterval(dialogueTimer);const el=$('context-body').querySelector('.scene-dialogue-text p');if(!el||effectiveMotion()!=='standard')return;
    const text=el.textContent;let count=0;el.dataset.fullText=text;el.textContent='';
    dialogueTimer=setInterval(()=>{if(!el.isConnected){clearInterval(dialogueTimer);return;}count+=2;el.textContent=text.slice(0,count);if(count>=text.length){clearInterval(dialogueTimer);delete el.dataset.fullText;}},24);
  }
  function advanceSceneDialogue(){if(sceneDetail?.kind!=='dialogue')return;const el=$('context-body').querySelector('[data-full-text]');if(el){el.textContent=el.dataset.fullText;delete el.dataset.fullText;clearInterval(dialogueTimer);return;}sceneDetail.index++;if(sceneDetail.index>=sceneDetail.pages.length)sceneDetail=null;updateContext();animateDialogue();}
  function door(e){if(engine.isCurrent(e)){engine.select(e.x,e.y);toggleSceneDetail('door');}}

  function resourceText(values){
    if(!values)return '无';
    const names={hp:'生命',atk:'攻击',def:'防御',coins:'功德金',mana:'灵息',elixirs:'随身蟠桃',orbs:'凝息珠'};
    const rescueNames={bajie:'八戒',tangseng:'唐僧映身',nezha:'哪吒映身',qiao:'乔灵儿映身',waterSoul:'灯魂'};
    const result=[];for(const [key,value]of Object.entries(values)){if(key==='key'&&value)result.push(`${colorNames[value.color]||value.color}钥匙 × ${value.amount||1}`);else if(key==='keys'&&value){for(const [c,n]of Object.entries(value))if(n)result.push(`${colorNames[c]||c}钥匙 × ${n}`);}else if(key==='rescue'&&Array.isArray(value))result.push(`救回 ${value.map(id=>rescueNames[id]||'被困者').join('、')}`);else if(key==='quests'&&value){if(value.sevenRescue)result.push('开启十五层援手侧门');else if(value.sevenWounds)result.push('完成七伤抉择');else if(value.bajie)result.push('开启弱水援手');else if(value.bellPassage)result.push('永久开启定海铁宝龛北门');else if(value.ferryPassage)result.push('永久开启西缘渡灯栈道');else if(value.emberPassage)result.push('永久开启心炉烬北径');}else if(names[key]&&value)result.push(`${names[key]} ${value>0?'+':''}${value}`);}
    return result.join(' · ')||'无';
  }
  function paymentText(cost){return resourceText(cost).replace(/ \+/g,' ');}
  function paymentBalance(cost){
    const s=engine.state,rows=[];
    for(const [id,label]of [['hp','生命'],['coins','功德'],['orbs','凝息珠']])if(cost[id])rows.push(`${label} ${s[id]} → ${s[id]-cost[id]}`);
    if(cost.key)rows.push(`${colorNames[cost.key.color]}钥 ${s.keys[cost.key.color]} → ${s.keys[cost.key.color]-(cost.key.amount||1)}`);
    return rows.join(' · ');
  }
  function opportunityText(group,option){
    const costs={bellVow:{offering:'宝龛北门保持关闭；仍可正面战精英取宝。',passage:'放弃这一份防御 +2；避战也不获得精英功德。'},ferryVow:{offering:'渡灯栈道保持关闭；仍可选择低水或高水渡口。',passage:'放弃这一份生命 +90；另消耗一把黄钥。'},emberVow:{offering:'心炉烬北径保持关闭；仍可正面战精英取宝。',passage:'放弃这一份防御 +4；异宝仍须在莲灯佩戴。'}};
    return option.opportunityCost||costs[group]?.[option.id]||'';
  }
  function choice(e){
    if(!engine.isCurrent(e))return;stopPath();clearSurfaces();collapseStory(true);presentation.closeCast();decisionEntity=e;decisionSelection=null;ritualOpen=true;ritualResult='先选一项比较；确认前不会消耗或封存。';document.body.dataset.ritual='true';$('altar-ritual').hidden=false;renderRitual();$('altar-ritual').focus({preventScroll:true});
  }
  function decisionSummary(group,option){
    const found={bellVow:['iron','定海铁',2,'北门'],emberVow:['ember','心炉烬',4,'北径']}[group];
    if(found&&engine.state.treasures.includes(found[0]))return option.id==='passage'?`${found[1]}已寻回；只增${found[3]}通路，仍舍弃防御 +${found[2]}。`:`${found[3]}仍闭；${found[1]}已寻回，不影响已得法器。`;
    const summaries={locks:{blue:'需战灰烬沙弥；北匣领取攻击成长。其余两契封存。',gold:'需战余毒蛇使；北匣领取防御与治疗，余毒无视防御。',free:'保留钥匙，需战铜铃怨灵与小妖；北匣领取功德。'},sevenWounds:{rescue:'打开十五层援手侧门，可绕藏经无相；经门机关仍需完成。',power:'三名映身暂留灯下；援手侧门关闭，仍可正面通行。'},bellVow:{offering:'北门仍闭，取定海铁须战精英，也可回访。',passage:'舍弃防御 +2，绕精英取定海铁；不获精英功德。'},ferryVow:{offering:'保留黄钥，西缘栈道仍闭；可切换高低水位渡路。',passage:'舍弃生命 +90，避西渡灯魂与傀儡；不获其功德。'},emberVow:{offering:'北径仍闭；异宝可战精英取得，也可放弃。',passage:'舍弃防御 +4，避精英取心炉烬；仍须配装才生效。'}};
    const consequence=TowerOutcomes.consequences(engine,group,option.id);return (summaries[group]?.[option.id]||option.description)+(consequence?.targets.length?' 去向：'+consequence.targets.map(t=>t.label).join('、')+'。':'');
  }
  function decide(id){
    const e=decisionEntity;if(!ritualOpen||!e||id!==decisionSelection)return;
    if(!TowerChoiceFeedback.describe(engine,e,id).allowed){renderDecision(true);return;}
    if(e.type==='cache'){const target=currentFloor().entities.find(a=>a.type==='choice'&&a.choice===e.choice&&a.option===id);closeRitual();if(target)focusTarget(engine.state.floor,target.x,target.y);return;}
    const before=engine.snapshot();
    if(engine.choose(e,id)){const result=TowerChoiceFeedback.settled(engine,e,id,before);scenePointerAfter=performance.now()+300;closeRitual();
      // One visible receipt with actual settled balances, not a second copy in a note.
      clearTimeout(whisperTimer);document.querySelector('[data-journey-note]').hidden=true;
      const row=document.querySelector('[data-journey-result]');row.hidden=false;row.dataset.kind='choice';row.querySelector('b').textContent=result.title;row.querySelector('span').textContent=result.text;
      $('status-message').textContent=result.title+' · '+result.text;clearTimeout(receiptTimer);receiptTimer=setTimeout(()=>{row.hidden=true;scheduleContext();},6500);scheduleContext();
    }else renderDecision(true);
  }
  function previewDecision(id){
    if(!ritualOpen||!decisionEntity||!TowerData.choices[decisionEntity.choice]?.options.some(o=>o.id===id))return;
    decisionSelection=id;renderDecision();const button=$('altar-ritual').querySelector(`[data-choice="${id}"]`);button?.focus({preventScroll:true});if(button){const b=button.getBoundingClientRect(),panel=$('altar-ritual').querySelector('.ritual-offerings').getBoundingClientRect();if(b.top<panel.top||b.bottom>panel.bottom)button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
  }
  function renderDecision(attempted=false){
    const e=decisionEntity,s=engine.state,node=$('altar-ritual'),spec=TowerData.choices[e.choice];if(!spec)return;
    const active=document.activeElement,focusChoice=active?.dataset.choice,focusConfirm=active?.hasAttribute('data-choice-confirm'),preview=e.type==='cache',chosen=s.choices[e.choice];
    node.dataset.purpose='choice';node.dataset.choiceCount=spec.options.length;node.style.width=spec.options.length===3?'840px':'700px';node.setAttribute('aria-label',spec.title);node.querySelector('.ritual-heading>span').textContent=spec.title;node.querySelector('[data-ritual-help]').hidden=true;
    node.querySelector('[data-ritual-coins]').textContent=['bellVow','emberVow'].includes(e.choice)?`当前防御 ${engine.effectiveStats().def}`:e.choice==='locks'?`铜钥 ${s.keys.yellow} · 青钥 ${s.keys.blue}`:e.choice==='ferryVow'?`生命 ${s.hp} · 铜钥 ${s.keys.yellow}`:`生命 ${s.hp} · 功德 ${s.coins}`;
    const options=node.querySelector('.ritual-offerings');options.setAttribute('role','radiogroup');options.setAttribute('aria-label','比较取舍，选择后仍须确认');options.style.gridTemplateColumns=`repeat(${spec.options.length},1fr)`;
    options.innerHTML=spec.options.map((o,i)=>{const p=engine.choicePreview(e,o.id),selected=decisionSelection===o.id,cost=paymentText(o.cost),reward=p.rewardAlreadyClaimed?'旧档成长已领取':resourceText(p.reward);return `<button class="decision-petal ${selected?'selected':''}" data-choice="${esc(o.id)}" role="radio" aria-checked="${selected}" tabindex="${selected||!decisionSelection&&i===0?0:-1}"><span class="decision-option"><kbd>${i+1}</kbd><b>${esc(o.label.split(' · ')[0])}</b><i aria-hidden="true">${selected?'●':'○'}</i></span><span class="decision-reward"><small>${spec.grant==='cache'?'抵达北匣后领取':'可获得'}</small>${reward.split(/ · |；/).map(fact=>`<span>${esc(fact)}</span>`).join('')}</span>${cost!=='无'?`<span class="decision-cost">支付 ${esc(cost)}</span>`:''}<span class="decision-consequence"><small>取舍</small>${esc(decisionSummary(e.choice,o))}</span><span class="decision-state">${chosen===o.id?'已定此念':selected?'已选中 · 尚未生效':!preview&&p.reason?esc(p.reason):'点击比较'}</span></button>`;}).join('');
    const model=TowerChoiceFeedback.describe(engine,e,decisionSelection),allowed=model.allowed;
    node.dataset.decisionState=model.status;
    node.querySelector('.ritual-minor').innerHTML=`<div class="decision-feedback ${attempted?'decision-attention':''}" data-feedback-state="${model.status}" aria-label="${esc(model.announcement)}"><strong data-decision-status>${esc(model.headline)}</strong>${model.reason?`<p class="decision-blocker" data-decision-reason>${esc(model.reason)}</p>`:''}${model.rows.length?`<div class="decision-preview"><small>${esc(model.previewTitle)}</small>${model.rows.map(line=>`<span>${esc(line)}</span>`).join('')}</div>`:''}<p class="decision-next" id="decision-next">${esc(model.next)}</p></div><div class="decision-confirm-actions"><button data-choice-confirm aria-describedby="decision-next" ${allowed?'':'disabled'}>${esc(model.buttonLabel)}${allowed?' <kbd>Enter</kbd>':''}</button>${model.guide?`<button data-decision-guide>${esc(model.guide.label)} ↗</button>`:''}</div>`;
    node.querySelector('[data-ritual-result]').textContent=attempted?'本次未生效；条件满足后才可确认。':model.picked?`已选${model.name} · ${preview?'尚未领取':allowed?'确认才生效':'尚未生效，未扣费'}`:'选择只比较；确认才会生效。';
    node.querySelector('[data-ritual-close]').innerHTML=(preview?'返回场景':'暂不决定')+' <kbd>Esc</kbd>';node.querySelector('[data-ritual-bag]').innerHTML='查看行囊 <kbd>I</kbd>';
    node.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>previewDecision(b.dataset.choice));node.querySelector('[data-choice-confirm]').onclick=()=>decide(decisionSelection);
    node.querySelector('[data-decision-guide]')?.addEventListener('click',()=>{const target=model.guide?.target;closeRitual();if(target)focusTarget(s.floor,target.x,target.y);else guideAction();});
    if(focusChoice)node.querySelector(`[data-choice="${focusChoice}"]`)?.focus({preventScroll:true});else if(focusConfirm&&allowed)node.querySelector('[data-choice-confirm]').focus({preventScroll:true});positionRitual();
  }
  function choiceHTML(e){
    const spec=TowerData.choices[e.choice];if(!spec)return '';
    return `<p>同组只取一项，确认前可比较收益与代价。</p><button class="context-button" data-context="choice">比较全部取舍</button>`;
  }

  function cloneLimit(d){if(d.target){engine.select(d.target.x,d.target.y);sceneDetail={key:sceneTargetKey(),kind:'recall'};updateContext();}}

  function cast(mode,x,y){renderer.skipEffects?.();const ok=engine.useAbility(mode,x,y);if(ok){engine.setMode('walk');engine.select(x,y);}return ok;}
  function inspectSettings(){
    const prefs=settings();return `<h3>行者偏好</h3><label class="setting-row"><input type="checkbox" id="setting-zero" ${prefs.quickZero?'checked':''}><span><b>零损敌情精简显示</b><small>只精简零损目标的说明；任何战斗都仍须明确迎战。</small></span></label><label class="setting-row"><input type="checkbox" id="setting-damage" ${prefs.showDamage?'checked':''}><span><b>地图常显战损</b><small>直接在守卫旁显示当前损失，火眼金睛仍可查看公式。</small></span></label><label class="setting-row setting-select"><span><b>动作与演出</b><small>${systemMotion.matches?'系统已要求减弱动态，当前始终使用减弱模式。':'标准保留完整动作；简洁缩短过程；减弱使用静态状态反馈。'}跳过演出不会改变结算。</small></span><select id="setting-motion" aria-label="动作与演出"><option value="standard" ${prefs.motion==='standard'?'selected':''}>标准</option><option value="simple" ${prefs.motion==='simple'?'selected':''}>简洁</option><option value="reduced" ${prefs.motion==='reduced'?'selected':''}>减弱动态</option></select></label><label class="setting-row"><input type="checkbox" id="setting-shake" ${prefs.screenShake?'checked':''} ${effectiveMotion()!=='standard'?'disabled':''}><span><b>受击震动</b><small>默认关闭，仅标准动作模式生效。</small></span></label><label class="setting-row"><input type="checkbox" id="setting-music" ${prefs.music?'checked':''}><span><b>章节音乐</b><small>六章独立旋律，静思时留白，行动后加入节奏。</small></span></label><label class="setting-row"><input type="checkbox" id="setting-sfx" ${prefs.sfx?'checked':''}><span><b>动作与机关音效</b><small>金箍、青蝉、分身、钥匙材质各有声音；与音乐独立。</small></span></label><p class="muted">声音首次开启需浏览器授权播放；设置保存在当前浏览器。</p>`;
  }
  function bindSettings(){bindCastFrequency();for(const [id,key]of [['setting-zero','quickZero'],['setting-damage','showDamage'],['setting-shake','screenShake'],['setting-music','music'],['setting-sfx','sfx']])$(id)?.addEventListener('change',ev=>{if(key==='music'||key==='sfx')audio.unlock();setPreference(key,ev.target.checked);});$('setting-motion')?.addEventListener('change',ev=>{setPreference('motion',ev.target.value);if($('setting-shake'))$('setting-shake').disabled=effectiveMotion()!=='standard';if(effectiveMotion()==='reduced')renderer.skipEffects?.();});}
  function bindCastFrequency(){
    if(!$('setting-cast-frequency'))$('setting-motion')?.closest('.setting-row')?.insertAdjacentHTML('afterend',`<label class="setting-row setting-select"><span><b>神通演出频率</b><small>首次看清动作，之后用场景光效与费用提示；关键剧情始终保留。</small></span><select id="setting-cast-frequency" aria-label="神通演出频率"><option value="adaptive" ${castFrequency==='adaptive'?'selected':''}>首次完整，之后场景反馈</option><option value="always" ${castFrequency==='always'?'selected':''}>每次完整演出</option></select></label>`);
    $('setting-cast-frequency')?.addEventListener('change',ev=>{castFrequency=ev.target.value;try{localStorage.setItem('dasheng-cast-frequency-v13',castFrequency);}catch{}});
  }
  function atLantern(){return currentFloor().entities.some(e=>e.type==='altar'&&e.x===engine.state.x&&e.y===engine.state.y);}
  function treasureHTML(){
    const s=engine.state,owned=s.treasures||[],equipped=s.equipped||[],near=atLantern();
    return `<section class="treasure-section"><div class="treasure-heading"><h3>六器行装</h3><span>佩戴 ${equipped.length} / 2</span></div><p class="muted">法器各有代价，最多佩戴两件；必须站在莲灯上才能装卸。${near?'此刻可调整行装。':'查看敌情后，再决定以何种行装出发。'}</p><div class="treasure-grid">${treasureList().map((t,i)=>{const has=owned.includes(t.id),on=equipped.includes(t.id),f=TowerData.floors.findIndex(f=>f.entities.some(e=>e.type==='treasure'&&e.treasure===t.id));return `<article class="treasure-card ${has?'owned':''} ${on?'equipped':''}"><canvas class="treasure-stamp" data-treasure-icon="${esc(t.id)}" aria-hidden="true"></canvas><div><h4>${esc(t.name||t.id)}${on?'<small>已佩戴</small>':''}</h4><small>${has?'已寻回':`第 ${f>=0?f+1:'?'} 层 · 支翼精英守藏`}</small><p>${esc(treasureEffects[t.id]||t.description||'')}</p>${has?`<button class="secondary-button" data-equip="${esc(t.id)}" ${!near||(!on&&equipped.length>=2)?'disabled':''}>${on?'卸下法器':'佩戴法器'}</button>`:'<span class="unfound-treasure">尚未寻回</span>'}</div></article>`;}).join('')}</div>${!near&&owned.length?'<button class="secondary-button" data-find-lantern>在地图定位莲灯 ↗</button>':''}</section>`;
  }
  function bindTreasures(reopen){
    $('modal-content').querySelectorAll('[data-treasure-icon]').forEach(c=>TowerRenderer.icon(c,'treasure',c.dataset.treasureIcon));
    $('modal-content').querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{if(engine.equipTreasure?.(b.dataset.equip)){clearSurfaces();reopen();}});
    $('modal-content').querySelector('[data-find-lantern]')?.addEventListener('click',()=>{const e=currentFloor().entities.find(e=>e.type==='altar');if(e)focusTarget(engine.state.floor,e.x,e.y);});
  }
  function closeRitual(focus=true){const was=ritualOpen;ritualOpen=false;decisionEntity=null;decisionSelection=null;$('altar-ritual').hidden=true;delete document.body.dataset.ritual;if(was&&focus){lastInput=0;clearSceneTarget();$('game-canvas').focus({preventScroll:true});}}
  function restoreRitual(saved){
    if(saved.floor!==engine.state.floor||saved.entity&&!engine.isCurrent(saved.entity)||!saved.entity&&!atLantern()){$('game-canvas').focus({preventScroll:true});return;}
    decisionEntity=saved.entity;decisionSelection=saved.selection;ritualResult=saved.result;ritualOpen=true;document.body.dataset.ritual='true';$('altar-ritual').hidden=false;renderRitual();
    ($('altar-ritual').querySelector(`[data-choice="${decisionSelection}"]`)||$('altar-ritual').querySelector('[data-ritual-bag]')).focus({preventScroll:true});
  }
  function altar(){
    if(!atLantern()){toast('站到莲灯上，才可修心。');return;}
    clearSurfaces();decisionEntity=null;collapseStory(true);presentation.closeCast();ritualOpen=true;ritualResult='修行消耗功德；调息只恢复灵息。';document.body.dataset.ritual='true';$('altar-ritual').hidden=false;renderRitual();$('altar-ritual').querySelector('[data-ritual-close]').focus({preventScroll:true});
  }
  function ritualAction(action){
    if(!ritualOpen||decisionEntity||!atLantern())return;
    const before=engine.snapshot();let ok=false;
    if(['atk','def','heal'].includes(action))ok=engine.shop(action);else if(action==='mana')ok=engine.meditate();else if(action==='orb-coins')ok=engine.offerOrb('coins');else if(action==='orb-heal')ok=engine.offerOrb('heal');
    if(ok)ritualResult=action==='atk'?`攻击 ${before.atk} → ${engine.state.atk}`:action==='def'?`防御 ${before.def} → ${engine.state.def}`:action==='heal'||action==='orb-heal'?`生命 ${before.hp} → ${engine.state.hp}`:action==='orb-coins'?`功德 ${before.coins} → ${engine.state.coins}`:'灵息已补满';
    renderRitual();
  }
  function renderRitual(){
    if(!ritualOpen)return;if(decisionEntity){renderDecision();return;}const s=engine.state,node=$('altar-ritual'),focused=document.activeElement?.closest('[data-ritual-action]')?.dataset.ritualAction;
    node.dataset.purpose='lotus';delete node.dataset.choiceCount;node.style.width='600px';node.setAttribute('aria-label','莲灯修心');node.querySelector('.ritual-heading>span').textContent='莲灯 · 修心';node.querySelector('.ritual-offerings').style.gridTemplateColumns='';node.querySelector('.ritual-offerings').removeAttribute('role');node.querySelector('.ritual-offerings').removeAttribute('aria-label');node.querySelector('[data-ritual-bag]').innerHTML='行囊 <kbd>I</kbd>';node.querySelector('[data-ritual-close]').innerHTML='离开莲灯 <kbd>Esc</kbd>';
    node.querySelector('[data-ritual-coins]').innerHTML=`<span>功德 <strong>${s.coins}</strong> 金</span><span>凝息珠 <strong>${s.orbs}</strong></span>`;
    node.querySelector('.ritual-offerings').innerHTML=[['atk','item_atk','磨砺金箍','攻击 +3'],['heal','item_peach','灯前疗伤','生命 +120'],['def','item_def','淬炼护身','防御 +3']].map(([id,asset,title,benefit],i)=>{const cost=engine.shopCost(id),lack=Math.max(0,cost-s.coins);return `<button class="ritual-petal" data-ritual-action="${id}" ${lack?'disabled':''}><kbd>${i+1}</kbd><canvas width="160" height="160" data-asset="${asset}" aria-hidden="true"></canvas><span>${title}</span><small>${benefit}</small><span class="ritual-price">${cost} 金</span><em>${lack?'还差 '+lack+' 金':'点击供奉'}</em></button>`;}).join('');
    node.querySelector('.ritual-minor').innerHTML=`<button data-ritual-action="mana" ${s.mana===s.maxMana?'disabled':''}><kbd>4</kbd><span>调息</span><small>${s.mana===s.maxMana?'灵息已满':'免费 · 补满灵息'}</small></button><button data-ritual-action="orb-coins" ${!s.orbs?'disabled':''}><kbd>5</kbd><span>奉珠换金</span><small>1 珠 → 8 金</small></button><button data-ritual-action="orb-heal" ${!s.orbs?'disabled':''}><kbd>6</kbd><span>奉珠疗伤</span><small>1 珠 → 50 命</small></button>`;
    node.querySelector('[data-ritual-result]').textContent=ritualResult;node.querySelector('[data-ritual-help]').hidden=false;paintAssetIcons(node);node.querySelectorAll('[data-ritual-action]').forEach(b=>b.onclick=()=>ritualAction(b.dataset.ritualAction));positionRitual();
    if(focused){const next=node.querySelector(`[data-ritual-action="${focused}"]`);(next&&!next.disabled?next:node.querySelector('[data-ritual-close]')).focus({preventScroll:true});}
  }
  function positionRitual(){
    if(!ritualOpen)return;const origin=decisionEntity||engine.state,a=sceneAnchor(origin.x,origin.y),node=$('altar-ritual');if(decisionEntity)node.style.width=TowerData.choices[decisionEntity.choice].options.length===3?'840px':Math.min(700,Math.max(560,innerWidth-680))+'px';const h=node.offsetHeight,w=node.offsetWidth;
    const player=sceneAnchor(engine.state.x,engine.state.y),clampX=x=>Math.max(20,Math.min(innerWidth-w-20,x)),clampY=y=>{const top=decisionEntity&&h<innerHeight-250?112:16,bottom=h<innerHeight-250?100:16;return Math.max(top,Math.min(innerHeight-h-bottom,y));},subjects=[a.bounds,player.bounds].map(r=>expandRect(r,12));
    const positions=[{x:a.foot.x-w/2,y:Math.min(a.bounds.y,player.bounds.y)-h-22},{x:a.foot.x-w/2,y:Math.max(a.foot.y,player.foot.y)+22},{x:Math.min(a.bounds.x,player.bounds.x)-w-24,y:a.foot.y-h/2},{x:Math.max(a.bounds.x+a.bounds.w,player.bounds.x+player.bounds.w)+24,y:a.foot.y-h/2}];
    const best=positions.map(p=>({x:clampX(p.x),y:clampY(p.y)})).map(p=>({...p,score:subjects.reduce((n,r)=>n+rectOverlap({...p,w,h},r)*40,0)+visibleObstacles().reduce((n,r)=>n+rectOverlap({...p,w,h},r)*4,0)+Math.hypot(p.x+w/2-a.foot.x,p.y+h/2-a.foot.y)})).sort((a,b)=>a.score-b.score)[0];
    node.style.left=best.x+'px';node.style.top=best.y+'px';
  }

  function renderHUD(){
    const s=engine.state,f=TowerData.floors[s.floor];
    viewStatus();
    const prefs=settings();document.body.dataset.motion=effectiveMotion();document.body.dataset.chapter=String(Math.floor(s.floor/3));document.body.dataset.mode=engine.mode;audio.configure(prefs,Math.floor(s.floor/3));
    const effective=engine.effectiveStats?.()||s;
    $('hud-hp').textContent=s.hp;$('hud-mana').textContent=s.mana+' / '+s.maxMana;$('hud-mana-bar').style.setProperty('--breath',Math.max(0,Math.min(100,s.mana/s.maxMana*100))+'%');$('hud-keys').innerHTML=['yellow','blue','red'].map(color=>`<span title="${colorNames[color]}钥匙 ${s.keys[color]} 把" aria-label="${colorNames[color]}钥匙 ${s.keys[color]} 把"><canvas width="32" height="32" data-asset="item_key_${color}" aria-hidden="true"></canvas><b>${s.keys[color]}</b></span>`).join('');paintAssetIcons($('hud-keys'));
    $('hud-coins').textContent=s.coins;
    $('hp-value').textContent=s.hp;$('atk-value').innerHTML=effective.atk===s.atk?s.atk:`${effective.atk}<small>基 ${s.atk}</small>`;$('def-value').innerHTML=effective.def===s.def?s.def:`${effective.def}<small>基 ${s.def}</small>`;$('mana-value').textContent=s.mana+' / '+s.maxMana;$('coins-value').textContent=s.coins;
    for(const c of ['yellow','blue','red'])$('key-'+c).textContent=s.keys[c];
    $('floor-number').textContent=String(s.floor+1).padStart(2,'0');$('floor-name').textContent=f.name;$('floor-subtitle').textContent=f.subtitle;
    $('floor-objective').textContent=s.floor===4&&s.quests.locksLegacy?'旧档灵晶修为已承续。选契开通道路，前往北端塔阶；共鸣匣不再重复发奖。':f.objective;
    if($('floor-depth')){const d=f.depth;$('floor-depth').innerHTML=d?`<section class="depth-planning"><span>此层一问</span><h3>${esc(d.question)}</h3><p class="depth-tradeoff">${esc(d.opportunityCost)}</p><details><summary>一念提醒</summary><p>${esc(d.insight)}</p></details><div class="depth-targets">${(d.objectives||[]).map(t=>`<button data-focus-x="${t.x}" data-focus-y="${t.y}" title="定位 ${esc(t.text)}">${esc(t.text)} <span>↗</span></button>`).join('')}</div></section>`:'';bindFocus($('floor-depth'));}
    $('location-label').textContent=`第 ${s.floor+1} / ${TowerData.floors.length} 层 · ${['辨真','合塔','弱水','炼炉','善念','归真'][Math.floor(s.floor/3)]}篇`;
    $('floor-progress').textContent=`心印 ${s.relics.length}/5 · 外舍利 ${externalCount()}/16`;
    const narrative=engine.narrativeStatus?.();if($('narrative-goal')){$('narrative-goal').textContent=narrative?.goal||f.objective;$('narrative-goal').setAttribute('aria-label',(narrative?.heading||'当前主线')+'：'+(narrative?.goal||f.objective));}
    if($('external-count'))$('external-count').textContent=externalCount()+' / 16';
    $('relic-count-label').textContent=s.relics.length+' / 5';
    if($('status-turn'))$('status-turn').textContent=`${s.turn} 步因果`;
    $('mode-label').textContent=modeHint(engine.mode);
    $('relic-slots').innerHTML=TowerData.relics.map((r,i)=>`<span class="relic-slot ${s.relics.includes(i)?'awakened':''}" title="${esc(r.name+' · '+(abilityNames[r.ability]||r.ability))}"><span>${s.relics.includes(i)?'✦':'◇'}</span><small>${esc(r.name.replace('舍利','').replace('心印',''))}</small></span>`).join('');
    document.querySelectorAll('[data-mode]').forEach(b=>{const required={staff:0,morph:1,clone:2}[b.dataset.mode],locked=required!==undefined&&!s.relics.includes(required);b.classList.toggle('active',engine.mode===b.dataset.mode);b.classList.toggle('locked',locked);b.dataset.cost=locked?'未觉':required===undefined?(b.dataset.mode==='walk'?'行走':'免费'):abilityCost(b.dataset.mode)+'息';b.setAttribute('aria-pressed',engine.mode===b.dataset.mode);if(b.querySelector('small'))b.querySelector('small').textContent=locked?'第 '+[3,6,9][required]+' 层觉醒':({walk:'自在探索',inspect:'洞察 · 无消耗',staff:`${abilityCost('staff')} 灵息 · 相邻断口`,morph:`${abilityCost('morph')} 灵息 · 相邻铁栅`,clone:`${abilityCost('clone')} 灵息 · 四格阵眼`})[b.dataset.mode];b.removeAttribute('title');b.dataset.description=locked?'第 '+[3,6,9][required]+' 层解开心印后觉醒':modeHelp(b.dataset.mode);b.setAttribute('aria-label',modeNames[b.dataset.mode]+'，'+b.dataset.description);});
    $('btn-undo').disabled=!engine.history.length;
    if($('btn-redo'))$('btn-redo').disabled=!engine.redoHistory?.length;
    const cs=engine.cloneStatus?.();if($('clone-status'))$('clone-status').textContent=s.relics.includes(2)?`分身 ${cs?.active?.length||0}${Number.isFinite(cs?.limit)?' / '+cs.limit:' 驻守'}${Number.isFinite(cs?.limit)?' · 可回收':''}`:'五印渐解 · 神通觉醒';
    const availableRevisits=(TowerData.revisits||[]).filter(r=>s.relics.includes(r.relic)&&!revisitDone(r));if($('revisit-count')){$('revisit-count').textContent=availableRevisits.length?String(availableRevisits.length):'';$('revisit-count').classList.toggle('hidden',!availableRevisits.length);}
    $('event-log').innerHTML=s.log.slice(0,5).map(l=>`<div class="log-entry ${esc(l.kind)}"><span class="log-dot"></span><p>${esc(l.text)}</p></div>`).join('');
    updateContext();renderGuidance();if(ritualOpen)renderRitual();
  }
  function explorationView(){renderer.setOverview?.(false);viewStatus();}
  function syncSceneGuard(){
    if(!renderer.setPlayerGuard)return;const canvas=$('game-canvas').getBoundingClientRect(),bar=$('ability-bar').getBoundingClientRect();
    const rect=started&&bar.width&&bar.height?{x:bar.left-canvas.left,y:bar.top-canvas.top,w:bar.width,h:bar.height}:null,key=rect?[rect.x,rect.y,rect.w,rect.h].map(value=>value.toFixed(2)).join(':'):'none';
    if(key===lastGuardKey)return;lastGuardKey=key;renderer.setPlayerGuard(rect);
  }
  function scheduleContext(){if(contextFrame)return;contextFrame=requestAnimationFrame(()=>{contextFrame=0;positionGuidance();positionContext();positionStory();});}
  function positionGuidance(){
    const node=$('journey-guide');if(!started||!node.getClientRects().length)return;const w=node.offsetWidth,h=node.offsetHeight,player=sceneAnchor(engine.state.x,engine.state.y),target=guideTarget?.target,subjects=[player.bounds];
    if(target&&target.floor===engine.state.floor)subjects.push(sceneAnchor(target.x,target.y).bounds);
    const candidates=[{x:innerWidth-w-24,y:151},{x:24,y:247},{x:24,y:innerHeight-h-125},{x:innerWidth-w-24,y:innerHeight-h-125}],obstacles=visibleObstacles(node);
    const best=candidates.map((p,i)=>({x:Math.max(16,Math.min(innerWidth-w-16,p.x)),y:Math.max(145,Math.min(innerHeight-h-112,p.y)),i})).map(p=>({...p,score:subjects.reduce((n,r)=>n+rectOverlap({...p,w,h},expandRect(r,10))*50,0)+obstacles.reduce((n,r)=>n+rectOverlap({...p,w,h},r)*5,0)+p.i*10})).sort((a,b)=>a.score-b.score)[0];
    node.style.left=best.x+'px';node.style.top=best.y+'px';node.style.right='auto';node.style.bottom='auto';
  }
  function positionStory(){
    const dock=$('story-dock');if(!started||!activeStory||storyCollapsed||surfaceOpen||ritualOpen||presentation.entryOpen||presentation.castOpen)return;
    dock.style.top='';dock.style.bottom='';const rect=dock.getBoundingClientRect(),player=sceneAnchor(engine.state.x,engine.state.y),speaker=currentFloor().entities.find(e=>e.id===activeStory.source),subjects=[player.bounds];if(speaker)subjects.push(sceneAnchor(speaker.x,speaker.y).bounds);
    if(subjects.some(bounds=>rectOverlap({x:rect.x,y:rect.y,w:rect.width,h:rect.height},expandRect(bounds,10))>0)){
      const top=Math.min(...subjects.map(b=>b.y))-rect.height-18;dock.style.top=Math.max(175,Math.min(innerHeight-rect.height-120,top))+'px';dock.style.bottom='auto';
    }
  }
  function rectOverlap(a,b){return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));}
  function expandRect(rect,pad=6){return {x:rect.x-pad,y:rect.y-pad,w:rect.w+pad*2,h:rect.h+pad*2};}
  function visibleObstacles(except=null){
    return [...document.querySelectorAll('.hud-vitals,.floor-header,.header-center,.header-tools,.map-toolbar,.ability-bar,.board-bottomline,.mobile-controls,#journey-guide,#story-dock:not(.hidden),#toast.visible,#style-progress:not(.hidden)')].filter(el=>el!==except&&el.checkVisibility({checkVisibilityCSS:true})).map(el=>{const rect=el.getBoundingClientRect();return {x:rect.x,y:rect.y,w:rect.width,h:rect.height};}).filter(rect=>rect.w>0&&rect.h>0).map(rect=>expandRect(rect,7));
  }
  function sceneAnchor(x,y){
    const box=$('game-canvas').getBoundingClientRect(),v=renderer.getViewport?.()||{},cell=v.cellSize||box.width/(v.w||13),entity=engine.getEntity(x,y),actor=entity&&['enemy','npc','rescue'].includes(entity.type),point=renderer.screenPoint?.(x,y),raw=renderer.anchorFor?.(x,y,{moving:true});
    const foot=raw?.foot||{x:point?.x??(v.offsetX||0)+(x-(v.x||0)+.5)*cell,y:(point?.y??(v.offsetY||0)+(y-(v.y||0)+.5)*cell)+(actor ? .35 : .12)*cell};
    const bounds=raw?.bounds||{x:foot.x-cell*.42,y:foot.y-cell*(actor?1.2:.7),w:cell*.84,h:cell*(actor?1.2:.7)};
    return {foot:{x:box.left+foot.x,y:box.top+foot.y},bounds:{x:box.left+bounds.x,y:box.top+bounds.y,w:bounds.w??bounds.width,h:bounds.h??bounds.height},visible:raw?.visible??!!point,cell};
  }
  function hideTargetLink(){ $('target-link').classList.add('hidden');$('target-direction').classList.add('hidden'); }
  function showTargetDirection(anchor,obstacles){
    const button=$('target-direction'),sel=engine.selection,e=sel&&engine.getEntity(sel.x,sel.y),name=e?.type==='enemy'?TowerData.enemies[e.enemy].name:e?.label||e?.name||$('context-title').textContent;
    const dx=anchor.foot.x-innerWidth/2,dy=anchor.foot.y-innerHeight/2,angle=Math.atan2(dy,dx),halfW=Math.max(20,innerWidth/2-80),halfH=Math.max(20,innerHeight/2-30),factor=Math.min(halfW/Math.max(.01,Math.abs(dx)),halfH/Math.max(.01,Math.abs(dy)));
    const point={x:innerWidth/2+dx*factor,y:innerHeight/2+dy*factor};
    button.classList.toggle('compact',innerWidth<500);button.classList.remove('hidden');$('target-direction-name').textContent=name;$('target-direction-arrow').textContent='➤';$('target-direction-arrow').style.transform=`rotate(${angle}rad)`;
    const names=['东','东南','南','西南','西','西北','北','东北'],oct=(Math.round(angle/(Math.PI/4))+8)%8;button.setAttribute('aria-label',`所选${name}在${names[oct]}侧画外，点击移近视野`);
    const w=button.offsetWidth||130,h=button.offsetHeight||32,vertical=Math.abs(dx)/halfW>Math.abs(dy)/halfH;
    const candidates=[0,-50,50,-100,100,-150,150].map(offset=>({x:Math.max(10,Math.min(innerWidth-w-10,point.x-w/2+(vertical?0:offset))),y:Math.max(10,Math.min(innerHeight-h-10,point.y-h/2+(vertical?offset:0)))}));
    const best=candidates.map(candidate=>({...candidate,score:obstacles.reduce((total,rect)=>total+rectOverlap({...candidate,w,h},rect)*25,0)+Math.hypot(candidate.x+w/2-point.x,candidate.y+h/2-point.y)})).sort((a,b)=>a.score-b.score)[0];
    if(obstacles.some(rect=>rectOverlap({...best,w,h},rect)>0)){button.classList.add('hidden');return;}
    button.style.left=Math.round(best.x)+'px';button.style.top=Math.round(best.y)+'px';
  }
  function positionContext(){
    const card=document.querySelector('.context-card');
    if(!started||!engine.selection||!card?.classList.contains('has-selection')||surfaceOpen||ritualOpen||presentation.entryOpen||presentation.castOpen||document.body.dataset.speaking==='true'||document.body.dataset.character){hideTargetLink();return;}
    const sel=engine.selection,anchor=sceneAnchor(sel.x,sel.y),foot=anchor.foot,obstacles=visibleObstacles();
    card.dataset.targetX=foot.x.toFixed(2);card.dataset.targetY=foot.y.toFixed(2);
    if(!anchor.visible||foot.x<2||foot.y<2||foot.x>innerWidth-2||foot.y>innerHeight-2){card.classList.add('offscreen');card.setAttribute('aria-hidden','true');$('target-link').classList.add('hidden');showTargetDirection(anchor,obstacles);return;}
    card.classList.remove('offscreen');card.setAttribute('aria-hidden','false');$('target-direction').classList.add('hidden');
    const w=card.offsetWidth,h=card.offsetHeight;if(!w||!h){$('target-link').classList.add('hidden');return;}
    const bounds=expandRect(anchor.bounds,6),gap=15,player=sceneAnchor(engine.state.x,engine.state.y),playerBounds=expandRect(player.bounds,8);
    const candidates=[
      {side:'right',x:bounds.x+bounds.w+gap,y:foot.y-h*.5,bias:0},
      {side:'left',x:bounds.x-w-gap,y:foot.y-h*.5,bias:1},
      {side:'above',x:foot.x-w*.5,y:bounds.y-h-gap,bias:3},
      {side:'below',x:foot.x-w*.5,y:bounds.y+bounds.h+gap,bias:7},
      {side:'above-right',x:bounds.x+bounds.w+gap,y:bounds.y-h-gap,bias:4},
      {side:'above-left',x:bounds.x-w-gap,y:bounds.y-h-gap,bias:5},
      {side:'below-right',x:bounds.x+bounds.w+gap,y:bounds.y+bounds.h+gap,bias:8},
      {side:'below-left',x:bounds.x-w-gap,y:bounds.y+bounds.h+gap,bias:9}
    ];
    for(const candidate of candidates.slice()){for(const obstacle of [...obstacles,playerBounds,bounds]){if(!rectOverlap({...candidate,w,h},obstacle))continue;candidates.push({...candidate,x:obstacle.x+obstacle.w+8,bias:candidate.bias+5},{...candidate,x:obstacle.x-w-8,bias:candidate.bias+5},{...candidate,y:obstacle.y-h-8,bias:candidate.bias+5},{...candidate,y:obstacle.y+obstacle.h+8,bias:candidate.bias+5});}}
    // Expanded reading in a narrow PC pane must begin below the survival HUD.
    const readingTop=card.classList.contains('expanded')&&innerWidth<=760?Math.max(10,...[...document.querySelectorAll('.hud-vitals,.header-tools,.floor-header')].filter(n=>n.checkVisibility({checkVisibilityCSS:true})).map(n=>n.getBoundingClientRect().bottom+10)):10;
    const scored=candidates.map(candidate=>{
      const x=Math.max(10,Math.min(innerWidth-w-10,candidate.x)),y=Math.max(readingTop,Math.min(innerHeight-h-10,candidate.y)),rect={x,y,w,h};
      const targetPenalty=rectOverlap(rect,bounds)*55,playerPenalty=rectOverlap(rect,playerBounds)*50,hudPenalty=obstacles.reduce((total,obstacle)=>total+rectOverlap(rect,obstacle)*28,0);
      const edgeX=Math.max(x,Math.min(x+w,foot.x)),edgeY=Math.max(y,Math.min(y+h,foot.y)),distance=Math.hypot(edgeX-foot.x,edgeY-foot.y);
      return {...candidate,x,y,score:targetPenalty+playerPenalty+hudPenalty+distance*.36+Math.hypot(x+w*.5-foot.x,y+h*.5-foot.y)*.025+candidate.bias+(anchorPlacement&&candidate.side!==anchorPlacement?3:0)};
    }).sort((a,b)=>a.score-b.score);
    const best=scored[0];anchorPlacement=best.side;card.dataset.placement=best.side;card.style.left=best.x.toFixed(2)+'px';card.style.top=best.y.toFixed(2)+'px';card.style.right='auto';card.style.bottom='auto';
    const center={x:best.x+w/2,y:best.y+h/2},dx=foot.x-center.x,dy=foot.y-center.y,t=Math.min((w/2)/Math.max(.001,Math.abs(dx)),(h/2)/Math.max(.001,Math.abs(dy)));
    const start={x:center.x+dx*t,y:center.y+dy*t},length=Math.max(1,Math.hypot(foot.x-start.x,foot.y-start.y)),ux=(foot.x-start.x)/length,uy=(foot.y-start.y)/length,tip={x:start.x+ux*7,y:start.y+uy*7};
    const svg=$('target-link');svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);svg.classList.remove('hidden');
    $('target-nib').setAttribute('points',`${start.x-uy*4},${start.y+ux*4} ${tip.x},${tip.y} ${start.x+uy*4},${start.y-ux*4}`);
    $('target-thread').setAttribute('d',`M ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${foot.x.toFixed(2)} ${foot.y.toFixed(2)}`);$('target-foot').setAttribute('cx',foot.x.toFixed(2));$('target-foot').setAttribute('cy',foot.y.toFixed(2));
  }
  function modeHint(mode){return {walk:'行走 · 方向键 / WASD',inspect:'火眼金睛 · 免费察看',staff:`架桥 · ${abilityCost('staff')} 灵息 · 点相邻断口`,morph:`化蝉 · ${abilityCost('morph')} 灵息 · 点相邻铁栅`,clone:`分身 · ${abilityCost('clone')} 灵息 · 四格内阵眼`}[mode]||'行走';}
  function skillHint(button){const mode=button.dataset.mode;$('mode-label').textContent=button.classList.contains('locked')?modeNames[mode]+' · '+button.dataset.description:modeHint(mode);}
  function modeHelp(mode){return {walk:'方向键 / WASD 移动，视野跟随。M 展开全图规划；机关与楼梯按 F 交互',inspect:'点选任何目标，免费查看真实规则和损失',staff:`相邻断口，耗 ${abilityCost('staff')} 灵息，永久架桥；成功后回到行走`,morph:`相邻铁栅或青锁门，耗 ${abilityCost('morph')} 灵息，从内侧永久解锁；成功后回到行走`,clone:`点选四格内青色阵眼，耗 ${abilityCost('clone')} 灵息，可隔墙；满员时可免费回收`}[mode];}
  function requirementsHTML(e){const r=engine.requirements?.(e),names={sevenRescue:'七伤同行：亲自护送三名映身',sevenWounds:'完成七伤抉择',weakwater:'转动弱水水轮',bajie:'解救八戒',bellPassage:'残钟台舍弃防御 +2，补钟开门',ferryPassage:'渡灯台舍弃90生命并供一黄钥，开西缘栈道',emberPassage:'无生髓台舍弃防御 +4，燃髓开径'};return r&&!r.met?`<div class="requirement-note">尚需：${r.missing.map(v=>esc(names[v]||v)).join(' · ')}</div>`:'';}
  function compactTarget(e,tile,fullHTML){
    const s=engine.state,near=e?engine.distance(e)<=1:false,req=e&&engine.requirements?.(e),blocked=!!(req&&!req.met);
    const button=(action,label,disabled=false,key='')=>`<button class="context-button" data-context="${action}" ${disabled?'disabled':''}>${esc(label)}${key?' <kbd>'+esc(key)+'</kbd>':''}</button>`;
    let summary='',actions='';
    if(e?.type==='door'){summary=`${colorNames[e.color]}钥 ×1 · 持有 ${s.keys[e.color]}`;actions=button('door',near?'开启封门':'接近封门');}
    else if(e?.type==='npc'||e?.type==='monument'){const d=npcDialogue(e),read=e.type==='monument';summary=d?.objective||dialogueText(d).split('\n')[0]||(read?'碑上留有一段往事':'听一段塔中回响');actions=button('story',read?(near?'读碑':'走近读碑'):(near?'交谈':'走近交谈'),false,near?'F':'');}
    else if(e?.type==='switch'){const on=!!s.switches[e.id];summary=e.kind==='plate'?(on?'分身驻守 · 回收免费':`分身 ${abilityCost('clone')} 灵息 · 四格内`):(on?'灵脉已通':'灵脉未通');actions=e.kind==='plate'?button(on?'recall':'clone',on?'收回毫毛':'分身落阵',!on&&(engine.distance(e)>4||!s.relics.includes(2))):button('switch',near?(on?'复位扳杆':'扳动机关'):(on?'前往并复位':'前往并扳动'));}
    else if(e?.type==='gate'||e?.type==='seal'){summary=engine.isGateOpen(e)?'灵脉已开 · 可以通行':e.type==='seal'?`须 ${e.requires} 重心印 · 已有 ${s.relics.length}`:'灵脉未齐 · 察看关联机关';}
    else if(e?.type==='relic'){summary=`外舍利 ${externalCount()} / 16 · 五印 ${s.relics.length} / 5`;actions=button('relic',near?'尝试解印':'接近心印');}
    else if(e?.type==='fragment'){summary=`第 ${Number(e.fragment)+1} 枚外舍利`;actions=button('fragment',engine.distance(e)===0?'寻回舍利':'前往寻回');}
    else if(e?.type==='treasure'){summary=(treasureEffects[e.treasure]||treasureById(e.treasure)?.description||'取得后须在莲灯佩戴').replace(/[。；].*$/,'');actions=button('treasure','寻回法器');}
    else if(e?.type==='item'||e?.type==='chest'){const it=TowerData.items[e.item];summary=e.type==='chest'&&e.requires>s.relics.length?`须 ${e.requires} 重心印 · 已有 ${s.relics.length}`:engine.itemEffect(it);actions=button('collect','前往拾取',blocked||e.type==='chest'&&e.requires>s.relics.length);}
    else if(e?.type==='stairs'){const need=engine.stairRequirement(e);summary=runSession.isTrial?'条件齐备后，在上行处确认本题':`前往第 ${e.to+1} 层 · 主动通行`;actions=button('stairs',runSession.isTrial?(near?'确认完成试炼':'走近上行处'):(near?'踏上塔阶':'前往并登阶'),need>s.relics.length||blocked||runSession.isTrial&&e.to!==runSession.trial.exitTo);}
    else if(e?.type==='altar'){summary='灵息可补满 · 生命不自复';actions=button('altar',engine.distance(e)===0?'灯前修心':'前往莲灯修心');}
    else if(e?.type==='choice'){const selected=s.choices?.[e.choice],def=TowerData.choices?.[e.choice],option=def?.options.find(o=>o.id===selected);summary=option?'已定：'+option.label:'代价与收益，定念前可比较';actions=button('choice',near?'比较取舍':'前往比较');}
    else if(e?.type==='cache'){summary=s.choices?.[e.choice]?'契约已定 · 领奖须亲自抵达':'先选契，再取共鸣之物';actions=button('cache',s.choices?.[e.choice]?'领取契物':'察看契物');}
    else if(e?.type==='illusion'){const open=!!s.revealed?.[e.id];summary=open?'幻象已破 · 真路显现':'火眼辨真 · 不耗灵息';if(!open)actions=button('reveal','照破幻壁');}
    else if(e?.type==='resonator'){const on=!!s.switches[e.id];summary=on?'此塔已归位':'校正此塔 · 隔层共鸣';if(!on)actions=button('resonator',near?'校正塔轴':'前往并校准');}
    else if(e?.type==='rescue'){const done=!!s.quests?.[e.quest];summary=done?'同道已获救':'救出同道，可开安全归路';if(!done)actions=button('rescue',near?'救出同道':'前往并解救',blocked);}
    else if(e?.type==='tide'){const low=(s.tides?.[e.group||'weakwater']||'low')==='low';summary=`当前${low?'低':'高'}水位 · 切换免费`;actions=button('tide',`改${low?'高':'低'}水位`,blocked);}
    else if(e?.type==='portal'){summary=`第 ${e.to+1} 层回廊 · 不耗灵息`;actions=button('portal',near?'穿过回廊':'前往并穿过',blocked);}
    else if(e?.type==='finale'){summary=s.selfAwakened?'无骨已明 · 可作归途之选':'五印、十六外舍利、三相之后';actions=button('finale',s.selfAwakened?'选择归途':'照见无骨');}
    else if(tile==='~'||tile==='='){const mode=tile==='~'?'staff':'morph',required=mode==='staff'?0:1;summary=`${modeNames[mode]} · ${abilityCost(mode)} 灵息`;actions=button(mode,mode==='staff'?'金箍架桥':'化蝉解栅',engine.distance(engine.selection)!==1||!s.relics.includes(required));}
    else if(tile==='w'){summary='深弱水 · 不可架桥';}
    else summary='先看清，再落子';
    if(e?.morphable){summary+=' · 青蝉可卸锁';actions+=button('morph','化蝉卸锁',!engine.abilityPreview('morph',e.x,e.y).possible);}
    if(e?.aid){summary=engine.state.quests[e.aid]?'善念南径已开 · 五印后云廊可用':e.purpose;actions+=button('aid',engine.state.quests[e.aid]?'善念已引路':e.aidText,engine.state.quests[e.aid]||!near);}
    if(e?.type==='switch'&&e.kind==='plate'&&!s.switches[e.id]){const preview=engine.abilityPreview('clone',e.x,e.y);if(!preview.possible)summary=preview.reason;}
    if(blocked){summary=e.type==='chest'&&e.requires?`心印 ${s.relics.length}/${e.requires} · 尚差 ${e.requires-s.relics.length} 重`:engine.requirements(e).missing.map(v=>({whiteGoodness:'请白衣无天打开善念南径'})[v]||v).join(' · ');actions=button('prerequisite',e.type==='chest'?'寻找下一重心印':'定位所缺条件');}
    targetDetails={title:$('context-title').textContent,html:fullHTML,e,tile};
    // A person has one conversation. Full background belongs in the journal;
    // object details describe an actual rule rather than a second narrative path.
    const detailLabel=['npc','monument'].includes(e?.type)?'':({door:'开门规则',switch:'机关规则',gate:'开启条件',seal:'解封条件',relic:'解印条件',fragment:'舍利用途',treasure:'法器说明',item:'物品说明',chest:'开匣条件',stairs:'通行条件',altar:'修心规则',choice:'契约说明',cache:'契物说明',illusion:'幻壁说明',resonator:'校准规则',rescue:'援救条件',tide:'水位规则',portal:'回廊说明',finale:'归真条件'}[e?.type]||'神通说明');
    return `<p class="target-brief">${esc(summary)}</p><div class="context-actions scene-actions">${actions}${detailLabel?`<button class="scene-rule-button" data-context="target-details" aria-expanded="${sceneDetail?.kind==='details'}">${sceneDetail?.kind==='details'?'收起说明':detailLabel}</button>`:''}</div>`;
  }
  function showTargetDetails(){if(targetDetails&&!['npc','monument'].includes(targetDetails.e?.type))toggleSceneDetail('details');}
  function sceneDetailHTML(e){
    if(!sceneDetail)return '';
    if(sceneDetail.kind==='tactics'&&e?.type==='enemy')return tacticsHTML(e);
    if(sceneDetail.kind==='door'&&e?.type==='door')return `<div class="scene-inline scene-door"><p>${esc(e.purpose||e.label||'开启后永久通行。')}</p><p>消耗一把${colorNames[e.color]}钥匙，现有 ${engine.state.keys[e.color]} 把。可按 Z 回溯。</p><button class="context-button" data-context="open-door" ${engine.distance(e)>1||!engine.state.keys[e.color]?'disabled':''}>用钥匙开启</button></div>`;
    if(sceneDetail.kind==='choice'&&e?.type==='choice')return `<div class="scene-inline scene-choice">${choiceHTML(e)}</div>`;
    if(sceneDetail.kind==='recall')return `<div class="scene-inline"><p>驻守位已满。先召回一影，再部署此处。回收免费，关联通路会同步变化。</p>${engine.cloneStatus().active.map(a=>`<button class="context-button" data-recall="${esc(a.id)}">召回 ${esc(a.label||'分身')}</button>`).join('')}</div>`;
    if(sceneDetail.kind==='dialogue'){const d=sceneDetail;return `<div class="scene-inline scene-dialogue"><div class="scene-dialogue-text">${paragraphs(d.pages[d.index])}</div><div class="scene-dialogue-controls"><span>${d.index+1} / ${d.pages.length}</span><button class="scene-rule-button" data-context="dialogue-next">${d.index+1<d.pages.length?'下一句':'听完了'} <kbd>Space</kbd></button></div></div>`;}
    let body='';
    if((sceneDetail.kind==='rules'||sceneDetail.kind==='plans')&&e?.type==='enemy'){const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy);body=(sceneDetail.kind==='plans'?`<p>准备只改变预览；明确迎战时才消耗凝息珠。</p>${sceneBossPlans(e)}`:'')+battleHTML(enemy,p,true);}
    else if(sceneDetail.kind==='details'&&targetDetails){body=targetDetails.html.replace(/<button\b[^>]*data-context=[^>]*>[\s\S]*?<\/button>/g,'');}
    return `<div class="scene-inline" data-inline-kind="${esc(sceneDetail.kind)}">${body}</div>`;
  }
  function updateContext(){
    const s=engine.state,sel=engine.selection;
    if(sceneDetail&&sceneDetail.key!==sceneTargetKey())sceneDetail=null;
    let title='观塔 · 再落子',html=`<div class="context-kicker">${esc(modeNames[engine.mode])}</div><p>${esc(modeHelp(engine.mode))}</p><div class="context-divider"></div><p class="muted">点守卫先看战损；点机关先看规则。没有计时，也没有刷怪。</p><div class="context-callout">${hintHTML(TowerData.floors[s.floor].hints?.[0]||'先看清每一条路，再决定付出什么。')}</div>`;
    if(sel){const e=engine.getEntity(sel.x,sel.y),tile=engine.getTile(sel.x,sel.y);
      if(e?.type==='enemy'){
        const enemy=TowerData.enemies[e.enemy],p=engine.preview(e.enemy),near=engine.distance(e)===1,boss=enemy.trait==='boss',locked=boss&&s.relics.length<5,route=!near&&engine.findPath(e.x,e.y),steps=route?Math.max(0,route.length-1):null;
        title=enemy.name;const plan=boss?engine.bossOptions().find(o=>o.id===s.bossPlan):null;
        html=`<p class="encounter-purpose">${esc(journey.purpose(e))} · 胜利 +${p.goldReward} 金</p><div class="forecast scene-loss ${p.survive?'safe':'danger'}"><span>${settings().quickZero&&p.possible&&p.damage===0?'无损':'损失'}</span><b class="damage-number">${p.possible?p.damage:'无法破防'}</b><small>${settings().quickZero&&p.possible&&p.damage===0?'':p.possible?(p.survive?'战后 '+(s.hp-p.damage):'将会力竭'):''}</small></div><p class="encounter-read">${esc(traitNames[enemy.trait]||'普通')} · ${p.possible?`${p.rounds} 棒 / 受击 ${p.enemyHits} 次`:'有效攻击须高于敌防'}${p.nextAttack?`<span>再加 ${p.nextAttack.delta} 攻，可少损 ${p.nextAttack.saved}</span>`:''}</p>${nearbyGrowthHTML(e)}${boss?`<p class="scene-plan-caption">${esc(plan?.label||'执棒破阵')} · ${p.resourceCost?.orbs?p.resourceCost.orbs+' 凝息珠':'保留凝息珠'}</p>`:''}<div class="context-actions scene-actions">${boss&&near?`<button class="context-button" data-context="final-battle" ${locked?'disabled':''}>三印布阵 · 步入决战 <kbd>F</kbd></button>`:''}<button class="${boss&&near?'scene-rule-button':'context-button'} ${!p.survive?'danger-engage':''}" data-context="${near?'engage':'approach-enemy'}" title="${near?'明确迎战后才结算生命与凝息珠':steps===null?'当前没有安全接近路线':'安全接近 '+steps+' 步；不会自动迎战'}" ${near&&(!p.possible||p.canAfford===false||locked)?'disabled':''}>${near?(boss?'按当前准备直接迎战':p.survive?'再前进 · 迎战':'仍战 · 力竭'):'接近'+(steps!==null?' · '+steps+' 步':'')}</button><button class="scene-rule-button" data-context="tactics" aria-expanded="${sceneDetail?.kind==='tactics'}">${sceneDetail?.kind==='tactics'?'收起':'筹算 ⌄'}</button><button class="scene-rule-button" data-context="rules" aria-expanded="${sceneDetail?.kind==='rules'}">${sceneDetail?.kind==='rules'?'收起':'规则 ⌄'}</button>${boss?`<button class="scene-rule-button" data-context="plans" aria-expanded="${sceneDetail?.kind==='plans'}">${sceneDetail?.kind==='plans'?'收起':'准备 ⌄'}</button>`:''}</div>`;
      }
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
      else if(e?.type==='npc'||e?.type==='monument'){title=e.name||'塔中残卷';const d=npcDialogue(e);html=`<p class="context-summary">${esc(dialogueText(d).split('\n')[0])}</p><button class="context-button" data-context="story">${engine.distance(e)>1?'走近 · 阅读全文':'阅读全文'}</button>`;}
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
    if(selectedEntity?.type==='chest'&&selectedEntity.item==='redKey')title='归根之匣';
    $('context-title').textContent=title;if(selectedEntity?.type!=='enemy'&&(selectedEntity||['~','=','w'].includes(selectedTile))){html=compactTarget(selectedEntity,selectedTile,html);if(targetDetails)targetDetails.title=title;}
    const bossCost=selectedEntity?.type==='enemy'&&TowerData.enemies[selectedEntity.enemy].trait==='boss'?engine.preview(selectedEntity.enemy).resourceCost?.orbs||0:0;$('context-cost').hidden=!bossCost;$('context-cost').textContent=bossCost?bossCost+' 珠':'';
    const portrait=$('context-portrait');if(portrait){const type=selectedEntity?.type;portrait.hidden=!['enemy','npc','rescue','treasure','chest','cache'].includes(type);if(!portrait.hidden){if(type==='enemy')TowerRenderer.icon(portrait,'enemy',selectedEntity.enemy);else if(['chest','cache'].includes(type))TowerRenderer.icon(portrait,'chest');else if(type==='treasure')TowerRenderer.icon(portrait,'treasure',selectedEntity.treasure);else TowerRenderer.icon(portrait,'npc',selectedEntity.archetype||selectedEntity.sprite||selectedEntity.portrait||(type==='rescue'?'bajie':'lantern'));}}
    $('context-title').textContent=title;$('context-body').innerHTML=html+sceneDetailHTML(selectedEntity);renderer.mechanismPreview=TowerMechanisms.preview(engine,selectedEntity);if(renderer.mechanismPreview.length)$('context-body').insertAdjacentHTML('beforeend','<details class="mechanism-links"><summary>查看联动 · '+renderer.mechanismPreview.filter(q=>q.before!==q.after).length+' 处开合变化</summary>'+renderer.mechanismPreview.map(q=>'<p>'+esc(q.status)+' · '+esc(q.label)+'</p>').join('')+'</details>');
    const narrativeTarget=['npc','monument'].includes(selectedEntity?.type);
    document.querySelector('.context-card')?.classList.toggle('is-narrative',narrativeTarget);
    const contextGoal=$('context-objective');contextGoal.hidden=!sceneDetail&&!narrativeTarget;
    contextGoal.innerHTML=sceneDetail||narrativeTarget?'此行 · '+TowerText.highlighted(guidance().text):'';
    document.querySelector('.context-card')?.classList.toggle('expanded',!!sceneDetail);
    const sigil=document.querySelector('.context-card'),targetKey=sel?`${s.floor}:${selectedEntity?.id||sel.x+','+sel.y}`:'';document.body.dataset.target=targetKey?'true':'false';if(sigil){sigil.dataset.sigil=selectedEntity?.type==='enemy'?'观':['npc','rescue','monument'].includes(selectedEntity?.type)?'问':['fragment','treasure','item','chest'].includes(selectedEntity?.type)?'得':'启';if(targetKey&&targetKey!==lastSigilTarget){lastSigilTarget=targetKey;sigil.classList.remove('sigil-enter');void sigil.offsetWidth;sigil.classList.add('sigil-enter');}if(!targetKey)lastSigilTarget='';}
    document.querySelector('.context-card')?.classList.toggle('is-enemy',selectedEntity?.type==='enemy');
    document.querySelector('.context-card')?.classList.toggle('is-chest',['chest','cache'].includes(selectedEntity?.type));
    document.querySelector('.context-card')?.classList.toggle('has-selection',!!sel&&(!!selectedEntity||['~','=','w'].includes(selectedTile)));
    bindFocus($('context-body'));
    if(engine.selection&&TowerPlanning.targets(engine).some(t=>t.x===engine.selection.x&&t.y===engine.selection.y&&(selectedEntity?t.id===selectedEntity.id:!t.id)))$('context-body').insertAdjacentHTML('beforeend','<button class="scene-rule-button" data-plan-mark>推演此处 · T</button>');
    $('context-body').querySelector('[data-plan-mark]')?.addEventListener('click',()=>planningDesk.mark(engine.selection.x,engine.selection.y));
    paintAssetIcons($('context-body'));$('context-body').querySelectorAll('[data-phase]').forEach(c=>TowerRenderer.icon(c,'boss',Number(c.dataset.phase)));
    $('context-body').querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const p=engine.selection,e=p&&engine.getEntity(p.x,p.y);if(e){const id=b.dataset.choice;choice(e);previewDecision(id);}});
    $('context-body').querySelectorAll('[data-recall]').forEach(b=>b.onclick=()=>{if(engine.recallClone(b.dataset.recall)){sceneDetail=null;updateContext();}});
    document.querySelector('.context-card')?.classList.toggle('is-dialogue',sceneDetail?.kind==='dialogue');
    $('context-body').querySelectorAll('[data-context-plan]').forEach(b=>b.onclick=()=>{engine.setBossPlan(b.dataset.contextPlan);updateContext();});
    $('context-body').querySelectorAll('[data-growth-route]').forEach(b=>b.onclick=()=>{
      const sel=engine.selection,e=sel&&engine.getEntity(sel.x,sel.y);if(e?.type!=='enemy')return;
      const plan=TowerTactics.growthPlans(engine,TowerData.enemies[e.enemy]).find(p=>p.id===b.dataset.growthRoute);if(!plan)return;
      renderer.planningHint={...plan,floor:s.floor,turn:s.turn,enemy:{x:e.x,y:e.y},fromX:s.x,fromY:s.y};viewChosen=true;renderer.setOverview(true);viewStatus();
      $('status-message').textContent=`青线通向${plan.name}，金圈为比较的守卫。只标路线；自行行走取舍。`;
      updateContext();
    });
    $('context-body').querySelector('.scene-calculation')?.addEventListener('toggle',ev=>{calculationOpen=ev.target.open;positionContext();});
    scheduleContext();
    $('context-body').querySelectorAll('[data-context]').forEach(b=>b.onclick=()=>{
      const p=engine.selection,e=p&&engine.getEntity(p.x,p.y);if(!p)return;const a=b.dataset.context;
      if(a==='target-details')showTargetDetails();
      else if(a==='tactics'&&e){renderer.planningHint=null;toggleSceneDetail('tactics');}
      else if(a==='aid'&&e)engine.receiveAid(e);
      else if(a==='prerequisite'&&e)locateObjective(e);
      else if(a==='open-door'&&e){if(engine.openDoor(e))clearSceneTarget();}
      else if(a==='dialogue-next')advanceSceneDialogue();
      else if(a==='collect'&&e)approach(e,()=>{},true);
      else if(a==='rules'&&e)showBattleRules(e);
      else if(a==='plans'&&e)showBossPreparation(e);
      else if(a==='final-battle'&&e){if(!finalBattle.open(e))toast('先走近心猿，并集齐五重心印。');}
      else if(a==='formula'&&e){calculationOpen=true;updateContext();}
      else if(a==='engage'&&e)confirmCombat(e);
      else if(a==='approach-enemy'&&e)approach(e,()=>{engine.select(e.x,e.y);$('status-message').textContent='已走近守卫。再按一次朝守卫的方向，或点迎战。';});
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
      else if(a==='story'&&e)approach(e,()=>talk(e));
      else if(a==='reveal'&&e)engine.reveal(e);
      else if(a==='resonator'&&e)approach(e,()=>engine.activateResonator(e));
      else if(a==='rescue'&&e)approach(e,()=>engine.rescue(e));
      else if(a==='tide'&&e)approach(e,()=>engine.toggleTide(e));
      else if(a==='portal'&&e)approach(e,()=>engine.usePortal(e));
      else if(a==='recall'&&e)engine.recallClone(e.id);
      else cast(a,p.x,p.y);
    });
  }
  function inventory(){
    const back=ritualOpen?{floor:engine.state.floor,entity:decisionEntity,selection:decisionSelection,result:ritualResult}:null;
    kitNotice='';showSurface('行者行囊','<div id="pilgrim-kit" class="pilgrim-kit"></div>',[{label:back?'系好布囊 · 返回'+(back.entity?'取舍':'莲灯'):'系好布囊 · 返回塔中',keep:true,action:()=>closeSurface()}],'六器随身 · 取舍在心',true,'inventory');ritualReturn=back;
    if(back){$('modal-close').textContent='‹ 返回'+(back.entity?'取舍':'莲灯');$('modal-close').setAttribute('aria-label',back.entity?'返回取舍':'返回莲灯');}renderKit();
  }
  function renderKit(){
    const s=engine.state,holder=$('pilgrim-kit');if(!holder)return;
    holder.innerHTML=`<div class="kit-pilgrim"><canvas width="384" height="384" data-asset="${heroAsset()}" aria-hidden="true"></canvas><h3>齐天大圣</h3><p>六器最多同佩两件<br>在莲灯旁调整行装</p><div class="kit-equipped" aria-label="已佩戴的两件法器">${[0,1].map(i=>s.equipped[i]?`<span title="${esc(treasureById(s.equipped[i])?.name)}"><canvas width="160" height="160" data-asset="treasure_${s.equipped[i]}" aria-hidden="true"></canvas></span>`:'<span>虚位</span>').join('')}</div><div class="kit-seals" aria-label="五重心印">${['石','骨','渡','慈','明'].map((name,i)=>`<i class="${s.relics.includes(i)?'lit':''}">${name}</i>`).join('')}</div></div><div class="kit-belongings"><div class="kit-resources"><span>功德 ${s.coins}</span><span>铜钥 ${s.keys.yellow} · 青钥 ${s.keys.blue} · 心钥 ${s.keys.red}</span><span>灵息 ${s.mana}/${s.maxMana}</span></div><div class="kit-cloth"><div class="kit-gear">${treasureList().map(t=>{const owned=s.treasures.includes(t.id),on=s.equipped.includes(t.id);return `<button class="kit-token ${owned?'':'unfound'} ${on?'equipped':''} ${kitSelection===t.id?'selected':''}" data-kit-select="${t.id}" aria-pressed="${kitSelection===t.id}"><canvas width="192" height="192" data-asset="treasure_${t.id}" aria-hidden="true"></canvas><span>${esc(t.name)}</span><small class="token-status">${on?'已佩戴':owned?'已寻回':'尚待寻回'}</small></button>`;}).join('')}</div></div><div class="kit-supplies"><button class="kit-supply ${kitSelection==='elixir'?'selected':''}" data-kit-select="elixir"><canvas width="160" height="160" data-asset="item_peach" aria-hidden="true"></canvas><span>随身蟠桃 × ${s.elixirs}<small>恢复生命 · 一次消耗</small></span></button><button class="kit-supply ${kitSelection==='orb'?'selected':''}" data-kit-select="orb"><canvas width="160" height="160" data-asset="item_orb" aria-hidden="true"></canvas><span>凝息珠 × ${s.orbs}<small>补息、供奉或留待终战</small></span></button></div><div class="kit-description" aria-live="polite"></div><div class="kit-tools"><button id="export-save">导出前缘</button><label>导入前缘<input type="file" id="import-save" accept=".json,application/json" hidden></label></div></div>`;
    paintAssetIcons(holder);holder.querySelectorAll('[data-kit-select]').forEach(b=>b.onclick=()=>{kitSelection=b.dataset.kitSelect;kitNotice='';renderKit();holder.querySelector(`[data-kit-select="${kitSelection}"]`)?.focus({preventScroll:true});});renderKitDetail();
    $('export-save').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([engine.exportSave()],{type:'application/json'}));a.href=url;a.download='大圣-舍利魔塔-第'+(s.floor+1)+'层.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    $('import-save').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;if(file.size>2000000){toast('存档文件过大。');return;}const raw=await file.text();clearSurfaces();if(engine.load(raw)){resetStorySession();engine.save(true);showGame();if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();else floorEntry({floor:engine.state.floor,title:currentFloor().name,text:currentFloor().intro,resume:true});}};
  }
  function renderKitDetail(){
    const s=engine.state,node=document.querySelector('.kit-description');if(!node)return;let title='',description='',label='',reason='',disabled=false,action;
    if(kitSelection==='elixir'){
      title='随身蟠桃';description='服下一枚，恢复 200 生命。';label='服用蟠桃';disabled=s.elixirs<1;reason=disabled?'布囊里已无蟠桃':`尚余 ${s.elixirs} 枚`;action=()=>{const hp=s.hp;if(engine.useConsumable('elixir'))kitNotice=`生命 ${hp} → ${s.hp}`;renderKit();};
    }else if(kitSelection==='orb'){
      title='凝息珠';description='补满灵息；也可留在莲灯供奉或用于终战。';label='凝珠补息';disabled=s.orbs<1||s.mana===s.maxMana;reason=s.orbs<1?'布囊里已无凝息珠':s.mana===s.maxMana?'灵息已满，暂无需消耗':`尚余 ${s.orbs} 颗`;action=()=>{if(engine.useConsumable('orb'))kitNotice='灵息已补满';renderKit();};
    }else{
      const t=treasureById(kitSelection)||treasureList()[0];kitSelection=t.id;const owned=s.treasures.includes(t.id),on=s.equipped.includes(t.id),floor=TowerData.floors.findIndex(f=>f.entities.some(e=>e.treasure===t.id));
      title=t.name;description=treasureEffects[t.id]||t.description;label=on?'卸下法器':'佩戴法器';disabled=!owned||!atLantern()||!on&&s.equipped.length>=2;reason=!owned?`尚在第 ${floor+1} 层等待寻回`:!atLantern()?'须站在莲灯上换装':!on&&s.equipped.length>=2?'两处佩位已满，先卸下一件':'改变配装不消耗功德或灵息';action=()=>{if(engine.equipTreasure(t.id))kitNotice=on?'已卸下'+t.name:'已佩戴'+t.name;renderKit();};
    }
    node.innerHTML=`<h3>${esc(title)}</h3><p>${TowerText.highlighted(description)}<br><span data-kit-reason>${esc(kitNotice||reason)}</span></p><button id="kit-use" ${disabled?'disabled':''}>${label}</button>`;$('kit-use').onclick=action;
  }
  function gameMenu(){
    const items=[['trials','章回试炼',runSession.isTrial?'继续本题、记录或返回主线':'固定起点 · 不同目标',()=>trialPanel.open()],['t','灯前推演','T · 三步比较与章回恢复',()=>planningDesk.open()],['i','行者行囊','I · 物品与六器',inventory],['c','照见行者','C · 修为与状态',character],['j','因果手记','J · 目标与乘云',journal],['b','观敌知损','B · 战损与临界',bestiary],['relics','舍利莲阵','十六外环 · 一位未归',relicCollection],['l','读取前缘','L · 手动与自动',loadSlots],['save','留存此行','Ctrl S · 独立存档',()=>{engine.save();closeSurface();}],['h','入塔指引','H · 操作与演出',help],['settings','声音与演出','声景 · 动作 · 画面',soundSettings],['style','更换画境','两套画境 · 同一前缘',styles],['restart','重启冒险','先核对留存，再开新局',confirmRestart],['title','回到塔外','保留当前自动前缘',returnTitle]];
    showSurface('行旅',`<div class="journey-rest"><div class="journey-pilgrim" aria-hidden="true"><canvas width="500" height="600" data-asset="${heroAsset()}"></canvas><span>歇一息，再走。</span></div><div class="journey-menu">${items.map(([id,title,tip])=>`<button class="${['i','c','j','t','trials','b'].includes(id)?'major':'minor'}" data-menu="${id}"><span class="journey-nav-mark" aria-hidden="true">${{trials:'试',t:'思',i:'囊',c:'身',j:'因',b:'观',l:'缘',save:'存',h:'问',relics:'印',restart:'新',settings:'声',style:'境',title:'归'}[id]}</span><span><b>${title}</b><small>${tip}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div></div>`,[{label:'继续塔中之行'}],'歇一息 · 再问前路',true,'menu');$('modal-content').querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>items.find(row=>row[0]===b.dataset.menu)[3]());
  }
  function styles(){
    const unlocked=TowerStyle.isUnlocked('mural');
    showSurface('行旅画境',`<div class="style-tableau" data-style-count="${TowerStyle.available.length}">${TowerStyle.available.map(({id,name,description})=>`<button data-choose-style="${id}" class="${currentStyle()===id?'chosen':''}"><img src="assets/${id==='material'?'material':'mural'}/ui_backdrop.png" alt="${name}"><strong>${name}</strong><span>${description}</span><small>${currentStyle()===id?'此刻画境':'展开此画境'}</small></button>`).join('')}</div>${!unlocked?'<p class="style-unlock-note">完成任一主线结局，便可展开新的画境。</p>':''}`, [{label:'返回塔中'}],unlocked?'归途已成 · 两境可游':'玄金古寺 · 初入塔途',true,'style');$('modal-content').querySelectorAll('[data-choose-style]').forEach(b=>b.onclick=async()=>{await switchStyle(b.dataset.chooseStyle);if(surfaceOpen&&$('modal-root').dataset.view==='style')styles();});
  }

  function chapterProgressHTML(){return (engine.chapterProgress?.()||[]).map((p,i)=>`<article class="chapter-progress ${p.done?'completed':''}"><span>${String(i+1).padStart(2,'0')}</span><div><b>${esc(p.title)} ${p.done?'◆':''}</b><p>${p.steps.map(s=>`${s.done?'◆':'◇'} ${esc(s.label)}`).join(' · ')||'循阶解印'}</p></div></article>`).join('');}
  function fragmentListHTML(){return '<div class="fragment-list">'+Array.from({length:16},(_,id)=>{let target=null,fi=-1;TowerData.floors.forEach((f,i)=>{const e=f.entities.find(e=>e.type==='fragment'&&e.fragment===id);if(e){target=e;fi=i;}});const found=(engine.state.fragments||[]).includes(id),known=engine.state.visited.includes(fi);return `<article class="fragment-entry ${found?'found':''}"><b>${found?'◆':'◇'} 第 ${id+1} 枚</b><small>${found?'已经归环':known?'第 '+(fi+1)+' 层':'塔雾未散'}</small>${!found&&known&&target?`<button class="secondary-button" data-fragment-floor="${fi}" data-fragment-x="${target.x}" data-fragment-y="${target.y}">定位 ↗</button>`:''}</article>`;}).join('')+'</div>';}
  function relicCollection(){const s=engine.state;showSurface('十六外环 · 一位未归',`${relicRing()}<div class="relic-counts"><span>外在舍利<b>${externalCount()} / 16</b></span><span>五重心印<b>${s.relics.length} / 5</b></span><span>无骨归真<b>${s.selfAwakened?'已照见':'中央空位'}</b></span></div>${fragmentListHTML()}<p>十六枚外舍利散落在真实塔路中，须逐枚寻回。五重心印会公开所需舍利数，解印后觉醒神通。主路、支翼与旧层回访，共同构成这一圈因果。</p><p class="muted">中央空位不是另一件宝物。解开五印、集齐外舍利并战胜三相后，须在塔心照见悟空自身。</p><div class="chapter-progress-list">${chapterProgressHTML()}</div><p class="adaptation-caption">《西游记后传》的十七舍利与无骨归真启发了此平行篇章；五印魔塔、点灯僧与守塔分歧为本作原创。</p>`,[{label:'合上莲阵',className:'primary-button'}],'十八层 · 五印 · 十六加一',true,'collection');$('modal-content').querySelectorAll('[data-fragment-floor]').forEach(b=>b.onclick=()=>focusTarget(Number(b.dataset.fragmentFloor),Number(b.dataset.fragmentX),Number(b.dataset.fragmentY)));}
  function revisitDone(r){
    const entity=TowerData.floors[r.floor]?.entities.find(e=>e.id===r.target||(e.x===r.x&&e.y===r.y));
    if(r.target&&engine.state.removed[r.target])return true;
    if(entity)return !!engine.state.removed[entity.id]||(entity.type==='switch'&&!!engine.state.switches[entity.id]);
    return !!engine.state.terrain[`${r.floor}:${r.x}:${r.y}`];
  }
  function journal(){
    const s=engine.state;showSurface('十八重 · 因果簿',`<div class="journal-tabs"><button class="primary-button" id="tab-map">塔层与线索</button><button class="secondary-button" id="tab-story">塔中记事 (${s.journal.length})</button></div><div id="journal-body"></div>`,[{label:'合上因果簿'}],'六篇十八层 · 旧路亦是新路',true,'journal');
    function map(){const holder=$('journal-body');if(!holder)return;
      const revisits=(TowerData.revisits||[]).filter(r=>s.relics.includes(r.relic));
      holder.innerHTML=`<details class="chapter-summary"><summary>六章主线 · ${externalCount()} / 16 外舍利</summary>${chapterProgressHTML()}</details>${revisits.length?`<h3>心印新解 · 旧层回响</h3><div class="revisit-list">${revisits.map(r=>{const done=revisitDone(r),reachable=s.visited.includes(r.floor),canFocus=r.floor===s.floor||(s.relics.includes(2)&&s.mana>=1&&reachable);return `<article class="revisit-row ${done?'completed':''}"><b>${done?'◆ 已探索':'◇ 可回访'} · ${esc(r.title)}</b><p>${esc(r.description)}</p><small>第 ${r.floor+1} 层 · (${r.x+1}, ${r.y+1}) · ${esc(TowerData.relics[r.relic].name)}</small>${!done?`<button class="secondary-button" data-revisit="${esc(r.id)}" ${!canFocus?'disabled':''}>${r.floor===s.floor?'地图定位':'乘云定位 · 1 息'}</button>`:''}</article>`;}).join('')}</div>`:''}<p class="muted">${s.relics.includes(2)?'乘云耗 1 灵息，直达已抵达塔层的莲灯。落地不会自动补息；机关与资源状态保持。':'第九层解开渡厄心印后，可乘云回到已抵达塔层的莲灯。'}</p><div class="tower-list">${TowerData.floors.map((f,i)=>`<article class="tower-row ${i===s.floor?'current':''}"><span>${String(i+1).padStart(2,'0')}</span><div><b>${s.visited.includes(i)?esc(f.name):'未抵达'}</b><small>${s.visited.includes(i)?esc(f.objective):'塔雾未散，循阶而上。'}</small>${i===s.floor?`<div class="floor-hints">${(f.hints||[]).map(h=>`<p>· ${hintHTML(h)}</p>`).join('')}${(f.hintTargets||[]).map(t=>`<button class="secondary-button" data-focus-x="${t.x}" data-focus-y="${t.y}">${esc(t.text)} ↗</button>`).join('')}</div>`:''}</div>${s.relics.includes(2)&&s.visited.includes(i)&&i!==s.floor?`<button class="secondary-button" data-travel="${i}" ${s.mana<1?'disabled':''}>乘云 · 1息</button>`:''}</article>`).join('')}</div>`;
      const floorList=holder.querySelector('.tower-list');if(floorList){const rows=[...floorList.children];floorList.replaceChildren(...Array.from({length:6},(_,chapter)=>{const fold=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div'),first=chapter*3;fold.className='tower-chapter';fold.dataset.fold='tower-'+chapter;fold.open=Math.floor(s.floor/3)===chapter;summary.innerHTML='<span aria-hidden="true">'+['一','二','三','四','五','六'][chapter]+'</span><b>第 '+(chapter+1)+' 回</b><small>第 '+(first+1)+'–'+(first+3)+' 层 · 已抵达 '+[0,1,2].filter(n=>s.visited.includes(first+n)).length+'/3</small>';body.className='chapter-floors';body.append(...rows.slice(first,first+3));fold.append(summary,body);return fold;}));}
      $('tab-map').setAttribute('aria-pressed','true');$('tab-story').setAttribute('aria-pressed','false');
      const goal=guidance();holder.insertAdjacentHTML('afterbegin',`<section class="journal-current"><small>当前要事 · ${esc(goal.phase)}</small><h3>${esc(goal.text)}</h3><p>${esc(goal.why)}</p>${goal.journal?'<p>在下方选择已抵达的塔层，乘云回访。</p>':'<button class="secondary-button" data-current-goal>回到场景标记</button>'}</section>`);const mark=holder.querySelector('[data-current-goal]');if(mark)mark.onclick=()=>{closeSurface();guideAction();};
      holder.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>{clearSurfaces();engine.travel(Number(b.dataset.travel));});
      holder.querySelectorAll('[data-revisit]').forEach(b=>b.onclick=()=>{const r=revisits.find(r=>r.id===b.dataset.revisit);if(r)focusTarget(r.floor,r.x,r.y);});bindFocus(holder);
    }
    function notes(){$('tab-map').setAttribute('aria-pressed','false');$('tab-story').setAttribute('aria-pressed','true');if($('journal-body'))$('journal-body').innerHTML=s.journal.length?s.journal.slice().reverse().map(d=>`<details class="journal-note"><summary>${esc(d.title)}<small>第 ${d.floor+1} 层</small></summary>${paragraphs(d.text)}</details>`).join(''):'<p>塔中尚无记载。</p>';}
    $('tab-map')?.addEventListener('click',map);$('tab-story')?.addEventListener('click',()=>{notes();const holder=$('journal-body');if(holder)holder.innerHTML+='<h3>此层同道与碑文</h3>'+currentFloor().entities.filter(e=>['npc','monument'].includes(e.type)).map(e=>'<details class="journal-note"><summary>'+esc(e.name||e.label||'塔中碑文')+'</summary>'+paragraphs(dialogueText(npcDialogue(e)))+'</details>').join('');});map();
  }
  function bestiary(){
    const s=engine.state,foes=TowerData.floors[s.floor].entities.filter(e=>e.type==='enemy'&&!s.removed[e.id]);
    let selected=foes.find(e=>engine.selection&&e.x===engine.selection.x&&e.y===engine.selection.y)?.id||foes[0]?.id;
    function render(){const e=foes.find(e=>e.id===selected),a=e&&TowerData.enemies[e.enemy],p=a&&engine.preview(a);
      showSurface('火眼金睛 · 敌情簿',`<p class="bestiary-caption">本层尚有 ${foes.length} 名守卫 · 只观敌情，不结算战斗。</p>${e?`<div class="bestiary-folio"><nav class="bestiary-index" aria-label="选择守卫">${foes.map(f=>`<button data-codex-enemy="${esc(f.id)}" aria-pressed="${f.id===selected}"><span>${esc(TowerData.enemies[f.enemy].name)}</span><small>${traitNames[TowerData.enemies[f.enemy].trait]} · ${f.x+1},${f.y+1}</small></button>`).join('')}</nav><article class="bestiary-leaf"><div class="foe-illustration"><canvas width="320" height="360" data-asset="enemy_${esc(e.enemy)}" aria-hidden="true"></canvas><span>${esc(traitNames[a.trait]||'守卫')}</span></div><div class="foe-reading"><small>第 ${s.floor+1} 层 · ${e.x+1},${e.y+1}</small><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p>${statsHTML(a,p)}<div class="bestiary-forecast"><span>预计损失</span><strong class="${p.survive?'safe-text':'danger-text'}">${p.possible?p.damage:'无法破防'}</strong><small>${p.survive?'当前生命足以承受':p.possible?'当前生命不足，先寻别路':'先提高攻击或调整行装'}</small></div><button class="context-button" data-foe="${esc(e.id)}">回到场景 · 查看战前计算</button></div></article></div>`:'<div class="codex-empty"><span>静</span><p>此层守卫已肃清，无需再战。</p></div>'}`, [{label:'合上敌情簿'}],'一眼观敌 · 一棒有数',true,'bestiary');
      $('modal-content').querySelectorAll('[data-codex-enemy]').forEach(b=>b.onclick=()=>{selected=b.dataset.codexEnemy;render();});
      $('modal-content').querySelector('[data-foe]')?.addEventListener('click',()=>{const target=foes.find(f=>f.id===selected);clearSurfaces();renderer.focusCell?.(target.x,target.y);engine.select(target.x,target.y);combat(target);});
    }render();
  }
  function help(){showSurface('入塔指引',`<div class="game-guide-grid"><article><canvas width="96" height="96" data-asset="item_key_yellow" aria-hidden="true"></canvas><kbd>↑ ↓ ← →</kbd><h3>走近，看清</h3><p>方向键移动。遇怪先预览，松开再前进才出棒。</p></article><article><canvas width="96" height="96" data-asset="prop_eye" aria-hidden="true"></canvas><kbd>2 · 火眼</kbd><h3>照破幻壁</h3><p>点幻壁再辨真，点守卫看实际战损，不消耗灵息。</p></article><article><canvas width="96" height="96" data-asset="prop_altar" aria-hidden="true"></canvas><kbd>G · 下一步</kbd><h3>循线索行</h3><p>定位当前要事。每层入境都有目标，可按 Enter 继续。</p></article><article><canvas width="96" height="96" data-asset="prop_staff" aria-hidden="true"></canvas><kbd>3 / 4 / 5</kbd><h3>神通开路</h3><p>架桥、化蝉、分身各有目标和代价；成功后有短演出。</p></article><article><canvas width="96" height="96" data-asset="treasure_lotus" aria-hidden="true"></canvas><kbd>I / C / J</kbd><h3>整装与回访</h3><p>行囊、人物、手记。Esc 随时退回塔中。</p></article><article><canvas width="96" height="96" data-asset="prop_altar" aria-hidden="true"></canvas><kbd>F · 莲灯</kbd><h3>修心取舍</h3><p>站在莲灯上修行。功德换成长，灵息免费补满。</p></article></div><details class="full-rules"><summary>展开完整塔中规则</summary><div class="guide-section"><h3>一格一策，不计时</h3><p>方向键 / WASD 移动，视野会随行者移动。<b>M / 全图规划</b>可在近观与整层地图间切换；全图中可选中远处目标。十六枚舍利要逐一寻回，支翼精英守着六件取舍鲜明的法器。点击守卫先看战损，点“走近”才接近；朝守卫前进先看预览，松开后再次按同一方向即可开战，也可按 F 或点击迎战。按住方向键产生的重复输入不会确认战斗。所有守卫、物品与门均不刷新。标为可绕行的守卫是功德挑战，可放弃战利；守宝者则守护对应奖励，无需清空所有怪物。</p><h3>明算胜负</h3><p>行者伤害 = 攻击 − 敌防御，须大于 0；出棒数 = 敌生命 ÷ 每棒伤害，向上取整。普通守卫还击次数 = 出棒数 − 1。敌伤害 = max(0, 敌攻 − 行者防御)。生命必须大于总损失才能获胜。</p><p>先手守卫额外攻击一次；法术无视防御；余毒战后固定扣血；反震每棒固定扣血，包含最后一击。首领连续结算三相，准备方案的代价和总损失均在战前显示。</p><h3>西游神通，组合解局</h3><p><b>1 行走 · 2 火眼金睛</b>：免费查看任意格，战损和下一攻击临界值随属性更新。<br><b>3 金箍架桥</b>：第三层觉醒；相邻断口，耗 1 灵息，永久开路。<br><b>4 青蝉化形</b>：第六层觉醒；相邻铁栅或普通青锁门，基础耗 1 灵息，从内侧卸锁，保留青钥。<br><b>5 毫毛分身</b>：第九层觉醒；四格内点青色阵眼，可隔墙，基础耗 2 灵息。双影镜会改变神通费用，以技能栏当前数字为准。分身可免费回收，但关联机关会重新闭合。标有驻守上限的塔层需要调度；回收分身后可重新施放。<br><b>定心护身</b>：第十二层觉醒，被动将每次法术伤害降低 8，首领心火降低 8。<br><b>归真共鸣</b>：第十五层觉醒，回到第一层开启归根匣，取得最终朱钥匙。</p><h3>经过与交互分开</h3><p>经过楼梯和扳杆不会自动触发。靠近后按 F，或点目标后的交互按钮。踩上莲灯免费补满灵息，主动交互才打开供奉。远处查看不消耗行动。</p><h3>有限资源，路线有别</h3><p>路线契约会公开全部代价与奖励，同组只可选一项。凝息珠除恢复灵息，也能在莲灯换取功德、生命，或用于最终战；选择前先看机会成本。新心印会让因果簿出现旧层回访目标，可直接定位。</p><h3>存档、回溯与重做</h3><p>自动存档随行动更新；Ctrl+S 写入独立手动存档，L 可分别查看并读取。Z 回溯一次决策，Y / Ctrl+Y 重做（当前会话最近 30 组）。C 行者详情，Space 下一句，M 全图规划，R 归位，I 背包与法器，J 因果簿，B 敌情簿，H 指引，F 交互，T 灯前推演与章回恢复；Esc 关闭或回到行走。背包可导入、导出 JSON 存档。</p><p class="muted">没有隐藏随机伤害，没有强制倒计时。不能通行时先看机关联动、旧层宝匣与其他路线。</p></div></details><section class="presentation-settings">${inspectSettings()}</section>`,[{label:'记下了 · 继续',className:'primary-button'}],'大圣 · 舍利魔塔',true,'guide');bindSettings();}
  function defeat(){showSurface('行者，莫忘来路',`<div class="ending-symbol">败</div><p>金箍棒落地，塔钟却没有停。你仍能回到上一个选择。</p><div class="resource-choice">力竭不会覆盖战前存档。可直接回溯，或读取战前进度重新规划。</div>`,[{label:'回溯到战前',className:'primary-button',disabled:!engine.history.length,action:()=>engine.undo()},{label:'读取战前存档',disabled:!engine.hasSave(),action:continueGame},{label:'重启冒险',action:()=>confirmRestart()}],'力竭 · 因果未断',false,'defeat');}
  function finale(){
    const s=engine.state,boss=TowerData.floors.at(-1).entities.find(e=>e.type==='enemy'&&TowerData.enemies[e.enemy].trait==='boss');
    if(boss&&!s.removed[boss.id]){toast('无相之心尚未伏诛。');return;}
    if(s.relics.length<5||externalCount()<16){toast('五重心印与十六枚外舍利尚未齐聚。');return;}
    if(!s.selfAwakened){showSurface('空位不在塔中',`${relicRing(false)}<div class="dialogue-layout"><div class="dialogue-portrait">${portraitSVG('wukong')}</div><div class="story-quote"><p>十六点金光已归环，中央却始终空着。</p><p>点灯僧把灯放下：“你一路救回的性命，都曾被算作绕路的代价。大圣，最后那颗无骨舍利，一直是你。”</p><p>照见自身不会额外消耗生命或物品；接下来仍可选择破劫归尘，或留下守塔。</p></div></div>`,[{label:'再看一眼来路'},{label:'照见自身 · 无骨归真',className:'primary-button',action:()=>engine.awakenSelf()}],'第十七位 · 自身非宝物',true,'awakening');return;}
    showSurface('最后一念 · 众生的归路',`${relicRing(true)}<div class="ending-options"><article><h3>破劫归尘</h3><p>化为无骨舍利，携十六外舍利破开黑莲。被救者的呼唤会把悟空带回人间，乔灵儿与三界重见晨光。</p></article><article><h3>留灯守塔</h3><p>将十七道光留作塔内长明灯。众生仍可离塔，悟空留下守住黑莲余烬。这是本作原创的另一条因果。</p></article></div><p class="muted">两条结局均完整通关。选择会保存，可从此前手动存档体验另一条路。</p>`,[{label:'破劫归尘 · 为众生',className:'primary-button',action:()=>engine.finish('release')},{label:'留灯守塔 · 我来守',action:()=>engine.finish('keep')}],'无相塔心 · 平行篇章的分歧',true,'ending-choice');
  }
  function selfAwakening(){audio.setScene('awakening');renderer.focusPlayer?.();renderHUD();}
  function journeyRecall(){const entries=Object.entries(engine.state.choices||{}).map(([group,id])=>{const def=TowerData.choices?.[group],option=def?.options.find(o=>o.id===id);if(group==='silk'&&engine.state.quests?.silkLegacy)return '<p><b>旧日朱砂</b> · 攻击修为承续，双经卷未重复领取。</p>';if(group==='locks'&&engine.state.quests?.locksLegacy)return '<p><b>旧日锁廊</b> · 灵晶修为承续，路线沿用所选契约。</p>';if(group==='sevenWounds'&&engine.state.quests?.sevenLegacy)return '<p><b>旧日碧髓</b> · 防御修为承续；七伤侧门仍未开启。</p>';return option?`<p><b>${esc(def.title)}</b> · ${esc(option.label)}</p>`:'';}).filter(Boolean);return entries.length?`<div class="journey-recall"><h3>此行因果</h3>${entries.join('')}${engine.state.choices.compassion?`<p>${engine.state.choices.compassion==='release'?'你还给灯魂的那盏灯，正照着众生离塔。':'那枚取走的灯芯，提醒你记住力量的来处。'}</p>`:''}</div>`:'';}
  function ending(choice){const s=engine.state;TowerStyleProgress.recordCampaignClear(s,{isTrial:runSession.isTrial});syncStyleUI();const rescued=s.rescued||[],names={bajie:'八戒',tangseng:'唐僧',nezha:'哪吒',gods:'诸神',souls:'灯魂',waterSoul:'灯魂',qiao:'乔灵儿的映身',seven:'七伤路中的众生'},voices=rescued.map(id=>names[id]||id).join('、');showSurface(choice==='release'?'不负众生，不负此心':'留一盏灯，照众生归途',`${relicRing(true)}<div class="story-quote">${paragraphs(choice==='release'?`你化作无骨舍利，十七道光穿过黑莲塔心。\n\n${voices?voices+'的呼唤，从你亲手打开的归路传来。':'众生的呼唤，从每一条重新点亮的归路传来。'}一根毫毛飘回掌心，你又听见八戒的笑。\n\n塔外，乔灵儿迎着晨光。点灯僧化作胸口的一点暖意——那是你从未失去的慈悲。你扛起金箍棒，走回众人身边。`:'你把十七道光留在塔心，以金箍压住黑莲余烬。\n\n被困众生循灯而去，乔灵儿与八戒守望塔外。你坐在门前，接过那个一直等你的灯盏。\n\n风过时，金箍棒轻轻一响。塔里仍有需要你点亮的路。')}</div>${journeyRecall()}<div class="completion-stats"><span>踏遍塔层<b>${s.visited.length} / 18</b></span><span>外舍利 + 无骨<b>${externalCount()} + ${s.selfAwakened?1:0}</b></span><span>降伏守卫<b>${s.kills}</b></span><span>剩余生命<b>${s.hp}</b></span></div><p class="adaptation-caption">${choice==='release'?'破劫归尘 · 众念归来':'原创分歧 · 留灯守塔'}</p>${TowerStyle.isUnlocked('mural')?'<p class="style-unlock-note">通关画境 · 青绿壁画已解锁，可在行旅画境中展开。</p>':''}<p class="ending-credit">大圣：舍利魔塔 · 全篇终</p>`,[{label:'留步观塔'},{label:'再走一段因果',className:'primary-button',action:()=>confirmRestart()}],'十八重因果 · 已通关',true,'ending');}
  function confirmRestart(){showSurface(runSession.isTrial?'重走本次试炼？':'重新开始这段因果？',runSession.isTrial?'<p>重置本题的独立自动进度，主线和主线手动前缘保留。</p>':'<p>当前自动存档会被新冒险替换，独立手动存档保留。若想保留当前行动，可先手动存档或到背包导出。</p>',[{label:'留在此处'},{label:'开启新冒险',className:'danger-button',action:begin}],'重新开始',true,'restart');}
  function interact(){
    if(surfaceOpen||!started)return;
    collapseStory();stopPath();renderer.skipEffects?.();const s=engine.state,sel=engine.selection;
    const [dx,dy]=TowerRules.directions[s.facing],here=engine.getEntity(s.x,s.y),front=engine.getEntity(s.x+dx,s.y+dy);
    const selected=sel&&engine.getEntity(sel.x,sel.y);
    const e=selected&&engine.distance(selected)<=1?selected:here||front;
    if(e){if(e.type==='enemy'){if(TowerData.enemies[e.enemy]?.trait==='boss'&&s.relics.length>=5){engine.select(e.x,e.y);finalBattle.open(e);}else if(selected?.id===e.id)confirmCombat(e,'keyboard');else combat(e);}else if(e.type==='door'&&selected?.id===e.id)door(e);else if(e.type==='npc'||e.type==='monument'){engine.select(e.x,e.y);talk(e);}else engine.interact(e);return;}
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
    const restore=kind=>{const ok=kind==='manual'?engine.loadManual():engine.load();if(!ok)return;resetStorySession();showGame();viewChosen=false;explorationView();renderer.focusPlayer?.();if(engine.state.won)ending(engine.state.ending);else if(engine.state.defeated)defeat();else floorEntry({floor:engine.state.floor,title:currentFloor().name,text:currentFloor().intro,resume:true});};
    showSurface('选择一段前缘',`<div class="save-slot"><h3>手动前缘 · 独立保留</h3>${saveSummary('manual')}</div><div class="save-slot"><h3>自动前缘 · 最近行动</h3>${saveSummary('auto')}</div><p class="muted">读取后开始新的回溯记录；自动保存不会覆盖手动前缘。</p>`,[{label:'留在当前进度'},{label:'读取手动存档',className:'primary-button',disabled:!engine.hasManualSave(),action:()=>restore('manual')},{label:'读取自动存档',disabled:!engine.hasSave(),action:()=>restore('auto')}],'旧途可续 · 因果犹在',true,'load');
  }
  engine.on((type,d)=>{
    if(type==='data'){window.TowerData=d;renderer.terrainKey='';renderer.lastFloor=-1;}
    if(type==='session')syncRunLabels();
    if(type==='chapterSummary')pendingChapterSummary=d.title+'：'+d.detail;
    if(type==='reset'){pendingChapterSummary='';stopPath();lastInput=0;armedCombat=null;closeRitual(false);presentation.closeCast();dismissFloorEntry();}
    if(type==='selection'||type==='mode')armedCombat=null;if(type==='mode')lastInput=0;
    if(type==='notice')toast(d);
    else if(type==='story')story(d);
    else if(type==='floorEntry')floorEntry(d);
    else if(type==='combat')requestCombat(d);
    else if(type==='door'){engine.select(d.x,d.y);scheduleContext();}
    else if(type==='altar')altar();
    else if(type==='choice')choice(d);
    else if(type==='cloneLimit')cloneLimit(d);
    else if(type==='stairs'){engine.select(d.x,d.y);toast('已到阶梯。按 F 或点击目标面板，确认后换层。');}
    else if(type==='finale')finale();
    else if(type==='awakening')selfAwakening();
    else if(type==='defeat')defeat();
    else if(type==='ending'){ending(d);presentation.showScene(d,{floor:engine.state.floor,rescued:[...engine.state.rescued],choices:{...engine.state.choices}});}
    else if(type==='effect'){
      const meta={...d,...(d.meta||{}),floor:engine.state.floor,rescued:[...engine.state.rescued],choices:{...engine.state.choices}},skill=d.type==='magic'&&['staff','morph','clone','eye'].includes(meta.ability),cost=skill?(meta.ability==='eye'?0:abilityCost(meta.ability)):0;
      renderer.effect(d.type,d.x,d.y,skill?`${d.text||'神通已成'} · ${cost?'灵息 −'+cost:'免费'}`:d.text,meta);
      if(skill)presentation.showCast(meta.ability,{...meta,cost});else if(d.type==='relic'&&meta.fragment===undefined)presentation.showScene(meta.self?'awakening':'seal',meta);else if(d.type==='attack'&&meta.phases?.length&&meta.victory)presentation.showScene('boss',meta);
      const motion=effectiveMotion();audio.cue(meta.fragment!==undefined?'pickup':meta.self?'selfAwaken':d.type,{...meta,impactDelay:motion==='reduced'?0:(meta.phases?.length?600:760)*.38/1000*(motion==='simple'?.65:1)});
    }
    if(['change','reset','mode','selection','log'].includes(type))renderHUD();
  });
  $('leave-trial-start').onclick=()=>trialPanel.exit();
  syncRunLabels();
  $('new-game').onclick=()=>engine.hasSave()?confirmRestart():begin();$('continue-game').disabled=!engine.hasSave()||runSession.isTrial&&runSession.meta.rulesHash!==runSession.trial.rulesHash;$('continue-game').onclick=()=>continueGame(true);
  $('btn-overview').onclick=toggleOverview;
  $('btn-planning').onclick=()=>planningDesk.open();
  $('btn-style').onclick=styles;document.querySelectorAll('[data-style]').forEach(button=>button.onclick=()=>switchStyle(button.dataset.style));
  window.addEventListener('tower-style-progress',ev=>styleProgress(ev.detail));window.addEventListener('tower-style-changed',()=>{syncStyleUI();installUIArt();renderHUD();});
  window.addEventListener('resize',()=>{renderer.resize?.();syncSceneGuard();if(started&&!viewChosen)explorationView();viewStatus();positionContext();positionRitual();});
  $('btn-focus-player').onclick=()=>focusPlayer();
  $('narrative-goal').setAttribute('role','button');$('narrative-goal').tabIndex=0;$('narrative-goal').title='定位下一步主线目标';$('narrative-goal').onclick=guideAction;$('narrative-goal').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();guideAction();}};
  $('target-direction').onclick=()=>{const sel=engine.selection;if(!sel)return;renderer.focusCell?.(sel.x,sel.y);viewStatus();scheduleContext();};
  window.addEventListener('tower-camera-change',()=>{scheduleContext();positionRitual();});
  $('btn-quest-journal').onclick=()=>{document.querySelector('.quest-scroll').open=false;journal();};
  $('btn-save').onclick=()=>{if($('game-toolbox'))$('game-toolbox').open=false;engine.save();};$('btn-load').onclick=loadSlots;
  $('btn-inventory').onclick=inventory;$('btn-journal').onclick=journal;$('btn-bestiary').onclick=bestiary;$('btn-help').onclick=help;$('btn-restart').onclick=confirmRestart;$('btn-undo').onclick=()=>{stopPath();clearSurfaces();engine.undo();};$('btn-audio').onclick=soundSettings;$('btn-relics').onclick=relicCollection;
  $('modal-close').onclick=()=>closeSurface();
  $('btn-character').onclick=character;$('btn-character-menu').onclick=character;$('character-close').onclick=closeCharacter;
  $('story-next').onclick=advanceStory;$('story-collapse').onclick=()=>collapseStory(true);$('story-skip').onclick=skipStory;$('story-unfold').onclick=()=>{storyCollapsed=!storyCollapsed;renderStory();};
  if($('btn-redo'))$('btn-redo').onclick=()=>{stopPath();clearSurfaces();engine.redo();};
  if($('context-dismiss'))$('context-dismiss').onclick=()=>{engine.selection=null;focusPlayer(false);engine.emit('selection',null);};
  document.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>{collapseStory();stopPath();engine.setMode(b.dataset.mode);skillHint(b);};b.addEventListener('pointerenter',()=>skillHint(b));b.addEventListener('pointerleave',()=>{$('mode-label').textContent=modeHint(engine.mode);});b.addEventListener('focus',()=>skillHint(b));b.addEventListener('blur',()=>{$('mode-label').textContent=modeHint(engine.mode);});});
  document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('pointerdown',ev=>{ev.preventDefault();const now=performance.now();if(started&&now-lastInput>=105){lastInput=now;worldMove(b.dataset.move);}}));
  if($('btn-interact'))$('btn-interact').onclick=interact;
  $('game-toolbox').querySelector('summary').addEventListener('click',ev=>{ev.preventDefault();gameMenu();});
  $('journey-guide').querySelector('button').onclick=guideAction;
  $('altar-ritual').querySelector('[data-ritual-close]').onclick=()=>closeRitual();$('altar-ritual').querySelector('[data-ritual-bag]').onclick=inventory;
  function approach(e,action,standOn=false){
    collapseStory();stopPath();if(!engine.isCurrent(e))return;
    if((standOn&&engine.distance(e)===0)||(!standOn&&engine.distance(e)<=1)){action();return;}
    const path=engine.findPath(e.x,e.y);if(!path){toast('当前没有安全的接近路线。先解决阻挡的门、守卫或机关。');return;}
    if(!standOn)path.pop();
    walkPath(path,()=>{engine.select(e.x,e.y);if(engine.isCurrent(e)&&((standOn&&engine.distance(e)===0)||(!standOn&&engine.distance(e)<=1)))action();});
  }
  function walkPath(path,onComplete){
    stopPath();if(!path)return;if(!path.length){onComplete?.();return;}
    clearSceneTarget();
    engine.path=path.slice();const lastFloor=engine.state.floor;
    function next(){
      if(surfaceOpen||presentation.castOpen||presentation.entryOpen||engine.state.floor!==lastFloor){stopPath();return;}
      const dir=engine.path.shift();if(!dir){pathTimer=0;onComplete?.();return;}
      renderer.skipEffects?.();const moved=stepInScene(dir);if(!moved||surfaceOpen){stopPath();return;}
      const quick=settings().fastTravel!==false&&TowerPlanning.fastStep(engine,engine.path[0]);if(quick&&engine.motion)engine.motion.duration=28;pathTimer=setTimeout(next,quick?32:115);
    }next();
  }
  $('game-canvas').addEventListener('pointerdown',ev=>{
    armedCombat=null;
    if(ev.button===2||!started||engine.state.won||engine.state.defeated||surfaceOpen||presentation.entryOpen||presentation.castOpen)return;
    if(ritualOpen){closeRitual();return;}presentation.closeCast();
    clearSurfaces();closeCharacter();collapseStory();stopPath();const now=performance.now();if(engine.mode==='walk'&&now-lastInput<105)return;lastInput=now;
    const p=['staff','morph','clone'].includes(engine.mode)?renderer.cellAt(ev.clientX,ev.clientY):(renderer.pickCell?.(ev.clientX,ev.clientY)||renderer.cellAt(ev.clientX,ev.clientY)),floor=currentFloor();if(!p||p.x<0||p.x>=floor.map[0].length||p.y<0||p.y>=floor.map.length)return;
    engine.select(p.x,p.y);
    if(engine.mode==='inspect')return;
    if(engine.mode!=='walk'){cast(engine.mode,p.x,p.y);return;}
    if(p.x===engine.state.x&&p.y===engine.state.y){character();return;}
    const e=engine.getEntity(p.x,p.y),tile=engine.getTile(p.x,p.y);
    if(e&&['enemy','door','stairs','switch','choice','cache','altar','npc','monument','gate','seal','finale','illusion','resonator','rescue','tide','portal','fragment','treasure'].includes(e.type))return;
    if(['#','~','=','w'].includes(tile))return;
    const path=engine.findPath(p.x,p.y);if(path)walkPath(path);else toast('此处暂无连通道路。查看目标信息，先解决沿途阻挡。');
  });
  $('game-canvas').addEventListener('contextmenu',ev=>{ev.preventDefault();stopPath();const p=renderer.pickCell?.(ev.clientX,ev.clientY)||renderer.cellAt(ev.clientX,ev.clientY);if(p&&!surfaceOpen&&!ritualOpen&&!presentation.entryOpen&&!presentation.castOpen)engine.select(p.x,p.y);});
  $('game-canvas').addEventListener('pointermove',ev=>{const p=renderer.cellAt(ev.clientX,ev.clientY);renderer.setHover(p?.x,p?.y);});$('game-canvas').addEventListener('pointerleave',()=>renderer.setHover(-1,-1));
  window.addEventListener('keydown',ev=>{
    const target=ev.target instanceof Element?ev.target:(document.activeElement||document.body);
    const k=ev.key.toLowerCase();
    if(target.matches('input,textarea,select')&&!['Escape','Tab'].includes(ev.key))return;
    if(started&&(ev.ctrlKey||ev.metaKey)&&k==='s'){ev.preventDefault();engine.save();return;}
    if(presentation.entryOpen){
      if(['enter',' ','f','escape','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){ev.preventDefault();if(!ev.repeat)presentation.closeEntry();}return;
    }
    if(presentation.castOpen){
      if(ev.code==='Space'||['enter','escape'].includes(k)){ev.preventDefault();if(!ev.repeat)presentation.closeCast();}
      else if(k==='tab'){ev.preventDefault();$('ability-cinematic').querySelector('button').focus({preventScroll:true});}
      else if(!ev.ctrlKey&&!ev.metaKey&&!ev.altKey)ev.preventDefault();
      return;
    }
    if(finalBattle.isOpen){finalBattle.handleKey(ev);return;}
    if(surfaceOpen){
      if(ev.key==='Tab'){const focusable=[...$('modal-panel').querySelectorAll('button:not(:disabled),input:not([hidden]),select,summary,a[href]')].filter(e=>e.getClientRects().length),first=focusable[0],last=focusable.at(-1);if(!focusable.includes(document.activeElement)){ev.preventDefault();(ev.shiftKey?last:first)?.focus();return;}if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last?.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first?.focus();}return;}
      const view=$('modal-root').dataset.view;
      if(target.closest('select,input,textarea')&&k!=='escape')return;
      if(k==='escape'||k==='t'&&view==='planning'||k==='i'&&view==='inventory'||k==='c'&&view==='character'||k==='j'&&['book','journal','collection'].includes(view)||k==='b'&&view==='bestiary'||k==='h'&&['guide','settings'].includes(view)){ev.preventDefault();if(!ev.repeat&&!$('modal-close').disabled)closeSurface();return;}
      if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','1','2','3','4','5','6','f','m','r','g'].includes(k))ev.preventDefault();return;
    }
    if(ritualOpen){
      if(ev.repeat){ev.preventDefault();return;}
      if(['escape','f'].includes(k)){ev.preventDefault();closeRitual();return;}
      if(k==='i'){ev.preventDefault();inventory();return;}
      if(k==='tab'){const buttons=[...$('altar-ritual').querySelectorAll('button:not(:disabled):not([tabindex="-1"])')],index=buttons.indexOf(document.activeElement);ev.preventDefault();buttons[index<0?(ev.shiftKey?buttons.length-1:0):(index+(ev.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus({preventScroll:true});return;}
      if(decisionEntity){
        const spec=TowerData.choices[decisionEntity.choice],dirs=['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'];
        if(dirs.includes(k)){ev.preventDefault();const i=spec.options.findIndex(o=>o.id===decisionSelection),back=['arrowleft','arrowup','a','w'].includes(k);previewDecision(spec.options[i<0?(back?spec.options.length-1:0):(i+(back?-1:1)+spec.options.length)%spec.options.length].id);return;}
        if(/^[1-3]$/.test(k)){ev.preventDefault();const option=spec.options[Number(k)-1];if(option)previewDecision(option.id);return;}
        if(k==='enter'&&(!target.closest('button')||target.closest('[data-choice],[data-choice-confirm]'))){ev.preventDefault();if(decisionSelection)decide(decisionSelection);return;}
        if(ev.code==='Space'&&target.closest('[data-choice]')){ev.preventDefault();previewDecision(target.closest('[data-choice]').dataset.choice);return;}
        if(!['enter',' '].includes(k)&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey)ev.preventDefault();return;
      }
      if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){ev.preventDefault();const buttons=[...$('altar-ritual').querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement),delta=['arrowleft','arrowup','a','w'].includes(k)?-1:1;buttons[(index+delta+buttons.length)%buttons.length]?.focus({preventScroll:true});return;}
      const actions={'1':'atk','2':'heal','3':'def','4':'mana','5':'orb-coins','6':'orb-heal'};if(actions[k]){ev.preventDefault();ritualAction(actions[k]);return;}
      if(!['enter',' '].includes(k)&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey)ev.preventDefault();return;
    }
    if(activeStory&&!storyCollapsed&&(k==='f'||ev.code==='Space'||k==='enter')){ev.preventDefault();if(!ev.repeat)advanceStory();return;}
    if(ev.key==='Escape'){
      ev.preventDefault();stopPath();if(!$('style-picker').classList.contains('hidden')){$('style-picker').classList.add('hidden');$('btn-style').setAttribute('aria-expanded','false');return;}
      if($('game-toolbox')?.open){$('game-toolbox').open=false;return;}if($('character-drawer').classList.contains('open')){closeCharacter();return;}
      if(surfaceOpen&&!$('modal-close').disabled){closeSurface();return;}if(activeStory&&!storyCollapsed){skipStory();return;}if(sceneDetail){sceneDetail=null;clearInterval(dialogueTimer);updateContext();return;}if(engine.selection){clearSceneTarget();return;}if(activeStory&&!storyCollapsed){collapseStory(true);return;}engine.setMode('walk');return;
    }
    if(!started)return;
    if(ev.code==='Space'){
      if(sceneDetail?.kind==='dialogue'){ev.preventDefault();if(!ev.repeat)advanceSceneDialogue();return;}
      if(target.closest('[data-context="engage"],#btn-interact')){ev.preventDefault();if(!ev.repeat&&activeStory)advanceStory();return;}
      if(!target.matches('button,input,select,summary')){ev.preventDefault();if(!ev.repeat&&activeStory)advanceStory();}return;
    }
    const dirs={arrowup:'up',w:'up',arrowright:'right',d:'right',arrowdown:'down',s:'down',arrowleft:'left',a:'left'};
    if(dirs[k]){if(ev.ctrlKey||ev.metaKey)return;ev.preventDefault();const now=performance.now();if(now-lastInput<105)return;lastInput=now;worldMove(dirs[k],ev.repeat);return;}
    if(ev.repeat)return;
    if((ev.ctrlKey||ev.metaKey)&&k==='y'){ev.preventDefault();stopPath();engine.redo();return;}
    if(['1','2','3','4','5'].includes(k)){ev.preventDefault();stopPath();engine.setMode(['walk','inspect','staff','morph','clone'][Number(k)-1]);return;}
    const keys={t:()=>planningDesk.open(),g:guideAction,c:character,m:toggleOverview,r:()=>focusPlayer(),i:inventory,j:journal,b:bestiary,h:help,l:loadSlots,z:()=>engine.undo(),y:()=>engine.redo(),f:interact};
    if(keys[k]){ev.preventDefault();stopPath();keys[k]();}
  });
  function returnTitle(){presentation.closeEntry(false);presentation.closeCast();closeRitual(false);stopPath();clearSurfaces();closeCharacter();engine.save(true);started=false;delete document.body.dataset.sceneStarted;$('game-shell').classList.add('hidden');$('story-dock').classList.add('hidden');$('start-screen').classList.remove('hidden');$('continue-game').disabled=!engine.hasSave()||runSession.isTrial&&runSession.meta.rulesHash!==runSession.trial.rulesHash;syncRunLabels();}
  document.querySelector('.game-brand')?.addEventListener('click',ev=>{ev.preventDefault();returnTitle();});$('btn-title').onclick=returnTitle;
  document.addEventListener('pointerdown',ev=>{const menu=$('game-toolbox');if(menu?.open&&!menu.contains(ev.target))menu.open=false;const picker=$('style-picker');if(!ev.target.closest('.style-control')){picker.classList.add('hidden');$('btn-style').setAttribute('aria-expanded','false');}});
  document.addEventListener('click',ev=>{
    if(finalBattle.isOpen&&!presentation.castOpen&&!ev.target.closest('#final-battle')){ev.preventDefault();ev.stopImmediatePropagation();return;}
    if(performance.now()<scenePointerAfter&&ev.target.closest('#game-canvas')||presentation.castOpen&&!ev.target.closest('#ability-cinematic')){ev.preventDefault();ev.stopImmediatePropagation();return;}
    if(ritualOpen&&!ev.target.closest('#altar-ritual')){ev.preventDefault();ev.stopImmediatePropagation();closeRitual();}
  },true);
  window.addEventListener('blur',stopPath);
  document.addEventListener('pointerdown',()=>{if(settings().music||settings().sfx){audio.unlock();audio.configure(settings(),Math.floor(engine.state.floor/3));}},{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPath();audio.pause();}else audio.resume();});
  systemMotion.addEventListener?.('change',()=>{renderHUD();if(systemMotion.matches)skipPresentation();});
  syncStyleUI();
  renderHUD();
  preloadArt();
})();
