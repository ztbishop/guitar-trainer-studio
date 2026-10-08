// Translate grading records into display data. No grading or alphaTab APIs here.
export function noteStatesFromRecords(records=[]) {
  const states={};
  for(const record of records) {
    if(record.skipped)continue;
    for(const slot of record.slots) {
      const status=slot.hit ? 'correct' : slot.missed ? 'missed' : null;
      if(status)for(const id of slot.noteIds)states[id]=status;
    }
  }
  return states;
}

export function buildNotationMarks(events,currentEvent,noteStates={}) {
  const marks=new Map();
  const put=(event,note,state)=>{
    if(note.sourceNoteId==null)return;
    marks.set(String(note.sourceNoteId),{sourceNoteId:String(note.sourceNoteId),state,
      label:`${state} • ${note.noteName||note.midi} • measure ${event.measureNumber} • occurrence ${event.occurrence||1}`});
  };
  for(const event of events)for(const note of event.notes)if(noteStates[note.id])put(event,note,noteStates[note.id]);
  // The current occurrence wins over older results on the same written note.
  if(currentEvent)for(const note of currentEvent.notes)put(currentEvent,note,noteStates[note.id]||'expected');
  return [...marks.values()];
}

export function notationRectangles(marks,noteLookup,boundsLookup) {
  const rectangles=[];
  if(!boundsLookup?.isFinished)return rectangles;
  for(const mark of marks) {
    const note=noteLookup.get(mark.sourceNoteId);if(!note)continue;
    for(const beat of boundsLookup.findBeats(note.beat)||[])for(const bound of beat.notes||[]) {
      if(String(bound.note.id)!==mark.sourceNoteId)continue;
      const b=bound.noteHeadBounds;
      if(!b || ![b.x,b.y,b.w,b.h].every(Number.isFinite) || b.w<=0 || b.h<=0)continue;
      rectangles.push({...mark,x:b.x-3,y:b.y-3,width:b.w+6,height:b.h+6});
    }
  }
  return rectangles;
}

export function buildFretboardModel({track,currentEvent,noteStates={},activeNotes=[],inputMode='single-channel',leftHanded=false,lastFeedback=null}) {
  const staff=track?.staves?.[currentEvent?.staffIndex??0];
  const tuning=staff?.tuning;
  if(!Array.isArray(tuning)||tuning.length!==6 || !tuning.every(Number.isFinite))return {supported:false,message:'Select a six-string guitar track to show its fretboard.'};
  const openPitches=tuning.map(pitch=>pitch+(staff.capo||0)-(staff.transpositionPitch||0));
  const targets=(currentEvent?.notes||[]).filter(n=>Number.isInteger(n.string)&&n.string>=1&&n.string<=6&&Number.isInteger(n.fret)&&n.fret>=0&&n.fret<=36)
    .map(note=>({string:note.string,fret:note.fret,midi:note.midi,state:noteStates[note.id]||'expected'}));
  const maxFret=Math.max(24,...targets.map(n=>n.fret));
  const played=[];const seen=new Set();
  for(const note of activeNotes) {
    for(let string=1;string<=6;string++) {
      if(inputMode==='hex-6ch' && note.stringHint!==string)continue;
      const fret=note.midi-openPitches[string-1];
      if(!Number.isInteger(fret)||fret<0||fret>maxFret)continue;
      const key=`${string}:${fret}`;if(seen.has(key))continue;seen.add(key);
      const state=lastFeedback?.midi===note.midi && ['correct','wrong'].includes(lastFeedback.type) ? lastFeedback.type : 'played';
      played.push({string,fret,midi:note.midi,state});
    }
  }
  const missingPositions=targets.length<(currentEvent?.notes.length||0) ? ' Some target notes have no supported tab position; see Practice feedback.' : '';
  return {supported:true,openPitches,targets,played,maxFret,leftHanded,capo:staff.capo||0,
    message:(inputMode==='hex-6ch'?'Played positions use configured MIDI string channels; exact-position grading remains off.':'Played markers show possible positions; single-channel MIDI does not identify the string.')+missingPositions,
    unmappedPitches:[...new Set(activeNotes.filter(n=>!played.some(p=>p.midi===n.midi)).map(n=>n.midi))]};
}

export function fretX(fret,maxFret,leftHanded=false) {
  const x=70+(fret+0.5)*1060/(maxFret+1);
  return leftHanded ? 1200-x : x;
}
