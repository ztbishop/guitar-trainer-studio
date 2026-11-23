import {recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';

function timedPitchQuality(bar,features,start,length){
  const shifted=new Float64Array(12);
  let early=0,late=0,earlyCount=0,lateCount=0;
  const pitchMeans=new Float64Array(12);
  let firstAgreement=0,lastAgreement=0;
  for(const probe of bar.probes){
    const frame=Math.round((start+probe.time/bar.duration*length)/0.04)*12;
    for(let p=0;p<12;p++)pitchMeans[p]+=features[frame+p]||0;
    for(let shift=0;shift<12;shift++)
      for(const pitch of probe.pitches)shifted[shift]+=probe.weight*(features[frame+(pitch+shift)%12]||0);
    const agreement=probe.pitches.reduce((sum,p)=>sum+(features[frame+p]||0),0)*probe.weight;
    if(probe===bar.probes[0])firstAgreement=agreement;
    lastAgreement=agreement;
    if(probe.time<bar.duration/2){early+=agreement;earlyCount++;}
    else {late+=agreement;lateCount++;}
  }
  if(!earlyCount || !lateCount || early/earlyCount<0.38 || late/lateCount<0.38 ||
     firstAgreement<0.30 || lastAgreement<0.30)return null;
  const n=bar.probes.length, mean=shifted[0]/n;
  const contrast=(shifted[0]-Math.max(...shifted.subarray(1)))/n;
  // A sustained chord containing the expected pitches has no rhythmic evidence.
  const background=bar.probes.reduce((sum,probe)=>sum+probe.weight*
    probe.pitches.reduce((s,p)=>s+pitchMeans[p],0),0)/(n*n);
  if(mean<0.50 || contrast<0.14 || mean-background<0.10)return null;
  return mean+contrast/2;
}

// Search one missing bar ending exactly on a selected downbeat. The following
// bar sets the tempo window. Only the missing bar contributes pitch evidence.
export function precedingTake(bar,features,end,expectedLength,earliest=0) {
  if(bar.distinct<3 || bar.span!==undefined || bar.probes.length<6 || !(expectedLength>0))return null;
  const shortest=expectedLength*0.7,longest=Math.min(expectedLength*1.35,end-earliest);
  const step=Math.max(0.02,(longest-shortest)/80);
  let best=null;
  for(let length=shortest;length<=longest+1e-9;length+=step){
    const start=end-length,quality=timedPitchQuality(bar,features,start,length);
    if(quality===null)continue;
    if(!best || quality>best.quality)best={start,end,quality,backward:true};
  }
  return best;
}

export function suggestPrecedingMeasures(bars,matches,choices,features){
  let earliest=0;
  for(let i=0;i<bars.length-1;i++){
    const existing=matches[i][choices[i]];
    if(existing){earliest=existing.end;continue;}
    const next=matches[i+1][choices[i+1]];
    if(matches[i].length || !next)continue;
    const length=bars[i].duration*(next.end-next.start)/(bars[i+1].span??bars[i+1].duration);
    const take=precedingTake(bars[i],features,next.start,length,earliest);
    if(take){matches[i].push(take);choices[i]=0;earliest=take.end;}
  }
}

// Use the two existing boundaries only when each neighbor independently predicts
// one bar at this tempo. Verify the written pitches in the instrument's register.
export function suggestInteriorMeasures(bars,matches,choices,samples){
  const selected=choices.map((choice,i)=>matches[i][choice]);
  for(let i=1;i<bars.length-1;i++){
    const left=selected[i-1],right=selected[i+1],bar=bars[i];
    if(selected[i] || !left || !right || bar.span!==undefined || bar.distinct<3 || bar.probes.length<6)continue;
    if(bar.probes[0].time>bar.duration/3 || bar.probes.at(-1).time<2*bar.duration/3)continue;
    const start=left.end,end=right.start,length=end-start;
    const fits=(neighbor,take)=>{
      const expected=bar.duration*(take.end-take.start)/(neighbor.span??neighbor.duration);
      return length>=0.85*expected && length<=1.15*expected;
    };
    if(!(length>0) || !fits(bars[i-1],left) || !fits(bars[i+1],right))continue;
    const register=bar.register;
    if(!Number.isFinite(register?.low) || !Number.isFinite(register.high))continue;
    // Include enough surrounding audio for the centered FFT at both edges.
    const first=Math.max(0,Math.floor((start-0.12)*SAMPLE_RATE));
    const clip=samples.subarray(first,Math.ceil((end+0.12)*SAMPLE_RATE));
    const features=recordingFeatures(clip,register.low-5,register.high+5);
    const quality=timedPitchQuality(bar,features,start-first/SAMPLE_RATE,length);
    if(quality===null)continue;
    choices[i]=matches[i].length;
    matches[i]=[...matches[i],{start,end,quality,betweenMeasures:true}];
  }
}
