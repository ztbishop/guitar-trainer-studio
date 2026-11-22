import {fingerprint} from './library-store.js';
import {scoreQueries,passageScore,followTake,suggestionDraft} from './audio-sync-score.js';
import {createPassageRange} from './audio-sync-range.js';
import {SAMPLE_RATE} from './audio-sync-match.js';

const MAX_BYTES = 256 * 1024 * 1024;
const sizeError = () => Error('Choose a recording under 256 MiB or a smaller audio copy of the same lesson.');
async function readRecording({file,url}, signal) {
  if (file) {
    if (file.size > MAX_BYTES) throw sizeError();
    return file.arrayBuffer();
  }
  let response;
  try { response = await fetch(url,{signal}); }
  catch (e) {
    if (signal.aborted) throw e;
    throw Error('Could not read the audio from this link. Check the connection or choose a local copy. The host must allow cross-origin audio access.');
  }
  if (!response.ok || !response.body) throw Error('The recording host did not provide a readable file.');
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw sizeError();
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw sizeError();
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return new Blob(chunks).arrayBuffer();
}

function analyze(request,transfer,signal,progress) {
  signal.throwIfAborted();
  const worker = new Worker(new URL('./audio-sync-worker.js',import.meta.url),{type:'module'});
  let cancel;
  return new Promise((resolve,reject) => {
    cancel = () => reject(signal.reason);
    signal.addEventListener('abort',cancel,{once:true});
    worker.onmessage = ({data}) => {
      if (data.error) reject(Error(data.error));
      else if (data.matches || data.points) resolve(data);
      else progress(data);
    };
    worker.onerror = () => reject(Error('The audio analysis worker could not finish.'));
    worker.postMessage(request,[transfer.buffer]);
  }).finally(() => {signal.removeEventListener('abort',cancel);worker.terminate();});
}

const time = seconds => `${Math.floor(seconds/60)}:${(seconds%60).toFixed(2).padStart(5,'0')}`;
const button = (label,handler) => {
  const node = document.createElement('button');
  node.type = 'button'; node.textContent = label; node.addEventListener('click',handler);
  return node;
};

