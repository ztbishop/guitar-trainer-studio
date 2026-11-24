// Normalize alphaTab's generated playback lookup into score-independent data.
// No transport control or correctness decisions belong here.
import { midiToNoteName } from './note-utils.js';
import { writtenBendSegment } from './written-bends.js';

export function tickToTimeMs(timeline, tick, speed = 1) {
  if (!timeline?.tempoMap?.length || !Number.isFinite(tick) || !(speed > 0)) return null;
  let segment = timeline.tempoMap[0];
  for (const next of timeline.tempoMap) {
    if (next.tick > tick) break;
    segment = next;
  }
  return (segment.timeMs + (Math.max(0, tick) - segment.tick) * 60000 / (segment.bpm * timeline.ticksPerQuarter)) / speed;
}

export function timeMsToTick(timeline, timeMs, speed = 1) {
  if (!timeline?.tempoMap?.length || !Number.isFinite(timeMs) || !(speed > 0)) return null;
  const baseTime = Math.max(0, timeMs) * speed;
  let segment = timeline.tempoMap[0];
  for (const next of timeline.tempoMap) {
    if (next.timeMs > baseTime) break;
    segment = next;
  }
  return segment.tick + (baseTime - segment.timeMs) * segment.bpm * timeline.ticksPerQuarter / 60000;
}

function unboundedExpression(beat,note,ignoreVibrato=false,ignoreLetRing=false) {
  return Boolean(!ignoreLetRing && (beat.isLetRing || note.isLetRing) || beat.whammyBarPoints?.length || beat.whammyBarType || !ignoreVibrato && beat.vibrato || beat.fade ||
    note.bendPoints?.length || note.bendType || !ignoreVibrato && note.vibrato ||
    note.slideOutType || note.slideTarget || note.gtsTiedBend || note.gtsFallingTie || note.gtsWrittenVibrato ||
    note.gtsSourceArticulation || note.gtsSlidePlayback || note.gtsRepeatTieRelease || note.gtsTappedHarmonicTicks>0);
}

// A plain tie wholly inside one native bar has an explicit release. Prove the
// whole reciprocal chain; ties across bars/repeat jumps and expressive carry
// keep the existing conservative guard. This evidence never edits the score.
function boundedPlainTie(note,duration,proof,ignoreLetRing=false) {
  if(proof.has(note))return proof.get(note);
  const voice=note.beat?.voice,bar=voice?.bar,seen=new Set(),chain=[];
  let first=note,valid=Boolean(bar && Number.isFinite(duration) && duration>0);
  while(valid && (first.isTieDestination || first.tieOrigin)) {
    if(seen.has(first) || seen.size>=4096 || !first.isTieDestination || !first.tieOrigin ||
      first.beat?.voice!==voice || first.tieOrigin.beat?.voice!==voice || first.tieOrigin.tieDestination!==first){valid=false;break;}
    seen.add(first);first=first.tieOrigin;
  }
  seen.clear();let previous=null;
  for(let current=first;valid && current;current=current.tieDestination) {
    const beat=current.beat,start=beat?.playbackStart,length=beat?.playbackDuration;
    // Ordinary native vibrato changes pitch during this finite segment.
    const vibrato=Boolean((beat?.vibrato||current.vibrato) && !ignoreLetRing && knownVibrato(beat,current) && finiteNativeNote(beat,current,duration,true));
    if(seen.has(current) || seen.size>=4096 || beat?.voice!==voice || beat.graceType!==0 || current.isDead ||
      voice.beats?.[beat.index]!==beat || bar.voices?.[voice.index]!==voice || !beat.notes?.includes(current) ||
      unboundedExpression(beat,current,vibrato,ignoreLetRing) || !Number.isFinite(current.realValue) || current.realValue!==first.realValue ||
      current.string!==first.string || current.fret!==first.fret ||
      !Number.isFinite(start) || !Number.isFinite(length) || length<=0 || start<0 || start+length>duration ||
      Boolean(current.isTieDestination)!==Boolean(previous) || (current.tieOrigin??null)!==previous ||
      Boolean(current.isTieOrigin)!==Boolean(current.tieDestination) ||
      previous && previous.beat.playbackStart+previous.beat.playbackDuration!==start) {valid=false;break;}
    seen.add(current);chain.push(current);previous=current;
  }
  valid=valid && chain.length>1 && seen.has(note);
  for(const member of chain)proof.set(member,valid);
  proof.set(note,valid);return valid;
}

function finiteNativeNote(beat,note,duration,ignoreVibrato=false,ignoreLetRing=false) {
  const voice=beat?.voice,bar=voice?.bar,start=beat?.playbackStart,length=beat?.playbackDuration;
  return Boolean(bar && voice.beats?.[beat.index]===beat && bar.voices?.[voice.index]===voice && beat.notes?.includes(note) &&
    beat.graceType===0 && !beat.fermata && !beat.tremoloPicking && !beat.brushType && !beat.rasgueado && !note.isDead &&
    !unboundedExpression(beat,note,ignoreVibrato,ignoreLetRing) && Number.isFinite(note.realValue) &&
    Number.isFinite(start) && Number.isFinite(length) && length>0 && start>=0 && start+length<=duration);
}

