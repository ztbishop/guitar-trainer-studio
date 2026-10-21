// Bounded, opt-in evidence capture. Never suppresses or alters MIDI/grading.
import {AppState} from './app-state.js';

const LIMIT=10000;
let recording=false,events=[],startedAt=null,startedClock=0,reason='',listeners=[],score=null,latestView=null,snapshots=[];
let revision=0,textRevision=-1,cachedText='';
const held=new Map();
const notify=()=>listeners.forEach(fn=>fn());
export function captureStatus(){return {recording,count:events.length,limit:LIMIT,reason};}
export function startMidiCapture(){
  revision++;cachedText='';textRevision=-1;
  events=[];held.clear();latestView=null;snapshots=[];startedAt=new Date().toISOString();startedClock=performance.now();
  score={fileName:AppState.ui.loadedFileName,title:AppState.score?.title,practiceTrackId:AppState.practiceTrackId};
  const track=AppState.tracks.find((t,i)=>String(t.index??i)===String(AppState.practiceTrackId));
  score.staves=track?.staves?.map(s=>({tuning:[...(s.tuning??[])],capo:s.capo,transpositionPitch:s.transpositionPitch}));
  recording=true;reason='';notify();
}
export function stopMidiCapture(){const changed=recording || !reason;if(recording)markMidiSnapshot('Stopped');recording=false;reason||='Stopped';if(changed)revision++;notify();}
function targetInfo(event){return event?{eventId:event.id,measure:event.measureNumber,occurrence:event.occurrence,
  isPercussive:Boolean(event.isPercussive),mutedStrings:[...(event.mutedStrings??[])],
  notes:event.notes.map(n=>({midi:n.midi,string:n.string,fret:n.fret,isDead:Boolean(n.isDead),sourceNoteId:String(n.sourceNoteId)}))}:null;}
