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
  assert.deepEqual(fretboardContext(beats,beats[2],'bar').map(e=>[e.startTick,e.previewState]),[[0,'past'],[240,'past']]);
  assert.deepEqual(fretboardContext(beats,beats[4],'bar'),[]);
  assert.equal(fretboardStepTick(beats,480,-1),240);
  assert.equal(fretboardStepTick(beats,240,1),480);
  assert.equal(fretboardStepTick(beats,0,-1),null);
  assert.equal(fretboardStepTick(beats,1920,1),null);
  assert.deepEqual(fretboardBeats({events:beats},0,{startTick:480,endTick:1920}).map(e=>e.startTick),[480,960]);
  assert.equal(JSON.stringify(beats),before);
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
  assert.equal(readDisplayPreferences(storage).ui.fretboardView,'beat');
  assert.equal(readDisplayPreferences(storage).ui.fretboardLabels,'notes');
});
