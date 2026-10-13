import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {initDisplayControls} from '../js/display-controls.js';

test('zoom inputs share state, clamp limits and restore invalid values; scroll and fullscreen are independent',()=>{
  const previous=globalThis.document,ui={...AppState.ui};
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,{value:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}});return elements.get(id);};
  globalThis.document={getElementById:get,documentElement:{requestFullscreen(){}}};
  try {
    AppState.ui.zoomPercent=100;AppState.ui.autoScroll=true;AppState.ui.fullscreenOnPlay=false;
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
    AppState.ui.leftHanded=true;AppState.ui.showFretboard=false;
    controls.sync();
    assert.equal(get('left-handed-fretboard').disabled,true);
    assert.equal(get('left-handed-fretboard').checked,true);
    AppState.ui.showFretboard=true;controls.sync();
    assert.equal(get('left-handed-fretboard').disabled,false);
    assert.equal(get('left-handed-fretboard').checked,true);
  } finally {globalThis.document=previous;Object.assign(AppState.ui,ui);}
});