export function captureMidiEvent(note,{input,accepted,receivedAt=performance.now()}={}) {
  if(!recording)return null;
  const target=AppState.mode==='wait'?AppState.waitTrainer?.currentEvent:AppState.trainer.currentEvent;
  const row={sequence:events.length+1,timeMs:note.at-startedClock,at:note.at,type:note.type,channel:note.channel,
    receivedTimeMs:receivedAt-startedClock,dispatchDelayMs:Math.max(0,receivedAt-note.at),
    midi:note.midi,noteName:note.noteName,velocity:note.velocity,stringHint:note.stringHint,
    raw:[...note.raw],bendValue:note.bendValue,accepted:Boolean(accepted),
    device:{id:input?.id,name:input?.name},mode:AppState.mode,inputMode:AppState.inputMode,
    hexBase:AppState.midi.hexChannelBase,hexReverse:AppState.midi.hexChannelReverse,singleChannel:AppState.midi.singleChannel,
    extraStringTolerance:AppState.extraStringTolerance,
    filterHexSpikes:AppState.filterHexSpikes!==false,filterScoreRange:AppState.filterScoreRange===true,
    ignoreBriefErrors:AppState.midi.ignoreBriefErrors===true,minErrorMs:AppState.midi.minErrorMs,
    pitchBendRange:AppState.midi.pitchBendRange,
    scoreFileName:AppState.ui.loadedFileName,practiceTrackId:AppState.practiceTrackId,
    tick:AppState.tickPosition,targetBefore:targetInfo(target),
    phase:AppState.mode==='wait'?AppState.waitTrainer?.phase:(AppState.isPlaying?'playing':'paused')};
  const key=`${input?.id}:${note.channel}:${note.midi}`;
  if(note.type==='note-on') {
    const previous=held.get(key);
    row.previousHeldSequence=previous?.sequence??null;
    // Keep the first onset so a duplicate Note-On cannot shorten the held
    // duration reported when the eventual Note-Off arrives.
    if(!previous)held.set(key,row);
  } else if(note.type==='note-off') {
    const onset=held.get(key);
    if(onset){row.noteOnSequence=onset.sequence;row.durationMs=onset.durationMs=Math.max(0,note.at-onset.at);held.delete(key);}
  }
  events.push(row);
  revision++;
  if(events.length>=LIMIT){recording=false;reason='Capture limit reached';}
  notify();return row;
}
export function captureMidiOutcome(row,outcome) {
  if(!row)return;
  row.handlerDurationMs=Math.max(0,performance.now()-startedClock-row.receivedTimeMs);
  row.grading=outcome && typeof outcome==='object'?{
    type:outcome.type,eventId:outcome.eventId,midi:outcome.midi,wrongPitch:outcome.wrongPitch,
    complete:outcome.complete,minimumMs:outcome.minimumMs,target:targetInfo(AppState.expectedEvents.find(event=>event.id===outcome.eventId)),
    range:outcome.range?structuredClone(outcome.range):undefined,
    correction:outcome.correction?structuredClone(outcome.correction):undefined,
    pitch:outcome.pitch?structuredClone(outcome.pitch):undefined,
    trackingSpike:outcome.trackingSpike?structuredClone(outcome.trackingSpike):undefined,
  }:null;
  const target=AppState.mode==='wait'?AppState.waitTrainer?.currentEvent:AppState.trainer.currentEvent;
  row.targetAfter=targetInfo(target);
  const ids=new Set(row.targetBefore?.notes.map(n=>n.sourceNoteId)??[]);
  row.feedbackAfter=structuredClone((latestView?.marks??[]).filter(m=>row.grading?.eventId!=null && m.eventId===row.grading.eventId || ids.has(m.sourceNoteId)));
  revision++;
  notify();
}
function reportData(){return {
  format:'guitar-trainer-midi-capture',version:1,startedAt,recording,reason,
  score,events,snapshots,
};}
export function midiCaptureReport(){return structuredClone(reportData());}
// Capture the projections sent to the host; never recompute grading.
export function captureFeedbackView(marks,trainer) {
  if(!recording)return;
  latestView={target:targetInfo(trainer.currentEvent),tick:AppState.tickPosition,mode:AppState.mode,inputMode:AppState.inputMode,
    scoreFileName:AppState.ui.loadedFileName,practiceTrackId:AppState.practiceTrackId,
    visibility:{staff:AppState.ui.showNotationFeedback,tabHighlights:AppState.ui.showTabCircles,tabFrets:AppState.ui.showTabMistakes,polyInference:AppState.ui.inferPolyMistakes},
    results:structuredClone(trainer.results??null),lastFeedback:structuredClone(trainer.lastFeedback??null),
    heldSupport:structuredClone((trainer.history??[]).filter(r=>r.supportedHeldNotes?.length)
      .map(r=>({eventId:r.eventId,pass:r.pass,notes:r.supportedHeldNotes}))),
    pitchCorrections:structuredClone((trainer.history??[]).filter(r=>r.pitchCorrections?.length)
      .map(r=>({eventId:r.eventId,pass:r.pass,corrections:r.pitchCorrections}))),
    briefErrorDecisions:structuredClone((trainer.history??[]).filter(r=>r.briefErrorDecisions?.length).map(r=>({eventId:r.eventId,pass:r.pass,decisions:r.briefErrorDecisions}))),
    trackingSpikes:structuredClone((trainer.history??[]).filter(r=>r.trackingSpikes?.length)
      .map(r=>({eventId:r.eventId,pass:r.pass,corrections:r.trackingSpikes}))),
    liveWrongNotes:structuredClone(trainer.liveWrongNotes??[]),marks:structuredClone(marks)};
}
export function markMidiSnapshot(label='Screenshot') {
  if(!recording || snapshots.length>=100)return false;
  snapshots.push({number:snapshots.length+1,label,timeMs:performance.now()-startedClock,afterSequence:events.length,view:structuredClone(latestView)});
  revision++;
  notify();return true;
}
export function midiCaptureText() {
  if(textRevision===revision)return cachedText;
  const lines=['Guitar Trainer MIDI and feedback report','Started: '+(startedAt??'No recording'),
    'Score: '+(score?.fileName??''),'Messages: '+events.length+' | Snapshots: '+snapshots.length,
    'Times are milliseconds from recording start. Unknown duration means no matching release was captured.',
    'Short messages can be retained even when they disappear before a visible browser frame.',''];
  for(const row of events)lines.push('#'+row.sequence+' '+row.timeMs.toFixed(2)+'ms '+row.type+' ch'+row.channel+
    (row.midi==null?'':' '+row.noteName+' (MIDI '+row.midi+') velocity '+row.velocity)+
    (row.stringHint==null?'':' string '+row.stringHint)+(row.durationMs==null?'':' duration '+row.durationMs.toFixed(2)+'ms')+
    ' | '+(row.accepted?'accepted channel':'filtered channel')+' | '+(row.grading?.type??'no grade')+
    ' | target '+(row.targetBefore?.eventId??'none')+' → '+(row.targetAfter?.eventId??'none'));
  // Stringify the read-only evidence directly; cloning the entire recording
  // first doubles peak memory and is unnecessary in this synchronous operation.
  lines.push('','Complete evidence, expected pitches, feedback and screenshot snapshots:',JSON.stringify(reportData(),null,2));
  cachedText=lines.join('\n');textRevision=revision;return cachedText;
}
export function initMidiCaptureControls(refreshView=()=>{}){
  const start=document.getElementById('midi-capture-start'),stop=document.getElementById('midi-capture-stop'),
    mark=document.getElementById('midi-capture-mark'),copy=document.getElementById('midi-capture-copy'),
    save=document.getElementById('midi-capture-save'),status=document.getElementById('midi-capture-status'),report=document.getElementById('midi-capture-report');
  const sync=()=>{const s=captureStatus();start.disabled=s.recording;stop.disabled=!s.recording;mark.disabled=!s.recording || snapshots.length>=100;
    copy.disabled=save.disabled=!startedAt;
    status.textContent=`${s.recording?'Recording':s.reason||'Ready'} • ${s.count} MIDI messages • ${snapshots.length} snapshots`;
    if(!s.recording && startedAt && !(s.reason==='Capture limit reached' && events.at(-1)?.grading===undefined))report.value=midiCaptureText();};
  listeners.push(sync);
  start.addEventListener('click',()=>{startMidiCapture();report.value='Recording… stop to generate the text report.';refreshView();});
  stop.addEventListener('click',()=>{refreshView();stopMidiCapture();});
  mark.addEventListener('click',()=>{refreshView();markMidiSnapshot();});
  copy.addEventListener('click',async()=>{refreshView();stopMidiCapture();try{await navigator.clipboard.writeText(report.value);status.textContent+=' • Copied';}
    catch {report.focus();report.select();status.textContent+=' • Press Ctrl+C to copy the selected report';}});
  save.addEventListener('click',()=>{
    refreshView();stopMidiCapture();
    const url=URL.createObjectURL(new Blob([midiCaptureText()],{type:'text/plain'}));
    const link=document.createElement('a');link.href=url;link.download='guitar-trainer-midi-'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt';
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });sync();
}
