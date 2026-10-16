import test from 'node:test';
import assert from 'node:assert/strict';
import {MidiPitchState,readPitchRange,savePitchRange} from '../js/midi-pitch.js';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {AppState} from '../js/app-state.js';
import {startMidiCapture,stopMidiCapture,captureMidiEvent,captureMidiOutcome,captureFeedbackView,midiCaptureReport} from '../js/midi-capture.js';

const chord=(id='e7',pitches=[52,56,62,64])=>({id,startTick:0,stringCount:6,notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:[5,4,3,2][i]}))});
const on=(midi,channel,at)=>({type:'note-on',midi,channel,stringHint:channel,at});
const bend=(channel,bendValue,at)=>({type:'pitch-bend',channel,bendValue,at});
function harness(events=[chord(),{...chord('next'),startTick:480}],settings={}) {
  let state,time=0;const holds=[];
  const c=new WaitController({acquire(){},hold:t=>holds.push(t),pause(){},release(){},finish(){}},v=>state=v,()=>time);
  c.configure(events,960,true,false,settings);c.start();
  return {c,holds,get state(){return state;},set time(t){time=t;}};
}

test('confirmed ±12 interprets both captured semitone corrections without score-based guessing',()=>{
  const p=new MidiPitchState(12);
  p.bend(bend(3,-682,0));const down=p.interpret(on(63,3,0));
  assert.equal(down.midi,62);assert.equal(down.rawMidi,63);assert.ok(Math.abs(down.soundingMidi-62)<.002);
  p.bend(bend(3,683,0));assert.equal(p.interpret(on(61,3,0)).midi,62);
  assert.equal(p.interpret(on(63,2,0)).midi,63,'other channels remain independent');
  for(const [range,expected] of [[0,63],[2,63],[24,61]]) {
    const state=new MidiPitchState(range);state.bend(bend(3,-682,0));assert.equal(state.interpret(on(63,3,0)).midi,expected);
  }
});

test('same-timestamp correction belongs to the original onset and removes its false wrong fret',()=>{
  const h=harness();h.c.noteOn(on(52,5,0));h.c.noteOn(on(56,4,20));h.c.noteOn(on(63,3,40));
  assert.equal(h.state.results.wrong,1);
  const fixed=h.c.noteOn(bend(3,-682,40));assert.equal(fixed.type,'pitch-corrected');assert.equal(fixed.complete,false);
  assert.equal(h.state.results.wrong,0);assert.equal(h.state.liveWrongNotes.length,0);
  h.c.noteOn(on(64,2,60));assert.equal(h.state.currentEvent.id,'next');
  assert.equal(h.state.history[0].outcome,'completed-clean');assert.equal(h.state.history[0].pitchCorrections[0].rawMidi,63);
  assert.equal(h.state.history[0].pitchCorrections[0].toMidi,62);
});

test('a correction arriving after the other chord tones completes the gate once without inventing a second attack',()=>{
  const h=harness();h.c.noteOn(on(52,5,0));h.c.noteOn(on(56,4,20));h.c.noteOn(on(63,3,40));h.c.noteOn(on(64,2,60));
  const fixed=h.c.noteOn(bend(3,-682,90));assert.equal(fixed.complete,true);
  assert.equal(h.state.currentEvent.id,'next');assert.equal(h.state.results.correct,4);assert.equal(h.state.results.wrong,0);
  h.c.noteOn(bend(3,-682,95));assert.equal(h.state.currentEvent.id,'next');assert.equal(h.holds.length,2);
});

test('persistent bend affects the next raw onset and raw Note-Off releases the corrected held pitch',()=>{
  const s=new WaitSession([chord('bm',[47,57,62,65]),chord('next',[47,57,62,65])],{hex:true});
  s.noteOn(0,on(47,6,0));s.noteOn(0,on(57,4,20));s.noteOn(0,on(61,3,40));s.noteOn(0,on(65,2,60));
  assert.equal(s.pitchBend(bend(3,683,68),68,0).complete,true);
  assert.equal(s.held.has('3:62'),true);s.noteOff({channel:3,midi:61});assert.equal(s.held.has('3:62'),false);
  const fresh=s.noteOn(1,on(61,3,500));assert.equal(fresh.type,'correct');assert.equal(fresh.midi,62);
});

for(const mode of ['unbent','late','released','disabled'])test(`${mode} wrong fret is retained`,()=>{
  const h=harness(undefined,{pitchBendRange:mode==='disabled'?0:12});h.c.noteOn(on(63,3,0));
  if(mode==='released')h.c.noteOn({type:'note-off',channel:3,midi:63,at:10});
  h.c.noteOn(bend(3,mode==='unbent'?0:-682,mode==='late'?61:20));
  h.c.advance(200);assert.equal(h.state.results.wrong,1);assert.equal(h.state.results.correct,0);
  assert.equal(h.state.history[0].wrongNotes[0].midi,63);
});

