// Display preferences and form wiring; native rendering stays in the host.
import {AppState} from './app-state.js';

export function initDisplayControls(onChange) {
  const slider=document.getElementById('score-zoom');
  const number=document.getElementById('score-zoom-number');
  const down=document.getElementById('score-zoom-down');
  const up=document.getElementById('score-zoom-up');
  const scroll=document.getElementById('score-auto-scroll');
  const fullscreen=document.getElementById('fullscreen-on-play');
  function sync() {
    slider.value=number.value=String(AppState.ui.zoomPercent);
    down.disabled=AppState.ui.zoomPercent<=50;up.disabled=AppState.ui.zoomPercent>=200;
    scroll.checked=AppState.ui.autoScroll;fullscreen.checked=AppState.ui.fullscreenOnPlay;
  }
  function zoom(value) {
    if(String(value).trim()!=='' && Number.isFinite(Number(value))) {
      AppState.ui.zoomPercent=Math.max(50,Math.min(200,Number(value)));
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
  scroll.addEventListener('change',()=>{AppState.ui.autoScroll=scroll.checked;onChange();sync();});
  fullscreen.disabled=typeof document.documentElement?.requestFullscreen!=='function';
  fullscreen.addEventListener('change',()=>{AppState.ui.fullscreenOnPlay=fullscreen.checked;sync();});
  sync();
  return {sync};
}
