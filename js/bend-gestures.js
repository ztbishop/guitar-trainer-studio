// A bounded continuation guard for converters that re-key a bend as notes.
// Continuous pitch-wheel messages themselves never create attacks.
const RELEASE_GAP_MS=60;
export class BendGestures {
  constructor(){this.clear();}
  clear(){this.notes=new Map();this.active=new Map();}
  forgetRecord(record){for(const [key,g] of this.notes)if(g.record===record)this.notes.delete(key);}
  key(note){return `${note.channel}:${note.rawMidi??note.midi}`;}
  remember(record,slot,input,event) {
    const key=this.key(input);
    const old=this.notes.get(key);
    if(!slot.bendRange && !slot.hasVibrato){if(old?.at===input.at)this.notes.delete(key);return;}
    const source=event.notes.find(n=>slot.noteIds.includes(n.id));
    const duration=(source?.endTimeMs-source?.startTimeMs)/(input._speed??1);
    this.notes.set(key,{record,slot,channel:input.channel,rawMidi:input.rawMidi??input.midi,
      midi:input.midi,at:input.at,releasedAt:null,
      expiresAt:input.at+Math.max(200,Number.isFinite(duration)&&duration>0?duration:1000),
      ...(old?.at===input.at?{releasedAt:old.releasedAt}:{}),
    });
  }
  release(note) {
    const key=this.key(note);this.active.delete(key);
    const gesture=this.notes.get(key);
    if(gesture && Number.isFinite(note.at))gesture.releasedAt=note.at;
  }
  attack(note,{hex=false}={}) {
    const key=this.key(note),at=note.at;
    for(const [id,g] of this.notes)if(at>g.expiresAt || !g.slot.hit ||
        g.releasedAt!==null && at-g.releasedAt>RELEASE_GAP_MS)this.notes.delete(id);
    // A repeated pitch is a new attack. In Poly, simultaneous unreleased notes
    // are independent chord evidence; only a unique released predecessor links.
    const candidates=[...this.notes.entries()].filter(([id,g])=>id!==key && g.channel===note.channel &&
      at>=g.at && g.midi!==note.midi && (g.releasedAt!==null && at>=g.releasedAt || hex && this.active.has(id)) &&
      (g.slot.bendRange ? note.midi>=g.slot.bendRange.min && note.midi<=g.slot.bendRange.max :
        g.slot.hasVibrato && Math.abs(note.midi-g.slot.midi)<=1));
    this.notes.delete(key);
    if(hex)for(const [id,active] of this.active)if(active.channel===note.channel)this.active.delete(id);
    this.active.set(key,note);
    if(candidates.length!==1) {
      // Contradictory input consumes a released predecessor. Hex also replaces
      // the old string voice; neither can resurrect a stale bend on a later note.
      for(const [id,g] of this.notes)if(g.channel===note.channel && (hex || g.releasedAt!==null))this.notes.delete(id);
      return null;
    }
    const [oldKey,g]=candidates[0];this.notes.delete(oldKey);
    const continuing={...g,rawMidi:note.rawMidi??note.midi,midi:note.midi,releasedAt:null};
    this.notes.set(key,continuing);
    return {type:'ignored-bend-continuation',eventId:g.record.eventId,midi:note.midi,
      noteIds:[...g.slot.noteIds],writtenBendRange:true,continuation:'linked-note-change',complete:false};
  }
}
