/* Targeted rerun after a visual difference. Never starts the full campaign. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const qa=require('./v7-browser-acceptance.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{await qa.visual(browser,{profiles:[{width:844,height:390,dpr:2}],interactions:false});qa.report.completed=true;}catch(e){qa.report.completed=false;qa.report.failure={message:e.message,stack:e.stack};throw e;}finally{fs.writeFileSync(path.join(__dirname,'../audits/v7-targeted-landscape.json'),JSON.stringify(qa.report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
