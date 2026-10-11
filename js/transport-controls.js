// Owns Tempo/Loop form wiring. Transport and grading changes are injected.
import {AppState} from './app-state.js';
import {resolvePracticeRange, measureOccurrenceLabel} from './practice-range.js';
import {initTempoControls} from './tempo-controls.js';

export function initTransportControls({onSpeedChange,onLoopChange,onMetronomeChange}) {
  const tempo=initTempoControls({onSpeedChange,onMetronomeChange});
  const enabled=document.getElementById('practice-loop-enabled');
  const start=document.getElementById('practice-loop-start');
  const end=document.getElementById('practice-loop-end');
  const apply=document.getElementById('apply-practice-loop');
  const loopStatus=document.getElementById('loop-controls-status');
  let lastTimeline;

  apply?.addEventListener('click',()=>{
    const range=enabled.checked ? resolvePracticeRange(AppState.playbackTimeline,Number(start.value),Number(end.value)) : null;
    if(enabled.checked && !range) {loopStatus.textContent='End must be at or after Start in playback order.';return;}
    onLoopChange({enabled:enabled.checked,startIndex:Number(start.value),endIndex:Number(end.value),range});sync();
  });

  function sync() {
    const timeline=AppState.playbackTimeline;
    if(timeline!==lastTimeline) {
      lastTimeline=timeline;
      for(const select of [start,end]) {
        select.replaceChildren();
        for(const [index,measure] of (timeline?.measures||[]).entries()) {
          const option=document.createElement('option');option.value=String(index);option.textContent=measureOccurrenceLabel(measure);select.appendChild(option);
        }
      }
      start.value=String(AppState.practiceLoop.startIndex);
      end.value=String(AppState.practiceLoop.enabled ? AppState.practiceLoop.endIndex : Math.max(0,(timeline?.measures.length||1)-1));
      enabled.checked=AppState.practiceLoop.enabled;
    }
    const ready=Boolean(AppState.playerReady && timeline?.measures.length);
    tempo.sync();
    for(const control of [enabled,start,end,apply])control.disabled=!ready;
    const loop=AppState.practiceLoop;
    loopStatus.textContent=!ready ? 'Load a score to choose a section.' : loop.enabled ? `Active: ${measureOccurrenceLabel(timeline.measures[loop.startIndex])} through ${measureOccurrenceLabel(timeline.measures[loop.endIndex])}. Results reset each pass.` : 'Loop off. Choose Start and End, then Apply. Changes pause practice and reset results.';
  }
  return {sync,pulse:tempo.pulse,clearPulse:tempo.clearPulse};
}
