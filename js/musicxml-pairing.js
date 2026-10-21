// Pure score-model comparison and repair. No MIDI, grading or alphaTab API calls.
const beats = staff => staff.bars.flatMap((bar, index) => bar.voices.flatMap(voice => voice.beats.map(beat => ({bar:index, beat}))));
const notes = (staff, written) => beats(staff).flatMap(({bar,beat}) => beat.notes.map(note => ({
  bar, start:beat.playbackStart, pitch:written ? note.octave*12+note.tone-staff.transpositionPitch : note.realValue,
  duration:beat.playbackDuration, tie:note.isTieDestination
}))).sort((a,b)=>a.bar-b.bar || a.start-b.start || a.pitch-b.pitch);

export function findNotationTabPairs(score, groups) {
  const result=[];
  for(const indices of groups) {
    // Larger ensembles and multiple possible pairings are deliberately excluded.
    if(indices.length!==2)continue;
    const tracks=indices.map(i=>score.tracks[i]);
    const notation=tracks.find(t=>t?.staves.length===1 && t.staves[0].showStandardNotation && !t.staves[0].showTablature);
    const tab=tracks.find(t=>t?.staves.length===1 && t.staves[0].showTablature && !t.staves[0].showStandardNotation);
    if(!notation || !tab || notation.name!==tab.name)continue;
    const source=notation.staves[0],target=tab.staves[0];
    if(source.isPercussion || target.isPercussion || target.tuning.length!==6 || source.bars.length!==target.bars.length)continue;
    const a=notes(source,true),b=notes(target,false);
    if(!a.length || a.length!==b.length)continue;
    const differences=new Set();let mismatches=0,valid=true;
    for(let i=0;i<a.length;i++) {
      if(a[i].bar!==b[i].bar || Math.abs(a[i].start-b[i].start)>3){valid=false;break;}
      if(a[i].pitch!==b[i].pitch){mismatches++;differences.add(a[i].bar+1);}
      if(Math.abs(a[i].duration-b[i].duration)>3 || a[i].tie!==b[i].tie)differences.add(a[i].bar+1);
    }
    // Require overwhelming agreement; no general track-merging facility.
    if(!valid || mismatches/a.length>0.01)continue;
    const targetBeats=new Map();
    for(const {bar,beat} of beats(target)) {
      const key=`${bar}:${beat.playbackStart}`;
      if(!targetBeats.has(key))targetBeats.set(key,beat);
    }
    const chords=beats(source).filter(({beat})=>beat.chordId);
    const transfers=[],destinations=new Set();
    for(const entry of chords) {
      const destination=targetBeats.get(`${entry.bar}:${entry.beat.playbackStart}`);
      const chord=source.chords?.get(entry.beat.chordId);
      if(!destination || !chord || destination.chordId || destinations.has(destination)){valid=false;break;}
      destinations.add(destination);transfers.push({beat:destination,chord});
    }
    if(valid && !result.some(pair=>[pair.notation,pair.tab].some(track=>tracks.includes(track))))result.push({notation,tab,transfers,differences:[...differences].sort((a,b)=>a-b)});
  }
  return result;
}

export function combineNotationTabPair(score,pair) {
  const staff=pair.tab.staves[0];
  staff.showStandardNotation=true;
  staff.displayTranspositionPitch=pair.notation.staves[0].displayTranspositionPitch;
  for(const [index,{beat,chord}] of pair.transfers.entries()) {
    const id=`gts-pair-${pair.tab.index}-${index}`;
    staff.addChord(id,chord);beat.chordId=id;
  }
  score.tracks.splice(score.tracks.indexOf(pair.notation),1);
  score.tracks.forEach((track,index)=>{track.index=index;});
}
