// Conservative pitch-only attribution. No grading, transport or alphaTab APIs.
import {buildWrongFretMarks} from './tab-feedback.js';
// Capture at the wrong attack, before later corrections erase the pending set.
export function inferPolyExpectedNoteIds(slots=[]) {
  const pending=slots.filter(s=>!s.hit && !s.missed);
  return pending.length===1 && pending[0].noteIds.length===1 ? [...pending[0].noteIds] : [];
}

// Projection only: toggling inference never changes scoring or stored history.
export function buildPolyMistakeMarks({events=[],currentEvent,history=[],liveWrongNotes=[],noteStates={},mode='wait',enabled=false}) {
  if(!enabled)return [];
  const records=new Map(history.map(r=>[r.eventId,r])),bySource=new Map();
  const put=event=>{
    const record=records.get(event.id),retained=Boolean(record?.completed);
    const errors=retained?record.wrongNotes??[]:liveWrongNotes.filter(n=>n.eventId===event.id);
    for(const note of event.notes) {
      if(note.sourceNoteId==null)continue;
      const error=errors.filter(n=>n.wrongPitch && n.inferredNoteIds?.includes(note.id)).at(-1);
      // Realtime accepted notes always stay green. Wait remembers an inferred
      // correction only after completion; partial accepted notes stay green.
      const show=error && (retained && mode==='wait' || noteStates[note.id]!=='correct');
      bySource.set(String(note.sourceNoteId),show?{kind:'poly-error',sourceNoteId:String(note.sourceNoteId),
        state:retained?'completed-with-errors':'wrong',retained,inferred:true,eventId:event.id,
        label:'Inferred Poly mistake: one expected pitch remained'}:null);
    }
  };
  for(const event of events)if(records.get(event.id)?.completed || mode==='realtime' && liveWrongNotes.some(n=>n.eventId===event.id))put(event);
  if(currentEvent)put(currentEvent);
  return [...bySource.values()].filter(Boolean);
}

// Use the uniquely associated written string as a hypothesis, never as detected
// position. Reuse Hex score validation/side geometry without changing input data.
export function buildPolyWrongFretMarks({track,events=[],currentEvent,history=[],liveWrongNotes=[],mode='wait',enabled=false}) {
  if(!enabled)return [];
  const eventMap=new Map(events.map(e=>[e.id,e]));
  const project=error=>{
    if(!error.wrongPitch || error.inferredNoteIds?.length!==1)return [];
    const note=eventMap.get(error.eventId)?.notes.find(n=>n.id===error.inferredNoteIds[0]);
    return note?[{...error,stringHint:note.string}]:[];
  };
  return buildWrongFretMarks({track,events,currentEvent,mode,inputMode:'hex-6ch',
    history:history.map(r=>({...r,wrongNotes:(r.wrongNotes??[]).flatMap(project)})),
    liveWrongNotes:liveWrongNotes.flatMap(project)}).map(mark=>({...mark,inferred:true}));
}
