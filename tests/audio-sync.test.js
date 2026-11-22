import test from 'node:test';
import assert from 'node:assert/strict';
import {matchMeasures,recordingFeatures} from '../js/audio-sync-match.js';
import {scoreQueries,passageScore,initialChoices,followTake,selectedVisits,suggestionDraft} from '../js/audio-sync-score.js';
import {phraseMatches,orderedChoices,refinePassage,alternativeStarts} from '../js/audio-sync-passages.js';
import {validateTimingPlan} from '../js/explanation-timing.js';
import {draftPosition} from '../js/draft-alignment.js';
import {phrases,lessonSamples,sampleRate} from './audio-sync-fixture.js';

function timeline() {
  const measures = [1,2,1,2].map((measureNumber,i) => ({measureNumber,occurrence:i<2?1:2,
    startTick:i*1920,endTick:(i+1)*1920}));
  const events = measures.flatMap((bar,i) => phrases[bar.measureNumber-1].map((midi,j) => ({
    trackId:'0',playbackMeasureIndex:i,startTimeMs:i*2000+j*500,endTimeMs:i*2000+(j+1)*500,notes:[{midi}]
  })));
  return {measures,events,ticksPerQuarter:480,tempoMap:[{tick:0,timeMs:0,bpm:120}]};
}

test('lesson audio finds each take and keeps a spoken break outside the accepted written repeat',async () => {
  const score = timeline();
  const matches = matchMeasures(scoreQueries(score,'0'),lessonSamples());
  const starts = [[0.8,7,12],[2.8,14],[0.8,7,12],[2.8,14]];
  matches.forEach((takes,i) => {
    assert.equal(takes.length,starts[i].length,JSON.stringify(takes));
    takes.forEach((take,j) => assert(Math.abs(take.start-starts[i][j]) < 0.13,JSON.stringify(take)));
  });
  assert.deepEqual(initialChoices(matches),[-1,-1,-1,-1]);
  assert.deepEqual(followTake(matches,[0,-1,-1,-1],0),[0,0,-1,-1]);
  assert.throws(() => selectedVisits(score.measures,matches,[0,0,0,0]),/earlier take/);
  const draft = await suggestionDraft({measures:score.measures,matches,choices:[0,0,2,1],trackId:'0',
    scoreSha256:'a'.repeat(64),sourceSha256:'b'.repeat(64)});
  const plan = validateTimingPlan(draft.candidatePlan);
  assert.deepEqual(plan.musicalVisits.map(v => v.occurrence),[1,1,2,2]);
  assert.equal(draftPosition(plan,score,5.5).kind,'explanation');
  assert.equal(draftPosition(plan,score,8).kind,'explanation');
  assert.equal(draftPosition(plan,score,12.5).originalVisit,3);
});

test('silent recording, absent track, and isolated uninformative bar yield no match',() => {
  const score = timeline();
  assert(matchMeasures(scoreQueries(score,'0'),new Float32Array(44100)).every(row => !row.length));
  assert(scoreQueries(score,'1').every(bar => !bar.probes.length));
  score.measures = score.measures.slice(0,1); score.events = score.events.slice(0,1);
  assert.equal(scoreQueries(score,'0')[0].probes.length,0);
});

test('passage search alone finds an ordered repeat across an unscored break',() => {
  const score = timeline(), reference = passageScore(score,'0'), features = recordingFeatures(lessonSamples());
  const empty = score.measures.map(() => []);
  // Two adjacent measures make one uninterrupted query. Reuse the same
  // search on both visits to verify that order can distinguish the takes.
  const pair = phraseMatches({...reference,edges:[0,2,4]},features,17,[[],[]]);
  const matches = [...pair,...pair], choices = orderedChoices(matches);
  const visits = selectedVisits(score.measures,matches,choices);
  assert.equal(visits.length,4);
  [0.8,2.8,12,14].forEach((t,i) => assert(Math.abs(visits[i].startSeconds-t)<0.17));
  assert.deepEqual(phraseMatches(reference,new Float32Array(features.length),17,empty),empty);
  const three = phraseMatches(reference,features,17,empty);
  assert(three.some(row => row.length));
  assert(three.every(row => row.length <= 5));
  assert(three.flat().every(t => t.start >= 0 && t.end <= 17 && t.start < t.end));
});