function knownVibrato(beat,note) {
  return [0,1,2].includes(beat.vibrato??0) && [0,1,2].includes(note.vibrato??0);
}

function finiteVibrato(beat,note,duration) {
  return Boolean((beat.vibrato||note.vibrato) && knownVibrato(beat,note) &&
    !note.isTieOrigin && !note.isTieDestination && !note.tieOrigin && !note.tieDestination && finiteNativeNote(beat,note,duration,true));
}

function expressiveHold(beat,note,duration,proof) {
  if(note.isTieOrigin || note.isTieDestination || note.tieOrigin || note.tieDestination)return !boundedPlainTie(note,duration,proof);
  return unboundedExpression(beat,note) && !finiteVibrato(beat,note,duration);
}

// Match a single generated note-on/off on the original track, channel and pitch.
// A unison overlap, a same-tick reattack or a pedal leaves the release uncertain.
function generatedReleases(file,types,division) {
  if(!types || file?.division!==division || file.tracks?.length!==1 || !Array.isArray(file.tracks[0]?.events) || !Number.isSafeInteger(file.tickShift))return null;
  const lanes=new Map(),ends=new Map(),pedals=new Set();
  let previous=-Infinity;
  for(const e of file.tracks[0].events){
    const tick=e.tick-file.tickShift;
    if(!Number.isFinite(tick) || tick<previous)return null;
    previous=tick;
    if(e.type===types.ControlChange && [64,66,69].includes(e.controller) && e.value>0)pedals.add(e.channel);
    if(e.type!==types.NoteOn && e.type!==types.NoteOff)continue;
    const key=e.channel*128+e.noteKey;
    let lane=lanes.get(key);
    if(!lane){lane={depth:0,start:null,end:null};lanes.set(key,lane);}
    if(e.type===types.NoteOn){
      if(lane.end===tick)ends.delete(lane.lastKey);
      lane.start=lane.depth===0 && e.noteVelocity>0?e.track+':'+key+':'+tick:null;
      lane.track=e.track;lane.depth++;
    }else{
      if(lane.depth===0){lane.invalid=true;continue;}
      if(--lane.depth===0 && lane.start && lane.track===e.track){
        ends.set(lane.start,tick);lane.lastKey=lane.start;lane.end=tick;lane.start=null;
      }
    }
  }
  return (note,start)=>{
    const track=note.beat.voice.bar.staff.track,channel=track.playbackInfo.primaryChannel,key=channel*128+note.realValue;
    if(pedals.has(channel)||lanes.get(key)?.invalid)return undefined;
    return ends.get(track.index+':'+key+':'+start);
  };
}

// A fresh attack on this string at the cut could itself be silencing the note.
function reattacksAtBoundary(note,nextVisit) {
  if(!nextVisit)return false;
  const voices=note.beat.voice.bar.staff.bars[nextVisit.masterBar.index]?.voices;
  return !voices || voices.some(v=>v.beats.some(b=>b.playbackStart===0 && b.notes.some(n=>n.string===note.string)));
}

function boundedRing(first,duration,release) {
  if(first.isTieDestination || first.tieOrigin || first.string<=0)return false;
  if(first.isTieOrigin || first.tieDestination){
    if(!boundedPlainTie(first,duration,new WeakMap(),true))return false;
  }
  for(let n=first;n;n=n.tieDestination){
    const beat=n.beat;
    if(!finiteNativeNote(beat,n,duration,false,true) || beat.playbackStart+beat.playbackDuration>release ||
      !n.isLetRing || !n.letRingDestination || (n.letRingDestination!==n && n.letRingDestination!==n.tieDestination))return false;
  }
  return true;
}

function plainRest(beat,voice) {
  return beat?.voice===voice && beat.isRest===true && Array.isArray(beat.notes) && !beat.notes.length &&
    beat.graceType===0 && !beat.graceGroup && !beat.deadSlapped && !beat.slap && !beat.pop && !beat.tap &&
    !beat.isLetRing && !beat.whammyBarPoints?.length && !beat.whammyBarType && !beat.vibrato && !beat.fade &&
    !beat.fermata && !beat.golpe && !beat.rasgueado && !beat.brushType && !beat.tremoloPicking;
}

