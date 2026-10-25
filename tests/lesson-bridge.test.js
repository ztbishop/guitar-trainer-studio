import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyResource,discoverResources,displayUrl,displayLabel,readSyncPoints} from '../extensions/lesson-bridge/discovery.js';

test('lesson discovery identifies the real TrueFire redirect file type and excludes unrelated files',()=>{
  const encoded=Buffer.from('https://cdn.example/lesson.gp5').toString('base64');
  const result=discoverResources([
    {url:`https://truefire.com/api/eq/redirect/${encoded}?auth_token=secret`,label:'Download GPX'},
    {url:'/chart.pdf'}, {url:'javascript:alert(1)',label:'Guitar Pro'}, {url:'https://user:secret@example.com/score.gpx'},
    {url:'/music.musicxml'}, {url:'/clip.m3u8'}, {url:'/lesson_sync.json'}, {url:'/music.musicxml'}
  ],'https://truefire.com/lesson');
  assert.deepEqual(result.map(r=>[r.kind,r.detail]),[
    ['Score','GP5'],['Score','MUSICXML'],['Recording','Streaming playlist; playback support unverified'],['Timing','Timing JSON candidate']
  ]);
  assert(!displayUrl(result[0].url).includes('secret'));
  assert(!displayUrl(result[0].url).includes(encoded));
  assert(!displayLabel('Download https://cdn.example/score.gp5?auth_token=secret').includes('secret'));
  assert.equal(classifyResource({url:'blob:https://example.com/id',origin:'video'}),null);
  assert.equal(classifyResource({url:'https://cdn.example/play?id=1',label:'video_url',origin:'TrueFire manifest'}).kind,'Recording');
});

test('Soundslice timing preview handles real discovery points, inner-bar positions and terminal bars',()=>{
  assert.deepEqual(readSyncPoints([[0,10.410579],[63,147.833399],[64,149.9865480000009]]).map(p=>p.bar),[0,63,64]);
  assert.deepEqual(readSyncPoints([[0,0],[0,1,240,1],[0,2,480],[1,3]])[1],{bar:0,seconds:1,position:240,hide:1});
  for(const input of [[],{},[[1,0],[2,1]],[[0,0],[0,1]],[[0,1],[1,0]],[[0,0],[1,1,481]],[[0,0],[1,1,0,2]],[[0,0],[1,Infinity]],[[0,0],[1,1,'240']]])
    assert.throws(()=>readSyncPoints(input));
});

test('discovery stays bounded and extension has no persistent observer, receiver or mandatory site grant',()=>{
  assert.equal(discoverResources(Array.from({length:400},(_,i)=>({url:`https://example.com/${i}.gp5`})),'https://example.com').length,150);
  const manifest=JSON.parse(readFileSync(new URL('../extensions/lesson-bridge/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(manifest.permissions,['activeTab','scripting']);
  assert(!manifest.background && !manifest.content_scripts && !manifest.externally_connectable && !manifest.host_permissions);
});
