// Isolated native receiver check. Private score/plan inputs are optional and read-only.
// Silent local media establishes validation/transport state, not audible alignment.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE||'playwright');
const {createAppServer}=require('../local-web-server.cjs'),at=require('../assets/vendor/alphatab/alphaTab.js');
const out=path.resolve(process.env.GTS_HOLD_OUT||'dist/tie-hold-browser');
function fixture(){
 const parser=new at.importer.AlphaTexImporter();parser.initFromString('. 0.6.2 -.6.2 | r.1 | 2.6.1',new at.Settings());
 const bytes=Buffer.from(new at.exporter.Gp7Exporter().export(parser.readScore(),new at.Settings())),hash=createHash('sha256').update(bytes).digest('hex');
 const ref=(visit,measure)=>({visit,scoreMeasure:measure,occurrence:1,originalVisit:measure}),refs=[ref(1,1),ref(2,3)];
 return {bytes,plan:{format:'musical-visits-and-intervals',version:1,scoreSha256:hash,sourceSha256:hash,timingSha256:hash,recordingId:'finite-tie',originalPlaybackOrder:[1,2,3],
  musicalVisits:refs.map((r,i)=>({...r,startSeconds:i?5:0,endSeconds:i?7:2,anchors:[{offset480:0,seconds:i?5:0},{offset480:480,seconds:i?7:2}]})),
  intervals:[{id:'discussion',kind:'explanation',label:'Discussion',startSeconds:2,endSeconds:5,boundary:{after:refs[0],before:refs[1]}}],scoreOmissions:[{originalVisit:2,scoreMeasure:2,occurrence:1,reason:'unmatched-full-rest'}],repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]}}};
}
function wav(seconds){const b=Buffer.alloc(44+8000*2*seconds);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const f=process.env.GTS_HOLD_GPX&&process.env.GTS_HOLD_PLAN?{bytes:fs.readFileSync(process.env.GTS_HOLD_GPX),plan:JSON.parse(fs.readFileSync(process.env.GTS_HOLD_PLAN,'utf8'))}:fixture();
 const duration=Math.ceil(f.plan.musicalVisits.at(-1).endSeconds)+11;
 const payload={format:'gts-lesson',version:4,title:'Finite native tie boundary',lessonUrl:'https://example.com/finite-tie',score:{fileName:path.basename(process.env.GTS_HOLD_GPX||'finite-tie.gp'),base64:f.bytes.toString('base64')},recording:{kind:'local-choice',id:f.plan.recordingId},timingPlan:f.plan};
 const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;const errors=[];
 try{
  browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL||'chrome'});const context=await browser.newContext({viewport:{width:1440,height:1050}});
  await context.addInitScript(()=>localStorage.setItem('gts.lessonImport.auto','true'));page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);await Promise.all([page.waitForEvent('load'),cdp.send('Page.reload',{ignoreCache:true})]);
  await page.evaluate(async()=>{window.s=(await import('./js/app-state.js')).AppState;window.p=await import('./js/media-practice.js');window.sendHoldOffer=payload=>new Promise(resolve=>{const id=crypto.randomUUID(),receive=e=>{if(e.source===window&&e.origin===location.origin&&e.data?.type==='gts-lesson-reply'&&e.data.id===id){clearTimeout(timer);window.removeEventListener('message',receive);resolve(e.data);}},timer=setTimeout(()=>resolve({ok:false,message:'Timed out'}),5000);window.addEventListener('message',receive);window.postMessage({type:'gts-lesson-offer',id,payload},location.origin);});});
  if(process.env.GTS_BRIDGE_ROOT){
   const {pathToFileURL}=require('node:url'),{checkNativeTiming}=await import(pathToFileURL(path.join(process.env.GTS_BRIDGE_ROOT,'extensions/lesson-bridge/timing-match.js')));
   const result=await page.evaluate(({fn,base64,plan})=>(0,eval)('('+fn+')')(base64,plan),{fn:checkNativeTiming.toString(),base64:payload.score.base64,plan:f.plan});assert.equal(result.ok,true,result.message);
  }
  const reply=await page.evaluate(payload=>sendHoldOffer(payload),payload);assert.equal(reply.ok,true,reply.message);
  const dialog=page.locator('#lesson-import-dialog');await dialog.waitFor({state:'visible'});assert(await dialog.getByRole('button',{name:'Import lesson',exact:true}).isDisabled());
  await page.locator('#lesson-recording-file').setInputFiles({name:'silent-boundary-fixture.wav',mimeType:'audio/wav',buffer:wav(duration)});await dialog.getByRole('button',{name:'Import lesson',exact:true}).click();
  await page.waitForFunction(()=>s.playerReady&&s.media.timingPlan&&!document.querySelector('#lesson-import-dialog').open,null,{timeout:30000});
  const snapshot=await page.evaluate(async()=>{const {LibraryStore}=await import('./js/library-store.js'),store=new LibraryStore();return {bytes:Array.from(s.currentScoreFile.bytes),plan:s.media.timingPlan.plan,measures:s.score.masterBars.length,order:s.playbackTimeline.measures.map(m=>m.measureNumber),notes:s.playbackTimeline.events.flatMap(e=>e.notes).map(n=>({midi:n.midi,attack:n.attack,start:n.startTick,end:n.endTick,origin:n.tieOriginId,destination:n.tieDestinationId})),holds:s.playbackTimeline.ambiguousHoldRanges,paused:!s.isPlaying&&document.querySelector('#media-audio').paused,storedScores:(await store.list()).scores.length,storedProfiles:(await store.listProfiles()).length};});
  assert.equal(Buffer.from(snapshot.bytes).toString('base64'),payload.score.base64);assert.deepEqual(snapshot.plan,f.plan);assert.deepEqual(snapshot.order,f.plan.originalPlaybackOrder);assert(snapshot.paused);assert.equal(snapshot.storedScores,0);assert.equal(snapshot.storedProfiles,0);assert.deepEqual(snapshot.holds,[]);
  const breaks=[];
  for(const interval of f.plan.intervals){const seconds=(interval.startSeconds+interval.endSeconds)/2;
   await page.evaluate(seconds=>{const slider=document.getElementById('media-seek');slider.value=String(seconds);slider.dispatchEvent(new Event('input'));},seconds);
   await page.waitForFunction(({kind,seconds})=>Math.abs(document.getElementById('media-audio').currentTime-seconds)<.03&&p.practicePlanPosition(s)?.kind===kind,{kind:interval.kind,seconds},{timeout:5000});
   const state=await page.evaluate(()=>({kind:p.practicePlanPosition(s).kind,time:s.media.clock.timeMs,paused:!s.isPlaying&&document.getElementById('media-audio').paused}));assert(state.paused);breaks.push(state);
  }
  const last=f.plan.musicalVisits.at(-1),seconds=(last.startSeconds+last.endSeconds)/2;
  await page.evaluate(seconds=>{const slider=document.getElementById('media-seek');slider.value=String(seconds);slider.dispatchEvent(new Event('input'));},seconds);await page.waitForFunction(()=>p.practicePlanPosition(s)?.kind==='music');
  await page.screenshot({path:path.join(out,'verified-import.png'),fullPage:true});assert.deepEqual(errors,[]);
  const result={pass:true,version:4,exactOriginalBytes:true,exactPlan:true,measures:snapshot.measures,notes:snapshot.notes.length,attacks:snapshot.notes.filter(n=>n.attack).length,tiedContinuations:snapshot.notes.filter(n=>!n.attack).length,breaks,paused:true,noAutomaticSave:true,bridgeNativePreflight:!!process.env.GTS_BRIDGE_ROOT,errors};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(out,'native-note-readback.json'),JSON.stringify(snapshot.notes,null,2));console.log(JSON.stringify(result));
 }catch(e){if(page)fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>''));throw e;}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
