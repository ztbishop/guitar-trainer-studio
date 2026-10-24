import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeAlphaTab} from './fretboard-fixtures.js';
import {installAlphaTabAudioStartupCompatibility} from '../js/alphatab-host.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t) {
  const at=nativeAlphaTab(),loads=[],sources=[],worklets=[],logged=[];
  const previous=globalThis.AudioWorkletNode,log=console.error;
  t.after(()=>{globalThis.AudioWorkletNode=previous;console.error=log;});
  console.error=(...args)=>logged.push(args);
  globalThis.AudioWorkletNode=class {
    constructor(){this.messages=[];this.port={addEventListener(){},removeEventListener(){},start(){},postMessage:event=>this.messages.push(event)};worklets.push(this);}
    connect(){this.connected=true;}
    disconnect(){this.connected=false;this.disconnected=true;}
  };
  const context={state:'running',sampleRate:44100,destination:{},
    audioWorklet:{addModule(url){return new Promise((resolve,reject)=>loads.push({url,resolve,reject}));}},
    createBuffer(){return {};},
    createBufferSource(){const source={connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},
      stop(){assert.equal(this.started,true,'never stop an unstarted source');this.stopped=true;}};sources.push(source);return source;},
    close(){this.state='closed';},
  };
  assert.equal(installAlphaTabAudioStartupCompatibility(at),true);
  assert.equal(installAlphaTabAudioStartupCompatibility(at),false,'idempotent');
  const output=new at.synth.AlphaSynthAudioWorkletOutput({core:{scriptFile:'/bundled/alphaTab.js'}});
  output.context=context;
  return {at,output,context,loads,sources,worklets,logged};
}

test('Pause cancels unstarted native audio; a later startup callback cannot recreate it',async t=>{
  const {output,loads,sources,worklets}=fixture(t);
  output.play();output.addSamples(new Float32Array([0.2,0.1]));
  assert.equal(loads[0].url,'/bundled/alphaTab.js');
  assert.doesNotThrow(()=>output.pause());
  assert.equal(sources[0].disconnected,true);assert.equal(sources[0].started,undefined);
  loads[0].resolve();await settle();
  assert.equal(worklets.length,0);assert.equal(output.source,null);assert.equal(output._pendingEvents,undefined);
});

test('rapid restart isolates old callbacks and preserves native sample delivery and Pause cleanup',async t=>{
  const {output,loads,sources,worklets}=fixture(t);
  output.play();output.pause();output.play();
  output.addSamples(new Float32Array([0.4,0.3]));output.resetSamples();
  loads[1].resolve();await settle();
  assert.equal(sources[1].started,true);assert.equal(worklets.length,1);
  assert.deepEqual(worklets[0].messages.map(message=>message.cmd),['alphaSynth.output.addSamples','alphaSynth.output.resetSamples']);
  loads[0].resolve();await settle();
  assert.equal(worklets.length,1);assert.equal(output.source,sources[1]);
  let requested=0;output.sampleRequest.on(()=>requested++);
  output._handleMessage({data:{cmd:'alphaSynth.output.sampleRequest'}});assert.equal(requested,1);
  output.pause();assert.equal(sources[1].stopped,true);assert.equal(worklets[0].disconnected,true);
  assert.equal(worklets[0].messages.at(-1).cmd,'alphaSynth.output.stop');
  assert.equal(output._worklet,null);assert.equal(output.source,null);
});

test('native destruction invalidates pending audio without starting a closed context',async t=>{
  const {output,context,loads,worklets}=fixture(t);
  output.play();assert.doesNotThrow(()=>output.destroy());loads[0].resolve();await settle();
  assert.equal(context.state,'closed');assert.equal(output.context,null);assert.equal(worklets.length,0);
});

test('failed or obsolete worklet loads release pending sources and permit retry',async t=>{
  const {output,loads,sources,worklets,logged}=fixture(t);
  output.play();loads[0].reject(new Error('test module unavailable'));await settle();
  assert.equal(output.source,null);assert.equal(sources[0].disconnected,true);assert.equal(logged.length,1);
  output.play();output.pause();output.play();
  loads[1].reject(new Error('obsolete failure'));await settle();
  assert.equal(logged.length,1,'obsolete failure cannot cancel/log against a newer start');
  loads[2].resolve();await settle();assert.equal(worklets.length,1);assert.equal(sources[2].started,true);output.pause();
});

test('startup compatibility leaves newer or different native implementations untouched',()=>{
  const at=nativeAlphaTab(),native=at.synth.AlphaSynthAudioWorkletOutput.prototype.play;
  assert.equal(installAlphaTabAudioStartupCompatibility({...at,meta:{version:'1.8.5'}}),false);
  assert.equal(at.synth.AlphaSynthAudioWorkletOutput.prototype.play,native);
  const fixed={meta:{version:'1.8.4'},synth:{AlphaSynthWebAudioOutputBase:class {},AlphaSynthAudioWorkletOutput:class {play(){return 'fixed';}}}};
  assert.equal(installAlphaTabAudioStartupCompatibility(fixed),false);
});
