import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { AppState } from '../js/app-state.js';
import { initAlphaTab, setMetronomeVolume } from '../js/alphatab-host.js';

class Emitter {
  handlers = [];
  on(fn) { this.handlers.push(fn); }
  trigger(event) { for (const fn of this.handlers) fn(event); }
}

test('Wait reuses an audible native click, survives repeated restart, and never moves or grades the score', async () => {
  const previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch };
  const saved = {mode:AppState.mode,metronome:AppState.metronome,tickPosition:AppState.tickPosition,isPlaying:AppState.isPlaying,playerReady:AppState.playerReady,results:AppState.trainer.results};
  const sources = [], audio = {
    sampleRate:44100,currentTime:0,state:'running',destination:{},
    createGain() { return {gain:{value:1},connect(){}}; },
    createBuffer(channels, frames) {
      const data=Array.from({length:channels},()=>new Float32Array(frames));
      return {getChannelData:index=>data[index]};
    },
    createBufferSource() {
      const source={connect(){},start(time){this.time=time;},stop(){this.stopped=true;},disconnect(){}};
      sources.push(source);return source;
    },
  };
  const context = vm.createContext({ console, process });
  vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js', import.meta.url), 'utf8'), context);
  const at = context.alphaTab;
  let api, ticks = 0, loads = 0;
  class Api {
    constructor() {
      api=this;this.player={output:{context:audio}};this.metronomeVolume=0;this.midiEventsPlayedFilter=[];
      for(const name of ['midiEventsPlayed','renderStarted','postRenderFinished','scoreLoaded','midiLoaded','playerReady','playerFinished','playerStateChanged','playerPositionChanged','beatMouseDown','error'])this[name]=new Emitter();
    }
  }
  globalThis.document={getElementById:()=>null,body:{classList:{toggle(){}}}};
  globalThis.window={location:{href:'http://localhost/index.html'},alphaTab:{...at,AlphaTabApi:Api}};
  let finishLoad;
  globalThis.fetch=async()=>{loads++;await new Promise(resolve=>{finishLoad=resolve;});return {ok:true,arrayBuffer:async()=>{
    const bytes=readFileSync(new URL('../assets/vendor/alphatab/soundfont/sonivox.sf2',import.meta.url));
    return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  }};};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const sync=(running,bpm=200,volume=0.75)=>setMetronomeVolume(volume,{wait:true,enabled:true,running,bpm});
  try {
    await initAlphaTab({}, {onMetronomeTick:()=>ticks++});
    AppState.mode='wait';AppState.metronome={enabled:true};AppState.tickPosition=960;
    AppState.trainer.results={correct:2,wrong:1};const results=structuredClone(AppState.trainer.results);
    sync(true);sync(false);finishLoad();await wait(30);
    assert.equal(sources.length,0,'late font load must not start a paused clock');
    sync(true);await wait(30);
    assert.equal(api.metronomeVolume,0);
    assert.ok(sources[0].buffer.getChannelData(0).some(sample=>Math.abs(sample)>1e-6),'actual bundled Sonivox produces audible click samples');
    assert.ok(ticks>0);
    for(let i=0;i<6;i++) {
      sync(false);const before=ticks;await wait(25);assert.equal(ticks,before);
      sync(true);await wait(30);assert.ok(ticks>before,`restart ${i} produces a beat`);
    }
    assert.equal(loads,1,'click is generated once, without restart fetches');
    AppState.tickPosition=0;const before=sources.length;sync(true);assert.equal(sources.length,before,'cursor updates do not restart the clock');
    sync(true,90,0);await wait(30);assert.ok(ticks>0,'muted audio retains beat events');
    setMetronomeVolume(0.4,{wait:false,enabled:true,running:true});
    assert.equal(api.metronomeVolume,0.4);assert.ok(sources.at(-1).stopped);
    assert.deepEqual(AppState.trainer.results,results);
    assert.equal(setMetronomeVolume(2),false);assert.equal(setMetronomeVolume(NaN),false);
    AppState.mode='realtime';AppState.isPlaying=true;AppState.playerReady=true;
    const rt=ticks;api.midiEventsPlayed.trigger({events:[new at.midi.AlphaTabMetronomeEvent(0,0,0,960,500)]});
    await wait(5);assert.equal(ticks,rt+1);
    api.midiEventsPlayed.trigger({events:[new at.midi.AlphaTabMetronomeEvent(0,960,1,960,500)]});
    AppState.isPlaying=false;setMetronomeVolume(0,{wait:false});await wait(5);assert.equal(ticks,rt+1);
  } finally {
    setMetronomeVolume(0,{wait:false});Object.assign(globalThis,previous);
    AppState.trainer.results=saved.results;delete saved.results;Object.assign(AppState,saved);
  }
});
