import test from 'node:test';
import assert from 'node:assert/strict';
import {initLessonImport} from '../js/lesson-import.js';

function harness(t,{importLesson=async()=>({readyToPractice:false,timingWarning:'Timing length does not match.'})}={}) {
  const originals=Object.fromEntries(['window','document','location'].map(key=>[key,globalThis[key]]));
  const nodes=[],messages=[],loads=[],imports=[];
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners=new Map();this.textContent='';nodes.push(this);}
    append(...children){this.children.push(...children);}
    setAttribute(){}
    addEventListener(name,fn){this.listeners.set(name,fn);}
    showModal(){this.open=true;}
    close(){this.open=false;}
    focus(){}
    async fire(name='click'){return this.listeners.get(name)?.({});}
  }
  const listeners=new Map(),window={addEventListener(name,fn){listeners.set(name,fn);},postMessage(message){messages.push(message);}};
  const document={createElement:tag=>new Element(tag),body:new Element('body'),getElementById:id=>nodes.find(n=>n.id===id)};
  Object.assign(globalThis,{window,document,location:{origin:'http://localhost:8081'}});
  const state={currentScoreFile:{fileName:'current.gp',bytes:new Uint8Array([1])},playerReady:true,playbackTimeline:{}};
  let finishCount=0;
  const receiver=initLessonImport({state,loadFile:async file=>{
    loads.push(file);state.currentScoreFile={fileName:file.name,bytes:new Uint8Array(await file.arrayBuffer())};return true;
  },mediaControls:{captureRecording:()=>null,finishEditing(){finishCount++;},async importLesson(...args){imports.push(args);return importLesson(...args);}}});
  t.after(()=>{receiver.scoreLoading();for(const [key,value] of Object.entries(originals))if(value===undefined)delete globalThis[key];else globalThis[key]=value;});
  return {state,receiver,nodes,messages,loads,imports,document,get finishCount(){return finishCount;},
    offer(payload,origin='http://localhost:8081'){listeners.get('message')({source:window,origin,data:{type:'gts-lesson-offer',id:'test',payload}});},
    accept:()=>nodes.find(n=>n.tag==='button'&&n.textContent==='Import lesson').fire(),
    text:()=>nodes.map(n=>n.textContent).join('\n'),dialog:()=>document.getElementById('lesson-import-dialog')};
}
const offer=()=>({format:'gts-lesson',version:2,title:'Timing repair',lessonUrl:'https://example.com/lesson',
  score:{fileName:'test.gp',base64:btoa('score')},recording:{url:'https://example.com/video.mp4'},syncPoints:[[0,4],[2,3]]});

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
