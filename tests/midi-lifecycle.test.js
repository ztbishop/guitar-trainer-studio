import test from 'node:test';
import assert from 'node:assert/strict';
import {AppState} from '../js/app-state.js';
import {initMidiRouter,setActiveMidiInput} from '../js/midi-router.js';
import {frameTask} from '../js/frame-task.js';
import {WaitController} from '../js/wait-controller.js';

function port(id,access) {
  return {id,name:id,state:'connected',type:'input',connection:'closed',adds:0,removes:0,closes:0,
    addEventListener(_,fn){this.receive=fn;this.adds++;this.connection='open';access.onstatechange?.({port:this});},
    removeEventListener(_,fn){if(this.receive===fn)this.receive=null;this.removes++;},
    close(){this.closes++;this.connection='closed';access.onstatechange?.({port:this});return Promise.resolve();},
    send(data){this.receive?.({data,timeStamp:performance.now()});}};
}
function reset() {
  AppState.inputMode='single-channel';Object.assign(AppState.midi,{activeInputId:'usb',singleChannel:'any'});
}
async function withNavigator(access,run) {
  const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{requestMIDIAccess:async()=>access}});
  try{await run();}finally{access.onstatechange=null;if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator;}
}

test('disconnect/reconnect storms detach once, reject stale messages and never auto-switch to another input',async()=>{
  reset();const access={inputs:new Map()},usb=port('usb',access),other=port('other',access);
  access.inputs.set('usb',usb);access.inputs.set('other',other);
  await withNavigator(access,async()=>{
    let stateCalls=0,grades=0;
    await initMidiRouter({onStateChange:()=>stateCalls++,onMidiEvent:()=>grades++});
    setActiveMidiInput('usb');
    assert.equal(usb.adds,1,'implicit-open notification does not attach recursively');
    usb.send([0x90,60,100]);const stale=usb.receive;
    const before=stateCalls;usb.state='disconnected';
    for(let i=0;i<10000;i++)access.onstatechange({port:usb});
    assert.equal(AppState.midi.activeInputId,'');assert.equal(AppState.midi.activeNotes.size,0);
    assert.equal(stateCalls-before,1);assert.equal(usb.closes,0);assert.equal(usb.removes,1);
    assert.equal(other.adds,0);assert.deepEqual(AppState.midi.availableInputs.map(p=>p.id),['other']);
    stale({data:[0x90,62,100],timeStamp:performance.now()});assert.equal(grades,1);
    assert.equal(setActiveMidiInput('usb'),false);
    const unplugged=stateCalls;for(let i=0;i<10000;i++)access.onstatechange({port:{type:'output',state:'disconnected'}});
    assert.equal(stateCalls,unplugged);
    usb.state='connected';access.onstatechange({port:usb});
    assert.equal(usb.adds,2);assert.equal(AppState.midi.activeInputId,'usb');
    const connected=stateCalls;for(let i=0;i<10000;i++)access.onstatechange({port:usb});
    assert.equal(stateCalls,connected);usb.send([0x90,62,100]);assert.equal(grades,2);
  });
});

test('rapid unplug/replug cycles keep one listener and retain all fresh attacks',async()=>{
  reset();const access={inputs:new Map()},usb=port('usb',access);access.inputs.set('usb',usb);
  await withNavigator(access,async()=>{
    let grades=0;await initMidiRouter({onMidiEvent:()=>grades++});
    setActiveMidiInput('usb');
    for(let i=0;i<100;i++) {
      usb.send([0x90,60,100]);usb.state='disconnected';access.onstatechange({port:usb});
      usb.state='connected';access.onstatechange({port:usb});
    }
    assert.equal(grades,100);assert.equal(usb.adds,101);assert.equal(usb.removes,100);assert.equal(usb.closes,0);
    assert.equal(AppState.midi.activeNotes.size,0);
  });
});

test('frame batching applies only to UI: every MIDI event is delivered synchronously',async()=>{
  reset();const access={inputs:new Map()},usb=port('usb',access);access.inputs.set('usb',usb);
  await withNavigator(access,async()=>{
    const frames=[];let paints=0,grades=0;
    const schedule=frameTask(()=>paints++,fn=>frames.push(fn));
    await initMidiRouter({onStateChange:(_,reason)=>{if(reason==='message')schedule();},onMidiEvent:()=>{grades++;schedule();}});
    setActiveMidiInput('usb');
    for(let i=0;i<2500;i++){usb.send([0x90,60,100]);usb.send([0x80,60,0]);}
    assert.equal(grades,5000);assert.equal(paints,0);assert.equal(frames.length,1);
    frames.shift()();assert.equal(paints,1);usb.send([0x90,60,100]);assert.equal(grades,5001);assert.equal(frames.length,1);
    frames.shift()();assert.equal(paints,2);
  });
});

