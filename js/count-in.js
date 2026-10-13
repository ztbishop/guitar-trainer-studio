// One-bar audio pre-roll, independent of score playback and practice grading.
import {audibleDelayMs} from './metronome-clock.js';

export function countInTiming(timeline, score, tick, speed=1, waitBpm=null) {
  const measure=timeline?.measures.find(measure=>tick>=measure.startTick && tick<measure.endTick) ?? timeline?.measures[0];
  const bar=score?.masterBars?.[(measure?.measureNumber ?? 1)-1];
  let bpm=score?.tempo>0 ? score.tempo : 120;
  for(const segment of timeline?.tempoMap || []) {if(segment.tick>tick)break;bpm=segment.bpm;}
  bpm=waitBpm ?? bpm*speed;
  const beats=bar?.timeSignatureNumerator>0 ? bar.timeSignatureNumerator : 4;
  const denominator=bar?.timeSignatureDenominator>0 ? bar.timeSignatureDenominator : 4;
  return {beats,secondsPerBeat:60/bpm*4/denominator};
}

export function scheduleCountIn(context, buffer, timing, volume, onBeat, onComplete, timers=globalThis) {
  const gain=context.createGain();gain.gain.value=volume;gain.connect(context.destination);
  const sources=[],callbacks=[];
  let cancelled=false;
  const first=context.currentTime+0.05;
  function stop() {
    cancelled=true;
    for(const timer of callbacks)timers.clearTimeout(timer);
    for(const source of sources){try{source.stop();}catch{}source.disconnect();}
    gain.disconnect?.();
  }
  for(let i=0;i<timing.beats;i++) {
    const at=first+i*timing.secondsPerBeat;
    const source=context.createBufferSource();source.buffer=buffer;source.connect(gain);source.start(at);sources.push(source);
    callbacks.push(timers.setTimeout(()=>{if(!cancelled)onBeat(i+1,timing.beats);},audibleDelayMs(context,at)));
  }
  callbacks.push(timers.setTimeout(()=>{if(!cancelled){stop();onComplete();}},audibleDelayMs(context,first+timing.beats*timing.secondsPerBeat)));
  stop.setVolume=value=>{gain.gain.value=value;};
  return stop;
}
