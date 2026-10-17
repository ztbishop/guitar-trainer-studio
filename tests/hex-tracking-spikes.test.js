import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {readPracticePreferences,savePracticePreferences} from '../js/practice-preferences.js';
import {AppState} from '../js/app-state.js';
import {startMidiCapture,stopMidiCapture,captureMidiEvent,captureMidiOutcome,captureFeedbackView,markMidiSnapshot,midiCaptureReport} from '../js/midi-capture.js';

const chord=(id='a',midi=55)=>({id,startTick:0,stringCount:6,notes:[{id:id+'4',midi,string:4},{id:id+'2',midi:64,string:2}]});
const on=(midi,at=0,velocity=10,channel=4)=>({type:'note-on',midi,at,velocity,channel,stringHint:channel});
const off=(midi,at,channel=4)=>({type:'note-off',midi,at,channel});
const session=(options={})=>new WaitSession([chord()],{hex:true,...options});

test('captured E7 fret 15 and Cmaj7 fret 25 patterns lose only their confirmed spike penalties',()=>{
  for(const [expected,wrong,duration,delay] of [[56,65,45.1,192.1],[55,76,58.9,62.9]]) {
    const s=new WaitSession([chord('a',expected)],{hex:true});
    s.noteOn(0,on(wrong));assert.equal(s.stats().wrong,1,'no unconditional early rejection');
    s.noteOff(off(wrong,duration));const result=s.noteOn(0,on(expected,delay,100));
    assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,1);
    assert.equal(result.trackingSpike.durationMs,duration);assert.equal(result.trackingSpike.followMs,delay);
    assert.equal(s.feedbackHistory()[0].wrongNotes.length,0);assert.equal(s.feedbackHistory()[0].trackingSpikes.length,1);
    s.noteOn(0,on(64,delay+10,100,2));assert.equal(s.stats().accuracy,100);
  }
});

for(const [name,changes] of Object.entries({
  loud:{velocity:77},sustained:{duration:71},late:{delay:201},adjacent:{wrong:56},
  'no release':{release:false},'different channel':{channel:3},'still wrong':{correct:54},
  'soft follow-up':{followVelocity:15},'unknown mapping':{stringHint:null},'missing velocity':{velocity:undefined},
  'wrong written string':{stringHint:3},'Poly input':{hex:false},'disabled filter':{filterHexSpikes:false},
  'missing release timestamp':{duration:undefined},'out-of-order release':{duration:-1},
}))test(`spike tolerance retains the error for ${name}`,()=>{
  const c={wrong:76,velocity:10,duration:60,delay:80,release:true,channel:4,correct:55,followVelocity:100,stringHint:4,...changes};
  const s=session(c);s.noteOn(0,{...on(c.wrong),velocity:c.velocity,stringHint:c.stringHint});
  if(c.release)s.noteOff(off(c.wrong,c.duration));
  s.noteOn(0,on(c.correct,c.delay,c.followVelocity,c.channel));assert.equal(s.stats().wrong,c.correct===54?2:1);
});

test('short soft correct notes and high written pitches remain valid; ordinary errors are never octave-folded',()=>{
  const s=new WaitSession([chord('high',100)],{hex:true});s.noteOn(0,on(100,0,5));s.noteOff(off(100,3));
  assert.equal(s.stats().correct,1);assert.equal(s.stats().wrong,0);
  const low=session();low.noteOn(0,on(76));low.noteOff(off(76,3));assert.equal(low.stats().wrong,1);
});

test('an intervening same-channel attack consumes the candidate, while other channels do not',()=>{
  const s=session();s.noteOn(0,on(76));s.noteOff(off(76,20));s.noteOn(0,on(75,30,100));s.noteOff(off(75,40));
  s.noteOn(0,on(55,50,100));assert.equal(s.stats().wrong,2);
  const independent=session();independent.noteOn(0,on(76));independent.noteOn(0,on(65,10,127,2));
  independent.noteOff(off(76,40));independent.noteOn(0,on(55,60,100));
  assert.equal(independent.stats().wrong,1,'only the confirmed channel-4 penalty is removed');
});

