/* Independent scene/UI acceptance. The fixture source is a complete legal
   campaign; every game mutation below uses an existing public engine action or
   a visible UI control. Geometry uses the real canvas renderer instance. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./v6-replay-fixtures.cjs');
const run=prepare(process.env.V6_TRACE||'playthrough-v5-free-mixed-direct-bypasses.json');
const output=path.resolve(__dirname,'../audits'),screenshots=[],checks=[],physical={},errors=[];
const report={trace:process.env.V6_TRACE||'playthrough-v5-free-mixed-direct-bypasses.json',checks,physical,errors,screenshots};
const pick=s=>Object.fromEntries(['hp','atk','def','mana','maxMana','coins','keys','relics','fragments','externalRelics','treasures','equipped','orbs','elixirs','choices','switches','quests','tides','selfAwakened','won','ending','kills'].map(k=>[k,s[k]]));
let stage='boot',page;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/'));
  await page.waitForFunction(()=>window.TowerAssets?.ready&&document.querySelector('#new-game')&&!document.querySelector('#new-game').disabled);
  const snap=()=>page.evaluate(()=>game.snapshot());
  const shot=async(name)=>{const file=path.join(output,`v6-${name}.png`);await page.waitForTimeout(350);await page.screenshot({path:file});screenshots.push(file);};
  const check=(name,data={})=>{checks.push({name,...data});console.log('PASS '+name);};
  const close=async()=>{
   for(let i=0;i<10&&await page.locator('#modal-root').isVisible();i++){
    if(await page.locator('#modal-close').isDisabled())throw new Error('An undismissable surface is blocking play');
    await page.locator('#modal-close').click();
   }
   if(await page.locator('#character-drawer').getAttribute('aria-hidden')==='false')await page.locator('#character-close').click();
  };
  const load=async(state)=>{await close();assert.equal(await page.evaluate(s=>game.load(JSON.stringify(s)),state),true);await page.waitForTimeout(150);};
  const cell=async(x,y)=>{
   await close();
   if(await page.locator('.context-card.has-selection').count()&&await page.locator('#context-dismiss').isVisible())await page.locator('#context-dismiss').click();
   if(await page.locator('#btn-overview').getAttribute('aria-pressed')!=='true')await page.keyboard.press('m');
   const pos=await page.evaluate(({x,y})=>{const canvas=document.querySelector('#game-canvas'),r=canvas.getBoundingClientRect(),p=canvas.towerRenderer.screenPoint(x,y);if(!p)throw new Error('Cell outside viewport');return {x:r.left+p.x,y:r.top+p.y,roundtrip:canvas.towerRenderer.cellAt(r.left+p.x,r.top+p.y)};},{x,y});
   assert.deepEqual(pos.roundtrip,{x,y});await page.waitForTimeout(115);await page.mouse.click(pos.x,pos.y);
   await page.waitForFunction(({x,y})=>game.selection?.x===x&&game.selection?.y===y,{x,y},{timeout:3000});
  };
  const freeDirection=()=>page.evaluate(()=>Object.entries(TowerRules.directions).find(([dir,[dx,dy]])=>game.getTile(game.state.x+dx,game.state.y+dy)==='.'&&!game.getEntity(game.state.x+dx,game.state.y+dy))?.[0]);
  const keyFor={up:'ArrowUp',right:'ArrowRight',down:'ArrowDown',left:'ArrowLeft'};
  const raw=async(actions)=>{for(let i=0;i<actions.length;i+=60)await page.evaluate(group=>{for(const a of group){if(!game[a.type](...a.args))throw new Error('Public replay rejected '+a.type+' '+JSON.stringify(a.args));const close=document.querySelector('#modal-close');if(!document.querySelector('#modal-root').classList.contains('hidden')&&!close.disabled)close.click();}},actions.slice(i,i+60));};

  await shot('title-material');await page.click('#new-game');await page.waitForTimeout(180);
  assert.equal(await page.locator('[role="dialog"], [aria-modal="true"]').count(),0);
  const full=await page.locator('#game-canvas').boundingBox();assert.ok(Math.abs(full.x)<1&&Math.abs(full.y)<1&&Math.abs(full.width-1440)<1&&Math.abs(full.height-1000)<1);
  assert.equal(await page.locator('#character-drawer').getAttribute('aria-hidden'),'true');
  check('fullscreen scene with no modal dialog semantics',{canvas:full});

  stage='nonmodal story and drawers';
  assert.equal(await page.locator('#story-dock').isVisible(),true);
  const storyBounds=await page.locator('#story-dock').boundingBox();assert.ok(!(storyBounds.x<=720&&storyBounds.x+storyBounds.width>=720&&storyBounds.y<=500&&storyBounds.y+storyBounds.height>=500),'Story covers the scene center');
  const storyBefore=await page.locator('#story-counter').textContent(),textBefore=await page.locator('#story-text').textContent();
  const direction=await freeDirection();assert.ok(direction);const beforeMove=await snap();await page.keyboard.press(keyFor[direction]);
  assert.equal((await snap()).turn,beforeMove.turn+1);assert.equal(await page.locator('#story-dock').evaluate(e=>e.classList.contains('collapsed')),true);
  assert.equal(await page.locator('#story-counter').textContent(),storyBefore);assert.equal(await page.locator('#story-text').textContent(),textBefore);
  await page.keyboard.press('Space');assert.equal(await page.locator('#story-counter').textContent(),storyBefore);
  const beforeDrawer=await snap();await page.keyboard.press('c');assert.equal(await page.locator('#character-drawer').getAttribute('aria-hidden'),'false');assert.deepEqual(await snap(),beforeDrawer);
  await page.keyboard.press('c');assert.equal(await page.locator('#character-drawer').getAttribute('aria-hidden'),'true');
  await page.keyboard.press('i');assert.equal(await page.locator('#modal-root').isVisible(),true);const beforeInventory=await snap(),free=await freeDirection();assert.ok(free);
  await page.waitForTimeout(130);await page.keyboard.press(keyFor[free]);assert.equal((await snap()).turn,beforeInventory.turn+1);assert.equal(await page.locator('#modal-root').isVisible(),false);
  check('story collapses without consuming pages; C drawer is reversible; movement dismisses inventory');

  stage='combat input guard';
  const enemy=run.firstFight.target,simulation=new TowerEngine(TowerData);assert.equal(simulation.load(JSON.stringify(run.firstFight.before)),true);
  const dx=enemy.x-simulation.state.x,dy=enemy.y-simulation.state.y,dir=Object.keys(TowerRules.directions).find(k=>TowerRules.directions[k][0]===dx&&TowerRules.directions[k][1]===dy);assert.ok(dir);
  assert.equal(simulation.step(dir),false);const encounter=simulation.snapshot();
  await load(encounter);await page.locator('#game-canvas').focus();
  const beforeCombat=await snap(),forecast=await page.evaluate(e=>game.preview(e.enemy),enemy);
  await page.keyboard.down('e');assert.equal((await snap()).hp,beforeCombat.hp);assert.equal((await snap()).removed[enemy.id],undefined);
  await page.keyboard.down('e');await page.waitForTimeout(140);await page.keyboard.down('e');await page.keyboard.up('e');
  await page.keyboard.press('Space');
  await page.locator('[data-context="engage"]').focus();await page.keyboard.press('Space');await page.locator('#game-canvas').focus();
  for(let i=0;i<3;i++){await page.keyboard.press(keyFor[dir]);await page.waitForTimeout(115);}
  assert.equal((await snap()).hp,beforeCombat.hp);assert.equal((await snap()).removed[enemy.id],undefined);
  assert.equal(await page.locator('.context-card .forecast .damage-number').textContent(),String(forecast.damage));
  assert.equal(await page.locator('#modal-root').isVisible(),false);
  const previewBounds=await page.locator('.context-card').boundingBox();assert.ok(previewBounds.width<=231&&previewBounds.height<=161,'Ordinary combat preview still has large webpage card dimensions');
  for(const details of await page.locator('.scene-calculation').all())assert.equal(await details.evaluate(e=>e.open),false);
  report.normalPreview=previewBounds;
  await shot('input-guard-preview');
  const beforeRules=await snap();await page.locator('[data-context="rules"]').click();assert.deepEqual(await snap(),beforeRules);
  const ruleBounds=await page.locator('#modal-panel').boundingBox();assert.ok(ruleBounds.x>720||ruleBounds.x+ruleBounds.width<720,'Detailed rules cover the scene center');
  await shot('rules-edge-scroll');await close();
  await page.keyboard.press('e');const afterCombat=await snap();assert.equal(afterCombat.hp,beforeCombat.hp-forecast.damage);assert.equal(afterCombat.removed[enemy.id],true);
  check('first E previews, held E / directions / Space do not fight, new E confirms exact damage',{enemy:enemy.id,damage:forecast.damage});

  stage='style and responsive captures';
  await load(encounter);await cell(enemy.x,enemy.y);await page.keyboard.press('f');
  const exactBefore=await snap();report.styleGeometry={};
  for(const style of ['material','mural']){
   await page.evaluate(style=>TowerStyle.set(style),style);await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>TowerAssets.style),style);assert.deepEqual(await snap(),exactBefore);
   const geometry=await page.evaluate(()=>{const ids=['game-canvas','story-dock','character-drawer'];return Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,width:r.width,height:r.height}];}));});
   report.styleGeometry[style]=geometry;await shot('desktop-'+style);
   const stats=await page.evaluate(()=>({style:TowerAssets.style,ready:TowerAssets.ready,...TowerAssets.stats,ids:Object.keys(TowerAssets.manifest.assets).length}));assert.equal(stats.ready,true);assert.deepEqual(stats.failed,[]);report[style+'Assets']=stats;
  }
  check('two actual asset families switch without changing any game state');
  for(const [label,viewport]of [['mobile',{width:390,height:844}],['landscape',{width:844,height:390}]]){
   await page.setViewportSize(viewport);await page.waitForTimeout(180);
   for(const style of ['material','mural']){
    await page.evaluate(style=>TowerStyle.set(style),style);await page.waitForTimeout(130);await cell(enemy.x,enemy.y);await page.keyboard.press('f');await shot(label+'-'+style);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
    const bounds=await page.locator('#game-canvas').boundingBox();assert.equal(Math.round(bounds.width),viewport.width);assert.equal(Math.round(bounds.height),viewport.height);
    const p=await page.evaluate(()=>document.querySelector('#game-canvas').towerRenderer.screenPoint(game.state.x,game.state.y));assert.ok(p&&p.x>=0&&p.y>=0&&p.x<=viewport.width&&p.y<=viewport.height);
   }
  }
  check('full scene and actual map selection on narrow and landscape viewports');
  await page.setViewportSize({width:1366,height:900});await page.evaluate(()=>TowerStyle.set('material'));await page.waitForTimeout(150);

  stage='door choice and limited orb offering';
  await load(run.firstDoor.before);await cell(run.firstDoor.target.x,run.firstDoor.target.y);await page.locator('[data-context="door"]').click();
  const doorBefore=await snap();await page.getByRole('button',{name:'再想一想',exact:true}).click();assert.deepEqual(await snap(),doorBefore);
  await page.keyboard.press('e');await page.getByRole('button',{name:'消耗钥匙 · 开门',exact:true}).click();
  const doorAfter=await snap();assert.equal(doorAfter.keys[run.firstDoor.target.color],doorBefore.keys[run.firstDoor.target.color]-1);assert.equal(doorAfter.removed[run.firstDoor.target.id],true);
  await close();await page.keyboard.press('z');assert.deepEqual(await snap(),doorBefore);
  const offering=prepare('playthrough-v5-blue-atk-echoes-offering.json').checkpoints.find(cp=>cp.type==='offerOrb');assert.ok(offering);
  await load(offering.before);await page.locator('#game-canvas').focus();await page.keyboard.press('e');await page.getByRole('button',{name:'奉珠 · 回 50 血',exact:true}).click();
  assert.equal((await snap()).hp,offering.before.hp+50);assert.equal((await snap()).orbs,offering.before.orbs-1);await close();
  check('door cancel / consume / undo and an actual finite orb offering are exact');

  stage='full campaign';
  await close();await page.evaluate(()=>game.newGame());let cursor=0;
  for(const cp of run.checkpoints){
   if(cp.i<cursor)continue;stage='campaign '+cp.type+' at action '+cp.i;await raw(run.actions.slice(cursor,cp.i));await close();
   const before=await snap();
   if(['fragment','treasure'].includes(cp.type)){
    await cell(cp.target.x,cp.target.y);await page.locator(`[data-context="${cp.type}"]`).click();await page.waitForFunction(id=>game.state.removed[id],cp.target.id);
    const after=await snap();if(cp.type==='fragment'){assert.equal(after.fragments.length,before.fragments.length+1);assert.equal(after.hp,before.hp);}else assert.ok(after.treasures.includes(cp.target.treasure));
   }else if(['reveal','activateResonator','rescue','toggleTide','traverse'].includes(cp.type)){
    const button={reveal:'reveal',activateResonator:'resonator',rescue:'rescue',toggleTide:'tide',traverse:'stairs'}[cp.type];await cell(cp.target.x,cp.target.y);await page.locator(`[data-context="${button}"]`).click();
    if(cp.type==='traverse')await page.waitForFunction(f=>game.state.floor===f,cp.target.to);
    const after=await snap();if(cp.type==='reveal'){assert.equal(after.revealed[cp.target.id],true);assert.equal(after.mana,before.mana);}if(cp.type==='activateResonator')assert.equal(after.switches[cp.target.id],true);if(cp.type==='rescue')assert.equal(after.quests.bajie,true);if(cp.type==='toggleTide')assert.notEqual(after.tides.weakwater,before.tides.weakwater);
   }else if(cp.type==='choose'){
    await cell(cp.target.x,cp.target.y);await page.locator('[data-context="choice"]').click();assert.equal(await page.locator('[role="dialog"], [aria-modal="true"]').count(),0);
    if(['bellVow','ferryVow','emberVow','sevenWounds'].includes(cp.target.choice))await shot('choice-'+cp.target.choice);
    await page.locator(`[data-choice="${cp.args[1]}"]`).click();assert.equal((await snap()).choices[cp.target.choice],cp.args[1]);
   }else if(cp.type==='equipTreasure'){
    await page.keyboard.press('i');await page.locator(`[data-equip="${cp.target}"]`).click();const after=await snap();assert.notEqual(after.equipped.includes(cp.target),before.equipped.includes(cp.target));assert.equal(after.atk,before.atk);assert.equal(after.def,before.def);
   }else if(cp.type==='recallClone'){
    const target=await page.evaluate(id=>TowerData.floors[game.state.floor].entities.find(e=>e.id===id),cp.target);await cell(target.x,target.y);await page.locator('[data-context="recall"]').click();assert.equal((await snap()).switches[target.id],false);
   }else if(cp.type==='offerOrb'){
    await page.keyboard.press('e');await page.getByRole('button',{name:cp.target==='heal'?'奉珠 · 回 50 血':'奉珠 · 换 8 金',exact:true}).click();assert.equal((await snap()).orbs,before.orbs-1);
   }else if(cp.type==='setBossPlan'){
    const boss=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.enemy==='heart'));await cell(boss.x,boss.y);await page.locator('[data-context="plans"]').click();assert.equal(await page.locator('[data-context-plan]').count(),3);
    const losses={};for(const plan of ['direct','anchor','echoes']){await page.locator(`[data-context-plan="${plan}"]`).click();const forecast=await page.evaluate(()=>game.preview('heart'));losses[plan]=forecast.damage;assert.equal(await page.locator('#modal-content .forecast .damage-number').textContent(),String(forecast.damage));assert.equal((await snap()).hp,before.hp);assert.equal((await snap()).orbs,before.orbs);}
    await page.locator(`[data-context-plan="${cp.target}"]`).click();await shot('boss-preparation-scroll');await close();await shot('boss-scene-preview');const p=await page.evaluate(()=>game.preview('heart'));assert.equal(await page.locator('.context-card .forecast .damage-number').textContent(),String(p.damage));await page.locator('[data-context="engage"]').click();const after=await snap();assert.equal(after.hp,before.hp-p.damage);assert.equal(after.orbs,before.orbs-p.resourceCost.orbs);physical.bossPreparations=losses;cursor=cp.i+2;await close();continue;
   }else if(cp.type==='awakenSelf'){
    const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'照见自身 · 无骨归真',exact:true}).click();assert.equal((await snap()).selfAwakened,true);await shot('self-awakening');
   }else if(cp.type==='finish'){
    await close();const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'破劫归尘 · 为众生',exact:true}).click();assert.equal((await snap()).won,true);await shot('ending-release');
   }
   physical[cp.type]=(physical[cp.type]||0)+1;cursor=cp.i+1;await close();
  }
  await raw(run.actions.slice(cursor));const final=await snap();assert.deepEqual(pick(final),pick(run.final));assert.equal(physical.fragment,16);assert.equal(physical.treasure,6);
  check('all 18 floors, 16 relic fragments, 6 treasures, vows, water, resonance, clone and finale through real controls',{physical});
  await close();await page.keyboard.press('z');const finale=await page.evaluate(()=>TowerData.floors[17].entities.find(e=>e.type==='finale'));await cell(finale.x,finale.y);await page.locator('[data-context="finale"]').click();await page.getByRole('button',{name:'留灯守塔 · 我来守',exact:true}).click();assert.equal((await snap()).ending,'keep');await shot('ending-keep');await close();
  await page.keyboard.press('Control+s');const saved=await snap();await page.keyboard.press('l');await page.getByRole('button',{name:'读取手动存档',exact:true}).click();assert.deepEqual(await snap(),saved);
  check('both endings and exact manual save / load round trip');assert.deepEqual(errors,[]);
  report.completed=true;report.final={hp:final.hp,atk:final.atk,def:final.def,orbs:final.orbs,visited:final.visited.length,fragments:final.fragments.length,treasures:final.treasures.length};report.crossedVowGates=run.crossedVowGates;
 }catch(error){report.completed=false;report.failure={stage,message:error.message,stack:error.stack};if(page)try{await page.screenshot({path:path.join(output,'v6-failed.png')});report.failure.state=await page.evaluate(()=>window.game?.snapshot());}catch{}throw error;
 }finally{fs.writeFileSync(path.join(output,'v6-browser-acceptance.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
