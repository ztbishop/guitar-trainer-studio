// Compose menu intents. Native transport and practice changes are injected.
import {initTempoControls} from './tempo-controls.js';
import {initLoopControls} from './loop-controls.js';

export function initTransportControls({onSpeedChange,onLoopChange,onMetronomeChange}) {
  const tempo=initTempoControls({onSpeedChange,onMetronomeChange});
  const loop=initLoopControls(onLoopChange);
  return {sync() {loop.sync();tempo.sync();},selectLoopByDrag:loop.selectByDrag,pulse:tempo.pulse,clearPulse:tempo.clearPulse};
}
