import test from 'node:test';
import assert from 'node:assert/strict';
import {MidiDevicePreferences,MIDI_DEVICES_KEY,MIDI_DEVICE_DEFAULTS,validateMidiSettings} from '../js/midi-device-preferences.js';
import {AppState} from '../js/app-state.js';
import {initMidiRouter,setActiveMidiInput,saveActiveMidiSettings} from '../js/midi-router.js';

const device=(id,name='TriplePlay')=>({id,name,manufacturer:'Fishman'});
const hex={inputMode:'hex-6ch',singleChannel:'9',hexChannelBase:10,hexChannelReverse:true,pitchBendRange:24,latencyMs:87};
const memory=()=>({value:null,getItem(){return this.value;},setItem(key,value){assert.equal(key,MIDI_DEVICES_KEY);this.value=value;}});
const settings=()=>({inputMode:AppState.inputMode,singleChannel:AppState.midi.singleChannel,hexChannelBase:AppState.midi.hexChannelBase,
  hexChannelReverse:AppState.midi.hexChannelReverse,pitchBendRange:AppState.midi.pitchBendRange,latencyMs:AppState.trainer.latencyMs});
function apply(s){AppState.inputMode=s.inputMode;AppState.trainer.latencyMs=s.latencyMs;for(const k of ['singleChannel','hexChannelBase','hexChannelReverse','pitchBendRange'])AppState.midi[k]=s[k];}
function port(id,name) {
  return {...device(id,name),state:'connected',type:'input',adds:0,
    addEventListener(_,fn){this.receive=fn;this.adds++;},removeEventListener(){this.receive=null;},close(){return Promise.resolve();},
    send(data){this.receive?.({data,timeStamp:performance.now()});}};
}
async function environment(storage,run) {
  const original=Object.getOwnPropertyDescriptor(globalThis,'navigator'),access={inputs:new Map()};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{requestMIDIAccess:async()=>access}});
  const init=(options={})=>initMidiRouter({...options,deviceStorage:storage});
  try{await run(access,init);}finally{access.onstatechange=null;if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
}

test('device profiles persist every input setting independently and survive reload',()=>{
  const storage=memory(),p=new MidiDevicePreferences(storage),a=device('a'),b=device('b','Keyboard');
  p.remember(a,hex,true);p.remember(b,{...MIDI_DEVICE_DEFAULTS,singleChannel:'3'},true);
  const restored=new MidiDevicePreferences(storage);
  assert.deepEqual(restored.profile(a).settings,hex);
  assert.equal(restored.profile(b).settings.singleChannel,'3');
  assert.equal(restored.resolve([a,b]).device.id,'b');
  restored.selectNone();assert.equal(new MidiDevicePreferences(storage).resolve([a,b]),null);
  assert.deepEqual(new MidiDevicePreferences(storage).profile(a).settings,hex);
});

test('identity prefers the exact ID and only falls back to an unambiguous matching name/manufacturer',()=>{
  const p=new MidiDevicePreferences(memory()),a=device('old'),replacement=device('new');p.remember(a,hex,true);
  assert.equal(p.resolve([a,replacement]).device.id,'old');
  assert.equal(p.resolve([replacement]).device.id,'new');
  assert.equal(p.resolve([replacement,device('duplicate')]),null);
  assert.equal(p.resolve([{...replacement,manufacturer:'Other'}]),null);
  const match=p.resolve([replacement]);p.remember(match.device,match.settings,true,match.previousId);
  assert.equal(p.profile(a),null);assert.deepEqual(p.profile(replacement).settings,hex);
});

