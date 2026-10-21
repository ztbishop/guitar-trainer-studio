// A score-independent, attack-based realtime evaluator. No MIDI device or UI APIs.
import { TimingDefaults, isWithinHitWindow } from './practice-timing.js';
import {inferPolyExpectedNoteIds} from './poly-feedback.js';
import {attackSlots,ignoresMutedString} from './attack-rules.js';

export class RealtimeSession {
  constructor(events, { hex = false, timing = TimingDefaults, latencyMs = 0, extraStringTolerance = 'off' } = {}) {
    this.events = events;
    this.timing = { ...timing };
    this.latencyMs = latencyMs;
    this.hex = hex;
    this.extraStringTolerance = extraStringTolerance;
    this.reset(0);
  }
  reset(scoreMs = 0, speed = 1) {
    this.records = this.events.map(event => {
      return {eventId:event.id, event, timeMs:event.startTimeMs, slots:attackSlots(event,this.hex,null), firstHitMs:null, wrong:0, wrongNotes:[], finalized:false, skipped:event.startTimeMs + this.timing.lateMs*speed < scoreMs};
    });
    this.wrongNotes = [];
    this.liveWrong = new Map();
    this.lastFeedback = null;
    this.started = false;
    this.completed = false;
    this.anchor = null;
    this.finalizeIndex = 0;
  }
  anchorPosition(scoreMs, at, speed = 1) {
    this.anchor = { scoreMs, at, speed };
  }
  scoreTime(at) {
    return this.anchor ? this.anchor.scoreMs + (at-this.anchor.at)*this.anchor.speed : null;
  }
  advance(scoreMs, speed = 1) {
    if (!this.started || this.completed) return;
    while (this.finalizeIndex < this.records.length) {
      const record = this.records[this.finalizeIndex];
      if (scoreMs <= record.timeMs + this.timing.lateMs*speed) break;
      if (!record.skipped) {
        const missing = record.slots.filter(slot=>!slot.hit && !slot.missed);
        missing.forEach(slot=>slot.missed=true);
        if (missing.length) this.lastFeedback = {type:'missed',eventId:record.eventId,pitches:missing.map(slot=>slot.midi),isPercussive:record.event.isPercussive};
      }
      record.finalized=true;
      this.finalizeIndex++;
    }
  }
  noteOn(note, scoreMs, speed = 1) {
    if (!this.started || this.completed || !Number.isFinite(scoreMs)) return null;
    const correctedMs = scoreMs-this.latencyMs*speed;
    // Finalization uses the same compensated clock, allowing delayed device input.
    this.advance(correctedMs,speed);
    const nearby=this.records.filter(r=>!r.skipped && isWithinHitWindow((correctedMs-r.timeMs)/speed,this.timing))
      .sort((a,b)=>Math.abs(a.timeMs-correctedMs)-Math.abs(b.timeMs-correctedMs));
    const nearest=nearby[0];
    if(nearest && ignoresMutedString(nearest.event,note,this.hex,this.extraStringTolerance))
      return {type:'ignored-muted-string',eventId:nearest.eventId,midi:note.midi};
    if(nearest?.event.isPercussive && nearest.slots[0].hit)return {type:'ignored-strum-tail',eventId:nearest.eventId,midi:note.midi};
    const candidates=[];
    for (const record of this.records) {
      if (record.skipped) continue;
      const deltaMs=(correctedMs-record.timeMs)/speed;
      if (!isWithinHitWindow(deltaMs,this.timing)) continue;
      if(record.event.isPercussive && record!==nearest)continue;
      if(ignoresMutedString(record.event,note,this.hex,this.extraStringTolerance))continue;
      const slot=record.slots.find(slot=>!slot.hit && !slot.missed && (record.event.isPercussive || slot.midi===note.midi));
      const duplicateChannel=this.hex && record.slots.some(slot=>slot.hit?.channel===note.channel && slot.midi===note.midi);
      const chordFits=record.firstHitMs===null || Math.abs(correctedMs-record.firstHitMs)/speed<=this.timing.chordGroupingMs;
      if(slot && !duplicateChannel && chordFits) candidates.push({record,slot,deltaMs});
    }
    // Finish an already-started chord within its existing grouping tolerance
    // before assigning its remaining tones to a nearby future occurrence.
    const ongoing=c=>c.record.slots.length>1 && c.record.firstHitMs!==null;
    candidates.sort((a,b)=>Number(ongoing(b))-Number(ongoing(a)) || Math.abs(a.deltaMs)-Math.abs(b.deltaMs) || a.record.timeMs-b.record.timeMs);
    if(candidates.length) {
      const {record,slot,deltaMs}=candidates[0];
      slot.hit={at:note.at,scoreMs:correctedMs,deltaMs,channel:note.channel,stringHint:note.stringHint??null};
      record.firstHitMs ??= correctedMs;
      return this.lastFeedback={type:'correct',eventId:record.eventId,midi:note.midi,deltaMs,noteIds:slot.noteIds};
    }
    if(nearest) nearest.wrong++;
    const wrong={type:'wrong',eventId:nearest?.eventId??null,midi:note.midi,at:note.at,scoreMs:correctedMs,
      channel:note.channel,stringHint:note.stringHint??null,wrongPitch:Boolean(nearest && !nearest.slots.some(s=>s.midi===note.midi))};
    if(wrong.wrongPitch) {
      if(!this.hex)wrong.inferredNoteIds=inferPolyExpectedNoteIds(nearest.slots);
      nearest.wrongNotes.push({...wrong});this.liveWrong.set(`${note.channel}:${note.midi}`,{...wrong});
    }
    this.wrongNotes.push(wrong);
    return this.lastFeedback=wrong;
  }
  noteOff(note) { return this.liveWrong.delete(`${note.channel}:${note.midi}`); }
  feedbackHistory() {
    return this.records.filter(r=>!r.skipped).map(r=>({eventId:r.eventId,completed:r.finalized,
      wrongNotes:r.wrongNotes.map(n=>({...n})),pass:1}));
  }
  finish() {
    if (!this.started) return;
    this.advance(Infinity);
    this.completed=true;
  }
  stats() {
    const slots=this.records.filter(r=>!r.skipped).flatMap(r=>r.slots);
    const correct=slots.filter(s=>s.hit).length;
    const missed=slots.filter(s=>s.missed).length;
    const wrong=this.wrongNotes.length;
    const graded=correct+missed;
    return {correct,missed,wrong,pending:slots.length-graded,total:slots.length,accuracy:graded+wrong ? Math.round(100*correct/(graded+wrong)) : null};
  }
  recordFor(id) { return this.records.find(record=>record.eventId===id); }
}