// Detached evidence for recording-plan safety, independent of practice track,
// visibility and muting. Missing native structure never proves silence. Native
// empty extra voices are ignored only alongside a fully covered rest voice.
function nativeSilenceEvidence(tickCache,score,file,types,division) {
  const fullRests=[],ambiguousHoldRanges=[],noteRanges=[],holds=new Map(),plainTies=new Map();
  let soundingUntil=0,unsupported=false,releaseFor;
  for(const [visitIndex,visited] of tickCache.masterBars.entries()) {
    const master=visited.masterBar,duration=visited.end-visited.start,notes=[];
    // An empty anacrusis can carry a section label while consuming no playback ticks.
    // Keep its visit identity so recording plans can explicitly omit it.
    const emptyPickup=visitIndex===0 && visited.start===0 && duration===0 && master?.index===0 &&
      master.isAnacrusis===true && typeof master.calculateDuration==='function' && master.score===score && score?.masterBars?.[0]===master &&
      !master.isFreeTime && !master.fermata?.size && !master.gtsPerformedBarTicks && score.tracks?.length &&
      score.tracks.every(t=>t?.score===score && t.staves?.length && t.staves.every(staff=>{
        const bar=staff?.bars?.[0];
        return !!staff && !!bar && staff.track===t && bar.staff===staff && bar.masterBar===master && !bar.simileMark &&
          Array.isArray(bar.sustainPedals) && !bar.sustainPedals.length && bar.voices?.length &&
          bar.voices.every(v=>v?.bar===bar && v.beats?.length && v.beats.every(b=>plainRest(b,v)) &&
            (v.isEmpty===true && v.beats.every(b=>b.isEmpty===true) ||
             v.isEmpty===false && v.beats.length===1 && v.beats[0].playbackStart===0 && v.beats[0].playbackDuration===0));
      })) && master.calculateDuration()===0;
    if(emptyPickup){fullRests.push(true);continue;}
    const structureKnown=Boolean(score && master?.score===score && score.masterBars?.[master.index]===master &&
      Array.isArray(score.tracks) && score.tracks.length && Number.isFinite(duration) && duration>0 &&
      Number.isFinite(visited.start) && Number.isFinite(visited.end));
    let rest=structureKnown && !master.isFreeTime && !master.fermata?.size && !master.gtsPerformedBarTicks;
    if(!structureKnown)unsupported=true;
    for(const [trackIndex,track] of (Array.isArray(score?.tracks)?score.tracks:[]).entries()) {
      if(!track || track.score!==score || !Array.isArray(track.staves) || !track.staves.length){rest=false;unsupported=true;continue;}
      for(const [staffIndex,staff] of track.staves.entries()) {
        const bar=staff?.bars?.[master.index];
        if(!staff || staff.track!==track || !Array.isArray(staff.bars) || !bar || bar.staff!==staff || bar.masterBar!==master ||
          !Array.isArray(bar.voices) || !bar.voices.length){rest=false;unsupported=true;continue;}
        // Pedal and simile playback need their own duration proof. Do not infer
        // silence from empty note arrays while either unsupported mechanism is present.
        let soundingBar=bar;
        if(bar.simileMark){
          rest=false;
          const plan=simpleSimilePlan(bar,visited);
          if(plan.reason || !plan.beats.every(b=>!b.isLetRing && b.notes.every(n=>!unboundedExpression(b,n) && !n.isTieOrigin && !n.isTieDestination))){
            unsupported=true;continue;
          }
          soundingBar=plan.donor;
        }
        if(!Array.isArray(bar.sustainPedals) || bar.sustainPedals.length){rest=false;unsupported=true;}
        let covered=false;
        for(const voice of soundingBar.voices) {
          if(!voice || voice.bar!==soundingBar || !Array.isArray(voice.beats) || typeof voice.isEmpty!=='boolean' ||
            !Number.isInteger(voice.index) || soundingBar.voices[voice.index]!==voice){rest=false;unsupported=true;continue;}
          let end=0,complete=Boolean(voice.beats.length),empty=voice.isEmpty===true;
          for(const beat of voice.beats) {
            if(!beat || beat.voice!==voice || !Array.isArray(beat.notes)){rest=false;unsupported=true;continue;}
            const start=beat.playbackStart,length=beat.playbackDuration;
            if(!Number.isFinite(start) || !Number.isFinite(length) || length<=0 || !Number.isInteger(beat.graceType) || beat.graceType<0 || beat.graceType>3)unsupported=true;
            if(!plainRest(beat,voice))rest=false;
            if(!Number.isFinite(start) || !Number.isFinite(length) || length<=0 || Math.abs(start-end)>0.00001)complete=false;
            end=start+length;
            empty=empty && beat.isEmpty===true && plainRest(beat,voice);
            for(const note of beat.notes) {
              if(!note || note.beat!==beat){rest=false;unsupported=true;continue;}
              notes.push({beat,note,start:visited.start+start,end:visited.start+start+length,
                key:`${trackIndex}:${staffIndex}:${voice.index}:${note.string>0?'s'+note.string:'p'+note.realValue}`});
            }
          }
          complete=complete && Math.abs(end-duration)<0.00001;
          if(!empty && !complete)rest=false;
          covered=covered || complete;
        }
        if(!covered)rest=false;
      }
    }
    fullRests.push(rest && !unsupported && !holds.size && soundingUntil<=visited.start);
    // These conservative ranges do not change audible/graded note durations.
    // A fresh attack on the same string closes earlier ambiguous carry; rests
    // and other strings cannot silently prove that a held technique stopped.
    const tieProof=new WeakMap(),releasedNotes=new Set();
    for(const item of notes.sort((a,b)=>a.start-b.start)) {
      if(!Number.isFinite(item.start) || !Number.isFinite(item.end) || !Number.isFinite(item.note.realValue)){unsupported=true;continue;}
      noteRanges.push({start:item.start,end:item.end});
      soundingUntil=Math.max(soundingUntil,item.end);
      if(item.note.isLetRing && !item.note.isTieDestination){
        if(releaseFor===undefined)releaseFor=generatedReleases(file,types,division);
        const release=releaseFor?.(item.note,item.start);
        if(release>=item.end && release<=visited.end && boundedRing(item.note,duration,release-visited.start) &&
            (release<visited.end || !reattacksAtBoundary(item.note,tickCache.masterBars[visitIndex+1]))){
          for(let n=item.note;n;n=n.tieDestination)releasedNotes.add(n);
          noteRanges.push({start:item.start,end:release});
          soundingUntil=Math.max(soundingUntil,release);
        }
      }
      const previous=holds.get(item.key),ambiguous=!releasedNotes.has(item.note) && expressiveHold(item.beat,item.note,duration,tieProof);
      if(holds.has(item.key) && !item.note.isTieDestination) {
        ambiguousHoldRanges.push({startTick:previous,endTick:item.start,openEnded:false});holds.delete(item.key);
      }
      if(ambiguous && !holds.has(item.key))holds.set(item.key,item.start);
      const pending=plainTies.get(item.key),note=item.note,bar=note.beat.voice.bar;
      // Follow the actual performed occurrence, never a written pointer across
      // a repeat jump or an absent destination. Real cross-break ties remain in
      // the unchanged practice event spans checked by the timing compiler.
      if(pending){
        const adjacent=visitIndex===pending.visitIndex && bar===pending.bar ||
          visitIndex===pending.visitIndex+1 && bar.index===pending.bar.index+1 && bar.staff===pending.bar.staff;
        const valid=adjacent && item.start===pending.end && note===pending.next && note.isTieDestination &&
          note.tieOrigin===pending.last && pending.last.tieDestination===note &&
          note.string===pending.last.string && note.fret===pending.last.fret && note.realValue===pending.last.realValue &&
          Boolean(note.isTieOrigin)===Boolean(note.tieDestination) && finiteNativeNote(item.beat,note,duration) && pending.count<4096;
        if(valid && !note.tieDestination){if(holds.get(item.key)===pending.start)holds.delete(item.key);plainTies.delete(item.key);}
        else if(valid){Object.assign(pending,{last:note,next:note.tieDestination,end:item.end,bar,visitIndex,count:pending.count+1});}
        else plainTies.delete(item.key);
      }else if(ambiguous && note.isTieOrigin && note.tieDestination && !note.isTieDestination && !note.tieOrigin && finiteNativeNote(item.beat,note,duration)){
        plainTies.set(item.key,{start:item.start,last:note,next:note.tieDestination,end:item.end,bar,visitIndex,count:1});
      }
    }
  }
  const end=tickCache.masterBars.at(-1).end;
  for(const startTick of holds.values())ambiguousHoldRanges.push({startTick,endTick:end,openEnded:true});
  // A before-beat grace from the next written bar may steal time from this one.
  // Audit native note spans after collecting every track, including that case.
  noteRanges.sort((a,b)=>a.start-b.start);
  let noteIndex=0,lastNoteEnd=-Infinity;
  for(const [index,visited] of tickCache.masterBars.entries()) {
    while(noteIndex<noteRanges.length && noteRanges[noteIndex].start<visited.end)lastNoteEnd=Math.max(lastNoteEnd,noteRanges[noteIndex++].end);
    if(lastNoteEnd>visited.start)fullRests[index]=false;
  }
  return {fullRests,ambiguousHoldRanges,complete:!unsupported};
}

