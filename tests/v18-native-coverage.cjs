/* Legal campaign checkpoints; measure actual runtime bounds at PC DPR 1/2. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
global.window=global;require('../js/world');require('../js/engine');
const root=path.resolve(__dirname,'..'),g=new TowerEngine(TowerData),checkpoints=[];g.newGame();g.step('left');g.step('up');checkpoints.push(g.snapshot());g.newGame();
const actions=JSON.parse(fs.readFileSync(path.join(__dirname,'playthrough-v9-free-mixed-direct-offering.json'))).actions;
for(const a of actions){const floor=g.state.floor;assert.ok(g[a.type](...a.args),'Legal action '+a.type);if(g.state.floor>floor&&!checkpoints.some(s=>s.floor===g.state.floor))checkpoints.push(g.snapshot());}assert.ok(g.state.won);assert.equal(checkpoints.length,18);
const report={method:'Snapshots obtained exclusively by legal canonical engine actions; checkpoint loads do not establish continuous UI play',campaignActions:actions.length,viewports:[],samples:[],errors:[]};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const dpr of [1,2]){
  const ctx=await browser.newContext({viewport:{width:1989,height:1113},deviceScaleFactor:dpr}),page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>TowerAssets.ready);await page.click('#new-game');await page.keyboard.press('Enter');
  for(const state of checkpoints){
   await page.evaluate(s=>game.load(JSON.stringify(s)),state);await page.keyboard.press('Escape');await page.keyboard.press('Enter');await page.keyboard.press('f');await page.waitForTimeout(110);
   const samples=await page.evaluate(()=>{const r=document.querySelector('#game-canvas').towerRenderer,v=r.projection(),factor=v.cellSize/16*r.pixelRatio;
    const actors=[...r.actorAnchors.values()].filter(a=>TowerAssets.get(a.id)?.registrationVersion===18).map(a=>{const m=TowerAssets.get(a.id),b=m.contentBounds;return {id:a.id,kind:'sprite',native:m.nativeContentSize,display:[a.width*factor,a.height*factor],visible:r.anchorFor(Math.floor(a.footX/16),Math.floor(a.footY/16)).visible};});
    return actors;});
   for(const s of samples){s.ratio=Math.min(s.native[0]/s.display[0],s.native[1]/s.display[1]);report.samples.push({floor:state.floor+1,dpr,...s});}
   const before=await page.evaluate(()=>game.snapshot());
   await page.evaluate(()=>{const r=document.querySelector('#game-canvas').towerRenderer,m=r.visibleLandmarks[0];r.focusCell(m.x+(m.w||4)/2,m.y+(m.h||5)/2);});await page.waitForTimeout(160);
   assert.deepEqual(await page.evaluate(()=>game.snapshot()),before,'Camera inspection must never move the player or spend resources');
   const buildings=await page.evaluate(()=>{const r=document.querySelector('#game-canvas').towerRenderer,v=r.projection(),factor=v.cellSize/16*r.pixelRatio;return r.landmarkAudit.map(a=>({id:a.id,kind:'landmark',native:a.source,display:a.worldSize.map(n=>n*factor),visible:a.footprint[0]+a.footprint[2]>v.x*16&&a.footprint[0]<(v.x+v.w)*16&&a.footprint[1]+a.footprint[3]>v.y*16&&a.footprint[1]<(v.y+v.h)*16}));});
   assert.ok(buildings.some(a=>a.visible),'Focused landmark must be in the actual viewport');
   for(const s of buildings){s.ratio=Math.min(s.native[0]/s.display[0],s.native[1]/s.display[1]);report.samples.push({floor:state.floor+1,dpr,...s});}
   if(dpr===1&&[0,3,6,9,12,15,17].includes(state.floor)){await page.screenshot({path:path.join(root,`audits/v18-chapter-floor-${state.floor+1}.png`)});}
  }
  report.viewports.push({dpr,width:1989,height:1113});await ctx.close();
 }
 const bad=report.samples.filter(s=>s.visible&&s.ratio<.999);
 if(bad.length)console.log(JSON.stringify(bad,null,2));assert.deepEqual(bad,[],'Native source coverage below actual displayed pixels');assert.deepEqual(report.errors,[]);report.passed=true;
 console.log('PASS '+report.samples.length+' sprite/landmark draw measurements over all 18 legally reached floors');
 }finally{fs.writeFileSync(path.join(root,'audits/v18-native-coverage.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
