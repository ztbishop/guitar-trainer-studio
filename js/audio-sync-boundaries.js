import {SAMPLE_RATE} from './audio-sync-match.js';

const FRAME = 0.04;
const HOP = SAMPLE_RATE*FRAME;

function chordAgreement(features,frame,pitches) {
  return pitches.reduce((sum,pitch)=>sum+(features[frame*12+pitch] || 0),0)/Math.sqrt(pitches.length);
}

function energy(samples,frame) {
  const first = frame*HOP;
  let sum = 0;
  for (let i=first; i<first+HOP; i++) sum += (samples[i] || 0)**2;
  return sum/HOP;
}

// Look for a sustained energy rise confirmed by the written chord after the
// strum. Chroma alone is unreliable for repeated attacks on the same chord.
function chordAttack(samples,features,pitches,from,to) {
  let best = null, strongest = 5;
  for (let frame=Math.max(2,Math.ceil(from/FRAME)); frame<=Math.floor(to/FRAME); frame++) {
    const before = Math.max(energy(samples,frame-2),energy(samples,frame-1),1e-6);
    const after = Math.min(energy(samples,frame),energy(samples,frame+1),energy(samples,frame+2));
    const rise = after/before;
    if (rise < strongest || after < 0.0005 ||
        chordAgreement(features,frame+5,pitches) < 0.75 ||
        chordAgreement(features,frame+8,pitches) < 0.75) continue;
    best = frame*FRAME;
    strongest = rise;
  }
  return best;
}

function downbeatChord(bar) {
  const {probes,span,offset=0} = bar;
  const attack = probes.find(probe=>probe.onset >= offset && probe.onset < (span ?? bar.duration)+offset);
  return attack?.onset === offset && attack.pitches.length>=3 ? attack.pitches : null;
}

function sustainedChord(bar) {
  if (bar.span === undefined) return null;
  const offset = bar.offset ?? 0;
  const attacks = bar.probes.filter(probe=>probe.onset >= offset && probe.onset < offset+bar.span);
  return attacks.length === 1 ? downbeatChord(bar) : null;
}

function selectBoundaryTake(matches,choices,index,take,bounds) {
  choices[index] = matches[index].length;
  matches[index].push({...take,...bounds});
}

// Refine boundaries only in passages the longer searches actually moved.
// Local audio can confirm a missing chord or a bar line, independently of the
// whole-recording match that chose the original timestamps.
export function refineContextBoundaries(bars,samples,features,matches,choices,original,routes) {
  const selected = choices.map((c,i)=>matches[i][c]);
  const moved = selected.map((take,i)=>take && take !== original[i]);
  for (let i=1; i<selected.length; i++) {
    const previous = selected[i-1], next = selected[i];
    if (!moved[i] || !previous) continue;
    const chord = downbeatChord(bars[i]);
    if (!chord) continue;
    const gap = next.start-previous.end;
    // When searches nearly agree on a sustained chord's downbeat, their
    // boundary may still follow a weak pitch change before the actual attack.
    const earlyChord = moved[i-1] && gap > 0 && gap < 0.16 && sustainedChord(bars[i]);
    if (moved[i-1] && gap <= 0.5 && (gap >= 0.16 || earlyChord)) {
      const finalChord = bars[i-1].probes.at(-1)?.pitches;
      const tail = Math.round((previous.end-(earlyChord ? 0.12 : 0))/FRAME);
      if (!finalChord || chordAgreement(features,tail,finalChord)<0.75) continue;
      const from = next.start+(earlyChord ? 0.16 : -0.12);
      const time = chordAttack(samples,features,chord,from,next.start+0.5);
      if (time===null || time<previous.end || time>=next.end-0.5) continue;
      const left = matches[i-1][choices[i-1]];
      selectBoundaryTake(matches,choices,i-1,left,{end:time});
      selectBoundaryTake(matches,choices,i,next,{start:time});
    } else if (!moved[i-1] && bars[i-1].span !== undefined && gap > 2*bars[i-1].span) {
      const earlierChord = sustainedChord(bars[i-1]);
      if (!earlierChord) continue;
      // A sustained chord may get a short match near its attack in the ordinary
      // scan. Also require a longer phrase that carries the chord to the next bar.
      const candidate = routes.map(route=>route[i-1]).find(take=>take &&
        Math.abs(take.end-next.start)<=0.4 &&
        matches[i-1].some(other=>Math.abs(take.start-other.start)<=1 &&
          other.end>take.start && other.start<take.end));
      if (!candidate) continue;
      const start = chordAttack(samples,features,earlierChord,candidate.start-0.65,candidate.start+0.35);
      const end = chordAttack(samples,features,chord,next.start-0.4,next.start+0.2);
      const prior = selected.slice(0,i-1).findLast(Boolean);
      if (start===null || end===null || end-start<0.5 || end>=next.end-0.5 || (prior && start<prior.end)) continue;
      selectBoundaryTake(matches,choices,i-1,candidate,{start,end});
      selectBoundaryTake(matches,choices,i,next,{start:end});
    }
  }
}