// A fresh on-beat or before-beat grace may sustain across other-string grace attacks into
// the group's main note. Require reciprocal native ties and the entire played
// group in this occurrence; a pointer alone cannot bridge silence or a jump.
function playedGraceTie(origin, note, event, native, beatOccurrences) {
  const first=origin?.native, start=first?.beat, end=native?.beat, voice=start?.voice;
  if(!origin?.attack || origin.endTick>=note.startTick || !voice || end?.voice!==voice ||
    origin.event.playbackMeasureIndex!==event.playbackMeasureIndex ||
    ![1,2].includes(start.graceType) || end.graceType!==0 || end.index<=start.index+1 || end.index-start.index>128 ||
    !first.isTieOrigin || first.isTieDestination || first.tieOrigin || first.tieDestination!==native ||
    !native.isTieDestination || native.tieOrigin!==first ||
    first.string<=0 || native.string!==first.string || native.fret!==first.fret || native.realValue!==first.realValue)return false;
  const plain=(beat,n)=>!n.isDead && !n.harmonicType && !n.isStaccato && !unboundedExpression(beat,n);
  if(!plain(start,first)||!plain(end,native))return false;
  const offset=origin.startTick-start.playbackStart;
  if(!Number.isFinite(offset)||note.startTick!==offset+end.playbackStart)return false;
  let next=origin.startTick;
  for(let i=start.index;i<=end.index;i++) {
    const beat=voice.beats?.[i];
    if(!beat || beat.voice!==voice || beat.index!==i || !Number.isFinite(beat.playbackDuration) || beat.playbackDuration<=0)return false;
    const played=beatOccurrences.get(`${event.trackId}:${beat.id}:${offset+beat.playbackStart}`);
    if(!played || played.playbackMeasureIndex!==event.playbackMeasureIndex || played.startTick!==next ||
      played.endTick!==played.startTick+beat.playbackDuration)return false;
    if(i<end.index && beat.graceType!==start.graceType)return false;
    if(i>start.index && i<end.index && (!beat.notes.length || beat.notes.some(n=>n.string===first.string ||
      n.isTieOrigin || n.isTieDestination || n.tieOrigin || n.tieDestination || !plain(beat,n))))return false;
    next=played.endTick;
  }
  return true;
}


