// Scores-menu print intent/readiness; native printing is injected by bootstrap.
import {AppState} from './app-state.js';
export function initScorePrintControls(printScore) {
  const button=document.getElementById('score-print'),status=document.getElementById('score-print-status');
  let loading=false;
  function sync(){button.disabled=loading || !AppState.score || !AppState.playerReady;}
  button.addEventListener('click',()=>{
    if(button.disabled)return;
    try {
      status.textContent=printScore()?'Print view opened. Choose a printer or Save as PDF in the browser dialog.':'Load a score before printing.';
    } catch(error) {
      status.textContent='Could not open the print view. Allow pop-ups for this app and try again.';
      console.error('Score printing failed:',error);
    }
  });
  sync();
  return {sync,loading(value){loading=value;status.textContent='';sync();}};
}
