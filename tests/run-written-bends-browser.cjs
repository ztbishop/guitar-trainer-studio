// Native GP import/rendering/transport with an isolated profile and synthetic MIDI.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');

(async()=>{
  const {nativeAlphaTab}=await import('./fretboard-fixtures.js');
  const at=nativeAlphaTab(),settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\title "Written bend browser fixture" \tempo 120 . (1.2 2.3).1 | (2.2 2.3).1 | (1.2 2.3).1 | (1.2 2.3).1 | (1.2 2.3).1`,settings);
  const score=parser.readScore(),beats=score.tracks[0].staves[0].bars.map(b=>b.voices[0].beats[0]);
  for(const [i,curve] of [[[0,0],[60,4]],[[0,4],[60,4]],[[0,4],[60,0]]].entries())
    for(const [offset,value] of curve)beats[i].notes[0].addBendPoint(new at.model.BendPoint(offset,value));
  for(const [offset,value] of [[0,0],[30,-4],[60,2]])beats[3].addWhammyBarPoint(new at.model.BendPoint(offset,value));
  beats[4].notes[0].vibrato=at.model.VibratoType.Slight;
  score.finish(settings);
  const fixture=Buffer.from(new at.exporter.Gp7Exporter().export(score,settings));
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{
      const input={id:'written-bends-test',name:'Synthetic bend input',type:'input',state:'connected',
        addEventListener(_,f){this.receive=f;},removeEventListener(){this.receive=null;},close(){return Promise.resolve();}};
      window.sendBendMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const load=async()=>{
      await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="written-bends-test"]'));
      await page.evaluate(()=>{const c=document.querySelector('#midi-input-select');c.value='written-bends-test';c.dispatchEvent(new Event('change'));});
      await page.locator('#score-file-input').setInputFiles({name:'written-bends.gp',mimeType:'application/octet-stream',buffer:fixture});
      await page.waitForFunction(async()=>{window.bendState=(await import('./js/app-state.js')).AppState;return bendState.playerReady && bendState.expectedEvents.length===5;});
      await page.waitForFunction(()=>document.querySelector('.at-surface svg') && document.querySelector('#fretboard-content svg'));
    };
    const allow=async enabled=>{
      await page.locator('#btn-practice').click();
      await page.locator('.practice-input-filters').evaluate(el=>{el.open=true;});
      await page.locator('#allow-written-bend-ranges').setChecked(enabled);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(()=>bendState.allowWrittenBendRanges),enabled);
    };
    const result=()=>page.evaluate(()=>{const t=bendState.mode==='wait'?bendState.waitTrainer:bendState.trainer;return {correct:t.results.correct,wrong:t.results.wrong,index:t.currentEventIndex,feedback:t.lastFeedback?.type};});
    const play=async mode=>{
      await page.waitForFunction(()=>bendState.playerReady);
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(mode=>!bendState.countInActive && (mode==='wait'?bendState.waitTrainer.active && bendState.waitTrainer.phase==='waiting':bendState.isPlaying),mode);
      if(mode==='realtime')await page.waitForFunction(()=>bendState.tickPosition>=960);
    };
    const note=async(hex,index,pitch,release=false)=>page.evaluate(({hex,index,pitch,release})=>{
      const n=bendState.expectedEvents[0].notes[index],channel=hex?6-n.string:0;
      sendBendMidi([(release?0x80:0x90)+channel,pitch,release?0:100]);
    },{hex,index,pitch,release});
    await page.goto(`http://127.0.0.1:${server.address().port}`);await load();
    assert(await page.locator('#allow-written-bend-ranges').isChecked(),'new profile defaults on');
    const metadata=await page.evaluate(()=>bendState.expectedEvents.map(e=>e.notes.map(n=>({midi:n.midi,range:n.bendRange??null,vibrato:n.hasVibrato}))));
    assert.deepEqual(metadata.slice(0,3).map(notes=>notes[0].range),[{min:60,max:62},{min:61,max:63},{min:60,max:62}]);
    assert.deepEqual(metadata[3].map(n=>n.range),[{min:58,max:61},{min:55,max:58}]);
    assert.equal(metadata[4][0].vibrato,true);assert.equal(metadata[4][0].range,null);
    await allow(false);await page.reload();await load();
    assert(!(await page.locator('#allow-written-bend-ranges').isChecked()),'off persists through reload and score load');
    await allow(true);await page.reload();await load();
    assert(await page.locator('#allow-written-bend-ranges').isChecked(),'on persists through reload and score load');

    for(const mode of ['collect','together','realtime'])for(const hex of [false,true]) {
      const practice=mode==='realtime'?'realtime':'wait';
      await page.locator('#stop-button').click();
      await page.evaluate(({practice,mode,hex})=>{
        for(const [name,value] of [['practice-mode',practice],['midi-input-mode',hex?'hex-6ch':'single-channel'],...(practice==='wait'?[['wait-chord-mode',mode]]:[])]) {
          const c=document.querySelector(`input[name="${name}"][value="${value}"]`);c.checked=true;c.dispatchEvent(new Event('change'));
        }
        if(mode==='together'){const c=document.querySelector('#wait-chord-window');c.value='1000';c.dispatchEvent(new Event('change'));}
      },{practice,mode,hex});
      await allow(true);await play(practice);
      await note(hex,0,62);
      let state=await result();assert.equal(state.correct,1);assert.equal(state.wrong,0);
      await page.waitForFunction(()=>document.querySelector('.notation-feedback-overlay .target-notehead[data-state="correct"]'));
      assert.equal(await page.locator('.fretboard-marker-target[data-state="correct"]').count(),1,'written fret receives green credit');
      assert.equal(await page.locator('.fretboard-marker-played').count(),0,'sounding bend does not invent a shifted physical fret');
      if(practice==='wait')assert.equal(state.index,0,'partner remains required before advancing');
      await note(hex,1,57);
      state=await result();assert.equal(state.correct,2);assert.equal(state.wrong,0);
      if(practice==='realtime')await page.waitForFunction(()=>bendState.tickPosition>=3840);
      else await page.waitForFunction(()=>bendState.waitTrainer.currentEventIndex===1);
      // The next target asks for C#. Re-keying the still-associated bend to C#
      // is its continuation, not a fresh next-target attack or a new mistake.
      await page.evaluate(hex=>{
        const n=bendState.expectedEvents[0].notes[0],channel=hex?6-n.string:0;
        sendBendMidi([0x80+channel,62,0]);sendBendMidi([0x90+channel,61,100]);
      },hex);
      state=await result();assert.equal(state.correct,2,'bend tail does not complete the following target');
      assert.equal(state.wrong,0);assert.equal(state.feedback,'ignored-bend-continuation');
      await page.locator('#stop-button').click();await allow(false);await play(practice);
      await note(hex,0,62);state=await result();
      assert.equal(state.correct,0,'off keeps exact base-pitch grading');assert.equal(state.wrong,1);
      console.log(`PASS ${mode} ${hex?'Hex':'Poly'}: endpoint credits one written chord tone, native target stays green without a shifted fret ring, partner remains required, bend tail stays with its origin, Off rejects endpoint.`);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS written bend metadata and real UI on/off persistence across reloads and score loads.');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
