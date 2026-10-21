import {AppState} from './app-state.js';
import {briefErrorMs,validBriefErrorMs} from './brief-error-filter.js';
export function initBriefErrorControls(onChange,doc=globalThis.document) {
  const toggle=doc.getElementById('ignore-brief-errors'),input=doc.getElementById('minimum-error-ms'),row=doc.getElementById('brief-error-duration-row'),down=doc.getElementById('minimum-error-down'),up=doc.getElementById('minimum-error-up'),status=doc.getElementById('brief-error-availability');
  const settings=()=>({ignoreBriefErrors:AppState.midi.ignoreBriefErrors===true,minErrorMs:briefErrorMs(AppState.midi.minErrorMs)});
  const commit=value=>{if(validBriefErrorMs(value))onChange({...settings(),minErrorMs:value});sync();input.value=String(settings().minErrorMs);};
  toggle.addEventListener('change',()=>{const enabled=toggle.checked;onChange({...settings(),ignoreBriefErrors:enabled});sync();});
  input.addEventListener('change',()=>commit(input.value.trim()===''?NaN:Number(input.value)));
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit(Number(input.value));}});
  down.addEventListener('click',()=>commit(Math.max(5,settings().minErrorMs-5)));
  up.addEventListener('click',()=>commit(Math.min(100,settings().minErrorMs+5)));
  function sync() {
    const value=settings(),available=!AppState.media.editing && Boolean(AppState.midi.activeInputId);
    toggle.checked=value.ignoreBriefErrors;toggle.disabled=!available;
    row.hidden=!value.ignoreBriefErrors;input.disabled=!available;
    if(doc.activeElement!==input)input.value=String(value.minErrorMs);
    down.disabled=!available || value.minErrorMs<=5;up.disabled=!available || value.minErrorMs>=100;
    status.textContent=!AppState.midi.activeInputId?'Select a MIDI input in Settings to save this option.':AppState.media.editing?'Close the sync editor to use practice filters.':'';
  }
  sync();return {sync};
}
