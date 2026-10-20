import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {initBriefErrorControls} from '../js/brief-error-controls.js';
function harness(){
 const nodes=new Map();for(const id of ['ignore-brief-errors','minimum-error-ms','brief-error-duration-row','minimum-error-down','minimum-error-up','brief-error-availability'])nodes.set(id,{value:'',checked:false,events:{},addEventListener(type,fn){this.events[type]=fn}});
 const doc={getElementById:id=>nodes.get(id),activeElement:null};let sync,calls=0;
 AppState.mode='wait';AppState.media.editing=false;Object.assign(AppState.midi,{activeInputId:'mg',ignoreBriefErrors:false,minErrorMs:30});
 const controls=initBriefErrorControls(settings=>{sync?.();Object.assign(AppState.midi,settings);calls++;},doc);sync=controls.sync;
 return {nodes,doc,sync,get calls(){return calls}};
}
test('brief-error controls preserve clicks across repaint, show duration only enabled, and use five-ms buttons',()=>{
 const h=harness(),n=id=>h.nodes.get(id);assert.equal(n('brief-error-duration-row').hidden,true);
 n('ignore-brief-errors').checked=true;n('ignore-brief-errors').events.change();assert.equal(AppState.midi.ignoreBriefErrors,true);assert.equal(n('brief-error-duration-row').hidden,false);
 n('minimum-error-up').events.click();assert.equal(AppState.midi.minErrorMs,35);
 n('minimum-error-down').events.click();assert.equal(AppState.midi.minErrorMs,30);
 n('ignore-brief-errors').checked=false;n('ignore-brief-errors').events.change();assert.equal(AppState.midi.ignoreBriefErrors,false);assert.equal(AppState.midi.minErrorMs,30);
});
test('typed values validate and reset bad input, buttons clamp, and restored device settings render',()=>{
 const h=harness(),n=id=>h.nodes.get(id);h.doc.activeElement=n('minimum-error-ms');
 n('minimum-error-ms').value='45';n('minimum-error-ms').events.change();assert.equal(AppState.midi.minErrorMs,45);
 for(const value of ['', 'foo','101','4','30.5']){n('minimum-error-ms').value=value;n('minimum-error-ms').events.change();assert.equal(n('minimum-error-ms').value,'45');}
 AppState.midi.minErrorMs=100;h.sync();assert.equal(n('minimum-error-up').disabled,true);n('minimum-error-up').events.click();assert.equal(AppState.midi.minErrorMs,100);
 AppState.midi.minErrorMs=5;h.sync();assert.equal(n('minimum-error-down').disabled,true);
 h.doc.activeElement=null;Object.assign(AppState.midi,{ignoreBriefErrors:true,minErrorMs:60});h.sync();assert.equal(n('minimum-error-ms').value,'60');
 AppState.mode='realtime';h.sync();assert.equal(n('ignore-brief-errors').disabled,true);
 AppState.mode='wait';AppState.midi.activeInputId='';h.sync();assert.match(n('brief-error-availability').textContent,/Select a MIDI input/);
});
