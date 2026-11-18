/* Local MP3 scene music with seamless Web Audio Pentatonic Guqin/Xiao fallback; synthesized action and material cues. */
(function(root){
  'use strict';
  const SCALES={
    title:[196.00,220.00,261.63,293.66,329.63,392.00,440.00,523.25],
    exploration:[146.83,164.81,196.00,220.00,261.63,293.66,329.63,392.00],
    victory:[261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25]
  };
  const PATTERNS={
    title:[0,2,4,5,4,2,1,4,5,7,5,4,2,0,-1,2],
    exploration:[0,3,2,4,3,1,0,-1,2,4,5,4,2,1,0,-1],
    victory:[0,2,4,5,7,5,4,5,4,2,4,5,7,6,5,7]
  };
  function resolveBgmUrl(file){
    try{
      const base=document.baseURI||'';
      if(/^https?:|^file:/i.test(base))return new URL('assets/audio/bgm/'+file,base).href;
    }catch{}
    return 'assets/audio/bgm/'+file;
  }
  class TowerAudio {
    constructor(){
      this.context=null;this.scene='planning';this.lastAction=0;this.prefs={music:false,sfx:false};this.nodes=new Set();
      this.musicScene='title';this.titleIndex=-1;this.track=null;this.retiring=null;this.fades=new Map();
      this.unlocked=false;this.suspended=!!document.hidden;this.onStatus=null;
      this.synthActive=false;this.synthTimer=0;this.synthStep=0;this.forceSynth=!!root.__MOTA_SINGLE_FILE__;
    }
    ensureContext(){
      const AC=root.AudioContext||root.webkitAudioContext;
      if(!AC)return null;
      if(!this.context){try{this.context=new AC();}catch{return null;}}
      if(this.context.state==='suspended')this.context.resume().catch(()=>{});
      return this.context;
    }
    unlock(retry=false){
      this.unlocked=true;
      if(this.track)this.track.blocked=false;
      if(this.prefs.sfx||this.prefs.music)this.ensureContext();
      if(retry&&this.track?.failed){this.track.failed=false;this.synthActive=false;try{this.track.player.load();}catch{}}
      this.syncMusic();return true;
    }
    configure(prefs,chapter=0,musicScene=this.musicScene){
      const oldSfx=this.prefs.sfx;this.prefs={music:!!prefs.music,sfx:!!prefs.sfx};
      this.chapter=chapter||0;
      if(oldSfx&&!this.prefs.sfx)this.skip();
      if(['title','exploration','victory'].includes(musicScene)&&musicScene!==this.musicScene){
        this.musicScene=musicScene;if(musicScene==='title')this.titleIndex=Math.floor(Math.random()*2);
        this.synthStep=0;
      }
      this.syncMusic();
    }
    musicStatus(){
      const mp3Playing=!!this.track&&!this.track.player.paused;
      return {
        enabled:this.prefs.music,
        scene:this.musicScene,
        file:this.synthActive?'古琴洞箫合成雅乐':(this.track?.file||''),
        playing:mp3Playing||this.synthActive,
        waiting:!this.unlocked||(!this.synthActive&&!!this.track?.blocked),
        failed:!this.synthActive&&!!this.track?.failed
      };
    }
    notify(){this.onStatus?.(this.musicStatus());}
    musicFile(){
      if(this.musicScene!=='title')return this.musicScene+'.mp3';
      if(this.titleIndex<0)this.titleIndex=Math.floor(Math.random()*2);
      return 'title-0'+(this.titleIndex+1)+'.mp3';
    }
    cancelFade(player){const id=this.fades.get(player);if(id)cancelAnimationFrame(id);this.fades.delete(player);}
    fade(player,to,done){
      this.cancelFade(player);const from=player.volume,start=performance.now();
      const step=now=>{const t=Math.min(1,(now-start)/700);player.volume=Math.max(0,Math.min(1,from+(to-from)*t));
        if(t<1)this.fades.set(player,requestAnimationFrame(step));else{this.fades.delete(player);done?.();}};
      this.fades.set(player,requestAnimationFrame(step));
    }
    dispose(track){
      if(!track)return;track.disposed=true;this.cancelFade(track.player);try{track.player.pause();track.player.removeAttribute('src');track.player.load();track.player.remove();}catch{}
    }
    stopSynth(){
      if(this.synthTimer){clearInterval(this.synthTimer);this.synthTimer=0;}
      this.synthActive=false;
    }
    startSynth(){
      if(!this.prefs.music||!this.unlocked||this.suspended||document.hidden)return;
      const c=this.ensureContext();if(!c)return;
      if(this.synthActive&&this.synthTimer)return;
      this.stopSynth();this.synthActive=true;
      const tick=()=>{
        if(!this.prefs.music||!this.unlocked||this.suspended||document.hidden){this.stopSynth();return;}
        if(!this.context||this.context.state!=='running')return;
        const scale=SCALES[this.musicScene]||SCALES.exploration,pat=PATTERNS[this.musicScene]||PATTERNS.exploration;
        const idx=pat[this.synthStep%pat.length];
        if(this.synthStep%8===0){
          const rootFreq=scale[0]*0.5;
          this.bgmVoice(rootFreq,2.8,'sine',0.024,0.35);
          this.bgmVoice(rootFreq*1.5,2.4,'triangle',0.012,0.4);
        }
        if(idx>=0){
          const f=scale[(idx+(this.chapter||0)%2)%scale.length];
          this.bgmVoice(f,1.05,'triangle',this.musicScene==='exploration'?0.018:0.024,0.018);
          if(this.synthStep%4===2)this.bgmVoice(f*2,1.35,'sine',0.009,0.12);
        }
        this.synthStep++;
      };
      tick();
      this.synthTimer=setInterval(tick,this.musicScene==='exploration'?680:560);
      this.notify();
    }
    bgmVoice(freq,duration,type,volume,attack=0.02){
      if(!this.context||this.context.state!=='running')return;
      const t=this.context.currentTime,o=this.context.createOscillator(),g=this.context.createGain();
      o.type=type;o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),t+attack);
      g.gain.exponentialRampToValueAtTime(0.0001,t+duration);
      o.connect(g);g.connect(this.context.destination);
      o.start(t);o.stop(t+duration+0.04);
      o.onended=()=>{o.disconnect();g.disconnect();};
    }
    pauseMusic(){
      this.stopSynth();
      if(this.retiring){this.dispose(this.retiring);this.retiring=null;}
      if(this.track){this.track.playId++;this.track.pending=false;this.cancelFade(this.track.player);try{this.track.player.pause();this.track.player.volume=0;}catch{}}
      this.notify();
    }
    syncMusic(){
      if(!this.prefs.music||!this.unlocked||this.suspended||document.hidden){this.pauseMusic();return;}
      if(this.forceSynth||!/^https?:|^file:/i.test(document.baseURI||'')){this.startSynth();return;}
      const file=this.musicFile();
      if(this.track?.file!==file){
        this.stopSynth();
        this.dispose(this.retiring);const old=this.track;this.retiring=old;
        if(old)this.fade(old.player,0,()=>{this.dispose(old);if(this.retiring===old)this.retiring=null;});
        const player=document.createElement('audio');player.hidden=true;player.preload='auto';player.volume=0;
        player.loop=this.musicScene!=='title';player.dataset.bgm=file;player.dataset.musicScene=this.musicScene;
        player.src=resolveBgmUrl(file);
        const track={file,player,playId:0,pending:false,failed:false,blocked:false,disposed:false};this.track=track;
        player.addEventListener('ended',()=>{
          if(track!==this.track||!this.prefs.music||this.musicScene!=='title')return;
          this.titleIndex=1-this.titleIndex;this.syncMusic();
        });
        player.addEventListener('error',()=>{
          if(track.disposed||track!==this.track)return;
          track.failed=true;track.pending=false;this.cancelFade(player);try{player.pause();}catch{}
          this.startSynth();this.notify();
        });
        document.body.append(player);
      }
      const track=this.track;
      if(track.failed){this.startSynth();return;}
      if(track.pending||track.blocked||!track.player.paused)return;
      const playId=++track.playId;track.pending=true;track.blocked=false;
      track.player.play().then(()=>{
        if(playId!==track.playId)return;
        track.pending=false;this.stopSynth();
        if(track.disposed||track!==this.track||!this.prefs.music||this.suspended||document.hidden){track.player.pause();return;}
        this.fade(track.player,this.musicScene==='exploration'?.28:.38);this.notify();
      }).catch(error=>{
        if(playId!==track.playId)return;
        track.pending=false;if(track.disposed||track!==this.track)return;
        if(error.name==='NotAllowedError')track.blocked=true;
        else if(error.name!=='AbortError'){track.failed=true;this.startSynth();}
        this.notify();if(error.name==='AbortError'&&this.prefs.music&&!this.suspended&&!document.hidden)this.syncMusic();
      });
      this.notify();
    }
    note(freq,duration=.3,type='sine',volume=.025,delay=0){if(!this.context||this.context.state!=='running')return;const t=this.context.currentTime+delay,o=this.context.createOscillator(),g=this.context.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.context.destination);o.start(t);o.stop(t+duration+.03);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};}
    noise(duration=.08,volume=.025,cutoff=1300,delay=0){if(!this.context||this.context.state!=='running')return;const c=this.context,b=c.createBuffer(1,Math.max(1,Math.floor(c.sampleRate*duration)),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=this.createGain?this.createGain():c.createGain();f.type='lowpass';f.frequency.value=cutoff;g.gain.value=volume;s.buffer=b;s.connect(f);f.connect(g);g.connect(c.destination);s.start(c.currentTime+delay);this.nodes.add(s);s.onended=()=>{this.nodes.delete(s);s.disconnect();f.disconnect();g.disconnect();};}
    setScene(scene){this.scene=scene;}
    cue(type,meta={}){this.lastAction=performance.now();if(!this.prefs.sfx)return;if(!this.context)this.ensureContext();if(!this.context||this.context.state!=='running')return;
      if(type==='final-phase'){const i=meta.phase||0;this.note([98,130.8,174.6][i],.55,'triangle',.03);this.note([196,261.6,349.2][i],.8,'sine',.02,.14);this.noise(.12,.018,700+i*450,.3);}
      else if(type==='stance'){const st=meta.stance||'balanced';if(st==='cleave'){this.note(130.8,.16,'sawtooth',.024);this.note(196,.24,'triangle',.028,.04);this.noise(.07,.02,900,.02);}else if(st==='whirl'){[392,523.25,659.25].forEach((f,i)=>this.note(f,.16,'sine',.018,i*.035));}else{this.note(261.6,.18,'triangle',.022);this.note(392,.22,'sine',.018,.04);}}
      else if(type==='seal'){[261.63,329.63,392,523.25,659.25].forEach((f,i)=>this.note(f,.55,'sine',.026,i*.07));this.note(130.81,1.1,'triangle',.03);}
      else if(type==='attack'){
        const delay=meta.impactDelay??.29,st=meta.stance||'balanced';
        if(st==='cleave'){this.note(146.8,.13,'sawtooth',.02);this.noise(.11,.052,1550,delay);this.note(73.4,.22,'triangle',.055,delay);this.note(55,.34,'sine',.048,delay+.02);}
        else if(st==='whirl'){this.note(329.6,.09,'sine',.018);this.note(440,.09,'sine',.016,.05);this.noise(.065,.032,1800,delay);this.note(110,.18,'triangle',.036,delay);}
        else{this.note(196,.11,'triangle',.014);this.noise(.075,.04,1300,delay);this.note(92,.12,'triangle',.045,delay);this.note(65,.27,'sine',.04,delay+.025);}
      }
      else if(type==='damage'){this.noise(.13,.025,600);this.note(73,.2,'sine',.045);}
      else if(type==='door'){const mat=meta.material||meta.color||'yellow',f=mat==='red'?174:mat==='blue'?392:196;this.note(f,.18,'triangle',.035);this.note(f*1.49,.35,'sine',.025,.065);this.noise(.1,.015,mat==='blue'?2400:700);}
      else if(type==='pickup'){this.note(587,.12,'triangle',.022);this.note(880,.25,'sine',.025,.08);}
      else if(type==='relic'||type==='selfAwaken'){[0,7,12,16,19,24].forEach((n,i)=>this.note(130.81*Math.pow(2,n/12),1.7,'sine',.036,i*.12));this.note(65.4,2.4,'sine',.05);}
      else if(type==='magic'){const ability=meta.ability||'eye';if(ability==='tide'){this.noise(.55,.027,340);this.note(98,.65,'sine',.04);this.note(146.8,.45,'sine',.018,.13);}else if(ability==='switch'||ability==='resonance'){this.noise(.12,.025,740);this.note(164,.26,'triangle',.035);this.note(246,.5,'sine',.024,.1);}else if(ability==='rescue'){[261,329,392].forEach((f,i)=>this.note(f,.45,'sine',.022,i*.08));}else if(ability==='staff'){this.noise(.17,.024,1000);this.note(130,.35,'triangle',.035);}else if(ability==='morph'){[880,1174,1568,1174].forEach((f,i)=>this.note(f,.09,'sine',.018,i*.045));}else if(ability==='clone'||ability==='recall'){[392,587,784].forEach((f,i)=>this.note(f,.22,'triangle',.02,(ability==='recall'?2-i:i)*.06));}else{this.note(1046,.12,'sine',.023);this.note(1568,.3,'sine',.015,.07);}}
      else if(type==='switch'||type==='gate'||type==='tide'){this.note(type==='tide'?98:164,.26,'triangle',.03);this.noise(.2,.016,type==='tide'?350:850);}
    }
    pause(){this.suspended=true;this.pauseMusic();this.skip();this.context?.suspend().catch(()=>{});}
    resume(){this.suspended=!!document.hidden;if(this.unlocked&&(this.prefs.music||this.prefs.sfx))this.context?.resume().catch(()=>{});this.syncMusic();}
    skip(){for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();}
  }
  root.TowerAudio=TowerAudio;
})(window);
