// Real receiver/native score/media; controlled timeline rebuild during media load.
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE||'playwright');
const {createAppServer}=require('../local-web-server.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function wav(){const b=Buffer.alloc(44+8000*12,128);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(8000,28);b.writeUInt16LE(1,32);b.writeUInt16LE(8,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
(async()=>{const server=createAppServer();let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 const base=`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch({headless:true,channel:process.env.GTS_BROWSER_CHANNEL||'chrome'});const context=await browser.newContext();const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let mutation='none',applied=false;
 await context.route('https://recording.test/**',async route=>{if(!applied&&mutation!=='none'){applied=true;await page.evaluate(kind=>{const state=window.importState;window.timelineBefore=state.playbackTimeline;const next=structuredClone(state.playbackTimeline);if(kind==='changed')next.measures[0].endTick+=1;if(kind==='tempo')next.tempoMap[0].bpm+=1;if(kind==='score')state.currentScoreFile={...state.currentScoreFile};state.playbackTimeline=next;},mutation);}const bytes=wav(),range=route.request().headers().range?.match(/bytes=(\d+)-(\d*)/),start=range?Number(range[1]):0,end=range?.[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;await route.fulfill({status:range?206:200,contentType:'audio/wav',body:bytes.subarray(start,end+1),headers:{'Access-Control-Allow-Origin':'*','Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})}}).catch(()=>{});});
 await page.goto(base);await page.locator('#lesson-import-dialog').waitFor({state:'attached'});await page.evaluate(async()=>window.importState=(await import('./js/app-state.js')).AppState);
 const scorePath=process.env.GTS_TRIMMED_SCORE||path.join(__dirname,'../assets/demos/first-notes.gp'),score={fileName:'trimmed-import.gp',base64:fs.readFileSync(scorePath).toString('base64')};
 async function offer(payload){assert.equal(await page.evaluate(p=>new Promise(resolve=>{const id=crypto.randomUUID(),timer=setTimeout(()=>resolve(false),4000);const receive=e=>{if(e.source===window&&e.origin===location.origin&&e.data?.type==='gts-lesson-reply'&&e.data.id===id){clearTimeout(timer);window.removeEventListener('message',receive);resolve(e.data.ok);}};window.addEventListener('message',receive);window.postMessage({type:'gts-lesson-offer',id,payload:p},location.origin);}),payload),true);await page.getByRole('button',{name:'Import lesson',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#lesson-import-notice').textContent.includes('Lesson ready.')&&!document.querySelector('#lesson-import-notice').hidden||document.querySelector('#lesson-import-dialog > [role=status]').textContent.includes('did not finish'),{timeout:35000});}
 const payload={format:'gts-lesson',version:2,title:'Repeat import regression',lessonUrl:'https://lesson.test/example',score,recording:null,syncPoints:null};
 await offer(payload);assert.equal(await page.locator('#lesson-import-dialog').isVisible(),false);
 const count=await page.evaluate(()=>importState.playbackTimeline.measures.length),points=Array.from({length:count+1},(_,i)=>[i,1+i*9/count]);
 // Normal score+recording imports: both first use and replacement of an existing recording.
 for(const mode of ['none','none','equivalent','changed','tempo','score']){
  mutation=mode;applied=false;
  await offer({...payload,recording:{url:`https://recording.test/${mode}-${Date.now()}.wav`,label:'Synthetic recording'},syncPoints:points});
  if(['none','equivalent'].includes(mode)){
   assert.equal(await page.locator('#lesson-import-dialog').isVisible(),false,`${mode}: ${await page.locator('#lesson-import-dialog > [role=status]').textContent()}`);
   assert.deepEqual(await page.evaluate(()=>importState.media.points.map(p=>p.millisecondOffset)),points.map(p=>p[1]*1000));
   assert.equal(await page.evaluate(()=>importState.isPlaying||importState.media.editing),false);
   if(mode==='equivalent'){
    assert.equal(await page.evaluate(()=>timelineBefore===importState.playbackTimeline),false);
    await page.locator('#play-pause-button').click();await page.waitForFunction(()=>!document.querySelector('#media-audio').paused);
    const start=await page.locator('#media-audio').evaluate(el=>el.currentTime);assert(start>=0.95&&start<3,`Native playback must use imported nonzero start, got ${start}`);
    await page.locator('#play-pause-button').click();
   }
  }else{assert.match(await page.locator('#lesson-import-dialog > [role=status]').textContent(),/superseded|playback timeline changed/);await page.getByRole('button',{name:'Close',exact:true}).click();}
 }
 assert.equal(await page.evaluate(async()=>{const {LibraryStore}=await import('./js/library-store.js');const store=new LibraryStore();return (await store.list()).scores.length+(await store.listProfiles()).length;}),0);
 assert.deepEqual(errors,[]);console.log('Import timeline regression passed: fresh/replacement imports, equivalent rebuild, changed structure/tempo/score rejection, exact anchors, no autoplay/save. Synthetic recording; optional private score stays external.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
