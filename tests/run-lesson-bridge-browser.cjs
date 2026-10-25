// Isolated synthetic lessons and mocked Chrome APIs; not an authenticated extension test.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
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
        if(!['popup.html','popup.js','popup.css','scanner.js','discovery.js'].includes(file))return route.abort();
        return route.fulfill({status:200,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',
          body:await fs.readFile(path.join(__dirname,'../extensions/lesson-bridge',file),'utf8')});
      }
      if(url.hostname==='truefire.com' && url.pathname==='/api/eq/nexus/courses/soundslice_manifest')
        return route.fulfill({json:{video_url:'https://cdn.test/play?token=secret',syncpoints_url:'https://cdn.test/lesson_sync.json'}});
      if(url.hostname==='truefire.com' && url.pathname==='/player/soundsliceappshell')
        return route.fulfill({contentType:'text/html',body:'<a href="/inside.gpx">Inside frame</a>'});
      if(url.hostname==='other.test')return route.fulfill({contentType:'text/html',body:'<a href="https://cdn.test/hidden.gp5">Cross-origin hidden score</a>'});
      if(url.hostname==='cdn.test' && url.pathname==='/lesson_sync.json')
        return route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:[[0,10.410579],[63,147.833399],[64,149.9865480000009]]});
      return route.fulfill({contentType:'text/html',body:`<!doctype html><title>Test lesson</title>
        <a href="/score.gp5?auth_token=secret">Download GPX</a>
        <a href="/score.gp5?auth_token=secret">Duplicate</a><a href="/chart.pdf">PDF</a>
        <video src="https://cdn.test/clip.mp4"></video>
        <iframe src="/player/soundsliceappshell?cid=961&sid=32682"></iframe>
        <iframe src="https://other.test/frame"></iframe>
        <script type="application/json">{"timing":"https://cdn.test/declared_sync.json","escaped":"https:\\/\\/cdn.test\\/escaped.musicxml"}</script>`});
    });
    const lesson=await context.newPage();await lesson.goto('https://truefire.com/lesson/v32682');
    const result=await lesson.evaluate(scanPage);
    assert(result.raw.some(r=>r.url.includes('/inside.gpx')),'same-origin frame inspected');
    assert(!result.raw.some(r=>r.url.includes('/hidden.gp5')),'cross-origin frame untouched');
    assert(result.raw.some(r=>r.url==='https://cdn.test/escaped.musicxml'),'escaped URL recognized');
    assert(result.raw.some(r=>r.url==='https://cdn.test/lesson_sync.json'),'manifest timing discovered');
    assert(result.notices.some(n=>n.includes('cross-origin')));
    assert.equal(requests.filter(u=>u.includes('soundslice_manifest')).length,1,'only known lesson manifest fetched');
    // Render actual popup modules against controlled API responses. Never touches installed extensions.
    const popup=await context.newPage();
    await popup.addInitScript(({result})=>{
      window.fixture=result;window.grant=false;window.permissionRequests=[];
      window.chrome={
        tabs:{query:async()=>[{id:1,url:'https://truefire.com/lesson/v32682'}]},
        scripting:{executeScript:async()=>[{result:window.fixture}]},
        permissions:{request:async data=>{window.permissionRequests.push(data);return window.grant;}}
      };
    },{result});
    await popup.goto('https://bridge.test/popup.html');
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'candidates found'}).waitFor();
    const body=await popup.locator('body').innerText();assert(!body.includes('auth_token=secret'));
    assert(body.includes('Score · GP5'));assert(!body.includes('PDF'));
    const timing=popup.locator('article').filter({hasText:'lesson_sync.json'});
    await timing.getByRole('button',{name:'Inspect timing'}).click();
    await timing.locator('pre').filter({hasText:'declined'}).waitFor();
    assert.equal(requests.filter(u=>u.includes('cdn.test/lesson_sync.json')).length,0,'declining permission makes no request');
    await popup.evaluate(()=>{window.grant=true;});
    await timing.getByRole('button',{name:'Inspect timing'}).click();
    await timing.locator('pre').filter({hasText:'3 valid timing points'}).waitFor();
    assert.deepEqual(await popup.evaluate(()=>window.permissionRequests.at(-1)),{origins:['https://cdn.test/*']});
    assert((await timing.locator('pre').innerText()).includes('149.987'));
    if(process.env.GTS_BRIDGE_SCREENSHOT) await popup.screenshot({path:process.env.GTS_BRIDGE_SCREENSHOT,fullPage:true});
    await popup.evaluate(()=>{window.fixture={title:'<img src=x onerror=alert(1)>',page:'https://test.example/',raw:[{url:'https://cdn.test/evil.gp5',label:'<script>alert(1)</script>'}],notices:[]};});
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'1 candidate found'}).waitFor();
    assert.equal(await popup.locator('article script, #status img').count(),0,'page-controlled labels rendered as text');
    await popup.evaluate(()=>{window.fixture.raw=[];});await popup.locator('#scan').click();
    await popup.getByText('No supported resources were exposed.',{exact:false}).waitFor();
    await popup.evaluate(()=>{window.chrome.scripting.executeScript=async()=>{throw new Error('blocked');};});
    await popup.locator('#scan').click();await popup.locator('#status').filter({hasText:'could not scan'}).waitFor();
    assert.equal(await popup.locator('#scan').isDisabled(),false,'failure permits retry');
    assert.deepEqual(errors,[]);
    console.log('Lesson Bridge browser checks passed: real DOM/frame/manifest scanning; popup review, redaction, timing grant/decline, text safety, empty/error recovery. Chrome APIs mocked; actual installation/TrueFire acceptance pending.');
  } finally {await browser?.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
