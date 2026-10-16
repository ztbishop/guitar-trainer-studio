import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {WaitSession} from '../js/wait-session.js';
import {WaitController} from '../js/wait-controller.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
const event=(id,tick,pitches)=>({id,startTick:tick,measureNumber:1,notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:6-i}))});
const note=(midi,channel=1)=>({type:'note-on',midi,channel});
function harness(events=[event('a',0,[60,64]),event('b',960,[60])]) {
 const calls=[];let state;
 const transport=Object.fromEntries(['acquire','hold','segment','pause','resume','release','finish'].map(name=>[name,(...args)=>calls.push([name,...args])]));
 const controller=new WaitController(transport,next=>state=next);controller.configure(events,1920);
 const acknowledge=()=>controller.positionChanged({currentTick:controller.desiredTick,isSeek:true});
 return {controller,calls,acknowledge,get state(){return state}};
}
test('wait starts paused; note-offs never advance',()=>{
 const h=harness();h.controller.toggle(0);h.acknowledge();
 assert.equal(h.state.phase,'waiting');
 assert.equal(h.controller.noteOn({...note(60),type:'note-off'}),null);
 assert.equal(h.state.results.correct,0);assert.equal(h.state.results.missed,0);
});
test('wrong notes stay put; complete chords immediately seek next target without playback',()=>{
 const h=harness();h.controller.toggle(0);h.acknowledge();
 h.controller.noteOn(note(61));assert.equal(h.state.results.wrong,1);assert.equal(h.state.matchState,'mismatch');
 h.controller.noteOn(note(60));assert.equal(h.state.matchState,'partial');
 h.controller.noteOn(note(64));assert.equal(h.state.currentEvent.id,'b');
 assert.deepEqual(h.calls.at(-1),['hold',960]);assert.equal(h.state.results.correct,2);
 assert.ok(!h.calls.some(c=>c[0]==='segment'||c[0]==='resume'));
});
test('one attack advances a long note immediately, without release or elapsed score time',()=>{
 const h=harness([event('a',0,[60]),event('b',15360,[62])]);h.controller.toggle(0);h.acknowledge();
 h.controller.noteOn(note(60));assert.equal(h.state.currentEvent.id,'b');assert.deepEqual(h.calls.at(-1),['hold',15360]);
});
test('repeated pitches need fresh attacks but accept them before cursor acknowledgement',()=>{
 const h=harness([event('a',0,[60]),event('b',960,[60])]);h.controller.toggle(0);
 h.controller.noteOn(note(60));assert.equal(h.state.currentEvent.id,'b');
 h.controller.positionChanged({currentTick:0,isSeek:true});assert.equal(h.state.currentEvent.id,'b');
 h.controller.noteOn(note(60));assert.equal(h.state.phase,'complete');assert.equal(h.state.results.correct,2);
});
test('late old seek notifications cannot erase hits while positioning next gate',()=>{
 const h=harness([event('a',0,[60]),event('b',960,[62])]);h.controller.toggle(0);h.controller.noteOn(note(60));
 h.controller.positionChanged({currentTick:0,isSeek:true});assert.equal(h.state.results.correct,1);
 h.controller.positionChanged({currentTick:961,isSeek:true});assert.equal(h.state.phase,'waiting');assert.equal(h.state.currentEvent.id,'b');
});
test('native elapsed positions cannot advance an unsolved gate',()=>{
 const h=harness();h.controller.toggle(0);h.acknowledge();h.controller.positionChanged({currentTick:1920});
 assert.equal(h.state.currentEvent.id,'a');assert.equal(h.state.results.correct,0);
});
test('manual pause ignores attacks and preserves partial chord',()=>{
 const h=harness();h.controller.toggle(0);h.acknowledge();h.controller.noteOn(note(60));
 h.controller.toggle(0);h.controller.noteOn(note(64));assert.equal(h.state.results.correct,1);
 h.controller.toggle(0);h.controller.noteOn(note(64));assert.equal(h.state.currentEvent.id,'b');
});
test('pause during asynchronous seek ignores input, then resumes ready gate',()=>{
 const h=harness([event('a',0,[60]),event('b',960,[62])]);h.controller.toggle(0);h.controller.noteOn(note(60));
 h.controller.toggle(960);h.acknowledge();h.controller.noteOn(note(62));assert.equal(h.state.phase,'paused');assert.equal(h.state.results.correct,1);
 h.controller.toggle(960);h.controller.noteOn(note(62));assert.equal(h.state.phase,'complete');
});
test('leading rests and multi-measure gaps are skipped silently',()=>{
 const h=harness([event('a',960,[60]),event('b',15360,[62])]);h.controller.toggle(0);assert.deepEqual(h.calls.at(-1),['hold',960]);
 h.controller.noteOn(note(60));assert.deepEqual(h.calls.at(-1),['hold',15360]);
 assert.ok(!h.calls.some(c=>c[0]==='segment'));
});
test('explicit seek restarts targets and skips earlier attacks without missed penalties',()=>{
 const h=harness([event('a',0,[60]),event('b',960,[62])]);h.controller.toggle(0);h.acknowledge();
 h.controller.positionChanged({currentTick:960,isSeek:true});h.acknowledge();
 assert.equal(h.state.currentEvent.id,'b');assert.equal(h.state.results.total,1);assert.equal(h.state.results.missed,0);
});
test('stop invalidates pending seek acknowledgements and restores transport',()=>{
 const h=harness();h.controller.toggle(0);h.controller.stop();h.controller.positionChanged({currentTick:0,isSeek:true});
 assert.equal(h.state.phase,'idle');assert.deepEqual(h.calls.at(-1),['release']);assert.equal(h.state.sessionStarted,false);
});
test('new score configuration clears partial hits and pending cursor work',()=>{
 const h=harness();h.controller.toggle(0);h.controller.noteOn(note(60));
 h.controller.configure([event('new',0,[67])],960);h.controller.positionChanged({currentTick:960,isSeek:true});
 assert.equal(h.state.phase,'idle');h.controller.toggle(0);h.controller.noteOn(note(67));assert.equal(h.state.phase,'complete');assert.equal(h.state.results.correct,1);
});
test('hex unisons require distinct channels; single-channel unisons share pitch target',()=>{
 const events=[event('a',0,[60,60])];const single=new WaitSession(events);assert.equal(single.noteOn(0,note(60)).complete,true);
 const hex=new WaitSession(events,{hex:true});assert.equal(hex.noteOn(0,note(60,1)).complete,false);
 assert.equal(hex.noteOn(0,note(60,1)).type,'ignored-collected-tone');assert.equal(hex.stats().wrong,0);
 assert.equal(hex.noteOn(0,note(60,2)).complete,true);
});
const context=vm.createContext({console,process});vm.runInContext(fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
const at=context.alphaTab;
function generate(tex) {
 const parser=new at.importer.AlphaTexImporter();parser.initFromString(tex,new at.Settings());const score=parser.readScore();
 const midi=new at.midi.MidiFile();const generator=new at.midi.MidiFileGenerator(score,new at.Settings(),new at.midi.AlphaSynthMidiFileHandler(midi));generator.generate();
 return {midi,timeline:buildPlaybackTimeline(generator.tickLookup,{tempo:score.tempo,ticksPerQuarter:midi.division})};
}
test('wait targets follow actual repeated occurrences and exclude tied continuations',()=>{
 const {timeline}=generate(String.raw`\tempo 120 . \ro 0.6.2 -.6.2 | \rc 2 2.6.1`);
 const targets=getPracticeEvents(timeline,'0');assert.deepEqual(targets.map(e=>e.startTick),[0,3840,7680,11520]);
 const h=harness(targets);h.controller.endTick=timeline.endTick;h.controller.toggle(0);h.acknowledge();
 h.controller.noteOn(note(40));assert.deepEqual(h.calls.at(-1),['hold',3840]);
});
class Emitter {handlers=[];on(fn){this.handlers.push(fn)}trigger(value){for(const fn of this.handlers)fn(value)}}
test('actual bundled synthesizer ranges prevent dispatch of the next attack, then allow it after resume',()=>{
 const output={sampleRate:44100,ready:new Emitter(),sampleRequest:new Emitter(),samplesPlayed:new Emitter(),
 open(){this.ready.trigger()},pause(){},play(){},activate(){},resetSamples(){this.last=0},addSamples(samples){this.last=samples.length/2},close(){}};
 const synth=new at.synth.AlphaSynth(output,100);
 synth.loadSoundFont(new Uint8Array(fs.readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2',import.meta.url))),false);
 const {midi}=generate(String.raw`\tempo 120 . 0.6.4 1.6.4 2.6.4 3.6.4`);synth.loadMidiFile(midi);
 const seen=[];const original=synth.synthesizer.dispatchEvent.bind(synth.synthesizer);
 synth.synthesizer.dispatchEvent=event=>{if(event.event.type===at.midi.MidiEventType.NoteOn)seen.push(event.event.tick);original(event)};
 const pump=()=>{for(let i=0;i<30;i++){output.sampleRequest.trigger();output.samplesPlayed.trigger(output.last||0)}};
 synth.playbackRange={startTick:0,endTick:960};synth.play();pump();
 assert.ok(seen.includes(0));assert.ok(!seen.includes(960));
 synth.pause();synth.playbackRange={startTick:960,endTick:1920};synth.tickPosition=960;seen.length=0;synth.play();pump();
 assert.ok(seen.includes(960));assert.ok(!seen.includes(1920));
 // Rewind/seek state reconstruction may dispatch past notes silently. It cannot
 // dispatch the unearned future target during actual range synthesis.
});

test('controller steps real synth cursor without starting backing playback',async()=>{
 const output={sampleRate:44100,ready:new Emitter(),sampleRequest:new Emitter(),samplesPlayed:new Emitter(),
 open(){this.ready.trigger()},pause(){},play(){},activate(){},resetSamples(){this.last=0},addSamples(samples){this.last=samples.length/2},close(){}};
 const synth=new at.synth.AlphaSynth(output,100);
 synth.loadSoundFont(new Uint8Array(fs.readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2',import.meta.url))),false);
 const {midi,timeline}=generate(String.raw`\tempo 120 . 0.6.4 1.6.4 2.6.4 3.6.4`);synth.loadMidiFile(midi);
 const targets=getPracticeEvents(timeline,'0');let state;
 const controller=new WaitController({
  acquire(){synth.isLooping=false},
  hold(tick){synth.pause();synth.playbackRange=null;synth.tickPosition=tick},
  segment(startTick,endTick){synth.pause();synth.playbackRange={startTick,endTick};synth.tickPosition=startTick;synth.play()},
  pause(){synth.pause()},resume(){synth.play()},release(){synth.pause();synth.playbackRange=null},
  finish(tick){queueMicrotask(()=>{synth.pause();synth.playbackRange=null;synth.tickPosition=tick})},
 },next=>state=next);
 synth.positionChanged.on(position=>controller.positionChanged(position));
 let playCalls=0;const originalPlay=synth.play.bind(synth);synth.play=()=>{playCalls++;return originalPlay()};
 controller.configure(targets,timeline.endTick);controller.toggle(0);
 assert.equal(state.phase,'waiting');assert.equal(synth.state,0);
 for(let i=0;i<targets.length;i++) {
  assert.equal(state.currentEvent.id,targets[i].id);
  controller.noteOn(note(targets[i].pitches[0]));
  for(let j=0;j<4;j++) {
   output.sampleRequest.trigger();output.samplesPlayed.trigger(output.last||0);await Promise.resolve();
  }
  assert.equal(state.results.correct,i+1);
  assert.equal(state.phase,i===targets.length-1?'complete':'waiting');
 }
 assert.equal(state.results.pending,0);assert.equal(synth.state,0);assert.equal(playCalls,0);
 assert.ok(Math.abs(synth.tickPosition-timeline.endTick)<=2);
});
