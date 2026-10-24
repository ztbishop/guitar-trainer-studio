import test from 'node:test';
import assert from 'node:assert/strict';
import {fretboardBeats,fretboardContext,fretboardStepTick,fretboardLabel} from '../js/fretboard-context.js';
import {buildFretboardModel} from '../js/practice-visuals.js';
import {readDisplayPreferences,saveDisplayPreferences} from '../js/display-preferences.js';
import {nativeAlphaTab,fixtureScore} from './fretboard-fixtures.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';

const note=(string,fret,midi=64)=>({string,fret,midi,id:`${string}:${fret}`,leftHandFinger:2});
const beat=(tick,bar,notes=[],extra={})=>({trackId:'0',startTick:tick,playbackMeasureIndex:bar,staffIndex:0,notes,...extra});
const beats=[beat(0,0,[note(1,0)]),beat(240,0,[],{isRest:true}),beat(480,0,[note(1,2)]),beat(960,1,[note(2,3)]),beat(1920,2,[note(1,0)])];

test('fretboard context respects rests, subdivisions, repeat occurrences and loop limits',()=>{
  const before=JSON.stringify(beats);
  assert.deepEqual(fretboardContext(beats,beats[0],'beat'),[]);
  assert.equal(fretboardContext(beats,beats[0],'next')[0].isRest,true);
  assert.deepEqual(fretboardContext(beats,beats[2],'bar').map(e=>[e.startTick,e.previewState]),[[0,'past'],[240,'past'],[960,'future']]);
  assert.deepEqual(fretboardContext(beats,beats[4],'bar'),[]);
  assert.equal(fretboardStepTick(beats,480,-1),240);
  assert.equal(fretboardStepTick(beats,240,1),480);
  assert.equal(fretboardStepTick(beats,0,-1),null);
  assert.equal(fretboardStepTick(beats,1920,1),null);
  assert.deepEqual(fretboardBeats({events:beats},0,{startTick:480,endTick:1920}).map(e=>e.startTick),[480,960]);
  assert.equal(JSON.stringify(beats),before);
});

test('bar boundary previews one next onset across voices and repeats, respects rests/end and wraps enabled loops',()=>{
  const multi=[...beats,beat(960,1,[note(3,4)],{voiceIndex:1})].sort((a,b)=>a.startTick-b.startTick);
  const boundary=fretboardContext(multi,beats[2],'bar');
  assert.equal(boundary.filter(e=>e.previewState==='future').length,2,'simultaneous voices form one upcoming onset');
  assert(fretboardContext(beats,beats[3],'bar').some(e=>e.startTick===1920 && e.previewState==='future'));
  assert.deepEqual(fretboardContext(beats,beats[4],'bar'),[],'song end invents no next beat');
  const range=beats.slice(2,4);
  assert.equal(fretboardContext(range,range[1],'bar',{loop:true})[0].startTick,480);
  assert.equal(fretboardContext(range,range[1],'next',{loop:true})[0].startTick,480);
  assert.deepEqual(fretboardContext(range,range[1],'next'),[]);
  const rest=[beat(0,0,[note(1,0)]),beat(960,1,[],{isRest:true}),beat(1920,1,[note(1,2)])];
  const preview=fretboardContext(rest,rest[0],'bar');
  assert.equal(preview.length,1);assert.equal(preview[0].isRest,true,'do not skip a rest to show a later attack');
  const full=fretboardContext(beats,beats[3],'bar');
  assert(full.every(e=>e.playbackMeasureIndex!==0),'entering next bar replaces old-bar context');
});

test('alternate guides use exact current pitches only, stay neutral, and respect capo/tuning/written priority',()=>{
  const track={staves:[{tuning:[64,59,55,50,45,40],capo:2,transpositionPitch:0}]};
  const current=beat(0,0,[note(1,0,66),note(1,0,66)]);
  const args={track,currentEvent:current,contextEvents:[{...beat(960,0,[note(2,5,66)]),previewState:'future'}],noteStates:{'1:0':'correct'}};
  const before=JSON.stringify(args);
  assert.deepEqual(buildFretboardModel(args).alternatives,[],'off by default');
  const model=buildFretboardModel({...args,showAlternatePositions:true});
  assert(model.alternatives.length>0);
  assert.equal(new Set(model.alternatives.map(n=>`${n.string}:${n.fret}`)).size,model.alternatives.length);
  for(const guide of model.alternatives) {
    assert.equal(model.openPitches[guide.string-1]+guide.fret,66,'no octave equivalents');
    assert.equal(guide.state,'alternative','never borrow green/red acceptance');
    assert.equal(guide.finger,undefined,'never infer alternative fingering');
    assert(!model.targets.some(n=>n.string===guide.string && n.fret===guide.fret));
    assert(!model.context.some(n=>n.string===guide.string && n.fret===guide.fret));
  }
  assert.equal(JSON.stringify(args),before);
  const wrong=buildFretboardModel({...args,showAlternatePositions:true,activeNotes:[{midi:66,channel:1}],liveWrongNotes:[{midi:66,channel:1}]});
  assert(wrong.played.length>1 && wrong.played.every(n=>n.state==='wrong'),'live wrong rings remain independent and prominent');
  assert(wrong.alternatives.every(n=>n.state==='alternative'),'guide styling never becomes a grading result');
  const muted=buildFretboardModel({...args,currentEvent:{...current,notes:[{...current.notes[0],isDead:true}]},showAlternatePositions:true});
  assert.deepEqual(muted.alternatives,[]);
});

