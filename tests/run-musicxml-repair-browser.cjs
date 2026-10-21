// With Live Server running: node tests/run-musicxml-repair-browser.cjs XML GPX [baseURL]
// Requires an available Playwright package/browser, not an application dependency.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const [xmlPath,gpxPath,base='http://127.0.0.1:5500']=process.argv.slice(2);
if(!xmlPath || !gpxPath)throw new Error('Supply the original paired XML and reference GPX paths.');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL || 'msedge'});
  try {
    const page=await browser.newPage();
    await page.goto(`${base}/tests/musicxml-repair-browser.html`);
    await page.waitForFunction(()=>typeof window.runRepairChecks==='function');
    const result=await page.evaluate(({xml,gpx})=>window.runRepairChecks(xml,gpx),{xml:fs.readFileSync(xmlPath,'utf8'),gpx:[...fs.readFileSync(gpxPath)]});
    console.log(JSON.stringify(result));
    await page.goto(`${base}/index.html`);
    // Seed the old exact-file saved choice. The new import must still ask.
    await page.evaluate(async bytes=>{
      const {fingerprint}=await import('../js/library-store.js');
      localStorage.setItem(`gts.musicxmlPair.v1.${await fingerprint(new Uint8Array(bytes))}.0.1`,'combine');
    },[...fs.readFileSync(xmlPath)]);
    for(const [button,trackCount] of [['Combine parts',1],['Keep separate',2],['Combine parts',1]]) {
      await page.locator('#score-file-input').setInputFiles(xmlPath);
      const dialog=page.getByRole('dialog',{name:'Combine notation and tab?'});
      await dialog.waitFor();await dialog.getByRole('button',{name:button,exact:true}).click();
      await page.waitForFunction(async count=>{
        const {AppState}=await import('../js/app-state.js');return AppState.tracks.length===count && AppState.playerReady;
      },trackCount);
      console.log(`App reopen: ${button}, ${trackCount} track(s), native player ready.`);
    }
    const summary=await page.evaluate(async()=>{
      const {AppState}=await import('../js/app-state.js');
      const {getPracticeEvents}=await import('../js/score-playback.js');
      const events=getPracticeEvents(AppState.playbackTimeline,AppState.practiceTrackId);
      return {notes:events.reduce((n,e)=>n+e.notes.length,0),upper:AppState.tracks[0].staves[0].bars[38].voices[0].beats[0].notes.map(n=>({visible:n.isVisible,tied:n.isTieDestination}))};
    });
    if(summary.notes!==417 || !summary.upper.every(n=>n.visible && n.tied))throw new Error(`App repair mismatch: ${JSON.stringify(summary)}`);
    console.log('Actual app: 417 fresh notes; measure 39 upper notes visible and tied.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
