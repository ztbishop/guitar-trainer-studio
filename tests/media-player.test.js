import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlMediaPlayer,youtubeMediaPlayer,waveformPeaks} from '../js/media-player.js';
import {validatePoints} from '../js/media-sync.js';
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
test('a completed paused timeline seek does not issue a transport Pause',async()=>{
  const element=new MediaElement(),states=[];
  const handler=htmlMediaPlayer(element,'blob:fixture',{onState:s=>states.push(s)});
  await handler.ready;handler.seekTo(1500);element.dispatchEvent(new Event('seeked'));
  assert.deepEqual(states,[]);handler.play();element.dispatchEvent(new Event('playing'));
  handler.pause();assert.deepEqual(states,['playing','paused']);handler.destroy();
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
    duration=2078;
    getDuration(){return this.duration;}
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
    const end=handler.backingTrackDuration;
    instance.duration=2077.7;
    assert.equal(handler.backingTrackDuration,end,'fractional metadata refinement keeps the original timeline extent');
    const points=[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:47038},
      {barIndex:31,barOccurence:0,barPosition:1,millisecondOffset:end}];
    assert.doesNotThrow(()=>validatePoints(points,null,handler.backingTrackDuration),'editing Start must not reject the unchanged End');
    assert.throws(()=>validatePoints([{...points[0],millisecondOffset:end+100}],null,handler.backingTrackDuration),/beyond/);
    instance.duration=0;assert.equal(handler.backingTrackDuration,end,'transient missing metadata retains duration');
    instance.duration=2100;assert.equal(handler.backingTrackDuration,2100000,'material duration changes are not hidden');
    handler.seekTo(3500);assert.deepEqual(calls,[['mute'],['seek',3.5],['pause']]);
    assert.equal(instance.state,2);assert.deepEqual(states,['paused']);
    handler.play();assert.equal(states.at(-1),'playing');handler.destroy();
  } finally {for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

for(const outcome of ['metadata','cancel','provider error'])test(`YouTube iframe readiness waits for duration: ${outcome}`,async()=>{
  const saved={YT:globalThis.YT,document:globalThis.document,location:globalThis.location};
  let instance,plays=0;
  globalThis.location={origin:'http://127.0.0.1:8081'};
  globalThis.document={createElement:()=>({})};
  globalThis.YT={Player:class {
    duration=0;
    constructor(target,options){instance=this;this.options=options;queueMicrotask(()=>options.events.onReady());}
    getDuration(){return this.duration;}
    playVideo(){plays++;}
    destroy(){}
  }};
  try {
    const handler=await youtubeMediaPlayer({replaceChildren(){}},'abcdefghijk');
    let resolved=false;handler.ready.then(()=>{resolved=true;},()=>{});
    await new Promise(resolve=>setTimeout(resolve,120));
    assert.equal(resolved,false,'onReady with zero duration must not resolve');
    if(outcome==='metadata'){
      instance.duration=123.456;await handler.ready;
      assert.equal(handler.backingTrackDuration,123456);assert.equal(plays,0);handler.destroy();
    } else {
      const rejected=assert.rejects(handler.ready,outcome==='cancel'?/cancelled/:/code 150/);
      if(outcome==='cancel')handler.destroy();else instance.options.events.onError({data:150});
      await rejected;instance.duration=123;instance.options.events.onReady();
      await new Promise(resolve=>setTimeout(resolve,120));assert.equal(resolved,false);
      handler.destroy();
    }
  } finally {for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('terminal read errors cannot masquerade as playing or queue seeks, and explicit reload retains controls without autoplay',async()=>{
  const element=new MediaElement(),errors=[],states=[];let plays=0;
  element.play=()=>{plays++;element.paused=false;return Promise.resolve();};
  const handler=htmlMediaPlayer(element,'blob:fixture',{onError:e=>errors.push(e),onState:s=>states.push(s)});await handler.ready;
  handler.seekTo(3500);handler.playbackRate=.5;handler.masterVolume=.3;element.muted=true;element.paused=false;element.seeking=true;handler.seekTo(7000);element.error={code:2,message:'Private source details'};
  element.dispatchEvent(new Event('error'));element.dispatchEvent(new Event('seeked'));element.dispatchEvent(new Event('playing'));assert.equal(element.currentTime,3.5);
  assert.equal(handler.playing,false);assert.deepEqual(states,[]);assert.match(errors[0].message,/read.*data/);assert.doesNotMatch(errors[0].message,/Private/);
  handler.seekTo(8000);assert.equal(element.currentTime,3.5);handler.play();await Promise.resolve();assert.equal(plays,0);assert.equal(errors.length,2);
  element.load=()=>{element.error=null;element.seeking=false;element.currentTime=0;element.readyState=1;queueMicrotask(()=>{element.dispatchEvent(new Event('loadedmetadata'));element.readyState=4;element.dispatchEvent(new Event('loadeddata'));});};
  await handler.reload();assert.equal(element.src,'blob:fixture');assert.equal(element.currentTime,3.5);assert.equal(element.paused,true);assert.equal(plays,0);assert.equal(handler.playbackRate,.5);assert.equal(handler.masterVolume,.3);assert.equal(element.muted,true);
  handler.play();await Promise.resolve();assert.equal(plays,1);assert.equal(handler.playing,true);handler.destroy();
});

test('reload failure retains the requested position and can be retried without restoring an old queued seek',async()=>{
  const element=new MediaElement(),handler=htmlMediaPlayer(element,'blob:fixture');await handler.ready;handler.seekTo(4500);element.seeking=true;handler.seekTo(9000);
  element.load=()=>{element.currentTime=0;element.error={code:2};queueMicrotask(()=>element.dispatchEvent(new Event('error')));};
  await assert.rejects(handler.reload(),/read.*data/);
  element.load=()=>{element.error=null;element.currentTime=0;element.seeking=false;queueMicrotask(()=>element.dispatchEvent(new Event('loadedmetadata')));};
  await handler.reload();element.dispatchEvent(new Event('seeked'));assert.equal(element.currentTime,4.5,'old pending seek is discarded');assert.equal(element.paused,true);handler.destroy();
});

test('unloading cancels a pending recording reload and removes its position-restoring listeners',async()=>{
  const element=new MediaElement(),handler=htmlMediaPlayer(element,'blob:fixture');await handler.ready;handler.seekTo(4500);element.load=()=>{};
  const pending=handler.reload(),cancelled=assert.rejects(pending,/cancelled/);handler.destroy();await cancelled;
  element.currentTime=0;element.dispatchEvent(new Event('loadedmetadata'));assert.equal(element.currentTime,0);assert.equal(handler.playing,false);assert.equal(element.src,'');
});

test('a reloaded shorter recording cannot silently clamp the retained playhead',async()=>{
  const element=new MediaElement(),handler=htmlMediaPlayer(element,'blob:fixture');await handler.ready;handler.seekTo(8500);
  element.load=()=>{element.duration=5;element.currentTime=0;queueMicrotask(()=>element.dispatchEvent(new Event('loadedmetadata')));};
  await assert.rejects(handler.reload(),/ends before the retained playhead/);assert.equal(element.paused,true);handler.destroy();
});
