import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {readPracticePreferences,savePracticePreferences} from '../js/practice-preferences.js';
const pitches=[45,55,60,64],strings=[6,4,3,2];
const chord=(i,p=pitches)=>({id:String(i),startTimeMs:i*1000,startTick:i*1920,stringCount:6,notes:p.map((midi,j)=>({id:i+':'+j,midi,string:strings[j],fret:5}))});
const note=(p,j,at,hex)=>({midi:p,rawMidi:p,channel:hex?strings[j]:1,stringHint:hex?strings[j]:null,velocity:90,at});
function setup(mode,hex,options={}){
 const events=[chord(0),chord(1),chord(2)],s=mode==='realtime'?new RealtimeSession(events,{hex,...options}):new WaitSession(events,{hex,chordMode:mode,...options});s.started=true;
 return {s,hit:(i,p,j,at)=>mode==='realtime'?s.noteOn(note(p,j,at,hex),at):s.noteOn(i,note(p,j,at,hex)),settle:(i,at)=>mode==='realtime'?s.advance(at,1,at):s.settle(i,at)};
}
for(const mode of ['collect','together','realtime'])for(const hex of [false,true]){
 test(mode+' '+(hex?'Hex':'Poly')+' one-held recognition and no inference chain',()=>{
  const h=setup(mode,hex);pitches.forEach((p,j)=>h.hit(0,p,j,j*10));
  pitches.slice(0,3).forEach((p,j)=>h.hit(1,p,j,1000+j*10));
  h.settle(1,mode==='realtime'?1060:1200);
  assert.equal(h.s.records[1].slots.every(s=>s.hit),true);assert.equal(h.s.stats().supportedHeld,1);
  assert.equal(h.s.feedbackHistory()[1].supportedHeldNotes[0].freshAttack,false);
  pitches.slice(0,3).forEach((p,j)=>h.hit(2,p,j,2000+j*10));h.settle(2,mode==='realtime'?2060:2200);
  assert.equal(h.s.records[2].slots.at(-1).hit?true:false,false);
 });
 test(mode+' '+hex+' Multiple requires a fresh attack but carries held notes across repeats',()=>{
  const h=setup(mode,hex,{heldNoteTolerance:'multiple'});pitches.forEach((p,j)=>h.hit(0,p,j,j*10));
  h.settle(1,990);assert.equal(h.s.records[1].slots.some(s=>s.hit),false);
  for(const i of [1,2]){h.hit(i,45,0,i*1000);h.settle(i,i*1000+(mode==='realtime'?60:200));assert.equal(h.s.records[i].slots.every(s=>s.hit),true);}
  assert.equal(h.s.stats().supportedHeld,6);
 });
 test(mode+' '+hex+' released notes, wrong notes and Off block held credit',()=>{
  for(const issue of ['release','wrong','off','changed']){
   const h=setup(mode,hex,{heldNoteTolerance:issue==='off'?'off':'multiple'});pitches.forEach((p,j)=>h.hit(0,p,j,j*10));
   if(issue==='release')h.s.noteOff(note(64,3,500,hex));
   if(issue==='changed')h.s.records[1].slots.at(-1).midi=65;
   h.hit(1,45,0,1000);if(issue==='wrong')h.hit(1,66,3,1010);
   h.settle(1,mode==='realtime'?1060:1200);assert.equal(h.s.records[1].slots.at(-1).hit?true:false,false,issue);
  }
 });
}
for(const hex of [false,true])test('Realtime brief errors settle on their original target, release forgives, finish waits '+hex,()=>{
 const s=new RealtimeSession([chord(0)],{hex,ignoreBriefErrors:true,minErrorMs:30});s.started=true;
 assert.equal(s.noteOn(note(61,2,0,hex),0).type,'pending-off-target');assert.equal(s.stats().wrong,0);
 s.noteOff(note(61,2,10,hex));assert.equal(s.pendingErrors.size,0);assert.equal(s.stats().wrong,0);
 s.noteOn(note(62,2,20,hex),20);s.advance(60,1,60);assert.equal(s.stats().wrong,1);
 s.noteOn(note(63,3,70,hex),70);s.finish();assert.equal(s.completed,false);
 s.noteOff(note(63,3,80,hex));s.advance(Infinity);assert.equal(s.completed,true);assert.equal(s.stats().wrong,1);
 assert.equal(s.feedbackHistory()[0].briefErrorDecisions.filter(d=>d.type==='ignored-brief-off-target').length,2);
});

