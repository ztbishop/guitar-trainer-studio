import test from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeSession} from '../js/realtime-session.js';
import {getPracticeEvents,buildPlaybackTimeline} from '../js/score-playback.js';
import {practiceEvents} from '../js/media-practice.js';
import {nativeAlphaTab} from './fretboard-fixtures.js';

const event=(id,start,end,pitches=[60])=>({id,startTimeMs:start,endTimeMs:end,
  notes:pitches.map((midi,i)=>({id:`${id}:${i}`,midi,string:i+1}))});
const session=(events,options={})=>{const s=new RealtimeSession(events,options);s.started=true;return s;};
const play=(s,midi,time,speed=1,channel=1)=>s.noteOn({midi,channel,stringHint:channel,at:time/speed},time,speed);

test('missing or zero written duration keeps a bounded fallback rather than waiting for a distant target',()=>{
  for(const end of [undefined,0,NaN]) {
    const events=[event('a',0,end),event('b',10000,11000,[62])];
    const s=session(events);
    assert.equal(play(s,60,160).type,'correct');
    const t=session(events);assert.equal(play(t,60,161).type,'wrong');
    assert.equal(t.stats().missed,1);
  }
});

test('written span accepts late notes and chords until its end, with real-time early grace at every speed',()=>{
  for(const speed of [0.25,0.5,1,1.5,2])for(const hex of [false,true]) {
    const e=event('a',1000,2000,[60,64,67]);
    const s=session([e],{hex});
    assert.equal(play(s,60,1000-120*speed,speed).type,'correct');
    s.noteOff({midi:60,channel:1,at:1000/speed});
    s.advance(1800,speed,1800/speed);
    assert.equal(s.stats().missed,0);
    assert.equal(play(s,64,1800,speed,2).type,'correct');
    assert.equal(play(s,67,1999,speed,3).type,'correct');
    assert.equal(s.stats().correct,3);
    const early=session([e],{hex});
    assert.equal(play(early,60,1000-120*speed-1,speed).type,'wrong');
    const missed=session([e],{hex});
    missed.advance(1999,speed);assert.equal(missed.stats().missed,0);
    missed.advance(2000,speed);assert.equal(missed.stats().missed,3);
    assert.equal(play(missed,60,2000,speed).type,'wrong');
  }
});

test('next attack caps overlapping voices; current pending pitches win before early repeats',()=>{
  const events=[event('a',0,2000,[60,64]),event('b',500,1000,[60,67])];
  const s=session(events);
  assert.equal(play(s,60,450).eventId,'a');
  assert.equal(s.records[1].slots[0].hit,null,'one input credits only one occurrence');
  assert.equal(play(s,60,470).eventId,'b','a separate early repeat can earn the next hit');
  assert.equal(play(s,67,480).eventId,'b');
  assert.equal(play(s,64,499).eventId,'a','current chord can still finish');
  const boundary=session(events);
  assert.equal(play(boundary,60,500).eventId,'b');
  assert.equal(boundary.records[0].slots.filter(n=>n.missed).length,2);
  assert.equal(play(boundary,64,600).type,'wrong','long voice cannot reopen an earlier target');
});

test('fast subdivisions cannot use early grace to jump over the immediate upcoming target',()=>{
  const s=session([event('a',0,50,[60]),event('b',50,100,[62]),event('c',100,150,[64])]);
  assert.equal(play(s,64,20).type,'wrong');
  assert.equal(play(s,62,20).eventId,'b');
  assert.equal(play(s,64,30).type,'wrong','finishing the upcoming note does not skip its onset');
  assert.equal(play(s,64,50).eventId,'c');
});

test('rests close the written span; next-target early grace does not extend old notes',()=>{
  const events=[event('a',0,250,[60]),event('b',1000,1250,[62])];
  const s=session(events);
  assert.equal(play(s,60,249).type,'correct');
  assert.equal(play(s,60,250).type,'wrong');
  assert.equal(play(s,62,879).type,'wrong');
  assert.equal(play(s,62,880).eventId,'b');
});

test('latency shifts a written deadline consistently; seeking inside it preserves eligibility',()=>{
  const e=event('a',1000,2000);
  const s=session([e],{latencyMs:100});
  assert.equal(play(s,60,2099).type,'correct');
  const t=session([e],{latencyMs:100});
  t.advance(2099-t.latencyMs);assert.equal(t.stats().missed,0);
  t.advance(2100-t.latencyMs);assert.equal(t.stats().missed,1);
  const seek=session([e]);seek.reset(1800);seek.started=true;
  assert.equal(play(seek,60,1900).type,'correct');
  seek.reset(2000);assert.equal(seek.stats().total,0);
});

test('tempo changes determine target end time; loop boundaries clip it in synth and recording clocks',()=>{
  const timeline={ticksPerQuarter:100,endTick:400,tempoMap:[{tick:0,bpm:60,timeMs:0},{tick:100,bpm:120,timeMs:1000}],
    events:[{...event('a',0,0),trackId:'0',startTick:0,endTick:200,notes:[{id:'n',midi:60,attack:true}]}],
    measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:400}]};
  const expectedEvents=getPracticeEvents(timeline,'0');
  assert.equal(expectedEvents[0].targetEndTimeMs,1500);
  const state={expectedEvents,playbackTimeline:timeline,practiceLoop:{range:{startTick:0,endTick:150}},media:{}};
  assert.equal(practiceEvents(state)[0].targetEndTimeMs,1250);
  state.media={preview:true,points:[
    {barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:1000},
    {barIndex:0,barOccurence:0,barPosition:0.25,millisecondOffset:3000},
    {barIndex:0,barOccurence:0,barPosition:1,millisecondOffset:9000}
  ]};
  const projected=practiceEvents(state)[0];
  assert.equal(projected.startTimeMs,1000);
  assert.equal(projected.targetEndTimeMs,4000);
  assert.equal(projected.endTimeMs,5000);
  const s=session([projected]);assert.equal(play(s,60,3999).type,'correct');
  const t=session([projected]);t.advance(4000);assert.equal(t.stats().missed,1);
  assert.equal(expectedEvents[0].targetEndTimeMs,1500,'source score time remains unchanged');
});

test('native repeats, rests and ties provide bounded written windows without extra tie attacks',()=>{
  const at=nativeAlphaTab(),settings=new at.Settings();
  const parser=new at.importer.AlphaTexImporter();
  parser.initFromString(String.raw`\tempo 120 . \ro 0.6.4 r.4 2.6.4 -.6.4 | \rc 2 4.6.1`,settings);
  const score=parser.readScore(),midi=new at.midi.MidiFile();
  const generator=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));generator.generate();
  const timeline=buildPlaybackTimeline(generator.tickLookup),events=getPracticeEvents(timeline,'0');
  assert.equal(events.length,6);
  assert.equal(events[0].targetEndTimeMs,500,'first written note ends before the rest');
  assert.equal(events[1].targetEndTimeMs,1500,'tie continuation does not extend attack opportunity');
  assert.equal(events[1].notes[0].endTimeMs,2000,'sustain metadata still includes the tie');
  const s=session(events);
  assert.equal(play(s,40,499).type,'correct');
  assert.equal(play(s,42,1499).type,'correct');
  s.finish();assert.equal(s.stats().correct,2);assert.equal(s.stats().missed,4);
});
