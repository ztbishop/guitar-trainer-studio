// Native two-bar repeat fixture in an isolated browser against existing Live Server.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const {nativeAlphaTab}=await import('./fretboard-fixtures.js');
  const at=nativeAlphaTab(),settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString('\\title "Fretboard preview QA" \\tuning E4 B3 G3 D3 A2 E2 . 0.1.4 1.1.4 2.1.4 3.1.4 | 5.1.4 7.1.4 8.1.4 10.1.4',settings);
  const score=parser.readScore();score.masterBars[0].isRepeatStart=true;score.masterBars[1].repeatCount=2;score.finish(settings);
  const buffer=Buffer.from(new at.exporter.Gp7Exporter().export(score,settings));
  const browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto((process.argv[2]||'http://127.0.0.1:5500')+'/index.html');
    await page.locator('#fretboard-content svg').waitFor();
    await page.locator('#score-file-input').setInputFiles({name:'preview-qa.gp',mimeType:'application/octet-stream',buffer});
    await page.waitForFunction(async()=>{window.previewTestState=(await import('./js/app-state.js')).AppState;return previewTestState.playerReady && previewTestState.expectedEvents.length===16;});
    const snapshot=()=>page.evaluate(()=>JSON.stringify({states:previewTestState.trainer.noteStates,stats:previewTestState.trainer.results,events:previewTestState.expectedEvents}));
    await page.locator('#fretboard-settings').click();
    assert(!await page.locator('#fretboard-alternates').isChecked());
    await page.locator('#fretboard-view').selectOption('bar');
    const before=await snapshot();await page.locator('#fretboard-alternates').check();
    assert.equal(await snapshot(),before,'display toggle changes no targets/stats/feedback states');
    assert(await page.locator('.fretboard-marker-alternative').count()>0);
    assert.equal(await page.locator('.fretboard-marker-alternative:not([data-state=alternative])').count(),0);
    await page.locator('#fretboard-labels').selectOption('fingers');
    assert.equal(await page.locator('.fretboard-marker-alternative text').count(),0,'no inferred alternate fingers');
    await page.locator('#fretboard-labels').selectOption('notes');await page.keyboard.press('Escape');
    const step=async()=>{const previous=await page.evaluate(()=>previewTestState.tickPosition);await page.locator('#fretboard-next').click();await page.waitForFunction(previous=>previewTestState.tickPosition>previous+2,previous);};
    for(let index=0;index<3;index++)await step();
    assert(await page.locator('.fretboard-marker-context[data-state=future][data-fret="5"]').count()>0,'last beat previews first beat of next bar');
    assert.equal(await page.locator('.fretboard-marker-context[data-state=future][data-fret="7"]').count(),0,'only one beat crosses the bar boundary');
    await step();
    for(const fret of [7,8,10])assert(await page.locator(`.fretboard-marker-context[data-state=future][data-fret="${fret}"]`).count()>0,'entering bar restores full-bar preview');
    for(let index=0;index<3;index++)await step();
    assert(await page.locator('.fretboard-marker-context[data-state=future][data-fret="0"]').count()>0,'native repeat returns to actual first beat');
    for(let index=0;index<8;index++)await step();
    assert.equal(await page.locator('.fretboard-marker-context[data-state=future]').count(),0,'song end has no invented preview');
    await page.evaluate(async()=>{const s=previewTestState,range={startTick:0,endTick:s.playbackTimeline.measures[0].endTick};s.practiceLoop={...s.practiceLoop,enabled:true,range};(await import('./js/alphatab-host.js')).applyPracticeLoop(range);});
    await page.waitForFunction(()=>previewTestState.tickPosition<3);
    for(let index=0;index<3;index++)await step();
    assert(await page.locator('.fretboard-marker-context[data-state=future][data-fret="0"]').count()>0,'enabled loop previews loop start');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});await page.locator('#fretboard-settings').click();
      const box=await page.locator('#fretboard-options').boundingBox();assert(box.x>=0 && box.x+box.width<=width);
      if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,`fretboard-previews-${width}.png`)});
      await page.keyboard.press('Escape');
    }
    await page.reload();await page.locator('#fretboard-content svg').waitFor();await page.locator('#fretboard-settings').click();
    assert(await page.locator('#fretboard-alternates').isChecked(),'alternate preference restores after reload');
    await page.locator('#fretboard-alternates').uncheck();assert.equal(await page.locator('.fretboard-marker-alternative').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: native bar-boundary, repeat, loop and song-end previews; neutral exact-pitch alternate guides, independent saved toggle, blank finger labels and responsive popup.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
