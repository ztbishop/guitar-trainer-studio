import {edgePins} from './audio-sync-continuous.js';
import {windowedSpectrum,SAMPLE_RATE} from './audio-sync-match.js';

// Find the individual plucks leading into a verified final chord. An export
// can put that chord inside a bar and append another bar without an attack.
const WINDOW=2048,HOP=220,STEP=HOP/SAMPLE_RATE;

function pitchLevels(samples,start,end,pitches) {
  const fft=windowedSpectrum(WINDOW),power=new Float64Array(WINDOW/2);
  const bins=pitches.map(m=>440*2**((m-69)/12)*WINDOW/SAMPLE_RATE);
  const levels=[],first=Math.floor(start/STEP);
  const amplitude=bin=>Math.sqrt(Math.max(power[Math.floor(bin)]||0,power[Math.ceil(bin)]||0))/WINDOW;
  for(let frame=first;frame<=Math.ceil(end/STEP)+6;frame++) {
    fft(samples,frame*HOP-WINDOW/2,power);
    levels.push(bins.map(bin=>[amplitude(bin),amplitude(2*bin)]));
  }
  return {first,levels};
}

// Match every attack in order. Flexible intervals allow the performer to
// hold a note before accelerating into the next part of the run.
function attackPath(groups,spectrum,pitches,chordTime,harmonic) {
  const {levels,first}=spectrum;
  let previous=[];
  for(let i=0;i<groups.length;i++) {
    const group=groups[i],last=i===groups.length-1,candidates=[];
    const keys=group.pitches.map(p=>pitches.indexOf(p));
    for(let j=3;j<levels.length-3;j++) {
      const seconds=(first+j)*STEP;
      if(last && Math.abs(seconds-chordTime)>0.10)continue;
      let rise=0;
      for(const key of keys) {
        const level=k=>levels[k][key][0]+harmonic*levels[k][key][1];
        const before=Math.min(level(j-2),level(j-1)),after=Math.max(level(j+1),level(j+2));
        rise+=Math.max(0,Math.log((after+.00016)/(before+.00016)))*Math.min(1,after/.003);
      }
      rise/=keys.length;
      if(rise<0.12 && !last)continue;
      let best=i?-Infinity:0,parent=null;
      if(i) {
        const written=group.time-groups[i-1].time;
        for(let n=previous.length-1;n>=0;n--) {
          const candidate=previous[n],elapsed=seconds-candidate.seconds;
          if(elapsed>Math.max(last?3:1.6,written*13))break;
          if(elapsed<Math.max(.055,written*.45))continue;
          const value=candidate.value-.24*Math.abs(Math.log(elapsed/(written*2)));
          if(value>best){best=value;parent=candidate;}
        }
      }
      if(Number.isFinite(best))candidates.push({seconds,rise,value:best+Math.min(3,rise),parent});
    }
    if(!candidates.length)return [];
    previous=candidates;
  }
  const path=[];
  for(let hit=previous.reduce((a,b)=>a.value>b.value?a:b);hit;hit=hit.parent)path.push(hit);
  return path.reverse();
}

export function recoverPaddedEnding(score,samples,features,matches,choices) {
  const {notes,edges}=score;
  const attack=notes.reduce((t,n)=>Math.max(t,n.start),-Infinity);
  const bar=edges.findLastIndex(t=>t<=attack);
  if(bar<2 || bar>=choices.length-1 || choices.slice(bar).some(c=>c>=0))return;
  const chord=notes.filter(n=>n.start===attack);
  if(new Set(chord.map(n=>n.pitch)).size<3 || edges[bar+1]-attack<.30 ||
      notes.some(n=>n.end>edges[bar+1]+.03))return;
  const pins=edgePins(score,samples,features,bar);
  const onset=pins.find(p=>p.score===attack),release=pins.find(p=>p.score===edges[bar+1]);
  if(!onset || !release)return;
  const selected=choices.map((c,i)=>matches[i][c]);
  const prior=selected.findLastIndex(t=>t && t.start<onset.time);
  if(prior<0 || bar-prior<2 || bar-prior>10 || selected[prior].end>=onset.time)return;
  const start=selected[prior].end;
  if(onset.time-start>30)return;
  // An earlier score bar starting during the independently observed final
  // chord cannot be this take. Keep it available as an alternate.
  const conflicts=selected.flatMap((t,i)=>i>prior && t?[i]:[]);
  if(conflicts.length>1 || conflicts.some(i=>selected[i].manual || selected[i].pinnedStart ||
      selected[i].pinnedEnd || edges[i+1]>attack || selected[i].end>release.time))return;
  const byTime=new Map();
  for(const n of notes)if(n.start>=edges[Math.max(prior+1,bar-3)] && n.start<=attack) {
    if(!Number.isInteger(n.midi))return;
    if(!byTime.has(n.start))byTime.set(n.start,new Set());
    byTime.get(n.start).add(n.midi);
  }
  const groups=[...byTime].sort(([a],[b])=>a-b).map(([time,set])=>({time,pitches:[...set]}));
  const short=groups.findIndex(g=>g.time>=edges[bar-1]);
  if(short<1 || groups.length-short<7 || groups.length>64)return;
  const tail=groups.slice(short);
  if(new Set(tail.filter(g=>g.pitches.length===1).map(g=>g.pitches[0])).size<4)return;
  const pitches=[...new Set(groups.flatMap(g=>g.pitches))];
  if(pitches.length<5)return;
  const spectrum=pitchLevels(samples,start,onset.time,pitches);
  const a=attackPath(groups,spectrum,pitches,onset.time,0).slice(short);
  const b=attackPath(tail,spectrum,pitches,onset.time,.5);
  if(!a.length || !b.length)return;
  const agreed=i=>Math.abs(a[i].seconds-b[i].seconds)<=.12 && Math.min(a[i].rise,b[i].rise)>=.45;
  const time=i=>(a[i].seconds+b[i].seconds)/2;
  const split=tail.findIndex(g=>g.time>=edges[bar]);
  if(split<=0 || split>=tail.length-1)return;
  const starts=[];
  for(const [lo,hi,index] of [[0,split,bar-1],[split,tail.length-1,bar]]) {
    // Only assign a downbeat when the score has an attack on that downbeat.
    if(Math.abs(tail[lo].time-edges[index])>.015 || !agreed(lo))return;
    let support=0;
    for(let i=lo;i<hi;i++)if(agreed(i))support++;
    if(support<Math.max(2,(hi-lo)*.60))return;
    starts.push(time(lo));
  }
  if(starts[0]<start || starts[1]<=starts[0] || starts[1]>=onset.time)return;
  for(const i of conflicts)choices[i]=-1;
  for(const [j,index] of [bar-1,bar].entries()) {
    const take={start:starts[j],end:j?release.time:starts[1],quality:.8,continuous:true};
    if(j && attack>edges[bar])take.interior=[{scoreTime:attack,seconds:onset.time}];
    choices[index]=matches[index].push(take)-1;
  }
}