// Similes play canonical native donor voices while the cursor highlights an
// empty destination. Prove literal clocks and reciprocal connections without
// editing the score. Let-ring/tap/hammer instructions remain native playback;
// Wait still grades written attacks and tied sustains, not technique execution.
function simpleSimilePlan(actual, visited) {
  const duration=visited.end-visited.start, staff=actual.staff, seen=new Set();
  const fail=reason=>({reason});
  const sameClock=bar=>{
    const a=actual.masterBar,b=bar.masterBar;
    return a && b && !a.isFreeTime && !b.isFreeTime && !a.isAnacrusis && !b.isAnacrusis &&
      !a.gtsPerformedBarTicks && !b.gtsPerformedBarTicks && !a.fermata?.size && !b.fermata?.size &&
      a.timeSignatureNumerator===b.timeSignatureNumerator && a.timeSignatureDenominator===b.timeSignatureDenominator &&
      !a.tripletFeel && !b.tripletFeel && actual.clef===bar.clef && actual.clefOttava===bar.clefOttava &&
      actual.keySignature===bar.keySignature && actual.keySignatureType===bar.keySignatureType;
  };
  // Empty repeat placeholders may carry inherited let-ring flags. No note is
  // sounded there: alphaTab plays the donor. This proves no recording silence.
  const quietBeat=beat=>beat.graceType===0 && !beat.graceGroup && !beat.deadSlapped && !beat.slap &&
    !beat.pop && !beat.tap && !beat.whammyBarPoints?.length && !beat.whammyBarType && !beat.vibrato &&
    !beat.fade && !beat.fermata && !beat.golpe && !beat.rasgueado && !beat.brushType && !beat.tremoloPicking;
  const empty=voice=>voice?.isEmpty===true && voice.bar?.voices?.[voice.index]===voice &&
    Array.isArray(voice.beats) && voice.beats.length>0 && voice.beats.every((b,i)=>
      b.voice===voice && b.index===i && b.isEmpty===true && b.isRest===true && Array.isArray(b.notes) && !b.notes.length && quietBeat(b));
  const placeholderVoice=voice=>{
    if(empty(voice))return true;
    if(voice?.isEmpty!==false || voice.bar?.voices?.[voice.index]!==voice || !Array.isArray(voice.beats) || !voice.beats.length)return false;
    let end=0;
    for(const [i,b]of voice.beats.entries()){
      if(b.voice!==voice || b.index!==i || b.isRest!==true || !Array.isArray(b.notes) || b.notes.length || !quietBeat(b) ||
        b.playbackStart!==end || !Number.isFinite(b.playbackDuration) || b.playbackDuration<=0)return false;
      end+=b.playbackDuration;
    }
    return end===duration;
  };
  if(actual.masterBar!==visited.masterBar || !Number.isFinite(duration) || duration<=0 ||
    duration!==3840*actual.masterBar.timeSignatureNumerator/actual.masterBar.timeSignatureDenominator)
    return fail('unproved repeat-bar clock');
  let donor=actual;
  while(donor.simileMark) {
    const mark=donor.simileMark;
    if(![1,2,3].includes(mark))return fail('unknown repeat sign');
    if(mark!==1){
      const partner=staff.bars[donor.index+(mark===2?1:-1)];
      if(partner?.simileMark!==5-mark || !sameClock(partner))return fail('unpaired double-bar repeat');
    }
    if(seen.has(donor) || seen.size>=4096 || donor.staff!==staff || staff.bars?.[donor.index]!==donor ||
      !sameClock(donor) || !Array.isArray(donor.sustainPedals) || donor.sustainPedals.length ||
      !donor.voices?.length || !donor.voices.every(placeholderVoice))return fail('unproved repeat-bar structure');
    seen.add(donor);
    const distance=mark===1?1:2,previous=staff.bars[donor.index-distance];
    if(!previous || previous.staff!==staff || previous.index!==donor.index-distance)return fail('missing repeat-bar donor');
    donor=previous;
  }
  if(donor.staff!==staff || staff.bars?.[donor.index]!==donor || !sameClock(donor) ||
    !Array.isArray(donor.sustainPedals) || donor.sustainPedals.length || !donor.voices?.length)
    return fail('unproved donor structure');
  const beats=[],proof=new Map();
  const connected=(note,originKey,destinationKey,startFlag,endFlag)=>{
    const voice=note.beat.voice;
    for(const [key,flag,back,otherFlag,before]of [[originKey,endFlag,destinationKey,startFlag,true],[destinationKey,startFlag,originKey,endFlag,false]]){
      const other=note[key];
      if(Boolean(note[flag])!==Boolean(other))return false;
      if(!other)continue;
      if(other.beat?.voice!==voice || other[back]!==note || !other[otherFlag] ||
        other.string!==note.string ||
        other.beat.playbackStart===note.beat.playbackStart ||
        (other.beat.playbackStart<note.beat.playbackStart)!==before)return false;
      if(originKey==='tieOrigin' && (other.realValue!==note.realValue || other.string!==note.string || other.fret!==note.fret ||
        (before ? other.beat.playbackStart+other.beat.playbackDuration!==note.beat.playbackStart :
          note.beat.playbackStart+note.beat.playbackDuration!==other.beat.playbackStart)))return false;
    }
    return true;
  };
  for(const [vi,voice] of donor.voices.entries()) {
    if(empty(voice))continue;
    if(voice?.bar!==donor || voice.index!==vi || !Array.isArray(voice.beats) || !voice.beats.length || voice.beats.length>4096)
      return fail('unproved donor voice');
    let end=0;
    for(const [index,beat] of voice.beats.entries()) {
      if(beat.voice!==voice || beat.index!==index || beat.playbackStart!==end || !Number.isFinite(beat.playbackDuration) ||
        beat.playbackDuration<=0 || !Array.isArray(beat.notes) || !quietBeat(beat) || ![0,1,2].includes(beat.pickStroke) ||
        beat.automations?.some(a=>a.type!==2 || !Number.isInteger(a.value) || a.value<0 || a.value>127 || a.ratioPosition!==0))
        return fail('unproved donor attack clock');
      if(!beat.notes.length && beat.isRest!==true)return fail('unproved donor rest');
      for(const note of beat.notes) {
        if(note.beat!==beat || !Number.isFinite(note.realValue) || !Number.isInteger(note.string) || note.string<=0 || note.string>staff.tuning.length ||
          !Number.isInteger(note.fret) || note.fret<0 || note.isDead || note.harmonicType || note.isStaccato || note.isPalmMute || note.isGhost ||
          note.bendPoints?.length || note.bendType || note.vibrato || note.slideInType || note.slideOutType || note.slideTarget ||
          note.trillValue>=0 || note.durationPercent!==1 || note.gtsTiedBend || note.gtsFallingTie || note.gtsWrittenVibrato ||
          note.gtsSourceArticulation || note.gtsSlidePlayback || note.gtsRepeatTieRelease || note.gtsTappedHarmonicTicks)
          return fail('unproved repeated-note pitch or duration effect');
        if(!connected(note,'tieOrigin','tieDestination','isTieOrigin','isTieDestination'))
          return fail('a repeated-note tie leaves its voice/bar or has an unproved endpoint');
        if(!connected(note,'hammerPullOrigin','hammerPullDestination','isHammerPullOrigin','isHammerPullDestination'))
          return fail('a repeated hammer/pull connection has an unproved endpoint');
        proof.set(note,voice);
      }
      end+=beat.playbackDuration;beats.push(beat);
    }
    if(end!==duration)return fail('incomplete donor clock');
  }
  // Every endpoint must actually be in the qualified voice, not just carry a
  // reciprocal pointer to an object absent from its native beat array.
  for(const [note,voice] of proof)for(const key of ['tieOrigin','tieDestination','hammerPullOrigin','hammerPullDestination'])
    if(note[key] && proof.get(note[key])!==voice)return fail('missing repeated-note connection endpoint');
  const placeholder=actual.voices[0].beats[0];
  for(let span=visited.firstBeat;span;span=span.nextBeat){
    if(span.highlightedBeats.some(item=>item.beat===placeholder && item.playbackStart===0))return {donor,placeholder,beats};
  }
  return fail('missing native repeat-bar highlight');
}

