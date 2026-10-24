const { chromium } = require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');await page.waitForFunction(()=>window.TowerAssets?.ready);await page.click('#new-game');await page.waitForTimeout(400);
 await page.screenshot({path:'audits/v6-root-initial.png'});
 if(await page.locator('#story-collapse').isVisible())await page.click('#story-collapse');
 await page.waitForTimeout(250);await page.screenshot({path:'audits/v6-root-material.png'});
 if(await page.locator('#btn-overview').getAttribute('aria-pressed')!=='true')await page.click('#btn-overview');
 const point=await page.evaluate(()=>{const e=TowerData.floors[0].entities.find(e=>e.enemy==='thresholdImp');const r=document.getElementById('game-canvas').towerRenderer;const p=r.screenPoint(e.x,e.y),b=r.canvas.getBoundingClientRect();return {x:p.x+b.left,y:p.y+b.top};});
 await page.mouse.click(point.x,point.y);await page.waitForTimeout(300);await page.screenshot({path:'audits/v6-root-target.png'});
 await page.evaluate(()=>TowerStyle.set('mural'));await page.waitForTimeout(300);await page.screenshot({path:'audits/v6-root-mural.png'});
 await page.keyboard.press('c');await page.waitForTimeout(250);await page.screenshot({path:'audits/v6-root-character.png'});
 await page.keyboard.press('c');await page.evaluate(()=>TowerStyle.set('material'));await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'audits/v6-root-mobile.png'});
 fs.writeFileSync('audits/v6-root-review.json',JSON.stringify({errors,canvas:await page.locator('#game-canvas').boundingBox()},null,2));console.log({errors});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
