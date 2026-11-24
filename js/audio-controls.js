// Mixer presentation and preferences. Native audio calls stay in alphatab-host.
import {AppState} from './app-state.js';

// Bank zero in the bundled Sonivox General MIDI soundfont, in program order.
const presetFamilies = [
  ['Pianos','Grand piano|Bright piano|Electric grand piano|Honky-tonk piano|Electric piano 1|Electric piano 2|Harpsichord|Clavinet'],
  ['Chromatic percussion','Celesta|Glockenspiel|Music box|Vibraphone|Marimba|Xylophone|Tubular bells|Dulcimer'],
  ['Organs','Drawbar organ|Percussive organ|Rock organ|Church organ|Reed organ|Accordion|Harmonica|Bandoneon'],
  ['Guitars','Nylon-string guitar|Steel-string guitar|Jazz guitar|Clean guitar|Muted guitar|Overdriven guitar|Distortion guitar|Guitar harmonics'],
  ['Basses','Acoustic bass|Fingered bass|Picked bass|Fretless bass|Slap bass 1|Slap bass 2|Synth bass 1|Synth bass 2'],
  ['Strings','Violin|Viola|Cello|Contrabass|Tremolo strings|Pizzicato strings|Harp|Timpani'],
  ['Ensembles','String ensemble|Slow strings|Synth strings 1|Synth strings 2|Choir aahs|Voice oohs|Synth voice|Orchestra hit'],
  ['Brass','Trumpet|Trombone|Tuba|Muted trumpet|French horn|Brass section|Synth brass 1|Synth brass 2'],
  ['Reeds','Soprano sax|Alto sax|Tenor sax|Baritone sax|Oboe|English horn|Bassoon|Clarinet'],
  ['Pipes','Piccolo|Flute|Recorder|Pan flute|Blown bottle|Shakuhachi|Whistle|Ocarina'],
  ['Synth leads','Square lead|Saw lead|Calliope lead|Chiff lead|Charang|Solo vox|Fifths lead|Bass and lead'],
  ['Synth pads','Fantasia|Warm pad|Polysynth|Space voice|Bowed glass|Metal pad|Halo pad|Sweep pad'],
  ['Synth effects','Ice rain|Soundtrack|Crystal|Atmosphere|Brightness|Goblin|Echoes|Star theme'],
  ['World instruments','Sitar|Banjo|Shamisen|Koto|Kalimba|Bagpipe|Fiddle|Shanai'],
  ['Percussive sounds','Tinkle bell|Agogo|Steel drums|Woodblock|Taiko|Melodic tom|Synth drum|Reverse cymbal'],
  ['Sound effects','Guitar fret noise|Breath noise|Seashore|Bird|Telephone|Helicopter|Applause|Gunshot'],
];

function soundMenu() {
  const select=document.createElement('select');
  select.className='mixer-sound';
  select.append(new Option('Score instrument',''));
  let program=0;
  for(const [family,names] of presetFamilies) {
    const group=document.createElement('optgroup');
    group.label=family;
    for(const name of names.split('|'))group.append(new Option(name,String(program++)));
    select.append(group);
  }
  return select;
}

export function canChangeTrackSound() {
  const wait=AppState.waitTrainer;
  return AppState.playerReady && !AppState.media.preview && !AppState.isPlaying && !AppState.countInActive &&
    !(AppState.mode==='wait' && wait?.active && wait.phase!=='paused');
}

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
  const mediaSlider=document.getElementById('media-volume');
  const mediaNumber=document.getElementById('media-volume-number');
  const mixer=document.getElementById('track-mixer');
  AppState.audio.mediaPercent=clampVolume(AppState.audio.mediaPercent,100);
  try { const saved=window.localStorage.getItem('gts.masterVolume'); if(saved!==null)AppState.audio.masterPercent=clampVolume(saved); } catch {}
  try { const saved=window.localStorage.getItem('gts.mediaVolume'); if(saved!==null)AppState.audio.mediaPercent=clampVolume(saved); } catch {}
  function commit(value) {
    AppState.audio.masterPercent=clampVolume(value,AppState.audio.masterPercent);
    slider.value=number.value=String(AppState.audio.masterPercent);
    try {window.localStorage.setItem('gts.masterVolume',String(AppState.audio.masterPercent));} catch {}
    onChange('master');
  }
  function commitMedia(value) {
    AppState.audio.mediaPercent=clampVolume(value,AppState.audio.mediaPercent);
    mediaSlider.value=mediaNumber.value=String(AppState.audio.mediaPercent);
    try {window.localStorage.setItem('gts.mediaVolume',String(AppState.audio.mediaPercent));} catch {}
    onChange('media',AppState.audio.mediaPercent);
  }
  slider.addEventListener('input',()=>commit(slider.value));
  number.addEventListener('change',()=>commit(number.value));
  number.addEventListener('blur',()=>commit(number.value));
  number.addEventListener('keydown',event=>{if(event.key==='Enter')commit(number.value);});
  mediaSlider.addEventListener('input',()=>commitMedia(mediaSlider.value));
  mediaNumber.addEventListener('change',()=>commitMedia(mediaNumber.value));
  mediaNumber.addEventListener('blur',()=>commitMedia(mediaNumber.value));
  mediaNumber.addEventListener('keydown',event=>{if(event.key==='Enter')commitMedia(mediaNumber.value);});
  let template, soundControls=[], soundEnabled;
  function syncAvailability() {
    const enabled=canChangeTrackSound();
    if(enabled===soundEnabled)return;
    soundEnabled=enabled;
    for(const select of soundControls) {
      select.disabled=!enabled;
      select.title=enabled?'Synth playback instrument':'Choose a sound while synth playback is paused';
    }
  }
  function sync() {
    slider.value=number.value=String(AppState.audio.masterPercent);
    mediaSlider.value=mediaNumber.value=String(AppState.audio.mediaPercent);
    mixer.replaceChildren();
    soundControls=[];soundEnabled=undefined;
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
        AppState.audio.tracks[group.id]={...AppState.audio.tracks[group.id],volumePercent:Number(volume.value),muted:mute.checked};
        output.textContent=`${volume.value}%`;onChange('tracks');
      }
      volume.addEventListener('input',update);mute.addEventListener('change',update);
      row.append(label);
      if(group.channels.size && !group.channels.has(9) && !group.tracks.some(track=>track.staves?.some(staff=>staff.isPercussion))) {
        template??=soundMenu();
        const select=template.cloneNode(true);
        select.setAttribute('aria-label',`Synth sound for ${label.textContent}`);
        select.value=String(state.program??'');
        select.addEventListener('change',()=>{
          const program=select.value===''?null:Number(select.value);
          if(!onChange('sound',{id:group.id,program}))select.value=String(AppState.audio.tracks[group.id]?.program??'');
        });
        soundControls.push(select);row.append(select);
      }
      row.append(volume,output,muteLabel);mixer.append(row);
    }
    syncAvailability();
  }
  sync();return {sync,syncAvailability};
}
