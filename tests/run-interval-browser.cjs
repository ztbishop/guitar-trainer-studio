// Isolated native score/media integration; only synthetic GP, WAV and MIDI.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');
const at=require('../assets/vendor/alphatab/alphaTab.js');
function originalScore() {
  const settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 120 . r.1 | 0.6.1 | r.1 | 2.6.1 | r.1 | 3.6.1 | r.1`,settings);
  return Buffer.from(new at.exporter.Gp7Exporter().export(parser.readScore(),settings));
}
function wav(seconds=15) {
  const data=Buffer.alloc(44+22050*2*seconds);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(22050,24);
  data.writeUInt32LE(44100,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);return data;
}
function soundingOmission(payload) {
  const next=structuredClone(payload),plan=next.timingPlan;
  plan.musicalVisits=plan.musicalVisits.filter(visit=>visit.originalVisit!==4).map((visit,index)=>({...visit,visit:index+1}));
  const ref=visit=>({visit:visit.visit,scoreMeasure:visit.scoreMeasure,occurrence:visit.occurrence,originalVisit:visit.originalVisit});
  for(const interval of plan.intervals) {
    const after=plan.musicalVisits.findLast(visit=>visit.endSeconds<=interval.startSeconds),before=plan.musicalVisits.find(visit=>visit.startSeconds>=interval.endSeconds);
    interval.boundary={after:after?ref(after):null,before:before?ref(before):null};
  }
  plan.intervals.push({id:'dishonest-blank',kind:'unmatched-source-rest',label:'Incorrect sounding omission',startSeconds:6,endSeconds:8,
    boundary:{after:ref(plan.musicalVisits[0]),before:ref(plan.musicalVisits[1])}});
  plan.intervals.sort((a,b)=>a.startSeconds-b.startSeconds);
  plan.scoreOmissions.push({originalVisit:4,scoreMeasure:4,occurrence:1,reason:'unmatched-full-rest'});plan.scoreOmissions.sort((a,b)=>a.originalVisit-b.originalVisit);
  return next;
}
(async()=>{
  const {intervalLesson}=await import('./lesson-import-interval-fixture.js'),bytes=originalScore(),payload=intervalLesson({local:true,scoreBytes:bytes});
  const server=createAppServer();let browser,page;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{
      const input={id:'interval-test',name:'Synthetic interval MIDI',type:'input',state:'connected',manufacturer:'Test',
        addEventListener(_,listener){this.receive=listener;},removeEventListener(){},close(){return Promise.resolve();}};
      window.sendIntervalMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});
    });
    page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.stack || error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="interval-test"]'));
    await page.evaluate(async()=>{
      window.s=(await import('./js/app-state.js')).AppState;window.h=await import('./js/alphatab-host.js');window.p=await import('./js/media-practice.js');
      const {LibraryStore}=await import('./js/library-store.js');window.store=new LibraryStore();
      window.sendIntervalOffer=(type,payload)=>new Promise(resolve=>{
        const id=crypto.randomUUID(),response=type==='gts-lesson-offer'?'gts-lesson-reply':'gts-lesson-capabilities';
        const finish=data=>{clearTimeout(timer);window.removeEventListener('message',receive);resolve(data);};
        const receive=event=>{if(event.source===window && event.origin===location.origin && event.data?.type===response && event.data.id===id)finish(event.data);};
        const timer=setTimeout(()=>finish({ok:false,message:'Receiver timed out.'}),5000);
        window.addEventListener('message',receive);window.postMessage({type,id,payload},location.origin);
      });
    });
    const change=async(id,value,event='change')=>page.evaluate(({id,value,event})=>{
      const element=document.getElementById(id);if(typeof value==='boolean')element.checked=value;else element.value=String(value);element.dispatchEvent(new Event(event));
    },{id,value,event});
    const click=id=>page.evaluate(id=>document.getElementById(id).click(),id);
    const release=()=>page.evaluate(()=>{for(const note of [...s.midi.activeNotes.values()])sendIntervalMidi([0x80+note.channel-1,note.midi,0]);});
    const attack=index=>page.evaluate(index=>{for(const note of p.practiceEvents(s)[index].notes)sendIntervalMidi([0x90,note.midi,100]);},index);
    const seek=async seconds=>{await change('media-seek',seconds,'input');await page.waitForFunction(seconds=>Math.abs(document.querySelector('#media-audio').currentTime-seconds)<0.025,seconds);};
    const stop=async()=>{await click('stop-button');await page.waitForFunction(()=>!s.isPlaying && !s.countInActive);};
    const assertOriginal=async()=>{
      const state=await page.evaluate(()=>({bytes:[...s.currentScoreFile.bytes],order:s.playbackTimeline.measures.map(measure=>measure.measureNumber),
        rests:s.playbackTimeline.measures.map(measure=>measure.isFullRest),end:s.playbackTimeline.endTick,events:s.expectedEvents.map(event=>event.startTick)}));
      assert.deepEqual(Buffer.from(state.bytes),bytes);assert.deepEqual(state.order,[1,2,3,4,5,6,7]);assert.equal(state.end,26880);
      assert.deepEqual(state.rests,[true,false,true,false,true,false,true]);assert.deepEqual(state.events,[3840,11520,19200]);
    };
    const importLocal=async(input,name='interval.wav',duration=15)=>{
      const reply=await page.evaluate(payload=>sendIntervalOffer('gts-lesson-offer',payload),input);assert.equal(reply.ok,true,reply.message);
      const button=page.getByRole('button',{name:'Import lesson',exact:true});assert(await button.isDisabled());
      await page.locator('#lesson-recording-file').setInputFiles({name,mimeType:'audio/wav',buffer:wav(duration)});
      assert.equal(await button.isDisabled(),false);await button.click();
    };
    await change('midi-input-select','interval-test');
    const capabilities=await page.evaluate(()=>sendIntervalOffer('gts-lesson-capabilities-request'));
    assert(capabilities.timingPlans.some(plan=>plan.format==='musical-visits-and-intervals'&&plan.version===1&&plan.capability==='score-timing-match-v1'));
    assert(capabilities.timingPlans.some(plan=>plan.format==='musical-visits-and-explanations'&&plan.capability==='explanation-timing-v1'));
    await importLocal(payload);
    await page.waitForFunction(()=>s.playerReady && s.media.timingPlan && !document.querySelector('#lesson-import-dialog').open,null,{timeout:35000});
    await assertOriginal();
    assert.deepEqual(await page.evaluate(()=>s.media.timingPlan.plan),payload.timingPlan);
    assert.deepEqual(await page.evaluate(()=>({intervals:s.media.timingPlan.intervals.length,explanations:s.media.timingPlan.explanations.length,visits:s.media.timingPlan.visits.length})),{intervals:6,explanations:2,visits:4});
    assert(await page.evaluate(()=>!s.isPlaying && !s.countInActive && document.querySelector('#media-audio').paused));
    assert.deepEqual(await page.evaluate(async()=>({scores:(await store.list()).scores.length,profiles:(await store.listProfiles()).length})),{scores:0,profiles:0});
    console.log('PASS native original-byte/traversal/rest proof, mixed interval contract and local review without autoplay/autosave');

    for(const [seconds,tick,kind] of [[0.4,3840,'unmatched-source-rest'],[1.5,4800,'music'],[3.5,7676,'unmatched-source-rest'],
      [4.5,7676,'explanation'],[5.5,7676,'unmatched-source-rest'],[8.5,16320,'music'],[10.5,19196,'explanation'],[13.5,23036,'unmatched-source-rest'],[14.5,23036,'after']]) {
      await seek(seconds);await page.waitForFunction(({tick,time,kind})=>Math.abs(s.tickPosition-tick)<6&&
        Math.abs(s.media.clock.timeMs-time*1000)<25&&p.practicePlanPosition(s).kind===kind,{tick,time:seconds,kind},{timeout:2000});
      assert.equal(await page.evaluate(()=>p.practicePlanPosition(s).kind),kind);
      assert(await page.evaluate(()=>!s.isPlaying && document.querySelector('#media-audio').paused));
    }
    for(const destination of [{requestedTick:9600,time:6,tick:11520,bar:3},{requestedTick:24000,time:13,tick:23036,bar:5}]) {
      await page.evaluate(tick=>h.seekPausedTick(tick),destination.requestedTick);
      await page.waitForFunction(({time,tick,bar})=>Math.abs(document.querySelector('#media-audio').currentTime-time)<0.025&&
        Math.abs(s.tickPosition-tick)<6&&h.getAlphaTabApi()._currentBeatBounds?.beat?.voice.bar.index===bar,destination,{timeout:2000});
      assert(await page.evaluate(()=>!s.isPlaying&&document.querySelector('#media-audio').paused),'omitted-score navigation stays paused');
    }
    // Native score clicks use the tick setter directly rather than the helper.
    await page.evaluate(()=>{h.getAlphaTabApi().tickPosition=9600;});
    await page.waitForFunction(()=>Math.abs(document.querySelector('#media-audio').currentTime-6)<0.025&&
      Math.abs(s.tickPosition-11520)<6&&h.getAlphaTabApi()._currentBeatBounds?.beat?.voice.bar.index===3,null,{timeout:2000});
    assert(await page.evaluate(()=>!s.isPlaying&&document.querySelector('#media-audio').paused));
    console.log('PASS native paused seeks redirect interior/trailing omitted score bars and recording together');
    await click('media-edit-sync');await page.locator('#media-explanation-select').selectOption('interior-blank');
    assert.match(await page.locator('#media-explanation-select option:checked').textContent(),/Unscored break/);
    assert.match(await page.locator('#media-listen-explanation').textContent(),/Listen to break/);
    await click('media-listen-explanation');await page.waitForFunction(()=>s.isPlaying && document.querySelector('#media-audio').currentTime>3.2);
    assert(await page.evaluate(()=>s.media.editing && Math.abs(s.tickPosition-7676)<6 && !s.trainer.sessionStarted));
    await click('play-pause-button');await page.waitForFunction(()=>!s.isPlaying);
    const pauseTime=await page.locator('#media-audio').evaluate(audio=>audio.currentTime);await page.waitForTimeout(150);
    assert(pauseTime>3.1 && pauseTime<4);assert(Math.abs(await page.locator('#media-audio').evaluate(audio=>audio.currentTime)-pauseTime)<0.015);
    await click('media-finish-editing');
    console.log('PASS distinct source-rest/explanation holds, matched ordinary rest, unclassified tail and exact Preview pause');

    await seek(1);await release();await click('play-pause-button');await page.waitForFunction(()=>s.isPlaying && !s.countInActive);
    await attack(0);await page.waitForFunction(()=>s.trainer.results.correct===1);await release();
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>3.2);
    await page.evaluate(()=>{sendIntervalMidi([0x90,81,100]);sendIntervalMidi([0x80,81,0]);});await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>s.trainer.results.wrong),0);assert.equal(await page.evaluate(()=>s.trainer.results.missed),0);
    await click('play-pause-button');await page.waitForFunction(()=>!s.isPlaying);await click('media-player-skip-explanation');
    await page.waitForFunction(()=>Math.abs(document.querySelector('#media-audio').currentTime-6)<0.025);
    assert.equal(await page.evaluate(()=>s.trainer.results.correct),1,'Skip source break retains earlier musical results');
    await click('play-pause-button');await page.waitForFunction(()=>s.isPlaying && !s.countInActive);await attack(1);
    await page.waitForFunction(()=>s.trainer.results.correct===2);await release();
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>10.2);
    await page.evaluate(()=>{sendIntervalMidi([0x90,81,100]);sendIntervalMidi([0x80,81,0]);});
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>=11);await attack(2);
    await page.waitForFunction(()=>s.trainer.results.correct===3);await release();
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>13.2);
    assert(await page.evaluate(()=>s.isPlaying && s.trainer.sessionCompleted));
    assert.deepEqual(await page.evaluate(()=>({correct:s.trainer.results.correct,wrong:s.trainer.results.wrong,missed:s.trainer.results.missed,total:s.trainer.results.total})),{correct:3,wrong:0,missed:0,total:3});
    await stop();await page.waitForFunction(()=>Math.abs(document.querySelector('#media-audio').currentTime-1)<0.025);
    console.log('PASS Realtime scoring suspended through both interval kinds, Skip preserves results, final target and Reset');

    await change('practice-loop-start',6);await change('practice-loop-end',7);await change('practice-loop-enabled',true);
    assert.deepEqual(await page.evaluate(()=>s.practiceLoop.range),{startTick:19200,endTick:23040});
    await page.evaluate(()=>{window.loopSamples=[];window.loopTimer=setInterval(()=>loopSamples.push(document.querySelector('#media-audio').currentTime),15);});
    await click('play-pause-button');await page.waitForFunction(()=>loopSamples.some((time,index)=>index>0&&loopSamples[index-1]>12.8&&time<11.3),null,{timeout:8000});
    await stop();await page.evaluate(()=>clearInterval(loopTimer));await change('practice-loop-enabled',false);
    console.log('PASS final retained measure loops natively before trailing source/score blanks');

    await seek(0);
    await page.evaluate(()=>{const control=document.querySelector('input[name="practice-mode"][value="wait"]');control.checked=true;control.dispatchEvent(new Event('change'));});
    await click('play-pause-button');await page.waitForFunction(()=>s.waitTrainer.active&&s.waitTrainer.phase==='waiting');
    for(const tick of [3840,11520,19200]) {
      await page.waitForFunction(tick=>s.waitTrainer.currentEvent?.startTick===tick&&['waiting','seeking'].includes(s.waitTrainer.phase),tick);
      assert(await page.locator('#media-audio').evaluate(audio=>audio.paused&&audio.muted));await release();
      await page.evaluate(()=>{for(const note of s.waitTrainer.currentEvent.notes)sendIntervalMidi([0x90,note.midi,100]);});
    }
    await page.waitForFunction(()=>s.waitTrainer.phase==='complete');assert.equal(await page.evaluate(()=>s.waitTrainer.results.correct),3);
    await stop();await release();assert.equal(await page.evaluate(async()=>(await store.listProfiles()).length),0);
    await change('media-profile-name','Saved interval match');await click('media-save-profile');
    await page.waitForFunction(async()=>(await store.listProfiles()).length===1);
    const profile=await page.evaluate(async()=>(await store.listProfiles())[0]);assert.deepEqual(profile.timingPlan,payload.timingPlan);
    await click('media-practice');await page.waitForFunction(()=>!s.media.preview&&s.playerReady);await assertOriginal();
    assert.deepEqual(await page.evaluate(()=>s.score.exportFlatSyncPoints()),[]);
    await change('media-profile-select',profile.id);await page.waitForFunction(()=>document.querySelector('#media-action-status').textContent==='Saved alignment restored.');
    await click('media-listen');await page.waitForFunction(()=>s.media.preview&&s.media.timingPlan&&s.playerReady);
    assert.deepEqual(await page.evaluate(()=>s.media.timingPlan.plan),payload.timingPlan);
    assert(await page.evaluate(()=>!s.isPlaying&&document.querySelector('#media-audio').paused));
    console.log('PASS silent Wait skips intervals/omissions; explicit profile save/Synth/Recording restores complete plan and original score');

    for(const [input,name,duration,reason] of [[soundingOmission(payload),'sound-not-rest.wav',15,/full.*rest|silent|sounding/i],
      [payload,'too-short.wav',2,/recording duration/]]) {
      await importLocal(input,name,duration);await page.getByRole('heading',{name:'Import needs attention',exact:true}).waitFor();
      assert.match(await page.locator('#lesson-import-dialog').textContent(),reason);await page.waitForFunction(()=>s.playerReady);
      await assertOriginal();assert(await page.evaluate(()=>!s.media.preview&&!s.media.timingPlan&&!s.media.points?.length&&!s.isPlaying));
      assert.equal(await page.locator('#media-point-list button').count(),0);assert.equal(await page.evaluate(async()=>(await store.listProfiles()).length),1);
      await page.getByRole('button',{name:'Close',exact:true}).click();
    }
    console.log('PASS native sounding omission and actual-duration failures reject without fallback or automatic saving');
    // Hold only the external-player ready acknowledgement, then use the real
    // Synth action while an automatic import is awaiting that acknowledgement.
    const racing={...payload,recording:{url:'https://example.com/interval-source-switch.wav',label:'Source switch race',id:payload.recording.id}};
    await page.route(racing.recording.url,route=>route.fulfill({status:200,contentType:'audio/wav',headers:{'access-control-allow-origin':'*'},body:wav()}));
    await page.evaluate(()=>{
      const descriptor=Object.getOwnPropertyDescriptor(s,'playerReady');let actualReady=s.playerReady;
      Object.defineProperty(s,'playerReady',{configurable:true,enumerable:descriptor.enumerable,
        get(){return s.media.preview?false:actualReady;},set(value){actualReady=value;}});
      window.restoreIntervalReady=()=>Object.defineProperty(s,'playerReady',{...descriptor,value:actualReady});
    });
    try {
      const reply=await page.evaluate(payload=>sendIntervalOffer('gts-lesson-offer',payload),racing);assert.equal(reply.ok,true,reply.message);
      await page.waitForFunction(()=>s.media.preview&&s.media.timingPlan);
      assert.equal(await page.locator('#lesson-import-dialog').evaluate(dialog=>dialog.open),false,'automatic import waits without a review modal');
      assert.equal(await page.locator('#media-practice').isDisabled(),false);
      await click('media-practice');await page.waitForFunction(()=>!s.media.preview&&s.playerReady);
    } finally {await page.evaluate(()=>restoreIntervalReady());}
    await page.getByRole('heading',{name:'Import needs attention',exact:true}).waitFor();
    assert.match(await page.locator('#lesson-import-dialog').textContent(),/Recording selection changed before imported timing was activated/);
    await assertOriginal();assert(await page.evaluate(()=>!s.media.preview&&!s.media.timingPlan&&!s.isPlaying));
    assert.equal(await page.evaluate(async()=>(await store.listProfiles()).length),1);
    console.log('PASS changing to Synth during asynchronous activation prevents a false import-success notice');
    assert.deepEqual(errors,[]);
  } catch(error) {
    if(page)console.error('Interval diagnostic:',await page.evaluate(()=>({dialog:document.querySelector('#lesson-import-dialog')?.textContent,
      status:document.querySelector('#media-action-status')?.textContent,time:document.querySelector('#media-audio')?.currentTime,tick:window.s?.tickPosition,
      playing:window.s?.isPlaying,results:window.s?.trainer.results,wait:window.s?.waitTrainer,media:window.s?.media&&{preview:s.media.preview,editing:s.media.editing,clock:s.media.clock}})).catch(()=>null));
    throw error;
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
