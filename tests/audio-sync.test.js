import test from 'node:test';
import assert from 'node:assert/strict';
import {matchMeasures} from '../js/audio-sync-match.js';
import {scoreQueries,initialChoices,followTake,selectedVisits,suggestionDraft} from '../js/audio-sync-score.js';
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
