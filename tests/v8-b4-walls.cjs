/* B4 fixed-PC scene evidence. All checkpoints are legal public-action saves. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {prepare}=require('./v6-replay-fixtures.cjs'),fixtures=prepare(),stage=process.argv[2]||'after',out=path.resolve(__dirname,'../audits');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:2525,height:1208},deviceScaleFactor:1}),page=await context.newPage(),errors=[],report={stage,errors,cases:[]};page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>TowerAssets.ready&&!document.querySelector('#new-game').disabled);await page.click('#new-game');await page.evaluate(()=>TowerStyle.set('material'));
 const initial=await page.evaluate(()=>game.snapshot());
 for(const [floor,label]of [[0,'buddha'],[3,'pagoda'],[9,'furnace']]){
  const saved=floor===0?initial:fixtures.floors[floor];assert.equal(await page.evaluate(s=>game.load(JSON.stringify(s)),saved),true);await page.evaluate(()=>{const r=document.querySelector('#game-canvas').towerRenderer;r.setOverview(true);r.focusPlayer();game.setMode('inspect');});await page.waitForTimeout(350);
  const data=await page.evaluate(()=>{const c=document.querySelector('#game-canvas'),r=c.towerRenderer,v=r.projection(),b=c.getBoundingClientRect(),f=TowerData.floors[game.state.floor];return {floor:game.state.floor,projection:v,canvas:{x:b.x,y:b.y},state:game.snapshot(),landmarks:f.landmarks,wallCommands:r.wallCommands||[],depthQueue:r.depthQueueAudit||[],entities:f.entities.filter(e=>!game.state.removed[e.id]).map(e=>({entity:e,anchor:r.anchorFor(e.x,e.y)})),boundary:r.boundaryRows};});
  const base=`v8-b4-${stage}-${label}`;await page.screenshot({path:path.join(out,base+'-whole.png')});
  const region=floor===0?{x:1,y:0,w:19,h:10}:{x:data.landmarks[0].x-.5,y:data.landmarks[0].y-.5,w:data.landmarks[0].w+1,h:data.landmarks[0].h+1};
  const v=data.projection,cs=v.cellSize,clip={x:Math.max(0,Math.floor(data.canvas.x+v.offsetX+(region.x-v.x)*cs)),y:Math.max(0,Math.floor(data.canvas.y+v.offsetY+(region.y-v.y)*cs)),width:Math.ceil(region.w*cs),height:Math.ceil(region.h*cs)};await page.screenshot({path:path.join(out,base+'-region.png'),clip});
  if(stage==='after'){
   assert.ok(data.wallCommands.length>0);for(const wall of data.wallCommands){assert.equal(await page.evaluate(p=>game.getTile(p.x,p.y),wall),'#');for(const mark of data.landmarks)assert.ok(!(wall.x>=mark.x&&wall.x<mark.x+mark.w&&wall.y>=mark.y&&wall.y<mark.y+mark.h),'Foreground wall intersects landmark');assert.equal(wall.bounds.x,wall.x*16);assert.equal(wall.bounds.y,wall.y*16);assert.equal(wall.bounds.w,16);assert.equal(wall.bounds.h,16);}
   for(let i=1;i<data.depthQueue.length;i++)assert.ok(data.depthQueue[i].depth>=data.depthQueue[i-1].depth,'Wall/entity depth order must be monotonic');assert.deepEqual(await page.evaluate(()=>game.snapshot()),saved);
  }
  report.cases.push(data);
 }
 report.rendererSha=crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../js/renderer.js'))).digest('hex');assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,`v8-b4-${stage}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({stage,cases:report.cases.map(c=>({floor:c.floor+1,walls:c.wallCommands.length,commands:c.depthQueue.length})),errors},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
