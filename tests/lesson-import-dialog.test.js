import {draftLesson} from './draft-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initLessonImport,LESSON_AUTO_IMPORT_KEY} from '../js/lesson-import.js';
import {explanationLesson} from './lesson-import-v4-fixture.js';
import {intervalLesson} from './lesson-import-interval-fixture.js';

function harness(t,{importLesson=async()=>({readyToPractice:false,timingWarning:'Timing length does not match.'}),timingSupport=false,draftSupport=false,intervalSupport=false,referenceSupport=false,
  // Existing manual-review fixtures explicitly retain the saved off choice.
  loadFile=async()=>true,storageValue='false',storageError=null}={}) {
  const originals=Object.fromEntries(['window','document','location'].map(key=>[key,globalThis[key]]));
  const nodes=[],messages=[],loads=[],imports=[],references=[];let clears=0;
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners=new Map();this.textContent='';nodes.push(this);}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(){}
    addEventListener(name,fn){this.listeners.set(name,fn);}
    showModal(){this.open=true;}
    close(){this.open=false;}
    focus(){}
    async fire(name='click'){return this.listeners.get(name)?.({});}
  }
  const stored=new Map(storageValue===null?[]:[[LESSON_AUTO_IMPORT_KEY,storageValue]]),writes=[];
  const localStorage={getItem(key){if(storageError==='read')throw new Error('Storage blocked');return stored.get(key)??null;},
    setItem(key,value){if(storageError==='write')throw new Error('Storage full');writes.push([key,value]);stored.set(key,value);}};
  const listeners=new Map(),window={addEventListener(name,fn){listeners.set(name,fn);},postMessage(message){messages.push(message);}};
  Object.defineProperty(window,'localStorage',{get(){if(storageError==='access')throw new Error('Storage unavailable');return localStorage;}});
  const document={createElement:tag=>new Element(tag),body:new Element('body'),getElementById:id=>nodes.find(n=>n.id===id)};
  const auto=new Element('input');auto.id='lesson-import-auto';auto.type='checkbox';auto.checked=false;
  Object.assign(globalThis,{window,document,location:{origin:'http://localhost:8081'}});
  const state={currentScoreFile:{fileName:'current.gp',bytes:new Uint8Array([1])},playerReady:true,playbackTimeline:{}};
  let finishCount=0;
  const receiver=initLessonImport({state,practiceReference:referenceSupport?{capability:"reference-only-v1",async load(r){references.push(r);},clear(){clears++;}}:null,loadFile:async file=>{
    loads.push(file);const accepted=await loadFile(file);if(!accepted)return accepted;
    state.currentScoreFile={fileName:file.name,bytes:new Uint8Array(await file.arrayBuffer())};return true;
  },mediaControls:{explanationTimingCapability:timingSupport?'explanation-timing-v1':undefined,
    draftTimingCapability:draftSupport?'draft-timing-v1':undefined,async importDraft(...args){imports.push(args);return {draft:true,readyToPractice:false};},
    scoreTimingMatchCapability:intervalSupport?'score-timing-match-v1':undefined,
    captureRecording:()=>null,finishEditing(){finishCount++;},async importLesson(...args){imports.push(args);return importLesson(...args);}}});
  t.after(()=>{receiver.scoreLoading();for(const [key,value] of Object.entries(originals))if(value===undefined)delete globalThis[key];else globalThis[key]=value;});
  return {state,receiver,nodes,messages,loads,imports,references,get clears(){return clears;},document,auto,stored,writes,get finishCount(){return finishCount;},
    offer(payload,origin='http://localhost:8081'){return listeners.get('message')({source:window,origin,data:{type:'gts-lesson-offer',id:'test',payload}});},
    message(data,{origin='http://localhost:8081',sameWindow=true}={}){return listeners.get('message')({source:sameWindow?window:{},origin,data});},
    acceptButton:()=>nodes.find(n=>n.tag==='button'&&n.textContent==='Import lesson'),
    accept:()=>nodes.find(n=>n.tag==='button'&&n.textContent==='Import lesson').fire(),
    text:()=>nodes.map(n=>n.textContent).join('\n'),dialog:()=>document.getElementById('lesson-import-dialog')};
}
const offer=()=>({format:'gts-lesson',version:2,title:'Timing repair',lessonUrl:'https://example.com/lesson',
  score:{fileName:'test.gp',base64:btoa('score')},recording:{url:'https://example.com/video.mp4'},syncPoints:[[0,4],[2,3]]});
