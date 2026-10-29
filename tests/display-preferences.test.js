import test from 'node:test';
import assert from 'node:assert/strict';
import {readDisplayPreferences,saveDisplayPreferences,DISPLAY_PREFERENCES_KEY} from '../js/display-preferences.js';

const storage = value => {
  const entries=new Map(value === undefined ? [] : [[DISPLAY_PREFERENCES_KEY,value]]);
  return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};
};

test('first-use Display defaults survive malformed or unavailable storage',()=>{
  const expected={viewMode:'practice-only',ui:{appearance:'light',zoomPercent:100,autoScroll:true,fullscreenOnPlay:false,chordDiagramPlacement:'score-default',scoreDisplay:'score-default',tabRhythm:'automatic',showFretboard:true,leftHanded:false,fretboardView:'bar',fretboardLabels:'notes',showAlternatePositions:false}};
  for(const store of [storage(),storage('{}'),storage('{invalid'),{getItem(){throw Error('denied');}}])assert.deepEqual(readDisplayPreferences(store),expected);
  assert.doesNotThrow(()=>saveDisplayPreferences(expected,{setItem(){throw Error('quota');}}));
});

test('Display choices round-trip without score/transport/results or feedback data',()=>{
  const store=storage();
  const state={viewMode:'all-tracks',ui:{appearance:'light',zoomPercent:125,autoScroll:false,fullscreenOnPlay:true,chordDiagramPlacement:'top-of-score',scoreDisplay:'score-default',tabRhythm:'automatic',showFretboard:false,leftHanded:true,inferPolyMistakes:false},practiceTrackId:'7',isPlaying:true,trainer:{results:'session'}};
  saveDisplayPreferences(state,store);
  const loaded=readDisplayPreferences(store);
  assert.deepEqual(loaded,{viewMode:'all-tracks',ui:{appearance:'light',zoomPercent:125,autoScroll:false,fullscreenOnPlay:true,chordDiagramPlacement:'top-of-score',scoreDisplay:'score-default',tabRhythm:'automatic',showFretboard:false,leftHanded:true,fretboardView:'bar',fretboardLabels:'notes',showAlternatePositions:false}});
  assert.deepEqual(JSON.parse(store.getItem(DISPLAY_PREFERENCES_KEY)),loaded);
  state.ui.showFretboard=true;state.ui.leftHanded=false;state.ui.fullscreenOnPlay=false;state.viewMode='practice-only';saveDisplayPreferences(state,store);
  assert.equal(readDisplayPreferences(store).ui.showFretboard,true);
  assert.equal(readDisplayPreferences(store).ui.leftHanded,false);
  assert.equal(readDisplayPreferences(store).ui.fullscreenOnPlay,false);
  assert.equal(readDisplayPreferences(store).viewMode,'practice-only');
});

test('Display validation keeps valid booleans and falls back on invalid view/zoom fields',()=>{
  for(const zoomPercent of [null,'125',49,201]) {
    const loaded=readDisplayPreferences(storage(JSON.stringify({viewMode:'unknown',ui:{zoomPercent,autoScroll:false,fullscreenOnPlay:'true',showFretboard:true,leftHanded:1}})));
    assert.deepEqual(loaded,{viewMode:'practice-only',ui:{appearance:'light',zoomPercent:100,autoScroll:false,fullscreenOnPlay:false,chordDiagramPlacement:'score-default',scoreDisplay:'score-default',tabRhythm:'automatic',showFretboard:true,leftHanded:false,fretboardView:'bar',fretboardLabels:'notes',showAlternatePositions:false}});
  }
  const invalid=readDisplayPreferences(storage(JSON.stringify({ui:{chordDiagramPlacement:'custom'}})));
  assert.equal(invalid.ui.chordDiagramPlacement,'score-default');
});