test('late permission completions cannot replace a newer MIDI access session',async()=>{
  reset();const original=Object.getOwnPropertyDescriptor(globalThis,'navigator'),pending=[];
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{requestMIDIAccess:()=>new Promise(resolve=>pending.push(resolve))}});
  try {
    const oldAccess={inputs:new Map()},newAccess={inputs:new Map()},usb=port('usb',newAccess);
    newAccess.inputs.set('usb',usb);
    const first=initMidiRouter({}),second=initMidiRouter({});
    pending[1](newAccess);await second;setActiveMidiInput('usb');pending[0](oldAccess);assert.equal(await first,null);
    assert.equal(AppState.midi.activeInputId,'usb');assert.equal(oldAccess.onstatechange,undefined);
    assert.equal(usb.adds,1);newAccess.onstatechange=null;
  }finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});

test('one solved Wait target publishes the new gate once rather than drawing two full score states',()=>{
  let publications=0;
  const c=new WaitController({acquire(){},hold(){},pause(){},release(){},finish(){}},()=>publications++);
  c.configure([60,62].map((midi,i)=>({id:String(i),startTick:i*480,notes:[{id:'n'+i,midi}]})),960);
  c.start();publications=0;c.noteOn({type:'note-on',midi:60,channel:1,at:0});
  assert.equal(c.index,1);assert.equal(publications,1);assert.equal(c.session.stats().correct,1);
});

test('physical removal never calls a dead port close, including reinitialization before notification',async()=>{
  const access={inputs:new Map()},usb=port('usb',access);access.inputs.set('usb',usb);
  await withNavigator(access,async()=>{
    await initMidiRouter();setActiveMidiInput('usb');
    let deadCloses=0;
    usb.close=()=>{deadCloses++;return new Promise(()=>{});};
    usb.state='disconnected';access.onstatechange({port:usb});
    assert.equal(deadCloses,0);assert.equal(AppState.midi.activeInputId,'');
    usb.state='connected';access.onstatechange({port:usb});
    assert.equal(AppState.midi.activeInputId,'usb');
    usb.state='disconnected';await initMidiRouter();
    assert.equal(deadCloses,0);assert.equal(AppState.midi.activeInputId,'');
  });
});

test('connected switches close once and invalidate callbacks before listener removal',async()=>{
  const access={inputs:new Map()},usb=port('usb',access),other=port('other',access);
  access.inputs.set('usb',usb);access.inputs.set('other',other);
  await withNavigator(access,async()=>{
    let grades=0;await initMidiRouter({onMidiEvent:()=>grades++});setActiveMidiInput('usb');
    const remove=usb.removeEventListener;
    usb.removeEventListener=function(type,fn){fn({data:[0x90,65,100]});remove.call(this,type,fn);};
    setActiveMidiInput('other');assert.equal(grades,0);assert.equal(usb.closes,1);
    setActiveMidiInput('');assert.equal(other.closes,1);assert.equal(AppState.midi.activeInputId,'');
    setActiveMidiInput('usb');await initMidiRouter();assert.equal(grades,0);
  });
});

test('unselected device removal leaves the active listener and held notes intact',async()=>{
  const access={inputs:new Map()},usb=port('usb',access),other=port('other',access);
  access.inputs.set('usb',usb);access.inputs.set('other',other);
  await withNavigator(access,async()=>{
    const reasons=[];await initMidiRouter({onStateChange:(_,reason)=>reasons.push(reason)});
    setActiveMidiInput('usb');usb.send([0x90,60,100]);reasons.length=0;
    other.state='disconnected';access.onstatechange({port:other});
    assert.deepEqual(reasons,['inventory']);assert.equal(AppState.midi.activeInputId,'usb');
    assert.equal(AppState.midi.activeNotes.size,1);assert.equal(usb.removes,0);
    assert.equal(usb.closes,0);assert.equal(other.closes,0);
  });
});

test('connected close failures or unresolved promises do not prevent switching inputs',async()=>{
  for(const failure of [()=>{throw Error('close failed');},()=>Promise.reject(Error('close rejected')),()=>new Promise(()=>{})]) {
    const access={inputs:new Map()},usb=port('usb',access),other=port('other',access);
    access.inputs.set('usb',usb);access.inputs.set('other',other);
    await withNavigator(access,async()=>{
      await initMidiRouter();setActiveMidiInput('usb');usb.close=failure;
      assert.equal(setActiveMidiInput('other'),true);assert.equal(AppState.midi.activeInputId,'other');
      await Promise.resolve();
    });
  }
});
