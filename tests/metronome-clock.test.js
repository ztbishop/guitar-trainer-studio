import test from 'node:test';
import assert from 'node:assert/strict';
import { audibleDelayMs, createMetronomeClock } from '../js/metronome-clock.js';
import { readMetronomeVolume, saveMetronomeVolume, METRONOME_VOLUME_KEY } from '../js/tempo-preferences.js';

test('speaker timestamp maps scheduled click to the visual clock, with latency fallback',()=>{
  assert.equal(audibleDelayMs({currentTime:10,getOutputTimestamp:()=>({contextTime:9.9,performanceTime:1000})},10.02,1000).toFixed(3),'120.000');
  assert.equal(audibleDelayMs({currentTime:10,baseLatency:0.01,outputLatency:0.04},10.02,1000).toFixed(3),'70.000');
  assert.equal(audibleDelayMs(null),0);
});

test('Wait clock keeps exact BPM through UI sync and cancels audio/pulses on pause, tempo and mode changes',()=>{
  const intervals=new Map(),timeouts=new Map(),sources=[];let id=0,pulses=0;
  const timers={setInterval(fn){intervals.set(++id,fn);return id;},clearInterval(key){intervals.delete(key);},
    setTimeout(fn,delay){timeouts.set(++id,{fn,delay});return id;},clearTimeout(key){timeouts.delete(key);}};
  const gain={gain:{value:0},connect(){}};
  const audio={currentTime:1,state:'running',baseLatency:0.02,destination:{},createGain:()=>gain,
    createBufferSource(){const s={connect(){},start(time){this.time=time;},stop(){this.stopped=true;},disconnect(){}};sources.push(s);return s;}};
  const clock=createMetronomeClock(audio,{},()=>pulses++,timers);
  const state={enabled:true,running:true,bpm:200,volume:0.75};clock.sync(state);
  assert.equal(sources[0].time,1.02);assert.equal(gain.gain.value,0.75);
  assert.equal([...timeouts.values()][0].delay.toFixed(3),'40.000');
  for(const [key,item] of timeouts){timeouts.delete(key);item.fn();}assert.equal(pulses,1);
  const times=[1.25,1.55,1.85,2.15];
  for(const time of times){audio.currentTime=time;clock.sync(state);for(const fn of intervals.values())fn();}
  for(let i=1;i<sources.length;i++)assert.ok(Math.abs(sources[i].time-sources[i-1].time-0.3)<1e-9);
  const count=sources.length;clock.sync({...state,volume:0});assert.equal(sources.length,count);assert.equal(gain.gain.value,0);
  clock.sync({...state,running:false});assert.equal(intervals.size,0);assert.equal(timeouts.size,0);assert.ok(sources.every(s=>s.stopped));
  clock.sync(state);assert.equal(sources.length,count+1);
  clock.sync({...state,bpm:90});assert.equal(sources.length,count+2);assert.ok(sources.at(-2).stopped);
  audio.currentTime+=5;for(const fn of intervals.values())fn();assert.equal(sources.length,count+3,'stalled tab schedules one fresh beat, not a burst');
  clock.sync({...state,enabled:false});assert.equal(intervals.size,0);assert.equal(timeouts.size,0);
});

test('saved volume overrides 75% default including mute; invalid/unavailable storage falls back safely',()=>{
  for(const value of [null,'','bad','-1','101'])assert.equal(readMetronomeVolume({getItem:()=>value}),75);
  for(const value of ['0','33','100'])assert.equal(readMetronomeVolume({getItem:()=>value}),Number(value));
  assert.equal(readMetronomeVolume({getItem(){throw new Error('blocked');}}),75);
  const previous=globalThis.window,values=new Map();
  try {
    globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
    saveMetronomeVolume(43);assert.equal(values.get(METRONOME_VOLUME_KEY),'43');assert.equal(readMetronomeVolume(),43);
    globalThis.window={get localStorage(){throw new Error('blocked');}};
    assert.equal(readMetronomeVolume(),75);assert.doesNotThrow(()=>saveMetronomeVolume(25));
  }finally{globalThis.window=previous;}
});