test('Realtime written range filter uses the score and respects Off in Poly/Hex',()=>{
 for(const hex of [false,true])for(const enabled of [false,true]){
  const s=new RealtimeSession([chord(0)],{hex,filterScoreRange:enabled,rangeStaves:[{tuning:[40,45,50,55,59,64]}]});s.started=true;
  s.events[0].notes=[{id:'n',midi:45,string:1,fret:5}];s.rangeStaves=[{tuning:[40,45,50,55,59,64]}];
  const result=s.noteOn({midi:90,channel:1,stringHint:1,at:0},0);
  assert.equal(result.type,enabled?'ignored-score-range':'wrong');assert.equal(s.stats().wrong,enabled?0:1);
 }
});

test('Realtime Hex confirms a released tracking spike without hiding sustained wrong notes',()=>{
 for(const enabled of [false,true]){
  const s=new RealtimeSession([chord(0)],{hex:true,filterHexSpikes:enabled});s.started=true;
  s.noteOn({...note(72,0,0,true),velocity:10},0);s.noteOff(note(72,0,10,true));s.noteOn(note(45,0,20,true),20);
  assert.equal(s.stats().wrong,enabled?0:1);assert.equal(s.stats().correct,1);
 }
});

test('Realtime onset bend correction removes its original wrong mark and retains timing',()=>{
 const s=new RealtimeSession([chord(0)],{hex:true});s.started=true;s.noteOn(note(54,1,0,true),0);
 const result=s.pitchBend({channel:4,bendValue:683,at:5},5);
 assert.equal(result.type,'pitch-corrected');assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,1);
 assert.equal(s.records[0].slots[1].hit.scoreMs,0);
});

test('held preference defaults to One, saves all choices and rejects invalid values',()=>{
 assert.equal(readPracticePreferences({getItem:()=>null}).heldNoteTolerance,'one');
 for(const scope of ['off','one','multiple']){let value;const storage={getItem:()=>value,setItem:(k,v)=>value=v};savePracticePreferences({mode:'wait',ui:{},waitChord:{mode:'collect',windowMs:200},heldNoteTolerance:scope},storage);assert.equal(readPracticePreferences(storage).heldNoteTolerance,scope);}
 assert.equal(readPracticePreferences({getItem:()=>JSON.stringify({heldNoteTolerance:7})}).heldNoteTolerance,'one');
});


test('Realtime pause freezes brief-note time and discards held evidence',()=>{
 const h=setup('realtime',true,{ignoreBriefErrors:true,minErrorMs:30});pitches.forEach((p,j)=>h.hit(0,p,j,j*10));
 h.s.setRunning(false,100);assert.equal(h.s.held.size,0);h.s.setRunning(true,1100);assert.equal(h.s.eventTime(1110),110);
 h.s.noteOn(note(61,2,110,true),1000);h.s.setRunning(false,1120);
 h.s.noteOff({...note(61,2,0,true),at:h.s.eventTime(5000)});assert.equal(h.s.stats().wrong,0);
});

test('Realtime early release after finalization reconciles its own target, never the next one',()=>{
 const h=setup('realtime',false,{ignoreBriefErrors:true,minErrorMs:30});
 h.hit(0,61,2,0);h.s.advance(1000,1,1000);assert.equal(h.s.stats().wrong,1);
 h.s.noteOff(note(61,2,10,false));assert.equal(h.s.stats().wrong,0);
 assert.equal(h.s.feedbackHistory()[0].briefErrorDecisions.at(-1).type,'ignored-brief-off-target');
 assert.equal(h.s.feedbackHistory()[1].wrongNotes.length,0);
});

