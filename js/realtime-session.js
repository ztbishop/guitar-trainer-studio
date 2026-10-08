// A score-independent, attack-based realtime evaluator. No MIDI device or UI APIs.
import { TimingDefaults, isWithinHitWindow } from './practice-timing.js';

export class RealtimeSession {
  constructor(events, { hex = false, timing = TimingDefaults, latencyMs = 0 } = {}) {
    this.events = events;
    this.timing = { ...timing };
    this.latencyMs = latencyMs;
    this.hex = hex;
    this.reset(0);
  }
  reset(scoreMs = 0, speed = 1) {
    this.records = this.events.map(event => {
      const slots = new Map();
      for (const note of event.notes) {
        const key = this.hex ? `${note.midi}:${note.string ?? ''}` : String(note.midi);
        if (!slots.has(key)) slots.set(key,{ midi:note.midi, string:note.string, noteIds:[], hit:null, missed:false });
        slots.get(key).noteIds.push(note.id);
      }
      return {eventId:event.id, timeMs:event.startTimeMs, slots:[...slots.values()], firstHitMs:null, wrong:0, skipped:event.startTimeMs + this.timing.lateMs*speed < scoreMs};
    });
    this.wrongNotes = [];
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
        if (missing.length) this.lastFeedback = {type:'missed',eventId:record.eventId,pitches:missing.map(slot=>slot.midi)};
      }
      this.finalizeIndex++;
    }
  }
  noteOn(note, scoreMs, speed = 1) {
    if (!this.started || this.completed || !Number.isFinite(scoreMs)) return null;
    const correctedMs = scoreMs-this.latencyMs*speed;
    // Finalization uses the same compensated clock, allowing delayed device input.
    this.advance(correctedMs,speed);
    const candidates=[];
    for (const record of this.records) {
      if (record.skipped) continue;
      const deltaMs=(correctedMs-record.timeMs)/speed;
      if (!isWithinHitWindow(deltaMs,this.timing)) continue;
      const slot=record.slots.find(slot=>!slot.hit && !slot.missed && slot.midi===note.midi);
      const duplicateChannel=this.hex && record.slots.some(slot=>slot.hit?.channel===note.channel && slot.midi===note.midi);
      const chordFits=record.firstHitMs===null || Math.abs(correctedMs-record.firstHitMs)/speed<=this.timing.chordGroupingMs;
      if(slot && !duplicateChannel && chordFits) candidates.push({record,slot,deltaMs});
    }
    candidates.sort((a,b)=>Math.abs(a.deltaMs)-Math.abs(b.deltaMs) || a.record.timeMs-b.record.timeMs);
    if(candidates.length) {
      const {record,slot,deltaMs}=candidates[0];
      slot.hit={at:note.at,scoreMs:correctedMs,deltaMs,channel:note.channel,stringHint:note.stringHint??null};
      record.firstHitMs ??= correctedMs;
      return this.lastFeedback={type:'correct',eventId:record.eventId,midi:note.midi,deltaMs,noteIds:slot.noteIds};
    }
    const nearest=this.records.filter(r=>!r.skipped && isWithinHitWindow((correctedMs-r.timeMs)/speed,this.timing))
      .sort((a,b)=>Math.abs(a.timeMs-correctedMs)-Math.abs(b.timeMs-correctedMs))[0];
    if(nearest) nearest.wrong++;
    const wrong={type:'wrong',eventId:nearest?.eventId??null,midi:note.midi,at:note.at,scoreMs:correctedMs};
    this.wrongNotes.push(wrong);
    return this.lastFeedback=wrong;
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
