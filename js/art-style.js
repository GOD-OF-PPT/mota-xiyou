/* Local, lazily loaded art families. The simulation and save data never enter this module. */
(function(root){
  'use strict';
  const mural=root.TowerAssets,manifest=root.MATERIAL_MANIFEST;
  if(!mural||!manifest)return;
  const progress=(id,value)=>root.dispatchEvent(new CustomEvent('tower-style-progress',{detail:{id,...value}}));
  function createAtlas(data){
    const entries=new Map(),images=new Map();let pending;
    const api={manifest:data,ready:false,revision:data.revision||6,stats:{loaded:0,total:0,failed:[]},
      get(id){return entries.get(id)||null;},
      preload(onProgress){
        if(pending){onProgress?.({...api.stats});return pending;}
        const sources=[...new Set(Object.values(data.assets).map(e=>e.src))];api.stats.total=sources.length;
        const report=()=>{const value={...api.stats,failed:[...api.stats.failed]};onProgress?.(value);return value;};report();
        pending=Promise.all(sources.map(src=>new Promise(resolve=>{
          const image=new Image();image.onload=()=>{images.set(src,image);api.stats.loaded++;report();resolve();};
          image.onerror=()=>{api.stats.failed.push(src);api.stats.loaded++;report();resolve();};image.src=src;
        }))).then(()=>{
          for(const [id,e]of Object.entries(data.assets)){const image=images.get(e.src);if(image)entries.set(id,{...e,image});}
          api.ready=true;return report();
        });return pending;
      },
      draw(ctx,id,x,y,w,h,frame=0){
        const e=entries.get(id);if(!e?.image)return false;
        const n=Math.min((e.frames||1)-1,Math.max(0,Math.floor(frame)));
        ctx.imageSmoothingEnabled=true;ctx.drawImage(e.image,(e.sx||0)+n*e.sourceW,e.sy||0,e.sourceW,e.sourceH,x,y,w,h);return true;
      },
      drawTile(ctx,id,cellX,cellY,x,y,size=16){
        const e=entries.get(id);if(!e?.image)return false;
        const count=e.tileCells||4,w=e.sourceW/count,h=e.sourceH/count,px=((cellX%count)+count)%count,py=((cellY%count)+count)%count;
        ctx.imageSmoothingEnabled=true;ctx.drawImage(e.image,(e.sx||0)+px*w,(e.sy||0)+py*h,w,h,x,y,size,size);return true;
      }
    };return api;
  }
  const families={mural,material:createAtlas(manifest)},storageKey='dasheng-art-style-v6';
  const unlocked=id=>id==='material'||root.TowerStyleProgress?.isUnlocked(id)===true;
  let preferred='material';try{const stored=localStorage.getItem(storageKey);if(families[stored]&&unlocked(stored))preferred=stored;else if(stored==='mural')localStorage.setItem(storageKey,'material');}catch{}
  let active=preferred,requestSerial=0;
  const current=()=>families[active];
  const apply=id=>{
    active=id;document.documentElement.dataset.artStyle=id;
    try{localStorage.setItem(storageKey,id);}catch{}
    root.dispatchEvent(new CustomEvent('tower-art-style',{detail:{id}}));
    root.dispatchEvent(new CustomEvent('tower-style-changed',{detail:{id}}));
  };
  document.documentElement.dataset.artStyle=active;
  root.TowerAssets={
    get ready(){return current().ready;},get revision(){return current().revision;},
    get manifest(){return current().manifest;},get stats(){return current().stats;},get style(){return active;},
    get(id){return current().get(id);},draw(...args){return current().draw(...args);},drawTile(...args){return current().drawTile(...args);},
    preload(onProgress){const id=active;return families[id].preload(value=>{onProgress?.(value);progress(id,value);}).then(value=>{root.dispatchEvent(new Event('tower-assets-ready'));return value;});}
  };
  root.TowerStyle={
    get current(){return active;},get(){return active;},
    isUnlocked:unlocked,
    get available(){return [{id:'material',name:'玄金古寺',description:'三维材质预渲染 · 石木铜金'},{id:'mural',name:'青绿壁画',description:'矿彩像素 · 清晰格点'}].filter(s=>unlocked(s.id));},
    async set(id){
      if(!families[id])throw new Error('未收录的画境');
      if(!unlocked(id)){const error=new Error('完成任一主线结局后解锁新画境');error.code='STYLE_LOCKED';throw error;}
      const serial=++requestSerial,result=await families[id].preload(value=>progress(id,value));
      if(result.failed.length){const error=new Error('画境载入未完成，保留当前风格');error.failed=result.failed;throw error;}
      if(serial===requestSerial)apply(id);
      return {...result,id,applied:serial===requestSerial};
    }
  };
})(window);
