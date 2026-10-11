// Guided physical-string/channel check, independent of score/grading.
const names=['high E','B','G','D','A','low E'];
const storageKey='guitar-trainer-string-setups-v1';
export class StringSetup {
  constructor(storage) {this.storage=storage;this.saved={};this.step=null;this.key='';this.message='';
    try {const data=JSON.parse(storage?.getItem(storageKey)??'{}');if(data && typeof data==='object' && !Array.isArray(data))this.saved=data;} catch {} }
  configure(device,base,hex=true) {
    const key=hex && device?JSON.stringify([device,base]):'';
    if(key!==this.key) {this.key=key;this.step=null;this.message='';}
    return Boolean(this.key && this.saved[this.key]===true);
  }
  start() {if(!this.key)return false;delete this.saved[this.key];this.persist();this.step=6;this.message='';return true;}
  cancel() {this.step=null;this.message='String check cancelled. Check all six strings to enable fret feedback.';}
  consume(note,base) {
    if(this.step===null)return false;
    if(note.type!=='note-on')return true;
    const expected=base+6-this.step;
    if(note.channel!==expected) {
      this.message=`Received channel ${note.channel}; this string needs channel ${expected}. Check the base channel and your device's per-string MIDI settings.`;
      return true;
    }
    this.message='';this.step--;
    if(this.step===0) {this.step=null;this.saved[this.key]=true;this.persist();this.message='All six strings checked. Fret feedback is ready.';}
    return true;
  }
  persist() {try {this.storage?.setItem(storageKey,JSON.stringify(this.saved));} catch {}}
  get verified() {return Boolean(this.key && this.saved[this.key]===true);}
  get prompt() {return this.step===null?this.message:(this.message?`${this.message} `:'')+`Play only string ${this.step} (${names[this.step-1]}), then release it. ${6-this.step}/6 checked.`;}
}

export function createStringSetup({state,button,status,storage,busy,pause=()=>{},onChange}) {
  const setup=new StringSetup(storage);
  const sync=()=>{
    setup.configure(state.midi.activeInputId,Number(state.midi.hexChannelBase),state.inputMode==='hex-6ch');
    state.midi.hexMappingVerified=setup.verified;
    if(button) {button.textContent=setup.step!==null?'Cancel string check':'Check string setup';button.disabled=!setup.key;}
    if(status)status.textContent=setup.prompt || (setup.verified?'String setup checked for this device. Fret feedback is ready.':!setup.key?'Select a MIDI device and Hex input to check strings.':busy()?'Check string setup will pause practice, then guide you through all six strings.':'Check each string once to enable accurate fret feedback.');
  };
  button?.addEventListener('click',()=>{
    if(busy())pause();
    if(busy())return;
    if(setup.step!==null)setup.cancel();else setup.start();
    sync();onChange();
  });
  return {sync,consume(note) {
    if(busy() && setup.step!==null) {setup.cancel();sync();return false;}
    const consumed=setup.consume(note,Number(state.midi.hexChannelBase));
    if(consumed)sync();return consumed;
  }};
}
