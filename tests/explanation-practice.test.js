import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {compileTimingPlan} from '../js/explanation-timing.js';
import {practiceEvents,practiceTimeAtTick,practicePlanPosition,planPracticeRange} from '../js/media-practice.js';
import {recordingScoreRange,outsideRecordingScore} from '../js/media-score-range.js';
import {resetRealtimeSession,handlePlaybackPosition,handleMidiEvent,advanceRealtimeClock} from '../js/practice-engine.js';
import {WaitController} from '../js/wait-controller.js';

const hash='a'.repeat(64);
const ref=visit=>visit?Object.fromEntries(['visit','scoreMeasure','occurrence','originalVisit'].map(key=>[key,visit[key]])):null;
function fixture({order=[1,2,1,2,3],omit=[3,4],hold=2,intro=0.5,ending=0.5,chord=false,bend=false}={}) {
  const counts=new Map();
  const measures=order.map((measureNumber,index)=>{
    const occurrence=(counts.get(measureNumber)??0)+1;counts.set(measureNumber,occurrence);
    return {measureNumber,occurrence,playbackMeasureIndex:index,startTick:index*1000,endTick:(index+1)*1000};
  });
  const events=measures.map((measure,index)=>({id:'event-'+index,...measure,startTimeMs:measure.startTick,endTimeMs:measure.endTick,
    targetEndTick:measure.endTick,targetEndTimeMs:measure.endTick,stringCount:6,
    pitches:chord?[60,64]:[index?64:60],notes:(chord?[60,64]:[index?64:60]).map((midi,n)=>({id:`note-${index}-${n}`,midi,string:n+1,
      attack:true,startTick:measure.startTick,endTick:measure.endTick,startTimeMs:measure.startTick,endTimeMs:measure.endTick,
      ...(bend&&!index?{bendRange:{min:60,max:64}}:{})}))}));
  const timeline={ticksPerQuarter:1000,endTick:measures.at(-1).endTick,tempoMap:[{tick:0,bpm:60,timeMs:0}],measures,events};
  let cursor=intro;
  const visits=measures.filter((_,index)=>!omit.includes(index+1)).map((measure,index)=>{
    if(index===1)cursor+=hold;
    const startSeconds=cursor;cursor++;
    return {visit:index+1,scoreMeasure:measure.measureNumber,occurrence:measure.occurrence,originalVisit:measure.playbackMeasureIndex+1,
      startSeconds,endSeconds:cursor,anchors:[{offset480:0,seconds:startSeconds},{offset480:480,seconds:cursor}]};
  });
  const explanations=[];
  if(intro)explanations.push({id:'intro',label:'Introduction',startSeconds:0,endSeconds:intro,boundary:{after:null,before:ref(visits[0])}});
  if(hold)explanations.push({id:'hold',label:'Explanation',startSeconds:visits[0].endSeconds,endSeconds:visits[1].startSeconds,boundary:{after:ref(visits[0]),before:ref(visits[1])}});
  if(ending)explanations.push({id:'ending',label:'Closing explanation',startSeconds:cursor,endSeconds:cursor+ending,boundary:{after:ref(visits.at(-1)),before:null}});
  const plan={format:'musical-visits-and-explanations',version:1,scoreSha256:hash,sourceSha256:hash,timingSha256:hash,recordingId:'synthetic',
    originalPlaybackOrder:order,musicalVisits:visits,explanations,repeatResolution:{kind:omit.length?'source-visit-plan':'unchanged',omittedOriginalVisits:omit}};
  const compiled=compileTimingPlan(plan,{timeline,scoreSha256:hash,recordingId:'synthetic',durationMs:(cursor+ending+2)*1000});
  return {timeline,events,compiled};
}
function setup(f=fixture(),{hex=false,loop=false}={}) {
  AppState.playbackTimeline=f.timeline;AppState.expectedEvents=f.events;
  AppState.tracks=[];AppState.mode='realtime';AppState.inputMode=hex?'hex-6ch':'single-channel';AppState.playbackSpeed=1;
  AppState.practiceLoop={enabled:loop,range:null};AppState.isPlaying=true;AppState.tickPosition=0;
  AppState.media={preview:true,returning:false,editing:false,points:[],timingPlan:f.compiled,clock:{timeMs:0,at:0,playing:true}};
  AppState.trainer.latencyMs=0;AppState.heldNoteTolerance='one';AppState.filterHexSpikes=false;AppState.filterScoreRange=false;
  AppState.allowWrittenBendRanges=true;AppState.midi.ignoreBriefErrors=false;
  resetRealtimeSession('test',0);return f;
}
function sample(time,tick,{seek=false,transition=false,mediaSeekChanged=false}={}) {
  AppState.media.clock={timeMs:time,at:time,playing:true};AppState.tickPosition=tick;
  handlePlaybackPosition({currentTick:tick,at:time,speed:AppState.playbackSpeed,isSeek:seek,isPlanTransition:transition,mediaSeekChanged});
}
const note=(midi,at,channel=1)=>({type:'note-on',midi,channel,stringHint:channel,at});