test('Realtime range and brief filters coexist without delaying required pitches',()=>{
 const s=new RealtimeSession([chord(0)],{ignoreBriefErrors:true,filterScoreRange:true,rangeStaves:[]});s.started=true;
 assert.equal(s.noteOn(note(45,0,0,false),0).type,'correct');assert.equal(s.stats().correct,1);
 assert.equal(s.noteOn(note(61,2,1,false),1).type,'pending-off-target');s.noteOff(note(61,2,5,false));assert.equal(s.stats().wrong,0);
});

test('Realtime held timing follows real milliseconds at non-unit speed and rejects first/X/single targets',()=>{
 const s=new RealtimeSession([chord(0),chord(1)],{heldNoteTolerance:'multiple'});s.started=true;
 pitches.forEach((p,j)=>s.noteOn(note(p,j,j*10,false),j*20,2));
 s.noteOn(note(45,0,500,false),1000,2);s.advance(1118,2,559);assert.equal(s.stats().supportedHeld??0,0);
 s.advance(1120,2,560);assert.equal(s.stats().supportedHeld,3);
 for(const shape of [e=>({...e,isPercussive:true}),e=>({...e,notes:e.notes.slice(0,1)})]){
  const h=setup('collect',false,{heldNoteTolerance:'multiple'});pitches.forEach((p,j)=>h.hit(0,p,j,j*10));h.s.events[1]=shape(h.s.events[1]);h.settle(1,1200);assert.equal(h.s.stats().supportedHeld,0);
 }
});


test('Realtime late-window onset can settle its pitch after miss finalization',()=>{
 const s=new RealtimeSession([chord(0)],{hex:true});s.started=true;
 s.noteOn(note(54,1,150,true),150);s.advance(180,1,180);
 assert.equal(s.records[0].slots[1].missed,true);
 s.pitchBend({channel:4,bendValue:683,at:190},190);
 assert.equal(s.records[0].slots[1].missed,false);assert.equal(s.records[0].slots[1].hit.scoreMs,150);
 assert.equal(s.stats().correct,1);assert.equal(s.stats().wrong,0);
});


for(const hex of [false,true])test('Multiple preserves a correct previous-chord tail refresh '+hex,()=>{
 for(const mode of ['collect','together'])for(const released of [false,true]){
  const h=setup(mode,hex,{heldNoteTolerance:'multiple',chordWindowMs:1000});
  // Collect E early, release, then finish the chord with the other three tones.
  // Together uses a large window so the same partial-chord sequence is valid.
  h.hit(0,64,3,0);h.s.noteOff(note(64,3,100,hex));
  h.hit(0,45,0,500);h.hit(0,55,1,520);h.hit(0,60,2,540);
  assert.equal(h.s.records[0].slots.every(s=>s.hit),true);
  assert.equal(h.hit(1,64,3,560).type,'ignored-strum-tail');
  assert.equal(h.s.records[0].slots.at(-1).hitAt,0,'original credited attack stays unchanged');
  h.hit(1,45,0,800);
  if(released)h.s.noteOff(note(64,3,850,hex));
  h.settle(1,mode==='collect'?1000:1800);
  assert.equal(h.s.records[1].slots.every(s=>s.hit),!released);
  if(!released){assert.equal(h.s.records[1].slots.at(-1).originAt,560);assert.equal(h.s.stats().supportedHeld,3);}
 }
});

for(const hex of [false,true])test('Multiple collects corrective gestures and refreshes already-collected tones '+hex,()=>{
 const h=setup('collect',hex,{heldNoteTolerance:'multiple'});
 h.hit(0,64,3,0);h.s.noteOff(note(64,3,100,hex));
 h.hit(0,45,0,500);h.hit(0,55,1,520);h.hit(0,60,2,540);h.hit(1,64,3,560);
 h.hit(1,55,1,600);h.hit(1,45,0,900);h.hit(1,60,2,920);
 assert.equal(h.hit(1,55,1,930).type,'ignored-collected-tone');
 h.settle(1,1100);assert.equal(h.s.records[1].slots.every(s=>s.hit),true);
 assert.equal(h.s.stats().correct,8);assert.equal(h.s.stats().wrong,0);
});
