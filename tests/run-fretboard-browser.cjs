// Isolated browser profile against the owner's existing Live Server; no hardware.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const base=process.argv[2] || 'http://127.0.0.1:5500';
    await page.goto(`${base}/index.html`);
    await page.locator('#fretboard-content svg').waitFor();
    assert(await page.locator('#fretboard-next').isDisabled(),JSON.stringify(await page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');return {tick:s.tickPosition,loop:s.practiceLoop,current:s.trainer.currentEvent?.startTick};})));
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'fixtures/fretboard-multistring.gp'));
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.playerReady && s.expectedEvents.length;});
    const state=()=>page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');return {tick:s.tickPosition,playing:s.isPlaying,countIn:s.countInActive,wait:s.waitTrainer?.active,phase:s.waitTrainer?.phase,events:s.expectedEvents.map(e=>e.startTick),view:s.ui.fretboardView,labels:s.ui.fretboardLabels};});
    await page.locator('#fretboard-settings').click();
    await page.locator('#fretboard-view').selectOption('next');
    assert(await page.locator('.fretboard-marker-context[data-state=future]').count()>0);
    await page.locator('#fretboard-view').selectOption('bar');
    assert(await page.locator('.fretboard-marker-context').count()>0);
    await page.locator('#fretboard-labels').selectOption('fingers');
    assert.equal(await page.locator('.fretboard-marker-target text').count(),0,'missing finger data stays blank');
    await page.locator('#fretboard-labels').selectOption('frets');
    assert.match(await page.locator('.fretboard-marker-target text').first().textContent(),/^\d+$/);
    await page.locator('#fretboard-left').check();
    assert(await page.evaluate(()=>document.querySelector('#left-handed-fretboard').checked));
    await page.locator('#fretboard-settings').focus();await page.keyboard.press('Escape');
    assert(!await page.locator('#fretboard-options').isVisible());
    await page.locator('#fretboard-next').click();
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return Math.abs(s.tickPosition-s.expectedEvents[1].startTick)<3;});
    assert.equal((await state()).playing,false);assert.equal((await state()).countIn,false);
    assert(await page.locator('.fretboard-marker-context[data-state=past]').count()>0);
    await page.locator('#fretboard-previous').click();
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.tickPosition<3;});
    await page.reload();await page.locator('#fretboard-content svg').waitFor();
    assert.equal((await state()).view,'bar');assert.equal((await state()).labels,'frets');
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'fixtures/fretboard-multistring.gp'));
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.playerReady && s.expectedEvents.length;});
    // Exercise both running modes: arrows must leave the destination ungraded and paused.
    for(const mode of ['wait','realtime']) {
      await page.evaluate(mode=>{const control=document.querySelector(`input[name=practice-mode][value="${mode}"]`);control.checked=true;control.dispatchEvent(new Event('change'));},mode);
      await page.locator('#play-pause-button').click();
      await page.locator('#fretboard-next').click();
      await page.waitForTimeout(250);
      const s=await state();assert.equal(s.playing,false);assert.equal(s.countIn,false);assert(!s.wait,'no active Wait gate after browsing');
      await page.locator('#fretboard-previous').click();
    }
    // A limited range must constrain previews and both arrow endpoints.
    await page.evaluate(async()=>{
      const {AppState:s}=await import('./js/app-state.js');
      const {applyPracticeLoop}=await import('./js/alphatab-host.js');
      const range={startTick:s.expectedEvents[1].startTick,endTick:s.expectedEvents[3].startTick};
      s.practiceLoop={...s.practiceLoop,enabled:true,range};applyPracticeLoop(range);
    });
    await page.waitForTimeout(150);
    assert(await page.locator('#fretboard-previous').isDisabled());
    await page.locator('#fretboard-next').click();await page.waitForTimeout(150);
    assert(await page.locator('#fretboard-next').isDisabled(),JSON.stringify(await page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');return {tick:s.tickPosition,loop:s.practiceLoop,current:s.trainer.currentEvent?.startTick};})));
    assert.equal((await state()).playing,false);
    await page.evaluate(async()=>{
      const {AppState:s}=await import('./js/app-state.js');
      const {setMediaEditing}=await import('./js/alphatab-host.js');
      setMediaEditing(true);
    });
    assert(await page.locator('#fretboard-previous').isDisabled());
    assert(await page.locator('#fretboard-next').isDisabled());
    await page.evaluate(async()=>{const {setMediaEditing}=await import('./js/alphatab-host.js');setMediaEditing(false);});
    for(const [index,count] of [[0,1],[1,4],[2,5],[3,6],[4,7],[5,8],[6,12]]) {
      await page.evaluate(index=>{const control=document.querySelector('#practice-track-select');control.value=String(index);control.dispatchEvent(new Event('change'));},index);
      await page.waitForFunction(count=>document.querySelectorAll('#fretboard-content .fretboard-string').length===count,count);
    }
    await page.evaluate(()=>{const control=document.querySelector('#practice-track-select');control.value='3';control.dispatchEvent(new Event('change'));});
    for(const width of [1440,800,390]) {
      await page.setViewportSize({width,height:900});
      await page.locator('#fretboard-settings').click();
      assert(await page.locator('#fretboard-options').isVisible());
      const box=await page.locator('#fretboard-options').boundingBox();assert(box.x>=0 && box.x+box.width<=width,'popup fits viewport');
      await page.locator('#fretboard-help').click();
      const helpBox=await page.locator('#fretboard-options').boundingBox();assert(helpBox.y>=0 && helpBox.y+helpBox.height<=900,'expanded help fits viewport');
      await page.locator('#fretboard-help').click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
      if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,`fretboard-${width}.png`)});
      await page.keyboard.press('Escape');
    }
    await page.goto(`${base}/tests/fretboard-browser.html`);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});await page.locator('#run').click();
      assert.match(await page.locator('#result').textContent(),/^PASS: 56/);
    }
    await page.goto(`${base}/tests/media-layout.html`);
    for(const viewport of ['desktop','phone']) {
      await page.locator('#'+viewport).click();await page.locator('#ui-run').click();
      await page.waitForFunction(()=>!document.querySelector('#ui-run').disabled,{},{timeout:45000});
      const result=await page.locator('#ui-results').textContent();
      assert(!result.includes('FAIL'),result);assert.match(result,/UI checks passed/);
      console.log(viewport+': '+result.split('\n').at(-1));
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: native fretboard modes/labels, missing fingers, orientation, persistence, paused navigation in Wait/Realtime, loop bounds, sync-editing gates, responsive popup, and 56 geometry scenarios at desktop/phone widths.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
