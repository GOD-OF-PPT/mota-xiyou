/* Read-only product audit: no production edits or player-profile storage. */
const { chromium }=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/'));
  await page.click('#new-game');await page.locator('#modal-actions button').first().click();await page.waitForTimeout(350);
  const observations={browserErrors:errors};
  const metrics=()=>page.evaluate(()=>{
   const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height),width:Math.round(r.width)};};
   return {viewport:{width:innerWidth,height:innerHeight},bodyWidth:document.documentElement.scrollWidth,canvas:rect('game-canvas'),abilityBar:rect('skill-walk'),context:rect('context-body'),dpad:rect('btn-interact'),typeSizes:{abilityHint:getComputedStyle(document.querySelector('.ability small')).fontSize,context:getComputedStyle(document.querySelector('#context-body p')).fontSize,overline:getComputedStyle(document.querySelector('.floor-overline')).fontSize},smallButtons:[...document.querySelectorAll('.header-tools button')].map(e=>({id:e.id,w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)}))};
  });
  observations.laptop=await metrics();await page.screenshot({path:path.join(__dirname,'laptop-1366x768.png')});
  async function close(){for(let i=0;i<20&&await page.locator('#modal-root').isVisible();i++){await page.locator('#modal-close').click();}}
  // Use keyboard moves to reach an ordinary cleared floor, then tap the player.
  await page.keyboard.press('ArrowLeft');await page.waitForTimeout(125); // pick attack crystal
  const before=await page.evaluate(()=>({x:game.state.x,y:game.state.y,facing:game.state.facing}));
  const box=await page.locator('#game-canvas').boundingBox();
  await page.waitForTimeout(130);await page.mouse.click(box.x+(before.x+.5)*box.width/13,box.y+(before.y+.5)*box.height/13);
  observations.tapPlayer={before,after:await page.evaluate(()=>({x:game.state.x,y:game.state.y,facing:game.state.facing})),modal:await page.locator('#modal-title').textContent()};
  await close();
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
  observations.mobile=await metrics();
  const enemy=await page.evaluate(()=>TowerData.floors[0].entities.find(e=>e.type==='enemy'));
  await page.keyboard.press('2');const mobox=await page.locator('#game-canvas').boundingBox();
  await page.mouse.click(mobox.x+(enemy.x+.5)*mobox.width/13,mobox.y+(enemy.y+.5)*mobox.height/13);await page.waitForTimeout(150);
  observations.mobile.inspect={title:await page.locator('#context-title').textContent(),forecastTop:await page.locator('.forecast').evaluate(e=>Math.round(e.getBoundingClientRect().top)),viewportHeight:844};
  await page.screenshot({path:path.join(__dirname,'mobile-selected-enemy.png')});
  await page.screenshot({path:path.join(__dirname,'mobile-full.png'),fullPage:true});
  // Re-enter a clean game, then set up an awakened skill via actual saved public actions.
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));
  await page.click('#btn-restart');await page.getByRole('button',{name:'开启新冒险',exact:true}).click();await close();
  const record=JSON.parse(fs.readFileSync(path.join(__dirname,'../tests/playthrough-atk.json'),'utf8')).actions;
  const firstCast=record.findIndex(a=>a.type==='useAbility'&&a.args[0]==='staff');
  await page.evaluate(actions=>{for(const a of actions){if(!game[a.type](...a.args))throw new Error('setup failed '+a.type);for(let i=0;i<20&&!document.getElementById('modal-root').classList.contains('hidden');i++)document.getElementById('modal-close').click();}},record.slice(0,firstCast));
  await page.waitForTimeout(1600);await page.click('#skill-staff');
  const [mode,x,y]=record[firstCast].args,b=await page.locator('#game-canvas').boundingBox();
  await page.mouse.click(b.x+(x+.5)*b.width/13,b.y+(y+.5)*b.height/13);await page.waitForTimeout(200);
  const beforeFloorClick=await page.evaluate(()=>({x:game.state.x,y:game.state.y,mode:game.mode}));
  const floor=await page.evaluate(()=>Object.values(TowerRules.directions).map(([dx,dy])=>({x:game.state.x+dx,y:game.state.y+dy})).find(p=>game.getTile(p.x,p.y)==='.'&&!game.getEntity(p.x,p.y)));
  if(floor)await page.mouse.click(b.x+(floor.x+.5)*b.width/13,b.y+(floor.y+.5)*b.height/13);
  observations.stickySkill={floor:await page.evaluate(()=>game.state.floor+1),beforeFloorClick,afterFloorClick:await page.evaluate(()=>({x:game.state.x,y:game.state.y,mode:game.mode})),message:await page.locator('#status-message').textContent()};
  await page.waitForTimeout(350);await page.screenshot({path:path.join(__dirname,'staff-mode-after-cast.png'),fullPage:true});
  fs.writeFileSync(path.join(__dirname,'interaction-observations.json'),JSON.stringify(observations,null,2));
  console.log(JSON.stringify(observations,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
