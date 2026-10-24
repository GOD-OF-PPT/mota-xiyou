const {chromium}=require('C:/Users/KSG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/'));
  await page.waitForTimeout(500);
  await page.screenshot({path:path.resolve(__dirname,'title.png'),fullPage:true});
  await page.click('#new-game');
  await page.waitForTimeout(120);
  await page.locator('#modal-actions button').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({path:path.resolve(__dirname,'game.png'),fullPage:true});
  console.log(JSON.stringify({errors,dimensions:await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})),floorCount:await page.evaluate(()=>TowerData.floors.length),gameShellVisible:await page.locator('#game-shell').isVisible()},null,2));
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  await page.screenshot({path:path.resolve(__dirname,'help.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.keyboard.press('i');
  await page.waitForTimeout(250);
  await page.screenshot({path:path.resolve(__dirname,'inventory.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.resolve(__dirname,'mobile.png'),fullPage:true});
  console.log(JSON.stringify({mobileWidth:await page.evaluate(()=>document.documentElement.scrollWidth),errors}));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
