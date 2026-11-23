import {tickToTimeMs} from './score-playback.js';
import {INTERVAL_TIMING_FORMAT} from './explanation-timing.js';
import {DRAFT_FORMAT,validateDraft} from './draft-timing.js';
import {fingerprint} from './library-store.js';

// Absolute seconds in the native repeat-expanded performance, before media sync.
export function passageScore(timeline, trackId) {
  const edges = timeline.measures.map(m => tickToTimeMs(timeline,m.startTick)/1000);
  edges.push(tickToTimeMs(timeline,timeline.measures.at(-1)?.endTick ?? 0)/1000);
  const notes = timeline.events.filter(e => e.trackId === String(trackId)).flatMap(e =>
    e.notes.filter(n => n.attack !== false && !n.isDead && Number.isFinite(n.midi)).map(n => ({
      start:(n.startTimeMs ?? e.startTimeMs)/1000, end:(n.endTimeMs ?? e.endTimeMs)/1000, pitch:n.midi%12
    })));
  return {edges,notes};
}

export function scoreQueries(timeline, trackId) {
  const groups = timeline.measures.map(() => new Map());
  const registers = timeline.measures.map(() => ({low:Infinity,high:-Infinity}));
  const sustainedBends = new Map();
  for (const event of timeline.events) {
    if (event.trackId !== String(trackId)) continue;
    const pitches = [];
    const register = registers[event.playbackMeasureIndex];
    for (const note of event.notes) {
      if (note.isDead || !Number.isFinite(note.midi)) continue;
      pitches.push(note.midi % 12);
      register.low = Math.min(register.low,note.midi);
      register.high = Math.max(register.high,note.midi);
      if (note.attack !== false && note.bendRange?.min === note.midi &&
          Number.isInteger(note.bendRange.max) && note.bendRange.max > note.midi && note.bendRange.max <= note.midi+4) {
        sustainedBends.set(event.playbackMeasureIndex,note);
      }
    }
    if (!pitches.length) continue;
    const starts = groups[event.playbackMeasureIndex];
    const group = starts.get(event.startTimeMs) || {end:0,pitches:new Set()};
    for (const pitch of pitches) group.pitches.add(pitch);
    group.end = Math.max(group.end,event.endTimeMs);
    starts.set(event.startTimeMs,group);
  }
  const bars = timeline.measures.map((measure,index) => {
    const start = tickToTimeMs(timeline,measure.startTick), end = tickToTimeMs(timeline,measure.endTick);
    const notes = [...groups[index]].sort(([a],[b]) => a-b);
    const probes = [];
    const signatures = new Set();
    for (let i = 0; i < notes.length; i++) {
      const [onset,group] = notes[i];
      const length = Math.min(end,group.end,notes[i+1]?.[0] ?? end) - onset;
      if (length < 70 || onset < start) continue;
      // Sample across the bar even when it contains a dense run.
      if (notes.length > 12 && Math.floor(i*12/notes.length) === Math.floor((i-1)*12/notes.length)) continue;
      const pitches = [...group.pitches].sort((a,b) => a-b);
      signatures.add(pitches.join(','));
      for (const fraction of [0.20,0.76]) probes.push({
        time:(onset-start+length*fraction)/1000, pitches, weight:1/Math.sqrt(pitches.length),
        ...(fraction === 0.20 ? {onset:(onset-start)/1000} : {})
      });
    }
    const bend=sustainedBends.get(index), register=registers[index];
    const held=bend && register.low===register.high && Math.abs(bend.startTimeMs-start)<1 && bend.endTimeMs>=end-1;
    return {duration:(end-start)/1000,probes,distinct:signatures.size,register,
      ...(held ? {bendTarget:bend.bendRange.max} : {})};
  });
  // A bar on one chord may be identifiable as part of the phrase next to it.
  // A completely silent bar has no acoustic evidence of its own.
  return bars.map((bar,i) => {
    if (bar.distinct !== 1) return bar;
    const neighbor = bars[i+1]?.distinct ? i+1 : i-1;
    if (!bars[neighbor]?.distinct) return {...bar,probes:[]};
    const first = bars[Math.min(i,neighbor)], second = bars[Math.max(i,neighbor)];
    const probes = first.probes.concat(second.probes.map(p => ({...p,time:p.time+first.duration,
      ...(p.onset === undefined ? {} : {onset:p.onset+first.duration})})));
    if (new Set(probes.map(p => p.pitches.join(','))).size < 2) return {...bar,probes:[]};
    return {duration:first.duration+second.duration,probes,offset:i < neighbor ? 0 : first.duration,
      span:bar.duration,register:bar.register,...(bar.bendTarget===undefined ? {} : {bendTarget:bar.bendTarget})};
  });
}

