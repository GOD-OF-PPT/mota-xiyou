const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'audits');
const opaque=JSON.parse(execFileSync('C:/ProgramData/anaconda3/python.exe',['-c',
 "import json\nfrom PIL import Image\nr={}\nfor style in ['material','mural']:\n m=json.load(open('assets/'+style+'/manifest.json',encoding='utf-8'))['assets']['enemy_bat']\n im=Image.open(m['src']).convert('RGBA'); sx=m.get('sx',0); sy=m.get('sy',0); pts=[]\n for y in range(m['sourceH']):\n  for x in range(m['sourceW']):\n   a=im.getpixel((sx+x,sy+y))[3]\n   if a>=240: pts.append({'x':x,'y':y,'alpha':a})\n pts.sort(key=lambda p:abs(p['x']-m['anchor']['x'])+abs(p['y']-40)*0.2)\n r[style]=pts\nprint(json.dumps(r))"
],{cwd:root,encoding:'utf8'}));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.join(root,'index.html').replaceAll('\\','/'));await page.waitForFunction(()=>TowerAssets.ready&&!document.querySelector('#new-game').disabled);await page.click('#new-game');await page.keyboard.press('2');
 if(await page.locator('#btn-overview').getAttribute('aria-pressed')!=='true')await page.keyboard.press('m');await page.waitForTimeout(250);
 for(const style of ['material','mural']){
  await page.evaluate(style=>TowerStyle.set(style),style);await page.waitForTimeout(240);
  if(await page.locator('#context-dismiss').isVisible())await page.locator('#context-dismiss').click();
  if(!await page.evaluate(()=>document.querySelector('#game-canvas').towerRenderer.getViewport().overview))await page.keyboard.press('m');await page.waitForTimeout(150);
  const before=await page.evaluate(()=>game.snapshot());
  const target=await page.evaluate(points=>{
   const c=document.querySelector('#game-canvas'),r=c.towerRenderer,b=c.getBoundingClientRect(),v=r.getViewport(),e=TowerData.floors[0].entities.find(e=>e.enemy==='bat'),m=TowerAssets.get('enemy_bat'),scale=r.spriteScale('enemy_bat');
   const debug=[];for(const p of points){
    const wx=e.x*16+8+(p.x-m.anchor.x)/3*scale,wy=e.y*16+16+(p.y-m.anchor.y)/3*scale;
    const x=b.left+v.offsetX+(wx/16-v.x)*v.cellSize,y=b.top+v.offsetY+(wy/16-v.y)*v.cellSize;
    if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
    const strict=r.cellAt(x,y),picked=r.pickCell(x,y);
    if(strict.x===e.x&&strict.y===e.y-1){const hit=document.elementFromPoint(x,y);if(debug.length<8)debug.push({x,y,strict,picked,hit:hit?.id||hit?.className});if(picked.x===e.x&&picked.y===e.y&&hit===c)return {x,y,sourcePixel:p,strict,picked,entity:{id:e.id,x:e.x,y:e.y}};}
   }
   return {diagnostic:{viewport:v,target:e,scale,debug}};
  },opaque[style]);
  assert.ok(Number.isFinite(target.x),'No visible opaque upper sprite pixel resolved to its entity in '+style+': '+JSON.stringify(target));
  await page.mouse.click(target.x,target.y);await page.waitForFunction(e=>game.selection?.x===e.x&&game.selection?.y===e.y,target.entity);assert.deepEqual(await page.evaluate(()=>game.snapshot()),before);
  await page.waitForTimeout(300);const screenshot=path.join(output,'v6-pick-upper-'+style+'.png');await page.screenshot({path:screenshot});cases.push({style,...target,stateUnchanged:true,screenshot});
 }
 assert.deepEqual(errors,[]);const result={cases,errors};fs.writeFileSync(path.join(output,'v6-upper-sprite-picking.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
