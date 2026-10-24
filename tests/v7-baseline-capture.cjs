/* Read-only v6 counterexample capture before v7 implementation. The only game
   state comes from a complete legal public-action trace and formal game.load. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
global.window=global;require('../js/world.js');require('../js/engine.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audits'),trace=require('./playthrough-v5-free-mixed-direct-bypasses.json'),sim=new TowerEngine(TowerData);sim.newGame();let legal;
for(const a of trace.actions){if(a.type==='fight'&&a.args[0].id==='f0-wing-guard-0'){legal=sim.snapshot();break;}assert.ok(sim[a.type](...a.args));}assert.ok(legal);
const sourceIdentity=Object.fromEntries(['js/renderer.js','js/ui.js','js/art-style.js','css/immersive.css','assets/material/manifest.json'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const pixels=JSON.parse(execFileSync('C:/ProgramData/anaconda3/python.exe',['-c',"import json\nfrom PIL import Image\nr={}\nfor style in ['material','mural']:\n m=json.load(open('assets/'+style+'/manifest.json',encoding='utf-8'))['assets']; r[style]={}\n for id in ['actor_wukong_up','actor_wukong_down','actor_wukong_left','actor_wukong_right','enemy_imp']:\n  e=m[id]; im=Image.open(e['src']).convert('RGBA').crop((e.get('sx',0),e.get('sy',0),e.get('sx',0)+e['sourceW'],e.get('sy',0)+e['sourceH'])); a=im.getchannel('A'); r[style][id]={'sourceW':im.width,'sourceH':im.height,'opaqueBounds':a.getbbox(),'nonzeroAlphaPixels':sum(1 for p in a.getdata() if p>0),'solidPixels':sum(1 for p in a.getdata() if p>=240)}\nprint(json.dumps(r))"],{cwd:root,encoding:'utf8'}));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const cases=[],errors=[];
 for(const dpr of [1,2]){
  const context=await browser.newContext({viewport:{width:2525,height:1208},deviceScaleFactor:dpr}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.join(root,'index.html').replaceAll('\\','/'));await page.waitForFunction(()=>TowerAssets.ready&&!document.querySelector('#new-game').disabled);await page.click('#new-game');assert.equal(await page.evaluate(s=>game.load(JSON.stringify(s)),legal),true);
  const target=await page.evaluate(()=>TowerData.floors[0].entities.find(e=>e.id==='f0-wing-guard-0'));
  await page.keyboard.press('2');
  for(const style of ['material','mural']){
   await page.evaluate(style=>TowerStyle.set(style),style);await page.waitForTimeout(160);
   for(const mode of ['overview','near']){
    await page.evaluate(mode=>{const r=document.querySelector('#game-canvas').towerRenderer;r.setOverview(mode==='overview');r.focusPlayer();},mode);
    // Selecting the logical cell is a public, non-mutating game action; native
    // mouse selection and projected hit validation belong to final acceptance.
    await page.evaluate(t=>game.select(t.x,t.y),target);await page.waitForTimeout(400);
    const measured=await page.evaluate(({target,pixels})=>{
     const canvas=document.querySelector('#game-canvas'),r=canvas.towerRenderer,v=r.getViewport(),b=canvas.getBoundingClientRect(),s=game.state;
     const bounds=selector=>{const e=document.querySelector(selector),q=e.getBoundingClientRect();return {x:q.x,y:q.y,width:q.width,height:q.height,centerX:q.x+q.width/2,centerY:q.y+q.height/2};};
     const map={x:b.x+v.offsetX,y:b.y+v.offsetY,width:v.w*v.cellSize,height:v.h*v.cellSize};map.right=map.x+map.width;map.bottom=map.y+map.height;
     const mapCoverage=Math.max(0,Math.min(innerWidth,map.right)-Math.max(0,map.x))*Math.max(0,Math.min(innerHeight,map.bottom)-Math.max(0,map.y))/(innerWidth*innerHeight);
     const entity=(e,id)=>{const m=TowerAssets.get(id),a=m.anchor,alpha=pixels[id],p=alpha.opaqueBounds,k=r.spriteScale(id),cssPerSourcePixel=v.cellSize/(16*3)*k,foot={x:b.x+v.offsetX+(e.x-v.x+.5)*v.cellSize,y:b.y+v.offsetY+(e.y-v.y+1)*v.cellSize};return {id,position:{x:e.x,y:e.y},sourceFrame:{width:m.sourceW,height:m.sourceH},alpha,scale:k,cssPerSourcePixel,physicalPixelsPerSourcePixel:cssPerSourcePixel*devicePixelRatio,foot,opaqueScreenBounds:{x:foot.x+(p[0]-a.x)*cssPerSourcePixel,y:foot.y+(p[1]-a.y)*cssPerSourcePixel,width:(p[2]-p[0])*cssPerSourcePixel,height:(p[3]-p[1])*cssPerSourcePixel},bufferRasterPerSourcePixel:k,finalBufferPhysicalScale:v.cellSize/(16*3)*devicePixelRatio};};
     const actor=entity({x:s.x,y:s.y},'actor_wukong_'+s.facing),enemy=entity(target,'enemy_'+target.enemy),tip=bounds('.context-card'),skill=bounds('.ability-bar');
     const px=enemy.foot.x,py=enemy.foot.y,nearestX=Math.max(tip.x,Math.min(px,tip.x+tip.width)),nearestY=Math.max(tip.y,Math.min(py,tip.y+tip.height));
     return {devicePixelRatio,viewport:{width:innerWidth,height:innerHeight},canvas:{css:bounds('#game-canvas'),backing:{width:canvas.width,height:canvas.height}},camera:v,map,actualMapCoverage:mapCoverage,nonMapFraction:1-mapCoverage,buffer:{width:r.buffer.width,height:r.buffer.height},smoothing:{material:r.material,screen:r.ctx.imageSmoothingEnabled,buffer:r.p.imageSmoothingEnabled,css:canvas.style.imageRendering},actor,enemy,context:tip,contextDistanceToEnemyFoot:Math.hypot(px-nearestX,py-nearestY),contextDistanceInCells:Math.hypot(px-nearestX,py-nearestY)/v.cellSize,skills:skill,skillsCenterDeviation:skill.centerX-innerWidth/2};
    },{target,pixels:pixels[style]});
    const screenshot=path.join(out,`v7-baseline-${style}-${mode}-dpr${dpr}.png`);await page.screenshot({path:screenshot});cases.push({style,mode,dpr,...measured,screenshot});
   }
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);const result={userReference:'C:/Users/KSG/AppData/Local/Temp/codex-clipboard-ddc94e33-d555-4c61-8da1-555074e539ff.png',capturedAt:new Date().toISOString(),sourceIdentity,legalCheckpoint:{floor:legal.floor,x:legal.x,y:legal.y,hp:legal.hp,turn:legal.turn,facing:legal.facing},cases,errors};fs.writeFileSync(path.join(out,'v7-baseline-measurements.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(cases.map(c=>({style:c.style,mode:c.mode,dpr:c.dpr,coverage:c.actualMapCoverage,sideGap:c.map.x,actorPhysicalRatio:c.actor.physicalPixelsPerSourcePixel,enemyPhysicalRatio:c.enemy.physicalPixelsPerSourcePixel,contextDistanceCells:c.contextDistanceInCells,skillCenterOffset:c.skillsCenterDeviation})),null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
