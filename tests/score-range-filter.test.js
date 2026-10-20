import test from 'node:test';
import assert from 'node:assert/strict';
import {outsideScoreRange} from '../js/score-range-filter.js';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {readPracticePreferences,savePracticePreferences} from '../js/practice-preferences.js';
const staves=[{tuning:[64,59,55,50,45,40],capo:0,transpositionPitch:0}];
const single={id:'m5',startTick:0,staffIndex:0,notes:[{id:'a',midi:69,string:1,fret:5}]};
const chord={id:'repeat5',startTick:100,notes:[{id:'a',midi:60,string:4,fret:10},{id:'b',midi:65,string:3,fret:10},{id:'c',midi:69,string:2,fret:10},{id:'d',midi:76,string:1,fret:12}]};
const on=(midi,stringHint=5)=>({type:'note-on',midi,stringHint,channel:stringHint,velocity:80,at:0});

test('Hex rejects captured distant positions only with opt-in and keeps the boundary',()=>{
  const s=new WaitSession([single],{hex:true,filterScoreRange:true,rangeStaves:staves});
  const result=s.noteOn(0,on(57));assert.equal(result.type,'ignored-score-range');
  assert.equal(result.range.positions[0].fret,12);assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,0);
  assert.equal(s.noteOn(0,on(56)).type,'ignored-score-range');
  assert.equal(s.noteOn(0,on(55)).type,'wrong','fret 10 is within the five-fret margin');
  for(const options of [{},{filterScoreRange:false}]) {
    const strict=new WaitSession([single],{hex:true,rangeStaves:staves,...options});
    assert.equal(strict.noteOn(0,on(57)).type,'wrong');
  }
  const repeat=new WaitSession([chord],{hex:true,filterScoreRange:true,rangeStaves:staves});
  assert.equal(repeat.noteOn(0,on(78,3)).type,'ignored-score-range');
});

test('Poly retains any plausible string assignment and never assumes a detected position',()=>{
  assert.equal(outsideScoreRange(single,on(57),staves,{hex:false}),null,'A3 fits other strings');
  assert.equal(outsideScoreRange(chord,on(78,3),staves,{hex:false}),null,'F#5 fits first string fret 14');
  const result=outsideScoreRange(single,on(100),staves,{hex:false});
  assert.equal(result.positions.length,6);assert.equal(result.basis,'written-score');
  const s=new WaitSession([single],{filterScoreRange:true,rangeStaves:staves});
  assert.equal(s.noteOn(0,on(100)).type,'ignored-score-range');assert.equal(s.noteOn(0,on(57)).type,'wrong');
});

test('written targets, nearby mistakes and open strings remain eligible; missing geometry fails open',()=>{
  for(const [event,note,staff] of [[single,on(69,1),staves],[chord,on(59,2),staves],
    [single,on(100),[]],[{...single,isPercussive:true},on(100),staves],
    [{...single,notes:[{id:'bad',midi:69,string:-1,fret:-1}]},on(100),staves],
    [single,on(100),[{...staves[0],isPercussion:true}]],
    [single,on(100),[{...staves[0],capo:1}]]])assert.equal(outsideScoreRange(event,note,staff,{hex:true}),null);
  assert.equal(outsideScoreRange(single,{midi:100},staves,{hex:true}),null,'unknown Hex mapping');
  const adjusted=[{...staves[0],capo:2,transpositionPitch:1}];
  const event={...single,notes:[{id:'a',midi:70,string:1,fret:5}]};
  assert.equal(outsideScoreRange(event,on(58),adjusted,{hex:true}).positions[0].fret,12);
  const openShape={id:'open',notes:[{id:'open1',midi:64,string:1,fret:0},{id:'f',midi:65,string:3,fret:10}]};
  assert.equal(outsideScoreRange(openShape,on(100),staves,{hex:true}).minFret,5,'open strings do not lower the fretted shape');
});

test('range filter controller uses each target and survives attempts while clearing on configuration',()=>{
  const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}});
  c.configure([single,chord],200,true,false,{filterScoreRange:true,rangeStaves:staves});c.start();
  assert.equal(c.noteOn(on(57)).type,'ignored-score-range');c.noteOn(on(69,1));
  assert.equal(c.index,1);assert.equal(c.noteOn(on(78,3)).type,'ignored-score-range');
  c.newAttemptHere();assert.equal(c.noteOn(on(78,3)).type,'ignored-score-range');
  c.configure([single],200,true);c.start();assert.equal(c.noteOn(on(57)).type,'wrong');
});

test('score-range preference defaults off and independently persists validated booleans',()=>{
  let saved=null;const store={getItem(){return saved},setItem(_,s){saved=s}};
  assert.equal(readPracticePreferences(store).filterScoreRange,false);
  savePracticePreferences({mode:'wait',ui:{},waitChord:{},filterScoreRange:true},store);
  assert.equal(readPracticePreferences(store).filterScoreRange,true);
  saved='{"filterScoreRange":"true"}';assert.equal(readPracticePreferences(store).filterScoreRange,false);
});
import {AppState} from '../js/app-state.js';
import {startMidiCapture,stopMidiCapture,captureMidiEvent,captureMidiOutcome,midiCaptureReport} from '../js/midi-capture.js';

test('ignored range input retains raw MIDI, enabled settings and the explicit estimated range',()=>{
  AppState.mode='wait';AppState.filterScoreRange=true;AppState.filterHexSpikes=true;
  AppState.waitTrainer={currentEvent:single};AppState.expectedEvents=[single];
  const s=new WaitSession([single],{hex:true,filterScoreRange:true,rangeStaves:staves});
  startMidiCapture();
  try {
    const note={...on(57),at:performance.now(),raw:[148,57,10]};
    const row=captureMidiEvent(note,{accepted:true});captureMidiOutcome(row,s.noteOn(0,note));
    const evidence=midiCaptureReport().events[0];assert.deepEqual(evidence.raw,[148,57,10]);
    assert.equal(evidence.filterScoreRange,true);assert.equal(evidence.filterHexSpikes,true);
    assert.equal(evidence.grading.type,'ignored-score-range');assert.equal(evidence.grading.range.basis,'written-score');
    assert.equal(evidence.grading.range.positions[0].fret,12);
  }finally{stopMidiCapture();AppState.filterScoreRange=false;}
});
