// Conservative repeated-chord recognition. Evidence only; no MIDI/transport/UI APIs.
import {TimingDefaults} from './practice-timing.js';

export function supportedHeldTone(events,records,held,index,at,{hex,chordMode,chordWindowMs}) {
  const event=events[index],previous=events[index-1],record=records[index],prior=records[index-1];
  // A held pitch alone is never a new attack. Limit this to one omitted retrigger
  // in an otherwise fresh repeated six-string Hex chord, in Collect mode.
  if(!Number.isFinite(at) || !hex || chordMode!=='collect' || !event || !record || record.skipped || !previous || event.isPercussive || previous.isPercussive ||
      event.stringCount!==6 || previous.stringCount!==6 || prior.skipped ||
      record.slots.length<3 || !prior.slots.every(s=>s.hit) || prior.slots.length!==record.slots.length)return null;
  if([...record.slots,...prior.slots].some(s=>!Number.isInteger(s.string) || s.string<1 || s.string>6))return null;
  const signature=slots=>slots.map(s=>`${s.midi}:${s.string}`).sort().join('|');
  if(signature(record.slots)!==signature(prior.slots))return null;
  const pending=record.slots.filter(s=>!s.hit),burst=record.burst;
  const window=Math.min(200,chordWindowMs);
  if(pending.length!==1 || !burst || burst.wrong || burst.lastAt-burst.at>window)return null;
  const readyAt=Math.max(burst.at+window,burst.lastAt+TimingDefaults.chordGroupingMs);
  if(at<readyAt || at-readyAt>TimingDefaults.chordGroupingMs)return null;
  const fresh=record.slots.filter(s=>s.hit && s.hitAt>=burst.at && s.hitAt<=burst.lastAt && s.evidence==='attack');
  if(fresh.length!==record.slots.length-1 || new Set(fresh.map(s=>s.channel)).size!==fresh.length)return null;
  const slot=pending[0],source=prior.slots.find(s=>s.midi===slot.midi && s.string===slot.string);
  // Do not chain an inference through successive targets or reuse the same
  // channel for two tones. A release/replacement removes the original evidence.
  if(source?.evidence!=='attack' || fresh.some(s=>s.channel===source.channel) ||
      held.get(`${source.channel}:${source.midi}`)?.at!==source.hitAt)return null;
  return {slot,source};
}
