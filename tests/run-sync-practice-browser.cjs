// Isolated native player + synthetic MIDI. No owner browser, storage or hardware.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');
function recording() {
  const data=Buffer.alloc(44+44100*2*12);
  data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
  data.writeUInt32LE(44100,24);data.writeUInt32LE(88200,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);
  data.write('data',36);data.writeUInt32LE(data.length-44,40);return data;
}
(async()=>{
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{
      const input={id:'sync-test',name:'Synthetic sync MIDI',type:'input',state:'connected',manufacturer:'Test',
        addEventListener(_,f){this.receive=f;},removeEventListener(){},close(){return Promise.resolve();}};
      window.sendSyncMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});
      Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack || e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="sync-test"]'));
    assert.equal(await page.locator('#media-layout').inputValue(),'left');
    await page.evaluate(()=>{const c=document.querySelector('#midi-input-select');c.value='sync-test';c.dispatchEvent(new Event('change'));});
    // Native bundled demo import; no generated fixture files.
    const fs=require('node:fs'),path=require('node:path');
    const demo=fs.readdirSync(path.join(__dirname,'../assets/demos')).find(file=>file.endsWith('.gp'));
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'../assets/demos',demo));
    await page.waitForFunction(async()=>{
      window.syncState=(await import('./js/app-state.js')).AppState;
      window.syncHost=await import('./js/alphatab-host.js');
      return syncState.playerReady && syncState.expectedEvents.length;
    });
    await page.waitForTimeout(700); // Selected-track native regeneration settles.
    const change=async(id,value)=>page.evaluate(({id,value})=>{const c=document.getElementById(id);if(typeof value==='boolean')c.checked=value;else c.value=value;c.dispatchEvent(new Event('change'));},{id,value});
    await change('practice-loop-end','1');await change('practice-loop-enabled',true);
    const restored=async()=>{
      await page.waitForFunction(()=>!syncState.media.editing && syncState.playerReady &&
        document.querySelectorAll('.loop-shading-overlay rect').length>0 && document.querySelector('.fretboard-marker-target'));
      const s=await page.evaluate(()=>({range:syncHost.getAlphaTabApi().playbackRange,loop:syncState.practiceLoop.range,
        tick:syncState.tickPosition,playing:syncState.isPlaying}));
      assert.deepEqual(s.range,s.loop);assert.equal(s.playing,false);
      assert(s.tick>=s.loop.startTick && s.tick<s.loop.endTick);
      assert.equal(await page.locator('#practice-loop-start').isDisabled(),false);
      assert.equal(await page.locator('#play-pause-button').textContent(),'▶ Play');
    };
    const grade=async()=>{
      // Clear raw held input between passes. Correct pitches remain pitch-only.
      await page.evaluate(()=>{for(const n of [...syncState.midi.activeNotes.values()])sendSyncMidi([0x80+n.channel-1,n.midi,0]);});
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(()=>syncState.isPlaying && !syncState.countInActive);
      await page.evaluate(()=>{for(const n of syncState.expectedEvents[0].notes)sendSyncMidi([0x90,n.midi,100]);});
      await page.waitForFunction(()=>syncState.trainer.results.correct>0);
      assert(await page.locator('.notation-feedback-overlay .target-notehead[data-state="correct"]').count()>0,'staff correct feedback');
      assert(await page.locator('.notation-feedback-overlay .tab-correct-highlight').count()>0,'active tab correct feedback');
      assert(await page.locator('.fretboard-marker-target[data-state="correct"]').count()>0,'fretboard correct feedback');
      await page.locator('#play-pause-button').click();
      await page.waitForFunction(()=>!syncState.isPlaying);
    };
    await restored();await grade();
    // Empty editor opens loading options; an attached recording reopens directly.
    await page.evaluate(()=>document.querySelector('[data-open-media-editor]').click());
    assert.equal(await page.locator('#media-popup').isVisible(),true);
    await page.keyboard.press('Escape');
    for(const returnToSynth of [true,false,true]) {
      await change('media-show-editor',true);
      assert.match(await page.locator('#media-action-status').textContent(),/Editing sync/,'reopening clears the finished-editing message');
      if(process.env.GTS_SCREENSHOT_DIR && returnToSynth)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'sync-preview-desktop.png'),fullPage:true});
      assert.equal(await page.locator('#play-pause-button').textContent(),'▶ Preview');
      assert.equal(await page.locator('#practice-loop-start').isDisabled(),true);
      assert.match(await page.locator('#loop-controls-status').textContent(),/Finish editing/);
      assert.equal(await page.locator('.loop-shading-overlay rect').count(),0);
      assert.equal(await page.locator('.fretboard-marker-target').count(),0);
      if(!(await page.evaluate(()=>syncState.media.preview))) {
        await page.locator('#media-file').setInputFiles({name:'sync-test.wav',mimeType:'audio/wav',buffer:recording()});
        await page.waitForFunction(()=>!document.querySelector('#media-listen').disabled);
        await page.waitForFunction(()=>syncState.media.preview && syncState.playerReady);
        assert.equal(await page.evaluate(()=>syncState.isPlaying),false,'loading selects recording without autoplay');
        await page.setViewportSize({width:1280,height:720});
        await page.locator('#media-point-time').fill('1.038');
        await page.locator('#media-point-time').dispatchEvent('input');
        await page.evaluate(()=>document.querySelector('#media-point-list').firstElementChild.click());
        assert.equal(await page.locator('#media-point-time').inputValue(),'1.038','score target selection preserves typed milliseconds');
        await page.locator('#media-add-point').click();
        await page.waitForFunction(()=>syncState.media.points[0].millisecondOffset===1038);
        await page.locator('#media-apply-time').click();
        assert.equal(await page.evaluate(()=>syncState.media.points[0].millisecondOffset),1038,'copying playhead does not save a point');
        await page.locator('#media-zoom-fit').click();await page.locator('#media-zoom-in').click();
        assert.equal(await page.locator('#media-timeline-zoom').textContent(),'120%');
        if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'sync-laptop.png'),fullPage:true});
        await page.evaluate(()=>{for(let i=0;i<35;i++)document.querySelector('#media-zoom-in').click();});
        await page.waitForTimeout(100);
        const extreme=await page.evaluate(()=>{
          const svg=document.querySelector('#media-timeline'),scroll=svg.parentElement;
          scroll.scrollLeft=(scroll.scrollWidth-scroll.clientWidth)/2;
          return {width:svg.getBoundingClientRect().width,viewport:scroll.clientWidth};
        });
        await page.waitForTimeout(100);
        assert(Math.abs(extreme.width-extreme.viewport)<1,'extreme zoom keeps SVG viewport-sized');
        const ruler=await page.locator('.media-ruler-label').allTextContents();
        assert(ruler.length>2 && ruler.length<25,'only visible ruler labels are drawn');
        assert.equal(new Set(ruler).size,ruler.length,'fine time labels remain distinct');
        assert(ruler.some(label=>/\.\d{3}$/.test(label)),'short recording supports millisecond ruler precision');
        const expected=await page.evaluate(()=>{
          const svg=document.querySelector('#media-timeline'),box=svg.viewBox.baseVal;
          return (box.x+box.width*0.6)/1000*document.querySelector('#media-audio').duration;
        });
        const box=await page.locator('#media-timeline').boundingBox();
        await page.mouse.click(box.x+box.width*0.6,box.y+55);
        await page.waitForFunction(time=>Math.abs(Number(document.querySelector('#media-point-time').value)-time)<0.002,expected);
        if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'sync-extreme-zoom.png'),fullPage:true});
        await page.locator('#media-add-point').click();
        const beforeDrag=await page.evaluate(()=>syncState.media.points[0].millisecondOffset);
        const anchor=await page.locator('#media-timeline [data-point="0"] path').boundingBox();
        await page.mouse.move(anchor.x+anchor.width/2,anchor.y+4);await page.mouse.down();
        await page.mouse.move(anchor.x+anchor.width/2+80,anchor.y+4,{steps:5});await page.mouse.up();
        const afterDrag=await page.evaluate(()=>syncState.media.points[0].millisecondOffset);
        assert(Math.abs(afterDrag-beforeDrag-80/(box.width*256)*1024/1000*12000)<1,'drag uses full recording width at extreme zoom');
        await page.locator('#media-zoom-fit').click();
        await page.locator('#media-close-editor').click();
        await page.evaluate(()=>document.querySelector('[data-open-media-editor]').click());
        assert.equal(await page.locator('#media-popup').isVisible(),false,'loaded editor reopens without load menu');
        // Restore initial alignment for the existing first-note grading checks.
        await page.locator('#media-point-time').fill('0');await page.locator('#media-add-point').click();
        await page.waitForFunction(()=>syncState.media.points[0].millisecondOffset===0);
        await page.setViewportSize({width:1440,height:1000});
      }
      await page.evaluate(()=>{document.querySelector('#media-point-list').lastElementChild.click();document.querySelector('#media-point-time').value='10';document.querySelector('#media-add-point').click();});
      await page.waitForFunction(()=>syncState.media.points.at(-1).millisecondOffset===10000);
      if(returnToSynth) {
        await page.evaluate(()=>document.querySelector('#media-practice').click());
        await page.waitForFunction(()=>!syncState.media.preview && syncState.playerReady);
        assert(await page.evaluate(()=>syncState.media.editing),'source switch retains editing');
        assert.equal(await page.locator('#play-pause-button').textContent(),'▶ Preview');
      }
      const points=await page.locator('#media-point-list').textContent();
      await page.locator('#media-finish-editing').click();await restored();
      assert.equal(await page.evaluate(()=>syncState.media.preview),!returnToSynth,'finish preserves selected source');
      assert.equal(await page.locator('#media-point-list').textContent(),points,'alignment retained');
      await grade();
      console.log(`PASS editor exit: ${returnToSynth?'Synth':'Recording'}; cursor, loop shading, targets and synthetic MIDI feedback restored`);
    }
    // Wait still requires MIDI after leaving editing; the recording stays silent.
    await page.evaluate(()=>{const c=document.querySelector('input[name="practice-mode"][value="wait"]');c.checked=true;c.dispatchEvent(new Event('change'));});
    await change('media-show-editor',true);
    await page.evaluate(()=>document.querySelector('#media-listen').click());
    await page.waitForFunction(()=>syncState.media.preview && syncState.playerReady);
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>syncState.isPlaying);
    await page.waitForFunction(()=>!document.querySelector('#media-audio').paused && document.querySelector('#media-audio').currentTime>0.1);
    await page.locator('#media-finish-editing').click();await restored();
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(()=>syncState.waitTrainer.active && syncState.waitTrainer.phase==='waiting');
    assert(await page.evaluate(()=>document.querySelector('#media-audio').paused && document.querySelector('#media-audio').muted),'Wait recording stays paused and muted');
    const event=await page.evaluate(()=>syncState.waitTrainer.currentEvent.id);
    await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>syncState.waitTrainer.currentEvent.id),event);
    await page.evaluate(()=>{for(const n of [...syncState.midi.activeNotes.values()])sendSyncMidi([0x80+n.channel-1,n.midi,0]);for(const n of syncState.waitTrainer.currentEvent.notes)sendSyncMidi([0x90,n.midi,100]);});
    await page.waitForFunction(id=>syncState.waitTrainer.currentEvent.id!==id,event);
    await page.evaluate(()=>document.querySelector('#stop-button').click());
    // Saved placements remain valid, including Above, and editor exit persists.
    await change('media-layout','above');await page.reload();await page.locator('#fretboard-content svg').waitFor();
    assert.equal(await page.locator('#media-layout').inputValue(),'above');
    assert.equal(await page.locator('#media-editor').isVisible(),false);
    await change('media-layout','right');await page.reload();await page.locator('#fretboard-content svg').waitFor();
    assert.equal(await page.locator('#media-layout').inputValue(),'right');
    // Review Preview + Finish action at phone width without page overflow.
    await page.setViewportSize({width:390,height:844});await change('media-show-editor',true);
    assert(await page.locator('#media-finish-editing').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'sync-preview-phone.png'),fullPage:true});
    await page.locator('#media-close-editor').click();
    assert.equal(await page.locator('#media-editor').isVisible(),false);
    assert.equal(await page.locator('#play-pause-button').textContent(),'▶ Play');
    assert.deepEqual(errors,[]);
    console.log('PASS first-use Left, saved Above/Right, closed-editor persistence, Wait gates and phone layout');
    await context.close();
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
