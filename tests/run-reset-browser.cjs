// Real native worker/cursor in isolated Chrome; no owner storage or MIDI.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const {createAppServer}=require('../local-web-server.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'fixtures/fretboard-multistring.gp'));
    await page.waitForFunction(async()=>{
      window.resetHost=await import('./js/alphatab-host.js');
      window.resetState=(await import('./js/app-state.js')).AppState;
      return resetState.playerReady && resetState.playbackTimeline;
    });
    await page.evaluate(()=>{const c=document.querySelector('#score-zoom');c.value='200';c.dispatchEvent(new Event('input'));c.dispatchEvent(new Event('change'));});
    await page.waitForTimeout(800);
    for(const follow of [true,false]) {
      await page.evaluate(follow=>{const c=document.querySelector('#score-auto-scroll');c.checked=follow;c.dispatchEvent(new Event('change'));},follow);
      await page.evaluate(()=>{const api=resetHost.getAlphaTabApi();api.tickPosition=resetState.playbackTimeline.measures.at(-1).startTick;});
      await page.waitForTimeout(500);
      const before=await page.evaluate(()=>{const w=document.querySelector('#alphatab-wrapper');w.scrollTop=w.scrollHeight;return w.scrollTop;});
      assert(before>50,'fixture must actually scroll');
      await page.locator('#stop-button').click();
      await page.waitForFunction(()=>resetState.tickPosition<3 && !resetState.isPlaying);
      await page.waitForTimeout(500);
      const after=await page.evaluate(()=>document.querySelector('#alphatab-wrapper').scrollTop);
      if(follow){
        assert(after<before-10,'Reset reveals the beginning without Play');
        assert(await page.evaluate(()=>{const w=document.querySelector('#alphatab-wrapper').getBoundingClientRect(),c=document.querySelector('.at-cursor-beat').getBoundingClientRect();return c.top>=w.top-2 && c.top<w.bottom;}),'reset cursor is visible');
      }
      else assert(Math.abs(after-before)<2,'Reset preserves viewport with auto-scroll off');
    }
    assert.deepEqual(errors,[]);console.log('PASS native Reset reveals immediately; auto-scroll off retains viewport; playback stays paused');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
