/* Whole campaign via public actions, with real UI for every new fragment, treasure, equipment and puzzle. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
global.window=global;require('../js/world.js');require('../js/engine.js');
const record=JSON.parse(fs.readFileSync(path.join(__dirname,'playthrough-v4-blue-atk-echoes.json'),'utf8')),actions=record.actions;
const sim=new TowerEngine(TowerData);sim.newGame();const checkpoints=[];
for(let i=0;i<actions.length;i++){
 const a=actions[i];let type=a.type,target=a.args[0];
 if(type==='step'){const d=TowerRules.directions[a.args[0]],t=sim.getEntity(sim.state.x+d[0],sim.state.y+d[1]);if(t&&['fragment','treasure'].includes(t.type)){type=t.type;target=t;}}
 if(['fragment','treasure','reveal','activateResonator','rescue','toggleTide','choose','equipTreasure','recallClone','setBossPlan','awakenSelf','finish','traverse','offerOrb'].includes(type))checkpoints.push({i,type,target,args:a.args,floor:sim.state.floor});
 assert.ok(sim[a.type](...a.args),'Offline trace invalid at '+i+' '+a.type);
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],physical={};page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/'));await page.click('#new-game');await page.locator('#modal-actions button').last().click();await page.waitForTimeout(200);
 const close=async()=>{for(let i=0;i<25&&await page.locator('#modal-root').isVisible();i++)await page.locator('#modal-close').click();};
 const raw=async(list)=>{for(let i=0;i<list.length;i+=100)await page.evaluate(group=>{for(const a of group){if(!game[a.type](...a.args))throw new Error('Public replay rejected '+a.type+' '+JSON.stringify(a.args));for(let j=0;j<25&&!document.getElementById('modal-root').classList.contains('hidden');j++)document.getElementById('modal-close').click();}},list.slice(i,i+100));};
 const cell=async(x,y)=>{if(await page.locator('#btn-overview').getAttribute('aria-pressed')!=='true')await page.click('#btn-overview');await page.waitForTimeout(130);const b=await page.locator('#game-canvas').boundingBox();await page.mouse.click(b.x+(x+.5)*b.width/21,b.y+(y+.5)*b.height/21);};
 const snapshot=()=>page.evaluate(()=>game.snapshot());let cursor=0,awaitingEnding=false;
 for(const cp of checkpoints){
  if(cp.i<cursor)continue;await raw(actions.slice(cursor,cp.i));if(!(cp.type==='finish'&&awaitingEnding))await close();const a=actions[cp.i],before=await snapshot();
  if(['fragment','treasure'].includes(cp.type)){
    await cell(cp.target.x,cp.target.y);await page.locator(`[data-context="${cp.type}"]`).click();await page.waitForFunction(({id})=>game.state.removed[id],{id:cp.target.id});
    const after=await snapshot();if(cp.type==='fragment'){assert.equal(after.fragments.length,before.fragments.length+1);assert.equal(after.hp,before.hp);}else assert.ok(after.treasures.includes(cp.target.treasure));
    if(cp.type==='treasure'&&before.treasures.length===0){await close();await page.keyboard.press('i');await page.screenshot({path:path.join(__dirname,'v4-first-treasure.png')});}
  }else if(['reveal','activateResonator','rescue','toggleTide','traverse'].includes(cp.type)){
    const button={reveal:'reveal',activateResonator:'resonator',rescue:'rescue',toggleTide:'tide',traverse:'stairs'}[cp.type];await cell(cp.target.x,cp.target.y);await page.locator(`[data-context="${button}"]`).click();
    const after=await snapshot();if(cp.type==='reveal'){assert.equal(after.revealed[cp.target.id],true);assert.equal(after.mana,before.mana);}if(cp.type==='activateResonator')assert.equal(after.switches[cp.target.id],true);if(cp.type==='rescue')assert.equal(after.quests.bajie,true);if(cp.type==='toggleTide')assert.notEqual(after.tides.weakwater,before.tides.weakwater);if(cp.type==='traverse')assert.equal(after.floor,cp.target.to);
  }else if(cp.type==='choose'){
    await cell(cp.target.x,cp.target.y);await page.locator('[data-context="choice"]').click();if(cp.target.choice==='locks'||cp.target.choice==='sevenWounds')await page.screenshot({path:path.join(__dirname,`v4-choice-${cp.target.choice}.png`)});await page.locator(`[data-choice="${cp.args[1]}"]`).click();assert.equal(await page.evaluate(group=>game.state.choices[group],cp.target.choice),cp.args[1]);
  }else if(cp.type==='equipTreasure'){
    await page.keyboard.press('i');await page.locator(`[data-equip="${cp.target}"]`).click();const after=await snapshot();assert.notEqual(after.equipped.includes(cp.target),before.equipped.includes(cp.target));assert.equal(after.atk,before.atk);assert.equal(after.def,before.def);
  }else if(cp.type==='recallClone'){
    const target=await page.evaluate(id=>TowerData.floors[game.state.floor].entities.find(e=>e.id===id),cp.target);await cell(target.x,target.y);await page.locator('[data-context="recall"]').click();assert.equal(await page.evaluate(id=>game.state.switches[id],target.id),false);
  }else if(cp.type==='offerOrb'){
    await page.keyboard.press('e');await page.getByRole('button',{name:cp.target==='heal'?'奉珠 · 回 50 血':'奉珠 · 换 8 金',exact:true}).click();const after=await snapshot();assert.equal(after.orbs,before.orbs-1);if(cp.target==='heal')assert.equal(after.hp,before.hp+50);
  }else if(cp.type==='setBossPlan'){
    const boss=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.enemy==='heart'));await cell(boss.x,boss.y);await page.locator('[data-context="fight"]').click();assert.equal(await page.locator('.boss-plan').count(),3);const losses={};for(const id of ['direct','anchor','echoes']){await page.locator(`[data-boss-plan="${id}"]`).click();losses[id]=await page.locator('#modal-content .damage-number').textContent();}await page.locator(`[data-boss-plan="${cp.target}"]`).click();await page.screenshot({path:path.join(__dirname,'v4-boss-preparation.png')});const forecast=await page.evaluate(()=>game.preview('heart'));await page.locator('#modal-actions .primary-button').click();const after=await snapshot();assert.equal(after.hp,before.hp-forecast.damage);assert.equal(after.orbs,before.orbs-forecast.resourceCost.orbs);cursor=cp.i+2;physical.bossPreparations=losses;await close();continue;
  }else if(cp.type==='awakenSelf'){
    const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'照见自身 · 无骨归真',exact:true}).click();assert.equal(await page.evaluate(()=>game.state.selfAwakened),true);const awakened=await snapshot();await page.getByRole('button',{name:'跳过演出',exact:true}).click();assert.deepEqual(await snapshot(),awakened);await page.screenshot({path:path.join(__dirname,'v4-self-awakening.png')});await page.getByRole('button',{name:'作最后的选择',exact:true}).click();awaitingEnding=true;cursor=cp.i+1;physical.awakenSelf=true;continue;
  }else if(cp.type==='finish'){
    assert.equal(awaitingEnding,true);await page.getByRole('button',{name:'破劫归尘 · 为众生',exact:true}).click();assert.equal(await page.evaluate(()=>game.state.won),true);await page.screenshot({path:path.join(__dirname,'v4-ending.png')});
  }
  physical[cp.type]=(physical[cp.type]||0)+1;cursor=cp.i+1;await close();
 }
 await raw(actions.slice(cursor));assert.equal(await page.evaluate(()=>game.state.externalRelics),16);assert.equal(await page.evaluate(()=>game.state.won),true);await close();await page.keyboard.press('z');
 const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'留灯守塔 · 我来守',exact:true}).click();assert.equal(await page.evaluate(()=>game.state.ending),'keep');await close();
 await page.keyboard.press('Control+s');await page.keyboard.press('l');await page.getByRole('button',{name:'读取手动存档',exact:true}).click();assert.equal(await page.evaluate(()=>game.state.ending),'keep');assert.deepEqual(errors,[]);
 const result={physical,errors,bothEndings:true,manualLoad:true,all16FragmentsViaUI:physical.fragment===16,all6TreasuresViaUI:physical.treasure===6,final:await page.evaluate(()=>({hp:game.state.hp,atk:game.state.atk,def:game.state.def,equipped:game.state.equipped,orbs:game.state.orbs,coins:game.state.coins}))};fs.writeFileSync(path.join(__dirname,'v4-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
