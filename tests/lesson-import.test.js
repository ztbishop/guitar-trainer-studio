import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson,soundslicePoints,validateRecordingFile,lessonTimelineKey} from '../js/lesson-import-data.js';
import {repeatFixture,repeatCases} from './media-repeat-fixtures.js';
import {pointTick} from '../js/media-sync.js';
const payload=()=>({format:'gts-lesson',version:1,title:'Lesson',lessonUrl:'https://truefire.com/lesson/v32684',score:{fileName:'test.gp5',base64:btoa('test score')},recording:null,syncPoints:null});
test('lesson payload validation rejects unsupported versions, dangerous names, URLs and bytes',()=>{
  assert.equal(new TextDecoder().decode(validateLesson(payload()).score.bytes),'test score');
  for(const edit of [p=>p.version=99,p=>p.score.fileName='../test.gp5',p=>p.score.fileName='page.html',p=>p.score.base64='bad!',p=>p.lessonUrl='javascript:alert(1)',p=>p.recording={url:'https://user:secret@example.com/clip.mp4'},p=>p.syncPoints=[[0,1],[96,200]]]) {
    const p=payload();edit(p);assert.throws(()=>validateLesson(p));
  }
});
test('version 2 supports explicit partial updates while rejecting empty or ambiguous operations',()=>{
  const p={...payload(),version:2,score:null,recording:{url:'https://example.com/clip.mp4'},keepRecording:false};
  assert.equal(validateLesson(p).score,null);
  const timing={...p,recording:null,syncPoints:[[0,1],[4,10]]};
  assert.equal(validateLesson(timing).keepRecording,true);
  assert.throws(()=>validateLesson({...p,recording:null}));
  assert.throws(()=>validateLesson({...p,keepRecording:'yes'}));
  assert.equal(validateLesson({...payload(),version:2,keepRecording:true}).keepRecording,true);
});
test('Soundslice conversion maps native expanded repeats/jumps, fractions and terminal endpoints without mutation',()=>{
  for(const spec of repeatCases) {
    const {timeline}=repeatFixture(spec),n=timeline.measures.length;
    const source=[[0,1],[1,2,240],[n,20]],copy=structuredClone(source);
    const result=soundslicePoints(source,timeline,21000);
    assert.deepEqual(source,copy);
    assert.equal(pointTick(result[1],timeline),(timeline.measures[1].startTick+timeline.measures[1].endTick)/2);
    assert.equal(pointTick(result.at(-1),timeline),timeline.endTick);
    assert.equal(result.at(-1).barOccurence,timeline.measures.at(-1).occurrence-1);
  }
});
test('timing mismatches and unsupported playhead semantics fail before anchors are applied',()=>{
  const {timeline}=repeatFixture();const n=timeline.measures.length;
  for(const data of [[[0,1],[96,200]],[[0,1],[n,20,240]],[[0,1],[n,20,0,1]],[[0,1],[n,20],[n+1,21]],[[0,1],[0,2,480],[1,3],[n,20]]])
    assert.throws(()=>soundslicePoints(data,timeline,21000));
  assert.throws(()=>soundslicePoints([[0,1],[n,22]],timeline,21000));
  assert.equal(soundslicePoints([[0,1],[n-1,20,480]],timeline,21000).at(-1).barPosition,1);
});

test('Blue Nova timing preserves its nonzero start and terminal anchor across 64 performance measures',()=>{
  const measures=Array.from({length:64},(_,i)=>({measureNumber:i+1,occurrence:1,startTick:i*3840,endTick:(i+1)*3840}));
  const timeline={measures,endTick:64*3840};
  const result=soundslicePoints([[0,7.932401116538729,0,0],[63,133.861,0,0],[64,135.97788300000013,0,0]],timeline,140000);
  for(const [i,time] of [7932.401116538729,133861,135977.883].entries())assert(Math.abs(result[i].millisecondOffset-time)<0.000001);
  assert.equal(pointTick(result[0],timeline),0);assert.equal(pointTick(result.at(-1),timeline),timeline.endTick);
});


test('version 3 local-choice requests carry no path/bytes and preserve older receiver contracts',()=>{
  const local={...payload(),version:3,score:null,recording:{kind:'local-choice'},syncPoints:[[0,1],[4,10]],keepRecording:false};
  assert.deepEqual(validateLesson(local).recording,{kind:'local-choice'});assert.equal(validateLesson(local).keepRecording,false);
  for(const edit of [p=>p.version=2,p=>p.keepRecording=true,p=>p.recording.url='file:///private.wav',p=>p.recording.base64='data',p=>p.recording.kind='local']){
    const p=structuredClone(local);edit(p);assert.throws(()=>validateLesson(p));
  }
  assert.equal(validateLesson(payload()).score.fileName,'test.gp5');
  assert.throws(()=>validateLesson({...local,recording:null,syncPoints:null}));
});
test('review accepts nonempty local media files while rejecting missing/empty/nonmedia choices',()=>{
  const file=new File(['wave'],'recording.wav',{type:'audio/wav',lastModified:1234});assert.equal(validateRecordingFile(file),file);
  assert.equal(validateRecordingFile(new File(['media'],'recording.mp4')).name,'recording.mp4');
  for(const file of [null,{name:'fake.wav',size:10},new File([],'empty.wav'),new File(['text'],'notes.txt',{type:'text/plain'})])assert.throws(()=>validateRecordingFile(file));
});

test('lesson timeline snapshots accept equivalent rebuilds but detect changed repeat mapping, ticks and tempo',()=>{
 const {timeline}=repeatFixture(),key=lessonTimelineKey(timeline);assert.notEqual(key,null);
 assert.equal(lessonTimelineKey(structuredClone(timeline)),key);
 for(const mutate of [t=>t.endTick++,t=>t.ticksPerQuarter++,t=>t.measures[0].measureNumber++,t=>t.measures[0].occurrence++,t=>t.measures[0].playbackMeasureIndex++,t=>t.measures[0].startTick++,t=>t.measures[0].endTick++,t=>t.tempoMap[0].tick++,t=>t.tempoMap[0].bpm++,t=>t.tempoMap[0].timeMs++,t=>t.measures.reverse()]){const changed=structuredClone(timeline);mutate(changed);assert.notEqual(lessonTimelineKey(changed),key);}
 timeline.measures[0].endTick++;assert.notEqual(lessonTimelineKey(timeline),key,'snapshot also catches in-place changes');
 for(const invalid of [null,{}, {...timeline,measures:[]},{...timeline,tempoMap:[]},{...timeline,endTick:NaN}])assert.equal(lessonTimelineKey(invalid),null);
});