test('malformed or blocked storage is contained and restored settings are validated',()=>{
  const storage=memory();storage.value='{bad';assert.deepEqual(new MidiDevicePreferences(storage).profiles,[]);
  storage.value=JSON.stringify({version:1,lastInput:device('a'),profiles:[null,{device:device('a'),settings:{inputMode:'bad',singleChannel:'17',hexChannelReverse:true,hexChannelBase:99,pitchBendRange:99,latencyMs:-5}}]});
  assert.deepEqual(new MidiDevicePreferences(storage).profile(device('a')).settings,{...MIDI_DEVICE_DEFAULTS,hexChannelReverse:true,hexChannelBase:16});
  const blocked=new MidiDevicePreferences({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
  blocked.remember(device('a'),hex,true);assert.deepEqual(blocked.resolve([device('a')]).settings,hex);
  assert.deepEqual(validateMidiSettings(null),MIDI_DEVICE_DEFAULTS);
});

test('first use leaves loopback unselected, then switches devices with independent saved settings',async()=>{
  await environment(memory(),async(access,init)=>{
    const loop=port('loop','Microsoft default loopback (A)'),usb=port('usb');access.inputs.set(loop.id,loop);access.inputs.set(usb.id,usb);
    AppState.midi.activeInputId='stale';await init();assert.equal(AppState.midi.activeInputId,'');assert.equal(loop.adds,0);
    setActiveMidiInput('usb');apply(hex);saveActiveMidiSettings();
    setActiveMidiInput('loop');assert.deepEqual(settings(),MIDI_DEVICE_DEFAULTS);
    apply({...MIDI_DEVICE_DEFAULTS,singleChannel:'3',latencyMs:20});saveActiveMidiSettings();
    setActiveMidiInput('usb');assert.deepEqual(settings(),hex);
    setActiveMidiInput('loop');assert.equal(AppState.midi.singleChannel,'3');assert.equal(AppState.trainer.latencyMs,20);
  });
});

test('startup before USB connection restores the preferred device before its first note; reconnect does not pick loopback',async()=>{
  const storage=memory();new MidiDevicePreferences(storage).remember(device('usb'),hex,true);
  await environment(storage,async(access,init)=>{
    const loop=port('loop','Microsoft default loopback (A)'),usb=port('usb');access.inputs.set(loop.id,loop);
    let received=[];AppState.midi.activeInputId='';await init({onMidiEvent:e=>received.push(e)});
    assert.equal(AppState.midi.activeInputId,'');assert.match(AppState.ui.midiStatus,/Waiting for TriplePlay/);
    access.inputs.set('usb',usb);access.onstatechange({port:usb});assert.deepEqual(settings(),hex);
    usb.send([0x99,60,100]);assert.equal(received[0].inputMode,'hex-6ch');assert.equal(received[0].stringHint,6);
    usb.send([0x90,65,100]);assert.equal(received.length,1,'restored channel filter applies to the first messages');
    usb.state='disconnected';access.onstatechange({port:usb});assert.equal(AppState.midi.activeInputId,'');assert.equal(loop.adds,0);
    usb.state='connected';access.onstatechange({port:usb});assert.equal(AppState.midi.activeInputId,'usb');assert.deepEqual(settings(),hex);
    await init();assert.equal(AppState.midi.activeInputId,'usb');assert.deepEqual(settings(),hex);
  });
});

test('None cancels waiting, survives reload and later plugging in; manual selection overrides remembered input',async()=>{
  const storage=memory();new MidiDevicePreferences(storage).remember(device('usb'),hex,true);
  await environment(storage,async(access,init)=>{
    const loop=port('loop','Loopback'),usb=port('usb');access.inputs.set('loop',loop);await init();
    setActiveMidiInput('');assert.equal(AppState.ui.midiStatus,'No MIDI input selected');
    access.inputs.set('usb',usb);access.onstatechange({port:usb});assert.equal(AppState.midi.activeInputId,'');
    await init();assert.equal(AppState.midi.activeInputId,'');
    setActiveMidiInput('usb');assert.deepEqual(settings(),hex);
    setActiveMidiInput('loop');usb.state='disconnected';access.onstatechange({port:usb});usb.state='connected';access.onstatechange({port:usb});
    assert.equal(AppState.midi.activeInputId,'loop');
    setActiveMidiInput('');await init();assert.equal(AppState.midi.activeInputId,'');
  });
});
