import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeAlphaTab} from './fretboard-fixtures.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {buildFretboardModel} from '../js/practice-visuals.js';
import {readPracticePreferences,savePracticePreferences} from '../js/practice-preferences.js';

const event=(id,pitches=[45,55,60,64],strings=[6,4,3,2],time=0)=>({id,stringCount:6,startTick:time*1.92,startTimeMs:time,notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:strings[i],fret:5}))});
const note=(midi,at=0,stringHint=6)=>({type:'note-on',midi,at,stringHint,channel:stringHint});
function realtime(events,options={}){const s=new RealtimeSession(events,options);s.started=true;return s;}

test('native X notes retain notation identity but create one unpitched attack; mixed X notes are optional',()=>{
  const at=nativeAlphaTab(),settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 120 . (5.6 5.4 5.3 5.2).4 (5.6 5.4 5.3 5.2).4 (5.6 5.4).4`,settings);
  const score=parser.readScore(),beats=score.tracks[0].staves[0].bars[0].voices[0].beats;
  beats[1].notes.forEach(n=>n.isDead=true);beats[2].notes[0].isDead=true;
  const midi=new at.midi.MidiFile(),gen=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));gen.generate();
  const timeline=buildPlaybackTimeline(gen.tickLookup),events=getPracticeEvents(timeline,'0');
  assert.equal(events[1].isPercussive,true);assert.equal(events[1].notes.length,4);assert.deepEqual(events[1].pitches,[]);
  assert.equal(events[2].isPercussive,false);assert.equal(events[2].notes.length,1);
  assert.equal(timeline.events[2].notes.length,2);assert.ok(timeline.events[1].notes.every(n=>n.isDead));
  for(const hex of [false,true]){
    const s=new WaitSession([events[1]],{hex});assert.equal(s.stats().total,1);
    const hit=s.noteOn(0,note(37));assert.equal(hit.complete,true);assert.equal(hit.noteIds.length,4);assert.equal(s.stats().wrong,0);
    const rt=realtime([events[1]],{hex});assert.equal(rt.noteOn(note(79),events[1].startTimeMs).type,'correct');
    assert.equal(rt.stats().total,1);assert.equal(rt.noteOn(note(48),events[1].startTimeMs+5).type,'ignored-strum-tail');
  }
  const model=buildFretboardModel({track:score.tracks[0],currentEvent:events[1]});assert.equal(model.targets.length,0);
});

test('Hex tolerance ignores omitted-string notes without crediting their pitches; Strict and Poly still grade them',()=>{
  const chord=event('a');
  for(const create of [opts=>new WaitSession([chord],opts),opts=>realtime([chord],opts)]){
    const hit=(s,n)=>s instanceof WaitSession?s.noteOn(0,n):s.noteOn(n,0);
    const tolerant=create({hex:true,allowMutedStringNoise:true});
    assert.equal(hit(tolerant,note(45,0,5)).type,'ignored-muted-string');assert.equal(tolerant.stats().correct,0);assert.equal(tolerant.stats().wrong,0);
    assert.equal(hit(tolerant,note(44,1,6)).type,'wrong');
    assert.equal(hit(create({hex:true}),note(48,0,5)).type,'wrong');
    assert.equal(hit(create({hex:false,allowMutedStringNoise:true}),note(48,0,5)).type,'wrong');
    assert.equal(hit(create({hex:true,allowMutedStringNoise:true}),note(48,0,null)).type,'wrong');
  }
});

test('tolerance stays strict for single-note targets and unsupported string layouts',()=>{
  for(const e of [event('a',[45],[6]),{...event('b'),stringCount:7}]){
    const s=new WaitSession([e],{hex:true,allowMutedStringNoise:true});assert.equal(s.noteOn(0,note(48,0,5)).type,'wrong');
  }
});

for(const hex of [false,true])test(`Wait protects the tail of a collected chord across the gate (${hex?'Hex':'Poly'})`,()=>{
  const s=new WaitSession([event('a'),event('b',[47,57,62,65])],{hex});
  s.noteOn(0,note(60,0,3));s.noteOn(0,note(64,30,2));
  s.noteOn(0,note(45,1000,6));assert.equal(s.noteOn(0,note(55,1080,4)).complete,true);
  assert.equal(s.noteOn(1,note(60,1110,3)).type,'ignored-strum-tail');
  assert.equal(s.noteOn(1,note(64,1140,2)).type,'ignored-strum-tail');assert.equal(s.stats().wrong,0);
  assert.equal(s.noteOn(1,note(47,1201,6)).type,'correct');
  assert.equal(s.noteOn(1,note(60,1240,3)).type,'wrong'); // genuine wrong upper tone of the new gesture
});

test('Wait repeated single notes and fresh repeated chords remain immediate; arbitrary wrong pitches are not forgiven',()=>{
  const single=new WaitSession([event('a',[60],[3]),event('b',[60],[3])]);
  single.noteOn(0,note(60,0,3));assert.equal(single.noteOn(1,note(60,20,3)).complete,true);
  const s=new WaitSession([event('a'),event('b')],{hex:true});
  for(const [i,p] of [45,55,60,64].entries())s.noteOn(0,note(p,i*20,[6,4,3,2][i]));
  assert.equal(s.noteOn(1,note(45,80,6)).type,'correct');
  assert.equal(s.noteOn(1,note(61,90,3)).type,'wrong');
});

test('one muted strum advances a controller once, not once per string, then accepts a new pitched gesture',()=>{
  const muted={...event('x'),isPercussive:true};let state;
  const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},s=>state=s);
  c.configure([muted,event('b')],1920,true);c.start();
  c.noteOn(note(40,0,6));assert.equal(state.currentEvent.id,'b');
  c.noteOn(note(48,20,4));c.noteOn(note(51,40,3));c.noteOn(note(69,60,2));
  assert.equal(state.results.wrong,0);assert.equal(state.results.correct,1);
  for(const [i,p] of [45,55,60,64].entries())c.noteOn(note(p,100+i*20,[6,4,3,2][i]));
  assert.equal(state.phase,'complete');assert.equal(state.results.correct,5);
});

for(const hex of [false,true])test(`Realtime finishes an active chord before a nearby matching future note (${hex?'Hex':'Poly'})`,()=>{
  const s=realtime([event('a',[60,64],[3,2],1000),event('b',[64],[2],1080)],{hex});
  s.noteOn(note(60,1000,3),1000);assert.equal(s.noteOn(note(64,1050,2),1050).eventId,'a');
  assert.equal(s.noteOn(note(64,1080,2),1080).eventId,'b');assert.equal(s.stats().correct,3);
});

test('short legitimate notes are not rejected or delayed in either mode',()=>{
  const events=[event('a',[60],[3],0),event('b',[60],[3],70)];
  const w=new WaitSession(events),r=realtime(events);
  assert.equal(w.noteOn(0,note(60,0,3)).complete,true);w.noteOff(note(60,10,3));assert.equal(w.noteOn(1,note(60,70,3)).complete,true);
  assert.equal(r.noteOn(note(60,0,3),0).type,'correct');r.noteOff(note(60,10,3));assert.equal(r.noteOn(note(60,70,3),70).type,'correct');
});

test('Hex tolerance preference persists independently and invalid values remain Strict',()=>{
  let value=null;const store={getItem:()=>value,setItem:(key,v)=>value=v};
  assert.equal(readPracticePreferences(store).allowMutedStringNoise,false);
  savePracticePreferences({mode:'wait',ui:{},waitChord:{mode:'collect',windowMs:200},allowMutedStringNoise:true},store);
  assert.equal(readPracticePreferences(store).allowMutedStringNoise,true);
  value=JSON.stringify({allowMutedStringNoise:'true'});assert.equal(readPracticePreferences(store).allowMutedStringNoise,false);
});

for(const hex of [false,true])test(`Wait keeps changing and repeated X pitches out of the following chord (${hex?'Hex':'Poly'})`,()=>{
  const s=new WaitSession([{...event('x'),isPercussive:true},event('a')],{hex});
  assert.equal(s.noteOn(0,note(40,0,6)).complete,true);
  // One muted gesture: a brief pitch estimate changes to a required chord tone.
  for(const n of [note(45,12,5),note(61,24,3),note(60,43,3),note(64,49,2),note(55,71,4)]) {
    assert.equal(s.noteOn(1,n).type,'ignored-strum-tail');
  }
  assert.equal(s.records[1].slots.some(slot=>slot.hit),false);
  assert.equal(s.stats().wrong,0);
  // A quiet 60 ms gap ends this X gesture even before the 200 ms upper bound.
  for(const [i,p] of [45,55,60,64].entries())s.noteOn(1,note(p,131+i*15,[6,4,3,2][i]));
  assert.equal(s.records[1].slots.every(slot=>slot.hit),true);
  assert.equal(s.stats().correct,5);assert.equal(s.stats().wrong,0);
});

test('Hex X handoff accepts a fresh reversed strum and expires at the configured bound',()=>{
  const targets=[{...event('x'),isPercussive:true},event('a')];
  const s=new WaitSession(targets,{hex:true});
  s.noteOn(0,note(64,0,2));s.noteOn(1,note(60,20,3));s.noteOn(1,note(55,40,4));
  assert.equal(s.noteOn(1,note(64,70,2)).type,'correct');
  for(const [i,p] of [60,55,45].entries())s.noteOn(1,note(p,80+i*10,[3,4,6][i]));
  assert.equal(s.stats().correct,5);
  const bounded=new WaitSession(targets,{hex:true,chordWindowMs:50});
  bounded.noteOn(0,note(40,0,6));bounded.noteOn(1,note(61,45,3));
  assert.equal(bounded.noteOn(1,note(60,51,3)).type,'correct');
});

for(const hex of [false,true])test(`one X gesture cannot solve a second X target; a fast fresh single still works (${hex?'Hex':'Poly'})`,()=>{
  const x={...event('x'),isPercussive:true};
  const s=new WaitSession([x,{...x,id:'x2'},event('single',[60],[3])],{hex});
  s.noteOn(0,note(40,0,6));
  for(const n of [note(60,15,3),note(61,30,3),note(60,45,3)])assert.equal(s.noteOn(1,n).type,'ignored-strum-tail');
  assert.equal(s.stats().correct,1);
  assert.equal(s.noteOn(1,note(40,110,6)).complete,true);
  assert.equal(s.noteOn(2,note(60,180,3)).complete,true);
  assert.equal(s.stats().correct,3);assert.equal(s.stats().wrong,0);
});

for(const hex of [false,true])test(`Wait chord correction ignores collected tones but retains a genuine wrong fret (${hex?'Hex':'Poly'})`,()=>{
  const s=new WaitSession([event('bm',[47,57,62,65])],{hex});
  for(const [i,p] of [47,57,62].entries())s.noteOn(0,note(p,i*30,[6,4,3][i]));
  const wrong=s.noteOn(0,note(66,100,2)); // fret 7 instead of fret 6 on string 2
  assert.equal(wrong.type,'wrong');assert.equal(wrong.wrongPitch,true);
  for(const [i,p] of [47,57,62].entries())assert.equal(s.noteOn(0,note(p,1000+i*30,[6,4,3][i])).type,'ignored-collected-tone');
  assert.equal(s.noteOn(0,note(65,1100,2)).complete,true);
  assert.equal(s.stats().wrong,1);assert.equal(s.stats().correct,4);
  assert.equal(s.feedbackHistory()[0].outcome,'completed-with-errors');
  assert.equal(s.feedbackHistory()[0].wrongNotes[0].midi,66);
});

test('Together still expires incomplete chords before accepting replayed tones',()=>{
  const s=new WaitSession([event('a')],{hex:true,chordMode:'together',chordWindowMs:100});
  s.noteOn(0,note(45,0,6));assert.equal(s.noteOn(0,note(45,50,6)).type,'ignored-collected-tone');
  assert.equal(s.noteOn(0,note(45,101,6)).type,'correct');
  assert.equal(s.stats().retries,1);assert.equal(s.stats().correct,1);assert.equal(s.stats().wrong,0);
});
