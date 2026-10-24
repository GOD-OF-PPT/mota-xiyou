/* Continuous UI play from New Game through the first seal and first bridge.
   No load, teleport, engine action calls or resource writes in the browser. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
global.window=global;require('../js/world');require('../js/engine');
const root=path.resolve(__dirname,'..'),actions=JSON.parse(fs.readFileSync(path.join(__dirname,'playthrough-v9-free-mixed-direct-offering.json'))).actions;
const fields=['floor','x','y','hp','atk','def','mana','maxMana','coins','keys','relics','fragments','externalRelics','treasures','equipped','orbs','elixirs','removed','switches','terrain','choices','quests','rescued','purchases','turn','kills','won','selfAwakened'];
const resource=s=>Object.fromEntries(fields.map(k=>[k,s[k]])),files=['js/material-assets.js','assets/material/manifest.json','js/journey.js','js/ui.js','js/renderer.js','js/presentation.js','index.html','css/experience.css'],hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
const report={startedAt:new Date().toISOString(),source:hashes(),checks:[],sessions:[],errors:[],screenshots:[],method:'Canonical legal route with all first-session actions performed by mouse and keyboard; this is not a blind human study'};
const keys={up:'ArrowUp',right:'ArrowRight',down:'ArrowDown',left:'ArrowLeft'};let page,current,stage='boot';
const snap=()=>page.evaluate(()=>game.snapshot()),check=name=>{report.checks.push(name);console.log('PASS '+name);};
async function shot(name){const f='audits/v18-first-session-'+current.style+'-'+name+'.png';await page.screenshot({path:path.join(root,f)});report.screenshots.push(f);}
async function finish(){
 if(await page.locator('#floor-entry').isVisible()){const goal=await page.locator('[data-entry-goal]').innerText();assert.ok(goal.length<=36);current.arrivals.push({floor:(await snap()).floor,goal});await page.keyboard.press('Enter');}
 if(await page.locator('#ability-cinematic').isVisible()){await page.keyboard.press('Space');current.films++;}
 if(await page.locator('#story-dock').isVisible()){current.blockingDialogues++;for(let n=0;n<10&&await page.locator('#story-dock').isVisible();n++)await page.keyboard.press('Space');}
 if(await page.locator('#altar-ritual').isVisible())await page.keyboard.press('Escape');
}
async function select(e){
 if(!await page.evaluate(()=>document.querySelector('#game-canvas').towerRenderer.overview))await page.keyboard.press('m');
 await page.keyboard.press('2');await page.waitForTimeout(70);
 const p=await page.evaluate(e=>{const c=document.querySelector('#game-canvas'),b=c.getBoundingClientRect(),a=c.towerRenderer.screenPoint(e.x,e.y);if(!a)throw Error('Target is outside the real map');return {x:b.x+a.x,y:b.y+a.y};},e);
 await page.mouse.click(p.x,p.y);await page.waitForTimeout(55);assert.deepEqual(await page.evaluate(()=>game.selection),{x:e.x,y:e.y});
}
async function step(dir){if(await page.locator('#skill-walk').getAttribute('aria-pressed')!=='true')await page.keyboard.press('1');await page.keyboard.press(keys[dir]);await page.waitForTimeout(110);current.steps++;}
async function main(){const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const [style,viewport]of [['material',{width:1440,height:900}],['mural',{width:1280,height:720}]]){
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1});page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));current={style,viewport,steps:0,actions:0,films:0,blockingDialogues:0,arrivals:[],startedAt:new Date().toISOString()};
  await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>window.TowerAssets?.ready);await page.click('#new-game');await finish();
  if(style==='mural'){await page.click('#btn-style');await page.locator('[data-choose-style=mural]').click();await page.waitForFunction(()=>TowerAssets.style==='mural');await page.keyboard.press('Escape');}
  const ref=new TowerEngine(TowerData);ref.newGame();
  stage=style+' initial goal';assert.match(await page.locator('#journey-guide>strong').innerText(),/灵晶/);assert.equal(await page.locator('#narrative-goal').isVisible(),false);const initial=resource(await snap());await page.keyboard.press('g');assert.deepEqual(resource(await snap()),initial);assert.equal(await page.evaluate(()=>document.querySelector('#game-canvas').towerRenderer.overview),true);assert.ok(await page.evaluate(()=>document.querySelector('#game-canvas').towerRenderer.journey.path.length>0));await shot('first-goal');check(style+' one visible goal and real safe route; marking spends nothing');
  const imp=TowerData.floors[0].entities.find(e=>e.enemy==='thresholdImp');await select(imp);assert.match(await page.locator('.encounter-opportunity').innerText(),/20 → 10/);assert.match(await page.locator('.encounter-purpose').innerText(),/可绕行/);assert.deepEqual(resource(await snap()),initial);const comparison=await page.locator('.encounter-opportunity').evaluate(e=>({textWidth:e.querySelector('span').getBoundingClientRect().width,buttonWidth:e.querySelector('button').getBoundingClientRect().width,height:e.getBoundingClientRect().height}));assert.ok(comparison.textWidth>=130&&comparison.buttonWidth<=96&&comparison.height<100);await shot('first-comparison');await page.locator('[data-growth-route]').click();assert.deepEqual(resource(await snap()),initial);check(style+' early comparison explains a real growth benefit and an optional battle');
  await page.keyboard.press('f');for(const d of ['left','left']){assert.ok(ref.step(d));await step(d);assert.deepEqual(resource(await snap()),resource(ref.snapshot()));}
  assert.equal(await page.locator('#story-dock').isVisible(),false);assert.match(await page.locator('[data-journey-result]').innerText(),/攻击 24 → 27/);assert.notEqual(await page.locator('#journey-guide').getAttribute('data-goal'),'0:f0-13');await shot('first-growth-result');check(style+' passing a monument stays in play; the crystal settles once and updates the goal');
  for(const d of ['right','right']){assert.ok(ref.step(d));await step(d);}
  for(let i=0;i<actions.length;i++){
   const a=actions[i];stage=style+' action '+i+' '+a.type;const before=ref.snapshot(),forecast=a.type==='fight'?ref.preview(a.args[0].enemy):null,target=a.args[0];assert.ok(ref[a.type](...a.args),'Reference action '+i+' must be legal');
   if(a.type==='step'){
    await step(target);
   }else if(a.type==='fight'){
    await select(target);assert.deepEqual(resource(await snap()),resource(before));assert.match(await page.locator('.scene-loss').innerText(),new RegExp(String(forecast.damage)));await page.locator('[data-context=engage]').click();current.actions++;await page.waitForTimeout(300);
    assert.equal(await page.locator('#modal-root').isVisible(),false);assert.match(await page.locator('[data-journey-result]').innerText(),/击败/);
   }else if(['reveal','openDoor','toggleSwitch','traverse','choose'].includes(a.type)){
    await select(target);const name={reveal:'reveal',openDoor:'door',toggleSwitch:'switch',traverse:'stairs',choose:'choice'}[a.type];await page.locator(`[data-context=${name}]`).click();
    if(a.type==='openDoor')await page.locator('[data-context=open-door]').click();
    if(a.type==='choose'){const b=resource(await snap());await page.locator(`[data-choice="${a.args[1]}"]`).click();assert.deepEqual(resource(await snap()),b);await shot('bell-decision');await page.locator('[data-choice-confirm]').click();}
    current.actions++;
   }else if(a.type==='shop'){
    await page.keyboard.press('e');await page.locator(`[data-ritual-action="${target}"]`).click();current.actions++;
   }else if(a.type==='equipTreasure'){
    await page.keyboard.press('i');await page.locator(`[data-kit-select="${target}"]`).click();await page.locator('#kit-use').click();await page.keyboard.press('Escape');current.actions++;
   }else if(a.type==='useAbility'){
    await select({x:a.args[1],y:a.args[2]});await page.locator(`[data-context=${target}]`).click();assert.equal(await page.locator('#ability-cinematic').isVisible(),true);current.actions++;await page.waitForTimeout(230);await shot('first-bridge-film');
   }else throw Error('Unmapped first-session action '+a.type);
   assert.deepEqual(resource(await snap()),resource(ref.snapshot()),stage+' transaction');
   const seal=ref.state.relics.length>before.relics.length;
   if(seal){assert.equal(await page.locator('#ability-cinematic').isVisible(),true);await page.waitForTimeout(280);await shot('first-seal-film');}
   await finish();assert.deepEqual(resource(await snap()),resource(ref.snapshot()),stage+' after presentation');
   if(ref.state.treasures.length>before.treasures.length){assert.match(await page.locator('[data-journey-result]').innerText(),/行囊/);assert.match(await page.locator('[data-journey-result]').innerText(),/佩戴才生效/);}
   if(seal){assert.equal(await page.locator('#story-dock').isVisible(),false);assert.match(await page.locator('[data-journey-result]').innerText(),/心印|石生/);await shot('seal-return');}
   if(a.type==='traverse'){await shot('floor-'+(ref.state.floor+1));console.log('UI '+style+' entered floor '+(ref.state.floor+1)+' at '+i);}
   if(a.type==='useAbility'&&target==='staff'){assert.match(await page.locator('[data-journey-result]').innerText(),/灵息/);await shot('bridge-return');break;}
  }
  assert.equal(ref.state.floor,3);assert.equal(ref.state.relics.length,1);assert.equal(current.blockingDialogues,0,'No unrequested duplicate dialogue after milestones');current.final=resource(await snap());current.finishedAt=new Date().toISOString();report.sessions.push(current);await ctx.close();check(style+' continuous first three floors, first seal and first bridge with exact resources and no intermediate load');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(hashes(),report.source);report.passed=true;
 }catch(e){report.failure={stage,stack:e.stack};try{await shot('failure');report.visible=(await page.locator('body').innerText()).slice(-6500);}catch{}throw e;}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(root,'audits/v18-first-session-first-session.json'),JSON.stringify(report,null,2));await browser.close();}}
main().catch(e=>{console.error(stage+': '+e.stack);process.exitCode=1;});
