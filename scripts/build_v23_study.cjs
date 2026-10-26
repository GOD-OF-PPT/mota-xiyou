/* Prepare isolated v22/v23 observation entries without touching index.html. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),backup='.backups/implementation-v23-20261024',out='research/study-v23';
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x)),stateHash=s=>{s=copy(s);delete s.startedAt;return sha(JSON.stringify(s));};
fs.mkdirSync(path.join(root,out),{recursive:true});
class StudyClock extends Date {static now(){return 1792805048000;}}
const context=files=>{const c=vm.createContext({console,Date:StudyClock});c.window=c;for(const file of files)vm.runInContext(read(file),c,{filename:file});return c;};
const baseline=context(['world','chronicle','engine'].map(f=>`${backup}/js/${f}.js`)),current=context(['world','encounters','chronicle','outcomes','engine','trial-seeds'].map(f=>`js/${f}.js`));
const fixtures={baseline:{},new:{}},trace=JSON.parse(read('tests/playthrough-v9-free-mixed-direct-offering.json')).actions;
for(const [variant,c]of [['baseline',baseline],['new',current]]) {
 const revision=variant==='baseline'?6:7,data=variant==='baseline'?c.TowerData:c.TowerEncounters.latest;
 const initial=new c.TowerEngine(data,{persist:false});initial.newGame();
 fixtures[variant]['first-three']={id:`campaign-r${revision}-start`,state:copy(initial.state),startHash:stateHash(initial.state),budgetGroup:'first-three-620-24-10',source:{script:'TowerEngine.newGame',actions:0,revision}};
 // A spawn-only correction must not lock a prior participant out of their save.
 // Retain exactly the known former first-three start, not arbitrary changed tasks.
 if(variant==='new'){
  const former=copy(initial.state),lantern=data.floors[0].entities.find(e=>e.type==='altar');
  Object.assign(former,{x:lantern.x,y:lantern.y});
  const formerHash=stateHash(former);
  if(formerHash!==stateHash(initial.state))fixtures[variant]['first-three'].compatibleStartHashes=[formerHash];
 }
 for(const task of ['ferry','silk']) {
  const t=current.TOWER_TRIALS.trials.find(t=>t.id===`${task}-r${revision}`);
  let seed=copy(t.seed);
  if(variant==='baseline') {
   const actor=new c.TowerEngine(data,{persist:false});actor.newGame();
   for(let i=0;i<trace.length;i++) {if(task==='ferry'&&i>=103&&i<=107)continue;const a=trace[i];assert.ok(actor[a.type](...a.args)!==false,`v22 prefix ${i} ${a.type}`);if(actor.state.floor===t.floor)break;}
   const original=copy(actor.state),published=copy(t.seed);for(const state of [original,published]){delete state.startedAt;delete state.outcomes;}
   assert.deepEqual(original,published,'Frozen v22 must reproduce revision-6 gameplay state; v23-only outcome receipts are absent');
   seed=copy(actor.state);
  }
  fixtures[variant][task]={id:t.id,state:seed,startHash:stateHash(seed),budgetGroup:task+'-canonical-v23-study',source:JSON.parse(read('research/trials-v23-routes.json')).starts.find(r=>r.id===t.id)};
 }
}
for(const task of ['first-three','ferry','silk'])for(const key of ['hp','atk','def','mana','maxMana','coins','orbs','elixirs','keys','equipped','treasures','rescued','relics'])assert.deepEqual(fixtures.baseline[task].state[key],fixtures.new[task].state[key],task+' paired budget '+key);
write(out+'/fixtures.js','/* Generated legal task setup, not participant observations. */\nwindow.TOWER_STUDY_FIXTURES='+JSON.stringify(fixtures)+';\n');
for(const variant of ['baseline','new']) {
 let html=read(variant==='baseline'?backup+'/index.html':'index.html');
 if(variant==='baseline')html=html.replace(/((?:src|href)=")(js|css)\//g,`$1${backup}/$2/`);
 html=html.replace('<head>','<head>\n  <script src="js/study-storage.js?v=24" data-variant="'+variant+'"></script>');
 if(variant==='new')html=html.replace('js/study-storage.js?v=24','js/study-storage.js?v=30');
 const ui=variant==='baseline'?backup+'/js/ui.js':'js/ui.js';
 html=html.replace(new RegExp('  <script defer src="'+ui.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?v=\\d+"></script>'),`  <script defer src="${out}/fixtures.js?v=${variant==='baseline'?24:28}"></script>\n  <script defer src="js/study-setup.js?v=${variant==='baseline'?24:28}"></script>\n  <script defer src="${ui}?v=${variant==='baseline'?22:38}"></script>\n  <script defer src="js/study-entry.js?v=24"></script>`);
 assert.ok(html.includes('js/study-entry.js')&&html.indexOf('js/study-setup.js')<html.indexOf(ui+'?'),'setup precedes runtime UI');
 write('playtest-v23-'+variant+'.html',html);
}
const runtimeInputs=[...new Set(['index.html',backup+'/index.html'].flatMap(p=>[...read(p).matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)(?:\?[^"]*)?"/g)].map(m=>p.startsWith(backup)?backup+'/'+m[1]:m[1])))];
const inputs=[...runtimeInputs,'css/study-foyer.css','js/study-foyer.js','index.html',backup+'/index.html','js/trial-seeds.js','research/trials-v23-routes.json','scripts/build_v23_study.cjs','js/study-storage.js','js/study-setup.js','js/study-entry.js','playtest-v23.html',...['baseline','new'].flatMap(v=>Object.values(fixtures[v]).filter(f=>f.source.script==='TowerEngine.newGame').map(()=>v==='baseline'?backup+'/js/engine.js':'js/engine.js'))];
const manifest={purpose:'Human observation preparation only; no observed participants or results.',source:Object.fromEntries([...new Set(inputs)].map(p=>[p,sha(read(p))])),tasks:Object.fromEntries(Object.entries(fixtures).map(([v,tasks])=>[v,Object.fromEntries(Object.entries(tasks).map(([task,f])=>[task,{id:f.id,startHash:f.startHash,budgetGroup:f.budgetGroup,source:f.source}]))])),outputs:Object.fromEntries(['playtest-v23-baseline.html','playtest-v23-new.html',out+'/fixtures.js'].map(p=>[p,sha(read(p))])),sharedAssets:'Root assets reused; v22 runtime JS/CSS comes from frozen backup. Both entries run campaign tasks, with the same predeclared goal and budget.',storage:'Prefix by anonymous participant, version, task, objective and round. Production localStorage keys are invisible to the game in these entries.'};
write(out+'/manifest.json',JSON.stringify(manifest,null,2));
console.log('Prepared six paired campaign task setups and two isolated game entries.');
