// Offline passage search. All positions in this module are recording seconds.
// The worker decodes no files and needs no access to the player or grade state.
export const SAMPLE_RATE = 11025;
const HOP = 441;
const STEP = HOP / SAMPLE_RATE;
const WINDOW = 2048;

// Centered Hann-window FFT. Fold prominent spectral peaks onto the twelve
// pitch classes so guitar timbre and octave doubling need no instrument model.
export function recordingFeatures(samples) {
  const frames = Math.ceil(samples.length / HOP);
  const features = new Float32Array(frames * 12);
  const real = new Float64Array(WINDOW), imag = new Float64Array(WINDOW);
  const reverse = new Uint16Array(WINDOW), window = new Float64Array(WINDOW);
  const cos = new Float64Array(WINDOW / 2), sin = new Float64Array(WINDOW / 2);
  const power = new Float64Array(WINDOW / 2);
  for (let i = 0; i < WINDOW; i++) {
    reverse[i] = (reverse[i >> 1] >> 1) | ((i & 1) * (WINDOW / 2));
    window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / WINDOW);
    if (i < WINDOW / 2) {
      cos[i] = Math.cos(2 * Math.PI * i / WINDOW);
      sin[i] = -Math.sin(2 * Math.PI * i / WINDOW);
    }
  }
  for (let frame = 0; frame < frames; frame++) {
    const first = frame * HOP - WINDOW / 2;
    for (let i = 0; i < WINDOW; i++) {
      real[reverse[i]] = (samples[first + i] || 0) * window[i];
    }
    imag.fill(0);
    for (let width = 2; width <= WINDOW; width *= 2) {
      const half = width / 2, stride = WINDOW / width;
      for (let block = 0; block < WINDOW; block += width) {
        for (let k = 0; k < half; k++) {
          const a = block + k, b = a + half, t = k * stride;
          const x = real[b] * cos[t] - imag[b] * sin[t];
          const y = real[b] * sin[t] + imag[b] * cos[t];
          real[b] = real[a] - x; imag[b] = imag[a] - y;
          real[a] += x; imag[a] += y;
        }
      }
    }
    const base = frame * 12;
    const highBin = Math.ceil(2200 * WINDOW / SAMPLE_RATE);
    for (let b = 1; b <= highBin + 1; b++) power[b] = real[b] ** 2 + imag[b] ** 2;
    for (let b = 10; b <= highBin; b++) {
      if (power[b] < 0.00001 || power[b] <= power[b-1] || power[b] <= power[b+1]) continue;
      const left = Math.log(power[b-1] + 1e-14), mid = Math.log(power[b]), right = Math.log(power[b+1] + 1e-14);
      const bin = b + 0.5 * (left - right) / (left - 2 * mid + right);
      const midi = Math.round(69 + 12 * Math.log2(bin * SAMPLE_RATE / WINDOW / 440));
      features[base + midi % 12] += Math.sqrt(power[b] / b);
    }
    let norm = 0;
    for (let p = 0; p < 12; p++) norm += features[base+p] ** 2;
    if (norm > 0.001) {
      for (let p = 0; p < 12; p++) features[base+p] /= Math.sqrt(norm);
    } else features.fill(0, base, base+12);
  }
  return features;
}

// Score one measure at a time. An explanation between measures can be any
// length. No search path or interpolation is allowed to fill that interval.
function findTakes(bar, features, duration) {
  if (!bar.probes.length) return [];
  const frames = features.length / 12;
  const scores = new Float32Array(frames), rates = new Float32Array(frames);
  for (const scale of [0.55, 0.67, 0.8, 0.9, 1, 1.12, 1.25, 1.45, 1.67, 2]) {
    const offsets = bar.probes.map(probe => Math.round(probe.time * scale / STEP));
    const onsets = bar.probes.map(probe => Math.round(probe.onset * scale / STEP));
    const limit = Math.floor((duration - bar.duration * scale + STEP / 2) / STEP);
    for (let start = 0; start <= limit; start++) {
      let sum = 0, weakest = 1, rise = 0;
      for (let j = 0; j < offsets.length; j++) {
        const frame = Math.min(frames-1, start + offsets[j]);
        const probe = bar.probes[j];
        let match = 0;
        for (const pitch of probe.pitches) match += features[frame * 12 + pitch];
        match *= probe.weight;
        weakest = Math.min(weakest, match);
        sum += match;
        if (Number.isFinite(onsets[j])) {
          const onset = start + onsets[j];
          const before = (onset-1)*12, after = Math.min(frames-1,onset+1)*12;
          for (const pitch of probe.pitches) rise += probe.weight *
            Math.max(0, features[after+pitch] - (features[before+pitch] || 0));
        }
      }
      const quality = (0.75 * sum + 0.2 * rise) / offsets.length + 0.15 * weakest;
      if (quality > scores[start]) { scores[start] = quality; rates[start] = scale; }
    }
  }
  const peaks = [];
  for (let i = 0; i < frames; i++) {
    if (scores[i] >= 0.78 && scores[i] >= (scores[i-1] || 0) && scores[i] > (scores[i+1] || 0)) peaks.push(i);
  }
  peaks.sort((a,b) => scores[b] - scores[a]);
  const takes = [];
  for (const i of peaks) {
    const start = i * STEP, end = Math.min(duration, start + rates[i] * bar.duration);
    if (takes.some(t => Math.min(end,t.end) - Math.max(start,t.start) > 0.35 * Math.min(end-start,t.end-t.start))) continue;
    takes.push({start, end, quality:scores[i]});
    if (takes.length === 32) break;
  }
  return takes.sort((a,b) => a.start - b.start);
}

export function matchMeasures(bars, samples, progress = () => {}) {
  const features = recordingFeatures(samples), cache = new Map();
  return bars.map((bar, i) => {
    const key = JSON.stringify([bar.duration,bar.probes]);
    if (!cache.has(key)) cache.set(key,findTakes(bar, features, samples.length / SAMPLE_RATE));
    progress(i+1, bars.length);
    if (bar.span === undefined) return cache.get(key);
    return cache.get(key).map(t => {
      const scale = (t.end-t.start)/bar.duration, start = t.start + bar.offset*scale;
      return {...t,start,end:start+bar.span*scale};
    });
  });
}
