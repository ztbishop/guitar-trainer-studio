// Original pitch-class alignment. The search may start anywhere in a recording.
// Refinement fixes both ends and follows pitches and their positive changes.
const FRAME = 0.04;
const CELL_LIMIT = 2_000_000;

function normalize(vector, offset) {
  let sum = 0;
  for (let p = 0; p < 12; p++) sum += vector[offset+p] ** 2;
  if (sum) for (let p = 0; p < 12; p++) vector[offset+p] /= Math.sqrt(sum);
}

function recordingGrid(features, stride) {
  const frames = Math.ceil(features.length / (12*stride));
  const grid = new Float32Array(frames*12);
  for (let i = 0; i < features.length/12; i++) {
    const offset = Math.floor(i/stride)*12;
    for (let p = 0; p < 12; p++) grid[offset+p] += features[i*12+p];
  }
  for (let offset = 0; offset < grid.length; offset += 12) normalize(grid,offset);
  return grid;
}

function scoreGrid(notes, start, end, frames) {
  const grid = new Float32Array(frames*12), step = (end-start)/frames;
  for (const note of notes) {
    if (note.end <= start || note.start >= end) continue;
    const first = Math.max(0,Math.ceil((note.start-start)/step-0.5));
    const last = Math.min(frames,Math.max(first+1,Math.ceil((note.end-start)/step-0.5)));
    for (let i = first; i < last; i++) grid[i*12+note.pitch] = 1;
  }
  for (let offset = 0; offset < grid.length; offset += 12) normalize(grid,offset);
  return grid;
}

function changes(grid) {
  const result = new Float32Array(grid.length);
  for (let i = 12; i < grid.length; i++) result[i] = Math.max(0,grid[i]-grid[i-12]);
  return result;
}

function align(query, recording, pinned) {
  const rows = query.length/12, cols = recording.length/12;
  const direction = new Uint8Array(rows*cols);
  const attacks = pinned && changes(query), rises = pinned && changes(recording);
  let older = new Float64Array(cols).fill(Infinity), prev = older.slice(), next = older.slice();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const q = r*12, y = c*12;
      let similarity = 0, attackDifference = 0;
      for (let p = 0; p < 12; p++) {
        similarity += query[q+p]*recording[y+p];
        if (pinned) attackDifference += (attacks[q+p]-rises[y+p])**2;
      }
      const cost = Math.max(0,1-similarity) + 0.25*attackDifference;
      if (!r) { next[c] = !pinned || !c ? cost : Infinity; continue; }
      const diagonal = c ? prev[c-1]+cost : Infinity;
      const twoRows = c ? older[c-1]+2*cost : Infinity;
      const twoCols = c >= 2 ? prev[c-2]+cost : Infinity;
      const best = Math.min(diagonal,twoRows,twoCols);
      next[c] = best;
      direction[r*cols+c] = best === diagonal ? 0 : best === twoRows ? 1 : 2;
    }
    [older,prev,next] = [prev,next,older];
  }
  function trace(endpoint) {
    const path = new Float64Array(rows);
    let c = endpoint;
    for (let r = rows-1; r >= 0;) {
      path[r] = c;
      const move = direction[r*cols+c];
      if (move === 1) path[r-1] = c-0.5;
      r -= move === 1 ? 2 : 1;
      c -= move === 2 ? 2 : 1;
    }
    return path;
  }
  return {costs:prev,trace};
}

function mappedFrame(path, fraction) {
  const x = Math.max(0,Math.min(path.length-1,fraction*path.length-0.5));
  const left = Math.floor(x), right = Math.ceil(x);
  return path[left]+(x-left)*(path[right]-path[left]);
}

