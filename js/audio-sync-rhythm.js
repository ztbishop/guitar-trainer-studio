// Last-resort search for rhythmic riffs. Compare pitches only while a note is
// sounding. A written rest still determines when the next note should arrive.
const STEP = 0.04;
const RATE_STEPS = 61;
const MAX_PROBES_PER_BAR = 16;

function search(features, duration, bars, span) {
  const probes = bars.flat();
  const frames = features.length / 12;
  const best = new Float32Array(frames), rates = new Float32Array(frames);
  for (let r = 0; r < RATE_STEPS; r++) {
    const scale = 0.6 + r * 0.025;
    const offsets = probes.map(p => Math.round(p.time * scale / STEP) * 12 + p.pitch);
    const last = Math.min(frames - 1, Math.floor((duration - span * scale) / STEP));
    for (let i = 0; i <= last; i++) {
      let sum = 0;
      for (const offset of offsets) sum += features[i * 12 + offset];
      const quality = sum / probes.length;
      if (quality > best[i]) { best[i] = quality; rates[i] = scale; }
    }
  }
  const peaks = [];
  for (let i = 0; i < frames; i++) {
    if (best[i] >= 0.54 && best[i] >= (best[i-1] || 0) && best[i] > (best[i+1] || 0)) peaks.push(i);
  }
  const takes = [];
  for (const i of peaks.sort((a,b) => best[b] - best[a])) {
    const start = i * STEP, scale = rates[i];
    if (takes.some(t => Math.abs(t.start - start) < 0.5 * span * Math.min(t.scale,scale))) continue;
    // Each sounding measure must follow its own pitch pattern. Constant
    // harmonics or an adjacent well-matched bar can otherwise carry the score.
    const supported = bars.every(bar => {
      const average = new Float64Array(12);
      let agreement = 0;
      for (const probe of bar) {
        const offset = (i + Math.round(probe.time * scale / STEP)) * 12;
        agreement += features[offset + probe.pitch];
        for (let p = 0; p < 12; p++) average[p] += features[offset + p] / bar.length;
      }
      const background = bar.reduce((sum,p) => sum + average[p.pitch],0);
      return agreement / bar.length >= 0.42 && (agreement - background) / bar.length >= 0.08;
    });
    if (supported) takes.push({start,scale,quality:best[i]});
    if (takes.length === 5) break;
  }
  return takes;
}

export function rhythmicMatches({edges,notes}, features, duration) {
  const matches = edges.slice(1).map(() => []);
  const byBar = matches.map(() => []);
  let visit = 0;
  for (const n of [...notes].sort((a,b) => a.start-b.start)) {
    while (visit < matches.length && n.start >= edges[visit+1]-1e-7) visit++;
    if (visit < matches.length && n.end > n.start) byBar[visit].push(n);
  }
  const cache = new Map();
  let budget = 240_000_000; // Pitch lookups per analysis, independent of score length.
  for (let first = 0; first < matches.length;) {
    if (!byBar[first].length) { first++; continue; }
    const sounding = [];
    let end = first;
    while (end < matches.length && end < first+8 && sounding.length < 4) {
      if (byBar[end].length) sounding.push(end);
      end++;
    }
    if (sounding.length === 4) {
      const bars = sounding.map(index => {
        const probes = [];
        const notes = byBar[index];
        const count = Math.min(notes.length,MAX_PROBES_PER_BAR / 2);
        for (let j = 0; j < count; j++) {
          const n = notes[Math.floor(j * notes.length / count)];
          const length = Math.min(n.end,edges[index+1]) - n.start;
          for (const fraction of [0.2,0.6]) probes.push({time:n.start-edges[first]+length*fraction,pitch:n.pitch});
        }
        return probes;
      });
      const span = edges[end]-edges[first];
      const key = JSON.stringify([Math.round(span*1000),bars.map(bar => bar.map(p => [Math.round(p.time*1000),p.pitch]))]);
      if (!cache.has(key)) {
        const cost = bars.flat().length * features.length/12 * RATE_STEPS;
        if (cost <= budget && new Set(bars.flat().map(p => p.pitch)).size >= 3) {
          budget -= cost;
          cache.set(key,search(features,duration,bars,span));
        }
      }
      for (const index of sounding) {
        matches[index] = (cache.get(key) || []).map(t => ({
          start:t.start + (edges[index]-edges[first])*t.scale,
          end:Math.min(duration,t.start + (edges[index+1]-edges[first])*t.scale),
          quality:t.quality
        })).sort((a,b) => a.start-b.start);
      }
    }
    first = end;
  }
  return matches;
}
