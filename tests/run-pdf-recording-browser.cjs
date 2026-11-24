// Pass local PDF and media paths to exercise a real pair. Default inputs are generated.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {createAppServer}=require('../local-web-server.cjs');

function audioFixture() {
  const rate=8000, size=rate*12*2, data=Buffer.alloc(44+size);
  data.write('RIFF');data.writeUInt32LE(36+size,4);data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
  data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);
  data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(size,40);
  return {name:'exercise.wav',mimeType:'audio/wav',buffer:data};
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
      await page.setContent('<svg width="600" height="100"><path d="M10 20h560 M10 28h560 M10 36h560 M10 44h560 M10 52h560 M10 20v32 M190 20v32 M370 20v32 M570 20v32" fill="none" stroke="black"/></svg>');
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
    await tap(2,4.75);
    await room.locator('summary').click();
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
    await open();assert.equal(await room.locator('#anchors option').count(),3);
    await seek(8.5);
    await player.evaluate(v=>v.play());
    await room.locator('#tap-measure').selectOption('3');await room.locator('#tap').click();
    await player.evaluate(v=>v.pause());
    assert.equal(await room.locator('#anchors option').count(),4);
    assert.ok(Number(await room.locator('#anchors').inputValue())>=8.5);
    assert.equal(await page.evaluate(async()=>(await import('/js/app-state.js')).AppState.currentScoreFile),null);
    assert.deepEqual(errors,[]);
    console.log('Passed standalone PDF open, detection, sparse taps, correction, seek, rate changes, realtime loop and restored timing.');
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
