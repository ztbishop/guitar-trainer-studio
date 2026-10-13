// Synthetic native scores only; no personal tabs or production storage.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export const profiles = [
  {name:'One string',tuning:[64],capo:0},
  {name:'Four strings',tuning:[43,38,33,28],capo:0},
  {name:'Five strings',tuning:[43,38,33,28,23],capo:0},
  {name:'Six strings drop D capo 2',tuning:[64,59,55,50,45,38],capo:2},
  {name:'Seven strings',tuning:[64,59,55,50,45,40,35],capo:0},
  {name:'Eight strings',tuning:[64,59,55,50,45,40,35,30],capo:0},
  {name:'Twelve strings',tuning:[64,64,59,59,55,55,50,50,45,45,40,40],capo:0},
];

export function nativeAlphaTab() {
  const context=vm.createContext({console,process,TextEncoder,TextDecoder});
  vm.runInContext(readFileSync(new URL('../assets/vendor/alphatab/alphaTab.js',import.meta.url),'utf8'),context);
  return context.alphaTab;
}

export function fixtureScore(at) {
  const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const noteName=p=>names[p%12]+(Math.floor(p/12)-1);
  let combined;
  for(const profile of profiles) {
    const n=profile.tuning.length;
    const parser=new at.importer.AlphaTexImporter();
    parser.initFromString(`\\title "Fretboard string-count QA" \\track "${profile.name}" \\tuning ${profile.tuning.map(noteName).join(' ')} \\capo ${profile.capo} . (0.1 3.${n}).4 12.1.4 24.${n}.4 36.1.4`,new at.Settings());
    const score=parser.readScore();
    if(!combined)combined=score;
    else combined.addTrack(score.tracks[0]);
  }
  // Each separate AlphaTex parse starts its ID counters at zero; joined tracks
  // need unique IDs before native playback lookup generation.
  let barId=0,voiceId=0,beatId=0,noteId=0;
  for(const track of combined.tracks)for(const staff of track.staves)for(const bar of staff.bars) {
    bar.id=barId++;
    for(const voice of bar.voices) {
      voice.id=voiceId++;
      for(const beat of voice.beats) {
        beat.id=beatId++;
        for(const note of beat.notes)note.id=noteId++;
      }
    }
  }
  combined.finish(new at.Settings());
  return combined;
}