// Small boundary-estimation errors may overlap; never shrink a short take
// substantially or turn an unmatched span into scored music.
function compatible(left,right) {
  const tolerance = Math.min(0.16,(left.end-left.start)/5,(right.end-right.start)/5);
  return left.end <= right.start + tolerance;
}

export function initialChoices(matches) {
  const choices = matches.map(takes => takes.length === 1 ? 0 : -1);
  // Ambiguous takes, including identical written repeats, require a choice.
  let previous = -1;
  for (let i = 0; i < choices.length; i++) {
    if (choices[i] < 0) continue;
    if (previous >= 0 && !compatible(matches[previous][0],matches[i][0])) {
      choices[previous] = choices[i] = -1;
    }
    previous = i;
  }
  return choices;
}

export function followTake(matches, choices, index, locked = choices.map(c => c >= 0)) {
  const result = [...choices];
  let take = matches[index][result[index]];
  if (!take) return result;
  for (let i = index+1; i < matches.length; i++) {
    const adjacent = matches[i].map((candidate,j) => ({candidate,j})).filter(({candidate}) =>
      compatible(take,candidate) && Math.abs(candidate.start-take.end) <= 0.20);
    if (adjacent.length !== 1 || (locked[i] && result[i] !== adjacent[0].j)) break;
    result[i] = adjacent[0].j;
    take = adjacent[0].candidate;
  }
  return result;
}

export function selectedVisits(measures,matches,choices) {
  const visits = [];
  for (const [i,measure] of measures.entries()) {
    if (choices[i] < 0) continue;
    const take = matches[i][choices[i]];
    const previous = visits.at(-1);
    if (previous && (!compatible({start:previous.startSeconds,end:previous.endSeconds},take) ||
        previous.pinnedEnd && take.start < previous.endSeconds && take.pinnedStart))
      throw Error(`Measure ${measure.measureNumber}, pass ${measure.occurrence} overlaps or precedes your earlier take. Choose another take or leave one unmapped.`);
    let start = take.start;
    if (previous && previous.endSeconds > start && previous.pinnedEnd) start = previous.endSeconds;
    else if (previous && (previous.endSeconds > start ||
        (!previous.pinnedEnd && previous.originalVisit === i && start-previous.endSeconds <= 0.08))) previous.endSeconds = start;
    visits.push({visit:visits.length+1,originalVisit:i+1,scoreMeasure:measure.measureNumber,
      occurrence:measure.occurrence,startSeconds:start,endSeconds:take.end,pinnedEnd:take.pinnedEnd});
  }
  if (!visits.length) throw Error('Choose at least one take.');
  return visits.map(({pinnedEnd,...v}) => ({...v,anchors:[{offset480:0,seconds:v.startSeconds},{offset480:480,seconds:v.endSeconds}]}));
}

export async function suggestionDraft({measures,matches,choices,trackId,scoreSha256,sourceSha256}) {
  const musicalVisits = selectedVisits(measures,matches,choices);
  const reference = ({visit,originalVisit,scoreMeasure,occurrence}) => ({visit,originalVisit,scoreMeasure,occurrence});
  const intervals = [];
  for (let i = 1; i < musicalVisits.length; i++) {
    const left = musicalVisits[i-1], right = musicalVisits[i];
    if (left.endSeconds < right.startSeconds) intervals.push({kind:'explanation',id:'gap-'+i,label:'Unscored recording gap',
      startSeconds:left.endSeconds,endSeconds:right.startSeconds,boundary:{after:reference(left),before:reference(right)}});
  }
  const originalPlaybackOrder = measures.map(m => m.measureNumber);
  const recordingId = 'audio-'+sourceSha256;
  const originalTimingText = JSON.stringify({trackId,musicalVisits,intervals});
  const timingSha256 = await fingerprint(new TextEncoder().encode(originalTimingText));
  const candidatePlan = {format:INTERVAL_TIMING_FORMAT,version:1,scoreSha256,sourceSha256,timingSha256,recordingId,
    originalPlaybackOrder,musicalVisits,intervals,scoreOmissions:[],repeatResolution:{kind:'unchanged',omittedOriginalVisits:[]}};
  return validateDraft({format:DRAFT_FORMAT,version:1,scoreSha256,recordingId,originalPlaybackOrder,
    originalTimingText,matchingEvidence:{method:'audio-passage-search-v2',trackId},candidatePlan,unresolved:[]});
}
