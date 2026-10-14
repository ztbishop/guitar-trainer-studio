import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryStore} from '../js/library-store.js';

// Exercise bulk operations with asynchronous requests and transaction rollback.
function fixture() {
  const data={folders:new Map([['a',{id:'a'}],['b',{id:'b'}]]),scores:new Map([
    ['one',{id:'one',title:'First',folderId:'a',bytes:new Uint8Array([1,2])}],
    ['two',{id:'two',title:'Second',folderId:'b',bytes:new Uint8Array([3])}],
    ['three',{id:'three',title:'Third',folderId:'a',bytes:new Uint8Array([4])}]
  ])};
  const store=new LibraryStore();
  store.transaction=async(keys,mode,run)=>{
    assert.equal(mode,'readwrite');
    const working=structuredClone(data);let aborted=false;
    const request=result=>{const req={};queueMicrotask(()=>req.onsuccess?.({target:{result}}));return req;};
    const stores=Object.fromEntries(keys.map(key=>[key,{
      getAll:()=>request([...working[key].values()]),get:id=>request(working[key].get(id)),
      put:item=>working[key].set(item.id,item),delete:id=>working[key].delete(id),
      transaction:{abort(){aborted=true;}}
    }]));
    run(stores,()=>{});
    await new Promise(resolve=>setImmediate(resolve));
    if(aborted)throw new Error('Transaction aborted');
    Object.assign(data,working);
  };
  return {store,data};
}

test('bulk move preserves bytes and titles, leaves unselected scores, rejects missing destination',async()=>{
  const {store,data}=fixture();
  const before=structuredClone(data);
  await assert.rejects(store.moveScores(['one','three'],'missing'));
  assert.deepEqual(data,before);
  await store.moveScores(['one','three'],'b');
  assert.equal(data.scores.get('one').folderId,'b');
  assert.equal(data.scores.get('three').folderId,'b');
  assert.deepEqual(data.scores.get('two'),before.scores.get('two'));
  assert.deepEqual(data.scores.get('one').bytes,before.scores.get('one').bytes);
  assert.equal(data.scores.get('one').title,'First');
  await store.moveScores(['one'],null);
  assert.equal(data.scores.get('one').folderId,null);
});

test('bulk folder removal keeps all scores; bulk score deletion removes only selected IDs',async()=>{
  const {store,data}=fixture();
  await store.deleteFolders(['a']);
  assert.equal(data.folders.has('a'),false);
  assert.equal(data.folders.has('b'),true);
  assert.equal(data.scores.size,3);
  assert.equal(data.scores.get('one').folderId,null);
  assert.equal(data.scores.get('three').folderId,null);
  assert.equal(data.scores.get('two').folderId,'b');
  await store.deleteScores(['one','three','one']);
  assert.deepEqual([...data.scores.keys()],['two']);
});

test('confirmed folder deletion deletes its contents and retains other folders and Unfiled',async()=>{
  const {store,data}=fixture();
  data.scores.set('unfiled',{id:'unfiled',folderId:null,bytes:new Uint8Array([9])});
  await store.deleteFolderAndScores('a');
  assert.deepEqual([...data.folders.keys()],['b']);
  assert.deepEqual([...data.scores.keys()],['two','unfiled']);
  assert.deepEqual(data.scores.get('two').bytes,new Uint8Array([3]));
});

test('bulk folder deletion removes all selected contents and ignores system or missing IDs',async()=>{
  const {store,data}=fixture();
  data.scores.set('unfiled',{id:'unfiled',folderId:null});
  data.scores.set('orphan',{id:'orphan',folderId:'missing'});
  await store.deleteFoldersAndScores(['a','b','a','','__all__',null,'missing']);
  assert.equal(data.folders.size,0);
  assert.deepEqual([...data.scores.keys()],['unfiled','orphan']);
});