test('bend-updated spike retains its raw identity and cannot double-remove a bend correction',()=>{
  const s=session();s.noteOn(0,on(76));s.pitchBend({channel:4,bendValue:-682,at:18},18,0);
  s.noteOff(off(76,58.9));s.pitchBend({channel:4,bendValue:0,at:62.9},62.9,0);
  const result=s.noteOn(0,on(55,62.9,100));assert.equal(s.stats().wrong,0);
  assert.equal(result.trackingSpike.rawMidi,76);assert.equal(result.trackingSpike.fromMidi,75);
  const bent=new WaitSession([chord('b',55)],{hex:true});bent.noteOn(0,on(64));
  bent.pitchBend({channel:4,bendValue:-6144,at:10},10,0);assert.equal(bent.stats().wrong,0);
  bent.noteOff(off(64,30));bent.noteOn(0,on(55,50,100));assert.equal(bent.stats().wrong,0);
  assert.equal(bent.feedbackHistory()[0].trackingSpikes.length,0);
});

test('candidates cannot cross targets or Together retries',()=>{
  const s=new WaitSession([chord(),chord('b')],{hex:true});s.noteOn(0,on(76));s.noteOff(off(76,30));
  s.noteOn(1,on(55,60,100));assert.equal(s.stats().wrong,1);
  const retry=session({chordMode:'together',chordWindowMs:50});retry.noteOn(0,on(64,0,100,2));
  retry.noteOn(0,on(76,10));retry.noteOff(off(76,30));retry.expire(0,61);
  retry.noteOn(0,on(55,70,100));assert.equal(retry.stats().wrong,1);assert.equal(retry.stats().retries,1);
});

test('controller completion stays immediate and pause clears candidates on its adjusted clock',()=>{
  let state,time=0;const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},v=>state=v,()=>time);
  c.configure([chord()],480,true);c.start();c.noteOn(on(76));c.noteOn(off(76,60));c.noteOn(on(55,80,100));
  c.noteOn(on(64,90,100,2));assert.equal(state.phase,'complete');assert.equal(state.results.wrong,0);
  c.start();c.noteOn(on(76));time=20;c.toggle();time=1020;c.toggle();
  c.noteOn(off(76,1040));c.noteOn(on(55,1060,100));assert.equal(state.results.wrong,1);
  c.newAttemptHere();assert.equal(c.session.spikeCandidates.size,0);
  c.start();time=1100;c.toggle();time=2100;c.toggle();
  c.noteOn(on(76,2200));c.noteOn(off(76,2250));c.noteOn(on(55,2270,100));
  assert.equal(state.results.wrong,0,'release duration uses the same pause-adjusted clock');
});

test('diagnostics retain raw spike and original wrong outcome plus an explicit correction',()=>{
  AppState.mode='wait';AppState.expectedEvents=[chord()];AppState.waitTrainer={currentEvent:chord()};
  const s=session();startMidiCapture();
  try {
    const spike={...on(76,performance.now()),raw:[0x93,76,10]},row=captureMidiEvent(spike,{accepted:true});
    captureMidiOutcome(row,s.noteOn(0,spike));s.noteOff(off(76,spike.at+50));
    const correct={...on(55,spike.at+70,100),raw:[0x93,55,100]},next=captureMidiEvent(correct,{accepted:true});
    captureMidiOutcome(next,s.noteOn(0,correct));
    captureFeedbackView([],{history:s.feedbackHistory(),results:s.stats()});markMidiSnapshot();
    const report=midiCaptureReport();assert.deepEqual(report.events[0].raw,[0x93,76,10]);
    assert.equal(report.events[0].grading.type,'wrong');assert.equal(report.events[1].grading.trackingSpike.rawMidi,76);
    assert.equal(report.snapshots[0].view.trackingSpikes[0].corrections.length,1);
  }finally{stopMidiCapture();}
});

test('tracking preference defaults on, saves false, and rejects nonboolean values',()=>{
  let value=null;const storage={getItem(){return value;},setItem(_,text){value=text;}};
  assert.equal(readPracticePreferences(storage).filterHexSpikes,true);
  savePracticePreferences({mode:'wait',ui:{},waitChord:{},filterHexSpikes:false},storage);
  assert.equal(readPracticePreferences(storage).filterHexSpikes,false);
  value='{"filterHexSpikes":"false"}';assert.equal(readPracticePreferences(storage).filterHexSpikes,true);
});