async function waitUntil(predicate) {
  const deadline=Date.now()+1500;
  while(!predicate()) {assert(Date.now()<deadline,'receiver did not settle');await new Promise(resolve=>setImmediate(resolve));}
}

test('review discloses malformed timing and loads valid resources only after acceptance',async t=>{
  const h=harness(t);h.offer(offer());
  assert.equal(h.messages.at(-1).ok,true);assert(h.dialog().open);assert.match(h.text(),/manual alignment/);
  assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);
  await h.accept();
  assert.equal(h.loads.length,1);assert.equal(h.imports.length,1);assert.equal(h.finishCount,0);
  const [recording,syncPoints,options]=h.imports[0];
  assert.equal(recording.url,'https://example.com/video.mp4');assert.equal(syncPoints,null);
  assert.match(options.timingWarning,/increase/);assert.deepEqual(options.rejectedSyncPoints,[[0,4],[2,3]]);
  assert.equal(h.dialog().open,false);assert.match(h.document.getElementById('lesson-import-notice').textContent,/Imported timing was not applied/);
  assert.match(h.document.getElementById('lesson-import-notice').textContent,/Review alignment in Media Sync/);
});

test('score-only recovery needs no recording and still reports the timing warning',async t=>{
  const h=harness(t);h.offer({...offer(),recording:null});await h.accept();
  assert.equal(h.loads.length,1);assert.equal(h.imports.length,0);assert.equal(h.finishCount,1);
  assert.match(h.document.getElementById('lesson-import-notice').textContent,/Score loaded; practice with synth/);
});

test('timing-only malformed offers forward a warning without reloading the score',async t=>{
  const h=harness(t);h.offer({...offer(),score:null,recording:null});await h.accept();
  assert.equal(h.loads.length,0);assert.equal(h.imports.length,1);assert.equal(h.imports[0][1],null);
  assert.match(h.imports[0][2].timingWarning,/increase/);assert.equal(h.finishCount,0);
});

test('timing recovery does not accept bad origins/resources or hide media failures',async t=>{
  const h=harness(t,{importLesson:async()=>{throw new Error('Recording could not load.');}});
  h.offer(offer(),'https://elsewhere.example');assert.equal(h.messages.length,0);
  h.offer({...offer(),recording:{url:'javascript:alert(1)'}});assert.equal(h.messages.at(-1).ok,false);assert(!h.dialog().open);
  h.offer(offer());await h.accept();
  assert(h.dialog().open);assert.match(h.text(),/Import needs attention/);assert.match(h.text(),/Recording could not load/);
});

test('a source change during accepted recovery still cancels completion',async t=>{
  let release,entered;
  const started=new Promise(resolve=>entered=resolve),pending=new Promise(resolve=>release=resolve);
  const h=harness(t,{importLesson:async()=>{entered();return pending;}});
  h.offer(offer());const accepting=h.accept();await started;
  h.receiver.scoreLoading();release({readyToPractice:false,timingWarning:'Timing mismatch.'});await accepting;
  assert(h.dialog().open);assert.match(h.text(),/Import cancelled because another score was opened/);
});

for(const timingSupport of [false,true])test(`capability negotiation advertises only installed explanation semantics (${timingSupport})`,async t=>{
  const h=harness(t,{timingSupport}),request={type:'gts-lesson-capabilities-request',id:'capability-1'};
  await h.message(request);
  assert.deepEqual(h.messages.at(-1),{type:'gts-lesson-capabilities',id:'capability-1',lessonVersions:timingSupport?[1,2,3,4]:[1,2,3],
    timingPlans:timingSupport?[{format:'musical-visits-and-explanations',version:1,capability:'explanation-timing-v1'}]:[]});
  const count=h.messages.length;
  await h.message(request,{origin:'https://elsewhere.example'});await h.message(request,{sameWindow:false});
  await h.message({...request,id:'x'.repeat(101)});assert.equal(h.messages.length,count);
  assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);assert(!h.dialog().open);
});

