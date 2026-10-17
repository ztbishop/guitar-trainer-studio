import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {AppState} from '../js/app-state.js';
import {initMidiRouter,setActiveMidiInput,clearActiveMidiNotes} from '../js/midi-router.js';
import {startMidiCapture,stopMidiCapture,midiCaptureReport,captureFeedbackView} from '../js/midi-capture.js';

const chord=(id='a',pitches=[45,55,60,64])=>({id,startTick:0,stringCount:6,notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:[6,4,3,2][i]}))});
const on=(midi,channel,at)=>({type:'note-on',midi,channel,stringHint:channel,at});
const release=(s,midi,channel)=>s.noteOff({midi,channel});
function play(s,index,pitches=[45,55,60,64],start=0) {
  return pitches.map((p,i)=>s.noteOn(index,on(p,[6,4,3,2][i],start+i*20)));
}
function repeated(options={}) {
  const s=new WaitSession([chord(),chord('b'),chord('c')],{hex:true,...options});
  play(s,0);for(const [p,c] of [[45,6],[55,4],[60,3]])release(s,p,c);
  play(s,1,[45,55,60],500);return s;
}

test('three fresh tones plus a still-held previous E recognize a repeated Hex chord after the late-note gap',()=>{
  const s=repeated();assert.equal(s.settle(1,699),null);
  const result=s.settle(1,700);assert.equal(result.type,'supported-held-tone');assert.equal(result.complete,true);
  assert.equal(s.stats().supportedHeld,1);assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,8);
  assert.deepEqual(s.feedbackHistory()[1].supportedHeldNotes,[{midi:64,channel:2,noteIds:['b:3'],evidence:'held',freshAttack:false}]);
  assert.equal(s.settle(1,701),null,'settlement cannot advance twice');
});

test('held support never progresses without fresh evidence and cannot chain indefinitely',()=>{
  const s=repeated();s.settle(1,700);
  for(const [p,c] of [[45,6],[55,4],[60,3]])release(s,p,c);
  play(s,2,[45,55,60],1000);assert.equal(s.settle(2,1200),null);
  const idle=new WaitSession([chord(),chord('b')],{hex:true});play(idle,0);
  assert.equal(idle.settle(1,10000),null);
  release(idle,45,6);idle.noteOn(1,on(45,6,11000));assert.equal(idle.settle(1,12000),null);
});

for(const mode of ['release','replacement','bend','wrong'])test(`${mode} invalidates the proposed held tone before settlement`,()=>{
  const s=repeated();
  if(mode==='release')release(s,64,2);
  if(mode==='replacement'||mode==='wrong')s.noteOn(1,on(65,2,570));
  if(mode==='bend')s.pitchBend({channel:2,bendValue:2048});
  assert.equal(s.settle(1,700),null);
  assert.equal(s.stats().supportedHeld,0);
  if(mode==='wrong') {
    assert.equal(s.records[1].wrongNotes[0].midi,65);
    assert.equal(s.noteOn(1,on(64,2,720)).complete,true);
    assert.equal(s.stats().wrong,1);
  }
});

test('measure-4 fret 7 remains wrong even when fret 6 from the prior Bm chord is still held',()=>{
  const pitches=[47,57,62,65],s=new WaitSession([chord('a',pitches),chord('b',pitches)],{hex:true});
  play(s,0,pitches);play(s,1,pitches.slice(0,3),500);
  assert.equal(s.settle(1,599),null);s.noteOn(1,on(66,2,590));
  assert.equal(s.settle(1,700),null);assert.equal(s.records[1].wrongNotes[0].midi,66);
  s.noteOn(1,on(65,2,720));assert.equal(s.feedbackHistory()[1].outcome,'completed-with-errors');
});

test('new chords, Poly, Together, first targets, unsupported strings and two missing tones stay attack-based',()=>{
  for(const options of [{hex:false},{chordMode:'together'}])assert.equal(repeated(options).settle(1,700),null);
  for(const mutate of [s=>s.events[1].stringCount=7,s=>s.records[1].slots[0].midi=46,s=>s.records[1].slots[1].hit=false,s=>s.events[0].isPercussive=true]) {
    const s=repeated();mutate(s);assert.equal(s.settle(1,700),null);
  }
  const first=new WaitSession([chord()],{hex:true});play(first,0,[45,55,60]);assert.equal(first.settle(0,1000),null);
});

