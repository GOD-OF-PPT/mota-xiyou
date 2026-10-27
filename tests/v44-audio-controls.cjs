/* Additional controls, rapid transitions and missing-file recovery. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const report={checks:[],errors:[]};let page;
const check=s=>{report.checks.push(s);console.log('PASS '+s);};
async function boot(browser,missing=false){
  const c=await browser.newContext({viewport:{width:1280,height:720}});
  await c.addInitScript(()=>{Math.random=()=>0;Object.defineProperty(window,'TowerAudio',{configurable:true,set(Ctor){Object.defineProperty(window,'TowerAudio',{configurable:true,value:class extends Ctor{constructor(...a){super(...a);window.testAudio=this;}}});}});});
  if(missing)await c.route('**/assets/audio/bgm/title-01.mp3',r=>r.abort());
  page=await c.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://10.11.177.26:8766/index.html?audio-controls=44');
  await page.waitForFunction(()=>!document.querySelector('#new-game').disabled);return c;
}
async function playing(file){await page.waitForFunction(file=>{const a=[...document.querySelectorAll('audio[data-bgm]')];return a.length===1&&a[0].dataset.bgm===file&&!a[0].paused&&a[0].currentTime>.1&&a[0].volume>.2;},file);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
  let c=await boot(browser);await page.click('#start-music');await playing('title-01.mp3');
  await page.click('#start-music');await page.click('#start-music');await playing('title-01.mp3');
  assert.equal(await page.evaluate(()=>game.hasSave()),false);assert.equal(await page.locator('#continue-game').isDisabled(),true);
  await page.locator('#start-music').focus();await page.keyboard.press('Space');assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);
  await page.keyboard.press('Space');await playing('title-01.mp3');
  const bounds=await page.locator('#start-music').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=1280&&bounds.y+bounds.height<=720);
  await page.screenshot({path:'audits/v44-title-1280.png'});check('1280×720 title music control stays visible; mouse and Space toggles create no campaign save');
  await page.click('#new-game');await page.keyboard.press('Enter');await playing('exploration.mp3');
  for(let i=0;i<4;i++){await page.click('#game-toolbox>summary');await page.click('[data-menu=title]');await page.click('#continue-game');await page.locator('#floor-entry').waitFor({state:'visible'});await page.keyboard.press('Enter');assert.ok(await page.locator('audio[data-bgm]').count()<=2);}
  await playing('exploration.mp3');await page.evaluate(()=>{for(let i=0;i<4;i++){testAudio.pause();testAudio.resume();}});await playing('exploration.mp3');
  check('rapid title/continue transitions and interrupted play promises recover with one active track');await c.close();
  c=await boot(browser,true);await page.click('#start-music');await page.waitForFunction(()=>testAudio.musicStatus().failed);
  assert.match(await page.locator('#start-music').textContent(),/载入失败/);await page.click('#new-game');await page.keyboard.press('Enter');await playing('exploration.mp3');
  assert.equal(await page.evaluate(()=>game.state.floor),0);assert.equal(await page.evaluate(()=>game.state.hp),620);
  check('a missing title MP3 reports failure without blocking entry; valid exploration music still plays');await c.close();
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;report.media=await page?.evaluate(()=>({status:testAudio.musicStatus(),pending:testAudio.track?.pending,playId:testAudio.track?.playId,volume:testAudio.track?.player.volume,suspended:testAudio.suspended})).catch(()=>null);await page?.screenshot({path:'audits/v44-controls-failure.png'}).catch(()=>{});throw e;}
finally{fs.writeFileSync('audits/v44-audio-controls.json',JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
