/* Real MP3 decoding, scene routing, user controls, loops and offline delivery. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const report={checks:[],tracks:{},screenshots:[],errors:[]};let page;
const check=s=>{report.checks.push(s);console.log('PASS '+s);};
async function boot(browser,url,options={}){
  const c=await browser.newContext({viewport:{width:1440,height:900},offline:!!options.offline});
  await c.addInitScript(({random,music})=>{
    if(random!==undefined)Math.random=()=>random;
    if(music!==undefined)localStorage.setItem('dasheng-relic-tower-preferences-v3',JSON.stringify({music}));
    Object.defineProperty(window,'TowerAudio',{configurable:true,set(Ctor){
      Object.defineProperty(window,'TowerAudio',{configurable:true,writable:true,value:class extends Ctor{constructor(...args){super(...args);window.testAudio=this;}}});
    }});
  },{random:options.random,music:options.music});
  page=await c.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>TowerAssets.ready&&TowerUISkins.ready&&!document.querySelector('#new-game').disabled);return c;
}
async function active(file){
  await page.waitForFunction(file=>{const all=[...document.querySelectorAll('audio[data-bgm]')];return all.length===1&&all[0].dataset.bgm===file&&!all[0].paused&&all[0].readyState>=2&&all[0].volume>.2;},file);
  const before=await page.locator('audio[data-bgm]').evaluate(a=>({time:a.currentTime,duration:a.duration,loop:a.loop,volume:a.volume,error:a.error?.code||null}));
  await page.waitForFunction(t=>document.querySelector('audio[data-bgm]')?.currentTime>t+.12,before.time);
  assert.equal(before.error,null);report.tracks[file]=before;return before;
}
async function loop(file){
  await page.locator('audio[data-bgm]').evaluate(a=>{a.dataset.looped='false';let last=a.currentTime;a.playbackRate=16;a.addEventListener('timeupdate',()=>{if(last>a.currentTime+5)a.dataset.looped='true';last=a.currentTime;});});
  await page.waitForFunction(()=>document.querySelector('audio[data-bgm]').dataset.looped==='true');
  await page.locator('audio[data-bgm]').evaluate(a=>{a.playbackRate=1;});await active(file);
}
async function start(){await page.click('#new-game');await page.locator('#floor-entry').waitFor({state:'visible'});await page.keyboard.press('Enter');await active('exploration.mp3');}
async function settings(){await page.keyboard.press('Escape');await page.click('#game-toolbox>summary');await page.click('[data-menu=settings]');}
async function importCheckpoint(file){
  await page.keyboard.press('Escape');await page.keyboard.press('i');await page.locator('#import-save').setInputFiles(path.resolve(file));
  if(JSON.parse(fs.readFileSync(file)).state.won)await page.locator('#modal-root[data-view=ending]').waitFor({state:'visible'});
  else{await page.locator('#floor-entry').waitFor({state:'visible'});await page.keyboard.press('Enter');}
}
async function screenshot(file){await page.screenshot({path:file});report.screenshots.push(file);}
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=document-user-activation-required']});
  try{
    let c=await boot(browser,'http://10.11.177.26:8766/index.html?audio=44');
    assert.equal(await page.locator('audio[data-bgm]').count(),0);assert.match(await page.locator('#start-music').textContent(),/点此奏乐/);
    await page.click('#start-music');let first=await page.locator('audio[data-bgm]').last().getAttribute('data-bgm');
    assert.match(first,/^title-0[12]\.mp3$/);await active(first);
    await screenshot('audits/v44-title-music.png');
    const second=first==='title-01.mp3'?'title-02.mp3':'title-01.mp3';
    await page.locator('audio[data-bgm]').evaluate(a=>{a.playbackRate=16;});await active(second);
    check('real user gesture unlocks title MP3; natural ended event advances to the other title track');
    await start();assert.equal(await page.evaluate(()=>testAudio.context),null,'MP3 music alone never starts synthesized score or SFX');
    const player=await page.locator('audio[data-bgm]').evaluate(a=>{a.dataset.identity='kept';return a.currentTime;});
    await page.keyboard.press('i');await page.keyboard.press('Escape');await page.keyboard.press('Space');
    assert.equal(await page.locator('audio[data-bgm]').getAttribute('data-identity'),'kept');
    assert.ok(await page.locator('audio[data-bgm]').evaluate(a=>a.currentTime)>=player);
    check('exploration plays and survives inventory, return and skip without restarting or layering synthesized BGM');
    await settings();await page.locator('#setting-music').uncheck();
    assert.equal(await page.locator('audio[data-bgm]').evaluate(a=>a.paused),true);
    await page.locator('#setting-sfx').check();
    await page.evaluate(()=>testAudio.cue('pickup'));assert.equal(await page.evaluate(()=>testAudio.context.state),'running');
    assert.ok(await page.evaluate(()=>testAudio.nodes.size)>0);assert.equal(await page.locator('audio[data-bgm]').evaluate(a=>a.paused),true);
    await page.locator('#setting-music').check();await active('exploration.mp3');
    await page.locator('#setting-sfx').uncheck();assert.equal(await page.evaluate(()=>testAudio.nodes.size),0);
    await page.keyboard.press('Escape');check('music and synthesized SFX switches operate independently');
    await loop('exploration.mp3');
    check('exploration MP3 loops at its actual end');
    const pauseTime=await page.locator('audio[data-bgm]').evaluate(a=>a.currentTime);
    await page.evaluate(()=>testAudio.pause());assert.equal(await page.locator('audio[data-bgm]').evaluate(a=>a.paused),true);
    await page.evaluate(()=>testAudio.resume());await active('exploration.mp3');
    assert.ok(await page.locator('audio[data-bgm]').evaluate(a=>a.currentTime)>=pauseTime);
    check('audio pause/resume lifecycle retains the track position');
    await importCheckpoint('audits/v30-fixtures/before-ending.json');await active('exploration.mp3');
    const before=await page.evaluate(()=>game.snapshot());await page.keyboard.press('f');
    await page.locator('#modal-root[data-view=ending-choice]').waitFor({state:'visible'});await active('exploration.mp3');
    await page.locator('#modal-actions button').filter({hasText:'破劫归尘'}).click();
    await page.locator('#modal-root[data-view=ending]').waitFor({state:'visible'});await active('victory.mp3');
    const after=await page.evaluate(()=>game.snapshot());assert.equal(after.turn,before.turn+1);assert.equal(after.hp,before.hp);assert.equal(after.won,true);
    await loop('victory.mp3');
    await page.locator('.victory-recall>summary').click();await active('victory.mp3');
    await screenshot('audits/v44-victory-music.png');await page.keyboard.press('Escape');await active('exploration.mp3');
    await page.keyboard.press('f');await active('victory.mp3');
    await page.locator('#modal-actions .primary-button').click();await page.locator('#start-screen').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelectorAll('audio[data-bgm]').length===1&&document.querySelector('audio[data-bgm]').dataset.musicScene==='title');
    await active(await page.locator('audio[data-bgm]').getAttribute('data-bgm'));
    check('legal ending confirmation routes to victory music; loop, expanded history, map return, reopen and title return select the correct track');
    await page.click('#start-music');assert.equal(await page.locator('audio[data-bgm]').evaluate(a=>a.paused),true);
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#new-game').disabled);
    assert.match(await page.locator('#start-music').textContent(),/开启音乐/);await page.click('#start-music');
    await page.waitForFunction(()=>document.querySelector('audio[data-bgm]')&&!document.querySelector('audio[data-bgm]').paused);
    check('explicit music-off preference survives reload and can be enabled from the title');await c.close();
    for(const random of [0,.999]){
      c=await boot(browser,'http://127.0.0.1:8765/index.html?audio=random44',{random});
      await page.locator('#start-music').focus();await page.keyboard.press('Enter');await active(random===0?'title-01.mp3':'title-02.mp3');
      check('title random selection maps '+random+' to a different track; keyboard unlock works');await c.close();
    }
    for(const [label,url,offline] of [
      ['offline',pathToFileURL(path.resolve('index.html')).href,true],
      ['study','http://127.0.0.1:8765/playtest-v23-new.html?participant=Audio44&round=1&task=first-three&objective=explore&art=material',false]
    ]){
      c=await boot(browser,url,{offline});await page.click('#start-music');await start();
      await importCheckpoint('audits/v30-fixtures/keep.json');await active('victory.mp3');
      check(label+' decodes and plays local MP3s through title, exploration and the other ending');await c.close();
    }
    assert.deepEqual(report.errors,[]);report.passed=true;
  }catch(e){report.failure=e.stack;report.media=await page?.evaluate(()=>({status:window.testAudio?.musicStatus(),players:[...document.querySelectorAll('audio')].map(a=>({file:a.dataset.bgm,time:a.currentTime,paused:a.paused,volume:a.volume,ready:a.readyState,error:a.error?.code}))})).catch(()=>null);await page?.screenshot({path:'audits/v44-audio-failure.png'}).catch(()=>{});throw e;}
  finally{fs.writeFileSync('audits/v44-audio.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
