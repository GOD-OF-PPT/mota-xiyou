const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:\/\//,route=>{external.push(route.request().url());return route.abort();});
 await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.waitForFunction(()=>TowerAssets?.ready&&!document.getElementById('new-game').disabled);
 assert.deepEqual(await page.evaluate(()=>TowerAssets.stats.failed),[]);assert.equal(await page.evaluate(()=>TowerStyle.current),'material');
 await page.click('#new-game');const state=await page.evaluate(()=>JSON.stringify(game.snapshot()));
 await page.evaluate(()=>TowerStyle.set('mural'));assert.deepEqual(await page.evaluate(()=>TowerAssets.stats.failed),[]);assert.equal(await page.evaluate(()=>JSON.stringify(game.snapshot())),state);
 await page.evaluate(()=>TowerStyle.set('material'));assert.equal(await page.evaluate(()=>JSON.stringify(game.snapshot())),state);
 assert.equal(await page.locator('[aria-modal="true"], [role="dialog"]').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 fs.writeFileSync('audits/v6-offline-check.json',JSON.stringify({fileProtocol:true,externalRequests:external,styles:['material','mural'],unchangedState:true,errors},null,2));console.log('Direct file loading and both local art families passed without network requests.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