test('practice projections preserve original identity and native ticks while separating hold boundaries and omitted visits',()=>{
  const f=setup(),original=structuredClone(f.events),events=practiceEvents(AppState);
  assert.deepEqual(events.map(event=>event.id),['event-0','event-1','event-4']);
  assert.deepEqual(events.map(event=>event.startTick),[0,1000,4000]);
  assert.deepEqual(events.map(event=>[event.startTimeMs,event.endTimeMs,event.targetEndTimeMs]),[[500,1500,1500],[3500,4500,4500],[4500,5500,5500]]);
  assert.equal(events[0].notes[0].endTimeMs,1500);
  assert.deepEqual(events.map(event=>event.practiceBreakBefore),[false,true,true]);
  assert.equal(practiceTimeAtTick(AppState,1000,0,'end'),1500);
  assert.equal(practiceTimeAtTick(AppState,1000,0,'start'),3500);
  assert.equal(practicePlanPosition(AppState,4500).section.startTick,4000);
  assert.deepEqual(f.events,original);
  AppState.media.preview=false;assert.equal(practiceEvents(AppState),f.events);
  assert.equal(practiceTimeAtTick(AppState,1000,123),123,'synth timing returns unchanged');
});

test('musical range excludes explicit introductions and endings; holds suppress grading even with a loop enabled',()=>{
  const f=setup();
  assert.deepEqual(recordingScoreRange([],f.timeline,Infinity,f.compiled),{start:500,end:5500});
  for(const loop of [false,true]) {
    setup(f,{loop});
    for(const time of [-1,0,499,1500,3499,5500,5999,6000])assert(outsideRecordingScore(AppState,time),String(time));
    for(const time of [500,1499,3500,5499])assert.equal(outsideRecordingScore(AppState,time),false,String(time));
    sample(0,0);handleMidiEvent(note(99,0));assert.equal(AppState.trainer.results.wrong,0);
    sample(500,0);handleMidiEvent(note(60,500));assert.equal(AppState.trainer.results.correct,1);
    sample(1500,996);const before=structuredClone(AppState.trainer.results);
    handleMidiEvent(note(99,1500));handleMidiEvent({type:'pitch-bend',channel:1,bendValue:8191,at:1500});advanceRealtimeClock(1500);
    assert.deepEqual(AppState.trainer.results,before);assert.deepEqual(AppState.activeTargets,[]);
    sample(3500,1000,{seek:true,transition:true});handleMidiEvent(note(64,3500));
    assert.equal(AppState.trainer.results.correct,2);assert.equal(AppState.trainer.results.wrong,0);
    sample(4500,4000,{seek:true,transition:true});handleMidiEvent(note(64,4500));
    assert.equal(AppState.trainer.results.correct,3);assert.equal(AppState.trainer.results.total,3);
    sample(5500,4996);handleMidiEvent(note(99,5500));assert.equal(AppState.trainer.results.correct,3);assert.equal(AppState.trainer.results.wrong,0);
  }
});

test('an automatic jump over an unsampled explanation preserves results, while a manual seek starts a new attempt',()=>{
  setup();sample(500,0);handleMidiEvent(note(60,500));
  sample(3500,1000,{seek:true,transition:true});assert.equal(AppState.trainer.results.correct,1);
  handleMidiEvent(note(64,3500));assert.equal(AppState.trainer.results.correct,2);
  sample(500,0,{seek:true});assert.equal(AppState.trainer.results.correct,0);assert.equal(AppState.trainer.sessionReason,'seek-or-speed-change');
});

