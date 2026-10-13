// Run with Node to regenerate the synthetic Guitar Pro file used for browser QA.
import {mkdirSync,writeFileSync} from 'node:fs';
import {nativeAlphaTab,fixtureScore} from './fretboard-fixtures.js';
import {buildPlaybackTimeline,getPracticeEvents} from '../js/score-playback.js';
const at=nativeAlphaTab(),settings=new at.Settings(),score=fixtureScore(at);
const bytes=new at.exporter.Gp7Exporter().export(score,settings);
const output=new URL('./fixtures/',import.meta.url);mkdirSync(output,{recursive:true});
writeFileSync(new URL('fretboard-multistring.gp',output),bytes);
const midi=new at.midi.MidiFile();
const generator=new at.midi.MidiFileGenerator(score,settings,new at.midi.AlphaSynthMidiFileHandler(midi));generator.generate();
const timeline=buildPlaybackTimeline(generator.tickLookup);
const data=score.tracks.map(track=>({name:track.name,track:{staves:track.staves.map(staff=>({tuning:[...staff.tuning],capo:staff.capo,transpositionPitch:staff.transpositionPitch}))},events:getPracticeEvents(timeline,String(track.index))}));
writeFileSync(new URL('fretboard-profiles.json',output),JSON.stringify(data,null,2));
console.log(data.map(profile=>({name:profile.name,strings:profile.track.staves[0].tuning.length,events:profile.events.length})));
