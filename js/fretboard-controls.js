// Local fretboard controls. Preferences only; navigation is injected by bootstrap.
import {AppState} from './app-state.js';
import {saveDisplayPreferences,FRETBOARD_VIEWS,FRETBOARD_LABELS} from './display-preferences.js';
export function initFretboardControls(onChange,onStep) {
  const get=id=>document.getElementById(id);
  const popup=get('fretboard-options');
  const gear=get('fretboard-settings');
  function close(){popup.hidePopover?.();popup.hidden=true;gear.setAttribute('aria-expanded','false');}
  function position() {
    const anchor=gear.getBoundingClientRect();
    popup.style.left=Math.max(8,Math.min(anchor.right+6,window.innerWidth-popup.offsetWidth-8))+'px';
    popup.style.top=Math.max(8,Math.min(anchor.bottom-popup.offsetHeight,window.innerHeight-popup.offsetHeight-8))+'px';
  }
  gear.addEventListener('click',()=>{
    if(!popup.hidden){close();return;}
    popup.hidden=false;popup.showPopover?.();gear.setAttribute('aria-expanded','true');
    position();
  });
  window.addEventListener('resize',close);
  document.addEventListener('click',event=>{if(!get('fretboard-tools').contains(event.target))close();});
  get('fretboard-tools').addEventListener('keydown',event=>{if(event.key==='Escape'){close();gear.focus();}});
  for(const [id,key,values] of [['fretboard-view','fretboardView',FRETBOARD_VIEWS],['fretboard-labels','fretboardLabels',FRETBOARD_LABELS]]) {
    get(id).addEventListener('change',event=>{if(values.includes(event.target.value)){AppState.ui[key]=event.target.value;saveDisplayPreferences(AppState);onChange();}});
  }
  get('fretboard-left').addEventListener('change',event=>{
    AppState.ui.leftHanded=event.target.checked;
    saveDisplayPreferences(AppState);
    onChange();
  });
  get('fretboard-help').addEventListener('click',()=>{
    get('fretboard-local-help').hidden=!get('fretboard-local-help').hidden;
    get('fretboard-help').setAttribute('aria-expanded',String(!get('fretboard-local-help').hidden));
    position();
  });
  get('fretboard-previous').addEventListener('click',()=>onStep(-1));
  get('fretboard-next').addEventListener('click',()=>onStep(1));
  return {sync({previous=false,next=false}={}) {
    get('fretboard-view').value=AppState.ui.fretboardView;
    get('fretboard-labels').value=AppState.ui.fretboardLabels;
    get('fretboard-left').checked=AppState.ui.leftHanded;
    get('fretboard-left').disabled=!AppState.ui.showFretboard;
    get('fretboard-previous').disabled=!previous;
    get('fretboard-next').disabled=!next;
    if(!AppState.ui.showFretboard)close();
  }};
}
