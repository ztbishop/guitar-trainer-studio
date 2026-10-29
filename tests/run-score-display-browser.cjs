// Isolated native rendering/printing and synthetic MIDI; never the owner's profile.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');
(async()=>{
  const {nativeAlphaTab}=await import('./fretboard-fixtures.js');
  const at=nativeAlphaTab(),settings=new at.Settings();
  const parse=tex=>{const p=new at.importer.AlphaTexImporter();p.initFromString(tex,settings);return p.readScore();};
  const score=parse(String.raw`\title "Display and print QA" \tempo 120 . (0.6 2.5 2.4).4 0.1.4 1.1.4 3.1.4 | 0.6.1`);
  const staff=score.tracks[0].staves[0];staff.showStandardNotation=false;
  const chord=new at.model.Chord();chord.name='Em';chord.strings=[0,0,0,2,2,0];staff.addChord('em',chord);staff.bars[0].voices[0].beats[0].chordId='em';
  const piano=parse(String.raw`\track "Notation only" \tuning piano . C4.1 | D4.1`);
  score.addTrack(piano.tracks[0]);score.finish(settings);
  // Separate AlphaTex parses restart IDs; export needs globally unique IDs.
  let barId=0,voiceId=0,beatId=0,noteId=0;
  for(const t of score.tracks)for(const s of t.staves)for(const b of s.bars){
    b.id=barId++;
    for(const v of b.voices){v.id=voiceId++;for(const beat of v.beats){beat.id=beatId++;for(const n of beat.notes)n.id=noteId++;}}
  }
  const fixture=Buffer.from(new at.exporter.Gp7Exporter().export(score,settings));
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{
      const input={id:'display-test',name:'Synthetic display MIDI',type:'input',state:'connected',addEventListener(_,f){this.receive=f;},removeEventListener(){},close(){return Promise.resolve();}};
      window.sendDisplayMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    assert(await page.locator('#score-print').isDisabled());
    const load=async()=>{
      await page.locator('#score-file-input').setInputFiles({name:'display.gp',mimeType:'application/octet-stream',buffer:fixture});
      await page.waitForFunction(async()=>{
        window.displayState=(await import('./js/app-state.js')).AppState;
        window.displayApi=(await import('./js/alphatab-host.js')).getAlphaTabApi();
        return displayState.playerReady && displayApi.boundsLookup?.isFinished;
      });
      await page.waitForTimeout(500);
    };
    await load();
    await page.evaluate(()=>{window.displayRenders=0;displayApi.postRenderFinished.on(()=>displayRenders++);});
    const change=async(id,value)=>{
      const before=await page.evaluate(()=>displayRenders);
      await page.evaluate(({id,value})=>{const c=document.getElementById(id);c.value=value;c.dispatchEvent(new Event('change'));},{id,value});
      await page.waitForFunction(before=>displayRenders>before,before);
    };
    const flags=()=>page.evaluate(()=>displayState.tracks[0].staves.map(s=>[s.showStandardNotation,s.showTablature]));
    assert.deepEqual(await flags(),[[false,true]]);
    await change('chord-diagram-placement','above-chord');
    await change('score-display','both');assert.deepEqual(await flags(),[[true,true]]);
    await change('tab-rhythm','show');
    await change('score-display','notation');assert.deepEqual(await flags(),[[true,false]]);
    assert(await page.locator('#tab-rhythm').isDisabled());assert.equal(await page.locator('#tab-rhythm').inputValue(),'show');
    await change('score-display','tab');assert.deepEqual(await flags(),[[false,true]]);
    assert.equal(await page.locator('#tab-rhythm').isDisabled(),false);
    assert.equal(await page.evaluate(()=>displayApi.settings.notation.rhythmMode),2);
    assert.equal(await page.evaluate(()=>displayState.score.stylesheet.globalDisplayChordDiagramsInScore),true);
    await change('tab-rhythm','hide');await change('tab-rhythm','automatic');
    await change('score-display','score-default');assert.deepEqual(await flags(),[[false,true]]);
    await change('score-display','both');
    // A paused partial Wait chord retains credit and overlay placement across views.
    await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="display-test"]'));
    await page.evaluate(()=>{
      const input=document.querySelector('#midi-input-select');input.value='display-test';input.dispatchEvent(new Event('change'));
      const mode=document.querySelector('input[name="practice-mode"][value="wait"]');mode.checked=true;mode.dispatchEvent(new Event('change'));
    });
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>!displayState.countInActive && displayState.waitTrainer?.phase==='waiting');
    await page.evaluate(()=>sendDisplayMidi([0x90,displayState.expectedEvents[0].notes[0].midi,100]));
    await page.locator('#play-pause-button').click();
    const result=await page.evaluate(()=>JSON.stringify(displayState.waitTrainer.results));
    for(const view of ['tab','notation','both']) {
      await change('score-display',view);
      assert.equal(await page.evaluate(()=>JSON.stringify(displayState.waitTrainer.results)),result);
      const notes=await page.locator('.notation-feedback-overlay .target-notehead[data-state="correct"]').count();
      const frets=await page.locator('.notation-feedback-overlay .tab-correct-highlight').count();
      assert.equal(notes>0,view!=='tab');assert.equal(frets>0,view!=='notation');
    }
    // Native print is fully rendered, but suppress the OS dialog in automation.
    await page.evaluate(()=>{
      window.originalPrintOpen=window.open;
      window.open=(...args)=>{const p=originalPrintOpen(...args);p.print=()=>{p.printRequested=true;};return p;};
    });
    await page.locator('#btn-scores').click();
    const popupPromise=page.waitForEvent('popup');await page.locator('#score-print').click();const popup=await popupPromise;
    await popup.waitForFunction(()=>window.printRequested && document.querySelector('svg'));
    assert.equal(await popup.locator('.notation-feedback-overlay,.fretboard-marker,.at-cursor-beat,#media-editor').count(),0);
    assert.match(await popup.title(),/Display and print QA/);
    assert.equal(await page.evaluate(()=>JSON.stringify(displayState.waitTrainer.results)),result);
    if(process.env.GTS_SCREENSHOT_DIR)await popup.screenshot({path:require('node:path').join(process.env.GTS_SCREENSHOT_DIR,'score-print.png'),fullPage:true});
    await popup.close();
    // Blocked popups get an actionable message rather than an uncaught failure.
    await page.evaluate(()=>{window.open=()=>null;document.querySelector('#score-print').click();});
    assert.match(await page.locator('#score-print-status').textContent(),/Allow pop-ups/);
    await page.evaluate(()=>{window.open=originalPrintOpen;});
    await page.locator('#stop-button').click();
    await change('score-display','tab');await change('tab-rhythm','show');
    await page.reload();await load();
    assert.deepEqual(await flags(),[[false,true]]);assert.equal(await page.locator('#tab-rhythm').inputValue(),'show');
    assert.equal(await page.locator('#chord-diagram-placement').inputValue(),'above-chord');
    // Select a notation-only track: safe fallback, unchanged saved preference.
    await page.evaluate(()=>{const c=document.querySelector('#practice-track-select');c.value='1';c.dispatchEvent(new Event('change'));});
    await page.waitForFunction(()=>displayState.practiceTrackId==='1' && displayApi.tracks[0].index===1);
    assert(await page.locator('#tab-rhythm').isDisabled());assert.equal(await page.locator('#score-display').inputValue(),'tab');
    assert.equal(await page.evaluate(()=>displayState.tracks[1].staves[0].showStandardNotation),true);
    await page.evaluate(()=>document.querySelector('[data-launch-panel="display-popup"]').click());
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:require('node:path').join(process.env.GTS_SCREENSHOT_DIR,'score-display.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
    assert.deepEqual(errors,[]);
    console.log('PASS native score views, rhythm modes, independent diagrams, Wait feedback, clean print popup, blocked-popup message, saved reload and notation-only fallback.');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