function performedBeatItems(visited,visitIndex,timeline) {
  const items=[];
  for(let span=visited.firstBeat;span;span=span.nextBeat)
    for(const item of span.highlightedBeats)items.push({item,end:span.end});
  const plans=new Map(), score=visited.masterBar?.score;
  for(const track of score?.tracks??[])for(const staff of track.staves??[]) {
    const actual=staff.bars?.[visited.masterBar.index];
    if(!actual?.simileMark)continue;
    const plan=simpleSimilePlan(actual,visited);
    plans.set(staff,plan);
    if(plan.reason)(timeline.similePracticeIssues??=[]).push({trackId:String(track.index),
      measureNumber:actual.index+1,playbackMeasureIndex:visitIndex,reason:plan.reason});
  }
  const result=items.filter(({item})=>!plans.has(item.beat.voice.bar.staff));
  for(const [staff,plan] of plans) {
    if(plan.reason)continue;
    for(const beat of plan.beats)result.push({item:{beat,playbackStart:beat.playbackStart},
      end:beat.playbackStart+beat.playbackDuration,simile:{placeholder:plan.placeholder,
        measureNumber:visited.masterBar.index+1,alias:`simile:${visitIndex}:${staff.index}:`}});
  }
  return result;
}

export function buildPlaybackTimeline(tickCache, { tempo = 120, ticksPerQuarter = 960, score = null, midiFile = null, midiTypes = null } = {}) {
  if (!tickCache?.masterBars?.length) return null;
  const timeline = { source: 'alphatab-playback', ticksPerQuarter, events: [], measures: [], tempoMap: [], endTick: 0 };
  const silence=nativeSilenceEvidence(tickCache,score??tickCache.masterBars[0].masterBar?.score,midiFile,midiTypes,ticksPerQuarter);
  timeline.ambiguousHoldRanges=silence.ambiguousHoldRanges;
  timeline.ambiguousHoldEvidenceComplete=silence.complete;
  const changes = new Map([[0, tempo > 0 ? tempo : 120]]);
  const occurrences = new Map();
  const beatOccurrences = new Map();
  const writtenCurves = new Map();
  const nativeNotes = new Map();
  for (const [playbackMeasureIndex, bar] of tickCache.masterBars.entries()) {
    const measureNumber = bar.masterBar.index + 1;
    const occurrence = (occurrences.get(measureNumber) || 0) + 1;
    occurrences.set(measureNumber, occurrence);
    timeline.measures.push({ measureNumber, occurrence, playbackMeasureIndex, startTick: bar.start, endTick: bar.end,
      isFullRest:silence.fullRests[playbackMeasureIndex] });
    timeline.endTick = Math.max(timeline.endTick, bar.end);
    for (const change of bar.tempoChanges) {
      if (Number.isFinite(change.tick) && change.tempo > 0) changes.set(change.tick, change.tempo);
    }
    for (const {item,end,simile} of performedBeatItems(bar,playbackMeasureIndex,timeline)) {
        const beat = item.beat;
        const trackId = String(beat.voice.bar.staff.track.index);
        const startTick = bar.start + item.playbackStart;
        const sourceBeatId = String(simile?.placeholder.id ?? beat.id);
        const key = `${trackId}:${sourceBeatId}:${startTick}${simile && beat.voice.index ? ':voice:'+beat.voice.index : ''}`;
        // Highlight spans split at other voices' boundaries and may spill across bars.
        // One source beat at one playback tick is one occurrence, not many attacks.
        if (beatOccurrences.has(key)) {
          const existing = beatOccurrences.get(key);
          existing.endTick = Math.max(existing.endTick, bar.start + end);
          continue;
        }
        const event = {
          id: key, sourceBeatId, trackId, measureNumber: simile?.measureNumber ?? beat.voice.bar.index + 1,
          occurrence, playbackMeasureIndex, beatIndex: simile ? simile.placeholder.index : beat.index,
          voiceIndex: beat.voice.index, staffIndex: beat.voice.bar.staff.index,
          stringCount: beat.voice.bar.staff.tuning.length,
          writtenStartTick: simile ? simile.placeholder.absolutePlaybackStart+beat.playbackStart : beat.absolutePlaybackStart,
          ...(simile ? {donorSourceBeatId:String(beat.id),donorMeasureNumber:beat.voice.bar.index+1,donorBeatIndex:beat.index} : {}),
          startTick, endTick: bar.start + end, isRest: Boolean(beat.isRest), notes: [],
        };
        event.notes = (beat.notes || []).filter(note => Number.isFinite(note.realValue)).map((note, index) => {
          const id=`${key}:note:${note.id ?? index}`;
          writtenCurves.set(id,{bend:note.bendPoints,whammy:beat.whammyBarPoints});
          nativeNotes.set(id,note);
          return {
            id, sourceNoteId: simile ? simile.alias+note.id : String(note.id ?? `${sourceBeatId}:${index}`),
            ...(simile ? {donorSourceNoteId:String(note.id)} : {}),
            sourceBeatId, midi: note.realValue, noteName: midiToNoteName(note.realValue),
            sourceString: Number.isFinite(note.string) && note.string > 0 ? note.string : null,
            string: note.string > 0 && beat.voice.bar.staff.tuning.length >= note.string
              ? beat.voice.bar.staff.tuning.length + 1 - note.string : null,
            fret: Number.isFinite(note.fret) ? note.fret : null,
            leftHandFinger: Number.isInteger(note.leftHandFinger) ? note.leftHandFinger : -2,
            isDead: Boolean(note.isDead),
            hasVibrato: Number.isFinite(note.vibrato) && note.vibrato>0 || Number.isFinite(beat.vibrato) && beat.vibrato>0,
            attack: !note.isTieDestination,
            tieOriginId: note.tieOrigin ? (simile ? simile.alias+note.tieOrigin.id : String(note.tieOrigin.id)) : null,
            tieDestinationId: note.tieDestination ? (simile ? simile.alias+note.tieDestination.id : String(note.tieDestination.id)) : null,
          };
        });
        beatOccurrences.set(key, event);
    }
  }
  let lastTick = 0, lastTime = 0, lastTempo = tempo > 0 ? tempo : 120;
  timeline.tempoMap = [...changes.entries()].sort((a,b) => a[0]-b[0]).map(([tick,bpm]) => {
    lastTime += (tick - lastTick) * 60000 / (lastTempo * ticksPerQuarter);
    lastTick = tick; lastTempo = bpm;
    return {tick, bpm, timeMs:lastTime};
  });
  timeline.events = [...beatOccurrences.values()].sort((a,b) => a.startTick-b.startTick);
  // Preserve individual notes, including unisons on different strings and tie destinations.
  const latestNotes = new Map();
  const tieChains = new Set();
  for (const event of timeline.events) {
    event.durationTicks = Math.max(0, event.endTick-event.startTick);
    event.startTimeMs = tickToTimeMs(timeline,event.startTick);
    event.endTimeMs = tickToTimeMs(timeline,event.endTick);
    for (const note of event.notes) {
      note.startTick = event.startTick; note.endTick = event.endTick;
      note.durationTicks = event.durationTicks;
      const origin = latestNotes.get(`${event.trackId}:${note.tieOriginId}`);
      // Ordinary ties stay contiguous. A proved same-group grace sustain may
      // span other-string grace attacks; skipped/repeated occurrences do not.
      const native=nativeNotes.get(note.id);
      const continues=!note.attack && origin && origin.midi===note.midi &&
        (origin.endTick===note.startTick || playedGraceTie(origin,note,event,native,beatOccurrences));
      const root=continues?origin.root:note;
      const chain=continues?origin.chain:{notes:[],valid:true,range:null,hasVibrato:false};
      const curves=writtenCurves.get(note.id);
      const bendState=writtenBendSegment(note.midi,curves.bend,curves.whammy,continues?origin.bendState:null);
      chain.notes.push(note);chain.valid=chain.valid && bendState.valid;chain.hasVibrato||=note.hasVibrato;
      if(bendState.bendRange)chain.range=chain.range
        ? {min:Math.min(chain.range.min,bendState.bendRange.min),max:Math.max(chain.range.max,bendState.bendRange.max)}
        : bendState.bendRange;
      tieChains.add(chain);
      if (continues) {
        root.endTick = note.endTick;
        root.durationTicks = root.endTick-root.startTick;
        note.attackNoteId = root.id;
      } else {
        note.attackNoteId = note.attack ? note.id : null;
      }
      latestNotes.set(`${event.trackId}:${note.sourceNoteId}`, {...note, root, chain, bendState, event, native});
    }
  }
  // A late bend belongs to the original required attack. Share only the range
  // of that actually played tie chain, including its continuation display data.
  for(const chain of tieChains)for(const note of chain.notes) {
    if(chain.valid && chain.range)note.bendRange={...chain.range};
    note.hasVibrato=chain.hasVibrato;
  }
  for (const event of timeline.events) for (const note of event.notes) {
    note.startTimeMs = tickToTimeMs(timeline,note.startTick);
    note.endTimeMs = tickToTimeMs(timeline,note.endTick);
  }
  timeline.durationMs = tickToTimeMs(timeline,timeline.endTick);
  return timeline;
}

