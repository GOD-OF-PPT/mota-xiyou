/* Study pages only. Install before any game script, never in index.html. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const participant = params.get('participant') || '';
  const task = params.get('task') || '';
  const round = params.get('round') || '';
  const objective = params.get('objective') || '';
  const variant = document.currentScript.dataset.variant;
  const goals = {'first-three':['explore'], ferry:['keep-key','lantern-way'], silk:['atk','def']};
  const valid = /^[A-Za-z0-9_-]{1,24}$/.test(participant) && /^[1-9][0-9]?$/.test(round) && goals[task]?.includes(objective) && ['baseline','new'].includes(variant);
  const prefix = 'dasheng-study-v23:' + (valid ? [participant,variant,task,objective,round].join(':') : 'invalid') + ':';
  let nativeStorage, failure = valid ? '' : '请从试玩准备页填写匿名编号、任务和轮次后进入。';
  try { nativeStorage = window.localStorage; } catch { failure = '当前浏览器未允许本地存储，请允许后重新打开。'; }
  const memory = new Map();
  const keys = () => nativeStorage ? Array.from({length:nativeStorage.length}, (_,i)=>nativeStorage.key(i)).filter(k=>k?.startsWith(prefix)).map(k=>k.slice(prefix.length)) : [...memory.keys()];
  const methods = {
    getItem(key) { key=String(key); return nativeStorage ? nativeStorage.getItem(prefix+key) : memory.get(key) ?? null; },
    setItem(key,value) { key=String(key);value=String(value);if(nativeStorage)nativeStorage.setItem(prefix+key,value);else memory.set(key,value); },
    removeItem(key) { key=String(key);if(nativeStorage)nativeStorage.removeItem(prefix+key);else memory.delete(key); },
    clear() { for(const key of keys())methods.removeItem(key); },
    key(index) { return keys()[Number(index) >>> 0] ?? null; }
  };
  const storage = new Proxy(Object.create(null), {
    get(_,key) { if(key==='length')return keys().length;if(key===Symbol.toStringTag)return 'Storage';return Object.hasOwn(methods,key)?methods[key]:typeof key==='string'?methods.getItem(key)??undefined:undefined; },
    set(_,key,value) { methods.setItem(key,value);return true; },
    deleteProperty(_,key) { methods.removeItem(key);return true; },
    ownKeys() { return keys(); },
    getOwnPropertyDescriptor(_,key) { return keys().includes(key)?{enumerable:true,configurable:true,value:methods.getItem(key),writable:true}:undefined; }
  });
  // Fail closed: even an invalid entry cannot see or overwrite production keys.
  Object.defineProperty(window,'localStorage',{value:storage,configurable:false});
  const art=['material','mural'].includes(params.get('art'))?params.get('art'):'material';
  if(valid&&!failure)try{if(variant==='baseline'||storage.getItem('dasheng-art-style-v6')===null)storage.setItem('dasheng-art-style-v6',art);}catch{failure='本轮试玩无法保存，请检查浏览器本地存储空间。';}
  window.TowerStudy = {participant,task,round,objective,variant,prefix,valid,failure,art};
})();
