// Evidence-based Wait Hex tolerance, never a fret limit or an attack generator.
export const HEX_SPIKE_LIMITS=Object.freeze({velocity:20,durationMs:70,followMs:200,distance:9});
export function spikeCandidate(event,note,feedback,record,index,at) {
  if(feedback?.type!=='wrong' || !feedback.wrongPitch || event?.isPercussive ||
      !Number.isInteger(note.channel) || note.channel<1 || note.channel>16 ||
      !Number.isInteger(note.stringHint) || !Number.isFinite(at) ||
      !Number.isFinite(note.velocity) || note.velocity<=0 || note.velocity>HEX_SPIKE_LIMITS.velocity)return null;
  const pitches=[...new Set(event.notes.filter(n=>!n.isDead && n.string===note.stringHint).map(n=>n.midi))];
  if(pitches.length!==1 || Math.abs(note.midi-pitches[0])<HEX_SPIKE_LIMITS.distance)return null;
  const wrong=record.wrongNotes.find(n=>n.channel===note.channel && n.at===at && n.rawMidi===note.rawMidi);
  return wrong?{index,at,rawMidi:note.rawMidi,velocity:note.velocity,expected:pitches[0],wrong,retries:record.retries}:null;
}
export function confirmedSpike(candidate,note,feedback,record,index,at) {
  if(!candidate || candidate.index!==index || candidate.retries!==record.retries ||
      !['correct','ignored-collected-tone'].includes(feedback?.type) ||
      note.midi!==candidate.expected || note.velocity<2*candidate.velocity ||
      !Number.isFinite(note.velocity) || !Number.isFinite(candidate.releasedAt) ||
      candidate.releasedAt<candidate.at || candidate.releasedAt>at ||
      candidate.releasedAt-candidate.at>HEX_SPIKE_LIMITS.durationMs ||
      at<candidate.at || at-candidate.at>HEX_SPIKE_LIMITS.followMs ||
      !record.wrongNotes.includes(candidate.wrong))return null;
  return {rawMidi:candidate.rawMidi,fromMidi:candidate.wrong.midi,toMidi:note.midi,channel:note.channel,
    stringHint:note.stringHint,velocity:candidate.velocity,durationMs:candidate.releasedAt-candidate.at,
    attackAt:candidate.at,at,followMs:at-candidate.at};
}
