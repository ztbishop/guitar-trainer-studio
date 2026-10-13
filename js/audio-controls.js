// Mixer presentation and preferences. Native audio calls stay in alphatab-host.
import {AppState} from './app-state.js';

export function clampVolume(value, fallback=100) {
  return String(value).trim()!=='' && Number.isFinite(Number(value)) ? Math.max(0,Math.min(100,Number(value))) : fallback;
}

// Native track controls operate on MIDI channels. Group overlapping channels
// (including transitive overlaps) so one control cannot undo another.
export function playbackGroups(tracks) {
  const groups=[];
  for(const track of tracks) {
    const channels=new Set([track.playbackInfo?.primaryChannel,track.playbackInfo?.secondaryChannel].filter(Number.isInteger));
    const matches=groups.filter(group=>[...channels].some(channel=>group.channels.has(channel)));
    const group={tracks:[track],channels};
    for(const match of matches) {
      group.tracks.push(...match.tracks);
      for(const channel of match.channels)channels.add(channel);
      groups.splice(groups.indexOf(match),1);
    }
    groups.push(group);
  }
  return groups.map(group=>({...group,id:group.tracks.map(track=>String(track.index)).sort().join(':')}));
}

export function initAudioControls(onChange) {
  const slider=document.getElementById('master-volume');
  const number=document.getElementById('master-volume-number');
  const mixer=document.getElementById('track-mixer');
  try { const saved=window.localStorage.getItem('gts.masterVolume'); if(saved!==null)AppState.audio.masterPercent=clampVolume(saved); } catch {}
  function commit(value) {
    AppState.audio.masterPercent=clampVolume(value,AppState.audio.masterPercent);
    slider.value=number.value=String(AppState.audio.masterPercent);
    try {window.localStorage.setItem('gts.masterVolume',String(AppState.audio.masterPercent));} catch {}
    onChange('master');
  }
  slider.addEventListener('input',()=>commit(slider.value));
  number.addEventListener('change',()=>commit(number.value));
  number.addEventListener('blur',()=>commit(number.value));
  number.addEventListener('keydown',event=>{if(event.key==='Enter')commit(number.value);});
  function sync() {
    slider.value=number.value=String(AppState.audio.masterPercent);
    mixer.replaceChildren();
    if(!AppState.tracks.length){mixer.textContent='Load a score to adjust its tracks.';return;}
    for(const group of playbackGroups(AppState.tracks)) {
      const state=AppState.audio.tracks[group.id] ?? {volumePercent:100,muted:false};
      const row=document.createElement('div');row.className='mixer-track';
      const label=document.createElement('div');label.className='mixer-title';
      label.textContent=group.tracks.map(track=>track.name || `Track ${track.index+1}`).join(' + ');
      if(group.tracks.length>1)label.textContent+=' (shared channels)';
      const volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='100';volume.value=String(state.volumePercent);
      volume.setAttribute('aria-label',`${label.textContent} volume`);volume.disabled=!AppState.playerReady;
      const output=document.createElement('output');output.textContent=`${state.volumePercent}%`;
      const muteLabel=document.createElement('label');muteLabel.className='menu-option';
      const mute=document.createElement('input');mute.type='checkbox';mute.checked=state.muted;mute.disabled=!AppState.playerReady;
      mute.setAttribute('aria-label',`Mute ${label.textContent}`);
      muteLabel.append(mute,' Mute');
      function update() {
        AppState.audio.tracks[group.id]={volumePercent:Number(volume.value),muted:mute.checked};
        output.textContent=`${volume.value}%`;onChange('tracks');
      }
      volume.addEventListener('input',update);mute.addEventListener('change',update);
      row.append(label,volume,output,muteLabel);mixer.append(row);
    }
  }
  sync();return {sync};
}
