import {matchSingleMeasures,recordingFeatures,SAMPLE_RATE} from './audio-sync-match.js';
import {phraseMatches,orderedChoices,refinePassage,alternativeStarts} from './audio-sync-passages.js';
import {rhythmicMatches} from './audio-sync-rhythm.js';
import {suggestPrecedingMeasures,suggestInteriorMeasures} from './audio-sync-backward.js';
import {checkContextTakes} from './audio-sync-context.js';
import {recoverSteadyPassages} from './audio-sync-steady.js';
import {recoverChordSequences} from './audio-sync-chord-sequence.js';
import {recoverChordVariations} from './audio-sync-chord-takes.js';
import {refineOpeningChord} from './audio-sync-ringing.js';
import {recoverPinnedPhrases} from './audio-sync-pinned-phrases.js';

self.onmessage = async ({data}) => {
  try {
    if (data.range) {
      const {first,last,start,end} = data.range;
      const points = refinePassage(data.score,data.features,first,last,start,end);
      const alternatives = data.standard ? [] : alternativeStarts(data.score,data.features,first,last,start,points);
      self.postMessage({points,alternatives});
      return;
    }
    const features = recordingFeatures(data.samples), duration = data.samples.length/SAMPLE_RATE;
    if(data.featuresOnly){self.postMessage({features},[features.buffer]);return;}
    const singles = matchSingleMeasures(data.bars,features,duration,(done,total) =>
      self.postMessage({phase:'Searching measures',done,total}));
    let matches = phraseMatches(data.score,features,duration,singles,(done,total) =>
      self.postMessage({phase:'Searching three-measure passages',done,total}));
    const hasPitchMatches = matches.some(row => row.length);
    if (!hasPitchMatches) {
      self.postMessage({phase:'Checking longer riffs',done:0,total:1});
      matches = rhythmicMatches(data.score,features,duration);
    }
    const choices=orderedChoices(matches);
    suggestPrecedingMeasures(data.bars,matches,choices,features);
    suggestInteriorMeasures(data.bars,matches,choices,data.samples,data.score,features);
    if (hasPitchMatches) checkContextTakes(data.score,data.bars,data.samples,duration,singles,matches,choices,
      (phase,done,total)=>self.postMessage({phase,done,total}));
    if (hasPitchMatches) {
      recoverSteadyPassages(data.score,data.bars,data.samples,matches,choices);
      recoverChordSequences(data.score,data.bars,data.samples,matches,choices);
      recoverChordVariations(data.score,data.samples,features,matches,choices);
      refineOpeningChord(data.score,data.samples,matches,choices);
    }
    if (data.continuous) {
      self.postMessage({phase:'Following the continuous performance',done:0,total:1});
      const {continuousPerformance}=await import('./audio-sync-continuous.js');
      continuousPerformance(data.score,data.samples,features,matches,choices,data.bars);
      const {recoverPaddedEnding}=await import('./audio-sync-ending.js');
      recoverPaddedEnding(data.score,data.samples,features,matches,choices);
    } else {
      recoverPinnedPhrases(data.score,features,matches,choices);
      if(matches.some(row=>row.length)){
        const {selectPhraseTakes}=await import('./audio-sync-phrase-takes.js');
        selectPhraseTakes(data.score.edges,matches,choices);
      } else {
        const registers=data.bars.map(b=>b.register).filter(r=>Number.isFinite(r?.low) && Number.isFinite(r.high));
        if(registers.length){
          self.postMessage({phase:'Listening for fills between rests',done:0,total:1});
          const {sparseFillTakes}=await import('./audio-sync-sparse.js');
          const low=registers.reduce((v,r)=>Math.min(v,r.low),Infinity);
          const high=registers.reduce((v,r)=>Math.max(v,r.high),-Infinity);
          const band=recordingFeatures(data.samples,low-3,high+3);
          for(const take of sparseFillTakes(data.score,band,duration)){
            choices[take.index]=0;
            matches[take.index].push(take);
          }
        }
      }
    }
    self.postMessage({matches,choices,features},[features.buffer]);
  } catch (error) {
    self.postMessage({error:error.message});
  }
};