test('alternate-position preference defaults off, validates booleans and saves independently',()=>{
  let saved=null;const storage={getItem(){return saved;},setItem(_,value){saved=value;}};
  assert.equal(readDisplayPreferences(storage).ui.showAlternatePositions,false);
  const state=readDisplayPreferences(storage);state.ui.showAlternatePositions=true;state.ui.fretboardView='bar';
  saveDisplayPreferences(state,storage);assert.equal(readDisplayPreferences(storage).ui.showAlternatePositions,true);
  state.ui.showAlternatePositions=false;saveDisplayPreferences(state,storage);
  assert.equal(readDisplayPreferences(storage).ui.fretboardView,'bar');
  saved=JSON.stringify({ui:{showAlternatePositions:'true'}});
  assert.equal(readDisplayPreferences(storage).ui.showAlternatePositions,false);
});

test('context deduplicates positions with current over future over past; old errors cannot leak',()=>{
  const track={staves:[{tuning:[64,59,55,50,45,40]}]};
  const current=beat(480,0,[note(1,2)]);
  const model=buildFretboardModel({track,currentEvent:current,noteStates:{'1:2':'correct','2:3':'missed'},
    contextEvents:[{...beat(0,0,[note(1,2),note(2,3)]),previewState:'past'},
      {...beat(720,0,[note(1,2),note(2,3),note(3,36)]),previewState:'future'}]});
  assert.equal(model.targets[0].state,'correct','pitch accepted at written target');
  assert.deepEqual(model.context.map(n=>[n.string,n.fret,n.state]),[[2,3,'future'],[3,36,'future']]);
  assert.equal(model.maxFret,36);
});

test('finger labels only use explicit native data, including thumb, never guess',()=>{
  for(const finger of [-2,-1,undefined,null,5])assert.equal(fretboardLabel({finger},'fingers'),'');
  assert.equal(fretboardLabel({finger:0},'fingers'),'T');
  assert.equal(fretboardLabel({finger:4},'fingers'),'4');
  assert.equal(fretboardLabel({fret:0},'frets'),'0');
  assert.equal(fretboardLabel({},'none'),'');
});

test('native fingering survives Guitar Pro export/import and timeline normalization',()=>{
  const at=nativeAlphaTab(),settings=new at.Settings();
  const source=fixtureScore(at);
  const notes=source.tracks[3].staves[0].bars[0].voices[0].beats[0].notes;
  notes[0].leftHandFinger=at.model.Fingers.Thumb;notes[1].leftHandFinger=at.model.Fingers.LittleFinger;
  const bytes=new at.exporter.Gp7Exporter().export(source,settings);
  const score=at.importer.ScoreLoader.loadScoreFromBytes(bytes,settings);
  const generator=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(new at.midi.MidiFile()));
  generator.generate();
  const events=getPracticeEvents(buildPlaybackTimeline(generator.tickLookup),'3');
  const model=buildFretboardModel({track:score.tracks[3],currentEvent:events[0],labelMode:'fingers'});
  assert.deepEqual(model.targets.map(n=>fretboardLabel(n,'fingers')),['T','4']);
});

test('all fretboard choices persist independently; invalid stored fields retain defaults',()=>{
  let saved=null;const storage={setItem(_,value){saved=value;},getItem(){return saved;}};
  for(const fretboardView of ['beat','next','bar'])for(const fretboardLabels of ['notes','frets','fingers','none']) {
    const state=readDisplayPreferences(storage);Object.assign(state.ui,{fretboardView,fretboardLabels,leftHanded:true,showFretboard:false});
    saveDisplayPreferences(state,storage);const restored=readDisplayPreferences(storage);
    assert.equal(restored.ui.fretboardView,fretboardView);assert.equal(restored.ui.fretboardLabels,fretboardLabels);
    assert.equal(restored.ui.leftHanded,true);assert.equal(restored.ui.showFretboard,false);
  }
  saved=JSON.stringify({ui:{fretboardView:'bad',fretboardLabels:'bad'}});
  assert.equal(readDisplayPreferences(storage).ui.fretboardView,'bar');
  assert.equal(readDisplayPreferences(storage).ui.fretboardLabels,'notes');
});
