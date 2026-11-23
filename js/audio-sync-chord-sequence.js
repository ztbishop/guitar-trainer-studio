import {recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';
import {observedChordRelease} from './audio-sync-ringing.js';

const FRAME=0.04, HOP=Math.round(FRAME*SAMPLE_RATE);

// Repeated low strings can outweigh the changing voices in every bar. Look
// for a series of separately attacked, evenly written chords within a take.
function chordBar(bar) {
  const span=bar.span??bar.duration, offset=bar.offset??0;
  const attacks=bar.probes.filter(p=>p.onset>=offset && p.onset<offset+span);
  if (!attacks.length || attacks.length>4) return;
  const beat=attacks.length>1 ? attacks[1].onset-attacks[0].onset : span;
  if (beat<0.45 || beat>5 || !attacks.every((p,j)=>
    p.pitches.length>=3 && Math.abs(p.onset-offset-j*beat)<0.03)) return;
  return {span,beat,chords:attacks.map(p=>p.pitches)};
}

function strums(samples,from,to) {
  const rms=[];
  for (let frame=Math.max(0,Math.floor(from/FRAME)-2);frame<=Math.min(to/FRAME+2,samples.length/HOP-1);frame++) {
    let power=0;
    for (let j=frame*HOP;j<(frame+1)*HOP;j++) power+=samples[j]**2;
    rms.push({frame,level:Math.sqrt(power/HOP)});
  }
  const hits=[];
  for (let i=2;i<rms.length-1;i++) {
    const {frame,level}=rms[i], next=rms[i+1].level;
    if (frame*FRAME<from || frame*FRAME>=to || level+next<0.012) continue;
    const rise=(0.0005+Math.max(level,next))/(0.0005+Math.min(rms[i-1].level,rms[i-2].level));
    if (rise<2) continue;
    const previous=hits.at(-1);
    if (previous && frame-previous.frame<=2) {
      if (rise>previous.rise) {previous.frame=frame;previous.rise=rise;}
    } else hits.push({frame,rise});
  }
  return hits;
}

function chordEvidence(features,frame,chord,common) {
  let total=0;
  const voices=chord.filter(p=>!common.has(p));
  for (let k=1;k<=8;k++) {
    let power=0,support=0;
    for (let p=0;p<12;p++) {
      if (common.has(p)) continue;
      const value=features[(frame+k)*12+p]||0;
      power+=value*value;
      if (voices.includes(p)) support+=value;
    }
    total+=support/Math.sqrt(Math.max(0.02,power)*voices.length);
  }
  return total/8;
}

function findSequence(hits,features,chords,common,beat) {
  // One best path ending on each attack. Only recent attacks can connect.
  let paths=[];
  for (const [j,chord] of chords.entries()) {
    const next=[];
    let first=0;
    for (const hit of hits) {
      const time=hit.frame*FRAME, evidence=chordEvidence(features,hit.frame,chord,common);
      if (evidence<0.20) continue;
      if (!j) {next.push({time,start:time,score:evidence,parent:null});continue;}
      while (first<paths.length && time-paths[first].time>1.75*beat) first++;
      let best=null, score=-Infinity;
      for (let k=first;k<paths.length;k++) {
        const prior=paths[k], gap=time-prior.time;
        if (gap<0.60*beat) break;
        const previousBeat=j===1 ? beat : (prior.time-prior.start)/(j-1);
        const value=prior.score+evidence-0.6*Math.abs(Math.log(gap/previousBeat));
        if (value>score) {best=prior;score=value;}
      }
      if (best) next.push({time,start:best.start,score,parent:best});
    }
    paths=next;
    if (!paths.length) return;
  }
  paths.sort((a,b)=>b.score-a.score);
  const best=paths[0], rival=paths.find(p=>Math.abs(p.start-best.start)>beat/2);
  if (best.score<0.52*chords.length || (rival && best.score-rival.score<0.06*chords.length)) return;
  const times=[];
  for (let node=best;node;node=node.parent) times.push(node.time);
  return times.reverse();
}

export function recoverChordSequences(score,bars,samples,matches,choices) {
  const patterns=bars.map(chordBar);
  if (!patterns.some(Boolean)) return;
  const attacks=new Set(score.notes.map(n=>Math.round(n.start*1000)));
  let remainingSeconds=1200;
  for (let first=0;first<bars.length;) {
    const pattern=patterns[first];
    if (!pattern) {first++;continue;}
    let stop=first+1;
    while (patterns[stop] && Math.abs(patterns[stop].span-pattern.span)<0.03 &&
           Math.abs(patterns[stop-1].chords.length*pattern.beat-pattern.span)<0.03 &&
           (patterns[stop].chords.length===1 || Math.abs(patterns[stop].beat-pattern.beat)<0.03)) stop++;
    const count=stop-first;
    if (count>=2 && count<=12) {
      const group=patterns.slice(first,stop);
      // The bar queries include held notes. A chord tied across the last
      // bar line occupies time but contributes no new recorded strum.
      const last=stop-1, tail=patterns[last];
      const tied=tail.chords.length===1 && !attacks.has(Math.round(score.edges[last]*1000)) &&
        tail.chords[0].every(pitch=>score.notes.some(n=>n.pitch===pitch &&
          n.start<score.edges[last] && n.end>=score.edges[stop]-0.001));
      const chords=group.slice(0,tied ? -1 : group.length).flatMap(p=>p.chords);
      const common=new Set(chords[0].filter(p=>chords.every(c=>c.includes(p))));
      const identities=new Set(chords.map(c=>c.join(',')));
      if (chords.length>=7 && common.size>=1 && identities.size>=4 && chords.every(c=>c.length>common.size)) {
        checkRange(first,stop,chords,common,pattern,tied);
      }
    }
    first=stop;
  }

  function checkRange(first,stop,chords,common,pattern,tied) {
    const selected=choices.map((c,i)=>matches[i][c]);
    const from=selected.slice(0,first).findLast(Boolean)?.end??0;
    const to=selected.slice(stop).find(Boolean)?.start??samples.length/SAMPLE_RATE;
    if (to-from<chords.length*pattern.beat*0.6 || to-from>Math.min(300,remainingSeconds)) return;
    for (let i=first;i<stop-(tied?1:0);i++) {
      if (!patterns[i].chords.every((_,j)=>attacks.has(Math.round((score.edges[i]+j*pattern.beat)*1000)))) return;
    }
    // Existing continuous takes need no repair. Search only a broken run.
    const original=selected.slice(first,stop);
    if (original.every((t,i)=>t && (!i || Math.abs(t.start-original[i-1].end)<=0.35))) return;
    remainingSeconds-=to-from;
    const hits=strums(samples,from,to);
    if (hits.length<chords.length) return;
    const high=Math.max(...bars.slice(first,stop).map(b=>b.register?.high??-Infinity));
    if (!Number.isFinite(high)) return;
    const firstFrame=Math.max(0,Math.floor(from/FRAME)-4);
    const clip=samples.subarray(firstFrame*HOP,Math.ceil(to/FRAME+10)*HOP);
    const features=recordingFeatures(clip,high-18,high+10);
    const relative=hits.map(h=>({...h,frame:h.frame-firstFrame}));
    const times=findSequence(relative,features,chords,common,pattern.beat);
    if (!times) return;
    for (let j=0;j<times.length;j++) times[j]+=firstFrame*FRAME;
    const beat=(times.at(-1)-times[0])/(times.length-1);
    if (tied) {
      const continuation=times.at(-1)+beat;
      const frame=Math.round(continuation/FRAME)-firstFrame;
      if (chordEvidence(features,frame,chords.at(-1),common)<0.35) return;
      times.push(continuation);
    }
    const last=patterns[stop-1], finalBeats=last.span/pattern.beat-last.chords.length+1;
    const end=times.at(-1)+beat*finalBeats;
    if (end>to) return;
    const bounds=[];
    let j=0;
    for (let i=first;i<stop;i++) {
      const next=j+patterns[i].chords.length;
      const previous=selected[i];
      const start=times[j], finish=times[next]??end;
      // Keep existing draft estimates wherever the two searches already
      // agree. The unobserved final release has greater uncertainty.
      bounds.push({start:previous && Math.abs(previous.start-start)<=0.25 ? previous.start : start,
        end:previous && Math.abs(previous.end-finish)<=(next===times.length ? 0.5 : 0.25) ? previous.end : finish});
      j=next;
    }
    // A retained downbeat may fall just before the neighboring new endpoint.
    // A shared bar line follows that downbeat in both measures.
    for (let i=1;i<bounds.length;i++) {
      if (bounds[i-1].end>bounds[i].start) bounds[i-1].end=bounds[i].start;
    }
    if (bounds.some(b=>b.end<=b.start) || bounds[0].start<from || bounds.at(-1).end>to) return;
    // Only reconsider an extrapolated end at the very end of the score.
    // A retained prior estimate and every interior bar line keep their times.
    const final=bounds.at(-1);
    if (stop===bars.length && final.end!==original.at(-1)?.end) {
      const observed=observedChordRelease(score,samples,final);
      if (observed!==undefined && observed<=to) final.end=observed;
    }
    for (let i=first;i<stop;i++) {
      const b=bounds[i-first],previous=selected[i];
      if (previous && previous.start===b.start && previous.end===b.end) continue;
      choices[i]=matches[i].length;
      matches[i].push({...b,quality:0.8});
    }
  }
}
