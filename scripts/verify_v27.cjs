const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),crypto=require('node:crypto');
const tests=['context-layout','image-skins','surfaces','planning','trials','campaign-regression','study'];
const report={startedAt:new Date().toISOString(),runs:[],source:{}};
for(const p of ['index.html','js/ui.js','css/image-ui.css','css/ui-layout.css','playtest-v23-new.html','playtest-v23-baseline.html','js/engine.js','js/journey.js','js/world.js'])report.source[p]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const name of tests){const p='tests/v27-'+name+(name==='campaign-regression'?'.cjs':'-browser.cjs');console.log('RUN '+p);const r=spawnSync(process.execPath,[p],{stdio:'inherit'});report.runs.push({file:p,exit:r.status});fs.writeFileSync('audits/v27-verification.json',JSON.stringify(report,null,2));if(r.status!==0){process.exitCode=1;break;}}
report.finishedAt=new Date().toISOString();report.passed=report.runs.length===tests.length&&report.runs.every(r=>r.exit===0);fs.writeFileSync('audits/v27-verification.json',JSON.stringify(report,null,2));
