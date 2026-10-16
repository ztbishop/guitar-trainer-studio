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
  constructor(range=12){this.range=validPitchRange(range)?range:12;this.reset();}
  reset(){this.bends=new Map();this.anchors=new Map();this.active=new Map();}
  noteOn(note) {
    const rawMidi=note.rawMidi??note.midi,anchor=this.anchors.get(note.channel);
    // A correction for one raw base note cannot transpose another note. Keep
    // only an observed onset correction when that exact raw base is repeated.
    if(anchor && anchor.rawMidi!==rawMidi)this.anchors.delete(note.channel);
    this.active.set(note.channel,{rawMidi,at:note.at});
    return this.interpret(note);
  }
  noteOff(note) {
    if(this.active.get(note.channel)?.rawMidi===(note.rawMidi??note.midi))this.active.delete(note.channel);
  }
  bend(note) {
    if(!Number.isFinite(note.bendValue))return;
    this.bends.set(note.channel,note.bendValue);
    const attack=this.active.get(note.channel);
    if(attack && Number.isFinite(note.at) && note.at>=attack.at && note.at-attack.at<=PITCH_SETTLE_MS)
      this.anchors.set(note.channel,{rawMidi:attack.rawMidi,bendValue:note.bendValue});
    else this.anchors.delete(note.channel);
  }
  interpret(note) {
    const rawMidi=note.rawMidi??note.midi,anchor=this.anchors.get(note.channel);
    const bendValue=anchor?.rawMidi===rawMidi?anchor.bendValue:0;
    const soundingMidi=rawMidi+bendValue*this.range/8192;
    return {...note,rawMidi,bendValue,channelBendValue:this.bends.get(note.channel)??0,
      pitchBendRange:this.range,soundingMidi,midi:Math.round(soundingMidi)};
  }
}
