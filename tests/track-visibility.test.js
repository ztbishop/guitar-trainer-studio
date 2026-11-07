import test from 'node:test';
import assert from 'node:assert/strict';
import {friendlyTrackName,rememberTrackNames,originalTrackNames,selectedScoreTracks,restoreTrackVisibility,saveTrackVisibility} from '../js/track-visibility.js';
import {fingerprint} from '../js/library-store.js';

const tracks=()=>[{index:0,name:'Lead Guitar'},{index:1,name:'@$Chords$@'},{index:2,name:'@$Strumming$@'}];
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
test('friendly labels preserve source names and unrelated text',()=>{
  const list=tracks();rememberTrackNames(list);rememberTrackNames(list);
  assert.deepEqual(list.map(t=>t.name),['Lead Guitar','Chords','Strumming']);
  assert.equal(originalTrackNames(list[1]).name,'@$Chords$@');
  assert.equal(friendlyTrackName(String.raw`@\(Chords\)@`),'Chords');
  assert.equal(friendlyTrackName('Guitar (Chords)'),'Guitar (Chords)');
});
test('custom visibility retains score order and is independent of practice and mixer',()=>{
  const state={tracks:tracks(),viewMode:'custom',customTrackIds:['2','1','1','missing'],practiceTrackId:'0',audio:{muted:true},trainer:{partial:true}};
  const before=JSON.stringify(state);
  assert.deepEqual(selectedScoreTracks(state).map(t=>t.index),[1,2]);
  assert.equal(JSON.stringify(state),before);
  state.practiceTrackId='2';assert.deepEqual(selectedScoreTracks(state).map(t=>t.index),[1,2]);
});
test('per-byte song identity restores custom selection, mode and survives rename',async()=>{
  const store=storage(),hash=await fingerprint(new Uint8Array([1,2,3]));
  const state={tracks:tracks(),viewMode:'custom',customTrackIds:['2','0'],practiceTrackId:'0',currentScoreFile:{hash,fileName:'first.gp'}};
  saveTrackVisibility(state,store);
  state.currentScoreFile.fileName='renamed.gp';state.viewMode='all-tracks';state.customTrackIds=[];
  restoreTrackVisibility(state,store);assert.equal(state.viewMode,'custom');assert.deepEqual(state.customTrackIds,['0','2']);
  state.currentScoreFile.hash=await fingerprint(new Uint8Array([1,2,4]));restoreTrackVisibility(state,store);
  assert.equal(state.viewMode,'practice-only');assert.deepEqual(state.customTrackIds,['0']);
  state.currentScoreFile.hash=hash;state.tracks=state.tracks.slice(0,2);restoreTrackVisibility(state,store);
  assert.deepEqual(state.customTrackIds,['0']);
});
test('invalid, empty and inaccessible saved selections fail safely',()=>{
  const state={tracks:tracks(),viewMode:'custom',practiceTrackId:'1',currentScoreFile:{hash:'test'}};
  for(const getItem of [()=>'{broken',()=>JSON.stringify({mode:'custom',ids:['missing']}),()=>{throw Error('blocked');}]) {
    restoreTrackVisibility(state,{getItem});assert.deepEqual(state.customTrackIds,['1']);
  }
  assert.doesNotThrow(()=>saveTrackVisibility(state,{setItem(){throw Error('quota');}}));
});
