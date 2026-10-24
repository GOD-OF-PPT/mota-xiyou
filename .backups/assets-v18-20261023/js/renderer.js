/* Read-only scene presentation. Exploration covers the viewport; planning fits
   the whole floor. Pixel art uses its native cache, material terrain follows
   source density, and HD entities/FX draw directly into the final DPR canvas. */
(() => {
  'use strict';
  const CELL = 16, NATIVE = 3, SIZE = 21 * CELL * NATIVE;
  const THEMES = {
    jade:    {void:'#174e50',wall:'#297974',light:'#91b7a0',edge:'#184b4c',floor:'#e0cea2',floor2:'#e5d4ad',line:'#c4b484',moss:'#f0da9d',glow:'#edbd68',mist:'#e4d7b1'},
    amber:   {void:'#174a51',wall:'#337e77',light:'#c9b978',edge:'#205451',floor:'#e1c996',floor2:'#e5cea1',line:'#bda56f',moss:'#e3ce97',glow:'#eac279',mist:'#e6cfa7'},
    blue:    {void:'#103f52',wall:'#287b7c',light:'#80b8a9',edge:'#174f60',floor:'#d9d3b1',floor2:'#e0d9bb',line:'#b7bea0',moss:'#e5d5a4',glow:'#a3e5db',mist:'#dfd9be'},
    crimson: {void:'#293f48',wall:'#39746a',light:'#c8aa69',edge:'#234d49',floor:'#dcc294',floor2:'#e2cba2',line:'#b99c70',moss:'#e9d1a2',glow:'#f5b66c',mist:'#e1c6a4'},
    violet:  {void:'#254a51',wall:'#477f7a',light:'#abc0a2',edge:'#2b555a',floor:'#e3d8b7',floor2:'#e9dfc1',line:'#c8c19e',moss:'#efe2b7',glow:'#e6d5ac',mist:'#e5d9c0'},
    gold:    {void:'#173e47',wall:'#2d6969',light:'#b8a363',edge:'#23494e',floor:'#d1bf9b',floor2:'#d9c8a6',line:'#b5a078',moss:'#e6cb8c',glow:'#f1cf80',mist:'#e2d0ae'}
  };
  const MATERIAL_THEMES={
    jade:{void:'#161c20',wall:'#34383a',light:'#807b69',edge:'#1d2428',floor:'#77746b',floor2:'#817c70',line:'#4b4e4c',moss:'#b49a67',glow:'#dba44e',mist:'#879493'},
    amber:{void:'#1b1b1d',wall:'#39342f',light:'#94794e',edge:'#24211f',floor:'#817768',floor2:'#8c806d',line:'#575146',moss:'#c3a16a',glow:'#e4ad56',mist:'#8f9289'},
    blue:{void:'#101b23',wall:'#28363b',light:'#697d7d',edge:'#17262d',floor:'#6b7b7b',floor2:'#778582',line:'#455a60',moss:'#a8b7a1',glow:'#8dcbbf',mist:'#86a2a6'},
    crimson:{void:'#211a1b',wall:'#413531',light:'#a47c50',edge:'#29211f',floor:'#837364',floor2:'#8b7c69',line:'#584b42',moss:'#c49d64',glow:'#eca557',mist:'#a58f80'},
    violet:{void:'#171c23',wall:'#333b42',light:'#858b82',edge:'#252b33',floor:'#7f837d',floor2:'#8a8b80',line:'#535d5d',moss:'#b7b499',glow:'#d4c999',mist:'#a0aaa5'},
    gold:{void:'#17191c',wall:'#302f30',light:'#9c865b',edge:'#202326',floor:'#787367',floor2:'#817a6a',line:'#4e4a42',moss:'#c4a46a',glow:'#e4bd71',mist:'#96978d'}
  };
  const C = {
    ink:'#111421',gold:'#dca653',goldLight:'#ffe09a',goldDark:'#895638',red:'#bb4b47',redLight:'#ee7862',
    jade:'#7bc6ab',jadeDark:'#387e78',white:'#e3e0ca',blue:'#72baca',purple:'#b2a2dd',shadow:'#10131c'
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=(x,y,z=0)=>{let n=(x*374761393+y*668265263+z*1274126177)|0;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295;};
  const rect=(ctx,x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x*NATIVE)/NATIVE,Math.round(y*NATIVE)/NATIVE,w,h);};
  const line=(ctx,x,y,w,c)=>rect(ctx,x,y,w,1,c);
  function jewel(ctx,x,y,color,light,dark) {
    rect(ctx,x+5,y+2,6,1,C.ink);rect(ctx,x+3,y+3,10,3,C.ink);rect(ctx,x+2,y+6,12,3,C.ink);rect(ctx,x+4,y+9,8,2,C.ink);rect(ctx,x+6,y+11,4,2,C.ink);
    rect(ctx,x+5,y+3,6,2,light);rect(ctx,x+3,y+6,10,2,color);rect(ctx,x+5,y+8,6,2,dark);rect(ctx,x+7,y+10,2,2,dark);
    rect(ctx,x+5,y+4,2,3,'#fff1d2');rect(ctx,x+3,y+6,2,1,light);rect(ctx,x+8,y+6,3,1,light);
  }
  function shadow(ctx,x,y,w=10,profile=null) {
    if((window.TowerAssets?.style||window.TowerStyle?.get?.())==='material'){
      const width=profile?.shadowWidth||w*.75,depth=profile?.shadowDepth||width*.3,lift=profile?.elevation||0;
      const lobe=(dx,dy,rx,ry,alpha)=>{ctx.save();ctx.translate(x+(profile?.groundX??8)+dx,y+(profile?.groundY??14.8)+dy);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,`rgba(16,20,21,${alpha})`);g.addColorStop(.4,`rgba(16,20,21,${alpha*.72})`);g.addColorStop(1,'rgba(16,20,21,0)');ctx.fillStyle=g;ctx.fillRect(-rx,-rx,rx*2,rx*2);ctx.restore();};
      // One upper-left light direction, then tight ambient occlusion at the base.
      lobe(1.15+lift*.35,.85+lift*.2,width,depth*1.12,lift>.5?.3:.42);
      if(lift<.5)lobe(0,.15,width*.62,Math.max(.42,depth*.42),.7);
    }else{ctx.globalAlpha=.35;rect(ctx,x+(16-w)/2,y+13,w,2,'#070d15');ctx.globalAlpha=1;}
  }
  function surfacePath(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
  // Measured opaque boot/staff contacts in the shipped 384px source frames.
  // Keeping these beside the render code avoids file:// canvas pixel readback.
  const HERO_CONTACTS={down:[[[156,13],[197.5,12]],[[192,15]],[[192,13]],[[191.5,14]]],left:[[[193.5,28]],[[187,29],[260.5,14]],[[191.5,30]],[[191,29]]],right:[[[191,25]],[[159,13],[193.5,10]],[[189,21]],[[191.5,16]]],up:[[[193,15]],[[194,17]],[[192.5,18]],[[191,13]]]};

  class TowerRenderer {
    constructor(canvas, engine) {
      this.canvas=canvas;this.engine=engine;this.canvas.towerRenderer=this;
      this.ctx=canvas.getContext('2d',{alpha:false});
      this.buffer=document.createElement('canvas');this.buffer.width=this.buffer.height=SIZE;
      this.p=this.buffer.getContext('2d');this.ctx.imageSmoothingEnabled=false;this.p.imageSmoothingEnabled=false;
      this.terrainBuffer=document.createElement('canvas');this.terrainKey='';
      this.effects=[];this.hover=null;this.t=0;this.lastFloor=-1;this.floorFade=0;this.running=true;
      this.overview=false;this.camera={x:0,y:0,w:21,h:21,overview:false};this.cameraFocus=null;this.lastPlayer=null;this.lastSelection='';this.safeInsets={top:0,right:0,bottom:0,left:0};this.actorAnchors=new Map();
      this.reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resizeHandler=()=>this.resize();this.styleHandler=()=>{this.terrainKey='';this.resize();};
      window.addEventListener('resize',this.resizeHandler);window.addEventListener('tower-art-style',this.styleHandler);window.addEventListener('tower-style-changed',this.styleHandler);
      if(window.ResizeObserver){this.observer=new ResizeObserver(this.resizeHandler);this.observer.observe(canvas);}
      this.resize();
      this.frame=(t)=>{if(!this.running)return;this.draw(t);this.raf=requestAnimationFrame(this.frame);};
      this.raf=requestAnimationFrame(this.frame);
    }
    destroy(){this.running=false;cancelAnimationFrame(this.raf);this.observer?.disconnect();window.removeEventListener('resize',this.resizeHandler);window.removeEventListener('tower-art-style',this.styleHandler);window.removeEventListener('tower-style-changed',this.styleHandler);if(this.canvas.towerRenderer===this)delete this.canvas.towerRenderer;}
    styleId(){return window.TowerAssets?.style||window.TowerStyle?.get?.()||'mural';}
    smoothing(){return this.styleId()==='material';}
    resize(){
      const bounds=this.canvas.getBoundingClientRect(),width=Math.max(1,Math.round(bounds.width||window.innerWidth||624)),height=Math.max(1,Math.round(bounds.height||window.innerHeight||624)),ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
      this.cssWidth=width;this.cssHeight=height;this.pixelRatio=ratio;const pw=Math.round(width*ratio),ph=Math.round(height*ratio);
      if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;}
      this.canvas.style.imageRendering=this.smoothing()?'auto':'pixelated';this.ctx.imageSmoothingEnabled=this.smoothing();this.p.imageSmoothingEnabled=this.smoothing();this.updateCamera();return {width,height,pixelRatio:ratio};
    }
    setSafeInsets(insets={}){for(const key of ['top','right','bottom','left'])this.safeInsets[key]=Math.max(0,Number(insets[key])||0);this.updateCamera();}
    setPlayerGuard(rect){
      const next=rect?{x:Number(rect.x??rect.left)||0,y:Number(rect.y??rect.top)||0,w:Math.max(0,Number(rect.w??rect.width)||0),h:Math.max(0,Number(rect.h??rect.height)||0)}:null;
      const guard=next?.w&&next?.h?next:null;if(JSON.stringify(guard)===JSON.stringify(this.playerGuard||null))return;this.playerGuard=guard;this.updateCamera();
    }
    setHover(x,y){this.hover=(x===null||x===undefined)?null:{x,y};}
    projection(){return this.renderViewport&&this.renderFloor===this.engine.state?.floor?this.renderViewport:this.getViewport();}
    cellAt(clientX,clientY){const b=this.canvas.getBoundingClientRect(),v=this.projection();const x=Math.floor((clientX-b.left-v.offsetX)/v.cellSize+v.x),y=Math.floor((clientY-b.top-v.offsetY)/v.cellSize+v.y);return {x,y};}
    pickCell(clientX,clientY){
      const grid=this.cellAt(clientX,clientY),s=this.engine.state,floor=this.data().floors[s.floor];if(!floor)return grid;
      if(this.engine.getEntity?.(grid.x,grid.y)||['~','=','w'].includes(this.tile(grid.x,grid.y))||grid.x===s.x&&grid.y===s.y)return grid;
      const b=this.canvas.getBoundingClientRect(),v=this.projection(),wx=((clientX-b.left-v.offsetX)/v.cellSize+v.x)*CELL,wy=((clientY-b.top-v.offsetY)/v.cellSize+v.y)*CELL;
      const entries=(floor.entities||[]).filter(e=>!s.removed?.[e.id]&&!(e.type==='illusion'&&s.revealed?.[e.id])&&!(e.type==='seal'&&(s.relics?.length||0)>=(e.requires||0))).map(e=>({...e}));entries.push({x:s.x,y:s.y,type:'player'});const depth=e=>this.actorAnchors?.get(`${s.floor}:${e.x}:${e.y}`)?.depth??this.entityDepth(e);entries.sort((a,b)=>depth(b)-depth(a)||(b.type==='player'?1:-1));
      for(const e of entries){
        const clone=e.type==='switch'&&e.kind==='plate'&&s.switches?.[e.id];let id;if(e.type==='player')id=`actor_wukong_${s.facing||'up'}`;else if(clone)id=`actor_wukong_${e.facing||'down'}`;else if(e.type==='enemy')id=`enemy_${e.enemy}`;else if(e.type==='item')id=`item_${e.item}`;else if(e.type==='treasure')id=`treasure_${e.treasure}`;else if(e.type==='npc'||e.type==='rescue'){const raw=String(e.sprite||e.archetype||e.quest||'lantern').toLowerCase(),kind=/bajie|pig/.test(raw)?'bajie':/white|wutian/.test(raw)?'whitewutian':/tang/.test(raw)?'tangseng':/nezha/.test(raw)?'nezha':/qiao/.test(raw)?'qiao':'lantern';id=`npc_${kind}`;}else if(e.type==='door')id=`prop_door_${e.color}`;else if(e.type==='stairs')id=`prop_stairs_${e.to>s.floor?'up':'down'}`;else if(e.type==='cache')id='prop_chest';else if(e.type==='gate'&&this.gateOpen(e))id='prop_gate_open';else id=`prop_${e.type}`;
        const rendered=this.actorAnchors?.get(`${s.floor}:${e.x}:${e.y}`);if(rendered){if(wx>=rendered.left&&wx<=rendered.left+rendered.width&&wy>=rendered.top&&wy<=rendered.top+rendered.height&&!this.wallOccludes(wx,wy,rendered.depth))return {x:e.x,y:e.y};continue;}
        const meta=window.TowerAssets?.get?.(id);if(!meta?.anchor)continue;const profile=this.renderProfile(e,id),anchor=profile.sourceContact||meta.anchor,bounds=meta.frameBounds?.[0]||meta.contentBounds||[0,0,meta.sourceW,meta.sourceH],scale=(meta.logicalScale??1)*this.spriteScale(id)*profile.scale*(e.type==='enemy'&&this.data().enemies[e.enemy]?.trait==='boss'?1.12:1),left=e.x*CELL+profile.groundX-anchor.x/NATIVE*scale+bounds[0]/NATIVE*scale,top=e.y*CELL+profile.groundY-profile.elevation-(clone?1:0)-anchor.y/NATIVE*scale+bounds[1]/NATIVE*scale,right=left+(bounds[2]-bounds[0])/NATIVE*scale,bottom=top+(bounds[3]-bounds[1])/NATIVE*scale;
        if(wx>=left&&wx<=right&&wy>=top&&wy<=bottom&&!this.wallOccludes(wx,wy,this.entityDepth(e)))return {x:e.x,y:e.y};
      }return grid;
    }
    setOverview(value){const prior=this.overview;this.overview=!!value;if(prior&&!this.overview)this.focusPlayer();else this.updateCamera();return this.overview;}
    toggleOverview(){return this.setOverview(!this.overview);}
    getViewport(){this.updateCamera();return {...this.camera,overview:this.overview,tileX:Math.floor(this.camera.x),tileY:Math.floor(this.camera.y)};}
    focusCell(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;this.updateCamera();this.cameraFocus={x,y};this.updateCamera();}
    focusPlayer(){const s=this.engine.state||{},e=this.engine.selection;this.cameraFocus=null;this.lastSelection=e?`${s.floor}:${e.x}:${e.y}`:'';this.updateCamera();}
    screenPoint(x,y,options={}){if(options.moving){const a=this.anchorFor(x,y,options);if(!a?.visible)return null;return options.anchor==='feet'?a.foot:a.body;}const v=this.projection();if(x+.5<v.x||y+.5<v.y||x+.5>=v.x+v.w||y+.5>=v.y+v.h)return null;return {x:v.offsetX+(x-v.x+.5)*v.cellSize,y:v.offsetY+(y-v.y+.5)*v.cellSize};}
    anchorFor(x,y){
      const v=this.projection(),stored=this.actorAnchors?.get(`${this.engine.state?.floor}:${x}:${y}`),profile=this.renderProfile(this.engine.getEntity?.(x,y)||{x,y,type:'player'}),a=stored||{footX:x*CELL+profile.groundX,footY:y*CELL+profile.groundY,left:x*CELL,top:y*CELL-8,width:16,height:24},scale=v.cellSize/CELL;
      const foot={x:v.offsetX+(a.footX-v.x*CELL)*scale,y:v.offsetY+(a.footY-v.y*CELL)*scale},bounds={x:v.offsetX+(a.left-v.x*CELL)*scale,y:v.offsetY+(a.top-v.y*CELL)*scale,w:a.width*scale,h:a.height*scale};
      return {foot,body:{x:bounds.x+bounds.w*.5,y:bounds.y+bounds.h*.48},bounds,footprint:a.footprint?{x:v.offsetX+(a.footprint.x-v.x*CELL)*scale,y:v.offsetY+(a.footprint.y-v.y*CELL)*scale,w:a.footprint.w*scale,h:a.footprint.h*scale}:null,elevation:a.elevation||0,visible:bounds.x+bounds.w>=0&&bounds.x<=v.cssWidth&&bounds.y+bounds.h>=0&&bounds.y<=v.cssHeight,cell:{x,y},ready:!!stored};
    }
    updateCamera(time=performance.now()){
      const state=this.engine.state||{},floor=this.data().floors[state.floor||0];if(!floor)return;
      const width=floor.map[0]?.length||13,height=floor.map.length||13,position=`${state.floor}:${state.x}:${state.y}`;
      if(this.lastPlayer!==position){this.lastPlayer=position;this.cameraFocus=null;}
      const selection=this.engine.selection,key=selection?`${state.floor}:${selection.x}:${selection.y}`:'';
      if(key&&key!==this.lastSelection&&this.lastFloor===state.floor)this.cameraFocus={x:selection.x,y:selection.y};
      this.lastSelection=key;
      const player=this.playerMotion(time),target=this.cameraFocus||{x:player.cameraX,y:player.cameraY};
      const pad=this.safeInsets||{top:0,right:0,bottom:0,left:0},availableW=Math.max(1,(this.cssWidth||624)-pad.left-pad.right),fullHeight=Math.max(1,(this.cssHeight||624)-pad.top-pad.bottom),availableH=this.overview&&this.playerGuard?Math.max(1,Math.min(fullHeight,this.playerGuard.y-12-pad.top)):fullHeight,cellSize=this.overview?Math.min(availableW/width,availableH/height):Math.max(availableW/width,availableH/height,48);
      const w=this.overview?width:Math.min(width,availableW/cellSize),h=this.overview?height:Math.min(height,availableH/cellSize);
      const x=this.overview?0:clamp(target.x-(w-1)/2,0,width-w),naturalY=this.overview?0:clamp(target.y-(h-1)/2,0,height-h),offsetX=pad.left+(availableW-w*cellSize)/2,offsetY=pad.top+(availableH-h*cellSize)/2,guard=this.playerGuard;
      let guardShiftY=0;if(!this.overview&&guard){const footX=offsetX+(player.footX/CELL-x)*cellSize,footY=offsetY+(player.footY/CELL-naturalY)*cellSize;if(footX>=guard.x-12&&footX<=guard.x+guard.w+12&&footY>=guard.y-12&&footY<=guard.y+guard.h+12)guardShiftY=Math.min(1.5,Math.max(0,(footY-guard.y+12)/cellSize));}
      const y=naturalY+guardShiftY;this.camera={x,y,w,h,cellSize,offsetX,offsetY,cssWidth:this.cssWidth||624,cssHeight:this.cssHeight||624,overview:this.overview,guardShiftY,boundaryRowsVisible:Math.max(0,y+h-height),authoredWidth:width,authoredHeight:height,planningHeight:this.overview?availableH:null};
    }
    data(){return window.TowerData||{floors:[],enemies:{},items:{},relics:[]};}
    tile(x,y){try{return this.engine.getTile(x,y);}catch(_){return this.floor.map[y]?.[x]||'#';}}
    gateOpen(e){try{return this.engine.isGateOpen(e);}catch(_){return false;}}
    bars(ctx,x,y){
      rect(ctx,x,y+1,16,2,C.ink);rect(ctx,x,y+13,16,2,C.ink);
      for(let i=2;i<16;i+=4){rect(ctx,x+i,y+2,2,12,'#607c7d');rect(ctx,x+i,y+2,1,11,'#9fb2a0');}
      line(ctx,x+1,y+5,14,'#344f53');line(ctx,x+1,y+11,14,'#344f53');rect(ctx,x+7,y+7,3,3,C.goldDark);rect(ctx,x+8,y+8,1,1,C.goldLight);
    }
    item(ctx,x,y,id){
      const item=this.data().items[id]||{};const kind=item.kind||String(id);shadow(ctx,x,y,8);
      const bob=this.reduced?0:Math.round(Math.sin(this.t/520+x)*.55);y+=bob;
      if(kind==='key'||/key/i.test(kind)){
        const col=item.color||(/blue/i.test(id)?'blue':/red/i.test(id)?'red':'yellow');const color={yellow:C.goldLight,blue:C.blue,red:C.redLight}[col]||C.gold;
        rect(ctx,x+5,y+2,6,1,C.ink);rect(ctx,x+4,y+3,8,5,C.ink);rect(ctx,x+6,y+3,4,1,color);rect(ctx,x+5,y+4,1,2,color);rect(ctx,x+10,y+4,1,2,color);rect(ctx,x+6,y+6,4,1,color);
        rect(ctx,x+7,y+7,2,6,C.ink);rect(ctx,x+7,y+7,1,5,color);rect(ctx,x+8,y+9,3,1,color);rect(ctx,x+8,y+11,3,1,color);
      } else if(kind==='atk'){jewel(ctx,x,y,'#d96459','#ffc396','#9d3d4c');}
      else if(kind==='def'){jewel(ctx,x,y,'#75b7cd','#c5f0e2','#426e9d');}
      else if(kind==='coin'){
        rect(ctx,x+4,y+5,8,7,C.ink);rect(ctx,x+3,y+7,10,4,C.goldDark);rect(ctx,x+4,y+4,8,6,C.gold);rect(ctx,x+5,y+3,6,1,C.goldLight);rect(ctx,x+4,y+4,1,4,C.goldLight);rect(ctx,x+7,y+5,2,3,C.goldDark);rect(ctx,x+5,y+10,6,1,C.goldLight);
      } else if(kind==='orb'||kind==='mana'){
        rect(ctx,x+5,y+2,6,1,C.ink);rect(ctx,x+3,y+4,10,6,C.ink);rect(ctx,x+5,y+11,6,1,C.ink);rect(ctx,x+5,y+3,6,8,'#4b8b92');rect(ctx,x+4,y+5,8,4,C.jade);rect(ctx,x+6,y+4,2,3,'#c5eedb');rect(ctx,x+9,y+8,2,2,'#32717e');
      } else if(kind==='elixir'||kind==='hp'){
        const sacred=kind==='elixir'||item.value>=180,col=sacred?'#d9a65b':'#de8a85',light=sacred?'#ffe4a1':'#ffc4ae',dark=sacred?'#a56b41':'#a35566';
        rect(ctx,x+4,y+4,8,1,C.ink);rect(ctx,x+2,y+6,12,4,C.ink);rect(ctx,x+3,y+5,10,7,C.ink);rect(ctx,x+5,y+12,6,1,C.ink);
        rect(ctx,x+4,y+5,8,6,col);rect(ctx,x+3,y+7,10,3,col);rect(ctx,x+5,y+11,6,1,dark);rect(ctx,x+4,y+6,2,3,light);rect(ctx,x+7,y+5,1,5,dark);rect(ctx,x+8,y+10,3,1,dark);
        rect(ctx,x+7,y+2,2,3,'#56876c');rect(ctx,x+9,y+1,3,2,'#93b87c');rect(ctx,x+9,y+3,2,1,'#56876c');rect(ctx,x+5,y+3,2,1,'#93b87c');
      } else {
        rect(ctx,x+6,y+1,4,2,C.goldDark);rect(ctx,x+6,y+3,4,2,C.white);rect(ctx,x+4,y+5,8,7,C.ink);rect(ctx,x+5,y+5,6,6,'#873944');rect(ctx,x+5,y+6,6,4,'#d66c67');rect(ctx,x+6,y+6,1,3,'#f2b49a');rect(ctx,x+8,y+7,2,1,'#f0c2a0');line(ctx,x+5,y+12,6,C.goldDark);
      }
    }
    choice(ctx,x,y,e){
      const chosen=this.s.choices?.[e.choice],active=chosen===e.option;
      const col=e.option==='blue'?C.blue:e.option==='gold'?C.goldLight:e.option==='free'?C.jade:C.purple;
      shadow(ctx,x,y,12);rect(ctx,x+2,y+12,12,2,C.goldDark);line(ctx,x+3,y+11,10,col);
      rect(ctx,x+4,y+3,8,8,C.ink);rect(ctx,x+5,y+4,6,6,chosen&&!active?'#514953':'#36545a');
      rect(ctx,x+7,y+3,2,7,chosen&&!active?C.goldDark:col);line(ctx,x+5,y+6,6,chosen&&!active?C.goldDark:col);
      if(active){rect(ctx,x+2,y+3,1,3,C.jade);rect(ctx,x+12,y+3,1,3,C.jade);}
      if(e.requires>(this.s.relics?.length||0)){rect(ctx,x+6,y+6,4,4,C.goldDark);rect(ctx,x+7,y+7,2,2,C.white);}
    }
    door(ctx,x,y,color){
      const colors={yellow:['#ab7a43','#e0b76c','#68432e'],blue:['#427985','#86c3c4','#2e4b61'],red:['#934747','#d57f65','#5f303a']};const a=colors[color]||colors.yellow;
      rect(ctx,x,y,16,16,C.ink);rect(ctx,x+1,y+1,14,14,a[2]);rect(ctx,x+2,y+2,12,13,a[0]);rect(ctx,x+2,y+2,12,1,a[1]);rect(ctx,x+2,y+2,1,13,a[1]);
      for(let i=5;i<14;i+=4)rect(ctx,x+i,y+3,1,11,a[2]);rect(ctx,x+7,y+3,2,11,a[2]);line(ctx,x+2,y+5,12,a[2]);line(ctx,x+2,y+12,12,a[2]);
      rect(ctx,x+5,y+7,6,4,C.ink);rect(ctx,x+6,y+8,4,2,a[1]);rect(ctx,x+7,y+6,2,2,C.goldLight);rect(ctx,x+7,y+8,1,2,a[2]);
      for(const [px,py]of [[3,4],[12,4],[3,13],[12,13]])rect(ctx,x+px,y+py,1,1,a[1]);
      line(ctx,x,y,16,a[1]);line(ctx,x,y+15,16,a[2]);
    }
    stairs(ctx,x,y,up){
      rect(ctx,x+1,y+1,14,14,C.ink);const t=this.theme;
      for(let i=0;i<5;i++){const yy=up?y+12-i*2:y+3+i*2;rect(ctx,x+2+i,y+2+i,12-i*2,1,t.light);rect(ctx,x+2,yy,12,2,i%2?t.wall:t.light);line(ctx,x+2,yy+1,12,t.edge);}
      const col=up?C.goldLight:C.jade;rect(ctx,x+7,y+4,2,7,col);rect(ctx,x+6,y+(up?5:9),4,1,col);rect(ctx,x+5,y+(up?6:8),6,1,col);
      rect(ctx,x,y+14,16,2,t.wall);line(ctx,x,y+14,16,t.moss);
    }
    altar(ctx,x,y){
      const pulse=this.reduced?1:(Math.sin(this.t/650)+1)/2;
      ctx.globalAlpha=.15+pulse*.1;rect(ctx,x+1,y+1,14,14,C.jade);ctx.globalAlpha=1;
      rect(ctx,x+3,y+12,10,2,'#213c40');rect(ctx,x+4,y+11,8,1,C.jadeDark);rect(ctx,x+5,y+10,6,1,C.jade);rect(ctx,x+7,y+5,2,5,C.jadeDark);
      rect(ctx,x+3,y+7,3,3,C.jadeDark);rect(ctx,x+10,y+7,3,3,C.jadeDark);rect(ctx,x+4,y+6,2,3,C.jade);rect(ctx,x+10,y+6,2,3,C.jade);
      rect(ctx,x+6,y+4,4,5,C.jade);rect(ctx,x+7,y+3,2,4,'#d2e6bc');rect(ctx,x+2,y+9,3,1,'#b5d2b0');rect(ctx,x+11,y+9,3,1,'#b5d2b0');
      if(pulse>.65){rect(ctx,x+3,y+3,1,1,C.goldLight);rect(ctx,x+12,y+4,1,1,C.jade);}
    }
    relic(ctx,x,y,id){
      const shift=this.reduced?0:Math.round(Math.sin(this.t/650+id)*1);shadow(ctx,x,y,12);
      const cols=[C.jade,C.blue,C.purple,C.redLight,C.goldLight];const col=cols[id]||C.goldLight;
      ctx.globalAlpha=.12;rect(ctx,x+1,y,14,13,col);ctx.globalAlpha=.15;rect(ctx,x+3,y+2,10,9,col);ctx.globalAlpha=1;
      rect(ctx,x+3,y+12,10,2,C.goldDark);rect(ctx,x+4,y+11,8,1,C.gold);rect(ctx,x+5,y+10,6,1,C.goldLight);
      y+=shift;rect(ctx,x+7,y+1,2,1,C.ink);rect(ctx,x+5,y+2,6,1,C.ink);rect(ctx,x+4,y+3,8,5,C.ink);rect(ctx,x+5,y+8,6,1,C.ink);rect(ctx,x+7,y+9,2,1,C.ink);
      rect(ctx,x+7,y+2,2,1,C.goldLight);rect(ctx,x+5,y+3,6,4,col);rect(ctx,x+6,y+7,4,1,C.gold);rect(ctx,x+6,y+3,2,3,'#fff3c5');rect(ctx,x+8,y+6,2,1,C.jadeDark);
      if(!this.reduced){let a=this.t/800+id;for(let i=0;i<4;i++){const xx=Math.round(x+8+Math.cos(a+i*Math.PI/2)*7),yy=Math.round(y+5+Math.sin(a+i*Math.PI/2)*5);rect(ctx,xx,yy,1,1,i%2?col:C.goldLight);}}
    }
    monument(ctx,x,y){
      shadow(ctx,x,y,12);rect(ctx,x+3,y+1,10,12,C.ink);rect(ctx,x+4,y+1,8,11,'#5d6b65');rect(ctx,x+5,y+2,6,9,'#828b79');line(ctx,x+5,y+2,6,'#c5c2a0');
      for(let i=0;i<3;i++){rect(ctx,x+6,y+4+i*2,1,1,'#3d514f');rect(ctx,x+8,y+4+i*2,2,1,'#3d514f');}rect(ctx,x+2,y+12,12,2,'#384e4a');line(ctx,x+3,y+12,10,'#91a089');
    }
    gate(ctx,x,y,open){
      rect(ctx,x,y,2,16,'#35545b');rect(ctx,x+14,y,2,16,'#35545b');line(ctx,x,y,16,C.blue);
      if(open){rect(ctx,x+2,y+1,12,2,'#718e8c');rect(ctx,x+1,y+3,2,2,C.jade);rect(ctx,x+13,y+3,2,2,C.jade);return;}
      for(let i=3;i<14;i+=3){rect(ctx,x+i,y+3,2,12,'#627f83');rect(ctx,x+i,y+3,1,11,'#b1c3b2');rect(ctx,x+i,y+14,1,1,C.ink);}
      line(ctx,x+1,y+6,14,'#35545b');line(ctx,x+1,y+12,14,'#35545b');rect(ctx,x+6,y+6,4,4,C.ink);rect(ctx,x+7,y+7,2,2,C.blue);
    }
    seal(ctx,x,y,requires){
      const have=(this.s.relics?.length||0)>=(requires||0);
      if(have){for(const [dx,dy]of [[2,2],[12,2],[2,12],[12,12]]){rect(ctx,x+dx,y+dy,2,2,C.goldDark);rect(ctx,x+dx,y+dy,1,1,C.goldLight);}line(ctx,x+5,y+8,6,C.goldDark);rect(ctx,x+7,y+6,2,4,C.goldLight);return;}
      rect(ctx,x+1,y+1,14,14,C.ink);rect(ctx,x+2,y+2,12,12,'#4f3e50');
      for(let i=0;i<4;i++){rect(ctx,x+3+i*3,y+3,1,10,C.goldDark);rect(ctx,x+3,y+3+i*3,10,1,C.goldDark);}
      rect(ctx,x+6,y+2,4,11,'#d4bd84');rect(ctx,x+7,y+3,2,1,'#904748');rect(ctx,x+7,y+5,1,5,'#904748');rect(ctx,x+6,y+7,4,1,'#904748');
    }
    chest(ctx,x,y,requires){
      shadow(ctx,x,y,12);rect(ctx,x+2,y+5,12,8,C.ink);rect(ctx,x+3,y+4,10,2,C.goldDark);rect(ctx,x+3,y+6,10,6,'#855b3d');line(ctx,x+3,y+5,10,C.goldLight);line(ctx,x+3,y+8,10,C.ink);rect(ctx,x+4,y+5,1,7,C.gold);rect(ctx,x+11,y+5,1,7,C.gold);rect(ctx,x+7,y+7,2,3,C.goldLight);rect(ctx,x+7,y+8,1,1,C.goldDark);
      if(requires&&(this.s.relics?.length||0)<requires){ctx.globalAlpha=.55;rect(ctx,x+5,y+3,6,9,C.purple);ctx.globalAlpha=1;rect(ctx,x+7,y+2,2,2,C.white);}
    }
    finale(ctx,x,y){
      const pulse=this.reduced ? .6 : (Math.sin(this.t/700)+1)/2;
      ctx.globalAlpha=.1+pulse*.1;rect(ctx,x-5,y-5,26,26,C.goldLight);ctx.globalAlpha=1;
      rect(ctx,x,y+12,16,2,C.goldDark);line(ctx,x+1,y+11,14,C.gold);rect(ctx,x+2,y+10,12,1,C.goldLight);
      for(let i=0;i<5;i++){const xx=x+i*3,yy=y+6-Math.abs(i-2);rect(ctx,xx,yy,4,4,C.goldDark);rect(ctx,xx+1,yy,2,3,i%2?C.jade:C.goldLight);}
      rect(ctx,x+6,y+1,4,7,C.gold);rect(ctx,x+7,y,2,6,C.goldLight);rect(ctx,x+7,y+3,2,1,'#fff4d2');
    }
    enemy(ctx,x,y,id){
      const e=this.data().enemies[id]||{},name=(e.name||'')+' '+id,trait=e.trait||'normal';shadow(ctx,x,y,12);
      const bob=this.reduced?0:Math.round(Math.sin(this.t/600+x)*.6);
      if(trait==='boss'||/boss|无相|塔心|心猿|魔君/.test(name)){this.boss(ctx,x,y+bob);return;}
      if(/dragon|龙|蛟/.test(name)){this.dragon(ctx,x,y+bob);return;}
      if(trait==='magic'||/ghost|魂|鬼|灯|魇|影|狐/.test(name)){this.ghost(ctx,x,y+bob,trait==='magic');return;}
      if(trait==='armor'||/guard|甲|卫|金刚|石|铁/.test(name)){this.guard(ctx,x,y,trait==='armor');return;}
      if(trait==='venom'||/spider|蛛|蝎|蛇|毒/.test(name)){this.spider(ctx,x,y);return;}
      if(trait==='counter'||/yaksha|罗刹|夜叉|修罗|刃/.test(name)){this.yaksha(ctx,x,y+bob);return;}
      if(/monk|僧|沙弥|禅|罗汉/.test(name)){this.monk(ctx,x,y);return;}
      this.imp(ctx,x,y+bob,trait==='first');
    }
    imp(ctx,x,y,first){
      const body=first?'#ad6d54':'#749f85',dark=first?'#6e4352':'#3b675d',light=first?'#e4aa75':'#b6ce9d';
      rect(ctx,x+4,y+5,8,8,C.ink);rect(ctx,x+5,y+6,6,6,body);rect(ctx,x+4,y+11,3,3,dark);rect(ctx,x+9,y+11,3,3,dark);
      rect(ctx,x+3,y+1,10,6,C.ink);rect(ctx,x+4,y+1,8,5,body);rect(ctx,x+2,y+2,2,3,body);rect(ctx,x+12,y+2,2,3,body);rect(ctx,x+3,y-1,2,3,dark);rect(ctx,x+11,y-1,2,3,dark);
      rect(ctx,x+5,y+2,2,1,light);rect(ctx,x+9,y+2,2,1,light);rect(ctx,x+5,y+3,1,1,C.ink);rect(ctx,x+10,y+3,1,1,C.ink);rect(ctx,x+7,y+5,2,1,light);
      rect(ctx,x+4,y+8,8,2,'#7d5145');rect(ctx,x+7,y+8,2,2,C.gold);rect(ctx,x+12,y+6,1,7,'#a69e7d');rect(ctx,x+11,y+4,3,3,'#899e9a');rect(ctx,x+12,y+3,1,2,C.white);
    }
    monk(ctx,x,y){
      rect(ctx,x+3,y+6,10,7,C.ink);rect(ctx,x+4,y+7,8,6,'#906944');rect(ctx,x+4,y+8,3,4,'#c49a5d');rect(ctx,x+8,y+8,3,5,'#a97843');
      rect(ctx,x+5,y+1,6,6,C.ink);rect(ctx,x+5,y+1,6,5,'#c0a179');rect(ctx,x+6,y,4,1,'#c0a179');rect(ctx,x+6,y+3,1,1,C.red);rect(ctx,x+9,y+3,1,1,C.red);rect(ctx,x+7,y+5,2,1,'#745546');
      rect(ctx,x+4,y+6,8,1,'#413e3e');for(let i=4;i<12;i+=2)rect(ctx,x+i,y+6,1,1,C.gold);
      rect(ctx,x+3,y+12,10,2,'#735344');rect(ctx,x+2,y+5,1,9,C.goldDark);rect(ctx,x+1,y+3,3,3,C.gold);rect(ctx,x+2,y+4,1,1,C.ink);
    }
    ghost(ctx,x,y,magic){
      const color=magic?'#95b6ce':'#a6a2c1',dark=magic?'#4f758f':'#655e8b',light=magic?'#dae4d7':'#d8cce0';
      ctx.globalAlpha=.18;rect(ctx,x+1,y,14,13,color);ctx.globalAlpha=1;
      rect(ctx,x+5,y+1,6,1,C.ink);rect(ctx,x+3,y+2,10,9,C.ink);rect(ctx,x+4,y+2,8,9,dark);rect(ctx,x+5,y+2,6,7,color);rect(ctx,x+6,y+3,4,3,light);
      rect(ctx,x+6,y+4,1,2,C.ink);rect(ctx,x+9,y+4,1,2,C.ink);rect(ctx,x+7,y+7,2,1,dark);rect(ctx,x+3,y+8,2,4,dark);rect(ctx,x+11,y+8,2,4,dark);
      rect(ctx,x+4,y+10,8,2,color);rect(ctx,x+3,y+12,3,1,color);rect(ctx,x+7,y+12,3,2,dark);rect(ctx,x+11,y+11,2,2,color);
      rect(ctx,x+1,y+7,2,3,magic?C.blue:C.purple);rect(ctx,x+13,y+7,2,3,magic?C.blue:C.purple);rect(ctx,x+1,y+6,1,1,light);
    }
    guard(ctx,x,y,armor){
      const a=armor?'#94a69f':'#be9c69',b=armor?'#4f6a70':'#775d4a',l=armor?'#cad0b1':'#e6c78b';
      rect(ctx,x+4,y+4,9,10,C.ink);rect(ctx,x+5,y+6,7,6,a);rect(ctx,x+5,y+8,7,1,b);rect(ctx,x+7,y+6,2,6,b);rect(ctx,x+5,y+12,2,2,b);rect(ctx,x+10,y+12,2,2,b);
      rect(ctx,x+4,y,9,6,C.ink);rect(ctx,x+5,y,7,5,b);rect(ctx,x+6,y-1,5,1,a);rect(ctx,x+5,y+1,7,2,a);rect(ctx,x+6,y+3,5,1,C.ink);rect(ctx,x+7,y+3,1,1,C.redLight);rect(ctx,x+10,y+3,1,1,C.redLight);rect(ctx,x+8,y+4,2,1,l);
      rect(ctx,x+1,y+5,5,8,C.ink);rect(ctx,x+2,y+6,3,6,b);rect(ctx,x+3,y+6,1,5,a);rect(ctx,x+2,y+7,3,1,l);rect(ctx,x+13,y+1,1,12,C.goldDark);rect(ctx,x+12,y,3,5,a);rect(ctx,x+13,y-1,1,2,l);
    }
    spider(ctx,x,y){
      const phase=Math.floor(this.t/350)%2;
      for(let i=0;i<3;i++){const yy=y+4+i*3;rect(ctx,x+1,y+3+i*3,3,1,'#996075');rect(ctx,x+3,yy,3,1,'#bd8690');rect(ctx,x+11,yy,3,1,'#bd8690');rect(ctx,x+13,yy+((i+phase)%2?1:-1),2,1,'#996075');}
      rect(ctx,x+4,y+2,8,9,C.ink);rect(ctx,x+5,y+2,6,7,'#84607d');rect(ctx,x+6,y+3,4,2,'#bc8794');rect(ctx,x+5,y+8,6,4,'#533c5b');rect(ctx,x+6,y+8,1,1,C.redLight);rect(ctx,x+9,y+8,1,1,C.redLight);rect(ctx,x+6,y+11,1,2,C.white);rect(ctx,x+9,y+11,1,2,C.white);
      rect(ctx,x+7,y+5,2,2,'#bfc484');
    }
    yaksha(ctx,x,y){
      rect(ctx,x+4,y+5,8,8,C.ink);rect(ctx,x+5,y+6,6,6,'#a35a66');rect(ctx,x+5,y+10,6,2,'#65455d');rect(ctx,x+7,y+8,2,3,C.gold);rect(ctx,x+4,y+12,3,2,'#5e4b5d');rect(ctx,x+9,y+12,3,2,'#5e4b5d');
      rect(ctx,x+4,y,8,6,C.ink);rect(ctx,x+5,y,6,5,'#b4777c');rect(ctx,x+3,y-3,2,5,C.goldDark);rect(ctx,x+11,y-3,2,5,C.goldDark);rect(ctx,x+3,y-3,1,2,C.goldLight);rect(ctx,x+12,y-3,1,2,C.goldLight);
      rect(ctx,x+5,y+2,2,1,C.goldLight);rect(ctx,x+9,y+2,2,1,C.goldLight);rect(ctx,x+6,y+4,1,2,C.white);rect(ctx,x+9,y+4,1,2,C.white);
      rect(ctx,x+1,y+3,2,9,'#839a9e');rect(ctx,x,y+3,1,6,C.white);rect(ctx,x+1,y+10,2,4,C.goldDark);rect(ctx,x+13,y+3,2,9,'#839a9e');rect(ctx,x+14,y+3,1,6,C.white);rect(ctx,x+13,y+10,2,4,C.goldDark);
    }
    dragon(ctx,x,y){
      rect(ctx,x+4,y+4,8,8,C.ink);rect(ctx,x+5,y+5,6,7,'#538f8d');rect(ctx,x+6,y+5,3,6,'#a4c1a2');rect(ctx,x+3,y+10,2,3,'#538f8d');rect(ctx,x+11,y+10,2,3,'#538f8d');rect(ctx,x+2,y+13,4,1,C.goldDark);rect(ctx,x+10,y+13,4,1,C.goldDark);
      rect(ctx,x+2,y,12,7,C.ink);rect(ctx,x+3,y+1,10,5,'#538f8d');rect(ctx,x+5,y+2,6,5,'#76aca3');rect(ctx,x+3,y-2,2,4,C.goldDark);rect(ctx,x+11,y-2,2,4,C.goldDark);rect(ctx,x+2,y-3,2,2,C.goldLight);rect(ctx,x+12,y-3,2,2,C.goldLight);
      rect(ctx,x+4,y+2,2,1,C.goldLight);rect(ctx,x+10,y+2,2,1,C.goldLight);rect(ctx,x+6,y+4,4,2,'#d6d2ab');rect(ctx,x+7,y+4,1,1,C.ink);rect(ctx,x+9,y+4,1,1,C.ink);rect(ctx,x+1,y+5,3,1,C.goldLight);rect(ctx,x+12,y+5,3,1,C.goldLight);rect(ctx,x+1,y+4,1,3,C.goldLight);rect(ctx,x+14,y+4,1,3,C.goldLight);
      rect(ctx,x+1,y+9,3,1,'#6ba59d');rect(ctx,x,y+8,2,1,'#6ba59d');rect(ctx,x,y+6,1,2,'#6ba59d');
    }
    selection(ctx){
      const sel=this.hover||this.engine.selection;if(!sel||sel.x<0||sel.y<0||sel.x>=(this.floor.map[0]?.length||13)||sel.y>=this.floor.map.length)return;
      const x=sel.x*16,y=sel.y*16;const c=this.engine.mode==='walk'?C.goldLight:C.jade;
      if(this.material){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=.45;ctx.globalAlpha=.9;ctx.strokeRect(x+.8,y+.8,14.4,14.4);ctx.restore();return;}
      ctx.globalAlpha=.9;for(const[a,b,sx,sy]of[[1,1,1,1],[14,1,-1,1],[1,14,1,-1],[14,14,-1,-1]]){rect(ctx,x+a,y+b,sx===1?4:-3,1,c);rect(ctx,x+a,y+b,1,sy===1?4:-3,c);}ctx.globalAlpha=1;
    }
    labels(ctx,entities){
      this.labelBounds=[];
      if(this.engine.mode!=='inspect'&&!this.s.settings?.showDamage)return;
      const v=this.projection(),scale=v.cellSize,fontSize=clamp(Math.round(scale*.3),11,15);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${fontSize}px ui-monospace, monospace`;
      const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
      const occupied=entities.map(e=>this.anchorFor(e.x,e.y)).filter(a=>a.ready&&a.visible),placed=[];
      for(const e of entities){if(e.type!=='enemy'||e.x<v.x||e.x>=v.x+v.w||e.y<v.y||e.y>=v.y+v.h)continue;let p;try{p=this.engine.preview(e.enemy);}catch(_){continue;}if(!p)continue;
        const text=p.possible===false?(this.overview?'×':'破防不足'):`−${p.damage??'?'}`,width=Math.max(this.overview?18:27,ctx.measureText(text).width+7),height=fontSize+3,anchor=this.anchorFor(e.x,e.y),body=anchor.bounds;
        const centers=this.smoothing()&&anchor.ready?[[body.x+body.w/2,body.y-height/2-3],[body.x+body.w+width/2+4,body.y+height/2],[body.x-width/2-4,body.y+height/2]]:[[v.offsetX+(e.x-v.x+.5)*scale,v.offsetY+(e.y-v.y+.91)*scale]];
        const candidates=centers.map(([cx,cy],index)=>{const box={x:clamp(cx-width/2,3,v.cssWidth-width-3),y:clamp(cy-height/2,3,v.cssHeight-height-3),w:width,h:height};const score=occupied.reduce((sum,a)=>sum+overlap(box,a.bounds)+overlap(box,a.footprint||{x:a.foot.x-scale*.3,y:a.foot.y-scale*.12,w:scale*.6,h:scale*.24})*8,0)+placed.reduce((sum,b)=>sum+overlap(box,b)*4,0);return {...box,score,index};});
        candidates.sort((a,b)=>a.score-b.score||a.index-b.index);const box=candidates[0],x=box.x+width/2,y=box.y+height/2;
        placed.push(box);this.labelBounds.push({entityId:e.id,x:box.x,y:box.y,w:width,h:height,groundOverlap:anchor.footprint?overlap(box,anchor.footprint):0,position:box.index});
        ctx.fillStyle='#0d1720';ctx.fillRect(Math.round(box.x),Math.round(box.y),width,height);ctx.fillStyle=p.possible===false?'#d99998':p.damage===0?'#b0ddac':(p.damage||0)>=(this.s.hp||1)?'#ff8c83':'#e4c486';ctx.fillText(text,x,y+1);
      }
    }
  }
  // Presentation consumes settled engine events. It never changes simulation state.
  const oldEnemy=TowerRenderer.prototype.enemy;
  function pixelLine(ctx,x1,y1,x2,y2,color,width=1){
    const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);
    for(let i=0;i<=steps;i++)rect(ctx,x1+(x2-x1)*i/steps,y1+(y2-y1)*i/steps,width,width,color);
  }
  function staffLine(ctx,x1,y1,x2,y2){
    if((window.TowerAssets?.style||window.TowerStyle?.get?.())==='material'){
      ctx.save();ctx.lineCap='round';ctx.strokeStyle='#2a2118';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle='#a06b36';ctx.lineWidth=1;ctx.stroke();
      const distance=Math.hypot(x2-x1,y2-y1)||1;ctx.strokeStyle='#e6c178';ctx.lineWidth=1.5;for(const range of [[0,Math.min(.18,3/distance)],[Math.max(.82,1-3/distance),1]]){ctx.beginPath();ctx.moveTo(x1+(x2-x1)*range[0],y1+(y2-y1)*range[0]);ctx.lineTo(x1+(x2-x1)*range[1],y1+(y2-y1)*range[1]);ctx.stroke();}ctx.restore();return;
    }
    pixelLine(ctx,x1,y1,x2,y2,C.ink,3);pixelLine(ctx,x1,y1,x2,y2,'#a04d40',2);
    for(const f of [0,.08,.92,1])rect(ctx,x1+(x2-x1)*f,y1+(y2-y1)*f,2,2,C.goldLight);
  }
  function octagon(ctx,x,y,r,col,alpha=1){
    ctx.globalAlpha=alpha;
    for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;pixelLine(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(b)*r,y+Math.sin(b)*r,col);}
    ctx.globalAlpha=1;
  }
  function pixelPolygon(ctx,points,color){
    const lo=Math.floor(Math.min(...points.map(p=>p[1]))),hi=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let y=lo;y<=hi;y++){
      const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
      xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)rect(ctx,Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,color);
    }
  }
  const realmOf=s=>Math.min(5,Math.floor((s?.floor||0)/3));
  Object.assign(TowerRenderer.prototype,{
    motionMode(){
      const mode=this.engine.state?.settings?.motion;
      if(!this.motionQuery&&window.matchMedia)this.motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
      if(this.motionQuery?.matches)return 'reduced';
      if(mode==='reduced'||mode==='simple')return mode;
      if(mode==='standard')return 'standard';
      return 'standard';
    },
    asset(ctx,id,x,y,w=16,h=16,frame=0){
      const assets=window.TowerAssets;if(!assets?.ready||typeof assets.draw!=='function')return false;
      try{return assets.draw(ctx,id,x,y,w,h,frame)===true;}catch(_){return false;}
    },
    anyAsset(ctx,ids,x,y,w=16,h=16,frame=0){for(const id of ids)if(this.asset(ctx,id,x,y,w,h,frame))return true;return false;},
    texture(ctx,id,cellX,cellY,frame=0){
      const meta=window.TowerAssets?.get?.(id);if(!meta||!window.TowerAssets?.ready)return false;
      const w=meta.tileCells?meta.tileCells*CELL:(meta.sourceW||192)*(meta.logicalScale??1)/NATIVE,h=meta.tileCells?meta.tileCells*CELL:(meta.sourceH||192)*(meta.logicalScale??1)/NATIVE,x=cellX*CELL,y=cellY*CELL;
      ctx.save();ctx.beginPath();ctx.rect(x,y,CELL,CELL);ctx.clip();const ok=this.asset(ctx,id,Math.floor(x/w)*w,Math.floor(y/h)*h,w,h,frame);ctx.restore();return ok;
    },
    renderProfile(entity=this.currentEntity,id=''){
      const e=entity||{},kind=id||(e.type==='player'?'actor_wukong_'+(this.engine.state?.facing||'up'):e.type==='enemy'?'enemy_'+e.enemy:e.type==='chest'||e.type==='cache'?'prop_chest':e.type==='stairs'?'prop_stairs_'+(e.to>(this.engine.state?.floor||0)?'up':'down'):e.type==='item'?'item_'+e.item:e.type==='treasure'?'treasure_'+e.treasure:'prop_'+(e.type||''));
      const p={groundX:8,groundY:16,contactWidth:10,contactDepth:3.6,elevation:0,depthOffset:0,scale:1,shadowWidth:7,shadowDepth:2.1,sourceContact:null};
      if(kind==='prop_chest'&&!this.card)Object.assign(p,{sourceContact:window.TowerAssets?.get?.(kind)?.anchor||null,groundY:this.smoothing()?12.5:14.5,contactWidth:13.6,contactDepth:5.5,shadowWidth:7.1,shadowDepth:2.3});
      if(this.card||!this.smoothing())return p;
      // A source's lowest painted pixel is not its ground plane. Register the
      // projected base separately, preserving complete lids, wings and weapons.
      p.groundY=12.5;
      if(/^actor_/.test(kind)){p.groundY=12.8;p.contactWidth=9.8;p.shadowWidth=6.8;}
      else if(/^npc_/.test(kind)||e.type==='npc'||e.type==='rescue'){p.groundY=12.8;p.contactWidth=9;p.shadowWidth=6.2;}
      else if(/^item_|^treasure_/.test(kind)){p.groundY=11.8;p.contactWidth=7;p.contactDepth=3;p.shadowWidth=4.2;p.shadowDepth=1.3;}
      if(kind==='prop_chest')Object.assign(p,{sourceContact:window.TowerAssets?.get?.(kind)?.anchor||null,groundY:12.5,contactWidth:13.6,contactDepth:5.5,shadowWidth:7.1,shadowDepth:2.3});
      else if(/^prop_gate/.test(kind)||kind==='prop_bars')Object.assign(p,{sourceContact:{x:22,y:54},groundY:11.8,contactWidth:12,contactDepth:3.6,shadowWidth:6.6,shadowDepth:1.7});
      else if(/^prop_door_/.test(kind))Object.assign(p,{sourceContact:{x:32,y:55},groundY:12.2,contactWidth:12,contactDepth:4.2});
      else if(/^prop_stairs_/.test(kind))Object.assign(p,{sourceContact:{x:36,y:51},groundY:10.7,contactWidth:14,contactDepth:9,shadowWidth:7,shadowDepth:3});
      else if(kind==='prop_altar')Object.assign(p,{sourceContact:{x:34,y:51},groundY:10.5,contactWidth:14,contactDepth:6,shadowWidth:7.3,shadowDepth:2.7});
      else if(kind==='prop_choice'||kind==='prop_resonator')Object.assign(p,{contactWidth:14.8,contactDepth:6,shadowWidth:8.1,shadowDepth:2.7});
      const enemy=e.type==='enemy'?this.data().enemies[e.enemy]:null;
      if(kind==='enemy_bat')Object.assign(p,{groundY:12.5,elevation:2.8,contactWidth:8,contactDepth:3,shadowWidth:5.4,shadowDepth:1.7});
      else if(enemy?.trait==='magic')Object.assign(p,{elevation:1.1,contactWidth:8,contactDepth:3,shadowWidth:5.6,shadowDepth:1.7});
      else if(enemy?.trait==='boss'||/^enemy_boss/.test(kind))Object.assign(p,{groundY:12.3,contactWidth:12.6,contactDepth:4.2,shadowWidth:7.5,shadowDepth:2.4});
      const meta=window.TowerAssets?.get?.(kind),registration=meta?.nativeRegistration;
      if(meta?.groundContact)p.sourceContact=meta.groundContact;
      else if(p.sourceContact&&registration)p.sourceContact={x:(p.sourceContact.x-registration.offset[0])/registration.scale,y:(p.sourceContact.y-registration.offset[1])/registration.scale};
      return p;
    },
    entityDepth(entity){const p=this.renderProfile(entity);return (entity.y||0)*CELL+p.groundY+p.depthOffset;},
    groundShadow(ctx,x,y,id,width=10,point=null){const p=this.renderProfile(this.currentEntity,id);shadow(ctx,x,y,width,point?{...p,groundX:point.x-x,groundY:point.y-y}:p);},
    sprite(ctx,id,footX,footY,frame=0,scale=1,offset={}){
      const meta=window.TowerAssets?.get?.(id);if(!meta||!window.TowerAssets?.ready)return false;
      const profile=this.renderProfile(this.currentEntity,id);footX+=profile.groundX-8;footY+=profile.groundY-16;
      scale*=this.spriteScale(id)*(meta.logicalScale??1)*profile.scale;
      const w=(meta.sourceW||64)/NATIVE*scale,h=(meta.sourceH||96)/NATIVE*scale,anchor=profile.sourceContact||meta.anchor||{x:32,y:88};
      const ax=(Array.isArray(anchor)?anchor[0]:anchor.x)??32,ay=(Array.isArray(anchor)?anchor[1]:anchor.y)??88;
      const left=footX-ax/NATIVE*scale+(offset.x||0),top=footY-profile.elevation-ay/NATIVE*scale+(offset.y||0),bounds=meta.frameBounds?.[clamp(Math.floor(frame),0,(meta.frames||1)-1)]||meta.contentBounds||[0,0,meta.sourceW,meta.sourceH];
      if(this.currentEntity&&this.actorAnchors){const key=`${this.s.floor}:${this.currentEntity.x}:${this.currentEntity.y}`,priority=/^(actor|enemy|npc)_/.test(id)?2:1,old=this.actorAnchors.get(key);if(!old||priority>=old.priority)this.actorAnchors.set(key,{footX,footY,left:left+bounds[0]/NATIVE*scale,top:top+bounds[1]/NATIVE*scale,width:(bounds[2]-bounds[0])/NATIVE*scale,height:(bounds[3]-bounds[1])/NATIVE*scale,footprint:{x:footX-profile.contactWidth/2,y:footY-profile.contactDepth/2,w:profile.contactWidth,h:profile.contactDepth},elevation:profile.elevation,depth:footY+profile.depthOffset,sourceContact:{x:ax,y:ay},scale,priority,id});}
      if(this.material&&ctx===this.ctx&&this.renderViewport){const v=this.renderViewport,bx=left+bounds[0]/NATIVE*scale,by=top+bounds[1]/NATIVE*scale,bw=(bounds[2]-bounds[0])/NATIVE*scale,bh=(bounds[3]-bounds[1])/NATIVE*scale;if(bx+bw<v.x*CELL-.2||bx>(v.x+v.w)*CELL+.2||by+bh<v.y*CELL-.2||by>(v.y+v.h)*CELL+.2)return true;}
      if(this.material&&!this.card&&profile.elevation<.5&&this.currentEntity&&!/^(fx_|prop_(stairs|plate|portal|gate_open))/.test(id))this.projectSpriteShadow(ctx,id,footX,footY,left,top,w,h,frame);
      const separated=this.material&&!this.card&&/^(actor|enemy|npc)_/.test(id);if(separated){ctx.save();ctx.filter='saturate(.94) brightness(.98)';}
      const ok=this.asset(ctx,id,left,top,w,h,frame);if(separated)ctx.restore();return ok;
    },
    projectSpriteShadow(ctx,id,footX,footY,left,top,w,h,frame){
      const e=this.currentEntity;ctx.save();ctx.beginPath();
      for(let yy=e.y-1;yy<=e.y+2;yy++)for(let xx=e.x-1;xx<=e.x+2;xx++)if(!['#','v','~','w',undefined].includes(this.tile(xx,yy)))ctx.rect(xx*CELL,yy*CELL,CELL,CELL);
      ctx.clip();ctx.translate(footX,footY);ctx.transform(1,0,-.38,-.17,0,0);ctx.globalAlpha*=.23;ctx.globalCompositeOperation='multiply';ctx.filter='brightness(0)';this.asset(ctx,id,left-footX,top-footY,w,h,frame);ctx.restore();
    },
    spriteScale(id){return !this.card&&this.smoothing()?(id.startsWith('actor_')?1.5:id.startsWith('enemy_')||id.startsWith('npc_')?1.25:id.startsWith('item_')?.76:id.startsWith('treasure_')?.86:1):1;},
    landmarkArt(ctx,id,x,y,w,h,type){
      const meta=window.TowerAssets?.get?.(id);if(!meta?.image||!window.TowerAssets?.ready)return null;
      const bounds=meta.contentBounds||[0,0,meta.sourceW,meta.sourceH],bx=Array.isArray(bounds)?bounds[0]:bounds.x,by=Array.isArray(bounds)?bounds[1]:bounds.y;
      const bw=Array.isArray(bounds)?bounds[2]-bx:(bounds.w||bounds.width),bh=Array.isArray(bounds)?bounds[3]-by:(bounds.h||bounds.height);if(!(bw>0&&bh>0))return null;
      // Murals are installed behind the gilt frame; their ornamental edges can
      // crop. Freestanding towers/dragon/furnace retain their full silhouette.
      const cover=type==='buddha'||type==='scripture',scale=cover?Math.max(w/bw,h/bh):Math.min(w/bw,h/bh),dw=bw*scale,dh=bh*scale,dx=x+(w-dw)/2,dy=cover?y+(h-dh)/2:y+h-dh;
      ctx.drawImage(meta.image,(meta.sx||0)+bx,(meta.sy||0)+by,bw,bh,dx,dy,dw,dh);
      return {x:dx,y:dy,scale,bx,by};
    },
    landmarkState(ctx,type,placement,x,y,w,h){
      if(type==='furnace'&&placement){
        const groups=[['furnace-shadow','furnace-latch'],['silk-a','silk-b'],['furnace-mercy','furnace-stop']],cores=this.material?[[46,232],[127,216],[211,247]]:[[52,181],[130,160],[213,180]];
        for(let i=0;i<3;i++)if(groups[i].every(id=>this.controlLit(id))){const xx=placement.x+(cores[i][0]-placement.bx)*placement.scale,yy=placement.y+(cores[i][1]-placement.by)*placement.scale,r=15*placement.scale;
          ctx.save();ctx.fillStyle='#225d60';ctx.beginPath();ctx.ellipse(xx,yy,r,r*1.15,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a2cdb1';ctx.lineWidth=1/3;ctx.stroke();rect(ctx,xx-1/3,yy-1,2/3,2,'#dcdfb5');ctx.restore();}
      }
      if(type==='pagoda'){const west=this.controlLit('west-tower'),east=this.controlLit('east-tower');for(const [active,f]of[[west,.25],[east,.75]]){if(active){rect(ctx,x+w*f-1,y+h-2,2,1,C.goldLight);rect(ctx,x+w*f-1/3,y+h-3,2/3,2,C.jade);}}if(west&&east)rect(ctx,x+w*.25,y+h-1/3,w*.5,1/3,C.goldLight);}
      if(this.purified){ctx.save();ctx.strokeStyle=C.goldLight;ctx.lineWidth=1/3;ctx.globalAlpha=this.material?.35:.8;if(this.material){ctx.beginPath();ctx.ellipse(x+w/2,y+h-1,w*.36,1.2,0,0,Math.PI*2);ctx.stroke();}else ctx.strokeRect(x+2/3,y+2/3,w-4/3,h-4/3);ctx.restore();}
    },
    skipEffects(){this.effects=[];this.floorFade=0;},
    extendedWorld(ctx,v,width,height){
      const key=JSON.stringify([v.cssWidth,v.cssHeight,this.pixelRatio,v.x,v.y,v.w,v.h,v.cellSize,v.offsetX,v.offsetY,this.styleId(),this.floor.theme,!!window.TowerAssets?.ready]);
      if(!this.extensionBuffer)this.extensionBuffer=document.createElement('canvas');
      if(this.extensionKey!==key){
        this.extensionKey=key;const bg=this.extensionBuffer;if(bg.width!==this.canvas.width)bg.width=this.canvas.width;if(bg.height!==this.canvas.height)bg.height=this.canvas.height;const c=bg.getContext('2d');c.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);c.imageSmoothingEnabled=this.material;c.globalAlpha=1;c.fillStyle=this.theme.void;c.fillRect(0,0,v.cssWidth,v.cssHeight);
        if(this.material){const distant=window.TowerAssets?.get?.('ui_backdrop');if(distant){const cover=Math.max(v.cssWidth/distant.sourceW,v.cssHeight/distant.sourceH),dw=distant.sourceW*cover,dh=distant.sourceH*cover;this.asset(c,'ui_backdrop',(v.cssWidth-dw)/2,(v.cssHeight-dh)/2,dw,dh);c.fillStyle='rgba(5,9,13,.61)';c.fillRect(0,0,v.cssWidth,v.cssHeight);}}
        c.save();c.translate(v.offsetX-v.x*v.cellSize,v.offsetY-v.y*v.cellSize);c.scale(v.cellSize/CELL,v.cellSize/CELL);
        const left=Math.floor(v.x-v.offsetX/v.cellSize)-1,right=Math.ceil(v.x+(v.cssWidth-v.offsetX)/v.cellSize)+1,top=Math.floor(v.y-v.offsetY/v.cellSize)-1,bottom=Math.ceil(v.y+(v.cssHeight-v.offsetY)/v.cellSize)+1;
        for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
          if(x>=0&&y>=0&&x<width&&y<height)continue;
          const distance=Math.max(0,-x,x-width+1,-y,y-height+1),px=x*CELL,py=y*CELL;
          if(this.material&&distance>2)continue;
          c.globalAlpha=this.material?(distance===1?.86:.25):1;rect(c,px,py,CELL,CELL,this.theme.edge);c.globalAlpha=this.material?(distance===1?.76:.18):clamp(.94-distance*.1,.25,.9);
          if(!this.texture(c,`wall_${this.floor.theme}`,x,y))rect(c,px,py,CELL,CELL,this.theme.wall);c.globalAlpha=1;
          // The map continues as an impassable temple foundation. Gilded
          // buttresses and dark vertical faces express height, not extra rooms.
          if(this.material)c.globalAlpha=distance===1?.65:.15;
          if((x+21)%4===0){rect(c,px,py,1,CELL,this.material?'#1e2225':this.theme.edge);rect(c,px+1,py,1/3,CELL,this.theme.light);}
          if((y+21)%4===0){rect(c,px,py,CELL,1/3,this.theme.light);rect(c,px,py+1,CELL,2/3,this.theme.edge);}c.globalAlpha=1;
        }c.restore();
        const gx=v.offsetX-v.x*v.cellSize,gy=v.offsetY-v.y*v.cellSize,gw=width*v.cellSize,gh=height*v.cellSize;
        c.save();c.strokeStyle=this.material?'#15191c':this.theme.edge;c.lineWidth=Math.max(2,v.cellSize*.12);c.strokeRect(gx,gy,gw,gh);c.strokeStyle=this.theme.light;c.lineWidth=Math.max(1,v.cellSize*.025);c.strokeRect(gx,gy,gw,gh);c.restore();
      }
      ctx.drawImage(this.extensionBuffer,0,0,v.cssWidth,v.cssHeight);
    },
    sceneAtmosphere(ctx,v){
      if(!this.material)return;const w=v.cssWidth,h=v.cssHeight;
      ctx.save();const vignette=ctx.createRadialGradient(w*.5,h*.51,Math.min(w,h)*.2,w*.5,h*.51,Math.max(w,h)*.68);vignette.addColorStop(0,'rgba(5,9,12,0)');vignette.addColorStop(.62,'rgba(5,9,12,.04)');vignette.addColorStop(1,'rgba(5,9,12,.38)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
      // Slow, extremely sparse edge mist. It never veils the decision grid or
      // signals a time limit; lower-motion modes keep its silhouette static.
      const drift=this.mode==='standard'?Math.sin(this.t/8500)*12:0;
      for(const side of [-1,1]){const x=side<0?Math.min(v.offsetX*.6,110):w-Math.min(v.offsetX*.6,110),fog=ctx.createRadialGradient(x,h*.62+drift,0,x,h*.62+drift,Math.min(w,h)*.4);fog.addColorStop(0,'rgba(146,164,164,.10)');fog.addColorStop(1,'rgba(146,164,164,0)');ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);}ctx.restore();
    },
    effect(type,x,y,text='',meta={}){
      if(type==='floor'){this.skipEffects();this.floorFade=performance.now();return;}
      if(type==='move')return;
      const now=performance.now(),s=this.engine.state||{},details={...(meta||{})};
      if(type==='magic'&&text==='一念成路'&&!details.targets){
        const floor=this.data().floors[s.floor],source=floor?.entities.find(e=>e.x===x&&e.y===y&&e.type==='choice'),selected=source&&this.data().choices?.[source.choice]?.options?.find(o=>o.id===s.choices?.[source.choice]),quests=Object.keys(selected?.reward?.quests||{});
        details.targets=(floor?.entities||[]).filter(e=>e.type==='gate'&&(e.requiresQuests||[]).some(q=>quests.includes(q))&&this.gateOpen(e)).map(e=>({x:e.x,y:e.y}));
      }
      const ability=details.ability||details.mode||(/分身归/.test(text)?'recall':/分身/.test(text)?'clone':null);
      const pace=this.motionMode()==='simple'?.65:1;
      const singleFragment=type==='relic'&&details.fragment!==undefined;
      const life=Math.round((singleFragment?650:['relic','selfAwaken','awakening'].includes(type)?2200:type==='attack'?(details.phases?.length?1800:760):type==='magic'?680:type==='door'?480:type==='pickup'?620:380)*pace);
      this.effects.push({kind:'event',type,x:x*16,y:y*16,fromX:(details.fromX??s.x??x)*16,fromY:(details.fromY??s.y??y)*16,meta:details,ability,start:now,life,text});
      if(text){const combat=type==='attack',tx=combat?(details.fromX??s.x??x):x,ty=combat?(details.fromY??s.y??y):y;
        this.effects.push({kind:'text',type,x:tx*16+8,y:ty*16-5,start:now+(combat?life*.48:0),life:Math.round((singleFragment?650:type==='relic'?2200:1100)*pace),text:combat?(details.damage===0?'无损':text+' 生命'):text,color:combat?(details.damage===0?C.jade:C.redLight):type==='hit'?C.redLight:type==='magic'?C.jade:C.goldLight});}
      if(type==='attack'&&details.victory)this.effects.push({kind:'text',type:'reward',x:x*16+8,y:y*16-5,start:now+life*.82,life:1050*pace,text:`破阵 · +${details.goldReward||0} 金`,color:C.goldLight});
    },
    draw(time=0){
      const s=this.engine.state||{},d=this.data();this.s=s;this.floor=d.floors[s.floor||0];
      if(this.planningHint&&(this.planningHint.floor!==s.floor||this.planningHint.turn!==s.turn||this.engine.selection?.x!==this.planningHint.enemy.x||this.engine.selection?.y!==this.planningHint.enemy.y))this.planningHint=null;
      const cw=this.cssWidth||624,ch=this.cssHeight||624;this.ctx.setTransform(this.pixelRatio||1,0,0,this.pixelRatio||1,0,0);
      if(!this.floor){this.ctx.fillStyle='#111b1e';this.ctx.fillRect(0,0,cw,ch);return;}
      this.mode=this.motionMode();this.calm=this.mode==='reduced';this.reduced=this.calm;this.t=this.calm?0:time;this.now=time;
      this.material=this.smoothing();this.realm=realmOf(s);this.purified=this.realm===5?!!s.selfAwakened:(s.relics||[]).includes(this.realm);const palette=this.material?MATERIAL_THEMES:THEMES;this.theme=palette[this.floor.theme]||palette.jade;
      this.updateCamera(time);
      const v={...this.camera};this.renderViewport=v;this.renderFloor=s.floor;this.actorAnchors.clear();
      if(this.lastFloor!==s.floor){this.lastFloor=s.floor;this.floorFade=time;}
      const width=this.floor.map[0]?.length||13,height=this.floor.map.length||13;
      const floorArt=window.TowerAssets?.get?.(`floor_${this.floor.theme}`),density=this.material&&floorArt?.tileCells?clamp(floorArt.sourceW/(floorArt.tileCells*CELL),NATIVE,8):NATIVE;this.cacheDensity=density;
      const boundaryRows=2,terrainWidth=width*CELL*density,terrainHeight=(height+boundaryRows)*CELL*density;this.boundaryRows=boundaryRows;
      if(!this.material&&(this.buffer.width!==terrainWidth||this.buffer.height!==terrainHeight)){this.buffer.width=terrainWidth;this.buffer.height=terrainHeight;}
      if(this.material&&this.buffer.width>1){this.buffer.width=this.buffer.height=1;}
      const ctx=this.p;if(!this.material){ctx.setTransform(density,0,0,density,0,0);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;ctx.fillStyle=this.theme.void;ctx.fillRect(0,0,width*CELL,height*CELL);}
      const casts=this.calm?[]:this.effects.filter(e=>e.kind==='event'&&e.type==='magic'&&time-e.start<e.life*.58),waterFrame=this.mode==='standard'&&this.floor.waterTiles?.length?Math.floor(this.t/450)%4:0;
      // Terrain stays at its source density between rule changes. The two
      // southern rows are existing '#' collision space for HUD protection;
      // dynamic actors/effects are never resampled through this cache.
      const terrainKey=JSON.stringify([s.floor,this.purified,this.styleId(),density,!!window.TowerAssets?.ready,this.overview,this.engine.mode==='walk',s.terrain,s.tides,s.revealed,s.switches,s.quests,waterFrame,casts.map(e=>[e.ability,e.x,e.y])]);
      if(terrainKey!==this.terrainKey||this.terrainBuffer.width!==terrainWidth||this.terrainBuffer.height!==terrainHeight){
        this.terrainKey=terrainKey;if(this.terrainBuffer.width!==terrainWidth)this.terrainBuffer.width=terrainWidth;if(this.terrainBuffer.height!==terrainHeight)this.terrainBuffer.height=terrainHeight;const ground=this.terrainBuffer.getContext('2d');ground.imageSmoothingEnabled=this.material;ground.setTransform(density,0,0,density,0,0);ground.fillStyle=this.theme.void;ground.fillRect(0,0,width*CELL,height*CELL);
        this.wallCommands=[];
        for(let y=0;y<height+boundaryRows;y++)for(let x=0;x<width;x++){const cast=casts.find(e=>e.x===x*16&&e.y===y*16),tile=cast?.ability==='staff'?'~':this.tile(x,y);if(tile==='#'){this.wall(ground,x,y);if(this.material&&!this.isLandmarkCell(x,y))this.wallCommands.push({x,y,depth:(y+1)*CELL,bounds:{x:x*CELL,y:y*CELL,w:CELL,h:CELL}});}else if(y<height){if(tile==='v')this.voidTile(ground,x,y);else if(tile==='~')this.gap(ground,x,y);else if(tile==='w')this.water(ground,x,y);else this.floorTile(ground,x,y);}}
        if(this.material)this.wallContactShadows(ground,this.wallCommands);
      }
      if(!this.material)ctx.drawImage(this.terrainBuffer,0,0,width*CELL,(height+boundaryRows)*CELL);
      const ents=(this.floor.entities||[]).filter(e=>!s.removed?.[e.id]).sort((a,b)=>a.y-b.y);
      if(!this.material)this.worldLayers(ctx,ents,time);
      this.ctx.imageSmoothingEnabled=this.material;this.ctx.imageSmoothingQuality='high';
      // Screen shake is opt-in and is disabled by both lower-motion modes.
      const hit=this.effects.find(e=>{if(e.kind!=='event'||e.type!=='attack')return false;const age=time-e.start,duration=e.life/(e.meta.phases?.length?Math.min(3,e.meta.phases.length):1),contact=(age%duration)/duration;return age>=0&&age<e.life&&contact>=.38&&contact<.46;});
      const shake=this.mode==='standard'&&s.settings?.screenShake&&hit?(Math.floor(time/25)%2?2:-2):0;
      const fillsScene=v.offsetX<.01&&v.offsetY<.01&&v.w*v.cellSize>=cw-.01&&v.h*v.cellSize>=ch-.01;
      if(!fillsScene)this.extendedWorld(this.ctx,v,width,height);else{if(shake){this.ctx.fillStyle=this.theme.void;this.ctx.fillRect(0,0,cw,ch);}if(this.extensionBuffer?.width>1){this.extensionBuffer.width=this.extensionBuffer.height=1;this.extensionKey='';}}
      this.ctx.drawImage(this.material?this.terrainBuffer:this.buffer,v.x*CELL*density,v.y*CELL*density,v.w*CELL*density,v.h*CELL*density,v.offsetX+shake,v.offsetY,v.w*v.cellSize,v.h*v.cellSize);
      if(this.material){
        // Draw the original HD frames directly at the final physical pixel
        // density. They never enter the 48px terrain cache or a resized atlas.
        this.ctx.save();this.ctx.beginPath();this.ctx.rect(v.offsetX,v.offsetY,v.w*v.cellSize,v.h*v.cellSize);this.ctx.clip();this.ctx.translate(v.offsetX+shake-v.x*v.cellSize,v.offsetY-v.y*v.cellSize);this.ctx.scale(v.cellSize/CELL,v.cellSize/CELL);this.worldLayers(this.ctx,ents,time);this.ctx.restore();
      }
      this.lastActorPass=this.material?'final-dpr':'pixel-cache';
      this.sceneAtmosphere(this.ctx,v);
      this.labels(this.ctx,ents);this.floatingText(this.ctx,time);
      if(this.mode==='standard'&&this.floorFade&&time-this.floorFade<280){this.ctx.fillStyle=`rgba(8,14,20,${.42*(1-(time-this.floorFade)/280)})`;this.ctx.fillRect(0,0,cw,ch);}
      const playerAnchor=this.actorAnchors.get(`${s.floor}:${s.x}:${s.y}`),selection=this.engine.selection,selectedAnchor=selection&&this.actorAnchors.get(`${s.floor}:${selection.x}:${selection.y}`),cameraKey=JSON.stringify([s.floor,v.x,v.y,v.w,v.h,v.cellSize,v.cssWidth,v.cssHeight,this.overview,playerAnchor?.footX,playerAnchor?.footY,selectedAnchor?.footX,selectedAnchor?.footY]);
      if(cameraKey!==this.lastCameraEvent){this.lastCameraEvent=cameraKey;window.dispatchEvent(new CustomEvent('tower-camera-change',{detail:{floor:s.floor,viewport:{...v,overview:this.overview}}}));}
    },
    worldLayers(ctx,entities,time){
      const s=this.s,width=this.floor.map[0].length,height=this.floor.map.length;
      this.installationAudit=[];this.groundingAudit=[];
      this.currentEntity=null;if(!this.material)this.decor(ctx);this.landmark(ctx);this.floorSigils(ctx);
      if(this.material)this.groundInstallations(ctx);
      this.journeyMarks(ctx);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(this.tile(x,y)==='=')this.bars(ctx,x*CELL,y*CELL);
      for(const e of this.effects)if(!this.calm&&e.kind==='event'&&e.type==='magic'&&e.ability==='morph'&&time-e.start<e.life*.58)this.bars(ctx,e.x,e.y);
      this.lightSources(ctx,entities);
      const actors=entities.map(e=>({foot:this.entityDepth(e),entity:e}));if(s.x!==undefined)actors.push({foot:this.playerMotion(time).footY,player:true});
      if(this.material)for(const wall of this.wallCommands||[])actors.push({foot:wall.depth,wall});actors.sort((a,b)=>a.foot-b.foot||(a.player?1:b.player?-1:0));
      this.depthQueueAudit=[];
      for(const actor of actors){
        this.depthQueueAudit.push({kind:actor.wall?'wall':actor.player?'player':'entity',id:actor.entity?.id||null,x:actor.wall?.x??actor.entity?.x??s.x,y:actor.wall?.y??actor.entity?.y??s.y,depth:actor.foot});
        if(actor.wall){this.currentEntity=null;this.wallForeground(ctx,actor.wall);continue;}
        this.currentEntity=actor.player?{x:s.x,y:s.y,type:'player'}:actor.entity;if(actor.player)this.player(ctx,s.x,s.y);else this.entity(ctx,actor.entity);
      }this.currentEntity=null;
      this.tacticalHints(ctx,entities);
      if(Array.isArray(this.engine.path)&&this.engine.path.length){let x=s.x,y=s.y;const dirs={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};for(const step of this.engine.path){if(typeof step==='string'){const direction=dirs[step];if(!direction)continue;x+=direction[0];y+=direction[1];}else{x=step.x;y=step.y;}if(Number.isFinite(x)&&Number.isFinite(y)){ctx.globalAlpha=.7;rect(ctx,x*CELL+7,y*CELL+7,2,2,C.jade);}}ctx.globalAlpha=1;}
      this.selection(ctx);this.ambient(ctx);this.drawParticles(ctx,time);
    },
    journeyMarks(ctx){
      const j=this.journey,t=j?.target,s=this.s;if(!t||j.floor!==s.floor||t.floor!==s.floor)return;
      const p=this.renderProfile(t),cx=t.x*CELL+p.groundX,cy=t.y*CELL+p.groundY;ctx.save();ctx.strokeStyle='#dfc385';ctx.lineWidth=this.material?.38:.55;ctx.globalAlpha=.8;
      // A single floor mark names the current purpose; it never becomes a prop.
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(cx+side*7,cy-2.4);ctx.lineTo(cx+side*7,cy+1.2);ctx.lineTo(cx+side*4.8,cy+2.1);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(cx,cy+1.1);ctx.lineTo(cx+.8,cy+1.9);ctx.lineTo(cx,cy+2.7);ctx.lineTo(cx-.8,cy+1.9);ctx.closePath();ctx.stroke();
      if(this.overview&&Array.isArray(j.path)&&j.path.length){let x=s.x,y=s.y;ctx.strokeStyle='#80c7b7';ctx.lineWidth=.45;ctx.globalAlpha=.75;ctx.beginPath();ctx.moveTo(x*CELL+8,y*CELL+12);for(const dir of j.path){const d={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[dir];if(!d)continue;x+=d[0];y+=d[1];ctx.lineTo(x*CELL+8,y*CELL+12);}ctx.stroke();}
      ctx.restore();
    },
    groundInstallations(ctx){
      // These are paved parts of real floor cells, never extra collision tiles.
      for(const e of this.floor.entities){
        if(!['altar','choice','resonator','chest','cache','monument','switch','tide','relic','stairs'].includes(e.type))continue;
        if(e.type==='stairs'&&e.to<this.s.floor)continue;
        if(['chest','cache','relic'].includes(e.type)&&this.s.removed?.[e.id])continue;
        const p=this.renderProfile(e),cx=e.x*CELL+p.groundX,cy=e.y*CELL+p.groundY,large=['altar','choice','resonator'].includes(e.type),hw=large?7.9:7.1,hd=Math.min(large?3.9:3.2,15.7-p.groundY,p.groundY-.3);
        const v=this.renderViewport;if(cx+hw<v.x*CELL||cx-hw>(v.x+v.w)*CELL||cy+hd<v.y*CELL||cy-hd>(v.y+v.h)*CELL)continue;
        if(['#','v','~','w',undefined].includes(this.tile(e.x,e.y)))continue;
        ctx.save();ctx.beginPath();ctx.rect(e.x*CELL,e.y*CELL,CELL,CELL);ctx.clip();
        const points=[[-hw+1.9,-hd],[hw-1.9,-hd],[hw,-hd+.95],[hw,hd-.95],[hw-1.9,hd],[-hw+1.9,hd],[-hw,hd-.95],[-hw,-hd+.95]].map(([x,y])=>[cx+x,cy+y]);
        // Bed into the same stone and grain as the courtyard, with a thin cut edge.
        ctx.save();ctx.translate(.15,.25);surfacePath(ctx,points);ctx.fillStyle='rgba(18,24,25,.23)';ctx.fill();ctx.restore();
        surfacePath(ctx,points);ctx.fillStyle=this.theme.floor2;ctx.fill();
        ctx.save();surfacePath(ctx,points);ctx.clip();ctx.globalAlpha=.25;this.texture(ctx,`floor_${this.floor.theme}`,e.x,e.y);ctx.restore();
        surfacePath(ctx,points);ctx.strokeStyle='rgba(37,43,42,.4)';ctx.lineWidth=.14;ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx-hw+2,cy-hd+.24);ctx.lineTo(cx+hw-2,cy-hd+.24);ctx.lineTo(cx+hw-.3,cy-hd+1);ctx.strokeStyle='rgba(217,206,178,.38)';ctx.lineWidth=.18;ctx.stroke();
        for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(cx+side*(hw-2.4),cy+hd-.6);ctx.lineTo(cx+side*(hw-1.9),cy+hd*.23);ctx.lineTo(cx+side*(hw-3.1),cy+hd*.05);ctx.strokeStyle='rgba(48,51,46,.31)';ctx.lineWidth=.17;ctx.stroke();}
        if(e.type==='altar'){ctx.save();ctx.globalCompositeOperation='screen';ctx.translate(cx,cy);ctx.scale(1,.34);const light=ctx.createRadialGradient(0,0,1,0,0,9);light.addColorStop(0,'rgba(79,171,132,.2)');light.addColorStop(1,'rgba(24,63,47,0)');ctx.fillStyle=light;ctx.fillRect(-9,-9,18,18);ctx.restore();}
        ctx.restore();this.installationAudit.push({id:e.id,type:e.type,x:e.x,y:e.y,foot:{x:cx,y:cy},bounds:{x:cx-hw,y:cy-hd,w:hw*2,h:hd*2},source:`floor_${this.floor.theme}`,clippedToWalkable:true});
      }
    },
    bootContacts(ctx,id,frame,footX,footY){
      if(!this.material||this.card)return;
      const facing=id.split('_').at(-1),contacts=HERO_CONTACTS[facing]?.[frame],meta=window.TowerAssets?.get?.(id);if(!contacts||!meta)return;
      const p=this.renderProfile(this.currentEntity,id),scale=this.spriteScale(id)*(meta.logicalScale??1)*p.scale/NATIVE,anchor=p.sourceContact||meta.anchor,ax=anchor.x,ay=anchor.y,baseY=meta.frameBounds?.[frame]?.[3]||352,points=[];
      for(const [sourceX,width]of contacts){const x=footX+p.groundX-8+(sourceX-ax)*scale,y=footY+p.groundY-16+(baseY-ay)*scale,rx=Math.max(.48,width*scale*.6);ctx.save();ctx.translate(x,y+.1);ctx.scale(1,.28/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'rgba(10,15,16,.88)');g.addColorStop(.55,'rgba(10,15,16,.6)');g.addColorStop(1,'rgba(10,15,16,0)');ctx.fillStyle=g;ctx.fillRect(-rx,-rx,rx*2,rx*2);ctx.restore();points.push({x,y,width:rx*2});}
      this.groundingAudit.push({id,frame,contacts:points});
    },
    stairwell(ctx,x,y){
      // A descending flight below the courtyard plane, not a portable stair model.
      const e=this.currentEntity,p=this.renderProfile(e,'prop_stairs_down');ctx.save();ctx.translate(x,y);
      const outer=[[.55,2.8],[13.1,.8],[15.45,13.3],[2.8,15.4]],inner=[[2.1,4],[12,2.4],[13.85,12.4],[3.7,13.9]];
      surfacePath(ctx,outer);ctx.fillStyle=this.theme.line;ctx.fill();
      ctx.save();surfacePath(ctx,outer);ctx.clip();ctx.globalAlpha=.35;ctx.translate(-x,-y);this.texture(ctx,`floor_${this.floor.theme}`,e.x,e.y);ctx.restore();
      surfacePath(ctx,inner);ctx.fillStyle='#131d20';ctx.fill();
      ctx.save();surfacePath(ctx,inner);ctx.clip();
      // The far steps fall into shade; the near lip meets the actual floor.
      for(let i=0;i<7;i++){
        const yy=3.65+i*1.48,left=2.2+i*.23,right=12.25+i*.18,brightness=39+i*9;
        const top=ctx.createLinearGradient(0,yy,0,yy+1.15);top.addColorStop(0,`rgb(${brightness+17},${brightness+20},${brightness+18})`);top.addColorStop(1,`rgb(${brightness},${brightness+5},${brightness+5})`);
        surfacePath(ctx,[[left,yy],[right,yy-1.55],[right+.22,yy-.42],[left+.22,yy+1.13]]);ctx.fillStyle=top;ctx.fill();
        ctx.beginPath();ctx.moveTo(left+.22,yy+1.13);ctx.lineTo(right+.22,yy-.42);ctx.strokeStyle=`rgba(204,196,170,${.12+i*.038})`;ctx.lineWidth=.2;ctx.stroke();
      }
      const shade=ctx.createLinearGradient(0,2,0,14);shade.addColorStop(0,'rgba(3,8,10,.82)');shade.addColorStop(.5,'rgba(3,8,10,.17)');shade.addColorStop(1,'rgba(3,8,10,0)');ctx.fillStyle=shade;ctx.fillRect(0,0,16,16);
      surfacePath(ctx,[[2.1,4],[3.7,13.9],[4.35,13.35],[2.9,4.35]]);ctx.fillStyle='#3c4645';ctx.fill();ctx.restore();
      ctx.beginPath();ctx.moveTo(.55,2.8);ctx.lineTo(13.1,.8);ctx.lineTo(15.45,13.3);ctx.strokeStyle='rgba(219,208,181,.58)';ctx.lineWidth=.25;ctx.stroke();
      ctx.beginPath();ctx.moveTo(2.8,15.4);ctx.lineTo(15.45,13.3);ctx.strokeStyle='#343d3c';ctx.lineWidth=.4;ctx.stroke();
      // Inlaid bronze corner ties share the temple's metal language.
      for(const [xx,yy]of [[.9,3.2],[13,.95],[3.2,14.6],[14.9,12.7]]){rect(ctx,xx,yy,.55,.8,'#8c784b');line(ctx,xx+.08,yy+.12,.35,'#c0a568');}
      ctx.restore();
      if(e&&this.actorAnchors)this.actorAnchors.set(`${this.s.floor}:${e.x}:${e.y}`,{id:'prop_stairs_down',footX:x+p.groundX,footY:y+p.groundY,left:x+.55,top:y+.8,width:14.9,height:14.6,footprint:{x:x+1,y:y+6.2,w:14,h:9},elevation:0,depth:y+p.groundY,priority:1,scale:null,drawMode:'scene-geometry',direction:'down',steps:7});
    },
    floorTile(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme,z=this.realm,seed=hash(x,y,this.s.floor);
      // Stone is the quiet middle value; ornaments are reserved for landmarks.
      // Retain the source's material grain at low contrast, without blurring
      // either style's native pixels or changing a single collision cell.
      rect(ctx,px,py,16,16,t.floor);ctx.save();ctx.globalAlpha=this.material?.25:.48;
      const artFloor=this.texture(ctx,`floor_${this.floor.theme}`,x,y);ctx.restore();
      if(artFloor){
        const variation=(seed-.5)*(this.material?.045:.025);rect(ctx,px,py,16,16,variation>0?`rgba(239,226,191,${variation})`:`rgba(15,28,30,${-variation})`);
        if(y%2===0)rect(ctx,px,py+15.8,16,.2,this.material?'#5e605933':'#927e5822');
        if(x%3===Math.floor(y/2)%3)rect(ctx,px+15.8,py,.2,16,this.material?'#5e605933':'#927e5822');
      }
      if(artFloor&&this.material&&this.realm===5){ctx.fillStyle='rgba(191,183,162,.17)';ctx.fillRect(px,py,16,16);}
      // One quiet, continuous stone plane. The board grid appears on demand.
      if(!artFloor){rect(ctx,px,py,16,16,(Math.floor(x/4)+Math.floor(y/4))%4===0?t.floor2:t.floor);
      if(y%2===0)line(ctx,px,py+15,16,t.line);
      if(x%3===(Math.floor(y/2)%3))rect(ctx,px+15,py,1,16,t.line);
      if(seed>.89){line(ctx,px+3,py+4,4,t.line);pixelLine(ctx,px+7,py+4,px+9,py+7,t.line);}}
      if(!artFloor){
      if(z===0&&seed<.13){line(ctx,px+2,py+12,4,t.moss);rect(ctx,px+3,py+10,1,2,t.moss);}
      if(z===1&&x%4===0&&y%4===0){rect(ctx,px+6,py+6,4,4,t.line);rect(ctx,px+7,py+7,2,2,t.moss);}
      if(z===2&&seed>.8){line(ctx,px+2,py+12,9,'#a9c4b9');line(ctx,px+6,py+13,7,t.line);}
      if(z===3&&y%4===1){rect(ctx,px,py+7,16,2,'#91694f');line(ctx,px,py+8,16,'#b99366');}
      if(z===4&&x%5===2&&y%3===1){line(ctx,px+5,py+5,5,t.line);rect(ctx,px+7,py+4,1,6,t.line);line(ctx,px+6,py+8,3,t.line);}
      if(z===5&&seed>.72){pixelLine(ctx,px+2,py+3,px+5,py+6,t.line);pixelLine(ctx,px+5,py+6,px+12,py+11,t.line);}}
      const walkable=(xx,yy)=>!['#','v','~','w'].includes(this.floor.map[yy]?.[xx]);
      const fine=artFloor?1/3:1;
      if(!walkable(x,y-1))rect(ctx,px,py,16,fine,this.theme.moss);
      if(!walkable(x-1,y))rect(ctx,px,py,fine,16,this.theme.moss);
      if(!walkable(x,y+1)){rect(ctx,px,py+16-fine*2,16,fine,t.line);rect(ctx,px,py+16-fine,16,fine,t.edge);}
      if(!walkable(x+1,y))rect(ctx,px+16-fine,py,fine,16,t.edge);
      if(this.purified&&seed>.9){rect(ctx,px+3,py+11,1,3,C.jadeDark);line(ctx,px+2,py+11,3,C.jadeDark);rect(ctx,px+3,py+10,1,1,C.goldLight);}
      if(this.overview||this.engine.mode!=='walk'){
        ctx.globalAlpha=.2;line(ctx,px,py,16,t.edge);rect(ctx,px,py,1,16,t.edge);ctx.globalAlpha=1;
      }
      if(this.floor.map[y]?.[x]==='~'){
        ctx.save();if(this.passageAxis(x,y)==='vertical'){ctx.translate(px+8,py+8);ctx.rotate(Math.PI/2);ctx.translate(-px-8,-py-8);}
        rect(ctx,px,py+10,16,2,'#101a20');
        if(this.material){const metal=ctx.createLinearGradient(0,py+5,0,py+11);metal.addColorStop(0,'#5d4226');metal.addColorStop(.25,'#c7994b');metal.addColorStop(.46,'#f0d598');metal.addColorStop(.62,'#aa7733');metal.addColorStop(1,'#493725');ctx.fillStyle=metal;ctx.fillRect(px,py+5,16,6);}
        else{rect(ctx,px,py+5,16,6,C.goldDark);line(ctx,px,py+6,16,C.goldLight);rect(ctx,px,py+7,16,2,C.gold);}
        for(const xx of [1,3,12,14]){rect(ctx,px+xx,py+5,2/3,6,C.goldLight);rect(ctx,px+xx+2/3,py+5,1/3,6,C.goldDark);}
        for(const xx of [5,8,10])rect(ctx,px+xx,py+7,1/3,2,'#70552d');ctx.restore();
      }
      if(this.floor.map[y]?.[x]==='='){rect(ctx,px+1,py+2,2,2,t.light);rect(ctx,px+13,py+11,2,3,t.light);}
      if(this.floor.map[y]?.[x]==='w'){line(ctx,px+1,py+13,14,'#437c89');rect(ctx,px+4,py+11,1,2,C.blue);}
    },
    isLandmarkCell(x,y){return (this.floor.landmarks||[]).some(m=>x>=m.x&&x<m.x+(m.w||4)&&y>=m.y&&y<m.y+(m.h||5));},
    wallOccludes(worldX,worldY,actorDepth){if(!this.smoothing())return false;const x=Math.floor(worldX/CELL),y=Math.floor(worldY/CELL);return this.tile(x,y)==='#'&&!this.isLandmarkCell(x,y)&&(y+1)*CELL>actorDepth;},
    wallContactShadows(ctx,walls){
      const bare=(x,y)=>this.tile(x,y)==='.'&&!this.floor.entities.some(e=>e.x===x&&e.y===y);
      ctx.save();
      for(const wall of walls){const x=wall.x*CELL,y=wall.y*CELL;
        // Only transparent light falloff enters empty floor cells. Opaque
        // masonry stays inside its real collision cell and never closes a door.
        if(bare(wall.x,wall.y+1)){const g=ctx.createLinearGradient(0,y+CELL,0,y+CELL+2.5);g.addColorStop(0,'rgba(5,9,12,.24)');g.addColorStop(1,'rgba(5,9,12,0)');ctx.fillStyle=g;ctx.fillRect(x,y+CELL,CELL,2.5);}
        if(bare(wall.x+1,wall.y)){const g=ctx.createLinearGradient(x+CELL,0,x+CELL+1.3,0);g.addColorStop(0,'rgba(5,9,12,.14)');g.addColorStop(1,'rgba(5,9,12,0)');ctx.fillStyle=g;ctx.fillRect(x+CELL,y,1.3,CELL);}
      }ctx.restore();
    },
    wallForeground(ctx,wall){
      const v=this.renderViewport,b=wall.bounds;
      if(b.x+b.w<v.x*CELL||b.x>(v.x+v.w)*CELL||b.y+b.h<v.y*CELL||b.y>(v.y+v.h)*CELL)return;
      // Reuse the native-density static masonry surface in the same depth
      // queue as ground-contact actors. This is occlusion, not sprite cropping.
      ctx.drawImage(this.terrainBuffer,b.x*this.cacheDensity,b.y*this.cacheDensity,b.w*this.cacheDensity,b.h*this.cacheDensity,b.x,b.y,b.w,b.h);
      if(wall.x>0&&wall.x<this.floor.map[0].length-1&&wall.y>0&&wall.y<this.floor.map.length-1&&this.tile(wall.x,wall.y+1)!=='#'&&hash(wall.x,wall.y,this.s.floor+4)>.76)this.torch(ctx,b.x+8,b.y+7,wall.x+wall.y);
    },
    materialWall(ctx,x,y,n,e,s,w){
      const px=x*CELL,py=y*CELL,t=this.theme,front=py+8.8;
      ctx.save();ctx.beginPath();ctx.rect(px,py,CELL,CELL);ctx.clip();
      // Quiet stone roof plane, then a distinct bevel and a recessed vertical
      // facade. The exposed face has real depth instead of a thin gilt outline.
      ctx.fillStyle='rgba(11,17,20,.14)';ctx.fillRect(px,py,CELL,CELL);
      if(!s){
        const face=ctx.createLinearGradient(0,front,0,py+CELL);face.addColorStop(0,'rgba(85,79,65,.84)');face.addColorStop(.21,'rgba(40,42,40,.77)');face.addColorStop(.77,'rgba(29,33,33,.88)');face.addColorStop(1,'rgba(10,17,20,.96)');ctx.fillStyle=face;ctx.fillRect(px,front,CELL,CELL-8.8);
        const bevel=ctx.createLinearGradient(0,front-1.2,0,front+1.1);bevel.addColorStop(0,'#292d2c');bevel.addColorStop(.3,t.light);bevel.addColorStop(.56,'#c5a66b');bevel.addColorStop(1,'#554a36');ctx.fillStyle=bevel;ctx.fillRect(px,front-1.2,CELL,2.3);
        rect(ctx,px,front+1.25,CELL,.45,'rgba(5,11,14,.8)');rect(ctx,px,py+12.9,CELL,.34,'rgba(9,16,18,.8)');rect(ctx,px,py+13.25,CELL,.25,'rgba(131,121,95,.35)');
        if(x%2===y%2){rect(ctx,px+7.5,front+2,.45,2.1,'rgba(5,11,14,.75)');rect(ctx,px+8,front+2,.22,2.1,'rgba(130,119,92,.28)');}
        rect(ctx,px,py+15,CELL,1,'rgba(7,13,16,.75)');
      }
      if(!n){const rear=ctx.createLinearGradient(0,py,0,py+2.2);rear.addColorStop(0,'#1c2428');rear.addColorStop(.32,'#9a8b69');rear.addColorStop(.54,'#b8a16e');rear.addColorStop(1,'rgba(33,39,38,0)');ctx.fillStyle=rear;ctx.fillRect(px,py,CELL,2.2);}
      const end=s?py+CELL:front+.7;
      if(!w){const edge=ctx.createLinearGradient(px,0,px+2.4,0);edge.addColorStop(0,'#171f23');edge.addColorStop(.5,'#696650');edge.addColorStop(.68,'#a18a57');edge.addColorStop(1,'rgba(38,43,42,0)');ctx.fillStyle=edge;ctx.fillRect(px,py,2.4,end-py);}
      if(!e){const edge=ctx.createLinearGradient(px+13.3,0,px+CELL,0);edge.addColorStop(0,'rgba(20,27,30,0)');edge.addColorStop(.35,'rgba(17,24,27,.8)');edge.addColorStop(1,'#0c151a');ctx.fillStyle=edge;ctx.fillRect(px+13.3,py,2.7,end-py);rect(ctx,px+13.2,py,.35,end-py,'rgba(151,129,84,.42)');}
      ctx.restore();
    },
    wall(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme,z=this.realm,solid=(xx,yy)=>this.tile(xx,yy)==='#';
      const n=solid(x,y-1),e=solid(x+1,y),s=solid(x,y+1),w=solid(x-1,y);
      // Adjacent wall cells read as one architectural mass, never as boxes.
      const artWall=this.texture(ctx,`wall_${this.floor.theme}`,x,y);if(!artWall)rect(ctx,px,py,16,16,t.wall);
      if(this.material){rect(ctx,px,py,16,16,'rgba(24,32,35,.24)');if(!this.isLandmarkCell(x,y))this.materialWall(ctx,x,y,n,e,s,w);return;}
      if(artWall){
        // Continuous azurite roof planes, gilded coping and vermilion pillars.
        // Sparse true-pixel edging keeps walls readable without giant outlines.
        if(!n){rect(ctx,px,py,16,2/3,C.goldLight);rect(ctx,px,py+2/3,16,1/3,C.goldDark);}
        if(!s){rect(ctx,px,py+12,16,4,t.edge);rect(ctx,px,py+12,16,1/3,C.goldLight);rect(ctx,px,py+14,16,1/3,C.gold);}
        if(!w){rect(ctx,px,py+1,1,15,this.material?'#302b28':'#a8543e');rect(ctx,px+1,py+1,1/3,15,this.material?t.light:C.goldLight);}
        if(!e){rect(ctx,px+15,py+1,1,15,this.material?'#272523':'#9d4d3d');rect(ctx,px+14+2/3,py+1,1/3,15,this.material?t.light:C.gold);}
        return;
      }
      if(!n){rect(ctx,px,py,16,2,t.light);line(ctx,px,py+2,16,t.edge);}
      if(!s){rect(ctx,px,py+10,16,5,t.edge);line(ctx,px,py+10,16,t.light);line(ctx,px,py+11,16,t.moss);line(ctx,px,py+15,16,t.void);}
      if(!w){rect(ctx,px,py,2,16,t.edge);rect(ctx,px+2,py+2,1,Math.min(10,s?14:8),t.light);}
      if(!e){rect(ctx,px+14,py,2,16,t.edge);rect(ctx,px+13,py+2,1,Math.min(10,s?14:8),t.light);}
      if(n&&s&&w&&e){
        if(y%3===0)line(ctx,px,py+10,16,t.edge);
        if((x+y*2)%7===0){pixelLine(ctx,px+4,py+2,px+8,py+9,t.edge);line(ctx,px+8,py+9,5,t.edge);}
        return;
      }
      if(z===0&&hash(x,y)>.82){rect(ctx,px+3,py+7,4,2,'#4c6150');rect(ctx,px+5,py+5,2,3,'#4c6150');}
      if(z===1&&(!n||!s)&&x%3===0){rect(ctx,px+5,py+3,6,6,'#6a5041');rect(ctx,px+7,py+4,2,4,'#c2a26c');}
      if(z===2&&(!s||!n)&&x%4===0){for(let j=2;j<12;j+=4){rect(ctx,px+7,py+j,3,3,'#66838a');rect(ctx,px+8,py+j+1,1,1,t.edge);}}
      if(z===3&&(!s||!n)&&x%4===2){rect(ctx,px+4,py+3,8,6,'#291e28');line(ctx,px+5,py+5,6,this.purified?'#608b7a':'#d37545');line(ctx,px+5,py+7,6,this.purified?'#4d746a':'#f0ba6e');rect(ctx,px+7,py+3,1,6,t.wall);}
      if(z===4&&(!s||!n)&&x%3===1){for(let i=0;i<3;i++){line(ctx,px+5,py+3+i*2,5-i%2,'#a29a93');rect(ctx,px+11,py+3+i*2,1,1,'#a29a93');}}
      if(z===5&&(!s||!n)&&x%4===0){rect(ctx,px+6,py+3,4,5,'#74574f');rect(ctx,px+7,py+4,2,3,this.purified?C.gold:C.purple);}
    },
    water(ctx,x,y){
      const px=x*16,py=y*16,flow=this.mode==='standard'?Math.floor(this.t/450)%4:0;
      // Weak water is a liquid, never a stone/wall alias. Painted, horizontal
      // pigment bands and the broken dark-lotus reflection remain readable at
      // both zoom levels; they do not imply a staff-bridgeable empty gap.
      rect(ctx,px,py,16,16,this.material?'#1c343d':'#18576a');rect(ctx,px,py+1/3,16,1,this.material?'#2b4248':'#286e78');
      for(let row=0;row<7;row++){const yy=py+2+row*2,shift=(flow+row+x)%4,colors=this.material?['#203c45','#3a575b','#2c484f','#607a78']:['#1d6573','#3d8e8c','#256d7c','#6ca99b'];rect(ctx,px,yy,16,1/3,colors[(row+y)%4]);for(let j=0;j<3;j++){const xx=px+((j*6+shift+row*2)%16),ww=Math.min(4,px+16-xx);rect(ctx,xx,yy+2/3,ww,1/3,row%3===0?this.material?'#9caba5':'#b0cdb5':this.material?'#5b7675':'#4b9995');}}
      pixelPolygon(ctx,[[px+5,py+9],[px+3,py+6],[px+6,py+7],[px+8,py+4],[px+10,py+7],[px+13,py+6],[px+11,py+10]],'#51425c');rect(ctx,px+7,py+7,2,2,'#a3716c');rect(ctx,px+5,py+11,7,1/3,'#90bab0');
      if(this.s.quests?.bajie){rect(ctx,px+3,py+14,3,1/3,C.goldLight);rect(ctx,px+10,py+14,3,1/3,C.goldLight);}
    },
    passageAxis(x,y){
      if(!this.floor?.map)return 'vertical';
      const open=(xx,yy)=>!['#','v',undefined].includes(this.floor.map[yy]?.[xx]);
      return Number(open(x,y-1))+Number(open(x,y+1))>Number(open(x-1,y))+Number(open(x+1,y))?'vertical':'horizontal';
    },
    gap(ctx,x,y){
      const px=x*16,py=y*16;ctx.save();
      if(this.passageAxis(x,y)==='vertical'){ctx.translate(px+8,py+8);ctx.rotate(Math.PI/2);ctx.translate(-px-8,-py-8);}
      rect(ctx,px,py,16,16,'#08141e');
      for(const end of [0,13]){rect(ctx,px+end,py,3,16,this.theme.edge);rect(ctx,px+end,py,2/3,16,this.theme.light);rect(ctx,px+end,py+6,3,4,C.goldDark);}
      for(let i=0;i<3;i++){const yy=py+4+i*4;line(ctx,px+5+i%2,yy,5-i%2,'#345060');}
      line(ctx,px+3,py+3,2,C.goldLight);line(ctx,px+11,py+12,2,C.goldLight);ctx.restore();
    },
    voidTile(ctx,x,y){
      const px=x*16,py=y*16;rect(ctx,px,py,16,16,this.theme.void);
      // The cloud atlas name currently aliases a paving texture. Keep the
      // reserved, impassable landmark footprint visibly suspended in cloud sea.
      const yy=py+11+Math.round(hash(x,y)*3);ctx.save();ctx.globalAlpha=this.material?.055:.21;rect(ctx,px,yy,16,1/3,this.material?'#adb8b8':'#d0d5b0');rect(ctx,px+3,yy-1,7,1/3,this.material?'#8c9e9f':'#91b5a1');ctx.restore();
    },
    decor(ctx){
      const map=this.floor.map;
      for(let y=1;y<map.length-1;y++)for(let x=1;x<map[y].length-1;x++)if(map[y][x]==='#'&&map[y+1]?.[x]!=='#'&&hash(x,y,this.s.floor+4)>.76){this.torch(ctx,x*16+8,y*16+7,x+y);}
    },
    lightSources(ctx,entities){
      const lights=entities.filter(e=>e.type==='altar'||e.type==='relic'||e.type==='finale'||e.type==='resonator');
      if(this.material){ctx.save();ctx.globalCompositeOperation='screen';for(const e of lights){const hot=e.type==='relic'||e.type==='finale',r=hot?17:13,p=this.renderProfile(e);ctx.save();ctx.translate(e.x*CELL+p.groundX,e.y*CELL+p.groundY);ctx.scale(1,.4);const g=ctx.createRadialGradient(0,0,1,0,0,r);g.addColorStop(0,hot?'rgba(227,177,91,.16)':'rgba(97,192,167,.16)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();}ctx.restore();return;}
      for(const e of lights){const color=e.type==='altar'?C.jade:e.type==='resonator'?C.blue:C.goldLight;ctx.globalAlpha=.035;rect(ctx,e.x*16-8,e.y*16-8,32,32,color);ctx.globalAlpha=.055;rect(ctx,e.x*16-2,e.y*16-2,20,20,color);ctx.globalAlpha=1;}
    },
    landmark(ctx){
      const map=this.floor.map,w=map[0].length,h=map.length,types=['buddha','pagoda','dragon','furnace','scripture','blacklotus'];
      let landmarks=this.floor.landmarks||[];
      // Older saves/maps still receive a fitting landmark if they have an authored mass.
      if(!landmarks.length){
        let best=null;for(let y=1;y<h-3;y++)for(let x=1;x<w-2;x++){
          if(Array.from({length:4},(_,dy)=>Array.from({length:3},(_,dx)=>['#','v'].includes(map[y+dy]?.[x+dx])).every(Boolean)).every(Boolean)){best={type:types[this.realm],x,y,w:3,h:4};break;}
        }
        if(best)landmarks=[best];
      }
      this.visibleLandmarks=landmarks;
      for(const mark of landmarks){
        const x=mark.x*16,y=mark.y*16,mw=(mark.w||4)*16,mh=(mark.h||5)*16;
        ctx.save();ctx.beginPath();
        for(let yy=mark.y;yy<mark.y+(mark.h||5);yy++)for(let xx=mark.x;xx<mark.x+(mark.w||4);xx++)if(['#','v'].includes(map[yy]?.[xx]))ctx.rect(xx*16,yy*16,16,16);
        ctx.clip();
        // The giant silhouette is scenery with a real reserved footprint.
        const artType=mark.type||types[this.realm];
        if(artType==='buddha'||artType==='scripture'){for(let yy=mark.y;yy<mark.y+(mark.h||5);yy++)for(let xx=mark.x;xx<mark.x+(mark.w||4);xx++)this.texture(ctx,`wall_${this.floor.theme}`,xx,yy);if(this.material){ctx.fillStyle='rgba(4,8,10,.24)';ctx.fillRect(x,y,mw,mh);}}
        const placement=this.landmarkArt(ctx,`landmark_${artType}`,x,y,mw,mh,artType)||this.landmarkArt(ctx,`landmark_${this.floor.theme}`,x,y,mw,mh,artType);
        if(!placement){const art=this.architecture(artType);ctx.imageSmoothingEnabled=false;ctx.drawImage(art,x,y,mw,mh);}else this.landmarkState(ctx,artType,placement,x,y,mw,mh);
        if(!this.material&&(artType==='buddha'||artType==='scripture')){ctx.strokeStyle=C.goldDark;ctx.lineWidth=2/3;ctx.strokeRect(x+1/3,y+1/3,mw-2/3,mh-2/3);ctx.strokeStyle=C.goldLight;ctx.lineWidth=1/3;ctx.strokeRect(x+1,y+1,mw-2,mh-2);}
        // Cleansed architecture retains a readable mineral-gold edge after the
        // awakening ends and also after save/load. It is not a transient filter.
        if(this.purified){ctx.globalAlpha=.28;line(ctx,x,y+mh-1,mw,C.goldLight);ctx.globalAlpha=1;}ctx.restore();
      }
      // Thin clouds span open abyss; their scale belongs to architecture, not tiles.
      const blocks=landmarks.filter(m=>m.type==='buddha'||m.type==='pagoda'||m.type==='dragon');
      for(const m of blocks){const xx=m.x*16,yy=(m.y+m.h)*16-4;ctx.save();ctx.beginPath();for(let row=Math.max(0,m.y-1);row<Math.min(h,m.y+m.h+2);row++)for(let col=Math.max(0,m.x-2);col<Math.min(w,m.x+m.w+2);col++)if(map[row]?.[col]==='v')ctx.rect(col*16,row*16,16,16);ctx.clip();
        for(let i=0;i<3;i++){const dx=i*9-10,dy=i*4;line(ctx,xx+dx,yy+dy,m.w*16+12-i*8,this.realm===2?'#355464':'#3a4b45');line(ctx,xx+dx+5,yy+dy+1,m.w*16+12-i*8,this.realm===2?'#223d4f':'#253630');}ctx.restore();}
    },
    architecture(type){
      const furnaceGroups=[['furnace-shadow','furnace-latch'],['silk-a','silk-b'],['furnace-mercy','furnace-stop']],stable=furnaceGroups.map(g=>g.every(id=>this.controlLit(id)));
      const lit=this.purified||this.controlLit('west-tower')&&this.controlLit('east-tower'),key=`${type}:${this.purified}:${lit}:${stable.join(',')}:${this.s.selfAwakened}:${this.s.externalRelics||0}`;
      this.artCache=this.artCache||new Map();if(this.artCache.has(key))return this.artCache.get(key);
      const art=document.createElement('canvas');art.width=112;art.height=128;const c=art.getContext('2d');c.imageSmoothingEnabled=false;
      const ink='#171d21',shade='#3d4942',stone='#8c9276',paper='#c6c2a0',ivory='#e7d8aa',gold='#a47c43',bright='#e7bd69',red='#b64c36',jade='#76b4aa';
      const poly=(pts,col)=>pixelPolygon(c,pts,col),r=(x,y,w,h,col)=>rect(c,x,y,w,h,col),l=(x,y,w,col)=>line(c,x,y,w,col),pl=(x,y,xx,yy,col,ww=1)=>pixelLine(c,x,y,xx,yy,col,ww);
      if(type==='buddha'){
        // A broken, half-gilded icon: heavy brow, long ear, raised open palm.
        octagon(c,56,45,42,'#69705a');octagon(c,56,45,37,'#a08e5b');octagon(c,56,45,34,'#414e44');
        for(let i=0;i<12;i++){const a=i*Math.PI/6;pl(56+Math.cos(a)*35,45+Math.sin(a)*35,56+Math.cos(a)*40,45+Math.sin(a)*40,'#b49c63');}
        poly([[27,75],[79,75],[93,88],[107,118],[5,118],[17,89]],ink);poly([[31,77],[74,77],[90,96],[95,116],[14,116],[23,92]],shade);
        poly([[41,76],[58,76],[74,115],[26,115]],'#8c8d6b');pl(39,84,30,111,paper,2);pl(48,83,58,113,'#4c5748',2);pl(65,82,79,112,gold,2);
        r(31,24,49,46,ink);r(35,20,41,53,stone);r(39,17,33,59,paper);r(48,14,16,3,stone);r(72,29,6,37,'#8b8b6c');
        r(27,39,8,24,stone);r(29,42,3,16,paper);r(77,36,8,29,shade);r(79,41,3,20,gold);
        poly([[59,21],[73,22],[73,66],[61,74],[56,61]],'#5c6551');
        for(let row=0;row<4;row++)for(let col=0;col<6;col++){r(37+col*6+(row%2)*2,19+row*4,4,3,hash(col,row)>.5?'#56614e':'#777d60');}
        l(38,41,15,'#384a40');l(60,41,13,'#262e2c');l(40,43,11,'#26332e');l(61,43,10,'#222b29');
        r(52,44,5,17,'#909675');r(53,45,2,12,ivory);l(49,60,10,'#4b5849');l(46,66,18,'#5b6350');l(49,68,13,'#969273');
        r(54,35,3,3,this.purified?bright:red);pl(72,21,58,45,ink,2);pl(58,45,65,58,ink,2);pl(65,58,47,77,ink,2);pl(70,24,60,44,gold);
        // Palm has four unequal fingers and a readable split from the stone body.
        r(84,62,17,28,ink);r(85,61,15,26,stone);r(85,49,3,18,paper);r(89,43,3,22,paper);r(93,41,3,23,stone);r(97,48,3,18,stone);r(81,65,5,14,paper);r(87,67,4,14,paper);pl(86,71,95,74,'#59654f');pl(91,74,94,82,'#59654f');
        r(12,117,88,5,'#6d785d');l(10,116,92,paper);l(18,123,76,'#455549');
        r(62,94,8,13,red);l(64,96,4,ivory);r(65,98,1,7,ivory);l(63,101,5,ivory);
      }else if(type==='pagoda'){
        const roof=(y,width)=>{poly([[56,y-13],[56+width/2-7,y],[56+width/2+2,y-2],[56+width/2,y+5],[56-width/2,y+5],[54-width/2,y-2],[63-width/2,y]],ink);l(56-width/2,y+4,width,bright);l(62-width/2,y+1,width-12,gold);pl(56,y-11,55-width/2+8,y,'#aa8c5a');pl(56,y-11,55+width/2-7,y,'#aa8c5a');};
        poly([[16,119],[16,100],[24,100],[24,117],[88,117],[88,100],[96,100],[96,119]],'#393839');
        r(37,22,38,87,'#614b3e');r(41,23,30,86,'#8e6c48');r(45,24,22,85,'#3b3031');r(53,26,6,76,'#ba935b');
        for(const y of [38,66,94]){r(42,y,28,19,'#9a7951');for(const x of [46,61]){r(x,y+3,5,13,lit?'#c4e3bd':'#272c2e');r(x+1,y+4,2,10,lit?jade:'#665444');}l(39,y+19,34,gold);}
        roof(99,100);roof(70,86);roof(42,70);r(54,8,4,12,gold);r(55,4,2,5,bright);l(50,14,12,bright);r(52,17,8,2,gold);
        for(const [x,y]of[[10,107],[100,107],[17,78],[93,78],[25,50],[85,50]]){r(x,y,2,6,gold);r(x-1,y+5,4,3,bright);r(x,y+8,2,1,red);}
        r(20,111,72,7,'#7b644a');l(18,111,76,bright);r(14,119,84,5,'#403b36');l(16,119,80,gold);
        if(lit){octagon(c,56,84,9,jade,.75);r(54,81,4,6,ivory);}
      }else if(type==='dragon'){
        // The drowned dragon is a colossal severed stone figure, not another enemy icon.
        const deep='#273e4b',blue='#4c6e76',grey='#8da49a',pale='#c1c8ac';
        poly([[16,17],[31,12],[44,22],[52,41],[80,44],[91,61],[85,80],[59,88],[42,103],[58,117],[89,114],[94,123],[53,126],[28,112],[29,94],[51,76],[76,69],[78,57],[54,56],[32,43]],ink);
        poly([[25,20],[34,22],[43,44],[57,50],[80,50],[84,63],[78,74],[53,80],[36,98],[37,108],[56,120],[83,119],[56,124],[31,110],[32,95],[51,77],[77,69],[79,57],[51,55],[32,44]],blue);
        for(let i=0;i<7;i++){const xx=37+i*6,yy=75-i*2;pl(xx,yy,xx+5,yy+8,grey,2);}
        poly([[20,22],[35,14],[54,20],[60,30],[75,34],[82,46],[70,55],[47,52],[32,42],[20,40]],blue);
        poly([[29,27],[37,21],[55,24],[58,35],[72,38],[75,47],[61,49],[50,43],[36,43],[25,35]],grey);
        poly([[33,20],[23,10],[21,2],[29,8],[40,15]],gold);poly([[47,18],[49,5],[58,2],[53,13],[57,23]],gold);pl(23,2,26,10,bright);pl(51,7,56,3,bright);
        l(35,31,13,deep);r(40,32,4,2,this.purified?jade:bright);r(41,32,1,2,ink);l(62,42,11,deep);r(65,45,3,4,pale);r(73,43,2,3,pale);
        pl(28,39,13,46,gold,2);pl(13,46,7,42,gold);pl(58,50,68,58,pale);pl(68,58,87,56,pale);pl(87,56,99,48,pale);
        poly([[50,57],[45,63],[25,66],[20,75],[24,79],[30,73],[46,72],[57,65]],blue);pl(24,71,17,74,pale,2);pl(28,73,25,81,pale,2);pl(32,72,33,79,pale,2);
        for(let i=0;i<12;i++){const xx=2+i*9,yy=85+Math.round(Math.sin(i/11*Math.PI)*10);r(xx,yy,7,5,'#68848a');r(xx+2,yy+1,3,2,deep);}
        for(let i=0;i<4;i++){l(9+i*7,111+i*4,84-i*14,'#385868');l(14+i*7,112+i*4,72-i*14,'#263e50');}
      }else if(type==='furnace'){
        const copper='#9e6646',shadow='#5b3837',light='#d29859';
        r(44,5,24,20,shadow);r(48,4,16,21,copper);l(41,5,30,light);l(45,10,22,ink);r(50,13,12,10,ink);
        poly([[23,37],[28,27],[84,27],[89,37],[98,55],[92,98],[78,115],[34,115],[20,98],[14,55]],ink);
        poly([[27,38],[33,30],[79,30],[85,40],[91,56],[86,96],[74,109],[39,109],[26,95],[20,56]],copper);
        poly([[28,43],[45,39],[43,104],[32,94],[27,73]],'#b67c4d');poly([[69,37],[83,43],[87,76],[80,98],[70,104]],shadow);
        l(24,45,64,gold);l(21,51,70,light);l(26,96,60,light);l(33,103,46,gold);
        for(let i=0;i<3;i++){const xx=31+i*18;r(xx,61,14,25,ink);r(xx+2,64,10,18,stable[i]?'#3f6c63':'#a84b31');r(xx+4,67,6,12,stable[i]?jade:'#f4c177');r(xx+6,59,2,28,copper);l(xx,60,14,light);}
        for(const x of [4,95]){r(x,47,13,29,shadow);r(x+2,44,9,6,copper);r(x+3,52,6,16,ink);r(x+2,72,9,6,light);}
        r(28,109,12,15,shadow);r(73,109,12,15,shadow);l(24,123,21,light);l(69,123,21,light);r(47,105,18,11,gold);r(51,108,10,4,ink);
        for(let i=0;i<8;i++){const xx=31+i*7,yy=18-i%3*5;pl(xx,yy,xx-2,yy-6,stable.every(Boolean)?'#557368':'#69534c',2);}
      }else if(type==='scripture'){
        // Vast broken scripture fan, with a compassionate white silhouette in the breach.
        for(let i=0;i<7;i++){const xx=6+i*14,yy=10+Math.abs(i-3)*7;poly([[xx,yy+4],[xx+10,yy],[xx+12,105],[xx,112]],'#55535e');r(xx+1,yy+5,9,94-yy,'#aaa48e');l(xx+1,yy+5,9,'#d4c8a4');r(xx+10,yy+8,2,88-yy,'#65616b');
          for(let j=0;j<9;j++){const cy=yy+13+j*7;if(cy>101)break;l(xx+3,cy,4+(i+j)%2,'#686b61');r(xx+5,cy-1,1,3,'#686b61');if(j%3===0)r(xx+3,cy+2,2,1,red);}}
        octagon(c,56,53,25,'#6c877e');octagon(c,56,53,21,'#9ea997');octagon(c,56,53,18,'#5b6e6d');
        poly([[49,53],[63,53],[73,91],[38,91]],'#ced6c0');poly([[54,54],[59,54],[63,87],[47,87]],ivory);r(49,34,14,21,'#d9c9aa');r(52,29,8,7,'#b7bca6');l(50,43,4,'#60776e');l(59,43,3,'#60776e');l(53,49,7,'#8d9881');
        pl(49,60,37,74,'#b4c8b5',3);pl(63,61,77,72,'#b4c8b5',3);r(32,73,8,4,ivory);r(75,71,8,4,ivory);
        poly([[29,98],[81,98],[99,113],[12,113]],'#59695d');l(24,100,64,'#a8b69b');l(15,115,81,'#b4b298');r(22,116,68,6,'#383d43');
        r(80,93,12,16,red);r(83,96,1,10,ivory);l(82,99,7,ivory);r(87,96,1,9,ivory);l(82,104,7,ivory);
      }else{
        // A black lotus cradles the impossible seventeenth place.
        octagon(c,56,55,42,'#6d5653');octagon(c,56,55,37,'#aa8558');octagon(c,56,55,35,'#2a2533');
        const count=this.s.externalRelics||0;
        for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,xx=56+Math.cos(a)*40,yy=55+Math.sin(a)*40;r(xx-2,yy-2,5,5,i<count?bright:'#665164');r(xx-1,yy-1,2,2,i<count?ivory:'#3c3044');}
        for(let i=0;i<7;i++){const xx=11+i*13,yy=79-Math.abs(i-3)*7;poly([[xx,106],[xx-3,yy+8],[xx+4,yy-7],[xx+13,yy+7],[xx+12,106]],i%2?'#584254':'#6d4e5a');pl(xx+5,yy-5,xx+9,yy+7,'#b17b68');}
        poly([[40,74],[45,47],[56,29],[67,47],[72,74],[64,88],[47,88]],'#171b25');pl(55,34,46,54,gold);pl(57,34,66,54,gold);l(47,87,18,gold);
        if(this.s.selfAwakened){r(50,47,12,13,bright);r(47,60,18,20,bright);r(52,49,8,9,ivory);r(49,65,15,5,red);pl(66,45,66,85,bright,2);pl(49,48,39,34,red,2);pl(58,47,69,31,red,2);}else{r(51,52,10,19,'#282536');r(54,55,4,12,'#3b3041');}
        l(12,109,88,gold);r(18,110,76,8,'#4e3a48');l(23,118,66,'#8a6851');r(32,119,48,5,'#322936');
      }
      // The hand-cut edge treatment stays sparse, so silhouettes carry the scene.
      for(let i=0;i<22;i++){const x=Math.floor(hash(i,4)*108),y=Math.floor(hash(i,9)*126);if(c.getImageData(x,y,1,1).data[3])r(x,y,1+(i%3===0),1,i%4===0?'#d6bd86':'#4c5146');}
      this.artCache.set(key,art);return art;
    },
    floorSigils(ctx){
      const map=this.floor.map,w=map[0].length,h=map.length;
      ctx.save();ctx.beginPath();for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!['#','v','~','w','='].includes(this.tile(x,y)))ctx.rect(x*16,y*16,16,16);ctx.clip();
      const cx=w*8,cy=h*8;
      if(this.realm===5){octagon(ctx,cx,cy,64,'#d6aa60',.24);octagon(ctx,cx,cy,51,'#d6aa60',.15);const count=this.s.externalRelics||0;for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2;ctx.globalAlpha=i<count?.48:.14;rect(ctx,cx+Math.cos(a)*62-1,cy+Math.sin(a)*62-1,3,3,i<count?C.goldLight:C.purple);}}
      else if(this.realm===1){ctx.globalAlpha=.18;pixelLine(ctx,24,cy,w*16-24,cy,'#5c483a',3);pixelLine(ctx,cx,24,cx,h*16-24,'#5c483a',3);octagon(ctx,cx,cy,32,'#5c483a',.2);}
      else if(this.realm===3){ctx.globalAlpha=.17;for(let i=-1;i<2;i++)pixelLine(ctx,cx+i*38,18,cx+i*38,h*16-18,'#643d36',3);}
      else if(this.realm===4){octagon(ctx,cx,cy,50,'#727e72',.13);octagon(ctx,cx,cy,44,'#727e72',.13);}
      ctx.globalAlpha=1;ctx.restore();
    },
    controlLit(id){
      if(this.controlData!==this.data()){this.controlData=this.data();this.controlIndex=new Map();for(const floor of this.controlData.floors)for(const e of floor.entities||[]){this.controlIndex.set(e.id,e);if(e.controlId)this.controlIndex.set(e.controlId,e);}}
      const entity=this.controlIndex.get(id);return !!(entity&&this.s.switches?.[entity.id]);
    },
    torch(ctx,x,y,seed){
      const f=this.mode==='standard'?Math.floor(this.t/150+seed)%3:0,fire=this.realm===3&&!this.purified;
      rect(ctx,x-3,y+3,6,2,C.ink);rect(ctx,x-2,y+2,4,2,C.goldDark);rect(ctx,x-1,y+4,2,3,C.goldDark);
      rect(ctx,x-2,y-3,4,5,fire?'#ab4c42':'#477f77');rect(ctx,x-1,y-5-(f===1?1:0),2,7,fire?C.redLight:C.jade);rect(ctx,x,y-3,1,4,C.goldLight);
      ctx.globalAlpha=.045;rect(ctx,x-11,y-9,22,22,fire?C.redLight:C.jade);ctx.globalAlpha=1;
    },
    entity(ctx,e){
      const x=e.x*16,y=e.y*16;switch(e.type){
        case 'enemy':this.enemy(ctx,x,y,e.enemy);break;
        case 'item':this.item(ctx,x,y,e.item);break;
        case 'door':this.door(ctx,x,y,e.color);break;
        case 'stairs':this.stairs(ctx,x,y,(e.to??0)>(this.s.floor??0));if((e.requires||0)>(this.s.relics?.length||0)){rect(ctx,x+10,y+8,5,5,C.ink);rect(ctx,x+11,y+9,3,3,C.redLight);}break;
        case 'altar':this.altar(ctx,x,y);break;
        case 'relic':this.relic(ctx,x,y,e.relic);break;
        case 'npc':this.npc(ctx,x,y,e);break;
        case 'monument':this.monument(ctx,x,y);break;
        case 'switch':this.switch(ctx,x,y,e);break;
        case 'gate':this.gate(ctx,x,y,this.gateOpen(e));break;
        case 'seal':this.seal(ctx,x,y,e.requires);break;
        case 'chest':this.chest(ctx,x,y,e.requires);break;
        case 'choice':this.choice(ctx,x,y,e);break;
        case 'cache':this.chest(ctx,x,y,0);break;
        case 'finale':this.finale(ctx,x,y);break;
        case 'illusion':this.illusion(ctx,x,y,e);break;
        case 'resonator':this.resonator(ctx,x,y,e);break;
        case 'rescue':this.rescue(ctx,x,y,e);break;
        case 'tide':this.tide(ctx,x,y,e);break;
        case 'portal':this.portal(ctx,x,y,e);break;
        case 'fragment':this.fragment(ctx,x,y,e);break;
        case 'treasure':this.treasure(ctx,x,y,e);break;
      }
    },
    fragment(ctx,x,y,e={}){
      shadow(ctx,x,y,10);rect(ctx,x+3,y+12,10,2,'#74513c');line(ctx,x+4,y+11,8,C.gold);
      const bob=this.mode==='standard'?Math.round(Math.sin(this.t/650+(e.index||0))):0;
      octagon(ctx,x+8,y+5+bob,5,'#846847',.6);rect(ctx,x+6,y+1+bob,4,1,C.goldLight);rect(ctx,x+4,y+3+bob,8,5,C.gold);rect(ctx,x+5,y+2+bob,6,7,C.goldLight);rect(ctx,x+6,y+2+bob,2,4,'#fff4d1');rect(ctx,x+5,y+8+bob,6,1,'#9c693b');
      line(ctx,x+1,y+14,14,C.goldLight);rect(ctx,x+1,y+13,1,2,C.goldLight);rect(ctx,x+14,y+13,1,2,C.goldLight);
    },
    treasure(ctx,x,y,e={}){
      shadow(ctx,x,y,13);const id=String(e.treasure||e.item||e.artifact||e.kind||e.id||'iron');
      rect(ctx,x+1,y+12,14,3,'#594139');line(ctx,x+2,y+12,12,C.gold);rect(ctx,x+1,y+14,2,1,C.goldLight);rect(ctx,x+13,y+14,2,1,C.goldLight);
      if(id==='iron'){
        // A heavy sea-anchor iron bar, capped in gold.
        pixelPolygon(ctx,[[x+5,y-2],[x+10,y-2],[x+12,y+10],[x+4,y+10]],C.ink);rect(ctx,x+6,y,4,10,'#52737a');rect(ctx,x+7,y+1,1,7,'#a5c3ba');rect(ctx,x+4,y-1,8,3,C.gold);rect(ctx,x+4,y+9,8,3,C.gold);line(ctx,x+4,y-1,8,C.goldLight);rect(ctx,x+7,y+3,2,2,C.jade);line(ctx,x+4,y+10,8,C.goldLight);
      }else if(id==='lotus'){
        for(let i=0;i<5;i++){const xx=x+1+i*3,yy=y+6-Math.abs(i-2);pixelPolygon(ctx,[[xx,yy],[xx+2,yy-3],[xx+4,yy+1],[xx+3,y+10],[xx+1,y+10]],i%2?C.gold:C.goldLight);}rect(ctx,x+6,y+5,4,4,'#fff2bc');line(ctx,x+3,y+11,10,C.jadeDark);rect(ctx,x+7,y+1,2,5,C.jade);rect(ctx,x+8,y,1,4,'#e0f6d3');
      }else if(id==='thorn'){
        pixelPolygon(ctx,[[x+3,y-1],[x+10,y],[x+13,y+4],[x+12,y+8],[x+7,y+13],[x+3,y+14],[x+7,y+8],[x+7,y+5],[x+3,y+4]],C.ink);pixelPolygon(ctx,[[x+4,y],[x+10,y+1],[x+12,y+4],[x+11,y+7],[x+7,y+11],[x+5,y+12],[x+8,y+7],[x+8,y+4],[x+4,y+3]],'#d8d8ba');rect(ctx,x+5,y+1,3,2,'#fff0cc');pixelLine(ctx,x+10,y+4,x+7,y+9,'#9e9878');rect(ctx,x+3,y+3,4,2,C.red);rect(ctx,x+4,y+5,1,3,C.red);
      }else if(id==='tide'){
        pixelPolygon(ctx,[[x+3,y+3],[x+7,y],[x+12,y+2],[x+14,y+6],[x+12,y+11],[x+8,y+12],[x+4,y+10],[x,y+13],[x+1,y+7]],C.ink);pixelPolygon(ctx,[[x+4,y+3],[x+8,y+1],[x+11,y+3],[x+13,y+6],[x+11,y+10],[x+8,y+11],[x+4,y+9],[x+1,y+11],[x+2,y+7]],'#9ac4b6');octagon(ctx,x+8,y+6,3,'#447781');rect(ctx,x+8,y+5,2,3,'#e4e0b9');line(ctx,x+3,y+5,3,'#d8ead2');line(ctx,x+5,y+3,4,'#d8ead2');rect(ctx,x+1,y+10,2,2,C.goldLight);
      }else if(id==='ember'){
        pixelPolygon(ctx,[[x+2,y+5],[x+5,y+2],[x+8,y+5],[x+10,y],[x+14,y+6],[x+13,y+11],[x+8,y+13],[x+3,y+10]],C.ink);pixelPolygon(ctx,[[x+3,y+6],[x+5,y+3],[x+8,y+7],[x+10,y+2],[x+13,y+7],[x+12,y+10],[x+8,y+12],[x+4,y+9]],'#a64538');rect(ctx,x+6,y+7,5,3,'#f0af52');rect(ctx,x+8,y+5,2,6,'#ffe4a0');line(ctx,x+3,y+11,8,C.goldDark);rect(ctx,x+4,y+12,8,1,C.goldLight);
      }else{
        octagon(ctx,x+6,y+5,5,C.ink);octagon(ctx,x+6,y+5,4,C.gold);octagon(ctx,x+6,y+5,3,'#416678');octagon(ctx,x+10,y+8,5,C.ink);octagon(ctx,x+10,y+8,4,C.goldLight);octagon(ctx,x+10,y+8,3,'#8ac1bd');pixelLine(ctx,x+8,y+9,x+12,y+5,'#e4ead0');rect(ctx,x+8,y+12,2,2,C.gold);rect(ctx,x+3,y+1,2,2,C.goldLight);
      }
    },
    playerMotion(time=performance.now()){
      const state=this.engine.state||{},calm=this.motionMode()==='reduced';let px=(state.x||0)*CELL,py=(state.y||0)*CELL,walk=0;const m=this.engine.motion;
      if(m&&!calm){const f=clamp((time-m.start)/(m.duration||120),0,1);if(f<1){const q=1-Math.pow(1-f,2);px=(m.fromX+(m.toX-m.fromX)*q)*CELL;py=(m.fromY+(m.toY-m.fromY)*q)*CELL;walk=f<.5?1:-1;}}
      const cameraX=px/CELL,cameraY=py/CELL,attack=[...(this.effects||[])].reverse().find(e=>e.kind==='event'&&e.type==='attack'&&time>=e.start&&time-e.start<e.life);let pose='idle',facing=state.facing||'up';
      if(attack&&!calm){
        const phases=attack.meta.phases?.length||1,duration=attack.life/Math.min(3,phases),age=time-attack.start,f=(age%duration)/duration;
        pose=f<.26?'windup':f<.38?'strike':f<.5?'impact':'recover';facing=this.direction(attack.fromX,attack.fromY,attack.x,attack.y);
        const distance=Math.hypot(attack.x-attack.fromX,attack.y-attack.fromY)||1,lunge=f<.26?-.9*Math.sin(f/.26*Math.PI/2):f<.38?3.2*Math.sin((f-.26)/.12*Math.PI/2):f<.47?3.2:3.2*Math.max(0,1-(f-.47)/.53);
        px+=(attack.x-attack.fromX)/distance*lunge;py+=(attack.y-attack.fromY)/distance*lunge;
      }
      const drawnX=this.smoothing()?px:Math.round(px*NATIVE)/NATIVE,drawnY=this.smoothing()?py:Math.round(py*NATIVE)/NATIVE,lean=pose==='impact'?1.5:pose==='strike'?1:pose==='windup'?-.6:0,dx=facing==='left'?-lean:facing==='right'?lean:0,dy=facing==='up'?-lean:facing==='down'?lean:0;
      const profile=this.renderProfile({type:'player'},`actor_wukong_${facing}`);
      return {px,py,drawnX,drawnY,walk,pose,facing,attack,cameraX,cameraY,footX:drawnX+profile.groundX+dx,footY:drawnY+profile.groundY+dy-(walk&&!calm?1/3:0)};
    },
    player(ctx,x,y){
      const {px,py,drawnX,drawnY,walk,pose,facing,attack,footX,footY}=this.playerMotion(this.now);
      const magic=this.effects.find(e=>e.kind==='event'&&e.type==='magic'&&e.ability==='morph'&&this.now-e.start<e.life);
      this.groundShadow(ctx,px,py,`actor_wukong_${facing}`,13,{x:footX,y:footY});
      if(magic&&!this.calm&&(this.now-magic.start)/magic.life>.08&&(this.now-magic.start)/magic.life<.92){/* The single travelling cicada is drawn by the settled event. */}
      else this.monkey(ctx,drawnX,drawnY,false,facing,pose,walk);
      if(attack&&!this.calm&&(attack.meta.damage||0)>0){const f=(this.now-attack.start)/attack.life;if(f>.47&&f<.65){ctx.save();ctx.globalAlpha=.22;ctx.fillStyle=C.redLight;ctx.beginPath();ctx.ellipse(px+8,py+6,5,7,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
      if(this.engine.mode&&this.engine.mode!=='walk'){line(ctx,px+2,py+15,12,C.jade);rect(ctx,px+1,py+14,1,1,C.jade);rect(ctx,px+14,py+14,1,1,C.jade);}
    },
    direction(x,y,tx,ty){return Math.abs(tx-x)>Math.abs(ty-y)?tx>x?'right':'left':ty>y?'down':'up';},
    monkey(ctx,x,y,clone,facing='down',pose='idle',walk=0){
      const gold=clone?'#82cebd':C.gold,gl=clone?'#d0ffe0':C.goldLight,gd=clone?'#367d7b':C.goldDark,red=clone?'#4a9d9e':'#d35435',rd=clone?'#28636e':'#8f3633';
      const side=facing==='left'||facing==='right',back=facing==='up';ctx.save();ctx.translate(x,y);
      if(facing==='left'){ctx.translate(16,0);ctx.scale(-1,1);}
      const strike=pose==='strike'||pose==='impact',windup=pose==='windup',recover=pose==='recover';
      const lean=pose==='impact'?2:strike?1:windup?-1:0;ctx.translate(lean,(walk?Math.abs(walk)*-1:0)+(pose==='impact'?1:0));
      // Separate feet produce a readable two-contact walk, with the same gameplay foot point.
      rect(ctx,5,11,2,3+Math.max(0,walk),C.ink);rect(ctx,9,11,2,3+Math.max(0,-walk),C.ink);
      rect(ctx,4,14+Math.max(0,walk),3,1,gd);rect(ctx,9,14+Math.max(0,-walk),3,1,gd);
      // Long curling tail, vermilion banner and pheasant feathers own the silhouette.
      const tailX=side?-1:back?12:-1;pixelLine(ctx,tailX,7,tailX,12,C.ink,3);pixelLine(ctx,tailX+1,11,tailX+4,11,C.ink,3);pixelLine(ctx,tailX,7,tailX,12,gold,1);pixelLine(ctx,tailX+1,12,tailX+4,12,gold,1);rect(ctx,tailX-1,6,3,2,gd);rect(ctx,tailX,6,2,1,gl);
      rect(ctx,4,6,8,7,C.ink);rect(ctx,5,6,6,6,gold);rect(ctx,5,9,6,4,red);line(ctx,5,9,6,gl);rect(ctx,7,10,2,3,rd);
      if(back){rect(ctx,6,7,4,2,gd);rect(ctx,7,7,2,1,gl);}else{rect(ctx,6,6,4,3,gold);rect(ctx,7,7,2,2,gl);}
      const scarf=this.calm?0:this.mode==='standard'?Math.floor(this.t/180)%2:0;
      const ribbon=4,ribbonEnd=-7;
      pixelLine(ctx,ribbon,5,ribbonEnd,6+scarf,C.ink,4);pixelLine(ctx,ribbon,5,ribbonEnd,6+scarf,red,3);pixelLine(ctx,ribbonEnd,6+scarf,-12,3+scarf,red,2);pixelLine(ctx,ribbonEnd,8+scarf,-11,9+scarf,rd,1);
      rect(ctx,4,4,8,2,red);rect(ctx,side?2:back?11:2,5,4,2,red);line(ctx,5,5,6,clone?gl:'#f28255');
      // Tiger pelt remains visible under the golden cuirass.
      rect(ctx,5,10,6,3,'#dca24f');rect(ctx,5,11,2,1,'#573c2e');rect(ctx,9,10,2,1,'#573c2e');rect(ctx,7,12,2,1,'#573c2e');
      // Head silhouettes differ in all four directions; back has no face or eyes.
      rect(ctx,4,-3,8,8,C.ink);rect(ctx,3,-1,10,4,gd);rect(ctx,5,-3,6,7,gold);
      if(back){rect(ctx,5,-1,6,4,gd);rect(ctx,6,-2,4,3,gold);line(ctx,5,-2,6,gl);rect(ctx,8,1,2,2,gd);}
      else if(side){rect(ctx,7,-1,5,4,'#edc68c');rect(ctx,10,0,3,2,'#edc68c');rect(ctx,10,-1,1,1,C.ink);rect(ctx,11,2,2,1,gd);rect(ctx,5,0,2,2,gd);line(ctx,5,-2,7,gl);}
      else{rect(ctx,5,-1,6,4,'#edc68c');rect(ctx,6,0,1,1,C.ink);rect(ctx,9,0,1,1,C.ink);rect(ctx,7,2,2,1,gd);line(ctx,5,-2,6,gl);}
      rect(ctx,7,-4,2,1,gl);rect(ctx,5,-3,7,1,gl);
      const plumes=[[[7,-3],[4,-7],[0,-11],[-6,-12],[-10,-9]],[[10,-3],[9,-8],[5,-13],[0,-15],[-6,-14]]];
      for(const plume of plumes){for(let i=1;i<plume.length;i++)pixelLine(ctx,...plume[i-1],...plume[i],C.ink,2);for(let i=1;i<plume.length;i++)pixelLine(ctx,...plume[i-1],...plume[i],gl);const tip=plume[plume.length-1];rect(ctx,tip[0]-1,tip[1],3,1,red);}
      // The four attack key poses move the arm and actual staff, not only a VFX overlay.
      let hand=[12,8],tip=[13,-3],end=[13,14];
      if(side){hand=[12,7];tip=[14,-3];end=[12,14];}
      if(back){hand=[12,7];tip=[13,-5];end=[13,13];}
      if(windup){hand=[7,6];tip=[0,-7];end=[11,10];}
      if(strike){hand=side?[12,7]:back?[8,4]:[8,9];tip=side?[28,6]:back?[7,-18]:[8,27];end=side?[7,8]:back?[8,9]:[8,3];}
      if(pose==='impact'){hand=side?[13,8]:back?[8,3]:[8,10];tip=side?[27,10]:back?[10,-17]:[5,27];end=side?[8,5]:back?[7,9]:[9,4];}
      if(recover){hand=[12,6];tip=[19,0];end=[8,12];}
      if(!clone||pose!=='plate'){staffLine(ctx,tip[0],tip[1],end[0],end[1]);rect(ctx,hand[0],hand[1],2,3,gold);rect(ctx,hand[0],hand[1],1,1,gl);}
      rect(ctx,3,7,2,4,gd);rect(ctx,3,7,2,2,gold);ctx.restore();
    },
    npc(ctx,x,y,e={}){
      const id=String(e.sprite||e.portrait||e.archetype||e.character||e.npc||e.dialogue||'lantern').toLowerCase();
      shadow(ctx,x,y,12);
      if(/bajie|八戒|pig/.test(id)){
        rect(ctx,x+3,y+6,10,8,C.ink);rect(ctx,x+4,y+7,8,6,'#634c55');rect(ctx,x+5,y+8,6,4,'#bd9e7c');rect(ctx,x+3,y+2,10,6,'#cba88d');rect(ctx,x+1,y+1,3,4,'#ba8a7d');rect(ctx,x+12,y+1,3,4,'#ba8a7d');rect(ctx,x+5,y+4,6,3,'#e0b19a');rect(ctx,x+6,y+5,1,1,'#815862');rect(ctx,x+9,y+5,1,1,'#815862');rect(ctx,x+5,y+2,1,1,C.ink);rect(ctx,x+10,y+2,1,1,C.ink);line(ctx,x+4,y,8,'#382f40');rect(ctx,x+6,y-2,4,2,'#382f40');pixelLine(ctx,x+14,y-1,x+14,y+14,'#8b7861');line(ctx,x+10,y-1,7,'#bec4b5');for(let i=0;i<4;i++)rect(ctx,x+10+i*2,y-3,1,3,'#bec4b5');
      }else if(/white|善念|白衣|wutian/.test(id)){
        octagon(ctx,x+8,y+6,7,'#90b9b3',.35);rect(ctx,x+5,y+1,6,5,'#d4c8b0');rect(ctx,x+4,y+5,8,8,'#e1ded0');rect(ctx,x+3,y+11,10,3,'#acbfb6');rect(ctx,x+6,y+5,4,6,'#bdccc4');rect(ctx,x+7,y+7,2,2,'#8e9c9a');rect(ctx,x+6,y+3,1,1,'#616776');rect(ctx,x+9,y+3,1,1,'#616776');rect(ctx,x+5,y,6,1,'#a9a89e');
      }else if(/tang|唐僧|tripitaka/.test(id)){
        rect(ctx,x+4,y+6,8,8,'#e6c78f');rect(ctx,x+4,y+7,3,6,'#c57755');rect(ctx,x+8,y+8,3,6,'#bc594e');rect(ctx,x+5,y+1,6,5,'#d8b48a');rect(ctx,x+4,y-2,8,4,C.gold);rect(ctx,x+6,y-4,4,4,C.goldLight);rect(ctx,x+7,y-3,2,1,C.red);rect(ctx,x+6,y+3,1,1,C.ink);rect(ctx,x+9,y+3,1,1,C.ink);rect(ctx,x+1,y+1,1,13,C.goldDark);octagon(ctx,x+1,y,2,C.gold);line(ctx,x+4,y+12,8,C.goldDark);
      }else if(/nezha|哪吒/.test(id)){
        rect(ctx,x+5,y+6,6,7,'#bc5560');rect(ctx,x+5,y+8,6,3,'#e8bd9c');rect(ctx,x+5,y+1,6,5,'#e4b993');rect(ctx,x+3,y-1,3,3,'#30303d');rect(ctx,x+10,y-1,3,3,'#30303d');rect(ctx,x+5,y,6,1,'#3d2e3c');rect(ctx,x+6,y+3,1,1,C.ink);rect(ctx,x+9,y+3,1,1,C.ink);pixelLine(ctx,x,y+8,x+14,y+3,C.redLight);rect(ctx,x+3,y+13,4,2,C.gold);rect(ctx,x+9,y+13,4,2,C.gold);rect(ctx,x+4,y+14,2,1,C.redLight);rect(ctx,x+10,y+14,2,1,C.redLight);
      }else if(/qiao|灵儿|乔/.test(id)){
        rect(ctx,x+4,y+6,8,8,'#b6c5ba');rect(ctx,x+5,y+7,6,7,'#e1d7bb');rect(ctx,x+7,y+7,2,6,'#819e9c');rect(ctx,x+5,y+1,6,5,'#deb88d');rect(ctx,x+4,y-1,8,3,'#30303d');rect(ctx,x+6,y-3,4,3,'#30303d');rect(ctx,x+6,y+3,1,1,C.ink);rect(ctx,x+9,y+3,1,1,C.ink);rect(ctx,x+3,y+8,2,4,'#b7c7b7');rect(ctx,x+11,y+8,2,4,'#b7c7b7');
      }else{
        rect(ctx,x+4,y+6,8,7,C.ink);rect(ctx,x+5,y+6,6,6,'#a18c6b');rect(ctx,x+5,y+8,3,4,'#d4c3a0');rect(ctx,x+3,y+11,10,2,'#60594c');rect(ctx,x+5,y+1,6,6,C.ink);rect(ctx,x+6,y+1,4,5,'#c9ad83');rect(ctx,x+5,y+2,6,2,'#c9ad83');rect(ctx,x+7,y+4,1,1,C.ink);rect(ctx,x+9,y+4,1,1,C.ink);rect(ctx,x+7,y+6,3,1,'#eee2c4');rect(ctx,x+12,y+4,1,9,C.goldDark);rect(ctx,x+11,y+4,3,1,C.gold);rect(ctx,x+12,y+3,3,4,C.goldDark);rect(ctx,x+13,y+4,1,2,C.goldLight);
      }
      const bob=this.mode==='standard'?Math.round(Math.sin(this.t/650)):0;rect(ctx,x+7,y-6+bob,3,1,C.goldLight);rect(ctx,x+7,y-4+bob,1,1,C.goldLight);
    },
    illusion(ctx,x,y,e){
      const seen=!!this.s.revealed?.[e.id];shadow(ctx,x,y,13);rect(ctx,x+2,y+11,12,3,'#5b5553');line(ctx,x+3,y+11,10,C.goldDark);
      if(!seen){rect(ctx,x+4,y+5,8,6,'#a38a56');rect(ctx,x+5,y+1,6,5,'#d2b570');rect(ctx,x+6,y,4,1,C.goldLight);line(ctx,x+5,y+3,2,'#514847');line(ctx,x+9,y+3,2,'#514847');rect(ctx,x+7,y+7,2,3,'#e5c989');pixelLine(ctx,x+10,y+1,x+7,y+10,'#524553');rect(ctx,x+7,y+7,2,2,'#352737');}
      else{for(const [dx,dy]of[[2,11],[11,12],[3,3],[12,2]]){rect(ctx,x+dx,y+dy,2,2,C.goldDark);rect(ctx,x+dx,y+dy,1,1,C.gold);}line(ctx,x+5,y+9,6,C.jadeDark);rect(ctx,x+7,y+6,2,4,C.jadeDark);rect(ctx,x+7,y+7,2,1,C.jade);}
    },
    resonator(ctx,x,y,e){
      const active=this.s.switches?.[e.id];shadow(ctx,x,y,13);rect(ctx,x+2,y+11,12,3,C.goldDark);line(ctx,x+2,y+11,12,C.gold);
      rect(ctx,x+3,y+3,10,8,'#5c615a');line(ctx,x+2,y+3,12,'#b6aa79');line(ctx,x+4,y+1,8,C.gold);rect(ctx,x+6,y+5,4,5,active?C.goldLight:'#273e45');rect(ctx,x+7,y+6,2,3,active?'#fff1c0':C.blue);
      for(let i=0;i<3;i++){rect(ctx,x+i*5,y+3-i%2,2,2,C.goldDark);rect(ctx,x+i*5,y+4-i%2,1,1,C.gold);}
      if(active)octagon(ctx,x+8,y+7,6,C.goldLight,.5);
    },
    rescue(ctx,x,y,e){
      const rescued=!!(this.s.quests?.[e.quest]||this.s.rescued?.[e.quest]||this.s.rescued?.[e.id]);this.npc(ctx,x,y,{...e,sprite:e.sprite||e.quest||'lantern'});
      if(!rescued){rect(ctx,x+1,y+1,1,13,'#57717a');rect(ctx,x+14,y+1,1,13,'#57717a');line(ctx,x+1,y+1,14,'#a3a993');for(let i=0;i<3;i++)rect(ctx,x+3+i*4,y+1,1,12,'#566d75');rect(ctx,x+6,y+7,4,3,C.goldDark);rect(ctx,x+7,y+8,2,1,C.goldLight);}
      else{line(ctx,x+2,y+15,12,C.jade);rect(ctx,x+1,y+14,2,1,C.jade);rect(ctx,x+13,y+14,2,1,C.jade);}
    },
    tide(ctx,x,y,e){
      const high=(this.s.tides?.[e.group||this.floor.waterGroup]||'low')==='high';shadow(ctx,x,y,12);rect(ctx,x+6,y+3,4,10,'#56747c');rect(ctx,x+7,y+3,2,9,'#a0aaa0');octagon(ctx,x+8,y+6,5,C.goldDark);pixelLine(ctx,x+4,y+2,x+12,y+10,C.gold);pixelLine(ctx,x+4,y+10,x+12,y+2,C.gold);rect(ctx,x+7,y+5,2,2,C.goldLight);line(ctx,x+3,y+14,10,C.blue);line(ctx,x+5,y+(high?11:13),6,C.jade);
    },
    portal(ctx,x,y,e){
      let active=true;try{if(this.engine.requirements)active=this.engine.requirements(e).met;}catch(_){}
      rect(ctx,x+1,y+2,3,12,C.goldDark);rect(ctx,x+12,y+2,3,12,C.goldDark);line(ctx,x+2,y+1,12,C.gold);line(ctx,x+4,y,8,C.goldLight);rect(ctx,x+4,y+4,8,9,active?'#42716f':'#2a2d3d');
      for(let i=0;i<4;i++)line(ctx,x+5,y+5+i*2,6,i%2?active?C.jade:'#57516b':active?'#92c5ae':'#3e4155');rect(ctx,x+1,y+14,14,1,active?C.goldLight:'#655554');
    },
    switch(ctx,x,y,e){
      const active=this.s.switches?.[e.id];if(e.kind==='plate'){
        rect(ctx,x+2,y+8,12,6,C.ink);rect(ctx,x+3,y+8,10,4,active?'#57a79e':'#42656e');line(ctx,x+4,y+8,8,active?C.jade:C.blue);rect(ctx,x+5,y+9,6,2,active?'#b5e4c8':'#263e50');rect(ctx,x+7,y+8,2,4,active?C.goldLight:C.blue);
        const arriving=!this.calm&&this.effects.some(fx=>fx.kind==='event'&&fx.ability==='clone'&&fx.x===x&&fx.y===y&&this.now-fx.start<fx.life*.6);
        if(active&&!arriving){ctx.globalAlpha=.68;this.monkey(ctx,x,y-1,true,e.facing||'down','plate');ctx.globalAlpha=1;line(ctx,x+2,y+14,12,C.jade);}
      }else{
        rect(ctx,x+3,y+11,10,3,C.ink);rect(ctx,x+4,y+10,8,3,'#6d7770');line(ctx,x+4,y+10,8,'#acb49b');const d=active?1:-1;rect(ctx,x+7,y+5,2,6,'#9c8056');rect(ctx,x+7+d,y+3,2,3,'#9c8056');rect(ctx,x+6+d,y+2,4,3,active?C.jade:C.gold);rect(ctx,x+7+d,y+2,2,1,active?'#c7ecce':C.goldLight);rect(ctx,x+5,y+12,2,1,active?C.jade:C.goldDark);rect(ctx,x+9,y+12,2,1,active?C.jade:C.goldDark);
      }
    },
    enemy(ctx,x,y,id){
      if(id==='heart'||this.data().enemies[id]?.trait==='boss'){this.boss(ctx,x,y,0);return;}
      // Only spirits bob; heavy armoured creatures keep their feet grounded.
      const saved=this.reduced;this.reduced=this.calm||this.mode!=='standard';oldEnemy.call(this,ctx,x,y,id);this.reduced=saved;
      const trait=this.data().enemies[id]?.trait;
      if(trait==='first'){rect(ctx,x+13,y-3,2,3,C.redLight);rect(ctx,x+12,y,4,1,C.redLight);}
      if(trait==='magic'){rect(ctx,x+1,y+13,2,2,C.blue);rect(ctx,x+12,y+13,2,2,C.blue);}
      if(trait==='counter'){rect(ctx,x+1,y+9,1,2,C.redLight);rect(ctx,x+14,y+9,1,2,C.redLight);}
    },
    boss(ctx,x,y,phase=0){
      shadow(ctx,x,y,14);const col=phase===0?'#a5656a':phase===1?'#879baa':'#dcad6d';
      if(phase===0){
        for(let i=0;i<7;i++){const dx=i*3-2;rect(ctx,x+dx,y+6-Math.abs(i-3),3,8,'#49334e');line(ctx,x+dx,y+6-Math.abs(i-3),3,'#8d5b70');}
        rect(ctx,x+3,y+2,10,10,'#51374e');rect(ctx,x+5,y+3,6,7,col);rect(ctx,x+4,y-3,8,7,'#b47171');rect(ctx,x+4,y-1,8,2,'#e2ae82');line(ctx,x+4,y,3,C.ink);line(ctx,x+9,y,3,C.ink);rect(ctx,x+5,y,1,1,C.redLight);rect(ctx,x+10,y,1,1,C.redLight);rect(ctx,x+7,y+3,2,1,C.goldDark);
        for(let i=0;i<3;i++){rect(ctx,x+3+i*4,y-6-i%2*2,2,4,C.gold);rect(ctx,x+3+i*4,y-6-i%2*2,1,2,C.goldLight);}line(ctx,x+3,y-3,10,C.gold);
      }else if(phase===1){
        octagon(ctx,x+8,y+4,10,'#758c9e',.6);rect(ctx,x+4,y+4,8,9,'#475365');rect(ctx,x+5,y+5,6,8,'#82999c');rect(ctx,x+7,y+6,2,6,'#d2d5ba');rect(ctx,x+4,y-3,8,7,'#7d9b9e');rect(ctx,x+5,y-2,6,4,'#cad3be');line(ctx,x+5,y,2,C.ink);line(ctx,x+9,y,2,C.ink);rect(ctx,x+2,y+5,2,7,'#a4b6b1');rect(ctx,x+12,y+5,2,7,'#a4b6b1');staffLine(ctx,x-1,y-3,x-1,y+13);staffLine(ctx,x+16,y-3,x+16,y+13);
      }else{
        octagon(ctx,x+8,y+4,10,C.gold,.5);for(let i=0;i<5;i++){const dx=i*4-1;rect(ctx,x+dx,y+8-Math.abs(i-2)*2,4,6,'#b37f5e');line(ctx,x+dx,y+8-Math.abs(i-2)*2,4,C.goldLight);}rect(ctx,x+4,y+2,8,10,'#e5bb76');rect(ctx,x+6,y+3,4,8,'#ffdf99');rect(ctx,x+5,y-4,6,7,'#f1d39a');rect(ctx,x+6,y-3,4,5,'#fff0b9');line(ctx,x+6,y,1,'#8e6e62');line(ctx,x+9,y,1,'#8e6e62');rect(ctx,x+7,y+2,2,1,'#9e7763');rect(ctx,x+6,y-6,4,2,C.gold);rect(ctx,x+7,y-8,2,2,C.goldLight);
      }
      rect(ctx,x+7,y+7,2,2,C.goldLight);line(ctx,x+2,y+14,12,C.goldDark);
    },
    tacticalHints(ctx,entities){
      const mode=this.engine.mode,s=this.s;
      const hint=this.planningHint;
      if(hint){
        let x=hint.fromX,y=hint.fromY;const points=[[x*16+8,y*16+12]];
        for(const step of hint.path){const [dx,dy]=window.TowerRules.directions[step];x+=dx;y+=dy;points.push([x*16+8,y*16+12]);}
        ctx.save();ctx.strokeStyle=C.jade;ctx.lineWidth=this.material?.6:.5;ctx.lineJoin='round';ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();
        ctx.fillStyle=C.jade;for(const [px,py]of points.slice(1,-1)){ctx.beginPath();ctx.arc(px,py,.6,0,Math.PI*2);ctx.fill();}
        ctx.strokeStyle=C.goldLight;ctx.lineWidth=.7;ctx.setLineDash([1.1,1.3]);ctx.beginPath();ctx.ellipse(hint.enemy.x*16+8,hint.enemy.y*16+13,6,2,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        const gx=hint.x*16+8,gy=hint.y*16+12;ctx.strokeStyle=C.jade;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(gx,gy,6,2,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      if(['staff','morph','clone'].includes(mode))for(let y=1;y<this.floor.map.length-1;y++)for(let x=1;x<this.floor.map[y].length-1;x++){
        const distance=Math.abs(s.x-x)+Math.abs(s.y-y),entity=entities.find(e=>e.x===x&&e.y===y);
        const valid=mode==='clone'?entity?.type==='switch'&&entity.kind==='plate'&&!s.switches?.[entity.id]&&distance<=4:distance===1&&(this.tile(x,y)===(mode==='staff'?'~':'=')||mode==='morph'&&entity?.morphable);
        if(!valid)continue;const cost=this.engine.abilityCost?.(mode)??(mode==='clone'?2:1),enough=this.engine.abilityPreview?this.engine.abilityPreview(mode,x,y).possible:(s.mana||0)>=cost,color=enough?C.jade:C.redLight;
        ctx.globalAlpha=.18;rect(ctx,x*16+1,y*16+1,14,14,color);ctx.globalAlpha=1;
        line(ctx,x*16+2,y*16+2,12,color);line(ctx,x*16+2,y*16+13,12,color);rect(ctx,x*16+2,y*16+2,1,12,color);rect(ctx,x*16+13,y*16+2,1,12,color);
        // One or two visible pips echo the real mana cost.
        for(let i=0;i<cost;i++)rect(ctx,x*16+6+i*3,y*16+11,2,2,color);
      }
      const selected=this.engine.selection,entity=selected&&entities.find(e=>e.x===selected.x&&e.y===selected.y);if(!entity)return;
      let linked=[];
      if(entity.type==='gate')linked=entities.filter(e=>['switch','resonator'].includes(e.type)&&(entity.controls?entity.controls.includes(e.controlId||e.id):!!entity.group&&e.group===entity.group));
      if(['switch','resonator'].includes(entity.type))linked=entities.filter(e=>e.type==='gate'&&(e.controls?e.controls.includes(entity.controlId||entity.id):!!entity.group&&e.group===entity.group));
      const vowKeys=e=>(this.data().choices?.[e.choice]?.options||[]).flatMap(o=>Object.keys(o.reward?.quests||{}));
      if(entity.type==='choice'){const keys=vowKeys(entity);linked=entities.filter(e=>e.type==='gate'&&(e.requiresQuests||[]).some(q=>keys.includes(q)));}
      if(entity.type==='gate'&&entity.requiresQuests?.length)linked.push(...entities.filter(e=>e.type==='choice'&&vowKeys(e).some(q=>entity.requiresQuests.includes(q))));
      for(const e of linked){ctx.globalAlpha=.8;line(ctx,e.x*16+2,e.y*16+2,12,C.goldLight);line(ctx,e.x*16+2,e.y*16+13,12,C.goldLight);rect(ctx,e.x*16+2,e.y*16+2,1,12,C.goldLight);rect(ctx,e.x*16+13,e.y*16+2,1,12,C.goldLight);ctx.globalAlpha=1;}
    },
    ambient(ctx){
      if(this.mode!=='standard')return;
      // Secondary scenery is quiet while the player is choosing or examining a target.
      if(this.engine.mode==='inspect'||this.engine.selection)return;
      const count=this.realm===2?6:8;
      const width=this.floor.map[0].length*CELL,height=this.floor.map.length*CELL;for(let i=0;i<count;i++){const xx=Math.round((hash(i,3,this.s.floor)*width+Math.sin(this.t/3500+i)*2+width)%width),yy=Math.round((hash(i,7,this.s.floor)*height-this.t/(150+i*9)+height*20)%height);ctx.globalAlpha=.16+(Math.sin(this.t/950+i)*.5+.5)*.16;rect(ctx,xx,yy,1/3,1/3,i%4===0?C.goldLight:this.theme.mist);}ctx.globalAlpha=1;
    },
    insect(ctx,x,y,phase=0){
      const flap=this.mode==='standard'&&phase%2;rect(ctx,x-1,y-1,3,4,C.ink);rect(ctx,x,y-1,1,4,C.gold);rect(ctx,x-3,y+(flap?-2:0),2,2,'#a9d8c1');rect(ctx,x+2,y+(flap?-2:0),2,2,'#a9d8c1');rect(ctx,x,y-2,1,1,C.goldLight);
    },
    combatStrike(ctx,e,f){
      if(f<.25||f>.79)return;
      const dx=e.x-e.fromX,dy=e.y-e.fromY,angle=Math.atan2(dy,dx),q=clamp((f-.25)/.14,0,1),fade=f<.47?1:Math.max(0,1-(f-.47)/.32),x=e.x+8,y=e.y+5;
      ctx.save();ctx.globalAlpha=fade;
      if(this.material){
        ctx.translate(x,y);ctx.rotate(angle);
        const shine=ctx.createLinearGradient(-17,0,6,0);shine.addColorStop(0,'rgba(197,132,49,0)');shine.addColorStop(.48,'rgba(230,170,69,.55)');shine.addColorStop(.86,'#ffe6a5');shine.addColorStop(1,'#fff6d5');
        ctx.fillStyle=shine;ctx.beginPath();ctx.moveTo(-19,-6);ctx.bezierCurveTo(-8,-8,2,-5,5*q,1);ctx.bezierCurveTo(0,-1,-7,-3,-19,-6);ctx.fill();
        ctx.strokeStyle='#ffdf94';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-15,-5);ctx.quadraticCurveTo(-4,-5,4*q,0);ctx.stroke();
        if(f>=.38){const age=clamp((f-.38)/.41,0,1);ctx.globalAlpha=fade*(1-age)*.8;ctx.strokeStyle=C.goldLight;ctx.lineWidth=.4;ctx.beginPath();ctx.ellipse(0,0,2+age*5,1.5+age*3,0,0,Math.PI*2);ctx.stroke();
          for(let i=0;i<6;i++){const a=-1.2+i*.48,r=2+age*(6+i%3);ctx.strokeStyle=i%2?'#f0b865':'#fff1c5';ctx.lineWidth=i%2?.35:.55;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*(r+1.5),Math.sin(a)*(r+1.5));ctx.stroke();}}
      }else{
        const nx=-dy/16,ny=dx/16;pixelLine(ctx,e.fromX+8+nx*3,e.fromY+5+ny*3,x*q+(e.fromX+8)*(1-q),y*q+(e.fromY+5)*(1-q),C.goldLight,2/3);
        if(f>=.38){const r=2+(f-.38)*12;for(let i=0;i<6;i++){const a=i*Math.PI/3;pixelLine(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(a)*(r+2),y+Math.sin(a)*(r+2),i%2?C.gold:C.white,2/3);}}
      }ctx.restore();
    },
    drawParticles(ctx,time){
      this.effects=this.effects.filter(e=>time-e.start<e.life);
      for(const e of this.effects){
        if(e.kind!=='event')continue;const f=clamp((time-e.start)/e.life,0,1),x=e.x,y=e.y,dx=x-e.fromX,dy=y-e.fromY,meta=e.meta||{};
        if(this.calm){
          // Zero moving particles, slashes, rings, number travel, or scene movement.
          // A fixed, brief outline gives the settled action a visible acknowledgement.
          if(time-e.start<260){const col=e.type==='attack'?C.redLight:e.type==='magic'?C.jade:C.goldLight;line(ctx,x+2,y+2,12,col);line(ctx,x+2,y+14,12,col);rect(ctx,x+2,y+2,1,12,col);rect(ctx,x+14,y+2,1,12,col);}
          continue;
        }
        // The four-frame effects atlas supplies the illustrated ink/leaf-gold
        // fragments. Geometry below traces real endpoints and material motion.
        const fxId=e.type==='attack'?'fx_staff':e.type==='magic'?e.ability==='morph'?null:e.ability==='clone'||e.ability==='recall'?'fx_clone':e.ability==='staff'?'fx_staff':null:e.type==='door'?'fx_door':e.type==='pickup'?'fx_pickup':['relic','selfAwaken','awakening'].includes(e.type)?'fx_relic':e.type==='hit'?'fx_hit':null;
        const fxStart=e.type==='attack'?.2:e.type==='magic'&&['staff','morph','clone'].includes(e.ability)?.43:0,fxEnd=e.type==='attack'?.72:.88;
        if(fxId&&f>=fxStart&&f<fxEnd){const progress=(f-fxStart)/(fxEnd-fxStart);ctx.save();ctx.globalAlpha=(this.mode==='simple'?.44:.68)*Math.sin(Math.PI*progress);
          if(e.type==='attack'||e.ability==='staff'){ctx.translate(x+8,y+5);ctx.rotate(Math.atan2(dy,dx));this.asset(ctx,fxId,-12,-11,24,22,Math.min(3,Math.floor(progress*4)));}
          else this.asset(ctx,fxId,x-5,y-11,26,26,Math.min(3,Math.floor(progress*4)));ctx.restore();}
        if(e.type==='attack'){
          const boss=!!meta.phases?.length;const p=boss?Math.min(2,Math.floor(f*3)):0,local=boss?(f*3)%1:f;
          if(local<.9){const recoil=local>.47?Math.sin(clamp((local-.47)/.43,0,1)*Math.PI)*2.4:0,length=Math.hypot(dx,dy)||1,xx=x+dx/length*recoil,yy=y+dy/length*recoil;ctx.save();ctx.globalAlpha=local<.55?1:Math.max(0,(.9-local)/.35);if(local>=.38&&local<.47)ctx.filter='brightness(1.6)';if(boss)this.boss(ctx,xx,yy,p);else if(meta.enemy)this.enemy(ctx,xx,yy,typeof meta.enemy==='string'?meta.enemy:meta.enemy.id);ctx.restore();}
          this.combatStrike(ctx,e,local);
          if(local>.48&&this.mode==='standard'){
            const enemy=typeof meta.enemy==='string'?this.data().enemies[meta.enemy]:meta.enemy||{},trait=enemy.trait||'',age=(local-.48)*20;
            ctx.globalAlpha=Math.max(0,1-(local-.48)*2);
            if(trait==='armor'||/stone|brass|furnace/.test(String(meta.enemy))){for(let i=0;i<5;i++)rect(ctx,x+3+i*3+(i-2)*age*.1,y+9+age*(.2+Math.abs(i-2)*.2),2,2,i%2?this.theme.light:C.goldDark);}
            else if(trait==='magic'){for(let i=0;i<5;i++)line(ctx,x+3+i*2+Math.sin(i)*age*.2,y+6-age*.2+i,2,i%2?C.blue:C.purple);}
            else{for(let i=0;i<4;i++)rect(ctx,x+3+i*3,y+11+age*.25,2,1,i%2?C.goldDark:this.theme.moss);}
            ctx.globalAlpha=1;
          }
        }else if(e.type==='magic'){
          const ability=e.ability;
          if(['clone','recall'].includes(ability)&&meta.targets){for(const target of meta.targets){const tx=target.x*16+8,ty=target.y*16+8,q=clamp(f/.7,0,1);ctx.save();ctx.globalAlpha=Math.sin(Math.PI*f)*.8;pixelLine(ctx,x+8,y+8,x+8+(tx-x-8)*q,y+8+(ty-y-8)*q,C.jade,1/3);if(q===1)octagon(ctx,tx,ty,4,C.goldLight,Math.sin(Math.PI*f));ctx.restore();}}
          if(ability==='staff'){
            const progress=clamp(f/.62,0,1);staffLine(ctx,e.fromX+8,e.fromY+8,e.fromX+8+dx*progress,e.fromY+8+dy*progress);
            if(f>.5&&f<.85){line(ctx,x+2,y+12,12,C.goldLight);rect(ctx,x+1,y+10,2,2,C.gold);rect(ctx,x+13,y+10,2,2,C.gold);}
          }else if(ability==='morph'){
            const p=f<.58?clamp(f/.58,0,1):clamp(1-(f-.58)/.42,0,1),xx=e.fromX+8+dx*p,yy=e.fromY+7+dy*p-Math.sin(p*Math.PI)*4;
            this.insect(ctx,xx,yy,Math.floor(f*14));
            if(f>.4&&f<.7){rect(ctx,x+8,y+7,3,3,C.goldDark);rect(ctx,x+9,y+8,1,1,C.goldLight);rect(ctx,x+11,y+11+(f-.4)*9,2,2,'#93aaa3');}
          }else if(ability==='clone'){
            if(f<.6){const p=f/.6,xx=e.fromX+8+dx*p,yy=e.fromY+7+dy*p-Math.sin(p*Math.PI)*8;pixelLine(ctx,xx,yy,xx+2,yy-3,C.goldLight);if(this.mode==='standard'){for(let i=0;i<3;i++)rect(ctx,xx+Math.cos(f*22+i*2)*4,yy+Math.sin(f*22+i*2)*3,1,1,C.jade);}}
            else{const p=(f-.6)/.4;ctx.globalAlpha=.35+p*.5;this.monkey(ctx,x,y-1-(1-p)*4,true,'down','plate');ctx.globalAlpha=1;line(ctx,x+2,y+13,12,C.jade);}
          }else if(ability==='recall'){
            const p=clamp(f/.8,0,1);ctx.globalAlpha=1-p;this.monkey(ctx,x-dx*p,y-dy*p-Math.sin(p*Math.PI)*5,true,'down','plate');ctx.globalAlpha=1;if(f>.65)rect(ctx,e.fromX+8,e.fromY+3,1,3,C.goldLight);
          }else if(ability==='eye'){
            const p=clamp(f/.5,0,1);pixelLine(ctx,e.fromX+7,e.fromY+2,e.fromX+7+dx*p,e.fromY+2+dy*p,C.goldLight);pixelLine(ctx,e.fromX+10,e.fromY+2,e.fromX+10+dx*p,e.fromY+2+dy*p,C.gold);
            if(f>.4){octagon(ctx,x+8,y+7,7,C.jade,.8*(1-f));}
          }else if(ability==='tide'){
            for(const tile of this.floor.waterTiles||[]){const yy=tile.y*16+15-f*14;ctx.globalAlpha=1-f*.7;line(ctx,tile.x*16+2,yy,12,C.blue);line(ctx,tile.x*16+4,yy+2,8,C.jade);}ctx.globalAlpha=1;
          }else if(ability==='resonance'){
            const tower=this.floor.landmarks?.find(m=>m.type==='pagoda'),tx=tower?(tower.x+tower.w/2)*16:x+8,ty=tower?(tower.y+tower.h/2)*16:y-14,p=clamp(f/.7,0,1);pixelLine(ctx,x+8,y+4,x+8+(tx-x-8)*p,y+4+(ty-y-4)*p,C.goldLight);
            if(f>.6){octagon(ctx,tx,ty,9,C.goldLight,.7*(1-f));octagon(ctx,tx,ty,5,C.jade,.7*(1-f));}
          }else if(ability==='rescue'){
            ctx.globalAlpha=1-f;for(const side of [-1,1]){const xx=x+8+side*(5+f*6);rect(ctx,xx,y+2,1,10,'#a5b6a7');line(ctx,xx-side*2,y+4,3,C.goldLight);}ctx.globalAlpha=1;
          }else{
            // Actual mechanism transmission, not a shower of indistinguishable particles.
            const color=meta.active===false?C.goldDark:C.jade;line(ctx,x+3,y+3,10,color);line(ctx,x+3,y+13,10,color);rect(ctx,x+3,y+3,1,10,color);rect(ctx,x+13,y+3,1,10,color);
            if(meta.targets)for(const target of meta.targets){pixelLine(ctx,x+8,y+8,target.x*16+8,target.y*16+8,color);}
          }
        }else if(e.type==='door'){
          const color=meta.color==='blue'?C.blue:meta.color==='red'?C.redLight:C.gold;
          ctx.globalAlpha=1-f;
          const resourceId=meta.type==='gate'?'prop_gate':`prop_door_${meta.color||'yellow'}`;
          const png=window.TowerAssets?.get?.(resourceId);
          if(png){ctx.save();ctx.translate(x+8,y+16);if(meta.material==='stone'||meta.type==='gate')ctx.translate(0,-f*15);else ctx.scale(Math.max(.02,1-f),1);this.propArt(ctx,resourceId,-8,-16);ctx.restore();}
          else if(meta.material==='stone'||meta.type==='gate'){rect(ctx,x+1,y+2-f*12,14,12,this.theme.light);line(ctx,x+1,y+2-f*12,14,color);}
          else if(meta.material==='metal'){for(let i=0;i<2;i++){const xx=x+1+i*7+(i?1:-1)*f*7;rect(ctx,xx,y+2,7,12,'#50656a');line(ctx,xx,y+2,7,color);line(ctx,xx,y+12,7,color);rect(ctx,xx+2,y+5,2,5,color);}if(f<.3)rect(ctx,x+7,y+7,2,2,C.goldLight);}
          else{for(let i=0;i<4;i++){const drift=(i<2?-1:1)*f*6;rect(ctx,x+2+i*3+drift,y+3+f*(3+i),2,11,color);line(ctx,x+2+i*3+drift,y+3+f*(3+i),2,C.goldLight);}}
          ctx.globalAlpha=1;
        }else if(e.type==='pickup'){
          const item=meta.item||meta.itemId,col=this.data().items[item]?.kind==='def'?C.blue:this.data().items[item]?.kind==='atk'?C.redLight:C.goldLight;
          const p=1-Math.pow(1-f,2),tx=(this.s.x??x/16)*16,ty=(this.s.y??y/16)*16-8;
          ctx.globalAlpha=1-f*.65;if(meta.treasure){this.treasure(ctx,x+(tx-x)*p,y+(ty-y)*p,{treasure:meta.treasure});}else if(item){this.item(ctx,x+(tx-x)*p,y+(ty-y)*p,item);}else{rect(ctx,x+7+(tx-x)*p,y+6+(ty-y)*p,3,3,col);}ctx.globalAlpha=1;
          if(this.mode==='standard'&&f<.4){line(ctx,x+3,y+2,10,col);rect(ctx,x+1,y+5,1,3,col);rect(ctx,x+14,y+5,1,3,col);}
        }else if(e.type==='relic'&&meta.fragment!==undefined){
          const r=3+Math.sin(f*Math.PI)*5;ctx.globalAlpha=1-f*.8;octagon(ctx,x+8,y+5,r,C.goldLight,.65*(1-f));rect(ctx,x+6,y+2-f*6,4,4,C.goldLight);rect(ctx,x+7,y+2-f*6,1,2,'#fff5ce');if(this.mode==='standard'&&f<.65){line(ctx,x+2-f*3,y+5,3,C.gold);line(ctx,x+11+f*3,y+5,3,C.gold);}ctx.globalAlpha=1;
        }else if(e.type==='relic'||e.type==='selfAwaken'||e.type==='awakening'){
          const cx=x+8,cy=y+6,count=meta.externalRelics??this.s.externalRelics??16;
          const r=this.mode==='simple'?20:12+clamp(f/.35,0,1)*26;
          ctx.globalAlpha=f>.8?(1-f)/.2:.75;
          for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,xx=cx+Math.cos(a)*r,yy=cy+Math.sin(a)*r;rect(ctx,xx-1,yy-1,3,3,i<count?C.goldLight:'#6c5d77');}
          ctx.globalAlpha=1;
          if(f>.2&&f<.7){octagon(ctx,cx,cy,Math.round(r*.8),C.gold,.28);octagon(ctx,cx,cy,Math.round(r*.56),C.jade,.22);}
          if(this.s.selfAwakened||e.type==='selfAwaken'){ctx.globalAlpha=Math.min(1,f*3);this.monkey(ctx,cx-8,cy-7,true,'down');ctx.globalAlpha=1;}
          else{rect(ctx,cx-1,cy-1,2,2,C.goldLight);}
        }else if(e.type==='hit'){
          if(f<.6){ctx.globalAlpha=.6*(1-f);rect(ctx,x+3,y+1,10,13,C.redLight);ctx.globalAlpha=1;}
        }
      }
      ctx.globalAlpha=1;
    },
    floatingText(ctx,time){
      ctx.font='bold 15px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      const v=this.projection(),scale=v.cellSize/CELL;
      for(const e of this.effects){if(e.kind!=='text')continue;const age=time-e.start;if(age<0)continue;const f=clamp(age/e.life,0,1);if(this.calm&&age>500)continue;if(e.x<v.x*16||e.x>=(v.x+v.w)*16||e.y<v.y*16||e.y>=(v.y+v.h)*16)continue;ctx.globalAlpha=this.calm?1:Math.min(1,(1-f)*3);const x=clamp(v.offsetX+(e.x-v.x*16)*scale,35,Math.max(35,v.cssWidth-35)),y=Math.max(19,v.offsetY+(e.y-v.y*16)*scale-(this.mode==='standard'?20*f:0));ctx.lineWidth=4;ctx.strokeStyle='#111820';ctx.strokeText(e.text,x,y);ctx.fillStyle=e.color;ctx.fillText(e.text,x,y);}ctx.globalAlpha=1;
    }
  });
  // Raster atlas bindings. Code silhouettes above are a safe fallback for a
  // missing local file; after preload the actual board and all cards use PNGs.
  const legacyArt={};for(const name of ['monkey','enemy','npc','boss','item','door','stairs','bars','altar','relic','monument','gate','seal','chest','finale','choice','illusion','resonator','rescue','tide','portal','switch','fragment','treasure','torch','insect'])legacyArt[name]=TowerRenderer.prototype[name];
  Object.assign(TowerRenderer.prototype,{
    propArt(ctx,id,x,y,frame=0){
      const meta=window.TowerAssets?.get?.(id);if(!meta)return false;
      if(this.smoothing()&&!this.card&&meta.anchor&&!/^prop_(stairs_down|plate|portal|rescue|gate_open)/.test(id))this.groundShadow(ctx,x,y,id,10);
      return meta.anchor?this.sprite(ctx,id,x+8,y+16,frame):this.asset(ctx,id,x,y,16,16,frame);
    },
    stateMark(ctx,x,y,active,color=C.jade){
      if(this.smoothing()){ctx.save();ctx.globalAlpha=active?.65:.3;ctx.strokeStyle=active?color:'#71807b';ctx.lineWidth=.4;ctx.beginPath();ctx.ellipse(x+8,y+14.4,5.7,1.5,0,0,Math.PI*2);ctx.stroke();if(active){ctx.strokeStyle=C.goldLight;ctx.beginPath();ctx.moveTo(x+8,y+12.8);ctx.lineTo(x+8.8,y+13.6);ctx.lineTo(x+8,y+14.4);ctx.lineTo(x+7.2,y+13.6);ctx.closePath();ctx.stroke();}ctx.restore();return;}
      ctx.save();ctx.globalAlpha=active?.9:.5;ctx.fillStyle=active?color:'#4c7777';ctx.beginPath();ctx.ellipse(x+8,y+14.4,5.7,1.1,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(active){line(ctx,x+6,y+13+2/3,4,C.goldLight);rect(ctx,x+7+2/3,y+12+2/3,2/3,2,C.goldLight);}ctx.restore();
    },
    monkey(ctx,x,y,clone,facing='down',pose='idle',walk=0){
      // The shipped rows contain idle, two real walk contacts and one extended
      // staff pose. Anticipation/recovery reuse idle with a directional lunge;
      // strike and impact use the actual attack frame, never a walking frame.
      const frame=pose==='strike'||pose==='impact'?3:pose==='windup'||pose==='recover'?0:walk>0?1:walk<0?2:0;
      const id=`actor_wukong_${facing}`,lean=pose==='impact'?1.5:pose==='strike'?1:pose==='windup'?-.6:0;
      const dx=facing==='left'?-lean:facing==='right'?lean:0,dy=facing==='up'?-lean:facing==='down'?lean:0;
      ctx.save();if(clone)ctx.globalAlpha*=.62;
      if(!clone)this.bootContacts(ctx,id,frame,x+8+dx,y+16+dy-(walk&&!this.calm?1/3:0));
      const drawn=this.sprite(ctx,id,x+8+dx,y+16+dy-(walk&&!this.calm?1/3:0),frame);
      ctx.restore();
      if(!drawn){legacyArt.monkey.call(this,ctx,x,y,clone,facing,pose,walk);return;}
      if(clone)this.stateMark(ctx,x,y,true);
    },
    enemy(ctx,x,y,id){
      const enemy=this.data().enemies[id]||{};if(enemy.trait==='boss'){this.boss(ctx,x,y,0);return;}
      let kind=enemy.trait==='armor'?'guard':enemy.trait==='magic'?'ghost':enemy.trait==='counter'?'yaksha':enemy.trait==='venom'?'spider':'imp';
      if(/dragon|flood|龙|蛟/.test(id+' '+enemy.name))kind='dragon';else if(/acolyte|bone|archivist|monk|僧|禅/.test(id+' '+enemy.name))kind='monk';else if(/stone|石|卫/.test(id+' '+enemy.name))kind='guard';
      const bob=(enemy.trait==='magic'||id==='bat')&&this.mode==='standard'?Math.sin(this.t/650+x)*1/3:0;this.groundShadow(ctx,x,y,`enemy_${id}`,12);
      if(!this.sprite(ctx,`enemy_${id}`,x+8,y+16,0,1,{y:bob})&&!this.sprite(ctx,`enemy_${kind}`,x+8,y+16,0,1,{y:bob})){legacyArt.enemy.call(this,ctx,x,y,id);return;}
      // Small glyphs identify dangerous combat families without repainting the
      // illustrated character or hiding the engine's exact damage labels.
      const col=enemy.trait==='magic'?C.blue:enemy.trait==='counter'||enemy.trait==='venom'?C.redLight:enemy.trait==='first'?C.goldLight:null;
      if(col){ctx.save();ctx.globalAlpha=.85;line(ctx,x+2,y+15,12,col);ctx.restore();}
    },
    boss(ctx,x,y,phase=0){
      const id=`enemy_boss_${phase}`,frame=phase;this.groundShadow(ctx,x,y,id,14);
      if(this.sprite(ctx,id,x+8,y+16,0,1.12)||this.sprite(ctx,'enemy_boss',x+8,y+16,frame,1.12)||this.sprite(ctx,'enemy_heart',x+8,y+16,frame,1.12)){
        this.stateMark(ctx,x,y,true,phase===1?C.blue:phase===2?C.goldLight:C.redLight);return;
      }legacyArt.boss.call(this,ctx,x,y,phase);
    },
    npc(ctx,x,y,e={}){
      const raw=String(e.sprite||e.portrait||e.archetype||e.character||e.npc||e.dialogue||'lantern').toLowerCase();
      const id=/bajie|八戒|pig/.test(raw)?'bajie':/white|善念|白衣|wutian/.test(raw)?'whitewutian':/tang|唐僧|tripitaka/.test(raw)?'tangseng':/nezha|哪吒/.test(raw)?'nezha':/qiao|灵儿|乔/.test(raw)?'qiao':'lantern';
      this.groundShadow(ctx,x,y,`npc_${id}`,11);if(!this.sprite(ctx,`npc_${id}`,x+8,y+16)){legacyArt.npc.call(this,ctx,x,y,e);return;}
      rect(ctx,x+7+1/3,y-13,4/3,4/3,C.goldLight);
    },
    item(ctx,x,y,id){
      const item=this.data().items[id]||{},kind=item.kind||id,artId=kind==='key'?`key_${item.color||'yellow'}`:kind;
      if(!this.propArt(ctx,`item_${id}`,x,y)&&!this.propArt(ctx,`item_${artId}`,x,y))legacyArt.item.call(this,ctx,x,y,id);
    },
    door(ctx,x,y,color){if(!this.propArt(ctx,`prop_door_${color}`,x,y))legacyArt.door.call(this,ctx,x,y,color);},
    stairs(ctx,x,y,up){if(this.smoothing()&&!this.card&&!up){this.stairwell(ctx,x,y);return;}if(!this.propArt(ctx,`prop_stairs_${up?'up':'down'}`,x,y))legacyArt.stairs.call(this,ctx,x,y,up);},
    bars(ctx,x,y){
      ctx.save();const vertical=this.passageAxis(Math.round(x/16),Math.round(y/16))==='vertical';
      if(!vertical){ctx.translate(x+8,y+8);ctx.scale(.65,1);ctx.translate(-x-8,-y-8);}
      rect(ctx,x+1,y+1,14,14,'#152b2ded');
      for(const yy of [1,12]){rect(ctx,x,y+yy,16,2,'#586a66');line(ctx,x,y+yy,16,'#b4c4ac');}
      for(let i=0;i<4;i++){const xx=x+2+i*4;rect(ctx,xx,y+2,1.2,11,'#b2c3b3');rect(ctx,xx+1.2,y+2,.7,11,'#334d50');}
      rect(ctx,x+6,y+6,4,4,'#32665e');rect(ctx,x+7,y+7,2,2,C.jade);ctx.restore();
    },
    altar(ctx,x,y){if(!this.propArt(ctx,'prop_altar',x,y))legacyArt.altar.call(this,ctx,x,y);},
    relic(ctx,x,y,id){if(!this.propArt(ctx,`prop_relic_${id}`,x,y)&&!this.propArt(ctx,'prop_relic',x,y))legacyArt.relic.call(this,ctx,x,y,id);},
    monument(ctx,x,y){if(!this.propArt(ctx,'prop_monument',x,y))legacyArt.monument.call(this,ctx,x,y);},
    gate(ctx,x,y,open){if(open){if(this.propArt(ctx,'prop_gate_open',x,y,1)){this.stateMark(ctx,x,y,true);return;}rect(ctx,x,y+1,1,15,C.goldDark);rect(ctx,x+15,y+1,1,15,C.goldDark);line(ctx,x,y+1,16,C.goldLight);return;}if(!this.propArt(ctx,'prop_gate',x,y))legacyArt.gate.call(this,ctx,x,y,open);},
    seal(ctx,x,y,requires){const active=(this.s.relics?.length||0)>=(requires||0);if(active){this.stateMark(ctx,x,y,true,C.goldLight);return;}if(!this.propArt(ctx,'prop_seal',x,y))legacyArt.seal.call(this,ctx,x,y,requires);},
    chest(ctx,x,y,requires){
      const e=this.currentEntity,count=this.s.relics?.length||0,pending=e?.type==='cache'&&!this.s.choices?.[e.choice],locked=(requires||0)>count||pending||(e?.type==='chest'&&this.engine.requirements&&!this.engine.requirements(e).met);
      ctx.save();if(locked&&!this.card){ctx.globalAlpha=.83;if(this.smoothing())ctx.filter='saturate(.65) brightness(.9)';}if(!this.propArt(ctx,'prop_chest',x,y))legacyArt.chest.call(this,ctx,x,y,requires);ctx.restore();
      if(this.card)return;
      if(requires&&locked){const n=Math.min(5,requires);for(let i=0;i<n;i++){const xx=x+8+(i-(n-1)/2)*2.2;rect(ctx,xx-.7,y-1.8,1.4,1.4,i<count?C.goldLight:'#565b57');}}
      else if(pending){ctx.save();ctx.strokeStyle=C.jade;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x+8,y-2.5);ctx.lineTo(x+9.7,y-1);ctx.lineTo(x+8,y+.5);ctx.lineTo(x+6.3,y-1);ctx.closePath();ctx.stroke();ctx.restore();}
      else{ctx.save();ctx.strokeStyle=C.goldLight;ctx.globalAlpha=.65;ctx.lineWidth=.4;ctx.beginPath();ctx.ellipse(x+8,y+14.5,6.5,1.7,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    },
    finale(ctx,x,y){if(!this.propArt(ctx,'prop_finale',x,y))legacyArt.finale.call(this,ctx,x,y);this.stateMark(ctx,x,y,!!this.s.selfAwakened,C.goldLight);},
    choice(ctx,x,y,e){
      const chosen=this.s.choices?.[e.choice],active=e.option===undefined?chosen!==undefined:chosen===e.option,option=e.option||chosen;
      const color=option==='blue'?C.blue:option==='gold'||option==='passage'?C.goldLight:option==='free'||option==='offering'?C.jade:C.purple;
      if(!this.propArt(ctx,'prop_choice',x,y)){legacyArt.choice.call(this,ctx,x,y,{...e,option:e.option===undefined?'_uncommitted':e.option});this.stateMark(ctx,x,y,active,color);return;}
      this.stateMark(ctx,x,y,active,color);rect(ctx,x+6,y+4,4,1,color);
    },
    illusion(ctx,x,y,e){const seen=!!this.s.revealed?.[e.id];if(seen){this.stateMark(ctx,x,y,true);return;}if(!this.propArt(ctx,'prop_illusion',x,y))legacyArt.illusion.call(this,ctx,x,y,e);},
    resonator(ctx,x,y,e){if(!this.propArt(ctx,'prop_resonator',x,y,this.s.switches?.[e.id]?1:0))legacyArt.resonator.call(this,ctx,x,y,e);else this.stateMark(ctx,x,y,!!this.s.switches?.[e.id],C.goldLight);},
    rescue(ctx,x,y,e){const rescued=!!(this.s.quests?.[e.quest]||this.s.rescued?.[e.quest]||this.s.rescued?.[e.id]);this.npc(ctx,x,y,{...e,sprite:e.sprite||e.quest||'bajie'});if(rescued)this.stateMark(ctx,x,y,true);else if(!this.propArt(ctx,'prop_rescue',x,y)){rect(ctx,x+1,y,1,16,C.goldDark);rect(ctx,x+14,y,1,16,C.goldDark);for(let i=0;i<3;i++)rect(ctx,x+3+i*4,y,1/3,16,C.goldLight);}},
    tide(ctx,x,y,e){if(!this.propArt(ctx,'prop_tide',x,y)){legacyArt.tide.call(this,ctx,x,y,e);return;}const high=(this.s.tides?.[e.group||this.floor.waterGroup]||'low')==='high';line(ctx,x+4,y+(high?8:13),8,C.blue);},
    portal(ctx,x,y,e){let active=true;try{if(this.engine.requirements)active=this.engine.requirements(e).met;}catch(_){}if(!this.propArt(ctx,'prop_portal',x,y,active?1:0))legacyArt.portal.call(this,ctx,x,y,e);else this.stateMark(ctx,x,y,active);},
    switch(ctx,x,y,e){
      const active=!!this.s.switches?.[e.id];if(!this.propArt(ctx,e.kind==='plate'?'prop_plate':'prop_switch',x,y,active?1:0)){legacyArt.switch.call(this,ctx,x,y,e);return;}this.stateMark(ctx,x,y,active);
      const arriving=!this.calm&&this.effects.some(fx=>fx.kind==='event'&&fx.ability==='clone'&&fx.x===x&&fx.y===y&&this.now-fx.start<fx.life*.6);
      if(e.kind==='plate'&&active&&!arriving)this.monkey(ctx,x,y-1,true,e.facing||'down','plate');
    },
    fragment(ctx,x,y,e={}){if(!this.propArt(ctx,'prop_fragment',x,y)&&!this.propArt(ctx,'prop_relic',x,y))legacyArt.fragment.call(this,ctx,x,y,e);},
    treasure(ctx,x,y,e={}){const id=String(e.treasure||e.item||e.artifact||e.kind||'iron');if(!this.propArt(ctx,`treasure_${id}`,x,y))legacyArt.treasure.call(this,ctx,x,y,e);},
    torch(ctx,x,y,seed){if(!this.propArt(ctx,'prop_lamp',x-8,y-8,this.mode==='standard'?Math.floor(this.t/180+seed)%4:0))legacyArt.torch.call(this,ctx,x,y,seed);},
    insect(ctx,x,y,phase=0){legacyArt.insect.call(this,ctx,x,y,phase);}
  });
  // Portraits and card icons share the atlas and its real foot anchors.
  TowerRenderer.icon=function(canvas,type,id){
    if(type==='chest'){const m=window.TowerAssets?.get?.('prop_chest');if(m?.image){canvas.width=canvas.height=96;const c=canvas.getContext('2d'),b=m.contentBounds||[0,0,m.sourceW,m.sourceH],w=b[2]-b[0],h=b[3]-b[1],s=Math.min(80/w,80/h);c.imageSmoothingEnabled=window.TowerAssets.style==='material';canvas.style.imageRendering=c.imageSmoothingEnabled?'auto':'pixelated';c.clearRect(0,0,96,96);c.drawImage(m.image,(m.sx||0)+b[0],(m.sy||0)+b[1],w,h,(96-w*s)/2,(96-h*s)/2,w*s,h*s);return;}}
    const r=Object.create(TowerRenderer.prototype);r.engine={mode:'walk',state:{settings:{motion:'reduced'}}};r.t=0;r.now=0;r.reduced=true;r.calm=true;r.mode='reduced';r.card=true;r.s={floor:0,relics:[],switches:{},quests:{}};r.realm=0;r.theme=THEMES.jade;r.effects=[];
    const portrait=type==='portrait';canvas.width=canvas.height=96;const c=canvas.getContext('2d');c.imageSmoothingEnabled=r.smoothing();canvas.style.imageRendering=r.smoothing()?'auto':'pixelated';c.clearRect(0,0,96,96);c.save();c.scale(NATIVE,NATIVE);
    // The original icon path first squeezed detailed PNGs into a 24px temporary
    // canvas. Native-resolution card rendering avoids that irreversible loss.
    if(portrait)r.npc(c,8,15,{sprite:id});
    else if(type==='boss')r.boss(c,8,15,Number(id)||0);else if(type==='enemy')r.enemy(c,8,15,id);else if(type==='player')r.monkey(c,8,15,false,'down');else if(type==='fragment')r.fragment(c,8,10,{fragment:id});else if(type==='treasure')r.treasure(c,8,10,{treasure:id});else if(type==='relic')r.relic(c,8,10,id);else if(type==='altar')r.altar(c,8,10);else if(type==='stairs')r.stairs(c,8,10,true);else if(type==='npc')r.npc(c,8,15,{sprite:id});else r.item(c,8,10,id);c.restore();
  };
  TowerRenderer.backdrop=function(canvas,type='buddha'){
    const shipped=window.TowerAssets;if(shipped?.ready&&shipped.get?.(`landmark_${type}`)){
      const width=Number(canvas.getAttribute('width'))>=400?Number(canvas.getAttribute('width')):520,height=Number(canvas.getAttribute('height'))>=300?Number(canvas.getAttribute('height')):540;
      const smooth=(shipped.style||window.TowerStyle?.get?.())==='material';canvas.width=width;canvas.height=height;canvas.style.imageRendering=smooth?'auto':'pixelated';const out=canvas.getContext('2d');out.imageSmoothingEnabled=smooth;out.fillStyle=smooth?'#1d2227':'#174e50';out.fillRect(0,0,width,height);
      shipped.draw(out,'ui_backdrop',-width*.45,0,width*1.9,height);shipped.draw(out,`landmark_${type}`,width*.1,height*.035,width*.8,height*.85);
      shipped.draw(out,'actor_wukong_right',width*.43,height*.68,width*.19,height*.29,0);return;
    }
    // Shared art vocabulary for the title and the actual tower. No remote image assets.
    const r=Object.create(TowerRenderer.prototype);r.engine={mode:'walk',state:{settings:{motion:'reduced'}}};r.t=0;r.now=0;r.reduced=true;r.calm=true;r.mode='reduced';r.s={floor:0,relics:[],switches:{},quests:{},externalRelics:0};r.realm=0;r.theme=THEMES.jade;r.effects=[];
    const art=document.createElement('canvas');art.width=260;art.height=270;const c=art.getContext('2d');c.imageSmoothingEnabled=false;
    rect(c,0,0,260,270,'#141c20');
    const sun=Array.from({length:32},(_,i)=>{const a=i*Math.PI/16;return [164+Math.cos(a)*62,81+Math.sin(a)*62];});pixelPolygon(c,sun,'#ad4d37');octagon(c,164,81,62,'#ca6747');
    for(let i=0;i<28;i++){const x=105+Math.floor(hash(i,6)*117),y=22+Math.floor(hash(i,3)*118);if((x-164)**2+(y-81)**2<3400)rect(c,x,y,i%3===0?3:1,1,'#963f31');}
    // Weighty severed hand rises from the cloud sea beneath an impossible hanging shrine.
    pixelPolygon(c,[[0,139],[5,93],[14,80],[20,88],[17,131],[27,119],[32,61],[40,57],[45,65],[40,122],[50,119],[58,44],[66,42],[72,50],[66,121],[77,123],[88,67],[96,66],[101,74],[91,144],[108,158],[115,182],[105,207],[57,219],[5,198]],'#4d5a4e');
    pixelPolygon(c,[[6,141],[12,97],[16,90],[13,143],[32,133],[36,67],[39,65],[36,135],[53,133],[62,50],[66,49],[60,135],[80,137],[93,73],[96,73],[87,152],[102,163],[108,184],[99,200],[56,211],[12,192]],'#8f9475');
    pixelLine(c,20,158,74,181,'#bfb698',2);pixelLine(c,27,178,85,189,'#384d43',2);pixelLine(c,61,149,45,171,'#4c6150',2);pixelLine(c,88,144,70,166,'#c9bc98');pixelLine(c,52,107,68,126,'#253a34',2);pixelLine(c,68,126,49,151,'#253a34',2);pixelLine(c,53,109,65,125,'#b28c52');
    c.save();c.globalAlpha=.84;c.drawImage(r.architecture(type==='pagoda'?'buddha':type),-14,123,99,115);c.restore();
    for(let i=0;i<12;i++){const yy=i*5;rect(c,185,yy,4,4,'#8e8d72');rect(c,186,yy+1,2,1,'#283a37');}
    c.save();c.translate(178,73);c.rotate(Math.PI);c.drawImage(r.architecture('pagoda'),-35,-92,70,92);c.restore();
    pixelPolygon(c,[[130,166],[149,157],[178,163],[214,152],[239,168],[216,179],[177,182],[151,176]],'#273933');line(c,151,164,69,'#a08c5d');
    for(let i=0;i<6;i++){const yy=185+i*5;line(c,14+(i%2)*8,yy,232-i*9,i%2?'#2b423c':'#364d42');line(c,7+i*6,yy+2,153-i*7,'#192e2d');}
    // Foreground rock and broken pilgrim bridge frame a bright red, unmistakable hero.
    pixelPolygon(c,[[69,247],[88,220],[113,211],[146,217],[165,238],[186,247],[156,262],[80,270],[0,270],[0,256]],'#10191c');pixelPolygon(c,[[83,237],[96,221],[115,216],[141,222],[152,236]],'#72806a');line(c,90,233,58,'#c0b88e');line(c,85,237,70,'#465a4b');
    pixelPolygon(c,[[143,227],[149,217],[193,193],[200,196],[160,225]],'#65735c');pixelLine(c,151,218,195,193,'#c3b68a');pixelLine(c,160,225,201,198,'#33483c');
    c.save();c.translate(111,211);c.scale(1.55,1.55);r.monkey(c,0,0,false,'right');c.restore();
    // Loose leaf-gold fragments and a tiny vermilion maker's seal finish the print.
    for(let i=0;i<15;i++){const x=22+Math.floor(hash(i,2)*218),y=21+Math.floor(hash(i,7)*211);rect(c,x,y,1+(i%5===0),1,i%4===0?'#e6bc6b':'#7b896b');}
    rect(c,228,226,15,22,'#ad4936');line(c,231,230,8,'#dac19a');rect(c,233,231,1,12,'#dac19a');line(c,231,236,8,'#dac19a');rect(c,237,232,1,10,'#dac19a');line(c,231,242,8,'#dac19a');
    const width=Number(canvas.getAttribute('width'))>=400?Number(canvas.getAttribute('width')):520,height=Number(canvas.getAttribute('height'))>=300?Number(canvas.getAttribute('height')):540;
    canvas.width=width;canvas.height=height;canvas.style.imageRendering='pixelated';const out=canvas.getContext('2d');out.imageSmoothingEnabled=false;const scale=Math.max(width/260,height/270),dw=260*scale,dh=270*scale;out.fillStyle='#141c20';out.fillRect(0,0,width,height);out.drawImage(art,(width-dw)/2,(height-dh)/2,dw,dh);
  };
  window.TowerRenderer=TowerRenderer;
})();