export function getPracticeEvents(timeline, trackId) {
  if (!timeline || timeline.similePracticeIssues?.some(issue=>issue.trackId===String(trackId))) return [];
  const groups = new Map();
  for (const event of timeline.events) {
    if (event.trackId !== String(trackId)) continue;
    const attacks = event.notes.filter(note=>note.attack);
    if (!attacks.length) continue;
    let group = groups.get(event.startTick);
    if (!group) {
      group = { ...event, id:`${trackId}:attack:${event.startTick}`, notes:[], beatIds:[], endTick:event.endTick };
      groups.set(event.startTick,group);
    }
    group.notes.push(...attacks); group.beatIds.push(event.sourceBeatId);
    group.endTick = Math.max(group.endTick,event.endTick);
  }
  const events = [...groups.values()].sort((a,b)=>a.startTick-b.startTick);
  events.forEach((event,index)=>{
    // X notes carry a stored fret/pitch in GP files, but do not demand that pitch.
    // Keep an all-X beat as one unpitched attack; mixed chords require only tones.
    event.isPercussive = event.notes.every(note=>note.isDead);
    event.mutedStrings = event.notes.filter(note=>note.isDead).map(note=>note.string);
    if(!event.isPercussive)event.notes=event.notes.filter(note=>!note.isDead);
    event.pitches = event.isPercussive ? [] : [...new Set(event.notes.map(note=>note.midi))].sort((a,b)=>a-b);
    event.pitchNames = event.pitches.map(midiToNoteName);
    // An earlier long voice must not hide a later attack in another voice.
    event.targetEndTick = Math.min(event.endTick,events[index+1]?.startTick ?? timeline.endTick);
    event.targetEndTimeMs = tickToTimeMs(timeline,event.targetEndTick);
    event.durationTicks = event.endTick-event.startTick;
    event.endTimeMs = tickToTimeMs(timeline,event.endTick);
  });
  return events;
}
