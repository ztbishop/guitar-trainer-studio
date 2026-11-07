// Checkbox presentation only; bootstrap injects the native display action.
import {AppState} from './app-state.js';
import {friendlyTrackName,trackId} from './track-visibility.js';

export function initTrackVisibilityControls(onChange) {
  const list=document.getElementById('custom-track-list');
  const panel=document.getElementById('custom-track-selection');
  const radios=[...document.querySelectorAll('input[name="view-mode"]')];
  let signature='';
  function sync() {
    if(!list || !panel)return;
    panel.hidden=AppState.viewMode!=='custom';
    for(const radio of radios){radio.checked=radio.value===AppState.viewMode;radio.disabled=!AppState.playerReady;}
    const next=JSON.stringify([AppState.tracks.map(t=>[t.index,t.name]),AppState.practiceTrackId,AppState.customTrackIds,AppState.playerReady]);
    if(next===signature)return;
    const focused=list.contains(document.activeElement)?document.activeElement.value:null;
    signature=next;list.replaceChildren();
    for(const [index,track] of AppState.tracks.entries()) {
      const id=trackId(track,index),label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');
      label.className='toggle-row';input.type='checkbox';input.value=id;
      input.checked=AppState.customTrackIds.includes(id);input.disabled=!AppState.playerReady;
      text.textContent=`${index+1}. ${friendlyTrackName(track.name)||`Track ${index+1}`}${id===String(AppState.practiceTrackId)?' (practice)':''}`;
      input.addEventListener('change',()=>{
        const ids=AppState.customTrackIds.filter(value=>value!==id);
        if(input.checked)ids.push(id);
        if(!ids.length){input.checked=true;return;}
        onChange('custom',ids);sync();
      });
      label.append(input,text);list.append(label);
      if(id===focused)input.focus();
    }
  }
  for(const radio of radios)radio.addEventListener('change',()=>{if(radio.checked){onChange(radio.value);sync();}});
  sync();return {sync};
}
