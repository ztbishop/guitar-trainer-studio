// Per-channel MIDI pitch interpretation only. No score, grading or UI access.
export const PITCH_SETTLE_MS=60;
export const validPitchRange=value=>[0,2,12,24].includes(value);
const KEY='gts.waitHexPitchBendRange';
export function readPitchRange(storage) {
  try {const raw=(storage??globalThis.localStorage)?.getItem(KEY);const value=['0','2','12','24'].includes(raw)?Number(raw):12;
    return validPitchRange(value)?value:12;}catch{return 12;}
}
export function savePitchRange(value,storage) {
  if(!validPitchRange(value))return;
  try{(storage??globalThis.localStorage)?.setItem(KEY,String(value));}catch{}
}
export class MidiPitchState {
  constructor(range=12){this.range=validPitchRange(range)?range:12;this.bends=new Map();}
  bend(note){if(Number.isFinite(note.bendValue))this.bends.set(note.channel,note.bendValue);}
  interpret(note) {
    const rawMidi=note.rawMidi??note.midi,bendValue=this.bends.get(note.channel)??0;
    const soundingMidi=rawMidi+bendValue*this.range/8192;
    return {...note,rawMidi,bendValue,pitchBendRange:this.range,soundingMidi,midi:Math.round(soundingMidi)};
  }
}
