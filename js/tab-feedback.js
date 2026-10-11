import {standardBeatForNote} from './practice-visuals.js';

// Retain a compact error indicator even if fret detail is hidden or unavailable.
export function buildTabErrorTargets(events,currentEvent,history=[],{liveWrongNotes=[],inputMode,noteStates={},mode='wait'}={}) {
  const records=new Map(history.map(r=>[r.eventId,r])),bySource=new Map();
  const put=event=>{
    const record=records.get(event.id);
    const strings=new Set(inputMode==='hex-6ch' && !record?.completed && (mode==='realtime' || event.id===currentEvent?.id)
      ? liveWrongNotes.filter(n=>n.eventId===event.id && n.wrongPitch && Number.isInteger(n.stringHint) && n.stringHint>=1 && n.stringHint<=6).map(n=>n.stringHint)
      : []);
    for(const note of event.notes)if(note.sourceNoteId!=null) {
      const completedError=Boolean(inputMode!=='single-channel' && record?.completed && record.wrongNotes?.some(n=>n.wrongPitch &&
        (inputMode!=='hex-6ch' || !Number.isInteger(n.stringHint) || n.stringHint<1 || n.stringHint>6 || n.stringHint===note.string)));
      // The detected string identifies a pending tab position, never an intended
      // replacement pitch. Already accepted chord tones remain green.
      const state=completedError?'completed-with-errors':strings.has(note.string) && !noteStates[note.id]?'wrong':null;
      bySource.set(String(note.sourceNoteId),state);
    }
  };
  for(const event of events)if(records.get(event.id)?.completed || mode==='realtime' && liveWrongNotes.some(n=>n.eventId===event.id))put(event);
  if(currentEvent)put(currentEvent);
  return [...bySource].filter(([,state])=>state).map(([sourceNoteId,state])=>({kind:'tab-error',sourceNoteId,state,
    label:state==='wrong'?'Wrong pitch held on this string':'Mistake at this target'}));
}

// Display-only configured Hex mapping. Grading remains pitch-based.
export function buildWrongFretMarks({track,events,currentEvent,history=[],liveWrongNotes=[],inputMode,mode='wait'}) {
  if(inputMode!=='hex-6ch')return [];
  events=events??(currentEvent?[currentEvent]:[]);
  const byWritten=new Map(),records=new Map(history.map(r=>[r.eventId,r]));
  const writtenKey=event=>event.sourceBeatId??event.notes.map(n=>n.sourceNoteId).join(':');
  const project=(event,notes,retained)=>{
    const staff=track?.staves?.[event.staffIndex??0],tuning=staff?.tuning;
    if(staff?.isPercussion || !Array.isArray(tuning) || tuning.length!==6 || !tuning.every(Number.isInteger))return [];
    const capo=staff.capo??0,transpose=staff.transpositionPitch??0;
    if(!Number.isInteger(capo) || !Number.isInteger(transpose))return [];
    const open=tuning.map(n=>n+capo-transpose);
    if(!event.notes.length || event.notes.some(n=>!Number.isInteger(n.string) || n.string<1 || n.string>6 ||
      !Number.isInteger(n.fret) || n.midi!==open[n.string-1]+n.fret))return [];
    const latest=new Map();
    for(const note of notes) {
      if(note.eventId!==event.id || !note.wrongPitch || !Number.isInteger(note.stringHint) || note.stringHint<1 || note.stringHint>6)continue;
      const previous=latest.get(note.stringHint);
      if(!previous || (note.at??0)>=(previous.at??0))latest.set(note.stringHint,note);
    }
    const result=[];
    for(const [string,note] of latest) {
      const fret=note.midi-open[string-1];
      if(!Number.isInteger(fret) || fret<0 || fret>36)continue;
      const anchor=event.notes.find(n=>n.string===string && n.sourceNoteId!=null)??event.notes.find(n=>n.sourceNoteId!=null);
      if(anchor)result.push({kind:'wrong-fret',sourceNoteId:String(anchor.sourceNoteId),string,fret,retained,eventId:event.id});
    }
    return result;
  };
  const putHistory=event=>{
    const key=writtenKey(event);
    for(let string=1;string<=6;string++)byWritten.delete(`${key}:${string}`);
    for(const mark of project(event,records.get(event.id)?.wrongNotes??[],true))byWritten.set(`${key}:${mark.string}`,mark);
  };
  for(const event of events)if(records.get(event.id)?.completed)putHistory(event);
  if(currentEvent) {
    const key=writtenKey(currentEvent);
    if(!records.get(currentEvent.id)?.completed)for(let string=1;string<=6;string++)byWritten.delete(`${key}:${string}`);
  }
  // Live markers win while held, even after the Realtime cursor moves forward.
  for(const event of events) {
    if(mode==='wait' && (event.id!==currentEvent?.id || records.get(event.id)?.completed))continue;
    for(const mark of project(event,liveWrongNotes,false))byWritten.set(`${writtenKey(event)}:${mark.string}`,mark);
  }
  return [...byWritten.values()];
}

const valid=b=>b && [b.x,b.y,b.w,b.h].every(Number.isFinite) && b.w>0 && b.h>0;
export function tabBeat(note,bounds,profile) {
  const staff=note.beat?.voice?.bar?.staff;
  if(!staff || profile===2 || ![0,1,3,4].includes(profile) || (profile===0 && !staff.showTablature))return null;
  const standard=standardBeatForNote(note,bounds,profile);
  const candidates=(bounds.findBeats(note.beat)||[]).filter(b=>b!==standard && b.notes?.some(n=>String(n.note.id)===String(note.id)));
  return candidates.length===1?candidates[0]:null;
}

export function wrongFretGeometry(marks,lookup,bounds,{profile=0,scale=1,tabLineSpacing,tabFontSize=14}={}) {
  if(!bounds?.isFinished || !Number.isFinite(scale) || scale<=0 || !Number.isFinite(tabLineSpacing) || tabLineSpacing<=0)return [];
  const result=[];
  for(const mark of marks.filter(m=>m.kind==='wrong-fret')) {
    const note=lookup.get(mark.sourceNoteId);if(!note || !Number.isInteger(mark.string) || mark.string<1 || mark.string>6)continue;
    const beat=tabBeat(note,bounds,profile),b=beat?.notes?.find(n=>String(n.note.id)===mark.sourceNoteId)?.noteHeadBounds;
    if(!valid(b))continue;
    const nativeFontSize=Number.isFinite(tabFontSize) && tabFontSize>0?tabFontSize:14;
    const fontSize=nativeFontSize*scale,height=(nativeFontSize+4)*scale,
      width=(String(mark.displayFret??mark.fret).length*nativeFontSize*0.65+5)*scale;
    const anchorString=note.beat.voice.bar.staff.tuning.length+1-note.string;
    const targetX=b.x+b.w+3*scale,targetY=b.y+b.h/2+(mark.string-anchorString)*tabLineSpacing*scale;
    // Always place detail beside the detected string, live or retained.
    // Keep double digits visible; do not route pointers or reserve staff space.
    result.push({...mark,x:b.x+b.w+5*scale,y:targetY-height/2,width,height,fontSize,targetX,targetY});
  }
  return result;
}
