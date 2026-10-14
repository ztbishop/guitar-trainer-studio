import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBackup,encodeBytes,decodeBytes,fingerprint,LIBRARY_FORMAT,LibraryStore} from '../js/library-store.js';
import {playbackGroups,clampVolume,initAudioControls} from '../js/audio-controls.js';
import {AppState} from '../js/app-state.js';

const bytes=new Uint8Array([0,255,128,1,12,48]);
const backup=()=>({format:LIBRARY_FORMAT,version:1,folders:[{id:'folder',name:'Practice'}],scores:[{id:'score',title:'Song',fileName:'song.gp5',folderId:'folder',data:encodeBytes(bytes)}]});

test('library backup preserves every original byte and computes identity from content',async()=>{
  const result=await validateBackup(backup());
  assert.deepEqual(result.scores[0].bytes,bytes);
  assert.equal(result.scores[0].hash,await fingerprint(bytes));
  const large=Uint8Array.from({length:30000},(_,index)=>index%256);
  assert.deepEqual(decodeBytes(encodeBytes(large)),large);
  const longName=backup();longName.scores[0].fileName='a'.repeat(245)+'.musicxml';
  assert.equal((await validateBackup(longName)).scores[0].fileName,longName.scores[0].fileName,'backup filenames retain their original extension');
});

test('invalid backup versions, references, repeated ids and data reject before any database access',async()=>{
  for(const mutate of [data=>data.version=99,data=>data.format='piano',data=>data.scores[0].folderId='missing',data=>data.folders.push(data.folders[0]),data=>data.scores.push(data.scores[0]),data=>data.scores[0].data='broken!',data=>data.scores[0].fileName='song.exe']) {
    const data=backup();mutate(data);let writes=0;
    const store=new LibraryStore();store.transaction=()=>{writes++;};
    await assert.rejects(store.merge(data));assert.equal(writes,0);
  }
});

test('shared MIDI channels form transitive groups, while independent tracks keep separate controls',()=>{
  const tracks=[{index:0,playbackInfo:{primaryChannel:0,secondaryChannel:1}},
    {index:1,playbackInfo:{primaryChannel:2,secondaryChannel:3}},
    {index:2,playbackInfo:{primaryChannel:1,secondaryChannel:2}},
    {index:3,playbackInfo:{primaryChannel:4,secondaryChannel:5}}];
  const groups=playbackGroups(tracks);
  assert.equal(groups.length,2);
  assert.equal(groups.find(group=>group.tracks.length===3).id,'0:1:2');
  assert.equal(groups.find(group=>group.tracks.length===1).id,'3');
  assert.equal(clampVolume(''),100);assert.equal(clampVolume('bad',42),42);
  assert.equal(clampVolume(-5),0);assert.equal(clampVolume(125),100);assert.equal(clampVolume(0),0);
});

test('synced media volume is independent, saved, and dispatched separately from synth master',()=>{
  const previous={document:globalThis.document,window:globalThis.window,audio:AppState.audio};
  class Control extends EventTarget {value='';replaceChildren(){this.children=[];}textContent='';}
  const ids=Object.fromEntries(['master-volume','master-volume-number','media-volume','media-volume-number','track-mixer'].map(id=>[id,new Control()]));
  const values=new Map(),calls=[];
  globalThis.document={getElementById:id=>ids[id]};
  globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
  AppState.audio={masterPercent:100,tracks:{}};
  try {
    const controls=initAudioControls((...args)=>calls.push(args));
    assert.equal(AppState.audio.mediaPercent,100);
    ids['media-volume'].value='35';ids['media-volume'].dispatchEvent(new Event('input'));
    assert.equal(AppState.audio.mediaPercent,35);assert.equal(values.get('gts.mediaVolume'),'35');
    assert.deepEqual(calls.at(-1),['media',35]);
    assert.equal(AppState.audio.masterPercent,100,'media adjustment leaves synth master unchanged');
    ids['media-volume-number'].value='0';ids['media-volume-number'].dispatchEvent(new Event('change'));
    assert.equal(AppState.audio.mediaPercent,0);assert.equal(ids['media-volume'].value,'0');
    controls.sync();assert.equal(ids['media-volume-number'].value,'0');
  } finally {globalThis.document=previous.document;globalThis.window=previous.window;AppState.audio=previous.audio;}
});
