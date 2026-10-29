// Timed attack matching, sharing input-tolerance rules with the untimed session.
import {TimingDefaults,realtimeHitWindow,realtimeWindowExpired} from './practice-timing.js';
import {inferPolyExpectedNoteIds} from './poly-feedback.js';
import {attackSlots,ignoresMutedString} from './attack-rules.js';
import {WaitSession} from './wait-session.js';
import {supportedHeldTone} from './wait-chord-gesture.js';

export class RealtimeSession extends WaitSession {
  constructor(events,options={}) {
    super(events,options);
    this.options=options;this.timing={...TimingDefaults,...options.timing};this.latencyMs=options.latencyMs??0;
    this.reset(0);
  }
  reset(scoreMs=0,speed=1) {
    // Reinitialize tolerance evidence without retaining held notes across attempts.
    const clean=new WaitSession(this.events,this.options);
    for(const key of ['held','pitch','pitchAttacks','spikeCandidates','singlePrecursors','pendingErrors','activeBriefErrors'])this[key]=clean[key];
    this.records=this.events.map((event,index)=>({eventId:event.id,event,timeMs:event.startTimeMs,slots:attackSlots(event,this.hex,null),
      firstHitMs:null,wrong:0,wrongNotes:[],retries:0,burst:null,finalized:false,
      skipped:realtimeWindowExpired(this.window(index,speed),scoreMs)}));
    this.orphanWrong=[];this.orphanRecord={wrong:0,wrongNotes:this.orphanWrong};this.liveWrong=new Map();this.lastFeedback=null;this.started=false;this.completed=false;
    this.anchor=null;this.finalizeIndex=0;this.lastClock=null;this.clockAt=0;this.finishRequested=false;this.pauseOffset=0;this.pausedAt=null;
  }
  get wrongNotes(){return [...this.orphanWrong.filter(n=>!n.pending),...this.records.flatMap(r=>r.wrongNotes.filter(n=>!n.pending))];}
  anchorPosition(scoreMs,at,speed=1){this.anchor={scoreMs,at,speed};}
  scoreTime(at){return this.anchor?this.anchor.scoreMs+(at-this.anchor.at)*this.anchor.speed:null;}
  setRunning(running,at){
    if(!running && this.pausedAt===null){this.pausedAt=at;this.pauseEvidence();}
    if(running && this.pausedAt!==null){this.pauseOffset+=Math.max(0,at-this.pausedAt);this.pausedAt=null;}
  }
  eventTime(at){return (this.pausedAt??at)-this.pauseOffset;}
  window(index,speed){return realtimeHitWindow(this.events[index],this.events[index+1],speed,this.timing);}
  pauseEvidence(){this.held.clear();this.pitch.reset();this.pitchAttacks.clear();this.spikeCandidates.clear();this.singlePrecursors.clear();}
  advance(scoreMs,speed=1,at=null) {
    if(!this.started || this.completed)return;
    if(Number.isFinite(at))this.clockAt=at;
    else if(Number.isFinite(scoreMs)&&this.lastClock)this.clockAt=this.lastClock.at+(scoreMs-this.lastClock.scoreMs)/speed;
    this.flushPendingErrors(this.clockAt);
    for(let i=this.finalizeIndex;i<this.records.length;i++){
      const r=this.records[i];
      if(r.skipped || r.finalized)continue;
      const support=supportedHeldTone(this.events,this.records,this.held,i,this.clockAt,{...this,realtime:true,chordWindowMs:this.timing.chordGroupingMs});
      const window=this.window(i,speed);
      if(support && scoreMs>=window.start && !realtimeWindowExpired(window,scoreMs)){
        const noteIds=[];
        for(const {slot,source} of support.supports){slot.hit={at:this.clockAt,channel:source.channel};slot.channel=source.channel;slot.evidence='held';slot.originAt=source.originAt??source.hitAt;noteIds.push(...slot.noteIds);}
        this.lastFeedback={type:'supported-held-tone',eventId:r.eventId,noteIds,complete:true};
      }
    }
    while(this.finalizeIndex<this.records.length){
      const r=this.records[this.finalizeIndex];if(!realtimeWindowExpired(this.window(this.finalizeIndex,speed),scoreMs))break;
      if(!r.skipped){const missing=r.slots.filter(s=>!s.hit&&!s.missed);missing.forEach(s=>s.missed=true);
        if(missing.length)this.lastFeedback={type:'missed',eventId:r.eventId,pitches:missing.map(s=>s.midi),isPercussive:r.event.isPercussive};}
      r.finalized=true;this.finalizeIndex++;
    }
    if(this.finishRequested&&!this.pendingErrors.size)this.completed=true;
  }
  selectTarget(note,correctedMs,speed){
    // The current pending pitch wins over an early repeat. Only the immediate
    // next onset may use early grace, so fast passages cannot skip ahead.
    const next=this.records.find(r=>r.timeMs>correctedMs);
    const nearby=this.records.filter((r,index)=>{
      const window=this.window(index,speed);
      return !r.skipped&&!r.finalized&&(r.timeMs<=correctedMs || r===next) &&
        correctedMs>=window.start&&!realtimeWindowExpired(window,correctedMs);
    }).sort((a,b)=>a.timeMs-b.timeMs);
    const nearest=nearby[0];
    if(nearest&&(ignoresMutedString(nearest.event,note,this.hex,this.extraStringTolerance)||nearest.event.isPercussive))return nearest;
    const candidates=nearby.filter(r=>!r.event.isPercussive&&!ignoresMutedString(r.event,note,this.hex,this.extraStringTolerance)&&
      r.slots.some(s=>!s.hit&&!s.missed&&s.midi===note.midi)&&
      !(this.hex&&r.slots.some(s=>s.hit?.channel===note.channel&&s.midi===note.midi)));
    return candidates[0]??nearest;
  }
  noteOn(note,scoreMs,speed=1){
    if(!this.started||this.completed||!Number.isFinite(scoreMs))return null;
    const correctedMs=scoreMs-this.latencyMs*speed,at=note.at??correctedMs/speed;
    // Incoming attacks get first chance before held-note settlement.
    this.clockAt=at;this.lastClock={scoreMs:correctedMs,at};
    this.flushPendingErrors(at);
    const preview=this.hex?this.pitch.interpret(note):note;
    const record=this.selectTarget(preview,correctedMs,speed);
    this.inputClock={scoreMs:correctedMs,speed};
    if(!record){this.advance(correctedMs,speed,at);const wrong={type:'wrong',eventId:null,midi:note.midi,channel:note.channel,at,scoreMs:correctedMs,wrongPitch:false};if(this.ignoreBriefErrors){wrong.pending=true;this.pendingErrors.set(wrong,this.orphanRecord);this.activeBriefErrors.set(wrong,this.orphanRecord);}else this.orphanRecord.wrong++;
      this.orphanWrong.push(wrong);return this.lastFeedback={...wrong,type:wrong.pending?'pending-off-target':'wrong'};}
    const result=super.noteOn(this.records.indexOf(record),{...note,at,_scoreMs:correctedMs,_speed:speed},at);
    this.advance(correctedMs,speed,at);return result;
  }
  grade(index,note,at,correcting=false){
    const r=this.records[index],event=r.event,{scoreMs,speed}=this.inputClock;
    if(!r||r.skipped)return null;
    if(this.hex)for(const [key,value] of this.held)if(value.channel===note.channel)this.held.delete(key);
    this.held.set(note.channel+':'+note.midi,{...note,at});
    if(ignoresMutedString(event,note,this.hex,this.extraStringTolerance))return {type:'ignored-muted-string',eventId:r.eventId,midi:note.midi};
    if(event.isPercussive&&r.slots[0].hit)return {type:'ignored-strum-tail',eventId:r.eventId,midi:note.midi};
    if(!correcting){
      if(!r.burst||at-r.burst.at>this.timing.chordGroupingMs)r.burst={at,lastAt:at,wrong:false};
      r.burst.lastAt=at;
    }
    if(correcting)for(const s of r.slots)if(!s.hit&&s.midi===note.midi)s.missed=false;
    const slot=r.slots.find(s=>!s.hit&&!s.missed&&(event.isPercussive||s.midi===note.midi));
    const duplicate=this.hex&&r.slots.some(s=>s.hit?.channel===note.channel&&s.midi===note.midi);
    if(slot&&!duplicate){
      const deltaMs=(scoreMs-r.timeMs)/speed;
      slot.hit={at,scoreMs,deltaMs,channel:note.channel,stringHint:note.stringHint??null};
      slot.channel=note.channel;slot.hitAt=at;slot.evidence='attack';delete slot.originAt;r.firstHitMs??=scoreMs;
      return this.lastFeedback={type:'correct',eventId:r.eventId,midi:note.midi,deltaMs,noteIds:slot.noteIds,complete:r.slots.every(s=>s.hit)};
    }
    const wrong={type:'wrong',eventId:r.eventId,midi:note.midi,rawMidi:note.rawMidi,channel:note.channel,stringHint:note.stringHint??null,at,scoreMs,wrongPitch:!r.slots.some(s=>s.midi===note.midi)};
    if(!this.hex&&wrong.wrongPitch)wrong.inferredNoteIds=inferPolyExpectedNoteIds(r.slots);
    if(this.ignoreBriefErrors){wrong.pending=true;this.pendingErrors.set(wrong,r);this.activeBriefErrors.set(wrong,r);}else r.wrong++;
    r.wrongNotes.push(wrong);r.burst.wrong=true;
    if(wrong.wrongPitch&&!wrong.pending)this.liveWrong.set(note.channel+':'+note.midi,{...wrong});
    return this.lastFeedback=wrong;
  }
  pitchBend(note,at=note.at??0,currentIndex=null,allowCorrection=true){
    const attack=this.pitchAttacks.get(note.channel);
    if(attack){const r=this.records[attack.index];this.inputClock={scoreMs:attack.note._scoreMs??r.timeMs,speed:attack.note._speed??1};}
    if(!this.hex && note.bendValue!==0)for(const [key,value] of this.held)if(value.channel===note.channel)this.held.delete(key);
    return super.pitchBend(note,at,attack?.index,allowCorrection);
  }
  feedbackHistory(){return super.feedbackHistory().map(r=>({...r,wrongNotes:r.wrongNotes.filter(n=>n.wrongPitch),completed:this.recordFor(r.eventId).finalized}));}
  finish(){if(!this.started)return;this.finishRequested=true;this.advance(Infinity);}
  recordFor(id){return this.records.find(r=>r.eventId===id);}
  stats(){const slots=this.records.filter(r=>!r.skipped).flatMap(r=>r.slots),correct=slots.filter(s=>s.hit).length,missed=slots.filter(s=>s.missed).length,wrong=this.wrongNotes.length;
    return {correct,missed,wrong,pending:slots.length-correct-missed,total:slots.length,...(slots.some(s=>s.evidence==='held')?{supportedHeld:slots.filter(s=>s.evidence==='held').length}:{}),accuracy:correct+missed+wrong?Math.round(100*correct/(correct+missed+wrong)):null};}
}
