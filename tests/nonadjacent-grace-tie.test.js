import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {tapProbe} from './right-hand-tap-fixtures.cjs';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
const probe=tapProbe(),classic=probe.at;
function make(at,repeat=false){
 const p=new at.importer.AlphaTexImporter();p.initFromString(repeat?String.raw`. \ro r.2 0.1.32 3.2.32 (-.1 5.2).8 3.2.8 \rc 2`:'. r.2 0.1.32 3.2.32 (-.1 5.2).8 3.2.8',new at.Settings());const s=p.readScore();
 const v=s.tracks[0].staves[0].bars[0].voices[0];v.beats[1].graceType=at.model.GraceType.OnBeat;v.beats[2].graceType=at.model.GraceType.OnBeat;
 if(repeat){s.masterBars[0].isRepeatStart=true;s.masterBars[0].repeatCount=2;}s.finish(new at.Settings());return s;
}
function cache(at,s){const m=new at.midi.MidiFile(),g=new at.midi.MidiFileGenerator(s,new at.Settings(),new at.midi.AlphaSynthMidiFileHandler(m));g.generate();return g.tickLookup;}
const timeline=(at,s,c=cache(at,s))=>buildPlaybackTimeline(c,{score:s,tempo:s.tempo});
const shape=s=>s.tracks[0].staves[0].bars.flatMap(b=>b.voices.flatMap(v=>v.beats.flatMap(e=>e.notes.map(n=>[e.index,n.string,n.fret,n.realValue,n.tieOrigin?.id,n.tieDestination?.id,e.playbackStart,e.playbackDuration]))));
function variants(){const bytes=probe.gp(make(classic));const imported=probe.read(bytes);return [['classic',classic,imported],['worker',classic,probe.p.JsonConverter.jsObjectToScore(structuredClone(probe.p.JsonConverter.scoreToJsObject(imported)),new classic.Settings())],['core',core,core.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes),new core.Settings())]];}
test('nonadjacent same-group grace sustain survives classic/core/worker without changing native notes or attacks',()=>{
 for(const [name,at,s]of variants()){
  const before=shape(s),t=timeline(at,s),notes=t.events.flatMap(e=>e.notes),root=notes.find(n=>n.attack&&n.string===1),dest=notes.find(n=>!n.attack);
  assert.deepEqual(shape(s),before,name);assert.equal(root.startTick,1920);assert.equal(root.endTick,2400);assert.equal(root.durationTicks,480);assert.equal(dest.attackNoteId,root.id);assert.equal(dest.endTick,2400);
  assert.deepEqual(getPracticeEvents(t,0).map(e=>[e.startTick,e.notes.map(n=>[n.midi,n.string])]),[[1920,[[64,1]]],[1980,[[62,2]]],[2040,[[64,2]]],[2400,[[62,2]]]]);
  assert(t.ambiguousHoldRanges.length,'Practice fix must not loosen recording timing evidence');
 }
});
test('each repeated occurrence has its own full sustained root; missing origin cannot borrow the earlier pass',()=>{
 const s=make(core,true),c=cache(core,s),t=timeline(core,s,c),roots=t.events.flatMap(e=>e.notes).filter(n=>n.attack&&n.string===1);
 assert.equal(roots.length,2);for(const root of roots)assert.equal(root.endTick-root.startTick,480);
 const origin=s.tracks[0].staves[0].bars[0].voices[0].beats[1];
 const revisits=c.masterBars.filter(v=>v.masterBar===origin.voice.bar.masterBar);assert.equal(revisits.length,2);
 for(let span=revisits[1].firstBeat;span;span=span.nextBeat)span.highlightedBeats=span.highlightedBeats.filter(x=>x.beat!==origin);
 const skipped=timeline(core,s,c),held=skipped.events.flatMap(e=>e.notes).filter(n=>n.attack&&n.string===1),dest=skipped.events.flatMap(e=>e.notes).filter(n=>!n.attack).at(-1);
 assert.equal(held.length,1);assert.equal(held[0].endTick,2400);assert.equal(dest.attackNoteId,null);
});
for(const [name,mutate]of Object.entries({
 'intervening main note':(v)=>v.beats[2].graceType=0,
 'intervening rest':v=>{v.beats[2].notes=[];},
 'same-string reattack':v=>{v.beats[2].notes[0].string=v.beats[1].notes[0].string;},
 'nonreciprocal pointer':v=>v.beats[1].notes[0].tieDestination=null,
 'dead intervening grace':v=>v.beats[2].notes[0].isDead=true,
 'mixed grace kinds':v=>v.beats[1].graceType=2,
 'missing played grace':(v,c)=>{for(let span=c.masterBars[0].firstBeat;span;span=span.nextBeat)span.highlightedBeats=span.highlightedBeats.filter(x=>x.beat!==v.beats[2]);},
 'wrong performed clock':(v,c)=>{for(let span=c.masterBars[0].firstBeat;span;span=span.nextBeat)for(const x of span.highlightedBeats)if(x.beat===v.beats[2])x.playbackStart+=1;},
 'pitch-changing continuation':v=>v.beats[3].notes.find(n=>n.isTieDestination).fret=1,
 'expressive origin':v=>v.beats[1].notes[0].isLetRing=true
}))test('nonadjacent sustain guard: '+name,()=>{
 const s=make(core),v=s.tracks[0].staves[0].bars[0].voices[0],c=cache(core,s);mutate(v,c);const t=timeline(core,s,c),root=t.events.flatMap(e=>e.notes).find(n=>n.attack&&n.sourceNoteId===String(v.beats[1].notes[0].id));assert.equal(root.endTick,1980);
});

test('before-beat grace ties also keep the full sustain in normal native imports',()=>{
 for(const at of [classic,core]){
  const s=make(at),v=s.tracks[0].staves[0].bars[0].voices[0];
  v.beats[1].graceType=at.model.GraceType.BeforeBeat;v.beats[2].graceType=at.model.GraceType.BeforeBeat;
  s.finish(new at.Settings());const t=timeline(at,s),notes=t.events.flatMap(e=>e.notes),first=notes.find(n=>n.attack&&n.string===1),dest=notes.find(n=>!n.attack);
  assert.equal(first.startTick,1800);assert.equal(first.endTick,2400);assert.equal(dest.startTick,1920);assert.equal(dest.attackNoteId,first.id);
 }
});
