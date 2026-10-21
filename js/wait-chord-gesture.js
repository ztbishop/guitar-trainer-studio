import {TimingDefaults} from './practice-timing.js';
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
  const fresh=record.slots.filter(s=>s.hit && s.hitAt>=burst.at && s.hitAt<=burst.lastAt && s.evidence==='attack');
  if(fresh.length!==record.slots.length-pending.length || !fresh.length || hex && new Set(fresh.map(s=>s.channel)).size!==fresh.length)return null;
  const supports=[];
  for(const slot of pending){
    const source=prior.slots.find(s=>s.midi===slot.midi && (!hex || s.string===slot.string));
    const onset=source.originAt??source.hitAt;
    if((source.evidence!=='attack' && heldNoteTolerance!=='multiple') ||
        hex && fresh.some(s=>s.channel===source.channel) || held.get(source.channel+':'+source.midi)?.at!==onset)return null;
    supports.push({slot,source});
  }
  return {supports};
}
