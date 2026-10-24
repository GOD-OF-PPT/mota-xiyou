/* The final encounter planner is read-only until one explicit fight call. */
(() => {
  'use strict';
  const ids=['staff','morph','clone'],names=['破执印','见微印','同行印'],glyphs=['棒','蝉','影'];
  class TowerFinale {
    constructor({engine,motion,onEnter,onClose,onCommit}){
      Object.assign(this,{engine,motion,onEnter,onClose,onCommit});this.node=document.getElementById('final-battle');this.canvas=this.node.querySelector('canvas');this.phase=0;this.seals=[null,null,null];this.busy=false;
      this.node.addEventListener('click',e=>{const button=e.target.closest('button');if(!button||button.disabled)return;
        if(button.hasAttribute('data-final-close'))this.close();else if(button.hasAttribute('data-final-phase'))this.selectPhase(+button.dataset.finalPhase);else if(button.dataset.finalSeal)this.assign(button.dataset.finalSeal);else if(button.dataset.finalPlan){this.plan=button.dataset.finalPlan;this.render();this.focus('[data-final-plan="'+this.plan+'"]');}else if(button.hasAttribute('data-final-reset')){this.seals=[null,null,null];this.render();this.focus('[data-final-reset]');}else if(button.hasAttribute('data-final-commit'))this.commit();
      });
      window.addEventListener('resize',()=>{if(this.isOpen)this.draw(performance.now());});
    }
    get isOpen(){return !this.node.hidden;}
    open(entity){
      if(this.engine.state.defeated||this.engine.state.won||!this.engine.isCurrent(entity)||this.engine.distance(entity)!==1||this.engine.data.enemies[entity.enemy]?.trait!=='boss'||this.engine.state.relics.length<5)return false;
      this.entity=entity;this.phase=0;this.seals=[null,null,null];this.plan=this.engine.state.bossPlan;this.busy=false;this.started=performance.now();this.node.hidden=false;document.body.dataset.finalBattle='true';this.render();this.focus('[data-final-phase="0"]');
      const tick=time=>{if(!this.isOpen)return;this.draw(time);if(this.motion()!=='reduced')this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);this.onEnter?.();return true;
    }
    close(notify=true){const was=this.isOpen;this.node.hidden=true;delete document.body.dataset.finalBattle;cancelAnimationFrame(this.raf);if(was&&notify)this.onClose?.();}
    focus(selector='[data-final-commit]'){this.node.querySelector(selector)?.focus({preventScroll:true});}
    preview(){return this.engine.preview(this.entity.enemy,{bossPlan:this.plan,bossSeals:this.seals});}
    selectPhase(index){this.phase=(index+3)%3;this.render();this.focus('[data-final-phase="'+this.phase+'"]');}
    assign(id){
      if(!ids.includes(id)||this.busy)return;const old=this.seals[this.phase],from=this.seals.indexOf(id);
      if(old===id)this.seals[this.phase]=null;else{if(from>=0)this.seals[from]=old;this.seals[this.phase]=id;}
      this.render();this.focus('[data-final-seal="'+id+'"]');
    }
    render(){
      const s=this.engine.state,p=this.preview(),base=this.engine.preview(this.entity.enemy,{bossPlan:this.plan}),esc=window.TowerText.escape,phase=p.phases[this.phase];
      this.current=p;this.node.dataset.phase=this.phase;
      this.node.querySelector('[data-final-resources]').textContent=`生命 ${s.hp} · 凝息珠 ${s.orbs}`;
      this.node.querySelector('[data-final-phases]').innerHTML=p.phases.map((q,i)=>`<button data-final-phase="${i}" aria-pressed="${i===this.phase}" class="final-phase ${i===this.phase?'selected':''}"><small>第 ${i+1} 相 · ${['先手','重甲','法术'][i]}</small><b>${esc(q.name)}</b><span>${esc(q.sealName)}</span><strong>${q.possible?'损失 '+q.damage:'无法破防'}</strong></button>`).join('');
      this.node.querySelector('[data-final-phase-note]').textContent=[`金甲先手。同行印能少受一击，也可试试先破执。`,`执念重甲。提高每棒伤害，往往比一味承受更有用。`,`心火无视防御。见微印可以减弱每次法术反击。`][this.phase];
      this.node.querySelector('[data-final-seals]').innerHTML=ids.map((id,i)=>{const at=this.seals.indexOf(id);return `<button data-final-seal="${id}" aria-pressed="${phase.seal===id}"><kbd>${i+1}</kbd><i aria-hidden="true">${glyphs[i]}</i><b>${names[i]}</b><span>${esc(TowerRules.bossSeals[id].rule)}</span><small>${at===this.phase?'已落此相 · 再按可收回':at>=0?'在第 '+(at+1)+' 相 · 点击交换':'尚未落印'}</small></button>`;}).join('');
      this.node.querySelectorAll('[data-final-seal]').forEach(b=>b.setAttribute('aria-pressed',String(phase.seal===b.dataset.finalSeal)));
      this.node.querySelector('[data-final-plans]').innerHTML=this.engine.bossOptions().map(q=>`<button data-final-plan="${q.id}" aria-pressed="${q.id===this.plan}"><b>${esc(q.label)}</b><span>${q.cost.orbs?'耗 '+q.cost.orbs+' 凝息珠':'保留凝息珠'}</span></button>`).join('');
      this.node.querySelector('[data-final-plan-note]').textContent=this.engine.bossOptions().find(q=>q.id===this.plan).description;
      const saved=Number.isFinite(base.damage)&&p.possible?base.damage-p.damage:0;
      this.node.querySelector('[data-final-cost]').textContent=p.possible?`总损失 ${p.damage} · 战后生命 ${Math.max(0,s.hp-p.damage)}${saved>0?' · 比未布阵少损 '+saved:''}`:'当前布阵仍不能破防，请先调整成长或行装';
      this.node.querySelector('[data-final-extra]').textContent=`三相 ${p.possible?p.normalDamage:'—'} + 心火与法器附加 ${p.possible?p.traitDamage:'—'} · 每印一战一次，不另耗灵息`;
      const commit=this.node.querySelector('[data-final-commit]');commit.disabled=this.busy||!p.possible||!p.canAfford||!p.survive;commit.textContent=!p.canAfford?'凝息珠不足，请换准备':!p.possible?'尚未破防':!p.survive?'生命不足，请先整装':`确认破阵 · ${p.resourceCost.orbs?'耗 '+p.resourceCost.orbs+' 珠':'不耗珠'}`;
      this.node.querySelector('[data-final-live]').textContent=`当前第 ${this.phase+1} 相，${phase.sealName}。${phase.sealRule}。`;
      this.draw(performance.now());
    }
    commit(){if(this.busy||!this.isOpen)return false;const p=this.preview();if(!p.possible||!p.canAfford||!p.survive)return false;this.busy=true;const entity=this.entity,options={bossPlan:this.plan,bossSeals:[...this.seals]};this.close(false);const ok=this.engine.fight(entity,options);this.onCommit?.(ok);return ok;}
    handleKey(ev){
      if(ev.ctrlKey||ev.metaKey||ev.altKey)return;const k=ev.key.toLowerCase();if(ev.repeat){ev.preventDefault();return;}
      if(k==='escape'){ev.preventDefault();this.close();return;}
      if(k==='arrowleft'||k==='arrowright'){ev.preventDefault();this.selectPhase(this.phase+(k==='arrowleft'?-1:1));return;}
      if(/^[1-3]$/.test(k)){ev.preventDefault();this.assign(ids[+k-1]);return;}
      if(k==='enter'){ev.preventDefault();this.commit();return;}
      if(k==='tab'){const controls=[...this.node.querySelectorAll('button:not(:disabled)')],i=controls.indexOf(document.activeElement);ev.preventDefault();controls[(i+(ev.shiftKey?-1:1)+controls.length)%controls.length]?.focus({preventScroll:true});return;}
      if(k!==' ')ev.preventDefault();
    }
    draw(time){window.TowerFilmArt?.finale?.(this.canvas,{phase:this.phase,seals:this.seals,phases:this.current?.phases||[],progress:this.motion()==='reduced'?1:(time-this.started)/1000,motion:this.motion(),rescued:this.engine.state.rescued});}
  }
  window.TowerFinale=TowerFinale;
})();
