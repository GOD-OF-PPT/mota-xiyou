/* Raster atlas loader. All resources ship locally; no fetch, build or network is required. */
(function(root){
  'use strict';
  const manifest=root.MURAL_MANIFEST,entries=new Map(),images=new Map();let pending=null;
  const api={ready:false,revision:5,manifest,stats:{loaded:0,total:0,failed:[]},
    get(id){return entries.get(id)||null;},
    preload(onProgress){
      if(pending){if(onProgress)pending.then(onProgress);return pending;}
      const sources=[...new Set(Object.values(manifest.assets).map(e=>e.src))];api.stats.total=sources.length;
      const report=()=>{const p={loaded:api.stats.loaded,total:api.stats.total,failed:[...api.stats.failed]};onProgress?.(p);return p;};report();
      pending=Promise.all(sources.map(src=>new Promise(resolve=>{
        const image=new Image();image.onload=()=>{images.set(src,image);api.stats.loaded++;report();resolve();};image.onerror=()=>{api.stats.failed.push(src);api.stats.loaded++;report();resolve();};image.src=src;
      }))).then(()=>{
        for(const [id,e]of Object.entries(manifest.assets)){const image=images.get(e.src);if(image)entries.set(id,{...e,image});}
        api.ready=true;root.dispatchEvent?.(new Event('tower-assets-ready'));return report();
      });return pending;
    },
    draw(ctx,id,x,y,width,height,frame=0){
      const e=entries.get(id);if(!e?.image)return false;
      const n=Math.min((e.frames||1)-1,Math.max(0,Math.floor(frame))),sx=(e.sx||0)+n*e.sourceW,sy=e.sy||0;
      ctx.imageSmoothingEnabled=false;ctx.drawImage(e.image,sx,sy,e.sourceW,e.sourceH,x,y,width,height);return true;
    },
    drawTile(ctx,id,cellX,cellY,x,y,size=16){
      const e=entries.get(id);if(!e?.image)return false;const count=e.tileCells||4,w=e.sourceW/count,h=e.sourceH/count;
      const px=((cellX%count)+count)%count,py=((cellY%count)+count)%count;
      ctx.imageSmoothingEnabled=false;ctx.drawImage(e.image,(e.sx||0)+px*w,(e.sy||0)+py*h,w,h,x,y,size,size);return true;
    }
  };root.TowerAssets=api;
})(window);