export function phraseMatches(score, features, duration, singles, progress = () => {}) {
  const {edges,notes} = score, count = edges.length-1;
  const matches = singles.map(takes => [...takes]);
  const grids = new Map();
  let previousLeft = -1, paths = [], query;
  for (let i = 0; i < count; i++) {
    const left = Math.max(0,Math.min(i-1,count-3)), end = edges[Math.min(left+3,count)];
    const span = end-edges[left];
    // A single-measure search already covers an isolated bar. A silent visit
    // has no independently audible boundary to offer in an automatic draft.
    if (count > 1 && span > 0 && edges[i+1] > edges[i] &&
        notes.some(n => n.start < edges[i+1] && n.end > edges[i])) {
      const stride = Math.max(2,Math.ceil(Math.sqrt((features.length/12)*(span/FRAME)/CELL_LIMIT)));
      if (!grids.has(stride)) grids.set(stride,recordingGrid(features,stride));
      const recording = grids.get(stride), step = FRAME*stride;
      const rows = Math.max(2,Math.round(span/step));
      if (left !== previousLeft) {
        previousLeft = left; paths = [];
        query = scoreGrid(notes,edges[left],end,rows);
        const pitches = new Set();
        for (let k = 0; k < query.length; k++) if (query[k]) pitches.add(k%12);
        if (pitches.size >= 2) {
          const {costs,trace} = align(query,recording,false);
          const remaining = costs.slice();
          for (let k = 0; k < 5; k++) {
            let best = -1, cost = Infinity;
            for (let c = 0; c < remaining.length; c++)
              if (remaining[c] < cost) {best = c; cost = remaining[c];}
            const quality = 1-cost/rows;
            if (best < 0 || quality < 0.52) break;
            const path = trace(best);
            paths.push({path,quality});
            const radius = Math.max(1,Math.round((best-path[0]+1)/2));
            remaining.fill(Infinity,Math.max(0,best-radius),best+radius+1);
          }
        }
      }
      for (const {path,quality} of paths) {
        // Strong neighbors can match even when the middle bar falls in speech
        // or silence. Require pitch agreement within this visit itself.
        let heard = 0, agreement = 0;
        const from = Math.max(0,Math.ceil((edges[i]-edges[left])/span*rows-0.5));
        const to = Math.min(rows,Math.ceil((edges[i+1]-edges[left])/span*rows-0.5));
        for (let r = from; r < to; r++) {
          const q = r*12, y = Math.round(path[r])*12;
          let active = false;
          for (let p = 0; p < 12; p++) {
            active ||= query[q+p] > 0;
            agreement += query[q+p]*recording[y+p];
          }
          if (active) heard++;
        }
        if (!heard || agreement/heard < 0.58) continue;
        const boundary = t => {
          const fraction = (t-edges[left])/span;
          return Math.min(duration,Math.max(0,(mappedFrame(path,fraction)+
            (fraction === 0 ? 0 : fraction === 1 ? 1 : 0.5))*step));
        };
        const start = boundary(edges[i]), stop = boundary(edges[i+1]);
        if (stop <= start || matches[i].some(t => Math.abs(t.start-start) < 0.32)) continue;
        matches[i].push({start,end:stop,quality:(quality+agreement/heard)/2});
      }
    }
    matches[i].sort((a,b) => a.start-b.start);
    progress(i+1,count);
  }
  return matches;
}

// Maximize total evidence in playback order, with a bonus for consecutive
// measures meeting at one boundary. Prefix maxima allow arbitrary long gaps.
export function orderedChoices(matches) {
  const times = [...new Set(matches.flat().map(t => t.end))].sort((a,b) => a-b);
  const tree = Array(times.length+1).fill(null);
  function upperBound(time) {
    let lo = 0, hi = times.length;
    while (lo < hi) {
      const mid = (lo+hi) >>> 1;
      if (times[mid] <= time) lo = mid+1; else hi = mid;
    }
    return lo;
  }
  let previous = [], best = null;
  for (const [i,takes] of matches.entries()) {
    const nodes = takes.map((take,j) => {
      let parent = null, gain = 0;
      for (let k = upperBound(take.start); k; k -= k & -k)
        if (tree[k] && tree[k].score > gain) {parent = tree[k]; gain = parent.score;}
      for (const prior of previous) {
        const gap = take.start-prior.take.end;
        if (gap < -Math.min(0.16,(take.end-take.start)/5,(prior.take.end-prior.take.start)/5) || gap > 0.25) continue;
        if (prior.score+1 > gain) {parent = prior; gain = prior.score+1;}
      }
      return {i,j,take,parent,score:gain+take.quality};
    });
    for (const node of nodes) {
      for (let k = upperBound(node.take.end); k < tree.length; k += k & -k)
        if (!tree[k] || tree[k].score < node.score) tree[k] = node;
      if (!best || node.score > best.score) best = node;
    }
    previous = nodes;
  }
  const choices = matches.map(() => -1);
  for (let n = best; n; n = n.parent) choices[n.i] = n.j;
  return choices;
}

export class PassageMatchError extends Error {}

