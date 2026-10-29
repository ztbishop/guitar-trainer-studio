// Display preferences and form wiring; native rendering stays in the host.
import {AppState} from './app-state.js';
import {saveDisplayPreferences,effectiveChordDiagramPlacement,SCORE_DISPLAYS,TAB_RHYTHMS} from './display-preferences.js';
import {visibleTab} from './score-display.js';

export function initDisplayControls(onChange) {
  const slider=document.getElementById('score-zoom');
  const number=document.getElementById('score-zoom-number');
  const down=document.getElementById('score-zoom-down');
  const up=document.getElementById('score-zoom-up');
  const scroll=document.getElementById('score-auto-scroll');
  const fullscreen=document.getElementById('fullscreen-on-play');
  const chordDiagrams=document.getElementById('chord-diagram-placement');
  const chordDiagramHelp=document.getElementById('chord-diagram-help');
  const fretboard=document.getElementById('show-fretboard');
  const scoreDisplay=document.getElementById('score-display');
  const tabRhythm=document.getElementById('tab-rhythm');
  const scoreDisplayHelp=document.getElementById('score-display-help');
  function sync() {
    slider.value=number.value=String(AppState.ui.zoomPercent);
    down.disabled=AppState.ui.zoomPercent<=50;up.disabled=AppState.ui.zoomPercent>=200;
    scroll.checked=AppState.ui.autoScroll;fullscreen.checked=AppState.ui.fullscreenOnPlay;
    if(scoreDisplay)scoreDisplay.value=AppState.ui.scoreDisplay;
    if(tabRhythm){tabRhythm.value=AppState.ui.tabRhythm;tabRhythm.disabled=!AppState.score || !visibleTab(AppState);}
    if(scoreDisplayHelp)scoreDisplayHelp.textContent=AppState.score && ['both','tab'].includes(AppState.ui.scoreDisplay) && !visibleTab(AppState)
      ? 'No usable written tab on the visible tracks. Notation stays visible; your saved choice is retained.'
      : 'Changes the score view only. Tracks without usable written tab keep notation. Chord diagrams remain independent.';
    const noDiagrams=AppState.scoreHasChordDiagrams===false;
    if(chordDiagrams){chordDiagrams.value=effectiveChordDiagramPlacement(AppState);chordDiagrams.disabled=noDiagrams;}
    if(chordDiagramHelp)chordDiagramHelp.textContent=noDiagrams
      ? 'No chord diagrams in this score. Your saved preference applies to scores with diagrams.'
      : 'Choose where Guitar Pro chord diagrams appear. Above Chord places each diagram in the score at its chord position.';
    if(fretboard)fretboard.checked=AppState.ui.showFretboard;
  }
  function zoom(value) {
    if(String(value).trim()!=='' && Number.isFinite(Number(value))) {
      AppState.ui.zoomPercent=Math.max(50,Math.min(200,Number(value)));
      saveDisplayPreferences(AppState);
      onChange();
    }
    sync();
  }
  slider.addEventListener('input',()=>zoom(slider.value));
  number.addEventListener('change',()=>zoom(number.value));
  number.addEventListener('blur',()=>zoom(number.value));
  number.addEventListener('keydown',event=>{if(event.key==='Enter')zoom(number.value);});
  function step(direction) {
    const pending=Number(number.value);
    const value=String(number.value).trim()!=='' && Number.isFinite(pending) ? Math.max(50,Math.min(200,pending)) : AppState.ui.zoomPercent;
    zoom(value+direction*5);
  }
  down.addEventListener('click',()=>step(-1));
  up.addEventListener('click',()=>step(1));
  scroll.addEventListener('change',()=>{AppState.ui.autoScroll=scroll.checked;saveDisplayPreferences(AppState);onChange();sync();});
  fullscreen.disabled=typeof document.documentElement?.requestFullscreen!=='function';
  fullscreen.addEventListener('change',()=>{AppState.ui.fullscreenOnPlay=fullscreen.checked;saveDisplayPreferences(AppState);sync();});
  chordDiagrams?.addEventListener('change',()=>{
    if(AppState.scoreHasChordDiagrams===false){sync();return;}
    AppState.ui.chordDiagramPlacement=chordDiagrams.value;
    saveDisplayPreferences(AppState);
    onChange();
    sync();
  });
  for(const [control,key,choices] of [[scoreDisplay,'scoreDisplay',SCORE_DISPLAYS],[tabRhythm,'tabRhythm',TAB_RHYTHMS]])
    control?.addEventListener('change',()=>{
      if(control.disabled || !choices.includes(control.value)){sync();return;}
      AppState.ui[key]=control.value;saveDisplayPreferences(AppState);onChange();sync();
    });
  sync();
  return {sync};
}
