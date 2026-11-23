import {strums} from './audio-sync-chord-sequence.js';

const STEP=0.04;

// Identify written variations of one progression, including a faster version
// occupying fewer bars. Count attacks and strings before folding octaves.
function variations(score) {
  const {edges,notes}=score;
  const count=edges.length-1;
  if (count<6 || count>64 || notes.length>3000) return;
  const measures=Array.from({length:count},()=>new Map());
  let bar=0;
  for (const n of notes) {
    while (bar+1<count && n.start>=edges[bar+1]-0.001) bar++;
    if (n.start<edges[bar]-0.001) return;
    const at=Math.round(n.start*1000);
    const measure=measures[bar];
    if (!measure.has(at)) measure.set(at,{pitches:[],end:n.end});
    const chord=measure.get(at);
    chord.pitches.push(n.pitch);
    chord.end=Math.max(chord.end,n.end);
  }
  const groups=[];
  for (const [i,measure] of measures.entries()) {
    const entries=[...measure], strings=entries[0]?.[1].pitches.length;
    if (!strings || strings<3 || entries.length>4) return;
    const beat=(edges[i+1]-edges[i])/entries.length;
    if (beat<0.35 || beat>5 || entries.some(([at,chord],j)=>chord.pitches.length!==strings ||
        Math.abs(at/1000-edges[i]-j*beat)>0.025 || new Set(chord.pitches).size<3 ||
        chord.end-at/1000<0.9*beat)) return;
    let group=groups.at(-1);
    if (!group || group.strings!==strings || group.perBar!==entries.length || Math.abs(group.beat-beat)>0.03) {
      group={first:i,strings,perBar:entries.length,beat,chords:[]};
      groups.push(group);
    }
    group.chords.push(...entries.map(([,chord])=>[...new Set(chord.pitches)].sort((a,b)=>a-b)));
  }
  const opening=groups[0];
  if (groups.length<2 || groups.length>5 || opening.perBar!==1 ||
      opening.chords.length<6 || opening.chords.length>16 ||
      new Set(opening.chords.map(c=>c.join(','))).size<4) return;
  // The same sequence of harmonies must be recognizable across variations.
  if (groups.some(g=>g.chords.length!==opening.chords.length || g.chords.some((c,j)=>
      c.filter(p=>opening.chords[j].includes(p)).length<0.7*Math.min(c.length,opening.chords[j].length)))) return;
  return groups;
}

function evidence(features,frame,chord) {
  let sum=0,energy=0;
  for (let k=1;k<=5;k++) for (const pitch of chord) {
    const v=features[(frame+k)*12+pitch]||0;
    sum+=v;
    energy+=v*v;
  }
  return (sum/Math.sqrt(chord.length)+energy)/10;
}

// A candidate for the first bar locates a short recording window. Require
// attacks for the entire variation and other bar candidates along its route.
function matchVariation(group,seed,from,hits,features,matches) {
  const {chords,beat,perBar,first}=group;
  const radius=Math.min(2,Math.max(0.48,0.65*beat));
  const local=hits.filter(h=>h.time>=Math.max(from,seed-radius) &&
    h.time<=seed+radius+chords.length*beat*1.85);
  let paths=[];
  for (const [j,chord] of chords.entries()) {
    const next=[];
    let left=0;
    for (const hit of local) {
      if (!j && Math.abs(hit.time-seed)>radius) continue;
      const quality=evidence(features,hit.frame,chord);
      if (quality<0.52) continue;
      const strength=quality+0.12*Math.min(3,Math.log(hit.rise));
      if (!j) {next.push({time:hit.time,score:strength,parent:null});continue;}
      let best;
      while (left<paths.length && paths[left].time<hit.time-beat*1.85) left++;
      for (let k=left;k<paths.length;k++) {
        const prev=paths[k];
        const gap=hit.time-prev.time;
        if (gap<beat*0.45) break;
        const tempo=prev.parent ? prev.time-prev.parent.time : beat;
        const score=prev.score+strength-0.14*Math.abs(Math.log(gap/tempo));
        if (!best || score>best.score) best={time:hit.time,score,parent:prev};
      }
      if (best) next.push(best);
    }
    paths=next;
    if (!paths.length) return;
  }
  const best=paths.reduce((a,b)=>a.score>b.score?a:b);
  const times=[];
  for (let p=best;p;p=p.parent) times.unshift(p.time);
  const starts=times.filter((_,j)=>j%perBar===0);
  const confirmed=starts.filter((t,i)=>matches[first+i].some(m=>Math.abs(m.start-t)<=Math.max(0.55,beat*0.65)));
  if (confirmed.length<Math.max(2,0.7*starts.length)) return;
  // Shared open strings alone cannot verify a demonstration. At the
  // recorded attacks, the written order should beat the same chords shifted.
  const contrast=times.reduce((sum,t,i)=>{
    const frame=Math.round(t/STEP);
    return sum+evidence(features,frame,chords[i])-evidence(features,frame,chords[(i+1)%chords.length]);
  },0)/times.length;
  if (contrast<0.045) return;
  return {times,quality:best.score/chords.length};
}

