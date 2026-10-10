import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {notationFeedbackGeometry,spellPitch,displayedMidi} from '../js/notation-feedback.js';
import {standardBeatForNote} from '../js/practice-visuals.js';

const context=vm.createContext({console,process});
vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
const at=context.alphaTab;
function render({key=-2,clef=4,scale=1,profile=1,transpose=0,displayTranspose=-12,ottava=2,clefOttava=2,capo=0}={}) {
  const settings=new at.Settings();settings.core.engine='svg';settings.core.includeNoteBounds=true;
  settings.display.scale=scale;settings.display.staveProfile=profile;
  const parser=new at.importer.AlphaTexImporter();parser.initFromString('0.6.8 1.6.8 2.6.8 18.6.8 19.6.8 20.6.8 32.6.8 44.6.8',settings);
  const score=parser.readScore(),staff=score.tracks[0].staves[0],bar=staff.bars[0];
  staff.transpositionPitch=transpose;staff.displayTranspositionPitch=displayTranspose;staff.capo=capo;
  bar.keySignature=key;bar.clef=clef;bar.clefOttava=clefOttava;
  for(const beat of bar.voices[0].beats)beat.ottava=ottava;
  const renderer=new at.rendering.ScoreRenderer(settings);renderer.width=1000;
  renderer.error.on(e=>{throw e});renderer.renderScore(score,[0]);
  const notes=bar.voices[0].beats.flatMap(b=>b.notes),lookup=new Map(notes.map(n=>[String(n.id),n]));
  const e=settings.display.resources.engravingSettings;
  const metrics={profile,scale,oneStaffSpace:e.oneStaffSpace,staffLineThickness:e.staffLineThickness,
    noteHeadWidth:e.glyphWidths.get(0xe0a4),noteHeadHeight:e.glyphHeights.get(0xe0a4)};
  const geometry=marks=>notationFeedbackGeometry(marks,lookup,renderer.boundsLookup,metrics);
  return {notes,lookup,renderer,metrics,geometry,bar,staff};
}

test('key-aware spelling selects Bb in Bb major and explicit sharps/naturals elsewhere',()=>{
  assert.equal(spellPitch(70,-2).name,'B♭4');assert.equal(spellPitch(70,2).name,'A♯4');
  assert.equal(spellPitch(71,-2).accidental,'♮');assert.equal(spellPitch(65,7).name,'E♯4');
  assert.equal(spellPitch(59,-7).name,'C♭4');assert.equal(spellPitch(60,-2).name,'C4');
});

test('wrong-pitch staff heights match independently rendered native reference notes across clefs, keys and zoom',()=>{
  for(const clef of [1,2,3,4])for(const key of [-7,-2,0,2,7])for(const scale of [0.75,1,1.5]) {
    const h=render({clef,key,scale});const anchor=h.notes[0];
    const mark={kind:'wrong-pitches',sourceNoteId:String(anchor.id),pitches:h.notes.map(n=>n.realValue),retained:true};
    const dots=h.geometry([mark]).wrongNotes;assert.equal(dots.length,h.notes.length,`clef ${clef}, key ${key}, scale ${scale}`);
    for(const reference of h.notes) {
      const nativeBeat=standardBeatForNote(reference,h.renderer.boundsLookup,1);
      const b=nativeBeat.notes.find(n=>n.note.id===reference.id).noteHeadBounds;
      const dot=dots.find(n=>n.midi===reference.realValue);
      assert.ok(Math.abs(dot.cy-(b.y+b.h/2))<0.001,`${dot.spelling}: native staff position`);
      assert.equal(dot.retained,true);assert.ok(dot.accidental);
    }
  }
});

test('guitar display transposition, sounding transposition and octave clefs/ottava remain independent',()=>{
  for(const options of [{transpose:-2},{capo:2},{displayTranspose:0},{ottava:1},{ottava:3},{clefOttava:1},{clefOttava:3}]) {
    const h=render(options),anchor=h.notes[0],reference=h.notes[3];
    const dot=h.geometry([{kind:'wrong-pitches',sourceNoteId:String(anchor.id),pitches:[reference.realValue]}]).wrongNotes[0];
    const beat=standardBeatForNote(reference,h.renderer.boundsLookup,1);
    const b=beat.notes[0].noteHeadBounds;
    assert.equal(displayedMidi(reference.realValue,anchor),reference.displayValue);
    assert.ok(Math.abs(dot.cy-(b.y+b.h/2))<0.001);
  }
});

test('standard feedback fills notehead bounds while tab keeps original outline bounds',()=>{
  const h=render(),note=h.notes[0];
  for(const state of ['correct','completed-with-errors','missed','expected']) {
    const targets=h.geometry([{sourceNoteId:String(note.id),state}]).targets;
    assert.equal(targets.length,2);assert.equal(targets[0].kind,'notehead');assert.equal(targets[1].kind,'outline');
    const beat=standardBeatForNote(note,h.renderer.boundsLookup,1),b=beat.notes[0].noteHeadBounds;
    assert.equal(targets[0].cx,b.x+b.w/2);assert.equal(targets[0].cy,b.y+b.h/2);assert.equal(targets[0].rx,b.w/2);
    assert.equal(targets[1].state,state);
  }
});

test('ledger lines and all wrong pitches stay in one target column, with one dot per distinct pitch',()=>{
  const h=render({displayTranspose:0,key:0}),note=h.notes[0];
  const mark={kind:'wrong-pitches',sourceNoteId:String(note.id),pitches:[60,61,60,32,88],retained:false};
  const dots=h.geometry([mark]).wrongNotes;assert.equal(dots.length,4);
  assert.ok(dots.find(n=>n.midi===32).ledgerYs.length>0);assert.ok(dots.find(n=>n.midi===88).ledgerYs.length>0);
  assert.equal(dots.find(n=>n.midi===60).cy,dots.find(n=>n.midi===61).cy);
  assert.equal(dots.find(n=>n.midi===60).cx,dots.find(n=>n.midi===61).cx);
  assert.ok(dots.every(n=>n.cx===dots[0].cx));assert.ok(dots.every(n=>n.accidentalX===dots[0].accidentalX));
  assert.ok(dots.every(n=>n.retained===false));
  const second=h.notes[1],other=h.geometry([{...mark,sourceNoteId:String(second.id),retained:true}]).wrongNotes;
  const bound=standardBeatForNote(second,h.renderer.boundsLookup,1).notes[0].noteHeadBounds;
  assert.ok(other.every(n=>n.cx===bound.x+bound.w/2 && n.retained));
  assert.notEqual(other[0].cx,dots[0].cx);
});

test('unsupported notation, invalid metrics and mismatched geometry omit wrong dots without guessed placement',()=>{
  for(const profile of [3,4]) {
    const h=render({profile});assert.deepEqual(h.geometry([{kind:'wrong-pitches',sourceNoteId:String(h.notes[0].id),pitches:[58]}]).wrongNotes,[]);
  }
  const h=render(),note=h.notes[0],mark={kind:'wrong-pitches',sourceNoteId:String(note.id),pitches:[58]};
  h.metrics.oneStaffSpace=NaN;assert.deepEqual(h.geometry([mark]).wrongNotes,[]);
  h.metrics.oneStaffSpace=30;assert.deepEqual(h.geometry([mark]).wrongNotes,[]);
});
