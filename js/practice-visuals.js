import {midiToNoteName} from './note-utils.js';
export {fretX} from './fretboard-geometry.js';

// Translate grading records into display data. No grading or alphaTab APIs here.
export function noteStatesFromRecords(records=[],summarizeErrors=true,{hex=false}={}) {
  const states={};
  for(const record of records) {
    if(record.skipped)continue;
    for(const slot of record.slots) {
      const completedWithErrors=hex && summarizeErrors && record.wrongNotes?.some(n=>n.wrongPitch &&
        (!hex || !Number.isInteger(n.stringHint) || n.stringHint<1 || n.stringHint>6 || n.stringHint===slot.string)) && record.slots.every(s=>s.hit);
      const status=completedWithErrors ? 'completed-with-errors' : slot.hit ? 'correct' : slot.missed ? 'missed' : null;
      if(status)for(const id of slot.noteIds)states[id]=status;
    }
  }
  return states;
}

export function buildNotationMarks(events,currentEvent,noteStates={}) {
  const marks=new Map();
  const put=(event,note,state,active=false)=>{
    if(note.sourceNoteId==null)return;
    marks.set(String(note.sourceNoteId),{sourceNoteId:String(note.sourceNoteId),state,active,
      label:`${state} • ${note.noteName||note.midi} • measure ${event.measureNumber} • occurrence ${event.occurrence||1}`});
  };
  for(const event of events)for(const note of event.notes)if(noteStates[note.id])put(event,note,noteStates[note.id]);
  // The current occurrence wins over older results on the same written note.
  if(currentEvent)for(const note of currentEvent.notes)put(currentEvent,note,noteStates[note.id]||'expected',true);
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

export function buildFretboardModel({track,currentEvent,noteStates={},activeNotes=[],liveWrongNotes=[],inputMode='single-channel',leftHanded=false,lastFeedback=null}) {
  const staff=track?.staves?.[currentEvent?.staffIndex??0];
  const tuning=staff?.tuning;
  if(staff?.isPercussion || !Array.isArray(tuning)||!tuning.length || !tuning.every(p=>Number.isInteger(p)&&p>=0&&p<=127))return {supported:false,message:'Select a tablature track with usable string tuning to show its fretboard.'};
  const stringCount=tuning.length;
  const stringMapped=inputMode==='hex-6ch' && stringCount===6;
  const openPitches=tuning.map(pitch=>pitch+(staff.capo||0)-(staff.transpositionPitch||0));
  const targets=(currentEvent?.notes||[]).filter(n=>Number.isInteger(n.string)&&n.string>=1&&n.string<=stringCount&&Number.isInteger(n.fret)&&n.fret>=0&&n.fret<=36)
    .map(note=>({string:note.string,fret:note.fret,midi:note.midi,state:noteStates[note.id]||'expected'}));
  const maxFret=Math.max(24,...targets.map(n=>n.fret));
  const played=[];const seen=new Set();
  for(const note of activeNotes) {
    for(let string=1;string<=stringCount;string++) {
      if(stringMapped && note.stringHint!==string)continue;
      const fret=note.midi-openPitches[string-1];
      if(!Number.isInteger(fret)||fret<0||fret>maxFret)continue;
      const key=`${string}:${fret}`;if(seen.has(key))continue;seen.add(key);
      const wrongHeld=liveWrongNotes.some(wrong=>wrong.midi===note.midi && (wrong.channel==null || note.channel==null || wrong.channel===note.channel));
      const state=wrongHeld?'wrong':lastFeedback?.midi===note.midi && ['correct','wrong'].includes(lastFeedback.type) ? lastFeedback.type :
        targets.some(target=>target.midi===note.midi && target.state==='correct')?'correct':'played';
      played.push({string,fret,midi:note.midi,state});
    }
  }
  const missingPositions=targets.length<(currentEvent?.notes.length||0) ? ' Some target notes have no supported tab position; see Practice feedback.' : '';
  return {supported:true,stringCount,stringMapped,openPitches,targets,played,maxFret,leftHanded,capo:staff.capo||0,
    message:(stringMapped?'Played positions use configured MIDI string channels; exact-position grading remains off.':inputMode==='hex-6ch'?`Six-channel input does not map this ${stringCount}-string tablature. Played markers show possible pitch positions, not detected strings.`:'Played markers show possible positions; single-channel MIDI does not identify the string.')+missingPositions,
    unmappedPitches:[...new Set(activeNotes.filter(n=>!played.some(p=>p.midi===n.midi)).map(n=>n.midi))]};
}



// Keep actual received pitches separate from the compact completed-tab summary.
// Latest/current occurrence wins on shared written notes; old passes remain review data.
export function buildWrongPitchMarks(events,currentEvent,history=[],liveWrongNotes=[],{showLive=true,showHistory=true}={}) {
  const records=new Map(history.map(record=>[record.eventId,record]));
  const bySource=new Map();
  const put=(event)=>{
    const anchor=event.notes.find(note=>note.sourceNoteId!=null);if(!anchor)return;
    const record=records.get(event.id);
    const notes=event.id===currentEvent?.id && !record?.completed
      ? (showLive?liveWrongNotes.filter(note=>note.eventId===event.id):[])
      : (showHistory && record?.completed?record.wrongNotes:[]);
    const pitches=[...new Set(notes.map(note=>note.midi))];
    bySource.set(String(anchor.sourceNoteId),pitches.length?{kind:'wrong-pitches',sourceNoteId:String(anchor.sourceNoteId),
      eventId:event.id,retained:Boolean(record?.completed),pitches,
      label:`${record?.completed?'Errors':'Heard'}: ${pitches.map(midi=>`${midiToNoteName(midi)} (${midi})`).join(', ')}`} : null);
  };
  for(const event of events)if(records.get(event.id)?.completed)put(event);
  if(currentEvent)put(currentEvent);
  return [...bySource.values()].filter(Boolean);
}

export function standardBeatForNote(note,boundsLookup,profile=0) {
  const staff=note.beat?.voice?.bar?.staff;if(!staff)return null;
  if(![0,1,2].includes(profile))return null;
  if(profile===0 && (!staff.showStandardNotation || staff.showSlashNotation || staff.showNumberedNotation))return null;
  const candidates=(boundsLookup?.findBeats(note.beat)||[]).filter(beat=>beat.notes?.some(bound=>String(bound.note.id)===String(note.id)))
    .sort((a,b)=>(a.barBounds?.visualBounds?.y??Infinity)-(b.barBounds?.visualBounds?.y??Infinity));
  const expectedCount=profile===2?1:profile===1?2:1+Number(Boolean(staff.showTablature));
  if(candidates.length!==expectedCount || candidates.some(beat=>!Number.isFinite(beat.barBounds?.visualBounds?.y)))return null;
  return candidates[0]??null;
}