// A newly located take can end with its last chord still ringing or with
// speech before the estimated release. Require a sustained chord and a
// witnessed loss of its pitches before adjusting that estimate.
function ending(features,chord,attack,estimated,allowHold) {
  const first=Math.round(attack/STEP), limit=Math.min(features.length/12-1,Math.ceil((estimated+1.8)/STEP));
  let sounding=0,missing=0;
  for (let frame=first+2;frame<=limit;frame++) {
    let mass=0;
    for (const p of chord) mass+=features[frame*12+p]**2;
    if (mass>=0.8) {sounding++;missing=0;continue;}
    if (sounding<5) {sounding=0;continue;}
    if (++missing<3) continue;
    const lost=(frame-2)*STEP;
    return lost<estimated || allowHold ? lost : estimated;
  }
  return Math.min(estimated,features.length/12*STEP);
}

export function recoverChordVariations(score,samples,features,matches,choices) {
  const groups=variations(score);
  if (!groups) return;
  const selected=choices.map((c,i)=>matches[i][c]);
  const first=groups[0],last=groups[1].first-1;
  // An established opening supplies the recording order. A displaced final
  // chord in that opening can be checked against its preceding downbeats.
  const anchor=selected[last-1];
  if (!anchor || !selected[0] || selected.slice(0,last).filter(Boolean).length<0.75*last ||
      selected.slice(0,last).some((t,i)=>
      t && i && selected[i-1] && t.start-selected[i-1].end>first.beat*2)) return;
  const displaced=!selected[last] || selected[last].start-anchor.end>first.beat*3;
  let from=displaced ? anchor.end : selected[last].end;
  const oldStart=selected[groups[1].first]?.start;
  if (oldStart===undefined || !matches[groups[1].first].some(t=>t.start>=from &&
      t.start<oldStart-groups[1].beat*groups[1].chords.length*0.7)) return;
  const to=selected.at(-1)?.end;
  if (!to || to-from>300 || to<=from) return;
  const hits=strums(samples,Math.max(0,from-first.beat),to,1.35).map(h=>({...h,time:h.frame*STEP}));
  const updates=[];
  if (displaced) {
    const chord=first.chords.at(-1);
    const local=hits.filter(h=>h.time>=anchor.end && h.time<=anchor.end+first.beat*0.65);
    const attackStrength=h=>evidence(features,h.frame,chord)+0.08*Math.min(3,Math.log(h.rise));
    const best=local.sort((a,b)=>attackStrength(b)-attackStrength(a))[0];
    if (!best || evidence(features,best.frame,chord)<0.70) return;
    updates.push({i:last,start:best.time,end:ending(features,chord,best.time,best.time+first.beat,true)});
    from=updates.at(-1).end;
  }
  for (const group of groups.slice(1)) {
    const old=selected[group.first]?.start;
    if (!Number.isFinite(old)) return;
    const routes=[];
    for (const take of matches[group.first]) {
      if (take.start<from || take.start>old+group.beat) continue;
      const route=matchVariation(group,take.start,from,hits,features,matches);
      if (route && route.quality>=0.82) routes.push(route);
    }
    const best=Math.max(...routes.map(r=>r.quality));
    const route=routes.filter(r=>r.quality>=best-0.045).sort((a,b)=>a.times[0]-b.times[0])[0];
    if (!route || old-route.times[0]<group.beat*group.chords.length*0.7) return;
    const {times}=route;
    const starts=times.filter((_,j)=>j%group.perBar===0);
    const estimate=times.at(-1)+(times.at(-1)-times[0])/(times.length-1);
    const end=ending(features,group.chords.at(-1),times.at(-1),estimate,group.perBar>1);
    for (const [j,start] of starts.entries()) updates.push({i:group.first+j,start,end:starts[j+1]??end});
    from=end;
  }
  // A run that merges back into an existing selection is ambiguous. Keep
  // those points and the whole original route for review.
  if (updates.some(({i,start,end})=>selected[i] && selected[i].start<end && selected[i].end>start)) return;
  for (const {i,start,end} of updates) {
    choices[i]=matches[i].length;
    matches[i].push({start,end,quality:0.8});
  }
}
