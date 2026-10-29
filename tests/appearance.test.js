import test from 'node:test';
import assert from 'node:assert/strict';
import {APPEARANCES,normalizeAppearance,scoreColors} from '../js/appearance.js';
import {readDisplayPreferences,saveDisplayPreferences} from '../js/display-preferences.js';
import {nativeAlphaTab} from './fretboard-fixtures.js';
test('appearance defaults, invalid storage and saved choices remain independent',()=>{
 let data;const storage={getItem:()=>data,setItem:(_,v)=>data=v};
 assert.equal(readDisplayPreferences(storage).ui.appearance,'light');
 for(const appearance of APPEARANCES){const state=readDisplayPreferences(storage);Object.assign(state.ui,{appearance,chordDiagramPlacement:'off',tabRhythm:'show'});saveDisplayPreferences(state,storage);const saved=readDisplayPreferences(storage);assert.equal(saved.ui.appearance,appearance);assert.equal(saved.ui.chordDiagramPlacement,'off');assert.equal(saved.ui.tabRhythm,'show');}
 for(const value of [null,'system',42,{}]){assert.equal(normalizeAppearance(value),'light');data=JSON.stringify({ui:{appearance:value}});assert.equal(readDisplayPreferences(storage).ui.appearance,'light');}
});
test('native colors are valid, printing always overrides every score color with black',()=>{
 const at=nativeAlphaTab();
 for(const theme of APPEARANCES){const colors=scoreColors(theme);assert.equal(Object.keys(colors).length,6);for(const color of Object.values(colors))assert.equal(at.model.Color.fromJson(color).a,255);assert(Object.values(scoreColors(theme,{print:true})).every(v=>v==='#000000'));}
 assert.notDeepEqual(scoreColors('dark'),scoreColors('light'));
 assert.deepEqual(scoreColors('soft-light'),scoreColors('light'));
});
