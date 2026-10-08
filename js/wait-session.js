// Untimed attack collection for a gated note-for-note session. No transport/UI APIs.
export class WaitSession {
  constructor(events, {hex=false,chordMode='collect',chordWindowMs=200} = {}) {
    this.records=events.map(event=>{
      const slots=new Map();
      for (const note of event.notes) {
        const key=hex ? `${note.midi}:${note.string??''}` : String(note.midi);
        if (!slots.has(key)) slots.set(key,{midi:note.midi,noteIds:[],channel:null,hit:false});
        slots.get(key).noteIds.push(note.id);
      }
      return {eventId:event.id,slots:[...slots.values()],wrong:0,retries:0,attemptStartAt:null,skipped:false};
    });
    this.hex=hex;this.lastFeedback=null;
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
    const expiredAttempt=this.expire(index,at);
    const duplicate=this.hex && record.slots.some(s=>s.hit && s.midi===note.midi && s.channel===note.channel);
    const slot=record.slots.find(s=>!s.hit && s.midi===note.midi);
    if(!slot || duplicate) {record.wrong++;return this.lastFeedback={type:'wrong',eventId:record.eventId,midi:note.midi,complete:false};}
    slot.hit=true;slot.channel=note.channel;
    record.attemptStartAt??=at;
    return this.lastFeedback={type:'correct',eventId:record.eventId,midi:note.midi,noteIds:slot.noteIds,expiredAttempt,complete:record.slots.every(s=>s.hit)};
  }
  stats() {
    const records=this.records.filter(r=>!r.skipped);const slots=records.flatMap(r=>r.slots);
    const correct=slots.filter(s=>s.hit).length;const wrong=records.reduce((n,r)=>n+r.wrong,0);
    const retries=records.reduce((n,r)=>n+r.retries,0);
    return {correct,wrong,retries,missed:0,pending:slots.length-correct,total:slots.length,accuracy:correct+wrong?Math.round(100*correct/(correct+wrong)):null};
  }
}
