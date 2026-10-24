import test from 'node:test';
import assert from 'node:assert/strict';
import {outsideLoopBounds,wholeMeasureSelection} from '../js/loop-visuals.js';
import {countInTiming,scheduleCountIn} from '../js/count-in.js';
import {WaitController} from '../js/wait-controller.js';
import {AppState} from '../js/app-state.js';
import {initLoopControls} from '../js/loop-controls.js';

test('drag activation notifies once, enabled range changes stay silent, and loop indicators clear when disabled',()=>{
  const previous={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
  const saved={playbackTimeline:AppState.playbackTimeline,playerReady:AppState.playerReady,practiceLoop:AppState.practiceLoop,media:AppState.media};
  const elements=new Map(),pending=new Map();let nextId=0;
  const get=id=>{
    if(!elements.has(id)) {
      const classes=new Set();
      elements.set(id,{value:'',textContent:'',handlers:{},attrs:{},classList:{add(name){classes.add(name);},remove(name){classes.delete(name);},toggle(name,on){on?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)},
        addEventListener(name,fn){this.handlers[name]=fn;},setAttribute(name,value){this.attrs[name]=value;}});
    }
    return elements.get(id);
  };
  globalThis.document={getElementById:get,activeElement:null};
  globalThis.setTimeout=(fn,ms)=>{pending.set(++nextId,{fn,ms});return nextId;};
  globalThis.clearTimeout=id=>pending.delete(id);
  const flush=()=>{const [id,{fn}]=pending.entries().next().value;pending.delete(id);fn();};
  try {
    AppState.playerReady=true;AppState.playbackTimeline={measures};AppState.practiceLoop={enabled:false,countIn:false,startIndex:0,endIndex:3,range:null};
    const controls=initLoopControls(loop=>{AppState.practiceLoop=loop;});controls.sync();
    const notice=get('loop-enabled-notice'),button=get('btn-looper');
    controls.selectByDrag({startIndex:1,endIndex:2});
    assert.equal(notice.textContent,'Loop enabled: measures 2–3');assert.ok(notice.classList.contains('is-visible'));
    assert.ok(button.classList.contains('is-loop-enabled'));assert.ok(get('btn-more').classList.contains('has-enabled-loop'));
    assert.equal(button.attrs['aria-description'],'Loop enabled');assert.equal(pending.values().next().value.ms,3000);
    flush();assert.ok(!notice.classList.contains('is-visible'));flush();assert.equal(notice.textContent,'');
    controls.selectByDrag({startIndex:2,endIndex:3});assert.equal(pending.size,0);assert.equal(notice.textContent,'');
    assert.match(button.title,/3–4/);assert.ok(button.classList.contains('is-loop-enabled'));
    get('practice-loop-enabled').checked=false;get('practice-loop-enabled').handlers.change();assert.ok(!button.classList.contains('is-loop-enabled'));
    get('practice-loop-enabled').checked=true;get('practice-loop-enabled').handlers.change();assert.equal(notice.textContent,'');assert.equal(pending.size,0);
    get('practice-loop-enabled').checked=false;get('practice-loop-enabled').handlers.change();
    controls.selectByDrag({startIndex:0,endIndex:1});assert.equal(notice.textContent,'Loop enabled: measures 1–2');
    controls.selectByDrag({startIndex:1,endIndex:1});assert.equal(notice.textContent,'');assert.equal(pending.size,0,'new active range does not leave a stale activation notice');
    const retained=structuredClone(AppState.practiceLoop);
    for(const media of [{editing:true,returning:false},{editing:false,returning:true}]) {
      AppState.media=media;controls.sync();
      for(const id of ['practice-loop-enabled','loop-count-in','practice-loop-start','practice-loop-end','loop-start-slider','loop-end-slider','loop-start-up','loop-end-down'])assert.equal(get(id).disabled,true,id);
      assert.match(get('loop-controls-status').textContent,media.editing?/Finish editing/:/Restoring/);
      controls.selectByDrag({startIndex:0,endIndex:3});
      get('practice-loop-enabled').checked=false;get('practice-loop-enabled').handlers.change();
      get('practice-loop-start').value='4';get('practice-loop-start').handlers.change();
      assert.deepEqual(AppState.practiceLoop,retained,'suspended controls cannot alter the saved loop');
    }
    AppState.media={editing:false,returning:false};controls.sync();
    assert.equal(get('practice-loop-enabled').disabled,false);assert.deepEqual(AppState.practiceLoop,retained);
    AppState.playerReady=false;AppState.playbackTimeline=null;AppState.practiceLoop={enabled:false,startIndex:0,endIndex:0,range:null};controls.sync();
    assert.ok(!get('more-loop-shortcut').classList.contains('is-loop-enabled'));assert.ok(!get('btn-more').classList.contains('has-enabled-loop'));
  } finally {Object.assign(globalThis,previous);Object.assign(AppState,saved);}
});

const measures=[1,2,1,3].map((measureNumber,i)=>({measureNumber,startTick:i*3840,endTick:(i+1)*3840}));
const timeline={measures,tempoMap:[{tick:0,bpm:120},{tick:7680,bpm:200}]};
test('native beat selection expands to complete measures without losing repeat occurrences',()=>{
  assert.deepEqual(wholeMeasureSelection(timeline,{startTick:8000,endTick:9000}),{startIndex:2,endIndex:2,range:{startTick:7680,endTick:11520}});
  assert.equal(wholeMeasureSelection(timeline,{startTick:-1,endTick:0}),null);
  assert.deepEqual(wholeMeasureSelection(timeline,{startTick:100,endTick:7680}).range,{startTick:0,endTick:7680});
});
test('shading excludes only written measures unused by the active loop and ignores full/off loops',()=>{
  const bounds={staffSystems:[{bars:[0,1,2].map(index=>({index,realBounds:{x:index*50,w:50},visualBounds:{y:10,h:100}}))}]};
  const loop={enabled:true,startIndex:2,endIndex:2,range:{startTick:7680,endTick:11520}};
  assert.deepEqual(outsideLoopBounds(timeline,loop,bounds).map(r=>r.x),[50,100]);
  assert.deepEqual(outsideLoopBounds(timeline,{...loop,enabled:false},bounds),[]);
  assert.deepEqual(outsideLoopBounds(timeline,{...loop,startIndex:0,endIndex:3},bounds),[]);
});
test('count-in follows starting time signature and effective tempo; Wait uses its fixed BPM',()=>{
  const score={tempo:120,masterBars:[{timeSignatureNumerator:3,timeSignatureDenominator:8}]};
  assert.deepEqual(countInTiming(timeline,score,7680,0.5),{beats:3,secondsPerBeat:0.3});
  assert.deepEqual(countInTiming(timeline,score,7680,0.5,200),{beats:3,secondsPerBeat:0.15});
  assert.deepEqual(countInTiming(null,null,0),{beats:4,secondsPerBeat:0.5});
});
function audioHarness() {
  const pending=new Map(),sources=[];let id=0;
  const timers={setTimeout(fn,delay){pending.set(++id,{fn,delay});return id;},clearTimeout(id){pending.delete(id);}};
  const context={currentTime:1,state:'running',destination:{},createGain:()=>({gain:{},connect(){},disconnect(){}}),
    createBufferSource(){const source={connect(){},start(at){this.at=at;},stop(){this.stopped=true;},disconnect(){}};sources.push(source);return source;}};
  return {context,timers,pending,sources,flush(){for(const {fn} of [...pending.values()])fn();}};
}
test('count-in schedules one bar on the audio clock then completes once; cancellation silences all sources',()=>{
  const h=audioHarness(),beats=[];let completed=0;
  scheduleCountIn(h.context,{}, {beats:4,secondsPerBeat:0.3},0.75,beat=>beats.push(beat),()=>completed++,h.timers);
  assert.deepEqual(h.sources.map(s=>Math.round(s.at*1000)),[1050,1350,1650,1950]);
  assert.equal(completed,0);h.flush();assert.deepEqual(beats,[1,2,3,4]);assert.equal(completed,1);assert.equal(h.pending.size,0);
  const cancel=scheduleCountIn(h.context,{}, {beats:3,secondsPerBeat:0.5},0.75,()=>beats.push(99),()=>completed++,h.timers);
  cancel();h.flush();assert.equal(completed,1);assert.ok(h.sources.every(s=>s.stopped));
});
function waitHarness(loopCountIn) {
  const countIns=[];let state;
  const controller=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){},countIn(tick,done){countIns.push(done);}},s=>state=s,()=>1000);
  controller.configure([{id:'a',startTick:0,notes:[{id:'n',midi:60}]}],3840,false,true,{},loopCountIn);
  return {controller,countIns,get state(){return state;}};
}
test('Wait ignores attacks during initial count-in and adds one to a loop only when requested',()=>{
  for(const loopCountIn of [false,true]) {
    const h=waitHarness(loopCountIn);h.controller.toggle();
    assert.equal(h.state.phase,'count-in');h.controller.positionChanged({currentTick:0,isSeek:true});assert.equal(h.state.phase,'count-in');
    h.controller.noteOn({type:'note-on',midi:60});assert.equal(h.state.results.correct,0);
    h.countIns[0](true);h.controller.noteOn({type:'note-on',midi:60});assert.equal(h.state.pass,2);
    assert.equal(h.countIns.length,loopCountIn?2:1);assert.equal(h.state.phase,loopCountIn?'count-in':'seeking');
    h.controller.stop();
  }
});
test('Wait pause/resume and Stop discard obsolete count-in completions',()=>{
  const h=waitHarness(true);h.controller.toggle();const old=h.countIns[0];
  h.controller.toggle();old(true);assert.equal(h.state.phase,'paused');
  h.controller.toggle();old(true);assert.equal(h.state.phase,'count-in');
  h.countIns[1](true);assert.equal(h.state.phase,'seeking');
  h.controller.toggle();h.controller.toggle();h.controller.stop();h.countIns[2](true);assert.equal(h.state.phase,'idle');
});
