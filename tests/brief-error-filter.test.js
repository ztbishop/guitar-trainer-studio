import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
const event=(id,midi=60)=>({id,startTick:id==='a'?0:960,notes:[{id:id+'n',sourceNoteId:id+'n',midi,string:4,fret:midi-50}]});
const on=(midi,at,channel=4)=>({type:'note-on',midi,at,channel,stringHint:channel,velocity:100});
const off=(midi,at,channel=4)=>({type:'note-off',midi,at,channel});
for(const hex of [false,true])test(`brief-error tolerance preserves immediate correct notes and exact boundary in ${hex?'Hex':'Poly'}`,()=>{
 const s=new WaitSession([event('a')],{hex,ignoreBriefErrors:true,minErrorMs:30,filterHexSpikes:false});
 assert.equal(s.noteOn(0,on(61,0)).type,'pending-off-target');assert.equal(s.stats().wrong,0);assert.equal(s.liveWrong.size,0);
 assert.equal(s.feedbackHistory()[0].wrongNotes.length,0);
 s.noteOff(off(61,29));assert.equal(s.stats().wrong,0);assert.equal(s.feedbackHistory()[0].briefErrorDecisions[0].type,'ignored-brief-off-target');
 s.noteOn(0,on(62,40));s.noteOff(off(62,70));assert.equal(s.stats().wrong,1);
 assert.equal(s.noteOn(0,on(60,71)).complete,true);s.noteOff(off(60,72));assert.equal(s.stats().correct,1);
});
test('late timestamped release can reconcile a short event after a timer ran',()=>{
 const s=new WaitSession([event('a')],{ignoreBriefErrors:true});s.noteOn(0,on(61,0));s.flushPendingErrors(50);
 assert.equal(s.stats().wrong,1);s.noteOff(off(61,10));assert.equal(s.stats().wrong,0);
});
test('pending errors remain on the original target after immediate correct advancement',()=>{
 const s=new WaitSession([event('a'),event('b',62)],{ignoreBriefErrors:true});s.noteOn(0,on(61,0));
 s.noteOn(0,on(60,5));s.noteOn(1,on(62,10));s.flushPendingErrors(30);
 assert.equal(s.records[0].wrong,1);assert.equal(s.records[1].wrong,0);assert.equal(s.stats().correct,2);
 s.noteOff(off(61,40));assert.equal(s.stats().wrong,1);assert.equal(s.liveWrong.size,0);
});
test('pending matching uses raw channel/pitch, including poly unisons on different channels',()=>{
 const s=new WaitSession([event('a')],{ignoreBriefErrors:true});s.noteOn(0,on(61,0,2));s.noteOn(0,on(61,10,3));
 s.noteOff(off(61,20,2));s.flushPendingErrors(40);assert.equal(s.stats().wrong,1);
 assert.equal(s.feedbackHistory()[0].wrongNotes[0].channel,3);
});
test('filter off retains immediate penalties and correct percussion is never delayed',()=>{
 const s=new WaitSession([event('a')]);assert.equal(s.noteOn(0,on(61,0)).type,'wrong');assert.equal(s.stats().wrong,1);
 const x=new WaitSession([{...event('x'),isPercussive:true,notes:[{id:'x',isDead:true}]}],{ignoreBriefErrors:true});
 assert.equal(x.noteOn(0,on(20,0)).complete,true);
});
function controller(loop=false){let now=0,state;const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},s=>state=s,()=>now);c.configure([event('a')],960,false,loop,{ignoreBriefErrors:true,minErrorMs:30});c.start();return {c,set time(t){now=t},get state(){return state}};}
test('completion and loop wait for pending durations without dropping penalties',()=>{
 for(const loop of [false,true]){const h=controller(loop);h.c.noteOn(on(61,0));h.c.noteOn(on(60,5));assert.equal(h.state.results.correct,1);assert.equal(h.state.phase,'settling');
 h.c.positionChanged({currentTick:0,isSeek:true});assert.equal(h.state.phase,'settling');h.time=30;h.c.advance();
 if(loop){assert.equal(h.c.lastPassResults.wrong,1);assert.equal(h.c.passHistory[0].wrongNotes.length,1);assert.equal(h.c.pass,2);}
 else{assert.equal(h.state.phase,'complete');assert.equal(h.state.results.wrong,1);}}
});
test('release while paused uses frozen active time, and resumed settling can finish',()=>{
 const h=controller();h.c.noteOn(on(61,0));h.c.noteOn(on(60,5));h.time=10;h.c.toggle();
 h.c.noteOn(off(61,1010));assert.equal(h.c.session.stats().wrong,0);h.time=1010;h.c.toggle();h.c.advance();assert.equal(h.state.phase,'complete');
});
test('new attempt/configuration discards pending results rather than leaking them',()=>{
 const h=controller();h.c.noteOn(on(61,0));h.c.newAttemptHere();h.time=100;h.c.advance();assert.equal(h.state.results.wrong,0);
});
test('Together retry does not move the original wrong note to a new target',()=>{
 const a={id:'a',notes:[{id:'1',midi:60},{id:'2',midi:64}]};
 const s=new WaitSession([a],{ignoreBriefErrors:true,minErrorMs:100,chordMode:'together',chordWindowMs:50});
 s.noteOn(0,on(60,0));s.noteOn(0,on(61,10));s.expire(0,60);s.flushPendingErrors(110);
 assert.equal(s.stats().retries,1);assert.equal(s.stats().wrong,1);
});
test('Hex onset bend correction can remove a pending error without negative penalties',()=>{
 const s=new WaitSession([event('a',60)],{hex:true,ignoreBriefErrors:true});s.noteOn(0,on(61,0));
 const result=s.pitchBend({channel:4,bendValue:-682,at:10},10,0);assert.equal(result.type,'pitch-corrected');assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,1);assert.equal(s.pendingErrors.size,0);
});
import {AppState} from '../js/app-state.js';
import {startMidiCapture,stopMidiCapture,captureMidiEvent,captureMidiOutcome,captureFeedbackView,markMidiSnapshot,midiCaptureReport} from '../js/midi-capture.js';
test('capture preserves raw short errors and reports the later ignored decision separately',()=>{
 AppState.mode='wait';AppState.expectedEvents=[event('a')];AppState.waitTrainer={currentEvent:event('a')};Object.assign(AppState.midi,{ignoreBriefErrors:true,minErrorMs:30});
 const s=new WaitSession([event('a')],{ignoreBriefErrors:true});startMidiCapture();
 try{const n={...on(61,performance.now()),raw:[147,61,100]};const row=captureMidiEvent(n,{accepted:true});captureMidiOutcome(row,s.noteOn(0,n));
 s.noteOff(off(61,n.at+10));captureFeedbackView([],{history:s.feedbackHistory(),results:s.stats()});markMidiSnapshot();const r=midiCaptureReport();
 assert.deepEqual(r.events[0].raw,n.raw);assert.equal(r.events[0].grading.type,'pending-off-target');assert.equal(r.events[0].grading.minimumMs,30);
 assert.equal(r.events[0].ignoreBriefErrors,true);assert.equal(r.snapshots[0].view.briefErrorDecisions[0].decisions[0].type,'ignored-brief-off-target');
 }finally{stopMidiCapture();AppState.midi.ignoreBriefErrors=false;}
});
test('brief tolerance and Hex spike reconciliation coexist without double-removal',()=>{
 const a=event('a',55);const s=new WaitSession([a],{hex:true,ignoreBriefErrors:true});s.noteOn(0,{...on(76,0),velocity:10});s.noteOff(off(76,50));
 assert.equal(s.stats().wrong,1);s.noteOn(0,on(55,60));assert.equal(s.stats().wrong,0);assert.equal(s.stats().correct,1);
});
