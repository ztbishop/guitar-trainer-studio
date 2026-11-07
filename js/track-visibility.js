// Display-only track identities, labels and per-song preferences. No native API.
export const TRACK_VIEW_MODES=['practice-only','all-tracks','custom'];
const keyPrefix='gts.trackVisibility.';
const originalNames=new WeakMap();
export const trackId=(track,index)=>String(track.index??index);

export function friendlyTrackName(name) {
  const text=String(name??'').trim();
  // Only recognized provider wrappers, never arbitrary score text or markup.
  const match=/^@\$(Chords|Strumming)\$@$/i.exec(text)
    || /^@\\?\((Chords|Strumming)\\?\)@$/i.exec(text);
  return match ? match[1][0].toUpperCase()+match[1].slice(1).toLowerCase() : text;
}

export function rememberTrackNames(tracks) {
  for(const track of tracks) {
    if(!originalNames.has(track))originalNames.set(track,{name:track.name,shortName:track.shortName});
    const original=originalNames.get(track);
    track.name=friendlyTrackName(original.name);
    if(original.shortName!=null)track.shortName=friendlyTrackName(original.shortName);
  }
}
export function originalTrackNames(track) {return originalNames.get(track) || {name:track.name,shortName:track.shortName};}

export function validTrackIds(ids,tracks) {
  const selected=new Set(Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[]);
  return tracks.map(trackId).filter(id=>selected.has(id));
}
export function selectedScoreTracks(state) {
  if(state.viewMode==='all-tracks')return state.tracks.slice();
  const selected=new Set(state.viewMode==='custom'?state.customTrackIds:[String(state.practiceTrackId)]);
  return state.tracks.filter((track,index)=>selected.has(trackId(track,index)));
}
export function restoreTrackVisibility(state,storage) {
  const fallback=state.viewMode==='all-tracks'?'all-tracks':'practice-only';
  let saved;
  try {
    storage??=globalThis.window?.localStorage;
    saved=state.currentScoreFile?.hash?JSON.parse(storage?.getItem(keyPrefix+state.currentScoreFile.hash)??'null'):null;
  } catch {}
  state.viewMode=TRACK_VIEW_MODES.includes(saved?.mode)?saved.mode:fallback;
  state.customTrackIds=validTrackIds(saved?.ids,state.tracks);
  state.customTrackSelectionSet=state.customTrackIds.length>0;
  if(!state.customTrackIds.length)state.customTrackIds=validTrackIds([String(state.practiceTrackId)],state.tracks);
}
export function saveTrackVisibility(state,storage) {
  if(!state.currentScoreFile?.hash)return;
  try {
    storage??=globalThis.window?.localStorage;
    storage?.setItem(keyPrefix+state.currentScoreFile.hash,JSON.stringify({mode:state.viewMode,ids:state.customTrackSelectionSet===false?[]:validTrackIds(state.customTrackIds,state.tracks)}));
  } catch { /* Storage unavailable: the current display remains usable. */ }
}
