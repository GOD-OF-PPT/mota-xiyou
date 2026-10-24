const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pick=s=>Object.fromEntries(['hp','atk','def','mana','maxMana','coins','keys','relics','fragments','externalRelics','treasures','equipped','orbs','elixirs','choices','switches','quests','tides','selfAwakened','won','ending','kills'].map(k=>[k,s[k]]));
async function runCampaign(page,run,h,report){
 const {close,cell,snap,shot,raw,check,setStage}=h,physical={};await close();await page.evaluate(()=>game.newGame());let cursor=0;
 for(const cp of run.checkpoints){
  if(cp.i<cursor)continue;setStage('campaign '+cp.type+' at '+cp.i);await raw(run.actions.slice(cursor,cp.i));await close();const before=await snap();
  if(['fragment','treasure'].includes(cp.type)){
   await cell(cp.target.x,cp.target.y);await page.locator(`[data-context="${cp.type}"]`).click();await page.waitForFunction(id=>game.state.removed[id],cp.target.id);const after=await snap();if(cp.type==='fragment'){assert.equal(after.fragments.length,before.fragments.length+1);assert.equal(after.hp,before.hp);}else assert.ok(after.treasures.includes(cp.target.treasure));
  }else if(['reveal','activateResonator','rescue','toggleTide','traverse'].includes(cp.type)){
   const button={reveal:'reveal',activateResonator:'resonator',rescue:'rescue',toggleTide:'tide',traverse:'stairs'}[cp.type];await cell(cp.target.x,cp.target.y);await page.locator(`[data-context="${button}"]`).click();if(cp.type==='traverse')await page.waitForFunction(f=>game.state.floor===f,cp.target.to);const after=await snap();if(cp.type==='reveal'){assert.equal(after.revealed[cp.target.id],true);assert.equal(after.mana,before.mana);}if(cp.type==='activateResonator')assert.equal(after.switches[cp.target.id],true);if(cp.type==='rescue')assert.equal(after.quests.bajie,true);if(cp.type==='toggleTide')assert.notEqual(after.tides.weakwater,before.tides.weakwater);
  }else if(cp.type==='choose'){
   await cell(cp.target.x,cp.target.y);await page.locator('[data-context="choice"]').click();if(['bellVow','ferryVow','emberVow','sevenWounds'].includes(cp.target.choice))await shot('choice-'+cp.target.choice);await page.locator(`[data-choice="${cp.args[1]}"]`).click();assert.equal((await snap()).choices[cp.target.choice],cp.args[1]);
  }else if(cp.type==='equipTreasure'){
   await page.keyboard.press('i');await page.locator(`[data-equip="${cp.target}"]`).click();const after=await snap();assert.notEqual(after.equipped.includes(cp.target),before.equipped.includes(cp.target));assert.equal(after.atk,before.atk);assert.equal(after.def,before.def);
  }else if(cp.type==='recallClone'){
   const target=await page.evaluate(id=>TowerData.floors[game.state.floor].entities.find(e=>e.id===id),cp.target);await cell(target.x,target.y);await page.locator('[data-context="recall"]').click();assert.equal((await snap()).switches[target.id],false);
  }else if(cp.type==='offerOrb'){
   await page.keyboard.press('e');await page.getByRole('button',{name:cp.target==='heal'?'奉珠 · 回 50 血':'奉珠 · 换 8 金',exact:true}).click();assert.equal((await snap()).orbs,before.orbs-1);
  }else if(cp.type==='setBossPlan'){
   const boss=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.enemy==='heart'));await cell(boss.x,boss.y);await page.locator('[data-context="plans"]').click();assert.equal(await page.locator('[data-context-plan]').count(),3);const losses={};for(const plan of ['direct','anchor','echoes']){await page.locator(`[data-context-plan="${plan}"]`).click();const p=await page.evaluate(()=>game.preview('heart'));losses[plan]=p.damage;assert.equal(await page.locator('#modal-content .forecast .damage-number').textContent(),String(p.damage));assert.equal((await snap()).hp,before.hp);assert.equal((await snap()).orbs,before.orbs);}
   await page.locator(`[data-context-plan="${cp.target}"]`).click();await shot('boss-preparation-scroll');await close();await shot('boss-scene');const p=await page.evaluate(()=>game.preview('heart'));await page.locator('[data-context="engage"]').click();const after=await snap();assert.equal(after.hp,before.hp-p.damage);assert.equal(after.orbs,before.orbs-p.resourceCost.orbs);physical.bossPreparations=losses;cursor=cp.i+2;continue;
  }else if(cp.type==='awakenSelf'){
   const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'照见自身 · 无骨归真',exact:true}).click();assert.equal((await snap()).selfAwakened,true);await shot('self-awakening');
  }else if(cp.type==='finish'){
   await close();const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'破劫归尘 · 为众生',exact:true}).click();assert.equal((await snap()).won,true);await shot('ending-release');
  }
  physical[cp.type]=(physical[cp.type]||0)+1;cursor=cp.i+1;await close();
 }
 await raw(run.actions.slice(cursor));const final=await snap();assert.deepEqual(pick(final),pick(run.final));assert.equal(physical.fragment,16);assert.equal(physical.treasure,6);await close();await page.keyboard.press('z');const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'留灯守塔 · 我来守',exact:true}).click();assert.equal((await snap()).ending,'keep');await shot('ending-keep');await close();await page.keyboard.press('Control+s');const saved=await snap();await page.keyboard.press('l');await page.getByRole('button',{name:'读取手动存档',exact:true}).click();assert.deepEqual(await snap(),saved);
 report.physical=physical;report.final={hp:final.hp,atk:final.atk,def:final.def,orbs:final.orbs,visited:final.visited.length,fragments:final.fragments.length,treasures:final.treasures.length};report.crossedVowGates=run.crossedVowGates;check('one complete 18-floor campaign, all fragments / treasures / mechanisms, both endings, exact save/load',{physical});
}
module.exports={runCampaign};
