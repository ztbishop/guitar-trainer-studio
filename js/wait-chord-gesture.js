import {TimingDefaults} from './practice-timing.js';
// A real correct reattack may refresh ringing evidence without earning another hit.
export function refreshHeldEvidence(record,note,at,hex) {
  const matches=record.slots.filter(s=>s.hit && s.midi===note.midi &&
    (!hex || s.channel===note.channel && s.string===note.stringHint));
  if(matches.length===1)matches[0].heldRefresh={channel:note.channel,at};
}
export function supportedHeldTone(events,records,held,index,at,{hex,chordWindowMs,heldNoteTolerance='one',realtime=false,chordMode='collect'}) {
  const event=events[index],previous=events[index-1],record=records[index],prior=records[index-1];
  if(heldNoteTolerance==='off' || !Number.isFinite(at) || !event || !prior || record.skipped || prior.skipped ||
      event.isPercussive || previous.isPercussive || record.slots.length<2 ||
      !prior.slots.every(s=>s.hit) || prior.slots.length!==record.slots.length)return null;
  if(hex && (event.stringCount!==6 || previous.stringCount!==6 || [...record.slots,...prior.slots].some(s=>!Number.isInteger(s.string)||s.string<1||s.string>6)))return null;
  const signature=slots=>slots.map(s=>hex?s.midi+':'+s.string:String(s.midi)).sort().join('|');
  if(signature(record.slots)!==signature(prior.slots))return null;
  const pending=record.slots.filter(s=>!s.hit && !s.missed),burst=record.burst;
  const window=realtime||chordMode==='together'?chordWindowMs:Math.min(200,chordWindowMs);
  if(!pending.length || heldNoteTolerance==='one' && pending.length!==1 || !burst || burst.wrong ||
      record.wrongNotes.some(n=>!n.pending) || burst.lastAt-burst.at>window)return null;
  const readyAt=realtime||chordMode==='together'?burst.at+window:Math.max(burst.at+window,burst.lastAt+TimingDefaults.chordGroupingMs);
  if(at<readyAt || at-readyAt>TimingDefaults.chordGroupingMs)return null;
  const latest=s=>heldNoteTolerance==='multiple' && s.heldRefresh?s.heldRefresh:{channel:s.channel,at:s.hitAt};
  const fresh=record.slots.filter(s=>s.hit && latest(s).at>=burst.at && latest(s).at<=burst.lastAt &&
    (s.evidence==='attack' || heldNoteTolerance==='multiple' && s.heldRefresh));
  if(heldNoteTolerance!=='multiple' && fresh.length!==record.slots.length-pending.length ||
      !fresh.length || hex && new Set(fresh.map(s=>latest(s).channel)).size!==fresh.length)return null;
  const supports=[];
  for(const slot of pending){
    const source=prior.slots.find(s=>s.midi===slot.midi && (!hex || s.string===slot.string));
    const evidence=heldNoteTolerance==='multiple' && source.heldRefresh?source.heldRefresh:{channel:source.channel,at:source.originAt??source.hitAt};
    const onset=evidence.at;
    if((source.evidence!=='attack' && heldNoteTolerance!=='multiple') ||
        hex && fresh.some(s=>latest(s).channel===evidence.channel) || held.get(evidence.channel+':'+source.midi)?.at!==onset)return null;
    supports.push({slot,source:{...source,channel:evidence.channel,originAt:onset}});
  }
  return {supports};
}
