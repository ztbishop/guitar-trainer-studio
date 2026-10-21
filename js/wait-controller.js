// Gate progression using injected transport operations. No alphaTab/DOM dependency.
import {WaitSession} from './wait-session.js';
import {noteStatesFromRecords} from './practice-visuals.js';
import {MidiPitchState} from './midi-pitch.js';

export class WaitController {
  constructor(transport,onChange=()=>{},now=()=>performance.now()) {
    this.transport=transport;this.onChange=onChange;this.events=[];this.endTick=0;
    this.active=false;this.phase='idle';this.index=-1;this.position=0;this.manualPaused=false;
    this.now=now;this.pauseOffset=0;this.pausedAt=null;this.chordSettings={};
    this.pitchState=new MidiPitchState();
  }
  configure(events,endTick,hex=false,loop=false,chordSettings={},loopCountIn=false) {
    this.stop();this.events=events;this.endTick=endTick;this.hex=hex;
    this.loop=loop;this.loopCountIn=loopCountIn;this.pass=1;this.lastPassResults=null;this.passHistory=[];
    this.chordSettings={chordMode:chordSettings.mode,chordWindowMs:chordSettings.windowMs,extraStringTolerance:chordSettings.extraStringTolerance,heldNoteTolerance:chordSettings.heldNoteTolerance,filterHexSpikes:chordSettings.filterHexSpikes,filterScoreRange:chordSettings.filterScoreRange,rangeStaves:chordSettings.rangeStaves,ignoreBriefErrors:chordSettings.ignoreBriefErrors,minErrorMs:chordSettings.minErrorMs};
    this.pitchState=new MidiPitchState(chordSettings.pitchBendRange);
    this.chordSettings.pitchState=this.pitchState;
    this.session=new WaitSession(events,{hex,...this.chordSettings});this.index=-1;this.publish();
  }
  publish() {
    const currentEvent=this.events[this.index]??null;
    const record=this.session?.records[this.index];
    const hits=record?.slots.filter(s=>s.hit).length??0;
    let matchState='idle',status='Choose Wait Mode and press Play to begin';
    if(this.phase==='waiting' || this.phase==='seeking') {
      matchState=hits?'partial':'waiting';
      status=`Waiting • measure ${currentEvent?.measureNumber??'—'} • ${hits}/${record?.slots.length??0} required attacks`;
      if(currentEvent?.isPercussive)status='Waiting • muted strum (X) • any fresh note attack';
      if(this.session.lastFeedback?.type==='wrong' && this.session.lastFeedback.eventId===currentEvent?.id) {matchState='mismatch';status+=' • wrong note; try again';}
      if(this.session.lastFeedback?.type==='retry' && this.session.lastFeedback.eventId===currentEvent?.id)status+=' • chord window expired; play the whole chord again';
      if(this.session.chordMode==='together' && record?.slots.length>1)status+=` • chord window ${this.session.chordWindowMs} ms`;
    }
    if(this.phase==='settling')status='Correct notes complete • checking pending MIDI releases';
    if(this.phase==='paused') status='Paused • press Play to resume Wait Mode';
    if(this.phase==='count-in') status='Count-in • get ready';
    if(this.phase==='complete') {matchState='match';status='Wait practice complete';}
    const stats=this.session?.stats()??null;
    this.onChange({phase:this.phase,active:this.active,currentEvent,currentEventIndex:this.index,matchState,status,
      summary:stats?`${this.loop?`Pass ${this.pass} • `:''}Correct ${stats.correct} • Wrong ${stats.wrong} • Remaining ${stats.pending}${stats.retries?` • Chord retries ${stats.retries}`:''}${stats.supportedHeld?` • Held-note support ${stats.supportedHeld} (reattack unverified)`:''}`:'No targets loaded',
      results:stats,noteStates:noteStatesFromRecords(this.session?.records,true,{hex:this.hex}),lastFeedback:this.session?.lastFeedback,
      history:this.session?.feedbackHistory(this.pass)??[],passHistory:this.passHistory,
      liveWrongNotes:[...(this.session?.liveWrong.values()??[])],
      lastPassResults:this.lastPassResults,pass:this.pass,sessionStarted:this.active||this.phase==='complete',sessionCompleted:this.phase==='complete'});
  }
  toggle(tick=this.position) {
    if(!this.events.length) return false;
    if(!this.active) {this.start(tick);return true;}
    if(this.phase==='paused') {
      this.pauseOffset+=Math.max(0,this.now()-this.pausedAt);this.pausedAt=null;
      this.manualPaused=false;
      this.phase=this.pausedFrom==='seeking' ? (this.desiredTick===null?'waiting':'seeking') : this.pausedFrom;
      if(this.phase==='settling'){this.publish();return true;}
      this.beginGate(this.index,true);return true;
    }
    this.advance(this.now());this.pausedAt=this.now();
    this.session.held.clear();
    this.session.pitchAttacks.clear();
    this.session.spikeCandidates.clear();this.session.singlePrecursors.clear();
    this.pitchState.reset();
    this.manualPaused=true;this.pausedFrom=this.phase;this.phase='paused';this.transport.pause();this.publish();return true;
  }
  start(tick=0) {
    this.transport.acquire();this.active=true;this.manualPaused=false;this.position=tick;
    this.pauseOffset=0;this.pausedAt=null;
    this.session=new WaitSession(this.events,{hex:this.hex,...this.chordSettings});this.pass=1;this.lastPassResults=null;this.passHistory=[];
    this.index=this.events.findIndex(e=>e.startTick>=tick-1);
    if(this.index<0) {this.index=0;this.position=0;tick=0;}
    this.session.skipBefore(this.index);
    this.beginGate(this.index,true);
  }
  beginGate(index,countIn=false) {
    if(!countIn || !this.transport.countIn){this.gate(index);return;}
    const generation=this.countInGeneration=(this.countInGeneration || 0)+1;
    const startedAt=this.now();
    this.index=index;this.phase='count-in';this.desiredTick=this.events[index].startTick;
    this.publish();this.transport.hold(this.desiredTick);
    this.transport.countIn(this.desiredTick,ok=>{
      if(generation!==this.countInGeneration || !this.active || this.phase!=='count-in')return;
      // A resumed partial chord's active-time window excludes the pre-roll.
      this.pauseOffset+=Math.max(0,this.now()-startedAt);
      if(ok===false){this.manualPaused=true;this.pausedAt=this.now();this.pausedFrom='waiting';this.phase='paused';this.publish();return;}
      this.pausedFrom='waiting';this.gate(index);
    });
  }
  gate(index) {
    this.index=index;this.phase='seeking';this.desiredTick=this.events[index].startTick;
    this.publish();this.transport.hold(this.desiredTick);
  }
  noteOn(note) {
    // Target identity is ready before the asynchronous native cursor seek.
    // Accept attacks during positioning; never depend on playback/duration.
    // Releases also apply while paused, so stale held markers never reappear.
    if(note.type==='note-off') {
      const at=(this.phase==='paused'?this.pausedAt:(Number.isFinite(note.at)?note.at:this.now()))-this.pauseOffset;
      if(this.session.noteOff({...note,at}))this.publish();return null;
    }
    if(note.type==='pitch-bend') {
      const active=this.active && ['waiting','seeking'].includes(this.phase);
      const at=(Number.isFinite(note.at)?note.at:this.now())-this.pauseOffset;
      const result=this.session.pitchBend(note,at,this.index,active);
      if(result){if(result.complete)this.finishGate();else this.publish();}
      return result;
    }
    if(!this.active || !['waiting','seeking'].includes(this.phase)) {
      if(note.type==='note-on'){this.session.held.clear();this.session.pitchAttacks.clear();this.session.spikeCandidates.clear();this.session.singlePrecursors.clear();this.pitchState.reset();}
      return null;
    }
    if(note.type!=='note-on')return null;
    const at=(Number.isFinite(note.at)?note.at:this.now())-this.pauseOffset;
    const result=this.session.noteOn(this.index,note,at);
    if(result?.complete)this.finishGate();else this.publish();
    return result;
  }
  finishGate() {
    this.session.clearLiveWrong();
    const next=this.index+1;
    if(next<this.events.length)this.gate(next);else if(this.session.pendingErrors.size){this.phase='settling';this.publish();}else this.complete();
  }
  positionChanged({currentTick,isSeek=false}) {
    if(!this.active)return;
    // Native finish rewinds to the old range start. Ignore it while awaiting our seek.
    if(this.desiredTick!==null && this.desiredTick!==undefined) {
      if(isSeek && Math.abs(currentTick-this.desiredTick)<=2) {
        this.position=this.desiredTick;this.desiredTick=null;
        if(this.phase!=='count-in' && this.pausedFrom!=='count-in' && this.phase!=='settling' && this.pausedFrom!=='settling') {
          this.phase=this.manualPaused?'paused':'waiting';this.pausedFrom='waiting';
        }
        this.publish();
      }
      return;
    }
    if(isSeek && Math.abs(currentTick-this.position)>2) this.restartAt(currentTick);
  }
  advance(at=this.now()) {
    if(!this.active || !['waiting','seeking','settling'].includes(this.phase))return;
    if(this.session.flushPendingErrors(at-this.pauseOffset))this.publish();
    if(this.phase==='settling'){if(!this.session.pendingErrors.size)this.complete();return;}
    if(this.session.settle(this.index,at-this.pauseOffset)?.complete){this.finishGate();return;}
    if(this.session.expire(this.index,at-this.pauseOffset))this.publish();
  }
  restartAt(tick) {
    const paused=this.manualPaused;
    this.transport.pause();this.active=false;this.start(tick);
    if(paused) {this.manualPaused=true;this.pausedAt=this.now();this.pausedFrom=this.phase;this.phase='paused';this.transport.pause();this.publish();}
  }
  newAttemptHere(tick=this.position) {
    // Keep the active gate and transport state, including an in-flight gate seek.
    // No native seek or release/acquire is needed to clear an attempt's results.
    const index=this.active ? this.index : this.events.findIndex(e=>e.startTick>=tick-1);
    this.session=new WaitSession(this.events,{hex:this.hex,...this.chordSettings});
    this.session.skipBefore(index<0 ? this.events.length : index);
    this.pass=1;this.lastPassResults=null;this.passHistory=[];
    this.pauseOffset=0;this.pausedAt=this.manualPaused ? this.now() : null;
    if(!this.active) {this.index=index;this.phase='idle';this.position=tick;this.desiredTick=null;}
    this.publish();
  }
  complete() {
    if(this.loop && this.events.length) {
      this.lastPassResults=this.session.stats();
      this.passHistory.push(...this.session.feedbackHistory(this.pass));this.pass++;
      this.session=new WaitSession(this.events,{hex:this.hex,...this.chordSettings});
      this.beginGate(0,this.loopCountIn);return;
    }
    this.active=false;this.phase='complete';this.position=this.endTick;this.desiredTick=null;
    this.publish();this.transport.finish(this.endTick);
  }
  stop() {
    this.countInGeneration=(this.countInGeneration || 0)+1;
    const wasActive=this.active||this.phase==='complete';
    this.active=false;this.phase='idle';this.index=-1;this.manualPaused=false;this.desiredTick=null;
    this.pass=1;this.lastPassResults=null;this.passHistory=[];
    this.pauseOffset=0;this.pausedAt=null;
    this.session=new WaitSession(this.events,{hex:this.hex,...this.chordSettings});
    if(wasActive)this.transport.release();this.publish();
  }
}
