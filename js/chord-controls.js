// Wait chord-setting form wiring; grading remains in the Wait session.
import {AppState} from './app-state.js';
import {normalizeWaitChordSettings} from './practice-timing.js';

export function initChordControls(onChange) {
  const modes=[...document.querySelectorAll('input[name="wait-chord-mode"]')];
  const windowInput=document.getElementById('wait-chord-window');
  const status=document.getElementById('wait-chord-status');
  const waitControls=document.getElementById('practice-wait-controls');
  function change() {
    const settings=normalizeWaitChordSettings(modes.find(mode=>mode.checked)?.value,windowInput.value);
    if(!settings) {
      status.textContent='Enter a chord window from 50 to 1000 ms.';
      for(const mode of modes)mode.checked=mode.value===AppState.waitChord.mode;
      windowInput.value=String(AppState.waitChord.windowMs);return;
    }
    if(settings.mode!==AppState.waitChord.mode || settings.windowMs!==AppState.waitChord.windowMs)onChange(settings);
    sync();
  }
  for(const mode of modes)mode.addEventListener('change',change);
  windowInput.addEventListener('change',change);
  windowInput.addEventListener('blur',change);
  windowInput.addEventListener('keydown',event=>{if(event.key==='Enter')change();});
  function sync() {
    const wait=AppState.mode==='wait';
    if(waitControls)waitControls.hidden=!wait;
    for(const mode of modes){mode.disabled=!wait;mode.checked=mode.value===AppState.waitChord.mode;}
    windowInput.disabled=!wait || AppState.waitChord.mode!=='together';
    if(document.activeElement!==windowInput)windowInput.value=String(AppState.waitChord.windowMs);
    status.textContent=!wait || AppState.waitChord.mode==='collect' ? '' :
      `${AppState.waitChord.windowMs} ms from the first correct note.`;
  }
  return {sync};
}
