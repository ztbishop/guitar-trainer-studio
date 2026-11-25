import {recordingGrid,scoreGrid} from './audio-sync-passages.js';
import {recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';
import {strums} from './audio-sync-chord-sequence.js';

const FRAME=0.04, HOP=Math.round(FRAME*SAMPLE_RATE);

function pitchMass(features,frame,pitches) {
  let mass=0;
  for (const pitch of pitches) mass+=(features[frame*12+pitch]||0)**2;
  return mass;
}

// Use the score's opening attack and last sustained harmony only when the
// recording provides matching activity at that edge. Leave introductions,
// trailing silence and uncertain releases outside the mapped passage.
export function edgePins(score,samples,features,endingBar=score.edges.length-2) {
  const levels=new Float32Array(Math.floor(samples.length/HOP));
  let peak=0;
  for (let i=0;i<levels.length;i++) {
    let power=0;
    for (let j=i*HOP;j<(i+1)*HOP;j+=4) power+=samples[j]**2;
    levels[i]=Math.sqrt(power/Math.ceil(HOP/4));
    peak=Math.max(peak,levels[i]);
  }
  const threshold=Math.max(0.002,peak*0.012);
  const first=levels.findIndex(v=>v>=threshold),last=levels.findLastIndex(v=>v>=threshold);
  const pins=[];
  if (first<0 || last-first<5) return pins;
  const {edges,notes}=score;
  const chordAt=t=>[...new Set(notes.filter(n=>n.start<=t+0.001 && n.end>t+0.001).map(n=>n.pitch))];
  const opening=chordAt(edges[0]);
  if (opening.length && [1,2,3].every(k=>pitchMass(features,first+k,opening)>0.62))
    pins.push({score:edges[0],time:first*FRAME});
  const lastAttack=notes.reduce((max,n)=>Math.max(max,n.start),-Infinity);
  const final=chordAt(lastAttack), end=edges[endingBar+1];
  if (lastAttack<edges[endingBar] || !notes.some(n=>n.start===lastAttack && n.end>=end-0.03)) return pins;
  // A return of the harmony after a different phrase is a separate event.
  let frame=last;
  while (frame>=0 && last-frame<10 && pitchMass(features,frame,final)<0.72) frame--;
  const release=frame;
  while (frame>=0 && release-frame<250 && pitchMass(features,frame,final)>=0.72 &&
      levels[frame]>threshold*0.5) frame--;
  if (release-frame>=5 && release>=last-3 && release-frame<250 && levels[release]>0 &&
      last+2<levels.length && levels[last+1]<threshold) {
    const attack=frame+1;
    // Require a local attack, so a ringing tail alone cannot pin the downbeat.
    let rise=-1,best=0;
    for (let i=Math.max(first,attack-3);i<=release-4;i++) {
      const before=Math.max(0.001,levels[i-2]||0,levels[i-3]||0);
      const body=Math.min(levels[i+2],levels[i+3],levels[i+4]);
      if (levels[i]>1.25*before && body>2.1*before && body>3*levels[release] && body-before>best) {
        rise=i;best=body-before;
      }
    }
    if (rise>=0) pins.push({score:lastAttack,time:rise*FRAME},{score:end,time:(release+1)*FRAME});
  }
  return pins;
}

// Time warping between two observed pins. Horizontal steps let a sound ring.
// Bound the matrix independently of the length of the recording.
function align(notes,left,right,features,stride) {
  const span=right.score-left.score;
  const first=Math.floor(left.time/FRAME);
  const clip=features.subarray(first*12,Math.ceil(right.time/FRAME)*12);
  const audio=recordingGrid(clip,stride),cols=audio.length/12;
  const rows=Math.max(2,Math.round(span/(stride*FRAME)));
  if (cols<2 || rows*cols>1200000) return;
  const query=scoreGrid(notes,left.score,right.score,rows);
  const trace=new Uint8Array(rows*cols);
  let previous=new Float64Array(cols+1).fill(Infinity),current=previous.slice();
  previous[0]=0;
  for (let i=0;i<rows;i++) {
    current[0]=Infinity;
    for (let j=0;j<cols;j++) {
      let agreement=0;
      for (let p=0;p<12;p++) agreement+=query[i*12+p]*audio[j*12+p];
      const diagonal=previous[j],hold=current[j]+0.20,advance=previous[j+1]+0.20;
      const best=Math.min(diagonal,hold,advance);
      trace[i*cols+j]=best===diagonal?0:best===hold?1:2;
      current[j+1]=best+1-agreement;
    }
    [previous,current]=[current,previous];
  }
  const times=new Float64Array(rows);
  let i=rows-1,j=cols-1;
  while (i>=0 && j>=0) {
    times[i]=Math.min(right.time,Math.max(left.time,(first+(j+0.5)*stride)*FRAME));
    const move=trace[i*cols+j];
    if (move!==1) i--;
    if (move!==2) j--;
  }
  return t=>{
    if (t<=left.score) return left.time;
    if (t>=right.score) return right.time;
    const x=Math.max(0,Math.min(rows-1,(t-left.score)*rows/span-0.5));
    const k=Math.floor(x);
    return times[k]+(times[Math.ceil(x)]-times[k])*(x-k);
  };
}

function attacksFor(notes) {
  const groups=new Map();
  for (const n of notes) {
    if (!groups.has(n.start)) groups.set(n.start,new Set());
    groups.get(n.start).add(n.pitch);
  }
  return [...groups].sort(([a],[b])=>a-b);
}

function inspectBar(attacks,paths,features,start,end) {
  const anchors=[];
  let heard=0,contrast=0,early=false,late=false;
  for (const [j,[scoreTime,pitches]] of attacks.entries()) {
    const a=paths[0](scoreTime),b=paths[1](scoreTime);
    if (Math.abs(a-b)>0.28) continue;
    const seconds=(a+b)/2;
    const frame=Math.round(seconds/FRAME)+1;
    const mass=pitchMass(features,frame,pitches);
    if (mass<0.32) continue;
    heard++;
    if (j<attacks.length/2) early=true;
    if (j>=Math.floor(attacks.length/2)) late=true;
    const other=attacks[(j+1)%attacks.length][1];
    contrast+=mass-pitchMass(features,frame,other);
    if (seconds>start+0.10 && seconds<end-0.10) anchors.push({scoreTime,seconds});
  }
  return {anchors, supported:early && late && heard>=Math.max(2,attacks.length*0.55) && contrast/attacks.length>0.025};
}

// The bass can continue ringing under much quieter treble attacks. Compare
// the whole sounding harmony along the path as well as the individual plucks.
function soundingEvidence(notes,from,to,path,features) {
  const first=Math.round(path(from)/FRAME),last=Math.round(path(to)/FRAME);
  const masks=new Uint16Array(Math.max(0,last-first));
  for (const n of notes) {
    if (n.end<=from || n.start>=to) continue;
    const a=Math.round(path(Math.max(from,n.start))/FRAME)-first;
    const b=Math.round(path(Math.min(to,n.end))/FRAME)-first;
    for (let k=a;k<b;k++) masks[k]|=1<<n.pitch;
  }
  const energy=new Float64Array(12),written=new Uint32Array(12);
  let frames=0,agreement=0,weak=0,missed=false;
  for (let i=0;i<masks.length;i++) {
    if (!masks[i]) {weak=0;continue;}
    frames++;
    let mass=0;
    for (let p=0;p<12;p++) {
      const strength=(features[(first+i)*12+p]||0)**2;
      energy[p]+=strength;
      if (masks[i] & (1<<p)) {written[p]++;mass+=strength;}
    }
    weak=mass<0.20?weak+1:0;
    if (weak*FRAME>=0.48) missed=true;
    agreement+=mass;
  }
  if (!frames) return {missed:true,changing:false};
  const background=written.reduce((sum,count,p)=>sum+count*energy[p],0)/frames;
  return {missed,mass:agreement/frames,changing:agreement/frames>=0.70 && (agreement-background)/frames>=0.06};
}

// A repeated chord has little pitch contrast. Verify the rhythm with
// separate recorded attacks so one long ring cannot impersonate them.
function repeatedStrums(attacks,path,samples,start,end) {
  if (attacks.length<3 || attacks.length>16) return false;
  const hits=strums(samples,Math.max(0,start-0.12),end,1.4);
  let next=0,count=0;
  for (const [time] of attacks) {
    const expected=path(time);
    while (next<hits.length && hits[next].frame*FRAME<expected-0.12) next++;
    if (next<hits.length && hits[next].frame*FRAME<=expected+0.12) {next++;count++;}
  }
  return count>=Math.max(3,attacks.length*0.65);
}

export function continuousPerformance(score,samples,features,matches,choices,bars=[]) {
  if (!score.notes.length) return;
  const {edges,notes}=score,selected=choices.map((c,i)=>matches[i][c]);
  const measures=selected.map(()=>[]);
  let index=0;
  const ordered=[...notes].sort((a,b)=>a.start-b.start);
  for (const note of ordered) {
    while (index+1<measures.length && note.start>=edges[index+1]-0.00001) index++;
    measures[index].push(note);
  }
  const landmarks=edgePins(score,samples,features);
  const pins=[];
  for (let i=1;i<selected.length;i++) {
    const left=selected[i-1],right=selected[i];
    if (left && right && Math.abs(left.end-right.start)<=0.32)
      pins.push({score:edges[i],time:right.start});
  }
  for (const pin of landmarks) {
    if (pins.every(p=>(p.score-pin.score)*(p.time-pin.time)>0)) pins.push(pin);
  }
  pins.sort((a,b)=>a.score-b.score);
  if (pins.length<2) return;
  const registers=bars.map(b=>b.register).filter(r=>Number.isFinite(r?.low) && Number.isFinite(r.high));
  const band=registers.length?recordingFeatures(samples,Math.min(...registers.map(r=>r.low))-2,
    Math.max(...registers.map(r=>r.high))+2):features;
  const proposals=new Map();
  let noteIndex=0,barIndex=0,active=[],budget=12000000;
  for (let p=1;p<pins.length;p++) {
    const left=pins[p-1],right=pins[p],span=right.score-left.score,seconds=right.time-left.time;
    if (span<=0 || seconds<0.16 || span>90 || seconds>120 || seconds/span<0.33 || seconds/span>7) continue;
    const stride=Math.max(1,Math.ceil(Math.sqrt(span*seconds/1000000)/FRAME));
    const cells=Math.ceil(span*seconds/(stride*FRAME)**2)*2;
    if (cells>budget) continue;
    budget-=cells;
    active=active.filter(n=>n.end>left.score);
    while (noteIndex<ordered.length && ordered[noteIndex].start<right.score) {
      const note=ordered[noteIndex++];
      if (note.end>left.score) active.push(note);
    }
    if (!active.length) continue;
    const paths=[align(active,left,right,features,stride),align(active,left,right,band,stride+1)];
    if (paths.some(path=>!path)) continue;
    while (barIndex<selected.length && edges[barIndex]<left.score-0.00001) barIndex++;
    for (let i=barIndex;i<selected.length && edges[i]<right.score;i++) {
      const limit=Math.min(edges[i+1],right.score);
      let start=paths[0](edges[i]),end=paths[0](limit);
      if (Math.abs(start-paths[1](edges[i]))>0.22 || Math.abs(end-paths[1](limit))>0.22 || end-start<0.20) continue;
      const attacks=attacksFor(measures[i].filter(n=>n.start<limit));
      if (!attacks.length) continue;
      const check=inspectBar(attacks,paths,features,start,end);
      const sounding=soundingEvidence(active,edges[i],limit,paths[0],band);
      // A single final held chord has no changing pitches for contrast.
      const finalChord=landmarks.length>=2 && landmarks.at(-2).score===edges[i] &&
        landmarks.at(-1).score===edges[i+1] && pins.includes(landmarks.at(-1)) && pins.includes(landmarks.at(-2));
      if (!finalChord && sounding.missed) continue;
      const rhythmic=sounding.mass>=0.78 && repeatedStrums(attacks,paths[0],samples,start,end);
      const reviewOnly=!finalChord && !(check.supported || sounding.changing && check.anchors.length>=2 || rhythmic);
      if (reviewOnly && (selected[i] || check.anchors.length<2)) continue;
      if (limit<edges[i+1]) {
        // The last attack may be inside the final bar. The same observed
        // release supplies its end and the attack itself is an interior pin.
        if (right!==landmarks.at(-2) || pins[p+1]!==landmarks.at(-1) || edges[i+1]!==pins[p+1].score) continue;
        check.anchors.push({scoreTime:right.score,seconds:right.time});
        end=pins[p+1].time;
      }
      const old=selected[i];
      if (old) {
        // Preserve selected downbeats. Extend a short unscored tail only
        // when the next downbeat and the last written attacks support it.
        if (Math.abs(old.start-start)<=0.35) start=old.start;
        else if (!(selected[i-1] && Math.abs(selected[i-1].end-start)<0.55 &&
            old.start>start && old.start<end && Math.abs(old.end-end)<=0.50 && check.supported)) continue;
        if (old.end>=end || end-old.end>0.50) end=old.end;
      }
      proposals.set(i,{start,end,continuous:true,reviewOnly,quality:old?.quality??0.75,interior:check.anchors});
    }
  }
  let previous=null;
  const following=new Array(selected.length);
  for (let i=selected.length-2;i>=0;i--) following[i]=selected[i+1]??following[i+1];
  for (let i=0;i<selected.length;i++) {
    if (i) previous=matches[i-1][choices[i-1]]??previous;
    const take=proposals.get(i),next=following[i];
    if (!take) continue;
    if (previous && take.start<previous.end) {
      if (previous.end-take.start>0.35) continue;
      take.start=previous.end;
    }
    if (next && take.end>next.start) {
      if (take.end-next.start>0.35) continue;
      take.end=next.start;
    }
    if (!selected[i] && selected[i+1] && selected[i+1].start-take.end<=0.35)
      take.end=selected[i+1].start;
    if (take.end<=take.start) continue;
    // Keep the two most useful nonlinear attack anchors per measure. Together
    // with its endpoints this fits the draft format even on a 4096-visit score.
    const span=edges[i+1]-edges[i];
    const deviation=a=>Math.abs(a.seconds-(take.start+(a.scoreTime-edges[i])/span*(take.end-take.start)));
    take.interior=take.interior.filter(a=>a.seconds>take.start+0.05 && a.seconds<take.end-0.05 &&
      a.scoreTime>edges[i] && deviation(a)>0.09).sort((a,b)=>deviation(b)-deviation(a)).slice(0,2)
      .sort((a,b)=>a.scoreTime-b.scoreTime);
    if (take.interior.length===2 && take.interior[1].seconds<=take.interior[0].seconds+0.04) take.interior.pop();
    if (selected[i] && !take.interior.length && take.start===selected[i].start && take.end===selected[i].end) continue;
    const option=matches[i].push(take)-1;
    if (!take.reviewOnly) choices[i]=option;
  }
}