test('version-4 offers require the full receiver capability before review',async t=>{
  const h=harness(t);await h.offer(explanationLesson());
  assert.equal(h.messages.at(-1).ok,false);assert.match(h.messages.at(-1).message,/cannot apply explanation/);
  assert(!h.dialog().open);assert.equal(h.loads.length,0);
});

const nodeText=node=>node?[node.textContent,...node.children.map(nodeText)].join(' '):'';

test('version-4 URL review uses one Import action and keeps technical details collapsed',async t=>{
  const h=harness(t,{timingSupport:true,importLesson:async()=>({readyToPractice:true})}),input=explanationLesson({repeatCorrection:true});
  await h.offer(input);assert(h.dialog().open);assert.equal(h.messages.at(-1).ok,true);
  assert.match(h.text(),/2 musical visits · 1 explanation break\./);
  assert.equal(nodeText(h.document.getElementById('lesson-repeat-review')).trim(),'Skip the second pass of measures 1–2 to match this recording. Original score stays unchanged.');
  const details=h.document.getElementById('lesson-import-details');assert(details);assert(!details.open);
  assert.match(nodeText(details),/synthetic-recording/);assert.match(nodeText(details),/3, 4/);
  const resources=h.document.getElementById('lesson-import-resources');assert.equal(resources.tag,'dl');
  assert.match(nodeText(resources),/Synthetic explanation lesson/);assert.match(nodeText(resources),/original\.gpx/);
  assert.match(nodeText(resources),/Matching lesson recording/);
  assert.equal(h.document.getElementById('lesson-recording-confirmation'),undefined);
  assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);
  assert.equal(h.acceptButton().disabled,false,'review is ready for a single Import click');
  await h.accept();
  assert.equal(h.loads.length,1);assert.equal(h.imports.length,1);assert.equal(h.finishCount,0);
  const [recording,legacy,options]=h.imports[0];assert.equal(recording.id,input.recording.id);assert.equal(legacy,null);
  assert.deepEqual(options,{timingPlan:input.timingPlan,recordingId:input.recording.id});
  assert.deepEqual([...h.state.currentScoreFile.bytes],[...Uint8Array.from(atob(input.score.base64),c=>c.charCodeAt(0))]);
  assert(!h.dialog().open);assert.match(h.document.getElementById('lesson-import-notice').textContent,/Lesson ready/);
});

test('version-4 local Import confirms the chosen file; invalid replacement clears the earlier choice',async t=>{
  const h=harness(t,{timingSupport:true,importLesson:async()=>({readyToPractice:true})});await h.offer(explanationLesson({local:true}));
  const picker=h.document.getElementById('lesson-recording-file');
  assert.equal(h.document.getElementById('lesson-recording-confirmation'),undefined);
  assert.equal(h.acceptButton().disabled,true);await h.accept();assert.equal(h.loads.length,0,'forced click without a file cannot import');
  const file=new File(['audio bytes'],'matching-recording.wav',{type:'audio/wav'});picker.files=[file];await picker.fire('change');
  assert.equal(h.acceptButton().disabled,false,'a valid file enables Import without another confirmation');
  picker.files=[new File(['not media'],'unrelated.txt',{type:'text/plain'})];await picker.fire('change');
  assert.equal(h.acceptButton().disabled,true);await h.accept();assert.equal(h.loads.length,0,'invalid replacement cannot reuse the previous valid file');
  picker.files=[file];await picker.fire('change');await h.accept();
  const [recording,legacy,options]=h.imports[0];assert.equal(recording.kind,'local');assert.equal(recording.file,file);assert.equal(legacy,null);
  assert.equal(options.recordingId,'synthetic-recording');
  assert(h.messages.every(message=>!JSON.stringify(message).includes('matching-recording.wav')),'no recording name, path or bytes goes back to the sender');
});