test('correcting a completed historical target cannot solve or seek the current target',()=>{
  const h=harness();h.c.noteOn(on(63,3,0));h.c.noteOn(on(52,5,5));h.c.noteOn(on(56,4,10));
  h.c.noteOn(on(62,6,15));h.c.noteOn(on(64,2,20));assert.equal(h.state.currentEvent.id,'next');
  h.c.noteOn(bend(3,-682,30));assert.equal(h.state.currentEvent.id,'next');assert.equal(h.holds.length,2);
  assert.equal(h.state.results.correct,4);assert.equal(h.state.results.wrong,0);
});

test('pause cancels onset correction eligibility while channel bend state survives normal pause/resume',()=>{
  const h=harness();h.c.noteOn(on(63,3,0));h.time=10;h.c.toggle();h.c.noteOn(bend(3,-682,15));
  assert.equal(h.state.results.wrong,1);h.time=1000;h.c.toggle();h.c.noteOn(bend(3,-682,1010));
  assert.equal(h.state.results.wrong,1);h.c.noteOn({type:'note-off',channel:3,midi:63,at:1011});
  h.c.noteOn(on(63,3,1020));assert.equal(h.state.results.correct,1);
});

test('Poly and ordinary short attacks keep their attack rules; the fret-26 spike is not silently filtered',()=>{
  const poly=new WaitSession([chord()]);poly.noteOn(0,on(63,3,0));poly.pitchBend(bend(3,-682,0),0,0);
  assert.equal(poly.stats().wrong,1);
  const s=new WaitSession([chord('cmaj',[48,55,59,64])],{hex:true});
  s.noteOn(0,{...on(76,4,0),velocity:10});s.pitchBend(bend(4,-682,3),3,0);s.noteOff({channel:4,midi:76});
  assert.equal(s.stats().wrong,1);assert.equal(s.records[0].wrongNotes[0].midi,75);
  assert.equal(s.records[0].wrongNotes[0].rawMidi,76);assert.equal(s.liveWrong.size,0);
  const short=new WaitSession([chord('one',[62])],{hex:true});assert.equal(short.noteOn(0,on(62,3,0)).complete,true);
  short.noteOff({channel:3,midi:62});assert.equal(short.stats().correct,1);
});

test('early bends also update a still-wrong pitch without adding attacks or forgiving it',()=>{
  const s=new WaitSession([chord()],{hex:true});s.noteOn(0,on(65,3,0));
  assert.equal(s.pitchBend(bend(3,683,20),20,0).type,'pitch-updated');
  assert.equal(s.stats().wrong,1);assert.equal(s.records[0].wrongNotes[0].midi,66);
  assert.equal(s.records[0].pitchCorrections[0].matched,false);
  s.pitchBend(bend(3,0,40),40,0);assert.equal(s.records[0].wrongNotes[0].midi,65);
  s.pitchBend(bend(3,-682,50),50,0);assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,1);
});

test('bend range saves independently, validates storage and defaults to the owner-confirmed ±12',()=>{
  let value=null;const store={getItem:()=>value,setItem:(_,v)=>value=v};
  assert.equal(readPitchRange(store),12);savePitchRange(2,store);assert.equal(readPitchRange(store),2);
  savePitchRange(0,store);assert.equal(readPitchRange(store),0);savePitchRange(99,store);assert.equal(readPitchRange(store),0);
  for(const bad of ['', 'null','13','12.0']){value=bad;assert.equal(readPitchRange(store),12);}
  assert.equal(readPitchRange({getItem(){throw Error();}}),12);
});

test('capture retains the raw wrong onset and records its later correction without rewriting MIDI evidence',()=>{
  const h=harness();AppState.mode='wait';AppState.inputMode='hex-6ch';AppState.expectedEvents=h.c.events;
  AppState.waitTrainer=h.state;startMidiCapture();
  const raw=on(63,3,performance.now());raw.raw=[146,63,127];raw.noteName='D#4';
  const first=captureMidiEvent(raw,{accepted:true});captureMidiOutcome(first,h.c.noteOn(raw));
  const correction={...bend(3,-682,raw.at+20),raw:[226,86,58]};
  const second=captureMidiEvent(correction,{accepted:true});captureMidiOutcome(second,h.c.noteOn(correction));
  captureFeedbackView([],{...h.state,history:h.c.session.feedbackHistory()});stopMidiCapture();
  const report=midiCaptureReport();assert.deepEqual(report.events[0].raw,[146,63,127]);
  assert.equal(report.events[0].grading.midi,63);assert.equal(report.events[0].grading.type,'wrong');
  assert.equal(report.events[1].grading.type,'pitch-corrected');assert.equal(report.events[1].grading.correction.toMidi,62);
  assert.equal(report.snapshots[0].view.pitchCorrections[0].corrections[0].rawMidi,63);
  assert.equal(h.state.results.wrong,0);assert.equal(h.state.results.correct,1);
});
