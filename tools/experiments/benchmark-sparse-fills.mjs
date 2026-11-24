// Search the score's sounding events while preserving the time between events.
// Input features are 12 pitch classes per 40 ms in the practice track's register.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=path.resolve(process.argv[2]??'tests/.media-fixtures/bridge-baseline');
const read=file=>JSON.parse(fs.readFileSync(path.join(base,file)));

function search(score,features,duration) {
  const {notes,edges}=score;
  if(!notes.length)return {bars:[],peaks:[]};
  const bars=[];
  for(let i=0;i<edges.length-1;i++) {
    if(notes.some(n=>n.end>edges[i]&&n.start<edges[i+1]))bars.push(i);
  }
  const first=edges[bars[0]], span=edges[bars.at(-1)+1]-first;
  const candidates=[];
  for(let percent=70;percent<=140;percent++){
    const rate=percent/100;
    const probes=notes.map(n=>({frame:Math.round((n.start-first+0.55*(n.end-n.start))*rate/0.04),pitch:n.pitch}));
    for(let frame=0;frame*0.04+span*rate<=duration;frame++){
      let fit=0;
      for(const p of probes){
        const offset=(frame+p.frame)*12;
        fit+=features[offset+p.pitch]-(features[offset+(p.pitch+1)%12]+features[offset+(p.pitch+11)%12])/2;
      }
      candidates.push({start:frame*0.04,rate,fit:fit/probes.length});
    }
  }
  candidates.sort((a,b)=>b.fit-a.fit);
  const peaks=[];
  for(const candidate of candidates){
    if(peaks.every(p=>Math.abs(p.start-candidate.start)>1))peaks.push(candidate);
    if(peaks.length===3)break;
  }
  const best=peaks[0];
  // Challenge each four-bar prediction separately at the route's tempo.
  // A global fit can be carried entirely by music before a long explanation.
  const supported=new Set();
  if(best)for(let i=bars[0];i<=bars.at(-1);i+=4){
    const local=notes.filter(n=>n.start>=edges[i] && n.start<edges[Math.min(i+4,edges.length-1)]);
    if(!local.length)continue;
    const probes=local.map(n=>({frame:Math.round((n.start-edges[i]+0.55*(n.end-n.start))*best.rate/0.04),pitch:n.pitch}));
    function fit(frame){
      let value=0;
      for(const p of probes){
        const o=(frame+p.frame)*12;
        value+=features[o+p.pitch]-(features[o+(p.pitch+1)%12]+features[o+(p.pitch+11)%12])/2;
      }
      return value/probes.length;
    }
    const predicted=Math.round((best.start+(edges[i]-first)*best.rate)/0.04);
    let strongest=0;
    const limit=features.length/12-Math.max(...probes.map(p=>p.frame));
    for(let t=0;t<limit;t++)strongest=Math.max(strongest,fit(t));
    if(fit(predicted)>=Math.max(0.20,0.85*strongest))for(let j=i;j<i+4;j++)supported.add(j);
  }
  return {peaks,bars:!best?[]:bars.map(i=>({visit:i+1,start:best.start+(edges[i]-first)*best.rate,
    end:best.start+(edges[i+1]-first)*best.rate,supported:supported.has(i)}))};
}

const runs=[],inputs=[];
for(const file of fs.readdirSync(base).filter(f=>f.endsWith('.ready.json'))){
  const key=file.split('.')[0],u=read(key+'-updated.json');
  if(u.matches.some(row=>row.length))continue;
  const bytes=fs.readFileSync(path.join(base,key+'-sparse.f32'));
  const features=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
  assert.ok(Math.abs(features.length/12*0.04-u.duration)<0.35);
  inputs.push({key,score:u.queries.score,features,duration:u.duration});
  runs.push({key,...search(u.queries.score,features,u.duration)});
}
// Swap the development score onto every other no-candidate recording.
// These are challenge pairs, not annotated negatives: a fill could occur in another lesson.
const development=inputs.find(x=>x.key.startsWith('64197-'));
if(development)for(const audio of inputs.filter(x=>x!==development)){
  const bytes=fs.readFileSync(path.join(base,audio.key+'-fill1.f32'));
  const band=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
  const out=search(development.score,band,audio.duration);
  console.log('swapped',audio.key.split('-')[0],out.bars.filter(b=>b.supported).length,out.peaks[0]?.fit);
}
const refs=new Map(read('full.json').map(r=>[r.key,r]));
for(const {key,bars,peaks} of runs){
  const ref=refs.get(key),timed=ref.visits.filter(v=>v.endSeconds>v.startSeconds);
  const measures=bars.map(b=>{
    const g=timed.find(v=>v.originalVisit===b.visit);
    if(!g)return {visit:b.visit};
    return {visit:b.visit,supported:b.supported,startError:b.start-g.startSeconds,endError:b.end-g.endSeconds};
  });
  const rated=measures.filter(m=>Number.isFinite(m.startError));
  const good=rated.filter(m=>Math.max(Math.abs(m.startError),Math.abs(m.endError))<=0.25);
  const wrong=rated.filter(m=>Math.abs(m.startError)>2);
  const gaps=ref.gaps.filter(g=>g.kind==='explanation'||(!g.kind&&/break|intro/i.test(g.label)));
  const bleed=rows=>rows.reduce((s,b)=>s+gaps.reduce((n,g)=>n+Math.max(0,Math.min(b.end,g.endSeconds)-Math.max(b.start,g.startSeconds)),0),0);
  console.log(ref.id,JSON.stringify({start:peaks[0]?.start,rate:peaks[0]?.rate,fit:peaks[0]?.fit,
    margin:peaks.length>1?peaks[0].fit-peaks[1].fit:null,bars:bars.length,rated:rated.length,good:good.length,far:wrong.length,
    reference:timed.length,breakSeconds:bleed(bars),supported:rated.filter(m=>m.supported).length,
    supportedGood:good.filter(m=>m.supported).length,supportedFar:wrong.filter(m=>m.supported).length,
    supportedBreakSeconds:bleed(bars.filter(b=>b.supported)),maxError:rated.length?Math.max(...rated.map(m=>Math.max(Math.abs(m.startError),Math.abs(m.endError)))):null}));
}
