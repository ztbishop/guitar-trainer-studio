// Synthetic native scores, shared by Node mapping and isolated browser checks.
import {createRequire} from 'node:module';
import {buildPlaybackTimeline} from '../js/score-playback.js';
import {pointTick} from '../js/media-sync.js';
const at=createRequire(import.meta.url)('../assets/vendor/alphatab/alphaTab.js');
export const repeatCases=[
  {name:'ordinary repeat',tex:String.raw`\tempo 120 . \ro 0.6.1 | \rc 2 2.6.1 | 3.6.1`,order:[1,2,1,2,3]},
  {name:'alternate endings',tex:String.raw`\tempo 120 . \ro 0.6.1 | \ae 1 \rc 2 2.6.1 | \ae 2 3.6.1`,order:[1,2,1,3]},
  {name:'D.C. al Coda',directions:[[1,'JumpDaCoda'],[3,'JumpDaCapoAlCoda'],[4,'TargetCoda']],order:[1,2,3,4,1,2,5,6]},
  {name:'D.S. al Coda',directions:[[1,'TargetSegno'],[2,'JumpDaCoda'],[3,'JumpDalSegnoAlCoda'],[4,'TargetCoda']],order:[1,2,3,4,2,3,5,6]},
  {name:'D.C. al Fine',directions:[[1,'TargetFine'],[3,'JumpDaCapoAlFine']],order:[1,2,3,4,1,2]},
];
export function repeatFixture(spec=repeatCases[0]) {
  const settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString(spec.tex ?? String.raw`\tempo 120 . 0.6.1 | 1.6.1 | 2.6.1 | 3.6.1 | 4.6.1 | 5.6.1`,settings);
  const score=parser.readScore();
  for(const [index,direction] of spec.directions??[])score.masterBars[index].addDirection(at.model.Direction[direction]);
  function generate() {
    const midi=new at.midi.MidiFile(),generator=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));
    generator.generate();
    return {generator,timeline:buildPlaybackTimeline(generator.tickLookup,{tempo:score.tempo,ticksPerQuarter:midi.division})};
  }
  const {timeline}=generate();
  // One distinct time per visit. Nonlinear spacing catches occurrence mixups.
  const time=i=>500+400*i+10*i*i;
  const points=timeline.measures.map((m,i)=>({barIndex:m.measureNumber-1,barOccurence:m.occurrence-1,barPosition:0,millisecondOffset:time(i)}));
  const last=timeline.measures.at(-1);
  points.push({barIndex:last.measureNumber-1,barOccurence:last.occurrence-1,barPosition:1,millisecondOffset:time(timeline.measures.length)});
  score.applyFlatSyncPoints(points);
  const regenerated=generate();
  return {score,settings,timeline,points,...regenerated,expectedTicks:points.map(p=>pointTick(p,timeline)),
    bytes:new at.exporter.Gp7Exporter().export(score,settings)};
}

export function longLoopFixture() {
  const settings=new at.Settings(),parser=new at.importer.AlphaTexImporter();
  parser.initFromString('\\tempo 120 . '+Array.from({length:48},(_,i)=>`${i%8}.6.1`).join(' | '),settings);
  return new at.exporter.Gp7Exporter().export(parser.readScore(),settings);
}