test('a missed musical target settles on hold entry without missing the first target after it',()=>{
  setup();sample(500,0);sample(1500,996);
  assert.equal(AppState.trainer.results.missed,1);assert.equal(AppState.trainer.results.pending,2);
  sample(3499,996);handleMidiEvent(note(64,3499));assert.equal(AppState.trainer.results.correct,0);
  sample(3500,1000,{seek:true,transition:true});handleMidiEvent(note(64,3500));
  assert.equal(AppState.trainer.results.correct,1);assert.equal(AppState.trainer.results.missed,1);
});

test('a manual seek into an explanation starts at the next music without marking the held preceding cursor missed',()=>{
  setup();sample(500,0);handleMidiEvent(note(60,500));
  sample(2500,996,{seek:true});assert.equal(AppState.trainer.results.correct,0);assert.equal(AppState.trainer.results.total,2);
  sample(3500,1000,{seek:true,transition:true});handleMidiEvent(note(64,3500));
  assert.equal(AppState.trainer.results.correct,1);assert.equal(AppState.trainer.results.missed,0);
});

test('an explicit recording seek restores the first target even when its native acknowledgement already used the same tick',()=>{
  setup();AppState.isPlaying=false;
  AppState.media.clock={timeMs:2500,at:2500,playing:false};AppState.tickPosition=996;
  resetRealtimeSession('sync-editor-closed',996);
  assert.equal(AppState.trainer.results.total,2,'finishing Preview within commentary excludes earlier music');
  sample(500,1);
  assert.equal(AppState.trainer.sessionReason,'sync-editor-closed');assert.equal(AppState.trainer.results.total,2);
  sample(500,1,{seek:true,mediaSeekChanged:true});
  assert.equal(AppState.trainer.sessionReason,'seek-or-speed-change');assert.equal(AppState.trainer.results.total,3);
  AppState.isPlaying=true;sample(500,1);
  const result=handleMidiEvent(note(60,500));
  assert.equal(result.type,'correct');assert.equal(result.eventId,'event-0');
  assert.equal(AppState.trainer.results.correct,1);assert.equal(AppState.trainer.results.wrong,0);
});

test('Realtime clears held chord evidence across holds and omitted visits in Poly and Hex',()=>{
  for(const hex of [false,true])for(const hold of [0,0.02]) {
    const f=fixture({order:hold?[1,2]:[1,1,2],omit:hold?[]:[2],hold,intro:0,ending:0,chord:true});setup(f,{hex});
    sample(900,900);handleMidiEvent(note(60,900,1));handleMidiEvent(note(64,905,2));
    const next=f.compiled.visits[1],time=next.startMs;
    sample(time,next.startTick,{seek:true,transition:true});handleMidiEvent(note(60,time,1));
    sample(time+60,next.startTick+60);advanceRealtimeClock(time+60);
    assert.equal(AppState.trainer.results.correct,3);assert.equal(AppState.trainer.results.pending,1);
    handleMidiEvent(note(64,time+60,2));assert.equal(AppState.trainer.results.correct,4);
    assert.equal(AppState.trainer.results.supportedHeld??0,0);assert.equal(AppState.trainer.results.wrong,0);
  }
});

test('the first attack after a short hold is not consumed as a previous bend continuation',()=>{
  for(const hex of [false,true]) {
    const f=fixture({order:[1,2],omit:[],hold:0.02,intro:0,ending:0,bend:true});setup(f,{hex});
    sample(900,900);handleMidiEvent(note(60,900));
    sample(995,995);handleMidiEvent({type:'note-off',midi:60,channel:1,at:995});
    sample(1020,1000,{seek:true,transition:true});const result=handleMidiEvent(note(64,1020));
    assert.equal(result.type,'correct');assert.equal(result.eventId,'event-1');assert.equal(AppState.trainer.results.correct,2);
  }
});

