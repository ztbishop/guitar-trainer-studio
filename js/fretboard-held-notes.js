// Display-only provenance for accepted MIDI attacks. Never changes input,
// session records, grading, or the independent score/tab projections.
export class FretboardHeldNotes {
  constructor(){this.accepted=new WeakMap();this.ungradedAttacks=new WeakSet();}
  isUngraded(note){return this.ungradedAttacks.has(note);}
  remember(event,outcome,activeNotes,{events=[],noteStates={}}={}) {
    if(event.type==='note-on' && !outcome) {
      const source=activeNotes.get(`${event.channel}:${event.midi}`);
      if(source){this.ungradedAttacks.add(source);return true;}
    }
    let noteIds=outcome?.noteIds;
    if(event.type==='note-on' && outcome?.type==='ignored-collected-tone') {
      // The evaluator already recognizes a replay of a collected pitch. Link
      // this new physical attack to existing credit, without creating any.
      noteIds=events.find(target=>target.id===outcome.eventId)?.notes
        .filter(note=>note.midi===outcome.midi && ['correct','completed-with-errors'].includes(noteStates[note.id]))
        .map(note=>note.id);
    } else if(!['correct','pitch-corrected'].includes(outcome?.type))return false;
    if(!noteIds?.length)return false;
    const rawMidi=event.type==='note-on'?event.midi:outcome.correction?.rawMidi;
    const source=activeNotes.get(`${event.channel}:${rawMidi}`);
    if(!source)return false;
    this.ungradedAttacks.delete(source);
    this.accepted.set(source,{eventId:outcome.eventId,midi:outcome.midi,noteIds:[...noteIds]});
    return true;
  }
  visible(activeNotes,trainer) {
    return activeNotes.filter(note=>{
      const accepted=this.accepted.get(note);
      if(!accepted || accepted.eventId===trainer.currentEvent?.id)return true;
      // Results reset/loop/seek can invalidate earlier attribution. Do not
      // suppress fresh or unclassified input merely because its pitch matches.
      if(!accepted.noteIds.some(id=>['correct','completed-with-errors'].includes(trainer.noteStates?.[id])))return true;
      if(trainer.liveWrongNotes?.some(wrong=>((wrong.rawMidi??wrong.midi)===note.midi || wrong.midi===accepted.midi) &&
        (wrong.channel==null || wrong.channel===note.channel)))return true;
      // Current held-note credit remains green on the active target.
      return trainer.currentEvent?.notes.some(target=>target.midi===(accepted.midi??note.midi) && trainer.noteStates?.[target.id]==='correct')??false;
    });
  }
}
