/* Original six-chapter score and material cues, synthesized locally. */
(function(root){
  'use strict';
  class TowerAudio {
    constructor(){this.context=null;this.timer=0;this.step=0;this.chapter=0;this.scene='planning';this.lastAction=0;this.prefs={music:false,sfx:false};this.nodes=new Set();}
    unlock(){const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return false;if(!this.context)this.context=new AC();this.context.resume();return true;}
    configure(prefs,chapter=0){this.prefs={music:!!prefs.music,sfx:!!prefs.sfx};if(chapter!==this.chapter){this.chapter=chapter;this.step=0;}if(!this.prefs.music){clearInterval(this.timer);this.timer=0;}else if(this.context&&!this.timer){this.tick();this.timer=setInterval(()=>this.tick(),620);} }
    note(freq,duration=.3,type='sine',volume=.025,delay=0){if(!this.context||this.context.state!=='running')return;const t=this.context.currentTime+delay,o=this.context.createOscillator(),g=this.context.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.context.destination);o.start(t);o.stop(t+duration+.03);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};}
    noise(duration=.08,volume=.025,cutoff=1300,delay=0){if(!this.context||this.context.state!=='running')return;const c=this.context,b=c.createBuffer(1,c.sampleRate*duration,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.value=cutoff;g.gain.value=volume;s.buffer=b;s.connect(f);f.connect(g);g.connect(c.destination);s.start(c.currentTime+delay);this.nodes.add(s);s.onended=()=>{this.nodes.delete(s);s.disconnect();f.disconnect();g.disconnect();};}
    tick(){if(!this.prefs.music||!this.context||document.hidden)return;const scales=[[0,3,7,10,12,7,3,5],[0,7,5,12,10,7,3,5],[0,2,7,9,12,9,7,2],[0,3,6,7,12,6,3,7],[0,5,7,10,14,10,7,5],[0,2,3,7,12,10,7,3]],base=[130.81,146.83,110,123.47,146.83,130.81][this.chapter]||130.81,seq=scales[this.chapter]||scales[0],i=this.step++;
      const acting=performance.now()-this.lastAction<1600,volume=this.scene==='awakening'?.026:acting?.014:.008;
      if(i%2===0||acting||this.scene==='awakening')this.note(base*Math.pow(2,seq[i%8]/12),1.25,'sine',volume);
      if(i%8===0)this.note(base/2,3.2,'sine',.016);
      if(acting&&i%2===1)this.note(base/2,.1,'triangle',.013);
    }
    setScene(scene){this.scene=scene;}
    cue(type,meta={}){this.lastAction=performance.now();if(!this.prefs.sfx||!this.context)return;
      if(type==='final-phase'){const i=meta.phase||0;this.note([98,130.8,174.6][i],.55,'triangle',.03);this.note([196,261.6,349.2][i],.8,'sine',.02,.14);this.noise(.12,.018,700+i*450,.3);}
      else if(type==='attack'){const delay=meta.impactDelay??.29;this.note(196,.11,'triangle',.014);this.noise(.075,.04,1300,delay);this.note(92,.12,'triangle',.045,delay);this.note(65,.27,'sine',.04,delay+.025);}
      else if(type==='damage'){this.noise(.13,.025,600);this.note(73,.2,'sine',.045);}
      else if(type==='door'){const mat=meta.material||meta.color||'yellow',f=mat==='red'?174:mat==='blue'?392:196;this.note(f,.18,'triangle',.035);this.note(f*1.49,.35,'sine',.025,.065);this.noise(.1,.015,mat==='blue'?2400:700);}
      else if(type==='pickup'){this.note(587,.12,'triangle',.022);this.note(880,.25,'sine',.025,.08);}
      else if(type==='relic'||type==='selfAwaken'){[0,7,12,16,19,24].forEach((n,i)=>this.note(130.81*Math.pow(2,n/12),1.7,'sine',.036,i*.12));this.note(65.4,2.4,'sine',.05);}
      else if(type==='magic'){const ability=meta.ability||'eye';if(ability==='tide'){this.noise(.55,.027,340);this.note(98,.65,'sine',.04);this.note(146.8,.45,'sine',.018,.13);}else if(ability==='switch'||ability==='resonance'){this.noise(.12,.025,740);this.note(164,.26,'triangle',.035);this.note(246,.5,'sine',.024,.1);}else if(ability==='rescue'){[261,329,392].forEach((f,i)=>this.note(f,.45,'sine',.022,i*.08));}else if(ability==='staff'){this.noise(.17,.024,1000);this.note(130,.35,'triangle',.035);}else if(ability==='morph'){[880,1174,1568,1174].forEach((f,i)=>this.note(f,.09,'sine',.018,i*.045));}else if(ability==='clone'||ability==='recall'){[392,587,784].forEach((f,i)=>this.note(f,.22,'triangle',.02,(ability==='recall'?2-i:i)*.06));}else{this.note(1046,.12,'sine',.023);this.note(1568,.3,'sine',.015,.07);}}
      else if(type==='switch'||type==='gate'||type==='tide'){this.note(type==='tide'?98:164,.26,'triangle',.03);this.noise(.2,.016,type==='tide'?350:850);}
    }
    pause(){this.context?.suspend();}
    resume(){if(this.prefs.music||this.prefs.sfx)this.context?.resume();}
    skip(){for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();}
  }
  root.TowerAudio=TowerAudio;
})(window);
