// Isolated Chrome and loopback server; deliberately delay native worklet startup.
// Never uses the owner's browser, MIDI device, library or Live Server.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createAppServer}=require('../local-web-server.cjs');
(async()=>{
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext();
    await context.addInitScript(()=>{
      const original=Worklet.prototype.addModule;
      window.workletLoads=[];
      Worklet.prototype.addModule=function(...args){
        if(!window.delayWorklet)return original.apply(this,args);
        return new Promise((resolve,reject)=>window.workletLoads.push(()=>original.apply(this,args).then(resolve,reject)));
      };
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.stack || error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'../assets/demos/first-notes.gp'));
    await page.waitForFunction(async()=>{
      window.fastState=(await import('./js/app-state.js')).AppState;
      window.fastHost=await import('./js/alphatab-host.js');
      return fastState.playerReady && fastState.expectedEvents.length;
    });
    await page.waitForTimeout(700); // selected-track MIDI regeneration
    // Real Play gesture prepares the count-in/context. Pause within count-in
    // must remain immediate and must not start native score output afterward.
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>fastState.countInActive);
    await page.locator('#play-pause-button').click();
    assert.equal(await page.evaluate(()=>fastState.countInActive),false);
    // Start at the native boundary reached after count-in, holding addModule
    // until Pause/Reset/score replacement have had a chance to cancel it.
    for(const action of ['pause','stop','replace','pause']) {
      await page.evaluate(()=>{delayWorklet=true;fastHost.getAlphaTabApi().play();});
      await page.waitForFunction(()=>fastState.isPlaying && workletLoads.length>0);
      if(action==='replace') {
        await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'../assets/demos/easy-chords.gp'));
        await page.waitForFunction(()=>fastState.playerReady && fastState.score.title==='Easy chords');
      } else await page.evaluate(action=>fastHost[action](),action);
      await page.waitForFunction(()=>!fastState.isPlaying);
      await page.evaluate(async()=>{delayWorklet=false;const loads=workletLoads.splice(0);await Promise.all(loads.map(load=>load()));});
      await page.waitForTimeout(100);
      assert.deepEqual(errors,[],`${action}: no startup/Pause errors`);
      assert.equal(await page.evaluate(()=>Boolean(fastHost.getAlphaTabApi().player.output.source)),false,`${action}: no delayed source`);
      assert.equal(await page.evaluate(()=>Boolean(fastHost.getAlphaTabApi().player.output._worklet)),false,`${action}: no delayed worklet`);
      // Native resume still starts and advances; an obsolete startup cannot
      // override the new source. Normal Pause then releases both audio nodes.
      await page.evaluate(()=>fastHost.getAlphaTabApi().play());
      await page.waitForFunction(()=>fastState.isPlaying && fastHost.getAlphaTabApi().player.output._worklet && fastState.tickPosition>0);
      await page.evaluate(()=>fastHost.pause());await page.waitForFunction(()=>!fastState.isPlaying);
      console.log(`PASS delayed startup -> ${action} -> release -> normal resume/Pause`);
    }
    assert.deepEqual(errors,[]);console.log('PASS no page errors; cancelled count-in and native startup never resume later');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