test('version-4 cancellation leaves resources unchanged and clears local recording choice',async t=>{
  const h=harness(t,{timingSupport:true});await h.offer(explanationLesson({local:true}));
  const original=h.state.currentScoreFile,picker=h.document.getElementById('lesson-recording-file');
  picker.files=[new File(['audio bytes'],'matching.wav',{type:'audio/wav'})];await picker.fire('change');
  await h.nodes.find(n=>n.tag==='button'&&n.textContent==='Cancel').fire();
  assert(!h.dialog().open);assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);assert.equal(h.state.currentScoreFile,original);
  await h.offer(explanationLesson({local:true}));assert.equal(h.acceptButton().disabled,true);await h.accept();assert.equal(h.loads.length,0);
  h.receiver.scoreLoading();await h.accept();
  assert(!h.dialog().open);assert.equal(h.loads.length,0);
});

test('large repeat correction describes written measures plainly and preserves exact visit IDs in Details',async t=>{
  const h=harness(t,{timingSupport:true}),input=explanationLesson({repeatCorrection:true}),plan=input.timingPlan;
  plan.originalPlaybackOrder=[...Array.from({length:49},(_,i)=>i+1),46,47,48,49,...Array.from({length:28},(_,i)=>i+50)];
  const refs=Array.from({length:77},(_,i)=>({visit:i+1,scoreMeasure:i+1,occurrence:1,originalVisit:i<49?i+1:i+5}));
  plan.musicalVisits=refs.map((ref,i)=>{const startSeconds=i+Math.min(i,20),endSeconds=startSeconds+1;return {...ref,startSeconds,endSeconds,
    anchors:[{offset480:0,seconds:startSeconds},{offset480:480,seconds:endSeconds}]};});
  plan.explanations=refs.slice(0,20).map((ref,i)=>({id:`break-${i+1}`,label:`Explanation ${i+1}`,startSeconds:2*i+1,endSeconds:2*i+2,
    boundary:{after:ref,before:refs[i+1]}}));
  plan.repeatResolution.omittedOriginalVisits=[50,51,52,53];
  await h.offer(input);assert.equal(h.messages.at(-1).ok,true,h.messages.at(-1).message);
  assert.equal(nodeText(h.document.getElementById('lesson-repeat-review')).trim(),'Skip the second pass of measures 46–49 to match this recording. Original score stays unchanged.');
  assert.match(h.document.getElementById('lesson-timing-review').textContent,/77 musical visits.*20 explanation breaks/);
  const details=h.document.getElementById('lesson-import-details');assert(!details.open);assert.match(nodeText(details),/50, 51, 52, 53/);
  assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);
});

test('version-4 original-byte mismatch is rejected before review or resource loading',async t=>{
  const h=harness(t,{timingSupport:true}),input=explanationLesson();input.score.base64=btoa('unrelated bytes');
  await h.offer(input);assert.equal(h.messages.at(-1).ok,false);assert.match(h.messages.at(-1).message,/original score bytes/);
  assert(!h.dialog().open);assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);
});

for(const fallback of [false,true])test(`version-4 downstream validation failure remains a hard failure, never legacy recovery (${fallback})`,async t=>{
  const h=harness(t,{timingSupport:true,importLesson:async()=>{
    if(fallback)return {readyToPractice:false,timingWarning:'Native traversal does not match.'};
    throw new Error('Native traversal does not match.');
  }});
  await h.offer(explanationLesson());await h.accept();
  assert.equal(h.loads.length,1);assert.equal(h.state.currentScoreFile.fileName,'original.gpx');
  assert.equal(h.imports.length,1);assert.equal(h.finishCount,0);assert(h.dialog().open);
  assert.match(h.text(),/Import needs attention/);assert.match(h.text(),/Native traversal does not match/);
  assert(!h.document.getElementById('lesson-import-notice').textContent.includes('Lesson ready'));
});

