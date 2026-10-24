// Pure score-display selection. Playback occurrences, not written bar numbers,
// distinguish repeats. No session, MIDI, storage or native API mutations.
export function fretboardBeats(timeline, trackId, range=null) {
  return (timeline?.events??[]).filter(event=>event.trackId===String(trackId) &&
    (!range || event.startTick>=range.startTick-1 && event.startTick<range.endTick));
}

export function fretboardStepTick(beats,tick,direction) {
  const ticks=[...new Set(beats.map(event=>event.startTick))].sort((a,b)=>a-b);
  return direction<0 ? ticks.filter(value=>value<tick-2).at(-1)??null
    : ticks.find(value=>value>tick+2)??null;
}

export function fretboardContext(beats,currentEvent,mode='beat',{loop=false}={}) {
  if(!currentEvent || mode==='beat')return [];
  const tick=currentEvent.startTick;
  const next=beats.find(event=>event.startTick>tick+1)??(loop?beats[0]:null);
  const nextEvents=next && next.startTick!==tick?beats.filter(event=>event.startTick===next.startTick).map(event=>({...event,previewState:'future'})):[];
  if(mode==='next') {
    return nextEvents;
  }
  if(mode!=='bar')return [];
  const context=beats.filter(event=>event.playbackMeasureIndex===currentEvent.playbackMeasureIndex && event.startTick!==tick)
    .map(event=>({...event,previewState:event.startTick<tick?'past':'future'}));
  if(!context.some(event=>event.previewState==='future'))context.push(...nextEvents);
  return context;
}

export function fretboardLabel(marker,mode='notes') {
  if(mode==='none')return '';
  if(mode==='frets')return String(marker.fret);
  if(mode==='fingers')return marker.finger===0?'T':[1,2,3,4].includes(marker.finger)?String(marker.finger):'';
  return null; // Renderer supplies the existing pitch-class spelling.
}
