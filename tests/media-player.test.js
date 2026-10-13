import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlMediaPlayer} from '../js/media-player.js';
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
