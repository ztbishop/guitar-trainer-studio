import test from 'node:test';
import assert from 'node:assert/strict';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {normalizeWaitChordSettings} from '../js/practice-timing.js';
import {initChordControls} from '../js/chord-controls.js';
import {AppState} from '../js/app-state.js';
const event=(id,pitches=[60,64])=>({id,startTick:id==='a'?0:960,measureNumber:1,notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:6-i}))});
const note=(midi,at,channel=1)=>({type:'note-on',midi,at,channel});
const together=(events=[event('a')],extra={})=>new WaitSession(events,{chordMode:'together',chordWindowMs:200,...extra});

test('Together accepts the exact window edge; releases and note duration are not required',()=>{
 const s=together();s.noteOn(0,note(60,1000));assert.equal(s.noteOn(0,note(64,1200)).complete,true);
 assert.equal(s.expire(0,9000),false);assert.equal(s.stats().correct,2);
});
test('late chord attack starts a fresh attempt rather than completing the expired one',()=>{
 const s=together();s.noteOn(0,note(60,1000));const late=s.noteOn(0,note(64,1201));
 assert.equal(late.expiredAttempt,true);assert.equal(late.complete,false);assert.equal(s.stats().correct,1);assert.equal(s.stats().retries,1);
 assert.equal(s.noteOn(0,note(60,1300)).complete,true);assert.equal(s.stats().correct,2);assert.equal(s.stats().wrong,0);
});
test('idle expiry clears partial green states once and never adds missed or wrong penalties',()=>{
 const s=together();s.noteOn(0,note(60,0));assert.equal(s.expire(0,200),false);assert.equal(s.expire(0,201),true);
 assert.equal(s.lastFeedback.type,'retry');assert.equal(s.stats().correct,0);assert.equal(s.stats().retries,1);
 for(const at of [1000,10000,100000])assert.equal(s.expire(0,at),false);
 assert.equal(s.stats().retries,1);assert.equal(s.stats().wrong,0);assert.equal(s.stats().missed,0);
});
test('wrong pitches do not start or extend the chord window',()=>{
 const s=together();s.noteOn(0,note(61,0));assert.equal(s.records[0].attemptStartAt,null);
 s.noteOn(0,note(60,1000));s.noteOn(0,note(61,1190));assert.equal(s.records[0].attemptStartAt,1000);
 assert.equal(s.expire(0,1201),true);assert.equal(s.stats().wrong,2);
});
test('Collect notes remains unlimited and Together leaves single-note targets immediate',()=>{
 const collect=new WaitSession([event('a')]);collect.noteOn(0,note(60,0));assert.equal(collect.expire(0,100000),false);
 assert.equal(collect.noteOn(0,note(64,100000)).complete,true);
 const single=together([event('a',[60])]);assert.equal(single.noteOn(0,note(60,1)).complete,true);assert.equal(single.expire(0,10000),false);
});
test('single-channel unisons merge; hex unisons need two fresh channels within the window',()=>{
 const events=[event('a',[60,60])];assert.equal(together(events).noteOn(0,note(60,0)).complete,true);
 const hex=together(events,{hex:true});hex.noteOn(0,note(60,0,1));assert.equal(hex.noteOn(0,note(60,50,1)).type,'wrong');
 assert.equal(hex.noteOn(0,note(60,100,2)).complete,true);
 const expired=together(events,{hex:true});expired.noteOn(0,note(60,0,1));assert.equal(expired.noteOn(0,note(60,201,2)).complete,false);
 assert.equal(expired.noteOn(0,note(60,220,1)).complete,true);
});
function harness(loop=false) {
 let time=1000,state;const calls=[];
 const controller=new WaitController(Object.fromEntries(['acquire','hold','pause','release','finish'].map(name=>[name,(...args)=>calls.push([name,...args])])),s=>state=s,()=>time);
 controller.configure([event('a'),event('b',[67])],1920,false,loop,{mode:'together',windowMs:200});controller.toggle(0);
 return {controller,calls,get state(){return state},set time(value){time=value}};
}
test('controller timer refreshes retry feedback and visual state without MIDI input',()=>{
 const h=harness();h.controller.noteOn(note(60,1000));assert.equal(h.state.noteStates['a:0'],'correct');
 h.time=1201;h.controller.advance();assert.deepEqual(h.state.noteStates,{});assert.match(h.state.status,/expired/);assert.equal(h.state.currentEvent.id,'a');
 h.controller.noteOn(note(60,1300));h.controller.noteOn(note(64,1400));assert.equal(h.state.currentEvent.id,'b');assert.equal(h.calls.at(-1)[0],'hold');
});
test('Pause freezes the remaining chord window and ignores paused MIDI',()=>{
 const h=harness();h.controller.noteOn(note(60,1000));h.time=1050;h.controller.toggle();
 h.time=5000;h.controller.advance();h.controller.noteOn(note(64,5000));assert.equal(h.state.results.correct,1);
 h.controller.toggle();h.controller.noteOn(note(64,5150));assert.equal(h.state.currentEvent.id,'b');assert.equal(h.state.results.retries,0);
});
test('Pause after the window deadline expires the attempt before freezing',()=>{
 const h=harness();h.controller.noteOn(note(60,1000));h.time=1201;h.controller.toggle();assert.equal(h.state.results.correct,0);assert.equal(h.state.results.retries,1);
 h.time=5000;h.controller.toggle();h.controller.noteOn(note(64,5000));assert.equal(h.state.currentEvent.id,'a');assert.equal(h.state.results.correct,1);
});
test('Together accepts MIDI during seek, retains settings on loop restart and clears attempts on Stop',()=>{
 const h=harness(true);h.controller.noteOn(note(60,1000));h.controller.noteOn(note(64,1100));h.controller.noteOn(note(67,1150));
 assert.equal(h.state.pass,2);assert.equal(h.state.currentEvent.id,'a');assert.deepEqual(h.state.noteStates,{});
 h.controller.noteOn(note(60,1200));h.time=1401;h.controller.advance();assert.equal(h.state.results.retries,1);
 h.controller.stop();assert.equal(h.state.results.retries,0);assert.equal(h.state.results.correct,0);
});
test('reconfiguration and external seek remove provisional hits and paused timing state',()=>{
 const h=harness();h.controller.noteOn(note(60,1000));h.controller.positionChanged({currentTick:0,isSeek:true});
 h.controller.positionChanged({currentTick:960,isSeek:true});assert.equal(h.state.currentEvent.id,'b');assert.equal(h.state.results.correct,0);
 h.controller.configure([event('a')],960,false,false,{mode:'collect',windowMs:200});h.controller.toggle(0);
 h.controller.noteOn(note(60,1000));h.time=100000;h.controller.advance();assert.equal(h.state.results.correct,1);
});
test('chord settings validate modes and supported real-millisecond limits',()=>{
 assert.deepEqual(normalizeWaitChordSettings('together','200'),{mode:'together',windowMs:200});
 assert.ok(normalizeWaitChordSettings('collect',50));assert.ok(normalizeWaitChordSettings('together',1000));
 for(const [mode,ms] of [['other',200],['together',49],['collect',1001],['together','bad'],['together','']])assert.equal(normalizeWaitChordSettings(mode,ms),null);
});
test('chord controls are Wait-only, validate input and enable the window only for Together',()=>{
 const previous=globalThis.document,elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn}});return elements.get(id)};
 globalThis.document={getElementById:get,activeElement:null};
 try {
  AppState.mode='realtime';AppState.waitChord={mode:'collect',windowMs:200};const changes=[];
  const controls=initChordControls(settings=>{changes.push(settings);AppState.waitChord=settings});controls.sync();
  const mode=get('wait-chord-mode'),input=get('wait-chord-window');assert.equal(mode.disabled,true);
  AppState.mode='wait';controls.sync();assert.equal(mode.disabled,false);assert.equal(input.disabled,true);
  mode.value='together';mode.handlers.change();assert.equal(input.disabled,false);assert.equal(changes.length,1);
  input.value='0';input.handlers.change();assert.equal(changes.length,1);assert.equal(input.value,'200');
  input.value='350';input.handlers.change();assert.equal(AppState.waitChord.windowMs,350);assert.match(get('wait-chord-status').textContent,/350 ms/);
 } finally {globalThis.document=previous;}
});
