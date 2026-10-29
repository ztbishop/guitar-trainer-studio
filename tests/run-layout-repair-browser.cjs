// Isolated browser and pre-theme launcher: no owner profile or server changes.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process'),Module=require('node:module');
(async()=>{
  const root=path.resolve(__dirname,'..'),filename=path.join(root,'local-web-server.cjs');
  // This version keeps its old in-memory allowlist while serving updated files.
  const legacy=new Module(filename,module);legacy.filename=filename;legacy.paths=module.paths;
  legacy._compile(execFileSync('git',['show','1f8042f:local-web-server.cjs'],{cwd:root,encoding:'utf8'}),filename);
  const server=legacy.exports.createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;let browser;
  try {
    assert.equal((await fetch(base+'/appearance.css')).status,404);
    const css=await fetch(base+'/assets/styles/appearance.css');assert.equal(css.status,200);assert.match(await css.text(),/score-paper/);
    browser=await chromium.launch({channel:process.env.GTS_BROWSER_CHANNEL || 'chrome',headless:true});
    for(const [width,height,saved] of [[1580,1100,null],[1580,1100,190],[3820,1550,300]]) {
      const context=await browser.newContext({viewport:{width,height}});
      await context.addInitScript(saved=>{if(saved!==null && !localStorage.getItem('gts.workspacePanelSizes'))localStorage.setItem('gts.workspacePanelSizes',JSON.stringify({'fretboard-container':saved,fretboardAutoHeight:false}));},saved);
      const page=await context.newPage();page.setDefaultTimeout(8000);await page.goto(base);
      const load=async name=>{await page.locator('#score-file-input').setInputFiles(path.join(root,'assets/demos',name));await page.waitForFunction(async()=>(await import('./js/app-state.js')).AppState.playerReady);await page.waitForTimeout(400);};
      await load('easy-chords.gp');
      // Layout fixture: finite decoded-video metadata, no external media/network.
      // This validates normal load/layout wiring, not video decoding or playback.
      await page.evaluate(()=>{
        const video=document.querySelector('#media-video');
        for(const [key,value] of Object.entries({duration:12,readyState:2,videoWidth:640,videoHeight:360}))Object.defineProperty(video,key,{configurable:true,get:()=>value});
        Object.defineProperty(video,'src',{configurable:true,get:()=>'',set:()=>{}});
        video.load=()=>setTimeout(()=>video.dispatchEvent(new Event('loadeddata')),10);
        const transfer=new DataTransfer();transfer.items.add(new File(['layout fixture'],'layout.webm',{type:'video/webm'}));
        const input=document.querySelector('#media-file');input.files=transfer.files;input.dispatchEvent(new Event('change'));
      });
      try {await page.waitForFunction(()=>!document.querySelector('#media-player-panel').hidden);} catch(e){console.log(await page.locator('#media-status').textContent());throw e;}
      const measure=()=>page.evaluate(()=>{const c=document.querySelector('#fretboard-content'),v=c.querySelector('svg'),scroll=c.querySelector('.fretboard-scroll');return {width:v.getBoundingClientRect().width,h:c.clientHeight,available:scroll.clientWidth,natural:Number(v.dataset.naturalWidth),left:v.getBoundingClientRect().left-scroll.getBoundingClientRect().left,right:scroll.getBoundingClientRect().right-v.getBoundingClientRect().right,saved:localStorage.getItem('gts.workspacePanelSizes')};});
      await page.waitForTimeout(400);let d=await measure();assert(d.width>1250,JSON.stringify(d));assert(Math.abs(d.left-d.right)<2);const before=d.saved;
      for(const theme of ['dark','soft-light','light']) {
        await page.evaluate(theme=>{const c=document.querySelector('#appearance');c.value=theme;c.dispatchEvent(new Event('change'));},theme);
        await page.waitForTimeout(100);
        assert.equal(await page.locator('.alphatab-wrapper').evaluate(e=>getComputedStyle(e).backgroundColor),{dark:'rgb(32, 38, 46)','soft-light':'rgb(236, 239, 241)',light:'rgb(255, 255, 255)'}[theme]);
        if(theme==='dark')assert.equal(await page.locator('.app-toolbar').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(37, 45, 55)');
      }
      // Replace a score while media is attached, then reload without touching the divider.
      await load('first-notes.gp');d=await measure();assert(d.width>1250,JSON.stringify(d));assert.equal(d.saved,before);
      await page.reload();await load('first-notes.gp');d=await measure();assert(d.width>1250,JSON.stringify(d));assert.equal(d.saved,before);
      if(width>3000)assert(d.width<width*.75,'ultrawide cap retained');
      if(process.env.GTS_SCREENSHOT_DIR)await page.locator('#fretboard-container').screenshot({path:path.join(process.env.GTS_SCREENSHOT_DIR,'repaired-neck-'+width+'-'+saved+'.png')});
      console.log('PASS legacy server, themes, initial/reloaded neck and saved height',width,saved,d.width);
      await context.close();
    }
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
