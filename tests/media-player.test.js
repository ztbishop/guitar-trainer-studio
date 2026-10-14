import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlMediaPlayer,youtubeMediaPlayer,waveformPeaks} from '../js/media-player.js';
class MediaElement extends EventTarget {
  duration=10;currentTime=0;playbackRate=1;volume=1;paused=true;ended=false;readyState=4;
  load(){queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')));}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
  removeAttribute(){this.src='';}
}
test('HTML media handler uses real recording milliseconds at altered speeds and bounds seeks',async()=>{
  const element=new MediaElement(),states=[],handler=htmlMediaPlayer(element,'blob:fixture',{onState:state=>states.push(state)});await handler.ready;
  handler.playbackRate=0.5;element.currentTime=1.5;
  assert.equal(handler.currentTime,1500);assert.equal(handler.backingTrackDuration,10000);
  element.dispatchEvent(new Event('ratechange'));assert.ok(states.includes('ratechange'));
  handler.seekTo(50000);assert.equal(element.currentTime,10);
  handler.seekTo(-100);assert.equal(element.currentTime,0);
  handler.masterVolume=0.3;assert.equal(element.volume,0.3);handler.destroy();
});
test('intentional Pause or Return cancels stale play errors while genuine current playback failures surface',async()=>{
  const element=new MediaElement(),errors=[];let rejectPlay;
  element.play=()=>new Promise((resolve,reject)=>{rejectPlay=reject;});
  const handler=htmlMediaPlayer(element,'blob:fixture',{onError:error=>errors.push(error)});await handler.ready;
  handler.play();handler.pause();rejectPlay(new Error('Expected aborted play'));await Promise.resolve();
  assert.equal(errors.length,0);
  handler.play();rejectPlay(new Error('Browser blocked playback'));await Promise.resolve();
  assert.equal(errors.length,1);assert.match(errors[0].message,/blocked/);handler.destroy();
});
test('replacing an unready recording rejects its old readiness and removes its metadata listeners',async()=>{
  const element=new MediaElement();element.load=()=>{};
  const handler=htmlMediaPlayer(element,'blob:old');const cancelled=assert.rejects(handler.ready,/cancelled/);
  handler.destroy();await cancelled;
  element.duration=20;element.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(element.src,'');
});
test('detailed waveform preserves a one-sample transient on either stereo channel and closes decoding context',async()=>{
  const previous=globalThis.AudioContext;let closed=false;
  const left=new Float32Array(100),right=new Float32Array(100);right[3]=1;left[99]=0.5;
  globalThis.AudioContext=class {
    async decodeAudioData(){return {numberOfChannels:2,getChannelData:index=>[left,right][index]};}
    async close(){closed=true;}
  };
  try {
    const peaks=await waveformPeaks({size:100,arrayBuffer:async()=>new ArrayBuffer(1)},10);
    assert.equal(peaks[0],1);assert.equal(peaks[9],0.5);assert.equal(closed,true);
  } finally {globalThis.AudioContext=previous;}
});
test('rapid native seeks are coalesced until the active seek finishes, retaining the latest requested time',async()=>{
  const element=new MediaElement(),handler=htmlMediaPlayer(element,'blob:fixture');await handler.ready;
  handler.seekTo(1000);element.seeking=true;
  handler.seekTo(2000);handler.seekTo(3500);assert.equal(element.currentTime,1);
  element.seeking=false;element.dispatchEvent(new Event('seeked'));assert.equal(element.currentTime,3.5);
  handler.destroy();element.dispatchEvent(new Event('seeked'));assert.equal(element.src,'');
});
test('metadata alone does not enable local playback before media data is available',async()=>{
  const element=new MediaElement();element.readyState=1;
  const handler=htmlMediaPlayer(element,'blob:fixture');let ready=false;handler.ready.then(()=>{ready=true;});
  await Promise.resolve();await Promise.resolve();assert.equal(ready,false);
  element.readyState=2;element.dispatchEvent(new Event('loadeddata'));await handler.ready;
  assert.equal(ready,true);assert.equal(element.preload,'auto');handler.destroy();
});
test('YouTube cued seeking updates the requested frame without waiting for Play and suppresses seek-triggered autoplay',async()=>{
  const saved={YT:globalThis.YT,document:globalThis.document,location:globalThis.location};
  const calls=[];let instance;
  globalThis.location={origin:'https://example.org'};globalThis.document={createElement:()=>({})};
  globalThis.YT={Player:class {
    state=5;
    constructor(target,options){instance=this;this.options=options;queueMicrotask(()=>options.events.onReady());}
    getPlayerState(){return this.state;}
    seekTo(seconds){calls.push(['seek',seconds]);this.state=1;this.options.events.onStateChange({data:1});}
    mute(){calls.push(['mute']);}
    pauseVideo(){this.state=2;calls.push(['pause']);}
    playVideo(){this.state=1;this.options.events.onStateChange({data:1});}
    destroy(){}
  }};
  try {
    const states=[],handler=await youtubeMediaPlayer({replaceChildren(){}},'abcdefghijk',{onState:state=>states.push(state)});await handler.ready;
    handler.seekTo(3500);assert.deepEqual(calls,[['mute'],['seek',3.5],['pause']]);
    assert.equal(instance.state,2);assert.deepEqual(states,['paused']);
    handler.play();assert.equal(states.at(-1),'playing');handler.destroy();
  } finally {for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
