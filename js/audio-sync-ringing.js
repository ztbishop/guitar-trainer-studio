import {recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';

const STEP=0.04, HOP=Math.round(STEP*SAMPLE_RATE);

function chordWindow(samples,from,to,pitches) {
  const first=Math.max(0,Math.floor(from/STEP)-3);
  const end=Math.min(Math.floor(samples.length/HOP),Math.ceil(to/STEP)+3);
  const clip=samples.subarray(first*HOP,end*HOP), features=recordingFeatures(clip);
  const frames=[];
  for (let i=0;i<end-first;i++) {
    const time=(first+i)*STEP;
    if (time<from || time>to) continue;
    const chroma=features.subarray(i*12,i*12+12);
    let mass=0,sum=0,power=0;
    for (const pitch of pitches) {
      mass+=chroma[pitch]**2;
      sum+=chroma[pitch];
    }
    for (let k=i*HOP;k<(i+1)*HOP;k++) power+=clip[k]**2;
    frames.push({time,chroma,mass,agreement:sum/Math.sqrt(pitches.length),level:Math.sqrt(power/HOP)});
  }
  return frames;
}

function opening(samples,take,pitches,hold) {
  const reach=Math.min(3,hold);
  const frames=chordWindow(samples,take.start-reach-0.20,take.start+0.20,pitches);
  for (let i=4;i<frames.length-4;i++) {
    const f=frames[i];
    if (f.time<take.start-reach || f.time>take.start-0.28) continue;
    const floor=Math.max(0.001,frames[i-1].level,frames[i-2].level);
    if (f.level<6*floor || f.level<0.012) continue;
    // A rolled strum may start on the bass strings. Locate the first
    // sustained full chord following the attack instead of a single peak.
    for (let j=i;j<=i+6 && j+4<frames.length;j++) {
      const body=frames.slice(j,j+4);
      if (!body.every(v=>v.mass>=0.9 && v.agreement>=0.72)) continue;
      const through=frames.slice(j).filter(v=>v.time<=take.start+0.08);
      // A different chord or a second attack after a quiet break can be an
      // earlier demonstration, even when the opening pitches agree.
      if (through.length<6 || through.some(v=>v.level<2*floor) ||
          through.some((v,k)=>k>=4 && v.mass<0.45 && through.slice(k-4,k).every(previous=>previous.mass<0.45)) ||
          through.filter(v=>v.mass>=0.7 && v.agreement>=0.65).length<0.70*through.length) break;
      if (take.start-frames[j].time>=0.28) return frames[j].time;
      break;
    }
  }
}

function release(samples,take,pitches,hold) {
  const lookBack=Math.min(0.72,0.6*hold);
  const frames=chordWindow(samples,take.end-lookBack,take.end+Math.min(1.4,hold)+0.48,pitches);
  const body=frames.filter(v=>v.time<=take.end-0.16);
  if (body.length<6 || !body.every(v=>v.mass>=0.78 && v.agreement>=0.68 && v.level>0.002)) return;
  const template=new Float64Array(12);
  for (const f of body) for (let p=0;p<12;p++) template[p]+=f.chroma[p];
  const norm=Math.hypot(...template);
  const level=body.reduce((sum,f)=>sum+f.level,0)/body.length;
  const tail=frames.slice(body.length);
  const ringing=tail.map(f=>f.mass>=0.78 && f.agreement>=0.68 && f.level>=0.12*level && f.level<=1.8*level &&
    f.chroma.reduce((sum,value,p)=>sum+value*template[p],0)>=0.90*norm);
  // A brief competing sound can mask a ringing chord. Resume only on several
  // consecutive frames of the same fading chord. Require a witnessed exit.
  let last=-1;
  for (let i=0;i<tail.length;i++) {
    if (ringing[i] && ringing[i+1] && ringing[i+2]) last=i+2;
    const quiet=tail[i].level<0.08*level && tail[i+1]?.level<0.08*level;
    if (quiet || i-last>=8) {
      if (last<0 || last+1>=tail.length) return;
      const end=tail[last+1].time;
      if (end-take.end>=0.28 && end-take.end<=Math.min(1.4,hold)) return end;
      return;
    }
  }
}

function edgeChord(score,take,atStart) {
  const i=atStart ? 0 : score.edges.length-2, start=score.edges[i], end=score.edges[i+1], span=end-start;
  if (!(span>0)) return;
  const notes=score.notes.filter(n=>atStart ? Math.abs(n.start-start)<0.001 && n.end>start :
    n.start<end && Math.abs(n.end-end)<0.001);
  const pitches=[...new Set(notes.map(n=>n.pitch))];
  if (pitches.length<3) return;
  let written=notes.reduce((length,n)=>Math.min(length,atStart?n.end-start:end-n.start),span);
  // Another written attack or release interrupts the unchanged chord.
  for (const n of score.notes) {
    if (atStart && n.start>start+0.001) written=Math.min(written,n.start-start);
    if (!atStart && n.end<end-0.001) written=Math.min(written,end-n.end);
  }
  const hold=written/span*(take.end-take.start);
  if (hold>=0.65) return {pitches,hold,written};
}

export function refineOpeningChord(score,samples,matches,choices) {
  const take=matches[0]?.[choices[0]];
  if (!take) return;
  const chord=edgeChord(score,take,true);
  if (!chord) return;
  const start=opening(samples,take,chord.pitches,Math.max(chord.hold,chord.written));
  if (start===undefined) return;
  choices[0]=matches[0].length;
  matches[0].push({...take,start});
}

export function observedChordRelease(score,samples,take) {
  const chord=edgeChord(score,take,false);
  if (chord) return release(samples,take,chord.pitches,chord.hold);
}