test('in-flight score hashing blocks duplicate offers and respects score supersession',async t=>{
  const h=harness(t,{timingSupport:true});
  const checking=h.offer(explanationLesson());await h.offer(explanationLesson());
  assert.equal(h.messages.at(-1).ok,false);assert.match(h.messages.at(-1).message,/in progress or awaiting review/);
  h.receiver.scoreLoading();await checking;
  assert.equal(h.messages.at(-1).ok,false);assert.match(h.messages.at(-1).message,/cancelled/);
  assert(!h.dialog().open);assert.equal(h.loads.length,0);
});

test('automatic import defaults on without writing storage and preserves exact saved choices',async t=>{
  assert.equal(LESSON_AUTO_IMPORT_KEY,'gts.lessonImport.auto');
  for(const value of [null,'true','TRUE','1',' true ','broken','FALSE',' false ',''])await t.test(String(value),async sub=>{
    const h=harness(sub,{storageValue:value});assert.equal(h.auto.checked,true);
    await h.offer({...offer(),recording:null,syncPoints:null});await waitUntil(()=>h.finishCount===1);
    assert.equal(h.loads.length,1);assert(!h.dialog().open);
    assert.deepEqual(h.writes,[],'initializing the setting does not rewrite storage');
    assert.equal(h.stored.get(LESSON_AUTO_IMPORT_KEY)??null,value);
  });
  await t.test('false',async sub=>{
    const h=harness(sub,{storageValue:'false'});assert.equal(h.auto.checked,false);
    await h.offer({...offer(),recording:null,syncPoints:null});
    assert(h.dialog().open);assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);assert.deepEqual(h.writes,[]);
    assert.equal(h.stored.get(LESSON_AUTO_IMPORT_KEY),'false');
  });
});

test('changing automatic import takes effect in this session and saves both on and off',async t=>{
  const h=harness(t);
  h.auto.checked=true;await h.auto.fire('change');assert.equal(h.stored.get(LESSON_AUTO_IMPORT_KEY),'true');
  await h.offer({...offer(),recording:null,syncPoints:null});
  await waitUntil(()=>h.document.getElementById('lesson-import-notice').textContent.includes('Lesson ready'));
  assert.equal(h.loads.length,1);assert(!h.dialog().open);
  h.auto.checked=false;await h.auto.fire('change');assert.equal(h.stored.get(LESSON_AUTO_IMPORT_KEY),'false');
  await h.offer({...offer(),recording:null,syncPoints:null});assert(h.dialog().open);assert.equal(h.loads.length,1);
  assert.deepEqual(h.writes,[[LESSON_AUTO_IMPORT_KEY,'true'],[LESSON_AUTO_IMPORT_KEY,'false']]);
});

for(const storageError of ['access','read','write'])test(`unavailable ${storageError} storage does not prevent session-only automatic import`,async t=>{
  const h=harness(t,{storageError,storageValue:null});assert.equal(h.auto.checked,true);assert.deepEqual(h.writes,[]);
  h.auto.checked=false;await h.auto.fire('change');
  await h.offer({...offer(),recording:null,syncPoints:null});assert(h.dialog().open);assert.equal(h.loads.length,0);
  await h.nodes.find(node=>node.tag==='button'&&node.textContent==='Cancel').fire();
  h.auto.checked=true;await h.auto.fire('change');
  await h.offer({...offer(),recording:null,syncPoints:null});
  await waitUntil(()=>h.document.getElementById('lesson-import-notice').textContent.includes('Lesson ready'));
  assert.equal(h.loads.length,1);assert(!h.dialog().open);
});