test('refinement follows a changing tempo inside exact pins and rejects unrelated silence',() => {
  const score = passageScore(timeline(),'0'), full = recordingFeatures(lessonSamples());
  // Stretch the first bar of one take to three seconds and shorten the last
  // bar to one second. Straight interpolation would put the boundary at 2 s.
  const features = new Float32Array(100*12);
  for (let i = 0; i < 100; i++) {
    const source = 20+Math.floor(i<75 ? i*50/75 : 50+(i-75)*2);
    features.set(full.subarray(source*12,source*12+12),i*12);
  }
  const points = refinePassage(score,features,0,1,0.007,3.997);
  assert.equal(points[0],0.007); assert.equal(points[2],3.997);
  assert(Math.abs(points[1]-3)<0.17,JSON.stringify(points));
  assert.throws(() => refinePassage(score,new Float32Array(features.length),0,1,0,4),/Weak pitch match/);
  const visits = selectedVisits(timeline().measures,[[{start:0,end:2,pinnedEnd:true}],
    [{start:2.04,end:4}],[],[]],[0,0,-1,-1]);
  assert.equal(visits[0].endSeconds,2); assert.equal(visits[1].startSeconds,2.04);
});

test('a held last note yields an audible alternate for the next measure and preserves both pins',() => {
  const score = passageScore(timeline(),'0');
  const durations = [0.5,0.5,0.5,3,0.5,0.5,0.5,0.5];
  const end = 6.5, features = new Float32Array(Math.ceil(end/0.04)*12);
  let start = 0;
  for (const [i,duration] of durations.entries()) {
    for (let frame = Math.round(start/0.04); frame < Math.round((start+duration)/0.04); frame++)
      features[frame*12+score.notes[i].pitch] = 1;
    start += duration;
  }
  const points = refinePassage(score,features,0,1,0,end);
  const original = [...points];
  const [first,alternate,last] = alternativeStarts(score,features,0,1,0,points);
  assert.equal(first,null); assert.equal(last,null);
  assert(Math.abs(alternate-4.5)<0.08);
  assert(Math.abs(alternate-points[1])>0.25);
  assert.deepEqual(points,original);
  assert.deepEqual(alternativeStarts(score,features,0,1,0,[0,alternate,end]),[null,null,null]);
});

test('strummed chords tolerate staggered strings and modest timing variation',() => {
  const score = timeline();
  score.measures = score.measures.slice(0,1);
  score.events = score.events.slice(0,4);
  const chords = [[48,52,55],[45,48,52],[50,53,57],[43,47,50]];
  const pcm = new Float32Array(5*sampleRate);
  score.events.forEach((event,i) => {
    event.notes = chords[i].map(midi => ({midi}));
    event.notes.forEach(({midi},j) => {
      const onset = Math.round(([1.12,1.66,2.21,2.79][i]+j*0.014)*sampleRate);
      for (let n = 0; n < 0.50*sampleRate; n++) {
        const t = n/sampleRate, phase = 2*Math.PI*440*2**((midi-69)/12)*t;
        pcm[onset+n] += 0.2*Math.exp(-2*t)*(Math.sin(phase)+0.3*Math.sin(2*phase));
      }
    });
  });
  const [takes] = matchMeasures(scoreQueries(score,'0'),pcm);
  assert.equal(takes.length,1);
  assert(Math.abs(takes[0].start-1.12)<0.12);
  assert(Math.abs(takes[0].end-3.34)<0.20);
});
