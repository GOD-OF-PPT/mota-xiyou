/* Generated UI materials only. No engine, storage, fees or rewards enter here. */
(function(root){
 'use strict';
 const files=['quest-plaque','reading-folio','dialogue-scroll','offering-tablet'].map(id=>'assets/ui-v26/'+id+'.png');
 let pending;const images=[];
 const api={ready:false,stats:{loaded:0,total:files.length,failed:[]},files,
  preload(onProgress){
   const report=()=>{const value={...api.stats,failed:[...api.stats.failed]};onProgress?.(value);return value;};
   if(pending){onProgress?.({...api.stats,failed:[...api.stats.failed]});return pending;}
   report();pending=Promise.all(files.map(src=>new Promise(resolve=>{const img=new Image();images.push(img);img.onload=()=>{api.stats.loaded++;report();resolve();};img.onerror=()=>{api.stats.failed.push(src);api.stats.loaded++;report();resolve();};img.src=src;}))).then(()=>{api.ready=api.stats.failed.length===0;document.documentElement.dataset.uiSkins=api.ready?'ready':'fallback';return report();});return pending;
  }
 };root.TowerUISkins=api;
})(window);
