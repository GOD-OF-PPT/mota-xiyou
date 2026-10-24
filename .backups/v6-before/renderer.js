/* Qinglü mineral-pigment artwork. Simulation uses 16-unit cells; raster art is
   rendered at 48 native pixels per cell so the shipped atlas keeps its detail. */
(() => {
  'use strict';
  const CELL = 16, NATIVE = 3, SIZE = 208 * NATIVE;
  const THEMES = {
    jade:    {void:'#174e50',wall:'#297974',light:'#91b7a0',edge:'#184b4c',floor:'#e0cea2',floor2:'#e5d4ad',line:'#c4b484',moss:'#f0da9d',glow:'#edbd68',mist:'#e4d7b1'},
    amber:   {void:'#174a51',wall:'#337e77',light:'#c9b978',edge:'#205451',floor:'#e1c996',floor2:'#e5cea1',line:'#bda56f',moss:'#e3ce97',glow:'#eac279',mist:'#e6cfa7'},
    blue:    {void:'#103f52',wall:'#287b7c',light:'#80b8a9',edge:'#174f60',floor:'#d9d3b1',floor2:'#e0d9bb',line:'#b7bea0',moss:'#e5d5a4',glow:'#a3e5db',mist:'#dfd9be'},
    crimson: {void:'#293f48',wall:'#39746a',light:'#c8aa69',edge:'#234d49',floor:'#dcc294',floor2:'#e2cba2',line:'#b99c70',moss:'#e9d1a2',glow:'#f5b66c',mist:'#e1c6a4'},
    violet:  {void:'#254a51',wall:'#477f7a',light:'#abc0a2',edge:'#2b555a',floor:'#e3d8b7',floor2:'#e9dfc1',line:'#c8c19e',moss:'#efe2b7',glow:'#e6d5ac',mist:'#e5d9c0'},
    gold:    {void:'#173e47',wall:'#2d6969',light:'#b8a363',edge:'#23494e',floor:'#d1bf9b',floor2:'#d9c8a6',line:'#b5a078',moss:'#e6cb8c',glow:'#f1cf80',mist:'#e2d0ae'}
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
  function shadow(ctx,x,y,w=10) {ctx.globalAlpha=.35;rect(ctx,x+(16-w)/2,y+13,w,2,'#070d15');ctx.globalAlpha=1;}

  class TowerRenderer {
    constructor(canvas, engine) {
      this.canvas=canvas;this.engine=engine;
      this.canvas.width=this.canvas.height=624;
      this.canvas.style.imageRendering='pixelated';
      this.ctx=canvas.getContext('2d',{alpha:false});
      this.buffer=document.createElement('canvas');this.buffer.width=this.buffer.height=SIZE;
      this.p=this.buffer.getContext('2d');this.ctx.imageSmoothingEnabled=false;this.p.imageSmoothingEnabled=false;
      this.terrainBuffer=document.createElement('canvas');this.terrainKey='';
      this.effects=[];this.hover=null;this.t=0;this.lastFloor=-1;this.floorFade=0;this.running=true;
      this.overview=false;this.camera={x:0,y:0,w:13,h:13,overview:false};this.cameraFocus=null;this.lastPlayer=null;this.lastSelection='';
      this.reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.frame=(t)=>{if(!this.running)return;this.draw(t);this.raf=requestAnimationFrame(this.frame);};
      this.raf=requestAnimationFrame(this.frame);
    }
    destroy(){this.running=false;cancelAnimationFrame(this.raf);}
    setHover(x,y){this.hover=(x===null||x===undefined)?null:{x,y};}
    cellAt(clientX,clientY){const b=this.canvas.getBoundingClientRect(),v=this.getViewport();return {x:Math.floor((clientX-b.left)/b.width*v.w)+v.x,y:Math.floor((clientY-b.top)/b.height*v.h)+v.y};}
    setOverview(value){const prior=this.overview;this.overview=!!value;if(prior&&!this.overview)this.focusPlayer();else this.updateCamera();return this.overview;}
    toggleOverview(){return this.setOverview(!this.overview);}
    getViewport(){this.updateCamera();return {...this.camera,overview:this.overview};}
    focusCell(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;this.updateCamera();this.cameraFocus={x,y};this.updateCamera();}
    focusPlayer(){const s=this.engine.state||{},e=this.engine.selection;this.cameraFocus=null;this.lastSelection=e?`${s.floor}:${e.x}:${e.y}`:'';this.updateCamera();}
    screenPoint(x,y){const v=this.getViewport();if(x<v.x||y<v.y||x>=v.x+v.w||y>=v.y+v.h)return null;const b=this.canvas.getBoundingClientRect();return {x:b.left+(x-v.x+.5)*b.width/v.w,y:b.top+(y-v.y+.5)*b.height/v.h};}
    updateCamera(){
      const state=this.engine.state||{},floor=this.data().floors[state.floor||0];if(!floor)return;
      const width=floor.map[0]?.length||13,height=floor.map.length||13,position=`${state.floor}:${state.x}:${state.y}`;
      if(this.lastPlayer!==position){this.lastPlayer=position;this.cameraFocus=null;}
      const selection=this.engine.selection,key=selection?`${state.floor}:${selection.x}:${selection.y}`:'';
      if(key&&key!==this.lastSelection&&this.lastFloor===state.floor)this.cameraFocus={x:selection.x,y:selection.y};
      this.lastSelection=key;
      const target=this.cameraFocus||{x:state.x||0,y:state.y||0},w=this.overview?width:Math.min(13,width),h=this.overview?height:Math.min(13,height);
      this.camera={x:this.overview?0:clamp(Math.floor(target.x-w/2+.5),0,width-w),y:this.overview?0:clamp(Math.floor(target.y-h/2+.5),0,height-h),w,h,overview:this.overview};
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
      ctx.globalAlpha=.9;for(const[a,b,sx,sy]of[[1,1,1,1],[14,1,-1,1],[1,14,1,-1],[14,14,-1,-1]]){rect(ctx,x+a,y+b,sx===1?4:-3,1,c);rect(ctx,x+a,y+b,1,sy===1?4:-3,c);}ctx.globalAlpha=1;
    }
    labels(ctx,entities){
      if(this.engine.mode!=='inspect'&&!this.s.settings?.showDamage)return;
      const v=this.getViewport(),scale=624/v.w,fontSize=this.overview?10:Math.max(11,Math.min(20,Math.round(11*624/(this.canvas.clientWidth||624))));
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${fontSize}px ui-monospace, monospace`;
      for(const e of entities){if(e.type!=='enemy'||e.x<v.x||e.x>=v.x+v.w||e.y<v.y||e.y>=v.y+v.h)continue;let p;try{p=this.engine.preview(e.enemy);}catch(_){continue;}if(!p)continue;
        const text=p.possible===false?(this.overview?'×':'破防不足'):`−${p.damage??'?'}`;const width=Math.max(this.overview?18:27,ctx.measureText(text).width+7),x=(e.x-v.x+.5)*scale,y=(e.y-v.y+.85)*scale;
        ctx.fillStyle='#0d1720';ctx.fillRect(Math.round(x-width/2),y-fontSize/2-1,width,fontSize+3);ctx.fillStyle=p.possible===false?'#d99998':p.damage===0?'#b0ddac':(p.damage||0)>=(this.s.hp||1)?'#ff8c83':'#e4c486';ctx.fillText(text,x,y+1);
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
      if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return 'reduced';
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
      const w=(meta.sourceW||192)/NATIVE,h=(meta.sourceH||192)/NATIVE,x=cellX*CELL,y=cellY*CELL;
      ctx.save();ctx.beginPath();ctx.rect(x,y,CELL,CELL);ctx.clip();const ok=this.asset(ctx,id,Math.floor(x/w)*w,Math.floor(y/h)*h,w,h,frame);ctx.restore();return ok;
    },
    sprite(ctx,id,footX,footY,frame=0,scale=1){
      const meta=window.TowerAssets?.get?.(id);if(!meta||!window.TowerAssets?.ready)return false;
      const w=(meta.sourceW||64)/NATIVE*scale,h=(meta.sourceH||96)/NATIVE*scale,anchor=meta.anchor||{x:32,y:88};
      const ax=(Array.isArray(anchor)?anchor[0]:anchor.x)??32,ay=(Array.isArray(anchor)?anchor[1]:anchor.y)??88;
      return this.asset(ctx,id,footX-ax/NATIVE*scale,footY-ay/NATIVE*scale,w,h,frame);
    },
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
        const groups=[['furnace-shadow','furnace-latch'],['silk-a','silk-b'],['furnace-mercy','furnace-stop']],cores=[[52,181],[130,160],[213,180]];
        for(let i=0;i<3;i++)if(groups[i].every(id=>this.controlLit(id))){const xx=placement.x+(cores[i][0]-placement.bx)*placement.scale,yy=placement.y+(cores[i][1]-placement.by)*placement.scale,r=15*placement.scale;
          ctx.save();ctx.fillStyle='#225d60';ctx.beginPath();ctx.ellipse(xx,yy,r,r*1.15,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a2cdb1';ctx.lineWidth=1/3;ctx.stroke();rect(ctx,xx-1/3,yy-1,2/3,2,'#dcdfb5');ctx.restore();}
      }
      if(type==='pagoda'){const west=this.controlLit('west-tower'),east=this.controlLit('east-tower');for(const [active,f]of[[west,.25],[east,.75]]){if(active){rect(ctx,x+w*f-1,y+h-2,2,1,C.goldLight);rect(ctx,x+w*f-1/3,y+h-3,2/3,2,C.jade);}}if(west&&east)rect(ctx,x+w*.25,y+h-1/3,w*.5,1/3,C.goldLight);}
      if(this.purified){ctx.save();ctx.strokeStyle=C.goldLight;ctx.lineWidth=1/3;ctx.globalAlpha=.8;ctx.strokeRect(x+2/3,y+2/3,w-4/3,h-4/3);ctx.restore();}
    },
    skipEffects(){this.effects=[];this.floorFade=0;},
    effect(type,x,y,text='',meta={}){
      if(type==='floor'){this.skipEffects();this.floorFade=performance.now();return;}
      if(type==='move')return;
      const now=performance.now(),s=this.engine.state||{},details=meta||{};
      const ability=details.ability||details.mode||(/分身归/.test(text)?'recall':/分身/.test(text)?'clone':null);
      const pace=this.motionMode()==='simple'?.65:1;
      const singleFragment=type==='relic'&&details.fragment!==undefined;
      const life=Math.round((singleFragment?650:['relic','selfAwaken','awakening'].includes(type)?2200:type==='attack'?(details.phases?.length?1600:580):type==='magic'?680:type==='door'?480:type==='pickup'?620:380)*pace);
      this.effects.push({kind:'event',type,x:x*16,y:y*16,fromX:(details.fromX??s.x??x)*16,fromY:(details.fromY??s.y??y)*16,meta:details,ability,start:now,life,text});
      if(text)this.effects.push({kind:'text',type,x:x*16+8,y:y*16+4,start:now,life:Math.round((singleFragment?650:type==='relic'?2200:1100)*pace),text,color:type==='hit'?C.redLight:type==='magic'?C.jade:C.goldLight});
    },
    draw(time=0){
      const s=this.engine.state||{},d=this.data();this.s=s;this.floor=d.floors[s.floor||0];
      if(!this.floor){this.ctx.fillStyle='#111b1e';this.ctx.fillRect(0,0,624,624);return;}
      this.mode=this.motionMode();this.calm=this.mode==='reduced';this.reduced=this.calm;this.t=this.calm?0:time;this.now=time;
      this.realm=realmOf(s);this.purified=this.realm===5?!!s.selfAwakened:(s.relics||[]).includes(this.realm);this.theme=THEMES[this.floor.theme]||THEMES.jade;
      this.updateCamera();
      if(this.lastFloor!==s.floor){this.lastFloor=s.floor;this.floorFade=time;}
      const width=this.floor.map[0]?.length||13,height=this.floor.map.length||13;
      if(this.buffer.width!==width*CELL*NATIVE||this.buffer.height!==height*CELL*NATIVE){this.buffer.width=width*CELL*NATIVE;this.buffer.height=height*CELL*NATIVE;this.p.imageSmoothingEnabled=false;}
      const ctx=this.p;ctx.setTransform(NATIVE,0,0,NATIVE,0,0);ctx.globalAlpha=1;ctx.fillStyle=this.theme.void;ctx.fillRect(0,0,width*CELL,height*CELL);
      const casts=this.calm?[]:this.effects.filter(e=>e.kind==='event'&&e.type==='magic'&&time-e.start<e.life*.58),waterFrame=this.mode==='standard'&&this.floor.waterTiles?.length?Math.floor(this.t/450)%4:0;
      // The 48px terrain is static between actual rule changes. Cache it at
      // native resolution, rather than re-uploading hundreds of texture clips
      // for every animation frame; dynamic actors and effects stay separate.
      const terrainKey=JSON.stringify([s.floor,this.purified,!!window.TowerAssets?.ready,this.overview,this.engine.mode==='walk',s.terrain,s.tides,s.revealed,s.switches,s.quests,waterFrame,casts.map(e=>[e.ability,e.x,e.y])]);
      if(terrainKey!==this.terrainKey||this.terrainBuffer.width!==this.buffer.width||this.terrainBuffer.height!==this.buffer.height){
        this.terrainKey=terrainKey;this.terrainBuffer.width=this.buffer.width;this.terrainBuffer.height=this.buffer.height;const ground=this.terrainBuffer.getContext('2d');ground.imageSmoothingEnabled=false;ground.setTransform(NATIVE,0,0,NATIVE,0,0);ground.fillStyle=this.theme.void;ground.fillRect(0,0,width*CELL,height*CELL);
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){const cast=casts.find(e=>e.x===x*16&&e.y===y*16),tile=cast?.ability==='staff'?'~':this.tile(x,y);if(tile==='#')this.wall(ground,x,y);else if(tile==='v')this.voidTile(ground,x,y);else if(tile==='~')this.gap(ground,x,y);else if(tile==='w')this.water(ground,x,y);else this.floorTile(ground,x,y);}
      }
      ctx.drawImage(this.terrainBuffer,0,0,width*CELL,height*CELL);
      this.decor(ctx);this.landmark(ctx);this.floorSigils(ctx);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(this.tile(x,y)==='=')this.bars(ctx,x*16,y*16);
      for(const e of this.effects)if(!this.calm&&e.kind==='event'&&e.type==='magic'&&e.ability==='morph'&&time-e.start<e.life*.58)this.bars(ctx,e.x,e.y);
      const ents=(this.floor.entities||[]).filter(e=>!s.removed?.[e.id]).sort((a,b)=>a.y-b.y);
      this.lightSources(ctx,ents);
      // Sort feet, not sprite tops. A taller character never floats over a guard
      // that is standing nearer the viewer; mechanics keep their true cell.
      const actors=ents.map(e=>({foot:e.y,entity:e}));if(s.x!==undefined)actors.push({foot:s.y,player:true});actors.sort((a,b)=>a.foot-b.foot||(a.player?1:-1));
      for(const actor of actors)if(actor.player)this.player(ctx,s.x,s.y);else this.entity(ctx,actor.entity);
      this.tacticalHints(ctx,ents);
      if(Array.isArray(this.engine.path)&&this.engine.path.length){
        let x=s.x,y=s.y;const dirs={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
        for(const step of this.engine.path){if(typeof step==='string'){const v=dirs[step];if(!v)continue;x+=v[0];y+=v[1];}else{x=step.x;y=step.y;}if(Number.isFinite(x)&&Number.isFinite(y)){ctx.globalAlpha=.7;rect(ctx,x*16+7,y*16+7,2,2,C.jade);}}
        ctx.globalAlpha=1;
      }
      this.selection(ctx);this.ambient(ctx);this.drawParticles(ctx,time);
      this.ctx.imageSmoothingEnabled=false;
      // Screen shake is opt-in and is disabled by both lower-motion modes.
      const hit=this.effects.find(e=>e.kind==='event'&&e.type==='attack'&&time-e.start>220&&time-e.start<290);
      const shake=this.mode==='standard'&&s.settings?.screenShake&&hit?(Math.floor(time/25)%2?2:-2):0;
      const v=this.getViewport();this.ctx.fillStyle=this.theme.void;this.ctx.fillRect(0,0,624,624);this.ctx.drawImage(this.buffer,v.x*CELL*NATIVE,v.y*CELL*NATIVE,v.w*CELL*NATIVE,v.h*CELL*NATIVE,shake,0,624,624);
      this.labels(this.ctx,ents);this.floatingText(this.ctx,time);
      if(this.mode==='standard'&&this.floorFade&&time-this.floorFade<280){this.ctx.fillStyle=`rgba(8,14,20,${.42*(1-(time-this.floorFade)/280)})`;this.ctx.fillRect(0,0,624,624);}
    },
    floorTile(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme,z=this.realm,seed=hash(x,y,this.s.floor);
      const artFloor=this.texture(ctx,`floor_${this.floor.theme}`,x,y);
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
        rect(ctx,px,py+5,16,7,C.ink);rect(ctx,px,py+5,16,1,C.goldLight);rect(ctx,px,py+6,16,4,'#a84c39');rect(ctx,px,py+10,16,2,C.goldDark);rect(ctx,px+1,py+5,3,7,C.gold);rect(ctx,px+12,py+5,3,7,C.gold);
      }
      if(this.floor.map[y]?.[x]==='='){rect(ctx,px+1,py+2,2,2,t.light);rect(ctx,px+13,py+11,2,3,t.light);}
      if(this.floor.map[y]?.[x]==='w'){line(ctx,px+1,py+13,14,'#437c89');rect(ctx,px+4,py+11,1,2,C.blue);}
    },
    wall(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme,z=this.realm,solid=(xx,yy)=>this.floor.map[yy]?.[xx]==='#';
      const n=solid(x,y-1),e=solid(x+1,y),s=solid(x,y+1),w=solid(x-1,y);
      // Adjacent wall cells read as one architectural mass, never as boxes.
      const artWall=this.texture(ctx,`wall_${this.floor.theme}`,x,y);if(!artWall)rect(ctx,px,py,16,16,t.wall);
      if(artWall){
        // Continuous azurite roof planes, gilded coping and vermilion pillars.
        // Sparse true-pixel edging keeps walls readable without giant outlines.
        if(!n){rect(ctx,px,py,16,2/3,C.goldLight);rect(ctx,px,py+2/3,16,1/3,C.goldDark);}
        if(!s){rect(ctx,px,py+12,16,4,t.edge);rect(ctx,px,py+12,16,1/3,C.goldLight);rect(ctx,px,py+14,16,1/3,C.gold);}
        if(!w){rect(ctx,px,py+1,1,15,'#a8543e');rect(ctx,px+1,py+1,1/3,15,C.goldLight);}
        if(!e){rect(ctx,px+15,py+1,1,15,'#9d4d3d');rect(ctx,px+14+2/3,py+1,1/3,15,C.gold);}
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
      rect(ctx,px,py,16,16,'#18576a');rect(ctx,px,py+1/3,16,1,'#286e78');
      for(let row=0;row<7;row++){const yy=py+2+row*2,shift=(flow+row+x)%4,colors=['#1d6573','#3d8e8c','#256d7c','#6ca99b'];rect(ctx,px,yy,16,1/3,colors[(row+y)%4]);for(let j=0;j<3;j++){const xx=px+((j*6+shift+row*2)%16),ww=Math.min(4,px+16-xx);rect(ctx,xx,yy+2/3,ww,1/3,row%3===0?'#b0cdb5':'#4b9995');}}
      pixelPolygon(ctx,[[px+5,py+9],[px+3,py+6],[px+6,py+7],[px+8,py+4],[px+10,py+7],[px+13,py+6],[px+11,py+10]],'#51425c');rect(ctx,px+7,py+7,2,2,'#a3716c');rect(ctx,px+5,py+11,7,1/3,'#90bab0');
      if(this.s.quests?.bajie){rect(ctx,px+3,py+14,3,1/3,C.goldLight);rect(ctx,px+10,py+14,3,1/3,C.goldLight);}
    },
    gap(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme;rect(ctx,px,py,16,16,'#164754');rect(ctx,px,py,16,2/3,C.goldDark);rect(ctx,px,py+2/3,16,1/3,C.goldLight);rect(ctx,px,py+2,1,12,t.wall);rect(ctx,px+15,py+2,1,12,t.wall);
      const shift=this.mode==='standard'?Math.floor(this.t/350)%3:0;ctx.globalAlpha=.26;for(let i=0;i<3;i++)line(ctx,px+4+(i%2),py+5+i*3+shift,7-i%2,t.mist);ctx.globalAlpha=1;
      rect(ctx,px+1,py+5,2,2,C.goldDark);rect(ctx,px+13,py+5,2,2,C.goldDark);
    },
    voidTile(ctx,x,y){
      const px=x*16,py=y*16;rect(ctx,px,py,16,16,this.theme.void);
      // The cloud atlas name currently aliases a paving texture. Keep the
      // reserved, impassable landmark footprint visibly suspended in cloud sea.
      const yy=py+11+Math.round(hash(x,y)*3);ctx.save();ctx.globalAlpha=.21;rect(ctx,px,yy,16,1/3,'#d0d5b0');rect(ctx,px+3,yy-1,7,1/3,'#91b5a1');ctx.restore();
    },
    decor(ctx){
      const map=this.floor.map;
      for(let y=1;y<map.length-1;y++)for(let x=1;x<map[y].length-1;x++)if(map[y][x]==='#'&&map[y+1]?.[x]!=='#'&&hash(x,y,this.s.floor+4)>.76){this.torch(ctx,x*16+8,y*16+7,x+y);}
    },
    lightSources(ctx,entities){
      const lights=entities.filter(e=>e.type==='altar'||e.type==='relic'||e.type==='finale'||e.type==='resonator');
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
        if(artType==='buddha'||artType==='scripture'){for(let yy=mark.y;yy<mark.y+(mark.h||5);yy++)for(let xx=mark.x;xx<mark.x+(mark.w||4);xx++)this.texture(ctx,`wall_${this.floor.theme}`,xx,yy);}
        const placement=this.landmarkArt(ctx,`landmark_${artType}`,x,y,mw,mh,artType)||this.landmarkArt(ctx,`landmark_${this.floor.theme}`,x,y,mw,mh,artType);
        if(!placement){const art=this.architecture(artType);ctx.imageSmoothingEnabled=false;ctx.drawImage(art,x,y,mw,mh);}else this.landmarkState(ctx,artType,placement,x,y,mw,mh);
        if(artType==='buddha'||artType==='scripture'){ctx.strokeStyle=C.goldDark;ctx.lineWidth=2/3;ctx.strokeRect(x+1/3,y+1/3,mw-2/3,mh-2/3);ctx.strokeStyle=C.goldLight;ctx.lineWidth=1/3;ctx.strokeRect(x+1,y+1,mw-2,mh-2);}
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
        case 'cache':this.chest(ctx,x,y,0);rect(ctx,x+6,y+2,4,2,C.jade);break;
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
    player(ctx,x,y){
      let px=x*16,py=y*16,m=this.engine.motion,walk=0;
      if(m&&!this.calm){const f=clamp((this.now-m.start)/(m.duration||120),0,1);if(f<1){const q=1-Math.pow(1-f,2);px=(m.fromX+(m.toX-m.fromX)*q)*16;py=(m.fromY+(m.toY-m.fromY)*q)*16;walk=f<.5?1:-1;}}
      const attack=[...this.effects].reverse().find(e=>e.kind==='event'&&e.type==='attack'&&this.now-e.start<e.life);
      let pose='idle',facing=this.s.facing||'up';
      if(attack&&!this.calm){const duration=attack.meta.phases?.length?attack.life/Math.min(3,attack.meta.phases.length):580;const age=this.now-attack.start,f=attack.meta.phases?.length?(age%duration)/duration:age/duration;pose=f<.22?'windup':f<.46?'strike':f<.7?'impact':f<1?'recover':'idle';facing=attack.meta.facing||this.direction(attack.fromX,attack.fromY,attack.x,attack.y);}
      const magic=this.effects.find(e=>e.kind==='event'&&e.type==='magic'&&e.ability==='morph'&&this.now-e.start<e.life);
      shadow(ctx,px,py,13);
      if(magic&&!this.calm&&this.now-magic.start>110&&this.now-magic.start<520){ctx.globalAlpha=.3;this.monkey(ctx,Math.round(px),Math.round(py),false,facing,'idle',0);ctx.globalAlpha=1;}
      else this.monkey(ctx,Math.round(px),Math.round(py),false,facing,pose,walk);
      if(attack&&!this.calm&&(attack.meta.damage||0)>0){const age=this.now-attack.start;if(age>280&&age<430){ctx.globalAlpha=.22;rect(ctx,px+4,py-2,8,14,C.redLight);ctx.globalAlpha=1;}}
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
      if(['staff','morph','clone'].includes(mode))for(let y=1;y<this.floor.map.length-1;y++)for(let x=1;x<this.floor.map[y].length-1;x++){
        const distance=Math.abs(s.x-x)+Math.abs(s.y-y),entity=entities.find(e=>e.x===x&&e.y===y);
        const valid=mode==='clone'?entity?.type==='switch'&&entity.kind==='plate'&&!s.switches?.[entity.id]&&distance<=4:distance===1&&this.tile(x,y)===(mode==='staff'?'~':'=');
        if(!valid)continue;const cost=this.engine.abilityCost?.(mode)??(mode==='clone'?2:1),enough=(s.mana||0)>=cost,color=enough?C.jade:C.redLight;
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
      const width=this.buffer.width/NATIVE,height=this.buffer.height/NATIVE;for(let i=0;i<count;i++){const xx=Math.round((hash(i,3,this.s.floor)*width+Math.sin(this.t/3500+i)*2+width)%width),yy=Math.round((hash(i,7,this.s.floor)*height-this.t/(150+i*9)+height*20)%height);ctx.globalAlpha=.16+(Math.sin(this.t/950+i)*.5+.5)*.16;rect(ctx,xx,yy,1/3,1/3,i%4===0?C.goldLight:this.theme.mist);}ctx.globalAlpha=1;
    },
    insect(ctx,x,y,phase=0){
      const flap=this.mode==='standard'&&phase%2;rect(ctx,x-1,y-1,3,4,C.ink);rect(ctx,x,y-1,1,4,C.gold);rect(ctx,x-3,y+(flap?-2:0),2,2,'#a9d8c1');rect(ctx,x+2,y+(flap?-2:0),2,2,'#a9d8c1');rect(ctx,x,y-2,1,1,C.goldLight);
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
        const fxId=e.type==='attack'?'fx_staff':e.type==='magic'?e.ability==='morph'?'fx_morph':e.ability==='clone'||e.ability==='recall'?'fx_clone':e.ability==='staff'?'fx_staff':null:e.type==='door'?'fx_door':e.type==='pickup'?'fx_pickup':['relic','selfAwaken','awakening'].includes(e.type)?'fx_relic':e.type==='hit'?'fx_hit':null;
        if(fxId&&f<.88){ctx.save();ctx.globalAlpha=(this.mode==='simple'?.52:.78)*Math.min(1,(1-f)*2);this.asset(ctx,fxId,x-7,y-12,30,30,Math.min(3,Math.floor(f*4)));ctx.restore();}
        if(e.type==='attack'){
          const boss=!!meta.phases?.length;const p=boss?Math.min(2,Math.floor(f*3)):0,local=boss?(f*3)%1:f;
          if(local<.76){ctx.globalAlpha=local<.4?1:(.76-local)/.36;if(boss)this.boss(ctx,x,y,p);else if(meta.enemy)this.enemy(ctx,x,y,typeof meta.enemy==='string'?meta.enemy:meta.enemy.id);ctx.globalAlpha=1;}
          if(local>.24&&local<.56){
            const q=(local-.24)/.32;staffLine(ctx,e.fromX+8,e.fromY+7,e.fromX+8+dx*q,e.fromY+7+dy*q);
            if(q>.62){line(ctx,x+2,y+7,12,'#fff1bd');rect(ctx,x+7,y+1,2,14,C.goldLight);rect(ctx,x+3,y+3,2,2,C.white);rect(ctx,x+11,y+11,2,2,C.white);}
          }
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
      const v=this.getViewport(),scale=624/(v.w*16);
      for(const e of this.effects){if(e.kind!=='text')continue;const age=time-e.start,f=clamp(age/e.life,0,1);if(this.calm&&age>500)continue;if(e.x<v.x*16||e.x>=(v.x+v.w)*16||e.y<v.y*16||e.y>=(v.y+v.h)*16)continue;ctx.globalAlpha=this.calm?1:Math.min(1,(1-f)*3);const x=clamp((e.x-v.x*16)*scale,45,579),y=Math.max(19,(e.y-v.y*16)*scale-(this.mode==='standard'?20*f:0));ctx.lineWidth=4;ctx.strokeStyle='#111820';ctx.strokeText(e.text,x,y);ctx.fillStyle=e.color;ctx.fillText(e.text,x,y);}ctx.globalAlpha=1;
    }
  });
  // Raster atlas bindings. Code silhouettes above are a safe fallback for a
  // missing local file; after preload the actual board and all cards use PNGs.
  const legacyArt={};for(const name of ['monkey','enemy','npc','boss','item','door','stairs','bars','altar','relic','monument','gate','seal','chest','finale','choice','illusion','resonator','rescue','tide','portal','switch','fragment','treasure','torch','insect'])legacyArt[name]=TowerRenderer.prototype[name];
  Object.assign(TowerRenderer.prototype,{
    propArt(ctx,id,x,y,frame=0){
      const meta=window.TowerAssets?.get?.(id);if(!meta)return false;
      return meta.anchor?this.sprite(ctx,id,x+8,y+16,frame):this.asset(ctx,id,x,y,16,16,frame);
    },
    stateMark(ctx,x,y,active,color=C.jade){
      ctx.save();ctx.globalAlpha=active?.9:.5;ctx.fillStyle=active?color:'#4c7777';ctx.beginPath();ctx.ellipse(x+8,y+14.4,5.7,1.1,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(active){line(ctx,x+6,y+13+2/3,4,C.goldLight);rect(ctx,x+7+2/3,y+12+2/3,2/3,2,C.goldLight);}ctx.restore();
    },
    monkey(ctx,x,y,clone,facing='down',pose='idle',walk=0){
      // The shipped rows contain idle, two real walk contacts and one extended
      // staff pose. Anticipation/recovery reuse idle with a directional lunge;
      // strike and impact use the actual attack frame, never a walking frame.
      const frame=pose==='strike'||pose==='impact'?3:pose==='windup'||pose==='recover'?0:walk?1+Math.floor(this.t/100)%2:0;
      const id=`actor_wukong_${facing}`,lean=pose==='impact'?1.5:pose==='strike'?1:pose==='windup'?-.6:0;
      const dx=facing==='left'?-lean:facing==='right'?lean:0,dy=facing==='up'?-lean:facing==='down'?lean:0;
      ctx.save();if(clone)ctx.globalAlpha*=.62;
      const drawn=this.sprite(ctx,id,x+8+dx,y+16+dy-(walk&&!this.calm?1/3:0),frame);
      ctx.restore();
      if(!drawn){legacyArt.monkey.call(this,ctx,x,y,clone,facing,pose,walk);return;}
      if(clone){this.stateMark(ctx,x,y,true);if(!this.calm){ctx.save();ctx.globalAlpha=.22;this.asset(ctx,'fx_clone',x-4,y-15,24,32,0);ctx.restore();}}
    },
    enemy(ctx,x,y,id){
      const enemy=this.data().enemies[id]||{};if(enemy.trait==='boss'){this.boss(ctx,x,y,0);return;}
      let kind=enemy.trait==='armor'?'guard':enemy.trait==='magic'?'ghost':enemy.trait==='counter'?'yaksha':enemy.trait==='venom'?'spider':'imp';
      if(/dragon|flood|龙|蛟/.test(id+' '+enemy.name))kind='dragon';else if(/acolyte|bone|archivist|monk|僧|禅/.test(id+' '+enemy.name))kind='monk';else if(/stone|石|卫/.test(id+' '+enemy.name))kind='guard';
      const bob=enemy.trait==='magic'&&this.mode==='standard'?Math.sin(this.t/650+x)*1/3:0;
      if(!this.sprite(ctx,`enemy_${id}`,x+8,y+16+bob)&&!this.sprite(ctx,`enemy_${kind}`,x+8,y+16+bob)){legacyArt.enemy.call(this,ctx,x,y,id);return;}
      // Small glyphs identify dangerous combat families without repainting the
      // illustrated character or hiding the engine's exact damage labels.
      const col=enemy.trait==='magic'?C.blue:enemy.trait==='counter'||enemy.trait==='venom'?C.redLight:enemy.trait==='first'?C.goldLight:null;
      if(col){ctx.save();ctx.globalAlpha=.85;line(ctx,x+2,y+15,12,col);ctx.restore();}
    },
    boss(ctx,x,y,phase=0){
      const id=`enemy_boss_${phase}`,frame=phase;
      if(this.sprite(ctx,id,x+8,y+16,0,1.12)||this.sprite(ctx,'enemy_boss',x+8,y+16,frame,1.12)||this.sprite(ctx,'enemy_heart',x+8,y+16,frame,1.12)){
        this.stateMark(ctx,x,y,true,phase===1?C.blue:phase===2?C.goldLight:C.redLight);return;
      }legacyArt.boss.call(this,ctx,x,y,phase);
    },
    npc(ctx,x,y,e={}){
      const raw=String(e.sprite||e.portrait||e.archetype||e.character||e.npc||e.dialogue||'lantern').toLowerCase();
      const id=/bajie|八戒|pig/.test(raw)?'bajie':/white|善念|白衣|wutian/.test(raw)?'whitewutian':/tang|唐僧|tripitaka/.test(raw)?'tangseng':/nezha|哪吒/.test(raw)?'nezha':/qiao|灵儿|乔/.test(raw)?'qiao':'lantern';
      if(!this.sprite(ctx,`npc_${id}`,x+8,y+16)){legacyArt.npc.call(this,ctx,x,y,e);return;}
      rect(ctx,x+7+1/3,y-13,4/3,4/3,C.goldLight);
    },
    item(ctx,x,y,id){
      const item=this.data().items[id]||{},kind=item.kind||id,artId=kind==='key'?`key_${item.color||'yellow'}`:kind;
      if(!this.propArt(ctx,`item_${id}`,x,y)&&!this.propArt(ctx,`item_${artId}`,x,y))legacyArt.item.call(this,ctx,x,y,id);
    },
    door(ctx,x,y,color){if(!this.propArt(ctx,`prop_door_${color}`,x,y))legacyArt.door.call(this,ctx,x,y,color);},
    stairs(ctx,x,y,up){if(!this.propArt(ctx,`prop_stairs_${up?'up':'down'}`,x,y))legacyArt.stairs.call(this,ctx,x,y,up);},
    bars(ctx,x,y){if(!this.propArt(ctx,'prop_bars',x,y)&&!this.propArt(ctx,'prop_gate',x,y))legacyArt.bars.call(this,ctx,x,y);},
    altar(ctx,x,y){if(!this.propArt(ctx,'prop_altar',x,y))legacyArt.altar.call(this,ctx,x,y);},
    relic(ctx,x,y,id){if(!this.propArt(ctx,`prop_relic_${id}`,x,y)&&!this.propArt(ctx,'prop_relic',x,y))legacyArt.relic.call(this,ctx,x,y,id);},
    monument(ctx,x,y){if(!this.propArt(ctx,'prop_monument',x,y))legacyArt.monument.call(this,ctx,x,y);},
    gate(ctx,x,y,open){if(open){if(this.propArt(ctx,'prop_gate_open',x,y,1)){this.stateMark(ctx,x,y,true);return;}rect(ctx,x,y+1,1,15,C.goldDark);rect(ctx,x+15,y+1,1,15,C.goldDark);line(ctx,x,y+1,16,C.goldLight);return;}if(!this.propArt(ctx,'prop_gate',x,y))legacyArt.gate.call(this,ctx,x,y,open);},
    seal(ctx,x,y,requires){const active=(this.s.relics?.length||0)>=(requires||0);if(active){this.stateMark(ctx,x,y,true,C.goldLight);return;}if(!this.propArt(ctx,'prop_seal',x,y))legacyArt.seal.call(this,ctx,x,y,requires);},
    chest(ctx,x,y,requires){if(!this.propArt(ctx,'prop_chest',x,y))legacyArt.chest.call(this,ctx,x,y,requires);if(requires&&(this.s.relics?.length||0)<requires){rect(ctx,x+6,y+3,4,5,C.goldDark);rect(ctx,x+7,y+4,2,2,C.goldLight);}},
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
    insect(ctx,x,y,phase=0){if(!this.asset(ctx,'fx_morph',x-5,y-6,10,10,phase%4))legacyArt.insect.call(this,ctx,x,y,phase);}
  });
  // Portraits and card icons share the atlas and its real foot anchors.
  TowerRenderer.icon=function(canvas,type,id){
    const r=Object.create(TowerRenderer.prototype);r.engine={mode:'walk',state:{settings:{motion:'reduced'}}};r.t=0;r.now=0;r.reduced=true;r.calm=true;r.mode='reduced';r.s={floor:0,relics:[],switches:{},quests:{}};r.realm=0;r.theme=THEMES.jade;r.effects=[];
    const portrait=type==='portrait';canvas.width=canvas.height=96;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,96,96);c.save();c.scale(NATIVE,NATIVE);
    // The original icon path first squeezed detailed PNGs into a 24px temporary
    // canvas. Native-resolution card rendering avoids that irreversible loss.
    if(portrait)r.npc(c,8,15,{sprite:id});
    else if(type==='boss')r.boss(c,8,15,Number(id)||0);else if(type==='enemy')r.enemy(c,8,15,id);else if(type==='player')r.monkey(c,8,15,false,'down');else if(type==='fragment')r.fragment(c,8,10,{fragment:id});else if(type==='treasure')r.treasure(c,8,10,{treasure:id});else if(type==='relic')r.relic(c,8,10,id);else if(type==='altar')r.altar(c,8,10);else if(type==='stairs')r.stairs(c,8,10,true);else if(type==='npc')r.npc(c,8,15,{sprite:id});else r.item(c,8,10,id);c.restore();
  };
  TowerRenderer.backdrop=function(canvas,type='buddha'){
    const shipped=window.TowerAssets;if(shipped?.ready&&shipped.get?.(`landmark_${type}`)){
      const width=Number(canvas.getAttribute('width'))>=400?Number(canvas.getAttribute('width')):520,height=Number(canvas.getAttribute('height'))>=300?Number(canvas.getAttribute('height')):540;
      canvas.width=width;canvas.height=height;canvas.style.imageRendering='pixelated';const out=canvas.getContext('2d');out.imageSmoothingEnabled=false;out.fillStyle='#174e50';out.fillRect(0,0,width,height);
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
