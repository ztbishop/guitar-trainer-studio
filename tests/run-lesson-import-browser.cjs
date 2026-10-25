// Real app/alphaTab/media with synthetic score/WAV, one-shot delivery and isolated profile.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const {createAppServer}=require('../local-web-server.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
function wav() {
  const data=Buffer.alloc(44+22050*2*12);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(22050,24);
  data.writeUInt32LE(44100,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);return data;
}
(async()=>{
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const {deliverLesson}=await import('../extensions/lesson-bridge/transfer.js');
    const base=`http://127.0.0.1:${server.address().port}`;
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:1360,height:900}});
    let mediaRequests=0;
    await context.route('https://recording.test/**',route=>{mediaRequests++;return route.fulfill({contentType:'audio/wav',body:wav(),headers:{'Access-Control-Allow-Origin':'*'}});});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);await page.locator('#lesson-import-dialog').waitFor({state:'attached'});
    assert.equal(await page.locator('#media-apply-pasted-sync').isDisabled(),true);
    await page.waitForFunction(async()=>{window.lessonState=(await import('./js/app-state.js')).AppState;return !!document.querySelector('#fretboard-content svg');});
    const scorePath=path.join(__dirname,'../assets/demos/first-notes.gp');
    const payload={format:'gts-lesson',version:1,title:'Synthetic lesson',lessonUrl:'https://truefire.com/lesson/v32684',
      score:{fileName:'imported-lesson.gp',base64:fs.readFileSync(scorePath).toString('base64')},
      recording:{url:'https://recording.test/clip.wav',label:'Synthetic lesson'},syncPoints:[[0,1],[3,8],[4,11]]};
    const offer=p=>page.evaluate(deliverLesson,p);
    assert.equal((await offer({...payload,version:99})).ok,false);
    assert.equal(await page.locator('#lesson-import-dialog').isVisible(),false);
    // Wrong-origin/frame messages must not trigger review.
    await page.evaluate(p=>window.dispatchEvent(new MessageEvent('message',{data:{type:'gts-lesson-offer',id:'spoof',payload:p},origin:'https://other.test',source:window})),payload);
    assert.equal(await page.locator('#lesson-import-dialog').isVisible(),false);
    assert.equal((await offer(payload)).ok,true);
    assert.equal((await offer(payload)).ok,false,'pending review cannot be overwritten');
    assert.equal(await page.evaluate(()=>lessonState.currentScoreFile),null,'offering does not load');
    assert.equal(mediaRequests,0,'no remote media contacted before review');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await page.evaluate(()=>lessonState.currentScoreFile),null);
    await offer(payload);await page.getByRole('button',{name:'Import lesson',exact:true}).click();
    await page.locator('#lesson-import-notice').filter({hasText:'Lesson ready.'}).waitFor({timeout:35000});
    assert.equal(await page.locator('#lesson-import-dialog').isVisible(),false,'successful review closes itself');
    const actual=await page.evaluate(async()=>{
      const {LibraryStore}=await import('./js/library-store.js');const store=new LibraryStore();
      return {file:lessonState.currentScoreFile.fileName,playing:lessonState.isPlaying,editing:lessonState.media.editing,
        points:lessonState.media.points,measures:lessonState.playbackTimeline.measures.length,scores:(await store.list()).scores.length,profiles:(await store.listProfiles()).length};
    });
    assert.equal(actual.file,'imported-lesson.gp');assert.equal(actual.playing,false);assert.equal(actual.editing,false);
    assert.equal(actual.measures,4);assert.equal(actual.scores,0);assert.equal(actual.profiles,0);
    assert.deepEqual(actual.points.map(p=>p.millisecondOffset),[1000,8000,11000]);
    assert.equal(actual.points.at(-1).barPosition,1);
    if(process.env.GTS_IMPORT_SCREENSHOT)await page.screenshot({path:process.env.GTS_IMPORT_SCREENSHOT,fullPage:true});
    assert.equal(await page.locator('#media-dirty').textContent(),'Unsaved changes');
    assert.equal(await page.locator('#media-editor').isVisible(),false,'import automatically finishes editing');
    assert.equal(await page.locator('#play-pause-button').textContent(),'▶ Play');
    assert.equal(await page.locator('#play-pause-button').evaluate(el=>el===document.activeElement),true);
    // Mismatched timing fails before a recording request and keeps the opened score usable.
    const requestsBefore=mediaRequests;
    await offer({...payload,syncPoints:[[0,1],[96,11]]});await page.getByRole('button',{name:'Import lesson',exact:true}).click();
    await page.locator('#lesson-import-dialog [role=status]').filter({hasText:'does not match'}).waitFor({timeout:35000});
    assert.equal(mediaRequests,requestsBefore);assert.equal(await page.evaluate(()=>lessonState.currentScoreFile.fileName),'imported-lesson.gp');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    // Score-only path deliberately omits media/timing and never starts playback.
    await offer({...payload,recording:null,syncPoints:null});await page.getByRole('button',{name:'Import lesson',exact:true}).click();
    await page.locator('#lesson-import-notice').filter({hasText:'Lesson ready.'}).waitFor({timeout:35000});
    assert.equal(await page.evaluate(()=>lessonState.isPlaying),false);
    assert.equal(await page.locator('#lesson-import-dialog').isVisible(),false);
    // A recording with no real timing still requires manual alignment.
    await offer({...payload,syncPoints:null});await page.getByRole('button',{name:'Import lesson',exact:true}).click();
    await page.locator('#lesson-import-notice').filter({hasText:'Add alignment'}).waitFor({timeout:35000});
    assert.equal(await page.locator('#lesson-import-dialog').isVisible(),false);
    assert.equal(await page.evaluate(()=>lessonState.media.editing),true);
    await page.locator('#media-paste-sync summary').click();
    const previous=await page.evaluate(()=>JSON.stringify(lessonState.media.points));
    for(const value of ['not JSON','[[0,1],[96,11]]','[[0,1],[4,13]]']) {
      await page.locator('#media-sync-json').fill(value);await page.locator('#media-apply-pasted-sync').click();
      assert.equal(await page.evaluate(()=>JSON.stringify(lessonState.media.points)),previous,'invalid pasted data preserves the current alignment');
      assert((await page.locator('#media-paste-status').innerText()).length>0);
    }
    const recordingUrl=await page.locator('#media-audio').getAttribute('src');
    await page.locator('#media-sync-json').fill('[[0,2],[3,9],[4,11]]');await page.locator('#media-apply-pasted-sync').click();
    await page.locator('#media-paste-status').filter({hasText:'Sync points applied'}).waitFor();
    assert.deepEqual(await page.evaluate(()=>lessonState.media.points.map(p=>p.millisecondOffset)),[2000,9000,11000]);
    assert.equal(await page.locator('#media-audio').getAttribute('src'),recordingUrl);
    assert.equal(await page.evaluate(()=>lessonState.currentScoreFile.fileName),'imported-lesson.gp');
    await page.locator('#media-undo').click();assert.equal(await page.evaluate(()=>JSON.stringify(lessonState.media.points)),previous);
    await page.locator('#media-redo').click();
    assert.deepEqual(await page.evaluate(()=>lessonState.media.points.map(p=>p.millisecondOffset)),[2000,9000,11000]);
    assert.equal(await page.locator('#media-dirty').textContent(),'Unsaved changes');
    if(process.env.GTS_PASTE_SCREENSHOT)await page.locator('#media-paste-sync').screenshot({path:process.env.GTS_PASTE_SCREENSHOT});
    await page.locator('#media-finish-editing').click();
    // Automatic completion must retain Wait mode and leave the recording silent.
    await page.evaluate(()=>{const input=document.querySelector('input[name="practice-mode"][value="wait"]');input.checked=true;input.dispatchEvent(new Event('change'));});
    await offer(payload);await page.getByRole('button',{name:'Import lesson',exact:true}).click();
    await page.locator('#lesson-import-notice').filter({hasText:'Lesson ready.'}).waitFor({timeout:35000});
    assert.equal(await page.evaluate(()=>lessonState.mode),'wait');
    assert.equal(await page.evaluate(()=>lessonState.media.editing),false);
    assert.equal(await page.evaluate(()=>lessonState.isPlaying),false);
    assert.equal(await page.locator('#media-audio').evaluate(el=>el.muted && el.paused),true);
    // A later file selection cancels a pending media load; its anchors cannot leak.
    let started;
    const requested=new Promise(resolve=>{started=resolve;});
    await context.route('https://recording.test/slow.wav',async route=>{
      started();await new Promise(resolve=>setTimeout(resolve,500));
      await route.fulfill({contentType:'audio/wav',body:wav()}).catch(()=>{});
    });
    await offer({...payload,recording:{url:'https://recording.test/slow.wav',label:'Slow fixture'}});
    await page.getByRole('button',{name:'Import lesson',exact:true}).click();await requested;
    await page.locator('#score-file-input').setInputFiles(scorePath);
    await page.waitForFunction(()=>lessonState.currentScoreFile?.fileName==='first-notes.gp' && lessonState.playerReady);
    await page.locator('#lesson-import-dialog [role=status]').filter({hasText:'did not finish'}).waitFor();
    assert.equal(await page.evaluate(()=>lessonState.media.preview),false,'obsolete recording cannot attach to replacement score');
    assert.deepEqual(errors,[]);
    console.log('Lesson import browser checks passed: automatic practice-ready completion and closing in Realtime/Wait, silent Wait, manual alignment without timing, native score/media/timing import, review gates, optional save, no autoplay, mismatch recovery and stale-load cancellation. Authenticated provider/hardware acceptance remains separate.');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
