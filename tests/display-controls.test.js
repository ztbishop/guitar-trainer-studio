import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {initDisplayControls} from '../js/display-controls.js';
import {DISPLAY_PREFERENCES_KEY,readDisplayPreferences,saveDisplayPreferences} from '../js/display-preferences.js';

test('zoom inputs share state, clamp limits and restore invalid values; scroll, fullscreen and chord diagram choices are independent',()=>{
  const previous=globalThis.document,ui={...AppState.ui};
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,{value:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}});return elements.get(id);};
  globalThis.document={getElementById:get,documentElement:{requestFullscreen(){}}};
  try {
    AppState.ui.zoomPercent=100;AppState.ui.autoScroll=true;AppState.ui.fullscreenOnPlay=false;AppState.ui.chordDiagramPlacement='score-default';
    let changes=0;const controls=initDisplayControls(()=>changes++);
    const number=get('score-zoom-number'),slider=get('score-zoom');
    number.value='999';number.handlers.change();assert.equal(slider.value,'200');assert.equal(get('score-zoom-up').disabled,true);
    number.value='';number.handlers.change();assert.equal(number.value,'200');assert.equal(changes,1);
    slider.value='50';slider.handlers.input();assert.equal(number.value,'50');assert.equal(get('score-zoom-down').disabled,true);
    get('score-zoom-up').handlers.click();assert.equal(number.value,'55');
    number.value='125';get('score-zoom-up').handlers.click();assert.equal(number.value,'130');
    number.value='115';number.handlers.keydown({key:'Enter'});assert.equal(slider.value,'115');
    get('score-auto-scroll').checked=false;get('score-auto-scroll').handlers.change();assert.equal(AppState.ui.autoScroll,false);
    const before=changes;get('fullscreen-on-play').checked=true;get('fullscreen-on-play').handlers.change();
    assert.equal(AppState.ui.fullscreenOnPlay,true);assert.equal(changes,before);assert.equal(AppState.ui.zoomPercent,115);
    const diagrams=get('chord-diagram-placement');diagrams.value='above-chord';diagrams.handlers.change();
    assert.equal(AppState.ui.chordDiagramPlacement,'above-chord');assert.equal(diagrams.value,'above-chord');assert.equal(changes,before+1);
    AppState.ui.leftHanded=true;AppState.ui.showFretboard=false;
    controls.sync();
    assert.equal(AppState.ui.leftHanded,true,'Display sync must preserve the popup orientation setting');
    AppState.ui.showFretboard=true;controls.sync();
    assert.equal(AppState.ui.leftHanded,true);
  } finally {globalThis.document=previous;Object.assign(AppState.ui,ui);}
});

test('no-diagram fallback shows Score Default without saving it, including when another Display preference is saved',()=>{
  const previousDocument=globalThis.document,previousWindow=globalThis.window;
  const ui={...AppState.ui},hasDiagrams=AppState.scoreHasChordDiagrams;
  const entries=new Map(),elements=new Map();
  const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};
  const get=id=>{if(!elements.has(id))elements.set(id,{value:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}});return elements.get(id);};
  globalThis.document={getElementById:get,documentElement:{requestFullscreen(){}}};
  globalThis.window={localStorage:storage};
  try {
    AppState.ui.chordDiagramPlacement='above-chord';AppState.scoreHasChordDiagrams=false;
    saveDisplayPreferences(AppState);const saved=entries.get(DISPLAY_PREFERENCES_KEY);
    const controls=initDisplayControls(()=>{}),select=get('chord-diagram-placement');
    assert.equal(select.value,'score-default');assert.equal(select.disabled,true);
    assert.equal(entries.get(DISPLAY_PREFERENCES_KEY),saved,'loading/syncing must not write the fallback');
    get('score-zoom').value='150';get('score-zoom').handlers.input();
    assert.equal(readDisplayPreferences(storage).ui.chordDiagramPlacement,'above-chord','saving zoom must preserve the original placement');
    select.value='off';select.handlers.change();
    assert.equal(AppState.ui.chordDiagramPlacement,'above-chord');assert.equal(select.value,'score-default');
    AppState.scoreHasChordDiagrams=true;controls.sync();
    assert.equal(select.value,'above-chord');assert.equal(select.disabled,false);
    assert.equal(readDisplayPreferences(storage).ui.chordDiagramPlacement,'above-chord');
  } finally {
    globalThis.document=previousDocument;globalThis.window=previousWindow;
    Object.assign(AppState.ui,ui);AppState.scoreHasChordDiagrams=hasDiagrams;
  }
});
