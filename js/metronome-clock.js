// Audio-clock scheduling only; this module knows nothing about scores or grading.
export function audibleDelayMs(context, audioTime = context?.currentTime, now = performance.now()) {
  if (!context || !Number.isFinite(audioTime)) return 0;
  const stamp = context.getOutputTimestamp?.();
  if (stamp?.performanceTime > 0 && Number.isFinite(stamp.contextTime)) {
    return Math.max(0, stamp.performanceTime + (audioTime - stamp.contextTime) * 1000 - now);
  }
  return Math.max(0, (audioTime - context.currentTime + (context.baseLatency || 0) + (context.outputLatency || 0)) * 1000);
}

export function createMetronomeClock(context, buffer, onBeat, timers = globalThis) {
  const gain = context.createGain();
  gain.connect(context.destination);
  const sources = new Set(), pulses = new Set();
  let timer = null, nextBeat = 0, bpm = 120;
  function stop() {
    if (timer !== null) timers.clearInterval(timer);
    timer = null;
    for (const pulse of pulses) timers.clearTimeout(pulse);
    pulses.clear();
    for (const source of sources) { source.stop(); source.disconnect(); }
    sources.clear();
  }
  function schedule() {
    if (context.state !== 'running') return;
    // After a stalled tab, skip missed beats instead of playing a burst.
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + 0.02;
    while (nextBeat < context.currentTime + 0.1) {
      const source = context.createBufferSource();
      source.buffer = buffer; source.connect(gain); sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect(); };
      source.start(nextBeat);
      const pulse = timers.setTimeout(() => { pulses.delete(pulse); onBeat(); }, audibleDelayMs(context, nextBeat));
      pulses.add(pulse);
      nextBeat += 60 / bpm;
    }
  }
  return {
    sync(state) {
      gain.gain.value = state.volume;
      if (!state.enabled || !state.running) { stop(); return; }
      if (timer !== null && bpm === state.bpm) return;
      stop(); bpm = state.bpm;
      if (context.state === 'suspended' || context.state === 'interrupted') context.resume();
      nextBeat = context.currentTime + 0.02;
      timer = timers.setInterval(schedule, 25); schedule();
    },
    stop,
  };
}
