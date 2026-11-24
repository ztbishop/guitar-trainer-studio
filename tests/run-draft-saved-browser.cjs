// Only four explicitly supplied saved examples; never contacts a provider or replays a catalog.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE||'playwright');
const {createAppServer}=require('../local-web-server.cjs');
const root=process.env.GTS_BRIDGE_DIST;
if(!root)throw Error('Set GTS_BRIDGE_DIST to the read-only saved Bridge dist directory.');
function wav(seconds){const rate=8000,b=Buffer.alloc(44+Math.round(rate*seconds)*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
(async()=>{
 const inv=JSON.parse(fs.readFileSync(path.join(root,'boomchick-route-audit-20261115/inventory.json'))),server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const id of ['97322','97326','97311','97330']){
  const d=JSON.parse(fs.readFileSync(path.join(root,'draft-timing-20261115',id+'-draft.json'))),record=inv.rows.find(r=>r.id===id),bytes=fs.readFileSync(record.originals[0].file),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('#lesson-import-dialog',{state:'attached'});
  await page.evaluate(async()=>{window.s=(await import('./js/app-state.js')).AppState;window.store=new (await import('./js/library-store.js')).LibraryStore();});
  const payload={format:'gts-lesson',version:id==='97330'?4:5,title:id,lessonUrl:'https://truefire.com/v'+id,score:{fileName:path.basename(record.originals[0].file),base64:bytes.toString('base64')},recording:{kind:'local-choice',id:d.recordingId},...(id==='97330'?{timingPlan:d.candidatePlan}:{draftTiming:d})};
  await page.evaluate(p=>window.postMessage({type:'gts-lesson-offer',id:'saved-'+p.title,payload:p},location.origin),payload);await page.waitForFunction(()=>document.querySelector('#lesson-import-dialog').open);
  await page.locator('#lesson-recording-file').setInputFiles({name:'saved-control.wav',mimeType:'audio/wav',buffer:wav(id==='97330'?64.42666666666666:400)});
  await page.getByRole('button',{name:'Import lesson',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#lesson-import-dialog').open);
  assert.deepEqual(await page.evaluate(()=>[...s.currentScoreFile.bytes]),[...bytes]);
  if(id==='97330'){
    await page.waitForFunction(()=>s.media.preview&&s.media.timingPlan);assert.equal(await page.locator('#media-draft-timing').isVisible(),false);assert.equal(await page.evaluate(()=>s.media.timingPlan.plan.musicalVisits.at(-1).anchors.at(-1).seconds),64.20852700000009);assert(await page.evaluate(()=>!s.isPlaying));
  }else{
    await page.locator('#media-draft-timeline').waitFor();assert.deepEqual(JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan,d.candidatePlan);
    if(id==='97311'){
      assert.equal(await page.locator('#media-draft-timeline [data-piece]').count(),0);
      await page.getByText('Add a passage or anchor',{exact:true}).click();await page.locator('#media-draft-add-passage').click();
      assert.equal(await page.locator('#media-draft-occurrence').inputValue(),'');
      await page.locator('#media-draft-occurrence').selectOption('12');
      const v=JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan.musicalVisits[0];assert.equal(v.originalVisit,12);assert.equal(v.startSeconds,null);assert.equal(v.endSeconds,null);assert(await page.locator('#media-draft-use').isEnabled());
      await page.locator('#media-draft-undo').click();assert.equal(await page.locator('#media-draft-occurrence').inputValue(),'');
    }else{
      const repeat=d.candidatePlan.musicalVisits.findIndex(v=>v.occurrence===2&&v.endSeconds!==null),index=repeat>=0?repeat:0,v=d.candidatePlan.musicalVisits[index];
      await page.locator('#media-draft-section').selectOption('music:'+index);await page.waitForFunction(n=>document.querySelector('#draft-score-cursor')?.dataset.originalVisit===String(n)&&document.querySelector('#draft-score-cursor .draft-beat-marker'),v.originalVisit);await page.locator('#media-audio').evaluate(e=>e.playbackRate=.5);await page.locator('#media-draft-play').click();
      await page.waitForFunction(time=>document.querySelector('#media-audio').currentTime>time+.15,v.startSeconds);
      await page.waitForFunction(n=>document.querySelector('#draft-score-cursor')?.dataset.originalVisit===String(n),v.originalVisit);
      const tick1=Number(await page.locator('#draft-score-cursor').getAttribute('data-tick'));await page.waitForTimeout(300);const tick2=Number(await page.locator('#draft-score-cursor').getAttribute('data-tick'));assert(tick2>tick1);
      const rect=await page.locator('#draft-score-cursor .draft-beat-marker').last().boundingBox(),score=await page.locator('#alphatab-wrapper').boundingBox();if(!rect){console.log(await page.evaluate(()=>({time:document.querySelector('#media-audio').currentTime,pos:document.querySelector('#media-draft-position').textContent,cursor:document.querySelector('#draft-score-cursor')?.outerHTML.slice(0,600),score:document.querySelector('#alphatab-wrapper').getBoundingClientRect().toJSON()})));}assert(rect&&rect.height>0&&rect.y<score.y+score.height&&rect.y+rect.height>score.y,'Visible score tracking');
      await page.locator('#media-draft-stop').click();assert(await page.evaluate(()=>s.media.editing&&!s.media.preview&&!s.isPlaying));
      await page.locator('#media-draft-section').selectOption('music:'+(d.candidatePlan.musicalVisits.length-1));assert.equal(await page.locator('#media-draft-seconds').inputValue(),'');
      assert.match(await page.locator('#media-draft-unplaced').textContent(),/start unplaced.*end unplaced/);
      const saved=await page.locator('#media-draft-json').inputValue();await page.locator('#media-draft-target').selectOption('startSeconds');await page.locator('#media-draft-seconds').fill('230.123456789');await page.locator('#media-draft-set').click();
      const edited=JSON.parse(await page.locator('#media-draft-json').inputValue());assert.deepEqual(edited.candidatePlan.musicalVisits.slice(0,-1),d.candidatePlan.musicalVisits.slice(0,-1));assert.equal(edited.candidatePlan.musicalVisits.at(-1).endSeconds,null);
      await page.locator('#media-draft-undo').click();assert.equal(await page.locator('#media-draft-json').inputValue(),saved);
      if(id==='97322'){await page.locator('#media-draft-section').selectOption('music:0');await page.waitForFunction(()=>document.querySelector('#media-draft-position').textContent.includes('M1, pass'));await page.screenshot({path:path.join(require('node:os').tmpdir(),'gts-draft-97322-preview.png')});}
    }
    assert(await page.locator('#media-draft-use').isEnabled());assert(await page.evaluate(()=>!s.media.timingPlan&&!s.media.preview&&!s.isPlaying));
  }
  assert.deepEqual(await page.evaluate(async()=>[(await store.listProfiles()).length,(await store.list()).scores.length]),[0,0]);assert.deepEqual(errors,[]);console.log('PASS saved '+id+' original bytes, candidate preservation, visual tracking/missing or explicit ambiguous mapping, isolated grading / verified control');await context.close();
 }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
