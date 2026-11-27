// Pass local PDF and media paths to exercise a real pair. Default inputs are generated.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');

function audioFixture(starts=[1.36,4.3,7.98],name='exercise.wav',duration=1/3) {
  const rate=8000, size=rate*12*2, data=Buffer.alloc(44+size);
  data.write('RIFF');data.writeUInt32LE(36+size,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
  data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);
  data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(size,40);
  for(const start of starts)for(let i=0;i<rate*duration;i++){
    const sample=Math.round(20000*Math.sin(2*Math.PI*130*i/rate)*Math.exp(-6*i/(rate*duration)));
    data.writeInt16LE(sample,44+2*(Math.round(start*rate)+i));
  }
  return {name,mimeType:'audio/wav',buffer:data};
}
(async()=>{
  const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let [, ,pdf,recording]=process.argv;
    if(!pdf) {
      await page.setContent('<svg width="600" height="100"><path d="M10 20h560 M10 28h560 M10 36h560 M10 44h560 M10 52h560 M10 20v32 M120 20v32 M230 20v32 M340 20v32 M450 20v32 M570 20v32" fill="none" stroke="black"/></svg>');
      pdf={name:'exercise.pdf',mimeType:'application/pdf',buffer:await page.pdf()};recording=audioFixture();
    }
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(()=>localStorage.setItem('gts.displayPreferences',JSON.stringify({ui:{autoScroll:false}})));
    await page.waitForFunction(()=>!document.getElementById('btn-scores').disabled && document.querySelector('#pdf-map'));
    const accept=await page.locator('#score-file-input').getAttribute('accept');
    for(const ext of ['.mid','.midi','.pdf'])assert.ok(accept.split(',').includes(ext));
    const room=page.frameLocator('#pdf-recording-room iframe');
    async function open() {
      await page.locator('#score-file-input').setInputFiles(pdf);
      await room.locator('button[data-measure="1"]').waitFor();
      await room.locator('#recording-file').setInputFiles(recording);
      await room.locator('#tap:enabled').waitFor();
    }
    await open();
    const player=room.locator('#recording');
    const seek=t=>player.evaluate((v,t)=>new Promise(resolve=>{
      v.addEventListener('seeked',resolve,{once:true});v.currentTime=t;
    }),t);
    async function tap(n,t) {
      await seek(t);await room.locator('#tap-measure').selectOption(String(n));await room.locator('#tap').click();
    }
    const measures=await room.locator('#tap-measure option').count();
    assert.equal(await room.locator('.tap-cue').getAttribute('data-measure'),'1');
    console.log('Pages',await room.locator('#pdf-page option').count(),'measure boxes',measures,'duration',await player.evaluate(v=>v.duration));
    assert.ok(measures>=3);
    if(await room.locator('.pdf-reading-page').count()>1) {
      const scroll=room.locator('#pdf-scroll');
      const later=Number(await room.locator('.pdf-reading-page[data-page="2"] button').first().getAttribute('data-measure'));
      await room.locator('#tap-measure').selectOption(String(later));
      assert.equal(await scroll.evaluate(el=>el.scrollTop),0);
      await scroll.evaluate(el=>el.scrollTop=el.scrollHeight);
      await room.locator('#tap-measure').selectOption('1');
      assert.ok(await scroll.evaluate(el=>el.scrollTop>el.clientHeight));
      await page.evaluate(()=>localStorage.setItem('gts.displayPreferences',JSON.stringify({ui:{autoScroll:true}})));
      await room.locator('#tap-measure').selectOption(String(later));
      await room.locator('#tap-measure').selectOption('1');
      await room.locator('.tap-cue').evaluate(box=>{
        const frame=document.getElementById('pdf-scroll').getBoundingClientRect(), rect=box.getBoundingClientRect();
        if(rect.top<frame.top-1 || rect.bottom>frame.bottom+1)throw Error('Selected measure stayed offscreen');
      });
    }
    await tap(1,1.36);await tap(3,7.98);await seek(4.70);
    assert.equal(await room.locator('#following').textContent(),'Measure 2');
    assert.equal(await room.locator('.pdf-box.current').getAttribute('data-measure'),'2');
    await room.locator('#audio-review summary').click();
    await room.locator('#audio-find').click();await room.locator('#keep-audio:enabled').waitFor();
    assert.match(await room.locator('#audio-measure').innerText(),/Keep even spacing/);
    assert.ok(await room.locator('#use-suggested').isHidden());
    const before=await room.locator('#anchors').innerText();
    await room.locator('#hear-audio').click();
    await player.evaluate(v=>v.pause());
    await room.locator('#keep-audio').click();
    assert.equal(await room.locator('#anchors').innerText(),before);
    await room.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    const refined=await player.evaluate(v=>v.currentTime);
    if(!process.argv[2])assert.ok(Math.abs(refined-4.3)<.08);
    await page.getByRole('button',{name:'Close PDF practice'}).click();await open();
    await room.locator('#audio-review summary').click();await room.locator('#restore-even').waitFor();
    await room.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    assert.ok(Math.abs(await player.evaluate(v=>v.currentTime)-refined)<.02);
    await room.locator('#restore-even').click();
    await room.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    assert.ok(Math.abs(await player.evaluate(v=>v.currentTime)-4.67)<.02);
    await tap(2,4.75);
    await room.getByText('Adjust taps and mark breaks',{exact:true}).click();
    await room.locator('#seconds').fill('4.80');await room.locator('#adjust').click();
    await room.getByRole('button',{name:'Go to measure 2',exact:true}).click();
    assert.ok(Math.abs(await player.evaluate(v=>v.currentTime)-4.8)<.02);
    await room.locator('#loop-first').selectOption('2');await room.locator('#loop-last').selectOption('2');
    await room.locator('#speed').selectOption('0.5');await room.locator('#loop').click();
    assert.equal(await player.evaluate(v=>v.playbackRate),.5);
    await room.locator('#speed').selectOption('1.5');
    assert.equal(await player.evaluate(v=>v.playbackRate),1.5);
    await seek(7.80);
    await player.evaluate(v=>new Promise((resolve,reject)=>{
      const deadline=performance.now()+3500;
      function check(){if(v.currentTime>=4.8 && v.currentTime<5.3 && !v.paused)resolve();
        else if(performance.now()>deadline)reject(Error('Loop did not wrap'));else requestAnimationFrame(check);}
      check();
    }));
    assert.equal(await room.locator('#following').textContent(),'Measure 2');
    await page.getByRole('button',{name:'Back to trainer'}).click();
    assert.equal(await room.locator('#timing').isVisible(),false);
    assert.equal(await player.evaluate(v=>v.paused),false);
    await room.locator('#edit-sync').click();
    assert.equal(await room.locator('#anchors option').count(),3);
    await room.locator('#loop').click();
    await seek(8.5);
    await player.evaluate(v=>v.play());
    await room.locator('#tap-measure').selectOption('3');await room.locator('#tap').click();
    await player.evaluate(v=>v.pause());
    assert.equal(await room.locator('#anchors option').count(),4);
    assert.ok(Number(await room.locator('#anchors').inputValue())>=8.5);
    await room.locator('#save-pair').click();
    await room.getByText('PDF timing saved. Choose the original recording when you reopen it.').waitFor();
    const stored=await page.evaluate(async()=>{
      const {LibraryStore}=await import('/js/library-store.js');
      const store=new LibraryStore(), {scores}=await store.list();
      return store.transaction(['recordingFiles'],'readonly',({recordingFiles},done)=>{
        recordingFiles.get(scores[0].id).onsuccess=e=>done(Boolean(e.target.result));
      });
    });
    assert.equal(stored,false,'saving with the fallback picker stores no media copy');
    await page.getByRole('button',{name:'Close PDF practice'}).click();
    await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('gts.pdf.recording.'))localStorage.removeItem(key);});
    await page.reload();
    await page.locator('#btn-scores').click();
    await page.locator('.library-score-open').first().click();
    await room.getByText('Choose the original recording to reconnect this saved PDF.').waitFor();
    assert.equal(await player.evaluate(v=>Boolean(v.src)),false);
    await room.locator('#recording-file').setInputFiles(recording);
    await room.locator('#tap:enabled').waitFor();
    assert.equal(await room.locator('#anchors option').count(),4);
    assert.equal(await player.evaluate(v=>Boolean(v.src)),true);
    if(!process.argv[2]){
      await room.locator('#recording-file').setInputFiles(audioFixture([1,2.64,4.65,7.34,9],'mixed.wav',.13));
      await room.locator('#tap:enabled').waitFor();
      await tap(1,1);await tap(5,9);
      const anchors=await room.locator('#anchors').innerText();
      if(!await room.locator('#audio-review').evaluate(e=>e.open))await room.locator('#audio-review summary').click();
      await room.locator('#audio-find').click();await room.locator('#keep-audio:enabled').waitFor();
      const options=await room.locator('#audio-measure option').allTextContents();
      assert.match(options[0],/Try audio/);assert.match(options[1],/Try audio/);assert.match(options[2],/Keep even spacing/);
      await room.locator('#use-suggested').click();
      for(const [m,time] of [[2,2.64],[3,4.65],[4,7]]){
        await room.getByRole('button',{name:'Go to measure '+m,exact:true}).click();
        assert.ok(Math.abs(await player.evaluate(v=>v.currentTime)-time)<.08);
      }
      assert.equal(await room.locator('#anchors').innerText(),anchors);
    }
    if(!process.argv[2]){
      await seek(10);
      await room.getByText('Mark a repeat',{exact:true}).click();
      await room.locator('#repeat-end').selectOption('5');
      await room.locator('#repeat-start').selectOption('2');
      await room.locator('#repeat').click();
      await room.getByText('Measure 5 ends and measure 2 repeats at 0:10.00.').waitFor();
      assert.match((await room.locator('#anchors option').allTextContents()).join(' '),/M5 end · 0:10.00[\s\S]*M2 start · 0:10.00/);
      await room.getByText('Shift or clear taps',{exact:true}).click();
      await room.locator('#shift-first').selectOption('2');
      await room.locator('#shift-last').selectOption('2');
      await room.locator('#shift-taps').click();
      assert.ok((await room.locator('#anchors option').allTextContents()).includes('M3 start · 0:10.00'));
      page.once('dialog', dialog=>dialog.dismiss());
      await room.locator('#clear-taps').click();
      assert.ok(await room.locator('#anchors option').count()>0);
      page.once('dialog', dialog=>dialog.accept());
      await room.locator('#clear-taps').click();
      await room.getByText('All taps cleared. Your measure boxes are still in place.').waitFor();
      assert.equal(await room.locator('#anchors option').count(),0);
      assert.equal(await room.locator('#pdf-pages button[data-measure]').count(),measures);
    }
    assert.equal(await page.evaluate(async()=>(await import('/js/app-state.js')).AppState.currentScoreFile),null);
    const legacy=await browser.newPage();
    await legacy.goto('http://127.0.0.1:'+server.address().port+'/README.md');
    const migrated=await legacy.evaluate(async()=>{
      await new Promise((resolve,reject)=>{
        const request=indexedDB.open('guitarTrainerLibrary',4);
        request.onupgradeneeded=()=>{
          const scores=request.result.createObjectStore('scores',{keyPath:'id'});
          const copies=request.result.createObjectStore('recordingFiles',{keyPath:'id'});
          scores.put({id:'pdf',pdfRecording:{anchors:[{measure:2,time:1}]}});
          scores.put({id:'playable',recording:{kind:'local'}});
          for(const id of ['pdf','playable'])copies.put({id,file:new Blob(['fixture'])});
        };
        request.onsuccess=()=>{request.result.close();resolve();};
        request.onerror=()=>reject(request.error);
      });
      const {LibraryStore}=await import('/js/library-store.js');
      const store=new LibraryStore(), {scores}=await store.list();
      const keys=await store.transaction(['recordingFiles'],'readonly',({recordingFiles},done)=>{
        recordingFiles.getAllKeys().onsuccess=e=>done(e.target.result);
      });
      return {keys,anchors:scores.find(row=>row.id==='pdf').pdfRecording.anchors};
    });
    assert.deepEqual(migrated,{keys:['playable'],anchors:[{measure:2,time:1}]});
    const reference=await legacy.evaluate(async()=>{
      const {LibraryStore}=await import('/js/library-store.js');
      const store=new LibraryStore();
      const directory=await navigator.storage.getDirectory();
      const handle=await directory.getFileHandle('test.wav',{create:true});
      const writer=await handle.createWritable();
      await writer.write('original recording');
      await writer.close();
      const scoreId=await store.savePdfRecording(new File(['test'],'reference.pdf'),handle,
        {boxes:{},anchors:[],estimates:{},mediaHash:'a'.repeat(64),mediaName:handle.name});
      const saved=await new LibraryStore().attachments(scoreId);
      return {contents:await (await saved.handle.getFile()).text(),copy:Boolean(saved.file)};
    });
    assert.deepEqual(reference,{contents:'original recording',copy:false});
    assert.deepEqual(errors,[]);
    console.log('Passed standalone PDF open, detection, sparse taps, correction, seek, rate changes, realtime loop, repeat marking, retained playback, and library restore.');
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
