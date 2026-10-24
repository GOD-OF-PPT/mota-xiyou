/* Bounded whole-state recovery. No partial resource merges or reward replay. */
(function(root){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x)),chapter=s=>Math.floor(s.floor/3);
  class TowerChronicle{
    constructor(engine){this.engine=engine;this.trail=new WeakMap();this.start(true);}
    start(resumed=false){const s=this.engine.state;this.data={version:1,campaign:s.startedAt,seq:0,seen:[...new Set(s.visited.map(f=>Math.floor(f/3)))],records:[],returnPoint:null};this.capture('chapter','chapter:'+chapter(s),resumed?'续档起点 · 第 '+(s.floor+1)+' 层':'第一回 · 入塔');}
    capture(type,key,title){const d=this.data;d.records.push({id:++d.seq,type,key,title,state:this.engine.snapshot()});const choices=d.records.filter(r=>r.type==='choice');if(choices.length>8)d.records=d.records.filter(r=>r!==choices[0]);}
    decision(e){this.capture('choice',e.choice,(this.engine.data.choices[e.choice]?.name||e.label||'取舍')+' · 选择前');}
    changed(){const s=this.engine.state,c=chapter(s);if(!this.data.seen.includes(c)){this.data.seen.push(c);this.capture('chapter','chapter:'+c,'第 '+(c+1)+' 回 · 首次踏入');}}
    align(){const s=this.engine.state;this.data.records=this.data.records.filter(r=>r.state.turn<=s.turn&&Object.entries(r.state.choices).every(([k,v])=>s.choices[k]===v));this.data.seen=[...new Set(s.visited.map(f=>Math.floor(f/3)))];}
    remember(state){this.trail.set(state,{...this.data,records:[...this.data.records],seen:[...this.data.seen]});}
    rewind(state){const remembered=this.trail.get(state);if(remembered)this.data={...remembered,records:[...remembered.records],seen:[...remembered.seen]};else this.align();}
    export(){return copy(this.data);}
    decode(raw,state){
      if(!raw)return null;if(JSON.stringify(raw).length>1700000||raw.version!==1||raw.campaign!==state.startedAt||!Number.isInteger(raw.seq)||raw.seq<0||!Array.isArray(raw.seen)||raw.seen.some(c=>!Number.isInteger(c)||c<0||c>5)||!Array.isArray(raw.records)||raw.records.length>14)throw Error('章回记录不正确');
      const checkRecords=(records,limit)=>{if(!Array.isArray(records)||records.length>14)throw Error('章回数量不正确');const ids=new Set();let prior=0;for(const r of records){if(!Number.isInteger(r.id)||r.id<=prior||r.id>limit||ids.has(r.id)||!['chapter','choice'].includes(r.type)||typeof r.key!=='string'||typeof r.title!=='string'||r.title.length>100)throw Error('章回条目不正确');ids.add(r.id);prior=r.id;this.engine.validate(r.state);if(r.state.startedAt!==state.startedAt)throw Error('章回不属于这段旅程');}return records;};
      checkRecords(raw.records,raw.seq);if(raw.returnPoint){const p=raw.returnPoint;this.engine.validate(p.state);if(p.state.startedAt!==state.startedAt||!Number.isInteger(p.seq)||p.seq<0||!Array.isArray(p.seen)||p.seen.some(c=>!Number.isInteger(c)||c<0||c>5))throw Error('返回前缘不正确');checkRecords(p.records,p.seq);}
      return copy(raw);
    }
    load(decoded){if(decoded)this.data=decoded;else this.start(true);}
    list(){return this.data.records.map(r=>({id:r.id,type:r.type,title:r.title,floor:r.state.floor,turn:r.state.turn,hp:r.state.hp,keys:copy(r.state.keys),coins:r.state.coins,orbs:r.state.orbs}));}
    restore(id){const i=this.data.records.findIndex(r=>r.id===id);if(i<0)return false;const d=this.data,r=d.records[i],state=copy(r.state);this.engine.validate(state);const present={state:this.engine.snapshot(),records:copy(d.records),seq:d.seq,seen:[...d.seen]};d.records=d.records.slice(0,i+1);d.seen=[...new Set(state.visited.map(f=>Math.floor(f/3)))];d.returnPoint=present;this.replace(state);return true;}
    returnToPresent(){const p=this.data.returnPoint;if(!p)return false;this.engine.validate(p.state);this.data.records=copy(p.records);this.data.seq=p.seq;this.data.seen=[...p.seen];this.data.returnPoint=null;this.replace(copy(p.state));return true;}
    replace(state){const e=this.engine;e.state=state;e.history=[];e.redoHistory=[];e.lastCheckpointKind=null;e.motion=null;e.selection=null;e.path=[];e.mode='walk';e.save(true);e.emit('reset');e.emit('recovered');}
  }
  root.TowerChronicle=TowerChronicle;
})(typeof window!=='undefined'?window:globalThis);
