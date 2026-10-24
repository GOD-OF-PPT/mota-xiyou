/* Present task instructions at the title screen, leaving the game HUD intact. */
(function () {
  'use strict';
  const s=window.TowerStudy;
  const descriptions={
    'first-three':'从第一层出发，找到并归位三枚舍利，唤醒石生心印。自行决定路线；不要求清空守卫。',
    ferry:s?.objective==='keep-key'?'保留起始黄钥，取得本层舍利、接通定风，然后从上行塔阶前往下一层。':'选择供灯，经过南北两道栈门；取得舍利、接通定风，再从上行塔阶前往下一层。',
    silk:s?.objective==='atk'?'取得攻击经、收回丙影，以甲乙驻守接通上行，再从塔阶前往下一层。':'取得护心经、收回丙影，以甲乙驻守接通上行，再从塔阶前往下一层。'
  };
  if(!s || s.failure) {
    // Keep nodes available to pending asset callbacks, but hide the unusable game.
    for(const node of document.body.children)node.hidden=true;
    const main=document.createElement('main'),h=document.createElement('h1'),p=document.createElement('p'),a=document.createElement('a');
    main.style.cssText='max-width:700px;margin:15vh auto;padding:32px;font:18px/1.8 sans-serif';
    h.textContent='试玩尚未开始';p.textContent=s?.failure||'隔离存储未能启用。';a.textContent='返回试玩准备页';a.href='playtest-v23.html';main.append(h,p,a);document.body.append(main);return;
  }
  document.title=`${s.participant} · ${s.variant==='baseline'?'v22':'v23'} · 对照试玩`;
  document.querySelector('.start-story').textContent=descriptions[s.task];
  document.querySelector('.start-edition').textContent=`${s.participant} · ${s.variant==='baseline'?'v22 基线':'v23 新版'} · 第 ${s.round} 轮`;
  const note=document.querySelector('.start-save-note');
  note.textContent='独立试玩进度 · 刷新可继续 · 完成后由观察者记录原话';
  const reset=document.querySelector('#new-game');
  if(s.task!=='first-three' || game.hasSave()) {
    reset.textContent='重置本段试玩';
    reset.onclick=()=>{ localStorage.clear();location.reload(); };
  }
  const back=document.createElement('a');back.textContent='返回试玩准备页';back.href='playtest-v23.html'+location.search;
  back.style.cssText='display:inline-block;margin-top:18px;color:inherit';note.after(back);
})();
