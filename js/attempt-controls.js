// Practice action wiring only; session modules own grading and transport policy.
import {AppState} from './app-state.js';

export function initAttemptControls(onNewAttempt) {
  const button=document.getElementById('new-attempt-here');
  const enabled=()=>AppState.playerReady && AppState.expectedEvents.length>0;
  button?.addEventListener('click',()=>{if(enabled())onNewAttempt();});
  function sync() {if(button)button.disabled=!enabled();}
  sync();
  return {sync};
}
