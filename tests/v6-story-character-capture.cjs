const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],shots=[],output=path.resolve(__dirname,'../audits');page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/'));await page.waitForFunction(()=>TowerAssets.ready&&!document.getElementById('new-game').disabled);await page.click('#new-game');
 const shot=async name=>{await page.waitForTimeout(350);const file=path.join(output,'v6-'+name+'.png');await page.screenshot({path:file});shots.push(file);};
 const centerClear=async()=>{const r=await page.locator('#story-dock').boundingBox(),v=page.viewportSize();assert.ok(!(r.x<=v.width/2&&r.x+r.width>=v.width/2&&r.y<=v.height/2&&r.y+r.height>=v.height/2));return r;};
 await shot('story-desktop');const desktopStory=await centerClear();
 await page.setViewportSize({width:390,height:844});await shot('story-mobile');const mobileStory=await centerClear();
 const before=await page.evaluate(()=>game.snapshot());await page.keyboard.press('c');await shot('character-mobile');assert.deepEqual(await page.evaluate(()=>game.snapshot()),before);
 const drawer=await page.locator('#character-drawer').boundingBox();assert.ok(drawer.height>500&&drawer.y>=0&&drawer.y+drawer.height<=845);
 assert.equal(await page.locator('#story-dock').isVisible(),false);await page.keyboard.press('c');assert.equal(await page.locator('#story-dock').isVisible(),true);
 await page.keyboard.press('ArrowUp');await page.waitForTimeout(140);await page.keyboard.press('z');await shot('notice-mobile');assert.equal(await page.locator('#modal-root').isVisible(),false);
 const notice=await page.locator('#toast').evaluate(e=>({text:e.textContent,animation:getComputedStyle(e).animationName,hasSigil:!!e.querySelector('.notice-sigil')}));assert.equal(notice.hasSigil,true);assert.notEqual(notice.animation,'none');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(140);const a=await page.locator('#game-canvas').screenshot();await page.waitForTimeout(150);const b=await page.locator('#game-canvas').screenshot();assert.ok(a.equals(b));assert.deepEqual(errors,[]);
 const report={desktopStory,mobileStory,mobileCharacter:drawer,characterStateUnchanged:true,storyTemporarilyHiddenOnly:true,notification:notice,reducedMotionStableCanvas:true,errors,shots};fs.writeFileSync(path.join(output,'v6-story-character-capture.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
