import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { AppState } from '../js/app-state.js';
import { initAlphaTab, setMetronomeVolume, startCountIn, cancelCountIn, applyMasterVolume, applyTrackMixer } from '../js/alphatab-host.js';

class Emitter {
  handlers = [];
  on(fn) { this.handlers.push(fn); }
  trigger(event) { for (const fn of this.handlers) fn(event); }
}

test('Wait reuses an audible native click, survives repeated restart, and never moves or grades the score', async () => {
  const previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch };
  const saved = {mode:AppState.mode,metronome:AppState.metronome,tickPosition:AppState.tickPosition,isPlaying:AppState.isPlaying,playerReady:AppState.playerReady,results:AppState.trainer.results,audio:AppState.audio,tracks:AppState.tracks,practiceTrackId:AppState.practiceTrackId,playSelectedTrack:AppState.playSelectedTrack,playOtherTracks:AppState.playOtherTracks};
  const sources = [], gains=[],mutes=[],volumes=[],audio = {
    sampleRate:44100,currentTime:0,state:'running',destination:{},
    createGain() { const gain={gain:{value:1},connect(){}};gains.push(gain);return gain; },
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
    changeTrackMute(tracks,muted){mutes.push({ids:tracks.map(track=>track.index),muted});}
    changeTrackVolume(tracks,volume){volumes.push({ids:tracks.map(track=>track.index),volume});}
    constructor() {
      api=this;this.player={output:{context:audio,activate(){}}};this.metronomeVolume=0;this.midiEventsPlayedFilter=[];
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
    AppState.audio={masterPercent:100,tracks:{}};
    AppState.mode='wait';AppState.metronome={enabled:true};AppState.tickPosition=960;
    AppState.trainer.results={correct:2,wrong:1};const results=structuredClone(AppState.trainer.results);
    sync(true);sync(false);finishLoad();await wait(30);
    assert.equal(sources.length,0,'late font load must not start a paused clock');
    sync(true);await wait(30);
    assert.equal(api.metronomeVolume,0);
    assert.ok(sources[0].buffer.getChannelData(0).some(sample=>Math.abs(sample)>1e-6),'actual bundled Sonivox produces audible click samples');
    assert.ok(ticks>0);
    AppState.audio.masterPercent=40;applyMasterVolume();
    assert.equal(api.masterVolume,0.4);assert.ok(Math.abs(gains.at(-1).gain.value-0.3)<1e-9);
    AppState.audio.masterPercent=0;applyMasterVolume();assert.equal(gains.at(-1).gain.value,0);
    AppState.audio.masterPercent=100;applyMasterVolume();
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
    const savedTimeline=AppState.playbackTimeline,savedScore=AppState.score,savedSpeed=AppState.playbackSpeed;
    AppState.playbackTimeline={measures:[{measureNumber:1,startTick:0,endTick:3840}],tempoMap:[{tick:0,bpm:200}]};
    AppState.score={tempo:200,masterBars:[{timeSignatureNumerator:4,timeSignatureDenominator:4}]};AppState.playbackSpeed=1;
    AppState.metronome.volumePercent=75;
    let completions=0;const beforeCount=sources.length;
    startCountIn(0,()=>completions++);await wait(5);
    assert.equal(AppState.countInActive,true);assert.equal(AppState.isPlaying,false);
    assert.equal(sources.length-beforeCount,4,'one bar uses the actual rendered native click');
    AppState.audio.masterPercent=20;applyMasterVolume();assert.ok(Math.abs(gains.at(-1).gain.value-0.15)<1e-9,'master changes reach an already scheduled count-in');
    AppState.audio.masterPercent=100;applyMasterVolume();
    api.playerStateChanged.trigger({state:1});assert.equal(AppState.isPlaying,false,'queued native state cannot start grading during count-in');
    cancelCountIn();await wait(5);assert.equal(completions,0);assert.equal(AppState.countInActive,false);
    assert.ok(sources.slice(beforeCount).every(source=>source.stopped));
    startCountIn(0,()=>completions++);await wait(1280);assert.equal(completions,1);assert.equal(AppState.countInActive,false);
    AppState.tracks=[{index:0,playbackInfo:{primaryChannel:0,secondaryChannel:1}},
      {index:1,playbackInfo:{primaryChannel:2,secondaryChannel:3}},
      {index:2,playbackInfo:{primaryChannel:2,secondaryChannel:3}}];
    AppState.practiceTrackId='0';AppState.playSelectedTrack=false;AppState.playOtherTracks=true;
    AppState.audio.tracks={'1:2':{volumePercent:35,muted:true}};
    const grades=AppState.trainer.results,tick=AppState.tickPosition;
    applyTrackMixer();assert.deepEqual(mutes.slice(-2),[{ids:[0],muted:true},{ids:[2,1],muted:true}]);
    assert.deepEqual(volumes.slice(-2),[{ids:[0],volume:1},{ids:[2,1],volume:0.35}]);
    AppState.audio.tracks['1:2'].muted=false;applyTrackMixer();assert.equal(mutes.at(-1).muted,false);
    assert.equal(AppState.trainer.results,grades);assert.equal(AppState.tickPosition,tick);
    AppState.playbackTimeline=savedTimeline;AppState.score=savedScore;AppState.playbackSpeed=savedSpeed;
  } finally {
    cancelCountIn();
    setMetronomeVolume(0,{wait:false});Object.assign(globalThis,previous);
    AppState.trainer.results=saved.results;delete saved.results;Object.assign(AppState,saved);
  }
});
