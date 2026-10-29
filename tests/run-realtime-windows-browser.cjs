// Real native transport/rendering, isolated profile and synthetic MIDI only.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');
(async()=>{
  const {nativeAlphaTab}=await import('./fretboard-fixtures.js');
  const at=nativeAlphaTab(),settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 60 . (0.6 2.5 2.4).2 3.6.2`,settings);
  const fixture=Buffer.from(new at.exporter.Gp7Exporter().export(parser.readScore(),settings));
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(()=>{
      const input={id:'window-test',name:'Synthetic timing input',type:'input',state:'connected',
        addEventListener(_,f){this.receive=f;},removeEventListener(){},close(){return Promise.resolve();}};
      window.sendTimingMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="window-test"]'));
    await page.evaluate(()=>{const c=document.querySelector('#midi-input-select');c.value='window-test';c.dispatchEvent(new Event('change'));});
    await page.locator('#score-file-input').setInputFiles({name:'timing.gp',mimeType:'application/octet-stream',buffer:fixture});
    await page.waitForFunction(async()=>{window.timingState=(await import('./js/app-state.js')).AppState;return timingState.playerReady && timingState.expectedEvents.length===2;});
    await page.waitForTimeout(500);
    for(const hex of [false,true])for(const silent of [true,false]) {
      await page.locator('#stop-button').click();
      await page.evaluate(hex=>{
        const c=document.querySelector(`input[name="midi-input-mode"][value="${hex?'hex-6ch':'single-channel'}"]`);
        c.checked=true;c.dispatchEvent(new Event('change'));
      },hex);
      await page.waitForFunction(()=>timingState.playerReady);
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(()=>timingState.isPlaying && !timingState.countInActive);
      await page.waitForFunction(()=>timingState.tickPosition>=480);
      assert.equal(await page.evaluate(()=>timingState.trainer.results.missed),0,'no premature miss halfway into the first beat');
      assert.equal(await page.locator('.fretboard-marker-target[data-state="expected"]').count(),3);
      if(!silent) {
        await page.evaluate(hex=>{
          const n=timingState.expectedEvents[0].notes[0],channel=hex?6-n.string:0;
          sendTimingMidi([0x90+channel,n.midi,100]);sendTimingMidi([0x80+channel,n.midi,0]);
        },hex);
        await page.waitForFunction(()=>timingState.tickPosition>=1152);
        await page.evaluate(hex=>{
          for(const n of timingState.expectedEvents[0].notes.slice(1)) {
            const channel=hex?6-n.string:0;
            sendTimingMidi([0x90+channel,n.midi,100]);sendTimingMidi([0x80+channel,n.midi,0]);
          }
        },hex);
        assert.equal(await page.evaluate(()=>timingState.trainer.results.correct),3,'late spread chord earns all three pitches');
        assert.equal(await page.locator('.fretboard-marker-target[data-state="correct"]').count(),3);
        assert(await page.locator('.notation-feedback-overlay .target-notehead[data-state="correct"]').count()>0);
      }
      await page.waitForFunction(()=>timingState.tickPosition>=2000);
      const result=await page.evaluate(()=>timingState.trainer.results);
      assert.equal(result.missed,silent?3:0);assert.equal(result.wrong,0);
      if(silent)assert(await page.locator('.notation-feedback-overlay .target-notehead[data-state="missed"]').count()>0,'score shows misses after the written span');
      console.log(`PASS ${hex?'Hex':'Poly'} ${silent?'silent misses wait for the written end':'late chord pitches stay green across a spread over 60 ms'}`);
    }
    assert.deepEqual(errors,[]);
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
