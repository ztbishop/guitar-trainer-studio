import {refinePassage,PassageMatchError} from './audio-sync-passages.js';
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

function hasPitchPattern(bar) {
  return bar.span === undefined && bar.distinct >= 3 && bar.probes.length >= 6 &&
    bar.probes[0].time <= bar.duration/3 && bar.probes.at(-1).time >= 2*bar.duration/3 &&
    Number.isFinite(bar.register?.low) && Number.isFinite(bar.register.high);
}

function registerQuality(bar,samples,start,end,allowShortNotes) {
  // Include surrounding samples for the centered FFT at both edges.
  const first = Math.max(0,Math.floor((start-0.12)*SAMPLE_RATE));
  const clip = samples.subarray(first,Math.ceil((end+0.12)*SAMPLE_RATE));
  const features = recordingFeatures(clip,bar.register.low-5,bar.register.high+5);
  const offset = start-first/SAMPLE_RATE, length = end-start;
  const quality = timedPitchQuality(bar,features,offset,length);
  if (quality !== null || !allowShortNotes) return quality;
  // A short articulation can lose its pitch by the second probe of a note.
  // Apply the same pitch and contrast tests to its attacks across the bar.
  const attacks = bar.probes.filter(p => p.onset !== undefined);
  if (attacks.length < 4 || attacks[0].time > bar.duration/3 ||
      attacks.at(-1).time < 2*bar.duration/3) return null;
  return timedPitchQuality({...bar,probes:attacks},features,offset,length);
}

// Snapshot the pins. A recovered bar cannot extend a run, replace a take,
// or supply the pitch evidence for another bar.
export function suggestInteriorMeasures(bars,matches,choices,samples,score,features) {
  const selected = choices.map((choice,i) => matches[i][choice]);
  let lastSelected = -1;
  for (let right = 0; right < selected.length; right++) {
    if (!selected[right]) continue;
    const left = lastSelected;
    lastSelected = right;
    const count = right-left-1;
    if (left < 0 || count < 1 || count > 4) continue;
    const missing = bars.slice(left+1,right);
    if (!missing.every(hasPitchPattern)) continue;
    const start = selected[left].end, end = selected[right].start;
    const duration = missing.reduce((sum,bar) => sum+bar.duration,0);
    const scale = (end-start)/duration;
    const fits = [left,right].every(i => {
      const tempo = (selected[i].end-selected[i].start)/(bars[i].span ?? bars[i].duration);
      return tempo > 0 && scale >= 0.85*tempo && scale <= 1.15*tempo;
    });
    if (!fits || start < 0 || end > samples.length/SAMPLE_RATE) continue;
    let points = [start,end];
    if (count > 1) {
      const clip = features.subarray(Math.floor(start/0.04)*12,Math.ceil(end/0.04)*12);
      try {
        points = refinePassage(score,clip,left+1,right-1,start,end);
      } catch (error) {
        if (error instanceof PassageMatchError) continue;
        throw error;
      }
    }
    const takes = [];
    for (const [j,bar] of missing.entries()) {
      const from = points[j], to = points[j+1];
      const ratio = (to-from)/(bar.duration*scale);
      if (ratio < 0.8 || ratio > 1.2) break;
      const quality = registerQuality(bar,samples,from,to,count > 1);
      if (quality === null) break;
      takes.push({start:from,end:to,quality,betweenMeasures:true});
    }
    if (takes.length !== count) continue;
    for (const [j,take] of takes.entries()) {
      const i = left+1+j;
      choices[i] = matches[i].length;
      matches[i] = [...matches[i],take];
    }
  }
}
