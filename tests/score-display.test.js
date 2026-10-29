import test from 'node:test';
import assert from 'node:assert/strict';
import {ScoreDisplayProjection,hasWrittenTab,visibleTab} from '../js/score-display.js';
import {nativeAlphaTab} from './fretboard-fixtures.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
import {standardBeatForNote} from '../js/practice-visuals.js';
import {readDisplayPreferences,saveDisplayPreferences} from '../js/display-preferences.js';

test('native tab-only source gains notation; all views/rhythm choices preserve pitch, timing and chord settings',()=>{
  const at=nativeAlphaTab(),settings=new at.Settings();settings.core.engine='svg';settings.core.includeNoteBounds=true;
  const parser=new at.importer.AlphaTexImporter();parser.initFromString('0.6.8 2.5.8 (2.4 0.3).4',settings);
  const score=parser.readScore(),staff=score.tracks[0].staves[0];staff.showStandardNotation=false;staff.showTablature=true;
  const projection=new ScoreDisplayProjection();projection.remember(score);
  const timeline=()=>{const midi=new at.midi.MidiFile(),g=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));g.generate();return JSON.stringify(getPracticeEvents(buildPlaybackTimeline(g.tickLookup),'0'));};
  const before=timeline(),stylesheet=JSON.stringify(score.stylesheet),note=staff.bars[0].voices[0].beats[0].notes[0];
  for(const [view,notation,tab] of [['both',true,true],['tab',false,true],['notation',true,false],['score-default',false,true]]) {
    projection.apply(score,view);
    assert.equal(staff.showStandardNotation,notation);assert.equal(staff.showTablature,tab);
    for(const rhythm of [at.TabRhythmMode.Automatic,at.TabRhythmMode.ShowWithBars,at.TabRhythmMode.Hidden]) {
      settings.notation.rhythmMode=rhythm;
      const renderer=new at.rendering.ScoreRenderer(settings);renderer.width=1000;renderer.renderScore(score,[0]);
      assert.equal(Boolean(standardBeatForNote(note,renderer.boundsLookup)),notation);
      const tabRenderer=renderer.layout.getRendererForBar('tab',staff.bars[0]);
      if(tab)assert.equal(tabRenderer.rhythmMode,rhythm===at.TabRhythmMode.Automatic?(notation?at.TabRhythmMode.Hidden:at.TabRhythmMode.ShowWithBars):rhythm);
    }
    assert.equal(timeline(),before,'display leaves practice events unchanged');
    assert.equal(JSON.stringify(score.stylesheet),stylesheet,'diagram stylesheet remains independent');
  }
});

test('notation without fingering and percussion retain a visible staff; defaults restore per score',()=>{
  const flags={showStandardNotation:true,showTablature:false,showSlashNotation:false,showNumberedNotation:false};
  const staff={...flags,tuning:[64,59,55,50,45,40],bars:[{voices:[{beats:[{notes:[{string:-1,fret:-1}]}]}]}]};
  const drums={...flags,isPercussion:true,tuning:[]},score={tracks:[{index:0,staves:[staff,drums]}]};
  const projection=new ScoreDisplayProjection();
  assert.equal(hasWrittenTab(staff),false);
  projection.apply(score,'tab');assert.equal(staff.showStandardNotation,true);assert.equal(drums.showStandardNotation,true);
  assert.equal(visibleTab({tracks:score.tracks,viewMode:'all-tracks'}),false);
  projection.apply(score,'score-default');for(const [k,v] of Object.entries(flags))assert.equal(staff[k],v);
  const other={tracks:[{staves:[{...staff,showStandardNotation:false,showSlashNotation:true}]}]};
  projection.apply(other,'notation');projection.apply(other,'score-default');
  assert.equal(other.tracks[0].staves[0].showSlashNotation,true);
  assert.equal(other.tracks[0].staves[0].showStandardNotation,false);
});

test('score display and rhythm persist independently of diagrams and reject invalid stored choices',()=>{
  let saved;const storage={getItem:()=>saved,setItem:(_,v)=>saved=v};
  const state=readDisplayPreferences(storage);
  for(const scoreDisplay of ['score-default','both','tab','notation'])for(const tabRhythm of ['automatic','show','hide']) {
    Object.assign(state.ui,{scoreDisplay,tabRhythm,chordDiagramPlacement:'above-chord'});
    saveDisplayPreferences(state,storage);const restored=readDisplayPreferences(storage);
    assert.equal(restored.ui.scoreDisplay,scoreDisplay);assert.equal(restored.ui.tabRhythm,tabRhythm);
    assert.equal(restored.ui.chordDiagramPlacement,'above-chord');
  }
  saved=JSON.stringify({ui:{scoreDisplay:'unknown',tabRhythm:8,chordDiagramPlacement:'off'}});
  const restored=readDisplayPreferences(storage);
  assert.equal(restored.ui.scoreDisplay,'score-default');assert.equal(restored.ui.tabRhythm,'automatic');assert.equal(restored.ui.chordDiagramPlacement,'off');
});
