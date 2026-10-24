/* Browser-native crops: no resampling, sharpening or compositing of screenshots. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
global.window=global;require('../js/world');require('../js/engine');
const root=path.resolve(__dirname,'..'),g=new TowerEngine(TowerData);g.newGame();for(const d of ['left','up','left'])assert.ok(g.step(d));const state=g.snapshot();
const report={viewport:{width:1989,height:1113},legalSetup:['left','up','left'],captures:[],errors:[]};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const tag of ['before','after'])for(const dpr of [1,2]){
  const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:dpr}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  if(tag==='before')for(const file of ['js/renderer.js','js/material-assets.js'])await page.route('**/'+file+'?*',route=>route.fulfill({path:path.join(root,'.backups/assets-v18-20261023',file),contentType:'text/javascript'}));
  await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>TowerAssets.ready);await page.click('#new-game');await page.keyboard.press('Enter');await page.evaluate(s=>game.load(JSON.stringify(s)),state);await page.keyboard.press('f');await page.waitForTimeout(250);
  for(const [name,rect]of [['props',[8.45,16.55,3.5,2.65]],['monster-buddha',[5.2,10.7,5.1,4.8]]]){
   const clip=await page.evaluate(a=>{const c=document.querySelector('#game-canvas'),b=c.getBoundingClientRect(),v=c.towerRenderer.projection();const x=Math.max(0,Math.floor(b.x+v.offsetX+(a[0]-v.x)*v.cellSize)),y=Math.max(0,Math.floor(b.y+v.offsetY+(a[1]-v.y)*v.cellSize));return {x,y,width:Math.min(innerWidth-x,Math.ceil(a[2]*v.cellSize)),height:Math.min(innerHeight-y,Math.ceil(a[3]*v.cellSize))};},rect);
   const file=`audits/v18-detail-${tag}-${name}-dpr${dpr}.png`;await page.screenshot({path:path.join(root,file),clip});report.captures.push({tag,dpr,name,file,clip});
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(root,'audits/v18-detail-capture.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
