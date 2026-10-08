// Untimed attack collection for a gated note-for-note session. No transport/UI APIs.
export class WaitSession {
  constructor(events, {hex=false} = {}) {
    this.records=events.map(event=>{
      const slots=new Map();
      for (const note of event.notes) {
        const key=hex ? `${note.midi}:${note.string??''}` : String(note.midi);
        if (!slots.has(key)) slots.set(key,{midi:note.midi,noteIds:[],channel:null,hit:false});
        slots.get(key).noteIds.push(note.id);
      }
      return {eventId:event.id,slots:[...slots.values()],wrong:0,skipped:false};
    });
    this.hex=hex;this.lastFeedback=null;
  }
  skipBefore(index) { this.records.forEach((r,i)=>r.skipped=i<index); }
  noteOn(index,note) {
    const record=this.records[index];if(!record || record.skipped) return null;
    const duplicate=this.hex && record.slots.some(s=>s.hit && s.midi===note.midi && s.channel===note.channel);
    const slot=record.slots.find(s=>!s.hit && s.midi===note.midi);
    if(!slot || duplicate) {record.wrong++;return this.lastFeedback={type:'wrong',eventId:record.eventId,midi:note.midi,complete:false};}
    slot.hit=true;slot.channel=note.channel;
    return this.lastFeedback={type:'correct',eventId:record.eventId,midi:note.midi,noteIds:slot.noteIds,complete:record.slots.every(s=>s.hit)};
  }
  stats() {
    const records=this.records.filter(r=>!r.skipped);const slots=records.flatMap(r=>r.slots);
    const correct=slots.filter(s=>s.hit).length;const wrong=records.reduce((n,r)=>n+r.wrong,0);
    return {correct,wrong,missed:0,pending:slots.length-correct,total:slots.length,accuracy:correct+wrong?Math.round(100*correct/(correct+wrong)):null};
  }
}