// features starts at frame floor(start/FRAME). Keep the owner's exact outer
// seconds even when they lie between frames. Rescale the score to the selected
// take first so a slow demonstration still has room for local tempo variation.
export function refinePassage(score, features, first, last, start, end) {
  const edges = score.edges.slice(first,last+2);
  if (!(first >= 0 && last >= first && last < score.edges.length-1 && start >= 0 && end > start) ||
      edges.some((v,i) => i && v <= edges[i-1])) throw Error('Choose a played passage with positive measure lengths and an end after its start.');
  if (last === first) return [start,end];
  const stride = Math.max(1,Math.ceil(features.length/12 / Math.sqrt(CELL_LIMIT)));
  const grid = recordingGrid(features,stride), frames = grid.length/12;
  if (frames < edges.length) throw new PassageMatchError('These bounds are too short to distinguish the measures.');
  const span = edges.at(-1)-edges[0];
  const query = scoreGrid(score.notes,edges[0],edges.at(-1),frames);
  const {costs,trace} = align(query,grid,true);
  if (!(costs.at(-1)/frames < 0.65)) throw new PassageMatchError('Weak pitch match inside these bounds. Check the passage and times.');
  const path = trace(frames-1);
  const points = edges.map(t => (Math.floor(start/FRAME)+(mappedFrame(path,(t-edges[0])/span)+0.5)*stride)*FRAME);
  points[0] = start; points[points.length-1] = end;
  if (points.some((p,i) => i && p <= points[i-1])) throw new PassageMatchError('The recording does not separate these measure boundaries.');
  return points;
}

// Compare the confirmed take with the score at its written tempo. A horizontal
// or vertical step allows a held pitch or pause to occupy more recording time.
// The selected refinement remains the default when the two estimates disagree.
export function alternativeStarts(score, features, first, last, start, points) {
  const alternatives = points.map(() => null);
  if (last <= first) return alternatives;
  const stride = Math.max(1,Math.ceil(features.length/12 / Math.sqrt(CELL_LIMIT)));
  const recording = recordingGrid(features,stride);
  const cols = recording.length/12;
  const span = score.edges[last+1]-score.edges[first];
  const rows = Math.min(Math.floor(CELL_LIMIT/cols),Math.round(span/(FRAME*stride)));
  if (rows < points.length || cols < points.length) return alternatives;
  const query = scoreGrid(score.notes,score.edges[first],score.edges[last+1],rows);
  const path = writtenTempoPath(query,recording);
  for (let i = 1; i < points.length-1; i++) {
    const fraction = (score.edges[first+i]-score.edges[first])/span;
    const time = (Math.floor(start/FRAME)+(mappedFrame(path,fraction)+0.5)*stride)*FRAME;
    if (Math.abs(time-points[i]) > 0.25 && time > points[0] && time < points.at(-1)) alternatives[i] = time;
  }
  return alternatives;
}

function writtenTempoPath(query,recording) {
  const rows = query.length/12, cols = recording.length/12;
  const attacks = changes(query), rises = changes(recording);
  const direction = new Uint8Array(rows*cols);
  let previous = new Float64Array(cols).fill(Infinity), current = new Float64Array(cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let similarity = 0, attackDifference = 0;
      for (let p = 0; p < 12; p++) {
        similarity += query[r*12+p]*recording[c*12+p];
        attackDifference += (attacks[r*12+p]-rises[c*12+p])**2;
      }
      const diagonal = r && c ? previous[c-1] : Infinity;
      const up = previous[c]+0.5, left = c ? current[c-1]+0.5 : Infinity;
      const best = Math.min(diagonal,up,left);
      direction[r*cols+c] = best === diagonal ? 0 : best === up ? 1 : 2;
      const cost = Math.max(0,1-similarity)+0.5*Math.sqrt(attackDifference);
      current[c] = (r || c ? best : 0)+cost;
    }
    [previous,current] = [current,previous];
  }
  // Interpolate only between points that advance in both timelines.
  const path = new Float64Array(rows);
  let r = rows-1, c = cols-1, nextRow = r, nextCol = c;
  path[r] = c;
  while (r || c) {
    const step = direction[r*cols+c];
    if (step !== 2) r--;
    if (step !== 1) c--;
    if (r < nextRow && c < nextCol) {
      for (let j = r; j < nextRow; j++) path[j] = c+(nextCol-c)*(j-r)/(nextRow-r);
      nextRow = r; nextCol = c;
    }
  }
  for (let j = 0; j < nextRow; j++) path[j] = j*nextCol/nextRow;
  return path;
}
