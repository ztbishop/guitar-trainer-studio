import {recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';
import {orderedChoices} from './audio-sync-passages.js';

// Independent downbeats spread across a sparse draft can reveal a steady
// performance. A fitted tempo only narrows the search for pitch evidence.
function consensusClock(edges,selected) {
  const anchors=selected.flatMap((take,i)=>take ? [i] : []);
  if (anchors.length<6 || anchors.length>160 || anchors.length>selected.length*0.7) return;
  let best=null;
  for (const [index,left] of anchors.entries()) {
    for (let j=index+1;j<anchors.length;j++) {
      const right=anchors[j];
      if (right-left<selected.length/2) continue;
      const rate=(selected[right].start-selected[left].start)/(edges[right]-edges[left]);
      if (!(rate>=0.65 && rate<=1.5)) continue;
      const offset=selected[left].start-rate*edges[left];
      let count=0,error=0;
      for (const i of anchors) {
        const delta=Math.abs(selected[i].start-(offset+rate*edges[i]));
        if (delta<=0.20) {count++;error+=delta;}
      }
      if (count>=6 && count>=anchors.length*0.7 &&
          (!best || count>best.count || (count===best.count && error<best.error))) {
        best={rate,offset,count,error};
      }
    }
  }
  return best;
}

function pitchSupport(bar,samples,start,end) {
  const offset=bar.offset??0, duration=bar.span??bar.duration;
  const probes=bar.probes.filter(p=>p.time>=offset && p.time<offset+duration);
  if (!probes.length || !Number.isFinite(bar.register?.low) || !Number.isFinite(bar.register.high)) return false;
  const first=Math.max(0,Math.floor((start-0.12)*SAMPLE_RATE));
  const clip=samples.subarray(first,Math.ceil((end+0.12)*SAMPLE_RATE));
  if (bar.bendTarget!==undefined) {
    const features=recordingFeatures(clip,bar.register.low-3,bar.bendTarget+3);
    const base=bar.register.low%12, target=bar.bendTarget%12;
    let attack=false, held=0, frames=0;
    for (let t=0;t<end-start;t+=0.04) {
      const frame=Math.round((start-first/SAMPLE_RATE+t)/0.04)*12;
      const initial=features[frame+base], bent=features[frame+target];
      if (t<=Math.min(0.20,(end-start)/4) && initial>0.50 && initial>bent+0.20) attack=true;
      if (t>(end-start)/2) {
        frames++;
        if (bent>0.65 && bent>initial+0.20) held++;
      }
    }
    if (attack && frames && held/frames>=0.65) return true;
  }
  const features=recordingFeatures(clip,bar.register.low-1,bar.register.high+1);
  const agreement=new Float64Array(12);
  for (const probe of probes) {
    const time=start-first/SAMPLE_RATE+(probe.time-offset)*(end-start)/duration;
    const frame=Math.round(time/0.04)*12;
    for (let shift=0;shift<12;shift++) {
      for (const pitch of probe.pitches) agreement[shift]+=probe.weight*(features[frame+(pitch+shift)%12]||0);
    }
  }
  return agreement[0]>=probes.length*0.35 &&
    agreement[0]-Math.max(...agreement.subarray(1))>=probes.length*0.04;
}

// Phrase searches can locate the correct beat consistently just behind its
// attack. Test a small phase adjustment against attacks throughout the score.
function attackOffset(score,bars,samples,clock) {
  const onsets=[];
  for (const [i,bar] of bars.entries()) {
    const offset=bar.offset??0;
    for (const p of bar.probes) if (p.onset>=offset && p.onset<offset+(bar.span??bar.duration))
      onsets.push(clock.offset+(score.edges[i]+p.onset-offset)*clock.rate);
  }
  const hop=Math.round(SAMPLE_RATE*0.02), levels=new Map();
  function level(frame) {
    if (frame<0 || (frame+1)*hop>samples.length) return 0;
    if (!levels.has(frame)) {
      let energy=0;
      for (let k=frame*hop;k<(frame+1)*hop;k++) energy+=samples[k]**2;
      levels.set(frame,Math.log(0.0001+energy/hop));
    }
    return levels.get(frame);
  }
  const strengths=new Float64Array(17), stride=Math.max(1,Math.ceil(onsets.length/300));
  for (let i=0;i<onsets.length;i+=stride) {
    if (onsets[i]<0.24 || onsets[i]>samples.length/SAMPLE_RATE-0.24) continue;
    const center=Math.round(onsets[i]*SAMPLE_RATE/hop);
    for (let j=0;j<strengths.length;j++) {
      const frame=center+j-8;
      strengths[j]+=Math.min(2,Math.max(0,Math.max(level(frame),level(frame+1))-Math.min(level(frame-1),level(frame-2))));
    }
  }
  const peak=Math.max(...strengths),mean=strengths.reduce((a,b)=>a+b,0)/strengths.length;
  return peak>1.3*mean ? (strengths.indexOf(peak)-8)*hop/SAMPLE_RATE : 0;
}

export function recoverSteadyPassages(score,bars,samples,matches,choices) {
  const selected=choices.map((c,i)=>matches[i][c]), clock=consensusClock(score.edges,selected);
  if (!clock) return;
  const phase=attackOffset(score,bars,samples,clock);
  const times=score.edges.map(t=>clock.offset+clock.rate*t+phase);
  const anchors=selected.map((take,i)=>take && Math.abs(take.start-times[i])<=0.35);
  const verified=bars.map((bar,i)=>times[i]>=0 && times[i+1]>times[i] && times[i+1]-times[i]<=12 &&
    times[i+1]<=samples.length/SAMPLE_RATE &&
    pitchSupport(bar,samples,times[i],times[i+1]));
  const options=selected.map(take=>take ? [{...take,take}] : []);
  for (let first=0;first<bars.length;) {
    if (!verified[first]) {first++;continue;}
    let stop=first+1;
    while (verified[stop]) stop++;
    // A four-bar phrase can approach a pin across a few masked measures.
    // Only the individually supported bars in this run are proposed.
    const reach=stop-first>=4 ? 4 : 1;
    if (stop-first>=2 && anchors.slice(Math.max(0,first-reach),stop+reach).some(Boolean)) {
      for (let i=first;i<stop;i++) {
        if (anchors[i]) continue;
        const start=anchors[i-1] && Math.abs(selected[i-1].end-times[i])<=Math.min(0.35,(times[i+1]-times[i])/5)
          ? selected[i-1].end : times[i];
        const end=anchors[i+1] ? selected[i+1].start : times[i+1];
        if (end<=start) continue;
        const take={start,end,quality:0.8};
        options[i].push({...take,take,quality:2});
      }
    }
    first=stop;
  }
  if (!options.some((row,i)=>row.length>(selected[i]?1:0))) return;
  // Retain the globally corroborated pins when reconciling conflicting takes.
  for (let i=0;i<options.length;i++) if (anchors[i]) options[i][0].quality+=bars.length*3;
  const ordered=orderedChoices(options);
  for (const [i,c] of ordered.entries()) {
    const take=options[i][c]?.take;
    if (take===selected[i]) continue;
    if (!take) choices[i]=-1;
    else {choices[i]=matches[i].length;matches[i].push(take);}
  }
}