test('fresh notes must belong to one short multi-channel gesture; arpeggios and reused channels do not supply support',()=>{
  const s=new WaitSession([chord(),chord('b')],{hex:true});play(s,0);
  s.noteOn(1,on(45,6,500));s.noteOn(1,on(55,4,900));s.noteOn(1,on(60,3,1300));assert.equal(s.settle(1,1400),null);
  const reused=repeated();reused.records[1].slots[1].channel=6;assert.equal(reused.settle(1,700),null);
  assert.equal(repeated().settle(1,10000),null,'a delayed timer cannot resurrect an old gesture');
});

test('a fresh fourth note completes immediately, and a late wrong note inside the check cannot be hidden',()=>{
  const complete=repeated();assert.equal(complete.noteOn(1,on(64,2,580)).complete,true);
  assert.equal(complete.stats().supportedHeld,0);
  const late=repeated();assert.equal(late.settle(1,650),null);
  late.noteOn(1,on(66,2,670));assert.equal(late.settle(1,750),null);
  assert.equal(late.stats().wrong,1);assert.equal(late.stats().supportedHeld,0);
});

test('controller settles once through its active clock; pause and new attempts discard held support',()=>{
  let state,time=0;const calls=[];
  const c=new WaitController({acquire(){},hold:t=>calls.push(t),pause(){},release(){},finish(){}},s=>state=s,()=>time);
  c.configure([chord(),{...chord('b'),startTick:480}, {...chord('c'),startTick:960}],1440,true);c.start();
  for(const [i,p] of [45,55,60,64].entries())c.noteOn(on(p,[6,4,3,2][i],i*20));
  for(const [i,p] of [45,55,60].entries())c.noteOn(on(p,[6,4,3][i],500+i*20));
  c.advance(699);assert.equal(state.currentEvent.id,'b');c.advance(700);
  assert.equal(state.currentEvent.id,'c');assert.equal(state.results.supportedHeld,1);
  assert.match(state.summary,/reattack unverified/);c.advance(701);assert.equal(calls.length,3);
  time=800;c.toggle();assert.equal(c.session.held.size,0);
  c.newAttemptHere();assert.equal(c.session.held.size,0);assert.equal(state.results.supportedHeld,0);
});

test('raw MIDI boundary preserves every delivered message and keeps recording independent of routing',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  let receive;const input={id:'audit',name:'Audit port',addEventListener:(_,fn)=>receive=fn,removeEventListener(){}};
  const messages=[[0x95,45,90],[0x94,55,90],[0x95,45,100],[0x85,45,0],[0x95,45,100],[0x95,45,0],[0x9f,57,90],[0xe2,0,64],[0xb2,1,10]];
  try {
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{requestMIDIAccess:async()=>({inputs:new Map([[input.id,input]])})}});
    Object.assign(AppState,{mode:'wait',inputMode:'hex-6ch'});Object.assign(AppState.midi,{activeInputId:'',hexChannelBase:6,hexChannelReverse:true});
    const runs=[];
    for(const recording of [false,true]) {
      const delivered=[];await initMidiRouter({onMidiEvent:e=>{delivered.push([e.type,e.channel,e.midi]);return null;}});setActiveMidiInput(input.id);AppState.inputMode='hex-6ch';Object.assign(AppState.midi,{hexChannelBase:6,hexChannelReverse:true});clearActiveMidiNotes();
      if(recording)startMidiCapture();else stopMidiCapture();
      messages.forEach((data,i)=>receive({data,timeStamp:performance.now()+i}));runs.push(delivered);
      if(recording) {
        captureFeedbackView([],{history:[{eventId:'b',supportedHeldNotes:[{midi:64,freshAttack:false}]}]});stopMidiCapture();
        const report=midiCaptureReport();assert.deepEqual(report.events.map(e=>e.raw),messages);
        assert.ok(report.events.every(e=>Number.isFinite(e.dispatchDelayMs)&&e.dispatchDelayMs>=0&&Number.isFinite(e.handlerDurationMs)&&e.handlerDurationMs>=0));
        assert.equal(report.events[2].grading.type,'ignored-held-duplicate');assert.equal(report.events[6].accepted,false);
        assert.equal(report.snapshots[0].view.heldSupport[0].notes[0].freshAttack,false);
      }
    }
    assert.deepEqual(runs[0],runs[1]);assert.equal(runs[0].length,7);
  } finally {stopMidiCapture();if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});
