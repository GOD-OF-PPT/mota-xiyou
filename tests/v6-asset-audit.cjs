const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),result={};
function audit(style){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets',style,'manifest.json'),'utf8'));
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js',style==='material'?'material-assets.js':'assets.js'),'utf8'),sandbox);
 assert.equal(JSON.stringify(sandbox.window[style==='material'?'MATERIAL_MANIFEST':'MURAL_MANIFEST']),JSON.stringify(manifest),'Runtime JavaScript manifest differs from documented JSON');
 const dimensions={},frameGroups=new Map(),problems=[];
 for(const [id,e]of Object.entries(manifest.assets)){
  if(!dimensions[e.src]){const data=fs.readFileSync(path.join(root,e.src));assert.equal(data.toString('ascii',1,4),'PNG');dimensions[e.src]={width:data.readUInt32BE(16),height:data.readUInt32BE(20),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};}
  const d=dimensions[e.src],sx=e.sx||0,sy=e.sy||0,frames=e.frames||1;
  if(sx<0||sy<0||sx+frames*e.sourceW>d.width||sy+e.sourceH>d.height)problems.push({id,reason:'Frame outside PNG',entry:e,dimensions:d});
  if(e.anchor&&(e.anchor.x<0||e.anchor.x>e.sourceW||e.anchor.y<0||e.anchor.y>e.sourceH))problems.push({id,reason:'Anchor outside source frame'});
  if(e.contentBounds){const [x1,y1,x2,y2]=e.contentBounds;if(x1<0||y1<0||x2>e.sourceW||y2>e.sourceH||x1>x2||y1>y2)problems.push({id,reason:'Declared content bounds outside frame'});}
  const key=[e.src,sx,sy,e.sourceW,e.sourceH,frames].join(':');if(!frameGroups.has(key))frameGroups.set(key,[]);frameGroups.get(key).push(id);
 }
 const files=Object.keys(dimensions),runtimeBytes=files.reduce((n,f)=>n+dimensions[f].bytes,0);
 assert.equal(runtimeBytes,manifest.runtimeBytes);assert.deepEqual(problems,[]);
 return {ids:Object.keys(manifest.assets).length,uniqueFrameGroups:frameGroups.size,runtimeFiles:files.length,runtimeBytes,declaredRuntimeBytes:manifest.runtimeBytes,problems,aliases:[...frameGroups.values()].filter(a=>a.length>1),dimensions};
}
for(const style of ['material','mural'])result[style]=audit(style);
const material=JSON.parse(fs.readFileSync(path.join(root,'assets/material/manifest.json'),'utf8')).assets,mural=JSON.parse(fs.readFileSync(path.join(root,'assets/mural/manifest.json'),'utf8')).assets;
result.coverage={missingMaterial:Object.keys(mural).filter(id=>!material[id]),extraMaterial:Object.keys(material).filter(id=>!mural[id]),sharedPngHashes:Object.values(result.material.dimensions).filter(m=>Object.values(result.mural.dimensions).some(p=>p.sha256===m.sha256)).length};
assert.deepEqual(result.coverage.missingMaterial,[]);assert.equal(result.coverage.sharedPngHashes,0);
fs.writeFileSync(path.join(root,'audits/v6-asset-bounds.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([k,v])=>[k,k==='coverage'?v:{ids:v.ids,uniqueFrameGroups:v.uniqueFrameGroups,runtimeFiles:v.runtimeFiles,runtimeBytes:v.runtimeBytes,problems:v.problems} ])),null,2));
