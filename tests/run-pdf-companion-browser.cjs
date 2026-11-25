// Run with Node and Playwright. Both input files are generated in memory.
const {chromium} = require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const {createAppServer} = require('../local-web-server.cjs');

function twoBarMidi() {
  const track = [];
  for (const pitch of [60,62,64,65,67,69,71,72]) {
    track.push(0, 0x90, pitch, 96, 96, 0x80, pitch, 0);
  }
  track.push(0, 0xff, 0x2f, 0);
  return Buffer.concat([Buffer.from('MThd'), Buffer.from([0,0,0,6,0,0,0,1,0,96]),
    Buffer.from('MTrk'), Buffer.from([0,0,0,track.length]), Buffer.from(track)]);
}

(async () => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel:process.env.GTS_BROWSER_CHANNEL || 'chrome', headless:true});
    const page = await browser.newPage();
    const staff='<svg width="600" height="90"><path d="M10 20h560 M10 28h560 M10 36h560 M10 44h560 M10 52h560 M10 20v32 M570 20v32" fill="none" stroke="black"/></svg>';
    await page.setContent('<div>'+staff+'</div><div style="break-before:page">'+staff+'</div>');
    const pdf = {name:'exercise.pdf', mimeType:'application/pdf', buffer:await page.pdf()};
    const midi = {name:'exercise.mid', mimeType:'audio/midi', buffer:twoBarMidi()};
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(async () => {window.practiceState = (await import('/js/app-state.js')).AppState;});
    await page.waitForFunction(() => practiceState.ui.playerStatus.includes('Choose'));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const loadPair = async (name=midi.name) => {
      await page.locator('#score-file-input').setInputFiles({...midi,name});
      await page.waitForFunction(() => practiceState.playerReady && !document.querySelector('#pdf-attach').disabled);
      const loaded = await page.evaluate(() => ({
        bars:practiceState.playbackTimeline.measures.length, pitches:practiceState.expectedEvents.map(e => e.pitches[0]),
        bytes:practiceState.currentScoreFile.bytes.length
      }));
      assert.deepEqual(loaded, {bars:2, pitches:[60,62,64,65,67,69,71,72], bytes:midi.buffer.length});
      await page.locator('#pdf-file').setInputFiles(pdf);
      await page.waitForFunction(() => !document.querySelector('#pdf-view').hidden && document.querySelector('.pdf-reading-page canvas'));
    };
    await loadPair();
    assert.equal(await page.locator('#pdf-page option').count(), 2);
    for (const pageNumber of [1,2]) {
      if(pageNumber===2) {
        await page.locator('#pdf-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
        await page.waitForFunction(()=>document.querySelector('#pdf-sheet').parentElement.dataset.page==='2');
        await page.locator('#pdf-page').selectOption('2');
      }
      if(pageNumber===2) {
        await page.locator('#pdf-find').click();
        await page.locator('#pdf-use-score').waitFor();
        assert.equal(await page.locator('#pdf-page').inputValue(),'1');
        await page.locator('#pdf-cancel').click();
        await page.locator('#pdf-page').selectOption('2');
        await page.locator('#pdf-find-page').click();
        await page.locator('#pdf-use').waitFor();
        const proposed=page.locator('#pdf-boxes .pdf-box');
        assert.equal(await proposed.count(),1);
        await page.locator('#pdf-action').selectOption('split');
        const box=await proposed.first().boundingBox();
        await page.mouse.click(box.x+box.width/2, box.y+box.height/2);
        assert.equal(await proposed.count(),2);
        assert.equal(await page.locator('#pdf-use').isDisabled(),true);
        await page.locator('#pdf-action').selectOption('join');
        await page.mouse.click(box.x+box.width/4, box.y+box.height/2);
        assert.equal(await proposed.count(),1);
        await page.locator('#pdf-use').click();
        continue;
      }
      const rect = await page.locator('#pdf-sheet').boundingBox();
      await page.mouse.move(rect.x + 20, rect.y + 25);
      await page.mouse.down(); await page.mouse.move(rect.x + 180, rect.y + 80); await page.mouse.up();
    }
    await page.locator('#pdf-map').click();
    assert.equal(await page.locator('#pdf-page').inputValue(), '1');
    await page.locator('#pdf-native').click();
    assert.ok(await page.locator('#pdf-return').isVisible());
    await page.locator('#pdf-return').click();
    assert.ok(await page.locator('#pdf-view').isVisible());
    const resetButton=page.locator('#stop-button'), pageSelect=page.locator('#pdf-page');
    const waitForResetBox=number=>page.waitForFunction(number=>{
      const box=document.querySelector('#pdf-pages .current'),rect=box?.getBoundingClientRect();
      const frame=document.querySelector('#pdf-scroll').getBoundingClientRect();
      return box?.dataset.measure===String(number) && rect.top>=frame.top && rect.bottom<=frame.bottom &&
        !practiceState.isPlaying;
    },number);
    // Browse away while already at the reset destination, first without a loop and then with one.
    await pageSelect.selectOption('2');
    await resetButton.click();await waitForResetBox(1);
    await page.locator('#practice-loop-enabled').evaluate(el=>el.click());
    await page.locator('#practice-loop-start').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('change'));});
    await resetButton.click();await waitForResetBox(2);
    await pageSelect.selectOption('1');
    await resetButton.click();await waitForResetBox(2);
    // Restore the default loop bounds for the later controls checks.
    await page.locator('#practice-loop-start').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('change'));});
    await page.locator('#practice-loop-enabled').evaluate(el=>el.click());
    await page.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    const missingVisit=await page.evaluate(()=>{
      const timeline=practiceState.playbackTimeline,media=practiceState.media;
      const first=document.querySelector('#pdf-pages [data-measure="1"]'),status=document.querySelector('#pdf-status');
      try {
        practiceState.playbackTimeline={...timeline,measures:timeline.measures.filter(v=>v.measureNumber!==1)};
        first.click();const synth=status.textContent;
        practiceState.media={...media,preview:true};
        first.click();return [synth,status.textContent];
      } finally {practiceState.playbackTimeline=timeline;practiceState.media=media;}
    });
    assert.deepEqual(missingVisit,['This printed measure isn’t linked to a score measure.','This measure has no timing in the active recording.']);
    await page.getByRole('button',{name:'Go to measure 1',exact:true}).click();
    await waitForResetBox(1);
    const scroll=page.locator('#pdf-scroll');
    await page.evaluate(()=>{practiceState.ui.autoScroll=false;});
    await scroll.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await page.waitForFunction(()=>document.querySelector('#pdf-page').value==='2');
    await page.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    await scroll.evaluate(el=>{el.scrollTop=0;});
    await page.waitForFunction(()=>document.querySelector('#pdf-page').value==='1');
    assert.equal(await page.locator('#pdf-pages .current').getAttribute('data-measure'),'2');
    await page.getByRole('button',{name:'Go to measure 1',exact:true}).click();
    await page.evaluate(()=>{practiceState.ui.autoScroll=true;});
    await page.locator('#play-pause-button').click();
    await page.waitForFunction(() => document.querySelector('#pdf-page').value === '2' && document.querySelector('#pdf-pages .current'));
    await page.locator('#play-pause-button').click();
    await loadPair();
    assert.equal(await page.locator('#pdf-map').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#pdf-pages .current').count(), 1);
    await page.locator('#pdf-page').selectOption('2');
    await page.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    await page.waitForFunction(()=>Math.abs(practiceState.tickPosition-practiceState.playbackTimeline.measures[1].startTick)<=1);
    await page.locator('#pdf-note').selectOption({index:2});
    await page.waitForFunction(()=>Math.abs(practiceState.tickPosition-practiceState.expectedEvents[5].startTick)<=1 && !practiceState.isPlaying);
    await page.locator('#practice-loop-enabled').evaluate(el=>el.click());
    await page.locator('#practice-loop-end').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('change'));});
    await page.locator('#pdf-page').selectOption('2');
    await page.locator('button.outside-loop').waitFor();
    await page.locator('#practice-loop-enabled').evaluate(el=>el.click());
    assert.equal(await page.locator('button.outside-loop').count(),0);
    // Re-scan page one with two proposed boxes. Measure two initially
    // belongs to page two, so a replacement must protect that assignment.
    await page.locator('#pdf-map').click();
    await page.locator('#pdf-page').selectOption('1');
    // Keep a hand-drawn first bar and recover a missing second page in one scan.
    await page.locator('#pdf-measure').selectOption('2');
    await page.locator('#pdf-remove').click();
    const savedBoxes=()=>page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('gts.pdf.v1.')))));
    const manual=(await savedBoxes())[1];
    await page.locator('#pdf-find').click();
    await page.locator('#pdf-use-score').click();
    assert.deepEqual((await savedBoxes())[1],manual);
    assert.equal((await savedBoxes())[2].page,2);
    assert.equal(await page.locator('#pdf-pages button[data-measure]').count(),2);
    await page.locator('#pdf-map').click();
    await page.locator('#pdf-find').click();
    await page.locator('#pdf-use').click();
    assert.equal(await page.locator('#pdf-page').inputValue(),'2');
    assert.equal(await page.locator('#pdf-measure').inputValue(),'2');
    await page.locator('#pdf-cancel').click();
    await page.locator('#pdf-page').selectOption('1');
    const splitFirstPage=async()=>{
      await page.locator('#pdf-find-page').click();
      await page.locator('#pdf-use').waitFor();
      const rect=await page.locator('#pdf-boxes .pdf-box').first().boundingBox();
      await page.locator('#pdf-action').selectOption('split');
      await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
      await page.locator('#pdf-action').selectOption('draw');
      await page.locator('#pdf-replace').check();
    };
    await splitFirstPage();
    assert.ok(await page.locator('#pdf-use').isDisabled());
    await page.locator('#pdf-cancel').click();
    await page.locator('#pdf-measure').selectOption('2');
    await page.locator('#pdf-remove').click();
    await page.locator('#pdf-page').selectOption('1');
    await splitFirstPage();
    const handle=page.getByRole('slider',{name:'Move barline before measure 2'});
    await handle.focus();
    const initial=Number(await handle.getAttribute('aria-valuenow'));
    await handle.press('ArrowRight');
    assert.ok(Number(await handle.getAttribute('aria-valuenow'))>initial);
    await page.locator('#pdf-use').click();
    const pos=await handle.boundingBox();
    await page.mouse.move(pos.x+pos.width/2,pos.y+pos.height/2);await page.mouse.down();
    await page.mouse.move(pos.x+1500,pos.y);await page.mouse.up();
    assert.equal(await handle.getAttribute('aria-valuenow'),await handle.getAttribute('aria-valuemax'));
    const maximum=await handle.getAttribute('aria-valuenow');
    await loadPair('exercise.midi');await page.locator('#pdf-map').click();
    assert.equal(await handle.getAttribute('aria-valuenow'),maximum);
    // Supply a real cloneable browser file handle through the picker. The
    // isolated test can remove this WAV without touching the user's files.
    await page.evaluate(async()=>{
      const directory=await navigator.storage.getDirectory();
      window.makeRecording=async()=>{
        const handle=await directory.getFileHandle('practice.wav',{create:true});
        const bytes=new Uint8Array(44+8000*2*6),v=new DataView(bytes.buffer);
        const tag=(offset,s)=>bytes.set(new TextEncoder().encode(s),offset);
        tag(0,'RIFF');v.setUint32(4,bytes.length-8,true);tag(8,'WAVE');tag(12,'fmt ');
        v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
        v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
        tag(36,'data');v.setUint32(40,bytes.length-44,true);
        const writer=await handle.createWritable();await writer.write(bytes);await writer.close();return handle;
      };
      const picked=await makeRecording();window.showOpenFilePicker=async()=>[picked];
      document.querySelector('#media-choose-file').click();
    });
    await page.waitForFunction(()=>!document.querySelector('#media-save-profile').disabled);
    await page.locator('#media-save-profile').evaluate(el=>el.click());
    await page.waitForFunction(()=>document.querySelector('#media-status').textContent.includes('Sync profile saved'));
    await page.locator('#btn-scores').click();
    await page.locator('#library-save').click();
    await page.locator('.library-score-open').waitFor();
    await page.keyboard.press('Escape');
    // A subsequent box correction must be in the portable backup too.
    await handle.focus();await handle.press('ArrowLeft');
    const backup=await page.evaluate(async()=>new (await import('/js/library-store.js')).LibraryStore().backup());
    assert.equal(backup.version,4);assert.equal(backup.pdfs.length,1);
    assert.equal(backup.pdfs[0].data,pdf.buffer.toString('base64'));
    assert.deepEqual(backup.scores[0].pdf.boxes,await savedBoxes());
    assert.equal(backup.scores[0].recording.fileName,'practice.wav');
    assert.equal(Object.hasOwn(backup.scores[0],'recordingHandle'),false);
    const openSaved=async()=>{
      await page.reload();await page.locator('#btn-scores').click();await page.locator('.library-score-open').click();
      await page.locator('#pdf-pages button[data-measure="2"]').waitFor();
    };
    await openSaved();
    await page.waitForFunction(()=>document.querySelector('#media-status').textContent.includes('Saved alignment restored'));
    const wav=await page.evaluate(async()=>{
      const dir=await navigator.storage.getDirectory(),file=await (await dir.getFileHandle('practice.wav')).getFile();
      const bytes=Array.from(new Uint8Array(await file.arrayBuffer()));
      await dir.removeEntry(file.name);return bytes;
    });
    await openSaved();
    await page.locator('#media-reconnect').waitFor();
    assert.deepEqual(await page.evaluate(async()=>new (await import('/js/library-store.js')).LibraryStore().listProfiles()),backup.mediaProfiles);
    // Import into an empty browser. Its old handles and local markup cache are absent.
    const fresh=await browser.newPage();await fresh.goto(page.url());
    await fresh.evaluate(async backup=>new (await import('/js/library-store.js')).LibraryStore().merge(backup),backup);
    await fresh.reload();await fresh.locator('#btn-scores').click();await fresh.locator('.library-score-open').click();
    await fresh.locator('#pdf-pages button[data-measure="2"]').waitFor();
    await fresh.locator('#media-reconnect').waitFor();
    await fresh.evaluate(async bytes=>{
      const dir=await navigator.storage.getDirectory(),picked=await dir.getFileHandle('practice.wav',{create:true});
      const writer=await picked.createWritable();await writer.write(Uint8Array.from(bytes));await writer.close();
      window.showOpenFilePicker=async()=>[picked];
    },wav);
    await fresh.locator('#media-reconnect').click();
    await fresh.waitForFunction(()=>document.querySelector('#media-status').textContent.includes('Saved alignment restored'));
    const profiles=await fresh.evaluate(async()=>new (await import('/js/library-store.js')).LibraryStore().listProfiles());
    assert.deepEqual(profiles[0].points,backup.mediaProfiles[0].points);
    const counts=await fresh.evaluate(async backup=>{
      const store=new (await import('/js/library-store.js')).LibraryStore();
      const [original]=(await store.list()).scores;
      const input={title:'Second score',fileName:'second.gp',bytes:new Uint8Array([1,2])};
      const {pdf}=await store.attachments(original.id);
      const {score:other}=await store.save(input,{pdf:{hash:pdf.hash,file:new File([pdf.blob],pdf.fileName),boxes:{}}});
      const count=()=>store.transaction(['pdfs'],'readonly',({pdfs},done)=>{pdfs.count().onsuccess=e=>done(e.target.result);});
      const values=[await count(),(await store.backup()).pdfs.length];
      await store.deleteScore(original.id);values.push(await count());
      await store.deleteScore(other.id);values.push(await count());
      await store.merge({...backup,version:2,scores:backup.scores.map(({pdf,recording,...s})=>s)});
      await store.merge(backup);
      const [restored]=(await store.list()).scores;
      values.push((await store.attachments(restored.id)).pdf.blob.size);
      return values;
    },backup);
    assert.deepEqual(counts,[1,1,1,0,pdf.buffer.length]);
    await fresh.close();
    assert.deepEqual(errors, []);
    console.log('Passed MIDI/PDF practice, library reopen, shared PDF storage, backup merge and missing recording reconnection with original sync points.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
