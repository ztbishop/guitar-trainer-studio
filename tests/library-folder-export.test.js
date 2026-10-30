import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryStore} from '../js/library-store.js';

test('folder backup selects member hashes, preserves empty folders, and rejects missing folders',async()=>{
 const store=new LibraryStore();
 store.list=async()=>({folders:[{id:'a',name:'A'},{id:'empty',name:'Empty'}],scores:[
  {id:'one',folderId:'a',hash:'one',bytes:new Uint8Array([255,0])},
  {id:'two',folderId:null,hash:'two',bytes:new Uint8Array([1,2])}
 ]});
 store.listProfiles=async()=>[{id:'p',scoreHash:'one'},{id:'other',scoreHash:'two'},{id:'orphan',scoreHash:'absent'}];
 const folder=await store.backup('a');
 assert.deepEqual(folder.folders,[{id:'a',name:'A'}]);assert.equal(folder.scores.length,1);
 assert.equal(folder.scores[0].data,'/wA=');assert.deepEqual(folder.mediaProfiles,[{id:'p',scoreHash:'one'}]);
 const empty=await store.backup('empty');assert.equal(empty.folders.length,1);assert.deepEqual(empty.scores,[]);assert.deepEqual(empty.mediaProfiles,[]);
 await assert.rejects(store.backup('missing'),/no longer exists/);
 const all=await store.backup();assert.equal(all.scores.length,2);assert.equal(all.mediaProfiles.length,3);
});
