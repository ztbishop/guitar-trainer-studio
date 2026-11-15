// Shared score attack semantics. No device, UI or native API access.
import {validBendRange} from './bend-matching.js';
export function attackSlots(event,hex,hit) {
  if(event.isPercussive)return [{midi:null,string:null,noteIds:event.notes.map(n=>n.id),channel:null,hit,missed:false}];
  const slots=new Map();
  for(const note of event.notes) {
    const key=hex?`${note.midi}:${note.string??''}`:String(note.midi);
    if(!slots.has(key))slots.set(key,{midi:note.midi,string:note.string,noteIds:[],channel:null,hit,missed:false,
      ...(validBendRange(note.bendRange,note.midi)?{bendRange:{...note.bendRange}}:{}),hasVibrato:Boolean(note.hasVibrato)});
    const slot=slots.get(key);
    if(slot.noteIds.length && slot.bendRange) {
      // Existing Poly unisons share a slot. Only pitches accepted by every
      // written member may satisfy it; a bend cannot widen an unbent partner.
      const range=validBendRange(note.bendRange,note.midi)?note.bendRange:{min:note.midi,max:note.midi};
      slot.bendRange={min:Math.max(slot.bendRange.min,range.min),max:Math.min(slot.bendRange.max,range.max)};
      if(!validBendRange(slot.bendRange,slot.midi))delete slot.bendRange;
    }
    slot.noteIds.push(note.id);
  }
  return [...slots.values()];
}

export function ignoresMutedString(event,note,hex,tolerance) {
  // String-specific forgiveness needs configured six-string Hex identity.
  if(!hex || event.isPercussive || event.stringCount!==6 ||
      !Number.isInteger(note.stringHint) || note.stringHint<1 || note.stringHint>6 ||
      !event.notes.every(n=>Number.isInteger(n.string) && n.string>=1 && n.string<=6))return false;
  const strings=[...new Set(event.notes.map(n=>n.string))];
  // A required pitched string stays graded, even in conflicting voices.
  if(strings.includes(note.stringHint))return false;
  if(event.mutedStrings?.includes(note.stringHint))return true;
  if(strings.length<2)return false;
  return tolerance==='all' || tolerance==='internal' &&
    note.stringHint>Math.min(...strings) && note.stringHint<Math.max(...strings);
}
