(function(root){
 'use strict';
 function preview(engine,e){if(e?.type!=='switch')return [];const s=engine.state,flags={...s.switches,[e.id]:!s.switches[e.id]},floor=engine.data.floors[s.floor];return floor.entities.filter(g=>g.type==='gate'&&(g.controls?.includes(e.controlId||e.id)||!g.controls&&g.group===e.group)).map(g=>{const before=engine.isGateOpen(g,s.floor,s.switches),after=engine.isGateOpen(g,s.floor,flags);return {id:g.id,x:g.x,y:g.y,label:g.label||'联动门',before,after,status:g.releaseOnChoice&&s.choices[g.releaseOnChoice]?'取卷后常开':before===after?(after?'仍开':'仍闭'):(after?'将开':'将关')};});}
 root.TowerMechanisms={preview};
})(typeof window!=='undefined'?window:globalThis);
