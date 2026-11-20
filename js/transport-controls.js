// Compose menu intents. Native transport and practice changes are injected.
import {initTempoControls} from './tempo-controls.js';
import {initLoopControls} from './loop-controls.js';

export function initTransportControls({onSpeedChange,onLoopChange,onMetronomeChange,onTrainingChange}) {
  const tempo=initTempoControls({onSpeedChange,onMetronomeChange});
  const loop=initLoopControls(onLoopChange,onTrainingChange);
  return {sync() {loop.sync();tempo.sync();},selectLoopByDrag:loop.selectByDrag,pulse:tempo.pulse,clearPulse:tempo.clearPulse};
}
