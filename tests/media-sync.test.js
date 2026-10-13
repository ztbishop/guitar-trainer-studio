import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mediaUrl,youtubeId,validateSource,sourceMatches,validatePoints,pointTick,defaultPoints,tempoAlignedPoints,validateProfile,parseProfileExport,MEDIA_PROFILE_FORMAT,mediaTimeAtTick,tickAtMediaTime} from '../js/media-sync.js';
import {validateBackup,LIBRARY_FORMAT,encodeBytes} from '../js/library-store.js';
import {installAlphaTabCompatibility} from '../js/alphatab-host.js';
const native=createRequire(import.meta.url)('../assets/vendor/alphatab/alphaTab.js');
const timeline={endTick:11520,durationMs:6000,ticksPerQuarter:960,tempoMap:[{tick:0,bpm:120,timeMs:0},{tick:7680,bpm:240,timeMs:4000}],
  measures:[{measureNumber:1,occurrence:1,startTick:0,endTick:3840},{measureNumber:1,occurrence:2,startTick:3840,endTick:7680},{measureNumber:2,occurrence:1,startTick:7680,endTick:11520}]};
const source={kind:'local',label:'Lesson',fileName:'lesson.mp4',size:300,lastModified:12};
const profile=()=>({id:'profile',scoreHash:'a'.repeat(64),scoreName:'Song',name:'Performance',source,durationMs:10000,points:tempoAlignedPoints(timeline,10000),layout:'right'});

test('native 1.8.4 worker info compatibility fixes only the recursive getter and is idempotent',()=>{
  assert.ok(installAlphaTabCompatibility(native));
  const worker=Object.create(native.synth.AlphaSynthWebWorkerApi.prototype),info={currentTick:42};worker._loadedMidiInfo=info;
  assert.equal(worker.loadedMidiInfo,info);assert.equal(installAlphaTabCompatibility(native),false);
  const untouched={synth:{AlphaSynthWebWorkerApi:class {get loadedMidiInfo(){return 'correct';}}}};
  assert.equal(installAlphaTabCompatibility(untouched),false);assert.equal(new untouched.synth.AlphaSynthWebWorkerApi().loadedMidiInfo,'correct');
});

test('media sources accept playable URL schemes and explicit YouTube link forms',()=>{
  assert.equal(mediaUrl(' https://example.org/song.mp4 '),'https://example.org/song.mp4');
  for(const url of ['javascript:alert(1)','file:///C:/test.mp4','https://user:password@example.org/file'])assert.throws(()=>mediaUrl(url));
  for(const url of ['https://youtu.be/abcdefghijk','https://www.youtube.com/watch?v=abcdefghijk','https://youtube.com/shorts/abcdefghijk','abcdefghijk'])assert.equal(youtubeId(url),'abcdefghijk');
  assert.throws(()=>youtubeId('https://other.org/watch?v=abcdefghijk'));
});
test('local profile pairing checks filename, size and modification time, without storing recording bytes',()=>{
  assert.ok(sourceMatches(source,{...source,label:'Renamed display'}));
  assert.ok(!sourceMatches(source,{...source,size:301}));
  assert.ok(!sourceMatches(source,{...source,lastModified:13}));
  assert.deepEqual(validateSource({...source,bytes:new Uint8Array(500)}),source);
  assert.throws(()=>validateSource({...source,size:'300'}));
});
test('alignment follows repeat occurrences and rejects reversed time or duplicate score positions',()=>{
  const points=defaultPoints(timeline,10000),repeat={barIndex:0,barOccurence:1,barPosition:0,millisecondOffset:4000};
  assert.equal(pointTick(repeat,timeline),3840);
  assert.equal(validatePoints([...points,repeat],timeline)[1].millisecondOffset,4000);
  assert.throws(()=>validatePoints([...points,{...repeat,barOccurence:3}],timeline));
  assert.throws(()=>validatePoints([...points,{...repeat,millisecondOffset:12000}],timeline,10000));
  assert.throws(()=>validatePoints([...points,{...repeat,millisecondOffset:0}],timeline));
  assert.throws(()=>validatePoints([...points,{...points[0]}],timeline));
});
test('initial alignment includes tempo changes and keeps the score timeline immutable',()=>{
  const previous=structuredClone(timeline),points=tempoAlignedPoints(timeline,12000);
  assert.equal(points.length,3);assert.equal(points[1].millisecondOffset,8000);
  assert.deepEqual(timeline,previous);
  assert.equal(mediaTimeAtTick(points,timeline,9600),10000);
  assert.equal(tickAtMediaTime(points,timeline,10000),9600);
});
test('profile export validates version and strips unknown properties and media contents',()=>{
  const parsed=parseProfileExport({format:MEDIA_PROFILE_FORMAT,version:1,profiles:[{...profile(),grading:{accuracy:99},recordingBytes:'large'}]})[0];
  assert.ok(!('grading' in parsed));assert.ok(!('recordingBytes' in parsed));
  assert.throws(()=>validateProfile({...profile(),scoreHash:'file-name'}));
  assert.throws(()=>validateProfile({...profile(),points:[{barIndex:-1}]}));
  assert.throws(()=>parseProfileExport({format:MEDIA_PROFILE_FORMAT,version:2,profiles:[]}));
});
test('library version 2 accepts sync profiles while version 1 remains readable and invalid profiles reject',async()=>{
  const backup={format:LIBRARY_FORMAT,version:2,folders:[],scores:[{id:'score',fileName:'a.gp5',title:'Song',data:encodeBytes(new Uint8Array([1]))}],mediaProfiles:[profile()]};
  assert.equal((await validateBackup(backup)).mediaProfiles.length,1);
  assert.equal((await validateBackup({...backup,version:1,mediaProfiles:undefined})).mediaProfiles.length,0);
  await assert.rejects(validateBackup({...backup,mediaProfiles:[{...profile(),durationMs:-1}]}));
  await assert.rejects(validateBackup({...backup,mediaProfiles:[profile(),profile()]}));
});
test('bundled native API consumes the same flat sync points and restores original score data',()=>{
  const parser=new native.importer.AlphaTexImporter();parser.initFromString('\\tempo 120 . 0.6.4 1.6.4 2.6.4 3.6.4 | 0.5.4 1.5.4 2.5.4 3.5.4',new native.Settings());
  const score=parser.readScore(),original=score.exportFlatSyncPoints();
  const points=[{barIndex:0,barOccurence:0,barPosition:0,millisecondOffset:1000},{barIndex:1,barOccurence:0,barPosition:1,millisecondOffset:9000}];
  score.applyFlatSyncPoints(points);assert.deepEqual(score.exportFlatSyncPoints(),points);
  const midi=new native.midi.MidiFile(),generator=new native.midi.MidiFileGenerator(score,new native.Settings(),new native.midi.AlphaSynthMidiFileHandler(midi));generator.generate();
  assert.equal(generator.syncPoints.length,2);assert.equal(generator.syncPoints[0].syncTime,1000);assert.equal(generator.syncPoints[1].syncTime,9000);
  score.applyFlatSyncPoints(original);assert.deepEqual(score.exportFlatSyncPoints(),original);
});
