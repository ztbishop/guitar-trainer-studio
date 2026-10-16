// Shared score attack semantics. No device, UI or native API access.
export function attackSlots(event,hex,hit) {
  if(event.isPercussive)return [{midi:null,string:null,noteIds:event.notes.map(n=>n.id),channel:null,hit,missed:false}];
  const slots=new Map();
  for(const note of event.notes) {
    const key=hex?`${note.midi}:${note.string??''}`:String(note.midi);
    if(!slots.has(key))slots.set(key,{midi:note.midi,string:note.string,noteIds:[],channel:null,hit,missed:false});
    slots.get(key).noteIds.push(note.id);
  }
  return [...slots.values()];
}

export function ignoresMutedString(event,note,hex,enabled) {
  // Only configured six-string Hex chord input can identify an omitted string.
  // Ignored input must neither penalize nor fill a required pitch on another string.
  return Boolean(hex && enabled && !event.isPercussive && event.stringCount===6 && event.notes.length>1 &&
    Number.isInteger(note.stringHint) && note.stringHint>=1 && note.stringHint<=6 &&
    event.notes.every(n=>Number.isInteger(n.string) && n.string>=1 && n.string<=6) &&
    !event.notes.some(n=>n.string===note.stringHint));
}
