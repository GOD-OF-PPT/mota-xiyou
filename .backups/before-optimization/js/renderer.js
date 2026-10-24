/* Original, code-drawn pixel artwork. No network assets or canvas fonts required. */
(() => {
  'use strict';
  const CELL = 16, SIZE = 208;
  const THEMES = {
    jade:    {void:'#080f13',wall:'#233b3b',light:'#3e5b51',edge:'#142527',floor:'#253432',floor2:'#2a3b37',line:'#354740',moss:'#536348',glow:'#edbc64',mist:'#8fc7b0'},
    amber:   {void:'#100e13',wall:'#443b40',light:'#65504c',edge:'#291f2a',floor:'#3a3032',floor2:'#433536',line:'#55413c',moss:'#66594a',glow:'#ecc28b',mist:'#d4b690'},
    blue:    {void:'#070f1b',wall:'#253a51',light:'#3b5972',edge:'#132438',floor:'#253448',floor2:'#2a3c50',line:'#36495b',moss:'#48636a',glow:'#80d5d7',mist:'#80bcd2'},
    crimson: {void:'#160d18',wall:'#453040',light:'#67404d',edge:'#2b1c2d',floor:'#382b3b',floor2:'#40303f',line:'#523b48',moss:'#71504e',glow:'#ed9a70',mist:'#d98e8c'},
    violet:  {void:'#0e1020',wall:'#373550',light:'#535171',edge:'#24243a',floor:'#2c2c42',floor2:'#33334b',line:'#41425b',moss:'#625c75',glow:'#bfb0ef',mist:'#b4abd7'},
    gold:    {void:'#140f17',wall:'#484139',light:'#71634e',edge:'#2b2727',floor:'#39363a',floor2:'#413c3d',line:'#514a48',moss:'#746953',glow:'#f5cf7a',mist:'#d9c5a1'}
  };
  const C = {
    ink:'#111421',gold:'#dca653',goldLight:'#ffe09a',goldDark:'#895638',red:'#bb4b47',redLight:'#ee7862',
    jade:'#7bc6ab',jadeDark:'#387e78',white:'#e3e0ca',blue:'#72baca',purple:'#b2a2dd',shadow:'#10131c'
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=(x,y,z=0)=>{let n=(x*374761393+y*668265263+z*1274126177)|0;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295;};
  const rect=(ctx,x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
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
      this.effects=[];this.hover=null;this.t=0;this.lastFloor=-1;this.floorFade=0;this.running=true;
      this.reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.frame=(t)=>{if(!this.running)return;this.draw(t);this.raf=requestAnimationFrame(this.frame);};
      this.raf=requestAnimationFrame(this.frame);
    }
    destroy(){this.running=false;cancelAnimationFrame(this.raf);}
    setHover(x,y){this.hover=(x===null||x===undefined)?null:{x,y};}
    cellAt(clientX,clientY){const b=this.canvas.getBoundingClientRect();return {x:Math.floor((clientX-b.left)/b.width*13),y:Math.floor((clientY-b.top)/b.height*13)};}
    effect(type,x,y,text=''){
      const colors=type==='relic'?[C.goldLight,C.jade,C.white]:type==='hit'?[C.redLight,C.gold]:type==='magic'?[C.jade,C.blue,C.white]:[C.goldLight,C.gold,C.white];
      const count=type==='relic'?36:(type==='floor'||type==='move')?0:12;
      const now=performance.now();
      if(type==='floor'){this.effects=[];this.floorFade=now;return;}
      for(let i=0;i<count;i++)this.effects.push({kind:'pixel',type,x:x*16+8,y:y*16+7,vx:(Math.random()-.5)*(type==='relic'?38:24),vy:-8-Math.random()*23,start:now,life:450+Math.random()*600,color:colors[i%colors.length],size:i%4===0?2:1});
      if(type==='attack')this.effects.push({kind:'slash',type,x:x*16,y:y*16,start:now,life:310});
      if(type==='door')this.effects.push({kind:'ring',type,x:x*16+8,y:y*16+8,start:now,life:500,color:C.goldLight});
      if(type==='relic')this.effects.push({kind:'ring',type,x:x*16+8,y:y*16+8,start:now,life:1300,color:C.goldLight});
      if(text)this.effects.push({kind:'text',type,x:x*16+8,y:y*16+4,start:now,life:1450,text,color:type==='hit'?C.redLight:type==='magic'?C.jade:C.goldLight});
      if(type==='floor')this.floorFade=now;
    }
    data(){return window.TowerData||{floors:[],enemies:{},items:{},relics:[]};}
    tile(x,y){try{return this.engine.getTile(x,y);}catch(_){return this.floor.map[y]?.[x]||'#';}}
    gateOpen(e){try{return this.engine.isGateOpen(e);}catch(_){return false;}}
    draw(time=0){
      this.t=this.reduced?0:time;const s=this.engine.state||{};const d=this.data();
      this.floor=d.floors[s.floor||0];if(!this.floor){this.ctx.fillStyle='#111b1e';this.ctx.fillRect(0,0,624,624);return;}
      this.s=s;this.theme=THEMES[this.floor.theme]||THEMES.jade;
      if(this.lastFloor!==s.floor){this.lastFloor=s.floor;this.floorFade=time;}
      const ctx=this.p;ctx.globalAlpha=1;ctx.fillStyle=this.theme.void;ctx.fillRect(0,0,SIZE,SIZE);
      for(let y=0;y<13;y++)for(let x=0;x<13;x++){const tile=this.tile(x,y);if(tile==='#')this.wall(ctx,x,y);else if(tile==='~')this.gap(ctx,x,y);else this.floorTile(ctx,x,y);}
      this.decor(ctx);
      for(let y=0;y<13;y++)for(let x=0;x<13;x++)if(this.tile(x,y)==='=')this.bars(ctx,x*16,y*16);
      const ents=(this.floor.entities||[]).filter(e=>!s.removed?.[e.id]).sort((a,b)=>a.y-b.y);
      for(const e of ents)this.entity(ctx,e);
      if(Array.isArray(this.engine.path)&&this.engine.path.length){
        let pathX=s.x,pathY=s.y;
        const dirs={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
        for(const step of this.engine.path){
          if(!step)continue;
          if(typeof step==='string'){const delta=dirs[step];if(!delta)continue;pathX+=delta[0];pathY+=delta[1];}
          else {pathX=step.x;pathY=step.y;}
          if(!Number.isFinite(pathX)||!Number.isFinite(pathY))continue;
          ctx.globalAlpha=.55;rect(ctx,pathX*16+7,pathY*16+7,2,2,C.jade);
        }
        ctx.globalAlpha=1;
      }
      if(s.x!==undefined)this.player(ctx,s.x,s.y);
      this.selection(ctx);
      this.ambient(ctx);
      this.drawParticles(ctx,time);
      this.ctx.imageSmoothingEnabled=false;this.ctx.drawImage(this.buffer,0,0,624,624);
      this.labels(this.ctx,ents);
      this.floatingText(this.ctx,time);
      if(!this.reduced && this.floorFade && time-this.floorFade<500){this.ctx.fillStyle=`rgba(8,14,20,${.55*(1-(time-this.floorFade)/500)})`;this.ctx.fillRect(0,0,624,624);}
    }
    floorTile(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme,seed=hash(x,y,this.s.floor);rect(ctx,px,py,16,16,t.floor);
      rect(ctx,px+1,py+1,14,14,seed>.52?t.floor2:t.floor);line(ctx,px+1,py+1,14,t.line);rect(ctx,px+1,py+1,1,13,t.line);
      line(ctx,px+1,py+15,15,t.edge);rect(ctx,px+15,py+2,1,13,t.edge);
      if(seed>.72){line(ctx,px+4,py+5,4,t.line);rect(ctx,px+8,py+6,1,2,t.line);line(ctx,px+9,py+8,3,t.line);}
      if(seed<.18){rect(ctx,px+3,py+10,2,1,t.moss);rect(ctx,px+4,py+9,1,1,t.moss);}
      if(hash(x+1,y,2)>.79){ctx.globalAlpha=.5;rect(ctx,px+12,py+3,1,1,t.light);rect(ctx,px+8,py+12,1,1,t.light);ctx.globalAlpha=1;}
      // Each three-floor realm has its own stonework cadence.
      if(this.s.floor%3===1 && (x+y)%5===0){ctx.globalAlpha=.4;line(ctx,px+5,py+6,6,t.moss);line(ctx,px+4,py+7,3,t.moss);line(ctx,px+9,py+8,3,t.moss);line(ctx,px+6,py+9,5,t.moss);ctx.globalAlpha=1;}
      if(this.s.floor%3===2 && x%3===0 && y%3===0){ctx.globalAlpha=.45;rect(ctx,px+7,py+4,2,1,t.moss);rect(ctx,px+5,py+6,1,2,t.moss);rect(ctx,px+10,py+6,1,2,t.moss);line(ctx,px+7,py+10,2,t.moss);ctx.globalAlpha=1;}
      if(this.floor.map[y]?.[x]==='~'){
        // The staff remains visibly laid across a closed chasm.
        rect(ctx,px,py+7,16,4,'#543f32');rect(ctx,px,py+7,16,1,C.goldLight);rect(ctx,px,py+10,16,1,C.goldDark);
        rect(ctx,px+1,py+7,3,4,C.gold);rect(ctx,px+12,py+7,3,4,C.gold);rect(ctx,px+5,py+8,6,2,'#9e4540');
      }
      if(this.floor.map[y]?.[x]==='='){rect(ctx,px+1,py+2,2,2,t.light);rect(ctx,px+13,py+11,2,3,t.light);}
    }
    wall(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme;
      rect(ctx,px,py,16,16,t.edge);rect(ctx,px,py,16,11,t.wall);line(ctx,px,py,16,t.light);line(ctx,px,py+6,16,t.edge);
      rect(ctx,px+7,py+1,1,5,t.edge);rect(ctx,px+3,py+7,1,4,t.edge);rect(ctx,px+12,py+7,1,4,t.edge);
      line(ctx,px+1,py+1,5,t.light);line(ctx,px+9,py+1,5,t.light);line(ctx,px+5,py+7,6,t.light);
      const below=this.floor.map[y+1]?.[x];
      if(below&&below!=='#'){
        rect(ctx,px,py+10,16,2,t.light);rect(ctx,px,py+12,16,1,t.wall);rect(ctx,px+1,py+13,14,2,t.edge);rect(ctx,px,py+15,16,1,t.void);
        if(hash(x,y,this.s.floor)>.6){line(ctx,px+5,py+10,6,t.glow);rect(ctx,px+6,py+11,4,1,t.moss);}
      }
      if(hash(x,y,this.s.floor)>.82){rect(ctx,px+10,py+3,3,1,t.moss);rect(ctx,px+12,py+4,1,3,t.moss);}
      if(x===0||y===0||x===12||y===12){
        if((x+y)%3===0){rect(ctx,px+6,py+2,4,8,t.edge);rect(ctx,px+7,py+3,2,6,t.light);rect(ctx,px+7,py+5,2,2,t.moss);}
      }
    }
    gap(ctx,x,y){
      const px=x*16,py=y*16,t=this.theme;rect(ctx,px,py,16,16,t.void);rect(ctx,px,py,16,2,t.edge);line(ctx,px,py+1,16,t.light);
      rect(ctx,px,py+2,2,12,t.wall);rect(ctx,px+14,py+2,2,12,t.wall);
      const shift=Math.floor(this.t/350)%3;for(let i=0;i<4;i++){ctx.globalAlpha=.22;line(ctx,px+4+(i%2),py+4+i*3+shift,7-i%2,t.mist);}ctx.globalAlpha=1;
      rect(ctx,px+6,py+6,4,1,t.moss);rect(ctx,px+7,py+5,2,3,t.moss);
    }
    bars(ctx,x,y){
      rect(ctx,x,y+1,16,2,C.ink);rect(ctx,x,y+13,16,2,C.ink);
      for(let i=2;i<16;i+=4){rect(ctx,x+i,y+2,2,12,'#607c7d');rect(ctx,x+i,y+2,1,11,'#9fb2a0');}
      line(ctx,x+1,y+5,14,'#344f53');line(ctx,x+1,y+11,14,'#344f53');rect(ctx,x+7,y+7,3,3,C.goldDark);rect(ctx,x+8,y+8,1,1,C.goldLight);
    }
    decor(ctx){
      const map=this.floor.map;
      for(let y=1;y<12;y++)for(let x=1;x<12;x++){
        if(map[y][x]==='#'&&map[y+1]?.[x]!== '#'&&hash(x,y,this.s.floor+4)>.74)this.torch(ctx,x*16+8,y*16+7,x+y);
      }
      // Mellow square pools of lamplight keep the board pixel sharp.
      for(let y=2;y<11;y++)for(let x=2;x<11;x++)if(map[y][x]==='#'&&map[y+1]?.[x]!== '#'&&hash(x,y,this.s.floor+4)>.74){
        ctx.globalAlpha=.032;rect(ctx,x*16-8,y*16+10,32,24,this.theme.glow);ctx.globalAlpha=.035;rect(ctx,x*16,y*16+13,16,12,this.theme.glow);ctx.globalAlpha=1;
      }
    }
    torch(ctx,x,y,seed){
      const f=Math.floor(this.t/130+seed)%3;
      rect(ctx,x-3,y+3,6,2,C.ink);rect(ctx,x-2,y+2,4,2,C.goldDark);rect(ctx,x-1,y+4,2,3,C.goldDark);
      rect(ctx,x-2,y-3,4,5,'#ae583b');rect(ctx,x-1,y-5-(f===1?1:0),2,7,C.gold);rect(ctx,x-1+(f===2?1:0),y-3,1,4,C.goldLight);rect(ctx,x,y-1,1,2,'#fff0b1');
      rect(ctx,x-3,y-1,1,2,C.gold);if(f===1)rect(ctx,x+2,y-6,1,1,C.goldLight);
    }
    entity(ctx,e){
      const x=e.x*16,y=e.y*16;
      switch(e.type){
        case 'enemy':this.enemy(ctx,x,y,e.enemy);break;
        case 'item':this.item(ctx,x,y,e.item);break;
        case 'door':this.door(ctx,x,y,e.color);break;
        case 'stairs':this.stairs(ctx,x,y,(e.to??0)>(this.s.floor??0));if((e.requires||0)>(this.s.relics?.length||0)){rect(ctx,x+10,y+8,5,5,C.ink);rect(ctx,x+11,y+9,3,3,C.redLight);rect(ctx,x+11,y+6,3,1,C.gold);rect(ctx,x+11,y+7,1,2,C.gold);rect(ctx,x+13,y+7,1,2,C.gold);}break;
        case 'altar':this.altar(ctx,x,y);break;
        case 'relic':this.relic(ctx,x,y,e.relic);break;
        case 'npc':this.npc(ctx,x,y);break;
        case 'monument':this.monument(ctx,x,y);break;
        case 'switch':this.switch(ctx,x,y,e);break;
        case 'gate':this.gate(ctx,x,y,this.gateOpen(e));break;
        case 'seal':this.seal(ctx,x,y,e.requires);break;
        case 'chest':this.chest(ctx,x,y,e.requires);break;
        case 'finale':this.finale(ctx,x,y);break;
      }
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
    npc(ctx,x,y){
      shadow(ctx,x,y);rect(ctx,x+4,y+6,8,7,C.ink);rect(ctx,x+5,y+6,6,6,'#a18c6b');rect(ctx,x+5,y+8,3,4,'#d4c3a0');rect(ctx,x+3,y+11,10,2,'#60594c');
      rect(ctx,x+5,y+1,6,6,C.ink);rect(ctx,x+6,y+1,4,5,'#c9ad83');rect(ctx,x+5,y+2,6,2,'#c9ad83');rect(ctx,x+7,y+4,1,1,C.ink);rect(ctx,x+9,y+4,1,1,C.ink);rect(ctx,x+7,y+6,3,1,'#eee2c4');
      rect(ctx,x+11,y+5,1,8,C.goldDark);rect(ctx,x+10,y+5,3,1,C.gold);rect(ctx,x+12,y+4,2,4,C.goldDark);rect(ctx,x+12,y+5,1,2,C.goldLight);
      const b=this.reduced?0:Math.round(Math.sin(this.t/600));rect(ctx,x+7,y-3+b,3,1,C.goldLight);rect(ctx,x+7,y-1+b,1,1,C.goldLight);
    }
    monument(ctx,x,y){
      shadow(ctx,x,y,12);rect(ctx,x+3,y+1,10,12,C.ink);rect(ctx,x+4,y+1,8,11,'#5d6b65');rect(ctx,x+5,y+2,6,9,'#828b79');line(ctx,x+5,y+2,6,'#c5c2a0');
      for(let i=0;i<3;i++){rect(ctx,x+6,y+4+i*2,1,1,'#3d514f');rect(ctx,x+8,y+4+i*2,2,1,'#3d514f');}rect(ctx,x+2,y+12,12,2,'#384e4a');line(ctx,x+3,y+12,10,'#91a089');
    }
    switch(ctx,x,y,e){
      const active=this.s.switches?.[e.id];
      if(e.kind==='plate'){
        rect(ctx,x+2,y+8,12,6,C.ink);rect(ctx,x+3,y+8,10,4,active?'#57a79e':'#42656e');line(ctx,x+4,y+8,8,active?C.jade:C.blue);
        rect(ctx,x+5,y+9,6,2,active?'#b5e4c8':'#263e50');rect(ctx,x+7,y+8,2,4,active?C.goldLight:C.blue);
        if(active){ctx.globalAlpha=.6;this.monkey(ctx,x,y-1,true);ctx.globalAlpha=1;}
      }else{
        rect(ctx,x+3,y+11,10,3,C.ink);rect(ctx,x+4,y+10,8,3,'#6d7770');line(ctx,x+4,y+10,8,'#acb49b');
        const d=active?1:-1;rect(ctx,x+7,y+5,2,6,'#9c8056');rect(ctx,x+7+d,y+3,2,3,'#9c8056');rect(ctx,x+6+d,y+2,4,3,active?C.jade:C.gold);rect(ctx,x+7+d,y+2,2,1,active?'#c7ecce':C.goldLight);
        rect(ctx,x+5,y+12,2,1,active?C.jade:C.goldDark);rect(ctx,x+9,y+12,2,1,active?C.jade:C.goldDark);
      }
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
    player(ctx,x,y){
      let px=x*16,py=y*16;
      const m=this.engine.motion;
      if(m && !this.reduced){const f=clamp((performance.now()-m.start)/(m.duration||120),0,1);if(f<1){const t=1-Math.pow(1-f,2);px=(m.fromX+(m.toX-m.fromX)*t)*16;py=(m.fromY+(m.toY-m.fromY)*t)*16;}}
      shadow(ctx,px,py,13);const b=this.reduced?0:Math.round(Math.sin(this.t/250)*.25);this.monkey(ctx,Math.round(px),Math.round(py)+b,false);
      if(this.engine.mode&&this.engine.mode!=='walk'){ctx.globalAlpha=.6;rect(ctx,px+2,py+15,12,1,C.jade);rect(ctx,px+1,py+14,1,1,C.jade);rect(ctx,px+14,py+14,1,1,C.jade);ctx.globalAlpha=1;}
    }
    monkey(ctx,x,y,clone){
      const gold=clone?'#9fdfca':C.gold,gl=clone?'#d8ffde':C.goldLight,gd=clone?'#458f88':C.goldDark;
      const red=clone?'#63b6ae':'#c54f49',rd=clone?'#327f83':'#853949';
      // Tail curls clear of the robe, readable even at a small scale.
      rect(ctx,x+1,y+8,2,5,gd);rect(ctx,x+2,y+12,3,2,gd);rect(ctx,x+1,y+7,1,2,gold);rect(ctx,x,y+7,2,1,gold);
      // Golden cudgel with red lacquer center.
      rect(ctx,x+13,y-3,2,17,C.ink);rect(ctx,x+13,y-2,1,16,gd);rect(ctx,x+13,y-2,2,3,gl);rect(ctx,x+13,y+1,2,10,'#a44e43');rect(ctx,x+13,y+10,2,4,gold);rect(ctx,x+13,y+10,1,3,gl);
      // Boots and padded battle skirt.
      rect(ctx,x+5,y+11,2,4,C.ink);rect(ctx,x+9,y+11,2,4,C.ink);rect(ctx,x+4,y+14,3,1,gd);rect(ctx,x+9,y+14,3,1,gd);
      rect(ctx,x+4,y+7,8,6,C.ink);rect(ctx,x+5,y+7,6,5,gold);rect(ctx,x+5,y+10,6,3,red);rect(ctx,x+7,y+9,2,2,gl);rect(ctx,x+7,y+11,2,2,rd);
      rect(ctx,x+3,y+7,2,4,gd);rect(ctx,x+11,y+7,2,4,gd);rect(ctx,x+3,y+7,2,2,gold);rect(ctx,x+11,y+7,2,2,gold);rect(ctx,x+12,y+9,2,1,gl);
      // Red scarf with gold embroidery catches the idle breeze.
      rect(ctx,x+4,y+5,8,2,red);rect(ctx,x+3,y+6,3,1,red);rect(ctx,x+2,y+7,2,1,rd);rect(ctx,x+1,y+8,2,1,red);rect(ctx,x+10,y+6,3,1,gl);
      // Monkey face, ears, golden circlet and scarlet feather.
      rect(ctx,x+4,y-2,8,7,C.ink);rect(ctx,x+3,y,10,3,gd);rect(ctx,x+5,y-2,6,7,gold);rect(ctx,x+5,y,6,4,'#e9c58c');
      rect(ctx,x+6,y+1,1,1,C.ink);rect(ctx,x+9,y+1,1,1,C.ink);rect(ctx,x+7,y+3,2,1,gd);rect(ctx,x+5,y-1,6,1,gl);rect(ctx,x+7,y-2,2,1,gl);
      rect(ctx,x+8,y-4,1,2,red);rect(ctx,x+9,y-5,2,2,red);rect(ctx,x+10,y-5,2,1,gl);rect(ctx,x+4,y,1,2,gold);rect(ctx,x+11,y,1,2,gold);
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
    boss(ctx,x,y){
      ctx.globalAlpha=.15;rect(ctx,x-2,y-3,20,18,C.redLight);ctx.globalAlpha=.12;rect(ctx,x-4,y-5,24,22,C.purple);ctx.globalAlpha=1;
      rect(ctx,x+1,y+4,14,10,C.ink);rect(ctx,x+3,y+4,10,8,'#5f4163');rect(ctx,x+4,y+6,8,6,'#875675');rect(ctx,x+5,y+10,6,3,'#a75a69');rect(ctx,x+7,y+7,2,5,C.goldDark);rect(ctx,x+7,y+8,2,2,C.goldLight);
      rect(ctx,x+3,y-3,10,8,C.ink);rect(ctx,x+4,y-3,8,7,'#a35f69');rect(ctx,x+4,y-1,8,4,'#cf976f');rect(ctx,x+4,y,3,1,C.ink);rect(ctx,x+9,y,3,1,C.ink);rect(ctx,x+5,y,1,1,C.redLight);rect(ctx,x+10,y,1,1,C.redLight);rect(ctx,x+6,y+2,4,1,'#55374d');
      rect(ctx,x+3,y-4,10,1,C.gold);rect(ctx,x+5,y-5,6,1,C.goldLight);rect(ctx,x+4,y-6,2,2,C.gold);rect(ctx,x+10,y-6,2,2,C.gold);rect(ctx,x+7,y-7,2,3,C.redLight);
      rect(ctx,x,y+1,2,12,C.goldDark);rect(ctx,x,y+1,1,12,C.gold);rect(ctx,x-1,y-1,4,3,C.goldLight);rect(ctx,x-1,y+12,4,2,C.goldLight);rect(ctx,x+13,y+5,2,7,'#a65e6d');
      rect(ctx,x+3,y+12,4,3,C.ink);rect(ctx,x+9,y+12,4,3,C.ink);rect(ctx,x+3,y+14,4,1,C.goldDark);rect(ctx,x+9,y+14,4,1,C.goldDark);
      if(!this.reduced){const f=Math.floor(this.t/180)%3;rect(ctx,x-3,y+4-f,1,2,C.redLight);rect(ctx,x+17,y+7-f,1,2,C.gold);}
    }
    selection(ctx){
      const sel=this.hover||this.engine.selection;if(!sel||sel.x<0||sel.y<0||sel.x>12||sel.y>12)return;
      const x=sel.x*16,y=sel.y*16;const c=this.engine.mode==='walk'?C.goldLight:C.jade;
      ctx.globalAlpha=.9;for(const[a,b,sx,sy]of[[1,1,1,1],[14,1,-1,1],[1,14,1,-1],[14,14,-1,-1]]){rect(ctx,x+a,y+b,sx===1?4:-3,1,c);rect(ctx,x+a,y+b,1,sy===1?4:-3,c);}ctx.globalAlpha=1;
    }
    ambient(ctx){
      if(this.reduced)return;
      for(let i=0;i<15;i++){
        const xx=Math.round((hash(i,3,this.s.floor)*208+Math.sin(this.t/3500+i)*2+208)%208);
        const yy=Math.round((hash(i,7,this.s.floor)*208-this.t/(90+i*9)+2080)%208);
        const alpha=.18+(Math.sin(this.t/850+i)*.5+.5)*.35;
        ctx.globalAlpha=alpha;rect(ctx,xx,yy,1,1,i%3===0?C.goldLight:this.theme.mist);
      }ctx.globalAlpha=1;
    }
    drawParticles(ctx,time){
      this.effects=this.effects.filter(e=>time-e.start<e.life);
      for(const e of this.effects){const f=clamp((time-e.start)/e.life,0,1),t=(time-e.start)/1000;if(e.kind==='text')continue;
        ctx.globalAlpha=1-f;
        if(e.kind==='pixel'){rect(ctx,e.x+e.vx*t,e.y+e.vy*t+16*t*t,e.size,e.size,e.color);}
        else if(e.kind==='slash'){
          const n=Math.floor(f*10);for(let i=0;i<12;i++){if(i>n+4||i<n-4)continue;rect(ctx,e.x+2+i,e.y+12-i,3,2,i%2?C.goldLight:'#fff6c7');}if(f<.3){rect(ctx,e.x+6,e.y+1,3,14,C.goldLight);rect(ctx,e.x+1,e.y+6,13,3,C.goldLight);}
        } else if(e.kind==='ring'){
          const r=Math.round(f*(e.type==='relic'?28:11)),a=e.type==='relic'?.6:1;ctx.globalAlpha=(1-f)*a;
          const pts=[[e.x-r,e.y-r,r*2,1],[e.x-r,e.y+r,r*2,1],[e.x-r,e.y-r,1,r*2],[e.x+r,e.y-r,1,r*2]];for(const p of pts)rect(ctx,...p,e.color);
        }
      }ctx.globalAlpha=1;
    }
    labels(ctx,entities){
      if(this.engine.mode!=='inspect')return;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 11px ui-monospace, monospace';
      for(const e of entities){if(e.type!=='enemy')continue;let p;try{p=this.engine.preview(e.enemy);}catch(_){continue;}if(!p)continue;
        const text=p.possible===false?'破防不足':`−${p.damage??'?'}`;const width=Math.max(27,ctx.measureText(text).width+9),x=e.x*48+24,y=e.y*48+41;
        ctx.fillStyle='#0d1720';ctx.fillRect(Math.round(x-width/2),y-7,width,15);ctx.fillStyle=p.possible===false?'#d99998':p.damage===0?'#b0ddac':(p.damage||0)>=(this.s.hp||1)?'#ff8c83':'#e4c486';ctx.fillText(text,x,y+1);
      }
    }
    floatingText(ctx,time){
      ctx.font='bold 15px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      for(const e of this.effects){if(e.kind!=='text')continue;const f=clamp((time-e.start)/e.life,0,1);ctx.globalAlpha=Math.min(1,(1-f)*3);const x=e.x*3,y=e.y*3-28*f;ctx.lineWidth=4;ctx.strokeStyle='#111820';ctx.strokeText(e.text,x,y);ctx.fillStyle=e.color;ctx.fillText(e.text,x,y);}ctx.globalAlpha=1;
    }
    static icon(canvas,type,id){
      canvas.width=48;canvas.height=48;const r=Object.create(TowerRenderer.prototype);r.engine={mode:'walk'};r.t=0;r.reduced=true;r.s={relics:[],switches:{}};r.theme=THEMES.jade;
      const tmp=document.createElement('canvas');tmp.width=tmp.height=16;const c=tmp.getContext('2d');
      if(type==='enemy')r.enemy(c,0,0,id);else if(type==='player')r.monkey(c,0,2,false);else if(type==='relic')r.relic(c,0,0,id);else if(type==='altar')r.altar(c,0,0);else if(type==='stairs')r.stairs(c,0,0,true);else r.item(c,0,0,id);
      const out=canvas.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(tmp,0,0,48,48);
    }
  }
  window.TowerRenderer=TowerRenderer;
})();