test('automatic version-4 URL import acknowledges before loading completes and rejects busy duplicate offers',async t=>{
  let release,entered;
  const started=new Promise(resolve=>entered=resolve),loading=new Promise(resolve=>release=resolve);
  const h=harness(t,{storageValue:'true',timingSupport:true,loadFile:async()=>{entered();return loading;},importLesson:async()=>({readyToPractice:true})});
  const input=explanationLesson({repeatCorrection:true}),first=h.offer(input);
  await started;
  assert.equal(h.messages.at(-1)?.ok,true,'sender receives acceptance before the resource loader completes');
  assert(!h.dialog().open);assert.equal(h.loads.length,1);assert.equal(h.imports.length,0);
  await h.offer(input);assert.equal(h.messages.at(-1).ok,false);assert.match(h.messages.at(-1).message,/already|progress|busy/i);
  assert.equal(h.loads.length,1);
  release(true);await first;
  await waitUntil(()=>h.document.getElementById('lesson-import-notice').textContent.includes('Lesson ready'));
  assert.equal(h.imports.length,1);assert(!h.dialog().open);assert.equal(h.finishCount,0);
  const [recording,legacy,options]=h.imports[0];assert.equal(recording.id,input.recording.id);assert.equal(legacy,null);
  assert.deepEqual(options,{timingPlan:input.timingPlan,recordingId:input.recording.id});
  assert.deepEqual([...h.state.currentScoreFile.bytes],[...Uint8Array.from(atob(input.score.base64),c=>c.charCodeAt(0))]);
  assert.match(h.document.getElementById('lesson-import-notice').textContent,/Press Play.*Saving is optional/);
});

for(const version of [1,2,3])test(`automatic version-${version} score-only lessons use the existing load path`,async t=>{
  const h=harness(t,{storageValue:'true'}),input={...offer(),version,recording:null,syncPoints:null};
  await h.offer(input);await waitUntil(()=>h.finishCount===1);
  assert.equal(h.loads.length,1);assert.equal(h.imports.length,0);assert(!h.dialog().open);assert.equal(h.messages.at(-1).ok,true);
});

test('automatic legacy timing recovery retains its warning and original rejected points',async t=>{
  const h=harness(t,{storageValue:'true'});await h.offer(offer());
  await waitUntil(()=>h.document.getElementById('lesson-import-notice').textContent.includes('Imported timing was not applied'));
  assert.equal(h.loads.length,1);assert.equal(h.imports.length,1);assert(!h.dialog().open);
  assert.equal(h.imports[0][1],null);assert.deepEqual(h.imports[0][2].rejectedSyncPoints,[[0,4],[2,3]]);
  assert.match(h.imports[0][2].timingWarning,/increase/);
});

for(const version of [3,4])test(`automatic import never bypasses version-${version} local file review`,async t=>{
  const h=harness(t,{storageValue:'true',timingSupport:true,importLesson:async()=>({readyToPractice:true})});
  const input=version===4?explanationLesson({local:true}):{...offer(),version,recording:{kind:'local-choice'},syncPoints:null};
  await h.offer(input);assert(h.dialog().open);assert.equal(h.loads.length,0);assert.equal(h.acceptButton().disabled,true);
  await h.accept();assert.equal(h.loads.length,0);
  const file=new File(['local audio'],'matching.wav',{type:'audio/wav'}),picker=h.document.getElementById('lesson-recording-file');
  picker.files=[file];await picker.fire('change');assert.equal(h.acceptButton().disabled,false);assert.equal(h.loads.length,0,'file selection still waits for Import');
  await h.accept();assert.equal(h.loads.length,1);assert.equal(h.imports[0][0].file,file);assert(!h.dialog().open);
});

for(const failure of ['score load','native traversal','recording duration','legacy recording'])test(`automatic ${failure} failure opens Import needs attention`,async t=>{
  const h=harness(t,{storageValue:'true',timingSupport:true,
    loadFile:async()=>{if(failure==='score load')throw new Error('Score load failed.');return true;},
    importLesson:async()=>{throw new Error(failure==='native traversal'?'Native traversal does not match.':failure==='recording duration'?'Interval exceeds recording duration.':'Recording could not load.');}});
  const first=h.offer(failure==='legacy recording'?offer():explanationLesson());await first;
  await waitUntil(()=>h.dialog().open);
  assert.equal(h.messages[0].ok,true,'resource failure occurs after valid offer acceptance');
  assert.match(h.text(),/Import needs attention/);
  assert.match(h.text(),failure==='score load'?/Score load failed/:failure==='native traversal'?/Native traversal does not match/:failure==='recording duration'?/exceeds recording duration/:/Recording could not load/);
  assert.equal(h.acceptButton().hidden,true);assert(h.nodes.find(node=>node.tag==='button'&&node.textContent==='Close'));
  assert(!h.document.getElementById('lesson-import-notice').textContent.includes('Lesson ready'));
});

