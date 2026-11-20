// Installed Chrome, isolated profile, bundled score and generated WAV only.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createAppServer}=require('../local-web-server.cjs');

function wav() {
  const b=Buffer.alloc(44+44100*2*12);
  b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
  b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;
}

(async()=>{
  const server=createAppServer();let browser;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.stack || e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#score-file-input').setInputFiles(path.join(__dirname,'../assets/demos/first-notes.gp'));
    await page.waitForFunction(async()=>{
      window.syncGroupState=(await import('./js/app-state.js')).AppState;
      return syncGroupState.playerReady && syncGroupState.playbackTimeline?.measures.length===4;
    });
    const change=(id,value)=>page.evaluate(({id,value})=>{
      const node=document.getElementById(id);
      if(typeof value==='boolean')node.checked=value;else node.value=String(value);
      node.dispatchEvent(new Event('change',{bubbles:true}));
    },{id,value});
    await change('media-show-editor',true);
    await page.locator('#media-file').setInputFiles({name:'group-alignment.wav',mimeType:'audio/wav',buffer:wav()});
    await page.waitForFunction(()=>syncGroupState.media.preview && syncGroupState.playerReady && !document.querySelector('#media-add-point').disabled);
    await page.locator('#media-zoom-fit').click();
    const times=()=>page.evaluate(()=>syncGroupState.media.points.map(p=>p.millisecondOffset));
    const expectTimes=async(expected,label)=>assert.deepEqual(await times(),expected,label);
    const select=async index=>{
      await page.locator(`#media-timeline [data-point="${index}"] rect`).click();
      await page.waitForFunction(index=>document.querySelector(`#media-timeline [data-point="${index}"].is-selected`),index);
    };
    const setTime=async value=>{
      await page.locator('#media-point-time').fill(String(value));await page.locator('#media-add-point').click();
    };
    // Build five anchors through the user controls, keeping recording margins.
    await select(0);await setTime(1);
    await select(1);await setTime(11);
    for(const [measure,time] of [[1,3],[2,5],[3,7]]) {
      await change('media-measure',measure);await change('media-beat',1);await setTime(time);
    }
    const base=[1000,3000,5000,7000,11000];await expectTimes(base,'fixture anchors');
    assert.equal(await page.locator('#media-move-scope').inputValue(),'point','single-point editing is the initial mode');

    // Existing one-point nudges and keyboard precision remain intact.
    await select(2);await page.locator('#media-nudge-right').click();
    await expectTimes([1000,3000,5050,7000,11000],'default nudge changes one point');
    await page.locator('#media-undo').click();await expectTimes(base,'single-point undo');

    const undoRoundTrip=async(before,after,label)=>{
      await page.locator('#media-undo').click();await expectTimes(before,`${label}: one undo restores the whole operation`);
      await page.locator('#media-redo').click();await expectTimes(after,`${label}: one redo restores the whole operation`);
      await page.locator('#media-undo').click();await expectTimes(before,`${label}: return to fixture`);
    };
    await change('media-move-scope','all');await select(2);
    await page.locator('#media-nudge-right').click();
    const allNudged=base.map(t=>t+50);await expectTimes(allNudged,'All shifts every anchor by 50 ms');
    await undoRoundTrip(base,allNudged,'all nudge');
    await select(2);await page.locator('#media-timeline').focus();await page.keyboard.press('ArrowRight');
    await expectTimes(base.map(t=>t+10),'All keyboard movement keeps 10 ms precision');
    await page.keyboard.press('Shift+ArrowLeft');
    await expectTimes(base.map(t=>t-90),'All Shift+arrow keeps 100 ms precision');
    await page.locator('#media-undo').click();await page.locator('#media-undo').click();await expectTimes(base,'keyboard undo operations');

    // Real captured mouse movement; the requested delta can exceed the bounds.
    const drag=async(index,deltaMs,{cancel=false,during=null}={})=>{
      await page.locator('#media-zoom-fit').click();
      const marker=await page.locator(`#media-timeline [data-point="${index}"] rect`).boundingBox();
      const timeline=await page.locator('#media-timeline').boundingBox();
      const x=marker.x+marker.width/2,y=marker.y+8;
      await page.evaluate(()=>document.querySelector('#media-timeline').addEventListener('pointerdown',e=>{window.syncGroupPointer=e.pointerId;},{once:true}));
      await page.mouse.move(x,y);await page.mouse.down();
      await page.mouse.move(x+deltaMs/12000*timeline.width*1000/1024,y,{steps:8});
      if(during)await during();
      if(cancel)await page.evaluate(()=>document.querySelector('#media-timeline').dispatchEvent(new PointerEvent('pointercancel',{pointerId:syncGroupPointer,bubbles:true})));
      await page.mouse.up();
    };
    await drag(2,3000,{during:async()=>{
      assert(await page.locator('#media-undo').isDisabled(),'Undo is disabled during captured dragging');
      assert(await page.locator('#media-redo').isDisabled(),'Redo is disabled during captured dragging');
      for(const id of ['media-undo','media-redo']) {
        await page.locator(`#${id}`).dispatchEvent('click');
        await expectTimes(base,`forced ${id} event cannot change points during a drag preview`);
      }
    }});const upperAll=base.map(t=>t+1000);
    await expectTimes(upperAll,'All clamps at recording end without stretching its spacing');
    await undoRoundTrip(base,upperAll,'all upper clamp');
    await drag(2,-6000);const lowerAll=base.map(t=>t-1000);
    await expectTimes(lowerAll,'All clamps at recording zero');
    await undoRoundTrip(base,lowerAll,'all lower clamp');

    await change('media-move-scope','section');
    const endpointLabels=await page.locator('#media-section-first option').allTextContents();
    assert.match(endpointLabels[0],/Start/i);assert.match(endpointLabels.at(-1),/End/i);
    await change('media-section-first',1);await change('media-section-last',3);
    assert.equal(await page.locator('#media-timeline [data-point="1"].is-selected').count(),1,'changing section endpoints selects its first anchor');
    await page.locator('#media-nudge-right').click();
    const sectionNudged=[1000,3050,5050,7050,11000];
    await expectTimes(sectionNudged,'Section moves all included anchors and keeps outside anchors fixed');
    await undoRoundTrip(base,sectionNudged,'section nudge');

    await select(0);
    await page.waitForFunction(()=>Math.abs(document.querySelector('#media-audio').currentTime-1)<0.02);
    await expectTimes(base,'outside-section ordinary click still seeks without editing');
    assert(await page.locator('#media-nudge-right').isDisabled(),'outside-section focus cannot nudge the group');
    await drag(0,2000);await expectTimes(base,'outside-section marker cannot drag the group');
    await select(2);await drag(2,6000);
    const upperSection=[1000,6999,8999,10999,11000];
    await expectTimes(upperSection,'Section stops one millisecond before its next fixed neighbor');
    await undoRoundTrip(base,upperSection,'section upper clamp');
    await select(2);await drag(2,-4000);
    const lowerSection=[1000,1001,3001,5001,11000];
    await expectTimes(lowerSection,'Section stops one millisecond after its previous fixed neighbor');
    await undoRoundTrip(base,lowerSection,'section lower clamp');

    // Start and End are selectable section endpoints, not special excluded anchors.
    await change('media-section-first',0);await change('media-section-last',4);
    await page.locator('#media-nudge-left').click();
    await expectTimes(base.map(t=>t-50),'Section Start–End includes both boundary anchors');
    await page.locator('#media-undo').click();await expectTimes(base,'full section undo');
    await change('media-section-first',1);await change('media-section-last',3);
    const beforeCancel=await page.evaluate(()=>({time:document.querySelector('#media-point-time').value,
      transforms:[...document.querySelectorAll('#media-timeline [data-point]')].map(node=>node.getAttribute('transform'))}));
    await drag(2,1000,{cancel:true});await expectTimes(base,'pointer cancellation leaves every anchor unchanged');
    assert.deepEqual(await page.evaluate(()=>({time:document.querySelector('#media-point-time').value,
      transforms:[...document.querySelectorAll('#media-timeline [data-point]')].map(node=>node.getAttribute('transform'))})),beforeCancel,
    'pointer cancellation restores the displayed group positions and selected recording time');
    await select(2);await page.locator('#media-nudge-right').click();
    await page.locator('#media-undo').click();await expectTimes(base,'cancelled preview does not add an undo entry');

    await change('media-move-scope','stretch');
    await page.locator('#media-nudge-right').click();
    await undoRoundTrip(base,[1000,3050,5025,7000,11000],'stretch nudge around fixed last point');
    await select(3);
    assert(await page.locator('#media-nudge-right').isDisabled(),'last marker stays pinned');
    await drag(2,1000);await expectTimes(base,'interior marker is not a stretch handle');
    await drag(1,1000,{cancel:true});await expectTimes(base,'cancel discards the stretch preview');
    await drag(1,-4000);
    await undoRoundTrip(base,[1000,1001,4000.5,7000,11000],'stretch drag stops at previous marker');

    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'sync-group-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.locator('#media-move-scope').isVisible());
    assert(await page.locator('#media-section-first').isVisible());
    assert(await page.locator('#media-section-last').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone layout has no page overflow');
    for(const id of ['media-move-scope','media-section-first','media-section-last']) {
      const box=await page.locator(`#${id}`).boundingBox();
      assert(box.x>=-1 && box.x+box.width<=391,`${id} fits phone width`);
    }
    await page.locator('#media-section-last').scrollIntoViewIfNeeded();
    if(process.env.GTS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'sync-group-phone.png'),fullPage:true});

    // A source replacement invalidates captured coordinates, points and listeners.
    await page.setViewportSize({width:1440,height:1000});
    await change('media-move-scope','all');await select(2);
    await drag(2,1000,{during:async()=>{
      assert(await page.evaluate(()=>document.querySelector('#media-timeline').hasPointerCapture(syncGroupPointer)),'test holds native pointer capture');
      await page.locator('#media-file').setInputFiles({name:'replacement-group-alignment.wav',mimeType:'audio/wav',buffer:wav()});
      await page.waitForFunction(()=>syncGroupState.playerReady && syncGroupState.media.preview &&
        syncGroupState.media.points.length===2 && !document.querySelector('#media-move-scope').disabled &&
        document.querySelector('#media-recording-label').textContent.includes('replacement-group-alignment.wav'));
      assert.equal(await page.evaluate(()=>document.querySelector('#media-timeline').hasPointerCapture(syncGroupPointer)),false,'source disposal releases pointer capture');
    }});
    await expectTimes([0,12000],'releasing old drag cannot commit its points into the replacement recording');
    assert.equal(await page.locator('#media-move-scope').inputValue(),'point','new source restores single-point movement');
    assert.equal(await page.locator('#media-timeline [data-point]').count(),2,'new source renders only its default anchors');
    assert(!(await page.locator('#media-move-scope').isDisabled()),'movement controls recover after source replacement');
    assert(!(await page.locator('#media-add-point').isDisabled()),'editing controls recover after source replacement');
    assert(await page.locator('#media-undo').isDisabled(),'new source has no stale drag undo entry');
    assert(await page.locator('#media-redo').isDisabled(),'new source has no stale redo entry');
    await select(0);await page.locator('#media-nudge-right').click();
    await expectTimes([50,12000],'new source remains editable after old pointer release');
    assert.deepEqual(errors,[]);
    console.log('PASS native sync group controls: point/All/Section movement, fixed spacing/neighbors, bounds, undo/redo, cancellation, drag/source lifecycle and phone layout.');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
