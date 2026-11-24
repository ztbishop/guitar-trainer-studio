const assert=require('node:assert/strict');
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const {createAppServer}=require('../local-web-server.cjs');

(async()=>{
  const server=createAppServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#btn-more').click();
    const tempo=page.locator('[data-launch-panel="tempo-popup"]'),loop=page.locator('#more-loop-shortcut');
    for(const width of [1440,390,1440]) {
      await page.setViewportSize({width,height:900});
      const state=width===390?'visible':'hidden';
      await tempo.waitFor({state});await loop.waitFor({state});
      assert.equal(await page.locator('#btn-tempo').isVisible(),width!==390);
      assert.equal(await page.locator('#btn-looper').isVisible(),width!==390);
      assert(await page.locator('[data-launch-panel="audio-popup"]').isVisible());
      if(width===390) {
        await loop.click();await page.locator('#looper-popup').waitFor();
        await page.keyboard.press('Escape');await page.locator('#btn-more').click();
      }
    }
    await page.locator('[data-launch-panel="audio-popup"]').click();
    await page.locator('#score-file-input').setInputFiles('assets/demos/first-notes.gp');
    await page.waitForFunction(async()=>{
      window.app=(await import('./js/app-state.js')).AppState;
      window.api=(await import('./js/alphatab-host.js')).getAlphaTabApi();
      return app.playerReady && app.playbackTimeline;
    });
    if(!await page.locator('#audio-popup').isVisible()) {
      await page.locator('#btn-more').click();await page.locator('[data-launch-panel="audio-popup"]').click();
    }
    await page.getByText('Track sounds, volume & mute',{exact:true}).click();
    const sound=page.locator('.mixer-sound').first();
    assert.equal(await sound.locator('option').count(),129);
    const original=await page.evaluate(()=>{
      window.sent=[];
      window.loaded=0;
      api.midiLoaded.on(()=>window.loaded++);
      const load=api.player.loadMidiFile.bind(api.player);
      api.player.loadMidiFile=file=>{
        sent.push(file.events.filter(e=>e.type===alphaTab.midi.MidiEventType.ProgramChange).map(e=>e.program));
        return load(file);
      };
      api.playbackRange={startTick:480,endTick:2880};
      api.isLooping=true;
      api.tickPosition=960;
      return app.tracks[0].playbackInfo.program;
    });
    await page.waitForFunction(()=>Math.abs(app.tickPosition-960)<=3);
    await page.evaluate(()=>{window.timeline=app.playbackTimeline;window.grades=JSON.stringify(app.trainer.results);});
    for(const [index,program] of ['0','4',''].entries()) {
      await sound.selectOption(program);
      await page.waitForFunction(n=>loaded>=n && sent.length===n && Math.abs(api.tickPosition-960)<=3,index+1,{timeout:5000})
        .catch(async error=>{throw new Error(JSON.stringify({program,observed:await page.evaluate(()=>({loaded,count:sent.length,tick:api.tickPosition,appTick:app.tickPosition,params:app.audio.tracks})),errors}),{cause:error});});
      assert.deepEqual(await page.evaluate(()=>[...new Set(sent.at(-1))]),[program===''?original:Number(program)]);
      assert(await page.evaluate(()=>timeline===app.playbackTimeline),'timing retained');
      assert(await page.evaluate(()=>grades===JSON.stringify(app.trainer.results)),'grading retained');
      assert(await page.evaluate(()=>api.isLooping && api.playbackRange.startTick===480 && api.playbackRange.endTick===2880),'loop retained');
    }
    await page.keyboard.press('Escape');
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>app.isPlaying && app.tickPosition>1000);
    assert(await sound.isDisabled());
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>!app.isPlaying);
    await page.locator('#score-file-input').setInputFiles('assets/demos/easy-chords.gp');
    await page.waitForFunction(()=>app.playerReady && app.score.title==='Easy chords');
    assert.equal(await sound.inputValue(),'');
    assert.deepEqual(errors,[]);
    console.log('PASS: responsive More shortcuts, piano/electric piano/default synth MIDI, preserved cursor, timing, grading and subsequent playback.');
  } finally {
    await browser?.close();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
