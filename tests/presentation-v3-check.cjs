/* UI behavior / layout verification. Does not claim a completed adventure. */
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/'));
  await page.click('#new-game');await page.locator('#modal-actions button').last().click();await page.waitForTimeout(250);
  await page.screenshot({path:path.join(__dirname,'presentation-v3-desktop.png')});
  await page.click('#game-toolbox summary');await page.click('#btn-relics');
  assert.equal(await page.locator('.orbit-point').count(),16);assert.equal(await page.locator('.orbit-point.lit').count(),0);
  assert.match(await page.locator('.orbit-caption').textContent(),/第十七/);await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,'presentation-v3-relics.png')});await page.keyboard.press('Escape');
  await page.keyboard.press('h');await page.selectOption('#setting-motion','reduced');await page.check('#setting-music');await page.check('#setting-sfx');
  assert.deepEqual(await page.evaluate(()=>({motion:game.state.settings.motion,music:game.state.settings.music,sfx:game.state.settings.sfx})),{motion:'reduced',music:true,sfx:true});
  assert.equal(await page.locator('body').getAttribute('data-motion'),'reduced');await page.keyboard.press('Escape');
  await page.reload();await page.click('#continue-game');await page.keyboard.press('h');assert.equal(await page.inputValue('#setting-motion'),'reduced');assert.equal(await page.isChecked('#setting-music'),true);await page.uncheck('#setting-music');assert.equal(await page.isChecked('#setting-sfx'),true);await page.uncheck('#setting-sfx');await page.selectOption('#setting-motion','standard');await page.keyboard.press('Escape');
  const illusion=await page.evaluate(()=>TowerData.floors[0].entities.find(e=>e.type==='illusion'));
  if(illusion){await page.evaluate(e=>game.select(e.x,e.y),illusion);const before=await page.evaluate(()=>({hp:game.state.hp,mana:game.state.mana}));await page.click('[data-context=reveal]');assert.equal(await page.evaluate(id=>game.state.revealed[id],illusion.id),true);assert.deepEqual(await page.evaluate(()=>({hp:game.state.hp,mana:game.state.mana})),before);}
  const dimensions=[];
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>{game.selection=null;game.emit('selection');scrollTo(0,0);});await page.waitForTimeout(150);
    const metric=await page.evaluate(()=>{const r=document.getElementById('game-canvas').getBoundingClientRect(),b=document.getElementById('btn-interact').getBoundingClientRect();return {body:document.documentElement.scrollWidth,canvasBottom:r.bottom,controlsBottom:b.bottom,width:innerWidth,height:innerHeight};});dimensions.push(metric);assert.equal(metric.body,viewport.width);assert.ok(metric.canvasBottom<=viewport.height);assert.ok(metric.controlsBottom<=viewport.height);
    await page.screenshot({path:path.join(__dirname,`presentation-v3-${viewport.width}.png`)});
    await page.click('#game-toolbox summary');await page.click('#btn-relics');await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,`presentation-v3-ring-${viewport.width}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);await page.keyboard.press('Escape');
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(120);await page.keyboard.press('h');assert.equal(await page.locator('body').getAttribute('data-motion'),'reduced');assert.equal(await page.isDisabled('#setting-shake'),true);await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'presentation-v3-results.json'),JSON.stringify({dimensions,errors,scope:'Actual opening, 16-point menu, independent persisted sound settings, free illusion interaction and OS motion preference. Finale is verified by parent adventure run.'},null,2));console.log(JSON.stringify({dimensions,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
