import {orderedChoices,phraseMatches} from './audio-sync-passages.js';
import {recordingFeatures} from './audio-sync-match.js';
import {refineContextBoundaries} from './audio-sync-boundaries.js';

function samePerformance(a,b) {
  if (!a || !b) return false;
  const overlap = Math.min(a.end,b.end)-Math.max(a.start,b.start);
  return overlap >= 0.65*Math.min(a.end-a.start,b.end-b.start);
}

function neighboring(a,b) {
  if (!a || !b) return false;
  const gap = b.start-a.end, aLength = a.end-a.start, bLength = b.end-b.start;
  return gap >= -Math.min(0.16,aLength/5,bLength/5) && gap <= Math.min(1,0.30*Math.max(aLength,bLength));
}

// Keep the ordinary timestamp wherever both routes identify the same performance.
// Only change takes when both longer searches support consecutive written visits.
export function chooseContextTakes(matches,choices,five,seven,singles) {
  const original = choices.map((c,i)=>matches[i][c]);
  const agreement = five.map((a,i)=>{
    const b = seven[i];
    return samePerformance(a,b) ? (a.quality > b.quality ? a : b) : null;
  });
  const options = original.map(take=>take ? [{...take,take}] : []);
  let hasAlternative = false;
  for (let first=0; first<agreement.length;) {
    let end=first+1;
    while (neighboring(agreement[end-1],agreement[end])) end++;
    const group = agreement.slice(first,end);
    if (group.length >= 2 &&
        group.some((t,j)=>original[first+j] && !samePerformance(t,original[first+j])) &&
        [five,seven].every(route=>group.some((_,j)=>!singles[first+j].includes(route[first+j])))) {
      hasAlternative = true;
      for (let i=first; i<end; i++) {
        const support = five[i].quality+seven[i].quality;
        if (samePerformance(agreement[i],original[i])) {
          options[i][0].quality += support;
        } else {
          // Two contextual routes contradict the old assignment. Keep it in
          // contention at reduced weight when other visits support its order.
          if (options[i].length) options[i][0].quality *= 0.5;
          const take = agreement[i];
          options[i].push({...take,take,quality:support});
        }
      }
    }
    first=end;
  }
  if (!hasAlternative) return;
  // Each contextual vote already accounts for continuity. Count that evidence
  // once and require the final choices to form one compatible recording path.
  const ordered = orderedChoices(options,0);
  if (!ordered.some((c,i)=>c>=0 && options[i][c].take !== original[i])) return;
  for (const [i,c] of ordered.entries()) {
    const take = options[i][c]?.take;
    if (!take) {
      choices[i] = -1;
    } else if (take !== original[i]) {
      let index = matches[i].findIndex(t=>t.start===take.start && t.end===take.end);
      if (index < 0) {
        index = matches[i].length;
        matches[i].push(take);
      }
      choices[i] = index;
    }
  }
}

export function checkContextTakes(score,bars,samples,duration,singles,matches,choices,progress) {
  // A missing visit inside an otherwise selected route and competing takes
  // indicate a possible take conflict. Complete passages need no second scan.
  const first = choices.findIndex(c=>c>=0), last = choices.findLastIndex(c=>c>=0);
  if (bars.length < 7 || first<0 || !choices.slice(first,last).includes(-1) ||
      !matches.some((row,i)=>choices[i]>=0 && row.length>1)) return;
  let low=Infinity, high=-Infinity;
  for (const {register} of bars) {
    if (!Number.isFinite(register?.low) || !Number.isFinite(register.high)) continue;
    low=Math.min(low,register.low);
    high=Math.max(high,register.high);
  }
  if (low>high) return;
  progress('Checking the practice track’s pitch range',0,1);
  const features = recordingFeatures(samples,low-3,high+3);
  function route(size) {
    const rows = phraseMatches(score,features,duration,singles,
      (done,total)=>progress('Comparing '+size+'-measure phrases',done,total),size);
    return orderedChoices(rows).map((c,i)=>rows[i][c]);
  }
  const original = choices.map((c,i)=>matches[i][c]);
  const routes = [route(5),route(7)];
  chooseContextTakes(matches,choices,...routes,singles);
  refineContextBoundaries(bars,samples,features,matches,choices,original,routes);
}
