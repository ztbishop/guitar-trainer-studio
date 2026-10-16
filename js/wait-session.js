// Untimed attack collection for a gated note-for-note session. No transport/UI APIs.
import {inferPolyExpectedNoteIds} from './poly-feedback.js';
import {attackSlots,ignoresMutedString} from './attack-rules.js';
import {TimingDefaults} from './practice-timing.js';
export class WaitSession {
  constructor(events, {hex=false,chordMode='collect',chordWindowMs=200,allowMutedStringNoise=false} = {}) {
    this.events=events;this.allowMutedStringNoise=allowMutedStringNoise;this.tail=null;
    this.records=events.map(event=>{
      return {eventId:event.id,slots:attackSlots(event,hex,false),wrong:0,wrongNotes:[],retries:0,attemptStartAt:null,skipped:false,burst:null};
    });
    this.hex=hex;this.lastFeedback=null;this.liveWrong=new Map();
    this.chordMode=chordMode==='together'?'together':'collect';
    this.chordWindowMs=Number.isFinite(chordWindowMs)&&chordWindowMs>=50&&chordWindowMs<=1000?chordWindowMs:200;
  }
  skipBefore(index) { this.records.forEach((r,i)=>r.skipped=i<index); }
  expire(index,at) {
    const record=this.records[index];
    if(this.chordMode!=='together' || !record || record.skipped || record.slots.length<=1 ||
        record.attemptStartAt===null || !Number.isFinite(at) || at-record.attemptStartAt<=this.chordWindowMs ||
        record.slots.every(s=>s.hit))return false;
    record.slots.forEach(slot=>{slot.hit=false;slot.channel=null});
    record.attemptStartAt=null;record.retries++;
    this.lastFeedback={type:'retry',eventId:record.eventId,complete:false};return true;
  }
  noteOn(index,note,at=note.at??0) {
    const record=this.records[index];if(!record || record.skipped) return null;
    const event=this.events[index],key=this.hex?`${note.channel}:${note.midi}`:String(note.midi);
    // Collect may finish on the low strings of a fresh strum after earlier partial
    // hits. Its remaining old chord tones belong to that strum, not the next gate.
    // Pitched tails use repeated identities to recognize a new gesture. X tails
    // can change pitch repeatedly on one string, so retain the whole burst until
    // a quiet gap or a fresh attack on its starting identity. Singles have no guard.
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
          return {type:'ignored-strum-tail',eventId:this.records[index-1].eventId,midi:note.midi,complete:false};
        }
        if(tail.seen.has(identity))this.tail=null;
      }
    } else this.tail=null;
    if(ignoresMutedString(event,note,this.hex,this.allowMutedStringNoise))return {type:'ignored-muted-string',eventId:event.id,midi:note.midi,complete:false};
    const identity=this.hex?String(note.channel):String(note.midi);
    const window=Math.min(200,this.chordWindowMs);
    if(!record.burst || at-record.burst.at>window || record.burst.keys.has(key))record.burst={at,keys:new Set(),seen:new Set()};
    record.burst.keys.add(key);record.burst.seen.add(identity);
    const expiredAttempt=this.expire(index,at);
    const duplicate=this.hex && record.slots.some(s=>s.hit && s.midi===note.midi && s.channel===note.channel);
    const slot=record.slots.find(s=>!s.hit && (event.isPercussive || s.midi===note.midi));
    if(!slot || duplicate) {
      const wrongPitch=!record.slots.some(s=>s.midi===note.midi);
      // Replaying a collected tone cannot fill another Hex unison slot and does
      // not add a penalty while the learner supplies the missing chord tones.
      if(!wrongPitch)return {type:'ignored-collected-tone',eventId:record.eventId,midi:note.midi,complete:false};
      record.wrong++;
      const feedback={type:'wrong',eventId:record.eventId,midi:note.midi,channel:note.channel,
        stringHint:note.stringHint??null,at,wrongPitch,complete:false};
      if(wrongPitch) {
        if(!this.hex)feedback.inferredNoteIds=inferPolyExpectedNoteIds(record.slots);
        record.wrongNotes.push({...feedback});
        this.liveWrong.set(`${note.channel}:${note.midi}`,{...feedback});
      }
      return this.lastFeedback=feedback;
    }
    slot.hit=true;slot.channel=note.channel;
    record.attemptStartAt??=at;
    const complete=record.slots.every(s=>s.hit);
    if(complete && (record.slots.length>1 || event.isPercussive))this.tail={index,at:record.burst.at,window,
      lastAt:at,firstIdentity:record.burst.seen.values().next().value,
      seen:new Set(record.burst.seen),pitches:new Set(record.slots.map(s=>s.midi)),percussive:event.isPercussive};
    return this.lastFeedback={type:'correct',eventId:record.eventId,midi:note.midi,noteIds:slot.noteIds,expiredAttempt,complete};
  }
  noteOff(note) {
    return this.liveWrong.delete(`${note.channel}:${note.midi}`);
  }
  clearLiveWrong() { this.liveWrong.clear(); }
  feedbackHistory(pass=1) {
    return this.records.filter(r=>!r.skipped).map(record=>({eventId:record.eventId,pass,
      completed:record.slots.every(s=>s.hit),
      outcome:record.slots.every(s=>s.hit)?(record.wrongNotes.length?'completed-with-errors':'completed-clean'):'pending',
      wrongNotes:record.wrongNotes.map(note=>({...note})),retries:record.retries}));
  }
  stats() {
    const records=this.records.filter(r=>!r.skipped);const slots=records.flatMap(r=>r.slots);
    const correct=slots.filter(s=>s.hit).length;const wrong=records.reduce((n,r)=>n+r.wrong,0);
    const retries=records.reduce((n,r)=>n+r.retries,0);
    return {correct,wrong,retries,missed:0,pending:slots.length-correct,total:slots.length,accuracy:correct+wrong?Math.round(100*correct/(correct+wrong)):null};
  }
}
