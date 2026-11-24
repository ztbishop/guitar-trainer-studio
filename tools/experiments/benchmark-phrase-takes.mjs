// Offline comparison on cached worker output. References enter only after selection.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {selectedVisits} from '../../js/audio-sync-score.js';
import {recoverPinnedPhrases} from '../../js/audio-sync-pinned-phrases.js';
import {selectPhraseTakes} from '../../js/audio-sync-phrase-takes.js';

const base = path.resolve(process.argv[2] ?? 'tests/.media-fixtures/bridge-baseline');
const cache = path.resolve(process.argv[3] ?? 'tests/.media-fixtures/gap-benchmark');
const read = file => JSON.parse(fs.readFileSync(path.join(base,file)));
const distance = (a,b) => Math.max(Math.abs(a.start-b.start),Math.abs(a.end-b.end));
const selected = (u,choices) => choices.some(c=>c>=0) ? selectedVisits(u.track.visits,u.matches,choices) : [];

// Project a take's pace across the written phrase, counting consecutive neighbors
// with independently retrieved candidates that fit on the same recording clock.
function rerank(u,radius,margin) {
  const {matches,choices,queries:{score:{edges}}} = u;
  const next = choices.slice();
  for (let i=0;i<matches.length;i++) {
    const span = edges[i+1]-edges[i];
    if (span<=0) continue;
    const ranked = matches[i].map((take,j)=>{
      const rate = (take.end-take.start)/span;
      const project = t=>take.start+(t-edges[i])*rate;
      let support=0;
      for (const direction of [-1,1]) {
        for (let k=1;k<=radius;k++) {
          const index=i+direction*k;
          const expected={start:project(edges[index]),end:project(edges[index+1])};
          if (!matches[index]?.some(t=>!t.reviewOnly && distance(t,expected)<=0.25+0.12*k)) break;
          support++;
        }
      }
      return {take,j,support};
    }).filter(x=>!x.take.reviewOnly).sort((a,b)=>b.support-a.support || b.take.quality-a.take.quality);
    const best=ranked[0], old=matches[i][choices[i]];
    if (!best || best.support<radius || (old && distance(best.take,old)<0.5)) continue;
    const rival=ranked.find(x=>distance(x.take,best.take)>=0.5);
    if (best.support-(rival?.support??0)<margin) continue;
    // Keep every other selected visit in recording order, including previous edits.
    const before=next.findLastIndex((c,j)=>j<i && c>=0);
    const after=next.findIndex((c,j)=>j>i && c>=0);
    if ((before>=0 && matches[before][next[before]].end>best.take.start) ||
        (after>=0 && matches[after][next[after]].start<best.take.end)) continue;
    next[i]=best.j;
  }
  return selected(u,next);
}

