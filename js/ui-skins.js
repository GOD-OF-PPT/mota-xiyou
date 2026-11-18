/* Generated UI materials only. No engine, storage, fees or rewards enter here. */
(function(root){
 'use strict';
 const v26=['quest-plaque','reading-folio','dialogue-scroll','offering-tablet'].map(id=>'assets/ui-v26/'+id+'.png');
 const v46=['emblem-fillet','brocade-mat','seals-banner','icon-walk-cloud','stance-dinghai','stance-pishan','stance-wuhua'].map(id=>'assets/ui-v46/'+id+'.webp');
 const files=[...v26,...v46];
 let pending;const images=new Map();
 const api={ready:false,stats:{loaded:0,total:files.length,failed:[]},files,
  get(key){return images.get(key)||images.get('assets/ui-v46/'+key+'.webp')||null;},
  preload(onProgress){
   const report=()=>{const value={...api.stats,failed:[...api.stats.failed]};onProgress?.(value);return value;};
   if(pending){onProgress?.({...api.stats,failed:[...api.stats.failed]});return pending;}
   report();pending=Promise.all(files.map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>{images.set(src,img);api.stats.loaded++;report();resolve();};img.onerror=()=>{api.stats.failed.push(src);api.stats.loaded++;report();resolve();};img.src=src;}))).then(()=>{
    api.ready=!v26.some(s=>api.stats.failed.includes(s));
    document.documentElement.dataset.uiSkins=api.ready?'ready':'fallback';
    for(const [varName,src]of [['--v46-brocade','assets/ui-v46/brocade-mat.webp'],['--v46-emblem','assets/ui-v46/emblem-fillet.webp'],['--v46-seals-banner','assets/ui-v46/seals-banner.webp']]){
     const loaded=images.get(src);if(loaded?.src)document.documentElement.style.setProperty(varName,`url("${loaded.src}")`);
    }
    return report();
   });return pending;
  }
 };root.TowerUISkins=api;
})(window);
