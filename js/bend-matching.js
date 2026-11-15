// Pure pitch matching and one-attack/one-slot assignment. No MIDI routing or UI.
export function validBendRange(range,base) {
  return range && Number.isFinite(range.min) && Number.isFinite(range.max) &&
    range.min<=base && range.max>=base && range.min<range.max;
}

export function acceptsSlot(slot,note,allow=true) {
  if(!allow || !validBendRange(slot.bendRange,slot.midi))return slot.midi===note.midi;
  const pitch=Number.isFinite(note.soundingMidi)?note.soundingMidi:note.midi;
  // At most one MIDI pitch-wheel step at the configured range; never round a
  // fractional written bend outward to another semitone.
  const epsilon=Number.isFinite(note.pitchBendRange)?note.pitchBendRange/8192:0;
  return pitch>=slot.bendRange.min-epsilon && pitch<=slot.bendRange.max+epsilon;
}

export function matchesRecord(record,note,allow=true) {
  return record?.slots.some(slot=>acceptsSlot(slot,note,allow))??false;
}

// Find an augmenting path through earlier accepted attacks. This avoids making
// a chord depend on strum order when two written bend ranges overlap.
export function attackAssignment(slots,note,{allow=true,hex=false,correcting=false}={}) {
  if(hex && slots.some(s=>s.hit && s.channel===note.channel &&
      (s.attackInput?.midi??s.midi)===note.midi))return null;
  const seen=new Set(),moves=[];
  const place=(input,credit=null)=>{
    const candidates=slots.filter(s=>!seen.has(s) && (!s.missed || correcting) && acceptsSlot(s,input,allow))
      .sort((a,b)=>Number(b.midi===input.midi)-Number(a.midi===input.midi) ||
        ((a.bendRange?.max-a.bendRange?.min)||0)-((b.bendRange?.max-b.bendRange?.min)||0) ||
        Number(Boolean(a.hit))-Number(Boolean(b.hit)));
    for(const slot of candidates) {
      seen.add(slot);
      if(!slot.hit || slot.evidence==='attack' && slot.attackInput && place(slot.attackInput,{
        hit:slot.hit,channel:slot.channel,hitAt:slot.hitAt,evidence:slot.evidence,
      })) {
        moves.push({slot,input,credit});return true;
      }
    }
    return false;
  };
  return place(note)?moves:null;
}
