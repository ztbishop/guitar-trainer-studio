// Installed Chrome, isolated profile, synthetic recording/MIDI. No private media.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');
function wav() {
  const b=Buffer.alloc(44+44100*2*8);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);
  b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;
}
(async()=>{
  const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#score-file-input').setInputFiles(require('node:path').join(__dirname,'../assets/demos/first-notes.gp'));
    await page.waitForFunction(async()=>{
      window.s=(await import('./js/app-state.js')).AppState;window.h=await import('./js/alphatab-host.js');
      window.engine=await import('./js/practice-engine.js');return s.playerReady && s.expectedEvents.length;
    });
    await page.evaluate(()=>{const c=document.querySelector('#media-show-editor');c.checked=true;c.dispatchEvent(new Event('change'));});
    await page.locator('#media-file').setInputFiles({name:'full-recording.wav',mimeType:'audio/wav',buffer:wav()});
    await page.waitForFunction(()=>s.media.preview && s.playerReady);
    await page.evaluate(()=>{document.querySelector('#media-point-list').firstElementChild.click();});
    await page.locator('#media-point-time').fill('2');await page.locator('#media-add-point').click();
    await page.evaluate(()=>{document.querySelector('#media-point-list').lastElementChild.click();});
    await page.locator('#media-point-time').fill('4');await page.locator('#media-add-point').click();
    assert.equal(await page.locator('.media-outside-score').count(),2);
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:require('node:path').join(process.env.GTS_SCREENSHOT_DIR,'full-recording-timeline.png')});
    await page.locator('#media-finish-editing').click();
    await page.waitForFunction(()=>!s.media.editing && s.playerReady);
    const seek=async seconds=>{
      await page.evaluate(seconds=>{const c=document.querySelector('#media-seek');c.value=String(seconds);c.dispatchEvent(new Event('input'));},seconds);
      await page.waitForFunction(seconds=>Math.abs(document.querySelector('#media-audio').currentTime-seconds)<0.25,seconds);
    };
    // Opening/closing the editor pauses at the recording playhead, including
    // intro/outro positions that have no corresponding native score beat.
    const anchors=await page.evaluate(()=>JSON.stringify(s.media.points));
    for(const seconds of [0.3,3,5.2]) {
      await seek(seconds);
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(t=>document.querySelector('#media-audio').currentTime>t+0.1,seconds);
      const entered=await page.locator('#media-audio').evaluate(e=>e.currentTime);
      await page.evaluate(()=>document.querySelector('#media-edit-sync').click());
      await page.waitForFunction(()=>s.media.editing && !s.isPlaying && !document.querySelector('#media-audio').seeking);
      await page.waitForTimeout(150);
      const held=await page.locator('#media-audio').evaluate(e=>e.currentTime);
      assert(Math.abs(held-entered)<0.25,`opening editor preserves recording time at ${seconds}: ${entered} -> ${held}`);
      await page.evaluate(()=>h.setMediaEditing(true));
      await page.locator('#media-finish-editing').click();
      await page.waitForTimeout(150);
      assert(Math.abs(await page.locator('#media-audio').evaluate(e=>e.currentTime)-held)<0.05,'closing editor preserves paused time');
      assert.equal(await page.evaluate(()=>JSON.stringify(s.media.points)),anchors,'editor visibility never edits anchors');
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(t=>document.querySelector('#media-audio').currentTime>t+0.15,held);
      await page.locator('#play-pause-button').click();
    }
    await seek(0.3);
    const before=await page.evaluate(()=>JSON.stringify(s.trainer.results));
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>s.isPlaying && document.querySelector('#media-audio').currentTime>0.5);
    await page.evaluate(()=>engine.handleMidiEvent({type:'note-on',midi:1,channel:1,at:performance.now()}));
    assert.equal(await page.evaluate(()=>JSON.stringify(s.trainer.results)),before,'intro does not grade');
    assert.match(await page.locator('#media-listening-notice').textContent(),/Before synced music/);
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>4.5);
    assert(await page.evaluate(()=>s.isPlaying && s.trainer.sessionCompleted && !document.querySelector('#media-audio').paused),'score finishes but outro continues');
    assert.match(await page.locator('#media-listening-notice').textContent(),/After synced music/);
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:require('node:path').join(process.env.GTS_SCREENSHOT_DIR,'full-recording-outro.png')});
    const completed=await page.evaluate(()=>JSON.stringify(s.trainer.results));
    await page.evaluate(()=>engine.handleMidiEvent({type:'note-on',midi:1,channel:1,at:performance.now()}));
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>!s.isPlaying);
    const paused=await page.locator('#media-audio').evaluate(e=>e.currentTime);
    assert(paused>4.4,'Pause must not snap the recording back into the score');
    await page.waitForTimeout(200);
    assert(Math.abs(await page.locator('#media-audio').evaluate(e=>e.currentTime)-paused)<0.05);
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(t=>document.querySelector('#media-audio').currentTime>t+0.2,paused);
    assert.equal(await page.evaluate(()=>JSON.stringify(s.trainer.results)),completed,'outro Pause/Resume preserves final results');
    await seek(2.5);
    await page.waitForFunction(()=>!s.trainer.sessionCompleted && s.isPlaying);
    assert.equal(await page.evaluate(()=>s.trainer.sessionReason),'seek-or-speed-change');
    await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>4.4 && s.trainer.sessionCompleted);
    await seek(7.5);
    await page.waitForFunction(()=>document.querySelector('#media-audio').ended && !s.isPlaying);
    assert(await page.evaluate(()=>s.trainer.sessionCompleted),'recording end retains completed results');
    // Explicit loops retain their native transport boundary.
    await page.evaluate(()=>{for(const [id,value] of [['practice-loop-start','0'],['practice-loop-end','0']]){const c=document.getElementById(id);c.value=value;c.dispatchEvent(new Event('change'));}const c=document.querySelector('#practice-loop-enabled');c.checked=true;c.dispatchEvent(new Event('change'));});
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>s.isPlaying && !s.countInActive);
    await page.waitForTimeout(1800);
    assert(await page.evaluate(()=>!s.trainer.sessionCompleted && document.querySelector('#media-audio').currentTime<4),'loop stays inside score');
    await page.locator('#stop-button').click();
    await page.evaluate(()=>{const c=document.querySelector('#practice-loop-enabled');c.checked=false;c.dispatchEvent(new Event('change'));document.querySelector('#media-edit-sync').click();});
    await page.evaluate(()=>document.querySelector('#media-point-list').lastElementChild.click());
    await page.locator('#media-point-time').fill('8');await page.locator('#media-add-point').click();
    await page.locator('#media-finish-editing').click();await seek(7.6);
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>document.querySelector('#media-audio').ended && !s.isPlaying);
    assert(await page.evaluate(()=>s.trainer.sessionCompleted),'music ending exactly with the recording still finalizes');
    assert.deepEqual(errors,[]);
    console.log('PASS full recording intro/outro, boundary completion, no outside grading, Pause/Resume, seek reentry, recording end and loops.');
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
