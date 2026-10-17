// Device identity/validated browser preferences only; no MIDI or grading calls.
export const MIDI_DEVICES_KEY='gts.midiDevices';
export const MIDI_DEVICE_DEFAULTS={inputMode:'single-channel',singleChannel:'any',hexChannelBase:1,
  hexChannelReverse:false,pitchBendRange:12,latencyMs:0};
const identity=input=>input && typeof input.id==='string' && input.id.length>0
  ?{id:input.id,name:typeof input.name==='string'?input.name:'',manufacturer:typeof input.manufacturer==='string'?input.manufacturer:''}:null;
const label=d=>JSON.stringify([d.name.trim().toLowerCase(),d.manufacturer.trim().toLowerCase()]);
export function validateMidiSettings(value={}) {
  const s={...MIDI_DEVICE_DEFAULTS};
  if(['single-channel','hex-6ch'].includes(value?.inputMode))s.inputMode=value.inputMode;
  if(value?.singleChannel==='any' || typeof value?.singleChannel==='string' && /^(?:[1-9]|1[0-6])$/.test(value.singleChannel))s.singleChannel=value.singleChannel;
  if(typeof value?.hexChannelReverse==='boolean')s.hexChannelReverse=value.hexChannelReverse;
  if(Number.isInteger(value?.hexChannelBase))s.hexChannelBase=value.hexChannelBase;
  s.hexChannelBase=Math.max(s.hexChannelReverse?6:1,Math.min(s.hexChannelReverse?16:11,s.hexChannelBase));
  if([0,2,12,24].includes(value?.pitchBendRange))s.pitchBendRange=value.pitchBendRange;
  if(Number.isFinite(value?.latencyMs))s.latencyMs=Math.max(0,Math.min(1000,value.latencyMs));
  return s;
}
export class MidiDevicePreferences {
  constructor(storage) {
    this.storage=storage;this.profiles=[];this.lastInput=null;
    try {
      this.storage??=globalThis.window?.localStorage??globalThis.localStorage;
      const data=JSON.parse(this.storage?.getItem(MIDI_DEVICES_KEY)??'null');
      if(data?.version!==1)return;
      this.lastInput=identity(data.lastInput);
      if(Array.isArray(data.profiles))for(const entry of data.profiles.slice(-64)) {
        const device=identity(entry?.device);if(!device)continue;
        this.profiles=this.profiles.filter(p=>p.device.id!==device.id);
        this.profiles.push({device,settings:validateMidiSettings(entry.settings)});
      }
    }catch{/* Blocked/invalid storage still permits an in-memory session. */}
  }
  persist() {
    try{this.storage?.setItem(MIDI_DEVICES_KEY,JSON.stringify({version:1,lastInput:this.lastInput,profiles:this.profiles}));}catch{}
  }
  profile(input) {return this.profiles.find(p=>p.device.id===input.id)??null;}
  resolve(inputs) {
    if(!this.lastInput)return null;
    let device=inputs.find(p=>p.id===this.lastInput.id);
    if(!device && this.lastInput.name) {
      const matches=inputs.filter(p=>label(p)===label(this.lastInput));
      if(matches.length===1)device=matches[0];
    }
    return device?{device,settings:this.profile(this.lastInput)?.settings??MIDI_DEVICE_DEFAULTS,previousId:this.lastInput.id}:null;
  }
  remember(input,settings,preferred=false,previousId=input.id) {
    const device=identity(input);if(!device)return;
    this.profiles=this.profiles.filter(p=>p.device.id!==device.id && p.device.id!==previousId);
    this.profiles.push({device,settings:validateMidiSettings(settings)});this.profiles=this.profiles.slice(-64);
    if(preferred)this.lastInput=device;
    this.persist();
  }
  selectNone(){this.lastInput=null;this.persist();}
}
