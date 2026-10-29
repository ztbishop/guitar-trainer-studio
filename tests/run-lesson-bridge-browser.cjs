// Isolated synthetic lessons and mocked Chrome APIs; not an authenticated extension test.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
function previewWav(){const b=Buffer.alloc(44+8000*2*3);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
(async()=>{
  let browser;
  try {
    const {scanPage}=await import('../extensions/lesson-bridge/scanner.js');
    browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'chrome'});
    const context=await browser.newContext({viewport:{width:600,height:800}});
    const errors=[], requests=[];
    context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url()); requests.push(url.href);
      if(url.hostname==='bridge.test') {
        const file=path.basename(url.pathname);
        if(!['popup.html','popup.js','popup.css','scanner.js','discovery.js','transfer.js'].includes(file))return route.abort();
        return route.fulfill({status:200,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',
          body:await fs.readFile(path.join(__dirname,'../extensions/lesson-bridge',file),'utf8')});
      }
      if(url.hostname==='truefire.com' && url.pathname==='/api/eq/nexus/courses/soundslice_manifest' && url.searchParams.get('cid')==='1069')
        return route.fulfill({json:{mediaurl:'https://cdn.test/methods.mp4',sync:'https://cdn.test/soundslice/slices/1069/34884_sync.json'}});
      if(url.hostname==='truefire.com' && url.pathname==='/api/eq/nexus/courses/soundslice_manifest')
        return route.fulfill({json:{video_url:'https://cdn.test/play?token=secret',syncpoints_url:'https://cdn.test/lesson_sync.json'}});
      if(url.hostname==='truefire.com' && url.pathname==='/score.gp5')return route.fulfill({contentType:'application/octet-stream',body:Buffer.from('FICHIER GUITAR PRO v5.00 fixture'),headers:{'Access-Control-Allow-Origin':'https://bridge.test','Access-Control-Allow-Credentials':'true'}});
      if(url.hostname==='truefire.com' && url.pathname==='/inc/soundsliceappshell/072020/')return route.fulfill({contentType:'text/html',body:'Methods player fixture'});
      if(url.hostname==='truefire.com' && url.pathname.includes('/channels/'))return route.fulfill({contentType:'text/html',body:'<title>Methods session</title><iframe src="/inc/soundsliceappshell/072020/?courseid=1069&lessonid=34884&force_top_video=1"></iframe><a href="/chart.pdf">Chart Download</a><script type="application/json">{"stale":"https://truefire.com/api/eq/nexus/courses/soundslice_manifest?cid=1069&sid=34943","oldTiming":"https://cdn.test/soundslice/slices/1069/34943_sync.json"}</script>'});
      if(url.hostname==='truefire.com' && url.pathname==='/player/soundsliceappshell')
        return route.fulfill({contentType:'text/html',body:'<a href="/inside.gpx">Inside frame</a>'});
      if(url.hostname==='other.test')return route.fulfill({contentType:'text/html',body:'<a href="https://cdn.test/hidden.gp5">Cross-origin hidden score</a>'});
      if(url.hostname==='cdn.test' && url.pathname==='/lesson_sync.json')
        return route.fulfill({headers:{'Access-Control-Allow-Origin':'https://bridge.test','Access-Control-Allow-Credentials':'true'},json:[[0,10.410579],[63,147.833399],[64,149.9865480000009]]});
      if(url.hostname==='cdn.test' && url.pathname==='/many_sync.json')
        return route.fulfill({headers:{'Access-Control-Allow-Origin':'https://bridge.test'},json:Array.from({length:20},(_,i)=>[i,i+1])});
      if(url.hostname==='cdn.test' && url.pathname==='/soundslice/slices/1069/34884_sync.json')
        return route.fulfill({headers:{'Access-Control-Allow-Origin':'https://bridge.test','Access-Control-Allow-Credentials':'true'},json:[[0,1],[4,10]]});
      if(url.hostname==='cdn.test' && url.pathname==='/clip.mp4')return route.fulfill({contentType:'audio/wav',body:previewWav()});
      if(url.hostname==='www.youtube-nocookie.com')return route.fulfill({contentType:'text/html',body:'YouTube preview fixture'});
      return route.fulfill({contentType:'text/html',body:`<!doctype html><title>Test lesson</title>
        <a href="/score.gp5?auth_token=secret">Download GPX</a>
        <a href="/score.gp5?auth_token=secret">Duplicate</a><a href="/chart.pdf">PDF</a>
        <video src="https://cdn.test/clip.mp4"></video>
        <iframe src="/player/soundsliceappshell?cid=961&sid=32682"></iframe>
        <iframe src="https://other.test/frame"></iframe>
        <script type="application/json">{"timing":"https://cdn.test/declared_sync.json","escaped":"https:\\/\\/cdn.test\\/escaped.musicxml","stale":"https://cdn.test/soundslice/slices/85/2233_sync.json","oldManifest":"https://truefire.com/api/eq/nexus/courses/soundslice_manifest?cid=85&sid=2233"}</script>`});
    });
    const lesson=await context.newPage();await lesson.goto('https://truefire.com/lesson/v32682');
    const result=await lesson.evaluate(scanPage);
    assert(result.raw.some(r=>r.url.includes('/inside.gpx')),'same-origin frame inspected');
    assert(!result.raw.some(r=>r.url.includes('/hidden.gp5')),'cross-origin frame untouched');
    assert(result.raw.some(r=>r.url==='https://cdn.test/escaped.musicxml'),'escaped URL recognized');
    assert(result.raw.some(r=>r.url==='https://cdn.test/lesson_sync.json'),'manifest timing discovered');
    assert(!result.raw.some(r=>r.url.includes('2233_sync.json')),'other-lesson timing omitted');
    assert(!result.raw.some(r=>r.url.includes('sid=2233')),'other-lesson manifest omitted');
    assert(result.notices.some(n=>n.includes('cross-origin')));
    assert.equal(requests.filter(u=>u.includes('soundslice_manifest')).length,1,'only known lesson manifest fetched');
    const method=await context.newPage();await method.goto('https://truefire.com/channels/jazz-guitar-method/practice-session-17/l34943');
    const methodResult=await method.evaluate(scanPage);
    assert(methodResult.raw.some(r=>r.url.includes('1069/34884_sync.json')));
    assert(!methodResult.raw.some(r=>r.url.includes('34943_sync.json') || r.url.includes('sid=34943')),'channel navigation ID must not replace player ID');
    assert(methodResult.notices.some(n=>n.includes('lesson 34884')));
    // Render actual popup modules against controlled API responses. Never touches installed extensions.
    const popup=await context.newPage();
    await popup.addInitScript(({result})=>{
      window.fixture=result;window.grant=false;window.permissionRequests=[];window.delivered=null;
      window.copyBlocked=false;window.copiedJson=null;
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.copyBlocked)throw new Error('blocked');window.copiedJson=text;}}});
      window.chrome={
        storage:{local:{get:async()=>JSON.parse(sessionStorage.getItem('mockPreferences') || '{}'),set:async value=>{sessionStorage.setItem('mockPreferences',JSON.stringify(value));}}},
        tabs:{query:async options=>options.url?[{id:2,url:'https://trainer.test/'}]:[{id:1,url:'https://truefire.com/lesson/v32682'}],update:async()=>{}},
        scripting:{executeScript:async options=>{if(options.args){window.delivered=options.args[0];return [{result:{ok:true}}];}return [{result:window.fixture}];}},
        permissions:{request:async data=>{window.permissionRequests.push(data);return window.grant;}}
      };
    },{result});
    await popup.goto('https://bridge.test/popup.html');
    if(process.env.GTS_STORE_SCREENSHOT) {
      await popup.setViewportSize({width:640,height:400});
      await popup.screenshot({path:process.env.GTS_STORE_SCREENSHOT,type:'jpeg',quality:95});
      await popup.setViewportSize({width:600,height:800});
    }
    assert.equal(await popup.locator('#send-top').isDisabled(),true,'top Send waits for a successful scan');
    await popup.waitForFunction(()=>document.getElementById('app-address').value==='https://ztbishop.github.io/guitar-trainer-studio/index.html');
    await popup.locator('#scan').click();await popup.locator('#transfer').waitFor();
    assert.equal(await popup.locator('#send-top').isDisabled(),false);
    const scanBounds=await popup.locator('#scan').boundingBox(),sendBounds=await popup.locator('#send-top').boundingBox();
    assert.equal(scanBounds.y,sendBounds.y,'top buttons share a row at the normal popup width');
    assert(sendBounds.x>scanBounds.x);
    assert.equal(await popup.locator('#score-url-label').isVisible(),false);
    assert.equal(await popup.locator('#recording-url-label').isVisible(),false);
    assert.equal(await popup.locator('#timing-text-label').isVisible(),false);
    await popup.locator('#app-address').fill('http://localhost:5501/index.html');
    await popup.waitForFunction(()=>JSON.parse(sessionStorage.getItem('mockPreferences') || '{}').appAddress==='http://localhost:5501/index.html');
    await popup.reload();
    await popup.waitForFunction(()=>document.getElementById('app-address').value==='http://localhost:5501/index.html');
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'candidates found'}).waitFor();
    await popup.locator('#app-address').fill('https://trainer.test/');
    const body=await popup.locator('body').innerText();assert(!body.includes('auth_token=secret'));
    assert(body.includes('Score · GP5'));assert.equal(await popup.locator('#score option').filter({hasText:'chart.pdf'}).count(),0);
    assert.equal(await popup.getByRole('button',{name:'Copy link',exact:true}).count(),await popup.locator('article').count());
    const scoreCard=popup.locator('article').filter({hasText:'Score · GP5'});
    await scoreCard.getByRole('button',{name:'Copy link',exact:true}).click();
    assert.equal(await popup.evaluate(()=>window.copiedJson),'https://truefire.com/score.gp5?auth_token=secret','asset copying preserves full access parameters');
    await popup.evaluate(()=>{window.copyBlocked=true;});
    await scoreCard.getByRole('button',{name:'Copy link',exact:true}).click();
    await scoreCard.getByText('Copy was blocked.',{exact:false}).waitFor();
    assert.equal(await scoreCard.locator('.asset-link-copy').inputValue(),'https://truefire.com/score.gp5?auth_token=secret');
    assert.equal(await scoreCard.locator('.asset-link-copy').evaluate(el=>el.selectionEnd-el.selectionStart===el.value.length),true);
    await popup.evaluate(()=>{window.copyBlocked=false;});
    const timing=popup.locator('article').filter({hasText:'lesson_sync.json'});
    await timing.getByRole('button',{name:'Inspect timing'}).click();
    await timing.locator('pre').filter({hasText:'declined'}).waitFor();
    assert.equal(requests.filter(u=>u.includes('cdn.test/lesson_sync.json')).length,0,'declining permission makes no request');
    await popup.evaluate(()=>{window.grant=true;});
    await timing.getByRole('button',{name:'Inspect timing'}).click();
    await timing.locator('pre').filter({hasText:'3 valid timing points'}).waitFor();
    assert.deepEqual(await popup.evaluate(()=>window.permissionRequests.at(-1)),{origins:['https://cdn.test/*']});
    assert((await timing.locator('pre').innerText()).includes('149.987'));
    await timing.getByRole('button',{name:'Copy sync points'}).click();
    assert.equal(JSON.parse(await popup.evaluate(()=>window.copiedJson)).length,3);
    await popup.evaluate(()=>{window.copyBlocked=true;});
    await timing.getByRole('button',{name:'Copy sync points'}).click();
    await timing.getByText('Copy was blocked.',{exact:false}).waitFor();
    assert.equal(await timing.locator('textarea').evaluate(el=>el.selectionEnd-el.selectionStart===el.value.length),true);
    await popup.evaluate(()=>{window.copyBlocked=false;});
    await popup.locator('#timing').selectOption({label:'lesson_sync.json · TrueFire manifest'});
    await popup.locator('#test-score').click();await popup.locator('#test-score-status').filter({hasText:'Guitar Pro header'}).waitFor();
    await popup.locator('#test-recording').click();await popup.locator('#test-recording-status').filter({hasText:'metadata loaded'}).waitFor();
    assert.equal(await popup.locator('#recording-preview video').evaluate(v=>v.autoplay),false);
    await popup.evaluate(()=>{window.chrome.permissions.request=async()=>new Promise(resolve=>{window.releaseSend=()=>resolve(true);});});
    await popup.locator('#send-top').click();
    assert.equal(await popup.locator('#send-top').isDisabled(),true);
    assert.equal(await popup.locator('#send').isDisabled(),true);
    assert.equal(await popup.locator('#scan').isDisabled(),true);
    await popup.evaluate(()=>{window.releaseSend();window.chrome.permissions.request=async()=>window.grant;});
    await popup.locator('#send-status').filter({hasText:'Sent.'}).waitFor();
    assert.equal(await popup.locator('#send-top').isDisabled(),false);
    assert.equal(await popup.locator('#send').isDisabled(),false);
    const delivered=await popup.evaluate(()=>window.delivered);
    assert.equal(delivered.version,2);assert.equal(delivered.score.fileName,'score.gp5');assert.match(atob(delivered.score.base64),/^FICHIER GUITAR PRO/);
    assert.equal(delivered.syncPoints.length,3);assert.equal(delivered.recording.url,'https://cdn.test/clip.mp4');
    if(process.env.GTS_BRIDGE_SCREENSHOT) await popup.screenshot({path:process.env.GTS_BRIDGE_SCREENSHOT,fullPage:true});
    await popup.evaluate(()=>{window.fixture={title:'Timing-only page',page:'https://test.example/',raw:[{url:'https://cdn.test/many_sync.json'}],notices:[]};});
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'1 candidate found'}).waitFor();
    assert.equal(await popup.locator('#transfer').isVisible(),true,'partial/manual controls remain available without a score');
    assert.equal(await popup.locator('#score').inputValue(),'');
    await popup.getByRole('button',{name:'Inspect timing'}).click();
    await popup.locator('pre').filter({hasText:'20 valid timing points'}).waitFor();
    await popup.getByRole('button',{name:'Copy sync points'}).click();
    assert.equal(JSON.parse(await popup.evaluate(()=>window.copiedJson)).length,20,'copy includes every point, not only the 12-point preview');
    if(process.env.GTS_TIMING_COPY_SCREENSHOT)await popup.locator('.timing-copy').screenshot({path:process.env.GTS_TIMING_COPY_SCREENSHOT});
    await popup.locator('#timing').selectOption('custom');await popup.locator('#timing-text').fill('[[0,1],[4,10]]');
    await popup.locator('#test-timing').click();await popup.locator('#test-timing-status').filter({hasText:'2 timing points checked'}).waitFor();
    await popup.locator('#send').click();await popup.locator('#send-status').filter({hasText:'Sent.'}).waitFor();
    assert.equal(await popup.evaluate(()=>window.delivered.score),null);assert.equal(await popup.evaluate(()=>window.delivered.keepRecording),true);
    await popup.evaluate(result=>{window.fixture=result;},methodResult);
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'candidates found'}).waitFor();
    assert.equal(await popup.locator('#score').inputValue(),'','Methods PDF must not become a practice score');
    assert.match(await popup.locator('#recording option:checked').textContent(),/mp4/);
    assert.match(await popup.locator('#timing option:checked').textContent(),/34884_sync/);
    await popup.locator('#manual-mode').check();
    assert((await popup.locator('#score option').allTextContents()).some(text=>text.includes('pdf')),'manual mode exposes otherwise unclassified assets');
    await popup.locator('#score').selectOption('custom');
    assert.equal(await popup.locator('#score-url-label').isVisible(),true);
    await popup.locator('#score-url').fill('https://truefire.com/score.gp5');
    await popup.locator('#score-name').fill('manual.gp5');
    await popup.locator('#test-score').click();await popup.locator('#test-score-status').filter({hasText:'Guitar Pro header'}).waitFor();
    await popup.locator('#recording').selectOption('custom');
    await popup.locator('#recording-url').fill('https://www.youtube.com/watch?v=PNnsydd-qG0');
    await popup.locator('#test-recording').click();
    assert.equal(await popup.locator('#recording-preview iframe').getAttribute('src'),'https://www.youtube-nocookie.com/embed/PNnsydd-qG0');
    await popup.locator('#send').click();await popup.locator('#send-status').filter({hasText:'Sent.'}).waitFor();
    assert.equal(await popup.evaluate(()=>window.delivered.score.fileName),'manual.gp5');
    assert.equal(await popup.locator('#recording-preview iframe').count(),0,'sending closes preview');
    await popup.evaluate(()=>{window.fixture={title:'<img src=x onerror=alert(1)>',page:'https://test.example/',raw:[{url:'https://cdn.test/evil.gp5',label:'<script>alert(1)</script>'}],notices:[]};});
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'1 candidate found'}).waitFor();
    assert.equal(await popup.locator('article script, #status img').count(),0,'page-controlled labels rendered as text');
    await popup.evaluate(()=>{window.fixture.raw=[];});await popup.locator('#scan').click();
    await popup.getByText('No supported resources were exposed.',{exact:false}).waitFor();
    await popup.evaluate(()=>{window.chrome.scripting.executeScript=async()=>{throw new Error('blocked');};});
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'could not scan'}).waitFor();
    assert.equal(await popup.locator('#scan').isDisabled(),false,'failure permits retry');
    assert.equal(await popup.locator('#send-top').isDisabled(),true,'failed rescan cannot send stale selections');
    assert.deepEqual(errors,[]);
    console.log('Lesson Bridge browser checks passed: real DOM/frame/manifest scanning and stale-timing filtering; popup review, redaction, timing grant/decline, selected resource download/transfer, text safety, empty/error recovery. Chrome APIs mocked; actual installation/TrueFire acceptance pending.');
  } finally {await browser?.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
