import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {selectedVisits} from '../../js/audio-sync-score.js';
import {recoverPinnedPhrases} from '../../js/audio-sync-pinned-phrases.js';
import {pinnedExperiments} from './pinned-gap-variants.mjs';

const baseline=path.resolve(process.argv[2]??'tests/.media-fixtures/bridge-baseline');
const cache=path.resolve(process.argv[3]??'tests/.media-fixtures/gap-benchmark');
const read=file=>JSON.parse(fs.readFileSync(path.join(baseline,file)));
const results=[];
const variants=['allPins','pace','pitch','corroborated','refined','phrase','clock'];
const valid=v=>Number.isFinite(v.startSeconds)&&Number.isFinite(v.endSeconds)&&v.endSeconds>v.startSeconds;
const close=(v,g)=>v&&g&&Math.abs(v.startSeconds-g.startSeconds)<=0.25&&Math.abs(v.endSeconds-g.endSeconds)<=0.25;
const overlap=(a,b)=>Math.max(0,Math.min(a.endSeconds,b.endSeconds)-Math.max(a.startSeconds,b.startSeconds));

for(const file of fs.readdirSync(baseline).filter(f=>f.endsWith('.ready.json'))){
  const key=file.split('.')[0],o=read(key+'-updated.json');
  const original=o.choices.some(c=>c>=0)?selectedVisits(o.track.visits,o.matches,o.choices):[];
  const pins=Array(o.choices.length).fill(null);
  for(const v of original)pins[v.originalVisit-1]=v;
  const featuresFile=path.join(cache,key+'.f32');
  const needsAudio=original.some((v,i)=>i>0&&v.originalVisit>original[i-1].originalVisit+1);
  let features=new Float32Array();
  if(needsAudio){
    const bytes=fs.readFileSync(featuresFile);
    features=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
    assert.equal(features.length%12,0);
    assert.ok(Math.abs(features.length/12*0.04-o.duration)<0.39, key);
  }
  const additions=pinnedExperiments(o.queries.score,pins,features);
  // Check the actual worker stage against the independently evaluated variant.
  const newChoices=o.choices.slice(), newMatches=o.matches.slice();
  recoverPinnedPhrases(o.queries.score,features,newMatches,newChoices);
  const integrated=[];
  newChoices.forEach((c,i)=>{
    if(c===o.choices[i])return;
    assert.equal(o.choices[i],-1);
    const t=newMatches[i][c];
    integrated.push({originalVisit:i+1,startSeconds:t.start,endSeconds:t.end});
  });
  assert.deepEqual(integrated,additions.clock,key);
  for(const name of variants){
    const choices=o.choices.slice(), matches=o.matches.slice();
    for(const a of additions[name]){
      const i=a.originalVisit-1;assert.equal(choices[i],-1);
      choices[i]=matches[i].length;
      matches[i]=[...matches[i],{start:a.startSeconds,end:a.endSeconds}];
    }
    const normalized=choices.some(c=>c>=0)?selectedVisits(o.track.visits,matches,choices):[];
    const byVisit=new Map(normalized.map(v=>[v.originalVisit,v]));
    for(const v of original)assert.deepEqual({...byVisit.get(v.originalVisit),visit:v.visit},v);
    for(const a of additions[name]){const v=byVisit.get(a.originalVisit);assert.equal(v.startSeconds,a.startSeconds);assert.equal(v.endSeconds,a.endSeconds);}
  }
  results.push({key,original,additions,duration:o.duration});
}
// Look at reference plans only after finishing proposals for every recording.
const refs=new Map(read('full.json').map(r=>[r.key,r]));
const rows=[];
for(const {key,original,additions,duration} of results){
  const ref=refs.get(key), gold=ref.visits.filter(valid);
  const rated=new Map(gold.map(v=>[v.originalVisit,v])), old=new Map(original.map(v=>[v.originalVisit,v]));
  const targets=[];
  for(let i=0;i<gold.length;){
    if(old.has(gold[i].originalVisit)){i++;continue;}
    let j=i+1;while(j<gold.length&&!old.has(gold[j].originalVisit))j++;
    if(i>0&&j<gold.length&&close(old.get(gold[i-1].originalVisit),gold[i-1])&&close(old.get(gold[j].originalVisit),gold[j])&&
      gold.slice(i,j+1).every((v,k)=>v.originalVisit===gold[i+k-1].originalVisit+1&&Math.abs(v.startSeconds-gold[i+k-1].endSeconds)<0.08)){
      targets.push(gold.slice(i,j).map(v=>v.originalVisit));
    }
    i=j;
  }
  const breaks=[];
  for(const g of ref.gaps.filter(g=>valid(g)&&(g.kind==='explanation'||(!g.kind&&/intro|break/i.test(g.label)))).sort((a,b)=>a.startSeconds-b.startSeconds)){
    const prev=breaks.at(-1);
    if(prev&&prev.endSeconds>=g.startSeconds)prev.endSeconds=Math.max(prev.endSeconds,g.endSeconds);
    else breaks.push({...g});
  }
  const inside=visits=>visits.reduce((n,v)=>n+breaks.reduce((s,g)=>s+overlap(v,g),0),0);
  const row={id:ref.id,key,excluded:Math.abs(read(key+'.ready.json').duration-duration)>2,targets,
    count:gold.length,placed:gold.filter(g=>old.has(g.originalVisit)).length,accurate:gold.filter(g=>close(old.get(g.originalVisit),g)).length,
    bleed:inside(original),variants:{}};
  for(const name of variants){
    const added=additions[name],byVisit=new Map(added.map(v=>[v.originalVisit,v]));
    const details=added.map(v=>{
      const g=rated.get(v.originalVisit);
      const error=g?[v.startSeconds-g.startSeconds,v.endSeconds-g.endSeconds]:null;
      const mid=(v.startSeconds+v.endSeconds)/2;
      return {...v,error,accurate:!!close(v,g),bleed:inside([v]),offPass:!!g&&Math.abs(error[0])>2&&gold.some(w=>w.scoreMeasure===g.scoreMeasure&&w.originalVisit!==g.originalVisit&&w.startSeconds<=mid&&mid<w.endSeconds)};
    });
    row.variants[name]={added:details,runs:targets.map(run=>({run,placed:run.filter(i=>byVisit.has(i)).length,accurate:run.filter(i=>close(byVisit.get(i),rated.get(i))).length}))};
  }
  rows.push(row);
}
fs.writeFileSync(path.join(cache,'comparison.json'),JSON.stringify(rows));
const main=rows.filter(r=>!r.excluded);
const sum=(items,fn)=>items.reduce((n,x)=>n+fn(x),0);
assert.equal(rows.length,200);assert.equal(main.length,197);assert.equal(sum(main,r=>r.count),5235);
assert.equal(sum(main,r=>r.placed),3568);assert.equal(sum(main,r=>r.accurate),2249);
assert.equal(sum(main,r=>r.targets.length),65);assert.equal(sum(main,r=>r.targets.flat().length),159);
assert.equal(sum(main,r=>r.bleed).toFixed(2),'286.11');
for(const name of variants){
  const added=main.flatMap(r=>r.variants[name].added),runs=main.flatMap(r=>r.variants[name].runs);
  console.log(name,JSON.stringify({add:added.length,placed:added.filter(v=>v.error).length,good:added.filter(v=>v.accurate).length,wrong:added.filter(v=>v.error&&Math.abs(v.error[0])>2).length,offPass:added.filter(v=>v.offPass).length,break:sum(added,v=>v.bleed),targetPlaced:sum(runs,r=>r.placed),targetGood:sum(runs,r=>r.accurate),fullGood:runs.filter(r=>r.accurate===r.run.length).length}));
  for(const id of ['97031','97797','90720']){const r=main.find(r=>r.id===id).variants[name];console.log(id,r.runs.map(x=>[x.run[0],x.run.at(-1),x.accurate]),r.added.length,sum(r.added,v=>v.bleed));}
}
