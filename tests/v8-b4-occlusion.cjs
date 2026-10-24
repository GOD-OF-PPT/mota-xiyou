/* Actual mouse hits at opaque source pixels on opposite sides of wall depth.
   Checkpoints are legal saves; sprites/positions/resources are never injected. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),{prepare}=require('./v6-replay-fixtures.cjs'),fixtures=prepare(),out=path.resolve(__dirname,'../audits');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:2525,height:1208},deviceScaleFactor:1}),page=await context.newPage(),report={checks:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>TowerAssets.ready&&!document.querySelector('#new-game').disabled);await page.click('#new-game');await page.evaluate(()=>TowerStyle.set('material'));const initial=await page.evaluate(()=>game.snapshot());
 let hidden=null,visible=null;
 for(let floor=0;floor<18&&(!hidden||!visible);floor++){
  const save=floor===0?initial:fixtures.floors[floor];assert.equal(await page.evaluate(s=>game.load(JSON.stringify(s)),save),true);await page.evaluate(()=>{const r=document.querySelector('#game-canvas').towerRenderer;r.setOverview(true);r.focusPlayer();game.setMode('inspect');});await page.waitForTimeout(80);
  const candidates=await page.evaluate(()=>{
   const c=document.querySelector('#game-canvas'),r=c.towerRenderer,v=r.projection(),cb=c.getBoundingClientRect(),found={hidden:null,visible:null};
   for(const [key,a]of r.actorAnchors){const meta=TowerAssets.get(a.id);if(!meta?.anchor||!meta.image||!a.scale)continue;const cut=meta.frameBounds?.[0]||meta.contentBounds,k=a.scale/3,im=document.createElement('canvas');im.width=meta.sourceW;im.height=meta.sourceH;const g=im.getContext('2d');g.drawImage(meta.image,meta.sx||0,meta.sy||0,meta.sourceW,meta.sourceH,0,0,meta.sourceW,meta.sourceH);const pixels=g.getImageData(0,0,im.width,im.height).data;
    for(let sy=cut[1]+2;sy<cut[3]-2;sy+=2)for(let sx=cut[0]+2;sx<cut[2]-2;sx+=2){const alpha=pixels[(sy*im.width+sx)*4+3];if(alpha<245)continue;const wx=a.left+(sx-cut[0]+.5)*k,wy=a.top+(sy-cut[1]+.5)*k,gx=Math.floor(wx/16),gy=Math.floor(wy/16);if(game.getTile(gx,gy)!=='#')continue;const x=cb.x+v.offsetX+(wx-v.x*16)*v.cellSize/16,y=cb.y+v.offsetY+(wy-v.y*16)*v.cellSize/16;if(document.elementFromPoint(x,y)!==c)continue;const occluded=r.wallOccludes(wx,wy,a.depth),pick=r.pickCell(x,y),entity={x:Number(key.split(':')[1]),y:Number(key.split(':')[2])};
     const margin=Math.min(wx-gx*16,(gx+1)*16-wx,wy-gy*16,(gy+1)*16-wy);
     if(occluded&&margin>.7&&(!found.hidden||margin>found.hidden.margin)&&pick.x===gx&&pick.y===gy)found.hidden={floor:game.state.floor,asset:a.id,entity,source:{x:sx,y:sy,alpha},world:{x:wx,y:wy},screen:{x,y},wall:{x:gx,y:gy,depth:(gy+1)*16},actorDepth:a.depth,pick,margin};
     const score=(sx-meta.sourceW/2)**2+(sy-(cut[1]+(cut[3]-cut[1])*.45))**2;
     if(!occluded&&a.id==='enemy_bat'&&pick.x===entity.x&&pick.y===entity.y&&(!found.visible||score<found.visible.score))found.visible={floor:game.state.floor,asset:a.id,entity,source:{x:sx,y:sy,alpha},world:{x:wx,y:wy},screen:{x,y},wall:{x:gx,y:gy,depth:(gy+1)*16},actorDepth:a.depth,pick,score};
    }
   }return found;
  });if(candidates.hidden&&!hidden)hidden={...candidates.hidden,save};if(candidates.visible&&!visible)visible={...candidates.visible,save};
 }
 assert.ok(hidden,'Need a real opaque source pixel behind a foreground wall');assert.ok(visible,'Need visible bat head/wing alpha in front of its north wall');
 for(const [name,candidate]of [['hidden',hidden],['visible',visible]]){
  assert.equal(await page.evaluate(s=>game.load(JSON.stringify(s)),candidate.save),true);await page.evaluate(()=>{const r=document.querySelector('#game-canvas').towerRenderer;r.setOverview(true);r.focusPlayer();game.setMode('inspect');});await page.waitForTimeout(120);const before=await page.evaluate(()=>game.snapshot());
  candidate.screen=await page.evaluate(p=>{const c=document.querySelector('#game-canvas'),r=c.towerRenderer,v=r.projection(),cb=c.getBoundingClientRect(),a=r.actorAnchors.get(`${p.floor}:${p.entity.x}:${p.entity.y}`),m=TowerAssets.get(a.id),cut=m.frameBounds?.[0]||m.contentBounds,k=a.scale/3,wx=a.left+(p.source.x-cut[0]+.5)*k,wy=a.top+(p.source.y-cut[1]+.5)*k;return {x:cb.x+v.offsetX+(wx-v.x*16)*v.cellSize/16,y:cb.y+v.offsetY+(wy-v.y*16)*v.cellSize/16};},candidate);
  await page.mouse.click(candidate.screen.x,candidate.screen.y);await page.waitForTimeout(80);const selection=await page.evaluate(()=>game.selection);assert.deepEqual(selection,name==='hidden'?{x:candidate.wall.x,y:candidate.wall.y}:candidate.entity);assert.deepEqual(await page.evaluate(()=>game.snapshot()),before);const {save,...details}=candidate;report.checks.push({name:name==='hidden'?'Foreground wall rejects a real opaque source pixel behind it':'Visible bat alpha remains selectable over its north wall',...details,selection});await page.screenshot({path:path.join(out,`v8-b4-occlusion-${name}.png`)});
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'v8-b4-occlusion.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
