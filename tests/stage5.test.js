import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {resolvePracticeRange,eventsInRange,normalizePlaybackSpeed,measureOccurrenceLabel} from '../js/practice-range.js';
import {WaitController} from '../js/wait-controller.js';
import {AppState} from '../js/app-state.js';
import {buildExpectedEventsFromPracticeTrack,handlePlaybackPosition,handlePlaybackState,handleMidiEvent,finishRealtimeSession} from '../js/practice-engine.js';
import {buildPlaybackTimeline} from '../js/score-playback.js';
import {initTransportControls} from '../js/transport-controls.js';

const measures=[
 {measureNumber:1,occurrence:1,playbackMeasureIndex:0,startTick:0,endTick:3840},
 {measureNumber:2,occurrence:1,playbackMeasureIndex:1,startTick:3840,endTick:7680},
 {measureNumber:1,occurrence:2,playbackMeasureIndex:2,startTick:7680,endTick:11520},
];
test('loop range selects explicit repeat occurrence with inclusive end measure',()=>{
 assert.deepEqual(resolvePracticeRange({measures},2,2),{startTick:7680,endTick:11520});
 assert.deepEqual(resolvePracticeRange({measures},0,1),{startTick:0,endTick:7680});
 assert.match(measureOccurrenceLabel(measures[2]),/Measure 1.*occurrence 2.*step 3/);
});
test('invalid, reversed, fractional and missing ranges are rejected',()=>{
 for(const [start,end] of [[2,1],[-1,1],[0,3],[0.5,1],[NaN,1]])assert.equal(resolvePracticeRange({measures},start,end),null);
 assert.equal(resolvePracticeRange(null,0,0),null);
});
test('range grades only attacks inside it, excluding boundary and preceding sustains',()=>{
 const events=[{id:'before',startTick:0,endTick:9000},{id:'start',startTick:3840},{id:'last',startTick:7679},{id:'end',startTick:7680}];
 assert.deepEqual(eventsInRange(events,{startTick:3840,endTick:7680}).map(e=>e.id),['start','last']);
 assert.equal(eventsInRange(events,null),events);
});
test('speed input handles supported limits and rejects invalid values',()=>{
 assert.equal(normalizePlaybackSpeed('50'),0.5);assert.equal(normalizePlaybackSpeed(25),0.25);assert.equal(normalizePlaybackSpeed(200),2);
 for(const value of ['',0,24,201,'bad',Infinity])assert.equal(normalizePlaybackSpeed(value),null);
});
const target=(id,startTick,midi)=>({id,startTick,measureNumber:1,notes:[{id:id+':note',midi,string:6}]});
const attack=midi=>({type:'note-on',midi,channel:1});
function waitHarness() {
 let state;const calls=[];
 const controller=new WaitController(Object.fromEntries(['acquire','hold','pause','release','finish'].map(name=>[name,(...args)=>calls.push([name,...args])])),next=>state=next);
 controller.configure([target('a',3840,60),target('b',4800,62)],7680,false,true);
 return {controller,calls,get state(){return state}};
}
test('Wait loops silently with fresh attacks and per-pass results',()=>{
 const h=waitHarness();h.controller.toggle(3840);
 h.controller.noteOn(attack(61));h.controller.noteOn(attack(60));h.controller.noteOn(attack(62));
 assert.equal(h.state.pass,2);assert.equal(h.state.currentEvent.id,'a');assert.equal(h.state.results.correct,0);
 assert.equal(h.state.lastPassResults.correct,2);assert.equal(h.state.lastPassResults.wrong,1);
 assert.deepEqual(h.calls.at(-1),['hold',3840]);assert.ok(!h.calls.some(c=>c[0]==='finish'));
 h.controller.noteOn(attack(62));assert.equal(h.state.currentEvent.id,'a');
 h.controller.noteOn(attack(60));h.controller.noteOn(attack(62));assert.equal(h.state.pass,3);
});
test('pause at loop restart ignores input and Stop clears pass state',()=>{
 const h=waitHarness();h.controller.toggle(3840);h.controller.noteOn(attack(60));h.controller.noteOn(attack(62));
 h.controller.toggle();h.controller.positionChanged({currentTick:3840,isSeek:true});h.controller.noteOn(attack(60));assert.equal(h.state.results.correct,0);
 h.controller.toggle();h.controller.noteOn(attack(60));assert.equal(h.state.results.correct,1);
 h.controller.stop();assert.equal(h.state.pass,1);assert.equal(h.state.lastPassResults,null);assert.equal(h.calls.at(-1)[0],'release');
});
test('Realtime section reset excludes other measures and clears hits on loop rewind',()=>{
 AppState.practiceLoop={enabled:true,range:{startTick:960,endTick:2880}};
 AppState.inputMode='single-channel';AppState.practiceTrackId='0';AppState.tracks=[{index:0,name:'Guitar'}];AppState.tickPosition=960;AppState.playbackSpeed=0.5;AppState.trainer.latencyMs=0;
 AppState.playbackTimeline={endTick:3840,ticksPerQuarter:960,tempoMap:[{tick:0,bpm:120,timeMs:0}],
  events:[0,960,1920,2880].map((tick,index)=>({...target(String(index),tick,60+index),trackId:'0',endTick:tick+960,notes:[{id:String(index)+':note',midi:60+index,attack:true}],startTimeMs:tick/1.92,endTimeMs:(tick+960)/1.92}))};
 buildExpectedEventsFromPracticeTrack();assert.deepEqual(AppState.expectedEvents.map(e=>e.startTick),[960,1920]);
 AppState.isPlaying=true;handlePlaybackState();handlePlaybackPosition({currentTick:960,at:1000,speed:0.5,isSeek:true});
 handleMidiEvent({...attack(61),at:1000});assert.equal(AppState.trainer.results.correct,1);
 finishRealtimeSession();assert.equal(AppState.trainer.results.total,2);assert.equal(AppState.trainer.results.missed,1);
 handlePlaybackPosition({currentTick:960,at:3000,speed:0.5,isSeek:true});assert.equal(AppState.trainer.results.correct,0);assert.equal(AppState.trainer.results.missed,0);
 handleMidiEvent({...attack(61),at:3000});assert.equal(AppState.trainer.results.correct,1);
});

