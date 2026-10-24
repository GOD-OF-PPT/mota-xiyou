/* Late animation frames and genuine file:// operation, alongside the main UI run. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
global.window=global;require('../js/world.js');require('../js/engine.js');
const root=path.resolve(__dirname,'..'),actions=JSON.parse(fs.readFileSync(path.join(__dirname,'playthrough-v9-free-mixed-direct-offering.json'),'utf8')).actions,g=new TowerEngine(TowerData),cps={};g.newGame();
for(const a of actions){if(a.type==='useAbility'&&!cps[a.args[0]])cps[a.args[0]]={before:g.snapshot(),args:a.args};assert.ok(g[a.type](...a.args));if(Object.keys(cps).length===3)break;}
const report={startedAt:new Date().toISOString(),frames:[],errors:[],offline:{},completed:false};
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true}),ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>TowerAssets.ready&&!document.querySelector('#new-game').disabled);await page.click('#new-game');await page.keyboard.press('Enter');
  await page.keyboard.press('h');await page.selectOption('#setting-cast-frequency','always');await page.keyboard.press('Escape');
  for(const style of ['material','mural']){
   await page.click('#btn-style');await page.locator(`[data-choose-style="${style}"]`).click();await page.waitForFunction(id=>TowerAssets.style===id,style);await page.keyboard.press('Escape');
   for(const [mode,key]of [['staff','3'],['morph','4'],['clone','5']]){
    const cp=cps[mode];assert.ok(cp);assert.ok(await page.evaluate(raw=>game.load(raw),JSON.stringify(cp.before)));await page.keyboard.press('f');await page.keyboard.press(key);await page.waitForTimeout(150);const p=await page.evaluate(([mode,x,y])=>{const c=document.querySelector('#game-canvas'),b=c.getBoundingClientRect(),p=c.towerRenderer.screenPoint(x,y);return {x:b.x+p.x,y:b.y+p.y};},cp.args);await page.mouse.click(p.x,p.y);await page.waitForTimeout(950);assert.equal(await page.locator('#ability-cinematic').isVisible(),true);const name='v10-'+style+'-'+mode+'-late.png';await page.screenshot({path:path.join(root,'audits',name)});report.frames.push({style,mode,file:name,phase:'late; actual committed cast'});await page.keyboard.press('Space');
   }
  }
  const decisionChecks=[];
  for(const [file,group]of [['playthrough-v9-gold-def-anchor-offering.json','locks'],['playthrough-v9-free-mixed-direct-offering.json','sevenWounds']]){
   const record=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8')).actions,sim=new TowerEngine(TowerData);sim.newGame();let cp;
   for(const a of record){const before=sim.snapshot();assert.ok(sim[a.type](...a.args));if(a.type==='choose'&&a.args[0].choice===group){cp={before,after:sim.snapshot(),a};break;}}
   assert.ok(cp);assert.ok(await page.evaluate(raw=>game.load(raw),JSON.stringify(cp.before)));await page.keyboard.press('m');await page.keyboard.press('2');await page.waitForTimeout(150);const p=await page.evaluate(e=>{const c=document.querySelector('#game-canvas'),b=c.getBoundingClientRect(),p=c.towerRenderer.screenPoint(e.x,e.y);return {x:b.x+p.x,y:b.y+p.y};},cp.a.args[0]);await page.mouse.click(p.x,p.y);await page.locator('[data-context="choice"]').click();await page.locator('[data-choice="'+cp.a.args[1]+'"]').click();await page.locator("[data-choice-confirm]").click();const actual=await page.evaluate(()=>game.snapshot());for(const k of ['hp','atk','def','coins','keys','choices','quests','rescued'])assert.deepEqual(actual[k],cp.after[k]);await page.keyboard.press('1');const repeated=await page.evaluate(()=>game.snapshot());for(const k of ['hp','coins','keys','choices'])assert.deepEqual(repeated[k],actual[k]);const name='v10-paid-choice-'+group+'.png';await page.screenshot({path:path.join(root,'audits',name)});decisionChecks.push({group,choice:cp.a.args[1],exactResourceSettlement:true,repeatSpendsNothing:true});await page.keyboard.press('Escape');
  }
  report.decisions=decisionChecks;
  const offline=await browser.newContext({viewport:{width:1440,height:900},offline:true}),filePage=await offline.newPage();filePage.on('pageerror',e=>report.errors.push(e.message));const remote=[];filePage.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await filePage.goto(pathToFileURL(path.join(root,'index.html')).href);await filePage.waitForFunction(()=>TowerAssets.ready&&!document.querySelector('#new-game').disabled);await filePage.click('#new-game');await filePage.keyboard.press('Enter');await filePage.keyboard.press('i');assert.equal(await filePage.locator('.kit-token').count(),6);await filePage.keyboard.press('Shift+Tab');assert.equal(await filePage.evaluate(()=>!!document.activeElement.closest('#modal-panel')),true);await filePage.keyboard.press('Tab');assert.equal(await filePage.evaluate(()=>!!document.activeElement.closest('#modal-panel')),true);await filePage.screenshot({path:path.join(root,'audits','v10-offline-inventory.png')});await filePage.keyboard.press('Escape');await filePage.click('#btn-style');await filePage.locator('[data-choose-style="mural"]').click();await filePage.waitForFunction(()=>TowerAssets.style==='mural');await filePage.keyboard.press('Escape');await filePage.keyboard.press('e');assert.equal(await filePage.locator('#altar-ritual').isVisible(),true);assert.deepEqual(remote,[]);report.offline={fileURL:true,networkOffline:true,remoteRequests:remote,inventorySlots:6,muralLoaded:true,ritualVisible:true};await offline.close();
  assert.deepEqual(report.errors,[]);report.completed=true;console.log(JSON.stringify({lateFrames:report.frames.length,offline:report.offline,errors:report.errors},null,2));
 }finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(root,'audits','v10-presentation.json'),JSON.stringify(report,null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
