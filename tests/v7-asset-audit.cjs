const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
function png(file){const data=fs.readFileSync(path.join(root,file));assert.equal(data.toString('ascii',1,4),'PNG');return {width:data.readUInt32BE(16),height:data.readUInt32BE(20),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};}
function audit(style){
 const manifest=read('assets/'+style+'/manifest.json'),sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js',style==='material'?'material-assets.js':'assets.js'),'utf8'),sandbox);
 assert.equal(JSON.stringify(sandbox.window[style==='material'?'MATERIAL_MANIFEST':'MURAL_MANIFEST']),JSON.stringify(manifest));
 const dimensions={},groups=new Map(),problems=[];
 for(const [id,e]of Object.entries(manifest.assets)){
  const d=dimensions[e.src]||(dimensions[e.src]=png(e.src)),sx=e.sx||0,sy=e.sy||0,n=e.frames||1,k=e.logicalScale??1;
  if(sx<0||sy<0||sx+n*e.sourceW>d.width||sy+e.sourceH>d.height)problems.push({id,reason:'Frame outside PNG'});
  if(!(k>0&&Number.isFinite(k)))problems.push({id,reason:'Invalid logical scale'});
  if(e.anchor&&(e.anchor.x<0||e.anchor.x>e.sourceW||e.anchor.y<0||e.anchor.y>e.sourceH))problems.push({id,reason:'Anchor outside frame'});
  for(const bounds of [e.contentBounds,...(e.frameBounds||[])].filter(Boolean)){const [a,b,c,d]=bounds;if(a<0||b<0||c>e.sourceW||d>e.sourceH||a>c||b>d)problems.push({id,reason:'Bounds outside frame',bounds});}
  if(e.frameBounds&&e.frameBounds.length!==n)problems.push({id,reason:'Frame bounds count differs from animation'});
  const key=[e.src,sx,sy,e.sourceW,e.sourceH,n,k].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);
 }
 const runtimeBytes=Object.values(dimensions).reduce((n,e)=>n+e.bytes,0);assert.equal(runtimeBytes,manifest.runtimeBytes);assert.deepEqual(problems,[]);
 const sources=manifest.sources.map(s=>{const p=png(s.file);assert.equal(p.width,s.width);assert.equal(p.height,s.height);return {...s,...p};});
 return {revision:manifest.revision,ids:Object.keys(manifest.assets).length,uniqueFrameGroups:groups.size,runtimePngs:Object.keys(dimensions).length,runtimeBytes,problems,aliases:[...groups.values()].filter(a=>a.length>1),dimensions,sources};
}
const material=read('assets/material/manifest.json'),mural=read('assets/mural/manifest.json'),result={material:audit('material'),mural:audit('mural')};
assert.equal(material.revision,7);
result.coverage={missingMaterial:Object.keys(mural.assets).filter(k=>!material.assets[k]),extraMaterial:Object.keys(material.assets).filter(k=>!mural.assets[k])};assert.deepEqual(result.coverage.missingMaterial,[]);
result.logicalVolumes=[];
for(const [id,e]of Object.entries(material.assets)){
 if(!/^(actor_|enemy_|npc_|fx_)/.test(id))continue;const old=mural.assets[id];assert.ok(old,id+' lacks baseline');const k=e.logicalScale??1,q=old.logicalScale??1;
 const value={id,source:{w:e.sourceW,h:e.sourceH},logicalScale:k,logicalFrame:{w:e.sourceW*k,h:e.sourceH*k},baselineFrame:{w:old.sourceW*q,h:old.sourceH*q},logicalAnchor:{x:e.anchor.x*k,y:e.anchor.y*k}};
 assert.deepEqual(value.logicalFrame,value.baselineFrame,id+' changed world frame size');assert.equal(e.anchor.x*k,old.anchor.x*q);assert.equal(e.anchor.y*k,old.anchor.y*q);result.logicalVolumes.push(value);
}
result.terrain=Object.entries(material.assets).filter(([id])=>/^(floor|wall)_/.test(id)).map(([id,e])=>({id,source:e.sourceW,tileCells:e.tileCells,worldPeriod:e.tileCells*16,expectedCacheDensity:e.sourceW/(e.tileCells*16)}));
for(const t of result.terrain){assert.equal(t.source,384);assert.equal(t.tileCells,4);assert.equal(t.expectedCacheDensity,6);}
result.expectedTerrainCache={density:6,width:21*16*6,authoredHeight:21*16*6,withSouthBoundaryHeight:23*16*6,southBoundaryRows:2,runtimeObservation:'Deferred until stable browser acceptance; source metadata implies density 6; the runtime south guard uses a separately reported non-walkable boundary-wall band.'};
// Extract only pure normalization functions. This verifies source lineage by
// rebuilding frames in memory; it does not run pack() or write shipped assets.
result.originalSourceVerification=JSON.parse(execFileSync('C:/ProgramData/anaconda3/python.exe',['-c',
 "import ast,json\nfrom pathlib import Path\nfrom PIL import Image\nimport numpy as np\nsource=Path('scripts/prepare_material_assets.py').read_text(encoding='utf-8'); tree=ast.parse(source); names={'slots','clean','prune','actor_slots','normalize'}; pure=ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]); ns={'Image':Image,'np':np,'manifest':{}}; exec(compile(pure,'normalizer-pure','exec'),ns)\nmanifest=json.load(open('assets/material/manifest.json',encoding='utf-8')); reports=[]\nfor name,sourcefile,hero in [('wukong','wukong.png',True),('creatures','creatures-corrected.png',False),('enemies','enemies-extra.png',False)]:\n original=Image.open('assets/material/source/'+sourcefile).convert('RGBA'); cells=ns['actor_slots'](original) if hero else ns['slots'](original,4,4); size=(384,384) if hero else (256,384); anchor=(192,352) if hero else (128,352); expected=ns['normalize'](cells,size,shared=hero,anchor=anchor,unit=4); actual=Image.open('assets/material/atlases/'+name+'.png').convert('RGBA'); failures=[]\n for i,frame in enumerate(expected):\n  cell=actual.crop(((i%4)*size[0],(i//4)*size[1],(i%4+1)*size[0],(i//4+1)*size[1]));\n  if cell.tobytes()!=frame.tobytes():failures.append(i)\n reports.append({'atlas':name,'originalSource':sourcefile,'originalSize':list(original.size),'framesCompared':len(expected),'mismatchedFrames':failures})\nchecks=[]\nfor id,e in manifest['assets'].items():\n if not id.startswith(('actor_','enemy_','npc_')):continue\n im=Image.open(e['src']).convert('RGBA'); boxes=[]\n for frame in range(e.get('frames',1)):\n  x=e.get('sx',0)+frame*e['sourceW']; y=e.get('sy',0); cell=im.crop((x,y,x+e['sourceW'],y+e['sourceH'])); b=list(cell.getbbox() or (0,0,0,0)); expected=e.get('frameBounds',[e.get('contentBounds')])[frame if e.get('frameBounds') else 0];\n  if b!=expected:checks.append({'id':id,'frame':frame,'actual':b,'declared':expected})\nprint(json.dumps({'method':'Pure normalizer functions applied to original source PNGs in memory; no atlas input used for regeneration','atlases':reports,'actualAlphaBoundsMismatches':checks}))"
],{cwd:root,encoding:'utf8',maxBuffer:1024*1024}));
for(const a of result.originalSourceVerification.atlases)assert.deepEqual(a.mismatchedFrames,[]);assert.deepEqual(result.originalSourceVerification.actualAlphaBoundsMismatches,[]);
fs.writeFileSync(path.join(root,'audits/v7-asset-bounds.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({material:{revision:result.material.revision,ids:result.material.ids,uniqueFrameGroups:result.material.uniqueFrameGroups,pngs:result.material.runtimePngs,bytes:result.material.runtimeBytes},coverage:result.coverage,logicalVolumesChecked:result.logicalVolumes.length,cache:result.expectedTerrainCache,sourceLineage:result.originalSourceVerification.atlases,alphaBoundsMismatches:result.originalSourceVerification.actualAlphaBoundsMismatches},null,2));