test('saved latency compensation still accepts the first resumed attack without accepting input inside the hold',()=>{
  for(const speed of [0.5,1,1.5]) {
    setup(fixture({order:[1,2],omit:[],hold:0.02,intro:0,ending:0}));
    AppState.trainer.latencyMs=30;AppState.playbackSpeed=speed;resetRealtimeSession('latency-test',0);
    sample(900,900);handleMidiEvent(note(60,900));
    sample(1019,996);handleMidiEvent(note(64,1019));assert.equal(AppState.trainer.results.correct,1);
    sample(1020,1000,{seek:true,transition:true});const result=handleMidiEvent(note(64,1020));
    assert.equal(result.type,'correct');assert.equal(result.deltaMs,-30);assert.equal(AppState.trainer.results.correct,2);
    assert.equal(AppState.trainer.results.wrong,0);
  }
});

test('Wait silently gates only included attacks and clears chord/bend evidence without discarding prior records',()=>{
  for(const hex of [false,true])for(const chord of [false,true]) {
    const f=setup(fixture({hold:0.02,intro:0,ending:0,chord,bend:!chord}),{hex});
    const seeks=[];let state;
    const controller=new WaitController({acquire(){},hold:tick=>seeks.push(tick),pause(){},release(){},finish(){}},value=>state=value,()=>0);
    controller.configure(practiceEvents(AppState),f.compiled.visits.at(-1).endTick,hex,false,{filterHexSpikes:false});controller.start(0);
    controller.noteOn(note(60,0,1));if(chord)controller.noteOn(note(64,5,2));
    assert.equal(state.currentEvent.id,'event-1');assert.equal(controller.session.held.size,0);assert.equal(controller.session.bendGestures.notes.size,0);
    controller.noteOn(note(chord?60:64,20,1));controller.advance(220);
    if(chord){assert.equal(state.currentEvent.id,'event-1');assert.equal(state.results.pending,3);controller.noteOn(note(64,225,2));}
    assert.equal(state.currentEvent.id,'event-4');assert.equal(controller.session.held.size,0);
    controller.noteOn(note(chord?60:64,240,1));if(chord)controller.noteOn(note(64,245,2));
    assert.deepEqual(seeks,[0,1000,4000]);assert.equal(state.phase,'complete');assert.equal(state.results.wrong,0);
    assert.equal(state.results.correct,chord?6:3);assert.equal(state.results.supportedHeld??0,0);
  }
});

test('loop endpoints project to included native visits and omitted-only ranges are rejected without mutation',()=>{
  setup();
  const range={startTick:2000,endTick:5000};assert.deepEqual(planPracticeRange(AppState,range),{startTick:4000,endTick:5000});
  assert.deepEqual(range,{startTick:2000,endTick:5000});
  assert.deepEqual(planPracticeRange(AppState,{startTick:0,endTick:4000}),{startTick:0,endTick:2000});
  assert.deepEqual(planPracticeRange(AppState,{startTick:0,endTick:5000}),{startTick:0,endTick:5000});
  assert.equal(planPracticeRange(AppState,{startTick:2000,endTick:4000}),null);
  AppState.media.preview=false;assert.equal(planPracticeRange(AppState,range),range);
});

test('unmatched source rests suppress MIDI and preserve the first resumed attack with looping enabled',()=>{
  const f=fixture(),plan=structuredClone(f.compiled.plan);
  plan.format='musical-visits-and-intervals';plan.intervals=plan.explanations.map(interval=>({...interval,kind:'unmatched-source-rest'}));
  delete plan.explanations;plan.scoreOmissions=[];
  f.timeline.ambiguousHoldEvidenceComplete=true;f.timeline.ambiguousHoldRanges=[];
  f.compiled=compileTimingPlan(plan,{timeline:f.timeline,scoreSha256:hash,recordingId:'synthetic',durationMs:8000});setup(f,{loop:true});
  sample(500,0);handleMidiEvent(note(60,500));sample(1500,996);
  assert.equal(practicePlanPosition(AppState).kind,'unmatched-source-rest');
  handleMidiEvent(note(99,1500));advanceRealtimeClock(1500);
  assert.equal(AppState.trainer.results.correct,1);assert.equal(AppState.trainer.results.wrong,0);assert.equal(AppState.trainer.results.missed,0);
  sample(3500,1000,{seek:true,transition:true});assert.equal(handleMidiEvent(note(64,3500)).type,'correct');
  assert.equal(AppState.trainer.results.correct,2);
});
