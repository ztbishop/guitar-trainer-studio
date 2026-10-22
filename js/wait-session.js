// Untimed attack collection for a gated note-for-note session. No transport/UI APIs.
import {briefErrorMs} from './brief-error-filter.js';
import {inferPolyExpectedNoteIds} from './poly-feedback.js';
import {attackSlots,ignoresMutedString} from './attack-rules.js';
import {TimingDefaults} from './practice-timing.js';
import {supportedHeldTone,refreshHeldEvidence} from './wait-chord-gesture.js';
import {MidiPitchState,PITCH_SETTLE_MS} from './midi-pitch.js';
import {outsideScoreRange} from './score-range-filter.js';
import {spikeCandidate,confirmedSpike,acceptedSinglePrecursor,confirmedPreviousOnset} from './hex-tracking-spikes.js';
export class WaitSession {
  constructor(events, {hex=false,chordMode='collect',chordWindowMs=200,extraStringTolerance='off',heldNoteTolerance='one',filterHexSpikes=true,filterScoreRange=false,ignoreBriefErrors=false,minErrorMs=30,rangeStaves=[],pitchBendRange=12,pitchState=null} = {}) {
    this.heldNoteTolerance=heldNoteTolerance;this.events=events;this.extraStringTolerance=extraStringTolerance;this.tail=null;
    this.records=events.map(event=>{
      return {eventId:event.id,slots:attackSlots(event,hex,false),wrong:0,wrongNotes:[],retries:0,attemptStartAt:null,skipped:false,burst:null};
    });
    this.ignoreBriefErrors=ignoreBriefErrors===true;this.minErrorMs=briefErrorMs(minErrorMs);this.pendingErrors=new Map();this.activeBriefErrors=new Map();
    this.hex=hex;this.lastFeedback=null;this.liveWrong=new Map();this.held=new Map();
    this.filterScoreRange=filterScoreRange;this.rangeStaves=rangeStaves;
    this.filterHexSpikes=filterHexSpikes;this.spikeCandidates=new Map();this.singlePrecursors=new Map();
    this.pitch=pitchState??new MidiPitchState(pitchBendRange);this.pitchAttacks=new Map();
    this.pitch.reset();
    this.chordMode=chordMode==='together'?'together':'collect';
    this.chordWindowMs=Number.isFinite(chordWindowMs)&&chordWindowMs>=50&&chordWindowMs<=1000?chordWindowMs:200;
  }
  skipBefore(index) { this.records.forEach((r,i)=>r.skipped=i<index); }
  expire(index,at) {
    const record=this.records[index];
    if(this.chordMode!=='together' || !record || record.skipped || record.slots.length<=1 ||
        record.attemptStartAt===null || !Number.isFinite(at) || at-record.attemptStartAt<=this.chordWindowMs ||
        record.slots.every(s=>s.hit))return false;
    record.slots.forEach(slot=>{slot.hit=false;slot.channel=null;delete slot.heldRefresh;delete slot.originAt;});
    record.attemptStartAt=null;record.retries++;
    this.lastFeedback={type:'retry',eventId:record.eventId,complete:false};return true;
  }
  noteOn(index,note,at=note.at??0) {
    this.flushPendingErrors(at);
    const previous=this.singlePrecursors.get(note.channel);
    this.singlePrecursors.delete(note.channel);
    const candidate=this.spikeCandidates.get(note.channel);
    this.spikeCandidates.delete(note.channel);
    const played=this.hex?this.pitch.noteOn({...note,at}):note;
    const retrigger=this.hex && this.filterHexSpikes?confirmedPreviousOnset(previous,this.events[index],played,index,at):null;
    if(retrigger) {
      for(const [key,value] of this.held)if(value.channel===note.channel)this.held.delete(key);
      this.pitchAttacks.delete(note.channel);
      (this.records[index].trackingSpikes??=[]).push(retrigger);
      return this.lastFeedback={type:'ignored-previous-onset',eventId:this.events[index].id,midi:played.midi,trackingSpike:retrigger,complete:false};
    }
    const range=this.filterScoreRange?outsideScoreRange(this.events[index],played,this.rangeStaves,{hex:this.hex}):null;
    if(range) {
      if(this.hex)for(const [key,value] of this.held)if(value.channel===note.channel)this.held.delete(key);
      this.pitchAttacks.delete(note.channel);
      return this.lastFeedback={type:'ignored-score-range',eventId:this.events[index].id,midi:played.midi,range,complete:false};
    }
    const feedback=this.grade(index,played,at);
    if(this.hex && this.filterHexSpikes && feedback) {
      const record=this.records[index];
      const correction=confirmedSpike(candidate,played,feedback,record,index,at);
      if(correction) {
        this.removeWrong(record,candidate.wrong);
        if(record.burst)record.burst.wrong=record.wrongNotes.some(n=>n.at>=record.burst.at);
        (record.trackingSpikes??=[]).push(correction);feedback.trackingSpike=correction;
        this.lastFeedback=feedback;
      }
      const precursor=acceptedSinglePrecursor(this.events[index],played,feedback,index,at);
      if(precursor)this.singlePrecursors.set(note.channel,precursor);
      const pending=spikeCandidate(this.events[index],played,feedback,record,index,at);
      if(pending)this.spikeCandidates.set(note.channel,pending);
    }
    if(feedback && this.hex)feedback.pitch={rawMidi:played.rawMidi,soundingMidi:played.soundingMidi,
      midi:played.midi,bendValue:played.bendValue,channelBendValue:played.channelBendValue,range:this.pitch.range};
    if(this.hex)this.pitchAttacks.set(note.channel,{note:{...note,at},index,at,feedback});
    if(feedback?.type==='wrong' && this.records[index].wrongNotes.some(n=>n.pending && n.at===at && n.channel===note.channel)) {
      return this.lastFeedback={...feedback,type:'pending-off-target',minimumMs:this.minErrorMs};
    }
    return feedback;
  }
  removeWrong(record,wrong) {
    record.wrongNotes.splice(record.wrongNotes.indexOf(wrong),1);
    if(!wrong.pending)record.wrong--;
    this.pendingErrors.delete(wrong);this.activeBriefErrors.delete(wrong);
    this.liveWrong.delete(wrong.channel+':'+wrong.midi);
  }
  flushPendingErrors(at) {
    let changed=false;
    for(const [entry,record] of this.pendingErrors)if(Number.isFinite(at) && at-entry.at>=this.minErrorMs) {
      this.pendingErrors.delete(entry);delete entry.pending;record.wrong++;changed=true;
      if(entry.wrongPitch && this.held.has(entry.channel+':'+entry.midi))this.liveWrong.set(entry.channel+':'+entry.midi,{...entry});
      if(this.lastFeedback?.type==='pending-off-target' && this.lastFeedback.eventId===entry.eventId && this.lastFeedback.at===entry.at)this.lastFeedback={...entry};
      (record.briefErrorDecisions??=[]).push({type:'counted-off-target',midi:entry.midi,rawMidi:entry.rawMidi,channel:entry.channel,attackAt:entry.at,at,minimumMs:this.minErrorMs});
    }
    return changed;
  }
  grade(index,note,at,correcting=false) {
    const record=this.records[index];if(!record || record.skipped) return null;
    const event=this.events[index],key=this.hex?`${note.channel}:${note.midi}`:String(note.midi);
    // Hex channels describe monophonic strings. A changed pitch invalidates the
    // old held evidence even if the source omitted its release.
    if(this.hex)for(const [heldKey,value] of this.held)if(value.channel===note.channel)this.held.delete(heldKey);
    this.held.set(`${note.channel}:${note.midi}`,{...note,at});
    // Collect may finish on the low strings of a fresh strum after earlier partial
    // hits. Its remaining old chord tones belong to that strum, not the next gate.
    // Pitched tails use repeated identities to recognize a new gesture. X tails
    // can change pitch repeatedly on one string, so retain the whole burst until
    // a quiet gap or a fresh attack on its starting identity. Singles have no guard.
    if(!correcting) {
      if(this.tail && this.tail.index===index-1 && at>=this.tail.at && at-this.tail.at<=this.tail.window) {
        const tail=this.tail,identity=this.hex?String(note.channel):String(note.midi);
        if(tail.percussive) {
          const gap=TimingDefaults.chordGroupingMs;
          const fresh=at-tail.lastAt>=gap || (identity===tail.firstIdentity && at-tail.at>=gap);
          if(!fresh) {
            tail.lastAt=at;
            return {type:'ignored-strum-tail',eventId:this.records[index-1].eventId,midi:note.midi,complete:false};
          }
          this.tail=null;
        } else {
          if(!tail.seen.has(identity) && tail.pitches.has(note.midi)) {
            tail.seen.add(identity);
            if(this.heldNoteTolerance==='multiple')refreshHeldEvidence(this.records[index-1],note,at,this.hex);
            return {type:'ignored-strum-tail',eventId:this.records[index-1].eventId,midi:note.midi,complete:false};
          }
          if(tail.seen.has(identity))this.tail=null;
        }
      } else this.tail=null;
    }
    if(ignoresMutedString(event,note,this.hex,this.extraStringTolerance))return {type:'ignored-muted-string',eventId:event.id,midi:note.midi,complete:false};
    const identity=this.hex?String(note.channel):String(note.midi);
    const window=Math.min(200,this.chordWindowMs);
    if(!correcting) {
      if(!record.burst || at-record.burst.at>window || record.burst.keys.has(key))record.burst={at,keys:new Set(),seen:new Set(),wrong:false};
      record.burst.lastAt=at;
      record.burst.keys.add(key);record.burst.seen.add(identity);
    }
    const expiredAttempt=this.expire(index,at);
    const duplicate=this.hex && record.slots.some(s=>s.hit && s.midi===note.midi && s.channel===note.channel);
    const slot=record.slots.find(s=>!s.hit && (event.isPercussive || s.midi===note.midi));
    if(!slot || duplicate) {
      const wrongPitch=!record.slots.some(s=>s.midi===note.midi);
      // Replaying a collected tone cannot fill another Hex unison slot and does
      // not add a penalty while the learner supplies the missing chord tones.
      if(!wrongPitch){
        if(this.heldNoteTolerance==='multiple')refreshHeldEvidence(record,note,at,this.hex);
        return {type:'ignored-collected-tone',eventId:record.eventId,midi:note.midi,complete:false};
      }
      record.burst.wrong=true;
      if(!this.ignoreBriefErrors)record.wrong++;
      const feedback={type:'wrong',eventId:record.eventId,midi:note.midi,channel:note.channel,
        rawMidi:note.rawMidi,stringHint:note.stringHint??null,at,wrongPitch,complete:false};
      if(wrongPitch) {
        if(!this.hex)feedback.inferredNoteIds=inferPolyExpectedNoteIds(record.slots);
        record.wrongNotes.push({...feedback});
        const entry=record.wrongNotes.at(-1);
        if(this.ignoreBriefErrors){entry.pending=true;this.pendingErrors.set(entry,record);this.activeBriefErrors.set(entry,record);}
        else this.liveWrong.set(note.channel+':'+note.midi,{...feedback});
      }
      return this.lastFeedback=feedback;
    }
    slot.hit=true;slot.channel=note.channel;slot.hitAt=at;slot.evidence='attack';delete slot.originAt;delete slot.heldRefresh;
    record.attemptStartAt??=at;
    const complete=record.slots.every(s=>s.hit);
    if(complete && (record.slots.length>1 || event.isPercussive))this.tail={index,at:record.burst.at,window,
      lastAt:at,firstIdentity:record.burst.seen.values().next().value,
      seen:new Set(record.burst.seen),pitches:new Set(record.slots.map(s=>s.midi)),percussive:event.isPercussive};
    return this.lastFeedback={type:'correct',eventId:record.eventId,midi:note.midi,noteIds:slot.noteIds,expiredAttempt,complete};
  }
  settle(index,at) {
    const supported=supportedHeldTone(this.events,this.records,this.held,index,at,this);
    if(!supported)return null;
    const record=this.records[index],noteIds=[];
    for(const {slot,source} of supported.supports){
      slot.hit=true;slot.channel=source.channel;slot.evidence='held';slot.originAt=source.originAt??source.hitAt;delete slot.heldRefresh;
      noteIds.push(...slot.noteIds);
    }
    const {slot}=supported.supports[0];
    // All fresh tones have already arrived; none of them is carried to the next
    // target. Held support is recorded separately from a received MIDI attack.
    this.tail=null;
    return this.lastFeedback={type:'supported-held-tone',eventId:record.eventId,midi:slot.midi,
      channel:slot.channel,noteIds,at,complete:true};
  }
  noteOff(note) {
    let briefChanged=false;
    for(const [entry,record] of this.activeBriefErrors)if(entry.channel===note.channel && (entry.rawMidi??entry.midi)===note.midi && Number.isFinite(note.at) && note.at>=entry.at && note.at-entry.at<this.minErrorMs) {
      this.removeWrong(record,entry);
      if(record.burst)record.burst.wrong=record.wrongNotes.some(n=>n.at>=record.burst.at);
      const decision={type:'ignored-brief-off-target',midi:entry.midi,rawMidi:entry.rawMidi,channel:entry.channel,attackAt:entry.at,at:note.at,durationMs:note.at-entry.at,minimumMs:this.minErrorMs};
      (record.briefErrorDecisions??=[]).push(decision);
      this.lastFeedback={...decision,eventId:entry.eventId,complete:false};briefChanged=true;
    }
    briefChanged=this.flushPendingErrors(note.at)||briefChanged;
    for(const [entry] of this.activeBriefErrors)if(entry.channel===note.channel && (entry.rawMidi??entry.midi)===note.midi)this.activeBriefErrors.delete(entry);
    const precursor=this.singlePrecursors.get(note.channel);
    if(precursor?.rawMidi===note.midi && precursor.releasedAt===undefined)precursor.releasedAt=note.at;
    const candidate=this.spikeCandidates.get(note.channel);
    if(candidate?.rawMidi===note.midi && candidate.releasedAt===undefined)candidate.releasedAt=note.at;
    this.pitch.noteOff(note);
    if(this.pitchAttacks.get(note.channel)?.note.midi===note.midi)this.pitchAttacks.delete(note.channel);
    for(const [key,value] of this.held)if(value.channel===note.channel && (value.rawMidi??value.midi)===note.midi)this.held.delete(key);
    let changed=briefChanged;
    for(const [key,value] of this.liveWrong)if(value.channel===note.channel && (value.rawMidi??value.midi)===note.midi){this.liveWrong.delete(key);changed=true;}
    return changed;
  }
  pitchBend(note,at=note.at??0,currentIndex=null,allowCorrection=true) {
    if(!this.hex)return null;
    if(note.bendValue!==0)this.singlePrecursors.delete(note.channel);
    this.pitch.bend({...note,at});
    // Continuous bends do not create attacks. Only reconcile a wrong onset
    // during its short initial pitch-settling interval, on its original target.
    const attack=this.pitchAttacks.get(note.channel),old=attack?.feedback;
    if(allowCorrection && old?.type==='wrong' && old.wrongPitch && at>=attack.at && at-attack.at<=PITCH_SETTLE_MS) {
      const played=this.pitch.interpret(attack.note),record=this.records[attack.index];
      const wrong=record.wrongNotes.find(n=>n.channel===note.channel && n.at===attack.at && n.rawMidi===played.rawMidi);
      if(wrong && played.midi!==wrong.midi) {
        const correction={rawMidi:played.rawMidi,fromMidi:wrong.midi,toMidi:played.midi,bendValue:played.bendValue,
          range:this.pitch.range,channel:note.channel,attackAt:attack.at,at,
          matched:record.slots.some(s=>s.midi===played.midi)};
        (record.pitchCorrections??=[]).push(correction);
        if(!correction.matched) {
          const live=this.liveWrong.delete(`${wrong.channel}:${wrong.midi}`);
          wrong.midi=played.midi;old.midi=played.midi;
          if(live)this.liveWrong.set(`${wrong.channel}:${wrong.midi}`,{...wrong});
          this.lastFeedback={...old};
          if(note.bendValue!==0)for(const [key,value] of this.held)if(value.channel===note.channel)this.held.delete(key);
          return {...old,type:'pitch-updated',correction,complete:false};
        }
        this.removeWrong(record,wrong);
        if(record.burst)record.burst.wrong=record.wrongNotes.some(n=>n.at>=record.burst.at);
        const tail=this.tail,result=this.grade(attack.index,played,attack.at,true);
        if(attack.index!==currentIndex)this.tail=tail;
        attack.feedback=result;
        return this.lastFeedback={...result,type:'pitch-corrected',correction,
          complete:attack.index===currentIndex && Boolean(result.complete)};
      }
    }
    if(note.bendValue===0)return null;
    for(const [key,value] of this.held)if(value.channel===note.channel)this.held.delete(key);
    return null;
  }
  clearLiveWrong() { this.liveWrong.clear(); }
  feedbackHistory(pass=1) {
    return this.records.filter(r=>!r.skipped).map(record=>({eventId:record.eventId,pass,
      completed:record.slots.every(s=>s.hit),
      outcome:record.slots.every(s=>s.hit)?(record.wrongNotes.some(n=>!n.pending)?'completed-with-errors':'completed-clean'):'pending',
      supportedHeldNotes:record.slots.filter(s=>s.evidence==='held').map(s=>({midi:s.midi,channel:s.channel,noteIds:[...s.noteIds],evidence:'held',freshAttack:false})),
      pitchCorrections:(record.pitchCorrections??[]).map(c=>({...c})),
      trackingSpikes:(record.trackingSpikes??[]).map(c=>({...c})),
      briefErrorDecisions:(record.briefErrorDecisions??[]).map(d=>({...d})),
      pendingErrorCount:record.wrongNotes.filter(n=>n.pending).length,
      wrongNotes:record.wrongNotes.filter(n=>!n.pending).map(note=>({...note})),retries:record.retries}));
  }
  stats() {
    const records=this.records.filter(r=>!r.skipped);const slots=records.flatMap(r=>r.slots);
    const correct=slots.filter(s=>s.hit).length;const wrong=records.reduce((n,r)=>n+r.wrong,0);
    const retries=records.reduce((n,r)=>n+r.retries,0);
    return {correct,wrong,retries,missed:0,pending:slots.length-correct,total:slots.length,
      supportedHeld:slots.filter(s=>s.evidence==='held').length,accuracy:correct+wrong?Math.round(100*correct/(correct+wrong)):null};
  }
}
