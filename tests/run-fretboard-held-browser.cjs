// Synthetic MIDI in an isolated browser; no normal profile/device access.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const {nativeAlphaTab,fixtureScore}=await import('./fretboard-fixtures.js');
  const at=nativeAlphaTab(),score=fixtureScore(at),settings=new at.Settings();
  score.tracks=[score.tracks[3]];score.tracks[0].index=0;score.finish(settings);
  const fixture=Buffer.from(new at.exporter.Gp7Exporter().export(score,settings));
  const browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(()=>{
      const input={id:'fretboard-midi-fixture',name:'Synthetic fretboard input',manufacturer:'Test',type:'input',state:'connected',
        addEventListener(_,receive){this.receive=receive;},removeEventListener(){this.receive=null;},close(){return Promise.resolve();}};
      window.fretboardTestInput=input;
      window.sendFretboardMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.argv[2] || 'http://127.0.0.1:5500')+'/index.html');
    await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="fretboard-midi-fixture"]'));
    await page.evaluate(()=>{const control=document.querySelector('#midi-input-select');control.value='fretboard-midi-fixture';control.dispatchEvent(new Event('change'));});
    await page.locator('#score-file-input').setInputFiles({name:'held-note-fixture.gp',mimeType:'application/octet-stream',buffer:fixture});
    await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.playerReady && s.expectedEvents.length;});
    await page.waitForTimeout(500); // Native selected-track MIDI/render regeneration.
    await page.evaluate(async()=>{window.fretboardTestState=(await import('./js/app-state.js')).AppState;});
    for(const mode of ['wait','realtime'])for(const hex of [false,true]) {
      await page.locator('#stop-button').click();
      await page.evaluate(({mode,hex})=>{
        for(const [name,value] of [['practice-mode',mode],['midi-input-mode',hex?'hex-6ch':'single-channel']]) {
          const control=document.querySelector(`input[name="${name}"][value="${value}"]`);control.checked=true;control.dispatchEvent(new Event('change'));
        }
      },{mode,hex});
      await page.waitForFunction(async()=>{const {AppState:s}=await import('./js/app-state.js');return s.playerReady;});
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(mode=>{const s=fretboardTestState;return !s.countInActive && (mode==='wait'?s.waitTrainer.active && s.waitTrainer.phase==='waiting':s.isPlaying);},mode);
      const first=await page.evaluate(async hex=>{
        const {AppState:s}=await import('./js/app-state.js');const first=s.expectedEvents[0];
        for(const [index,note] of first.notes.entries()) {
          const channel=hex?6-note.string:0;
          sendFretboardMidi([0x90+channel,note.midi,100]);
          if(s.mode==='wait' && index===0)for(let replay=0;replay<2;replay++) {
            sendFretboardMidi([0x80+channel,note.midi,0]);sendFretboardMidi([0x90+channel,note.midi,100]);
          }
        }
        return {id:first.id,pitches:first.notes.map(n=>n.midi)};
      },hex);
      await page.waitForFunction(mode=>{const s=fretboardTestState,t=mode==='wait'?s.waitTrainer:s.trainer;return t.currentEvent && t.currentEvent.id!==s.expectedEvents[0].id;},mode,{timeout:7000});
      await page.waitForFunction(()=>!document.querySelector('.fretboard-marker-played'),null,{timeout:5000});
      let status=await page.evaluate(async mode=>{const {AppState:s}=await import('./js/app-state.js');const t=mode==='wait'?s.waitTrainer:s.trainer;return {active:s.midi.activeNotes.size,correct:t.results.correct,wrong:t.results.wrong};},mode);
      assert.equal(status.active,first.pitches.length,'hidden tails remain held in MIDI');assert.equal(status.correct,first.pitches.length);assert.equal(status.wrong,0,'held correct tails never become wrong');
      await page.evaluate(hex=>sendFretboardMidi([hex?0x92:0x90,69,100]),hex);
      const wrongCount=await page.locator('.fretboard-marker-played[data-state=wrong]').count();
      assert(hex?wrongCount===1:wrongCount>1,'genuine wrong input keeps Hex identity or all Poly positions');
      await page.locator('#play-pause-button').click();
      await page.evaluate(hex=>sendFretboardMidi([hex?0x91:0x90,67,100]),hex);
      assert(await page.locator('.fretboard-marker-played[data-state=played]').count()>0,'fresh paused exploration stays visible');
      const paused=await page.evaluate(async mode=>{const {AppState:s}=await import('./js/app-state.js');return (mode==='wait'?s.waitTrainer:s.trainer).results;},mode);
      assert.equal(paused.correct,status.correct);assert.equal(paused.wrong,1,'paused exploration adds no errors');
      await page.evaluate(async hex=>{
        const {AppState:s}=await import('./js/app-state.js');const n=s.expectedEvents[0].notes[0],ch=hex?6-n.string:0;
        sendFretboardMidi([0x80+ch,n.midi,0]);sendFretboardMidi([0x90+ch,n.midi,100]);
      },hex);
      assert(await page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');const pitch=s.expectedEvents[0].notes[0].noteName;return [...document.querySelectorAll('.fretboard-marker-played[data-state=played] title')].some(el=>el.textContent.includes(`played: ${pitch},`));}),'released/replayed pitch itself is visible and ungraded');
      // Clean up every raw held identity before starting the next configuration.
      await page.evaluate(async()=>{const {AppState:s}=await import('./js/app-state.js');for(const note of [...s.midi.activeNotes.values()])sendFretboardMidi([0x80+note.channel-1,note.midi,0]);});
      console.log(`PASS: ${mode} ${hex?'Hex':'Poly'} accepted tails hidden without red conversion; wrong rings, paused exploration and release/replay retained.`);
    }
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
