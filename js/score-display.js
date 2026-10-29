// Pure display projection on score metadata. No native API, timing or grading.
const visibilityKeys=['showStandardNotation','showTablature','showSlashNotation','showNumberedNotation'];
export function hasWrittenTab(staff) {
  if(staff.isPercussion || !staff.tuning?.length)return false;
  const notes=(staff.bars||[]).flatMap(bar=>(bar.voices||[]).flatMap(voice=>(voice.beats||[]).flatMap(beat=>beat.notes||[])));
  return notes.length>0 && notes.every(note=>Number.isInteger(note.string) && note.string>=1 && note.string<=staff.tuning.length &&
    (note.isDead || Number.isInteger(note.fret) && note.fret>=0));
}
export class ScoreDisplayProjection {
  constructor(){this.defaults=new WeakMap();}
  remember(score) {
    for(const track of score?.tracks||[])for(const staff of track.staves||[])if(!this.defaults.has(staff))
      this.defaults.set(staff,{flags:Object.fromEntries(visibilityKeys.map(key=>[key,staff[key]])),tab:hasWrittenTab(staff)});
  }
  apply(score,choice='score-default') {
    this.remember(score);let changed=false;
    for(const track of score?.tracks||[])for(const staff of track.staves||[]) {
      const original=this.defaults.get(staff);
      const flags=choice==='score-default'?original.flags:{
        showStandardNotation:choice!=='tab' || !original.tab,
        showTablature:choice!=='notation' && original.tab,
        showSlashNotation:false,showNumberedNotation:false,
      };
      for(const key of visibilityKeys)if(staff[key]!==flags[key]){staff[key]=flags[key];changed=true;}
    }
    return changed;
  }
}
export function visibleScoreTracks(state) {
  return state.viewMode==='all-tracks'?state.tracks:state.tracks.filter((track,index)=>String(track.index??index)===String(state.practiceTrackId));
}
export function visibleTab(state) {
  return visibleScoreTracks(state).some(track=>track.staves?.some(staff=>staff.showTablature));
}