test('automatic preference cannot bypass original hash, shape or capability checks',async t=>{
  for(const kind of ['hash','shape','capability'])await t.test(kind,async sub=>{
    const h=harness(sub,{storageValue:'true',timingSupport:kind!=='capability'}),input=explanationLesson();
    if(kind==='hash')input.score.base64=btoa('different original bytes');
    if(kind==='shape')input.syncPoints=null;
    await h.offer(input);assert.equal(h.messages.at(-1).ok,false);assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);assert(!h.dialog().open);
  });
});

for(const timingSupport of [false,true])test(`interval capability advertises independently of existing explanation support (${timingSupport})`,async t=>{
  const h=harness(t,{timingSupport,intervalSupport:true});await h.message({type:'gts-lesson-capabilities-request',id:'interval-cap'});
  const reply=h.messages.at(-1);assert.deepEqual(reply.lessonVersions,[1,2,3,4]);
  assert.deepEqual(reply.timingPlans,[...(timingSupport?[{format:'musical-visits-and-explanations',version:1,capability:'explanation-timing-v1'}]:[]),
    {format:'musical-visits-and-intervals',version:1,capability:'score-timing-match-v1'}]);
  assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);
});

test('old explanation capability alone cannot authorize the new interval contract',async t=>{
  const h=harness(t,{timingSupport:true,storageValue:'true'});await h.offer(intervalLesson());
  assert.equal(h.messages.at(-1).ok,false);assert.match(h.messages.at(-1).message,/cannot|support/i);
  assert(!h.dialog().open);assert.equal(h.loads.length,0);assert.equal(h.imports.length,0);
});

for(const automatic of [false,true])test(`interval lesson uses the same strict import pipeline with automatic=${automatic}`,async t=>{
  const h=harness(t,{intervalSupport:true,storageValue:String(automatic),importLesson:async()=>({readyToPractice:true})}),input=intervalLesson();
  await h.offer(input);assert.equal(h.messages.at(-1).ok,true,h.messages.at(-1).message);
  if(!automatic){assert(h.dialog().open);assert.equal(h.loads.length,0);await h.accept();}
  await waitUntil(()=>h.document.getElementById('lesson-import-notice').textContent.includes('Lesson ready'));
  assert.equal(h.loads.length,1);assert.equal(h.imports.length,1);assert(!h.dialog().open);
  assert.deepEqual(h.imports[0][2],{timingPlan:input.timingPlan,recordingId:input.recording.id});assert.equal(h.imports[0][1],null);
  assert.deepEqual([...h.state.currentScoreFile.bytes],[...Uint8Array.from(atob(input.score.base64),c=>c.charCodeAt(0))]);
});

test('automatic interval lesson still requires a local file and explicit Import',async t=>{
  const h=harness(t,{intervalSupport:true,storageValue:'true',importLesson:async()=>({readyToPractice:true})});await h.offer(intervalLesson({local:true}));
  assert(h.dialog().open);assert.equal(h.acceptButton().disabled,true);await h.accept();assert.equal(h.loads.length,0);
  const picker=h.document.getElementById('lesson-recording-file'),file=new File(['audio'],'interval.wav',{type:'audio/wav'});
  picker.files=[file];await picker.fire('change');assert.equal(h.loads.length,0);await h.accept();
  assert.equal(h.imports[0][0].file,file);assert.equal(h.imports[0][2].timingPlan.format,'musical-visits-and-intervals');
});

test('native sounding-omission rejection stays a visible interval import failure without fallback',async t=>{
  const h=harness(t,{intervalSupport:true,storageValue:'true',importLesson:async()=>{throw new Error('Omitted score measure is not a verified full rest.');}});
  await h.offer(intervalLesson());await waitUntil(()=>h.dialog().open);
  assert.match(h.text(),/Import needs attention/);assert.match(h.text(),/not a verified full rest/);
  assert.equal(h.loads.length,1);assert.equal(h.imports.length,1);assert.equal(h.finishCount,0);assert.equal(h.imports[0][1],null);
});