const captures=[];
for (const file of fs.readdirSync(base).filter(f=>f.endsWith('.ready.json'))) {
  const key=file.split('.')[0], u=read(key+'-updated.json');
  const feature=path.join(cache,key+'.f32');
  const b=fs.existsSync(feature)?fs.readFileSync(feature):Buffer.alloc(0);
  recoverPinnedPhrases(u.queries.score,new Float32Array(b.buffer,b.byteOffset,b.length/4),u.matches,u.choices);
  const live=u.choices.slice();
  selectPhraseTakes(u.queries.score.edges,u.matches,live);
  assert.deepEqual(selected(u,live),rerank(u,3,2),key);
  captures.push({key,excluded:Math.abs(read(file).duration-u.duration)>2,old:selected(u,u.choices),
    five:rerank(u,2,1),seven:rerank(u,3,1),sevenStrict:rerank(u,3,2)});
}
const refs=new Map(read('full.json').map(r=>[r.key,r]));
for(const file of fs.readdirSync(base).filter(f=>/^control-.*-updated\.json$/.test(f))){
  const u=read(file),before=selected(u,u.choices);
  console.log(file,'identical at five, seven and strict seven',
    [[2,1],[3,1],[3,2]].map(([radius,margin])=>JSON.stringify(before)===JSON.stringify(rerank(u,radius,margin))));
}
const close=(v,g)=>g && Math.abs(v.startSeconds-g.startSeconds)<=0.25 && Math.abs(v.endSeconds-g.endSeconds)<=0.25;
const summaries={};
for (const name of ['five','seven','sevenStrict']) {
  const total={pages:0,timed:0,placedBefore:0,accurateBefore:0,gained:0,lost:0,added:0,changed:0,unrated:0,
    newlyFar:0,newWrongPass:0,newBreakSeconds:0,worsePages:0,excludedChanges:0};
  const details=[];
  for (const row of captures) {
    const r=refs.get(row.key),gold=r.visits.filter(v=>v.endSeconds>v.startSeconds);
    const old=new Map(row.old.map(v=>[v.originalVisit,v]));
    const gaps=[];
    for (const g of r.gaps.filter(g=>g.kind==='explanation'||(!g.kind&&/intro|break/i.test(g.label))).sort((a,b)=>a.startSeconds-b.startSeconds)) {
      const prev=gaps.at(-1);
      if(prev && prev.endSeconds>=g.startSeconds) prev.endSeconds=Math.max(prev.endSeconds,g.endSeconds);
      else gaps.push({...g});
    }
    const overlap=v=>!v?0:gaps.reduce((s,g)=>s+Math.max(0,Math.min(g.endSeconds,v.endSeconds)-Math.max(g.startSeconds,v.startSeconds)),0);
    const wrong=(v,g)=>v && Math.abs(v.startSeconds-g.startSeconds)>2 && gold.some(w=>w.originalVisit!==g.originalVisit &&
      w.scoreMeasure===g.scoreMeasure && (v.startSeconds+v.endSeconds)/2>=w.startSeconds && (v.startSeconds+v.endSeconds)/2<w.endSeconds);
    let gains=0,losses=0,changes=0;
    const errors=[];
    if (!row.excluded) {
      total.pages++;total.timed+=gold.length;
      total.placedBefore+=gold.filter(g=>old.has(g.originalVisit)).length;
      total.accurateBefore+=gold.filter(g=>old.has(g.originalVisit)&&close(old.get(g.originalVisit),g)).length;
    }
    for(const v of row[name]) {
      const prev=old.get(v.originalVisit),g=gold.find(w=>w.originalVisit===v.originalVisit);
      if(prev && prev.startSeconds===v.startSeconds && prev.endSeconds===v.endSeconds) continue;
      changes++;
      if(row.excluded){total.excludedChanges++;continue;}
      total.changed++;total.newBreakSeconds+=Math.max(0,overlap(v)-overlap(prev));
      if(!g){total.unrated++;continue;}
      const error=v=>v?Math.max(Math.abs(v.startSeconds-g.startSeconds),Math.abs(v.endSeconds-g.endSeconds)):null;
      errors.push({visit:v.originalVisit,previous:error(prev),current:error(v)});
      if(!prev)total.added++;
      if(close(v,g)&&!(prev&&close(prev,g)))gains++;
      if(!close(v,g)&&prev&&close(prev,g))losses++;
      if(Math.abs(v.startSeconds-g.startSeconds)>2 && (!prev||Math.abs(prev.startSeconds-g.startSeconds)<=2))total.newlyFar++;
      if(wrong(v,g)&&!wrong(prev,g))total.newWrongPass++;
    }
    if(losses>gains)total.worsePages++;
    total.gained+=gains;total.lost+=losses;
    if(changes) details.push({id:r.id,changes,gains,losses,errors});
  }
  assert.equal(captures.length,200);assert.equal(total.pages,197);assert.equal(total.timed,5235);
  assert.equal(total.placedBefore,3662);assert.equal(total.accurateBefore,2340);
  summaries[name]={total,details};
  console.log(name,total);
}
fs.writeFileSync(path.join(cache,'phrase-take-comparison.json'),JSON.stringify(summaries));
