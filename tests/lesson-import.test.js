import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson,soundslicePoints} from '../js/lesson-import-data.js';
import {repeatFixture,repeatCases} from './media-repeat-fixtures.js';
import {pointTick} from '../js/media-sync.js';
import {appAddress,fetchBytes,base64Bytes,checkScoreBytes} from '../extensions/lesson-bridge/transfer.js';
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
test('manual score tests distinguish supported headers from PDF, HTML and internal notation JSON',()=>{
  const bytes=text=>new TextEncoder().encode(text);
  assert.match(checkScoreBytes(bytes('FICHIER GUITAR PRO v5.00'),'lesson.gp5'),/Guitar Pro/);
  assert.match(checkScoreBytes(bytes('<?xml version="1.0"?><score-partwise version="3.0">'),'lesson.musicxml'),/MusicXML/);
  assert.match(checkScoreBytes(bytes('PK fixture container'),'lesson.gp'),/container/);
  for(const text of ['%PDF-1.5','<!DOCTYPE html><html>Sign in</html>','{"notation":"internal"}'])assert.throws(()=>checkScoreBytes(bytes(text),'lesson.gp5'));
  assert.throws(()=>checkScoreBytes(bytes('<score-partwise>'),'lesson.gp5'));
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
test('extension target validation limits insecure targets to loopback and encodes score bytes losslessly',()=>{
  assert.equal(appAddress('http://localhost:5500/index.html').port,'5500');
  assert.equal(appAddress('https://example.com/trainer/').pathname,'/trainer/');
  for(const url of ['http://remote.example/','file:///app.html','https://user:pass@example.com/','http://localhost/?token=secret'])assert.throws(()=>appAddress(url));
  const bytes=Uint8Array.from({length:17000},(_,i)=>i%256);
  assert.deepEqual(Uint8Array.from(atob(base64Bytes(bytes)),c=>c.charCodeAt(0)),bytes);
});
test('extension downloads stop at their byte limit and reject sign-in HTML rather than importing it',async()=>{
  const oldFetch=globalThis.fetch;let cancelled=false;
  try {
    globalThis.fetch=async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}}));
    await assert.rejects(fetchBytes('https://example.com/test.gp5',4),/size limit/);assert(cancelled);
    globalThis.fetch=async()=>new Response('<html>Sign in</html>',{headers:{'content-type':'text/html'}});
    await assert.rejects(fetchBytes('https://example.com/test.gp5',100),/Sign in/);
  } finally {globalThis.fetch=oldFetch;}
});
