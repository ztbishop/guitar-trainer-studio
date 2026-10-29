import test from 'node:test';
import assert from 'node:assert/strict';

test('send worker survives popup closure, gates permissions, avoids duplicates and reports results on reopening',async()=>{
  const oldChrome=globalThis.chrome,oldFetch=globalThis.fetch;
  let listener,approve,requests=0,downloads=0,deliveries=0,focused=0,status={},matches=[{id:7,url:'http://localhost:5500/index.html'}];
  globalThis.chrome={runtime:{id:'bridge',getURL:path=>'chrome-extension://bridge/'+path,onMessage:{addListener(fn){listener=fn;}}},
    permissions:{request(){requests++;return new Promise(resolve=>{approve=resolve;});}},
    storage:{local:{async set(){}},session:{async get(){return status;},async set(value){status={...status,...value};}}},
    tabs:{async query(){return matches;},async update(){focused++;}},
    scripting:{async executeScript({args}){deliveries++;assert.equal(args[0].score.fileName,'lesson.gp5');return [{result:{ok:true}}];}}};
  globalThis.fetch=async()=>{downloads++;return new Response('FICHIER GUITAR PRO v5.00 fixture');};
  const sender={id:'bridge',url:'chrome-extension://bridge/popup.html'};
  const job={target:'http://localhost:5500/index.html',title:'Lesson',page:'https://lesson.test/',score:{url:'https://lesson.test/score.gp5',fileName:'lesson.gp5'},timing:{points:[[0,1],[4,10]]},recording:null,keepRecording:false};
  const waitDone=async()=>{for(let i=0;i<50 && status.sendStatus?.pending;i++)await new Promise(r=>setTimeout(r,2));assert.equal(status.sendStatus?.pending,false);};
  const getStatus=()=>new Promise(resolve=>listener({type:'send-status'},sender,resolve));
  try {
    await import('../extensions/lesson-bridge/send-worker.js?first');
    assert.equal(listener({type:'send-lesson',job},{id:'other',url:sender.url},()=>{}),false);assert.equal(requests,0);
    assert.equal(listener({type:'send-lesson',job},sender,()=>{throw new Error('popup destroyed');}),true);
    assert.equal(requests,1,'permission starts synchronously before storage/other asynchronous work');
    assert.equal(downloads,0,'no download before approval');
    let duplicate;listener({type:'send-lesson',job},sender,r=>{duplicate=r;});assert.match(duplicate.message,/already/);assert.equal(requests,1);
    approve(true);await waitDone();
    assert.equal(deliveries,1);assert.equal(focused,1);assert.equal((await getStatus()).ok,true);
    assert(!JSON.stringify(status).includes('lesson.test'),'session storage contains status only, not lesson data');
    listener({type:'send-lesson',job},sender,()=>{});approve(false);await waitDone();
    assert.match((await getStatus()).message,/declined/);assert.equal(deliveries,1);assert.equal(downloads,1);
    matches=[];listener({type:'send-lesson',job},sender,()=>{});approve(true);await waitDone();
    assert.match((await getStatus()).message,/Open Guitar Trainer/);assert.equal(downloads,1);
    matches=[{id:7,url:job.target},{id:8,url:job.target}];listener({type:'send-lesson',job},sender,()=>{});approve(true);await waitDone();
    assert.match((await getStatus()).message,/More than one/);assert.equal(deliveries,1);
    status={sendStatus:{pending:true,message:'Sending'}};
    await import('../extensions/lesson-bridge/send-worker.js?restart');
    assert.match((await getStatus()).message,/interrupted/);assert.equal(deliveries,1,'worker restart never replays a send');
  } finally {globalThis.chrome=oldChrome;globalThis.fetch=oldFetch;}
});
