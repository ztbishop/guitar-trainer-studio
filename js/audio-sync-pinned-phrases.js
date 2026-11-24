import {scoreGrid} from './audio-sync-passages.js';

const FRAME_SECONDS = 0.04;

// Compare the written pitches with the audio at this tempo. A positive margin
// means the written pitches fit better than any transposition of this bar.
export function barEvidence(score, index, features, start, end) {
  const count = Math.max(4, Math.ceil((end - start) / 0.10));
  const grid = scoreGrid(score.notes, score.edges[index], score.edges[index + 1], count);
  const totals = new Float64Array(12);
  let active = 0;
  for (let sample = 0; sample < count; sample++) {
    const seconds = start + (sample + 0.5) * (end - start) / count;
    const offset = Math.round(seconds / FRAME_SECONDS) * 12;
    const expected = grid.subarray(sample * 12, (sample + 1) * 12);
    if (!expected.some(weight => weight > 0)) continue;
    active++;
    for (let pitch = 0; pitch < 12; pitch++) {
      if (!expected[pitch]) continue;
      for (let shift = 0; shift < 12; shift++) {
        totals[shift] += expected[pitch] * (features[offset + (pitch + shift) % 12] ?? 0);
      }
    }
  }
  const divisor = active || 1;
  return {active, fit: totals[0] / divisor, contrast: (totals[0] - Math.max(...totals.subarray(1))) / divisor};
}

export function neighborPace(visits, edges, pin, direction) {
  const rates = [];
  let i = pin;
  while (visits[i] && rates.length < 3) {
    const visit = visits[i];
    rates.push((visit.endSeconds - visit.startSeconds) / (edges[i + 1] - edges[i]));
    const next = visits[i + direction];
    if (!next) break;
    const separation = direction === 1 ? next.startSeconds - visit.endSeconds : visit.startSeconds - next.endSeconds;
    if (Math.abs(separation) > 0.18) break;
    i += direction;
  }
  rates.sort((a,b) => a - b);
  return {rate: rates[Math.floor(rates.length / 2)], count: rates.length};
}

export function supportsTempo(visits, edges, pin, direction, origin, rate) {
  for (let distance = 1; distance <= 4; distance++) {
    const i = pin + direction * distance, visit = visits[i];
    if (!visit) continue;
    const startError = Math.abs(visit.startSeconds - (origin + edges[i] * rate));
    const endError = Math.abs(visit.endSeconds - (origin + edges[i + 1] * rate));
    if (Math.max(startError, endError) <= 0.35) return true;
  }
  return false;
}

export function phraseSupported(evidence) {
  if (!evidence.every(bar => bar.active >= 3 && bar.fit >= 0.32)) return false;
  if (evidence.reduce((sum, bar) => sum + bar.contrast, 0) < 0.04 * evidence.length) return false;
  // A single ambiguous chord can fit within a recognizable phrase. Require
  // pitch evidence throughout so that one strong section cannot hide a break.
  const width = Math.min(3, evidence.length);
  for (let i = 0; i <= evidence.length - width; i++) {
    const window = evidence.slice(i, i + width);
    if (window.reduce((sum, bar) => sum + bar.fit, 0) < 0.42 * width ||
        window.reduce((sum, bar) => sum + bar.contrast, 0) < 0) return false;
  }
  return true;
}

export function recoverPinnedPhrases(score, features, matches, choices) {
  // Freeze the existing takes. An addition in this pass cannot vouch for
  // another gap in the same recording.
  const pins = choices.map((choice, i) => {
    const take = matches[i][choice];
    return take && {startSeconds: take.start, endSeconds: take.end};
  });
  const edges = score.edges;
  let previous = -1;
  for (let right = 0; right < pins.length; right++) {
    if (!pins[right]) continue;
    const left = previous;
    previous = right;
    if (left < 0 || right === left + 1) continue;
    const start = pins[left].endSeconds, end = pins[right].startSeconds;
    const nominal = edges[right] - edges[left + 1];
    if (!(end > start && nominal > 0)) continue;
    const rate = (end - start) / nominal;
    const origin = start - edges[left + 1] * rate;
    if (!supportsTempo(pins, edges, left, -1, origin, rate) ||
        !supportsTempo(pins, edges, right, 1, origin, rate)) continue;
    const neighbors = [neighborPace(pins, edges, left, -1), neighborPace(pins, edges, right, 1)];
    if (!neighbors.every(n => Math.abs((rate - n.rate) * nominal) <= 0.18 * n.rate * nominal + 0.25)) continue;

    const points = edges.slice(left + 1, right + 1).map(t => start + (t - edges[left + 1]) * rate);
    points[points.length - 1] = end;
    const evidence = points.slice(1).map((to, k) => barEvidence(score, left + 1 + k, features, points[k], to));
    if (!phraseSupported(evidence)) continue;
    for (const [k, bar] of evidence.entries()) {
      const i = left + 1 + k;
      choices[i] = matches[i].length;
      matches[i] = [...matches[i], {start: points[k], end: points[k + 1], quality: bar.fit, betweenMeasures: true}];
    }
  }
}
