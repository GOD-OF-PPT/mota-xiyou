/* Read-only presentation: it consumes completed actions and never mutates a save. */
(() => {
  'use strict';
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const words=['金箍架桥','青蝉化形','毫毛分身','火眼金睛','归根心钥','归根之匣','外舍利','心印','幻壁','铁栅','镜台','莲灯','功德','灵息','上楼','塔阶','分身','白衣无天','八戒','灵晶','战损','金箍棒'];
  // Alpha bounds measured from the shipped mural atlas, with no runtime pixel
  // readback: file:// remains usable even when a canvas is origin-tainted.
  const muralActors={actor_wukong_right:[[8,12,66,88],[8,14,70,88],[7,14,90,88],[0,15,85,88]],actor_wukong_down:[[32,11,86,88],[25,10,80,88],[13,10,90,88],[34,17,96,88]],actor_wukong_left:[[29,14,86,88],[24,14,91,88],[28,14,94,88],[21,14,96,88]],actor_wukong_up:[[12,9,66,88],[14,8,67,88],[30,8,87,88],[0,12,70,88]]};
  const artBounds=(e,id,frame=0)=>e.frameBounds?.[frame]||(e.sourceW===96?muralActors[id]?.[frame]:null)||e.contentBounds||[0,0,e.sourceW||64,e.sourceH||64];
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function speechPages(text,max=36){
    const result=[];for(const sentence of String(text).split(/(?<=[。！？；\n])/u)){
      let line=sentence.trim();while(line.length>max){let cut=Math.max(line.slice(0,max).lastIndexOf('，'),line.slice(0,max).lastIndexOf('、'));if(cut<12)cut=max-1;result.push(line.slice(0,cut+1));line=line.slice(cut+1).trim();}if(line)result.push(line);
    }return result;
  }
  function highlighted(text){return escape(text).replace(new RegExp(words.join('|'),'g'),s=>`<mark>${s}</mark>`);}
  class TowerPresentation {
    constructor({motion,frequency=()=> 'adaptive',onEntryEnd,onCastEnd,onShot}){
      this.motion=motion;this.frequency=frequency;this.seenCasts=new Set();this.seenEntries=new Set();this.onEntryEnd=onEntryEnd;this.onCastEnd=onCastEnd;this.onShot=onShot;this.entry=document.getElementById('floor-entry');this.band=document.getElementById('ability-cinematic');this.canvas=this.band.querySelector('canvas');
      this.entry.querySelector('button').onclick=()=>this.closeEntry();this.band.querySelector('button').onclick=()=>this.closeCast();
    }
    get entryOpen(){return !this.entry.hidden;}
    get castOpen(){return !this.band.hidden;}
    showEntry({floor,title,atmosphere,goal,resume=false}){
      this.closeCast(false);cancelAnimationFrame(this.entryRaf);clearTimeout(this.entryTimer);this.entry.hidden=false;this.entry.dataset.resume=String(resume);
      this.entry.querySelector('[data-entry-number]').textContent=`${resume?'重返':'第'} ${String(floor+1).padStart(2,'0')} ${resume?'重塔路':'层'}`;
      this.entry.querySelector('h2').textContent=title;this.entry.querySelector('[data-entry-atmosphere]').textContent=atmosphere;
      this.entry.querySelector('[data-entry-goal]').innerHTML=highlighted(goal);this.entry.querySelector('button').innerHTML=`${resume?'继续前缘':'踏入此境'} <kbd>Enter</kbd>`;
      this.entry.classList.remove('visible');void this.entry.offsetWidth;this.entry.classList.add('visible');document.body.dataset.entry='true';
      // Deliberate acknowledgement keeps an arrival from disappearing behind lore.
      this.entry.querySelector('button').focus({preventScroll:true});
      const revisit=this.seenEntries.has(floor);this.seenEntries.add(floor);this.entryDetail={floor,resume};const started=performance.now(),motion=this.motion(),duration=resume||revisit?650:1800,canvas=this.entry.querySelector('canvas');
      const tick=now=>{if(!this.entryOpen)return;const p=motion==='reduced'?1:clamp((now-started)/duration);window.TowerFilmArt?.arrival(canvas,p,{floor,resume});if(p<1)this.entryRaf=requestAnimationFrame(tick);};this.entryRaf=requestAnimationFrame(tick);
    }
    closeEntry(notify=true){const was=this.entryOpen;cancelAnimationFrame(this.entryRaf);clearTimeout(this.entryTimer);this.entry.hidden=true;this.entry.classList.remove('visible');delete document.body.dataset.entry;if(was&&notify)this.onEntryEnd?.();}
    settleEntry(){if(!this.entryOpen||!this.entryDetail)return;cancelAnimationFrame(this.entryRaf);window.TowerFilmArt?.arrival(this.entry.querySelector('canvas'),1,this.entryDetail);}
    resetJourney(){this.seenCasts.clear();this.seenEntries.clear();}
    showCast(ability,detail={}){
      const definitions={staff:['金箍架桥','一棒横空，断路成桥','道路已通'],morph:['青蝉化形','缩形穿隙，从内侧卸锁','锁闩已解'],clone:['毫毛分身','一缕毫毛，留下同行之影','分身驻守'],eye:['火眼金睛','照见幻象，真路显形','幻壁已破']},definition=definitions[ability];if(!definition)return;
      if(this.frequency()==='adaptive'&&this.seenCasts.has(ability))return false;
      const played=this.startFilm(ability,definition,{...detail},'skill',ability==='eye'?1550:2100,`${definition[2]}${detail.cost?' · 灵息 −'+detail.cost:' · 不耗灵息'}`);if(played)this.seenCasts.add(ability);return played;
    }
    showScene(kind,detail={}){
      if(['boss','confrontation','release','keep'].includes(kind))return false;
      const relic=window.TowerData?.relics?.[detail.relic],skills={staff:'金箍架桥',morph:'青蝉化形',clone:'毫毛分身',ward:'定心护身',truth:'归真共鸣'};
      const definitions={seal:[relic?.name||'心印觉醒','身后旧路，也将有新的解法',`生命 +100 · 灵息已复 · ${skills[relic?.ability]||'心印已归位'}`],awakening:['无骨归真','最后一颗，原来一直在你心中','无骨舍利已觉醒 · 走向莲台选择归路'],boss:['三相破执','金甲、执念、心火 · 一路本心皆成破阵之印',`三相已破 · 生命 −${detail.damage??0} · 走向最后的莲阵`],confrontation:['照见心猿','最后一战，先看清自己留下的影子','三相各有破绽 · 比较免费，确认才结算'],release:['破劫归尘','十七道光，为众生重开归路','众生已有归途 · 此行圆满'],keep:['留灯守塔','以我一盏灯，照亮后来人','长明灯已点燃 · 此行圆满']},definition=definitions[kind];if(!definition)return;
      this.startFilm(kind,definition,{...detail},'scene',window.TowerStoryDirector?.duration(kind)||(kind==='seal'?4800:6400),definition[2]);
    }
    startFilm(ability,definition,detail,kind,duration,result){
      if(this.entryOpen)return false;this.closeCast(false);this.ability=ability;this.detail=detail;this.started=performance.now();this.filmKind=kind;this.shots=kind==='scene'?(window.TowerStoryDirector?.shots(ability,detail)||[]):[];this.activeShot=-1;const motion=this.motion();this.duration=motion==='reduced'?900:motion==='simple'?1000:duration;
      this.band.hidden=false;this.band.dataset.ability=ability;this.band.dataset.film=kind;this.band.setAttribute('aria-label',definition[0]+' · '+(kind==='scene'?'过场动画':'神通演出'));
      this.band.querySelector('[data-cast-category]').textContent=kind==='scene'?'十八重因果':'大圣神通';this.band.querySelector('[data-cast-title]').textContent=definition[0];this.band.querySelector('[data-cast-verse]').textContent=definition[1];this.band.querySelector('[data-cast-result]').textContent=result;document.body.dataset.cinematic='true';this.band.querySelector('button').focus({preventScroll:true});
      this.band.querySelector('[data-cast-result]').hidden=kind==='scene';
      this.band.querySelector('.film-dialogue').hidden=kind!=='scene';
      const tick=now=>{if(!this.castOpen)return;const p=clamp((now-this.started)/this.duration),pose=motion==='reduced'||motion==='simple'&&kind==='scene'?.9:p;this.updateShot(pose);this.draw(pose);this.band.style.setProperty('--cast-progress',motion==='reduced'?1:p);const beats={staff:['执棒蓄势','金箍横空','落桥成路'],morph:['缩形为蝉','穿隙卸锁','复形归来'],clone:['捻毛化影','一念同行','落阵驻守'],eye:['凝目观照','金睛破妄','真路显形']}[ability];if(kind==='skill')this.band.querySelector('[data-cast-beat]').textContent=beats[pose<.25?0:pose<.65?1:2];if(p>=1)this.closeCast();else this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);return true;
    }
    updateShot(p){if(!this.shots.length)return;const index=Math.min(this.shots.length-1,Math.floor(p*this.shots.length));this.shotProgress=clamp(p*this.shots.length-index);if(index===this.activeShot)return;this.activeShot=index;const shot=this.shots[index];this.band.dataset.shot=index;this.onShot?.({kind:this.ability,index,detail:this.detail});this.band.querySelector('[data-cast-beat]').textContent=shot.label;this.band.querySelector('[data-film-speaker]').textContent=shot.speaker;this.band.querySelector('[data-film-line]').textContent=shot.text;this.band.querySelector('[data-cast-result]').hidden=index<this.shots.length-1;this.band.querySelector('.film-shots').setAttribute('aria-label',`剧情第 ${index+1} 镜，共 ${this.shots.length} 镜`);this.band.querySelectorAll('.film-shots i').forEach((el,i)=>el.classList.toggle('active',i===index));}
    closeCast(notify=true){const was=this.castOpen;cancelAnimationFrame(this.raf);this.band.hidden=true;delete document.body.dataset.cinematic;if(was&&notify)this.onCastEnd?.();}
    asset(ctx,id,x,y,w,h,frame=0){const a=window.TowerAssets,meta=a?.get?.(id);if(!meta)return false;return a.draw(ctx,id,x,y,w,h,Math.min(frame,(meta.frames||1)-1));}
    actor(ctx,x,y,size,frame=0,alpha=1){const e=window.TowerAssets?.get?.('actor_wukong_right');if(!e?.image)return;const b=artBounds(e,'actor_wukong_right',frame),w=b[2]-b[0],h=b[3]-b[1],width=size*w/h;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(e.image,(e.sx||0)+frame*e.sourceW+b[0],(e.sy||0)+b[1],w,h,x-width/2,y-size,width,size);ctx.restore();}
    draw(p){
      if(window.TowerFilmArt){window.TowerFilmArt[this.filmKind==='scene'?'scene':'skill'](this.canvas,this.ability,p,{...this.detail,shotIndex:this.activeShot,shotProgress:this.shotProgress,shot:this.shots?.[this.activeShot],motion:this.motion()});return;}
      const rect=this.canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),w=Math.max(1,rect.width),h=Math.max(1,rect.height);if(this.canvas.width!==Math.round(w*ratio)||this.canvas.height!==Math.round(h*ratio)){this.canvas.width=Math.round(w*ratio);this.canvas.height=Math.round(h*ratio);}
      const c=this.canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=window.TowerAssets?.style==='material';
      const sx=w*.25,tx=w*.75,ground=h*.83,scale=Math.min(h*.9,190),gold='#eac378',jade='#99d3bd',red='#a74935';
      c.strokeStyle='#b29c664a';c.lineWidth=1;c.beginPath();c.ellipse(sx,ground,scale*.32,8,0,0,Math.PI*2);c.ellipse(tx,ground,scale*.32,8,0,0,Math.PI*2);c.stroke();
      const line=(x1,y1,x2,y2,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
      if(this.ability==='staff'){
        this.actor(c,sx,ground,scale,p>.18&&p<.7?3:0);const q=clamp((p-.18)/.53),origin={x:sx+scale*.54,y:ground-scale*.72},cx=origin.x+(tx-origin.x)*q,cy=origin.y+(ground-15-origin.y)*q-Math.sin(q*Math.PI)*18,length=28+q*132;
        // A golden projection leaves the raised staff and settles as a bridge;
        // it does not emerge from the actor's waist or duplicate a held weapon.
        if(p>.16){const metal=c.createLinearGradient(0,cy-6,0,cy+6);metal.addColorStop(0,'#4d241c');metal.addColorStop(.3,'#ce7e4d');metal.addColorStop(.46,'#ffe1a0');metal.addColorStop(.6,'#a3422d');metal.addColorStop(1,'#321b17');line(cx-length/2,cy,cx+length/2,cy,metal,12);for(const end of [cx-length/2,cx+length/2-11]){line(end,cy,end+11,cy,gold,16);line(end+1,cy-4,end+10,cy-4,'#fff0bd',2);}if(q<1){c.save();c.globalAlpha=.42;line(origin.x,origin.y,cx-length/2,cy,gold,1);c.restore();}}
        for(const xx of [tx-95,tx+69]){c.fillStyle='#4e4b40';c.fillRect(xx,ground-20,26,25);c.fillStyle='#ada58b';c.fillRect(xx-3,ground-24,32,5);c.fillStyle='#292f2a';c.fillRect(xx+20,ground-18,6,23);}if(p>.64){const a=clamp((p-.64)/.3);c.save();c.globalAlpha=Math.sin(a*Math.PI)*.7;this.asset(c,'fx_staff',tx-78,ground-125,156,156,Math.min(3,Math.floor(a*4)));c.restore();}
      }else if(this.ability==='morph'){
        const fly=clamp((p-.2)/.5),back=clamp((p-.73)/.25),x=p<.73?sx+(tx-sx)*fly:tx-(tx-sx)*back,y=ground-scale*.43-Math.sin(fly*Math.PI)*26;
        for(let i=0;i<6;i++)line(tx-43+i*17,ground-105,tx-43+i*17+(p>.63?(p-.63)*45:0),ground-12,'#a6bcb5',4);line(tx-51,ground-99,tx+51,ground-99,jade,5);line(tx-51,ground-13,tx+51,ground-13,jade,5);
        if(p<.23)this.actor(c,sx,ground,scale*(1-clamp(p/.24)*.75),0,1-clamp(p/.24));else if(p>.92)this.actor(c,sx,ground,scale,0,clamp((p-.92)/.08));
        if(p>.15&&p<.96){const flap=Math.sin(p*95)*5;c.fillStyle=jade;c.beginPath();c.ellipse(x-10,y-3,15,5+Math.abs(flap),-.3,0,Math.PI*2);c.ellipse(x+10,y-3,15,5+Math.abs(flap),.3,0,Math.PI*2);c.fill();line(x,y-7,x,y+10,gold,5);}
        if(p>.62){c.fillStyle=gold;c.save();c.translate(tx,ground-55+(p-.62)*70);c.rotate((p-.62)*5);c.fillRect(-8,-7,16,14);c.restore();}
      }else if(this.ability==='clone'){
        this.actor(c,sx,ground,scale,p<.3?3:0);const q=clamp((p-.16)/.57),x=sx+(tx-sx)*q,y=ground-scale*.45-Math.sin(q*Math.PI)*45;
        if(q<1){line(x,y,x+17,y-10,gold,3);for(let i=0;i<4;i++){c.globalAlpha=.6-i*.12;line(x-i*13,y+i*3,x+6-i*13,y-6+i*3,jade,2);}c.globalAlpha=1;}
        c.strokeStyle=jade;c.lineWidth=2;c.beginPath();c.ellipse(tx,ground,40,9,0,0,Math.PI*2);c.stroke();if(p>.6)this.actor(c,tx,ground,scale,0,clamp((p-.6)/.22)*.78);
      }else{
        this.actor(c,sx,ground,scale,0);const q=clamp(p/.65);line(sx+28,ground-scale*.67,sx+28+(tx-sx-28)*q,ground-scale*.6,gold,3);
        c.save();c.translate(tx,ground-scale*.5);c.strokeStyle=jade;c.lineWidth=3;c.beginPath();c.ellipse(0,0,55,22,0,0,Math.PI*2);c.stroke();c.fillStyle=gold;c.beginPath();c.arc(0,0,11,0,Math.PI*2);c.fill();c.restore();
      }
      if(p>.62){c.globalAlpha=clamp((1-p)*3);for(let i=0;i<10;i++){const a=i*Math.PI/5,r=20+(p-.62)*120;c.fillStyle=i%2?jade:gold;c.fillRect(tx+Math.cos(a)*r,ground-45+Math.sin(a)*r*.4,3,3);}c.globalAlpha=1;}
    }
  }
  window.TowerPresentation=TowerPresentation;window.TowerText={speechPages,highlighted,escape,artBounds};
})();
