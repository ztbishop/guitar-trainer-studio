import test from 'node:test';
import assert from 'node:assert/strict';
import {StringSetup,createStringSetup} from '../js/string-setup.js';

function storage() {const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
test('guided setup requires all six channels, remembers the device/base, and rejects a wrong channel',()=>{
  const saved=storage(),setup=new StringSetup(saved);
  assert.equal(setup.configure('guitar',1),false);setup.start();
  setup.consume({type:'note-on',channel:2},1);assert.equal(setup.step,6);assert.match(setup.prompt,/channel 1/);
  setup.consume({type:'note-off',channel:1},1);assert.equal(setup.step,6);
  for(let channel=1;channel<=6;channel++)setup.consume({type:'note-on',channel},1);
  assert.equal(setup.verified,true);assert.equal(setup.step,null);
  const restored=new StringSetup(saved);assert.equal(restored.configure('guitar',1),true);
  assert.equal(restored.configure('other',1),false);assert.equal(restored.configure('guitar',2),false);
  assert.equal(restored.configure('guitar',1,false),false);assert.equal(restored.configure('guitar',1,true),true);
  restored.start();assert.equal(restored.verified,false);restored.cancel();assert.equal(restored.verified,false);
});
test('configuration changes cancel an unfinished check and unavailable storage still allows current-session setup',()=>{
  const setup=new StringSetup({getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}});
  setup.configure('guitar',3);setup.start();setup.consume({type:'note-on',channel:3},3);
  setup.configure('guitar',4);assert.equal(setup.step,null);assert.equal(setup.verified,false);
  setup.start();for(let channel=4;channel<=9;channel++)setup.consume({type:'note-on',channel},4);
  assert.equal(setup.verified,true);
});

test('setup button remains usable during practice and pauses before collecting strings',()=>{
  let click,pauses=0,changes=0;
  const state={inputMode:'hex-6ch',isPlaying:true,midi:{activeInputId:'guitar',hexChannelBase:1}};
  const button={addEventListener:(event,fn)=>{click=fn}},status={};
  const controller=createStringSetup({state,button,status,storage:storage(),busy:()=>state.isPlaying,
    pause:()=>{pauses++;state.isPlaying=false;},onChange:()=>changes++});
  controller.sync();assert.equal(button.disabled,false);assert.match(status.textContent,/will pause practice/);
  click();assert.equal(pauses,1);assert.equal(state.isPlaying,false);assert.match(status.textContent,/string 6/);
  for(let channel=1;channel<=6;channel++)controller.consume({type:'note-on',channel});
  assert.equal(state.midi.hexMappingVerified,true);assert.equal(changes,1);
});
