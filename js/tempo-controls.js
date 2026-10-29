// Tempo presentation and validation only; native playback stays in the host.
import { AppState } from './app-state.js';
import { normalizePlaybackSpeed } from './practice-range.js';
import { readMetronomeVolume, saveMetronomeVolume } from './tempo-preferences.js';

export function tempoAtTick(timeline, tick = 0, fallback = 120) {
  let bpm = fallback > 0 ? fallback : 120;
  for (const segment of timeline?.tempoMap || []) {
    if (segment.tick > tick) break;
    if (Number.isFinite(segment.bpm) && segment.bpm > 0) bpm = segment.bpm;
  }
  return bpm;
}

export function stepToFive(value, direction, min, max) {
  const next = direction > 0 ? (Math.floor(value / 5) + 1) * 5 : (Math.ceil(value / 5) - 1) * 5;
  return Math.min(max, Math.max(min, next));
}

const displayNumber = value => String(Number(value.toFixed(2)));

export function initTempoControls({ onSpeedChange, onMetronomeChange = () => {} }) {
  AppState.metronome.volumePercent = readMetronomeVolume();
  const get = id => document.getElementById(id);
  const bpm = get('playback-bpm'), speed = get('playback-speed-percent');
  const slider = get('playback-speed-slider'), reset = get('reset-playback-speed');
  const enabled = get('metronome-enabled'), volume = get('metronome-volume-percent');
  const volumeSlider = get('metronome-volume-slider'), visual = get('metronome-visual-pulse');
  const status = get('tempo-controls-status'), button = get('btn-tempo');
  let pulseTimer = null;
  let waitBaseTempo = null, lastTimeline = null;
  const scoreTempo = () => tempoAtTick(AppState.playbackTimeline, AppState.tickPosition, AppState.score?.tempo);
  const baseTempo = () => AppState.mode === 'wait' ? (waitBaseTempo ?? scoreTempo()) : scoreTempo();
  const ready = () => Boolean(AppState.playerReady && AppState.playbackTimeline?.measures.length);
  const usable = ready;
  const running = () => AppState.mode === 'wait'
    ? Boolean(AppState.waitTrainer?.active && !['paused','count-in'].includes(AppState.waitTrainer.phase)) : AppState.isPlaying;

  function clearPulse() {
    if (pulseTimer !== null) clearTimeout(pulseTimer);
    pulseTimer = null;
    button?.classList?.remove('metronome-pulse');
  }

  function updateNumbers(force = false) {
    const percent = AppState.playbackSpeed * 100;
    for (const [control, value] of [[speed, percent], [bpm, baseTempo() * AppState.playbackSpeed], [volume, AppState.metronome.volumePercent]]) {
      if (control && (force || document.activeElement !== control)) control.value = displayNumber(value);
    }
    if (slider) slider.value = String(percent);
    if (volumeSlider) volumeSlider.value = String(AppState.metronome.volumePercent);
  }

  function changeSpeed(percent) {
    if (!usable()) return;
    const value = String(percent).trim() === '' ? null : normalizePlaybackSpeed(percent);
    if (value === null) {
      updateNumbers(true);
      status.textContent = 'Enter a speed from 25% to 200%, or a BPM within that range.';
      return;
    }
    if (Math.abs(value - AppState.playbackSpeed) > 1e-10) onSpeedChange(value);
    updateNumbers(true);
    sync();
    if(Math.abs(value-AppState.playbackSpeed)>1e-10)status.textContent='This recording does not support that speed. Choose a supported playback percentage.';
  }

  function changeVolume(value) {
    if (!usable() || !AppState.metronome.enabled) return;
    const number = Number(value);
    if (String(value).trim() === '' || !Number.isFinite(number) || number < 0 || number > 100) {
      updateNumbers(true);
      status.textContent = 'Enter a metronome volume from 0% to 100%.';
      return;
    }
    AppState.metronome.volumePercent = number;
    saveMetronomeVolume(number);
    updateNumbers(true);
    sync();
  }

  function wireSteppers(control, prefix, bounds, apply) {
    const step = direction => {
      if (!control || control.disabled) return;
      const value = Number(control.value);
      if (!Number.isFinite(value)) { updateNumbers(true); return; }
      const [min, max] = bounds();
      apply(stepToFive(value, direction, min, max));
    };
    get(`${prefix}-up`)?.addEventListener('click', () => step(1));
    get(`${prefix}-down`)?.addEventListener('click', () => step(-1));
    control?.addEventListener('keydown', event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      step(event.key === 'ArrowUp' ? 1 : -1);
    });
  }

  function commitNumber(control, apply) {
    let edited = false;
    const commit = () => { edited = false; apply(control.value); };
    control?.addEventListener('input', () => { edited = true; });
    control?.addEventListener('change', commit);
    control?.addEventListener('blur', () => { if (edited) commit(); });
    control?.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); commit(); }
    });
  }
  commitNumber(speed, changeSpeed);
  slider?.addEventListener('input', () => changeSpeed(slider.value));
  commitNumber(bpm, value => changeSpeed(value.trim() === '' ? '' : Number(value) / baseTempo() * 100));
  reset?.addEventListener('click', () => changeSpeed(100));
  commitNumber(volume, changeVolume);
  volumeSlider?.addEventListener('input', () => changeVolume(volumeSlider.value));
  enabled?.addEventListener('change', () => {
    if (!usable()) return;
    AppState.metronome.enabled = enabled.checked;
    sync();
  });
  visual?.addEventListener('change', () => {
    if (!usable() || !AppState.metronome.enabled) return;
    AppState.metronome.visualPulse = visual.checked;
    sync();
  });
  wireSteppers(speed, 'speed', () => [25, 200], changeSpeed);
  wireSteppers(bpm, 'bpm', () => [baseTempo() * 0.25, baseTempo() * 2], value => changeSpeed(value / baseTempo() * 100));
  wireSteppers(volume, 'volume', () => [0, 100], changeVolume);

  function sync() {
    if (AppState.playbackTimeline !== lastTimeline) { lastTimeline = AppState.playbackTimeline; waitBaseTempo = null; }
    if (AppState.mode !== 'wait') waitBaseTempo = null;
    else if (waitBaseTempo === null && ready()) waitBaseTempo = scoreTempo();
    const available = usable(), metroAvailable = available && AppState.metronome.enabled;
    for (const control of [speed, bpm, slider, reset, enabled]) if (control) control.disabled = !available;
    for (const control of [volume, volumeSlider, visual]) if (control) control.disabled = !metroAvailable;
    for (const prefix of ['bpm', 'speed', 'volume']) for (const suffix of ['up', 'down']) {
      const control = get(`${prefix}-${suffix}`);
      if (control) control.disabled = prefix === 'volume' ? !metroAvailable : !available;
    }
    if (bpm) { bpm.min = String(baseTempo() * 0.25); bpm.max = String(baseTempo() * 2); }
    if (enabled) enabled.checked = AppState.metronome.enabled;
    if (visual) visual.checked = AppState.metronome.visualPulse;
    for (const id of ['metronome-volume-label', 'metronome-visual-label']) get(id)?.classList?.toggle('tempo-unavailable', !metroAvailable);
    updateNumbers();
    status.textContent = '';
    onMetronomeChange(available && AppState.metronome.enabled ? AppState.metronome.volumePercent / 100 : 0,
      {wait: AppState.mode === 'wait', bpm: baseTempo() * AppState.playbackSpeed, running: running(), enabled: available && AppState.metronome.enabled});
    if (!running() || !metroAvailable || !AppState.metronome.visualPulse) clearPulse();
  }

  function pulse() {
    if (!usable() || !running() || !AppState.metronome.enabled || !AppState.metronome.visualPulse || !button) return;
    clearPulse();
    // Restart the animation even when two clicks arrive close together.
    void button.offsetWidth;
    button.classList?.add('metronome-pulse');
    pulseTimer = setTimeout(clearPulse, 170);
  }
  return { sync, pulse, clearPulse };
}
