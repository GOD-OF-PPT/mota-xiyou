/* Optional final tactics live in the existing scene forecast. Drafts never save. */
(() => {
  'use strict';
  const ids=['staff','morph','clone'],names=['破执印','见微印','同行印'];
  class TowerFinale {
    constructor({engine,onChange,onLayout,beforeCommit,onCommit}){Object.assign(this,{engine,onChange,onLayout,beforeCommit,onCommit});this.key='';this.editing=false;this.busy=false;}
    get isOpen(){return !!this.node?.isConnected&&!!this.node.querySelector('[data-final-toggle][open]');}
    prepare(entity){
      const s=this.engine.state,key=[s.floor,entity.id,s.turn,s.hp,s.atk,s.def,s.orbs,s.bossPlan,s.equipped.join(','),s.relics.join(',')].join(':');
      if(this.key!==key){this.key=key;this.entity=entity;this.phase=0;this.seals=[null,null,null];this.plan=s.bossPlan;this.planOpen=false;this.editing=false;this.busy=false;}
    }
    close(notify=true){this.editing=false;if(!notify){this.key='';this.node=null;}else this.onChange?.('[data-final-toggle]>summary');}
    preview(){return this.engine.preview(this.entity.enemy,{bossPlan:this.plan,bossSeals:this.seals});}
    focus(selector){this.node?.querySelector(selector)?.focus({preventScroll:true});}
    markup(entity){
      this.prepare(entity);const s=this.engine.state,p=this.preview(),esc=window.TowerText.escape,phase=p.phases[this.phase],option=this.engine.bossOptions().find(q=>q.id===this.plan);
      const safe=p.possible&&p.survive&&p.canAfford,status=!p.possible?'尚未破防':!p.canAfford?'凝息珠不足':!p.survive?'本战会力竭':'三相可破';
      return `<p class="combat-meta">最终决战 <span>三相连续结算</span></p><section class="combat-result ${safe?'safe':'danger'}" aria-label="三相战损预览"><strong class="combat-verdict">${status}</strong><div class="combat-loss"><span>预计总损失</span><b class="damage-number">${p.possible?p.damage:'未破防'}</b></div><p class="combat-health">${p.possible?`生命 ${s.hp} → ${Math.max(0,s.hp-p.damage)}`:'先调整成长与法器'}</p><small>${esc(option.label)} · ${p.resourceCost.orbs?`耗 ${p.resourceCost.orbs} 珠 / 持有 ${s.orbs} 珠`:'不耗凝息珠'}</small></section><div class="combat-primary"><button class="context-button" data-final-commit ${safe?'':'disabled'}>${safe?'破阵迎战 <kbd>F</kbd>':'先调整准备'}</button></div><details class="combat-details final-tactics" data-final-toggle ${this.editing?'open':''}><summary>三印布阵 · 可选 <span aria-hidden="true">⌄</span></summary><div class="combat-details-body"><p class="final-rule">每相可落一印，每印仅用一次。不耗灵息。</p><div class="final-phases" aria-label="选择落印之相">${p.phases.map((q,i)=>`<button data-final-phase="${i}" aria-pressed="${i===this.phase}"><small>${['壹 · 金甲','贰 · 执念','叁 · 心火'][i]}</small><b>${esc(q.sealName)}</b><span>${q.possible?'损失 '+q.damage:'未破防'}</span></button>`).join('')}</div><div class="final-seals" aria-label="为当前相选择心印">${ids.map((id,i)=>`<button data-final-seal="${id}" aria-pressed="${phase.seal===id}"><kbd>${i+1}</kbd> ${names[i]}</button>`).join('')}</div><p class="final-rule" data-final-live aria-live="polite">${phase.seal?`${phase.sealName}：${esc(phase.sealRule)}。再选可收回。`:['金甲先手：同行印可少受一次反击。','执念重甲：破执印可提高每棒伤害。','心火无视防御：见微印可减弱法术反击。'][this.phase]}</p><details class="final-plan-reading" ${this.planOpen?'open':''}><summary>凝息珠准备 · ${esc(option.label)}</summary><div class="final-plans">${this.engine.bossOptions().map(q=>`<button data-final-plan="${q.id}" aria-pressed="${q.id===this.plan}">${esc(q.label)}<small>${q.cost.orbs?'耗 '+q.cost.orbs+' 珠':'不耗珠'}</small></button>`).join('')}</div><p class="final-rule">${esc(option.description)}</p></details><div class="final-minor"><button data-final-reset>收回三印</button><small>← → 选相 · 1 / 2 / 3 落印</small></div>${!safe&&p.possible&&p.canAfford?'<button class="scene-rule-button danger-engage" data-final-risk>仍要迎战 · 会力竭</button>':''}</div></details>`;
    }
    bind(holder){
      if(!holder.querySelector('[data-final-toggle]')){this.node=null;this.editing=false;return;}
      this.node=holder;const fold=holder.querySelector('[data-final-toggle]');
      holder.querySelector('.final-plan-reading').addEventListener('toggle',ev=>{if(ev.target.isConnected){this.planOpen=ev.target.open;this.onLayout?.();}});
      holder.closest('.context-card').classList.toggle('expanded',this.editing);
      fold.addEventListener('toggle',()=>{if(!fold.isConnected)return;this.editing=fold.open;holder.closest('.context-card').classList.toggle('expanded',this.editing);this.onLayout?.();});
      holder.querySelectorAll('[data-final-phase],[data-final-seal],[data-final-plan],[data-final-reset],[data-final-commit],[data-final-risk]').forEach(button=>button.onclick=()=>{
        if(button.disabled||this.busy)return;
        this.editing=fold.open;
        this.planOpen=holder.querySelector('.final-plan-reading').open;
        if(button.hasAttribute('data-final-commit')||button.hasAttribute('data-final-risk')){this.commit(button.hasAttribute('data-final-risk'));return;}
        if(button.hasAttribute('data-final-phase'))this.phase=+button.dataset.finalPhase;
        else if(button.dataset.finalSeal)this.assign(button.dataset.finalSeal);
        else if(button.dataset.finalPlan)this.plan=button.dataset.finalPlan;
        else this.seals=[null,null,null];
        const attr=[...button.attributes].find(a=>a.name.startsWith('data-final-'));this.onChange?.(`[${attr.name}${attr.value?'="'+attr.value+'"':''}]`);
      });
    }
    assign(id){if(!ids.includes(id))return;const old=this.seals[this.phase],from=this.seals.indexOf(id);if(old===id)this.seals[this.phase]=null;else{if(from>=0)this.seals[from]=old;this.seals[this.phase]=id;}}
    commit(allowLethal=false){
      if(this.busy||!this.entity||!this.engine.isCurrent(this.entity)||this.engine.distance(this.entity)!==1||this.engine.state.relics.length<5)return false;
      const p=this.preview();if(!p.possible||!p.canAfford||(!p.survive&&!allowLethal))return false;
      this.busy=true;this.editing=false;const entity=this.entity,options={bossPlan:this.plan,bossSeals:[...this.seals]};
      // Lock only the synchronous settlement. Undo can legally restore this exact draft.
      try{this.beforeCommit?.();const ok=this.engine.fight(entity,options);this.onCommit?.(ok);return ok;}finally{this.busy=false;}
    }
    handleKey(ev){
      if(ev.ctrlKey||ev.metaKey||ev.altKey)return;const k=ev.key.toLowerCase();
      this.editing=this.isOpen;
      if(ev.repeat){ev.preventDefault();return;}
      if(k==='escape'){ev.preventDefault();this.close();return;}
      if(k==='arrowleft'||k==='arrowright'){ev.preventDefault();this.phase=(this.phase+(k==='arrowleft'?2:1))%3;this.onChange?.(`[data-final-phase="${this.phase}"]`);return;}
      if(/^[1-3]$/.test(k)){ev.preventDefault();this.assign(ids[+k-1]);this.onChange?.(`[data-final-seal="${ids[+k-1]}"]`);return;}
      // Enter/Space on a control keep its native action; F is always explicit combat.
      if(k==='f'){ev.preventDefault();this.commit();return;}
      if(k==='tab'||k==='enter'||k===' ')return;
      ev.preventDefault();
    }
  }
  window.TowerFinale=TowerFinale;
})();
