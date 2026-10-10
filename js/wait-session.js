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
      return {eventId:event.id,slots:[...slots.values()],wrong:0,wrongNotes:[],retries:0,attemptStartAt:null,skipped:false};
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
    const expiredAttempt=this.expire(index,at);
    const duplicate=this.hex && record.slots.some(s=>s.hit && s.midi===note.midi && s.channel===note.channel);
    const slot=record.slots.find(s=>!s.hit && s.midi===note.midi);
    if(!slot || duplicate) {
      // Repeated/duplicate required tones retain the prior scoring penalty, but
      // they are not received-wrong pitches and must not turn a solved tab red.
      const wrongPitch=!record.slots.some(s=>s.midi===note.midi);
      record.wrong++;
      const feedback={type:'wrong',eventId:record.eventId,midi:note.midi,channel:note.channel,
        stringHint:note.stringHint??null,at,wrongPitch,complete:false};
      if(wrongPitch) {
        record.wrongNotes.push({...feedback});
        this.liveWrong.set(`${note.channel}:${note.midi}`,{...feedback});
      }
      return this.lastFeedback=feedback;
    }
    slot.hit=true;slot.channel=note.channel;
    record.attemptStartAt??=at;
    return this.lastFeedback={type:'correct',eventId:record.eventId,midi:note.midi,noteIds:slot.noteIds,expiredAttempt,complete:record.slots.every(s=>s.hit)};
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
