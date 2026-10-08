// Wait chord-setting form wiring; grading remains in the Wait session.
import {AppState} from './app-state.js';
import {normalizeWaitChordSettings} from './practice-timing.js';

export function initChordControls(onChange) {
  const mode=document.getElementById('wait-chord-mode');
  const windowInput=document.getElementById('wait-chord-window');
  const status=document.getElementById('wait-chord-status');
  function change() {
    const settings=normalizeWaitChordSettings(mode.value,windowInput.value);
    if(!settings) {
      status.textContent='Enter a chord window from 50 to 1000 ms.';
      mode.value=AppState.waitChord.mode;windowInput.value=String(AppState.waitChord.windowMs);return;
    }
    onChange(settings);sync();
  }
  mode.addEventListener('change',change);windowInput.addEventListener('change',change);
  function sync() {
    const wait=AppState.mode==='wait';mode.disabled=!wait;
    mode.value=AppState.waitChord.mode;windowInput.disabled=!wait || AppState.waitChord.mode!=='together';
    if(document.activeElement!==windowInput)windowInput.value=String(AppState.waitChord.windowMs);
    status.textContent=!wait ? 'These controls apply to Wait Mode. Realtime keeps its existing timing rules.' :
      AppState.waitChord.mode==='collect' ? 'Collect notes: correct pitches can be played separately with no time limit.' :
      `Together: complete each chord within ${AppState.waitChord.windowMs} ms of its first correct attack. Pause freezes the window. Expired attempts reset without a missed-note penalty.`;
  }
  return {sync};
}
