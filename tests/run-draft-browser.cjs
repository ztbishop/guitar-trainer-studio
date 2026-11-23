const {chromium}=require(process.env.GTS_PLAYWRIGHT_MODULE||'playwright');
const {createAppServer}=require('../local-web-server.cjs');
const at=require('../assets/vendor/alphatab/alphaTab.js');
const assert=require('node:assert/strict');
function wav(){const b=Buffer.alloc(44+22050*2*15);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(22050,24);b.writeUInt32LE(44100,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
(async()=>{
 const {intervalLesson}=await import('./lesson-import-interval-fixture.js');const settings=new at.Settings(),p=new at.importer.AlphaTexImporter();p.initFromString('\\tempo 120 . r.1 | 0.6.1 | r.1 | 2.6.1 | r.1 | 3.6.1 | r.1',settings);const bytes=Buffer.from(new at.exporter.Gp7Exporter().export(p.readScore(),settings));
 const old=intervalLesson({local:true,scoreBytes:bytes});const {timingPlan,...rest}=old;
 const draft={format:'draft-recording-timing',version:1,scoreSha256:timingPlan.scoreSha256,recordingId:old.recording.id,originalPlaybackOrder:timingPlan.originalPlaybackOrder,originalTimingText:JSON.stringify([[0,0],[1,13.1234567890123]]),matchingEvidence:{verifiedSections:[1,2,3],lesson:'synthetic missing endpoint'},candidatePlan:structuredClone(timingPlan),unresolved:[{originalVisit:6,reason:'Final sounding endpoint missing'}]};
 draft.candidatePlan.musicalVisits.at(-1).endSeconds=null;draft.candidatePlan.musicalVisits.at(-1).anchors.pop();
 const payload={...rest,version:5,draftTiming:draft};const server=createAppServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const input={id:'draft-midi',name:'Draft test MIDI',type:'input',state:'connected',manufacturer:'Test',addEventListener(_,fn){this.receive=fn;},removeEventListener(){},close(){return Promise.resolve();}};window.sendDraftMidi=data=>input.receive({data:new Uint8Array(data),timeStamp:performance.now()});Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>({inputs:new Map([[input.id,input]])})});});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.querySelector('#lesson-import-dialog'));
 await page.evaluate(async()=>{window.s=(await import('./js/app-state.js')).AppState;window.store=new (await import('./js/library-store.js')).LibraryStore();window.offer=(type,payload)=>new Promise(resolve=>{const id=crypto.randomUUID();const listener=e=>{if(e.data.id===id&&['gts-lesson-reply','gts-lesson-capabilities'].includes(e.data.type)){window.removeEventListener('message',listener);resolve(e.data);}};window.addEventListener('message',listener);window.postMessage({type,id,payload},location.origin);});});
 await page.waitForFunction(()=>document.querySelector('#midi-input-select option[value="draft-midi"]'));await page.locator('#midi-input-select').evaluate(e=>{e.value='draft-midi';e.dispatchEvent(new Event('change'));});
 const cap=await page.evaluate(()=>offer('gts-lesson-capabilities-request'));assert(cap.lessonVersions.includes(5));assert(cap.timingPlans.some(p=>p.capability==='draft-timing-v1'));
 const reply=await page.evaluate(p=>offer('gts-lesson-offer',p),payload);assert(reply.ok);assert(await page.locator('#lesson-import-dialog').evaluate(d=>d.open));assert.equal(await page.evaluate(()=>s.currentScoreFile),null);
 await page.locator('#lesson-recording-file').setInputFiles({name:'draft.wav',mimeType:'audio/wav',buffer:wav()});await page.getByRole('button',{name:'Import lesson',exact:true}).click();
 await page.locator('#media-draft-timing').waitFor();await page.waitForFunction(()=>!document.querySelector('#lesson-import-dialog').open);
 assert.match(await page.locator('#media-draft-issues').textContent(),/missing|Missing/);assert(await page.locator('#media-finish-editing').isDisabled());assert(await page.locator('#media-save-profile').isDisabled());assert(await page.locator('#media-draft-use').isDisabled());
 assert(await page.evaluate(()=>!s.media.preview&&s.media.editing&&!s.isPlaying&&!s.media.timingPlan));assert.deepEqual(await page.evaluate(()=>[...s.currentScoreFile.bytes]),[...bytes]);
 await page.locator('#media-draft-section').selectOption('music:0');
 await page.locator('#play-pause-button').click();
 await page.waitForFunction(()=>document.querySelector('#media-audio').currentTime>1.2);
 await page.waitForFunction(()=>document.querySelector('#draft-score-cursor rect'));
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.draft-playing-note *')).some(g=>getComputedStyle(g).fill.includes('46, 204, 113')));
 const x1=await page.locator('#draft-score-cursor rect').last().getAttribute('x');
 await page.waitForTimeout(350);
 const x2=await page.locator('#draft-score-cursor rect').last().getAttribute('x');assert.notEqual(x1,x2);
 assert.equal(await page.locator('#draft-score-cursor').getAttribute('data-original-visit'),'2');
 const scores=await page.evaluate(()=>({realtime:s.trainer.results,wait:s.waitTrainer.results}));await page.evaluate(()=>{sendDraftMidi([0x90,40,100]);sendDraftMidi([0x80,40,0]);sendDraftMidi([0x90,81,100]);sendDraftMidi([0x80,81,0]);});
 assert.deepEqual(await page.evaluate(()=>({realtime:s.trainer.results,wait:s.waitTrainer.results})),scores);

 assert(await page.evaluate(()=>s.media.editing&&!s.isPlaying&&!s.media.preview));await page.locator('#media-draft-stop').click();
 await page.locator('#media-draft-seek').evaluate(e=>{e.value='4.5';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForFunction(()=>document.querySelector('#media-draft-position').textContent.startsWith('Explanation'));
 assert.equal(await page.locator('#draft-score-cursor rect').count(),0);
 assert.equal(await page.locator('.draft-playing-note').count(),0);
 await page.locator('#media-draft-section').selectOption('music:3');
 assert.equal(await page.locator('#media-draft-seconds').inputValue(),'11');
 await page.locator('#media-draft-scope').selectOption('move');
 const box=await page.locator('#media-draft-timeline').boundingBox();
 // The unknown-end section has no body; its start handle remains a boundary edit.
 await page.locator('#media-draft-seconds').fill('11.2');await page.locator('#media-draft-set').click();
 let edited=await page.locator('#media-draft-json').inputValue();assert.equal(JSON.parse(edited).candidatePlan.musicalVisits[3].endSeconds,null);
 assert.equal(JSON.parse(edited).candidatePlan.musicalVisits[0].startSeconds,1);
 await page.locator('#media-draft-undo').click();assert.equal(JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan.musicalVisits[3].startSeconds,11);
 await page.locator('#media-draft-scope').selectOption('point');
 // Drag the missing-end passage's only supplied start anchor, then undo.
 const handle=page.locator('#media-draft-timeline [data-piece="music:3"][data-target="0"]');await handle.scrollIntoViewIfNeeded();const h=await handle.boundingBox();
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+box.width/150,h.y+h.height/2,{steps:5});await page.mouse.up();
 assert(JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan.musicalVisits[3].startSeconds>11,await page.locator('#media-draft-affected').textContent());
 await page.locator('#media-draft-undo').click();assert.deepEqual(JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan,draft.candidatePlan);
 assert.match(await page.locator('#media-draft-unplaced').textContent(),/end unplaced/);
 await page.locator('#media-draft-scope').selectOption('move');await handle.scrollIntoViewIfNeeded();const whole=await handle.boundingBox();
 await page.mouse.move(whole.x+whole.width/2,whole.y+whole.height/2);await page.mouse.down();await page.mouse.move(whole.x+whole.width/2+box.width/100,whole.y+whole.height/2,{steps:4});await page.mouse.up();
 let wholeEdit=JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan.musicalVisits[3];assert(wholeEdit.startSeconds>11);assert.equal(wholeEdit.startSeconds,wholeEdit.anchors[0].seconds);assert.equal(wholeEdit.endSeconds,null);await page.locator('#media-draft-undo').click();
 await page.locator('#media-draft-section').selectOption('music:0');await page.locator('#media-draft-scope').selectOption('point');
 await page.locator('#media-draft-seek').evaluate(e=>{e.value='2';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.getByText('Add a passage or anchor',{exact:true}).click();await page.getByLabel('New anchor score position (0–480)').fill('240');await page.locator('#media-draft-add-anchor').click();
 const internal=page.locator('#media-draft-timeline [data-piece="music:0"][data-target="1"]');await internal.scrollIntoViewIfNeeded();const ih=await internal.boundingBox();
 await page.mouse.move(ih.x+ih.width/2,ih.y+ih.height/2);await page.mouse.down();await page.mouse.move(ih.x+ih.width/2+box.width/150,ih.y+ih.height/2,{steps:4});await page.mouse.up();
 const internalEdit=JSON.parse(await page.locator('#media-draft-json').inputValue()).candidatePlan.musicalVisits[0];assert(internalEdit.anchors[1].seconds>2);assert.equal(internalEdit.startSeconds,1);assert.equal(internalEdit.endSeconds,3);await page.locator('#media-draft-undo').click();await page.locator('#media-draft-undo').click();

 const advanced=page.locator('#media-draft-json').locator('..');await advanced.locator('summary').click();
 const working={candidatePlan:structuredClone(timingPlan),unresolved:[]};working.candidatePlan.musicalVisits[0].anchors.splice(1,0,{offset480:240,seconds:99.123456789});
 await page.locator('#media-draft-json').fill(JSON.stringify(working));await page.locator('#media-draft-preview').click();assert.match(await page.locator('#media-draft-issues').textContent(),/99.123456789.*beyond/);assert(await page.locator('#media-draft-use').isDisabled());
 await page.locator('#media-draft-undo').click();assert.match(await page.locator('#media-draft-issues').textContent(),/missing|Missing/);await page.locator('#media-draft-redo').click();assert.match(await page.locator('#media-draft-issues').textContent(),/beyond/);
 const download=page.waitForEvent('download');await page.locator('#media-draft-export').click();const downloaded=await download;const fs=require('node:fs');const exported=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert.deepEqual(exported.original,draft);assert.equal(exported.working.candidatePlan.musicalVisits[0].anchors[1].seconds,99.123456789);
 await page.locator('#media-draft-original').click();
 const chooser=page.waitForEvent('filechooser');await page.locator('#media-draft-open').click();await (await chooser).setFiles({name:'draft-work.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
 await page.waitForFunction(()=>document.querySelector('#media-draft-json').value.includes('99.123456789'));
 assert.deepEqual(JSON.parse(await page.locator('#media-draft-json').inputValue()),exported.working);

 await page.locator('#media-draft-json').fill(JSON.stringify({candidatePlan:timingPlan,unresolved:[]}));await page.locator('#media-draft-preview').click();assert.equal(await page.locator('#media-draft-use').isDisabled(),false);
 await page.locator('#media-draft-use').click();await page.waitForFunction(()=>s.media.preview&&s.media.timingPlan&&!s.media.editing,null,{timeout:10000}).catch(async e=>{console.log(await page.evaluate(()=>({issues:document.querySelector('#media-draft-issues').textContent,status:document.querySelector('#media-action-status').textContent,preview:s.media.preview,editing:s.media.editing,ready:s.playerReady})));throw e;});assert.deepEqual(await page.evaluate(()=>s.media.timingPlan.plan),timingPlan);assert(await page.evaluate(()=>!s.isPlaying&&document.querySelector('#media-audio').paused));
 assert.deepEqual(await page.evaluate(async()=>[(await store.listProfiles()).length,(await store.list()).scores.length]),[0,0]);await page.evaluate(()=>document.querySelector('#media-edit-sync').click());assert.equal(await page.locator('#media-draft-export').isVisible(),true);assert.deepEqual(errors,[]);
 console.log('PASS visual draft: moving score highlight/playhead, continuous playback, seek/gap, numeric whole move, pointer drag, unchanged timestamps, undo/redo/export, strict activation and grading isolation');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
