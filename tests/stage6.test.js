import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {noteStatesFromRecords,buildNotationMarks,notationRectangles,buildFretboardModel,fretX} from '../js/practice-visuals.js';
import {WaitController} from '../js/wait-controller.js';
import {RealtimeSession} from '../js/realtime-session.js';
import {initFretboard,renderFretboard} from '../js/fretboard-ui.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';

const event=(id,source='written',occurrence=1)=>({id,startTick:0,startTimeMs:0,measureNumber:1,occurrence,staffIndex:0,
 notes:[{id:id+':note',sourceNoteId:source,midi:40,noteName:'E2',string:6,fret:0}]});
test('visual records distinguish correct, missed, pending and skipped without changing records',()=>{
 const records=[{slots:[{noteIds:['a','unison'],hit:{at:1}},{noteIds:['b'],missed:true},{noteIds:['c'],hit:false}]},{skipped:true,slots:[{noteIds:['d'],hit:true}]}];
 const before=JSON.stringify(records);assert.deepEqual(noteStatesFromRecords(records),{a:'correct',unison:'correct',b:'missed'});assert.equal(JSON.stringify(records),before);
});
test('current repeated occurrence replaces old green feedback on the same written note',()=>{
 const a=event('first'),b=event('repeat','written',2);
 const marks=buildNotationMarks([a,b],b,{[a.notes[0].id]:'correct'});
 assert.equal(marks.length,1);assert.equal(marks[0].state,'expected');assert.match(marks[0].label,/occurrence 2/);
 assert.equal(buildNotationMarks([a,b],b,{[b.notes[0].id]:'missed'})[0].state,'missed');
 assert.deepEqual(buildNotationMarks([a,b],null,{}),[]);
});
test('notation outlines cover both staff and tab note bounds; hidden notes and unfinished layouts are skipped',()=>{
 const note={id:7,beat:{id:1}},marks=[{sourceNoteId:'7',state:'correct'}];
 const bounds={isFinished:true,findBeats:()=>[{notes:[{note,noteHeadBounds:{x:10,y:20,w:8,h:6}}]},{notes:[{note,noteHeadBounds:{x:10,y:90,w:10,h:12}}]}]};
 const rects=notationRectangles(marks,new Map([['7',note]]),bounds);
 assert.equal(rects.length,2);assert.deepEqual([rects[0].x,rects[0].y,rects[0].width,rects[0].height],[7,17,14,12]);
 assert.deepEqual(notationRectangles(marks,new Map(),bounds),[]);assert.deepEqual(notationRectangles(marks,new Map([['7',note]]),{...bounds,isFinished:false}),[]);
});
const track={staves:[{tuning:[64,59,55,50,45,40],capo:0,transpositionPitch:0}]};
test('single-channel played pitch shows possible positions and target uses scored string/fret',()=>{
 const target={...event('a'),notes:[{id:'a',midi:64,string:1,fret:0}]};
 const model=buildFretboardModel({track,currentEvent:target,noteStates:{a:'correct'},activeNotes:[{midi:64}],lastFeedback:{type:'correct',midi:64}});
 assert.equal(model.targets[0].string,1);assert.equal(model.targets[0].state,'correct');assert.equal(model.played.length,6);assert.match(model.message,/possible positions/);
});
test('hex channel string hint limits played positions; tuning and capo are respected',()=>{
 const altered={staves:[{tuning:[64,59,55,50,45,38],capo:2,transpositionPitch:0}]};
 const model=buildFretboardModel({track:altered,inputMode:'hex-6ch',activeNotes:[{midi:40,stringHint:6}],lastFeedback:{type:'wrong',midi:40}});
 assert.deepEqual(model.played,[{string:6,fret:0,midi:40,state:'wrong'}]);assert.equal(model.openPitches[5],40);
 assert.ok(Math.abs(fretX(3,24,true)+fretX(3,24,false)-1200)<0.001);
});
test('unsupported tracks and out-of-range pitches do not fabricate playable positions',()=>{
 assert.equal(buildFretboardModel({track:{staves:[{tuning:[43,38,33,28]}]}}).supported,false);
 const model=buildFretboardModel({track,activeNotes:[{midi:20}]});assert.deepEqual(model.played,[]);assert.deepEqual(model.unmappedPitches,[20]);
});
test('Wait correct feedback persists after immediate advancement and clears on Stop and loop restart',()=>{
 let state;const b={...event('b','other'),startTick:960};
 const controller=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},s=>state=s);
 controller.configure([event('a'),b],1920,false,true);controller.toggle(0);controller.noteOn({type:'note-on',midi:40,channel:1});
 assert.equal(state.noteStates['a:note'],'correct');assert.equal(state.lastFeedback.midi,40);
 controller.noteOn({type:'note-on',midi:40,channel:1});assert.deepEqual(state.noteStates,{});controller.stop();assert.deepEqual(state.noteStates,{});
});
test('Realtime grading exposes correct and missed notes, then clears on reset',()=>{
 const session=new RealtimeSession([event('a'),{...event('b','other'),startTimeMs:500}]);session.started=true;
 session.noteOn({midi:40,channel:1,at:0},0);session.advance(700);
 assert.deepEqual(noteStatesFromRecords(session.records),{'a:note':'correct','b:note':'missed'});
 session.reset();assert.deepEqual(noteStatesFromRecords(session.records),{});
});
test('actual alphaTab normalization yields high-to-low guitar labels and occurrence-safe source IDs',()=>{
 const context=vm.createContext({console,process});vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);const at=context.alphaTab;
 const parser=new at.importer.AlphaTexImporter();parser.initFromString(String.raw`\tempo 120 . \ro (0.6 0.1).1 | \rc 2 2.6.1`,new at.Settings());const score=parser.readScore();
 const midi=new at.midi.MidiFile(),gen=new at.midi.MidiFileGenerator(score,new at.Settings(),new at.midi.AlphaSynthMidiFileHandler(midi));gen.generate();
 const targets=getPracticeEvents(buildPlaybackTimeline(gen.tickLookup),'0');const model=buildFretboardModel({track:score.tracks[0],currentEvent:targets[0]});
 assert.deepEqual(model.targets.map(t=>[t.string,t.midi]),[[6,40],[1,64]]);assert.equal(model.openPitches[0],64);assert.equal(model.openPitches[5],40);
 assert.equal(targets[0].notes[0].sourceNoteId,targets[2].notes[0].sourceNoteId);
 const statuses={[targets[0].notes[0].id]:'correct'};assert.equal(buildNotationMarks(targets,targets[2],statuses).find(m=>m.sourceNoteId===targets[2].notes[0].sourceNoteId).state,'expected');
 const nativeNote=score.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
 const lookup=new at.rendering.BoundsLookup();
 const system=new at.rendering.StaffSystemBounds(),master=new at.rendering.MasterBarBounds(),bar=new at.rendering.BarBounds(),beat=new at.rendering.BeatBounds(),bound=new at.rendering.NoteBounds();
 const box=()=>{const b=new at.rendering.Bounds();b.x=10;b.y=20;b.w=8;b.h=6;return b};
 system.visualBounds=box();system.realBounds=box();lookup.addStaffSystem(system);
 master.index=0;master.visualBounds=box();master.realBounds=box();master.lineAlignedBounds=box();lookup.addMasterBar(master);
 bar.visualBounds=box();bar.realBounds=box();master.addBar(bar);
 beat.beat=nativeNote.beat;beat.visualBounds=box();beat.realBounds=box();bar.addBeat(beat);
 bound.note=nativeNote;bound.noteHeadBounds=box();beat.addNote(bound);lookup.finish(1.5);
 const rects=notationRectangles([{sourceNoteId:String(nativeNote.id),state:'expected'}],new Map([[String(nativeNote.id),nativeNote]]),lookup);
 assert.equal(rects.length,1);assert.equal(rects[0].x,12);assert.equal(rects[0].width,18);
});
test('fretboard DOM renders accessible SVG, flips orientation and removes released markers',()=>{
 const previous=globalThis.document;
 class Element {constructor(tag){this.tag=tag;this.children=[];this.attrs={}}appendChild(el){this.children.push(el);return el}replaceChildren(){this.children=[]}setAttribute(k,v){this.attrs[k]=v}}
 globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
 try {
  const container=new Element('div');initFretboard(container);
  renderFretboard(buildFretboardModel({track,currentEvent:event('a'),activeNotes:[{midi:40}],leftHanded:true}));
  const svg=container.children.find(c=>c.className==='fretboard-scroll').children[0];assert.equal(svg.attrs.role,'img');assert.match(svg.attrs['aria-label'],/left-handed/);
  assert.ok(svg.children.some(c=>c.attrs.class==='fretboard-marker fretboard-marker-played'));
  renderFretboard(buildFretboardModel({track,currentEvent:event('a'),activeNotes:[]}));
  const next=container.children.find(c=>c.className==='fretboard-scroll').children[0];assert.ok(!next.children.some(c=>c.attrs.class==='fretboard-marker fretboard-marker-played'));
 } finally {globalThis.document=previous;}
});
