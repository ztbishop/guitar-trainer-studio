// Evidence-based Wait Hex tolerance, never a fret limit or an attack generator.
export const HEX_SPIKE_LIMITS=Object.freeze({velocity:20,durationMs:70,followMs:200,distance:9,transientMs:5,settleMs:20});
export function spikeCandidate(event,note,feedback,record,index,at) {
  if(feedback?.type!=='wrong' || !feedback.wrongPitch || event?.isPercussive ||
      !Number.isInteger(note.channel) || note.channel<1 || note.channel>16 ||
      !Number.isInteger(note.stringHint) || !Number.isFinite(at) ||
      !Number.isFinite(note.velocity) || note.velocity<=0 || note.velocity>127)return null;
  const pitches=[...new Set(event.notes.filter(n=>!n.isDead && n.string===note.stringHint).map(n=>n.midi))];
  if(pitches.length!==1)return null;
  const wrong=record.wrongNotes.find(n=>n.channel===note.channel && n.at===at && n.rawMidi===note.rawMidi);
  return wrong?{index,at,rawMidi:note.rawMidi,velocity:note.velocity,expected:pitches[0],distance:Math.abs(note.midi-pitches[0]),wrong,retries:record.retries}:null;
}
export function confirmedSpike(candidate,note,feedback,record,index,at) {
  if(!candidate || candidate.index!==index || candidate.retries!==record.retries ||
      !['correct','ignored-collected-tone'].includes(feedback?.type) ||
      note.midi!==candidate.expected ||
      !Number.isFinite(note.velocity) || !Number.isFinite(candidate.releasedAt) ||
      candidate.releasedAt<candidate.at || candidate.releasedAt>at ||
      candidate.releasedAt-candidate.at>HEX_SPIKE_LIMITS.durationMs ||
      at<candidate.at || at-candidate.at>HEX_SPIKE_LIMITS.followMs ||
      !record.wrongNotes.includes(candidate.wrong))return null;
  const duration=candidate.releasedAt-candidate.at,follow=at-candidate.at;
  const softDistant=candidate.velocity<=HEX_SPIKE_LIMITS.velocity && candidate.distance>=HEX_SPIKE_LIMITS.distance && note.velocity>=2*candidate.velocity;
  // A released 2–5 ms false onset immediately replaced by the written tone
  // is distinct from an ordinary short note or a sustained wrong fingering.
  const transient=duration<=HEX_SPIKE_LIMITS.transientMs && follow<=HEX_SPIKE_LIMITS.settleMs && note.velocity>=candidate.velocity;
  if(!softDistant && !transient)return null;
  return {reason:softDistant?'soft-distant-spike':'released-onset-transient',rawMidi:candidate.rawMidi,fromMidi:candidate.wrong.midi,toMidi:note.midi,channel:note.channel,
    stringHint:note.stringHint,velocity:candidate.velocity,durationMs:candidate.releasedAt-candidate.at,
    attackAt:candidate.at,at,followMs:at-candidate.at};
}

// A soft accepted single can be a precursor to the same physical attack.
// Reconcile only its immediate stronger retrigger across one target boundary.
export function acceptedSinglePrecursor(event,note,feedback,index,at) {
  if(feedback?.type!=='correct' || !feedback.complete || event?.isPercussive || event?.notes?.length!==1 ||
      !Number.isFinite(at) || !Number.isInteger(note.channel) || !Number.isInteger(note.stringHint) ||
      note.stringHint!==event.notes[0].string || !Number.isFinite(note.velocity) ||
      note.velocity<=0 || note.velocity>20)return null;
  return {index,eventId:event.id,at,midi:note.midi,rawMidi:note.rawMidi,channel:note.channel,stringHint:note.stringHint,velocity:note.velocity};
}
export function confirmedPreviousOnset(previous,event,note,index,at) {
  if(!previous || index!==previous.index+1 || !event || event.isPercussive ||
      event.notes.some(n=>n.midi===note.midi) || note.channel!==previous.channel ||
      note.stringHint!==previous.stringHint || note.midi!==previous.midi || note.rawMidi!==previous.rawMidi ||
      !Number.isFinite(note.velocity) || note.velocity<2*previous.velocity ||
      !Number.isFinite(previous.releasedAt) || previous.releasedAt<previous.at || previous.releasedAt>at ||
      previous.releasedAt-previous.at>70 || at<previous.at || at-previous.at>60 || at-previous.releasedAt>20)return null;
  return {reason:'previous-soft-onset-retrigger',previousEventId:previous.eventId,rawMidi:previous.rawMidi,
    midi:note.midi,channel:note.channel,stringHint:note.stringHint,velocity:previous.velocity,
    replacementVelocity:note.velocity,durationMs:previous.releasedAt-previous.at,followMs:at-previous.at,
    releaseGapMs:at-previous.releasedAt,attackAt:previous.at,at};
}
