import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {selectedVisits} from '../../js/audio-sync-score.js';
import {recoverPinnedPhrases} from '../../js/audio-sync-pinned-phrases.js';
import {partialGapProposals} from './partial-gap-proposals.mjs';

const base=path.resolve(process.argv[2]??'tests/.media-fixtures/bridge-baseline');
const cache=path.resolve(process.argv[3]??'tests/.media-fixtures/gap-benchmark');
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file)));
const variants=['pitch','stable','confirmed','agreement','distinct'];
const trials=[];
const visits=(measures,matches,choices)=>choices.some(c=>c>=0)?selectedVisits(measures,matches,choices):[];
for(const file of fs.readdirSync(base).filter(f=>f.endsWith('.ready.json'))){
  const key=file.split('.')[0], o=read(base,key+'-updated.json');
  const {score}=o.queries;
  const bytes=fs.existsSync(path.join(cache,key+'.f32'))?fs.readFileSync(path.join(cache,key+'.f32')):Buffer.alloc(0);
  const features=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
  const choices=o.choices.slice(),matches=o.matches.slice();
  recoverPinnedPhrases(score,features,matches,choices);
  const before=visits(o.track.visits,matches,choices);
  const pins=Array(choices.length).fill(null);
  before.forEach(v=>pins[v.originalVisit-1]=v);
  assert.ok(features.length || !before.some((v,i)=>i>0&&v.originalVisit>before[i-1].originalVisit+1));
  const proposals={};
  for(const rule of variants){
    const candidates=matches.slice(), selected=choices.slice();
    for(const p of partialGapProposals(score,features,matches,pins,rule)){
      assert.equal(selected[p.index],-1);
      selected[p.index]=candidates[p.index].length;
      candidates[p.index]=[...candidates[p.index],p];
    }
    const after=visits(o.track.visits,candidates,selected);
    for(const v of after){
      const old=pins[v.originalVisit-1];
      if(old)assert.deepEqual({...v,visit:old.visit},old,key);
    }
    proposals[rule]=after.filter(v=>!pins[v.originalVisit-1]).map(v=>{
      const i=v.originalVisit-1, from=score.edges[i],to=score.edges[i+1];
      const attacks=[...new Set(score.notes.filter(n=>n.start>=from && n.start<to).map(n=>n.start))];
      return {...v,attacks:attacks.map(t=>v.startSeconds+(t-from)/(to-from)*(v.endSeconds-v.startSeconds))};
    });
  }
  trials.push({key,before,proposals});
}

// The matcher above receives no published times or retrospective gap labels.
const refs=new Map(read(base,'full.json').map(r=>[r.key,r]));
const baseline=new Map(read(cache,'comparison.json').map(r=>[r.key,r]));
const rows=[];
const overlaps=(a,b)=>Math.max(0,Math.min(a.endSeconds,b.endSeconds)-Math.max(a.startSeconds,b.startSeconds));
for(const trial of trials){
  const ref=refs.get(trial.key),previous=baseline.get(trial.key);
  const timed=ref.visits.filter(v=>Number.isFinite(v.startSeconds)&&Number.isFinite(v.endSeconds)&&v.endSeconds>v.startSeconds);
  const gold=new Map(timed.map(v=>[v.originalVisit,v]));
  const gaps=[];
  for(const g of ref.gaps.filter(g=>Number.isFinite(g.startSeconds)&&Number.isFinite(g.endSeconds)&&g.endSeconds>g.startSeconds&&(g.kind==='explanation'||(!g.kind&&/intro|break/i.test(g.label)))).sort((a,b)=>a.startSeconds-b.startSeconds)){
    if(gaps.length&&g.startSeconds<=gaps.at(-1).endSeconds)gaps.at(-1).endSeconds=Math.max(gaps.at(-1).endSeconds,g.endSeconds);
    else gaps.push({...g});
  }
  const targets=previous.variants.clock.runs.filter(r=>r.placed===0).map(r=>r.run);
  const out={id:ref.id,excluded:previous.excluded,targets,variants:{}};
  for(const rule of variants){
    out.variants[rule]=trial.proposals[rule].map(v=>{
      const g=gold.get(v.originalVisit);
      const error=g?[v.startSeconds-g.startSeconds,v.endSeconds-g.endSeconds]:null;
      const midpoint=(v.startSeconds+v.endSeconds)/2;
      const left=trial.before.findLast(p=>p.originalVisit<v.originalVisit);
      const right=trial.before.find(p=>p.originalVisit>v.originalVisit);
      const sourceGap={startSeconds:left.endSeconds,endSeconds:right.startSeconds};
      return {visit:v.originalVisit,measure:v.scoreMeasure,pass:v.occurrence,error,
        good:error?.every(x=>Math.abs(x)<=0.25)??false,wrongPass:!!g&&Math.abs(error[0])>2&&timed.some(w=>w.scoreMeasure===g.scoreMeasure&&w.occurrence!==g.occurrence&&midpoint>=w.startSeconds&&midpoint<w.endSeconds),
        breakSeconds:gaps.reduce((n,gap)=>n+overlaps(v,gap),0),
        breakAttacks:v.attacks.filter(t=>gaps.some(gap=>t>=gap.startSeconds&&t<gap.endSeconds)).length,
        nearBreak:gaps.some(gap=>overlaps(gap,sourceGap)>0.5),
        target:targets.some(run=>run.includes(v.originalVisit))};
    });
  }
  rows.push(out);
}
const main=rows.filter(r=>!r.excluded);
assert.equal(rows.length,200);assert.equal(main.length,197);
assert.equal(main.flatMap(r=>r.targets).length,44);
assert.equal(main.flatMap(r=>r.targets.flat()).length,81);
fs.writeFileSync(path.join(cache,'partial-results.json'),JSON.stringify(rows));
for(const rule of variants){
  const all=main.flatMap(r=>r.variants[rule]);
  console.log(rule,JSON.stringify({added:all.length,known:all.filter(v=>v.error).length,good:all.filter(v=>v.good).length,
    target:all.filter(v=>v.target).length,targetGood:all.filter(v=>v.target&&v.good).length,wrong:all.filter(v=>v.error&&Math.abs(v.error[0])>2).length,wrongPass:all.filter(v=>v.wrongPass).length,
    mixedGood:all.filter(v=>v.good&&v.nearBreak).length,breakSeconds:all.reduce((s,v)=>s+v.breakSeconds,0),breakAttacks:all.reduce((s,v)=>s+v.breakAttacks,0)}));
}
