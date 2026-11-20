// Real bundled alphaTab, original synthetic GP bytes and local silent WAV.
// This isolated profile does not use an owner's browser, recordings or MIDI.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {createAppServer}=require('../local-web-server.cjs');
const at=require('../assets/vendor/alphatab/alphaTab.js');

function fixture() {
  const settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 120 . \ro 0.6.1 | \rc 2 2.6.1 | 3.6.1`,settings);
  const bytes=Buffer.from(new at.exporter.Gp7Exporter().export(parser.readScore(),settings));
  const ref=(visit,scoreMeasure,originalVisit)=>({visit,scoreMeasure,occurrence:1,originalVisit});
  const refs=[ref(1,1,1),ref(2,2,2),ref(3,3,5)];
  const music=(i,startSeconds,endSeconds)=>({...refs[i],startSeconds,endSeconds,
    anchors:[{offset480:0,seconds:startSeconds},{offset480:480,seconds:endSeconds}]});
  const explanation=(id,label,startSeconds,endSeconds,after,before)=>({id,label,startSeconds,endSeconds,
    boundary:{after:after===null?null:refs[after],before:before===null?null:refs[before]}});
  return {bytes,payload:{format:'gts-lesson',version:4,title:'Synthetic explanation integration',
    lessonUrl:'https://example.com/lessons/synthetic',score:{fileName:'explanation-original.gp',base64:bytes.toString('base64')},
    recording:{kind:'local-choice',id:'synthetic-explanation-recording'},
    timingPlan:{format:'musical-visits-and-explanations',version:1,
      scoreSha256:createHash('sha256').update(bytes).digest('hex'),sourceSha256:'a'.repeat(64),timingSha256:'b'.repeat(64),
      recordingId:'synthetic-explanation-recording',originalPlaybackOrder:[1,2,1,2,3],
      musicalVisits:[music(0,1,3),music(1,5,7),music(2,7,9)],
      explanations:[explanation('intro','Introduction',0,1,null,0),
        explanation('phrase','Explain the first phrase',3,4,0,1),
        explanation('technique','Explain the technique',4,5,0,1),
        explanation('ending','Closing explanation',9,12,2,null)],
      repeatResolution:{kind:'source-visit-plan',omittedOriginalVisits:[3,4]}}}};
}
function wav(seconds=12) {
  const data=Buffer.alloc(44+22050*2*seconds);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(22050,24);
  data.writeUInt32LE(44100,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);
  return data;
}
(async()=>{
  const {bytes,payload}=fixture(),server=createAppServer();let browser,page;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{
      const input={id:'explanation-test',name:'Synthetic explanation MIDI',type:'input',state:'connected',manufacturer:'Test',
        addEventListener(_,f){this.receive=f;},removeEventListener(){},close(){return Promise.resolve();}};
      window.sendExplanationMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});
    });
    page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.stack || error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="explanation-test"]'));
    const installHarness=()=>page.evaluate(async()=>{
      window.s=(await import('./js/app-state.js')).AppState;window.h=await import('./js/alphatab-host.js');
      window.p=await import('./js/media-practice.js');
      const {LibraryStore}=await import('./js/library-store.js');window.store=new LibraryStore();
      window.deliverExplanationMessage=(type,payload)=>new Promise(resolve=>{
        const id=crypto.randomUUID(),response=type==='gts-lesson-offer'?'gts-lesson-reply':'gts-lesson-capabilities';
        const finish=data=>{clearTimeout(timer);window.removeEventListener('message',receive);resolve(data);};
        const receive=event=>{if(event.source===window && event.origin===location.origin && event.data?.type===response && event.data.id===id)finish(event.data);};
        const timer=setTimeout(()=>finish({ok:false,message:'Receiver timed out.'}),5000);
        window.addEventListener('message',receive);window.postMessage({type,id,payload},location.origin);
      });
    });
    await installHarness();
    const change=async(id,value,event='change')=>page.evaluate(({id,value,event})=>{
      const control=document.getElementById(id);if(typeof value==='boolean')control.checked=value;else control.value=String(value);
      control.dispatchEvent(new Event(event));
    },{id,value,event});
    const click=async id=>page.evaluate(id=>document.getElementById(id).click(),id);
    const stop=async()=>{await click('stop-button');await page.waitForFunction(()=>!s.isPlaying && !s.countInActive);};
    const release=async()=>page.evaluate(()=>{for(const note of [...s.midi.activeNotes.values()])sendExplanationMidi([0x80+note.channel-1,note.midi,0]);});
    const attack=async index=>page.evaluate(index=>{for(const note of p.practiceEvents(s)[index].notes)sendExplanationMidi([0x90,note.midi,100]);},index);
    const seek=async(seconds)=>{
      await change('media-seek',seconds,'input');
      await page.waitForFunction(seconds=>Math.abs(document.querySelector('#media-audio').currentTime-seconds)<0.025,seconds);
    };
    const assertOriginal=async()=>{
      const state=await page.evaluate(()=>({order:s.playbackTimeline.measures.map(m=>m.measureNumber),
        ticks:s.playbackTimeline.measures.map(m=>[m.startTick,m.endTick]),notes:s.expectedEvents.length,
        bytes:[...s.currentScoreFile.bytes],repeat:s.score.masterBars[1].repeatCount}));
      assert.deepEqual(state.order,[1,2,1,2,3]);assert.equal(state.notes,5);assert.equal(state.repeat,2);
      assert.deepEqual(state.ticks,[[0,3840],[3840,7680],[7680,11520],[11520,15360],[15360,19200]]);
      assert.deepEqual(Buffer.from(state.bytes),bytes,'original score bytes remain intact');
    };
    await change('midi-input-select','explanation-test');
    const capabilities=await page.evaluate(()=>deliverExplanationMessage('gts-lesson-capabilities-request'));
    assert.deepEqual(capabilities.lessonVersions,[1,2,3,4,5]);
    assert.deepEqual(capabilities.timingPlans.find(plan=>plan.format==='musical-visits-and-explanations'),
      {format:'musical-visits-and-explanations',version:1,capability:'explanation-timing-v1'});
    assert.deepEqual(capabilities.timingPlans.find(plan=>plan.format==='musical-visits-and-intervals'),
      {format:'musical-visits-and-intervals',version:1,capability:'score-timing-match-v1'});
    if(process.env.GTS_EXPLANATION_REVIEW_ONLY) {
      const section=page.locator('#lesson-import-settings'),auto=page.getByLabel('Import helper lessons automatically',{exact:true});
      assert.equal(await auto.isChecked(),true,'a fresh browser starts with automatic import on');
      assert.equal(await page.evaluate(()=>localStorage.getItem('gts.lessonImport.auto')),null,'initial default is not saved over a user preference');
      assert.equal(await section.evaluate(details=>details.open),false,'Lesson imports starts collapsed');
      await page.locator('#btn-options').click();
      assert.equal(await auto.isVisible(),false,'collapsed Lesson imports hides its controls');
      const collapsed=await section.evaluate(details=>{
        const style=getComputedStyle(details),decoration=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+parseFloat(style[key]||0),0);
        return {height:details.getBoundingClientRect().height,summary:details.querySelector('summary').getBoundingClientRect().height,decoration};
      });
      assert(collapsed.height<=collapsed.summary+collapsed.decoration+2,'collapsed card uses only its summary row and normal padding');
      await section.locator('summary').click();
      assert.equal(await section.evaluate(details=>details.open),true);assert.equal(await auto.isVisible(),true);
      assert((await section.boundingBox()).height>collapsed.height,'expanding the section reveals its contents in normal layout');
      await auto.uncheck();assert.equal(await page.evaluate(()=>localStorage.getItem('gts.lessonImport.auto')),'false');
      await page.reload();await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="explanation-test"]'));
      await installHarness();
      assert.equal(await page.locator('#lesson-import-auto').isChecked(),false,'saved off choice survives reload');
      assert.equal(await section.evaluate(details=>details.open),false,'Lesson imports is collapsed again on load');
      console.log('PASS fresh automatic import on without storage writes; Lesson imports expands normally; saved off survives reload');
    }
    const offer=await page.evaluate(payload=>deliverExplanationMessage('gts-lesson-offer',payload),payload);
    assert.equal(offer.ok,true,offer.message);
    const importButton=page.getByRole('button',{name:'Import lesson',exact:true});
    assert(await importButton.isDisabled());
    assert.equal(await page.locator('#lesson-recording-confirmation').count(),0);
    assert.equal(await page.locator('#lesson-repeat-review').textContent(),'Skip the second pass of measures 1–2 to match this recording. Original score stays unchanged.');
    assert.equal(await page.locator('#lesson-import-details').evaluate(details=>details.open),false);
    assert.match(await page.locator('#lesson-import-details').textContent(),/synthetic-explanation-recording/);
    assert.match(await page.locator('#lesson-import-details').textContent(),/3, 4/);
    if(process.env.GTS_EXPLANATION_REVIEW_ONLY) {
      assert.equal(await page.locator('#lesson-import-auto').isChecked(),false,'saved off choice retains manual review coverage');
      const original=await page.evaluate(()=>s.currentScoreFile?.fileName??null);
      if(process.env.GTS_SCREENSHOT_DIR) {
        const fs=require('node:fs'),path=require('node:path');fs.mkdirSync(process.env.GTS_SCREENSHOT_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'lesson-review-desktop.png'),fullPage:true});
        await page.setViewportSize({width:390,height:844});
        await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'lesson-review-phone.png'),fullPage:true});
        const box=await page.locator('#lesson-import-dialog').boundingBox();assert(box.width<=390 && box.x>=0,'review fits the phone viewport');
      }
      await page.locator('#lesson-recording-file').setInputFiles({name:'matching-explanation.wav',mimeType:'audio/wav',buffer:wav()});
      assert.equal(await importButton.isDisabled(),false,'a local file enables the single Import action');
      await page.getByRole('button',{name:'Cancel',exact:true}).click();
      const online={...payload,recording:{url:'https://example.com/synthetic.wav',label:'Synthetic online recording',id:payload.recording.id}};
      assert.equal((await page.evaluate(payload=>deliverExplanationMessage('gts-lesson-offer',payload),online)).ok,true);
      assert.equal(await importButton.isDisabled(),false,'online review needs no extra confirmation');
      assert(await page.evaluate(()=>!s.isPlaying && !s.media.preview));
      await page.getByRole('button',{name:'Cancel',exact:true}).click();
      assert.equal(await page.evaluate(()=>s.currentScoreFile?.fileName??null),original);
      assert.deepEqual(await page.evaluate(async()=>({profiles:(await store.listProfiles()).length,scores:(await store.list()).scores.length})),{profiles:0,scores:0});
      let recordingRequests=0;
      await page.route(online.recording.url,route=>{recordingRequests++;return route.fulfill({status:200,contentType:'audio/wav',headers:{'access-control-allow-origin':'*'},body:wav()});});
      assert.equal((await page.evaluate(payload=>deliverExplanationMessage('gts-lesson-offer',payload),online)).ok,true);
      assert.equal(recordingRequests,0,'review does not load an online recording before Import');
      assert.equal(await importButton.isDisabled(),false);await importButton.click();
      await page.waitForFunction(()=>s.playerReady && s.media.timingPlan && !document.querySelector('#lesson-import-dialog').open,null,{timeout:35000});
      assert(recordingRequests>0);await assertOriginal();
      assert.deepEqual(await page.evaluate(()=>s.media.timingPlan.plan),payload.timingPlan);
      assert(await page.evaluate(()=>!s.isPlaying && !s.countInActive && document.querySelector('#media-audio').paused));
      assert.deepEqual(await page.evaluate(async()=>({profiles:(await store.listProfiles()).length,scores:(await store.list()).scores.length})),{profiles:0,scores:0});
      console.log('PASS compact desktop/phone review, local file gating, one-click native online import without autoplay/autosave and unchanged resources on Cancel');

      await page.setViewportSize({width:1440,height:1000});
      await page.locator('#btn-options').click();
      assert.equal(await page.locator('#lesson-import-settings').evaluate(details=>details.open),false);
      await page.locator('#lesson-import-settings summary').click();
      await page.getByLabel('Import helper lessons automatically',{exact:true}).check();
      assert.equal(await page.evaluate(()=>localStorage.getItem('gts.lessonImport.auto')),'true');
      await page.reload();
      await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="explanation-test"]'));
      await installHarness();
      assert.equal(await page.locator('#lesson-import-auto').isChecked(),true,'automatic import choice survives reload');
      assert.equal(await page.locator('#lesson-import-settings').evaluate(details=>details.open),false,'saved on choice does not expand the settings section');
      await page.evaluate(()=>{
        window.autoDialogOpens=0;
        new MutationObserver(records=>{for(const record of records)if(record.attributeName==='open' && record.target.open)autoDialogOpens++;})
          .observe(document.querySelector('#lesson-import-dialog'),{attributes:true,attributeFilter:['open']});
      });
      await page.unroute(online.recording.url);
      let releaseRecording,recordingResponses=0;
      const recordingGate=new Promise(resolve=>{releaseRecording=resolve;});
      await page.route(online.recording.url,async route=>{
        await recordingGate;
        await route.fulfill({status:200,contentType:'audio/wav',headers:{'access-control-allow-origin':'*'},body:wav()});
        recordingResponses++;
      });
      const recordingRequested=page.waitForRequest(online.recording.url);
      const automaticOffer=await page.evaluate(payload=>deliverExplanationMessage('gts-lesson-offer',payload),online);
      assert.equal(automaticOffer.ok,true,automaticOffer.message);
      assert.equal(recordingResponses,0,'offer acknowledgement does not wait for recording metadata');
      assert.equal(await page.locator('#lesson-import-dialog').evaluate(dialog=>dialog.open),false,'automatic import skips review');
      await recordingRequested;
      assert(await page.evaluate(()=>!s.media.timingPlan && !s.isPlaying),'unloaded recording timing is not activated');
      releaseRecording();
      await page.waitForFunction(()=>s.playerReady && s.media.timingPlan && !s.media.editing,null,{timeout:35000});
      await assertOriginal();
      assert.deepEqual(await page.evaluate(()=>s.media.timingPlan.plan),payload.timingPlan);
      assert.equal(await page.evaluate(()=>autoDialogOpens),0,'successful automatic import never opens review');
      assert(await page.evaluate(()=>!s.isPlaying && !s.countInActive && document.querySelector('#media-audio').paused));
      assert.deepEqual(await page.evaluate(async()=>({profiles:(await store.listProfiles()).length,scores:(await store.list()).scores.length})),{profiles:0,scores:0});
      console.log('PASS saved on choice persists with Settings collapsed; automatic online import acknowledges before media loads and preserves native score/plan without review, autoplay or saving');

      await page.evaluate(()=>{window.automaticScore=s.currentScoreFile;});
      assert.equal((await page.evaluate(payload=>deliverExplanationMessage('gts-lesson-offer',payload),payload)).ok,true);
      assert.equal(await page.locator('#lesson-import-dialog').evaluate(dialog=>dialog.open),true,'local-choice still opens review');
      assert.equal(await importButton.isDisabled(),true,'automatic import cannot choose a local recording');
      assert(await page.evaluate(()=>s.currentScoreFile===automaticScore),'local review leaves loaded resources untouched');
      await page.locator('#lesson-recording-file').setInputFiles({name:'matching-explanation.wav',mimeType:'audio/wav',buffer:wav()});
      assert.equal(await importButton.isDisabled(),false);
      assert(await page.evaluate(()=>s.currentScoreFile===automaticScore),'selecting a file still requires the Import action');
      await page.getByRole('button',{name:'Cancel',exact:true}).click();

      const shortOnline={...online,recording:{...online.recording,url:'https://example.com/synthetic-short.wav'}};
      await page.route(shortOnline.recording.url,route=>route.fulfill({status:200,contentType:'audio/wav',headers:{'access-control-allow-origin':'*'},body:wav(2)}));
      const shortAutomaticOffer=await page.evaluate(payload=>deliverExplanationMessage('gts-lesson-offer',payload),shortOnline);
      assert.equal(shortAutomaticOffer.ok,true,shortAutomaticOffer.message);
      await page.getByRole('heading',{name:'Import needs attention',exact:true}).waitFor();
      assert.equal(await page.locator('#lesson-import-dialog').evaluate(dialog=>dialog.open),true);
      assert.match(await page.locator('#lesson-import-dialog').textContent(),/beyond the selected recording duration/);
      await page.waitForFunction(()=>s.playerReady);
      await assertOriginal();
      assert(await page.evaluate(()=>!s.media.preview && !s.media.timingPlan && !s.media.points?.length && !s.isPlaying && !s.countInActive));
      assert.deepEqual(await page.evaluate(async()=>({profiles:(await store.listProfiles()).length,scores:(await store.list()).scores.length})),{profiles:0,scores:0});
      assert.deepEqual(errors,[]);
      console.log('PASS automatic preference preserves manual local-file Import; actual-duration failure opens attention review without activating or saving invalid timing');return;
    }
    await page.locator('#lesson-recording-file').setInputFiles({name:'matching-explanation.wav',mimeType:'audio/wav',buffer:wav()});
    assert.equal(await importButton.isDisabled(),false,'a local file enables the single Import action');
    await importButton.click();
    await page.waitForFunction(()=>s.playerReady && s.media.timingPlan && !document.querySelector('#lesson-import-dialog').open,null,{timeout:35000});
    await page.waitForTimeout(500); // Native practice-track regeneration and cursor layout.
    await assertOriginal();
    assert(await page.evaluate(()=>s.media.preview && !s.media.editing && !s.isPlaying && !s.countInActive && document.querySelector('#media-audio').paused));
    assert.deepEqual(await page.evaluate(()=>p.practiceEvents(s).map(e=>e.startTick)),[0,3840,15360]);
    assert.deepEqual(await page.evaluate(()=>s.media.points),[],'plan does not create editable legacy anchors');
    assert.deepEqual(await page.evaluate(async()=>({profiles:(await store.listProfiles()).length,scores:(await store.list()).scores.length})),
      {profiles:0,scores:0},'receiving a lesson saves neither its score nor its timing automatically');
    console.log('PASS v4 review, matching local recording, native repeat validation, no autoplay and original score preservation');

    // Paused exploration uses real recording seconds while commentary holds the
    // completed musical passage, including consecutive breaks and ending speech.
    for(const [seconds,tick] of [[0.4,0],[1.5,960],[3.4,3836],[4.4,3836],[5.5,4800],[7.5,16320],[10,19196]]) {
      await seek(seconds);await page.waitForFunction(tick=>Math.abs(s.tickPosition-tick)<6,tick);
      const writtenBar=tick>=15360?2:tick>=3840?1:0;
      await page.waitForFunction(bar=>h.getAlphaTabApi()._currentBeatBounds?.beat?.voice.bar.index===bar,writtenBar);
      assert(await page.evaluate(()=>!s.isPlaying && document.querySelector('#media-audio').paused));
    }
    await click('media-edit-sync');
    assert(await page.locator('#media-add-point').isDisabled(),'explanation timing remains read-only in the sync editor');
    await page.locator('#media-explanation-select').selectOption('phrase');await page.locator('#media-listen-explanation').click();
    await page.waitForFunction(()=>s.isPlaying && document.querySelector('#media-audio').currentTime>3.2);
    assert(await page.evaluate(()=>s.media.editing && Math.abs(s.tickPosition-3836)<6 && !s.trainer.sessionStarted));
    await click('play-pause-button');await page.waitForFunction(()=>!s.isPlaying);
    const paused=await page.locator('#media-audio').evaluate(audio=>audio.currentTime);
    assert(paused>3.1 && paused<4,'Preview Pause keeps the exact explanation time');
    await page.waitForTimeout(250);
    assert(Math.abs(await page.locator('#media-audio').evaluate(audio=>audio.currentTime)-paused)<0.015,'paused explanation does not snap to a musical boundary');
    await page.locator('#media-finish-editing').click();
    assert(await page.evaluate(()=>!s.media.editing && !s.isPlaying));
    console.log('PASS recording seeks, intro/interior/consecutive/ending cursor holds, Listen Preview and exact Pause');

    await seek(1);await release();await click('play-pause-button');
    await page.waitForFunction(()=>s.isPlaying && !s.countInActive && !document.querySelector('#media-audio').paused);
    await attack(0);await page.waitForFunction(()=>s.trainer.results.correct===1);
    await release();await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>3.2);
    assert.equal(await page.evaluate(()=>s.trainer.results.correct),1);
    assert.equal(await page.evaluate(()=>s.trainer.results.missed),0,'future music is not missed during commentary');
    await page.evaluate(()=>{sendExplanationMidi([0x90,81,100]);sendExplanationMidi([0x80,81,0]);});
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(()=>s.trainer.results.wrong),0,'commentary MIDI is ungraded');
    await click('play-pause-button');await page.waitForFunction(()=>!s.isPlaying);
    await click('media-player-skip-explanation');
    await page.waitForFunction(()=>Math.abs(document.querySelector('#media-audio').currentTime-5)<0.025);
    assert.equal(await page.evaluate(()=>s.trainer.results.correct),1,'Skip to music preserves completed musical results');
    await click('play-pause-button');await page.waitForFunction(()=>s.isPlaying && !s.countInActive);
    await attack(1);await page.waitForFunction(()=>s.trainer.results.correct===2);await release();
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>=7);
    await attack(2);await page.waitForFunction(()=>s.trainer.results.correct===3);await release();
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>9.2);
    assert(await page.evaluate(()=>s.isPlaying && !document.querySelector('#media-audio').paused && s.trainer.sessionCompleted));
    assert.deepEqual(await page.evaluate(()=>({correct:s.trainer.results.correct,missed:s.trainer.results.missed,wrong:s.trainer.results.wrong,total:s.trainer.results.total})),
      {correct:3,missed:0,wrong:0,total:3});
    await click('play-pause-button');await page.waitForFunction(()=>!s.isPlaying);
    assert(await page.locator('#media-audio').evaluate(audio=>audio.currentTime>9.1),'ending Pause does not rewind to native score time');
    console.log('PASS first attack after scrub, ungraded commentary, Skip preserving results, omitted visits and continuing ending playback');

    await stop();await change('practice-loop-start',1);await change('practice-loop-end',1);await change('practice-loop-enabled',true);
    await page.evaluate(()=>{window.loopSamples=[];window.loopTimer=setInterval(()=>loopSamples.push({time:document.querySelector('#media-audio').currentTime,playing:s.isPlaying,countIn:s.countInActive}),15);});
    await click('play-pause-button');
    await page.waitForFunction(()=>loopSamples.some((sample,i)=>i>0 && loopSamples[i-1].time>2.8 && sample.time<1.3),null,{timeout:8000});
    await stop();await page.evaluate(()=>clearInterval(loopTimer));
    assert.equal(await page.evaluate(()=>h.getAlphaTabApi().isLooping),true,'continuous loop remains native');
    await change('loop-count-in',true);await click('play-pause-button');
    await page.waitForFunction(()=>s.isPlaying && !s.countInActive);
    await page.waitForFunction(()=>s.countInActive,null,{timeout:8000});
    assert(await page.locator('#media-audio').evaluate(audio=>audio.paused),'loop count-in pauses recording');
    await page.waitForFunction(()=>s.isPlaying && !s.countInActive && document.querySelector('#media-audio').currentTime<1.6,null,{timeout:6000});
    await stop();await change('loop-count-in',false);await change('practice-loop-start',5);await change('practice-loop-end',5);
    await page.evaluate(()=>{loopSamples=[];loopTimer=setInterval(()=>loopSamples.push(document.querySelector('#media-audio').currentTime),15);});
    await click('play-pause-button');
    await page.waitForFunction(()=>loopSamples.some((sample,i)=>i>0 && loopSamples[i-1]>8.8 && sample<7.3),null,{timeout:8000});
    await stop();await page.evaluate(()=>clearInterval(loopTimer));await change('practice-loop-enabled',false);
    console.log('PASS native musical-range looping and repeat count-in without replaying explanation');

    await seek(0);
    await page.evaluate(()=>{const control=document.querySelector('input[name="practice-mode"][value="wait"]');control.checked=true;control.dispatchEvent(new Event('change'));});
    await click('play-pause-button');
    await page.waitForFunction(()=>s.waitTrainer.active && s.waitTrainer.phase==='waiting');
    for(const tick of [0,3840,15360]) {
      await page.waitForFunction(tick=>s.waitTrainer.currentEvent?.startTick===tick && ['waiting','seeking'].includes(s.waitTrainer.phase),tick);
      assert(await page.locator('#media-audio').evaluate(audio=>audio.paused && audio.muted),'Wait practice keeps recording silent');
      await release();await page.evaluate(()=>{for(const note of s.waitTrainer.currentEvent.notes)sendExplanationMidi([0x90,note.midi,100]);});
    }
    await page.waitForFunction(()=>s.waitTrainer.phase==='complete');
    assert.equal(await page.evaluate(()=>s.waitTrainer.results.correct),3);assert.equal(await page.evaluate(()=>s.waitTrainer.results.total),3);
    await stop();await release();
    assert.equal(await page.evaluate(async()=>(await store.listProfiles()).length),0,'practice itself does not save timing');
    await change('media-profile-name','Saved synthetic explanation');await click('media-save-profile');
    await page.waitForFunction(async()=>(await store.listProfiles()).length===1);
    const profile=await page.evaluate(async()=>(await store.listProfiles())[0]);
    assert.deepEqual(profile.timingPlan,payload.timingPlan);assert.equal(Object.hasOwn(profile,'points'),false);
    await click('media-practice');
    await page.waitForFunction(()=>!s.media.preview && s.playerReady);
    await assertOriginal();assert.equal(await page.evaluate(()=>p.practiceEvents(s).length),5);
    assert.deepEqual(await page.evaluate(()=>s.score.exportFlatSyncPoints()),[],'Synth restores original native sync state');
    console.log('PASS Wait skips all commentary and omitted repeats; Synth restores full original traversal');
    await page.evaluate(()=>{const control=document.querySelector('input[name="practice-mode"][value="realtime"]');control.checked=true;control.dispatchEvent(new Event('change'));});
    await change('media-profile-select',profile.id);
    await page.waitForFunction(()=>document.querySelector('#media-action-status').textContent==='Saved alignment restored.');
    await click('media-listen');await page.waitForFunction(()=>s.media.preview && s.media.timingPlan && s.playerReady);
    assert.deepEqual(await page.evaluate(()=>s.media.timingPlan.plan),payload.timingPlan);
    assert.deepEqual(await page.evaluate(()=>p.practiceEvents(s).map(event=>event.startTick)),[0,3840,15360]);
    assert(await page.evaluate(()=>!s.isPlaying && !s.countInActive && document.querySelector('#media-audio').paused));
    await seek(4.2);await page.waitForFunction(()=>Math.abs(s.tickPosition-3836)<6);
    await assertOriginal();
    console.log('PASS no automatic saves; explicit profile save, Synth and saved Recording restore the original plan/runtime');

    const shortOffer=await page.evaluate(payload=>deliverExplanationMessage('gts-lesson-offer',payload),payload);
    assert.equal(shortOffer.ok,true,shortOffer.message);
    await page.locator('#lesson-recording-file').setInputFiles({name:'too-short.wav',mimeType:'audio/wav',buffer:wav(2)});
    await importButton.click();
    await page.getByRole('heading',{name:'Import needs attention',exact:true}).waitFor();
    assert.match(await page.locator('#lesson-import-dialog').textContent(),/beyond the selected recording duration/);
    await page.waitForFunction(()=>s.playerReady);
    assert(await page.evaluate(()=>!s.media.preview && !s.media.timingPlan && !s.isPlaying && !s.countInActive));
    assert(await page.evaluate(()=>!s.media.points?.length),'invalid plan does not fall back to fabricated sync anchors');
    assert.equal(await page.locator('#media-point-list button').count(),0);
    await assertOriginal();assert.equal(await page.evaluate(()=>p.practiceEvents(s).length),5);
    assert.equal(await page.evaluate(async()=>(await store.listProfiles()).length),1,'rejected import does not save another profile');
    console.log('PASS too-short recording rejects v4 timing without legacy fallback; original score remains usable');
    assert.deepEqual(errors,[]);
  } catch(error) {
    if(page)console.error('Browser diagnostic:',await page.evaluate(()=>({dialog:document.querySelector('#lesson-import-dialog')?.textContent,
      notice:document.querySelector('#media-action-status')?.textContent,playing:window.s?.isPlaying,countIn:window.s?.countInActive,
      tick:window.s?.tickPosition,time:document.querySelector('#media-audio')?.currentTime,
      results:window.s?.trainer.results,wait:window.s?.waitTrainer,media:window.s?.media && {preview:s.media.preview,editing:s.media.editing,clock:s.media.clock}})).catch(()=>null));
    throw error;
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