export function createAudioSuggestions({after,context,playhead,preview,review}) {
  const panel = document.createElement('details');
  panel.id = 'media-audio-suggestions'; panel.className = 'sync-editor-help';
  const title = document.createElement('summary'); title.textContent = 'Suggest sync points from audio';
  const help = document.createElement('p'), status = document.createElement('p');
  help.className = status.className = 'field-help'; status.setAttribute('role','status');
  const rows = document.createElement('div');
  const passage = document.createElement('div');
  const comparisons = document.createElement('details'), compareTitle = document.createElement('summary');
  const compareRows = document.createElement('div');
  comparisons.append(compareTitle,compareRows);
  const start = button('Analyze lesson audio',run);
  const cancel = button('Cancel analysis',() => {
    if (job && result) {
      job.controller.abort(); job = null; cancel.hidden = true; sync();
    } else reset();
    status.textContent = 'Analysis canceled.';
  });
  const apply = button('Review selected takes',openDraft);
  panel.append(title,help,start,cancel,status,apply,rows,passage,comparisons); after.after(panel);
  let job = null, result = null, applying = false;

  function current(snapshot) {
    const now = context();
    return now.source === snapshot.source && now.score === snapshot.score &&
      now.trackId === snapshot.trackId && now.generation === snapshot.generation;
  }
  function reset() {
    job?.controller.abort(); job = result = null;
    rows.replaceChildren(); passage.replaceChildren(); status.textContent = ''; apply.hidden = cancel.hidden = true;
    compareRows.replaceChildren(); comparisons.open = false; comparisons.hidden = true;
    start.disabled = false;
  }
  function sync() {
    const now = context();
    if ((job && !current(job.snapshot)) || (result && !current(result.snapshot))) reset();
    let reason = '';
    if (!now.source || !now.timeline || !now.scoreSha256) reason = 'Load a score and recording first.';
    else if (now.source.kind === 'youtube') reason = 'YouTube playback does not expose audio for analysis. Choose a local file or a readable media link.';
    else if (now.trackId == null) reason = 'Choose a practice track first.';
    else if (now.timeline.measures.length > 4096) reason = 'This score exceeds the draft editor limit of 4,096 played measures.';
    else if (now.duration > 45*60) reason = 'For analysis, choose a recording of 45 minutes or less.';
    else if (now.blocked) reason = now.blocked;
    help.textContent = reason || 'Matches the selected practice track. Choose a take for each written pass. Unmapped recording time plays without grading.';
    start.disabled = Boolean(reason || job || applying);
    apply.textContent = now.hasDraft ? 'Replace draft mapping with selected takes' : 'Review selected takes';
    rows.inert = passage.inert = comparisons.inert = Boolean(reason || job || applying);
    apply.disabled = Boolean(reason || job || applying || !result?.choices.some(c => c >= 0));
    return !reason;
  }
  async function run() {
    if (job || !sync()) return;
    reset();
    const snapshot = context(), controller = new AbortController();
    const task = {snapshot,controller}; job = task;
    const {signal} = controller;
    const check = () => {signal.throwIfAborted(); if (!current(snapshot)) throw Error('Score, practice track or recording changed. Analyze again.');};
    cancel.hidden = false; sync();
    try {
      const bars = scoreQueries(snapshot.timeline,snapshot.trackId);
      const score = passageScore(snapshot.timeline,snapshot.trackId);
      if (!score.notes.length) throw Error('This track has no pitched notes to match. Choose another track.');
      status.textContent = 'Reading recording audio…';
      const bytes = await readRecording(snapshot,signal);
      check();
      const sourceSha256 = await fingerprint(bytes); check();
      const decoder = new OfflineAudioContext(1,1,SAMPLE_RATE);
      let decoded;
      try { decoded = await decoder.decodeAudioData(bytes); }
      catch { throw Error('This browser could not decode the audio track. Try an audio copy with the same start and duration.'); }
      check();
      if (Math.abs(decoded.duration-snapshot.duration) > 0.35)
        throw Error('The decoded audio and player have different durations. Choose a matching audio copy.');
      // Pick the strongest channel so an empty left channel or phase-cancelled
      // stereo mix cannot turn a usable recording into silence.
      let samples, highest = -1;
      for (let i = 0; i < decoded.numberOfChannels; i++) {
        const channel = decoded.getChannelData(i);
        let energy = 0;
        for (let t = 0; t < channel.length; t += 97) energy += channel[t] ** 2;
        if (energy > highest) { samples = channel; highest = energy; }
      }
      status.textContent = 'Listening for pitch patterns…';
      samples = samples.slice(0,Math.floor(snapshot.duration*SAMPLE_RATE));
      const analysis = await analyze({bars,score,samples},samples,signal,({phase,done,total}) => {
        if (job === task) status.textContent = `${phase} · ${done} of ${total}`;
      });
      check();
      result = {snapshot,sourceSha256,score,...analysis,locked:bars.map(() => false)};
      draw();
      const r = result;
      passage.replaceChildren(createPassageRange(snapshot.timeline.measures,snapshot.duration,playhead,
        i => r.matches[i][r.choices[i]],refine));
    } catch (error) { if (job === task) status.textContent = error.message; }
    finally { if (job === task) { job = null; cancel.hidden = true; sync(); } }
  }
  function draw() {
    const {matches,choices,snapshot} = result;
    rows.replaceChildren();
    passage.firstChild?.dispatchEvent(new Event('takeschanged'));
    drawComparisons();
    const found = matches.filter(t => t.length).length;
    function showCount() {
      status.textContent = found
        ? `Found takes for ${found} of ${matches.length} measure visits. You have ${choices.filter(c => c >= 0).length} selected for draft review. Listen to compare or change takes below.`
        : 'Analyze found 0 suggested sync points. The timeline still shows its previous alignment. You can try another practice track or pin a passage you recognize below.';
    }
    showCount();
    apply.hidden = !found;
    if (!found) return;
    for (const [i,takes] of matches.entries()) {
      const m = snapshot.timeline.measures[i], row = document.createElement('div');
      row.className = 'media-actions';
      const label = document.createElement('label'), select = document.createElement('select');
      label.append(`Measure ${m.measureNumber} · pass ${m.occurrence} `,select);
      select.add(new Option(takes.length ? 'Leave unmapped' : 'No match','-1'));
      takes.forEach((t,j) => select.add(new Option(`${t.refined ? 'Pinned passage' : 'Take '+(j+1)} · ${time(t.start)}–${time(t.end)}`,String(j))));
      select.value = String(choices[i]); select.disabled = !takes.length;
      const listen = button('Play from take',async () => {
        try { if (current(snapshot)) await preview(takes[choices[i]]); }
        catch (error) { status.textContent = error.message; }
      });
      const follow = button('Continue this take',() => {
        result.choices = followTake(matches,choices,i,result.locked);
        result.choices.forEach((choice,j) => {if (choice !== choices[j]) result.locked[j] = true;});
        draw(); sync();
      });
      select.onchange = () => {
        choices[i] = Number(select.value); result.locked[i] = true;
        showCount();
        listen.disabled = follow.disabled = choices[i] < 0;
        passage.firstChild?.dispatchEvent(new Event('takeschanged')); drawComparisons(); sync();
      };
      listen.disabled = follow.disabled = choices[i] < 0;
      row.append(label); if (takes.length) row.append(listen,follow);
      rows.append(row);
    }
  }
  function drawComparisons() {
    const {snapshot,matches,choices} = result;
    compareRows.replaceChildren();
    for (let i = 1; i < choices.length; i++) {
      const left = matches[i-1][choices[i-1]], right = matches[i][choices[i]];
      if (!right?.passageKey || left?.passageKey !== right.passageKey ||
          !(right.alternateStart > left.start && right.alternateStart < right.end)) continue;
      const row = document.createElement('div');
      row.className = 'media-actions';
      const measure = snapshot.timeline.measures[i];
      row.append(`Measure ${measure.measureNumber} · pass ${measure.occurrence} `);
      const listen = (name,seconds) => button(name+' '+time(seconds),async () => {
        try {if (current(snapshot)) await preview({start:seconds,end:right.end});}
        catch (error) {status.textContent = error.message;}
      });
      const use = button('Use alternate start',() => {
        if (applying || job || !sync() || !current(snapshot)) return;
        const old = right.start;
        left.end = right.start = right.alternateStart;
        right.alternateStart = old;
        draw(); sync();
        status.textContent = `Measure ${measure.measureNumber}, pass ${measure.occurrence} now starts at ${time(right.start)}. Both passage pins are fixed.`;
        comparisons.querySelector('summary').focus();
      });
      row.append(listen('Hear selected',right.start),listen('Hear alternate',right.alternateStart),use);
      compareRows.append(row);
    }
    const count = compareRows.childElementCount;
    comparisons.hidden = !count;
    compareTitle.textContent = `Compare alternate measure starts (${count})`;
  }
  async function refine(range) {
    if (job || applying || !result || !sync()) return;
    const r = result, {first,last,start,end} = range;
    if (first > last || !Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end <= start || end > r.snapshot.duration) {
      status.textContent = 'Choose measures in playback order and enter a start and a later end within the recording.';
      return;
    }
    const task = {snapshot:r.snapshot,controller:new AbortController()};
    job = task; cancel.hidden = false; sync();
    status.textContent = 'Matching the passage between your pins…';
    try {
      const features = r.features.slice(Math.floor(start/0.04)*12,Math.ceil(end/0.04)*12);
      const {points,alternatives} = await analyze({range,score:r.score,features},features,task.controller.signal);
      if (job !== task || result !== r || !current(r.snapshot)) return;
      const passageKey = Symbol();
      for (let i = first; i <= last; i++) {
        const takes = r.matches[i].filter(t => !t.refined);
        r.choices[i] = takes.length;
        r.locked[i] = true;
        takes.push({start:points[i-first],end:points[i-first+1],refined:true,pinnedStart:i===first,pinnedEnd:i===last,
          passageKey,alternateStart:alternatives[i-first]});
        r.matches[i] = takes;
      }
      draw(); status.textContent = 'Passage selected with both pins fixed. '+(comparisons.hidden
        ? 'Listen to the result, then review the draft.' : 'Listen to the alternate measure starts below before reviewing the draft.');
    } catch (error) {if (job === task) status.textContent = error.message;}
    finally {if (job === task) {job = null; cancel.hidden = true; sync();}}
  }
  async function openDraft() {
    if (!sync() || !result || applying) return;
    const r = result, s = r.snapshot;
    const choices = [...r.choices];
    const unchanged = () => result === r && current(s) && choices.every((choice,i) => r.choices[i] === choice);
    applying = true; sync();
    try {
      const draft = await suggestionDraft({measures:s.timeline.measures,matches:r.matches,choices,
        scoreSha256:s.scoreSha256,sourceSha256:r.sourceSha256,trackId:s.trackId});
      if (!unchanged()) throw Error('The recording or selection changed. Review the current takes.');
      await review(draft,unchanged);
      if (result === r) panel.open = false;
    } catch (error) { status.textContent = error.message; }
    finally { applying = false; sync(); }
  }
  reset();
  return {sync,reset};
}
