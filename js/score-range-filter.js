// Optional score-based tolerance. This estimates written range, never hand position.
export function outsideScoreRange(event,note,staves,{hex=false,margin=5}={}) {
  if(!event || event.isPercussive || !Number.isInteger(note?.midi) ||
      event.notes.some(n=>n.midi===note.midi))return null;
  const staff=staves?.[event.staffIndex??0],tuning=staff?.tuning;
  if(staff?.isPercussion || !Array.isArray(tuning) || !tuning.length || !tuning.every(Number.isInteger))return null;
  const capo=staff.capo??0,transpose=staff.transpositionPitch??0;
  if(!Number.isInteger(capo) || !Number.isInteger(transpose) || !event.notes.length)return null;
  const open=tuning.map(midi=>midi+capo-transpose);
  if(event.notes.some(n=>n.isDead || !Number.isInteger(n.string) || n.string<1 || n.string>open.length ||
      !Number.isInteger(n.fret) || n.fret<0 || n.fret>36 || n.midi!==open[n.string-1]+n.fret))return null;
  const fretted=event.notes.filter(n=>n.fret>0).map(n=>n.fret);
  const min=Math.max(0,Math.min(...(fretted.length?fretted:[0]))-margin);
  const max=Math.max(...(fretted.length?fretted:[0]))+margin;
  let strings=open.map((_,i)=>i+1);
  if(hex) {
    if(!Number.isInteger(note.stringHint) || note.stringHint<1 || note.stringHint>open.length)return null;
    strings=[note.stringHint];
  }
  const positions=strings.map(string=>({string,fret:note.midi-open[string-1]}));
  // Open strings are playable independently of the fretting hand's position.
  if(positions.some(p=>p.fret===0 || p.fret>=min && p.fret<=max && p.fret<=36))return null;
  return {basis:'written-score',margin,minFret:min,maxFret:max,hex,positions};
}