test('draft capability is independent and a saved manual import waits for confirmation',async t=>{
 const h=harness(t,{draftSupport:true,storageValue:'false'});await h.message({type:'gts-lesson-capabilities-request',id:'draft'});assert(h.messages.at(-1).lessonVersions.includes(5));assert(h.messages.at(-1).timingPlans.some(p=>p.capability==='draft-timing-v1'));
 const input=draftLesson();await h.offer(input);assert(h.dialog().open);assert.equal(h.loads.length,0);assert.match(h.text(),/Draft timing needs review/);await h.accept();assert.equal(h.imports.length,1);assert.deepEqual(h.imports[0][1],input.draftTiming);assert(!h.document.getElementById('lesson-import-notice').textContent.includes('Lesson ready'));
});
test('automatic online draft imports directly into paused review',async t=>{
 const h=harness(t,{draftSupport:true,storageValue:'true'}),input=draftLesson();
 await h.offer(input);await waitUntil(()=>h.imports.length===1);
 assert(!h.dialog().open);assert.equal(h.finishCount,0);assert.deepEqual(h.imports[0][1],input.draftTiming);
 assert.match(h.document.getElementById('lesson-import-notice').textContent,/grading is paused/i);
});
test('automatic draft with a local recording still waits for its file',async t=>{
 const h=harness(t,{draftSupport:true,storageValue:'true'}),input=draftLesson();
 input.recording={kind:'local-choice',id:input.recording.id};await h.offer(input);
 assert(h.dialog().open);assert(h.acceptButton().disabled);assert.equal(h.loads.length,0);
});
test('strict capabilities do not authorize drafts',async t=>{const h=harness(t,{timingSupport:true,intervalSupport:true});await h.offer(draftLesson());assert.equal(h.messages.at(-1).ok,false);assert.equal(h.loads.length,0);});

const referenceOffer=(local=false)=>({format:'gts-lesson',version:6,title:'Independent reference',lessonUrl:'https://example.com/lesson',score:{fileName:'practice.gp',base64:btoa('score')},recording:local?{kind:'local-choice'}:{url:'https://example.com/video.mp4'},recordingMode:'reference-only'});
test('reference capability requires the independent controller and never uses ordinary media import',async t=>{
 const h=harness(t,{referenceSupport:true});await h.message({type:'gts-lesson-capabilities-request',id:'reference'});
 assert(h.messages.at(-1).lessonVersions.includes(6));assert.deepEqual(h.messages.at(-1).recordingModes,['reference-only-v1']);
 await h.offer(referenceOffer());assert(h.dialog().open);assert.match(h.text(),/independent/i);assert.equal(h.references.length,0);await h.accept();
 assert.equal(h.loads.length,1);assert.equal(h.references.length,1);assert.equal(h.imports.length,0);assert.equal(h.finishCount,1);
 assert.match(h.text(),/independent and unsynchronized/);const before=h.clears;h.receiver.scoreLoading();assert(h.clears>before);
});
test('unsupported reference never loads and local reference requires explicit file review',async t=>{
 const old=harness(t);await old.offer(referenceOffer());assert.equal(old.messages.at(-1).ok,false);assert.equal(old.loads.length,0);assert(!old.dialog().open);
 const h=harness(t,{referenceSupport:true,storageValue:'true'});await h.offer(referenceOffer(true));assert(h.dialog().open);assert(h.acceptButton().disabled);await h.accept();assert.equal(h.loads.length,0);
 const picker=h.document.getElementById('lesson-recording-file'),file=new File(['media'],'reference.wav',{type:'audio/wav'});picker.files=[file];await picker.fire('change');await h.accept();assert.equal(h.references[0].file,file);assert.equal(h.references[0].kind,'local');assert.equal(h.imports.length,0);
 assert(h.messages.every(m=>!JSON.stringify(m).includes('reference.wav')));
});
test('reference respects the saved automatic import preference without autoplay requests',async t=>{
 const h=harness(t,{referenceSupport:true,storageValue:'true'});await h.offer(referenceOffer());await waitUntil(()=>h.references.length===1);assert.equal(h.imports.length,0);assert.equal(h.loads.length,1);assert.equal(h.auto.checked,true);
});
