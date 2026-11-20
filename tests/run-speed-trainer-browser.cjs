// Isolated native synth and audio-clock check using an in-memory GP score.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');

(async()=>{
  const {repeatFixture}=await import('./media-repeat-fixtures.js');
  const {bytes}=repeatFixture({tex:String.raw`\tempo 180 . \ts 2 4 0.6.4 1.6.4 | 2.6.4 3.6.4 | 4.6.4 5.6.4`});
  const server=createAppServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const page=await browser.newPage({viewport:{width:1600,height:900}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#score-file-input').setInputFiles({name:'speed-training.gp',mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
    await page.waitForFunction(async()=>{
      window.s=(await import('./js/app-state.js')).AppState;
      window.host=await import('./js/alphatab-host.js');
      return s.playerReady && s.expectedEvents.length;
    });
    await page.locator('#btn-looper').click();
    await page.locator('#practice-loop-enabled').check();
    for(const id of ['practice-loop-start','practice-loop-end']) {
      await page.locator('#'+id).fill('2');await page.locator('#'+id).press('Enter');
    }
    await page.locator('#training-summary').click();
    await page.locator('#training-target').fill('68');
    await page.locator('#training-action').click();
    assert.equal(await page.evaluate(()=>s.playbackSpeed),0.6);
    await page.evaluate(()=>{
      window.finishes=[];window.clicks=[];
      host.getAlphaTabApi().playerFinished.on(()=>finishes.push(s.playbackSpeed));
      const start=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(time,...args){
        if(s.countInActive)clicks.push({time,speed:s.playbackSpeed});
        return start.call(this,time,...args);
      };
    });
    await page.keyboard.press('Escape');
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>finishes.length>=6);
    assert.deepEqual(await page.evaluate(()=>finishes.slice(0,6)),[0.6,0.65,0.65,0.68,0.68,0.68]);
    await page.locator('#stop-button').click();
    assert.equal(await page.evaluate(()=>s.playbackSpeed),0.6);
    // Start halfway through a pass via the paused browsing transport.
    await page.evaluate(()=>{
      finishes.length=0;
      host.seekPausedTick(s.practiceLoop.range.startTick+960);
    });
    await page.waitForFunction(()=>s.tickPosition>=s.practiceLoop.range.startTick+950);
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>finishes.length>=2);
    assert.deepEqual(await page.evaluate(()=>finishes.slice(0,2)),[0.6,0.6]);
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>!s.isPlaying && !s.countInActive);
    assert.equal(await page.evaluate(()=>s.practiceLoop.speedTraining.completed),1);
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>finishes.length>=3);
    assert.equal(await page.evaluate(()=>finishes[2]),0.65);
    await page.locator('#stop-button').click();
    await page.locator('#btn-looper').click();await page.locator('#loop-count-in').check();
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{finishes.length=0;clicks.length=0;});
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>clicks.length>=6);
    const clicks=await page.evaluate(()=>clicks.slice(0,6));
    for(const [i,speed] of [[0,0.6],[2,0.6],[4,0.65]]) {
      assert.equal(clicks[i].speed,speed);
      assert(Math.abs(clicks[i+1].time-clicks[i].time-60/180/speed)<0.001,'click spacing follows the upcoming loop');
    }
    await page.locator('#stop-button').click();
    await page.locator('#btn-practice').click();
    await page.locator('input[name="practice-mode"][value="wait"]').check();
    await page.keyboard.press('Escape');await page.locator('#btn-looper').click();
    assert(await page.locator('#training-action').isDisabled());
    assert.equal(await page.evaluate(()=>s.practiceLoop.speedTraining),null);
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.querySelector('#training-fields').scrollWidth<=document.querySelector('#looper-popup').clientWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS continuous synth loops, upcoming count-in clicks, target cap, Reset and Wait.');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
