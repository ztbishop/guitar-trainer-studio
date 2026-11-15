import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../assets/vendor/alphatab/alphaTab.core.mjs';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
import {writtenBendSegment} from '../js/written-bends.js';

const context=vm.createContext({console,process});
vm.runInContext(fs.readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
const classic=context.alphaTab;
const points=values=>values.map(([offset,value])=>({offset,value}));

test('written bends include the base, exact fractional extent and both release directions',()=>{
  for(const [curve,expected] of [
    [[[0,0],[60,4]],{min:60,max:62}],
    [[[0,4],[60,4]],{min:60,max:62}],
    [[[0,4],[60,0]],{min:60,max:62}],
    [[[0,0],[30,1],[60,0]],{min:60,max:60.5}],
    [[[0,0],[30,-24],[60,4]],{min:48,max:62}],
  ])assert.deepEqual(writtenBendSegment(60,points(curve),null).bendRange,expected);
  assert.equal(writtenBendSegment(60,null,null).bendRange,undefined);
});

test('simultaneous finger and whammy curves sum at common time positions',()=>{
  const rise=points([[0,0],[30,4],[60,0]]),fall=points([[0,0],[30,-4],[60,0]]);
  assert.deepEqual(writtenBendSegment(60,rise,fall).bendRange,{min:60,max:60});
  assert.deepEqual(writtenBendSegment(60,points([[0,0],[60,4]]),points([[0,0],[30,4],[60,0]])).bendRange,{min:60,max:63});
  assert.deepEqual(writtenBendSegment(60,points([[0,4],[60,4]]),points([[0,-4],[60,4]])).bendRange,{min:60,max:64});
});

test('malformed curves fail closed without rounding or trusting a surviving component',()=>{
  for(const bad of [
    {},[null],points([[0,0],[60,NaN]]),points([[0,0],[Infinity,4]]),
    points([[-1,0],[60,4]]),points([[0,0],[61,4]]),points([[30,0],[0,4]]),
    points([[0,0],[30,2],[30,4],[60,4]]),
  ]) {
    assert.equal(writtenBendSegment(60,bad,null).valid,false);
    assert.equal(writtenBendSegment(60,points([[0,0],[60,4]]),bad).bendRange,undefined);
  }
  assert.deepEqual(writtenBendSegment(60,points([[0,0],[30,4],[30,4],[60,0]]),null).bendRange,{min:60,max:62});
});

function nativeTimeline(library,tex,alter) {
  const settings=new library.Settings(),parser=new library.importer.AlphaTexImporter();
  parser.initFromString(tex,settings);
  const score=parser.readScore();alter(score,library.model);score.finish(settings);
  const midi=new library.midi.MidiFile();
  const generator=new library.midi.MidiFileGenerator(score,settings,new library.midi.AlphaSynthMidiFileHandler(midi));
  generator.generate();
  return buildPlaybackTimeline(generator.tickLookup,{tempo:score.tempo,ticksPerQuarter:midi.division});
}

for(const [name,library] of [['classic',classic],['core',core]]) {
  test(name+' native targets retain bends, pre-bends, releases, whammy and vibrato separately',()=>{
    const timeline=nativeTimeline(library,String.raw`\tempo 120 . 1.2.4 1.2.4 1.2.4 1.2.4 | (1.2 0.1).2 1.2.2`,(score,m)=>{
      const bars=score.tracks[0].staves[0].bars;
      const notes=bars[0].voices[0].beats.map(b=>b.notes[0]);
      for(const [i,curve] of [[[0,0],[60,4]],[[0,4],[60,4]],[[0,4],[60,0]]].entries())
        for(const [offset,value] of curve)notes[i].addBendPoint(new m.BendPoint(offset,value));
      notes[3].vibrato=m.VibratoType.Slight;
      const dive=bars[1].voices[0].beats[0];
      for(const [offset,value] of [[0,0],[30,-24],[60,4]])dive.addWhammyBarPoint(new m.BendPoint(offset,value));
    });
    const events=getPracticeEvents(timeline,'0');
    assert.deepEqual(events.slice(0,3).map(e=>e.notes[0].bendRange),Array(3).fill({min:60,max:62}));
    assert.equal(events[3].notes[0].hasVibrato,true);
    assert.equal(events[3].notes[0].bendRange,undefined);
    assert.deepEqual(events[4].notes.map(n=>[n.midi,n.bendRange]),[[60,{min:48,max:62}],[64,{min:52,max:66}]]);
    assert.equal(events[5].notes[0].bendRange,undefined);
    assert.deepEqual(events.slice(0,4).map(e=>e.pitches),[[60],[60],[60],[60]]);
  });

  test(name+' late tied curves extend only their original required attack and keep sounding harmonic pitch',()=>{
    const timeline=nativeTimeline(library,String.raw`\tempo 120 . 1.2.2 -.2.2 | -.2.1 | 1.2.1`,(score,m)=>{
      const bars=score.tracks[0].staves[0].bars;
      const middle=bars[0].voices[0].beats[1].notes[0],tail=bars[1].voices[0].beats[0];
      for(const [offset,value] of [[0,0],[60,4]])middle.addBendPoint(new m.BendPoint(offset,value));
      for(const [offset,value] of [[0,0],[60,4]])tail.addWhammyBarPoint(new m.BendPoint(offset,value));
      tail.vibrato=m.VibratoType.Wide;
      const harmonic=bars[2].voices[0].beats[0].notes[0];
      harmonic.harmonicType=m.HarmonicType.Natural;harmonic.harmonicValue=12;
    });
    const notes=timeline.events.flatMap(e=>e.notes),events=getPracticeEvents(timeline,'0');
    assert.deepEqual(notes.slice(0,3).map(n=>n.bendRange),Array(3).fill({min:60,max:64}));
    assert(notes.slice(0,3).every(n=>n.hasVibrato));
    assert.equal(events.length,2);
    assert.equal(events[0].notes[0].durationTicks,7680);
    assert.deepEqual(events[1].pitches,[71]);
    assert.equal(events[1].notes[0].bendRange,undefined);
  });
}

function playedTimeline(sequence) {
  return buildPlaybackTimeline({masterBars:sequence.map((beat,index)=>({
    masterBar:{index:beat.voice.bar.index},start:index*960,end:(index+1)*960,tempoChanges:[],
    firstBeat:{end:960,nextBeat:null,highlightedBeats:[{beat,playbackStart:0}]},
  }))});
}
function sourceBeat(id,index,{curve=null,origin=null,whammy=null}={}) {
  const beat={id,index:0,absolutePlaybackStart:index*960,isRest:false,whammyBarPoints:whammy,
    voice:{index:0,bar:{index,staff:{index:0,track:{index:0},tuning:[40,45,50,55,59,64]}}}};
  beat.notes=[{id:'n'+id,realValue:60,string:2,fret:1,beat,bendPoints:curve,
    isTieDestination:Boolean(origin),tieOrigin:origin?.notes[0]}];
  return beat;
}

test('alternate played endings cannot leak a later wider bend into an earlier occurrence',()=>{
  const start=sourceBeat('a',0),first=sourceBeat('b',1,{origin:start,curve:points([[0,0],[60,4]])});
  const second=sourceBeat('c',2,{origin:start,curve:points([[0,0],[60,8]])});
  const timeline=playedTimeline([start,first,start,second]);
  const events=getPracticeEvents(timeline,'0');
  assert.deepEqual(events.map(e=>e.notes[0].bendRange),[{min:60,max:62},{min:60,max:64}]);
  assert.notEqual(events[0].notes[0].id,events[1].notes[0].id);
  assert.deepEqual(timeline.events.map(e=>e.notes[0].bendRange),[{min:60,max:62},{min:60,max:62},{min:60,max:64},{min:60,max:64}]);
});

test('a rest or skipped origin blocks tie-range inheritance, and invalid ties leave the chain strict',()=>{
  const start=sourceBeat('a',0),tail=sourceBeat('b',1,{origin:start,curve:points([[0,0],[60,8]])});
  const gap=sourceBeat('r',2);gap.notes=[];gap.isRest=true;
  const timeline=playedTimeline([start,gap,tail]);
  assert.equal(timeline.events[0].notes[0].bendRange,undefined);
  assert.equal(timeline.events[2].notes[0].attackNoteId,null);
  const marked=sourceBeat('m',0,{curve:points([[0,0],[60,4]])});
  const broken=sourceBeat('n',1,{origin:marked,curve:points([[0,0],[60,NaN]])});
  assert(playedTimeline([marked,broken]).events.every(e=>e.notes[0].bendRange===undefined));
});
