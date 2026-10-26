/* Canvas-only choreography. Every input is a copy of a completed event. */
(() => {
  'use strict';
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=n=>1-Math.pow(1-clamp(n),3),TAU=Math.PI*2;
  const landmarks=['buddha','pagoda','dragon','furnace','scripture','blacklotus'];
  const palettes=[['#081b20','#487871'],['#151c22','#987344'],['#081d2a','#4b929b'],['#211521','#af6844'],['#151a2e','#797ba2'],['#18151f','#b28d4b']];
  function surface(canvas){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(1,r.width),h=Math.max(1,r.height);if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=window.TowerAssets?.style==='material';return {c,w,h,mural:window.TowerAssets?.style==='mural'};}
  function art(c,id,x,y,w,h,frame=0,alpha=1){const assets=window.TowerAssets,m=assets?.get?.(id);if(!m)return;c.save();c.globalAlpha*=alpha;frame=Math.min(frame,(m.frames||1)-1);let b=m.frameBounds?.[frame]||m.contentBounds;
    // Fit painted content, not the transparent atlas cell. The mural lotus
    // frame also contains two detached fragments from its neighbouring panel.
    if(id==='landmark_blacklotus'&&assets.style==='mural')b=[30,74,256,312];
    if(m.image&&b&&!/^(floor_|wall_|fx_)/.test(id)){const bw=b[2]-b[0],bh=b[3]-b[1],s=Math.min(w/bw,h/bh);c.drawImage(m.image,(m.sx||0)+frame*m.sourceW+b[0],(m.sy||0)+b[1],bw,bh,x+(w-bw*s)/2,y+h-bh*s,bw*s,bh*s);}else assets.draw(c,id,x,y,w,h,frame);c.restore();}
  function actor(c,x,foot,size,frame=0,alpha=1){const id='actor_wukong_right',m=window.TowerAssets?.get?.(id);if(!m?.image)return;const b=window.TowerText.artBounds(m,id,frame),sw=b[2]-b[0],sh=b[3]-b[1],w=size*sw/sh;c.save();c.globalAlpha*=alpha;c.drawImage(m.image,(m.sx||0)+frame*m.sourceW+b[0],(m.sy||0)+b[1],sw,sh,x-w/2,foot-size,w,size);c.restore();}
  function cinematicActor(c,x,foot,size,frame=0,alpha=1){if(window.TowerAssets?.get?.('cinematic_wukong')?.image)art(c,'cinematic_wukong',x-size*.48,foot-size,size*.96,size,0,alpha);else actor(c,x,foot,size,frame,alpha);}
  function companion(c,id,x,foot,size,alpha=1){art(c,'npc_'+id,x-size*.38,foot-size,size*.76,size,0,alpha);ring(c,x,foot,size*.3,'#9dc9b0',alpha*.35);}
  function cutFade(c,w,h,local){const opacity=Math.max(0,1-local/.065)*.6;if(opacity){c.save();c.globalAlpha=opacity;c.fillStyle='#071118';c.fillRect(0,0,w,h);c.restore();}}
  function stroke(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  function halo(c,x,y,r,color,alpha=.3){c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
  function ring(c,x,y,r,color,alpha=1,flat=.36){c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,r,r*flat,0,0,TAU);c.stroke();c.restore();}
  function pillar(c,x,top,bottom,width,color,alpha){c.save();c.globalAlpha=alpha;const g=c.createLinearGradient(0,top,0,bottom);g.addColorStop(0,'transparent');g.addColorStop(.35,color);g.addColorStop(.7,color);g.addColorStop(1,'transparent');c.fillStyle=g;for(const scale of [1,.56,.2]){c.beginPath();c.moveTo(x-width*.1*scale,top);c.lineTo(x+width*.1*scale,top);c.lineTo(x+width*.5*scale,bottom);c.lineTo(x-width*.5*scale,bottom);c.closePath();c.fill();}c.restore();}
  function sparks(c,x,y,p,color,count=20,range=100,mural=false){for(let i=0;i<count;i++){const a=i*2.39996,delay=(i%4)*.025,q=clamp(p-delay),r=12+ease(q)*range*(.5+(i%5)*.12);c.save();c.globalAlpha=Math.max(0,1-q)*.85;c.fillStyle=color;const sx=x+Math.cos(a)*r,sy=y+Math.sin(a)*r*.62;if(mural)c.fillRect(Math.round(sx),Math.round(sy),3,3);else{c.beginPath();c.ellipse(sx,sy,1.5,3.5,a,0,TAU);c.fill();}c.restore();}}
  function staff(c,x,y,length,angle,alpha=1){c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);const g=c.createLinearGradient(0,-7,0,7);g.addColorStop(0,'#36221b');g.addColorStop(.25,'#be7138');g.addColorStop(.48,'#fff0b8');g.addColorStop(.64,'#b44926');g.addColorStop(1,'#42291e');c.fillStyle=g;c.fillRect(-length/2,-6,length,12);for(const end of [-length/2,length/2-24]){c.fillStyle='#e8c276';c.fillRect(end,-9,24,18);c.fillStyle='#fff1c3';c.fillRect(end+3,-7,17,2);c.fillStyle='#84502e';for(let i=0;i<3;i++)c.fillRect(end+6+i*5,-3,1,8);}c.restore();}
  function stage(c,w,h,chapter,p,mural){const [ink,light]=palettes[chapter]||palettes[0],g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,ink);g.addColorStop(.6,mural?'#174449':ink);g.addColorStop(1,'#08131c');c.fillStyle=g;c.fillRect(0,0,w,h);halo(c,w*.72,h*.48,h*.72,light,.33);const drift=ease(p)*w*.018;
    for(let i=0;i<4;i++){const x=w*(.42+i*.17)-drift*(i+1)*.2,y=h*(.18+i%2*.09),s=h*(.4+i%2*.14);c.save();c.filter='brightness(.23)';art(c,'landmark_'+landmarks[(chapter+i)%6],x,y,s*.8,s,0,.48-i*.06);c.restore();}
    for(let i=0;i<4;i++){const yy=h*(.72+i*.065),fog=c.createLinearGradient(0,yy,w,yy+15);fog.addColorStop(0,'transparent');fog.addColorStop(.6,`${light}20`);fog.addColorStop(1,'transparent');c.fillStyle=fog;c.fillRect(0,yy,w,h*.07);}
  }
  function island(c,x,y,w,theme){c.save();c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.lineTo(x+w-18,y+50);c.lineTo(x+w*.53,y+90);c.lineTo(x+12,y+45);c.closePath();c.clip();art(c,'wall_'+theme,x,y,w,100);c.fillStyle='#07101588';c.fillRect(x,y+20,w,80);c.restore();art(c,'floor_'+theme,x,y-12,w,28);stroke(c,[[x,y-11],[x+w,y-11]],'#b6a47b',2);}
  function moth(c,x,y,p,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);const flap=Math.sin(p*TAU*12);c.fillStyle='#97d7bd';for(const side of [-1,1]){c.beginPath();c.ellipse(side*13,-5,18,4+Math.abs(flap)*8,side*.4,0,TAU);c.fill();}stroke(c,[[0,-11],[0,12]],'#f0cb7d',4);c.fillStyle='#fff0b4';c.fillRect(-2,-14,4,5);c.restore();}
  function skill(canvas,ability,p,detail){const {c,w,h,mural}=surface(canvas),chapter=clamp(Math.floor((detail.floor||0)/3),0,5),theme=['jade','amber','blue','crimson','violet','gold'][chapter];stage(c,w,h,chapter,p,mural);const sx=w*.19,tx=w*.76,ground=h*.84,size=Math.min(h*.76,230),gold='#f0cd85',jade='#a2ddc2';
    ring(c,sx,ground,size*.38,gold,.4);halo(c,sx,ground-size*.45,size*.65,gold,.10);
    if(ability==='staff'){
      const left=tx-w*.14,right=tx+w*.10,land=ground-9;island(c,left-36,ground-3,52,theme);island(c,right,ground-3,52,theme);actor(c,sx,ground,size,p>.16&&p<.67?3:0);const q=ease((p-.18)/.52),x=sx+size*.4+(tx-sx-size*.4)*q,y=ground-size*.68+(land-ground+size*.68)*q-Math.sin(q*Math.PI)*45,len=45+q*w*.26,angle=(1-q)*-.65;
      if(p>.14){for(let i=3;i>0;i--)staff(c,x-i*(1-q)*17,y+i*5,len,angle,.07);staff(c,x,y,len,angle);}
      if(p>.62){halo(c,tx,land,95,gold,Math.sin(clamp((p-.62)/.38)*Math.PI)*.25);sparks(c,tx,land,clamp((p-.62)/.4),gold,24,100,mural);ring(c,tx,ground,55+ease((p-.62)/.38)*55,gold,1-clamp((p-.62)/.38));}
    }else if(ability==='morph'){
      const gate=w*.63,fly=clamp((p-.22)/.4),back=clamp((p-.75)/.19),x=p<.75?sx+(tx-sx)*ease(fly):tx-(tx-sx)*ease(back),y=ground-size*.43-Math.sin(fly*Math.PI)*28;
      if(p<.3)actor(c,sx,ground,size*(1-ease(p/.3)*.7),0,1-clamp(p/.3));else if(p<.91){actor(c,sx,ground,size,0,.06);halo(c,sx,ground-size*.4,size*.5,jade,.08);}if(p>.91)actor(c,sx,ground,size,0,ease((p-.91)/.09));
      ring(c,gate,ground,65,jade,.5);if(p<.68)art(c,'prop_bars',gate-62,ground-150,124,150);else{const q=ease((p-.68)/.24);c.save();c.globalAlpha=1-q;c.translate(gate+q*45,ground-150+q*85);c.rotate(q*.45);art(c,'prop_bars',-62,0,124,150);c.restore();}
      if(p>.18&&p<.94){halo(c,x,y,55,jade,.25);for(let i=1;i<7;i++){c.save();c.globalAlpha=.22-i*.025;stroke(c,[[x-i*12,y+Math.sin(p*40-i)*5],[x-i*12-9,y+3]],jade,2);c.restore();}moth(c,x,y,p);}
      if(p>.61){const q=clamp((p-.61)/.35);art(c,'item_key_blue',gate-15+q*40,ground-78+q*55,32,32,0,1-q);sparks(c,gate,ground-80,q,jade,15,70,mural);}
    }else if(ability==='clone'){
      actor(c,sx,ground,size,p<.33?3:0);art(c,'prop_plate',tx-48,ground-11,96,28);ring(c,tx,ground+3,49,jade,.9);const q=clamp((p-.19)/.48),x=sx+(tx-sx)*ease(q),y=ground-size*.5-Math.sin(q*Math.PI)*42;
      if(q<1){for(let i=4;i>0;i--)actor(c,x-i*20,y+size*.45,size*.58,0,.05*(5-i));stroke(c,[[sx+22,ground-size*.62],[x,y]],gold,1);stroke(c,[[x,y],[x+23,y-13]],gold,3);}
      if(p>.58){const a=ease((p-.58)/.28);halo(c,tx,ground-size*.4,size*.7,jade,.2*a);actor(c,tx,ground,size,0,a*.78);ring(c,tx,ground,52+(1-a)*40,jade,a);sparks(c,tx,ground-size*.5,clamp((p-.58)/.42),jade,24,100,mural);}
    }else{
      actor(c,sx,ground,size,0);const q=ease((p-.12)/.42),eyeY=ground-size*.61;
      halo(c,sx+size*.18,eyeY,40,gold,.6);c.save();c.globalAlpha=.26*q;const beam=c.createLinearGradient(sx,0,tx,0);beam.addColorStop(0,gold);beam.addColorStop(1,'transparent');c.fillStyle=beam;c.beginPath();c.moveTo(sx+25,eyeY);c.lineTo(tx+55,eyeY-65*q);c.lineTo(tx+55,eyeY+65*q);c.closePath();c.fill();c.restore();stroke(c,[[sx+25,eyeY],[sx+25+(tx-sx-25)*q,eyeY]],gold,2);
      const reveal=clamp((p-.46)/.4);art(c,'floor_'+theme,tx-62,ground-18,124,38);for(let i=0;i<4;i++){const xx=tx-60+(i%2)*60,yy=ground-137+Math.floor(i/2)*60;c.save();c.globalAlpha=1-reveal;c.translate((i%2?1:-1)*reveal*36,reveal*30);art(c,'wall_'+theme,xx,yy,60,60);c.restore();}ring(c,tx,eyeY,40+q*25,gold,.8,1);ring(c,tx,eyeY,17+q*7,jade,.8,1);if(p>.46)sparks(c,tx,eyeY,reveal,gold,26,105,mural);
    }
    // A light curtain joins the moving illustration back to the live scene.
    const edge=c.createLinearGradient(0,0,w,0);edge.addColorStop(0,'#0b171b');edge.addColorStop(.06,'transparent');edge.addColorStop(.94,'transparent');edge.addColorStop(1,'#0b171b');c.fillStyle=edge;c.fillRect(0,0,w,h);
  }
  function arrival(canvas,p,detail){const {c,w,h,mural}=surface(canvas),chapter=clamp(Math.floor(detail.floor/3),0,5);stage(c,w,h,chapter,p,mural);const q=ease(p),size=Math.min(h*.78,w*.43),x=w*.72-(1-q)*30,y=h*.64+(1-q)*20;
    halo(c,x,y-size*.3,size*.72,palettes[chapter][1],.38);art(c,'landmark_'+landmarks[chapter],x-size*.46,y-size*.66,size*.92,size*.85,0,.3+q*.7);
    for(let i=0;i<3;i++){const xx=w*(.56+i*.15),yy=h*.84+i%2*9;island(c,xx,yy,w*.11,['jade','amber','blue','crimson','violet','gold'][chapter]);}
    actor(c,w*.64-(1-q)*28,h*.84,Math.min(h*.24,190),q<.7?1:0,q);ring(c,w*.64,h*.84,48,'#e8c17c',.35);
    for(let i=0;i<20;i++){const xx=w*(.47+(i*.197%1)*.52),yy=h*(.14+(i*.371%1)*.7)-q*24;c.fillStyle=i%3?'#c9d8ca33':'#eed19a88';c.fillRect(xx,yy,mural?3:2,mural?3:2);}
    const shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#071319fa');shade.addColorStop(.43,'#071319e8');shade.addColorStop(.7,'#07131922');shade.addColorStop(1,'transparent');c.fillStyle=shade;c.fillRect(0,0,w,h);
    if(p<1){c.fillStyle=`rgba(5,12,19,${(1-q)*.82})`;c.fillRect(0,0,w,h);}
  }
  function scene(canvas,kind,p,detail){const {c,w,h,mural}=surface(canvas),chapter=clamp(Math.floor((detail.floor??17)/3),0,5);if(kind==='boss'){bossDuel(c,w,h,detail,mural);return;}stage(c,w,h,chapter,p,mural);const x=w*.64,ground=h*.84,size=Math.min(h*.56,300),gold='#f2cf88',jade='#a4dbbd',opening=ease(p/.28),gather=ease((p-.25)/.42),finish=ease((p-.65)/.35);
    const shot=detail.shotIndex??1,local=detail.shotProgress??.5,friend=(detail.rescued||[]).includes('bajie')&&kind==='release'?'bajie':'lantern';

    if(kind==='confrontation'){
      const q=ease(local),phase=shot%3,size=Math.min(h*.75,340),foot=h*.88;art(c,'landmark_blacklotus',w*.46,foot-size*1.2,size*1.1,size*1.2,0,.42);art(c,'enemy_boss_'+phase,w*.77-size*.3-q*12,foot-size,size*.78,size,0,.88);cinematicActor(c,w*.52+q*12,foot,size*.72,shot===2?3:0);companion(c,(detail.rescued||[]).includes('bajie')?'bajie':'lantern',w*.42,foot,size*.48,.55);ring(c,w*.82,foot,size*.35,['#d87a50','#dcc187','#a49bce'][phase],.65);cutFade(c,w,h,local);return;
    }
    if(shot===0){
      const drift=ease(local)*w*.018;companion(c,friend,w*.43-drift,ground,size*.78,.9);cinematicActor(c,w*.73-drift,ground,size*.92,0);ring(c,w*.73-drift,ground,size*.44,gold,.4);
      if(kind==='boss'){for(let i=0;i<3;i++)art(c,'enemy_boss_'+i,w*(.49+i*.08),ground-size*1.5,size*.4,size*.6,0,.35);}
      else{halo(c,w*.57,ground-size*.62,size*.5,gold,.22);art(c,'prop_relic',w*.57-24,ground-size*.62-32,48,64,0,.7+ease(local)*.3);}
      cutFade(c,w,h,local);return;
    }
    const zoom=shot===1?1.04+ease(local)*.045:1.03-ease(local)*.06;c.save();c.translate(x,ground);c.scale(zoom,zoom);c.translate(-x,-ground);
    if(kind==='boss'){
      for(let i=0;i<3;i++){const xx=x+(i-1)*w*.2;art(c,'enemy_boss_'+i,xx-size*.47,ground-size*1.15,size*.94,size*1.15,0,1-finish);ring(c,xx,ground,size*.4,i===1?jade:gold,(1-finish)*.55);if(p>.45)sparks(c,xx,ground-size*.5,clamp((p-.45)/.55),i===1?jade:gold,24,size,mural);}halo(c,x,ground-size*.45,size*1.8,gold,finish*.35);cinematicActor(c,x,ground,size,0,finish);
    }else if(kind==='release'||kind==='keep'){
      const release=kind==='release',returning=release?ease((p-.82)/.18):0;art(c,'landmark_blacklotus',x-size*.8,ground-size*1.7,size*1.6,size*1.6,0,release?1-finish*.9:.65);cinematicActor(c,x+returning*w*.16,ground,size,returning>0&&returning<.95?2:release?0:3,release?Math.max(1-finish,returning):1);const spread=release?finish*w*.29:0;
      for(let i=0;i<17;i++){const a=i*TAU/17-Math.PI/2,r=size*.7+opening*size*.2+spread,xx=x+Math.cos(a)*r,yy=ground-size*.6+Math.sin(a)*r*.5;halo(c,xx,yy,20,gold,.65);art(c,'prop_relic',xx-11,yy-14,22,28,0,.4+opening*.6);if(release&&p>.65)stroke(c,[[x,ground-size*.6],[xx,yy]],'#eacc7955',1);}
      if(!release)art(c,'prop_altar',x+size*.54,ground-65,70,76,0,gather);halo(c,x,h*.2,h,release?'#e8c37f':'#80baa8',finish*.38);
    }else{
      const self=kind==='awakening',count=self?16:Math.min(16,detail.externalRelics??3);pillar(c,x,h*.24,ground,size*(.25+gather*.55),gold,gather*.18);cinematicActor(c,x,ground,size,p>.35&&p<.76?3:0);ring(c,x,ground,size*.65,gold,opening*.8);
      for(let i=0;i<count;i++){const a=i*TAU/count-Math.PI/2+p*.45,r=size*(.85-gather*.27),xx=x+Math.cos(a)*r,yy=ground-size*.57+Math.sin(a)*r*.6;halo(c,xx,yy,27,i%2?jade:gold,.55);art(c,'prop_relic',xx-16,yy-20,32,40,0,opening);}
      const orbY=ground-size*.65;halo(c,x,orbY,size*(.28+gather*.35),gold,gather*.45);if(self)art(c,'prop_relic',x-32,orbY-40,64,80,0,gather);else{const icon=['fx_staff','item_key_blue','fx_clone','prop_altar','prop_relic'][detail.relic??0];art(c,icon,x-50,ground-size-80,100,100,0,gather);}
      if(p>.56)sparks(c,x,orbY,clamp((p-.56)/.44),gold,32,size*.9,mural);
      for(let i=0;i<5;i++)ring(c,x,ground+8,60+i*size*.15,gold,finish*(.5-i*.07));
    }
    if(shot===2){companion(c,friend,w*.83,ground,size*.7,ease(local)*.8);if(kind==='release'&&(detail.rescued||[]).includes('tangseng'))companion(c,'tangseng',w*.70,ground,size*.65,ease(local)*.65);}c.restore();
    const v=c.createRadialGradient(x,h*.5,h*.25,x,h*.5,w*.65);v.addColorStop(0,'transparent');v.addColorStop(1,'#061018cc');c.fillStyle=v;c.fillRect(0,0,w,h);cutFade(c,w,h,local);
  }
  function bossDuel(c,w,h,detail,mural){
    const i=clamp(detail.shotIndex||0,0,2),local=detail.shotProgress??.5,phase=detail.phases?.[i],still=detail.motion==='reduced',q=still?.82:local;
    const gold='#eac17c',colors=['#cf7952','#e2bd70','#ac9bd8'],color=colors[i],foot=h*.71,size=Math.min(h*.52,w*.47,460),sx=w*.29,tx=w*.71;
    // One temple silhouette and one shared ground plane anchor the duel.
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,mural?'#0d302e':'#151817');bg.addColorStop(.6,'#15121a');bg.addColorStop(1,'#080f14');c.fillStyle=bg;c.fillRect(0,0,w,h);
    halo(c,tx,foot-size*.5,size*1.45,color,.15);art(c,'landmark_blacklotus',w*.5-size*.62,foot-size*1.1,size*1.24,size*1.1,0,.11);
    const ground=c.createLinearGradient(0,foot-20,0,h);ground.addColorStop(0,'#84704d18');ground.addColorStop(1,'transparent');c.fillStyle=ground;c.fillRect(w*.08,foot-20,w*.84,h-foot+20);stroke(c,[[w*.08,foot+9],[w*.92,foot+9]],'#b99b5724',1);
    for(const x of [sx,tx]){c.save();c.globalAlpha=.5;c.fillStyle='#020607';c.beginPath();c.ellipse(x,foot+3,size*.24,size*.025,0,0,TAU);c.fill();c.restore();}
    const attack=still?0:Math.sin(clamp((q-.22)/.36)*Math.PI),recoil=still?0:Math.sin(clamp((q-.43)/.2)*Math.PI)*size*.035;
    const bossFade=q>.78?1-ease((q-.78)/.22)*.8:1;
    art(c,'enemy_boss_'+i,tx-size*.43+recoil,foot-size,size*.86,size,0,bossFade);
    cinematicActor(c,sx+attack*w*.13,foot,size*.86,q>.2&&q<.62?3:0);
    if(phase?.seal==='clone'&&q>.25&&q<.6)cinematicActor(c,sx+size*.36,foot,size*.81,3,.28*(1-attack));
    if(phase?.seal==='morph'&&q>.3&&q<.6){ring(c,sx,foot-size*.45,size*.34,'#9edac0',.5,1);moth(c,sx+size*.16,foot-size*.55,q,.7);}
    if(q>.22&&q<.76){
      const impact=clamp((q-.22)/.54),alpha=Math.sin(impact*Math.PI);
      const swing=power=>{c.save();c.globalAlpha=alpha;c.strokeStyle=gold;c.lineWidth=power;c.shadowColor=gold;c.shadowBlur=mural?0:12;c.beginPath();c.moveTo(sx+attack*w*.13-size*.17,foot-size*.76);c.quadraticCurveTo(w*.5,foot-size*1.06,tx-size*.1,foot-size*.48);c.stroke();c.shadowBlur=0;c.globalAlpha*=.3;c.lineWidth=1;c.beginPath();c.moveTo(sx+attack*w*.13,foot-size*.67);c.quadraticCurveTo(w*.53,foot-size*.94,tx+size*.06,foot-size*.39);c.stroke();c.restore();};
      if(i===0){stroke(c,[[tx,foot-size*.6],[sx+size*.2,foot-size*.46]],'#b0543c88',3);swing(3);}
      else if(i===1){c.save();c.globalAlpha=alpha;for(let k=0;k<3;k++)stroke(c,[[tx+(k-1)*size*.12,foot-size*.78],[tx+(k-1)*size*.06,foot-size*.5],[tx+(k-1)*size*.16,foot-size*.22]],gold,2);c.restore();swing(5);}
      else{ring(c,tx,foot-size*.5,size*(.24+impact*.25),color,alpha*.8,1);ring(c,sx+size*.12,foot-size*.43,size*.25,'#eac17c',alpha*.6,1);}
      if(phase?.seal==='staff'){halo(c,tx-size*.08,foot-size*.5,size*.27,gold,alpha*.28);swing(6);}
      sparks(c,tx-size*.08,foot-size*.52,impact,color,12,size*.32,mural);
    }
    c.save();c.textAlign='center';c.fillStyle=gold;c.font=`${Math.max(16,Math.min(25,w*.024))}px serif`;c.fillText(['壹 · 破妄金甲','贰 · 击碎执念','叁 · 心火归寂'][i],w*.5,h*.20);
    if(phase){c.fillStyle='#d6c9ac';c.font=`${Math.max(12,Math.min(16,w*.014))}px serif`;c.fillText(`${phase.sealName==='未用印'?'执棒应战':phase.sealName} · 本相生命 −${phase.damage}`,w*.5,h*.25);}c.restore();
    if(i===2&&q>.78){const end=ease((q-.78)/.22);halo(c,tx,foot-size*.5,size*.7,gold,end*.2);art(c,'prop_relic',tx-20,foot-size*.54,40,50,0,end);}
    if(!still)cutFade(c,w,h,local);
  }
  window.TowerFilmArt={skill,arrival,scene};
})();