class Emitter {handlers=[];on(fn){this.handlers.push(fn)}trigger(v){for(const fn of this.handlers)fn(v)}}
test('bundled synthesizer loops selected range at half speed without dispatching excluded future attacks',()=>{
 const context=vm.createContext({console,process});vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);const at=context.alphaTab;
 const output={sampleRate:44100,ready:new Emitter(),sampleRequest:new Emitter(),samplesPlayed:new Emitter(),open(){this.ready.trigger()},pause(){},play(){},activate(){},resetSamples(){this.last=0},addSamples(s){this.last=s.length/2},close(){}};
 const synth=new at.synth.AlphaSynth(output,100);synth.loadSoundFont(new Uint8Array(readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2',import.meta.url))),false);
 const parser=new at.importer.AlphaTexImporter();parser.initFromString(String.raw`\tempo 120 . 0.6.4 1.6.4 2.6.4 3.6.4`,new at.Settings());const score=parser.readScore();
 const midi=new at.midi.MidiFile();const generator=new at.midi.MidiFileGenerator(score,new at.Settings(),new at.midi.AlphaSynthMidiFileHandler(midi));generator.generate();
 assert.ok(buildPlaybackTimeline(generator.tickLookup).events.length);synth.loadMidiFile(midi);
 const seen=[];const original=synth.synthesizer.dispatchEvent.bind(synth.synthesizer);synth.synthesizer.dispatchEvent=e=>{if(e.event.type===at.midi.MidiEventType.NoteOn)seen.push(e.event.tick);original(e)};
 synth.playbackSpeed=0.5;synth.playbackRange={startTick:960,endTick:2880};synth.isLooping=true;
 let passes=0;synth.finished.on(()=>passes++);seen.length=0;synth.play();
 for(let i=0;i<180;i++){output.sampleRequest.trigger();output.samplesPlayed.trigger(output.last||0)}
 assert.ok(passes>=2);assert.equal(synth.state,1);assert.ok(seen.filter(t=>t===960).length>=2);assert.ok(!seen.includes(2880));
 synth.pause();assert.equal(synth.state,0);synth.stop();assert.ok(Math.abs(synth.tickPosition-960)<=2);
});

test('Tempo/Loop forms validate selection, expose repeated occurrences, and allow Wait click tempo',()=>{
 const priorDocument=globalThis.document;
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,disabled:false,children:[],handlers:{},addEventListener(name,fn){this.handlers[name]=fn},replaceChildren(){this.children=[]},appendChild(item){this.children.push(item)}});return elements.get(id)};
 globalThis.document={getElementById:get,createElement:()=>({}),activeElement:null};
 try {
  AppState.playbackTimeline={measures};AppState.playerReady=true;AppState.playbackSpeed=1;AppState.mode='realtime';AppState.practiceLoop={enabled:false,startIndex:0,endIndex:0,range:null};
  const loops=[];const speeds=[];const controls=initTransportControls({onSpeedChange:value=>{speeds.push(value);AppState.playbackSpeed=value},onLoopChange:value=>{loops.push(value);AppState.practiceLoop=value}});controls.sync();
  const speed=get('playback-speed-percent'),start=get('practice-loop-start'),end=get('practice-loop-end');
  assert.equal(start.children.length,3);assert.match(start.children[2].textContent,/occurrence 2/);assert.equal(end.value,'2');
  get('practice-loop-enabled').checked=true;start.value='2';end.value='1';get('apply-practice-loop').handlers.click();assert.equal(loops.length,0);
  end.value='2';get('apply-practice-loop').handlers.click();assert.deepEqual(loops[0].range,{startTick:7680,endTick:11520});
  speed.value='50';speed.handlers.change();assert.deepEqual(speeds,[0.5]);
  speed.value='0';speed.handlers.change();assert.equal(speeds.length,1);assert.equal(speed.value,'50');
  AppState.mode='wait';controls.sync();assert.equal(speed.disabled,false);assert.equal(get('apply-practice-loop').disabled,false);
  AppState.playbackTimeline=null;AppState.playerReady=false;AppState.practiceLoop={enabled:false,startIndex:0,endIndex:0,range:null};controls.sync();assert.equal(start.children.length,0);assert.equal(get('apply-practice-loop').disabled,true);
 } finally {globalThis.document=priorDocument;}
});
